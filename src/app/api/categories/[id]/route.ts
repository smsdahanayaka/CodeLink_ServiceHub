// ===========================================
// Categories API - Get, Update, Delete by ID
// ===========================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  handleZodError,
  requireAuth,
} from "@/lib/api-utils";
import { updateCategorySchema } from "@/lib/validations";
import { ZodError } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/categories/[id] - Get category by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const category = await prisma.productCategory.findFirst({
      where: {
        id: parseInt(id),
        tenantId: user.tenantId,
      },
      include: {
        parent: { select: { id: true, name: true } },
        children: { select: { id: true, name: true } },
        _count: { select: { products: true } },
      },
    });

    if (!category) {
      return errorResponse("Category not found", "NOT_FOUND", 404);
    }

    return successResponse(category);
  } catch (error) {
    console.error("Error fetching category:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch category", "SERVER_ERROR", 500);
  }
}

// PUT /api/categories/[id] - Update category
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const categoryId = parseInt(id);

    // Check permission
    if (!user.permissions.includes("categories.edit")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    // Check if category exists
    const existingCategory = await prisma.productCategory.findFirst({
      where: {
        id: categoryId,
        tenantId: user.tenantId,
      },
    });

    if (!existingCategory) {
      return errorResponse("Category not found", "NOT_FOUND", 404);
    }

    const body = await request.json();
    const validatedData = updateCategorySchema.parse(body);

    // Prevent setting self as parent
    if (validatedData.parentId === categoryId) {
      return errorResponse("Category cannot be its own parent", "INVALID_PARENT", 400);
    }

    // Update category
    const updatedCategory = await prisma.productCategory.update({
      where: { id: categoryId },
      data: {
        name: validatedData.name,
        description: validatedData.description || null,
        parentId: validatedData.parentId || null,
        sortOrder: validatedData.sortOrder,
      },
    });

    return successResponse(updatedCategory);
  } catch (error) {
    console.error("Error updating category:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to update category", "SERVER_ERROR", 500);
  }
}

// DELETE /api/categories/[id] - Delete category
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const categoryId = parseInt(id);

    // Check permission
    if (!user.permissions.includes("categories.delete")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    // Check if category exists
    const existingCategory = await prisma.productCategory.findFirst({
      where: {
        id: categoryId,
        tenantId: user.tenantId,
      },
      include: {
        _count: { select: { products: true, children: true } },
      },
    });

    if (!existingCategory) {
      return errorResponse("Category not found", "NOT_FOUND", 404);
    }

    // Check for products
    if (existingCategory._count.products > 0) {
      return errorResponse(
        "Cannot delete category with products",
        "CATEGORY_HAS_PRODUCTS",
        400
      );
    }

    // Check for children
    if (existingCategory._count.children > 0) {
      return errorResponse(
        "Cannot delete category with subcategories",
        "CATEGORY_HAS_CHILDREN",
        400
      );
    }

    // Delete category
    await prisma.productCategory.delete({
      where: { id: categoryId },
    });

    return successResponse({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Error deleting category:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to delete category", "SERVER_ERROR", 500);
  }
}
