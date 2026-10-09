import { existsSync, readFileSync } from "node:fs";

import { createDigest } from "../lib/digest";

function loadEnvFile(file: string) {
  if (!existsSync(file)) return;
  const text = readFileSync(file, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

async function main() {
  const result = await createDigest();
  const { digest, notification, url } = result;

  console.log(
    `\nSaved ${digest.date} · ${digest.stories.length} stories · summaries: ${digest.aiProvider}`,
  );
  for (const [index, story] of digest.stories.entries()) {
    console.log(`\n${index + 1}. [${story.categoryLabel}] ${story.title}`);
    console.log(
      `   ${story.source} · ${story.coverage} outlet${story.coverage === 1 ? "" : "s"}`,
    );
    console.log(`   ${story.url}`);
  }

  if (digest.feedErrors.length > 0) {
    console.log("\nFeeds that did not respond:");
    for (const error of digest.feedErrors) {
      console.log(`- ${error.source}: ${error.message}`);
    }
  }

  console.log(
    `\nNotification: ${notification.sent ? "sent" : notification.error ?? "not sent"}`,
  );
  console.log(`Open: ${url}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Digest failed";
  console.error(message);
  process.exit(1);
});
