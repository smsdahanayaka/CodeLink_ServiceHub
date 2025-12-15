"use client";

// ===========================================
// My Tasks / Inbox Dashboard
// Shows claims pending user action
// ===========================================

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  Clock,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Filter,
  Play,
  SkipForward,
  ChevronRight,
  User,
  Calendar,
  Package,
  Store,
  Timer,
  TrendingUp,
  Inbox,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow, differenceInHours, addHours } from "date-fns";

import { PageHeader } from "@/components/layout";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { PageLoading, EmptyState, Pagination } from "@/components/common";

interface TaskClaim {
  id: number;
  claimNumber: string;
  issueDescription: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  currentStatus: string;
  currentLocation: string;
  currentStepStartedAt: string | null;
  createdAt: string;
  warrantyCard: {
    id: number;
    cardNumber: string;
    serialNumber: string;
    product: {
      id: number;
      name: string;
      modelNumber: string | null;
    };
    customer: {
      id: number;
      name: string;
      phone: string;
    } | null;
    shop: {
      id: number;
      name: string;
      code: string | null;
    };
  };
  workflow: {
    id: number;
    name: string;
  } | null;
  currentStep: {
    id: number;
    name: string;
    statusName: string;
    stepType: string;
    slaHours: number | null;
    slaWarningHours: number | null;
    canSkip: boolean;
  } | null;
  assignedUser: {
    id: number;
    firstName: string | null;
    lastName: string | null;
  } | null;
}

interface TaskStats {
  total: number;
  pending: number;
  slaWarning: number;
  slaBreach: number;
  completedToday: number;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function MyTasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskClaim[]>([]);
  const [stats, setStats] = useState<TaskStats>({
    total: 0,
    pending: 0,
    slaWarning: 0,
    slaBreach: 0,
    completedToday: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [slaFilter, setSlaFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("pending");
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  // Fetch tasks
  const fetchTasks = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) setRefreshing(true);
      else setLoading(true);

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        assignedTo: "me",
        sortBy: "currentStepStartedAt",
        sortOrder: "asc",
      });

      // Add filters
      if (priorityFilter !== "all") {
        params.append("priority", priorityFilter);
      }

      // For pending tab, exclude resolved claims
      if (activeTab === "pending") {
        params.append("excludeResolved", "true");
      } else if (activeTab === "completed") {
        params.append("onlyResolved", "true");
      }

      const res = await fetch(`/api/my-tasks?${params}`);
      const data = await res.json();

      if (data.success) {
        setTasks(data.data);
        if (data.meta) {
          setPagination(data.meta);
        }
        if (data.stats) {
          setStats(data.stats);
        }
      } else {
        toast.error("Failed to load tasks");
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [pagination.page, priorityFilter, slaFilter, activeTab]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTasks(true);
    }, 60000);
    return () => clearInterval(interval);
  }, [pagination.page, priorityFilter, slaFilter, activeTab]);

  // Calculate SLA status for a task
  const getSlaStatus = (task: TaskClaim) => {
    if (!task.currentStep?.slaHours || !task.currentStepStartedAt) {
      return null;
    }

    const startTime = new Date(task.currentStepStartedAt);
    const deadline = addHours(startTime, task.currentStep.slaHours);
    const now = new Date();
    const hoursRemaining = differenceInHours(deadline, now);
    const totalHours = task.currentStep.slaHours;
    const hoursUsed = differenceInHours(now, startTime);
    const percentageUsed = Math.min(100, Math.max(0, (hoursUsed / totalHours) * 100));

    const warningHours = task.currentStep.slaWarningHours || totalHours * 0.2;
    const isWarning = hoursRemaining <= warningHours && hoursRemaining > 0;
    const isBreached = hoursRemaining <= 0;

    return {
      hoursRemaining,
      deadline,
      percentageUsed,
      isWarning,
      isBreached,
      totalHours,
    };
  };

  // Get priority badge
  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, string> = {
      LOW: "bg-gray-100 text-gray-800",
      MEDIUM: "bg-blue-100 text-blue-800",
      HIGH: "bg-orange-100 text-orange-800",
      URGENT: "bg-red-100 text-red-800",
    };
    return <Badge className={variants[priority] || "bg-gray-100"}>{priority}</Badge>;
  };

  // Filter tasks by SLA status
  const filteredTasks = tasks.filter((task) => {
    if (slaFilter === "all") return true;
    const sla = getSlaStatus(task);
    if (slaFilter === "breach") return sla?.isBreached;
    if (slaFilter === "warning") return sla?.isWarning;
    if (slaFilter === "on_track") return sla && !sla.isWarning && !sla.isBreached;
    return true;
  });

  if (loading && tasks.length === 0) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Tasks"
        description="Claims assigned to you pending action"
        actions={
          <Button
            variant="outline"
            onClick={() => fetchTasks(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Tasks</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Inbox className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className={stats.slaWarning > 0 ? "border-amber-500" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">SLA Warning</p>
                <p className="text-2xl font-bold text-amber-600">{stats.slaWarning}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card className={stats.slaBreach > 0 ? "border-red-500" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">SLA Breach</p>
                <p className="text-2xl font-bold text-red-600">{stats.slaBreach}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed Today</p>
                <p className="text-2xl font-bold text-green-600">{stats.completedToday}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Select value={slaFilter} onValueChange={setSlaFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="SLA Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All SLA</SelectItem>
              <SelectItem value="breach">Breached</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="on_track">On Track</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <EmptyState
          icon={<Inbox className="h-12 w-12 text-muted-foreground" />}
          title={activeTab === "completed" ? "No completed tasks" : "No pending tasks"}
          description={
            activeTab === "completed"
              ? "Tasks you complete will appear here"
              : "Claims assigned to you will appear here"
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredTasks.map((task) => {
            const slaStatus = getSlaStatus(task);

            return (
              <Card
                key={task.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  slaStatus?.isBreached
                    ? "border-red-500/50 bg-red-50/30 dark:bg-red-950/10"
                    : slaStatus?.isWarning
                      ? "border-amber-500/50 bg-amber-50/30 dark:bg-amber-950/10"
                      : ""
                }`}
                onClick={() => router.push(`/claims/${task.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Main Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="font-mono font-semibold">{task.claimNumber}</span>
                        {getPriorityBadge(task.priority)}
                        {task.workflow && (
                          <Badge variant="outline">{task.workflow.name}</Badge>
                        )}
                        {slaStatus?.isBreached && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertCircle className="h-3 w-3" />
                            SLA Breach
                          </Badge>
                        )}
                        {slaStatus?.isWarning && !slaStatus.isBreached && (
                          <Badge className="bg-amber-100 text-amber-800 gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            SLA Warning
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                        {task.issueDescription}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          {task.warrantyCard.product.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Store className="h-3 w-3" />
                          {task.warrantyCard.shop.name}
                        </span>
                        {task.warrantyCard.customer && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {task.warrantyCard.customer.name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>

                    {/* Current Step & SLA */}
                    <div className="lg:w-64 space-y-2">
                      {task.currentStep && (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="font-normal">
                            {task.currentStep.name}
                          </Badge>
                        </div>
                      )}

                      {slaStatus && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1">
                              <Timer className="h-3 w-3" />
                              SLA
                            </span>
                            <span
                              className={`font-medium ${
                                slaStatus.isBreached
                                  ? "text-red-600"
                                  : slaStatus.isWarning
                                    ? "text-amber-600"
                                    : "text-green-600"
                              }`}
                            >
                              {slaStatus.hoursRemaining > 0
                                ? `${Math.floor(slaStatus.hoursRemaining)}h remaining`
                                : `${Math.abs(Math.floor(slaStatus.hoursRemaining))}h overdue`}
                            </span>
                          </div>
                          <Progress
                            value={slaStatus.percentageUsed}
                            className={`h-1.5 ${
                              slaStatus.isBreached
                                ? "[&>div]:bg-red-500"
                                : slaStatus.isWarning
                                  ? "[&>div]:bg-amber-500"
                                  : "[&>div]:bg-green-500"
                            }`}
                          />
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 lg:ml-4">
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/claims/${task.id}`);
                        }}
                      >
                        <Play className="mr-1 h-3 w-3" />
                        Process
                      </Button>
                      <ChevronRight className="h-4 w-4 text-muted-foreground hidden lg:block" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
        />
      )}
    </div>
  );
}
