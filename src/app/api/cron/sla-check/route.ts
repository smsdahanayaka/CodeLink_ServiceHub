// ===========================================
// SLA Check Cron Job
// Runs periodically to check for SLA warnings and breaches
// ===========================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-utils";
import { checkSlaStatus, escalateClaim } from "@/lib/workflow-notifications";

// Secret key for cron authentication (set in environment variables)
const CRON_SECRET = process.env.CRON_SECRET || "your-cron-secret-key";

// GET /api/cron/sla-check - Check all active claims for SLA warnings/breaches
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }

    const results: {
      tenantId: number;
      tenantName: string;
      warnings: number;
      breaches: number;
      escalated: number;
    }[] = [];

    // Get all active tenants
    const tenants = await prisma.tenant.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true },
    });

    const now = new Date();

    for (const tenant of tenants) {
      let warnings = 0;
      let breaches = 0;
      let escalated = 0;

      // Get all active claims with SLA-tracked steps
      const claims = await prisma.warrantyClaim.findMany({
        where: {
          tenantId: tenant.id,
          currentStepId: { not: null },
          resolvedAt: null,
          currentStep: {
            slaHours: { not: null },
          },
        },
        include: {
          currentStep: true,
        },
      });

      for (const claim of claims) {
        if (!claim.currentStep || !claim.currentStepStartedAt || !claim.currentStep.slaHours) {
          continue;
        }

        const stepStartTime = new Date(claim.currentStepStartedAt);
        const slaDeadline = new Date(stepStartTime.getTime() + claim.currentStep.slaHours * 60 * 60 * 1000);
        const hoursRemaining = (slaDeadline.getTime() - now.getTime()) / (1000 * 60 * 60);
        const warningHours = claim.currentStep.slaWarningHours || claim.currentStep.slaHours * 0.2;

        // Check if we already notified for this state (avoid duplicate notifications)
        const lastNotification = await prisma.claimHistory.findFirst({
          where: {
            claimId: claim.id,
            actionType: { in: ["sla_warning", "sla_breach"] },
            workflowStepId: claim.currentStep.id,
          },
          orderBy: { createdAt: "desc" },
        });

        // Check for breach
        if (hoursRemaining <= 0) {
          breaches++;

          // Only notify if we haven't already for this step
          if (!lastNotification || lastNotification.actionType !== "sla_breach") {
            // Record breach in history
            await prisma.claimHistory.create({
              data: {
                claimId: claim.id,
                workflowStepId: claim.currentStep.id,
                fromStatus: claim.currentStatus,
                toStatus: claim.currentStatus,
                actionType: "sla_breach",
                performedBy: 1, // System user
                notes: `SLA breached for step "${claim.currentStep.name}". Deadline was ${slaDeadline.toISOString()}`,
                metadata: {
                  slaHours: claim.currentStep.slaHours,
                  hoursOverdue: Math.abs(hoursRemaining),
                  deadline: slaDeadline.toISOString(),
                },
              },
            });

            // Get a system user for escalation
            const systemUser = await prisma.user.findFirst({
              where: { tenantId: tenant.id, status: "ACTIVE" },
              orderBy: { createdAt: "asc" },
            });

            // Auto-escalate on breach
            if (systemUser) {
              await escalateClaim(
                claim.id,
                tenant.id,
                `SLA breached: ${Math.abs(Math.round(hoursRemaining))} hours overdue`,
                systemUser.id
              );
              escalated++;
            }
          }
        }
        // Check for warning (but not breach)
        else if (hoursRemaining <= warningHours) {
          warnings++;

          // Only notify if we haven't already for this step
          if (!lastNotification || lastNotification.actionType !== "sla_warning") {
            // Record warning in history
            await prisma.claimHistory.create({
              data: {
                claimId: claim.id,
                workflowStepId: claim.currentStep.id,
                fromStatus: claim.currentStatus,
                toStatus: claim.currentStatus,
                actionType: "sla_warning",
                performedBy: 1, // System user
                notes: `SLA warning for step "${claim.currentStep.name}". ${Math.round(hoursRemaining)} hours remaining.`,
                metadata: {
                  slaHours: claim.currentStep.slaHours,
                  hoursRemaining: hoursRemaining,
                  deadline: slaDeadline.toISOString(),
                },
              },
            });
          }
        }
      }

      results.push({
        tenantId: tenant.id,
        tenantName: tenant.name,
        warnings,
        breaches,
        escalated,
      });
    }

    // Calculate totals
    const totals = results.reduce(
      (acc, r) => ({
        warnings: acc.warnings + r.warnings,
        breaches: acc.breaches + r.breaches,
        escalated: acc.escalated + r.escalated,
      }),
      { warnings: 0, breaches: 0, escalated: 0 }
    );

    return successResponse({
      timestamp: now.toISOString(),
      results,
      totals,
    });
  } catch (error) {
    console.error("Error in SLA check cron:", error);
    return errorResponse("SLA check failed", "SERVER_ERROR", 500);
  }
}

// POST /api/cron/sla-check - Manual trigger with tenant filter
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }

    const body = await request.json();
    const tenantId = body.tenantId as number | undefined;

    const result = await checkSlaStatus(tenantId);

    return successResponse({
      timestamp: new Date().toISOString(),
      tenantId: tenantId || "all",
      ...result,
    });
  } catch (error) {
    console.error("Error in manual SLA check:", error);
    return errorResponse("SLA check failed", "SERVER_ERROR", 500);
  }
}
