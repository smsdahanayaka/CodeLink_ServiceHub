"use client";

// ===========================================
// Unified Dashboard Component
// Shows sections based on user permissions
// ===========================================

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MyTasksSection,
  MyCollectionsSection,
  MyDeliveriesSection,
  ClaimsOverviewSection,
  WarrantyStatsSection,
  InventoryAlertsSection,
  LogisticsOverviewSection,
  EmptyDashboard,
} from "@/components/dashboard";
import {
  RefreshCw,
  Plus,
  FileCheck,
  ClipboardList,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

interface DashboardData {
  user: { id: number; name: string; role: string };
  sections: {
    myTasks?: {
      pending: number;
      inProgress: number;
      completedToday: number;
      total: number;
      claims: Array<{
        id: number;
        claimNumber: string;
        currentStatus: string;
        priority: string;
        createdAt: string;
        warrantyCard: {
          product: { name: string } | null;
          customer: { name: string } | null;
        } | null;
      }>;
    };
    myCollections?: {
      active: number;
      inTransit: number;
      completedToday: number;
      total: number;
      trips: Array<{
        id: number;
        tripNumber: string;
        status: string;
        fromType: string;
        customerName: string | null;
        shop: { id: number; name: string; address: string | null } | null;
        _count: { items: number };
      }>;
    };
    myDeliveries?: {
      pending: number;
      inTransit: number;
      completedToday: number;
      total: number;
      trips: Array<{
        id: number;
        tripNumber: string;
        status: string;
        toType: string;
        scheduledDate: string | null;
        customerName: string | null;
        shop: { id: number; name: string; address: string | null } | null;
        _count: { items: number };
      }>;
    };
    claimsOverview?: {
      total: number;
      pending: number;
      inProgress?: number;
      completedToday?: number;
      urgent: number;
    };
    warrantyStats?: {
      active: number;
      expiringThisMonth: number;
    };
    inventoryAlerts?: {
      lowStock: number;
      outOfStock: number;
    };
    logisticsOverview?: {
      pendingPickups: number;
      inTransitPickups: number;
      pendingDeliveries: number;
      inTransitDeliveries: number;
      totalActive: number;
    };
  };
  quickActions: string[];
}

interface UnifiedDashboardProps {
  userName: string;
  userPermissions: string[];
}

export function UnifiedDashboard({ userName, userPermissions }: UnifiedDashboardProps) {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      }
      const res = await fetch("/api/dashboard");
      const result = await res.json();

      if (result.success) {
        setData(result.data);
      } else {
        toast.error(result.error?.message || "Failed to load dashboard");
      }
    } catch (error) {
      console.error("Error fetching dashboard:", error);
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    // Auto-refresh every 2 minutes
    const interval = setInterval(() => fetchDashboard(true), 120000);
    return () => clearInterval(interval);
  }, []);

  // Quick action handlers
  const quickActions = data?.quickActions || [];

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-40" />
      </div>
    );
  }

  // Check if user has any sections to show
  const hasSections = data?.sections && Object.keys(data.sections).length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={`Welcome back, ${userName}!`}
        description={data?.user.role ? `Logged in as ${data.user.role}` : "Dashboard"}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchDashboard(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>

            {/* Quick Action Buttons */}
            {quickActions.includes("create_claim") && (
              <Button size="sm" onClick={() => router.push("/claims/new")}>
                <Plus className="h-4 w-4 mr-2" />
                New Claim
              </Button>
            )}
          </div>
        }
      />

      {/* Quick Action Cards for mobile */}
      {(quickActions.includes("create_claim") ||
        quickActions.includes("create_warranty") ||
        quickActions.includes("create_customer")) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:hidden">
          {quickActions.includes("create_claim") && (
            <Button
              variant="outline"
              className="h-auto py-3 flex-col"
              onClick={() => router.push("/claims/new")}
            >
              <ClipboardList className="h-5 w-5 mb-1" />
              <span className="text-xs">New Claim</span>
            </Button>
          )}
          {quickActions.includes("create_warranty") && (
            <Button
              variant="outline"
              className="h-auto py-3 flex-col"
              onClick={() => router.push("/warranty/new")}
            >
              <FileCheck className="h-5 w-5 mb-1" />
              <span className="text-xs">New Warranty</span>
            </Button>
          )}
          {quickActions.includes("create_customer") && (
            <Button
              variant="outline"
              className="h-auto py-3 flex-col"
              onClick={() => router.push("/customers/new")}
            >
              <UserPlus className="h-5 w-5 mb-1" />
              <span className="text-xs">New Customer</span>
            </Button>
          )}
        </div>
      )}

      {/* Dashboard Sections */}
      {!hasSections ? (
        <EmptyDashboard userName={userName} />
      ) : (
        <div className="space-y-6">
          {/* Inventory Alerts - Show at top if there are alerts */}
          {data?.sections.inventoryAlerts && (
            <InventoryAlertsSection data={data.sections.inventoryAlerts} />
          )}

          {/* My Tasks & Personal Sections */}
          <div className="grid gap-6 lg:grid-cols-2">
            {data?.sections.myTasks && (
              <MyTasksSection data={data.sections.myTasks} />
            )}
            {data?.sections.myCollections && (
              <MyCollectionsSection data={data.sections.myCollections} />
            )}
            {data?.sections.myDeliveries && (
              <MyDeliveriesSection data={data.sections.myDeliveries} />
            )}
          </div>

          {/* Overview Sections - For managers */}
          <div className="grid gap-6 lg:grid-cols-2">
            {data?.sections.claimsOverview && (
              <ClaimsOverviewSection data={data.sections.claimsOverview} />
            )}
            {data?.sections.logisticsOverview && (
              <LogisticsOverviewSection data={data.sections.logisticsOverview} />
            )}
          </div>

          {/* Stats Sections */}
          {data?.sections.warrantyStats && (
            <WarrantyStatsSection data={data.sections.warrantyStats} />
          )}
        </div>
      )}
    </div>
  );
}
