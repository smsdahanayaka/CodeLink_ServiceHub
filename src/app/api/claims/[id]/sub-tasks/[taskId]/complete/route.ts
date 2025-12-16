// ===========================================
// Complete Sub-Task API
// POST - Mark sub-task as completed
// ===========================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireAuth,
  successResponse,
  errorResponse,
  handleZodError,
} from "@/lib/api-utils";
import { completeSubTaskSchema } from "@/lib/validations";

// POST /api/claims/[id]/sub-tasks/[taskId]/complete - Complete sub-task
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const user = await requireAuth();
    const { id, taskId } = await params;
    const claimId = parseInt(id);
    const subTaskId = parseInt(taskId);

    if (isNaN(claimId) || isNaN(subTaskId)) {
      return errorResponse("Invalid claim ID or task ID", "INVALID_ID", 400);
    }

    // Check permission
    if (!user.permissions.includes("claims.edit") && !user.permissions.includes("claims.process")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    // Parse and validate request body
    const body = await request.json();
    const parseResult = completeSubTaskSchema.safeParse(body);
    if (!parseResult.success) {
      return handleZodError(parseResult.error);
    }

    const { notes } = parseResult.data;

    // Verify claim exists and belongs to tenant
    const claim = await prisma.warrantyClaim.findFirst({
      where: { id: claimId, tenantId: user.tenantId },
    });

    if (!claim) {
      return errorResponse("Claim not found", "NOT_FOUND", 404);
    }

    // Find sub-task
    const subTask = await prisma.claimSubTask.findFirst({
      where: { id: subTaskId, claimId },
    });

    if (!subTask) {
      return errorResponse("Sub-task not found", "NOT_FOUND", 404);
    }

    // Check if already completed
    if (subTask.status === "COMPLETED") {
      return errorResponse("Sub-task is already completed", "ALREADY_COMPLETED", 400);
    }

    // Check if cancelled
    if (subTask.status === "CANCELLED") {
      return errorResponse("Cannot complete a cancelled sub-task", "CANCELLED", 400);
    }

    // Only assigned user or admin can complete
    const canComplete =
      user.permissions.includes("claims.view_all") ||
      subTask.assignedTo === user.id ||
      subTask.createdBy === user.id;

    if (!canComplete) {
      return errorResponse(
        "Only the assigned user or task creator can complete this sub-task",
        "NOT_AUTHORIZED",
        403
      );
    }

    // Complete sub-task
    const updated = await prisma.$transaction(async (tx) => {
      const completed = await tx.claimSubTask.update({
        where: { id: subTaskId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          completedBy: user.id,
        },
        include: {
          workflowStep: { select: { id: true, name: true } },
          assignedUser: { select: { id: true, firstName: true, lastName: true } },
          createdByUser: { select: { id: true, firstName: true, lastName: true } },
          completedByUser: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      // Create history entry
      await tx.claimHistory.create({
        data: {
          claimId,
          workflowStepId: subTask.workflowStepId,
          actionType: "SUB_TASK_COMPLETED",
          toStatus: claim.currentStatus,
          performedBy: user.id,
          notes: notes || `Completed sub-task: "${subTask.title}"`,
          metadata: { subTaskId, title: subTask.title },
        },
      });

      return completed;
    });

    // Check if all sub-tasks for this step are now completed
    const pendingSubTasks = await prisma.claimSubTask.count({
      where: {
        claimId,
        workflowStepId: subTask.workflowStepId,
        status: { in: ["PENDING", "IN_PROGRESS"] },
      },
    });

    return successResponse({
      subTask: updated,
      allSubTasksCompleted: pendingSubTasks === 0,
      remainingSubTasks: pendingSubTasks,
    });
  } catch (error) {
    console.error("Error completing sub-task:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to complete sub-task", "SERVER_ERROR", 500);
  }
}
