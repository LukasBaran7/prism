"use server";

import { prisma } from "@/lib/db";
import { createReadwiseClient } from "@/lib/readwise";
import { getApiToken, getTriageSettings } from "./settings";
import { revalidatePath } from "next/cache";

// Helper function to get date N days ago
function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

// ============================================
// Velocity Metrics
// ============================================

export interface VelocityMetrics {
  addedLast7Days: number;
  addedLast30Days: number;
  readLast7Days: number;
  readLast30Days: number;
  weeklyNetChange: number;
  monthlyNetChange: number;
  projectedYearlyGrowth: number;
  unreadCount: number;
  estimatedReadingHours: number;
}

export async function getVelocityMetrics(): Promise<VelocityMetrics> {
  const [
    addedLast7Days,
    addedLast30Days,
    readLast7Days,
    readLast30Days,
    unreadCount,
    avgWordCount,
  ] = await Promise.all([
    // Documents added in last 7 days (to unread locations)
    prisma.document.count({
      where: {
        location: { in: ["new", "later", "shortlist"] },
        createdAt: { gte: daysAgo(7) },
      },
    }),
    // Documents added in last 30 days
    prisma.document.count({
      where: {
        location: { in: ["new", "later", "shortlist"] },
        createdAt: { gte: daysAgo(30) },
      },
    }),
    // Documents read in last 7 days (moved to archive)
    prisma.document.count({
      where: {
        location: "archive",
        lastMovedAt: { gte: daysAgo(7) },
      },
    }),
    // Documents read in last 30 days
    prisma.document.count({
      where: {
        location: "archive",
        lastMovedAt: { gte: daysAgo(30) },
      },
    }),
    // Total unread count
    prisma.document.count({
      where: {
        location: { in: ["new", "later", "shortlist"] },
      },
    }),
    // Average word count for estimation
    prisma.document.aggregate({
      where: {
        location: { in: ["new", "later", "shortlist"] },
        wordCount: { not: null },
      },
      _avg: { wordCount: true },
    }),
  ]);

  const weeklyNetChange = addedLast7Days - readLast7Days;
  const monthlyNetChange = addedLast30Days - readLast30Days;
  const projectedYearlyGrowth = weeklyNetChange * 52;

  // Estimate reading time: avg 200 words per minute
  const avgWords = avgWordCount._avg.wordCount || 1500;
  const totalWords = unreadCount * avgWords;
  const estimatedReadingHours = Math.round(totalWords / 200 / 60);

  return {
    addedLast7Days,
    addedLast30Days,
    readLast7Days,
    readLast30Days,
    weeklyNetChange,
    monthlyNetChange,
    projectedYearlyGrowth,
    unreadCount,
    estimatedReadingHours,
  };
}

// ============================================
// Stale Document Detection
// ============================================

// Raw document from database (without ageInDays)
interface RawDocument {
  id: string;
  readwiseId: string;
  title: string | null;
  url: string;
  author: string | null;
  siteName: string | null;
  category: string;
  wordCount: number | null;
  createdAt: Date;
  publishedDate: Date | null;
  summary: string | null;
}

export interface StaleDocument {
  id: string;
  readwiseId: string;
  title: string | null;
  url: string;
  author: string | null;
  siteName: string | null;
  category: string;
  wordCount: number | null;
  createdAt: Date;
  publishedDate: Date | null;
  summary: string | null;
  ageInDays: number;
}

export interface StaleDocumentGroup {
  category: string;
  label: string;
  threshold: number;
  count: number;
  totalWordCount: number;
  documents: StaleDocument[];
}

export async function getStaleDocumentsForGroup(
  groupCategory: "news" | "articles" | "other",
  limit: number = 50,
  offset: number = 0,
  shuffleSeed?: string
): Promise<StaleDocument[]> {
  const settings = await getTriageSettings();
  const now = Date.now();

  // Define the group configuration
  const groupConfig = {
    news: {
      categories: ["rss", "tweet"],
      threshold: settings.staleNewsThreshold,
    },
    articles: {
      categories: ["article"],
      threshold: settings.staleArticleThreshold,
    },
    other: {
      categories: ["email", "pdf", "epub", "video", "highlight", "note"],
      threshold: settings.staleDefaultThreshold,
    },
  };

  const group = groupConfig[groupCategory];
  const cutoffDate = daysAgo(group.threshold);

  let documents;

  if (shuffleSeed) {
    // Use seeded random ordering for consistent pagination
    documents = await prisma.$queryRawUnsafe<RawDocument[]>(
      `SELECT 
        id, "readwiseId", title, url, author, "siteName", 
        category, "wordCount", "createdAt", "publishedDate", summary
      FROM "Document"
      WHERE 
        category = ANY($1::text[])
        AND location = ANY($2::text[])
        AND (
          ("publishedDate" IS NOT NULL AND "publishedDate" < $3)
          OR ("publishedDate" IS NULL AND "createdAt" < $4)
        )
      ORDER BY 
        md5(id::text || $5)
      OFFSET $6
      LIMIT $7`,
      group.categories,
      ['new', 'later', 'shortlist'],
      cutoffDate,
      cutoffDate,
      shuffleSeed,
      offset,
      limit
    );
  } else {
    // Use chronological ordering by age (oldest first)
    documents = await prisma.document.findMany({
      where: {
        category: { in: group.categories },
        location: { in: ["new", "later", "shortlist"] },
        OR: [
          { publishedDate: { lt: cutoffDate } },
          { publishedDate: null, createdAt: { lt: cutoffDate } },
        ],
      },
      orderBy: [
        { publishedDate: "asc" },
        { createdAt: "asc" },
      ],
      skip: offset,
      take: limit,
      select: {
        id: true,
        readwiseId: true,
        title: true,
        url: true,
        author: true,
        siteName: true,
        category: true,
        wordCount: true,
        createdAt: true,
        publishedDate: true,
        summary: true,
      },
    });
  }

  // Map to StaleDocument with age calculation
  return documents.map((doc) => {
    const dateToUse = doc.publishedDate || doc.createdAt;
    return {
      ...doc,
      ageInDays: Math.floor((now - dateToUse.getTime()) / (1000 * 60 * 60 * 24)),
    };
  });
}

export async function getStaleDocuments(
  limit: number = 50,
  offset: number = 0,
  shuffleSeed?: string
): Promise<StaleDocumentGroup[]> {
  const settings = await getTriageSettings();
  const now = Date.now();

  // Define category groups with their thresholds
  const groups = [
    {
      category: "news",
      label: "News & RSS",
      categories: ["rss", "tweet"],
      threshold: settings.staleNewsThreshold,
    },
    {
      category: "articles",
      label: "Articles",
      categories: ["article"],
      threshold: settings.staleArticleThreshold,
    },
    {
      category: "other",
      label: "Other Content",
      categories: ["email", "pdf", "epub", "video", "highlight", "note"],
      threshold: settings.staleDefaultThreshold,
    },
  ];

  const results: StaleDocumentGroup[] = [];

  for (const group of groups) {
    const cutoffDate = daysAgo(group.threshold);

    // Get count and total word count
    // Use publishedDate if available, otherwise fall back to createdAt
    const countResult = await prisma.document.aggregate({
      where: {
        category: { in: group.categories },
        location: { in: ["new", "later", "shortlist"] },
        OR: [
          { publishedDate: { lt: cutoffDate } },
          { publishedDate: null, createdAt: { lt: cutoffDate } },
        ],
      },
      _count: true,
      _sum: { wordCount: true },
    });

    let documents;
    
    if (shuffleSeed) {
      // Use seeded random ordering for consistent pagination
      // By hashing the document ID with the seed, we get a deterministic "random" order
      // MD5 hash gives us a consistent order that appears random but is reproducible with the same seed
      documents = await prisma.$queryRawUnsafe<RawDocument[]>(
        `SELECT 
          id, "readwiseId", title, url, author, "siteName", 
          category, "wordCount", "createdAt", "publishedDate", summary
        FROM "Document"
        WHERE 
          category = ANY($1::text[])
          AND location = ANY($2::text[])
          AND (
            ("publishedDate" IS NOT NULL AND "publishedDate" < $3)
            OR ("publishedDate" IS NULL AND "createdAt" < $4)
          )
        ORDER BY 
          md5(id::text || $5)
        OFFSET $6
        LIMIT $7`,
        group.categories,
        ['new', 'later', 'shortlist'],
        cutoffDate,
        cutoffDate,
        shuffleSeed,
        offset,
        limit
      );
    } else {
      // Use chronological ordering by age (oldest first)
      documents = await prisma.document.findMany({
        where: {
          category: { in: group.categories },
          location: { in: ["new", "later", "shortlist"] },
          OR: [
            { publishedDate: { lt: cutoffDate } },
            { publishedDate: null, createdAt: { lt: cutoffDate } },
          ],
        },
        orderBy: [
          { publishedDate: "asc" },
          { createdAt: "asc" },
        ],
        skip: offset,
        take: limit,
        select: {
          id: true,
          readwiseId: true,
          title: true,
          url: true,
          author: true,
          siteName: true,
          category: true,
          wordCount: true,
          createdAt: true,
          publishedDate: true,
          summary: true,
        },
      });
    }

    const staleDocuments: StaleDocument[] = documents.map((doc) => {
      // Use publishedDate if available, otherwise fall back to createdAt for age calculation
      const dateToUse = doc.publishedDate || doc.createdAt;
      return {
        ...doc,
        ageInDays: Math.floor((now - dateToUse.getTime()) / (1000 * 60 * 60 * 24)),
      };
    });

    results.push({
      category: group.category,
      label: group.label,
      threshold: group.threshold,
      count: countResult._count,
      totalWordCount: countResult._sum.wordCount || 0,
      documents: staleDocuments,
    });
  }

  return results;
}

export async function getStaleDocumentsByAge(
  olderThanDays: number,
  limit: number = 50,
  offset: number = 0
): Promise<{ count: number; documents: StaleDocument[] }> {
  const cutoffDate = daysAgo(olderThanDays);
  const now = Date.now();

  const [count, documents] = await Promise.all([
    prisma.document.count({
      where: {
        location: { in: ["new", "later", "shortlist"] },
        OR: [
          { publishedDate: { lt: cutoffDate } },
          { publishedDate: null, createdAt: { lt: cutoffDate } },
        ],
      },
    }),
    prisma.document.findMany({
      where: {
        location: { in: ["new", "later", "shortlist"] },
        OR: [
          { publishedDate: { lt: cutoffDate } },
          { publishedDate: null, createdAt: { lt: cutoffDate } },
        ],
      },
      orderBy: { createdAt: "asc" },
      skip: offset,
      take: limit,
      select: {
        id: true,
        readwiseId: true,
        title: true,
        url: true,
        author: true,
        siteName: true,
        category: true,
        wordCount: true,
        createdAt: true,
        publishedDate: true,
        summary: true,
      },
    }),
  ]);

  const staleDocuments: StaleDocument[] = documents.map((doc) => {
    const dateToUse = doc.publishedDate || doc.createdAt;
    return {
      ...doc,
      ageInDays: Math.floor((now - dateToUse.getTime()) / (1000 * 60 * 60 * 24)),
    };
  });

  return { count, documents: staleDocuments };
}

// ============================================
// Source Quality Analysis
// ============================================

export interface SourceStats {
  siteName: string;
  totalSaved: number;
  totalRead: number;
  completionRate: number;
  unreadCount: number;
  avgDaysToRead: number | null;
}

export async function getLowEngagementSources(
  minDocs: number = 5
): Promise<SourceStats[]> {
  // Get all documents grouped by siteName
  const allDocs = await prisma.document.groupBy({
    by: ["siteName", "location"],
    _count: true,
    where: {
      siteName: { not: null },
    },
  });

  // Aggregate by siteName
  const siteMap = new Map<string, { saved: number; read: number; unread: number }>();

  for (const doc of allDocs) {
    if (!doc.siteName) continue;

    const current = siteMap.get(doc.siteName) || { saved: 0, read: 0, unread: 0 };
    current.saved += doc._count;

    if (doc.location === "archive") {
      current.read += doc._count;
    } else if (["new", "later", "shortlist"].includes(doc.location || "")) {
      current.unread += doc._count;
    }

    siteMap.set(doc.siteName, current);
  }

  // Convert to array and filter by minimum docs
  const sources: SourceStats[] = [];

  for (const [siteName, stats] of siteMap) {
    if (stats.saved < minDocs) continue;

    const completionRate = stats.saved > 0 ? stats.read / stats.saved : 0;

    sources.push({
      siteName,
      totalSaved: stats.saved,
      totalRead: stats.read,
      completionRate,
      unreadCount: stats.unread,
      avgDaysToRead: null, // Would require more complex query
    });
  }

  // Sort by completion rate (lowest first) then by unread count (highest first)
  sources.sort((a, b) => {
    if (a.completionRate !== b.completionRate) {
      return a.completionRate - b.completionRate;
    }
    return b.unreadCount - a.unreadCount;
  });

  return sources.slice(0, 20); // Top 20 low-engagement sources
}

// ============================================
// Top Domains Analysis
// ============================================

export interface DomainStats {
  domain: string;
  count: number;
  totalWordCount: number;
}

export async function getTopDomainsInLater(limit: number = 50): Promise<DomainStats[]> {
  // Get all documents in 'later' location
  const documents = await prisma.document.findMany({
    where: {
      location: "later",
    },
    select: {
      url: true,
      siteName: true,
      wordCount: true,
    },
  });

  // Aggregate by domain
  const domainMap = new Map<string, { count: number; totalWordCount: number }>();

  for (const doc of documents) {
    let domain = doc.siteName;

    // If siteName is not available, extract domain from URL
    if (!domain && doc.url) {
      try {
        const url = new URL(doc.url);
        domain = url.hostname.replace(/^www\./, ''); // Remove www. prefix
      } catch {
        // If URL parsing fails, skip this document
        continue;
      }
    }

    if (!domain) continue;

    const current = domainMap.get(domain) || { count: 0, totalWordCount: 0 };
    current.count++;
    current.totalWordCount += doc.wordCount || 0;

    domainMap.set(domain, current);
  }

  // Convert to array and sort by count (descending)
  const domains: DomainStats[] = Array.from(domainMap.entries())
    .map(([domain, stats]) => ({
      domain,
      count: stats.count,
      totalWordCount: stats.totalWordCount,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);

  return domains;
}

// ============================================
// Tag Engagement Analysis
// ============================================

export interface TagEngagement {
  tag: string;
  totalSaved: number;
  totalRead: number;
  completionRate: number;
  unreadCount: number;
}

export async function getTagEngagement(): Promise<TagEngagement[]> {
  // Get all documents with their tags and locations
  const docs = await prisma.document.findMany({
    select: {
      tags: true,
      location: true,
    },
    where: {
      tags: { isEmpty: false },
    },
  });

  // Aggregate by tag
  const tagMap = new Map<string, { saved: number; read: number; unread: number }>();

  for (const doc of docs) {
    for (const tag of doc.tags) {
      const current = tagMap.get(tag) || { saved: 0, read: 0, unread: 0 };
      current.saved++;

      if (doc.location === "archive") {
        current.read++;
      } else if (["new", "later", "shortlist"].includes(doc.location || "")) {
        current.unread++;
      }

      tagMap.set(tag, current);
    }
  }

  // Convert to array
  const tags: TagEngagement[] = [];

  for (const [tag, stats] of tagMap) {
    const completionRate = stats.saved > 0 ? stats.read / stats.saved : 0;

    tags.push({
      tag,
      totalSaved: stats.saved,
      totalRead: stats.read,
      completionRate,
      unreadCount: stats.unread,
    });
  }

  // Sort by completion rate (lowest first)
  tags.sort((a, b) => {
    if (a.completionRate !== b.completionRate) {
      return a.completionRate - b.completionRate;
    }
    return b.unreadCount - a.unreadCount;
  });

  return tags.slice(0, 20);
}

// ============================================
// Triage Summary for Dashboard
// ============================================

export interface TriageSummary {
  unreadCount: number;
  staleCount: number;
  weeklyNetChange: number;
  isGrowingFaster: boolean;
}

export async function getTriageSummary(): Promise<TriageSummary> {
  const [velocity, staleGroups] = await Promise.all([
    getVelocityMetrics(),
    getStaleDocuments(0), // Just get counts
  ]);

  const staleCount = staleGroups.reduce((sum, g) => sum + g.count, 0);

  return {
    unreadCount: velocity.unreadCount,
    staleCount,
    weeklyNetChange: velocity.weeklyNetChange,
    isGrowingFaster: velocity.weeklyNetChange > 0,
  };
}

// ============================================
// Batch Archive Operations
// ============================================

export interface ArchiveResult {
  success: number;
  failed: number;
  errors: string[];
}

export async function archiveDocuments(
  readwiseIds: string[]
): Promise<ArchiveResult> {
  const token = await getApiToken();
  if (!token) {
    return { success: 0, failed: readwiseIds.length, errors: ["No API token configured"] };
  }

  const client = createReadwiseClient(token);
  const result = await client.batchArchive(readwiseIds);

  // Update local database for successfully archived documents
  if (result.success.length > 0) {
    await prisma.document.updateMany({
      where: {
        readwiseId: { in: result.success },
      },
      data: {
        location: "archive",
        lastMovedAt: new Date(),
      },
    });
  }

  revalidatePath("/triage");
  revalidatePath("/");

  return {
    success: result.success.length,
    failed: result.failed.length,
    errors: result.failed.map((f) => `${f.id}: ${f.error}`),
  };
}

export async function archiveStaleDocuments(criteria: {
  olderThanDays: number;
  categories?: string[];
  siteNames?: string[];
}): Promise<ArchiveResult> {
  const cutoffDate = daysAgo(criteria.olderThanDays);

  // Build the where clause
  const whereClause: {
    location: { in: string[] };
    OR: Array<{ publishedDate: { lt: Date } } | { publishedDate: null; createdAt: { lt: Date } }>;
    category?: { in: string[] };
    siteName?: { in: string[] };
  } = {
    location: { in: ["new", "later", "shortlist"] },
    OR: [
      { publishedDate: { lt: cutoffDate } },
      { publishedDate: null, createdAt: { lt: cutoffDate } },
    ],
  };

  if (criteria.categories && criteria.categories.length > 0) {
    whereClause.category = { in: criteria.categories };
  }

  if (criteria.siteNames && criteria.siteNames.length > 0) {
    whereClause.siteName = { in: criteria.siteNames };
  }

  // Get all matching document IDs
  const documents = await prisma.document.findMany({
    where: whereClause,
    select: { readwiseId: true },
  });

  if (documents.length === 0) {
    return { success: 0, failed: 0, errors: [] };
  }

  const readwiseIds = documents.map((d) => d.readwiseId);
  return archiveDocuments(readwiseIds);
}

export async function archiveDocumentsFromSource(
  siteName: string
): Promise<ArchiveResult> {
  const documents = await prisma.document.findMany({
    where: {
      siteName,
      location: { in: ["new", "later", "shortlist"] },
    },
    select: { readwiseId: true },
  });

  if (documents.length === 0) {
    return { success: 0, failed: 0, errors: [] };
  }

  const readwiseIds = documents.map((d) => d.readwiseId);
  return archiveDocuments(readwiseIds);
}

