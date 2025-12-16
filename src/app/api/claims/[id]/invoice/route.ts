// ===========================================
// Claim Invoice API - Get and Generate
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

// Validation schema for invoice generation
const generateInvoiceSchema = z.object({
  taxRate: z.number().min(0).max(100).default(0),
  discountType: z.enum(["PERCENTAGE", "FIXED"]).optional(),
  discountValue: z.number().min(0).default(0),
  notes: z.string().optional(),
  termsAndConditions: z.string().optional(),
});

// Validation schema for invoice update
const updateInvoiceSchema = z.object({
  taxRate: z.number().min(0).max(100).optional(),
  discountType: z.enum(["PERCENTAGE", "FIXED"]).nullable().optional(),
  discountValue: z.number().min(0).optional(),
  notes: z.string().optional(),
  termsAndConditions: z.string().optional(),
  isReadyForDelivery: z.boolean().optional(),
});

// Generate invoice number
async function generateInvoiceNumber(tenantId: number): Promise<string> {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const prefix = `INV${year}${month}`;

  // Get the last invoice number for this month
  const lastInvoice = await prisma.claimInvoice.findFirst({
    where: {
      tenantId,
      invoiceNumber: { startsWith: prefix },
    },
    orderBy: { invoiceNumber: "desc" },
  });

  let sequence = 1;
  if (lastInvoice) {
    const lastSequence = parseInt(lastInvoice.invoiceNumber.slice(-6));
    sequence = lastSequence + 1;
  }

  return `${prefix}${sequence.toString().padStart(6, "0")}`;
}

// GET /api/claims/[id]/invoice - Get claim invoice
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

    // Get invoice
    const invoice = await prisma.claimInvoice.findFirst({
      where: { claimId: parseInt(id) },
      include: {
        items: {
          include: {
            claimPart: {
              select: { id: true, name: true, sku: true },
            },
            claimServiceCharge: {
              select: { id: true, chargeType: true, description: true },
            },
          },
          orderBy: { sortOrder: "asc" },
        },
        createdByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
        claim: {
          select: {
            claimNumber: true,
            warrantyCard: {
              select: {
                serialNumber: true,
                cardNumber: true,
                product: {
                  select: { name: true, modelNumber: true },
                },
                shop: {
                  select: { name: true, code: true, phone: true, address: true },
                },
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      return errorResponse("Invoice not found", "NOT_FOUND", 404);
    }

    return successResponse(invoice);
  } catch (error) {
    console.error("Error fetching invoice:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch invoice", "SERVER_ERROR", 500);
  }
}

// POST /api/claims/[id]/invoice - Generate invoice
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
    const validatedData = generateInvoiceSchema.parse(body);

    // Get claim with all related data
    const claim = await prisma.warrantyClaim.findFirst({
      where: {
        id: parseInt(id),
        tenantId: user.tenantId,
      },
      include: {
        warrantyCard: {
          include: {
            customer: true,
            shop: true,
            product: true,
          },
        },
        parts: true,
        serviceCharges: true,
        invoice: true,
      },
    });

    if (!claim) {
      return errorResponse("Claim not found", "NOT_FOUND", 404);
    }

    // Check if invoice already exists
    if (claim.invoice) {
      return errorResponse(
        "Invoice already exists for this claim",
        "INVOICE_EXISTS",
        400
      );
    }

    // Check if there are any items to invoice
    if (claim.parts.length === 0 && claim.serviceCharges.length === 0) {
      return errorResponse(
        "No parts or service charges to invoice",
        "NO_ITEMS",
        400
      );
    }

    // Check if all new items are issued
    const pendingIssue = claim.parts.filter((p) => p.isNewItemIssue && !p.isIssued);
    if (pendingIssue.length > 0) {
      return errorResponse(
        `${pendingIssue.length} item(s) pending issue. Issue all items before generating invoice.`,
        "PENDING_ISSUE",
        400
      );
    }

    // Calculate totals
    const partsTotal = claim.parts
      .filter((p) => !p.isWarrantyCovered)
      .reduce((sum, p) => sum + Number(p.totalPrice), 0);

    const serviceTotal = claim.serviceCharges
      .filter((c) => !c.isWarrantyCovered)
      .reduce((sum, c) => sum + Number(c.amount), 0);

    const warrantyCoveredAmount =
      claim.parts.filter((p) => p.isWarrantyCovered).reduce((sum, p) => sum + Number(p.totalPrice), 0) +
      claim.serviceCharges.filter((c) => c.isWarrantyCovered).reduce((sum, c) => sum + Number(c.amount), 0);

    const subtotal = partsTotal + serviceTotal;

    // Calculate discount
    let discountAmount = 0;
    if (validatedData.discountType && validatedData.discountValue > 0) {
      if (validatedData.discountType === "PERCENTAGE") {
        discountAmount = (subtotal * validatedData.discountValue) / 100;
      } else {
        discountAmount = Math.min(validatedData.discountValue, subtotal);
      }
    }

    // Calculate tax
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = (taxableAmount * validatedData.taxRate) / 100;

    // Calculate total
    const totalAmount = taxableAmount + taxAmount;

    // Get customer info
    const customer = claim.warrantyCard.customer;
    const shop = claim.warrantyCard.shop;

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber(user.tenantId);

    // Create invoice with items in transaction
    const invoice = await prisma.$transaction(async (tx) => {
      // Create invoice
      const newInvoice = await tx.claimInvoice.create({
        data: {
          tenantId: user.tenantId,
          claimId: parseInt(id),
          invoiceNumber,
          status: "GENERATED",
          customerName: customer?.name || shop.name,
          customerPhone: customer?.phone || shop.phone || "",
          customerEmail: customer?.email || shop.email,
          customerAddress: customer?.address || shop.address,
          subtotal,
          taxRate: validatedData.taxRate,
          taxAmount,
          discountType: validatedData.discountType || null,
          discountValue: validatedData.discountValue,
          discountAmount,
          totalAmount,
          warrantyCoveredAmount,
          isReadyForDelivery: false,
          notes: validatedData.notes || null,
          termsAndConditions: validatedData.termsAndConditions || null,
          createdBy: user.id,
        },
      });

      // Create invoice items for parts
      let sortOrder = 0;
      for (const part of claim.parts) {
        await tx.invoiceItem.create({
          data: {
            invoiceId: newInvoice.id,
            itemType: "PART",
            claimPartId: part.id,
            name: part.name,
            description: part.description,
            sku: part.sku,
            quantity: part.quantity,
            unitPrice: part.unitPrice,
            totalPrice: part.totalPrice,
            isWarrantyCovered: part.isWarrantyCovered,
            sortOrder: sortOrder++,
          },
        });
      }

      // Create invoice items for service charges
      for (const charge of claim.serviceCharges) {
        await tx.invoiceItem.create({
          data: {
            invoiceId: newInvoice.id,
            itemType: charge.chargeType === "LABOR" ? "LABOR" : "SERVICE",
            claimServiceChargeId: charge.id,
            name: charge.description,
            description: charge.notes,
            quantity: 1,
            unitPrice: charge.amount,
            totalPrice: charge.amount,
            isWarrantyCovered: charge.isWarrantyCovered,
            sortOrder: sortOrder++,
          },
        });
      }

      // Add to claim history
      await tx.claimHistory.create({
        data: {
          claimId: parseInt(id),
          fromStatus: claim.currentStatus,
          toStatus: claim.currentStatus,
          actionType: "INVOICE_GENERATED",
          performedBy: user.id,
          notes: `Invoice ${invoiceNumber} generated. Total: ${totalAmount.toFixed(2)}`,
        },
      });

      return newInvoice;
    });

    // Fetch complete invoice with items
    const completeInvoice = await prisma.claimInvoice.findUnique({
      where: { id: invoice.id },
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
        },
        createdByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return successResponse(completeInvoice);
  } catch (error) {
    console.error("Error generating invoice:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to generate invoice", "SERVER_ERROR", 500);
  }
}

// PUT /api/claims/[id]/invoice - Update invoice
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
    const validatedData = updateInvoiceSchema.parse(body);

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

    // Get existing invoice
    const existingInvoice = await prisma.claimInvoice.findFirst({
      where: { claimId: parseInt(id) },
    });

    if (!existingInvoice) {
      return errorResponse("Invoice not found", "NOT_FOUND", 404);
    }

    // Cannot update paid invoice
    if (existingInvoice.paymentStatus === "PAID") {
      return errorResponse("Cannot update paid invoice", "INVOICE_PAID", 400);
    }

    // Recalculate if tax or discount changed
    let updateData: any = {};

    if (validatedData.taxRate !== undefined || validatedData.discountType !== undefined || validatedData.discountValue !== undefined) {
      const subtotal = Number(existingInvoice.subtotal);
      const taxRate = validatedData.taxRate ?? Number(existingInvoice.taxRate);
      const discountType = validatedData.discountType !== undefined ? validatedData.discountType : existingInvoice.discountType;
      const discountValue = validatedData.discountValue ?? Number(existingInvoice.discountValue);

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

      updateData = {
        ...updateData,
        taxRate,
        discountType,
        discountValue,
        discountAmount,
        taxAmount,
        totalAmount,
      };
    }

    // Add other fields
    if (validatedData.notes !== undefined) updateData.notes = validatedData.notes;
    if (validatedData.termsAndConditions !== undefined) updateData.termsAndConditions = validatedData.termsAndConditions;
    if (validatedData.isReadyForDelivery !== undefined) updateData.isReadyForDelivery = validatedData.isReadyForDelivery;

    // Update invoice
    const updatedInvoice = await prisma.claimInvoice.update({
      where: { id: existingInvoice.id },
      data: updateData,
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
        },
        createdByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return successResponse(updatedInvoice);
  } catch (error) {
    console.error("Error updating invoice:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to update invoice", "SERVER_ERROR", 500);
  }
}
