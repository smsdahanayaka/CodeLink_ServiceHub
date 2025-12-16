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
  UserPlus,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Collector {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  vehicleNumber: string | null;
  vehicleType: string | null;
  assignedAreas: string[];
  status: "ACTIVE" | "INACTIVE" | "ON_LEAVE";
  userId: number | null;
  user: { id: number; firstName: string; lastName: string; email: string } | null;
  _count: { pickups: number; deliveries: number };
}

interface CollectorUser {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
}

interface CollectorFormData {
  userId: number | null;
  name: string;
  phone: string;
  email: string;
  vehicleNumber: string;
  vehicleType: string;
  assignedAreas: string[];
  status: "ACTIVE" | "INACTIVE" | "ON_LEAVE";
}

interface NewUserFormData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
}

const initialFormData: CollectorFormData = {
  userId: null,
  name: "",
  phone: "",
  email: "",
  vehicleNumber: "",
  vehicleType: "",
  assignedAreas: [],
  status: "ACTIVE",
};

const initialNewUserData: NewUserFormData = {
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  phone: "",
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

  // Tab state for selecting existing user or creating new
  const [activeTab, setActiveTab] = useState<"existing" | "new">("existing");
  const [newUserData, setNewUserData] = useState<NewUserFormData>(initialNewUserData);
  const [creatingUser, setCreatingUser] = useState(false);

  // Collector-role users for selection
  const [collectorUsers, setCollectorUsers] = useState<CollectorUser[]>([]);
  const [availableUsers, setAvailableUsers] = useState<CollectorUser[]>([]);

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

  // Fetch users with Collector role only
  const fetchCollectorUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users/collectors");
      const data = await res.json();
      if (data.success) {
        setCollectorUsers(data.data);
      }
    } catch (error) {
      console.error("Error fetching collector users:", error);
    }
  }, []);

  useEffect(() => {
    fetchCollectors();
    fetchCollectorUsers();
  }, [fetchCollectors, fetchCollectorUsers]);

  // Update available users when collectors or dialog changes
  useEffect(() => {
    // Filter out users already linked to collectors (except current editing one)
    const linkedUserIds = collectors
      .filter((c) => c.userId && c.id !== editingId)
      .map((c) => c.userId);

    const available = collectorUsers.filter(
      (user) => !linkedUserIds.includes(user.id)
    );
    setAvailableUsers(available);
  }, [collectors, collectorUsers, editingId]);

  // Open dialog for new collector
  const handleNew = () => {
    setEditingId(null);
    setFormData(initialFormData);
    setNewUserData(initialNewUserData);
    setAreasInput("");
    setActiveTab("existing");
    setIsDialogOpen(true);
  };

  // Open dialog for editing
  const handleEdit = (collector: Collector) => {
    setEditingId(collector.id);
    setFormData({
      userId: collector.userId,
      name: collector.name,
      phone: collector.phone,
      email: collector.email || "",
      vehicleNumber: collector.vehicleNumber || "",
      vehicleType: collector.vehicleType || "",
      assignedAreas: collector.assignedAreas || [],
      status: collector.status,
    });
    setAreasInput((collector.assignedAreas || []).join(", "));
    setActiveTab("existing");
    setIsDialogOpen(true);
  };

  // Handle user selection - auto-fill name, email, phone
  const handleUserSelect = (userId: string) => {
    if (userId === "none") {
      setFormData({
        ...formData,
        userId: null,
        name: "",
        email: "",
        phone: "",
      });
      return;
    }

    const selectedUser = collectorUsers.find((u) => u.id === parseInt(userId));
    if (selectedUser) {
      setFormData({
        ...formData,
        userId: selectedUser.id,
        name: `${selectedUser.firstName || ""} ${selectedUser.lastName || ""}`.trim() || selectedUser.email,
        email: selectedUser.email,
        phone: selectedUser.phone || "",
      });
    }
  };

  // Create new user with Collector role
  const handleCreateNewUser = async () => {
    if (!newUserData.email || !newUserData.password || !newUserData.firstName) {
      toast.error("Email, password and first name are required");
      return;
    }

    setCreatingUser(true);
    try {
      const res = await fetch("/api/users/collectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUserData),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Collector user created successfully");
        // Refresh collector users list
        await fetchCollectorUsers();
        // Auto-select the new user
        setFormData({
          ...formData,
          userId: data.data.id,
          name: `${data.data.firstName || ""} ${data.data.lastName || ""}`.trim(),
          email: data.data.email,
          phone: data.data.phone || "",
        });
        // Switch to existing tab
        setActiveTab("existing");
        // Clear new user form
        setNewUserData(initialNewUserData);
      } else {
        toast.error(data.error?.message || "Failed to create user");
      }
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error("Failed to create user");
    } finally {
      setCreatingUser(false);
    }
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate name and phone
    if (!formData.name || !formData.phone) {
      toast.error("Name and phone are required");
      return;
    }

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
          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${collector.user ? "bg-green-100" : "bg-primary/10"}`}>
            <User className={`h-5 w-5 ${collector.user ? "text-green-600" : "text-primary"}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{collector.name}</span>
              {collector.user && (
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                  System User
                </Badge>
              )}
            </div>
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
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>
              {editingId ? "Edit Collector" : "Add Collector"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update collector information"
                : "Select a system user with Collector role or create a new one"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {!editingId && (
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "existing" | "new")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="existing">
                    <User className="mr-2 h-4 w-4" />
                    Select Existing
                  </TabsTrigger>
                  <TabsTrigger value="new">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create New User
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="existing" className="space-y-4 mt-4">
                  {/* User Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="userId">Select Collector User</Label>
                    <Select
                      value={formData.userId?.toString() || "none"}
                      onValueChange={handleUserSelect}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a user with Collector role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- Select a user --</SelectItem>
                        {availableUsers.length === 0 ? (
                          <SelectItem value="no-users" disabled>
                            No available collector users
                          </SelectItem>
                        ) : (
                          availableUsers.map((user) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.firstName || user.lastName
                                ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
                                : user.email}
                              {" "}({user.email})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {availableUsers.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        No users with Collector role available. Create a new user or assign Collector role to existing users.
                      </p>
                    )}
                    {formData.userId && (
                      <p className="text-xs text-green-600">
                        ✓ Linked to system user - can login to app
                      </p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="new" className="space-y-4 mt-4">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Create a new system user with <strong>Collector</strong> role.
                      They will be able to login and manage their trips.
                    </p>
                  </div>

                  {/* New User Form */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="newFirstName">First Name *</Label>
                      <Input
                        id="newFirstName"
                        value={newUserData.firstName}
                        onChange={(e) =>
                          setNewUserData({ ...newUserData, firstName: e.target.value })
                        }
                        placeholder="First name"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="newLastName">Last Name</Label>
                      <Input
                        id="newLastName"
                        value={newUserData.lastName}
                        onChange={(e) =>
                          setNewUserData({ ...newUserData, lastName: e.target.value })
                        }
                        placeholder="Last name"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="newEmail">Email *</Label>
                    <Input
                      id="newEmail"
                      type="email"
                      value={newUserData.email}
                      onChange={(e) =>
                        setNewUserData({ ...newUserData, email: e.target.value })
                      }
                      placeholder="email@example.com"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="newPassword">Password *</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newUserData.password}
                      onChange={(e) =>
                        setNewUserData({ ...newUserData, password: e.target.value })
                      }
                      placeholder="Password (min 6 characters)"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="newPhone">Phone</Label>
                    <Input
                      id="newPhone"
                      value={newUserData.phone}
                      onChange={(e) =>
                        setNewUserData({ ...newUserData, phone: e.target.value })
                      }
                      placeholder="Phone number"
                    />
                  </div>

                  <Button
                    type="button"
                    onClick={handleCreateNewUser}
                    disabled={creatingUser}
                    className="w-full"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    {creatingUser ? "Creating..." : "Create Collector User"}
                  </Button>
                </TabsContent>
              </Tabs>
            )}

            {/* Show user selection for editing */}
            {editingId && (
              <div className="space-y-2">
                <Label htmlFor="userId">Linked System User</Label>
                <Select
                  value={formData.userId?.toString() || "none"}
                  onValueChange={handleUserSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- No user linked --</SelectItem>
                    {availableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.firstName || user.lastName
                          ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
                          : user.email}
                        {" "}({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Collector Details */}
            {(formData.userId || editingId) && (
              <>
                {/* Name & Phone in one row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Collector name"
                      required
                      disabled={!!formData.userId}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="Phone number"
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="Email address"
                    disabled={!!formData.userId}
                  />
                </div>

                {/* Vehicle Info in one row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                    <Input
                      id="vehicleNumber"
                      value={formData.vehicleNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, vehicleNumber: e.target.value })
                      }
                      placeholder="MH12AB1234"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="vehicleType">Vehicle Type</Label>
                    <Input
                      id="vehicleType"
                      value={formData.vehicleType}
                      onChange={(e) =>
                        setFormData({ ...formData, vehicleType: e.target.value })
                      }
                      placeholder="Bike, Van, etc."
                    />
                  </div>
                </div>

                {/* Areas & Status in one row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="areas">Assigned Areas</Label>
                    <Input
                      id="areas"
                      value={areasInput}
                      onChange={(e) => setAreasInput(e.target.value)}
                      placeholder="Area1, Area2"
                    />
                  </div>
                  <div className="space-y-1">
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
                </div>
              </>
            )}
          </div>

          <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
            >
              Cancel
            </Button>
            {(formData.userId || editingId) && (
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? "Saving..." : editingId ? "Update" : "Create Collector"}
              </Button>
            )}
          </DialogFooter>
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
