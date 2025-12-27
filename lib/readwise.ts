/**
 * Readwise Reader API Client
 * https://readwise.io/reader_api
 */

const READWISE_API_BASE = "https://readwise.io/api";

export interface ReadwiseDocument {
  id: string;
  url: string;
  source_url?: string;
  title?: string;
  author?: string;
  source?: string;
  category: string;
  location: string;
  tags: Record<string, { name: string; type: string; created: number }> | Array<{ name: string; type: string; created: number }>;
  site_name?: string;
  word_count?: number;
  summary?: string;
  published_date?: string;
  created_at: string;
  updated_at: string;
  first_opened_at?: string;
  last_opened_at?: string;
  last_moved_at?: string;
  reading_progress: number;
  parent_id?: string;
  image_url?: string;
  notes?: string;
}

export interface ReadwiseListResponse {
  count: number;
  nextPageCursor: string | null;
  results: ReadwiseDocument[];
}

export interface ReadwiseTag {
  key: string;
  name: string;
}

export interface ReadwiseTagsResponse {
  count: number;
  nextPageCursor: string | null;
  results: ReadwiseTag[];
}

export class ReadwiseClient {
  private token: string;
  private lastRequestTime = 0;
  private minRequestInterval = 3000; // 3 seconds between requests (20 req/min = 3s intervals)

  constructor(token: string) {
    this.token = token;
  }

  private async rateLimitedFetch(
    url: string,
    options?: RequestInit,
    retryCount = 0
  ): Promise<Response> {
    // Enforce rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest)
      );
    }
    this.lastRequestTime = Date.now();

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Token ${this.token}`,
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    // Handle rate limiting response
    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      const waitTime = retryAfter
        ? parseInt(retryAfter) * 1000
        : this.minRequestInterval * 2;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      return this.rateLimitedFetch(url, options, retryCount);
    }

    // Retry 500 errors with exponential backoff (max 3 retries)
    if (response.status === 500 && retryCount < 3) {
      const waitTime = Math.pow(2, retryCount) * 2000; // 2s, 4s, 8s
      console.log(`API returned 500 error, retrying in ${waitTime}ms (attempt ${retryCount + 1}/3)...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      return this.rateLimitedFetch(url, options, retryCount + 1);
    }

    return response;
  }

  /**
   * Validate the API token
   * Returns true if the token is valid
   */
  async validateToken(): Promise<boolean> {
    try {
      const response = await this.rateLimitedFetch(
        `${READWISE_API_BASE}/v2/auth/`
      );
      return response.status === 204;
    } catch {
      return false;
    }
  }

  /**
   * Fetch a page of documents from Readwise Reader
   */
  async fetchDocuments(params?: {
    updatedAfter?: string;
    location?: string;
    category?: string;
    pageCursor?: string;
    withHtmlContent?: boolean;
  }): Promise<ReadwiseListResponse> {
    const searchParams = new URLSearchParams();

    if (params?.updatedAfter) {
      searchParams.set("updatedAfter", params.updatedAfter);
    }
    if (params?.location) {
      searchParams.set("location", params.location);
    }
    if (params?.category) {
      searchParams.set("category", params.category);
    }
    if (params?.pageCursor) {
      searchParams.set("pageCursor", params.pageCursor);
    }
    if (params?.withHtmlContent) {
      searchParams.set("withHtmlContent", "true");
    }

    const url = `${READWISE_API_BASE}/v3/list/?${searchParams.toString()}`;
    const response = await this.rateLimitedFetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch documents: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Fetch all documents with pagination
   * Yields pages of documents for streaming processing
   */
  async *fetchAllDocuments(params?: {
    updatedAfter?: string;
    location?: string;
    category?: string;
    onProgress?: (fetched: number, cursor: string | null) => void;
  }): AsyncGenerator<ReadwiseDocument[], void, unknown> {
    let cursor: string | null = null;
    let totalFetched = 0;

    do {
      const response = await this.fetchDocuments({
        ...params,
        pageCursor: cursor ?? undefined,
      });

      totalFetched += response.results.length;

      if (params?.onProgress) {
        params.onProgress(totalFetched, response.nextPageCursor);
      }

      yield response.results;

      cursor = response.nextPageCursor;
    } while (cursor);
  }

  /**
   * Fetch a single document by ID
   */
  async fetchDocument(id: string): Promise<ReadwiseDocument | null> {
    const url = `${READWISE_API_BASE}/v3/list/?id=${id}`;
    const response = await this.rateLimitedFetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch document: ${response.status} ${response.statusText}`
      );
    }

    const data: ReadwiseListResponse = await response.json();
    return data.results[0] ?? null;
  }

  /**
   * Fetch all tags
   */
  async fetchTags(): Promise<ReadwiseTag[]> {
    const allTags: ReadwiseTag[] = [];
    let cursor: string | null = null;

    do {
      const searchParams = new URLSearchParams();
      if (cursor) {
        searchParams.set("pageCursor", cursor);
      }

      const url = `${READWISE_API_BASE}/v3/tags/?${searchParams.toString()}`;
      const response = await this.rateLimitedFetch(url);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch tags: ${response.status} ${response.statusText}`
        );
      }

      const data: ReadwiseTagsResponse = await response.json();
      allTags.push(...data.results);
      cursor = data.nextPageCursor;
    } while (cursor);

    return allTags;
  }

  /**
   * Save a document to Readwise Reader
   */
  async saveDocument(params: {
    url: string;
    html?: string;
    title?: string;
    author?: string;
    summary?: string;
    publishedDate?: string;
    imageUrl?: string;
    location?: "new" | "later" | "shortlist" | "archive" | "feed";
    category?:
      | "article"
      | "email"
      | "rss"
      | "highlight"
      | "note"
      | "pdf"
      | "epub"
      | "tweet"
      | "video";
    tags?: string[];
  }): Promise<{ id: string; url: string }> {
    const response = await this.rateLimitedFetch(
      `${READWISE_API_BASE}/v3/save/`,
      {
        method: "POST",
        body: JSON.stringify({
          url: params.url,
          html: params.html,
          title: params.title,
          author: params.author,
          summary: params.summary,
          published_date: params.publishedDate,
          image_url: params.imageUrl,
          location: params.location,
          category: params.category,
          tags: params.tags,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to save document: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Update a document in Readwise Reader
   */
  async updateDocument(
    id: string,
    params: {
      title?: string;
      author?: string;
      summary?: string;
      publishedDate?: string;
      imageUrl?: string;
      location?: "new" | "later" | "shortlist" | "archive" | "feed";
      category?:
        | "article"
        | "email"
        | "rss"
        | "highlight"
        | "note"
        | "pdf"
        | "epub"
        | "tweet"
        | "video";
      tags?: string[];
      seen?: boolean;
    }
  ): Promise<{ id: string; url: string }> {
    const response = await this.rateLimitedFetch(
      `${READWISE_API_BASE}/v3/update/${id}/`,
      {
        method: "PATCH",
        body: JSON.stringify({
          title: params.title,
          author: params.author,
          summary: params.summary,
          published_date: params.publishedDate,
          image_url: params.imageUrl,
          location: params.location,
          category: params.category,
          tags: params.tags,
          seen: params.seen,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to update document: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Delete a document from Readwise Reader
   */
  async deleteDocument(id: string): Promise<void> {
    const response = await this.rateLimitedFetch(
      `${READWISE_API_BASE}/v3/delete/${id}/`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok && response.status !== 204) {
      throw new Error(
        `Failed to delete document: ${response.status} ${response.statusText}`
      );
    }
  }

  /**
   * Archive a single document (move to archive location)
   */
  async archiveDocument(id: string): Promise<{ id: string; url: string }> {
    return this.updateDocument(id, { location: "archive" });
  }

  /**
   * Batch archive multiple documents
   * Respects rate limiting and reports progress
   */
  async batchArchive(
    ids: string[],
    onProgress?: (done: number, total: number) => void
  ): Promise<{
    success: string[];
    failed: { id: string; error: string }[];
  }> {
    const success: string[] = [];
    const failed: { id: string; error: string }[] = [];

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      try {
        await this.archiveDocument(id);
        success.push(id);
      } catch (error) {
        failed.push({
          id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }

      if (onProgress) {
        onProgress(i + 1, ids.length);
      }
    }

    return { success, failed };
  }
}

/**
 * Create a Readwise client from a token
 */
export function createReadwiseClient(token: string): ReadwiseClient {
  return new ReadwiseClient(token);
}

