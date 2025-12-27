"use server";

import { prisma } from "@/lib/db";
import { createReadwiseClient, ReadwiseDocument } from "@/lib/readwise";
import { revalidatePath } from "next/cache";

export interface SyncProgress {
  status: "idle" | "syncing" | "completed" | "error";
  totalSynced: number;
  currentBatch: number;
  hasMore: boolean;
  error?: string;
}

export async function getSyncState() {
  const state = await prisma.syncState.findUnique({
    where: { id: "main" },
  });
  return state;
}

export async function startSync(): Promise<SyncProgress> {
  // Get API token
  const settings = await prisma.settings.findUnique({
    where: { id: "main" },
    select: { apiToken: true },
  });

  if (!settings?.apiToken) {
    return {
      status: "error",
      totalSynced: 0,
      currentBatch: 0,
      hasMore: false,
      error: "No API token configured. Please add your Readwise API token in settings.",
    };
  }

  // Check if sync is already running
  const currentState = await prisma.syncState.findUnique({
    where: { id: "main" },
  });

  if (currentState?.status === "syncing") {
    return {
      status: "syncing",
      totalSynced: currentState.totalSynced,
      currentBatch: 0,
      hasMore: true,
    };
  }

  // Initialize sync state
  await prisma.syncState.upsert({
    where: { id: "main" },
    update: {
      status: "syncing",
      errorMsg: null,
      lastCursor: null,
    },
    create: {
      id: "main",
      status: "syncing",
      totalSynced: 0,
    },
  });

  return {
    status: "syncing",
    totalSynced: 0,
    currentBatch: 0,
    hasMore: true,
  };
}

export async function syncNextBatch(): Promise<SyncProgress> {
  const settings = await prisma.settings.findUnique({
    where: { id: "main" },
    select: { apiToken: true },
  });

  if (!settings?.apiToken) {
    return {
      status: "error",
      totalSynced: 0,
      currentBatch: 0,
      hasMore: false,
      error: "No API token configured",
    };
  }

  const syncState = await prisma.syncState.findUnique({
    where: { id: "main" },
  });

  if (!syncState || syncState.status !== "syncing") {
    return {
      status: "idle",
      totalSynced: syncState?.totalSynced ?? 0,
      currentBatch: 0,
      hasMore: false,
    };
  }

  try {
    const client = createReadwiseClient(settings.apiToken);

    // Fetch next page
    const response = await client.fetchDocuments({
      pageCursor: syncState.lastCursor ?? undefined,
      updatedAfter: syncState.lastSyncAt?.toISOString(),
    });

    // Transform and upsert documents
    const documents = response.results.map(transformDocument);
    
    for (const doc of documents) {
      await prisma.document.upsert({
        where: { readwiseId: doc.readwiseId },
        update: doc,
        create: doc,
      });
    }

    // Consider sync complete if:
    // 1. No nextPageCursor, OR
    // 2. Got 0 results (prevents infinite loop on empty pages)
    const hasMore = Boolean(response.nextPageCursor) && documents.length > 0;
    
    // Count actual documents in database instead of cumulative total
    const currentTotal = await prisma.document.count();

    // Update sync state
    await prisma.syncState.update({
      where: { id: "main" },
      data: {
        totalSynced: currentTotal,
        lastCursor: response.nextPageCursor,
        status: hasMore ? "syncing" : "idle",
        lastSyncAt: hasMore ? syncState.lastSyncAt : new Date(),
        errorMsg: null,
      },
    });

    revalidatePath("/");
    revalidatePath("/settings");

    return {
      status: hasMore ? "syncing" : "completed",
      totalSynced: currentTotal,
      currentBatch: documents.length,
      hasMore,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    
    // If it's a 500 error, it might be a temporary API issue
    // Store the error but keep the sync state for retry
    await prisma.syncState.update({
      where: { id: "main" },
      data: {
        status: "error",
        errorMsg: `${errorMsg} (at cursor: ${syncState.lastCursor?.substring(0, 20) || 'start'}...)`,
      },
    });

    return {
      status: "error",
      totalSynced: syncState.totalSynced,
      currentBatch: 0,
      hasMore: false,
      error: errorMsg,
    };
  }
}

export async function clearError(): Promise<void> {
  // Clear error but keep cursor to resume from where it failed
  await prisma.syncState.update({
    where: { id: "main" },
    data: {
      status: "idle",
      errorMsg: null,
      // Keep lastCursor to continue from the same point
    },
  });

  revalidatePath("/");
  revalidatePath("/settings");
}

export async function skipProblematicCursor(): Promise<void> {
  // Skip the problematic cursor by setting lastSyncAt to now
  // Next sync will only fetch documents updated AFTER this time
  // Note: This means documents at the failed cursor will be missed
  // unless they get updated in Readwise later
  const currentTotal = await prisma.document.count();
  
  await prisma.syncState.update({
    where: { id: "main" },
    data: {
      status: "idle",
      errorMsg: null,
      lastCursor: null,
      lastSyncAt: new Date(), // Skip ahead - only get future updates
      totalSynced: currentTotal,
    },
  });

  revalidatePath("/");
  revalidatePath("/settings");
}

export async function resetSync(): Promise<void> {
  await prisma.syncState.upsert({
    where: { id: "main" },
    update: {
      status: "idle",
      lastCursor: null,
      lastSyncAt: null,
      totalSynced: 0,
      errorMsg: null,
    },
    create: {
      id: "main",
      status: "idle",
      totalSynced: 0,
    },
  });

  // Delete all documents
  await prisma.document.deleteMany();

  revalidatePath("/");
  revalidatePath("/settings");
}

function transformDocument(doc: ReadwiseDocument) {
  // Convert tags to array of tag names
  let tags: string[] = [];
  if (doc.tags) {
    if (Array.isArray(doc.tags)) {
      tags = doc.tags.map(tag => tag.name);
    } else {
      tags = Object.values(doc.tags).map(tag => tag.name);
    }
  }

  return {
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
    publishedDate: doc.published_date ? new Date(doc.published_date) : null,
    firstOpenedAt: doc.first_opened_at ? new Date(doc.first_opened_at) : null,
    lastOpenedAt: doc.last_opened_at ? new Date(doc.last_opened_at) : null,
    lastMovedAt: doc.last_moved_at ? new Date(doc.last_moved_at) : null,
    readingProgress: doc.reading_progress ?? 0,
    parentId: doc.parent_id,
    createdAt: new Date(doc.created_at),
    updatedAt: new Date(doc.updated_at),
  };
}

