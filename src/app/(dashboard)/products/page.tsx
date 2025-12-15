"use client";

// ===========================================
// Products List Page
// ===========================================

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Package, FolderTree } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout";
import { DataTable, Column } from "@/components/tables";
import { Button } from "@/components/ui/button";
import { StatusBadge, ConfirmDialog } from "@/components/common";
import { Badge } from "@/components/ui/badge";

interface Product {
  id: number;
  name: string;
  modelNumber: string | null;
  sku: string | null;
  warrantyPeriodMonths: number;
  isActive: boolean;
  category: { id: number; name: string } | null;
  _count: { warrantyCards: number };
}

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch products
  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products?limit=100");
      const data = await res.json();
      if (data.success) {
        setProducts(data.data);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Handle delete
  const handleDelete = async () => {
    if (!deleteId) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/products/${deleteId}`, { method: "DELETE" });
      const data = await res.json();

      if (data.success) {
        toast.success("Product deleted successfully");
        fetchProducts();
      } else {
        toast.error(data.error?.message || "Failed to delete product");
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Failed to delete product");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  // Table columns
  const columns: Column<Product>[] = [
    {
      key: "name",
      title: "Product",
      sortable: true,
      render: (product) => (
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{product.name}</div>
            {product.modelNumber && (
              <div className="text-sm text-muted-foreground">
                Model: {product.modelNumber}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "sku",
      title: "SKU",
      render: (product) => product.sku || "-",
    },
    {
      key: "category",
      title: "Category",
      render: (product) =>
        product.category ? (
          <Badge variant="secondary">{product.category.name}</Badge>
        ) : (
          "-"
        ),
    },
    {
      key: "warranty",
      title: "Warranty",
      render: (product) => `${product.warrantyPeriodMonths} months`,
    },
    {
      key: "warrantyCards",
      title: "Cards",
      render: (product) => product._count.warrantyCards,
    },
    {
      key: "status",
      title: "Status",
      render: (product) => (
        <StatusBadge status={product.isActive ? "ACTIVE" : "INACTIVE"} />
      ),
    },
    {
      key: "actions",
      title: "Actions",
      render: (product) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/products/${product.id}`);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteId(product.id);
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
        title="Products"
        description="Manage products and warranty periods"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/products/categories")}
            >
              <FolderTree className="mr-2 h-4 w-4" />
              Categories
            </Button>
            <Button onClick={() => router.push("/products/new")}>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </div>
        }
      />

      <DataTable
        data={products}
        columns={columns}
        searchKey="name"
        searchPlaceholder="Search by product name..."
        emptyMessage={loading ? "Loading..." : "No products found"}
        emptyDescription="Get started by adding your first product."
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Product"
        description="Are you sure you want to delete this product? This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDelete}
        isLoading={deleting}
        variant="destructive"
      />
    </div>
  );
}
