// ===========================================
// Inventory Item API - Get, Update, Delete
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
const updateInventoryItemSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  categoryId: z.number().int().positive().nullable().optional(),
  reorderLevel: z.number().min(0).optional(),
  reorderQuantity: z.number().min(0).optional(),
  costPrice: z.number().min(0).optional(),
  sellingPrice: z.number().min(0).optional(),
  unit: z.string().max(50).optional(),
  location: z.string().max(255).nullable().optional(),
  supplier: z.string().max(255).nullable().optional(),
  barcode: z.string().max(100).nullable().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/inventory/items/[id] - Get single item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const item = await prisma.inventoryItem.findFirst({
      where: {
        id: parseInt(id),
        tenantId: user.tenantId,
      },
      include: {
        category: { select: { id: true, name: true } },
        transactions: {
          select: {
            id: true,
            transactionType: true,
            quantity: true,
            previousQuantity: true,
            newQuantity: true,
            referenceType: true,
            referenceId: true,
            notes: true,
            createdAt: true,
            createdByUser: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        _count: {
          select: { transactions: true, claimParts: true, quotationItems: true },
        },
      },
    });

    if (!item) {
      return errorResponse("Item not found", "NOT_FOUND", 404);
    }

    // Add calculated fields
    const itemWithCalculations = {
      ...item,
      availableQuantity: Number(item.quantity) - Number(item.reservedQuantity),
      isLowStock: Number(item.reorderLevel) > 0 && Number(item.quantity) <= Number(item.reorderLevel),
    };

    return successResponse(itemWithCalculations);
  } catch (error) {
    console.error("Error fetching inventory item:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch inventory item", "SERVER_ERROR", 500);
  }
}

// PUT /api/inventory/items/[id] - Update item
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
    const validatedData = updateInventoryItemSchema.parse(body);

    // Check if item exists
    const existing = await prisma.inventoryItem.findFirst({
      where: {
        id: parseInt(id),
        tenantId: user.tenantId,
      },
    });

    if (!existing) {
      return errorResponse("Item not found", "NOT_FOUND", 404);
    }

    // Check category if updating
    if (validatedData.categoryId !== undefined && validatedData.categoryId !== null) {
      const category = await prisma.inventoryCategory.findFirst({
        where: {
          id: validatedData.categoryId,
          tenantId: user.tenantId,
        },
      });

      if (!category) {
        return errorResponse("Category not found", "CATEGORY_NOT_FOUND", 400);
      }
    }

    // Update item
    const updatedItem = await prisma.inventoryItem.update({
      where: { id: parseInt(id) },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.description !== undefined && { description: validatedData.description }),
        ...(validatedData.categoryId !== undefined && { categoryId: validatedData.categoryId }),
        ...(validatedData.reorderLevel !== undefined && { reorderLevel: validatedData.reorderLevel }),
        ...(validatedData.reorderQuantity !== undefined && { reorderQuantity: validatedData.reorderQuantity }),
        ...(validatedData.costPrice !== undefined && { costPrice: validatedData.costPrice }),
        ...(validatedData.sellingPrice !== undefined && { sellingPrice: validatedData.sellingPrice }),
        ...(validatedData.unit && { unit: validatedData.unit }),
        ...(validatedData.location !== undefined && { location: validatedData.location }),
        ...(validatedData.supplier !== undefined && { supplier: validatedData.supplier }),
        ...(validatedData.barcode !== undefined && { barcode: validatedData.barcode }),
        ...(validatedData.isActive !== undefined && { isActive: validatedData.isActive }),
      },
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    return successResponse(updatedItem);
  } catch (error) {
    console.error("Error updating inventory item:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to update inventory item", "SERVER_ERROR", 500);
  }
}

// DELETE /api/inventory/items/[id] - Delete item
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

    // Check if item exists
    const existing = await prisma.inventoryItem.findFirst({
      where: {
        id: parseInt(id),
        tenantId: user.tenantId,
      },
      include: {
        _count: { select: { claimParts: true, quotationItems: true } },
      },
    });

    if (!existing) {
      return errorResponse("Item not found", "NOT_FOUND", 404);
    }

    // Check if item is used in claims or quotations
    if (existing._count.claimParts > 0 || existing._count.quotationItems > 0) {
      return errorResponse(
        "Cannot delete item that is used in claims or quotations. Deactivate it instead.",
        "IN_USE",
        400
      );
    }

    // Delete item and its transactions
    await prisma.$transaction([
      prisma.inventoryTransaction.deleteMany({
        where: { itemId: parseInt(id) },
      }),
      prisma.inventoryItem.delete({
        where: { id: parseInt(id) },
      }),
    ]);

    return successResponse({ message: "Item deleted successfully" });
  } catch (error) {
    console.error("Error deleting inventory item:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to delete inventory item", "SERVER_ERROR", 500);
  }
}
