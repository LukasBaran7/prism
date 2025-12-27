"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, Clock, BookOpen, AlertTriangle } from "lucide-react";
import { VelocityMetrics } from "@/app/actions/triage";

interface VelocityCardProps {
  metrics: VelocityMetrics;
}

export function VelocityCard({ metrics }: VelocityCardProps) {
  const isGrowing = metrics.weeklyNetChange > 0;
  const isShrinking = metrics.weeklyNetChange < 0;
  const isStable = metrics.weeklyNetChange === 0;

  const TrendIcon = isGrowing ? TrendingUp : isShrinking ? TrendingDown : Minus;
  const trendColor = isGrowing ? "text-red-500" : isShrinking ? "text-green-500" : "text-muted-foreground";

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendIcon className={`h-5 w-5 ${trendColor}`} />
          Queue Velocity
        </CardTitle>
        <CardDescription>
          How fast your reading backlog is growing or shrinking
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Weekly Stats */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">This Week</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-green-600">+{metrics.addedLast7Days}</span>
              <span className="text-sm text-muted-foreground">added</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-blue-600">-{metrics.readLast7Days}</span>
              <span className="text-sm text-muted-foreground">read</span>
            </div>
            <div className={`flex items-baseline gap-2 pt-2 border-t ${trendColor}`}>
              <span className="text-lg font-semibold">
                {metrics.weeklyNetChange >= 0 ? "+" : ""}{metrics.weeklyNetChange}
              </span>
              <span className="text-sm">net/week</span>
            </div>
          </div>

          {/* Monthly Stats */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">This Month</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-green-600">+{metrics.addedLast30Days}</span>
              <span className="text-sm text-muted-foreground">added</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-blue-600">-{metrics.readLast30Days}</span>
              <span className="text-sm text-muted-foreground">read</span>
            </div>
            <div className={`flex items-baseline gap-2 pt-2 border-t ${metrics.monthlyNetChange > 0 ? "text-red-500" : metrics.monthlyNetChange < 0 ? "text-green-500" : "text-muted-foreground"}`}>
              <span className="text-lg font-semibold">
                {metrics.monthlyNetChange >= 0 ? "+" : ""}{metrics.monthlyNetChange}
              </span>
              <span className="text-sm">net/month</span>
            </div>
          </div>

          {/* Unread Queue */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              Unread Queue
            </p>
            <div className="text-3xl font-bold">{metrics.unreadCount.toLocaleString()}</div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              ~{metrics.estimatedReadingHours.toLocaleString()} hours to read
            </div>
          </div>

          {/* Projection */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              Yearly Projection
            </p>
            <div className={`text-3xl font-bold ${metrics.projectedYearlyGrowth > 0 ? "text-red-500" : metrics.projectedYearlyGrowth < 0 ? "text-green-500" : ""}`}>
              {metrics.projectedYearlyGrowth >= 0 ? "+" : ""}{metrics.projectedYearlyGrowth.toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground">
              {metrics.projectedYearlyGrowth > 0 
                ? "docs added to backlog" 
                : metrics.projectedYearlyGrowth < 0 
                  ? "docs cleared from backlog"
                  : "keeping pace"
              }
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

