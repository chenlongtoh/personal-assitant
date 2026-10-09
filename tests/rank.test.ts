import assert from "node:assert/strict";
import { test } from "node:test";

import { filterRecent, rankClusters, scoreCluster, selectStories } from "../lib/rank";
import type { Cluster, RankedCluster, RawItem, Slot } from "../lib/types";

const now = new Date("2026-10-09T00:00:00.000Z");
const windowHours = 36;

const slots: Slot[] = [
  { category: "ai-tech", label: "AI & tech", count: 2 },
  { category: "sea", label: "Malaysia & Southeast Asia", count: 2 },
  { category: "world", label: "World", count: 1 },
];

function cluster(overrides: Partial<Cluster> = {}): Cluster {
  return {
    id: overrides.id ?? "c1",
    title: overrides.title ?? "Story",
    url: overrides.url ?? "https://example.com/story",
    snippet: overrides.snippet ?? "Snippet",
    publishedAt: overrides.publishedAt ?? "2026-10-08T12:00:00.000Z",
    category: overrides.category ?? "ai-tech",
    sources: overrides.sources ?? [
      { name: "TechCrunch", url: "https://example.com/story", category: "ai-tech" },
    ],
    titles: overrides.titles ?? ["Story"],
  };
}

function raw(publishedAt: string): RawItem {
  return {
    title: "Story",
    url: "https://example.com",
    source: "BBC",
    category: "world",
    publishedAt,
    snippet: "Snippet",
  };
}

test("items older than 36 hours are left out, and the cutoff itself is kept", () => {
  const cutoff = new Date(now.getTime() - windowHours * 3_600_000).toISOString();
  const tooOld = new Date(now.getTime() - windowHours * 3_600_000 - 1).toISOString();
  const recent = filterRecent(
    [
      raw(cutoff),
      raw(tooOld),
      raw(new Date(now.getTime() + 4 * 60_000).toISOString()),
      raw(new Date(now.getTime() + 10 * 60_000).toISOString()),
    ],
    now,
    windowHours,
  );

  assert.deepEqual(
    recent.map((item) => item.publishedAt),
    [cutoff, new Date(now.getTime() + 4 * 60_000).toISOString()],
  );
});

test("coverage by three outlets outranks a fresher single-source story", () => {
  const widelyCovered = cluster({
    id: "wide",
    publishedAt: "2026-10-08T04:00:00.000Z",
    sources: [
      { name: "BBC", url: "https://bbc.test/a", category: "world" },
      { name: "The Guardian", url: "https://guardian.test/a", category: "world" },
      { name: "Al Jazeera", url: "https://aj.test/a", category: "world" },
    ],
    category: "world",
  });
  const freshSingle = cluster({
    id: "fresh",
    publishedAt: "2026-10-08T23:00:00.000Z",
  });

  assert.ok(scoreCluster(widelyCovered, now, windowHours) > scoreCluster(freshSingle, now, windowHours));

  const ranked = rankClusters([freshSingle, widelyCovered], now, windowHours);
  assert.equal(ranked[0].id, "wide");
});

test("within the same coverage, the newer story ranks first", () => {
  const older = cluster({ id: "older", publishedAt: "2026-10-08T06:00:00.000Z" });
  const newer = cluster({ id: "newer", publishedAt: "2026-10-08T22:00:00.000Z" });
  const ranked = rankClusters([older, newer], now, windowHours);
  assert.deepEqual(
    ranked.map((story) => story.id),
    ["newer", "older"],
  );
});

test("selection keeps two tech, two regional, and one world story", () => {
  const ranked: RankedCluster[] = [
    { ...cluster({ id: "ai-1", category: "ai-tech" }), score: 50 },
    { ...cluster({ id: "ai-2", category: "ai-tech" }), score: 40 },
    { ...cluster({ id: "ai-3", category: "ai-tech" }), score: 30 },
    { ...cluster({ id: "sea-1", category: "sea" }), score: 45 },
    { ...cluster({ id: "sea-2", category: "sea" }), score: 35 },
    { ...cluster({ id: "sea-3", category: "sea" }), score: 15 },
    { ...cluster({ id: "world-1", category: "world" }), score: 20 },
    { ...cluster({ id: "world-2", category: "world" }), score: 10 },
  ];

  const picked = selectStories(ranked, slots).map((story) => story.id);
  assert.deepEqual(picked, ["ai-1", "ai-2", "sea-1", "sea-2", "world-1"]);
});

test("a short section is backfilled from the next strongest story", () => {
  const ranked: RankedCluster[] = [
    { ...cluster({ id: "ai-1", category: "ai-tech" }), score: 50 },
    { ...cluster({ id: "ai-2", category: "ai-tech" }), score: 40 },
    { ...cluster({ id: "ai-3", category: "ai-tech" }), score: 39 },
    { ...cluster({ id: "sea-1", category: "sea" }), score: 30 },
    { ...cluster({ id: "sea-2", category: "sea" }), score: 20 },
  ];

  const picked = selectStories(ranked, slots).map((story) => story.id);
  assert.deepEqual(picked, ["ai-1", "ai-2", "sea-1", "sea-2", "ai-3"]);
});

test("selection does not invent stories when the day is thin", () => {
  const ranked: RankedCluster[] = [
    { ...cluster({ id: "only", category: "sea" }), score: 12 },
  ];
  assert.equal(selectStories(ranked, slots).length, 1);
});
