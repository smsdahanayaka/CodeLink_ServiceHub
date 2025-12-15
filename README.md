# CodeLink ServiceHub

**SaaS Customer Support & Warranty Claim Management System**

A comprehensive platform for manufacturing and industrial equipment companies to manage warranty claims, customer support, and service operations.

## Features

- **Multi-Tenant Architecture** - Isolated data and configurations per company
- **Dynamic Workflow Engine** - Companies define their own warranty/service processes
- **End-to-End Tracking** - Complete visibility from sale to warranty resolution
- **Role-Based Access Control** - Customizable roles and permissions
- **Real-time Notifications** - SMS and in-app notifications at every stage

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

## Workflow Management Guide

### What is a Workflow?

A **Workflow** is a step-by-step process that defines how warranty claims move through your service center. It automates status changes, assigns tasks, and ensures consistent handling of every claim.

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

1. Go to the workflow detail page
2. Click **"Add Step"**
3. Configure each step:

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
- **START**: First step when claim enters workflow
- **ACTION**: A task that needs to be completed
- **DECISION**: A branching point with multiple paths
- **NOTIFICATION**: Sends alerts (email/SMS)
- **WAIT**: Pauses for a condition
- **END**: Final step, marks claim as complete

---

### 4. Example Workflow Structure

Here's a typical repair workflow:

```
┌─────────────────┐
│  1. Received    │ (START)
│  Status: new    │
└────────┬────────┘
         ↓
┌─────────────────┐
│  2. Inspection  │ (ACTION)
│  Status: inspecting │
│  SLA: 24 hours  │
└────────┬────────┘
         ↓
┌─────────────────┐
│  3. Repair      │ (ACTION)
│  Status: repairing │
│  SLA: 48 hours  │
└────────┬────────┘
         ↓
┌─────────────────┐
│  4. QC Check    │ (ACTION)
│  Status: quality_check │
│  SLA: 8 hours   │
└────────┬────────┘
         ↓
┌─────────────────┐
│  5. Completed   │ (END)
│  Status: completed │
└─────────────────┘
```

---

### 5. Processing Claims Through Workflow

When a claim is assigned to a workflow:

1. Go to **Claims** → Click on a claim
2. You'll see the **"Current Workflow Step"** card showing:
   - Current step name
   - Step status
   - Available next steps
   - Form fields to fill (if any)

3. Click **"Process Step"** to complete the current step
4. Fill in any required information
5. Select the next step (if multiple options)
6. Add notes (optional)
7. Click **"Complete Step"**

The claim automatically moves to the next step and updates its status.

---

### 6. Workflow on Claim Detail Page

When viewing a claim with an active workflow:

```
┌────────────────────────────────────────┐
│  Current Workflow Step                 │
│  ─────────────────────────────────────│
│  Step: Initial Inspection              │
│  Status: inspecting                    │
│  SLA: 24 hours                         │
│                                        │
│  Next Steps:                           │
│  → Repair in Progress                  │
│  → Return to Customer (if no repair)   │
│                                        │
│  [Process Step]  [Skip]                │
└────────────────────────────────────────┘
```

---

### 7. Tips for Effective Workflows

1. **Start Simple**: Begin with 4-5 steps, add complexity later
2. **Use Clear Status Names**: "inspecting", "repairing", "ready_for_pickup"
3. **Set Realistic SLAs**: Consider actual time needed for each step
4. **Make One Default**: Set your most common workflow as default
5. **Test First**: Create a test claim to verify workflow works correctly

---

### 8. Common Workflow Patterns

**Pattern A: Linear Flow**
```
Received → Inspect → Repair → QC → Complete
```

**Pattern B: With Decision**
```
Received → Inspect → [Under Warranty?]
                         ├─ Yes → Repair → Complete
                         └─ No → Quote to Customer → ...
```

**Pattern C: With Skip Option**
```
Received → Inspect (can skip) → Repair → Complete
```

---

### 9. Troubleshooting

| Issue | Solution |
|-------|----------|
| Can't see workflow on claim | Ensure workflow is Active and assigned |
| "Process Step" not working | Check you have required permissions |
| Claim stuck at a step | Check if there are form fields to fill |
| Wrong next step | Review step transitions configuration |

---

### Quick Start Checklist

- [ ] Create a workflow with a descriptive name
- [ ] Set trigger type (recommend: Auto on Claim)
- [ ] Mark as Default if it's your main process
- [ ] Add at least: START step, 1-2 ACTION steps, END step
- [ ] Set SLA hours for time-sensitive steps
- [ ] Activate the workflow
- [ ] Test with a new claim

Your workflow is now ready to automate claim processing!

---

## License

Proprietary - CodeLink

## Support

For support, contact support@codelink.com
