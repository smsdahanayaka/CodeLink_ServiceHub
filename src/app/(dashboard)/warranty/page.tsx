"use client";

// ===========================================
// Warranty Cards List Page
// ===========================================

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Eye, Trash2, FileCheck, Search, Calendar, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { PageHeader } from "@/components/layout";
import { DataTable, Column } from "@/components/tables";
import { Button } from "@/components/ui/button";
import { StatusBadge, ConfirmDialog } from "@/components/common";
import { Badge } from "@/components/ui/badge";

interface WarrantyCard {
  id: number;
  cardNumber: string;
  serialNumber: string;
  purchaseDate: string;
  warrantyStartDate: string;
  warrantyEndDate: string;
  invoiceNumber: string | null;
  status: "ACTIVE" | "EXPIRED" | "VOID" | "CLAIMED";
  product: { id: number; name: string; modelNumber: string | null };
  customer: { id: number; name: string; phone: string };
  shop: { id: number; name: string; code: string | null };
  _count: { warrantyClaims: number };
}

export default function WarrantyCardsPage() {
  const router = useRouter();
  const [cards, setCards] = useState<WarrantyCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch warranty cards
  const fetchCards = async () => {
    try {
      const res = await fetch("/api/warranty-cards?limit=100");
      const data = await res.json();
      if (data.success) {
        setCards(data.data);
      }
    } catch (error) {
      console.error("Error fetching warranty cards:", error);
      toast.error("Failed to load warranty cards");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, []);

  // Handle void/delete
  const handleDelete = async () => {
    if (!deleteId) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/warranty-cards/${deleteId}`, { method: "DELETE" });
      const data = await res.json();

      if (data.success) {
        toast.success("Warranty card voided successfully");
        fetchCards();
      } else {
        toast.error(data.error?.message || "Failed to void warranty card");
      }
    } catch (error) {
      console.error("Error voiding warranty card:", error);
      toast.error("Failed to void warranty card");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  // Calculate warranty status
  const getWarrantyStatus = (card: WarrantyCard) => {
    if (card.status === "VOID") return { status: "VOID", variant: "destructive" as const };

    const now = new Date();
    const endDate = new Date(card.warrantyEndDate);
    const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysRemaining < 0) return { status: "EXPIRED", variant: "secondary" as const };
    if (daysRemaining <= 30) return { status: "EXPIRING SOON", variant: "warning" as const };
    return { status: "ACTIVE", variant: "success" as const };
  };

  // Table columns
  const columns: Column<WarrantyCard>[] = [
    {
      key: "cardNumber",
      title: "Card #",
      sortable: true,
      render: (card) => (
        <div className="flex items-center gap-2">
          <FileCheck className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium font-mono">{card.cardNumber}</div>
            <div className="text-xs text-muted-foreground">S/N: {card.serialNumber}</div>
          </div>
        </div>
      ),
    },
    {
      key: "product",
      title: "Product",
      render: (card) => (
        <div>
          <div className="font-medium">{card.product.name}</div>
          {card.product.modelNumber && (
            <div className="text-xs text-muted-foreground">{card.product.modelNumber}</div>
          )}
        </div>
      ),
    },
    {
      key: "customer",
      title: "Customer",
      render: (card) => (
        <div>
          <div className="font-medium">{card.customer.name}</div>
          <div className="text-xs text-muted-foreground">{card.customer.phone}</div>
        </div>
      ),
    },
    {
      key: "shop",
      title: "Shop",
      render: (card) => (
        <div>
          <div className="font-medium">{card.shop.name}</div>
          {card.shop.code && (
            <div className="text-xs text-muted-foreground">{card.shop.code}</div>
          )}
        </div>
      ),
    },
    {
      key: "warrantyEndDate",
      title: "Warranty Until",
      sortable: true,
      render: (card) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>{format(new Date(card.warrantyEndDate), "dd MMM yyyy")}</span>
        </div>
      ),
    },
    {
      key: "status",
      title: "Status",
      render: (card) => {
        const { status, variant } = getWarrantyStatus(card);
        return (
          <Badge variant={variant === "success" ? "default" : variant === "warning" ? "secondary" : "destructive"}>
            {status}
          </Badge>
        );
      },
    },
    {
      key: "claims",
      title: "Claims",
      render: (card) => (
        <Badge variant="outline">{card._count.warrantyClaims}</Badge>
      ),
    },
    {
      key: "actions",
      title: "Actions",
      render: (card) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/warranty/${card.id}`);
            }}
            title="View"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/warranty/${card.id}/edit`);
            }}
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteId(card.id);
            }}
            title="Void"
            disabled={card.status === "VOID"}
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
        title="Warranty Cards"
        description="Manage warranty card registrations"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/warranty/verify")}
            >
              <Search className="mr-2 h-4 w-4" />
              Verify Card
            </Button>
            <Button onClick={() => router.push("/warranty/new")}>
              <Plus className="mr-2 h-4 w-4" />
              Register Warranty
            </Button>
          </div>
        }
      />

      <DataTable
        data={cards}
        columns={columns}
        searchKey="cardNumber"
        searchPlaceholder="Search by card number, serial, or customer..."
        emptyMessage={loading ? "Loading..." : "No warranty cards found"}
        emptyDescription="Get started by registering your first warranty card."
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Void Warranty Card"
        description="Are you sure you want to void this warranty card? This will invalidate the warranty."
        confirmText="Void Card"
        onConfirm={handleDelete}
        isLoading={deleting}
        variant="destructive"
      />
    </div>
  );
}
