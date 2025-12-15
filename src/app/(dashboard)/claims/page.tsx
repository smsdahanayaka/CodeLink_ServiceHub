"use client";

// ===========================================
// Claims List Page
// ===========================================

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Eye,
  ClipboardList,
  AlertCircle,
  Clock,
  CheckCircle,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { PageHeader } from "@/components/layout";
import { DataTable, Column } from "@/components/tables";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Claim {
  id: number;
  claimNumber: string;
  issueDescription: string;
  issueCategory: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  currentStatus: string;
  currentLocation: string;
  reportedBy: string;
  createdAt: string;
  warrantyCard: {
    id: number;
    cardNumber: string;
    serialNumber: string;
    product: { id: number; name: string; modelNumber: string | null };
    customer: { id: number; name: string; phone: string };
    shop: { id: number; name: string; code: string | null };
  };
  assignedUser: { id: number; firstName: string | null; lastName: string | null } | null;
  _count: { claimHistory: number };
}

export default function ClaimsPage() {
  const router = useRouter();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  // Fetch claims
  const fetchClaims = async () => {
    try {
      let url = "/api/claims?limit=100";
      if (statusFilter !== "all") url += `&status=${statusFilter}`;
      if (priorityFilter !== "all") url += `&priority=${priorityFilter}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setClaims(data.data);
      }
    } catch (error) {
      console.error("Error fetching claims:", error);
      toast.error("Failed to load claims");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, [statusFilter, priorityFilter]);

  // Get priority badge
  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, string> = {
      LOW: "bg-gray-100 text-gray-800",
      MEDIUM: "bg-blue-100 text-blue-800",
      HIGH: "bg-orange-100 text-orange-800",
      URGENT: "bg-red-100 text-red-800",
    };
    return (
      <Badge className={variants[priority] || "bg-gray-100"}>
        {priority}
      </Badge>
    );
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (["new", "pending"].includes(statusLower)) {
      return <Badge variant="secondary">{status}</Badge>;
    }
    if (["in_progress", "in_service", "processing"].includes(statusLower)) {
      return <Badge className="bg-blue-100 text-blue-800">{status}</Badge>;
    }
    if (["resolved", "completed", "closed"].includes(statusLower)) {
      return <Badge className="bg-green-100 text-green-800">{status}</Badge>;
    }
    if (["rejected", "cancelled"].includes(statusLower)) {
      return <Badge variant="destructive">{status}</Badge>;
    }
    return <Badge>{status}</Badge>;
  };

  // Table columns
  const columns: Column<Claim>[] = [
    {
      key: "claimNumber",
      title: "Claim #",
      sortable: true,
      render: (claim) => (
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium font-mono">{claim.claimNumber}</div>
            <div className="text-xs text-muted-foreground">
              {format(new Date(claim.createdAt), "dd MMM yyyy")}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "product",
      title: "Product",
      render: (claim) => (
        <div>
          <div className="font-medium">{claim.warrantyCard.product.name}</div>
          <div className="text-xs text-muted-foreground font-mono">
            {claim.warrantyCard.serialNumber}
          </div>
        </div>
      ),
    },
    {
      key: "customer",
      title: "Customer",
      render: (claim) => (
        <div>
          <div className="font-medium">{claim.warrantyCard.customer.name}</div>
          <div className="text-xs text-muted-foreground">
            {claim.warrantyCard.customer.phone}
          </div>
        </div>
      ),
    },
    {
      key: "issue",
      title: "Issue",
      render: (claim) => (
        <div className="max-w-[200px]">
          <p className="text-sm truncate">{claim.issueDescription}</p>
          {claim.issueCategory && (
            <Badge variant="outline" className="mt-1">{claim.issueCategory}</Badge>
          )}
        </div>
      ),
    },
    {
      key: "priority",
      title: "Priority",
      render: (claim) => getPriorityBadge(claim.priority),
    },
    {
      key: "status",
      title: "Status",
      render: (claim) => getStatusBadge(claim.currentStatus),
    },
    {
      key: "assignedTo",
      title: "Assigned To",
      render: (claim) =>
        claim.assignedUser ? (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>
              {claim.assignedUser.firstName} {claim.assignedUser.lastName}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground">Unassigned</span>
        ),
    },
    {
      key: "actions",
      title: "Actions",
      render: (claim) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/claims/${claim.id}`);
          }}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  // Status options
  const statusOptions = [
    { value: "all", label: "All Statuses" },
    { value: "new", label: "New" },
    { value: "pending", label: "Pending" },
    { value: "in_progress", label: "In Progress" },
    { value: "in_service", label: "In Service" },
    { value: "resolved", label: "Resolved" },
    { value: "closed", label: "Closed" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warranty Claims"
        description="Manage warranty claim requests"
        actions={
          <Button onClick={() => router.push("/claims/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Create Claim
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex gap-4">
        <div className="w-48">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-48">
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="URGENT">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable
        data={claims}
        columns={columns}
        searchKey="claimNumber"
        searchPlaceholder="Search by claim number, customer..."
        emptyMessage={loading ? "Loading..." : "No claims found"}
        emptyDescription="Get started by creating your first warranty claim."
      />
    </div>
  );
}
