// ===========================================
// Workflow Execution API - Execute steps, assign workflows
// ===========================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  successResponse,
  errorResponse,
  handleZodError,
  requireAuth,
} from "@/lib/api-utils";
import { executeWorkflowStepSchema, assignWorkflowSchema } from "@/lib/validations";
import { ZodError } from "zod";
import type { WorkflowCondition } from "@/lib/validations";
import { triggerStepNotifications, escalateClaim } from "@/lib/workflow-notifications";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Helper: Evaluate workflow conditions
function evaluateConditions(
  conditions: WorkflowCondition[] | null | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>
): boolean {
  if (!conditions || conditions.length === 0) return true;

  let result = true;
  let currentOperator: "AND" | "OR" = "AND";

  for (const condition of conditions) {
    const fieldValue = data[condition.field];
    let conditionResult = false;

    switch (condition.operator) {
      case "equals":
        conditionResult = fieldValue === condition.value;
        break;
      case "not_equals":
        conditionResult = fieldValue !== condition.value;
        break;
      case "greater_than":
        conditionResult = Number(fieldValue) > Number(condition.value);
        break;
      case "less_than":
        conditionResult = Number(fieldValue) < Number(condition.value);
        break;
      case "contains":
        conditionResult = String(fieldValue).includes(String(condition.value));
        break;
      case "not_contains":
        conditionResult = !String(fieldValue).includes(String(condition.value));
        break;
      case "in":
        conditionResult = Array.isArray(condition.value) && condition.value.includes(fieldValue);
        break;
      case "not_in":
        conditionResult = Array.isArray(condition.value) && !condition.value.includes(fieldValue);
        break;
      case "is_empty":
        conditionResult = !fieldValue || fieldValue === "" || (Array.isArray(fieldValue) && fieldValue.length === 0);
        break;
      case "is_not_empty":
        conditionResult = !!fieldValue && fieldValue !== "" && (!Array.isArray(fieldValue) || fieldValue.length > 0);
        break;
    }

    if (currentOperator === "AND") {
      result = result && conditionResult;
    } else {
      result = result || conditionResult;
    }

    currentOperator = condition.logicalOperator || "AND";
  }

  return result;
}

// POST /api/workflows/[id]/execute - Execute a workflow step for a claim
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const workflowId = parseInt(id);

    if (isNaN(workflowId)) {
      return errorResponse("Invalid workflow ID", "INVALID_ID", 400);
    }

    const body = await request.json();
    const validatedData = executeWorkflowStepSchema.parse(body);

    // Verify workflow belongs to tenant
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: workflowId,
        tenantId: user.tenantId,
      },
    });

    if (!workflow) {
      return errorResponse("Workflow not found", "NOT_FOUND", 404);
    }

    // Verify claim exists and belongs to tenant
    const claim = await prisma.warrantyClaim.findFirst({
      where: {
        id: validatedData.claimId,
        tenantId: user.tenantId,
      },
      include: {
        warrantyCard: {
          include: {
            product: true,
            customer: true,
            shop: true,
          },
        },
        currentStep: true,
      },
    });

    if (!claim) {
      return errorResponse("Claim not found", "CLAIM_NOT_FOUND", 404);
    }

    // Verify the current step matches
    if (claim.currentStepId !== validatedData.stepId) {
      return errorResponse(
        "Claim is not at the specified step",
        "INVALID_STEP",
        400
      );
    }

    // Get current step with transitions
    const currentStep = await prisma.workflowStep.findFirst({
      where: {
        id: validatedData.stepId,
        workflowId,
      },
      include: {
        requiredRole: true,
        transitionsFrom: {
          include: {
            toStep: true,
          },
          orderBy: { priority: "asc" },
        },
      },
    });

    if (!currentStep) {
      return errorResponse("Current step not found", "STEP_NOT_FOUND", 404);
    }

    // Check permission for this step
    if (currentStep.requiredRoleId && user.roleId !== currentStep.requiredRoleId) {
      // Check if user has required permissions
      const requiredPermissions = currentStep.requiredPermissions as string[] | null;
      if (requiredPermissions && requiredPermissions.length > 0) {
        const hasPermission = requiredPermissions.some((p) => user.permissions.includes(p));
        if (!hasPermission) {
          return errorResponse("You don't have permission to execute this step", "FORBIDDEN", 403);
        }
      } else {
        return errorResponse("You don't have the required role for this step", "FORBIDDEN", 403);
      }
    }

    // Validate form fields if required
    const formFields = currentStep.formFields as { name: string; required: boolean }[] | null;
    if (formFields && formFields.length > 0 && validatedData.action === "complete") {
      for (const field of formFields) {
        if (field.required && (!validatedData.formData || !validatedData.formData[field.name])) {
          return errorResponse(`Field "${field.name}" is required`, "VALIDATION_ERROR", 400);
        }
      }
    }

    // Determine next step based on action and transitions
    let nextStep = null;
    let transitionUsed = null;

    if (validatedData.action === "skip" && !currentStep.canSkip) {
      return errorResponse("This step cannot be skipped", "CANNOT_SKIP", 400);
    }

    if (validatedData.action === "complete" || validatedData.action === "skip") {
      // Build claim data for condition evaluation
      const claimData = {
        priority: claim.priority,
        issueCategory: claim.issueCategory,
        currentStatus: claim.currentStatus,
        currentLocation: claim.currentLocation,
        isWarrantyVoid: claim.isWarrantyVoid,
        repairCost: Number(claim.repairCost),
        productName: claim.warrantyCard.product.name,
        productCategory: claim.warrantyCard.product.categoryId,
        ...validatedData.formData,
      };

      // Find the appropriate transition
      for (const transition of currentStep.transitionsFrom) {
        if (transition.conditionType === "ALWAYS") {
          nextStep = transition.toStep;
          transitionUsed = transition;
          break;
        }

        if (transition.conditionType === "USER_CHOICE") {
          if (validatedData.transitionId === transition.id) {
            nextStep = transition.toStep;
            transitionUsed = transition;
            break;
          }
          continue;
        }

        if (transition.conditionType === "CONDITIONAL") {
          const conditions = transition.conditions as WorkflowCondition[] | null;
          if (evaluateConditions(conditions, claimData)) {
            nextStep = transition.toStep;
            transitionUsed = transition;
            break;
          }
        }
      }

      // If no transition found and there are USER_CHOICE transitions, require selection
      if (!nextStep) {
        const userChoiceTransitions = currentStep.transitionsFrom.filter(
          (t) => t.conditionType === "USER_CHOICE"
        );
        if (userChoiceTransitions.length > 0 && !validatedData.transitionId) {
          return errorResponse(
            "Please select a transition option",
            "TRANSITION_REQUIRED",
            400,
            {
              availableTransitions: userChoiceTransitions.map((t) => ({
                id: t.id,
                name: t.transitionName,
                toStep: t.toStep.name,
              })),
            }
          );
        }
      }
    }

    // Perform the execution in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Record history
      await tx.claimHistory.create({
        data: {
          claimId: claim.id,
          workflowStepId: currentStep.id,
          fromStatus: claim.currentStatus,
          toStatus: nextStep?.statusName || claim.currentStatus,
          fromLocation: claim.currentLocation,
          toLocation: claim.currentLocation,
          actionType: validatedData.action,
          performedBy: user.id,
          notes: validatedData.notes || null,
          attachments: validatedData.attachments ? validatedData.attachments : Prisma.DbNull,
          metadata: (validatedData.formData || transitionUsed) ? {
            formData: validatedData.formData ? JSON.parse(JSON.stringify(validatedData.formData)) : null,
            transitionId: transitionUsed?.id ?? null,
            transitionName: transitionUsed?.transitionName ?? null,
          } as Prisma.InputJsonValue : Prisma.DbNull,
        },
      });

      // Update claim
      const updateData: {
        currentStatus: string;
        currentStepId: number | null;
        currentStepStartedAt?: Date;
        resolvedAt?: Date;
        assignedTo?: number | null;
      } = {
        currentStatus: nextStep?.statusName || claim.currentStatus,
        currentStepId: nextStep?.id || null,
      };

      // Track when step started for SLA calculation
      if (nextStep && nextStep.id !== claim.currentStepId) {
        updateData.currentStepStartedAt = new Date();
      }

      // If next step is END type, mark as resolved
      if (nextStep?.stepType === "END") {
        updateData.resolvedAt = new Date();
      }

      // If next step has auto-assign, update assignedTo
      if (nextStep?.autoAssignTo) {
        updateData.assignedTo = nextStep.autoAssignTo;
      }

      const updatedClaim = await tx.warrantyClaim.update({
        where: { id: claim.id },
        data: updateData,
        include: {
          warrantyCard: {
            include: {
              product: { select: { id: true, name: true, modelNumber: true } },
              customer: { select: { id: true, name: true, phone: true } },
              shop: { select: { id: true, name: true, code: true } },
            },
          },
          currentStep: {
            include: {
              transitionsFrom: {
                include: {
                  toStep: { select: { id: true, name: true, statusName: true } },
                },
              },
            },
          },
          assignedUser: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      });

      return updatedClaim;
    });

    // Trigger notifications asynchronously (don't block response)
    // ON_EXIT for current step
    triggerStepNotifications(currentStep.id, "ON_EXIT", claim.id, user.tenantId).catch((err) =>
      console.error("Failed to trigger ON_EXIT notifications:", err)
    );

    // ON_ENTER for next step
    if (nextStep) {
      triggerStepNotifications(nextStep.id, "ON_ENTER", claim.id, user.tenantId).catch((err) =>
        console.error("Failed to trigger ON_ENTER notifications:", err)
      );
    }

    // Handle escalation action
    if (validatedData.action === "escalate") {
      escalateClaim(
        claim.id,
        user.tenantId,
        validatedData.notes || "Escalated by user",
        user.id
      ).catch((err) => console.error("Failed to escalate claim:", err));
    }

    return successResponse({
      claim: result,
      executedStep: currentStep.name,
      nextStep: nextStep ? { id: nextStep.id, name: nextStep.name, statusName: nextStep.statusName } : null,
      action: validatedData.action,
      transition: transitionUsed ? { id: transitionUsed.id, name: transitionUsed.transitionName } : null,
    });
  } catch (error) {
    console.error("Error executing workflow step:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to execute workflow step", "SERVER_ERROR", 500);
  }
}

// PUT /api/workflows/[id]/execute - Assign a workflow to a claim
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const workflowId = parseInt(id);

    if (isNaN(workflowId)) {
      return errorResponse("Invalid workflow ID", "INVALID_ID", 400);
    }

    const body = await request.json();
    const validatedData = assignWorkflowSchema.parse({ ...body, workflowId });

    // Verify workflow belongs to tenant and is active
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: workflowId,
        tenantId: user.tenantId,
        isActive: true,
      },
      include: {
        steps: {
          where: { stepType: "START" },
          orderBy: { stepOrder: "asc" },
          take: 1,
        },
      },
    });

    if (!workflow) {
      return errorResponse("Workflow not found or inactive", "NOT_FOUND", 404);
    }

    // Verify claim exists and belongs to tenant
    const claim = await prisma.warrantyClaim.findFirst({
      where: {
        id: validatedData.claimId,
        tenantId: user.tenantId,
      },
    });

    if (!claim) {
      return errorResponse("Claim not found", "CLAIM_NOT_FOUND", 404);
    }

    // Check if claim already has a different workflow (allow re-assignment)
    const isWorkflowChange = claim.workflowId && claim.workflowId !== workflowId;

    // Get the first step (START type)
    const startStep = workflow.steps[0];
    if (!startStep) {
      return errorResponse(
        "Workflow has no start step. Please add a START step first.",
        "NO_START_STEP",
        400
      );
    }

    // Assign workflow and set first step
    const updatedClaim = await prisma.$transaction(async (tx) => {
      // Record history
      await tx.claimHistory.create({
        data: {
          claimId: claim.id,
          workflowStepId: startStep.id,
          fromStatus: claim.currentStatus,
          toStatus: startStep.statusName,
          actionType: isWorkflowChange ? "workflow_changed" : "workflow_assigned",
          performedBy: user.id,
          notes: isWorkflowChange
            ? `Workflow changed to "${workflow.name}"`
            : `Workflow "${workflow.name}" assigned to claim`,
          metadata: {
            workflowId: workflow.id,
            workflowName: workflow.name,
            previousWorkflowId: isWorkflowChange ? claim.workflowId : null,
          },
        },
      });

      // Update claim
      return tx.warrantyClaim.update({
        where: { id: claim.id },
        data: {
          workflowId: workflow.id,
          currentStepId: startStep.id,
          currentStepStartedAt: new Date(),
          currentStatus: startStep.statusName,
          resolvedAt: null, // Reset resolved status when changing workflow
          ...(startStep.autoAssignTo && { assignedTo: startStep.autoAssignTo }),
        },
        include: {
          workflow: {
            select: { id: true, name: true },
          },
          currentStep: {
            include: {
              transitionsFrom: {
                include: {
                  toStep: { select: { id: true, name: true, statusName: true } },
                },
              },
            },
          },
          warrantyCard: {
            include: {
              product: { select: { id: true, name: true } },
              customer: { select: { id: true, name: true, phone: true } },
              shop: { select: { id: true, name: true } },
            },
          },
        },
      });
    });

    return successResponse(updatedClaim);
  } catch (error) {
    console.error("Error assigning workflow:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to assign workflow", "SERVER_ERROR", 500);
  }
}

// PATCH /api/workflows/[id]/execute - Rollback to a previous step
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const workflowId = parseInt(id);

    if (isNaN(workflowId)) {
      return errorResponse("Invalid workflow ID", "INVALID_ID", 400);
    }

    const body = await request.json();
    const { claimId, targetStepId, reason } = body;

    if (!claimId || !targetStepId) {
      return errorResponse("claimId and targetStepId are required", "VALIDATION_ERROR", 400);
    }

    // Verify workflow belongs to tenant
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: workflowId,
        tenantId: user.tenantId,
      },
      include: {
        steps: {
          orderBy: { stepOrder: "asc" },
        },
      },
    });

    if (!workflow) {
      return errorResponse("Workflow not found", "NOT_FOUND", 404);
    }

    // Verify claim exists and belongs to tenant
    const claim = await prisma.warrantyClaim.findFirst({
      where: {
        id: claimId,
        tenantId: user.tenantId,
        workflowId,
      },
      include: {
        currentStep: true,
      },
    });

    if (!claim) {
      return errorResponse("Claim not found or not on this workflow", "CLAIM_NOT_FOUND", 404);
    }

    // Verify target step exists and belongs to workflow
    const targetStep = workflow.steps.find((s) => s.id === targetStepId);
    if (!targetStep) {
      return errorResponse("Target step not found in workflow", "STEP_NOT_FOUND", 404);
    }

    // Check if user has permission to rollback (require escalate or admin permission)
    if (!user.permissions.includes("claims.escalate") && !user.permissions.includes("admin")) {
      return errorResponse("You don't have permission to rollback steps", "FORBIDDEN", 403);
    }

    // Verify target step is before current step (actual rollback)
    const currentStepIndex = workflow.steps.findIndex((s) => s.id === claim.currentStepId);
    const targetStepIndex = workflow.steps.findIndex((s) => s.id === targetStepId);

    if (targetStepIndex >= currentStepIndex && claim.currentStepId !== null) {
      return errorResponse(
        "Can only rollback to a previous step",
        "INVALID_ROLLBACK",
        400
      );
    }

    // Cannot rollback from END step if claim is resolved
    if (claim.resolvedAt && claim.currentStep?.stepType === "END") {
      return errorResponse(
        "Cannot rollback a resolved claim. Please reopen the claim first.",
        "CLAIM_RESOLVED",
        400
      );
    }

    // Perform the rollback in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Record rollback in history
      await tx.claimHistory.create({
        data: {
          claimId: claim.id,
          workflowStepId: claim.currentStepId,
          fromStatus: claim.currentStatus,
          toStatus: targetStep.statusName,
          actionType: "rollback",
          performedBy: user.id,
          notes: reason || `Rolled back from "${claim.currentStep?.name || "Unknown"}" to "${targetStep.name}"`,
          metadata: {
            fromStepId: claim.currentStepId,
            fromStepName: claim.currentStep?.name,
            toStepId: targetStep.id,
            toStepName: targetStep.name,
            reason,
          },
        },
      });

      // Update claim
      const updatedClaim = await tx.warrantyClaim.update({
        where: { id: claim.id },
        data: {
          currentStepId: targetStep.id,
          currentStepStartedAt: new Date(),
          currentStatus: targetStep.statusName,
          resolvedAt: null, // Clear resolved if rolling back from END
          ...(targetStep.autoAssignTo && { assignedTo: targetStep.autoAssignTo }),
        },
        include: {
          workflow: {
            select: { id: true, name: true },
          },
          currentStep: {
            include: {
              transitionsFrom: {
                include: {
                  toStep: { select: { id: true, name: true, statusName: true } },
                },
              },
            },
          },
          warrantyCard: {
            include: {
              product: { select: { id: true, name: true } },
              customer: { select: { id: true, name: true, phone: true } },
              shop: { select: { id: true, name: true } },
            },
          },
          assignedUser: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });

      return updatedClaim;
    });

    // Trigger ON_ENTER notification for target step
    triggerStepNotifications(targetStep.id, "ON_ENTER", claim.id, user.tenantId).catch((err) =>
      console.error("Failed to trigger ON_ENTER notifications after rollback:", err)
    );

    return successResponse({
      claim: result,
      rolledBackFrom: claim.currentStep?.name || "Unknown",
      rolledBackTo: targetStep.name,
      reason,
    });
  } catch (error) {
    console.error("Error rolling back workflow step:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to rollback workflow step", "SERVER_ERROR", 500);
  }
}
