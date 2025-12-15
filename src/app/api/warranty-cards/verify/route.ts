// ===========================================
// Warranty Card Verification API
// ===========================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  requireAuth,
} from "@/lib/api-utils";

// POST /api/warranty-cards/verify - Verify warranty card by serial number or card number
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await request.json();
    const { query, type = "auto" } = body;

    if (!query || typeof query !== "string" || query.trim().length < 3) {
      return errorResponse("Please provide a valid search query (min 3 characters)", "INVALID_QUERY", 400);
    }

    const searchQuery = query.trim();

    // Build search conditions based on type
    let whereCondition;
    if (type === "cardNumber") {
      whereCondition = { cardNumber: searchQuery };
    } else if (type === "serialNumber") {
      whereCondition = { serialNumber: searchQuery };
    } else if (type === "phone") {
      whereCondition = { customer: { phone: { contains: searchQuery } } };
    } else {
      // Auto-detect: search in card number, serial number, and customer phone
      whereCondition = {
        OR: [
          { cardNumber: { contains: searchQuery } },
          { serialNumber: { contains: searchQuery } },
          { customer: { phone: { contains: searchQuery } } },
        ],
      };
    }

    // Search for warranty cards
    const warrantyCards = await prisma.warrantyCard.findMany({
      where: {
        tenantId: user.tenantId,
        ...whereCondition,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            modelNumber: true,
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
          },
        },
        _count: {
          select: { warrantyClaims: true },
        },
      },
      take: 10, // Limit results
    });

    if (warrantyCards.length === 0) {
      return successResponse({
        found: false,
        message: "No warranty card found matching the search criteria",
        cards: [],
      });
    }

    // Calculate warranty status for each card
    const now = new Date();
    const cardsWithStatus = warrantyCards.map((card) => {
      const warrantyEndDate = new Date(card.warrantyEndDate);
      const isExpired = warrantyEndDate < now;
      const daysRemaining = Math.ceil((warrantyEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      let warrantyStatus: "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "VOID";
      if (card.status === "VOID") {
        warrantyStatus = "VOID";
      } else if (isExpired) {
        warrantyStatus = "EXPIRED";
      } else if (daysRemaining <= 30) {
        warrantyStatus = "EXPIRING_SOON";
      } else {
        warrantyStatus = "ACTIVE";
      }

      return {
        ...card,
        warrantyStatus,
        daysRemaining: isExpired ? 0 : daysRemaining,
        isUnderWarranty: !isExpired && card.status !== "VOID",
      };
    });

    return successResponse({
      found: true,
      count: cardsWithStatus.length,
      cards: cardsWithStatus,
    });
  } catch (error) {
    console.error("Error verifying warranty card:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to verify warranty card", "SERVER_ERROR", 500);
  }
}
