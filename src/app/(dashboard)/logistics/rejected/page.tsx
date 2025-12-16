"use client";

// ===========================================
// Rejected Pickups Page
// Shows rejected items ready for return delivery
// ===========================================

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  Truck,
  Search,
  Store,
  User,
  Phone,
  Calendar,
  XCircle,
  MapPin,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface RejectedPickup {
  id: number;
  pickupNumber: string;
  status: string;
  fromType: string;
  rejectedAt: string | null;
  rejectionReason: string | null;
  notes: string | null;
  createdAt: string;
  claim: {
    id: number;
    claimNumber: string;
    currentStatus: string;
    issueDescription: string;
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

interface Collector {
  id: number;
  name: string;
  phone: string;
  status: string;
}

export default function RejectedPickupsPage() {
  const router = useRouter();
  const [rejectedPickups, setRejectedPickups] = useState<RejectedPickup[]>([]);
  const [collectors, setCollectors] = useState<Collector[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedPickups, setSelectedPickups] = useState<number[]>([]);

  // Create delivery dialog
  const [showDeliveryDialog, setShowDeliveryDialog] = useState(false);
  const [deliveryCollectorId, setDeliveryCollectorId] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [creating, setCreating] = useState(false);

  // Fetch rejected pickups
  const fetchRejectedPickups = async () => {
    try {
      const res = await fetch("/api/logistics/pickups/rejected");
      const data = await res.json();
      if (data.success) {
        setRejectedPickups(data.data);
      }
    } catch (error) {
      console.error("Error fetching rejected pickups:", error);
      toast.error("Failed to load rejected pickups");
    } finally {
      setLoading(false);
    }
  };

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

  useEffect(() => {
    fetchRejectedPickups();
    fetchCollectors();
  }, []);

  // Filter pickups
  const filteredPickups = rejectedPickups.filter((pickup) => {
    if (!search) return true;
    const query = search.toLowerCase();
    return (
      pickup.pickupNumber?.toLowerCase().includes(query) ||
      pickup.warrantyCard?.serialNumber?.toLowerCase().includes(query) ||
      pickup.warrantyCard?.product?.name?.toLowerCase().includes(query) ||
      pickup.warrantyCard?.customer?.name?.toLowerCase().includes(query) ||
      pickup.fromShop?.name?.toLowerCase().includes(query)
    );
  });

  // Toggle selection
  const toggleSelection = (id: number) => {
    setSelectedPickups((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  // Select all
  const toggleSelectAll = () => {
    if (selectedPickups.length === filteredPickups.length) {
      setSelectedPickups([]);
    } else {
      setSelectedPickups(filteredPickups.map((p) => p.id));
    }
  };

  // Create return deliveries for selected pickups
  const handleCreateDeliveries = async () => {
    if (selectedPickups.length === 0) return;

    setCreating(true);
    try {
      // Create deliveries for each selected pickup
      const promises = selectedPickups.map((pickupId) => {
        const pickup = rejectedPickups.find((p) => p.id === pickupId);
        if (!pickup) return Promise.resolve();

        return fetch("/api/logistics/deliveries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            claimId: pickup.claim?.id,
            collectorId: deliveryCollectorId ? parseInt(deliveryCollectorId) : undefined,
            toType: pickup.fromType === "SHOP" ? "SHOP" : "CUSTOMER",
            toShopId: pickup.fromShop?.id,
            toAddress: pickup.fromType === "CUSTOMER" ? pickup.warrantyCard?.customer?.address : undefined,
            scheduledDate: scheduledDate || undefined,
            notes: deliveryNotes || `Return delivery for rejected pickup ${pickup.pickupNumber}. Reason: ${pickup.rejectionReason}`,
            deliveryType: "REJECTED_RETURN",
          }),
        });
      });

      await Promise.all(promises);
      toast.success(`Created ${selectedPickups.length} return delivery(s)`);
      setShowDeliveryDialog(false);
      setSelectedPickups([]);
      setDeliveryCollectorId("");
      setDeliveryNotes("");
      setScheduledDate("");
      fetchRejectedPickups();
    } catch (error) {
      console.error("Error creating deliveries:", error);
      toast.error("Failed to create deliveries");
    } finally {
      setCreating(false);
    }
  };

  // Render pickup card
  const renderPickupCard = (pickup: RejectedPickup) => (
    <Card
      key={pickup.id}
      className={`hover:shadow-md transition-shadow ${
        selectedPickups.includes(pickup.id) ? "ring-2 ring-primary" : ""
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Checkbox */}
          <Checkbox
            checked={selectedPickups.includes(pickup.id)}
            onCheckedChange={() => toggleSelection(pickup.id)}
            className="mt-1"
          />

          {/* Main Content */}
          <div className="flex-1 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <div className="font-medium">{pickup.pickupNumber}</div>
                  <div className="text-sm text-muted-foreground">
                    {pickup.claim?.claimNumber}
                  </div>
                </div>
              </div>
              <Badge variant="destructive">Rejected</Badge>
            </div>

            {/* Product Info */}
            <div className="flex items-center gap-2 text-sm">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {pickup.warrantyCard?.product?.name || "N/A"}
              </span>
              <span className="text-muted-foreground">
                S/N: {pickup.warrantyCard?.serialNumber}
              </span>
            </div>

            {/* Rejection Reason */}
            {pickup.rejectionReason && (
              <div className="bg-red-50 border border-red-200 rounded p-2 text-sm">
                <div className="flex items-center gap-2 text-red-700 font-medium">
                  <AlertTriangle className="h-4 w-4" />
                  Rejection Reason:
                </div>
                <p className="text-red-600 mt-1">{pickup.rejectionReason}</p>
              </div>
            )}

            {/* Destination Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              {pickup.fromShop && (
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-muted-foreground" />
                  <span>Return to: {pickup.fromShop.name}</span>
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
              {(pickup.fromShop?.address || pickup.warrantyCard?.customer?.address) && (
                <div className="flex items-center gap-2 col-span-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {pickup.fromShop?.address || pickup.warrantyCard?.customer?.address}
                  </span>
                </div>
              )}
            </div>

            {/* Rejected Date */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              Rejected: {pickup.rejectedAt ? format(new Date(pickup.rejectedAt), "dd MMM yyyy HH:mm") : "-"}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rejected Items"
        description="Items rejected during review - ready for return delivery"
        actions={
          selectedPickups.length > 0 && (
            <Button onClick={() => setShowDeliveryDialog(true)}>
              <Truck className="mr-2 h-4 w-4" />
              Create Return Delivery ({selectedPickups.length})
            </Button>
          )
        }
      />

      {/* Info Banner */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-red-50 border border-red-200 rounded-lg p-3">
        <XCircle className="h-4 w-4 text-red-600" />
        <span>
          These items were rejected after inspection and need to be returned to the shop/customer.
          Select items and create a return delivery.
        </span>
      </div>

      {/* Search and Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by pickup number, product, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        {filteredPickups.length > 0 && (
          <Button variant="outline" onClick={toggleSelectAll}>
            {selectedPickups.length === filteredPickups.length
              ? "Deselect All"
              : "Select All"}
          </Button>
        )}
      </div>

      {/* Pickups List */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : filteredPickups.length === 0 ? (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-2 text-muted-foreground">No rejected items</p>
          <p className="text-sm text-muted-foreground">
            Rejected pickups will appear here for return delivery scheduling
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPickups.map(renderPickupCard)}
        </div>
      )}

      {/* Create Return Delivery Dialog */}
      <Dialog open={showDeliveryDialog} onOpenChange={setShowDeliveryDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Return Delivery</DialogTitle>
            <DialogDescription>
              Schedule return delivery for {selectedPickups.length} rejected item(s)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Assign Collector (Optional)</Label>
              <Select
                value={deliveryCollectorId}
                onValueChange={setDeliveryCollectorId}
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
              <Label>Scheduled Date (Optional)</Label>
              <Input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder="Additional notes for delivery..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeliveryDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateDeliveries} disabled={creating}>
              {creating ? "Creating..." : "Create Deliveries"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
