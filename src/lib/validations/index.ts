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
  permissions: z.array(z.string()).min(1, "Select at least one permission"),
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
  shopId: z.number().min(1, "Please select a shop"),
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
});

export type CreateClaimInput = z.infer<typeof createClaimSchema>;
