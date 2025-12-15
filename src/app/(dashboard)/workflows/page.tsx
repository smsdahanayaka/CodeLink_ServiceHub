"use client";

// ===========================================
// Workflows List Page
// ===========================================

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Play,
  Pause,
  GitBranch,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";

import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { PageLoading, EmptyState, Pagination } from "@/components/common";

interface WorkflowStep {
  id: number;
  name: string;
  stepOrder: number;
  stepType: string;
  statusName: string;
}

interface Workflow {
  id: number;
  name: string;
  description: string | null;
  triggerType: "MANUAL" | "AUTO_ON_CLAIM" | "CONDITIONAL";
  isDefault: boolean;
  isActive: boolean;
  version: number;
  createdAt: string;
  createdByUser: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
  steps: WorkflowStep[];
  _count: {
    warrantyClaims: number;
  };
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function WorkflowsPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [triggerFilter, setTriggerFilter] = useState("all");
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch workflows
  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search,
        sortBy: "createdAt",
        sortOrder: "desc",
      });

      if (statusFilter !== "all") {
        params.append("isActive", statusFilter === "active" ? "true" : "false");
      }

      if (triggerFilter !== "all") {
        params.append("triggerType", triggerFilter);
      }

      const res = await fetch(`/api/workflows?${params}`);
      const data = await res.json();

      if (data.success) {
        setWorkflows(data.data);
        if (data.meta) {
          setPagination(data.meta);
        }
      } else {
        toast.error("Failed to load workflows");
      }
    } catch (error) {
      console.error("Error fetching workflows:", error);
      toast.error("Failed to load workflows");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, [pagination.page, search, statusFilter, triggerFilter]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Delete workflow
  const handleDelete = async () => {
    if (!deleteId) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/workflows/${deleteId}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Workflow deleted successfully");
        fetchWorkflows();
      } else {
        toast.error(data.error?.message || "Failed to delete workflow");
      }
    } catch (error) {
      console.error("Error deleting workflow:", error);
      toast.error("Failed to delete workflow");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  // Toggle workflow active status
  const handleToggleActive = async (id: number, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/workflows/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(`Workflow ${!currentStatus ? "activated" : "deactivated"} successfully`);
        fetchWorkflows();
      } else {
        toast.error(data.error?.message || "Failed to update workflow");
      }
    } catch (error) {
      console.error("Error updating workflow:", error);
      toast.error("Failed to update workflow");
    }
  };

  // Duplicate workflow
  const handleDuplicate = async (workflow: Workflow) => {
    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${workflow.name} (Copy)`,
          description: workflow.description,
          triggerType: workflow.triggerType,
          isDefault: false,
          isActive: false,
        }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Workflow duplicated successfully");
        router.push(`/workflows/${data.data.id}/edit`);
      } else {
        toast.error(data.error?.message || "Failed to duplicate workflow");
      }
    } catch (error) {
      console.error("Error duplicating workflow:", error);
      toast.error("Failed to duplicate workflow");
    }
  };

  // Get trigger type badge
  const getTriggerBadge = (triggerType: string) => {
    switch (triggerType) {
      case "AUTO_ON_CLAIM":
        return <Badge variant="default">Auto on Claim</Badge>;
      case "MANUAL":
        return <Badge variant="secondary">Manual</Badge>;
      case "CONDITIONAL":
        return <Badge variant="outline">Conditional</Badge>;
      default:
        return <Badge variant="outline">{triggerType}</Badge>;
    }
  };

  // Get status icon
  const getStatusIcon = (isActive: boolean, isDefault: boolean) => {
    if (isDefault) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    if (isActive) {
      return <Play className="h-4 w-4 text-blue-500" />;
    }
    return <Pause className="h-4 w-4 text-muted-foreground" />;
  };

  if (loading && workflows.length === 0) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workflows"
        description="Design and manage claim processing workflows"
        actions={
          <Button onClick={() => router.push("/workflows/new")}>
            <Plus className="mr-2 h-4 w-4" />
            New Workflow
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search workflows..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Select value={triggerFilter} onValueChange={setTriggerFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Trigger Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Triggers</SelectItem>
              <SelectItem value="AUTO_ON_CLAIM">Auto on Claim</SelectItem>
              <SelectItem value="MANUAL">Manual</SelectItem>
              <SelectItem value="CONDITIONAL">Conditional</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      {workflows.length === 0 ? (
        <EmptyState
          icon={<GitBranch className="h-8 w-8 text-muted-foreground" />}
          title="No workflows found"
          description={search ? "Try adjusting your search or filters" : "Get started by creating your first workflow"}
          action={
            !search && (
              <Button onClick={() => router.push("/workflows/new")}>
                <Plus className="mr-2 h-4 w-4" />
                New Workflow
              </Button>
            )
          }
        />
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Steps</TableHead>
                  <TableHead>Claims</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workflows.map((workflow) => (
                  <TableRow
                    key={workflow.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/workflows/${workflow.id}`)}
                  >
                    <TableCell>
                      {getStatusIcon(workflow.isActive, workflow.isDefault)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {workflow.name}
                          {workflow.isDefault && (
                            <Badge variant="secondary" className="text-xs">Default</Badge>
                          )}
                        </div>
                        {workflow.description && (
                          <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                            {workflow.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getTriggerBadge(workflow.triggerType)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <GitBranch className="h-4 w-4 text-muted-foreground" />
                        <span>{workflow.steps.length} steps</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{workflow._count.warrantyClaims}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={workflow.isActive ? "default" : "secondary"}>
                        {workflow.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(workflow.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/workflows/${workflow.id}/edit`);
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicate(workflow);
                            }}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleActive(workflow.id, workflow.isActive);
                            }}
                          >
                            {workflow.isActive ? (
                              <>
                                <Pause className="mr-2 h-4 w-4" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <Play className="mr-2 h-4 w-4" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteId(workflow.id);
                            }}
                            className="text-destructive focus:text-destructive"
                            disabled={workflow._count.warrantyClaims > 0}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                            {workflow._count.warrantyClaims > 0 && (
                              <AlertCircle className="ml-2 h-3 w-3" />
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
            />
          )}
        </>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workflow</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this workflow? This action cannot be undone.
              All steps and transitions will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
