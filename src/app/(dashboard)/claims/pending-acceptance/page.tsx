"use client";

// ===========================================
// Pending Acceptance Page
// Review and accept claims from collections
// ===========================================

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  User,
  Store,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Edit,
  Phone,
  Loader2,
} from "lucide-react";

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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface Claim {
  id: number;
  claimNumber: string;
  issueDescription: string;
  issueCategory: string | null;
  priority: string;
  currentStatus: string;
  receivedAt: string;
  warrantyCard: {
    id: number;
    serialNumber: string;
    product: { id: number; name: string; modelNumber: string | null } | null;
    customer: { id: number; name: string; phone: string; address: string | null } | null;
    shop: { id: number; name: string; phone: string | null; address: string | null } | null;
  };
  collectionItem?: {
    trip: {
      tripNumber: string;
      collector: { id: number; name: string; phone: string | null };
    };
  } | null;
}

interface ShopGroup {
  shop: { id: number; name: string } | null;
  claims: Claim[];
  count: number;
}

interface CollectorGroup {
  collector: { id: number; name: string; phone: string | null } | null;
  shops: ShopGroup[];
  totalClaims: number;
}

interface GroupedData {
  groups: CollectorGroup[];
  totalClaims: number;
}

export default function PendingAcceptancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<GroupedData | null>(null);
  const [expandedCollectors, setExpandedCollectors] = useState<Set<string>>(new Set());
  const [expandedShops, setExpandedShops] = useState<Set<string>>(new Set());

  // Action states
  const [acceptingClaim, setAcceptingClaim] = useState<number | null>(null);
  const [rejectingClaim, setRejectingClaim] = useState<Claim | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [editingClaim, setEditingClaim] = useState<Claim | null>(null);

  useEffect(() => {
    fetchPendingClaims();
  }, []);

  const fetchPendingClaims = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const res = await fetch("/api/claims/pending-acceptance?grouped=true");
      const result = await res.json();

      if (result.success) {
        setData(result.data);
        // Expand all by default
        const collectorKeys = new Set(
          result.data.groups.map((_: CollectorGroup, i: number) => `collector_${i}`)
        );
        setExpandedCollectors(collectorKeys);
      } else {
        toast.error(result.error?.message || "Failed to load pending claims");
      }
    } catch (error) {
      console.error("Error fetching pending claims:", error);
      toast.error("Failed to load pending claims");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAcceptClaim = async (claimId: number) => {
    try {
      setAcceptingClaim(claimId);
      const res = await fetch(`/api/claims/${claimId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      });

      const result = await res.json();

      if (result.success) {
        toast.success("Claim accepted successfully");
        fetchPendingClaims(true);
      } else {
        toast.error(result.error?.message || "Failed to accept claim");
      }
    } catch (error) {
      console.error("Error accepting claim:", error);
      toast.error("Failed to accept claim");
    } finally {
      setAcceptingClaim(null);
    }
  };

  const handleRejectClaim = async () => {
    if (!rejectingClaim || !rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    try {
      const res = await fetch(`/api/claims/${rejectingClaim.id}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          rejectionReason: rejectionReason.trim(),
        }),
      });

      const result = await res.json();

      if (result.success) {
        toast.success("Claim rejected");
        setRejectingClaim(null);
        setRejectionReason("");
        fetchPendingClaims(true);
      } else {
        toast.error(result.error?.message || "Failed to reject claim");
      }
    } catch (error) {
      console.error("Error rejecting claim:", error);
      toast.error("Failed to reject claim");
    }
  };

  const toggleCollector = (key: string) => {
    const newExpanded = new Set(expandedCollectors);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedCollectors(newExpanded);
  };

  const toggleShop = (key: string) => {
    const newExpanded = new Set(expandedShops);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedShops(newExpanded);
  };

  const isClaimComplete = (claim: Claim) => {
    return (
      claim.warrantyCard.product &&
      claim.warrantyCard.customer &&
      claim.issueDescription
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pending Acceptance"
        description={`${data?.totalClaims || 0} claims awaiting review`}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchPendingClaims(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        }
      />

      {!data || data.totalClaims === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Check className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <p className="text-lg font-medium">All caught up!</p>
            <p className="text-muted-foreground">No claims pending acceptance</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.groups.map((collectorGroup, collectorIndex) => {
            const collectorKey = `collector_${collectorIndex}`;
            const isCollectorExpanded = expandedCollectors.has(collectorKey);

            return (
              <Card key={collectorKey}>
                <Collapsible
                  open={isCollectorExpanded}
                  onOpenChange={() => toggleCollector(collectorKey)}
                >
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isCollectorExpanded ? (
                            <ChevronDown className="h-5 w-5" />
                          ) : (
                            <ChevronRight className="h-5 w-5" />
                          )}
                          <User className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <CardTitle className="text-lg">
                              {collectorGroup.collector?.name || "Unknown Collector"}
                            </CardTitle>
                            {collectorGroup.collector?.phone && (
                              <CardDescription className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {collectorGroup.collector.phone}
                              </CardDescription>
                            )}
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-lg px-3 py-1">
                          {collectorGroup.totalClaims}
                        </Badge>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-4">
                      {collectorGroup.shops.map((shopGroup, shopIndex) => {
                        const shopKey = `${collectorKey}_shop_${shopIndex}`;
                        const isShopExpanded = expandedShops.has(shopKey);

                        return (
                          <div key={shopKey} className="border rounded-lg">
                            <Collapsible
                              open={isShopExpanded}
                              onOpenChange={() => toggleShop(shopKey)}
                            >
                              <CollapsibleTrigger asChild>
                                <div className="p-3 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors">
                                  <div className="flex items-center gap-2">
                                    {isShopExpanded ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                    <Store className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">
                                      {shopGroup.shop?.name || "Direct Customer"}
                                    </span>
                                  </div>
                                  <Badge variant="outline">{shopGroup.count} items</Badge>
                                </div>
                              </CollapsibleTrigger>

                              <CollapsibleContent>
                                <div className="px-3 pb-3 space-y-2">
                                  {shopGroup.claims.map((claim) => {
                                    const complete = isClaimComplete(claim);

                                    return (
                                      <div
                                        key={claim.id}
                                        className={`p-3 border rounded-lg ${
                                          !complete ? "border-orange-200 bg-orange-50 dark:bg-orange-950/20" : ""
                                        }`}
                                      >
                                        <div className="flex items-start justify-between">
                                          <div className="space-y-1 flex-1">
                                            <div className="flex items-center gap-2">
                                              <span className="font-medium">{claim.claimNumber}</span>
                                              {!complete && (
                                                <Badge variant="destructive" className="text-xs">
                                                  Incomplete
                                                </Badge>
                                              )}
                                            </div>
                                            <div className="flex items-center gap-2 text-sm">
                                              <Package className="h-4 w-4 text-muted-foreground" />
                                              <span>
                                                {claim.warrantyCard.product?.name || (
                                                  <span className="text-orange-600">Missing Product</span>
                                                )}
                                              </span>
                                              <Badge variant="outline" className="text-xs">
                                                {claim.warrantyCard.serialNumber}
                                              </Badge>
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                              Customer:{" "}
                                              {claim.warrantyCard.customer?.name || (
                                                <span className="text-orange-600">Missing Customer</span>
                                              )}
                                              {claim.warrantyCard.customer?.phone && (
                                                <span> ({claim.warrantyCard.customer.phone})</span>
                                              )}
                                            </div>
                                            <p className="text-sm text-muted-foreground line-clamp-2">
                                              Issue: {claim.issueDescription || (
                                                <span className="text-orange-600">No description</span>
                                              )}
                                            </p>
                                          </div>
                                          <div className="flex items-center gap-2 ml-4">
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => router.push(`/claims/${claim.id}`)}
                                            >
                                              <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="text-red-600 hover:text-red-700"
                                              onClick={() => setRejectingClaim(claim)}
                                            >
                                              <X className="h-4 w-4" />
                                            </Button>
                                            <Button
                                              size="sm"
                                              disabled={!complete || acceptingClaim === claim.id}
                                              onClick={() => handleAcceptClaim(claim.id)}
                                            >
                                              {acceptingClaim === claim.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                              ) : (
                                                <Check className="h-4 w-4" />
                                              )}
                                            </Button>
                                          </div>
                                        </div>
                                        {!complete && (
                                          <div className="mt-2 flex items-center gap-2 text-xs text-orange-600">
                                            <AlertCircle className="h-3 w-3" />
                                            <span>
                                              Missing:{" "}
                                              {[
                                                !claim.warrantyCard.product && "Product",
                                                !claim.warrantyCard.customer && "Customer",
                                                !claim.issueDescription && "Issue Description",
                                              ]
                                                .filter(Boolean)
                                                .join(", ")}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          </div>
                        );
                      })}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      )}

      {/* Reject Dialog */}
      <AlertDialog open={!!rejectingClaim} onOpenChange={() => setRejectingClaim(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Claim?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reject claim {rejectingClaim?.claimNumber}. The item will need to be
              returned to the customer/shop.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="rejectionReason">Rejection Reason</Label>
            <Textarea
              id="rejectionReason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter the reason for rejection..."
              className="mt-2"
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRejectionReason("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRejectClaim}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reject Claim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
