"use client";

// ===========================================
// Collectors Management Page
// ===========================================

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  User,
  Phone,
  Mail,
  Truck,
  MapPin,
  MoreVertical,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout";
import { DataTable, Column } from "@/components/tables";
import { Button } from "@/components/ui/button";
import { StatusBadge, ConfirmDialog } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Collector {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  vehicleNumber: string | null;
  vehicleType: string | null;
  assignedAreas: string[];
  status: "ACTIVE" | "INACTIVE" | "ON_LEAVE";
  user: { id: number; firstName: string; lastName: string; email: string } | null;
  _count: { pickups: number; deliveries: number };
}

interface CollectorFormData {
  name: string;
  phone: string;
  email: string;
  vehicleNumber: string;
  vehicleType: string;
  assignedAreas: string[];
  status: "ACTIVE" | "INACTIVE" | "ON_LEAVE";
}

const initialFormData: CollectorFormData = {
  name: "",
  phone: "",
  email: "",
  vehicleNumber: "",
  vehicleType: "",
  assignedAreas: [],
  status: "ACTIVE",
};

export default function CollectorsPage() {
  const [collectors, setCollectors] = useState<Collector[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<CollectorFormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [areasInput, setAreasInput] = useState("");

  // Fetch collectors
  const fetchCollectors = useCallback(async () => {
    try {
      const res = await fetch("/api/logistics/collectors?limit=100");
      const data = await res.json();
      if (data.success) {
        setCollectors(data.data);
      }
    } catch (error) {
      console.error("Error fetching collectors:", error);
      toast.error("Failed to load collectors");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCollectors();
  }, [fetchCollectors]);

  // Open dialog for new collector
  const handleNew = () => {
    setEditingId(null);
    setFormData(initialFormData);
    setAreasInput("");
    setIsDialogOpen(true);
  };

  // Open dialog for editing
  const handleEdit = (collector: Collector) => {
    setEditingId(collector.id);
    setFormData({
      name: collector.name,
      phone: collector.phone,
      email: collector.email || "",
      vehicleNumber: collector.vehicleNumber || "",
      vehicleType: collector.vehicleType || "",
      assignedAreas: collector.assignedAreas || [],
      status: collector.status,
    });
    setAreasInput((collector.assignedAreas || []).join(", "));
    setIsDialogOpen(true);
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Parse areas from comma-separated input
      const areas = areasInput
        .split(",")
        .map((a) => a.trim())
        .filter((a) => a);

      const payload = {
        ...formData,
        assignedAreas: areas,
      };

      const url = editingId
        ? `/api/logistics/collectors/${editingId}`
        : "/api/logistics/collectors";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(editingId ? "Collector updated" : "Collector created");
        setIsDialogOpen(false);
        fetchCollectors();
      } else {
        toast.error(data.error?.message || "Failed to save collector");
      }
    } catch (error) {
      console.error("Error saving collector:", error);
      toast.error("Failed to save collector");
    } finally {
      setSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteId) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/logistics/collectors/${deleteId}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Collector deleted successfully");
        fetchCollectors();
      } else {
        toast.error(data.error?.message || "Failed to delete collector");
      }
    } catch (error) {
      console.error("Error deleting collector:", error);
      toast.error("Failed to delete collector");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  // Table columns
  const columns: Column<Collector>[] = [
    {
      key: "name",
      title: "Collector",
      sortable: true,
      render: (collector) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="font-medium">{collector.name}</div>
            {collector.email && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Mail className="h-3 w-3" />
                {collector.email}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "phone",
      title: "Phone",
      render: (collector) => (
        <div className="flex items-center gap-1">
          <Phone className="h-4 w-4 text-muted-foreground" />
          {collector.phone}
        </div>
      ),
    },
    {
      key: "vehicle",
      title: "Vehicle",
      render: (collector) =>
        collector.vehicleNumber ? (
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium">{collector.vehicleNumber}</div>
              {collector.vehicleType && (
                <div className="text-sm text-muted-foreground">
                  {collector.vehicleType}
                </div>
              )}
            </div>
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      key: "areas",
      title: "Assigned Areas",
      render: (collector) =>
        collector.assignedAreas && collector.assignedAreas.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {collector.assignedAreas.slice(0, 2).map((area) => (
              <Badge key={area} variant="outline" className="text-xs">
                <MapPin className="mr-1 h-3 w-3" />
                {area}
              </Badge>
            ))}
            {collector.assignedAreas.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{collector.assignedAreas.length - 2}
              </Badge>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      key: "tasks",
      title: "Tasks",
      render: (collector) => (
        <div className="flex gap-2">
          <Badge variant="outline" className="text-xs">
            {collector._count.pickups} pickups
          </Badge>
          <Badge variant="outline" className="text-xs">
            {collector._count.deliveries} deliveries
          </Badge>
        </div>
      ),
    },
    {
      key: "status",
      title: "Status",
      render: (collector) => <StatusBadge status={collector.status} />,
    },
    {
      key: "actions",
      title: "",
      render: (collector) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEdit(collector)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setDeleteId(collector.id)}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Collectors"
        description="Manage pickup and delivery collectors"
        actions={
          <Button onClick={handleNew}>
            <Plus className="mr-2 h-4 w-4" />
            Add Collector
          </Button>
        }
      />

      <DataTable
        data={collectors}
        columns={columns}
        searchKey="name"
        searchPlaceholder="Search collectors..."
        emptyMessage={loading ? "Loading..." : "No collectors found"}
        emptyDescription="Get started by adding your first collector."
      />

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Collector" : "Add Collector"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update collector information"
                : "Add a new collector for pickups and deliveries"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter collector name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="Enter phone number"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="Enter email address"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                <Input
                  id="vehicleNumber"
                  value={formData.vehicleNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, vehicleNumber: e.target.value })
                  }
                  placeholder="e.g., MH12AB1234"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicleType">Vehicle Type</Label>
                <Input
                  id="vehicleType"
                  value={formData.vehicleType}
                  onChange={(e) =>
                    setFormData({ ...formData, vehicleType: e.target.value })
                  }
                  placeholder="e.g., Bike, Van"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="areas">Assigned Areas</Label>
              <Input
                id="areas"
                value={areasInput}
                onChange={(e) => setAreasInput(e.target.value)}
                placeholder="Enter areas, comma separated"
              />
              <p className="text-xs text-muted-foreground">
                Separate multiple areas with commas
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    status: value as CollectorFormData["status"],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                  <SelectItem value="ON_LEAVE">On Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : editingId ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Collector"
        description="Are you sure you want to delete this collector? This action cannot be undone. The collector must not have any active pickups or deliveries."
        confirmText="Delete"
        onConfirm={handleDelete}
        isLoading={deleting}
        variant="destructive"
      />
    </div>
  );
}
