// ===========================================
// Workflow Notifications Service
// Handles sending notifications on step events
// ===========================================

import { prisma } from "@/lib/prisma";

type NotificationTriggerEvent = "ON_ENTER" | "ON_EXIT" | "ON_SLA_WARNING" | "ON_SLA_BREACH";

interface NotificationRecipient {
  type: "email" | "sms" | "in_app";
  to: string;
  userId?: number;
}

// Trigger notifications for a workflow step event
export async function triggerStepNotifications(
  stepId: number,
  event: NotificationTriggerEvent,
  claimId: number,
  tenantId: number
): Promise<void> {
  try {
    // Get step notifications configured for this event
    const stepNotifications = await prisma.stepNotification.findMany({
      where: {
        stepId,
        triggerEvent: event,
        isActive: true,
      },
      include: {
        notificationTemplate: true,
        step: {
          include: {
            workflow: true,
          },
        },
      },
    });

    if (stepNotifications.length === 0) {
      return;
    }

    // Get claim details for variable substitution
    const claim = await prisma.warrantyClaim.findFirst({
      where: { id: claimId, tenantId },
      include: {
        warrantyCard: {
          include: {
            product: true,
            customer: true,
            shop: true,
          },
        },
        assignedUser: true,
        currentStep: true,
        workflow: true,
      },
    });

    if (!claim) {
      console.error(`Claim ${claimId} not found for notifications`);
      return;
    }

    // Process each notification
    for (const notification of stepNotifications) {
      const template = notification.notificationTemplate;
      const recipients = await resolveRecipients(notification, claim, tenantId);

      if (recipients.length === 0) {
        continue;
      }

      // Substitute variables in template
      const variables = buildTemplateVariables(claim);
      const message = substituteVariables(template.bodyTemplate, variables);
      const subject = template.subject ? substituteVariables(template.subject, variables) : undefined;

      // Send notifications based on type
      for (const recipient of recipients) {
        try {
          switch (template.type) {
            case "SMS":
              await sendSmsNotification(tenantId, template.id, recipient.to, message);
              break;
            case "EMAIL":
              await sendEmailNotification(tenantId, template.id, recipient.to, subject || "Notification", message);
              break;
            case "IN_APP":
              if (recipient.userId) {
                await sendInAppNotification(tenantId, recipient.userId, template.name, message, `/claims/${claimId}`);
              }
              break;
            case "PUSH":
              // Push notifications not implemented yet
              break;
          }
        } catch (err) {
          console.error(`Failed to send ${template.type} notification to ${recipient.to}:`, err);
        }
      }
    }
  } catch (error) {
    console.error("Error triggering step notifications:", error);
    throw error;
  }
}

// Resolve notification recipients based on recipient type
async function resolveRecipients(
  notification: {
    recipientType: string;
    recipientRoleId: number | null;
    recipientUserId: number | null;
  },
  claim: {
    warrantyCard: {
      customer: { phone: string; email: string | null } | null;
      shop: { phone: string | null; email: string | null };
    };
    assignedUser: { id: number; phone: string | null; email: string } | null;
    tenantId: number;
  },
  tenantId: number
): Promise<NotificationRecipient[]> {
  const recipients: NotificationRecipient[] = [];

  switch (notification.recipientType) {
    case "CUSTOMER":
      if (claim.warrantyCard.customer) {
        if (claim.warrantyCard.customer.phone) {
          recipients.push({ type: "sms", to: claim.warrantyCard.customer.phone });
        }
        if (claim.warrantyCard.customer.email) {
          recipients.push({ type: "email", to: claim.warrantyCard.customer.email });
        }
      }
      break;

    case "SHOP":
      if (claim.warrantyCard.shop.phone) {
        recipients.push({ type: "sms", to: claim.warrantyCard.shop.phone });
      }
      if (claim.warrantyCard.shop.email) {
        recipients.push({ type: "email", to: claim.warrantyCard.shop.email });
      }
      break;

    case "ASSIGNED_USER":
      if (claim.assignedUser) {
        recipients.push({
          type: "email",
          to: claim.assignedUser.email,
          userId: claim.assignedUser.id,
        });
        recipients.push({
          type: "in_app",
          to: claim.assignedUser.email,
          userId: claim.assignedUser.id,
        });
      }
      break;

    case "ROLE":
      if (notification.recipientRoleId) {
        const usersWithRole = await prisma.user.findMany({
          where: {
            tenantId,
            roleId: notification.recipientRoleId,
            status: "ACTIVE",
          },
          select: { id: true, email: true, phone: true },
        });
        for (const user of usersWithRole) {
          recipients.push({ type: "email", to: user.email, userId: user.id });
          recipients.push({ type: "in_app", to: user.email, userId: user.id });
        }
      }
      break;

    case "SPECIFIC_USER":
      if (notification.recipientUserId) {
        const user = await prisma.user.findFirst({
          where: { id: notification.recipientUserId, tenantId },
          select: { id: true, email: true, phone: true },
        });
        if (user) {
          recipients.push({ type: "email", to: user.email, userId: user.id });
          recipients.push({ type: "in_app", to: user.email, userId: user.id });
        }
      }
      break;
  }

  return recipients;
}

// Build template variables from claim data
function buildTemplateVariables(claim: {
  claimNumber: string;
  issueDescription: string;
  currentStatus: string;
  priority: string;
  warrantyCard: {
    cardNumber: string;
    serialNumber: string;
    product: { name: string; modelNumber: string | null };
    customer: { name: string; phone: string } | null;
    shop: { name: string; code: string | null };
  };
  assignedUser: { firstName: string | null; lastName: string | null } | null;
  currentStep: { name: string } | null;
  workflow: { name: string } | null;
}): Record<string, string> {
  return {
    claim_number: claim.claimNumber,
    issue_description: claim.issueDescription,
    current_status: claim.currentStatus,
    priority: claim.priority,
    warranty_card_number: claim.warrantyCard.cardNumber,
    serial_number: claim.warrantyCard.serialNumber,
    product_name: claim.warrantyCard.product.name,
    product_model: claim.warrantyCard.product.modelNumber || "",
    customer_name: claim.warrantyCard.customer?.name || "N/A",
    customer_phone: claim.warrantyCard.customer?.phone || "N/A",
    shop_name: claim.warrantyCard.shop.name,
    shop_code: claim.warrantyCard.shop.code || "",
    assigned_to: claim.assignedUser
      ? `${claim.assignedUser.firstName || ""} ${claim.assignedUser.lastName || ""}`.trim()
      : "Unassigned",
    current_step: claim.currentStep?.name || "N/A",
    workflow_name: claim.workflow?.name || "N/A",
  };
}

// Substitute variables in template string
function substituteVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, "gi"), value);
  }
  return result;
}

// Send SMS notification
async function sendSmsNotification(
  tenantId: number,
  templateId: number,
  phoneNumber: string,
  message: string
): Promise<void> {
  await prisma.smsLog.create({
    data: {
      tenantId,
      templateId,
      phoneNumber,
      message,
      status: "PENDING",
      // In production, you would integrate with an SMS provider here
      // provider: "twilio",
      // providerMessageId: response.sid,
    },
  });

  // TODO: Integrate with actual SMS provider (Twilio, MSG91, etc.)
  console.log(`SMS queued for ${phoneNumber}: ${message.substring(0, 50)}...`);
}

// Send email notification
async function sendEmailNotification(
  tenantId: number,
  templateId: number,
  toEmail: string,
  subject: string,
  body: string
): Promise<void> {
  await prisma.emailLog.create({
    data: {
      tenantId,
      templateId,
      toEmail,
      subject,
      body,
      status: "PENDING",
      // In production, you would integrate with an email provider here
      // provider: "sendgrid",
      // providerMessageId: response.id,
    },
  });

  // TODO: Integrate with actual email provider (SendGrid, AWS SES, etc.)
  console.log(`Email queued for ${toEmail}: ${subject}`);
}

// Send in-app notification
async function sendInAppNotification(
  tenantId: number,
  userId: number,
  title: string,
  message: string,
  link?: string
): Promise<void> {
  await prisma.notification.create({
    data: {
      tenantId,
      userId,
      type: "workflow_notification",
      title,
      message,
      link,
      isRead: false,
    },
  });

  console.log(`In-app notification created for user ${userId}: ${title}`);
}

// Check claims for SLA warnings and breaches (called by cron job)
export async function checkSlaStatus(tenantId?: number): Promise<{
  warnings: number;
  breaches: number;
}> {
  const now = new Date();
  let warnings = 0;
  let breaches = 0;

  // Build where clause
  const whereClause: {
    currentStepId: { not: null };
    resolvedAt: null;
    currentStep: { slaHours: { not: null } };
    tenantId?: number;
  } = {
    currentStepId: { not: null },
    resolvedAt: null,
    currentStep: {
      slaHours: { not: null },
    },
  };

  if (tenantId) {
    whereClause.tenantId = tenantId;
  }

  // Get all active claims with SLA-tracked steps
  const claims = await prisma.warrantyClaim.findMany({
    where: whereClause,
    include: {
      currentStep: true,
      warrantyCard: {
        include: {
          product: true,
          customer: true,
          shop: true,
        },
      },
      assignedUser: true,
      workflow: true,
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

    // Check for breach
    if (hoursRemaining <= 0) {
      breaches++;
      // Trigger breach notification
      await triggerStepNotifications(
        claim.currentStep.id,
        "ON_SLA_BREACH",
        claim.id,
        claim.tenantId
      );
    }
    // Check for warning (but not breach)
    else if (hoursRemaining <= warningHours) {
      warnings++;
      // Trigger warning notification
      await triggerStepNotifications(
        claim.currentStep.id,
        "ON_SLA_WARNING",
        claim.id,
        claim.tenantId
      );
    }
  }

  return { warnings, breaches };
}

// Escalate a claim to a supervisor (called when SLA is breached)
export async function escalateClaim(
  claimId: number,
  tenantId: number,
  reason: string,
  performedBy: number
): Promise<void> {
  // Get the escalation user (supervisor role)
  const supervisorRole = await prisma.role.findFirst({
    where: {
      tenantId,
      name: { contains: "supervisor" },
    },
  });

  let escalationUserId: number | null = null;

  if (supervisorRole) {
    const supervisor = await prisma.user.findFirst({
      where: {
        tenantId,
        roleId: supervisorRole.id,
        status: "ACTIVE",
      },
      orderBy: { createdAt: "asc" },
    });
    escalationUserId = supervisor?.id || null;
  }

  // Update claim
  await prisma.warrantyClaim.update({
    where: { id: claimId },
    data: {
      priority: "URGENT",
      assignedTo: escalationUserId,
    },
  });

  // Record in history
  await prisma.claimHistory.create({
    data: {
      claimId,
      fromStatus: null,
      toStatus: "escalated",
      actionType: "escalate",
      performedBy,
      notes: reason,
      metadata: {
        escalatedTo: escalationUserId,
        reason,
        previousPriority: "MEDIUM", // Would get actual value in real implementation
      },
    },
  });

  // Send notification to supervisor
  if (escalationUserId) {
    await sendInAppNotification(
      tenantId,
      escalationUserId,
      "Claim Escalated",
      `Claim has been escalated: ${reason}`,
      `/claims/${claimId}`
    );
  }
}
