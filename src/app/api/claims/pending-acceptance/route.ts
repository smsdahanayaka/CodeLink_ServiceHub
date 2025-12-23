// ===========================================
// Pending Acceptance API - Claims awaiting acceptance
// Groups claims by collector and shop
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

// GET /api/claims/pending-acceptance - Get pending claims grouped by collector/shop
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Check permission
    if (!user.permissions.includes("claims.view") && !user.permissions.includes("logistics.receive")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const { searchParams } = new URL(request.url);
    const { page, limit, search, skip } = parsePaginationParams(searchParams);
    const grouped = searchParams.get("grouped") === "true";

    // Build where clause for pending claims
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {
      tenantId: user.tenantId,
      acceptanceStatus: "PENDING",
    };

    // Search filter
    if (search) {
      where.OR = [
        { claimNumber: { contains: search } },
        { warrantyCard: { serialNumber: { contains: search } } },
        { warrantyCard: { product: { name: { contains: search } } } },
        { warrantyCard: { customer: { name: { contains: search } } } },
      ];
    }

    if (grouped) {
      // Get claims grouped by collector and shop
      const claims = await prisma.warrantyClaim.findMany({
        where,
        include: {
          warrantyCard: {
            include: {
              product: { select: { id: true, name: true, modelNumber: true } },
              customer: { select: { id: true, name: true, phone: true, address: true } },
              shop: { select: { id: true, name: true, phone: true, address: true } },
            },
          },
          collectionItem: {
            include: {
              trip: {
                include: {
                  collector: { select: { id: true, name: true, phone: true } },
                  shop: { select: { id: true, name: true } },
                },
              },
            },
          },
          pickups: {
            where: { status: "COMPLETED" },
            include: {
              collector: { select: { id: true, name: true, phone: true } },
              fromShop: { select: { id: true, name: true } },
              collectionTrip: {
                select: { id: true, tripNumber: true },
              },
            },
            orderBy: { receivedAt: "desc" },
            take: 1,
          },
        },
        orderBy: { receivedAt: "desc" },
      });

      // Group by collector, then by shop
      const grouped: Record<string, {
        collector: { id: number; name: string; phone: string | null } | null;
        shops: Record<string, {
          shop: { id: number; name: string } | null;
          claims: typeof claims;
        }>;
      }> = {};

      for (const claim of claims) {
        // Determine collector from collection item or pickup
        let collector = claim.collectionItem?.trip?.collector || null;
        let shop = claim.collectionItem?.trip?.shop || claim.warrantyCard.shop;

        // Check pickups if no collection item
        if (!collector && claim.pickups.length > 0) {
          collector = claim.pickups[0].collector;
          shop = claim.pickups[0].fromShop || claim.warrantyCard.shop;
        }

        const collectorKey = collector ? `collector_${collector.id}` : "no_collector";
        const shopKey = shop ? `shop_${shop.id}` : "no_shop";

        if (!grouped[collectorKey]) {
          grouped[collectorKey] = {
            collector,
            shops: {},
          };
        }

        if (!grouped[collectorKey].shops[shopKey]) {
          grouped[collectorKey].shops[shopKey] = {
            shop,
            claims: [],
          };
        }

        grouped[collectorKey].shops[shopKey].claims.push(claim);
      }

      // Convert to array format
      const result = Object.values(grouped).map((collectorGroup) => ({
        collector: collectorGroup.collector,
        shops: Object.values(collectorGroup.shops).map((shopGroup) => ({
          shop: shopGroup.shop,
          claims: shopGroup.claims,
          count: shopGroup.claims.length,
        })),
        totalClaims: Object.values(collectorGroup.shops).reduce(
          (sum, shopGroup) => sum + shopGroup.claims.length,
          0
        ),
      }));

      return successResponse({
        groups: result,
        totalClaims: claims.length,
      });
    }

    // Non-grouped: simple paginated list
    const [claims, total] = await Promise.all([
      prisma.warrantyClaim.findMany({
        where,
        include: {
          warrantyCard: {
            include: {
              product: { select: { id: true, name: true, modelNumber: true } },
              customer: { select: { id: true, name: true, phone: true, address: true } },
              shop: { select: { id: true, name: true, phone: true, address: true } },
            },
          },
          collectionItem: {
            include: {
              trip: {
                include: {
                  collector: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
        orderBy: { receivedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.warrantyClaim.count({ where }),
    ]);

    return successResponse(claims, calculatePaginationMeta(total, page, limit));
  } catch (error) {
    console.error("Error fetching pending claims:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch pending claims", "SERVER_ERROR", 500);
  }
}
