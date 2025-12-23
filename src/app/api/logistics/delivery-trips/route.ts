// ===========================================
// Delivery Trips API - List and Create
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
import { createDeliveryTripSchema } from "@/lib/validations";
import { ZodError } from "zod";

// Generate unique trip number
async function generateTripNumber(tenantId: number): Promise<string> {
  const prefix = "DT";
  const year = new Date().getFullYear().toString().slice(-2);
  const month = (new Date().getMonth() + 1).toString().padStart(2, "0");

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const count = await prisma.deliveryTrip.count({
    where: {
      tenantId,
      createdAt: { gte: startOfMonth },
    },
  });

  const sequence = (count + 1).toString().padStart(5, "0");
  return `${prefix}${year}${month}${sequence}`;
}

// GET /api/logistics/delivery-trips - List all delivery trips
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
    const shopId = searchParams.get("shopId");
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const myTrips = searchParams.get("myTrips");

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {
      tenantId: user.tenantId,
    };

    // My trips filter - filter by collector linked to current user
    if (myTrips === "true") {
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
        { tripNumber: { contains: search } },
        { shop: { name: { contains: search } } },
        { collector: { name: { contains: search } } },
        { customerName: { contains: search } },
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

    // Collector filter (only if myTrips is not set)
    if (collectorId && myTrips !== "true") {
      where.collectorId = collectorId === "unassigned" ? null : parseInt(collectorId);
    }

    // Shop filter
    if (shopId) {
      where.shopId = parseInt(shopId);
    }

    // Date range filter
    if (fromDate || toDate) {
      where.scheduledDate = {};
      if (fromDate) {
        where.scheduledDate.gte = new Date(fromDate);
      }
      if (toDate) {
        where.scheduledDate.lte = new Date(toDate);
      }
    }

    // Get total count
    const total = await prisma.deliveryTrip.count({ where });

    // Get trips with pagination
    const trips = await prisma.deliveryTrip.findMany({
      where,
      include: {
        collector: {
          select: { id: true, name: true, phone: true, vehicleNumber: true },
        },
        shop: {
          select: { id: true, name: true, address: true, phone: true },
        },
        createdUser: {
          select: { id: true, firstName: true, lastName: true },
        },
        items: {
          select: {
            id: true,
            status: true,
            claim: {
              select: {
                id: true,
                claimNumber: true,
                currentStatus: true,
                warrantyCard: {
                  select: {
                    serialNumber: true,
                    product: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
        _count: {
          select: { items: true },
        },
      },
      orderBy: { [sortBy === "createdAt" ? "createdAt" : sortBy]: sortOrder },
      skip,
      take: limit,
    });

    return successResponse(trips, calculatePaginationMeta(total, page, limit));
  } catch (error) {
    console.error("Error fetching delivery trips:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch delivery trips", "SERVER_ERROR", 500);
  }
}

// POST /api/logistics/delivery-trips - Create new delivery trip
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Check permission
    if (!user.permissions.includes("logistics.create_delivery")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const body = await request.json();
    const validatedData = createDeliveryTripSchema.parse(body);

    // Validate based on toType
    if (validatedData.toType === "SHOP") {
      if (!validatedData.shopId) {
        return errorResponse("Shop is required for shop delivery", "SHOP_REQUIRED", 400);
      }
      // Verify shop exists
      const shop = await prisma.shop.findFirst({
        where: {
          id: validatedData.shopId,
          tenantId: user.tenantId,
        },
      });
      if (!shop) {
        return errorResponse("Shop not found", "SHOP_NOT_FOUND", 400);
      }
    } else {
      // CUSTOMER type - require customer details
      if (!validatedData.customerName || !validatedData.customerPhone) {
        return errorResponse("Customer name and phone are required for customer delivery", "CUSTOMER_DETAILS_REQUIRED", 400);
      }
    }

    // Verify all claims exist and are ready for delivery
    const claims = await prisma.warrantyClaim.findMany({
      where: {
        id: { in: validatedData.claimIds },
        tenantId: user.tenantId,
      },
      include: {
        warrantyCard: {
          include: { shop: true },
        },
        deliveryItems: {
          where: {
            trip: {
              status: { notIn: ["COMPLETED", "CANCELLED"] },
            },
          },
        },
      },
    });

    if (claims.length !== validatedData.claimIds.length) {
      return errorResponse("One or more claims not found", "CLAIMS_NOT_FOUND", 400);
    }

    // Check if any claim already has an active delivery
    const claimsWithActiveDelivery = claims.filter(c => c.deliveryItems.length > 0);
    if (claimsWithActiveDelivery.length > 0) {
      return errorResponse(
        `Claims already have active deliveries: ${claimsWithActiveDelivery.map(c => c.claimNumber).join(", ")}`,
        "CLAIMS_HAVE_DELIVERY",
        400
      );
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

    // Generate trip number
    const tripNumber = await generateTripNumber(user.tenantId);

    // Create trip with items
    const trip = await prisma.deliveryTrip.create({
      data: {
        tenantId: user.tenantId,
        tripNumber,
        collectorId: validatedData.collectorId || null,
        toType: validatedData.toType,
        shopId: validatedData.shopId || null,
        customerName: validatedData.customerName || null,
        customerPhone: validatedData.customerPhone || null,
        customerAddress: validatedData.customerAddress || null,
        status: validatedData.collectorId ? "ASSIGNED" : "PENDING",
        scheduledDate: validatedData.scheduledDate ? new Date(validatedData.scheduledDate) : null,
        scheduledSlot: validatedData.scheduledSlot || null,
        notes: validatedData.notes || null,
        createdBy: user.id,
        items: {
          create: validatedData.claimIds.map(claimId => ({
            claimId,
            status: "PENDING",
          })),
        },
      },
      include: {
        collector: {
          select: { id: true, name: true, phone: true },
        },
        shop: {
          select: { id: true, name: true, address: true },
        },
        items: {
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
                  },
                },
              },
            },
          },
        },
      },
    });

    // Record in claim history for each claim
    for (const claimId of validatedData.claimIds) {
      const claim = claims.find(c => c.id === claimId);
      if (claim) {
        await prisma.claimHistory.create({
          data: {
            claimId,
            fromStatus: claim.currentStatus,
            toStatus: claim.currentStatus,
            actionType: "delivery_scheduled",
            performedBy: user.id,
            notes: `Delivery trip ${tripNumber} created${validatedData.scheduledDate ? ` for ${validatedData.scheduledDate}` : ""}`,
            metadata: {
              deliveryTripId: trip.id,
              deliveryTripNumber: tripNumber,
              collectorId: validatedData.collectorId,
            },
          },
        });
      }
    }

    return successResponse(trip);
  } catch (error) {
    console.error("Error creating delivery trip:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to create delivery trip", "SERVER_ERROR", 500);
  }
}
