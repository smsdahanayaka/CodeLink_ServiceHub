// ===========================================
// Claim Status Update API
// ===========================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  requireAuth,
} from "@/lib/api-utils";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/claims/[id]/status - Update claim status
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();

    // Check permission
    if (!user.permissions.includes("claims.process")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const { id } = await params;
    const claimId = parseInt(id);

    if (isNaN(claimId)) {
      return errorResponse("Invalid claim ID", "INVALID_ID", 400);
    }

    // Check if claim exists
    const existingClaim = await prisma.warrantyClaim.findFirst({
      where: { id: claimId, tenantId: user.tenantId },
    });

    if (!existingClaim) {
      return errorResponse("Claim not found", "NOT_FOUND", 404);
    }

    const body = await request.json();
    const { status, location, notes, diagnosis, resolution, partsUsed, repairCost } = body;

    if (!status) {
      return errorResponse("Status is required", "STATUS_REQUIRED", 400);
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      currentStatus: status,
    };

    if (location) updateData.currentLocation = location;
    if (diagnosis !== undefined) updateData.diagnosis = diagnosis || null;
    if (resolution !== undefined) updateData.resolution = resolution || null;
    if (partsUsed !== undefined) updateData.partsUsed = partsUsed || null;
    if (repairCost !== undefined) updateData.repairCost = repairCost || 0;

    // Check if this is a closing status
    const closingStatuses = ["resolved", "closed", "completed", "rejected", "cancelled"];
    if (closingStatuses.includes(status.toLowerCase())) {
      updateData.resolvedAt = new Date();
    }

    // Check if this is a received status
    if (status.toLowerCase() === "received" || status.toLowerCase() === "in_service") {
      updateData.receivedAt = new Date();
    }

    // Update claim
    const updatedClaim = await prisma.warrantyClaim.update({
      where: { id: claimId },
      data: updateData,
      include: {
        warrantyCard: {
          select: {
            id: true,
            cardNumber: true,
            product: { select: { id: true, name: true } },
            customer: { select: { id: true, name: true, phone: true } },
          },
        },
        assignedUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Create history entry
    await prisma.claimHistory.create({
      data: {
        claimId,
        fromStatus: existingClaim.currentStatus,
        toStatus: status,
        fromLocation: existingClaim.currentLocation,
        toLocation: location || existingClaim.currentLocation,
        actionType: "STATUS_CHANGED",
        performedBy: user.id,
        notes: notes || `Status changed from ${existingClaim.currentStatus} to ${status}`,
      },
    });

    return successResponse(updatedClaim);
  } catch (error) {
    console.error("Error updating claim status:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to update claim status", "SERVER_ERROR", 500);
  }
}
