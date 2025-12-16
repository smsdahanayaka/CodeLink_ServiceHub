// ===========================================
// Collection Trip Items API - Add/Remove Items
// ===========================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  handleZodError,
  requireAuth,
} from "@/lib/api-utils";
import { addCollectionItemSchema } from "@/lib/validations";
import { ZodError } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/logistics/collection-trips/[id]/items - Add item to trip
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const tripId = parseInt(id);

    if (isNaN(tripId)) {
      return errorResponse("Invalid trip ID", "INVALID_ID", 400);
    }

    // Check permission
    if (!user.permissions.includes("logistics.create_collection")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const body = await request.json();
    const validatedData = addCollectionItemSchema.parse(body);

    // Get existing trip
    const existingTrip = await prisma.collectionTrip.findFirst({
      where: {
        id: tripId,
        tenantId: user.tenantId,
      },
    });

    if (!existingTrip) {
      return errorResponse("Collection trip not found", "NOT_FOUND", 404);
    }

    // Can only add items to IN_PROGRESS trips
    if (existingTrip.status !== "IN_PROGRESS") {
      return errorResponse("Can only add items to trips in progress", "INVALID_STATUS", 400);
    }

    // If warrantyCardId provided, verify it exists and belongs to tenant
    if (validatedData.warrantyCardId) {
      const warrantyCard = await prisma.warrantyCard.findFirst({
        where: {
          id: validatedData.warrantyCardId,
          tenantId: user.tenantId,
        },
      });
      if (!warrantyCard) {
        return errorResponse("Warranty card not found", "WARRANTY_CARD_NOT_FOUND", 400);
      }
    }

    // If productId provided (for unregistered items), verify it exists
    if (validatedData.productId) {
      const product = await prisma.product.findFirst({
        where: {
          id: validatedData.productId,
          tenantId: user.tenantId,
        },
      });
      if (!product) {
        return errorResponse("Product not found", "PRODUCT_NOT_FOUND", 400);
      }
    }

    // Create item
    const item = await prisma.collectionItem.create({
      data: {
        tripId,
        serialNumber: validatedData.serialNumber,
        issueDescription: validatedData.issueDescription,
        warrantyCardId: validatedData.warrantyCardId || null,
        productId: validatedData.productId || null,
        customerName: validatedData.customerName || null,
        customerPhone: validatedData.customerPhone || null,
        notes: validatedData.notes || null,
        status: "COLLECTED",
      },
      include: {
        warrantyCard: {
          select: {
            id: true,
            cardNumber: true,
            product: { select: { name: true } },
          },
        },
        product: { select: { id: true, name: true } },
      },
    });

    return successResponse(item);
  } catch (error) {
    console.error("Error adding collection item:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to add collection item", "SERVER_ERROR", 500);
  }
}

// DELETE /api/logistics/collection-trips/[id]/items - Remove item from trip
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const tripId = parseInt(id);

    if (isNaN(tripId)) {
      return errorResponse("Invalid trip ID", "INVALID_ID", 400);
    }

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("itemId");

    if (!itemId) {
      return errorResponse("Item ID is required", "ITEM_ID_REQUIRED", 400);
    }

    // Check permission
    if (!user.permissions.includes("logistics.create_collection")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    // Get existing trip
    const existingTrip = await prisma.collectionTrip.findFirst({
      where: {
        id: tripId,
        tenantId: user.tenantId,
      },
    });

    if (!existingTrip) {
      return errorResponse("Collection trip not found", "NOT_FOUND", 404);
    }

    // Can only remove items from IN_PROGRESS trips
    if (existingTrip.status !== "IN_PROGRESS") {
      return errorResponse("Can only remove items from trips in progress", "INVALID_STATUS", 400);
    }

    // Get item
    const item = await prisma.collectionItem.findFirst({
      where: {
        id: parseInt(itemId),
        tripId,
      },
    });

    if (!item) {
      return errorResponse("Item not found", "ITEM_NOT_FOUND", 404);
    }

    // Cannot remove processed items
    if (item.status === "PROCESSED") {
      return errorResponse("Cannot remove processed items", "ITEM_PROCESSED", 400);
    }

    // Delete item
    await prisma.collectionItem.delete({
      where: { id: parseInt(itemId) },
    });

    return successResponse({ message: "Item removed successfully" });
  } catch (error) {
    console.error("Error removing collection item:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to remove collection item", "SERVER_ERROR", 500);
  }
}
