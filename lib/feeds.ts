import Parser from "rss-parser";

import { cleanHeadline, stripHtml, truncate } from "@/lib/text";
import type { FeedConfig, FeedError, RawItem } from "@/lib/types";

const FEED_TIMEOUT_MS = 8_000;
const USER_AGENT =
  "Mozilla/5.0 (compatible; MorningBrief/1.0; personal daily digest)";

const parser = new Parser();

export interface FeedFetchResult {
  source: string;
  url: string;
  items: RawItem[];
  error?: string;
}

export function mergeFeedResults(results: FeedFetchResult[]): {
  items: RawItem[];
  errors: FeedError[];
} {
  const items: RawItem[] = [];
  const errors: FeedError[] = [];
  for (const result of results) {
    items.push(...result.items);
    if (result.error) {
      errors.push({
        source: result.source,
        url: result.url,
        message: result.error,
      });
    }
  }
  return { items, errors };
}

function itemSnippet(item: Parser.Item): string {
  const plain = item.contentSnippet?.replace(/\s+/g, " ").trim();
  if (plain) return truncate(plain, 360);
  return truncate(stripHtml(item.content || item.summary || ""), 360);
}

function toRawItem(feed: FeedConfig, item: Parser.Item): RawItem | null {
  const link = item.link?.trim();
  const rawTitle = item.title?.trim();
  if (!link || !rawTitle) return null;
  const publishedAt = item.isoDate || item.pubDate;
  if (!publishedAt) return null;
  const published = new Date(publishedAt);
  if (Number.isNaN(published.getTime())) return null;

  let url = link;
  try {
    url = new URL(link).toString();
  } catch {
    return null;
  }

  return {
    title: cleanHeadline(rawTitle, feed.source),
    url,
    source: feed.source,
    category: feed.category,
    publishedAt: published.toISOString(),
    snippet: itemSnippet(item),
  };
}

export async function fetchFeed(feed: FeedConfig): Promise<FeedFetchResult> {
  try {
    const response = await fetch(feed.url, {
      headers: {
        Accept:
          "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
        "User-Agent": USER_AGENT,
      },
      signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok) {
      return {
        source: feed.source,
        url: feed.url,
        items: [],
        error: `HTTP ${response.status}`,
      };
    }
    const xml = await response.text();
    const parsed = await parser.parseString(xml);
    const items = (parsed.items ?? [])
      .map((item) => toRawItem(feed, item))
      .filter((item): item is RawItem => item !== null)
      .sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      )
      .slice(0, 25);
    return { source: feed.source, url: feed.url, items };
  } catch (error) {
    return {
      source: feed.source,
      url: feed.url,
      items: [],
      error: error instanceof Error ? error.message : "Could not read feed",
    };
  }
}

export async function fetchAllFeeds(
  feeds: readonly FeedConfig[],
): Promise<{ items: RawItem[]; errors: FeedError[] }> {
  const results = await Promise.all(feeds.map((feed) => fetchFeed(feed)));
  return mergeFeedResults(results);
}
