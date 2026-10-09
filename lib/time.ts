import { briefConfig } from "@/config/brief";

export function klDate(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: briefConfig.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function isDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  return (
    utc.getUTCFullYear() === year &&
    utc.getUTCMonth() === month - 1 &&
    utc.getUTCDate() === day
  );
}

export function formatBriefDate(date: string): string {
  if (!isDateKey(date)) return date;
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatGeneratedAt(iso: string): string {
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return "";
  const clock = new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hourCycle: "h12",
    timeZone: briefConfig.timezone,
  }).format(value);
  return clock.replace(/\s/g, " ").toLowerCase();
}

export function formatAge(iso: string, now: Date): string {
  const published = new Date(iso).getTime();
  if (Number.isNaN(published)) return "";
  const hours = Math.max(0, Math.round((now.getTime() - published) / 3_600_000));
  if (hours < 1) return "Just published";
  if (hours === 1) return "1 hour ago";
  if (hours < 48) return `${hours} hours ago`;
  return "Earlier this week";
}
