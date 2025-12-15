// ===========================================
// Process Queued Notifications Cron Job
// Processes pending SMS and Email notifications
// ===========================================

import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-utils";
import { retryFailedEmails, isEmailConfigured } from "@/lib/email-provider";
import { retryFailedSms, isSmsConfigured } from "@/lib/sms-provider";
import { prisma } from "@/lib/prisma";

// Secret key for cron authentication (MUST be set in environment variables)
const CRON_SECRET = process.env.CRON_SECRET;

// Validate CRON_SECRET is configured
function validateCronSecret(authHeader: string | null): boolean {
  if (!CRON_SECRET) {
    console.error("CRON_SECRET environment variable is not configured");
    return false;
  }
  return authHeader === `Bearer ${CRON_SECRET}`;
}

// GET /api/cron/process-notifications - Process all queued notifications
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization");
    if (!validateCronSecret(authHeader)) {
      return errorResponse(
        CRON_SECRET ? "Unauthorized" : "CRON_SECRET not configured",
        "UNAUTHORIZED",
        401
      );
    }

    const results = {
      timestamp: new Date().toISOString(),
      email: {
        configured: isEmailConfigured(),
        processed: { attempted: 0, succeeded: 0, failed: 0 },
      },
      sms: {
        configured: isSmsConfigured(),
        processed: { attempted: 0, succeeded: 0, failed: 0 },
      },
    };

    // Process queued emails if provider is configured
    if (isEmailConfigured()) {
      // First, process any "queued" emails (never attempted)
      const queuedEmails = await prisma.emailLog.findMany({
        where: {
          status: "PENDING",
          provider: "queued",
        },
        take: 50,
        orderBy: { createdAt: "asc" },
      });

      for (const email of queuedEmails) {
        const { sendEmailWithLogging } = await import("@/lib/email-provider");
        await sendEmailWithLogging(email.tenantId, email.templateId, {
          to: email.toEmail,
          subject: email.subject,
          html: email.body,
          text: email.body.replace(/<[^>]*>/g, ""),
        });

        // Delete the queued entry since sendEmailWithLogging creates a new one
        await prisma.emailLog.delete({ where: { id: email.id } });
        results.email.processed.attempted++;
        results.email.processed.succeeded++;
      }

      // Then retry failed emails
      const retryResult = await retryFailedEmails(undefined, 50);
      results.email.processed.attempted += retryResult.attempted;
      results.email.processed.succeeded += retryResult.succeeded;
      results.email.processed.failed += retryResult.failed;
    }

    // Process queued SMS if provider is configured
    if (isSmsConfigured()) {
      // First, process any "queued" SMS (never attempted)
      const queuedSms = await prisma.smsLog.findMany({
        where: {
          status: "PENDING",
          provider: "queued",
        },
        take: 50,
        orderBy: { createdAt: "asc" },
      });

      for (const sms of queuedSms) {
        const { sendSmsWithLogging } = await import("@/lib/sms-provider");
        await sendSmsWithLogging(sms.tenantId, sms.templateId, {
          to: sms.phoneNumber,
          message: sms.message,
        });

        // Delete the queued entry since sendSmsWithLogging creates a new one
        await prisma.smsLog.delete({ where: { id: sms.id } });
        results.sms.processed.attempted++;
        results.sms.processed.succeeded++;
      }

      // Then retry failed SMS
      const retryResult = await retryFailedSms(undefined, 50);
      results.sms.processed.attempted += retryResult.attempted;
      results.sms.processed.succeeded += retryResult.succeeded;
      results.sms.processed.failed += retryResult.failed;
    }

    return successResponse(results);
  } catch (error) {
    console.error("Error processing notifications:", error);
    return errorResponse("Notification processing failed", "SERVER_ERROR", 500);
  }
}

// POST /api/cron/process-notifications - Process notifications for specific tenant
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization");
    if (!validateCronSecret(authHeader)) {
      return errorResponse(
        CRON_SECRET ? "Unauthorized" : "CRON_SECRET not configured",
        "UNAUTHORIZED",
        401
      );
    }

    const body = await request.json();
    const tenantId = body.tenantId as number | undefined;

    const results = {
      timestamp: new Date().toISOString(),
      tenantId: tenantId || "all",
      email: {
        configured: isEmailConfigured(),
        processed: { attempted: 0, succeeded: 0, failed: 0 },
      },
      sms: {
        configured: isSmsConfigured(),
        processed: { attempted: 0, succeeded: 0, failed: 0 },
      },
    };

    // Process emails
    if (isEmailConfigured()) {
      const retryResult = await retryFailedEmails(tenantId, 100);
      results.email.processed = retryResult;
    }

    // Process SMS
    if (isSmsConfigured()) {
      const retryResult = await retryFailedSms(tenantId, 100);
      results.sms.processed = retryResult;
    }

    return successResponse(results);
  } catch (error) {
    console.error("Error processing notifications:", error);
    return errorResponse("Notification processing failed", "SERVER_ERROR", 500);
  }
}
