// ===========================================
// Claim Service Charges API - List and Add
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
const addServiceChargeSchema = z.object({
  chargeType: z.enum(["LABOR", "SERVICE_VISIT", "TRANSPORTATION", "DIAGNOSIS", "INSTALLATION", "OTHER"]),
  description: z.string().min(1, "Description is required").max(255),
  amount: z.number().min(0, "Amount must be positive"),
  isWarrantyCovered: z.boolean().default(false),
  notes: z.string().optional(),
});

// GET /api/claims/[id]/service-charges - List all service charges
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

    // Get service charges
    const charges = await prisma.claimServiceCharge.findMany({
      where: { claimId: parseInt(id) },
      include: {
        createdByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Calculate totals
    const summary = {
      totalCharges: charges.length,
      totalAmount: charges.reduce((sum, c) => sum + Number(c.amount), 0),
      warrantyCoveredAmount: charges
        .filter((c) => c.isWarrantyCovered)
        .reduce((sum, c) => sum + Number(c.amount), 0),
      customerChargedAmount: charges
        .filter((c) => !c.isWarrantyCovered)
        .reduce((sum, c) => sum + Number(c.amount), 0),
      byType: Object.entries(
        charges.reduce((acc, c) => {
          acc[c.chargeType] = (acc[c.chargeType] || 0) + Number(c.amount);
          return acc;
        }, {} as Record<string, number>)
      ).map(([type, amount]) => ({ type, amount })),
    };

    return successResponse({ charges, summary });
  } catch (error) {
    console.error("Error fetching service charges:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch service charges", "SERVER_ERROR", 500);
  }
}

// POST /api/claims/[id]/service-charges - Add service charge
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
    const validatedData = addServiceChargeSchema.parse(body);

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

    // Create service charge
    const newCharge = await prisma.claimServiceCharge.create({
      data: {
        claimId: parseInt(id),
        chargeType: validatedData.chargeType,
        description: validatedData.description,
        amount: validatedData.amount,
        isWarrantyCovered: validatedData.isWarrantyCovered,
        notes: validatedData.notes || null,
        createdBy: user.id,
      },
      include: {
        createdByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return successResponse(newCharge);
  } catch (error) {
    console.error("Error adding service charge:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to add service charge", "SERVER_ERROR", 500);
  }
}
