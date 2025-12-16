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
| [User Manual](USER_MANUAL.md) | Reference for all features | 30 min |

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
| **Dashboard** | Overview | Statistics, Recent Activity |
| **Users & Roles** | Team Management | User CRUD, Role Permissions |
| **Products** | Product Catalog | Categories, Products, Warranty Periods |
| **Shops** | Partner Network | Shop Registration, Contact Info |
| **Customers** | Customer Database | Customer Profiles, Contact Info |
| **Warranty Cards** | Warranty Registration | Product-Customer Linking |
| **Claims** | Service Requests | Claim Creation, Processing, Sub-Tasks, Step Assignments |
| **Workflows** | Process Automation | Steps, Transitions, Forms, User Mapping |
| **My Tasks** | Personal Inbox | Assigned Work, SLA Tracking, Sub-Tasks |
| **Logistics** | Collection & Delivery | Collection Trips, Delivery Trips, Collectors, Trip Tracking |

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

### Delivery Item Statuses

| Status | Description |
|--------|-------------|
| Pending | Awaiting delivery |
| Delivered | Successfully delivered |
| Failed | Delivery failed (can retry) |

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

---

## New Features (v1.2)

### Enhanced Logistics System

| Feature | Description |
|---------|-------------|
| **Collection Trips** | Batch collection from shops/customers with multiple items per trip |
| **Delivery Trips** | Batch delivery of completed claims grouped by destination |
| **Auto-Registration** | Auto-create warranty cards when receiving unregistered items |
| **Mobile-Friendly UI** | Responsive collector interface for on-the-go operations |
| **Delivery Retry** | Failed deliveries can be retried within the same trip |
| **Trip Tracking** | Full status tracking for collection and delivery trips |

#### New Pages

| Page | Path | Description |
|------|------|-------------|
| My Trips | `/logistics/my-trips` | Collector's active trips dashboard |
| New Collection | `/logistics/collect` | Start a new collection trip |
| Collection Detail | `/logistics/collect/[id]` | Manage items in collection |
| Receive Trip | `/logistics/receive/[id]` | Receive items at service center |
| Ready for Delivery | `/logistics/ready-for-delivery` | Claims ready to be delivered |
| Create Delivery | `/logistics/delivery-trips/new` | Create new delivery trip |
| Delivery Trips | `/logistics/delivery-trips` | All delivery trips list |
| Execute Delivery | `/logistics/deliver/[id]` | Mark items as delivered |

---

## New Features (v1.1)

### Claim Workflow Enhancements

| Feature | Description |
|---------|-------------|
| **Step Assignments** | Map specific users to workflow steps when creating claims |
| **Sub-Tasks** | Create and assign sub-tasks within workflow steps |
| **Next User Selection** | Select who handles the next step when completing a workflow step |
| **Sub-Task Gating** | Steps cannot complete until all sub-tasks are done |

For detailed documentation, see:
- [User Manual - Sub-Tasks](USER_MANUAL.md#86-sub-tasks)
- [User Manual - Step Assignments](USER_MANUAL.md#87-step-assignments)
- [Admin Guide - Workflow User Mapping](ADMIN_SETUP_GUIDE.md#56-workflow-user-mapping)

---

*CodeLink ServiceHub - Simplifying Warranty Management*
