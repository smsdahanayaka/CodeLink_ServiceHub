"use client";

// ===========================================
// Assignee Claim View - Restricted view for step assignees
// Shows only: current step, their sub-tasks, editable fields, history summary
// ===========================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  GitBranch,
  Package,
  User,
  Store,
  Calendar,
  CheckCircle,
  Timer,
  AlertCircle,
  AlertTriangle,
  Play,
  History,
  Pencil,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow, differenceInHours, addHours } from "date-fns";

import { PageHeader } from "@/components/layout";
import { SubTaskList } from "./sub-task-list";
import { NextUserSelectionModal } from "./next-user-selection-modal";
import { StepStatusDropdown } from "./step-status-dropdown";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ClaimDetail {
  id: number;
  claimNumber: string;
  issueDescription: string;
  issueCategory: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  currentStatus: string;
  currentLocation: string;
  diagnosis: string | null;
  resolution: string | null;
  notes: string | null;
  createdAt: string;
  currentStepStatus: string | null;
  currentStepStartedAt: string | null;
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
  workflow: { id: number; name: string } | null;
  currentStep: {
    id: number;
    name: string;
    statusName: string;
    stepType: string;
    description: string | null;
    slaHours: number | null;
    slaWarningHours: number | null;
    transitionsFrom: Array<{
      id: number;
      transitionName: string | null;
      conditionType: string;
      toStep: { id: number; name: string; statusName: string };
    }>;
  } | null;
  currentStepAssignee: {
    id: number;
    firstName: string | null;
    lastName: string | null;
  } | null;
  claimHistory: Array<{
    id: number;
    actionType: string;
    notes: string | null;
    createdAt: string;
    performedUser: { firstName: string | null; lastName: string | null };
  }>;
  _userContext: {
    isAdmin: boolean;
    isStepAssignee: boolean;
    hasSubTaskAccess: boolean;
    canEdit: boolean;
    canProcessStep: boolean;
  };
  _currentUserId: number;
}

interface AssigneeClaimViewProps {
  claim: ClaimDetail;
  onRefresh: () => Promise<void>;
}

export function AssigneeClaimView({ claim, onRefresh }: AssigneeClaimViewProps) {
  const router = useRouter();
  const [isEditingDiagnosis, setIsEditingDiagnosis] = useState(false);
  const [diagnosis, setDiagnosis] = useState(claim.diagnosis || "");
  const [resolution, setResolution] = useState(claim.resolution || "");
  const [saving, setSaving] = useState(false);

  // Workflow execution states
  const [workflowDialogOpen, setWorkflowDialogOpen] = useState(false);
  const [workflowNotes, setWorkflowNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedTransitionId, setSelectedTransitionId] = useState<number | null>(null);

  // Next user selection
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

  // History collapse state
  const [historyOpen, setHistoryOpen] = useState(false);

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
    };
  };

  // Save diagnosis/resolution
  const handleSaveDiagnosis = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/claims/${claim.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diagnosis: diagnosis || null,
          resolution: resolution || null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Saved successfully");
        setIsEditingDiagnosis(false);
        await onRefresh();
      } else {
        toast.error(data.error?.message || "Failed to save");
      }
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // Handle workflow step execution
  const handleWorkflowStep = async (nextAssignedUserId?: number) => {
    if (!claim?.workflow || !claim?.currentStep) return;

    // For USER_CHOICE transitions, a transition must be selected
    const userChoiceTransitions = claim.currentStep.transitionsFrom.filter(
      (t) => t.conditionType === "USER_CHOICE"
    );
    if (userChoiceTransitions.length > 1 && !selectedTransitionId) {
      toast.error("Please select the next step");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/workflows/${claim.workflow.id}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimId: claim.id,
          stepId: claim.currentStep.id,
          action: "complete",
          transitionId: selectedTransitionId || undefined,
          notes: workflowNotes || undefined,
          nextAssignedUserId: nextAssignedUserId || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Step completed successfully");
        setWorkflowDialogOpen(false);
        setNextUserModalOpen(false);
        setWorkflowNotes("");
        setSelectedTransitionId(null);
        setPendingNextStep(null);
        setSuggestedUsers([]);
        await onRefresh();
      } else {
        const errorCode = data.error?.code;

        if (errorCode === "SUBTASKS_INCOMPLETE") {
          const pendingCount = data.error?.details?.pendingSubTasks?.length || 0;
          toast.error(`Cannot complete step: ${pendingCount} sub-task(s) are still pending`);
        } else if (errorCode === "NEXT_USER_REQUIRED") {
          const nextStep = data.error?.details?.nextStep;
          const eligibleUsers = data.error?.details?.suggestedUsers || [];

          if (nextStep) {
            setPendingNextStep(nextStep);
            setSuggestedUsers(eligibleUsers);
            setWorkflowDialogOpen(false);
            setNextUserModalOpen(true);
          } else {
            toast.error("Next step requires user selection");
          }
        } else {
          toast.error(data.error?.message || "Failed to complete step");
        }
      }
    } catch {
      toast.error("Failed to complete step");
    } finally {
      setSubmitting(false);
    }
  };

  const handleNextUserSelected = async (userId: number) => {
    setNextUserModalLoading(true);
    await handleWorkflowStep(userId);
    setNextUserModalLoading(false);
  };

  const slaStatus = getSlaStatus();

  // Determine if user is sub-task-only assignee (not the step assignee)
  const isSubTaskOnlyAssignee = claim._userContext.hasSubTaskAccess && !claim._userContext.isStepAssignee;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isSubTaskOnlyAssignee ? `Sub-Task: ${claim.claimNumber}` : `Task: ${claim.claimNumber}`}
        description={`${claim.workflow?.name || "No workflow"} - ${claim.currentStep?.name || "No step"}`}
        actions={
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Step Card */}
          {claim.workflow && claim.currentStep && claim.currentStep.stepType !== "END" && (
            <Card className="border-primary/50 bg-primary/5">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <GitBranch className="h-5 w-5 text-primary" />
                    {isSubTaskOnlyAssignee ? "Your Assigned Sub-Task" : "Your Current Task"}
                  </CardTitle>
                  <Badge variant="outline" className="text-primary border-primary">
                    {claim.workflow.name}
                  </Badge>
                </div>
                <CardDescription>
                  {isSubTaskOnlyAssignee
                    ? "Complete your assigned sub-task below"
                    : claim.currentStep.description || "Complete this step to progress the workflow"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Step Name & Status Dropdown - Only for step assignees */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-base">{claim.currentStep.name}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Workflow Status: <Badge variant="secondary">{claim.currentStep.statusName}</Badge>
                      </p>
                    </div>
                    {/* Step Status Dropdown - Only show for step assignees, not sub-task assignees */}
                    {claim._userContext.isStepAssignee && (
                      <StepStatusDropdown
                        claimId={claim.id}
                        currentStatus={claim.currentStepStatus as "NOT_STARTED" | "STARTED" | "IN_PROGRESS" | "WAITING_FOR_PARTS" | "WAITING_FOR_APPROVAL" | "ON_HOLD" | "COMPLETED" | null}
                        onStatusChange={() => onRefresh()}
                      />
                    )}
                  </div>

                  {/* SLA Tracking - Only show for step assignees */}
                  {slaStatus && claim._userContext.isStepAssignee && (
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
                              ? "text-red-700"
                              : slaStatus.isWarning
                                ? "text-amber-700"
                                : ""
                          }`}>
                            {slaStatus.isBreached ? "SLA Breached!" : slaStatus.isWarning ? "SLA Warning" : "SLA Tracking"}
                          </span>
                        </div>
                        <span className={`text-sm font-bold ${
                          slaStatus.isBreached ? "text-red-700" : slaStatus.isWarning ? "text-amber-700" : ""
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
                  )}

                  {/* Sub-Tasks - Assignee mode */}
                  <SubTaskList
                    claimId={claim.id}
                    workflowStepId={claim.currentStep.id}
                    isCurrentStep={true}
                    onSubTasksChange={onRefresh}
                    sequentialMode={true}
                    currentUserId={claim._currentUserId}
                    isStepAssignee={claim._userContext.isStepAssignee}
                    showAllForManagers={false}
                    assigneeMode={true}
                    hideAddButton={true}
                    onStepComplete={() => setWorkflowDialogOpen(true)}
                  />

                  {/* Process Step Button */}
                  {claim._userContext.canProcessStep && (
                    <div className="pt-2 border-t">
                      <Button
                        onClick={() => setWorkflowDialogOpen(true)}
                        className="w-full"
                      >
                        <Play className="mr-2 h-4 w-4" />
                        Complete Step & Select Next User
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Workflow Completed */}
          {claim.workflow && claim.currentStep && claim.currentStep.stepType === "END" && (
            <Card className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                  <div>
                    <p className="font-medium text-green-700">Task Completed</p>
                    <p className="text-sm text-muted-foreground">
                      This claim has completed its workflow
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Diagnosis & Resolution - Editable (Only for step assignees, not sub-task assignees) */}
          {!isSubTaskOnlyAssignee && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Work Notes</CardTitle>
                {claim._userContext.canEdit && !isEditingDiagnosis && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingDiagnosis(true)}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditingDiagnosis ? (
                <>
                  <div className="space-y-2">
                    <Label>Diagnosis</Label>
                    <Textarea
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      placeholder="Enter your diagnosis..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Resolution</Label>
                    <Textarea
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                      placeholder="Enter resolution notes..."
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveDiagnosis} disabled={saving}>
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save"
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditingDiagnosis(false);
                        setDiagnosis(claim.diagnosis || "");
                        setResolution(claim.resolution || "");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">Diagnosis</p>
                    <p className="mt-1">{claim.diagnosis || "No diagnosis yet"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Resolution</p>
                    <p className="mt-1">{claim.resolution || "No resolution yet"}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          )}

          {/* History Summary - Collapsible */}
          <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5" />
                      History ({claim.claimHistory.length} entries)
                    </CardTitle>
                    <ChevronRight className={`h-5 w-5 transition-transform ${historyOpen ? "rotate-90" : ""}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {claim.claimHistory.slice(0, 10).map((entry) => (
                      <div key={entry.id} className="flex gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{entry.actionType.replace(/_/g, " ")}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          {entry.notes && (
                            <p className="text-muted-foreground mt-0.5">{entry.notes}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            by {entry.performedUser.firstName} {entry.performedUser.lastName}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>

        {/* Sidebar - Minimal Info */}
        <div className="space-y-6">
          {/* Issue Info */}
          <Card>
            <CardHeader>
              <CardTitle>Issue Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="mt-1 text-sm">{claim.issueDescription}</p>
              </div>
              {claim.issueCategory && (
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <Badge variant="outline" className="mt-1">{claim.issueCategory}</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Product Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Product
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="font-medium">{claim.warrantyCard.product.name}</p>
                {claim.warrantyCard.product.modelNumber && (
                  <p className="text-muted-foreground">
                    Model: {claim.warrantyCard.product.modelNumber}
                  </p>
                )}
              </div>
              <div>
                <p className="text-muted-foreground">Serial</p>
                <p className="font-mono text-xs">{claim.warrantyCard.serialNumber}</p>
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
              <CardContent className="space-y-2 text-sm">
                <p className="font-medium">{claim.warrantyCard.customer.name}</p>
                <p className="text-muted-foreground">{claim.warrantyCard.customer.phone}</p>
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
            <CardContent className="text-sm">
              <p className="font-medium">{claim.warrantyCard.shop.name}</p>
              {claim.warrantyCard.shop.code && (
                <p className="text-muted-foreground">{claim.warrantyCard.shop.code}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Process Step Dialog */}
      <Dialog open={workflowDialogOpen} onOpenChange={setWorkflowDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Complete Step
            </DialogTitle>
            <DialogDescription>
              Complete &quot;{claim?.currentStep?.name}&quot; and select the next user
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Transition Selection */}
            {claim?.currentStep?.transitionsFrom &&
              claim.currentStep.transitionsFrom.filter((t) => t.conditionType === "USER_CHOICE").length > 1 && (
                <div className="space-y-2">
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

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                value={workflowNotes}
                onChange={(e) => setWorkflowNotes(e.target.value)}
                placeholder="Add any notes about completing this step..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setWorkflowDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleWorkflowStep()} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
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
