// ===========================================
// Warranty Claims API - Get, Update by ID
// ===========================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  requireAuth,
} from "@/lib/api-utils";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/claims/[id] - Get single claim with full details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const claimId = parseInt(id);

    if (isNaN(claimId)) {
      return errorResponse("Invalid claim ID", "INVALID_ID", 400);
    }

    // Check permissions
    const canViewAll = user.permissions.includes("claims.view_all");
    const canViewAssigned = user.permissions.includes("claims.view_assigned");

    // Build where condition
    const whereCondition: { id: number; tenantId: number; assignedTo?: number } = {
      id: claimId,
      tenantId: user.tenantId,
    };

    // If user can only view assigned, filter by assignedTo
    if (!canViewAll && canViewAssigned) {
      whereCondition.assignedTo = user.id;
    }

    const claim = await prisma.warrantyClaim.findFirst({
      where: whereCondition,
      include: {
        warrantyCard: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                modelNumber: true,
                sku: true,
                warrantyPeriodMonths: true,
                category: { select: { id: true, name: true } },
              },
            },
            customer: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                address: true,
                city: true,
                state: true,
              },
            },
            shop: {
              select: {
                id: true,
                name: true,
                code: true,
                phone: true,
                address: true,
              },
            },
          },
        },
        assignedUser: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        createdByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
        workflow: {
          select: { id: true, name: true },
        },
        currentStep: {
          select: {
            id: true,
            name: true,
            statusName: true,
            stepType: true,
            description: true,
            slaHours: true,
            slaWarningHours: true,
            canSkip: true,
            isOptional: true,
            formFields: true,
            transitionsFrom: {
              select: {
                id: true,
                transitionName: true,
                conditionType: true,
                toStep: {
                  select: { id: true, name: true, statusName: true },
                },
              },
            },
          },
        },
        claimHistory: {
          orderBy: { createdAt: "desc" },
          include: {
            performedUser: {
              select: { id: true, firstName: true, lastName: true },
            },
            workflowStep: {
              select: { id: true, name: true, statusName: true },
            },
          },
        },
        pickups: {
          orderBy: { createdAt: "desc" },
          include: {
            collector: { select: { id: true, name: true, phone: true } },
          },
        },
        deliveries: {
          orderBy: { createdAt: "desc" },
          include: {
            collector: { select: { id: true, name: true, phone: true } },
          },
        },
      },
    });

    if (!claim) {
      return errorResponse("Claim not found", "NOT_FOUND", 404);
    }

    return successResponse(claim);
  } catch (error) {
    console.error("Error fetching claim:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch claim", "SERVER_ERROR", 500);
  }
}

// PUT /api/claims/[id] - Update claim
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();

    // Check permission
    if (!user.permissions.includes("claims.edit")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const { id } = await params;
    const claimId = parseInt(id);

    if (isNaN(claimId)) {
      return errorResponse("Invalid claim ID", "INVALID_ID", 400);
    }

    // Check if claim exists
    const existingClaim = await prisma.warrantyClaim.findFirst({
      where: { id: claimId, tenantId: user.tenantId },
    });

    if (!existingClaim) {
      return errorResponse("Claim not found", "NOT_FOUND", 404);
    }

    const body = await request.json();
    const {
      issueDescription,
      issueCategory,
      priority,
      diagnosis,
      resolution,
      partsUsed,
      repairCost,
      isWarrantyVoid,
      voidReason,
      notes,
    } = body;

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (issueDescription) updateData.issueDescription = issueDescription;
    if (issueCategory !== undefined) updateData.issueCategory = issueCategory || null;
    if (priority) updateData.priority = priority;
    if (diagnosis !== undefined) updateData.diagnosis = diagnosis || null;
    if (resolution !== undefined) updateData.resolution = resolution || null;
    if (partsUsed !== undefined) updateData.partsUsed = partsUsed || null;
    if (repairCost !== undefined) updateData.repairCost = repairCost || 0;
    if (isWarrantyVoid !== undefined) updateData.isWarrantyVoid = isWarrantyVoid;
    if (voidReason !== undefined) updateData.voidReason = voidReason || null;

    // Update claim
    const updatedClaim = await prisma.warrantyClaim.update({
      where: { id: claimId },
      data: updateData,
      include: {
        warrantyCard: {
          select: {
            id: true,
            cardNumber: true,
            product: { select: { id: true, name: true } },
            customer: { select: { id: true, name: true, phone: true } },
          },
        },
        assignedUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Add history entry if notes provided
    if (notes) {
      await prisma.claimHistory.create({
        data: {
          claimId,
          fromStatus: existingClaim.currentStatus,
          toStatus: existingClaim.currentStatus,
          actionType: "CLAIM_UPDATED",
          performedBy: user.id,
          notes,
        },
      });
    }

    return successResponse(updatedClaim);
  } catch (error) {
    console.error("Error updating claim:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to update claim", "SERVER_ERROR", 500);
  }
}
