import assert from "node:assert/strict";
import { test } from "node:test";

import { isAuthorizedCron } from "../lib/auth";
import { notificationBody, notificationTitle } from "../lib/notify";

test("the notification title stays short enough to read on a lock screen", () => {
  const title = notificationTitle(5);
  assert.equal(title, "Your 8am brief: 5 stories");
  assert.ok(title.length <= 35);
  assert.equal(notificationTitle(1), "Your 8am brief: 1 story");
});

test("the notification body stays within the visible length", () => {
  const short = notificationBody("OpenAI releases a new model");
  assert.equal(short, "OpenAI releases a new model");

  const long = notificationBody(`${"A very long headline about several markets ".repeat(6)}end`);
  assert.ok(long.length <= 110);
  assert.ok(long.endsWith("…"));
});

test("the cron route rejects a missing or wrong secret", () => {
  const previous = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "correct-horse-battery";

  assert.equal(isAuthorizedCron(new Request("https://example.com/api/cron")), false);
  assert.equal(
    isAuthorizedCron(
      new Request("https://example.com/api/cron", {
        headers: { authorization: "Bearer wrong" },
      }),
    ),
    false,
  );
  assert.equal(
    isAuthorizedCron(
      new Request("https://example.com/api/cron", {
        headers: { authorization: "Bearer correct-horse-battery" },
      }),
    ),
    true,
  );

  delete process.env.CRON_SECRET;
  assert.equal(
    isAuthorizedCron(
      new Request("https://example.com/api/cron", {
        headers: { authorization: "Bearer correct-horse-battery" },
      }),
    ),
    false,
  );

  if (previous === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = previous;
});
