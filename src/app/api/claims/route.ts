// ===========================================
// Warranty Claims API - List and Create
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
import { createClaimSchema } from "@/lib/validations";
import { ZodError } from "zod";

// Generate unique claim number
async function generateClaimNumber(tenantId: number): Promise<string> {
  const prefix = "CLM";
  const year = new Date().getFullYear().toString().slice(-2);
  const month = (new Date().getMonth() + 1).toString().padStart(2, "0");

  // Get the count of claims this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const count = await prisma.warrantyClaim.count({
    where: {
      tenantId,
      createdAt: { gte: startOfMonth },
    },
  });

  const sequence = (count + 1).toString().padStart(5, "0");
  return `${prefix}${year}${month}${sequence}`;
}

// GET /api/claims - List all warranty claims
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const { page, limit, search, sortBy, sortOrder, skip } = parsePaginationParams(searchParams);

    // Additional filters
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const warrantyCardId = searchParams.get("warrantyCardId");
    const assignedTo = searchParams.get("assignedTo");

    // Check if user can view all claims or only assigned
    const canViewAll = user.permissions.includes("claims.view_all");
    const canViewAssigned = user.permissions.includes("claims.view_assigned");

    // Build where clause
    const where: Record<string, unknown> = {
      tenantId: user.tenantId,
    };

    // If user can only view assigned claims, filter by assignedTo
    if (!canViewAll && canViewAssigned) {
      where.assignedTo = user.id;
    }

    // Search filter
    if (search) {
      where.OR = [
        { claimNumber: { contains: search } },
        { issueDescription: { contains: search } },
        { warrantyCard: { cardNumber: { contains: search } } },
        { warrantyCard: { serialNumber: { contains: search } } },
        { warrantyCard: { customer: { name: { contains: search } } } },
        { warrantyCard: { customer: { phone: { contains: search } } } },
      ];
    }

    // Status filter
    if (status) {
      where.currentStatus = status;
    }

    // Priority filter
    if (priority) {
      where.priority = priority;
    }

    // Warranty card filter
    if (warrantyCardId) {
      where.warrantyCardId = parseInt(warrantyCardId);
    }

    // Assigned to filter (if user can view all)
    if (assignedTo && canViewAll) {
      where.assignedTo = assignedTo === "unassigned" ? null : parseInt(assignedTo);
    }

    // Get total count
    const total = await prisma.warrantyClaim.count({ where });

    // Get claims with pagination
    const claims = await prisma.warrantyClaim.findMany({
      where,
      include: {
        warrantyCard: {
          select: {
            id: true,
            cardNumber: true,
            serialNumber: true,
            product: {
              select: { id: true, name: true, modelNumber: true },
            },
            customer: {
              select: { id: true, name: true, phone: true },
            },
            shop: {
              select: { id: true, name: true, code: true },
            },
          },
        },
        assignedUser: {
          select: { id: true, firstName: true, lastName: true },
        },
        _count: {
          select: { claimHistory: true },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    });

    return successResponse(claims, calculatePaginationMeta(total, page, limit));
  } catch (error) {
    console.error("Error fetching claims:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch claims", "SERVER_ERROR", 500);
  }
}

// POST /api/claims - Create new warranty claim
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Check permission
    if (!user.permissions.includes("claims.create")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const body = await request.json();
    const validatedData = createClaimSchema.parse(body);

    // Verify warranty card exists and belongs to tenant
    const warrantyCard = await prisma.warrantyCard.findFirst({
      where: {
        id: validatedData.warrantyCardId,
        tenantId: user.tenantId,
      },
      include: {
        product: true,
        customer: true,
        shop: true,
      },
    });

    if (!warrantyCard) {
      return errorResponse("Warranty card not found", "WARRANTY_CARD_NOT_FOUND", 400);
    }

    // Check if warranty is still valid
    const now = new Date();
    const warrantyEndDate = new Date(warrantyCard.warrantyEndDate);
    if (warrantyEndDate < now) {
      return errorResponse(
        "Warranty has expired. Cannot create claim for expired warranty.",
        "WARRANTY_EXPIRED",
        400
      );
    }

    // Check if warranty card is void
    if (warrantyCard.status === "VOID") {
      return errorResponse(
        "Warranty card has been voided. Cannot create claim.",
        "WARRANTY_VOID",
        400
      );
    }

    // Generate claim number
    const claimNumber = await generateClaimNumber(user.tenantId);

    // Get default workflow (if any)
    const defaultWorkflow = await prisma.workflow.findFirst({
      where: {
        tenantId: user.tenantId,
        isDefault: true,
        isActive: true,
      },
      include: {
        steps: {
          where: { stepType: "START" },
          orderBy: { stepOrder: "asc" },
          take: 1,
        },
      },
    });

    // Create claim with initial history entry
    const newClaim = await prisma.warrantyClaim.create({
      data: {
        tenantId: user.tenantId,
        claimNumber,
        warrantyCardId: validatedData.warrantyCardId,
        workflowId: defaultWorkflow?.id || null,
        currentStepId: defaultWorkflow?.steps[0]?.id || null,
        issueDescription: validatedData.issueDescription,
        issueCategory: validatedData.issueCategory || null,
        priority: validatedData.priority,
        reportedBy: validatedData.reportedBy,
        currentStatus: defaultWorkflow?.steps[0]?.statusName || "new",
        currentLocation: validatedData.reportedBy === "CUSTOMER" ? "CUSTOMER" : "SHOP",
        createdBy: user.id,
        claimHistory: {
          create: {
            fromStatus: null,
            toStatus: defaultWorkflow?.steps[0]?.statusName || "new",
            actionType: "CLAIM_CREATED",
            performedBy: user.id,
            notes: `Claim created. Issue: ${validatedData.issueDescription.substring(0, 100)}`,
          },
        },
      },
      include: {
        warrantyCard: {
          select: {
            id: true,
            cardNumber: true,
            serialNumber: true,
            product: { select: { id: true, name: true } },
            customer: { select: { id: true, name: true, phone: true } },
          },
        },
        assignedUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return successResponse(newClaim);
  } catch (error) {
    console.error("Error creating claim:", error);
    if (error instanceof ZodError) {
      return handleZodError(error);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to create claim", "SERVER_ERROR", 500);
  }
}
