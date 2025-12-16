// ===========================================
// Inventory Items API - List and Create
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
import { Prisma } from "@prisma/client";

// Validation schema
const createInventoryItemSchema = z.object({
  sku: z.string().min(1, "SKU is required").max(100),
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional(),
  categoryId: z.number().int().positive().optional(),
  quantity: z.number().min(0).default(0),
  reorderLevel: z.number().min(0).default(0),
  reorderQuantity: z.number().min(0).default(0),
  costPrice: z.number().min(0).default(0),
  sellingPrice: z.number().min(0).default(0),
  unit: z.string().max(50).default("pcs"),
  location: z.string().max(255).optional(),
  supplier: z.string().max(255).optional(),
  barcode: z.string().max(100).optional(),
  isActive: z.boolean().default(true),
});

// GET /api/inventory/items - List all inventory items
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const { page, limit, search, sortBy, sortOrder, skip } = parsePaginationParams(searchParams);
    const categoryId = searchParams.get("categoryId");
    const lowStock = searchParams.get("lowStock") === "true";
    const includeInactive = searchParams.get("includeInactive") === "true";

    // Build where clause
    const where: Prisma.InventoryItemWhereInput = {
      tenantId: user.tenantId,
      ...(search && {
        OR: [
          { name: { contains: search } },
          { sku: { contains: search } },
          { barcode: { contains: search } },
          { description: { contains: search } },
        ],
      }),
      ...(categoryId && { categoryId: parseInt(categoryId) }),
      ...(!includeInactive && { isActive: true }),
    };

    // Low stock filter
    if (lowStock) {
      where.AND = [
        { reorderLevel: { gt: 0 } },
        {
          quantity: {
            lte: prisma.inventoryItem.fields.reorderLevel,
          },
        },
      ];
    }

    // Get total count
    const total = await prisma.inventoryItem.count({ where });

    // Get items with pagination
    const items = await prisma.inventoryItem.findMany({
      where,
      include: {
        category: {
          select: { id: true, name: true },
        },
        _count: {
          select: { transactions: true, claimParts: true },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    });

    // Calculate available quantity for each item
    const itemsWithAvailable = items.map((item) => ({
      ...item,
      availableQuantity: Number(item.quantity) - Number(item.reservedQuantity),
      isLowStock: Number(item.reorderLevel) > 0 && Number(item.quantity) <= Number(item.reorderLevel),
    }));

    return successResponse(itemsWithAvailable, calculatePaginationMeta(total, page, limit));
  } catch (error) {
    console.error("Error fetching inventory items:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch inventory items", "SERVER_ERROR", 500);
  }
}

// POST /api/inventory/items - Create new inventory item
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Check permission
    if (!user.permissions.includes("inventory.create")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const body = await request.json();
    const validatedData = createInventoryItemSchema.parse(body);

    // Check if SKU already exists
    const existingSku = await prisma.inventoryItem.findFirst({
      where: {
        tenantId: user.tenantId,
        sku: validatedData.sku,
      },
    });

    if (existingSku) {
      return errorResponse("SKU already exists", "DUPLICATE_SKU", 400);
    }

    // Check if category exists
    if (validatedData.categoryId) {
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

    // Create item with initial stock transaction if quantity > 0
    const newItem = await prisma.$transaction(async (tx) => {
      // Create inventory item
      const item = await tx.inventoryItem.create({
        data: {
          tenantId: user.tenantId,
          sku: validatedData.sku,
          name: validatedData.name,
          description: validatedData.description || null,
          categoryId: validatedData.categoryId || null,
          quantity: validatedData.quantity,
          reservedQuantity: 0,
          reorderLevel: validatedData.reorderLevel,
          reorderQuantity: validatedData.reorderQuantity,
          costPrice: validatedData.costPrice,
          sellingPrice: validatedData.sellingPrice,
          unit: validatedData.unit,
          location: validatedData.location || null,
          supplier: validatedData.supplier || null,
          barcode: validatedData.barcode || null,
          isActive: validatedData.isActive,
        },
        include: {
          category: { select: { id: true, name: true } },
        },
      });

      // Create initial stock transaction if quantity > 0
      if (validatedData.quantity > 0) {
        await tx.inventoryTransaction.create({
          data: {
            tenantId: user.tenantId,
            itemId: item.id,
            transactionType: "STOCK_IN",
            quantity: validatedData.quantity,
            previousQuantity: 0,
            newQuantity: validatedData.quantity,
            unitCost: validatedData.costPrice,
            totalCost: validatedData.quantity * validatedData.costPrice,
            notes: "Initial stock",
            createdBy: user.id,
          },
        });
      }

      return item;
    });

    return successResponse(newItem);
  } catch (error) {
    console.error("Error creating inventory item:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to create inventory item", "SERVER_ERROR", 500);
  }
}
