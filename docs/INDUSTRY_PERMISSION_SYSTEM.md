# Industry-Standard Permission & Dashboard System

## Overview

CodeLink ServiceHub uses a **Role-Based Access Control (RBAC)** system that follows industry best practices. This document explains how permissions, roles, and the dashboard work together.

---

## Core Concepts

### 1. User & Role Hierarchy

```
ADMIN (System Created - Full Access)
    └── Creates ROLES with specific permissions
        └── Creates USERS and assigns roles
            └── Users see dashboard based on their role permissions
```

### 2. How It Works

#### Step 1: Admin User (Default - Full Access)
- When system is set up, ONE admin user is created
- Admin has ALL permissions (from Admin role)
- Admin can do everything

#### Step 2: Admin Creates Roles
- Admin creates roles like: "Technician", "Receptionist", "Collector", "Manager"
- Each role has specific permissions selected by admin
- **Roles can have ZERO permissions** - user can only access dashboard
- Example:
  - **Technician Role**: `claims.view_assigned`, `claims.process`
  - **Collector Role**: `logistics.my_trips`, `logistics.collect`, `logistics.deliver`
  - **Receptionist Role**: `claims.view`, `claims.create`, `warranty_cards.create`
  - **Basic User Role**: No permissions (dashboard only)

#### Step 3: Admin Creates Users
- Admin creates users and assigns a ROLE to each user
- User gets permissions from their assigned role
- User sees dashboard sections based on their permissions

#### Step 4: Special Assignments (Collector, Technician)
- When admin selects a user as "Collector" in logistics:
  - This is just a **DATA LINK** (user ↔ collector record)
  - Does **NOT** change permissions
  - User must already have collector permissions from their role
- Same for assigning claims to technicians

---

## 3. Dashboard - ONE Dashboard for ALL Users

Every user sees the SAME dashboard page at `/dashboard`, but different SECTIONS appear based on permissions:

```
┌─────────────────────────────────────────────────────────────────┐
│ Dashboard                                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ WELCOME MESSAGE (always shown)                          │   │
│  │ - "Good morning, {userName}!"                           │   │
│  │ - Quick summary of user's role                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ MY PENDING TASKS (if has claims.view_assigned)          │   │
│  │ - Assigned claims waiting for action                     │   │
│  │ - Shows count, list, quick actions                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ MY COLLECTIONS (if has logistics.collect)               │   │
│  │ - Active collection trips assigned to me                 │   │
│  │ - In-transit trips                                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ MY DELIVERIES (if has logistics.deliver)                │   │
│  │ - Pending deliveries assigned to me                      │   │
│  │ - In-transit deliveries                                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ CLAIMS OVERVIEW (if has claims.view - manager level)    │   │
│  │ - Total claims, pending, urgent                          │   │
│  │ - Team performance                                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ WARRANTY STATS (if has warranty_cards.view)             │   │
│  │ - Active warranties, expiring this month                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ INVENTORY ALERTS (if has inventory.view)                │   │
│  │ - Low stock items, out of stock items                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ LOGISTICS OVERVIEW (if has logistics.manage_pickups)    │   │
│  │ - All pickups/deliveries status                          │   │
│  │ - Collector performance                                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Permission Categories

### View Permissions (What user can SEE)
| Permission | Description |
|------------|-------------|
| `claims.view` | Can see ALL claims (manager) |
| `claims.view_assigned` | Can see ONLY assigned claims (technician) |
| `logistics.my_trips` | Can see MY trips only (collector) |
| `warranty_cards.view` | Can see warranty cards |
| `inventory.view` | Can see inventory |
| `products.view` | Can see products |
| `customers.view` | Can see customers |
| `shops.view` | Can see shops |
| `users.view` | Can see users list |
| `roles.view` | Can see roles list |
| `workflows.view` | Can see workflows |

### Action Permissions (What user can DO)
| Permission | Description |
|------------|-------------|
| `claims.create` | Can create new claims |
| `claims.process` | Can process/update claims |
| `logistics.collect` | Can perform collections |
| `logistics.deliver` | Can perform deliveries |
| `logistics.manage_pickups` | Can manage ALL pickups (admin) |
| `logistics.manage_deliveries` | Can manage ALL deliveries (admin) |
| `logistics.manage_collectors` | Can manage collectors (admin) |
| `logistics.create_collection` | Can create collection trips (admin) |
| `warranty_cards.create` | Can create warranty cards |
| `customers.create` | Can create customers |
| `users.create` | Can create users |
| `users.edit` | Can edit users |
| `users.delete` | Can delete users |
| `roles.create` | Can create roles |
| `roles.edit` | Can edit roles |

---

## 5. User Flow Examples

### Example 1: Collector User
1. Admin creates role "Collector" with permissions:
   - `logistics.my_trips`
   - `logistics.collect`
   - `logistics.deliver`
   - `claims.view_assigned` (to see claim details for pickup)

2. Admin creates user "John" with role "Collector"

3. Admin goes to Logistics > Collectors, creates collector record and links to "John"

4. John logs in and sees:
   - Dashboard with "My Collections" and "My Deliveries" sections
   - Sidebar shows only: Dashboard, Logistics > My Trips
   - Can perform collections and deliveries assigned to him

### Example 2: Technician User
1. Admin creates role "Technician" with permissions:
   - `claims.view_assigned`
   - `claims.process`
   - `products.view`
   - `inventory.view`

2. Admin creates user "Mike" with role "Technician"

3. Admin assigns claims to Mike from claims management

4. Mike logs in and sees:
   - Dashboard with "My Pending Tasks" section showing assigned claims
   - Sidebar shows: Dashboard, My Tasks, Products, Inventory
   - Can process claims assigned to him

### Example 3: Receptionist User
1. Admin creates role "Receptionist" with permissions:
   - `claims.view`
   - `claims.create`
   - `customers.view`
   - `customers.create`
   - `warranty_cards.view`
   - `warranty_cards.create`

2. Receptionist logs in and sees:
   - Dashboard with "Claims Overview" and "Warranty Stats"
   - Quick actions: Create Claim, Create Customer, Create Warranty
   - Sidebar shows: Dashboard, Customers, Warranty Cards, Claims

### Example 4: Basic User (No Permissions)
1. Admin creates role "Basic" with NO permissions

2. User logs in and sees:
   - Dashboard with welcome message only
   - Sidebar shows only: Dashboard
   - Cannot access any other features

---

## 6. Implementation Status

### Completed ✅
- [x] Unified dashboard API (`/api/dashboard`)
- [x] Permission-based dashboard sections
- [x] Permission-based sidebar navigation
- [x] Roles can have zero permissions
- [x] Default login redirect to `/dashboard`
- [x] Collector record is just data link (no auto-permissions)
- [x] Dashboard sections show user's ASSIGNED items only
- [x] Suspended user session invalidation (within 5 minutes)
- [x] Users cannot delete their own accounts

### Key Principle
**Permissions come from ROLE only. Special assignments (collector, technician) are just data links for filtering.**

---

## 7. Database Relationships

```
User
  ├── roleId → Role (has permissions array)
  └── id ← Collector.userId (data link for logistics)
  └── id ← WarrantyClaim.assignedTo (data link for tasks)

Role
  ├── id (primary key)
  ├── name (string)
  ├── description (string, optional)
  ├── permissions (JSON array of permission strings)
  └── isSystem (boolean - system roles cannot be deleted)
```

---

## 8. Security Features

### Session Validation
- JWT tokens are validated periodically (every 5 minutes)
- If user status is changed to SUSPENDED or INACTIVE:
  - Session is invalidated on next request
  - User is redirected to login page
  - No manual logout required

### Self-Protection
- Users cannot delete their own account
- Delete button is disabled for current user
- Toast message explains why action is blocked

### Role Protection
- System roles (Admin, etc.) cannot be deleted
- Role name cannot be changed for system roles
- Permissions can still be updated for system roles

---

## 9. Sidebar Menu Permissions

The sidebar shows menu items based on user permissions:

| Menu Item | Required Permission |
|-----------|---------------------|
| Dashboard | Always visible |
| My Tasks | `claims.view_assigned` |
| Users | `users.view` |
| Roles | `roles.view` |
| Products | `products.view` |
| Inventory | `inventory.view` |
| Shops | `shops.view` |
| Customers | `customers.view` |
| Warranty Cards | `warranty_cards.view` |
| Claims | `claims.view` |
| Workflows | `workflows.view` |
| Logistics > Dashboard | `logistics.manage_pickups` |
| Logistics > My Trips | `logistics.my_trips` |
| Logistics > Collectors | `logistics.manage_collectors` |
| Logistics > Pickups | `logistics.manage_pickups` |
| Logistics > Deliveries | `logistics.manage_deliveries` |
| Settings | `settings.view` |

---

## 10. Quick Reference

### Creating a New Role
1. Go to Users & Roles > Roles
2. Click "Add Role"
3. Enter role name and description
4. Select permissions (can be zero)
5. Save

### Creating a User with Role
1. Go to Users & Roles > Users
2. Click "Add User"
3. Fill in user details
4. Select a role from dropdown
5. Save

### Linking User as Collector
1. Ensure user has collector permissions in their role
2. Go to Logistics > Collectors
3. Create new collector record
4. Select "Link to System User" and choose the user
5. Save

---

*Last Updated: December 2024*
