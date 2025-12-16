"use client";

// ===========================================
// Create New Warranty Card Page
// ===========================================

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Plus, X, Search, Package } from "lucide-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { usePermissions } from "@/lib/hooks";

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

interface Category {
  id: number;
  name: string;
}

export default function NewWarrantyCardPage() {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [productPopoverOpen, setProductPopoverOpen] = useState(false);

  // Permission check for creating products
  const canCreateProduct = hasPermission("products.create");

  // Inline customer add state
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    email: "",
  });

  // Inline product add state
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [addingProduct, setAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    modelNumber: "",
    categoryId: "",
    warrantyPeriodMonths: "12",
  });

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
        const [productsRes, customersRes, shopsRes, categoriesRes] = await Promise.all([
          fetch("/api/products?limit=100"),
          fetch("/api/customers?limit=100"),
          fetch("/api/shops?limit=100"),
          fetch("/api/categories?limit=100"),
        ]);

        const [productsData, customersData, shopsData, categoriesData] = await Promise.all([
          productsRes.json(),
          customersRes.json(),
          shopsRes.json(),
          categoriesRes.json(),
        ]);

        if (productsData.success) setProducts(productsData.data);
        if (customersData.success) setCustomers(customersData.data);
        if (shopsData.success) setShops(shopsData.data);
        if (categoriesData.success) setCategories(categoriesData.data);
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

  // Handle new customer field change
  const handleNewCustomerChange = (field: string, value: string) => {
    setNewCustomer((prev) => ({ ...prev, [field]: value }));
    if (errors[`newCustomer.${field}`]) {
      setErrors((prev) => ({ ...prev, [`newCustomer.${field}`]: "" }));
    }
  };

  // Handle new product field change
  const handleNewProductChange = (field: string, value: string) => {
    setNewProduct((prev) => ({ ...prev, [field]: value }));
    if (errors[`newProduct.${field}`]) {
      setErrors((prev) => ({ ...prev, [`newProduct.${field}`]: "" }));
    }
  };

  // Filter products based on search
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.modelNumber && p.modelNumber.toLowerCase().includes(productSearch.toLowerCase()))
  );

  // Select existing product
  const selectProduct = (product: Product) => {
    setFormData((prev) => ({ ...prev, productId: product.id.toString() }));
    setSelectedProduct(product);
    setShowAddProduct(false);
    setNewProduct({ name: "", modelNumber: "", categoryId: "", warrantyPeriodMonths: "12" });
    setProductPopoverOpen(false);
  };

  // Clear product selection
  const clearProduct = () => {
    setFormData((prev) => ({ ...prev, productId: "" }));
    setSelectedProduct(null);
    setNewProduct({ name: "", modelNumber: "", categoryId: "", warrantyPeriodMonths: "12" });
    setShowAddProduct(false);
  };

  // Create new product inline
  const handleCreateProduct = async () => {
    // Validate new product
    const productErrors: Record<string, string> = {};
    if (!newProduct.name.trim()) productErrors["newProduct.name"] = "Product name is required";
    if (!newProduct.warrantyPeriodMonths || parseInt(newProduct.warrantyPeriodMonths) <= 0) {
      productErrors["newProduct.warrantyPeriodMonths"] = "Valid warranty period is required";
    }

    if (Object.keys(productErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...productErrors }));
      return;
    }

    setAddingProduct(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProduct.name.trim(),
          modelNumber: newProduct.modelNumber.trim() || undefined,
          categoryId: newProduct.categoryId ? parseInt(newProduct.categoryId) : undefined,
          warrantyPeriodMonths: parseInt(newProduct.warrantyPeriodMonths),
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Add new product to the list and select it
        const createdProduct: Product = {
          id: data.data.id,
          name: data.data.name,
          modelNumber: data.data.modelNumber,
          warrantyPeriodMonths: data.data.warrantyPeriodMonths,
        };
        setProducts((prev) => [createdProduct, ...prev]);
        selectProduct(createdProduct);
        toast.success("Product created successfully");
      } else {
        toast.error(data.error?.message || "Failed to create product");
      }
    } catch (error) {
      console.error("Error creating product:", error);
      toast.error("Failed to create product");
    } finally {
      setAddingProduct(false);
    }
  };

  // Select existing customer
  const selectCustomer = (customer: Customer) => {
    setFormData((prev) => ({ ...prev, customerId: customer.id.toString() }));
    setShowAddCustomer(false);
    setNewCustomer({ name: "", phone: "", email: "" });
    setCustomerPopoverOpen(false);
  };

  // Clear customer selection
  const clearCustomer = () => {
    setFormData((prev) => ({ ...prev, customerId: "" }));
    setNewCustomer({ name: "", phone: "", email: "" });
    setShowAddCustomer(false);
  };

  // Filter customers based on search
  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone.includes(customerSearch)
  );

  // Get selected customer details
  const selectedCustomer = formData.customerId
    ? customers.find((c) => c.id === parseInt(formData.customerId))
    : null;

  // Validate form
  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.productId) newErrors.productId = "Please select a product";
    if (!formData.shopId) newErrors.shopId = "Please select a shop";
    if (!formData.serialNumber.trim()) newErrors.serialNumber = "Serial number is required";
    if (!formData.purchaseDate) newErrors.purchaseDate = "Purchase date is required";

    // Validate new customer if adding one
    if (showAddCustomer) {
      if (!newCustomer.name.trim()) newErrors["newCustomer.name"] = "Customer name is required";
      if (!newCustomer.phone.trim()) newErrors["newCustomer.phone"] = "Phone number is required";
      if (newCustomer.email && !/\S+@\S+\.\S+/.test(newCustomer.email)) {
        newErrors["newCustomer.email"] = "Invalid email address";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        productId: parseInt(formData.productId),
        shopId: parseInt(formData.shopId),
        serialNumber: formData.serialNumber.trim(),
        purchaseDate: formData.purchaseDate,
        invoiceNumber: formData.invoiceNumber || undefined,
        invoiceAmount: formData.invoiceAmount ? parseFloat(formData.invoiceAmount) : undefined,
        notes: formData.notes || undefined,
      };

      // Add customer data
      if (showAddCustomer && newCustomer.name && newCustomer.phone) {
        payload.newCustomer = {
          name: newCustomer.name.trim(),
          phone: newCustomer.phone.trim(),
          email: newCustomer.email.trim() || undefined,
        };
      } else if (formData.customerId) {
        payload.customerId = parseInt(formData.customerId);
      }
      // If neither, customer will be null (optional)

      const res = await fetch("/api/warranty-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
                <CardDescription>Select the product being registered or add a new one</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Product Selection */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Product *</Label>
                    {canCreateProduct && !showAddProduct && !selectedProduct && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAddProduct(true)}
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Add New
                      </Button>
                    )}
                  </div>

                  {/* Show selected product */}
                  {selectedProduct && !showAddProduct && (
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Package className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{selectedProduct.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {selectedProduct.modelNumber && `Model: ${selectedProduct.modelNumber} | `}
                            Warranty: {selectedProduct.warrantyPeriodMonths} months
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={clearProduct}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {/* Product search/select */}
                  {!selectedProduct && !showAddProduct && (
                    <Popover open={productPopoverOpen} onOpenChange={setProductPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-start text-muted-foreground font-normal"
                        >
                          <Search className="mr-2 h-4 w-4" />
                          Search product by name or model...
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[450px] p-0" align="start">
                        <Command>
                          <CommandInput
                            placeholder="Search by name or model number..."
                            value={productSearch}
                            onValueChange={setProductSearch}
                          />
                          <CommandList>
                            <CommandEmpty>
                              <div className="py-4 text-center">
                                <p className="text-sm text-muted-foreground mb-2">No product found</p>
                                {canCreateProduct && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setShowAddProduct(true);
                                      setProductPopoverOpen(false);
                                    }}
                                  >
                                    <Plus className="mr-1 h-3 w-3" />
                                    Add New Product
                                  </Button>
                                )}
                              </div>
                            </CommandEmpty>
                            <CommandGroup>
                              {filteredProducts.map((product) => (
                                <CommandItem
                                  key={product.id}
                                  value={`${product.name} ${product.modelNumber || ""}`}
                                  onSelect={() => selectProduct(product)}
                                >
                                  <div className="flex flex-col">
                                    <span className="font-medium">{product.name}</span>
                                    <span className="text-sm text-muted-foreground">
                                      {product.modelNumber && `Model: ${product.modelNumber} | `}
                                      Warranty: {product.warrantyPeriodMonths} months
                                    </span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}

                  {/* Add new product inline form */}
                  {showAddProduct && (
                    <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">
                          <Package className="mr-1 h-3 w-3" />
                          New Product
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowAddProduct(false);
                            setNewProduct({ name: "", modelNumber: "", categoryId: "", warrantyPeriodMonths: "12" });
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="productName">Product Name *</Label>
                          <Input
                            id="productName"
                            value={newProduct.name}
                            onChange={(e) => handleNewProductChange("name", e.target.value)}
                            placeholder="Enter product name"
                          />
                          {errors["newProduct.name"] && (
                            <p className="text-sm text-destructive">{errors["newProduct.name"]}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="productModel">Model Number</Label>
                          <Input
                            id="productModel"
                            value={newProduct.modelNumber}
                            onChange={(e) => handleNewProductChange("modelNumber", e.target.value)}
                            placeholder="Enter model number"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="productCategory">Category</Label>
                          <Select
                            value={newProduct.categoryId}
                            onValueChange={(value) => handleNewProductChange("categoryId", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select category (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((category) => (
                                <SelectItem key={category.id} value={category.id.toString()}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="productWarranty">Warranty Period (months) *</Label>
                          <Input
                            id="productWarranty"
                            type="number"
                            min="1"
                            value={newProduct.warrantyPeriodMonths}
                            onChange={(e) => handleNewProductChange("warrantyPeriodMonths", e.target.value)}
                            placeholder="12"
                          />
                          {errors["newProduct.warrantyPeriodMonths"] && (
                            <p className="text-sm text-destructive">{errors["newProduct.warrantyPeriodMonths"]}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        onClick={handleCreateProduct}
                        disabled={addingProduct}
                        className="w-full"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        {addingProduct ? "Creating..." : "Create Product"}
                      </Button>
                    </div>
                  )}

                  {errors.productId && (
                    <p className="text-sm text-destructive">{errors.productId}</p>
                  )}
                </div>

                {/* Serial Number */}
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
              </CardContent>
            </Card>

            {/* Shop & Customer Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Shop & Customer</CardTitle>
                <CardDescription>
                  Shop is required. Customer is optional - you can search existing customers or add a new one.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Shop Selection - Required */}
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

                {/* Customer Selection - Optional */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Customer (Optional)</Label>
                    {!showAddCustomer && !selectedCustomer && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAddCustomer(true)}
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Add New
                      </Button>
                    )}
                  </div>

                  {/* Show selected customer */}
                  {selectedCustomer && !showAddCustomer && (
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium">{selectedCustomer.name}</p>
                        <p className="text-sm text-muted-foreground">{selectedCustomer.phone}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={clearCustomer}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {/* Customer search/select */}
                  {!selectedCustomer && !showAddCustomer && (
                    <Popover open={customerPopoverOpen} onOpenChange={setCustomerPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-start text-muted-foreground font-normal"
                        >
                          <Search className="mr-2 h-4 w-4" />
                          Search existing customer...
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <Command>
                          <CommandInput
                            placeholder="Search by name or phone..."
                            value={customerSearch}
                            onValueChange={setCustomerSearch}
                          />
                          <CommandList>
                            <CommandEmpty>
                              <div className="py-4 text-center">
                                <p className="text-sm text-muted-foreground mb-2">No customer found</p>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setShowAddCustomer(true);
                                    setCustomerPopoverOpen(false);
                                  }}
                                >
                                  <Plus className="mr-1 h-3 w-3" />
                                  Add New Customer
                                </Button>
                              </div>
                            </CommandEmpty>
                            <CommandGroup>
                              {filteredCustomers.map((customer) => (
                                <CommandItem
                                  key={customer.id}
                                  value={`${customer.name} ${customer.phone}`}
                                  onSelect={() => selectCustomer(customer)}
                                >
                                  <div className="flex flex-col">
                                    <span className="font-medium">{customer.name}</span>
                                    <span className="text-sm text-muted-foreground">
                                      {customer.phone}
                                      {customer.email && ` | ${customer.email}`}
                                    </span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}

                  {/* Add new customer inline form */}
                  {showAddCustomer && (
                    <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">New Customer</Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowAddCustomer(false);
                            setNewCustomer({ name: "", phone: "", email: "" });
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="customerName">Name *</Label>
                          <Input
                            id="customerName"
                            value={newCustomer.name}
                            onChange={(e) => handleNewCustomerChange("name", e.target.value)}
                            placeholder="Customer name"
                          />
                          {errors["newCustomer.name"] && (
                            <p className="text-sm text-destructive">{errors["newCustomer.name"]}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="customerPhone">Phone *</Label>
                          <Input
                            id="customerPhone"
                            value={newCustomer.phone}
                            onChange={(e) => handleNewCustomerChange("phone", e.target.value)}
                            placeholder="Phone number"
                          />
                          {errors["newCustomer.phone"] && (
                            <p className="text-sm text-destructive">{errors["newCustomer.phone"]}</p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="customerEmail">Email (Optional)</Label>
                        <Input
                          id="customerEmail"
                          type="email"
                          value={newCustomer.email}
                          onChange={(e) => handleNewCustomerChange("email", e.target.value)}
                          placeholder="Email address"
                        />
                        {errors["newCustomer.email"] && (
                          <p className="text-sm text-destructive">{errors["newCustomer.email"]}</p>
                        )}
                      </div>
                    </div>
                  )}
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
