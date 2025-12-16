// ===========================================
// Permission Constants
// All available permissions in the system
// ===========================================

// Permission definitions with labels
export const PERMISSIONS = {
  // Dashboard
  "dashboard.view": "View Dashboard",

  // Users Management
  "users.view": "View Users",
  "users.create": "Create Users",
  "users.edit": "Edit Users",
  "users.delete": "Delete Users",

  // Roles Management
  "roles.view": "View Roles",
  "roles.create": "Create Roles",
  "roles.edit": "Edit Roles",
  "roles.delete": "Delete Roles",

  // Products Management
  "products.view": "View Products",
  "products.create": "Create Products",
  "products.edit": "Edit Products",
  "products.delete": "Delete Products",

  // Categories Management
  "categories.view": "View Categories",
  "categories.create": "Create Categories",
  "categories.edit": "Edit Categories",
  "categories.delete": "Delete Categories",

  // Inventory Management
  "inventory.view": "View Inventory",
  "inventory.create": "Create Inventory Items",
  "inventory.edit": "Edit Inventory Items",
  "inventory.delete": "Delete Inventory Items",
  "inventory.adjust_stock": "Adjust Stock Levels",

  // Shops Management
  "shops.view": "View Shops",
  "shops.create": "Create Shops",
  "shops.edit": "Edit Shops",
  "shops.delete": "Delete Shops",

  // Customers Management
  "customers.view": "View Customers",
  "customers.create": "Create Customers",
  "customers.edit": "Edit Customers",
  "customers.delete": "Delete Customers",

  // Warranty Cards Management
  "warranty_cards.view": "View Warranty Cards",
  "warranty_cards.create": "Create Warranty Cards",
  "warranty_cards.edit": "Edit Warranty Cards",
  "warranty_cards.void": "Void Warranty Cards",

  // Claims Management
  "claims.view": "View Claims",
  "claims.view_all": "View All Claims",
  "claims.view_assigned": "View Assigned Claims Only",
  "claims.create": "Create Claims",
  "claims.edit": "Edit Claims",
  "claims.process": "Process Claim Steps",
  "claims.assign": "Assign Claims",
  "claims.close": "Close Claims",

  // Workflows Management
  "workflows.view": "View Workflows",
  "workflows.create": "Create Workflows",
  "workflows.edit": "Edit Workflows",
  "workflows.delete": "Delete Workflows",

  // Logistics Management
  "logistics.view": "View Logistics",
  "logistics.manage_pickups": "Manage Pickups",
  "logistics.manage_deliveries": "Manage Deliveries",
  "logistics.manage_collectors": "Manage Collectors",
  "logistics.create_collection": "Create Collection Trips",
  "logistics.receive": "Receive Trips at Service Center",
  "logistics.create_delivery": "Create Delivery Trips",
  "logistics.my_trips": "View & Manage My Trips",
  "logistics.collect": "Perform Collections",
  "logistics.deliver": "Perform Deliveries",

  // Notifications Management
  "notifications.view_templates": "View Notification Templates",
  "notifications.manage_templates": "Manage Notification Templates",
  "notifications.send": "Send Notifications",

  // Reports
  "reports.view": "View Reports",
  "reports.export": "Export Reports",

  // Settings
  "settings.view": "View Settings",
  "settings.manage": "Manage Settings",
} as const;

// Type for permission keys
export type PermissionKey = keyof typeof PERMISSIONS;

// Get all permission keys as array
export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as PermissionKey[];

// Permission groups for easier assignment
export const PERMISSION_GROUPS = {
  "User Management": [
    "users.view",
    "users.create",
    "users.edit",
    "users.delete",
  ],
  "Role Management": [
    "roles.view",
    "roles.create",
    "roles.edit",
    "roles.delete",
  ],
  "Product Management": [
    "products.view",
    "products.create",
    "products.edit",
    "products.delete",
    "categories.view",
    "categories.create",
    "categories.edit",
    "categories.delete",
  ],
  "Inventory Management": [
    "inventory.view",
    "inventory.create",
    "inventory.edit",
    "inventory.delete",
    "inventory.adjust_stock",
  ],
  "Shop Management": [
    "shops.view",
    "shops.create",
    "shops.edit",
    "shops.delete",
  ],
  "Customer Management": [
    "customers.view",
    "customers.create",
    "customers.edit",
    "customers.delete",
  ],
  "Warranty Management": [
    "warranty_cards.view",
    "warranty_cards.create",
    "warranty_cards.edit",
    "warranty_cards.void",
  ],
  "Claims Management": [
    "claims.view",
    "claims.view_all",
    "claims.view_assigned",
    "claims.create",
    "claims.edit",
    "claims.process",
    "claims.assign",
    "claims.close",
  ],
  "Workflow Management": [
    "workflows.view",
    "workflows.create",
    "workflows.edit",
    "workflows.delete",
  ],
  "Logistics Management": [
    "logistics.view",
    "logistics.manage_pickups",
    "logistics.manage_deliveries",
    "logistics.manage_collectors",
    "logistics.create_collection",
    "logistics.receive",
    "logistics.create_delivery",
    "logistics.my_trips",
    "logistics.collect",
    "logistics.deliver",
  ],
  "Notifications": [
    "notifications.view_templates",
    "notifications.manage_templates",
    "notifications.send",
  ],
  "Reports": ["reports.view", "reports.export"],
  "Settings": ["settings.view", "settings.manage"],
} as const;

// Collector-specific permissions (auto-assigned when user is linked as collector)
export const COLLECTOR_PERMISSIONS: PermissionKey[] = [
  "dashboard.view",
  "shops.view",
  "customers.view",
  "products.view",
  "warranty_cards.view",
  "claims.view",
  "claims.view_assigned",
  "logistics.view",
  "logistics.my_trips",
  "logistics.collect",
  "logistics.deliver",
];

// Default role permissions
export const DEFAULT_ROLE_PERMISSIONS = {
  admin: ALL_PERMISSIONS,
  manager: [
    "dashboard.view",
    "users.view",
    "users.create",
    "users.edit",
    "roles.view",
    "products.view",
    "products.create",
    "products.edit",
    "categories.view",
    "categories.create",
    "categories.edit",
    "inventory.view",
    "inventory.create",
    "inventory.edit",
    "inventory.adjust_stock",
    "shops.view",
    "shops.create",
    "shops.edit",
    "customers.view",
    "customers.create",
    "customers.edit",
    "warranty_cards.view",
    "warranty_cards.create",
    "warranty_cards.edit",
    "claims.view",
    "claims.view_all",
    "claims.create",
    "claims.edit",
    "claims.process",
    "claims.assign",
    "claims.close",
    "workflows.view",
    "logistics.view",
    "logistics.manage_pickups",
    "logistics.manage_deliveries",
    "logistics.receive",
    "logistics.create_delivery",
    "notifications.view_templates",
    "notifications.send",
    "reports.view",
    "reports.export",
    "settings.view",
  ],
  technician: [
    "dashboard.view",
    "products.view",
    "inventory.view",
    "customers.view",
    "warranty_cards.view",
    "claims.view",
    "claims.view_assigned",
    "claims.process",
  ],
  receptionist: [
    "dashboard.view",
    "products.view",
    "shops.view",
    "customers.view",
    "customers.create",
    "customers.edit",
    "warranty_cards.view",
    "warranty_cards.create",
    "warranty_cards.edit",
    "claims.view",
    "claims.create",
    "logistics.view",
  ],
  collector: [
    "dashboard.view",
    "shops.view",
    "customers.view",
    "products.view",
    "warranty_cards.view",
    "claims.view",
    "claims.view_assigned",
    "logistics.view",
    "logistics.manage_pickups",
    "logistics.manage_deliveries",
    "logistics.create_collection",
  ],
} as const;
