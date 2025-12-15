// ===========================================
// Customers API - List and Create
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
import { createCustomerSchema } from "@/lib/validations";
import { ZodError } from "zod";

// GET /api/customers - List all customers
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const { page, limit, search, sortBy, sortOrder, skip } = parsePaginationParams(searchParams);
    const shopId = searchParams.get("shopId");

    // Build where clause
    const where = {
      tenantId: user.tenantId,
      ...(search && {
        OR: [
          { name: { contains: search } },
          { phone: { contains: search } },
          { email: { contains: search } },
        ],
      }),
      ...(shopId && { shopId: parseInt(shopId) }),
    };

    // Get total count
    const total = await prisma.customer.count({ where });

    // Get customers with pagination
    const customers = await prisma.customer.findMany({
      where,
      include: {
        shop: {
          select: { id: true, name: true, code: true },
        },
        _count: {
          select: { warrantyCards: true },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    });

    return successResponse(customers, calculatePaginationMeta(total, page, limit));
  } catch (error) {
    console.error("Error fetching customers:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch customers", "SERVER_ERROR", 500);
  }
}

// POST /api/customers - Create new customer
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Check permission
    if (!user.permissions.includes("customers.create")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const body = await request.json();
    const validatedData = createCustomerSchema.parse(body);

    // Check if shop exists
    if (validatedData.shopId) {
      const shop = await prisma.shop.findFirst({
        where: {
          id: validatedData.shopId,
          tenantId: user.tenantId,
        },
      });

      if (!shop) {
        return errorResponse("Shop not found", "SHOP_NOT_FOUND", 400);
      }
    }

    // Create customer
    const newCustomer = await prisma.customer.create({
      data: {
        tenantId: user.tenantId,
        name: validatedData.name,
        email: validatedData.email || null,
        phone: validatedData.phone,
        alternatePhone: validatedData.alternatePhone || null,
        address: validatedData.address || null,
        city: validatedData.city || null,
        state: validatedData.state || null,
        postalCode: validatedData.postalCode || null,
        country: validatedData.country,
        shopId: validatedData.shopId || null,
        notes: validatedData.notes || null,
      },
      include: {
        shop: { select: { id: true, name: true } },
      },
    });

    return successResponse(newCustomer);
  } catch (error) {
    console.error("Error creating customer:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to create customer", "SERVER_ERROR", 500);
  }
}
