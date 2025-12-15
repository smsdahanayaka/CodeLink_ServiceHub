"use client";

// ===========================================
// Sidebar Navigation Component
// ===========================================

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Shield,
  Package,
  Store,
  UserCircle,
  FileCheck,
  ClipboardList,
  GitBranch,
  Truck,
  Settings,
  LogOut,
  ChevronDown,
  Inbox,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

// Navigation menu items
const menuItems = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "My Tasks",
    href: "/my-tasks",
    icon: Inbox,
    permission: "claims.view_assigned",
  },
  {
    title: "Users & Roles",
    icon: Users,
    children: [
      { title: "Users", href: "/users", permission: "users.view" },
      { title: "Roles", href: "/roles", permission: "roles.view" },
    ],
  },
  {
    title: "Products",
    href: "/products",
    icon: Package,
    permission: "products.view",
  },
  {
    title: "Shops",
    href: "/shops",
    icon: Store,
    permission: "shops.view",
  },
  {
    title: "Customers",
    href: "/customers",
    icon: UserCircle,
    permission: "customers.view",
  },
  {
    title: "Warranty Cards",
    href: "/warranty",
    icon: FileCheck,
    permission: "warranty_cards.view",
  },
  {
    title: "Claims",
    href: "/claims",
    icon: ClipboardList,
    permission: "claims.view",
  },
  {
    title: "Workflows",
    href: "/workflows",
    icon: GitBranch,
    permission: "workflows.view",
  },
  {
    title: "Logistics",
    icon: Truck,
    children: [
      { title: "Dashboard", href: "/logistics", permission: "logistics.view" },
      { title: "Collectors", href: "/logistics/collectors", permission: "logistics.view" },
      { title: "Pickups", href: "/logistics/pickups", permission: "logistics.view" },
      { title: "Deliveries", href: "/logistics/deliveries", permission: "logistics.view" },
    ],
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    permission: "settings.view",
  },
];

interface SidebarProps {
  userPermissions?: string[];
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ userPermissions = [], isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // Close sidebar when route changes (mobile)
  useEffect(() => {
    if (onClose) {
      onClose();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Check if user has permission
  const hasPermission = (permission?: string) => {
    if (!permission) return true;
    return userPermissions.includes(permission);
  };

  // Toggle expanded state
  const toggleExpanded = (title: string) => {
    setExpandedItems((prev) =>
      prev.includes(title)
        ? prev.filter((item) => item !== title)
        : [...prev, title]
    );
  };

  // Check if menu item is active
  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen w-64 border-r bg-card transition-transform duration-300 ease-in-out lg:translate-x-0 lg:z-40",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between border-b px-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Package className="h-5 w-5" />
              </div>
              <span className="text-lg font-semibold">ServiceHub</span>
            </Link>
            {/* Close button for mobile */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              // Check permission for single item
              if (item.permission && !hasPermission(item.permission)) {
                return null;
              }

              // Handle items with children
              if (item.children) {
                const visibleChildren = item.children.filter((child) =>
                  hasPermission(child.permission)
                );

                if (visibleChildren.length === 0) return null;

                const isExpanded = expandedItems.includes(item.title);
                const hasActiveChild = visibleChildren.some((child) =>
                  isActive(child.href)
                );

                return (
                  <li key={item.title}>
                    <button
                      onClick={() => toggleExpanded(item.title)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                        hasActiveChild
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="h-5 w-5" />
                        <span>{item.title}</span>
                      </div>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform",
                          isExpanded && "rotate-180"
                        )}
                      />
                    </button>

                    {isExpanded && (
                      <ul className="ml-8 mt-1 space-y-1">
                        {visibleChildren.map((child) => (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              className={cn(
                                "block rounded-lg px-3 py-2 text-sm transition-colors",
                                isActive(child.href)
                                  ? "bg-primary/10 text-primary"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                              )}
                            >
                              {child.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              }

              // Handle single item
              return (
                <li key={item.href}>
                  <Link
                    href={item.href!}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      isActive(item.href!)
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t p-4">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </Button>
        </div>
        </div>
      </aside>
    </>
  );
}
