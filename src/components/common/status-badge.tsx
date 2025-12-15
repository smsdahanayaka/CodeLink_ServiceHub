// ===========================================
// Status Badge Component
// ===========================================

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusVariant = "success" | "warning" | "error" | "info" | "default";

interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
  className?: string;
}

// Get variant from status string
function getVariantFromStatus(status: string): StatusVariant {
  const statusLower = status.toLowerCase();

  // Success states
  if (
    ["active", "completed", "delivered", "approved", "success"].includes(
      statusLower
    )
  ) {
    return "success";
  }

  // Warning states
  if (
    ["pending", "in_transit", "processing", "assigned", "trial"].includes(
      statusLower
    )
  ) {
    return "warning";
  }

  // Error states
  if (
    [
      "inactive",
      "suspended",
      "cancelled",
      "failed",
      "expired",
      "void",
      "urgent",
    ].includes(statusLower)
  ) {
    return "error";
  }

  // Info states
  if (["new", "high", "medium"].includes(statusLower)) {
    return "info";
  }

  return "default";
}

// Variant styles
const variantStyles: Record<StatusVariant, string> = {
  success: "bg-green-100 text-green-800 hover:bg-green-100",
  warning: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  error: "bg-red-100 text-red-800 hover:bg-red-100",
  info: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  default: "bg-gray-100 text-gray-800 hover:bg-gray-100",
};

export function StatusBadge({ status, variant, className }: StatusBadgeProps) {
  const computedVariant = variant || getVariantFromStatus(status);

  // Format status text
  const displayText = status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <Badge
      variant="secondary"
      className={cn(variantStyles[computedVariant], className)}
    >
      {displayText}
    </Badge>
  );
}
