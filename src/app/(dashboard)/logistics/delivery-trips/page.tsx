"use client";

// ===========================================
// Delivery Trips List Page
// ===========================================

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  Truck,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Eye,
  Plus,
  AlertTriangle,
  UserCircle,
  Store,
  User,
} from "lucide-react";

import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/lib/hooks";

interface DeliveryTrip {
  id: number;
  tripNumber: string;
  toType: "SHOP" | "CUSTOMER";
  status: "PENDING" | "ASSIGNED" | "IN_TRANSIT" | "COMPLETED" | "PARTIAL" | "CANCELLED";
  scheduledDate: string | null;
  scheduledSlot: string | null;
  dispatchedAt: string | null;
  completedAt: string | null;
  customerName: string | null;
  customerPhone: string | null;
  notes: string | null;
  collector: {
    id: number;
    name: string;
    phone: string;
    vehicleNumber: string | null;
  } | null;
  shop: {
    id: number;
    name: string;
    address: string | null;
    phone: string | null;
  } | null;
  _count: {
    items: number;
  };
  createdAt: string;
}

const statusConfig = {
  PENDING: { label: "Pending", variant: "secondary" as const, icon: Clock },
  ASSIGNED: { label: "Assigned", variant: "default" as const, icon: UserCircle },
  IN_TRANSIT: { label: "In Transit", variant: "default" as const, icon: Truck },
  COMPLETED: { label: "Completed", variant: "success" as const, icon: CheckCircle },
  PARTIAL: { label: "Partial", variant: "warning" as const, icon: AlertTriangle },
  CANCELLED: { label: "Cancelled", variant: "destructive" as const, icon: XCircle },
};

export default function DeliveryTripsPage() {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const [trips, setTrips] = useState<DeliveryTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [stats, setStats] = useState({
    pending: 0,
    assigned: 0,
    inTransit: 0,
    completed: 0,
    partial: 0,
    cancelled: 0,
  });

  const canCreate = hasPermission("logistics.create_delivery");

  useEffect(() => {
    fetchTrips();
  }, [statusFilter]);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("limit", "100");
      if (statusFilter && statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      const res = await fetch(`/api/logistics/delivery-trips?${params}`);
      const data = await res.json();

      if (data.success) {
        setTrips(data.data);
        // Calculate stats
        if (statusFilter === "all") {
          setStats({
            pending: data.data.filter((t: DeliveryTrip) => t.status === "PENDING").length,
            assigned: data.data.filter((t: DeliveryTrip) => t.status === "ASSIGNED").length,
            inTransit: data.data.filter((t: DeliveryTrip) => t.status === "IN_TRANSIT").length,
            completed: data.data.filter((t: DeliveryTrip) => t.status === "COMPLETED").length,
            partial: data.data.filter((t: DeliveryTrip) => t.status === "PARTIAL").length,
            cancelled: data.data.filter((t: DeliveryTrip) => t.status === "CANCELLED").length,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching trips:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTrips = trips.filter((trip) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      trip.tripNumber.toLowerCase().includes(searchLower) ||
      (trip.collector?.name || "").toLowerCase().includes(searchLower) ||
      (trip.shop?.name || "").toLowerCase().includes(searchLower) ||
      (trip.customerName || "").toLowerCase().includes(searchLower)
    );
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Delivery Trips"
        description="View and manage all delivery trips"
        actions={
          canCreate ? (
            <Button onClick={() => router.push("/logistics/ready-for-delivery")}>
              <Plus className="h-4 w-4 mr-2" />
              New Delivery Trip
            </Button>
          ) : null
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card
          className={`cursor-pointer transition-all ${statusFilter === "PENDING" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setStatusFilter(statusFilter === "PENDING" ? "all" : "PENDING")}
        >
          <CardHeader className="pb-2">
            <CardDescription>Pending</CardDescription>
            <CardTitle className="text-2xl">{stats.pending}</CardTitle>
          </CardHeader>
          <CardContent>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all ${statusFilter === "ASSIGNED" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setStatusFilter(statusFilter === "ASSIGNED" ? "all" : "ASSIGNED")}
        >
          <CardHeader className="pb-2">
            <CardDescription>Assigned</CardDescription>
            <CardTitle className="text-2xl">{stats.assigned}</CardTitle>
          </CardHeader>
          <CardContent>
            <UserCircle className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all ${statusFilter === "IN_TRANSIT" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setStatusFilter(statusFilter === "IN_TRANSIT" ? "all" : "IN_TRANSIT")}
        >
          <CardHeader className="pb-2">
            <CardDescription>In Transit</CardDescription>
            <CardTitle className="text-2xl">{stats.inTransit}</CardTitle>
          </CardHeader>
          <CardContent>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all ${statusFilter === "COMPLETED" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setStatusFilter(statusFilter === "COMPLETED" ? "all" : "COMPLETED")}
        >
          <CardHeader className="pb-2">
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-2xl">{stats.completed}</CardTitle>
          </CardHeader>
          <CardContent>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all ${statusFilter === "PARTIAL" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setStatusFilter(statusFilter === "PARTIAL" ? "all" : "PARTIAL")}
        >
          <CardHeader className="pb-2">
            <CardDescription>Partial</CardDescription>
            <CardTitle className="text-2xl">{stats.partial}</CardTitle>
          </CardHeader>
          <CardContent>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all ${statusFilter === "CANCELLED" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setStatusFilter(statusFilter === "CANCELLED" ? "all" : "CANCELLED")}
        >
          <CardHeader className="pb-2">
            <CardDescription>Cancelled</CardDescription>
            <CardTitle className="text-2xl">{stats.cancelled}</CardTitle>
          </CardHeader>
          <CardContent>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by trip number, collector, destination..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="ASSIGNED">Assigned</SelectItem>
            <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="PARTIAL">Partial</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Trips Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trip #</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Collector</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  </TableRow>
                ))
              ) : filteredTrips.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No delivery trips found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTrips.map((trip) => {
                  const config = statusConfig[trip.status];
                  const StatusIcon = config.icon;
                  return (
                    <TableRow key={trip.id}>
                      <TableCell className="font-medium">{trip.tripNumber}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {trip.toType === "SHOP" ? (
                            <Store className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <User className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div>
                            {trip.toType === "SHOP" && trip.shop ? (
                              <>
                                <p className="font-medium">{trip.shop.name}</p>
                                <p className="text-sm text-muted-foreground">{trip.shop.phone}</p>
                              </>
                            ) : (
                              <>
                                <p className="font-medium">{trip.customerName || "Customer"}</p>
                                <p className="text-sm text-muted-foreground">{trip.customerPhone}</p>
                              </>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {trip.collector ? (
                          <div>
                            <p className="font-medium">{trip.collector.name}</p>
                            <p className="text-sm text-muted-foreground">{trip.collector.phone}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Not assigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{trip._count.items} items</Badge>
                      </TableCell>
                      <TableCell>
                        {trip.scheduledDate ? (
                          <div className="text-sm">
                            <p>{new Date(trip.scheduledDate).toLocaleDateString()}</p>
                            {trip.scheduledSlot && (
                              <Badge variant="outline" className="text-xs mt-1">
                                {trip.scheduledSlot}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
                          <StatusIcon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/logistics/delivery-trips/${trip.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
