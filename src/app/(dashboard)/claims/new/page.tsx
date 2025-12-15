"use client";

// ===========================================
// Create New Warranty Claim Page
// ===========================================

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Save, Search, FileCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface WarrantyCard {
  id: number;
  cardNumber: string;
  serialNumber: string;
  warrantyEndDate: string;
  status: string;
  warrantyStatus?: string;
  daysRemaining?: number;
  isUnderWarranty?: boolean;
  product: {
    id: number;
    name: string;
    modelNumber: string | null;
  };
  customer: {
    id: number;
    name: string;
    phone: string;
  };
  shop: {
    id: number;
    name: string;
  };
  _count: { warrantyClaims: number };
}

export default function NewClaimPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedCardId = searchParams.get("warrantyCardId");

  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<WarrantyCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<WarrantyCard | null>(null);

  const [formData, setFormData] = useState({
    issueDescription: "",
    issueCategory: "",
    priority: "MEDIUM",
    reportedBy: "SHOP",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch pre-selected warranty card
  useEffect(() => {
    if (preSelectedCardId) {
      const fetchCard = async () => {
        try {
          const res = await fetch(`/api/warranty-cards/${preSelectedCardId}`);
          const data = await res.json();
          if (data.success) {
            // Calculate warranty status
            const card = data.data;
            const now = new Date();
            const endDate = new Date(card.warrantyEndDate);
            const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            const isExpired = daysRemaining < 0;

            setSelectedCard({
              ...card,
              warrantyStatus: card.status === "VOID" ? "VOID" : isExpired ? "EXPIRED" : "ACTIVE",
              daysRemaining: isExpired ? 0 : daysRemaining,
              isUnderWarranty: !isExpired && card.status !== "VOID",
            });
          }
        } catch (error) {
          console.error("Error fetching warranty card:", error);
        }
      };
      fetchCard();
    }
  }, [preSelectedCardId]);

  // Handle search
  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 3) {
      toast.error("Please enter at least 3 characters to search");
      return;
    }

    setSearching(true);
    setSearchResults([]);

    try {
      const res = await fetch("/api/warranty-cards/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery.trim() }),
      });

      const data = await res.json();

      if (data.success && data.data.found) {
        setSearchResults(data.data.cards);
      } else {
        toast.info("No warranty card found");
      }
    } catch (error) {
      console.error("Error searching:", error);
      toast.error("Search failed");
    } finally {
      setSearching(false);
    }
  };

  // Handle input change
  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  // Validate form
  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!selectedCard) newErrors.warrantyCard = "Please select a warranty card";
    if (!formData.issueDescription.trim())
      newErrors.issueDescription = "Please describe the issue";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // Check warranty validity
    if (!selectedCard?.isUnderWarranty) {
      toast.error("Cannot create claim for expired or void warranty");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warrantyCardId: selectedCard!.id,
          issueDescription: formData.issueDescription.trim(),
          issueCategory: formData.issueCategory || undefined,
          priority: formData.priority,
          reportedBy: formData.reportedBy,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Claim created successfully");
        router.push(`/claims/${data.data.id}`);
      } else {
        toast.error(data.error?.message || "Failed to create claim");
      }
    } catch (error) {
      console.error("Error creating claim:", error);
      toast.error("Failed to create claim");
    } finally {
      setLoading(false);
    }
  };

  // Issue categories
  const issueCategories = [
    "Hardware Defect",
    "Software Issue",
    "Physical Damage",
    "Electrical Issue",
    "Performance Issue",
    "Display Problem",
    "Battery Issue",
    "Connectivity Issue",
    "Other",
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Warranty Claim"
        description="File a new warranty claim for a registered product"
        actions={
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        }
      />

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Warranty Card Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5" />
                  Select Warranty Card
                </CardTitle>
                <CardDescription>
                  Search by card number, serial number, or customer phone
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!selectedCard ? (
                  <>
                    <div className="flex gap-2">
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Enter card number, serial, or phone..."
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSearch())}
                      />
                      <Button type="button" onClick={handleSearch} disabled={searching}>
                        <Search className="mr-2 h-4 w-4" />
                        {searching ? "Searching..." : "Search"}
                      </Button>
                    </div>
                    {errors.warrantyCard && (
                      <p className="text-sm text-destructive">{errors.warrantyCard}</p>
                    )}

                    {/* Search Results */}
                    {searchResults.length > 0 && (
                      <div className="space-y-2 mt-4">
                        <Label>Select a warranty card:</Label>
                        {searchResults.map((card) => (
                          <div
                            key={card.id}
                            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                              card.isUnderWarranty
                                ? "hover:border-primary hover:bg-primary/5"
                                : "opacity-50 cursor-not-allowed"
                            }`}
                            onClick={() => card.isUnderWarranty && setSelectedCard(card)}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-mono font-medium">{card.cardNumber}</p>
                                <p className="text-sm text-muted-foreground">
                                  {card.product.name} - S/N: {card.serialNumber}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {card.customer.name} ({card.customer.phone})
                                </p>
                              </div>
                              <div className="text-right">
                                <Badge
                                  variant={card.isUnderWarranty ? "default" : "destructive"}
                                  className={card.isUnderWarranty ? "bg-green-100 text-green-800" : ""}
                                >
                                  {card.warrantyStatus}
                                </Badge>
                                {card.isUnderWarranty && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {card.daysRemaining} days left
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-4 border rounded-lg bg-primary/5 border-primary">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-mono font-medium">{selectedCard.cardNumber}</p>
                        <p className="text-sm">{selectedCard.product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          S/N: {selectedCard.serialNumber}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Customer: {selectedCard.customer.name}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedCard(null);
                          setSearchResults([]);
                        }}
                      >
                        Change
                      </Button>
                    </div>
                    {selectedCard._count && selectedCard._count.warrantyClaims > 0 && (
                      <div className="mt-2 flex items-center gap-2 text-yellow-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm">
                          This warranty has {selectedCard._count.warrantyClaims} existing claim(s)
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Issue Details */}
            <Card>
              <CardHeader>
                <CardTitle>Issue Details</CardTitle>
                <CardDescription>Describe the issue with the product</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="issueCategory">Issue Category</Label>
                    <Select
                      value={formData.issueCategory}
                      onValueChange={(value) => handleChange("issueCategory", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {issueCategories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority *</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) => handleChange("priority", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="URGENT">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="issueDescription">Issue Description *</Label>
                  <Textarea
                    id="issueDescription"
                    value={formData.issueDescription}
                    onChange={(e) => handleChange("issueDescription", e.target.value)}
                    placeholder="Describe the issue in detail..."
                    rows={4}
                  />
                  {errors.issueDescription && (
                    <p className="text-sm text-destructive">{errors.issueDescription}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reportedBy">Reported By</Label>
                  <Select
                    value={formData.reportedBy}
                    onValueChange={(value) => handleChange("reportedBy", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CUSTOMER">Customer</SelectItem>
                      <SelectItem value="SHOP">Shop/Dealer</SelectItem>
                      <SelectItem value="INTERNAL">Internal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Warranty Summary */}
            {selectedCard && (
              <Card>
                <CardHeader>
                  <CardTitle>Warranty Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Product</p>
                    <p className="font-medium">{selectedCard.product.name}</p>
                    {selectedCard.product.modelNumber && (
                      <p className="text-sm text-muted-foreground">
                        Model: {selectedCard.product.modelNumber}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Customer</p>
                    <p className="font-medium">{selectedCard.customer.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedCard.customer.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Shop</p>
                    <p className="font-medium">{selectedCard.shop.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Warranty Until</p>
                    <p className="font-medium">
                      {format(new Date(selectedCard.warrantyEndDate), "dd MMM yyyy")}
                    </p>
                    {selectedCard.isUnderWarranty && (
                      <p className="text-sm text-green-600">
                        {selectedCard.daysRemaining} days remaining
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Submit Button */}
            <div className="flex flex-col gap-2">
              <Button
                type="submit"
                disabled={loading || !selectedCard?.isUnderWarranty}
                className="w-full"
              >
                <Save className="mr-2 h-4 w-4" />
                {loading ? "Creating..." : "Create Claim"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
