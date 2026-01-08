"use client";

// ===========================================
// Shops List Page with Approval Workflow
// ===========================================

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Pencil, Trash2, Store, Phone, MapPin, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout";
import { DataTable, Column } from "@/components/tables";
import { Button } from "@/components/ui/button";
import { StatusBadge, ConfirmDialog } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Shop {
  id: number;
  code: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  contactPerson: string | null;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  isVerified: boolean;
  createdAt: string;
  _count: { customers: number; warrantyCards: number };
}

export default function ShopsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [shops, setShops] = useState<Shop[]>([]);
  const [pendingShops, setPendingShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => {
    // Check URL for tab parameter
    const tabParam = searchParams.get("tab");
    return tabParam === "pending" ? "pending" : "verified";
  });
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [approving, setApproving] = useState<number | null>(null);

  // Fetch verified shops
  const fetchShops = useCallback(async () => {
    try {
      const res = await fetch("/api/shops?limit=100&isVerified=true");
      const data = await res.json();
      if (data.success) {
        setShops(data.data);
      }
    } catch (error) {
      console.error("Error fetching shops:", error);
      toast.error("Failed to load shops");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch pending approval shops
  const fetchPendingShops = useCallback(async () => {
    try {
      const res = await fetch("/api/shops?limit=100&isVerified=false");
      const data = await res.json();
      if (data.success) {
        setPendingShops(data.data);
      }
    } catch (error) {
      console.error("Error fetching pending shops:", error);
    }
  }, []);

  useEffect(() => {
    fetchShops();
    fetchPendingShops();
  }, [fetchShops, fetchPendingShops]);

  // Handle approve shop
  const handleApprove = async (shopId: number) => {
    setApproving(shopId);
    try {
      const res = await fetch(`/api/shops/${shopId}/approve`, {
        method: "POST",
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Shop approved successfully");
        fetchShops();
        fetchPendingShops();
      } else {
        toast.error(data.error?.message || "Failed to approve shop");
      }
    } catch (error) {
      console.error("Error approving shop:", error);
      toast.error("Failed to approve shop");
    } finally {
      setApproving(null);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteId) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/shops/${deleteId}`, { method: "DELETE" });
      const data = await res.json();

      if (data.success) {
        toast.success("Shop deleted successfully");
        fetchShops();
      } else {
        toast.error(data.error?.message || "Failed to delete shop");
      }
    } catch (error) {
      console.error("Error deleting shop:", error);
      toast.error("Failed to delete shop");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  // Table columns for verified shops
  const columns: Column<Shop>[] = [
    {
      key: "name",
      title: "Shop",
      sortable: true,
      render: (shop) => (
        <div className="flex items-center gap-2">
          <Store className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{shop.name}</div>
            {shop.code && (
              <div className="text-sm text-muted-foreground">
                Code: {shop.code}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "contact",
      title: "Contact",
      render: (shop) => (
        <div>
          {shop.contactPerson && (
            <div className="font-medium">{shop.contactPerson}</div>
          )}
          {shop.phone && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Phone className="h-3 w-3" />
              {shop.phone}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "location",
      title: "Location",
      render: (shop) => (
        <div className="flex items-center gap-1">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span>
            {shop.city || "-"}
            {shop.state && `, ${shop.state}`}
          </span>
        </div>
      ),
    },
    {
      key: "customers",
      title: "Customers",
      render: (shop) => (
        <Badge variant="outline">{shop._count.customers}</Badge>
      ),
    },
    {
      key: "warrantyCards",
      title: "Warranties",
      render: (shop) => (
        <Badge variant="outline">{shop._count.warrantyCards}</Badge>
      ),
    },
    {
      key: "status",
      title: "Status",
      render: (shop) => <StatusBadge status={shop.status} />,
    },
    {
      key: "actions",
      title: "Actions",
      render: (shop) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/shops/${shop.id}`);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteId(shop.id);
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  // Table columns for pending approval shops
  const pendingColumns: Column<Shop>[] = [
    {
      key: "name",
      title: "Shop",
      sortable: true,
      render: (shop) => (
        <div className="flex items-center gap-2">
          <Store className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{shop.name}</div>
            {shop.code && (
              <div className="text-sm text-muted-foreground">
                Code: {shop.code}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "contact",
      title: "Contact",
      render: (shop) => (
        <div>
          {shop.contactPerson && (
            <div className="font-medium">{shop.contactPerson}</div>
          )}
          {shop.phone && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Phone className="h-3 w-3" />
              {shop.phone}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "location",
      title: "Location",
      render: (shop) => (
        <div className="flex items-center gap-1">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span>
            {shop.city || "-"}
            {shop.state && `, ${shop.state}`}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      title: "Status",
      render: (shop) => <StatusBadge status={shop.status} />,
    },
    {
      key: "actions",
      title: "Actions",
      render: (shop) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleApprove(shop.id);
            }}
            disabled={approving === shop.id}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            {approving === shop.id ? "Approving..." : "Approve"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/shops/${shop.id}`);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteId(shop.id);
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shops"
        description="Manage shops and dealers"
        actions={
          <Button onClick={() => router.push("/shops/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Add Shop
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card
          className={`cursor-pointer transition-colors ${activeTab === "verified" ? "border-primary" : ""}`}
          onClick={() => setActiveTab("verified")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified Shops</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shops.length}</div>
            <p className="text-xs text-muted-foreground">Active and approved shops</p>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-colors ${activeTab === "pending" ? "border-primary" : ""}`}
          onClick={() => setActiveTab("pending")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingShops.length}</div>
            <p className="text-xs text-muted-foreground">Shops awaiting verification</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="verified">
            Verified Shops ({shops.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending Approval ({pendingShops.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="verified" className="mt-4">
          <DataTable
            data={shops}
            columns={columns}
            searchKey="name"
            searchPlaceholder="Search by shop name or code..."
            emptyMessage={loading ? "Loading..." : "No verified shops found"}
            emptyDescription="Verified shops will appear here."
          />
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          <DataTable
            data={pendingShops}
            columns={pendingColumns}
            searchKey="name"
            searchPlaceholder="Search pending shops..."
            emptyMessage="No pending shops"
            emptyDescription="Shops created from other pages will appear here for approval."
          />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Shop"
        description="Are you sure you want to delete this shop? This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDelete}
        isLoading={deleting}
        variant="destructive"
      />
    </div>
  );
}
