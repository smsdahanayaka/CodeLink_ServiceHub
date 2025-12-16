# Phase 5: Claim Finalization & Invoice Generation System

## Overview

This phase implements a comprehensive **Claim Finalization Section** that appears after the workflow is completed. This section handles:
1. Warranty validation at claim creation
2. Quotation generation and approval workflow
3. Parts/items management from inventory
4. Cost tracking and calculations
5. Final invoice generation
6. Integration with delivery scheduling

---

## System Architecture

### New Database Models

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CLAIM FINALIZATION SYSTEM                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐      ┌──────────────────┐      ┌───────────────────┐     │
│  │   Quotation  │──────│  QuotationItem   │      │   ClaimInvoice    │     │
│  │              │      │                  │      │                   │     │
│  │ - claimId    │      │ - quotationId    │      │ - claimId         │     │
│  │ - status     │      │ - type (PART/    │      │ - quotationId     │     │
│  │ - totalAmt   │      │   SERVICE/LABOR) │      │ - invoiceNumber   │     │
│  │ - validUntil │      │ - inventoryItemId│      │ - status          │     │
│  │ - approvedAt │      │ - quantity       │      │ - items[]         │     │
│  │ - rejectedAt │      │ - unitPrice      │      │ - subtotal        │     │
│  │ - sentAt     │      │ - isFromInventory│      │ - tax             │     │
│  └──────────────┘      │ - notes          │      │ - discount        │     │
│                        └──────────────────┘      │ - totalAmount     │     │
│                                                  └───────────────────┘     │
│  ┌────────────────────┐     ┌─────────────────────────────────────────┐    │
│  │  InventoryItem     │     │  ClaimPart (Parts Used in Repair)       │    │
│  │                    │     │                                         │    │
│  │ - sku              │     │ - claimId                               │    │
│  │ - name             │     │ - type (INVENTORY/MANUAL)               │    │
│  │ - quantity         │     │ - inventoryItemId (nullable)            │    │
│  │ - reservedQty      │     │ - name, description                     │    │
│  │ - unitCost         │     │ - quantity, unitPrice                   │    │
│  │ - sellingPrice     │     │ - isWarrantyCovered                     │    │
│  │ - reorderLevel     │     │ - isIssued (for new item issue)         │    │
│  │ - categoryId       │     │ - issuedAt, issuedBy                    │    │
│  └────────────────────┘     └─────────────────────────────────────────┘    │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │  ClaimServiceCharge (Labor & Service Costs)                      │      │
│  │                                                                  │      │
│  │ - claimId           - isWarrantyCovered                          │      │
│  │ - chargeType        - notes                                      │      │
│  │ - description       - createdBy                                  │      │
│  │ - amount                                                         │      │
│  └──────────────────────────────────────────────────────────────────┘      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Feature 1: Warranty Validation at Claim Creation

### Requirements
- When creating a claim, automatically check if warranty is valid
- Display warranty status prominently (IN WARRANTY / OUT OF WARRANTY / EXPIRED)
- Allow manual override with "Treat as Warranty" or "Treat as Non-Warranty" option
- Store the warranty decision on the claim

### Database Changes
Add to `WarrantyClaim` model:
```prisma
isUnderWarranty      Boolean   @default(true)
warrantyOverrideBy   Int?      // User who overrode warranty decision
warrantyOverrideAt   DateTime?
warrantyOverrideReason String? @db.Text
requiresQuotation    Boolean   @default(false)  // If true, quotation needed before repair
quotationApprovedAt  DateTime?
```

### UI Changes - Claim Creation
1. After selecting warranty card, show warranty status card:
   ```
   ┌─────────────────────────────────────────────────────────────┐
   │  WARRANTY STATUS                                            │
   │  ─────────────────────────────────────────────────────────  │
   │  ✓ IN WARRANTY                     Expires: 15 Mar 2025    │
   │    Remaining: 3 months 15 days                              │
   │                                                             │
   │  [ ] Override: Treat as Non-Warranty                        │
   │      Reason: ___________________________                    │
   └─────────────────────────────────────────────────────────────┘
   ```

2. If warranty expired:
   ```
   ┌─────────────────────────────────────────────────────────────┐
   │  WARRANTY STATUS                                            │
   │  ─────────────────────────────────────────────────────────  │
   │  ✗ WARRANTY EXPIRED                Expired: 15 Nov 2024    │
   │    Expired 1 month ago                                      │
   │                                                             │
   │  [ ] Treat as Warranty Claim (Special Approval)             │
   │      Reason: ___________________________                    │
   │                                                             │
   │  [✓] Requires Quotation Before Repair                       │
   └─────────────────────────────────────────────────────────────┘
   ```

---

## Feature 2: Quotation System

### Purpose
For non-warranty claims (or when customer approval is needed), generate a quotation with estimated costs before starting repair.

### Database Models

```prisma
// Quotation for repair cost estimation
model ClaimQuotation {
  id              Int      @id @default(autoincrement())
  tenantId        Int
  claimId         Int
  quotationNumber String   @db.VarChar(100)  // QT{YY}{MM}{SEQUENCE}

  // Status tracking
  status          QuotationStatus @default(DRAFT)

  // Amounts
  subtotal        Decimal  @db.Decimal(12, 2)
  taxRate         Decimal  @default(0) @db.Decimal(5, 2)  // Percentage
  taxAmount       Decimal  @default(0) @db.Decimal(12, 2)
  discountType    DiscountType?
  discountValue   Decimal  @default(0) @db.Decimal(12, 2)
  discountAmount  Decimal  @default(0) @db.Decimal(12, 2)
  totalAmount     Decimal  @db.Decimal(12, 2)

  // Validity
  validUntil      DateTime?

  // Customer response
  sentAt          DateTime?
  sentVia         String?  @db.VarChar(50)  // EMAIL, SMS, WHATSAPP
  viewedAt        DateTime?
  approvedAt      DateTime?
  approvedBy      String?  @db.VarChar(255)  // Customer name who approved
  rejectedAt      DateTime?
  rejectionReason String?  @db.Text

  // Notes
  notes           String?  @db.Text
  termsAndConditions String? @db.Text

  createdBy       Int
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  tenant          Tenant        @relation(...)
  claim           WarrantyClaim @relation(...)
  createdByUser   User          @relation(...)
  items           QuotationItem[]
  invoice         ClaimInvoice?

  @@unique([tenantId, quotationNumber])
  @@map("claim_quotations")
}

enum QuotationStatus {
  DRAFT
  SENT
  VIEWED
  APPROVED
  REJECTED
  EXPIRED
  CONVERTED  // Converted to invoice
}

enum DiscountType {
  PERCENTAGE
  FIXED
}

// Individual items in quotation
model QuotationItem {
  id              Int      @id @default(autoincrement())
  quotationId     Int

  itemType        QuotationItemType

  // For inventory items
  inventoryItemId Int?

  // Item details (copied from inventory or manual entry)
  name            String   @db.VarChar(255)
  description     String?  @db.Text
  sku             String?  @db.VarChar(100)

  quantity        Decimal  @db.Decimal(10, 2)
  unitPrice       Decimal  @db.Decimal(12, 2)
  totalPrice      Decimal  @db.Decimal(12, 2)

  isWarrantyCovered Boolean @default(false)
  warrantyNotes   String?  @db.Text

  sortOrder       Int      @default(0)
  createdAt       DateTime @default(now())

  // Relations
  quotation       ClaimQuotation @relation(...)
  inventoryItem   InventoryItem? @relation(...)

  @@map("quotation_items")
}

enum QuotationItemType {
  PART           // Physical parts/components
  SERVICE        // Service charges
  LABOR          // Labor costs
  OTHER          // Miscellaneous
}
```

### Quotation Workflow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   DRAFT     │───>│    SENT     │───>│   VIEWED    │───>│  APPROVED   │
│             │    │             │    │             │    │             │
│ Create &    │    │ Send to     │    │ Customer    │    │ Customer    │
│ add items   │    │ customer    │    │ opened      │    │ approved    │
└─────────────┘    └─────────────┘    └─────────────┘    └──────┬──────┘
                                              │                  │
                                              │                  │
                                              v                  v
                                      ┌─────────────┐    ┌─────────────┐
                                      │  REJECTED   │    │  CONVERTED  │
                                      │             │    │             │
                                      │ Customer    │    │ Invoice     │
                                      │ declined    │    │ generated   │
                                      └─────────────┘    └─────────────┘
```

### UI - Quotation Creation (in Claim Detail)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  CREATE QUOTATION                                          QT2512000001     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Parts & Components                                            [+ Add Part] │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ #  │ Item              │ SKU      │ Qty │ Unit Price │ Total   │ 🗑️  │ │
│  ├────┼───────────────────┼──────────┼─────┼────────────┼─────────┼─────┤ │
│  │ 1  │ Compressor Unit   │ CMP-001  │ 1   │ ₹5,500.00  │ ₹5,500  │ [x] │ │
│  │ 2  │ Capacitor 35µF    │ CAP-035  │ 2   │ ₹350.00    │ ₹700    │ [x] │ │
│  │ 3  │ Gas Refill (R32)  │ GAS-R32  │ 1   │ ₹1,200.00  │ ₹1,200  │ [x] │ │
│  └────┴───────────────────┴──────────┴─────┴────────────┴─────────┴─────┘ │
│                                                                             │
│  Service & Labor                                            [+ Add Charge] │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ #  │ Description                           │ Amount        │ 🗑️        │ │
│  ├────┼───────────────────────────────────────┼───────────────┼───────────┤ │
│  │ 1  │ Technician Visit Charge               │ ₹500.00       │ [x]       │ │
│  │ 2  │ Installation & Testing Labor          │ ₹800.00       │ [x]       │ │
│  └────┴───────────────────────────────────────┴───────────────┴───────────┘ │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│                                              Subtotal:         ₹8,700.00   │
│                                              Tax (18% GST):    ₹1,566.00   │
│                                              Discount:         - ₹500.00   │
│                                              ────────────────────────────   │
│                                              TOTAL:            ₹9,766.00   │
│                                                                             │
│  Valid Until: [____15/01/2025____]                                          │
│                                                                             │
│  Notes: ________________________________________________________________   │
│         ________________________________________________________________   │
│                                                                             │
│  [Save Draft]              [Preview]              [Send to Customer]       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Add Part Dialog (with Inventory Search)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ADD PART                                                              [X]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  (•) From Inventory    ( ) Manual Entry                                     │
│                                                                             │
│  Search: [_______________________] 🔍                                       │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ SKU       │ Name              │ In Stock │ Price     │ Select          │ │
│  ├───────────┼───────────────────┼──────────┼───────────┼─────────────────┤ │
│  │ CMP-001   │ Compressor Unit   │ 5        │ ₹5,500.00 │ [Select]        │ │
│  │ CMP-002   │ Compressor Motor  │ 3        │ ₹4,200.00 │ [Select]        │ │
│  │ CAP-035   │ Capacitor 35µF    │ 12       │ ₹350.00   │ [Select]        │ │
│  └───────────┴───────────────────┴──────────┴───────────┴─────────────────┘ │
│                                                                             │
│  Selected: Compressor Unit (CMP-001)                                        │
│  Quantity: [__1__]     Unit Price: [__5500__]                               │
│                                                                             │
│  [ ] Under Warranty (no charge to customer)                                 │
│                                                                             │
│  [Cancel]                                              [Add to Quotation]  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Feature 3: Inventory Management

### Database Models

```prisma
// Inventory Item Categories
model InventoryCategory {
  id          Int      @id @default(autoincrement())
  tenantId    Int
  name        String   @db.VarChar(255)
  description String?  @db.Text
  parentId    Int?
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  tenant      Tenant             @relation(...)
  parent      InventoryCategory? @relation("CategoryHierarchy", ...)
  children    InventoryCategory[] @relation("CategoryHierarchy")
  items       InventoryItem[]

  @@map("inventory_categories")
}

// Inventory Items (Parts/Components)
model InventoryItem {
  id              Int      @id @default(autoincrement())
  tenantId        Int
  categoryId      Int?

  sku             String   @db.VarChar(100)
  name            String   @db.VarChar(255)
  description     String?  @db.Text

  // Stock management
  quantity        Decimal  @default(0) @db.Decimal(10, 2)
  reservedQuantity Decimal @default(0) @db.Decimal(10, 2)  // Reserved for quotations/claims
  reorderLevel    Decimal  @default(0) @db.Decimal(10, 2)
  reorderQuantity Decimal  @default(0) @db.Decimal(10, 2)

  // Pricing
  costPrice       Decimal  @default(0) @db.Decimal(12, 2)
  sellingPrice    Decimal  @default(0) @db.Decimal(12, 2)

  // Additional info
  unit            String   @default("pcs") @db.VarChar(50)  // pcs, kg, ltr, etc.
  location        String?  @db.VarChar(255)  // Warehouse location
  supplier        String?  @db.VarChar(255)

  isActive        Boolean  @default(true)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  tenant          Tenant            @relation(...)
  category        InventoryCategory? @relation(...)
  transactions    InventoryTransaction[]
  quotationItems  QuotationItem[]
  claimParts      ClaimPart[]

  @@unique([tenantId, sku])
  @@map("inventory_items")
}

// Inventory Transactions (Stock movements)
model InventoryTransaction {
  id              Int      @id @default(autoincrement())
  tenantId        Int
  itemId          Int

  transactionType InventoryTransactionType
  quantity        Decimal  @db.Decimal(10, 2)  // Positive for IN, Negative for OUT

  // Reference
  referenceType   String?  @db.VarChar(50)  // CLAIM, QUOTATION, ADJUSTMENT, PURCHASE
  referenceId     Int?

  // Pricing at time of transaction
  unitCost        Decimal? @db.Decimal(12, 2)
  totalCost       Decimal? @db.Decimal(12, 2)

  notes           String?  @db.Text
  createdBy       Int
  createdAt       DateTime @default(now())

  // Relations
  tenant          Tenant        @relation(...)
  item            InventoryItem @relation(...)
  createdByUser   User          @relation(...)

  @@map("inventory_transactions")
}

enum InventoryTransactionType {
  STOCK_IN       // Initial stock / Purchase
  STOCK_OUT      // Issued for claim
  ADJUSTMENT     // Manual adjustment
  RESERVED       // Reserved for quotation
  UNRESERVED     // Released reservation
  RETURN         // Returned from claim
}
```

---

## Feature 4: Parts Used During Repair (ClaimPart)

### Purpose
Track all parts used during repair - both from inventory and manually added items.

### Database Model

```prisma
// Parts/Items used in claim repair
model ClaimPart {
  id              Int      @id @default(autoincrement())
  claimId         Int

  partType        ClaimPartType @default(INVENTORY)

  // For inventory items
  inventoryItemId Int?

  // Part details (copied or manual)
  name            String   @db.VarChar(255)
  description     String?  @db.Text
  sku             String?  @db.VarChar(100)

  quantity        Decimal  @db.Decimal(10, 2)
  unitCost        Decimal  @db.Decimal(12, 2)
  unitPrice       Decimal  @db.Decimal(12, 2)  // Selling price
  totalPrice      Decimal  @db.Decimal(12, 2)

  // Warranty coverage
  isWarrantyCovered Boolean @default(false)

  // Issue tracking (for new items being given to customer)
  isNewItemIssue  Boolean  @default(false)  // True if issuing new product
  isIssued        Boolean  @default(false)
  issuedAt        DateTime?
  issuedBy        Int?

  // Invoice reference
  invoiceItemId   Int?     // Link to invoice item

  notes           String?  @db.Text
  createdBy       Int
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  claim           WarrantyClaim  @relation(...)
  inventoryItem   InventoryItem? @relation(...)
  issuedByUser    User?          @relation(...)
  createdByUser   User           @relation(...)

  @@map("claim_parts")
}

enum ClaimPartType {
  INVENTORY    // From inventory
  MANUAL       // Manually entered (not in inventory)
}

// Service charges for claim
model ClaimServiceCharge {
  id              Int      @id @default(autoincrement())
  claimId         Int

  chargeType      ServiceChargeType
  description     String   @db.VarChar(255)
  amount          Decimal  @db.Decimal(12, 2)

  isWarrantyCovered Boolean @default(false)

  notes           String?  @db.Text
  createdBy       Int
  createdAt       DateTime @default(now())

  // Relations
  claim           WarrantyClaim @relation(...)
  createdByUser   User          @relation(...)

  @@map("claim_service_charges")
}

enum ServiceChargeType {
  LABOR
  SERVICE_VISIT
  TRANSPORTATION
  DIAGNOSIS
  OTHER
}
```

---

## Feature 5: Claim Finalization Section

### Overview
This section appears in the claim detail page AFTER the workflow is completed. It's the final step before delivery.

### UI Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ✅ WORKFLOW COMPLETED                                                      │
│     Standard Repair Workflow - Final Step: Quality Check Passed             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  📋 CLAIM FINALIZATION                                              │   │
│  │                                                                     │   │
│  │  Complete all sections below before scheduling delivery              │   │
│  │                                                                     │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  │   │
│  │  │ Parts   │  │ Service │  │ Items   │  │ Invoice │  │ Ready   │  │   │
│  │  │ Used    │  │ Charges │  │ to      │  │ Preview │  │ for     │  │   │
│  │  │ ✓      │  │ ✓      │  │ Issue   │  │ ✓      │  │ Delivery│  │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘  │   │
│  │      ↓           ↓            ↓            ↓            ↓         │   │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │   │
│  │                                                                     │   │
│  │  [Currently showing: Parts Used section below]                       │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Section 1: Parts Used

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PARTS USED IN REPAIR                                        [+ Add Part]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ Part Name           │ SKU      │ Qty │ Unit     │ Total    │ Coverage │ │
│  │                     │          │     │ Price    │          │          │ │
│  ├─────────────────────┼──────────┼─────┼──────────┼──────────┼──────────┤ │
│  │ Compressor Unit     │ CMP-001  │ 1   │ ₹5,500   │ ₹5,500   │ Warranty │ │
│  │ [From Inventory]    │          │     │          │          │ Covered  │ │
│  ├─────────────────────┼──────────┼─────┼──────────┼──────────┼──────────┤ │
│  │ Capacitor 35µF      │ CAP-035  │ 2   │ ₹350     │ ₹700     │ Customer │ │
│  │ [From Inventory]    │          │     │          │          │ Charged  │ │
│  ├─────────────────────┼──────────┼─────┼──────────┼──────────┼──────────┤ │
│  │ Custom Bracket      │ -        │ 1   │ ₹250     │ ₹250     │ Customer │ │
│  │ [Manual Entry]      │          │     │          │          │ Charged  │ │
│  └─────────────────────┴──────────┴─────┴──────────┴──────────┴──────────┘ │
│                                                                             │
│  Parts Summary:                                                             │
│  • Warranty Covered: ₹5,500 (1 item)                                        │
│  • Customer Charged: ₹950 (2 items)                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Section 2: Service Charges

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SERVICE & LABOR CHARGES                                   [+ Add Charge]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ Type          │ Description                    │ Amount   │ Coverage  │ │
│  ├───────────────┼────────────────────────────────┼──────────┼───────────┤ │
│  │ Labor         │ Compressor Replacement Labor   │ ₹800     │ Warranty  │ │
│  │ Service Visit │ On-site Diagnosis Visit        │ ₹500     │ Customer  │ │
│  │ Transportation│ Parts Delivery                 │ ₹200     │ Customer  │ │
│  └───────────────┴────────────────────────────────┴──────────┴───────────┘ │
│                                                                             │
│  Service Summary:                                                           │
│  • Warranty Covered: ₹800                                                   │
│  • Customer Charged: ₹700                                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Section 3: Items to Issue (New Product Issue)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ITEMS TO ISSUE                                          [+ Add New Item]  │
│  New items to be given to customer (replacement/additional products)        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ Item                  │ Serial      │ Qty │ Value    │ Status         │ │
│  ├───────────────────────┼─────────────┼─────┼──────────┼────────────────┤ │
│  │ AC Remote Control     │ RMT-2024-XX │ 1   │ ₹450     │ 🔴 Not Issued  │ │
│  │ [Replacement]         │             │     │          │ [Issue Now]    │ │
│  ├───────────────────────┼─────────────┼─────┼──────────┼────────────────┤ │
│  │ Wall Mounting Kit     │ WMK-001     │ 1   │ ₹800     │ ✅ Issued      │ │
│  │ [Additional]          │             │     │          │ 15 Dec 2024    │ │
│  └───────────────────────┴─────────────┴─────┴──────────┴────────────────┘ │
│                                                                             │
│  ⚠️ 1 item pending issue. Issue all items before generating invoice.       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Section 4: Invoice Preview & Generation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  INVOICE PREVIEW                                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        SERVICE INVOICE                              │   │
│  │                                                                     │   │
│  │  Invoice #: INV2512000042                    Date: 16 Dec 2024     │   │
│  │  Claim #: CLM2512000015                                            │   │
│  │                                                                     │   │
│  │  Customer: John Doe                                                 │   │
│  │  Phone: +91 9876543210                                              │   │
│  │  Product: Samsung Split AC 1.5 Ton                                  │   │
│  │  Serial: SAM-AC-2024-00123                                         │   │
│  │  ─────────────────────────────────────────────────────────────────  │   │
│  │                                                                     │   │
│  │  PARTS                                                              │   │
│  │  ┌─────────────────────────────────────┬─────┬──────────┬─────────┐│   │
│  │  │ Item                                │ Qty │ Rate     │ Amount  ││   │
│  │  ├─────────────────────────────────────┼─────┼──────────┼─────────┤│   │
│  │  │ Capacitor 35µF                      │ 2   │ ₹350     │ ₹700    ││   │
│  │  │ Custom Bracket                      │ 1   │ ₹250     │ ₹250    ││   │
│  │  └─────────────────────────────────────┴─────┴──────────┴─────────┘│   │
│  │  Warranty Covered (not charged): Compressor Unit - ₹5,500         │   │
│  │                                                                     │   │
│  │  SERVICES                                                           │   │
│  │  ┌─────────────────────────────────────────────────────┬─────────┐ │   │
│  │  │ Description                                         │ Amount  │ │   │
│  │  ├─────────────────────────────────────────────────────┼─────────┤ │   │
│  │  │ On-site Diagnosis Visit                             │ ₹500    │ │   │
│  │  │ Parts Delivery                                      │ ₹200    │ │   │
│  │  └─────────────────────────────────────────────────────┴─────────┘ │   │
│  │  Warranty Covered: Compressor Replacement Labor - ₹800            │   │
│  │                                                                     │   │
│  │  ─────────────────────────────────────────────────────────────────  │   │
│  │                                             Subtotal:    ₹1,650.00  │   │
│  │                                             Tax (18%):   ₹297.00    │   │
│  │                                             ─────────────────────── │   │
│  │                                             TOTAL:       ₹1,947.00  │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  [Download PDF]    [Send to Customer]    [Print]    [Generate Invoice]     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Feature 6: Final Invoice Generation

### Database Model

```prisma
// Final Invoice for claim
model ClaimInvoice {
  id              Int      @id @default(autoincrement())
  tenantId        Int
  claimId         Int      @unique
  quotationId     Int?     @unique  // If created from quotation

  invoiceNumber   String   @db.VarChar(100)  // INV{YY}{MM}{SEQUENCE}
  invoiceDate     DateTime @default(now())

  status          InvoiceStatus @default(DRAFT)

  // Customer details (snapshot)
  customerName    String   @db.VarChar(255)
  customerPhone   String   @db.VarChar(50)
  customerEmail   String?  @db.VarChar(255)
  customerAddress String?  @db.Text

  // Amounts
  subtotal        Decimal  @db.Decimal(12, 2)
  taxRate         Decimal  @default(0) @db.Decimal(5, 2)
  taxAmount       Decimal  @default(0) @db.Decimal(12, 2)
  discountType    DiscountType?
  discountValue   Decimal  @default(0) @db.Decimal(12, 2)
  discountAmount  Decimal  @default(0) @db.Decimal(12, 2)
  totalAmount     Decimal  @db.Decimal(12, 2)

  // Warranty covered items (for reference)
  warrantyCoveredAmount Decimal @default(0) @db.Decimal(12, 2)

  // Payment
  paidAmount      Decimal  @default(0) @db.Decimal(12, 2)
  paymentStatus   PaymentStatus @default(UNPAID)
  paymentMethod   String?  @db.VarChar(50)
  paymentReference String? @db.VarChar(255)
  paidAt          DateTime?

  // Delivery
  isReadyForDelivery Boolean @default(false)

  notes           String?  @db.Text
  termsAndConditions String? @db.Text

  // PDF storage
  pdfUrl          String?  @db.VarChar(500)

  createdBy       Int
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  tenant          Tenant        @relation(...)
  claim           WarrantyClaim @relation(...)
  quotation       ClaimQuotation? @relation(...)
  createdByUser   User          @relation(...)
  items           InvoiceItem[]

  @@unique([tenantId, invoiceNumber])
  @@map("claim_invoices")
}

enum InvoiceStatus {
  DRAFT
  GENERATED
  SENT
  PAID
  CANCELLED
}

enum PaymentStatus {
  UNPAID
  PARTIAL
  PAID
}

// Invoice line items
model InvoiceItem {
  id              Int      @id @default(autoincrement())
  invoiceId       Int

  itemType        InvoiceItemType

  // Reference to source
  claimPartId     Int?
  claimServiceChargeId Int?

  name            String   @db.VarChar(255)
  description     String?  @db.Text
  sku             String?  @db.VarChar(100)

  quantity        Decimal  @db.Decimal(10, 2)
  unitPrice       Decimal  @db.Decimal(12, 2)
  totalPrice      Decimal  @db.Decimal(12, 2)

  isWarrantyCovered Boolean @default(false)

  sortOrder       Int      @default(0)

  // Relations
  invoice         ClaimInvoice      @relation(...)
  claimPart       ClaimPart?        @relation(...)
  claimServiceCharge ClaimServiceCharge? @relation(...)

  @@map("invoice_items")
}

enum InvoiceItemType {
  PART
  SERVICE
  LABOR
  OTHER
}
```

---

## Feature 7: Integration with Delivery Scheduling

### Flow After Invoice Generation

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Workflow   │────>│    Claim     │────>│   Invoice    │────>│   Delivery   │
│   Completed  │     │ Finalization │     │  Generated   │     │  Scheduling  │
│              │     │              │     │              │     │              │
│ Quality      │     │ - Add Parts  │     │ - PDF Ready  │     │ Only claims  │
│ Check Pass   │     │ - Add Costs  │     │ - Payment    │     │ with invoice │
│              │     │ - Issue Items│     │   tracked    │     │ can schedule │
└──────────────┘     │ - Gen Invoice│     │ - Ready for  │     │ delivery     │
                     └──────────────┘     │   delivery   │     └──────────────┘
                                          └──────────────┘
```

### Changes to Delivery Trip Creation

1. **Filter Claims**: Only show claims that have:
   - Workflow completed (currentStep.stepType === "END")
   - Invoice generated and ready (invoice.isReadyForDelivery === true)
   - All items issued

2. **Show Invoice Summary** in delivery scheduling:
   ```
   Claim: CLM2512000015
   Invoice: INV2512000042
   Amount: ₹1,947.00
   Payment: UNPAID / PAID
   Items to Deliver: 2 parts + 1 new item
   ```

3. **Collector Assignment Integration**:
   - When assigning collector, they can see invoice details
   - Payment collection option if unpaid
   - Signature + payment confirmation on delivery

---

## API Endpoints

### Quotation APIs
```
GET    /api/claims/[id]/quotation           - Get claim quotation
POST   /api/claims/[id]/quotation           - Create quotation
PUT    /api/claims/[id]/quotation           - Update quotation
POST   /api/claims/[id]/quotation/send      - Send to customer
POST   /api/claims/[id]/quotation/approve   - Mark as approved
POST   /api/claims/[id]/quotation/reject    - Mark as rejected
```

### Inventory APIs
```
GET    /api/inventory/items                 - List items (with search, filter)
GET    /api/inventory/items/[id]            - Get item details
POST   /api/inventory/items                 - Create item
PUT    /api/inventory/items/[id]            - Update item
GET    /api/inventory/items/[id]/transactions - Get stock history
POST   /api/inventory/items/[id]/adjust     - Manual stock adjustment
GET    /api/inventory/categories            - List categories
POST   /api/inventory/categories            - Create category
```

### Claim Parts & Charges APIs
```
GET    /api/claims/[id]/parts               - List claim parts
POST   /api/claims/[id]/parts               - Add part (inventory/manual)
PUT    /api/claims/[id]/parts/[partId]      - Update part
DELETE /api/claims/[id]/parts/[partId]      - Remove part
POST   /api/claims/[id]/parts/[partId]/issue - Mark item as issued

GET    /api/claims/[id]/service-charges     - List service charges
POST   /api/claims/[id]/service-charges     - Add charge
PUT    /api/claims/[id]/service-charges/[id] - Update charge
DELETE /api/claims/[id]/service-charges/[id] - Remove charge
```

### Invoice APIs
```
GET    /api/claims/[id]/invoice             - Get claim invoice
POST   /api/claims/[id]/invoice             - Generate invoice
PUT    /api/claims/[id]/invoice             - Update invoice
POST   /api/claims/[id]/invoice/send        - Send to customer
POST   /api/claims/[id]/invoice/payment     - Record payment
GET    /api/claims/[id]/invoice/pdf         - Download PDF
```

### Modified Delivery Trip API
```
GET    /api/logistics/delivery-trips/eligible-claims  - Get claims ready for delivery
       - Filters: invoice generated, items issued, workflow completed
```

---

## Implementation Phases

### Phase 5.1: Database & Core Models
1. Add new fields to WarrantyClaim model
2. Create InventoryCategory model
3. Create InventoryItem model
4. Create InventoryTransaction model
5. Create ClaimPart model
6. Create ClaimServiceCharge model
7. Create ClaimQuotation model
8. Create QuotationItem model
9. Create ClaimInvoice model
10. Create InvoiceItem model
11. Run migrations

### Phase 5.2: Inventory Management
1. Create inventory categories CRUD pages
2. Create inventory items CRUD pages
3. Implement stock adjustment
4. Create inventory search component (reusable)
5. Add inventory transaction history view

### Phase 5.3: Warranty Check at Claim Creation
1. Modify claim creation page to show warranty status
2. Add warranty override option
3. Add "requires quotation" checkbox
4. Update claim API to handle new fields

### Phase 5.4: Quotation System
1. Create quotation creation component
2. Implement quotation item management
3. Add quotation preview/PDF generation
4. Implement send to customer functionality
5. Create quotation approval/rejection flow

### Phase 5.5: Claim Finalization Section
1. Create finalization container component
2. Implement parts used section with inventory integration
3. Implement service charges section
4. Implement items to issue section
5. Create invoice preview component
6. Implement invoice generation

### Phase 5.6: Invoice & Delivery Integration
1. Create invoice PDF template
2. Implement payment tracking
3. Modify delivery trip creation to filter by invoice status
4. Add invoice summary to delivery scheduling
5. Implement payment collection on delivery

---

## Summary

This comprehensive plan provides:

1. **Warranty Validation** - Automatic check at claim creation with override option
2. **Quotation System** - Full quotation workflow for non-warranty claims
3. **Inventory Management** - Complete parts/components inventory with stock tracking
4. **Parts Tracking** - Both inventory and manual entry support
5. **Service Charges** - Flexible cost tracking
6. **Invoice Generation** - Professional invoice with PDF export
7. **Delivery Integration** - Seamless handoff to logistics

The system is designed to be:
- **Industry-ready** - Follows standard service center workflows
- **Flexible** - Supports both warranty and paid repairs
- **Dynamic** - Easy to add items from inventory or manually
- **Integrated** - Connects seamlessly with existing workflow and delivery systems
- **User-friendly** - Step-by-step finalization process
