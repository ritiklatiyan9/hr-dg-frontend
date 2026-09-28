import { AiIcon } from "@/components/ui/ai-icon";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  ArrowUpRight,
  Building2,
  CalendarRange,
  Clock,
  DatabaseZap,
  Info,
  Loader2,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import {
  AnalyticsDocument,
  ExplainAnalyticsDocument,
} from "@/shared/contracts/generated";
import type {
  AnalyticsSite,
  AnalyticsSnapshot,
  Metric,
} from "@/shared/contracts/analytics";
import { money } from "@/shared/contracts/payroll";
import { useScope, useScopedQuery, useWrite } from "./workspace-context";
import {
  Badge as StatusBadge,
  ErrorState,
  Heading,
  Notice,
  Skeleton,
  humanize,
  useT,
} from "./ui";
import { DataTable } from "./components/shared/data-table";
import { FacetedFilter } from "./components/shared/faceted-filter";
import { Field } from "./components/shared/page";
import { formatDate, formatDateTime } from "./components/shared/formatting";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** Display value of a deterministic metric; also used by the dashboard. */
export function metricValue(m: Metric) {
  if (m.value === null) return "—";
  if (m.unit === "paise") return `₹${money(m.value)}`;
  if (m.unit === "seconds") return `${(Number(m.value) / 3600).toFixed(2)} h`;
  return m.value;
}
/** Some server labels start lowercase ("dwr approval backlog"). */
export const metricLabel = (label: string) =>
  label
    .replace(/^(dwr|hr)\b/, (w) => w.toUpperCase())
    .replace(/^./, (c) => c.toUpperCase());
const stateVariant = {
  observed: "success",
  no_records: "secondary",
  suppressed: "warning",
  not_configured: "warning",
  not_authorized: "destructive",
} as const;
type Evidence = AnalyticsSite["evidence"][number] & {
  siteId: string;
  siteName: string;
};

export function AnalyticsPanel() {
  const s = useScope(),
    t = useT(),
    write = useWrite();
  const today = s.workDate;
  const [from, setFrom] = useState(today.slice(0, 8) + "01"),
    [to, setTo] = useState(today),
    [selected, setSelected] = useState([s.siteId]);
  const [input, setInput] = useState({ from, to, siteIds: selected });
  const [explanation, setExplanation] = useState<AnalyticsSnapshot | null>(
      null,
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<Error | null>(null);
  const [find, setFind] = useState(""),
    [states, setStates] = useState<string[]>([]);
  const q = useScopedQuery<{ analytics: AnalyticsSnapshot }>(
    ["analytics", input],
    AnalyticsDocument,
    { input },
    true,
    60000,
  );
  useEffect(() => {
    setExplanation(null);
  }, [input, q.data]);
  const result = explanation ?? q.data?.analytics;
  const org =
    s.decisions.find((d) => d.key === "analytics.view")?.decision.scope ===
      "organization" &&
    s.decisions.find((d) => d.key === "reports.view")?.decision.scope ===
      "organization";
  async function explain() {
    setBusy(true);
    setError(null);
    try {
      const r = await write<{ explainAnalytics: AnalyticsSnapshot }>(
        ExplainAnalyticsDocument,
        { input },
      );
      setExplanation(r.explainAnalytics);
    } catch (e) {
      setError(e as Error);
    } finally {
      setBusy(false);
    }
  }
  const stateLabel: Record<Metric["state"], string> = {
    observed: t("Observed", "दर्ज"),
    no_records: t("No records", "कोई रिकॉर्ड नहीं"),
    suppressed: t("Suppressed", "छिपाया गया"),
    not_configured: t("Not configured", "कॉन्फ़िगर नहीं"),
    not_authorized: t("Not authorized", "अनुमति नहीं"),
  };
  const metrics = result?.sites.flatMap((site) => site.metrics) ?? [];
  const stateCounts = new Map<unknown, number>();
  for (const m of metrics)
    stateCounts.set(m.state, (stateCounts.get(m.state) ?? 0) + 1);
  const filtering = !!find.trim() || states.length > 0;
  const shown = (m: Metric) =>
    (!states.length || states.includes(m.state)) &&
    `${m.label} ${m.id}`.toLowerCase().includes(find.trim().toLowerCase());
  const reset = () => {
    setFind("");
    setStates([]);
  };
  const moduleLabel = (module: string) =>
    module === "dwr"
      ? t("Daily work report", "दैनिक कार्य रिपोर्ट")
      : module === "operations"
        ? t("Operations", "संचालन")
        : humanize(module);
  const evidence: Evidence[] =
    result?.sites.flatMap((site) =>
      site.evidence.map((e) => ({
        ...e,
        siteId: site.id,
        siteName: site.name,
      })),
    ) ?? [];
  const columns: ColumnDef<Evidence>[] = [
    {
      header: t("Module", "मॉड्यूल"),
      id: "module",
      accessorFn: (e) => moduleLabel(e.module),
      cell: ({ getValue }) => (
        <span className="font-medium">{String(getValue())}</span>
      ),
    },
    ...(result && result.sites.length > 1
      ? [
          {
            header: t("Site", "साइट"),
            id: "site",
            accessorFn: (e: Evidence) => e.siteName,
          },
        ]
      : []),
    {
      header: t("Date", "तारीख"),
      id: "date",
      accessorKey: "date",
      cell: ({ row: { original: e } }) => formatDate(e.date),
    },
    {
      header: t("Status", "स्थिति"),
      id: "status",
      accessorFn: (e) => humanize(e.status),
      cell: ({ row: { original: e } }) => <StatusBadge>{e.status}</StatusBadge>,
    },
    {
      header: t("Record", "रिकॉर्ड"),
      id: "record",
      accessorKey: "id",
      cell: ({ row: { original: e } }) => (
        <code className="text-muted-foreground font-mono text-xs">{e.id}</code>
      ),
    },
    {
      header: "",
      id: "open",
      enableHiding: false,
      cell: ({ row: { original: e } }) =>
        e.siteId === s.siteId ? (
          <div className="flex justify-end">
            <Button asChild variant="ghost" size="sm">
              <Link to={`/${e.module}`}>
                {t("Open", "खोलें")}
                <ArrowUpRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground max-w-56 text-xs whitespace-normal">
            {t(
              "Select this site in the workspace to inspect its records.",
              "रिकॉर्ड देखने के लिए कार्यक्षेत्र में यह साइट चुनें।",
            )}
          </p>
        ),
    },
  ];
  const unavailable =
    !!result &&
    ["recoverable_error", "budget_exhausted", "insufficient_evidence"].includes(
      result.explanation.mode,
    );
  return (
    <section className="grid gap-5">
      <Heading
        title={t("Management insights", "प्रबंधन विश्लेषण")}
        description={`${s.siteName} · ${t(
          "Authorized facts with visible definitions. Unknown evidence is never absence.",
          "अनुमत तथ्यों की स्पष्ट परिभाषाएँ। अज्ञात जानकारी अनुपस्थिति नहीं है।",
        )}`}
      >
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setInput({ from, to, siteIds: selected });
            setError(null);
          }}
        >
          <Field label={t("From", "से")} htmlFor="analytics-from">
            <Input
              id="analytics-from"
              type="date"
              className="w-[9.5rem]"
              value={from}
              max={to}
              required
              onChange={(e) => setFrom(e.target.value)}
            />
          </Field>
          <Field label={t("Through", "तक")} htmlFor="analytics-to">
            <Input
              id="analytics-to"
              type="date"
              className="w-[9.5rem]"
              value={to}
              min={from}
              max={today}
              required
              onChange={(e) => setTo(e.target.value)}
            />
          </Field>
          {org && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline">
                  <Building2 className="size-4" />
                  {t("Sites", "साइटें")}
                  <Badge variant="secondary" className="tabular-nums">
                    {selected.length}
                  </Badge>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>
                  {t(
                    "Selected sites · reporting only",
                    "चुनी साइटें · केवल रिपोर्ट",
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {s.sites.map((site) => (
                  <DropdownMenuCheckboxItem
                    key={site.id}
                    checked={selected.includes(site.id)}
                    disabled={site.id === s.siteId}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={(on) =>
                      setSelected(
                        on
                          ? [...selected, site.id]
                          : selected.filter((id) => id !== site.id),
                      )
                    }
                  >
                    {site.name}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button type="submit">
            <CalendarRange className="size-4" />
            {t("Apply window", "अवधि लागू करें")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9 min-h-9"
            aria-label={t("Refresh", "रीफ़्रेश")}
            disabled={q.isFetching}
            onClick={() => void q.refetch()}
          >
            <RefreshCw
              className={cn("size-4", q.isFetching && "animate-spin")}
            />
          </Button>
        </form>
      </Heading>
      {q.isLoading ? (
        <Skeleton />
      ) : q.error ? (
        <ErrorState error={q.error as Error} retry={() => void q.refetch()} />
      ) : (
        result && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-normal">
                <CalendarRange />
                {formatDate(input.from)} → {formatDate(input.to)}
              </Badge>
              <Badge variant="success" className="font-normal">
                <Clock />
                {t("Freshly computed", "अभी गणना की गई")}:{" "}
                {formatDateTime(result.generatedAt)}
              </Badge>
              <Badge variant="outline" className="font-normal">
                <DatabaseZap />
                {t(
                  "No shared or offline analytics cache",
                  "कोई साझा या ऑफ़लाइन विश्लेषण कैश नहीं",
                )}
              </Badge>
            </div>
            <section className="bg-card grid gap-4 rounded-lg border p-5 shadow-xs">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 gap-3">
                  <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-md">
                    <AiIcon size={18} />
                  </span>
                  <div className="min-w-0 space-y-1">
                    <h2 className="text-base font-semibold tracking-normal">
                      {t("Explain these facts", "इन तथ्यों की व्याख्या")}
                    </h2>
                    <p className="text-muted-foreground max-w-3xl text-sm">
                      {t(
                        "AI can select useful facts; every displayed number comes from validated calculations. No employee text, identity or salary is sent.",
                        "एआई उपयोगी तथ्य चुन सकता है; संख्याएँ सत्यापित गणनाओं से आती हैं। पहचान, कर्मचारी पाठ और वेतन नहीं भेजे जाते।",
                      )}
                    </p>
                  </div>
                </div>
                {result.explanation.mode !== "setup_required" && (
                  <Button disabled={busy} onClick={() => void explain()}>
                    {busy ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <AiIcon size={16} />
                    )}
                    {busy
                      ? t("Preparing explanation…", "व्याख्या तैयार हो रही है…")
                      : t(
                          "Explain authorized facts",
                          "अनुमत तथ्यों की व्याख्या करें",
                        )}
                  </Button>
                )}
              </div>
              {result.explanation.mode === "setup_required" && (
                <Alert variant="info">
                  <Info />
                  <AlertTitle>{t("Manual mode", "मैनुअल मोड")}</AlertTitle>
                  <AlertDescription>
                    {t(
                      "AI setup required. All deterministic metrics remain available.",
                      "एआई सेटअप आवश्यक है। गणना किए गए आँकड़े उपलब्ध हैं।",
                    )}
                  </AlertDescription>
                </Alert>
              )}
              {error && (
                <ErrorState error={error} retry={() => void explain()} />
              )}
              {unavailable && (
                <Notice>
                  {t(
                    "Explanation unavailable. Review the computed facts below and retry later.",
                    "व्याख्या उपलब्ध नहीं। नीचे दिए तथ्य देखें और बाद में प्रयास करें।",
                  )}
                </Notice>
              )}
              {result.explanation.statements.length > 0 && (
                <ul className="grid gap-2">
                  {result.explanation.statements.map((text, i) => (
                    <li
                      key={i}
                      className="bg-muted/40 flex gap-2.5 rounded-md px-3 py-2 text-sm"
                    >
                      <AiIcon
                        size={14}
                        className="text-primary mt-0.5 shrink-0"
                      />
                      {text}
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                <Input
                  aria-label={t("Search metrics", "मेट्रिक खोजें")}
                  placeholder={t("Search metrics…", "मेट्रिक खोजें…")}
                  value={find}
                  onChange={(e) => setFind(e.target.value)}
                  className="h-8 pl-8"
                />
              </div>
              <FacetedFilter
                title={t("State", "स्थिति")}
                options={(Object.keys(stateLabel) as Metric["state"][]).map(
                  (v) => ({ value: v, label: stateLabel[v] }),
                )}
                selected={states}
                onChange={setStates}
                counts={stateCounts}
              />
              {filtering && (
                <Button variant="ghost" size="sm" onClick={reset}>
                  {t("Reset", "रीसेट")}
                  <X className="size-4" />
                </Button>
              )}
            </div>
            {result.sites.map((site) => {
              const visible = site.metrics.filter(shown);
              return (
                <section key={site.id} className="grid gap-3">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h2 className="flex items-center gap-2 text-base font-semibold tracking-normal">
                      <Building2 className="text-muted-foreground size-4" />
                      {site.name}
                    </h2>
                    <Badge variant="outline" className="font-normal">
                      {site.timezone}
                    </Badge>
                    <span className="text-muted-foreground text-xs">
                      {t("As of", "गणना समय")}: {formatDateTime(site.asOf)}
                    </span>
                  </div>
                  {visible.length ? (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      {visible.map((m) => (
                        <article
                          key={m.id}
                          className="bg-card flex flex-col gap-2 rounded-lg border p-4 shadow-xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-muted-foreground text-sm font-medium">
                              {metricLabel(m.label)}
                            </h3>
                            <Badge variant={stateVariant[m.state]}>
                              {stateLabel[m.state]}
                            </Badge>
                          </div>
                          <p className="text-2xl font-semibold tracking-tight tabular-nums">
                            {metricValue(m)}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {m.denominator}
                          </p>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-primary mt-auto -ml-2.5 w-fit"
                              >
                                <Info className="size-3.5" />
                                {t(
                                  "Definition and evidence",
                                  "परिभाषा और प्रमाण",
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="w-80">
                              <dl className="grid gap-3 text-sm [&_dd]:m-0 [&_dt]:m-0">
                                {(
                                  [
                                    [t("Denominator", "आधार"), m.denominator],
                                    [
                                      t("Eligibility", "पात्रता"),
                                      m.eligibility,
                                    ],
                                    [t("Limitation", "सीमा"), m.limitation],
                                  ] as const
                                ).map(([label, text]) => (
                                  <div key={label} className="grid gap-1">
                                    <dt className="text-muted-foreground text-xs font-medium">
                                      {label}
                                    </dt>
                                    <dd>{text}</dd>
                                  </div>
                                ))}
                                <div className="grid gap-1">
                                  <dt className="text-muted-foreground text-xs font-medium">
                                    {t("Source", "स्रोत")}
                                  </dt>
                                  <dd className="font-mono text-xs break-words">
                                    {m.source}
                                    {m.unit === "seconds"
                                      ? ` · ${m.value} exact seconds`
                                      : ""}
                                  </dd>
                                </div>
                              </dl>
                            </PopoverContent>
                          </Popover>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="text-muted-foreground grid justify-items-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm">
                      {filtering
                        ? t(
                            "No metrics match your search or filters.",
                            "खोज या फ़िल्टर से कोई मेट्रिक नहीं मिला।",
                          )
                        : t(
                            "No metrics for this site.",
                            "इस साइट के लिए कोई मेट्रिक नहीं।",
                          )}
                      {filtering && (
                        <Button variant="outline" size="sm" onClick={reset}>
                          {t("Clear filters", "फ़िल्टर हटाएँ")}
                        </Button>
                      )}
                    </div>
                  )}
                </section>
              );
            })}
            <section className="grid gap-3">
              <div className="space-y-1">
                <h2 className="flex items-center gap-2 text-base font-semibold tracking-normal">
                  {t("Supporting authorized records", "संबंधित अनुमत रिकॉर्ड")}
                  <Badge variant="secondary" className="tabular-nums">
                    {evidence.length}
                  </Badge>
                </h2>
                <p className="text-muted-foreground text-sm">
                  {t(
                    "Up to five recent supporting records per source. Opening the module rechecks access.",
                    "हर स्रोत से अधिकतम पाँच हाल के रिकॉर्ड। मॉड्यूल खोलने पर अनुमति जाँची जाती है।",
                  )}
                </p>
              </div>
              <DataTable
                data={evidence}
                columns={columns}
                getRowId={(e) => `${e.siteId}:${e.id}`}
                label={t("Supporting records", "सहायक रिकॉर्ड")}
                search={t("Search records…", "रिकॉर्ड खोजें…")}
                pageSize={10}
                empty={t(
                  "No supporting records in this window.",
                  "इस अवधि में कोई सहायक रिकॉर्ड नहीं।",
                )}
                filters={[
                  {
                    column: "module",
                    title: t("Module", "मॉड्यूल"),
                    options: [
                      ...new Set(evidence.map((e) => moduleLabel(e.module))),
                    ].map((v) => ({ value: v, label: v })),
                  },
                  {
                    column: "status",
                    title: t("Status", "स्थिति"),
                    options: [
                      ...new Set(evidence.map((e) => humanize(e.status))),
                    ].map((v) => ({ value: v, label: v })),
                  },
                ]}
              />
            </section>
          </>
        )
      )}
    </section>
  );
}
