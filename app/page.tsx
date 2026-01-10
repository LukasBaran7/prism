export const dynamic = "force-dynamic";

import { DashboardHeader } from "@/components/dashboard/header";
import { StatCard } from "@/components/dashboard/stat-card";
import { ActivityChart } from "@/components/charts/activity-chart";
import {
  getDocumentStats,
  getDocumentsAddedOverTimeWeeks,
  getDocumentsReadOverTimeWeeks,
  getDocumentsAddedOverTime,
  getDocumentsReadOverTime,
} from "@/app/actions/documents";
import { hasApiToken } from "@/app/actions/settings";
import {
  BookOpen,
  Clock,
  Archive,
  FileText,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import DashboardClient from "./dashboard-client";

export default async function DashboardPage() {
  const tokenConfigured = await hasApiToken();

  if (!tokenConfigured) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <main className="container mx-auto py-12 px-4">
          <Card className="max-w-lg mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Welcome to Prism</CardTitle>
              <CardDescription>
                Your personal Readwise Reader dashboard. Connect your account to get started.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button asChild>
                <Link href="/settings">Configure API Token</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const [stats, addedOverTime, readOverTime, dailyAddedOverTime, dailyReadOverTime] = await Promise.all([
    getDocumentStats(),
    getDocumentsAddedOverTimeWeeks(12),
    getDocumentsReadOverTimeWeeks(12),
    getDocumentsAddedOverTime(14),
    getDocumentsReadOverTime(14),
  ]);

  // Calculate some derived stats
  const readLaterCount = stats.byLocation["later"] || 0;
  const archivedCount = stats.byLocation["archive"] || 0;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      {stats.total === 0 ? (
        <main className="container mx-auto py-8 px-4">
          <Card className="max-w-lg mx-auto">
            <CardHeader className="text-center">
              <CardTitle>No Documents Yet</CardTitle>
              <CardDescription>
                Your API token is configured. Sync your documents from Readwise Reader to see your dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button asChild>
                <Link href="/settings">Go to Settings to Sync</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      ) : (
        <DashboardClient
          initialStats={stats}
          initialAddedData={addedOverTime}
          initialReadData={readOverTime}
          initialDailyAddedData={dailyAddedOverTime}
          initialDailyReadData={dailyReadOverTime}
        />
      )}
    </div>
  );
}
