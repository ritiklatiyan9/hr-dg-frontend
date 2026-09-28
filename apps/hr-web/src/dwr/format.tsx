import { useContext } from "react";
import { Badge } from "@/components/ui/badge";
import { Preferences, useT } from "../ui";
import type { DayStatus } from "./api";
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("") || "?";
const shiftDay = (ymd: string, days: number) => {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
export function useLocale() {
  return useContext(Preferences).language === "hi" ? "hi-IN" : "en-IN";
}
/** "Today", "Yesterday" or "Wed, 23 Sep" for a site work date. */
export function useDayLabel(today: string) {
  const t = useT(),
    locale = useLocale();
  return (ymd: string) =>
    ymd === today
      ? t("Today", "आज")
      : ymd === shiftDay(today, -1)
        ? t("Yesterday", "कल")
        : new Date(`${ymd}T00:00:00Z`).toLocaleDateString(locale, {
            weekday: "short",
            day: "numeric",
            month: "short",
            timeZone: "UTC",
          });
}
export function useClock(timezone: string) {
  const locale = useLocale();
  return (iso: string) =>
    new Date(iso).toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: timezone,
    });
}
export function monthOptions(today: string, locale: string, count = 12) {
  const [y, m] = today.split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(y!, m! - 1 - i, 1));
    return {
      value: d.toISOString().slice(0, 7),
      label: d.toLocaleDateString(locale, {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }),
    };
  });
}
const palette = [
  "text-emerald-700 dark:text-emerald-300",
  "text-sky-700 dark:text-sky-300",
  "text-violet-700 dark:text-violet-300",
  "text-amber-700 dark:text-amber-300",
  "text-rose-700 dark:text-rose-300",
  "text-teal-700 dark:text-teal-300",
];
/** Stable per-person name colour, as group chats do. */
export const authorColor = (userId: string) =>
  palette[
    [...userId].reduce((sum, ch) => (sum * 31 + ch.charCodeAt(0)) >>> 0, 7) %
      palette.length
  ]!;
export function DwrStatus({ day }: { day: DayStatus | null | undefined }) {
  const t = useT();
  const status = day?.report?.status;
  if (status === "approved")
    return <Badge variant="success">{t("Approved", "स्वीकृत")}</Badge>;
  if (status === "submitted")
    return <Badge variant="info">{t("Submitted", "भेजी गई")}</Badge>;
  if (status === "returned")
    return <Badge variant="warning">{t("Returned", "वापस भेजी")}</Badge>;
  if (preparingNow(day))
    return (
      <Badge variant="secondary">{t("Preparing", "तैयार हो रही है")}</Badge>
    );
  if (status === "draft")
    return (
      <Badge variant="outline">{t("Draft ready", "ड्राफ़्ट तैयार")}</Badge>
    );
  if (day?.job?.status === "queued")
    return <Badge variant="outline">{t("Scheduled", "निर्धारित")}</Badge>;
  return null;
}
/** Running, or queued and due now (an explicit request); not the quiet-period wait. */
export const preparingNow = (day: DayStatus | null | undefined) =>
  day?.job?.status === "running" ||
  (day?.job?.status === "queued" &&
    !!day.job.dueAt &&
    Date.parse(day.job.dueAt) <= Date.now() + 5000);
