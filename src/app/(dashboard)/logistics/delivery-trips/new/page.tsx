"use client";

// ===========================================
// Create Delivery Trip Page
// ===========================================

import { useState, useEffect } from "react";
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
  X,
  UserCircle,
} from "lucide-react";

import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "sonner";
import { usePermissions } from "@/lib/hooks";

interface Claim {
  id: number;
  claimNumber: string;
  currentStatus: string;
  resolution: string | null;
  warrantyCard: {
    id: number;
    serialNumber: string;
    product: {
      id: number;
      name: string;
    };
    customer: {
      id: number;
      name: string;
      phone: string;
      address: string | null;
    } | null;
    shop: {
      id: number;
      name: string;
      address: string | null;
      phone: string | null;
    } | null;
  };
}

interface Collector {
  id: number;
  name: string;
  phone: string;
  vehicleNumber: string | null;
  vehicleType: string | null;
  status: string;
}

interface Shop {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  contactPerson: string | null;
}

export default function CreateDeliveryTripPage() {
  const router = useRouter();
  const { hasPermission } = usePermissions();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [collectors, setCollectors] = useState<Collector[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);

  // Form state
  const [toType, setToType] = useState<"SHOP" | "CUSTOMER">("SHOP");
  const [shopId, setShopId] = useState<number | null>(null);
  const [collectorId, setCollectorId] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledSlot, setScheduledSlot] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedClaimIds, setSelectedClaimIds] = useState<number[]>([]);

  const canCreateDelivery = hasPermission("logistics.create_delivery");

  useEffect(() => {
    // Get selected claim IDs from sessionStorage
    const storedIds = sessionStorage.getItem("deliveryClaimIds");
    if (storedIds) {
      const ids = JSON.parse(storedIds);
      setSelectedClaimIds(ids);
      fetchClaimsDetails(ids);
    } else {
      setLoading(false);
    }

    fetchCollectors();
    fetchShops();
  }, []);

  const fetchClaimsDetails = async (claimIds: number[]) => {
    try {
      // Fetch each claim's details
      const claimPromises = claimIds.map(async (id) => {
        const res = await fetch(`/api/claims/${id}`);
        const data = await res.json();
        return data.success ? data.data : null;
      });

      const claimsData = await Promise.all(claimPromises);
      const validClaims = claimsData.filter(Boolean) as Claim[];
      setClaims(validClaims);

      // Auto-detect destination type based on claims
      if (validClaims.length > 0) {
        const firstClaim = validClaims[0];
        if (firstClaim.warrantyCard.shop) {
          setToType("SHOP");
          setShopId(firstClaim.warrantyCard.shop.id);
        } else if (firstClaim.warrantyCard.customer) {
          setToType("CUSTOMER");
          setCustomerName(firstClaim.warrantyCard.customer.name);
          setCustomerPhone(firstClaim.warrantyCard.customer.phone);
          setCustomerAddress(firstClaim.warrantyCard.customer.address || "");
        }
      }
    } catch (error) {
      console.error("Error fetching claims:", error);
      toast.error("Failed to load claims");
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

  const fetchShops = async () => {
    try {
      const res = await fetch("/api/shops?status=ACTIVE&limit=100");
      const data = await res.json();
      if (data.success) {
        setShops(data.data);
      }
    } catch (error) {
      console.error("Error fetching shops:", error);
    }
  };

  const removeClaim = (claimId: number) => {
    setClaims((prev) => prev.filter((c) => c.id !== claimId));
    setSelectedClaimIds((prev) => prev.filter((id) => id !== claimId));
  };

  const handleSubmit = async () => {
    if (!canCreateDelivery) {
      toast.error("You don't have permission to create delivery trips");
      return;
    }

    if (claims.length === 0) {
      toast.error("Please add at least one claim to the delivery trip");
      return;
    }

    if (toType === "SHOP" && !shopId) {
      toast.error("Please select a destination shop");
      return;
    }

    if (toType === "CUSTOMER" && (!customerName || !customerPhone)) {
      toast.error("Please enter customer name and phone");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        toType,
        shopId: toType === "SHOP" ? shopId : null,
        customerName: toType === "CUSTOMER" ? customerName : null,
        customerPhone: toType === "CUSTOMER" ? customerPhone : null,
        customerAddress: toType === "CUSTOMER" ? customerAddress : null,
        collectorId,
        scheduledDate: scheduledDate || null,
        scheduledSlot: scheduledSlot || null,
        notes: notes || null,
        claimIds: claims.map((c) => c.id),
      };

      const res = await fetch("/api/logistics/delivery-trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        // Clear sessionStorage
        sessionStorage.removeItem("deliveryClaimIds");

        toast.success(`Trip ${data.data.tripNumber} created with ${claims.length} items`);

        router.push(`/logistics/delivery-trips/${data.data.id}`);
      } else {
        throw new Error(data.error?.message || "Failed to create delivery trip");
      }
    } catch (error) {
      console.error("Error creating delivery trip:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create delivery trip");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Delivery Trip"
        description="Create a new delivery trip for completed claims"
        actions={
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Destination Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Destination
            </CardTitle>
            <CardDescription>Where should these items be delivered?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Delivery To</Label>
              <Select
                value={toType}
                onValueChange={(v) => setToType(v as "SHOP" | "CUSTOMER")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SHOP">
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4" />
                      Shop
                    </div>
                  </SelectItem>
                  <SelectItem value="CUSTOMER">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Customer
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {toType === "SHOP" ? (
              <div className="space-y-2">
                <Label>Select Shop</Label>
                <Select
                  value={shopId?.toString() || ""}
                  onValueChange={(v) => setShopId(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination shop" />
                  </SelectTrigger>
                  <SelectContent>
                    {shops.map((shop) => (
                      <SelectItem key={shop.id} value={shop.id.toString()}>
                        {shop.name}
                        {shop.address && (
                          <span className="text-muted-foreground ml-2">
                            - {shop.address}
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {shopId && (
                  <div className="text-sm text-muted-foreground p-2 bg-muted rounded">
                    {(() => {
                      const shop = shops.find((s) => s.id === shopId);
                      return shop ? (
                        <>
                          <p>{shop.address}</p>
                          <p>{shop.phone}</p>
                          {shop.contactPerson && <p>Contact: {shop.contactPerson}</p>}
                        </>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Customer Name</Label>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter customer name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Customer Phone</Label>
                  <Input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Delivery Address</Label>
                  <Textarea
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="Enter delivery address"
                    rows={2}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assignment & Schedule Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircle className="h-5 w-5" />
              Assignment & Schedule
            </CardTitle>
            <CardDescription>Assign a collector and schedule the delivery</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Assign Collector (Optional)</Label>
              <Select
                value={collectorId?.toString() || "none"}
                onValueChange={(v) => setCollectorId(v === "none" ? null : parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select collector" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Assign Later</SelectItem>
                  {collectors.map((collector) => (
                    <SelectItem key={collector.id} value={collector.id.toString()}>
                      {collector.name}
                      {collector.vehicleNumber && (
                        <span className="text-muted-foreground ml-2">
                          ({collector.vehicleNumber})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Scheduled Date
                </Label>
                <Input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Time Slot
                </Label>
                <Select value={scheduledSlot} onValueChange={setScheduledSlot}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select slot" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MORNING">Morning (9AM-12PM)</SelectItem>
                    <SelectItem value="AFTERNOON">Afternoon (12PM-3PM)</SelectItem>
                    <SelectItem value="EVENING">Evening (3PM-6PM)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special instructions for delivery..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Delivery Items ({claims.length})
          </CardTitle>
          <CardDescription>Claims to be included in this delivery trip</CardDescription>
        </CardHeader>
        <CardContent>
          {claims.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No claims selected for delivery</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => router.push("/logistics/ready-for-delivery")}
              >
                Select Claims
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Claim #</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Serial</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Resolution</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {claims.map((claim) => (
                  <TableRow key={claim.id}>
                    <TableCell className="font-medium">{claim.claimNumber}</TableCell>
                    <TableCell>{claim.warrantyCard.product.name}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {claim.warrantyCard.serialNumber}
                    </TableCell>
                    <TableCell>
                      <Badge variant="success">{claim.currentStatus}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {claim.resolution || "-"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeClaim(claim.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-4">
        <Button
          variant="outline"
          onClick={() => {
            sessionStorage.removeItem("deliveryClaimIds");
            router.back();
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={submitting || claims.length === 0}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Truck className="h-4 w-4 mr-2" />
              Create Delivery Trip
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
