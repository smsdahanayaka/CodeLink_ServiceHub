# CodeLink ServiceHub - Documentation

Welcome to the CodeLink ServiceHub documentation. Choose the guide that fits your needs.

---

## Documentation Index

### For New Users

| Document | Description | Time to Read |
|----------|-------------|--------------|
| [Quick Start Guide](QUICK_START_GUIDE.md) | Get started in 10 minutes | 10 min |
| [User Manual](USER_MANUAL.md) | Complete system documentation | 30 min |

### For Administrators

| Document | Description | Time to Read |
|----------|-------------|--------------|
| [Admin Setup Guide](ADMIN_SETUP_GUIDE.md) | Initial system configuration | 20 min |
| [Permission System Guide](INDUSTRY_PERMISSION_SYSTEM.md) | Role-based access control | 15 min |
| [User Manual](USER_MANUAL.md) | Reference for all features | 30 min |

### Technical Documentation

| Document | Description |
|----------|-------------|
| [Project Status](PROJECT_STATUS.md) | Current implementation state & changelog |
| [Phase 5 - Claim Finalization](PHASE5_CLAIM_FINALIZATION_INVOICE_SYSTEM.md) | Invoice system documentation |

---

## Quick Links

### Getting Started
- [How to Log In](USER_MANUAL.md#11-logging-in)
- [First-Time Setup Checklist](USER_MANUAL.md#12-first-time-setup-checklist)
- [Navigation Overview](USER_MANUAL.md#13-navigation-overview)

### Common Tasks
- [Creating a Claim](USER_MANUAL.md#81-creating-a-claim)
- [Processing a Claim](USER_MANUAL.md#84-processing-a-claim)
- [Scheduling a Pickup](USER_MANUAL.md#113-pickups)
- [Scheduling a Delivery](USER_MANUAL.md#114-deliveries)

### Setup Tasks
- [Adding Users](ADMIN_SETUP_GUIDE.md#23-adding-team-members)
- [Creating Roles](ADMIN_SETUP_GUIDE.md#22-creating-custom-roles)
- [Adding Products](ADMIN_SETUP_GUIDE.md#32-adding-products)
- [Configuring Workflows](ADMIN_SETUP_GUIDE.md#5-workflow-configuration)

---

## System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                    CodeLink ServiceHub                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│   │   Products  │  │    Shops    │  │  Customers  │             │
│   │   Catalog   │  │   Network   │  │  Database   │             │
│   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│          │                │                │                      │
│          └────────────────┼────────────────┘                      │
│                           │                                       │
│                           ▼                                       │
│                  ┌─────────────────┐                             │
│                  │  Warranty Cards │                             │
│                  └────────┬────────┘                             │
│                           │                                       │
│                           ▼                                       │
│                  ┌─────────────────┐                             │
│                  │ Warranty Claims │◄──── Workflows               │
│                  └────────┬────────┘                             │
│                           │                                       │
│              ┌────────────┼────────────┐                         │
│              ▼            ▼            ▼                         │
│        ┌──────────┐ ┌──────────┐ ┌──────────┐                   │
│        │  Pickup  │ │  Repair  │ │ Delivery │                   │
│        └──────────┘ └──────────┘ └──────────┘                   │
│                                                                   │
│        ◄─────────────── Logistics ──────────────►                │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Module Reference

| Module | Purpose | Key Features |
|--------|---------|--------------|
| **Dashboard** | Overview | Permission-based sections, User-specific data |
| **Users & Roles** | Team Management | User CRUD, Dynamic Role Permissions |
| **Products** | Product Catalog | Categories, Products, Warranty Periods |
| **Shops** | Partner Network | Shop Registration, Contact Info |
| **Customers** | Customer Database | Customer Profiles, Contact Info |
| **Warranty Cards** | Warranty Registration | Product-Customer Linking |
| **Claims** | Service Requests | Claim Creation, Processing, Sub-Tasks, Step Assignments |
| **Workflows** | Process Automation | Steps, Transitions, Forms, User Mapping |
| **My Tasks** | Personal Inbox | Assigned Work, SLA Tracking, Sub-Tasks |
| **Logistics** | Collection & Delivery | Collection Trips, Delivery Trips, Collectors, Trip Tracking |

---

## Permission System Overview

CodeLink ServiceHub uses a **Role-Based Access Control (RBAC)** system:

```
ADMIN (Full Access)
    └── Creates ROLES with specific permissions
        └── Creates USERS and assigns roles
            └── Users see dashboard/features based on permissions
```

### Key Principles:
1. **Permissions come from ROLES only** - Admin sets what each role can do
2. **One unified dashboard** - All users see the same dashboard, but sections appear based on permissions
3. **Data links are separate** - Collector/Technician assignments link users to work, but don't grant permissions
4. **Roles can have zero permissions** - Users can access only the dashboard

For detailed information, see [Industry Permission System](INDUSTRY_PERMISSION_SYSTEM.md).

---

## Workflow Status Reference

### Claim Statuses

| Status | Description | Next Actions |
|--------|-------------|--------------|
| New | Just created | Review, Assign |
| Pending Review | Awaiting assessment | Approve, Reject |
| In Progress | Being worked on | Update, Complete |
| Under Repair | Repair in progress | Complete repair |
| Quality Check | Post-repair testing | Pass, Fail |
| Ready for Delivery | Repair complete | Schedule delivery |
| Completed | Closed successfully | - |
| Rejected | Claim denied | - |

### Collection Trip Statuses

| Status | Description |
|--------|-------------|
| In Progress | Collector adding items |
| In Transit | On the way to service center |
| Received | Items received at service center |
| Cancelled | Trip cancelled |

### Delivery Trip Statuses

| Status | Description |
|--------|-------------|
| Pending | Created, awaiting assignment |
| Assigned | Collector assigned |
| In Transit | On the way to destination |
| Completed | All items delivered |
| Partial | Some items delivered, some failed |
| Cancelled | Trip cancelled |

---

## Support Contacts

| Type | Contact |
|------|---------|
| Technical Support | support@codelink.com |
| Sales Inquiries | sales@codelink.com |
| Training Requests | training@codelink.com |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2024 | Initial documentation |
| 1.1 | Dec 2024 | Added Claim Workflow Enhancements: Sub-Tasks, Step Assignments, Next User Selection |
| 1.2 | Dec 2024 | Added Enhanced Logistics System: Trip-Based Collection & Delivery |
| 1.3 | Dec 2024 | Added Phase 5: Claim Finalization & Invoice System |
| 1.4 | Dec 2024 | Industry-Standard Permission System, Unified Dashboard, Security Improvements |

---

## Latest Updates (v1.4)

### Permission System Overhaul
- Roles can now have zero permissions (dashboard-only access)
- Unified dashboard with permission-based sections
- Sidebar menus filtered by user permissions
- Removed auto-permission assignment for collectors

### Security Improvements
- Suspended users are automatically logged out within 5 minutes
- Periodic session validation in JWT callback
- Users cannot delete their own accounts

### Dashboard Changes
- Default login redirect changed to `/dashboard`
- All users see one unified dashboard
- Dashboard sections appear based on user permissions:
  - My Tasks (for users with `claims.view_assigned`)
  - My Collections (for users with `logistics.collect`)
  - My Deliveries (for users with `logistics.deliver`)
  - Claims Overview (for managers with `claims.view`)
  - Logistics Overview (for admins with `logistics.manage_*`)

---

*CodeLink ServiceHub - Simplifying Warranty Management*
