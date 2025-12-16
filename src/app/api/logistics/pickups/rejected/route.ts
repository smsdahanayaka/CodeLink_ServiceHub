// ===========================================
// Rejected Pickups API
// Rejected pickups ready for return delivery
// ===========================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  requireAuth,
} from "@/lib/api-utils";

// GET /api/logistics/pickups/rejected - List rejected pickups awaiting return delivery
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Check permission
    if (!user.permissions.includes("logistics.view") && !user.permissions.includes("claims.view")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    // Get rejected pickups
    const rejectedPickups = await prisma.pickup.findMany({
      where: {
        tenantId: user.tenantId,
        status: "REJECTED",
      },
      include: {
        claim: {
          select: {
            id: true,
            claimNumber: true,
            currentStatus: true,
            issueDescription: true,
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
      orderBy: { rejectedAt: "desc" },
    });

    return successResponse(rejectedPickups);
  } catch (error) {
    console.error("Error fetching rejected pickups:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch rejected pickups", "SERVER_ERROR", 500);
  }
}
