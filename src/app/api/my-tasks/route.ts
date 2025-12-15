// ===========================================
// My Tasks API - Get claims assigned to current user
// ===========================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  requireAuth,
  parsePaginationParams,
  calculatePaginationMeta,
} from "@/lib/api-utils";

// GET /api/my-tasks - Get claims assigned to current user
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const { page, limit, sortBy, sortOrder, skip } = parsePaginationParams(searchParams);

    // Filters
    const priority = searchParams.get("priority");
    const excludeResolved = searchParams.get("excludeResolved") === "true";
    const onlyResolved = searchParams.get("onlyResolved") === "true";

    // Build where clause - claims assigned to current user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      tenantId: user.tenantId,
      assignedTo: user.id,
    };

    // Priority filter
    if (priority) {
      where.priority = priority;
    }

    // Resolved filter
    if (excludeResolved) {
      where.resolvedAt = null;
    }
    if (onlyResolved) {
      where.resolvedAt = { not: null };
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
        workflow: {
          select: { id: true, name: true },
        },
        currentStep: {
          select: {
            id: true,
            name: true,
            statusName: true,
            stepType: true,
            slaHours: true,
            slaWarningHours: true,
            canSkip: true,
          },
        },
        assignedUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    });

    // Calculate stats
    const now = new Date();
    let slaWarning = 0;
    let slaBreach = 0;

    // Get all pending claims for stats calculation
    const allPendingClaims = await prisma.warrantyClaim.findMany({
      where: {
        tenantId: user.tenantId,
        assignedTo: user.id,
        resolvedAt: null,
      },
      include: {
        currentStep: {
          select: {
            slaHours: true,
            slaWarningHours: true,
          },
        },
      },
    });

    for (const claim of allPendingClaims) {
      if (claim.currentStep?.slaHours && claim.currentStepStartedAt) {
        const stepStartTime = new Date(claim.currentStepStartedAt);
        const slaDeadline = new Date(stepStartTime.getTime() + claim.currentStep.slaHours * 60 * 60 * 1000);
        const hoursRemaining = (slaDeadline.getTime() - now.getTime()) / (1000 * 60 * 60);
        const warningHours = claim.currentStep.slaWarningHours || claim.currentStep.slaHours * 0.2;

        if (hoursRemaining <= 0) {
          slaBreach++;
        } else if (hoursRemaining <= warningHours) {
          slaWarning++;
        }
      }
    }

    // Get completed today count
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const completedToday = await prisma.warrantyClaim.count({
      where: {
        tenantId: user.tenantId,
        assignedTo: user.id,
        resolvedAt: { gte: startOfDay },
      },
    });

    // Build stats object
    const stats = {
      total: allPendingClaims.length,
      pending: allPendingClaims.length,
      slaWarning,
      slaBreach,
      completedToday,
    };

    return successResponse(claims, calculatePaginationMeta(total, page, limit), { stats });
  } catch (error) {
    console.error("Error fetching my tasks:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch tasks", "SERVER_ERROR", 500);
  }
}
