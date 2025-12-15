// ===========================================
// Notification Template API - Individual Operations
// GET, PUT, DELETE for specific template
// ===========================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  handleZodError,
  requireAuth,
} from "@/lib/api-utils";
import { z } from "zod";
import { ZodError } from "zod";

type RouteParams = {
  params: Promise<{ id: string }>;
};

// Validation schema for notification template update
const updateTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  type: z.enum(["SMS", "EMAIL", "IN_APP", "PUSH"]).optional(),
  subject: z.string().max(500).optional().nullable(),
  bodyTemplate: z.string().min(1).optional(),
  variables: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    required: z.boolean().optional(),
  })).optional().nullable(),
  triggerEvent: z.string().max(100).optional().nullable(),
  isActive: z.boolean().optional(),
});

// GET /api/notification-templates/[id] - Get single template
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const templateId = parseInt(id);

    if (isNaN(templateId)) {
      return errorResponse("Invalid template ID", "VALIDATION_ERROR", 400);
    }

    const template = await prisma.notificationTemplate.findFirst({
      where: {
        id: templateId,
        tenantId: user.tenantId,
      },
      include: {
        stepNotifications: {
          include: {
            step: {
              select: {
                id: true,
                name: true,
                workflow: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
        _count: {
          select: {
            smsLogs: true,
            emailLogs: true,
          },
        },
      },
    });

    if (!template) {
      return errorResponse("Template not found", "NOT_FOUND", 404);
    }

    return successResponse(template);
  } catch (error) {
    console.error("Error fetching notification template:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch notification template", "SERVER_ERROR", 500);
  }
}

// PUT /api/notification-templates/[id] - Update template
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth();

    // Check permission
    if (!user.permissions.includes("settings.manage")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const { id } = await params;
    const templateId = parseInt(id);

    if (isNaN(templateId)) {
      return errorResponse("Invalid template ID", "VALIDATION_ERROR", 400);
    }

    // Check template exists and belongs to tenant
    const existingTemplate = await prisma.notificationTemplate.findFirst({
      where: {
        id: templateId,
        tenantId: user.tenantId,
      },
    });

    if (!existingTemplate) {
      return errorResponse("Template not found", "NOT_FOUND", 404);
    }

    // System templates cannot be modified
    if (existingTemplate.isSystem) {
      return errorResponse("System templates cannot be modified", "FORBIDDEN", 403);
    }

    const body = await request.json();
    const validatedData = updateTemplateSchema.parse(body);

    // Update template
    const template = await prisma.notificationTemplate.update({
      where: { id: templateId },
      data: {
        ...(validatedData.name !== undefined && { name: validatedData.name }),
        ...(validatedData.type !== undefined && { type: validatedData.type }),
        ...(validatedData.subject !== undefined && { subject: validatedData.subject }),
        ...(validatedData.bodyTemplate !== undefined && { bodyTemplate: validatedData.bodyTemplate }),
        ...(validatedData.variables !== undefined && { variables: validatedData.variables || undefined }),
        ...(validatedData.triggerEvent !== undefined && { triggerEvent: validatedData.triggerEvent }),
        ...(validatedData.isActive !== undefined && { isActive: validatedData.isActive }),
      },
    });

    return successResponse(template);
  } catch (error) {
    console.error("Error updating notification template:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to update notification template", "SERVER_ERROR", 500);
  }
}

// DELETE /api/notification-templates/[id] - Delete template
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth();

    // Check permission
    if (!user.permissions.includes("settings.manage")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const { id } = await params;
    const templateId = parseInt(id);

    if (isNaN(templateId)) {
      return errorResponse("Invalid template ID", "VALIDATION_ERROR", 400);
    }

    // Check template exists and belongs to tenant
    const existingTemplate = await prisma.notificationTemplate.findFirst({
      where: {
        id: templateId,
        tenantId: user.tenantId,
      },
      include: {
        _count: {
          select: { stepNotifications: true },
        },
      },
    });

    if (!existingTemplate) {
      return errorResponse("Template not found", "NOT_FOUND", 404);
    }

    // System templates cannot be deleted
    if (existingTemplate.isSystem) {
      return errorResponse("System templates cannot be deleted", "FORBIDDEN", 403);
    }

    // Check if template is in use
    if (existingTemplate._count.stepNotifications > 0) {
      return errorResponse(
        `Template is in use by ${existingTemplate._count.stepNotifications} workflow step notification(s). Remove them first.`,
        "IN_USE",
        400
      );
    }

    // Delete template
    await prisma.notificationTemplate.delete({
      where: { id: templateId },
    });

    return successResponse({ success: true, message: "Template deleted successfully" });
  } catch (error) {
    console.error("Error deleting notification template:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to delete notification template", "SERVER_ERROR", 500);
  }
}
