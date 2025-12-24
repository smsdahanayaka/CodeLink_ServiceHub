// ===========================================
// Pickups API - List and Create
// ===========================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  handleZodError,
  requireAuth,
  parsePaginationParams,
  calculatePaginationMeta,
} from "@/lib/api-utils";
import { createPickupSchema } from "@/lib/validations";
import { ZodError } from "zod";

// Generate unique pickup number
async function generatePickupNumber(tenantId: number): Promise<string> {
  const prefix = "PU";
  const year = new Date().getFullYear().toString().slice(-2);
  const month = (new Date().getMonth() + 1).toString().padStart(2, "0");

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const count = await prisma.pickup.count({
    where: {
      tenantId,
      createdAt: { gte: startOfMonth },
    },
  });

  const sequence = (count + 1).toString().padStart(5, "0");
  return `${prefix}${year}${month}${sequence}`;
}

// Generate unique claim number
async function generateClaimNumber(tenantId: number): Promise<string> {
  const prefix = "CLM";
  const year = new Date().getFullYear().toString().slice(-2);
  const month = (new Date().getMonth() + 1).toString().padStart(2, "0");

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const count = await prisma.warrantyClaim.count({
    where: {
      tenantId,
      createdAt: { gte: startOfMonth },
    },
  });

  const sequence = (count + 1).toString().padStart(5, "0");
  return `${prefix}${year}${month}${sequence}`;
}

// GET /api/logistics/pickups - List all pickups
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Check permission - allow logistics.view or logistics.collect
    if (!user.permissions.includes("logistics.view") && !user.permissions.includes("logistics.collect")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const { searchParams } = new URL(request.url);
    const { page, limit, search, sortBy, sortOrder, skip } = parsePaginationParams(searchParams);

    // Additional filters
    const status = searchParams.get("status");
    const collectorId = searchParams.get("collectorId");
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const myPickups = searchParams.get("myPickups");

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {
      tenantId: user.tenantId,
    };

    // My pickups filter - filter by collector linked to current user
    if (myPickups === "true") {
      const collector = await prisma.collector.findFirst({
        where: { userId: user.id, tenantId: user.tenantId },
      });
      if (collector) {
        where.collectorId = collector.id;
      } else {
        // User is not a collector, return empty result
        return successResponse([], calculatePaginationMeta(0, page, limit));
      }
    }

    // Search filter
    if (search) {
      where.OR = [
        { pickupNumber: { contains: search } },
        { claim: { claimNumber: { contains: search } } },
        { fromShop: { name: { contains: search } } },
        { collector: { name: { contains: search } } },
        { customerName: { contains: search } },
        { customerPhone: { contains: search } },
      ];
    }

    // Status filter (supports comma-separated values)
    if (status) {
      const statuses = status.split(",").map(s => s.trim());
      if (statuses.length === 1) {
        where.status = statuses[0];
      } else {
        where.status = { in: statuses };
      }
    }

    // Collector filter
    if (collectorId) {
      where.collectorId = collectorId === "unassigned" ? null : parseInt(collectorId);
    }

    // Date range filter
    if (fromDate || toDate) {
      where.scheduledDate = {};
      if (fromDate) {
        (where.scheduledDate as Record<string, unknown>).gte = new Date(fromDate);
      }
      if (toDate) {
        (where.scheduledDate as Record<string, unknown>).lte = new Date(toDate);
      }
    }

    // Get total count
    const total = await prisma.pickup.count({ where });

    // Get pickups with pagination
    const pickups = await prisma.pickup.findMany({
      where,
      include: {
        claim: {
          select: {
            id: true,
            claimNumber: true,
            currentStatus: true,
            createdBy: true,
            createdByUser: { select: { id: true, firstName: true, lastName: true } },
            warrantyCard: {
              select: {
                id: true,
                serialNumber: true,
                product: { select: { id: true, name: true } },
                customer: { select: { id: true, name: true, phone: true, address: true } },
                shop: { select: { id: true, name: true, address: true, phone: true } },
              },
            },
          },
        },
        warrantyCard: {
          select: {
            id: true,
            serialNumber: true,
            product: { select: { id: true, name: true } },
            customer: { select: { id: true, name: true, phone: true, address: true } },
            shop: { select: { id: true, name: true, address: true, phone: true } },
          },
        },
        collector: {
          select: { id: true, name: true, phone: true, vehicleNumber: true },
        },
        route: {
          select: { id: true, name: true, zone: true, areas: true },
        },
        fromShop: {
          select: { id: true, name: true, address: true, phone: true },
        },
      },
      orderBy: { [sortBy === "createdAt" ? "createdAt" : sortBy]: sortOrder },
      skip,
      take: limit,
    });

    return successResponse(pickups, calculatePaginationMeta(total, page, limit));
  } catch (error) {
    console.error("Error fetching pickups:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch pickups", "SERVER_ERROR", 500);
  }
}

// POST /api/logistics/pickups - Create new pickup
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Check permission - allow logistics.manage_pickups or logistics.collect
    if (!user.permissions.includes("logistics.manage_pickups") && !user.permissions.includes("logistics.collect")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const body = await request.json();
    const validatedData = createPickupSchema.parse(body);

    const claimId = validatedData.claimId || null;
    const warrantyCardId = validatedData.warrantyCardId || null;
    let shopId = validatedData.fromShopId;
    let fromAddress = validatedData.fromAddress;

    // If claim provided, verify it exists
    let claim = null;
    let warrantyCard = null;

    if (claimId) {
      claim = await prisma.warrantyClaim.findFirst({
        where: {
          id: claimId,
          tenantId: user.tenantId,
        },
        include: {
          warrantyCard: {
            include: {
              shop: true,
              customer: true,
              product: true,
            },
          },
        },
      });

      if (!claim) {
        return errorResponse("Claim not found", "CLAIM_NOT_FOUND", 400);
      }

      warrantyCard = claim.warrantyCard;

      // Check if pickup already exists for this claim
      const existingPickup = await prisma.pickup.findFirst({
        where: {
          claimId: claimId,
          status: { notIn: ["COMPLETED", "CANCELLED"] },
        },
      });

      if (existingPickup) {
        return errorResponse("An active pickup already exists for this claim", "PICKUP_EXISTS", 400);
      }
    } else if (warrantyCardId) {
      // Find warranty card if provided
      warrantyCard = await prisma.warrantyCard.findFirst({
        where: {
          id: warrantyCardId,
          tenantId: user.tenantId,
        },
        include: {
          shop: true,
          customer: true,
          product: true,
        },
      });

      if (!warrantyCard) {
        return errorResponse("Warranty card not found", "WARRANTY_CARD_NOT_FOUND", 400);
      }
    }
    // If neither claim nor warranty card - just create a pickup schedule
    // Items will be added later by collector

    // Handle route - either use existing or create new
    let routeId = validatedData.routeId || null;
    if (!routeId && validatedData.newRoute) {
      // Create new route
      const existingRoute = await prisma.route.findFirst({
        where: {
          tenantId: user.tenantId,
          name: validatedData.newRoute.name,
        },
      });

      if (existingRoute) {
        // Use existing route with same name
        routeId = existingRoute.id;
      } else {
        // Create new route
        const newRoute = await prisma.route.create({
          data: {
            tenantId: user.tenantId,
            name: validatedData.newRoute.name,
            zone: validatedData.newRoute.zone || null,
            areas: validatedData.newRoute.areas || null,
            status: "ACTIVE",
          },
        });
        routeId = newRoute.id;
      }
    }

    // Verify collector if provided
    if (validatedData.collectorId) {
      const collector = await prisma.collector.findFirst({
        where: {
          id: validatedData.collectorId,
          tenantId: user.tenantId,
          status: "ACTIVE",
        },
      });
      if (!collector) {
        return errorResponse("Collector not found or inactive", "COLLECTOR_NOT_FOUND", 400);
      }
    }

    // Determine shop ID
    if (!shopId && validatedData.fromType === "SHOP" && warrantyCard?.shopId) {
      shopId = warrantyCard.shopId;
    }

    // Verify shop if provided
    if (shopId) {
      const shop = await prisma.shop.findFirst({
        where: {
          id: shopId,
          tenantId: user.tenantId,
        },
      });
      if (!shop) {
        return errorResponse("Shop not found", "SHOP_NOT_FOUND", 400);
      }
    }

    // Generate pickup number
    const pickupNumber = await generatePickupNumber(user.tenantId);

    // Determine from address
    if (!fromAddress) {
      if (validatedData.fromType === "SHOP" && warrantyCard?.shop) {
        fromAddress = warrantyCard.shop.address || undefined;
      } else if (validatedData.fromType === "CUSTOMER") {
        fromAddress = validatedData.customerAddress || warrantyCard?.customer?.address || undefined;
      }
    }

    // Create pickup
    const pickup = await prisma.pickup.create({
      data: {
        tenantId: user.tenantId,
        claimId: claimId,
        warrantyCardId: warrantyCardId,
        pickupNumber,
        routeId: routeId,
        routeArea: validatedData.routeArea || null,
        collectorId: validatedData.collectorId || null,
        fromType: validatedData.fromType,
        fromShopId: shopId || null,
        fromAddress: fromAddress || null,
        toLocation: validatedData.toLocation,
        scheduledDate: validatedData.scheduledDate ? new Date(validatedData.scheduledDate) : null,
        scheduledTimeSlot: validatedData.scheduledTimeSlot || null,
        status: validatedData.collectorId ? "ASSIGNED" : "PENDING",
        notes: validatedData.notes || null,
        // Customer info for easy access
        customerName: validatedData.customerName || warrantyCard?.customer?.name || null,
        customerPhone: validatedData.customerPhone || warrantyCard?.customer?.phone || null,
        customerAddress: validatedData.customerAddress || warrantyCard?.customer?.address || null,
      },
      include: {
        claim: {
          select: { id: true, claimNumber: true },
        },
        warrantyCard: {
          select: {
            id: true,
            serialNumber: true,
            product: { select: { id: true, name: true } },
          },
        },
        collector: {
          select: { id: true, name: true, phone: true },
        },
        route: {
          select: { id: true, name: true, zone: true, areas: true },
        },
        fromShop: {
          select: { id: true, name: true, address: true },
        },
      },
    });

    // Update claim location if pickup is scheduled
    if (claim) {
      await prisma.warrantyClaim.update({
        where: { id: claimId! },
        data: {
          currentLocation: validatedData.fromType === "SHOP" ? "SHOP" : "CUSTOMER",
        },
      });

      // Record in claim history
      await prisma.claimHistory.create({
        data: {
          claimId: claimId!,
          fromStatus: claim.currentStatus,
          toStatus: claim.currentStatus,
          actionType: "pickup_scheduled",
          performedBy: user.id,
          notes: `Pickup ${pickupNumber} scheduled${validatedData.scheduledDate ? ` for ${validatedData.scheduledDate}` : ""}`,
          metadata: {
            pickupId: pickup.id,
            pickupNumber,
            collectorId: validatedData.collectorId,
          },
        },
      });
    }

    return successResponse(pickup);
  } catch (error) {
    console.error("Error creating pickup:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to create pickup", "SERVER_ERROR", 500);
  }
}
