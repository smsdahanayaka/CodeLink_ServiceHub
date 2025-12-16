"use client";

// ===========================================
// Edit Role Page
// ===========================================

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout";
import { PageLoading } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Permission {
  key: string;
  label: string;
}

interface PermissionGroup {
  name: string;
  permissions: Permission[];
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditRolePage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSystem, setIsSystem] = useState(false);
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissions: [] as string[],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch available permissions from API
  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const res = await fetch("/api/permissions");
        const data = await res.json();

        if (data.success) {
          setPermissionGroups(data.data.groups);
        }
      } catch (error) {
        console.error("Error fetching permissions:", error);
        toast.error("Failed to load permissions");
      }
    };

    fetchPermissions();
  }, []);

  // Fetch role
  useEffect(() => {
    const fetchRole = async () => {
      try {
        const res = await fetch(`/api/roles/${id}`);
        const data = await res.json();

        if (data.success) {
          const role = data.data;
          setFormData({
            name: role.name,
            description: role.description || "",
            permissions: role.permissions,
          });
          setIsSystem(role.isSystem);
        } else {
          toast.error("Role not found");
          router.push("/roles");
        }
      } catch (error) {
        console.error("Error fetching role:", error);
        toast.error("Failed to load role");
        router.push("/roles");
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, [id, router]);

  // Toggle permission
  const togglePermission = (permission: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }));
    if (errors.permissions) {
      setErrors((prev) => ({ ...prev, permissions: "" }));
    }
  };

  // Toggle all permissions in a group
  const toggleGroup = (groupPermissions: Permission[]) => {
    const permKeys = groupPermissions.map((p) => p.key);
    const allSelected = permKeys.every((p) => formData.permissions.includes(p));
    setFormData((prev) => ({
      ...prev,
      permissions: allSelected
        ? prev.permissions.filter((p) => !permKeys.includes(p))
        : [...new Set([...prev.permissions, ...permKeys])],
    }));
  };

  // Check if all permissions in group are selected
  const isGroupSelected = (groupPermissions: Permission[]) =>
    groupPermissions.every((p) => formData.permissions.includes(p.key));

  // Check if some permissions in group are selected
  const isGroupPartiallySelected = (groupPermissions: Permission[]) => {
    const selectedCount = groupPermissions.filter((p) =>
      formData.permissions.includes(p.key)
    ).length;
    return selectedCount > 0 && selectedCount < groupPermissions.length;
  };

  // Handle input change
  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  // Select all permissions
  const selectAll = () => {
    const allPerms = permissionGroups.flatMap((g) => g.permissions.map((p) => p.key));
    setFormData((prev) => ({ ...prev, permissions: allPerms }));
  };

  // Clear all permissions
  const clearAll = () => {
    setFormData((prev) => ({ ...prev, permissions: [] }));
  };

  // Validate form
  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name) newErrors.name = "Role name is required";
    // Allow empty permissions - role can have no permissions (dashboard only)
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/roles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Role updated successfully");
        toast.info("Users with this role will get updated permissions on their next login or refresh");
        router.push("/roles");
      } else {
        toast.error(data.error?.message || "Failed to update role");
      }
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Failed to update role");
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
        title="Edit Role"
        description="Update role permissions and details"
        actions={
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Role Information</CardTitle>
            <CardDescription>Update the basic role details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Role Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Enter role name"
                disabled={isSystem}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
              {isSystem && (
                <p className="text-sm text-muted-foreground">
                  System role names cannot be changed
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Enter role description"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Permissions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Permissions</CardTitle>
                <CardDescription>
                  Select the permissions for this role ({formData.permissions.length} selected)
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={selectAll}>
                  Select All
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={clearAll}>
                  Clear All
                </Button>
              </div>
            </div>
            {errors.permissions && (
              <p className="text-sm text-destructive">{errors.permissions}</p>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {permissionGroups.map((group) => (
                <div key={group.name} className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`group-${group.name}`}
                      checked={isGroupSelected(group.permissions)}
                      onCheckedChange={() => toggleGroup(group.permissions)}
                      className={isGroupPartiallySelected(group.permissions) ? "opacity-50" : ""}
                    />
                    <Label
                      htmlFor={`group-${group.name}`}
                      className="font-semibold cursor-pointer"
                    >
                      {group.name}
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      ({group.permissions.filter((p) => formData.permissions.includes(p.key)).length}/{group.permissions.length})
                    </span>
                  </div>
                  <div className="ml-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {group.permissions.map((permission) => (
                      <div
                        key={permission.key}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={permission.key}
                          checked={formData.permissions.includes(permission.key)}
                          onCheckedChange={() => togglePermission(permission.key)}
                        />
                        <Label
                          htmlFor={permission.key}
                          className="text-sm cursor-pointer"
                        >
                          {permission.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
