"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { startSync, syncNextBatch, resetSync, clearError, skipProblematicCursor, getSyncState, SyncProgress } from "@/app/actions/sync";
import { Loader2, RefreshCw, Play, RotateCcw, CheckCircle, XCircle, AlertCircle, AlertTriangle } from "lucide-react";
import { formatNumber } from "@/lib/utils";

interface SyncControlsProps {
  hasToken: boolean;
}

export function SyncControls({ hasToken }: SyncControlsProps) {
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [totalInDb, setTotalInDb] = useState(0);
  const syncingRef = useRef(false); // Track if we're currently in a sync operation

  const loadSyncState = useCallback(async () => {
    const state = await getSyncState();
    if (state) {
      setLastSyncAt(state.lastSyncAt);
      setTotalInDb(state.totalSynced);
      if (state.status === "syncing") {
        setProgress({
          status: "syncing",
          totalSynced: state.totalSynced,
          currentBatch: 0,
          hasMore: true,
        });
      } else if (state.status === "error" && state.errorMsg) {
        setProgress({
          status: "error",
          totalSynced: state.totalSynced,
          currentBatch: 0,
          hasMore: false,
          error: state.errorMsg,
        });
      }
    }
  }, []);

  useEffect(() => {
    loadSyncState();
  }, [loadSyncState]);

  // Auto-continue syncing
  useEffect(() => {
    if (progress?.status === "syncing" && progress.hasMore && !isLoading) {
      const timer = setTimeout(() => {
        continueSync();
      }, 500); // Wait 500ms between batches to avoid overwhelming the UI
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress?.status, progress?.hasMore, isLoading]); // Only depend on the values we check

  const handleStartSync = async () => {
    if (syncingRef.current || isLoading) return;
    
    syncingRef.current = true;
    setIsLoading(true);
    try {
      const result = await startSync();
      setProgress(result);
      // Don't call continueSync here - let the useEffect handle it
    } finally {
      syncingRef.current = false;
      setIsLoading(false);
    }
  };

  const continueSync = async () => {
    // Prevent multiple concurrent sync requests using a ref
    if (syncingRef.current || isLoading) {
      console.log('Sync already in progress, skipping...');
      return;
    }
    
    syncingRef.current = true;
    setIsLoading(true);
    try {
      const result = await syncNextBatch();
      setProgress(result);
      setTotalInDb(result.totalSynced);
    } catch (error) {
      console.error('Sync error:', error);
      setProgress({
        status: "error",
        totalSynced: totalInDb,
        currentBatch: 0,
        hasMore: false,
        error: error instanceof Error ? error.message : "Sync failed"
      });
    } finally {
      syncingRef.current = false;
      setIsLoading(false);
    }
  };

  const handleClearError = async () => {
    setIsLoading(true);
    try {
      await clearError();
      setProgress(null);
      await loadSyncState();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipCursor = async () => {
    if (!confirm(
      "⚠️ This will skip the problematic cursor and mark sync as complete.\n\n" +
      "Future syncs will only fetch documents updated AFTER now, which means:\n" +
      "• Documents at this cursor position may be permanently missed\n" +
      "• Only use this if retrying keeps failing\n" +
      "• Your 44,500+ existing documents are safe\n\n" +
      "Continue?"
    )) {
      return;
    }
    setIsLoading(true);
    try {
      await skipProblematicCursor();
      setProgress(null);
      await loadSyncState();
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("This will delete all synced documents and start fresh. Are you sure?")) {
      return;
    }
    setIsLoading(true);
    try {
      await resetSync();
      setProgress(null);
      setLastSyncAt(null);
      setTotalInDb(0);
    } finally {
      setIsLoading(false);
    }
  };

  const isSyncing = progress?.status === "syncing";
  const hasError = progress?.status === "error";
  const isComplete = progress?.status === "completed";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className={`h-5 w-5 ${isSyncing ? "animate-spin" : ""}`} />
          Document Sync
        </CardTitle>
        <CardDescription>
          Sync your documents from Readwise Reader. Initial sync may take 20-30 minutes for large libraries.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasToken ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            Please configure your API token first
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Documents Synced</div>
                <div className="text-2xl font-bold">{formatNumber(totalInDb)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Last Sync</div>
                <div className="text-lg font-medium">
                  {lastSyncAt ? new Date(lastSyncAt).toLocaleDateString() : "Never"}
                </div>
              </div>
            </div>

            {/* Progress */}
            {isSyncing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Syncing documents...</span>
                  <span>{formatNumber(progress.totalSynced)} fetched</span>
                </div>
                <Progress value={undefined} className="h-2" />
                <div className="text-xs text-muted-foreground">
                  Last batch: {progress.currentBatch} documents
                </div>
              </div>
            )}

            {/* Status messages */}
            {hasError && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-semibold text-destructive mb-1">Sync Error</div>
                    <div className="text-sm text-destructive/90 mb-3">
                      {progress.error}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleClearError}
                        disabled={isLoading}
                        variant="outline"
                        size="sm"
                        className="border-destructive/50 text-destructive hover:bg-destructive/10"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            Clearing...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="mr-2 h-3 w-3" />
                            Retry from Same Point
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={handleSkipCursor}
                        disabled={isLoading}
                        variant="outline"
                        size="sm"
                        className="border-muted-foreground/50"
                      >
                        Skip & Mark Complete
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      <strong>Retry:</strong> Try the same cursor again (with automatic 2s/4s/8s backoff). Recommended if the API error is temporary.
                      <br />
                      <strong>Skip:</strong> Moves past this cursor - documents at this position will be missed. Only use if retry fails multiple times.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isComplete && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                Sync completed! {formatNumber(progress.totalSynced)} documents synced.
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={handleStartSync}
                disabled={isLoading || isSyncing}
                className="flex-1"
              >
                {isLoading || isSyncing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {totalInDb > 0 ? "Syncing..." : "Starting..."}
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    {totalInDb > 0 ? "Sync New Documents" : "Start Sync"}
                  </>
                )}
              </Button>
              
              {totalInDb > 0 && (
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={isLoading || isSyncing}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

