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
  Filter,
  ChevronRight,
  Truck,
  CreditCard,
  UserPlus,
  Building,
  ArrowLeft,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// Types
interface Pickup {
  id: number;
  pickupNumber: string;
  claimId: number;
  status: "PENDING" | "ASSIGNED" | "IN_TRANSIT" | "COMPLETED" | "CANCELLED";
  fromType: "SHOP" | "CUSTOMER";
  fromAddress: string | null;
  toLocation: string;
  scheduledDate: string | null;
  scheduledTimeSlot: string | null;
  notes: string | null;
  customerName: string | null;
  customerPhone: string | null;
  createdAt: string;
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
  const [warrantyCards, setWarrantyCards] = useState<WarrantyCard[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]); // Users for receiver selection
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  // Create dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState<"select" | "details">("select");
  const [createData, setCreateData] = useState({
    warrantyCardId: null as number | null,
    shopId: null as number | null,
    collectorId: "",
    fromType: "SHOP" as "SHOP" | "CUSTOMER",
    fromAddress: "",
    toLocation: "Service Center",
    scheduledDate: "",
    scheduledTimeSlot: "",
    notes: "",
    issueDescription: "",
    priority: "MEDIUM" as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
    customerName: "",
    customerPhone: "",
    customerAddress: "",
  });
  const [creating, setCreating] = useState(false);

  // Inline creation states
  const [showCreateShop, setShowCreateShop] = useState(false);
  const [showCreateWarranty, setShowCreateWarranty] = useState(false);
  const [newShop, setNewShop] = useState({ name: "", phone: "", address: "", city: "" });
  const [newWarranty, setNewWarranty] = useState({
    serialNumber: "",
    productId: "",
    shopId: "",
    customerName: "",
    customerPhone: "",
    purchaseDate: format(new Date(), "yyyy-MM-dd"),
    // New shop option (creates unverified shop)
    createNewShop: false,
    newShopName: "",
    newShopPhone: "",
    newShopAddress: "",
    newShopCity: "",
  });
  const [creatingShop, setCreatingShop] = useState(false);
  const [creatingWarranty, setCreatingWarranty] = useState(false);

  // Complete/Cancel states
  const [completePickup, setCompletePickup] = useState<Pickup | null>(null);
  const [receiverName, setReceiverName] = useState("");
  const [completionNotes, setCompletionNotes] = useState("");
  const [completing, setCompleting] = useState(false);
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Selected warranty card for display
  const selectedWarrantyCard = warrantyCards.find(wc => wc.id === createData.warrantyCardId);
  const selectedShop = shops.find(s => s.id === createData.shopId);

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
      const [collectorsRes, warrantyRes, shopsRes, productsRes, meRes, usersRes] = await Promise.all([
        fetch("/api/logistics/collectors?status=ACTIVE&limit=100"),
        fetch("/api/warranty-cards?status=ACTIVE&limit=100"),
        fetch("/api/shops?status=ACTIVE&limit=100"),
        fetch("/api/products?limit=100"),
        fetch("/api/auth/me"),
        fetch("/api/users?status=ACTIVE&limit=100"),
      ]);

      const [collectorsData, warrantyData, shopsData, productsData, meData, usersData] = await Promise.all([
        collectorsRes.json(),
        warrantyRes.json(),
        shopsRes.json(),
        productsRes.json(),
        meRes.json(),
        usersRes.json(),
      ]);

      if (collectorsData.success) setCollectors(collectorsData.data);
      if (warrantyData.success) setWarrantyCards(warrantyData.data);
      if (shopsData.success) setShops(shopsData.data);
      if (productsData.success) setProducts(productsData.data);
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
      warrantyCardId: null,
      shopId: null,
      collectorId: autoCollectorId, // Auto-assign if user is a collector
      fromType: "SHOP",
      fromAddress: "",
      toLocation: "Service Center",
      scheduledDate: "",
      scheduledTimeSlot: "",
      notes: "",
      issueDescription: "",
      priority: "MEDIUM",
      customerName: "",
      customerPhone: "",
      customerAddress: "",
    });
    setCreateStep("select");
    setIsCreateOpen(true);
  };

  // Check if current user is a collector
  const isCurrentUserCollector = !!currentUser?.collectorId;

  // Handle warranty card selection
  const handleSelectWarrantyCard = (wcId: number) => {
    const wc = warrantyCards.find(w => w.id === wcId);
    if (wc) {
      setCreateData({
        ...createData,
        warrantyCardId: wcId,
        shopId: wc.shop?.id || null,
        customerName: wc.customer?.name || "",
        customerPhone: wc.customer?.phone || "",
        customerAddress: wc.customer?.address || "",
      });
    }
  };

  // Create shop inline (creates unverified shop that needs admin approval)
  const handleCreateShop = async () => {
    if (!newShop.name || !newShop.phone) {
      toast.error("Shop name and phone are required");
      return;
    }

    setCreatingShop(true);
    try {
      const res = await fetch("/api/shops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newShop.name,
          phone: newShop.phone,
          address: newShop.address || undefined,
          city: newShop.city || undefined,
          status: "ACTIVE",
          isVerified: false, // Unverified - needs admin approval
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Shop created (pending verification)");
        setShops([...shops, { ...data.data, isVerified: false }]);
        setCreateData({ ...createData, shopId: data.data.id });
        setShowCreateShop(false);
        setNewShop({ name: "", phone: "", address: "", city: "" });
      } else {
        toast.error(data.error?.message || "Failed to create shop");
      }
    } catch (error) {
      toast.error("Failed to create shop");
    } finally {
      setCreatingShop(false);
    }
  };

  // Create warranty card inline
  const handleCreateWarranty = async () => {
    // Validate: must have serial, product, and either existing shop OR new shop details
    if (!newWarranty.serialNumber || !newWarranty.productId) {
      toast.error("Serial number and product are required");
      return;
    }

    if (!newWarranty.createNewShop && !newWarranty.shopId) {
      toast.error("Please select a shop or add new shop details");
      return;
    }

    if (newWarranty.createNewShop && (!newWarranty.newShopName || !newWarranty.newShopPhone)) {
      toast.error("Shop name and phone are required");
      return;
    }

    setCreatingWarranty(true);
    try {
      // Build request body
      const requestBody: Record<string, unknown> = {
        serialNumber: newWarranty.serialNumber,
        productId: parseInt(newWarranty.productId),
        purchaseDate: newWarranty.purchaseDate,
      };

      // Add customer info if provided (inline customer creation)
      if (newWarranty.customerName && newWarranty.customerPhone) {
        requestBody.newCustomer = {
          name: newWarranty.customerName,
          phone: newWarranty.customerPhone,
        };
      }

      // Either use existing shop or create new unverified shop
      if (newWarranty.createNewShop) {
        // Create new unverified shop via API (shop will be created with isVerified=false)
        requestBody.newShop = {
          name: newWarranty.newShopName,
          phone: newWarranty.newShopPhone,
          address: newWarranty.newShopAddress || undefined,
          city: newWarranty.newShopCity || undefined,
        };
      } else {
        requestBody.shopId = parseInt(newWarranty.shopId);
      }

      const res = await fetch("/api/warranty-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Warranty card created" + (newWarranty.createNewShop ? ". Shop pending admin verification." : ""));
        // Refresh warranty cards and select the new one
        await fetchRelatedData();
        setCreateData({
          ...createData,
          warrantyCardId: data.data.id,
          shopId: data.data.shop?.id || null,
          customerName: newWarranty.customerName,
          customerPhone: newWarranty.customerPhone,
        });
        setShowCreateWarranty(false);
        setNewWarranty({
          serialNumber: "",
          productId: "",
          shopId: "",
          customerName: "",
          customerPhone: "",
          purchaseDate: format(new Date(), "yyyy-MM-dd"),
          createNewShop: false,
          newShopName: "",
          newShopPhone: "",
          newShopAddress: "",
          newShopCity: "",
        });
      } else {
        toast.error(data.error?.message || "Failed to create warranty card");
      }
    } catch (error) {
      toast.error("Failed to create warranty card");
    } finally {
      setCreatingWarranty(false);
    }
  };

  // Create pickup
  const handleCreate = async () => {
    if (!createData.warrantyCardId) {
      toast.error("Please select a warranty card");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/logistics/pickups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warrantyCardId: createData.warrantyCardId,
          collectorId: createData.collectorId ? parseInt(createData.collectorId) : null,
          fromType: createData.fromType,
          fromShopId: createData.shopId,
          fromAddress: createData.fromAddress || undefined,
          toLocation: createData.toLocation,
          scheduledDate: createData.scheduledDate || undefined,
          scheduledTimeSlot: createData.scheduledTimeSlot || undefined,
          notes: createData.notes || undefined,
          issueDescription: createData.issueDescription || undefined,
          priority: createData.priority,
          customerName: createData.customerName || undefined,
          customerPhone: createData.customerPhone || undefined,
          customerAddress: createData.customerAddress || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Pickup scheduled successfully");
        setIsCreateOpen(false);
        fetchPickups();
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
              <DropdownMenuContent align="end">
                {["PENDING", "ASSIGNED"].includes(pickup.status) && pickup.collector && (
                  <DropdownMenuItem onClick={() => handleStartTransit(pickup)}>
                    <Play className="mr-2 h-4 w-4" />
                    Start Transit
                  </DropdownMenuItem>
                )}
                {pickup.status === "IN_TRANSIT" && (
                  <DropdownMenuItem onClick={() => handleOpenComplete(pickup)}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Complete
                  </DropdownMenuItem>
                )}
                {!["COMPLETED", "CANCELLED"].includes(pickup.status) && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setCancelId(pickup.id)} className="text-destructive">
                      <XCircle className="mr-2 h-4 w-4" />
                      Cancel
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Product Info */}
          {wc && (
            <div className="flex items-center gap-2 mb-3 p-2 bg-muted/50 rounded-lg">
              <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">{wc.product.name}</div>
                <div className="text-xs text-muted-foreground">S/N: {wc.serialNumber}</div>
              </div>
            </div>
          )}

          {/* From/To Info */}
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
                    ? pickup.fromShop?.name || "Shop"
                    : pickup.customerName || wc?.customer?.name || "Customer"}
                </div>
                {(pickup.customerPhone || wc?.customer?.phone || pickup.fromShop?.phone) && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    {pickup.customerPhone || wc?.customer?.phone || pickup.fromShop?.phone}
                  </div>
                )}
              </div>
            </div>
          </div>

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
            <SheetTitle className="flex items-center gap-2">
              {createStep === "details" && (
                <Button variant="ghost" size="icon" onClick={() => setCreateStep("select")} className="h-8 w-8 -ml-2">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              Schedule Pickup
            </SheetTitle>
            <SheetDescription>
              {createStep === "select"
                ? "Select a warranty card or create a new one"
                : "Enter pickup details"}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6">
            {createStep === "select" ? (
              <div className="space-y-4 pb-4">
                {/* Selected Warranty Card */}
                {selectedWarrantyCard && (
                  <Card className="border-primary">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <CreditCard className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">{selectedWarrantyCard.product.name}</div>
                            <div className="text-sm text-muted-foreground">
                              S/N: {selectedWarrantyCard.serialNumber}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCreateData({ ...createData, warrantyCardId: null })}
                        >
                          Change
                        </Button>
                      </div>
                      {selectedWarrantyCard.shop && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                          <Store className="h-4 w-4" />
                          {selectedWarrantyCard.shop.name}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {!selectedWarrantyCard && (
                  <>
                    {/* Search Warranty Cards */}
                    <div className="space-y-2">
                      <Label>Select Warranty Card</Label>
                      <Select onValueChange={(v) => handleSelectWarrantyCard(parseInt(v))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Search by serial number..." />
                        </SelectTrigger>
                        <SelectContent>
                          {warrantyCards.map(wc => (
                            <SelectItem key={wc.id} value={wc.id.toString()}>
                              <div className="flex flex-col">
                                <span>{wc.product.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  S/N: {wc.serialNumber}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <Separator />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">or</span>
                      </div>
                    </div>

                    {/* Create New Warranty Card */}
                    <Button
                      variant="outline"
                      className="w-full justify-start h-auto py-3"
                      onClick={() => setShowCreateWarranty(true)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                          <Plus className="h-5 w-5" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium">Create New Warranty Card</div>
                          <div className="text-sm text-muted-foreground">Register a new product</div>
                        </div>
                      </div>
                    </Button>
                  </>
                )}

                {/* Shop Selection */}
                {selectedWarrantyCard && (
                  <div className="space-y-2">
                    <Label>Pickup From</Label>
                    <Tabs
                      value={createData.fromType}
                      onValueChange={(v) => setCreateData({ ...createData, fromType: v as "SHOP" | "CUSTOMER" })}
                    >
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="SHOP">
                          <Store className="mr-2 h-4 w-4" />
                          Shop
                        </TabsTrigger>
                        <TabsTrigger value="CUSTOMER">
                          <User className="mr-2 h-4 w-4" />
                          Customer
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>

                    {createData.fromType === "SHOP" && (
                      <div className="space-y-2 mt-3">
                        <Select
                          value={createData.shopId?.toString() || ""}
                          onValueChange={(v) => setCreateData({ ...createData, shopId: parseInt(v) })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select shop" />
                          </SelectTrigger>
                          <SelectContent>
                            {shops.map(shop => (
                              <SelectItem key={shop.id} value={shop.id.toString()}>
                                {shop.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full"
                          onClick={() => setShowCreateShop(true)}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add New Shop
                        </Button>
                      </div>
                    )}

                    {createData.fromType === "CUSTOMER" && (
                      <div className="space-y-3 mt-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Name</Label>
                            <Input
                              value={createData.customerName}
                              onChange={(e) => setCreateData({ ...createData, customerName: e.target.value })}
                              placeholder="Customer name"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Phone</Label>
                            <Input
                              value={createData.customerPhone}
                              onChange={(e) => setCreateData({ ...createData, customerPhone: e.target.value })}
                              placeholder="Phone"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Address</Label>
                          <Textarea
                            value={createData.customerAddress}
                            onChange={(e) => setCreateData({ ...createData, customerAddress: e.target.value })}
                            placeholder="Pickup address"
                            rows={2}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>
            ) : (
              <div className="space-y-4 pb-4">
                {/* Summary */}
                {selectedWarrantyCard && (
                  <Card className="bg-muted/50">
                    <CardContent className="p-3">
                      <div className="text-sm font-medium">{selectedWarrantyCard.product.name}</div>
                      <div className="text-xs text-muted-foreground">S/N: {selectedWarrantyCard.serialNumber}</div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        {createData.fromType === "SHOP" ? <Store className="h-3 w-3" /> : <User className="h-3 w-3" />}
                        {createData.fromType === "SHOP"
                          ? selectedShop?.name
                          : createData.customerName || selectedWarrantyCard.customer?.name}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Collector */}
                <div className="space-y-1">
                  <Label className="text-xs">
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
                    <Label className="text-xs">Date</Label>
                    <Input
                      type="date"
                      value={createData.scheduledDate}
                      onChange={(e) => setCreateData({ ...createData, scheduledDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Time Slot</Label>
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

                {/* Issue Description */}
                <div className="space-y-1">
                  <Label className="text-xs">Issue Description</Label>
                  <Textarea
                    value={createData.issueDescription}
                    onChange={(e) => setCreateData({ ...createData, issueDescription: e.target.value })}
                    placeholder="Describe the issue..."
                    rows={2}
                  />
                </div>

                {/* Priority */}
                <div className="space-y-1">
                  <Label className="text-xs">Priority</Label>
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
                  <Label className="text-xs">Notes</Label>
                  <Textarea
                    value={createData.notes}
                    onChange={(e) => setCreateData({ ...createData, notes: e.target.value })}
                    placeholder="Special instructions..."
                    rows={2}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Fixed Footer with Action Buttons */}
          <div className="flex-shrink-0 border-t bg-background px-6 py-4">
            {createStep === "select" ? (
              <Button
                className="w-full"
                onClick={() => setCreateStep("details")}
                disabled={!selectedWarrantyCard || (createData.fromType === "SHOP" && !createData.shopId)}
              >
                Continue
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button className="w-full" onClick={handleCreate} disabled={creating}>
                {creating ? "Scheduling..." : "Schedule Pickup"}
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Create Shop Dialog */}
      <Dialog open={showCreateShop} onOpenChange={setShowCreateShop}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Shop</DialogTitle>
            <DialogDescription>Create a new shop for pickup</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
              New shops require admin verification before claims can be created.
            </div>
            <div className="space-y-1">
              <Label>Shop Name *</Label>
              <Input
                value={newShop.name}
                onChange={(e) => setNewShop({ ...newShop, name: e.target.value })}
                placeholder="Shop name"
              />
            </div>
            <div className="space-y-1">
              <Label>Phone *</Label>
              <Input
                value={newShop.phone}
                onChange={(e) => setNewShop({ ...newShop, phone: e.target.value })}
                placeholder="Phone number"
              />
            </div>
            <div className="space-y-1">
              <Label>Address</Label>
              <Textarea
                value={newShop.address}
                onChange={(e) => setNewShop({ ...newShop, address: e.target.value })}
                placeholder="Address"
                rows={2}
              />
            </div>
            <div className="space-y-1">
              <Label>City</Label>
              <Input
                value={newShop.city}
                onChange={(e) => setNewShop({ ...newShop, city: e.target.value })}
                placeholder="City"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateShop(false)}>Cancel</Button>
            <Button onClick={handleCreateShop} disabled={creatingShop}>
              {creatingShop ? "Creating..." : "Create Shop"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Warranty Card Dialog */}
      <Dialog open={showCreateWarranty} onOpenChange={setShowCreateWarranty}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Warranty Card</DialogTitle>
            <DialogDescription>Register a new product warranty</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Serial Number *</Label>
              <Input
                value={newWarranty.serialNumber}
                onChange={(e) => setNewWarranty({ ...newWarranty, serialNumber: e.target.value })}
                placeholder="Product serial number"
              />
            </div>
            <div className="space-y-1">
              <Label>Product *</Label>
              <Select
                value={newWarranty.productId}
                onValueChange={(v) => setNewWarranty({ ...newWarranty, productId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Shop Section - Select existing or add new */}
            <div className="space-y-2">
              <Label>Shop *</Label>
              {!newWarranty.createNewShop ? (
                <>
                  <Select
                    value={newWarranty.shopId}
                    onValueChange={(v) => setNewWarranty({ ...newWarranty, shopId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select shop" />
                    </SelectTrigger>
                    <SelectContent>
                      {shops.filter(s => s.isVerified !== false).map(s => (
                        <SelectItem key={s.id} value={s.id.toString()}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full text-muted-foreground"
                    onClick={() => setNewWarranty({ ...newWarranty, createNewShop: true, shopId: "" })}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Shop not listed? Add new shop
                  </Button>
                </>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">New Shop Details</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => setNewWarranty({
                          ...newWarranty,
                          createNewShop: false,
                          newShopName: "",
                          newShopPhone: "",
                          newShopAddress: "",
                          newShopCity: "",
                        })}
                      >
                        Cancel
                      </Button>
                    </div>
                    <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                      New shops require admin verification before claims can be created.
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Shop Name *</Label>
                        <Input
                          value={newWarranty.newShopName}
                          onChange={(e) => setNewWarranty({ ...newWarranty, newShopName: e.target.value })}
                          placeholder="Shop name"
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Phone *</Label>
                        <Input
                          value={newWarranty.newShopPhone}
                          onChange={(e) => setNewWarranty({ ...newWarranty, newShopPhone: e.target.value })}
                          placeholder="Phone"
                          className="h-8"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Address</Label>
                      <Input
                        value={newWarranty.newShopAddress}
                        onChange={(e) => setNewWarranty({ ...newWarranty, newShopAddress: e.target.value })}
                        placeholder="Address"
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">City</Label>
                      <Input
                        value={newWarranty.newShopCity}
                        onChange={(e) => setNewWarranty({ ...newWarranty, newShopCity: e.target.value })}
                        placeholder="City"
                        className="h-8"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-1">
              <Label>Purchase Date</Label>
              <Input
                type="date"
                value={newWarranty.purchaseDate}
                onChange={(e) => setNewWarranty({ ...newWarranty, purchaseDate: e.target.value })}
              />
            </div>
            <Separator />
            <div className="text-sm font-medium">Customer (Optional)</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Name</Label>
                <Input
                  value={newWarranty.customerName}
                  onChange={(e) => setNewWarranty({ ...newWarranty, customerName: e.target.value })}
                  placeholder="Name"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Phone</Label>
                <Input
                  value={newWarranty.customerPhone}
                  onChange={(e) => setNewWarranty({ ...newWarranty, customerPhone: e.target.value })}
                  placeholder="Phone"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateWarranty(false)}>Cancel</Button>
            <Button onClick={handleCreateWarranty} disabled={creatingWarranty}>
              {creatingWarranty ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
