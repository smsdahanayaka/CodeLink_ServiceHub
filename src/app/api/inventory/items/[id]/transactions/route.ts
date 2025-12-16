// ===========================================
// Inventory Item Transactions API
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

// GET /api/inventory/items/[id]/transactions - Get transaction history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const { page, limit, sortOrder, skip } = parsePaginationParams(searchParams);
    const transactionType = searchParams.get("type");

    // Verify item belongs to tenant
    const item = await prisma.inventoryItem.findFirst({
      where: {
        id: parseInt(id),
        tenantId: user.tenantId,
      },
      select: { id: true, name: true, sku: true },
    });

    if (!item) {
      return errorResponse("Item not found", "NOT_FOUND", 404);
    }

    // Build where clause
    const where = {
      itemId: parseInt(id),
      tenantId: user.tenantId,
      ...(transactionType && { transactionType: transactionType as any }),
    };

    // Get total count
    const total = await prisma.inventoryTransaction.count({ where });

    // Get transactions
    const transactions = await prisma.inventoryTransaction.findMany({
      where,
      include: {
        createdByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: sortOrder },
      skip,
      take: limit,
    });

    return successResponse(
      { item, transactions },
      calculatePaginationMeta(total, page, limit)
    );
  } catch (error) {
    console.error("Error fetching inventory transactions:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch transactions", "SERVER_ERROR", 500);
  }
}
