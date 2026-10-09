import type { Digest } from "@/lib/types";
import { resolveSiteUrl } from "@/lib/site";

export function notificationTitle(count: number): string {
  const noun = count === 1 ? "story" : "stories";
  return `Your 8am brief: ${count} ${noun}`;
}

export function notificationBody(headline: string): string {
  const clean = headline.replace(/\s+/g, " ").trim();
  if (clean.length <= 110) return clean;
  const cut = clean.slice(0, 109);
  const space = cut.lastIndexOf(" ");
  const base = (space >= 80 ? cut.slice(0, space) : cut).trimEnd();
  const body = `${base}…`;
  return body.length <= 110 ? body : `${base.slice(0, 109).trimEnd()}…`;
}

export function digestUrl(date: string): string {
  return `${resolveSiteUrl()}/digest/${date}`;
}

function isLocalSite(url: string): boolean {
  return url.startsWith("http://localhost") || url.startsWith("http://127.0.0.1");
}

export async function sendBriefNotification(
  digest: Digest,
): Promise<{ sent: boolean; error?: string }> {
  const topic = process.env.NTFY_TOPIC?.trim();
  if (!topic) return { sent: false, error: "NTFY_TOPIC is not set" };

  const count = digest.stories.length;
  if (count === 0) return { sent: false, error: "No stories to announce" };

  const site = resolveSiteUrl();
  if (isLocalSite(site)) {
    return {
      sent: false,
      error: "SITE_URL is local, so the phone notification was skipped",
    };
  }

  const server = (process.env.NTFY_SERVER?.trim() || "https://ntfy.sh").replace(
    /\/$/,
    "",
  );
  const title = notificationTitle(count);
  const body = notificationBody(digest.stories[0]?.title ?? "Today's brief is ready");
  const click = digestUrl(digest.date);

  try {
    const response = await fetch(`${server}/${encodeURIComponent(topic)}`, {
      method: "POST",
      headers: {
        Title: title,
        Click: click,
        Tags: "newspaper",
        Priority: "4",
        "Content-Type": "text/plain; charset=utf-8",
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      return { sent: false, error: `ntfy responded ${response.status}` };
    }
    return { sent: true };
  } catch (error) {
    return {
      sent: false,
      error: error instanceof Error ? error.message : "ntfy request failed",
    };
  }
}
