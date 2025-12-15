// ===========================================
// Workflow Steps API - List and Create
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
import { createWorkflowStepSchema } from "@/lib/validations";
import { ZodError } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/workflows/[id]/steps - List all steps for a workflow
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const workflowId = parseInt(id);

    if (isNaN(workflowId)) {
      return errorResponse("Invalid workflow ID", "INVALID_ID", 400);
    }

    // Verify workflow exists and belongs to tenant
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: workflowId,
        tenantId: user.tenantId,
      },
    });

    if (!workflow) {
      return errorResponse("Workflow not found", "NOT_FOUND", 404);
    }

    // Get all steps with transitions
    const steps = await prisma.workflowStep.findMany({
      where: { workflowId },
      include: {
        requiredRole: {
          select: { id: true, name: true },
        },
        autoAssignUser: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        transitionsFrom: {
          include: {
            toStep: {
              select: { id: true, name: true, stepOrder: true, statusName: true },
            },
          },
        },
        transitionsTo: {
          include: {
            fromStep: {
              select: { id: true, name: true, stepOrder: true, statusName: true },
            },
          },
        },
        stepNotifications: {
          include: {
            notificationTemplate: {
              select: { id: true, name: true, type: true },
            },
          },
        },
        _count: {
          select: { currentClaims: true },
        },
      },
      orderBy: { stepOrder: "asc" },
    });

    return successResponse(steps);
  } catch (error) {
    console.error("Error fetching workflow steps:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch workflow steps", "SERVER_ERROR", 500);
  }
}

// POST /api/workflows/[id]/steps - Create new step
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const workflowId = parseInt(id);

    if (isNaN(workflowId)) {
      return errorResponse("Invalid workflow ID", "INVALID_ID", 400);
    }

    // Check permission
    if (!user.permissions.includes("workflows.update")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    // Verify workflow exists and belongs to tenant
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: workflowId,
        tenantId: user.tenantId,
      },
    });

    if (!workflow) {
      return errorResponse("Workflow not found", "NOT_FOUND", 404);
    }

    const body = await request.json();
    const validatedData = createWorkflowStepSchema.parse(body);

    // Validate required role belongs to tenant
    if (validatedData.requiredRoleId) {
      const role = await prisma.role.findFirst({
        where: {
          id: validatedData.requiredRoleId,
          tenantId: user.tenantId,
        },
      });
      if (!role) {
        return errorResponse("Required role not found", "ROLE_NOT_FOUND", 400);
      }
    }

    // Validate auto-assign user belongs to tenant
    if (validatedData.autoAssignTo) {
      const assignUser = await prisma.user.findFirst({
        where: {
          id: validatedData.autoAssignTo,
          tenantId: user.tenantId,
        },
      });
      if (!assignUser) {
        return errorResponse("Auto-assign user not found", "USER_NOT_FOUND", 400);
      }
    }

    // Create step
    const newStep = await prisma.workflowStep.create({
      data: {
        workflowId,
        name: validatedData.name,
        description: validatedData.description || null,
        stepOrder: validatedData.stepOrder,
        stepType: validatedData.stepType,
        statusName: validatedData.statusName,
        config: validatedData.config ? {
          ...validatedData.config,
          positionX: validatedData.positionX,
          positionY: validatedData.positionY,
        } : {
          positionX: validatedData.positionX,
          positionY: validatedData.positionY,
        },
        requiredRoleId: validatedData.requiredRoleId || null,
        requiredPermissions: validatedData.requiredPermissions ? validatedData.requiredPermissions : Prisma.DbNull,
        slaHours: validatedData.slaHours || null,
        slaWarningHours: validatedData.slaWarningHours || null,
        autoAssignTo: validatedData.autoAssignTo || null,
        formFields: validatedData.formFields ? validatedData.formFields : Prisma.DbNull,
        isOptional: validatedData.isOptional,
        canSkip: validatedData.canSkip,
      },
      include: {
        requiredRole: {
          select: { id: true, name: true },
        },
        autoAssignUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return successResponse(newStep);
  } catch (error) {
    console.error("Error creating workflow step:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to create workflow step", "SERVER_ERROR", 500);
  }
}

// PUT /api/workflows/[id]/steps - Bulk update steps (reorder, update multiple)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const workflowId = parseInt(id);

    if (isNaN(workflowId)) {
      return errorResponse("Invalid workflow ID", "INVALID_ID", 400);
    }

    // Check permission
    if (!user.permissions.includes("workflows.update")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    // Verify workflow exists and belongs to tenant
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: workflowId,
        tenantId: user.tenantId,
      },
    });

    if (!workflow) {
      return errorResponse("Workflow not found", "NOT_FOUND", 404);
    }

    const body = await request.json();
    const { steps, transitions } = body;

    // Perform bulk update in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update existing steps and create new ones
      const stepIdMap: Record<string, number> = {}; // Map tempId -> actual id

      for (const step of steps) {
        if (step.id) {
          // Update existing step
          await tx.workflowStep.update({
            where: { id: step.id },
            data: {
              name: step.name,
              description: step.description || null,
              stepOrder: step.stepOrder,
              stepType: step.stepType,
              statusName: step.statusName,
              config: step.config || null,
              requiredRoleId: step.requiredRoleId || null,
              requiredPermissions: step.requiredPermissions || null,
              slaHours: step.slaHours || null,
              slaWarningHours: step.slaWarningHours || null,
              autoAssignTo: step.autoAssignTo || null,
              formFields: step.formFields || null,
              isOptional: step.isOptional || false,
              canSkip: step.canSkip || false,
            },
          });
          if (step.tempId) {
            stepIdMap[step.tempId] = step.id;
          }
        } else {
          // Create new step
          const newStep = await tx.workflowStep.create({
            data: {
              workflowId,
              name: step.name,
              description: step.description || null,
              stepOrder: step.stepOrder,
              stepType: step.stepType,
              statusName: step.statusName,
              config: step.config || null,
              requiredRoleId: step.requiredRoleId || null,
              requiredPermissions: step.requiredPermissions || null,
              slaHours: step.slaHours || null,
              slaWarningHours: step.slaWarningHours || null,
              autoAssignTo: step.autoAssignTo || null,
              formFields: step.formFields || null,
              isOptional: step.isOptional || false,
              canSkip: step.canSkip || false,
            },
          });
          if (step.tempId) {
            stepIdMap[step.tempId] = newStep.id;
          }
        }
      }

      // Delete old transitions for this workflow's steps
      const stepIds = await tx.workflowStep.findMany({
        where: { workflowId },
        select: { id: true },
      });
      const existingStepIds = stepIds.map((s) => s.id);

      await tx.stepTransition.deleteMany({
        where: {
          fromStepId: { in: existingStepIds },
        },
      });

      // Create new transitions
      if (transitions && transitions.length > 0) {
        for (const transition of transitions) {
          const fromStepId = transition.fromStepTempId
            ? stepIdMap[transition.fromStepTempId]
            : transition.fromStepId;
          const toStepId = transition.toStepTempId
            ? stepIdMap[transition.toStepTempId]
            : transition.toStepId;

          if (fromStepId && toStepId) {
            await tx.stepTransition.create({
              data: {
                fromStepId,
                toStepId,
                transitionName: transition.transitionName || null,
                conditionType: transition.conditionType || "ALWAYS",
                conditions: transition.conditions || null,
                priority: transition.priority || 0,
              },
            });
          }
        }
      }

      // Return updated workflow with steps
      return tx.workflow.findFirst({
        where: { id: workflowId },
        include: {
          steps: {
            include: {
              transitionsFrom: true,
              transitionsTo: true,
            },
            orderBy: { stepOrder: "asc" },
          },
        },
      });
    });

    return successResponse(result);
  } catch (error) {
    console.error("Error updating workflow steps:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to update workflow steps", "SERVER_ERROR", 500);
  }
}
