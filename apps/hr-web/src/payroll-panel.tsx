import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  Banknote,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleDashed,
  Clock,
  Download,
  Ellipsis,
  Eye,
  FilePen,
  FilePlus2,
  FileSpreadsheet,
  History,
  Layers,
  ListChecks,
  Loader2,
  Palette,
  Pencil,
  Play,
  Plus,
  Printer,
  ReceiptText,
  Send,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  Undo2,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  PayrollDocument,
  PayrollCommandDocument,
} from "@/shared/contracts/generated";
import {
  calculatePayroll,
  importPayrollCsv,
  money as plainMoney,
  rupeesToPaise,
  paymentMethods,
} from "@/shared/contracts/payroll";
import { useScope, useScopedQuery, useWrite } from "./workspace-context";
import { Dialog as PanelDialog, ErrorState, humanize, useT } from "./ui";
import { FacetedFilter } from "./components/shared/faceted-filter";
import { Field } from "./components/shared/page";
import {
  Money,
  formatDate,
  formatDateTime,
  formatMoney as money,
} from "./components/shared/formatting";
import { Timeline } from "./components/shared/timeline";
import {
  Desk,
  DeskEmpty,
  DeskHeader,
  DeskKpis,
  DeskQueue,
  DeskRefresh,
  DeskStepper,
  DeskTable,
  DeskWorkspace,
  Facts,
  Inspector,
  InspectorSection,
  Person,
  Pill,
  Timeline as DeskTimeline,
  type DeskColumn,
  type Tone,
} from "./components/shared/desk";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const PAGE = 50;
const statuses = ["draft", "validated", "reviewed", "approved", "published"];
type Variant =
  "secondary" | "info" | "outline" | "success" | "warning" | "destructive";
const statusStyle: Record<
  string,
  { label: string; icon: LucideIcon; variant: Variant; className?: string }
> = {
  draft: { label: "Draft", icon: FilePen, variant: "secondary" },
  validated: { label: "Awaiting approval", icon: ListChecks, variant: "info" },
  reviewed: { label: "Reviewed", icon: Eye, variant: "info" },
  approved: {
    label: "Approved",
    icon: BadgeCheck,
    variant: "outline",
    className: "text-success",
  },
  published: { label: "Published", icon: Send, variant: "success" },
};
const methodLabel: Record<string, string> = {
  bank_transfer: "Bank transfer",
  upi: "UPI",
  cheque: "Cheque",
  cash: "Cash",
};
const eventLabel: Record<string, string> = {
  save: "Draft saved",
  run: "Prepared by payroll run",
  validate: "Sent for approval",
  review: "Reviewed",
  approve: "Approved",
  publish: "Published",
  return: "Returned to draft",
};
const skipLabel: Record<string, string> = {
  exists: "Already prepared for this period",
  no_account: "No sign-in account is linked",
  employment_partial: "Joins or leaves during the period; prepare manually",
  no_structure: "No salary set for this month. Add it on the Salaries page",
  structure_partial:
    "Salary changes during the month; prepare this one manually",
  BAD_INPUT:
    "Deductions exceed the attendance-based earnings; prepare manually",
  batch_limit: "Batch limit reached; run again for the rest",
  FORBIDDEN: "Not permitted for this employee",
  PAY_PERIOD_OVERLAP: "Overlaps another pay period",
};
// Stage transitions: the status they start from and the capability they need.
const stages = {
  validate: ["draft", "edit"],
  review: ["validated", "review"],
  approve: ["reviewed", "approve"],
  publish: ["approved", "manage"],
} as const;
type Op = keyof typeof stages | "pay";
const opLabel: Record<string, string> = {
  validate: "Send for approval",
  review: "Mark reviewed",
  approve: "Approve",
  publish: "Publish payslip",
  pay: "Record payment",
  return: "Return to draft",
};
const opIcon: Record<string, LucideIcon> = {
  validate: ListChecks,
  review: Eye,
  approve: BadgeCheck,
  publish: Send,
  pay: Banknote,
  return: Undo2,
};
function eligible(r: any, op: Op, me: string) {
  if (r.isSelf) return false;
  if (op === "pay")
    return (
      r.actions.includes("manage") &&
      r.duePaise != null &&
      BigInt(r.duePaise) > 0n
    );
  const [from, cap] = stages[op];
  return (
    (r.status === from || (op === "approve" && r.status === "validated")) &&
    r.actions.includes(cap) &&
    !(["review", "approve"].includes(op) && r.created_by === me) &&
    !(op === "approve" && r.reviewed_by === me)
  );
}
/** What the signed-in user may do with one result: the row menu and the
 * payslip offer exactly the same actions. */
function rowActions(r: any, me: string, canCreate: boolean) {
  return {
    // Approve leads; the optional independent review comes last.
    ops: (["validate", "approve", "publish", "review"] as Op[]).filter((op) =>
      eligible(r, op, me),
    ),
    pay: eligible(r, "pay", me),
    edit: r.status === "draft" && r.actions.includes("edit"),
    ret:
      ["validated", "reviewed"].includes(r.status) &&
      r.actions.includes("edit"),
    correct: !!canCreate && r.status === "published" && !r.superseded,
    print: r.status === "published" && r.actions.includes("export"),
  };
}
function paymentState(
  r: any,
): { label: string; variant: Variant; icon: LucideIcon; tone: Tone } | null {
  if (r.duePaise == null)
    return r.superseded
      ? {
          label: "Superseded",
          variant: "secondary",
          icon: History,
          tone: "neutral",
        }
      : null;
  const due = BigInt(r.duePaise);
  if (due === 0n)
    return {
      label: "Paid",
      variant: "success",
      icon: CircleCheck,
      tone: "success",
    };
  if (due < 0n)
    return {
      label: "Overpaid",
      variant: "destructive",
      icon: TriangleAlert,
      tone: "danger",
    };
  return BigInt(r.paidPaise) > 0n
    ? {
        label: "Part paid",
        variant: "warning",
        icon: CircleDashed,
        tone: "warning",
      }
    : { label: "Unpaid", variant: "warning", icon: Clock, tone: "warning" };
}
const stageTone: Record<string, Tone> = {
  draft: "neutral",
  validated: "warning",
  reviewed: "warning",
  approved: "success",
  published: "success",
};
const eventTone: Record<string, Tone> = {
  approve: "success",
  publish: "success",
  return: "warning",
};
/** History and recorded payments, newest first. */
function activity(r: any, me: string) {
  const who = (id: string, name?: string | null) =>
    id === me ? "You" : (name ?? "Payroll team member");
  const events: {
    at: string;
    id: string;
    title: string;
    note: string;
    meta: string;
    tone: Tone;
  }[] = [
    ...r.history.map((h: any) => ({
      at: h.created_at,
      id: `h${h.version}`,
      title: `${eventLabel[h.event] ?? h.event} · v${h.version}`,
      note: h.reason,
      meta: `${who(h.actor_id, h.actorName)} · ${formatDateTime(h.created_at)}`,
      tone: eventTone[h.event] ?? "neutral",
    })),
    ...r.payments.map((p: any) => ({
      at: p.createdAt,
      id: p.id,
      title: `${p.kind === "reversal" ? "Payment reversed" : "Payment recorded"} · ₹${money(p.paise)}`,
      note: p.reason,
      meta: `${methodLabel[p.method]} ${p.reference} · paid on ${formatDate(p.paidOn)} · ${who(p.actorId, p.actorName)} · ${formatDateTime(p.createdAt)}`,
      tone: p.kind === "reversal" ? "danger" : "success",
    })),
  ];
  return events.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}
function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y!, m!, 0)).getUTCDate();
  return {
    from: `${month}-01`,
    to: `${month}-${String(last).padStart(2, "0")}`,
  };
}
const today = () => new Date().toLocaleDateString("en-CA");
const monthName = new Intl.DateTimeFormat(undefined, {
  month: "long",
  year: "numeric",
});
/** "September 2026" for a whole calendar month, otherwise the date range. */
function periodLabel(start: string, end: string) {
  const whole = monthRange(start.slice(0, 7));
  return whole.from === start && whole.to === end
    ? monthName.format(new Date(`${start}T00:00:00`))
    : `${formatDate(start)} – ${formatDate(end)}`;
}
const tick = "accent-primary size-4 min-w-4 cursor-pointer align-middle";
const useEmployments = () =>
  useScopedQuery<any>(["payroll", "employments"], PayrollDocument, {
    input: { first: 1, employments: true },
  });
/** The latest defined value. The workspace remounts panels on every scope
 * change, so this only bridges reloads within one site, actor and permission
 * version: filters can reload without the page blanking out. */
function useLast<T>(value: T | undefined) {
  const [last, setLast] = useState(value);
  if (value !== undefined && value !== last) setLast(value);
  return value ?? last;
}
function StatusBadge({ status }: { status: string }) {
  const style = statusStyle[status];
  if (!style) return <Badge variant="secondary">{humanize(status)}</Badge>;
  return (
    <Badge variant={style.variant}>
      <style.icon className={style.className} />
      {style.label}
    </Badge>
  );
}
function PaymentBadge({ r }: { r: any }) {
  const p = paymentState(r);
  return p ? (
    <Badge variant={p.variant}>
      <p.icon />
      {p.label}
    </Badge>
  ) : null;
}
function Problem({ error }: { error: string }) {
  return error ? (
    <Alert variant="destructive">
      <TriangleAlert />
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  ) : null;
}
function Block({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="grid min-w-0 grow basis-64 gap-0.5">
          <h3 className="text-sm font-semibold">{title}</h3>
          {description && (
            <p className="text-muted-foreground text-xs">{description}</p>
          )}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
function Disclosure({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: ReactNode;
  children: ReactNode;
}) {
  return (
    <details className="group bg-card rounded-lg border">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-sm font-medium [&::-webkit-details-marker]:hidden">
        <Icon className="text-muted-foreground size-4" />
        {title}
        <ChevronDown className="text-muted-foreground ml-auto size-4 transition-transform group-open:rotate-180" />
      </summary>
      <div className="grid gap-3 border-t p-3">{children}</div>
    </details>
  );
}
/** Current-results aggregates for one filter set, kept on screen while it reloads. */
function useSummary(filters: object) {
  const q = useScopedQuery<any>(
    ["payroll", "summary", filters],
    PayrollDocument,
    { input: { ...filters, first: 1, summary: true } },
  );
  return { q, rows: useLast<any[]>(q.data?.payroll.summary) };
}
const countOf = (rows?: any[]) =>
  rows?.reduce((n: number, r: any) => n + r.count, 0);
function totals(rows: any[]) {
  const final = rows.filter((r) =>
    ["approved", "published"].includes(r.status),
  );
  const sum = (k: string) =>
    final.reduce((n, r) => n + BigInt(r[k] ?? 0), 0n).toString();
  return {
    count: countOf(rows),
    net: sum("netPaise"),
    paid: sum("paidPaise"),
    due: sum("duePaise"),
  };
}
function shiftMonth(month: string, by: number) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1 + by, 1)).toISOString().slice(0, 7);
}
function StatusPill({ status }: { status: string }) {
  return (
    <Pill tone={stageTone[status] ?? "neutral"}>
      {statusStyle[status]?.label ?? humanize(status)}
    </Pill>
  );
}
function PaymentPill({ r }: { r: any }) {
  const p = paymentState(r);
  return p ? (
    <Pill tone={p.tone}>{p.label}</Pill>
  ) : (
    <span className="rd-muted">—</span>
  );
}
/** Inspector footer content: context note on the left, wrapping actions. */
function ActionBar({
  note,
  children,
}: {
  note?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex w-full flex-wrap items-center justify-end gap-2">
      {note && (
        <span className="text-muted-foreground mr-auto text-[12.5px]">
          {note}
        </span>
      )}
      {children}
    </div>
  );
}
export function PayrollPanel() {
  const s = useScope(),
    t = useT(),
    client = useQueryClient(),
    navigate = useNavigate(),
    [status, setStatus] = useState(""),
    [payment, setPayment] = useState(""),
    [month, setMonth] = useState(""),
    [search, setSearch] = useState(""),
    [query, setQuery] = useState(""),
    [cursors, setCursors] = useState<string[]>([]),
    [picked, setPicked] = useState<Map<string, any>>(new Map()),
    [selectedId, setSelectedId] = useState<string | null>(null),
    [detailId, setDetailId] = useState<string | null>(null),
    [editor, setEditor] = useState<any>(null),
    [action, setAction] = useState<{ op: string; rows: any[] } | null>(null),
    [running, setRunning] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);
  // Month, search and status scope the totals; payment segments count within them.
  const scope = useMemo(
    () => ({
      ...(status && { status }),
      ...(month && monthRange(month)),
      ...(query && { search: query }),
    }),
    [status, month, query],
  );
  const filters = useMemo(
    () => ({ ...scope, ...(payment && { payment }) }),
    [scope, payment],
  );
  useEffect(() => {
    setCursors([]);
    setPicked(new Map());
  }, [filters]);
  const after = cursors.at(-1);
  const q = useScopedQuery<any>(
    ["payroll", "page", filters, after ?? null],
    PayrollDocument,
    { input: { ...filters, first: PAGE, ...(after && { after }) } },
  );
  const all = useSummary(scope),
    due = useSummary({ ...scope, payment: "due" }),
    paid = useSummary({ ...scope, payment: "paid" });
  const d = useLast<any>(q.data?.payroll ?? all.q.data?.payroll);
  const payrollKey = [...s.key, "payroll"];
  const fetching = useIsFetching({ queryKey: payrollKey }) > 0;
  const refresh = () => void client.invalidateQueries({ queryKey: payrollKey });
  const error = q.error ?? all.q.error;
  if (error) return <ErrorState error={error} retry={refresh} />;
  const rows: any[] = q.data?.payroll.results ?? [];
  const active = rows.find((r) => r.id === selectedId) ?? rows[0];
  const toggle = (list: any[], on: boolean) =>
    setPicked((m) => {
      const next = new Map(m);
      for (const r of list) on ? next.set(r.id, r) : next.delete(r.id);
      return next;
    });
  // Cancelling a decision keeps the payslip and selection; completing it
  // closes both, as the result has moved on.
  const finish = (done?: boolean) => {
    setAction(null);
    if (done) {
      setDetailId(null);
      setPicked(new Map());
    }
  };
  const filtered = !!(search || status || payment || month);
  const thisMonth = today().slice(0, 7);
  const step = (by: number) =>
    setMonth(month ? shiftMonth(month, by) : thisMonth);
  const selectable = rows.some(
    (r) => !r.isSelf && r.actions.some((a: string) => a !== "export"),
  );
  const pagePicked = rows.filter((r) => picked.has(r.id)).length;
  const selection = [...picked.values()];
  const bulk = (["validate", "approve", "publish", "pay"] as Op[])
    .map((op) => ({
      op,
      ok: selection.filter((r) => eligible(r, op, s.actorId)),
    }))
    .filter((b) => b.ok.length);
  const detail =
    rows.find((r) => r.id === detailId) ?? picked.get(detailId ?? "");
  const register = new URLSearchParams({ siteId: s.siteId, ...filters });
  const kpi = all.rows && totals(all.rows);
  // Row controls keep their own keys: the row turns Enter/Space into "select".
  const own = (e: { stopPropagation(): void }) => e.stopPropagation();
  const pick: DeskColumn<any> = {
    id: "pick",
    className: "w-10",
    header: (
      <input
        type="checkbox"
        aria-label="Select all results on this page"
        className={tick}
        checked={!!rows.length && pagePicked === rows.length}
        ref={(el) => {
          if (el) el.indeterminate = pagePicked > 0 && pagePicked < rows.length;
        }}
        onChange={(e) => toggle(rows, e.target.checked)}
      />
    ),
    cell: (r) => (
      <input
        type="checkbox"
        aria-label={`Select ${r.snapshot.employeeName}`}
        className={tick}
        checked={picked.has(r.id)}
        onClick={own}
        onKeyDown={own}
        onChange={(e) => toggle([r], e.target.checked)}
      />
    ),
  };
  const columns: DeskColumn<any>[] = [
    ...(selectable ? [pick] : []),
    {
      id: "employee",
      header: "Employee",
      className: "min-w-[150px]",
      cell: (r) => (
        <Person name={r.snapshot.employeeName} sub={r.snapshot.employeeCode} />
      ),
      sortValue: (r) => r.snapshot.employeeName,
    },
    {
      // Id and header stay "Pay period": the URL sort reads sort=Pay period:asc.
      id: "Pay period",
      header: "Pay period",
      className: "max-[560px]:hidden",
      cell: (r) => (
        <span className="grid">
          <span className="font-medium">
            {periodLabel(r.periodStart, r.periodEnd)}
          </span>
          <span className="rd-muted rd-mono">
            {r.periodStart} – {r.periodEnd}
          </span>
          {r.snapshot.attendanceSummary && (
            <span className="rd-muted">
              {payableText(r.snapshot.attendanceSummary)}
            </span>
          )}
        </span>
      ),
      sortValue: (r) => `${r.periodStart} – ${r.periodEnd}`,
    },
    {
      id: "net",
      header: "Net pay",
      className: "rd-mono text-right",
      // The payment state sits under the amount it describes.
      cell: (r) => (
        <span className="grid justify-items-end gap-1">
          <Money paise={r.snapshot.netPaise} />
          {paymentState(r) && <PaymentPill r={r} />}
        </span>
      ),
      // Paise are non-negative integers, so zero-padding sorts them exactly.
      sortValue: (r) => r.snapshot.netPaise.padStart(16, "0"),
    },
    {
      id: "status",
      header: "Status",
      cell: (r) => <StatusPill status={r.status} />,
      sortValue: (r) => statuses.indexOf(r.status),
    },
    {
      id: "open",
      header: <span className="sr-only">Payslip</span>,
      className: "w-12 text-right",
      cell: (r) => (
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open"
          title="Open payslip"
          onKeyDown={own}
          onClick={() => setDetailId(r.id)}
        >
          <ReceiptText className="size-4" />
        </Button>
      ),
    },
  ];
  return (
    // Payroll-only layout: the month stepper takes its own row on phones, and
    // the long inspector scrolls inside the desk on wide screens.
    <div className="max-[860px]:[&_.rd-stepper]:basis-full min-[861px]:[&_.rd-inspector-body]:max-h-[min(62vh,760px)]">
      <Desk label={t("Payroll", "वेतन")}>
        <DeskHeader
          crumb={t("Finance / Payroll", "वित्त / वेतन")}
          title={t("Payroll", "वेतन")}
          subtitle={`${s.siteName} · ${t("Pay runs, independent approval and recorded payments", "वेतन, स्वतंत्र स्वीकृति और दर्ज भुगतान")}`}
        >
          {/* Labelled "Month", not "Pay month": that name belongs to the input. */}
          <DeskStepper
            label={t("Month", "माह")}
            onPrevious={() => step(-1)}
            onNext={() => step(1)}
          >
            <span className="relative flex min-w-0 max-[860px]:flex-1">
              <CalendarDays
                aria-hidden="true"
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 z-10 size-[15px] -translate-y-1/2"
              />
              {/* A real month input stays the control (tests fill "Pay month");
                  the browser's own icon is hidden and a click opens its picker. */}
              <input
                type="month"
                aria-label={t("Pay month", "वेतन माह")}
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                onClick={(e) => e.currentTarget.showPicker?.()}
                className={cn(
                  "rd-date peer h-full w-full cursor-pointer rounded-none border-0 border-x bg-transparent py-0 pr-3 pl-9 text-[13px] shadow-none outline-none focus:bg-muted dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:hidden",
                  !month && "text-transparent focus:text-foreground",
                )}
              />
              {!month && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 left-9 flex items-center text-[13px] font-semibold whitespace-nowrap peer-focus:hidden"
                >
                  {t("All months", "सभी माह")}
                </span>
              )}
            </span>
          </DeskStepper>
          {month && (
            <Button variant="outline" size="sm" onClick={() => setMonth("")}>
              {t("All months", "सभी माह")}
            </Button>
          )}
          <DeskRefresh
            label={t("Refresh payroll", "वेतन रीफ़्रेश करें")}
            fetching={fetching}
            onClick={refresh}
          />
          {d?.canView && (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={t("More payroll actions", "और वेतन कार्य")}
                >
                  <Ellipsis className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuItem onSelect={() => navigate("/payslip-design")}>
                  <Palette />
                  {t("Payslip design", "वेतन पर्ची डिज़ाइन")}
                </DropdownMenuItem>
                {d.canExport && (
                  <DropdownMenuItem asChild>
                    <a href={`/payroll/register/csv?${register}`}>
                      <Download />
                      {t("Register CSV", "रजिस्टर CSV")}
                      <span className="text-muted-foreground ml-auto text-xs">
                        {t("current filters", "वर्तमान फ़िल्टर")}
                      </span>
                    </a>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {d?.canView && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/salaries")}
            >
              <Layers className="size-4" />
              {t("Salaries", "वेतन निर्धारण")}
            </Button>
          )}
          {d?.canCreate && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRunning(true)}
              >
                <Play className="size-4" />
                {t("Run payroll", "वेतन चलाएँ")}
              </Button>
              <Button size="sm" onClick={() => setEditor({})}>
                <Plus className="size-4" />
                {t("Prepare payroll", "वेतन तैयार करें")}
              </Button>
            </>
          )}
        </DeskHeader>
        {d && !d.canView && (
          <Alert className="mb-4">
            <ShieldCheck className="size-4" />
            <AlertDescription>
              {t(
                "You can see only your own published payslips here. Running, reviewing, approving and paying payroll needs separate payroll permissions for this site (view, prepare, review, approve, manage and the salary field). A Super Admin grants them per person in Users & access; job titles never grant them.",
                "यहाँ आप केवल अपनी प्रकाशित वेतन पर्चियाँ देख सकते हैं। वेतन चलाने, समीक्षा, स्वीकृति और भुगतान के लिए इस साइट की अलग वेतन अनुमतियाँ चाहिए। सुपर एडमिन इन्हें Users & access में प्रति व्यक्ति देता है।",
              )}
            </AlertDescription>
          </Alert>
        )}
        <DeskKpis
          label={t("Payroll totals", "वेतन कुल")}
          items={[
            {
              label: t("Current results", "वर्तमान परिणाम"),
              value: kpi ? kpi.count : "–",
              tone: "neutral",
            },
            {
              label: t("Approved net pay", "स्वीकृत शुद्ध वेतन"),
              value: kpi ? <Money paise={kpi.net} /> : "–",
              tone: "neutral",
            },
            {
              label: t("Paid", "भुगतान किया गया"),
              value: kpi ? <Money paise={kpi.paid} /> : "–",
              tone: "success",
            },
            {
              label: t("Outstanding", "बकाया"),
              value: kpi ? <Money paise={kpi.due} /> : "–",
              tone: kpi && BigInt(kpi.due) > 0n ? "warning" : "success",
            },
          ]}
          context={{
            icon: ShieldCheck,
            title: t(
              "Company and statutory rules need accountant review",
              "कंपनी और वैधानिक नियमों की लेखाकार समीक्षा आवश्यक है",
            ),
            text: t(
              "Payments are recorded after they are made; this system does not transfer money.",
              "भुगतान होने के बाद दर्ज किए जाते हैं; यह प्रणाली पैसा ट्रांसफ़र नहीं करती।",
            ),
            pill: {
              tone: "success",
              label: t("Independent review", "स्वतंत्र समीक्षा"),
            },
          }}
        />
        <DeskWorkspace>
          <DeskQueue
            label={t("Payment state", "भुगतान स्थिति")}
            segments={[
              { id: "", label: t("All", "सभी"), count: countOf(all.rows) },
              { id: "due", label: t("Due", "बकाया"), count: countOf(due.rows) },
              {
                id: "paid",
                label: t("Paid", "भुगतान हुआ"),
                count: countOf(paid.rows),
              },
            ]}
            segment={payment}
            onSegment={setPayment}
            search={search}
            // The server accepts at most 100 search characters.
            onSearch={(v) => setSearch(v.slice(0, 100))}
            searchPlaceholder={t(
              "Search employee or code",
              "कर्मचारी या कोड खोजें",
            )}
            toolbar={
              <FacetedFilter
                title={t("Status", "स्थिति")}
                options={statuses.map((v) => ({
                  value: v,
                  label: statusStyle[v]!.label,
                  icon: statusStyle[v]!.icon,
                }))}
                selected={status ? [status] : []}
                // The server filters one status at a time: the latest pick wins.
                onChange={(next) => setStatus(next.at(-1) ?? "")}
              />
            }
          >
            <DeskTable
              label="Payroll results"
              columns={columns}
              rows={rows}
              getId={(r) => r.id}
              selectedId={active?.id}
              onSelect={setSelectedId}
              loading={q.isPending}
              empty={
                <DeskEmpty
                  icon={ReceiptText}
                  title={
                    filtered
                      ? t(
                          "No payroll results match",
                          "कोई मेल खाता परिणाम नहीं",
                        )
                      : t("No payroll results", "कोई वेतन परिणाम नहीं")
                  }
                  hint={
                    !filtered && d?.canCreate
                      ? t(
                          "Start here: 1. set each employee's monthly salary on the Salaries page, 2. Run payroll: pay is suggested from attendance, 3. check it and Send for approval, 4. an Admin or Super Admin approves, 5. publish payslips and record the payment after the bank transfer.",
                          "यहाँ से शुरू करें: 1. वेतन निर्धारण पेज पर हर कर्मचारी का मासिक वेतन तय करें, 2. वेतन चलाएँ: उपस्थिति से वेतन सुझाया जाता है, 3. जाँचें और स्वीकृति के लिए भेजें, 4. एडमिन या सुपर एडमिन स्वीकृत करें, 5. वेतन पर्ची प्रकाशित करें और बैंक ट्रांसफ़र के बाद भुगतान दर्ज करें।",
                        )
                      : t(
                          "Change the filters, or run payroll for a month. Employees see only their own published payslips.",
                          "फ़िल्टर बदलें या किसी माह का वेतन चलाएँ। कर्मचारी केवल अपनी प्रकाशित वेतन पर्चियाँ देखते हैं।",
                        )
                  }
                />
              }
            />
            {(cursors.length > 0 || q.data?.payroll.hasMore) && (
              <div className="bg-card text-muted-foreground sticky bottom-0 flex items-center justify-between gap-2 border-t px-4 py-2 text-xs">
                <span>
                  Page {cursors.length + 1} · {PAGE} per page
                </span>
                <span className="flex gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={!cursors.length}
                    onClick={() => setCursors((c) => c.slice(0, -1))}
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={!q.data?.payroll.hasMore}
                    onClick={() =>
                      setCursors((c) => [...c, q.data.payroll.endCursor])
                    }
                    aria-label="Next page"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </span>
              </div>
            )}
          </DeskQueue>
          {selection.length > 0 ? (
            <Inspector
              label={t("Selected results", "चयनित परिणाम")}
              head={{
                title: `${selection.length} ${t("selected", "चयनित")}`,
                sub: t(
                  "Each action asks for a reason and applies to every eligible result, or to none.",
                  "हर कार्य कारण माँगता है और सभी योग्य परिणामों पर एक साथ लागू होता है, या किसी पर नहीं।",
                ),
                avatar: false,
              }}
              actions={
                <ActionBar
                  note={
                    bulk.length
                      ? undefined
                      : t(
                          "No action is available to you for these results.",
                          "इन परिणामों पर आपके लिए कोई कार्य उपलब्ध नहीं है।",
                        )
                  }
                >
                  <Button
                    variant="outline"
                    onClick={() => setPicked(new Map())}
                  >
                    <X className="size-4" />
                    {t("Clear selection", "चयन हटाएँ")}
                  </Button>
                  {bulk.map(({ op, ok }) => {
                    const Icon = opIcon[op]!;
                    return (
                      <Button
                        key={op}
                        variant={op === "pay" ? "default" : "outline"}
                        onClick={() => setAction({ op, rows: ok })}
                      >
                        <Icon className="size-4" />
                        {opLabel[op]} ({ok.length})
                      </Button>
                    );
                  })}
                </ActionBar>
              }
            >
              <InspectorSection title={t("Selected results", "चयनित परिणाम")}>
                <ul className="grid gap-3">
                  {selection.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between gap-3"
                    >
                      <Person
                        name={r.snapshot.employeeName}
                        sub={`${periodLabel(r.periodStart, r.periodEnd)} · ${statusStyle[r.status]?.label ?? r.status}`}
                      />
                      <span className="rd-mono">
                        <Money paise={r.snapshot.netPaise} />
                      </span>
                    </li>
                  ))}
                </ul>
              </InspectorSection>
            </Inspector>
          ) : (
            <Inspector
              label={t("Payroll result", "वेतन परिणाम")}
              head={
                active
                  ? {
                      title: active.snapshot.employeeName,
                      sub: `${active.snapshot.employeeCode} · ${periodLabel(active.periodStart, active.periodEnd)} · Revision ${active.revision}`,
                      pill: <StatusPill status={active.status} />,
                    }
                  : undefined
              }
              actions={
                active && (
                  <ResultActions
                    r={active}
                    canCreate={d?.canCreate}
                    openPayslip={() => setDetailId(active.id)}
                    act={(op) => setAction({ op, rows: [active] })}
                    edit={setEditor}
                  />
                )
              }
              empty={
                <DeskEmpty
                  className="rd-inspector-empty"
                  icon={ReceiptText}
                  title={
                    q.isPending
                      ? t("Loading payroll…", "वेतन लोड हो रहा है…")
                      : t("Nothing selected", "कुछ चयनित नहीं")
                  }
                  hint={t(
                    "Select a result to see its pay, payments and history.",
                    "वेतन, भुगतान और इतिहास देखने के लिए परिणाम चुनें।",
                  )}
                />
              }
            >
              {active && <ResultDetails r={active} />}
            </Inspector>
          )}
        </DeskWorkspace>
        <p className="text-muted-foreground mt-3 px-1 text-xs">
          Newest pay period first. Salary data stays online. Saved downloads
          cannot be remotely revoked.
        </p>
        {detail && (
          <PayrollDetail
            r={detail}
            canCreate={d?.canCreate}
            close={() => setDetailId(null)}
            edit={(initial: any) => {
              setEditor(initial);
              setDetailId(null);
            }}
            act={(op: string) => setAction({ op, rows: [detail] })}
          />
        )}
        {editor && (
          <PayrollEditor initial={editor} close={() => setEditor(null)} />
        )}
        {running && <RunDialog close={() => setRunning(false)} />}
        {action &&
          (action.op === "pay" ? (
            <PaymentDialog rows={action.rows} close={finish} />
          ) : (
            <PayrollDecision {...action} close={finish} />
          ))}
      </Desk>
    </div>
  );
}
/** The selected result, summarised for the inspector. Never renders the
 * payslip's "Net ₹…" line: that text is the payslip dialog's alone. */
const basisText: Record<string, string> = {
  roster: "Rostered duty days",
  weekdays: "Mon–Sat working days (no roster), holidays excluded",
  no_attendance: "No check-ins this period: full pay kept. Please verify.",
  not_visible: "Attendance not visible to the preparer: full pay kept.",
};
const days = (n: number) => `${n} day${n === 1 ? "" : "s"}`;
function payableText(a: any) {
  return `${a.payableDays} of ${a.periodDays} days payable${a.basis === "no_attendance" ? " · no check-ins" : ""}`;
}
/** The attendance behind a suggested amount; HR checks it before sending. */
function AttendanceFacts({ a }: { a: any }) {
  const counted = a.presentDays != null;
  return (
    <Facts
      items={[
        {
          label: "Payable days",
          value: (
            <span className="font-semibold">
              {a.payableDays} / {a.periodDays}
            </span>
          ),
        },
        { label: "Basis", value: basisText[a.basis] ?? a.basis, span: true },
        ...(counted
          ? [
              {
                label: "Present",
                value: `${days(a.presentDays)} of ${days(a.workingDays)}${a.pendingDays ? ` · ${a.pendingDays} awaiting check-in approval` : ""}`,
                span: true,
              },
              { label: "Paid leave", value: days(a.paidLeaveDays) },
              { label: "Unpaid leave (LOP)", value: days(a.unpaidLeaveDays) },
              { label: "Absent (unpaid)", value: days(a.absentDays) },
            ]
          : []),
        ...(a.employedDays < a.periodDays
          ? [
              {
                label: "Employed days",
                value: `${days(a.employedDays)} (joined or left this month)`,
                span: true,
              },
            ]
          : []),
      ]}
    />
  );
}
function ResultDetails({ r }: { r: any }) {
  const s = useScope(),
    snap = r.snapshot;
  return (
    <>
      <InspectorSection title="Pay">
        <Facts
          items={[
            {
              label: "Net pay",
              value: (
                <span className="text-base font-semibold tabular-nums">
                  <Money paise={snap.netPaise} />
                </span>
              ),
            },
            {
              label: "Payment",
              value: paymentState(r) ? (
                <PaymentPill r={r} />
              ) : (
                "Recorded once approved"
              ),
            },
            { label: "Gross", value: <Money paise={snap.grossPaise} /> },
            {
              label: "Deductions",
              value: <Money paise={snap.deductionPaise} />,
            },
            ...(r.duePaise == null
              ? []
              : [
                  {
                    label: "Paid so far",
                    value: <Money paise={r.paidPaise} />,
                  },
                  { label: "Balance due", value: <Money paise={r.duePaise} /> },
                ]),
          ]}
        />
      </InspectorSection>
      {snap.attendanceSummary && (
        <InspectorSection title="Attendance">
          <AttendanceFacts a={snap.attendanceSummary} />
        </InspectorSection>
      )}
      <InspectorSection title="Components">
        <ul className="grid gap-2">
          {snap.lines.map((l: any) => (
            <li
              key={l.code}
              className="flex items-baseline justify-between gap-3"
            >
              <span className="min-w-0">
                <span className="font-medium">{l.label}</span>{" "}
                <span className="rd-muted">
                  {humanize(l.kind)} · ₹{money(l.paise)} × {l.numerator}/
                  {l.denominator}
                </span>
              </span>
              <span className="rd-mono">
                {l.kind === "deduction" ? "−" : ""}₹{money(l.calculatedPaise)}
              </span>
            </li>
          ))}
        </ul>
      </InspectorSection>
      <InspectorSection title="Inputs">
        <Facts
          items={[
            {
              label: "Pay period",
              value: (
                <span className="rd-mono">
                  {r.periodStart} – {r.periodEnd}
                </span>
              ),
            },
            { label: "Policy version", value: snap.policyVersion || "—" },
            {
              label: "Rules, rounding assumptions and exclusions",
              value: snap.assumptions || "—",
              span: true,
            },
            {
              label: "Attendance inputs",
              value: snap.attendanceNote || "—",
              span: true,
            },
          ]}
        />
      </InspectorSection>
      <InspectorSection title="Activity">
        <DeskTimeline items={activity(r, s.actorId).reverse()} />
      </InspectorSection>
      <InspectorSection title="Site allocations">
        <Facts
          items={r.allocations.map((a: any) => ({
            label: s.sites.find((x) => x.id === a.siteId)?.name ?? a.siteId,
            value: <Money paise={a.paise} />,
          }))}
        />
      </InspectorSection>
    </>
  );
}
function ResultActions({
  r,
  canCreate,
  openPayslip,
  act,
  edit,
}: {
  r: any;
  canCreate: boolean;
  openPayslip: () => void;
  act: (op: string) => void;
  edit: (initial: any) => void;
}) {
  const s = useScope(),
    can = rowActions(r, s.actorId, canCreate),
    me = s.actorId;
  const more = can.print || can.edit || can.correct || can.ret;
  // Maker-checker: say why the next stage is someone else's to take.
  const note = r.isSelf
    ? "Your own payslip"
    : ["validated", "reviewed"].includes(r.status) &&
        r.actions.includes("approve") &&
        (r.created_by === me || r.reviewed_by === me)
      ? "You prepared this result; another approver gives the final approval."
      : r.status === "validated" && !r.actions.includes("approve")
        ? "Sent for approval. An Admin or Super Admin approves it."
        : undefined;
  return (
    <ActionBar note={note}>
      {more && (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              aria-label="More actions for this result"
              className="size-9 min-h-9"
            >
              <Ellipsis className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-60">
            {can.print && (
              <>
                <DropdownMenuItem asChild>
                  <a
                    target="_blank"
                    rel="noreferrer"
                    href={`/payroll/${r.id}/print?siteId=${s.siteId}`}
                  >
                    <Printer />
                    Print / PDF
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href={`/payroll/${r.id}/csv?siteId=${s.siteId}`}>
                    <Download />
                    Download CSV
                  </a>
                </DropdownMenuItem>
              </>
            )}
            {can.print && (can.edit || can.correct || can.ret) && (
              <DropdownMenuSeparator />
            )}
            {can.edit && (
              <DropdownMenuItem onSelect={() => edit(r)}>
                <Pencil />
                Edit draft
              </DropdownMenuItem>
            )}
            {can.correct && (
              <DropdownMenuItem
                onSelect={() =>
                  edit({ ...r, id: undefined, version: 0, previousId: r.id })
                }
              >
                <FilePlus2 />
                Create correction revision
              </DropdownMenuItem>
            )}
            {can.ret && (
              <DropdownMenuItem onSelect={() => act("return")}>
                <Undo2 />
                Return to draft
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <Button variant="outline" onClick={openPayslip}>
        <ReceiptText className="size-4" />
        Payslip
      </Button>
      {can.pay && (
        <Button
          variant={can.ops.length ? "outline" : "default"}
          onClick={() => act("pay")}
        >
          <Banknote className="size-4" />
          Record payment
        </Button>
      )}
      {can.ops.map((op) => {
        const Icon = opIcon[op]!;
        return (
          <Button key={op} onClick={() => act(op)}>
            <Icon className="size-4" />
            {opLabel[op]}
          </Button>
        );
      })}
    </ActionBar>
  );
}
function PayrollDetail({ r, canCreate, close, edit, act }: any) {
  const s = useScope(),
    [reversing, setReversing] = useState<any>(null);
  const reversed = new Set(
    r.payments.filter((p: any) => p.reversesId).map((p: any) => p.reversesId),
  );
  const events = activity(r, s.actorId).map((e) => ({
    id: e.id,
    title: e.title,
    detail: e.note,
    metadata: e.meta,
  }));
  const snap = r.snapshot,
    can = rowActions(r, s.actorId, canCreate);
  const workflow =
    can.ops.length > 0 || can.pay || can.edit || can.ret || can.correct;
  return (
    <PanelDialog title={`Payslip · ${snap.employeeName}`} onClose={close} sheet>
      <div className="grid gap-6">
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={r.status} />
            <PaymentBadge r={r} />
            <span className="text-muted-foreground text-sm">
              {snap.employeeCode} · Revision {r.revision}
            </span>
            {can.print && (
              <span className="ml-auto flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a
                    target="_blank"
                    rel="noreferrer"
                    href={`/payroll/${r.id}/print?siteId=${s.siteId}`}
                  >
                    <Printer className="size-4" />
                    Print / PDF
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a
                    aria-label="Download CSV"
                    href={`/payroll/${r.id}/csv?siteId=${s.siteId}`}
                  >
                    <Download className="size-4" />
                    CSV
                  </a>
                </Button>
              </span>
            )}
          </div>
          <div className="bg-muted/40 grid gap-1 rounded-lg border p-4">
            <p className="text-muted-foreground text-sm">
              {periodLabel(r.periodStart, r.periodEnd)} ·{" "}
              <span className="tabular-nums">
                {r.periodStart} – {r.periodEnd}
              </span>
            </p>
            <p className="text-3xl font-semibold tracking-tight">
              <span className="text-muted-foreground text-base font-medium">
                Net
              </span>{" "}
              <Money paise={snap.netPaise} />
            </p>
            <p className="text-muted-foreground text-sm">
              Gross <Money paise={snap.grossPaise} /> · Deductions{" "}
              <Money paise={snap.deductionPaise} />
            </p>
          </div>
        </div>
        <Block title="Earnings and deductions">
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {["Component", "Calculation", "Amount"].map((h) => (
                    <TableHead
                      key={h}
                      className={cn(
                        "bg-muted/40 static px-3 tracking-normal normal-case",
                        h === "Amount" && "text-right",
                      )}
                    >
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {snap.lines.map((l: any) => (
                  <TableRow key={l.code}>
                    <TableCell className="text-sm">
                      <span className="font-medium">{l.label}</span>{" "}
                      <span className="text-muted-foreground text-xs">
                        {humanize(l.kind)}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm tabular-nums">
                      ₹{money(l.paise)} × {l.numerator}/{l.denominator}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium tabular-nums">
                      {l.kind === "deduction" ? "−" : ""}₹
                      {money(l.calculatedPaise)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Block>
        {snap.attendanceSummary && (
          <Block title="Attendance used for this pay">
            <AttendanceFacts a={snap.attendanceSummary} />
          </Block>
        )}
        <Block title="Inputs and rules">
          <dl className="grid gap-3 text-sm [&_dd]:m-0 [&_dt]:m-0">
            {[
              ["Accountant-approved policy version", snap.policyVersion],
              ["Rules, rounding assumptions and exclusions", snap.assumptions],
              ["Attendance inputs", snap.attendanceNote],
              ["Engine · rounding", `${snap.engineVersion} · ${snap.rounding}`],
            ].map(([k, v]) => (
              <div key={k} className="grid gap-0.5">
                <dt className="text-muted-foreground text-xs">{k}</dt>
                <dd className="whitespace-pre-wrap">{v || "—"}</dd>
              </div>
            ))}
          </dl>
        </Block>
        <Block title="Payment">
          {r.duePaise == null ? (
            <p className="text-muted-foreground text-sm">
              {r.superseded
                ? "A later published revision replaced this result; payments are tracked there."
                : "Payments can be recorded once this result is approved."}
            </p>
          ) : (
            <dl className="grid grid-cols-3 gap-3 rounded-lg border p-3 text-sm [&_dd]:m-0 [&_dt]:m-0">
              {[
                ["Net pay", snap.netPaise],
                ["Paid so far", r.paidPaise],
                ["Balance due", r.duePaise],
              ].map(([k, v]) => (
                <div key={k} className="grid gap-0.5">
                  <dt className="text-muted-foreground text-xs">{k}</dt>
                  <dd
                    className={cn(
                      "font-semibold tabular-nums",
                      k === "Balance due" && BigInt(v) > 0n && "text-warning",
                    )}
                  >
                    <Money paise={v} />
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {r.payments.length > 0 && (
            <ul className="divide-y rounded-lg border text-sm">
              {r.payments.map((p: any) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
                >
                  <div className="grid min-w-0 gap-0.5">
                    <span className="font-medium tabular-nums">
                      {p.kind === "reversal" ? "−" : ""}₹{money(p.paise)} ·{" "}
                      {methodLabel[p.method]}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {p.reference} · paid on {formatDate(p.paidOn)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.kind === "reversal" && (
                      <Badge variant="destructive">Reversal</Badge>
                    )}
                    {reversed.has(p.id) && (
                      <Badge variant="secondary">Reversed</Badge>
                    )}
                    {p.kind === "payment" &&
                      !reversed.has(p.id) &&
                      !r.isSelf &&
                      r.actions.includes("manage") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setReversing(p)}
                        >
                          <Undo2 className="size-4" />
                          Reverse
                        </Button>
                      )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Block>
        <Block title="Site allocations">
          <ul className="divide-y rounded-lg border text-sm">
            {r.allocations.map((a: any) => (
              <li
                key={a.siteId}
                className="flex items-center justify-between gap-3 px-3 py-2"
              >
                <span>
                  {s.sites.find((x) => x.id === a.siteId)?.name ?? a.siteId}
                </span>
                <span className="tabular-nums">
                  <Money paise={a.paise} />
                </span>
              </li>
            ))}
          </ul>
        </Block>
        <Block title="History">
          {/* The shared timeline draws its own connectors; drop its legacy frame. */}
          <div className="[&_.timeline]:m-0 [&_.timeline]:border-l-0 [&_.timeline]:p-0">
            <Timeline items={events} />
          </div>
        </Block>
      </div>
      {workflow && (
        // Sticky inside the padded scroll body: -bottom-6 pins it flush.
        <div className="bg-background sticky -bottom-6 -mx-6 mt-6 -mb-6 flex flex-wrap justify-end gap-2 border-t px-6 py-4">
          {can.ret && (
            <Button variant="outline" onClick={() => act("return")}>
              <Undo2 className="size-4" />
              Return to draft
            </Button>
          )}
          {can.correct && (
            <Button
              variant="outline"
              onClick={() =>
                edit({ ...r, id: undefined, version: 0, previousId: r.id })
              }
            >
              <FilePlus2 className="size-4" />
              Create correction revision
            </Button>
          )}
          {can.edit && (
            <Button variant="outline" onClick={() => edit(r)}>
              <Pencil className="size-4" />
              Edit draft
            </Button>
          )}
          {can.pay && (
            <Button onClick={() => act("pay")}>
              <Banknote className="size-4" />
              Record payment
            </Button>
          )}
          {can.ops.map((op) => {
            const Icon = opIcon[op]!;
            return (
              <Button key={op} onClick={() => act(op)}>
                <Icon className="size-4" />
                {opLabel[op]}
              </Button>
            );
          })}
        </div>
      )}
      {reversing && (
        <ReverseDialog payment={reversing} close={() => setReversing(null)} />
      )}
    </PanelDialog>
  );
}
function useSubmit() {
  const write = useWrite(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const submit = async (operation: string, input: unknown) => {
    setBusy(true);
    setError("");
    try {
      const r = await write<any>(PayrollCommandDocument, { operation, input });
      return r.payrollCommand;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return { submit, busy, error, setError };
}
/** Result rows a batch dialog applies to, with one amount each. */
function ResultList({
  rows,
  paise,
}: {
  rows: any[];
  paise: (r: any) => string;
}) {
  return (
    <ul className="max-h-48 divide-y overflow-y-auto rounded-lg border text-sm">
      {rows.map((r) => (
        <li
          key={r.id}
          className="flex items-center justify-between gap-3 px-3 py-2"
        >
          <span className="min-w-0">
            <span className="font-medium">{r.snapshot.employeeName}</span>{" "}
            <span className="text-muted-foreground">
              · {periodLabel(r.periodStart, r.periodEnd)}
            </span>
          </span>
          <span className="tabular-nums">
            <Money paise={paise(r)} />
          </span>
        </li>
      ))}
    </ul>
  );
}
const defaultReason: Record<string, string> = {
  validate: "Checked the suggested pay and attendance; sent for approval.",
  approve: "Approved after checking pay and attendance.",
  publish: "Payslips released to employees.",
};
function PayrollDecision({
  rows,
  op,
  close,
}: {
  rows: any[];
  op: string;
  close: (done?: boolean) => void;
}) {
  const f = useSubmit(),
    [reason, setReason] = useState(defaultReason[op] ?? ""),
    [clientId] = useState(() => crypto.randomUUID());
  const single = rows.length === 1;
  const Icon = opIcon[op] ?? ListChecks;
  return (
    <Dialog open onOpenChange={(v) => !v && close()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {op === "return"
              ? "Return to draft"
              : `${opLabel[op] ?? op} payroll`}
            {single ? "" : ` · ${rows.length} results`}
          </DialogTitle>
          <DialogDescription>
            Review the calculation and recorded inputs before continuing. A
            stale version or prohibited self-approval will be rejected
            {single ? "" : "; the whole batch applies together or not at all"}.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const input = single
              ? {
                  id: rows[0].id,
                  expectedVersion: rows[0].version,
                  clientId,
                  reason,
                }
              : {
                  items: rows.map((r: any) => ({
                    id: r.id,
                    expectedVersion: r.version,
                  })),
                  clientId,
                  reason,
                };
            if (await f.submit(op, input)) close(true);
          }}
        >
          <ResultList rows={rows} paise={(r) => r.snapshot.netPaise} />
          <Field
            label="Reason"
            htmlFor="payroll-decision-reason"
            hint="At least 8 characters. Kept in the result's history."
          >
            <Textarea
              id="payroll-decision-reason"
              required
              minLength={8}
              maxLength={2000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
          <Problem error={f.error} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => close()}>
              Cancel
            </Button>
            <Button type="submit" disabled={f.busy}>
              {f.busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Icon className="size-4" />
              )}
              {op === "return" ? "Return to draft" : opLabel[op]}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
function PaymentDialog({
  rows,
  close,
}: {
  rows: any[];
  close: (done?: boolean) => void;
}) {
  const f = useSubmit(),
    single = rows.length === 1,
    [form, setForm] = useState({
      amount: single ? plainMoney(rows[0].duePaise) : "",
      method: "bank_transfer",
      reference: "",
      paidOn: today(),
      reason: "",
    }),
    [clientId, setClientId] = useState(() => crypto.randomUUID());
  const set = (k: string, v: string) => {
    setClientId(crypto.randomUUID());
    setForm({ ...form, [k]: v });
  };
  const total = rows.reduce((n, r) => n + BigInt(r.duePaise), 0n).toString();
  return (
    <Dialog open onOpenChange={(v) => !v && close()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {single ? "Record payment" : `Record ${rows.length} payments`}
          </DialogTitle>
          <DialogDescription>
            Record a salary payment that has already been made outside this
            system. Recorded payments cannot be edited; a mistake is corrected
            by a reversal.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            let items;
            try {
              items = single
                ? [{ id: rows[0].id, paise: rupeesToPaise(form.amount) }]
                : rows.map((r) => ({ id: r.id, paise: r.duePaise }));
            } catch (err) {
              return f.setError((err as Error).message);
            }
            const { amount: _, ...rest } = form;
            if (await f.submit("pay", { clientId, items, ...rest }))
              close(true);
          }}
        >
          {single ? (
            <Field
              label="Amount (₹)"
              htmlFor="payment-amount"
              hint={
                <>
                  Balance due <Money paise={rows[0].duePaise} /> ·{" "}
                  {rows[0].snapshot.employeeName} ·{" "}
                  {periodLabel(rows[0].periodStart, rows[0].periodEnd)}
                </>
              }
            >
              <Input
                id="payment-amount"
                required
                inputMode="decimal"
                className="tabular-nums"
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
              />
            </Field>
          ) : (
            <div className="grid gap-2">
              <ResultList rows={rows} paise={(r) => r.duePaise} />
              <p className="text-sm">
                Pays the full balance due for each result:{" "}
                <strong className="tabular-nums">
                  <Money paise={total} />
                </strong>{" "}
                in total.
              </p>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Method" htmlFor="payment-method">
              <NativeSelect
                id="payment-method"
                value={form.method}
                onChange={(e) => set("method", e.target.value)}
              >
                {paymentMethods.map((m) => (
                  <option key={m} value={m}>
                    {methodLabel[m]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Paid on" htmlFor="payment-date">
              <Input
                id="payment-date"
                required
                type="date"
                max={today()}
                value={form.paidOn}
                onChange={(e) => set("paidOn", e.target.value)}
              />
            </Field>
          </div>
          <Field
            label="Reference (UTR, cheque or voucher number)"
            htmlFor="payment-reference"
          >
            <Input
              id="payment-reference"
              required
              maxLength={64}
              pattern="[A-Za-z0-9][A-Za-z0-9 /._\-]*"
              value={form.reference}
              onChange={(e) => set("reference", e.target.value)}
            />
          </Field>
          <Field label="Note" htmlFor="payment-note">
            <Textarea
              id="payment-note"
              required
              minLength={8}
              maxLength={2000}
              value={form.reason}
              onChange={(e) => set("reason", e.target.value)}
            />
          </Field>
          <Problem error={f.error} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => close()}>
              Cancel
            </Button>
            <Button type="submit" disabled={f.busy}>
              {f.busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Banknote className="size-4" />
              )}
              Record payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
function ReverseDialog({ payment, close }: any) {
  const f = useSubmit(),
    [reason, setReason] = useState(""),
    [clientId] = useState(() => crypto.randomUUID());
  return (
    <Dialog open onOpenChange={(v) => !v && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reverse payment</DialogTitle>
          <DialogDescription>
            Reverses ₹{money(payment.paise)} ({methodLabel[payment.method]}{" "}
            {payment.reference}). Use this for a bounced, failed or mistaken
            payment. The original stays in the history.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (
              await f.submit("reverse_payment", {
                clientId,
                paymentId: payment.id,
                reason,
              })
            )
              close();
          }}
        >
          <Field label="Reason" htmlFor="payment-reverse-reason">
            <Textarea
              id="payment-reverse-reason"
              required
              minLength={8}
              maxLength={2000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
          <Problem error={f.error} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={f.busy}>
              {f.busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Undo2 className="size-4" />
              )}
              Reverse payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
/** Before the 20th, payroll usually closes the previous month. */
const runMonth = () => {
  const d = today();
  return Number(d.slice(8, 10)) < 20
    ? shiftMonth(d.slice(0, 7), -1)
    : d.slice(0, 7);
};
function RunDialog({ close }: { close: () => void }) {
  const f = useSubmit(),
    employments = useEmployments(),
    month = runMonth(),
    [form, setForm] = useState({
      periodStart: monthRange(month).from,
      periodEnd: monthRange(month).to,
      attendanceNote:
        "Payable days suggested from check-ins, approved leave, rosters and holidays.",
      reason: `Monthly payroll for ${monthName.format(new Date(`${month}-15T00:00:00`))}`,
      reviewed: false,
    }),
    [clientId, setClientId] = useState(() => crypto.randomUUID()),
    [result, setResult] = useState<any>(null);
  const set = (k: string, v: unknown) => {
    setClientId(crypto.randomUUID());
    setForm({ ...form, [k]: v });
  };
  const name = (id: string) =>
    employments.data?.payroll.employments.find((e: any) => e.id === id)?.name ??
    "Employee";
  return (
    <Dialog open onOpenChange={(v) => !v && close()}>
      <DialogContent className={result ? "sm:max-w-2xl" : "sm:max-w-lg"}>
        {result ? (
          <>
            <DialogHeader>
              <DialogTitle>Payroll run finished</DialogTitle>
              <DialogDescription>
                <strong className="text-foreground">
                  {result.created.length}
                </strong>{" "}
                draft{result.created.length === 1 ? "" : "s"} prepared with pay
                suggested from attendance. Open each one, check the payable days
                and amount, then Send for approval.
              </DialogDescription>
            </DialogHeader>
            {result.truncated && (
              <Alert variant="warning">
                <TriangleAlert />
                <AlertDescription>
                  More than 500 employments matched; run again to continue.
                </AlertDescription>
              </Alert>
            )}
            {result.skipped.length > 0 && (
              <div className="max-h-72 overflow-y-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      {["Skipped employee", "Reason"].map((h) => (
                        <TableHead
                          key={h}
                          className="bg-muted/40 px-3 tracking-normal normal-case"
                        >
                          {h}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.skipped.map((x: any) => (
                      <TableRow key={x.employmentId}>
                        <TableCell className="text-sm font-medium">
                          {name(x.employmentId)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm whitespace-normal">
                          {skipLabel[x.reason] ?? x.reason}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <DialogFooter>
              <Button onClick={close}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Run payroll</DialogTitle>
              <DialogDescription>
                Prepares a draft for every employee with a salary. Earnings are
                prorated by payable days: absent rostered (or Mon–Sat) days and
                LOP leave are unpaid; approved leave, holidays and weekly offs
                are paid. Anyone with no check-ins keeps full pay and is flagged
                for you to check. Up to 100 drafts per run.
              </DialogDescription>
            </DialogHeader>
            <form
              className="grid gap-4"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!form.reviewed)
                  return f.setError(
                    "Accountant review acknowledgment is required",
                  );
                const { reviewed: _, ...input } = form;
                const r = await f.submit("run", { clientId, ...input });
                if (r) setResult(r);
              }}
            >
              <Field label="Pay month" htmlFor="run-month">
                <Input
                  id="run-month"
                  type="month"
                  required
                  value={form.periodStart.slice(0, 7)}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const r = monthRange(e.target.value);
                    setClientId(crypto.randomUUID());
                    setForm({
                      ...form,
                      periodStart: r.from,
                      periodEnd: r.to,
                      reason: `Monthly payroll for ${monthName.format(new Date(`${e.target.value}-15T00:00:00`))}`,
                    });
                  }}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Period start" htmlFor="run-start">
                  <Input
                    id="run-start"
                    required
                    type="date"
                    value={form.periodStart}
                    onChange={(e) => set("periodStart", e.target.value)}
                  />
                </Field>
                <Field label="Period end" htmlFor="run-end">
                  <Input
                    id="run-end"
                    required
                    type="date"
                    value={form.periodEnd}
                    onChange={(e) => set("periodEnd", e.target.value)}
                  />
                </Field>
              </div>
              <Field
                label="Attendance inputs / gaps / approved overtime reference"
                htmlFor="run-attendance"
              >
                <Textarea
                  id="run-attendance"
                  required
                  minLength={8}
                  value={form.attendanceNote}
                  onChange={(e) => set("attendanceNote", e.target.value)}
                />
              </Field>
              <Field label="Reason" htmlFor="run-reason">
                <Textarea
                  id="run-reason"
                  required
                  minLength={8}
                  value={form.reason}
                  onChange={(e) => set("reason", e.target.value)}
                />
              </Field>
              <label className="flex items-start gap-3 rounded-lg border p-3 text-sm font-normal">
                <input
                  required
                  type="checkbox"
                  className={cn(tick, "mt-0.5")}
                  checked={form.reviewed}
                  onChange={(e) => set("reviewed", e.target.checked)}
                />
                I will check each suggested amount before sending it for
                approval.
              </label>
              <Problem error={f.error} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={close}>
                  Cancel
                </Button>
                <Button type="submit" disabled={f.busy}>
                  {f.busy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Play className="size-4" />
                  )}
                  Prepare drafts
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
const blankLine = () => ({
  code: "",
  label: "",
  kind: "earning",
  amount: "",
  numerator: 1,
  denominator: 1,
});
const kinds = [
  "earning",
  "deduction",
  "overtime",
  "bonus",
  "reimbursement",
  "adjustment",
];
const lineFields = [
  ["code", "Component code", "BASIC"],
  ["label", "Component name", "Basic salary"],
  ["amount", "Base amount (₹)", "0.00"],
  ["numerator", "Paid units", ""],
  ["denominator", "Base units", ""],
] as const;
type LineField = (typeof lineFields)[number];
// Editor amounts are rupee text; conversion to paise is exact and happens on use.
const toLines = (lines: any[]) =>
  lines.map(({ amount, ...l }) => ({ ...l, paise: rupeesToPaise(amount) }));
const fromLines = (lines: any[]) =>
  lines.map(({ paise, calculatedPaise: _, ...l }) => ({
    ...l,
    amount: plainMoney(paise),
  }));
function PayrollEditor({ initial, close }: any) {
  const s = useScope(),
    f = useSubmit(),
    employments = useEmployments(),
    [form, setForm] = useState<any>({
      employmentId: initial.employment_id ?? "",
      periodStart: initial.periodStart ?? "",
      periodEnd: initial.periodEnd ?? "",
      lines: initial.input?.lines
        ? fromLines(initial.input.lines)
        : [blankLine()],
      policyVersion: initial.input?.policyVersion ?? "",
      assumptions: initial.input?.assumptions ?? "",
      attendanceNote: initial.snapshot?.attendanceNote ?? "",
      reason: "",
      reviewed: false,
      allocations: Object.fromEntries(
        (initial.allocations ?? []).map((a: any) => [
          a.siteId,
          plainMoney(a.paise),
        ]),
      ),
      csv: "",
    }),
    [clientId, setClientId] = useState(() => crypto.randomUUID());
  const update = (k: string, v: any) => {
    setClientId(crypto.randomUUID());
    setForm({ ...form, [k]: v });
  };
  const setLine = (i: number, k: string, v: unknown) =>
    update(
      "lines",
      form.lines.map((x: any, j: number) => (i === j ? { ...x, [k]: v } : x)),
    );
  const calculation = () => ({
    lines: toLines(form.lines),
    rounding: "half_up_line",
    accountantReview: true,
    policyVersion: form.policyVersion,
    assumptions: form.assumptions,
  });
  // Unfinished inputs only hide the preview; a broken rule (duplicate code,
  // deductions above earnings) is named, as it is why saving is disabled.
  let preview: any,
    problem = "";
  try {
    const input = calculation();
    try {
      preview = calculatePayroll(input);
    } catch (e) {
      if (!(e as { issues?: unknown }).issues) problem = (e as Error).message;
    }
  } catch {}
  const choices = employments.data?.payroll.employments ?? [];
  const locked = !!initial.id || !!initial.previousId;
  return (
    <Dialog open onOpenChange={(v) => !v && close()}>
      <DialogContent className="flex flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b px-6 py-4 pr-12">
          <DialogTitle>
            {initial.previousId
              ? "Correction revision"
              : initial.id
                ? "Edit payroll draft"
                : "Prepare payroll"}
          </DialogTitle>
          <DialogDescription>
            A draft from explicit inputs. It is sent for approval and approved
            by an Admin or Super Admin before it is published.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex min-h-0 flex-1 flex-col gap-0"
          onSubmit={async (e) => {
            e.preventDefault();
            let input;
            try {
              if (!form.reviewed)
                throw Error("Accountant review acknowledgment is required");
              const allocations = Object.entries(
                form.allocations as Record<string, string>,
              )
                .filter(([, v]) => v.trim())
                .map(([siteId, v]) => ({ siteId, paise: rupeesToPaise(v) }));
              input = {
                clientId,
                expectedVersion: initial.version ?? 0,
                ...(initial.id ? { id: initial.id } : {}),
                employmentId: form.employmentId,
                periodStart: form.periodStart,
                periodEnd: form.periodEnd,
                calculation: calculation(),
                allocations: allocations.length
                  ? allocations
                  : [{ siteId: s.siteId, paise: preview?.netPaise }],
                attendanceNote: form.attendanceNote,
                reason: form.reason,
                previousId: initial.previousId ?? initial.previous_id ?? null,
              };
            } catch (err) {
              return f.setError((err as Error).message);
            }
            if (await f.submit("save", input)) close();
          }}
        >
          <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto px-6 py-5">
            <Block title="Employee and period">
              <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
                <Field
                  label="Employment / legal employer"
                  htmlFor="payroll-employment"
                >
                  <NativeSelect
                    id="payroll-employment"
                    required
                    disabled={locked}
                    value={form.employmentId}
                    onChange={(e) => update("employmentId", e.target.value)}
                  >
                    <option value="">
                      {employments.isPending
                        ? "Loading employments…"
                        : "Choose employment"}
                    </option>
                    {form.employmentId &&
                      !choices.some((e: any) => e.id === form.employmentId) && (
                        <option value={form.employmentId}>
                          {initial.snapshot?.employeeName ??
                            "Current employment"}
                        </option>
                      )}
                    {choices.map((e: any) => (
                      <option key={e.id} value={e.id}>
                        {e.name} · {e.code} · {e.legalEmployer}
                        {e.endsOn ? ` (ended ${formatDate(e.endsOn)})` : ""}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label="Start" htmlFor="payroll-start">
                  <Input
                    id="payroll-start"
                    required
                    type="date"
                    disabled={locked}
                    value={form.periodStart}
                    onChange={(e) => update("periodStart", e.target.value)}
                  />
                </Field>
                <Field label="End" htmlFor="payroll-end">
                  <Input
                    id="payroll-end"
                    required
                    type="date"
                    disabled={locked}
                    value={form.periodEnd}
                    onChange={(e) => update("periodEnd", e.target.value)}
                  />
                </Field>
              </div>
            </Block>
            <Block
              title="Pay components"
              description="Enter amounts in rupees (up to two decimals). Ratios represent explicit paid units, never inferred absence."
              actions={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => update("lines", [...form.lines, blankLine()])}
                >
                  <Plus className="size-4" />
                  Add component
                </Button>
              }
            >
              {form.lines.map((l: any, i: number) => {
                const field = ([k, label, placeholder]: LineField) => {
                  const units = k === "numerator" || k === "denominator";
                  return (
                    <Field key={k} label={label} htmlFor={`line-${i}-${k}`}>
                      <Input
                        id={`line-${i}-${k}`}
                        required
                        value={l[k]}
                        placeholder={placeholder || undefined}
                        inputMode={
                          k === "amount"
                            ? "decimal"
                            : units
                              ? "numeric"
                              : undefined
                        }
                        className={cn(k === "amount" && "tabular-nums")}
                        onChange={(e) =>
                          setLine(
                            i,
                            k,
                            units ? Number(e.target.value) : e.target.value,
                          )
                        }
                      />
                    </Field>
                  );
                };
                return (
                  <div
                    key={i}
                    role="group"
                    aria-label={`Component ${i + 1}`}
                    className="grid gap-3 rounded-lg border p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">
                        Component {i + 1}
                        {preview && (
                          <span className="text-muted-foreground font-normal tabular-nums">
                            {" "}
                            · {l.kind === "deduction" ? "−" : ""}₹
                            {money(preview.lines[i].calculatedPaise)}
                          </span>
                        )}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove component ${i + 1}`}
                        onClick={() =>
                          update(
                            "lines",
                            form.lines.filter((_: any, j: number) => i !== j),
                          )
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {lineFields.slice(0, 2).map(field)}
                      <Field label="Type" htmlFor={`line-${i}-kind`}>
                        <NativeSelect
                          id={`line-${i}-kind`}
                          value={l.kind}
                          onChange={(e) => setLine(i, "kind", e.target.value)}
                        >
                          {kinds.map((k) => (
                            <option key={k} value={k}>
                              {humanize(k)}
                            </option>
                          ))}
                        </NativeSelect>
                      </Field>
                      {lineFields.slice(2).map(field)}
                    </div>
                  </div>
                );
              })}
              <Disclosure icon={FileSpreadsheet} title="Import component CSV">
                <p className="text-muted-foreground text-xs">
                  Header: code,label,kind,paise,numerator,denominator (amounts
                  in paise)
                </p>
                <Textarea
                  aria-label="Component CSV"
                  className="font-mono text-xs"
                  value={form.csv}
                  onChange={(e) => update("csv", e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="justify-self-start"
                  onClick={() => {
                    try {
                      update("lines", fromLines(importPayrollCsv(form.csv)));
                      f.setError("");
                    } catch (e) {
                      f.setError((e as Error).message);
                    }
                  }}
                >
                  Validate and use CSV
                </Button>
              </Disclosure>
            </Block>
            <Block title="Policy and assumptions">
              <Field
                label="Accountant-approved policy version"
                htmlFor="payroll-policy"
              >
                <Input
                  id="payroll-policy"
                  required
                  value={form.policyVersion}
                  onChange={(e) => update("policyVersion", e.target.value)}
                />
              </Field>
              <Field
                label="Rules, rounding assumptions and exclusions"
                htmlFor="payroll-assumptions"
              >
                <Textarea
                  id="payroll-assumptions"
                  required
                  minLength={8}
                  value={form.assumptions}
                  onChange={(e) => update("assumptions", e.target.value)}
                />
              </Field>
            </Block>
            <Block title="Attendance and allocation">
              <Field
                label="Attendance inputs / gaps / approved overtime reference"
                htmlFor="payroll-attendance"
              >
                <Textarea
                  id="payroll-attendance"
                  required
                  minLength={8}
                  value={form.attendanceNote}
                  onChange={(e) => update("attendanceNote", e.target.value)}
                />
              </Field>
              <Disclosure
                icon={Layers}
                title="Split net pay across authorized sites"
              >
                <p className="text-muted-foreground text-xs">
                  Blank uses this site. Allocations must add up to net pay.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {s.sites.map((site) => (
                    <Field
                      key={site.id}
                      label={`${site.name} (₹)`}
                      htmlFor={`payroll-allocation-${site.id}`}
                    >
                      <Input
                        id={`payroll-allocation-${site.id}`}
                        inputMode="decimal"
                        className="tabular-nums"
                        value={form.allocations[site.id] ?? ""}
                        onChange={(e) =>
                          update("allocations", {
                            ...form.allocations,
                            [site.id]: e.target.value,
                          })
                        }
                      />
                    </Field>
                  ))}
                </div>
              </Disclosure>
            </Block>
            <Block title="Reason and review">
              <Field label="Change reason" htmlFor="payroll-reason">
                <Textarea
                  id="payroll-reason"
                  required
                  minLength={8}
                  value={form.reason}
                  onChange={(e) => update("reason", e.target.value)}
                />
              </Field>
              <label className="flex items-start gap-3 rounded-lg border p-3 text-sm font-normal">
                <input
                  required
                  type="checkbox"
                  className={cn(tick, "mt-0.5")}
                  checked={form.reviewed}
                  onChange={(e) => update("reviewed", e.target.checked)}
                />
                I confirm these inputs and rules have accountant review.
              </label>
            </Block>
          </div>
          {f.error && (
            <div className="border-t px-6 py-3">
              <Problem error={f.error} />
            </div>
          )}
          <div className="bg-muted/40 flex flex-wrap items-center justify-between gap-3 border-t px-6 py-4">
            <div className="min-w-0 grow basis-64">
              {preview ? (
                <>
                  <p className="text-lg font-semibold">
                    <span className="text-muted-foreground text-sm font-medium">
                      Net
                    </span>{" "}
                    <Money paise={preview.netPaise} />
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Gross <Money paise={preview.grossPaise} /> · Deductions{" "}
                    <Money paise={preview.deductionPaise} /> · half-up rounding
                    per line
                  </p>
                </>
              ) : (
                <p
                  className={cn(
                    "text-sm",
                    problem ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {problem ||
                    "Net pay appears once every component, the policy version and the assumptions are complete."}
                </p>
              )}
            </div>
            <div className="ml-auto flex gap-2">
              <Button type="button" variant="outline" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" disabled={f.busy || !preview}>
                {f.busy && <Loader2 className="size-4 animate-spin" />}
                Save draft
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
