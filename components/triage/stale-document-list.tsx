"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Archive, 
  ExternalLink, 
  Loader2, 
  Clock,
  FileText,
  Rss,
  AlertCircle,
  Shuffle,
  RefreshCw
} from "lucide-react";
import { StaleDocumentGroup, StaleDocument, archiveDocuments, getStaleDocuments } from "@/app/actions/triage";
import { formatNumber } from "@/lib/utils";

interface StaleDocumentListProps {
  groups: StaleDocumentGroup[];
  initialLimit?: number;
}

export function StaleDocumentList({ groups: initialGroups, initialLimit = 50 }: StaleDocumentListProps) {
  const [groups, setGroups] = useState(initialGroups);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [archiveResult, setArchiveResult] = useState<{ success: number; failed: number } | null>(null);
  const [currentOffset, setCurrentOffset] = useState(initialLimit);

  const totalStale = groups.reduce((sum, g) => sum + g.count, 0);

  const toggleSelection = (readwiseId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(readwiseId)) {
      newSelected.delete(readwiseId);
    } else {
      newSelected.add(readwiseId);
    }
    setSelectedIds(newSelected);
  };

  const selectAllInGroup = (documents: StaleDocument[]) => {
    const newSelected = new Set(selectedIds);
    documents.forEach((doc) => newSelected.add(doc.readwiseId));
    setSelectedIds(newSelected);
  };

  const deselectAllInGroup = (documents: StaleDocument[]) => {
    const newSelected = new Set(selectedIds);
    documents.forEach((doc) => newSelected.delete(doc.readwiseId));
    setSelectedIds(newSelected);
  };

  const handleArchiveSelected = () => {
    if (selectedIds.size === 0) return;

    startTransition(async () => {
      const result = await archiveDocuments(Array.from(selectedIds));
      setArchiveResult(result);
      
      // Remove archived documents from the view
      const archivedSet = new Set(Array.from(selectedIds));
      setGroups(groups.map(group => ({
        ...group,
        documents: group.documents.filter(doc => !archivedSet.has(doc.readwiseId)),
        count: group.count - group.documents.filter(doc => archivedSet.has(doc.readwiseId)).length
      })));
      
      setSelectedIds(new Set());
      
      // Clear result after 5 seconds
      setTimeout(() => setArchiveResult(null), 5000);
    });
  };

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    try {
      const newGroups = await getStaleDocuments(50, currentOffset, true);
      
      // Merge new documents into existing groups
      setGroups(groups.map((group, index) => ({
        ...group,
        documents: [...group.documents, ...newGroups[index].documents]
      })));
      
      setCurrentOffset(currentOffset + 50);
    } catch (error) {
      console.error("Failed to load more documents:", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleRandomize = async () => {
    setIsRefreshing(true);
    try {
      const newGroups = await getStaleDocuments(initialLimit, 0, true);
      setGroups(newGroups);
      setCurrentOffset(initialLimit);
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Failed to randomize documents:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const newGroups = await getStaleDocuments(initialLimit, 0, true);
      setGroups(newGroups);
      setCurrentOffset(initialLimit);
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Failed to refresh documents:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (totalStale === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Stale Documents
          </CardTitle>
          <CardDescription>
            Old documents past their freshness date
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-green-100 p-3 mb-4">
              <Archive className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-lg font-medium">No stale documents!</p>
            <p className="text-sm text-muted-foreground mt-1">
              You&apos;re keeping up with your reading queue.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              Stale Documents
              <Badge variant="secondary" className="ml-2">
                {formatNumber(totalStale)} total
              </Badge>
            </CardTitle>
            <CardDescription>
              Old documents past their freshness date (based on age alone)
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="gap-2"
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRandomize}
              disabled={isRefreshing}
              className="gap-2"
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Shuffle className="h-4 w-4" />
              )}
              Shuffle
            </Button>
            {selectedIds.size > 0 && (
              <Button 
                onClick={handleArchiveSelected}
                disabled={isPending}
                className="gap-2"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Archive className="h-4 w-4" />
                )}
                Archive {selectedIds.size}
              </Button>
            )}
          </div>
        </div>
        {archiveResult && (
          <div className={`mt-2 p-2 rounded text-sm ${archiveResult.failed > 0 ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"}`}>
            Archived {archiveResult.success} documents
            {archiveResult.failed > 0 && `, ${archiveResult.failed} failed`}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={groups[0]?.category || "news"}>
          <TabsList className="mb-4">
            {groups.map((group) => (
              <TabsTrigger 
                key={group.category} 
                value={group.category}
                className="gap-2"
              >
                {group.category === "news" && <Rss className="h-4 w-4" />}
                {group.category === "articles" && <FileText className="h-4 w-4" />}
                {group.category === "other" && <AlertCircle className="h-4 w-4" />}
                {group.label}
                <Badge variant="outline" className="ml-1">
                  {group.count}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {groups.map((group) => (
            <TabsContent key={group.category} value={group.category}>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    Older than {group.threshold} days • ~{Math.round(group.totalWordCount / 1000)}k words
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => selectAllInGroup(group.documents)}
                    >
                      Select All ({group.documents.length})
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deselectAllInGroup(group.documents)}
                    >
                      Deselect
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {group.documents.map((doc) => (
                    <DocumentRow
                      key={doc.id}
                      document={doc}
                      isSelected={selectedIds.has(doc.readwiseId)}
                      onToggle={() => toggleSelection(doc.readwiseId)}
                    />
                  ))}
                  {group.count > group.documents.length && (
                    <div className="text-center py-4 space-y-2">
                      <div className="text-sm text-muted-foreground">
                        Showing {group.documents.length} of {group.count} documents
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLoadMore}
                        disabled={isLoadingMore}
                        className="gap-2"
                      >
                        {isLoadingMore ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>Load More</>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

interface DocumentRowProps {
  document: StaleDocument;
  isSelected: boolean;
  onToggle: () => void;
}

function DocumentRow({ document, isSelected, onToggle }: DocumentRowProps) {
  const [showSummary, setShowSummary] = useState(false);

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
        isSelected 
          ? "bg-primary/5 border-primary/30" 
          : "bg-card hover:bg-muted/50"
      }`}
    >
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggle}
        className="h-4 w-4 rounded border-gray-300 cursor-pointer flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
      />
      <div className="flex-1 min-w-0">
        <div 
          className="flex items-center gap-2 cursor-pointer"
          onClick={onToggle}
        >
          <span className="font-medium truncate">
            {document.title || "Untitled"}
          </span>
          <a
            href={document.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-muted-foreground hover:text-primary flex-shrink-0"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div 
          className="flex items-center gap-2 text-xs text-muted-foreground mt-1 cursor-pointer"
          onClick={onToggle}
        >
          {document.siteName && <span>{document.siteName}</span>}
          {document.author && (
            <>
              <span>•</span>
              <span>{document.author}</span>
            </>
          )}
          {document.wordCount && (
            <>
              <span>•</span>
              <span>{formatNumber(document.wordCount)} words</span>
            </>
          )}
          {document.summary && (
            <>
              <span>•</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSummary(!showSummary);
                }}
                className="text-primary hover:underline"
              >
                {showSummary ? "Hide" : "Show"} summary
              </button>
            </>
          )}
        </div>
        {showSummary && document.summary && (
          <div 
            className="mt-2 text-sm text-muted-foreground border-l-2 border-primary/30 pl-3 italic"
            onClick={(e) => e.stopPropagation()}
          >
            {document.summary}
          </div>
        )}
      </div>
      <Badge variant="outline" className="flex-shrink-0">
        {document.ageInDays}d old
      </Badge>
    </div>
  );
}

