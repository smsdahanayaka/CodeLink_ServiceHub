"use client";

// ===========================================
// Pickups Management Page
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

export default function PickupsPage() {
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [collectors, setCollectors] = useState<Collector[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Create dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createData, setCreateData] = useState({
    claimId: "",
    collectorId: "",
    fromType: "SHOP" as "SHOP" | "CUSTOMER",
    fromAddress: "",
    toLocation: "Service Center",
    scheduledDate: "",
    scheduledTimeSlot: "",
    notes: "",
  });
  const [creating, setCreating] = useState(false);

  // Complete dialog state
  const [completePickup, setCompletePickup] = useState<Pickup | null>(null);
  const [receiverName, setReceiverName] = useState("");
  const [completionNotes, setCompletionNotes] = useState("");
  const [completing, setCompleting] = useState(false);

  // Cancel dialog
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Fetch pickups
  const fetchPickups = useCallback(async () => {
    try {
      const url =
        statusFilter === "all"
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

  // Fetch claims for pickup
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
    fetchPickups();
    fetchCollectors();
    fetchClaims();
  }, [fetchPickups]);

  // Create pickup
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const res = await fetch("/api/logistics/pickups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimId: parseInt(createData.claimId),
          collectorId: createData.collectorId
            ? parseInt(createData.collectorId)
            : null,
          fromType: createData.fromType,
          fromAddress: createData.fromAddress || undefined,
          toLocation: createData.toLocation,
          scheduledDate: createData.scheduledDate || undefined,
          scheduledTimeSlot: createData.scheduledTimeSlot || undefined,
          notes: createData.notes || undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Pickup created successfully");
        setIsCreateOpen(false);
        setCreateData({
          claimId: "",
          collectorId: "",
          fromType: "SHOP",
          fromAddress: "",
          toLocation: "Service Center",
          scheduledDate: "",
          scheduledTimeSlot: "",
          notes: "",
        });
        fetchPickups();
      } else {
        toast.error(data.error?.message || "Failed to create pickup");
      }
    } catch (error) {
      console.error("Error creating pickup:", error);
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
      console.error("Error starting pickup:", error);
      toast.error("Failed to start pickup");
    }
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
        toast.success("Pickup completed successfully");
        setCompletePickup(null);
        setReceiverName("");
        setCompletionNotes("");
        fetchPickups();
      } else {
        toast.error(data.error?.message || "Failed to complete pickup");
      }
    } catch (error) {
      console.error("Error completing pickup:", error);
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
      console.error("Error cancelling pickup:", error);
      toast.error("Failed to cancel pickup");
    } finally {
      setCancelling(false);
    }
  };

  // Assign collector
  const handleAssignCollector = async (
    pickupId: number,
    collectorId: number
  ) => {
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
      console.error("Error assigning collector:", error);
      toast.error("Failed to assign collector");
    }
  };

  // Status counts
  const statusCounts = {
    all: pickups.length,
    PENDING: pickups.filter((p) => p.status === "PENDING").length,
    ASSIGNED: pickups.filter((p) => p.status === "ASSIGNED").length,
    IN_TRANSIT: pickups.filter((p) => p.status === "IN_TRANSIT").length,
    COMPLETED: pickups.filter((p) => p.status === "COMPLETED").length,
    CANCELLED: pickups.filter((p) => p.status === "CANCELLED").length,
  };

  // Table columns
  const columns: Column<Pickup>[] = [
    {
      key: "pickupNumber",
      title: "Pickup #",
      sortable: true,
      render: (pickup) => (
        <div>
          <div className="font-mono font-medium">{pickup.pickupNumber}</div>
          <div className="text-xs text-muted-foreground">
            Claim: {pickup.claim.claimNumber}
          </div>
        </div>
      ),
    },
    {
      key: "product",
      title: "Product",
      render: (pickup) => (
        <div>
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {pickup.claim.warrantyCard.product.name}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            S/N: {pickup.claim.warrantyCard.serialNumber}
          </div>
        </div>
      ),
    },
    {
      key: "from",
      title: "Pickup From",
      render: (pickup) => (
        <div>
          {pickup.fromType === "SHOP" && pickup.fromShop ? (
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-muted-foreground" />
              <div>
                <div>{pickup.fromShop.name}</div>
                {pickup.fromShop.phone && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    {pickup.fromShop.phone}
                  </div>
                )}
              </div>
            </div>
          ) : pickup.claim.warrantyCard.customer ? (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <div>{pickup.claim.warrantyCard.customer.name}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  {pickup.claim.warrantyCard.customer.phone}
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
      render: (pickup) =>
        pickup.collector ? (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <User className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="font-medium">{pickup.collector.name}</div>
              <div className="text-xs text-muted-foreground">
                {pickup.collector.phone}
              </div>
            </div>
          </div>
        ) : (
          <Select
            onValueChange={(value) =>
              handleAssignCollector(pickup.id, parseInt(value))
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
      render: (pickup) =>
        pickup.scheduledDate ? (
          <div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              {format(new Date(pickup.scheduledDate), "MMM dd, yyyy")}
            </div>
            {pickup.scheduledTimeSlot && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {pickup.scheduledTimeSlot}
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
      render: (pickup) => <StatusBadge status={pickup.status} />,
    },
    {
      key: "actions",
      title: "",
      render: (pickup) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {["PENDING", "ASSIGNED"].includes(pickup.status) &&
              pickup.collector && (
                <DropdownMenuItem onClick={() => handleStartTransit(pickup)}>
                  <Play className="mr-2 h-4 w-4" />
                  Start Transit
                </DropdownMenuItem>
              )}
            {pickup.status === "IN_TRANSIT" && (
              <DropdownMenuItem onClick={() => setCompletePickup(pickup)}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Mark Complete
              </DropdownMenuItem>
            )}
            {!["COMPLETED", "CANCELLED"].includes(pickup.status) && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setCancelId(pickup.id)}
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
        title="Pickups"
        description="Manage product pickups from shops and customers"
        actions={
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Schedule Pickup
          </Button>
        }
      />

      {/* Status summary cards */}
      <div className="grid gap-4 md:grid-cols-5">
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
      </div>

      {/* Filter tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="PENDING">Pending</TabsTrigger>
          <TabsTrigger value="ASSIGNED">Assigned</TabsTrigger>
          <TabsTrigger value="IN_TRANSIT">In Transit</TabsTrigger>
          <TabsTrigger value="COMPLETED">Completed</TabsTrigger>
          <TabsTrigger value="CANCELLED">Cancelled</TabsTrigger>
        </TabsList>
      </Tabs>

      <DataTable
        data={pickups}
        columns={columns}
        searchKey="pickupNumber"
        searchPlaceholder="Search by pickup number..."
        emptyMessage={loading ? "Loading..." : "No pickups found"}
        emptyDescription="Schedule a pickup to get started."
      />

      {/* Create Pickup Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Pickup</DialogTitle>
            <DialogDescription>
              Create a new pickup for a warranty claim
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4">
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
              <Label htmlFor="fromType">Pickup From</Label>
              <Select
                value={createData.fromType}
                onValueChange={(value) =>
                  setCreateData({
                    ...createData,
                    fromType: value as "SHOP" | "CUSTOMER",
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

            <div className="space-y-2">
              <Label htmlFor="toLocation">Deliver To</Label>
              <Input
                id="toLocation"
                value={createData.toLocation}
                onChange={(e) =>
                  setCreateData({ ...createData, toLocation: e.target.value })
                }
                placeholder="Service Center"
              />
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating || !createData.claimId}>
                {creating ? "Creating..." : "Schedule Pickup"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Complete Pickup Dialog */}
      <Dialog
        open={!!completePickup}
        onOpenChange={() => setCompletePickup(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Pickup</DialogTitle>
            <DialogDescription>
              Mark pickup {completePickup?.pickupNumber} as completed
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="receiverName">Receiver Name *</Label>
              <Input
                id="receiverName"
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
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
                placeholder="Any notes about the pickup..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCompletePickup(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleComplete}
              disabled={completing || !receiverName}
            >
              {completing ? "Completing..." : "Complete Pickup"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation */}
      <ConfirmDialog
        open={!!cancelId}
        onOpenChange={() => setCancelId(null)}
        title="Cancel Pickup"
        description="Are you sure you want to cancel this pickup? This action cannot be undone."
        confirmText="Cancel Pickup"
        onConfirm={handleCancel}
        isLoading={cancelling}
        variant="destructive"
      />
    </div>
  );
}
