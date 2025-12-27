"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { ExternalLink, FileText, Mail, Rss, Video, BookOpen, Twitter, FileType } from "lucide-react";

interface Document {
  id: string;
  readwiseId: string;
  title: string | null;
  author: string | null;
  url: string;
  category: string;
  location: string | null;
  tags: string[];
  siteName: string | null;
  wordCount: number | null;
  readingProgress: number;
  createdAt: Date;
}

interface RecentDocumentsProps {
  documents: Document[];
}

const CATEGORY_ICONS: Record<string, typeof FileText> = {
  article: FileText,
  email: Mail,
  rss: Rss,
  video: Video,
  pdf: FileType,
  epub: BookOpen,
  tweet: Twitter,
};

const LOCATION_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  new: "default",
  later: "secondary",
  shortlist: "default",
  archive: "outline",
  feed: "secondary",
};

export function RecentDocuments({ documents }: RecentDocumentsProps) {
  if (documents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Documents</CardTitle>
        </CardHeader>
        <CardContent className="h-[200px] flex items-center justify-center text-muted-foreground">
          No documents synced yet. Go to Settings to sync your Readwise Reader library.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Documents</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50%]">Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Progress</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((doc) => {
              const Icon = CATEGORY_ICONS[doc.category] || FileText;
              const displayTitle = doc.title || doc.siteName || "Untitled";

              return (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-start gap-2">
                      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline line-clamp-1 flex items-center gap-1"
                        >
                          {displayTitle}
                          <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-50" />
                        </a>
                        {doc.author && (
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            by {doc.author}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {doc.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={LOCATION_VARIANTS[doc.location || ""] || "secondary"} className="capitalize">
                      {doc.location === "later" ? "Read Later" : doc.location || "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <Progress
                        value={doc.readingProgress * 100}
                        className="w-16 h-2"
                      />
                      <span className="text-xs text-muted-foreground w-8">
                        {Math.round(doc.readingProgress * 100)}%
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

