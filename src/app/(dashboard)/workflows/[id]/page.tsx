"use client";

// ===========================================
// Workflow Detail View Page
// ===========================================

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Edit,
  Play,
  Pause,
  Trash2,
  Copy,
  GitBranch,
  Clock,
  Users,
  ChevronRight,
  CheckCircle,
  Circle,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageLoading } from "@/components/common";

interface WorkflowStep {
  id: number;
  name: string;
  description: string | null;
  stepOrder: number;
  stepType: "START" | "ACTION" | "DECISION" | "NOTIFICATION" | "WAIT" | "END";
  statusName: string;
  slaHours: number | null;
  slaWarningHours: number | null;
  isOptional: boolean;
  canSkip: boolean;
  requiredRole: { id: number; name: string } | null;
  autoAssignUser: { id: number; firstName: string | null; lastName: string | null } | null;
  transitionsFrom: {
    id: number;
    transitionName: string | null;
    conditionType: string;
    toStep: { id: number; name: string; stepOrder: number };
  }[];
  _count: { currentClaims: number };
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
  updatedAt: string;
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

export default function WorkflowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fetch workflow
  useEffect(() => {
    const fetchWorkflow = async () => {
      try {
        const res = await fetch(`/api/workflows/${id}`);
        const data = await res.json();

        if (data.success) {
          setWorkflow(data.data);
        } else {
          toast.error("Failed to load workflow");
          router.push("/workflows");
        }
      } catch (error) {
        console.error("Error fetching workflow:", error);
        toast.error("Failed to load workflow");
      } finally {
        setLoading(false);
      }
    };
    fetchWorkflow();
  }, [id, router]);

  // Toggle active status
  const handleToggleActive = async () => {
    if (!workflow) return;

    try {
      const res = await fetch(`/api/workflows/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !workflow.isActive }),
      });
      const data = await res.json();

      if (data.success) {
        setWorkflow((prev) => (prev ? { ...prev, isActive: !prev.isActive } : null));
        toast.success(`Workflow ${!workflow.isActive ? "activated" : "deactivated"}`);
      } else {
        toast.error(data.error?.message || "Failed to update workflow");
      }
    } catch (error) {
      console.error("Error updating workflow:", error);
      toast.error("Failed to update workflow");
    }
  };

  // Delete workflow
  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/workflows/${id}`, { method: "DELETE" });
      const data = await res.json();

      if (data.success) {
        toast.success("Workflow deleted successfully");
        router.push("/workflows");
      } else {
        toast.error(data.error?.message || "Failed to delete workflow");
      }
    } catch (error) {
      console.error("Error deleting workflow:", error);
      toast.error("Failed to delete workflow");
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  // Duplicate workflow
  const handleDuplicate = async () => {
    if (!workflow) return;

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

  // Get step type icon
  const getStepTypeIcon = (type: string) => {
    switch (type) {
      case "START":
        return <Circle className="h-4 w-4 text-green-500 fill-green-500" />;
      case "END":
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case "DECISION":
        return <GitBranch className="h-4 w-4 text-amber-500" />;
      case "NOTIFICATION":
        return <AlertTriangle className="h-4 w-4 text-purple-500" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // Get trigger badge
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

  if (loading) {
    return <PageLoading />;
  }

  if (!workflow) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={workflow.name}
        description={workflow.description || "No description provided"}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button variant="outline" onClick={handleDuplicate}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </Button>
            <Button
              variant="outline"
              onClick={handleToggleActive}
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
            </Button>
            <Button onClick={() => router.push(`/workflows/${id}/edit`)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Workflow
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Steps Flow */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                Workflow Steps ({workflow.steps.length})
              </CardTitle>
              <CardDescription>
                Visual representation of the workflow process
              </CardDescription>
            </CardHeader>
            <CardContent>
              {workflow.steps.length === 0 ? (
                <div className="text-center py-8">
                  <GitBranch className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No steps configured yet.</p>
                  <Button
                    className="mt-4"
                    onClick={() => router.push(`/workflows/${id}/edit`)}
                  >
                    Add Steps
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {workflow.steps.map((step, index) => (
                    <div key={step.id} className="relative">
                      {/* Connector Line */}
                      {index > 0 && (
                        <div className="absolute left-6 -top-4 h-4 w-0.5 bg-border" />
                      )}

                      {/* Step Card */}
                      <div className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                        {/* Step Icon */}
                        <div className="flex-shrink-0 mt-1">
                          {getStepTypeIcon(step.stepType)}
                        </div>

                        {/* Step Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{step.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {step.stepType}
                            </Badge>
                            {step.isOptional && (
                              <Badge variant="secondary" className="text-xs">
                                Optional
                              </Badge>
                            )}
                            {step.canSkip && (
                              <Badge variant="secondary" className="text-xs">
                                Skippable
                              </Badge>
                            )}
                          </div>

                          <p className="text-sm text-muted-foreground mt-1">
                            Status: <span className="font-medium">{step.statusName}</span>
                          </p>

                          {step.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {step.description}
                            </p>
                          )}

                          {/* Step Details */}
                          <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
                            {step.slaHours && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                SLA: {step.slaHours}h
                              </span>
                            )}
                            {step.requiredRole && (
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                Role: {step.requiredRole.name}
                              </span>
                            )}
                            {step.autoAssignUser && (
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                Auto-assign: {step.autoAssignUser.firstName} {step.autoAssignUser.lastName}
                              </span>
                            )}
                            {step._count.currentClaims > 0 && (
                              <span className="flex items-center gap-1 text-primary">
                                {step._count.currentClaims} active claims
                              </span>
                            )}
                          </div>

                          {/* Transitions */}
                          {step.transitionsFrom.length > 0 && (
                            <div className="mt-3 space-y-1">
                              {step.transitionsFrom.map((transition) => (
                                <div
                                  key={transition.id}
                                  className="flex items-center gap-2 text-xs text-muted-foreground"
                                >
                                  <ChevronRight className="h-3 w-3" />
                                  <span>
                                    {transition.transitionName || "Next"} →{" "}
                                    <span className="font-medium">
                                      {transition.toStep.name}
                                    </span>
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {transition.conditionType}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Step Order */}
                        <div className="flex-shrink-0 text-sm text-muted-foreground">
                          #{step.stepOrder + 1}
                        </div>
                      </div>

                      {/* Connector Line to next */}
                      {index < workflow.steps.length - 1 && (
                        <div className="absolute left-6 -bottom-4 h-4 w-0.5 bg-border" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Workflow Info */}
          <Card>
            <CardHeader>
              <CardTitle>Workflow Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant={workflow.isActive ? "default" : "secondary"}>
                  {workflow.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Trigger</span>
                {getTriggerBadge(workflow.triggerType)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Default</span>
                <span className="text-sm">
                  {workflow.isDefault ? "Yes" : "No"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Version</span>
                <span className="text-sm">v{workflow.version}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Steps</span>
                <span className="text-sm">{workflow.steps.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active Claims</span>
                <span className="text-sm font-medium">
                  {workflow._count.warrantyClaims}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Meta Info */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-muted-foreground">Created</p>
                <p>
                  {new Date(workflow.createdAt).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              {workflow.createdByUser && (
                <div>
                  <p className="text-muted-foreground">Created By</p>
                  <p>
                    {workflow.createdByUser.firstName} {workflow.createdByUser.lastName}
                  </p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground">Last Updated</p>
                <p>
                  {new Date(workflow.updatedAt).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setShowDeleteDialog(true)}
                disabled={workflow._count.warrantyClaims > 0}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Workflow
              </Button>
              {workflow._count.warrantyClaims > 0 && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Cannot delete workflow with active claims
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workflow</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{workflow.name}&quot;? This action
              cannot be undone. All steps and transitions will be permanently removed.
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
