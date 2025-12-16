"use client";

// ===========================================
// Dashboard Section Components
// Modular sections based on user permissions
// ===========================================

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList,
  Clock,
  CheckCircle,
  AlertTriangle,
  PackageOpen,
  Truck,
  FileCheck,
  Package,
  ArrowRight,
  MapPin,
  Boxes,
  AlertCircle,
} from "lucide-react";

// ============================================
// MY TASKS SECTION - Assigned claims
// ============================================
interface MyTasksData {
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
}

export function MyTasksSection({ data }: { data: MyTasksData }) {
  const router = useRouter();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-blue-600" />
            My Tasks
          </CardTitle>
          <CardDescription>Claims assigned to you</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push("/my-tasks")}>
          View All
        </Button>
      </CardHeader>
      <CardContent>
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
            <Clock className="h-5 w-5 mx-auto mb-1 text-yellow-600" />
            <div className="text-2xl font-bold text-yellow-700">{data.pending}</div>
            <div className="text-xs text-yellow-600">Pending</div>
          </div>
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
            <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-blue-600" />
            <div className="text-2xl font-bold text-blue-700">{data.inProgress}</div>
            <div className="text-xs text-blue-600">In Progress</div>
          </div>
          <div className="text-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
            <CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-600" />
            <div className="text-2xl font-bold text-green-700">{data.completedToday}</div>
            <div className="text-xs text-green-600">Done Today</div>
          </div>
        </div>

        {/* Claims List */}
        {data.claims.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No pending tasks</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.claims.map((claim) => (
              <div
                key={claim.id}
                className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => router.push(`/claims/${claim.id}`)}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{claim.claimNumber}</span>
                    {claim.priority === "URGENT" && (
                      <Badge variant="destructive" className="text-xs">Urgent</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {claim.warrantyCard?.product?.name || "Unknown Product"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{claim.currentStatus}</Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// MY COLLECTIONS SECTION
// ============================================
interface MyCollectionsData {
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
}

export function MyCollectionsSection({ data }: { data: MyCollectionsData }) {
  const router = useRouter();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <PackageOpen className="h-5 w-5 text-blue-600" />
            My Collections
          </CardTitle>
          <CardDescription>Pickup trips assigned to you</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push("/logistics/my-trips")}>
          View All
        </Button>
      </CardHeader>
      <CardContent>
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
            <PackageOpen className="h-5 w-5 mx-auto mb-1 text-blue-600" />
            <div className="text-2xl font-bold text-blue-700">{data.active}</div>
            <div className="text-xs text-blue-600">Active</div>
          </div>
          <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
            <Truck className="h-5 w-5 mx-auto mb-1 text-purple-600" />
            <div className="text-2xl font-bold text-purple-700">{data.inTransit}</div>
            <div className="text-xs text-purple-600">In Transit</div>
          </div>
          <div className="text-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
            <CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-600" />
            <div className="text-2xl font-bold text-green-700">{data.completedToday}</div>
            <div className="text-xs text-green-600">Done Today</div>
          </div>
        </div>

        {/* Trips List */}
        {data.trips.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground">
            <PackageOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No active collections</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.trips.map((trip) => (
              <div
                key={trip.id}
                className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => router.push(`/logistics/collect/${trip.id}`)}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{trip.tripNumber}</span>
                    <Badge variant={trip.status === "IN_TRANSIT" ? "default" : "secondary"}>
                      {trip.status === "IN_TRANSIT" ? "In Transit" : "Collecting"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {trip.fromType === "SHOP" && trip.shop ? trip.shop.name : trip.customerName}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{trip._count.items} items</Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// MY DELIVERIES SECTION
// ============================================
interface MyDeliveriesData {
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
}

export function MyDeliveriesSection({ data }: { data: MyDeliveriesData }) {
  const router = useRouter();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-green-600" />
            My Deliveries
          </CardTitle>
          <CardDescription>Delivery trips assigned to you</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push("/logistics/my-trips")}>
          View All
        </Button>
      </CardHeader>
      <CardContent>
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
            <Clock className="h-5 w-5 mx-auto mb-1 text-yellow-600" />
            <div className="text-2xl font-bold text-yellow-700">{data.pending}</div>
            <div className="text-xs text-yellow-600">Pending</div>
          </div>
          <div className="text-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
            <Truck className="h-5 w-5 mx-auto mb-1 text-green-600" />
            <div className="text-2xl font-bold text-green-700">{data.inTransit}</div>
            <div className="text-xs text-green-600">In Transit</div>
          </div>
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
            <CheckCircle className="h-5 w-5 mx-auto mb-1 text-blue-600" />
            <div className="text-2xl font-bold text-blue-700">{data.completedToday}</div>
            <div className="text-xs text-blue-600">Done Today</div>
          </div>
        </div>

        {/* Trips List */}
        {data.trips.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground">
            <Truck className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No pending deliveries</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.trips.map((trip) => (
              <div
                key={trip.id}
                className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => router.push(`/logistics/deliver/${trip.id}`)}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{trip.tripNumber}</span>
                    <Badge variant={trip.status === "IN_TRANSIT" ? "default" : "outline"}>
                      {trip.status === "IN_TRANSIT" ? "In Transit" : "Ready"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {trip.toType === "SHOP" && trip.shop ? trip.shop.name : trip.customerName}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{trip._count.items} items</Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// CLAIMS OVERVIEW SECTION - For managers
// ============================================
interface ClaimsOverviewData {
  total: number;
  pending: number;
  inProgress?: number;
  completedToday?: number;
  urgent: number;
}

export function ClaimsOverviewSection({ data }: { data: ClaimsOverviewData }) {
  const router = useRouter();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Claims Overview
          </CardTitle>
          <CardDescription>All claims in the system</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push("/claims")}>
          View All
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold">{data.pending}</div>
            <div className="text-xs text-muted-foreground">Open Claims</div>
          </div>
          {data.inProgress !== undefined && (
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
              <div className="text-2xl font-bold text-blue-700">{data.inProgress}</div>
              <div className="text-xs text-blue-600">In Progress</div>
            </div>
          )}
          {data.completedToday !== undefined && (
            <div className="text-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
              <div className="text-2xl font-bold text-green-700">{data.completedToday}</div>
              <div className="text-xs text-green-600">Completed Today</div>
            </div>
          )}
          <div className="text-center p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
            <div className="text-2xl font-bold text-red-700">{data.urgent}</div>
            <div className="text-xs text-red-600">Urgent</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// WARRANTY STATS SECTION
// ============================================
interface WarrantyStatsData {
  active: number;
  expiringThisMonth: number;
}

export function WarrantyStatsSection({ data }: { data: WarrantyStatsData }) {
  const router = useRouter();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-primary" />
            Warranty Cards
          </CardTitle>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push("/warranty")}>
          View All
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
            <div className="text-2xl font-bold text-green-700">{data.active}</div>
            <div className="text-xs text-green-600">Active Warranties</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
            <div className="text-2xl font-bold text-yellow-700">{data.expiringThisMonth}</div>
            <div className="text-xs text-yellow-600">Expiring This Month</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// INVENTORY ALERTS SECTION
// ============================================
interface InventoryAlertsData {
  lowStock: number;
  outOfStock: number;
}

export function InventoryAlertsSection({ data }: { data: InventoryAlertsData }) {
  const router = useRouter();

  if (data.lowStock === 0 && data.outOfStock === 0) {
    return null; // Don't show if no alerts
  }

  return (
    <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-yellow-700">
            <AlertCircle className="h-5 w-5" />
            Inventory Alerts
          </CardTitle>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push("/inventory")}>
          View Inventory
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {data.outOfStock > 0 && (
            <div className="text-center p-3 bg-red-100 dark:bg-red-950/30 rounded-lg">
              <Boxes className="h-5 w-5 mx-auto mb-1 text-red-600" />
              <div className="text-2xl font-bold text-red-700">{data.outOfStock}</div>
              <div className="text-xs text-red-600">Out of Stock</div>
            </div>
          )}
          {data.lowStock > 0 && (
            <div className="text-center p-3 bg-yellow-100 dark:bg-yellow-950/30 rounded-lg">
              <Package className="h-5 w-5 mx-auto mb-1 text-yellow-600" />
              <div className="text-2xl font-bold text-yellow-700">{data.lowStock}</div>
              <div className="text-xs text-yellow-600">Low Stock</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// LOGISTICS OVERVIEW SECTION - For managers
// ============================================
interface LogisticsOverviewData {
  pendingPickups: number;
  inTransitPickups: number;
  pendingDeliveries: number;
  inTransitDeliveries: number;
  totalActive: number;
}

export function LogisticsOverviewSection({ data }: { data: LogisticsOverviewData }) {
  const router = useRouter();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            Logistics Overview
          </CardTitle>
          <CardDescription>All pickups and deliveries</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push("/logistics")}>
          Manage
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
            <PackageOpen className="h-5 w-5 mx-auto mb-1 text-blue-600" />
            <div className="text-2xl font-bold text-blue-700">
              {data.pendingPickups + data.inTransitPickups}
            </div>
            <div className="text-xs text-blue-600">Active Pickups</div>
          </div>
          <div className="text-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
            <Truck className="h-5 w-5 mx-auto mb-1 text-green-600" />
            <div className="text-2xl font-bold text-green-700">
              {data.pendingDeliveries + data.inTransitDeliveries}
            </div>
            <div className="text-xs text-green-600">Active Deliveries</div>
          </div>
          <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
            <div className="text-2xl font-bold text-purple-700">
              {data.inTransitPickups + data.inTransitDeliveries}
            </div>
            <div className="text-xs text-purple-600">In Transit</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold">{data.totalActive}</div>
            <div className="text-xs text-muted-foreground">Total Active</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// EMPTY DASHBOARD - When user has no permissions
// ============================================
export function EmptyDashboard({ userName }: { userName: string }) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <ClipboardList className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-lg font-medium mb-2">Welcome, {userName}!</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          You don&apos;t have any tasks or permissions assigned yet.
          Please contact your administrator to get started.
        </p>
      </CardContent>
    </Card>
  );
}
