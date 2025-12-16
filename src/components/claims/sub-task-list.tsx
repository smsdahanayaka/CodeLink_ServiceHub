"use client";

// ===========================================
// Sub-Task List Component
// Displays and manages sub-tasks within a workflow step
// ===========================================

import { useState, useEffect } from "react";
import {
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  Trash2,
  User,
  AlertCircle,
  MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { SubTaskFormDialog } from "./sub-task-form-dialog";

interface SubTask {
  id: number;
  title: string;
  description: string | null;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH";
  dueDate: string | null;
  completedAt: string | null;
  sortOrder: number;
  assignedUser: { id: number; firstName: string | null; lastName: string | null } | null;
  createdByUser: { id: number; firstName: string | null; lastName: string | null };
  completedByUser: { id: number; firstName: string | null; lastName: string | null } | null;
  workflowStep: { id: number; name: string };
}

interface SubTaskListProps {
  claimId: number;
  workflowStepId: number;
  isCurrentStep: boolean;
  onSubTasksChange?: () => void;
}

export function SubTaskList({
  claimId,
  workflowStepId,
  isCurrentStep,
  onSubTasksChange,
}: SubTaskListProps) {
  const [subTasks, setSubTasks] = useState<SubTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<SubTask | null>(null);

  // Fetch sub-tasks
  const fetchSubTasks = async () => {
    try {
      const res = await fetch(`/api/claims/${claimId}/sub-tasks?stepId=${workflowStepId}`);
      const data = await res.json();
      if (data.success) {
        setSubTasks(data.data.subTasks);
      }
    } catch (error) {
      console.error("Error fetching sub-tasks:", error);
      toast.error("Failed to load sub-tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubTasks();
  }, [claimId, workflowStepId]);

  // Complete sub-task
  const handleComplete = async (taskId: number) => {
    try {
      const res = await fetch(`/api/claims/${claimId}/sub-tasks/${taskId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Sub-task completed");
        fetchSubTasks();
        onSubTasksChange?.();
      } else {
        toast.error(data.error?.message || "Failed to complete sub-task");
      }
    } catch (error) {
      console.error("Error completing sub-task:", error);
      toast.error("Failed to complete sub-task");
    }
  };

  // Update sub-task status
  const handleStatusChange = async (taskId: number, status: string) => {
    try {
      const res = await fetch(`/api/claims/${claimId}/sub-tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Sub-task updated");
        fetchSubTasks();
        onSubTasksChange?.();
      } else {
        toast.error(data.error?.message || "Failed to update sub-task");
      }
    } catch (error) {
      console.error("Error updating sub-task:", error);
      toast.error("Failed to update sub-task");
    }
  };

  // Delete sub-task
  const handleDelete = async (taskId: number) => {
    if (!confirm("Are you sure you want to delete this sub-task?")) return;

    try {
      const res = await fetch(`/api/claims/${claimId}/sub-tasks/${taskId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Sub-task deleted");
        fetchSubTasks();
        onSubTasksChange?.();
      } else {
        toast.error(data.error?.message || "Failed to delete sub-task");
      }
    } catch (error) {
      console.error("Error deleting sub-task:", error);
      toast.error("Failed to delete sub-task");
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "IN_PROGRESS":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "CANCELLED":
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  // Get priority badge
  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, string> = {
      LOW: "bg-gray-100 text-gray-700",
      MEDIUM: "bg-blue-100 text-blue-700",
      HIGH: "bg-red-100 text-red-700",
    };
    return (
      <Badge className={variants[priority] || "bg-gray-100"} variant="secondary">
        {priority}
      </Badge>
    );
  };

  // Calculate progress
  const totalTasks = subTasks.length;
  const completedTasks = subTasks.filter((t) => t.status === "COMPLETED").length;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Sub-Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                Sub-Tasks
                {totalTasks > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {completedTasks}/{totalTasks}
                  </Badge>
                )}
              </CardTitle>
              {totalTasks > 0 && (
                <CardDescription className="text-xs mt-1">
                  {Math.round(progress)}% complete
                </CardDescription>
              )}
            </div>
            {isCurrentStep && (
              <Button size="sm" variant="outline" onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            )}
          </div>
          {totalTasks > 0 && (
            <Progress value={progress} className="h-1 mt-2" />
          )}
        </CardHeader>
        <CardContent>
          {subTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {isCurrentStep
                ? "No sub-tasks yet. Add one to track work within this step."
                : "No sub-tasks for this step."}
            </p>
          ) : (
            <div className="space-y-2">
              {subTasks.map((task) => (
                <div
                  key={task.id}
                  className={`flex items-start gap-3 p-2 rounded-lg border ${
                    task.status === "COMPLETED"
                      ? "bg-green-50 border-green-200"
                      : task.status === "CANCELLED"
                      ? "bg-gray-50 border-gray-200 opacity-60"
                      : "bg-white"
                  }`}
                >
                  <button
                    onClick={() =>
                      task.status !== "COMPLETED" && task.status !== "CANCELLED"
                        ? handleComplete(task.id)
                        : null
                    }
                    disabled={task.status === "COMPLETED" || task.status === "CANCELLED"}
                    className="mt-0.5 hover:scale-110 transition-transform disabled:cursor-not-allowed"
                  >
                    {getStatusIcon(task.status)}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-medium text-sm ${
                          task.status === "COMPLETED" ? "line-through text-muted-foreground" : ""
                        }`}
                      >
                        {task.title}
                      </span>
                      {getPriorityBadge(task.priority)}
                    </div>
                    {task.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {task.assignedUser && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {task.assignedUser.firstName} {task.assignedUser.lastName}
                        </span>
                      )}
                      {task.dueDate && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(task.dueDate), "MMM d")}
                        </span>
                      )}
                    </div>
                  </div>

                  {isCurrentStep && task.status !== "COMPLETED" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {task.status === "PENDING" && (
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(task.id, "IN_PROGRESS")}
                          >
                            <Clock className="h-4 w-4 mr-2" />
                            Start Working
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleComplete(task.id)}>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Mark Complete
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditingTask(task)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {task.status !== "CANCELLED" && (
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(task.id, "CANCELLED")}
                            className="text-orange-600"
                          >
                            Cancel
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleDelete(task.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Sub-Task Dialog */}
      <SubTaskFormDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        claimId={claimId}
        workflowStepId={workflowStepId}
        onSuccess={() => {
          setShowAddDialog(false);
          fetchSubTasks();
          onSubTasksChange?.();
        }}
      />

      {/* Edit Sub-Task Dialog */}
      {editingTask && (
        <SubTaskFormDialog
          open={!!editingTask}
          onOpenChange={() => setEditingTask(null)}
          claimId={claimId}
          workflowStepId={workflowStepId}
          subTask={editingTask}
          onSuccess={() => {
            setEditingTask(null);
            fetchSubTasks();
            onSubTasksChange?.();
          }}
        />
      )}
    </>
  );
}
