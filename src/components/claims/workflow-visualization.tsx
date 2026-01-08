"use client";

// ===========================================
// Workflow Visualization Component
// Displays workflow steps, sub-tasks, assignees, and status
// Separates Claim Intake phase from Workflow Processing phase
// ===========================================

import { useState, useEffect } from "react";
import {
  CheckCircle2,
  Circle,
  Clock,
  User,
  ChevronDown,
  ChevronRight,
  Play,
  Flag,
  AlertCircle,
  ListTodo,
  GitBranch,
  PackageCheck,
  ArrowDown,
} from "lucide-react";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SubTask {
  id: number;
  title: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH";
  assignedUser: { id: number; firstName: string | null; lastName: string | null } | null;
  completedAt: string | null;
  dueDate: string | null;
}

interface WorkflowStep {
  id: number;
  name: string;
  statusName: string;
  stepType: "START" | "ACTION" | "DECISION" | "END" | "NOTIFICATION" | "WAIT";
  stepOrder: number;
  isCompleted: boolean;
  isCurrent: boolean;
  assignment: {
    assignedUser: { id: number; firstName: string | null; lastName: string | null } | null;
    stepStatus: string | null;
    stepStartedAt: string | null;
    stepCompletedAt: string | null;
  } | null;
  subTasks: SubTask[];
}

interface WorkflowVisualizationProps {
  claimId: number;
  workflowId: number;
  workflowName: string;
  currentStepId: number | null;
  refreshKey?: number; // Increment to trigger refresh
}

export function WorkflowVisualization({
  claimId,
  workflowId,
  workflowName,
  currentStepId,
  refreshKey = 0,
}: WorkflowVisualizationProps) {
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

  useEffect(() => {
    const fetchWorkflowData = async () => {
      try {
        const res = await fetch(`/api/claims/${claimId}/workflow-progress`);
        const data = await res.json();
        if (data.success && data.data?.steps) {
          const fetchedSteps = data.data.steps || [];
          setSteps(fetchedSteps);

          // Auto-expand: current step + any step with sub-tasks
          const toExpand = new Set<number>();
          if (currentStepId) {
            toExpand.add(currentStepId);
          }
          // Also expand steps that have sub-tasks
          fetchedSteps.forEach((step: WorkflowStep) => {
            if (step.subTasks && step.subTasks.length > 0) {
              toExpand.add(step.id);
            }
          });
          setExpandedSteps(toExpand);
        }
      } catch (error) {
        console.error("Error fetching workflow data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkflowData();
  }, [claimId, currentStepId, refreshKey]);

  const toggleStep = (stepId: number) => {
    setExpandedSteps((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  };

  const getStepTypeIcon = (stepType: string, isCompleted: boolean, isCurrent: boolean) => {
    if (isCompleted) {
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    }
    // START step when current shows as "waiting" not "in progress"
    if (stepType === "START" && isCurrent) {
      return <Clock className="h-5 w-5 text-amber-500" />;
    }
    if (isCurrent) {
      return <Play className="h-5 w-5 text-blue-500" />;
    }
    switch (stepType) {
      case "START":
        return <Circle className="h-5 w-5 text-gray-400" />;
      case "END":
        return <Flag className="h-5 w-5 text-gray-400" />;
      default:
        return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStepStatusBadge = (status: string | null) => {
    if (!status) return null;

    const statusConfig: Record<string, { color: string; label: string }> = {
      NOT_STARTED: { color: "bg-gray-100 text-gray-700", label: "Not Started" },
      STARTED: { color: "bg-blue-100 text-blue-700", label: "Started" },
      IN_PROGRESS: { color: "bg-cyan-100 text-cyan-700", label: "In Progress" },
      WAITING_FOR_PARTS: { color: "bg-orange-100 text-orange-700", label: "Waiting Parts" },
      WAITING_FOR_APPROVAL: { color: "bg-yellow-100 text-yellow-700", label: "Waiting Approval" },
      ON_HOLD: { color: "bg-red-100 text-red-700", label: "On Hold" },
      COMPLETED: { color: "bg-green-100 text-green-700", label: "Completed" },
    };

    const config = statusConfig[status] || { color: "bg-gray-100 text-gray-700", label: status };
    return (
      <Badge className={config.color} variant="secondary">
        {config.label}
      </Badge>
    );
  };

  const getSubTaskStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
      case "IN_PROGRESS":
        return <Clock className="h-3.5 w-3.5 text-blue-500" />;
      case "CANCELLED":
        return <AlertCircle className="h-3.5 w-3.5 text-gray-400" />;
      default:
        return <Circle className="h-3.5 w-3.5 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Workflow Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (steps.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Workflow Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No workflow steps available.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Get initial stage sub-tasks (from START step)
  const startStep = steps.find((s) => s.stepType === "START");
  const initialSubTasks = startStep?.subTasks || [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          Workflow Progress
        </CardTitle>
        <CardDescription className="text-xs">
          {workflowName}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Workflow Steps */}
        <div className="space-y-1">
          {/* Initial Stage - Assigned Tasks (always shown if START step has sub-tasks) */}
          {initialSubTasks.length > 0 && (
            <div className="relative">
              {/* Connector line to next step */}
              <div className={cn(
                "absolute left-[11px] top-8 w-0.5 h-[calc(100%-16px)]",
                startStep?.isCompleted ? "bg-green-300" : "bg-amber-300"
              )} />

              <Collapsible defaultOpen={startStep?.isCurrent}>
                <CollapsibleTrigger
                  className={cn(
                    "w-full flex items-start gap-3 p-2 rounded-lg transition-colors text-left cursor-pointer",
                    startStep?.isCompleted
                      ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-950/50"
                      : "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-950/50"
                  )}
                >
                  <div className="shrink-0 mt-0.5">
                    {startStep?.isCompleted ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <ListTodo className="h-5 w-5 text-amber-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn(
                        "font-medium text-sm",
                        startStep?.isCompleted && "text-muted-foreground"
                      )}>Initial Tasks (Start Step)</span>
                      <Badge variant="secondary" className={cn(
                        "text-xs",
                        startStep?.isCompleted ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                      )}>
                        {initialSubTasks.filter((t) => t.status === "COMPLETED").length}/{initialSubTasks.length}
                      </Badge>
                      {startStep?.isCompleted && (
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">Completed</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <span>Initial preparation tasks</span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-8 mt-1 space-y-1 pb-2">
                    {initialSubTasks.map((subTask) => (
                      <div
                        key={subTask.id}
                        className={cn(
                          "flex items-start gap-2 p-2 rounded border text-sm",
                          subTask.status === "COMPLETED" && "bg-green-50 border-green-200",
                          subTask.status === "IN_PROGRESS" && "bg-blue-50 border-blue-200",
                          subTask.status === "CANCELLED" && "opacity-60"
                        )}
                      >
                        {getSubTaskStatusIcon(subTask.status)}
                        <div className="flex-1 min-w-0">
                          <span
                            className={cn(
                              "text-sm",
                              subTask.status === "COMPLETED" && "line-through text-muted-foreground"
                            )}
                          >
                            {subTask.title}
                          </span>
                          {subTask.assignedUser && (
                            <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                              <User className="h-3 w-3" />
                              <span>
                                {subTask.assignedUser.firstName} {subTask.assignedUser.lastName}
                              </span>
                            </div>
                          )}
                        </div>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-xs shrink-0",
                            subTask.priority === "HIGH" && "bg-red-100 text-red-700",
                            subTask.priority === "MEDIUM" && "bg-blue-100 text-blue-700",
                            subTask.priority === "LOW" && "bg-gray-100 text-gray-700"
                          )}
                        >
                          {subTask.priority}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}

          {/* Filter: If START step has sub-tasks, it's shown in "Initial Tasks" section above */}
          {steps.filter((s) => !(s.stepType === "START" && initialSubTasks.length > 0)).map((step, index, filteredSteps) => {
            const isExpanded = expandedSteps.has(step.id);
            // For START step without sub-tasks, show normally
            const stepSubTasks = step.subTasks;
            const hasContent = stepSubTasks.length > 0 || step.assignment?.assignedUser;

            return (
              <div key={step.id} className="relative">
                {/* Connector line */}
                {index < filteredSteps.length - 1 && (
                  <div
                    className={cn(
                      "absolute left-[11px] top-8 w-0.5 h-[calc(100%-16px)]",
                      step.isCompleted ? "bg-green-300" : "bg-gray-200"
                    )}
                  />
                )}

                <Collapsible open={isExpanded}>
                  <CollapsibleTrigger
                    onClick={() => hasContent && toggleStep(step.id)}
                    className={cn(
                      "w-full flex items-start gap-3 p-2 rounded-lg transition-colors text-left",
                      // START step at current position shows amber (waiting) instead of blue (active)
                      step.isCurrent && step.stepType === "START" && "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800",
                      step.isCurrent && step.stepType !== "START" && "bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800",
                      step.isCompleted && !step.isCurrent && "opacity-75",
                      hasContent && "hover:bg-muted cursor-pointer"
                    )}
                  >
                    {/* Step icon */}
                    <div className="shrink-0 mt-0.5">
                      {getStepTypeIcon(step.stepType, step.isCompleted, step.isCurrent)}
                    </div>

                    {/* Step info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={cn(
                            "font-medium text-sm",
                            step.isCompleted && !step.isCurrent && "text-muted-foreground"
                          )}
                        >
                          {step.name}
                        </span>
                        {step.assignment?.stepStatus && getStepStatusBadge(step.assignment.stepStatus)}
                        {/* Show different badge for START step */}
                        {step.isCurrent && step.stepType === "START" && (
                          <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700">Preparation</Badge>
                        )}
                        {step.isCurrent && step.stepType !== "START" && (
                          <Badge variant="default" className="text-xs">Current</Badge>
                        )}
                      </div>

                      {/* Assignee info */}
                      {step.assignment?.assignedUser && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>
                            {step.assignment.assignedUser.firstName} {step.assignment.assignedUser.lastName}
                          </span>
                          {step.assignment.stepStartedAt && (
                            <span className="ml-2">
                              Started: {format(new Date(step.assignment.stepStartedAt), "MMM d, HH:mm")}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Sub-task count indicator - not shown for START step */}
                      {stepSubTasks.length > 0 && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <ListTodo className="h-3 w-3" />
                          <span>
                            {stepSubTasks.filter((t) => t.status === "COMPLETED").length}/{stepSubTasks.length} tasks
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Expand/collapse indicator */}
                    {hasContent && (
                      <div className="shrink-0">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    )}
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    {/* Sub-tasks list - not shown for START step */}
                    {stepSubTasks.length > 0 && (
                      <div className="ml-8 mt-1 space-y-1 pb-2">
                        {stepSubTasks.map((subTask) => (
                          <div
                            key={subTask.id}
                            className={cn(
                              "flex items-start gap-2 p-2 rounded border text-sm",
                              subTask.status === "COMPLETED" && "bg-green-50 border-green-200",
                              subTask.status === "IN_PROGRESS" && "bg-blue-50 border-blue-200",
                              subTask.status === "CANCELLED" && "opacity-60"
                            )}
                          >
                            {getSubTaskStatusIcon(subTask.status)}
                            <div className="flex-1 min-w-0">
                              <span
                                className={cn(
                                  "text-sm",
                                  subTask.status === "COMPLETED" && "line-through text-muted-foreground"
                                )}
                              >
                                {subTask.title}
                              </span>
                              {subTask.assignedUser && (
                                <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                                  <User className="h-3 w-3" />
                                  <span>
                                    {subTask.assignedUser.firstName} {subTask.assignedUser.lastName}
                                  </span>
                                </div>
                              )}
                            </div>
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-xs shrink-0",
                                subTask.priority === "HIGH" && "bg-red-100 text-red-700",
                                subTask.priority === "MEDIUM" && "bg-blue-100 text-blue-700",
                                subTask.priority === "LOW" && "bg-gray-100 text-gray-700"
                              )}
                            >
                              {subTask.priority}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
