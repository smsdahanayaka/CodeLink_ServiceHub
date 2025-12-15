"use client";

// ===========================================
// Create New Warranty Card Page
// ===========================================

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

interface Product {
  id: number;
  name: string;
  modelNumber: string | null;
  warrantyPeriodMonths: number;
}

interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string | null;
}

interface Shop {
  id: number;
  name: string;
  code: string | null;
}

export default function NewWarrantyCardPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [formData, setFormData] = useState({
    productId: "",
    customerId: "",
    shopId: "",
    serialNumber: "",
    purchaseDate: new Date().toISOString().split("T")[0],
    invoiceNumber: "",
    invoiceAmount: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch reference data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, customersRes, shopsRes] = await Promise.all([
          fetch("/api/products?limit=100"),
          fetch("/api/customers?limit=100"),
          fetch("/api/shops?limit=100"),
        ]);

        const [productsData, customersData, shopsData] = await Promise.all([
          productsRes.json(),
          customersRes.json(),
          shopsRes.json(),
        ]);

        if (productsData.success) setProducts(productsData.data);
        if (customersData.success) setCustomers(customersData.data);
        if (shopsData.success) setShops(shopsData.data);
      } catch (error) {
        console.error("Error fetching reference data:", error);
        toast.error("Failed to load form data");
      }
    };
    fetchData();
  }, []);

  // Handle input change
  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }

    // Update selected product for warranty info display
    if (field === "productId" && value) {
      const product = products.find((p) => p.id === parseInt(value));
      setSelectedProduct(product || null);
    }
  };

  // Validate form
  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.productId) newErrors.productId = "Please select a product";
    if (!formData.customerId) newErrors.customerId = "Please select a customer";
    if (!formData.shopId) newErrors.shopId = "Please select a shop";
    if (!formData.serialNumber.trim()) newErrors.serialNumber = "Serial number is required";
    if (!formData.purchaseDate) newErrors.purchaseDate = "Purchase date is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/warranty-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: parseInt(formData.productId),
          customerId: parseInt(formData.customerId),
          shopId: parseInt(formData.shopId),
          serialNumber: formData.serialNumber.trim(),
          purchaseDate: formData.purchaseDate,
          invoiceNumber: formData.invoiceNumber || undefined,
          invoiceAmount: formData.invoiceAmount ? parseFloat(formData.invoiceAmount) : undefined,
          notes: formData.notes || undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Warranty card registered successfully");
        router.push("/warranty");
      } else {
        toast.error(data.error?.message || "Failed to register warranty card");
      }
    } catch (error) {
      console.error("Error creating warranty card:", error);
      toast.error("Failed to register warranty card");
    } finally {
      setLoading(false);
    }
  };

  // Calculate warranty end date
  const getWarrantyEndDate = () => {
    if (!selectedProduct || !formData.purchaseDate) return null;
    const endDate = new Date(formData.purchaseDate);
    endDate.setMonth(endDate.getMonth() + selectedProduct.warrantyPeriodMonths);
    return endDate.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Register Warranty Card"
        description="Create a new warranty registration for a product"
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
            {/* Product Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Product Details</CardTitle>
                <CardDescription>Select the product being registered</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="productId">Product *</Label>
                    <Select
                      value={formData.productId}
                      onValueChange={(value) => handleChange("productId", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id.toString()}>
                            {product.name}
                            {product.modelNumber && ` (${product.modelNumber})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.productId && (
                      <p className="text-sm text-destructive">{errors.productId}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="serialNumber">Serial Number *</Label>
                    <Input
                      id="serialNumber"
                      value={formData.serialNumber}
                      onChange={(e) => handleChange("serialNumber", e.target.value)}
                      placeholder="Enter product serial number"
                    />
                    {errors.serialNumber && (
                      <p className="text-sm text-destructive">{errors.serialNumber}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer & Shop Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Customer & Shop</CardTitle>
                <CardDescription>Link warranty to customer and purchase location</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customerId">Customer *</Label>
                    <Select
                      value={formData.customerId}
                      onValueChange={(value) => handleChange("customerId", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id.toString()}>
                            {customer.name} ({customer.phone})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.customerId && (
                      <p className="text-sm text-destructive">{errors.customerId}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shopId">Shop/Dealer *</Label>
                    <Select
                      value={formData.shopId}
                      onValueChange={(value) => handleChange("shopId", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select shop" />
                      </SelectTrigger>
                      <SelectContent>
                        {shops.map((shop) => (
                          <SelectItem key={shop.id} value={shop.id.toString()}>
                            {shop.name}
                            {shop.code && ` (${shop.code})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.shopId && (
                      <p className="text-sm text-destructive">{errors.shopId}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Purchase Details */}
            <Card>
              <CardHeader>
                <CardTitle>Purchase Details</CardTitle>
                <CardDescription>Invoice and purchase information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="purchaseDate">Purchase Date *</Label>
                    <Input
                      id="purchaseDate"
                      type="date"
                      value={formData.purchaseDate}
                      onChange={(e) => handleChange("purchaseDate", e.target.value)}
                    />
                    {errors.purchaseDate && (
                      <p className="text-sm text-destructive">{errors.purchaseDate}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invoiceNumber">Invoice Number</Label>
                    <Input
                      id="invoiceNumber"
                      value={formData.invoiceNumber}
                      onChange={(e) => handleChange("invoiceNumber", e.target.value)}
                      placeholder="Enter invoice number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invoiceAmount">Invoice Amount</Label>
                    <Input
                      id="invoiceAmount"
                      type="number"
                      step="0.01"
                      value={formData.invoiceAmount}
                      onChange={(e) => handleChange("invoiceAmount", e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleChange("notes", e.target.value)}
                    placeholder="Additional notes about this warranty"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Warranty Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Warranty Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedProduct ? (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground">Product</p>
                      <p className="font-medium">{selectedProduct.name}</p>
                      {selectedProduct.modelNumber && (
                        <p className="text-sm text-muted-foreground">
                          Model: {selectedProduct.modelNumber}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Warranty Period</p>
                      <p className="font-medium">{selectedProduct.warrantyPeriodMonths} months</p>
                    </div>
                    {formData.purchaseDate && (
                      <>
                        <div>
                          <p className="text-sm text-muted-foreground">Warranty Start</p>
                          <p className="font-medium">
                            {new Date(formData.purchaseDate).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Warranty End</p>
                          <p className="font-medium text-primary">{getWarrantyEndDate()}</p>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Select a product to see warranty details
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex flex-col gap-2">
              <Button type="submit" disabled={loading} className="w-full">
                <Save className="mr-2 h-4 w-4" />
                {loading ? "Registering..." : "Register Warranty"}
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
