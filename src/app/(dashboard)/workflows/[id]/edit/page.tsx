"use client";

// ===========================================
// Workflow Editor Page - Visual Workflow Builder
// ===========================================

import { useState, useEffect, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Settings,
  GitBranch,
  Play,
  Square,
  Diamond,
  Bell,
  Clock,
  ChevronRight,
  GripVertical,
  X,
  Check,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageLoading } from "@/components/common";
import { cn } from "@/lib/utils";

// Types
interface Role {
  id: number;
  name: string;
}

interface User {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

interface WorkflowStep {
  id?: number;
  tempId: string;
  name: string;
  description: string;
  stepOrder: number;
  stepType: "START" | "ACTION" | "DECISION" | "NOTIFICATION" | "WAIT" | "END";
  statusName: string;
  slaHours: number | null;
  slaWarningHours: number | null;
  requiredRoleId: number | null;
  autoAssignTo: number | null;
  isOptional: boolean;
  canSkip: boolean;
  formFields: FormField[];
  config: Record<string, unknown>;
}

interface FormField {
  name: string;
  label: string;
  type: "text" | "textarea" | "number" | "select" | "date" | "checkbox";
  required: boolean;
  options?: { label: string; value: string }[];
}

interface Transition {
  fromTempId: string;
  toTempId: string;
  transitionName: string;
  conditionType: "ALWAYS" | "CONDITIONAL" | "USER_CHOICE";
}

interface Workflow {
  id: number;
  name: string;
  description: string | null;
  triggerType: "MANUAL" | "AUTO_ON_CLAIM" | "CONDITIONAL";
  isDefault: boolean;
  isActive: boolean;
}

// Step type configs
const stepTypes = [
  { value: "START", label: "Start", icon: Play, color: "text-green-500", description: "Starting point of the workflow" },
  { value: "ACTION", label: "Action", icon: Square, color: "text-blue-500", description: "Requires user action to proceed" },
  { value: "DECISION", label: "Decision", icon: Diamond, color: "text-amber-500", description: "Branch based on conditions" },
  { value: "NOTIFICATION", label: "Notification", icon: Bell, color: "text-purple-500", description: "Send notification only" },
  { value: "WAIT", label: "Wait", icon: Clock, color: "text-gray-500", description: "Wait for a condition or time" },
  { value: "END", label: "End", icon: Square, color: "text-red-500", description: "End point of the workflow" },
];

// Generate unique temp ID
const generateTempId = () => `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export default function WorkflowEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Workflow data
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [transitions, setTransitions] = useState<Transition[]>([]);

  // Reference data
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // UI state
  const [selectedStep, setSelectedStep] = useState<WorkflowStep | null>(null);
  const [showStepSheet, setShowStepSheet] = useState(false);
  const [showAddStep, setShowAddStep] = useState(false);
  const [deleteStepId, setDeleteStepId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch workflow and reference data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [workflowRes, rolesRes, usersRes] = await Promise.all([
          fetch(`/api/workflows/${id}`),
          fetch("/api/roles?limit=100"),
          fetch("/api/users?limit=100"),
        ]);

        const [workflowData, rolesData, usersData] = await Promise.all([
          workflowRes.json(),
          rolesRes.json(),
          usersRes.json(),
        ]);

        if (rolesData.success) setRoles(rolesData.data);
        if (usersData.success) setUsers(usersData.data);

        if (workflowData.success) {
          const wf = workflowData.data;
          setWorkflow({
            id: wf.id,
            name: wf.name,
            description: wf.description,
            triggerType: wf.triggerType,
            isDefault: wf.isDefault,
            isActive: wf.isActive,
          });

          // Convert steps to internal format
          const loadedSteps: WorkflowStep[] = wf.steps.map((step: {
            id: number;
            name: string;
            description: string | null;
            stepOrder: number;
            stepType: "START" | "ACTION" | "DECISION" | "NOTIFICATION" | "WAIT" | "END";
            statusName: string;
            slaHours: number | null;
            slaWarningHours: number | null;
            requiredRoleId: number | null;
            autoAssignTo: number | null;
            isOptional: boolean;
            canSkip: boolean;
            formFields: FormField[] | null;
            config: Record<string, unknown> | null;
          }) => ({
            id: step.id,
            tempId: `step_${step.id}`,
            name: step.name,
            description: step.description || "",
            stepOrder: step.stepOrder,
            stepType: step.stepType,
            statusName: step.statusName,
            slaHours: step.slaHours,
            slaWarningHours: step.slaWarningHours,
            requiredRoleId: step.requiredRoleId,
            autoAssignTo: step.autoAssignTo,
            isOptional: step.isOptional,
            canSkip: step.canSkip,
            formFields: (step.formFields as FormField[]) || [],
            config: (step.config as Record<string, unknown>) || {},
          }));
          setSteps(loadedSteps);

          // Convert transitions
          const loadedTransitions: Transition[] = [];
          wf.steps.forEach((step: {
            id: number;
            transitionsFrom?: {
              toStep: { id: number };
              transitionName: string | null;
              conditionType: "ALWAYS" | "CONDITIONAL" | "USER_CHOICE";
            }[];
          }) => {
            if (step.transitionsFrom) {
              step.transitionsFrom.forEach((t) => {
                loadedTransitions.push({
                  fromTempId: `step_${step.id}`,
                  toTempId: `step_${t.toStep.id}`,
                  transitionName: t.transitionName || "",
                  conditionType: t.conditionType,
                });
              });
            }
          });
          setTransitions(loadedTransitions);
        } else {
          toast.error("Failed to load workflow");
          router.push("/workflows");
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load workflow");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, router]);

  // Track changes
  useEffect(() => {
    if (!loading) {
      setHasChanges(true);
    }
  }, [steps, transitions]);

  // Add new step
  const handleAddStep = (type: string) => {
    const newStep: WorkflowStep = {
      tempId: generateTempId(),
      name: `New ${type} Step`,
      description: "",
      stepOrder: steps.length,
      stepType: type as WorkflowStep["stepType"],
      statusName: type.toLowerCase(),
      slaHours: null,
      slaWarningHours: null,
      requiredRoleId: null,
      autoAssignTo: null,
      isOptional: false,
      canSkip: false,
      formFields: [],
      config: {},
    };
    setSteps([...steps, newStep]);
    setSelectedStep(newStep);
    setShowStepSheet(true);
    setShowAddStep(false);
  };

  // Update step
  const handleUpdateStep = (updatedStep: WorkflowStep) => {
    setSteps(steps.map((s) => (s.tempId === updatedStep.tempId ? updatedStep : s)));
    setSelectedStep(updatedStep);
  };

  // Delete step
  const handleDeleteStep = () => {
    if (!deleteStepId) return;
    setSteps(steps.filter((s) => s.tempId !== deleteStepId));
    setTransitions(transitions.filter(
      (t) => t.fromTempId !== deleteStepId && t.toTempId !== deleteStepId
    ));
    setDeleteStepId(null);
    setShowStepSheet(false);
    setSelectedStep(null);
  };

  // Move step
  const handleMoveStep = (index: number, direction: "up" | "down") => {
    const newSteps = [...steps];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= steps.length) return;

    [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
    newSteps.forEach((s, i) => (s.stepOrder = i));
    setSteps(newSteps);
  };

  // Add transition
  const handleAddTransition = (fromTempId: string, toTempId: string) => {
    // Check if transition already exists
    const exists = transitions.some(
      (t) => t.fromTempId === fromTempId && t.toTempId === toTempId
    );
    if (exists) return;

    setTransitions([
      ...transitions,
      {
        fromTempId,
        toTempId,
        transitionName: "",
        conditionType: "ALWAYS",
      },
    ]);
  };

  // Remove transition
  const handleRemoveTransition = (fromTempId: string, toTempId: string) => {
    setTransitions(
      transitions.filter(
        (t) => !(t.fromTempId === fromTempId && t.toTempId === toTempId)
      )
    );
  };

  // Save workflow
  const handleSave = async () => {
    if (!workflow) return;

    // Validation
    if (steps.length === 0) {
      toast.error("Add at least one step to the workflow");
      return;
    }

    const hasStart = steps.some((s) => s.stepType === "START");
    const hasEnd = steps.some((s) => s.stepType === "END");
    if (!hasStart) {
      toast.error("Workflow must have a START step");
      return;
    }
    if (!hasEnd) {
      toast.error("Workflow must have an END step");
      return;
    }

    setSaving(true);
    try {
      // Prepare data
      const stepsData = steps.map((s) => ({
        id: s.id,
        tempId: s.tempId,
        name: s.name,
        description: s.description,
        stepOrder: s.stepOrder,
        stepType: s.stepType,
        statusName: s.statusName,
        slaHours: s.slaHours,
        slaWarningHours: s.slaWarningHours,
        requiredRoleId: s.requiredRoleId,
        autoAssignTo: s.autoAssignTo,
        isOptional: s.isOptional,
        canSkip: s.canSkip,
        formFields: s.formFields,
        config: s.config,
      }));

      const transitionsData = transitions.map((t) => ({
        fromStepId: steps.find((s) => s.tempId === t.fromTempId)?.id,
        fromStepTempId: t.fromTempId,
        toStepId: steps.find((s) => s.tempId === t.toTempId)?.id,
        toStepTempId: t.toTempId,
        transitionName: t.transitionName,
        conditionType: t.conditionType,
      }));

      const res = await fetch(`/api/workflows/${id}/steps`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          steps: stepsData,
          transitions: transitionsData,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Workflow saved successfully");
        setHasChanges(false);
        // Refresh to get updated IDs
        router.refresh();
      } else {
        toast.error(data.error?.message || "Failed to save workflow");
      }
    } catch (error) {
      console.error("Error saving workflow:", error);
      toast.error("Failed to save workflow");
    } finally {
      setSaving(false);
    }
  };

  // Get step icon
  const getStepIcon = useCallback((type: string) => {
    const config = stepTypes.find((t) => t.value === type);
    if (!config) return Square;
    return config.icon;
  }, []);

  // Get step color
  const getStepColor = useCallback((type: string) => {
    const config = stepTypes.find((t) => t.value === type);
    return config?.color || "text-gray-500";
  }, []);

  if (loading) {
    return <PageLoading />;
  }

  if (!workflow) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit: ${workflow.name}`}
        description="Configure workflow steps and transitions"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Workflow"}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Step Palette */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Add Steps</CardTitle>
              <CardDescription>Click to add a step type</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {stepTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <Button
                    key={type.value}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => handleAddStep(type.value)}
                  >
                    <Icon className={cn("mr-2 h-4 w-4", type.color)} />
                    {type.label}
                  </Button>
                );
              })}
            </CardContent>
          </Card>

          {/* Workflow Info */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Workflow Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={workflow.isActive ? "default" : "secondary"}>
                  {workflow.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Steps</span>
                <span>{steps.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transitions</span>
                <span>{transitions.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Workflow Canvas */}
        <div className="lg:col-span-3">
          <Card className="min-h-[600px]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                Workflow Steps
              </CardTitle>
              <CardDescription>
                Click on a step to configure it. Drag to reorder.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {steps.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <GitBranch className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No Steps Yet</h3>
                  <p className="text-muted-foreground mt-1 mb-4">
                    Start by adding a START step from the palette
                  </p>
                  <Button onClick={() => handleAddStep("START")}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Start Step
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {steps
                    .sort((a, b) => a.stepOrder - b.stepOrder)
                    .map((step, index) => {
                      const Icon = getStepIcon(step.stepType);
                      const color = getStepColor(step.stepType);
                      const stepTransitions = transitions.filter(
                        (t) => t.fromTempId === step.tempId
                      );

                      return (
                        <div key={step.tempId} className="relative">
                          {/* Connector from previous */}
                          {index > 0 && (
                            <div className="absolute left-8 -top-4 h-4 w-0.5 bg-border" />
                          )}

                          {/* Step Card */}
                          <div
                            className={cn(
                              "flex items-center gap-4 p-4 rounded-lg border bg-card cursor-pointer transition-all",
                              selectedStep?.tempId === step.tempId
                                ? "ring-2 ring-primary"
                                : "hover:bg-muted/50"
                            )}
                            onClick={() => {
                              setSelectedStep(step);
                              setShowStepSheet(true);
                            }}
                          >
                            {/* Drag Handle & Icon */}
                            <div className="flex items-center gap-2">
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                              <div
                                className={cn(
                                  "w-10 h-10 rounded-lg flex items-center justify-center",
                                  step.stepType === "START" && "bg-green-100",
                                  step.stepType === "END" && "bg-red-100",
                                  step.stepType === "ACTION" && "bg-blue-100",
                                  step.stepType === "DECISION" && "bg-amber-100",
                                  step.stepType === "NOTIFICATION" && "bg-purple-100",
                                  step.stepType === "WAIT" && "bg-gray-100"
                                )}
                              >
                                <Icon className={cn("h-5 w-5", color)} />
                              </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{step.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {step.stepType}
                                </Badge>
                                {step.isOptional && (
                                  <Badge variant="secondary" className="text-xs">
                                    Optional
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Status: {step.statusName}
                                {step.slaHours && ` | SLA: ${step.slaHours}h`}
                              </p>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveStep(index, "up");
                                }}
                                disabled={index === 0}
                              >
                                <ChevronRight className="h-4 w-4 -rotate-90" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveStep(index, "down");
                                }}
                                disabled={index === steps.length - 1}
                              >
                                <ChevronRight className="h-4 w-4 rotate-90" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteStepId(step.tempId);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>

                          {/* Transitions */}
                          {stepTransitions.length > 0 && (
                            <div className="ml-16 mt-2 space-y-1">
                              {stepTransitions.map((t) => {
                                const toStep = steps.find(
                                  (s) => s.tempId === t.toTempId
                                );
                                return (
                                  <div
                                    key={`${t.fromTempId}-${t.toTempId}`}
                                    className="flex items-center gap-2 text-sm text-muted-foreground"
                                  >
                                    <ChevronRight className="h-4 w-4" />
                                    <span>
                                      {t.transitionName || "Next"} →{" "}
                                      <span className="font-medium">
                                        {toStep?.name || "Unknown"}
                                      </span>
                                    </span>
                                    <Badge variant="outline" className="text-xs">
                                      {t.conditionType}
                                    </Badge>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() =>
                                        handleRemoveTransition(t.fromTempId, t.toTempId)
                                      }
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Add Transition Button */}
                          {step.stepType !== "END" && (
                            <div className="ml-16 mt-2">
                              <Select
                                value=""
                                onValueChange={(value) =>
                                  handleAddTransition(step.tempId, value)
                                }
                              >
                                <SelectTrigger className="w-[200px] h-8 text-xs">
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add transition...
                                </SelectTrigger>
                                <SelectContent>
                                  {steps
                                    .filter(
                                      (s) =>
                                        s.tempId !== step.tempId &&
                                        !transitions.some(
                                          (t) =>
                                            t.fromTempId === step.tempId &&
                                            t.toTempId === s.tempId
                                        )
                                    )
                                    .map((s) => (
                                      <SelectItem key={s.tempId} value={s.tempId}>
                                        {s.name}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {/* Connector to next */}
                          {index < steps.length - 1 && (
                            <div className="absolute left-8 -bottom-4 h-4 w-0.5 bg-border" />
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Step Configuration Sheet */}
      <Sheet open={showStepSheet} onOpenChange={setShowStepSheet}>
        <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Configure Step</SheetTitle>
            <SheetDescription>
              Edit step properties and settings
            </SheetDescription>
          </SheetHeader>

          {selectedStep && (
            <div className="mt-6 space-y-6">
              <Tabs defaultValue="basic">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Basic</TabsTrigger>
                  <TabsTrigger value="rules">Rules</TabsTrigger>
                  <TabsTrigger value="advanced">Advanced</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Step Name</Label>
                    <Input
                      value={selectedStep.name}
                      onChange={(e) =>
                        handleUpdateStep({ ...selectedStep, name: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={selectedStep.description}
                      onChange={(e) =>
                        handleUpdateStep({
                          ...selectedStep,
                          description: e.target.value,
                        })
                      }
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Step Type</Label>
                    <Select
                      value={selectedStep.stepType}
                      onValueChange={(value) =>
                        handleUpdateStep({
                          ...selectedStep,
                          stepType: value as WorkflowStep["stepType"],
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {stepTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Status Name</Label>
                    <Input
                      value={selectedStep.statusName}
                      onChange={(e) =>
                        handleUpdateStep({
                          ...selectedStep,
                          statusName: e.target.value,
                        })
                      }
                      placeholder="e.g., in_review, pending_approval"
                    />
                    <p className="text-xs text-muted-foreground">
                      This will be the claim status when at this step
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="rules" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Required Role</Label>
                    <Select
                      value={selectedStep.requiredRoleId?.toString() || "none"}
                      onValueChange={(value) =>
                        handleUpdateStep({
                          ...selectedStep,
                          requiredRoleId: value === "none" ? null : parseInt(value),
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Any role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Any role</SelectItem>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id.toString()}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Auto-Assign To</Label>
                    <Select
                      value={selectedStep.autoAssignTo?.toString() || "none"}
                      onValueChange={(value) =>
                        handleUpdateStep({
                          ...selectedStep,
                          autoAssignTo: value === "none" ? null : parseInt(value),
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="No auto-assign" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No auto-assign</SelectItem>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.firstName} {user.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>SLA Hours</Label>
                      <Input
                        type="number"
                        value={selectedStep.slaHours || ""}
                        onChange={(e) =>
                          handleUpdateStep({
                            ...selectedStep,
                            slaHours: e.target.value
                              ? parseInt(e.target.value)
                              : null,
                          })
                        }
                        placeholder="e.g., 24"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Warning Hours</Label>
                      <Input
                        type="number"
                        value={selectedStep.slaWarningHours || ""}
                        onChange={(e) =>
                          handleUpdateStep({
                            ...selectedStep,
                            slaWarningHours: e.target.value
                              ? parseInt(e.target.value)
                              : null,
                          })
                        }
                        placeholder="e.g., 20"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="advanced" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Optional Step</Label>
                      <p className="text-sm text-muted-foreground">
                        This step can be skipped
                      </p>
                    </div>
                    <Switch
                      checked={selectedStep.isOptional}
                      onCheckedChange={(checked) =>
                        handleUpdateStep({
                          ...selectedStep,
                          isOptional: checked,
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Can Skip</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow users to skip this step
                      </p>
                    </div>
                    <Switch
                      checked={selectedStep.canSkip}
                      onCheckedChange={(checked) =>
                        handleUpdateStep({
                          ...selectedStep,
                          canSkip: checked,
                        })
                      }
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowStepSheet(false)}
                >
                  Close
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setDeleteStepId(selectedStep.tempId)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Step Confirmation */}
      <AlertDialog open={!!deleteStepId} onOpenChange={() => setDeleteStepId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Step</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this step? All transitions to and
              from this step will also be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStep}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
