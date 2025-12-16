// ===========================================
// Claim Part Issue API - Mark item as issued
// ===========================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  requireAuth,
} from "@/lib/api-utils";

// POST /api/claims/[id]/parts/[partId]/issue - Mark part as issued
export async function POST(
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
    });

    if (!existingPart) {
      return errorResponse("Part not found", "NOT_FOUND", 404);
    }

    // Check if part is marked for issue
    if (!existingPart.isNewItemIssue) {
      return errorResponse("This part is not marked for customer issue", "NOT_FOR_ISSUE", 400);
    }

    // Check if already issued
    if (existingPart.isIssued) {
      return errorResponse("Part has already been issued", "ALREADY_ISSUED", 400);
    }

    // Mark as issued
    const updatedPart = await prisma.claimPart.update({
      where: { id: parseInt(partId) },
      data: {
        isIssued: true,
        issuedAt: new Date(),
        issuedBy: user.id,
      },
      include: {
        inventoryItem: {
          select: { id: true, sku: true, name: true },
        },
        issuedByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
        createdByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Add to claim history
    await prisma.claimHistory.create({
      data: {
        claimId: parseInt(id),
        fromStatus: claim.currentStatus,
        toStatus: claim.currentStatus,
        actionType: "ITEM_ISSUED",
        performedBy: user.id,
        notes: `Issued: ${existingPart.name} (Qty: ${existingPart.quantity})`,
      },
    });

    return successResponse(updatedPart);
  } catch (error) {
    console.error("Error issuing claim part:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to issue claim part", "SERVER_ERROR", 500);
  }
}
