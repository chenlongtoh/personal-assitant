import assert from "node:assert/strict";
import { test } from "node:test";

import { parseSummaryPayload, summarizeStories, type SummaryInput } from "../lib/ai";

const stories: SummaryInput[] = [
  {
    id: "alpha",
    category: "AI & tech",
    title: "OpenAI releases a new model",
    snippet: "The model is available today.",
  },
  {
    id: "beta",
    category: "World",
    title: "Talks resume",
    snippet: "Negotiators returned to the table.",
  },
];

function payload(ids: string[]) {
  return JSON.stringify({
    stories: ids.map((id) => ({
      id,
      summary: `${id} summary sentence one. Sentence two follows.`,
      whyItMatters: `${id} matters to a reader in Malaysia.`,
    })),
  });
}

test("a fenced JSON reply still parses", () => {
  const parsed = parseSummaryPayload(
    "```json\n" + payload(["alpha"]) + "\n```",
  );
  assert.equal(parsed?.get("alpha")?.summary.includes("sentence one"), true);
});

test("invalid JSON does not parse", () => {
  assert.equal(parseSummaryPayload("not json at all"), null);
});

test("Groq success does not call Gemini", async () => {
  let geminiCalls = 0;
  const result = await summarizeStories(stories, {
    groq: async () => payload(["alpha", "beta"]),
    gemini: async () => {
      geminiCalls += 1;
      return payload(["alpha", "beta"]);
    },
  });

  assert.equal(result.provider, "groq");
  assert.equal(geminiCalls, 0);
  assert.equal(result.byId.size, 2);
});

test("a Groq error falls through to Gemini", async () => {
  const result = await summarizeStories(stories, {
    groq: async () => {
      throw new Error("rate limit");
    },
    gemini: async () => payload(["alpha"]),
  });

  assert.equal(result.provider, "gemini");
  assert.equal(result.byId.has("alpha"), true);
  assert.equal(result.byId.has("beta"), false);
});

test("unusable Groq JSON falls through to Gemini", async () => {
  const result = await summarizeStories(stories, {
    groq: async () => "here is some prose, not JSON",
    gemini: async () => payload(["beta"]),
  });

  assert.equal(result.provider, "gemini");
  assert.equal(result.byId.has("beta"), true);
});

test("both providers failing still returns an empty result", async () => {
  const result = await summarizeStories(stories, {
    groq: async () => {
      throw new Error("down");
    },
    gemini: async () => {
      throw new Error("also down");
    },
  });

  assert.equal(result.provider, "none");
  assert.equal(result.byId.size, 0);
});
