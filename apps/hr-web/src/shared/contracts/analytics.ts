import { z } from "zod";

export const analyticsTools = [
  "getWorkforceSummary",
  "getAttendanceSummary",
  "getDwrCompliance",
  "getApprovalBacklog",
  "getTaskBacklog",
  "getHrSummary",
  "getPayrollSummary",
] as const;
export const analyticsInput = z
  .object({
    from: z.iso.date(),
    to: z.iso.date(),
    siteIds: z.array(z.uuid()).min(1).max(5),
  })
  .strict()
  .superRefine((v, ctx) => {
    const days = (Date.parse(v.to) - Date.parse(v.from)) / 86400000;
    if (days < 0 || days > 365 || new Set(v.siteIds).size !== v.siteIds.length)
      ctx.addIssue({
        code: "custom",
        message:
          "Choose unique sites and an inclusive window of at most 366 days",
      });
  });
export type AnalyticsInput = z.infer<typeof analyticsInput>;
export type AnalyticsTool = (typeof analyticsTools)[number];
export interface Metric {
  id: string;
  label: string;
  value: string | null;
  unit: "records" | "people" | "seconds" | "paise";
  denominator: string;
  eligibility: string;
  source: string;
  limitation: string;
  state:
    | "observed"
    | "no_records"
    | "suppressed"
    | "not_configured"
    | "not_authorized";
}
export interface AnalyticsSite {
  id: string;
  name: string;
  timezone: string;
  from: string;
  to: string;
  asOf: string;
  metrics: Metric[];
  evidence: { id: string; module: string; date: string; status: string }[];
}
export interface AnalyticsSnapshot {
  version: "analytics-v1";
  sites: AnalyticsSite[];
  generatedAt: string;
  explanation: {
    mode: string;
    statements: string[];
    model?: string;
    promptVersion?: string;
  };
}

// The provider chooses focus, never numbers, free-form claims, identities or scope.
export const explanationSelection = z
  .object({
    items: z
      .array(
        z
          .object({
            factId: z.string().min(1).max(120),
            reading: z.enum([
              "observed",
              "no_records",
              "data_gap",
              "awaiting_action",
            ]),
          })
          .strict(),
      )
      .max(6),
  })
  .strict();
export function explainSelections(
  raw: unknown,
  facts: { id: string; metric: Metric }[],
) {
  const selection = explanationSelection.parse(raw);
  const seen = new Set<string>();
  return selection.items.map((item) => {
    const fact = facts.find((f) => f.id === item.factId);
    if (!fact || seen.has(item.factId) || fact.metric.value === null)
      throw Error("INVALID_EXPLANATION");
    seen.add(item.factId);
    const m = fact.metric;
    if (item.reading === "no_records" && m.value !== "0")
      throw Error("INVALID_EXPLANATION");
    if (
      item.reading === "data_gap" &&
      !/unknown|unverified|missing|unobserved/.test(m.id)
    )
      throw Error("INVALID_EXPLANATION");
    if (
      item.reading === "awaiting_action" &&
      !/pending|overdue|backlog/.test(m.id)
    )
      throw Error("INVALID_EXPLANATION");
    return `${m.label}: ${m.value} ${m.unit}. ${m.denominator}. ${m.limitation}`;
  });
}
