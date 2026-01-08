"use client";

// ===========================================
// Claim Detail/View Page
// ===========================================

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  ClipboardList,
  Package,
  User,
  Store,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MapPin,
  UserPlus,
  MessageSquare,
  History,
  Send,
  GitBranch,
  Play,
  SkipForward,
  ChevronRight,
  Timer,
  AlertCircle,
  Settings,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow, differenceInHours, addHours } from "date-fns";

import { PageHeader } from "@/components/layout";
import { SubTaskList, NextUserSelectionModal, StepAssignmentMapper, ClaimFinalizationSection, AssigneeClaimView, WorkflowVisualization } from "@/components/claims";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { PageLoading, EmptyState } from "@/components/common";
import { Progress } from "@/components/ui/progress";

interface WorkflowTransition {
  id: number;
  transitionName: string | null;
  conditionType: string;
  toStep: { id: number; name: string; statusName: string; stepType: string };
}

interface CurrentStep {
  id: number;
  name: string;
  statusName: string;
  stepType: string;
  description: string | null;
  slaHours: number | null;
  slaWarningHours: number | null;
  canSkip: boolean;
  isOptional: boolean;
  formFields: FormField[] | null;
  transitionsFrom: WorkflowTransition[];
}

interface FormField {
  name: string;
  label: string;
  type: string;
  required: boolean;
  options?: { label: string; value: string }[];
}

interface ClaimDetail {
  id: number;
  claimNumber: string;
  issueDescription: string;
  issueCategory: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  currentStatus: string;
  currentLocation: string;
  reportedBy: string;
  diagnosis: string | null;
  resolution: string | null;
  notes: string | null;
  partsUsed: string[] | null;
  repairCost: string;
  isWarrantyVoid: boolean;
  voidReason: string | null;
  receivedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Phase 5: Warranty validation
  isUnderWarranty: boolean;
  warrantyOverrideBy: number | null;
  warrantyOverrideAt: string | null;
  warrantyOverrideReason: string | null;
  requiresQuotation: boolean;
  // Sequential sub-task workflow
  currentStepAssignee: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
  currentStepStatus: string | null;
  currentStepStartedAt: string | null;
  _currentUserId: number;
  _currentUserCanViewAll: boolean;
  // User context for dual view
  _userContext: {
    isAdmin: boolean;
    isStepAssignee: boolean;
    hasSubTaskAccess: boolean;
    hasStepAssignmentAccess: boolean;
    canEdit: boolean;
    canProcessStep: boolean;
    canAddSubTasks: boolean;
    canAssignWorkflow: boolean;
    canRollback: boolean;
  };
  warrantyCard: {
    id: number;
    cardNumber: string;
    serialNumber: string;
    warrantyEndDate: string;
    product: {
      id: number;
      name: string;
      modelNumber: string | null;
      sku: string | null;
      category: { id: number; name: string } | null;
    };
    customer: {
      id: number;
      name: string;
      phone: string;
      email: string | null;
      address: string | null;
      city: string | null;
      state: string | null;
    } | null;
    shop: {
      id: number;
      name: string;
      code: string | null;
      phone: string | null;
      address: string | null;
    };
  };
  assignedUser: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
  createdByUser: { id: number; firstName: string | null; lastName: string | null } | null;
  workflow: { id: number; name: string } | null;
  currentStep: CurrentStep | null;
  claimHistory: Array<{
    id: number;
    fromStatus: string | null;
    toStatus: string;
    fromLocation: string | null;
    toLocation: string | null;
    actionType: string;
    notes: string | null;
    createdAt: string;
    performedUser: { id: number; firstName: string | null; lastName: string | null };
  }>;
}

interface User {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

interface Workflow {
  id: number;
  name: string;
  description: string | null;
  triggerType: string;
  isActive: boolean;
}

export default function ClaimDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [claim, setClaim] = useState<ClaimDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);

  // Dialog states
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [workflowAssignDialogOpen, setWorkflowAssignDialogOpen] = useState(false);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>("");

  // Form states
  const [newStatus, setNewStatus] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [statusNotes, setStatusNotes] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [assignNotes, setAssignNotes] = useState("");
  const [newNote, setNewNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Workflow execution states
  const [workflowDialogOpen, setWorkflowDialogOpen] = useState(false);
  const [workflowAction, setWorkflowAction] = useState<"complete" | "skip">("complete");
  const [workflowFormData, setWorkflowFormData] = useState<Record<string, unknown>>({});
  const [selectedTransitionId, setSelectedTransitionId] = useState<number | null>(null);
  const [workflowNotes, setWorkflowNotes] = useState("");

  // Next user selection states
  const [nextUserModalOpen, setNextUserModalOpen] = useState(false);
  const [nextUserModalLoading, setNextUserModalLoading] = useState(false);
  const [pendingNextStep, setPendingNextStep] = useState<{
    id: number;
    name: string;
    statusName: string;
  } | null>(null);
  const [suggestedUsers, setSuggestedUsers] = useState<Array<{
    id: number;
    firstName: string | null;
    lastName: string | null;
    roleName: string;
  }>>([]);
  // Optional next step user selection in dialog
  const [dialogNextStepUsers, setDialogNextStepUsers] = useState<Array<{
    id: number;
    firstName: string | null;
    lastName: string | null;
    roleName: string;
  }>>([]);
  const [selectedNextUserId, setSelectedNextUserId] = useState<number | null>(null);
  const [loadingNextStepUsers, setLoadingNextStepUsers] = useState(false);
  // Track sub-task completion status
  const [hasIncompleteSubTasks, setHasIncompleteSubTasks] = useState(false);
  // Refresh key for workflow visualization
  const [workflowRefreshKey, setWorkflowRefreshKey] = useState(0);

  // Fetch claim, users, and workflows
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch claim first - this is required
        const claimRes = await fetch(`/api/claims/${id}`);
        const claimData = await claimRes.json();

        if (claimData.success) {
          setClaim(claimData.data);
        } else {
          toast.error("Claim not found");
          router.push("/claims");
          setLoading(false);
          return;
        }

        // Fetch users and workflows in parallel - these are optional
        // User may not have permission to view these
        try {
          const [usersRes, workflowsRes] = await Promise.all([
            fetch("/api/users?limit=100"),
            fetch("/api/workflows?isActive=true&limit=100"),
          ]);

          if (usersRes.ok) {
            const usersData = await usersRes.json();
            if (usersData.success) {
              setUsers(usersData.data);
            }
          }

          if (workflowsRes.ok) {
            const workflowsData = await workflowsRes.json();
            if (workflowsData.success) {
              setWorkflows(workflowsData.data);
            }
          }
        } catch {
          // Silently ignore - user may not have permission to view users/workflows
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load claim");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, router]);

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

  // Handle status update
  const handleStatusUpdate = async () => {
    if (!newStatus) {
      toast.error("Please select a status");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/claims/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          location: newLocation || undefined,
          notes: statusNotes || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Status updated");
        setStatusDialogOpen(false);
        // Refresh claim data
        const refreshRes = await fetch(`/api/claims/${id}`);
        const refreshData = await refreshRes.json();
        if (refreshData.success) setClaim(refreshData.data);
      } else {
        toast.error(data.error?.message || "Failed to update status");
      }
    } catch (error) {
      toast.error("Failed to update status");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle assignment
  const handleAssign = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/claims/${id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUserId ? parseInt(selectedUserId) : null,
          notes: assignNotes || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Claim assigned");
        setAssignDialogOpen(false);
        // Refresh
        const refreshRes = await fetch(`/api/claims/${id}`);
        const refreshData = await refreshRes.json();
        if (refreshData.success) setClaim(refreshData.data);
      } else {
        toast.error(data.error?.message || "Failed to assign");
      }
    } catch (error) {
      toast.error("Failed to assign claim");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle add note
  const handleAddNote = async () => {
    if (!newNote.trim()) {
      toast.error("Please enter a note");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/claims/${id}/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: newNote.trim() }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Note added");
        setNoteDialogOpen(false);
        setNewNote("");
        // Refresh
        const refreshRes = await fetch(`/api/claims/${id}`);
        const refreshData = await refreshRes.json();
        if (refreshData.success) setClaim(refreshData.data);
      } else {
        toast.error(data.error?.message || "Failed to add note");
      }
    } catch (error) {
      toast.error("Failed to add note");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle workflow assignment
  const handleWorkflowAssignment = async () => {
    if (!selectedWorkflowId) {
      toast.error("Please select a workflow");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/workflows/${selectedWorkflowId}/execute`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimId: parseInt(id),
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Workflow assigned successfully");
        setWorkflowAssignDialogOpen(false);
        setSelectedWorkflowId("");
        // Refresh claim data
        const refreshRes = await fetch(`/api/claims/${id}`);
        const refreshData = await refreshRes.json();
        if (refreshData.success) setClaim(refreshData.data);
      } else {
        toast.error(data.error?.message || "Failed to assign workflow");
      }
    } catch (error) {
      console.error("Error assigning workflow:", error);
      toast.error("Failed to assign workflow");
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate SLA status
  const getSlaStatus = () => {
    if (!claim?.currentStep?.slaHours || !claim?.currentStepStartedAt) {
      return null;
    }

    const startTime = new Date(claim.currentStepStartedAt);
    const deadline = addHours(startTime, claim.currentStep.slaHours);
    const now = new Date();
    const hoursRemaining = differenceInHours(deadline, now);
    const totalHours = claim.currentStep.slaHours;
    const hoursUsed = differenceInHours(now, startTime);
    const percentageUsed = Math.min(100, Math.max(0, (hoursUsed / totalHours) * 100));

    const warningHours = claim.currentStep.slaWarningHours || totalHours * 0.8;
    const isWarning = hoursRemaining <= (totalHours - warningHours) && hoursRemaining > 0;
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

  // Fetch eligible users for next step
  const fetchNextStepUsers = async () => {
    if (!claim?.currentStep?.transitionsFrom || claim.currentStep.transitionsFrom.length === 0) {
      return;
    }
    // Get the next step (first transition or selected transition)
    const transition = selectedTransitionId
      ? claim.currentStep.transitionsFrom.find((t) => t.id === selectedTransitionId)
      : claim.currentStep.transitionsFrom[0];

    if (!transition || transition.toStep.stepType === "END") {
      setDialogNextStepUsers([]);
      return;
    }

    setLoadingNextStepUsers(true);
    try {
      const res = await fetch(`/api/workflows/steps/${transition.toStep.id}/eligible-users`);
      const data = await res.json();
      if (data.success) {
        setDialogNextStepUsers(data.data || []);
      }
    } catch {
      // Silently fail - user selection is optional
    } finally {
      setLoadingNextStepUsers(false);
    }
  };

  // Open workflow dialog and fetch users
  const openWorkflowDialog = (action: "complete" | "skip" = "complete") => {
    setWorkflowAction(action);
    setWorkflowDialogOpen(true);
    setSelectedNextUserId(null);
    fetchNextStepUsers();
  };

  // Handle workflow step execution
  const handleWorkflowStep = async (nextAssignedUserId?: number) => {
    if (!claim?.workflow || !claim?.currentStep) return;

    // For USER_CHOICE transitions, a transition must be selected
    const userChoiceTransitions = claim.currentStep.transitionsFrom.filter(
      (t) => t.conditionType === "USER_CHOICE"
    );
    if (userChoiceTransitions.length > 1 && !selectedTransitionId && workflowAction === "complete") {
      toast.error("Please select the next step");
      return;
    }

    // Validate required form fields
    if (claim.currentStep.formFields && workflowAction === "complete") {
      const missingFields = claim.currentStep.formFields
        .filter((f) => f.required && !workflowFormData[f.name])
        .map((f) => f.label);
      if (missingFields.length > 0) {
        toast.error(`Please fill required fields: ${missingFields.join(", ")}`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/workflows/${claim.workflow.id}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimId: claim.id,
          stepId: claim.currentStep.id,
          action: workflowAction,
          transitionId: selectedTransitionId || undefined,
          formData: Object.keys(workflowFormData).length > 0 ? workflowFormData : undefined,
          notes: workflowNotes || undefined,
          nextAssignedUserId: nextAssignedUserId || selectedNextUserId || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Step ${workflowAction === "skip" ? "skipped" : "completed"} successfully`);
        setWorkflowDialogOpen(false);
        setNextUserModalOpen(false);
        // Reset states
        setWorkflowFormData({});
        setSelectedTransitionId(null);
        setWorkflowNotes("");
        setWorkflowAction("complete");
        setPendingNextStep(null);
        setSuggestedUsers([]);
        // Refresh claim data
        const refreshRes = await fetch(`/api/claims/${id}`);
        const refreshData = await refreshRes.json();
        if (refreshData.success) setClaim(refreshData.data);
      } else {
        // Handle special error codes
        const errorCode = data.error?.code;

        if (errorCode === "SUBTASKS_INCOMPLETE") {
          // Show pending sub-tasks count
          const pendingCount = data.error?.details?.pendingSubTasks?.length || 0;
          toast.error(`Cannot complete step: ${pendingCount} sub-task(s) are still pending. Complete all sub-tasks first.`);
        } else if (errorCode === "NEXT_USER_REQUIRED") {
          // Show next user selection modal
          const nextStep = data.error?.details?.nextStep;
          const eligibleUsers = data.error?.details?.eligibleUsers || [];

          if (nextStep) {
            setPendingNextStep(nextStep);
            setSuggestedUsers(eligibleUsers);
            setWorkflowDialogOpen(false);
            setNextUserModalOpen(true);
          } else {
            toast.error("Next step requires user selection but step info is missing");
          }
        } else {
          toast.error(data.error?.message || "Failed to execute workflow step");
        }
      }
    } catch (error) {
      console.error("Error executing workflow step:", error);
      toast.error("Failed to execute workflow step");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle next user selection
  const handleNextUserSelected = async (userId: number) => {
    setNextUserModalLoading(true);
    await handleWorkflowStep(userId);
    setNextUserModalLoading(false);
  };

  // Refresh claim data (used by sub-task components)
  const refreshClaimData = async () => {
    try {
      const refreshRes = await fetch(`/api/claims/${id}`);
      const refreshData = await refreshRes.json();
      if (refreshData.success) setClaim(refreshData.data);
    } catch (error) {
      console.error("Error refreshing claim:", error);
    }
  };

  // Render form field based on type
  const renderFormField = (field: FormField) => {
    const value = workflowFormData[field.name] || "";

    switch (field.type) {
      case "textarea":
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id={field.name}
              value={value as string}
              onChange={(e) => setWorkflowFormData((prev) => ({ ...prev, [field.name]: e.target.value }))}
              rows={3}
            />
          </div>
        );
      case "select":
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Select
              value={value as string}
              onValueChange={(val) => setWorkflowFormData((prev) => ({ ...prev, [field.name]: val }))}
            >
              <SelectTrigger>
                <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      case "checkbox":
        return (
          <div key={field.name} className="flex items-center space-x-2">
            <input
              type="checkbox"
              id={field.name}
              checked={value as boolean}
              onChange={(e) => setWorkflowFormData((prev) => ({ ...prev, [field.name]: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor={field.name}>
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
          </div>
        );
      case "number":
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id={field.name}
              type="number"
              value={value as string}
              onChange={(e) => setWorkflowFormData((prev) => ({ ...prev, [field.name]: e.target.value }))}
            />
          </div>
        );
      case "date":
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id={field.name}
              type="date"
              value={value as string}
              onChange={(e) => setWorkflowFormData((prev) => ({ ...prev, [field.name]: e.target.value }))}
            />
          </div>
        );
      default:
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id={field.name}
              value={value as string}
              onChange={(e) => setWorkflowFormData((prev) => ({ ...prev, [field.name]: e.target.value }))}
            />
          </div>
        );
    }
  };

  if (loading) return <PageLoading />;
  if (!claim) {
    return (
      <EmptyState
        icon={<ClipboardList className="h-8 w-8 text-muted-foreground" />}
        title="Claim Not Found"
        description="The claim you're looking for doesn't exist."
        action={<Button onClick={() => router.push("/claims")}>Back to Claims</Button>}
      />
    );
  }

  // Status options
  const statusOptions = [
    "new",
    "pending",
    "in_progress",
    "received",
    "in_service",
    "waiting_parts",
    "repaired",
    "quality_check",
    "ready_for_delivery",
    "resolved",
    "closed",
    "rejected",
    "cancelled",
  ];

  // Dual View: Show AssigneeClaimView for non-admin step/sub-task assignees
  // Admin users see full admin view; step assignees and sub-task assignees see restricted view
  const isAdmin = claim._userContext?.isAdmin;
  const isStepAssignee = claim._userContext?.isStepAssignee;
  const hasSubTaskAccess = claim._userContext?.hasSubTaskAccess;

  // Non-admins who are step assignees OR sub-task assignees see restricted view
  if (!isAdmin && (isStepAssignee || hasSubTaskAccess)) {
    return (
      <AssigneeClaimView
        claim={claim}
        onRefresh={refreshClaimData}
      />
    );
  }

  // Admin View - Full control room
  return (
    <div className="space-y-6">
      <PageHeader
        title={`Claim: ${claim.claimNumber}`}
        description={`Created ${format(new Date(claim.createdAt), "dd MMM yyyy, HH:mm")}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button variant="outline" onClick={() => setNoteDialogOpen(true)}>
              <MessageSquare className="mr-2 h-4 w-4" />
              Add Note
            </Button>
            <Button onClick={() => setStatusDialogOpen(true)}>
              Update Status
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* No Workflow Assigned Card */}
          {!claim.workflow && (
            <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <GitBranch className="h-5 w-5 text-amber-600" />
                    No Workflow Assigned
                  </CardTitle>
                </div>
                <CardDescription>
                  This claim doesn&apos;t have a workflow assigned. Assign a workflow to track and process this claim through your service process.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setWorkflowAssignDialogOpen(true)}>
                  <GitBranch className="mr-2 h-4 w-4" />
                  Assign Workflow
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Workflow Step Card */}
          {claim.workflow && claim.currentStep && claim.currentStep.stepType !== "END" && (
            <Card className={claim.currentStep.stepType === "START"
              ? "border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20"
              : "border-primary/50 bg-primary/5"
            }>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <GitBranch className="h-5 w-5 text-primary" />
                    {claim.currentStep.stepType === "START" ? "Workflow Assigned" : "Current Workflow Step"}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-primary border-primary">
                      {claim.workflow.name}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setWorkflowAssignDialogOpen(true)}
                      title={claim.currentStep.stepType !== "START" ? "Cannot change workflow after it has started" : "Change Workflow"}
                      disabled={claim.currentStep.stepType !== "START"}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* START Step - Show as workflow ready to begin */}
                  {claim.currentStep.stepType === "START" ? (
                    <div className="p-4 bg-blue-100/50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-500 rounded-full">
                          <Play className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-base text-blue-900 dark:text-blue-100">
                            Ready to Start Processing
                          </h4>
                          <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                            Claim received and workflow assigned. Click &quot;Start Workflow&quot; to assign to first step.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* ACTION/DECISION Steps - Show normal step info */
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-base">{claim.currentStep.name}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Status: <Badge variant="secondary">{claim.currentStep.statusName}</Badge>
                        </p>
                        {claim.currentStep.description && (
                          <p className="text-sm text-muted-foreground mt-2">{claim.currentStep.description}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* SLA Tracking */}
                  {(() => {
                    const slaStatus = getSlaStatus();
                    if (!slaStatus) return null;

                    return (
                      <div className={`p-3 rounded-lg border ${
                        slaStatus.isBreached
                          ? "bg-red-50 border-red-200 dark:bg-red-950/30"
                          : slaStatus.isWarning
                            ? "bg-amber-50 border-amber-200 dark:bg-amber-950/30"
                            : "bg-muted"
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {slaStatus.isBreached ? (
                              <AlertCircle className="h-4 w-4 text-red-500" />
                            ) : slaStatus.isWarning ? (
                              <AlertTriangle className="h-4 w-4 text-amber-500" />
                            ) : (
                              <Timer className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className={`text-sm font-medium ${
                              slaStatus.isBreached
                                ? "text-red-700 dark:text-red-400"
                                : slaStatus.isWarning
                                  ? "text-amber-700 dark:text-amber-400"
                                  : ""
                            }`}>
                              {slaStatus.isBreached
                                ? "SLA Breached!"
                                : slaStatus.isWarning
                                  ? "SLA Warning"
                                  : "SLA Tracking"}
                            </span>
                          </div>
                          <span className={`text-sm font-bold ${
                            slaStatus.isBreached
                              ? "text-red-700 dark:text-red-400"
                              : slaStatus.isWarning
                                ? "text-amber-700 dark:text-amber-400"
                                : ""
                          }`}>
                            {slaStatus.hoursRemaining > 0
                              ? `${slaStatus.hoursRemaining}h remaining`
                              : `${Math.abs(slaStatus.hoursRemaining)}h overdue`}
                          </span>
                        </div>
                        <Progress
                          value={slaStatus.percentageUsed}
                          className={`h-2 ${
                            slaStatus.isBreached
                              ? "[&>div]:bg-red-500"
                              : slaStatus.isWarning
                                ? "[&>div]:bg-amber-500"
                                : ""
                          }`}
                        />
                        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                          <span>Started: {claim.currentStepStartedAt && formatDistanceToNow(new Date(claim.currentStepStartedAt), { addSuffix: true })}</span>
                          <span>Deadline: {format(slaStatus.deadline, "dd MMM, HH:mm")}</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Sub-Tasks for Current Step */}
                  <SubTaskList
                    claimId={claim.id}
                    workflowStepId={claim.currentStep.id}
                    isCurrentStep={true}
                    onSubTasksChange={() => {
                      refreshClaimData();
                      // Also refresh workflow visualization
                      setWorkflowRefreshKey((prev) => prev + 1);
                    }}
                    // Sequential sub-task workflow props
                    sequentialMode={true}
                    currentUserId={claim._currentUserId}
                    isStepAssignee={claim.currentStepAssignee?.id === claim._currentUserId}
                    showAllForManagers={claim._currentUserCanViewAll}
                    onStepComplete={() => {
                      // Open workflow dialog to complete the step
                      openWorkflowDialog("complete");
                    }}
                    onSubTaskStatusChange={(hasIncomplete: boolean) => {
                      setHasIncompleteSubTasks(hasIncomplete);
                    }}
                  />

                  {/* Available Transitions */}
                  {claim.currentStep.transitionsFrom.length > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground mb-2">Next Steps:</p>
                      <div className="flex flex-wrap gap-2">
                        {claim.currentStep.transitionsFrom.map((transition) => (
                          <div
                            key={transition.id}
                            className="flex items-center gap-1 text-sm bg-muted px-2 py-1 rounded"
                          >
                            <ChevronRight className="h-3 w-3" />
                            {transition.transitionName || transition.toStep.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => openWorkflowDialog("complete")}
                      className="flex-1"
                      disabled={claim.currentStep.stepType !== "START" && hasIncompleteSubTasks}
                      title={claim.currentStep.stepType !== "START" && hasIncompleteSubTasks ? "Complete all sub-tasks first" : undefined}
                    >
                      <Play className="mr-2 h-4 w-4" />
                      {claim.currentStep.stepType === "START" ? "Start Workflow" : "Process Step"}
                    </Button>
                    {claim.currentStep.stepType !== "START" && claim.currentStep.canSkip && (
                      <Button
                        variant="outline"
                        onClick={() => openWorkflowDialog("skip")}
                      >
                        <SkipForward className="mr-2 h-4 w-4" />
                        Skip
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Workflow Completed Badge */}
          {claim.workflow && claim.currentStep && claim.currentStep.stepType === "END" && (
            <Card className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                  <div>
                    <p className="font-medium text-green-700 dark:text-green-400">
                      Workflow Completed
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {claim.workflow.name} - Final Step: {claim.currentStep.name}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Claim Finalization Section - Shows for all claims to manage parts, charges, and invoices */}
          <ClaimFinalizationSection
            claimId={claim.id}
            isUnderWarranty={claim.isUnderWarranty ?? true}
            isWorkflowCompleted={claim.currentStep?.stepType === "END"}
          />

          {/* Claim Status Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Claim Status
                </CardTitle>
                <div className="flex items-center gap-2">
                  {getPriorityBadge(claim.priority)}
                  {getStatusBadge(claim.currentStatus)}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <Clock className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">{format(new Date(claim.createdAt), "dd MMM")}</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <MapPin className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{claim.currentLocation.replace("_", " ")}</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <User className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Assigned To</p>
                  <p className="font-medium">
                    {claim.assignedUser
                      ? `${claim.assignedUser.firstName} ${claim.assignedUser.lastName}`
                      : "Unassigned"}
                  </p>
                </div>
                <div className={`text-center p-4 rounded-lg ${claim.resolvedAt ? "bg-green-50" : "bg-yellow-50"}`}>
                  {claim.resolvedAt ? (
                    <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
                  )}
                  <p className="text-sm text-muted-foreground">
                    {claim.resolvedAt ? "Resolved" : "Pending"}
                  </p>
                  <p className="font-medium">
                    {claim.resolvedAt
                      ? format(new Date(claim.resolvedAt), "dd MMM")
                      : "In Progress"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Issue Details */}
          <Card>
            <CardHeader>
              <CardTitle>Issue Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="mt-1">{claim.issueDescription}</p>
              </div>
              {claim.issueCategory && (
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <Badge variant="outline" className="mt-1">{claim.issueCategory}</Badge>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Reported By</p>
                <p className="mt-1">{claim.reportedBy}</p>
              </div>
            </CardContent>
          </Card>

          {/* Diagnosis & Resolution */}
          {(claim.diagnosis || claim.resolution) && (
            <Card>
              <CardHeader>
                <CardTitle>Diagnosis & Resolution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {claim.diagnosis && (
                  <div>
                    <p className="text-sm text-muted-foreground">Diagnosis</p>
                    <p className="mt-1">{claim.diagnosis}</p>
                  </div>
                )}
                {claim.resolution && (
                  <div>
                    <p className="text-sm text-muted-foreground">Resolution</p>
                    <p className="mt-1">{claim.resolution}</p>
                  </div>
                )}
                {claim.repairCost && parseFloat(claim.repairCost) > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground">Repair Cost</p>
                    <p className="mt-1 font-medium">₹{parseFloat(claim.repairCost).toLocaleString()}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* History Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Activity History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {claim.claimHistory.map((entry, index) => (
                  <div key={entry.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      {index < claim.claimHistory.length - 1 && (
                        <div className="w-0.5 h-full bg-border mt-2" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">
                          {entry.actionType.replace(/_/g, " ")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(entry.createdAt), "dd MMM, HH:mm")}
                        </p>
                      </div>
                      {entry.fromStatus && entry.toStatus && entry.fromStatus !== entry.toStatus && (
                        <p className="text-sm text-muted-foreground">
                          {entry.fromStatus} → {entry.toStatus}
                        </p>
                      )}
                      {entry.notes && <p className="text-sm mt-1">{entry.notes}</p>}
                      <p className="text-xs text-muted-foreground mt-1">
                        by {entry.performedUser.firstName} {entry.performedUser.lastName}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Workflow Visualization */}
          {claim.workflow && (
            <WorkflowVisualization
              claimId={claim.id}
              workflowId={claim.workflow.id}
              workflowName={claim.workflow.name}
              currentStepId={claim.currentStep?.id || null}
              refreshKey={workflowRefreshKey}
            />
          )}

          {/* Product Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Product
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-medium">{claim.warrantyCard.product.name}</p>
                {claim.warrantyCard.product.modelNumber && (
                  <p className="text-sm text-muted-foreground">
                    Model: {claim.warrantyCard.product.modelNumber}
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Serial Number</p>
                <p className="font-mono">{claim.warrantyCard.serialNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Warranty Card</p>
                <p className="font-mono">{claim.warrantyCard.cardNumber}</p>
              </div>
            </CardContent>
          </Card>

          {/* Customer Info */}
          {claim.warrantyCard.customer && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="font-medium">{claim.warrantyCard.customer.name}</p>
                  <p className="text-sm text-muted-foreground">{claim.warrantyCard.customer.phone}</p>
                </div>
                {claim.warrantyCard.customer.email && (
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="text-sm">{claim.warrantyCard.customer.email}</p>
                  </div>
                )}
                {claim.warrantyCard.customer.address && (
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="text-sm">
                      {claim.warrantyCard.customer.address}
                      {claim.warrantyCard.customer.city && `, ${claim.warrantyCard.customer.city}`}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Shop Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Shop
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-medium">{claim.warrantyCard.shop.name}</p>
                {claim.warrantyCard.shop.code && (
                  <p className="text-sm text-muted-foreground">{claim.warrantyCard.shop.code}</p>
                )}
              </div>
              {claim.warrantyCard.shop.phone && (
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="text-sm">{claim.warrantyCard.shop.phone}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Status Update Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Claim Status</DialogTitle>
            <DialogDescription>Change the status and location of this claim</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Select value={newLocation} onValueChange={setNewLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CUSTOMER">Customer</SelectItem>
                  <SelectItem value="SHOP">Shop</SelectItem>
                  <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                  <SelectItem value="SERVICE_CENTER">Service Center</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                placeholder="Add notes about this status change..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStatusUpdate} disabled={submitting}>
              {submitting ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Claim</DialogTitle>
            <DialogDescription>Assign this claim to a team member</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Assign To</Label>
              <Select value={selectedUserId || "unassigned"} onValueChange={(value) => setSelectedUserId(value === "unassigned" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.firstName} {user.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={assignNotes}
                onChange={(e) => setAssignNotes(e.target.value)}
                placeholder="Add notes about this assignment..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={submitting}>
              {submitting ? "Assigning..." : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Note Dialog */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
            <DialogDescription>Add a note to the claim history</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Note</Label>
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Enter your note..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddNote} disabled={submitting}>
              <Send className="mr-2 h-4 w-4" />
              {submitting ? "Adding..." : "Add Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Workflow Step Execution Dialog */}
      <Dialog
        open={workflowDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setWorkflowFormData({});
            setSelectedTransitionId(null);
            setWorkflowNotes("");
          }
          setWorkflowDialogOpen(open);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {workflowAction === "skip" ? (
                <>
                  <SkipForward className="h-5 w-5" />
                  Skip Step
                </>
              ) : (
                <>
                  <Play className="h-5 w-5" />
                  Process Step
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {workflowAction === "skip"
                ? `Skip "${claim?.currentStep?.name}" and move to the next step`
                : `Complete "${claim?.currentStep?.name}" and progress the workflow`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Step Info */}
            {claim?.currentStep && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{claim.currentStep.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Current Status: {claim.currentStep.statusName}
                    </p>
                  </div>
                  <Badge variant="outline">{claim.currentStep.stepType}</Badge>
                </div>
              </div>
            )}

            {/* Form Fields (only for complete action) */}
            {workflowAction === "complete" &&
              claim?.currentStep?.formFields &&
              claim.currentStep.formFields.length > 0 && (
                <div className="space-y-4">
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-3">Required Information</h4>
                    <div className="space-y-4">
                      {claim.currentStep.formFields.map((field) => renderFormField(field))}
                    </div>
                  </div>
                </div>
              )}

            {/* Transition Selection (only for USER_CHOICE with multiple options) */}
            {workflowAction === "complete" &&
              claim?.currentStep?.transitionsFrom &&
              claim.currentStep.transitionsFrom.filter((t) => t.conditionType === "USER_CHOICE")
                .length > 1 && (
                <div className="space-y-2">
                  <Separator />
                  <Label>Select Next Step</Label>
                  <div className="space-y-2">
                    {claim.currentStep.transitionsFrom
                      .filter((t) => t.conditionType === "USER_CHOICE")
                      .map((transition) => (
                        <div
                          key={transition.id}
                          onClick={() => setSelectedTransitionId(transition.id)}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedTransitionId === transition.id
                              ? "border-primary bg-primary/5"
                              : "hover:bg-muted"
                          }`}
                        >
                          <div
                            className={`h-4 w-4 rounded-full border-2 ${
                              selectedTransitionId === transition.id
                                ? "border-primary bg-primary"
                                : "border-muted-foreground"
                            }`}
                          />
                          <div>
                            <p className="font-medium">
                              {transition.transitionName || transition.toStep.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Status: {transition.toStep.statusName}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

            {/* Next Step Info & User Assignment */}
            {claim?.currentStep?.transitionsFrom && claim.currentStep.transitionsFrom.length > 0 && (() => {
              const nextTransition = selectedTransitionId
                ? claim.currentStep!.transitionsFrom.find((t) => t.id === selectedTransitionId)
                : claim.currentStep!.transitionsFrom[0];

              if (!nextTransition) return null;
              const isEndStep = nextTransition.toStep.stepType === "END";

              return (
                <div className="space-y-3">
                  <Separator />
                  {/* Next Step Info */}
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-1">
                      <ChevronRight className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-400">Next Step</span>
                    </div>
                    <p className="font-medium">{nextTransition.toStep.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Status: {nextTransition.toStep.statusName}
                    </p>
                  </div>

                  {/* Optional User Assignment (not for END steps) */}
                  {!isEndStep && (
                    <div className="space-y-2">
                      <Label>Assign User for Next Step (Optional)</Label>
                      {loadingNextStepUsers ? (
                        <div className="text-sm text-muted-foreground">Loading eligible users...</div>
                      ) : dialogNextStepUsers.length > 0 ? (
                        <Select
                          value={selectedNextUserId?.toString() || "none"}
                          onValueChange={(val) => setSelectedNextUserId(val === "none" ? null : parseInt(val))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select user (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              <span className="text-muted-foreground">No assignment (decide later)</span>
                            </SelectItem>
                            {dialogNextStepUsers.map((user) => (
                              <SelectItem key={user.id} value={user.id.toString()}>
                                <div className="flex items-center gap-2">
                                  <UserPlus className="h-4 w-4" />
                                  <span>{user.firstName} {user.lastName}</span>
                                  <Badge variant="outline" className="text-xs">{user.roleName}</Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm text-muted-foreground">No eligible users found for next step</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                value={workflowNotes}
                onChange={(e) => setWorkflowNotes(e.target.value)}
                placeholder="Add any notes about this step..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setWorkflowDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => handleWorkflowStep()}
              disabled={submitting}
              variant={workflowAction === "skip" ? "secondary" : "default"}
            >
              {submitting ? (
                "Processing..."
              ) : workflowAction === "skip" ? (
                <>
                  <SkipForward className="mr-2 h-4 w-4" />
                  Skip Step
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Complete Step
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Workflow Assignment Dialog */}
      <Dialog open={workflowAssignDialogOpen} onOpenChange={setWorkflowAssignDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              {claim?.workflow ? "Change Workflow" : "Assign Workflow"}
            </DialogTitle>
            <DialogDescription>
              {claim?.workflow
                ? "Select a different workflow to replace the current one. This will reset the claim to the first step of the new workflow."
                : "Select a workflow to process this claim. The claim will start at the first step of the workflow."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {claim?.workflow && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Current Workflow</p>
                <p className="font-medium">{claim.workflow.name}</p>
                {claim.currentStep && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Current Step: {claim.currentStep.name}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Select Workflow</Label>
              <Select value={selectedWorkflowId} onValueChange={setSelectedWorkflowId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a workflow..." />
                </SelectTrigger>
                <SelectContent>
                  {workflows.map((wf) => (
                    <SelectItem
                      key={wf.id}
                      value={wf.id.toString()}
                      disabled={claim?.workflow?.id === wf.id}
                    >
                      <div className="flex items-center gap-2">
                        <GitBranch className="h-4 w-4" />
                        <span>{wf.name}</span>
                        {claim?.workflow?.id === wf.id && (
                          <Badge variant="secondary" className="ml-2 text-xs">Current</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {workflows.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No active workflows available. Create a workflow first.
                </p>
              )}
            </div>

            {claim?.workflow && selectedWorkflowId && selectedWorkflowId !== claim.workflow.id.toString() && (
              <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30">
                <div className="flex gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-700 dark:text-amber-400">Warning</p>
                    <p className="text-amber-600 dark:text-amber-300 mt-1">
                      Changing the workflow will reset the claim&apos;s progress. The claim will start from the beginning of the new workflow.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setWorkflowAssignDialogOpen(false);
              setSelectedWorkflowId("");
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleWorkflowAssignment}
              disabled={submitting || !selectedWorkflowId}
            >
              {submitting ? (
                "Assigning..."
              ) : (
                <>
                  <GitBranch className="mr-2 h-4 w-4" />
                  {claim?.workflow ? "Change Workflow" : "Assign Workflow"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Next User Selection Modal */}
      {pendingNextStep && (
        <NextUserSelectionModal
          open={nextUserModalOpen}
          onOpenChange={(open) => {
            setNextUserModalOpen(open);
            if (!open) {
              setPendingNextStep(null);
              setSuggestedUsers([]);
            }
          }}
          nextStep={pendingNextStep}
          onSelectUser={handleNextUserSelected}
          loading={nextUserModalLoading}
          suggestedUsers={suggestedUsers}
        />
      )}
    </div>
  );
}
