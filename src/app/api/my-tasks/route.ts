// ===========================================
// My Tasks API - Get claims assigned to current user
// Includes: claim assignments + ACTIVE sub-task assignments + step assignments
// Sequential mode: Only shows claims where user has the ACTIVE sub-task
// ===========================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  requireAuth,
  parsePaginationParams,
  calculatePaginationMeta,
} from "@/lib/api-utils";
import {
  checkUserHasActiveSubTask,
  checkStepAssigneeReady,
} from "@/lib/sub-task-utils";

// GET /api/my-tasks - Get claims assigned to current user
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const { page, limit, sortBy, sortOrder, skip } = parsePaginationParams(searchParams);

    // Filters
    const priority = searchParams.get("priority");
    const excludeResolved = searchParams.get("excludeResolved") === "true";
    const onlyResolved = searchParams.get("onlyResolved") === "true";

    // Build where clause - claims assigned to current user OR with sub-tasks/step assignments
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseConditions: any = {
      tenantId: user.tenantId,
    };

    // User can see claims if:
    // 1. Claim is directly assigned to them
    // 2. They have pending sub-tasks assigned to them (status not COMPLETED or CANCELLED)
    // 3. They have active step assignments
    const assignmentConditions = {
      OR: [
        { assignedTo: user.id },
        {
          subTasks: {
            some: {
              assignedTo: user.id,
              status: { in: ["PENDING", "IN_PROGRESS"] },
            },
          },
        },
        {
          stepAssignments: {
            some: {
              assignedUserId: user.id,
              isActive: true,
            },
          },
        },
      ],
    };

    const where = {
      ...baseConditions,
      ...assignmentConditions,
    };

    // Priority filter
    if (priority) {
      where.priority = priority;
    }

    // Resolved filter
    if (excludeResolved) {
      where.resolvedAt = null;
    }
    if (onlyResolved) {
      where.resolvedAt = { not: null };
    }

    // Get total count
    const total = await prisma.warrantyClaim.count({ where });

    // Get claims with pagination
    const rawClaims = await prisma.warrantyClaim.findMany({
      where,
      include: {
        warrantyCard: {
          select: {
            id: true,
            cardNumber: true,
            serialNumber: true,
            product: {
              select: { id: true, name: true, modelNumber: true },
            },
            customer: {
              select: { id: true, name: true, phone: true },
            },
            shop: {
              select: { id: true, name: true, code: true },
            },
          },
        },
        workflow: {
          select: { id: true, name: true },
        },
        currentStep: {
          select: {
            id: true,
            name: true,
            statusName: true,
            stepType: true,
            slaHours: true,
            slaWarningHours: true,
            canSkip: true,
          },
        },
        assignedUser: {
          select: { id: true, firstName: true, lastName: true },
        },
        // Include user's pending sub-tasks for context
        subTasks: {
          where: {
            assignedTo: user.id,
            status: { in: ["PENDING", "IN_PROGRESS"] },
          },
          select: {
            id: true,
            title: true,
            status: true,
            dueDate: true,
            sortOrder: true,
          },
          orderBy: { sortOrder: "asc" },
          take: 1, // Only get the first one (potential active task)
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    });

    // SEQUENTIAL FILTERING: Only include claims where user has ACTIVE sub-task
    // or is step assignee ready to complete, or is claim assignee
    const claims = [];
    for (const claim of rawClaims) {
      let taskType: "ASSIGNED" | "ACTIVE_SUBTASK" | "STEP_COMPLETION" = "ASSIGNED";

      // Check if user is claim assignee
      const isClaimAssignee = claim.assignedTo === user.id;

      // Check if user has the active sub-task for this claim's current step
      const hasActiveSubTask = claim.currentStepId
        ? await checkUserHasActiveSubTask(user.id, claim.id, claim.currentStepId)
        : false;

      // Check if user is step assignee and all sub-tasks are done
      const isStepAssigneeReady = claim.currentStepId
        ? await checkStepAssigneeReady(user.id, claim.id, claim.currentStepId)
        : false;

      // Determine task type and whether to include
      if (hasActiveSubTask) {
        taskType = "ACTIVE_SUBTASK";
      } else if (isStepAssigneeReady) {
        taskType = "STEP_COMPLETION";
      } else if (isClaimAssignee) {
        taskType = "ASSIGNED";
      } else {
        // User has a sub-task but it's not the active one - skip this claim
        continue;
      }

      // Get step status from ClaimStepAssignment
      let stepStatus = null;
      if (claim.currentStepId) {
        const stepAssignment = await prisma.claimStepAssignment.findUnique({
          where: {
            claimId_workflowStepId: {
              claimId: claim.id,
              workflowStepId: claim.currentStepId,
            },
          },
          select: {
            stepStatus: true,
            stepStartedAt: true,
          },
        });
        stepStatus = stepAssignment?.stepStatus || null;
      }

      claims.push({
        ...claim,
        taskType,
        stepStatus,
        // Include the active sub-task info if applicable
        activeSubTask: hasActiveSubTask && claim.subTasks.length > 0 ? claim.subTasks[0] : null,
      });
    }

    // Calculate stats - include all assignment types
    const now = new Date();
    let slaWarning = 0;
    let slaBreach = 0;

    // Get all pending claims for stats calculation (same OR logic)
    const allPendingClaims = await prisma.warrantyClaim.findMany({
      where: {
        tenantId: user.tenantId,
        resolvedAt: null,
        OR: [
          { assignedTo: user.id },
          {
            subTasks: {
              some: {
                assignedTo: user.id,
                status: { in: ["PENDING", "IN_PROGRESS"] },
              },
            },
          },
          {
            stepAssignments: {
              some: {
                assignedUserId: user.id,
                isActive: true,
              },
            },
          },
        ],
      },
      include: {
        currentStep: {
          select: {
            slaHours: true,
            slaWarningHours: true,
          },
        },
      },
    });

    for (const claim of allPendingClaims) {
      if (claim.currentStep?.slaHours && claim.currentStepStartedAt) {
        const stepStartTime = new Date(claim.currentStepStartedAt);
        const slaDeadline = new Date(stepStartTime.getTime() + claim.currentStep.slaHours * 60 * 60 * 1000);
        const hoursRemaining = (slaDeadline.getTime() - now.getTime()) / (1000 * 60 * 60);
        const warningHours = claim.currentStep.slaWarningHours || claim.currentStep.slaHours * 0.2;

        if (hoursRemaining <= 0) {
          slaBreach++;
        } else if (hoursRemaining <= warningHours) {
          slaWarning++;
        }
      }
    }

    // Get completed today count
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const completedToday = await prisma.warrantyClaim.count({
      where: {
        tenantId: user.tenantId,
        resolvedAt: { gte: startOfDay },
        OR: [
          { assignedTo: user.id },
          {
            subTasks: {
              some: {
                assignedTo: user.id,
              },
            },
          },
        ],
      },
    });

    // Count pending sub-tasks separately for additional context
    const pendingSubTasks = await prisma.claimSubTask.count({
      where: {
        assignedTo: user.id,
        status: { in: ["PENDING", "IN_PROGRESS"] },
        claim: {
          tenantId: user.tenantId,
          resolvedAt: null,
        },
      },
    });

    // Build stats object
    const stats = {
      total: allPendingClaims.length,
      pending: allPendingClaims.length,
      pendingSubTasks,
      slaWarning,
      slaBreach,
      completedToday,
    };

    return successResponse(claims, calculatePaginationMeta(total, page, limit), { stats });
  } catch (error) {
    console.error("Error fetching my tasks:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch tasks", "SERVER_ERROR", 500);
  }
}
