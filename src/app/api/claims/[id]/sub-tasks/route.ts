// ===========================================
// Claim Sub-Tasks API
// GET - List sub-tasks for a claim
// POST - Create a new sub-task
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

    // Get optional stepId filter
    const { searchParams } = new URL(request.url);
    const stepIdParam = searchParams.get("stepId");
    const stepId = stepIdParam ? parseInt(stepIdParam) : undefined;

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

    // Fetch sub-tasks
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

    return successResponse(subTask);
  } catch (error) {
    console.error("Error creating sub-task:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to create sub-task", "SERVER_ERROR", 500);
  }
}
