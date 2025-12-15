// ===========================================
// Roles API - List and Create
// ===========================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  handleZodError,
  requireAuth,
} from "@/lib/api-utils";
import { createRoleSchema } from "@/lib/validations";
import { ZodError } from "zod";

// GET /api/roles - List all roles
export async function GET() {
  try {
    const user = await requireAuth();

    const roles = await prisma.role.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    return successResponse(roles);
  } catch (error) {
    console.error("Error fetching roles:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch roles", "SERVER_ERROR", 500);
  }
}

// POST /api/roles - Create new role
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Check permission
    if (!user.permissions.includes("roles.create")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const body = await request.json();

    // Validate input
    const validatedData = createRoleSchema.parse(body);

    // Check if role name already exists
    const existingRole = await prisma.role.findFirst({
      where: {
        tenantId: user.tenantId,
        name: validatedData.name,
      },
    });

    if (existingRole) {
      return errorResponse("Role name already exists", "DUPLICATE_NAME", 400);
    }

    // Create role
    const newRole = await prisma.role.create({
      data: {
        tenantId: user.tenantId,
        name: validatedData.name,
        description: validatedData.description || null,
        permissions: validatedData.permissions,
        isSystem: false,
      },
    });

    return successResponse(newRole);
  } catch (error) {
    console.error("Error creating role:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to create role", "SERVER_ERROR", 500);
  }
}
