// ===========================================
// API Utility Functions
// Simple helpers for API routes
// ===========================================

import { NextResponse } from "next/server";
import { auth } from "./auth";
import { prisma } from "./prisma";
import { ZodError } from "zod";

// Standard API response type
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Extended user type with numeric ID
export interface AuthenticatedUser {
  id: number;
  uuid: string;
  email: string;
  firstName: string;
  lastName: string;
  tenantId: number;
  roleId: number;
  roleName: string;
  permissions: string[];
}

// Success response helper
export function successResponse<T>(data: T, meta?: ApiResponse["meta"]) {
  const response: ApiResponse<T> = { success: true, data };
  if (meta) response.meta = meta;
  return NextResponse.json(response);
}

// Error response helper
export function errorResponse(
  message: string,
  code: string = "ERROR",
  status: number = 400,
  details?: unknown
) {
  const response: ApiResponse = {
    success: false,
    error: { code, message, details },
  };
  return NextResponse.json(response, { status });
}

// Handle Zod validation errors
export function handleZodError(error: ZodError) {
  const details = error.issues.map((e) => ({
    field: e.path.join("."),
    message: e.message,
  }));
  return errorResponse("Validation failed", "VALIDATION_ERROR", 400, details);
}

// Get current user's tenant ID from session
export async function getCurrentTenantId(): Promise<number | null> {
  const session = await auth();
  return session?.user?.tenantId ?? null;
}

// Get current user from session
export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

// Check if user has permission
export async function checkPermission(permission: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  return user.permissions.includes(permission);
}

// Require authentication middleware - returns user with numeric ID
export async function requireAuth(): Promise<AuthenticatedUser> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  // Look up the numeric user ID from the UUID
  const dbUser = await prisma.user.findUnique({
    where: { uuid: session.user.id },
    select: { id: true },
  });

  if (!dbUser) {
    throw new Error("Unauthorized");
  }

  return {
    id: dbUser.id,
    uuid: session.user.id,
    email: session.user.email,
    firstName: session.user.firstName,
    lastName: session.user.lastName,
    tenantId: session.user.tenantId,
    roleId: session.user.roleId,
    roleName: session.user.roleName,
    permissions: session.user.permissions,
  };
}

// Get tenant by ID
export async function getTenantById(id: number) {
  return prisma.tenant.findUnique({ where: { id } });
}

// Parse pagination params from URL
export function parsePaginationParams(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10")));
  const search = searchParams.get("search") || "";
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = (searchParams.get("sortOrder") || "desc") as "asc" | "desc";

  return { page, limit, search, sortBy, sortOrder, skip: (page - 1) * limit };
}

// Calculate pagination meta
export function calculatePaginationMeta(total: number, page: number, limit: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
