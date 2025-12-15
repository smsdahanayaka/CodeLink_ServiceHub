// ===========================================
// Dashboard Layout - Main App Layout
// ===========================================

import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  // Get current session
  const session = await auth();

  // Redirect to login if not authenticated
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <DashboardShell
      userPermissions={session.user.permissions}
      user={{
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        email: session.user.email,
        roleName: session.user.roleName,
      }}
    >
      {children}
    </DashboardShell>
  );
}
