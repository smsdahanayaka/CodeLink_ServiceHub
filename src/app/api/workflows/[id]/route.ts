// ===========================================
// Single Workflow API - Get, Update, Delete
// ===========================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  handleZodError,
  requireAuth,
} from "@/lib/api-utils";
import { updateWorkflowSchema } from "@/lib/validations";
import { ZodError } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/workflows/[id] - Get single workflow with all details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const workflowId = parseInt(id);

    if (isNaN(workflowId)) {
      return errorResponse("Invalid workflow ID", "INVALID_ID", 400);
    }

    const workflow = await prisma.workflow.findFirst({
      where: {
        id: workflowId,
        tenantId: user.tenantId,
      },
      include: {
        createdByUser: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        steps: {
          include: {
            requiredRole: {
              select: { id: true, name: true },
            },
            autoAssignUser: {
              select: { id: true, firstName: true, lastName: true },
            },
            transitionsFrom: {
              include: {
                toStep: {
                  select: { id: true, name: true, stepOrder: true },
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
        },
        _count: {
          select: { warrantyClaims: true },
        },
      },
    });

    if (!workflow) {
      return errorResponse("Workflow not found", "NOT_FOUND", 404);
    }

    return successResponse(workflow);
  } catch (error) {
    console.error("Error fetching workflow:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch workflow", "SERVER_ERROR", 500);
  }
}

// PUT /api/workflows/[id] - Update workflow
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const workflowId = parseInt(id);

    if (isNaN(workflowId)) {
      return errorResponse("Invalid workflow ID", "INVALID_ID", 400);
    }

    // Check permission
    if (!user.permissions.includes("workflows.edit")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    // Verify workflow exists and belongs to tenant
    const existingWorkflow = await prisma.workflow.findFirst({
      where: {
        id: workflowId,
        tenantId: user.tenantId,
      },
    });

    if (!existingWorkflow) {
      return errorResponse("Workflow not found", "NOT_FOUND", 404);
    }

    const body = await request.json();
    const validatedData = updateWorkflowSchema.parse(body);

    // If setting as default, unset other default workflows
    if (validatedData.isDefault) {
      await prisma.workflow.updateMany({
        where: {
          tenantId: user.tenantId,
          isDefault: true,
          id: { not: workflowId },
        },
        data: { isDefault: false },
      });
    }

    // Update workflow
    const updatedWorkflow = await prisma.workflow.update({
      where: { id: workflowId },
      data: {
        ...(validatedData.name !== undefined && { name: validatedData.name }),
        ...(validatedData.description !== undefined && { description: validatedData.description }),
        ...(validatedData.triggerType !== undefined && { triggerType: validatedData.triggerType }),
        ...(validatedData.triggerConditions !== undefined && { triggerConditions: validatedData.triggerConditions }),
        ...(validatedData.isDefault !== undefined && { isDefault: validatedData.isDefault }),
        ...(validatedData.isActive !== undefined && { isActive: validatedData.isActive }),
      },
      include: {
        createdByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
        steps: {
          orderBy: { stepOrder: "asc" },
        },
      },
    });

    return successResponse(updatedWorkflow);
  } catch (error) {
    console.error("Error updating workflow:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to update workflow", "SERVER_ERROR", 500);
  }
}

// DELETE /api/workflows/[id] - Delete workflow
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const workflowId = parseInt(id);

    if (isNaN(workflowId)) {
      return errorResponse("Invalid workflow ID", "INVALID_ID", 400);
    }

    // Check permission
    if (!user.permissions.includes("workflows.delete")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    // Verify workflow exists and belongs to tenant
    const existingWorkflow = await prisma.workflow.findFirst({
      where: {
        id: workflowId,
        tenantId: user.tenantId,
      },
      include: {
        _count: {
          select: { warrantyClaims: true },
        },
      },
    });

    if (!existingWorkflow) {
      return errorResponse("Workflow not found", "NOT_FOUND", 404);
    }

    // Check if workflow is in use
    if (existingWorkflow._count.warrantyClaims > 0) {
      return errorResponse(
        "Cannot delete workflow that is being used by claims. Deactivate it instead.",
        "WORKFLOW_IN_USE",
        400
      );
    }

    // Delete workflow (cascade will delete steps, transitions, notifications)
    await prisma.workflow.delete({
      where: { id: workflowId },
    });

    return successResponse({ message: "Workflow deleted successfully" });
  } catch (error) {
    console.error("Error deleting workflow:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to delete workflow", "SERVER_ERROR", 500);
  }
}
