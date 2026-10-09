import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { get, put } from "@vercel/blob";

import type { AiProvider, Digest, DigestIndexEntry } from "@/lib/types";

const PREFIX = "digests";
const INDEX_NAME = "index.json";
const LOCAL_DIR = path.join(process.cwd(), ".data", PREFIX);

export function blobConfigured(): boolean {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN?.trim() || process.env.BLOB_STORE_ID?.trim(),
  );
}

function blobAccess(): "public" | "private" {
  return process.env.BLOB_ACCESS === "public" ? "public" : "private";
}

function blobEnabled(): boolean {
  if (process.env.STORAGE === "file") return false;
  return blobConfigured();
}

function digestPath(date: string): string {
  return `${PREFIX}/${date}.json`;
}

function isDigest(value: unknown): value is Digest {
  if (!value || typeof value !== "object") return false;
  const record = value as Digest;
  return typeof record.date === "string" && Array.isArray(record.stories);
}

function isProvider(value: unknown): value is AiProvider {
  return value === "groq" || value === "gemini" || value === "none";
}

function isIndexEntry(value: unknown): value is DigestIndexEntry {
  if (!value || typeof value !== "object") return false;
  const record = value as DigestIndexEntry;
  return (
    typeof record.date === "string" &&
    typeof record.headline === "string" &&
    typeof record.storyCount === "number" &&
    isProvider(record.aiProvider)
  );
}

function indexFromDigest(digest: Digest): DigestIndexEntry {
  return {
    date: digest.date,
    generatedAt: digest.generatedAt,
    headline: digest.stories[0]?.title ?? "Morning brief",
    storyCount: digest.stories.length,
    aiProvider: digest.aiProvider,
  };
}

async function readBlobText(pathname: string): Promise<string | null> {
  const result = await get(pathname, { access: blobAccess(), useCache: false });
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  return new Response(result.stream).text();
}

async function writeBlobText(pathname: string, body: string): Promise<void> {
  await put(pathname, body, {
    access: blobAccess(),
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 60,
  });
}

async function readLocalJson(file: string): Promise<unknown | null> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as unknown;
  } catch {
    return null;
  }
}

async function readIndex(): Promise<DigestIndexEntry[] | null> {
  const raw = blobEnabled()
    ? await readBlobText(`${PREFIX}/${INDEX_NAME}`)
    : await readLocalJson(path.join(LOCAL_DIR, INDEX_NAME)).then((value) =>
        value === null ? null : JSON.stringify(value),
      );
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { entries?: unknown };
    if (!Array.isArray(parsed.entries)) return null;
    return parsed.entries.filter(isIndexEntry);
  } catch {
    return null;
  }
}

async function writeIndex(entries: DigestIndexEntry[]): Promise<void> {
  const body = JSON.stringify({ entries });
  if (blobEnabled()) {
    await writeBlobText(`${PREFIX}/${INDEX_NAME}`, body);
    return;
  }
  await mkdir(LOCAL_DIR, { recursive: true });
  await writeFile(path.join(LOCAL_DIR, INDEX_NAME), body);
}

async function scanLocalEntries(): Promise<DigestIndexEntry[]> {
  let names: string[] = [];
  try {
    names = await readdir(LOCAL_DIR);
  } catch {
    return [];
  }
  const entries: DigestIndexEntry[] = [];
  for (const name of names) {
    if (!/^\d{4}-\d{2}-\d{2}\.json$/.test(name)) continue;
    const digest = await readLocalJson(path.join(LOCAL_DIR, name));
    if (isDigest(digest)) entries.push(indexFromDigest(digest));
  }
  return entries.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function saveDigest(digest: Digest): Promise<void> {
  const body = JSON.stringify(digest);
  if (blobEnabled()) {
    await writeBlobText(digestPath(digest.date), body);
  } else {
    await mkdir(LOCAL_DIR, { recursive: true });
    await writeFile(path.join(LOCAL_DIR, `${digest.date}.json`), body);
  }

  const existing = (await readIndex()) ?? [];
  const next = [
    indexFromDigest(digest),
    ...existing.filter((entry) => entry.date !== digest.date),
  ].sort((a, b) => (a.date < b.date ? 1 : -1));
  await writeIndex(next);
}

export async function getDigest(date: string): Promise<Digest | null> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const raw = blobEnabled()
    ? await readBlobText(digestPath(date))
    : await readLocalJson(path.join(LOCAL_DIR, `${date}.json`)).then((value) =>
        value === null ? null : JSON.stringify(value),
      );
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isDigest(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function listDigestEntries(): Promise<DigestIndexEntry[]> {
  const indexed = await readIndex();
  if (indexed && indexed.length > 0) return indexed;
  if (blobEnabled()) return indexed ?? [];
  return scanLocalEntries();
}

export async function getLatestDigest(): Promise<Digest | null> {
  const entries = await listDigestEntries();
  if (entries.length === 0) return null;
  return getDigest(entries[0].date);
}
