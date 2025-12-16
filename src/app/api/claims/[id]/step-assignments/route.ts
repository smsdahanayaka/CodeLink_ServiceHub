// ===========================================
// Claim Step Assignments API
// GET - List step assignments for a claim
// POST - Bulk upsert step assignments
// ===========================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireAuth,
  successResponse,
  errorResponse,
  handleZodError,
} from "@/lib/api-utils";
import { bulkStepAssignmentSchema } from "@/lib/validations";

// GET /api/claims/[id]/step-assignments - List step assignments
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

    // Verify claim exists and belongs to tenant
    const claim = await prisma.warrantyClaim.findFirst({
      where: { id: claimId, tenantId: user.tenantId },
      include: {
        workflow: {
          include: {
            steps: {
              orderBy: { stepOrder: "asc" },
              select: {
                id: true,
                name: true,
                stepOrder: true,
                stepType: true,
                autoAssignTo: true,
                autoAssignUser: {
                  select: { id: true, firstName: true, lastName: true },
                },
              },
            },
          },
        },
      },
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

    // Get step assignments for this claim
    const assignments = await prisma.claimStepAssignment.findMany({
      where: { claimId, isActive: true },
      include: {
        workflowStep: {
          select: { id: true, name: true, stepOrder: true, stepType: true },
        },
        assignedUser: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        assignedByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { workflowStep: { stepOrder: "asc" } },
    });

    // Combine with workflow steps to show all steps with their assignments
    const stepsWithAssignments = claim.workflow?.steps.map((step) => {
      const assignment = assignments.find((a) => a.workflowStepId === step.id);
      return {
        stepId: step.id,
        stepName: step.name,
        stepOrder: step.stepOrder,
        stepType: step.stepType,
        defaultAssignee: step.autoAssignUser,
        claimAssignment: assignment
          ? {
              id: assignment.id,
              assignedUser: assignment.assignedUser,
              assignedBy: assignment.assignedByUser,
              notes: assignment.notes,
              createdAt: assignment.createdAt,
            }
          : null,
        effectiveAssignee: assignment?.assignedUser || step.autoAssignUser || null,
      };
    }) || [];

    return successResponse({
      claimId,
      workflowId: claim.workflowId,
      assignments,
      stepsWithAssignments,
    });
  } catch (error) {
    console.error("Error fetching step assignments:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch step assignments", "SERVER_ERROR", 500);
  }
}

// POST /api/claims/[id]/step-assignments - Bulk upsert step assignments
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
    if (!user.permissions.includes("claims.assign")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    // Parse and validate request body
    const body = await request.json();
    const parseResult = bulkStepAssignmentSchema.safeParse(body);
    if (!parseResult.success) {
      return handleZodError(parseResult.error);
    }

    const { assignments } = parseResult.data;

    // Verify claim exists and belongs to tenant
    const claim = await prisma.warrantyClaim.findFirst({
      where: { id: claimId, tenantId: user.tenantId },
      include: { workflow: { include: { steps: true } } },
    });

    if (!claim) {
      return errorResponse("Claim not found", "NOT_FOUND", 404);
    }

    if (!claim.workflowId) {
      return errorResponse(
        "Claim has no workflow assigned",
        "NO_WORKFLOW",
        400
      );
    }

    // Validate all step IDs belong to the claim's workflow
    const workflowStepIds = claim.workflow!.steps.map((s) => s.id);
    const invalidSteps = assignments.filter(
      (a) => !workflowStepIds.includes(a.workflowStepId)
    );
    if (invalidSteps.length > 0) {
      return errorResponse(
        "Some steps do not belong to the claim's workflow",
        "INVALID_STEPS",
        400,
        { invalidStepIds: invalidSteps.map((s) => s.workflowStepId) }
      );
    }

    // Validate all user IDs exist and are in the same tenant
    const userIds = [...new Set(assignments.map((a) => a.assignedUserId))];
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
        tenantId: user.tenantId,
        status: "ACTIVE",
      },
    });

    if (users.length !== userIds.length) {
      const foundIds = users.map((u) => u.id);
      const invalidUserIds = userIds.filter((id) => !foundIds.includes(id));
      return errorResponse(
        "Some users not found or inactive",
        "INVALID_USERS",
        400,
        { invalidUserIds }
      );
    }

    // Upsert assignments
    const results = await prisma.$transaction(async (tx) => {
      const upserted = [];
      for (const assignment of assignments) {
        const result = await tx.claimStepAssignment.upsert({
          where: {
            claimId_workflowStepId: {
              claimId,
              workflowStepId: assignment.workflowStepId,
            },
          },
          update: {
            assignedUserId: assignment.assignedUserId,
            assignedBy: user.id,
            notes: assignment.notes,
            isActive: true,
            updatedAt: new Date(),
          },
          create: {
            claimId,
            workflowStepId: assignment.workflowStepId,
            assignedUserId: assignment.assignedUserId,
            assignedBy: user.id,
            notes: assignment.notes,
          },
          include: {
            workflowStep: { select: { id: true, name: true } },
            assignedUser: { select: { id: true, firstName: true, lastName: true } },
          },
        });
        upserted.push(result);
      }

      // Create history entry
      await tx.claimHistory.create({
        data: {
          claimId,
          actionType: "STEP_ASSIGNMENTS_UPDATED",
          toStatus: claim.currentStatus,
          performedBy: user.id,
          notes: `Updated step assignments for ${assignments.length} step(s)`,
          metadata: {
            assignments: assignments.map((a) => ({
              stepId: a.workflowStepId,
              userId: a.assignedUserId,
            })),
          },
        },
      });

      return upserted;
    });

    return successResponse({
      message: "Step assignments updated successfully",
      count: results.length,
      assignments: results,
    });
  } catch (error) {
    console.error("Error updating step assignments:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to update step assignments", "SERVER_ERROR", 500);
  }
}
