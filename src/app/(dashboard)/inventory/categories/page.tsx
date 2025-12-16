"use client";

// ===========================================
// Inventory Categories Page
// ===========================================

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Pencil, Trash2, FolderTree, Package } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout";
import { DataTable, Column } from "@/components/tables";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface InventoryCategory {
  id: number;
  name: string;
  description: string | null;
  _count: { items: number };
  createdAt: string;
}

export default function InventoryCategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<InventoryCategory | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);

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
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Handle save (create/update)
  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Category name is required");
      return;
    }

    setSaving(true);
    try {
      const url = editCategory
        ? `/api/inventory/categories/${editCategory.id}`
        : "/api/inventory/categories";
      const method = editCategory ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(
          editCategory
            ? "Category updated successfully"
            : "Category created successfully"
        );
        fetchCategories();
        setDialogOpen(false);
        setFormData({ name: "", description: "" });
        setEditCategory(null);
      } else {
        toast.error(data.error?.message || "Failed to save category");
      }
    } catch (error) {
      console.error("Error saving category:", error);
      toast.error("Failed to save category");
    } finally {
      setSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteId) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/inventory/categories/${deleteId}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Category deleted successfully");
        fetchCategories();
      } else {
        toast.error(data.error?.message || "Failed to delete category");
      }
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Failed to delete category");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  // Open edit dialog
  const openEdit = (category: InventoryCategory) => {
    setEditCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
    });
    setDialogOpen(true);
  };

  // Open create dialog
  const openCreate = () => {
    setEditCategory(null);
    setFormData({ name: "", description: "" });
    setDialogOpen(true);
  };

  // Table columns
  const columns: Column<InventoryCategory>[] = [
    {
      key: "name",
      title: "Category",
      sortable: true,
      render: (category) => (
        <div className="flex items-center gap-2">
          <FolderTree className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{category.name}</div>
            {category.description && (
              <div className="text-sm text-muted-foreground line-clamp-1">
                {category.description}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "items",
      title: "Items",
      render: (category) => (
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span>{category._count.items}</span>
        </div>
      ),
    },
    {
      key: "actions",
      title: "Actions",
      render: (category) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              openEdit(category);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              if (category._count.items > 0) {
                toast.error("Cannot delete category with items");
                return;
              }
              setDeleteId(category.id);
            }}
            disabled={category._count.items > 0}
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
        title="Inventory Categories"
        description="Organize inventory items by categories"
        backUrl="/inventory"
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Category
          </Button>
        }
      />

      <DataTable
        data={categories}
        columns={columns}
        searchKey="name"
        searchPlaceholder="Search by category name..."
        emptyMessage={loading ? "Loading..." : "No categories found"}
        emptyDescription="Get started by adding your first category."
      />

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editCategory ? "Edit Category" : "Add Category"}
            </DialogTitle>
            <DialogDescription>
              {editCategory
                ? "Update the category details."
                : "Create a new inventory category."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Category Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Spare Parts"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Optional description..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editCategory ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Category"
        description="Are you sure you want to delete this category? This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDelete}
        isLoading={deleting}
        variant="destructive"
      />
    </div>
  );
}
