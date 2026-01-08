"use client";

// ===========================================
// Deliveries Management Page
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
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { PageHeader } from "@/components/layout";
import { DataTable, Column } from "@/components/tables";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Delivery {
  id: number;
  deliveryNumber: string;
  claimId: number;
  status: "PENDING" | "ASSIGNED" | "IN_TRANSIT" | "COMPLETED" | "CANCELLED" | "FAILED";
  fromLocation: string;
  toType: "SHOP" | "CUSTOMER";
  toAddress: string | null;
  scheduledDate: string | null;
  scheduledTimeSlot: string | null;
  notes: string | null;
  failureReason: string | null;
  attemptCount: number;
  createdAt: string;
  claim: {
    id: number;
    claimNumber: string;
    currentStatus: string;
    warrantyCard: {
      serialNumber: string;
      product: { name: string };
      customer: { name: string; phone: string } | null;
    };
  };
  collector: {
    id: number;
    name: string;
    phone: string;
    vehicleNumber: string | null;
  } | null;
  toShop: {
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
}

interface Claim {
  id: number;
  claimNumber: string;
  currentStatus: string;
  warrantyCard: {
    serialNumber: string;
    product: { name: string };
    customer: { name: string } | null;
    shop: { id: number; name: string; address: string | null } | null;
  };
}

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [collectors, setCollectors] = useState<Collector[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Create dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createData, setCreateData] = useState({
    claimId: "",
    collectorId: "",
    fromLocation: "Service Center",
    toType: "SHOP" as "SHOP" | "CUSTOMER",
    toAddress: "",
    scheduledDate: "",
    scheduledTimeSlot: "",
    notes: "",
  });
  const [creating, setCreating] = useState(false);

  // Complete dialog state
  const [completeDelivery, setCompleteDelivery] = useState<Delivery | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [completionNotes, setCompletionNotes] = useState("");
  const [completing, setCompleting] = useState(false);

  // Fail dialog state
  const [failDelivery, setFailDelivery] = useState<Delivery | null>(null);
  const [failureReason, setFailureReason] = useState("");
  const [failureNotes, setFailureNotes] = useState("");
  const [failing, setFailing] = useState(false);

  // Cancel dialog
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Fetch deliveries
  const fetchDeliveries = useCallback(async () => {
    try {
      const url =
        statusFilter === "all"
          ? "/api/logistics/deliveries?limit=100"
          : `/api/logistics/deliveries?limit=100&status=${statusFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setDeliveries(data.data);
      }
    } catch (error) {
      console.error("Error fetching deliveries:", error);
      toast.error("Failed to load deliveries");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  // Fetch collectors
  const fetchCollectors = async () => {
    try {
      const res = await fetch("/api/logistics/collectors?status=ACTIVE&limit=100");
      const data = await res.json();
      if (data.success) {
        setCollectors(data.data);
      }
    } catch (error) {
      console.error("Error fetching collectors:", error);
    }
  };

  // Fetch claims for delivery
  const fetchClaims = async () => {
    try {
      const res = await fetch("/api/claims?limit=100");
      const data = await res.json();
      if (data.success) {
        setClaims(data.data);
      }
    } catch (error) {
      console.error("Error fetching claims:", error);
    }
  };

  useEffect(() => {
    fetchDeliveries();
    fetchCollectors();
    fetchClaims();
  }, [fetchDeliveries]);

  // Create delivery
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const res = await fetch("/api/logistics/deliveries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimId: parseInt(createData.claimId),
          collectorId: createData.collectorId
            ? parseInt(createData.collectorId)
            : null,
          fromLocation: createData.fromLocation,
          toType: createData.toType,
          toAddress: createData.toAddress || undefined,
          scheduledDate: createData.scheduledDate || undefined,
          scheduledTimeSlot: createData.scheduledTimeSlot || undefined,
          notes: createData.notes || undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Delivery scheduled successfully");
        setIsCreateOpen(false);
        setCreateData({
          claimId: "",
          collectorId: "",
          fromLocation: "Service Center",
          toType: "SHOP",
          toAddress: "",
          scheduledDate: "",
          scheduledTimeSlot: "",
          notes: "",
        });
        fetchDeliveries();
      } else {
        toast.error(data.error?.message || "Failed to create delivery");
      }
    } catch (error) {
      console.error("Error creating delivery:", error);
      toast.error("Failed to create delivery");
    } finally {
      setCreating(false);
    }
  };

  // Start transit
  const handleStartTransit = async (delivery: Delivery) => {
    try {
      const res = await fetch(`/api/logistics/deliveries/${delivery.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start_transit" }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Delivery started - in transit");
        fetchDeliveries();
      } else {
        toast.error(data.error?.message || "Failed to start delivery");
      }
    } catch (error) {
      console.error("Error starting delivery:", error);
      toast.error("Failed to start delivery");
    }
  };

  // Complete delivery
  const handleComplete = async () => {
    if (!completeDelivery || !recipientName) return;

    setCompleting(true);
    try {
      const res = await fetch(`/api/logistics/deliveries/${completeDelivery.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete",
          recipientName,
          notes: completionNotes || undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Delivery completed successfully");
        setCompleteDelivery(null);
        setRecipientName("");
        setCompletionNotes("");
        fetchDeliveries();
      } else {
        toast.error(data.error?.message || "Failed to complete delivery");
      }
    } catch (error) {
      console.error("Error completing delivery:", error);
      toast.error("Failed to complete delivery");
    } finally {
      setCompleting(false);
    }
  };

  // Fail delivery
  const handleFail = async () => {
    if (!failDelivery || !failureReason) return;

    setFailing(true);
    try {
      const res = await fetch(`/api/logistics/deliveries/${failDelivery.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "fail",
          failureReason,
          notes: failureNotes || undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Delivery marked as failed");
        setFailDelivery(null);
        setFailureReason("");
        setFailureNotes("");
        fetchDeliveries();
      } else {
        toast.error(data.error?.message || "Failed to update delivery");
      }
    } catch (error) {
      console.error("Error failing delivery:", error);
      toast.error("Failed to update delivery");
    } finally {
      setFailing(false);
    }
  };

  // Retry delivery
  const handleRetry = async (delivery: Delivery) => {
    try {
      const res = await fetch(`/api/logistics/deliveries/${delivery.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry" }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Delivery retry scheduled");
        fetchDeliveries();
      } else {
        toast.error(data.error?.message || "Failed to retry delivery");
      }
    } catch (error) {
      console.error("Error retrying delivery:", error);
      toast.error("Failed to retry delivery");
    }
  };

  // Cancel delivery
  const handleCancel = async () => {
    if (!cancelId) return;

    setCancelling(true);
    try {
      const res = await fetch(`/api/logistics/deliveries/${cancelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Delivery cancelled");
        setCancelId(null);
        fetchDeliveries();
      } else {
        toast.error(data.error?.message || "Failed to cancel delivery");
      }
    } catch (error) {
      console.error("Error cancelling delivery:", error);
      toast.error("Failed to cancel delivery");
    } finally {
      setCancelling(false);
    }
  };

  // Assign collector
  const handleAssignCollector = async (deliveryId: number, collectorId: number) => {
    try {
      const res = await fetch(`/api/logistics/deliveries/${deliveryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectorId }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Collector assigned");
        fetchDeliveries();
      } else {
        toast.error(data.error?.message || "Failed to assign collector");
      }
    } catch (error) {
      console.error("Error assigning collector:", error);
      toast.error("Failed to assign collector");
    }
  };

  // Status counts
  const statusCounts = {
    all: deliveries.length,
    PENDING: deliveries.filter((d) => d.status === "PENDING").length,
    ASSIGNED: deliveries.filter((d) => d.status === "ASSIGNED").length,
    IN_TRANSIT: deliveries.filter((d) => d.status === "IN_TRANSIT").length,
    COMPLETED: deliveries.filter((d) => d.status === "COMPLETED").length,
    FAILED: deliveries.filter((d) => d.status === "FAILED").length,
    CANCELLED: deliveries.filter((d) => d.status === "CANCELLED").length,
  };

  // Table columns
  const columns: Column<Delivery>[] = [
    {
      key: "deliveryNumber",
      title: "Delivery #",
      sortable: true,
      render: (delivery) => (
        <div>
          <div className="font-mono font-medium">{delivery.deliveryNumber}</div>
          <div className="text-xs text-muted-foreground">
            Claim: {delivery.claim.claimNumber}
          </div>
          {delivery.attemptCount > 0 && (
            <Badge variant="outline" className="mt-1 text-xs">
              Attempt {delivery.attemptCount + 1}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "product",
      title: "Product",
      render: (delivery) => (
        <div>
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {delivery.claim.warrantyCard.product.name}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            S/N: {delivery.claim.warrantyCard.serialNumber}
          </div>
        </div>
      ),
    },
    {
      key: "to",
      title: "Deliver To",
      render: (delivery) => (
        <div>
          {delivery.toType === "SHOP" && delivery.toShop ? (
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-muted-foreground" />
              <div>
                <div>{delivery.toShop.name}</div>
                {delivery.toShop.phone && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    {delivery.toShop.phone}
                  </div>
                )}
              </div>
            </div>
          ) : delivery.claim.warrantyCard.customer ? (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <div>{delivery.claim.warrantyCard.customer.name}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  {delivery.claim.warrantyCard.customer.phone}
                </div>
              </div>
            </div>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
      ),
    },
    {
      key: "collector",
      title: "Collector",
      render: (delivery) =>
        delivery.collector ? (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <User className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="font-medium">{delivery.collector.name}</div>
              <div className="text-xs text-muted-foreground">
                {delivery.collector.phone}
              </div>
            </div>
          </div>
        ) : (
          <Select
            onValueChange={(value) =>
              handleAssignCollector(delivery.id, parseInt(value))
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Assign" />
            </SelectTrigger>
            <SelectContent>
              {collectors.map((c) => (
                <SelectItem key={c.id} value={c.id.toString()}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ),
    },
    {
      key: "scheduled",
      title: "Scheduled",
      render: (delivery) =>
        delivery.scheduledDate ? (
          <div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              {format(new Date(delivery.scheduledDate), "MMM dd, yyyy")}
            </div>
            {delivery.scheduledTimeSlot && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {delivery.scheduledTimeSlot}
              </div>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">Not scheduled</span>
        ),
    },
    {
      key: "status",
      title: "Status",
      render: (delivery) => (
        <div>
          <StatusBadge status={delivery.status} />
          {delivery.status === "FAILED" && delivery.failureReason && (
            <div className="mt-1 text-xs text-destructive">
              {delivery.failureReason}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      title: "",
      render: (delivery) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {["PENDING", "ASSIGNED"].includes(delivery.status) &&
              delivery.collector && (
                <DropdownMenuItem onClick={() => handleStartTransit(delivery)}>
                  <Play className="mr-2 h-4 w-4" />
                  Start Transit
                </DropdownMenuItem>
              )}
            {delivery.status === "IN_TRANSIT" && (
              <>
                <DropdownMenuItem onClick={() => setCompleteDelivery(delivery)}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Mark Complete
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFailDelivery(delivery)}>
                  <AlertCircle className="mr-2 h-4 w-4 text-destructive" />
                  Mark Failed
                </DropdownMenuItem>
              </>
            )}
            {delivery.status === "FAILED" && (
              <DropdownMenuItem onClick={() => handleRetry(delivery)}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry Delivery
              </DropdownMenuItem>
            )}
            {!["COMPLETED", "CANCELLED"].includes(delivery.status) && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setCancelId(delivery.id)}
                  className="text-destructive"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deliveries"
        description="Manage product deliveries to shops and customers"
        actions={
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Schedule Delivery
          </Button>
        }
      />

      {/* Status summary cards */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card className="cursor-pointer" onClick={() => setStatusFilter("all")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.all}</div>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer border-yellow-500/50"
          onClick={() => setStatusFilter("PENDING")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {statusCounts.PENDING}
            </div>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer border-blue-500/50"
          onClick={() => setStatusFilter("ASSIGNED")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">
              Assigned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {statusCounts.ASSIGNED}
            </div>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer border-orange-500/50"
          onClick={() => setStatusFilter("IN_TRANSIT")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-600">
              In Transit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {statusCounts.IN_TRANSIT}
            </div>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer border-green-500/50"
          onClick={() => setStatusFilter("COMPLETED")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statusCounts.COMPLETED}
            </div>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer border-red-500/50"
          onClick={() => setStatusFilter("FAILED")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">
              Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {statusCounts.FAILED}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="PENDING">Pending</TabsTrigger>
          <TabsTrigger value="ASSIGNED">Assigned</TabsTrigger>
          <TabsTrigger value="IN_TRANSIT">In Transit</TabsTrigger>
          <TabsTrigger value="COMPLETED">Completed</TabsTrigger>
          <TabsTrigger value="FAILED">Failed</TabsTrigger>
          <TabsTrigger value="CANCELLED">Cancelled</TabsTrigger>
        </TabsList>
      </Tabs>

      <DataTable
        data={deliveries}
        columns={columns}
        searchKey="deliveryNumber"
        searchPlaceholder="Search by delivery number..."
        emptyMessage={loading ? "Loading..." : "No deliveries found"}
        emptyDescription="Schedule a delivery to get started."
      />

      {/* Create Delivery Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="flex max-h-[90vh] max-w-md flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Schedule Delivery</DialogTitle>
            <DialogDescription>
              Create a new delivery for a warranty claim
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 space-y-4 overflow-y-auto px-1 py-2">
              <div className="space-y-2">
                <Label htmlFor="claimId">Claim *</Label>
                <Select
                  value={createData.claimId}
                  onValueChange={(value) =>
                    setCreateData({ ...createData, claimId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a claim" />
                  </SelectTrigger>
                  <SelectContent>
                    {claims.map((claim) => (
                      <SelectItem key={claim.id} value={claim.id.toString()}>
                        {claim.claimNumber} -{" "}
                        {claim.warrantyCard.product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="collectorId">Collector</Label>
                <Select
                  value={createData.collectorId}
                  onValueChange={(value) =>
                    setCreateData({ ...createData, collectorId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Assign later" />
                  </SelectTrigger>
                  <SelectContent>
                    {collectors.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.name} - {c.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fromLocation">From Location</Label>
                <Input
                  id="fromLocation"
                  value={createData.fromLocation}
                  onChange={(e) =>
                    setCreateData({ ...createData, fromLocation: e.target.value })
                  }
                  placeholder="Service Center"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="toType">Deliver To</Label>
                <Select
                  value={createData.toType}
                  onValueChange={(value) =>
                    setCreateData({
                      ...createData,
                      toType: value as "SHOP" | "CUSTOMER",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SHOP">Shop</SelectItem>
                    <SelectItem value="CUSTOMER">Customer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scheduledDate">Scheduled Date</Label>
                  <Input
                    id="scheduledDate"
                    type="date"
                    value={createData.scheduledDate}
                    onChange={(e) =>
                      setCreateData({
                        ...createData,
                        scheduledDate: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scheduledTimeSlot">Time Slot</Label>
                  <Select
                    value={createData.scheduledTimeSlot}
                    onValueChange={(value) =>
                      setCreateData({ ...createData, scheduledTimeSlot: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select time" />
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

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={createData.notes}
                  onChange={(e) =>
                    setCreateData({ ...createData, notes: e.target.value })
                  }
                  placeholder="Any special instructions..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className="flex-shrink-0 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating || !createData.claimId}>
                {creating ? "Creating..." : "Schedule Delivery"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Complete Delivery Dialog */}
      <Dialog
        open={!!completeDelivery}
        onOpenChange={() => setCompleteDelivery(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Delivery</DialogTitle>
            <DialogDescription>
              Mark delivery {completeDelivery?.deliveryNumber} as completed
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recipientName">Recipient Name *</Label>
              <Input
                id="recipientName"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Name of person who received the item"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="completionNotes">Notes</Label>
              <Textarea
                id="completionNotes"
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="Any notes about the delivery..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteDelivery(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleComplete}
              disabled={completing || !recipientName}
            >
              {completing ? "Completing..." : "Complete Delivery"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fail Delivery Dialog */}
      <Dialog open={!!failDelivery} onOpenChange={() => setFailDelivery(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mark Delivery Failed</DialogTitle>
            <DialogDescription>
              Report delivery {failDelivery?.deliveryNumber} as failed
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="failureReason">Failure Reason *</Label>
              <Select
                value={failureReason}
                onValueChange={setFailureReason}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Customer not available">Customer not available</SelectItem>
                  <SelectItem value="Wrong address">Wrong address</SelectItem>
                  <SelectItem value="Address not found">Address not found</SelectItem>
                  <SelectItem value="Customer refused delivery">Customer refused delivery</SelectItem>
                  <SelectItem value="Damaged in transit">Damaged in transit</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="failureNotes">Additional Notes</Label>
              <Textarea
                id="failureNotes"
                value={failureNotes}
                onChange={(e) => setFailureNotes(e.target.value)}
                placeholder="Provide more details about the failure..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFailDelivery(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleFail}
              disabled={failing || !failureReason}
            >
              {failing ? "Saving..." : "Mark Failed"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation */}
      <ConfirmDialog
        open={!!cancelId}
        onOpenChange={() => setCancelId(null)}
        title="Cancel Delivery"
        description="Are you sure you want to cancel this delivery? This action cannot be undone."
        confirmText="Cancel Delivery"
        onConfirm={handleCancel}
        isLoading={cancelling}
        variant="destructive"
      />
    </div>
  );
}
