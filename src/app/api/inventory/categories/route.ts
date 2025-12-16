// ===========================================
// Inventory Categories API - List and Create
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

// Validation schema
const createInventoryCategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional(),
  parentId: z.number().int().positive().optional(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

// GET /api/inventory/categories - List all inventory categories
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const { page, limit, search, sortBy, sortOrder, skip } = parsePaginationParams(searchParams);
    const parentOnly = searchParams.get("parentOnly") === "true";
    const includeInactive = searchParams.get("includeInactive") === "true";

    // Build where clause
    const where = {
      tenantId: user.tenantId,
      ...(search && {
        name: { contains: search },
      }),
      ...(parentOnly && { parentId: null }),
      ...(!includeInactive && { isActive: true }),
    };

    // Get total count
    const total = await prisma.inventoryCategory.count({ where });

    // Get categories with pagination
    const categories = await prisma.inventoryCategory.findMany({
      where,
      include: {
        parent: {
          select: { id: true, name: true },
        },
        children: {
          select: { id: true, name: true, isActive: true },
          where: includeInactive ? {} : { isActive: true },
        },
        _count: {
          select: { items: true },
        },
      },
      orderBy: sortBy === "name" ? { name: sortOrder } : { sortOrder: sortOrder },
      skip,
      take: limit,
    });

    return successResponse(categories, calculatePaginationMeta(total, page, limit));
  } catch (error) {
    console.error("Error fetching inventory categories:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch inventory categories", "SERVER_ERROR", 500);
  }
}

// POST /api/inventory/categories - Create new inventory category
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Check permission
    if (!user.permissions.includes("inventory.create")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const body = await request.json();
    const validatedData = createInventoryCategorySchema.parse(body);

    // Check if parent exists
    if (validatedData.parentId) {
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

    // Create category
    const newCategory = await prisma.inventoryCategory.create({
      data: {
        tenantId: user.tenantId,
        name: validatedData.name,
        description: validatedData.description || null,
        parentId: validatedData.parentId || null,
        sortOrder: validatedData.sortOrder,
        isActive: validatedData.isActive,
      },
      include: {
        parent: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
    });

    return successResponse(newCategory);
  } catch (error) {
    console.error("Error creating inventory category:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to create inventory category", "SERVER_ERROR", 500);
  }
}
