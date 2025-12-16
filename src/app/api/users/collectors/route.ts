// ===========================================
// Collector Users API
// Returns users with "Collector" role only
// ===========================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  requireAuth,
} from "@/lib/api-utils";
import { hash } from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { COLLECTOR_ROLE_NAME } from "@/lib/constants/permissions";

// GET /api/users/collectors - Get users with Collector role
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Check permission
    if (!user.permissions.includes("logistics.view") && !user.permissions.includes("logistics.manage_collectors")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const { searchParams } = new URL(request.url);
    const excludeLinked = searchParams.get("excludeLinked") === "true";

    // Find the Collector role for this tenant
    const collectorRole = await prisma.role.findFirst({
      where: {
        tenantId: user.tenantId,
        name: COLLECTOR_ROLE_NAME,
      },
    });

    if (!collectorRole) {
      return successResponse([]);
    }

    // Build where clause
    const where: Record<string, unknown> = {
      tenantId: user.tenantId,
      roleId: collectorRole.id,
      status: "ACTIVE",
    };

    // Optionally exclude users already linked to collectors
    if (excludeLinked) {
      const linkedUserIds = await prisma.collector.findMany({
        where: { tenantId: user.tenantId, userId: { not: null } },
        select: { userId: true },
      });

      const excludeIds = linkedUserIds.map(c => c.userId).filter((id): id is number => id !== null);

      if (excludeIds.length > 0) {
        where.id = { notIn: excludeIds };
      }
    }

    // Get users with Collector role
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      },
      orderBy: { firstName: "asc" },
    });

    return successResponse(users);
  } catch (error) {
    console.error("Error fetching collector users:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch collector users", "SERVER_ERROR", 500);
  }
}

// POST /api/users/collectors - Create new user with Collector role
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Check permission
    if (!user.permissions.includes("logistics.manage_collectors")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const body = await request.json();
    const { email, password, firstName, lastName, phone } = body;

    // Validate required fields
    if (!email || !password || !firstName) {
      return errorResponse("Email, password and first name are required", "VALIDATION_ERROR", 400);
    }

    // Check if email exists
    const existingUser = await prisma.user.findFirst({
      where: {
        tenantId: user.tenantId,
        email,
      },
    });

    if (existingUser) {
      return errorResponse("A user with this email already exists", "EMAIL_EXISTS", 400);
    }

    // Find the Collector role
    let collectorRole = await prisma.role.findFirst({
      where: {
        tenantId: user.tenantId,
        name: COLLECTOR_ROLE_NAME,
      },
    });

    // If Collector role doesn't exist, create it
    if (!collectorRole) {
      const { DEFAULT_ROLE_PERMISSIONS } = await import("@/lib/constants/permissions");

      collectorRole = await prisma.role.create({
        data: {
          tenantId: user.tenantId,
          name: COLLECTOR_ROLE_NAME,
          description: "Handle pickups and deliveries",
          permissions: DEFAULT_ROLE_PERMISSIONS.collector,
          isSystem: true,
        },
      });
    }

    // Hash password
    const hashedPassword = await hash(password, 12);

    // Create user with Collector role
    const newUser = await prisma.user.create({
      data: {
        uuid: uuidv4(),
        tenantId: user.tenantId,
        roleId: collectorRole.id,
        email,
        passwordHash: hashedPassword,
        firstName,
        lastName: lastName || null,
        phone: phone || null,
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      },
    });

    return successResponse(newUser);
  } catch (error) {
    console.error("Error creating collector user:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to create collector user", "SERVER_ERROR", 500);
  }
}
