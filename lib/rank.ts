import { labelFor } from "@/config/brief";
import type {
  Cluster,
  DigestStory,
  RankedCluster,
  RawItem,
  Slot,
} from "@/lib/types";

export function filterRecent(
  items: RawItem[],
  now: Date,
  windowHours: number,
): RawItem[] {
  const cutoff = now.getTime() - windowHours * 3_600_000;
  const futureSkew = now.getTime() + 5 * 60_000;
  return items.filter((item) => {
    const published = new Date(item.publishedAt).getTime();
    return Number.isFinite(published) && published >= cutoff && published <= futureSkew;
  });
}

export function scoreCluster(
  cluster: Cluster,
  now: Date,
  windowHours: number,
): number {
  const published = new Date(cluster.publishedAt).getTime();
  const ageHours = Number.isFinite(published)
    ? Math.min(windowHours, Math.max(0, (now.getTime() - published) / 3_600_000))
    : windowHours;
  const recency = 1 - ageHours / windowHours;
  const coverage = cluster.sources.length;
  const multiOutletBoost = coverage >= 3 ? 15 : 0;
  return coverage * 10 + multiOutletBoost + recency * 8;
}

function compareRank(left: RankedCluster, right: RankedCluster): number {
  if (right.score !== left.score) return right.score - left.score;
  if (right.sources.length !== left.sources.length) {
    return right.sources.length - left.sources.length;
  }
  return (
    new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime()
  );
}

export function rankClusters(
  clusters: Cluster[],
  now: Date,
  windowHours: number,
): RankedCluster[] {
  return clusters
    .map((cluster) => ({
      ...cluster,
      score: scoreCluster(cluster, now, windowHours),
    }))
    .sort(compareRank);
}

export function selectStories(
  ranked: RankedCluster[],
  slots: readonly Slot[],
): RankedCluster[] {
  const sorted = [...ranked].sort(compareRank);
  const picked: RankedCluster[] = [];
  const used = new Set<string>();

  for (const slot of slots) {
    const pool = sorted.filter(
      (cluster) => cluster.category === slot.category && !used.has(cluster.id),
    );
    for (const cluster of pool.slice(0, slot.count)) {
      picked.push(cluster);
      used.add(cluster.id);
    }
  }

  const target = slots.reduce((sum, slot) => sum + slot.count, 0);
  if (picked.length < target) {
    for (const cluster of sorted) {
      if (picked.length >= target) break;
      if (used.has(cluster.id)) continue;
      picked.push(cluster);
      used.add(cluster.id);
    }
  }

  return picked;
}

export function fallbackWhyItMatters(story: {
  coverage: number;
  categoryLabel: string;
}): string {
  if (story.coverage >= 3) {
    return `Reported by ${story.coverage} outlets in the last day, a strong signal this is moving.`;
  }
  if (story.coverage === 2) {
    return "Picked up by two outlets, so it is more than a single report.";
  }
  return `The leading ${story.categoryLabel} story from the last day.`;
}

export function toDigestStories(
  selected: RankedCluster[],
  summaries: Map<string, { summary: string; whyItMatters: string }>,
): DigestStory[] {
  return selected.map((cluster) => {
    const written = summaries.get(cluster.id);
    const coverage = cluster.sources.length;
    const categoryLabel = labelFor(cluster.category);
    return {
      id: cluster.id,
      title: cluster.title,
      url: cluster.url,
      source: cluster.sources[0]?.name ?? "Source",
      sources: cluster.sources.map((source) => ({
        name: source.name,
        url: source.url,
      })),
      category: cluster.category,
      categoryLabel,
      publishedAt: cluster.publishedAt,
      summary: written?.summary ?? null,
      whyItMatters:
        written?.whyItMatters ??
        fallbackWhyItMatters({ coverage, categoryLabel }),
      excerpt: cluster.snippet || null,
      coverage,
    };
  });
}
