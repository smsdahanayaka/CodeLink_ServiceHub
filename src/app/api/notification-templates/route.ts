// ===========================================
// Notification Templates API
// CRUD operations for notification templates
// ===========================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  handleZodError,
  requireAuth,
  parsePaginationParams,
  calculatePaginationMeta,
} from "@/lib/api-utils";
import { z } from "zod";
import { ZodError } from "zod";

// Validation schema for notification template
const notificationTemplateSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  type: z.enum(["SMS", "EMAIL", "IN_APP", "PUSH"]),
  subject: z.string().max(500).optional().nullable(),
  bodyTemplate: z.string().min(1, "Body template is required"),
  variables: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    required: z.boolean().optional(),
  })).optional().nullable(),
  triggerEvent: z.string().max(100).optional().nullable(),
  isActive: z.boolean().optional(),
});

// GET /api/notification-templates - List all notification templates
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const { page, limit, search, sortBy, sortOrder, skip } = parsePaginationParams(searchParams);

    // Additional filters
    const type = searchParams.get("type");
    const triggerEvent = searchParams.get("triggerEvent");
    const isActive = searchParams.get("isActive");

    // Build where clause
    const where: Record<string, unknown> = {
      tenantId: user.tenantId,
    };

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { bodyTemplate: { contains: search } },
        { subject: { contains: search } },
      ];
    }

    // Type filter
    if (type) {
      where.type = type;
    }

    // Trigger event filter
    if (triggerEvent) {
      where.triggerEvent = triggerEvent;
    }

    // Active status filter
    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === "true";
    }

    // Get total count
    const total = await prisma.notificationTemplate.count({ where });

    // Get templates with pagination
    const templates = await prisma.notificationTemplate.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
      include: {
        _count: {
          select: {
            stepNotifications: true,
            smsLogs: true,
            emailLogs: true,
          },
        },
      },
    });

    return successResponse(templates, calculatePaginationMeta(total, page, limit));
  } catch (error) {
    console.error("Error fetching notification templates:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch notification templates", "SERVER_ERROR", 500);
  }
}

// POST /api/notification-templates - Create new notification template
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Check permission
    if (!user.permissions.includes("settings.manage")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const body = await request.json();
    const validatedData = notificationTemplateSchema.parse(body);

    // Create template
    const template = await prisma.notificationTemplate.create({
      data: {
        tenantId: user.tenantId,
        name: validatedData.name,
        type: validatedData.type,
        subject: validatedData.subject || null,
        bodyTemplate: validatedData.bodyTemplate,
        variables: validatedData.variables || undefined,
        triggerEvent: validatedData.triggerEvent || null,
        isSystem: false,
        isActive: validatedData.isActive ?? true,
      },
    });

    return successResponse(template);
  } catch (error) {
    console.error("Error creating notification template:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to create notification template", "SERVER_ERROR", 500);
  }
}
