import { truncate } from "@/lib/text";
import type { AiProvider } from "@/lib/types";

export const GROQ_MODEL = "openai/gpt-oss-120b";
export const GEMINI_MODEL = "gemini-3.5-flash-lite";

const AI_TIMEOUT_MS = 15_000;
const GROQ_MAX_COMPLETION_TOKENS = 900;

export interface SummaryInput {
  id: string;
  category: string;
  title: string;
  snippet: string;
}

export interface StorySummary {
  summary: string;
  whyItMatters: string;
}

export interface SummaryResult {
  provider: AiProvider;
  byId: Map<string, StorySummary>;
}

type Completer = () => Promise<string>;

export function buildSummaryPrompt(stories: SummaryInput[]): string {
  const body = stories
    .map((story, index) =>
      [
        `Story ${index + 1}`,
        `id: ${story.id}`,
        `section: ${story.category}`,
        `headline: ${story.title}`,
        `snippet: ${truncate(story.snippet, 280) || "(no snippet)"}`,
      ].join("\n"),
    )
    .join("\n\n");

  return [
    "You write a personal morning news brief for a reader in Malaysia who follows AI, technology, Southeast Asia, and world politics.",
    "Use only the headline and snippet. Do not invent facts, numbers, or quotes.",
    "For each story write:",
    "- summary: exactly two factual sentences",
    "- whyItMatters: one sentence under 140 characters, specific to this reader",
    'Return a JSON object of the form {"stories":[{"id":"...","summary":"...","whyItMatters":"..."}]} with one entry per story id.',
    "",
    body,
  ].join("\n");
}

function tidy(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const clean = value.replace(/\s+/g, " ").trim();
  if (!clean) return null;
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  const base = space > max * 0.6 ? cut.slice(0, space) : cut;
  return `${base.trimEnd()}…`;
}

function parseJsonObject(raw: string): Record<string, unknown> | null {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  const candidates = [cleaned];
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end > start) candidates.push(cleaned.slice(start, end + 1));

  for (const candidate of candidates) {
    try {
      const value = JSON.parse(candidate) as unknown;
      if (value && typeof value === "object" && !Array.isArray(value)) {
        return value as Record<string, unknown>;
      }
    } catch {
      continue;
    }
  }
  return null;
}

export function parseSummaryPayload(raw: string): Map<string, StorySummary> | null {
  const data = parseJsonObject(raw);
  if (!data) return null;
  const stories = Array.isArray(data.stories) ? data.stories : null;
  if (!stories) return null;

  const map = new Map<string, StorySummary>();
  for (const entry of stories) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id.trim() : "";
    const summary = tidy(record.summary, 500);
    const whyItMatters = tidy(record.whyItMatters, 180);
    if (!id || !summary || !whyItMatters) continue;
    map.set(id, { summary, whyItMatters });
  }
  return map;
}

async function readError(response: Response): Promise<string> {
  try {
    return (await response.text()).replace(/\s+/g, " ").slice(0, 180);
  } catch {
    return "";
  }
}

export async function completeGroq(prompt: string): Promise<string> {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) throw new Error("GROQ_API_KEY is not set");

  const model = process.env.GROQ_MODEL?.trim() || GROQ_MODEL;
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      reasoning_effort: "low",
      include_reasoning: false,
      max_completion_tokens: GROQ_MAX_COMPLETION_TOKENS,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Reply with one JSON object only." },
        { role: "user", content: prompt },
      ],
    }),
    signal: AbortSignal.timeout(AI_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Groq HTTP ${response.status}: ${await readError(response)}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{
      finish_reason?: string;
      message?: { content?: string | null };
    }>;
  };
  const choice = payload.choices?.[0];
  const content = choice?.message?.content?.trim();
  if (!content) throw new Error("Groq returned an empty summary");
  if (choice?.finish_reason === "length") {
    throw new Error("Groq hit the token cap before finishing the JSON");
  }
  return content;
}

export async function completeGemini(prompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new Error("GEMINI_API_KEY is not set");

  const model = process.env.GEMINI_MODEL?.trim() || GEMINI_MODEL;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 800,
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(AI_TIMEOUT_MS),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini HTTP ${response.status}: ${await readError(response)}`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string; thought?: boolean }> };
    }>;
  };
  const parts = payload.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .filter((part) => !part.thought && part.text)
    .map((part) => part.text)
    .join("")
    .trim();
  if (!text) throw new Error("Gemini returned an empty summary");
  return text;
}

async function tryProvider(
  provider: Exclude<AiProvider, "none">,
  run: Completer,
): Promise<Map<string, StorySummary> | null> {
  try {
    const raw = await run();
    const parsed = parseSummaryPayload(raw);
    if (!parsed || parsed.size === 0) {
      throw new Error(`${provider} returned no usable summaries`);
    }
    return parsed;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.warn(`[morning-brief] ${provider} failed: ${message}`);
    return null;
  }
}

export async function summarizeStories(
  stories: SummaryInput[],
  runners: { groq: Completer; gemini: Completer } = {
    groq: () => completeGroq(buildSummaryPrompt(stories)),
    gemini: () => completeGemini(buildSummaryPrompt(stories)),
  },
): Promise<SummaryResult> {
  if (stories.length === 0) return { provider: "none", byId: new Map() };

  const groq = await tryProvider("groq", runners.groq);
  if (groq) return { provider: "groq", byId: groq };

  const gemini = await tryProvider("gemini", runners.gemini);
  if (gemini) return { provider: "gemini", byId: gemini };

  return { provider: "none", byId: new Map() };
}
