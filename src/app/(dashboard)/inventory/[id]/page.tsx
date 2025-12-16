"use client";

// ===========================================
// Inventory Item Detail/Edit Page
// ===========================================

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Package,
  Save,
  History,
  Plus,
  Minus,
  ArrowUpDown,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ConfirmDialog } from "@/components/common";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface InventoryCategory {
  id: number;
  name: string;
}

interface Transaction {
  id: number;
  type: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  unitCost: number | null;
  reason: string | null;
  reference: string | null;
  createdAt: string;
  performedByUser: {
    firstName: string;
    lastName: string;
  } | null;
}

interface InventoryItem {
  id: number;
  name: string;
  sku: string | null;
  description: string | null;
  categoryId: number | null;
  unitPrice: number;
  currentStock: number;
  minStockLevel: number;
  maxStockLevel: number | null;
  isActive: boolean;
  category: { id: number; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export default function InventoryItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Stock adjustment
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [adjustType, setAdjustType] = useState<"ADD" | "REMOVE" | "SET">("ADD");
  const [adjustQuantity, setAdjustQuantity] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    description: "",
    categoryId: "",
    unitPrice: "",
    minStockLevel: "",
    maxStockLevel: "",
    isActive: true,
  });

  // Fetch item
  const fetchItem = async () => {
    try {
      const res = await fetch(`/api/inventory/items/${id}`);
      const data = await res.json();
      if (data.success) {
        setItem(data.data);
        setFormData({
          name: data.data.name,
          sku: data.data.sku || "",
          description: data.data.description || "",
          categoryId: data.data.categoryId?.toString() || "",
          unitPrice: data.data.unitPrice.toString(),
          minStockLevel: data.data.minStockLevel.toString(),
          maxStockLevel: data.data.maxStockLevel?.toString() || "",
          isActive: data.data.isActive,
        });
      } else {
        toast.error("Item not found");
        router.push("/inventory");
      }
    } catch (error) {
      console.error("Error fetching item:", error);
      toast.error("Failed to load item");
    } finally {
      setLoading(false);
    }
  };

  // Fetch transactions
  const fetchTransactions = async () => {
    try {
      const res = await fetch(`/api/inventory/items/${id}/transactions?limit=50`);
      const data = await res.json();
      if (data.success) {
        setTransactions(data.data);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
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
    fetchItem();
    fetchTransactions();
    fetchCategories();
  }, [id]);

  // Handle form change
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Handle save
  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Item name is required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        sku: formData.sku || null,
        description: formData.description || null,
        categoryId: formData.categoryId ? parseInt(formData.categoryId) : null,
        unitPrice: parseFloat(formData.unitPrice),
        minStockLevel: parseInt(formData.minStockLevel) || 0,
        maxStockLevel: formData.maxStockLevel ? parseInt(formData.maxStockLevel) : null,
        isActive: formData.isActive,
      };

      const res = await fetch(`/api/inventory/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Item updated successfully");
        setItem(data.data);
      } else {
        toast.error(data.error?.message || "Failed to update item");
      }
    } catch (error) {
      console.error("Error updating item:", error);
      toast.error("Failed to update item");
    } finally {
      setSaving(false);
    }
  };

  // Handle stock adjustment
  const handleAdjust = async () => {
    if (!adjustQuantity || parseInt(adjustQuantity) <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    setAdjusting(true);
    try {
      const res = await fetch(`/api/inventory/items/${id}/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: adjustType,
          quantity: parseInt(adjustQuantity),
          reason: adjustReason || undefined,
        }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Stock adjusted successfully");
        setItem(data.data);
        fetchTransactions();
        setAdjustDialogOpen(false);
        setAdjustQuantity("");
        setAdjustReason("");
      } else {
        toast.error(data.error?.message || "Failed to adjust stock");
      }
    } catch (error) {
      console.error("Error adjusting stock:", error);
      toast.error("Failed to adjust stock");
    } finally {
      setAdjusting(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/inventory/items/${id}`, { method: "DELETE" });
      const data = await res.json();

      if (data.success) {
        toast.success("Item deleted successfully");
        router.push("/inventory");
      } else {
        toast.error(data.error?.message || "Failed to delete item");
      }
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error("Failed to delete item");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  // Get transaction type badge
  const getTransactionBadge = (type: string) => {
    switch (type) {
      case "ADD":
      case "PURCHASE":
      case "RETURN":
        return <Badge className="bg-green-500">+{type}</Badge>;
      case "REMOVE":
      case "ISSUE":
      case "DAMAGE":
        return <Badge className="bg-red-500">-{type}</Badge>;
      case "ADJUSTMENT":
        return <Badge className="bg-blue-500">{type}</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!item) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={item.name}
        description={item.sku ? `SKU: ${item.sku}` : "Inventory Item"}
        backUrl="/inventory"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="text-destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="transactions">
            Transactions ({transactions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          {/* Stock Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Stock Status</span>
                <Button onClick={() => setAdjustDialogOpen(true)}>
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                  Adjust Stock
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-muted rounded-lg">
                  <div
                    className={`text-3xl font-bold ${
                      item.currentStock <= item.minStockLevel
                        ? "text-destructive"
                        : "text-green-600"
                    }`}
                  >
                    {item.currentStock}
                  </div>
                  <div className="text-sm text-muted-foreground">Current Stock</div>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-3xl font-bold text-yellow-600">
                    {item.minStockLevel}
                  </div>
                  <div className="text-sm text-muted-foreground">Min Level</div>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-3xl font-bold">
                    {item.maxStockLevel || "-"}
                  </div>
                  <div className="text-sm text-muted-foreground">Max Level</div>
                </div>
              </div>
              {item.currentStock <= item.minStockLevel && (
                <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-lg text-center">
                  ⚠️ Stock is below minimum level. Consider restocking.
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Basic Information
                </CardTitle>
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

            {/* Pricing & Stock Levels */}
            <Card>
              <CardHeader>
                <CardTitle>Pricing & Stock Levels</CardTitle>
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

                <Separator />

                <div className="text-sm text-muted-foreground">
                  <p>Created: {format(new Date(item.createdAt), "PPp")}</p>
                  <p>Updated: {format(new Date(item.updatedAt), "PPp")}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Transaction History
              </CardTitle>
              <CardDescription>
                Record of all stock changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No transactions yet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Before</TableHead>
                      <TableHead>After</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>By</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>{getTransactionBadge(tx.type)}</TableCell>
                        <TableCell className="font-medium">
                          {tx.type === "REMOVE" || tx.type === "ISSUE" || tx.type === "DAMAGE"
                            ? `-${tx.quantity}`
                            : `+${tx.quantity}`}
                        </TableCell>
                        <TableCell>{tx.previousStock}</TableCell>
                        <TableCell>{tx.newStock}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {tx.reason || "-"}
                        </TableCell>
                        <TableCell>
                          {tx.performedByUser
                            ? `${tx.performedByUser.firstName} ${tx.performedByUser.lastName}`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {format(new Date(tx.createdAt), "dd MMM HH:mm")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Stock Adjustment Dialog */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
            <DialogDescription>
              Current stock: {item.currentStock} units
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Adjustment Type</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={adjustType === "ADD" ? "default" : "outline"}
                  onClick={() => setAdjustType("ADD")}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add
                </Button>
                <Button
                  variant={adjustType === "REMOVE" ? "default" : "outline"}
                  onClick={() => setAdjustType("REMOVE")}
                  className="w-full"
                >
                  <Minus className="mr-2 h-4 w-4" />
                  Remove
                </Button>
                <Button
                  variant={adjustType === "SET" ? "default" : "outline"}
                  onClick={() => setAdjustType("SET")}
                  className="w-full"
                >
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                  Set
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adjustQuantity">
                {adjustType === "SET" ? "New Stock Level" : "Quantity"}
              </Label>
              <Input
                id="adjustQuantity"
                type="number"
                min="0"
                value={adjustQuantity}
                onChange={(e) => setAdjustQuantity(e.target.value)}
                placeholder="Enter quantity"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="adjustReason">Reason</Label>
              <Textarea
                id="adjustReason"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="Reason for adjustment..."
                rows={2}
              />
            </div>

            {adjustQuantity && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">
                  New stock will be:{" "}
                  <span className="font-bold">
                    {adjustType === "ADD"
                      ? item.currentStock + parseInt(adjustQuantity || "0")
                      : adjustType === "REMOVE"
                      ? Math.max(0, item.currentStock - parseInt(adjustQuantity || "0"))
                      : parseInt(adjustQuantity || "0")}
                  </span>
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAdjustDialogOpen(false)}
              disabled={adjusting}
            >
              Cancel
            </Button>
            <Button onClick={handleAdjust} disabled={adjusting}>
              {adjusting ? "Adjusting..." : "Confirm Adjustment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
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
