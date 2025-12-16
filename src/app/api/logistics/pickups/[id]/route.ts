// ===========================================
// Single Pickup API - Get, Update, Delete, Status Updates
// ===========================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  handleZodError,
  requireAuth,
} from "@/lib/api-utils";
import { updatePickupSchema, completePickupSchema } from "@/lib/validations";
import { ZodError } from "zod";

type RouteParams = {
  params: Promise<{ id: string }>;
};

// GET /api/logistics/pickups/[id] - Get single pickup
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const pickupId = parseInt(id);

    if (isNaN(pickupId)) {
      return errorResponse("Invalid pickup ID", "INVALID_ID", 400);
    }

    // Check permission
    if (!user.permissions.includes("logistics.view")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const pickup = await prisma.pickup.findFirst({
      where: {
        id: pickupId,
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
        fromShop: {
          select: { id: true, name: true, address: true, phone: true, contactPerson: true },
        },
      },
    });

    if (!pickup) {
      return errorResponse("Pickup not found", "NOT_FOUND", 404);
    }

    return successResponse(pickup);
  } catch (error) {
    console.error("Error fetching pickup:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch pickup", "SERVER_ERROR", 500);
  }
}

// PUT /api/logistics/pickups/[id] - Update pickup
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const pickupId = parseInt(id);

    if (isNaN(pickupId)) {
      return errorResponse("Invalid pickup ID", "INVALID_ID", 400);
    }

    // Check permission
    if (!user.permissions.includes("logistics.manage_pickups")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    // Verify pickup exists and belongs to tenant
    const existingPickup = await prisma.pickup.findFirst({
      where: {
        id: pickupId,
        tenantId: user.tenantId,
      },
    });

    if (!existingPickup) {
      return errorResponse("Pickup not found", "NOT_FOUND", 404);
    }

    // Cannot update completed or cancelled pickups
    if (["COMPLETED", "CANCELLED"].includes(existingPickup.status)) {
      return errorResponse(
        `Cannot update ${existingPickup.status.toLowerCase()} pickup`,
        "INVALID_STATUS",
        400
      );
    }

    const body = await request.json();
    const validatedData = updatePickupSchema.parse(body);

    // Verify collector if provided and changed
    if (validatedData.collectorId && validatedData.collectorId !== existingPickup.collectorId) {
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
    if (validatedData.fromShopId && validatedData.fromShopId !== existingPickup.fromShopId) {
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

    // Build update data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {};

    if (validatedData.collectorId !== undefined) {
      updateData.collectorId = validatedData.collectorId;
      // Auto-assign status if collector is being assigned
      if (validatedData.collectorId && existingPickup.status === "PENDING") {
        updateData.status = "ASSIGNED";
      }
    }
    if (validatedData.fromType !== undefined) updateData.fromType = validatedData.fromType;
    if (validatedData.fromShopId !== undefined) updateData.fromShopId = validatedData.fromShopId;
    if (validatedData.fromAddress !== undefined) updateData.fromAddress = validatedData.fromAddress;
    if (validatedData.toLocation !== undefined) updateData.toLocation = validatedData.toLocation;
    if (validatedData.scheduledDate !== undefined) {
      updateData.scheduledDate = validatedData.scheduledDate ? new Date(validatedData.scheduledDate) : null;
    }
    if (validatedData.scheduledTimeSlot !== undefined) updateData.scheduledTimeSlot = validatedData.scheduledTimeSlot;
    if (validatedData.status !== undefined) updateData.status = validatedData.status;
    if (validatedData.notes !== undefined) updateData.notes = validatedData.notes;

    // Update pickup
    const pickup = await prisma.pickup.update({
      where: { id: pickupId },
      data: updateData,
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

    return successResponse(pickup);
  } catch (error) {
    console.error("Error updating pickup:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to update pickup", "SERVER_ERROR", 500);
  }
}

// DELETE /api/logistics/pickups/[id] - Cancel/Delete pickup
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const pickupId = parseInt(id);

    if (isNaN(pickupId)) {
      return errorResponse("Invalid pickup ID", "INVALID_ID", 400);
    }

    // Check permission
    if (!user.permissions.includes("logistics.manage_pickups")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    // Verify pickup exists and belongs to tenant
    const existingPickup = await prisma.pickup.findFirst({
      where: {
        id: pickupId,
        tenantId: user.tenantId,
      },
      include: {
        claim: {
          select: { id: true, claimNumber: true, currentStatus: true },
        },
      },
    });

    if (!existingPickup) {
      return errorResponse("Pickup not found", "NOT_FOUND", 404);
    }

    // Cannot delete completed pickups
    if (existingPickup.status === "COMPLETED") {
      return errorResponse("Cannot delete completed pickup", "INVALID_STATUS", 400);
    }

    // Cancel instead of hard delete for audit trail
    await prisma.pickup.update({
      where: { id: pickupId },
      data: {
        status: "CANCELLED",
      },
    });

    // Record in claim history
    if (existingPickup.claim) {
      await prisma.claimHistory.create({
        data: {
          claimId: existingPickup.claimId,
          fromStatus: existingPickup.claim.currentStatus,
          toStatus: existingPickup.claim.currentStatus,
          actionType: "pickup_cancelled",
          performedBy: user.id,
          notes: `Pickup ${existingPickup.pickupNumber} cancelled`,
          metadata: {
            pickupId: existingPickup.id,
            pickupNumber: existingPickup.pickupNumber,
          },
        },
      });
    }

    return successResponse({ message: "Pickup cancelled successfully" });
  } catch (error) {
    console.error("Error cancelling pickup:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to cancel pickup", "SERVER_ERROR", 500);
  }
}

// PATCH /api/logistics/pickups/[id] - Status updates (start transit, complete)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const pickupId = parseInt(id);

    if (isNaN(pickupId)) {
      return errorResponse("Invalid pickup ID", "INVALID_ID", 400);
    }

    // Check permission
    if (!user.permissions.includes("logistics.manage_pickups")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const body = await request.json();
    const { action } = body;

    // Verify pickup exists and belongs to tenant
    const existingPickup = await prisma.pickup.findFirst({
      where: {
        id: pickupId,
        tenantId: user.tenantId,
      },
      include: {
        claim: {
          select: { id: true, claimNumber: true, currentStatus: true },
        },
      },
    });

    if (!existingPickup) {
      return errorResponse("Pickup not found", "NOT_FOUND", 404);
    }

    let updateData: Record<string, unknown> = {};
    let historyAction = "";
    let historyNotes = "";

    switch (action) {
      case "start_transit":
        // Validate current status
        if (!["PENDING", "ASSIGNED"].includes(existingPickup.status)) {
          return errorResponse(
            "Pickup must be pending or assigned to start transit",
            "INVALID_STATUS",
            400
          );
        }
        if (!existingPickup.collectorId) {
          return errorResponse(
            "Pickup must have a collector assigned to start transit",
            "NO_COLLECTOR",
            400
          );
        }
        updateData = {
          status: "IN_TRANSIT",
          pickedAt: new Date(),
        };
        historyAction = "pickup_started";
        historyNotes = `Pickup ${existingPickup.pickupNumber} started - in transit`;
        break;

      case "complete":
        // Validate current status
        if (existingPickup.status !== "IN_TRANSIT") {
          return errorResponse(
            "Pickup must be in transit to complete",
            "INVALID_STATUS",
            400
          );
        }
        // Validate completion data
        const completionData = completePickupSchema.parse(body);
        updateData = {
          status: "COMPLETED",
          receivedAt: new Date(),
          receiverName: completionData.receiverName,
          notes: completionData.notes || existingPickup.notes || null,
        };
        historyAction = "pickup_completed";
        historyNotes = `Pickup ${existingPickup.pickupNumber} completed - received by ${completionData.receiverName}`;

        // Update claim location to service center
        await prisma.warrantyClaim.update({
          where: { id: existingPickup.claimId },
          data: { currentLocation: "SERVICE_CENTER" },
        });
        break;

      case "cancel":
        if (existingPickup.status === "COMPLETED") {
          return errorResponse("Cannot cancel completed pickup", "INVALID_STATUS", 400);
        }
        updateData = {
          status: "CANCELLED",
        };
        historyAction = "pickup_cancelled";
        historyNotes = `Pickup ${existingPickup.pickupNumber} cancelled`;
        break;

      case "reject":
        // Reject the pickup after inspection - item will be returned
        if (existingPickup.status !== "COMPLETED") {
          return errorResponse(
            "Only completed pickups can be rejected",
            "INVALID_STATUS",
            400
          );
        }
        const { rejectionReason } = body;
        if (!rejectionReason) {
          return errorResponse("Rejection reason is required", "VALIDATION_ERROR", 400);
        }
        updateData = {
          status: "REJECTED",
          rejectedAt: new Date(),
          rejectedBy: user.id,
          rejectionReason: rejectionReason,
        };
        historyAction = "pickup_rejected";
        historyNotes = `Pickup ${existingPickup.pickupNumber} rejected: ${rejectionReason}`;

        // Update claim status to rejected
        await prisma.warrantyClaim.update({
          where: { id: existingPickup.claimId },
          data: {
            currentStatus: "rejected",
            resolution: `Rejected: ${rejectionReason}`,
          },
        });
        break;

      case "accept":
        // Accept the pickup and move claim to active processing
        if (existingPickup.status !== "COMPLETED") {
          return errorResponse(
            "Only completed pickups can be accepted for claim processing",
            "INVALID_STATUS",
            400
          );
        }

        // Get workflow to determine next status
        const claim = await prisma.warrantyClaim.findUnique({
          where: { id: existingPickup.claimId },
          include: {
            workflow: {
              include: {
                steps: { orderBy: { stepOrder: "asc" } },
              },
            },
          },
        });

        if (claim) {
          // Find first processing step (not initial/received)
          const processingStep = claim.workflow?.steps.find(
            (s) => !["new", "received", "pending_review"].includes(s.statusName.toLowerCase())
          );

          await prisma.warrantyClaim.update({
            where: { id: existingPickup.claimId },
            data: {
              currentStatus: processingStep?.statusName || "in_progress",
              currentStepId: processingStep?.id || claim.currentStepId,
              receivedAt: new Date(),
            },
          });
        }

        historyAction = "claim_accepted";
        historyNotes = `Pickup ${existingPickup.pickupNumber} accepted - claim moved to processing`;
        // No pickup status change needed - stays COMPLETED
        break;

      default:
        return errorResponse(
          "Invalid action. Use: start_transit, complete, cancel, reject, accept",
          "INVALID_ACTION",
          400
        );
    }

    // Update pickup
    const pickup = await prisma.pickup.update({
      where: { id: pickupId },
      data: updateData,
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

    // Record in claim history
    if (existingPickup.claim) {
      await prisma.claimHistory.create({
        data: {
          claimId: existingPickup.claimId,
          fromStatus: existingPickup.claim.currentStatus,
          toStatus: existingPickup.claim.currentStatus,
          actionType: historyAction,
          performedBy: user.id,
          notes: historyNotes,
          metadata: {
            pickupId: existingPickup.id,
            pickupNumber: existingPickup.pickupNumber,
          },
        },
      });
    }

    return successResponse(pickup);
  } catch (error) {
    console.error("Error updating pickup status:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to update pickup status", "SERVER_ERROR", 500);
  }
}
