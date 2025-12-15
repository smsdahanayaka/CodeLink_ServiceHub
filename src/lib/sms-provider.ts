// ===========================================
// SMS Provider Service
// Supports Twilio for SMS delivery
// ===========================================

import { prisma } from "@/lib/prisma";

// SMS provider configuration
const SMS_PROVIDER = process.env.SMS_PROVIDER || "twilio";
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

export interface SmsOptions {
  to: string;
  message: string;
}

export interface SmsResult {
  success: boolean;
  messageId?: string;
  provider: string;
  error?: string;
  cost?: number;
}

// Check if SMS provider is configured
export function isSmsConfigured(): boolean {
  if (SMS_PROVIDER === "twilio") {
    return !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER);
  }
  return false;
}

// Normalize phone number to E.164 format
export function normalizePhoneNumber(phone: string, defaultCountryCode = "+91"): string {
  // Remove all non-numeric characters except +
  let normalized = phone.replace(/[^\d+]/g, "");

  // If starts with +, keep it
  if (normalized.startsWith("+")) {
    return normalized;
  }

  // If it's a 10-digit number (common in India), add country code
  if (normalized.length === 10) {
    return `${defaultCountryCode}${normalized}`;
  }

  // If it's 11+ digits without +, assume first digits are country code
  if (normalized.length >= 11) {
    return `+${normalized}`;
  }

  // Otherwise, add default country code
  return `${defaultCountryCode}${normalized}`;
}

// Send SMS using configured provider
export async function sendSms(options: SmsOptions): Promise<SmsResult> {
  if (!isSmsConfigured()) {
    console.warn("SMS provider not configured. SMS will be queued but not sent.");
    return {
      success: false,
      provider: SMS_PROVIDER,
      error: "SMS provider not configured",
    };
  }

  if (SMS_PROVIDER === "twilio") {
    return sendSmsViaTwilio(options);
  }

  return {
    success: false,
    provider: "none",
    error: "Unknown SMS provider",
  };
}

// Twilio SMS implementation
async function sendSmsViaTwilio(options: SmsOptions): Promise<SmsResult> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    return {
      success: false,
      provider: "twilio",
      error: "Twilio not configured",
    };
  }

  try {
    const normalizedPhone = normalizePhoneNumber(options.to);

    // Use Twilio REST API directly (no SDK needed)
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

    const formData = new URLSearchParams();
    formData.append("To", normalizedPhone);
    formData.append("From", TWILIO_PHONE_NUMBER);
    formData.append("Body", options.message);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")}`,
      },
      body: formData.toString(),
    });

    const data = await response.json();

    if (response.ok && data.sid) {
      return {
        success: true,
        messageId: data.sid,
        provider: "twilio",
        cost: data.price ? parseFloat(data.price) : undefined,
      };
    }

    console.error("Twilio API error:", data);
    return {
      success: false,
      provider: "twilio",
      error: data.message || `Twilio error: ${response.status}`,
    };
  } catch (error) {
    console.error("Twilio send error:", error);
    return {
      success: false,
      provider: "twilio",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Send SMS and log to database
export async function sendSmsWithLogging(
  tenantId: number,
  templateId: number | null,
  options: SmsOptions
): Promise<SmsResult> {
  const normalizedPhone = normalizePhoneNumber(options.to);

  // Create initial log entry
  const log = await prisma.smsLog.create({
    data: {
      tenantId,
      templateId,
      phoneNumber: normalizedPhone,
      message: options.message,
      status: "PENDING",
      provider: SMS_PROVIDER,
    },
  });

  // Attempt to send
  const result = await sendSms({
    to: normalizedPhone,
    message: options.message,
  });

  // Update log with result
  await prisma.smsLog.update({
    where: { id: log.id },
    data: {
      status: result.success ? "SENT" : "FAILED",
      providerMessageId: result.messageId || null,
      errorMessage: result.error || null,
      cost: result.cost ? result.cost : null,
      sentAt: result.success ? new Date() : null,
    },
  });

  return result;
}

// Retry failed SMS messages (can be called by a cron job)
export async function retryFailedSms(tenantId?: number, limit = 50): Promise<{
  attempted: number;
  succeeded: number;
  failed: number;
}> {
  const where: {
    status: "FAILED";
    createdAt: { gte: Date };
    tenantId?: number;
  } = {
    status: "FAILED",
    createdAt: {
      gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours only
    },
  };

  if (tenantId) {
    where.tenantId = tenantId;
  }

  const failedSms = await prisma.smsLog.findMany({
    where,
    take: limit,
    orderBy: { createdAt: "asc" },
  });

  let succeeded = 0;
  let failed = 0;

  for (const sms of failedSms) {
    const result = await sendSms({
      to: sms.phoneNumber,
      message: sms.message,
    });

    if (result.success) {
      succeeded++;
      await prisma.smsLog.update({
        where: { id: sms.id },
        data: {
          status: "SENT",
          providerMessageId: result.messageId,
          cost: result.cost ? result.cost : null,
          sentAt: new Date(),
          errorMessage: null,
        },
      });
    } else {
      failed++;
      await prisma.smsLog.update({
        where: { id: sms.id },
        data: {
          errorMessage: result.error,
        },
      });
    }
  }

  return {
    attempted: failedSms.length,
    succeeded,
    failed,
  };
}

// Get SMS delivery status from Twilio
export async function getSmsStatus(messageId: string): Promise<{
  status: string;
  errorCode?: string;
  errorMessage?: string;
}> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    return { status: "unknown" };
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages/${messageId}.json`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")}`,
      },
    });

    const data = await response.json();

    if (response.ok) {
      return {
        status: data.status,
        errorCode: data.error_code?.toString(),
        errorMessage: data.error_message,
      };
    }

    return { status: "unknown" };
  } catch {
    return { status: "unknown" };
  }
}
