"use client";

// ===========================================
// Shops List Page
// ===========================================

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Store, Phone, MapPin } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout";
import { DataTable, Column } from "@/components/tables";
import { Button } from "@/components/ui/button";
import { StatusBadge, ConfirmDialog } from "@/components/common";
import { Badge } from "@/components/ui/badge";

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
  _count: { customers: number; warrantyCards: number };
}

export default function ShopsPage() {
  const router = useRouter();
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch shops
  const fetchShops = async () => {
    try {
      const res = await fetch("/api/shops?limit=100");
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
  };

  useEffect(() => {
    fetchShops();
  }, []);

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

  // Table columns
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

      <DataTable
        data={shops}
        columns={columns}
        searchKey="name"
        searchPlaceholder="Search by shop name or code..."
        emptyMessage={loading ? "Loading..." : "No shops found"}
        emptyDescription="Get started by adding your first shop."
      />

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
