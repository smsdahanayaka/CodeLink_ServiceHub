// ===========================================
// Single Collector API - Get, Update, Delete
// ===========================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  handleZodError,
  requireAuth,
} from "@/lib/api-utils";
import { updateCollectorSchema } from "@/lib/validations";
import { ZodError } from "zod";

type RouteParams = {
  params: Promise<{ id: string }>;
};

// GET /api/logistics/collectors/[id] - Get single collector
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const collectorId = parseInt(id);

    if (isNaN(collectorId)) {
      return errorResponse("Invalid collector ID", "INVALID_ID", 400);
    }

    // Check permission
    if (!user.permissions.includes("logistics.view")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const collector = await prisma.collector.findFirst({
      where: {
        id: collectorId,
        tenantId: user.tenantId,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
        pickups: {
          where: {
            status: { in: ["PENDING", "ASSIGNED", "IN_TRANSIT"] },
          },
          include: {
            claim: {
              select: { id: true, claimNumber: true },
            },
            fromShop: {
              select: { id: true, name: true, address: true },
            },
          },
          orderBy: { scheduledDate: "asc" },
          take: 10,
        },
        deliveries: {
          where: {
            status: { in: ["PENDING", "ASSIGNED", "IN_TRANSIT"] },
          },
          include: {
            claim: {
              select: { id: true, claimNumber: true },
            },
            toShop: {
              select: { id: true, name: true, address: true },
            },
          },
          orderBy: { scheduledDate: "asc" },
          take: 10,
        },
        _count: {
          select: { pickups: true, deliveries: true },
        },
      },
    });

    if (!collector) {
      return errorResponse("Collector not found", "NOT_FOUND", 404);
    }

    return successResponse(collector);
  } catch (error) {
    console.error("Error fetching collector:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch collector", "SERVER_ERROR", 500);
  }
}

// PUT /api/logistics/collectors/[id] - Update collector
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const collectorId = parseInt(id);

    if (isNaN(collectorId)) {
      return errorResponse("Invalid collector ID", "INVALID_ID", 400);
    }

    // Check permission
    if (!user.permissions.includes("logistics.manage_collectors")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    // Verify collector exists and belongs to tenant
    const existingCollector = await prisma.collector.findFirst({
      where: {
        id: collectorId,
        tenantId: user.tenantId,
      },
    });

    if (!existingCollector) {
      return errorResponse("Collector not found", "NOT_FOUND", 404);
    }

    const body = await request.json();
    const validatedData = updateCollectorSchema.parse(body);

    // If userId is provided and changing, verify user belongs to tenant
    if (validatedData.userId && validatedData.userId !== existingCollector.userId) {
      const existingUser = await prisma.user.findFirst({
        where: {
          id: validatedData.userId,
          tenantId: user.tenantId,
        },
      });
      if (!existingUser) {
        return errorResponse("User not found", "USER_NOT_FOUND", 400);
      }

      // Check if user is already linked to another collector
      const linkedCollector = await prisma.collector.findFirst({
        where: {
          userId: validatedData.userId,
          id: { not: collectorId },
        },
      });
      if (linkedCollector) {
        return errorResponse("User is already linked to another collector", "USER_ALREADY_LINKED", 400);
      }
    }

    // Build update data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {};
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.phone !== undefined) updateData.phone = validatedData.phone;
    if (validatedData.email !== undefined) updateData.email = validatedData.email || null;
    if (validatedData.userId !== undefined) updateData.userId = validatedData.userId || null;
    if (validatedData.vehicleNumber !== undefined) updateData.vehicleNumber = validatedData.vehicleNumber || null;
    if (validatedData.vehicleType !== undefined) updateData.vehicleType = validatedData.vehicleType || null;
    if (validatedData.assignedAreas !== undefined) updateData.assignedAreas = validatedData.assignedAreas || undefined;
    if (validatedData.status !== undefined) updateData.status = validatedData.status;

    // Update collector
    // Note: Permissions should be assigned manually through the role management
    const collector = await prisma.collector.update({
      where: { id: collectorId },
      data: updateData,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    return successResponse(collector);
  } catch (error) {
    console.error("Error updating collector:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to update collector", "SERVER_ERROR", 500);
  }
}

// DELETE /api/logistics/collectors/[id] - Delete collector
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const collectorId = parseInt(id);

    if (isNaN(collectorId)) {
      return errorResponse("Invalid collector ID", "INVALID_ID", 400);
    }

    // Check permission
    if (!user.permissions.includes("logistics.manage_collectors")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    // Verify collector exists and belongs to tenant
    const existingCollector = await prisma.collector.findFirst({
      where: {
        id: collectorId,
        tenantId: user.tenantId,
      },
      include: {
        _count: {
          select: { pickups: true, deliveries: true },
        },
      },
    });

    if (!existingCollector) {
      return errorResponse("Collector not found", "NOT_FOUND", 404);
    }

    // Check if collector has active pickups or deliveries
    const activePickups = await prisma.pickup.count({
      where: {
        collectorId,
        status: { in: ["ASSIGNED", "IN_TRANSIT"] },
      },
    });

    const activeDeliveries = await prisma.delivery.count({
      where: {
        collectorId,
        status: { in: ["ASSIGNED", "IN_TRANSIT"] },
      },
    });

    if (activePickups > 0 || activeDeliveries > 0) {
      return errorResponse(
        `Collector has ${activePickups} active pickup(s) and ${activeDeliveries} active delivery(ies). Reassign them first.`,
        "COLLECTOR_HAS_ACTIVE_TASKS",
        400
      );
    }

    // Delete collector
    await prisma.collector.delete({
      where: { id: collectorId },
    });

    return successResponse({ message: "Collector deleted successfully" });
  } catch (error) {
    console.error("Error deleting collector:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to delete collector", "SERVER_ERROR", 500);
  }
}
