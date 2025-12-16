// ===========================================
// Claim Invoice Payment API
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
const recordPaymentSchema = z.object({
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  paymentMethod: z.enum(["CASH", "CARD", "UPI", "BANK_TRANSFER", "CHEQUE", "OTHER"]),
  paymentReference: z.string().max(255).optional(),
  notes: z.string().optional(),
});

// POST /api/claims/[id]/invoice/payment - Record payment
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
    const validatedData = recordPaymentSchema.parse(body);

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
    const invoice = await prisma.claimInvoice.findFirst({
      where: { claimId: parseInt(id) },
    });

    if (!invoice) {
      return errorResponse("Invoice not found", "NOT_FOUND", 404);
    }

    // Check if already fully paid
    if (invoice.paymentStatus === "PAID") {
      return errorResponse("Invoice is already fully paid", "ALREADY_PAID", 400);
    }

    // Calculate new paid amount
    const currentPaid = Number(invoice.paidAmount);
    const totalAmount = Number(invoice.totalAmount);
    const newPaidAmount = currentPaid + validatedData.amount;

    // Determine payment status
    let paymentStatus: "UNPAID" | "PARTIAL" | "PAID";
    let invoiceStatus = invoice.status;

    if (newPaidAmount >= totalAmount) {
      paymentStatus = "PAID";
      invoiceStatus = "PAID";
    } else if (newPaidAmount > 0) {
      paymentStatus = "PARTIAL";
      invoiceStatus = "PARTIALLY_PAID";
    } else {
      paymentStatus = "UNPAID";
    }

    // Update invoice
    const updatedInvoice = await prisma.$transaction(async (tx) => {
      const updated = await tx.claimInvoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: Math.min(newPaidAmount, totalAmount),
          paymentStatus,
          status: invoiceStatus,
          paymentMethod: validatedData.paymentMethod,
          paymentReference: validatedData.paymentReference || null,
          paidAt: paymentStatus === "PAID" ? new Date() : invoice.paidAt,
        },
        include: {
          items: {
            orderBy: { sortOrder: "asc" },
          },
          createdByUser: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });

      // Add to claim history
      await tx.claimHistory.create({
        data: {
          claimId: parseInt(id),
          fromStatus: claim.currentStatus,
          toStatus: claim.currentStatus,
          actionType: "PAYMENT_RECEIVED",
          performedBy: user.id,
          notes: `Payment received: ${validatedData.amount.toFixed(2)} via ${validatedData.paymentMethod}. ${
            paymentStatus === "PAID" ? "Invoice fully paid." : `Remaining: ${(totalAmount - newPaidAmount).toFixed(2)}`
          }${validatedData.notes ? ` - ${validatedData.notes}` : ""}`,
        },
      });

      return updated;
    });

    return successResponse({
      invoice: updatedInvoice,
      payment: {
        amount: validatedData.amount,
        method: validatedData.paymentMethod,
        previousPaid: currentPaid,
        totalPaid: Number(updatedInvoice.paidAmount),
        remaining: totalAmount - Number(updatedInvoice.paidAmount),
        status: paymentStatus,
      },
    });
  } catch (error) {
    console.error("Error recording payment:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to record payment", "SERVER_ERROR", 500);
  }
}
