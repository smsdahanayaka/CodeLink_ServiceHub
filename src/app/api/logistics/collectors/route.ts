// ===========================================
// Collectors API - List and Create
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
import { createCollectorSchema } from "@/lib/validations";
import { ZodError } from "zod";

// GET /api/logistics/collectors - List all collectors
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Check permission
    if (!user.permissions.includes("logistics.view")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const { searchParams } = new URL(request.url);
    const { page, limit, search, sortBy, sortOrder, skip } = parsePaginationParams(searchParams);

    // Additional filters
    const status = searchParams.get("status");

    // Build where clause
    const where: Record<string, unknown> = {
      tenantId: user.tenantId,
    };

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
        { vehicleNumber: { contains: search } },
      ];
    }

    // Status filter
    if (status) {
      where.status = status;
    }

    // Get total count
    const total = await prisma.collector.count({ where });

    // Get collectors with pagination
    const collectors = await prisma.collector.findMany({
      where,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        _count: {
          select: { pickups: true, deliveries: true },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    });

    return successResponse(collectors, calculatePaginationMeta(total, page, limit));
  } catch (error) {
    console.error("Error fetching collectors:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch collectors", "SERVER_ERROR", 500);
  }
}

// POST /api/logistics/collectors - Create new collector
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Check permission
    if (!user.permissions.includes("logistics.manage_collectors")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const body = await request.json();
    const validatedData = createCollectorSchema.parse(body);

    // If userId is provided, verify user belongs to tenant
    if (validatedData.userId) {
      const existingUser = await prisma.user.findFirst({
        where: {
          id: validatedData.userId,
          tenantId: user.tenantId,
        },
      });
      if (!existingUser) {
        return errorResponse("User not found", "USER_NOT_FOUND", 400);
      }

      // Check if user is already linked to a collector
      const existingCollector = await prisma.collector.findFirst({
        where: { userId: validatedData.userId },
      });
      if (existingCollector) {
        return errorResponse("User is already linked to another collector", "USER_ALREADY_LINKED", 400);
      }
    }

    // Create collector
    const collector = await prisma.collector.create({
      data: {
        tenantId: user.tenantId,
        name: validatedData.name,
        phone: validatedData.phone,
        email: validatedData.email || null,
        userId: validatedData.userId || null,
        vehicleNumber: validatedData.vehicleNumber || null,
        vehicleType: validatedData.vehicleType || null,
        assignedAreas: validatedData.assignedAreas || undefined,
        status: validatedData.status,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    return successResponse(collector);
  } catch (error) {
    console.error("Error creating collector:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to create collector", "SERVER_ERROR", 500);
  }
}
