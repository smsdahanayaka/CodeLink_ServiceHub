"use client";

// ===========================================
// Edit Product Page
// ===========================================

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout";
import { PageLoading } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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

interface Category {
  id: number;
  name: string;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditProductPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    modelNumber: "",
    sku: "",
    description: "",
    categoryId: "",
    warrantyPeriodMonths: "12",
    serialNumberPrefix: "",
    isActive: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch product and categories
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productRes, categoriesRes] = await Promise.all([
          fetch(`/api/products/${id}`),
          fetch("/api/categories?limit=100"),
        ]);

        const productData = await productRes.json();
        const categoriesData = await categoriesRes.json();

        if (productData.success) {
          const product = productData.data;
          setFormData({
            name: product.name,
            modelNumber: product.modelNumber || "",
            sku: product.sku || "",
            description: product.description || "",
            categoryId: product.category?.id?.toString() || "",
            warrantyPeriodMonths: product.warrantyPeriodMonths.toString(),
            serialNumberPrefix: product.serialNumberPrefix || "",
            isActive: product.isActive,
          });
        } else {
          toast.error("Product not found");
          router.push("/products");
        }

        if (categoriesData.success) {
          setCategories(categoriesData.data);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load product");
        router.push("/products");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, router]);

  // Handle input change
  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  // Validate form
  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name) newErrors.name = "Product name is required";
    if (!formData.warrantyPeriodMonths || parseInt(formData.warrantyPeriodMonths) < 1)
      newErrors.warrantyPeriodMonths = "Warranty period must be at least 1 month";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          categoryId: formData.categoryId ? parseInt(formData.categoryId) : null,
          warrantyPeriodMonths: parseInt(formData.warrantyPeriodMonths),
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Product updated successfully");
        router.push("/products");
      } else {
        toast.error(data.error?.message || "Failed to update product");
      }
    } catch (error) {
      console.error("Error updating product:", error);
      toast.error("Failed to update product");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Product"
        description="Update product details and warranty information"
        actions={
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        }
      />

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
            <CardDescription>Update the product details below</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Name & Model */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Enter product name"
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="modelNumber">Model Number</Label>
                <Input
                  id="modelNumber"
                  value={formData.modelNumber}
                  onChange={(e) => handleChange("modelNumber", e.target.value)}
                  placeholder="Enter model number"
                />
              </div>
            </div>

            {/* SKU & Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => handleChange("sku", e.target.value)}
                  placeholder="Enter SKU"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoryId">Category</Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(value) => handleChange("categoryId", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Category</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Warranty & Serial Prefix */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="warrantyPeriodMonths">Warranty Period (months) *</Label>
                <Input
                  id="warrantyPeriodMonths"
                  type="number"
                  min="1"
                  value={formData.warrantyPeriodMonths}
                  onChange={(e) => handleChange("warrantyPeriodMonths", e.target.value)}
                  placeholder="Enter warranty period"
                />
                {errors.warrantyPeriodMonths && (
                  <p className="text-sm text-destructive">{errors.warrantyPeriodMonths}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="serialNumberPrefix">Serial Number Prefix</Label>
                <Input
                  id="serialNumberPrefix"
                  value={formData.serialNumberPrefix}
                  onChange={(e) => handleChange("serialNumberPrefix", e.target.value)}
                  placeholder="e.g., PRD-"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Enter product description"
                rows={3}
              />
            </div>

            {/* Status */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>Active Status</Label>
                <p className="text-sm text-muted-foreground">
                  Product is available for warranty registration
                </p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => handleChange("isActive", checked)}
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
