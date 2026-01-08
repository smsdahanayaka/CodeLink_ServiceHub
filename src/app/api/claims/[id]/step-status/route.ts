// ===========================================
// Step Status API - Update current step status
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

// Valid step statuses (excluding COMPLETED which is set by system)
const VALID_STEP_STATUSES = [
  "NOT_STARTED",
  "STARTED",
  "IN_PROGRESS",
  "WAITING_FOR_PARTS",
  "WAITING_FOR_APPROVAL",
  "ON_HOLD",
] as const;

type StepStatusInput = (typeof VALID_STEP_STATUSES)[number];

// PATCH /api/claims/[id]/step-status - Update step status
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const claimId = parseInt(id);

    if (isNaN(claimId)) {
      return errorResponse("Invalid claim ID", "INVALID_ID", 400);
    }

    const body = await request.json();
    const { stepStatus, notes } = body;

    // Validate step status
    if (!stepStatus || !VALID_STEP_STATUSES.includes(stepStatus as StepStatusInput)) {
      return errorResponse(
        `Invalid step status. Must be one of: ${VALID_STEP_STATUSES.join(", ")}`,
        "INVALID_STATUS",
        400
      );
    }

    // Get the claim with current step
    const claim = await prisma.warrantyClaim.findFirst({
      where: {
        id: claimId,
        tenantId: user.tenantId,
      },
      select: {
        id: true,
        claimNumber: true,
        currentStepId: true,
        currentStatus: true,
      },
    });

    if (!claim) {
      return errorResponse("Claim not found", "NOT_FOUND", 404);
    }

    if (!claim.currentStepId) {
      return errorResponse("Claim has no active workflow step", "NO_ACTIVE_STEP", 400);
    }

    // Check if user is the step assignee
    const stepAssignment = await prisma.claimStepAssignment.findUnique({
      where: {
        claimId_workflowStepId: {
          claimId: claim.id,
          workflowStepId: claim.currentStepId,
        },
      },
      select: {
        id: true,
        assignedUserId: true,
        stepStatus: true,
        stepStartedAt: true,
      },
    });

    if (!stepAssignment) {
      return errorResponse("No step assignment found", "NO_ASSIGNMENT", 400);
    }

    // Only the assigned user can update their step status
    const canUpdateAll = user.permissions.includes("claims.view_all");
    if (stepAssignment.assignedUserId !== user.id && !canUpdateAll) {
      return errorResponse(
        "Only the assigned user can update step status",
        "FORBIDDEN",
        403
      );
    }

    // Don't allow changing status if already COMPLETED
    if (stepAssignment.stepStatus === "COMPLETED") {
      return errorResponse(
        "Cannot change status of a completed step",
        "STEP_COMPLETED",
        400
      );
    }

    // Build update data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      stepStatus,
      updatedAt: new Date(),
    };

    // Set stepStartedAt on first status change from NOT_STARTED
    if (stepAssignment.stepStatus === "NOT_STARTED" && stepStatus !== "NOT_STARTED") {
      updateData.stepStartedAt = new Date();
    }

    // Update step assignment
    const updatedAssignment = await prisma.claimStepAssignment.update({
      where: { id: stepAssignment.id },
      data: updateData,
      include: {
        assignedUser: {
          select: { id: true, firstName: true, lastName: true },
        },
        workflowStep: {
          select: { id: true, name: true, statusName: true },
        },
      },
    });

    // Create history entry
    await prisma.claimHistory.create({
      data: {
        claimId,
        workflowStepId: claim.currentStepId,
        fromStatus: claim.currentStatus,
        toStatus: claim.currentStatus, // Status doesn't change, only step status
        actionType: "STEP_STATUS_CHANGED",
        performedBy: user.id,
        notes: notes || `Step status changed to ${stepStatus}`,
        metadata: {
          previousStepStatus: stepAssignment.stepStatus,
          newStepStatus: stepStatus,
        },
      },
    });

    return successResponse({
      stepAssignment: updatedAssignment,
      message: `Step status updated to ${stepStatus}`,
    });
  } catch (error) {
    console.error("Error updating step status:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to update step status", "SERVER_ERROR", 500);
  }
}

// GET /api/claims/[id]/step-status - Get current step status
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const claimId = parseInt(id);

    if (isNaN(claimId)) {
      return errorResponse("Invalid claim ID", "INVALID_ID", 400);
    }

    // Get the claim with current step
    const claim = await prisma.warrantyClaim.findFirst({
      where: {
        id: claimId,
        tenantId: user.tenantId,
      },
      select: {
        id: true,
        claimNumber: true,
        currentStepId: true,
        currentStatus: true,
      },
    });

    if (!claim) {
      return errorResponse("Claim not found", "NOT_FOUND", 404);
    }

    if (!claim.currentStepId) {
      return successResponse({
        stepAssignment: null,
        message: "Claim has no active workflow step",
      });
    }

    // Get step assignment
    const stepAssignment = await prisma.claimStepAssignment.findUnique({
      where: {
        claimId_workflowStepId: {
          claimId: claim.id,
          workflowStepId: claim.currentStepId,
        },
      },
      include: {
        assignedUser: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        workflowStep: {
          select: { id: true, name: true, statusName: true, stepType: true },
        },
      },
    });

    return successResponse({
      stepAssignment,
      isCurrentUserAssigned: stepAssignment?.assignedUserId === user.id,
    });
  } catch (error) {
    console.error("Error fetching step status:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch step status", "SERVER_ERROR", 500);
  }
}
