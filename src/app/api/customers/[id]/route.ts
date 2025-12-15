// ===========================================
// Customers API - Get, Update, Delete by ID
// ===========================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  handleZodError,
  requireAuth,
} from "@/lib/api-utils";
import { updateCustomerSchema } from "@/lib/validations";
import { ZodError } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/customers/[id] - Get customer by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const customer = await prisma.customer.findFirst({
      where: {
        id: parseInt(id),
        tenantId: user.tenantId,
      },
      include: {
        shop: { select: { id: true, name: true, code: true } },
        _count: { select: { warrantyCards: true } },
      },
    });

    if (!customer) {
      return errorResponse("Customer not found", "NOT_FOUND", 404);
    }

    return successResponse(customer);
  } catch (error) {
    console.error("Error fetching customer:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch customer", "SERVER_ERROR", 500);
  }
}

// PUT /api/customers/[id] - Update customer
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const customerId = parseInt(id);

    // Check permission
    if (!user.permissions.includes("customers.edit")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    // Check if customer exists
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        tenantId: user.tenantId,
      },
    });

    if (!existingCustomer) {
      return errorResponse("Customer not found", "NOT_FOUND", 404);
    }

    const body = await request.json();
    const validatedData = updateCustomerSchema.parse(body);

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

    // Update customer
    const updatedCustomer = await prisma.customer.update({
      where: { id: customerId },
      data: {
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

    return successResponse(updatedCustomer);
  } catch (error) {
    console.error("Error updating customer:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to update customer", "SERVER_ERROR", 500);
  }
}

// DELETE /api/customers/[id] - Delete customer
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const customerId = parseInt(id);

    // Check permission
    if (!user.permissions.includes("customers.delete")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    // Check if customer exists
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        tenantId: user.tenantId,
      },
      include: {
        _count: { select: { warrantyCards: true } },
      },
    });

    if (!existingCustomer) {
      return errorResponse("Customer not found", "NOT_FOUND", 404);
    }

    // Check for warranty cards
    if (existingCustomer._count.warrantyCards > 0) {
      return errorResponse(
        "Cannot delete customer with warranty cards",
        "CUSTOMER_HAS_WARRANTY_CARDS",
        400
      );
    }

    // Delete customer
    await prisma.customer.delete({
      where: { id: customerId },
    });

    return successResponse({ message: "Customer deleted successfully" });
  } catch (error) {
    console.error("Error deleting customer:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to delete customer", "SERVER_ERROR", 500);
  }
}
