# CodeLink ServiceHub - Project Reference

## Overview

**CodeLink ServiceHub** is a multi-tenant SaaS warranty claim and customer support management platform built with Next.js 16. Designed for manufacturing and industrial equipment companies to manage warranty claims, logistics, and customer service workflows.

## Tech Stack

| Category | Technology | Version |
|----------|------------|---------|
| Framework | Next.js (App Router) | 16.x |
| Language | TypeScript | 5.x |
| UI | React + Tailwind CSS + shadcn/ui | React 19.x |
| Database | MySQL + Prisma ORM | Prisma 5.x |
| Authentication | NextAuth.js v5 (Auth.js) | 5.0.0-beta.30 |
| State Management | Zustand + TanStack Query | 5.x |
| Forms | React Hook Form + Zod | 7.x / 4.x |
| Drag & Drop | @dnd-kit | 6.x |

## Project Structure

```
src/
├── app/
│   ├── (auth)/                    # Auth layout group
│   │   ├── layout.tsx
│   │   └── login/page.tsx
│   ├── (dashboard)/               # Protected dashboard layout group
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx     # Main dashboard
│   │   ├── users/                 # User management
│   │   ├── roles/                 # Role management
│   │   ├── products/              # Product catalog
│   │   ├── inventory/             # Inventory/parts management
│   │   ├── shops/                 # Shop/dealer management
│   │   ├── customers/             # Customer management
│   │   ├── warranty/              # Warranty cards
│   │   ├── claims/                # Warranty claims
│   │   │   ├── page.tsx           # Claims list
│   │   │   ├── [id]/page.tsx      # Claim details & workflow
│   │   │   ├── new/page.tsx       # Create claim
│   │   │   └── pending-acceptance/page.tsx  # Review pending claims
│   │   ├── workflows/             # Workflow templates
│   │   ├── logistics/             # Logistics management
│   │   │   ├── my-trips/page.tsx  # Collector dashboard
│   │   │   ├── pickups/           # Pickup management
│   │   │   ├── collection-trips/  # Collection trips
│   │   │   ├── deliveries/        # Delivery management
│   │   │   ├── delivery-trips/    # Batch deliveries
│   │   │   ├── collectors/        # Collector management
│   │   │   ├── collect/[id]/      # Collection trip detail
│   │   │   └── deliver/[id]/      # Delivery trip detail
│   │   ├── my-tasks/              # User's assigned tasks
│   │   └── settings/              # Settings (placeholder)
│   ├── api/                       # API Routes
│   │   ├── auth/[...nextauth]/    # NextAuth handler
│   │   ├── users/
│   │   ├── roles/
│   │   ├── products/
│   │   ├── categories/
│   │   ├── inventory/
│   │   ├── shops/
│   │   │   └── [id]/approve/        # Shop approval endpoint
│   │   ├── customers/
│   │   ├── warranty-cards/
│   │   ├── claims/
│   │   │   ├── route.ts           # List/create claims
│   │   │   ├── [id]/route.ts      # Claim CRUD (includes _userContext)
│   │   │   ├── [id]/accept/route.ts        # Accept/reject claim
│   │   │   ├── [id]/update-pending/route.ts # Update pending claim
│   │   │   ├── [id]/step-status/route.ts   # Step status GET/PATCH
│   │   │   ├── [id]/quotation/route.ts     # Quotation management
│   │   │   ├── [id]/invoice/route.ts       # Invoice management
│   │   │   ├── [id]/parts/route.ts         # Claim parts
│   │   │   ├── [id]/sub-tasks/             # Sub-task management
│   │   │   │   ├── route.ts                # List/create sub-tasks
│   │   │   │   └── [taskId]/
│   │   │   │       ├── route.ts            # Sub-task CRUD
│   │   │   │       └── complete/route.ts   # Complete sub-task
│   │   │   ├── pending-acceptance/route.ts # Grouped pending claims
│   │   │   └── bulk/route.ts      # Bulk operations
│   │   ├── my-tasks/
│   │   │   └── route.ts           # User's assigned tasks (sequential filtering)
│   │   ├── workflows/
│   │   │   ├── [id]/execute/route.ts       # Execute/rollback steps
│   │   │   └── steps/[stepId]/eligible-users/route.ts
│   │   ├── logistics/
│   │   │   ├── pickups/           # Pickup CRUD + status
│   │   │   ├── collection-trips/  # Collection trip management
│   │   │   ├── deliveries/        # Delivery CRUD
│   │   │   ├── delivery-trips/    # Delivery trip management
│   │   │   └── collectors/        # Collector management
│   │   ├── notification-templates/
│   │   ├── cron/                  # Cron job endpoints
│   │   └── dashboard/
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── ui/                        # shadcn/ui components
│   ├── common/                    # Shared components
│   ├── layout/                    # Layout components (Sidebar, Header)
│   ├── tables/                    # Data table components
│   ├── claims/                    # Claim-specific components
│   │   ├── step-status-dropdown.tsx    # Step status update dropdown
│   │   ├── assignee-claim-view.tsx     # Restricted view for step assignees
│   │   ├── sub-task-list.tsx           # Sub-task management (supports onSubTaskStatusChange callback)
│   │   ├── sub-task-form-dialog.tsx    # Sub-task create/edit dialog
│   │   ├── next-user-selection-modal.tsx # Next user selection for step completion
│   │   ├── step-assignment-mapper.tsx  # Step assignment visualization
│   │   ├── workflow-visualization.tsx  # Workflow tree view with steps, sub-tasks, and assignees
│   │   └── claim-finalization-section.tsx # Claim completion section
│   └── dashboard/                 # Dashboard widgets
├── lib/
│   ├── auth.ts                    # NextAuth configuration
│   ├── prisma.ts                  # Prisma client
│   ├── api-utils.ts               # API helper functions
│   ├── utils.ts                   # General utilities
│   ├── sub-task-utils.ts          # Sequential sub-task workflow utilities
│   ├── constants/
│   │   ├── index.ts               # App constants
│   │   └── permissions.ts         # Permission definitions
│   ├── email-provider.ts          # Email service (SMTP/Nodemailer)
│   ├── sms-provider.ts            # SMS service (Twilio)
│   └── workflow-notifications.ts  # Workflow notification handlers
├── types/
│   └── index.ts                   # TypeScript type definitions
└── middleware.ts                  # Route protection middleware

prisma/
├── schema.prisma                  # Database schema
└── seed.ts                        # Database seeder
```

## Authentication

- **Multi-tenant auth**: Users login with subdomain (company code) + email + password
- **Session strategy**: JWT-based, 24-hour expiry
- **Session revalidation**: User status checked every 5 minutes

### Login Credentials (Demo)

| Field | Value |
|-------|-------|
| Company Code | `demo` |
| Email | `admin@demo.codelink.com` |
| Password | `admin123` |

### Auth Helpers

```typescript
import { auth } from "@/lib/auth";
import { requireAuth, getCurrentUser, checkPermission } from "@/lib/api-utils";

// In API routes
const user = await requireAuth(); // Throws if not authenticated
const hasAccess = await checkPermission("claims.view");
```

## Database Models

### Core Tables

| Model | Description |
|-------|-------------|
| `Tenant` | Multi-tenant companies |
| `User` | User accounts per tenant |
| `Role` | Permission-based roles |
| `Product` / `ProductCategory` | Product catalog |
| `InventoryItem` / `InventoryCategory` | Parts/components inventory |
| `Shop` | Dealers/shops (includes `isVerified` for approval workflow) |
| `Customer` | End customers |

### Warranty & Claims Tables

| Model | Description |
|-------|-------------|
| `WarrantyCard` | Warranty registrations (cardNumber, serialNumber, dates, status) |
| `WarrantyClaim` | Service claims with workflow tracking |
| `ClaimHistory` | Claim audit trail |
| `ClaimStepAssignment` | Per-claim user assignments |
| `ClaimSubTask` | Sub-tasks within workflow steps |
| `ClaimPart` | Parts used in claim repairs |
| `ClaimServiceCharge` | Service charges (LABOR, SERVICE_VISIT, etc.) |
| `ClaimQuotation` / `QuotationItem` | Repair cost estimates |
| `ClaimInvoice` / `InvoiceItem` | Final billing documents |

### Workflow Tables

| Model | Description |
|-------|-------------|
| `Workflow` | Process templates with trigger types |
| `WorkflowStep` | Individual steps with SLA definitions and assignment configuration |
| `StepTransition` | Step connections with conditional logic |
| `StepNotification` | Notifications triggered on step events |

### WorkflowStep Assignment Fields

The `WorkflowStep` model includes fields for configuring user assignment:

```prisma
model WorkflowStep {
  // ... other fields

  // Assignment Configuration (Multi-select support)
  assignmentType    String?  @db.VarChar(20)  // "ALL" | "ROLES" | "USERS"
  allowedRoleIds    Json?                      // Array of role IDs: [1, 2, 3]
  allowedUserIds    Json?                      // Array of user IDs: [5, 7, 9]

  // Legacy fields (backward compatible)
  requiredRoleId    Int?                       // Single role restriction
  autoAssignTo      Int?                       // Auto-assign to specific user
}
```

**Assignment Types:**
| Type | Description | Filter Logic |
|------|-------------|--------------|
| `ALL` | Any active user can be assigned | Returns all active users |
| `ROLES` | Only users with specific roles | Filters by `allowedRoleIds` array |
| `USERS` | Only specific users | Filters by `allowedUserIds` array |

### Logistics Tables

| Model | Description |
|-------|-------------|
| `Collector` | Logistics personnel (name, phone, vehicleNumber, status) |
| `Pickup` | Individual item collections |
| `CollectionTrip` | Batch collections from shops |
| `CollectionItem` | Items within collection trip |
| `Delivery` | Individual deliveries |
| `DeliveryTrip` | Batch deliveries to destinations |
| `DeliveryItem` | Items within delivery trip |

### Key Enums

| Enum | Values | Description |
|------|--------|-------------|
| `ClaimAcceptanceStatus` | `PENDING`, `ACCEPTED`, `REJECTED` | Acceptance status for claims from collections |
| `WarrantyCardStatus` | `ACTIVE`, `EXPIRED`, `VOID`, `CLAIMED` | Warranty card lifecycle |
| `PickupStatus` | `PENDING`, `ASSIGNED`, `IN_TRANSIT`, `COMPLETED`, `CANCELLED`, `REJECTED` | Pickup lifecycle |
| `DeliveryStatus` | `PENDING`, `ASSIGNED`, `IN_TRANSIT`, `COMPLETED`, `FAILED`, `CANCELLED` | Delivery lifecycle |
| `CollectionTripStatus` | `IN_PROGRESS`, `IN_TRANSIT`, `RECEIVED`, `CANCELLED` | Collection trip lifecycle |
| `DeliveryTripStatus` | `PENDING`, `ASSIGNED`, `IN_TRANSIT`, `COMPLETED`, `PARTIAL`, `CANCELLED` | Delivery trip lifecycle |
| `CollectionItemStatus` | `COLLECTED`, `RECEIVED`, `PROCESSED`, `REJECTED` | Item status in collection |
| `QuotationStatus` | `DRAFT`, `SENT`, `VIEWED`, `APPROVED`, `REJECTED`, `EXPIRED`, `CONVERTED` | Quotation lifecycle |
| `InvoiceStatus` | `DRAFT`, `GENERATED`, `SENT`, `PAID`, `PARTIALLY_PAID`, `CANCELLED` | Invoice lifecycle |
| `StepStatus` | `NOT_STARTED`, `STARTED`, `IN_PROGRESS`, `WAITING_FOR_PARTS`, `WAITING_FOR_APPROVAL`, `ON_HOLD`, `COMPLETED` | Detailed step status tracking |

### ClaimStepAssignment Model

Tracks per-claim user assignments for workflow steps with detailed status tracking.

```prisma
model ClaimStepAssignment {
  id              Int         @id @default(autoincrement())
  claimId         Int
  workflowStepId  Int
  assignedUserId  Int
  assignedBy      Int
  isActive        Boolean     @default(true)

  // Step status tracking (detailed status for workflow)
  stepStatus      StepStatus  @default(NOT_STARTED)
  stepStartedAt   DateTime?   // Set on first status change from NOT_STARTED
  stepCompletedAt DateTime?   // Set when step is completed

  @@unique([claimId, workflowStepId])
}
```

### Claim Model Key Fields

```prisma
model WarrantyClaim {
  // Identity
  claimNumber          String

  // Status tracking
  currentStatus        String    // pending_acceptance, in_progress, resolved, rejected
  currentStepId        Int?
  currentLocation      String    // SHOP, CUSTOMER, IN_TRANSIT, SERVICE_CENTER

  // Acceptance (for claims from collections)
  acceptanceStatus     ClaimAcceptanceStatus  // PENDING, ACCEPTED, REJECTED
  acceptedAt           DateTime?
  acceptedBy           Int?

  // Warranty
  isUnderWarranty      Boolean
  warrantyOverrideBy   Int?
  warrantyOverrideAt   DateTime?
  warrantyOverrideReason String?

  // Quotation
  requiresQuotation    Boolean
  quotationApprovedAt  DateTime?

  // Relationships
  warrantyCard         WarrantyCard
  product              Product?
  customer             Customer?
  workflow             Workflow?
  assignedTo           User?
}
```

## ID Generation Patterns

All auto-generated IDs follow: `PREFIX + YYMMDD + sequence`

| Entity | Prefix | Example |
|--------|--------|---------|
| Warranty Cards | WC | WC24122300001 |
| Claims | CL | CL24122300001 |
| Pickups | PU | PU24122300001 |
| Collection Trips | CT | CT24122300001 |
| Delivery Trips | DT | DT24122300001 |
| Quotations | QT | QT24122300001 |

## Permission System

Permissions are stored as string arrays in the `Role.permissions` JSON field.

### Permission Format

```
{module}.{action}
```

### Key Permissions

| Permission | Description |
|------------|-------------|
| `dashboard.view` | View dashboard |
| `users.view/create/edit/delete` | User management |
| `roles.view/create/edit/delete` | Role management |
| `products.view/create/edit/delete` | Product management |
| `inventory.view/create/edit/delete/adjust_stock` | Inventory management |
| `shops.view/create/edit/delete/approve` | Shop management |
| `customers.view/create/edit/delete` | Customer management |
| `warranty_cards.view/create/edit/void` | Warranty management |
| `claims.view/view_all/view_assigned/create/edit/process/assign/close` | Claim management |
| `claims.accept` | Accept/reject pending claims |
| `workflows.view/create/edit/delete` | Workflow management |
| `logistics.view/manage_pickups/manage_deliveries/manage_collectors` | Logistics admin |
| `logistics.my_trips/collect/deliver/receive/create_collection/create_delivery` | Logistics operations |

### Default Roles

- **Admin**: All permissions
- **Manager**: Most permissions except delete/admin
- **Technician**: View + process assigned claims
- **Receptionist**: Create warranty cards, customers, claims
- **Collector**: Logistics collection/delivery operations (`logistics.my_trips`, `logistics.collect`, `logistics.deliver`)

## Complete System Flow

### End-to-End Claim Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLAIM CREATION PATHS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PATH A: Direct Creation                PATH B: From Collection             │
│  ─────────────────────────              ───────────────────────             │
│  Staff creates claim at                 Pickup scheduled for item           │
│  /claims/new                                      ↓                         │
│           ↓                             Collector starts trip               │
│  Claim created with                     (status: IN_PROGRESS)               │
│  status "new"                                     ↓                         │
│           ↓                             Items collected at shop             │
│  Goes to /claims                        (items status: COLLECTED)           │
│  "New" tab                                        ↓                         │
│                                         Trip marked IN_TRANSIT              │
│                                                   ↓                         │
│                                         /claims/pending-acceptance          │
│                                         Shows trips grouped by:             │
│                                         Collector → Shop → Items            │
│                                                   ↓                         │
│                                         For each item, verify:              │
│                                         ☐ Warranty Card Received            │
│                                         ☐ Item Received                     │
│                                                   ↓                         │
│                                    ┌─────────────┴─────────────┐            │
│                                    ↓                           ↓            │
│                              RECEIVE                       REJECT           │
│                         (both boxes checked)          (requires reason)     │
│                                    ↓                           ↓            │
│                         Creates claim with           Creates return         │
│                         status "new"                 delivery               │
│                                    ↓                                        │
│                         Goes to /claims                                     │
│                         "New" tab                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                           WORKFLOW PROCESSING                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  START step → ACTION steps (diagnosis, repair, QC) → END step              │
│                                                                             │
│  Features:                                                                  │
│  • Step types: START, ACTION, DECISION, NOTIFICATION, WAIT, END            │
│  • Conditional transitions (ALWAYS, USER_CHOICE, CONDITIONAL)              │
│  • Per-step SLA tracking                                                   │
│  • Auto-assignment rules                                                   │
│  • Sub-tasks within steps                                                  │
│  • SMS/Email notifications on step events                                  │
│  • Rollback capability (with permissions)                                  │
│                                                                             │
│  If out-of-warranty:                                                       │
│  • Create quotation → Send to customer → Await approval                    │
│  • Approved → Continue workflow                                            │
│  • Rejected → Return to customer                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                           COMPLETION & DELIVERY                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Workflow reaches END step                                                  │
│           ↓                                                                 │
│  Invoice generated (from quotation or direct)                              │
│           ↓                                                                 │
│  Payment recorded (if applicable)                                          │
│           ↓                                                                 │
│  Delivery trip scheduled                                                   │
│           ↓                                                                 │
│  Collector delivers to shop/customer                                       │
│           ↓                                                                 │
│  Claim marked RESOLVED                                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Logistics Status Flows

```
PICKUPS:
PENDING ──→ ASSIGNED ──→ IN_TRANSIT ──→ COMPLETED
                │
                └──→ REJECTED (inspection failed)
                └──→ CANCELLED

COLLECTION TRIPS:
IN_PROGRESS ──→ IN_TRANSIT ──→ RECEIVED
      │
      └──→ CANCELLED

DELIVERIES:
PENDING ──→ ASSIGNED ──→ IN_TRANSIT ──→ COMPLETED
                │
                └──→ FAILED
                └──→ CANCELLED

DELIVERY TRIPS:
PENDING ──→ ASSIGNED ──→ IN_TRANSIT ──→ COMPLETED
                │                  │
                │                  └──→ PARTIAL (some items failed)
                └──→ CANCELLED
```

## API Patterns

### Response Format

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
  meta?: { page: number; limit: number; total: number; totalPages: number };
}
```

### API Helpers

```typescript
import {
  successResponse,
  errorResponse,
  handleZodError,
  requireAuth,
  parsePaginationParams,
  calculatePaginationMeta
} from "@/lib/api-utils";

// Success response
return successResponse(data);
return successResponse(data, paginationMeta);

// Error response
return errorResponse("Not found", "NOT_FOUND", 404);

// Validation error
return handleZodError(zodError);
```

### Standard API Route Pattern

```typescript
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, successResponse, errorResponse, parsePaginationParams } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const { page, limit, search, skip } = parsePaginationParams(searchParams);

    const [data, total] = await Promise.all([
      prisma.model.findMany({
        where: { tenantId: user.tenantId },
        skip,
        take: limit,
      }),
      prisma.model.count({ where: { tenantId: user.tenantId } }),
    ]);

    return successResponse(data, { page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
```

### Transaction Pattern

```typescript
const result = await prisma.$transaction(async (tx) => {
  await tx.model1.create({...});
  await tx.model2.update({...});
  return tx.model3.findUnique({...});
});
```

## Key API Endpoints

### Claims

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/claims` | GET | List claims (filters: status, assignedTo, search) |
| `/api/claims` | POST | Create new claim |
| `/api/claims/[id]` | GET/PUT/DELETE | Claim CRUD (GET includes `_userContext` for dual view) |
| `/api/claims/[id]/accept` | POST | Accept or reject pending claim |
| `/api/claims/[id]/update-pending` | PUT | Update pending claim details before acceptance |
| `/api/claims/[id]/step-status` | GET/PATCH | Get/update current step status (see Step Status API below) |
| `/api/claims/[id]/workflow-progress` | GET | Get workflow progress with all steps, sub-tasks, and assignees |
| `/api/claims/pending-acceptance` | GET | Get pending claims grouped by Collector → Shop |
| `/api/claims/[id]/quotation` | GET/POST/PUT | Quotation management |
| `/api/claims/[id]/invoice` | GET/POST/PUT | Invoice management |
| `/api/claims/[id]/parts` | GET/POST | Claim parts management |
| `/api/claims/bulk` | POST/PUT | Bulk operations |

### Logistics

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/logistics/pickups` | GET/POST | List/create pickups |
| `/api/logistics/pickups/[id]` | GET/PUT/DELETE | Pickup CRUD |
| `/api/logistics/pickups/[id]` | PATCH | Status changes (assign, start, complete, reject) |
| `/api/logistics/collection-trips` | GET/POST | List/create trips (filters: myTrips, collectorId, shopId, status, fromDate, toDate) |
| `/api/logistics/collection-trips/[id]` | GET/PATCH | Trip details/status |
| `/api/logistics/collection-trips/[id]/items` | GET/POST | Manage trip items |
| `/api/logistics/collection-trips/[id]/items/[itemId]/receive` | POST | Receive single item → creates claim |
| `/api/logistics/collection-trips/[id]/receive` | POST | Receive entire trip → creates claims |
| `/api/logistics/deliveries` | GET/POST | List/create deliveries |
| `/api/logistics/deliveries/[id]` | GET/PUT/PATCH | Delivery CRUD + status |
| `/api/logistics/delivery-trips` | GET/POST | List/create delivery trips |
| `/api/logistics/delivery-trips/[id]` | GET/PATCH | Trip details/status (dispatch, complete) |
| `/api/logistics/delivery-trips/[id]/items/[itemId]` | PATCH | Update delivery item status |
| `/api/logistics/collectors` | GET/POST | List/create collectors |
| `/api/logistics/collectors/[id]` | GET/PUT/DELETE | Collector CRUD |

### Workflows

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/workflows` | GET/POST | List/create workflows |
| `/api/workflows/[id]` | GET/PUT/DELETE | Workflow CRUD |
| `/api/workflows/[id]/execute` | POST | Execute workflow step transition (`nextAssignedUserId` is optional) |
| `/api/workflows/[id]/execute` | PATCH | Rollback to previous step |
| `/api/workflows/steps/[stepId]/eligible-users` | GET | Get users eligible for step assignment |

**Note:** Next user selection (`nextAssignedUserId`) is now **optional** during step completion. Steps can be completed without assigning the next user - assignment can be done later.

### Shops

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/shops` | GET | List shops (filters: search, isVerified) |
| `/api/shops` | POST | Create new shop |
| `/api/shops/[id]` | GET/PUT/DELETE | Shop CRUD |
| `/api/shops/[id]/approve` | POST | Approve/verify pending shop (requires `shops.edit` or `shops.approve`) |

### Other

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/inventory` | GET/POST | Inventory items |
| `/api/inventory/[id]/adjust` | POST | Stock adjustment |
| `/api/notification-templates` | GET/POST | SMS/Email templates |
| `/api/dashboard/stats` | GET | Dashboard statistics |

## Key Features

### 1. Workflow Engine

- **Step Types**: START, ACTION, DECISION, NOTIFICATION, WAIT, END
- **Transitions**: ALWAYS (auto), USER_CHOICE (manual), CONDITIONAL (rule-based)
- **SLA Tracking**: Per-step time limits with escalation
- **Multi-Select User Assignment**: Configure which users/roles can be assigned to each step
- **Optional User Selection**: Next user selection is optional when completing steps (can assign later)
- **Step Status Tracking**: Detailed status per step (NOT_STARTED, STARTED, IN_PROGRESS, WAITING_FOR_PARTS, etc.)
- **Sub-tasks**: Sequential checklist items within steps (see Sequential Sub-Task Workflow below)
- **Sub-task Blocking**: Process Step button disabled until all sub-tasks are complete
- **Notifications**: SMS/Email on ON_ENTER, ON_EXIT, escalation events
- **Rollback**: Return to previous steps (with permission check)
- **Dual View System**: Admin vs Assignee views in claim detail page
- **Workflow Visualization**: Tree view showing all steps, sub-tasks, assignees, and status
- **Change Workflow Lock**: Cannot change workflow after it has started (past START step)
- **START Step Permissions**: Anyone with `claims.process` or `claims.assign` can start workflows

#### Multi-Select User Assignment Configuration

Configure which users or roles can be assigned to each workflow step in the **Workflow Editor** (`/workflows/[id]/edit`).

**Configuration Options (in Rules tab):**

| Option | Description | Eligible Users |
|--------|-------------|----------------|
| **All Users** | No restriction | All active users in tenant |
| **Specific Roles** | Multi-select roles | Users with any of the selected roles |
| **Specific Users** | Multi-select users | Only the selected users |

**Workflow Editor UI:**
```
Rules Tab → Step Assignment
├── ○ All Users (any active user can process)
├── ○ Specific Roles
│   └── ☑ Admin  ☑ Technician  ☐ Manager
└── ○ Specific Users
    └── ☑ John Doe  ☑ Jane Smith  ☐ Bob Wilson
```

**API Endpoint:** `GET /api/workflows/steps/[stepId]/eligible-users`

```json
// Response
{
  "success": true,
  "data": {
    "step": { "id": 5, "name": "Diagnosis", "stepType": "ACTION" },
    "assignmentConfig": {
      "mode": "ROLES",           // "ALL" | "ROLES" | "USERS"
      "assignmentType": "ROLES",
      "allowedRoles": [
        { "id": 2, "name": "Technician" },
        { "id": 3, "name": "Senior Tech" }
      ],
      "allowedUserIds": [],
      "preSelectedUserId": null
    },
    "eligibleUsers": [
      {
        "id": 5,
        "firstName": "John",
        "lastName": "Doe",
        "fullName": "John Doe",
        "email": "john@example.com",
        "roleName": "Technician",
        "workload": 3,           // Number of active claims
        "isPreSelected": false
      }
    ],
    "totalEligible": 5
  }
}
```

**Start Workflow Dialog:**
- Shows eligible users based on the first ACTION step's assignment configuration
- Displays badge showing assignment mode: "All Users", "2 Roles", "3 Specific Users"
- Users sorted by workload (least busy first)
- Pre-selected user shown first if configured

**Direct END Step (No ACTION steps):**
- If workflow only has START → END, shows warning message
- No user selection needed
- Button text changes to "Complete Workflow"

#### Step Status API

Update the detailed status of a workflow step (only assigned user or admin can update).

**Endpoint**: `PATCH /api/claims/[id]/step-status`

```json
// Request
{
  "stepStatus": "IN_PROGRESS",  // or "STARTED", "WAITING_FOR_PARTS", etc.
  "notes": "Optional note about the status change"
}

// Response
{
  "success": true,
  "data": {
    "stepAssignment": {
      "stepStatus": "IN_PROGRESS",
      "stepStartedAt": "2024-01-15T10:30:00Z",
      "assignedUser": { "id": 1, "firstName": "John", "lastName": "Doe" },
      "workflowStep": { "id": 5, "name": "Diagnosis", "statusName": "In Diagnosis" }
    },
    "message": "Step status updated to IN_PROGRESS"
  }
}
```

**Valid Status Values:**
| Status | Color | Description |
|--------|-------|-------------|
| `NOT_STARTED` | Gray | Just assigned, hasn't begun |
| `STARTED` | Blue | User acknowledged, beginning work |
| `IN_PROGRESS` | Cyan | Actively working |
| `WAITING_FOR_PARTS` | Orange | Blocked on parts |
| `WAITING_FOR_APPROVAL` | Yellow | Needs approval |
| `ON_HOLD` | Red | Temporarily paused |
| `COMPLETED` | Green | Done (set by system when step is completed) |

#### Dual View System (Claim Detail Page)

The claim detail page (`/claims/[id]`) renders different views based on user context:

```typescript
// API Response includes _userContext:
{
  ...claim,
  _userContext: {
    isAdmin: boolean,           // Has claims.view_all
    isStepAssignee: boolean,    // Assigned to current step
    canEdit: boolean,           // Can edit diagnosis/notes
    canProcessStep: boolean,    // Can complete step
    canAddSubTasks: boolean,    // Admin only
    canAssignWorkflow: boolean, // Admin or claims.assign
    canRollback: boolean,       // Admin or claims.escalate
  }
}
```

**View Rendering Logic:**
```
if (isAdmin) → Full Admin View (control room)
else if (isStepAssignee) → AssigneeClaimView (restricted)
else → Read-only view
```

**Admin View Features:**
- Full workflow controls (assign, change workflow)
- Add/manage all sub-tasks
- Process step with next user selection
- View complete history
- Rollback option
- Update any field

**Assignee View Features:**
- Step status dropdown (update their status)
- Their sub-tasks only (sequential)
- Edit diagnosis, notes, resolution
- Process Step button (when sub-tasks done)
- History summary (collapsible)
- Product, customer, shop info (read-only)

#### Workflow Visualization Component

Displays workflow progress as a tree view in the claim detail sidebar.

**Component:** `WorkflowVisualization` (`src/components/claims/workflow-visualization.tsx`)

**Features:**
- Shows all workflow steps in order with connector lines
- Each step displays: name, status badge, assigned user, start time
- Sub-tasks shown as expandable list under each step (except START step)
- Color-coded status indicators:
  - Green = completed
  - Blue = current (ACTION/DECISION steps)
  - Amber = preparation (START step when current)
  - Gray = pending
- Auto-expands current step and steps with sub-tasks
- Click to expand/collapse step details

**Initial Stage (Assigned Tasks):**
- Sub-tasks added while at START step are "initial preparation tasks"
- These appear in a separate "Assigned Tasks" section at the TOP of the workflow flow
- Connected to the workflow steps with a connector line
- Only shown while workflow is at START step (before "Start Workflow" is clicked)
- Once workflow starts (moves past START), these tasks are hidden from the visualization

**Visual Structure:**
```
Workflow Progress
Standard Warranty Claim Process

📋 Assigned Tasks                    2/2    ← Initial preparation tasks
   Initial preparation tasks
   │
   └─ ✓ Task 1                       HIGH
   │    Assignee Name
   └─ ✓ Task 2                       HIGH
        Assignee Name
   │
   ↓
🟡 Claim Received        [Preparation]     ← START step (amber)
   │
   ↓
⚪ Initial Inspection                       ← ACTION steps (gray = pending)
   │
   ↓
⚪ Repair in Progress
   │
   ↓
⚪ Quality Check
   │
   ↓
⚪ Ready for Delivery                       ← END step
```

**Props:**
```typescript
interface WorkflowVisualizationProps {
  claimId: number;
  workflowId: number;
  workflowName: string;
  currentStepId: number | null;
  refreshKey?: number; // Increment to trigger refresh
}
```

**API Endpoint:** `GET /api/claims/[id]/workflow-progress`
```json
// Response
{
  "success": true,
  "data": {
    "workflow": { "id": 1, "name": "Standard Warranty Process" },
    "currentStepId": 5,
    "steps": [
      {
        "id": 1,
        "name": "Receive",
        "statusName": "Received",
        "stepType": "START",
        "stepOrder": 1,
        "isCompleted": true,
        "isCurrent": false,
        "assignment": {
          "assignedUser": { "id": 1, "firstName": "John", "lastName": "Doe" },
          "stepStatus": "COMPLETED",
          "stepStartedAt": "2024-01-15T10:00:00Z",
          "stepCompletedAt": "2024-01-15T10:30:00Z"
        },
        "subTasks": []
      },
      {
        "id": 5,
        "name": "Diagnosis",
        "statusName": "In Diagnosis",
        "stepType": "ACTION",
        "stepOrder": 2,
        "isCompleted": false,
        "isCurrent": true,
        "assignment": {
          "assignedUser": { "id": 2, "firstName": "Jane", "lastName": "Smith" },
          "stepStatus": "IN_PROGRESS",
          "stepStartedAt": "2024-01-15T10:35:00Z",
          "stepCompletedAt": null
        },
        "subTasks": [
          {
            "id": 1,
            "title": "Visual Inspection",
            "status": "COMPLETED",
            "priority": "HIGH",
            "assignedUser": { "id": 3, "firstName": "Bob", "lastName": "Wilson" }
          },
          {
            "id": 2,
            "title": "Functional Test",
            "status": "IN_PROGRESS",
            "priority": "MEDIUM",
            "assignedUser": { "id": 2, "firstName": "Jane", "lastName": "Smith" }
          }
        ]
      }
    ]
  }
}
```

#### Process Step Dialog

The Process Step dialog shows next step info and allows optional user assignment.

**Features:**
- Shows current step info (name, type, status)
- Form fields for required step data
- Transition selection (for USER_CHOICE transitions)
- **Next Step Info**: Shows name and status of the upcoming step
- **Optional User Assignment**: Dropdown to assign next step user (can skip)
- Notes field for step completion notes

**UI Flow:**
```
Click "Process Step" button
    ↓
Dialog opens with:
├── Current step info
├── Form fields (if any)
├── Transition selection (if multiple)
├── Next step info box (blue highlight)
├── User assignment dropdown (optional)
└── Notes field
    ↓
Click "Complete Step"
    ↓
Step completes, next step activates
```

**Button States:**
- **Disabled**: When there are incomplete sub-tasks (tooltip: "Complete all sub-tasks first")
- **Enabled**: When all sub-tasks are complete or no sub-tasks exist

#### START Step Display (Claim Detail Page)

When a claim is at the START step (workflow assigned but not started), the claim detail page shows:

**Card Header:** "Workflow Assigned" (instead of "Current Workflow Step")

**Card Content:**
```
🔵 Ready to Start Processing
   Claim received and workflow assigned.
   Click "Start Workflow" to assign to first step.
```

**Button:** "Start Workflow" (instead of "Process Step")

This makes it clear that:
- The workflow is assigned but processing hasn't begun
- Sub-tasks at this stage are initial preparation tasks
- Clicking "Start Workflow" will move to the first ACTION step

#### Change Workflow Lock

The "Change Workflow" button is disabled after the workflow has started.

**UI Logic:**
- **Enabled**: When current step is START type
- **Disabled**: When current step is past START (ACTION, DECISION, END, etc.)

**Tooltip when disabled:** "Cannot change workflow after it has started"

**API Protection** (`PUT /api/workflows/[id]/execute`):
- Checks if `currentStepId` points to a START step
- If changing workflow and current step is NOT START → returns 400 error

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "WORKFLOW_ALREADY_STARTED",
    "message": "Cannot change workflow after it has started. Current step \"Initial Inspection\" is not the initial step."
  }
}
```

#### Sub-Task Migration on Workflow Change

When changing workflows (while at START step), initial stage sub-tasks are automatically migrated to the new workflow's START step.

**Behavior:**
```
Workflow A (START step ID: 10)
├── Sub-task 1 (workflowStepId: 10)
└── Sub-task 2 (workflowStepId: 10)
        ↓
    Change to Workflow B
        ↓
Workflow B (START step ID: 25)
├── Sub-task 1 (workflowStepId: 25)  ← Migrated!
└── Sub-task 2 (workflowStepId: 25)  ← Migrated!
```

**Why this is needed:**
- Sub-tasks are linked to a specific `workflowStepId`
- Without migration, sub-tasks would become "orphaned" when workflow changes
- Initial preparation tasks should persist regardless of which workflow is assigned

**Implementation:**
- Done inside the transaction when assigning a new workflow
- All sub-tasks linked to the old `currentStepId` are updated to the new START step ID
- Logged to console: `[Workflow Change] Migrated X sub-tasks from step Y to new START step Z`

### 1.1. Sequential Sub-Task Workflow

Sub-tasks within a workflow step execute **one-by-one in order** (by `sortOrder`). This ensures controlled task handoffs and proper notification flow.

**Flow Diagram:**
```
Step starts
    ↓
First sub-task created → Auto IN_PROGRESS → Notify assignee
    ↓
User completes sub-task
    ↓
Next sub-task exists?
    YES → Set to IN_PROGRESS → Notify next assignee
    NO → All done → Notify step assignee
    ↓
Step assignee manually completes step → Workflow advances
    ↓
Next workflow step → Repeat
```

**Key Behaviors:**
- **Sequential execution**: Only the active sub-task (first PENDING/IN_PROGRESS by `sortOrder`) is shown to its assignee
- **Auto-activation**: First sub-task created is automatically set to IN_PROGRESS
- **Automatic progression**: Completing a sub-task activates the next one in sequence
- **Step completion**: Step assignee manually advances workflow after all sub-tasks are done
- **Visibility control**: Managers with `claims.view_all` can see all sub-tasks; assignees only see their active task

**My Tasks View Logic:**
```
User sees claim in My Tasks if:
├── Has ACTIVE sub-task (first incomplete in sequence)
├── OR is step assignee with all sub-tasks done (ready to advance)
└── OR is claim assignee

Each task shows:
├── taskType: "ACTIVE_SUBTASK" | "STEP_COMPLETION" | "ASSIGNED"
├── stepStatus: Current step status (NOT_STARTED, IN_PROGRESS, etc.)
├── Claim info
└── Active sub-task details (if applicable)
```

**Notification Types:**

| Type | When | Recipient |
|------|------|-----------|
| `SUB_TASK_ASSIGNED` | Sub-task created (queued) | Sub-task assignee |
| `SUB_TASK_ACTIVATED` | Previous sub-task completed | Next sub-task assignee |
| `STEP_READY_FOR_COMPLETION` | All sub-tasks done | Step assignee |

**API Endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/claims/[id]/sub-tasks` | GET | List sub-tasks (supports `?activeOnly=true&forUserId={id}&stepId={id}`) |
| `/api/claims/[id]/sub-tasks` | POST | Create sub-task (auto-activates if first) |
| `/api/claims/[id]/sub-tasks/[taskId]` | PUT | Update sub-task |
| `/api/claims/[id]/sub-tasks/[taskId]` | DELETE | Delete sub-task |
| `/api/claims/[id]/sub-tasks/[taskId]/complete` | POST | Complete sub-task (triggers next activation) |
| `/api/my-tasks` | GET | Get user's tasks (filters to active sub-tasks only) |

**Helper Utilities** (`src/lib/sub-task-utils.ts`):
```typescript
getActiveSubTask(claimId, workflowStepId)      // Get first PENDING/IN_PROGRESS
getNextSubTask(claimId, workflowStepId, sortOrder) // Get next in sequence
areAllSubTasksCompleted(claimId, workflowStepId)   // Check if all done
checkUserHasActiveSubTask(userId, claimId, stepId) // User has active task?
checkStepAssigneeReady(userId, claimId, stepId)    // Step assignee can complete?
activateSubTask(subTaskId, tenantId, ...)          // Activate and notify
notifySubTaskActivation(...)                       // Send activation notification
notifyStepReadyForCompletion(...)                  // Notify step assignee
```

**Component Props** (`SubTaskList`):
```typescript
interface SubTaskListProps {
  claimId: number;
  workflowStepId: number;
  isCurrentStep: boolean;
  onSubTasksChange?: () => void;
  // Sequential mode props
  sequentialMode?: boolean;        // Enable sequential display
  currentUserId?: number;          // Current logged-in user ID
  isStepAssignee?: boolean;        // User is the step assignee
  showAllForManagers?: boolean;    // Managers can see all sub-tasks
  onStepComplete?: () => void;     // Callback when step should be completed
  // Assignee mode props
  assigneeMode?: boolean;          // Restrict to assignee-only actions (hide edit/delete)
  hideAddButton?: boolean;         // Hide the add sub-task button
}
```

### 2. Collection Receiving & Claim Creation

**Page**: `/claims/pending-acceptance` - Receive Collections

**Stats Dashboard**:
- **Collecting**: Trips with IN_PROGRESS status (collectors at shops)
- **In Transit**: Trips with IN_TRANSIT status (on the way to service center)
- **Received**: Completed trips
- **Collectors**: Total active collectors

**Item-wise Receiving Flow**:
1. View IN_TRANSIT collection trips grouped by **Collector → Shop → Items**
2. For each item, verify:
   - **Warranty Card Received** (checkbox)
   - **Item Received** (checkbox)
3. Check warranty status (valid/expired/not found)
4. **Receive**: Both checkboxes required → creates warranty card if needed → creates claim with status "new"
5. **Reject**: Requires reason → creates return delivery

**After Receiving → Claims Page** (`/claims`):

| Tab | Shows | Status Filter |
|-----|-------|---------------|
| **New** | Claims just received from collections | `new` |
| **In Progress** | Claims being processed | `in_progress`, `diagnosis`, `repair` |
| **Completed** | Resolved claims ready for delivery | `resolved`, `completed`, `closed` |
| **All Claims** | All claims with filters | All statuses |

**API Endpoint**: `POST /api/logistics/collection-trips/[id]/items/[itemId]/receive`
```json
// Request
{ "action": "receive" | "reject", "rejectionReason": "..." }

// Response (receive)
{ "claim": { "id": 1, "claimNumber": "CL24122300001" }, "warrantyCard": {...} }
```

### 3. Logistics System

**Individual Operations:**
- Pickups: Schedule collection from shop/customer
- Deliveries: Schedule return to shop/customer

**Trip-Based (Batch):**
- Collection Trips: Collector picks up multiple items in one trip
- Delivery Trips: Deliver multiple completed claims together

**Collector Dashboard** (`/logistics/my-trips`):
- **Pickups Tab**: Pending/assigned pickups to start
- **Collections Tab**: Active collection trips (IN_PROGRESS, IN_TRANSIT)
- **Deliveries Tab**: Assigned delivery trips

**Collection Trip Receive Process** (`/api/logistics/collection-trips/[id]/receive`):
1. Creates warranty cards for unregistered items
2. Creates claims with `acceptanceStatus: PENDING`
3. Updates pickup statuses to COMPLETED
4. Returns summary with processed/error/skipped counts

### 4. Inventory Management

- Parts/components catalog with hierarchical categories
- Stock tracking: quantity, reserved, reorder level, low stock alerts
- Transaction history (IN, OUT, ADJUST, RESERVE, RELEASE)
- Integration with claim parts & quotations

### 5. Quotation & Invoice System

**Quotations:**
- Item types: PART, SERVICE, LABOR, OTHER
- Tax & discount support (percentage or fixed)
- Status flow: DRAFT → SENT → VIEWED → APPROVED/REJECTED → CONVERTED
- Validity period tracking
- Customer notification (email/SMS)

**Invoices:**
- Created from approved quotation or direct
- Customer snapshot at invoice time
- Payment tracking: UNPAID → PARTIAL → PAID
- Warranty-covered amount segregation
- Ready-for-delivery flag

### 6. Shop Verification Workflow

**Two-tier shop management** with verification status for quality control.

**Database Field:**
- `Shop.isVerified` (Boolean, default: false)

**UI Structure** (`/shops`):

| Tab | Shows | Filter |
|-----|-------|--------|
| **Verified Shops** | Active, approved shops | `isVerified=true` |
| **Pending Approval** | Shops awaiting verification | `isVerified=false` |

**Workflow Logic:**
- Shops created from `/shops/new` page → auto-verified (`isVerified: true`)
- Shops created during warranty card registration (new shop) → pending verification
- Admin must approve pending shops to make them active

**API Endpoint**: `POST /api/shops/[id]/approve`
```json
// Request (no body required)
POST /api/shops/123/approve

// Response
{
  "success": true,
  "data": {
    "id": 123,
    "name": "Shop Name",
    "isVerified": true,
    "_count": { "customers": 5, "warrantyCards": 10 }
  }
}
```

**Permissions Required:** `shops.edit` OR `shops.approve`

**Error Codes:**
- `FORBIDDEN` (403): User lacks permission
- `NOT_FOUND` (404): Shop doesn't exist
- `ALREADY_VERIFIED` (400): Shop is already verified

## Commands

```bash
# Development
npm run dev              # Start dev server (http://localhost:3000)
npm run build            # Production build
npm run start            # Start production server
npm run lint             # Run ESLint

# Database
npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema to database
npm run db:migrate       # Run migrations
npm run db:seed          # Seed database
npm run db:studio        # Open Prisma Studio
npm run db:reset         # Reset database
```

## Troubleshooting

### Prisma Client File Lock (Windows)

If you get `EPERM: operation not permitted` error when running `npx prisma generate`:

```bash
# Option 1: Delete .prisma folder and regenerate
rmdir /s /q node_modules\.prisma
npx prisma generate

# Option 2: If Option 1 doesn't work, close all terminals/IDEs and retry
# Close VS Code, terminals, etc.
npx prisma generate
npm run dev

# Option 3: Full reinstall (last resort)
rmdir /s /q node_modules
npm install
npx prisma generate
npm run dev
```

### Database Empty After Fresh Install

```bash
npm run db:seed
```

Login credentials after seeding:
- Company Code: `demo`
- Email: `admin@demo.codelink.com`
- Password: `admin123`

### Hydration Mismatch Errors

If you see React hydration errors in the console:
1. Hard refresh: `Ctrl + Shift + R`
2. Clear site data in DevTools → Application → Storage
3. Try incognito/private window

## Environment Variables

```env
# Required
DATABASE_URL="mysql://user:password@localhost:3306/codelink_servicehub"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"
AUTH_SECRET="your-secret-key"
AUTH_TRUST_HOST=true
JWT_SECRET="your-jwt-secret"

# Optional - Cron & Notifications
CRON_SECRET="your-cron-secret"

# Email (SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email"
SMTP_PASSWORD="your-password"
SMTP_FROM_EMAIL="noreply@yourcompany.com"
SMTP_FROM_NAME="CodeLink ServiceHub"

# SMS (Twilio)
SMS_PROVIDER="twilio"
TWILIO_ACCOUNT_SID="your-account-sid"
TWILIO_AUTH_TOKEN="your-auth-token"
TWILIO_PHONE_NUMBER="+1234567890"
```

## Component Patterns

### Page Layout

```tsx
import { PageHeader } from "@/components/layout/page-header";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function MyPage() {
  return (
    <DashboardShell>
      <PageHeader title="Page Title" description="Description" />
      {/* Content */}
    </DashboardShell>
  );
}
```

### Form Pattern

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";

const schema = z.object({
  name: z.string().min(1, "Required"),
});

function MyForm() {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: "" },
  });

  const onSubmit = async (data: z.infer<typeof schema>) => {
    // Submit logic
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
```

## Key Imports

```typescript
// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

// Common Components
import { Loading } from "@/components/common/loading";
import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge } from "@/components/common/status-badge";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Pagination } from "@/components/common/pagination";

// Utilities
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";

// Icons (Lucide)
import { Plus, Edit, Trash2, Eye, Search, Filter } from "lucide-react";
```

## Conventions

1. **Multi-tenancy**: Always filter by `tenantId` in queries
2. **Permissions**: Check permissions before rendering UI elements and in API routes
3. **API responses**: Use `successResponse()` and `errorResponse()` helpers
4. **Validation**: Use Zod schemas for form and API validation
5. **Dates**: Use `date-fns` for formatting, store as DateTime in DB
6. **Notifications**: Use `sonner` toast for user feedback
7. **Loading states**: Use `Loading` component or Skeleton
8. **Empty states**: Use `EmptyState` component
9. **Transactions**: Use `prisma.$transaction()` for multi-step operations
10. **History tracking**: Create `ClaimHistory` entries for all claim state changes

## Current Modules Status

| Module | Status |
|--------|--------|
| Authentication | Complete |
| Users & Roles | Complete |
| Products & Categories | Complete |
| Inventory | Complete |
| Shops | Complete |
| Shop Verification/Approval | Complete |
| Customers | Complete |
| Warranty Cards | Complete |
| Claims | Complete |
| Workflows | Complete |
| Sub-tasks | Complete |
| Sequential Sub-Task Workflow | Complete |
| Step Assignments | Complete |
| Step Status Tracking | Complete |
| Dual View (Admin/Assignee) | Complete |
| Optional Next User Selection | Complete |
| Multi-Select User Assignment | Complete |
| Workflow Visualization | Complete |
| Process Step Dialog (with next step info) | Complete |
| Sub-task Blocking (Process Step) | Complete |
| Change Workflow Lock | Complete |
| Logistics (Individual) | Complete |
| Logistics (Trip-based) | Complete |
| Collector Dashboard | Complete |
| Pending Acceptance | Complete |
| Quotations | Complete |
| Invoices | Complete |
| Parts & Service Charges | Complete |
| Notifications (SMS/Email) | Complete |
| Settings | Placeholder |
| Reports | Not started |
