export const dynamic = "force-dynamic";

import { ApiTokenForm } from "@/components/settings/api-token-form";
import { SyncControls } from "@/components/sync/sync-controls";
import { TriageSettingsForm } from "@/components/settings/triage-settings-form";
import { hasApiToken, getTriageSettings } from "@/app/actions/settings";
import { getDocumentCount } from "@/app/actions/documents";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function SettingsPage() {
  const [tokenConfigured, docCount, triageSettings] = await Promise.all([
    hasApiToken(),
    getDocumentCount(),
    getTriageSettings(),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-2xl py-8 px-4">
        <div className="mb-8">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure your Readwise Reader integration
          </p>
        </div>

        <div className="space-y-6">
          <ApiTokenForm hasToken={tokenConfigured} />
          <SyncControls hasToken={tokenConfigured} />
          <TriageSettingsForm settings={triageSettings} />

          {docCount > 0 && (
            <div className="text-center text-sm text-muted-foreground">
              {docCount.toLocaleString()} documents in database
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

