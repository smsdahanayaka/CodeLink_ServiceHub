// ===========================================
// Dashboard Home Page
// ===========================================

import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ClipboardList,
  FileCheck,
  Clock,
  CheckCircle,
  AlertTriangle,
  Truck,
} from "lucide-react";

// Dashboard stats card
function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ElementType;
  trend?: { value: number; isPositive: boolean };
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {trend && (
          <p
            className={`text-xs ${
              trend.isPositive ? "text-green-600" : "text-red-600"
            }`}
          >
            {trend.isPositive ? "+" : "-"}
            {trend.value}% from last month
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={`Welcome back, ${session?.user.firstName || "User"}!`}
        description="Here's what's happening with your service center today."
      />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatsCard
          title="Total Claims"
          value={0}
          description="All time claims"
          icon={ClipboardList}
        />
        <StatsCard
          title="Pending Claims"
          value={0}
          description="Awaiting action"
          icon={Clock}
        />
        <StatsCard
          title="Completed Today"
          value={0}
          description="Resolved claims"
          icon={CheckCircle}
        />
        <StatsCard
          title="Urgent"
          value={0}
          description="High priority"
          icon={AlertTriangle}
        />
        <StatsCard
          title="Active Warranties"
          value={0}
          description="Valid warranty cards"
          icon={FileCheck}
        />
        <StatsCard
          title="In Transit"
          value={0}
          description="Pickups & deliveries"
          icon={Truck}
        />
      </div>

      {/* Recent Activity Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Claims */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Claims</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              No recent claims to display
            </div>
          </CardContent>
        </Card>

        {/* Pending Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              No pending actions
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle>SLA Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            SLA metrics will appear here once claims are processed
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
