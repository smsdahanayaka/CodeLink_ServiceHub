# CodeLink ServiceHub - Project Plan
## SaaS Customer Support & Warranty Claim Management System

**Company:** CodeLink
**Product:** CodeLink_ServiceHub
**Version:** 1.0.0

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Database Design](#database-design)
5. [Module Breakdown](#module-breakdown)
6. [Workflow Engine Design](#workflow-engine-design)
7. [Multi-Tenant Architecture](#multi-tenant-architecture)
8. [API Design](#api-design)
9. [Security Considerations](#security-considerations)
10. [Development Phases](#development-phases)
11. [Folder Structure](#folder-structure)
12. [Deployment Strategy](#deployment-strategy)

---

## 1. Executive Summary

CodeLink ServiceHub is a SaaS-based warranty claim and customer support management platform designed for manufacturing and industrial equipment companies. The system provides a fully customizable workflow engine, multi-tenant architecture, and end-to-end product tracking with automated notifications.

### Key Value Propositions

- **Dynamic Workflow Engine**: Companies define their own warranty/service processes
- **Multi-Tenant SaaS**: Isolated data and configurations per company
- **End-to-End Tracking**: Complete visibility from sale to warranty resolution
- **Real-time Notifications**: SMS and in-app notifications at every stage
- **Role-Based Access**: Customizable roles and permissions per tenant

---

## 2. System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                      │
├─────────────────────────────────────────────────────────────────────────┤
│  Web Browser (Next.js)  │  Mobile Browser  │  Future: Mobile App        │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           LOAD BALANCER / CDN                            │
│                        (Cloudflare / Nginx)                              │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         APPLICATION LAYER                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                    Next.js Application                              │ │
│  ├────────────────────────────────────────────────────────────────────┤ │
│  │                                                                     │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐ │ │
│  │  │  Frontend (SSR) │  │  API Routes     │  │  Server Actions     │ │ │
│  │  │  React/Next.js  │  │  /api/*         │  │  Background Jobs    │ │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────┘ │ │
│  │                                                                     │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
┌─────────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐
│      MySQL          │  │     Redis       │  │    File Storage         │
│   (Primary DB)      │  │   (Caching &    │  │  (Local/S3 Compatible)  │
│                     │  │    Sessions)    │  │                         │
└─────────────────────┘  └─────────────────┘  └─────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │      External Services        │
                    ├───────────────────────────────┤
                    │  • SMS Gateway (Twilio/etc)   │
                    │  • Email Service (SMTP/SES)   │
                    │  • Payment Gateway (Future)   │
                    └───────────────────────────────┘
```

### Multi-Tenant Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        REQUEST FLOW                                      │
└─────────────────────────────────────────────────────────────────────────┘

  User Request                    Middleware                    Application
       │                              │                              │
       │   HTTP Request               │                              │
       │──────────────────────────────►                              │
       │                              │   Extract Tenant             │
       │                              │   (subdomain/header)         │
       │                              │──────────────────────────────►
       │                              │                              │
       │                              │   Validate Tenant            │
       │                              │◄──────────────────────────────
       │                              │                              │
       │                              │   Inject Tenant Context      │
       │                              │──────────────────────────────►
       │                              │                              │
       │                              │   Scoped Database Queries    │
       │   Response                   │   (WHERE tenant_id = ?)      │
       │◄──────────────────────────────────────────────────────────────
       │                              │                              │
```

---

## 3. Technology Stack

### Frontend
| Technology | Purpose | Version |
|------------|---------|---------|
| Next.js | React Framework (App Router) | 14.x |
| React | UI Library | 18.x |
| TypeScript | Type Safety | 5.x |
| Tailwind CSS | Styling | 3.x |
| shadcn/ui | UI Component Library | Latest |
| React Hook Form | Form Management | 7.x |
| Zod | Schema Validation | 3.x |
| TanStack Query | Server State Management | 5.x |
| Zustand | Client State Management | 4.x |
| React DnD | Drag & Drop (Workflow Builder) | 16.x |

### Backend
| Technology | Purpose | Version |
|------------|---------|---------|
| Next.js API Routes | REST API | 14.x |
| Prisma | ORM | 5.x |
| NextAuth.js | Authentication | 5.x (v5 Beta) |
| Node.js | Runtime | 20.x LTS |

### Database & Caching
| Technology | Purpose | Version |
|------------|---------|---------|
| MySQL | Primary Database | 8.x |
| Redis | Caching, Sessions, Job Queue | 7.x |

### DevOps & Infrastructure
| Technology | Purpose |
|------------|---------|
| Docker | Containerization |
| GitHub Actions | CI/CD |
| Nginx | Reverse Proxy |
| PM2 | Process Management |

### External Services
| Service | Purpose |
|---------|---------|
| Twilio / SMS Gateway | SMS Notifications |
| Nodemailer / AWS SES | Email Notifications |
| Cloudflare | CDN & DDoS Protection |

---

## 4. Database Design

### Entity Relationship Diagram (Core Entities)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         MULTI-TENANT CORE                                │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│     TENANTS      │       │      USERS       │       │      ROLES       │
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│ id (PK)          │       │ id (PK)          │       │ id (PK)          │
│ name             │◄──────│ tenant_id (FK)   │       │ tenant_id (FK)   │
│ subdomain        │       │ email            │       │ name             │
│ settings (JSON)  │       │ password_hash    │       │ permissions JSON │
│ plan_id (FK)     │       │ role_id (FK)     │───────│ is_system        │
│ status           │       │ status           │       │ created_at       │
│ created_at       │       │ created_at       │       └──────────────────┘
└──────────────────┘       └──────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                         BUSINESS ENTITIES                                │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│      SHOPS       │       │    CUSTOMERS     │       │    PRODUCTS      │
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│ id (PK)          │       │ id (PK)          │       │ id (PK)          │
│ tenant_id (FK)   │       │ tenant_id (FK)   │       │ tenant_id (FK)   │
│ name             │       │ name             │       │ name             │
│ address          │       │ phone            │       │ model_number     │
│ phone            │       │ email            │       │ serial_prefix    │
│ email            │       │ address          │       │ warranty_period  │
│ contact_person   │       │ shop_id (FK)     │       │ category_id (FK) │
│ status           │       │ created_at       │       │ specifications   │
│ created_at       │       └──────────────────┘       │ created_at       │
└──────────────────┘                                  └──────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                      WARRANTY & CLAIMS                                   │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│  WARRANTY_CARDS  │       │  WARRANTY_CLAIMS │       │  CLAIM_HISTORY   │
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│ id (PK)          │       │ id (PK)          │       │ id (PK)          │
│ tenant_id (FK)   │       │ tenant_id (FK)   │       │ claim_id (FK)    │
│ card_number      │◄──────│ warranty_id (FK) │───────│ from_status      │
│ product_id (FK)  │       │ claim_number     │       │ to_status        │
│ serial_number    │       │ issue_description│       │ workflow_step_id │
│ customer_id (FK) │       │ current_status   │       │ performed_by     │
│ shop_id (FK)     │       │ current_step_id  │       │ notes            │
│ purchase_date    │       │ priority         │       │ attachments JSON │
│ warranty_start   │       │ assigned_to      │       │ created_at       │
│ warranty_end     │       │ created_at       │       └──────────────────┘
│ status           │       │ updated_at       │
│ created_at       │       │ resolved_at      │
└──────────────────┘       └──────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                      WORKFLOW ENGINE                                     │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│    WORKFLOWS     │       │  WORKFLOW_STEPS  │       │ STEP_TRANSITIONS │
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│ id (PK)          │       │ id (PK)          │       │ id (PK)          │
│ tenant_id (FK)   │       │ workflow_id (FK) │       │ step_id (FK)     │
│ name             │───────│ name             │───────│ next_step_id(FK) │
│ description      │       │ description      │       │ condition JSON   │
│ trigger_type     │       │ step_order       │       │ action_type      │
│ is_active        │       │ step_type        │       │ created_at       │
│ created_at       │       │ config JSON      │       └──────────────────┘
└──────────────────┘       │ required_role_id │
                           │ sla_hours        │
                           │ notifications    │
                           │ created_at       │
                           └──────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                      LOGISTICS & TRACKING                                │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│   COLLECTORS     │       │    PICKUPS       │       │   DELIVERIES     │
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│ id (PK)          │       │ id (PK)          │       │ id (PK)          │
│ tenant_id (FK)   │       │ tenant_id (FK)   │       │ tenant_id (FK)   │
│ user_id (FK)     │       │ claim_id (FK)    │       │ claim_id (FK)    │
│ name             │───────│ collector_id(FK) │       │ collector_id(FK) │
│ phone            │       │ from_location    │       │ to_location      │
│ vehicle_number   │       │ to_location      │       │ from_location    │
│ assigned_area    │       │ scheduled_date   │       │ scheduled_date   │
│ status           │       │ status           │       │ status           │
│ created_at       │       │ picked_at        │       │ delivered_at     │
└──────────────────┘       │ notes            │       │ recipient_name   │
                           │ created_at       │       │ signature_url    │
                           └──────────────────┘       │ created_at       │
                                                      └──────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                      NOTIFICATIONS                                       │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│NOTIFICATION_TMPLS│       │  NOTIFICATIONS   │       │    SMS_LOGS      │
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│ id (PK)          │       │ id (PK)          │       │ id (PK)          │
│ tenant_id (FK)   │       │ tenant_id (FK)   │       │ tenant_id (FK)   │
│ name             │       │ user_id (FK)     │       │ phone_number     │
│ type (sms/email) │       │ type             │       │ message          │
│ subject          │       │ title            │       │ template_id (FK) │
│ body_template    │       │ message          │       │ status           │
│ variables JSON   │       │ link             │       │ provider_id      │
│ trigger_event    │       │ is_read          │       │ cost             │
│ is_active        │       │ created_at       │       │ sent_at          │
│ created_at       │       └──────────────────┘       │ created_at       │
└──────────────────┘                                  └──────────────────┘
```

### Complete Database Schema

```sql
-- =====================================================
-- MULTI-TENANT CORE TABLES
-- =====================================================

-- Subscription Plans (SaaS)
CREATE TABLE plans (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
    price_yearly DECIMAL(10,2) NOT NULL DEFAULT 0,
    max_users INT DEFAULT NULL,
    max_claims_per_month INT DEFAULT NULL,
    max_workflows INT DEFAULT NULL,
    max_sms_per_month INT DEFAULT NULL,
    features JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tenants (Companies)
CREATE TABLE tenants (
    id INT PRIMARY KEY AUTO_INCREMENT,
    uuid CHAR(36) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) UNIQUE NOT NULL,
    domain VARCHAR(255) DEFAULT NULL,
    logo_url VARCHAR(500),
    plan_id INT,
    settings JSON,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    address TEXT,
    status ENUM('active', 'suspended', 'cancelled', 'trial') DEFAULT 'trial',
    trial_ends_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES plans(id)
);

-- Roles (Per Tenant)
CREATE TABLE roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    permissions JSON NOT NULL,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    UNIQUE KEY unique_role_per_tenant (tenant_id, name)
);

-- Users
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    uuid CHAR(36) UNIQUE NOT NULL,
    tenant_id INT NOT NULL,
    role_id INT NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(50),
    avatar_url VARCHAR(500),
    email_verified_at TIMESTAMP NULL,
    last_login_at TIMESTAMP NULL,
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    preferences JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id),
    UNIQUE KEY unique_email_per_tenant (tenant_id, email)
);

-- User Sessions (for tracking)
CREATE TABLE user_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =====================================================
-- BUSINESS ENTITIES
-- =====================================================

-- Product Categories
CREATE TABLE product_categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id INT DEFAULT NULL,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES product_categories(id) ON DELETE SET NULL
);

-- Products
CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    category_id INT,
    name VARCHAR(255) NOT NULL,
    model_number VARCHAR(100),
    sku VARCHAR(100),
    description TEXT,
    specifications JSON,
    warranty_period_months INT DEFAULT 12,
    serial_number_prefix VARCHAR(50),
    image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE SET NULL
);

-- Shops/Dealers
CREATE TABLE shops (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    code VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'India',
    contact_person VARCHAR(255),
    contact_phone VARCHAR(50),
    gst_number VARCHAR(50),
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Customers
CREATE TABLE customers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    shop_id INT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50) NOT NULL,
    alternate_phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'India',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE SET NULL
);

-- =====================================================
-- WARRANTY MANAGEMENT
-- =====================================================

-- Warranty Cards
CREATE TABLE warranty_cards (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    card_number VARCHAR(100) NOT NULL,
    product_id INT NOT NULL,
    customer_id INT NOT NULL,
    shop_id INT NOT NULL,
    serial_number VARCHAR(100) NOT NULL,
    purchase_date DATE NOT NULL,
    warranty_start_date DATE NOT NULL,
    warranty_end_date DATE NOT NULL,
    invoice_number VARCHAR(100),
    invoice_amount DECIMAL(12,2),
    extended_warranty_months INT DEFAULT 0,
    status ENUM('active', 'expired', 'void', 'claimed') DEFAULT 'active',
    notes TEXT,
    attachments JSON,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (shop_id) REFERENCES shops(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    UNIQUE KEY unique_card_per_tenant (tenant_id, card_number),
    UNIQUE KEY unique_serial_per_tenant (tenant_id, serial_number)
);

-- Warranty Claims
CREATE TABLE warranty_claims (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    claim_number VARCHAR(100) NOT NULL,
    warranty_card_id INT NOT NULL,
    workflow_id INT,
    current_step_id INT,
    issue_description TEXT NOT NULL,
    issue_category VARCHAR(100),
    reported_by ENUM('customer', 'shop', 'internal') DEFAULT 'shop',
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    current_status VARCHAR(100) DEFAULT 'new',
    current_location ENUM('customer', 'shop', 'in_transit', 'service_center') DEFAULT 'shop',
    assigned_to INT,
    diagnosis TEXT,
    resolution TEXT,
    parts_used JSON,
    repair_cost DECIMAL(12,2) DEFAULT 0,
    is_warranty_void BOOLEAN DEFAULT FALSE,
    void_reason TEXT,
    received_at TIMESTAMP NULL,
    resolved_at TIMESTAMP NULL,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (warranty_card_id) REFERENCES warranty_cards(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    UNIQUE KEY unique_claim_per_tenant (tenant_id, claim_number)
);

-- Claim History/Audit Trail
CREATE TABLE claim_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    claim_id INT NOT NULL,
    workflow_step_id INT,
    from_status VARCHAR(100),
    to_status VARCHAR(100) NOT NULL,
    from_location VARCHAR(100),
    to_location VARCHAR(100),
    action_type VARCHAR(100) NOT NULL,
    performed_by INT NOT NULL,
    notes TEXT,
    attachments JSON,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (claim_id) REFERENCES warranty_claims(id) ON DELETE CASCADE,
    FOREIGN KEY (performed_by) REFERENCES users(id)
);

-- =====================================================
-- WORKFLOW ENGINE
-- =====================================================

-- Workflows (Process Templates)
CREATE TABLE workflows (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_type ENUM('manual', 'auto_on_claim', 'conditional') DEFAULT 'auto_on_claim',
    trigger_conditions JSON,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    version INT DEFAULT 1,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Workflow Steps
CREATE TABLE workflow_steps (
    id INT PRIMARY KEY AUTO_INCREMENT,
    workflow_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    step_order INT NOT NULL,
    step_type ENUM('start', 'action', 'decision', 'notification', 'wait', 'end') DEFAULT 'action',
    status_name VARCHAR(100) NOT NULL,
    config JSON,
    required_role_id INT,
    required_permissions JSON,
    sla_hours INT,
    sla_warning_hours INT,
    auto_assign_to INT,
    form_fields JSON,
    is_optional BOOLEAN DEFAULT FALSE,
    can_skip BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
    FOREIGN KEY (required_role_id) REFERENCES roles(id),
    FOREIGN KEY (auto_assign_to) REFERENCES users(id)
);

-- Step Transitions (Defines flow between steps)
CREATE TABLE step_transitions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    from_step_id INT NOT NULL,
    to_step_id INT NOT NULL,
    transition_name VARCHAR(100),
    condition_type ENUM('always', 'conditional', 'user_choice') DEFAULT 'always',
    conditions JSON,
    priority INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_step_id) REFERENCES workflow_steps(id) ON DELETE CASCADE,
    FOREIGN KEY (to_step_id) REFERENCES workflow_steps(id) ON DELETE CASCADE
);

-- Step Notifications (What notifications to send at each step)
CREATE TABLE step_notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    step_id INT NOT NULL,
    notification_template_id INT NOT NULL,
    trigger_event ENUM('on_enter', 'on_exit', 'on_sla_warning', 'on_sla_breach') DEFAULT 'on_enter',
    recipient_type ENUM('customer', 'shop', 'assigned_user', 'role', 'specific_user') NOT NULL,
    recipient_role_id INT,
    recipient_user_id INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (step_id) REFERENCES workflow_steps(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_role_id) REFERENCES roles(id),
    FOREIGN KEY (recipient_user_id) REFERENCES users(id)
);

-- =====================================================
-- LOGISTICS & TRACKING
-- =====================================================

-- Collectors (Logistics Personnel)
CREATE TABLE collectors (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    user_id INT,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    vehicle_number VARCHAR(50),
    vehicle_type VARCHAR(100),
    assigned_areas JSON,
    status ENUM('active', 'inactive', 'on_leave') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Pickups (Shop to Service Center)
CREATE TABLE pickups (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    claim_id INT NOT NULL,
    collector_id INT,
    pickup_number VARCHAR(100),
    from_type ENUM('shop', 'customer') DEFAULT 'shop',
    from_shop_id INT,
    from_address TEXT,
    to_location VARCHAR(255) DEFAULT 'Service Center',
    scheduled_date DATE,
    scheduled_time_slot VARCHAR(50),
    status ENUM('pending', 'assigned', 'in_transit', 'completed', 'cancelled') DEFAULT 'pending',
    picked_at TIMESTAMP NULL,
    received_at TIMESTAMP NULL,
    receiver_name VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (claim_id) REFERENCES warranty_claims(id),
    FOREIGN KEY (collector_id) REFERENCES collectors(id),
    FOREIGN KEY (from_shop_id) REFERENCES shops(id)
);

-- Deliveries (Service Center to Shop/Customer)
CREATE TABLE deliveries (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    claim_id INT NOT NULL,
    collector_id INT,
    delivery_number VARCHAR(100),
    from_location VARCHAR(255) DEFAULT 'Service Center',
    to_type ENUM('shop', 'customer') DEFAULT 'shop',
    to_shop_id INT,
    to_address TEXT,
    scheduled_date DATE,
    scheduled_time_slot VARCHAR(50),
    status ENUM('pending', 'assigned', 'in_transit', 'completed', 'cancelled', 'failed') DEFAULT 'pending',
    dispatched_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    recipient_name VARCHAR(255),
    signature_url VARCHAR(500),
    delivery_proof_url VARCHAR(500),
    failure_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (claim_id) REFERENCES warranty_claims(id),
    FOREIGN KEY (collector_id) REFERENCES collectors(id),
    FOREIGN KEY (to_shop_id) REFERENCES shops(id)
);

-- =====================================================
-- NOTIFICATIONS
-- =====================================================

-- Notification Templates
CREATE TABLE notification_templates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    type ENUM('sms', 'email', 'in_app', 'push') NOT NULL,
    subject VARCHAR(500),
    body_template TEXT NOT NULL,
    variables JSON,
    trigger_event VARCHAR(100),
    is_system BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- In-App Notifications
CREATE TABLE notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    user_id INT NOT NULL,
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(500),
    data JSON,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- SMS Logs
CREATE TABLE sms_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    template_id INT,
    phone_number VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    variables JSON,
    provider VARCHAR(100),
    provider_message_id VARCHAR(255),
    status ENUM('pending', 'sent', 'delivered', 'failed') DEFAULT 'pending',
    error_message TEXT,
    cost DECIMAL(8,4),
    sent_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES notification_templates(id)
);

-- Email Logs
CREATE TABLE email_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    template_id INT,
    to_email VARCHAR(255) NOT NULL,
    cc_emails JSON,
    subject VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    attachments JSON,
    provider VARCHAR(100),
    provider_message_id VARCHAR(255),
    status ENUM('pending', 'sent', 'delivered', 'bounced', 'failed') DEFAULT 'pending',
    error_message TEXT,
    opened_at TIMESTAMP NULL,
    sent_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES notification_templates(id)
);

-- =====================================================
-- SYSTEM & AUDIT
-- =====================================================

-- Audit Logs
CREATE TABLE audit_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id INT,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_audit_tenant_entity (tenant_id, entity_type, entity_id),
    INDEX idx_audit_created (created_at)
);

-- System Settings (Global)
CREATE TABLE system_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    key_name VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tenant Settings
CREATE TABLE tenant_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    key_name VARCHAR(100) NOT NULL,
    value TEXT,
    type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    UNIQUE KEY unique_setting_per_tenant (tenant_id, key_name)
);

-- File Uploads
CREATE TABLE file_uploads (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    uploaded_by INT,
    original_name VARCHAR(255) NOT NULL,
    stored_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(100),
    file_size INT,
    mime_type VARCHAR(100),
    entity_type VARCHAR(100),
    entity_id INT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_users_tenant_email ON users(tenant_id, email);
CREATE INDEX idx_users_tenant_status ON users(tenant_id, status);
CREATE INDEX idx_warranty_cards_tenant_status ON warranty_cards(tenant_id, status);
CREATE INDEX idx_warranty_cards_serial ON warranty_cards(tenant_id, serial_number);
CREATE INDEX idx_warranty_cards_customer ON warranty_cards(customer_id);
CREATE INDEX idx_warranty_claims_tenant_status ON warranty_claims(tenant_id, current_status);
CREATE INDEX idx_warranty_claims_warranty ON warranty_claims(warranty_card_id);
CREATE INDEX idx_warranty_claims_assigned ON warranty_claims(assigned_to);
CREATE INDEX idx_claim_history_claim ON claim_history(claim_id, created_at);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX idx_pickups_tenant_status ON pickups(tenant_id, status);
CREATE INDEX idx_deliveries_tenant_status ON deliveries(tenant_id, status);
CREATE INDEX idx_sms_logs_tenant_status ON sms_logs(tenant_id, status);
```

---

## 5. Module Breakdown

### Module Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         MODULE OVERVIEW                                  │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                        PLATFORM ADMIN MODULES                            │
│              (Super Admin - CodeLink Platform Management)                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐       │
│  │  Tenant Mgmt     │  │  Plan Mgmt       │  │  System Config   │       │
│  │  - Create/Edit   │  │  - Pricing       │  │  - SMS Providers │       │
│  │  - Suspend       │  │  - Features      │  │  - Email Config  │       │
│  │  - Analytics     │  │  - Limits        │  │  - Global Settings│      │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                        TENANT ADMIN MODULES                              │
│                    (Company Admin - Per Tenant)                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐       │
│  │  User Management │  │  Role & Permission│ │  Company Settings │      │
│  │  - CRUD Users    │  │  - Create Roles  │  │  - Branding      │       │
│  │  - Assign Roles  │  │  - Permissions   │  │  - Preferences   │       │
│  │  - Activity Log  │  │  - Access Control│  │  - Integrations  │       │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘       │
│                                                                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐       │
│  │  Workflow Builder│  │  Notification    │  │  Reports &       │       │
│  │  - Design Steps  │  │  Templates       │  │  Analytics       │       │
│  │  - Transitions   │  │  - SMS Templates │  │  - Dashboards    │       │
│  │  - Conditions    │  │  - Email Templates│ │  - Export        │       │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                        OPERATIONAL MODULES                               │
│                       (Day-to-Day Operations)                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐       │
│  │  Product Catalog │  │  Shop/Dealer     │  │  Customer        │       │
│  │  - Products      │  │  Management      │  │  Management      │       │
│  │  - Categories    │  │  - CRUD Shops    │  │  - CRUD Customers│       │
│  │  - Specifications│  │  - Assignments   │  │  - History       │       │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘       │
│                                                                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐       │
│  │  Warranty Cards  │  │  Warranty Claims │  │  Service Center  │       │
│  │  - Create Card   │  │  - Create Claim  │  │  - Job Queue     │       │
│  │  - Validate      │  │  - Process Steps │  │  - Technician    │       │
│  │  - Extend        │  │  - Track Status  │  │  Assignment      │       │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘       │
│                                                                          │
│  ┌──────────────────┐  ┌──────────────────┐                             │
│  │  Logistics       │  │  Notifications   │                             │
│  │  - Pickups       │  │  - In-App        │                             │
│  │  - Deliveries    │  │  - SMS Sending   │                             │
│  │  - Collectors    │  │  - Email Sending │                             │
│  └──────────────────┘  └──────────────────┘                             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Detailed Module Specifications

#### 1. Authentication & Authorization Module

**Features:**
- Multi-tenant login (subdomain-based)
- Email/Password authentication
- Password reset flow
- Remember me functionality
- Session management
- Two-factor authentication (Future)

**Permissions System:**
```typescript
const PERMISSIONS = {
  // Dashboard
  'dashboard.view': 'View Dashboard',

  // Users
  'users.view': 'View Users',
  'users.create': 'Create Users',
  'users.edit': 'Edit Users',
  'users.delete': 'Delete Users',

  // Roles
  'roles.view': 'View Roles',
  'roles.manage': 'Manage Roles',

  // Products
  'products.view': 'View Products',
  'products.create': 'Create Products',
  'products.edit': 'Edit Products',
  'products.delete': 'Delete Products',

  // Shops
  'shops.view': 'View Shops',
  'shops.create': 'Create Shops',
  'shops.edit': 'Edit Shops',
  'shops.delete': 'Delete Shops',

  // Customers
  'customers.view': 'View Customers',
  'customers.create': 'Create Customers',
  'customers.edit': 'Edit Customers',
  'customers.delete': 'Delete Customers',

  // Warranty Cards
  'warranty_cards.view': 'View Warranty Cards',
  'warranty_cards.create': 'Create Warranty Cards',
  'warranty_cards.edit': 'Edit Warranty Cards',
  'warranty_cards.void': 'Void Warranty Cards',

  // Claims
  'claims.view': 'View Claims',
  'claims.view_all': 'View All Claims',
  'claims.view_assigned': 'View Assigned Claims',
  'claims.create': 'Create Claims',
  'claims.process': 'Process Claims',
  'claims.assign': 'Assign Claims',
  'claims.close': 'Close Claims',

  // Workflows
  'workflows.view': 'View Workflows',
  'workflows.create': 'Create Workflows',
  'workflows.edit': 'Edit Workflows',
  'workflows.delete': 'Delete Workflows',

  // Logistics
  'logistics.view': 'View Logistics',
  'logistics.manage_pickups': 'Manage Pickups',
  'logistics.manage_deliveries': 'Manage Deliveries',
  'logistics.manage_collectors': 'Manage Collectors',

  // Notifications
  'notifications.view_templates': 'View Notification Templates',
  'notifications.manage_templates': 'Manage Notification Templates',
  'notifications.send': 'Send Notifications',

  // Reports
  'reports.view': 'View Reports',
  'reports.export': 'Export Reports',

  // Settings
  'settings.view': 'View Settings',
  'settings.manage': 'Manage Settings',
};
```

#### 2. Workflow Engine Module

**Core Concepts:**

```
Workflow
   │
   ├── Steps (ordered sequence)
   │      │
   │      ├── Step 1: "Receive Product" (start)
   │      │      ├── Status: "received"
   │      │      ├── Required Role: "receptionist"
   │      │      ├── Form Fields: [condition_notes, photos]
   │      │      └── Notifications: [sms_to_customer]
   │      │
   │      ├── Step 2: "Initial Inspection" (action)
   │      │      ├── Status: "inspecting"
   │      │      ├── Required Role: "technician"
   │      │      └── Form Fields: [diagnosis, estimated_cost]
   │      │
   │      ├── Step 3: "Approval Required?" (decision)
   │      │      ├── Condition: estimated_cost > 5000
   │      │      ├── Yes → Step 4 (Manager Approval)
   │      │      └── No → Step 5 (Repair)
   │      │
   │      ├── Step 4: "Manager Approval" (action)
   │      │      ├── Status: "pending_approval"
   │      │      └── Required Role: "manager"
   │      │
   │      ├── Step 5: "Repair" (action)
   │      │      ├── Status: "repairing"
   │      │      ├── Required Role: "technician"
   │      │      └── Form Fields: [work_done, parts_replaced]
   │      │
   │      ├── Step 6: "Quality Check" (action)
   │      │      ├── Status: "quality_check"
   │      │      └── Required Role: "qa_inspector"
   │      │
   │      └── Step 7: "Ready for Delivery" (end)
   │             ├── Status: "completed"
   │             └── Notifications: [sms_to_customer, sms_to_shop]
   │
   └── Transitions (connections between steps)
```

**Workflow Builder UI Features:**
- Drag-and-drop step creation
- Visual flow designer
- Conditional branching
- Step configuration panel
- Preview mode
- Version history

#### 3. Warranty Claim Processing Module

**Claim Lifecycle:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      CLAIM LIFECYCLE                                     │
└─────────────────────────────────────────────────────────────────────────┘

  Customer                Shop                 System              Company
     │                     │                     │                    │
     │  Reports Issue      │                     │                    │
     │────────────────────►│                     │                    │
     │                     │                     │                    │
     │                     │  Create Claim       │                    │
     │                     │────────────────────►│                    │
     │                     │                     │                    │
     │                     │                     │  Assign Workflow   │
     │◄────────────────────│◄────────────────────│                    │
     │  SMS: Claim Created │                     │                    │
     │                     │                     │                    │
     │                     │  Schedule Pickup    │                    │
     │                     │────────────────────►│                    │
     │                     │                     │                    │
     │                     │                     │  Pickup Scheduled  │
     │◄────────────────────│◄────────────────────│────────────────────►
     │  SMS: Pickup Date   │                     │                    │
     │                     │                     │                    │
     │                     │                     │  Collector Picks Up│
     │◄────────────────────│◄────────────────────│◄───────────────────│
     │  SMS: In Transit    │                     │                    │
     │                     │                     │                    │
     │                     │                     │  Processing Steps  │
     │◄────────────────────│◄────────────────────│◄───────────────────│
     │  SMS: Updates       │  Updates            │                    │
     │                     │                     │                    │
     │                     │                     │  Repair Complete   │
     │◄────────────────────│◄────────────────────│◄───────────────────│
     │  SMS: Ready         │  SMS: Ready         │                    │
     │                     │                     │                    │
     │                     │                     │  Delivery Scheduled│
     │◄────────────────────│◄────────────────────│◄───────────────────│
     │  SMS: Delivery Date │                     │                    │
     │                     │                     │                    │
     │  Receives Product   │  Receives Product   │  Claim Closed      │
     │◄────────────────────│◄────────────────────│◄───────────────────│
     │  SMS: Closed        │                     │                    │
```

---

## 6. Workflow Engine Design

### Workflow Engine Architecture

```typescript
// Core Workflow Types
interface Workflow {
  id: number;
  tenantId: number;
  name: string;
  description: string;
  triggerType: 'manual' | 'auto_on_claim' | 'conditional';
  triggerConditions?: WorkflowCondition[];
  isDefault: boolean;
  isActive: boolean;
  steps: WorkflowStep[];
}

interface WorkflowStep {
  id: number;
  workflowId: number;
  name: string;
  description: string;
  stepOrder: number;
  stepType: 'start' | 'action' | 'decision' | 'notification' | 'wait' | 'end';
  statusName: string;
  config: StepConfig;
  requiredRoleId?: number;
  requiredPermissions?: string[];
  slaHours?: number;
  slaWarningHours?: number;
  autoAssignTo?: number;
  formFields?: FormField[];
  isOptional: boolean;
  canSkip: boolean;
  notifications: StepNotification[];
  transitions: StepTransition[];
}

interface StepTransition {
  id: number;
  fromStepId: number;
  toStepId: number;
  transitionName: string;
  conditionType: 'always' | 'conditional' | 'user_choice';
  conditions?: WorkflowCondition[];
  priority: number;
}

interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'multi_select' | 'date' | 'file' | 'checkbox';
  required: boolean;
  options?: { label: string; value: string }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}
```

### Workflow Execution Engine

```typescript
class WorkflowEngine {
  async executeStep(claimId: number, stepId: number, data: any, userId: number) {
    // 1. Validate user permission for this step
    // 2. Validate required form fields
    // 3. Execute step actions
    // 4. Record history
    // 5. Determine next step(s)
    // 6. Send notifications
    // 7. Update claim status
  }

  async determineNextStep(currentStep: WorkflowStep, claimData: any): Promise<WorkflowStep | null> {
    const transitions = currentStep.transitions.sort((a, b) => a.priority - b.priority);

    for (const transition of transitions) {
      if (transition.conditionType === 'always') {
        return this.getStep(transition.toStepId);
      }

      if (transition.conditionType === 'conditional') {
        if (this.evaluateConditions(transition.conditions, claimData)) {
          return this.getStep(transition.toStepId);
        }
      }
    }

    return null;
  }

  evaluateConditions(conditions: WorkflowCondition[], data: any): boolean {
    // Evaluate all conditions with AND/OR logic
  }
}
```

---

## 7. Multi-Tenant Architecture

### Tenant Isolation Strategy

**Approach: Shared Database with Tenant ID**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     TENANT ISOLATION MODEL                               │
└─────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────────┐
                    │     Single Database     │
                    │        (MySQL)          │
                    └───────────┬─────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐       ┌───────────────┐       ┌───────────────┐
│   Tenant A    │       │   Tenant B    │       │   Tenant C    │
│   Data        │       │   Data        │       │   Data        │
│ tenant_id=1   │       │ tenant_id=2   │       │ tenant_id=3   │
└───────────────┘       └───────────────┘       └───────────────┘

Every query includes: WHERE tenant_id = ?
```

### Tenant Resolution

```typescript
// Middleware for tenant resolution
async function resolveTenant(req: NextRequest) {
  // Method 1: Subdomain
  // company1.servicehub.codelink.com → tenant_id = 1
  const hostname = req.headers.get('host');
  const subdomain = hostname?.split('.')[0];

  // Method 2: Custom Domain
  // warranty.company1.com → tenant_id = 1

  // Method 3: Header (for API)
  // X-Tenant-ID: 1

  const tenant = await prisma.tenant.findUnique({
    where: { subdomain }
  });

  if (!tenant || tenant.status !== 'active') {
    throw new Error('Invalid tenant');
  }

  return tenant;
}
```

### Data Access Layer with Tenant Scoping

```typescript
// Prisma middleware for automatic tenant scoping
prisma.$use(async (params, next) => {
  const tenantId = getCurrentTenantId();

  // Skip for system tables
  const systemTables = ['plans', 'system_settings'];
  if (systemTables.includes(params.model)) {
    return next(params);
  }

  // Add tenant filter for reads
  if (params.action === 'findUnique' || params.action === 'findFirst') {
    params.args.where = { ...params.args.where, tenantId };
  }

  if (params.action === 'findMany') {
    params.args.where = { ...params.args.where, tenantId };
  }

  // Add tenant for creates
  if (params.action === 'create') {
    params.args.data = { ...params.args.data, tenantId };
  }

  return next(params);
});
```

---

## 8. API Design

### API Structure

```
/api
├── /auth
│   ├── POST   /login
│   ├── POST   /logout
│   ├── POST   /forgot-password
│   ├── POST   /reset-password
│   └── GET    /me
│
├── /users
│   ├── GET    /                    # List users
│   ├── POST   /                    # Create user
│   ├── GET    /:id                 # Get user
│   ├── PUT    /:id                 # Update user
│   └── DELETE /:id                 # Delete user
│
├── /roles
│   ├── GET    /                    # List roles
│   ├── POST   /                    # Create role
│   ├── GET    /:id                 # Get role
│   ├── PUT    /:id                 # Update role
│   └── DELETE /:id                 # Delete role
│
├── /products
│   ├── GET    /                    # List products
│   ├── POST   /                    # Create product
│   ├── GET    /:id                 # Get product
│   ├── PUT    /:id                 # Update product
│   └── DELETE /:id                 # Delete product
│
├── /categories
│   ├── GET    /                    # List categories
│   ├── POST   /                    # Create category
│   ├── GET    /:id                 # Get category
│   ├── PUT    /:id                 # Update category
│   └── DELETE /:id                 # Delete category
│
├── /shops
│   ├── GET    /                    # List shops
│   ├── POST   /                    # Create shop
│   ├── GET    /:id                 # Get shop
│   ├── PUT    /:id                 # Update shop
│   └── DELETE /:id                 # Delete shop
│
├── /customers
│   ├── GET    /                    # List customers
│   ├── POST   /                    # Create customer
│   ├── GET    /:id                 # Get customer
│   ├── PUT    /:id                 # Update customer
│   └── DELETE /:id                 # Delete customer
│
├── /warranty-cards
│   ├── GET    /                    # List warranty cards
│   ├── POST   /                    # Create warranty card
│   ├── GET    /:id                 # Get warranty card
│   ├── PUT    /:id                 # Update warranty card
│   ├── POST   /:id/void            # Void warranty card
│   └── GET    /verify/:cardNumber  # Verify warranty
│
├── /claims
│   ├── GET    /                    # List claims
│   ├── POST   /                    # Create claim
│   ├── GET    /:id                 # Get claim details
│   ├── PUT    /:id                 # Update claim
│   ├── POST   /:id/process         # Process workflow step
│   ├── POST   /:id/assign          # Assign claim
│   ├── GET    /:id/history         # Get claim history
│   └── GET    /:id/timeline        # Get claim timeline
│
├── /workflows
│   ├── GET    /                    # List workflows
│   ├── POST   /                    # Create workflow
│   ├── GET    /:id                 # Get workflow
│   ├── PUT    /:id                 # Update workflow
│   ├── DELETE /:id                 # Delete workflow
│   ├── POST   /:id/duplicate       # Duplicate workflow
│   └── PUT    /:id/activate        # Activate/deactivate
│
├── /logistics
│   ├── /pickups
│   │   ├── GET    /                # List pickups
│   │   ├── POST   /                # Schedule pickup
│   │   ├── PUT    /:id             # Update pickup
│   │   └── POST   /:id/complete    # Complete pickup
│   │
│   ├── /deliveries
│   │   ├── GET    /                # List deliveries
│   │   ├── POST   /                # Schedule delivery
│   │   ├── PUT    /:id             # Update delivery
│   │   └── POST   /:id/complete    # Complete delivery
│   │
│   └── /collectors
│       ├── GET    /                # List collectors
│       ├── POST   /                # Create collector
│       ├── PUT    /:id             # Update collector
│       └── DELETE /:id             # Delete collector
│
├── /notifications
│   ├── GET    /                    # List user notifications
│   ├── PUT    /:id/read            # Mark as read
│   ├── PUT    /read-all            # Mark all as read
│   │
│   └── /templates
│       ├── GET    /                # List templates
│       ├── POST   /                # Create template
│       ├── PUT    /:id             # Update template
│       └── DELETE /:id             # Delete template
│
├── /reports
│   ├── GET    /dashboard           # Dashboard stats
│   ├── GET    /claims              # Claims report
│   ├── GET    /warranty            # Warranty report
│   ├── GET    /sla                 # SLA report
│   └── POST   /export              # Export report
│
└── /settings
    ├── GET    /                    # Get settings
    ├── PUT    /                    # Update settings
    └── PUT    /branding            # Update branding
```

### API Response Format

```typescript
// Success Response
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}

// Error Response
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

---

## 9. Security Considerations

### Authentication & Authorization

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      SECURITY LAYERS                                     │
└─────────────────────────────────────────────────────────────────────────┘

    Request → Rate Limiting → CORS → Auth → Tenant → Permission → Handler
                 │              │      │       │          │
                 ▼              ▼      ▼       ▼          ▼
            Block abuse    Validate  JWT    Resolve   Check role
                          origins   verify  tenant    permissions
```

### Security Checklist

- [ ] **Authentication**
  - JWT tokens with short expiry (15 min access, 7 day refresh)
  - Secure password hashing (bcrypt)
  - Rate limiting on login attempts
  - Account lockout after failed attempts

- [ ] **Authorization**
  - Role-based access control (RBAC)
  - Permission checks on every API endpoint
  - Tenant isolation at database level
  - Resource ownership validation

- [ ] **Data Protection**
  - HTTPS everywhere
  - Input validation and sanitization
  - SQL injection prevention (Prisma ORM)
  - XSS protection (React escaping)
  - CSRF protection

- [ ] **Infrastructure**
  - Environment variable management
  - Secrets management
  - Database encryption at rest
  - Regular security audits
  - Audit logging

---

## 10. Development Phases

### Phase 1: Foundation (MVP) ✅ COMPLETED
**Duration: Core Setup**

**Goals:**
- Project setup and architecture
- Authentication system
- Basic tenant management
- Core entity CRUD operations

**Deliverables:**
1. ✅ Next.js project setup with TypeScript
2. ✅ Database schema and Prisma setup
3. ✅ Authentication (login, logout, password reset)
4. ✅ User management
5. ✅ Role and permission system (basic)
6. ✅ Product management
7. ✅ Shop management
8. ✅ Customer management
9. ✅ Basic UI layout and navigation

**Screens:**
- ✅ Login / Forgot Password
- ✅ Dashboard (placeholder)
- ✅ User List / Create / Edit
- ✅ Role List / Create / Edit
- ✅ Product List / Create / Edit
- ✅ Shop List / Create / Edit (API only)
- ✅ Customer List / Create / Edit (API only)

---

### Phase 2: Warranty Core ✅ COMPLETED
**Duration: Warranty Management**

**Goals:**
- Complete warranty card management
- Basic claim management
- Claim history tracking

**Deliverables:**
1. ✅ Warranty card creation and management
2. ✅ Warranty verification
3. ✅ Basic claim creation
4. ✅ Claim status tracking
5. ✅ Claim history/audit trail
6. ✅ Basic search and filters

**Screens:**
- ✅ Warranty Card List / Create / Edit / View (`/warranty/*`)
- ✅ Warranty Verification Page (`/warranty/verify`)
- ✅ Claim List / Create / View (`/claims/*`)
- ✅ Claim Detail with History Timeline (`/claims/[id]`)

**Implementation Details:**

**API Routes Created:**
- `GET/POST /api/warranty-cards` - List and create warranty cards
- `GET/PUT/DELETE /api/warranty-cards/[id]` - CRUD for individual cards
- `POST /api/warranty-cards/verify` - Verify warranty by card/serial/phone
- `GET/POST /api/claims` - List and create claims
- `GET/PUT /api/claims/[id]` - Get and update claims
- `POST /api/claims/[id]/status` - Update claim status with history
- `POST /api/claims/[id]/assign` - Assign claims to users
- `GET/POST /api/claims/[id]/history` - View/add claim history notes

**Key Features:**
- Auto-generated warranty card numbers (WC + YYMM + sequence)
- Auto-generated claim numbers (CLM + YYMM + sequence)
- Warranty status calculation (Active/Expiring Soon/Expired/Void)
- Claim status workflow tracking
- Full audit trail with user attribution
- Search by card number, serial number, or customer phone
- **Customer is OPTIONAL** - Shops/dealers are the primary contact point
- Inline customer creation during warranty registration (name + phone required, email optional)

**Technical Decisions:**
- **Primary Keys**: All tables use auto-increment integer IDs as primary keys
- **Session Management**: User ID stored as integer in JWT session (no UUID lookup required)
- **Customer Relationship**: Warranty cards can be created without a customer (customerId is nullable)
- **Shop-First Model**: Business operates through shops/dealers who interact with customers

--- 

### Phase 3: Workflow Engine
**Duration: Dynamic Workflows**

**Goals:**
- Build visual workflow designer
- Workflow execution engine
- Step-by-step claim processing

**Deliverables:**
1. Workflow CRUD operations
2. Visual workflow builder (drag-and-drop)
3. Step configuration
4. Transition conditions
5. Workflow execution engine
6. Claim processing based on workflow
7. SLA tracking

**Screens:**
- Workflow List
- Workflow Builder (Visual Designer)
- Claim Processing Interface

---

### Phase 4: Notifications
**Duration: Communication System**

**Goals:**
- In-app notifications
- SMS integration
- Email integration
- Notification templates

**Deliverables:**
1. Notification template management
2. In-app notification system
3. SMS gateway integration
4. Email sending
5. Notification preferences
6. SMS/Email logs

**Screens:**
- Notification Template List / Create / Edit
- Notification Center
- SMS Logs
- Email Logs

---

### Phase 5: Logistics
**Duration: Pickup & Delivery**

**Goals:**
- Complete logistics module
- Collector management
- Pickup/delivery scheduling

**Deliverables:**
1. Collector management
2. Pickup scheduling and tracking
3. Delivery scheduling and tracking
4. Route assignment
5. Proof of delivery
6. Integration with claim workflow

**Screens:**
- Collector List / Create / Edit
- Pickup List / Schedule / Track
- Delivery List / Schedule / Track
- Logistics Dashboard

---

### Phase 6: Reports & Analytics
**Duration: Business Intelligence**

**Goals:**
- Comprehensive reporting
- Analytics dashboards
- Export functionality

**Deliverables:**
1. Dashboard with KPIs
2. Claim reports
3. Warranty reports
4. SLA compliance reports
5. User activity reports
6. Export to Excel/PDF
7. Scheduled reports (Future)

**Screens:**
- Analytics Dashboard
- Report Builder
- Report Viewer
- Export Interface

---

### Phase 7: Polish & Optimization
**Duration: Production Ready**

**Goals:**
- Performance optimization
- UI/UX refinement
- Testing
- Documentation

**Deliverables:**
1. Performance optimization
2. Caching implementation
3. UI/UX improvements
4. Comprehensive testing
5. User documentation
6. Admin documentation
7. API documentation

---

### Phase 8: SaaS Features
**Duration: Platform Features**

**Goals:**
- Multi-tenant onboarding
- Subscription management
- Platform admin panel

**Deliverables:**
1. Tenant registration flow
2. Subscription plans
3. Payment integration (Future)
4. Platform admin dashboard
5. Tenant analytics
6. Usage monitoring
7. Billing (Future)

**Screens:**
- Registration / Onboarding
- Subscription Management
- Platform Admin Dashboard
- Tenant Management (Super Admin)

---

### Phase 9: Dashboard, Analytics & User Settings (FINAL PHASE)
**Duration: Industry-Level Polish**

**Goals:**
- Complete analytics dashboard with KPIs and charts
- Comprehensive settings management
- User profile and preferences
- Industry-standard design and UX

---

#### 9.1 Main Dashboard

**Overview:**
The main dashboard is the first screen users see after login. It provides a comprehensive overview of the business with real-time KPIs, charts, and quick actions.

**Dashboard Layout:**
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  HEADER: Welcome back, {User Name}!                    [Quick Actions] [Profile]│
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  TOTAL      │  │  ACTIVE     │  │  PENDING    │  │  RESOLVED   │             │
│  │  WARRANTY   │  │  CLAIMS     │  │  CLAIMS     │  │  THIS MONTH │             │
│  │  CARDS      │  │             │  │             │  │             │             │
│  │   1,234     │  │     45      │  │     12      │  │     89      │             │
│  │  +12% ↑     │  │  +5% ↑      │  │  -8% ↓      │  │  +15% ↑     │             │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                                  │
│  ┌────────────────────────────────────┐  ┌────────────────────────────────────┐ │
│  │  CLAIMS OVERVIEW (Line/Area Chart) │  │  WARRANTY STATUS (Donut Chart)    │ │
│  │                                    │  │                                    │ │
│  │  ████████████████████████████████  │  │       ████████                     │ │
│  │  █    Claims Trend (30 days)    █  │  │     ██        ██                   │ │
│  │  █                              █  │  │   ██  Active    ██                 │ │
│  │  █    ▲                         █  │  │  █   78%         █                 │ │
│  │  █   ▲ ▲    ▲                   █  │  │   ██           ██                  │ │
│  │  █  ▲   ▲  ▲ ▲  ▲               █  │  │     ██       ██                    │ │
│  │  █▲      ▲▲   ▲▲ ▲▲▲            █  │  │       ████████                     │ │
│  │  ████████████████████████████████  │  │  ■ Active  ■ Expired  ■ Claimed   │ │
│  └────────────────────────────────────┘  └────────────────────────────────────┘ │
│                                                                                  │
│  ┌────────────────────────────────────┐  ┌────────────────────────────────────┐ │
│  │  TOP PRODUCTS BY CLAIMS (Bar)     │  │  CLAIMS BY STATUS (Bar)            │ │
│  │                                    │  │                                    │ │
│  │  Product A  ████████████  45      │  │  New       ████████████████  32    │ │
│  │  Product B  ████████      28      │  │  In Progress ████████████  24      │ │
│  │  Product C  ██████        21      │  │  Pending   ████████        18      │ │
│  │  Product D  ████          15      │  │  Resolved  ██████████████████  45  │ │
│  │  Product E  ███           12      │  │  Closed    ████████████████████ 52 │ │
│  └────────────────────────────────────┘  └────────────────────────────────────┘ │
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │  RECENT ACTIVITY                                                           │ │
│  │  ─────────────────────────────────────────────────────────────────────────│ │
│  │  🔔 New claim #CLM2412001 created for Product X          2 minutes ago    │ │
│  │  ✅ Claim #CLM2412000 resolved by John Doe               15 minutes ago   │ │
│  │  📝 Warranty card WC2412001 registered                   1 hour ago       │ │
│  │  🔄 Claim #CLM2411999 status changed to "In Progress"    2 hours ago      │ │
│  │  👤 New customer "ABC Electronics" added                 3 hours ago      │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────────┐   │
│  │  EXPIRING WARRANTIES (7 days)   │  │  OVERDUE CLAIMS                     │   │
│  │  ───────────────────────────────│  │  ─────────────────────────────────  │   │
│  │  WC2401001 - ABC Corp   Dec 20  │  │  CLM2411001 - 5 days overdue        │   │
│  │  WC2401002 - XYZ Ltd    Dec 21  │  │  CLM2411002 - 3 days overdue        │   │
│  │  WC2401003 - DEF Inc    Dec 22  │  │  CLM2411003 - 2 days overdue        │   │
│  │  [View All →]                   │  │  [View All →]                       │   │
│  └─────────────────────────────────┘  └─────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**KPI Cards:**
1. **Total Warranty Cards** - Total active warranty cards with trend percentage
2. **Active Claims** - Currently open claims requiring attention
3. **Pending Claims** - Claims awaiting action/parts/approval
4. **Resolved This Month** - Claims resolved in current month with comparison

**Charts Required:**
| Chart | Type | Data | Purpose |
|-------|------|------|---------|
| Claims Trend | Line/Area | Daily claims (30 days) | Track claim volume over time |
| Warranty Status | Donut/Pie | Active/Expired/Claimed/Void | Warranty health overview |
| Top Products by Claims | Horizontal Bar | Top 5-10 products | Identify problematic products |
| Claims by Status | Horizontal Bar | All statuses | Workflow bottleneck analysis |
| Claims by Priority | Stacked Bar | Low/Medium/High/Critical | Priority distribution |
| Monthly Comparison | Grouped Bar | This month vs last month | Month-over-month comparison |
| Shop Performance | Bar | Claims per shop | Dealer/shop analysis |
| Resolution Time | Line | Avg resolution time (30 days) | SLA monitoring |

**Quick Actions Panel:**
- Register New Warranty
- Create New Claim
- Verify Warranty
- View Reports

**Recent Activity Feed:**
- Real-time activity log showing last 10-20 actions
- Filter by activity type
- Click to navigate to relevant item

**Alert Sections:**
- Expiring Warranties (next 7/30 days)
- Overdue Claims (past SLA)
- Unassigned Claims
- Low Stock Parts (future)

---

#### 9.2 Analytics & Reports

**Analytics Dashboard Features:**

**Date Range Selector:**
- Today, Yesterday, Last 7 days, Last 30 days, This Month, Last Month, This Quarter, This Year, Custom Range

**Filter Options:**
- By Product/Category
- By Shop/Dealer
- By User/Assignee
- By Status
- By Priority

**Report Types:**

| Report | Description | Charts/Visualizations |
|--------|-------------|----------------------|
| **Claims Summary** | Overview of all claims | Status breakdown, trend line, priority pie |
| **Warranty Report** | Warranty card analytics | Registration trend, expiry forecast, status distribution |
| **Product Analysis** | Product-wise claims | Top failing products, failure rate %, claim cost per product |
| **Shop Performance** | Dealer/shop metrics | Claims by shop, registration by shop, shop ranking |
| **User Productivity** | Staff performance | Claims handled, avg resolution time, workload distribution |
| **SLA Compliance** | Service level tracking | On-time %, overdue claims, avg resolution time |
| **Financial Summary** | Cost analysis | Total claim cost, avg cost per claim, cost by category |
| **Customer Insights** | Customer analytics | Repeat customers, customer satisfaction (future) |

**Export Options:**
- Export to Excel (.xlsx)
- Export to PDF
- Export to CSV
- Print-friendly view
- Schedule automated reports (email)

**Visualization Library:**
Use Recharts or Chart.js for:
- Line Charts (trends)
- Bar Charts (comparisons)
- Pie/Donut Charts (distributions)
- Area Charts (volume over time)
- Stacked Bar Charts (multi-category)
- Heat Maps (time-based patterns)

---

#### 9.3 Settings Module

**Settings Structure:**
```
Settings
├── Company Settings
│   ├── Company Profile
│   ├── Business Hours
│   ├── Logo & Branding
│   └── Contact Information
│
├── Warranty Settings
│   ├── Default Warranty Period
│   ├── Card Number Format
│   ├── Auto-Expiry Settings
│   └── Warranty Terms Template
│
├── Claim Settings
│   ├── Claim Number Format
│   ├── Default Priority
│   ├── SLA Configuration
│   ├── Auto-Assignment Rules
│   └── Claim Categories/Types
│
├── Notification Settings
│   ├── Email Templates
│   ├── SMS Templates
│   ├── Notification Triggers
│   └── Alert Preferences
│
├── User Management
│   ├── Roles & Permissions
│   ├── User Defaults
│   └── Session Settings
│
├── Integration Settings (Future)
│   ├── SMS Gateway Config
│   ├── Email SMTP Config
│   ├── API Keys
│   └── Webhooks
│
└── System Settings
    ├── Date/Time Format
    ├── Currency
    ├── Language (Future)
    ├── Timezone
    └── Data Export/Backup
```

**Settings Pages:**

**1. Company Settings Page:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Company Settings                                    [Save]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Company Logo                                                    │
│  ┌──────────┐                                                   │
│  │   LOGO   │  [Upload New Logo]                                │
│  │  150x50  │  PNG, JPG (Max 2MB)                               │
│  └──────────┘                                                   │
│                                                                  │
│  Company Name *        [_________________________]               │
│  Business Type         [_________________________]               │
│  GST Number           [_________________________]               │
│  Contact Email *      [_________________________]               │
│  Contact Phone *      [_________________________]               │
│                                                                  │
│  Address                                                         │
│  Street Address       [_________________________]               │
│  City                 [_____________]  State [_____________]    │
│  Postal Code          [_____________]  Country [India      ▼]   │
│                                                                  │
│  Business Hours                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Day        │ Open Time │ Close Time │ Closed │              ││
│  │────────────│───────────│────────────│────────│              ││
│  │ Monday     │ [09:00  ] │ [18:00   ] │ [ ]    │              ││
│  │ Tuesday    │ [09:00  ] │ [18:00   ] │ [ ]    │              ││
│  │ Wednesday  │ [09:00  ] │ [18:00   ] │ [ ]    │              ││
│  │ Thursday   │ [09:00  ] │ [18:00   ] │ [ ]    │              ││
│  │ Friday     │ [09:00  ] │ [18:00   ] │ [ ]    │              ││
│  │ Saturday   │ [10:00  ] │ [14:00   ] │ [ ]    │              ││
│  │ Sunday     │ [      ] │ [        ] │ [✓]    │              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**2. Warranty Settings Page:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Warranty Settings                                   [Save]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Card Number Configuration                                       │
│  ────────────────────────────                                   │
│  Prefix              [WC    ]                                   │
│  Include Year        [✓] Yes                                    │
│  Include Month       [✓] Yes                                    │
│  Sequence Digits     [5     ▼]                                  │
│  Preview: WC2412-00001                                          │
│                                                                  │
│  Default Settings                                                │
│  ────────────────────────────                                   │
│  Default Warranty Period    [12    ] months                     │
│  Allow Extended Warranty    [✓] Yes                             │
│  Max Extension Period       [24    ] months                     │
│                                                                  │
│  Expiry Settings                                                 │
│  ────────────────────────────                                   │
│  Auto-update expired status [✓] Yes                             │
│  Expiry warning days        [30    ] days before                │
│  Send expiry notification   [✓] Yes                             │
│                                                                  │
│  Terms & Conditions                                              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Enter your warranty terms and conditions...                 ││
│  │                                                              ││
│  │ This will appear on warranty cards and claim forms.         ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**3. Claim Settings Page:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Claim Settings                                      [Save]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Claim Number Configuration                                      │
│  ────────────────────────────                                   │
│  Prefix              [CLM   ]                                   │
│  Include Year        [✓] Yes                                    │
│  Include Month       [✓] Yes                                    │
│  Sequence Digits     [5     ▼]                                  │
│  Preview: CLM2412-00001                                         │
│                                                                  │
│  Default Settings                                                │
│  ────────────────────────────                                   │
│  Default Priority         [Medium    ▼]                         │
│  Default Status           [New       ▼]                         │
│  Auto-assign to           [None      ▼]                         │
│                                                                  │
│  SLA Configuration                                               │
│  ────────────────────────────                                   │
│  │ Priority  │ Response Time │ Resolution Time │                │
│  │───────────│───────────────│─────────────────│                │
│  │ Critical  │ [4   ] hours  │ [24  ] hours    │                │
│  │ High      │ [8   ] hours  │ [48  ] hours    │                │
│  │ Medium    │ [24  ] hours  │ [72  ] hours    │                │
│  │ Low       │ [48  ] hours  │ [168 ] hours    │                │
│                                                                  │
│  Claim Types / Categories                                        │
│  ────────────────────────────                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ • Manufacturing Defect                          [Edit] [X]  ││
│  │ • Physical Damage                               [Edit] [X]  ││
│  │ • Electrical Issue                              [Edit] [X]  ││
│  │ • Software/Firmware Issue                       [Edit] [X]  ││
│  │ • Wear and Tear                                 [Edit] [X]  ││
│  │ [+ Add New Type]                                            ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**4. Notification Settings Page:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Notification Settings                               [Save]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Notification Channels                                           │
│  ────────────────────────────                                   │
│  Email Notifications     [✓] Enabled                            │
│  SMS Notifications       [✓] Enabled                            │
│  In-App Notifications    [✓] Enabled                            │
│                                                                  │
│  Notification Triggers                                           │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Event                    │ Email │ SMS │ In-App │           ││
│  │──────────────────────────│───────│─────│────────│           ││
│  │ New Claim Created        │  [✓]  │ [✓] │  [✓]   │           ││
│  │ Claim Status Changed     │  [✓]  │ [ ] │  [✓]   │           ││
│  │ Claim Assigned           │  [✓]  │ [ ] │  [✓]   │           ││
│  │ Claim Resolved           │  [✓]  │ [✓] │  [✓]   │           ││
│  │ Warranty Expiring        │  [✓]  │ [✓] │  [✓]   │           ││
│  │ Warranty Registered      │  [✓]  │ [✓] │  [✓]   │           ││
│  │ SLA Breach Warning       │  [✓]  │ [ ] │  [✓]   │           ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Email Templates                          [Manage Templates →]  │
│  SMS Templates                            [Manage Templates →]  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**5. System Settings Page:**
```
┌─────────────────────────────────────────────────────────────────┐
│  System Settings                                     [Save]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Regional Settings                                               │
│  ────────────────────────────                                   │
│  Timezone            [Asia/Kolkata (IST)               ▼]       │
│  Date Format         [DD/MM/YYYY                       ▼]       │
│  Time Format         [12-hour (AM/PM)                  ▼]       │
│  Currency            [INR (₹)                          ▼]       │
│  Number Format       [1,00,000.00 (Indian)             ▼]       │
│                                                                  │
│  Display Settings                                                │
│  ────────────────────────────                                   │
│  Items per page      [25     ▼]                                 │
│  Default theme       [System ▼]  (Light/Dark/System)            │
│                                                                  │
│  Data Management                                                 │
│  ────────────────────────────                                   │
│  [Export All Data]   Download all your data as ZIP              │
│  [Backup Settings]   Download settings backup                   │
│  [Import Settings]   Restore from backup                        │
│                                                                  │
│  Danger Zone                                                     │
│  ────────────────────────────                                   │
│  ⚠️ [Reset All Settings]  Restore to defaults                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

#### 9.4 User Profile Section

**Profile Page Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  My Profile                                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────────────────────┐  ┌─────────────────────────┐ │
│  │                               │  │  Account Overview        │ │
│  │        ┌──────────┐           │  │  ─────────────────────── │ │
│  │        │  AVATAR  │           │  │                          │ │
│  │        │   100px  │           │  │  Role: Administrator     │ │
│  │        └──────────┘           │  │  Member since: Jan 2024  │ │
│  │     [Upload Photo]            │  │  Last login: 2 hours ago │ │
│  │                               │  │                          │ │
│  │  John Doe                     │  │  Status: ● Active        │ │
│  │  john.doe@company.com         │  │                          │ │
│  │  +91 98765 43210              │  └─────────────────────────┘ │
│  │                               │                               │
│  └───────────────────────────────┘                               │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  [Personal Info]  [Security]  [Preferences]  [Activity]    ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Personal Information                                [Edit]     │
│  ─────────────────────────────────────────────────────────────  │
│  │ First Name        │ John                                   │ │
│  │ Last Name         │ Doe                                    │ │
│  │ Email             │ john.doe@company.com                   │ │
│  │ Phone             │ +91 98765 43210                        │ │
│  │ Department        │ Service                                │ │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Profile Tabs:**

**1. Personal Information Tab:**
- First Name, Last Name
- Email (may require verification on change)
- Phone Number
- Avatar/Profile Picture
- Department (read-only, set by admin)

**2. Security Tab:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Security Settings                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Change Password                                                 │
│  ────────────────────────────                                   │
│  Current Password    [________________________]                  │
│  New Password        [________________________]                  │
│  Confirm Password    [________________________]                  │
│                      [Change Password]                           │
│                                                                  │
│  Password Requirements:                                          │
│  ✓ At least 8 characters                                        │
│  ✓ At least one uppercase letter                                │
│  ✓ At least one number                                          │
│  ○ At least one special character                               │
│                                                                  │
│  Two-Factor Authentication (Future)                              │
│  ────────────────────────────                                   │
│  Status: Not Enabled                                             │
│  [Enable 2FA]                                                    │
│                                                                  │
│  Active Sessions                                                 │
│  ────────────────────────────                                   │
│  │ Device/Browser    │ Location      │ Last Active │ Action   │ │
│  │───────────────────│───────────────│─────────────│──────────│ │
│  │ Chrome (Windows)  │ Mumbai, India │ Now (this)  │          │ │
│  │ Safari (iPhone)   │ Mumbai, India │ 2 hours ago │ [Revoke] │ │
│  │ Firefox (Mac)     │ Delhi, India  │ 3 days ago  │ [Revoke] │ │
│                                                                  │
│  [Log Out All Other Sessions]                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**3. Preferences Tab:**
```
┌─────────────────────────────────────────────────────────────────┐
│  User Preferences                                    [Save]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Display Preferences                                             │
│  ────────────────────────────                                   │
│  Theme               [System Default ▼]  (Light/Dark/System)    │
│  Sidebar             [Expanded      ▼]  (Expanded/Collapsed)    │
│  Compact Mode        [ ] Enable compact mode                    │
│  Items per page      [25            ▼]                          │
│                                                                  │
│  Notification Preferences                                        │
│  ────────────────────────────                                   │
│  Email Notifications                                             │
│  [✓] New claims assigned to me                                  │
│  [✓] Claim status updates                                       │
│  [✓] Daily summary report                                       │
│  [ ] Weekly analytics report                                    │
│                                                                  │
│  Desktop Notifications                                           │
│  [✓] Enable browser notifications                               │
│  [✓] Sound alerts for new claims                                │
│                                                                  │
│  Dashboard Preferences                                           │
│  ────────────────────────────                                   │
│  Default date range  [Last 30 days  ▼]                          │
│  Show welcome message [✓]                                       │
│  Auto-refresh        [✓] Every [5  ] minutes                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**4. Activity Tab:**
```
┌─────────────────────────────────────────────────────────────────┐
│  My Activity                                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Activity Statistics (This Month)                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Claims     │  │  Warranties │  │  Avg. Time  │              │
│  │  Handled    │  │  Created    │  │  per Claim  │              │
│  │    45       │  │    23       │  │   2.5 hrs   │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                  │
│  Recent Activity                                                 │
│  ────────────────────────────                                   │
│  │ Today                                                       │ │
│  │ ────────────────────────────────────────────────────────── │ │
│  │ ✓ Resolved claim #CLM2412-00045          10:30 AM          │ │
│  │ 📝 Updated claim #CLM2412-00044           09:15 AM          │ │
│  │ 👁 Viewed warranty #WC2412-00089          08:45 AM          │ │
│  │                                                             │ │
│  │ Yesterday                                                   │ │
│  │ ────────────────────────────────────────────────────────── │ │
│  │ ✓ Resolved claim #CLM2412-00043          04:30 PM          │ │
│  │ ➕ Created warranty #WC2412-00088         02:15 PM          │ │
│  │ ...                                                         │ │
│  │                                                             │ │
│  │ [Load More]                                                 │ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

#### 9.5 Implementation Deliverables

**Dashboard Components:**
1. KPI Card Component (reusable)
2. Chart Components (Line, Bar, Pie, Donut, Area)
3. Activity Feed Component
4. Alert/Warning Cards Component
5. Quick Actions Widget
6. Date Range Picker Component
7. Dashboard Layout with Responsive Grid

**API Endpoints Required:**
```
GET  /api/dashboard/stats           # KPI statistics
GET  /api/dashboard/charts/claims   # Claims chart data
GET  /api/dashboard/charts/warranty # Warranty chart data
GET  /api/dashboard/activity        # Recent activity feed
GET  /api/dashboard/alerts          # Expiring/overdue items
GET  /api/analytics/claims          # Claims analytics
GET  /api/analytics/warranty        # Warranty analytics
GET  /api/analytics/products        # Product analytics
GET  /api/analytics/shops           # Shop analytics
GET  /api/analytics/users           # User productivity
GET  /api/settings                  # Get all settings
PUT  /api/settings                  # Update settings
GET  /api/settings/company          # Company settings
PUT  /api/settings/company          # Update company settings
GET  /api/profile                   # Current user profile
PUT  /api/profile                   # Update profile
PUT  /api/profile/password          # Change password
GET  /api/profile/activity          # User activity log
GET  /api/profile/sessions          # Active sessions
DELETE /api/profile/sessions/:id    # Revoke session
```

**Database Updates:**
```sql
-- User Preferences (JSON in users table or separate table)
ALTER TABLE users ADD COLUMN preferences JSON;

-- Activity Log
CREATE TABLE activity_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    user_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,      -- 'create', 'update', 'delete', 'view', 'login'
    entity_type VARCHAR(50) NOT NULL,   -- 'claim', 'warranty', 'customer', etc.
    entity_id INT,
    details JSON,                        -- Additional context
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_tenant_created (tenant_id, created_at),
    INDEX idx_user_created (user_id, created_at)
);

-- Tenant Settings (if not using JSON in tenants table)
CREATE TABLE tenant_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tenant_id INT NOT NULL UNIQUE,
    company_settings JSON,
    warranty_settings JSON,
    claim_settings JSON,
    notification_settings JSON,
    system_settings JSON,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
```

**UI/UX Requirements:**
- Responsive design (desktop, tablet, mobile)
- Dark mode support
- Smooth animations and transitions
- Loading skeletons for async data
- Empty states with helpful messages
- Error boundaries with retry options
- Accessible (ARIA labels, keyboard navigation)

**Chart Library:**
- Use **Recharts** (React-based, easy integration)
- OR **Chart.js** with react-chartjs-2
- Consistent color palette across all charts
- Interactive tooltips
- Responsive/mobile-friendly charts

**Pages to Create:**
```
src/app/(dashboard)/
├── page.tsx                      # Main Dashboard (redirect or dashboard)
├── dashboard/
│   └── page.tsx                  # Dashboard with analytics
├── analytics/
│   ├── page.tsx                  # Analytics overview
│   ├── claims/
│   │   └── page.tsx              # Claims analytics
│   ├── warranty/
│   │   └── page.tsx              # Warranty analytics
│   └── reports/
│       └── page.tsx              # Custom reports
├── settings/
│   ├── page.tsx                  # Settings overview
│   ├── company/
│   │   └── page.tsx              # Company settings
│   ├── warranty/
│   │   └── page.tsx              # Warranty settings
│   ├── claims/
│   │   └── page.tsx              # Claim settings
│   ├── notifications/
│   │   └── page.tsx              # Notification settings
│   └── system/
│       └── page.tsx              # System settings
└── profile/
    ├── page.tsx                  # User profile
    ├── security/
    │   └── page.tsx              # Security settings
    └── preferences/
        └── page.tsx              # User preferences
```

---

#### 9.6 Design Standards

**Industry-Level Design Requirements:**

**Color Palette:**
```
Primary:     #2563eb (Blue)
Secondary:   #64748b (Slate)
Success:     #22c55e (Green)
Warning:     #f59e0b (Amber)
Danger:      #ef4444 (Red)
Info:        #3b82f6 (Light Blue)

Chart Colors:
- #2563eb, #7c3aed, #db2777, #ea580c, #16a34a, #0891b2
```

**Typography:**
- Headings: Inter/Geist Bold
- Body: Inter/Geist Regular
- Monospace: JetBrains Mono (for numbers/codes)

**Spacing:**
- Consistent 4px/8px grid system
- Card padding: 24px
- Section gaps: 24px-32px

**Components:**
- Cards with subtle shadows
- Rounded corners (8px for cards, 6px for buttons)
- Hover states on interactive elements
- Focus states for accessibility
- Consistent icon usage (Lucide icons)

**Responsive Breakpoints:**
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

---

## 11. Folder Structure

```
CodeLink_ServiceHub/
├── .github/
│   └── workflows/
│       └── ci.yml
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── public/
│   ├── images/
│   ├── icons/
│   └── fonts/
│
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── forgot-password/
│   │   │   │   └── page.tsx
│   │   │   ├── reset-password/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   │
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                    # Dashboard
│   │   │   │
│   │   │   ├── users/
│   │   │   │   ├── page.tsx                # User list
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx            # Create user
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx            # Edit user
│   │   │   │
│   │   │   ├── roles/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   │
│   │   │   ├── products/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── [id]/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── categories/
│   │   │   │       └── page.tsx
│   │   │   │
│   │   │   ├── shops/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   │
│   │   │   ├── customers/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   │
│   │   │   ├── warranty/                      # ✅ IMPLEMENTED (Phase 2)
│   │   │   │   ├── page.tsx                   # Warranty cards list
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx               # Create warranty card
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── page.tsx               # View warranty card
│   │   │   │   │   └── edit/
│   │   │   │   │       └── page.tsx           # Edit warranty card
│   │   │   │   └── verify/
│   │   │   │       └── page.tsx               # Verify warranty
│   │   │   │
│   │   │   ├── claims/                        # ✅ IMPLEMENTED (Phase 2)
│   │   │   │   ├── page.tsx                   # Claims list with filters
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx               # Create claim
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx               # Claim detail with history
│   │   │   │
│   │   │   ├── workflows/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx            # View workflow
│   │   │   │       └── edit/
│   │   │   │           └── page.tsx        # Workflow builder
│   │   │   │
│   │   │   ├── logistics/
│   │   │   │   ├── page.tsx                # Logistics dashboard
│   │   │   │   ├── pickups/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── deliveries/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── collectors/
│   │   │   │       ├── page.tsx
│   │   │   │       ├── new/
│   │   │   │       │   └── page.tsx
│   │   │   │       └── [id]/
│   │   │   │           └── page.tsx
│   │   │   │
│   │   │   ├── notifications/
│   │   │   │   ├── page.tsx                # Notification center
│   │   │   │   └── templates/
│   │   │   │       ├── page.tsx
│   │   │   │       ├── new/
│   │   │   │       │   └── page.tsx
│   │   │   │       └── [id]/
│   │   │   │           └── page.tsx
│   │   │   │
│   │   │   ├── reports/
│   │   │   │   ├── page.tsx                # Reports dashboard
│   │   │   │   ├── claims/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── warranty/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── sla/
│   │   │   │       └── page.tsx
│   │   │   │
│   │   │   └── settings/
│   │   │       ├── page.tsx                # General settings
│   │   │       ├── branding/
│   │   │       │   └── page.tsx
│   │   │       └── integrations/
│   │   │           └── page.tsx
│   │   │
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── login/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── logout/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── forgot-password/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── reset-password/
│   │   │   │   │   └── route.ts
│   │   │   │   └── me/
│   │   │   │       └── route.ts
│   │   │   │
│   │   │   ├── users/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts
│   │   │   │
│   │   │   ├── roles/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts
│   │   │   │
│   │   │   ├── products/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts
│   │   │   │
│   │   │   ├── categories/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts
│   │   │   │
│   │   │   ├── shops/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts
│   │   │   │
│   │   │   ├── customers/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts
│   │   │   │
│   │   │   ├── warranty-cards/                # ✅ IMPLEMENTED (Phase 2)
│   │   │   │   ├── route.ts                   # GET (list), POST (create)
│   │   │   │   ├── verify/
│   │   │   │   │   └── route.ts               # POST (verify by card/serial/phone)
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts               # GET, PUT, DELETE
│   │   │   │
│   │   │   ├── claims/                        # ✅ IMPLEMENTED (Phase 2)
│   │   │   │   ├── route.ts                   # GET (list), POST (create)
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts               # GET, PUT
│   │   │   │       ├── status/
│   │   │   │       │   └── route.ts           # POST (update status)
│   │   │   │       ├── assign/
│   │   │   │       │   └── route.ts           # POST (assign to user)
│   │   │   │       └── history/
│   │   │   │           └── route.ts           # GET (history), POST (add note)
│   │   │   │
│   │   │   ├── claims-future/                 # Future: Phase 3
│   │   │   │   └── [id]/
│   │   │   │       ├── process/
│   │   │   │       │   └── route.ts
│   │   │   │       ├── assign/
│   │   │   │       │   └── route.ts
│   │   │   │       ├── history/
│   │   │   │       │   └── route.ts
│   │   │   │       └── timeline/
│   │   │   │           └── route.ts
│   │   │   │
│   │   │   ├── workflows/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts
│   │   │   │       ├── duplicate/
│   │   │   │       │   └── route.ts
│   │   │   │       └── activate/
│   │   │   │           └── route.ts
│   │   │   │
│   │   │   ├── logistics/
│   │   │   │   ├── pickups/
│   │   │   │   │   ├── route.ts
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── route.ts
│   │   │   │   ├── deliveries/
│   │   │   │   │   ├── route.ts
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── route.ts
│   │   │   │   └── collectors/
│   │   │   │       ├── route.ts
│   │   │   │       └── [id]/
│   │   │   │           └── route.ts
│   │   │   │
│   │   │   ├── notifications/
│   │   │   │   ├── route.ts
│   │   │   │   ├── read-all/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── [id]/
│   │   │   │   │   └── route.ts
│   │   │   │   └── templates/
│   │   │   │       ├── route.ts
│   │   │   │       └── [id]/
│   │   │   │           └── route.ts
│   │   │   │
│   │   │   ├── reports/
│   │   │   │   ├── dashboard/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── claims/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── warranty/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── sla/
│   │   │   │   │   └── route.ts
│   │   │   │   └── export/
│   │   │   │       └── route.ts
│   │   │   │
│   │   │   ├── settings/
│   │   │   │   ├── route.ts
│   │   │   │   └── branding/
│   │   │   │       └── route.ts
│   │   │   │
│   │   │   └── upload/
│   │   │       └── route.ts
│   │   │
│   │   ├── layout.tsx
│   │   ├── page.tsx                        # Landing/redirect
│   │   ├── globals.css
│   │   └── not-found.tsx
│   │
│   ├── components/
│   │   ├── ui/                             # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── table.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── form.tsx
│   │   │   ├── toast.tsx
│   │   │   └── ... (other shadcn components)
│   │   │
│   │   ├── layout/
│   │   │   ├── sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   ├── footer.tsx
│   │   │   ├── breadcrumb.tsx
│   │   │   └── page-header.tsx
│   │   │
│   │   ├── forms/
│   │   │   ├── user-form.tsx
│   │   │   ├── role-form.tsx
│   │   │   ├── product-form.tsx
│   │   │   ├── shop-form.tsx
│   │   │   ├── customer-form.tsx
│   │   │   ├── warranty-card-form.tsx
│   │   │   ├── claim-form.tsx
│   │   │   └── notification-template-form.tsx
│   │   │
│   │   ├── tables/
│   │   │   ├── data-table.tsx              # Generic data table
│   │   │   ├── data-table-pagination.tsx
│   │   │   ├── data-table-toolbar.tsx
│   │   │   └── columns/
│   │   │       ├── user-columns.tsx
│   │   │       ├── claim-columns.tsx
│   │   │       └── ... (other column definitions)
│   │   │
│   │   ├── workflow/
│   │   │   ├── workflow-builder.tsx
│   │   │   ├── workflow-canvas.tsx
│   │   │   ├── step-node.tsx
│   │   │   ├── step-config-panel.tsx
│   │   │   ├── transition-line.tsx
│   │   │   └── workflow-preview.tsx
│   │   │
│   │   ├── claims/
│   │   │   ├── claim-timeline.tsx
│   │   │   ├── claim-status-badge.tsx
│   │   │   ├── claim-process-form.tsx
│   │   │   └── claim-detail-card.tsx
│   │   │
│   │   ├── notifications/
│   │   │   ├── notification-bell.tsx
│   │   │   ├── notification-list.tsx
│   │   │   └── notification-item.tsx
│   │   │
│   │   ├── dashboard/
│   │   │   ├── stats-card.tsx
│   │   │   ├── claims-chart.tsx
│   │   │   ├── recent-claims.tsx
│   │   │   └── sla-overview.tsx
│   │   │
│   │   └── common/
│   │       ├── loading.tsx
│   │       ├── empty-state.tsx
│   │       ├── error-boundary.tsx
│   │       ├── confirm-dialog.tsx
│   │       ├── file-upload.tsx
│   │       ├── date-picker.tsx
│   │       ├── search-input.tsx
│   │       └── status-badge.tsx
│   │
│   ├── lib/
│   │   ├── prisma.ts                       # Prisma client
│   │   ├── auth.ts                         # NextAuth config
│   │   ├── redis.ts                        # Redis client
│   │   ├── utils.ts                        # Utility functions
│   │   ├── validations/
│   │   │   ├── user.ts
│   │   │   ├── role.ts
│   │   │   ├── product.ts
│   │   │   ├── warranty.ts
│   │   │   ├── claim.ts
│   │   │   └── workflow.ts
│   │   └── constants/
│   │       ├── permissions.ts
│   │       ├── status.ts
│   │       └── config.ts
│   │
│   ├── services/
│   │   ├── user.service.ts
│   │   ├── role.service.ts
│   │   ├── product.service.ts
│   │   ├── shop.service.ts
│   │   ├── customer.service.ts
│   │   ├── warranty.service.ts
│   │   ├── claim.service.ts
│   │   ├── workflow.service.ts
│   │   ├── workflow-engine.service.ts
│   │   ├── logistics.service.ts
│   │   ├── notification.service.ts
│   │   ├── sms.service.ts
│   │   ├── email.service.ts
│   │   └── report.service.ts
│   │
│   ├── hooks/
│   │   ├── use-auth.ts
│   │   ├── use-tenant.ts
│   │   ├── use-permissions.ts
│   │   ├── use-notifications.ts
│   │   ├── use-debounce.ts
│   │   └── use-local-storage.ts
│   │
│   ├── stores/
│   │   ├── auth-store.ts
│   │   ├── notification-store.ts
│   │   └── ui-store.ts
│   │
│   ├── types/
│   │   ├── index.ts
│   │   ├── user.ts
│   │   ├── role.ts
│   │   ├── product.ts
│   │   ├── warranty.ts
│   │   ├── claim.ts
│   │   ├── workflow.ts
│   │   ├── notification.ts
│   │   └── api.ts
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── tenant.middleware.ts
│   │   ├── permission.middleware.ts
│   │   └── rate-limit.middleware.ts
│   │
│   └── config/
│       ├── site.ts
│       ├── menu.ts
│       └── dashboard.ts
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── docker/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── docker-compose.prod.yml
│
├── docs/
│   ├── api/
│   ├── setup/
│   └── user-guide/
│
├── scripts/
│   ├── setup.sh
│   └── seed-data.ts
│
├── .env.example
├── .env.local                              # Local development
├── .eslintrc.json
├── .prettierrc
├── .gitignore
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 12. Deployment Strategy

### Phase 1 Deployment (VPS/Shared Hosting)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PHASE 1 DEPLOYMENT                                    │
│                    (Cost-Effective)                                      │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                          VPS Server                                      │
│                    (DigitalOcean/Vultr/Linode)                          │
│                      $20-50/month                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌───────────────┐    ┌───────────────┐    ┌───────────────┐          │
│   │    Nginx      │    │   Next.js     │    │    MySQL      │          │
│   │   (Reverse    │───►│  (PM2)        │───►│   Server      │          │
│   │    Proxy)     │    │               │    │               │          │
│   └───────────────┘    └───────────────┘    └───────────────┘          │
│          │                    │                                         │
│          │             ┌──────┴──────┐                                  │
│          │             │    Redis    │                                  │
│          │             │  (Optional) │                                  │
│          │             └─────────────┘                                  │
│          │                                                              │
│   ┌──────┴──────┐                                                       │
│   │ SSL/HTTPS   │                                                       │
│   │ (Let's      │                                                       │
│   │  Encrypt)   │                                                       │
│   └─────────────┘                                                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Future Scalable Deployment

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SCALABLE DEPLOYMENT                                   │
│                    (Production Scale)                                    │
└─────────────────────────────────────────────────────────────────────────┘

                        ┌─────────────────┐
                        │   Cloudflare    │
                        │   CDN + WAF     │
                        └────────┬────────┘
                                 │
                        ┌────────┴────────┐
                        │  Load Balancer  │
                        └────────┬────────┘
                                 │
            ┌────────────────────┼────────────────────┐
            │                    │                    │
   ┌────────┴────────┐  ┌────────┴────────┐  ┌───────┴────────┐
   │   App Server 1  │  │   App Server 2  │  │  App Server N  │
   │   (Container)   │  │   (Container)   │  │  (Container)   │
   └────────┬────────┘  └────────┬────────┘  └───────┬────────┘
            │                    │                   │
            └────────────────────┼───────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌────────┴────────┐     ┌────────┴────────┐    ┌────────┴────────┐
│  MySQL Primary  │────►│  MySQL Replica  │    │     Redis       │
│                 │     │                 │    │    Cluster      │
└─────────────────┘     └─────────────────┘    └─────────────────┘
```

---

## Summary

This project plan outlines a comprehensive SaaS platform for customer support and warranty claim management. The key differentiators are:

1. **Fully Dynamic Workflow Engine** - Companies can design their own processes
2. **Multi-Tenant Architecture** - Secure, isolated data per company
3. **End-to-End Tracking** - Complete visibility from sale to resolution
4. **Modern Tech Stack** - Next.js 14, TypeScript, Prisma, MySQL
5. **Scalable Design** - Start simple, scale as needed

The development is organized into 8 phases, starting with foundation and MVP, progressively adding features until the platform is production-ready.

---

**Document Version:** 1.0
**Last Updated:** December 2024
**Author:** CodeLink Development Team
