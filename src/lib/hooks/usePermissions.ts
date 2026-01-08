"use client";

// ===========================================
// usePermissions Hook - Real-time Permission Management
// ===========================================

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

interface UserData {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  tenantId: number;
  roleId: number;
  roleName: string;
  permissions: string[];
}

interface UsePermissionsReturn {
  permissions: string[];
  roleName: string;
  isLoading: boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  refreshPermissions: () => Promise<void>;
}

export function usePermissions(): UsePermissionsReturn {
  const { data: session, status } = useSession();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get permissions from fresh data or session
  const permissions = userData?.permissions || (session?.user?.permissions as string[]) || [];
  const roleName = userData?.roleName || (session?.user?.roleName as string) || "";

  // Fetch fresh permissions from database
  const refreshPermissions = useCallback(async () => {
    if (status !== "authenticated") return;

    try {
      const res = await fetch("/api/auth/refresh");
      if (!res.ok) {
        // Server returned error - use session permissions as fallback
        setIsLoading(false);
        return;
      }
      const data = await res.json();

      if (data.success) {
        setUserData(data.data);
      }
    } catch {
      // Network error - silently use session permissions as fallback
      // This can happen when server is starting or network is unstable
    } finally {
      setIsLoading(false);
    }
  }, [status]);

  // Initial fetch and periodic refresh
  useEffect(() => {
    if (status === "authenticated") {
      refreshPermissions();

      // Refresh permissions every 5 minutes
      const interval = setInterval(refreshPermissions, 5 * 60 * 1000);
      return () => clearInterval(interval);
    } else if (status === "unauthenticated") {
      setIsLoading(false);
    }
  }, [status, refreshPermissions]);

  // Permission check helpers
  const hasPermission = useCallback(
    (permission: string) => permissions.includes(permission),
    [permissions]
  );

  const hasAnyPermission = useCallback(
    (requiredPermissions: string[]) =>
      requiredPermissions.some((p) => permissions.includes(p)),
    [permissions]
  );

  const hasAllPermissions = useCallback(
    (requiredPermissions: string[]) =>
      requiredPermissions.every((p) => permissions.includes(p)),
    [permissions]
  );

  return {
    permissions,
    roleName,
    isLoading: status === "loading" || (status === "authenticated" && isLoading),
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    refreshPermissions,
  };
}
