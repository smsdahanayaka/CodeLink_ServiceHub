// ===========================================
// Eligible Users for Workflow Step API
// GET - Get users eligible to be assigned to a step
// ===========================================
//
// Assignment Logic (Industry Standard):
// 1. assignmentType = "USERS" → Show only users in allowedUserIds
// 2. assignmentType = "ROLES" → Show only users with roles in allowedRoleIds
// 3. assignmentType = "ALL" (or not set) → Show all active users
// 4. autoAssignTo pre-selects a specific user (but still shows all eligible)
// ===========================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireAuth,
  successResponse,
  errorResponse,
} from "@/lib/api-utils";

// GET /api/workflows/steps/[stepId]/eligible-users - Get eligible users
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stepId: string }> }
) {
  try {
    const user = await requireAuth();
    const { stepId } = await params;
    const workflowStepId = parseInt(stepId);

    if (isNaN(workflowStepId)) {
      return errorResponse("Invalid step ID", "INVALID_ID", 400);
    }

    // Get the workflow step with all assignment configuration
    const step = await prisma.workflowStep.findFirst({
      where: { id: workflowStepId },
      include: {
        workflow: { select: { tenantId: true } },
        requiredRole: { select: { id: true, name: true } },
        autoAssignUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            status: true,
            role: { select: { id: true, name: true } }
          }
        },
      },
    });

    if (!step) {
      return errorResponse("Workflow step not found", "NOT_FOUND", 404);
    }

    // Verify tenant
    if (step.workflow.tenantId !== user.tenantId) {
      return errorResponse("Access denied", "FORBIDDEN", 403);
    }

    // Parse JSON arrays - use type assertion for the new fields
    const allowedRoleIds = (step.allowedRoleIds as number[] | null) || null;
    const allowedUserIds = (step.allowedUserIds as number[] | null) || null;
    const assignmentType = ((step.assignmentType as string) || "ALL") as "ALL" | "ROLES" | "USERS";

    console.log("[eligible-users] Step config:", {
      stepId: step.id,
      stepName: step.name,
      assignmentType,
      allowedRoleIds,
      allowedUserIds,
      requiredRoleId: step.requiredRoleId,
      autoAssignTo: step.autoAssignTo,
      tenantId: user.tenantId,
    });

    // Build where clause based on assignment configuration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = {
      tenantId: user.tenantId,
      status: "ACTIVE",
    };

    // Determine assignment mode and build filter
    let assignmentMode: "USERS" | "ROLES" | "ALL" = "ALL";
    let preSelectedUserId: number | null = null;
    let allowedRoles: { id: number; name: string }[] = [];

    // Check assignment type (new system)
    if (assignmentType === "USERS" && allowedUserIds && allowedUserIds.length > 0) {
      // Specific users selected
      assignmentMode = "USERS";
      whereClause.id = { in: allowedUserIds };
    } else if (assignmentType === "ROLES" && allowedRoleIds && allowedRoleIds.length > 0) {
      // Specific roles selected
      assignmentMode = "ROLES";
      whereClause.roleId = { in: allowedRoleIds };

      // Fetch role names for display
      const roles = await prisma.role.findMany({
        where: { id: { in: allowedRoleIds } },
        select: { id: true, name: true },
      });
      allowedRoles = roles;
    } else if (step.requiredRoleId) {
      // Legacy: single role assignment (backward compatibility)
      assignmentMode = "ROLES";
      whereClause.roleId = step.requiredRoleId;
      if (step.requiredRole) {
        allowedRoles = [step.requiredRole];
      }
    } else {
      // Default: All active users
      assignmentMode = "ALL";
    }

    // Set pre-selected user if autoAssignTo is set
    if (step.autoAssignTo && step.autoAssignUser) {
      preSelectedUserId = step.autoAssignTo;
    }

    console.log("[eligible-users] Where clause:", whereClause, "Mode:", assignmentMode);

    // Fetch eligible users
    const eligibleUsers = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: { select: { id: true, name: true } },
        _count: {
          select: {
            assignedClaims: {
              where: {
                resolvedAt: null, // Only count unresolved claims
              },
            },
          },
        },
      },
      orderBy: [
        { firstName: "asc" },
        { lastName: "asc" },
      ],
    });

    console.log("[eligible-users] Found users:", eligibleUsers.length);

    // Format response
    const formattedUsers = eligibleUsers.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      fullName: `${u.firstName || ""} ${u.lastName || ""}`.trim(),
      email: u.email,
      role: u.role,
      roleName: u.role?.name || "Unknown",
      workload: u._count.assignedClaims,
      isPreSelected: u.id === preSelectedUserId,
    }));

    // Sort: pre-selected user first, then by workload (least busy first)
    formattedUsers.sort((a, b) => {
      if (a.isPreSelected && !b.isPreSelected) return -1;
      if (!a.isPreSelected && b.isPreSelected) return 1;
      return a.workload - b.workload;
    });

    return successResponse({
      step: {
        id: step.id,
        name: step.name,
        stepType: step.stepType,
      },
      assignmentConfig: {
        mode: assignmentMode,
        assignmentType: assignmentType,
        allowedRoles: allowedRoles,
        allowedUserIds: allowedUserIds || [],
        requiredRole: step.requiredRole, // Legacy
        autoAssignUser: step.autoAssignUser ? {
          id: step.autoAssignUser.id,
          firstName: step.autoAssignUser.firstName,
          lastName: step.autoAssignUser.lastName,
          roleName: step.autoAssignUser.role?.name || "Unknown",
        } : null,
        requireSelection: step.requireNextUserSelection,
        preSelectedUserId,
      },
      eligibleUsers: formattedUsers,
      totalEligible: formattedUsers.length,
    });
  } catch (error) {
    console.error("Error fetching eligible users:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch eligible users", "SERVER_ERROR", 500);
  }
}
