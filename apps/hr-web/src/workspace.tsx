import {
  Banknote,
  IndianRupee,
  ShieldCheck,
  Palette,
  BookOpenCheck,
  BriefcaseBusiness,
  CalendarClock,
  CalendarRange,
  ChartNoAxesCombined,
  ChevronRight,
  ClipboardCheck,
  ContactRound,
  FileClock,
  FingerprintPattern,
  Headset,
  Inbox,
  KeyRound,
  Laptop,
  ListTodo,
  MapPinned,
  Megaphone,
  MessageSquareLock,
  NotebookPen,
  Radar,
  ReceiptText,
  ScrollText,
  TreePalm,
  UserRoundCheck,
  UserRoundPen,
  UsersRound,
} from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";
import type { HrKind } from "@/shared/contracts/hr";
import { lazy, Suspense, useContext, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, Link, Navigate } from "react-router-dom";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  LayoutDashboard,
} from "lucide-react";
import { SiteSwitcher } from "./layouts/site-switcher";
import { Dialog } from "./ui";
const AnalyticsPanel = lazy(() =>
  import("./analytics-panel").then((m) => ({ default: m.AnalyticsPanel })),
);
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  ClipboardList,
  FileText,
  Globe2,
  Leaf,
  LogOut,
  Moon,
  Settings2,
  Sun,
} from "lucide-react";
import {
  BootstrapDocument,
  SiteScopeDocument,
  type BootstrapQuery,
  type SiteScopeQuery,
} from "@/shared/contracts/generated";
import { gql, isTransientFailure } from "./api";
import { ScopeBoundary, scopeKey } from "./scope";
import { ScopeContext } from "./workspace-context";
const InboxPanel = lazy(() =>
  import("./inbox-panel").then((m) => ({ default: m.InboxPanel })),
);
const TrackingPanel = lazy(() =>
  import("./tracking-panel").then((m) => ({ default: m.TrackingPanel })),
);
const TasksPanel = lazy(() =>
  import("./tasks-panel").then((m) => ({ default: m.TasksPanel })),
);
const LeavePanel = lazy(() =>
  import("./leave-panel").then((m) => ({ default: m.LeavePanel })),
);
const OperationsPanel = lazy(() =>
  import("./operations-panel").then((m) => ({ default: m.OperationsPanel })),
);
const DwrPanel = lazy(() =>
  import("./dwr-panel").then((m) => ({ default: m.DwrPanel })),
);
const PayrollPanel = lazy(() =>
  import("./payroll-panel").then((m) => ({ default: m.PayrollPanel })),
);
const SalaryPanel = lazy(() =>
  import("./salary-panel").then((m) => ({ default: m.SalaryPanel })),
);
const PermissionsPanel = lazy(() =>
  import("./permissions-panel").then((m) => ({ default: m.PermissionsPanel })),
);
const PayslipStudio = lazy(() =>
  import("./payslip-studio").then((m) => ({ default: m.PayslipStudio })),
);
const HrPanel = lazy(() =>
  import("./hr-panel").then((m) => ({ default: m.HrPanel })),
);
const ApprovalQueue = lazy(() =>
  import("./hr-panel").then((m) => ({ default: m.ApprovalQueue })),
);
const Dashboard = lazy(() =>
  import("./dashboard").then((m) => ({ default: m.Dashboard })),
);
const AccessPanel = lazy(() =>
  import("./access-panel").then((m) => ({ default: m.AccessPanel })),
);
const AuditPanel = lazy(() =>
  import("./foundation-panel").then((m) => ({ default: m.AuditPanel })),
);
const EmployeeDirectory = lazy(() =>
  import("./foundation-panel").then((m) => ({ default: m.EmployeeDirectory })),
);
const ReportsPanel = lazy(() =>
  import("./foundation-panel").then((m) => ({ default: m.ReportsPanel })),
);
const RequestsPanel = lazy(() =>
  import("./foundation-panel").then((m) => ({ default: m.RequestsPanel })),
);
const SettingsPanel = lazy(() =>
  import("./foundation-panel").then((m) => ({ default: m.SettingsPanel })),
);
import { Button } from "./components/ui/button";
import {
  Badge,
  Empty,
  ErrorState,
  Notice,
  OnlineStatus,
  Preferences,
  Skeleton,
  useT,
} from "./ui";
export function Workspace(props: { onLogout: () => Promise<void> }) {
  return <WorkspaceBody {...props} />;
}
function WorkspaceBody({ onLogout }: { onLogout: () => Promise<void> }) {
  const t = useT(),
    prefs = useContext(Preferences),
    client = useQueryClient(),
    boundary = useRef(new ScopeBoundary()).current;
  const [siteId, setSiteId] = useState(""),
    [collapsed, setCollapsed] = useState(
      () => localStorage.getItem("dg.sidebar") === "collapsed",
    ),
    [closedGroups, setClosedGroups] = useState<string[]>(() => {
      try {
        return JSON.parse(localStorage.getItem("dg.nav.closed") ?? "[]");
      } catch {
        return [];
      }
    }),
    [mobileNav, setMobileNav] = useState(false),
    [checking, setChecking] = useState(false),
    [scopeEpoch, setScopeEpoch] = useState(0);
  const location = useLocation();
  const routerNavigate = useNavigate();
  const page = location.pathname.slice(1) || "employees";
  useEffect(() => {
    localStorage.setItem("dg.sidebar", collapsed ? "collapsed" : "expanded");
  }, [collapsed]);
  useEffect(() => {
    localStorage.setItem("dg.nav.closed", JSON.stringify(closedGroups));
  }, [closedGroups]);
  const boot = useQuery({
    queryKey: ["bootstrap"],
    queryFn: ({ signal }) => gql<BootstrapQuery>(BootstrapDocument, {}, signal),
    retry: (attempt, error) => attempt < 1 && isTransientFailure(error),
    retryDelay: 750,
    refetchOnWindowFocus: false,
    refetchInterval: 60_000,
  });
  const b = boot.data?.bootstrap,
    key = b
      ? scopeKey(
          b.organization.id,
          b.actor.id,
          b.actor.permissionVersion,
          siteId,
        )
      : ["unselected"];
  const scope = useQuery({
    queryKey: [...key, "permissions", scopeEpoch],
    enabled: !!siteId && !!b,
    queryFn: async ({ signal }) => {
      const ticket = boundary.ticket();
      try {
        const result = await gql<SiteScopeQuery>(
          SiteScopeDocument,
          { siteId },
          AbortSignal.any([signal, ticket.signal]),
          b!.actor.permissionVersion,
        );
        if (!ticket.isCurrent())
          throw new DOMException("Access changed", "AbortError");
        return result;
      } finally {
        ticket.release();
      }
    },
    retry: (attempt, error) => attempt < 1 && isTransientFailure(error),
    retryDelay: 750,
  });
  function clearScoped() {
    boundary.change();
    void client.cancelQueries({ predicate: (q) => q.queryKey[0] === "scope" });
    client.removeQueries({ predicate: (q) => q.queryKey[0] === "scope" });
  }
  function reload() {
    setChecking(true);
    clearScoped();
    setScopeEpoch((v) => v + 1);
    void boot.refetch().finally(() => setChecking(false));
  }
  const previousIdentity = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!b) return;
    const identity = `${b.organization.id}:${b.actor.id}:${b.actor.permissionVersion}`;
    if (previousIdentity.current && previousIdentity.current !== identity) {
      clearScoped();
      setScopeEpoch((v) => v + 1);
    }
    previousIdentity.current = identity;
  }, [b?.actor.permissionVersion, b?.actor.id, b?.organization.id]);
  useEffect(() => {
    const invalid = () => reload();
    const channel = new BroadcastChannel("dg.access");
    channel.onmessage = (e) => {
      if (e.data?.userId === b?.actor.id) reload();
    };
    window.addEventListener("dg:scope-changed", invalid);
    return () => {
      channel.close();
      window.removeEventListener("dg:scope-changed", invalid);
    };
  }, [b?.actor.id]);
  // Revalidate the session on return without discarding a still-valid workspace.
  // Identity/version changes and access failures below clear scoped records.
  useEffect(() => {
    const revalidate = () => {
      if (document.visibilityState === "visible") void boot.refetch();
    };
    document.addEventListener("visibilitychange", revalidate);
    return () => document.removeEventListener("visibilitychange", revalidate);
  }, [boot.refetch]);
  useEffect(() => {
    if (boot.error && (!b || !isTransientFailure(boot.error))) clearScoped();
  }, [boot.error, b]);
  async function switchSite(next: string) {
    if (next === siteId || !b?.sites.some((s) => s.id === next)) return;
    clearScoped();
    await client.cancelQueries({ predicate: (q) => q.queryKey[0] === "scope" });
    setSiteId(next);
  }
  function navigate(next: string) {
    routerNavigate(`/${next}`);
    setMobileNav(false);
  }
  if (boot.isPending)
    return (
      <div className="center-page">
        <Skeleton />
      </div>
    );
  if (boot.error && (!b || !isTransientFailure(boot.error)))
    return (
      <div className="center-page">
        <ErrorState error={boot.error} retry={() => void boot.refetch()} />
        <Button onClick={() => void onLogout()}>
          {t("Return to sign in", "साइन इन पर लौटें")}
        </Button>
      </div>
    );
  if (!b) return null;
  const selected = b.sites.find((s) => s.id === siteId),
    data = scope.data?.scope;
  const caps = data?.capabilities ?? [],
    allowed = (key: string) =>
      (key === "dashboard"
        ? caps.length > 0
        : key === "payroll"
          ? caps.some((c) => ["payroll.view", "my_payroll.view"].includes(c))
          : key === "hr"
            ? caps.some((c) =>
                [
                  "expenses.view",
                  "assets.view",
                  "helpdesk.view",
                  "grievances.view",
                  "documents.view",
                  "my_documents.view",
                  "announcements.view",
                  "my_hr.view",
                ].includes(c),
              )
            : key === "dwr"
              ? caps.some((c) => ["my_dwr.view", "dwr_review.view"].includes(c))
              : key === "operations"
                ? [
                    "my_attendance.view",
                    "attendance.view",
                    "field_duty.view",
                    "tasks.view",
                    "my_leave.view",
                    "leave.view",
                  ].some((c) => caps.includes(c))
                : caps.includes(key)) &&
      (key !== "reports.view" ||
        data?.decisions.find((d) => d.key === key)?.decision.scope ===
          "organization");
  const nav = [
    {
      id: "dashboard",
      label: t("Dashboard", "डैशबोर्ड"),
      cap: "dashboard",
      icon: LayoutDashboard,
    },
    {
      id: "analytics",
      label: t("Management insights", "प्रबंधन विश्लेषण"),
      cap: "analytics.view",
      icon: ChartNoAxesCombined,
    },
    {
      id: "payroll",
      label: t("Payroll", "वेतन"),
      cap: "payroll",
      icon: Banknote,
    },
    {
      id: "salaries",
      label: t("Salaries", "वेतन निर्धारण"),
      cap: "payroll.view",
      icon: IndianRupee,
    },
    {
      id: "payslip-design",
      label: t("Payslip designer", "वेतन पर्ची डिज़ाइनर"),
      cap: "payroll.view",
      icon: Palette,
    },
    {
      id: "hr",
      label: t("HR services", "एचआर सेवाएँ"),
      cap: "hr",
      icon: BriefcaseBusiness,
    },
    {
      id: "dwr",
      label: t("Daily work reports", "दैनिक कार्य रिपोर्ट"),
      cap: "dwr",
      icon: NotebookPen,
    },
    {
      id: "tracking",
      label: t("Live tracking", "लाइव ट्रैकिंग"),
      cap: "employee_tracking.view",
      icon: Radar,
    },
    {
      id: "operations",
      label: t("Day & operations", "दिन और संचालन"),
      cap: "operations",
      icon: CalendarDays,
    },
    {
      id: "employees",
      label: t("Employees", "कर्मचारी"),
      cap: "employees.view",
      icon: UsersRound,
    },
    {
      id: "requests",
      label: t("Profile requests", "प्रोफ़ाइल अनुरोध"),
      cap: "employees.review",
      icon: UserRoundPen,
    },
    {
      id: "permissions",
      label: t("Roles & permissions", "भूमिकाएँ और अनुमतियाँ"),
      cap: "employees.view",
      icon: ShieldCheck,
    },
    {
      id: "access",
      label: t("Users & module access", "उपयोगकर्ता और अनुमति"),
      cap: "access.view",
      icon: KeyRound,
    },
    {
      id: "setup",
      label: t("Site & employee setup", "साइट और कर्मचारी सेटअप"),
      cap: "site_settings.view",
      icon: Settings2,
    },
    {
      id: "audit",
      label: t("Audit history", "ऑडिट इतिहास"),
      cap: "audit.view",
      icon: ScrollText,
    },
    {
      id: "reports",
      label: t("All Sites · reporting", "सभी साइटें · रिपोर्ट"),
      cap: "reports.view",
      icon: Globe2,
    },
  ];
  const featureRoutes = [
    {
      id: "attendance-mark",
      label: "Mark IN / OUT",
      cap: "my_attendance.view|my_attendance.create",
      icon: FingerprintPattern,
      tab: "mark",
      group: "People",
    },
    {
      id: "attendance-review",
      label: "Attendance approvals",
      cap: "attendance.view|attendance.approve",
      icon: UserRoundCheck,
      tab: "review",
      group: "People",
    },
    {
      id: "geofence",
      label: "Site geofence",
      cap: "site_settings.view|site_settings.manage",
      icon: MapPinned,
      tab: "geofence",
      group: "HR",
    },
    {
      id: "attendance-policy",
      label: "Attendance policy",
      cap: "site_settings.manage",
      icon: FileClock,
      tab: "config",
      group: "HR",
    },
    {
      id: "attendance",
      label: "Attendance",
      cap: "attendance.view|my_attendance.view",
      icon: CalendarClock,
      tab: "attendance",
      group: "People",
    },
    {
      id: "tasks",
      label: "Tasks",
      cap: "tasks.view",
      icon: ListTodo,
      tab: "tasks",
      group: "People",
    },
    {
      id: "leave",
      label: "Leave",
      cap: "leave.view|my_leave.view",
      icon: TreePalm,
      tab: "leave",
      group: "HR",
    },
    {
      id: "expenses",
      label: "Expenses",
      cap: "expenses.view",
      icon: ReceiptText,
      kind: "expense",
      group: "HR",
    },
    {
      id: "assets",
      label: "Assets",
      cap: "assets.view",
      icon: Laptop,
      kind: "asset",
      group: "HR",
    },
    {
      id: "documents",
      label: "Documents",
      cap: "documents.view|my_documents.view",
      icon: FileText,
      kind: "document",
      group: "HR",
    },
    {
      id: "policies",
      label: "Policies",
      cap: "documents.view|my_documents.view",
      icon: BookOpenCheck,
      kind: "policy",
      group: "HR",
    },
    {
      id: "lifecycle",
      label: "Employee lifecycle",
      cap: "employees.view|my_hr.view",
      icon: ContactRound,
      kind: "lifecycle",
      group: "People",
    },
    {
      id: "helpdesk",
      label: "Helpdesk",
      cap: "helpdesk.view",
      icon: Headset,
      kind: "helpdesk",
      group: "Communication",
    },
    {
      id: "grievances",
      label: "Confidential cases",
      cap: "grievances.view",
      icon: MessageSquareLock,
      kind: "grievance",
      group: "Communication",
    },
    {
      id: "announcements",
      label: "Announcements",
      cap: "announcements.view",
      icon: Megaphone,
      kind: "announcement",
      group: "Communication",
    },
    {
      id: "inbox",
      label: "Inbox",
      cap: "inbox.view",
      icon: Inbox,
      tab: "overview",
      group: "Communication",
    },
    {
      id: "shifts",
      label: "Shifts & holidays",
      cap: "site_settings.view",
      icon: CalendarRange,
      group: "HR",
    },
    {
      id: "approvals",
      label: "Approvals",
      cap: "dashboard",
      icon: ClipboardCheck,
      group: "Management",
    },
  ];
  const feature = featureRoutes.find((n) => n.id === page);
  const featureAllowed = (cap: string) =>
    cap === "dashboard"
      ? caps.some((c) => c.endsWith(".review") || c.endsWith(".approve"))
      : cap.split("|").some((c) => caps.includes(c));
  const groups: Record<string, string> = {
    dashboard: "Overview",
    employees: "People",
    dwr: "People",
    operations: "People",
    tracking: "HR",
    payroll: "HR",
    "payslip-design": "HR",
    salaries: "HR",
    permissions: "Administration",
    hr: "HR",
    requests: "Management",
    analytics: "Management",
    reports: "Management",
    access: "Administration",
    setup: "Administration",
    audit: "Administration",
  };
  const navigation = [
    ...nav
      .filter((n) => !["hr", "operations"].includes(n.id))
      .map((n) => ({
        ...n,
        group: groups[n.id] ?? "HR",
        visible: allowed(n.cap),
      })),
    ...featureRoutes.map((n) => ({ ...n, visible: featureAllowed(n.cap) })),
  ].filter((n) => n.visible);
  const sections: Record<string, string> = {
    Overview: t("Overview", "अवलोकन"),
    People: t("People", "लोग"),
    HR: t("HR", "एचआर"),
    Communication: t("Communication", "संचार"),
    Management: t("Management", "प्रबंधन"),
    Administration: t("Administration", "प्रशासन"),
  };
  const prefetch = (id: string) => {
    if (id === "analytics") void import("./analytics-panel");
    if (id === "payroll") void import("./payroll-panel");
    if (id === "access") void import("./access-panel");
  };
  // One grouped list serves the desktop sidebar and the mobile sheet; the
  // icon rail (collapsed) always shows every group, with tooltips for labels.
  const navList = (ariaLabel: string, rail: boolean) => (
    <nav aria-label={ariaLabel} className="navigation-scroll">
      {Object.entries(sections).map(([group, groupLabel]) => {
        const items = navigation.filter((n) => n.group === group);
        if (!items.length) return null;
        const open = rail || !closedGroups.includes(group);
        return (
          <div key={group} className="nav-group">
            <button
              type="button"
              className="nav-caption"
              aria-expanded={open}
              onClick={() =>
                setClosedGroups((c) =>
                  c.includes(group)
                    ? c.filter((g) => g !== group)
                    : [...c, group],
                )
              }
            >
              {groupLabel}
              {!open && items.some((n) => n.id === page) && (
                <span className="nav-caption-dot" aria-hidden="true" />
              )}
              <ChevronRight size={13} aria-hidden="true" />
            </button>
            {open &&
              items.map(({ id, label, icon: Icon }) => (
                <Tooltip.Root key={id}>
                  <Tooltip.Trigger asChild>
                    <Link
                      aria-label={label}
                      to={`/${id}`}
                      data-module={id}
                      className={`nav-item ${page === id ? "active" : ""}`}
                      aria-current={page === id ? "page" : undefined}
                      onClick={() => setMobileNav(false)}
                      onMouseEnter={() => prefetch(id)}
                      onFocus={() => prefetch(id)}
                    >
                      <span className="nav-symbol">
                        <Icon size={17} strokeWidth={1.75} aria-hidden="true" />
                      </span>
                      <span>{label}</span>
                    </Link>
                  </Tooltip.Trigger>
                  {rail && (
                    <Tooltip.Portal>
                      <Tooltip.Content
                        className="nav-tooltip"
                        side="right"
                        sideOffset={10}
                      >
                        {label}
                        <Tooltip.Arrow />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  )}
                </Tooltip.Root>
              ))}
          </div>
        );
      })}
    </nav>
  );
  const upcoming = [
    {
      id: "payroll",
      label: t("Payroll administration", "वेतन प्रबंधन"),
      icon: Banknote,
    },
    { id: "documents", label: t("Documents", "दस्तावेज़"), icon: FileText },
  ];
  const current = nav.find((n) => n.id === page),
    future = data?.modules.find((m) => m.id === page && !m.available),
    canPage =
      page === "field" ||
      (feature
        ? featureAllowed(feature.cap)
        : current
          ? allowed(current.cap)
          : future
            ? allowed(`${future.id}.view`)
            : false);
  const content =
    page === "field" ? (
      // The former field page is folded into live tracking.
      <Navigate to="/tracking" replace />
    ) : page === "tracking" ? (
      <TrackingPanel />
    ) : page === "inbox" ? (
      <InboxPanel />
    ) : page === "tasks" ? (
      <TasksPanel />
    ) : page === "leave" ? (
      <LeavePanel />
    ) : feature?.kind ? (
      <HrPanel key={feature.kind} initialKind={feature.kind as HrKind} />
    ) : feature?.tab ? (
      <OperationsPanel
        key={feature.id}
        initialTab={feature.tab}
        title={feature.label}
      />
    ) : page === "shifts" ? (
      <SettingsPanel key="shifts" initialTab="shift" />
    ) : page === "approvals" ? (
      <ApprovalQueue standalone />
    ) : page === "dashboard" ? (
      <Dashboard />
    ) : page === "payroll" ? (
      <PayrollPanel />
    ) : page === "payslip-design" ? (
      <PayslipStudio />
    ) : page === "salaries" ? (
      <SalaryPanel />
    ) : page === "permissions" ? (
      <PermissionsPanel />
    ) : page === "hr" ? (
      <HrPanel />
    ) : page === "dwr" ? (
      <DwrPanel />
    ) : page === "operations" ? (
      <OperationsPanel />
    ) : page === "employees" ? (
      <>
        <EmployeeDirectory />
      </>
    ) : page === "access" ? (
      <AccessPanel />
    ) : page === "setup" ? (
      <SettingsPanel key="setup" />
    ) : page === "requests" ? (
      <RequestsPanel />
    ) : page === "analytics" ? (
      <AnalyticsPanel />
    ) : page === "reports" ? (
      <ReportsPanel />
    ) : page === "audit" ? (
      <AuditPanel />
    ) : future ? (
      <Empty
        title={t(
          `${future.name} · Phase ${future.phase}`,
          `${future.hindi} · चरण ${future.phase}`,
        )}
      >
        {t(
          "This module is not released yet. Your permission is recorded for when it becomes available.",
          "यह मॉड्यूल अभी जारी नहीं हुआ। उपलब्ध होने पर आपकी अनुमति लागू होगी।",
        )}
      </Empty>
    ) : (
      <Empty title={t("Page not found", "पृष्ठ नहीं मिला")} />
    );
  return (
    <div className={`shell ${collapsed ? "is-collapsed" : ""}`}>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Skip to content
      </a>
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <Leaf size={18} strokeWidth={2} />
          </span>
          <div>
            Defence Garden<span>People & HR</span>
          </div>
        </div>
        <SiteSwitcher
          sites={b.sites}
          value={siteId}
          onChange={switchSite}
          collapsed={collapsed}
        />
        <Tooltip.Provider delayDuration={180}>
          {navList("Main navigation", collapsed)}
        </Tooltip.Provider>
        {!!siteId &&
          upcoming.some(
            (n) =>
              data?.modules.some((m) => m.id === n.id && !m.available) &&
              allowed(`${n.id}.view`),
          ) && (
            <nav aria-label="Upcoming modules" className="nav-upcoming">
              <div className="nav-caption">
                {t("Coming later", "अगले चरणों में")}
              </div>
              {upcoming
                .filter(
                  (n) =>
                    data?.modules.some((m) => m.id === n.id && !m.available) &&
                    allowed(`${n.id}.view`),
                )
                .map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    data-module={id}
                    className={`nav-item ${page === id ? "active" : ""}`}
                    title={label}
                    onClick={() => navigate(id)}
                  >
                    <span className="nav-symbol">
                      <Icon size={17} strokeWidth={1.75} aria-hidden="true" />
                    </span>
                    <span>{label}</span>
                    <span className="phase-label">
                      P{data?.modules.find((m) => m.id === id)?.phase}
                    </span>
                  </button>
                ))}
            </nav>
          )}
        <div className="sidebar-bottom">
          <button
            className="nav-item"
            aria-label={t("Sign out", "साइन आउट")}
            title={t("Sign out", "साइन आउट")}
            onClick={() => void onLogout()}
          >
            <span className="nav-symbol">
              <LogOut size={17} strokeWidth={1.75} aria-hidden="true" />
            </span>
            <span>{t("Sign out", "साइन आउट")}</span>
          </button>
          <Button
            variant="ghost"
            className="sidebar-collapse"
            aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
            title={collapsed ? "Expand navigation" : "Collapse navigation"}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <PanelLeftOpen size={17} aria-hidden="true" />
            ) : (
              <PanelLeftClose size={17} aria-hidden="true" />
            )}
          </Button>
        </div>
      </aside>
      {mobileNav && (
        <Dialog title="Navigation" sheet onClose={() => setMobileNav(false)}>
          <div className="mobile-nav">
            <SiteSwitcher
              sites={b.sites}
              value={siteId}
              onChange={switchSite}
            />
            <Tooltip.Provider>
              {navList("Mobile navigation", false)}
            </Tooltip.Provider>
          </div>
        </Dialog>
      )}
      <div className="main">
        <header className="topbar">
          <Button
            variant="ghost"
            className="mobile-menu"
            aria-label="Open navigation"
            onClick={() => setMobileNav(true)}
          >
            <Menu size={20} />
          </Button>
          <span>
            {b.organization.name}
            <span className="breadcrumb">/</span>
            {page === "reports"
              ? t("All Sites · read only", "सभी साइटें · केवल पढ़ें")
              : (selected?.name ?? t("Choose workspace", "कार्यक्षेत्र चुनें"))}
            {selected && (current ?? feature) && (
              <>
                <span className="breadcrumb">/</span>
                <strong>{(current ?? feature)!.label}</strong>
              </>
            )}
          </span>
          <div className="account">
            <select
              aria-label="Language"
              value={prefs.language}
              onChange={(e) => prefs.setLanguage(e.target.value)}
            >
              <option value="en">EN</option>
              <option value="hi">हिन्दी</option>
            </select>
            <Button
              variant="ghost"
              aria-label={prefs.dark ? "Use light theme" : "Use dark theme"}
              onClick={() => prefs.setDark(!prefs.dark)}
            >
              {prefs.dark ? <Sun size={18} /> : <Moon size={18} />}
            </Button>
            <Button
              variant="ghost"
              aria-label="Sign out of HR"
              onClick={() => void onLogout()}
            >
              <LogOut size={17} />
            </Button>
          </div>
        </header>
        <OnlineStatus />
        {((boot.error && b && isTransientFailure(boot.error)) ||
          (scope.error && scope.data && isTransientFailure(scope.error))) && (
          <Notice>
            The HR service is responding slowly. Showing the last verified view.
          </Notice>
        )}
        <main id="main-content" tabIndex={-1}>
          {!siteId || !selected ? (
            <>
              <div className="eyebrow">
                {t("YOUR PEOPLE WORKSPACE", "आपका कर्मचारी कार्यक्षेत्र")}
              </div>
              <h1>
                {t(
                  "Where are you working today?",
                  "आज आप कहाँ काम कर रहे हैं?",
                )}
              </h1>
              <p className="muted intro">
                {t(
                  "Choose an authorized site to open your workspace.",
                  "अपना कार्यक्षेत्र खोलने के लिए अधिकृत साइट चुनें।",
                )}
              </p>
              <div className="site-cards">
                {b.sites.map((s) => (
                  <button
                    className="site-card"
                    key={s.id}
                    onClick={() => void switchSite(s.id)}
                  >
                    <div className="site-symbol">
                      <Building2 size={27} />
                    </div>
                    <h2>{s.name}</h2>
                    <p>{s.timezone}</p>
                    <span>
                      {t("Open workspace", "कार्यक्षेत्र खोलें")}{" "}
                      <ArrowRight size={16} />
                    </span>
                  </button>
                ))}
              </div>
              {!b.sites.length && (
                <Empty
                  title={t(
                    "No active site memberships",
                    "कोई सक्रिय साइट सदस्यता नहीं",
                  )}
                >
                  {t(
                    "Ask your administrator to assign a site.",
                    "अपने व्यवस्थापक से साइट नियुक्त करने के लिए कहें।",
                  )}
                </Empty>
              )}
            </>
          ) : checking || scope.isPending ? (
            <Skeleton />
          ) : scope.error && (!scope.data || !isTransientFailure(scope.error)) ? (
            <ErrorState error={scope.error} retry={reload} />
          ) : !canPage ? (
            <Empty
              denied
              title={t("Access is not granted", "अनुमति नहीं दी गई है")}
            >
              {t(
                "This page requires a capability that your account does not have at this site. Choose an available page or contact your administrator.",
                "इस साइट पर आपके खाते को इस पृष्ठ की अनुमति नहीं है। उपलब्ध पृष्ठ चुनें या व्यवस्थापक से संपर्क करें।",
              )}
            </Empty>
          ) : (
            <ScopeContext.Provider
              value={{
                sites: b.sites,
                siteId,
                siteName: selected!.name,
                workDate: data!.workDate,
                actorId: b.actor.id,
                version: b.actor.permissionVersion,
                key,
                capabilities: caps,
                modules: data!.modules,
                decisions: data!.decisions,
                boundary,
                reload,
              }}
            >
              <div key={key.join(":")} className="route-content">
                <Suspense fallback={<Skeleton />}>{content}</Suspense>
              </div>
            </ScopeContext.Provider>
          )}
        </main>
        <footer>
          Defence Garden · People & HR
          <span>
            {selected
              ? `${selected.name} · ${data?.workDate ?? ""}`
              : t("Secure, site-scoped access", "सुरक्षित साइट अनुमति")}
          </span>
        </footer>
      </div>
    </div>
  );
}
