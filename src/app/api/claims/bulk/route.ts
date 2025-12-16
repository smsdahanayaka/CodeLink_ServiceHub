// ===========================================
// Bulk Claims Processing API
// Process multiple claims through workflow steps at once
// ===========================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  successResponse,
  errorResponse,
  requireAuth,
} from "@/lib/api-utils";
import { triggerStepNotifications } from "@/lib/workflow-notifications";

// POST /api/claims/bulk - Bulk process claims through workflow
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Check permission
    if (!user.permissions.includes("claims.edit")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const body = await request.json();
    const { claimIds, action, transitionId, formData, notes } = body;

    if (!claimIds || !Array.isArray(claimIds) || claimIds.length === 0) {
      return errorResponse("claimIds array is required", "VALIDATION_ERROR", 400);
    }

    if (!action || !["complete", "skip"].includes(action)) {
      return errorResponse("Invalid action. Must be 'complete' or 'skip'", "VALIDATION_ERROR", 400);
    }

    // Limit bulk operations to prevent performance issues
    if (claimIds.length > 50) {
      return errorResponse("Maximum 50 claims can be processed at once", "LIMIT_EXCEEDED", 400);
    }

    // Get all claims
    const claims = await prisma.warrantyClaim.findMany({
      where: {
        id: { in: claimIds },
        tenantId: user.tenantId,
      },
      include: {
        currentStep: {
          include: {
            transitionsFrom: {
              include: {
                toStep: true,
              },
              orderBy: { priority: "asc" },
            },
          },
        },
        warrantyCard: {
          include: {
            product: true,
          },
        },
      },
    });

    if (claims.length === 0) {
      return errorResponse("No valid claims found", "NOT_FOUND", 404);
    }

    // Validate all claims are at the same step (for bulk processing consistency)
    const stepIds = new Set(claims.map((c) => c.currentStepId));
    if (stepIds.size > 1) {
      return errorResponse(
        "All claims must be at the same workflow step for bulk processing",
        "STEP_MISMATCH",
        400
      );
    }

    const currentStep = claims[0].currentStep;
    if (!currentStep) {
      return errorResponse("Claims are not on any workflow step", "NO_STEP", 400);
    }

    // Check if step can be skipped (for skip action)
    if (action === "skip" && !currentStep.canSkip) {
      return errorResponse("This step cannot be skipped", "CANNOT_SKIP", 400);
    }

    // Determine next step based on transitions
    let nextStep = null;
    let transitionUsed = null;

    for (const transition of currentStep.transitionsFrom) {
      if (transition.conditionType === "ALWAYS") {
        nextStep = transition.toStep;
        transitionUsed = transition;
        break;
      }

      if (transition.conditionType === "USER_CHOICE") {
        if (transitionId === transition.id) {
          nextStep = transition.toStep;
          transitionUsed = transition;
          break;
        }
        continue;
      }

      // For bulk processing, skip conditional transitions (too complex)
      // Users should process conditionally-routed claims individually
    }

    // If no transition found and there are USER_CHOICE transitions, require selection
    if (!nextStep) {
      const userChoiceTransitions = currentStep.transitionsFrom.filter(
        (t) => t.conditionType === "USER_CHOICE"
      );
      if (userChoiceTransitions.length > 0 && !transitionId) {
        return errorResponse(
          "Please select a transition option for bulk processing",
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

      // Check for conditional transitions
      const conditionalTransitions = currentStep.transitionsFrom.filter(
        (t) => t.conditionType === "CONDITIONAL"
      );
      if (conditionalTransitions.length > 0) {
        return errorResponse(
          "This step has conditional routing. Please process claims individually.",
          "CONDITIONAL_STEP",
          400
        );
      }
    }

    // Process all claims in a transaction
    const results: {
      success: { id: number; claimNumber: string }[];
      failed: { id: number; claimNumber: string; error: string }[];
    } = { success: [], failed: [] };

    await prisma.$transaction(async (tx) => {
      for (const claim of claims) {
        try {
          // Record history
          await tx.claimHistory.create({
            data: {
              claimId: claim.id,
              workflowStepId: currentStep.id,
              fromStatus: claim.currentStatus,
              toStatus: nextStep?.statusName || claim.currentStatus,
              actionType: action,
              performedBy: user.id,
              notes: notes || `Bulk ${action}: ${claims.length} claims processed`,
              metadata: {
                bulkOperation: true,
                totalClaims: claims.length,
                formData: formData || null,
                transitionId: transitionUsed?.id || null,
              } as Prisma.InputJsonValue,
            },
          });

          // Update claim
          const updateData: {
            currentStatus: string;
            currentStepId: number | null;
            currentStepStartedAt?: Date;
            resolvedAt?: Date | null;
            assignedTo?: number | null;
          } = {
            currentStatus: nextStep?.statusName || claim.currentStatus,
            currentStepId: nextStep?.id || null,
          };

          if (nextStep && nextStep.id !== claim.currentStepId) {
            updateData.currentStepStartedAt = new Date();
          }

          if (nextStep?.stepType === "END") {
            updateData.resolvedAt = new Date();
          }

          if (nextStep?.autoAssignTo) {
            updateData.assignedTo = nextStep.autoAssignTo;
          }

          await tx.warrantyClaim.update({
            where: { id: claim.id },
            data: updateData,
          });

          results.success.push({ id: claim.id, claimNumber: claim.claimNumber });
        } catch (err) {
          results.failed.push({
            id: claim.id,
            claimNumber: claim.claimNumber,
            error: err instanceof Error ? err.message : "Unknown error",
          });
        }
      }
    });

    // Trigger notifications asynchronously (don't block response)
    if (nextStep) {
      for (const claim of claims) {
        // ON_EXIT for current step
        triggerStepNotifications(currentStep.id, "ON_EXIT", claim.id, user.tenantId).catch(() => {});
        // ON_ENTER for next step
        triggerStepNotifications(nextStep.id, "ON_ENTER", claim.id, user.tenantId).catch(() => {});
      }
    }

    return successResponse({
      processed: results.success.length,
      failed: results.failed.length,
      step: {
        from: currentStep.name,
        to: nextStep?.name || null,
      },
      action,
      results,
    });
  } catch (error) {
    console.error("Error in bulk claims processing:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to process claims", "SERVER_ERROR", 500);
  }
}

// PUT /api/claims/bulk - Bulk update claims (assign, priority, etc.)
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Check permission
    if (!user.permissions.includes("claims.edit")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const body = await request.json();
    const { claimIds, updates, notes } = body;

    if (!claimIds || !Array.isArray(claimIds) || claimIds.length === 0) {
      return errorResponse("claimIds array is required", "VALIDATION_ERROR", 400);
    }

    if (!updates || typeof updates !== "object") {
      return errorResponse("updates object is required", "VALIDATION_ERROR", 400);
    }

    // Limit bulk operations
    if (claimIds.length > 100) {
      return errorResponse("Maximum 100 claims can be updated at once", "LIMIT_EXCEEDED", 400);
    }

    // Allowed bulk update fields
    const allowedFields = ["assignedTo", "priority", "currentLocation"];
    const updateData: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateData[key] = value;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return errorResponse(
        `No valid update fields provided. Allowed: ${allowedFields.join(", ")}`,
        "VALIDATION_ERROR",
        400
      );
    }

    // Perform bulk update
    const result = await prisma.$transaction(async (tx) => {
      // Get claims to verify they belong to tenant
      const claims = await tx.warrantyClaim.findMany({
        where: {
          id: { in: claimIds },
          tenantId: user.tenantId,
        },
        select: { id: true, claimNumber: true, currentStatus: true },
      });

      if (claims.length === 0) {
        throw new Error("No valid claims found");
      }

      // Update all claims
      await tx.warrantyClaim.updateMany({
        where: {
          id: { in: claims.map((c) => c.id) },
          tenantId: user.tenantId,
        },
        data: updateData,
      });

      // Record history for each claim
      for (const claim of claims) {
        await tx.claimHistory.create({
          data: {
            claimId: claim.id,
            fromStatus: claim.currentStatus,
            toStatus: claim.currentStatus,
            actionType: "bulk_update",
            performedBy: user.id,
            notes: notes || `Bulk update: ${Object.keys(updateData).join(", ")}`,
            metadata: {
              bulkOperation: true,
              totalClaims: claims.length,
              updateFields: Object.keys(updateData),
            },
          },
        });
      }

      return claims;
    });

    return successResponse({
      updated: result.length,
      updates: updateData,
      claims: result.map((c) => ({ id: c.id, claimNumber: c.claimNumber })),
    });
  } catch (error) {
    console.error("Error in bulk claims update:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    if (error instanceof Error && error.message === "No valid claims found") {
      return errorResponse("No valid claims found", "NOT_FOUND", 404);
    }
    return errorResponse("Failed to update claims", "SERVER_ERROR", 500);
  }
}
