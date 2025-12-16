"use client";

// ===========================================
// Dashboard Shell - Client-side Layout Wrapper
// Manages mobile sidebar state
// ===========================================

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { usePermissions } from "@/lib/hooks/usePermissions";

interface DashboardShellProps {
  children: React.ReactNode;
  userPermissions: string[];
  user: {
    firstName: string;
    lastName: string;
    email: string;
    roleName: string;
  };
}

export function DashboardShell({ children, userPermissions: initialPermissions, user }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Use the usePermissions hook to get fresh permissions from database
  const { permissions: freshPermissions, isLoading } = usePermissions();

  // Use fresh permissions if available, otherwise fall back to initial
  const userPermissions = !isLoading && freshPermissions.length > 0
    ? freshPermissions
    : initialPermissions;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Sidebar */}
      <Sidebar
        userPermissions={userPermissions}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Header */}
        <Header
          user={user}
          onMenuClick={() => setSidebarOpen(true)}
        />

        {/* Page Content */}
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
