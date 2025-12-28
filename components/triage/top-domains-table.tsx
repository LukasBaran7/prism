"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Globe, TrendingUp } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { DomainStats } from "@/app/actions/triage";

interface TopDomainsTableProps {
  domains: DomainStats[];
}

export function TopDomainsTable({ domains }: TopDomainsTableProps) {
  if (domains.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Top Domains in Read Later
          </CardTitle>
          <CardDescription>
            Most popular domains in your reading queue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-lg font-medium">No domains found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Your read later queue appears to be empty.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...domains.map((d) => d.count));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-500" />
          Top Domains in Read Later
        </CardTitle>
        <CardDescription>
          Most popular domains in your reading queue ({domains.length} domains)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Domain</TableHead>
              <TableHead className="text-center">Articles</TableHead>
              <TableHead className="text-center">Total Words</TableHead>
              <TableHead className="w-[100px]">Popularity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {domains.map((domain, index) => {
              const popularityPercentage = (domain.count / maxCount) * 100;

              return (
                <TableRow key={domain.domain}>
                  <TableCell className="font-medium max-w-[250px] truncate">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{domain.domain}</span>
                      {index < 3 && (
                        <Badge
                          variant={index === 0 ? "default" : index === 1 ? "secondary" : "outline"}
                          className="text-xs ml-1"
                        >
                          #{index + 1}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-mono">
                    {formatNumber(domain.count)}
                  </TableCell>
                  <TableCell className="text-center font-mono text-muted-foreground">
                    {formatNumber(domain.totalWordCount)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all duration-300"
                          style={{ width: `${popularityPercentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-8">
                        {Math.round(popularityPercentage)}%
                      </span>
                    </div>
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
