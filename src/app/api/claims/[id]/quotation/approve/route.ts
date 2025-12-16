// ===========================================
// Quotation Approve/Reject API
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

// Validation schema for approve
const approveQuotationSchema = z.object({
  quotationId: z.number().int().positive(),
  approvedBy: z.string().min(1, "Approver name is required").max(255),
  notes: z.string().optional(),
});

// Validation schema for reject
const rejectQuotationSchema = z.object({
  quotationId: z.number().int().positive(),
  rejectionReason: z.string().min(1, "Rejection reason is required"),
});

// POST /api/claims/[id]/quotation/approve - Approve quotation
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
    const action = body.action || "approve";

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

    if (action === "reject") {
      // Handle rejection
      const validatedData = rejectQuotationSchema.parse(body);

      const quotation = await prisma.claimQuotation.findFirst({
        where: {
          id: validatedData.quotationId,
          claimId: parseInt(id),
        },
      });

      if (!quotation) {
        return errorResponse("Quotation not found", "NOT_FOUND", 404);
      }

      if (!["DRAFT", "SENT", "VIEWED"].includes(quotation.status)) {
        return errorResponse(
          `Cannot reject quotation with status: ${quotation.status}`,
          "INVALID_STATUS",
          400
        );
      }

      const updatedQuotation = await prisma.$transaction(async (tx) => {
        const updated = await tx.claimQuotation.update({
          where: { id: quotation.id },
          data: {
            status: "REJECTED",
            rejectedAt: new Date(),
            rejectionReason: validatedData.rejectionReason,
          },
          include: {
            items: { orderBy: { sortOrder: "asc" } },
            createdByUser: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        });

        await tx.claimHistory.create({
          data: {
            claimId: parseInt(id),
            fromStatus: claim.currentStatus,
            toStatus: claim.currentStatus,
            actionType: "QUOTATION_REJECTED",
            performedBy: user.id,
            notes: `Quotation ${quotation.quotationNumber} rejected. Reason: ${validatedData.rejectionReason}`,
          },
        });

        return updated;
      });

      return successResponse({
        quotation: updatedQuotation,
        message: "Quotation rejected",
      });
    } else {
      // Handle approval
      const validatedData = approveQuotationSchema.parse(body);

      const quotation = await prisma.claimQuotation.findFirst({
        where: {
          id: validatedData.quotationId,
          claimId: parseInt(id),
        },
      });

      if (!quotation) {
        return errorResponse("Quotation not found", "NOT_FOUND", 404);
      }

      if (!["DRAFT", "SENT", "VIEWED"].includes(quotation.status)) {
        return errorResponse(
          `Cannot approve quotation with status: ${quotation.status}`,
          "INVALID_STATUS",
          400
        );
      }

      // Check validity
      if (quotation.validUntil && new Date(quotation.validUntil) < new Date()) {
        return errorResponse(
          "Quotation has expired",
          "QUOTATION_EXPIRED",
          400
        );
      }

      const updatedQuotation = await prisma.$transaction(async (tx) => {
        const updated = await tx.claimQuotation.update({
          where: { id: quotation.id },
          data: {
            status: "APPROVED",
            approvedAt: new Date(),
            approvedBy: validatedData.approvedBy,
          },
          include: {
            items: { orderBy: { sortOrder: "asc" } },
            createdByUser: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        });

        // Update claim to mark quotation approved
        await tx.warrantyClaim.update({
          where: { id: parseInt(id) },
          data: {
            quotationApprovedAt: new Date(),
            requiresQuotation: false,
          },
        });

        await tx.claimHistory.create({
          data: {
            claimId: parseInt(id),
            fromStatus: claim.currentStatus,
            toStatus: claim.currentStatus,
            actionType: "QUOTATION_APPROVED",
            performedBy: user.id,
            notes: `Quotation ${quotation.quotationNumber} approved by ${validatedData.approvedBy}${
              validatedData.notes ? `. Notes: ${validatedData.notes}` : ""
            }`,
          },
        });

        return updated;
      });

      return successResponse({
        quotation: updatedQuotation,
        message: "Quotation approved successfully",
      });
    }
  } catch (error) {
    console.error("Error processing quotation approval:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to process quotation", "SERVER_ERROR", 500);
  }
}
