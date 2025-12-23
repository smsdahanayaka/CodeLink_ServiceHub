"use client";

// ===========================================
// New Collection Trip Page - Collector View
// Mobile-friendly interface for starting a collection
// ===========================================

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Store,
  User,
  Search,
  Loader2,
  MapPin,
  Phone,
} from "lucide-react";

import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
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
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { usePermissions } from "@/lib/hooks";

interface Shop {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  contactPerson: string | null;
}

export default function NewCollectionPage() {
  const router = useRouter();
  const { hasPermission } = usePermissions();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [shops, setShops] = useState<Shop[]>([]);
  const [shopSearch, setShopSearch] = useState("");

  // Form state
  const [fromType, setFromType] = useState<"SHOP" | "CUSTOMER">("SHOP");
  const [shopId, setShopId] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [notes, setNotes] = useState("");

  const canCreate = hasPermission("logistics.create_collection") || hasPermission("logistics.collect");

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/shops?status=ACTIVE&limit=100");
      const data = await res.json();
      if (data.success) {
        setShops(data.data);
      }
    } catch (error) {
      console.error("Error fetching shops:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredShops = shops.filter((shop) => {
    if (!shopSearch) return true;
    const searchLower = shopSearch.toLowerCase();
    return (
      shop.name.toLowerCase().includes(searchLower) ||
      (shop.address || "").toLowerCase().includes(searchLower) ||
      (shop.phone || "").includes(searchLower)
    );
  });

  const handleSubmit = async () => {
    if (!canCreate) {
      toast.error("You don't have permission to create collection trips");
      return;
    }

    if (fromType === "SHOP" && !shopId) {
      toast.error("Please select a shop to collect from");
      return;
    }

    if (fromType === "CUSTOMER" && (!customerName || !customerPhone)) {
      toast.error("Please enter customer name and phone");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        fromType,
        shopId: fromType === "SHOP" ? shopId : null,
        customerName: fromType === "CUSTOMER" ? customerName : null,
        customerPhone: fromType === "CUSTOMER" ? customerPhone : null,
        customerAddress: fromType === "CUSTOMER" ? customerAddress : null,
        notes: notes || null,
      };

      const res = await fetch("/api/logistics/collection-trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(`Trip ${data.data.tripNumber} created`);
        router.push(`/logistics/collect/${data.data.id}`);
      } else {
        throw new Error(data.error?.message || "Failed to create collection trip");
      }
    } catch (error) {
      console.error("Error creating collection trip:", error);
      toast.error(error instanceof Error ? error.message : "Failed to start collection");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedShop = shops.find((s) => s.id === shopId);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Collection"
        description="Start a new collection trip"
        actions={
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        }
      />

      {/* Collection Type */}
      <Card>
        <CardHeader>
          <CardTitle>Collect From</CardTitle>
          <CardDescription>Where are you collecting items from?</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant={fromType === "SHOP" ? "default" : "outline"}
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => setFromType("SHOP")}
            >
              <Store className="h-6 w-6" />
              <span>Shop</span>
            </Button>
            <Button
              variant={fromType === "CUSTOMER" ? "default" : "outline"}
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => setFromType("CUSTOMER")}
            >
              <User className="h-6 w-6" />
              <span>Customer</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Shop Selection */}
      {fromType === "SHOP" && (
        <Card>
          <CardHeader>
            <CardTitle>Select Shop</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search shops..."
                className="pl-10"
                value={shopSearch}
                onChange={(e) => setShopSearch(e.target.value)}
              />
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2">
              {filteredShops.map((shop) => (
                <div
                  key={shop.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    shopId === shop.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-muted"
                  }`}
                  onClick={() => setShopId(shop.id)}
                >
                  <p className="font-medium">{shop.name}</p>
                  {shop.address && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {shop.address}
                    </p>
                  )}
                  {shop.phone && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {shop.phone}
                    </p>
                  )}
                </div>
              ))}
              {filteredShops.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No shops found
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customer Details */}
      {fromType === "CUSTOMER" && (
        <Card>
          <CardHeader>
            <CardTitle>Customer Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Customer Name *</Label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone Number *</Label>
              <Input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Enter phone number"
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="Enter collection address"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
          <CardDescription>Any additional notes for this collection</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes..."
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Summary & Submit */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Collecting from</p>
              <p className="font-medium">
                {fromType === "SHOP"
                  ? selectedShop?.name || "Select a shop"
                  : customerName || "Enter customer details"}
              </p>
            </div>

            <Button
              className="w-full h-12 text-lg"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                "Start Collection"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
