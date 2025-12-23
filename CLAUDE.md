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
│   │   ├── workflows/             # Workflow templates
│   │   ├── logistics/             # Logistics (pickups, deliveries, trips)
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
│   │   ├── workflows/
│   │   ├── logistics/
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
│   ├── email-provider.ts          # Email service (SendGrid/SMTP)
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

## Database Models (Key Tables)

| Model | Description |
|-------|-------------|
| `Tenant` | Multi-tenant companies |
| `User` | User accounts per tenant |
| `Role` | Permission-based roles |
| `Product` / `ProductCategory` | Product catalog |
| `InventoryItem` / `InventoryCategory` | Parts/components inventory |
| `Shop` | Dealers/shops |
| `Customer` | End customers |
| `WarrantyCard` | Warranty registrations |
| `WarrantyClaim` | Service claims |
| `Workflow` / `WorkflowStep` | Claim processing workflows |
| `ClaimHistory` | Claim audit trail |
| `ClaimStepAssignment` | Per-claim user assignments |
| `ClaimSubTask` | Sub-tasks within workflow steps |
| `Collector` | Logistics personnel |
| `Pickup` / `Delivery` | Individual pickups/deliveries |
| `CollectionTrip` / `DeliveryTrip` | Trip-based logistics |
| `ClaimQuotation` / `ClaimInvoice` | Quotation & invoicing |
| `ClaimPart` / `ClaimServiceCharge` | Parts & service charges for claims |

### Key Enums

| Enum | Values | Description |
|------|--------|-------------|
| `ClaimAcceptanceStatus` | `PENDING`, `ACCEPTED`, `REJECTED` | Acceptance status for claims from collections |
| `PickupStatus` | `PENDING`, `ASSIGNED`, `IN_TRANSIT`, `COMPLETED`, `CANCELLED`, `REJECTED` | Pickup lifecycle |
| `DeliveryStatus` | `PENDING`, `ASSIGNED`, `IN_TRANSIT`, `COMPLETED`, `FAILED`, `CANCELLED` | Delivery lifecycle |
| `CollectionTripStatus` | `IN_PROGRESS`, `IN_TRANSIT`, `RECEIVED`, `CANCELLED` | Collection trip lifecycle |
| `DeliveryTripStatus` | `PENDING`, `ASSIGNED`, `IN_TRANSIT`, `COMPLETED`, `PARTIAL`, `CANCELLED` | Delivery trip lifecycle |

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
| `workflows.view/create/edit/delete` | Workflow management |
| `logistics.view/manage_pickups/manage_deliveries/manage_collectors` | Logistics |
| `logistics.my_trips/collect/deliver/receive/create_collection/create_delivery` | Logistics operations |

### Default Roles

- **Admin**: All permissions
- **Manager**: Most permissions except delete/admin
- **Technician**: View + process assigned claims
- **Receptionist**: Create warranty cards, customers, claims
- **Collector**: Logistics collection/delivery operations

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

## Key API Endpoints

### Claims
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/claims` | GET/POST | List/create claims |
| `/api/claims/[id]` | GET/PUT/DELETE | Claim CRUD |
| `/api/claims/[id]/accept` | POST | Accept or reject pending claim |
| `/api/claims/[id]/update-pending` | PUT | Update pending claim details |
| `/api/claims/pending-acceptance` | GET | Get pending claims grouped by collector/shop |
| `/api/claims/bulk` | POST/PUT | Bulk operations |

### Logistics
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/logistics/pickups` | GET/POST | List/create pickups |
| `/api/logistics/pickups/[id]` | GET/PUT/DELETE/PATCH | Pickup CRUD + status changes |
| `/api/logistics/pickups/[id]` (PATCH: start) | PATCH | Start pickup → creates/joins collection trip |
| `/api/logistics/collection-trips` | GET/POST | List/create collection trips |
| `/api/logistics/collection-trips/[id]/receive` | POST | Receive trip at service center, creates claims |
| `/api/logistics/delivery-trips` | GET/POST | List/create delivery trips |
| `/api/logistics/delivery-trips/[id]` | PATCH | Status transitions (dispatch, complete) |

### Workflows
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/workflows/[id]/execute` | POST | Execute workflow step |
| `/api/workflows/[id]/execute` | PATCH | Rollback step |
| `/api/workflows/steps/[stepId]/eligible-users` | GET | Get eligible users for step |

## Key Features

### 1. Workflow Engine

- Configurable workflow templates with steps
- Step types: START, ACTION, DECISION, NOTIFICATION, WAIT, END
- SLA tracking per step
- Auto-assignment rules
- Step notifications (SMS/Email)
- Sub-tasks within steps
- Per-claim step user assignments

### 2. Logistics System

**Individual Operations:**
- Pickups: PENDING → ASSIGNED → IN_TRANSIT → COMPLETED/REJECTED
- Deliveries: PENDING → ASSIGNED → IN_TRANSIT → COMPLETED/FAILED

**Trip-Based (Batch):**
- Collection Trips: Group multiple items from same shop/customer
- Delivery Trips: Batch completed claims to same destination
- Items tracked individually within trips

**Pickup → Collection → Claims Flow:**
```
Schedule Pickup → Collector sees in My Trips → Start Pickup (creates Collection Trip)
                                                      ↓
Collector collects items → Marks trip IN_TRANSIT → Service center receives
                                                      ↓
Claims created with PENDING acceptance → Staff reviews in "Pending Acceptance"
                                                      ↓
                                    ┌─────────────────┴─────────────────┐
                                    ↓                                   ↓
                              ACCEPT (with all fields)           REJECT (with reason)
                                    ↓                                   ↓
                           Workflow starts                    Return delivery scheduled
```

**Acceptance Workflow:**
- Claims from collections start with `acceptanceStatus: PENDING`
- Pending claims grouped by Collector → Shop for efficient review
- Required fields for acceptance: Product, Customer, Issue Description
- Staff can edit missing fields before accepting
- Rejected items go to return delivery queue

### 3. Inventory Management

- Parts/components catalog with categories
- Stock tracking (quantity, reserved, reorder levels)
- Transaction history
- Integration with claim parts & quotations

### 4. Quotation & Invoice System

- Create quotations for out-of-warranty repairs
- Convert approved quotations to invoices
- Track payments
- Warranty-covered vs chargeable items

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

## Environment Variables

```env
# Required
DATABASE_URL="mysql://user:password@localhost:3306/codelink_servicehub"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"
JWT_SECRET="your-jwt-secret"

# Optional - Cron & Notifications
CRON_SECRET="your-cron-secret"

# Email (SendGrid)
EMAIL_PROVIDER="sendgrid"
SENDGRID_API_KEY="your-api-key"
SENDGRID_FROM_EMAIL="noreply@yourcompany.com"
SENDGRID_FROM_NAME="CodeLink ServiceHub"

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
| Logistics (Basic) | Complete |
| Logistics (Trip-based) | Complete |
| Pending Review/Rejection | Complete |
| Pickup-Collection Integration | Complete |
| Claim Acceptance Workflow | Complete |
| Quotations | Complete |
| Invoices | Complete |
| Parts & Service Charges | Complete |
| Notifications | Complete |
| Settings | Placeholder |
| Reports | Not started |
