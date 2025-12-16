"use client";

// ===========================================
// Collection Trips List Page
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
  PackageCheck,
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

interface CollectionTrip {
  id: number;
  tripNumber: string;
  fromType: "SHOP" | "CUSTOMER";
  status: "IN_PROGRESS" | "IN_TRANSIT" | "RECEIVED" | "CANCELLED";
  startedAt: string;
  completedAt: string | null;
  receivedAt: string | null;
  customerName: string | null;
  customerPhone: string | null;
  notes: string | null;
  collector: {
    id: number;
    name: string;
    phone: string;
    vehicleNumber: string | null;
  };
  shop: {
    id: number;
    name: string;
    address: string | null;
    phone: string | null;
  } | null;
  receiverUser: {
    id: number;
    firstName: string;
    lastName: string;
  } | null;
  _count: {
    items: number;
  };
}

const statusConfig = {
  IN_PROGRESS: { label: "In Progress", variant: "default" as const, icon: Package },
  IN_TRANSIT: { label: "In Transit", variant: "secondary" as const, icon: Truck },
  RECEIVED: { label: "Received", variant: "success" as const, icon: CheckCircle },
  CANCELLED: { label: "Cancelled", variant: "destructive" as const, icon: XCircle },
};

export default function CollectionTripsPage() {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const [trips, setTrips] = useState<CollectionTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [stats, setStats] = useState({
    inProgress: 0,
    inTransit: 0,
    received: 0,
    cancelled: 0,
  });

  const canReceive = hasPermission("logistics.receive");

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

      const res = await fetch(`/api/logistics/collection-trips?${params}`);
      const data = await res.json();

      if (data.success) {
        setTrips(data.data);
        // Calculate stats
        const allTrips = statusFilter === "all" ? data.data : [];
        if (statusFilter === "all") {
          setStats({
            inProgress: allTrips.filter((t: CollectionTrip) => t.status === "IN_PROGRESS").length,
            inTransit: allTrips.filter((t: CollectionTrip) => t.status === "IN_TRANSIT").length,
            received: allTrips.filter((t: CollectionTrip) => t.status === "RECEIVED").length,
            cancelled: allTrips.filter((t: CollectionTrip) => t.status === "CANCELLED").length,
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
      trip.collector.name.toLowerCase().includes(searchLower) ||
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
        title="Collection Trips"
        description="View and manage all collection trips from shops and customers"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card
          className={`cursor-pointer transition-all ${statusFilter === "IN_PROGRESS" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setStatusFilter(statusFilter === "IN_PROGRESS" ? "all" : "IN_PROGRESS")}
        >
          <CardHeader className="pb-2">
            <CardDescription>In Progress</CardDescription>
            <CardTitle className="text-2xl">{stats.inProgress}</CardTitle>
          </CardHeader>
          <CardContent>
            <Package className="h-4 w-4 text-muted-foreground" />
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
          className={`cursor-pointer transition-all ${statusFilter === "RECEIVED" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setStatusFilter(statusFilter === "RECEIVED" ? "all" : "RECEIVED")}
        >
          <CardHeader className="pb-2">
            <CardDescription>Received</CardDescription>
            <CardTitle className="text-2xl">{stats.received}</CardTitle>
          </CardHeader>
          <CardContent>
            <CheckCircle className="h-4 w-4 text-green-500" />
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
            placeholder="Search by trip number, collector, shop..."
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
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
            <SelectItem value="RECEIVED">Received</SelectItem>
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
                <TableHead>Collector</TableHead>
                <TableHead>From</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Started</TableHead>
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
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  </TableRow>
                ))
              ) : filteredTrips.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No collection trips found
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
                        <div>
                          <p className="font-medium">{trip.collector.name}</p>
                          <p className="text-sm text-muted-foreground">{trip.collector.phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          {trip.fromType === "SHOP" && trip.shop ? (
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
                          <Badge variant="outline" className="mt-1 text-xs">
                            {trip.fromType}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{trip._count.items} items</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-3 w-3" />
                          {formatDate(trip.startedAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
                          <StatusIcon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/logistics/collection-trips/${trip.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canReceive && trip.status === "IN_TRANSIT" && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => router.push(`/logistics/receive/${trip.id}`)}
                            >
                              <PackageCheck className="h-4 w-4 mr-1" />
                              Receive
                            </Button>
                          )}
                        </div>
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
