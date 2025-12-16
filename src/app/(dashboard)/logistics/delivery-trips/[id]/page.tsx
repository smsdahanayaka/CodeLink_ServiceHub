"use client";

// ===========================================
// Delivery Trip Detail Page
// ===========================================

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Truck,
  Store,
  User,
  Calendar,
  Clock,
  Package,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Play,
  Phone,
  MapPin,
  FileText,
  UserCircle,
} from "lucide-react";

import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  signatureUrl: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  notes: string | null;
  collector: {
    id: number;
    name: string;
    phone: string;
    vehicleNumber: string | null;
    vehicleType: string | null;
  } | null;
  shop: {
    id: number;
    name: string;
    address: string | null;
    phone: string | null;
    contactPerson: string | null;
  } | null;
  createdUser: {
    id: number;
    firstName: string;
    lastName: string;
  };
  items: DeliveryItem[];
  createdAt: string;
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
    issueDescription: string;
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
      shop: {
        id: number;
        name: string;
      } | null;
    };
  };
}

interface Collector {
  id: number;
  name: string;
  phone: string;
  vehicleNumber: string | null;
}

const statusConfig = {
  PENDING: { label: "Pending", variant: "secondary" as const, icon: Clock },
  ASSIGNED: { label: "Assigned", variant: "default" as const, icon: UserCircle },
  IN_TRANSIT: { label: "In Transit", variant: "default" as const, icon: Truck },
  COMPLETED: { label: "Completed", variant: "success" as const, icon: CheckCircle },
  PARTIAL: { label: "Partial", variant: "warning" as const, icon: AlertTriangle },
  CANCELLED: { label: "Cancelled", variant: "destructive" as const, icon: XCircle },
};

const itemStatusConfig = {
  PENDING: { label: "Pending", variant: "secondary" as const },
  DELIVERED: { label: "Delivered", variant: "success" as const },
  FAILED: { label: "Failed", variant: "destructive" as const },
};

export default function DeliveryTripDetailPage({
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
  const [collectors, setCollectors] = useState<Collector[]>([]);

  // Dialog states
  const [showDispatchDialog, setShowDispatchDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [selectedCollectorId, setSelectedCollectorId] = useState<number | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [completionNotes, setCompletionNotes] = useState("");

  const canManage = hasPermission("logistics.create_delivery");

  useEffect(() => {
    fetchTrip();
    fetchCollectors();
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

  const fetchCollectors = async () => {
    try {
      const res = await fetch("/api/logistics/collectors?status=ACTIVE");
      const data = await res.json();
      if (data.success) {
        setCollectors(data.data);
      }
    } catch (error) {
      console.error("Error fetching collectors:", error);
    }
  };

  const handleAction = async (action: string, additionalData?: object) => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/logistics/delivery-trips/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...additionalData }),
      });

      const data = await res.json();

      if (data.success) {
        setTrip(data.data);
        toast.success(`Trip ${action}ed successfully`);
        return true;
      } else {
        throw new Error(data.error?.message || `Failed to ${action} trip`);
      }
    } catch (error) {
      console.error(`Error ${action}ing trip:`, error);
      toast.error(error instanceof Error ? error.message : `Failed to ${action} trip`);
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignCollector = async () => {
    if (!selectedCollectorId) {
      toast.error("Please select a collector");
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch(`/api/logistics/delivery-trips/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectorId: selectedCollectorId }),
      });

      const data = await res.json();

      if (data.success) {
        setTrip(data.data);
        setShowAssignDialog(false);
        toast.success("Collector assigned successfully");
      } else {
        throw new Error(data.error?.message || "Failed to assign collector");
      }
    } catch (error) {
      console.error("Error assigning collector:", error);
      toast.error(error instanceof Error ? error.message : "Failed to assign collector");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDispatch = async () => {
    const success = await handleAction("dispatch");
    if (success) {
      setShowDispatchDialog(false);
    }
  };

  const handleComplete = async () => {
    if (!recipientName.trim()) {
      toast.error("Please enter recipient name");
      return;
    }

    const success = await handleAction("complete", {
      recipientName,
      notes: completionNotes || null,
    });
    if (success) {
      setShowCompleteDialog(false);
      setRecipientName("");
      setCompletionNotes("");
    }
  };

  const handleCancel = async () => {
    const success = await handleAction("cancel");
    if (success) {
      setShowCancelDialog(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
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
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
        <Skeleton className="h-64" />
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

  const config = statusConfig[trip.status];
  const StatusIcon = config.icon;
  const pendingItems = trip.items.filter((i) => i.status === "PENDING");
  const deliveredItems = trip.items.filter((i) => i.status === "DELIVERED");
  const failedItems = trip.items.filter((i) => i.status === "FAILED");

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Delivery Trip ${trip.tripNumber}`}
        description={`Created on ${formatDate(trip.createdAt)}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        }
      />

      {/* Status & Actions Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Badge variant={config.variant} className="flex items-center gap-1 text-lg px-4 py-2">
                <StatusIcon className="h-5 w-5" />
                {config.label}
              </Badge>
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">{trip.items.length}</span> items
                {deliveredItems.length > 0 && (
                  <span className="text-green-600 ml-2">
                    ({deliveredItems.length} delivered)
                  </span>
                )}
                {failedItems.length > 0 && (
                  <span className="text-destructive ml-2">
                    ({failedItems.length} failed)
                  </span>
                )}
              </div>
            </div>

            {canManage && (
              <div className="flex items-center gap-2">
                {["PENDING", "ASSIGNED"].includes(trip.status) && !trip.collector && (
                  <Button
                    variant="outline"
                    onClick={() => setShowAssignDialog(true)}
                    disabled={actionLoading}
                  >
                    <UserCircle className="h-4 w-4 mr-2" />
                    Assign Collector
                  </Button>
                )}
                {["PENDING", "ASSIGNED"].includes(trip.status) && trip.collector && (
                  <Button
                    onClick={() => setShowDispatchDialog(true)}
                    disabled={actionLoading}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Dispatch
                  </Button>
                )}
                {trip.status === "IN_TRANSIT" && pendingItems.length > 0 && (
                  <Button
                    onClick={() => setShowCompleteDialog(true)}
                    disabled={actionLoading}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete All
                  </Button>
                )}
                {!["COMPLETED", "PARTIAL", "CANCELLED"].includes(trip.status) && (
                  <Button
                    variant="destructive"
                    onClick={() => setShowCancelDialog(true)}
                    disabled={actionLoading}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Destination Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {trip.toType === "SHOP" ? (
                <Store className="h-5 w-5" />
              ) : (
                <User className="h-5 w-5" />
              )}
              Destination
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Badge variant="outline">{trip.toType}</Badge>
            {trip.toType === "SHOP" && trip.shop ? (
              <>
                <p className="font-medium">{trip.shop.name}</p>
                {trip.shop.address && (
                  <p className="text-sm text-muted-foreground flex items-start gap-1">
                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    {trip.shop.address}
                  </p>
                )}
                {trip.shop.phone && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    {trip.shop.phone}
                  </p>
                )}
                {trip.shop.contactPerson && (
                  <p className="text-sm text-muted-foreground">
                    Contact: {trip.shop.contactPerson}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="font-medium">{trip.customerName}</p>
                {trip.customerAddress && (
                  <p className="text-sm text-muted-foreground flex items-start gap-1">
                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    {trip.customerAddress}
                  </p>
                )}
                {trip.customerPhone && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    {trip.customerPhone}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Collector Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircle className="h-5 w-5" />
              Collector
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {trip.collector ? (
              <>
                <p className="font-medium">{trip.collector.name}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  {trip.collector.phone}
                </p>
                {trip.collector.vehicleNumber && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Truck className="h-4 w-4" />
                    {trip.collector.vehicleNumber}
                    {trip.collector.vehicleType && ` (${trip.collector.vehicleType})`}
                  </p>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">Not assigned</p>
            )}
          </CardContent>
        </Card>

        {/* Schedule Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {trip.scheduledDate ? (
              <>
                <p className="font-medium">
                  {new Date(trip.scheduledDate).toLocaleDateString("en-US", {
                    weekday: "short",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
                {trip.scheduledSlot && (
                  <Badge variant="secondary">{trip.scheduledSlot}</Badge>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">Not scheduled</p>
            )}
            {trip.dispatchedAt && (
              <p className="text-sm text-muted-foreground">
                Dispatched: {formatDate(trip.dispatchedAt)}
              </p>
            )}
            {trip.completedAt && (
              <p className="text-sm text-muted-foreground">
                Completed: {formatDate(trip.completedAt)}
              </p>
            )}
            {trip.recipientName && (
              <p className="text-sm">
                Received by: <span className="font-medium">{trip.recipientName}</span>
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {trip.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{trip.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Delivery Items ({trip.items.length})
          </CardTitle>
          <CardDescription>Items included in this delivery trip</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Claim #</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Serial</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Delivered At</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trip.items.map((item) => {
                const itemConfig = itemStatusConfig[item.status];
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Button
                        variant="link"
                        className="p-0 h-auto"
                        onClick={() => router.push(`/claims/${item.claim.id}`)}
                      >
                        {item.claim.claimNumber}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.claim.warrantyCard.product.name}</p>
                        {item.claim.warrantyCard.product.modelNumber && (
                          <p className="text-sm text-muted-foreground">
                            {item.claim.warrantyCard.product.modelNumber}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {item.claim.warrantyCard.serialNumber}
                    </TableCell>
                    <TableCell>
                      <Badge variant={itemConfig.variant}>{itemConfig.label}</Badge>
                      {item.failureReason && (
                        <p className="text-xs text-destructive mt-1">
                          {item.failureReason}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.deliveredAt ? formatDate(item.deliveredAt) : "-"}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">
                      {item.notes || "-"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Assign Collector Dialog */}
      <AlertDialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Assign Collector</AlertDialogTitle>
            <AlertDialogDescription>
              Select a collector to assign to this delivery trip.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Select
              value={selectedCollectorId?.toString() || ""}
              onValueChange={(v) => setSelectedCollectorId(parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select collector" />
              </SelectTrigger>
              <SelectContent>
                {collectors.map((collector) => (
                  <SelectItem key={collector.id} value={collector.id.toString()}>
                    {collector.name}
                    {collector.vehicleNumber && ` (${collector.vehicleNumber})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAssignCollector} disabled={actionLoading}>
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Assign"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dispatch Dialog */}
      <AlertDialog open={showDispatchDialog} onOpenChange={setShowDispatchDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dispatch Delivery Trip</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to dispatch this delivery trip? The collector will be
              notified and the trip status will change to &quot;In Transit&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDispatch} disabled={actionLoading}>
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Dispatch"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Complete Dialog */}
      <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Delivery Trip</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark all pending items as delivered and complete the trip.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Recipient Name *</Label>
              <Input
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Name of person who received the items"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="Any additional notes..."
                rows={3}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleComplete} disabled={actionLoading}>
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Complete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Delivery Trip</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this delivery trip? This action cannot be
              undone. Items will need to be reassigned to a new trip.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Trip</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
    </div>
  );
}
