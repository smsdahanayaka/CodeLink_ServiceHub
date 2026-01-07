"use client";

// ===========================================
// Pending Acceptance Page
// View IN_TRANSIT collections and receive items one by one
// ===========================================

import { useState, useEffect } from "react";
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
  } | null;
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  items: CollectionItem[];
  _count: { items: number };
}

interface GroupedData {
  [collectorId: string]: {
    collector: CollectionTrip["collector"];
    trips: CollectionTrip[];
    totalItems: number;
  };
}

export default function PendingAcceptancePage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trips, setTrips] = useState<CollectionTrip[]>([]);
  const [groupedData, setGroupedData] = useState<GroupedData>({});
  const [expandedCollectors, setExpandedCollectors] = useState<Set<string>>(new Set());
  const [expandedTrips, setExpandedTrips] = useState<Set<string>>(new Set());

  // Stats
  const [stats, setStats] = useState({
    inProgress: 0,
    inTransit: 0,
    receivedToday: 0,
    totalCollectors: 0,
  });

  // Action states
  const [processingItem, setProcessingItem] = useState<number | null>(null);
  const [rejectingItem, setRejectingItem] = useState<{ tripId: number; item: CollectionItem } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Verification checkboxes state: { itemId: { warrantyCardReceived: boolean, itemReceived: boolean } }
  const [itemVerification, setItemVerification] = useState<Record<number, { warrantyCardReceived: boolean; itemReceived: boolean }>>({});

  useEffect(() => {
    fetchInTransitCollections();
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch all collection trips for stats
      const [inProgressRes, inTransitRes, receivedRes, collectorsRes] = await Promise.all([
        fetch("/api/logistics/collection-trips?status=IN_PROGRESS&limit=1"),
        fetch("/api/logistics/collection-trips?status=IN_TRANSIT&limit=1"),
        fetch("/api/logistics/collection-trips?status=RECEIVED&limit=1"),
        fetch("/api/logistics/collectors?status=ACTIVE&limit=1"),
      ]);

      const [inProgressData, inTransitData, receivedData, collectorsData] = await Promise.all([
        inProgressRes.json(),
        inTransitRes.json(),
        receivedRes.json(),
        collectorsRes.json(),
      ]);

      setStats({
        inProgress: inProgressData.meta?.total || 0,
        inTransit: inTransitData.meta?.total || 0,
        receivedToday: receivedData.meta?.total || 0,
        totalCollectors: collectorsData.meta?.total || 0,
      });
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

        // Group by collector
        const grouped: GroupedData = {};
        for (const trip of tripsData) {
          const collectorKey = `collector_${trip.collector.id}`;
          if (!grouped[collectorKey]) {
            grouped[collectorKey] = {
              collector: trip.collector,
              trips: [],
              totalItems: 0,
            };
          }
          grouped[collectorKey].trips.push(trip);
          grouped[collectorKey].totalItems += trip.items.filter(i => i.status === "COLLECTED").length;
        }
        setGroupedData(grouped);

        // Expand all by default
        setExpandedCollectors(new Set(Object.keys(grouped)));
        const tripKeys = tripsData.map(t => `trip_${t.id}`);
        setExpandedTrips(new Set(tripKeys));
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

    // Refresh stats too
    fetchStats();
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

  const toggleCollector = (key: string) => {
    const newExpanded = new Set(expandedCollectors);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedCollectors(newExpanded);
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
    // Must have product info (from warranty card or directly)
    const hasProduct = item.warrantyCard?.product || item.product;
    // Must have both verifications checked
    const verification = getVerification(item.id);
    const isVerified = verification.warrantyCardReceived && verification.itemReceived;
    return hasProduct && item.status === "COLLECTED" && isVerified;
  };

  const totalPendingItems = Object.values(groupedData).reduce((sum, g) => sum + g.totalItems, 0);

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
            onClick={() => fetchInTransitCollections(true)}
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
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
                <User className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalCollectors}</p>
                <p className="text-sm text-muted-foreground">Collectors</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Empty State */}
      {Object.keys(groupedData).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Truck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium">No Collections In Transit</p>
            <p className="text-muted-foreground">When collectors are on their way, items will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedData).map(([collectorKey, group]) => {
            const isCollectorExpanded = expandedCollectors.has(collectorKey);

            return (
              <Card key={collectorKey}>
                <Collapsible
                  open={isCollectorExpanded}
                  onOpenChange={() => toggleCollector(collectorKey)}
                >
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isCollectorExpanded ? (
                            <ChevronDown className="h-5 w-5" />
                          ) : (
                            <ChevronRight className="h-5 w-5" />
                          )}
                          <div className="p-2 bg-primary/10 rounded-full">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{group.collector.name}</CardTitle>
                            <CardDescription className="flex items-center gap-4">
                              {group.collector.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {group.collector.phone}
                                </span>
                              )}
                              {group.collector.vehicleNumber && (
                                <span className="flex items-center gap-1">
                                  <Truck className="h-3 w-3" />
                                  {group.collector.vehicleNumber}
                                </span>
                              )}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-base px-3 py-1">
                          {group.totalItems} items
                        </Badge>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-4">
                      {group.trips.map((trip) => {
                        const tripKey = `trip_${trip.id}`;
                        const isTripExpanded = expandedTrips.has(tripKey);
                        const pendingItems = trip.items.filter(i => i.status === "COLLECTED");

                        return (
                          <div key={tripKey} className="border rounded-lg overflow-hidden">
                            <Collapsible
                              open={isTripExpanded}
                              onOpenChange={() => toggleTrip(tripKey)}
                            >
                              <CollapsibleTrigger asChild>
                                <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors bg-muted/10">
                                  <div className="flex items-center gap-3">
                                    {isTripExpanded ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                    <Store className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                      <div className="font-medium flex items-center gap-2">
                                        {trip.shop?.name || trip.customerName || "Direct Customer"}
                                        <Badge variant="outline" className="text-xs">
                                          {trip.tripNumber}
                                        </Badge>
                                      </div>
                                      <div className="text-sm text-muted-foreground flex items-center gap-3">
                                        {(trip.shop?.address || trip.customerAddress) && (
                                          <span className="flex items-center gap-1">
                                            <MapPin className="h-3 w-3" />
                                            {trip.shop?.address || trip.customerAddress}
                                          </span>
                                        )}
                                        <span className="flex items-center gap-1">
                                          <Clock className="h-3 w-3" />
                                          {format(new Date(trip.startedAt), "MMM d, h:mm a")}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <Badge variant={pendingItems.length > 0 ? "default" : "secondary"}>
                                    {pendingItems.length} pending
                                  </Badge>
                                </div>
                              </CollapsibleTrigger>

                              <CollapsibleContent>
                                <div className="divide-y">
                                  {trip.items.map((item) => {
                                    const warranty = getWarrantyStatus(item);
                                    const WarrantyIcon = warranty.icon;
                                    const isProcessing = processingItem === item.id;
                                    const canReceiveItem = canReceive(item);

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

                                    return (
                                      <div
                                        key={item.id}
                                        className="p-4 hover:bg-muted/20 transition-colors"
                                      >
                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                          {/* Item Info */}
                                          <div className="flex-1 space-y-2">
                                            <div className="flex items-center gap-3">
                                              <Package className="h-5 w-5 text-primary" />
                                              <span className="font-semibold text-lg">{item.serialNumber}</span>
                                            </div>

                                            {/* Product Info */}
                                            <div className="pl-8 space-y-1">
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

                                              {/* Customer Info */}
                                              {(item.customerName || item.warrantyCard?.customer) && (
                                                <div className="flex items-center gap-2">
                                                  <span className="text-sm text-muted-foreground">Customer:</span>
                                                  <span className="text-sm">
                                                    {item.warrantyCard?.customer?.name || item.customerName}
                                                    {(item.warrantyCard?.customer?.phone || item.customerPhone) && (
                                                      <span className="text-muted-foreground ml-1">
                                                        ({item.warrantyCard?.customer?.phone || item.customerPhone})
                                                      </span>
                                                    )}
                                                  </span>
                                                </div>
                                              )}

                                              {/* Verification Checkboxes */}
                                              <div className="mt-3 pt-3 border-t border-dashed">
                                                <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">
                                                  Handover Verification
                                                </p>
                                                <div className="flex flex-wrap gap-4">
                                                  {/* Warranty Card Received */}
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

                                                  {/* Item Received */}
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
                                          <div className="flex items-center gap-2 pl-8 lg:pl-0">
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                              onClick={() => setRejectingItem({ tripId: trip.id, item })}
                                              disabled={isProcessing}
                                            >
                                              <X className="h-4 w-4 mr-1" />
                                              Reject
                                            </Button>
                                            <Button
                                              size="sm"
                                              onClick={() => handleReceiveItem(trip.id, item.id)}
                                              disabled={!canReceiveItem || isProcessing}
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
                                        </div>

                                        {/* Warning if can't receive */}
                                        {!canReceiveItem && (
                                          <div className="mt-2 pl-8 flex items-center gap-2 text-sm text-orange-600">
                                            <AlertCircle className="h-4 w-4" />
                                            {!(item.warrantyCard?.product || item.product)
                                              ? "Product must be specified to receive this item"
                                              : "Please verify both checkboxes above before receiving"
                                            }
                                          </div>
                                        )}
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
