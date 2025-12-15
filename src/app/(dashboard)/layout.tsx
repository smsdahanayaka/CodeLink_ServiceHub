// ===========================================
// Dashboard Layout - Main App Layout
// ===========================================

import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

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
    <div className="min-h-screen bg-muted/30">
      {/* Sidebar */}
      <Sidebar userPermissions={session.user.permissions} />

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Header */}
        <Header
          user={{
            firstName: session.user.firstName,
            lastName: session.user.lastName,
            email: session.user.email,
            roleName: session.user.roleName,
          }}
        />

        {/* Page Content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
