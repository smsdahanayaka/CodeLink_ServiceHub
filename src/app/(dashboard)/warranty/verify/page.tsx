"use client";

// ===========================================
// Warranty Verification Page
// ===========================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Search,
  FileCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Package,
  User,
  Store,
  Calendar,
  Phone,
  Eye,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface VerifiedCard {
  id: number;
  cardNumber: string;
  serialNumber: string;
  purchaseDate: string;
  warrantyStartDate: string;
  warrantyEndDate: string;
  status: string;
  warrantyStatus: "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "VOID";
  daysRemaining: number;
  isUnderWarranty: boolean;
  product: {
    id: number;
    name: string;
    modelNumber: string | null;
    warrantyPeriodMonths: number;
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
  };
  _count: { warrantyClaims: number };
}

interface VerificationResult {
  found: boolean;
  count?: number;
  message?: string;
  cards: VerifiedCard[];
}

export default function WarrantyVerifyPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState("auto");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);

  // Handle search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!searchQuery.trim() || searchQuery.trim().length < 3) {
      toast.error("Please enter at least 3 characters to search");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/warranty-cards/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery.trim(),
          type: searchType,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setResult(data.data);
        if (!data.data.found) {
          toast.info("No warranty card found matching your search");
        }
      } else {
        toast.error(data.error?.message || "Verification failed");
      }
    } catch (error) {
      console.error("Error verifying warranty:", error);
      toast.error("Failed to verify warranty");
    } finally {
      setLoading(false);
    }
  };

  // Get status badge
  const getStatusBadge = (card: VerifiedCard) => {
    switch (card.warrantyStatus) {
      case "ACTIVE":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="mr-1 h-3 w-3" />
            ACTIVE
          </Badge>
        );
      case "EXPIRING_SOON":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <AlertTriangle className="mr-1 h-3 w-3" />
            EXPIRING SOON
          </Badge>
        );
      case "EXPIRED":
        return (
          <Badge variant="secondary">
            <XCircle className="mr-1 h-3 w-3" />
            EXPIRED
          </Badge>
        );
      case "VOID":
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            VOID
          </Badge>
        );
      default:
        return <Badge>{card.warrantyStatus}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Verify Warranty"
        description="Check warranty status by card number, serial number, or customer phone"
        actions={
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        }
      />

      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Warranty Card
          </CardTitle>
          <CardDescription>
            Enter card number, serial number, or customer phone to verify warranty status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="searchQuery">Search Query</Label>
              <Input
                id="searchQuery"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter card number, serial number, or phone..."
                className="text-lg"
              />
            </div>
            <div className="w-full md:w-48 space-y-2">
              <Label htmlFor="searchType">Search In</Label>
              <Select value={searchType} onValueChange={setSearchType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto Detect</SelectItem>
                  <SelectItem value="cardNumber">Card Number</SelectItem>
                  <SelectItem value="serialNumber">Serial Number</SelectItem>
                  <SelectItem value="phone">Customer Phone</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={loading} className="w-full md:w-auto">
                <Search className="mr-2 h-4 w-4" />
                {loading ? "Searching..." : "Verify"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {result.found ? (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  Found {result.count} warranty card{result.count !== 1 ? "s" : ""}
                </h2>
              </div>

              {result.cards.map((card) => (
                <Card key={card.id} className={card.isUnderWarranty ? "border-green-200" : "border-red-200"}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-full ${card.isUnderWarranty ? "bg-green-100" : "bg-red-100"}`}>
                          {card.isUnderWarranty ? (
                            <CheckCircle className={`h-8 w-8 ${card.warrantyStatus === "EXPIRING_SOON" ? "text-yellow-600" : "text-green-600"}`} />
                          ) : (
                            <XCircle className="h-8 w-8 text-red-600" />
                          )}
                        </div>
                        <div>
                          <CardTitle className="font-mono">{card.cardNumber}</CardTitle>
                          <CardDescription>Serial: {card.serialNumber}</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(card)}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/warranty/${card.id}`)}
                        >
                          <Eye className="mr-1 h-4 w-4" />
                          View
                        </Button>
                        {card.isUnderWarranty && (
                          <Button
                            size="sm"
                            onClick={() => router.push(`/claims/new?warrantyCardId=${card.id}`)}
                          >
                            <Plus className="mr-1 h-4 w-4" />
                            Create Claim
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      {/* Product Info */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Package className="h-4 w-4" />
                          Product
                        </div>
                        <div>
                          <p className="font-medium">{card.product.name}</p>
                          {card.product.modelNumber && (
                            <p className="text-sm text-muted-foreground">{card.product.modelNumber}</p>
                          )}
                          {card.product.category && (
                            <Badge variant="secondary" className="mt-1">{card.product.category.name}</Badge>
                          )}
                        </div>
                      </div>

                      {/* Customer Info */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="h-4 w-4" />
                          Customer
                        </div>
                        <div>
                          <p className="font-medium">{card.customer.name}</p>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {card.customer.phone}
                          </div>
                        </div>
                      </div>

                      {/* Shop Info */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Store className="h-4 w-4" />
                          Purchase Location
                        </div>
                        <div>
                          <p className="font-medium">{card.shop.name}</p>
                          {card.shop.code && (
                            <p className="text-sm text-muted-foreground">{card.shop.code}</p>
                          )}
                        </div>
                      </div>

                      {/* Warranty Info */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          Warranty Period
                        </div>
                        <div>
                          <p className="text-sm">
                            {format(new Date(card.warrantyStartDate), "dd MMM yyyy")} -{" "}
                            {format(new Date(card.warrantyEndDate), "dd MMM yyyy")}
                          </p>
                          <p className={`font-medium ${card.isUnderWarranty ? (card.warrantyStatus === "EXPIRING_SOON" ? "text-yellow-600" : "text-green-600") : "text-red-600"}`}>
                            {card.isUnderWarranty
                              ? `${card.daysRemaining} days remaining`
                              : "Warranty expired"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Existing Claims */}
                    {card._count.warrantyClaims > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm text-muted-foreground">
                          This warranty has{" "}
                          <span className="font-medium text-foreground">
                            {card._count.warrantyClaims} existing claim{card._count.warrantyClaims !== 1 ? "s" : ""}
                          </span>
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <FileCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Warranty Found</h3>
                  <p className="text-muted-foreground mb-4">
                    {result.message || "No warranty card matches your search criteria"}
                  </p>
                  <Button onClick={() => router.push("/warranty/new")}>
                    <Plus className="mr-2 h-4 w-4" />
                    Register New Warranty
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Initial State */}
      {!result && !loading && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Search for Warranty</h3>
              <p className="text-muted-foreground">
                Enter a card number, serial number, or customer phone number to verify warranty status
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
