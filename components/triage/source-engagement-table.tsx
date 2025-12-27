"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Archive, Loader2, Globe, AlertTriangle } from "lucide-react";
import { SourceStats, archiveDocumentsFromSource } from "@/app/actions/triage";

interface SourceEngagementTableProps {
  sources: SourceStats[];
}

export function SourceEngagementTable({ sources }: SourceEngagementTableProps) {
  const [archivingSource, setArchivingSource] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [results, setResults] = useState<Map<string, { success: number; failed: number }>>(new Map());

  const handleArchiveSource = (siteName: string) => {
    setArchivingSource(siteName);
    startTransition(async () => {
      const result = await archiveDocumentsFromSource(siteName);
      setResults(new Map(results).set(siteName, result));
      setArchivingSource(null);
    });
  };

  if (sources.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Source Engagement
          </CardTitle>
          <CardDescription>
            Sources with low completion rates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-lg font-medium">No low-engagement sources found</p>
            <p className="text-sm text-muted-foreground mt-1">
              You read content from most of your sources.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Low Engagement Sources
        </CardTitle>
        <CardDescription>
          Sources where you save articles but rarely read them
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead className="text-center">Saved</TableHead>
              <TableHead className="text-center">Read</TableHead>
              <TableHead className="w-[150px]">Completion</TableHead>
              <TableHead className="text-center">Unread</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sources.map((source) => {
              const result = results.get(source.siteName);
              const isArchiving = archivingSource === source.siteName && isPending;

              return (
                <TableRow key={source.siteName}>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {source.siteName}
                  </TableCell>
                  <TableCell className="text-center">
                    {source.totalSaved}
                  </TableCell>
                  <TableCell className="text-center">
                    {source.totalRead}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={source.completionRate * 100} 
                        className="h-2"
                      />
                      <span className="text-xs text-muted-foreground w-10">
                        {Math.round(source.completionRate * 100)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge 
                      variant={source.unreadCount > 50 ? "destructive" : source.unreadCount > 20 ? "secondary" : "outline"}
                    >
                      {source.unreadCount}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {result ? (
                      <span className="text-sm text-green-600">
                        Archived {result.success}
                      </span>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleArchiveSource(source.siteName)}
                        disabled={isArchiving || source.unreadCount === 0}
                        className="gap-1"
                      >
                        {isArchiving ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Archive className="h-3 w-3" />
                        )}
                        Archive All
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

