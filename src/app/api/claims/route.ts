// ===========================================
// Warranty Claims API - List and Create
// ===========================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  successResponse,
  errorResponse,
  handleZodError,
  requireAuth,
  parsePaginationParams,
  calculatePaginationMeta,
} from "@/lib/api-utils";
import { createClaimSchema } from "@/lib/validations";
import type { WorkflowCondition } from "@/lib/validations";
import { ZodError } from "zod";
import { triggerStepNotifications } from "@/lib/workflow-notifications";

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

// Helper: Evaluate workflow conditions for auto-trigger
function evaluateConditions(
  conditions: WorkflowCondition[] | null | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>
): boolean {
  if (!conditions || conditions.length === 0) return true;

  let result = true;
  let currentOperator: "AND" | "OR" = "AND";

  for (const condition of conditions) {
    const fieldValue = data[condition.field];
    let conditionResult = false;

    switch (condition.operator) {
      case "equals":
        conditionResult = fieldValue === condition.value;
        break;
      case "not_equals":
        conditionResult = fieldValue !== condition.value;
        break;
      case "greater_than":
        conditionResult = Number(fieldValue) > Number(condition.value);
        break;
      case "less_than":
        conditionResult = Number(fieldValue) < Number(condition.value);
        break;
      case "contains":
        conditionResult = String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase());
        break;
      case "not_contains":
        conditionResult = !String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase());
        break;
      case "in":
        conditionResult = Array.isArray(condition.value) && condition.value.includes(fieldValue);
        break;
      case "not_in":
        conditionResult = Array.isArray(condition.value) && !condition.value.includes(fieldValue);
        break;
      case "is_empty":
        conditionResult = !fieldValue || fieldValue === "" || (Array.isArray(fieldValue) && fieldValue.length === 0);
        break;
      case "is_not_empty":
        conditionResult = !!fieldValue && fieldValue !== "" && (!Array.isArray(fieldValue) || fieldValue.length > 0);
        break;
    }

    if (currentOperator === "AND") {
      result = result && conditionResult;
    } else {
      result = result || conditionResult;
    }

    currentOperator = condition.logicalOperator || "AND";
  }

  return result;
}

// Find the best matching workflow for a claim based on trigger conditions
async function findMatchingWorkflow(
  tenantId: number,
  claimData: {
    priority: string;
    issueCategory?: string | null;
    reportedBy: string;
    productName?: string;
    productCategory?: string;
    shopId?: number;
  }
) {
  // Get all active workflows ordered by: CONDITIONAL first, then AUTO_ON_CLAIM, then default
  const workflows = await prisma.workflow.findMany({
    where: {
      tenantId,
      isActive: true,
      triggerType: { in: ["CONDITIONAL", "AUTO_ON_CLAIM"] },
    },
    include: {
      steps: {
        where: { stepType: "START" },
        orderBy: { stepOrder: "asc" },
        take: 1,
      },
    },
    orderBy: [
      { triggerType: "asc" }, // CONDITIONAL comes before AUTO_ON_CLAIM alphabetically
      { isDefault: "desc" },
    ],
  });

  // First, try to find a CONDITIONAL workflow that matches
  for (const workflow of workflows) {
    if (workflow.triggerType === "CONDITIONAL" && workflow.triggerConditions) {
      const conditions = workflow.triggerConditions as WorkflowCondition[];
      if (evaluateConditions(conditions, claimData)) {
        return workflow;
      }
    }
  }

  // If no conditional match, find AUTO_ON_CLAIM workflow (prefer default)
  const autoWorkflow = workflows.find(
    (w) => w.triggerType === "AUTO_ON_CLAIM" && w.isDefault
  ) || workflows.find((w) => w.triggerType === "AUTO_ON_CLAIM");

  return autoWorkflow || null;
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

    // Check if shop is verified (admin must verify before claims can be created)
    if (warrantyCard.shop && !warrantyCard.shop.isVerified) {
      return errorResponse(
        "Shop is pending verification. Admin must verify the shop before creating claims.",
        "SHOP_NOT_VERIFIED",
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

    // Phase 5: Determine warranty status
    const now = new Date();
    const warrantyEndDate = new Date(warrantyCard.warrantyEndDate);
    const isWarrantyExpired = warrantyEndDate < now;

    // Calculate warranty status for response
    let warrantyStatus: "IN_WARRANTY" | "EXPIRED" | "OVERRIDDEN" = "IN_WARRANTY";
    let isUnderWarranty = true;
    let requiresQuotation = validatedData.requiresQuotation || false;

    if (isWarrantyExpired) {
      warrantyStatus = "EXPIRED";
      isUnderWarranty = false;
      // Automatically require quotation for expired warranty unless overridden
      if (!validatedData.warrantyOverride) {
        requiresQuotation = true;
      }
    }

    // Handle warranty override
    if (validatedData.warrantyOverride) {
      // If warranty is expired but user wants to treat as warranty claim
      if (isWarrantyExpired && validatedData.isUnderWarranty) {
        warrantyStatus = "OVERRIDDEN";
        isUnderWarranty = true;
        requiresQuotation = validatedData.requiresQuotation || false;
      }
      // If warranty is valid but user wants to treat as non-warranty
      else if (!isWarrantyExpired && !validatedData.isUnderWarranty) {
        warrantyStatus = "OVERRIDDEN";
        isUnderWarranty = false;
        requiresQuotation = validatedData.requiresQuotation || true;
      }
    } else {
      // Use provided values or defaults
      isUnderWarranty = isWarrantyExpired ? false : validatedData.isUnderWarranty;
    }

    // Generate claim number
    const claimNumber = await generateClaimNumber(user.tenantId);

    // Build claim data for workflow matching
    const claimMatchData = {
      priority: validatedData.priority,
      issueCategory: validatedData.issueCategory,
      reportedBy: validatedData.reportedBy,
      productName: warrantyCard.product.name,
      productCategory: warrantyCard.product.categoryId?.toString(),
      shopId: warrantyCard.shopId,
    };

    // Find matching workflow based on conditions
    const matchedWorkflow = await findMatchingWorkflow(user.tenantId, claimMatchData);
    const startStep = matchedWorkflow?.steps[0] || null;

    // Create claim with initial history entry
    const newClaim = await prisma.$transaction(async (tx) => {
      const claim = await tx.warrantyClaim.create({
        data: {
          tenantId: user.tenantId,
          claimNumber,
          warrantyCardId: validatedData.warrantyCardId,
          workflowId: matchedWorkflow?.id || null,
          currentStepId: startStep?.id || null,
          currentStepStartedAt: matchedWorkflow ? new Date() : null,
          issueDescription: validatedData.issueDescription,
          issueCategory: validatedData.issueCategory || null,
          priority: validatedData.priority,
          reportedBy: validatedData.reportedBy,
          currentStatus: startStep?.statusName || "new",
          currentLocation: validatedData.reportedBy === "CUSTOMER" ? "CUSTOMER" : "SHOP",
          createdBy: user.id,
          // Auto-assign to user if START step has autoAssignTo
          assignedTo: startStep?.autoAssignTo || null,
          // Phase 5: Warranty validation fields
          isUnderWarranty,
          warrantyOverrideBy: validatedData.warrantyOverride ? user.id : null,
          warrantyOverrideAt: validatedData.warrantyOverride ? new Date() : null,
          warrantyOverrideReason: validatedData.warrantyOverrideReason || null,
          requiresQuotation,
          claimHistory: {
            create: {
              fromStatus: null,
              toStatus: startStep?.statusName || "new",
              workflowStepId: startStep?.id || null,
              actionType: "claim_created",
              performedBy: user.id,
              notes: `Claim created. Issue: ${validatedData.issueDescription.substring(0, 100)}. Warranty: ${warrantyStatus}${requiresQuotation ? ". Quotation required." : ""}`,
              metadata: matchedWorkflow ? {
                workflowId: matchedWorkflow.id,
                workflowName: matchedWorkflow.name,
                triggerType: matchedWorkflow.triggerType,
                autoAssigned: true,
                warrantyStatus,
                isUnderWarranty,
                requiresQuotation,
              } as Prisma.InputJsonValue : Prisma.DbNull,
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
              shop: { select: { id: true, name: true } },
            },
          },
          assignedUser: {
            select: { id: true, firstName: true, lastName: true },
          },
          workflow: {
            select: { id: true, name: true },
          },
          currentStep: {
            select: { id: true, name: true, statusName: true, stepType: true },
          },
        },
      });

      // If workflow was auto-assigned, also record workflow assignment in history
      if (matchedWorkflow) {
        await tx.claimHistory.create({
          data: {
            claimId: claim.id,
            workflowStepId: startStep?.id || null,
            fromStatus: null,
            toStatus: startStep?.statusName || "new",
            actionType: "workflow_assigned",
            performedBy: user.id,
            notes: `Workflow "${matchedWorkflow.name}" auto-assigned based on ${matchedWorkflow.triggerType === "CONDITIONAL" ? "matching conditions" : "default settings"}`,
            metadata: {
              workflowId: matchedWorkflow.id,
              workflowName: matchedWorkflow.name,
              triggerType: matchedWorkflow.triggerType,
            },
          },
        });
      }

      return claim;
    });

    // Trigger ON_ENTER notifications for the start step (async, don't block response)
    if (startStep?.id) {
      triggerStepNotifications(startStep.id, "ON_ENTER", newClaim.id, user.tenantId).catch((err) =>
        console.error("Failed to trigger step notifications:", err)
      );
    }

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
