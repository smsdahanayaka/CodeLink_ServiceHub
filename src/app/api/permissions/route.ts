// ===========================================
// Permissions API - Get Available Permissions
// ===========================================

import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  requireAuth,
} from "@/lib/api-utils";
import { PERMISSIONS, PERMISSION_GROUPS } from "@/lib/constants/permissions";

// GET /api/permissions - Get all available permissions
export async function GET() {
  try {
    const user = await requireAuth();

    // Return permissions with their labels and groups
    const permissions = Object.entries(PERMISSIONS).map(([key, label]) => ({
      key,
      label,
    }));

    // Return grouped permissions
    const groups = Object.entries(PERMISSION_GROUPS).map(([name, perms]) => ({
      name,
      permissions: perms.map((key) => ({
        key,
        label: PERMISSIONS[key as keyof typeof PERMISSIONS],
      })),
    }));

    return successResponse({
      permissions,
      groups,
    });
  } catch (error) {
    console.error("Error fetching permissions:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch permissions", "SERVER_ERROR", 500);
  }
}
