// ===========================================
// Zod Validation Schemas
// ===========================================

import { z } from "zod";

// ==================== User Schemas ====================

export const createUserSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  roleId: z.number().min(1, "Please select a role"),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).default("ACTIVE"),
});

export const updateUserSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  roleId: z.number().min(1, "Please select a role"),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

// ==================== Role Schemas ====================

export const createRoleSchema = z.object({
  name: z.string().min(1, "Role name is required"),
  description: z.string().optional(),
  permissions: z.array(z.string()), // Allow empty permissions array
});

export const updateRoleSchema = createRoleSchema;

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

// ==================== Product Category Schemas ====================

export const createCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  description: z.string().optional(),
  parentId: z.number().nullable().optional(),
  sortOrder: z.number().default(0),
});

export const updateCategorySchema = createCategorySchema;

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

// ==================== Product Schemas ====================

export const createProductSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  modelNumber: z.string().optional(),
  sku: z.string().optional(),
  description: z.string().optional(),
  categoryId: z.number().nullable().optional(),
  warrantyPeriodMonths: z.number().min(1).default(12),
  serialNumberPrefix: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const updateProductSchema = createProductSchema;

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

// ==================== Shop Schemas ====================

export const createShopSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(1, "Shop name is required"),
  email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default("India"),
  contactPerson: z.string().optional(),
  contactPhone: z.string().optional(),
  gstNumber: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).default("ACTIVE"),
  notes: z.string().optional(),
  isVerified: z.boolean().optional(), // For shop verification workflow
});

export const updateShopSchema = createShopSchema;

export type CreateShopInput = z.infer<typeof createShopSchema>;
export type UpdateShopInput = z.infer<typeof updateShopSchema>;

// ==================== Customer Schemas ====================

export const createCustomerSchema = z.object({
  name: z.string().min(1, "Customer name is required"),
  email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  phone: z.string().min(1, "Phone number is required"),
  alternatePhone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default("India"),
  shopId: z.number().nullable().optional(),
  notes: z.string().optional(),
});

export const updateCustomerSchema = createCustomerSchema;

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

// ==================== Warranty Card Schemas ====================

export const createWarrantyCardSchema = z.object({
  productId: z.number().min(1, "Please select a product"),
  customerId: z.number().nullable().optional(), // Optional - shops are primary contact
  shopId: z.number().nullable().optional(), // Optional if creating new shop
  serialNumber: z.string().min(1, "Serial number is required"),
  purchaseDate: z.string().min(1, "Purchase date is required"),
  invoiceNumber: z.string().optional(),
  invoiceAmount: z.number().optional(),
  notes: z.string().optional(),
  // Inline customer creation (optional)
  newCustomer: z.object({
    name: z.string().min(1, "Customer name is required"),
    phone: z.string().min(1, "Phone number is required"),
    email: z.string().email("Invalid email").optional().or(z.literal("")),
  }).optional(),
  // New shop creation (when shop not in list)
  newShop: z.object({
    name: z.string().min(1, "Shop name is required"),
    phone: z.string().min(1, "Phone is required"),
    address: z.string().optional(),
    city: z.string().optional(),
  }).optional(),
});

export const updateWarrantyCardSchema = createWarrantyCardSchema.partial();

export type CreateWarrantyCardInput = z.infer<typeof createWarrantyCardSchema>;
export type UpdateWarrantyCardInput = z.infer<typeof updateWarrantyCardSchema>;

// ==================== Warranty Claim Schemas ====================

export const createClaimSchema = z.object({
  warrantyCardId: z.number().min(1, "Please select a warranty card"),
  issueDescription: z.string().min(1, "Please describe the issue"),
  issueCategory: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  reportedBy: z.enum(["CUSTOMER", "SHOP", "INTERNAL"]).default("SHOP"),
  // Phase 5: Warranty validation fields
  isUnderWarranty: z.boolean().default(true),
  warrantyOverride: z.boolean().default(false), // If true, override warranty decision
  warrantyOverrideReason: z.string().optional(),
  requiresQuotation: z.boolean().default(false), // If true, quotation needed before repair
});

export type CreateClaimInput = z.infer<typeof createClaimSchema>;

// ==================== Workflow Schemas ====================

// Form field schema for workflow steps
export const formFieldSchema = z.object({
  name: z.string().min(1, "Field name is required"),
  label: z.string().min(1, "Field label is required"),
  type: z.enum(["text", "textarea", "number", "select", "multi_select", "date", "file", "checkbox"]),
  required: z.boolean().default(false),
  options: z.array(z.object({
    label: z.string(),
    value: z.string(),
  })).optional(),
  validation: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
    message: z.string().optional(),
  }).optional(),
  placeholder: z.string().optional(),
  defaultValue: z.string().optional(),
});

export type FormField = z.infer<typeof formFieldSchema>;

// Workflow condition schema
export const workflowConditionSchema = z.object({
  field: z.string().min(1, "Field is required"),
  operator: z.enum(["equals", "not_equals", "greater_than", "less_than", "contains", "not_contains", "in", "not_in", "is_empty", "is_not_empty"]),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
  logicalOperator: z.enum(["AND", "OR"]).optional(),
});

export type WorkflowCondition = z.infer<typeof workflowConditionSchema>;

// Step transition schema
export const stepTransitionSchema = z.object({
  id: z.number().optional(), // Optional for new transitions
  toStepId: z.number().min(1, "Target step is required"),
  transitionName: z.string().optional(),
  conditionType: z.enum(["ALWAYS", "CONDITIONAL", "USER_CHOICE"]).default("ALWAYS"),
  conditions: z.array(workflowConditionSchema).optional(),
  priority: z.number().default(0),
});

export type StepTransitionInput = z.infer<typeof stepTransitionSchema>;

// Workflow step schema
export const createWorkflowStepSchema = z.object({
  name: z.string().min(1, "Step name is required"),
  description: z.string().optional(),
  stepOrder: z.number().min(0, "Step order must be non-negative"),
  stepType: z.enum(["START", "ACTION", "DECISION", "NOTIFICATION", "WAIT", "END"]).default("ACTION"),
  statusName: z.string().min(1, "Status name is required"),
  config: z.record(z.string(), z.unknown()).optional(),
  requiredRoleId: z.number().nullable().optional(),
  requiredPermissions: z.array(z.string()).optional(),
  slaHours: z.number().nullable().optional(),
  slaWarningHours: z.number().nullable().optional(),
  autoAssignTo: z.number().nullable().optional(),
  formFields: z.array(formFieldSchema).optional(),
  isOptional: z.boolean().default(false),
  canSkip: z.boolean().default(false),
  // Visual position for workflow builder
  positionX: z.number().optional(),
  positionY: z.number().optional(),
});

export const updateWorkflowStepSchema = createWorkflowStepSchema.partial().extend({
  id: z.number(),
});

export type CreateWorkflowStepInput = z.infer<typeof createWorkflowStepSchema>;
export type UpdateWorkflowStepInput = z.infer<typeof updateWorkflowStepSchema>;

// Create workflow schema
export const createWorkflowSchema = z.object({
  name: z.string().min(1, "Workflow name is required"),
  description: z.string().optional(),
  triggerType: z.enum(["MANUAL", "AUTO_ON_CLAIM", "CONDITIONAL"]).default("AUTO_ON_CLAIM"),
  triggerConditions: z.array(workflowConditionSchema).optional(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const updateWorkflowSchema = createWorkflowSchema.partial();

export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;
export type UpdateWorkflowInput = z.infer<typeof updateWorkflowSchema>;

// Complete workflow with steps schema (for saving entire workflow)
export const saveWorkflowSchema = z.object({
  workflow: createWorkflowSchema,
  steps: z.array(createWorkflowStepSchema.extend({
    tempId: z.string().optional(), // Temporary ID for new steps
    transitions: z.array(z.object({
      toStepTempId: z.string().optional(), // Reference to tempId for new steps
      toStepId: z.number().optional(), // Reference to existing step ID
      transitionName: z.string().optional(),
      conditionType: z.enum(["ALWAYS", "CONDITIONAL", "USER_CHOICE"]).default("ALWAYS"),
      conditions: z.array(workflowConditionSchema).optional(),
      priority: z.number().default(0),
    })).optional(),
  })),
});

export type SaveWorkflowInput = z.infer<typeof saveWorkflowSchema>;

// Workflow execution schema (for processing claims)
export const executeWorkflowStepSchema = z.object({
  claimId: z.number().min(1, "Claim ID is required"),
  stepId: z.number().min(1, "Step ID is required"),
  action: z.enum(["complete", "skip", "reject", "escalate"]).default("complete"),
  transitionId: z.number().optional(), // For user_choice transitions
  formData: z.record(z.string(), z.unknown()).optional(), // Dynamic form data
  notes: z.string().optional(),
  attachments: z.array(z.string()).optional(),
});

export type ExecuteWorkflowStepInput = z.infer<typeof executeWorkflowStepSchema>;

// Assign claim to workflow schema
export const assignWorkflowSchema = z.object({
  claimId: z.number().min(1, "Claim ID is required"),
  workflowId: z.number().min(1, "Workflow ID is required"),
});

export type AssignWorkflowInput = z.infer<typeof assignWorkflowSchema>;

// ==================== Logistics - Collector Schemas ====================

export const createCollectorSchema = z.object({
  name: z.string().min(1, "Collector name is required"),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  userId: z.number().nullable().optional(),
  vehicleNumber: z.string().optional(),
  vehicleType: z.string().optional(),
  assignedAreas: z.array(z.string()).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE"]).default("ACTIVE"),
});

export const updateCollectorSchema = createCollectorSchema.partial();

export type CreateCollectorInput = z.infer<typeof createCollectorSchema>;
export type UpdateCollectorInput = z.infer<typeof updateCollectorSchema>;

// ==================== Logistics - Pickup Schemas ====================

export const createPickupSchema = z.object({
  // Can be based on claim OR warranty card
  claimId: z.number().nullable().optional(),
  warrantyCardId: z.number().nullable().optional(),
  // Pickup details
  collectorId: z.number().nullable().optional(),
  fromType: z.enum(["SHOP", "CUSTOMER"]).default("SHOP"),
  fromShopId: z.number().nullable().optional(),
  fromAddress: z.string().optional(),
  toLocation: z.string().default("Service Center"),
  scheduledDate: z.string().optional(), // ISO date string
  scheduledTimeSlot: z.string().optional(),
  notes: z.string().optional(),
  // Optional issue description for creating claim
  issueDescription: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  // Customer info for pickup
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerAddress: z.string().optional(),
});

export const updatePickupSchema = z.object({
  collectorId: z.number().nullable().optional(),
  fromType: z.enum(["SHOP", "CUSTOMER"]).optional(),
  fromShopId: z.number().nullable().optional(),
  fromAddress: z.string().optional(),
  toLocation: z.string().optional(),
  scheduledDate: z.string().optional(),
  scheduledTimeSlot: z.string().optional(),
  status: z.enum(["PENDING", "ASSIGNED", "IN_TRANSIT", "COMPLETED", "CANCELLED"]).optional(),
  notes: z.string().optional(),
});

export const completePickupSchema = z.object({
  receiverName: z.string().min(1, "Receiver name is required"),
  notes: z.string().optional(),
});

export type CreatePickupInput = z.infer<typeof createPickupSchema>;
export type UpdatePickupInput = z.infer<typeof updatePickupSchema>;
export type CompletePickupInput = z.infer<typeof completePickupSchema>;

// ==================== Logistics - Delivery Schemas ====================

export const createDeliverySchema = z.object({
  claimId: z.number().min(1, "Claim is required"),
  collectorId: z.number().nullable().optional(),
  fromLocation: z.string().default("Service Center"),
  toType: z.enum(["SHOP", "CUSTOMER"]).default("SHOP"),
  toShopId: z.number().nullable().optional(),
  toAddress: z.string().optional(),
  scheduledDate: z.string().optional(), // ISO date string
  scheduledTimeSlot: z.string().optional(),
  notes: z.string().optional(),
});

export const updateDeliverySchema = z.object({
  collectorId: z.number().nullable().optional(),
  fromLocation: z.string().optional(),
  toType: z.enum(["SHOP", "CUSTOMER"]).optional(),
  toShopId: z.number().nullable().optional(),
  toAddress: z.string().optional(),
  scheduledDate: z.string().optional(),
  scheduledTimeSlot: z.string().optional(),
  status: z.enum(["PENDING", "ASSIGNED", "IN_TRANSIT", "COMPLETED", "CANCELLED", "FAILED"]).optional(),
  notes: z.string().optional(),
});

export const completeDeliverySchema = z.object({
  recipientName: z.string().min(1, "Recipient name is required"),
  signatureUrl: z.string().optional(),
  deliveryProofUrl: z.string().optional(),
  notes: z.string().optional(),
});

export const failDeliverySchema = z.object({
  failureReason: z.string().min(1, "Failure reason is required"),
  notes: z.string().optional(),
});

export type CreateDeliveryInput = z.infer<typeof createDeliverySchema>;
export type UpdateDeliveryInput = z.infer<typeof updateDeliverySchema>;
export type CompleteDeliveryInput = z.infer<typeof completeDeliverySchema>;
export type FailDeliveryInput = z.infer<typeof failDeliverySchema>;

// ==================== Claim Step Assignment Schemas ====================

export const createStepAssignmentSchema = z.object({
  workflowStepId: z.number().min(1, "Step ID is required"),
  assignedUserId: z.number().min(1, "User ID is required"),
  notes: z.string().optional(),
});

export const bulkStepAssignmentSchema = z.object({
  assignments: z.array(createStepAssignmentSchema).min(1, "At least one assignment required"),
});

export type CreateStepAssignmentInput = z.infer<typeof createStepAssignmentSchema>;
export type BulkStepAssignmentInput = z.infer<typeof bulkStepAssignmentSchema>;

// ==================== Claim Sub-Task Schemas ====================

export const createSubTaskSchema = z.object({
  workflowStepId: z.number().min(1, "Step ID is required"),
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  assignedTo: z.number().nullable().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  dueDate: z.string().optional(), // ISO date string
});

export const updateSubTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  assignedTo: z.number().nullable().optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  dueDate: z.string().nullable().optional(),
});

export const completeSubTaskSchema = z.object({
  notes: z.string().optional(),
});

export type CreateSubTaskInput = z.infer<typeof createSubTaskSchema>;
export type UpdateSubTaskInput = z.infer<typeof updateSubTaskSchema>;
export type CompleteSubTaskInput = z.infer<typeof completeSubTaskSchema>;

// ==================== Enhanced Workflow Execute Schema ====================

export const enhancedExecuteWorkflowStepSchema = z.object({
  claimId: z.number().min(1, "Claim ID is required"),
  stepId: z.number().min(1, "Step ID is required"),
  action: z.enum(["complete", "skip", "reject", "escalate"]).default("complete"),
  transitionId: z.number().optional(),
  formData: z.record(z.string(), z.unknown()).optional(),
  notes: z.string().optional(),
  attachments: z.array(z.string()).optional(),
  nextAssignedUserId: z.number().optional(), // Required if next step has no pre-mapping
  forceComplete: z.boolean().default(false), // Admin override for pending sub-tasks
});

export type EnhancedExecuteWorkflowStepInput = z.infer<typeof enhancedExecuteWorkflowStepSchema>;

// ==================== Collection Trip Schemas (Phase 4) ====================

export const collectionItemSchema = z.object({
  serialNumber: z.string().min(1, "Serial number is required"),
  issueDescription: z.string().min(1, "Issue description is required"),
  warrantyCardId: z.number().nullable().optional(),
  productId: z.number().nullable().optional(),
  customerName: z.string().nullable().optional(),
  customerPhone: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const createCollectionTripSchema = z.object({
  fromType: z.enum(["SHOP", "CUSTOMER"]).default("SHOP"),
  shopId: z.number().nullable().optional(),
  customerName: z.string().nullable().optional(),
  customerPhone: z.string().nullable().optional(),
  customerAddress: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  items: z.array(collectionItemSchema).optional(),
});

export const addCollectionItemSchema = collectionItemSchema;

export const updateCollectionTripSchema = z.object({
  notes: z.string().nullable().optional(),
  status: z.enum(["IN_PROGRESS", "IN_TRANSIT", "RECEIVED", "CANCELLED"]).optional(),
});

export const receiveCollectionTripSchema = z.object({
  itemActions: z.array(z.object({
    itemId: z.number().min(1),
    action: z.enum(["receive", "skip"]),
    // For items without warranty cards - create new warranty card and claim
    createWarrantyCard: z.boolean().default(false),
    productId: z.number().optional(),
    customerName: z.string().nullable().optional(),
    customerPhone: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
  })).optional(),
  notes: z.string().nullable().optional(),
});

export type CollectionItemInput = z.infer<typeof collectionItemSchema>;
export type CreateCollectionTripInput = z.infer<typeof createCollectionTripSchema>;
export type AddCollectionItemInput = z.infer<typeof addCollectionItemSchema>;
export type UpdateCollectionTripInput = z.infer<typeof updateCollectionTripSchema>;
export type ReceiveCollectionTripInput = z.infer<typeof receiveCollectionTripSchema>;

// ==================== Delivery Trip Schemas (Phase 4) ====================

export const createDeliveryTripSchema = z.object({
  toType: z.enum(["SHOP", "CUSTOMER"]).default("SHOP"),
  shopId: z.number().nullable().optional(),
  customerName: z.string().nullable().optional(),
  customerPhone: z.string().nullable().optional(),
  customerAddress: z.string().nullable().optional(),
  collectorId: z.number().nullable().optional(),
  scheduledDate: z.string().nullable().optional(),
  scheduledSlot: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  claimIds: z.array(z.number()).min(1, "At least one claim is required"),
});

export const updateDeliveryTripSchema = z.object({
  collectorId: z.number().nullable().optional(),
  scheduledDate: z.string().nullable().optional(),
  scheduledSlot: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const dispatchDeliveryTripSchema = z.object({
  collectorId: z.number().min(1, "Collector is required"),
});

export const completeDeliveryTripSchema = z.object({
  recipientName: z.string().min(1, "Recipient name is required"),
  signatureUrl: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const updateDeliveryItemSchema = z.object({
  status: z.enum(["PENDING", "DELIVERED", "FAILED"]),
  failureReason: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export type CreateDeliveryTripInput = z.infer<typeof createDeliveryTripSchema>;
export type UpdateDeliveryTripInput = z.infer<typeof updateDeliveryTripSchema>;
export type DispatchDeliveryTripInput = z.infer<typeof dispatchDeliveryTripSchema>;
export type CompleteDeliveryTripInput = z.infer<typeof completeDeliveryTripSchema>;
export type UpdateDeliveryItemInput = z.infer<typeof updateDeliveryItemSchema>;

// ==================== Claim Acceptance Schemas ====================

export const acceptClaimSchema = z.object({
  // Required fields for acceptance
  warrantyCardId: z.number().min(1, "Warranty card is required"),
  productId: z.number().min(1, "Product is required"),
  customerId: z.number().min(1, "Customer is required"),
  // Optional fields that can be updated
  issueDescription: z.string().min(1, "Issue description is required"),
  issueCategory: z.string().nullable().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  notes: z.string().nullable().optional(),
});

export const updatePendingClaimSchema = z.object({
  // Allow updating claim details before acceptance
  warrantyCardId: z.number().nullable().optional(),
  productId: z.number().nullable().optional(),
  customerId: z.number().nullable().optional(),
  issueDescription: z.string().nullable().optional(),
  issueCategory: z.string().nullable().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  serialNumber: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const rejectClaimSchema = z.object({
  rejectionReason: z.string().min(1, "Rejection reason is required"),
  notes: z.string().nullable().optional(),
});

// Schema for starting a pickup (links to collection trip)
export const startPickupSchema = z.object({
  collectionTripId: z.number().nullable().optional(), // Join existing trip or create new
});

export type AcceptClaimInput = z.infer<typeof acceptClaimSchema>;
export type UpdatePendingClaimInput = z.infer<typeof updatePendingClaimSchema>;
export type RejectClaimInput = z.infer<typeof rejectClaimSchema>;
export type StartPickupInput = z.infer<typeof startPickupSchema>;
