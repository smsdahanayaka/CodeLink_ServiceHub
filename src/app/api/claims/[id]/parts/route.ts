// ===========================================
// Claim Parts API - List and Add Parts
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
const addClaimPartSchema = z.object({
  partType: z.enum(["INVENTORY", "MANUAL"]),
  inventoryItemId: z.number().int().positive().optional(),
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional(),
  sku: z.string().max(100).optional(),
  quantity: z.number().min(0.01, "Quantity must be greater than 0"),
  unitPrice: z.number().min(0),
  isWarrantyCovered: z.boolean().default(false),
  isNewItemIssue: z.boolean().default(false),
  notes: z.string().optional(),
});

// GET /api/claims/[id]/parts - List all parts for a claim
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    // Verify claim belongs to tenant
    const claim = await prisma.warrantyClaim.findFirst({
      where: {
        id: parseInt(id),
        tenantId: user.tenantId,
      },
      select: { id: true, claimNumber: true },
    });

    if (!claim) {
      return errorResponse("Claim not found", "NOT_FOUND", 404);
    }

    // Get parts
    const parts = await prisma.claimPart.findMany({
      where: { claimId: parseInt(id) },
      include: {
        inventoryItem: {
          select: { id: true, sku: true, name: true, quantity: true },
        },
        issuedByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
        createdByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Calculate totals
    const summary = {
      totalParts: parts.length,
      totalAmount: parts.reduce((sum, p) => sum + Number(p.totalPrice), 0),
      warrantyCoveredAmount: parts
        .filter((p) => p.isWarrantyCovered)
        .reduce((sum, p) => sum + Number(p.totalPrice), 0),
      customerChargedAmount: parts
        .filter((p) => !p.isWarrantyCovered)
        .reduce((sum, p) => sum + Number(p.totalPrice), 0),
      pendingIssueCount: parts.filter((p) => p.isNewItemIssue && !p.isIssued).length,
    };

    return successResponse({ parts, summary });
  } catch (error) {
    console.error("Error fetching claim parts:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch claim parts", "SERVER_ERROR", 500);
  }
}

// POST /api/claims/[id]/parts - Add part to claim
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    if (!user.permissions.includes("claims.edit")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const body = await request.json();
    const validatedData = addClaimPartSchema.parse(body);

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

    let inventoryItem = null;
    let unitCost = 0;

    // If from inventory, validate and get item details
    if (validatedData.partType === "INVENTORY" && validatedData.inventoryItemId) {
      inventoryItem = await prisma.inventoryItem.findFirst({
        where: {
          id: validatedData.inventoryItemId,
          tenantId: user.tenantId,
          isActive: true,
        },
      });

      if (!inventoryItem) {
        return errorResponse("Inventory item not found", "ITEM_NOT_FOUND", 400);
      }

      // Check available quantity
      const availableQty = Number(inventoryItem.quantity) - Number(inventoryItem.reservedQuantity);
      if (validatedData.quantity > availableQty) {
        return errorResponse(
          `Insufficient stock. Only ${availableQty} available.`,
          "INSUFFICIENT_STOCK",
          400
        );
      }

      unitCost = Number(inventoryItem.costPrice);
    }

    // Calculate total price
    const totalPrice = validatedData.quantity * validatedData.unitPrice;

    // Create part and update inventory in transaction
    const newPart = await prisma.$transaction(async (tx) => {
      // Create claim part
      const part = await tx.claimPart.create({
        data: {
          claimId: parseInt(id),
          partType: validatedData.partType,
          inventoryItemId: validatedData.inventoryItemId || null,
          name: validatedData.name,
          description: validatedData.description || null,
          sku: validatedData.sku || inventoryItem?.sku || null,
          quantity: validatedData.quantity,
          unitCost,
          unitPrice: validatedData.unitPrice,
          totalPrice,
          isWarrantyCovered: validatedData.isWarrantyCovered,
          isNewItemIssue: validatedData.isNewItemIssue,
          notes: validatedData.notes || null,
          createdBy: user.id,
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

      // Deduct from inventory if from inventory
      if (validatedData.partType === "INVENTORY" && inventoryItem) {
        const currentQty = Number(inventoryItem.quantity);
        const newQty = currentQty - validatedData.quantity;

        await tx.inventoryItem.update({
          where: { id: inventoryItem.id },
          data: { quantity: newQty },
        });

        // Create inventory transaction
        await tx.inventoryTransaction.create({
          data: {
            tenantId: user.tenantId,
            itemId: inventoryItem.id,
            transactionType: "STOCK_OUT",
            quantity: -validatedData.quantity,
            previousQuantity: currentQty,
            newQuantity: newQty,
            unitCost,
            totalCost: validatedData.quantity * unitCost,
            referenceType: "CLAIM",
            referenceId: parseInt(id),
            notes: `Used in claim ${claim.claimNumber}`,
            createdBy: user.id,
          },
        });
      }

      return part;
    });

    return successResponse(newPart);
  } catch (error) {
    console.error("Error adding claim part:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to add claim part", "SERVER_ERROR", 500);
  }
}
