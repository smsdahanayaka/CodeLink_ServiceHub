// ===========================================
// Claim Part API - Update, Delete, Issue
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

// Validation schema for update
const updateClaimPartSchema = z.object({
  quantity: z.number().min(0.01).optional(),
  unitPrice: z.number().min(0).optional(),
  isWarrantyCovered: z.boolean().optional(),
  notes: z.string().optional(),
});

// GET /api/claims/[id]/parts/[partId] - Get single part
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; partId: string }> }
) {
  try {
    const user = await requireAuth();
    const { id, partId } = await params;

    // Verify claim belongs to tenant
    const claim = await prisma.warrantyClaim.findFirst({
      where: {
        id: parseInt(id),
        tenantId: user.tenantId,
      },
    });

    if (!claim) {
      return errorResponse("Claim not found", "NOT_FOUND", 404);
    }

    const part = await prisma.claimPart.findFirst({
      where: {
        id: parseInt(partId),
        claimId: parseInt(id),
      },
      include: {
        inventoryItem: {
          select: { id: true, sku: true, name: true, quantity: true, sellingPrice: true },
        },
        issuedByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
        createdByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!part) {
      return errorResponse("Part not found", "NOT_FOUND", 404);
    }

    return successResponse(part);
  } catch (error) {
    console.error("Error fetching claim part:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch claim part", "SERVER_ERROR", 500);
  }
}

// PUT /api/claims/[id]/parts/[partId] - Update part
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; partId: string }> }
) {
  try {
    const user = await requireAuth();
    const { id, partId } = await params;

    if (!user.permissions.includes("claims.edit")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const body = await request.json();
    const validatedData = updateClaimPartSchema.parse(body);

    // Verify claim belongs to tenant
    const claim = await prisma.warrantyClaim.findFirst({
      where: {
        id: parseInt(id),
        tenantId: user.tenantId,
      },
    });

    if (!claim) {
      return errorResponse("Claim not found", "NOT_FOUND", 404);
    }

    // Get existing part
    const existingPart = await prisma.claimPart.findFirst({
      where: {
        id: parseInt(partId),
        claimId: parseInt(id),
      },
      include: {
        inventoryItem: true,
      },
    });

    if (!existingPart) {
      return errorResponse("Part not found", "NOT_FOUND", 404);
    }

    // If already issued, cannot modify
    if (existingPart.isIssued) {
      return errorResponse("Cannot modify issued part", "ALREADY_ISSUED", 400);
    }

    // Handle quantity change for inventory items
    if (validatedData.quantity !== undefined && existingPart.partType === "INVENTORY" && existingPart.inventoryItem) {
      const quantityDiff = validatedData.quantity - Number(existingPart.quantity);

      if (quantityDiff > 0) {
        // Need more stock
        const availableQty = Number(existingPart.inventoryItem.quantity) - Number(existingPart.inventoryItem.reservedQuantity);
        if (quantityDiff > availableQty) {
          return errorResponse(
            `Insufficient stock. Only ${availableQty} more available.`,
            "INSUFFICIENT_STOCK",
            400
          );
        }
      }
    }

    // Calculate new total
    const newQuantity = validatedData.quantity ?? Number(existingPart.quantity);
    const newUnitPrice = validatedData.unitPrice ?? Number(existingPart.unitPrice);
    const newTotalPrice = newQuantity * newUnitPrice;

    // Update part and inventory in transaction
    const updatedPart = await prisma.$transaction(async (tx) => {
      // Handle inventory quantity change
      if (
        validatedData.quantity !== undefined &&
        existingPart.partType === "INVENTORY" &&
        existingPart.inventoryItem
      ) {
        const quantityDiff = validatedData.quantity - Number(existingPart.quantity);

        if (quantityDiff !== 0) {
          const currentQty = Number(existingPart.inventoryItem.quantity);
          const newQty = currentQty - quantityDiff;

          await tx.inventoryItem.update({
            where: { id: existingPart.inventoryItem.id },
            data: { quantity: newQty },
          });

          // Create adjustment transaction
          await tx.inventoryTransaction.create({
            data: {
              tenantId: user.tenantId,
              itemId: existingPart.inventoryItem.id,
              transactionType: quantityDiff > 0 ? "STOCK_OUT" : "RETURN",
              quantity: -quantityDiff,
              previousQuantity: currentQty,
              newQuantity: newQty,
              referenceType: "CLAIM",
              referenceId: parseInt(id),
              notes: `Quantity adjustment for claim ${claim.claimNumber}`,
              createdBy: user.id,
            },
          });
        }
      }

      // Update part
      const part = await tx.claimPart.update({
        where: { id: parseInt(partId) },
        data: {
          ...(validatedData.quantity !== undefined && { quantity: validatedData.quantity }),
          ...(validatedData.unitPrice !== undefined && { unitPrice: validatedData.unitPrice }),
          ...(validatedData.isWarrantyCovered !== undefined && { isWarrantyCovered: validatedData.isWarrantyCovered }),
          ...(validatedData.notes !== undefined && { notes: validatedData.notes }),
          totalPrice: newTotalPrice,
        },
        include: {
          inventoryItem: {
            select: { id: true, sku: true, name: true },
          },
          createdByUser: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });

      return part;
    });

    return successResponse(updatedPart);
  } catch (error) {
    console.error("Error updating claim part:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to update claim part", "SERVER_ERROR", 500);
  }
}

// DELETE /api/claims/[id]/parts/[partId] - Remove part
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; partId: string }> }
) {
  try {
    const user = await requireAuth();
    const { id, partId } = await params;

    if (!user.permissions.includes("claims.edit")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    // Verify claim belongs to tenant
    const claim = await prisma.warrantyClaim.findFirst({
      where: {
        id: parseInt(id),
        tenantId: user.tenantId,
      },
    });

    if (!claim) {
      return errorResponse("Claim not found", "NOT_FOUND", 404);
    }

    // Get existing part
    const existingPart = await prisma.claimPart.findFirst({
      where: {
        id: parseInt(partId),
        claimId: parseInt(id),
      },
      include: {
        inventoryItem: true,
      },
    });

    if (!existingPart) {
      return errorResponse("Part not found", "NOT_FOUND", 404);
    }

    // If already issued, cannot delete
    if (existingPart.isIssued) {
      return errorResponse("Cannot delete issued part", "ALREADY_ISSUED", 400);
    }

    // Delete part and restore inventory in transaction
    await prisma.$transaction(async (tx) => {
      // Restore inventory if from inventory
      if (existingPart.partType === "INVENTORY" && existingPart.inventoryItem) {
        const currentQty = Number(existingPart.inventoryItem.quantity);
        const restoredQty = Number(existingPart.quantity);
        const newQty = currentQty + restoredQty;

        await tx.inventoryItem.update({
          where: { id: existingPart.inventoryItem.id },
          data: { quantity: newQty },
        });

        // Create return transaction
        await tx.inventoryTransaction.create({
          data: {
            tenantId: user.tenantId,
            itemId: existingPart.inventoryItem.id,
            transactionType: "RETURN",
            quantity: restoredQty,
            previousQuantity: currentQty,
            newQuantity: newQty,
            referenceType: "CLAIM",
            referenceId: parseInt(id),
            notes: `Removed from claim ${claim.claimNumber}`,
            createdBy: user.id,
          },
        });
      }

      // Delete part
      await tx.claimPart.delete({
        where: { id: parseInt(partId) },
      });
    });

    return successResponse({ message: "Part removed successfully" });
  } catch (error) {
    console.error("Error deleting claim part:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to delete claim part", "SERVER_ERROR", 500);
  }
}
