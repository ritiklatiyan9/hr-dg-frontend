/** "in_progress" → "In progress"; dates, numbers and free text are left alone. */
export const humanize = (value: string) =>
  /^(?=.*[a-z])[a-z0-9]+([_.-][a-z0-9]+)*$/.test(value)
    ? value.charAt(0).toUpperCase() + value.slice(1).replace(/[_.-]/g, " ")
    : value;

/** Semantic tone for a status value, used to colour badges consistently. */
export function statusTone(value: string) {
  const v = value.toLowerCase().replace(/ /g, "_");
  return /^(approved|accepted|published|active|present|settled|completed|done|paid|resolved|delivered|verified|ready|inside|fresh|on_duty)$/.test(
    v,
  )
    ? "success"
    : /^(rejected|denied|failed|absent|overdue|blocked|expired|quarantined|outside|urgent|reversed)$/.test(
          v,
        )
      ? "danger"
      : /^(pending|late|early|sent_back|returned|pending_verification|awaiting_approval|unpaid|partially_paid|in_review|stale|high|missing)$/.test(
            v,
          )
        ? "warning"
        : /^(submitted|reviewed|field_duty|in_progress|open|scheduled|unread|processing|running|new)$/.test(
              v,
            )
          ? "info"
          : "neutral";
}
