"use client";

import { useState, useEffect } from "react";
import { StatCard } from "@/components/dashboard/stat-card";
import { ActivityChart } from "@/components/charts/activity-chart";
import {
  getDocumentsAddedOverTimeWeeks,
  getDocumentsReadOverTimeWeeks,
} from "@/app/actions/documents";
import { TimeSeriesData } from "@/app/actions/documents";
import {
  FileText,
  Clock,
  Archive,
  Calendar,
} from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface DashboardClientProps {
  initialStats: any;
  initialAddedData: TimeSeriesData[];
  initialReadData: TimeSeriesData[];
}

export default function DashboardClient({
  initialStats,
  initialAddedData,
  initialReadData,
}: DashboardClientProps) {
  const [stats] = useState(initialStats);
  const [addedData, setAddedData] = useState(initialAddedData);
  const [readData, setReadData] = useState(initialReadData);
  const [isLoading, setIsLoading] = useState(false);

  // Calculate some derived stats
  const readLaterCount = stats.byLocation["later"] || 0;
  const archivedCount = stats.byLocation["archive"] || 0;

  const handleTimeRangeChange = async (weeks: number) => {
    setIsLoading(true);
    try {
      const [newAddedData, newReadData] = await Promise.all([
        getDocumentsAddedOverTimeWeeks(weeks),
        getDocumentsReadOverTimeWeeks(weeks),
      ]);
      setAddedData(newAddedData);
      setReadData(newReadData);
    } catch (error) {
      console.error("Failed to load new time range data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="container mx-auto py-8 px-4">
      <div className="space-y-8">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Documents"
            value={stats.total}
            icon={FileText}
            description={`${formatNumber(stats.avgWordsPerDocument)} avg words`}
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

        {/* Activity Chart */}
        <div className="grid gap-4 lg:grid-cols-1">
          <div className={isLoading ? "opacity-50 pointer-events-none" : ""}>
            <ActivityChart
              addedData={addedData}
              readData={readData}
              onTimeRangeChange={handleTimeRangeChange}
              initialWeeks={12}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
