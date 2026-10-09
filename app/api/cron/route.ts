import { isAuthorizedCron } from "@/lib/auth";
import { createDigest } from "@/lib/digest";

export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await createDigest();
    return Response.json({
      ok: true,
      date: result.digest.date,
      stories: result.digest.stories.length,
      aiProvider: result.digest.aiProvider,
      feedErrors: result.digest.feedErrors.map((error) => ({
        source: error.source,
        message: error.message,
      })),
      notified: result.notification.sent,
      notificationError: result.notification.error ?? null,
      url: result.url,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Digest failed";
    console.error(`[morning-brief] ${message}`);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
