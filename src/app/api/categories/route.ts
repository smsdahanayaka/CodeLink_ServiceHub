// ===========================================
// Categories API - List and Create
// ===========================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  handleZodError,
  requireAuth,
} from "@/lib/api-utils";
import { createCategorySchema } from "@/lib/validations";
import { ZodError } from "zod";

// GET /api/categories - List all categories
export async function GET() {
  try {
    const user = await requireAuth();

    const categories = await prisma.productCategory.findMany({
      where: { tenantId: user.tenantId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        parent: {
          select: { id: true, name: true },
        },
        _count: {
          select: { products: true, children: true },
        },
      },
    });

    return successResponse(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch categories", "SERVER_ERROR", 500);
  }
}

// POST /api/categories - Create new category
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Check permission
    if (!user.permissions.includes("categories.create")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const body = await request.json();

    // Validate input
    const validatedData = createCategorySchema.parse(body);

    // Check if parent exists
    if (validatedData.parentId) {
      const parent = await prisma.productCategory.findFirst({
        where: {
          id: validatedData.parentId,
          tenantId: user.tenantId,
        },
      });

      if (!parent) {
        return errorResponse("Parent category not found", "PARENT_NOT_FOUND", 400);
      }
    }

    // Create category
    const newCategory = await prisma.productCategory.create({
      data: {
        tenantId: user.tenantId,
        name: validatedData.name,
        description: validatedData.description || null,
        parentId: validatedData.parentId || null,
        sortOrder: validatedData.sortOrder,
      },
    });

    return successResponse(newCategory);
  } catch (error) {
    console.error("Error creating category:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to create category", "SERVER_ERROR", 500);
  }
}
