// ===========================================
// Warranty Claims API - Get, Update by ID
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

// GET /api/claims/[id] - Get single claim with full details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const claimId = parseInt(id);

    if (isNaN(claimId)) {
      return errorResponse("Invalid claim ID", "INVALID_ID", 400);
    }

    // Check permissions
    const canViewAll = user.permissions.includes("claims.view_all");
    const canViewAssigned = user.permissions.includes("claims.view_assigned");

    // First, check if user has access via sub-task or step assignment
    let hasSubTaskAccess = false;
    let hasStepAssignmentAccess = false;

    if (!canViewAll) {
      // Check if user has a sub-task assigned in this claim
      const subTaskCount = await prisma.claimSubTask.count({
        where: {
          claimId,
          assignedTo: user.id,
          claim: { tenantId: user.tenantId },
        },
      });
      hasSubTaskAccess = subTaskCount > 0;

      // Check if user has a step assignment for this claim
      const stepAssignmentCount = await prisma.claimStepAssignment.count({
        where: {
          claimId,
          assignedUserId: user.id,
          claim: { tenantId: user.tenantId },
        },
      });
      hasStepAssignmentAccess = stepAssignmentCount > 0;
    }

    // Build where condition
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereCondition: any = {
      id: claimId,
      tenantId: user.tenantId,
    };

    // If user can only view assigned (and doesn't have sub-task/step access), filter by assignedTo
    if (!canViewAll && !hasSubTaskAccess && !hasStepAssignmentAccess && canViewAssigned) {
      whereCondition.assignedTo = user.id;
    }

    const claim = await prisma.warrantyClaim.findFirst({
      where: whereCondition,
      include: {
        warrantyCard: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                modelNumber: true,
                sku: true,
                warrantyPeriodMonths: true,
                category: { select: { id: true, name: true } },
              },
            },
            customer: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                address: true,
                city: true,
                state: true,
              },
            },
            shop: {
              select: {
                id: true,
                name: true,
                code: true,
                phone: true,
                address: true,
              },
            },
          },
        },
        assignedUser: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        createdByUser: {
          select: { id: true, firstName: true, lastName: true },
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
            description: true,
            slaHours: true,
            slaWarningHours: true,
            canSkip: true,
            isOptional: true,
            formFields: true,
            transitionsFrom: {
              select: {
                id: true,
                transitionName: true,
                conditionType: true,
                toStep: {
                  select: { id: true, name: true, statusName: true, stepType: true },
                },
              },
            },
          },
        },
        claimHistory: {
          orderBy: { createdAt: "desc" },
          include: {
            performedUser: {
              select: { id: true, firstName: true, lastName: true },
            },
            workflowStep: {
              select: { id: true, name: true, statusName: true },
            },
          },
        },
        pickups: {
          orderBy: { createdAt: "desc" },
          include: {
            collector: { select: { id: true, name: true, phone: true } },
          },
        },
        deliveries: {
          orderBy: { createdAt: "desc" },
          include: {
            collector: { select: { id: true, name: true, phone: true } },
          },
        },
      },
    });

    if (!claim) {
      return errorResponse("Claim not found", "NOT_FOUND", 404);
    }

    // Get current step assignment info (for step status and assignee)
    let currentStepAssignment = null;
    let isCurrentStepAssignee = false;
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
          stepCompletedAt: true,
          assignedUserId: true,
          assignedUser: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      });
      currentStepAssignment = stepAssignment;
      isCurrentStepAssignee = stepAssignment?.assignedUserId === user.id;
    }

    // Build user context for client-side view determination
    const isAdmin = canViewAll;
    const canEdit = canViewAll || isCurrentStepAssignee || hasStepAssignmentAccess;
    const canProcessStep = canViewAll || isCurrentStepAssignee;
    const canAddSubTasks = canViewAll;
    const canAssignWorkflow = canViewAll || user.permissions.includes("claims.assign");
    const canRollback = canViewAll || user.permissions.includes("claims.escalate");

    return successResponse({
      ...claim,
      currentStepAssignee: currentStepAssignment?.assignedUser || null,
      currentStepStatus: currentStepAssignment?.stepStatus || null,
      currentStepStartedAt: currentStepAssignment?.stepStartedAt || null,
      // User context for dual view
      _userContext: {
        isAdmin,
        isStepAssignee: isCurrentStepAssignee,
        hasSubTaskAccess,
        hasStepAssignmentAccess,
        canEdit,
        canProcessStep,
        canAddSubTasks,
        canAssignWorkflow,
        canRollback,
      },
      // Legacy fields (keep for backward compatibility)
      _currentUserId: user.id,
      _currentUserCanViewAll: canViewAll,
    });
  } catch (error) {
    console.error("Error fetching claim:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch claim", "SERVER_ERROR", 500);
  }
}

// PUT /api/claims/[id] - Update claim
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();

    // Check permission
    if (!user.permissions.includes("claims.edit")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const { id } = await params;
    const claimId = parseInt(id);

    if (isNaN(claimId)) {
      return errorResponse("Invalid claim ID", "INVALID_ID", 400);
    }

    // Check if claim exists
    const existingClaim = await prisma.warrantyClaim.findFirst({
      where: { id: claimId, tenantId: user.tenantId },
    });

    if (!existingClaim) {
      return errorResponse("Claim not found", "NOT_FOUND", 404);
    }

    const body = await request.json();
    const {
      issueDescription,
      issueCategory,
      priority,
      diagnosis,
      resolution,
      partsUsed,
      repairCost,
      isWarrantyVoid,
      voidReason,
      notes,
    } = body;

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (issueDescription) updateData.issueDescription = issueDescription;
    if (issueCategory !== undefined) updateData.issueCategory = issueCategory || null;
    if (priority) updateData.priority = priority;
    if (diagnosis !== undefined) updateData.diagnosis = diagnosis || null;
    if (resolution !== undefined) updateData.resolution = resolution || null;
    if (partsUsed !== undefined) updateData.partsUsed = partsUsed || null;
    if (repairCost !== undefined) updateData.repairCost = repairCost || 0;
    if (isWarrantyVoid !== undefined) updateData.isWarrantyVoid = isWarrantyVoid;
    if (voidReason !== undefined) updateData.voidReason = voidReason || null;

    // Update claim
    const updatedClaim = await prisma.warrantyClaim.update({
      where: { id: claimId },
      data: updateData,
      include: {
        warrantyCard: {
          select: {
            id: true,
            cardNumber: true,
            product: { select: { id: true, name: true } },
            customer: { select: { id: true, name: true, phone: true } },
          },
        },
        assignedUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Add history entry if notes provided
    if (notes) {
      await prisma.claimHistory.create({
        data: {
          claimId,
          fromStatus: existingClaim.currentStatus,
          toStatus: existingClaim.currentStatus,
          actionType: "CLAIM_UPDATED",
          performedBy: user.id,
          notes,
        },
      });
    }

    return successResponse(updatedClaim);
  } catch (error) {
    console.error("Error updating claim:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to update claim", "SERVER_ERROR", 500);
  }
}
