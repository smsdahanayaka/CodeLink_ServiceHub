// ===========================================
// Collection Trips API - List and Create
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
import { createCollectionTripSchema } from "@/lib/validations";
import { ZodError } from "zod";

// Generate unique trip number
async function generateTripNumber(tenantId: number): Promise<string> {
  const prefix = "CT";
  const year = new Date().getFullYear().toString().slice(-2);
  const month = (new Date().getMonth() + 1).toString().padStart(2, "0");

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const count = await prisma.collectionTrip.count({
    where: {
      tenantId,
      createdAt: { gte: startOfMonth },
    },
  });

  const sequence = (count + 1).toString().padStart(5, "0");
  return `${prefix}${year}${month}${sequence}`;
}

// GET /api/logistics/collection-trips - List all collection trips
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
      where.collectorId = parseInt(collectorId);
    }

    // Shop filter
    if (shopId) {
      where.shopId = parseInt(shopId);
    }

    // Date range filter
    if (fromDate || toDate) {
      where.startedAt = {};
      if (fromDate) {
        where.startedAt.gte = new Date(fromDate);
      }
      if (toDate) {
        where.startedAt.lte = new Date(toDate);
      }
    }

    // Get total count
    const total = await prisma.collectionTrip.count({ where });

    // Get trips with pagination
    const trips = await prisma.collectionTrip.findMany({
      where,
      include: {
        collector: {
          select: { id: true, name: true, phone: true, vehicleNumber: true },
        },
        shop: {
          select: { id: true, name: true, address: true, phone: true },
        },
        receiverUser: {
          select: { id: true, firstName: true, lastName: true },
        },
        items: {
          select: {
            id: true,
            serialNumber: true,
            issueDescription: true,
            status: true,
            warrantyCard: {
              select: {
                id: true,
                cardNumber: true,
                product: { select: { name: true } },
              },
            },
            product: { select: { id: true, name: true } },
            claim: { select: { id: true, claimNumber: true } },
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
    console.error("Error fetching collection trips:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch collection trips", "SERVER_ERROR", 500);
  }
}

// POST /api/logistics/collection-trips - Create new collection trip
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Check permission - allow both create_collection and collect permissions
    const hasPermission =
      user.permissions.includes("logistics.create_collection") ||
      user.permissions.includes("logistics.collect");

    if (!hasPermission) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const body = await request.json();
    const validatedData = createCollectionTripSchema.parse(body);

    // Get collector from user (if user is a collector)
    const collector = await prisma.collector.findFirst({
      where: {
        userId: user.id,
        tenantId: user.tenantId,
        status: "ACTIVE",
      },
    });

    if (!collector) {
      return errorResponse("You are not registered as a collector", "NOT_COLLECTOR", 403);
    }

    // Validate based on fromType
    if (validatedData.fromType === "SHOP") {
      if (!validatedData.shopId) {
        return errorResponse("Shop is required for shop collection", "SHOP_REQUIRED", 400);
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
        return errorResponse("Customer name and phone are required for customer collection", "CUSTOMER_DETAILS_REQUIRED", 400);
      }
    }

    // Generate trip number
    const tripNumber = await generateTripNumber(user.tenantId);

    // Create trip with items
    const trip = await prisma.collectionTrip.create({
      data: {
        tenantId: user.tenantId,
        tripNumber,
        collectorId: collector.id,
        fromType: validatedData.fromType,
        shopId: validatedData.shopId || null,
        customerName: validatedData.customerName || null,
        customerPhone: validatedData.customerPhone || null,
        customerAddress: validatedData.customerAddress || null,
        status: "IN_PROGRESS",
        notes: validatedData.notes || null,
        items: validatedData.items && validatedData.items.length > 0 ? {
          create: validatedData.items.map(item => ({
            serialNumber: item.serialNumber,
            issueDescription: item.issueDescription,
            warrantyCardId: item.warrantyCardId || null,
            productId: item.productId || null,
            customerName: item.customerName || null,
            customerPhone: item.customerPhone || null,
            notes: item.notes || null,
            status: "COLLECTED",
          })),
        } : undefined,
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
            warrantyCard: {
              select: {
                id: true,
                cardNumber: true,
                product: { select: { name: true } },
              },
            },
            product: { select: { id: true, name: true } },
          },
        },
      },
    });

    return successResponse(trip);
  } catch (error) {
    console.error("Error creating collection trip:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to create collection trip", "SERVER_ERROR", 500);
  }
}
