// ===========================================
// Update Pending Claim API
// Update claim details before acceptance
// ===========================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  handleZodError,
  requireAuth,
} from "@/lib/api-utils";
import { updatePendingClaimSchema } from "@/lib/validations";
import { ZodError } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT /api/claims/[id]/update-pending - Update pending claim details
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const claimId = parseInt(id);

    if (isNaN(claimId)) {
      return errorResponse("Invalid claim ID", "INVALID_ID", 400);
    }

    // Check permission
    if (!user.permissions.includes("claims.edit") && !user.permissions.includes("logistics.receive")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    // Get the claim
    const claim = await prisma.warrantyClaim.findFirst({
      where: {
        id: claimId,
        tenantId: user.tenantId,
      },
      include: {
        warrantyCard: true,
      },
    });

    if (!claim) {
      return errorResponse("Claim not found", "NOT_FOUND", 404);
    }

    if (claim.acceptanceStatus !== "PENDING") {
      return errorResponse(
        "Can only update pending claims",
        "INVALID_STATUS",
        400
      );
    }

    const body = await request.json();
    const validatedData = updatePendingClaimSchema.parse(body);

    // Build update data for claim
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const claimUpdateData: Record<string, any> = {};

    if (validatedData.issueDescription !== undefined) {
      claimUpdateData.issueDescription = validatedData.issueDescription;
    }
    if (validatedData.issueCategory !== undefined) {
      claimUpdateData.issueCategory = validatedData.issueCategory;
    }
    if (validatedData.priority !== undefined) {
      claimUpdateData.priority = validatedData.priority;
    }

    // Build update data for warranty card
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const warrantyCardUpdateData: Record<string, any> = {};

    if (validatedData.productId !== undefined) {
      // Verify product exists
      const product = await prisma.product.findFirst({
        where: { id: validatedData.productId, tenantId: user.tenantId },
      });
      if (!product) {
        return errorResponse("Product not found", "PRODUCT_NOT_FOUND", 400);
      }
      warrantyCardUpdateData.productId = validatedData.productId;
    }

    if (validatedData.customerId !== undefined) {
      // Verify customer exists
      if (validatedData.customerId) {
        const customer = await prisma.customer.findFirst({
          where: { id: validatedData.customerId, tenantId: user.tenantId },
        });
        if (!customer) {
          return errorResponse("Customer not found", "CUSTOMER_NOT_FOUND", 400);
        }
      }
      warrantyCardUpdateData.customerId = validatedData.customerId;
    }

    if (validatedData.serialNumber !== undefined) {
      warrantyCardUpdateData.serialNumber = validatedData.serialNumber;
    }

    // Update in transaction
    const [updatedClaim] = await prisma.$transaction([
      prisma.warrantyClaim.update({
        where: { id: claimId },
        data: claimUpdateData,
        include: {
          warrantyCard: {
            include: {
              product: { select: { id: true, name: true, modelNumber: true } },
              customer: { select: { id: true, name: true, phone: true, address: true } },
              shop: { select: { id: true, name: true } },
            },
          },
        },
      }),
      ...(Object.keys(warrantyCardUpdateData).length > 0
        ? [
            prisma.warrantyCard.update({
              where: { id: claim.warrantyCardId },
              data: warrantyCardUpdateData,
            }),
          ]
        : []),
    ]);

    // Check if claim is now ready for acceptance
    const isComplete =
      updatedClaim.warrantyCard.productId &&
      (updatedClaim.warrantyCard.customerId || validatedData.customerId) &&
      updatedClaim.issueDescription;

    return successResponse({
      claim: updatedClaim,
      isComplete,
      missingFields: !isComplete
        ? {
            product: !updatedClaim.warrantyCard.productId,
            customer: !updatedClaim.warrantyCard.customerId && !validatedData.customerId,
            issueDescription: !updatedClaim.issueDescription,
          }
        : null,
    });
  } catch (error) {
    console.error("Error updating pending claim:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to update claim", "SERVER_ERROR", 500);
  }
}
