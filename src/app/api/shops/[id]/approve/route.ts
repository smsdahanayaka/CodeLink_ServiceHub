// ===========================================
// Shop Approve API - Approve pending shops
// ===========================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse, requireAuth } from "@/lib/api-utils";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/shops/[id]/approve - Approve a pending shop
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const shopId = parseInt(id);

    // Check permission - require shops.edit or shops.approve
    const canApprove =
      user.permissions.includes("shops.edit") ||
      user.permissions.includes("shops.approve");
    if (!canApprove) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    // Check if shop exists
    const shop = await prisma.shop.findFirst({
      where: {
        id: shopId,
        tenantId: user.tenantId,
      },
    });

    if (!shop) {
      return errorResponse("Shop not found", "NOT_FOUND", 404);
    }

    if (shop.isVerified) {
      return errorResponse("Shop is already verified", "ALREADY_VERIFIED", 400);
    }

    // Approve the shop
    const updatedShop = await prisma.shop.update({
      where: { id: shopId },
      data: {
        isVerified: true,
      },
      include: {
        _count: {
          select: { customers: true, warrantyCards: true },
        },
      },
    });

    return successResponse(updatedShop);
  } catch (error) {
    console.error("Error approving shop:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to approve shop", "SERVER_ERROR", 500);
  }
}
