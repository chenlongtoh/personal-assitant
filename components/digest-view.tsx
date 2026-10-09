import { formatAge, formatBriefDate, formatGeneratedAt, klDate } from "@/lib/time";
import type { Digest, DigestIndexEntry } from "@/lib/types";

export function DigestSkeleton() {
  return (
    <div className="skeleton" role="status">
      <span className="sr-only">Loading the brief.</span>
      <div className="sk-line wide" />
      <div className="sk-line" />
      <div className="sk-block" />
      <div className="sk-block" />
    </div>
  );
}

export function EmptyBrief() {
  return (
    <section className="empty">
      <p className="kicker">Kuala Lumpur</p>
      <h1>Your brief has not been assembled yet.</h1>
      <p>
        The morning run happens during the 7:00 hour and is on the page by
        8:00. After you deploy, you can also create today’s edition on demand.
      </p>
    </section>
  );
}

export function DigestView({
  digest,
  now,
  latest = false,
}: {
  digest: Digest;
  now: Date;
  latest?: boolean;
}) {
  const today = klDate(now);
  const isToday = digest.date === today;
  const kicker = isToday ? "Today" : latest ? "Latest brief" : "Archive";
  const assembled = formatGeneratedAt(digest.generatedAt);

  return (
    <article>
      <p className="kicker">{kicker}</p>
      <h1 className="brief-title">{formatBriefDate(digest.date)}</h1>
      <p className="lede">
        {digest.stories.length}{" "}
        {digest.stories.length === 1 ? "story" : "stories"} from the last day
        and a half, across AI, Southeast Asia, and the world.
      </p>
      {digest.aiProvider === "none" ? (
        <p className="notice">
          Summaries were unavailable this morning. These are short excerpts
          from the original reports. The “why it matters” line is based on how
          widely each story was covered.
        </p>
      ) : null}
      <ol className="stories">
        {digest.stories.map((story, index) => {
          const others = story.sources.slice(1);
          return (
            <li key={story.id} className="story">
              <div className="story-kicker">
                <span className="story-index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="story-section">{story.categoryLabel}</span>
              </div>
              <h2>
                <a href={story.url} target="_blank" rel="noopener noreferrer">
                  {story.title}
                </a>
              </h2>
              {story.summary ? (
                <p className="summary">{story.summary}</p>
              ) : story.excerpt ? (
                <p className="excerpt">{story.excerpt}</p>
              ) : null}
              <p className="why">
                <span>Why it matters</span>
                {story.whyItMatters}
              </p>
              <p className="meta">
                <span>{story.source}</span>
                {others.length > 0 ? (
                  <span>
                    Also in{" "}
                    {others.map((source, sourceIndex) => (
                      <span key={`${source.name}-${source.url}`}>
                        {sourceIndex > 0 ? ", " : ""}
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {source.name}
                        </a>
                      </span>
                    ))}
                  </span>
                ) : null}
                <time dateTime={story.publishedAt}>
                  {formatAge(story.publishedAt, now)}
                </time>
              </p>
            </li>
          );
        })}
      </ol>
      <p className="brief-foot">
        {assembled ? `Assembled ${assembled} MYT.` : null}{" "}
        {digest.feedErrors.length > 0
          ? `${digest.feedErrors.length} ${digest.feedErrors.length === 1 ? "source was" : "sources were"} quiet: ${digest.feedErrors
              .slice(0, 4)
              .map((error) => error.source)
              .join(", ")}.`
          : "All watched sources responded."}
      </p>
    </article>
  );
}

export function ArchiveList({ entries }: { entries: DigestIndexEntry[] }) {
  if (entries.length === 0) {
    return (
      <section className="empty">
        <p className="kicker">Archive</p>
        <h1>No mornings saved yet.</h1>
        <p>Each brief stays here after it is assembled, one page per day.</p>
      </section>
    );
  }

  return (
    <section>
      <p className="kicker">Archive</p>
      <h1 className="brief-title">Past mornings</h1>
      <ol className="archive-list">
        {entries.map((entry) => (
          <li key={entry.date}>
            <a href={`/digest/${entry.date}`}>
              <p className="archive-date">{formatBriefDate(entry.date)}</p>
              <h2>{entry.headline}</h2>
              <p className="archive-count">
                {entry.storyCount}{" "}
                {entry.storyCount === 1 ? "story" : "stories"}
              </p>
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}
