// ===========================================
// Workflows API - List and Create
// ===========================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  successResponse,
  errorResponse,
  handleZodError,
  requireAuth,
  parsePaginationParams,
  calculatePaginationMeta,
} from "@/lib/api-utils";
import { createWorkflowSchema } from "@/lib/validations";
import { ZodError } from "zod";

// GET /api/workflows - List all workflows
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const { page, limit, search, sortBy, sortOrder, skip } = parsePaginationParams(searchParams);

    // Additional filters
    const isActive = searchParams.get("isActive");
    const triggerType = searchParams.get("triggerType");

    // Build where clause
    const where = {
      tenantId: user.tenantId,
      ...(search && {
        OR: [
          { name: { contains: search } },
          { description: { contains: search } },
        ],
      }),
      ...(isActive !== null && isActive !== undefined && isActive !== "" && {
        isActive: isActive === "true",
      }),
      ...(triggerType && {
        triggerType: triggerType as "MANUAL" | "AUTO_ON_CLAIM" | "CONDITIONAL",
      }),
    };

    // Get total count
    const total = await prisma.workflow.count({ where });

    // Get workflows with pagination
    const workflows = await prisma.workflow.findMany({
      where,
      include: {
        createdByUser: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        steps: {
          select: { id: true, name: true, stepOrder: true, stepType: true, statusName: true },
          orderBy: { stepOrder: "asc" },
        },
        _count: {
          select: { warrantyClaims: true },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    });

    return successResponse(workflows, calculatePaginationMeta(total, page, limit));
  } catch (error) {
    console.error("Error fetching workflows:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch workflows", "SERVER_ERROR", 500);
  }
}

// POST /api/workflows - Create new workflow
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Check permission
    if (!user.permissions.includes("workflows.create")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const body = await request.json();
    const validatedData = createWorkflowSchema.parse(body);

    // If this is set as default, unset other default workflows
    if (validatedData.isDefault) {
      await prisma.workflow.updateMany({
        where: { tenantId: user.tenantId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Create workflow
    const newWorkflow = await prisma.workflow.create({
      data: {
        tenantId: user.tenantId,
        name: validatedData.name,
        description: validatedData.description || null,
        triggerType: validatedData.triggerType,
        triggerConditions: validatedData.triggerConditions ? validatedData.triggerConditions : Prisma.DbNull,
        isDefault: validatedData.isDefault,
        isActive: validatedData.isActive,
        createdBy: user.id,
      },
      include: {
        createdByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return successResponse(newWorkflow);
  } catch (error) {
    console.error("Error creating workflow:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to create workflow", "SERVER_ERROR", 500);
  }
}
