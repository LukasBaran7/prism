"use client";

import { AreaChart, Area, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TimeSeriesData } from "@/app/actions/documents";

interface DailyActivityChartProps {
  addedData: TimeSeriesData[];
  readData: TimeSeriesData[];
  onTimeRangeChange?: (days: number) => void;
  initialDays?: number;
}

const TIME_RANGE_OPTIONS = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 14 days", days: 14 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 60 days", days: 60 },
  { label: "Last 90 days", days: 90 },
];

export function DailyActivityChart({ addedData, readData, onTimeRangeChange, initialDays = 14 }: DailyActivityChartProps) {
  const [selectedDays, setSelectedDays] = useState(initialDays);

  const handleTimeRangeChange = (days: string) => {
    const daysNum = parseInt(days);
    setSelectedDays(daysNum);
    onTimeRangeChange?.(daysNum);
  };

  // Merge the two datasets
  const chartData = addedData.map((item, index) => ({
    date: item.date,
    added: item.count,
    read: readData[index]?.count || 0,
  }));

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    // For longer time periods, show month/day
    if (selectedDays > 30) {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
    // For shorter periods, show weekday and day
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const hasData = chartData.some((d) => d.added > 0 || d.read > 0);

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const added = payload.find((p: any) => p.dataKey === 'added')?.value || 0;
      const read = payload.find((p: any) => p.dataKey === 'read')?.value || 0;
      const net = added - read;
      const netColor = net > 0 ? 'text-red-500' : net < 0 ? 'text-green-500' : 'text-muted-foreground';
      const netText = net > 0 ? `+${net}` : net.toString();

      const date = new Date(label);
      const formattedDate = date.toLocaleDateString("en-US", { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

      return (
        <div className="bg-card border border-border rounded-md p-3 shadow-lg">
          <p className="font-medium text-foreground mb-2">{formattedDate}</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between items-center gap-4">
              <span className="text-blue-600">Added:</span>
              <span className="font-medium">{added}</span>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-red-600">Read:</span>
              <span className="font-medium">{read}</span>
            </div>
            <div className="border-t pt-1 mt-2">
              <div className="flex justify-between items-center gap-4">
                <span className="text-muted-foreground">Net:</span>
                <span className={`font-semibold ${netColor}`}>{netText}</span>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Reading Activity</CardTitle>
          <CardDescription>Documents added and read per day</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
          No activity data available
        </CardContent>
      </Card>
    );
  }

  // Calculate summary stats for the period
  const totalAdded = chartData.reduce((sum, d) => sum + d.added, 0);
  const totalRead = chartData.reduce((sum, d) => sum + d.read, 0);
  const netChange = totalAdded - totalRead;
  const avgAddedPerDay = (totalAdded / chartData.length).toFixed(1);
  const avgReadPerDay = (totalRead / chartData.length).toFixed(1);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Daily Reading Activity</CardTitle>
            <CardDescription>Documents added and read per day</CardDescription>
          </div>
          <Select value={selectedDays.toString()} onValueChange={handleTimeRangeChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_RANGE_OPTIONS.map((option) => (
                <SelectItem key={option.days} value={option.days.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 60 }}>
              <defs>
                <linearGradient id="dailyAddedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.5} />
                  <stop offset="50%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 2" className="stroke-muted/30" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                interval={selectedDays <= 14 ? 0 : selectedDays <= 30 ? "preserveStartEnd" : Math.floor(selectedDays / 10)}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                width={45}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
                iconType="rect"
              />
              <Area
                type="monotone"
                dataKey="added"
                name="Documents Added"
                stroke="hsl(var(--chart-1))"
                fill="url(#dailyAddedGradient)"
                strokeWidth={2}
                dot={selectedDays <= 14}
                activeDot={{ r: 4, strokeWidth: 1, stroke: "hsl(var(--chart-1))", fill: "hsl(var(--background))" }}
              />
              <Line
                type="monotone"
                dataKey="read"
                name="Documents Read"
                stroke="hsl(var(--destructive))"
                strokeWidth={2}
                dot={selectedDays <= 14 ? { r: 3, fill: "hsl(var(--destructive))", strokeWidth: 2, stroke: "hsl(var(--background))" } : false}
                activeDot={{ r: 5, fill: "hsl(var(--destructive))", strokeWidth: 2, stroke: "hsl(var(--background))" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Summary Stats */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">Total Added</div>
              <div className="font-semibold text-blue-600">{totalAdded}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">Total Read</div>
              <div className="font-semibold text-red-600">{totalRead}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">Avg. Added/Day</div>
              <div className="font-semibold text-blue-600">{avgAddedPerDay}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">Avg. Read/Day</div>
              <div className="font-semibold text-red-600">{avgReadPerDay}</div>
            </div>
          </div>
          <div className="text-center mt-3">
            <div className="text-xs text-muted-foreground">Net Change</div>
            <div className={`font-bold text-lg ${netChange > 0 ? 'text-red-500' : netChange < 0 ? 'text-green-500' : 'text-muted-foreground'}`}>
              {netChange > 0 ? `+${netChange}` : netChange}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

