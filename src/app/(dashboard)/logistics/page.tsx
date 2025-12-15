"use client";

// ===========================================
// Logistics Dashboard Page
// ===========================================

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Truck,
  Package,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle,
  AlertCircle,
  MapPin,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { PageHeader } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common";
import { Progress } from "@/components/ui/progress";

interface DashboardStats {
  collectors: {
    total: number;
    active: number;
    onLeave: number;
  };
  pickups: {
    total: number;
    pending: number;
    inTransit: number;
    completedToday: number;
  };
  deliveries: {
    total: number;
    pending: number;
    inTransit: number;
    completedToday: number;
    failed: number;
  };
}

interface RecentActivity {
  id: number;
  type: "pickup" | "delivery";
  number: string;
  status: string;
  collectorName: string | null;
  productName: string;
  location: string;
  updatedAt: string;
}

interface CollectorWorkload {
  id: number;
  name: string;
  phone: string;
  activePickups: number;
  activeDeliveries: number;
  completedToday: number;
  status: string;
}

export default function LogisticsDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    collectors: { total: 0, active: 0, onLeave: 0 },
    pickups: { total: 0, pending: 0, inTransit: 0, completedToday: 0 },
    deliveries: { total: 0, pending: 0, inTransit: 0, completedToday: 0, failed: 0 },
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [collectorWorkloads, setCollectorWorkloads] = useState<CollectorWorkload[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      // Fetch collectors
      const collectorsRes = await fetch("/api/logistics/collectors?limit=100");
      const collectorsData = await collectorsRes.json();

      // Fetch pickups
      const pickupsRes = await fetch("/api/logistics/pickups?limit=100");
      const pickupsData = await pickupsRes.json();

      // Fetch deliveries
      const deliveriesRes = await fetch("/api/logistics/deliveries?limit=100");
      const deliveriesData = await deliveriesRes.json();

      if (collectorsData.success && pickupsData.success && deliveriesData.success) {
        const collectors = collectorsData.data || [];
        const pickups = pickupsData.data || [];
        const deliveries = deliveriesData.data || [];

        // Calculate stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const completedPickupsToday = pickups.filter(
          (p: { status: string; completedAt: string }) =>
            p.status === "COMPLETED" && new Date(p.completedAt) >= today
        ).length;

        const completedDeliveriesToday = deliveries.filter(
          (d: { status: string; completedAt: string }) =>
            d.status === "COMPLETED" && new Date(d.completedAt) >= today
        ).length;

        setStats({
          collectors: {
            total: collectors.length,
            active: collectors.filter((c: { status: string }) => c.status === "ACTIVE").length,
            onLeave: collectors.filter((c: { status: string }) => c.status === "ON_LEAVE").length,
          },
          pickups: {
            total: pickups.length,
            pending: pickups.filter((p: { status: string }) => p.status === "PENDING").length,
            inTransit: pickups.filter((p: { status: string }) => p.status === "IN_TRANSIT").length,
            completedToday: completedPickupsToday,
          },
          deliveries: {
            total: deliveries.length,
            pending: deliveries.filter((d: { status: string }) => d.status === "PENDING").length,
            inTransit: deliveries.filter((d: { status: string }) => d.status === "IN_TRANSIT").length,
            completedToday: completedDeliveriesToday,
            failed: deliveries.filter((d: { status: string }) => d.status === "FAILED").length,
          },
        });

        // Build recent activity
        const allActivity: RecentActivity[] = [
          ...pickups.slice(0, 5).map((p: {
            id: number;
            pickupNumber: string;
            status: string;
            collector: { name: string } | null;
            claim: { warrantyCard: { product: { name: string } } };
            fromShop: { name: string } | null;
            updatedAt: string;
          }) => ({
            id: p.id,
            type: "pickup" as const,
            number: p.pickupNumber,
            status: p.status,
            collectorName: p.collector?.name || null,
            productName: p.claim?.warrantyCard?.product?.name || "Unknown",
            location: p.fromShop?.name || "Customer",
            updatedAt: p.updatedAt,
          })),
          ...deliveries.slice(0, 5).map((d: {
            id: number;
            deliveryNumber: string;
            status: string;
            collector: { name: string } | null;
            claim: { warrantyCard: { product: { name: string } } };
            toShop: { name: string } | null;
            updatedAt: string;
          }) => ({
            id: d.id,
            type: "delivery" as const,
            number: d.deliveryNumber,
            status: d.status,
            collectorName: d.collector?.name || null,
            productName: d.claim?.warrantyCard?.product?.name || "Unknown",
            location: d.toShop?.name || "Customer",
            updatedAt: d.updatedAt,
          })),
        ];
        allActivity.sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        setRecentActivity(allActivity.slice(0, 10));

        // Calculate collector workloads
        const workloads: CollectorWorkload[] = collectors
          .filter((c: { status: string }) => c.status === "ACTIVE")
          .map((c: { id: number; name: string; phone: string; status: string }) => {
            const collectorPickups = pickups.filter(
              (p: { collectorId: number; status: string }) => p.collectorId === c.id
            );
            const collectorDeliveries = deliveries.filter(
              (d: { collectorId: number; status: string }) => d.collectorId === c.id
            );

            return {
              id: c.id,
              name: c.name,
              phone: c.phone,
              activePickups: collectorPickups.filter(
                (p: { status: string }) => ["ASSIGNED", "IN_TRANSIT"].includes(p.status)
              ).length,
              activeDeliveries: collectorDeliveries.filter(
                (d: { status: string }) => ["ASSIGNED", "IN_TRANSIT"].includes(d.status)
              ).length,
              completedToday:
                collectorPickups.filter(
                  (p: { status: string; completedAt: string }) =>
                    p.status === "COMPLETED" && new Date(p.completedAt) >= today
                ).length +
                collectorDeliveries.filter(
                  (d: { status: string; completedAt: string }) =>
                    d.status === "COMPLETED" && new Date(d.completedAt) >= today
                ).length,
              status: c.status,
            };
          });
        setCollectorWorkloads(workloads);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  const totalActiveTasksToday =
    stats.pickups.pending +
    stats.pickups.inTransit +
    stats.deliveries.pending +
    stats.deliveries.inTransit;
  const totalCompletedToday =
    stats.pickups.completedToday + stats.deliveries.completedToday;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Logistics Dashboard"
        description="Overview of pickups, deliveries, and collector assignments"
      />

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Collectors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.collectors.active}</div>
            <p className="text-xs text-muted-foreground">
              {stats.collectors.onLeave} on leave
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActiveTasksToday}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pickups.pending + stats.pickups.inTransit} pickups,{" "}
              {stats.deliveries.pending + stats.deliveries.inTransit} deliveries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCompletedToday}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pickups.completedToday} pickups,{" "}
              {stats.deliveries.completedToday} deliveries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Failed Deliveries</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.deliveries.failed}
            </div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Metrics */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pickup Metrics */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ArrowUpRight className="h-5 w-5 text-blue-500" />
                  Pickups
                </CardTitle>
                <CardDescription>Product collection status</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/logistics/pickups">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pending</span>
                <span className="font-medium">{stats.pickups.pending}</span>
              </div>
              <Progress
                value={
                  stats.pickups.total > 0
                    ? (stats.pickups.pending / stats.pickups.total) * 100
                    : 0
                }
                className="h-2"
              />

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">In Transit</span>
                <span className="font-medium">{stats.pickups.inTransit}</span>
              </div>
              <Progress
                value={
                  stats.pickups.total > 0
                    ? (stats.pickups.inTransit / stats.pickups.total) * 100
                    : 0
                }
                className="h-2 [&>div]:bg-orange-500"
              />

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Completed Today
                </span>
                <span className="font-medium text-green-600">
                  {stats.pickups.completedToday}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Metrics */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ArrowDownRight className="h-5 w-5 text-green-500" />
                  Deliveries
                </CardTitle>
                <CardDescription>Product delivery status</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/logistics/deliveries">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pending</span>
                <span className="font-medium">{stats.deliveries.pending}</span>
              </div>
              <Progress
                value={
                  stats.deliveries.total > 0
                    ? (stats.deliveries.pending / stats.deliveries.total) * 100
                    : 0
                }
                className="h-2"
              />

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">In Transit</span>
                <span className="font-medium">{stats.deliveries.inTransit}</span>
              </div>
              <Progress
                value={
                  stats.deliveries.total > 0
                    ? (stats.deliveries.inTransit / stats.deliveries.total) * 100
                    : 0
                }
                className="h-2 [&>div]:bg-orange-500"
              />

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Failed</span>
                <span className="font-medium text-red-600">
                  {stats.deliveries.failed}
                </span>
              </div>
              {stats.deliveries.failed > 0 && (
                <Progress
                  value={
                    stats.deliveries.total > 0
                      ? (stats.deliveries.failed / stats.deliveries.total) * 100
                      : 0
                  }
                  className="h-2 [&>div]:bg-red-500"
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Collector Workloads & Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Collector Workloads */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Collector Workloads</CardTitle>
                <CardDescription>Active tasks per collector</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/logistics/collectors">Manage</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {collectorWorkloads.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No active collectors
              </div>
            ) : (
              <div className="space-y-4">
                {collectorWorkloads.slice(0, 5).map((collector) => (
                  <div
                    key={collector.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{collector.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {collector.phone}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-lg font-bold">
                          {collector.activePickups + collector.activeDeliveries}
                        </div>
                        <div className="text-xs text-muted-foreground">Active</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">
                          {collector.completedToday}
                        </div>
                        <div className="text-xs text-muted-foreground">Done</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest pickup and delivery updates</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No recent activity
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.slice(0, 6).map((activity) => (
                  <div
                    key={`${activity.type}-${activity.id}`}
                    className="flex items-start gap-3"
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        activity.type === "pickup"
                          ? "bg-blue-100 dark:bg-blue-900"
                          : "bg-green-100 dark:bg-green-900"
                      }`}
                    >
                      {activity.type === "pickup" ? (
                        <ArrowUpRight
                          className={`h-4 w-4 ${
                            activity.type === "pickup"
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-green-600 dark:text-green-400"
                          }`}
                        />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-green-600 dark:text-green-400" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {activity.number}
                        </span>
                        <StatusBadge status={activity.status} />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {activity.productName} • {activity.location}
                      </div>
                      {activity.collectorName && (
                        <div className="text-xs text-muted-foreground">
                          Assigned: {activity.collectorName}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="cursor-pointer transition-colors hover:bg-muted/50">
          <Link href="/logistics/pickups?status=PENDING">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.pickups.pending}</div>
                <div className="text-sm text-muted-foreground">
                  Pending Pickups
                </div>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="cursor-pointer transition-colors hover:bg-muted/50">
          <Link href="/logistics/deliveries?status=PENDING">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.deliveries.pending}</div>
                <div className="text-sm text-muted-foreground">
                  Pending Deliveries
                </div>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="cursor-pointer transition-colors hover:bg-muted/50">
          <Link href="/logistics/deliveries?status=FAILED">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {stats.deliveries.failed}
                </div>
                <div className="text-sm text-muted-foreground">
                  Failed Deliveries
                </div>
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>
    </div>
  );
}
