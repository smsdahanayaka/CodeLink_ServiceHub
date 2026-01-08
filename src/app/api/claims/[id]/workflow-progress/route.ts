// ===========================================
// Workflow Progress API - Get claim workflow progress with steps and sub-tasks
// ===========================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse, requireAuth } from "@/lib/api-utils";

// GET /api/claims/[id]/workflow-progress
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const claimId = parseInt(id);

    if (isNaN(claimId)) {
      return errorResponse("Invalid claim ID", "INVALID_ID", 400);
    }

    // Get the claim with workflow info
    const claim = await prisma.warrantyClaim.findUnique({
      where: {
        id: claimId,
        tenantId: user.tenantId,
      },
      select: {
        id: true,
        workflowId: true,
        currentStepId: true,
        workflow: {
          select: {
            id: true,
            name: true,
            steps: {
              select: {
                id: true,
                name: true,
                statusName: true,
                stepType: true,
                stepOrder: true,
                description: true,
              },
              orderBy: { stepOrder: "asc" },
            },
          },
        },
      },
    });

    if (!claim) {
      return errorResponse("Claim not found", "NOT_FOUND", 404);
    }

    if (!claim.workflow) {
      return successResponse({ steps: [], workflow: null });
    }

    // Get all step assignments for this claim
    const stepAssignments = await prisma.claimStepAssignment.findMany({
      where: { claimId },
      select: {
        workflowStepId: true,
        assignedUserId: true,
        assignedUser: {
          select: { id: true, firstName: true, lastName: true },
        },
        stepStatus: true,
        stepStartedAt: true,
        stepCompletedAt: true,
        isActive: true,
      },
    });

    // Create a map of step assignments
    const assignmentMap = new Map(
      stepAssignments.map((a) => [a.workflowStepId, a])
    );

    // Get all sub-tasks for this claim grouped by step
    const subTasks = await prisma.claimSubTask.findMany({
      where: { claimId },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        completedAt: true,
        workflowStepId: true,
        assignedUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    // Create a map of sub-tasks by step
    const subTasksByStep = new Map<number, typeof subTasks>();
    for (const task of subTasks) {
      if (!subTasksByStep.has(task.workflowStepId)) {
        subTasksByStep.set(task.workflowStepId, []);
      }
      subTasksByStep.get(task.workflowStepId)!.push(task);
    }

    // Get claim history to determine completed steps
    const completedStepHistory = await prisma.claimHistory.findMany({
      where: {
        claimId,
        actionType: "STEP_COMPLETED",
      },
      select: {
        fromStatus: true,
        toStatus: true,
      },
    });

    // Find the current step's index to determine which steps are completed
    const currentStepIndex = claim.workflow.steps.findIndex(
      (s) => s.id === claim.currentStepId
    );

    // Build the steps with status info
    const steps = claim.workflow.steps.map((step, index) => {
      const assignment = assignmentMap.get(step.id);
      const stepSubTasks = subTasksByStep.get(step.id) || [];

      // Determine if step is completed
      // A step is completed if:
      // 1. It's before the current step (workflow has progressed past it), OR
      // 2. It has a completed status in assignment
      // Note: START step is only completed when we've moved past it
      const isCompleted =
        (currentStepIndex > -1 && index < currentStepIndex) ||
        assignment?.stepStatus === "COMPLETED";

      const isCurrent = step.id === claim.currentStepId;

      return {
        id: step.id,
        name: step.name,
        statusName: step.statusName,
        stepType: step.stepType,
        stepOrder: step.stepOrder,
        description: step.description,
        isCompleted,
        isCurrent,
        assignment: assignment
          ? {
              assignedUser: assignment.assignedUser,
              stepStatus: assignment.stepStatus,
              stepStartedAt: assignment.stepStartedAt?.toISOString() || null,
              stepCompletedAt: assignment.stepCompletedAt?.toISOString() || null,
            }
          : null,
        subTasks: stepSubTasks.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate?.toISOString() || null,
          completedAt: t.completedAt?.toISOString() || null,
          assignedUser: t.assignedUser,
        })),
      };
    });

    return successResponse({
      workflow: {
        id: claim.workflow.id,
        name: claim.workflow.name,
      },
      currentStepId: claim.currentStepId,
      steps,
    });
  } catch (error) {
    console.error("Error fetching workflow progress:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch workflow progress", "SERVER_ERROR", 500);
  }
}
