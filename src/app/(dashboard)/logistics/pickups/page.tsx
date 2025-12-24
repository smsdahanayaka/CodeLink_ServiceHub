"use client";

// ===========================================
// Pickups Management Page - Mobile Friendly
// ===========================================

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Package,
  User,
  Phone,
  Store,
  MapPin,
  Calendar,
  Clock,
  MoreVertical,
  Play,
  CheckCircle,
  XCircle,
  Search,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { StatusBadge, ConfirmDialog } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

// Types
interface Pickup {
  id: number;
  pickupNumber: string;
  claimId: number | null;
  status: "PENDING" | "ASSIGNED" | "IN_TRANSIT" | "COMPLETED" | "CANCELLED";
  fromType: "SHOP" | "CUSTOMER";
  fromAddress: string | null;
  routeArea: string | null;
  toLocation: string;
  scheduledDate: string | null;
  scheduledTimeSlot: string | null;
  notes: string | null;
  customerName: string | null;
  customerPhone: string | null;
  createdAt: string;
  route: {
    id: number;
    name: string;
    zone: string | null;
    areas: string | null;
  } | null;
  claim: {
    id: number;
    claimNumber: string;
    currentStatus: string;
    createdBy: number | null;
    createdByUser: { id: number; firstName: string; lastName: string } | null;
    warrantyCard: {
      id: number;
      serialNumber: string;
      product: { id: number; name: string };
      customer: { id: number; name: string; phone: string; address: string | null } | null;
      shop: { id: number; name: string; address: string | null; phone: string | null } | null;
    };
  } | null;
  warrantyCard: {
    id: number;
    serialNumber: string;
    product: { id: number; name: string };
    customer: { id: number; name: string; phone: string; address: string | null } | null;
    shop: { id: number; name: string; address: string | null; phone: string | null } | null;
  } | null;
  collector: {
    id: number;
    name: string;
    phone: string;
    vehicleNumber: string | null;
  } | null;
  fromShop: {
    id: number;
    name: string;
    address: string | null;
    phone: string | null;
  } | null;
}

interface Collector {
  id: number;
  name: string;
  phone: string;
  status: string;
  userId?: number;
  user?: { id: number; firstName: string; lastName: string; email: string } | null;
}

interface WarrantyCard {
  id: number;
  cardNumber: string;
  serialNumber: string;
  product: { id: number; name: string };
  customer: { id: number; name: string; phone: string; address: string | null } | null;
  shop: { id: number; name: string; address: string | null } | null;
}

interface Shop {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  city: string | null;
  isVerified?: boolean;
}

interface Route {
  id: number;
  name: string;
  zone: string | null;
  areas: string | null;
}

interface Product {
  id: number;
  name: string;
  modelNumber: string | null;
}

// Current user type
interface CurrentUser {
  id: number;
  collectorId: number | null; // If user is a collector, this is their collector ID
}

// User type for receiver selection
interface SystemUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

export default function PickupsPage() {
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [collectors, setCollectors] = useState<Collector[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]); // Users for receiver selection
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  // Create dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createData, setCreateData] = useState({
    routeId: null as number | null,
    newRouteName: "",
    newRouteZone: "",
    collectorId: "",
    scheduledDate: "",
    scheduledTimeSlot: "",
    notes: "",
    priority: "MEDIUM" as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
  });
  const [creating, setCreating] = useState(false);
  const [showNewRoute, setShowNewRoute] = useState(false);

  // Complete/Cancel states
  const [completePickup, setCompletePickup] = useState<Pickup | null>(null);
  const [receiverName, setReceiverName] = useState("");
  const [completionNotes, setCompletionNotes] = useState("");
  const [completing, setCompleting] = useState(false);
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Selected route for display
  const selectedRoute = routes.find(r => r.id === createData.routeId);

  // Fetch pickups
  const fetchPickups = useCallback(async () => {
    try {
      const url = statusFilter === "all"
        ? "/api/logistics/pickups?limit=100"
        : `/api/logistics/pickups?limit=100&status=${statusFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setPickups(data.data);
      }
    } catch (error) {
      console.error("Error fetching pickups:", error);
      toast.error("Failed to load pickups");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  // Fetch related data
  const fetchRelatedData = async () => {
    try {
      // Fetch all data in parallel, with individual error handling
      const [collectorsRes, routesRes, meRes, usersRes] = await Promise.all([
        fetch("/api/logistics/collectors?status=ACTIVE&limit=100").catch(() => null),
        fetch("/api/logistics/routes?status=ACTIVE&limit=100").catch(() => null),
        fetch("/api/auth/me").catch(() => null),
        fetch("/api/users?status=ACTIVE&limit=100").catch(() => null),
      ]);

      // Parse responses with error handling
      const collectorsData = collectorsRes ? await collectorsRes.json().catch(() => ({})) : {};
      const routesData = routesRes ? await routesRes.json().catch(() => ({})) : {};
      const meData = meRes ? await meRes.json().catch(() => ({})) : {};
      const usersData = usersRes ? await usersRes.json().catch(() => ({})) : {};

      if (collectorsData.success) setCollectors(collectorsData.data);
      if (routesData.success) setRoutes(routesData.data);
      if (usersData.success) setUsers(usersData.data);

      // Get current user's collector ID if they are a collector
      if (meData.success && meData.data) {
        const userId = meData.data.id;
        // Check if this user is a collector (user relation on collector)
        const userCollector = collectorsData.success
          ? collectorsData.data.find((c: Collector) => c.user?.id === userId || c.userId === userId)
          : null;
        setCurrentUser({
          id: userId,
          collectorId: userCollector?.id || null,
        });
      }
    } catch (error) {
      console.error("Error fetching related data:", error);
    }
  };

  useEffect(() => {
    fetchPickups();
    fetchRelatedData();
  }, [fetchPickups]);

  // Filter pickups by search query
  const filteredPickups = pickups.filter(pickup => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      pickup.pickupNumber?.toLowerCase().includes(query) ||
      pickup.claim?.claimNumber?.toLowerCase().includes(query) ||
      pickup.customerName?.toLowerCase().includes(query) ||
      pickup.customerPhone?.includes(query) ||
      pickup.fromShop?.name?.toLowerCase().includes(query) ||
      pickup.warrantyCard?.serialNumber?.toLowerCase().includes(query)
    );
  });

  // Open create dialog
  const handleOpenCreate = () => {
    // Auto-assign collector if current user is a collector
    const autoCollectorId = currentUser?.collectorId?.toString() || "";

    setCreateData({
      routeId: null,
      newRouteName: "",
      newRouteZone: "",
      collectorId: autoCollectorId, // Auto-assign if user is a collector
      scheduledDate: "",
      scheduledTimeSlot: "",
      notes: "",
      priority: "MEDIUM",
    });
    setShowNewRoute(false);
    setIsCreateOpen(true);
  };

  // Check if current user is a collector
  const isCurrentUserCollector = !!currentUser?.collectorId;

  // Create pickup
  const handleCreate = async () => {
    // Route is required - either select existing or add new
    if (!createData.routeId && !createData.newRouteName) {
      toast.error("Please select a route or add a new one");
      return;
    }

    setCreating(true);
    try {
      // Build request body
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const requestBody: Record<string, any> = {
        collectorId: createData.collectorId ? parseInt(createData.collectorId) : null,
        scheduledDate: createData.scheduledDate || undefined,
        scheduledTimeSlot: createData.scheduledTimeSlot || undefined,
        notes: createData.notes || undefined,
        priority: createData.priority,
      };

      // Either use existing route or create new
      if (createData.routeId) {
        requestBody.routeId = createData.routeId;
      } else if (createData.newRouteName) {
        requestBody.newRoute = {
          name: createData.newRouteName,
          zone: createData.newRouteZone || undefined,
        };
      }

      const res = await fetch("/api/logistics/pickups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Pickup scheduled successfully");
        setIsCreateOpen(false);
        fetchPickups();
        // Refresh routes in case a new one was created
        if (createData.newRouteName) {
          fetchRelatedData();
        }
      } else {
        toast.error(data.error?.message || "Failed to create pickup");
      }
    } catch (error) {
      toast.error("Failed to create pickup");
    } finally {
      setCreating(false);
    }
  };

  // Start transit
  const handleStartTransit = async (pickup: Pickup) => {
    try {
      const res = await fetch(`/api/logistics/pickups/${pickup.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start_transit" }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Pickup started - in transit");
        fetchPickups();
      } else {
        toast.error(data.error?.message || "Failed to start pickup");
      }
    } catch (error) {
      toast.error("Failed to start pickup");
    }
  };

  // Open complete pickup dialog with auto-selected receiver
  const handleOpenComplete = (pickup: Pickup) => {
    // Auto-select claim creator as receiver if available
    const claimCreator = pickup.claim?.createdByUser;
    if (claimCreator) {
      setReceiverName(`${claimCreator.firstName} ${claimCreator.lastName}`);
    } else {
      setReceiverName("");
    }
    setCompletionNotes("");
    setCompletePickup(pickup);
  };

  // Complete pickup
  const handleComplete = async () => {
    if (!completePickup || !receiverName) return;

    setCompleting(true);
    try {
      const res = await fetch(`/api/logistics/pickups/${completePickup.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete",
          receiverName,
          notes: completionNotes || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Pickup completed");
        setCompletePickup(null);
        setReceiverName("");
        setCompletionNotes("");
        fetchPickups();
      } else {
        toast.error(data.error?.message || "Failed to complete pickup");
      }
    } catch (error) {
      toast.error("Failed to complete pickup");
    } finally {
      setCompleting(false);
    }
  };

  // Cancel pickup
  const handleCancel = async () => {
    if (!cancelId) return;

    setCancelling(true);
    try {
      const res = await fetch(`/api/logistics/pickups/${cancelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Pickup cancelled");
        setCancelId(null);
        fetchPickups();
      } else {
        toast.error(data.error?.message || "Failed to cancel pickup");
      }
    } catch (error) {
      toast.error("Failed to cancel pickup");
    } finally {
      setCancelling(false);
    }
  };

  // Assign collector
  const handleAssignCollector = async (pickupId: number, collectorId: number) => {
    try {
      const res = await fetch(`/api/logistics/pickups/${pickupId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectorId }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Collector assigned");
        fetchPickups();
      } else {
        toast.error(data.error?.message || "Failed to assign collector");
      }
    } catch (error) {
      toast.error("Failed to assign collector");
    }
  };

  // Get status counts
  const statusCounts = {
    all: pickups.length,
    PENDING: pickups.filter(p => p.status === "PENDING").length,
    ASSIGNED: pickups.filter(p => p.status === "ASSIGNED").length,
    IN_TRANSIT: pickups.filter(p => p.status === "IN_TRANSIT").length,
    COMPLETED: pickups.filter(p => p.status === "COMPLETED").length,
  };

  // Render pickup card (mobile-friendly)
  const renderPickupCard = (pickup: Pickup) => {
    const wc = pickup.warrantyCard || pickup.claim?.warrantyCard;

    return (
      <Card key={pickup.id} className="mb-3">
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-medium text-sm">{pickup.pickupNumber}</span>
                <StatusBadge status={pickup.status} />
              </div>
              {pickup.claim && (
                <div className="text-xs text-muted-foreground mt-1">
                  Claim: {pickup.claim.claimNumber}
                </div>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="bottom" sideOffset={5} className="min-w-[160px]">
                {/* Start Transit - needs collector */}
                {["PENDING", "ASSIGNED"].includes(pickup.status) && pickup.collector && (
                  <DropdownMenuItem onClick={() => handleStartTransit(pickup)}>
                    <Play className="mr-2 h-4 w-4" />
                    Start Transit
                  </DropdownMenuItem>
                )}
                {/* Start Transit disabled hint - no collector */}
                {["PENDING", "ASSIGNED"].includes(pickup.status) && !pickup.collector && (
                  <DropdownMenuItem disabled className="text-muted-foreground">
                    <Play className="mr-2 h-4 w-4" />
                    Start Transit
                    <span className="ml-1 text-xs">(assign first)</span>
                  </DropdownMenuItem>
                )}
                {/* Complete - only in transit */}
                {pickup.status === "IN_TRANSIT" && (
                  <DropdownMenuItem onClick={() => handleOpenComplete(pickup)}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Complete
                  </DropdownMenuItem>
                )}
                {/* Cancel - only for active pickups */}
                {!["COMPLETED", "CANCELLED"].includes(pickup.status) && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setCancelId(pickup.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Cancel
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Route Info */}
          {(pickup.route || pickup.routeArea) && (
            <div className="flex items-center gap-2 mb-3 p-2 bg-muted/50 rounded-lg">
              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">
                  {pickup.route?.name || pickup.routeArea || "Route"}
                </div>
                {pickup.route?.zone && (
                  <div className="text-xs text-muted-foreground">{pickup.route.zone}</div>
                )}
              </div>
            </div>
          )}

          {/* Product Info (if has warranty card) */}
          {wc && (
            <div className="flex items-center gap-2 mb-3 p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
              <Package className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">{wc.product.name}</div>
                <div className="text-xs text-muted-foreground">S/N: {wc.serialNumber}</div>
              </div>
            </div>
          )}

          {/* Shop/Customer Info (if linked) */}
          {(pickup.fromShop || pickup.customerName || wc?.customer || wc?.shop) && (
            <div className="space-y-2 mb-3">
              <div className="flex items-start gap-2">
                {pickup.fromType === "SHOP" ? (
                  <Store className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                ) : (
                  <User className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">
                    {pickup.fromType === "SHOP"
                      ? pickup.fromShop?.name || wc?.shop?.name || "Shop"
                      : pickup.customerName || wc?.customer?.name || "Customer"}
                  </div>
                  {(pickup.customerPhone || wc?.customer?.phone || pickup.fromShop?.phone || wc?.shop?.phone) && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {pickup.customerPhone || wc?.customer?.phone || pickup.fromShop?.phone || wc?.shop?.phone}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Collector & Schedule */}
          <div className="flex flex-wrap gap-2 items-center">
            {pickup.collector ? (
              <Badge variant="outline" className="text-xs">
                <Truck className="mr-1 h-3 w-3" />
                {pickup.collector.name}
              </Badge>
            ) : (
              <Select onValueChange={(value) => handleAssignCollector(pickup.id, parseInt(value))}>
                <SelectTrigger className="h-7 w-auto text-xs">
                  <SelectValue placeholder="Assign collector" />
                </SelectTrigger>
                <SelectContent>
                  {collectors.map(c => (
                    <SelectItem key={c.id} value={c.id.toString()} className="text-xs">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {pickup.scheduledDate && (
              <Badge variant="secondary" className="text-xs">
                <Calendar className="mr-1 h-3 w-3" />
                {format(new Date(pickup.scheduledDate), "MMM dd")}
                {pickup.scheduledTimeSlot && ` ${pickup.scheduledTimeSlot}`}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header - Mobile Friendly */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Pickups</h1>
          <p className="text-sm text-muted-foreground">Schedule and manage product pickups</p>
        </div>
        <Button onClick={handleOpenCreate} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Schedule Pickup
        </Button>
      </div>

      {/* Status Filter - Horizontal Scroll on Mobile */}
      <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-2 min-w-max">
          {[
            { value: "all", label: "All", count: statusCounts.all },
            { value: "PENDING", label: "Pending", count: statusCounts.PENDING, color: "text-yellow-600" },
            { value: "ASSIGNED", label: "Assigned", count: statusCounts.ASSIGNED, color: "text-blue-600" },
            { value: "IN_TRANSIT", label: "In Transit", count: statusCounts.IN_TRANSIT, color: "text-orange-600" },
            { value: "COMPLETED", label: "Done", count: statusCounts.COMPLETED, color: "text-green-600" },
          ].map(tab => (
            <Button
              key={tab.value}
              variant={statusFilter === tab.value ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(tab.value)}
              className="flex-shrink-0"
            >
              <span className={tab.color}>{tab.label}</span>
              <Badge variant="secondary" className="ml-1.5 h-5 min-w-[20px] px-1">
                {tab.count}
              </Badge>
            </Button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by pickup #, serial, customer..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Pickup List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : filteredPickups.length === 0 ? (
          <div className="text-center py-8">
            <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-2 text-muted-foreground">No pickups found</p>
            <Button variant="outline" className="mt-4" onClick={handleOpenCreate}>
              Schedule a pickup
            </Button>
          </div>
        ) : (
          filteredPickups.map(renderPickupCard)
        )}
      </div>

      {/* Create Pickup Sheet (Mobile-Friendly) */}
      <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <SheetContent side="bottom" className="h-[85vh] sm:h-auto sm:max-h-[85vh] flex flex-col p-0">
          <SheetHeader className="text-left px-6 pt-6 pb-4 flex-shrink-0">
            <SheetTitle>Schedule Pickup</SheetTitle>
            <SheetDescription>
              Create a pickup schedule. Collector will add shops & items during collection.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6">
            <div className="space-y-4 pb-4">
              {/* Route Selection */}
              <div className="space-y-2">
                <Label>Route / Area *</Label>
                {!showNewRoute ? (
                  <>
                    {routes.length > 0 ? (
                      <Select
                        value={createData.routeId?.toString() || ""}
                        onValueChange={(v) => setCreateData({ ...createData, routeId: parseInt(v), newRouteName: "" })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a route" />
                        </SelectTrigger>
                        <SelectContent>
                          {routes.map(route => (
                            <SelectItem key={route.id} value={route.id.toString()}>
                              <div className="flex flex-col">
                                <span>{route.name}</span>
                                {route.zone && (
                                  <span className="text-xs text-muted-foreground">{route.zone}</span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm text-muted-foreground">No routes found. Add a new route below.</p>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setShowNewRoute(true);
                        setCreateData({ ...createData, routeId: null });
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add New Route
                    </Button>
                  </>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">New Route</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => {
                            setShowNewRoute(false);
                            setCreateData({ ...createData, newRouteName: "", newRouteZone: "" });
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Route Name *</Label>
                        <Input
                          value={createData.newRouteName}
                          onChange={(e) => setCreateData({ ...createData, newRouteName: e.target.value })}
                          placeholder="e.g., North Zone, Route A..."
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Zone (Optional)</Label>
                        <Input
                          value={createData.newRouteZone}
                          onChange={(e) => setCreateData({ ...createData, newRouteZone: e.target.value })}
                          placeholder="e.g., City Center, Industrial Area..."
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}
                {selectedRoute && !showNewRoute && (
                  <p className="text-xs text-muted-foreground">
                    {selectedRoute.zone && `Zone: ${selectedRoute.zone}`}
                    {selectedRoute.areas && ` | Areas: ${selectedRoute.areas}`}
                  </p>
                )}
              </div>

              {/* Collector */}
              <div className="space-y-1">
                <Label>
                  Assign Collector
                  {isCurrentUserCollector && createData.collectorId && (
                    <span className="ml-2 text-green-600">(Auto-assigned to you)</span>
                  )}
                </Label>
                <Select
                  value={createData.collectorId}
                  onValueChange={(v) => setCreateData({ ...createData, collectorId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Assign later" />
                  </SelectTrigger>
                  <SelectContent>
                    {collectors.map(c => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.name} - {c.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Schedule */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={createData.scheduledDate}
                    onChange={(e) => setCreateData({ ...createData, scheduledDate: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Time Slot</Label>
                  <Select
                    value={createData.scheduledTimeSlot}
                    onValueChange={(v) => setCreateData({ ...createData, scheduledTimeSlot: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="09:00-12:00">09:00 - 12:00</SelectItem>
                      <SelectItem value="12:00-15:00">12:00 - 15:00</SelectItem>
                      <SelectItem value="15:00-18:00">15:00 - 18:00</SelectItem>
                      <SelectItem value="18:00-21:00">18:00 - 21:00</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Priority */}
              <div className="space-y-1">
                <Label>Priority</Label>
                <Select
                  value={createData.priority}
                  onValueChange={(v) => setCreateData({ ...createData, priority: v as typeof createData.priority })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <Label>Notes</Label>
                <Textarea
                  value={createData.notes}
                  onChange={(e) => setCreateData({ ...createData, notes: e.target.value })}
                  placeholder="Special instructions..."
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Fixed Footer with Action Buttons */}
          <div className="flex-shrink-0 border-t bg-background px-6 py-4">
            <Button
              className="w-full"
              onClick={handleCreate}
              disabled={creating || (!createData.routeId && !createData.newRouteName)}
            >
              {creating ? "Scheduling..." : "Schedule Pickup"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Complete Pickup Dialog */}
      <Dialog open={!!completePickup} onOpenChange={() => setCompletePickup(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Pickup</DialogTitle>
            <DialogDescription>
              Mark pickup {completePickup?.pickupNumber} as completed
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Received By *</Label>
              <Select
                value={receiverName}
                onValueChange={setReceiverName}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select who received the item" />
                </SelectTrigger>
                <SelectContent>
                  {/* Show claim creator first if available */}
                  {completePickup?.claim?.createdByUser && (
                    <SelectItem
                      key={`creator-${completePickup.claim.createdByUser.id}`}
                      value={`${completePickup.claim.createdByUser.firstName} ${completePickup.claim.createdByUser.lastName}`}
                    >
                      {completePickup.claim.createdByUser.firstName} {completePickup.claim.createdByUser.lastName}
                      <span className="ml-2 text-xs text-muted-foreground">(Claim Creator)</span>
                    </SelectItem>
                  )}
                  {/* Show all other users */}
                  {users
                    .filter(u => u.id !== completePickup?.claim?.createdBy)
                    .map(user => (
                      <SelectItem key={user.id} value={`${user.firstName} ${user.lastName}`}>
                        {user.firstName} {user.lastName}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="Any notes..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompletePickup(null)}>Cancel</Button>
            <Button onClick={handleComplete} disabled={completing || !receiverName}>
              {completing ? "Completing..." : "Complete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation */}
      <ConfirmDialog
        open={!!cancelId}
        onOpenChange={() => setCancelId(null)}
        title="Cancel Pickup"
        description="Are you sure you want to cancel this pickup?"
        confirmText="Cancel Pickup"
        onConfirm={handleCancel}
        isLoading={cancelling}
        variant="destructive"
      />
    </div>
  );
}
