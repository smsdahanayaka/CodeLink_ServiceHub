// ===========================================
// Unified Dashboard API
// Returns dashboard data based on user permissions
// ===========================================

import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse, requireAuth } from "@/lib/api-utils";

// GET /api/dashboard - Get dashboard data based on user permissions
export async function GET() {
  try {
    const user = await requireAuth();
    const permissions = user.permissions;

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Initialize response
    const dashboardData: {
      user: { id: number; name: string; role: string };
      sections: Record<string, unknown>;
      recentActivity: unknown[];
      quickActions: string[];
    } = {
      user: {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`.trim() || user.email,
        role: user.roleName,
      },
      sections: {},
      recentActivity: [],
      quickActions: [],
    };

    // ============================================
    // MY TASKS - Claims assigned to this user
    // ============================================
    if (permissions.includes("claims.view_assigned")) {
      const [assignedPending, assignedInProgress, assignedCompletedToday] = await Promise.all([
        prisma.warrantyClaim.count({
          where: {
            tenantId: user.tenantId,
            assignedTo: user.id,
            resolvedAt: null,
            currentStatus: { in: ["Pending", "Received", "Waiting for Parts"] },
          },
        }),
        prisma.warrantyClaim.count({
          where: {
            tenantId: user.tenantId,
            assignedTo: user.id,
            resolvedAt: null,
            currentStatus: { in: ["In Progress", "Under Repair", "Testing"] },
          },
        }),
        prisma.warrantyClaim.count({
          where: {
            tenantId: user.tenantId,
            assignedTo: user.id,
            resolvedAt: { gte: today, lt: tomorrow },
          },
        }),
      ]);

      // Get assigned claims list
      const assignedClaims = await prisma.warrantyClaim.findMany({
        where: {
          tenantId: user.tenantId,
          assignedTo: user.id,
          resolvedAt: null,
        },
        select: {
          id: true,
          claimNumber: true,
          currentStatus: true,
          priority: true,
          createdAt: true,
          warrantyCard: {
            select: {
              product: { select: { name: true } },
              customer: { select: { name: true } },
            },
          },
        },
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
        take: 5,
      });

      dashboardData.sections.myTasks = {
        pending: assignedPending,
        inProgress: assignedInProgress,
        completedToday: assignedCompletedToday,
        total: assignedPending + assignedInProgress,
        claims: assignedClaims,
      };

      dashboardData.quickActions.push("view_my_tasks");
    }

    // ============================================
    // MY COLLECTIONS - Collection trips for this user
    // ============================================
    if (permissions.includes("logistics.collect")) {
      // Find collector linked to this user
      const collector = await prisma.collector.findFirst({
        where: { userId: user.id, tenantId: user.tenantId },
      });

      if (collector) {
        const [activeCollections, inTransitCollections, completedToday] = await Promise.all([
          prisma.collectionTrip.count({
            where: { collectorId: collector.id, status: "IN_PROGRESS" },
          }),
          prisma.collectionTrip.count({
            where: { collectorId: collector.id, status: "IN_TRANSIT" },
          }),
          prisma.collectionTrip.count({
            where: {
              collectorId: collector.id,
              status: "RECEIVED",
              receivedAt: { gte: today, lt: tomorrow },
            },
          }),
        ]);

        const collectionTrips = await prisma.collectionTrip.findMany({
          where: {
            collectorId: collector.id,
            status: { in: ["IN_PROGRESS", "IN_TRANSIT"] },
          },
          select: {
            id: true,
            tripNumber: true,
            status: true,
            fromType: true,
            customerName: true,
            shop: { select: { id: true, name: true, address: true } },
            _count: { select: { items: true } },
          },
          orderBy: { startedAt: "desc" },
          take: 5,
        });

        dashboardData.sections.myCollections = {
          active: activeCollections,
          inTransit: inTransitCollections,
          completedToday,
          total: activeCollections + inTransitCollections,
          trips: collectionTrips,
          collectorId: collector.id,
        };

        dashboardData.quickActions.push("view_my_collections");
      }
    }

    // ============================================
    // MY DELIVERIES - Delivery trips for this user
    // ============================================
    if (permissions.includes("logistics.deliver")) {
      const collector = await prisma.collector.findFirst({
        where: { userId: user.id, tenantId: user.tenantId },
      });

      if (collector) {
        const [pendingDeliveries, inTransitDeliveries, completedToday] = await Promise.all([
          prisma.deliveryTrip.count({
            where: { collectorId: collector.id, status: "ASSIGNED" },
          }),
          prisma.deliveryTrip.count({
            where: { collectorId: collector.id, status: "IN_TRANSIT" },
          }),
          prisma.deliveryTrip.count({
            where: {
              collectorId: collector.id,
              status: "COMPLETED",
              completedAt: { gte: today, lt: tomorrow },
            },
          }),
        ]);

        const deliveryTrips = await prisma.deliveryTrip.findMany({
          where: {
            collectorId: collector.id,
            status: { in: ["ASSIGNED", "IN_TRANSIT"] },
          },
          select: {
            id: true,
            tripNumber: true,
            status: true,
            toType: true,
            scheduledDate: true,
            customerName: true,
            shop: { select: { id: true, name: true, address: true } },
            _count: { select: { items: true } },
          },
          orderBy: [{ scheduledDate: "asc" }, { createdAt: "desc" }],
          take: 5,
        });

        dashboardData.sections.myDeliveries = {
          pending: pendingDeliveries,
          inTransit: inTransitDeliveries,
          completedToday,
          total: pendingDeliveries + inTransitDeliveries,
          trips: deliveryTrips,
        };

        dashboardData.quickActions.push("view_my_deliveries");
      }
    }

    // ============================================
    // CLAIMS OVERVIEW - For managers/supervisors
    // ============================================
    if (permissions.includes("claims.view") && !permissions.includes("claims.view_assigned")) {
      // User can view all claims (manager level)
      const [totalClaims, pendingClaims, inProgressClaims, completedToday, urgentClaims] =
        await Promise.all([
          prisma.warrantyClaim.count({ where: { tenantId: user.tenantId } }),
          prisma.warrantyClaim.count({
            where: { tenantId: user.tenantId, resolvedAt: null },
          }),
          prisma.warrantyClaim.count({
            where: {
              tenantId: user.tenantId,
              resolvedAt: null,
              currentStatus: { in: ["In Progress", "Under Repair"] },
            },
          }),
          prisma.warrantyClaim.count({
            where: {
              tenantId: user.tenantId,
              resolvedAt: { gte: today, lt: tomorrow },
            },
          }),
          prisma.warrantyClaim.count({
            where: {
              tenantId: user.tenantId,
              resolvedAt: null,
              priority: "URGENT",
            },
          }),
        ]);

      dashboardData.sections.claimsOverview = {
        total: totalClaims,
        pending: pendingClaims,
        inProgress: inProgressClaims,
        completedToday,
        urgent: urgentClaims,
      };

      dashboardData.quickActions.push("view_all_claims");
    }

    // Also show overview if user has both view and view_assigned (supervisor)
    if (permissions.includes("claims.view") && permissions.includes("claims.view_assigned")) {
      const [totalClaims, pendingClaims, urgentClaims] = await Promise.all([
        prisma.warrantyClaim.count({ where: { tenantId: user.tenantId, resolvedAt: null } }),
        prisma.warrantyClaim.count({
          where: { tenantId: user.tenantId, resolvedAt: null },
        }),
        prisma.warrantyClaim.count({
          where: { tenantId: user.tenantId, resolvedAt: null, priority: "URGENT" },
        }),
      ]);

      dashboardData.sections.claimsOverview = {
        total: totalClaims,
        pending: pendingClaims,
        urgent: urgentClaims,
      };
    }

    // ============================================
    // WARRANTY STATS
    // ============================================
    if (permissions.includes("warranty_cards.view")) {
      const [activeWarranties, expiringThisMonth] = await Promise.all([
        prisma.warrantyCard.count({
          where: {
            tenantId: user.tenantId,
            status: "ACTIVE",
            warrantyEndDate: { gte: new Date() },
          },
        }),
        prisma.warrantyCard.count({
          where: {
            tenantId: user.tenantId,
            status: "ACTIVE",
            warrantyEndDate: {
              gte: new Date(),
              lt: new Date(new Date().setMonth(new Date().getMonth() + 1)),
            },
          },
        }),
      ]);

      dashboardData.sections.warrantyStats = {
        active: activeWarranties,
        expiringThisMonth,
      };
    }

    // ============================================
    // INVENTORY ALERTS
    // ============================================
    if (permissions.includes("inventory.view")) {
      // Get all active inventory items and filter in JS for low stock
      const inventoryItems = await prisma.inventoryItem.findMany({
        where: {
          tenantId: user.tenantId,
          isActive: true,
        },
        select: {
          quantity: true,
          reorderLevel: true,
        },
      });

      // Count low stock (quantity <= reorderLevel but > 0)
      const lowStock = inventoryItems.filter(
        (item) =>
          Number(item.quantity) > 0 &&
          Number(item.quantity) <= Number(item.reorderLevel)
      ).length;

      // Count out of stock
      const outOfStockItems = inventoryItems.filter(
        (item) => Number(item.quantity) === 0
      ).length;

      dashboardData.sections.inventoryAlerts = {
        lowStock,
        outOfStock: outOfStockItems,
      };

      if (lowStock > 0 || outOfStockItems > 0) {
        dashboardData.quickActions.push("view_inventory_alerts");
      }
    }

    // ============================================
    // LOGISTICS OVERVIEW - For managers
    // ============================================
    if (permissions.includes("logistics.manage_pickups")) {
      const [pendingPickups, inTransitPickups, pendingDeliveries, inTransitDeliveries] =
        await Promise.all([
          prisma.collectionTrip.count({
            where: { tenantId: user.tenantId, status: "IN_PROGRESS" },
          }),
          prisma.collectionTrip.count({
            where: { tenantId: user.tenantId, status: "IN_TRANSIT" },
          }),
          prisma.deliveryTrip.count({
            where: { tenantId: user.tenantId, status: { in: ["PENDING", "ASSIGNED"] } },
          }),
          prisma.deliveryTrip.count({
            where: { tenantId: user.tenantId, status: "IN_TRANSIT" },
          }),
        ]);

      dashboardData.sections.logisticsOverview = {
        pendingPickups,
        inTransitPickups,
        pendingDeliveries,
        inTransitDeliveries,
        totalActive: pendingPickups + inTransitPickups + pendingDeliveries + inTransitDeliveries,
      };

      dashboardData.quickActions.push("manage_logistics");
    }

    // ============================================
    // QUICK ACTIONS based on permissions
    // ============================================
    if (permissions.includes("claims.create")) {
      dashboardData.quickActions.push("create_claim");
    }
    if (permissions.includes("warranty_cards.create")) {
      dashboardData.quickActions.push("create_warranty");
    }
    if (permissions.includes("customers.create")) {
      dashboardData.quickActions.push("create_customer");
    }

    return successResponse(dashboardData);
  } catch (error) {
    console.error("Dashboard API Error:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      if (error.message === "Unauthorized") {
        return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
      }
    }
    return errorResponse("Failed to fetch dashboard data", "SERVER_ERROR", 500);
  }
}
