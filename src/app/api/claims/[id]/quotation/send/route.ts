// ===========================================
// Quotation Send API - Send to customer
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
const sendQuotationSchema = z.object({
  quotationId: z.number().int().positive(),
  sendVia: z.enum(["EMAIL", "SMS", "WHATSAPP"]),
  recipient: z.string().min(1, "Recipient is required"),
  message: z.string().optional(),
});

// POST /api/claims/[id]/quotation/send - Send quotation to customer
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
    const validatedData = sendQuotationSchema.parse(body);

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

    // Get quotation
    const quotation = await prisma.claimQuotation.findFirst({
      where: {
        id: validatedData.quotationId,
        claimId: parseInt(id),
      },
    });

    if (!quotation) {
      return errorResponse("Quotation not found", "NOT_FOUND", 404);
    }

    // Check if quotation can be sent
    if (["APPROVED", "REJECTED", "CONVERTED", "EXPIRED"].includes(quotation.status)) {
      return errorResponse(
        `Cannot send quotation with status: ${quotation.status}`,
        "INVALID_STATUS",
        400
      );
    }

    // TODO: Implement actual sending logic (Email/SMS/WhatsApp)
    // For now, just update the status

    // Update quotation status
    const updatedQuotation = await prisma.$transaction(async (tx) => {
      const updated = await tx.claimQuotation.update({
        where: { id: quotation.id },
        data: {
          status: "SENT",
          sentAt: new Date(),
          sentVia: validatedData.sendVia,
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
          actionType: "QUOTATION_SENT",
          performedBy: user.id,
          notes: `Quotation ${quotation.quotationNumber} sent via ${validatedData.sendVia} to ${validatedData.recipient}`,
        },
      });

      return updated;
    });

    return successResponse({
      quotation: updatedQuotation,
      message: `Quotation sent successfully via ${validatedData.sendVia}`,
    });
  } catch (error) {
    console.error("Error sending quotation:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to send quotation", "SERVER_ERROR", 500);
  }
}
