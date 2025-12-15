// ===========================================
// Deliveries API - List and Create
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
import { createDeliverySchema } from "@/lib/validations";
import { ZodError } from "zod";

// Generate unique delivery number
async function generateDeliveryNumber(tenantId: number): Promise<string> {
  const prefix = "DL";
  const year = new Date().getFullYear().toString().slice(-2);
  const month = (new Date().getMonth() + 1).toString().padStart(2, "0");

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const count = await prisma.delivery.count({
    where: {
      tenantId,
      createdAt: { gte: startOfMonth },
    },
  });

  const sequence = (count + 1).toString().padStart(5, "0");
  return `${prefix}${year}${month}${sequence}`;
}

// GET /api/logistics/deliveries - List all deliveries
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
        { deliveryNumber: { contains: search } },
        { claim: { claimNumber: { contains: search } } },
        { toShop: { name: { contains: search } } },
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
    const total = await prisma.delivery.count({ where });

    // Get deliveries with pagination
    const deliveries = await prisma.delivery.findMany({
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
        toShop: {
          select: { id: true, name: true, address: true, phone: true },
        },
      },
      orderBy: { [sortBy === "createdAt" ? "createdAt" : sortBy]: sortOrder },
      skip,
      take: limit,
    });

    return successResponse(deliveries, calculatePaginationMeta(total, page, limit));
  } catch (error) {
    console.error("Error fetching deliveries:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch deliveries", "SERVER_ERROR", 500);
  }
}

// POST /api/logistics/deliveries - Create new delivery
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Check permission
    if (!user.permissions.includes("logistics.manage_deliveries")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const body = await request.json();
    const validatedData = createDeliverySchema.parse(body);

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

    // Check if delivery already exists for this claim
    const existingDelivery = await prisma.delivery.findFirst({
      where: {
        claimId: validatedData.claimId,
        status: { notIn: ["COMPLETED", "CANCELLED", "FAILED"] },
      },
    });

    if (existingDelivery) {
      return errorResponse("An active delivery already exists for this claim", "DELIVERY_EXISTS", 400);
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

    // Verify toShop if provided
    if (validatedData.toShopId) {
      const shop = await prisma.shop.findFirst({
        where: {
          id: validatedData.toShopId,
          tenantId: user.tenantId,
        },
      });
      if (!shop) {
        return errorResponse("Shop not found", "SHOP_NOT_FOUND", 400);
      }
    }

    // Generate delivery number
    const deliveryNumber = await generateDeliveryNumber(user.tenantId);

    // Determine to address
    let toAddress = validatedData.toAddress;
    if (!toAddress) {
      if (validatedData.toType === "SHOP" && claim.warrantyCard.shop) {
        toAddress = claim.warrantyCard.shop.address || undefined;
      } else if (validatedData.toType === "CUSTOMER" && claim.warrantyCard.customer) {
        toAddress = claim.warrantyCard.customer.address || undefined;
      }
    }

    // Create delivery
    const delivery = await prisma.delivery.create({
      data: {
        tenantId: user.tenantId,
        claimId: validatedData.claimId,
        deliveryNumber,
        collectorId: validatedData.collectorId || null,
        fromLocation: validatedData.fromLocation,
        toType: validatedData.toType,
        toShopId: validatedData.toShopId || claim.warrantyCard.shopId,
        toAddress: toAddress || null,
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
        toShop: {
          select: { id: true, name: true, address: true },
        },
      },
    });

    // Record in claim history
    await prisma.claimHistory.create({
      data: {
        claimId: validatedData.claimId,
        fromStatus: claim.currentStatus,
        toStatus: claim.currentStatus,
        actionType: "delivery_scheduled",
        performedBy: user.id,
        notes: `Delivery ${deliveryNumber} scheduled${validatedData.scheduledDate ? ` for ${validatedData.scheduledDate}` : ""}`,
        metadata: {
          deliveryId: delivery.id,
          deliveryNumber,
          collectorId: validatedData.collectorId,
        },
      },
    });

    return successResponse(delivery);
  } catch (error) {
    console.error("Error creating delivery:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to create delivery", "SERVER_ERROR", 500);
  }
}
