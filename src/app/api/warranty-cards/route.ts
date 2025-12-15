// ===========================================
// Warranty Cards API - List and Create
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
import { createWarrantyCardSchema } from "@/lib/validations";
import { ZodError } from "zod";

// Generate unique warranty card number
async function generateCardNumber(tenantId: number): Promise<string> {
  const prefix = "WC";
  const year = new Date().getFullYear().toString().slice(-2);
  const month = (new Date().getMonth() + 1).toString().padStart(2, "0");

  // Get the count of cards this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const count = await prisma.warrantyCard.count({
    where: {
      tenantId,
      createdAt: { gte: startOfMonth },
    },
  });

  const sequence = (count + 1).toString().padStart(5, "0");
  return `${prefix}${year}${month}${sequence}`;
}

// GET /api/warranty-cards - List all warranty cards
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const { page, limit, search, sortBy, sortOrder, skip } = parsePaginationParams(searchParams);

    // Additional filters
    const productId = searchParams.get("productId");
    const customerId = searchParams.get("customerId");
    const shopId = searchParams.get("shopId");
    const status = searchParams.get("status");

    // Build where clause
    const where = {
      tenantId: user.tenantId,
      ...(search && {
        OR: [
          { cardNumber: { contains: search } },
          { serialNumber: { contains: search } },
          { invoiceNumber: { contains: search } },
          { customer: { name: { contains: search } } },
          { customer: { phone: { contains: search } } },
        ],
      }),
      ...(productId && { productId: parseInt(productId) }),
      ...(customerId && { customerId: parseInt(customerId) }),
      ...(shopId && { shopId: parseInt(shopId) }),
      ...(status && { status: status as "ACTIVE" | "EXPIRED" | "VOID" | "CLAIMED" }),
    };

    // Get total count
    const total = await prisma.warrantyCard.count({ where });

    // Get warranty cards with pagination
    const warrantyCards = await prisma.warrantyCard.findMany({
      where,
      include: {
        product: {
          select: { id: true, name: true, modelNumber: true, warrantyPeriodMonths: true },
        },
        customer: {
          select: { id: true, name: true, phone: true, email: true },
        },
        shop: {
          select: { id: true, name: true, code: true },
        },
        _count: {
          select: { warrantyClaims: true },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    });

    return successResponse(warrantyCards, calculatePaginationMeta(total, page, limit));
  } catch (error) {
    console.error("Error fetching warranty cards:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch warranty cards", "SERVER_ERROR", 500);
  }
}

// POST /api/warranty-cards - Create new warranty card
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Check permission
    if (!user.permissions.includes("warranty_cards.create")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const body = await request.json();
    const validatedData = createWarrantyCardSchema.parse(body);

    // Verify product exists and belongs to tenant
    const product = await prisma.product.findFirst({
      where: { id: validatedData.productId, tenantId: user.tenantId },
    });
    if (!product) {
      return errorResponse("Product not found", "PRODUCT_NOT_FOUND", 400);
    }

    // Verify customer exists and belongs to tenant
    const customer = await prisma.customer.findFirst({
      where: { id: validatedData.customerId, tenantId: user.tenantId },
    });
    if (!customer) {
      return errorResponse("Customer not found", "CUSTOMER_NOT_FOUND", 400);
    }

    // Verify shop exists and belongs to tenant
    const shop = await prisma.shop.findFirst({
      where: { id: validatedData.shopId, tenantId: user.tenantId },
    });
    if (!shop) {
      return errorResponse("Shop not found", "SHOP_NOT_FOUND", 400);
    }

    // Check for duplicate serial number
    const existingSerial = await prisma.warrantyCard.findFirst({
      where: {
        tenantId: user.tenantId,
        serialNumber: validatedData.serialNumber,
      },
    });
    if (existingSerial) {
      return errorResponse("Serial number already registered", "DUPLICATE_SERIAL", 400);
    }

    // Generate card number
    const cardNumber = await generateCardNumber(user.tenantId);

    // Calculate warranty dates
    const purchaseDate = new Date(validatedData.purchaseDate);
    const warrantyStartDate = purchaseDate;
    const warrantyEndDate = new Date(purchaseDate);
    warrantyEndDate.setMonth(warrantyEndDate.getMonth() + product.warrantyPeriodMonths);

    // Create warranty card
    const newCard = await prisma.warrantyCard.create({
      data: {
        tenantId: user.tenantId,
        cardNumber,
        productId: validatedData.productId,
        customerId: validatedData.customerId,
        shopId: validatedData.shopId,
        serialNumber: validatedData.serialNumber,
        purchaseDate,
        warrantyStartDate,
        warrantyEndDate,
        invoiceNumber: validatedData.invoiceNumber || null,
        invoiceAmount: validatedData.invoiceAmount || null,
        notes: validatedData.notes || null,
        createdBy: user.id,
        status: "ACTIVE",
      },
      include: {
        product: { select: { id: true, name: true, modelNumber: true } },
        customer: { select: { id: true, name: true, phone: true } },
        shop: { select: { id: true, name: true, code: true } },
      },
    });

    return successResponse(newCard);
  } catch (error) {
    console.error("Error creating warranty card:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to create warranty card", "SERVER_ERROR", 500);
  }
}
