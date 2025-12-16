// ===========================================
// Claim Quotation API - Get, Create, Update
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

// Validation schema for quotation item
const quotationItemSchema = z.object({
  itemType: z.enum(["PART", "SERVICE", "LABOR", "OTHER"]),
  inventoryItemId: z.number().int().positive().optional(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  sku: z.string().max(100).optional(),
  quantity: z.number().min(0.01),
  unitPrice: z.number().min(0),
  isWarrantyCovered: z.boolean().default(false),
  warrantyNotes: z.string().optional(),
});

// Validation schema for quotation creation
const createQuotationSchema = z.object({
  items: z.array(quotationItemSchema).min(1, "At least one item is required"),
  taxRate: z.number().min(0).max(100).default(0),
  discountType: z.enum(["PERCENTAGE", "FIXED"]).optional(),
  discountValue: z.number().min(0).default(0),
  validUntil: z.string().datetime().optional(),
  notes: z.string().optional(),
  termsAndConditions: z.string().optional(),
});

// Validation schema for quotation update
const updateQuotationSchema = z.object({
  items: z.array(quotationItemSchema).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  discountType: z.enum(["PERCENTAGE", "FIXED"]).nullable().optional(),
  discountValue: z.number().min(0).optional(),
  validUntil: z.string().datetime().nullable().optional(),
  notes: z.string().optional(),
  termsAndConditions: z.string().optional(),
});

// Generate quotation number
async function generateQuotationNumber(tenantId: number): Promise<string> {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const prefix = `QT${year}${month}`;

  const lastQuotation = await prisma.claimQuotation.findFirst({
    where: {
      tenantId,
      quotationNumber: { startsWith: prefix },
    },
    orderBy: { quotationNumber: "desc" },
  });

  let sequence = 1;
  if (lastQuotation) {
    const lastSequence = parseInt(lastQuotation.quotationNumber.slice(-6));
    sequence = lastSequence + 1;
  }

  return `${prefix}${sequence.toString().padStart(6, "0")}`;
}

// Calculate quotation totals
function calculateTotals(
  items: { quantity: number; unitPrice: number; isWarrantyCovered: boolean }[],
  taxRate: number,
  discountType: "PERCENTAGE" | "FIXED" | null | undefined,
  discountValue: number
) {
  // Only charge for non-warranty covered items
  const subtotal = items
    .filter((item) => !item.isWarrantyCovered)
    .reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  let discountAmount = 0;
  if (discountType && discountValue > 0) {
    if (discountType === "PERCENTAGE") {
      discountAmount = (subtotal * discountValue) / 100;
    } else {
      discountAmount = Math.min(discountValue, subtotal);
    }
  }

  const taxableAmount = subtotal - discountAmount;
  const taxAmount = (taxableAmount * taxRate) / 100;
  const totalAmount = taxableAmount + taxAmount;

  return { subtotal, discountAmount, taxAmount, totalAmount };
}

// GET /api/claims/[id]/quotation - Get claim quotations
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

    // Get quotations
    const quotations = await prisma.claimQuotation.findMany({
      where: { claimId: parseInt(id) },
      include: {
        items: {
          include: {
            inventoryItem: {
              select: { id: true, sku: true, name: true, quantity: true },
            },
          },
          orderBy: { sortOrder: "asc" },
        },
        createdByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
        invoice: {
          select: { id: true, invoiceNumber: true, status: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Get the latest/active quotation
    const activeQuotation = quotations.find(
      (q) => q.status === "APPROVED" || q.status === "SENT" || q.status === "DRAFT"
    );

    return successResponse({
      quotations,
      activeQuotation,
    });
  } catch (error) {
    console.error("Error fetching quotations:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch quotations", "SERVER_ERROR", 500);
  }
}

// POST /api/claims/[id]/quotation - Create quotation
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
    const validatedData = createQuotationSchema.parse(body);

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

    // Check if there's already an approved quotation
    const existingApproved = await prisma.claimQuotation.findFirst({
      where: {
        claimId: parseInt(id),
        status: "APPROVED",
      },
    });

    if (existingApproved) {
      return errorResponse(
        "An approved quotation already exists for this claim",
        "QUOTATION_EXISTS",
        400
      );
    }

    // Calculate totals
    const { subtotal, discountAmount, taxAmount, totalAmount } = calculateTotals(
      validatedData.items,
      validatedData.taxRate,
      validatedData.discountType,
      validatedData.discountValue
    );

    // Generate quotation number
    const quotationNumber = await generateQuotationNumber(user.tenantId);

    // Create quotation with items
    const quotation = await prisma.$transaction(async (tx) => {
      // Create quotation
      const newQuotation = await tx.claimQuotation.create({
        data: {
          tenantId: user.tenantId,
          claimId: parseInt(id),
          quotationNumber,
          status: "DRAFT",
          subtotal,
          taxRate: validatedData.taxRate,
          taxAmount,
          discountType: validatedData.discountType || null,
          discountValue: validatedData.discountValue,
          discountAmount,
          totalAmount,
          validUntil: validatedData.validUntil ? new Date(validatedData.validUntil) : null,
          notes: validatedData.notes || null,
          termsAndConditions: validatedData.termsAndConditions || null,
          createdBy: user.id,
        },
      });

      // Create quotation items
      for (let i = 0; i < validatedData.items.length; i++) {
        const item = validatedData.items[i];
        await tx.quotationItem.create({
          data: {
            quotationId: newQuotation.id,
            itemType: item.itemType,
            inventoryItemId: item.inventoryItemId || null,
            name: item.name,
            description: item.description || null,
            sku: item.sku || null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
            isWarrantyCovered: item.isWarrantyCovered,
            warrantyNotes: item.warrantyNotes || null,
            sortOrder: i,
          },
        });
      }

      // Add to claim history
      await tx.claimHistory.create({
        data: {
          claimId: parseInt(id),
          fromStatus: claim.currentStatus,
          toStatus: claim.currentStatus,
          actionType: "QUOTATION_CREATED",
          performedBy: user.id,
          notes: `Quotation ${quotationNumber} created. Total: ${totalAmount.toFixed(2)}`,
        },
      });

      return newQuotation;
    });

    // Fetch complete quotation
    const completeQuotation = await prisma.claimQuotation.findUnique({
      where: { id: quotation.id },
      include: {
        items: {
          include: {
            inventoryItem: {
              select: { id: true, sku: true, name: true },
            },
          },
          orderBy: { sortOrder: "asc" },
        },
        createdByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return successResponse(completeQuotation);
  } catch (error) {
    console.error("Error creating quotation:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to create quotation", "SERVER_ERROR", 500);
  }
}

// PUT /api/claims/[id]/quotation - Update quotation
export async function PUT(
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
    const quotationId = body.quotationId;
    const validatedData = updateQuotationSchema.parse(body);

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

    // Get existing quotation
    const existing = await prisma.claimQuotation.findFirst({
      where: {
        id: quotationId,
        claimId: parseInt(id),
      },
      include: { items: true },
    });

    if (!existing) {
      return errorResponse("Quotation not found", "NOT_FOUND", 404);
    }

    // Cannot update approved/converted quotation
    if (["APPROVED", "CONVERTED"].includes(existing.status)) {
      return errorResponse(
        "Cannot update approved or converted quotation",
        "QUOTATION_LOCKED",
        400
      );
    }

    // Calculate new totals if items are updated
    let updateData: any = {};

    if (validatedData.items) {
      const { subtotal, discountAmount, taxAmount, totalAmount } = calculateTotals(
        validatedData.items,
        validatedData.taxRate ?? Number(existing.taxRate),
        validatedData.discountType !== undefined ? validatedData.discountType : existing.discountType,
        validatedData.discountValue ?? Number(existing.discountValue)
      );

      updateData = {
        subtotal,
        taxAmount,
        discountAmount,
        totalAmount,
      };
    } else if (
      validatedData.taxRate !== undefined ||
      validatedData.discountType !== undefined ||
      validatedData.discountValue !== undefined
    ) {
      // Recalculate with existing items
      const items = existing.items.map((item) => ({
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        isWarrantyCovered: item.isWarrantyCovered,
      }));

      const { subtotal, discountAmount, taxAmount, totalAmount } = calculateTotals(
        items,
        validatedData.taxRate ?? Number(existing.taxRate),
        validatedData.discountType !== undefined ? validatedData.discountType : existing.discountType,
        validatedData.discountValue ?? Number(existing.discountValue)
      );

      updateData = {
        subtotal,
        taxAmount,
        discountAmount,
        totalAmount,
      };
    }

    // Add other fields
    if (validatedData.taxRate !== undefined) updateData.taxRate = validatedData.taxRate;
    if (validatedData.discountType !== undefined) updateData.discountType = validatedData.discountType;
    if (validatedData.discountValue !== undefined) updateData.discountValue = validatedData.discountValue;
    if (validatedData.validUntil !== undefined) {
      updateData.validUntil = validatedData.validUntil ? new Date(validatedData.validUntil) : null;
    }
    if (validatedData.notes !== undefined) updateData.notes = validatedData.notes;
    if (validatedData.termsAndConditions !== undefined) updateData.termsAndConditions = validatedData.termsAndConditions;

    // Update quotation and items in transaction
    const updatedQuotation = await prisma.$transaction(async (tx) => {
      // Update items if provided
      if (validatedData.items) {
        // Delete existing items
        await tx.quotationItem.deleteMany({
          where: { quotationId: existing.id },
        });

        // Create new items
        for (let i = 0; i < validatedData.items.length; i++) {
          const item = validatedData.items[i];
          await tx.quotationItem.create({
            data: {
              quotationId: existing.id,
              itemType: item.itemType,
              inventoryItemId: item.inventoryItemId || null,
              name: item.name,
              description: item.description || null,
              sku: item.sku || null,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.quantity * item.unitPrice,
              isWarrantyCovered: item.isWarrantyCovered,
              warrantyNotes: item.warrantyNotes || null,
              sortOrder: i,
            },
          });
        }
      }

      // Update quotation
      return await tx.claimQuotation.update({
        where: { id: existing.id },
        data: updateData,
        include: {
          items: {
            include: {
              inventoryItem: {
                select: { id: true, sku: true, name: true },
              },
            },
            orderBy: { sortOrder: "asc" },
          },
          createdByUser: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });
    });

    return successResponse(updatedQuotation);
  } catch (error) {
    console.error("Error updating quotation:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to update quotation", "SERVER_ERROR", 500);
  }
}
