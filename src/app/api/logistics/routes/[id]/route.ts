// ===========================================
// Routes API - Get, Update, Delete
// ===========================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  handleZodError,
  requireAuth,
} from "@/lib/api-utils";
import { z } from "zod";
import { ZodError } from "zod";

// Validation schema for update
const updateRouteSchema = z.object({
  name: z.string().min(1).optional(),
  zone: z.string().optional(),
  areas: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

// GET /api/logistics/routes/[id] - Get single route
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const routeId = parseInt(id);

    if (isNaN(routeId)) {
      return errorResponse("Invalid route ID", "INVALID_ID", 400);
    }

    const route = await prisma.route.findFirst({
      where: {
        id: routeId,
        tenantId: user.tenantId,
      },
      include: {
        _count: {
          select: { pickups: true },
        },
      },
    });

    if (!route) {
      return errorResponse("Route not found", "NOT_FOUND", 404);
    }

    return successResponse(route);
  } catch (error) {
    console.error("Error fetching route:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch route", "SERVER_ERROR", 500);
  }
}

// PUT /api/logistics/routes/[id] - Update route
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const routeId = parseInt(id);

    if (isNaN(routeId)) {
      return errorResponse("Invalid route ID", "INVALID_ID", 400);
    }

    // Check permission
    if (!user.permissions.includes("logistics.manage_pickups")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const body = await request.json();
    const validatedData = updateRouteSchema.parse(body);

    // Check if route exists
    const existing = await prisma.route.findFirst({
      where: {
        id: routeId,
        tenantId: user.tenantId,
      },
    });

    if (!existing) {
      return errorResponse("Route not found", "NOT_FOUND", 404);
    }

    // Check for duplicate name if name is being changed
    if (validatedData.name && validatedData.name !== existing.name) {
      const duplicate = await prisma.route.findFirst({
        where: {
          tenantId: user.tenantId,
          name: validatedData.name,
          id: { not: routeId },
        },
      });

      if (duplicate) {
        return errorResponse("A route with this name already exists", "DUPLICATE_ROUTE", 400);
      }
    }

    // Update route
    const route = await prisma.route.update({
      where: { id: routeId },
      data: {
        name: validatedData.name,
        zone: validatedData.zone,
        areas: validatedData.areas,
        description: validatedData.description,
        status: validatedData.status,
      },
    });

    return successResponse(route);
  } catch (error) {
    console.error("Error updating route:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to update route", "SERVER_ERROR", 500);
  }
}

// DELETE /api/logistics/routes/[id] - Delete route
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const routeId = parseInt(id);

    if (isNaN(routeId)) {
      return errorResponse("Invalid route ID", "INVALID_ID", 400);
    }

    // Check permission
    if (!user.permissions.includes("logistics.manage_pickups")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    // Check if route exists
    const existing = await prisma.route.findFirst({
      where: {
        id: routeId,
        tenantId: user.tenantId,
      },
      include: {
        _count: {
          select: { pickups: true },
        },
      },
    });

    if (!existing) {
      return errorResponse("Route not found", "NOT_FOUND", 404);
    }

    // Check if route has pickups
    if (existing._count.pickups > 0) {
      return errorResponse(
        "Cannot delete route with existing pickups. Set to inactive instead.",
        "HAS_PICKUPS",
        400
      );
    }

    // Delete route
    await prisma.route.delete({
      where: { id: routeId },
    });

    return successResponse({ message: "Route deleted successfully" });
  } catch (error) {
    console.error("Error deleting route:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to delete route", "SERVER_ERROR", 500);
  }
}
