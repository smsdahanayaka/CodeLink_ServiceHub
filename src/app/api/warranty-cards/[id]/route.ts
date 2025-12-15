// ===========================================
// Warranty Cards API - Get, Update, Delete by ID
// ===========================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  handleZodError,
  requireAuth,
} from "@/lib/api-utils";
import { updateWarrantyCardSchema } from "@/lib/validations";
import { ZodError } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/warranty-cards/[id] - Get single warranty card
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const cardId = parseInt(id);

    if (isNaN(cardId)) {
      return errorResponse("Invalid warranty card ID", "INVALID_ID", 400);
    }

    const warrantyCard = await prisma.warrantyCard.findFirst({
      where: {
        id: cardId,
        tenantId: user.tenantId,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            modelNumber: true,
            sku: true,
            warrantyPeriodMonths: true,
            category: { select: { id: true, name: true } },
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            address: true,
            city: true,
            state: true,
          },
        },
        shop: {
          select: {
            id: true,
            name: true,
            code: true,
            phone: true,
            address: true,
          },
        },
        createdByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
        warrantyClaims: {
          select: {
            id: true,
            claimNumber: true,
            currentStatus: true,
            priority: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!warrantyCard) {
      return errorResponse("Warranty card not found", "NOT_FOUND", 404);
    }

    return successResponse(warrantyCard);
  } catch (error) {
    console.error("Error fetching warranty card:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch warranty card", "SERVER_ERROR", 500);
  }
}

// PUT /api/warranty-cards/[id] - Update warranty card
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();

    // Check permission
    if (!user.permissions.includes("warranty_cards.edit")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const { id } = await params;
    const cardId = parseInt(id);

    if (isNaN(cardId)) {
      return errorResponse("Invalid warranty card ID", "INVALID_ID", 400);
    }

    // Check if card exists
    const existingCard = await prisma.warrantyCard.findFirst({
      where: { id: cardId, tenantId: user.tenantId },
      include: { product: { select: { warrantyPeriodMonths: true } } },
    });

    if (!existingCard) {
      return errorResponse("Warranty card not found", "NOT_FOUND", 404);
    }

    const body = await request.json();
    const validatedData = updateWarrantyCardSchema.parse(body);

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (validatedData.serialNumber && validatedData.serialNumber !== existingCard.serialNumber) {
      // Check for duplicate serial number
      const duplicateSerial = await prisma.warrantyCard.findFirst({
        where: {
          tenantId: user.tenantId,
          serialNumber: validatedData.serialNumber,
          id: { not: cardId },
        },
      });
      if (duplicateSerial) {
        return errorResponse("Serial number already registered", "DUPLICATE_SERIAL", 400);
      }
      updateData.serialNumber = validatedData.serialNumber;
    }

    if (validatedData.productId && validatedData.productId !== existingCard.productId) {
      const product = await prisma.product.findFirst({
        where: { id: validatedData.productId, tenantId: user.tenantId },
      });
      if (!product) {
        return errorResponse("Product not found", "PRODUCT_NOT_FOUND", 400);
      }
      updateData.productId = validatedData.productId;

      // Recalculate warranty end date
      const warrantyEndDate = new Date(existingCard.warrantyStartDate);
      warrantyEndDate.setMonth(warrantyEndDate.getMonth() + product.warrantyPeriodMonths);
      updateData.warrantyEndDate = warrantyEndDate;
    }

    if (validatedData.customerId && validatedData.customerId !== existingCard.customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: validatedData.customerId, tenantId: user.tenantId },
      });
      if (!customer) {
        return errorResponse("Customer not found", "CUSTOMER_NOT_FOUND", 400);
      }
      updateData.customerId = validatedData.customerId;
    }

    if (validatedData.shopId && validatedData.shopId !== existingCard.shopId) {
      const shop = await prisma.shop.findFirst({
        where: { id: validatedData.shopId, tenantId: user.tenantId },
      });
      if (!shop) {
        return errorResponse("Shop not found", "SHOP_NOT_FOUND", 400);
      }
      updateData.shopId = validatedData.shopId;
    }

    if (validatedData.purchaseDate) {
      const purchaseDate = new Date(validatedData.purchaseDate);
      updateData.purchaseDate = purchaseDate;
      updateData.warrantyStartDate = purchaseDate;

      // Recalculate warranty end date
      const warrantyEndDate = new Date(purchaseDate);
      warrantyEndDate.setMonth(warrantyEndDate.getMonth() + existingCard.product.warrantyPeriodMonths);
      updateData.warrantyEndDate = warrantyEndDate;
    }

    if (validatedData.invoiceNumber !== undefined) {
      updateData.invoiceNumber = validatedData.invoiceNumber || null;
    }
    if (validatedData.invoiceAmount !== undefined) {
      updateData.invoiceAmount = validatedData.invoiceAmount || null;
    }
    if (validatedData.notes !== undefined) {
      updateData.notes = validatedData.notes || null;
    }

    // Update the warranty card
    const updatedCard = await prisma.warrantyCard.update({
      where: { id: cardId },
      data: updateData,
      include: {
        product: { select: { id: true, name: true, modelNumber: true } },
        customer: { select: { id: true, name: true, phone: true } },
        shop: { select: { id: true, name: true, code: true } },
      },
    });

    return successResponse(updatedCard);
  } catch (error) {
    console.error("Error updating warranty card:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to update warranty card", "SERVER_ERROR", 500);
  }
}

// DELETE /api/warranty-cards/[id] - Void warranty card
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();

    // Check permission
    if (!user.permissions.includes("warranty_cards.void")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const { id } = await params;
    const cardId = parseInt(id);

    if (isNaN(cardId)) {
      return errorResponse("Invalid warranty card ID", "INVALID_ID", 400);
    }

    // Check if card exists
    const existingCard = await prisma.warrantyCard.findFirst({
      where: { id: cardId, tenantId: user.tenantId },
      include: { _count: { select: { warrantyClaims: true } } },
    });

    if (!existingCard) {
      return errorResponse("Warranty card not found", "NOT_FOUND", 404);
    }

    // Check if there are active claims
    if (existingCard._count.warrantyClaims > 0) {
      // Just void the card instead of deleting
      const voidedCard = await prisma.warrantyCard.update({
        where: { id: cardId },
        data: { status: "VOID" },
      });
      return successResponse(voidedCard);
    }

    // Delete the warranty card if no claims
    await prisma.warrantyCard.delete({
      where: { id: cardId },
    });

    return successResponse({ message: "Warranty card deleted successfully" });
  } catch (error) {
    console.error("Error deleting warranty card:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to delete warranty card", "SERVER_ERROR", 500);
  }
}
