"use client";

// ===========================================
// Claims List Page with Pending Review
// ===========================================

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Eye,
  ClipboardList,
  User,
  Package,
  Store,
  Phone,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Truck,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { PageHeader } from "@/components/layout";
import { DataTable, Column } from "@/components/tables";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Claim {
  id: number;
  claimNumber: string;
  issueDescription: string;
  issueCategory: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  currentStatus: string;
  currentLocation: string;
  reportedBy: string;
  createdAt: string;
  warrantyCard: {
    id: number;
    cardNumber: string;
    serialNumber: string;
    product: { id: number; name: string; modelNumber: string | null } | null;
    customer: { id: number; name: string; phone: string } | null;
    shop: { id: number; name: string; code: string | null } | null;
  } | null;
  assignedUser: { id: number; firstName: string | null; lastName: string | null } | null;
  _count: { claimHistory: number };
}

interface PendingPickup {
  id: number;
  pickupNumber: string;
  status: string;
  receivedAt: string | null;
  receiverName: string | null;
  fromType: string;
  notes: string | null;
  createdAt: string;
  claim: {
    id: number;
    claimNumber: string;
    currentStatus: string;
    issueDescription: string;
    priority: string;
    createdByUser: { id: number; firstName: string; lastName: string } | null;
  } | null;
  warrantyCard: {
    id: number;
    cardNumber: string;
    serialNumber: string;
    product: { id: number; name: string; modelNumber: string | null } | null;
    customer: { id: number; name: string; phone: string; address: string | null } | null;
    shop: { id: number; name: string; code: string | null; address: string | null; phone: string | null } | null;
  } | null;
  collector: { id: number; name: string; phone: string } | null;
  fromShop: { id: number; name: string; address: string | null; phone: string | null } | null;
}

export default function ClaimsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("pending-review");
  const [claims, setClaims] = useState<Claim[]>([]);
  const [pendingPickups, setPendingPickups] = useState<PendingPickup[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPending, setLoadingPending] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  // Reject dialog state
  const [rejectPickup, setRejectPickup] = useState<PendingPickup | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  // Accept dialog state
  const [acceptPickup, setAcceptPickup] = useState<PendingPickup | null>(null);
  const [accepting, setAccepting] = useState(false);

  // Fetch claims
  const fetchClaims = useCallback(async () => {
    try {
      let url = "/api/claims?limit=100";
      if (statusFilter !== "all") url += `&status=${statusFilter}`;
      if (priorityFilter !== "all") url += `&priority=${priorityFilter}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setClaims(data.data);
      }
    } catch (error) {
      console.error("Error fetching claims:", error);
      toast.error("Failed to load claims");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter]);

  // Fetch pending review pickups
  const fetchPendingPickups = async () => {
    try {
      const res = await fetch("/api/logistics/pickups/pending-review");
      const data = await res.json();
      if (data.success) {
        setPendingPickups(data.data);
      }
    } catch (error) {
      console.error("Error fetching pending pickups:", error);
    } finally {
      setLoadingPending(false);
    }
  };

  useEffect(() => {
    fetchClaims();
    fetchPendingPickups();
  }, [fetchClaims]);

  // Accept pickup and create claim
  const handleAccept = async () => {
    if (!acceptPickup) return;

    setAccepting(true);
    try {
      const res = await fetch(`/api/logistics/pickups/${acceptPickup.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Claim accepted and moved to processing");
        setAcceptPickup(null);
        fetchPendingPickups();
        fetchClaims();
      } else {
        toast.error(data.error?.message || "Failed to accept claim");
      }
    } catch (error) {
      toast.error("Failed to accept claim");
    } finally {
      setAccepting(false);
    }
  };

  // Reject pickup
  const handleReject = async () => {
    if (!rejectPickup || !rejectionReason) return;

    setRejecting(true);
    try {
      const res = await fetch(`/api/logistics/pickups/${rejectPickup.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          rejectionReason,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Pickup rejected - item ready for return delivery");
        setRejectPickup(null);
        setRejectionReason("");
        fetchPendingPickups();
      } else {
        toast.error(data.error?.message || "Failed to reject pickup");
      }
    } catch (error) {
      toast.error("Failed to reject pickup");
    } finally {
      setRejecting(false);
    }
  };

  // Get priority badge
  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, string> = {
      LOW: "bg-gray-100 text-gray-800",
      MEDIUM: "bg-blue-100 text-blue-800",
      HIGH: "bg-orange-100 text-orange-800",
      URGENT: "bg-red-100 text-red-800",
    };
    return (
      <Badge className={variants[priority] || "bg-gray-100"}>
        {priority}
      </Badge>
    );
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (["new", "pending", "pending_review", "received"].includes(statusLower)) {
      return <Badge variant="secondary">{status}</Badge>;
    }
    if (["in_progress", "in_service", "processing"].includes(statusLower)) {
      return <Badge className="bg-blue-100 text-blue-800">{status}</Badge>;
    }
    if (["resolved", "completed", "closed"].includes(statusLower)) {
      return <Badge className="bg-green-100 text-green-800">{status}</Badge>;
    }
    if (["rejected", "cancelled"].includes(statusLower)) {
      return <Badge variant="destructive">{status}</Badge>;
    }
    return <Badge>{status}</Badge>;
  };

  // Table columns
  const columns: Column<Claim>[] = [
    {
      key: "claimNumber",
      title: "Claim #",
      sortable: true,
      render: (claim) => (
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium font-mono">{claim.claimNumber}</div>
            <div className="text-xs text-muted-foreground">
              {format(new Date(claim.createdAt), "dd MMM yyyy")}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "product",
      title: "Product",
      render: (claim) => (
        <div>
          <div className="font-medium">{claim.warrantyCard?.product?.name || "N/A"}</div>
          <div className="text-xs text-muted-foreground font-mono">
            {claim.warrantyCard?.serialNumber || "-"}
          </div>
        </div>
      ),
    },
    {
      key: "customer",
      title: "Customer",
      render: (claim) => (
        <div>
          <div className="font-medium">{claim.warrantyCard?.customer?.name || "N/A"}</div>
          <div className="text-xs text-muted-foreground">
            {claim.warrantyCard?.customer?.phone || "-"}
          </div>
        </div>
      ),
    },
    {
      key: "issue",
      title: "Issue",
      render: (claim) => (
        <div className="max-w-[200px]">
          <p className="text-sm truncate">{claim.issueDescription}</p>
          {claim.issueCategory && (
            <Badge variant="outline" className="mt-1">{claim.issueCategory}</Badge>
          )}
        </div>
      ),
    },
    {
      key: "priority",
      title: "Priority",
      render: (claim) => getPriorityBadge(claim.priority),
    },
    {
      key: "status",
      title: "Status",
      render: (claim) => getStatusBadge(claim.currentStatus),
    },
    {
      key: "assignedTo",
      title: "Assigned To",
      render: (claim) =>
        claim.assignedUser ? (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>
              {claim.assignedUser.firstName} {claim.assignedUser.lastName}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground">Unassigned</span>
        ),
    },
    {
      key: "actions",
      title: "Actions",
      render: (claim) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/claims/${claim.id}`);
          }}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  // Status options
  const statusOptions = [
    { value: "all", label: "All Statuses" },
    { value: "new", label: "New" },
    { value: "pending", label: "Pending" },
    { value: "in_progress", label: "In Progress" },
    { value: "in_service", label: "In Service" },
    { value: "resolved", label: "Resolved" },
    { value: "closed", label: "Closed" },
  ];

  // Render pending pickup card
  const renderPendingCard = (pickup: PendingPickup) => (
    <Card key={pickup.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          {/* Left: Main Info */}
          <div className="flex-1 space-y-3">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{pickup.pickupNumber}</span>
                  {pickup.claim?.priority && getPriorityBadge(pickup.claim.priority)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {pickup.claim?.claimNumber}
                </div>
              </div>
            </div>

            {/* Product Info */}
            <div className="flex items-center gap-2 text-sm">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{pickup.warrantyCard?.product?.name || "N/A"}</span>
              <span className="text-muted-foreground">
                S/N: {pickup.warrantyCard?.serialNumber}
              </span>
            </div>

            {/* Shop/Customer Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              {pickup.fromShop && (
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-muted-foreground" />
                  <span>{pickup.fromShop.name}</span>
                </div>
              )}
              {pickup.warrantyCard?.customer && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{pickup.warrantyCard.customer.name}</span>
                </div>
              )}
              {pickup.warrantyCard?.customer?.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{pickup.warrantyCard.customer.phone}</span>
                </div>
              )}
            </div>

            {/* Issue Description */}
            {pickup.claim?.issueDescription && (
              <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                <span className="font-medium">Issue: </span>
                {pickup.claim.issueDescription}
              </div>
            )}

            {/* Received Info */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Received: {pickup.receivedAt ? format(new Date(pickup.receivedAt), "dd MMM yyyy HH:mm") : "-"}
              </div>
              {pickup.receiverName && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  By: {pickup.receiverName}
                </div>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex flex-row sm:flex-col gap-2">
            <Button
              size="sm"
              className="flex-1 sm:flex-none"
              onClick={() => setAcceptPickup(pickup)}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 sm:flex-none text-destructive hover:text-destructive"
              onClick={() => setRejectPickup(pickup)}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warranty Claims"
        description="Manage warranty claim requests"
        actions={
          <Button onClick={() => router.push("/claims/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Create Claim
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending-review" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending Review
            {pendingPickups.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {pendingPickups.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all-claims" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            All Claims
          </TabsTrigger>
        </TabsList>

        {/* Pending Review Tab */}
        <TabsContent value="pending-review" className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-amber-50 border border-amber-200 rounded-lg p-3">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span>
              These items have been picked up and are awaiting your review.
              Accept to create a warranty claim or reject to return the item.
            </span>
          </div>

          {loadingPending ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : pendingPickups.length === 0 ? (
            <div className="text-center py-12">
              <Truck className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2 text-muted-foreground">No pickups pending review</p>
              <p className="text-sm text-muted-foreground">
                Completed pickups will appear here for claim creation or rejection
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingPickups.map(renderPendingCard)}
            </div>
          )}
        </TabsContent>

        {/* All Claims Tab */}
        <TabsContent value="all-claims" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DataTable
            data={claims}
            columns={columns}
            searchKey="claimNumber"
            searchPlaceholder="Search by claim number, customer..."
            emptyMessage={loading ? "Loading..." : "No claims found"}
            emptyDescription="Get started by creating your first warranty claim."
          />
        </TabsContent>
      </Tabs>

      {/* Accept Confirmation Dialog */}
      <Dialog open={!!acceptPickup} onOpenChange={() => setAcceptPickup(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Accept & Create Claim</DialogTitle>
            <DialogDescription>
              Accept this pickup and move the claim to processing?
            </DialogDescription>
          </DialogHeader>
          {acceptPickup && (
            <div className="space-y-3 text-sm">
              <div className="bg-muted/50 p-3 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pickup:</span>
                  <span className="font-medium">{acceptPickup.pickupNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Product:</span>
                  <span>{acceptPickup.warrantyCard?.product?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Serial:</span>
                  <span className="font-mono">{acceptPickup.warrantyCard?.serialNumber}</span>
                </div>
                {acceptPickup.warrantyCard?.customer && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Customer:</span>
                    <span>{acceptPickup.warrantyCard.customer.name}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcceptPickup(null)}>
              Cancel
            </Button>
            <Button onClick={handleAccept} disabled={accepting}>
              {accepting ? "Accepting..." : "Accept & Process"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectPickup} onOpenChange={() => setRejectPickup(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Pickup</DialogTitle>
            <DialogDescription>
              Reject this item and schedule it for return delivery
            </DialogDescription>
          </DialogHeader>
          {rejectPickup && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-3 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pickup:</span>
                  <span className="font-medium">{rejectPickup.pickupNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Product:</span>
                  <span>{rejectPickup.warrantyCard?.product?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Serial:</span>
                  <span className="font-mono">{rejectPickup.warrantyCard?.serialNumber}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Rejection Reason *</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Why is this being rejected? (e.g., Not covered by warranty, Physical damage, etc.)"
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectPickup(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejecting || !rejectionReason}
            >
              {rejecting ? "Rejecting..." : "Reject & Return"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
