-- AlterTable
ALTER TABLE `pickups` ADD COLUMN `customerAddress` TEXT NULL,
    ADD COLUMN `customerName` VARCHAR(255) NULL,
    ADD COLUMN `customerPhone` VARCHAR(50) NULL,
    ADD COLUMN `rejectedAt` DATETIME(3) NULL,
    ADD COLUMN `rejectedBy` INTEGER NULL,
    ADD COLUMN `rejectionReason` TEXT NULL,
    ADD COLUMN `warrantyCardId` INTEGER NULL,
    MODIFY `status` ENUM('PENDING', 'ASSIGNED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED', 'REJECTED') NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE `shops` ADD COLUMN `isVerified` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `warranty_claims` ADD COLUMN `currentStepStartedAt` DATETIME(3) NULL,
    ADD COLUMN `dueDate` DATETIME(3) NULL,
    ADD COLUMN `dueDateSource` VARCHAR(50) NULL,
    ADD COLUMN `isUnderWarranty` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `quotationApprovedAt` DATETIME(3) NULL,
    ADD COLUMN `requiresQuotation` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `warrantyOverrideAt` DATETIME(3) NULL,
    ADD COLUMN `warrantyOverrideBy` INTEGER NULL,
    ADD COLUMN `warrantyOverrideReason` TEXT NULL;

-- AlterTable
ALTER TABLE `workflow_steps` ADD COLUMN `requireNextUserSelection` BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE `claim_step_assignments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `claimId` INTEGER NOT NULL,
    `workflowStepId` INTEGER NOT NULL,
    `assignedUserId` INTEGER NOT NULL,
    `assignedBy` INTEGER NOT NULL,
    `notes` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `claim_step_assignments_claimId_idx`(`claimId`),
    INDEX `claim_step_assignments_assignedUserId_idx`(`assignedUserId`),
    UNIQUE INDEX `claim_step_assignments_claimId_workflowStepId_key`(`claimId`, `workflowStepId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `claim_sub_tasks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `claimId` INTEGER NOT NULL,
    `workflowStepId` INTEGER NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `assignedTo` INTEGER NULL,
    `status` ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `priority` ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL DEFAULT 'MEDIUM',
    `dueDate` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `completedBy` INTEGER NULL,
    `createdBy` INTEGER NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `claim_sub_tasks_claimId_workflowStepId_idx`(`claimId`, `workflowStepId`),
    INDEX `claim_sub_tasks_assignedTo_status_idx`(`assignedTo`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `collection_trips` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tenantId` INTEGER NOT NULL,
    `tripNumber` VARCHAR(100) NOT NULL,
    `collectorId` INTEGER NOT NULL,
    `fromType` ENUM('SHOP', 'CUSTOMER') NOT NULL DEFAULT 'SHOP',
    `shopId` INTEGER NULL,
    `customerName` VARCHAR(255) NULL,
    `customerPhone` VARCHAR(50) NULL,
    `customerAddress` TEXT NULL,
    `status` ENUM('IN_PROGRESS', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED') NOT NULL DEFAULT 'IN_PROGRESS',
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,
    `receivedAt` DATETIME(3) NULL,
    `receivedBy` INTEGER NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `collection_trips_tenantId_status_idx`(`tenantId`, `status`),
    INDEX `collection_trips_collectorId_idx`(`collectorId`),
    UNIQUE INDEX `collection_trips_tenantId_tripNumber_key`(`tenantId`, `tripNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `collection_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tripId` INTEGER NOT NULL,
    `serialNumber` VARCHAR(100) NOT NULL,
    `issueDescription` TEXT NOT NULL,
    `warrantyCardId` INTEGER NULL,
    `productId` INTEGER NULL,
    `customerName` VARCHAR(255) NULL,
    `customerPhone` VARCHAR(50) NULL,
    `claimId` INTEGER NULL,
    `status` ENUM('COLLECTED', 'RECEIVED', 'PROCESSED') NOT NULL DEFAULT 'COLLECTED',
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `collection_items_claimId_key`(`claimId`),
    INDEX `collection_items_tripId_idx`(`tripId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `delivery_trips` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tenantId` INTEGER NOT NULL,
    `tripNumber` VARCHAR(100) NOT NULL,
    `collectorId` INTEGER NULL,
    `toType` ENUM('SHOP', 'CUSTOMER') NOT NULL DEFAULT 'SHOP',
    `shopId` INTEGER NULL,
    `customerName` VARCHAR(255) NULL,
    `customerPhone` VARCHAR(50) NULL,
    `customerAddress` TEXT NULL,
    `status` ENUM('PENDING', 'ASSIGNED', 'IN_TRANSIT', 'COMPLETED', 'PARTIAL', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `scheduledDate` DATE NULL,
    `scheduledSlot` VARCHAR(50) NULL,
    `dispatchedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `recipientName` VARCHAR(255) NULL,
    `signatureUrl` VARCHAR(500) NULL,
    `notes` TEXT NULL,
    `createdBy` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `delivery_trips_tenantId_status_idx`(`tenantId`, `status`),
    INDEX `delivery_trips_collectorId_idx`(`collectorId`),
    UNIQUE INDEX `delivery_trips_tenantId_tripNumber_key`(`tenantId`, `tripNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `delivery_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tripId` INTEGER NOT NULL,
    `claimId` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'DELIVERED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `failureReason` TEXT NULL,
    `deliveredAt` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `delivery_items_tripId_idx`(`tripId`),
    INDEX `delivery_items_claimId_idx`(`claimId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tenantId` INTEGER NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `parentId` INTEGER NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tenantId` INTEGER NOT NULL,
    `categoryId` INTEGER NULL,
    `sku` VARCHAR(100) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `quantity` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `reservedQuantity` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `reorderLevel` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `reorderQuantity` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `costPrice` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `sellingPrice` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `unit` VARCHAR(50) NOT NULL DEFAULT 'pcs',
    `location` VARCHAR(255) NULL,
    `supplier` VARCHAR(255) NULL,
    `barcode` VARCHAR(100) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `inventory_items_tenantId_isActive_idx`(`tenantId`, `isActive`),
    UNIQUE INDEX `inventory_items_tenantId_sku_key`(`tenantId`, `sku`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tenantId` INTEGER NOT NULL,
    `itemId` INTEGER NOT NULL,
    `transactionType` ENUM('STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'RESERVED', 'UNRESERVED', 'RETURN') NOT NULL,
    `quantity` DECIMAL(10, 2) NOT NULL,
    `referenceType` VARCHAR(50) NULL,
    `referenceId` INTEGER NULL,
    `unitCost` DECIMAL(12, 2) NULL,
    `totalCost` DECIMAL(12, 2) NULL,
    `previousQuantity` DECIMAL(10, 2) NOT NULL,
    `newQuantity` DECIMAL(10, 2) NOT NULL,
    `notes` TEXT NULL,
    `createdBy` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `inventory_transactions_tenantId_itemId_idx`(`tenantId`, `itemId`),
    INDEX `inventory_transactions_referenceType_referenceId_idx`(`referenceType`, `referenceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `claim_quotations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tenantId` INTEGER NOT NULL,
    `claimId` INTEGER NOT NULL,
    `quotationNumber` VARCHAR(100) NOT NULL,
    `status` ENUM('DRAFT', 'SENT', 'VIEWED', 'APPROVED', 'REJECTED', 'EXPIRED', 'CONVERTED') NOT NULL DEFAULT 'DRAFT',
    `subtotal` DECIMAL(12, 2) NOT NULL,
    `taxRate` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `taxAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `discountType` ENUM('PERCENTAGE', 'FIXED') NULL,
    `discountValue` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `discountAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `totalAmount` DECIMAL(12, 2) NOT NULL,
    `validUntil` DATETIME(3) NULL,
    `sentAt` DATETIME(3) NULL,
    `sentVia` VARCHAR(50) NULL,
    `viewedAt` DATETIME(3) NULL,
    `approvedAt` DATETIME(3) NULL,
    `approvedBy` VARCHAR(255) NULL,
    `rejectedAt` DATETIME(3) NULL,
    `rejectionReason` TEXT NULL,
    `notes` TEXT NULL,
    `termsAndConditions` TEXT NULL,
    `createdBy` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `claim_quotations_claimId_idx`(`claimId`),
    UNIQUE INDEX `claim_quotations_tenantId_quotationNumber_key`(`tenantId`, `quotationNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quotation_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `quotationId` INTEGER NOT NULL,
    `itemType` ENUM('PART', 'SERVICE', 'LABOR', 'OTHER') NOT NULL,
    `inventoryItemId` INTEGER NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `sku` VARCHAR(100) NULL,
    `quantity` DECIMAL(10, 2) NOT NULL,
    `unitPrice` DECIMAL(12, 2) NOT NULL,
    `totalPrice` DECIMAL(12, 2) NOT NULL,
    `isWarrantyCovered` BOOLEAN NOT NULL DEFAULT false,
    `warrantyNotes` TEXT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `quotation_items_quotationId_idx`(`quotationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `claim_parts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `claimId` INTEGER NOT NULL,
    `partType` ENUM('INVENTORY', 'MANUAL') NOT NULL DEFAULT 'INVENTORY',
    `inventoryItemId` INTEGER NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `sku` VARCHAR(100) NULL,
    `quantity` DECIMAL(10, 2) NOT NULL,
    `unitCost` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `unitPrice` DECIMAL(12, 2) NOT NULL,
    `totalPrice` DECIMAL(12, 2) NOT NULL,
    `isWarrantyCovered` BOOLEAN NOT NULL DEFAULT false,
    `isNewItemIssue` BOOLEAN NOT NULL DEFAULT false,
    `isIssued` BOOLEAN NOT NULL DEFAULT false,
    `issuedAt` DATETIME(3) NULL,
    `issuedBy` INTEGER NULL,
    `notes` TEXT NULL,
    `createdBy` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `claim_parts_claimId_idx`(`claimId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `claim_service_charges` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `claimId` INTEGER NOT NULL,
    `chargeType` ENUM('LABOR', 'SERVICE_VISIT', 'TRANSPORTATION', 'DIAGNOSIS', 'INSTALLATION', 'OTHER') NOT NULL,
    `description` VARCHAR(255) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `isWarrantyCovered` BOOLEAN NOT NULL DEFAULT false,
    `notes` TEXT NULL,
    `createdBy` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `claim_service_charges_claimId_idx`(`claimId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `claim_invoices` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tenantId` INTEGER NOT NULL,
    `claimId` INTEGER NOT NULL,
    `quotationId` INTEGER NULL,
    `invoiceNumber` VARCHAR(100) NOT NULL,
    `invoiceDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` ENUM('DRAFT', 'GENERATED', 'SENT', 'PAID', 'PARTIALLY_PAID', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `customerName` VARCHAR(255) NOT NULL,
    `customerPhone` VARCHAR(50) NOT NULL,
    `customerEmail` VARCHAR(255) NULL,
    `customerAddress` TEXT NULL,
    `subtotal` DECIMAL(12, 2) NOT NULL,
    `taxRate` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `taxAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `discountType` ENUM('PERCENTAGE', 'FIXED') NULL,
    `discountValue` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `discountAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `totalAmount` DECIMAL(12, 2) NOT NULL,
    `warrantyCoveredAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `paidAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `paymentStatus` ENUM('UNPAID', 'PARTIAL', 'PAID') NOT NULL DEFAULT 'UNPAID',
    `paymentMethod` VARCHAR(50) NULL,
    `paymentReference` VARCHAR(255) NULL,
    `paidAt` DATETIME(3) NULL,
    `isReadyForDelivery` BOOLEAN NOT NULL DEFAULT false,
    `notes` TEXT NULL,
    `termsAndConditions` TEXT NULL,
    `pdfUrl` VARCHAR(500) NULL,
    `createdBy` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `claim_invoices_claimId_key`(`claimId`),
    UNIQUE INDEX `claim_invoices_quotationId_key`(`quotationId`),
    UNIQUE INDEX `claim_invoices_tenantId_invoiceNumber_key`(`tenantId`, `invoiceNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoice_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoiceId` INTEGER NOT NULL,
    `itemType` ENUM('PART', 'SERVICE', 'LABOR', 'OTHER') NOT NULL,
    `claimPartId` INTEGER NULL,
    `claimServiceChargeId` INTEGER NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `sku` VARCHAR(100) NULL,
    `quantity` DECIMAL(10, 2) NOT NULL,
    `unitPrice` DECIMAL(12, 2) NOT NULL,
    `totalPrice` DECIMAL(12, 2) NOT NULL,
    `isWarrantyCovered` BOOLEAN NOT NULL DEFAULT false,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `invoice_items_invoiceId_idx`(`invoiceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `pickups_warrantyCardId_idx` ON `pickups`(`warrantyCardId`);

-- CreateIndex
CREATE INDEX `shops_isVerified_idx` ON `shops`(`isVerified`);

-- AddForeignKey
ALTER TABLE `warranty_claims` ADD CONSTRAINT `warranty_claims_warrantyOverrideBy_fkey` FOREIGN KEY (`warrantyOverrideBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `claim_step_assignments` ADD CONSTRAINT `claim_step_assignments_claimId_fkey` FOREIGN KEY (`claimId`) REFERENCES `warranty_claims`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `claim_step_assignments` ADD CONSTRAINT `claim_step_assignments_workflowStepId_fkey` FOREIGN KEY (`workflowStepId`) REFERENCES `workflow_steps`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `claim_step_assignments` ADD CONSTRAINT `claim_step_assignments_assignedUserId_fkey` FOREIGN KEY (`assignedUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `claim_step_assignments` ADD CONSTRAINT `claim_step_assignments_assignedBy_fkey` FOREIGN KEY (`assignedBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `claim_sub_tasks` ADD CONSTRAINT `claim_sub_tasks_claimId_fkey` FOREIGN KEY (`claimId`) REFERENCES `warranty_claims`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `claim_sub_tasks` ADD CONSTRAINT `claim_sub_tasks_workflowStepId_fkey` FOREIGN KEY (`workflowStepId`) REFERENCES `workflow_steps`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `claim_sub_tasks` ADD CONSTRAINT `claim_sub_tasks_assignedTo_fkey` FOREIGN KEY (`assignedTo`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `claim_sub_tasks` ADD CONSTRAINT `claim_sub_tasks_completedBy_fkey` FOREIGN KEY (`completedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `claim_sub_tasks` ADD CONSTRAINT `claim_sub_tasks_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pickups` ADD CONSTRAINT `pickups_warrantyCardId_fkey` FOREIGN KEY (`warrantyCardId`) REFERENCES `warranty_cards`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `collection_trips` ADD CONSTRAINT `collection_trips_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `collection_trips` ADD CONSTRAINT `collection_trips_collectorId_fkey` FOREIGN KEY (`collectorId`) REFERENCES `collectors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `collection_trips` ADD CONSTRAINT `collection_trips_shopId_fkey` FOREIGN KEY (`shopId`) REFERENCES `shops`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `collection_trips` ADD CONSTRAINT `collection_trips_receivedBy_fkey` FOREIGN KEY (`receivedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `collection_items` ADD CONSTRAINT `collection_items_tripId_fkey` FOREIGN KEY (`tripId`) REFERENCES `collection_trips`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `collection_items` ADD CONSTRAINT `collection_items_warrantyCardId_fkey` FOREIGN KEY (`warrantyCardId`) REFERENCES `warranty_cards`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `collection_items` ADD CONSTRAINT `collection_items_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `collection_items` ADD CONSTRAINT `collection_items_claimId_fkey` FOREIGN KEY (`claimId`) REFERENCES `warranty_claims`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `delivery_trips` ADD CONSTRAINT `delivery_trips_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `delivery_trips` ADD CONSTRAINT `delivery_trips_collectorId_fkey` FOREIGN KEY (`collectorId`) REFERENCES `collectors`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `delivery_trips` ADD CONSTRAINT `delivery_trips_shopId_fkey` FOREIGN KEY (`shopId`) REFERENCES `shops`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `delivery_trips` ADD CONSTRAINT `delivery_trips_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `delivery_items` ADD CONSTRAINT `delivery_items_tripId_fkey` FOREIGN KEY (`tripId`) REFERENCES `delivery_trips`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `delivery_items` ADD CONSTRAINT `delivery_items_claimId_fkey` FOREIGN KEY (`claimId`) REFERENCES `warranty_claims`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_categories` ADD CONSTRAINT `inventory_categories_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_categories` ADD CONSTRAINT `inventory_categories_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `inventory_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_items` ADD CONSTRAINT `inventory_items_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_items` ADD CONSTRAINT `inventory_items_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `inventory_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_transactions` ADD CONSTRAINT `inventory_transactions_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_transactions` ADD CONSTRAINT `inventory_transactions_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `inventory_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_transactions` ADD CONSTRAINT `inventory_transactions_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `claim_quotations` ADD CONSTRAINT `claim_quotations_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `claim_quotations` ADD CONSTRAINT `claim_quotations_claimId_fkey` FOREIGN KEY (`claimId`) REFERENCES `warranty_claims`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `claim_quotations` ADD CONSTRAINT `claim_quotations_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotation_items` ADD CONSTRAINT `quotation_items_quotationId_fkey` FOREIGN KEY (`quotationId`) REFERENCES `claim_quotations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotation_items` ADD CONSTRAINT `quotation_items_inventoryItemId_fkey` FOREIGN KEY (`inventoryItemId`) REFERENCES `inventory_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `claim_parts` ADD CONSTRAINT `claim_parts_claimId_fkey` FOREIGN KEY (`claimId`) REFERENCES `warranty_claims`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `claim_parts` ADD CONSTRAINT `claim_parts_inventoryItemId_fkey` FOREIGN KEY (`inventoryItemId`) REFERENCES `inventory_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `claim_parts` ADD CONSTRAINT `claim_parts_issuedBy_fkey` FOREIGN KEY (`issuedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `claim_parts` ADD CONSTRAINT `claim_parts_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `claim_service_charges` ADD CONSTRAINT `claim_service_charges_claimId_fkey` FOREIGN KEY (`claimId`) REFERENCES `warranty_claims`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `claim_service_charges` ADD CONSTRAINT `claim_service_charges_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `claim_invoices` ADD CONSTRAINT `claim_invoices_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `claim_invoices` ADD CONSTRAINT `claim_invoices_claimId_fkey` FOREIGN KEY (`claimId`) REFERENCES `warranty_claims`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `claim_invoices` ADD CONSTRAINT `claim_invoices_quotationId_fkey` FOREIGN KEY (`quotationId`) REFERENCES `claim_quotations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `claim_invoices` ADD CONSTRAINT `claim_invoices_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `claim_invoices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_claimPartId_fkey` FOREIGN KEY (`claimPartId`) REFERENCES `claim_parts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_claimServiceChargeId_fkey` FOREIGN KEY (`claimServiceChargeId`) REFERENCES `claim_service_charges`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
