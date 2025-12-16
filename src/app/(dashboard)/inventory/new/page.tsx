"use client";

// ===========================================
// New Inventory Item Page
// ===========================================

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Package, Save } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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

interface InventoryCategory {
  id: number;
  name: string;
}

export default function NewInventoryItemPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    description: "",
    categoryId: "",
    unitPrice: "",
    currentStock: "0",
    minStockLevel: "5",
    maxStockLevel: "",
    isActive: true,
  });

  // Fetch categories
  useEffect(() => {
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
    fetchCategories();
  }, []);

  // Handle form change
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Item name is required");
      return;
    }

    if (!formData.unitPrice || parseFloat(formData.unitPrice) < 0) {
      toast.error("Valid unit price is required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        sku: formData.sku || undefined,
        description: formData.description || undefined,
        categoryId: formData.categoryId ? parseInt(formData.categoryId) : undefined,
        unitPrice: parseFloat(formData.unitPrice),
        currentStock: parseInt(formData.currentStock) || 0,
        minStockLevel: parseInt(formData.minStockLevel) || 0,
        maxStockLevel: formData.maxStockLevel ? parseInt(formData.maxStockLevel) : undefined,
        isActive: formData.isActive,
      };

      const res = await fetch("/api/inventory/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Item created successfully");
        router.push(`/inventory/${data.data.id}`);
      } else {
        toast.error(data.error?.message || "Failed to create item");
      }
    } catch (error) {
      console.error("Error creating item:", error);
      toast.error("Failed to create item");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Inventory Item"
        description="Create a new inventory item"
        backUrl="/inventory"
      />

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Basic Information
              </CardTitle>
              <CardDescription>
                Enter the item details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Item Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Compressor Motor 1HP"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  name="sku"
                  value={formData.sku}
                  onChange={handleChange}
                  placeholder="e.g., CM-1HP-001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoryId">Category</Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, categoryId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Item description..."
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">Active Status</Label>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Pricing & Stock */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing & Stock</CardTitle>
              <CardDescription>
                Set pricing and stock levels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="unitPrice">Unit Price (Rs.) *</Label>
                <Input
                  id="unitPrice"
                  name="unitPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.unitPrice}
                  onChange={handleChange}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currentStock">Initial Stock</Label>
                <Input
                  id="currentStock"
                  name="currentStock"
                  type="number"
                  min="0"
                  value={formData.currentStock}
                  onChange={handleChange}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="minStockLevel">Minimum Stock Level</Label>
                <Input
                  id="minStockLevel"
                  name="minStockLevel"
                  type="number"
                  min="0"
                  value={formData.minStockLevel}
                  onChange={handleChange}
                  placeholder="5"
                />
                <p className="text-xs text-muted-foreground">
                  Alert when stock falls below this level
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxStockLevel">Maximum Stock Level</Label>
                <Input
                  id="maxStockLevel"
                  name="maxStockLevel"
                  type="number"
                  min="0"
                  value={formData.maxStockLevel}
                  onChange={handleChange}
                  placeholder="Optional"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/inventory")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Creating..." : "Create Item"}
          </Button>
        </div>
      </form>
    </div>
  );
}
