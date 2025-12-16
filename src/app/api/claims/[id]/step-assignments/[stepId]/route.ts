// ===========================================
// Claim Step Assignment by Step ID API
// DELETE - Remove step assignment
// ===========================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireAuth,
  successResponse,
  errorResponse,
} from "@/lib/api-utils";

// DELETE /api/claims/[id]/step-assignments/[stepId] - Remove step assignment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  try {
    const user = await requireAuth();
    const { id, stepId } = await params;
    const claimId = parseInt(id);
    const workflowStepId = parseInt(stepId);

    if (isNaN(claimId) || isNaN(workflowStepId)) {
      return errorResponse("Invalid claim ID or step ID", "INVALID_ID", 400);
    }

    // Check permission
    if (!user.permissions.includes("claims.assign")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    // Verify claim exists and belongs to tenant
    const claim = await prisma.warrantyClaim.findFirst({
      where: { id: claimId, tenantId: user.tenantId },
    });

    if (!claim) {
      return errorResponse("Claim not found", "NOT_FOUND", 404);
    }

    // Find and delete the assignment
    const assignment = await prisma.claimStepAssignment.findUnique({
      where: {
        claimId_workflowStepId: { claimId, workflowStepId },
      },
      include: {
        workflowStep: { select: { name: true } },
        assignedUser: { select: { firstName: true, lastName: true } },
      },
    });

    if (!assignment) {
      return errorResponse("Step assignment not found", "NOT_FOUND", 404);
    }

    // Delete the assignment
    await prisma.$transaction(async (tx) => {
      await tx.claimStepAssignment.delete({
        where: {
          claimId_workflowStepId: { claimId, workflowStepId },
        },
      });

      // Create history entry
      await tx.claimHistory.create({
        data: {
          claimId,
          actionType: "STEP_ASSIGNMENT_REMOVED",
          toStatus: claim.currentStatus,
          performedBy: user.id,
          notes: `Removed step assignment for "${assignment.workflowStep.name}"`,
          metadata: {
            stepId: workflowStepId,
            previousAssignee: {
              id: assignment.assignedUserId,
              name: `${assignment.assignedUser.firstName} ${assignment.assignedUser.lastName}`,
            },
          },
        },
      });
    });

    return successResponse({
      message: "Step assignment removed successfully",
      removedStepId: workflowStepId,
    });
  } catch (error) {
    console.error("Error removing step assignment:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to remove step assignment", "SERVER_ERROR", 500);
  }
}
