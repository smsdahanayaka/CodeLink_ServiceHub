"use client";

// ===========================================
// Logistics Dashboard Page
// Updated with Trip-Based System
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
  PackageOpen,
  Send,
  Inbox,
  PackageCheck,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { usePermissions } from "@/lib/hooks";

interface DashboardStats {
  collectors: {
    total: number;
    active: number;
    onLeave: number;
  };
  collectionTrips: {
    total: number;
    inProgress: number;
    inTransit: number;
    receivedToday: number;
  };
  deliveryTrips: {
    total: number;
    pending: number;
    assigned: number;
    inTransit: number;
    completedToday: number;
    partial: number;
  };
  readyForDelivery: number;
}

interface CollectorWorkload {
  id: number;
  name: string;
  phone: string;
  activeCollections: number;
  activeDeliveries: number;
  completedToday: number;
  status: string;
}

export default function LogisticsDashboardPage() {
  const { hasPermission } = usePermissions();
  const [stats, setStats] = useState<DashboardStats>({
    collectors: { total: 0, active: 0, onLeave: 0 },
    collectionTrips: { total: 0, inProgress: 0, inTransit: 0, receivedToday: 0 },
    deliveryTrips: { total: 0, pending: 0, assigned: 0, inTransit: 0, completedToday: 0, partial: 0 },
    readyForDelivery: 0,
  });
  const [collectorWorkloads, setCollectorWorkloads] = useState<CollectorWorkload[]>([]);
  const [loading, setLoading] = useState(true);

  const canCreateCollection = hasPermission("logistics.create_collection");
  const canReceive = hasPermission("logistics.receive");
  const canCreateDelivery = hasPermission("logistics.create_delivery");

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      // Fetch collectors
      const collectorsRes = await fetch("/api/logistics/collectors?limit=100");
      const collectorsData = await collectorsRes.json();

      // Fetch collection trips
      const collectionRes = await fetch("/api/logistics/collection-trips?limit=100");
      const collectionData = await collectionRes.json();

      // Fetch delivery trips
      const deliveryRes = await fetch("/api/logistics/delivery-trips?limit=100");
      const deliveryData = await deliveryRes.json();

      // Fetch ready for delivery claims
      const claimsRes = await fetch("/api/claims?location=SERVICE_CENTER&status=COMPLETED,CLOSED&limit=200");
      const claimsData = await claimsRes.json();

      if (collectorsData.success) {
        const collectors = collectorsData.data || [];
        const collectionTrips = collectionData.success ? collectionData.data || [] : [];
        const deliveryTrips = deliveryData.success ? deliveryData.data || [] : [];
        const readyClaims = claimsData.success
          ? (claimsData.data || []).filter(
              (c: { currentLocation: string; currentStatus: string }) =>
                c.currentLocation === "SERVICE_CENTER" &&
                ["COMPLETED", "CLOSED"].includes(c.currentStatus)
            )
          : [];

        // Calculate stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const receivedToday = collectionTrips.filter(
          (t: { status: string; receivedAt: string }) =>
            t.status === "RECEIVED" && t.receivedAt && new Date(t.receivedAt) >= today
        ).length;

        const completedDeliveriesToday = deliveryTrips.filter(
          (d: { status: string; completedAt: string }) =>
            d.status === "COMPLETED" && d.completedAt && new Date(d.completedAt) >= today
        ).length;

        setStats({
          collectors: {
            total: collectors.length,
            active: collectors.filter((c: { status: string }) => c.status === "ACTIVE").length,
            onLeave: collectors.filter((c: { status: string }) => c.status === "ON_LEAVE").length,
          },
          collectionTrips: {
            total: collectionTrips.length,
            inProgress: collectionTrips.filter((t: { status: string }) => t.status === "IN_PROGRESS").length,
            inTransit: collectionTrips.filter((t: { status: string }) => t.status === "IN_TRANSIT").length,
            receivedToday,
          },
          deliveryTrips: {
            total: deliveryTrips.length,
            pending: deliveryTrips.filter((d: { status: string }) => d.status === "PENDING").length,
            assigned: deliveryTrips.filter((d: { status: string }) => d.status === "ASSIGNED").length,
            inTransit: deliveryTrips.filter((d: { status: string }) => d.status === "IN_TRANSIT").length,
            completedToday: completedDeliveriesToday,
            partial: deliveryTrips.filter((d: { status: string }) => d.status === "PARTIAL").length,
          },
          readyForDelivery: readyClaims.length,
        });

        // Calculate collector workloads
        const workloads: CollectorWorkload[] = collectors
          .filter((c: { status: string }) => c.status === "ACTIVE")
          .map((c: { id: number; name: string; phone: string; status: string }) => {
            const collectorCollections = collectionTrips.filter(
              (t: { collectorId: number }) => t.collectorId === c.id
            );
            const collectorDeliveries = deliveryTrips.filter(
              (d: { collectorId: number }) => d.collectorId === c.id
            );

            return {
              id: c.id,
              name: c.name,
              phone: c.phone,
              activeCollections: collectorCollections.filter(
                (t: { status: string }) => ["IN_PROGRESS", "IN_TRANSIT"].includes(t.status)
              ).length,
              activeDeliveries: collectorDeliveries.filter(
                (d: { status: string }) => ["ASSIGNED", "IN_TRANSIT"].includes(d.status)
              ).length,
              completedToday:
                collectorCollections.filter(
                  (t: { status: string; completedAt: string }) =>
                    t.status === "IN_TRANSIT" && t.completedAt && new Date(t.completedAt) >= today
                ).length +
                collectorDeliveries.filter(
                  (d: { status: string; completedAt: string }) =>
                    d.status === "COMPLETED" && d.completedAt && new Date(d.completedAt) >= today
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

  const totalActiveCollections = stats.collectionTrips.inProgress + stats.collectionTrips.inTransit;
  const totalActiveDeliveries = stats.deliveryTrips.pending + stats.deliveryTrips.assigned + stats.deliveryTrips.inTransit;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Logistics Dashboard"
        description="Overview of collection trips, deliveries, and collector assignments"
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
            <CardTitle className="text-sm font-medium">In Transit to SC</CardTitle>
            <Truck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.collectionTrips.inTransit}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting receipt at service center
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ready for Delivery</CardTitle>
            <PackageCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.readyForDelivery}</div>
            <p className="text-xs text-muted-foreground">
              Completed claims at service center
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Partial Deliveries</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.deliveryTrips.partial}
            </div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-4">
        {canCreateCollection && (
          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <Link href="/logistics/collect">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                  <PackageOpen className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium">New Collection</div>
                  <div className="text-sm text-muted-foreground">Start a collection trip</div>
                </div>
              </CardContent>
            </Link>
          </Card>
        )}

        {canReceive && (
          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <Link href="/logistics/collection-trips?status=IN_TRANSIT">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900">
                  <Inbox className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <div className="font-medium">Receive Trips</div>
                  <div className="text-sm text-muted-foreground">
                    {stats.collectionTrips.inTransit} waiting
                  </div>
                </div>
              </CardContent>
            </Link>
          </Card>
        )}

        {canCreateDelivery && (
          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <Link href="/logistics/ready-for-delivery">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
                  <Send className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <div className="font-medium">Create Delivery</div>
                  <div className="text-sm text-muted-foreground">
                    {stats.readyForDelivery} ready
                  </div>
                </div>
              </CardContent>
            </Link>
          </Card>
        )}

        <Card className="cursor-pointer transition-colors hover:bg-muted/50">
          <Link href="/logistics/my-trips">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
                <Truck className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <div className="font-medium">My Trips</div>
                <div className="text-sm text-muted-foreground">Collector view</div>
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>

      {/* Trip Metrics */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Collection Trips */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ArrowUpRight className="h-5 w-5 text-blue-500" />
                  Collection Trips
                </CardTitle>
                <CardDescription>Items coming to service center</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/logistics/collection-trips">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">In Progress</span>
                <Badge variant="default">{stats.collectionTrips.inProgress}</Badge>
              </div>
              <Progress
                value={
                  totalActiveCollections > 0
                    ? (stats.collectionTrips.inProgress / totalActiveCollections) * 100
                    : 0
                }
                className="h-2"
              />

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">In Transit</span>
                <Badge variant="secondary">{stats.collectionTrips.inTransit}</Badge>
              </div>
              <Progress
                value={
                  totalActiveCollections > 0
                    ? (stats.collectionTrips.inTransit / totalActiveCollections) * 100
                    : 0
                }
                className="h-2 [&>div]:bg-orange-500"
              />

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Received Today</span>
                <span className="font-medium text-green-600">
                  {stats.collectionTrips.receivedToday}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Trips */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ArrowDownRight className="h-5 w-5 text-green-500" />
                  Delivery Trips
                </CardTitle>
                <CardDescription>Items going out for delivery</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/logistics/delivery-trips">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pending Assignment</span>
                <Badge variant="secondary">{stats.deliveryTrips.pending}</Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Assigned</span>
                <Badge variant="default">{stats.deliveryTrips.assigned}</Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">In Transit</span>
                <Badge variant="default">{stats.deliveryTrips.inTransit}</Badge>
              </div>
              <Progress
                value={
                  totalActiveDeliveries > 0
                    ? (stats.deliveryTrips.inTransit / totalActiveDeliveries) * 100
                    : 0
                }
                className="h-2 [&>div]:bg-green-500"
              />

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Completed Today</span>
                <span className="font-medium text-green-600">
                  {stats.deliveryTrips.completedToday}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Collector Workloads */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Collector Workloads</CardTitle>
              <CardDescription>Active tasks per collector</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/logistics/collectors">Manage Collectors</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {collectorWorkloads.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No active collectors
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {collectorWorkloads.map((collector) => (
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
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">
                        {collector.activeCollections}
                      </div>
                      <div className="text-xs text-muted-foreground">Collections</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">
                        {collector.activeDeliveries}
                      </div>
                      <div className="text-xs text-muted-foreground">Deliveries</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="cursor-pointer transition-colors hover:bg-muted/50">
          <Link href="/logistics/collection-trips?status=IN_PROGRESS">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                <PackageOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.collectionTrips.inProgress}</div>
                <div className="text-sm text-muted-foreground">Active Collections</div>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="cursor-pointer transition-colors hover:bg-muted/50">
          <Link href="/logistics/collection-trips?status=IN_TRANSIT">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900">
                <Truck className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.collectionTrips.inTransit}</div>
                <div className="text-sm text-muted-foreground">Awaiting Receipt</div>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="cursor-pointer transition-colors hover:bg-muted/50">
          <Link href="/logistics/delivery-trips?status=IN_TRANSIT">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
                <Send className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.deliveryTrips.inTransit}</div>
                <div className="text-sm text-muted-foreground">In Delivery</div>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="cursor-pointer transition-colors hover:bg-muted/50">
          <Link href="/logistics/delivery-trips?status=PARTIAL">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900">
                <AlertCircle className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">
                  {stats.deliveryTrips.partial}
                </div>
                <div className="text-sm text-muted-foreground">Partial Deliveries</div>
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>
    </div>
  );
}
