// ===========================================
// Shops API - Get, Update, Delete by ID
// ===========================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  handleZodError,
  requireAuth,
} from "@/lib/api-utils";
import { updateShopSchema } from "@/lib/validations";
import { ZodError } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/shops/[id] - Get shop by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const shop = await prisma.shop.findFirst({
      where: {
        id: parseInt(id),
        tenantId: user.tenantId,
      },
      include: {
        _count: {
          select: { customers: true, warrantyCards: true },
        },
      },
    });

    if (!shop) {
      return errorResponse("Shop not found", "NOT_FOUND", 404);
    }

    return successResponse(shop);
  } catch (error) {
    console.error("Error fetching shop:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch shop", "SERVER_ERROR", 500);
  }
}

// PUT /api/shops/[id] - Update shop
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const shopId = parseInt(id);

    // Check permission
    if (!user.permissions.includes("shops.edit")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    // Check if shop exists
    const existingShop = await prisma.shop.findFirst({
      where: {
        id: shopId,
        tenantId: user.tenantId,
      },
    });

    if (!existingShop) {
      return errorResponse("Shop not found", "NOT_FOUND", 404);
    }

    const body = await request.json();
    const validatedData = updateShopSchema.parse(body);

    // Check if code is taken by another shop
    if (validatedData.code && validatedData.code !== existingShop.code) {
      const codeExists = await prisma.shop.findFirst({
        where: {
          tenantId: user.tenantId,
          code: validatedData.code,
          id: { not: shopId },
        },
      });

      if (codeExists) {
        return errorResponse("Shop code already exists", "DUPLICATE_CODE", 400);
      }
    }

    // Update shop
    const updatedShop = await prisma.shop.update({
      where: { id: shopId },
      data: {
        code: validatedData.code || null,
        name: validatedData.name,
        email: validatedData.email || null,
        phone: validatedData.phone || null,
        address: validatedData.address || null,
        city: validatedData.city || null,
        state: validatedData.state || null,
        postalCode: validatedData.postalCode || null,
        country: validatedData.country,
        contactPerson: validatedData.contactPerson || null,
        contactPhone: validatedData.contactPhone || null,
        gstNumber: validatedData.gstNumber || null,
        status: validatedData.status,
        notes: validatedData.notes || null,
      },
    });

    return successResponse(updatedShop);
  } catch (error) {
    console.error("Error updating shop:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to update shop", "SERVER_ERROR", 500);
  }
}

// DELETE /api/shops/[id] - Delete shop
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const shopId = parseInt(id);

    // Check permission
    if (!user.permissions.includes("shops.delete")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    // Check if shop exists
    const existingShop = await prisma.shop.findFirst({
      where: {
        id: shopId,
        tenantId: user.tenantId,
      },
      include: {
        _count: {
          select: { customers: true, warrantyCards: true },
        },
      },
    });

    if (!existingShop) {
      return errorResponse("Shop not found", "NOT_FOUND", 404);
    }

    // Check for related data
    if (existingShop._count.warrantyCards > 0) {
      return errorResponse(
        "Cannot delete shop with warranty cards",
        "SHOP_HAS_WARRANTY_CARDS",
        400
      );
    }

    // Delete shop
    await prisma.shop.delete({
      where: { id: shopId },
    });

    return successResponse({ message: "Shop deleted successfully" });
  } catch (error) {
    console.error("Error deleting shop:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to delete shop", "SERVER_ERROR", 500);
  }
}
