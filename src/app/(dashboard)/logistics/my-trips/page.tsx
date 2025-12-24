"use client";

// ===========================================
// My Trips Dashboard - Collector View
// Mobile-friendly interface for collectors
// ===========================================

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  Truck,
  Clock,
  Plus,
  ArrowRight,
  MapPin,
  Phone,
  RefreshCw,
  PackageOpen,
  Send,
  Calendar,
  Play,
  Loader2,
  Route,
} from "lucide-react";

import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { usePermissions } from "@/lib/hooks";

interface CollectionTrip {
  id: number;
  tripNumber: string;
  fromType: "SHOP" | "CUSTOMER";
  status: "IN_PROGRESS" | "IN_TRANSIT" | "RECEIVED" | "CANCELLED";
  startedAt: string;
  shop: {
    id: number;
    name: string;
    address: string | null;
    phone: string | null;
  } | null;
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  _count: { items: number };
}

interface DeliveryTrip {
  id: number;
  tripNumber: string;
  toType: "SHOP" | "CUSTOMER";
  status: "PENDING" | "ASSIGNED" | "IN_TRANSIT" | "COMPLETED" | "PARTIAL" | "CANCELLED";
  scheduledDate: string | null;
  scheduledSlot: string | null;
  shop: {
    id: number;
    name: string;
    address: string | null;
    phone: string | null;
  } | null;
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  _count: { items: number };
}

interface PendingPickup {
  id: number;
  pickupNumber: string;
  fromType: "SHOP" | "CUSTOMER";
  status: "PENDING" | "ASSIGNED";
  scheduledDate: string | null;
  scheduledTimeSlot: string | null;
  routeArea: string | null;
  route: {
    id: number;
    name: string;
    zone: string | null;
    areas: string | null;
  } | null;
  fromShop: {
    id: number;
    name: string;
    address: string | null;
    phone: string | null;
  } | null;
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  claim: {
    id: number;
    claimNumber: string;
    warrantyCard: {
      serialNumber: string;
      product: { name: string } | null;
    };
  } | null;
}

export default function MyTripsPage() {
  const router = useRouter();
  const { hasPermission } = usePermissions();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [startingPickup, setStartingPickup] = useState<number | null>(null);
  const [collectionTrips, setCollectionTrips] = useState<CollectionTrip[]>([]);
  const [deliveryTrips, setDeliveryTrips] = useState<DeliveryTrip[]>([]);
  const [pendingPickups, setPendingPickups] = useState<PendingPickup[]>([]);

  const canCreateCollection = hasPermission("logistics.create_collection") || hasPermission("logistics.collect");

  useEffect(() => {
    fetchMyTrips();
  }, []);

  const fetchMyTrips = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Fetch collection trips (my active ones)
      const collectionRes = await fetch("/api/logistics/collection-trips?myTrips=true&status=IN_PROGRESS,IN_TRANSIT");
      const collectionData = await collectionRes.json();

      if (collectionData.success) {
        setCollectionTrips(collectionData.data);
      }

      // Fetch delivery trips (assigned to me)
      const deliveryRes = await fetch("/api/logistics/delivery-trips?myTrips=true&status=ASSIGNED,IN_TRANSIT");
      const deliveryData = await deliveryRes.json();

      if (deliveryData.success) {
        setDeliveryTrips(deliveryData.data);
      }

      // Fetch pending pickups (assigned to me)
      const pickupRes = await fetch("/api/logistics/pickups?myPickups=true&status=PENDING,ASSIGNED");
      const pickupData = await pickupRes.json();

      if (pickupData.success) {
        setPendingPickups(pickupData.data);
      }
    } catch (error) {
      console.error("Error fetching trips:", error);
      toast.error("Failed to load trips");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleStartPickup = async (pickupId: number) => {
    try {
      setStartingPickup(pickupId);
      const res = await fetch(`/api/logistics/pickups/${pickupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Pickup started! Collection trip created.");
        // Refresh to show the new collection trip
        fetchMyTrips(true);
      } else {
        throw new Error(data.error?.message || "Failed to start pickup");
      }
    } catch (error) {
      console.error("Error starting pickup:", error);
      toast.error(error instanceof Error ? error.message : "Failed to start pickup");
    } finally {
      setStartingPickup(null);
    }
  };

  const activeCollections = collectionTrips.filter((t) =>
    ["IN_PROGRESS", "IN_TRANSIT"].includes(t.status)
  );
  const activeDeliveries = deliveryTrips.filter((t) =>
    ["ASSIGNED", "IN_TRANSIT"].includes(t.status)
  );
  const activePendingPickups = pendingPickups.filter((p) =>
    ["PENDING", "ASSIGNED"].includes(p.status)
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Trips"
        description="Your active collection and delivery trips"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchMyTrips(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
            {canCreateCollection && (
              <Button onClick={() => router.push("/logistics/collect")}>
                <Plus className="h-4 w-4 mr-2" />
                New Collection
              </Button>
            )}
          </div>
        }
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-orange-50 dark:bg-orange-950/30 border-orange-200">
          <CardHeader className="pb-2">
            <CardDescription className="text-orange-700 dark:text-orange-400">
              Pending Pickups
            </CardDescription>
            <CardTitle className="text-3xl text-orange-700 dark:text-orange-400">
              {activePendingPickups.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Clock className="h-5 w-5 text-orange-500" />
          </CardContent>
        </Card>
        <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200">
          <CardHeader className="pb-2">
            <CardDescription className="text-blue-700 dark:text-blue-400">
              Active Collections
            </CardDescription>
            <CardTitle className="text-3xl text-blue-700 dark:text-blue-400">
              {activeCollections.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PackageOpen className="h-5 w-5 text-blue-500" />
          </CardContent>
        </Card>
        <Card className="bg-green-50 dark:bg-green-950/30 border-green-200">
          <CardHeader className="pb-2">
            <CardDescription className="text-green-700 dark:text-green-400">
              Active Deliveries
            </CardDescription>
            <CardTitle className="text-3xl text-green-700 dark:text-green-400">
              {activeDeliveries.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Send className="h-5 w-5 text-green-500" />
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Pickups, Collections and Deliveries */}
      <Tabs defaultValue={activePendingPickups.length > 0 ? "pickups" : "collections"} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pickups" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pickups ({activePendingPickups.length})
          </TabsTrigger>
          <TabsTrigger value="collections" className="flex items-center gap-2">
            <PackageOpen className="h-4 w-4" />
            Collections ({activeCollections.length})
          </TabsTrigger>
          <TabsTrigger value="deliveries" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Deliveries ({activeDeliveries.length})
          </TabsTrigger>
        </TabsList>

        {/* Pending Pickups Tab */}
        <TabsContent value="pickups" className="space-y-4 mt-4">
          {activePendingPickups.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No pending pickups assigned to you</p>
              </CardContent>
            </Card>
          ) : (
            activePendingPickups.map((pickup) => (
              <Card key={pickup.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{pickup.pickupNumber}</CardTitle>
                    <Badge variant={pickup.status === "ASSIGNED" ? "default" : "secondary"}>
                      {pickup.status === "ASSIGNED" ? "Ready" : "Pending"}
                    </Badge>
                  </div>
                  {pickup.scheduledDate && (
                    <CardDescription className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(pickup.scheduledDate).toLocaleDateString()}
                      {pickup.scheduledTimeSlot && ` (${pickup.scheduledTimeSlot})`}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      {/* Route Info - Primary */}
                      {pickup.route && (
                        <div className="flex items-center gap-2 text-sm">
                          <Route className="h-4 w-4 text-primary" />
                          <span className="font-medium">{pickup.route.name}</span>
                          {pickup.route.zone && (
                            <Badge variant="secondary" className="text-xs">
                              {pickup.route.zone}
                            </Badge>
                          )}
                        </div>
                      )}
                      {/* Shop/Customer Info */}
                      {(pickup.fromShop || pickup.customerName) && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          {pickup.fromType === "SHOP" && pickup.fromShop ? (
                            <span>{pickup.fromShop.name}</span>
                          ) : (
                            <span>{pickup.customerName || "Customer"}</span>
                          )}
                        </div>
                      )}
                      {(pickup.fromShop?.phone || pickup.customerPhone) && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <a
                            href={`tel:${pickup.fromShop?.phone || pickup.customerPhone}`}
                            className="hover:underline"
                          >
                            {pickup.fromShop?.phone || pickup.customerPhone}
                          </a>
                        </div>
                      )}
                      {/* Claim/Product Info if available */}
                      {pickup.claim?.warrantyCard && (
                        <div className="flex items-center gap-2 text-sm">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span>{pickup.claim.warrantyCard.product?.name || "N/A"}</span>
                          <Badge variant="outline" className="text-xs">
                            {pickup.claim.warrantyCard.serialNumber}
                          </Badge>
                        </div>
                      )}
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => handleStartPickup(pickup.id)}
                      disabled={startingPickup === pickup.id}
                    >
                      {startingPickup === pickup.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      Start Pickup
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="collections" className="space-y-4 mt-4">
          {activeCollections.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <PackageOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground mb-4">No active collection trips</p>
                {canCreateCollection && (
                  <Button onClick={() => router.push("/logistics/collect")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Start New Collection
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            activeCollections.map((trip) => (
              <Card
                key={trip.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(`/logistics/collect/${trip.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{trip.tripNumber}</CardTitle>
                    <Badge
                      variant={trip.status === "IN_PROGRESS" ? "default" : "secondary"}
                    >
                      {trip.status === "IN_PROGRESS" ? "Collecting" : "In Transit"}
                    </Badge>
                  </div>
                  <CardDescription>
                    Started {formatDate(trip.startedAt)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {trip.fromType === "SHOP" && trip.shop ? (
                          <span>{trip.shop.name}</span>
                        ) : (
                          <span>{trip.customerName}</span>
                        )}
                      </div>
                      {(trip.shop?.phone || trip.customerPhone) && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <a
                            href={`tel:${trip.shop?.phone || trip.customerPhone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="hover:underline"
                          >
                            {trip.shop?.phone || trip.customerPhone}
                          </a>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="outline">{trip._count.items} items</Badge>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="deliveries" className="space-y-4 mt-4">
          {activeDeliveries.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Truck className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No active delivery trips</p>
              </CardContent>
            </Card>
          ) : (
            activeDeliveries.map((trip) => (
              <Card
                key={trip.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(`/logistics/deliver/${trip.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{trip.tripNumber}</CardTitle>
                    <Badge
                      variant={trip.status === "ASSIGNED" ? "secondary" : "default"}
                    >
                      {trip.status === "ASSIGNED" ? "Ready" : "In Transit"}
                    </Badge>
                  </div>
                  {trip.scheduledDate && (
                    <CardDescription>
                      Scheduled: {new Date(trip.scheduledDate).toLocaleDateString()}
                      {trip.scheduledSlot && ` (${trip.scheduledSlot})`}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {trip.toType === "SHOP" && trip.shop ? (
                          <span>{trip.shop.name}</span>
                        ) : (
                          <span>{trip.customerName}</span>
                        )}
                      </div>
                      {(trip.shop?.address || trip.customerAddress) && (
                        <p className="text-xs text-muted-foreground pl-6 line-clamp-1">
                          {trip.shop?.address || trip.customerAddress}
                        </p>
                      )}
                      {(trip.shop?.phone || trip.customerPhone) && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <a
                            href={`tel:${trip.shop?.phone || trip.customerPhone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="hover:underline"
                          >
                            {trip.shop?.phone || trip.customerPhone}
                          </a>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="outline">{trip._count.items} items</Badge>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
