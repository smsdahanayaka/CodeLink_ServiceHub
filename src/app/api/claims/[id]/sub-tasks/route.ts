// ===========================================
// Claim Sub-Tasks API
// GET - List sub-tasks for a claim
// POST - Create a new sub-task
// Supports sequential mode with activeOnly filter
// ===========================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireAuth,
  successResponse,
  errorResponse,
  handleZodError,
} from "@/lib/api-utils";
import { createSubTaskSchema } from "@/lib/validations";
import { getActiveSubTask, activateSubTask } from "@/lib/sub-task-utils";

// GET /api/claims/[id]/sub-tasks - List sub-tasks
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const stepIdParam = searchParams.get("stepId");
    const stepId = stepIdParam ? parseInt(stepIdParam) : undefined;
    const activeOnly = searchParams.get("activeOnly") === "true";
    const forUserIdParam = searchParams.get("forUserId");
    const forUserId = forUserIdParam ? parseInt(forUserIdParam) : undefined;

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

    // For activeOnly mode, check if user has active sub-task
    if (activeOnly && forUserId && !canViewAll) {
      // User can only see their own active sub-task
      if (forUserId !== user.id) {
        return errorResponse("Access denied", "FORBIDDEN", 403);
      }
    } else if (!canViewAll && !isAssigned) {
      return errorResponse("Access denied", "FORBIDDEN", 403);
    }

    // SEQUENTIAL MODE: Return only the active sub-task for a specific user
    if (activeOnly && forUserId && stepId) {
      const activeSubTask = await getActiveSubTask(claimId, stepId);

      // Check if the active sub-task belongs to the requested user
      if (activeSubTask && activeSubTask.assignedTo === forUserId) {
        const stats = {
          total: 1,
          pending: activeSubTask.status === "PENDING" ? 1 : 0,
          inProgress: activeSubTask.status === "IN_PROGRESS" ? 1 : 0,
          completed: 0,
          cancelled: 0,
        };

        return successResponse({
          claimId,
          stepId,
          subTasks: [activeSubTask],
          groupedByStep: null,
          stats,
          isActiveSubTask: true,
        });
      }

      // User doesn't have an active sub-task for this step
      return successResponse({
        claimId,
        stepId,
        subTasks: [],
        groupedByStep: null,
        stats: { total: 0, pending: 0, inProgress: 0, completed: 0, cancelled: 0 },
        isActiveSubTask: false,
      });
    }

    // STANDARD MODE: Fetch all sub-tasks
    const subTasks = await prisma.claimSubTask.findMany({
      where: {
        claimId,
        ...(stepId ? { workflowStepId: stepId } : {}),
      },
      include: {
        workflowStep: {
          select: { id: true, name: true, stepOrder: true },
        },
        assignedUser: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        createdByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
        completedByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: [{ workflowStep: { stepOrder: "asc" } }, { sortOrder: "asc" }, { createdAt: "asc" }],
    });

    // Group by step if no stepId filter
    const grouped = stepId
      ? null
      : subTasks.reduce((acc, task) => {
          const stepKey = task.workflowStepId.toString();
          if (!acc[stepKey]) {
            acc[stepKey] = {
              step: task.workflowStep,
              subTasks: [],
              stats: { total: 0, pending: 0, inProgress: 0, completed: 0, cancelled: 0 },
            };
          }
          acc[stepKey].subTasks.push(task);
          acc[stepKey].stats.total++;
          // Map status to the stats key
          const statusKey = task.status === "IN_PROGRESS"
            ? "inProgress"
            : task.status.toLowerCase() as "pending" | "completed" | "cancelled";
          acc[stepKey].stats[statusKey]++;
          return acc;
        }, {} as Record<string, { step: typeof subTasks[0]["workflowStep"]; subTasks: typeof subTasks; stats: { total: number; pending: number; inProgress: number; completed: number; cancelled: number } }>);

    // Calculate overall stats
    const stats = {
      total: subTasks.length,
      pending: subTasks.filter((t) => t.status === "PENDING").length,
      inProgress: subTasks.filter((t) => t.status === "IN_PROGRESS").length,
      completed: subTasks.filter((t) => t.status === "COMPLETED").length,
      cancelled: subTasks.filter((t) => t.status === "CANCELLED").length,
    };

    return successResponse({
      claimId,
      stepId: stepId || null,
      subTasks,
      groupedByStep: grouped ? Object.values(grouped) : null,
      stats,
    });
  } catch (error) {
    console.error("Error fetching sub-tasks:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch sub-tasks", "SERVER_ERROR", 500);
  }
}

// POST /api/claims/[id]/sub-tasks - Create sub-task
export async function POST(
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

    // Check permission
    if (!user.permissions.includes("claims.edit") && !user.permissions.includes("claims.process")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    // Parse and validate request body
    const body = await request.json();
    const parseResult = createSubTaskSchema.safeParse(body);
    if (!parseResult.success) {
      return handleZodError(parseResult.error);
    }

    const data = parseResult.data;

    // Verify claim exists and belongs to tenant
    const claim = await prisma.warrantyClaim.findFirst({
      where: { id: claimId, tenantId: user.tenantId },
      include: { workflow: { include: { steps: true } } },
    });

    if (!claim) {
      return errorResponse("Claim not found", "NOT_FOUND", 404);
    }

    // Verify the step belongs to the claim's workflow
    const validStep = claim.workflow?.steps.find((s) => s.id === data.workflowStepId);
    if (!validStep) {
      return errorResponse(
        "Step does not belong to the claim's workflow",
        "INVALID_STEP",
        400
      );
    }

    // Can only create sub-tasks for the current step
    if (claim.currentStepId !== data.workflowStepId) {
      return errorResponse(
        "Sub-tasks can only be created for the current workflow step",
        "NOT_CURRENT_STEP",
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

    // Get next sort order
    const lastTask = await prisma.claimSubTask.findFirst({
      where: { claimId, workflowStepId: data.workflowStepId },
      orderBy: { sortOrder: "desc" },
    });
    const sortOrder = (lastTask?.sortOrder ?? -1) + 1;

    // Create sub-task
    const subTask = await prisma.claimSubTask.create({
      data: {
        claimId,
        workflowStepId: data.workflowStepId,
        title: data.title,
        description: data.description,
        assignedTo: data.assignedTo,
        priority: data.priority,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        createdBy: user.id,
        sortOrder,
      },
      include: {
        workflowStep: { select: { id: true, name: true } },
        assignedUser: { select: { id: true, firstName: true, lastName: true } },
        createdByUser: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Create history entry
    await prisma.claimHistory.create({
      data: {
        claimId,
        workflowStepId: data.workflowStepId,
        actionType: "SUB_TASK_CREATED",
        toStatus: claim.currentStatus,
        performedBy: user.id,
        notes: `Created sub-task: "${data.title}"`,
        metadata: {
          subTaskId: subTask.id,
          title: data.title,
          assignedTo: data.assignedTo,
        },
      },
    });

    // SEQUENTIAL MODE: Auto-activate first sub-task
    // Check if this is the first (and only) sub-task for this step
    const existingSubTasksCount = await prisma.claimSubTask.count({
      where: {
        claimId,
        workflowStepId: data.workflowStepId,
      },
    });

    let activatedSubTask = subTask;
    if (existingSubTasksCount === 1) {
      // This is the first sub-task - auto-activate it
      activatedSubTask = await activateSubTask(
        subTask.id,
        user.tenantId,
        claimId,
        claim.claimNumber,
        user.id
      );
    } else {
      // Not the first sub-task - send notification only (task stays PENDING)
      if (data.assignedTo && data.assignedTo !== user.id) {
        const creatorName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
        await prisma.notification.create({
          data: {
            tenantId: user.tenantId,
            userId: data.assignedTo,
            type: "SUB_TASK_ASSIGNED",
            title: "New Task Assigned",
            message: `${creatorName} assigned you a sub-task: "${data.title}" for claim ${claim.claimNumber}. It will become active when previous tasks are completed.`,
            link: `/claims/${claimId}`,
            data: {
              claimId,
              claimNumber: claim.claimNumber,
              subTaskId: subTask.id,
              subTaskTitle: data.title,
              assignedBy: user.id,
              isQueued: true,
            },
          },
        });
      }
    }

    // Re-fetch with includes for response
    const result = await prisma.claimSubTask.findUnique({
      where: { id: subTask.id },
      include: {
        workflowStep: { select: { id: true, name: true } },
        assignedUser: { select: { id: true, firstName: true, lastName: true } },
        createdByUser: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return successResponse(result);
  } catch (error) {
    console.error("Error creating sub-task:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to create sub-task", "SERVER_ERROR", 500);
  }
}
