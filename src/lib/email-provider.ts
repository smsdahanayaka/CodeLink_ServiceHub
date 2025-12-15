// ===========================================
// Email Provider Service
// Supports SendGrid and SMTP (Nodemailer)
// ===========================================

import { prisma } from "@/lib/prisma";

// Email provider configuration
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || "sendgrid";
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "noreply@example.com";
const SENDGRID_FROM_NAME = process.env.SENDGRID_FROM_NAME || "CodeLink ServiceHub";

// SMTP fallback configuration
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const SMTP_FROM_EMAIL = process.env.SMTP_FROM_EMAIL || "noreply@example.com";
const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME || "CodeLink ServiceHub";

export interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: Array<{
    filename: string;
    content: string; // Base64 encoded
    type: string;
  }>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  provider: string;
  error?: string;
}

// Check if email provider is configured
export function isEmailConfigured(): boolean {
  if (EMAIL_PROVIDER === "sendgrid") {
    return !!SENDGRID_API_KEY;
  }
  if (EMAIL_PROVIDER === "smtp") {
    return !!(SMTP_HOST && SMTP_USER && SMTP_PASSWORD);
  }
  return false;
}

// Send email using configured provider
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  if (!isEmailConfigured()) {
    console.warn("Email provider not configured. Email will be queued but not sent.");
    return {
      success: false,
      provider: EMAIL_PROVIDER,
      error: "Email provider not configured",
    };
  }

  if (EMAIL_PROVIDER === "sendgrid") {
    return sendEmailViaSendGrid(options);
  } else if (EMAIL_PROVIDER === "smtp") {
    return sendEmailViaSMTP(options);
  }

  return {
    success: false,
    provider: "none",
    error: "Unknown email provider",
  };
}

// SendGrid email implementation
async function sendEmailViaSendGrid(options: EmailOptions): Promise<EmailResult> {
  if (!SENDGRID_API_KEY) {
    return {
      success: false,
      provider: "sendgrid",
      error: "SendGrid API key not configured",
    };
  }

  try {
    const payload: Record<string, unknown> = {
      personalizations: [
        {
          to: [{ email: options.to }],
          ...(options.cc?.length && { cc: options.cc.map((email) => ({ email })) }),
          ...(options.bcc?.length && { bcc: options.bcc.map((email) => ({ email })) }),
        },
      ],
      from: {
        email: SENDGRID_FROM_EMAIL,
        name: SENDGRID_FROM_NAME,
      },
      subject: options.subject,
      content: [],
    };

    // Add content
    const content: Array<{ type: string; value: string }> = [];
    if (options.text) {
      content.push({ type: "text/plain", value: options.text });
    }
    if (options.html) {
      content.push({ type: "text/html", value: options.html });
    }
    payload.content = content;

    // Add attachments if any
    if (options.attachments?.length) {
      payload.attachments = options.attachments.map((att) => ({
        content: att.content,
        filename: att.filename,
        type: att.type,
        disposition: "attachment",
      }));
    }

    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (response.ok || response.status === 202) {
      const messageId = response.headers.get("x-message-id") || `sg-${Date.now()}`;
      return {
        success: true,
        messageId,
        provider: "sendgrid",
      };
    }

    const errorBody = await response.text();
    console.error("SendGrid API error:", response.status, errorBody);
    return {
      success: false,
      provider: "sendgrid",
      error: `SendGrid error: ${response.status} - ${errorBody}`,
    };
  } catch (error) {
    console.error("SendGrid send error:", error);
    return {
      success: false,
      provider: "sendgrid",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// SMTP email implementation using Nodemailer
// Note: To use SMTP, install nodemailer: npm install nodemailer @types/nodemailer
async function sendEmailViaSMTP(options: EmailOptions): Promise<EmailResult> {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) {
    return {
      success: false,
      provider: "smtp",
      error: "SMTP not configured",
    };
  }

  try {
    // Dynamic require to avoid loading nodemailer if not installed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports
    let nodemailer: any;
    try {
      nodemailer = require("nodemailer");
    } catch {
      return {
        success: false,
        provider: "smtp",
        error: "Nodemailer not installed. Run: npm install nodemailer",
      };
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASSWORD,
      },
    });

    const mailOptions: Record<string, unknown> = {
      from: `"${SMTP_FROM_NAME}" <${SMTP_FROM_EMAIL}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    if (options.cc?.length) {
      mailOptions.cc = options.cc.join(", ");
    }

    if (options.bcc?.length) {
      mailOptions.bcc = options.bcc.join(", ");
    }

    if (options.attachments?.length) {
      mailOptions.attachments = options.attachments.map((att) => ({
        filename: att.filename,
        content: Buffer.from(att.content, "base64"),
        contentType: att.type,
      }));
    }

    const info = await transporter.sendMail(mailOptions);

    return {
      success: true,
      messageId: info.messageId,
      provider: "smtp",
    };
  } catch (error) {
    console.error("SMTP send error:", error);
    return {
      success: false,
      provider: "smtp",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Send email and log to database
export async function sendEmailWithLogging(
  tenantId: number,
  templateId: number | null,
  options: EmailOptions
): Promise<EmailResult> {
  // Create initial log entry
  const log = await prisma.emailLog.create({
    data: {
      tenantId,
      templateId,
      toEmail: options.to,
      ccEmails: options.cc || undefined,
      subject: options.subject,
      body: options.html || options.text || "",
      status: "PENDING",
      provider: EMAIL_PROVIDER,
    },
  });

  // Attempt to send
  const result = await sendEmail(options);

  // Update log with result
  await prisma.emailLog.update({
    where: { id: log.id },
    data: {
      status: result.success ? "SENT" : "FAILED",
      providerMessageId: result.messageId || null,
      errorMessage: result.error || null,
      sentAt: result.success ? new Date() : null,
    },
  });

  return result;
}

// Retry failed emails (can be called by a cron job)
export async function retryFailedEmails(tenantId?: number, limit = 50): Promise<{
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

  const failedEmails = await prisma.emailLog.findMany({
    where,
    take: limit,
    orderBy: { createdAt: "asc" },
  });

  let succeeded = 0;
  let failed = 0;

  for (const email of failedEmails) {
    const result = await sendEmail({
      to: email.toEmail,
      subject: email.subject,
      html: email.body,
      cc: email.ccEmails as string[] | undefined,
    });

    if (result.success) {
      succeeded++;
      await prisma.emailLog.update({
        where: { id: email.id },
        data: {
          status: "SENT",
          providerMessageId: result.messageId,
          sentAt: new Date(),
          errorMessage: null,
        },
      });
    } else {
      failed++;
      await prisma.emailLog.update({
        where: { id: email.id },
        data: {
          errorMessage: result.error,
        },
      });
    }
  }

  return {
    attempted: failedEmails.length,
    succeeded,
    failed,
  };
}
