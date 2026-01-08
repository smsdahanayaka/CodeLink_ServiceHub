"use client";

// ===========================================
// Step Status Dropdown - Update workflow step status
// ===========================================

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

// Step status options with display info
const STEP_STATUSES = [
  { value: "NOT_STARTED", label: "Not Started", color: "bg-gray-100 text-gray-700" },
  { value: "STARTED", label: "Started", color: "bg-blue-100 text-blue-700" },
  { value: "IN_PROGRESS", label: "In Progress", color: "bg-cyan-100 text-cyan-700" },
  { value: "WAITING_FOR_PARTS", label: "Waiting for Parts", color: "bg-orange-100 text-orange-700" },
  { value: "WAITING_FOR_APPROVAL", label: "Waiting for Approval", color: "bg-yellow-100 text-yellow-700" },
  { value: "ON_HOLD", label: "On Hold", color: "bg-red-100 text-red-700" },
  { value: "COMPLETED", label: "Completed", color: "bg-green-100 text-green-700" },
] as const;

type StepStatus = typeof STEP_STATUSES[number]["value"];

interface StepStatusDropdownProps {
  claimId: number;
  currentStatus: StepStatus | null;
  onStatusChange?: (newStatus: StepStatus) => void;
  disabled?: boolean;
  showBadgeOnly?: boolean;
}

export function StepStatusDropdown({
  claimId,
  currentStatus,
  onStatusChange,
  disabled = false,
  showBadgeOnly = false,
}: StepStatusDropdownProps) {
  const [status, setStatus] = useState<StepStatus>(currentStatus || "NOT_STARTED");
  const [isUpdating, setIsUpdating] = useState(false);

  const currentStatusInfo = STEP_STATUSES.find((s) => s.value === status) || STEP_STATUSES[0];

  // Badge-only view (for display purposes)
  if (showBadgeOnly) {
    return (
      <Badge variant="outline" className={currentStatusInfo.color}>
        {currentStatusInfo.label}
      </Badge>
    );
  }

  const handleStatusChange = async (newStatus: StepStatus) => {
    if (newStatus === status || newStatus === "COMPLETED") {
      // COMPLETED is set by system, not user
      return;
    }

    setIsUpdating(true);
    try {
      const res = await fetch(`/api/claims/${claimId}/step-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepStatus: newStatus }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.error?.message || "Failed to update status");
        return;
      }

      setStatus(newStatus);
      onStatusChange?.(newStatus);
      toast.success(`Status updated to ${STEP_STATUSES.find((s) => s.value === newStatus)?.label}`);
    } catch {
      toast.error("Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  };

  // Filter out COMPLETED - it's set by system when step is processed
  const selectableStatuses = STEP_STATUSES.filter((s) => s.value !== "COMPLETED");

  return (
    <div className="flex items-center gap-2">
      <Select
        value={status}
        onValueChange={(value) => handleStatusChange(value as StepStatus)}
        disabled={disabled || isUpdating || status === "COMPLETED"}
      >
        <SelectTrigger className={`w-[180px] ${currentStatusInfo.color}`}>
          {isUpdating ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Updating...</span>
            </div>
          ) : (
            <SelectValue placeholder="Select status" />
          )}
        </SelectTrigger>
        <SelectContent>
          {selectableStatuses.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${s.color.split(" ")[0]}`} />
                {s.label}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {status === "COMPLETED" && (
        <Badge variant="outline" className="bg-green-100 text-green-700">
          Completed
        </Badge>
      )}
    </div>
  );
}

// Export status info for use in other components
export function getStepStatusInfo(status: string | null) {
  return STEP_STATUSES.find((s) => s.value === status) || STEP_STATUSES[0];
}

export { STEP_STATUSES };
export type { StepStatus };
