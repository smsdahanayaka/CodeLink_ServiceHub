// ===========================================
// Products API - Get, Update, Delete by ID
// ===========================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  handleZodError,
  requireAuth,
} from "@/lib/api-utils";
import { updateProductSchema } from "@/lib/validations";
import { ZodError } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/products/[id] - Get product by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const product = await prisma.product.findFirst({
      where: {
        id: parseInt(id),
        tenantId: user.tenantId,
      },
      include: {
        category: { select: { id: true, name: true } },
        _count: { select: { warrantyCards: true } },
      },
    });

    if (!product) {
      return errorResponse("Product not found", "NOT_FOUND", 404);
    }

    return successResponse(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch product", "SERVER_ERROR", 500);
  }
}

// PUT /api/products/[id] - Update product
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const productId = parseInt(id);

    // Check permission
    if (!user.permissions.includes("products.edit")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    // Check if product exists
    const existingProduct = await prisma.product.findFirst({
      where: {
        id: productId,
        tenantId: user.tenantId,
      },
    });

    if (!existingProduct) {
      return errorResponse("Product not found", "NOT_FOUND", 404);
    }

    const body = await request.json();
    const validatedData = updateProductSchema.parse(body);

    // Check if category exists
    if (validatedData.categoryId) {
      const category = await prisma.productCategory.findFirst({
        where: {
          id: validatedData.categoryId,
          tenantId: user.tenantId,
        },
      });

      if (!category) {
        return errorResponse("Category not found", "CATEGORY_NOT_FOUND", 400);
      }
    }

    // Update product
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        name: validatedData.name,
        modelNumber: validatedData.modelNumber || null,
        sku: validatedData.sku || null,
        description: validatedData.description || null,
        categoryId: validatedData.categoryId || null,
        warrantyPeriodMonths: validatedData.warrantyPeriodMonths,
        serialNumberPrefix: validatedData.serialNumberPrefix || null,
        isActive: validatedData.isActive,
      },
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    return successResponse(updatedProduct);
  } catch (error) {
    console.error("Error updating product:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to update product", "SERVER_ERROR", 500);
  }
}

// DELETE /api/products/[id] - Delete product
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const productId = parseInt(id);

    // Check permission
    if (!user.permissions.includes("products.delete")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    // Check if product exists
    const existingProduct = await prisma.product.findFirst({
      where: {
        id: productId,
        tenantId: user.tenantId,
      },
      include: {
        _count: { select: { warrantyCards: true } },
      },
    });

    if (!existingProduct) {
      return errorResponse("Product not found", "NOT_FOUND", 404);
    }

    // Check for warranty cards
    if (existingProduct._count.warrantyCards > 0) {
      return errorResponse(
        "Cannot delete product with warranty cards",
        "PRODUCT_HAS_WARRANTY_CARDS",
        400
      );
    }

    // Delete product
    await prisma.product.delete({
      where: { id: productId },
    });

    return successResponse({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to delete product", "SERVER_ERROR", 500);
  }
}
