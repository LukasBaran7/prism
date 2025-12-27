export const dynamic = "force-dynamic";

import { TriageHeader } from "@/components/triage/header";
import { VelocityCard } from "@/components/triage/velocity-card";
import { StaleDocumentList } from "@/components/triage/stale-document-list";
import { SourceEngagementTable } from "@/components/triage/source-engagement-table";
import { BankruptcyPanel } from "@/components/triage/bankruptcy-panel";
import { 
  getVelocityMetrics, 
  getStaleDocuments, 
  getLowEngagementSources 
} from "@/app/actions/triage";
import { hasApiToken } from "@/app/actions/settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { KeyRound } from "lucide-react";

export default async function TriagePage() {
  const tokenConfigured = await hasApiToken();

  if (!tokenConfigured) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-12 px-4">
          <Card className="max-w-lg mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <KeyRound className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>API Token Required</CardTitle>
              <CardDescription>
                Configure your Readwise API token to use the triage feature.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button asChild>
                <Link href="/settings">Configure API Token</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const initialLimit = 50;
  // Generate a random seed for initial load to ensure random order
  const initialSeed = Math.random().toString(36).substring(2, 15);
  
  const [velocityMetrics, staleGroups, lowEngagementSources] = await Promise.all([
    getVelocityMetrics(),
    getStaleDocuments(initialLimit, 0, initialSeed), // Random order with consistent pagination
    getLowEngagementSources(5),
  ]);

  const totalStale = staleGroups.reduce((sum, g) => sum + g.count, 0);

  return (
    <div className="min-h-screen bg-background">
      <TriageHeader 
        staleCount={totalStale} 
        unreadCount={velocityMetrics.unreadCount} 
      />
      
      <main className="container mx-auto py-8 px-4">
        <div className="space-y-8">
          {/* Velocity Overview */}
          <section>
            <VelocityCard metrics={velocityMetrics} />
          </section>

          {/* Stale Documents */}
          <section>
            <StaleDocumentList groups={staleGroups} initialLimit={initialLimit} initialSeed={initialSeed} />
          </section>

          {/* Two Column Layout */}
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Low Engagement Sources */}
            <section>
              <SourceEngagementTable sources={lowEngagementSources} />
            </section>

            {/* Bankruptcy Panel */}
            <section>
              <BankruptcyPanel />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

