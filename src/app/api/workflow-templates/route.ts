// ===========================================
// Workflow Templates API
// Pre-built workflow templates for quick setup
// ===========================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  requireAuth,
} from "@/lib/api-utils";

// Pre-defined workflow templates
const WORKFLOW_TEMPLATES = [
  {
    id: "standard_repair",
    name: "Standard Repair Flow",
    description: "Complete repair process with diagnosis, repair, quality check and delivery",
    triggerType: "AUTO_ON_CLAIM",
    steps: [
      {
        name: "Claim Received",
        stepType: "START",
        statusName: "received",
        description: "Claim has been received and logged",
        slaHours: 2,
        slaWarningHours: 1,
      },
      {
        name: "Initial Assessment",
        stepType: "ACTION",
        statusName: "assessing",
        description: "Initial assessment and triage of the issue",
        slaHours: 4,
        slaWarningHours: 3,
        formFields: [
          { name: "initial_diagnosis", label: "Initial Diagnosis", type: "textarea", required: true },
          { name: "estimated_repair_time", label: "Estimated Repair Time (hours)", type: "number", required: false },
        ],
      },
      {
        name: "Warranty Check",
        stepType: "DECISION",
        statusName: "warranty_check",
        description: "Verify warranty validity and coverage",
        slaHours: 2,
        slaWarningHours: 1,
      },
      {
        name: "Repair In Progress",
        stepType: "ACTION",
        statusName: "repairing",
        description: "Product is being repaired",
        slaHours: 24,
        slaWarningHours: 20,
        formFields: [
          { name: "repair_notes", label: "Repair Notes", type: "textarea", required: true },
          { name: "parts_used", label: "Parts Used", type: "textarea", required: false },
          { name: "repair_cost", label: "Repair Cost", type: "number", required: false },
        ],
      },
      {
        name: "Quality Check",
        stepType: "ACTION",
        statusName: "quality_check",
        description: "Final quality verification",
        slaHours: 4,
        slaWarningHours: 2,
        formFields: [
          { name: "qc_passed", label: "QC Passed", type: "checkbox", required: true },
          { name: "qc_notes", label: "QC Notes", type: "textarea", required: false },
        ],
      },
      {
        name: "Ready for Delivery",
        stepType: "ACTION",
        statusName: "ready_delivery",
        description: "Product is ready for delivery/pickup",
        slaHours: 8,
        slaWarningHours: 4,
      },
      {
        name: "Completed",
        stepType: "END",
        statusName: "completed",
        description: "Claim has been completed successfully",
      },
    ],
    transitions: [
      { from: 0, to: 1, conditionType: "ALWAYS" },
      { from: 1, to: 2, conditionType: "ALWAYS" },
      { from: 2, to: 3, conditionType: "USER_CHOICE", transitionName: "Under Warranty" },
      { from: 2, to: 6, conditionType: "USER_CHOICE", transitionName: "Out of Warranty - Reject" },
      { from: 3, to: 4, conditionType: "ALWAYS" },
      { from: 4, to: 5, conditionType: "ALWAYS" },
      { from: 5, to: 6, conditionType: "ALWAYS" },
    ],
  },
  {
    id: "quick_exchange",
    name: "Quick Exchange Flow",
    description: "Fast-track product exchange process for qualifying issues",
    triggerType: "CONDITIONAL",
    triggerConditions: [
      { field: "priority", operator: "equals", value: "URGENT" },
    ],
    steps: [
      {
        name: "Exchange Request",
        stepType: "START",
        statusName: "exchange_requested",
        description: "Exchange request received",
        slaHours: 1,
        slaWarningHours: 0.5,
      },
      {
        name: "Verify Eligibility",
        stepType: "ACTION",
        statusName: "verifying",
        description: "Verify product is eligible for exchange",
        slaHours: 2,
        slaWarningHours: 1,
        formFields: [
          { name: "exchange_eligible", label: "Eligible for Exchange", type: "checkbox", required: true },
          { name: "reason", label: "Eligibility Notes", type: "textarea", required: true },
        ],
      },
      {
        name: "Process Exchange",
        stepType: "ACTION",
        statusName: "exchanging",
        description: "Process the product exchange",
        slaHours: 4,
        slaWarningHours: 2,
        formFields: [
          { name: "new_serial_number", label: "New Product Serial Number", type: "text", required: true },
          { name: "exchange_notes", label: "Exchange Notes", type: "textarea", required: false },
        ],
      },
      {
        name: "Exchange Complete",
        stepType: "END",
        statusName: "exchanged",
        description: "Product exchange completed",
      },
    ],
    transitions: [
      { from: 0, to: 1, conditionType: "ALWAYS" },
      { from: 1, to: 2, conditionType: "ALWAYS" },
      { from: 2, to: 3, conditionType: "ALWAYS" },
    ],
  },
  {
    id: "reject_flow",
    name: "Claim Rejection Flow",
    description: "Process for rejecting ineligible claims",
    triggerType: "MANUAL",
    steps: [
      {
        name: "Review Claim",
        stepType: "START",
        statusName: "reviewing",
        description: "Review claim for rejection",
        slaHours: 4,
        slaWarningHours: 2,
      },
      {
        name: "Document Rejection",
        stepType: "ACTION",
        statusName: "documenting",
        description: "Document the reason for rejection",
        slaHours: 2,
        slaWarningHours: 1,
        formFields: [
          { name: "rejection_reason", label: "Rejection Reason", type: "select", required: true, options: [
            { label: "Out of Warranty", value: "out_of_warranty" },
            { label: "Physical Damage", value: "physical_damage" },
            { label: "Unauthorized Modification", value: "unauthorized_mod" },
            { label: "Missing Parts", value: "missing_parts" },
            { label: "Other", value: "other" },
          ]},
          { name: "rejection_notes", label: "Additional Notes", type: "textarea", required: false },
        ],
      },
      {
        name: "Notify Customer",
        stepType: "NOTIFICATION",
        statusName: "notifying",
        description: "Send rejection notification to customer",
        slaHours: 1,
        slaWarningHours: 0.5,
      },
      {
        name: "Rejected",
        stepType: "END",
        statusName: "rejected",
        description: "Claim has been rejected",
      },
    ],
    transitions: [
      { from: 0, to: 1, conditionType: "ALWAYS" },
      { from: 1, to: 2, conditionType: "ALWAYS" },
      { from: 2, to: 3, conditionType: "ALWAYS" },
    ],
  },
  {
    id: "parts_waiting",
    name: "Parts Waiting Flow",
    description: "Extended flow for repairs requiring parts ordering",
    triggerType: "MANUAL",
    steps: [
      {
        name: "Parts Required",
        stepType: "START",
        statusName: "parts_required",
        description: "Repair requires parts ordering",
        slaHours: 2,
        slaWarningHours: 1,
      },
      {
        name: "Order Parts",
        stepType: "ACTION",
        statusName: "ordering_parts",
        description: "Place parts order",
        slaHours: 4,
        slaWarningHours: 2,
        formFields: [
          { name: "parts_list", label: "Parts Required", type: "textarea", required: true },
          { name: "supplier", label: "Supplier", type: "text", required: false },
          { name: "order_number", label: "Order Number", type: "text", required: true },
          { name: "expected_delivery", label: "Expected Delivery Date", type: "date", required: true },
        ],
      },
      {
        name: "Waiting for Parts",
        stepType: "WAIT",
        statusName: "waiting_parts",
        description: "Waiting for parts to arrive",
        slaHours: 168, // 7 days
        slaWarningHours: 120,
      },
      {
        name: "Parts Received",
        stepType: "ACTION",
        statusName: "parts_received",
        description: "Parts have been received",
        slaHours: 4,
        slaWarningHours: 2,
        formFields: [
          { name: "parts_verified", label: "Parts Verified", type: "checkbox", required: true },
          { name: "verification_notes", label: "Verification Notes", type: "textarea", required: false },
        ],
      },
      {
        name: "Resume Repair",
        stepType: "END",
        statusName: "resume_repair",
        description: "Ready to resume repair process",
      },
    ],
    transitions: [
      { from: 0, to: 1, conditionType: "ALWAYS" },
      { from: 1, to: 2, conditionType: "ALWAYS" },
      { from: 2, to: 3, conditionType: "ALWAYS" },
      { from: 3, to: 4, conditionType: "ALWAYS" },
    ],
  },
  {
    id: "simple_service",
    name: "Simple Service Flow",
    description: "Basic 3-step service flow for minor issues",
    triggerType: "CONDITIONAL",
    triggerConditions: [
      { field: "priority", operator: "in", value: ["LOW", "MEDIUM"] },
    ],
    steps: [
      {
        name: "Service Request",
        stepType: "START",
        statusName: "requested",
        description: "Service request received",
        slaHours: 4,
        slaWarningHours: 2,
      },
      {
        name: "Perform Service",
        stepType: "ACTION",
        statusName: "servicing",
        description: "Perform the service",
        slaHours: 8,
        slaWarningHours: 6,
        formFields: [
          { name: "service_performed", label: "Service Performed", type: "textarea", required: true },
          { name: "service_cost", label: "Service Cost", type: "number", required: false },
        ],
      },
      {
        name: "Service Complete",
        stepType: "END",
        statusName: "completed",
        description: "Service completed successfully",
      },
    ],
    transitions: [
      { from: 0, to: 1, conditionType: "ALWAYS" },
      { from: 1, to: 2, conditionType: "ALWAYS" },
    ],
  },
];

// GET /api/workflow-templates - List available templates
export async function GET() {
  try {
    await requireAuth();

    const templates = WORKFLOW_TEMPLATES.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      triggerType: t.triggerType,
      stepsCount: t.steps.length,
      hasConditions: !!t.triggerConditions && t.triggerConditions.length > 0,
    }));

    return successResponse(templates);
  } catch (error) {
    console.error("Error fetching workflow templates:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to fetch templates", "SERVER_ERROR", 500);
  }
}

// POST /api/workflow-templates - Create workflow from template
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Check permission
    if (!user.permissions.includes("workflows.create")) {
      return errorResponse("Permission denied", "FORBIDDEN", 403);
    }

    const body = await request.json();
    const { templateId, customName, setAsDefault } = body;

    // Find template
    const template = WORKFLOW_TEMPLATES.find((t) => t.id === templateId);
    if (!template) {
      return errorResponse("Template not found", "NOT_FOUND", 404);
    }

    // Create workflow from template
    const workflow = await prisma.$transaction(async (tx) => {
      // If setting as default, unset other defaults
      if (setAsDefault) {
        await tx.workflow.updateMany({
          where: { tenantId: user.tenantId, isDefault: true },
          data: { isDefault: false },
        });
      }

      // Create workflow
      const newWorkflow = await tx.workflow.create({
        data: {
          tenantId: user.tenantId,
          name: customName || template.name,
          description: template.description,
          triggerType: template.triggerType as "MANUAL" | "AUTO_ON_CLAIM" | "CONDITIONAL",
          triggerConditions: template.triggerConditions || undefined,
          isDefault: setAsDefault || false,
          isActive: true,
          createdBy: user.id,
        },
      });

      // Create steps
      const stepIdMap: Record<number, number> = {};
      for (let i = 0; i < template.steps.length; i++) {
        const stepDef = template.steps[i];
        const step = await tx.workflowStep.create({
          data: {
            workflowId: newWorkflow.id,
            name: stepDef.name,
            description: stepDef.description || null,
            stepOrder: i,
            stepType: stepDef.stepType as "START" | "ACTION" | "DECISION" | "NOTIFICATION" | "WAIT" | "END",
            statusName: stepDef.statusName,
            slaHours: stepDef.slaHours || null,
            slaWarningHours: stepDef.slaWarningHours || null,
            formFields: stepDef.formFields || undefined,
            isOptional: false,
            canSkip: stepDef.stepType === "NOTIFICATION",
          },
        });
        stepIdMap[i] = step.id;
      }

      // Create transitions
      for (const transitionDef of template.transitions) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const transObj = transitionDef as any;
        await tx.stepTransition.create({
          data: {
            fromStepId: stepIdMap[transitionDef.from],
            toStepId: stepIdMap[transitionDef.to],
            transitionName: transObj.transitionName || null,
            conditionType: transitionDef.conditionType as "ALWAYS" | "CONDITIONAL" | "USER_CHOICE",
            conditions: transObj.conditions || undefined,
            priority: 0,
          },
        });
      }

      // Return complete workflow
      return tx.workflow.findFirst({
        where: { id: newWorkflow.id },
        include: {
          steps: {
            orderBy: { stepOrder: "asc" },
            include: {
              transitionsFrom: {
                include: {
                  toStep: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      });
    });

    return successResponse(workflow);
  } catch (error) {
    console.error("Error creating workflow from template:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Failed to create workflow from template", "SERVER_ERROR", 500);
  }
}
