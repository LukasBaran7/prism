"use client";

import { useState, useTransition, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  AlertTriangle, 
  Archive, 
  Loader2,
  Skull,
  Clock
} from "lucide-react";
import { getStaleDocumentsByAge, archiveStaleDocuments } from "@/app/actions/triage";
import { formatNumber } from "@/lib/utils";

export function BankruptcyPanel() {
  const [days, setDays] = useState(180);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);

  // Load preview count when days changes
  useEffect(() => {
    const loadPreview = async () => {
      setIsLoadingPreview(true);
      try {
        const data = await getStaleDocumentsByAge(days, 0);
        setPreviewCount(data.count);
      } catch {
        setPreviewCount(null);
      }
      setIsLoadingPreview(false);
    };

    const debounce = setTimeout(loadPreview, 300);
    return () => clearTimeout(debounce);
  }, [days]);

  const handleDeclare = () => {
    startTransition(async () => {
      const archiveResult = await archiveStaleDocuments({
        olderThanDays: days,
      });
      setResult(archiveResult);
      setShowConfirm(false);
      setPreviewCount(0);
    });
  };

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <Skull className="h-5 w-5" />
          Reading Bankruptcy
        </CardTitle>
        <CardDescription>
          Admit defeat on old content and start fresh. Archive everything older than a certain age.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {result ? (
          <div className="space-y-4">
            <div className="bg-green-100 text-green-800 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold">{formatNumber(result.success)}</div>
              <div className="text-sm">documents archived</div>
              {result.failed > 0 && (
                <div className="text-amber-600 text-sm mt-2">
                  {result.failed} failed to archive
                </div>
              )}
            </div>
            <p className="text-center text-muted-foreground">
              🎉 You&apos;ve declared reading bankruptcy! Your queue is lighter now.
            </p>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setResult(null)}
            >
              Declare Again
            </Button>
          </div>
        ) : showConfirm ? (
          <div className="space-y-4">
            <div className="bg-destructive/10 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-destructive font-medium mb-2">
                <AlertTriangle className="h-5 w-5" />
                Confirm Bankruptcy Declaration
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                You are about to archive <strong>{previewCount ? formatNumber(previewCount) : 0}</strong> documents 
                that are older than <strong>{days}</strong> days.
              </p>
              <p className="text-sm text-destructive font-medium">
                ⚠️ This action will sync to Readwise Reader and cannot be undone.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowConfirm(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1 gap-2"
                onClick={handleDeclare}
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Archiving...
                  </>
                ) : (
                  <>
                    <Archive className="h-4 w-4" />
                    Declare Bankruptcy
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="days">Archive everything older than</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="days"
                  type="number"
                  min={30}
                  max={730}
                  value={days}
                  onChange={(e) => setDays(parseInt(e.target.value) || 180)}
                  className="w-24"
                />
                <span className="text-muted-foreground">days</span>
                <div className="flex items-center gap-1 text-sm text-muted-foreground ml-auto">
                  <Clock className="h-4 w-4" />
                  ~{Math.round(days / 30)} months
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDays(90)}
                className={days === 90 ? "border-primary" : ""}
              >
                3 months
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDays(180)}
                className={days === 180 ? "border-primary" : ""}
              >
                6 months
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDays(365)}
                className={days === 365 ? "border-primary" : ""}
              >
                1 year
              </Button>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Documents to archive:</span>
                <span className="text-2xl font-bold">
                  {isLoadingPreview ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : previewCount !== null ? (
                    formatNumber(previewCount)
                  ) : (
                    "—"
                  )}
                </span>
              </div>
            </div>

            <Button
              variant="destructive"
              className="w-full gap-2"
              onClick={() => setShowConfirm(true)}
              disabled={!previewCount || previewCount === 0 || isLoadingPreview}
            >
              <Skull className="h-4 w-4" />
              Preview Bankruptcy
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

