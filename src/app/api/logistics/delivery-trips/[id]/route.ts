// ===========================================
// Delivery Trip API - Single Trip Operations
// ===========================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  handleZodError,
  requireAuth,
} from "@/lib/api-utils";
import { updateDeliveryTripSchema, completeDeliveryTripSchema } from "@/lib/validations";
import { ZodError } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/logistics/delivery-trips/[id] - Get trip details
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

    const trip = await prisma.deliveryTrip.findFirst({
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
        createdUser: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        items: {
          include: {
            claim: {
              select: {
                id: true,
                claimNumber: true,
                currentStatus: true,
                issueDescription: true,
                resolution: true,
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
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!trip) {
      return errorResponse("Delivery trip not found", "NOT_FOUND", 404);
    }

    return successResponse(trip);
  } catch (error) {
    console.error("Error fetching delivery trip:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch delivery trip", "SERVER_ERROR", 500);
  }
}

// PUT /api/logistics/delivery-trips/[id] - Update trip
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const tripId = parseInt(id);

    if (isNaN(tripId)) {
      return errorResponse("Invalid trip ID", "INVALID_ID", 400);
    }

    // Check permission
    if (!user.permissions.includes("logistics.create_delivery")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const body = await request.json();
    const validatedData = updateDeliveryTripSchema.parse(body);

    // Get existing trip
    const existingTrip = await prisma.deliveryTrip.findFirst({
      where: {
        id: tripId,
        tenantId: user.tenantId,
      },
    });

    if (!existingTrip) {
      return errorResponse("Delivery trip not found", "NOT_FOUND", 404);
    }

    // Cannot update if completed, cancelled, or partial
    if (["COMPLETED", "CANCELLED", "PARTIAL"].includes(existingTrip.status)) {
      return errorResponse(`Cannot update trip with status ${existingTrip.status}`, "INVALID_STATUS", 400);
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

    // Build update data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {};

    if (validatedData.collectorId !== undefined) {
      updateData.collectorId = validatedData.collectorId;
      // Update status to ASSIGNED if collector is set on PENDING trip
      if (validatedData.collectorId && existingTrip.status === "PENDING") {
        updateData.status = "ASSIGNED";
      }
    }
    if (validatedData.scheduledDate !== undefined) {
      updateData.scheduledDate = validatedData.scheduledDate ? new Date(validatedData.scheduledDate) : null;
    }
    if (validatedData.scheduledSlot !== undefined) {
      updateData.scheduledSlot = validatedData.scheduledSlot;
    }
    if (validatedData.notes !== undefined) {
      updateData.notes = validatedData.notes;
    }

    const trip = await prisma.deliveryTrip.update({
      where: { id: tripId },
      data: updateData,
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
              select: { id: true, claimNumber: true },
            },
          },
        },
      },
    });

    return successResponse(trip);
  } catch (error) {
    console.error("Error updating delivery trip:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to update delivery trip", "SERVER_ERROR", 500);
  }
}

// DELETE /api/logistics/delivery-trips/[id] - Cancel trip
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const tripId = parseInt(id);

    if (isNaN(tripId)) {
      return errorResponse("Invalid trip ID", "INVALID_ID", 400);
    }

    // Check permission
    if (!user.permissions.includes("logistics.create_delivery")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const existingTrip = await prisma.deliveryTrip.findFirst({
      where: {
        id: tripId,
        tenantId: user.tenantId,
      },
      include: { items: true },
    });

    if (!existingTrip) {
      return errorResponse("Delivery trip not found", "NOT_FOUND", 404);
    }

    // Cannot cancel if already completed
    if (existingTrip.status === "COMPLETED") {
      return errorResponse("Cannot cancel a completed trip", "INVALID_STATUS", 400);
    }

    // Check if any items have been delivered
    const deliveredItems = existingTrip.items.filter(item => item.status === "DELIVERED");
    if (deliveredItems.length > 0) {
      return errorResponse("Cannot cancel trip with delivered items", "HAS_DELIVERED_ITEMS", 400);
    }

    await prisma.deliveryTrip.update({
      where: { id: tripId },
      data: {
        status: "CANCELLED",
        completedAt: new Date(),
      },
    });

    return successResponse({ message: "Delivery trip cancelled successfully" });
  } catch (error) {
    console.error("Error cancelling delivery trip:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to cancel delivery trip", "SERVER_ERROR", 500);
  }
}

// PATCH /api/logistics/delivery-trips/[id] - Status transitions
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

    // Check permission
    if (!user.permissions.includes("logistics.create_delivery")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const existingTrip = await prisma.deliveryTrip.findFirst({
      where: {
        id: tripId,
        tenantId: user.tenantId,
      },
      include: {
        items: {
          include: {
            claim: true,
          },
        },
      },
    });

    if (!existingTrip) {
      return errorResponse("Delivery trip not found", "NOT_FOUND", 404);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let updateData: Record<string, any> = {};

    switch (action) {
      case "dispatch":
        // Start delivery
        if (!["PENDING", "ASSIGNED"].includes(existingTrip.status)) {
          return errorResponse("Trip must be pending or assigned to dispatch", "INVALID_STATUS", 400);
        }
        if (!existingTrip.collectorId) {
          return errorResponse("Collector must be assigned before dispatch", "NO_COLLECTOR", 400);
        }
        if (existingTrip.items.length === 0) {
          return errorResponse("Cannot dispatch trip with no items", "NO_ITEMS", 400);
        }
        updateData = {
          status: "IN_TRANSIT",
          dispatchedAt: new Date(),
        };
        break;

      case "complete":
        // Complete all remaining pending items and finish trip
        if (existingTrip.status !== "IN_TRANSIT") {
          return errorResponse("Trip must be in transit to complete", "INVALID_STATUS", 400);
        }

        // Validate complete data
        const completeData = completeDeliveryTripSchema.parse(body);

        // Update all pending items to delivered
        const pendingItems = existingTrip.items.filter(i => i.status === "PENDING");
        for (const item of pendingItems) {
          await prisma.deliveryItem.update({
            where: { id: item.id },
            data: {
              status: "DELIVERED",
              deliveredAt: new Date(),
            },
          });

          // Update claim location
          await prisma.warrantyClaim.update({
            where: { id: item.claimId },
            data: {
              currentLocation: existingTrip.toType === "SHOP" ? "SHOP" : "CUSTOMER",
            },
          });

          // Record claim history
          await prisma.claimHistory.create({
            data: {
              claimId: item.claimId,
              fromStatus: item.claim.currentStatus,
              toStatus: item.claim.currentStatus,
              fromLocation: "SERVICE_CENTER",
              toLocation: existingTrip.toType === "SHOP" ? "SHOP" : "CUSTOMER",
              actionType: "delivery_completed",
              performedBy: user.id,
              notes: `Delivered via trip ${existingTrip.tripNumber}. Received by: ${completeData.recipientName}`,
              metadata: {
                deliveryTripId: existingTrip.id,
                deliveryTripNumber: existingTrip.tripNumber,
              },
            },
          });
        }

        updateData = {
          status: "COMPLETED",
          completedAt: new Date(),
          recipientName: completeData.recipientName,
          signatureUrl: completeData.signatureUrl || null,
          notes: completeData.notes ? `${existingTrip.notes || ""}\n\nCompletion notes: ${completeData.notes}`.trim() : existingTrip.notes,
        };
        break;

      case "cancel":
        if (["COMPLETED", "PARTIAL"].includes(existingTrip.status)) {
          return errorResponse("Cannot cancel completed or partial trips", "INVALID_STATUS", 400);
        }
        updateData = {
          status: "CANCELLED",
          completedAt: new Date(),
        };
        break;

      default:
        return errorResponse("Invalid action", "INVALID_ACTION", 400);
    }

    const trip = await prisma.deliveryTrip.update({
      where: { id: tripId },
      data: updateData,
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
              select: { id: true, claimNumber: true, currentStatus: true },
            },
          },
        },
      },
    });

    return successResponse(trip);
  } catch (error) {
    console.error("Error updating delivery trip status:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to update delivery trip status", "SERVER_ERROR", 500);
  }
}
