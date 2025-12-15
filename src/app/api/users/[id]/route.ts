// ===========================================
// Users API - Get, Update, Delete by ID
// ===========================================

import { NextRequest } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  handleZodError,
  requireAuth,
} from "@/lib/api-utils";
import { updateUserSchema } from "@/lib/validations";
import { ZodError } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/users/[id] - Get user by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const targetUser = await prisma.user.findFirst({
      where: {
        id: parseInt(id),
        tenantId: user.tenantId,
      },
      include: {
        role: {
          select: { id: true, name: true },
        },
      },
    });

    if (!targetUser) {
      return errorResponse("User not found", "NOT_FOUND", 404);
    }

    // Remove password hash from response
    const { passwordHash, ...safeUser } = targetUser;

    return successResponse(safeUser);
  } catch (error) {
    console.error("Error fetching user:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch user", "SERVER_ERROR", 500);
  }
}

// PUT /api/users/[id] - Update user
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const userId = parseInt(id);

    // Check permission
    if (!user.permissions.includes("users.edit")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: {
        id: userId,
        tenantId: user.tenantId,
      },
    });

    if (!existingUser) {
      return errorResponse("User not found", "NOT_FOUND", 404);
    }

    const body = await request.json();

    // Validate input
    const validatedData = updateUserSchema.parse(body);

    // Check if email is taken by another user
    if (validatedData.email !== existingUser.email) {
      const emailExists = await prisma.user.findFirst({
        where: {
          tenantId: user.tenantId,
          email: validatedData.email,
          id: { not: userId },
        },
      });

      if (emailExists) {
        return errorResponse("Email already exists", "DUPLICATE_EMAIL", 400);
      }
    }

    // Check if role exists
    const role = await prisma.role.findFirst({
      where: {
        id: validatedData.roleId,
        tenantId: user.tenantId,
      },
    });

    if (!role) {
      return errorResponse("Role not found", "ROLE_NOT_FOUND", 400);
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      email: validatedData.email,
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      phone: validatedData.phone || null,
      roleId: validatedData.roleId,
      status: validatedData.status,
    };

    // Hash new password if provided
    if (validatedData.password && validatedData.password.length > 0) {
      updateData.passwordHash = await hash(validatedData.password, 12);
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        role: {
          select: { id: true, name: true },
        },
      },
    });

    // Remove password hash from response
    const { passwordHash, ...safeUser } = updatedUser;

    return successResponse(safeUser);
  } catch (error) {
    console.error("Error updating user:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to update user", "SERVER_ERROR", 500);
  }
}

// DELETE /api/users/[id] - Delete user
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const userId = parseInt(id);

    // Check permission
    if (!user.permissions.includes("users.delete")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    // Prevent self-deletion
    if (user.id === userId) {
      return errorResponse("Cannot delete your own account", "SELF_DELETE", 400);
    }

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: {
        id: userId,
        tenantId: user.tenantId,
      },
    });

    if (!existingUser) {
      return errorResponse("User not found", "NOT_FOUND", 404);
    }

    // Delete user
    await prisma.user.delete({
      where: { id: userId },
    });

    return successResponse({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to delete user", "SERVER_ERROR", 500);
  }
}
