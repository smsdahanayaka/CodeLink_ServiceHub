"use client";

// ===========================================
// Inventory List Page
// ===========================================

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  Package,
  FolderTree,
  AlertTriangle,
  ArrowUpDown,
  Search,
  Filter
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout";
import { DataTable, Column } from "@/components/tables";
import { Button } from "@/components/ui/button";
import { StatusBadge, ConfirmDialog } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface InventoryCategory {
  id: number;
  name: string;
}

interface InventoryItem {
  id: number;
  name: string;
  sku: string | null;
  description: string | null;
  unitPrice: number;
  currentStock: number;
  minStockLevel: number;
  maxStockLevel: number | null;
  isActive: boolean;
  category: { id: number; name: string } | null;
  _count: { transactions: number };
}

export default function InventoryPage() {
  const router = useRouter();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<string>("all");

  // Fetch inventory items
  const fetchItems = async () => {
    try {
      let url = "/api/inventory/items?limit=100";
      if (categoryFilter && categoryFilter !== "all") {
        url += `&categoryId=${categoryFilter}`;
      }
      if (stockFilter === "low") {
        url += `&lowStock=true`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setItems(data.data);
      }
    } catch (error) {
      console.error("Error fetching inventory:", error);
      toast.error("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/inventory/categories?limit=100");
      const data = await res.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchItems();
  }, [categoryFilter, stockFilter]);

  // Handle delete
  const handleDelete = async () => {
    if (!deleteId) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/inventory/items/${deleteId}`, { method: "DELETE" });
      const data = await res.json();

      if (data.success) {
        toast.success("Item deleted successfully");
        fetchItems();
      } else {
        toast.error(data.error?.message || "Failed to delete item");
      }
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error("Failed to delete item");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  // Calculate stats
  const totalItems = items.length;
  const lowStockItems = items.filter(item => item.currentStock <= item.minStockLevel).length;
  const totalValue = items.reduce((acc, item) => acc + (item.unitPrice * item.currentStock), 0);
  const activeItems = items.filter(item => item.isActive).length;

  // Table columns
  const columns: Column<InventoryItem>[] = [
    {
      key: "name",
      title: "Item",
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{item.name}</div>
            {item.sku && (
              <div className="text-sm text-muted-foreground">
                SKU: {item.sku}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "category",
      title: "Category",
      render: (item) =>
        item.category ? (
          <Badge variant="secondary">{item.category.name}</Badge>
        ) : (
          "-"
        ),
    },
    {
      key: "unitPrice",
      title: "Unit Price",
      render: (item) => `Rs. ${item.unitPrice.toLocaleString()}`,
    },
    {
      key: "currentStock",
      title: "Stock",
      render: (item) => (
        <div className="flex items-center gap-2">
          <span className={item.currentStock <= item.minStockLevel ? "text-destructive font-medium" : ""}>
            {item.currentStock}
          </span>
          {item.currentStock <= item.minStockLevel && (
            <AlertTriangle className="h-4 w-4 text-destructive" />
          )}
        </div>
      ),
    },
    {
      key: "minStockLevel",
      title: "Min Level",
      render: (item) => item.minStockLevel,
    },
    {
      key: "status",
      title: "Status",
      render: (item) => (
        <StatusBadge status={item.isActive ? "ACTIVE" : "INACTIVE"} />
      ),
    },
    {
      key: "actions",
      title: "Actions",
      render: (item) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/inventory/${item.id}`);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteId(item.id);
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
        title="Inventory"
        description="Manage spare parts and inventory items"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/inventory/categories")}
            >
              <FolderTree className="mr-2 h-4 w-4" />
              Categories
            </Button>
            <Button onClick={() => router.push("/inventory/new")}>
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
            <p className="text-xs text-muted-foreground">
              {activeItems} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{lowStockItems}</div>
            <p className="text-xs text-muted-foreground">
              Items need restocking
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs. {totalValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Current stock value
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <FolderTree className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
            <p className="text-xs text-muted-foreground">
              Item categories
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id.toString()}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={stockFilter} onValueChange={setStockFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by stock" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stock Levels</SelectItem>
            <SelectItem value="low">Low Stock Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        data={items}
        columns={columns}
        searchKey="name"
        searchPlaceholder="Search by item name..."
        emptyMessage={loading ? "Loading..." : "No inventory items found"}
        emptyDescription="Get started by adding your first inventory item."
        onRowClick={(item) => router.push(`/inventory/${item.id}`)}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Item"
        description="Are you sure you want to delete this inventory item? This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDelete}
        isLoading={deleting}
        variant="destructive"
      />
    </div>
  );
}
