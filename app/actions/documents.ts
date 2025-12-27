"use server";

import { prisma } from "@/lib/db";

export interface DocumentStats {
  total: number;
  byLocation: Record<string, number>;
  byCategory: Record<string, number>;
  readingProgress: {
    notStarted: number;
    inProgress: number;
    completed: number;
  };
  topTags: { tag: string; count: number }[];
  recentlyAdded: number;
  readThisWeek: number;
  readThisMonth: number;
  avgWordsPerDocument: number;
}

export interface TimeSeriesData {
  date: string;
  count: number;
}

export async function getDocumentCount(): Promise<number> {
  return prisma.document.count();
}

export async function getDocumentStats(): Promise<DocumentStats> {
  const [
    total,
    byLocationRaw,
    byCategoryRaw,
    allTags,
    readingProgressRaw,
    recentlyAdded,
    readThisWeek,
    readThisMonth,
    wordCountAgg,
  ] = await Promise.all([
    // Total count
    prisma.document.count(),

    // Group by location
    prisma.document.groupBy({
      by: ["location"],
      _count: true,
    }),

    // Group by category
    prisma.document.groupBy({
      by: ["category"],
      _count: true,
    }),

    // Get all tags for counting
    prisma.document.findMany({
      select: { tags: true },
    }),

    // Reading progress buckets
    Promise.all([
      prisma.document.count({
        where: { readingProgress: 0 },
      }),
      prisma.document.count({
        where: {
          readingProgress: { gt: 0, lt: 1 },
        },
      }),
      prisma.document.count({
        where: { readingProgress: 1 },
      }),
    ]),

    // Recently added (last 7 days)
    prisma.document.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    }),

    // Read this week (archived with lastOpenedAt in last 7 days)
    prisma.document.count({
      where: {
        location: "archive",
        lastOpenedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    }),

    // Read this month
    prisma.document.count({
      where: {
        location: "archive",
        lastOpenedAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    }),

    // Average word count
    prisma.document.aggregate({
      _avg: { wordCount: true },
    }),
  ]);

  // Transform location and category data
  const byLocation: Record<string, number> = {};
  for (const item of byLocationRaw) {
    // Skip null locations (e.g., highlights without a location)
    if (item.location) {
      byLocation[item.location] = item._count;
    }
  }

  const byCategory: Record<string, number> = {};
  for (const item of byCategoryRaw) {
    byCategory[item.category] = item._count;
  }

  // Count tags
  const tagCounts: Record<string, number> = {};
  for (const doc of allTags) {
    for (const tag of doc.tags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }

  // Get top 10 tags
  const topTags = Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    total,
    byLocation,
    byCategory,
    readingProgress: {
      notStarted: readingProgressRaw[0],
      inProgress: readingProgressRaw[1],
      completed: readingProgressRaw[2],
    },
    topTags,
    recentlyAdded,
    readThisWeek,
    readThisMonth,
    avgWordsPerDocument: Math.round(wordCountAgg._avg.wordCount || 0),
  };
}

export async function getDocumentsAddedOverTime(
  days = 30
): Promise<TimeSeriesData[]> {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const documents = await prisma.document.findMany({
    where: {
      createdAt: { gte: startDate },
    },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  // Group by date
  const countByDate: Record<string, number> = {};

  // Initialize all dates with 0
  for (let i = 0; i < days; i++) {
    const date = new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split("T")[0];
    countByDate[dateStr] = 0;
  }

  // Count documents per date
  for (const doc of documents) {
    const dateStr = doc.createdAt.toISOString().split("T")[0];
    if (dateStr in countByDate) {
      countByDate[dateStr]++;
    }
  }

  return Object.entries(countByDate).map(([date, count]) => ({
    date,
    count,
  }));
}

export async function getDocumentsReadOverTime(
  days = 30
): Promise<TimeSeriesData[]> {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const documents = await prisma.document.findMany({
    where: {
      location: "archive",
      lastOpenedAt: { gte: startDate },
    },
    select: { lastOpenedAt: true },
    orderBy: { lastOpenedAt: "asc" },
  });

  // Group by date
  const countByDate: Record<string, number> = {};

  // Initialize all dates with 0
  for (let i = 0; i < days; i++) {
    const date = new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split("T")[0];
    countByDate[dateStr] = 0;
  }

  // Count documents per date
  for (const doc of documents) {
    if (doc.lastOpenedAt) {
      const dateStr = doc.lastOpenedAt.toISOString().split("T")[0];
      if (dateStr in countByDate) {
        countByDate[dateStr]++;
      }
    }
  }

  return Object.entries(countByDate).map(([date, count]) => ({
    date,
    count,
  }));
}

export async function getRecentDocuments(limit = 10) {
  return prisma.document.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      readwiseId: true,
      title: true,
      author: true,
      url: true,
      category: true,
      location: true,
      tags: true,
      siteName: true,
      wordCount: true,
      readingProgress: true,
      createdAt: true,
    },
  });
}

export async function searchDocuments(query: string, limit = 20) {
  return prisma.document.findMany({
    where: {
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { author: { contains: query, mode: "insensitive" } },
        { summary: { contains: query, mode: "insensitive" } },
        { siteName: { contains: query, mode: "insensitive" } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

