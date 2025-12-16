"use client";

// ===========================================
// Claim Finalization Section Component
// Displays after workflow completion for adding parts,
// service charges, and generating invoices
// ===========================================

import { useState, useEffect, useCallback } from "react";
import {
  Package,
  Wrench,
  FileText,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Edit,
  Send,
  Download,
  ChevronRight,
  Box,
  CircleDollarSign,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

// Types
interface Part {
  id: number;
  partType: "INVENTORY" | "MANUAL";
  inventoryItemId: number | null;
  name: string;
  description: string | null;
  sku: string | null;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  totalPrice: number;
  isWarrantyCovered: boolean;
  isNewItemIssue: boolean;
  isIssued: boolean;
  issuedAt: string | null;
  notes: string | null;
  inventoryItem?: {
    id: number;
    sku: string;
    name: string;
    quantity: number;
  };
  issuedByUser?: {
    id: number;
    firstName: string | null;
    lastName: string | null;
  };
  createdByUser: {
    id: number;
    firstName: string | null;
    lastName: string | null;
  };
}

interface ServiceCharge {
  id: number;
  chargeType: "LABOR" | "SERVICE_VISIT" | "TRANSPORTATION" | "DIAGNOSIS" | "INSTALLATION" | "OTHER";
  description: string;
  amount: number;
  isWarrantyCovered: boolean;
  notes: string | null;
  createdByUser: {
    id: number;
    firstName: string | null;
    lastName: string | null;
  };
}

interface Invoice {
  id: number;
  invoiceNumber: string;
  invoiceDate: string;
  status: string;
  customerName: string;
  customerPhone: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountType: string | null;
  discountValue: number;
  discountAmount: number;
  totalAmount: number;
  warrantyCoveredAmount: number;
  paidAmount: number;
  paymentStatus: string;
  isReadyForDelivery: boolean;
  items: any[];
}

interface InventoryItem {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  quantity: number;
  reservedQuantity: number;
  sellingPrice: number;
  costPrice: number;
  availableQuantity: number;
}

interface ClaimFinalizationSectionProps {
  claimId: number;
  isUnderWarranty: boolean;
  isWorkflowCompleted?: boolean;
  onDataChange?: () => void;
}

export function ClaimFinalizationSection({
  claimId,
  isUnderWarranty,
  isWorkflowCompleted = false,
  onDataChange,
}: ClaimFinalizationSectionProps) {
  const [activeTab, setActiveTab] = useState("parts");
  const [loading, setLoading] = useState(true);

  // Parts state
  const [parts, setParts] = useState<Part[]>([]);
  const [partsSummary, setPartsSummary] = useState<any>(null);
  const [showAddPartDialog, setShowAddPartDialog] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);

  // Service charges state
  const [charges, setCharges] = useState<ServiceCharge[]>([]);
  const [chargesSummary, setChargesSummary] = useState<any>(null);
  const [showAddChargeDialog, setShowAddChargeDialog] = useState(false);
  const [editingCharge, setEditingCharge] = useState<ServiceCharge | null>(null);

  // Invoice state
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [showGenerateInvoiceDialog, setShowGenerateInvoiceDialog] = useState(false);

  // Inventory search
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventorySearch, setInventorySearch] = useState("");

  // Form states
  const [partForm, setPartForm] = useState({
    partType: "INVENTORY" as "INVENTORY" | "MANUAL",
    inventoryItemId: null as number | null,
    name: "",
    description: "",
    sku: "",
    quantity: 1,
    unitPrice: 0,
    isWarrantyCovered: false,
    isNewItemIssue: false,
    notes: "",
  });

  const [chargeForm, setChargeForm] = useState({
    chargeType: "LABOR" as "LABOR" | "SERVICE_VISIT" | "TRANSPORTATION" | "DIAGNOSIS" | "INSTALLATION" | "OTHER",
    description: "",
    amount: 0,
    isWarrantyCovered: false,
    notes: "",
  });

  const [invoiceForm, setInvoiceForm] = useState({
    taxRate: 18,
    discountType: null as "PERCENTAGE" | "FIXED" | null,
    discountValue: 0,
    notes: "",
    termsAndConditions: "",
  });

  // Fetch parts
  const fetchParts = useCallback(async () => {
    try {
      const res = await fetch(`/api/claims/${claimId}/parts`);
      const data = await res.json();
      if (data.success) {
        setParts(data.data.parts);
        setPartsSummary(data.data.summary);
      }
    } catch (error) {
      console.error("Error fetching parts:", error);
    }
  }, [claimId]);

  // Fetch service charges
  const fetchCharges = useCallback(async () => {
    try {
      const res = await fetch(`/api/claims/${claimId}/service-charges`);
      const data = await res.json();
      if (data.success) {
        setCharges(data.data.charges);
        setChargesSummary(data.data.summary);
      }
    } catch (error) {
      console.error("Error fetching charges:", error);
    }
  }, [claimId]);

  // Fetch invoice
  const fetchInvoice = useCallback(async () => {
    try {
      const res = await fetch(`/api/claims/${claimId}/invoice`);
      const data = await res.json();
      if (data.success) {
        setInvoice(data.data);
      } else {
        setInvoice(null);
      }
    } catch (error) {
      setInvoice(null);
    }
  }, [claimId]);

  // Fetch inventory items
  const fetchInventoryItems = async (search: string) => {
    try {
      const res = await fetch(`/api/inventory/items?search=${encodeURIComponent(search)}&limit=20`);
      const data = await res.json();
      if (data.success) {
        setInventoryItems(data.data);
      }
    } catch (error) {
      console.error("Error fetching inventory:", error);
    }
  };

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchParts(), fetchCharges(), fetchInvoice()]);
      setLoading(false);
    };
    loadData();
  }, [fetchParts, fetchCharges, fetchInvoice]);

  // Search inventory when typing
  useEffect(() => {
    if (inventorySearch.length >= 2) {
      const timer = setTimeout(() => {
        fetchInventoryItems(inventorySearch);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [inventorySearch]);

  // Reset part form
  const resetPartForm = () => {
    setPartForm({
      partType: "INVENTORY",
      inventoryItemId: null,
      name: "",
      description: "",
      sku: "",
      quantity: 1,
      unitPrice: 0,
      isWarrantyCovered: isUnderWarranty,
      isNewItemIssue: false,
      notes: "",
    });
    setInventorySearch("");
    setInventoryItems([]);
  };

  // Reset charge form
  const resetChargeForm = () => {
    setChargeForm({
      chargeType: "LABOR",
      description: "",
      amount: 0,
      isWarrantyCovered: isUnderWarranty,
      notes: "",
    });
  };

  // Select inventory item
  const selectInventoryItem = (item: InventoryItem) => {
    setPartForm({
      ...partForm,
      inventoryItemId: item.id,
      name: item.name,
      sku: item.sku,
      description: item.description || "",
      unitPrice: item.sellingPrice,
    });
    setInventorySearch(item.name);
  };

  // Add part
  const handleAddPart = async () => {
    try {
      // Clean up the form data - only include inventoryItemId if it's set
      const payload: Record<string, unknown> = {
        partType: partForm.partType,
        name: partForm.name,
        quantity: partForm.quantity,
        unitPrice: partForm.unitPrice,
        isWarrantyCovered: partForm.isWarrantyCovered,
        isNewItemIssue: partForm.isNewItemIssue,
      };

      // Only include optional fields if they have values
      if (partForm.inventoryItemId) {
        payload.inventoryItemId = partForm.inventoryItemId;
      }
      if (partForm.description) {
        payload.description = partForm.description;
      }
      if (partForm.sku) {
        payload.sku = partForm.sku;
      }
      if (partForm.notes) {
        payload.notes = partForm.notes;
      }

      const res = await fetch(`/api/claims/${claimId}/parts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Part added successfully");
        fetchParts();
        setShowAddPartDialog(false);
        resetPartForm();
        onDataChange?.();
      } else {
        toast.error(data.error?.message || "Failed to add part");
      }
    } catch (error) {
      toast.error("Failed to add part");
    }
  };

  // Delete part
  const handleDeletePart = async (partId: number) => {
    if (!confirm("Are you sure you want to remove this part?")) return;
    try {
      const res = await fetch(`/api/claims/${claimId}/parts/${partId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Part removed successfully");
        fetchParts();
        onDataChange?.();
      } else {
        toast.error(data.error?.message || "Failed to remove part");
      }
    } catch (error) {
      toast.error("Failed to remove part");
    }
  };

  // Issue part
  const handleIssuePart = async (partId: number) => {
    try {
      const res = await fetch(`/api/claims/${claimId}/parts/${partId}/issue`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Item issued successfully");
        fetchParts();
        onDataChange?.();
      } else {
        toast.error(data.error?.message || "Failed to issue item");
      }
    } catch (error) {
      toast.error("Failed to issue item");
    }
  };

  // Add service charge
  const handleAddCharge = async () => {
    try {
      const res = await fetch(`/api/claims/${claimId}/service-charges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chargeForm),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Service charge added");
        fetchCharges();
        setShowAddChargeDialog(false);
        resetChargeForm();
        onDataChange?.();
      } else {
        toast.error(data.error?.message || "Failed to add charge");
      }
    } catch (error) {
      toast.error("Failed to add charge");
    }
  };

  // Delete service charge
  const handleDeleteCharge = async (chargeId: number) => {
    if (!confirm("Are you sure you want to remove this charge?")) return;
    try {
      const res = await fetch(`/api/claims/${claimId}/service-charges/${chargeId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Charge removed");
        fetchCharges();
        onDataChange?.();
      } else {
        toast.error(data.error?.message || "Failed to remove charge");
      }
    } catch (error) {
      toast.error("Failed to remove charge");
    }
  };

  // Generate invoice
  const handleGenerateInvoice = async () => {
    try {
      const res = await fetch(`/api/claims/${claimId}/invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invoiceForm),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Invoice generated successfully");
        setInvoice(data.data);
        setShowGenerateInvoiceDialog(false);
        onDataChange?.();
      } else {
        toast.error(data.error?.message || "Failed to generate invoice");
      }
    } catch (error) {
      toast.error("Failed to generate invoice");
    }
  };

  // Mark ready for delivery
  const handleMarkReadyForDelivery = async () => {
    if (!invoice) return;
    try {
      const res = await fetch(`/api/claims/${claimId}/invoice`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isReadyForDelivery: true }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Marked as ready for delivery");
        setInvoice(data.data);
        onDataChange?.();
      } else {
        toast.error(data.error?.message || "Failed to update");
      }
    } catch (error) {
      toast.error("Failed to update");
    }
  };

  // Calculate totals
  const calculateTotals = () => {
    const partsTotal = parts
      .filter((p) => !p.isWarrantyCovered)
      .reduce((sum, p) => sum + p.totalPrice, 0);
    const chargesTotal = charges
      .filter((c) => !c.isWarrantyCovered)
      .reduce((sum, c) => sum + c.amount, 0);
    const warrantyCovered =
      parts.filter((p) => p.isWarrantyCovered).reduce((sum, p) => sum + p.totalPrice, 0) +
      charges.filter((c) => c.isWarrantyCovered).reduce((sum, c) => sum + c.amount, 0);
    return {
      partsTotal,
      chargesTotal,
      subtotal: partsTotal + chargesTotal,
      warrantyCovered,
    };
  };

  const totals = calculateTotals();
  const pendingIssue = parts.filter((p) => p.isNewItemIssue && !p.isIssued);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={isWorkflowCompleted ? "border-green-200 bg-green-50/30" : "border-blue-200 bg-blue-50/30"}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isWorkflowCompleted ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <CircleDollarSign className="h-5 w-5 text-blue-600" />
            )}
            <CardTitle className="text-lg">
              {isWorkflowCompleted ? "Claim Finalization" : "Parts & Charges Management"}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {!isWorkflowCompleted && (
              <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                <AlertCircle className="h-3 w-3 mr-1" />
                Workflow In Progress
              </Badge>
            )}
            {invoice?.isReadyForDelivery && (
              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                <Truck className="h-3 w-3 mr-1" />
                Ready for Delivery
              </Badge>
            )}
          </div>
        </div>
        <CardDescription>
          {isWorkflowCompleted
            ? "Complete all sections below before scheduling delivery"
            : "Add parts and service charges while the claim is being processed"
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6 px-4">
          <div className="flex items-center gap-2">
            <div className={`rounded-full p-2 ${parts.length > 0 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
              <Package className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium">Parts</span>
            {parts.length > 0 && <CheckCircle2 className="h-4 w-4 text-green-600" />}
          </div>
          <ChevronRight className="h-4 w-4 text-gray-400" />
          <div className="flex items-center gap-2">
            <div className={`rounded-full p-2 ${charges.length > 0 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
              <Wrench className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium">Charges</span>
            {charges.length > 0 && <CheckCircle2 className="h-4 w-4 text-green-600" />}
          </div>
          <ChevronRight className="h-4 w-4 text-gray-400" />
          <div className="flex items-center gap-2">
            <div className={`rounded-full p-2 ${pendingIssue.length === 0 ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
              <Box className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium">Issue</span>
            {pendingIssue.length === 0 && parts.some((p) => p.isNewItemIssue) && (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            )}
          </div>
          <ChevronRight className="h-4 w-4 text-gray-400" />
          <div className="flex items-center gap-2">
            <div className={`rounded-full p-2 ${invoice ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
              <FileText className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium">Invoice</span>
            {invoice && <CheckCircle2 className="h-4 w-4 text-green-600" />}
          </div>
        </div>

        <Separator className="mb-4" />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="parts" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Parts ({parts.length})
            </TabsTrigger>
            <TabsTrigger value="charges" className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Charges ({charges.length})
            </TabsTrigger>
            <TabsTrigger value="issue" className="flex items-center gap-2">
              <Box className="h-4 w-4" />
              Issue {pendingIssue.length > 0 && <Badge variant="destructive" className="ml-1 h-5 px-1">{pendingIssue.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="invoice" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Invoice
            </TabsTrigger>
          </TabsList>

          {/* Parts Tab */}
          <TabsContent value="parts" className="mt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium">Parts Used in Repair</h3>
              <Button size="sm" onClick={() => { resetPartForm(); setShowAddPartDialog(true); }}>
                <Plus className="h-4 w-4 mr-1" />
                Add Part
              </Button>
            </div>

            {parts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No parts added yet</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Part</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Coverage</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parts.map((part) => (
                      <TableRow key={part.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{part.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {part.partType === "INVENTORY" ? "From Inventory" : "Manual Entry"}
                              {part.isNewItemIssue && (
                                <Badge variant="outline" className="ml-2 text-xs">New Item</Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{part.sku || "-"}</TableCell>
                        <TableCell className="text-right">{part.quantity}</TableCell>
                        <TableCell className="text-right">{part.unitPrice.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">{part.totalPrice.toFixed(2)}</TableCell>
                        <TableCell>
                          {part.isWarrantyCovered ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              Warranty
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              Customer
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {!invoice && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDeletePart(part.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {partsSummary && (
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Warranty Covered:</span>
                        <span className="ml-2 font-medium text-green-600">
                          {partsSummary.warrantyCoveredAmount.toFixed(2)} ({parts.filter((p) => p.isWarrantyCovered).length} items)
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Customer Charged:</span>
                        <span className="ml-2 font-medium text-blue-600">
                          {partsSummary.customerChargedAmount.toFixed(2)} ({parts.filter((p) => !p.isWarrantyCovered).length} items)
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Service Charges Tab */}
          <TabsContent value="charges" className="mt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium">Service & Labor Charges</h3>
              <Button size="sm" onClick={() => { resetChargeForm(); setShowAddChargeDialog(true); }}>
                <Plus className="h-4 w-4 mr-1" />
                Add Charge
              </Button>
            </div>

            {charges.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Wrench className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No service charges added yet</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Coverage</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {charges.map((charge) => (
                      <TableRow key={charge.id}>
                        <TableCell>
                          <Badge variant="outline">{charge.chargeType.replace("_", " ")}</Badge>
                        </TableCell>
                        <TableCell>{charge.description}</TableCell>
                        <TableCell className="text-right font-medium">{charge.amount.toFixed(2)}</TableCell>
                        <TableCell>
                          {charge.isWarrantyCovered ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              Warranty
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              Customer
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {!invoice && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDeleteCharge(charge.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {chargesSummary && (
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Warranty Covered:</span>
                        <span className="ml-2 font-medium text-green-600">
                          {chargesSummary.warrantyCoveredAmount.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Customer Charged:</span>
                        <span className="ml-2 font-medium text-blue-600">
                          {chargesSummary.customerChargedAmount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Items to Issue Tab */}
          <TabsContent value="issue" className="mt-4">
            <h3 className="font-medium mb-4">Items to Issue</h3>
            <p className="text-sm text-muted-foreground mb-4">
              New items to be given to customer (replacement/additional products)
            </p>

            {parts.filter((p) => p.isNewItemIssue).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Box className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No items marked for issue</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parts.filter((p) => p.isNewItemIssue).map((part) => (
                    <TableRow key={part.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{part.name}</div>
                          <div className="text-xs text-muted-foreground">{part.sku || "-"}</div>
                        </div>
                      </TableCell>
                      <TableCell>{part.quantity}</TableCell>
                      <TableCell className="text-right">{part.totalPrice.toFixed(2)}</TableCell>
                      <TableCell>
                        {part.isIssued ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Issued
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Not Issued
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {!part.isIssued && (
                          <Button size="sm" onClick={() => handleIssuePart(part.id)}>
                            Issue Now
                          </Button>
                        )}
                        {part.isIssued && part.issuedAt && (
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(part.issuedAt), "dd MMM yyyy")}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {pendingIssue.length > 0 && (
              <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center gap-2 text-orange-700">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">
                    {pendingIssue.length} item(s) pending issue. Issue all items before generating invoice.
                  </span>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Invoice Tab */}
          <TabsContent value="invoice" className="mt-4">
            {!invoice ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="font-medium mb-2">No Invoice Generated</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Review parts and charges, then generate the invoice
                </p>

                {/* Summary before generating */}
                <div className="max-w-md mx-auto p-4 bg-muted/50 rounded-lg text-left mb-4">
                  <h4 className="font-medium mb-2">Summary</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Parts ({parts.filter((p) => !p.isWarrantyCovered).length})</span>
                      <span>{totals.partsTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Service Charges ({charges.filter((c) => !c.isWarrantyCovered).length})</span>
                      <span>{totals.chargesTotal.toFixed(2)}</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between font-medium">
                      <span>Customer Subtotal</span>
                      <span>{totals.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>Warranty Covered</span>
                      <span>{totals.warrantyCovered.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => setShowGenerateInvoiceDialog(true)}
                  disabled={!isWorkflowCompleted || pendingIssue.length > 0 || (parts.length === 0 && charges.length === 0)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Invoice
                </Button>

                {!isWorkflowCompleted && (
                  <p className="text-xs text-blue-600 mt-2">
                    Complete the workflow before generating invoice
                  </p>
                )}
                {isWorkflowCompleted && pendingIssue.length > 0 && (
                  <p className="text-xs text-orange-600 mt-2">
                    Issue all pending items before generating invoice
                  </p>
                )}
              </div>
            ) : (
              <div>
                {/* Invoice Preview */}
                <div className="border rounded-lg p-6 bg-white">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-xl font-bold">SERVICE INVOICE</h3>
                      <p className="text-sm text-muted-foreground">Invoice #: {invoice.invoiceNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        Date: {format(new Date(invoice.invoiceDate), "dd MMM yyyy")}
                      </p>
                    </div>
                    <Badge
                      variant={invoice.paymentStatus === "PAID" ? "default" : invoice.paymentStatus === "PARTIAL" ? "secondary" : "outline"}
                    >
                      {invoice.paymentStatus}
                    </Badge>
                  </div>

                  <div className="mb-6">
                    <p className="font-medium">{invoice.customerName}</p>
                    <p className="text-sm text-muted-foreground">{invoice.customerPhone}</p>
                  </div>

                  <Separator className="my-4" />

                  {/* Items */}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoice.items.filter((i: any) => !i.isWarrantyCovered).map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">{Number(item.unitPrice).toFixed(2)}</TableCell>
                          <TableCell className="text-right">{Number(item.totalPrice).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {invoice.items.some((i: any) => i.isWarrantyCovered) && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Warranty Covered (not charged): {invoice.warrantyCoveredAmount.toFixed(2)}
                    </p>
                  )}

                  <Separator className="my-4" />

                  {/* Totals */}
                  <div className="flex justify-end">
                    <div className="w-64 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>{Number(invoice.subtotal).toFixed(2)}</span>
                      </div>
                      {invoice.discountAmount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Discount:</span>
                          <span>-{Number(invoice.discountAmount).toFixed(2)}</span>
                        </div>
                      )}
                      {invoice.taxAmount > 0 && (
                        <div className="flex justify-between">
                          <span>Tax ({invoice.taxRate}%):</span>
                          <span>{Number(invoice.taxAmount).toFixed(2)}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total:</span>
                        <span>{Number(invoice.totalAmount).toFixed(2)}</span>
                      </div>
                      {invoice.paidAmount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Paid:</span>
                          <span>{Number(invoice.paidAmount).toFixed(2)}</span>
                        </div>
                      )}
                      {invoice.paymentStatus !== "PAID" && (
                        <div className="flex justify-between font-medium">
                          <span>Balance:</span>
                          <span>{(Number(invoice.totalAmount) - Number(invoice.paidAmount)).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-between items-center mt-4">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-1" />
                      Download PDF
                    </Button>
                    <Button variant="outline" size="sm">
                      <Send className="h-4 w-4 mr-1" />
                      Send to Customer
                    </Button>
                  </div>

                  {!invoice.isReadyForDelivery && (
                    <Button onClick={handleMarkReadyForDelivery}>
                      <Truck className="h-4 w-4 mr-1" />
                      Mark Ready for Delivery
                    </Button>
                  )}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Add Part Dialog */}
        <Dialog open={showAddPartDialog} onOpenChange={setShowAddPartDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Part</DialogTitle>
              <DialogDescription>Add a part or component used in the repair</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={partForm.partType === "INVENTORY"}
                    onChange={() => setPartForm({ ...partForm, partType: "INVENTORY", inventoryItemId: null })}
                  />
                  From Inventory
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={partForm.partType === "MANUAL"}
                    onChange={() => setPartForm({ ...partForm, partType: "MANUAL", inventoryItemId: null })}
                  />
                  Manual Entry
                </label>
              </div>

              {partForm.partType === "INVENTORY" && (
                <div className="relative">
                  <Label>Search Inventory</Label>
                  <Input
                    placeholder="Search by name or SKU..."
                    value={inventorySearch}
                    onChange={(e) => setInventorySearch(e.target.value)}
                  />
                  {inventoryItems.length > 0 && inventorySearch.length >= 2 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-auto">
                      {inventoryItems.map((item) => (
                        <div
                          key={item.id}
                          className="px-3 py-2 hover:bg-muted cursor-pointer"
                          onClick={() => selectInventoryItem(item)}
                        >
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-muted-foreground">
                            SKU: {item.sku} | Stock: {item.availableQuantity} | Price: {item.sellingPrice}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={partForm.name}
                    onChange={(e) => setPartForm({ ...partForm, name: e.target.value })}
                    disabled={partForm.partType === "INVENTORY" && !!partForm.inventoryItemId}
                  />
                </div>
                <div>
                  <Label>SKU</Label>
                  <Input
                    value={partForm.sku}
                    onChange={(e) => setPartForm({ ...partForm, sku: e.target.value })}
                    disabled={partForm.partType === "INVENTORY" && !!partForm.inventoryItemId}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={partForm.quantity}
                    onChange={(e) => setPartForm({ ...partForm, quantity: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Unit Price</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={partForm.unitPrice}
                    onChange={(e) => setPartForm({ ...partForm, unitPrice: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="isWarrantyCovered"
                    checked={partForm.isWarrantyCovered}
                    onCheckedChange={(checked) => setPartForm({ ...partForm, isWarrantyCovered: !!checked })}
                  />
                  <label htmlFor="isWarrantyCovered" className="text-sm">Under Warranty (no charge)</label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="isNewItemIssue"
                    checked={partForm.isNewItemIssue}
                    onCheckedChange={(checked) => setPartForm({ ...partForm, isNewItemIssue: !!checked })}
                  />
                  <label htmlFor="isNewItemIssue" className="text-sm">New Item to Issue</label>
                </div>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={partForm.notes}
                  onChange={(e) => setPartForm({ ...partForm, notes: e.target.value })}
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddPartDialog(false)}>Cancel</Button>
              <Button onClick={handleAddPart} disabled={!partForm.name || partForm.quantity <= 0}>
                Add Part
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Charge Dialog */}
        <Dialog open={showAddChargeDialog} onOpenChange={setShowAddChargeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Service Charge</DialogTitle>
              <DialogDescription>Add a service or labor charge</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Charge Type</Label>
                <Select
                  value={chargeForm.chargeType}
                  onValueChange={(v: any) => setChargeForm({ ...chargeForm, chargeType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LABOR">Labor</SelectItem>
                    <SelectItem value="SERVICE_VISIT">Service Visit</SelectItem>
                    <SelectItem value="TRANSPORTATION">Transportation</SelectItem>
                    <SelectItem value="DIAGNOSIS">Diagnosis</SelectItem>
                    <SelectItem value="INSTALLATION">Installation</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Description</Label>
                <Input
                  value={chargeForm.description}
                  onChange={(e) => setChargeForm({ ...chargeForm, description: e.target.value })}
                  placeholder="e.g., Compressor replacement labor"
                />
              </div>

              <div>
                <Label>Amount</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={chargeForm.amount}
                  onChange={(e) => setChargeForm({ ...chargeForm, amount: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="chargeWarrantyCovered"
                  checked={chargeForm.isWarrantyCovered}
                  onCheckedChange={(checked) => setChargeForm({ ...chargeForm, isWarrantyCovered: !!checked })}
                />
                <label htmlFor="chargeWarrantyCovered" className="text-sm">Under Warranty (no charge)</label>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={chargeForm.notes}
                  onChange={(e) => setChargeForm({ ...chargeForm, notes: e.target.value })}
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddChargeDialog(false)}>Cancel</Button>
              <Button onClick={handleAddCharge} disabled={!chargeForm.description || chargeForm.amount <= 0}>
                Add Charge
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Generate Invoice Dialog */}
        <Dialog open={showGenerateInvoiceDialog} onOpenChange={setShowGenerateInvoiceDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate Invoice</DialogTitle>
              <DialogDescription>Configure tax and discount settings</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Tax Rate (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={invoiceForm.taxRate}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, taxRate: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Discount Type</Label>
                  <Select
                    value={invoiceForm.discountType || "none"}
                    onValueChange={(v) => setInvoiceForm({ ...invoiceForm, discountType: v === "none" ? null : v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No discount" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Discount</SelectItem>
                      <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                      <SelectItem value="FIXED">Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Discount Value</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={invoiceForm.discountValue}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, discountValue: parseFloat(e.target.value) || 0 })}
                    disabled={!invoiceForm.discountType}
                  />
                </div>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={invoiceForm.notes}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                  rows={2}
                  placeholder="Additional notes for the invoice..."
                />
              </div>

              {/* Preview */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Preview</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{totals.subtotal.toFixed(2)}</span>
                  </div>
                  {invoiceForm.discountType && invoiceForm.discountValue > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount:</span>
                      <span>
                        -{invoiceForm.discountType === "PERCENTAGE"
                          ? ((totals.subtotal * invoiceForm.discountValue) / 100).toFixed(2)
                          : Math.min(invoiceForm.discountValue, totals.subtotal).toFixed(2)}
                      </span>
                    </div>
                  )}
                  {invoiceForm.taxRate > 0 && (
                    <div className="flex justify-between">
                      <span>Tax ({invoiceForm.taxRate}%):</span>
                      <span>
                        {(() => {
                          const afterDiscount = invoiceForm.discountType
                            ? totals.subtotal - (invoiceForm.discountType === "PERCENTAGE"
                              ? (totals.subtotal * invoiceForm.discountValue) / 100
                              : Math.min(invoiceForm.discountValue, totals.subtotal))
                            : totals.subtotal;
                          return ((afterDiscount * invoiceForm.taxRate) / 100).toFixed(2);
                        })()}
                      </span>
                    </div>
                  )}
                  <Separator className="my-1" />
                  <div className="flex justify-between font-bold">
                    <span>Estimated Total:</span>
                    <span>
                      {(() => {
                        const afterDiscount = invoiceForm.discountType
                          ? totals.subtotal - (invoiceForm.discountType === "PERCENTAGE"
                            ? (totals.subtotal * invoiceForm.discountValue) / 100
                            : Math.min(invoiceForm.discountValue, totals.subtotal))
                          : totals.subtotal;
                        const tax = (afterDiscount * invoiceForm.taxRate) / 100;
                        return (afterDiscount + tax).toFixed(2);
                      })()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowGenerateInvoiceDialog(false)}>Cancel</Button>
              <Button onClick={handleGenerateInvoice}>
                <FileText className="h-4 w-4 mr-1" />
                Generate Invoice
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
