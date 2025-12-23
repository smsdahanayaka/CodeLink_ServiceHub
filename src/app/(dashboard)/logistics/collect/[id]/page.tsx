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
  QrCode,
  Barcode,
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

interface CollectionTrip {
  id: number;
  tripNumber: string;
  fromType: "SHOP" | "CUSTOMER";
  status: "IN_PROGRESS" | "IN_TRANSIT" | "RECEIVED" | "CANCELLED";
  startedAt: string;
  completedAt: string | null;
  notes: string | null;
  shop: {
    id: number;
    name: string;
    address: string | null;
    phone: string | null;
    contactPerson: string | null;
  } | null;
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  collector: {
    id: number;
    name: string;
  };
  items: CollectionItem[];
}

interface CollectionItem {
  id: number;
  serialNumber: string;
  issueDescription: string;
  productId: number | null;
  warrantyCardId: number | null;
  customerName: string | null;
  customerPhone: string | null;
  status: string;
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

export default function CollectionTripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { hasPermission } = usePermissions();

  const [trip, setTrip] = useState<CollectionTrip | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);

  // Add item dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [newItem, setNewItem] = useState({
    serialNumber: "",
    issueDescription: "",
    productId: null as number | null,
    customerName: "",
    customerPhone: "",
  });

  // Confirm dialogs
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);

  const canManage = hasPermission("logistics.create_collection") || hasPermission("logistics.collect");

  useEffect(() => {
    fetchTrip();
    fetchProducts();
  }, [id]);

  const fetchTrip = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/logistics/collection-trips/${id}`);
      const data = await res.json();

      if (data.success) {
        setTrip(data.data);
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

  const handleAddItem = async () => {
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
          serialNumber: newItem.serialNumber,
          issueDescription: newItem.issueDescription,
          productId: newItem.productId,
          customerName: newItem.customerName || null,
          customerPhone: newItem.customerPhone || null,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setTrip((prev) =>
          prev ? { ...prev, items: [...prev.items, data.data] } : prev
        );
        setShowAddDialog(false);
        setNewItem({
          serialNumber: "",
          issueDescription: "",
          productId: null,
          customerName: "",
          customerPhone: "",
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

      {/* Items List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Items ({trip.items.length})
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
            <div className="space-y-3">
              {trip.items.map((item) => (
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
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Item</DialogTitle>
            <DialogDescription>
              Add a device to this collection trip
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
            <div className="grid grid-cols-2 gap-4">
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
