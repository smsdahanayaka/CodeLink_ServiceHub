// ===========================================
// Collection Trip API - Single Trip Operations
// ===========================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  handleZodError,
  requireAuth,
} from "@/lib/api-utils";
import { updateCollectionTripSchema } from "@/lib/validations";
import { ZodError } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/logistics/collection-trips/[id] - Get trip details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const tripId = parseInt(id);

    if (isNaN(tripId)) {
      return errorResponse("Invalid trip ID", "INVALID_ID", 400);
    }

    // Check permission
    if (!user.permissions.includes("logistics.view")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const trip = await prisma.collectionTrip.findFirst({
      where: {
        id: tripId,
        tenantId: user.tenantId,
      },
      include: {
        collector: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            vehicleNumber: true,
            vehicleType: true,
          },
        },
        shop: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            contactPerson: true,
          },
        },
        receiverUser: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        items: {
          include: {
            shop: {
              select: { id: true, name: true, address: true, phone: true },
            },
            pickup: {
              select: { id: true, pickupNumber: true, scheduledDate: true },
            },
            warrantyCard: {
              select: {
                id: true,
                cardNumber: true,
                serialNumber: true,
                product: { select: { id: true, name: true, modelNumber: true } },
                customer: { select: { id: true, name: true, phone: true } },
                shop: { select: { id: true, name: true } },
              },
            },
            product: { select: { id: true, name: true, modelNumber: true } },
            claim: {
              select: {
                id: true,
                claimNumber: true,
                currentStatus: true,
                issueDescription: true,
              }
            },
          },
          orderBy: [{ shopId: "asc" }, { createdAt: "asc" }],
        },
        pickups: {
          select: {
            id: true,
            pickupNumber: true,
            fromType: true,
            status: true,
            scheduledDate: true,
            scheduledTimeSlot: true,
            customerName: true,
            customerPhone: true,
            fromShop: {
              select: { id: true, name: true, address: true, phone: true },
            },
            route: {
              select: { id: true, name: true, zone: true },
            },
            _count: {
              select: { collectionItems: true },
            },
          },
        },
      },
    });

    if (!trip) {
      return errorResponse("Collection trip not found", "NOT_FOUND", 404);
    }

    return successResponse(trip);
  } catch (error) {
    console.error("Error fetching collection trip:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch collection trip", "SERVER_ERROR", 500);
  }
}

// PUT /api/logistics/collection-trips/[id] - Update trip
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const tripId = parseInt(id);

    if (isNaN(tripId)) {
      return errorResponse("Invalid trip ID", "INVALID_ID", 400);
    }

    // Check permission - allow both create_collection and collect permissions
    const hasPermission =
      user.permissions.includes("logistics.create_collection") ||
      user.permissions.includes("logistics.collect");

    if (!hasPermission) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const body = await request.json();
    const validatedData = updateCollectionTripSchema.parse(body);

    // Get existing trip
    const existingTrip = await prisma.collectionTrip.findFirst({
      where: {
        id: tripId,
        tenantId: user.tenantId,
      },
    });

    if (!existingTrip) {
      return errorResponse("Collection trip not found", "NOT_FOUND", 404);
    }

    // Cannot update if already received or cancelled
    if (existingTrip.status === "RECEIVED" || existingTrip.status === "CANCELLED") {
      return errorResponse(`Cannot update trip with status ${existingTrip.status}`, "INVALID_STATUS", 400);
    }

    const trip = await prisma.collectionTrip.update({
      where: { id: tripId },
      data: {
        notes: validatedData.notes !== undefined ? validatedData.notes : existingTrip.notes,
      },
      include: {
        collector: {
          select: { id: true, name: true, phone: true },
        },
        shop: {
          select: { id: true, name: true, address: true },
        },
        items: true,
      },
    });

    return successResponse(trip);
  } catch (error) {
    console.error("Error updating collection trip:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to update collection trip", "SERVER_ERROR", 500);
  }
}

// DELETE /api/logistics/collection-trips/[id] - Cancel trip
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const tripId = parseInt(id);

    if (isNaN(tripId)) {
      return errorResponse("Invalid trip ID", "INVALID_ID", 400);
    }

    // Check permission - allow both create_collection and collect permissions
    const hasPermission =
      user.permissions.includes("logistics.create_collection") ||
      user.permissions.includes("logistics.collect");

    if (!hasPermission) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const existingTrip = await prisma.collectionTrip.findFirst({
      where: {
        id: tripId,
        tenantId: user.tenantId,
      },
      include: { items: true },
    });

    if (!existingTrip) {
      return errorResponse("Collection trip not found", "NOT_FOUND", 404);
    }

    // Cannot cancel if already received
    if (existingTrip.status === "RECEIVED") {
      return errorResponse("Cannot cancel a received trip", "INVALID_STATUS", 400);
    }

    // Check if any items have been processed
    const processedItems = existingTrip.items.filter(item => item.status === "PROCESSED");
    if (processedItems.length > 0) {
      return errorResponse("Cannot cancel trip with processed items", "HAS_PROCESSED_ITEMS", 400);
    }

    await prisma.collectionTrip.update({
      where: { id: tripId },
      data: {
        status: "CANCELLED",
        completedAt: new Date(),
      },
    });

    return successResponse({ message: "Collection trip cancelled successfully" });
  } catch (error) {
    console.error("Error cancelling collection trip:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to cancel collection trip", "SERVER_ERROR", 500);
  }
}

// PATCH /api/logistics/collection-trips/[id] - Status transitions
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const tripId = parseInt(id);

    if (isNaN(tripId)) {
      return errorResponse("Invalid trip ID", "INVALID_ID", 400);
    }

    const body = await request.json();
    const { action } = body;

    // Check permission - allow both create_collection and collect permissions
    const hasPermission =
      user.permissions.includes("logistics.create_collection") ||
      user.permissions.includes("logistics.collect");

    if (!hasPermission) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const existingTrip = await prisma.collectionTrip.findFirst({
      where: {
        id: tripId,
        tenantId: user.tenantId,
      },
      include: { items: true },
    });

    if (!existingTrip) {
      return errorResponse("Collection trip not found", "NOT_FOUND", 404);
    }

    let updateData: Record<string, unknown> = {};

    switch (action) {
      case "start_transit":
      case "complete":
        // Start transit to service center (complete = start_transit)
        if (existingTrip.status !== "IN_PROGRESS") {
          return errorResponse("Trip must be in progress to start transit", "INVALID_STATUS", 400);
        }
        if (existingTrip.items.length === 0) {
          return errorResponse("Cannot start transit with no items", "NO_ITEMS", 400);
        }
        updateData = {
          status: "IN_TRANSIT",
          completedAt: new Date(),
        };
        break;

      case "cancel":
        if (existingTrip.status === "RECEIVED") {
          return errorResponse("Cannot cancel a received trip", "INVALID_STATUS", 400);
        }
        updateData = {
          status: "CANCELLED",
          completedAt: new Date(),
        };
        break;

      default:
        return errorResponse("Invalid action", "INVALID_ACTION", 400);
    }

    const trip = await prisma.collectionTrip.update({
      where: { id: tripId },
      data: updateData,
      include: {
        collector: {
          select: { id: true, name: true, phone: true },
        },
        shop: {
          select: { id: true, name: true, address: true },
        },
        items: true,
      },
    });

    return successResponse(trip);
  } catch (error) {
    console.error("Error updating collection trip status:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to update collection trip status", "SERVER_ERROR", 500);
  }
}
