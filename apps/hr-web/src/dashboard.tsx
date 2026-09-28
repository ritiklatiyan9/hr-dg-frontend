import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Command } from "cmdk";
import {
  ArrowUpRight,
  CalendarClock,
  CalendarDays,
  ChartNoAxesCombined,
  ClipboardCheck,
  CornerDownLeft,
  FileText,
  Inbox,
  Info,
  ListTodo,
  Radar,
  NotebookPen,
  Search,
  TreePalm,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import {
  DashboardDocument,
  EmployeeLookupDocument,
} from "../../../packages/contracts/src/generated";
import type { DashboardSnapshot } from "../../../packages/contracts/dashboard";
import { useScope, useScopedQuery } from "./workspace-context";
import { ErrorState, Heading, Skeleton, humanize, useT } from "./ui";
import { Section, StatCard } from "./components/shared/page";
import { BarList, DayChart } from "./components/shared/charts";
import { formatDate, formatDateTime } from "./components/shared/formatting";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Page = { to: string; label: string; icon: LucideIcon };

export function Dashboard() {
  const s = useScope(),
    t = useT();
  const q = useScopedQuery<{ dashboard: DashboardSnapshot }>(
    ["dashboard"],
    DashboardDocument,
    {},
    true,
    60000,
  );
  const can = (...keys: string[]) =>
    keys.some((k) => s.capabilities.includes(k));
  const decides = s.capabilities.some(
    (c) => c.endsWith(".review") || c.endsWith(".approve"),
  );
  // Same capability gates as the workspace navigation.
  const pages: Page[] = [
    [
      can("employees.view"),
      "employees",
      t("Employees", "कर्मचारी"),
      UsersRound,
    ],
    [
      can("attendance.view", "my_attendance.view"),
      "attendance",
      t("Attendance", "उपस्थिति"),
      CalendarClock,
    ],
    [
      can("attendance.view", "attendance.approve"),
      "attendance-review",
      t("Attendance approvals", "उपस्थिति स्वीकृतियाँ"),
      ClipboardCheck,
    ],
    [
      can("leave.view", "my_leave.view"),
      "leave",
      t("Leave", "छुट्टी"),
      TreePalm,
    ],
    [can("tasks.view"), "tasks", t("Tasks", "कार्य"), ListTodo],
    [
      can("my_dwr.view", "dwr_review.view"),
      "dwr",
      t("Daily work reports", "दैनिक कार्य रिपोर्ट"),
      NotebookPen,
    ],
    [decides, "approvals", t("Approvals", "स्वीकृतियाँ"), ClipboardCheck],
    [
      can("documents.view", "my_documents.view"),
      "documents",
      t("Documents", "दस्तावेज़"),
      FileText,
    ],
    [can("inbox.view"), "inbox", t("Inbox", "इनबॉक्स"), Inbox],
    [
      can("analytics.view"),
      "analytics",
      t("Management insights", "प्रबंधन विश्लेषण"),
      ChartNoAxesCombined,
    ],
  ]
    .filter(([show]) => show)
    .map(([, to, label, icon]) => ({ to, label, icon }) as Page);
  const d = q.data?.dashboard;
  return (
    <section className="grid gap-5">
      <Heading
        title={t("Dashboard", "डैशबोर्ड")}
        description={`${s.siteName} · ${t(
          "Today’s workforce, trends and the decisions waiting on you.",
          "आज का कार्यबल, रुझान और आपके निर्णय।",
        )}`}
      >
        <QuickLookup pages={pages} people={can("employees.view")} />
        <Badge
          variant="outline"
          className="h-9 gap-1.5 px-3 text-sm font-normal"
        >
          <CalendarDays className="size-4" />
          {formatDate(s.workDate)}
        </Badge>
        {can("analytics.view") && (
          <Button asChild variant="outline">
            <Link to="/analytics">
              <ChartNoAxesCombined className="size-4" />
              {t("Explore insights", "विश्लेषण देखें")}
            </Link>
          </Button>
        )}
      </Heading>
      {q.isPending ? (
        <Skeleton />
      ) : q.error ? (
        <ErrorState error={q.error} retry={() => void q.refetch()} />
      ) : (
        <DashboardBody d={d!} decides={decides} />
      )}
    </section>
  );
}

function DashboardBody({
  d,
  decides,
}: {
  d: DashboardSnapshot;
  decides: boolean;
}) {
  const t = useT();
  const waiting = d.approvals.reduce((n, a) => n + a.count, 0);
  const openTasks = d.tasks?.open.reduce((n, x) => n + x.count, 0) ?? 0;
  const filedToday = d.dwr?.trend.at(-1)?.filed ?? 0;
  const taskLabel: Record<string, string> = {
    todo: t("To do", "करना है"),
    in_progress: t("In progress", "जारी"),
    blocked: t("Blocked", "रुका हुआ"),
  };
  const dwrLabel: Record<string, string> = {
    none: t("Not started", "शुरू नहीं"),
    draft: t("Draft", "ड्राफ़्ट"),
    submitted: t("Submitted", "भेजी गई"),
    approved: t("Approved", "स्वीकृत"),
    returned: t("Returned", "वापस भेजी"),
  };
  const hr = d.hr ?? {};
  const hrRows = [
    [
      "expensesPending",
      t("Expenses awaiting decision", "निर्णय हेतु खर्च"),
      "/expenses",
    ],
    [
      "helpdeskOpen",
      t("Open helpdesk tickets", "खुले हेल्पडेस्क टिकट"),
      "/helpdesk",
    ],
    [
      "documentsExpiring",
      t(
        "Documents expired or expiring in 30 days",
        "30 दिन में समाप्त दस्तावेज़",
      ),
      "/documents",
    ],
    [
      "assetsAssigned",
      t("Assets with employees", "कर्मचारियों के पास संपत्ति"),
      "/assets",
    ],
  ].filter(([k]) => hr[k as keyof typeof hr] !== undefined) as [
    keyof typeof hr,
    string,
    string,
  ][];
  const kpis: ReactNode[] = [
    d.people && (
      <Kpi
        key="people"
        to="/employees"
        icon={UsersRound}
        tone="primary"
        label={t("Headcount", "कर्मचारी संख्या")}
        value={d.people.headcount}
        hint={t(
          `${d.people.joining} joining in 30 days`,
          `30 दिन में ${d.people.joining} जुड़ेंगे`,
        )}
      />
    ),
    d.attendance && (
      <Kpi
        key="attendance"
        to="/attendance"
        icon={CalendarClock}
        tone="success"
        label={t("Checked in today", "आज चेक-इन")}
        value={`${d.attendance.checkedIn} / ${d.attendance.rostered}`}
        hint={t(
          `photo check-in of rostered · ${d.attendance.onDuty} on duty now`,
          `रोस्टर में से फ़ोटो चेक-इन · ${d.attendance.onDuty} ड्यूटी पर`,
        )}
      />
    ),
    d.location && (
      <Kpi
        key="location"
        to="/tracking"
        icon={Radar}
        tone="info"
        label={t("Sharing location now", "अभी लोकेशन साझा")}
        value={d.location.now}
        hint={t(
          `${d.location.today} today · location only, not attendance`,
          `आज ${d.location.today} · केवल लोकेशन, उपस्थिति नहीं`,
        )}
      />
    ),
    d.leave && (
      <Kpi
        key="leave"
        to="/leave"
        icon={TreePalm}
        tone={d.leave.pending ? "warning" : "default"}
        label={t("On leave today", "आज छुट्टी पर")}
        value={d.leave.onLeave}
        hint={t(
          `${d.leave.pending} pending · ${d.leave.upcoming} starting this week`,
          `${d.leave.pending} लंबित · इस सप्ताह ${d.leave.upcoming}`,
        )}
      />
    ),
    (decides || waiting > 0) && (
      <Kpi
        key="approvals"
        to="/approvals"
        icon={ClipboardCheck}
        tone={waiting ? "warning" : "default"}
        label={t("Waiting on your decision", "आपके निर्णय हेतु")}
        value={`${waiting}${d.approvalsCapped ? "+" : ""}`}
        hint={
          waiting
            ? t("Oldest first in Approvals", "स्वीकृतियों में सबसे पुराने पहले")
            : t("Queue is clear", "कतार खाली है")
        }
      />
    ),
    d.tasks && (
      <Kpi
        key="tasks"
        to="/tasks"
        icon={ListTodo}
        tone={d.tasks.overdue ? "danger" : "default"}
        label={t("Open tasks", "खुले कार्य")}
        value={openTasks}
        hint={t(
          `${d.tasks.overdue} overdue · ${d.tasks.dueToday} due today`,
          `${d.tasks.overdue} विलंबित · आज ${d.tasks.dueToday}`,
        )}
      />
    ),
    d.dwr && (
      <Kpi
        key="dwr"
        to="/dwr?tab=reports&reports=team"
        icon={NotebookPen}
        tone="info"
        label={t("DWRs awaiting review", "समीक्षा हेतु DWR")}
        value={d.dwr.awaitingReview}
        hint={t(`${filedToday} filed today`, `आज ${filedToday} भेजी गईं`)}
      />
    ),
  ].filter(Boolean);
  const me = [
    d.me.onDuty !== null && (
      <MeChip
        key="duty"
        to="/attendance-mark"
        icon={CalendarClock}
        tone={d.me.onDuty ? "success" : "muted"}
      >
        {d.me.onDuty
          ? t("You are on duty", "आप ड्यूटी पर हैं")
          : t("You are not checked in", "आपने चेक-इन नहीं किया")}
      </MeChip>
    ),
    d.me.dwrStatus !== null && (
      <MeChip
        key="dwr"
        to="/dwr"
        icon={NotebookPen}
        tone={
          ["submitted", "approved"].includes(d.me.dwrStatus)
            ? "success"
            : d.me.dwrStatus === "returned"
              ? "warning"
              : "muted"
        }
      >
        {t("Your DWR today:", "आज की आपकी DWR:")}{" "}
        {dwrLabel[d.me.dwrStatus] ?? humanize(d.me.dwrStatus)}
      </MeChip>
    ),
    d.me.unread !== null && (
      <MeChip
        key="inbox"
        to="/inbox"
        icon={Inbox}
        tone={d.me.unread ? "warning" : "muted"}
      >
        {t(
          `${d.me.unread} unread in your inbox`,
          `इनबॉक्स में ${d.me.unread} अपठित`,
        )}
      </MeChip>
    ),
  ].filter(Boolean);
  const none =
    !kpis.length &&
    !d.attendance &&
    !d.dwr &&
    !d.people &&
    !d.leave &&
    !d.tasks;
  return (
    <>
      {me.length > 0 && (
        <div
          className="flex flex-wrap gap-2"
          aria-label={t("Your day", "आपका दिन")}
        >
          {me}
        </div>
      )}
      {kpis.length > 0 && (
        <div
          className={cn(
            "grid grid-cols-1 gap-3 sm:grid-cols-2",
            // Rows stay full: 5–6 tiles fill 3 or 6 columns, 7–8 fill 4.
            kpis.length >= 7
              ? "lg:grid-cols-3 xl:grid-cols-4"
              : kpis.length >= 5
                ? "lg:grid-cols-3 2xl:grid-cols-6"
                : "xl:grid-cols-4",
          )}
        >
          {kpis}
        </div>
      )}
      <div className="grid items-start gap-5 xl:grid-cols-3 [&>*]:min-w-0">
        {d.attendance && (
          <Section
            className="xl:col-span-2"
            title={t("Attendance, last 14 days", "उपस्थिति, पिछले 14 दिन")}
            description={t(
              "People with a recorded check-in each day against the roster. Missing check-ins are not absence.",
              "हर दिन रोस्टर के मुकाबले चेक-इन वाले लोग। चेक-इन न होना अनुपस्थिति नहीं है।",
            )}
            actions={<OpenLink to="/attendance" />}
          >
            <DayChart
              label={t(
                "Rostered and checked-in people per day",
                "प्रतिदिन रोस्टर और चेक-इन",
              )}
              data={d.attendance.trend}
              series={[
                {
                  key: "rostered",
                  label: t("Rostered", "रोस्टर"),
                  color: "text-muted-foreground/35",
                  kind: "column",
                },
                {
                  key: "checkedIn",
                  label: t("Checked in", "चेक-इन"),
                  color: "text-primary",
                  kind: "line",
                },
              ]}
            />
            <AttendanceFollowUp a={d.attendance} tz={d.timezone} />
          </Section>
        )}
        {(decides || waiting > 0) && (
          <Section
            title={t("Waiting on you", "आपकी प्रतीक्षा में")}
            actions={<OpenLink to="/approvals" />}
          >
            <BarList
              rows={d.approvals
                .sort((a, b) => b.count - a.count)
                .map((a) => ({
                  name: humanize(a.kind),
                  value: a.count,
                  to: "/approvals",
                }))}
              empty={t(
                "Nothing is waiting for your decision.",
                "आपके निर्णय हेतु कुछ नहीं।",
              )}
            />
          </Section>
        )}
        {d.dwr && (
          <Section
            className="xl:col-span-2"
            title={t("Daily work reports filed", "भेजी गई दैनिक रिपोर्ट")}
            description={t(
              "Submitted or approved DWRs by work date.",
              "कार्य तिथि अनुसार भेजी या स्वीकृत DWR।",
            )}
            actions={<OpenLink to="/dwr?tab=reports&reports=team" />}
          >
            <DayChart
              label={t("DWRs filed per day", "प्रतिदिन भेजी गई DWR")}
              data={d.dwr.trend}
              series={[
                {
                  key: "filed",
                  label: t("Filed", "भेजी गई"),
                  color: "text-primary",
                  kind: "column",
                },
              ]}
            />
          </Section>
        )}
        {d.tasks && (
          <Section
            title={t("Open tasks by status", "स्थिति अनुसार खुले कार्य")}
            actions={<OpenLink to="/tasks" />}
          >
            <BarList
              rows={d.tasks.open.map((x) => ({
                name: taskLabel[x.status] ?? humanize(x.status),
                value: x.count,
              }))}
              empty={t("No open tasks.", "कोई खुला कार्य नहीं।")}
            />
          </Section>
        )}
        {d.dwr && (
          <Section title={t("Today’s DWRs", "आज की DWR")}>
            <BarList
              rows={d.dwr.today.map((x) => ({
                name: dwrLabel[x.status] ?? humanize(x.status),
                value: x.count,
              }))}
              empty={t("No DWRs for today yet.", "आज की कोई DWR अभी नहीं।")}
            />
          </Section>
        )}
        {d.people && (
          <Section
            title={t("Headcount by department", "विभाग अनुसार कर्मचारी")}
            actions={<OpenLink to="/employees" />}
          >
            <BarList
              rows={d.people.departments.map((x) => ({
                name: x.name,
                value: x.count,
              }))}
              empty={t("No current assignments.", "कोई वर्तमान नियुक्ति नहीं।")}
            />
          </Section>
        )}
        {d.leave && (
          <Section
            title={t("Leave this month by type", "इस माह छुट्टी प्रकार अनुसार")}
            actions={<OpenLink to="/leave" />}
          >
            <BarList
              rows={d.leave.byType.map((x) => ({
                name: x.name,
                value: x.units,
              }))}
              format={(v) => t(`${v} days`, `${v} दिन`)}
              empty={t(
                "No leave requested this month.",
                "इस माह कोई छुट्टी नहीं।",
              )}
            />
          </Section>
        )}
        {(hrRows.length > 0 || d.payroll !== undefined) && (
          <Section
            title={t("HR services & payroll", "एचआर सेवाएँ और वेतन")}
            bodyClassName="grid gap-1 p-2"
          >
            {hrRows.map(([key, label, to]) => (
              <Link
                key={key}
                to={to}
                className="hover:bg-accent flex items-center justify-between gap-3 rounded-md px-3 py-2.5 text-sm transition-colors"
              >
                <span>{label}</span>
                <Badge
                  variant={hr[key] ? "warning" : "secondary"}
                  className="tabular-nums"
                >
                  {hr[key]}
                </Badge>
              </Link>
            ))}
            {d.payroll !== undefined && (
              <Link
                to="/payroll"
                className="hover:bg-accent grid gap-1.5 rounded-md px-3 py-2.5 text-sm transition-colors"
              >
                <span>
                  {d.payroll
                    ? t(
                        `Payroll ${formatDate(d.payroll.periodStart)} – ${formatDate(d.payroll.periodEnd)}`,
                        `वेतन ${formatDate(d.payroll.periodStart)} – ${formatDate(d.payroll.periodEnd)}`,
                      )
                    : t("No payroll results yet", "अभी कोई वेतन परिणाम नहीं")}
                </span>
                {d.payroll && (
                  <span className="flex flex-wrap gap-1.5">
                    {d.payroll.statuses.map((x) => (
                      <Badge
                        key={x.status}
                        variant={
                          x.status === "published" ? "success" : "outline"
                        }
                        className="tabular-nums"
                      >
                        {humanize(x.status)} · {x.count}
                      </Badge>
                    ))}
                  </span>
                )}
              </Link>
            )}
          </Section>
        )}
      </div>
      {none && (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          {t(
            "Your role has no team-wide modules at this site. Use the navigation or the lookup above.",
            "इस साइट पर आपकी भूमिका में टीम मॉड्यूल नहीं हैं। नेविगेशन या ऊपर खोज का उपयोग करें।",
          )}
        </p>
      )}
      <p className="text-muted-foreground flex items-start gap-2 text-xs">
        <Info className="mt-px size-3.5 shrink-0" />
        <span>
          {t("Updated", "अपडेट")} {formatDateTime(d.generatedAt)} ·{" "}
          {t(
            "Counts include only records you can open. Missing duty evidence is not absence.",
            "गिनती में केवल वही रिकॉर्ड जिन्हें आप खोल सकते हैं। ड्यूटी प्रमाण न होना अनुपस्थिति नहीं।",
          )}
        </span>
      </p>
    </>
  );
}

function Kpi({ to, ...card }: { to: string } & Parameters<typeof StatCard>[0]) {
  return (
    <Link
      to={to}
      className="focus-visible:ring-ring/50 block rounded-lg outline-none focus-visible:ring-[3px] [&>div]:h-full [&>div]:transition-colors hover:[&>div]:border-primary/40"
    >
      <StatCard {...card} />
    </Link>
  );
}

function MeChip({
  to,
  icon: Icon,
  tone,
  children,
}: {
  to: string;
  icon: LucideIcon;
  tone: "success" | "warning" | "muted";
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      className="bg-card hover:bg-accent inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
    >
      <span
        className={cn(
          "size-2 rounded-full",
          tone === "success"
            ? "bg-success"
            : tone === "warning"
              ? "bg-warning"
              : "bg-muted-foreground/40",
        )}
      />
      <Icon className="text-muted-foreground size-3.5" />
      {children}
    </Link>
  );
}

function OpenLink({ to }: { to: string }) {
  const t = useT();
  return (
    <Link
      to={to}
      className="text-primary inline-flex items-center gap-1 text-xs font-medium hover:underline"
    >
      {t("Open", "खोलें")}
      <ArrowUpRight className="size-3.5" />
    </Link>
  );
}

/** Jump to a page or an employee profile; "/" or ⌘K focuses it. */
function QuickLookup({ pages, people }: { pages: Page[]; people: boolean }) {
  const t = useT(),
    navigate = useNavigate(),
    input = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState(""),
    [open, setOpen] = useState(false),
    [search, setSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setSearch(q.trim()), 180);
    return () => clearTimeout(timer);
  }, [q]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing =
        /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable;
      if (
        (e.key === "k" && (e.metaKey || e.ctrlKey)) ||
        (e.key === "/" && !typing)
      ) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const found = useScopedQuery<{
    employeeLookup: { id: string; name: string; code: string }[];
  }>(
    ["lookup", search],
    EmployeeLookupDocument,
    { search },
    people && search.length >= 2,
  );
  const text = q.trim().toLowerCase();
  const matches = pages.filter((p) => p.label.toLowerCase().includes(text));
  const employees =
    search.length >= 2 ? (found.data?.employeeLookup ?? []) : [];
  const go = (to: string, state?: object) => {
    setQ("");
    setOpen(false);
    input.current?.blur();
    navigate(to, state && { state });
  };
  return (
    <Command
      shouldFilter={false}
      label={t("Quick lookup", "त्वरित खोज")}
      className="relative w-full sm:w-80"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setQ("");
          input.current?.blur();
        }
      }}
    >
      <div className="bg-card focus-within:ring-ring/50 flex h-9 items-center gap-2 rounded-md border px-3 focus-within:ring-[3px]">
        <Search className="text-muted-foreground size-4 shrink-0" />
        <Command.Input
          ref={input}
          value={q}
          onValueChange={(v) => {
            setQ(v);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          placeholder={
            people
              ? t("Find a person or page…", "व्यक्ति या पृष्ठ खोजें…")
              : t("Find a page…", "पृष्ठ खोजें…")
          }
          className="placeholder:text-muted-foreground h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-sm shadow-none outline-none"
        />
        <kbd className="text-muted-foreground bg-muted rounded border px-1.5 text-[10px]">
          /
        </kbd>
      </div>
      {open && text && (
        <Command.List
          onMouseDown={(e) => e.preventDefault()}
          className="bg-popover text-popover-foreground absolute top-11 right-0 z-30 max-h-80 w-full min-w-72 overflow-y-auto rounded-md border p-1 shadow-lg [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium"
        >
          {found.isFetching && employees.length === 0 ? (
            <Command.Loading>
              <p className="text-muted-foreground px-3 py-4 text-sm">
                {t("Searching…", "खोज रहे हैं…")}
              </p>
            </Command.Loading>
          ) : (
            <Command.Empty className="text-muted-foreground px-3 py-4 text-sm">
              {t("No matches", "कोई परिणाम नहीं")}
            </Command.Empty>
          )}
          {employees.length > 0 && (
            <Command.Group heading={t("People", "लोग")}>
              {employees.map((e) => (
                <LookupItem
                  key={e.id}
                  value={`person-${e.id}`}
                  icon={UserRound}
                  onSelect={() => go("/employees", { openEmployee: e.id })}
                  hint={e.code}
                >
                  {e.name}
                </LookupItem>
              ))}
            </Command.Group>
          )}
          {matches.length > 0 && (
            <Command.Group heading={t("Pages", "पृष्ठ")}>
              {matches.map((p) => (
                <LookupItem
                  key={p.to}
                  value={`page-${p.to}`}
                  icon={p.icon}
                  onSelect={() => go(`/${p.to}`)}
                >
                  {p.label}
                </LookupItem>
              ))}
            </Command.Group>
          )}
        </Command.List>
      )}
    </Command>
  );
}

function LookupItem({
  value,
  icon: Icon,
  hint,
  onSelect,
  children,
}: {
  value: string;
  icon: LucideIcon;
  hint?: string;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className="data-[selected=true]:bg-accent group flex cursor-pointer items-center gap-2.5 rounded-sm px-2 py-2 text-sm"
    >
      <Icon className="text-muted-foreground size-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {hint && <span className="text-muted-foreground text-xs">{hint}</span>}
      <CornerDownLeft className="text-muted-foreground size-3.5 opacity-0 group-data-[selected=true]:opacity-100" />
    </Command.Item>
  );
}

/** Who still needs follow-up today: rostered without a check-in, and sessions
 * whose exit was never recorded. */
function AttendanceFollowUp({
  a,
  tz,
}: {
  a: NonNullable<DashboardSnapshot["attendance"]>;
  tz: string;
}) {
  const t = useT();
  const time = (iso: string) =>
    new Date(iso).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: tz,
    });
  const since = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: tz,
    });
  const unnamed = t("Employee", "कर्मचारी");
  const list = (
    title: string,
    count: number,
    rows: { key: string; name: string; detail: string }[],
  ) =>
    count > 0 && (
      <div className="min-w-0">
        <p className="mb-1.5 text-sm font-medium">
          {title}{" "}
          <span className="text-muted-foreground tabular-nums">· {count}</span>
        </p>
        <ul className="divide-y rounded-md border text-sm">
          {rows.map((r) => (
            <li
              key={r.key}
              className="flex items-center justify-between gap-3 px-3 py-2"
            >
              <span className="truncate">{r.name}</span>
              <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                {r.detail}
              </span>
            </li>
          ))}
          {count > rows.length && (
            <li className="px-3 py-2">
              <Link
                to="/attendance"
                className="text-primary text-xs font-medium hover:underline"
              >
                {t(
                  `+${count - rows.length} more in Attendance`,
                  `उपस्थिति में ${count - rows.length} और`,
                )}
              </Link>
            </li>
          )}
        </ul>
      </div>
    );
  const missing = list(
    t("Not checked in yet", "अभी चेक-इन नहीं"),
    a.notCheckedIn.count,
    a.notCheckedIn.people.map((p, i) => ({
      key: `${i}`,
      name: p.name ?? unnamed,
      detail: t(
        `Shift ${time(p.startsAt)}–${time(p.endsAt)}`,
        `शिफ़्ट ${time(p.startsAt)}–${time(p.endsAt)}`,
      ),
    })),
  );
  const stale = list(
    t("Exit not recorded", "निकास दर्ज नहीं"),
    a.exitNotRecorded.count,
    a.exitNotRecorded.people.map((p, i) => ({
      key: `${i}`,
      name: p.name ?? unnamed,
      detail: t(
        `Open since ${since(p.openedAt)}`,
        `${since(p.openedAt)} से खुला`,
      ),
    })),
  );
  if (!missing && !stale)
    return a.rostered > 0 ? (
      <p className="text-muted-foreground mt-4 text-sm">
        {t(
          "Everyone rostered today has checked in.",
          "आज रोस्टर के सभी लोगों ने चेक-इन किया है।",
        )}
      </p>
    ) : null;
  return (
    <div className="mt-5 grid gap-4 border-t pt-4 md:grid-cols-2">
      {missing}
      {stale}
    </div>
  );
}
