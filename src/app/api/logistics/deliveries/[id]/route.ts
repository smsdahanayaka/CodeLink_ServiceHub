// ===========================================
// Single Delivery API - Get, Update, Delete, Status Updates
// ===========================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  handleZodError,
  requireAuth,
} from "@/lib/api-utils";
import { updateDeliverySchema, completeDeliverySchema, failDeliverySchema } from "@/lib/validations";
import { ZodError } from "zod";

type RouteParams = {
  params: Promise<{ id: string }>;
};

// GET /api/logistics/deliveries/[id] - Get single delivery
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const deliveryId = parseInt(id);

    if (isNaN(deliveryId)) {
      return errorResponse("Invalid delivery ID", "INVALID_ID", 400);
    }

    // Check permission
    if (!user.permissions.includes("logistics.view")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const delivery = await prisma.delivery.findFirst({
      where: {
        id: deliveryId,
        tenantId: user.tenantId,
      },
      include: {
        claim: {
          select: {
            id: true,
            claimNumber: true,
            currentStatus: true,
            issueDescription: true,
            warrantyCard: {
              select: {
                serialNumber: true,
                product: { select: { id: true, name: true, modelNumber: true } },
                customer: { select: { id: true, name: true, phone: true, address: true } },
                shop: { select: { id: true, name: true, phone: true, address: true } },
              },
            },
          },
        },
        collector: {
          select: { id: true, name: true, phone: true, email: true, vehicleNumber: true, vehicleType: true },
        },
        toShop: {
          select: { id: true, name: true, address: true, phone: true, contactPerson: true },
        },
      },
    });

    if (!delivery) {
      return errorResponse("Delivery not found", "NOT_FOUND", 404);
    }

    return successResponse(delivery);
  } catch (error) {
    console.error("Error fetching delivery:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch delivery", "SERVER_ERROR", 500);
  }
}

// PUT /api/logistics/deliveries/[id] - Update delivery
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const deliveryId = parseInt(id);

    if (isNaN(deliveryId)) {
      return errorResponse("Invalid delivery ID", "INVALID_ID", 400);
    }

    // Check permission
    if (!user.permissions.includes("logistics.manage_deliveries")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    // Verify delivery exists and belongs to tenant
    const existingDelivery = await prisma.delivery.findFirst({
      where: {
        id: deliveryId,
        tenantId: user.tenantId,
      },
    });

    if (!existingDelivery) {
      return errorResponse("Delivery not found", "NOT_FOUND", 404);
    }

    // Cannot update completed, cancelled, or failed deliveries
    if (["COMPLETED", "CANCELLED", "FAILED"].includes(existingDelivery.status)) {
      return errorResponse(
        `Cannot update ${existingDelivery.status.toLowerCase()} delivery`,
        "INVALID_STATUS",
        400
      );
    }

    const body = await request.json();
    const validatedData = updateDeliverySchema.parse(body);

    // Verify collector if provided and changed
    if (validatedData.collectorId && validatedData.collectorId !== existingDelivery.collectorId) {
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

    // Verify shop if provided and changed
    if (validatedData.toShopId && validatedData.toShopId !== existingDelivery.toShopId) {
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

    // Build update data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {};

    if (validatedData.collectorId !== undefined) {
      updateData.collectorId = validatedData.collectorId;
      // Auto-assign status if collector is being assigned
      if (validatedData.collectorId && existingDelivery.status === "PENDING") {
        updateData.status = "ASSIGNED";
      }
    }
    if (validatedData.fromLocation !== undefined) updateData.fromLocation = validatedData.fromLocation;
    if (validatedData.toType !== undefined) updateData.toType = validatedData.toType;
    if (validatedData.toShopId !== undefined) updateData.toShopId = validatedData.toShopId;
    if (validatedData.toAddress !== undefined) updateData.toAddress = validatedData.toAddress;
    if (validatedData.scheduledDate !== undefined) {
      updateData.scheduledDate = validatedData.scheduledDate ? new Date(validatedData.scheduledDate) : null;
    }
    if (validatedData.scheduledTimeSlot !== undefined) updateData.scheduledTimeSlot = validatedData.scheduledTimeSlot;
    if (validatedData.status !== undefined) updateData.status = validatedData.status;
    if (validatedData.notes !== undefined) updateData.notes = validatedData.notes;

    // Update delivery
    const delivery = await prisma.delivery.update({
      where: { id: deliveryId },
      data: updateData,
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

    return successResponse(delivery);
  } catch (error) {
    console.error("Error updating delivery:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to update delivery", "SERVER_ERROR", 500);
  }
}

// DELETE /api/logistics/deliveries/[id] - Cancel/Delete delivery
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const deliveryId = parseInt(id);

    if (isNaN(deliveryId)) {
      return errorResponse("Invalid delivery ID", "INVALID_ID", 400);
    }

    // Check permission
    if (!user.permissions.includes("logistics.manage_deliveries")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    // Verify delivery exists and belongs to tenant
    const existingDelivery = await prisma.delivery.findFirst({
      where: {
        id: deliveryId,
        tenantId: user.tenantId,
      },
      include: {
        claim: {
          select: { id: true, claimNumber: true, currentStatus: true },
        },
      },
    });

    if (!existingDelivery) {
      return errorResponse("Delivery not found", "NOT_FOUND", 404);
    }

    // Cannot delete completed deliveries
    if (existingDelivery.status === "COMPLETED") {
      return errorResponse("Cannot delete completed delivery", "INVALID_STATUS", 400);
    }

    // Cancel instead of hard delete for audit trail
    await prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        status: "CANCELLED",
      },
    });

    // Record in claim history
    if (existingDelivery.claim) {
      await prisma.claimHistory.create({
        data: {
          claimId: existingDelivery.claimId,
          fromStatus: existingDelivery.claim.currentStatus,
          toStatus: existingDelivery.claim.currentStatus,
          actionType: "delivery_cancelled",
          performedBy: user.id,
          notes: `Delivery ${existingDelivery.deliveryNumber} cancelled`,
          metadata: {
            deliveryId: existingDelivery.id,
            deliveryNumber: existingDelivery.deliveryNumber,
          },
        },
      });
    }

    return successResponse({ message: "Delivery cancelled successfully" });
  } catch (error) {
    console.error("Error cancelling delivery:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to cancel delivery", "SERVER_ERROR", 500);
  }
}

// PATCH /api/logistics/deliveries/[id] - Status updates (start transit, complete, fail)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const deliveryId = parseInt(id);

    if (isNaN(deliveryId)) {
      return errorResponse("Invalid delivery ID", "INVALID_ID", 400);
    }

    // Check permission
    if (!user.permissions.includes("logistics.manage_deliveries")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const body = await request.json();
    const { action } = body;

    // Verify delivery exists and belongs to tenant
    const existingDelivery = await prisma.delivery.findFirst({
      where: {
        id: deliveryId,
        tenantId: user.tenantId,
      },
      include: {
        claim: {
          select: { id: true, claimNumber: true, currentStatus: true },
        },
      },
    });

    if (!existingDelivery) {
      return errorResponse("Delivery not found", "NOT_FOUND", 404);
    }

    let updateData: Record<string, unknown> = {};
    let historyAction = "";
    let historyNotes = "";
    let updateClaimLocation = false;
    let newClaimLocation: "CUSTOMER" | "SHOP" | "IN_TRANSIT" | "SERVICE_CENTER" = "CUSTOMER";

    switch (action) {
      case "start_transit":
        // Validate current status
        if (!["PENDING", "ASSIGNED"].includes(existingDelivery.status)) {
          return errorResponse(
            "Delivery must be pending or assigned to start transit",
            "INVALID_STATUS",
            400
          );
        }
        if (!existingDelivery.collectorId) {
          return errorResponse(
            "Delivery must have a collector assigned to start transit",
            "NO_COLLECTOR",
            400
          );
        }
        updateData = {
          status: "IN_TRANSIT",
          dispatchedAt: new Date(),
        };
        historyAction = "delivery_started";
        historyNotes = `Delivery ${existingDelivery.deliveryNumber} started - in transit`;
        break;

      case "complete":
        // Validate current status
        if (existingDelivery.status !== "IN_TRANSIT") {
          return errorResponse(
            "Delivery must be in transit to complete",
            "INVALID_STATUS",
            400
          );
        }
        // Validate completion data
        const completionData = completeDeliverySchema.parse(body);
        updateData = {
          status: "COMPLETED",
          deliveredAt: new Date(),
          recipientName: completionData.recipientName,
          signatureUrl: completionData.signatureUrl || null,
          deliveryProofUrl: completionData.deliveryProofUrl || null,
          notes: completionData.notes || existingDelivery.notes || null,
        };
        historyAction = "delivery_completed";
        historyNotes = `Delivery ${existingDelivery.deliveryNumber} completed - received by ${completionData.recipientName}`;

        // Update claim location based on delivery type
        updateClaimLocation = true;
        newClaimLocation = existingDelivery.toType === "SHOP" ? "SHOP" : "CUSTOMER";
        break;

      case "fail":
        // Validate current status
        if (!["ASSIGNED", "IN_TRANSIT"].includes(existingDelivery.status)) {
          return errorResponse(
            "Delivery must be assigned or in transit to mark as failed",
            "INVALID_STATUS",
            400
          );
        }
        // Validate failure data
        const failureData = failDeliverySchema.parse(body);
        updateData = {
          status: "FAILED",
          failureReason: failureData.failureReason,
          notes: failureData.notes || existingDelivery.notes || null,
        };
        historyAction = "delivery_failed";
        historyNotes = `Delivery ${existingDelivery.deliveryNumber} failed - ${failureData.failureReason}`;
        break;

      case "cancel":
        if (existingDelivery.status === "COMPLETED") {
          return errorResponse("Cannot cancel completed delivery", "INVALID_STATUS", 400);
        }
        updateData = {
          status: "CANCELLED",
        };
        historyAction = "delivery_cancelled";
        historyNotes = `Delivery ${existingDelivery.deliveryNumber} cancelled`;
        break;

      case "retry":
        // Reset failed delivery to pending
        if (existingDelivery.status !== "FAILED") {
          return errorResponse("Only failed deliveries can be retried", "INVALID_STATUS", 400);
        }
        updateData = {
          status: existingDelivery.collectorId ? "ASSIGNED" : "PENDING",
          failureReason: null,
        };
        historyAction = "delivery_retry";
        historyNotes = `Delivery ${existingDelivery.deliveryNumber} retry scheduled`;
        break;

      default:
        return errorResponse(
          "Invalid action. Use: start_transit, complete, fail, cancel, retry",
          "INVALID_ACTION",
          400
        );
    }

    // Update delivery
    const delivery = await prisma.delivery.update({
      where: { id: deliveryId },
      data: updateData,
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

    // Update claim location if needed
    if (updateClaimLocation && existingDelivery.claim) {
      await prisma.warrantyClaim.update({
        where: { id: existingDelivery.claimId },
        data: { currentLocation: newClaimLocation },
      });
    }

    // Record in claim history
    if (existingDelivery.claim) {
      await prisma.claimHistory.create({
        data: {
          claimId: existingDelivery.claimId,
          fromStatus: existingDelivery.claim.currentStatus,
          toStatus: existingDelivery.claim.currentStatus,
          actionType: historyAction,
          performedBy: user.id,
          notes: historyNotes,
          metadata: {
            deliveryId: existingDelivery.id,
            deliveryNumber: existingDelivery.deliveryNumber,
          },
        },
      });
    }

    return successResponse(delivery);
  } catch (error) {
    console.error("Error updating delivery status:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to update delivery status", "SERVER_ERROR", 500);
  }
}
