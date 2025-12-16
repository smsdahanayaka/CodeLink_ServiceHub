// ===========================================
// Dashboard Home Page
// Unified dashboard with permission-based sections
// ===========================================

import { auth } from "@/lib/auth";
import { UnifiedDashboard } from "../unified-dashboard";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <UnifiedDashboard
      userName={session?.user.firstName || "User"}
      userPermissions={session?.user.permissions || []}
    />
  );
}
