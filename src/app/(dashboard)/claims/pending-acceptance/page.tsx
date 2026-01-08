"use client";

// ===========================================
// Pending Acceptance Page
// View IN_TRANSIT collections grouped by Trip → Shop → Items
// ===========================================

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  User,
  Store,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Truck,
  Phone,
  Loader2,
  Shield,
  ShieldAlert,
  ShieldX,
  Clock,
  MapPin,
  FileCheck,
  PackageCheck,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";

interface CollectionItem {
  id: number;
  serialNumber: string;
  issueDescription: string;
  status: string;
  customerName: string | null;
  customerPhone: string | null;
  notes: string | null;
  shopId: number | null;
  shop: {
    id: number;
    name: string;
    address: string | null;
    phone: string | null;
    isVerified: boolean;
  } | null;
  warrantyCard: {
    id: number;
    cardNumber: string;
    status: string;
    warrantyEndDate: string;
    product: { id: number; name: string; modelNumber?: string } | null;
    customer: { id: number; name: string; phone: string } | null;
  } | null;
  product: { id: number; name: string } | null;
  claim: { id: number; claimNumber: string } | null;
}

interface CollectionTrip {
  id: number;
  tripNumber: string;
  status: string;
  fromType: string;
  startedAt: string;
  notes: string | null;
  collector: {
    id: number;
    name: string;
    phone: string | null;
    vehicleNumber: string | null;
  };
  shop: {
    id: number;
    name: string;
    address: string | null;
    phone: string | null;
    isVerified: boolean;
  } | null;
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  items: CollectionItem[];
  _count: { items: number };
}

// Group items by shop within a trip
interface ShopGroup {
  shop: {
    id: number;
    name: string;
    address: string | null;
    phone: string | null;
    isVerified: boolean;
  } | null;
  shopKey: string;
  items: CollectionItem[];
  pendingCount: number;
}

export default function PendingAcceptancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trips, setTrips] = useState<CollectionTrip[]>([]);
  const [receivedTrips, setReceivedTrips] = useState<CollectionTrip[]>([]);
  const [expandedTrips, setExpandedTrips] = useState<Set<string>>(new Set());
  const [expandedShops, setExpandedShops] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"pending" | "received" | "rejected">("pending");

  // Stats
  const [stats, setStats] = useState({
    inProgress: 0,
    inTransit: 0,
    receivedToday: 0,
    rejectedCount: 0,
  });

  // Rejected items state
  const [rejectedItems, setRejectedItems] = useState<CollectionItem[]>([]);

  // Action states
  const [processingItem, setProcessingItem] = useState<number | null>(null);
  const [rejectingItem, setRejectingItem] = useState<{ tripId: number; item: CollectionItem } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Verification checkboxes state
  const [itemVerification, setItemVerification] = useState<Record<number, { warrantyCardReceived: boolean; itemReceived: boolean }>>({});

  useEffect(() => {
    fetchInTransitCollections();
    fetchReceivedCollections();
    fetchRejectedItems();
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [inProgressRes, inTransitRes, receivedRes] = await Promise.all([
        fetch("/api/logistics/collection-trips?status=IN_PROGRESS&limit=1"),
        fetch("/api/logistics/collection-trips?status=IN_TRANSIT&limit=1"),
        fetch("/api/logistics/collection-trips?status=RECEIVED&limit=1"),
      ]);

      const [inProgressData, inTransitData, receivedData] = await Promise.all([
        inProgressRes.json(),
        inTransitRes.json(),
        receivedRes.json(),
      ]);

      setStats(prev => ({
        ...prev,
        inProgress: inProgressData.meta?.total || 0,
        inTransit: inTransitData.meta?.total || 0,
        receivedToday: receivedData.meta?.total || 0,
      }));
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchInTransitCollections = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const res = await fetch("/api/logistics/collection-trips?status=IN_TRANSIT&limit=100");
      const result = await res.json();

      if (result.success) {
        const tripsData = result.data as CollectionTrip[];
        setTrips(tripsData);

        // Expand all trips and shops by default
        const tripKeys = tripsData.map(t => `trip_${t.id}`);
        setExpandedTrips(new Set(tripKeys));

        // Expand all shop groups
        const shopKeys: string[] = [];
        tripsData.forEach(trip => {
          const groups = groupItemsByShop(trip.items, trip.shop);
          groups.forEach(g => shopKeys.push(`trip_${trip.id}_${g.shopKey}`));
        });
        setExpandedShops(new Set(shopKeys));
      } else {
        toast.error(result.error?.message || "Failed to load collections");
      }
    } catch (error) {
      console.error("Error fetching collections:", error);
      toast.error("Failed to load collections");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }

    fetchStats();
  };

  // Fetch received collections
  const fetchReceivedCollections = async () => {
    try {
      const res = await fetch("/api/logistics/collection-trips?status=RECEIVED&limit=50");
      const result = await res.json();

      if (result.success) {
        setReceivedTrips(result.data as CollectionTrip[]);
      }
    } catch (error) {
      console.error("Error fetching received collections:", error);
    }
  };

  // Fetch rejected items from all trips
  const fetchRejectedItems = async () => {
    try {
      // Fetch all trips and filter items with REJECTED status
      const res = await fetch("/api/logistics/collection-trips?limit=100");
      const result = await res.json();

      if (result.success) {
        const allTrips = result.data as CollectionTrip[];
        const rejected: CollectionItem[] = [];
        allTrips.forEach(trip => {
          trip.items.forEach(item => {
            if (item.status === "REJECTED") {
              rejected.push(item);
            }
          });
        });
        setRejectedItems(rejected);
        setStats(prev => ({ ...prev, rejectedCount: rejected.length }));
      }
    } catch (error) {
      console.error("Error fetching rejected items:", error);
    }
  };

  // Group items by shop within a trip (uses trip's shop as fallback)
  const groupItemsByShop = (items: CollectionItem[], tripShop: CollectionTrip["shop"]): ShopGroup[] => {
    const groups: Record<string, ShopGroup> = {};

    items.forEach(item => {
      // Use item's shop, or fallback to trip's shop, or "no_shop" for direct customers
      const effectiveShop = item.shop || tripShop;
      const shopKey = effectiveShop?.id ? `shop_${effectiveShop.id}` : "no_shop";

      if (!groups[shopKey]) {
        groups[shopKey] = {
          shop: effectiveShop,
          shopKey,
          items: [],
          pendingCount: 0,
        };
      }
      groups[shopKey].items.push(item);
      if (item.status === "COLLECTED") {
        groups[shopKey].pendingCount++;
      }
    });

    // Sort: shops with pending items first, then by shop name
    return Object.values(groups).sort((a, b) => {
      if (a.pendingCount > 0 && b.pendingCount === 0) return -1;
      if (a.pendingCount === 0 && b.pendingCount > 0) return 1;
      const nameA = a.shop?.name || "ZZZ";
      const nameB = b.shop?.name || "ZZZ";
      return nameA.localeCompare(nameB);
    });
  };

  const handleReceiveItem = async (tripId: number, itemId: number) => {
    try {
      setProcessingItem(itemId);
      const res = await fetch(`/api/logistics/collection-trips/${tripId}/items/${itemId}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "receive" }),
      });

      const result = await res.json();

      if (result.success) {
        toast.success(`Claim ${result.data.claim.claimNumber} created successfully`);
        fetchInTransitCollections(true);
        fetchReceivedCollections();
        fetchRejectedItems();
      } else {
        toast.error(result.error?.message || "Failed to receive item");
      }
    } catch (error) {
      console.error("Error receiving item:", error);
      toast.error("Failed to receive item");
    } finally {
      setProcessingItem(null);
    }
  };

  const handleRejectItem = async () => {
    if (!rejectingItem || !rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    try {
      setProcessingItem(rejectingItem.item.id);
      const res = await fetch(`/api/logistics/collection-trips/${rejectingItem.tripId}/items/${rejectingItem.item.id}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          rejectionReason: rejectionReason.trim(),
        }),
      });

      const result = await res.json();

      if (result.success) {
        toast.success("Item rejected and return delivery created");
        setRejectingItem(null);
        setRejectionReason("");
        fetchInTransitCollections(true);
        fetchReceivedCollections();
        fetchRejectedItems();
      } else {
        toast.error(result.error?.message || "Failed to reject item");
      }
    } catch (error) {
      console.error("Error rejecting item:", error);
      toast.error("Failed to reject item");
    } finally {
      setProcessingItem(null);
    }
  };

  const toggleTrip = (key: string) => {
    const newExpanded = new Set(expandedTrips);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedTrips(newExpanded);
  };

  const toggleShop = (key: string) => {
    const newExpanded = new Set(expandedShops);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedShops(newExpanded);
  };

  const getWarrantyStatus = (item: CollectionItem) => {
    if (!item.warrantyCard) {
      return { status: "not_found", label: "No Warranty Card", color: "text-red-600", icon: ShieldX };
    }
    const isExpired = new Date() > new Date(item.warrantyCard.warrantyEndDate);
    if (isExpired) {
      return { status: "expired", label: "Warranty Expired", color: "text-orange-600", icon: ShieldAlert };
    }
    return { status: "valid", label: "Under Warranty", color: "text-green-600", icon: Shield };
  };

  const toggleVerification = (itemId: number, field: "warrantyCardReceived" | "itemReceived") => {
    setItemVerification((prev) => ({
      ...prev,
      [itemId]: {
        warrantyCardReceived: prev[itemId]?.warrantyCardReceived || false,
        itemReceived: prev[itemId]?.itemReceived || false,
        [field]: !prev[itemId]?.[field],
      },
    }));
  };

  const getVerification = (itemId: number) => {
    return itemVerification[itemId] || { warrantyCardReceived: false, itemReceived: false };
  };

  const canReceive = (item: CollectionItem) => {
    const hasProduct = item.warrantyCard?.product || item.product;
    const verification = getVerification(item.id);
    const isVerified = verification.warrantyCardReceived && verification.itemReceived;
    return hasProduct && item.status === "COLLECTED" && isVerified;
  };

  const totalPendingItems = trips.reduce((sum, trip) =>
    sum + trip.items.filter(i => i.status === "COLLECTED").length, 0
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Receive Collections"
        description={`${totalPendingItems} items waiting to be received`}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => { fetchInTransitCollections(true); fetchReceivedCollections(); fetchRejectedItems(); }}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-full">
                <Package className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
                <p className="text-sm text-muted-foreground">Collecting</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={stats.inTransit > 0 ? "ring-2 ring-blue-500" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                <Truck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inTransit}</p>
                <p className="text-sm text-muted-foreground">In Transit</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.receivedToday}</p>
                <p className="text-sm text-muted-foreground">Received</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={stats.rejectedCount > 0 ? "ring-2 ring-red-500" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 dark:bg-red-900 rounded-full">
                <X className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.rejectedCount}</p>
                <p className="text-sm text-muted-foreground">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Pending, Received, and Rejected */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "pending" | "received" | "rejected")}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Pending ({trips.reduce((acc, t) => acc + t.items.filter(i => i.status === "COLLECTED").length, 0)})
          </TabsTrigger>
          <TabsTrigger value="received" className="flex items-center gap-2">
            <Check className="h-4 w-4" />
            Received ({receivedTrips.reduce((acc, t) => acc + t.items.length, 0)})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex items-center gap-2">
            <X className="h-4 w-4" />
            Rejected ({rejectedItems.length})
          </TabsTrigger>
        </TabsList>

        {/* Pending Tab */}
        <TabsContent value="pending" className="mt-4">
          {trips.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Truck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium">No Collections In Transit</p>
                <p className="text-muted-foreground">When collectors are on their way, items will appear here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* LEVEL 1: Collection Trips */}
              {trips.map((trip) => {
            const tripKey = `trip_${trip.id}`;
            const isTripExpanded = expandedTrips.has(tripKey);
            const shopGroups = groupItemsByShop(trip.items, trip.shop);
            const pendingItems = trip.items.filter(i => i.status === "COLLECTED").length;

            return (
              <Card key={tripKey} className="overflow-hidden">
                <Collapsible
                  open={isTripExpanded}
                  onOpenChange={() => toggleTrip(tripKey)}
                >
                  {/* Trip Header */}
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isTripExpanded ? (
                            <ChevronDown className="h-5 w-5" />
                          ) : (
                            <ChevronRight className="h-5 w-5" />
                          )}
                          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                            <Truck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                              Collection {trip.tripNumber}
                              <Badge variant="outline" className="text-xs">
                                {trip.status}
                              </Badge>
                            </CardTitle>
                            <CardDescription className="flex items-center gap-4 mt-1">
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {trip.collector.name}
                              </span>
                              {trip.collector.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {trip.collector.phone}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(new Date(trip.startedAt), "MMM d, h:mm a")}
                              </span>
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {shopGroups.length} {shopGroups.length === 1 ? "shop" : "shops"}
                          </Badge>
                          <Badge variant={pendingItems > 0 ? "default" : "secondary"}>
                            {pendingItems} pending
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-3">
                      {/* LEVEL 2: Shops within Trip */}
                      {shopGroups.map((shopGroup) => {
                        const shopKey = `trip_${trip.id}_${shopGroup.shopKey}`;
                        const isShopExpanded = expandedShops.has(shopKey);

                        return (
                          <div key={shopKey} className="border rounded-lg overflow-hidden">
                            <Collapsible
                              open={isShopExpanded}
                              onOpenChange={() => toggleShop(shopKey)}
                            >
                              {/* Shop Header */}
                              <CollapsibleTrigger asChild>
                                <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors bg-muted/10">
                                  <div className="flex items-center gap-3">
                                    {isShopExpanded ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                    <Store className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                      <div className="font-medium">
                                        {shopGroup.shop?.name || "Direct Customer"}
                                      </div>
                                      {shopGroup.shop?.address && (
                                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                                          <MapPin className="h-3 w-3" />
                                          {shopGroup.shop.address}
                                        </div>
                                      )}
                                      {shopGroup.shop?.phone && (
                                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                                          <Phone className="h-3 w-3" />
                                          {shopGroup.shop.phone}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <Badge variant={shopGroup.pendingCount > 0 ? "default" : "secondary"}>
                                    {shopGroup.pendingCount} / {shopGroup.items.length} pending
                                  </Badge>
                                </div>
                              </CollapsibleTrigger>

                              <CollapsibleContent>
                                {/* LEVEL 3: Items within Shop */}
                                <div className="divide-y">
                                  {shopGroup.items.map((item) => {
                                    const warranty = getWarrantyStatus(item);
                                    const WarrantyIcon = warranty.icon;
                                    const isProcessing = processingItem === item.id;
                                    const canReceiveItem = canReceive(item);

                                    // Already processed items
                                    if (item.status !== "COLLECTED") {
                                      return (
                                        <div key={item.id} className="p-4 bg-muted/20">
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                              <Package className="h-5 w-5 text-muted-foreground" />
                                              <div>
                                                <span className="font-medium">{item.serialNumber}</span>
                                                <Badge variant="outline" className="ml-2 text-xs">
                                                  {item.status}
                                                </Badge>
                                              </div>
                                            </div>
                                            {item.claim && (
                                              <Badge variant="secondary">
                                                {item.claim.claimNumber}
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    }

                                    // Pending items
                                    return (
                                      <div
                                        key={item.id}
                                        className="p-4 hover:bg-muted/20 transition-colors"
                                      >
                                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                                          {/* Item Info */}
                                          <div className="flex-1 space-y-2">
                                            <div className="flex items-center gap-3">
                                              <Package className="h-5 w-5 text-primary" />
                                              <span className="font-semibold text-lg">{item.serialNumber}</span>
                                            </div>

                                            <div className="pl-8 space-y-1">
                                              {/* Product Info */}
                                              <div className="flex items-center gap-2">
                                                <span className="text-sm text-muted-foreground">Product:</span>
                                                <span className="font-medium">
                                                  {item.warrantyCard?.product?.name || item.product?.name || (
                                                    <span className="text-red-600 flex items-center gap-1">
                                                      <AlertCircle className="h-3 w-3" />
                                                      Not specified
                                                    </span>
                                                  )}
                                                </span>
                                              </div>

                                              {/* Warranty Status */}
                                              <div className="flex items-center gap-2">
                                                <span className="text-sm text-muted-foreground">Warranty:</span>
                                                <span className={`flex items-center gap-1 font-medium ${warranty.color}`}>
                                                  <WarrantyIcon className="h-4 w-4" />
                                                  {warranty.label}
                                                  {item.warrantyCard && (
                                                    <span className="text-xs text-muted-foreground ml-1">
                                                      ({item.warrantyCard.cardNumber})
                                                    </span>
                                                  )}
                                                </span>
                                              </div>

                                              {/* Issue Description */}
                                              <div className="flex items-start gap-2">
                                                <span className="text-sm text-muted-foreground">Issue:</span>
                                                <span className="text-sm">{item.issueDescription}</span>
                                              </div>

                                              {/* Shop Info */}
                                              {(() => {
                                                const effectiveShop = item.shop || trip.shop;
                                                if (!effectiveShop) return null;
                                                return (
                                                  <div className="flex items-center gap-2">
                                                    <span className="text-sm text-muted-foreground">Shop:</span>
                                                    <span className="text-sm flex items-center gap-1">
                                                      <Store className="h-3 w-3 text-muted-foreground" />
                                                      {effectiveShop.name}
                                                      {effectiveShop.phone && (
                                                        <span className="text-muted-foreground ml-1">
                                                          ({effectiveShop.phone})
                                                        </span>
                                                      )}
                                                      {!effectiveShop.isVerified && (
                                                        <Badge variant="outline" className="ml-1 text-xs text-orange-600 border-orange-300">
                                                          Pending Approval
                                                        </Badge>
                                                      )}
                                                    </span>
                                                  </div>
                                                );
                                              })()}

                                              {/* Verification Checkboxes */}
                                              <div className="mt-3 pt-3 border-t border-dashed">
                                                <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">
                                                  Handover Verification
                                                </p>
                                                <div className="flex flex-wrap gap-4">
                                                  <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                      id={`warranty-${item.id}`}
                                                      checked={getVerification(item.id).warrantyCardReceived}
                                                      onCheckedChange={() => toggleVerification(item.id, "warrantyCardReceived")}
                                                      disabled={isProcessing}
                                                    />
                                                    <Label
                                                      htmlFor={`warranty-${item.id}`}
                                                      className="flex items-center gap-1.5 text-sm cursor-pointer"
                                                    >
                                                      <FileCheck className={`h-4 w-4 ${getVerification(item.id).warrantyCardReceived ? "text-green-600" : "text-muted-foreground"}`} />
                                                      Warranty Card Received
                                                    </Label>
                                                  </div>

                                                  <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                      id={`item-${item.id}`}
                                                      checked={getVerification(item.id).itemReceived}
                                                      onCheckedChange={() => toggleVerification(item.id, "itemReceived")}
                                                      disabled={isProcessing}
                                                    />
                                                    <Label
                                                      htmlFor={`item-${item.id}`}
                                                      className="flex items-center gap-1.5 text-sm cursor-pointer"
                                                    >
                                                      <PackageCheck className={`h-4 w-4 ${getVerification(item.id).itemReceived ? "text-green-600" : "text-muted-foreground"}`} />
                                                      Item Received
                                                    </Label>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Actions */}
                                          {(() => {
                                            // Check if shop is approved (use effective shop from grouping)
                                            const effectiveShop = item.shop || trip.shop;
                                            const isShopNotApproved = effectiveShop ? !effectiveShop.isVerified : false;
                                            const isDisabled = isProcessing || isShopNotApproved;

                                            return (
                                              <div className="flex items-center gap-2 pl-8 lg:pl-0">
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                  onClick={() => setRejectingItem({ tripId: trip.id, item })}
                                                  disabled={isDisabled}
                                                >
                                                  <X className="h-4 w-4 mr-1" />
                                                  Reject
                                                </Button>
                                                <Button
                                                  size="sm"
                                                  onClick={() => handleReceiveItem(trip.id, item.id)}
                                                  disabled={!canReceiveItem || isDisabled}
                                                  className="min-w-[100px]"
                                                >
                                                  {isProcessing ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                  ) : (
                                                    <>
                                                      <Check className="h-4 w-4 mr-1" />
                                                      Receive
                                                    </>
                                                  )}
                                                </Button>
                                              </div>
                                            );
                                          })()}
                                        </div>

                                        {/* Warning messages */}
                                        {(() => {
                                          const effectiveShop = item.shop || trip.shop;
                                          const isShopNotApproved = effectiveShop && !effectiveShop.isVerified;

                                          if (isShopNotApproved) {
                                            return (
                                              <div
                                                className="mt-2 pl-8 flex items-center gap-2 text-sm text-red-600 cursor-pointer hover:text-red-700 hover:underline"
                                                onClick={() => router.push("/shops?tab=pending")}
                                              >
                                                <Store className="h-4 w-4" />
                                                Shop &quot;{effectiveShop.name}&quot; is pending approval. Click here to approve.
                                              </div>
                                            );
                                          }

                                          if (!canReceiveItem) {
                                            return (
                                              <div className="mt-2 pl-8 flex items-center gap-2 text-sm text-orange-600">
                                                <AlertCircle className="h-4 w-4" />
                                                {!(item.warrantyCard?.product || item.product)
                                                  ? "Product must be specified to receive this item"
                                                  : "Please verify both checkboxes above before receiving"
                                                }
                                              </div>
                                            );
                                          }

                                          return null;
                                        })()}
                                      </div>
                                    );
                                  })}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          </div>
                        );
                      })}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
            </div>
          )}
        </TabsContent>

        {/* Received Tab */}
        <TabsContent value="received" className="mt-4">
          {receivedTrips.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Check className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium">No Received Collections</p>
                <p className="text-muted-foreground">Received items will appear here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {receivedTrips.map((trip) => {
                const shopGroups = groupItemsByShop(trip.items, trip.shop);

                return (
                  <Card key={trip.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-100 dark:bg-green-900 rounded-full">
                            <Check className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">Collection {trip.tripNumber}</CardTitle>
                            <CardDescription className="flex items-center gap-2">
                              <User className="h-3 w-3" />
                              {trip.collector.name}
                              <span className="text-muted-foreground">•</span>
                              Received {format(new Date(trip.startedAt), "MMM d, h:mm a")}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-green-600 border-green-300">
                          {trip.items.length} items received
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {shopGroups.map((group) => (
                          <div key={group.shopKey} className="border rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Store className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {group.shop?.name || "Direct Customer"}
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                {group.items.length} items
                              </Badge>
                            </div>
                            <div className="space-y-2 pl-6">
                              {group.items.map((item) => (
                                <div key={item.id} className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-2">
                                    <Package className="h-4 w-4 text-muted-foreground" />
                                    <span>{item.serialNumber}</span>
                                    {item.warrantyCard?.product?.name && (
                                      <span className="text-muted-foreground">
                                        - {item.warrantyCard.product.name}
                                      </span>
                                    )}
                                  </div>
                                  {item.claim && (
                                    <Badge variant="outline">
                                      {item.claim.claimNumber}
                                    </Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Rejected Tab */}
        <TabsContent value="rejected" className="mt-4">
          {rejectedItems.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <X className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium">No Rejected Items</p>
                <p className="text-muted-foreground">Rejected items will appear here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <X className="h-5 w-5 text-red-600" />
                    Rejected Items ({rejectedItems.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {rejectedItems.map((item) => (
                      <div key={item.id} className="border rounded-lg p-4 bg-red-50 dark:bg-red-950/20">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-red-600" />
                              <span className="font-medium">{item.serialNumber}</span>
                              <Badge variant="destructive" className="text-xs">Rejected</Badge>
                            </div>
                            {item.warrantyCard?.product?.name && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground pl-6">
                                <span>Product: {item.warrantyCard.product.name}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-sm text-muted-foreground pl-6">
                              <span>Issue: {item.issueDescription}</span>
                            </div>
                            {item.shop && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground pl-6">
                                <Store className="h-3 w-3" />
                                <span>{item.shop.name}</span>
                              </div>
                            )}
                            {item.notes && (
                              <div className="flex items-center gap-2 text-sm text-red-600 pl-6">
                                <AlertCircle className="h-3 w-3" />
                                <span>Reason: {item.notes}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <AlertDialog open={!!rejectingItem} onOpenChange={() => setRejectingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Item?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reject item <strong>{rejectingItem?.item.serialNumber}</strong> and create a return delivery.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">Rejection Reason *</label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter the reason for rejection..."
              className="mt-2"
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRejectionReason("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRejectItem}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!rejectionReason.trim()}
            >
              Reject Item
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
