// ===========================================
// Auth Refresh API - Refresh User Session Data
// ===========================================

import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  requireAuth,
} from "@/lib/api-utils";

// GET /api/auth/refresh - Get current user's latest permissions from database
export async function GET() {
  try {
    const sessionUser = await requireAuth();

    // Fetch fresh user data with role from database
    const user = await prisma.user.findFirst({
      where: {
        id: sessionUser.id,
        tenantId: sessionUser.tenantId,
      },
      include: {
        role: true,
      },
    });

    if (!user) {
      return errorResponse("User not found", "NOT_FOUND", 404);
    }

    if (user.status !== "ACTIVE") {
      return errorResponse("User account is not active", "INACTIVE", 403);
    }

    // Return fresh user data
    return successResponse({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      tenantId: user.tenantId,
      roleId: user.roleId,
      roleName: user.role.name,
      permissions: user.role.permissions as string[],
    });
  } catch (error) {
    console.error("Error refreshing user data:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to refresh user data", "SERVER_ERROR", 500);
  }
}
