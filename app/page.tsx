export const dynamic = "force-dynamic";

import { DashboardHeader } from "@/components/dashboard/header";
import { StatCard } from "@/components/dashboard/stat-card";
import { LocationChart } from "@/components/charts/location-chart";
import { CategoryChart } from "@/components/charts/category-chart";
import { ActivityChart } from "@/components/charts/activity-chart";
import { TagsChart } from "@/components/charts/tags-chart";
import { RecentDocuments } from "@/components/documents/recent-documents";
import {
  getDocumentStats,
  getDocumentsAddedOverTime,
  getDocumentsReadOverTime,
  getRecentDocuments,
} from "@/app/actions/documents";
import { hasApiToken } from "@/app/actions/settings";
import { 
  BookOpen, 
  Clock, 
  Archive, 
  TrendingUp, 
  FileText,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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

  const [stats, addedOverTime, readOverTime, recentDocs] = await Promise.all([
    getDocumentStats(),
    getDocumentsAddedOverTime(30),
    getDocumentsReadOverTime(30),
    getRecentDocuments(10),
  ]);

  // Calculate some derived stats
  const readLaterCount = stats.byLocation["later"] || 0;
  const archivedCount = stats.byLocation["archive"] || 0;
  const completionRate = stats.total > 0 
    ? Math.round((stats.readingProgress.completed / stats.total) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="container mx-auto py-8 px-4">
        {stats.total === 0 ? (
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
        ) : (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Total Documents"
                value={stats.total}
                icon={FileText}
                description={`${stats.avgWordsPerDocument.toLocaleString()} avg words`}
              />
              <StatCard
                title="Read Later"
                value={readLaterCount}
                icon={Clock}
                description="Documents in queue"
              />
              <StatCard
                title="Archived"
                value={archivedCount}
                icon={Archive}
                description="Documents read"
              />
              <StatCard
                title="This Week"
                value={stats.readThisWeek}
                icon={Calendar}
                trend={{ value: stats.recentlyAdded, label: "added" }}
              />
            </div>

            {/* Charts Row */}
            <div className="grid gap-4 lg:grid-cols-2">
              <LocationChart data={stats.byLocation} />
              <CategoryChart data={stats.byCategory} />
            </div>

            {/* Activity Chart */}
            <div className="grid gap-4 lg:grid-cols-1">
              <ActivityChart addedData={addedOverTime} readData={readOverTime} />
            </div>

            {/* Tags and Completion */}
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <TagsChart data={stats.topTags} />
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Reading Progress
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold">{completionRate}%</div>
                    <div className="text-sm text-muted-foreground">Completion Rate</div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Not Started</span>
                      <span className="font-medium">{stats.readingProgress.notStarted.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">In Progress</span>
                      <span className="font-medium">{stats.readingProgress.inProgress.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Completed</span>
                      <span className="font-medium">{stats.readingProgress.completed.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Documents */}
            <RecentDocuments documents={recentDocs} />
          </div>
        )}
      </main>
    </div>
  );
}
