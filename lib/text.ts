export function stripHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) => {
      const point = Number(code);
      return point > 0 && point < 65536 ? String.fromCharCode(point) : " ";
    })
    .replace(/\s+/g, " ")
    .trim();
}

export function truncate(value: string, max: number): string {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const space = cut.lastIndexOf(" ");
  const base = space > max * 0.6 ? cut.slice(0, space) : cut;
  return `${base.trimEnd()}…`;
}

export function cleanHeadline(title: string, source: string): string {
  const collapsed = title.replace(/\s+/g, " ").trim();
  const withoutKicker = collapsed.replace(
    /^(breaking|exclusive|update|watch|live)\s*:\s*/i,
    "",
  );
  const escaped = source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return withoutKicker
    .replace(new RegExp(`\\s+[\\-|–—|:]\\s+${escaped}\\s*$`, "i"), "")
    .trim();
}

export function canonicalUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      const name = key.toLowerCase();
      if (
        name.startsWith("utm_") ||
        name === "fbclid" ||
        name === "ref" ||
        name === "ref_src"
      ) {
        url.searchParams.delete(key);
      }
    }
    url.hostname = url.hostname.replace(/^www\./, "");
    return url.toString();
  } catch {
    return value.trim();
  }
}
