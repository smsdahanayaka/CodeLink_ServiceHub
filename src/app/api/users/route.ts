// ===========================================
// Users API - List and Create
// ===========================================

import { NextRequest } from "next/server";
import { hash } from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  handleZodError,
  requireAuth,
  parsePaginationParams,
  calculatePaginationMeta,
} from "@/lib/api-utils";
import { createUserSchema } from "@/lib/validations";
import { ZodError } from "zod";

// GET /api/users - List all users
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const { page, limit, search, sortBy, sortOrder, skip } = parsePaginationParams(searchParams);

    // Get filter params
    const status = searchParams.get("status");
    const roleId = searchParams.get("roleId");

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      tenantId: user.tenantId,
      ...(search && {
        OR: [
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { email: { contains: search } },
        ],
      }),
      ...(status && { status }),
      ...(roleId && { roleId: parseInt(roleId) }),
    };

    // Get total count
    const total = await prisma.user.count({ where });

    // Get users with pagination
    const users = await prisma.user.findMany({
      where,
      include: {
        role: {
          select: { id: true, name: true },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    });

    // Remove password hash from response
    const safeUsers = users.map(({ passwordHash, ...rest }) => rest);

    return successResponse(safeUsers, calculatePaginationMeta(total, page, limit));
  } catch (error) {
    console.error("Error fetching users:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch users", "SERVER_ERROR", 500);
  }
}

// POST /api/users - Create new user
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Check permission
    if (!user.permissions.includes("users.create")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const body = await request.json();

    // Validate input
    const validatedData = createUserSchema.parse(body);

    // Check if email already exists in tenant
    const existingUser = await prisma.user.findFirst({
      where: {
        tenantId: user.tenantId,
        email: validatedData.email,
      },
    });

    if (existingUser) {
      return errorResponse("Email already exists", "DUPLICATE_EMAIL", 400);
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

    // Hash password
    const passwordHash = await hash(validatedData.password, 12);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        uuid: uuidv4(),
        tenantId: user.tenantId,
        email: validatedData.email,
        passwordHash,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        phone: validatedData.phone || null,
        roleId: validatedData.roleId,
        status: validatedData.status,
      },
      include: {
        role: {
          select: { id: true, name: true },
        },
      },
    });

    // Remove password hash from response
    const { passwordHash: _, ...safeUser } = newUser;

    return successResponse(safeUser);
  } catch (error) {
    console.error("Error creating user:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to create user", "SERVER_ERROR", 500);
  }
}
