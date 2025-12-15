"use client";

// ===========================================
// Roles List Page
// ===========================================

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Shield } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout";
import { DataTable, Column } from "@/components/tables";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common";
import { Badge } from "@/components/ui/badge";

interface Role {
  id: number;
  name: string;
  description: string | null;
  permissions: string[];
  isSystem: boolean;
  createdAt: string;
  _count: { users: number };
}

export default function RolesPage() {
  const router = useRouter();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch roles
  const fetchRoles = async () => {
    try {
      const res = await fetch("/api/roles?limit=100");
      const data = await res.json();
      if (data.success) {
        setRoles(data.data);
      }
    } catch (error) {
      console.error("Error fetching roles:", error);
      toast.error("Failed to load roles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  // Handle delete
  const handleDelete = async () => {
    if (!deleteId) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/roles/${deleteId}`, { method: "DELETE" });
      const data = await res.json();

      if (data.success) {
        toast.success("Role deleted successfully");
        fetchRoles();
      } else {
        toast.error(data.error?.message || "Failed to delete role");
      }
    } catch (error) {
      console.error("Error deleting role:", error);
      toast.error("Failed to delete role");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  // Table columns
  const columns: Column<Role>[] = [
    {
      key: "name",
      title: "Role Name",
      sortable: true,
      render: (role) => (
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{role.name}</div>
            {role.description && (
              <div className="text-sm text-muted-foreground">
                {role.description}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "permissions",
      title: "Permissions",
      render: (role) => (
        <Badge variant="secondary">{role.permissions.length} permissions</Badge>
      ),
    },
    {
      key: "users",
      title: "Users",
      render: (role) => role._count.users,
    },
    {
      key: "isSystem",
      title: "Type",
      render: (role) =>
        role.isSystem ? (
          <Badge variant="outline">System</Badge>
        ) : (
          <Badge variant="secondary">Custom</Badge>
        ),
    },
    {
      key: "actions",
      title: "Actions",
      render: (role) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/roles/${role.id}`);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {!role.isSystem && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteId(role.id);
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles"
        description="Manage user roles and permissions"
        actions={
          <Button onClick={() => router.push("/roles/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Add Role
          </Button>
        }
      />

      <DataTable
        data={roles}
        columns={columns}
        searchKey="name"
        searchPlaceholder="Search by role name..."
        emptyMessage={loading ? "Loading..." : "No roles found"}
        emptyDescription="Get started by adding your first role."
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Role"
        description="Are you sure you want to delete this role? Users with this role will need to be assigned a new role."
        confirmText="Delete"
        onConfirm={handleDelete}
        isLoading={deleting}
        variant="destructive"
      />
    </div>
  );
}
