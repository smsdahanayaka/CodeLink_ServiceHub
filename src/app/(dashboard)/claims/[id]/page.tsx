"use client";

// ===========================================
// Claim Detail/View Page
// ===========================================

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  ClipboardList,
  Package,
  User,
  Store,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MapPin,
  UserPlus,
  MessageSquare,
  History,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Separator } from "@/components/ui/separator";
import { PageLoading, EmptyState } from "@/components/common";

interface ClaimDetail {
  id: number;
  claimNumber: string;
  issueDescription: string;
  issueCategory: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  currentStatus: string;
  currentLocation: string;
  reportedBy: string;
  diagnosis: string | null;
  resolution: string | null;
  partsUsed: string[] | null;
  repairCost: string;
  isWarrantyVoid: boolean;
  voidReason: string | null;
  receivedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  warrantyCard: {
    id: number;
    cardNumber: string;
    serialNumber: string;
    warrantyEndDate: string;
    product: {
      id: number;
      name: string;
      modelNumber: string | null;
      sku: string | null;
      category: { id: number; name: string } | null;
    };
    customer: {
      id: number;
      name: string;
      phone: string;
      email: string | null;
      address: string | null;
      city: string | null;
      state: string | null;
    };
    shop: {
      id: number;
      name: string;
      code: string | null;
      phone: string | null;
      address: string | null;
    };
  };
  assignedUser: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
  createdByUser: { id: number; firstName: string | null; lastName: string | null } | null;
  workflow: { id: number; name: string } | null;
  currentStep: { id: number; name: string; statusName: string } | null;
  claimHistory: Array<{
    id: number;
    fromStatus: string | null;
    toStatus: string;
    fromLocation: string | null;
    toLocation: string | null;
    actionType: string;
    notes: string | null;
    createdAt: string;
    performedUser: { id: number; firstName: string | null; lastName: string | null };
  }>;
}

interface User {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

export default function ClaimDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [claim, setClaim] = useState<ClaimDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);

  // Dialog states
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);

  // Form states
  const [newStatus, setNewStatus] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [statusNotes, setStatusNotes] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [assignNotes, setAssignNotes] = useState("");
  const [newNote, setNewNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch claim and users
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [claimRes, usersRes] = await Promise.all([
          fetch(`/api/claims/${id}`),
          fetch("/api/users?limit=100"),
        ]);

        const [claimData, usersData] = await Promise.all([
          claimRes.json(),
          usersRes.json(),
        ]);

        if (claimData.success) {
          setClaim(claimData.data);
        } else {
          toast.error("Claim not found");
          router.push("/claims");
        }

        if (usersData.success) {
          setUsers(usersData.data);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load claim");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, router]);

  // Get priority badge
  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, string> = {
      LOW: "bg-gray-100 text-gray-800",
      MEDIUM: "bg-blue-100 text-blue-800",
      HIGH: "bg-orange-100 text-orange-800",
      URGENT: "bg-red-100 text-red-800",
    };
    return <Badge className={variants[priority] || "bg-gray-100"}>{priority}</Badge>;
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (["new", "pending"].includes(statusLower)) {
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

  // Handle status update
  const handleStatusUpdate = async () => {
    if (!newStatus) {
      toast.error("Please select a status");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/claims/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          location: newLocation || undefined,
          notes: statusNotes || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Status updated");
        setStatusDialogOpen(false);
        // Refresh claim data
        const refreshRes = await fetch(`/api/claims/${id}`);
        const refreshData = await refreshRes.json();
        if (refreshData.success) setClaim(refreshData.data);
      } else {
        toast.error(data.error?.message || "Failed to update status");
      }
    } catch (error) {
      toast.error("Failed to update status");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle assignment
  const handleAssign = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/claims/${id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUserId ? parseInt(selectedUserId) : null,
          notes: assignNotes || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Claim assigned");
        setAssignDialogOpen(false);
        // Refresh
        const refreshRes = await fetch(`/api/claims/${id}`);
        const refreshData = await refreshRes.json();
        if (refreshData.success) setClaim(refreshData.data);
      } else {
        toast.error(data.error?.message || "Failed to assign");
      }
    } catch (error) {
      toast.error("Failed to assign claim");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle add note
  const handleAddNote = async () => {
    if (!newNote.trim()) {
      toast.error("Please enter a note");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/claims/${id}/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: newNote.trim() }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Note added");
        setNoteDialogOpen(false);
        setNewNote("");
        // Refresh
        const refreshRes = await fetch(`/api/claims/${id}`);
        const refreshData = await refreshRes.json();
        if (refreshData.success) setClaim(refreshData.data);
      } else {
        toast.error(data.error?.message || "Failed to add note");
      }
    } catch (error) {
      toast.error("Failed to add note");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageLoading />;
  if (!claim) {
    return (
      <EmptyState
        icon={<ClipboardList className="h-8 w-8 text-muted-foreground" />}
        title="Claim Not Found"
        description="The claim you're looking for doesn't exist."
        action={<Button onClick={() => router.push("/claims")}>Back to Claims</Button>}
      />
    );
  }

  // Status options
  const statusOptions = [
    "new",
    "pending",
    "in_progress",
    "received",
    "in_service",
    "waiting_parts",
    "repaired",
    "quality_check",
    "ready_for_delivery",
    "resolved",
    "closed",
    "rejected",
    "cancelled",
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Claim: ${claim.claimNumber}`}
        description={`Created ${format(new Date(claim.createdAt), "dd MMM yyyy, HH:mm")}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button variant="outline" onClick={() => setNoteDialogOpen(true)}>
              <MessageSquare className="mr-2 h-4 w-4" />
              Add Note
            </Button>
            <Button variant="outline" onClick={() => setAssignDialogOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Assign
            </Button>
            <Button onClick={() => setStatusDialogOpen(true)}>
              Update Status
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Claim Status Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Claim Status
                </CardTitle>
                <div className="flex items-center gap-2">
                  {getPriorityBadge(claim.priority)}
                  {getStatusBadge(claim.currentStatus)}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <Clock className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">{format(new Date(claim.createdAt), "dd MMM")}</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <MapPin className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{claim.currentLocation.replace("_", " ")}</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <User className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Assigned To</p>
                  <p className="font-medium">
                    {claim.assignedUser
                      ? `${claim.assignedUser.firstName} ${claim.assignedUser.lastName}`
                      : "Unassigned"}
                  </p>
                </div>
                <div className={`text-center p-4 rounded-lg ${claim.resolvedAt ? "bg-green-50" : "bg-yellow-50"}`}>
                  {claim.resolvedAt ? (
                    <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
                  )}
                  <p className="text-sm text-muted-foreground">
                    {claim.resolvedAt ? "Resolved" : "Pending"}
                  </p>
                  <p className="font-medium">
                    {claim.resolvedAt
                      ? format(new Date(claim.resolvedAt), "dd MMM")
                      : "In Progress"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Issue Details */}
          <Card>
            <CardHeader>
              <CardTitle>Issue Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="mt-1">{claim.issueDescription}</p>
              </div>
              {claim.issueCategory && (
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <Badge variant="outline" className="mt-1">{claim.issueCategory}</Badge>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Reported By</p>
                <p className="mt-1">{claim.reportedBy}</p>
              </div>
            </CardContent>
          </Card>

          {/* Diagnosis & Resolution */}
          {(claim.diagnosis || claim.resolution) && (
            <Card>
              <CardHeader>
                <CardTitle>Diagnosis & Resolution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {claim.diagnosis && (
                  <div>
                    <p className="text-sm text-muted-foreground">Diagnosis</p>
                    <p className="mt-1">{claim.diagnosis}</p>
                  </div>
                )}
                {claim.resolution && (
                  <div>
                    <p className="text-sm text-muted-foreground">Resolution</p>
                    <p className="mt-1">{claim.resolution}</p>
                  </div>
                )}
                {claim.repairCost && parseFloat(claim.repairCost) > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground">Repair Cost</p>
                    <p className="mt-1 font-medium">₹{parseFloat(claim.repairCost).toLocaleString()}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* History Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Activity History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {claim.claimHistory.map((entry, index) => (
                  <div key={entry.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      {index < claim.claimHistory.length - 1 && (
                        <div className="w-0.5 h-full bg-border mt-2" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">
                          {entry.actionType.replace(/_/g, " ")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(entry.createdAt), "dd MMM, HH:mm")}
                        </p>
                      </div>
                      {entry.fromStatus && entry.toStatus && entry.fromStatus !== entry.toStatus && (
                        <p className="text-sm text-muted-foreground">
                          {entry.fromStatus} → {entry.toStatus}
                        </p>
                      )}
                      {entry.notes && <p className="text-sm mt-1">{entry.notes}</p>}
                      <p className="text-xs text-muted-foreground mt-1">
                        by {entry.performedUser.firstName} {entry.performedUser.lastName}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Product Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Product
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-medium">{claim.warrantyCard.product.name}</p>
                {claim.warrantyCard.product.modelNumber && (
                  <p className="text-sm text-muted-foreground">
                    Model: {claim.warrantyCard.product.modelNumber}
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Serial Number</p>
                <p className="font-mono">{claim.warrantyCard.serialNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Warranty Card</p>
                <p className="font-mono">{claim.warrantyCard.cardNumber}</p>
              </div>
            </CardContent>
          </Card>

          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-medium">{claim.warrantyCard.customer.name}</p>
                <p className="text-sm text-muted-foreground">{claim.warrantyCard.customer.phone}</p>
              </div>
              {claim.warrantyCard.customer.email && (
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="text-sm">{claim.warrantyCard.customer.email}</p>
                </div>
              )}
              {claim.warrantyCard.customer.address && (
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="text-sm">
                    {claim.warrantyCard.customer.address}
                    {claim.warrantyCard.customer.city && `, ${claim.warrantyCard.customer.city}`}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Shop Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Shop
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-medium">{claim.warrantyCard.shop.name}</p>
                {claim.warrantyCard.shop.code && (
                  <p className="text-sm text-muted-foreground">{claim.warrantyCard.shop.code}</p>
                )}
              </div>
              {claim.warrantyCard.shop.phone && (
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="text-sm">{claim.warrantyCard.shop.phone}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Status Update Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Claim Status</DialogTitle>
            <DialogDescription>Change the status and location of this claim</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Select value={newLocation} onValueChange={setNewLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CUSTOMER">Customer</SelectItem>
                  <SelectItem value="SHOP">Shop</SelectItem>
                  <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                  <SelectItem value="SERVICE_CENTER">Service Center</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                placeholder="Add notes about this status change..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStatusUpdate} disabled={submitting}>
              {submitting ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Claim</DialogTitle>
            <DialogDescription>Assign this claim to a team member</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Assign To</Label>
              <Select value={selectedUserId || "unassigned"} onValueChange={(value) => setSelectedUserId(value === "unassigned" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.firstName} {user.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={assignNotes}
                onChange={(e) => setAssignNotes(e.target.value)}
                placeholder="Add notes about this assignment..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={submitting}>
              {submitting ? "Assigning..." : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Note Dialog */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
            <DialogDescription>Add a note to the claim history</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Note</Label>
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Enter your note..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddNote} disabled={submitting}>
              <Send className="mr-2 h-4 w-4" />
              {submitting ? "Adding..." : "Add Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
