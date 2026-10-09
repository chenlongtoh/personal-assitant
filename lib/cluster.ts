import { createHash } from "node:crypto";

import { canonicalUrl } from "@/lib/text";
import type { CategoryId, Cluster, RawItem, StorySource } from "@/lib/types";

const STOP = new Set([
  "a",
  "an",
  "the",
  "of",
  "to",
  "and",
  "in",
  "on",
  "for",
  "with",
  "as",
  "at",
  "by",
  "from",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "that",
  "this",
  "it",
  "its",
  "into",
  "over",
  "after",
  "before",
  "about",
  "how",
  "why",
  "what",
  "who",
  "will",
  "has",
  "have",
  "had",
  "new",
  "up",
  "out",
  "their",
  "his",
  "her",
  "but",
  "or",
  "not",
  "than",
  "via",
  "amid",
  "onto",
  "per",
  "vs",
  "says",
  "said",
  "say",
]);

const PLACES = new Set([
  "malaysia",
  "malaysian",
  "singapore",
  "singaporean",
  "indonesia",
  "indonesian",
  "thailand",
  "thai",
  "vietnam",
  "vietnamese",
  "philippines",
  "philippine",
  "filipino",
  "myanmar",
  "cambodia",
  "cambodian",
  "laos",
  "laotian",
  "brunei",
  "china",
  "chinese",
  "japan",
  "japanese",
  "korea",
  "korean",
  "india",
  "indian",
  "australia",
  "australian",
  "taiwan",
  "taiwanese",
  "ukraine",
  "ukrainian",
  "russia",
  "russian",
  "israel",
  "israeli",
  "gaza",
  "iran",
  "iranian",
  "iraq",
  "syria",
  "syrian",
  "europe",
  "european",
  "africa",
  "african",
  "america",
  "american",
  "britain",
  "british",
  "uk",
  "usa",
  "us",
  "eu",
  "nato",
  "asean",
  "penang",
  "johor",
  "sabah",
  "sarawak",
  "selangor",
  "bangkok",
  "jakarta",
  "manila",
  "hanoi",
  "beijing",
  "shanghai",
  "taipei",
  "seoul",
  "tokyo",
  "delhi",
  "mumbai",
  "sydney",
  "london",
  "paris",
  "berlin",
  "moscow",
  "kyiv",
  "kiev",
  "washington",
  "qatar",
  "dubai",
]);

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function significantTokens(title: string): Set<string> {
  return new Set(
    normalizeTitle(title)
      .split(" ")
      .filter((word) => word.length >= 2 && !STOP.has(word)),
  );
}

function numbersIn(title: string): Set<string> {
  return new Set(title.match(/\d+(?:\.\d+)?/g) ?? []);
}

function conflictingNumbers(left: string, right: string): boolean {
  const a = numbersIn(left);
  const b = numbersIn(right);
  if (a.size === 0 || b.size === 0) return false;
  if (a.size !== b.size) return true;
  for (const value of a) {
    if (!b.has(value)) return true;
  }
  return false;
}

function placesIn(tokens: Set<string>): Set<string> {
  return new Set([...tokens].filter((token) => PLACES.has(token)));
}

function conflictingPlaces(left: Set<string>, right: Set<string>): boolean {
  const a = placesIn(left);
  const b = placesIn(right);
  if (a.size === 0 || b.size === 0) return false;
  for (const place of a) {
    if (!b.has(place)) {
      for (const other of b) {
        if (!a.has(other)) return true;
      }
    }
  }
  return false;
}

export function areNearDuplicates(left: string, right: string): boolean {
  const normalLeft = normalizeTitle(left);
  const normalRight = normalizeTitle(right);
  if (!normalLeft || !normalRight) return false;
  if (normalLeft === normalRight) return true;

  const a = significantTokens(left);
  const b = significantTokens(right);
  if (a.size === 0 || b.size === 0) return false;

  let shared = 0;
  for (const token of a) {
    if (b.has(token)) shared += 1;
  }
  const union = a.size + b.size - shared;
  const jaccard = union === 0 ? 0 : shared / union;
  const contain = shared / Math.min(a.size, b.size);

  if (conflictingNumbers(left, right) && jaccard < 0.9) return false;
  if (conflictingPlaces(a, b) && jaccard < 0.85) return false;
  if (jaccard >= 0.62) return true;
  if (contain >= 0.75 && shared >= 3) return true;
  if (shared >= 4 && contain >= 0.67) return true;
  return false;
}

function shortHash(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function titleQuality(title: string): number {
  const letters = title.replace(/[^A-Za-z]/g, "");
  const shouty = letters.length > 12 && letters === letters.toUpperCase();
  return significantTokens(title).size + Math.min(title.length, 140) / 80 - (shouty ? 4 : 0);
}

function dominantCategory(sources: StorySource[]): CategoryId {
  const counts = new Map<CategoryId, number>();
  for (const source of sources) {
    counts.set(source.category, (counts.get(source.category) ?? 0) + 1);
  }
  let best: CategoryId = sources[0]?.category ?? "world";
  let bestCount = -1;
  for (const [category, count] of counts) {
    if (count > bestCount) {
      best = category;
      bestCount = count;
    }
  }
  return best;
}

function sameStory(cluster: Cluster, item: RawItem): boolean {
  const itemUrl = canonicalUrl(item.url);
  if (canonicalUrl(cluster.url) === itemUrl) return true;
  if (cluster.sources.some((source) => canonicalUrl(source.url) === itemUrl)) {
    return true;
  }
  return cluster.titles.some((title) => areNearDuplicates(title, item.title));
}

function addSource(cluster: Cluster, item: RawItem) {
  if (cluster.sources.some((source) => source.name === item.source)) return;
  cluster.sources.push({
    name: item.source,
    url: item.url,
    category: item.category,
  });
}

function absorb(cluster: Cluster, item: RawItem) {
  addSource(cluster, item);
  if (!cluster.titles.includes(item.title)) cluster.titles.push(item.title);

  const published = new Date(item.publishedAt).getTime();
  const current = new Date(cluster.publishedAt).getTime();
  if (Number.isFinite(published) && published > current) {
    cluster.publishedAt = item.publishedAt;
  }

  if (titleQuality(item.title) > titleQuality(cluster.title) + 0.4) {
    cluster.title = item.title;
    cluster.url = item.url;
    const index = cluster.sources.findIndex((source) => source.name === item.source);
    if (index > 0) {
      const [source] = cluster.sources.splice(index, 1);
      cluster.sources.unshift(source);
    }
  }

  if (item.snippet.length > cluster.snippet.length + 40) {
    cluster.snippet = item.snippet;
  }

  cluster.category = dominantCategory(cluster.sources);
}

function createCluster(item: RawItem): Cluster {
  return {
    id: shortHash(`${normalizeTitle(item.title)}|${canonicalUrl(item.url)}`),
    title: item.title,
    url: item.url,
    snippet: item.snippet,
    publishedAt: item.publishedAt,
    category: item.category,
    sources: [{ name: item.source, url: item.url, category: item.category }],
    titles: [item.title],
  };
}

export function clusterItems(items: RawItem[]): Cluster[] {
  const clusters: Cluster[] = [];
  const ordered = [...items].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );

  for (const item of ordered) {
    const match = clusters.find((cluster) => sameStory(cluster, item));
    if (!match) {
      clusters.push(createCluster(item));
      continue;
    }
    absorb(match, item);
  }

  return clusters;
}
