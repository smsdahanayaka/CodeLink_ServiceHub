// ===========================================
// Products API - List and Create
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
import { createProductSchema } from "@/lib/validations";
import { ZodError } from "zod";

// GET /api/products - List all products
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const { page, limit, search, sortBy, sortOrder, skip } = parsePaginationParams(searchParams);
    const categoryId = searchParams.get("categoryId");

    // Build where clause
    const where = {
      tenantId: user.tenantId,
      ...(search && {
        OR: [
          { name: { contains: search } },
          { modelNumber: { contains: search } },
          { sku: { contains: search } },
        ],
      }),
      ...(categoryId && { categoryId: parseInt(categoryId) }),
    };

    // Get total count
    const total = await prisma.product.count({ where });

    // Get products with pagination
    const products = await prisma.product.findMany({
      where,
      include: {
        category: {
          select: { id: true, name: true },
        },
        _count: {
          select: { warrantyCards: true },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    });

    return successResponse(products, calculatePaginationMeta(total, page, limit));
  } catch (error) {
    console.error("Error fetching products:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch products", "SERVER_ERROR", 500);
  }
}

// POST /api/products - Create new product
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Check permission
    if (!user.permissions.includes("products.create")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const body = await request.json();
    const validatedData = createProductSchema.parse(body);

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

    // Create product
    const newProduct = await prisma.product.create({
      data: {
        tenantId: user.tenantId,
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

    return successResponse(newProduct);
  } catch (error) {
    console.error("Error creating product:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to create product", "SERVER_ERROR", 500);
  }
}
