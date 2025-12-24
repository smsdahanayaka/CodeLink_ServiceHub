// ===========================================
// Routes API - List and Create
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
import { z } from "zod";
import { ZodError } from "zod";

// Validation schemas
const createRouteSchema = z.object({
  name: z.string().min(1, "Route name is required"),
  zone: z.string().optional(),
  areas: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

// GET /api/logistics/routes - List all routes
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Check permission
    if (
      !user.permissions.includes("logistics.view") &&
      !user.permissions.includes("logistics.collect") &&
      !user.permissions.includes("logistics.manage_pickups")
    ) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const { searchParams } = new URL(request.url);
    const { page, limit, search, sortBy, sortOrder, skip } = parsePaginationParams(searchParams);

    // Additional filters
    const status = searchParams.get("status");

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {
      tenantId: user.tenantId,
    };

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { zone: { contains: search } },
        { areas: { contains: search } },
      ];
    }

    // Status filter
    if (status) {
      where.status = status;
    }

    // Get total count
    const total = await prisma.route.count({ where });

    // Get routes with pagination
    const routes = await prisma.route.findMany({
      where,
      orderBy: { [sortBy === "createdAt" ? "createdAt" : sortBy]: sortOrder },
      skip,
      take: limit,
    });

    return successResponse(routes, calculatePaginationMeta(total, page, limit));
  } catch (error) {
    console.error("Error fetching routes:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch routes", "SERVER_ERROR", 500);
  }
}

// POST /api/logistics/routes - Create new route
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Check permission
    if (
      !user.permissions.includes("logistics.manage_pickups") &&
      !user.permissions.includes("logistics.collect")
    ) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const body = await request.json();
    const validatedData = createRouteSchema.parse(body);

    // Check for duplicate name
    const existing = await prisma.route.findFirst({
      where: {
        tenantId: user.tenantId,
        name: validatedData.name,
      },
    });

    if (existing) {
      return errorResponse("A route with this name already exists", "DUPLICATE_ROUTE", 400);
    }

    // Create route
    const route = await prisma.route.create({
      data: {
        tenantId: user.tenantId,
        name: validatedData.name,
        zone: validatedData.zone || null,
        areas: validatedData.areas || null,
        description: validatedData.description || null,
        status: validatedData.status,
      },
    });

    return successResponse(route);
  } catch (error) {
    console.error("Error creating route:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to create route", "SERVER_ERROR", 500);
  }
}
