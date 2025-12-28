"use client";

import { AreaChart, Area, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TimeSeriesData } from "@/app/actions/documents";

interface ActivityChartProps {
  addedData: TimeSeriesData[];
  readData: TimeSeriesData[];
  onTimeRangeChange?: (weeks: number) => void;
  initialWeeks?: number;
}

const TIME_RANGE_OPTIONS = [
  { label: "Last 4 weeks", weeks: 4 },
  { label: "Last 12 weeks", weeks: 12 },
  { label: "Last quarter", weeks: 13 }, // ~3 months
  { label: "Last 6 months", weeks: 26 },
  { label: "Last year", weeks: 52 },
];

export function ActivityChart({ addedData, readData, onTimeRangeChange, initialWeeks = 12 }: ActivityChartProps) {
  const [selectedWeeks, setSelectedWeeks] = useState(initialWeeks);

  const handleTimeRangeChange = (weeks: string) => {
    const weeksNum = parseInt(weeks);
    setSelectedWeeks(weeksNum);
    onTimeRangeChange?.(weeksNum);
  };
  // Merge the two datasets
  const chartData = addedData.map((item, index) => ({
    date: item.date,
    added: item.count,
    read: readData[index]?.count || 0,
  }));

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const weekStart = new Date(date);
    const weekEnd = new Date(date);
    weekEnd.setDate(date.getDate() + 6);

    // If the week spans two months, show month range
    if (date.getMonth() !== weekEnd.getMonth()) {
      return `${date.toLocaleDateString("en-US", { month: "short" })}-${weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    }
    // If same month, show "Dec 1-7" format
    return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}-${weekEnd.getDate()}`;
  };

  // Function to get week number of the year (weeks start on Sunday)
  const getWeekNumber = (dateStr: string) => {
    const date = new Date(dateStr);
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    // Find the first Sunday of the year
    const firstSunday = new Date(startOfYear);
    firstSunday.setDate(startOfYear.getDate() + (7 - startOfYear.getDay()) % 7);

    // Calculate weeks from first Sunday
    const diffTime = date.getTime() - firstSunday.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const weekNumber = Math.floor(diffDays / 7) + 1;

    // Handle case where date is before first Sunday (week 1 starts on first Sunday)
    return weekNumber > 0 ? weekNumber : 1;
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

      return (
        <div className="bg-card border border-border rounded-md p-3 shadow-lg">
          <p className="font-medium text-foreground mb-2">{`Week of ${formatDate(label)}`}</p>
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
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Reading Activity</CardTitle>
          <CardDescription>Documents added and read over the last 12 weeks</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
          No activity data available
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Reading Activity</CardTitle>
            <CardDescription>Documents added and read over time</CardDescription>
          </div>
          <Select value={selectedWeeks.toString()} onValueChange={handleTimeRangeChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_RANGE_OPTIONS.map((option) => (
                <SelectItem key={option.weeks} value={option.weeks.toString()}>
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
            <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
              <defs>
                <linearGradient id="addedGradient" x1="0" y1="0" x2="0" y2="1">
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
                interval="preserveStartEnd"
                angle={-45}
                textAnchor="end"
                height={60}
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
                fill="url(#addedGradient)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 1, stroke: "hsl(var(--chart-1))", fill: "hsl(var(--background))" }}
              />
              <Line
                type="monotone"
                dataKey="read"
                name="Documents Read"
                stroke="hsl(var(--destructive))"
                strokeWidth={3}
                dot={{ r: 3, fill: "hsl(var(--destructive))", strokeWidth: 2, stroke: "hsl(var(--background))" }}
                activeDot={{ r: 5, fill: "hsl(var(--destructive))", strokeWidth: 2, stroke: "hsl(var(--background))" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly Net Summary */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className={`grid gap-4 text-sm ${selectedWeeks <= 4 ? 'grid-cols-2' : selectedWeeks <= 8 ? 'grid-cols-4' : 'grid-cols-6'}`}>
            {chartData.slice(-Math.min(6, selectedWeeks)).map((week, index) => {
              const net = week.added - week.read;
              const netColor = net > 0 ? 'text-red-500' : net < 0 ? 'text-green-500' : 'text-muted-foreground';
              const netText = net > 0 ? `+${net}` : net.toString();
              const weekNumber = getWeekNumber(week.date);
              const year = new Date(week.date).getFullYear();

              return (
                <div key={index} className="text-center">
                  <div className="text-xs text-muted-foreground mb-1">
                    Week {weekNumber}
                    {year !== new Date().getFullYear() && ` '${year.toString().slice(-2)}`}
                  </div>
                  <div className={`font-semibold ${netColor}`}>
                    {netText}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="text-center mt-3 text-xs text-muted-foreground">
            Net change: Added minus Read (last {Math.min(6, selectedWeeks)} weeks)
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

