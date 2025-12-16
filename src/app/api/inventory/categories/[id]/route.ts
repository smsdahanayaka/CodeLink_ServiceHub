// ===========================================
// Inventory Category API - Get, Update, Delete
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

// Validation schema
const updateInventoryCategorySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  parentId: z.number().int().positive().nullable().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/inventory/categories/[id] - Get single category
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const category = await prisma.inventoryCategory.findFirst({
      where: {
        id: parseInt(id),
        tenantId: user.tenantId,
      },
      include: {
        parent: { select: { id: true, name: true } },
        children: {
          select: { id: true, name: true, isActive: true },
          orderBy: { sortOrder: "asc" },
        },
        items: {
          select: { id: true, name: true, sku: true, quantity: true },
          take: 10,
        },
        _count: { select: { items: true, children: true } },
      },
    });

    if (!category) {
      return errorResponse("Category not found", "NOT_FOUND", 404);
    }

    return successResponse(category);
  } catch (error) {
    console.error("Error fetching inventory category:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch inventory category", "SERVER_ERROR", 500);
  }
}

// PUT /api/inventory/categories/[id] - Update category
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    if (!user.permissions.includes("inventory.update")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const body = await request.json();
    const validatedData = updateInventoryCategorySchema.parse(body);

    // Check if category exists
    const existing = await prisma.inventoryCategory.findFirst({
      where: {
        id: parseInt(id),
        tenantId: user.tenantId,
      },
    });

    if (!existing) {
      return errorResponse("Category not found", "NOT_FOUND", 404);
    }

    // Check parent if updating parentId
    if (validatedData.parentId !== undefined && validatedData.parentId !== null) {
      // Prevent circular reference
      if (validatedData.parentId === parseInt(id)) {
        return errorResponse("Category cannot be its own parent", "INVALID_PARENT", 400);
      }

      const parent = await prisma.inventoryCategory.findFirst({
        where: {
          id: validatedData.parentId,
          tenantId: user.tenantId,
        },
      });

      if (!parent) {
        return errorResponse("Parent category not found", "PARENT_NOT_FOUND", 400);
      }
    }

    // Update category
    const updatedCategory = await prisma.inventoryCategory.update({
      where: { id: parseInt(id) },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.description !== undefined && { description: validatedData.description }),
        ...(validatedData.parentId !== undefined && { parentId: validatedData.parentId }),
        ...(validatedData.sortOrder !== undefined && { sortOrder: validatedData.sortOrder }),
        ...(validatedData.isActive !== undefined && { isActive: validatedData.isActive }),
      },
      include: {
        parent: { select: { id: true, name: true } },
        _count: { select: { items: true, children: true } },
      },
    });

    return successResponse(updatedCategory);
  } catch (error) {
    console.error("Error updating inventory category:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to update inventory category", "SERVER_ERROR", 500);
  }
}

// DELETE /api/inventory/categories/[id] - Delete category
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    if (!user.permissions.includes("inventory.delete")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    // Check if category exists
    const existing = await prisma.inventoryCategory.findFirst({
      where: {
        id: parseInt(id),
        tenantId: user.tenantId,
      },
      include: {
        _count: { select: { items: true, children: true } },
      },
    });

    if (!existing) {
      return errorResponse("Category not found", "NOT_FOUND", 404);
    }

    // Check if category has items
    if (existing._count.items > 0) {
      return errorResponse(
        "Cannot delete category with items. Move or delete items first.",
        "HAS_ITEMS",
        400
      );
    }

    // Check if category has children
    if (existing._count.children > 0) {
      return errorResponse(
        "Cannot delete category with sub-categories. Delete or move sub-categories first.",
        "HAS_CHILDREN",
        400
      );
    }

    await prisma.inventoryCategory.delete({
      where: { id: parseInt(id) },
    });

    return successResponse({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Error deleting inventory category:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to delete inventory category", "SERVER_ERROR", 500);
  }
}
