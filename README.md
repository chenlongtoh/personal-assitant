# Morning Brief

A personal morning news page. Each day, before 8:00 in Kuala Lumpur, it picks five stories, writes a short summary of each, and sends a notification to your phone that opens that day's page.

The split is two AI and tech stories, two Malaysia and Southeast Asia stories, and one world story. Stories carried by several outlets rank higher. Everything here stays on free tiers: Vercel Hobby, Groq's free plan, Gemini's free plan, ntfy, and Vercel Blob's free allowance.

## What you have to do yourself

The code is ready. These steps need your accounts, because the keys cannot live in a public repository.

1. Merge this project into `main`.
2. Create a free Groq key and a free Gemini key.
3. Install the ntfy app on your iPhone and Android phone, and subscribe to a long random topic.
4. Import the repository into Vercel on the Hobby plan.
5. Create a private Vercel Blob store and connect it to the project.
6. Set the environment variables below, then redeploy.
7. Call the cron address once, to confirm a brief appears and your phone buzzes.

Details for each step follow.

## Environment variables

Set these on Vercel (Production, and Preview if you want). For a trial on your computer, copy `.env.example` to `.env.local` and fill in the same names.

| Name | Required | Purpose |
| --- | --- | --- |
| `CRON_SECRET` | Yes | Password for the morning job. Vercel sends it automatically when the schedule runs. |
| `GROQ_API_KEY` | Yes, for summaries | Primary writer. Free key from Groq. |
| `GEMINI_API_KEY` | Recommended | Used only if Groq errors. The brief still publishes without either key. |
| `NTFY_TOPIC` | Yes, for the phone alert | The ntfy channel. Treat it like a password. |
| `SITE_URL` | Yes | Your site address, no trailing slash, so the notification opens the right page. |
| `BLOB_READ_WRITE_TOKEN` | Yes on Vercel | Added for you when you connect a Blob store. Leave empty on your computer. |
| `NTFY_SERVER` | No | Defaults to `https://ntfy.sh`. |
| `BLOB_ACCESS` | No | Leave unset for a private store. Set to `public` only if the store itself is public. |
| `GROQ_MODEL` | No | Defaults to `openai/gpt-oss-120b`. |
| `GEMINI_MODEL` | No | Defaults to `gemini-3.5-flash-lite`. |
| `BLOB_STORE_ID` | No | Also added by Vercel when the store is connected. You do not invent this. |

## 1. Groq key

Groq writes the two-sentence summaries. The free plan for `openai/gpt-oss-120b` allows about 8,000 tokens per minute, so the job sends headlines and a short snippet only, never the full article. One brief is a single request, which fits that limit. The request asks the model to reason as little as possible so the free quota is not spent on a long chain of thought.

1. Open [console.groq.com](https://console.groq.com) and create a free account.
2. Stay on the free plan. Do not upgrade to the paid Developer plan.
3. Open API Keys and create a key.
4. Put it in `GROQ_API_KEY`.

## 2. Gemini key

Gemini is the spare writer. If Groq is down, rate-limited, or returns junk, the job tries Gemini Flash-Lite once. If that fails too, the page still goes up, using the outlet's own excerpt and a plain "why it matters" line based on how many outlets carried the story.

1. Open [aistudio.google.com/apikey](https://aistudio.google.com/apikey) and sign in.
2. Create an API key on the free tier. Do not turn on billing.
3. Put it in `GEMINI_API_KEY`.

## 3. ntfy on your phones

ntfy is a free notification service with official apps for iPhone and Android. There is no account. The topic name is the only secret: anyone who knows it can read your alerts, so it must be long and random.

Create one, and use the same value in the app and in `NTFY_TOPIC`:

```bash
node -e "console.log('mb-' + require('crypto').randomBytes(18).toString('hex'))"
```

**iPhone**

1. Install [ntfy from the App Store](https://apps.apple.com/app/ntfy/id1625396347) (developer Philipp C. Heckel).
2. Allow notifications when the app asks.
3. Subscribe to the topic. Type the whole string, exactly, including the `mb-` prefix.
4. Leave the default server as `ntfy.sh`.

**Android**

1. Install [ntfy from the Play Store](https://play.google.com/store/apps/details?id=io.heckel.ntfy).
2. Allow notifications.
3. Subscribe to the same topic on `ntfy.sh`.

The alert title looks like `Your 8am brief: 5 stories`. The text is the top headline. Tapping it opens that day's page.

You can also add the site to your home screen. The project includes a web app manifest, so on iPhone use Share → Add to Home Screen, and on Android use the browser’s Add to Home screen action.

## 4. Put it on Vercel

1. Merge the project to `main` on GitHub.
2. Open [vercel.com/new](https://vercel.com/new) and import this repository.
3. Leave the framework as Next.js. The Hobby plan is the free one. Do not upgrade.
4. Deploy once so the project exists. You will redeploy after the variables are set.

The schedule is in `vercel.json`: `0 23 * * *`. That is 23:00 UTC, which is 7:00 in the morning in Kuala Lumpur (UTC+8, no daylight saving). On the Hobby plan Vercel may start the job at any minute during that hour, so it lands between 7:00 and 7:59 and the page is ready by 8:00. Cron runs only on the production deployment, not on preview links.

## 5. Storage

Digests have to survive after the function that wrote them shuts down. This project uses **Vercel Blob**, which is included on the Hobby plan (about 1 GB, far more than a year of these small JSON files). On your own computer, with no Blob token, the same code writes into a `.data` folder instead. That folder is only for local trials. On Vercel it is not used, and the job refuses to run until a Blob store is connected, so a morning run cannot silently vanish.

1. In the Vercel project, open the **Storage** tab.
2. Create storage and choose **Blob**.
3. Set access to **Private**. Give it a name such as `morning-brief`.
4. Connect it to this project. Include **Production**. Include Preview only if you want preview deploys to read the same store.
5. Vercel adds `BLOB_READ_WRITE_TOKEN` (and `BLOB_STORE_ID`) for you. Do not paste the token into GitHub.

If you accidentally create a public store, set `BLOB_ACCESS` to `public` so the code matches the store. Private is the right choice.

## 6. Variables and a second deploy

In the Vercel project, open **Settings → Environment Variables** and add:

- `CRON_SECRET` — at least 16 random characters. Generate one with:

  ```bash
  node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
  ```

- `GROQ_API_KEY`
- `GEMINI_API_KEY`
- `NTFY_TOPIC`
- `SITE_URL` — the production address, for example `https://morning-brief.vercel.app`, with no slash at the end.

`BLOB_READ_WRITE_TOKEN` should already be there from the store. Redeploy production after saving the variables (Deployments → the latest production deployment → Redeploy). Vercel only attaches new variables on a new deployment.

## 7. Test the morning job

You do not have to wait until 7am. Production cron calls `GET /api/cron` with your secret. From a terminal:

```bash
curl -sS -H "Authorization: Bearer YOUR_CRON_SECRET" https://YOUR-SITE.vercel.app/api/cron
```

A good reply looks like:

```json
{
  "ok": true,
  "date": "2026-10-09",
  "stories": 5,
  "aiProvider": "groq",
  "notified": true,
  "url": "https://YOUR-SITE.vercel.app/digest/2026-10-09"
}
```

Then:

- Open `url` on your phone. You should see five stories.
- Your phone should show the ntfy alert. Tap it and the same page should open.
- If `aiProvider` is `gemini`, Groq failed and the spare writer was used. If it is `none`, both failed and the page is built from ranked headlines and excerpts anyway.
- `notified: false` means the page was saved but the phone step did not complete. `notificationError` says why. A wrong topic or a missing notification permission are the usual causes.

Calling the address without the secret returns `401`. That is what you want. The route is public, and the secret is what stops strangers from burning your free quota.

In the Vercel project, **Settings → Cron Jobs** should list `/api/cron` at `0 23 * * *`.

## Try it on your computer

```bash
npm install
npm test
npm run generate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). `npm run generate` reads the live feeds and writes today's brief into `.data/digests`. Without `GROQ_API_KEY` and `GEMINI_API_KEY`, that run uses the no-summary path on purpose. A local run does not ping your phone, because the link would be `localhost`.

`npm test` checks duplicate merging, the 2/2/1 selection, the 36-hour window, and the Groq-then-Gemini fallback. `npm run lint` and `npm run build` are the same checks Vercel runs.

## Change the mix or the sources

Edit [`config/brief.ts`](config/brief.ts).

- `slots` is the shape of the brief. `count` is how many stories that section gets. If a section is thin that morning, the leftover slots fill from the strongest remaining stories.
- `feeds` is the source list: address, display name, and section (`ai-tech`, `sea`, or `world`).
- `windowHours` is how far back to look. It is 36, so a story has to have been published in roughly the last day and a half.

A feed that times out or returns an error is skipped. The run continues with the rest. Up to four quiet sources are named in the footer of that day's page.

Near-duplicate headlines are merged. The same story from three outlets counts once, and that repeat coverage is a strong ranking signal. A second copy from the same outlet does not count as extra coverage.

## How a morning run works

1. Fetch every feed in `config/brief.ts`, each with its own timeout.
2. Drop anything older than 36 hours.
3. Merge stories that are the same piece of news.
4. Rank them. Three or more outlets is a large boost. Newer stories win ties.
5. Pick the section quotas.
6. Ask Groq for a two-sentence summary and a one-line "why it matters". On failure, ask Gemini. On a second failure, publish excerpts.
7. Save the JSON to Blob (or `.data` locally).
8. Publish to your ntfy topic, with the day's page as the click link.

## Pages

- `/` is today's brief, or the newest one if today has not been written yet.
- `/archive` lists older mornings.
- `/digest/YYYY-MM-DD` is the page the notification opens.
- The layout is a single reading column, with a dark theme that follows your phone and a Light/Dark control that remembers your choice.

## When something goes wrong

| What you see | What to do |
| --- | --- |
| `Unauthorized` from `/api/cron` | `CRON_SECRET` on Vercel does not match the value you sent. Redeploy after changing it. |
| `Connect a Vercel Blob store` | The store is not connected to this project, or you have not redeployed since connecting it. |
| `No stories from the last 36 hours` | The feeds were down or blocked from Vercel's network. The response lists which sources failed. The previous day stays on the site. |
| Page is up, phone is quiet | Check `NTFY_TOPIC` matches the app exactly, notifications are allowed, and `notified` in the cron reply. `SITE_URL` must be the public https address. |
| Excerpts instead of summaries | Both keys failed or are missing. The cron reply's `aiProvider` will be `none`. Check the function log for the Groq or Gemini error. |
| Blob says the access does not match | The store is public and the code expects private, or the reverse. Set `BLOB_ACCESS` to match the store, then redeploy. |
| Cron never fires | It only runs in production, once during the 23:00 UTC hour. Preview deployments do not run it. |

## Security

This repository is public. Do not commit `.env`, `.env.local`, or a filled-in copy of the example file. The ntfy topic is not a username. It is the only thing standing between a stranger and your morning alert, so keep it unguessable and do not put it in the website, a screenshot, or a chat. `CRON_SECRET` is what stops other people from triggering a run.
