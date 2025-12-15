// ===========================================
// Claim History API
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

// GET /api/claims/[id]/history - Get claim history/audit trail
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const claimId = parseInt(id);

    if (isNaN(claimId)) {
      return errorResponse("Invalid claim ID", "INVALID_ID", 400);
    }

    // Check if claim exists and user has access
    const claim = await prisma.warrantyClaim.findFirst({
      where: { id: claimId, tenantId: user.tenantId },
    });

    if (!claim) {
      return errorResponse("Claim not found", "NOT_FOUND", 404);
    }

    // Get history entries
    const history = await prisma.claimHistory.findMany({
      where: { claimId },
      orderBy: { createdAt: "desc" },
      include: {
        performedUser: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        workflowStep: {
          select: { id: true, name: true, statusName: true },
        },
      },
    });

    return successResponse(history);
  } catch (error) {
    console.error("Error fetching claim history:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch claim history", "SERVER_ERROR", 500);
  }
}

// POST /api/claims/[id]/history - Add note to claim history
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const claimId = parseInt(id);

    if (isNaN(claimId)) {
      return errorResponse("Invalid claim ID", "INVALID_ID", 400);
    }

    // Check if claim exists
    const claim = await prisma.warrantyClaim.findFirst({
      where: { id: claimId, tenantId: user.tenantId },
    });

    if (!claim) {
      return errorResponse("Claim not found", "NOT_FOUND", 404);
    }

    const body = await request.json();
    const { notes, actionType = "NOTE_ADDED" } = body;

    if (!notes || !notes.trim()) {
      return errorResponse("Notes are required", "NOTES_REQUIRED", 400);
    }

    // Create history entry
    const historyEntry = await prisma.claimHistory.create({
      data: {
        claimId,
        fromStatus: claim.currentStatus,
        toStatus: claim.currentStatus,
        fromLocation: claim.currentLocation,
        toLocation: claim.currentLocation,
        actionType,
        performedBy: user.id,
        notes: notes.trim(),
      },
      include: {
        performedUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return successResponse(historyEntry);
  } catch (error) {
    console.error("Error adding claim history:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to add note", "SERVER_ERROR", 500);
  }
}
