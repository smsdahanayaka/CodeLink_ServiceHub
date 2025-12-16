// ===========================================
// Claim Service Charge API - Update, Delete
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
const updateServiceChargeSchema = z.object({
  chargeType: z.enum(["LABOR", "SERVICE_VISIT", "TRANSPORTATION", "DIAGNOSIS", "INSTALLATION", "OTHER"]).optional(),
  description: z.string().min(1).max(255).optional(),
  amount: z.number().min(0).optional(),
  isWarrantyCovered: z.boolean().optional(),
  notes: z.string().optional(),
});

// GET /api/claims/[id]/service-charges/[chargeId] - Get single charge
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; chargeId: string }> }
) {
  try {
    const user = await requireAuth();
    const { id, chargeId } = await params;

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

    const charge = await prisma.claimServiceCharge.findFirst({
      where: {
        id: parseInt(chargeId),
        claimId: parseInt(id),
      },
      include: {
        createdByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!charge) {
      return errorResponse("Service charge not found", "NOT_FOUND", 404);
    }

    return successResponse(charge);
  } catch (error) {
    console.error("Error fetching service charge:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch service charge", "SERVER_ERROR", 500);
  }
}

// PUT /api/claims/[id]/service-charges/[chargeId] - Update charge
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; chargeId: string }> }
) {
  try {
    const user = await requireAuth();
    const { id, chargeId } = await params;

    if (!user.permissions.includes("claims.edit")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const body = await request.json();
    const validatedData = updateServiceChargeSchema.parse(body);

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

    // Check if charge exists
    const existing = await prisma.claimServiceCharge.findFirst({
      where: {
        id: parseInt(chargeId),
        claimId: parseInt(id),
      },
    });

    if (!existing) {
      return errorResponse("Service charge not found", "NOT_FOUND", 404);
    }

    // Update charge
    const updatedCharge = await prisma.claimServiceCharge.update({
      where: { id: parseInt(chargeId) },
      data: {
        ...(validatedData.chargeType && { chargeType: validatedData.chargeType }),
        ...(validatedData.description && { description: validatedData.description }),
        ...(validatedData.amount !== undefined && { amount: validatedData.amount }),
        ...(validatedData.isWarrantyCovered !== undefined && { isWarrantyCovered: validatedData.isWarrantyCovered }),
        ...(validatedData.notes !== undefined && { notes: validatedData.notes }),
      },
      include: {
        createdByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return successResponse(updatedCharge);
  } catch (error) {
    console.error("Error updating service charge:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to update service charge", "SERVER_ERROR", 500);
  }
}

// DELETE /api/claims/[id]/service-charges/[chargeId] - Delete charge
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; chargeId: string }> }
) {
  try {
    const user = await requireAuth();
    const { id, chargeId } = await params;

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

    // Check if charge exists
    const existing = await prisma.claimServiceCharge.findFirst({
      where: {
        id: parseInt(chargeId),
        claimId: parseInt(id),
      },
    });

    if (!existing) {
      return errorResponse("Service charge not found", "NOT_FOUND", 404);
    }

    // Delete charge
    await prisma.claimServiceCharge.delete({
      where: { id: parseInt(chargeId) },
    });

    return successResponse({ message: "Service charge deleted successfully" });
  } catch (error) {
    console.error("Error deleting service charge:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to delete service charge", "SERVER_ERROR", 500);
  }
}
