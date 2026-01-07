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
│   │   ├── customers/
│   │   ├── warranty-cards/
│   │   ├── claims/
│   │   │   ├── route.ts           # List/create claims
│   │   │   ├── [id]/route.ts      # Claim CRUD
│   │   │   ├── [id]/accept/route.ts        # Accept/reject claim
│   │   │   ├── [id]/update-pending/route.ts # Update pending claim
│   │   │   ├── [id]/quotation/route.ts     # Quotation management
│   │   │   ├── [id]/invoice/route.ts       # Invoice management
│   │   │   ├── [id]/parts/route.ts         # Claim parts
│   │   │   ├── pending-acceptance/route.ts # Grouped pending claims
│   │   │   └── bulk/route.ts      # Bulk operations
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
│   └── dashboard/                 # Dashboard widgets
├── lib/
│   ├── auth.ts                    # NextAuth configuration
│   ├── prisma.ts                  # Prisma client
│   ├── api-utils.ts               # API helper functions
│   ├── utils.ts                   # General utilities
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
| `Shop` | Dealers/shops |
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
| `WorkflowStep` | Individual steps with SLA definitions |
| `StepTransition` | Step connections with conditional logic |
| `StepNotification` | Notifications triggered on step events |

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
| `shops.view/create/edit/delete` | Shop management |
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
| `/api/claims/[id]` | GET/PUT/DELETE | Claim CRUD |
| `/api/claims/[id]/accept` | POST | Accept or reject pending claim |
| `/api/claims/[id]/update-pending` | PUT | Update pending claim details before acceptance |
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
| `/api/logistics/collection-trips` | GET/POST | List/create collection trips |
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
| `/api/workflows/[id]/execute` | POST | Execute workflow step transition |
| `/api/workflows/[id]/execute` | PATCH | Rollback to previous step |
| `/api/workflows/steps/[stepId]/eligible-users` | GET | Get users eligible for step assignment |

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
- **Auto-assignment**: Rule-based user assignment
- **Sub-tasks**: Checklist items within steps (must complete before step transition)
- **Notifications**: SMS/Email on ON_ENTER, ON_EXIT, escalation events
- **Rollback**: Return to previous steps (with permission check)

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
| Customers | Complete |
| Warranty Cards | Complete |
| Claims | Complete |
| Workflows | Complete |
| Sub-tasks | Complete |
| Step Assignments | Complete |
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
