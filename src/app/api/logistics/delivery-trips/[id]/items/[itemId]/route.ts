// ===========================================
// Delivery Item API - Update Individual Item Status
// ===========================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  handleZodError,
  requireAuth,
} from "@/lib/api-utils";
import { updateDeliveryItemSchema } from "@/lib/validations";
import { ZodError } from "zod";
import { DeliveryTripStatus } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string; itemId: string }>;
}

// PATCH /api/logistics/delivery-trips/[id]/items/[itemId] - Update item status
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id, itemId } = await params;
    const tripId = parseInt(id);
    const deliveryItemId = parseInt(itemId);

    if (isNaN(tripId) || isNaN(deliveryItemId)) {
      return errorResponse("Invalid ID", "INVALID_ID", 400);
    }

    // Check permission
    if (!user.permissions.includes("logistics.create_delivery")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const body = await request.json();
    const validatedData = updateDeliveryItemSchema.parse(body);

    // Get existing trip and item
    const existingTrip = await prisma.deliveryTrip.findFirst({
      where: {
        id: tripId,
        tenantId: user.tenantId,
      },
      include: {
        items: true,
      },
    });

    if (!existingTrip) {
      return errorResponse("Delivery trip not found", "NOT_FOUND", 404);
    }

    // Trip must be IN_TRANSIT to update items
    if (existingTrip.status !== "IN_TRANSIT") {
      return errorResponse("Trip must be in transit to update items", "INVALID_STATUS", 400);
    }

    const existingItem = await prisma.deliveryItem.findFirst({
      where: {
        id: deliveryItemId,
        tripId,
      },
      include: {
        claim: true,
      },
    });

    if (!existingItem) {
      return errorResponse("Item not found", "ITEM_NOT_FOUND", 404);
    }

    // Cannot update already delivered items (unless retrying)
    if (existingItem.status === "DELIVERED" && validatedData.status !== "PENDING") {
      return errorResponse("Cannot update delivered items", "ITEM_DELIVERED", 400);
    }

    // Build update data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {
      status: validatedData.status,
      notes: validatedData.notes !== undefined ? validatedData.notes : existingItem.notes,
    };

    if (validatedData.status === "DELIVERED") {
      updateData.deliveredAt = new Date();
      updateData.failureReason = null;
    } else if (validatedData.status === "FAILED") {
      if (!validatedData.failureReason) {
        return errorResponse("Failure reason is required", "FAILURE_REASON_REQUIRED", 400);
      }
      updateData.failureReason = validatedData.failureReason;
      updateData.deliveredAt = null;
    } else if (validatedData.status === "PENDING") {
      // Retry - reset the item
      updateData.failureReason = null;
      updateData.deliveredAt = null;
    }

    const item = await prisma.deliveryItem.update({
      where: { id: deliveryItemId },
      data: updateData,
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
    });

    // Update claim based on item status
    if (validatedData.status === "DELIVERED") {
      // Update claim location
      await prisma.warrantyClaim.update({
        where: { id: existingItem.claimId },
        data: {
          currentLocation: existingTrip.toType === "SHOP" ? "SHOP" : "CUSTOMER",
        },
      });

      // Record claim history
      await prisma.claimHistory.create({
        data: {
          claimId: existingItem.claimId,
          fromStatus: existingItem.claim.currentStatus,
          toStatus: existingItem.claim.currentStatus,
          fromLocation: "SERVICE_CENTER",
          toLocation: existingTrip.toType === "SHOP" ? "SHOP" : "CUSTOMER",
          actionType: "delivery_completed",
          performedBy: user.id,
          notes: `Item delivered via trip ${existingTrip.tripNumber}`,
          metadata: {
            deliveryTripId: existingTrip.id,
            deliveryTripNumber: existingTrip.tripNumber,
            deliveryItemId: item.id,
          },
        },
      });
    } else if (validatedData.status === "FAILED") {
      // Record failure in claim history
      await prisma.claimHistory.create({
        data: {
          claimId: existingItem.claimId,
          fromStatus: existingItem.claim.currentStatus,
          toStatus: existingItem.claim.currentStatus,
          actionType: "delivery_failed",
          performedBy: user.id,
          notes: `Delivery failed: ${validatedData.failureReason}`,
          metadata: {
            deliveryTripId: existingTrip.id,
            deliveryTripNumber: existingTrip.tripNumber,
            deliveryItemId: item.id,
            failureReason: validatedData.failureReason,
          },
        },
      });
    }

    // Check if all items are processed to auto-complete or set partial
    const updatedTrip = await prisma.deliveryTrip.findFirst({
      where: { id: tripId },
      include: { items: true },
    });

    if (updatedTrip) {
      const pendingItems = updatedTrip.items.filter(i => i.status === "PENDING");
      const failedItems = updatedTrip.items.filter(i => i.status === "FAILED");
      const deliveredItems = updatedTrip.items.filter(i => i.status === "DELIVERED");

      // If no pending items, update trip status
      if (pendingItems.length === 0) {
        let tripStatus: DeliveryTripStatus = DeliveryTripStatus.COMPLETED;
        if (failedItems.length > 0 && deliveredItems.length > 0) {
          tripStatus = DeliveryTripStatus.PARTIAL;
        } else if (failedItems.length === updatedTrip.items.length) {
          // All failed - keep as IN_TRANSIT for retry
          tripStatus = DeliveryTripStatus.IN_TRANSIT;
        }

        if (tripStatus !== DeliveryTripStatus.IN_TRANSIT) {
          await prisma.deliveryTrip.update({
            where: { id: tripId },
            data: {
              status: tripStatus,
              completedAt: new Date(),
            },
          });
        }
      }
    }

    return successResponse(item);
  } catch (error) {
    console.error("Error updating delivery item:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to update delivery item", "SERVER_ERROR", 500);
  }
}
