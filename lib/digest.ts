import { briefConfig } from "@/config/brief";
import { summarizeStories } from "@/lib/ai";
import { clusterItems } from "@/lib/cluster";
import { fetchAllFeeds } from "@/lib/feeds";
import { digestUrl, sendBriefNotification } from "@/lib/notify";
import { filterRecent, rankClusters, selectStories, toDigestStories } from "@/lib/rank";
import { blobConfigured, saveDigest } from "@/lib/storage";
import { klDate } from "@/lib/time";
import type { Digest } from "@/lib/types";

export interface DigestRun {
  digest: Digest;
  notification: { sent: boolean; error?: string };
  url: string;
}

export async function createDigest(now = new Date()): Promise<DigestRun> {
  if (process.env.VERCEL && !blobConfigured()) {
    throw new Error(
      "Connect a Vercel Blob store before running the brief. Without it, digests disappear between requests.",
    );
  }

  const { items, errors } = await fetchAllFeeds(briefConfig.feeds);
  const fresh = filterRecent(items, now, briefConfig.windowHours);
  const ranked = rankClusters(
    clusterItems(fresh),
    now,
    briefConfig.windowHours,
  );
  const selected = selectStories(ranked, briefConfig.slots);

  if (selected.length === 0) {
    const failed = errors.map((error) => error.source).join(", ");
    throw new Error(
      failed
        ? `No stories from the last ${briefConfig.windowHours} hours. Feeds that failed: ${failed}.`
        : `No stories from the last ${briefConfig.windowHours} hours.`,
    );
  }

  const summaries = await summarizeStories(
    selected.map((story) => ({
      id: story.id,
      category: story.category,
      title: story.title,
      snippet: story.snippet,
    })),
  );

  const digest: Digest = {
    date: klDate(now),
    generatedAt: now.toISOString(),
    timezone: briefConfig.timezone,
    aiProvider: summaries.provider,
    stories: toDigestStories(selected, summaries.byId),
    feedErrors: errors,
  };

  await saveDigest(digest);
  const notification = await sendBriefNotification(digest);
  const url = digestUrl(digest.date);

  console.info(
    `[morning-brief] ${digest.date} stories=${digest.stories.length} ai=${digest.aiProvider} feedErrors=${errors.length} notified=${notification.sent}`,
  );

  return { digest, notification, url };
}
