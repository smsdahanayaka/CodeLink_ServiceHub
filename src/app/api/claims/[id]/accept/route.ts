// ===========================================
// Accept/Reject Claim API
// ===========================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  handleZodError,
  requireAuth,
} from "@/lib/api-utils";
import { acceptClaimSchema, rejectClaimSchema } from "@/lib/validations";
import { ZodError } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/claims/[id]/accept - Accept a pending claim
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const claimId = parseInt(id);

    if (isNaN(claimId)) {
      return errorResponse("Invalid claim ID", "INVALID_ID", 400);
    }

    // Check permission
    if (!user.permissions.includes("claims.process") && !user.permissions.includes("logistics.receive")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    // Get the claim
    const claim = await prisma.warrantyClaim.findFirst({
      where: {
        id: claimId,
        tenantId: user.tenantId,
      },
      include: {
        warrantyCard: {
          include: {
            product: true,
            customer: true,
          },
        },
        workflow: {
          include: {
            steps: { orderBy: { stepOrder: "asc" } },
          },
        },
      },
    });

    if (!claim) {
      return errorResponse("Claim not found", "NOT_FOUND", 404);
    }

    if (claim.acceptanceStatus !== "PENDING") {
      return errorResponse(
        `Claim has already been ${claim.acceptanceStatus.toLowerCase()}`,
        "ALREADY_PROCESSED",
        400
      );
    }

    const body = await request.json();
    const { action } = body;

    if (action === "reject") {
      // Validate rejection
      const validatedData = rejectClaimSchema.parse(body);

      // Update claim to rejected
      const updatedClaim = await prisma.warrantyClaim.update({
        where: { id: claimId },
        data: {
          acceptanceStatus: "REJECTED",
          currentStatus: "rejected",
          resolution: `Rejected: ${validatedData.rejectionReason}`,
        },
        include: {
          warrantyCard: {
            include: {
              product: { select: { id: true, name: true } },
              customer: { select: { id: true, name: true, phone: true } },
            },
          },
        },
      });

      // Record in claim history
      await prisma.claimHistory.create({
        data: {
          claimId,
          fromStatus: claim.currentStatus,
          toStatus: "rejected",
          actionType: "claim_rejected",
          performedBy: user.id,
          notes: `Claim rejected: ${validatedData.rejectionReason}`,
        },
      });

      return successResponse({
        claim: updatedClaim,
        message: "Claim rejected successfully",
      });
    }

    // Accept the claim
    // Validate that all required fields are present
    const warrantyCard = claim.warrantyCard;
    const missingFields: string[] = [];

    if (!warrantyCard.productId) missingFields.push("Product");
    if (!warrantyCard.customerId && !warrantyCard.customer) missingFields.push("Customer");
    if (!claim.issueDescription) missingFields.push("Issue Description");

    if (missingFields.length > 0) {
      return errorResponse(
        `Cannot accept claim. Missing required fields: ${missingFields.join(", ")}`,
        "MISSING_FIELDS",
        400
      );
    }

    // Get the first workflow step to start the claim
    const firstStep = claim.workflow?.steps.find(
      (s) => s.stepType === "START" || s.stepOrder === 1
    );

    // Update claim to accepted and start workflow
    const updatedClaim = await prisma.warrantyClaim.update({
      where: { id: claimId },
      data: {
        acceptanceStatus: "ACCEPTED",
        acceptedAt: new Date(),
        acceptedBy: user.id,
        currentStatus: firstStep?.statusName || "in_progress",
        currentStepId: firstStep?.id || claim.currentStepId,
        currentStepStartedAt: new Date(),
      },
      include: {
        warrantyCard: {
          include: {
            product: { select: { id: true, name: true } },
            customer: { select: { id: true, name: true, phone: true } },
            shop: { select: { id: true, name: true } },
          },
        },
        workflow: {
          select: { id: true, name: true },
        },
        currentStep: {
          select: { id: true, name: true, statusName: true },
        },
      },
    });

    // Record in claim history
    await prisma.claimHistory.create({
      data: {
        claimId,
        fromStatus: claim.currentStatus,
        toStatus: updatedClaim.currentStatus,
        actionType: "claim_accepted",
        performedBy: user.id,
        notes: "Claim accepted and workflow started",
      },
    });

    return successResponse({
      claim: updatedClaim,
      message: "Claim accepted successfully",
    });
  } catch (error) {
    console.error("Error accepting/rejecting claim:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to process claim", "SERVER_ERROR", 500);
  }
}
