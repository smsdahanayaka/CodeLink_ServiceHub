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

// GET /api/logistics/pickups - List all pickups
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Check permission
    if (!user.permissions.includes("logistics.view")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const { searchParams } = new URL(request.url);
    const { page, limit, search, sortBy, sortOrder, skip } = parsePaginationParams(searchParams);

    // Additional filters
    const status = searchParams.get("status");
    const collectorId = searchParams.get("collectorId");
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    // Build where clause
    const where: Record<string, unknown> = {
      tenantId: user.tenantId,
    };

    // Search filter
    if (search) {
      where.OR = [
        { pickupNumber: { contains: search } },
        { claim: { claimNumber: { contains: search } } },
        { fromShop: { name: { contains: search } } },
        { collector: { name: { contains: search } } },
      ];
    }

    // Status filter
    if (status) {
      where.status = status;
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
            warrantyCard: {
              select: {
                serialNumber: true,
                product: { select: { name: true } },
                customer: { select: { name: true, phone: true } },
              },
            },
          },
        },
        collector: {
          select: { id: true, name: true, phone: true, vehicleNumber: true },
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

    // Check permission
    if (!user.permissions.includes("logistics.manage_pickups")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const body = await request.json();
    const validatedData = createPickupSchema.parse(body);

    // Verify claim exists and belongs to tenant
    const claim = await prisma.warrantyClaim.findFirst({
      where: {
        id: validatedData.claimId,
        tenantId: user.tenantId,
      },
      include: {
        warrantyCard: {
          include: {
            shop: true,
            customer: true,
          },
        },
      },
    });

    if (!claim) {
      return errorResponse("Claim not found", "CLAIM_NOT_FOUND", 400);
    }

    // Check if pickup already exists for this claim
    const existingPickup = await prisma.pickup.findFirst({
      where: {
        claimId: validatedData.claimId,
        status: { notIn: ["COMPLETED", "CANCELLED"] },
      },
    });

    if (existingPickup) {
      return errorResponse("An active pickup already exists for this claim", "PICKUP_EXISTS", 400);
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

    // Verify fromShop if provided
    if (validatedData.fromShopId) {
      const shop = await prisma.shop.findFirst({
        where: {
          id: validatedData.fromShopId,
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
    let fromAddress = validatedData.fromAddress;
    if (!fromAddress) {
      if (validatedData.fromType === "SHOP" && claim.warrantyCard.shop) {
        fromAddress = claim.warrantyCard.shop.address || undefined;
      } else if (validatedData.fromType === "CUSTOMER" && claim.warrantyCard.customer) {
        fromAddress = claim.warrantyCard.customer.address || undefined;
      }
    }

    // Create pickup
    const pickup = await prisma.pickup.create({
      data: {
        tenantId: user.tenantId,
        claimId: validatedData.claimId,
        pickupNumber,
        collectorId: validatedData.collectorId || null,
        fromType: validatedData.fromType,
        fromShopId: validatedData.fromShopId || claim.warrantyCard.shopId,
        fromAddress: fromAddress || null,
        toLocation: validatedData.toLocation,
        scheduledDate: validatedData.scheduledDate ? new Date(validatedData.scheduledDate) : null,
        scheduledTimeSlot: validatedData.scheduledTimeSlot || null,
        status: validatedData.collectorId ? "ASSIGNED" : "PENDING",
        notes: validatedData.notes || null,
      },
      include: {
        claim: {
          select: { id: true, claimNumber: true },
        },
        collector: {
          select: { id: true, name: true, phone: true },
        },
        fromShop: {
          select: { id: true, name: true, address: true },
        },
      },
    });

    // Update claim location if pickup is scheduled
    await prisma.warrantyClaim.update({
      where: { id: validatedData.claimId },
      data: {
        currentLocation: validatedData.fromType === "SHOP" ? "SHOP" : "CUSTOMER",
      },
    });

    // Record in claim history
    await prisma.claimHistory.create({
      data: {
        claimId: validatedData.claimId,
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
