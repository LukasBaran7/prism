"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, Loader2, Check } from "lucide-react";
import { saveTriageSettings, TriageSettings } from "@/app/actions/settings";

interface TriageSettingsFormProps {
  settings: TriageSettings;
}

export function TriageSettingsForm({ settings }: TriageSettingsFormProps) {
  const [newsThreshold, setNewsThreshold] = useState(settings.staleNewsThreshold);
  const [articleThreshold, setArticleThreshold] = useState(settings.staleArticleThreshold);
  const [defaultThreshold, setDefaultThreshold] = useState(settings.staleDefaultThreshold);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const hasChanges = 
    newsThreshold !== settings.staleNewsThreshold ||
    articleThreshold !== settings.staleArticleThreshold ||
    defaultThreshold !== settings.staleDefaultThreshold;

  const handleSave = () => {
    startTransition(async () => {
      await saveTriageSettings({
        staleNewsThreshold: newsThreshold,
        staleArticleThreshold: articleThreshold,
        staleDefaultThreshold: defaultThreshold,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Triage Thresholds
        </CardTitle>
        <CardDescription>
          Configure when documents are considered stale based on their category.
          Documents older than these thresholds will appear in the triage cleanup suggestions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="news-threshold">
              News & RSS
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="news-threshold"
                type="number"
                min={7}
                max={365}
                value={newsThreshold}
                onChange={(e) => setNewsThreshold(parseInt(e.target.value) || 30)}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">days</span>
            </div>
            <p className="text-xs text-muted-foreground">
              RSS feeds, tweets, and time-sensitive news
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="article-threshold">
              Articles
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="article-threshold"
                type="number"
                min={14}
                max={730}
                value={articleThreshold}
                onChange={(e) => setArticleThreshold(parseInt(e.target.value) || 90)}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">days</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Blog posts, news articles, and web pages
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="default-threshold">
              Other Content
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="default-threshold"
                type="number"
                min={30}
                max={730}
                value={defaultThreshold}
                onChange={(e) => setDefaultThreshold(parseInt(e.target.value) || 180)}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">days</span>
            </div>
            <p className="text-xs text-muted-foreground">
              PDFs, emails, ePubs, and other content
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="text-sm text-muted-foreground">
            {hasChanges && "You have unsaved changes"}
          </div>
          <Button 
            onClick={handleSave}
            disabled={isPending || !hasChanges}
            className="gap-2"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : saved ? (
              <>
                <Check className="h-4 w-4" />
                Saved!
              </>
            ) : (
              "Save Thresholds"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

