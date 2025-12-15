// ===========================================
// TypeScript Type Definitions
// ===========================================

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: PaginationMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Query Parameters
export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// Select Options
export interface SelectOption {
  label: string;
  value: string | number;
}

// Form States
export interface FormState {
  isLoading: boolean;
  error: string | null;
}

// Navigation Menu Item
export interface MenuItem {
  title: string;
  href: string;
  icon?: string;
  permission?: string;
  children?: MenuItem[];
}

// Dashboard Stats
export interface DashboardStats {
  totalClaims: number;
  pendingClaims: number;
  completedClaims: number;
  totalWarrantyCards: number;
  activeWarrantyCards: number;
  expiredWarrantyCards: number;
}

// User with Role
export interface UserWithRole {
  id: number;
  uuid: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  role: {
    id: number;
    name: string;
    permissions: string[];
  };
  createdAt: Date;
  lastLoginAt: Date | null;
}

// Claim with Relations
export interface ClaimWithRelations {
  id: number;
  claimNumber: string;
  issueDescription: string;
  issueCategory: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  currentStatus: string;
  currentLocation: "CUSTOMER" | "SHOP" | "IN_TRANSIT" | "SERVICE_CENTER";
  createdAt: Date;
  updatedAt: Date;
  warrantyCard: {
    cardNumber: string;
    serialNumber: string;
    product: {
      name: string;
      modelNumber: string | null;
    };
    customer: {
      name: string;
      phone: string;
    };
    shop: {
      name: string;
    };
  };
  assignedUser: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
}

// Warranty Card with Relations
export interface WarrantyCardWithRelations {
  id: number;
  cardNumber: string;
  serialNumber: string;
  purchaseDate: Date;
  warrantyStartDate: Date;
  warrantyEndDate: Date;
  status: "ACTIVE" | "EXPIRED" | "VOID" | "CLAIMED";
  product: {
    name: string;
    modelNumber: string | null;
  };
  customer: {
    name: string;
    phone: string;
    email: string | null;
  };
  shop: {
    name: string;
    code: string | null;
  };
}

// Workflow Types
export interface WorkflowStep {
  id: number;
  name: string;
  description: string | null;
  stepOrder: number;
  stepType: "START" | "ACTION" | "DECISION" | "NOTIFICATION" | "WAIT" | "END";
  statusName: string;
  slaHours: number | null;
  isOptional: boolean;
  canSkip: boolean;
}

export interface WorkflowWithSteps {
  id: number;
  name: string;
  description: string | null;
  isDefault: boolean;
  isActive: boolean;
  steps: WorkflowStep[];
}

// Notification Types
export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: Date;
}
