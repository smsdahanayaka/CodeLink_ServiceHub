// ===========================================
// Database Seed Script
// Creates initial data for development/testing
// ===========================================

import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from "../src/lib/constants/permissions";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Create subscription plans
  console.log("Creating subscription plans...");
  const freePlan = await prisma.plan.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "Free",
      description: "Basic plan for small businesses",
      priceMonthly: 0,
      priceYearly: 0,
      maxUsers: 3,
      maxClaimsPerMonth: 50,
      maxWorkflows: 2,
      maxSmsPerMonth: 100,
      features: ["Basic warranty management", "Email support"],
    },
  });

  const starterPlan = await prisma.plan.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: "Starter",
      description: "For growing businesses",
      priceMonthly: 49,
      priceYearly: 490,
      maxUsers: 10,
      maxClaimsPerMonth: 200,
      maxWorkflows: 5,
      maxSmsPerMonth: 500,
      features: [
        "Basic warranty management",
        "Custom workflows",
        "SMS notifications",
        "Priority support",
      ],
    },
  });

  const proPlan = await prisma.plan.upsert({
    where: { id: 3 },
    update: {},
    create: {
      name: "Professional",
      description: "For established businesses",
      priceMonthly: 99,
      priceYearly: 990,
      maxUsers: 25,
      maxClaimsPerMonth: 1000,
      maxWorkflows: 10,
      maxSmsPerMonth: 2000,
      features: [
        "Advanced warranty management",
        "Unlimited workflows",
        "SMS & Email notifications",
        "API access",
        "Priority support",
      ],
    },
  });

  const enterprisePlan = await prisma.plan.upsert({
    where: { id: 4 },
    update: {},
    create: {
      name: "Enterprise",
      description: "For large organizations",
      priceMonthly: 249,
      priceYearly: 2490,
      maxUsers: null, // Unlimited
      maxClaimsPerMonth: null, // Unlimited
      maxWorkflows: null, // Unlimited
      maxSmsPerMonth: null, // Unlimited
      features: [
        "Everything in Professional",
        "Unlimited users",
        "Custom integrations",
        "Dedicated support",
        "SLA guarantee",
      ],
    },
  });

  console.log("✅ Plans created");

  // Create demo tenant
  console.log("Creating demo tenant...");
  const demoTenant = await prisma.tenant.upsert({
    where: { subdomain: "demo" },
    update: {},
    create: {
      uuid: uuidv4(),
      name: "Demo Company",
      subdomain: "demo",
      planId: proPlan.id,
      contactEmail: "admin@demo.codelink.com",
      contactPhone: "+91 9876543210",
      address: "123 Demo Street, Tech City, India",
      status: "ACTIVE",
      settings: {
        timezone: "Asia/Kolkata",
        dateFormat: "DD/MM/YYYY",
        currency: "INR",
      },
    },
  });

  console.log("✅ Demo tenant created");

  // Create roles for demo tenant
  console.log("Creating roles...");
  const adminRole = await prisma.role.upsert({
    where: {
      tenantId_name: {
        tenantId: demoTenant.id,
        name: "Admin",
      },
    },
    update: {},
    create: {
      tenantId: demoTenant.id,
      name: "Admin",
      description: "Full system access",
      permissions: ALL_PERMISSIONS,
      isSystem: true,
    },
  });

  const managerRole = await prisma.role.upsert({
    where: {
      tenantId_name: {
        tenantId: demoTenant.id,
        name: "Manager",
      },
    },
    update: {},
    create: {
      tenantId: demoTenant.id,
      name: "Manager",
      description: "Manage operations and staff",
      permissions: DEFAULT_ROLE_PERMISSIONS.manager,
      isSystem: true,
    },
  });

  const technicianRole = await prisma.role.upsert({
    where: {
      tenantId_name: {
        tenantId: demoTenant.id,
        name: "Technician",
      },
    },
    update: {},
    create: {
      tenantId: demoTenant.id,
      name: "Technician",
      description: "Process and repair claims",
      permissions: DEFAULT_ROLE_PERMISSIONS.technician,
      isSystem: true,
    },
  });

  const receptionistRole = await prisma.role.upsert({
    where: {
      tenantId_name: {
        tenantId: demoTenant.id,
        name: "Receptionist",
      },
    },
    update: {},
    create: {
      tenantId: demoTenant.id,
      name: "Receptionist",
      description: "Handle customer intake and warranty cards",
      permissions: DEFAULT_ROLE_PERMISSIONS.receptionist,
      isSystem: true,
    },
  });

  console.log("✅ Roles created");

  // Create admin user
  console.log("Creating admin user...");
  const hashedPassword = await hash("admin123", 12);

  const adminUser = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: demoTenant.id,
        email: "admin@demo.codelink.com",
      },
    },
    update: {},
    create: {
      uuid: uuidv4(),
      tenantId: demoTenant.id,
      roleId: adminRole.id,
      email: "admin@demo.codelink.com",
      passwordHash: hashedPassword,
      firstName: "System",
      lastName: "Admin",
      phone: "+91 9876543210",
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
    },
  });

  console.log("✅ Admin user created");
  console.log("   Email: admin@demo.codelink.com");
  console.log("   Password: admin123");
  console.log("   Company Code: demo");

  // Create sample product categories
  console.log("Creating sample data...");

  const category1 = await prisma.productCategory.upsert({
    where: { id: 1 },
    update: {},
    create: {
      tenantId: demoTenant.id,
      name: "Grinders",
      description: "Industrial grinding machines",
      sortOrder: 1,
    },
  });

  const category2 = await prisma.productCategory.upsert({
    where: { id: 2 },
    update: {},
    create: {
      tenantId: demoTenant.id,
      name: "Generators",
      description: "Power generators",
      sortOrder: 2,
    },
  });

  // Create sample products
  await prisma.product.upsert({
    where: { id: 1 },
    update: {},
    create: {
      tenantId: demoTenant.id,
      categoryId: category1.id,
      name: "Pro Grinder 5000",
      modelNumber: "PG-5000",
      sku: "SKU-001",
      description: "Professional grade industrial grinder",
      warrantyPeriodMonths: 24,
      serialNumberPrefix: "PG5K",
      isActive: true,
    },
  });

  await prisma.product.upsert({
    where: { id: 2 },
    update: {},
    create: {
      tenantId: demoTenant.id,
      categoryId: category2.id,
      name: "PowerGen 3000",
      modelNumber: "PGN-3000",
      sku: "SKU-002",
      description: "3000W portable generator",
      warrantyPeriodMonths: 12,
      serialNumberPrefix: "PGN3",
      isActive: true,
    },
  });

  // Create sample shop
  await prisma.shop.upsert({
    where: { id: 1 },
    update: {},
    create: {
      tenantId: demoTenant.id,
      code: "SHP001",
      name: "Main Dealer Store",
      email: "dealer@example.com",
      phone: "+91 9876543211",
      address: "456 Dealer Street",
      city: "Mumbai",
      state: "Maharashtra",
      postalCode: "400001",
      contactPerson: "John Dealer",
      status: "ACTIVE",
    },
  });

  // Create default workflow
  console.log("Creating default workflow...");
  const defaultWorkflow = await prisma.workflow.upsert({
    where: { id: 1 },
    update: {},
    create: {
      tenantId: demoTenant.id,
      name: "Standard Warranty Claim Process",
      description: "Default workflow for processing warranty claims",
      triggerType: "AUTO_ON_CLAIM",
      isDefault: true,
      isActive: true,
      createdBy: adminUser.id,
    },
  });

  // Create workflow steps
  const steps = [
    {
      name: "Claim Received",
      stepOrder: 1,
      stepType: "START" as const,
      statusName: "received",
      description: "Initial claim registration",
    },
    {
      name: "Initial Inspection",
      stepOrder: 2,
      stepType: "ACTION" as const,
      statusName: "inspecting",
      description: "Technician inspects the product",
      slaHours: 24,
    },
    {
      name: "Repair in Progress",
      stepOrder: 3,
      stepType: "ACTION" as const,
      statusName: "repairing",
      description: "Product is being repaired",
      slaHours: 48,
    },
    {
      name: "Quality Check",
      stepOrder: 4,
      stepType: "ACTION" as const,
      statusName: "quality_check",
      description: "Final quality inspection",
      slaHours: 8,
    },
    {
      name: "Ready for Delivery",
      stepOrder: 5,
      stepType: "END" as const,
      statusName: "completed",
      description: "Claim resolved, ready for return",
    },
  ];

  for (const step of steps) {
    await prisma.workflowStep.upsert({
      where: { id: step.stepOrder },
      update: {},
      create: {
        workflowId: defaultWorkflow.id,
        ...step,
      },
    });
  }

  console.log("✅ Default workflow created");

  console.log("");
  console.log("🎉 Database seed completed successfully!");
  console.log("");
  console.log("You can now login with:");
  console.log("  Company Code: demo");
  console.log("  Email: admin@demo.codelink.com");
  console.log("  Password: admin123");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
