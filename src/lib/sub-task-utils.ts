// ===========================================
// Sub-Task Sequential Workflow Utilities
// Helpers for managing sequential sub-task execution
// ===========================================

import { prisma } from "@/lib/prisma";

/**
 * Get the active sub-task for a claim's workflow step
 * Active = first PENDING or IN_PROGRESS sub-task by sortOrder
 */
export async function getActiveSubTask(claimId: number, workflowStepId: number) {
  return prisma.claimSubTask.findFirst({
    where: {
      claimId,
      workflowStepId,
      status: { in: ["PENDING", "IN_PROGRESS"] },
    },
    orderBy: { sortOrder: "asc" },
    include: {
      assignedUser: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      workflowStep: {
        select: { id: true, name: true },
      },
    },
  });
}

/**
 * Get the next sub-task after the current one (by sortOrder)
 */
export async function getNextSubTask(
  claimId: number,
  workflowStepId: number,
  currentSortOrder: number
) {
  return prisma.claimSubTask.findFirst({
    where: {
      claimId,
      workflowStepId,
      sortOrder: { gt: currentSortOrder },
      status: { in: ["PENDING", "IN_PROGRESS"] },
    },
    orderBy: { sortOrder: "asc" },
    include: {
      assignedUser: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  });
}

/**
 * Check if all sub-tasks for a workflow step are completed
 */
export async function areAllSubTasksCompleted(
  claimId: number,
  workflowStepId: number
): Promise<boolean> {
  const pendingCount = await prisma.claimSubTask.count({
    where: {
      claimId,
      workflowStepId,
      status: { in: ["PENDING", "IN_PROGRESS"] },
    },
  });
  return pendingCount === 0;
}

/**
 * Get total sub-task count for a step
 */
export async function getSubTaskCount(
  claimId: number,
  workflowStepId: number
): Promise<number> {
  return prisma.claimSubTask.count({
    where: {
      claimId,
      workflowStepId,
      status: { not: "CANCELLED" },
    },
  });
}

/**
 * Get the step assignee for a claim step
 */
export async function getStepAssignee(claimId: number, workflowStepId: number) {
  const assignment = await prisma.claimStepAssignment.findUnique({
    where: {
      claimId_workflowStepId: { claimId, workflowStepId },
    },
    include: {
      assignedUser: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  });
  return assignment?.assignedUser || null;
}

/**
 * Check if a user has the currently active sub-task for a claim step
 */
export async function checkUserHasActiveSubTask(
  userId: number,
  claimId: number,
  currentStepId: number | null
): Promise<boolean> {
  if (!currentStepId) return false;

  const activeSubTask = await getActiveSubTask(claimId, currentStepId);
  return activeSubTask?.assignedTo === userId;
}

/**
 * Check if user is step assignee and all sub-tasks are done
 */
export async function checkStepAssigneeReady(
  userId: number,
  claimId: number,
  currentStepId: number | null
): Promise<boolean> {
  if (!currentStepId) return false;

  const assignment = await prisma.claimStepAssignment.findUnique({
    where: {
      claimId_workflowStepId: { claimId, workflowStepId: currentStepId },
    },
    select: { assignedUserId: true },
  });

  if (assignment?.assignedUserId !== userId) return false;

  // Check if there are any sub-tasks and if all are done
  const totalSubTasks = await getSubTaskCount(claimId, currentStepId);
  if (totalSubTasks === 0) return false; // No sub-tasks, use regular flow

  return await areAllSubTasksCompleted(claimId, currentStepId);
}

/**
 * Send notification to a user about sub-task activation
 */
export async function notifySubTaskActivation(
  tenantId: number,
  userId: number,
  claimId: number,
  claimNumber: string,
  subTaskTitle: string,
  subTaskId: number
) {
  await prisma.notification.create({
    data: {
      tenantId,
      userId,
      type: "SUB_TASK_ACTIVATED",
      title: "Your Task is Now Active",
      message: `The task "${subTaskTitle}" for claim ${claimNumber} is now ready for you to work on.`,
      link: `/claims/${claimId}`,
      data: {
        claimId,
        claimNumber,
        subTaskId,
        subTaskTitle,
      },
    },
  });
}

/**
 * Notify step assignee that all sub-tasks are complete
 */
export async function notifyStepReadyForCompletion(
  tenantId: number,
  userId: number,
  claimId: number,
  claimNumber: string,
  stepName: string
) {
  await prisma.notification.create({
    data: {
      tenantId,
      userId,
      type: "STEP_READY_FOR_COMPLETION",
      title: "Step Ready for Completion",
      message: `All tasks for "${stepName}" on claim ${claimNumber} are complete. You can now advance the workflow.`,
      link: `/claims/${claimId}`,
      data: {
        claimId,
        claimNumber,
        stepName,
      },
    },
  });
}

/**
 * Activate a sub-task (set to IN_PROGRESS) and notify assignee
 */
export async function activateSubTask(
  subTaskId: number,
  tenantId: number,
  claimId: number,
  claimNumber: string,
  triggeredByUserId?: number
) {
  const subTask = await prisma.claimSubTask.update({
    where: { id: subTaskId },
    data: { status: "IN_PROGRESS" },
    include: {
      workflowStep: { select: { id: true, name: true } },
      assignedUser: { select: { id: true, firstName: true, lastName: true } },
      createdByUser: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  // Notify assignee if different from the user who triggered this
  if (subTask.assignedTo && subTask.assignedTo !== triggeredByUserId) {
    await notifySubTaskActivation(
      tenantId,
      subTask.assignedTo,
      claimId,
      claimNumber,
      subTask.title,
      subTask.id
    );
  }

  return subTask;
}
