export type CategoryId = "ai-tech" | "sea" | "world";

export type AiProvider = "groq" | "gemini" | "none";

export interface FeedConfig {
  url: string;
  source: string;
  category: CategoryId;
}

export interface Slot {
  category: CategoryId;
  label: string;
  count: number;
}

export interface RawItem {
  title: string;
  url: string;
  source: string;
  category: CategoryId;
  publishedAt: string;
  snippet: string;
}

export interface StorySource {
  name: string;
  url: string;
  category: CategoryId;
}

export interface Cluster {
  id: string;
  title: string;
  url: string;
  snippet: string;
  publishedAt: string;
  category: CategoryId;
  sources: StorySource[];
  titles: string[];
}

export interface RankedCluster extends Cluster {
  score: number;
}

export interface DigestStory {
  id: string;
  title: string;
  url: string;
  source: string;
  sources: { name: string; url: string }[];
  category: CategoryId;
  categoryLabel: string;
  publishedAt: string;
  summary: string | null;
  whyItMatters: string;
  excerpt: string | null;
  coverage: number;
}

export interface FeedError {
  source: string;
  url: string;
  message: string;
}

export interface Digest {
  date: string;
  generatedAt: string;
  timezone: string;
  aiProvider: AiProvider;
  stories: DigestStory[];
  feedErrors: FeedError[];
}

export interface DigestIndexEntry {
  date: string;
  generatedAt: string;
  headline: string;
  storyCount: number;
  aiProvider: AiProvider;
}
