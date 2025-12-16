// ===========================================
// Eligible Users for Workflow Step API
// GET - Get users eligible to be assigned to a step
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

    // Get the workflow step
    const step = await prisma.workflowStep.findFirst({
      where: { id: workflowStepId },
      include: {
        workflow: { select: { tenantId: true } },
        requiredRole: { select: { id: true, name: true } },
      },
    });

    if (!step) {
      return errorResponse("Workflow step not found", "NOT_FOUND", 404);
    }

    // Verify tenant
    if (step.workflow.tenantId !== user.tenantId) {
      return errorResponse("Access denied", "FORBIDDEN", 403);
    }

    // Build user query based on step requirements
    const userWhere: Record<string, unknown> = {
      tenantId: user.tenantId,
      status: "ACTIVE",
    };

    // If step requires a specific role, filter by that role
    if (step.requiredRoleId) {
      userWhere.roleId = step.requiredRoleId;
    }

    // Get eligible users with their current workload (assigned claims count)
    const eligibleUsers = await prisma.user.findMany({
      where: userWhere,
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

    // Check if step has required permissions
    const requiredPermissions = step.requiredPermissions as string[] | null;

    // Filter users by permissions if required
    let filteredUsers = eligibleUsers;
    if (requiredPermissions && requiredPermissions.length > 0) {
      // Get roles with those permissions
      const rolesWithPermissions = await prisma.role.findMany({
        where: { tenantId: user.tenantId },
        select: { id: true, permissions: true },
      });

      const validRoleIds = rolesWithPermissions
        .filter((role) => {
          const rolePerms = role.permissions as string[];
          return requiredPermissions.every((perm) => rolePerms.includes(perm));
        })
        .map((r) => r.id);

      filteredUsers = eligibleUsers.filter((u) =>
        validRoleIds.includes(u.role.id)
      );
    }

    // Format response
    const formattedUsers = filteredUsers.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      fullName: `${u.firstName || ""} ${u.lastName || ""}`.trim(),
      email: u.email,
      role: u.role,
      workload: u._count.assignedClaims,
    }));

    // Sort by workload (least busy first)
    formattedUsers.sort((a, b) => a.workload - b.workload);

    return successResponse({
      step: {
        id: step.id,
        name: step.name,
        requiredRole: step.requiredRole,
        requiredPermissions: requiredPermissions || [],
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
