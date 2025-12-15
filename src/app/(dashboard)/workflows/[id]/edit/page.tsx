"use client";

// ===========================================
// Workflow Editor Page - Visual Workflow Builder
// With Drag & Drop Step Reordering
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

// Drag and Drop imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

// Sortable Step Item Component
interface SortableStepItemProps {
  step: WorkflowStep;
  index: number;
  isSelected: boolean;
  transitions: Transition[];
  steps: WorkflowStep[];
  getStepIcon: (type: string) => React.ComponentType<{ className?: string }>;
  getStepColor: (type: string) => string;
  onSelect: () => void;
  onDelete: () => void;
  onAddTransition: (fromTempId: string, toTempId: string) => void;
  onRemoveTransition: (fromTempId: string, toTempId: string) => void;
  openTransitionPopover: string | null;
  setOpenTransitionPopover: (id: string | null) => void;
}

function SortableStepItem({
  step,
  index,
  isSelected,
  transitions,
  steps,
  getStepIcon,
  getStepColor,
  onSelect,
  onDelete,
  onAddTransition,
  onRemoveTransition,
  openTransitionPopover,
  setOpenTransitionPopover,
}: SortableStepItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.tempId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  const Icon = getStepIcon(step.stepType);
  const color = getStepColor(step.stepType);
  const stepTransitions = transitions.filter((t) => t.fromTempId === step.tempId);

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* Connector from previous */}
      {index > 0 && (
        <div className="absolute left-8 -top-4 h-4 w-0.5 bg-border" />
      )}

      {/* Step Card */}
      <div
        className={cn(
          "flex items-center gap-4 p-4 rounded-lg border bg-card transition-all",
          isSelected ? "ring-2 ring-primary" : "hover:bg-muted/50",
          isDragging && "shadow-lg ring-2 ring-primary/50"
        )}
      >
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical className="h-5 w-5 text-muted-foreground hover:text-foreground" />
        </div>

        {/* Step Icon */}
        <div
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center cursor-pointer",
            step.stepType === "START" && "bg-green-100",
            step.stepType === "END" && "bg-red-100",
            step.stepType === "ACTION" && "bg-blue-100",
            step.stepType === "DECISION" && "bg-amber-100",
            step.stepType === "NOTIFICATION" && "bg-purple-100",
            step.stepType === "WAIT" && "bg-gray-100"
          )}
          onClick={onSelect}
        >
          <Icon className={cn("h-5 w-5", color)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onSelect}>
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

        {/* Delete Action */}
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      {/* Transitions */}
      {stepTransitions.length > 0 && (
        <div className="ml-16 mt-2 space-y-1">
          {stepTransitions.map((t) => {
            const toStep = steps.find((s) => s.tempId === t.toTempId);
            return (
              <div
                key={`${t.fromTempId}-${t.toTempId}`}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <ChevronRight className="h-4 w-4" />
                <span>
                  {t.transitionName || "Next"} →{" "}
                  <span className="font-medium">{toStep?.name || "Unknown"}</span>
                </span>
                <Badge variant="outline" className="text-xs">
                  {t.conditionType}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onRemoveTransition(t.fromTempId, t.toTempId)}
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
          {(() => {
            const availableSteps = steps.filter(
              (s) =>
                s.tempId !== step.tempId &&
                !transitions.some(
                  (t) => t.fromTempId === step.tempId && t.toTempId === s.tempId
                )
            );

            if (availableSteps.length === 0) {
              return (
                <span className="text-xs text-muted-foreground italic">
                  No more steps available to connect
                </span>
              );
            }

            return (
              <Popover
                open={openTransitionPopover === step.tempId}
                onOpenChange={(open) =>
                  setOpenTransitionPopover(open ? step.tempId : null)
                }
              >
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                    <Plus className="h-3 w-3" />
                    Add transition...
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[220px] p-2" align="start">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground px-2 pb-1">
                      Select target step
                    </p>
                    {availableSteps.map((s) => {
                      const StepIcon = getStepIcon(s.stepType);
                      return (
                        <Button
                          key={s.tempId}
                          variant="ghost"
                          className="w-full justify-start h-9 text-sm font-normal"
                          onClick={() => {
                            onAddTransition(step.tempId, s.tempId);
                            setOpenTransitionPopover(null);
                          }}
                        >
                          <StepIcon
                            className={cn("h-4 w-4 mr-2", getStepColor(s.stepType))}
                          />
                          {s.name}
                        </Button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            );
          })()}
        </div>
      )}

      {/* Connector to next */}
      {index < steps.length - 1 && (
        <div className="absolute left-8 -bottom-4 h-4 w-0.5 bg-border" />
      )}
    </div>
  );
}

// Drag Overlay Step Component (shown while dragging)
interface DragOverlayStepProps {
  step: WorkflowStep;
  getStepIcon: (type: string) => React.ComponentType<{ className?: string }>;
  getStepColor: (type: string) => string;
}

function DragOverlayStep({ step, getStepIcon, getStepColor }: DragOverlayStepProps) {
  const Icon = getStepIcon(step.stepType);
  const color = getStepColor(step.stepType);

  return (
    <div className="flex items-center gap-4 p-4 rounded-lg border bg-card shadow-xl ring-2 ring-primary">
      <GripVertical className="h-5 w-5 text-muted-foreground" />
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
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">{step.name}</span>
          <Badge variant="outline" className="text-xs">
            {step.stepType}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">Status: {step.statusName}</p>
      </div>
    </div>
  );
}

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
  const [openTransitionPopover, setOpenTransitionPopover] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  // DnD sensors configuration
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before starting drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Handle drag end - reorder steps
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = steps.findIndex((s) => s.tempId === active.id);
      const newIndex = steps.findIndex((s) => s.tempId === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newSteps = arrayMove(steps, oldIndex, newIndex);
        // Update step order based on new position
        newSteps.forEach((step, index) => {
          step.stepOrder = index;
        });
        setSteps(newSteps);
        toast.success("Step order updated");
      }
    }
  };

  // Get dragged step for overlay
  const activeStep = activeId ? steps.find((s) => s.tempId === activeId) : null;

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
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={steps.sort((a, b) => a.stepOrder - b.stepOrder).map((s) => s.tempId)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-4">
                      {steps
                        .sort((a, b) => a.stepOrder - b.stepOrder)
                        .map((step, index) => (
                          <SortableStepItem
                            key={step.tempId}
                            step={step}
                            index={index}
                            isSelected={selectedStep?.tempId === step.tempId}
                            transitions={transitions}
                            steps={steps}
                            getStepIcon={getStepIcon}
                            getStepColor={getStepColor}
                            onSelect={() => {
                              setSelectedStep(step);
                              setShowStepSheet(true);
                            }}
                            onDelete={() => setDeleteStepId(step.tempId)}
                            onAddTransition={handleAddTransition}
                            onRemoveTransition={handleRemoveTransition}
                            openTransitionPopover={openTransitionPopover}
                            setOpenTransitionPopover={setOpenTransitionPopover}
                          />
                        ))}
                    </div>
                  </SortableContext>

                  {/* Drag Overlay - Shows the step being dragged */}
                  <DragOverlay>
                    {activeStep && (
                      <DragOverlayStep
                        step={activeStep}
                        getStepIcon={getStepIcon}
                        getStepColor={getStepColor}
                      />
                    )}
                  </DragOverlay>
                </DndContext>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Step Configuration Sheet */}
      <Sheet open={showStepSheet} onOpenChange={setShowStepSheet}>
        <SheetContent className="w-[540px] sm:max-w-[540px] overflow-y-auto p-0">
          {selectedStep && (
            <>
              {/* Header with step icon */}
              <div className="sticky top-0 z-10 bg-background border-b">
                <div className="px-6 py-5">
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center shadow-sm",
                        selectedStep.stepType === "START" && "bg-green-100",
                        selectedStep.stepType === "END" && "bg-red-100",
                        selectedStep.stepType === "ACTION" && "bg-blue-100",
                        selectedStep.stepType === "DECISION" && "bg-amber-100",
                        selectedStep.stepType === "NOTIFICATION" && "bg-purple-100",
                        selectedStep.stepType === "WAIT" && "bg-gray-100"
                      )}
                    >
                      {(() => {
                        const Icon = getStepIcon(selectedStep.stepType);
                        return <Icon className={cn("h-6 w-6", getStepColor(selectedStep.stepType))} />;
                      })()}
                    </div>
                    <div className="flex-1">
                      <SheetTitle className="text-xl">Configure Step</SheetTitle>
                      <SheetDescription className="mt-0.5">
                        {stepTypes.find(t => t.value === selectedStep.stepType)?.description}
                      </SheetDescription>
                    </div>
                    <Badge variant="outline" className="text-sm px-3 py-1">
                      {selectedStep.stepType}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-6">
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-4 mb-6">
                    <TabsTrigger value="basic" className="gap-2">
                      <Settings className="h-4 w-4" />
                      Basic
                    </TabsTrigger>
                    <TabsTrigger value="rules" className="gap-2">
                      <Check className="h-4 w-4" />
                      Rules
                    </TabsTrigger>
                    <TabsTrigger value="fields" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Fields
                    </TabsTrigger>
                    <TabsTrigger value="advanced" className="gap-2">
                      <Diamond className="h-4 w-4" />
                      Advanced
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="basic" className="space-y-6 mt-0">
                    {/* Step Name */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Step Name *</Label>
                      <Input
                        value={selectedStep.name}
                        onChange={(e) =>
                          handleUpdateStep({ ...selectedStep, name: e.target.value })
                        }
                        placeholder="Enter step name"
                        className="h-11"
                      />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Description</Label>
                      <Textarea
                        value={selectedStep.description}
                        onChange={(e) =>
                          handleUpdateStep({
                            ...selectedStep,
                            description: e.target.value,
                          })
                        }
                        rows={3}
                        placeholder="Describe what happens in this step..."
                        className="resize-none"
                      />
                    </div>

                    {/* Step Type */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Step Type *</Label>
                      <Select
                        value={selectedStep.stepType}
                        onValueChange={(value) =>
                          handleUpdateStep({
                            ...selectedStep,
                            stepType: value as WorkflowStep["stepType"],
                          })
                        }
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {stepTypes.map((type) => {
                            const TypeIcon = type.icon;
                            return (
                              <SelectItem key={type.value} value={type.value}>
                                <div className="flex items-center gap-2">
                                  <TypeIcon className={cn("h-4 w-4", type.color)} />
                                  <span>{type.label}</span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Status Name */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Status Name *</Label>
                      <Input
                        value={selectedStep.statusName}
                        onChange={(e) =>
                          handleUpdateStep({
                            ...selectedStep,
                            statusName: e.target.value,
                          })
                        }
                        placeholder="e.g., in_review, pending_approval"
                        className="h-11"
                      />
                      <p className="text-xs text-muted-foreground mt-1.5">
                        This will be the claim status when at this step. Use lowercase with underscores.
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="rules" className="space-y-6 mt-0">
                    {/* Required Role */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Required Role</Label>
                      <Select
                        value={selectedStep.requiredRoleId?.toString() || "none"}
                        onValueChange={(value) =>
                          handleUpdateStep({
                            ...selectedStep,
                            requiredRoleId: value === "none" ? null : parseInt(value),
                          })
                        }
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Any role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Any role can process</SelectItem>
                          {roles.map((role) => (
                            <SelectItem key={role.id} value={role.id.toString()}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        Only users with this role can process this step
                      </p>
                    </div>

                    {/* Auto-Assign To */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Auto-Assign To</Label>
                      <Select
                        value={selectedStep.autoAssignTo?.toString() || "none"}
                        onValueChange={(value) =>
                          handleUpdateStep({
                            ...selectedStep,
                            autoAssignTo: value === "none" ? null : parseInt(value),
                          })
                        }
                      >
                        <SelectTrigger className="h-11">
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
                      <p className="text-xs text-muted-foreground mt-1.5">
                        Automatically assign claims to this user when reaching this step
                      </p>
                    </div>

                    {/* SLA Section */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">SLA Settings</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Deadline (hours)</Label>
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
                            className="h-11"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Warning (hours)</Label>
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
                            className="h-11"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Set time limits for this step. Warning triggers before deadline.
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="fields" className="space-y-6 mt-0">
                    {/* Form Fields Builder */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-medium">Custom Form Fields</Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            Add fields that users must fill when processing this step
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newField: FormField = {
                              name: `field_${Date.now()}`,
                              label: "New Field",
                              type: "text",
                              required: false,
                            };
                            handleUpdateStep({
                              ...selectedStep,
                              formFields: [...selectedStep.formFields, newField],
                            });
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Field
                        </Button>
                      </div>

                      {selectedStep.formFields.length === 0 ? (
                        <div className="border border-dashed rounded-lg p-8 text-center">
                          <Plus className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            No custom fields defined. Click &quot;Add Field&quot; to create one.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {selectedStep.formFields.map((field, fieldIndex) => (
                            <div
                              key={fieldIndex}
                              className="border rounded-lg p-4 space-y-3 bg-muted/30"
                            >
                              <div className="flex items-center justify-between">
                                <Badge variant="outline" className="text-xs">
                                  {field.type}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive"
                                  onClick={() => {
                                    const newFields = selectedStep.formFields.filter(
                                      (_, i) => i !== fieldIndex
                                    );
                                    handleUpdateStep({
                                      ...selectedStep,
                                      formFields: newFields,
                                    });
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <Label className="text-xs">Field Name (ID)</Label>
                                  <Input
                                    value={field.name}
                                    onChange={(e) => {
                                      const newFields = [...selectedStep.formFields];
                                      newFields[fieldIndex] = {
                                        ...field,
                                        name: e.target.value.toLowerCase().replace(/\s+/g, "_"),
                                      };
                                      handleUpdateStep({
                                        ...selectedStep,
                                        formFields: newFields,
                                      });
                                    }}
                                    placeholder="field_name"
                                    className="h-9"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Display Label</Label>
                                  <Input
                                    value={field.label}
                                    onChange={(e) => {
                                      const newFields = [...selectedStep.formFields];
                                      newFields[fieldIndex] = {
                                        ...field,
                                        label: e.target.value,
                                      };
                                      handleUpdateStep({
                                        ...selectedStep,
                                        formFields: newFields,
                                      });
                                    }}
                                    placeholder="Field Label"
                                    className="h-9"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <Label className="text-xs">Field Type</Label>
                                  <Select
                                    value={field.type}
                                    onValueChange={(value) => {
                                      const newFields = [...selectedStep.formFields];
                                      newFields[fieldIndex] = {
                                        ...field,
                                        type: value as FormField["type"],
                                        options: value === "select" ? [{ label: "Option 1", value: "option_1" }] : undefined,
                                      };
                                      handleUpdateStep({
                                        ...selectedStep,
                                        formFields: newFields,
                                      });
                                    }}
                                  >
                                    <SelectTrigger className="h-9">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="text">Text</SelectItem>
                                      <SelectItem value="textarea">Text Area</SelectItem>
                                      <SelectItem value="number">Number</SelectItem>
                                      <SelectItem value="date">Date</SelectItem>
                                      <SelectItem value="select">Dropdown</SelectItem>
                                      <SelectItem value="checkbox">Checkbox</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex items-end pb-1">
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="checkbox"
                                      id={`required-${fieldIndex}`}
                                      checked={field.required}
                                      onChange={(e) => {
                                        const newFields = [...selectedStep.formFields];
                                        newFields[fieldIndex] = {
                                          ...field,
                                          required: e.target.checked,
                                        };
                                        handleUpdateStep({
                                          ...selectedStep,
                                          formFields: newFields,
                                        });
                                      }}
                                      className="h-4 w-4 rounded border-gray-300"
                                    />
                                    <Label htmlFor={`required-${fieldIndex}`} className="text-xs">
                                      Required field
                                    </Label>
                                  </div>
                                </div>
                              </div>

                              {/* Options for select type */}
                              {field.type === "select" && (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs">Options</Label>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-xs"
                                      onClick={() => {
                                        const newFields = [...selectedStep.formFields];
                                        newFields[fieldIndex] = {
                                          ...field,
                                          options: [
                                            ...(field.options || []),
                                            { label: `Option ${(field.options?.length || 0) + 1}`, value: `option_${(field.options?.length || 0) + 1}` },
                                          ],
                                        };
                                        handleUpdateStep({
                                          ...selectedStep,
                                          formFields: newFields,
                                        });
                                      }}
                                    >
                                      <Plus className="h-3 w-3 mr-1" />
                                      Add Option
                                    </Button>
                                  </div>
                                  <div className="space-y-2">
                                    {field.options?.map((option, optionIndex) => (
                                      <div key={optionIndex} className="flex items-center gap-2">
                                        <Input
                                          value={option.label}
                                          onChange={(e) => {
                                            const newFields = [...selectedStep.formFields];
                                            const newOptions = [...(newFields[fieldIndex].options || [])];
                                            newOptions[optionIndex] = {
                                              label: e.target.value,
                                              value: e.target.value.toLowerCase().replace(/\s+/g, "_"),
                                            };
                                            newFields[fieldIndex] = {
                                              ...field,
                                              options: newOptions,
                                            };
                                            handleUpdateStep({
                                              ...selectedStep,
                                              formFields: newFields,
                                            });
                                          }}
                                          placeholder="Option label"
                                          className="h-8 text-sm"
                                        />
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 shrink-0"
                                          onClick={() => {
                                            const newFields = [...selectedStep.formFields];
                                            const newOptions = (newFields[fieldIndex].options || []).filter(
                                              (_, i) => i !== optionIndex
                                            );
                                            newFields[fieldIndex] = {
                                              ...field,
                                              options: newOptions,
                                            };
                                            handleUpdateStep({
                                              ...selectedStep,
                                              formFields: newFields,
                                            });
                                          }}
                                          disabled={(field.options?.length || 0) <= 1}
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="advanced" className="space-y-6 mt-0">
                    {/* Optional Step */}
                    <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">Optional Step</Label>
                        <p className="text-sm text-muted-foreground">
                          Mark this step as optional in the workflow
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

                    {/* Can Skip */}
                    <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">Allow Skip</Label>
                        <p className="text-sm text-muted-foreground">
                          Users can skip this step when processing claims
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
              </div>

              {/* Footer Actions */}
              <div className="sticky bottom-0 bg-background border-t px-6 py-4">
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 h-11"
                    onClick={() => setShowStepSheet(false)}
                  >
                    Close
                  </Button>
                  <Button
                    variant="destructive"
                    className="h-11"
                    onClick={() => setDeleteStepId(selectedStep.tempId)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Step
                  </Button>
                </div>
              </div>
            </>
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
