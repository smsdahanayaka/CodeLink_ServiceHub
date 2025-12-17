// ===========================================
// Roles API - Get, Update, Delete by ID
// ===========================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  handleZodError,
  requireAuth,
} from "@/lib/api-utils";
import { updateRoleSchema } from "@/lib/validations";
import { ZodError } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/roles/[id] - Get role by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const role = await prisma.role.findFirst({
      where: {
        id: parseInt(id),
        tenantId: user.tenantId,
      },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!role) {
      return errorResponse("Role not found", "NOT_FOUND", 404);
    }

    return successResponse(role);
  } catch (error) {
    console.error("Error fetching role:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch role", "SERVER_ERROR", 500);
  }
}

// PUT /api/roles/[id] - Update role
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const roleId = parseInt(id);

    // Check permission
    if (!user.permissions.includes("roles.edit")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    // Check if role exists
    const existingRole = await prisma.role.findFirst({
      where: {
        id: roleId,
        tenantId: user.tenantId,
      },
    });

    if (!existingRole) {
      return errorResponse("Role not found", "NOT_FOUND", 404);
    }

    const body = await request.json();

    // Validate input
    const validatedData = updateRoleSchema.parse(body);

    // For system roles, only allow permissions to be updated (not name)
    if (existingRole.isSystem) {
      if (validatedData.name && validatedData.name !== existingRole.name) {
        return errorResponse("Cannot rename system roles", "SYSTEM_ROLE", 400);
      }

      // Update only permissions for system roles
      const updatedRole = await prisma.role.update({
        where: { id: roleId },
        data: {
          permissions: validatedData.permissions,
          description: validatedData.description ?? existingRole.description,
        },
      });

      return successResponse(updatedRole);
    }

    // Check if name is taken by another role
    if (validatedData.name !== existingRole.name) {
      const nameExists = await prisma.role.findFirst({
        where: {
          tenantId: user.tenantId,
          name: validatedData.name,
          id: { not: roleId },
        },
      });

      if (nameExists) {
        return errorResponse("Role name already exists", "DUPLICATE_NAME", 400);
      }
    }

    // Update role
    const updatedRole = await prisma.role.update({
      where: { id: roleId },
      data: {
        name: validatedData.name,
        description: validatedData.description || null,
        permissions: validatedData.permissions,
      },
    });

    return successResponse(updatedRole);
  } catch (error) {
    console.error("Error updating role:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to update role", "SERVER_ERROR", 500);
  }
}

// DELETE /api/roles/[id] - Delete role
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const roleId = parseInt(id);

    // Check permission
    if (!user.permissions.includes("roles.delete")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    // Check if role exists
    const existingRole = await prisma.role.findFirst({
      where: {
        id: roleId,
        tenantId: user.tenantId,
      },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!existingRole) {
      return errorResponse("Role not found", "NOT_FOUND", 404);
    }

    // Prevent deleting system roles
    if (existingRole.isSystem) {
      return errorResponse("Cannot delete system roles", "SYSTEM_ROLE", 400);
    }

    // Prevent deleting roles with users
    if (existingRole._count.users > 0) {
      return errorResponse(
        "Cannot delete role with assigned users",
        "ROLE_IN_USE",
        400
      );
    }

    // Delete role
    await prisma.role.delete({
      where: { id: roleId },
    });

    return successResponse({ message: "Role deleted successfully" });
  } catch (error) {
    console.error("Error deleting role:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to delete role", "SERVER_ERROR", 500);
  }
}
