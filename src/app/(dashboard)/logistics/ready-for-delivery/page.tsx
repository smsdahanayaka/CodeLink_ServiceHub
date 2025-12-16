"use client";

// ===========================================
// Ready for Delivery Page
// Shows completed claims ready for delivery
// ===========================================

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  Truck,
  Search,
  CheckSquare,
  Square,
  Store,
  User,
  Filter,
} from "lucide-react";

import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { usePermissions } from "@/lib/hooks";

interface ReadyClaim {
  id: number;
  claimNumber: string;
  currentStatus: string;
  currentLocation: string;
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

interface Shop {
  id: number;
  name: string;
  _count: { claims: number };
}

export default function ReadyForDeliveryPage() {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const [claims, setClaims] = useState<ReadyClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [destinationFilter, setDestinationFilter] = useState<string>("all");
  const [selectedClaims, setSelectedClaims] = useState<number[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);

  const canCreateDelivery = hasPermission("logistics.create_delivery");

  useEffect(() => {
    fetchReadyClaims();
  }, []);

  const fetchReadyClaims = async () => {
    try {
      setLoading(true);
      // Fetch claims that are at SERVICE_CENTER and have completed status
      const params = new URLSearchParams();
      params.set("location", "SERVICE_CENTER");
      params.set("status", "COMPLETED,CLOSED");
      params.set("limit", "200");

      const res = await fetch(`/api/claims?${params}`);
      const data = await res.json();

      if (data.success) {
        // Filter claims that are ready for delivery (at service center, completed/closed)
        const readyClaims = data.data.filter(
          (claim: ReadyClaim) =>
            claim.currentLocation === "SERVICE_CENTER" &&
            ["COMPLETED", "CLOSED"].includes(claim.currentStatus)
        );
        setClaims(readyClaims);

        // Group by shop for stats
        const shopMap = new Map<number, Shop>();
        readyClaims.forEach((claim: ReadyClaim) => {
          if (claim.warrantyCard.shop) {
            const shop = claim.warrantyCard.shop;
            if (shopMap.has(shop.id)) {
              const existing = shopMap.get(shop.id)!;
              existing._count.claims++;
            } else {
              shopMap.set(shop.id, {
                id: shop.id,
                name: shop.name,
                _count: { claims: 1 },
              });
            }
          }
        });
        setShops(Array.from(shopMap.values()));
      }
    } catch (error) {
      console.error("Error fetching claims:", error);
      toast.error("Failed to fetch ready claims");
    } finally {
      setLoading(false);
    }
  };

  const filteredClaims = claims.filter((claim) => {
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        claim.claimNumber.toLowerCase().includes(searchLower) ||
        claim.warrantyCard.serialNumber.toLowerCase().includes(searchLower) ||
        claim.warrantyCard.product.name.toLowerCase().includes(searchLower) ||
        (claim.warrantyCard.customer?.name || "").toLowerCase().includes(searchLower) ||
        (claim.warrantyCard.shop?.name || "").toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Destination filter
    if (destinationFilter !== "all") {
      if (destinationFilter === "shop") {
        if (!claim.warrantyCard.shop) return false;
      } else if (destinationFilter === "customer") {
        if (!claim.warrantyCard.customer) return false;
      } else {
        // Shop ID filter
        const shopId = parseInt(destinationFilter);
        if (claim.warrantyCard.shop?.id !== shopId) return false;
      }
    }

    return true;
  });

  const toggleClaimSelection = (claimId: number) => {
    setSelectedClaims((prev) =>
      prev.includes(claimId)
        ? prev.filter((id) => id !== claimId)
        : [...prev, claimId]
    );
  };

  const toggleAllClaims = () => {
    if (selectedClaims.length === filteredClaims.length) {
      setSelectedClaims([]);
    } else {
      setSelectedClaims(filteredClaims.map((c) => c.id));
    }
  };

  const selectByShop = (shopId: number) => {
    const shopClaims = filteredClaims
      .filter((c) => c.warrantyCard.shop?.id === shopId)
      .map((c) => c.id);
    setSelectedClaims(shopClaims);
  };

  const handleCreateDeliveryTrip = () => {
    if (selectedClaims.length === 0) {
      toast.error("Please select at least one claim for delivery");
      return;
    }

    // Store selected claims in sessionStorage and navigate to create page
    sessionStorage.setItem("deliveryClaimIds", JSON.stringify(selectedClaims));
    router.push("/logistics/delivery-trips/new");
  };

  const getDestinationInfo = (claim: ReadyClaim) => {
    if (claim.warrantyCard.shop) {
      return {
        type: "SHOP",
        name: claim.warrantyCard.shop.name,
        icon: Store,
      };
    }
    if (claim.warrantyCard.customer) {
      return {
        type: "CUSTOMER",
        name: claim.warrantyCard.customer.name,
        icon: User,
      };
    }
    return { type: "UNKNOWN", name: "Unknown", icon: Package };
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ready for Delivery"
        description="Select completed claims to create delivery trips"
        actions={
          canCreateDelivery && selectedClaims.length > 0 ? (
            <Button onClick={handleCreateDeliveryTrip}>
              <Truck className="h-4 w-4 mr-2" />
              Create Delivery Trip ({selectedClaims.length})
            </Button>
          ) : null
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Ready</CardDescription>
            <CardTitle className="text-2xl">{claims.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Selected</CardDescription>
            <CardTitle className="text-2xl">{selectedClaims.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <CheckSquare className="h-4 w-4 text-primary" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Shops</CardDescription>
            <CardTitle className="text-2xl">{shops.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Direct to Customer</CardDescription>
            <CardTitle className="text-2xl">
              {claims.filter((c) => !c.warrantyCard.shop && c.warrantyCard.customer).length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      {/* Quick Select by Shop */}
      {shops.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Select by Shop</CardTitle>
            <CardDescription>Click a shop to select all its claims</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {shops.map((shop) => (
                <Button
                  key={shop.id}
                  variant="outline"
                  size="sm"
                  onClick={() => selectByShop(shop.id)}
                >
                  <Store className="h-3 w-3 mr-1" />
                  {shop.name} ({shop._count.claims})
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by claim, serial, product, customer..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={destinationFilter} onValueChange={setDestinationFilter}>
          <SelectTrigger className="w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter destination" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Destinations</SelectItem>
            <SelectItem value="shop">Shops Only</SelectItem>
            <SelectItem value="customer">Customers Only</SelectItem>
            {shops.map((shop) => (
              <SelectItem key={shop.id} value={shop.id.toString()}>
                {shop.name} ({shop._count.claims})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Claims Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={
                      filteredClaims.length > 0 &&
                      selectedClaims.length === filteredClaims.length
                    }
                    onCheckedChange={toggleAllClaims}
                  />
                </TableHead>
                <TableHead>Claim #</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Serial</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Resolution</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : filteredClaims.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {claims.length === 0
                      ? "No claims ready for delivery"
                      : "No claims match your filters"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredClaims.map((claim) => {
                  const destination = getDestinationInfo(claim);
                  const DestIcon = destination.icon;
                  const isSelected = selectedClaims.includes(claim.id);

                  return (
                    <TableRow
                      key={claim.id}
                      className={isSelected ? "bg-muted/50" : ""}
                      onClick={() => toggleClaimSelection(claim.id)}
                      style={{ cursor: "pointer" }}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleClaimSelection(claim.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{claim.claimNumber}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{claim.warrantyCard.product.name}</p>
                          {claim.warrantyCard.product.modelNumber && (
                            <p className="text-sm text-muted-foreground">
                              {claim.warrantyCard.product.modelNumber}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {claim.warrantyCard.serialNumber}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <DestIcon className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{destination.name}</p>
                            <Badge variant="outline" className="text-xs">
                              {destination.type}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="success">{claim.currentStatus}</Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-muted-foreground truncate max-w-[150px]">
                          {claim.resolution || "-"}
                        </p>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
