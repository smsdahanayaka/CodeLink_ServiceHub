// ===========================================
// Single Workflow Step API - Get, Update, Delete
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
import { updateWorkflowStepSchema } from "@/lib/validations";
import { ZodError } from "zod";

interface RouteParams {
  params: Promise<{ id: string; stepId: string }>;
}

// GET /api/workflows/[id]/steps/[stepId] - Get single step
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id, stepId } = await params;
    const workflowId = parseInt(id);
    const stepIdNum = parseInt(stepId);

    if (isNaN(workflowId) || isNaN(stepIdNum)) {
      return errorResponse("Invalid workflow or step ID", "INVALID_ID", 400);
    }

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

    // Get step with all details
    const step = await prisma.workflowStep.findFirst({
      where: {
        id: stepIdNum,
        workflowId,
      },
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
              select: { id: true, name: true, type: true, subject: true },
            },
          },
        },
        _count: {
          select: { currentClaims: true, claimHistory: true },
        },
      },
    });

    if (!step) {
      return errorResponse("Step not found", "NOT_FOUND", 404);
    }

    return successResponse(step);
  } catch (error) {
    console.error("Error fetching workflow step:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch workflow step", "SERVER_ERROR", 500);
  }
}

// PUT /api/workflows/[id]/steps/[stepId] - Update step
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id, stepId } = await params;
    const workflowId = parseInt(id);
    const stepIdNum = parseInt(stepId);

    if (isNaN(workflowId) || isNaN(stepIdNum)) {
      return errorResponse("Invalid workflow or step ID", "INVALID_ID", 400);
    }

    // Check permission
    if (!user.permissions.includes("workflows.update")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

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

    // Verify step exists
    const existingStep = await prisma.workflowStep.findFirst({
      where: {
        id: stepIdNum,
        workflowId,
      },
    });

    if (!existingStep) {
      return errorResponse("Step not found", "NOT_FOUND", 404);
    }

    const body = await request.json();
    const validatedData = updateWorkflowStepSchema.parse({ ...body, id: stepIdNum });

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

    // Build update data object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {};

    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.stepOrder !== undefined) updateData.stepOrder = validatedData.stepOrder;
    if (validatedData.stepType !== undefined) updateData.stepType = validatedData.stepType;
    if (validatedData.statusName !== undefined) updateData.statusName = validatedData.statusName;
    if (validatedData.config !== undefined) updateData.config = validatedData.config || Prisma.DbNull;
    if (validatedData.requiredRoleId !== undefined) updateData.requiredRoleId = validatedData.requiredRoleId;
    if (validatedData.requiredPermissions !== undefined) {
      updateData.requiredPermissions = validatedData.requiredPermissions ? validatedData.requiredPermissions : Prisma.DbNull;
    }
    if (validatedData.slaHours !== undefined) updateData.slaHours = validatedData.slaHours;
    if (validatedData.slaWarningHours !== undefined) updateData.slaWarningHours = validatedData.slaWarningHours;
    if (validatedData.autoAssignTo !== undefined) updateData.autoAssignTo = validatedData.autoAssignTo;
    if (validatedData.formFields !== undefined) {
      updateData.formFields = validatedData.formFields ? validatedData.formFields : Prisma.DbNull;
    }
    if (validatedData.isOptional !== undefined) updateData.isOptional = validatedData.isOptional;
    if (validatedData.canSkip !== undefined) updateData.canSkip = validatedData.canSkip;

    // Update step
    const updatedStep = await prisma.workflowStep.update({
      where: { id: stepIdNum },
      data: updateData,
      include: {
        requiredRole: {
          select: { id: true, name: true },
        },
        autoAssignUser: {
          select: { id: true, firstName: true, lastName: true },
        },
        transitionsFrom: true,
        transitionsTo: true,
      },
    });

    return successResponse(updatedStep);
  } catch (error) {
    console.error("Error updating workflow step:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to update workflow step", "SERVER_ERROR", 500);
  }
}

// DELETE /api/workflows/[id]/steps/[stepId] - Delete step
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id, stepId } = await params;
    const workflowId = parseInt(id);
    const stepIdNum = parseInt(stepId);

    if (isNaN(workflowId) || isNaN(stepIdNum)) {
      return errorResponse("Invalid workflow or step ID", "INVALID_ID", 400);
    }

    // Check permission
    if (!user.permissions.includes("workflows.update")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

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

    // Verify step exists and check if in use
    const existingStep = await prisma.workflowStep.findFirst({
      where: {
        id: stepIdNum,
        workflowId,
      },
      include: {
        _count: {
          select: { currentClaims: true },
        },
      },
    });

    if (!existingStep) {
      return errorResponse("Step not found", "NOT_FOUND", 404);
    }

    // Check if any claims are currently at this step
    if (existingStep._count.currentClaims > 0) {
      return errorResponse(
        "Cannot delete step that has active claims. Move claims to another step first.",
        "STEP_IN_USE",
        400
      );
    }

    // Delete step (cascade will delete transitions and notifications)
    await prisma.workflowStep.delete({
      where: { id: stepIdNum },
    });

    return successResponse({ message: "Step deleted successfully" });
  } catch (error) {
    console.error("Error deleting workflow step:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to delete workflow step", "SERVER_ERROR", 500);
  }
}
