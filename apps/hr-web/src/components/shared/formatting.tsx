import { formatMoney } from "./money-format";
export { formatMoney, formatDecimalMoney } from "./money-format";
export function Money({ paise }: { paise: string }) {
  return <span className="money">₹{formatMoney(paise)}</span>;
}

// Date-only values ("2026-09-26") are calendar days, not UTC instants.
const toDate = (value: string | number | Date) =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value);
const dateFormat = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
});
const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
const relativeFormat = new Intl.RelativeTimeFormat(undefined, {
  numeric: "auto",
});
/** "26 Sept 2026" */
export const formatDate = (value?: string | number | Date | null) =>
  value ? dateFormat.format(toDate(value)) : "—";
/** "26 Sept 2026, 6:41 pm" */
export const formatDateTime = (value?: string | number | Date | null) =>
  value ? dateTimeFormat.format(toDate(value)) : "—";
/** "in 3 days", "2 hours ago" */
export function formatRelative(
  value: string | number | Date,
  now = Date.now(),
) {
  const seconds = (toDate(value).getTime() - now) / 1000;
  for (const [unit, size] of [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ] as const)
    if (Math.abs(seconds) >= size)
      return relativeFormat.format(Math.round(seconds / size), unit);
  return relativeFormat.format(0, "minute");
}
