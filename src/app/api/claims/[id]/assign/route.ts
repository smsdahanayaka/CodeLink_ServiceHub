// ===========================================
// Claim Assignment API
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

// POST /api/claims/[id]/assign - Assign claim to user
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();

    // Check permission
    if (!user.permissions.includes("claims.assign")) {
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
      include: {
        assignedUser: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!existingClaim) {
      return errorResponse("Claim not found", "NOT_FOUND", 404);
    }

    const body = await request.json();
    const { userId, notes } = body;

    // Validate user if provided
    let assignedUser = null;
    if (userId) {
      assignedUser = await prisma.user.findFirst({
        where: { id: userId, tenantId: user.tenantId, status: "ACTIVE" },
        select: { id: true, firstName: true, lastName: true },
      });

      if (!assignedUser) {
        return errorResponse("User not found or inactive", "USER_NOT_FOUND", 400);
      }
    }

    // Update claim
    const updatedClaim = await prisma.warrantyClaim.update({
      where: { id: claimId },
      data: {
        assignedTo: userId || null,
      },
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
    const previousAssignee = existingClaim.assignedUser
      ? `${existingClaim.assignedUser.firstName} ${existingClaim.assignedUser.lastName}`
      : "Unassigned";
    const newAssignee = assignedUser
      ? `${assignedUser.firstName} ${assignedUser.lastName}`
      : "Unassigned";

    await prisma.claimHistory.create({
      data: {
        claimId,
        fromStatus: existingClaim.currentStatus,
        toStatus: existingClaim.currentStatus,
        actionType: "CLAIM_ASSIGNED",
        performedBy: user.id,
        notes: notes || `Claim reassigned from ${previousAssignee} to ${newAssignee}`,
        metadata: {
          previousAssigneeId: existingClaim.assignedTo,
          newAssigneeId: userId || null,
        },
      },
    });

    return successResponse(updatedClaim);
  } catch (error) {
    console.error("Error assigning claim:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to assign claim", "SERVER_ERROR", 500);
  }
}
