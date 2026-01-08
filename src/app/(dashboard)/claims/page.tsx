"use client";

// ===========================================
// Claims List Page - Workflow Matched
// ===========================================

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/lib/hooks/usePermissions";
import {
  Plus,
  Eye,
  ClipboardList,
  User,
  Package,
  Clock,
  Wrench,
  CheckCircle2,
  XCircle,
  Inbox,
  Filter,
  RefreshCw,
  PackageCheck,
  Store,
  AlertCircle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

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
  acceptedAt: string | null;
  warrantyCard: {
    id: number;
    cardNumber: string;
    serialNumber: string;
    product: { id: number; name: string; modelNumber: string | null } | null;
    customer: { id: number; name: string; phone: string } | null;
    shop: { id: number; name: string; code: string | null } | null;
  } | null;
  assignedUser: { id: number; firstName: string | null; lastName: string | null } | null;
  workflow: { id: number; name: string } | null;
  currentStep: { id: number; stepName: string } | null;
  _count: { claimHistory: number };
}

interface Stats {
  newClaims: number;
  inProgress: number;
  completed: number;
  rejected: number;
  acceptedItems: number;
}

// Interface for received items from collections
interface ReceivedItem {
  id: number;
  serialNumber: string;
  issueDescription: string;
  status: string;
  customerName: string | null;
  customerPhone: string | null;
  shop: {
    id: number;
    name: string;
    phone: string | null;
  } | null;
  warrantyCard: {
    id: number;
    cardNumber: string;
    product: { id: number; name: string; modelNumber: string | null } | null;
    customer: { id: number; name: string; phone: string } | null;
  } | null;
  product: { id: number; name: string } | null;
  claim: { id: number; claimNumber: string } | null;
  collectionTrip: {
    id: number;
    tripNumber: string;
  };
}

export default function ClaimsPage() {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const [activeTab, setActiveTab] = useState("accepted");
  const [claims, setClaims] = useState<Claim[]>([]);
  const [receivedItems, setReceivedItems] = useState<ReceivedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [stats, setStats] = useState<Stats>({
    newClaims: 0,
    inProgress: 0,
    completed: 0,
    rejected: 0,
    acceptedItems: 0,
  });

  // Fetch claims based on tab
  const fetchClaims = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      let url = "/api/claims?limit=100";

      // Filter by tab
      if (activeTab === "new") {
        url += "&status=new";
      } else if (activeTab === "in-progress") {
        url += "&status=in_progress,in_service,processing,diagnosis,repair";
      } else if (activeTab === "completed") {
        url += "&status=resolved,completed,closed";
      }

      // Additional filters
      if (statusFilter !== "all" && activeTab === "all") {
        url += `&status=${statusFilter}`;
      }
      if (priorityFilter !== "all") {
        url += `&priority=${priorityFilter}`;
      }

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
      setRefreshing(false);
    }
  }, [activeTab, statusFilter, priorityFilter]);

  // Fetch stats
  const fetchStats = async () => {
    try {
      const [newRes, progressRes, completedRes, rejectedRes] = await Promise.all([
        fetch("/api/claims?status=new&limit=1"),
        fetch("/api/claims?status=in_progress,in_service,processing&limit=1"),
        fetch("/api/claims?status=resolved,completed,closed&limit=1"),
        fetch("/api/claims?status=rejected&limit=1"),
      ]);

      const [newData, progressData, completedData, rejectedData] = await Promise.all([
        newRes.json(),
        progressRes.json(),
        completedRes.json(),
        rejectedRes.json(),
      ]);

      setStats(prev => ({
        ...prev,
        newClaims: newData.meta?.total || 0,
        inProgress: progressData.meta?.total || 0,
        completed: completedData.meta?.total || 0,
        rejected: rejectedData.meta?.total || 0,
      }));
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  // Fetch received items from collections
  const fetchReceivedItems = async () => {
    try {
      // Fetch received collection trips and get all items
      const res = await fetch("/api/logistics/collection-trips?status=RECEIVED&limit=50");

      // Silently skip if user doesn't have logistics permissions (403)
      if (!res.ok) {
        return;
      }

      const result = await res.json();

      if (result.success) {
        const items: ReceivedItem[] = [];
        result.data.forEach((trip: { id: number; tripNumber: string; items: ReceivedItem[] }) => {
          trip.items.forEach((item: ReceivedItem) => {
            // Include all received items (RECEIVED or PROCESSED status)
            if (["RECEIVED", "PROCESSED"].includes(item.status)) {
              items.push({
                ...item,
                collectionTrip: { id: trip.id, tripNumber: trip.tripNumber },
              });
            }
          });
        });
        setReceivedItems(items);
        setStats(prev => ({ ...prev, acceptedItems: items.length }));
      }
    } catch {
      // Silently ignore errors - user may not have logistics permission
      // or service worker may reject the request
    }
  };

  useEffect(() => {
    fetchClaims();
    fetchStats();
    // Only fetch received items if user has logistics.view permission
    if (hasPermission("logistics.view")) {
      fetchReceivedItems();
    }
  }, [fetchClaims, hasPermission]);

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
    if (["new", "pending", "received"].includes(statusLower)) {
      return <Badge variant="secondary">{status.replace(/_/g, " ")}</Badge>;
    }
    if (["in_progress", "in_service", "processing", "diagnosis", "repair"].includes(statusLower)) {
      return <Badge className="bg-blue-100 text-blue-800">{status.replace(/_/g, " ")}</Badge>;
    }
    if (["resolved", "completed", "closed"].includes(statusLower)) {
      return <Badge className="bg-green-100 text-green-800">{status.replace(/_/g, " ")}</Badge>;
    }
    if (["rejected", "cancelled"].includes(statusLower)) {
      return <Badge variant="destructive">{status.replace(/_/g, " ")}</Badge>;
    }
    return <Badge>{status.replace(/_/g, " ")}</Badge>;
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
          <div className="font-medium">{claim.warrantyCard?.product?.name || "N/A"}</div>
          <div className="text-xs text-muted-foreground font-mono">
            {claim.warrantyCard?.serialNumber || "-"}
          </div>
        </div>
      ),
    },
    {
      key: "customer",
      title: "Customer / Shop",
      render: (claim) => (
        <div>
          <div className="font-medium">{claim.warrantyCard?.customer?.name || "N/A"}</div>
          <div className="text-xs text-muted-foreground">
            {claim.warrantyCard?.shop?.name || "-"}
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
      render: (claim) => (
        <div className="space-y-1">
          {getStatusBadge(claim.currentStatus)}
          {claim.currentStep && (
            <div className="text-xs text-muted-foreground">
              {claim.currentStep.stepName}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "assignedTo",
      title: "Assigned To",
      render: (claim) =>
        claim.assignedUser ? (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {claim.assignedUser.firstName} {claim.assignedUser.lastName}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">Unassigned</span>
        ),
    },
    {
      key: "actions",
      title: "",
      render: (claim) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/claims/${claim.id}`);
          }}
        >
          <Eye className="h-4 w-4 mr-1" />
          View
        </Button>
      ),
    },
  ];

  // Render claim card for mobile/grid view
  const renderClaimCard = (claim: Claim) => (
    <Card
      key={claim.id}
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => router.push(`/claims/${claim.id}`)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono font-medium">{claim.claimNumber}</span>
              {getPriorityBadge(claim.priority)}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span>{claim.warrantyCard?.product?.name || "N/A"}</span>
              <span className="text-muted-foreground">
                ({claim.warrantyCard?.serialNumber})
              </span>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {claim.issueDescription}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {format(new Date(claim.createdAt), "dd MMM yyyy HH:mm")}
            </div>
          </div>
          <div className="text-right space-y-2">
            {getStatusBadge(claim.currentStatus)}
            {claim.assignedUser && (
              <div className="text-xs text-muted-foreground">
                {claim.assignedUser.firstName}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Status options for "All" tab
  const statusOptions = [
    { value: "all", label: "All Statuses" },
    { value: "new", label: "New" },
    { value: "in_progress", label: "In Progress" },
    { value: "in_service", label: "In Service" },
    { value: "resolved", label: "Resolved" },
    { value: "completed", label: "Completed" },
    { value: "rejected", label: "Rejected" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warranty Claims"
        description="Manage and process warranty claims"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchClaims(true);
                fetchStats();
                if (hasPermission("logistics.view")) {
                  fetchReceivedItems();
                }
              }}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button onClick={() => router.push("/claims/new")}>
              <Plus className="mr-2 h-4 w-4" />
              New Claim
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card
          className={`cursor-pointer transition-all ${activeTab === "accepted" ? "ring-2 ring-primary" : "hover:shadow-md"} ${stats.acceptedItems > 0 ? "ring-2 ring-purple-500" : ""}`}
          onClick={() => setActiveTab("accepted")}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
                <PackageCheck className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.acceptedItems}</p>
                <p className="text-sm text-muted-foreground">Accepted Items</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all ${activeTab === "new" ? "ring-2 ring-primary" : "hover:shadow-md"}`}
          onClick={() => setActiveTab("new")}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                <Inbox className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.newClaims}</p>
                <p className="text-sm text-muted-foreground">New Claims</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all ${activeTab === "in-progress" ? "ring-2 ring-primary" : "hover:shadow-md"}`}
          onClick={() => setActiveTab("in-progress")}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-full">
                <Wrench className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all ${activeTab === "completed" ? "ring-2 ring-primary" : "hover:shadow-md"}`}
          onClick={() => setActiveTab("completed")}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all ${activeTab === "all" ? "ring-2 ring-primary" : "hover:shadow-md"}`}
          onClick={() => setActiveTab("all")}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full">
                <ClipboardList className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.newClaims + stats.inProgress + stats.completed + stats.rejected}</p>
                <p className="text-sm text-muted-foreground">All Claims</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="accepted" className="flex items-center gap-2">
            <PackageCheck className="h-4 w-4" />
            Accepted
            {stats.acceptedItems > 0 && (
              <Badge variant="secondary" className="ml-1 bg-purple-100 text-purple-800">
                {stats.acceptedItems}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="new" className="flex items-center gap-2">
            <Inbox className="h-4 w-4" />
            New
            {stats.newClaims > 0 && (
              <Badge variant="secondary" className="ml-1">
                {stats.newClaims}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="in-progress" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            In Progress
            {stats.inProgress > 0 && (
              <Badge variant="secondary" className="ml-1">
                {stats.inProgress}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Completed
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            All Claims
          </TabsTrigger>
        </TabsList>

        {/* Accepted Items Tab */}
        <TabsContent value="accepted" className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
            <PackageCheck className="h-4 w-4 text-purple-600" />
            <span>
              Items received from collections. Click to view claim or create a new claim.
            </span>
          </div>

          {receivedItems.length === 0 ? (
            <div className="text-center py-12">
              <PackageCheck className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2 font-medium">No received items</p>
              <p className="text-sm text-muted-foreground">
                Received items from collections will appear here
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {receivedItems.map((item) => (
                <Card
                  key={item.id}
                  className={`cursor-pointer hover:shadow-md transition-shadow ${item.claim ? "border-green-200 dark:border-green-800" : "border-purple-200 dark:border-purple-800"}`}
                  onClick={() => {
                    if (item.claim) {
                      router.push(`/claims/${item.claim.id}`);
                    } else {
                      router.push(`/claims/new?itemId=${item.id}&tripId=${item.collectionTrip.id}`);
                    }
                  }}
                >
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">
                          {item.collectionTrip.tripNumber}
                        </Badge>
                        {item.claim ? (
                          <Badge className="bg-green-100 text-green-800">
                            {item.claim.claimNumber}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">No Claim</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{item.serialNumber}</span>
                      </div>
                      {(item.warrantyCard?.product?.name || item.product?.name) && (
                        <div className="text-sm text-muted-foreground">
                          {item.warrantyCard?.product?.name || item.product?.name}
                        </div>
                      )}
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {item.issueDescription}
                      </p>
                      {item.shop && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Store className="h-3 w-3" />
                          {item.shop.name}
                        </div>
                      )}
                      {item.claim ? (
                        <Button size="sm" variant="outline" className="w-full mt-2">
                          <Eye className="h-4 w-4 mr-1" />
                          View Claim
                        </Button>
                      ) : (
                        <Button size="sm" className="w-full mt-2">
                          <Plus className="h-4 w-4 mr-1" />
                          Create Claim
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* New Claims Tab */}
        <TabsContent value="new" className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <Inbox className="h-4 w-4 text-blue-600" />
            <span>
              New claims received from collections. Review and assign to start processing.
            </span>
          </div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : claims.length === 0 ? (
            <div className="text-center py-12">
              <Inbox className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2 font-medium">No new claims</p>
              <p className="text-sm text-muted-foreground">
                New claims from collections will appear here
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {claims.map(renderClaimCard)}
            </div>
          )}
        </TabsContent>

        {/* In Progress Tab */}
        <TabsContent value="in-progress" className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
            <Wrench className="h-4 w-4 text-orange-600" />
            <span>
              Claims currently being processed - diagnosis, repair, or quality check.
            </span>
          </div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : claims.length === 0 ? (
            <div className="text-center py-12">
              <Wrench className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2 font-medium">No claims in progress</p>
              <p className="text-sm text-muted-foreground">
                Claims being worked on will appear here
              </p>
            </div>
          ) : (
            <DataTable
              data={claims}
              columns={columns}
              searchKey="claimNumber"
              searchPlaceholder="Search claims..."
              emptyMessage="No claims in progress"
            />
          )}
        </TabsContent>

        {/* Completed Tab */}
        <TabsContent value="completed" className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span>
              Claims that have been resolved and are ready for delivery or already delivered.
            </span>
          </div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
            </div>
          ) : claims.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2 font-medium">No completed claims</p>
              <p className="text-sm text-muted-foreground">
                Resolved claims will appear here
              </p>
            </div>
          ) : (
            <DataTable
              data={claims}
              columns={columns}
              searchKey="claimNumber"
              searchPlaceholder="Search completed claims..."
              emptyMessage="No completed claims"
            />
          )}
        </TabsContent>

        {/* All Claims Tab */}
        <TabsContent value="all" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filters:</span>
            </div>
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
            searchPlaceholder="Search by claim number, product, customer..."
            emptyMessage={loading ? "Loading..." : "No claims found"}
            emptyDescription="Get started by creating your first warranty claim."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
