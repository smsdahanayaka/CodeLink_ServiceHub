"use client";

// ===========================================
// Step Assignment Mapper Component
// Maps users to workflow steps for a claim
// ===========================================

import { useState, useEffect } from "react";
import { User, Users, Check, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { Skeleton } from "@/components/ui/skeleton";

interface WorkflowStep {
  stepId: number;
  stepName: string;
  stepOrder: number;
  stepType: string;
  defaultAssignee: { id: number; firstName: string | null; lastName: string | null } | null;
  claimAssignment: {
    id: number;
    assignedUser: { id: number; firstName: string | null; lastName: string | null };
  } | null;
  effectiveAssignee: { id: number; firstName: string | null; lastName: string | null } | null;
}

interface UserOption {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role?: { id: number; name: string };
}

interface StepAssignmentInput {
  workflowStepId: number;
  assignedUserId: number;
  notes?: string;
}

interface StepAssignmentMapperProps {
  workflowId: number;
  claimId?: number;
  onChange?: (assignments: StepAssignmentInput[]) => void;
  disabled?: boolean;
  showSaveButton?: boolean;
}

export function StepAssignmentMapper({
  workflowId,
  claimId,
  onChange,
  disabled = false,
  showSaveButton = true,
}: StepAssignmentMapperProps) {
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [assignments, setAssignments] = useState<Record<number, number | null>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch workflow steps and users
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch users
        const usersRes = await fetch("/api/users?limit=100&status=ACTIVE");
        const usersData = await usersRes.json();
        if (usersData.success) {
          setUsers(usersData.data);
        }

        // If we have a claimId, fetch existing assignments
        if (claimId) {
          const assignmentsRes = await fetch(`/api/claims/${claimId}/step-assignments`);
          const assignmentsData = await assignmentsRes.json();
          if (assignmentsData.success) {
            setSteps(assignmentsData.data.stepsWithAssignments);
            // Initialize assignments from existing data
            const initialAssignments: Record<number, number | null> = {};
            assignmentsData.data.stepsWithAssignments.forEach((step: WorkflowStep) => {
              if (step.claimAssignment) {
                initialAssignments[step.stepId] = step.claimAssignment.assignedUser.id;
              }
            });
            setAssignments(initialAssignments);
          }
        } else {
          // Fetch workflow steps directly if no claimId
          const workflowRes = await fetch(`/api/workflows/${workflowId}`);
          const workflowData = await workflowRes.json();
          if (workflowData.success && workflowData.data.steps) {
            const workflowSteps = workflowData.data.steps.map((step: {
              id: number;
              name: string;
              stepOrder: number;
              stepType: string;
              autoAssignTo: number | null;
              autoAssignUser: { id: number; firstName: string | null; lastName: string | null } | null;
            }) => ({
              stepId: step.id,
              stepName: step.name,
              stepOrder: step.stepOrder,
              stepType: step.stepType,
              defaultAssignee: step.autoAssignUser,
              claimAssignment: null,
              effectiveAssignee: step.autoAssignUser,
            }));
            setSteps(workflowSteps);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load workflow steps");
      } finally {
        setLoading(false);
      }
    };

    if (workflowId) {
      fetchData();
    }
  }, [workflowId, claimId]);

  // Handle assignment change
  const handleAssignmentChange = (stepId: number, userId: string) => {
    const newAssignments = {
      ...assignments,
      [stepId]: userId === "none" ? null : parseInt(userId),
    };
    setAssignments(newAssignments);
    setHasChanges(true);

    // Notify parent of changes
    if (onChange) {
      const assignmentArray = Object.entries(newAssignments)
        .filter(([, value]) => value !== null)
        .map(([key, value]) => ({
          workflowStepId: parseInt(key),
          assignedUserId: value as number,
        }));
      onChange(assignmentArray);
    }
  };

  // Save assignments
  const handleSave = async () => {
    if (!claimId) {
      toast.error("Cannot save assignments without a claim ID");
      return;
    }

    const assignmentArray = Object.entries(assignments)
      .filter(([, value]) => value !== null)
      .map(([key, value]) => ({
        workflowStepId: parseInt(key),
        assignedUserId: value as number,
      }));

    if (assignmentArray.length === 0) {
      toast.info("No assignments to save");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/claims/${claimId}/step-assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignments: assignmentArray }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Updated ${data.data.count} step assignment(s)`);
        setHasChanges(false);
      } else {
        toast.error(data.error?.message || "Failed to save assignments");
      }
    } catch (error) {
      console.error("Error saving assignments:", error);
      toast.error("Failed to save assignments");
    } finally {
      setSaving(false);
    }
  };

  // Get user display name
  const getUserName = (user: { firstName: string | null; lastName: string | null } | null) => {
    if (!user) return "Unassigned";
    return `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Unknown";
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Step Assignments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
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
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Step Assignments
          </CardTitle>
          <CardDescription>No workflow steps found</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Step Assignments
        </CardTitle>
        <CardDescription>
          Assign users to handle each workflow step. Leave empty to use workflow defaults.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {steps
            .filter((step) => step.stepType !== "END")
            .map((step) => (
              <div
                key={step.stepId}
                className="flex items-center justify-between gap-4 p-3 border rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-mono">
                      {step.stepOrder + 1}.
                    </span>
                    <span className="font-medium truncate">{step.stepName}</span>
                    <Badge variant="outline" className="text-xs">
                      {step.stepType}
                    </Badge>
                  </div>
                  {step.defaultAssignee && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Default: {getUserName(step.defaultAssignee)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 min-w-[200px]">
                  <Select
                    value={
                      assignments[step.stepId] !== undefined
                        ? assignments[step.stepId]?.toString() || "none"
                        : step.claimAssignment?.assignedUser.id.toString() || "none"
                    }
                    onValueChange={(value) => handleAssignmentChange(step.stepId, value)}
                    disabled={disabled}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select user...">
                        <span className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {assignments[step.stepId]
                            ? getUserName(
                                users.find((u) => u.id === assignments[step.stepId]) || null
                              )
                            : step.claimAssignment
                            ? getUserName(step.claimAssignment.assignedUser)
                            : "Use default"}
                        </span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <X className="h-4 w-4" />
                          Use default
                        </span>
                      </SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          <span className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {getUserName(user)}
                            {user.role && (
                              <span className="text-xs text-muted-foreground">
                                ({user.role.name})
                              </span>
                            )}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {assignments[step.stepId] !== undefined && assignments[step.stepId] !== null && (
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  )}
                </div>
              </div>
            ))}
        </div>

        {showSaveButton && claimId && hasChanges && (
          <div className="mt-4 flex justify-end">
            <Button onClick={handleSave} disabled={saving || disabled}>
              {saving ? "Saving..." : "Save Assignments"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
