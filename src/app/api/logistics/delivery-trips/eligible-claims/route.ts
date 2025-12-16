// ===========================================
// Eligible Claims for Delivery API
// ===========================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  requireAuth,
  parsePaginationParams,
  calculatePaginationMeta,
} from "@/lib/api-utils";

// GET /api/logistics/delivery-trips/eligible-claims - Get claims ready for delivery
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const { page, limit, search, skip } = parsePaginationParams(searchParams);
    const shopId = searchParams.get("shopId");
    const toType = searchParams.get("toType"); // SHOP or CUSTOMER

    // Build where clause for eligible claims
    // Eligible = workflow completed (END step) + invoice generated + ready for delivery
    const where: any = {
      tenantId: user.tenantId,
      // Workflow should be at END step
      currentStep: {
        stepType: "END",
      },
      // Must have invoice generated and ready for delivery
      invoice: {
        isReadyForDelivery: true,
      },
      // Not already in an active delivery trip
      deliveryItems: {
        none: {
          trip: {
            status: { in: ["PENDING", "ASSIGNED", "IN_TRANSIT"] },
          },
        },
      },
    };

    // Filter by shop if provided
    if (shopId) {
      where.warrantyCard = {
        shopId: parseInt(shopId),
      };
    }

    // Search filter
    if (search) {
      where.OR = [
        { claimNumber: { contains: search } },
        { warrantyCard: { cardNumber: { contains: search } } },
        { warrantyCard: { serialNumber: { contains: search } } },
        { warrantyCard: { customer: { name: { contains: search } } } },
      ];
    }

    // Get total count
    const total = await prisma.warrantyClaim.count({ where });

    // Get eligible claims
    const claims = await prisma.warrantyClaim.findMany({
      where,
      include: {
        warrantyCard: {
          include: {
            product: {
              select: { id: true, name: true, modelNumber: true },
            },
            customer: {
              select: { id: true, name: true, phone: true, address: true },
            },
            shop: {
              select: { id: true, name: true, code: true, phone: true, address: true },
            },
          },
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            paymentStatus: true,
            isReadyForDelivery: true,
          },
        },
        parts: {
          where: { isNewItemIssue: true },
          select: {
            id: true,
            name: true,
            isIssued: true,
          },
        },
        currentStep: {
          select: { id: true, name: true, stepType: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
    });

    // Transform claims with delivery info
    const claimsWithInfo = claims.map((claim) => ({
      id: claim.id,
      claimNumber: claim.claimNumber,
      product: claim.warrantyCard.product,
      serialNumber: claim.warrantyCard.serialNumber,
      customer: claim.warrantyCard.customer,
      shop: claim.warrantyCard.shop,
      invoice: claim.invoice,
      newItemsCount: claim.parts.length,
      issuedItemsCount: claim.parts.filter((p) => p.isIssued).length,
      workflowStatus: claim.currentStep?.name || "Completed",
      updatedAt: claim.updatedAt,
    }));

    // Group by shop for SHOP delivery type
    let groupedByShop = null;
    if (toType === "SHOP") {
      groupedByShop = claims.reduce((acc, claim) => {
        const shop = claim.warrantyCard.shop;
        if (!acc[shop.id]) {
          acc[shop.id] = {
            shop,
            claims: [],
            totalAmount: 0,
          };
        }
        acc[shop.id].claims.push({
          id: claim.id,
          claimNumber: claim.claimNumber,
          product: claim.warrantyCard.product,
          serialNumber: claim.warrantyCard.serialNumber,
          invoice: claim.invoice,
        });
        acc[shop.id].totalAmount += Number(claim.invoice?.totalAmount || 0);
        return acc;
      }, {} as Record<number, any>);
    }

    return successResponse(
      {
        claims: claimsWithInfo,
        groupedByShop: groupedByShop ? Object.values(groupedByShop) : null,
      },
      calculatePaginationMeta(total, page, limit)
    );
  } catch (error) {
    console.error("Error fetching eligible claims:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch eligible claims", "SERVER_ERROR", 500);
  }
}
