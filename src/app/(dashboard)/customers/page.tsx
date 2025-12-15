"use client";

// ===========================================
// Customers List Page
// ===========================================

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, User, Phone, Store, MapPin } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout";
import { DataTable, Column } from "@/components/tables";
import { Button } from "@/components/ui/button";
import { StatusBadge, ConfirmDialog } from "@/components/common";
import { Badge } from "@/components/ui/badge";

interface Shop {
  id: number;
  name: string;
  code: string | null;
}

interface Customer {
  id: number;
  name: string;
  email: string | null;
  phone: string;
  alternatePhone: string | null;
  city: string | null;
  state: string | null;
  shop: Shop | null;
  _count: { warrantyCards: number };
}

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch customers
  const fetchCustomers = async () => {
    try {
      const res = await fetch("/api/customers?limit=100");
      const data = await res.json();
      if (data.success) {
        setCustomers(data.data);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Handle delete
  const handleDelete = async () => {
    if (!deleteId) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/customers/${deleteId}`, { method: "DELETE" });
      const data = await res.json();

      if (data.success) {
        toast.success("Customer deleted successfully");
        fetchCustomers();
      } else {
        toast.error(data.error?.message || "Failed to delete customer");
      }
    } catch (error) {
      console.error("Error deleting customer:", error);
      toast.error("Failed to delete customer");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  // Table columns
  const columns: Column<Customer>[] = [
    {
      key: "name",
      title: "Customer",
      sortable: true,
      render: (customer) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{customer.name}</div>
            {customer.email && (
              <div className="text-sm text-muted-foreground">
                {customer.email}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "phone",
      title: "Contact",
      render: (customer) => (
        <div>
          <div className="flex items-center gap-1">
            <Phone className="h-3 w-3 text-muted-foreground" />
            {customer.phone}
          </div>
          {customer.alternatePhone && (
            <div className="text-sm text-muted-foreground">
              Alt: {customer.alternatePhone}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "location",
      title: "Location",
      render: (customer) => (
        <div className="flex items-center gap-1">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span>
            {customer.city || "-"}
            {customer.state && `, ${customer.state}`}
          </span>
        </div>
      ),
    },
    {
      key: "shop",
      title: "Shop",
      render: (customer) =>
        customer.shop ? (
          <div className="flex items-center gap-1">
            <Store className="h-4 w-4 text-muted-foreground" />
            <span>{customer.shop.name}</span>
            {customer.shop.code && (
              <Badge variant="outline" className="ml-1">
                {customer.shop.code}
              </Badge>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      key: "warrantyCards",
      title: "Warranties",
      render: (customer) => (
        <Badge variant="outline">{customer._count.warrantyCards}</Badge>
      ),
    },
    {
      key: "actions",
      title: "Actions",
      render: (customer) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/customers/${customer.id}`);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteId(customer.id);
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Manage customer information"
        actions={
          <Button onClick={() => router.push("/customers/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        }
      />

      <DataTable
        data={customers}
        columns={columns}
        searchKey="name"
        searchPlaceholder="Search by customer name, phone, or email..."
        emptyMessage={loading ? "Loading..." : "No customers found"}
        emptyDescription="Get started by adding your first customer."
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Customer"
        description="Are you sure you want to delete this customer? This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDelete}
        isLoading={deleting}
        variant="destructive"
      />
    </div>
  );
}
