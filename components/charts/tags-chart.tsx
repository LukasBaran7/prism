"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TagsChartProps {
  data: { tag: string; count: number }[];
}

export function TagsChart({ data }: TagsChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Tags</CardTitle>
        </CardHeader>
        <CardContent className="h-[200px] flex items-center justify-center text-muted-foreground">
          No tags available
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Tags</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {data.map((item) => {
            // Calculate relative size based on count
            const relativeSize = item.count / maxCount;
            const fontSize = 0.75 + relativeSize * 0.5; // 0.75rem to 1.25rem

            return (
              <Badge
                key={item.tag}
                variant="secondary"
                className="cursor-default"
                style={{ fontSize: `${fontSize}rem` }}
              >
                {item.tag}
                <span className="ml-1 text-muted-foreground">
                  ({item.count.toLocaleString()})
                </span>
              </Badge>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

