// ===========================================
// Claim Sub-Task by ID API
// GET - Get sub-task details
// PUT - Update sub-task
// DELETE - Delete sub-task
// ===========================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireAuth,
  successResponse,
  errorResponse,
  handleZodError,
} from "@/lib/api-utils";
import { updateSubTaskSchema } from "@/lib/validations";

// GET /api/claims/[id]/sub-tasks/[taskId] - Get sub-task details
export async function GET(
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

    // Verify claim exists and belongs to tenant
    const claim = await prisma.warrantyClaim.findFirst({
      where: { id: claimId, tenantId: user.tenantId },
    });

    if (!claim) {
      return errorResponse("Claim not found", "NOT_FOUND", 404);
    }

    // Check permission
    const canViewAll = user.permissions.includes("claims.view_all");
    const isAssigned = claim.assignedTo === user.id;
    if (!canViewAll && !isAssigned) {
      return errorResponse("Access denied", "FORBIDDEN", 403);
    }

    const subTask = await prisma.claimSubTask.findFirst({
      where: { id: subTaskId, claimId },
      include: {
        workflowStep: { select: { id: true, name: true, stepOrder: true } },
        assignedUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        createdByUser: { select: { id: true, firstName: true, lastName: true } },
        completedByUser: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!subTask) {
      return errorResponse("Sub-task not found", "NOT_FOUND", 404);
    }

    return successResponse(subTask);
  } catch (error) {
    console.error("Error fetching sub-task:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch sub-task", "SERVER_ERROR", 500);
  }
}

// PUT /api/claims/[id]/sub-tasks/[taskId] - Update sub-task
export async function PUT(
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
    const parseResult = updateSubTaskSchema.safeParse(body);
    if (!parseResult.success) {
      return handleZodError(parseResult.error);
    }

    const data = parseResult.data;

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

    // Cannot modify completed sub-tasks (except to cancel)
    if (subTask.status === "COMPLETED" && data.status !== "CANCELLED") {
      return errorResponse(
        "Cannot modify a completed sub-task",
        "ALREADY_COMPLETED",
        400
      );
    }

    // Validate assignee if provided
    if (data.assignedTo) {
      const assignee = await prisma.user.findFirst({
        where: { id: data.assignedTo, tenantId: user.tenantId, status: "ACTIVE" },
      });
      if (!assignee) {
        return errorResponse("Assignee not found or inactive", "INVALID_USER", 400);
      }
    }

    // Update sub-task
    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.assignedTo !== undefined) updateData.assignedTo = data.assignedTo;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    }
    if (data.status !== undefined) {
      updateData.status = data.status;
      if (data.status === "COMPLETED") {
        updateData.completedAt = new Date();
        updateData.completedBy = user.id;
      } else if (subTask.status === "COMPLETED") {
        // Un-completing (should only happen with cancel)
        updateData.completedAt = null;
        updateData.completedBy = null;
      }
    }

    const updated = await prisma.claimSubTask.update({
      where: { id: subTaskId },
      data: updateData,
      include: {
        workflowStep: { select: { id: true, name: true } },
        assignedUser: { select: { id: true, firstName: true, lastName: true } },
        createdByUser: { select: { id: true, firstName: true, lastName: true } },
        completedByUser: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return successResponse(updated);
  } catch (error) {
    console.error("Error updating sub-task:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to update sub-task", "SERVER_ERROR", 500);
  }
}

// DELETE /api/claims/[id]/sub-tasks/[taskId] - Delete sub-task
export async function DELETE(
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

    // Cannot delete completed sub-tasks
    if (subTask.status === "COMPLETED") {
      return errorResponse(
        "Cannot delete a completed sub-task. Cancel it instead.",
        "ALREADY_COMPLETED",
        400
      );
    }

    // Delete sub-task
    await prisma.$transaction(async (tx) => {
      await tx.claimSubTask.delete({ where: { id: subTaskId } });

      // Create history entry
      await tx.claimHistory.create({
        data: {
          claimId,
          workflowStepId: subTask.workflowStepId,
          actionType: "SUB_TASK_DELETED",
          toStatus: claim.currentStatus,
          performedBy: user.id,
          notes: `Deleted sub-task: "${subTask.title}"`,
          metadata: { subTaskId, title: subTask.title },
        },
      });
    });

    return successResponse({ message: "Sub-task deleted successfully" });
  } catch (error) {
    console.error("Error deleting sub-task:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to delete sub-task", "SERVER_ERROR", 500);
  }
}
