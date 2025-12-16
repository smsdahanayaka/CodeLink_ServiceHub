"use client";

// ===========================================
// Delivery Trip Execution Page - Collector View
// Mobile-friendly interface for executing deliveries
// ===========================================

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Package,
  Loader2,
  MapPin,
  Phone,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Truck,
  Play,
  RotateCcw,
  User,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
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
  recipientName: string | null;
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
  } | null;
  items: DeliveryItem[];
}

interface DeliveryItem {
  id: number;
  status: "PENDING" | "DELIVERED" | "FAILED";
  deliveredAt: string | null;
  failureReason: string | null;
  notes: string | null;
  claim: {
    id: number;
    claimNumber: string;
    currentStatus: string;
    resolution: string | null;
    warrantyCard: {
      id: number;
      cardNumber: string;
      serialNumber: string;
      product: {
        id: number;
        name: string;
        modelNumber: string | null;
      };
      customer: {
        id: number;
        name: string;
        phone: string;
      } | null;
    };
  };
}

const itemStatusConfig = {
  PENDING: { label: "Pending", variant: "secondary" as const, icon: Package },
  DELIVERED: { label: "Delivered", variant: "success" as const, icon: CheckCircle },
  FAILED: { label: "Failed", variant: "destructive" as const, icon: XCircle },
};

export default function DeliveryExecutionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { hasPermission } = usePermissions();

  const [trip, setTrip] = useState<DeliveryTrip | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Dialog states
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DeliveryItem | null>(null);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [itemAction, setItemAction] = useState<"deliver" | "fail">("deliver");
  const [failureReason, setFailureReason] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [completionNotes, setCompletionNotes] = useState("");

  const canManage = hasPermission("logistics.create_delivery");

  useEffect(() => {
    fetchTrip();
  }, [id]);

  const fetchTrip = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/logistics/delivery-trips/${id}`);
      const data = await res.json();

      if (data.success) {
        setTrip(data.data);
      } else {
        toast.error(data.error?.message || "Failed to load trip");
      }
    } catch (error) {
      console.error("Error fetching trip:", error);
      toast.error("Failed to load delivery trip");
    } finally {
      setLoading(false);
    }
  };

  const handleStartDelivery = async () => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/logistics/delivery-trips/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dispatch" }),
      });

      const data = await res.json();

      if (data.success) {
        setTrip(data.data);
        setShowStartDialog(false);
        toast.success("You can now deliver items");
      } else {
        throw new Error(data.error?.message || "Failed to start delivery");
      }
    } catch (error) {
      console.error("Error starting delivery:", error);
      toast.error(error instanceof Error ? error.message : "Failed to start delivery");
    } finally {
      setActionLoading(false);
    }
  };

  const handleItemAction = async () => {
    if (!selectedItem) return;

    if (itemAction === "fail" && !failureReason.trim()) {
      toast.error("Please explain why the delivery failed");
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch(
        `/api/logistics/delivery-trips/${id}/items/${selectedItem.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: itemAction === "deliver" ? "DELIVERED" : "FAILED",
            failureReason: itemAction === "fail" ? failureReason : null,
          }),
        }
      );

      const data = await res.json();

      if (data.success) {
        // Refetch trip to get updated data
        await fetchTrip();
        setShowItemDialog(false);
        setSelectedItem(null);
        setFailureReason("");
        toast.success(
          itemAction === "deliver"
            ? "Item has been marked as delivered"
            : "Item will need retry or reassignment"
        );
      } else {
        throw new Error(data.error?.message || "Failed to update item");
      }
    } catch (error) {
      console.error("Error updating item:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update item");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetryItem = async (item: DeliveryItem) => {
    try {
      setActionLoading(true);
      const res = await fetch(
        `/api/logistics/delivery-trips/${id}/items/${item.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "PENDING" }),
        }
      );

      const data = await res.json();

      if (data.success) {
        await fetchTrip();
        toast.success("Item has been reset for retry");
      } else {
        throw new Error(data.error?.message || "Failed to reset item");
      }
    } catch (error) {
      console.error("Error resetting item:", error);
      toast.error(error instanceof Error ? error.message : "Failed to reset item");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteTrip = async () => {
    if (!recipientName.trim()) {
      toast.error("Please enter the name of the person who received the items");
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch(`/api/logistics/delivery-trips/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete",
          recipientName,
          notes: completionNotes || null,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setTrip(data.data);
        setShowCompleteDialog(false);
        toast.success("All items have been delivered successfully");
        router.push("/logistics/my-trips");
      } else {
        throw new Error(data.error?.message || "Failed to complete delivery");
      }
    } catch (error) {
      console.error("Error completing delivery:", error);
      toast.error(error instanceof Error ? error.message : "Failed to complete delivery");
    } finally {
      setActionLoading(false);
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
        <p className="text-muted-foreground">Delivery trip not found</p>
        <Button className="mt-4" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  const pendingItems = trip.items.filter((i) => i.status === "PENDING");
  const deliveredItems = trip.items.filter((i) => i.status === "DELIVERED");
  const failedItems = trip.items.filter((i) => i.status === "FAILED");
  const isInTransit = trip.status === "IN_TRANSIT";
  const isAssigned = trip.status === "ASSIGNED";

  return (
    <div className="space-y-6">
      <PageHeader
        title={trip.tripNumber}
        description={`Delivery to ${trip.toType === "SHOP" ? trip.shop?.name : trip.customerName}`}
        actions={
          <Button variant="outline" size="sm" onClick={() => router.push("/logistics/my-trips")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            My Trips
          </Button>
        }
      />

      {/* Status Banner */}
      <Card
        className={
          isAssigned
            ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30"
            : isInTransit
            ? "bg-blue-50 border-blue-200 dark:bg-blue-950/30"
            : ""
        }
      >
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isAssigned ? (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              ) : isInTransit ? (
                <Truck className="h-5 w-5 text-blue-500" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              <div>
                <Badge
                  variant={
                    isAssigned
                      ? "secondary"
                      : isInTransit
                      ? "default"
                      : "success"
                  }
                >
                  {isAssigned
                    ? "Ready to Start"
                    : isInTransit
                    ? "Delivering"
                    : trip.status}
                </Badge>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    {pendingItems.length} pending
                  </span>
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="h-3 w-3" />
                    {deliveredItems.length} delivered
                  </span>
                  {failedItems.length > 0 && (
                    <span className="flex items-center gap-1 text-destructive">
                      <XCircle className="h-3 w-3" />
                      {failedItems.length} failed
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Start Delivery Button */}
      {isAssigned && canManage && (
        <Button
          className="w-full h-14 text-lg"
          onClick={() => setShowStartDialog(true)}
          disabled={actionLoading}
        >
          <Play className="h-6 w-6 mr-2" />
          Start Delivery
        </Button>
      )}

      {/* Destination Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Delivery Destination</CardTitle>
        </CardHeader>
        <CardContent>
          {trip.toType === "SHOP" && trip.shop ? (
            <div className="space-y-2">
              <p className="font-medium">{trip.shop.name}</p>
              {trip.shop.address && (
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(trip.shop.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary flex items-center gap-2"
                >
                  <MapPin className="h-4 w-4" />
                  {trip.shop.address}
                </a>
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
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {trip.shop.contactPerson}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="font-medium">{trip.customerName}</p>
              {trip.customerAddress && (
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(trip.customerAddress)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary flex items-center gap-2"
                >
                  <MapPin className="h-4 w-4" />
                  {trip.customerAddress}
                </a>
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
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Delivery Items ({trip.items.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {trip.items.map((item) => {
              const config = itemStatusConfig[item.status];
              const StatusIcon = config.icon;

              return (
                <div
                  key={item.id}
                  className={`p-4 border rounded-lg ${
                    item.status === "DELIVERED"
                      ? "bg-green-50 border-green-200 dark:bg-green-950/20"
                      : item.status === "FAILED"
                      ? "bg-red-50 border-red-200 dark:bg-red-950/20"
                      : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={config.variant} className="flex items-center gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {item.claim.claimNumber}
                        </span>
                      </div>
                      <p className="font-medium">{item.claim.warrantyCard.product.name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Barcode className="h-4 w-4" />
                        <span className="font-mono">{item.claim.warrantyCard.serialNumber}</span>
                      </div>
                      {item.claim.resolution && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          Resolution: {item.claim.resolution}
                        </p>
                      )}
                      {item.failureReason && (
                        <p className="text-sm text-destructive">
                          Failed: {item.failureReason}
                        </p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    {isInTransit && canManage && (
                      <div className="flex flex-col gap-2 ml-4">
                        {item.status === "PENDING" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedItem(item);
                                setItemAction("deliver");
                                setShowItemDialog(true);
                              }}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedItem(item);
                                setItemAction("fail");
                                setShowItemDialog(true);
                              }}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {item.status === "FAILED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRetryItem(item)}
                            disabled={actionLoading}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Complete Trip Button */}
      {isInTransit && canManage && pendingItems.length === 0 && deliveredItems.length > 0 && (
        <Button
          className="w-full h-14 text-lg"
          onClick={() => setShowCompleteDialog(true)}
          disabled={actionLoading}
        >
          <CheckCircle className="h-6 w-6 mr-2" />
          Complete Delivery
        </Button>
      )}

      {/* All Delivered Quick Complete */}
      {isInTransit && canManage && pendingItems.length > 0 && (
        <Button
          className="w-full h-12"
          variant="outline"
          onClick={() => setShowCompleteDialog(true)}
          disabled={actionLoading}
        >
          Mark All as Delivered & Complete
        </Button>
      )}

      {/* Start Delivery Dialog */}
      <AlertDialog open={showStartDialog} onOpenChange={setShowStartDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start Delivery?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to start the delivery for this trip. Make sure you
              have all {trip.items.length} items with you.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleStartDelivery} disabled={actionLoading}>
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Start Delivery"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Item Action Dialog */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {itemAction === "deliver" ? "Mark as Delivered" : "Mark as Failed"}
            </DialogTitle>
            <DialogDescription>
              {selectedItem?.claim.warrantyCard.product.name} -{" "}
              {selectedItem?.claim.warrantyCard.serialNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {itemAction === "deliver" ? (
              <p className="text-sm text-muted-foreground">
                Confirm that this item has been successfully delivered to the recipient.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Failure Reason *</Label>
                  <Select value={failureReason} onValueChange={setFailureReason}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Recipient not available">Recipient not available</SelectItem>
                      <SelectItem value="Address not found">Address not found</SelectItem>
                      <SelectItem value="Recipient refused">Recipient refused</SelectItem>
                      <SelectItem value="Shop closed">Shop closed</SelectItem>
                      <SelectItem value="Wrong address">Wrong address</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {failureReason === "Other" && (
                  <div className="space-y-2">
                    <Label>Please specify</Label>
                    <Textarea
                      value={failureReason}
                      onChange={(e) => setFailureReason(e.target.value)}
                      placeholder="Explain the reason..."
                      rows={2}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowItemDialog(false)}>
              Cancel
            </Button>
            <Button
              variant={itemAction === "deliver" ? "default" : "destructive"}
              onClick={handleItemAction}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : itemAction === "deliver" ? (
                "Confirm Delivery"
              ) : (
                "Mark as Failed"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Trip Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Delivery Trip</DialogTitle>
            <DialogDescription>
              {pendingItems.length > 0
                ? `This will mark all ${pendingItems.length} pending items as delivered and complete the trip.`
                : "Confirm delivery completion."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Recipient Name *</Label>
              <Input
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Name of person who received items"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="Any additional notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCompleteTrip} disabled={actionLoading}>
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Complete Trip"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
