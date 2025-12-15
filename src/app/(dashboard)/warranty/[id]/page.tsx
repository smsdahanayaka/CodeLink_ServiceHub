"use client";

// ===========================================
// Warranty Card Detail/View Page
// ===========================================

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  FileCheck,
  Package,
  User,
  Store,
  Calendar,
  Receipt,
  AlertTriangle,
  CheckCircle,
  Clock,
  ClipboardList,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageLoading, EmptyState } from "@/components/common";

interface WarrantyCardDetail {
  id: number;
  cardNumber: string;
  serialNumber: string;
  purchaseDate: string;
  warrantyStartDate: string;
  warrantyEndDate: string;
  invoiceNumber: string | null;
  invoiceAmount: string | null;
  extendedWarrantyMonths: number;
  status: "ACTIVE" | "EXPIRED" | "VOID" | "CLAIMED";
  notes: string | null;
  createdAt: string;
  product: {
    id: number;
    name: string;
    modelNumber: string | null;
    sku: string | null;
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
    address: string | null;
  };
  createdByUser: { id: number; firstName: string | null; lastName: string | null } | null;
  warrantyClaims: Array<{
    id: number;
    claimNumber: string;
    currentStatus: string;
    priority: string;
    createdAt: string;
  }>;
}

export default function WarrantyCardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [card, setCard] = useState<WarrantyCardDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCard = async () => {
      try {
        const res = await fetch(`/api/warranty-cards/${id}`);
        const data = await res.json();
        if (data.success) {
          setCard(data.data);
        } else {
          toast.error(data.error?.message || "Failed to load warranty card");
        }
      } catch (error) {
        console.error("Error fetching warranty card:", error);
        toast.error("Failed to load warranty card");
      } finally {
        setLoading(false);
      }
    };
    fetchCard();
  }, [id]);

  if (loading) {
    return <PageLoading />;
  }

  if (!card) {
    return (
      <EmptyState
        icon={<FileCheck className="h-8 w-8 text-muted-foreground" />}
        title="Warranty Card Not Found"
        description="The warranty card you're looking for doesn't exist."
        action={
          <Button onClick={() => router.push("/warranty")}>
            Back to Warranty Cards
          </Button>
        }
      />
    );
  }

  // Calculate warranty status
  const now = new Date();
  const endDate = new Date(card.warrantyEndDate);
  const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isExpired = daysRemaining < 0;
  const isExpiringSoon = !isExpired && daysRemaining <= 30;

  const getStatusBadge = () => {
    if (card.status === "VOID") {
      return <Badge variant="destructive">VOID</Badge>;
    }
    if (isExpired) {
      return <Badge variant="secondary">EXPIRED</Badge>;
    }
    if (isExpiringSoon) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">EXPIRING SOON</Badge>;
    }
    return <Badge variant="default" className="bg-green-100 text-green-800">ACTIVE</Badge>;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Warranty Card: ${card.cardNumber}`}
        description={`Serial Number: ${card.serialNumber}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button variant="outline" onClick={() => router.push(`/warranty/${id}/edit`)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button onClick={() => router.push(`/claims/new?warrantyCardId=${id}`)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Claim
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Warranty Status Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5" />
                  Warranty Status
                </CardTitle>
                {getStatusBadge()}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <Calendar className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p className="font-medium">{format(new Date(card.warrantyStartDate), "dd MMM yyyy")}</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <Calendar className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">End Date</p>
                  <p className="font-medium">{format(new Date(card.warrantyEndDate), "dd MMM yyyy")}</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <Clock className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Total Period</p>
                  <p className="font-medium">{card.product.warrantyPeriodMonths} months</p>
                </div>
                <div className={`text-center p-4 rounded-lg ${isExpired ? "bg-red-50" : isExpiringSoon ? "bg-yellow-50" : "bg-green-50"}`}>
                  {isExpired ? (
                    <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-red-500" />
                  ) : (
                    <CheckCircle className={`h-6 w-6 mx-auto mb-2 ${isExpiringSoon ? "text-yellow-500" : "text-green-500"}`} />
                  )}
                  <p className="text-sm text-muted-foreground">
                    {isExpired ? "Expired" : "Days Remaining"}
                  </p>
                  <p className={`font-medium ${isExpired ? "text-red-600" : isExpiringSoon ? "text-yellow-600" : "text-green-600"}`}>
                    {isExpired ? `${Math.abs(daysRemaining)} days ago` : `${daysRemaining} days`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Product Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Product Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Product Name</p>
                  <p className="font-medium">{card.product.name}</p>
                </div>
                {card.product.modelNumber && (
                  <div>
                    <p className="text-sm text-muted-foreground">Model Number</p>
                    <p className="font-medium">{card.product.modelNumber}</p>
                  </div>
                )}
                {card.product.sku && (
                  <div>
                    <p className="text-sm text-muted-foreground">SKU</p>
                    <p className="font-medium">{card.product.sku}</p>
                  </div>
                )}
                {card.product.category && (
                  <div>
                    <p className="text-sm text-muted-foreground">Category</p>
                    <Badge variant="secondary">{card.product.category.name}</Badge>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Serial Number</p>
                  <p className="font-medium font-mono">{card.serialNumber}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{card.customer.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{card.customer.phone}</p>
                </div>
                {card.customer.email && (
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{card.customer.email}</p>
                  </div>
                )}
                {card.customer.address && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">
                      {card.customer.address}
                      {card.customer.city && `, ${card.customer.city}`}
                      {card.customer.state && `, ${card.customer.state}`}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Claims History */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Warranty Claims
                </CardTitle>
                <Badge variant="outline">{card.warrantyClaims.length} claims</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {card.warrantyClaims.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  No claims have been filed for this warranty card
                </div>
              ) : (
                <div className="space-y-4">
                  {card.warrantyClaims.map((claim) => (
                    <div
                      key={claim.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => router.push(`/claims/${claim.id}`)}
                    >
                      <div>
                        <p className="font-medium font-mono">{claim.claimNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(claim.createdAt), "dd MMM yyyy")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{claim.priority}</Badge>
                        <Badge>{claim.currentStatus}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Shop Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Purchase Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Shop Name</p>
                <p className="font-medium">{card.shop.name}</p>
              </div>
              {card.shop.code && (
                <div>
                  <p className="text-sm text-muted-foreground">Shop Code</p>
                  <p className="font-medium">{card.shop.code}</p>
                </div>
              )}
              {card.shop.phone && (
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{card.shop.phone}</p>
                </div>
              )}
              {card.shop.address && (
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium">{card.shop.address}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invoice Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Invoice Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Purchase Date</p>
                <p className="font-medium">{format(new Date(card.purchaseDate), "dd MMM yyyy")}</p>
              </div>
              {card.invoiceNumber && (
                <div>
                  <p className="text-sm text-muted-foreground">Invoice Number</p>
                  <p className="font-medium">{card.invoiceNumber}</p>
                </div>
              )}
              {card.invoiceAmount && (
                <div>
                  <p className="text-sm text-muted-foreground">Invoice Amount</p>
                  <p className="font-medium">₹{parseFloat(card.invoiceAmount).toLocaleString()}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Meta Info */}
          <Card>
            <CardHeader>
              <CardTitle>Registration Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Card Number</p>
                <p className="font-medium font-mono">{card.cardNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Registered On</p>
                <p className="font-medium">{format(new Date(card.createdAt), "dd MMM yyyy, HH:mm")}</p>
              </div>
              {card.createdByUser && (
                <div>
                  <p className="text-sm text-muted-foreground">Registered By</p>
                  <p className="font-medium">
                    {card.createdByUser.firstName} {card.createdByUser.lastName}
                  </p>
                </div>
              )}
              {card.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="text-sm">{card.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
