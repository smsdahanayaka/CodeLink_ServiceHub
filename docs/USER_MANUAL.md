# CodeLink ServiceHub - User Manual

## Welcome to CodeLink ServiceHub

CodeLink ServiceHub is a comprehensive warranty management and service tracking platform designed to help businesses manage their warranty claims, track repairs, and coordinate logistics efficiently.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Dashboard Overview](#2-dashboard-overview)
3. [User Management](#3-user-management)
4. [Product Management](#4-product-management)
5. [Shop Management](#5-shop-management)
6. [Customer Management](#6-customer-management)
7. [Warranty Cards](#7-warranty-cards)
8. [Warranty Claims](#8-warranty-claims)
9. [Workflows](#9-workflows)
10. [My Tasks](#10-my-tasks)
11. [Logistics](#11-logistics)
12. [Notifications](#12-notifications)
13. [Frequently Asked Questions](#13-frequently-asked-questions)

---

## 1. Getting Started

### 1.1 Logging In

1. Open your web browser and navigate to your ServiceHub URL
2. Enter your **Company Code** (provided during registration)
3. Enter your **Email Address**
4. Enter your **Password**
5. Click **Sign In**

![Login Screen](images/login.png)

### 1.2 First-Time Setup Checklist

After logging in for the first time, complete these steps in order:

| Step | Task | Priority |
|------|------|----------|
| 1 | Set up user roles and permissions | High |
| 2 | Add team members (users) | High |
| 3 | Create product categories | High |
| 4 | Add your products | High |
| 5 | Register your shops/dealers | High |
| 6 | Configure workflows | Medium |
| 7 | Set up notification templates | Medium |
| 8 | Add collectors (if using logistics) | Optional |

### 1.3 Navigation Overview

The sidebar menu provides access to all system modules:

- **Dashboard** - Overview and statistics
- **My Tasks** - Your assigned work items
- **Users & Roles** - Team management
- **Products** - Product catalog
- **Shops** - Dealer/shop management
- **Customers** - Customer database
- **Warranty Cards** - Warranty registrations
- **Claims** - Warranty claim management
- **Workflows** - Process automation
- **Logistics** - Pickup and delivery tracking
- **Settings** - System configuration

---

## 2. Dashboard Overview

The dashboard provides a quick overview of your business operations.

### 2.1 Statistics Cards

| Card | Description |
|------|-------------|
| Total Claims | Number of warranty claims in the system |
| Pending Claims | Claims waiting for action |
| In Progress | Claims currently being processed |
| Completed | Successfully resolved claims |

### 2.2 Recent Activity

View the latest actions taken in the system, including:
- New claims created
- Status changes
- Assignments
- Completions

---

## 3. User Management

### 3.1 Understanding Roles

Roles define what users can see and do in the system. Default roles include:

| Role | Description |
|------|-------------|
| **Admin** | Full access to all features |
| **Manager** | Manage claims, users, and reports |
| **Technician** | Process claims and repairs |
| **Receptionist** | Create claims and warranty cards |

### 3.2 Creating a New User

1. Go to **Users & Roles** → **Users**
2. Click **Add User** button
3. Fill in the required information:
   - First Name
   - Last Name
   - Email Address
   - Password
   - Phone Number (optional)
   - Select Role
   - Status (Active/Inactive)
4. Click **Create**

### 3.3 Creating a New Role

1. Go to **Users & Roles** → **Roles**
2. Click **Add Role** button
3. Enter Role Name and Description
4. Select Permissions:
   - **Users** - View, Create, Edit, Delete users
   - **Products** - Manage product catalog
   - **Claims** - Handle warranty claims
   - **Workflows** - Configure processes
   - **Logistics** - Manage pickups/deliveries
   - **Settings** - System configuration
5. Click **Create**

### 3.4 Permission Categories

| Category | Permissions |
|----------|-------------|
| Users | view, create, edit, delete |
| Roles | view, create, edit, delete |
| Products | view, create, edit, delete |
| Shops | view, create, edit, delete |
| Customers | view, create, edit, delete |
| Warranty Cards | view, create, edit, delete, void |
| Claims | view, create, edit, assign, process |
| Workflows | view, create, edit, delete |
| Logistics | view, manage_pickups, manage_deliveries, manage_collectors |
| Settings | view, edit |

---

## 4. Product Management

### 4.1 Product Categories

Organize your products into categories for easier management.

**Creating a Category:**
1. Go to **Products** → **Categories**
2. Click **Add Category**
3. Enter:
   - Category Name
   - Description (optional)
   - Parent Category (for sub-categories)
4. Click **Create**

### 4.2 Adding Products

1. Go to **Products**
2. Click **Add Product**
3. Fill in product details:
   - **Product Name** (required)
   - **Model Number**
   - **SKU**
   - **Category**
   - **Description**
   - **Warranty Period** (in months)
   - **Serial Number Prefix** (for auto-generation)
4. Click **Create**

### 4.3 Product Fields Explained

| Field | Description | Example |
|-------|-------------|---------|
| Name | Product display name | "Smart TV 55 inch" |
| Model Number | Manufacturer model | "TV-55-4K-2024" |
| SKU | Your internal code | "SKU-001234" |
| Warranty Period | Default warranty duration | 12 (months) |
| Serial Prefix | Prefix for serial numbers | "STV" |

---

## 5. Shop Management

Shops are your dealers, retailers, or service points.

### 5.1 Adding a Shop

1. Go to **Shops**
2. Click **Add Shop**
3. Enter shop information:
   - **Shop Name** (required)
   - **Shop Code** (unique identifier)
   - **Email**
   - **Phone**
   - **Address**
   - **City, State, Postal Code**
   - **Contact Person**
   - **GST Number** (if applicable)
   - **Status** (Active/Inactive)
4. Click **Create**

### 5.2 Shop Status

| Status | Description |
|--------|-------------|
| Active | Shop can create warranty cards and claims |
| Inactive | Shop is temporarily disabled |
| Suspended | Shop access is revoked |

---

## 6. Customer Management

### 6.1 Adding a Customer

1. Go to **Customers**
2. Click **Add Customer**
3. Enter customer details:
   - **Name** (required)
   - **Phone** (required)
   - **Email**
   - **Alternate Phone**
   - **Address**
   - **City, State, Postal Code**
   - **Associated Shop** (optional)
4. Click **Create**

### 6.2 Customer Lookup

Use the search bar to find customers by:
- Name
- Phone number
- Email

---

## 7. Warranty Cards

Warranty cards represent product warranties issued to customers.

### 7.1 Creating a Warranty Card

1. Go to **Warranty Cards**
2. Click **Add Warranty Card**
3. Fill in the details:
   - **Product** - Select from product list
   - **Shop** - Where the product was sold
   - **Customer** - Select existing or create new
   - **Serial Number** - Product serial number
   - **Purchase Date** - Date of purchase
   - **Invoice Number** (optional)
   - **Invoice Amount** (optional)
4. Click **Create**

### 7.2 Warranty Card Status

| Status | Description |
|--------|-------------|
| Active | Warranty is valid and can be claimed |
| Expired | Warranty period has ended |
| Void | Warranty has been cancelled |

### 7.3 Warranty Verification

To verify a warranty:
1. Go to **Warranty Cards** → **Verify**
2. Enter the serial number or warranty card number
3. Click **Verify**
4. View warranty status and remaining coverage

---

## 8. Warranty Claims

Claims are service requests for products under warranty.

### 8.1 Creating a Claim

1. Go to **Claims**
2. Click **New Claim**
3. Select the warranty card (search by serial number)
4. Fill in claim details:
   - **Issue Description** - Describe the problem
   - **Issue Category** - Type of issue
   - **Priority** - Low, Medium, High, Urgent
   - **Reported By** - Customer, Shop, or Internal
5. Click **Create Claim**

### 8.2 Claim Status Flow

```
NEW → PENDING_REVIEW → IN_PROGRESS → REPAIR → QUALITY_CHECK → COMPLETED
                    ↓
               REJECTED
```

### 8.3 Claim Priority Levels

| Priority | Description | Response Time |
|----------|-------------|---------------|
| Low | Minor issues | Standard SLA |
| Medium | Moderate issues | Normal priority |
| High | Significant problems | Expedited |
| Urgent | Critical failures | Immediate attention |

### 8.4 Processing a Claim

1. Open the claim from the list
2. Review claim details and history
3. Click on the current workflow step
4. Fill in any required form fields
5. Add notes if needed
6. Click **Complete Step** to advance

### 8.5 Claim Actions

| Action | Description |
|--------|-------------|
| Assign | Assign claim to a user |
| Process Step | Complete current workflow step |
| Add Note | Add internal notes |
| Schedule Pickup | Arrange product collection |
| Schedule Delivery | Arrange product return |
| Escalate | Raise to supervisor |

---

## 9. Workflows

Workflows define the process steps for handling claims.

### 9.1 Understanding Workflows

A workflow consists of:
- **Steps** - Individual stages in the process
- **Transitions** - Rules for moving between steps
- **Forms** - Data to collect at each step
- **Notifications** - Alerts sent at each stage

### 9.2 Default Workflow Steps

| Step | Description |
|------|-------------|
| Claim Received | Initial claim registration |
| Pending Review | Awaiting assessment |
| Under Repair | Repair in progress |
| Quality Check | Post-repair verification |
| Ready for Delivery | Repair complete |
| Completed | Claim closed |

### 9.3 Creating a Custom Workflow

1. Go to **Workflows**
2. Click **New Workflow**
3. Enter workflow name and description
4. Set trigger type:
   - **Manual** - Manually assigned
   - **Auto on Claim** - Automatically assigned to new claims
   - **Conditional** - Based on claim properties
5. Click **Create**

### 9.4 Adding Workflow Steps

1. Open the workflow
2. Click **Add Step**
3. Configure the step:
   - **Name** - Step identifier
   - **Status Name** - Display status
   - **Step Type** - Action, Decision, Notification, etc.
   - **Required Role** - Who can process this step
   - **SLA Hours** - Time limit for completion
   - **Form Fields** - Data to collect
4. Click **Save**

### 9.5 Step Types

| Type | Description |
|------|-------------|
| Start | Beginning of workflow |
| Action | Manual processing step |
| Decision | Branching based on conditions |
| Notification | Send alerts |
| Wait | Pause for external events |
| End | Workflow completion |

### 9.6 Form Field Types

| Type | Use Case |
|------|----------|
| Text | Short text input |
| Textarea | Long descriptions |
| Number | Numeric values |
| Select | Dropdown options |
| Multi-select | Multiple choices |
| Date | Date picker |
| File | Attachments |
| Checkbox | Yes/No options |

---

## 10. My Tasks

The My Tasks page shows all claims assigned to you.

### 10.1 Task List Features

- **Filter by status** - Pending, In Progress, etc.
- **Sort by priority** - Urgent items first
- **SLA indicators** - Warning/breach alerts
- **Quick actions** - Process directly from list

### 10.2 SLA Indicators

| Color | Status |
|-------|--------|
| Green | On track |
| Yellow | Warning (approaching deadline) |
| Red | Breached (overdue) |

### 10.3 Processing Tasks

1. Click on a task to open details
2. Review the current step requirements
3. Fill in required form fields
4. Add notes if needed
5. Click **Complete** to move to next step

---

## 11. Logistics

Manage product pickups and deliveries.

### 11.1 Logistics Dashboard

Overview of all logistics operations:
- Active collectors
- Pending pickups
- Pending deliveries
- Failed deliveries
- Collector workloads

### 11.2 Collectors

Collectors are personnel who handle pickups and deliveries.

**Adding a Collector:**
1. Go to **Logistics** → **Collectors**
2. Click **Add Collector**
3. Enter:
   - Name
   - Phone
   - Email
   - Vehicle Number
   - Vehicle Type
   - Assigned Areas
   - Status
4. Click **Create**

### 11.3 Pickups

Pickups collect products from shops or customers.

**Scheduling a Pickup:**
1. Go to **Logistics** → **Pickups**
2. Click **Schedule Pickup**
3. Select the claim
4. Choose pickup location (Shop/Customer)
5. Assign a collector (optional)
6. Set scheduled date and time slot
7. Add notes if needed
8. Click **Schedule Pickup**

**Pickup Status Flow:**
```
PENDING → ASSIGNED → IN_TRANSIT → COMPLETED
                              ↓
                          CANCELLED
```

**Managing Pickups:**
| Action | Description |
|--------|-------------|
| Assign Collector | Assign to a collector |
| Start Transit | Begin the pickup journey |
| Mark Complete | Confirm pickup received |
| Cancel | Cancel the pickup |

### 11.4 Deliveries

Deliveries return products to shops or customers.

**Scheduling a Delivery:**
1. Go to **Logistics** → **Deliveries**
2. Click **Schedule Delivery**
3. Select the claim
4. Choose delivery destination (Shop/Customer)
5. Assign a collector (optional)
6. Set scheduled date and time slot
7. Add notes if needed
8. Click **Schedule Delivery**

**Delivery Status Flow:**
```
PENDING → ASSIGNED → IN_TRANSIT → COMPLETED
                              ↓
                           FAILED → RETRY
                              ↓
                          CANCELLED
```

**Managing Deliveries:**
| Action | Description |
|--------|-------------|
| Assign Collector | Assign to a collector |
| Start Transit | Begin delivery journey |
| Mark Complete | Confirm delivery received |
| Mark Failed | Report delivery failure |
| Retry | Reschedule failed delivery |
| Cancel | Cancel the delivery |

### 11.5 Time Slots

Available delivery/pickup time slots:
- 09:00 - 12:00 (Morning)
- 12:00 - 15:00 (Afternoon)
- 15:00 - 18:00 (Evening)
- 18:00 - 21:00 (Night)

---

## 12. Notifications

### 12.1 Notification Types

| Type | Description |
|------|-------------|
| Email | Sent to email addresses |
| SMS | Sent to phone numbers |
| In-App | Shown in the system |

### 12.2 Notification Templates

Templates define the content of notifications.

**Template Variables:**
| Variable | Description |
|----------|-------------|
| `{{claimNumber}}` | Claim reference number |
| `{{customerName}}` | Customer's name |
| `{{productName}}` | Product name |
| `{{status}}` | Current claim status |
| `{{shopName}}` | Shop name |
| `{{serialNumber}}` | Product serial number |

### 12.3 When Notifications Are Sent

- Claim created
- Status changed
- Pickup scheduled
- Delivery scheduled
- SLA warning
- SLA breach
- Claim completed

---

## 13. Frequently Asked Questions

### General Questions

**Q: How do I reset my password?**
A: Click "Forgot Password" on the login page and follow the instructions sent to your email.

**Q: Can I access the system on mobile?**
A: Yes, the system is mobile-responsive and works on tablets and smartphones.

**Q: How do I change my notification preferences?**
A: Go to Settings → Notifications to configure your preferences.

### Claims Questions

**Q: How do I create a claim without a warranty card?**
A: First create the warranty card, then create the claim linked to it.

**Q: Can I edit a claim after creation?**
A: Yes, you can edit claim details if you have the appropriate permissions.

**Q: How do I assign a claim to another user?**
A: Open the claim, click "Assign", and select the user from the dropdown.

**Q: What happens when a claim SLA is breached?**
A: The claim is automatically escalated and notifications are sent to supervisors.

### Workflow Questions

**Q: Can I have multiple workflows?**
A: Yes, you can create multiple workflows for different scenarios.

**Q: How do I skip a workflow step?**
A: If the step is configured as optional, you'll see a "Skip" button.

**Q: Can I rollback to a previous step?**
A: Yes, managers can rollback claims to previous workflow steps.

### Logistics Questions

**Q: Can I assign multiple pickups to one collector?**
A: Yes, collectors can have multiple active pickups and deliveries.

**Q: What happens if a delivery fails?**
A: Mark it as "Failed" with a reason, then you can retry the delivery.

**Q: How do I track a pickup/delivery status?**
A: Go to Logistics → Pickups/Deliveries to see real-time status updates.

---

## Support

If you need additional help:

- **Email:** support@codelink.com
- **Phone:** +91-XXXX-XXXXXX
- **Documentation:** [Online Help Center]

---

## Quick Reference Card

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + /` | Open search |
| `Esc` | Close dialogs |

### Status Colors

| Color | Meaning |
|-------|---------|
| Green | Completed/Active |
| Blue | In Progress |
| Yellow | Pending/Warning |
| Red | Urgent/Failed |
| Gray | Inactive/Cancelled |

### Common Icons

| Icon | Meaning |
|------|---------|
| 📦 | Product |
| 🏪 | Shop |
| 👤 | Customer |
| 📋 | Claim |
| 🚚 | Logistics |
| ⚙️ | Settings |

---

*Last Updated: December 2024*
*Version: 1.0*
