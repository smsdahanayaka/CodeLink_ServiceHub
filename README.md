# CodeLink ServiceHub

**SaaS Customer Support & Warranty Claim Management System**

A comprehensive platform for manufacturing and industrial equipment companies to manage warranty claims, customer support, and service operations.

## Features

### Core Features
- **Multi-Tenant Architecture** - Isolated data and configurations per company
- **Dynamic Workflow Engine** - Companies define their own warranty/service processes
- **End-to-End Tracking** - Complete visibility from sale to warranty resolution
- **Role-Based Access Control** - Customizable roles and permissions
- **Real-time Notifications** - SMS, Email and in-app notifications at every stage

### Workflow Process Features (Phase 3)
- **Auto-Workflow Assignment** - Automatically assigns workflows to new claims based on conditions
- **Conditional Workflow Triggers** - Route claims to different workflows based on priority, category, product type
- **Step Notifications** - Automatic SMS/Email notifications on step entry/exit events
- **My Tasks Dashboard** - Personal inbox showing claims pending user action with SLA tracking
- **SLA Monitoring & Breach Detection** - Automated monitoring with warning/breach notifications
- **Workflow Templates** - Pre-built templates (Standard Repair, Quick Exchange, Reject Flow, etc.)
- **Step Rollback** - Ability to roll back claims to previous steps with audit trail
- **Escalation Rules** - Auto-escalate claims to supervisors on SLA breach
- **Bulk Processing** - Process multiple claims through workflow steps simultaneously
- **Claim Due Date Tracking** - Overall deadline tracking per claim based on SLA or priority

## Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript
- **Styling:** Tailwind CSS v4, shadcn/ui
- **Database:** MySQL with Prisma ORM
- **Authentication:** NextAuth.js v5

## Getting Started

### Prerequisites

- Node.js 20+
- MySQL 8+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/smsdahanayaka/CodeLink_ServiceHub.git
cd CodeLink_ServiceHub
```

2. Install dependencies:
```bash
npm install
```

3. Create MySQL database:
```sql
CREATE DATABASE codelink_servicehub;
```

4. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

5. Generate Prisma client:
```bash
npm run db:generate
```

6. Push schema to database:
```bash
npm run db:push
```

7. Seed the database:
```bash
npm run db:seed
```

8. Start development server:
```bash
npm run dev
```

## Demo Login

| Field | Value |
|-------|-------|
| Company Code | demo |
| Email | admin@demo.codelink.com |
| Password | admin123 |

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to database |
| `npm run db:migrate` | Run migrations |
| `npm run db:seed` | Seed database |
| `npm run db:studio` | Open Prisma Studio |

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth pages (login, etc.)
│   ├── (dashboard)/       # Dashboard pages
│   └── api/               # API routes
├── components/
│   ├── common/            # Shared components
│   ├── layout/            # Layout components
│   └── ui/                # shadcn/ui components
├── lib/                   # Utilities and configs
├── types/                 # TypeScript types
└── middleware.ts          # Route protection

prisma/
├── schema.prisma          # Database schema
└── seed.ts               # Seed script
```

---

# User Guide

## Table of Contents

1. [Workflow Management](#workflow-management-guide)
2. [Understanding Transitions](#understanding-transitions)
3. [Building Your First Workflow](#building-your-first-workflow-step-by-step)
4. [Workflow Editor Reference](#workflow-editor-reference)
5. [Claims & Workflow Processing](#claims--workflow-processing)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Workflow Management Guide

### What is a Workflow?

A **Workflow** is a step-by-step process that defines how warranty claims move through your service center. It automates status changes, assigns tasks, and ensures consistent handling of every claim.

**Key Components:**
- **Steps** - Individual stages in your process (Inspect, Repair, etc.)
- **Transitions** - Connections that define how claims move between steps
- **Rules** - SLA times, required roles, and conditions

---

### 1. View Existing Workflows

1. Click **"Workflows"** in the left sidebar
2. You'll see a list of all workflows with:
   - Name & description
   - Trigger type (Manual, Auto on Claim, Conditional)
   - Status (Active/Inactive)
   - Whether it's the default workflow

---

### 2. Create a New Workflow

1. Click **"New Workflow"** button (top right)
2. Fill in the basic details:

| Field | Description | Example |
|-------|-------------|---------|
| **Name** | Workflow name | "Standard Repair Process" |
| **Description** | What this workflow does | "For regular warranty repairs" |
| **Trigger Type** | When workflow starts | See below |
| **Is Default** | Use for all new claims | Yes/No |
| **Is Active** | Enable this workflow | Yes/No |

**Trigger Types:**
- **Auto on Claim**: Automatically starts when a new claim is created
- **Manual**: Must be manually assigned to claims
- **Conditional**: Starts based on conditions (e.g., product type, priority)

3. Click **"Create Workflow"**

---

### 3. Add Steps to Your Workflow

After creating a workflow, add steps that define each stage:

1. Go to the workflow detail page and click **"Edit Workflow"**
2. In the left panel, click on a step type to add it
3. Configure each step in the side panel:

| Field | Description | Example |
|-------|-------------|---------|
| **Name** | Step name | "Initial Inspection" |
| **Status Name** | Status shown on claims | "inspecting" |
| **Step Type** | Type of step | START, ACTION, DECISION, END |
| **Step Order** | Sequence number | 1, 2, 3... |
| **SLA Hours** | Time limit for this step | 24 |
| **Required Role** | Who can process this step | "Technician" |
| **Can Skip** | Allow skipping this step | Yes/No |

**Step Types:**

| Type | Icon | Purpose |
|------|------|---------|
| **START** | ▶️ Green | Entry point - where claims begin |
| **ACTION** | ⬛ Blue | Tasks requiring user action |
| **DECISION** | ◆ Amber | Branching point with multiple paths |
| **NOTIFICATION** | 🔔 Purple | Send alerts (email/SMS) |
| **WAIT** | ⏰ Gray | Pause for time or condition |
| **END** | ⬛ Red | Exit point - claim is complete |

---

## Understanding Transitions

### What is a Transition?

A **Transition** is the connection between workflow steps. It defines the path a claim takes from one step to another.

**Think of it this way:**
- **Steps** = What happens (Inspect, Repair, QC Check)
- **Transitions** = Where to go next (the arrows between steps)

> ⚠️ **Important:** Without transitions, the workflow engine doesn't know how to move claims through the process!

### Why Are Transitions Necessary?

1. **Define the Flow** - Tell the system which step comes next
2. **Enable Branching** - Create multiple paths from decision points
3. **Control Navigation** - Determine available options when processing claims

### Transition Properties

| Property | Description | Example |
|----------|-------------|---------|
| **From Step** | Source step | "Inspection" |
| **To Step** | Destination step | "Repair" |
| **Transition Name** | Label shown to users | "Approve", "Reject" |
| **Condition Type** | When this path is available | ALWAYS, USER_CHOICE |

### How to Add Transitions

1. In the Workflow Editor, find the step you want to connect FROM
2. Click **"Add transition..."** button below the step
3. Select the target step from the dropdown
4. The transition appears as an arrow showing the connection

### Transition Examples

**Example 1: Linear Flow (Simple)**
```
[Received] ──→ [Inspection] ──→ [Repair] ──→ [Complete]
```
Each step has ONE transition to the next step.

**Example 2: Decision Branching**
```
                         ┌──→ [Repair] ──→ [Complete]
[Inspection] ───────────┤
                         └──→ [Reject] ──→ [Return]
```
The Inspection step has TWO transitions:
- "Approve" → goes to Repair
- "Reject" → goes to Return

**Example 3: Multiple Entry Points**
```
[Inspection] ──→ [QC Check] ──→ [Complete]
                     ↑
[Repair] ───────────┘
```
Both Inspection and Repair can transition to QC Check.

### Condition Types

| Type | Behavior | Use Case |
|------|----------|----------|
| **ALWAYS** | Automatically available | Linear flows, single path |
| **USER_CHOICE** | User selects this option | Decision points, approvals |
| **CONDITIONAL** | Based on data/rules | Automated routing |

---

## Building Your First Workflow (Step-by-Step)

### Step 1: Plan Your Process

Before building, sketch out your process:
```
What steps does a claim go through?
Who handles each step?
Are there any decision points?
What are acceptable timeframes?
```

### Step 2: Create the Workflow

1. Navigate to **Workflows** → **New Workflow**
2. Enter:
   - Name: "Standard Warranty Process"
   - Description: "Default process for warranty claims"
   - Trigger Type: **Auto on Claim**
   - Is Default: **Yes**
   - Is Active: **Yes**
3. Click **Create Workflow**

### Step 3: Add Steps

Click **Edit Workflow** and add these steps:

| Order | Name | Type | Status | SLA |
|-------|------|------|--------|-----|
| 1 | Claim Received | START | received | - |
| 2 | Initial Inspection | ACTION | inspecting | 24h |
| 3 | Repair in Progress | ACTION | repairing | 48h |
| 4 | Quality Check | ACTION | qc_check | 8h |
| 5 | Ready for Pickup | END | completed | - |

### Step 4: Add Transitions

Connect your steps:

1. On "Claim Received" → Click **Add transition** → Select "Initial Inspection"
2. On "Initial Inspection" → Click **Add transition** → Select "Repair in Progress"
3. On "Repair in Progress" → Click **Add transition** → Select "Quality Check"
4. On "Quality Check" → Click **Add transition** → Select "Ready for Pickup"

### Step 5: Save and Test

1. Click **Save Workflow**
2. Create a test claim
3. Verify the claim moves through each step correctly

### Visual Result

```
┌─────────────────────┐
│  1. Claim Received  │ (START)
│  Status: received   │
└──────────┬──────────┘
           │ [Next]
           ↓
┌─────────────────────┐
│  2. Inspection      │ (ACTION)
│  Status: inspecting │
│  SLA: 24 hours      │
└──────────┬──────────┘
           │ [Next]
           ↓
┌─────────────────────┐
│  3. Repair          │ (ACTION)
│  Status: repairing  │
│  SLA: 48 hours      │
└──────────┬──────────┘
           │ [Next]
           ↓
┌─────────────────────┐
│  4. QC Check        │ (ACTION)
│  Status: qc_check   │
│  SLA: 8 hours       │
└──────────┬──────────┘
           │ [Complete]
           ↓
┌─────────────────────┐
│  5. Ready for Pickup│ (END)
│  Status: completed  │
└─────────────────────┘
```

---

## Workflow Editor Reference

### Editor Layout

```
┌──────────────────────────────────────────────────────────┐
│  Edit: Standard Warranty Process     [Back] [Save]       │
├──────────────┬───────────────────────────────────────────┤
│              │                                           │
│  Add Steps   │         Workflow Canvas                   │
│  ──────────  │         ────────────────                  │
│  ▶️ Start    │  ┌─────────────────────────────────┐      │
│  ⬛ Action   │  │ Step Card                       │      │
│  ◆ Decision  │  │   → Transitions                 │      │
│  🔔 Notify   │  │   [Add transition...]           │      │
│  ⏰ Wait     │  └─────────────────────────────────┘      │
│  ⬛ End      │                                           │
│              │                                           │
│  ──────────  │                                           │
│  Workflow    │                                           │
│  Info        │                                           │
│              │                                           │
└──────────────┴───────────────────────────────────────────┘
```

### Step Configuration Panel

When you click on a step, a configuration panel opens with three tabs:

**Basic Tab:**
- Step Name
- Description
- Step Type
- Status Name (used for claim status)

**Rules Tab:**
- Required Role (who can process this step)
- Auto-Assign To (automatically assign to user)
- SLA Hours (deadline)
- Warning Hours (reminder before deadline)

**Advanced Tab:**
- Optional Step toggle
- Can Skip toggle

### Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Save Workflow | Ctrl + S |
| Move Step Up | Click ↑ button |
| Move Step Down | Click ↓ button |
| Delete Step | Click 🗑️ button |

---

## Claims & Workflow Processing

### How Claims Use Workflows

1. **Claim Created** → Workflow automatically assigned (if Auto trigger)
2. **Claim at Step** → Shows current step, available transitions
3. **Process Step** → User completes step, selects next transition
4. **Claim Moves** → Status updates, moves to next step
5. **Workflow Complete** → Claim reaches END step

### Processing a Claim

1. Open a claim from the Claims list
2. Find the **"Current Workflow Step"** card
3. Review current step information
4. Click **"Process Step"**
5. Fill any required fields
6. Select next step (if multiple transitions)
7. Add notes (optional)
8. Click **"Complete Step"**

### Workflow Status on Claims

```
┌────────────────────────────────────────┐
│  Current Workflow Step                 │
│  ─────────────────────────────────────│
│  📍 Step: Initial Inspection           │
│  📊 Status: inspecting                 │
│  ⏱️  SLA: 24 hours (18h remaining)     │
│                                        │
│  Available Actions:                    │
│  → Proceed to Repair                   │
│  → Reject Claim                        │
│                                        │
│  [Process Step]  [Skip Step]           │
└────────────────────────────────────────┘
```

---

## Best Practices

### Workflow Design

1. **Start Simple** - Begin with 4-5 steps, add complexity later
2. **Use Clear Names** - "Initial Inspection" not "Step 2"
3. **Consistent Status Names** - Use lowercase with underscores: `in_review`, `pending_approval`
4. **One Default Workflow** - Set your primary workflow as default
5. **Test Before Go-Live** - Create test claims to verify flow

### Transitions

1. **Always Connect Steps** - Every step (except END) needs at least one outgoing transition
2. **Name Your Transitions** - Use action verbs: "Approve", "Reject", "Send for Review"
3. **Consider All Paths** - What happens on approval? Rejection? Edge cases?
4. **Avoid Dead Ends** - Every path should eventually reach an END step

### SLA Configuration

| Step Type | Suggested SLA |
|-----------|---------------|
| Initial Review | 4-8 hours |
| Inspection | 24 hours |
| Repair | 24-72 hours |
| QC Check | 4-8 hours |
| Documentation | 2-4 hours |

### Role Assignment

- Assign **Required Role** to steps that need specific expertise
- Use **Auto-Assign** for steps that always go to the same person
- Leave blank for steps any user can process

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Claim not showing workflow | Workflow not active or not default | Activate workflow, set as default |
| Can't process step | Missing required role | Check user has required role |
| No "Next Step" options | Missing transitions | Add transitions in workflow editor |
| Claim stuck | No transition to next step | Add missing transition |
| Wrong status showing | Status name mismatch | Update step's Status Name field |

### Workflow Validation

Before activating, ensure your workflow has:

- [ ] At least one START step
- [ ] At least one END step
- [ ] All steps connected with transitions
- [ ] No orphan steps (steps with no incoming/outgoing transitions)
- [ ] Realistic SLA times configured
- [ ] Clear, descriptive step names

### Debug Checklist

1. **Workflow Active?** - Check workflow status is Active
2. **Transitions Exist?** - Verify all steps have outgoing transitions
3. **Permissions OK?** - User has required role for step
4. **SLA Configured?** - Check SLA hours are set
5. **Default Set?** - One workflow should be marked as default

---

## Quick Reference Card

### Workflow Creation Checklist

```
□ Create workflow with name & description
□ Set trigger type (Auto on Claim recommended)
□ Mark as Default if primary workflow
□ Add START step
□ Add ACTION steps for each stage
□ Add END step
□ Connect all steps with transitions
□ Configure SLA for time-sensitive steps
□ Set Required Roles where needed
□ Activate workflow
□ Test with sample claim
```

### Step Types Quick Reference

| Type | Use When | Example |
|------|----------|---------|
| START | Entry point | "Claim Received" |
| ACTION | User does something | "Inspect Product" |
| DECISION | Multiple possible paths | "Warranty Valid?" |
| NOTIFICATION | Send alert only | "Notify Customer" |
| WAIT | Pause needed | "Wait for Parts" |
| END | Process complete | "Claim Closed" |

### Transition Quick Reference

| Scenario | Transitions Needed |
|----------|-------------------|
| Linear flow | 1 per step |
| Yes/No decision | 2 from decision step |
| Multiple outcomes | 1 per outcome |
| Parallel paths | Multiple incoming to merge point |

---

---

## Phase 3 API Reference

### Workflow Execution APIs

#### Execute Workflow Step
```
POST /api/workflows/[id]/execute
```
Execute/complete a workflow step for a claim.

**Request Body:**
```json
{
  "claimId": 123,
  "stepId": 456,
  "action": "complete", // complete, skip, reject, escalate
  "transitionId": 789, // required for USER_CHOICE transitions
  "formData": { "field": "value" },
  "notes": "Processing notes"
}
```

#### Rollback Workflow Step
```
PATCH /api/workflows/[id]/execute
```
Roll back a claim to a previous step.

**Request Body:**
```json
{
  "claimId": 123,
  "targetStepId": 456,
  "reason": "Needs re-inspection"
}
```

### My Tasks API

#### Get My Tasks
```
GET /api/my-tasks
```
Get claims assigned to current user with SLA tracking.

**Query Parameters:**
- `page` - Page number
- `limit` - Items per page
- `priority` - Filter by priority (URGENT, HIGH, MEDIUM, LOW)
- `excludeResolved` - Exclude resolved claims
- `onlyResolved` - Show only resolved claims

**Response includes:**
- Claims list with workflow/step info
- Stats: total, pending, slaWarning, slaBreach, completedToday

### Workflow Templates API

#### List Templates
```
GET /api/workflow-templates
```
Get list of available pre-built workflow templates.

#### Create from Template
```
POST /api/workflow-templates
```
Create a new workflow from a template.

**Request Body:**
```json
{
  "templateId": "standard_repair",
  "customName": "My Custom Workflow",
  "setAsDefault": true
}
```

**Available Templates:**
- `standard_repair` - Complete repair process with diagnosis, repair, QC, delivery
- `quick_exchange` - Fast-track product exchange for urgent cases
- `reject_flow` - Process for rejecting ineligible claims
- `parts_waiting` - Extended flow for repairs requiring parts ordering
- `simple_service` - Basic 3-step service flow for minor issues

### Bulk Processing API

#### Bulk Process Claims
```
POST /api/claims/bulk
```
Process multiple claims through the same workflow step.

**Request Body:**
```json
{
  "claimIds": [1, 2, 3],
  "action": "complete",
  "transitionId": 456,
  "formData": { "field": "value" },
  "notes": "Bulk processing"
}
```

**Limitations:**
- Maximum 50 claims per request
- All claims must be at the same workflow step
- Does not support conditional transitions (process individually)

#### Bulk Update Claims
```
PUT /api/claims/bulk
```
Bulk update claim properties.

**Request Body:**
```json
{
  "claimIds": [1, 2, 3],
  "updates": {
    "assignedTo": 123,
    "priority": "HIGH",
    "currentLocation": "SERVICE_CENTER"
  },
  "notes": "Reassigning to service center"
}
```

### SLA Monitoring Cron API

#### Check SLA Status
```
GET /api/cron/sla-check
Authorization: Bearer {CRON_SECRET}
```
Check all active claims for SLA warnings and breaches. Intended to be called by a scheduled job.

**Response:**
```json
{
  "success": true,
  "data": {
    "timestamp": "2025-01-15T10:00:00Z",
    "results": [
      {
        "tenantId": 1,
        "tenantName": "Demo Company",
        "warnings": 5,
        "breaches": 2,
        "escalated": 2
      }
    ],
    "totals": {
      "warnings": 5,
      "breaches": 2,
      "escalated": 2
    }
  }
}
```

### Notification Templates API

#### List Templates
```
GET /api/notification-templates
```
Get all notification templates for the tenant.

**Query Parameters:**
- `page`, `limit` - Pagination
- `type` - Filter by type (SMS, EMAIL, IN_APP, PUSH)
- `triggerEvent` - Filter by trigger event
- `isActive` - Filter by active status

#### Create Template
```
POST /api/notification-templates
```
Create a new notification template.

**Request Body:**
```json
{
  "name": "Claim Status Update",
  "type": "SMS",
  "bodyTemplate": "Your claim {{claim_number}} status changed to {{current_status}}",
  "variables": [
    { "name": "claim_number", "description": "Claim number" },
    { "name": "current_status", "description": "New status" }
  ],
  "triggerEvent": "ON_STEP_COMPLETE",
  "isActive": true
}
```

#### Get Template
```
GET /api/notification-templates/[id]
```

#### Update Template
```
PUT /api/notification-templates/[id]
```

#### Delete Template
```
DELETE /api/notification-templates/[id]
```

**Available Template Variables:**
- `{{claim_number}}` - Claim number
- `{{issue_description}}` - Issue description
- `{{current_status}}` - Current status
- `{{priority}}` - Claim priority
- `{{warranty_card_number}}` - Warranty card number
- `{{serial_number}}` - Product serial number
- `{{product_name}}` - Product name
- `{{product_model}}` - Product model
- `{{customer_name}}` - Customer name
- `{{customer_phone}}` - Customer phone
- `{{shop_name}}` - Shop name
- `{{assigned_to}}` - Assigned user name
- `{{current_step}}` - Current workflow step
- `{{workflow_name}}` - Workflow name

### Process Notifications Cron API

#### Process Queued Notifications
```
GET /api/cron/process-notifications
Authorization: Bearer {CRON_SECRET}
```
Process all queued SMS and Email notifications. Call this periodically to send pending notifications.

**Response:**
```json
{
  "success": true,
  "data": {
    "timestamp": "2025-01-15T10:00:00Z",
    "email": {
      "configured": true,
      "processed": { "attempted": 10, "succeeded": 9, "failed": 1 }
    },
    "sms": {
      "configured": true,
      "processed": { "attempted": 5, "succeeded": 5, "failed": 0 }
    }
  }
}
```

### Environment Variables for Phase 3

Add these to your `.env` file:

```env
# Cron job authentication (REQUIRED for cron jobs)
CRON_SECRET=your-secure-cron-secret-key

# SMS Provider - Twilio (optional, but recommended for production)
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Email Provider - SendGrid (optional, but recommended for production)
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@yourcompany.com
SENDGRID_FROM_NAME=CodeLink ServiceHub

# Alternative: SMTP Email Provider (if not using SendGrid)
# EMAIL_PROVIDER=smtp
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASSWORD=your-app-password
# SMTP_FROM_EMAIL=noreply@yourcompany.com
# SMTP_FROM_NAME=CodeLink ServiceHub
```

**Provider Configuration Notes:**
- **SendGrid**: Recommended for production. Create account at sendgrid.com and generate API key.
- **Twilio**: For SMS notifications. Create account at twilio.com to get Account SID, Auth Token, and phone number.
- **SMTP**: Alternative email provider. Requires nodemailer package: `npm install nodemailer`
- **Without providers**: Notifications are queued in database. Process them later when providers are configured.

---

## Phase 4: Enhanced Logistics System

### Overview

The enhanced logistics system introduces a **Trip-Based** approach for collecting and delivering warranty items between shops and the service center. This provides a more user-friendly, real-world workflow compared to individual pickup/delivery records.

### Key Concepts

#### Collection Trip
A **Collection Trip** represents a collector's visit to a shop (or customer) to pick up multiple devices. Some devices may have registered warranty cards, others may not - both are handled seamlessly.

#### Delivery Trip
A **Delivery Trip** groups multiple completed claims going to the same destination, allowing efficient batch deliveries.

### Process Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LOGISTICS WORKFLOW                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PHASE 1: COLLECTION (At Shop or Customer)                                  │
│  ─────────────────────────────────────────                                  │
│  • Collector creates a Collection Trip                                      │
│  • Selects Shop (or Customer for direct pickup)                            │
│  • Adds items to collect:                                                   │
│    - With warranty card: Link existing card                                │
│    - Without warranty card: Enter serial + product + issue                 │
│  • Starts trip when collection is complete                                  │
│                                                                              │
│  PHASE 2: TRANSIT TO SERVICE CENTER                                         │
│  ──────────────────────────────────                                         │
│  • Trip status: IN_TRANSIT                                                  │
│  • All items tracked together                                               │
│  • Mobile-friendly interface for collectors                                 │
│                                                                              │
│  PHASE 3: RECEIVING AT SERVICE CENTER                                       │
│  ────────────────────────────────────                                       │
│  • Admin receives the Collection Trip                                       │
│  • For each item:                                                           │
│    - If warranty card exists: Auto-create claim                            │
│    - If no warranty card: Register card (shop info only if no customer)    │
│      then auto-create claim                                                 │
│  • Items enter the normal workflow process                                  │
│                                                                              │
│  PHASE 4: REPAIR PROCESS (Existing Workflow)                                │
│  ───────────────────────────────────────────                                │
│  • Claims go through configured workflow steps                              │
│  • Technicians repair devices                                               │
│  • QC checks completed                                                      │
│  • Claims marked as ready for delivery                                      │
│                                                                              │
│  PHASE 5: DELIVERY ASSIGNMENT                                               │
│  ────────────────────────────                                               │
│  • Admin views completed claims ready for delivery                          │
│  • Bulk select claims going to same shop/customer                          │
│  • Create Delivery Trip and assign to collector                            │
│  • Schedule delivery date/time                                              │
│                                                                              │
│  PHASE 6: DELIVERY EXECUTION                                                │
│  ───────────────────────────                                                │
│  • Collector delivers items to shop/customer                                │
│  • Records recipient name and signature                                     │
│  • Marks items as delivered                                                 │
│  • Failed items can be retried in same trip                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Database Models

#### CollectionTrip
| Field | Type | Description |
|-------|------|-------------|
| id | Int | Primary key |
| tenantId | Int | Tenant reference |
| tripNumber | String | Unique number (CT-YYMMXXXXX) |
| collectorId | Int | Assigned collector |
| fromType | Enum | SHOP or CUSTOMER |
| shopId | Int? | Source shop (if from shop) |
| customerName | String? | Customer name (if direct) |
| customerPhone | String? | Customer phone (if direct) |
| customerAddress | String? | Pickup address (if direct) |
| status | Enum | IN_PROGRESS, IN_TRANSIT, RECEIVED, CANCELLED |
| startedAt | DateTime | Trip start time |
| completedAt | DateTime? | Collection completed |
| receivedAt | DateTime? | Received at service center |
| receivedBy | Int? | User who received |
| notes | String? | Additional notes |

#### CollectionItem
| Field | Type | Description |
|-------|------|-------------|
| id | Int | Primary key |
| tripId | Int | Parent trip reference |
| serialNumber | String | Device serial number |
| issueDescription | String | Problem description |
| warrantyCardId | Int? | Existing warranty card (if registered) |
| productId | Int? | Product (for unregistered items) |
| customerName | String? | Customer (for unregistered items) |
| customerPhone | String? | Customer phone (for unregistered) |
| claimId | Int? | Created claim (after processing) |
| status | Enum | COLLECTED, RECEIVED, PROCESSED |

#### DeliveryTrip
| Field | Type | Description |
|-------|------|-------------|
| id | Int | Primary key |
| tenantId | Int | Tenant reference |
| tripNumber | String | Unique number (DT-YYMMXXXXX) |
| collectorId | Int | Assigned collector |
| toType | Enum | SHOP or CUSTOMER |
| shopId | Int? | Destination shop |
| customerName | String? | Customer name (if direct) |
| customerPhone | String? | Customer phone |
| customerAddress | String? | Delivery address |
| status | Enum | PENDING, ASSIGNED, IN_TRANSIT, COMPLETED, PARTIAL, CANCELLED |
| scheduledDate | DateTime? | Scheduled delivery date |
| scheduledSlot | String? | Time slot |
| dispatchedAt | DateTime? | When departed |
| completedAt | DateTime? | When finished |
| recipientName | String? | Who received |
| signatureUrl | String? | Signature image |
| notes | String? | Additional notes |

#### DeliveryItem
| Field | Type | Description |
|-------|------|-------------|
| id | Int | Primary key |
| tripId | Int | Parent trip reference |
| claimId | Int | Claim being delivered |
| status | Enum | PENDING, DELIVERED, FAILED |
| failureReason | String? | Why delivery failed |
| notes | String? | Item-specific notes |

### API Endpoints

#### Collection Trips

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/logistics/collection-trips` | List all collection trips |
| POST | `/api/logistics/collection-trips` | Create new collection trip |
| GET | `/api/logistics/collection-trips/[id]` | Get trip details |
| PUT | `/api/logistics/collection-trips/[id]` | Update trip |
| DELETE | `/api/logistics/collection-trips/[id]` | Cancel trip |
| PATCH | `/api/logistics/collection-trips/[id]` | Status transitions (start_transit, receive) |
| POST | `/api/logistics/collection-trips/[id]/items` | Add item to trip |
| DELETE | `/api/logistics/collection-trips/[id]/items/[itemId]` | Remove item |
| POST | `/api/logistics/collection-trips/[id]/receive` | Receive trip at service center |

#### Delivery Trips

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/logistics/delivery-trips` | List all delivery trips |
| POST | `/api/logistics/delivery-trips` | Create new delivery trip |
| GET | `/api/logistics/delivery-trips/[id]` | Get trip details |
| PUT | `/api/logistics/delivery-trips/[id]` | Update trip |
| DELETE | `/api/logistics/delivery-trips/[id]` | Cancel trip |
| PATCH | `/api/logistics/delivery-trips/[id]` | Status transitions (dispatch, complete) |
| PATCH | `/api/logistics/delivery-trips/[id]/items/[itemId]` | Update item status (delivered, failed, retry) |

### UI Pages

#### For Collectors (Mobile-Friendly)

| Page | Path | Description |
|------|------|-------------|
| My Trips | `/logistics/my-trips` | Collector's assigned trips |
| New Collection | `/logistics/collect` | Start new collection trip |
| Collection Details | `/logistics/collect/[id]` | Manage collection in progress |
| Delivery Details | `/logistics/deliver/[id]` | Execute delivery trip |

#### For Service Center

| Page | Path | Description |
|------|------|-------------|
| Logistics Dashboard | `/logistics` | Overview and stats |
| Pending Receipts | `/logistics/receive` | Trips waiting to be received |
| Receive Trip | `/logistics/receive/[id]` | Process incoming trip |
| Ready for Delivery | `/logistics/ready-for-delivery` | Claims ready to ship |
| Create Delivery | `/logistics/delivery-trips/new` | Create new delivery trip |
| Collection Trips | `/logistics/collection-trips` | All collection trips |
| Delivery Trips | `/logistics/delivery-trips` | All delivery trips |

### Permissions

| Permission | Description |
|------------|-------------|
| `logistics.view` | View logistics dashboard and trips |
| `logistics.create_collection` | Create collection trips |
| `logistics.receive` | Receive trips at service center |
| `logistics.create_delivery` | Create delivery trips |
| `logistics.manage_collectors` | Manage collector records |

### Key Features

#### 1. Flexible Collection
- Collect from **shops** or directly from **customers**
- Handle both **registered** and **unregistered** warranty cards
- Add multiple items per trip
- Mobile-friendly interface for collectors on the go

#### 2. Smart Receiving
- Batch receive all items in a trip
- Auto-register warranty cards (with shop info if no customer details)
- Auto-create claims for each item
- Items automatically enter workflow

#### 3. Efficient Delivery
- Bulk select completed claims by destination
- Group deliveries to same shop/customer
- Track individual item delivery status
- Retry failed deliveries within same trip
- Capture signatures as proof of delivery

#### 4. Mobile-First Collector Interface
- Responsive design works on phones/tablets
- Quick item scanning (serial number entry)
- One-tap status updates
- Offline-capable (future enhancement)

### Status Flows

#### Collection Trip Status
```
IN_PROGRESS → IN_TRANSIT → RECEIVED
     ↓
  CANCELLED
```

#### Collection Item Status
```
COLLECTED → RECEIVED → PROCESSED
```

#### Delivery Trip Status
```
PENDING → ASSIGNED → IN_TRANSIT → COMPLETED
    ↓         ↓           ↓
    └─────────┴───────────┴──→ CANCELLED
                          ↓
                       PARTIAL (some items failed)
```

#### Delivery Item Status
```
PENDING → DELIVERED
    ↓
  FAILED ←→ PENDING (retry)
```

### Implementation Phases

#### Phase 4.1: Database & Core APIs
- Add new Prisma models
- Create collection trip APIs
- Create delivery trip APIs
- Update permissions

#### Phase 4.2: Service Center UI
- Pending receipts page
- Receive trip interface
- Ready for delivery page
- Create delivery trip page

#### Phase 4.3: Collector Mobile UI
- My trips dashboard
- New collection interface
- Collection management
- Delivery execution

#### Phase 4.4: Integration & Polish
- Dashboard updates
- Notifications integration
- Reports and analytics
- Performance optimization

---

## License

Proprietary - CodeLink

## Support

For support, contact support@codelink.com