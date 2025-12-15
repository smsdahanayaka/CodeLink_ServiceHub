// ===========================================
// Constants Index
// ===========================================

export * from "./permissions";

// App Configuration
export const APP_NAME = "CodeLink ServiceHub";
export const APP_DESCRIPTION =
  "SaaS Customer Support & Warranty Claim Management System";

// Pagination
export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// Date Formats
export const DATE_FORMAT = "dd/MM/yyyy";
export const DATE_TIME_FORMAT = "dd/MM/yyyy HH:mm";
export const TIME_FORMAT = "HH:mm";

// Status Labels
export const TENANT_STATUS_LABELS = {
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  CANCELLED: "Cancelled",
  TRIAL: "Trial",
} as const;

export const USER_STATUS_LABELS = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  SUSPENDED: "Suspended",
} as const;

export const SHOP_STATUS_LABELS = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  SUSPENDED: "Suspended",
} as const;

export const WARRANTY_CARD_STATUS_LABELS = {
  ACTIVE: "Active",
  EXPIRED: "Expired",
  VOID: "Void",
  CLAIMED: "Claimed",
} as const;

export const CLAIM_PRIORITY_LABELS = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
} as const;

export const CLAIM_LOCATION_LABELS = {
  CUSTOMER: "At Customer",
  SHOP: "At Shop",
  IN_TRANSIT: "In Transit",
  SERVICE_CENTER: "At Service Center",
} as const;

export const PICKUP_STATUS_LABELS = {
  PENDING: "Pending",
  ASSIGNED: "Assigned",
  IN_TRANSIT: "In Transit",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
} as const;

export const DELIVERY_STATUS_LABELS = {
  PENDING: "Pending",
  ASSIGNED: "Assigned",
  IN_TRANSIT: "In Transit",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  FAILED: "Failed",
} as const;

// Status Colors (for badges)
export const STATUS_COLORS = {
  // General
  ACTIVE: "green",
  INACTIVE: "gray",
  SUSPENDED: "red",
  CANCELLED: "red",
  TRIAL: "blue",

  // Warranty
  EXPIRED: "gray",
  VOID: "red",
  CLAIMED: "yellow",

  // Priority
  LOW: "gray",
  MEDIUM: "blue",
  HIGH: "orange",
  URGENT: "red",

  // Logistics
  PENDING: "yellow",
  ASSIGNED: "blue",
  IN_TRANSIT: "purple",
  COMPLETED: "green",
  FAILED: "red",
} as const;
