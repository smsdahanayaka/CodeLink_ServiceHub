// ===========================================
// Inventory Item Stock Adjustment API
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
const adjustStockSchema = z.object({
  adjustmentType: z.enum(["ADD", "REMOVE", "SET"]),
  quantity: z.number().min(0, "Quantity must be positive"),
  reason: z.string().min(1, "Reason is required").max(500),
  unitCost: z.number().min(0).optional(),
});

// POST /api/inventory/items/[id]/adjust - Adjust stock level
export async function POST(
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
    const validatedData = adjustStockSchema.parse(body);

    // Get current item
    const item = await prisma.inventoryItem.findFirst({
      where: {
        id: parseInt(id),
        tenantId: user.tenantId,
      },
    });

    if (!item) {
      return errorResponse("Item not found", "NOT_FOUND", 404);
    }

    const currentQuantity = Number(item.quantity);
    let newQuantity: number;
    let transactionQuantity: number;
    let transactionType: "STOCK_IN" | "STOCK_OUT" | "ADJUSTMENT";

    switch (validatedData.adjustmentType) {
      case "ADD":
        newQuantity = currentQuantity + validatedData.quantity;
        transactionQuantity = validatedData.quantity;
        transactionType = "STOCK_IN";
        break;
      case "REMOVE":
        if (validatedData.quantity > currentQuantity) {
          return errorResponse(
            `Cannot remove ${validatedData.quantity}. Only ${currentQuantity} available.`,
            "INSUFFICIENT_STOCK",
            400
          );
        }
        newQuantity = currentQuantity - validatedData.quantity;
        transactionQuantity = -validatedData.quantity;
        transactionType = "STOCK_OUT";
        break;
      case "SET":
        newQuantity = validatedData.quantity;
        transactionQuantity = validatedData.quantity - currentQuantity;
        transactionType = "ADJUSTMENT";
        break;
      default:
        return errorResponse("Invalid adjustment type", "INVALID_TYPE", 400);
    }

    // Update item and create transaction
    const updatedItem = await prisma.$transaction(async (tx) => {
      // Create transaction record
      await tx.inventoryTransaction.create({
        data: {
          tenantId: user.tenantId,
          itemId: parseInt(id),
          transactionType,
          quantity: transactionQuantity,
          previousQuantity: currentQuantity,
          newQuantity,
          unitCost: validatedData.unitCost || Number(item.costPrice),
          totalCost: Math.abs(transactionQuantity) * (validatedData.unitCost || Number(item.costPrice)),
          notes: `${validatedData.adjustmentType}: ${validatedData.reason}`,
          createdBy: user.id,
        },
      });

      // Update item quantity
      const updated = await tx.inventoryItem.update({
        where: { id: parseInt(id) },
        data: { quantity: newQuantity },
        include: {
          category: { select: { id: true, name: true } },
        },
      });

      return updated;
    });

    return successResponse({
      ...updatedItem,
      availableQuantity: Number(updatedItem.quantity) - Number(updatedItem.reservedQuantity),
      adjustment: {
        type: validatedData.adjustmentType,
        previousQuantity: currentQuantity,
        newQuantity,
        change: transactionQuantity,
      },
    });
  } catch (error) {
    console.error("Error adjusting inventory:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to adjust inventory", "SERVER_ERROR", 500);
  }
}
