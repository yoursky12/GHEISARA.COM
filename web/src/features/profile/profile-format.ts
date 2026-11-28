const compactNumber = new Intl.NumberFormat("id-ID", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const relativeTime = new Intl.RelativeTimeFormat("id", { numeric: "auto" });
const timeUnits = [
  ["year", 365 * 86400],
  ["month", 30 * 86400],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
  ["second", 1],
] as const;

export function formatProfileCount(count: number) {
  return compactNumber.format(count);
}

export function formatDraftTime(timestamp: string, now = Date.now()) {
  const elapsed = (Date.parse(timestamp) - now) / 1000;
  if (!Number.isFinite(elapsed)) return null;
  const [unit, seconds] =
    timeUnits.find(([, duration]) => Math.abs(elapsed) >= duration) ??
    timeUnits[timeUnits.length - 1];
  return relativeTime.format(Math.trunc(elapsed / seconds), unit);
}
