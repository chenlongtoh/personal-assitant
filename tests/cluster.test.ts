import assert from "node:assert/strict";
import { test } from "node:test";

import { areNearDuplicates, clusterItems } from "../lib/cluster";
import { mergeFeedResults } from "../lib/feeds";
import type { RawItem } from "../lib/types";

function item(overrides: Partial<RawItem> = {}): RawItem {
  return {
    title: "OpenAI releases GPT-5 to the public",
    url: "https://www.techcrunch.com/story?utm_source=rss",
    source: "TechCrunch",
    category: "ai-tech",
    publishedAt: "2026-10-08T12:00:00.000Z",
    snippet: "OpenAI released the model to the public.",
    ...overrides,
  };
}

test("near-duplicate headlines about the same launch collapse", () => {
  assert.equal(
    areNearDuplicates(
      "OpenAI releases GPT-5!",
      "OpenAI releases GPT-5",
    ),
    true,
  );
  assert.equal(
    areNearDuplicates(
      "OpenAI releases GPT-5 to the public",
      "OpenAI launches GPT-5 for the public",
    ),
    true,
  );
});

test("similar templates about different countries stay separate", () => {
  assert.equal(
    areNearDuplicates(
      "Malaysia announces new digital tax plan",
      "Singapore announces new digital tax plan",
    ),
    false,
  );
});

test("different product numbers stay separate", () => {
  assert.equal(
    areNearDuplicates("Apple unveils iPhone 17", "Apple unveils iPhone 16"),
    false,
  );
});

test("the same story from three outlets becomes one cluster", () => {
  const clusters = clusterItems([
    item(),
    item({
      title: "OpenAI launches GPT-5 for the public",
      url: "https://www.theverge.com/openai-gpt-5",
      source: "The Verge",
      publishedAt: "2026-10-08T13:00:00.000Z",
    }),
    item({
      title: "OpenAI releases GPT-5 to the public today",
      url: "https://arstechnica.com/openai-gpt-5",
      source: "Ars Technica",
      publishedAt: "2026-10-08T14:00:00.000Z",
      snippet: "A longer snippet from Ars about the public release of the model today.",
    }),
  ]);

  assert.equal(clusters.length, 1);
  assert.equal(clusters[0].sources.length, 3);
  assert.deepEqual(
    clusters[0].sources.map((source) => source.name).sort(),
    ["Ars Technica", "TechCrunch", "The Verge"],
  );
});

test("repeat coverage from the same outlet counts once", () => {
  const clusters = clusterItems([
    item(),
    item({
      title: "OpenAI releases GPT-5 to the public, updated",
      url: "https://techcrunch.com/story-update",
      publishedAt: "2026-10-08T15:00:00.000Z",
    }),
  ]);

  assert.equal(clusters.length, 1);
  assert.equal(clusters[0].sources.length, 1);
});

test("the same canonical link merges even when the headline differs", () => {
  const clusters = clusterItems([
    item({ title: "A short headline", url: "https://example.com/a?utm_medium=rss" }),
    item({
      title: "Completely different wording for the same page",
      url: "https://www.example.com/a",
      source: "The Verge",
    }),
  ]);

  assert.equal(clusters.length, 1);
  assert.equal(clusters[0].sources.length, 2);
});

test("a failed feed does not drop stories from the others", () => {
  const merged = mergeFeedResults([
    {
      source: "BBC",
      url: "https://feeds.bbci.co.uk/news/world/rss.xml",
      items: [],
      error: "HTTP 503",
    },
    {
      source: "TechCrunch",
      url: "https://techcrunch.com/feed",
      items: [item()],
    },
  ]);

  assert.equal(merged.items.length, 1);
  assert.equal(merged.errors.length, 1);
  assert.equal(merged.errors[0].source, "BBC");
});
