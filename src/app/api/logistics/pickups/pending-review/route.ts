// ===========================================
// Pending Review Pickups API
// Completed pickups awaiting claim creation or rejection
// ===========================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  requireAuth,
} from "@/lib/api-utils";

// GET /api/logistics/pickups/pending-review - List completed pickups awaiting review
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Check permission
    if (!user.permissions.includes("claims.create") && !user.permissions.includes("claims.manage")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    // Get completed pickups where claim is still in initial status (needs review)
    const pendingPickups = await prisma.pickup.findMany({
      where: {
        tenantId: user.tenantId,
        status: "COMPLETED",
        // Claim is in initial/received status - not yet processed
        claim: {
          currentStatus: {
            in: ["new", "received", "pending_review"],
          },
        },
      },
      include: {
        claim: {
          select: {
            id: true,
            claimNumber: true,
            currentStatus: true,
            issueDescription: true,
            priority: true,
            createdBy: true,
            createdByUser: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        warrantyCard: {
          select: {
            id: true,
            cardNumber: true,
            serialNumber: true,
            product: { select: { id: true, name: true, modelNumber: true } },
            customer: { select: { id: true, name: true, phone: true, address: true } },
            shop: { select: { id: true, name: true, code: true, address: true, phone: true } },
          },
        },
        collector: {
          select: { id: true, name: true, phone: true },
        },
        fromShop: {
          select: { id: true, name: true, address: true, phone: true },
        },
      },
      orderBy: { receivedAt: "desc" },
    });

    return successResponse(pendingPickups);
  } catch (error) {
    console.error("Error fetching pending review pickups:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch pending review pickups", "SERVER_ERROR", 500);
  }
}
