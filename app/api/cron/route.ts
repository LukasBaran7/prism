import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createReadwiseClient } from "@/lib/readwise";

// Vercel Cron jobs run as GET requests
export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get("authorization");
  
  // In production, verify with CRON_SECRET
  if (process.env.CRON_SECRET) {
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    // Get API token from settings
    const settings = await prisma.settings.findUnique({
      where: { id: "main" },
      select: { apiToken: true },
    });

    if (!settings?.apiToken) {
      return NextResponse.json(
        { error: "No API token configured" },
        { status: 400 }
      );
    }

    // Get last sync time
    const syncState = await prisma.syncState.findUnique({
      where: { id: "main" },
    });

    // Don't run if already syncing
    if (syncState?.status === "syncing") {
      return NextResponse.json(
        { message: "Sync already in progress" },
        { status: 200 }
      );
    }

    const client = createReadwiseClient(settings.apiToken);
    let totalSynced = 0;
    let cursor: string | null = null;

    // Update status to syncing
    await prisma.syncState.upsert({
      where: { id: "main" },
      update: { status: "syncing", errorMsg: null },
      create: { id: "main", status: "syncing" },
    });

    try {
      // Fetch documents updated since last sync
      do {
        const response = await client.fetchDocuments({
          pageCursor: cursor ?? undefined,
          updatedAfter: syncState?.lastSyncAt?.toISOString(),
        });

        // Transform and upsert documents
        for (const doc of response.results) {
          // Convert tags to array of tag names
          let tags: string[] = [];
          if (doc.tags) {
            if (Array.isArray(doc.tags)) {
              tags = doc.tags.map(tag => tag.name);
            } else {
              tags = Object.values(doc.tags).map(tag => tag.name);
            }
          }

          await prisma.document.upsert({
            where: { readwiseId: doc.id },
            update: {
              url: doc.url,
              sourceUrl: doc.source_url,
              title: doc.title,
              author: doc.author,
              summary: doc.summary,
              category: doc.category,
              location: doc.location,
              tags,
              siteName: doc.site_name,
              wordCount: doc.word_count,
              publishedDate: doc.published_date
                ? new Date(doc.published_date)
                : null,
              firstOpenedAt: doc.first_opened_at
                ? new Date(doc.first_opened_at)
                : null,
              lastOpenedAt: doc.last_opened_at
                ? new Date(doc.last_opened_at)
                : null,
              lastMovedAt: doc.last_moved_at
                ? new Date(doc.last_moved_at)
                : null,
              readingProgress: doc.reading_progress ?? 0,
              parentId: doc.parent_id,
              updatedAt: new Date(doc.updated_at),
            },
            create: {
              readwiseId: doc.id,
              url: doc.url,
              sourceUrl: doc.source_url,
              title: doc.title,
              author: doc.author,
              summary: doc.summary,
              category: doc.category,
              location: doc.location,
              tags,
              siteName: doc.site_name,
              wordCount: doc.word_count,
              publishedDate: doc.published_date
                ? new Date(doc.published_date)
                : null,
              firstOpenedAt: doc.first_opened_at
                ? new Date(doc.first_opened_at)
                : null,
              lastOpenedAt: doc.last_opened_at
                ? new Date(doc.last_opened_at)
                : null,
              lastMovedAt: doc.last_moved_at
                ? new Date(doc.last_moved_at)
                : null,
              readingProgress: doc.reading_progress ?? 0,
              parentId: doc.parent_id,
              createdAt: new Date(doc.created_at),
              updatedAt: new Date(doc.updated_at),
            },
          });
        }

        totalSynced += response.results.length;
        cursor = response.nextPageCursor;
      } while (cursor);

      // Update sync state
      const currentTotal = await prisma.document.count();
      await prisma.syncState.update({
        where: { id: "main" },
        data: {
          status: "idle",
          lastSyncAt: new Date(),
          totalSynced: currentTotal,
          lastCursor: null,
          errorMsg: null,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Synced ${totalSynced} documents`,
        total: currentTotal,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      
      await prisma.syncState.update({
        where: { id: "main" },
        data: {
          status: "error",
          errorMsg,
        },
      });

      throw error;
    }
  } catch (error) {
    console.error("Cron sync error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}

