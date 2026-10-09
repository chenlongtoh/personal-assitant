import type { CategoryId, FeedConfig, Slot } from "@/lib/types";

/**
 * Editorial settings for the morning brief.
 * Change `slots` to adjust how many stories each section gets.
 * Add or remove feeds without touching the rest of the app.
 * One feed failing is ignored; the others still run.
 */
export const briefConfig: {
  timezone: string;
  windowHours: number;
  slots: readonly Slot[];
  feeds: readonly FeedConfig[];
} = {
  timezone: "Asia/Kuala_Lumpur",
  windowHours: 36,
  slots: [
    { category: "ai-tech", label: "AI & tech", count: 2 },
    { category: "sea", label: "Malaysia & Southeast Asia", count: 2 },
    { category: "world", label: "World", count: 1 },
  ],
  feeds: [
    {
      url: "https://techcrunch.com/category/artificial-intelligence/feed/",
      source: "TechCrunch",
      category: "ai-tech",
    },
    {
      url: "https://www.technologyreview.com/feed/",
      source: "MIT Technology Review",
      category: "ai-tech",
    },
    {
      url: "https://feeds.arstechnica.com/arstechnica/index",
      source: "Ars Technica",
      category: "ai-tech",
    },
    {
      url: "https://www.theverge.com/rss/index.xml",
      source: "The Verge",
      category: "ai-tech",
    },
    {
      url: "https://hnrss.org/frontpage?points=300",
      source: "Hacker News",
      category: "ai-tech",
    },
    {
      url: "https://simonwillison.net/atom/everything/",
      source: "Simon Willison",
      category: "ai-tech",
    },
    {
      url: "https://openai.com/news/rss.xml",
      source: "OpenAI",
      category: "ai-tech",
    },
    {
      url: "https://blog.google/technology/ai/rss/",
      source: "Google",
      category: "ai-tech",
    },
    {
      url: "https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml&category=6511",
      source: "CNA",
      category: "sea",
    },
    {
      url: "https://www.malaymail.com/feed/rss/malaysia",
      source: "Malay Mail",
      category: "sea",
    },
    {
      url: "https://www.freemalaysiatoday.com/feed/",
      source: "Free Malaysia Today",
      category: "sea",
    },
    {
      url: "https://www.nst.com.my/feed",
      source: "New Straits Times",
      category: "sea",
    },
    {
      url: "https://thediplomat.com/regions/southeast-asia/feed/",
      source: "The Diplomat",
      category: "sea",
    },
    {
      url: "https://www.techinasia.com/feed",
      source: "Tech in Asia",
      category: "sea",
    },
    {
      url: "https://e27.co/feed/",
      source: "e27",
      category: "sea",
    },
    {
      url: "https://feeds.bbci.co.uk/news/world/rss.xml",
      source: "BBC",
      category: "world",
    },
    {
      url: "https://www.aljazeera.com/xml/rss/all.xml",
      source: "Al Jazeera",
      category: "world",
    },
    {
      url: "https://www.theguardian.com/world/rss",
      source: "The Guardian",
      category: "world",
    },
    {
      url: "https://feeds.npr.org/1004/rss.xml",
      source: "NPR",
      category: "world",
    },
    {
      url: "https://www.scmp.com/rss/91/feed",
      source: "SCMP",
      category: "world",
    },
    {
      url: "https://www.foreignaffairs.com/rss.xml",
      source: "Foreign Affairs",
      category: "world",
    },
  ],
};

export function labelFor(category: CategoryId): string {
  return (
    briefConfig.slots.find((slot) => slot.category === category)?.label ??
    category
  );
}

export function storyTarget(): number {
  return briefConfig.slots.reduce((sum, slot) => sum + slot.count, 0);
}
