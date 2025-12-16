// ===========================================
// Shops API - List and Create
// ===========================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  handleZodError,
  requireAuth,
  parsePaginationParams,
  calculatePaginationMeta,
} from "@/lib/api-utils";
import { createShopSchema } from "@/lib/validations";
import { ZodError } from "zod";

// GET /api/shops - List all shops
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const { page, limit, search, sortBy, sortOrder, skip } = parsePaginationParams(searchParams);
    const status = searchParams.get("status");

    // Build where clause
    const where = {
      tenantId: user.tenantId,
      ...(search && {
        OR: [
          { name: { contains: search } },
          { code: { contains: search } },
          { city: { contains: search } },
        ],
      }),
      ...(status && { status: status as "ACTIVE" | "INACTIVE" | "SUSPENDED" }),
    };

    // Get total count
    const total = await prisma.shop.count({ where });

    // Get shops with pagination
    const shops = await prisma.shop.findMany({
      where,
      include: {
        _count: {
          select: { customers: true, warrantyCards: true },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    });

    return successResponse(shops, calculatePaginationMeta(total, page, limit));
  } catch (error) {
    console.error("Error fetching shops:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch shops", "SERVER_ERROR", 500);
  }
}

// POST /api/shops - Create new shop
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Check permission
    if (!user.permissions.includes("shops.create")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const body = await request.json();
    const validatedData = createShopSchema.parse(body);

    // Check if shop code already exists
    if (validatedData.code) {
      const existingShop = await prisma.shop.findFirst({
        where: {
          tenantId: user.tenantId,
          code: validatedData.code,
        },
      });

      if (existingShop) {
        return errorResponse("Shop code already exists", "DUPLICATE_CODE", 400);
      }
    }

    // Create shop
    const newShop = await prisma.shop.create({
      data: {
        tenantId: user.tenantId,
        code: validatedData.code || null,
        name: validatedData.name,
        email: validatedData.email || null,
        phone: validatedData.phone || null,
        address: validatedData.address || null,
        city: validatedData.city || null,
        state: validatedData.state || null,
        postalCode: validatedData.postalCode || null,
        country: validatedData.country,
        contactPerson: validatedData.contactPerson || null,
        contactPhone: validatedData.contactPhone || null,
        gstNumber: validatedData.gstNumber || null,
        status: validatedData.status,
        notes: validatedData.notes || null,
        // Default to verified (true) unless explicitly set to false
        isVerified: validatedData.isVerified !== false,
      },
    });

    return successResponse(newShop);
  } catch (error) {
    console.error("Error creating shop:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to create shop", "SERVER_ERROR", 500);
  }
}
