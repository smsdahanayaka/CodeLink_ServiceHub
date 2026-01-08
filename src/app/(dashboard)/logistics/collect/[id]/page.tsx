"use client";

// ===========================================
// Collection Trip Detail Page - Collector View
// Mobile-friendly interface for managing a collection
// ===========================================

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Package,
  Plus,
  Trash2,
  Loader2,
  MapPin,
  Phone,
  CheckCircle,
  Send,
  AlertCircle,
  Barcode,
  Store,
  ChevronDown,
  ChevronRight,
  Calendar,
  Check,
  ChevronsUpDown,
  PlusCircle,
} from "lucide-react";

import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { usePermissions } from "@/lib/hooks";

interface Shop {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  contactPerson?: string | null;
}

interface LinkedPickup {
  id: number;
  pickupNumber: string;
  fromType: "SHOP" | "CUSTOMER";
  status: string;
  scheduledDate: string | null;
  scheduledTimeSlot: string | null;
  customerName: string | null;
  customerPhone: string | null;
  fromShop: Shop | null;
  route: { id: number; name: string; zone: string | null } | null;
  _count: { collectionItems: number };
}

interface CollectionTrip {
  id: number;
  tripNumber: string;
  fromType: "SHOP" | "CUSTOMER";
  status: "IN_PROGRESS" | "IN_TRANSIT" | "RECEIVED" | "CANCELLED";
  startedAt: string;
  completedAt: string | null;
  notes: string | null;
  shop: Shop | null;
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  collector: {
    id: number;
    name: string;
  };
  items: CollectionItem[];
  pickups: LinkedPickup[];
}

interface CollectionItem {
  id: number;
  shopId: number | null;
  pickupId: number | null;
  serialNumber: string;
  issueDescription: string;
  productId: number | null;
  warrantyCardId: number | null;
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  status: string;
  shop: Shop | null;
  pickup: { id: number; pickupNumber: string } | null;
  product: {
    id: number;
    name: string;
  } | null;
  warrantyCard: {
    id: number;
    cardNumber: string;
    customer: {
      name: string;
      phone: string;
    } | null;
  } | null;
}

interface Product {
  id: number;
  name: string;
  modelNumber: string | null;
}

// Group items by shop for display
interface ShopGroup {
  shop: Shop | null;
  shopId: number | null;
  items: CollectionItem[];
}

export default function CollectionTripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();

  const [trip, setTrip] = useState<CollectionTrip | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [expandedShops, setExpandedShops] = useState<Set<string>>(new Set(["unassigned"]));

  // Add item dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [selectedShopId, setSelectedShopId] = useState<number | null>(null);
  const [newItem, setNewItem] = useState({
    serialNumber: "",
    issueDescription: "",
    productId: null as number | null,
    customerName: "",
    customerPhone: "",
    customerAddress: "",
  });

  // Confirm dialogs
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);

  // Shop selection combobox state
  const [shopComboOpen, setShopComboOpen] = useState(false);
  const [shopSearchQuery, setShopSearchQuery] = useState("");

  // Quick shop creation state
  const [showCreateShop, setShowCreateShop] = useState(false);
  const [creatingShop, setCreatingShop] = useState(false);
  const [newShop, setNewShop] = useState({
    name: "",
    phone: "",
    address: "",
  });

  // Only check permissions after they're loaded
  const canManage = !permissionsLoading && (hasPermission("logistics.create_collection") || hasPermission("logistics.collect"));

  useEffect(() => {
    fetchTrip();
    fetchProducts();
    fetchShops();
  }, [id]);

  const fetchTrip = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/logistics/collection-trips/${id}`);
      const data = await res.json();

      if (data.success) {
        setTrip(data.data);
        // Expand all shops with items by default
        const shopsWithItems = new Set<string>(["unassigned"]);
        data.data.items.forEach((item: CollectionItem) => {
          if (item.shopId) shopsWithItems.add(item.shopId.toString());
        });
        setExpandedShops(shopsWithItems);
      } else {
        toast.error(data.error?.message || "Failed to load trip");
      }
    } catch (error) {
      console.error("Error fetching trip:", error);
      toast.error("Failed to load collection trip");
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products?limit=200");
      const data = await res.json();
      if (data.success) {
        setProducts(data.data);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchShops = async () => {
    try {
      const res = await fetch("/api/shops?limit=200&status=ACTIVE");
      const data = await res.json();
      if (data.success) {
        setShops(data.data);
      }
    } catch (error) {
      console.error("Error fetching shops:", error);
    }
  };

  // Group items by shop
  const groupItemsByShop = (): ShopGroup[] => {
    if (!trip) return [];

    const groups: Map<string, ShopGroup> = new Map();

    trip.items.forEach((item) => {
      const key = item.shopId?.toString() || "unassigned";
      if (!groups.has(key)) {
        groups.set(key, {
          shop: item.shop,
          shopId: item.shopId,
          items: [],
        });
      }
      groups.get(key)!.items.push(item);
    });

    // Sort: shops first (alphabetically), then unassigned
    return Array.from(groups.values()).sort((a, b) => {
      if (!a.shop && b.shop) return 1;
      if (a.shop && !b.shop) return -1;
      if (a.shop && b.shop) return a.shop.name.localeCompare(b.shop.name);
      return 0;
    });
  };

  const toggleShopExpand = (shopKey: string) => {
    setExpandedShops((prev) => {
      const next = new Set(prev);
      if (next.has(shopKey)) {
        next.delete(shopKey);
      } else {
        next.add(shopKey);
      }
      return next;
    });
  };

  const handleAddItem = async () => {
    if (!selectedShopId) {
      toast.error("Please select a shop");
      return;
    }

    if (!newItem.serialNumber.trim()) {
      toast.error("Please enter the device serial number");
      return;
    }

    if (!newItem.issueDescription.trim()) {
      toast.error("Please describe the issue");
      return;
    }

    try {
      setAddingItem(true);

      const res = await fetch(`/api/logistics/collection-trips/${id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId: selectedShopId,
          serialNumber: newItem.serialNumber,
          issueDescription: newItem.issueDescription,
          productId: newItem.productId,
          customerName: newItem.customerName || null,
          customerPhone: newItem.customerPhone || null,
          customerAddress: newItem.customerAddress || null,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setTrip((prev) =>
          prev ? { ...prev, items: [...prev.items, data.data] } : prev
        );
        // Expand the shop group
        if (selectedShopId) {
          setExpandedShops((prev) => new Set([...prev, selectedShopId.toString()]));
        }
        setShowAddDialog(false);
        setSelectedShopId(null);
        setNewItem({
          serialNumber: "",
          issueDescription: "",
          productId: null,
          customerName: "",
          customerPhone: "",
          customerAddress: "",
        });
        toast.success("Item has been added to the collection");
      } else {
        throw new Error(data.error?.message || "Failed to add item");
      }
    } catch (error) {
      console.error("Error adding item:", error);
      toast.error(error instanceof Error ? error.message : "Failed to add item");
    } finally {
      setAddingItem(false);
    }
  };

  // Open add dialog with pre-selected shop
  const openAddDialogForShop = (shopId: number | null) => {
    setSelectedShopId(shopId);
    setShowAddDialog(true);
  };

  const handleDeleteItem = async () => {
    if (!deleteItemId) return;

    try {
      setActionLoading(true);
      const res = await fetch(
        `/api/logistics/collection-trips/${id}/items?itemId=${deleteItemId}`,
        { method: "DELETE" }
      );

      const data = await res.json();

      if (data.success) {
        setTrip((prev) =>
          prev
            ? { ...prev, items: prev.items.filter((i) => i.id !== deleteItemId) }
            : prev
        );
        toast.success("Item has been removed from the collection");
      } else {
        throw new Error(data.error?.message || "Failed to remove item");
      }
    } catch (error) {
      console.error("Error removing item:", error);
      toast.error(error instanceof Error ? error.message : "Failed to remove item");
    } finally {
      setActionLoading(false);
      setDeleteItemId(null);
    }
  };

  // Quick shop creation
  const handleCreateShop = async () => {
    if (!newShop.name.trim()) {
      toast.error("Shop name is required");
      return;
    }

    try {
      setCreatingShop(true);
      const res = await fetch("/api/shops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newShop.name.trim(),
          phone: newShop.phone.trim() || null,
          address: newShop.address.trim() || null,
          status: "ACTIVE",
          isVerified: false, // Inline created shops need approval
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Add the new shop to the list and select it
        const createdShop: Shop = data.data;
        setShops((prev) => [...prev, createdShop]);
        setSelectedShopId(createdShop.id);
        setShowCreateShop(false);
        setNewShop({ name: "", phone: "", address: "" });
        toast.success(`Shop "${createdShop.name}" created and selected`);
      } else {
        throw new Error(data.error?.message || "Failed to create shop");
      }
    } catch (error) {
      console.error("Error creating shop:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create shop");
    } finally {
      setCreatingShop(false);
    }
  };

  // Get selected shop name for display
  const getSelectedShopName = () => {
    if (!selectedShopId) return "Select a shop...";
    const shop = shops.find((s) => s.id === selectedShopId);
    return shop?.name || "Select a shop...";
  };

  // Filter shops by search query
  const filteredShops = shops.filter((shop) =>
    shop.name.toLowerCase().includes(shopSearchQuery.toLowerCase()) ||
    shop.address?.toLowerCase().includes(shopSearchQuery.toLowerCase()) ||
    shop.phone?.includes(shopSearchQuery)
  );

  const handleTripAction = async (action: string) => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/logistics/collection-trips/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();

      if (data.success) {
        setTrip(data.data);
        toast.success(
          action === "complete"
            ? "Collection completed. Items are now in transit."
            : "Trip cancelled."
        );
        if (action === "cancel") {
          router.push("/logistics/my-trips");
        }
      } else {
        throw new Error(data.error?.message || `Failed to ${action} trip`);
      }
    } catch (error) {
      console.error(`Error ${action}ing trip:`, error);
      toast.error(error instanceof Error ? error.message : `Failed to ${action} trip`);
    } finally {
      setActionLoading(false);
      setShowCompleteDialog(false);
      setShowCancelDialog(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Collection trip not found</p>
        <Button className="mt-4" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  const isActive = trip.status === "IN_PROGRESS";

  return (
    <div className="space-y-6">
      <PageHeader
        title={trip.tripNumber}
        description={`Collection from ${trip.fromType === "SHOP" ? trip.shop?.name : trip.customerName}`}
        actions={
          <Button variant="outline" size="sm" onClick={() => router.push("/logistics/my-trips")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            My Trips
          </Button>
        }
      />

      {/* Status Banner */}
      <Card className={trip.status === "IN_TRANSIT" ? "bg-blue-50 border-blue-200 dark:bg-blue-950/30" : ""}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {trip.status === "IN_PROGRESS" ? (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              ) : trip.status === "IN_TRANSIT" ? (
                <Send className="h-5 w-5 text-blue-500" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              <div>
                <Badge
                  variant={
                    trip.status === "IN_PROGRESS"
                      ? "default"
                      : trip.status === "IN_TRANSIT"
                      ? "secondary"
                      : "success"
                  }
                >
                  {trip.status === "IN_PROGRESS"
                    ? "Collecting"
                    : trip.status === "IN_TRANSIT"
                    ? "In Transit to Service Center"
                    : trip.status}
                </Badge>
                <p className="text-sm text-muted-foreground mt-1">
                  {trip.items.length} items collected
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Location Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Collection Location</CardTitle>
        </CardHeader>
        <CardContent>
          {trip.fromType === "SHOP" && trip.shop ? (
            <div className="space-y-2">
              <p className="font-medium">{trip.shop.name}</p>
              {trip.shop.address && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {trip.shop.address}
                </p>
              )}
              {trip.shop.phone && (
                <a
                  href={`tel:${trip.shop.phone}`}
                  className="text-sm text-primary flex items-center gap-2"
                >
                  <Phone className="h-4 w-4" />
                  {trip.shop.phone}
                </a>
              )}
              {trip.shop.contactPerson && (
                <p className="text-sm text-muted-foreground">
                  Contact: {trip.shop.contactPerson}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="font-medium">{trip.customerName}</p>
              {trip.customerAddress && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {trip.customerAddress}
                </p>
              )}
              {trip.customerPhone && (
                <a
                  href={`tel:${trip.customerPhone}`}
                  className="text-sm text-primary flex items-center gap-2"
                >
                  <Phone className="h-4 w-4" />
                  {trip.customerPhone}
                </a>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Linked Pickups */}
      {trip.pickups && trip.pickups.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Scheduled Pickups ({trip.pickups.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {trip.pickups.map((pickup) => (
                <div
                  key={pickup.id}
                  className="p-3 border rounded-lg flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{pickup.pickupNumber}</span>
                      <Badge variant={pickup._count.collectionItems > 0 ? "default" : "secondary"}>
                        {pickup._count.collectionItems > 0 ? `${pickup._count.collectionItems} items` : "No items yet"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {pickup.fromShop?.name || pickup.customerName}
                      {pickup.route && ` • ${pickup.route.name}`}
                    </p>
                  </div>
                  {isActive && canManage && pickup._count.collectionItems === 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openAddDialogForShop(pickup.fromShop?.id || null)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Items List - Grouped by Shop */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Collected Items ({trip.items.length})
            </CardTitle>
            {isActive && canManage && (
              <Button size="sm" onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {trip.items.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">No items collected yet</p>
              {isActive && canManage && (
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Item
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {groupItemsByShop().map((group) => {
                const shopKey = group.shopId?.toString() || "unassigned";
                const isExpanded = expandedShops.has(shopKey);

                return (
                  <div key={shopKey} className="border rounded-lg overflow-hidden">
                    {/* Shop Header */}
                    <div
                      className="p-3 bg-muted/50 flex items-center justify-between cursor-pointer"
                      onClick={() => toggleShopExpand(shopKey)}
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <Store className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {group.shop?.name || "No Shop Assigned"}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {group.items.length} items
                        </Badge>
                      </div>
                      {isActive && canManage && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            openAddDialogForShop(group.shopId);
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {/* Shop Items */}
                    {isExpanded && (
                      <div className="p-3 space-y-3">
                        {group.shop && (
                          <div className="text-sm text-muted-foreground pb-2 border-b">
                            {group.shop.address && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3 w-3" />
                                <span>{group.shop.address}</span>
                              </div>
                            )}
                            {group.shop.phone && (
                              <a href={`tel:${group.shop.phone}`} className="flex items-center gap-2 text-primary">
                                <Phone className="h-3 w-3" />
                                <span>{group.shop.phone}</span>
                              </a>
                            )}
                          </div>
                        )}
                        {group.items.map((item) => (
                          <div
                            key={item.id}
                            className="p-3 border rounded-lg flex items-start justify-between"
                          >
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2">
                                <Barcode className="h-4 w-4 text-muted-foreground" />
                                <span className="font-mono font-medium">{item.serialNumber}</span>
                              </div>
                              {item.product && (
                                <p className="text-sm">{item.product.name}</p>
                              )}
                              {item.warrantyCard && (
                                <Badge variant="outline" className="text-xs">
                                  WC: {item.warrantyCard.cardNumber}
                                </Badge>
                              )}
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {item.issueDescription}
                              </p>
                              {(item.customerName || item.warrantyCard?.customer) && (
                                <p className="text-xs text-muted-foreground">
                                  Customer: {item.customerName || item.warrantyCard?.customer?.name}
                                </p>
                              )}
                            </div>
                            {isActive && canManage && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                onClick={() => setDeleteItemId(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {isActive && canManage && (
        <div className="flex flex-col gap-3">
          <Button
            className="w-full h-12 text-lg"
            onClick={() => setShowCompleteDialog(true)}
            disabled={trip.items.length === 0 || actionLoading}
          >
            {actionLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Send className="h-5 w-5 mr-2" />
                Complete Collection & Start Transit
              </>
            )}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowCancelDialog(true)}
            disabled={actionLoading}
          >
            Cancel Trip
          </Button>
        </div>
      )}

      {/* Add Item Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => {
        setShowAddDialog(open);
        if (!open) {
          setSelectedShopId(null);
          setShowCreateShop(false);
          setNewShop({ name: "", phone: "", address: "" });
          setShopSearchQuery("");
        }
      }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Item</DialogTitle>
            <DialogDescription>
              Add a device to this collection trip
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Shop Selection with Search and Create */}
            <div className="space-y-2">
              <Label>Shop *</Label>
              {showCreateShop ? (
                /* Inline Shop Creation Form */
                <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <PlusCircle className="h-4 w-4" />
                      Create New Shop
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowCreateShop(false);
                        setNewShop({ name: "", phone: "", address: "" });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Input
                      placeholder="Shop name *"
                      value={newShop.name}
                      onChange={(e) => setNewShop((prev) => ({ ...prev, name: e.target.value }))}
                      autoFocus
                    />
                    <Input
                      placeholder="Phone (optional)"
                      value={newShop.phone}
                      onChange={(e) => setNewShop((prev) => ({ ...prev, phone: e.target.value }))}
                    />
                    <Input
                      placeholder="Address (optional)"
                      value={newShop.address}
                      onChange={(e) => setNewShop((prev) => ({ ...prev, address: e.target.value }))}
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="w-full"
                    onClick={handleCreateShop}
                    disabled={creatingShop || !newShop.name.trim()}
                  >
                    {creatingShop ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Create & Select
                  </Button>
                </div>
              ) : (
                /* Searchable Shop Dropdown */
                <Popover open={shopComboOpen} onOpenChange={setShopComboOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={shopComboOpen}
                      className="w-full justify-between font-normal"
                    >
                      <span className="truncate">{getSelectedShopName()}</span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Search shops..."
                        value={shopSearchQuery}
                        onValueChange={setShopSearchQuery}
                      />
                      <CommandList>
                        {shops.length === 0 ? (
                          <CommandEmpty className="py-4 text-center">
                            <p className="text-sm text-muted-foreground mb-2">No shops found</p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setShopComboOpen(false);
                                setShowCreateShop(true);
                              }}
                            >
                              <PlusCircle className="h-4 w-4 mr-2" />
                              Create First Shop
                            </Button>
                          </CommandEmpty>
                        ) : (
                          <>
                            <CommandGroup heading="Shops">
                              {filteredShops.length === 0 ? (
                                <div className="py-3 px-2 text-center">
                                  <p className="text-sm text-muted-foreground mb-2">
                                    No match for "{shopSearchQuery}"
                                  </p>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setShopComboOpen(false);
                                      setShowCreateShop(true);
                                      setNewShop((prev) => ({ ...prev, name: shopSearchQuery }));
                                      setShopSearchQuery("");
                                    }}
                                  >
                                    <PlusCircle className="h-4 w-4 mr-2" />
                                    Create "{shopSearchQuery}"
                                  </Button>
                                </div>
                              ) : (
                                filteredShops.map((shop) => (
                                  <CommandItem
                                    key={shop.id}
                                    value={shop.id.toString()}
                                    onSelect={() => {
                                      setSelectedShopId(shop.id);
                                      setShopComboOpen(false);
                                      setShopSearchQuery("");
                                    }}
                                  >
                                    <Check
                                      className={`mr-2 h-4 w-4 ${
                                        selectedShopId === shop.id ? "opacity-100" : "opacity-0"
                                      }`}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium truncate">{shop.name}</div>
                                      {(shop.address || shop.phone) && (
                                        <div className="text-xs text-muted-foreground truncate">
                                          {shop.address || shop.phone}
                                        </div>
                                      )}
                                    </div>
                                  </CommandItem>
                                ))
                              )}
                            </CommandGroup>
                            {filteredShops.length > 0 && (
                              <>
                                <CommandSeparator />
                                <CommandGroup>
                                  <CommandItem
                                    onSelect={() => {
                                      setShopComboOpen(false);
                                      setShowCreateShop(true);
                                      setShopSearchQuery("");
                                    }}
                                    className="text-primary"
                                  >
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Create New Shop
                                  </CommandItem>
                                </CommandGroup>
                              </>
                            )}
                          </>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            </div>

            <div className="space-y-2">
              <Label>Serial Number *</Label>
              <Input
                value={newItem.serialNumber}
                onChange={(e) =>
                  setNewItem((prev) => ({ ...prev, serialNumber: e.target.value }))
                }
                placeholder="Scan or enter serial number"
              />
            </div>
            <div className="space-y-2">
              <Label>Product (Optional)</Label>
              <Select
                value={newItem.productId?.toString() || "none"}
                onValueChange={(v) =>
                  setNewItem((prev) => ({
                    ...prev,
                    productId: v === "none" ? null : parseInt(v),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unknown / Other</SelectItem>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id.toString()}>
                      {product.name}
                      {product.modelNumber && ` (${product.modelNumber})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Issue Description *</Label>
              <Textarea
                value={newItem.issueDescription}
                onChange={(e) =>
                  setNewItem((prev) => ({ ...prev, issueDescription: e.target.value }))
                }
                placeholder="Describe the issue..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Customer Name</Label>
              <Input
                value={newItem.customerName}
                onChange={(e) =>
                  setNewItem((prev) => ({ ...prev, customerName: e.target.value }))
                }
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label>Customer Phone</Label>
              <Input
                value={newItem.customerPhone}
                onChange={(e) =>
                  setNewItem((prev) => ({ ...prev, customerPhone: e.target.value }))
                }
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label>Customer Address</Label>
              <Textarea
                value={newItem.customerAddress}
                onChange={(e) =>
                  setNewItem((prev) => ({ ...prev, customerAddress: e.target.value }))
                }
                placeholder="Optional"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddItem} disabled={addingItem}>
              {addingItem ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Add Item"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Confirmation Dialog */}
      <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Collection?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the collection as complete and set the trip status to
              &quot;In Transit&quot;. You have {trip.items.length} items collected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Collecting</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleTripAction("complete")}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Complete & Start Transit"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Trip?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this collection trip? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Trip</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleTripAction("cancel")}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={actionLoading}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Cancel Trip"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Item Confirmation */}
      <AlertDialog
        open={deleteItemId !== null}
        onOpenChange={() => setDeleteItemId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Item?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this item from the collection?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteItem}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={actionLoading}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
