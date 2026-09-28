import { Link, useLocation } from "react-router-dom";
import React, {
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef, ColumnFiltersState } from "@tanstack/react-table";
import {
  Activity,
  Archive,
  ArchiveRestore,
  ArrowRight,
  BadgeCheck,
  Ban,
  Blocks,
  Briefcase,
  Building2,
  CalendarClock,
  CalendarDays,
  Camera,
  ChevronRight,
  ChevronsLeft,
  CircleCheck,
  CircleX,
  Clock3,
  Copy,
  Download,
  Ellipsis,
  Eye,
  FileCheck2,
  Globe,
  Hourglass,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  MapPinPlus,
  PencilLine,
  Phone,
  Plus,
  RotateCcw,
  ScrollText,
  Search,
  Settings2,
  ShieldCheck,
  TriangleAlert,
  UserCheck,
  UserPlus,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
  EmployeesDocument,
  FoundationDocument,
  SaveFoundationDocument,
  EmployeeDetailsDocument,
  ProfileRequestsDocument,
  QueueExportDocument,
  ExportJobDocument,
  UpdateProfileDocument,
  OrganizationReportDocument,
  AuditHistoryDocument,
  TrackingMonitorDocument,
  type EmployeesQuery,
  type EmployeeFieldsFragment,
  type EmployeeAdminFieldsFragment,
  EmployeeRecordDocument,
  type EmployeeRecordQuery,
  EmployeeLifecycleDocument,
  type EmployeeLifecycleMutation,
  type FoundationQuery,
  type FoundationInput,
  type FoundationResult,
  type EmployeeDetailsQuery,
  type ProfileRequestsQuery,
  type PersonalFieldsFragment,
  type SaveFoundationMutation,
  type QueueExportMutation,
  type ExportJobQuery,
  type OrganizationReportQuery,
  type AuditHistoryQuery,
} from "../../../packages/contracts/src/generated";
import { rest } from "./api";
import { HrList } from "./hr-panel";
import { DutySchedule } from "./duty-schedule";
import { useScope, useScopedQuery, useWrite } from "./workspace-context";
import {
  Badge,
  Dialog as Modal,
  Empty,
  ErrorState,
  Heading,
  Notice,
  PageSkeleton,
  Skeleton,
  humanize,
  statusTone,
  useT,
} from "./ui";
import { DataTable } from "./components/shared/data-table";
import {
  Desk,
  DeskEmpty,
  DeskHeader,
  DeskKpis,
  DeskQueue,
  DeskRefresh,
  DeskTable,
  DeskWorkspace,
  Facts,
  Inspector,
  InspectorSection,
  Pill,
  type DeskColumn,
} from "./components/shared/desk";
import {
  formatDate,
  formatDateTime,
  formatDecimalMoney,
  formatRelative,
} from "./components/shared/formatting";
import { Field, StatCard, StatGrid } from "./components/shared/page";
import { Button } from "./components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge as UiBadge } from "@/components/ui/badge";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
interface FormField {
  /** "appPassword" is local: passed to onSaved, never sent with the record. */
  name: keyof FoundationInput | "appPassword";
  label: string;
  type?: string;
  value?: string | number | null;
  options?: { id: string; name: string }[];
  required?: boolean;
  help?: string;
  /** Optional field that, when filled, needs at least this many characters. */
  minLength?: number;
}
export function FoundationForm({
  title,
  description,
  operation,
  fields,
  base = {},
  onClose,
  onSaved,
  submitLabel,
}: {
  title: string;
  description?: string;
  operation: string;
  fields: FormField[];
  base?: FoundationInput;
  onClose: () => void;
  onSaved?: (
    r: FoundationResult,
    values: Record<string, string>,
  ) => void | Promise<void>;
  submitLabel?: string;
}) {
  const write = useWrite(),
    t = useT(),
    uid = useId();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const schema = z.object(
    Object.fromEntries(
      fields.map((f) => [
        f.name,
        f.minLength
          ? z.union([
              z.literal(""),
              z
                .string()
                .min(f.minLength, `Use at least ${f.minLength} characters`)
                .max(100, "This value is too long"),
            ])
          : z
              .string()
              .min(
                f.required === false ? 0 : f.type === "textarea" ? 8 : 1,
                "Complete this field",
              )
              .max(
                f.type === "textarea" ? 500 : f.type === "tel" ? 25 : 100,
                "This value is too long",
              ),
      ]),
    ),
  );
  const form = useForm<Record<string, string>>({
    resolver: zodResolver(schema),
  });
  async function save(input: Record<string, string>) {
    setBusy(true);
    setError("");
    const values: Record<string, unknown> = { ...input };
    delete values.appPassword;
    for (const field of fields)
      if (field.type === "number")
        values[field.name] = Number(
          values[field.name],
        ) as unknown as FormDataEntryValue;
    try {
      const result = await write<SaveFoundationMutation>(
        SaveFoundationDocument,
        { operation, input: { ...base, ...values } },
      );
      await onSaved?.(result.saveFoundation, input);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  // Long forms (Add employee) use two columns from the sm breakpoint.
  const wide = fields.length > 4;
  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className={wide ? "sm:max-w-2xl" : "sm:max-w-lg"}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={form.handleSubmit(save)} className="grid gap-5">
          <div className={cn("grid gap-4", wide && "sm:grid-cols-2")}>
            {fields.map((f) => {
              const id = `${uid}-${f.name}`,
                problem = form.formState.errors[f.name]?.message;
              return (
                <Field
                  key={f.name}
                  label={f.label}
                  htmlFor={id}
                  hint={f.help}
                  className={cn(
                    f.type === "textarea" && "sm:col-span-2",
                    // Keep grid rows aligned when only some fields have hints.
                    wide && "content-start",
                  )}
                >
                  {f.options ? (
                    <NativeSelect
                      id={id}
                      {...form.register(f.name)}
                      required={f.required !== false}
                      defaultValue={f.value ?? ""}
                      aria-invalid={!!problem}
                    >
                      <option value="">{t("Choose…", "चुनें…")}</option>
                      {f.options.map((o) => (
                        <option value={o.id} key={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </NativeSelect>
                  ) : f.type === "textarea" ? (
                    <Textarea
                      id={id}
                      {...form.register(f.name)}
                      defaultValue={f.value ?? ""}
                      required
                      minLength={8}
                      maxLength={500}
                      aria-invalid={!!problem}
                      className="min-h-24"
                    />
                  ) : (
                    <Input
                      id={id}
                      {...form.register(f.name)}
                      type={f.type ?? "text"}
                      defaultValue={f.value ?? ""}
                      required={f.required !== false}
                      minLength={f.minLength}
                      autoComplete={
                        f.name === "appPassword" ? "new-password" : undefined
                      }
                      maxLength={f.type === "tel" ? 25 : 100}
                      aria-invalid={!!problem}
                    />
                  )}
                  {problem && (
                    <p role="alert" className="text-destructive text-xs">
                      {problem}
                    </p>
                  )}
                </Field>
              );
            })}
          </div>
          {error && (
            <Alert variant="destructive">
              <TriangleAlert />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={onClose}
            >
              {t("Cancel", "रद्द करें")}
            </Button>
            <Button type="submit" disabled={busy || !navigator.onLine}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {busy
                ? t("Saving…", "सहेजा जा रहा है…")
                : (submitLabel ?? t("Save changes", "बदलाव सहेजें"))}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
type AdminEmployee = EmployeeFieldsFragment & EmployeeAdminFieldsFragment;
const initials = (name: string) =>
  name
    .split(" ")
    .map((v) => v[0])
    .slice(0, 2)
    .join("");
const loginLabels: Record<string, [string, string, string]> = {
  none: ["No login", "लॉगिन नहीं", "neutral"],
  pending: ["Not activated", "सक्रिय नहीं", "warning"],
  active: ["Can sign in", "साइन इन कर सकते हैं", "success"],
  disabled: ["Login disabled", "लॉगिन बंद", "danger"],
};
function StatusBadge({ e }: { e: AdminEmployee }) {
  const s = useScope(),
    t = useT();
  if (!e.status) return <span className="text-muted-foreground">—</span>;
  const leaving = e.employment.find(
    (v) => v.endsOn && v.endsOn >= s.workDate,
  )?.endsOn;
  if (e.status === "active" && leaving)
    return (
      <Badge tone="warning">
        {t(
          `Leaving ${formatDate(leaving)}`,
          `${formatDate(leaving)} को छोड़ रहे`,
        )}
      </Badge>
    );
  const joins = e.assignments.find(
    (a) => a.site.id === s.siteId && a.startsOn > s.workDate,
  )?.startsOn;
  const joinDate = joins ? formatDate(joins) : "";
  const [en, hi, tone] = (
    {
      active: ["Active", "सक्रिय", "success"],
      joining: [`Joins ${joinDate}`, `${joinDate} से जुड़ेंगे`, "info"],
      moved: ["Moved to another site", "दूसरी साइट पर", "neutral"],
      former: ["Exited", "बाहर", "danger"],
    } as Record<string, [string, string, string]>
  )[e.status] ?? [e.status, e.status, "neutral"];
  return <Badge tone={tone}>{t(en, hi)}</Badge>;
}
function LoginBadge({ e }: { e: AdminEmployee }) {
  const t = useT();
  if (!e.login) return <span className="text-muted-foreground">—</span>;
  if (e.status === "former" && ["active", "pending"].includes(e.login.status))
    return (
      <Badge tone="danger">
        {t("Exited · can still sign in", "बाहर · साइन इन संभव")}
      </Badge>
    );
  const [en, hi, tone] = loginLabels[e.login.status] ?? loginLabels.none;
  return <Badge tone={tone}>{t(en, hi)}</Badge>;
}
export function EmployeeDirectory() {
  const s = useScope(),
    t = useT(),
    // Dashboard lookups open a profile through router state, not the URL.
    opened = (useLocation().state as { openEmployee?: string } | null)
      ?.openEmployee;
  const [view, setView] = useState("current"),
    [search, setSearch] = useState(""),
    [department, setDepartment] = useState(""),
    [after, setAfter] = useState<string | undefined>(),
    [selected, setSelected] = useState<{
      id: string;
      tab?: string;
      initial?: AdminEmployee;
    } | null>(opened ? { id: opened } : null),
    [create, setCreate] = useState(false),
    [exporting, setExporting] = useState(false),
    [message, setMessage] = useState(""),
    [issued, setIssued] = useState<{
      loginId: string;
      password: string;
    } | null>(null);
  const write = useWrite();
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);
  const query = useScopedQuery<EmployeesQuery>(
    ["employees", view, debouncedSearch, department, after],
    EmployeesDocument,
    { first: 20, search: debouncedSearch, department, after, status: view },
    view !== "drafts",
  );
  const foundation = useScopedQuery<FoundationQuery>(
    ["foundation"],
    FoundationDocument,
    {},
    s.capabilities.includes("site_settings.view"),
  );
  const drafts =
    foundation.data?.foundation.drafts.filter((d) => d.status === "draft") ??
    [];
  const rows = useMemo(() => query.data?.employees.nodes ?? [], [query.data]);
  const open = (e: AdminEmployee, tab?: string) =>
    setSelected({ id: e.id, initial: e, tab });
  const lifecycle = s.capabilities.includes("employees.view");
  const orNone = (value: unknown) =>
    (value as string | null) || (
      <span className="text-muted-foreground">—</span>
    );
  const columns = useMemo<ColumnDef<AdminEmployee>[]>(
    () => [
      {
        header: t("Employee", "कर्मचारी"),
        accessorKey: "displayName",
        cell: ({ row: { original: e } }) => (
          <button
            type="button"
            aria-label={`Open ${e.displayName}'s profile`}
            onClick={() => open(e)}
            className="group focus-visible:ring-ring/50 flex min-w-[220px] items-center gap-3 rounded-md text-left outline-none focus-visible:ring-[3px]"
          >
            <Avatar className="size-9">
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {initials(e.displayName)}
              </AvatarFallback>
            </Avatar>
            <span className="grid min-w-0">
              <span className="truncate font-medium group-hover:underline">
                {e.displayName}
              </span>
              <span className="text-muted-foreground truncate text-xs">
                {e.workEmail ?? t("Contact restricted", "संपर्क प्रतिबंधित")}
              </span>
            </span>
          </button>
        ),
      },
      {
        header: t("Employee ID", "कर्मचारी आईडी"),
        accessorKey: "employeeCode",
        cell: ({ getValue }) => (
          <UiBadge
            variant="secondary"
            className="text-muted-foreground font-mono font-normal"
          >
            {String(getValue())}
          </UiBadge>
        ),
      },
      {
        header: t("Department", "विभाग"),
        accessorKey: "department",
        cell: ({ getValue }) => orNone(getValue()),
      },
      {
        header: t("Designation", "पदनाम"),
        accessorKey: "jobTitle",
        cell: ({ getValue }) => orNone(getValue()),
      },
      {
        header: t("Status", "स्थिति"),
        id: "status",
        cell: ({ row }) => <StatusBadge e={row.original} />,
      },
      {
        header: t("App login", "ऐप लॉगिन"),
        id: "login",
        cell: ({ row }) => <LoginBadge e={row.original} />,
      },
      {
        header: "",
        id: "actions",
        enableHiding: false,
        cell: ({ row: { original: e } }) => (
          <span className="flex items-center justify-end gap-1">
            {e.login && (
              <Button
                variant="outline"
                size="sm"
                aria-label={`Set ${e.displayName}'s login ID and password`}
                onClick={() => open(e)}
              >
                <KeyRound className="size-3.5" />
                {t("Login", "लॉगिन")}
              </Button>
            )}
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`${t("Actions for", "कार्रवाई")} ${e.displayName}`}
                  className="data-[state=open]:bg-muted"
                >
                  <Ellipsis className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onSelect={() => open(e)}>
                  <UserRound />
                  {t("Open profile", "प्रोफ़ाइल खोलें")}
                </DropdownMenuItem>
                {e.permittedFields.includes("employment") && (
                  <>
                    <DropdownMenuItem onSelect={() => open(e, "employment")}>
                      <Briefcase />
                      {t("Employment & history", "रोजगार और इतिहास")}
                    </DropdownMenuItem>
                    {lifecycle && (
                      <DropdownMenuItem onSelect={() => open(e, "lifecycle")}>
                        <Activity />
                        {t("Lifecycle", "जीवनचक्र")}
                      </DropdownMenuItem>
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </span>
        ),
      },
    ],
    [t("Employee", "कर्मचारी"), s.workDate, s.siteId, lifecycle],
  );
  const draftColumns: ColumnDef<Draft>[] = [
    {
      header: t("Employee", "कर्मचारी"),
      id: "name",
      // Searchable by name or email.
      accessorFn: (d) => `${d.displayName} ${d.workEmail}`,
      cell: ({ row: { original: d } }) => (
        <span className="flex min-w-[220px] items-center gap-3">
          <Avatar className="size-9">
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {initials(d.displayName)}
            </AvatarFallback>
          </Avatar>
          <span className="grid min-w-0">
            <span className="truncate font-medium">{d.displayName}</span>
            <span className="text-muted-foreground truncate text-xs">
              {d.workEmail}
            </span>
          </span>
        </span>
      ),
    },
    {
      header: t("Employee ID", "कर्मचारी आईडी"),
      accessorKey: "employeeCode",
      cell: ({ getValue }) => (
        <UiBadge
          variant="secondary"
          className="text-muted-foreground font-mono font-normal"
        >
          {String(getValue())}
        </UiBadge>
      ),
    },
    { header: t("Department", "विभाग"), accessorKey: "department" },
    { header: t("Designation", "पदनाम"), accessorKey: "designation" },
    {
      header: t("Joining date", "कार्यग्रहण तिथि"),
      accessorKey: "startsOn",
      cell: ({ getValue }) => (
        <span className="whitespace-nowrap">
          {formatDate(String(getValue()))}
        </span>
      ),
    },
    {
      header: t("Submitted", "जमा"),
      accessorKey: "createdAt",
      cell: ({ getValue }) => (
        <span className="text-muted-foreground whitespace-nowrap">
          {formatRelative(String(getValue()))}
        </span>
      ),
    },
    {
      header: "",
      id: "actions",
      enableHiding: false,
      cell: ({ row: { original: d } }) => (
        <div className="flex justify-end">
          {d.authorId !== s.actorId &&
          s.capabilities.includes("employees.approve") ? (
            <ApproveDraftButton draft={d} />
          ) : (
            <span className="text-muted-foreground text-xs whitespace-nowrap">
              {t("Needs another approver", "दूसरे स्वीकर्ता की आवश्यकता")}
            </span>
          )}
        </div>
      ),
    },
  ];
  const canCreate =
    s.capabilities.includes("employees.create") && !!foundation.data;
  const filtered = !!search || !!department;
  return (
    <section className="grid gap-5">
      <Heading
        title={t("Employees", "कर्मचारी")}
        description={t(
          `People with an assignment at ${s.siteName}. Open a profile for employment, app login and lifecycle.`,
          `${s.siteName} पर नियुक्त लोग। रोजगार, ऐप लॉगिन और जीवनचक्र के लिए प्रोफ़ाइल खोलें।`,
        )}
      >
        {s.capabilities.includes("employees.export") && (
          <Button variant="outline" onClick={() => setExporting(true)}>
            <Download className="size-4" />
            {t("Export", "निर्यात")}
          </Button>
        )}
        {canCreate && (
          <Button onClick={() => setCreate(true)}>
            <UserPlus className="size-4" />
            {t("Add employee", "कर्मचारी जोड़ें")}
          </Button>
        )}
      </Heading>
      {message && <Notice success>{message}</Notice>}
      <Tabs
        value={view}
        onValueChange={(v) => {
          setView(v);
          setAfter(undefined);
        }}
      >
        <TabsList className="max-w-full justify-start overflow-x-auto">
          <TabsTrigger value="current" className="flex-none">
            {t("Current", "वर्तमान")}
          </TabsTrigger>
          <TabsTrigger value="former" className="flex-none">
            {t("Former & moved", "पूर्व और स्थानांतरित")}
          </TabsTrigger>
          <TabsTrigger value="all" className="flex-none">
            {t("All", "सभी")}
          </TabsTrigger>
          {canCreate && (
            <TabsTrigger value="drafts" className="flex-none">
              {t("Awaiting approval", "स्वीकृति बाकी")}
              <UiBadge
                variant={drafts.length ? "warning" : "secondary"}
                className="px-1.5 py-0 tabular-nums"
              >
                {drafts.length}
              </UiBadge>
            </TabsTrigger>
          )}
        </TabsList>
      </Tabs>
      {view === "drafts" ? (
        <DataTable
          data={drafts}
          columns={draftColumns}
          getRowId={(d) => d.id}
          label={t("Drafts awaiting approval", "स्वीकृति बाकी ड्राफ्ट")}
          search={t("Search name, ID or email…", "नाम, आईडी या ईमेल खोजें…")}
          empty={t(
            "Nothing awaiting approval. Employees added by Jr HR appear here until another HR approves them.",
            "कोई स्वीकृति बाकी नहीं। जूनियर एचआर द्वारा जोड़े गए कर्मचारी स्वीकृति तक यहाँ दिखते हैं।",
          )}
        />
      ) : (
        <div className="grid gap-3">
          <DataTable
            data={rows}
            columns={columns}
            getRowId={(r) => r.id}
            label="Employees"
            serverPaged
            onRowClick={(e) => open(e)}
            toolbar={
              <>
                <div className="relative w-full sm:w-64">
                  <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                  <Input
                    aria-label="Search employees"
                    placeholder={t(
                      "Search name or employee ID",
                      "नाम या कर्मचारी आईडी खोजें",
                    )}
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setAfter(undefined);
                    }}
                    className="h-8 pl-8"
                  />
                </div>
                {foundation.data && (
                  <NativeSelect
                    aria-label="Filter department"
                    value={department}
                    onChange={(e) => {
                      setDepartment(e.target.value);
                      setAfter(undefined);
                    }}
                    className="h-8 w-full sm:w-48"
                  >
                    <option value="">
                      {t("All departments", "सभी विभाग")}
                    </option>
                    {foundation.data.foundation.references
                      .filter((r) => r.kind === "department")
                      .map((r) => (
                        <option key={r.id} value={r.name}>
                          {r.name}
                        </option>
                      ))}
                  </NativeSelect>
                )}
                {filtered && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 lg:px-3"
                    onClick={() => {
                      setSearch("");
                      setDepartment("");
                      setAfter(undefined);
                    }}
                  >
                    {t("Reset", "रीसेट")}
                    <X className="size-4" />
                  </Button>
                )}
              </>
            }
            empty={
              query.isPending ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  {t("Loading employees…", "कर्मचारी लोड हो रहे हैं…")}
                </span>
              ) : query.error ? (
                <div className="mx-auto max-w-md text-left">
                  <ErrorState
                    error={query.error}
                    retry={() => void query.refetch()}
                  />
                </div>
              ) : filtered ? (
                t(
                  "No employees match this search.",
                  "इस खोज से कोई कर्मचारी नहीं मिला।",
                )
              ) : (
                t(
                  "No employees in this view yet.",
                  "इस दृश्य में अभी कोई कर्मचारी नहीं।",
                )
              )
            }
          />
          <div className="flex flex-wrap items-center justify-between gap-3 px-1">
            <p className="text-muted-foreground text-sm">
              {query.data
                ? t(
                    `${rows.length} on this page · up to 20 per page`,
                    `इस पृष्ठ पर ${rows.length} · प्रति पृष्ठ अधिकतम 20`,
                  )
                : ""}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!after}
                onClick={() => setAfter(undefined)}
              >
                <ChevronsLeft className="size-4" />
                {t("First page", "पहला पृष्ठ")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!query.data?.employees.hasNextPage}
                onClick={() =>
                  setAfter(query.data?.employees.endCursor ?? undefined)
                }
              >
                {t("Next page", "अगला पृष्ठ")}
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
      {selected && (
        <EmployeeDrawer
          key={selected.id}
          id={selected.id}
          initial={selected.initial}
          initialTab={selected.tab}
          onClose={() => setSelected(null)}
          foundation={foundation.data?.foundation}
        />
      )}
      {create && foundation.data && (
        <FoundationForm
          title={t("Add employee", "कर्मचारी जोड़ें")}
          description={
            s.capabilities.includes("employees.approve")
              ? t(
                  `Creates the employee at ${s.siteName} and sets their app login.`,
                  `${s.siteName} पर कर्मचारी बनाता है और ऐप लॉगिन सेट करता है।`,
                )
              : t(
                  "Saved as a draft until another HR approves it.",
                  "दूसरे एचआर की स्वीकृति तक ड्राफ्ट के रूप में सहेजा जाता है।",
                )
          }
          operation="create_employee"
          onClose={() => setCreate(false)}
          onSaved={async (r, values) => {
            if (r.status === "created" && r.id) {
              setMessage("");
              try {
                const login = await write<EmployeeLifecycleMutation>(
                  EmployeeLifecycleDocument,
                  {
                    operation: "set_password",
                    input: {
                      employeeId: r.id,
                      expectedVersion: 1,
                      password: values.appPassword || null,
                    },
                  },
                );
                setIssued({
                  loginId: values.workEmail.toLowerCase(),
                  password: login.employeeLifecycle.password ?? "",
                });
              } catch (err) {
                setMessage(
                  t(
                    `Employee created, but the login password was not set: ${(err as Error).message} Open the profile to set it.`,
                    `कर्मचारी बनाया गया, पर पासवर्ड सेट नहीं हुआ: ${(err as Error).message} प्रोफ़ाइल खोलकर सेट करें।`,
                  ),
                );
              }
            } else
              setMessage(
                t(
                  "Saved for approval. It appears under Awaiting approval.",
                  "स्वीकृति के लिए सहेजा गया। यह 'स्वीकृति बाकी' में दिखेगा।",
                ),
              );
          }}
          submitLabel={
            s.capabilities.includes("employees.approve")
              ? t("Create employee", "कर्मचारी बनाएँ")
              : t("Save for review", "समीक्षा के लिए सहेजें")
          }
          fields={[
            { name: "displayName", label: t("Full name", "पूरा नाम") },
            { name: "employeeCode", label: t("Employee ID", "कर्मचारी आईडी") },
            {
              name: "workEmail",
              label: t("Login ID (email)", "लॉगिन आईडी (ईमेल)"),
              type: "email",
              help: t(
                "The employee signs in to the app with this email.",
                "कर्मचारी इसी ईमेल से ऐप में साइन इन करेंगे।",
              ),
            },
            ...(s.capabilities.includes("employees.approve")
              ? [
                  {
                    name: "appPassword" as const,
                    label: t("App password", "ऐप पासवर्ड"),
                    type: "text",
                    required: false,
                    minLength: 8,
                    help: t(
                      "At least 8 characters. Leave blank to generate one. Shown once after saving.",
                      "कम से कम 8 अक्षर। खाली छोड़ें तो अपने आप बनेगा। सहेजने के बाद एक बार दिखेगा।",
                    ),
                  },
                ]
              : []),
            {
              name: "phone",
              label: t("Phone number", "फ़ोन नंबर"),
              type: "tel",
              required: false,
            },
            {
              name: "department",
              label: t("Department", "विभाग"),
              options: foundation.data.foundation.references
                .filter((r) => r.kind === "department" && r.active)
                .map((r) => ({ id: r.name, name: r.name })),
            },
            {
              name: "designation",
              label: t("Designation", "पदनाम"),
              options: foundation.data.foundation.references
                .filter((r) => r.kind === "designation" && r.active)
                .map((r) => ({ id: r.name, name: r.name })),
            },
            {
              name: "legalEmployerId",
              label: t("Legal employer", "कानूनी नियोक्ता"),
              options: foundation.data.foundation.employers,
            },
            {
              name: "startsOn",
              label: t("Joining date", "कार्यग्रहण तिथि"),
              type: "date",
              value: s.workDate,
            },
          ]}
        />
      )}
      {exporting && <ExportDialog onClose={() => setExporting(false)} />}
      {issued && (
        <CredentialsDialog
          loginId={issued.loginId}
          password={issued.password}
          onClose={() => setIssued(null)}
        />
      )}
    </section>
  );
}
type Draft = FoundationQuery["foundation"]["drafts"][number];
function ApproveDraftButton({ draft: d }: { draft: Draft }) {
  const write = useWrite(),
    t = useT();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await write(SaveFoundationDocument, {
            operation: "approve_draft",
            input: { draftId: d.id, expectedVersion: d.version },
          });
          toast.success(
            t(`${d.displayName} approved`, `${d.displayName} स्वीकृत`),
          );
        } catch (e) {
          toast.error((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <UserCheck className="size-4" />
      )}
      {t("Approve employee", "कर्मचारी स्वीकार करें")}
    </Button>
  );
}
// Loads the live record so the sheet stays open and current after each change.
function EmployeeDrawer({
  id,
  initial,
  initialTab,
  onClose,
  foundation,
}: {
  id: string;
  initial?: AdminEmployee;
  initialTab?: string;
  onClose: () => void;
  foundation?: FoundationQuery["foundation"];
}) {
  const t = useT();
  const q = useScopedQuery<EmployeeRecordQuery>(
    ["employee", id],
    EmployeeRecordDocument,
    { id },
  );
  const e = q.data?.employee ?? (q.data ? null : initial);
  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      {/* The built-in close is hidden in favour of one named like the legacy
          dialogs' ("Close dialog"), which browser tests use. */}
      <SheetContent
        showCloseButton={false}
        className="w-full gap-0 p-0 sm:max-w-2xl"
      >
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("Close dialog", "संवाद बंद करें")}
          onClick={onClose}
          className="absolute top-4 right-4 z-10"
        >
          <X className="size-4" />
        </Button>
        {e ? (
          <EmployeeProfile
            e={e}
            initialTab={initialTab}
            foundation={foundation}
          />
        ) : (
          <>
            <SheetHeader className="border-b p-6 pr-14">
              <SheetTitle className="text-lg">
                {t("Employee profile", "कर्मचारी प्रोफ़ाइल")}
              </SheetTitle>
              <SheetDescription>
                {q.isPending
                  ? t(
                      "Loading the latest record…",
                      "नवीनतम रिकॉर्ड लोड हो रहा है…",
                    )
                  : t("Profile unavailable", "प्रोफ़ाइल उपलब्ध नहीं")}
              </SheetDescription>
            </SheetHeader>
            <div className="p-6">
              {q.error ? (
                <ErrorState error={q.error} retry={() => void q.refetch()} />
              ) : q.isPending ? (
                <Skeleton />
              ) : (
                <Empty
                  title={t(
                    "This employee is outside your access",
                    "यह कर्मचारी आपकी पहुँच से बाहर है",
                  )}
                />
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
/** Titled block inside the profile sheet. */
function ProfileSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="text-muted-foreground size-4" />
        {title}
      </h3>
      {children}
    </section>
  );
}
const detailGrid = "grid gap-x-6 gap-y-4 rounded-lg border p-4 sm:grid-cols-2";
/** Effective-dated periods; open-ended ones are current. */
function Periods({
  items,
}: {
  items: {
    id: string;
    title: ReactNode;
    from: string;
    to?: string | null;
    action?: ReactNode;
  }[];
}) {
  const t = useT();
  if (!items.length)
    return (
      <p className="text-muted-foreground text-sm">
        {t("Nothing recorded yet.", "अभी कुछ दर्ज नहीं।")}
      </p>
    );
  return (
    <ol className="grid gap-2">
      {items.map((i) => (
        <li
          key={i.id}
          className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-4 py-3"
        >
          <span
            aria-hidden="true"
            className={cn(
              "size-2 shrink-0 rounded-full",
              i.to ? "bg-muted-foreground/40" : "bg-success",
            )}
          />
          <span className="grid min-w-0 flex-1">
            <span className="truncate text-sm font-medium">{i.title}</span>
            <span className="text-muted-foreground text-xs">
              {formatDate(i.from)} →{" "}
              {i.to ? formatDate(i.to) : t("Current", "वर्तमान")}
            </span>
          </span>
          {i.action}
        </li>
      ))}
    </ol>
  );
}
const dutyStatus: Record<string, string> = {
  fresh: "Live",
  idle: "Idle · phone connected",
  stale: "Signal lost",
  location_off: "Location off",
  missing: "No signal yet",
  off_duty: "Off duty",
  disabled: "Sharing disabled",
};
function EmployeeProfile({
  e,
  initialTab,
  foundation,
}: {
  e: AdminEmployee;
  initialTab?: string;
  foundation?: FoundationQuery["foundation"];
}) {
  const s = useScope(),
    t = useT(),
    write = useWrite(),
    phoneId = useId();
  const [profileTab, setProfileTab] = useState(initialTab ?? "overview");
  const showPersonal = usePersonalValue();
  const [edit, setEdit] = useState(""),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const employment = e.permittedFields.includes("employment");
  const details = useScopedQuery<EmployeeDetailsQuery>(
    ["employee-details", e.id],
    EmployeeDetailsDocument,
    { employeeId: e.id },
    employment,
  );
  const canSchedule = s.capabilities.includes("attendance.edit"),
    canTrack = s.capabilities.includes("employee_tracking.view");
  // Current (or nearest) duty window and live state, from the tracking monitor.
  const duty = useScopedQuery<any>(
    ["tracking", "employee", e.id],
    TrackingMonitorDocument,
    { input: { employeeId: e.id } },
    employment && canTrack,
    30000,
  );
  const dutyRow = duty.data?.trackingMonitor?.employees?.[0];
  const canEdit =
    e.allowedActions.includes("edit") && e.allowedActions.includes("approve");
  const former = e.status === "former";
  const closeEdit = () => setEdit("");
  async function savePhone(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await write(UpdateProfileDocument, {
        input: {
          employeeId: e.id,
          expectedVersion: e.version,
          phone: new FormData(event.currentTarget).get("phone"),
        },
      });
      setMessage(t("Phone number saved.", "फ़ोन नंबर सहेजा गया।"));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const personal = personalLabels.filter(([k]) => e.personal?.[k] != null);
  const sensitive = e.salary != null || e.bank !== null || e.identity !== null;
  const shift = details.data?.employeeDetails.shift;
  const reporting = details.data?.employeeDetails.reporting ?? [];
  return (
    <>
      <SheetHeader className="gap-4 border-b p-6 pr-14">
        <div className="flex items-start gap-4">
          {e.photoUpdatedAt ? (
            <img
              className="ring-border size-16 shrink-0 rounded-full object-cover ring-1"
              src={`${photoUrl("employee", e.id, s.siteId)}&v=${encodeURIComponent(e.photoUpdatedAt)}`}
              alt={e.displayName}
            />
          ) : (
            <Avatar className="size-16">
              <AvatarFallback className="bg-primary/10 text-primary text-lg">
                {initials(e.displayName)}
              </AvatarFallback>
            </Avatar>
          )}
          <div className="grid min-w-0 gap-1">
            <SheetTitle className="text-xl leading-tight">
              {e.displayName}
            </SheetTitle>
            <SheetDescription>
              {e.jobTitle ??
                t("Employment restricted", "रोजगार विवरण प्रतिबंधित")}
              {e.department ? ` · ${e.department}` : ""}
            </SheetDescription>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <UiBadge
                variant="secondary"
                className="text-muted-foreground font-mono font-normal"
              >
                {e.employeeCode}
              </UiBadge>
              <StatusBadge e={e} />
              <LoginBadge e={e} />
            </div>
          </div>
        </div>
      </SheetHeader>
      <Tabs
        value={profileTab}
        onValueChange={setProfileTab}
        className="min-h-0 flex-1 gap-0"
      >
        <div className="border-b px-6 py-3">
          <TabsList className="max-w-full justify-start overflow-x-auto">
            <TabsTrigger value="overview" className="flex-none">
              {t("Overview", "अवलोकन")}
            </TabsTrigger>
            {employment && (
              <TabsTrigger value="employment" className="flex-none">
                {t("Employment & history", "रोजगार और इतिहास")}
              </TabsTrigger>
            )}
            {employment && s.capabilities.includes("employees.view") && (
              <TabsTrigger value="lifecycle" className="flex-none">
                {t("Lifecycle", "जीवनचक्र")}
              </TabsTrigger>
            )}
          </TabsList>
        </div>
        <div className="grid flex-1 content-start gap-6 overflow-y-auto p-6">
          {error && <Notice>{error}</Notice>}
          {message && <Notice success>{message}</Notice>}
          <TabsContent
            value="overview"
            forceMount
            hidden={profileTab !== "overview"}
            className="grid gap-6"
          >
            {e.login && (
              <ProfileSection
                title={t("App login", "ऐप लॉगिन")}
                icon={KeyRound}
              >
                <LoginPanel e={e} />
              </ProfileSection>
            )}
            <ProfileSection title={t("Work", "कार्य")} icon={Briefcase}>
              <dl className={detailGrid}>
                <DetailItem label={t("Employee ID", "कर्मचारी आईडी")}>
                  <span className="font-mono">{e.employeeCode}</span>
                </DetailItem>
                {e.workEmail !== null && (
                  <DetailItem label={t("Work email", "कार्य ईमेल")}>
                    {e.workEmail}
                  </DetailItem>
                )}
              </dl>
            </ProfileSection>
            {sensitive && (
              <ProfileSection
                title={t("Pay & identity", "वेतन और पहचान")}
                icon={Lock}
              >
                <dl className={detailGrid}>
                  {e.salary != null && (
                    <DetailItem label={t("Salary", "वेतन")}>
                      <span className="tabular-nums">
                        ₹{formatDecimalMoney(e.salary)}
                      </span>
                    </DetailItem>
                  )}
                  {e.bank !== null && (
                    <DetailItem label={t("Bank account", "बैंक खाता")}>
                      {e.bank}
                    </DetailItem>
                  )}
                  {e.identity !== null && (
                    <DetailItem label={t("Identity reference", "पहचान संदर्भ")}>
                      {e.identity}
                    </DetailItem>
                  )}
                </dl>
              </ProfileSection>
            )}
            {personal.length > 0 && (
              <ProfileSection
                title={t("Personal details", "व्यक्तिगत विवरण")}
                icon={UserRound}
              >
                <dl className={detailGrid}>
                  {personal.map(([k, en, hi]) => (
                    <DetailItem
                      key={k}
                      label={t(en, hi)}
                      className={
                        k === "address" || k === "permanentAddress"
                          ? "sm:col-span-2"
                          : undefined
                      }
                    >
                      {showPersonal(k, e.personal?.[k])}
                    </DetailItem>
                  ))}
                </dl>
              </ProfileSection>
            )}
            {e.permittedFields.includes("contact") && (
              <ProfileSection title={t("Contact", "संपर्क")} icon={Phone}>
                <form
                  onSubmit={savePhone}
                  key={e.version}
                  className="rounded-lg border p-4"
                >
                  <Field
                    label={t("Phone number", "फ़ोन नंबर")}
                    htmlFor={phoneId}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        id={phoneId}
                        name="phone"
                        type="tel"
                        defaultValue={e.phone ?? ""}
                        maxLength={25}
                        disabled={!canEdit || busy}
                        className="sm:max-w-xs"
                      />
                      {canEdit && (
                        <Button type="submit" disabled={busy}>
                          {busy && <Loader2 className="size-4 animate-spin" />}
                          {t("Save phone", "फ़ोन सहेजें")}
                        </Button>
                      )}
                    </div>
                  </Field>
                </form>
              </ProfileSection>
            )}
          </TabsContent>
          {employment && (
            <TabsContent
              value="employment"
              forceMount
              hidden={profileTab !== "employment"}
              className="grid gap-6"
            >
              {canEdit && foundation && (
                <div className="flex flex-wrap gap-2">
                  {former ? (
                    <Button size="sm" onClick={() => setEdit("rehire")}>
                      <RotateCcw className="size-4" />
                      {t("Rehire", "पुनः नियुक्त करें")}
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEdit("employment")}
                      >
                        <PencilLine className="size-4" />
                        {t("Edit name & role", "नाम और भूमिका बदलें")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEdit("team")}
                      >
                        <UserRound className="size-4" />
                        {t("Reporting manager", "रिपोर्टिंग प्रबंधक")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEdit("shift")}
                      >
                        <Clock3 className="size-4" />
                        {t("Shift", "शिफ्ट")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEdit("site")}
                      >
                        <MapPinPlus className="size-4" />
                        {t("Add site assignment", "साइट नियुक्ति जोड़ें")}
                      </Button>
                    </>
                  )}
                </div>
              )}
              <ProfileSection
                title={t("Employment", "रोजगार")}
                icon={Building2}
              >
                <Periods
                  items={e.employment.map((v) => ({
                    id: v.id,
                    title: v.legalEmployer.name,
                    from: v.startsOn,
                    to: v.endsOn,
                  }))}
                />
              </ProfileSection>
              <ProfileSection
                title={t("Assignment history", "नियुक्ति इतिहास")}
                icon={CalendarDays}
              >
                <Periods
                  items={e.assignments.map((a) => ({
                    id: a.id,
                    title: a.site.name,
                    from: a.startsOn,
                    to: a.endsOn,
                    action: !a.endsOn && canEdit && a.site.id === s.siteId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEdit(`end:${a.id}`)}
                      >
                        {t("End assignment", "नियुक्ति समाप्त करें")}
                      </Button>
                    ),
                  }))}
                />
              </ProfileSection>
              <ProfileSection
                title={t("Reporting & shift", "प्रबंधक और शिफ्ट")}
                icon={Clock3}
              >
                {details.isPending ? (
                  <Skeleton />
                ) : details.error ? (
                  <ErrorState
                    error={details.error}
                    retry={() => void details.refetch()}
                  />
                ) : (
                  <div className="grid gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-3 text-sm">
                      <span className="text-muted-foreground">
                        {t("Shift", "शिफ्ट")}
                      </span>
                      <span className="font-medium">
                        {shift
                          ? `${shift.name}${shift.startTime ? ` · ${shift.startTime}–${shift.endTime}` : ""}`
                          : t("No shift assigned", "कोई शिफ्ट नियुक्त नहीं")}
                      </span>
                    </div>
                    {canTrack && (
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-3 text-sm">
                        <span className="text-muted-foreground">
                          {t("Duty time", "ड्यूटी समय")}
                        </span>
                        <span className="font-medium">
                          {dutyRow
                            ? `${formatDateTime(dutyRow.starts_at)} – ${new Date(dutyRow.ends_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · ${dutyStatus[dutyRow.status] ?? humanize(dutyRow.status)}`
                            : duty.isPending
                              ? "…"
                              : t(
                                  "Not scheduled in the next 24 hours",
                                  "अगले 24 घंटे में ड्यूटी नहीं",
                                )}
                        </span>
                        {dutyRow && (
                          <Link
                            className="text-primary text-xs font-medium underline-offset-4 hover:underline"
                            to={`/tracking?employee=${e.id}`}
                          >
                            {t("Track live", "लाइव देखें")}
                          </Link>
                        )}
                      </div>
                    )}
                    {reporting.length > 0 && (
                      <>
                        <p className="text-muted-foreground text-xs">
                          {t("Reporting managers", "रिपोर्टिंग प्रबंधक")}
                        </p>
                        <Periods
                          items={reporting.map((r) => ({
                            id: r.id,
                            title: r.managerName,
                            from: r.startsOn,
                            to: r.endsOn,
                          }))}
                        />
                      </>
                    )}
                  </div>
                )}
              </ProfileSection>
            </TabsContent>
          )}
          {employment && s.capabilities.includes("employees.view") && (
            <TabsContent value="lifecycle" className="grid gap-4">
              <p className="text-muted-foreground text-sm">
                {t(
                  "Joining, probation, confirmation, promotion, transfer, salary revision and exit. Each takes effect after a second HR approves it in Approvals; an exit that has taken effect also disables the app login.",
                  "कार्यग्रहण, परिवीक्षा, पुष्टि, पदोन्नति, स्थानांतरण, वेतन संशोधन और निकास। हर बदलाव दूसरे एचआर की स्वीकृति के बाद लागू होता है; लागू निकास ऐप लॉगिन भी बंद करता है।",
                )}
              </p>
              <HrList kind="lifecycle" employeeId={e.id} />
            </TabsContent>
          )}
        </div>
      </Tabs>
      {edit === "rehire" && foundation && (
        <RehireDialog e={e} foundation={foundation} onClose={closeEdit} />
      )}
      {edit === "site" && (
        <AssignmentDialog
          employee={e}
          onClose={closeEdit}
          onSaved={closeEdit}
        />
      )}
      {edit === "employment" && foundation && (
        <FoundationForm
          title={t("Name & role", "नाम और भूमिका")}
          operation="edit_employee"
          base={{ employeeId: e.id, expectedVersion: e.version }}
          onClose={closeEdit}
          fields={[
            {
              name: "displayName",
              label: t("Full name", "पूरा नाम"),
              value: e.displayName,
            },
            {
              name: "department",
              label: t("Department", "विभाग"),
              value: e.department,
              options: foundation.references
                .filter((r) => r.kind === "department")
                .map((r) => ({ id: r.name, name: r.name })),
            },
            {
              name: "designation",
              label: t("Designation", "पदनाम"),
              value: e.jobTitle,
              options: foundation.references
                .filter((r) => r.kind === "designation")
                .map((r) => ({ id: r.name, name: r.name })),
            },
          ]}
        />
      )}
      {edit === "team" && foundation && (
        <FoundationForm
          title={t("Assign reporting manager", "प्रबंधक नियुक्त करें")}
          operation="assign_team"
          base={{ employeeId: e.id, expectedVersion: e.version }}
          onClose={closeEdit}
          fields={[
            {
              name: "managerId",
              label: t("Manager", "प्रबंधक"),
              options: foundation.managers.filter((m) => m.id !== e.userId),
            },
            {
              name: "startsOn",
              label: t("Effective from", "प्रभावी तारीख"),
              type: "date",
              value: s.workDate,
              help: t(
                "Earlier reporting periods are preserved.",
                "पुरानी रिपोर्टिंग अवधि सुरक्षित रहती है।",
              ),
            },
          ]}
        />
      )}
      {edit === "shift" && foundation && canSchedule && (
        <Modal
          title={t("Assign shift & duty time", "शिफ्ट और ड्यूटी समय")}
          onClose={closeEdit}
        >
          <DutySchedule
            people={[{ id: e.id, name: e.displayName }]}
            shiftId={shift?.id}
            close={closeEdit}
            afterSave={async (shiftId) => {
              await write(SaveFoundationDocument, {
                operation: "assign_shift",
                input: {
                  employeeId: e.id,
                  expectedVersion: e.version,
                  shiftId,
                },
              });
            }}
          />
        </Modal>
      )}
      {edit === "shift" && foundation && !canSchedule && (
        <FoundationForm
          title={t("Assign shift", "शिफ्ट नियुक्त करें")}
          operation="assign_shift"
          base={{ employeeId: e.id, expectedVersion: e.version }}
          onClose={closeEdit}
          fields={[
            {
              name: "shiftId",
              label: t("Shift", "शिफ्ट"),
              options: foundation.references.filter(
                (r) => r.kind === "shift" && r.active,
              ),
            },
          ]}
        />
      )}
      {edit.startsWith("end:") && (
        <FoundationForm
          title={t("End site assignment", "साइट नियुक्ति समाप्त करें")}
          operation="end_assignment"
          base={{
            employeeId: e.id,
            expectedVersion: e.version,
            assignmentId: edit.split(":")[1],
          }}
          onClose={closeEdit}
          fields={[
            {
              name: "endsOn",
              label: t("Last day at this site", "इस साइट पर अंतिम दिन"),
              type: "date",
              help: t(
                "For leaving the company, record an exit in Lifecycle instead.",
                "कंपनी छोड़ने के लिए जीवनचक्र में निकास दर्ज करें।",
              ),
            },
          ]}
        />
      )}
    </>
  );
}
function LoginPanel({ e }: { e: AdminEmployee }) {
  const s = useScope(),
    t = useT(),
    write = useWrite(),
    passwordId = useId();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [issued, setIssued] = useState<string | null>(null),
    [password, setPassword] = useState("");
  const l = e.login!;
  const former = e.status === "former";
  const canManage =
    e.allowedActions.includes("edit") &&
    e.allowedActions.includes("approve") &&
    !e.isSelf &&
    !l.protected &&
    l.status !== "none";
  async function run(operation: string, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const r = await write<EmployeeLifecycleMutation>(
        EmployeeLifecycleDocument,
        {
          operation,
          input: {
            employeeId: e.id,
            expectedVersion: e.version,
            ...(operation === "set_password"
              ? { password: password || null }
              : {}),
          },
        },
      );
      if (r.employeeLifecycle.password) {
        setIssued(r.employeeLifecycle.password);
        setPassword("");
      } else
        setMessage(
          operation === "disable_login"
            ? t(
                "Login disabled. The employee is signed out everywhere.",
                "लॉगिन बंद। कर्मचारी हर जगह से साइन आउट हुए।",
              )
            : t("Login enabled.", "लॉगिन चालू।"),
        );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function invite() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await rest("/auth/invitations", { siteId: s.siteId, employeeId: e.id });
      setMessage(
        t(
          `A set-password link was emailed to ${l.loginId}. It expires in 30 minutes.`,
          `${l.loginId} पर पासवर्ड लिंक भेजा गया। यह 30 मिनट में समाप्त होगा।`,
        ),
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const canInvite =
    s.capabilities.includes("employees.create") &&
    !former &&
    !e.isSelf &&
    ["pending", "active"].includes(l.status);
  const canToggle = canManage && (l.status !== "disabled" || !former);
  return (
    <div className="grid gap-4 rounded-lg border p-4">
      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        <DetailItem label={t("Login ID", "लॉगिन आईडी")}>
          <span className="font-mono">{l.loginId ?? "—"}</span>
        </DetailItem>
        <DetailItem label={t("Status", "स्थिति")}>
          <LoginBadge e={e} />
        </DetailItem>
        <DetailItem label={t("Last sign-in", "अंतिम साइन इन")}>
          {l.lastSignInAt
            ? formatDateTime(l.lastSignInAt)
            : t("Never", "कभी नहीं")}
        </DetailItem>
        <DetailItem label={t("Registered devices", "पंजीकृत डिवाइस")}>
          {l.devices}
        </DetailItem>
      </dl>
      {l.protected ? (
        <Notice>
          {t(
            "This account has elevated access, so it is managed in Users & module access. The person resets their own password by email.",
            "इस खाते के पास उच्च अनुमति है, इसलिए इसे उपयोगकर्ता और अनुमति में संभालें। व्यक्ति ईमेल से अपना पासवर्ड बदलें।",
          )}
        </Notice>
      ) : e.isSelf ? (
        <Notice>
          {t(
            "You cannot manage your own login here.",
            "आप यहाँ अपना लॉगिन नहीं बदल सकते।",
          )}
        </Notice>
      ) : (
        former &&
        l.status !== "disabled" && (
          <Notice>
            {t(
              "This employee has exited but can still sign in. Disable the login.",
              "यह कर्मचारी बाहर हो चुके हैं पर साइन इन कर सकते हैं। लॉगिन बंद करें।",
            )}
          </Notice>
        )
      )}
      {!l.protected && !e.isSelf && l.status === "pending" && !former && (
        <p className="text-muted-foreground text-sm">
          {t(
            "Set a password and share it with the employee, or email them a link to set their own.",
            "पासवर्ड बनाकर कर्मचारी को दें, या उन्हें स्वयं पासवर्ड बनाने का लिंक ईमेल करें।",
          )}
        </p>
      )}
      {canManage && !former && (
        <form
          className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            if (password && password.length < 8)
              return setError(
                t(
                  "Use at least 8 characters, or leave it blank to generate one.",
                  "कम से कम 8 अक्षर रखें, या अपने आप बनाने के लिए खाली छोड़ें।",
                ),
              );
            void run(
              "set_password",
              l.status === "pending"
                ? undefined
                : t(
                    "Set a new password? The old one stops working and the employee is signed out of every device.",
                    "नया पासवर्ड सेट करें? पुराना पासवर्ड बंद होगा और कर्मचारी हर डिवाइस से साइन आउट होंगे।",
                  ),
            );
          }}
        >
          <Field label={t("New password", "नया पासवर्ड")} htmlFor={passwordId}>
            <Input
              id={passwordId}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              maxLength={128}
              autoComplete="new-password"
              placeholder={t("Blank = generate one", "खाली = अपने आप बनेगा")}
            />
          </Field>
          <Button type="submit" disabled={busy}>
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <KeyRound className="size-4" />
            )}
            {l.status === "pending"
              ? t("Set password", "पासवर्ड सेट करें")
              : t("Reset password", "पासवर्ड रीसेट करें")}
          </Button>
        </form>
      )}
      {(canInvite || canToggle) && (
        <div className="flex flex-wrap gap-2">
          {canInvite && (
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={invite}
            >
              <Mail className="size-4" />
              {t("Email set-password link", "पासवर्ड लिंक ईमेल करें")}
            </Button>
          )}
          {canToggle &&
            (l.status === "disabled" ? (
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => run("enable_login")}
              >
                <CircleCheck className="size-4" />
                {t("Enable login", "लॉगिन चालू करें")}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                className="text-destructive hover:text-destructive"
                onClick={() =>
                  run(
                    "disable_login",
                    t(
                      `Disable ${e.displayName}'s login? They are signed out of every device until it is enabled again.`,
                      `${e.displayName} का लॉगिन बंद करें? दोबारा चालू होने तक वे हर डिवाइस से साइन आउट रहेंगे।`,
                    ),
                  )
                }
              >
                <Ban className="size-4" />
                {t("Disable login", "लॉगिन बंद करें")}
              </Button>
            ))}
        </div>
      )}
      {error && <Notice>{error}</Notice>}
      {message && <Notice success>{message}</Notice>}
      {issued && (
        <CredentialsDialog
          loginId={l.loginId ?? ""}
          password={issued}
          onClose={() => setIssued(null)}
        />
      )}
    </div>
  );
}
function CredentialsDialog({
  loginId,
  password,
  onClose,
}: {
  loginId: string;
  password: string;
  onClose: () => void;
}) {
  const t = useT();
  const [copied, setCopied] = useState("");
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("App login ready", "ऐप लॉगिन तैयार")}</DialogTitle>
          <DialogDescription>
            {t(
              "Share these with the employee privately. The password is shown only once; issuing another replaces it.",
              "यह जानकारी कर्मचारी को निजी रूप से दें। पासवर्ड केवल एक बार दिखता है; नया जारी करने पर यह बदल जाएगा।",
            )}
          </DialogDescription>
        </DialogHeader>
        <dl className="bg-muted/40 grid gap-4 rounded-lg border p-4">
          <DetailItem label={t("Login ID", "लॉगिन आईडी")}>
            <span className="font-mono select-all">{loginId}</span>
          </DetailItem>
          <DetailItem label={t("Password", "पासवर्ड")}>
            <span className="font-mono text-lg tracking-wide select-all">
              {password}
            </span>
          </DetailItem>
        </dl>
        {copied && (
          <Notice success={copied === "ok"}>
            {copied === "ok"
              ? t("Copied.", "कॉपी हुआ।")
              : t(
                  "Copy failed. Select the text instead.",
                  "कॉपी नहीं हुआ। टेक्स्ट चुनें।",
                )}
          </Notice>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() =>
              navigator.clipboard
                .writeText(
                  `Defence Garden HR app\nLogin ID: ${loginId}\nPassword: ${password}`,
                )
                .then(
                  () => setCopied("ok"),
                  () => setCopied("failed"),
                )
            }
          >
            <Copy className="size-4" />
            {t("Copy login details", "लॉगिन विवरण कॉपी करें")}
          </Button>
          <Button onClick={onClose}>{t("Done", "हो गया")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
function RehireDialog({
  e,
  foundation,
  onClose,
}: {
  e: AdminEmployee;
  foundation: FoundationQuery["foundation"];
  onClose: () => void;
}) {
  const s = useScope(),
    t = useT(),
    write = useWrite(),
    id = useId();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Rehire employee", "पुनः नियुक्ति")}</DialogTitle>
          <DialogDescription>
            {t(
              `Starts a new employment at ${s.siteName} and re-enables the app login. Earlier employment stays in the history.`,
              `${s.siteName} पर नया रोजगार शुरू करता है और ऐप लॉगिन फिर चालू करता है। पुराना रोजगार इतिहास में रहता है।`,
            )}
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            setBusy(true);
            setError("");
            try {
              await write(EmployeeLifecycleDocument, {
                operation: "rehire",
                input: {
                  employeeId: e.id,
                  expectedVersion: e.version,
                  legalEmployerId: form.get("legalEmployerId"),
                  startsOn: form.get("startsOn"),
                },
              });
              onClose();
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field
            label={t("Legal employer", "कानूनी नियोक्ता")}
            htmlFor={`${id}-employer`}
          >
            <NativeSelect
              id={`${id}-employer`}
              name="legalEmployerId"
              required
              defaultValue=""
            >
              <option value="">{t("Choose…", "चुनें…")}</option>
              {foundation.employers.map((o) => (
                <option value={o.id} key={o.id}>
                  {o.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field
            label={t("Joining date", "कार्यग्रहण तिथि")}
            htmlFor={`${id}-starts`}
          >
            <Input
              id={`${id}-starts`}
              name="startsOn"
              type="date"
              required
              defaultValue={s.workDate}
            />
          </Field>
          {error && (
            <Alert variant="destructive">
              <TriangleAlert />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={onClose}
            >
              {t("Cancel", "रद्द करें")}
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RotateCcw className="size-4" />
              )}
              {t("Rehire", "पुनः नियुक्त करें")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
function ExportDialog({ onClose }: { onClose: () => void }) {
  const s = useScope(),
    write = useWrite(),
    t = useT();
  const [fields, setFields] = useState(["employeeCode", "displayName"]),
    [job, setJob] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const q = useScopedQuery<ExportJobQuery>(
    ["export", job],
    ExportJobDocument,
    { id: job },
    !!job,
    job ? 2000 : undefined,
  );
  const options = [
    "employeeCode",
    "displayName",
    ...(s.capabilities.includes("employees.field.employment")
      ? ["department", "jobTitle"]
      : []),
    ...(s.capabilities.includes("employees.field.contact") ? ["phone"] : []),
    ...["salary", "bank", "identity"].filter((f) =>
      s.capabilities.includes(`employees.field.${f}`),
    ),
  ];
  const status = q.data?.exportJob.status;
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t("Export employee records", "कर्मचारी रिकॉर्ड निर्यात")}
          </DialogTitle>
          <DialogDescription>
            {s.siteName} ·{" "}
            {t(
              "Up to 1,000 authorized records. Downloads expire after 15 minutes.",
              "अधिकतम 1,000 अधिकृत रिकॉर्ड। डाउनलोड 15 मिनट में समाप्त होता है।",
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <p className="text-sm font-medium">
            {t("Columns to include", "शामिल कॉलम")}
          </p>
          <div className="divide-y rounded-lg border">
            {options.map((f) => (
              <label
                key={f}
                className={cn(
                  "flex items-center justify-between gap-3 px-3 py-2.5 text-sm font-normal",
                  !job && "cursor-pointer",
                )}
              >
                <span className="flex items-center gap-2">
                  {exportLabels[f] ? t(...exportLabels[f]) : f}
                  {["salary", "bank", "identity"].includes(f) && (
                    <UiBadge variant="warning">
                      {t("Sensitive", "संवेदनशील")}
                    </UiBadge>
                  )}
                </span>
                <Switch
                  checked={fields.includes(f)}
                  disabled={!!job}
                  onChange={(e) =>
                    setFields(
                      e.target.checked
                        ? [...fields, f]
                        : fields.filter((x) => x !== f),
                    )
                  }
                />
              </label>
            ))}
          </div>
        </div>
        {error && (
          <Alert variant="destructive">
            <TriangleAlert />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {q.error && (
          <ErrorState error={q.error} retry={() => void q.refetch()} />
        )}
        {job &&
          status !== "ready" &&
          (status === "denied" ? (
            <Notice>
              {t(
                "Access changed. Create a new export after reviewing your permissions.",
                "अनुमति बदल गई। अनुमति जाँचने के बाद नया निर्यात बनाएँ।",
              )}
            </Notice>
          ) : (
            <Alert variant="info">
              <Loader2 className="animate-spin" />
              <AlertDescription>
                {t(
                  "Queued for authorization check. This will update automatically.",
                  "अनुमति जाँच की कतार में। यह अपने आप अपडेट होगा।",
                )}
              </AlertDescription>
            </Alert>
          ))}
        <DialogFooter>
          {/* Named like the legacy dialogs' close control, which browser tests use. */}
          <Button
            type="button"
            variant="outline"
            aria-label={t("Close dialog", "संवाद बंद करें")}
            onClick={onClose}
          >
            {t("Close", "बंद करें")}
          </Button>
          {!job ? (
            <Button
              disabled={busy || !fields.length}
              onClick={async () => {
                setBusy(true);
                try {
                  const r = await write<QueueExportMutation>(
                    QueueExportDocument,
                    { fields },
                  );
                  setJob(r.queueExport.id);
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              {t("Prepare export", "निर्यात तैयार करें")}
            </Button>
          ) : status === "ready" ? (
            <Button asChild>
              <a href={`/files/exports/${job}?siteId=${s.siteId}`} download>
                <Download className="size-4" />
                {t("Download CSV", "CSV डाउनलोड करें")}
              </a>
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
const exportLabels: Record<string, [string, string]> = {
  employeeCode: ["Employee ID", "कर्मचारी आईडी"],
  displayName: ["Full name", "पूरा नाम"],
  department: ["Department", "विभाग"],
  jobTitle: ["Designation", "पदनाम"],
  phone: ["Phone number", "फ़ोन नंबर"],
  salary: ["Salary", "वेतन"],
  bank: ["Bank account", "बैंक खाता"],
  identity: ["Identity reference", "पहचान संदर्भ"],
};
const personalLabels: [keyof PersonalFieldsFragment, string, string][] = [
  ["dateOfBirth", "Date of birth", "जन्म तिथि"],
  ["gender", "Gender", "लिंग"],
  ["bloodGroup", "Blood group", "रक्त समूह"],
  ["personalEmail", "Personal email", "निजी ईमेल"],
  ["address", "Current address", "वर्तमान पता"],
  ["permanentAddress", "Permanent address", "स्थायी पता"],
  ["emergencyName", "Emergency contact", "आपातकालीन संपर्क"],
  ["emergencyRelation", "Emergency relation", "आपातकालीन संबंध"],
  ["emergencyPhone", "Emergency phone", "आपातकालीन फ़ोन"],
];
const genders: Record<string, [string, string]> = {
  female: ["Female", "महिला"],
  male: ["Male", "पुरुष"],
  other: ["Other", "अन्य"],
  undisclosed: ["Prefer not to say", "नहीं बताना"],
};
function usePersonalValue() {
  const t = useT();
  return (key: string, value?: string | null) =>
    value == null
      ? "—"
      : key === "gender" && genders[value]
        ? t(...genders[value])
        : value;
}
function photoUrl(kind: "employee" | "request", id: string, siteId: string) {
  return `/profile/photos/${kind}/${id}?siteId=${encodeURIComponent(siteId)}`;
}
type ProfileRequest = ProfileRequestsQuery["profileRequests"][number];
/** Changed fields as [key, label, current, proposed]. Pending requests are
 * compared with the current record; decided ones list what was submitted. */
function requestDiff(r: ProfileRequest, t: (en: string, hi: string) => string) {
  const pending = r.status === "pending";
  return [
    ...(pending && r.currentPhone !== r.phone
      ? [["phone", t("Phone number", "फ़ोन नंबर"), r.currentPhone, r.phone]]
      : []),
    ...personalLabels
      .filter(
        ([k]) =>
          r.details &&
          (r.details[k] ?? null) !==
            (pending ? (r.currentDetails?.[k] ?? null) : null),
      )
      .map(([k, en, hi]) => [
        k,
        t(en, hi),
        r.currentDetails?.[k],
        r.details?.[k],
      ]),
  ] as [string, string, string | null | undefined, string | null | undefined][];
}
// Proposed photo and changed fields; pending requests also show current values.
function RequestChanges({ r }: { r: ProfileRequest }) {
  const s = useScope(),
    t = useT(),
    show = usePersonalValue();
  const [currentPhoto, setCurrentPhoto] = useState(true);
  const pending = r.status === "pending";
  const rows = requestDiff(r, t);
  if (!r.hasPhoto && !rows.length)
    return (
      <p className="text-muted-foreground text-sm">
        {t(
          "No field changes in this request.",
          "इस अनुरोध में कोई बदलाव नहीं।",
        )}
      </p>
    );
  return (
    <div className="grid gap-3">
      {r.hasPhoto && (
        <div className="flex flex-wrap items-center gap-4 rounded-lg border p-4">
          {pending && currentPhoto && (
            <>
              <img
                className="size-14 rounded-full object-cover opacity-70"
                src={photoUrl("employee", r.employeeId, s.siteId)}
                alt={t("Current photo", "वर्तमान फ़ोटो")}
                onError={() => setCurrentPhoto(false)}
              />
              <ArrowRight className="text-muted-foreground size-4" />
            </>
          )}
          <img
            className="ring-success/40 size-16 rounded-full object-cover ring-2"
            src={photoUrl("request", r.id, s.siteId)}
            alt={t("Proposed photo", "प्रस्तावित फ़ोटो")}
          />
          <span className="text-muted-foreground text-sm">
            {t("New profile photo", "नई प्रोफ़ाइल फ़ोटो")}
          </span>
        </div>
      )}
      {rows.length > 0 && (
        <dl className="divide-y rounded-lg border">
          {rows.map(([k, label, before, after]) => (
            <div
              key={k}
              className="grid gap-1.5 px-4 py-3 sm:grid-cols-[140px_1fr] sm:items-center sm:gap-4"
            >
              <dt className="text-muted-foreground m-0 text-xs font-medium">
                {label}
              </dt>
              <dd className="m-0 flex min-w-0 flex-wrap items-center gap-2 text-sm">
                {pending && (
                  <>
                    <span className="bg-destructive/10 text-muted-foreground decoration-destructive/50 rounded px-1.5 py-0.5 break-all line-through">
                      {show(k, before)}
                    </span>
                    <ArrowRight className="text-muted-foreground size-3.5 shrink-0" />
                  </>
                )}
                <span className="bg-success/10 rounded px-1.5 py-0.5 font-medium break-all">
                  {show(k, after)}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
function RequestSheet({
  r,
  onClose,
  canDecide,
  onDecide,
  statusLabel,
}: {
  r: ProfileRequest | null;
  onClose: () => void;
  canDecide: boolean;
  onDecide: (approve: boolean) => void;
  statusLabel: (status: string) => string;
}) {
  const t = useT();
  if (!r) return null;
  const pending = r.status === "pending";
  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="gap-3 border-b p-6 pr-12">
          <div className="flex items-center gap-3">
            <Avatar className="size-11">
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {initials(r.employeeName)}
              </AvatarFallback>
            </Avatar>
            <div className="grid min-w-0 gap-0.5">
              <SheetTitle className="truncate text-lg leading-tight">
                {r.employeeName}
              </SheetTitle>
              <SheetDescription>
                {r.phone} · {formatDateTime(r.createdAt)}
              </SheetDescription>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={statusTone(r.status)}>{statusLabel(r.status)}</Badge>
            {r.hasPhoto && (
              <UiBadge variant="outline">
                <Camera />
                {t("New photo", "नई फ़ोटो")}
              </UiBadge>
            )}
            {r.isSelf && (
              <UiBadge variant="outline">
                {t("Your own request", "आपका अपना अनुरोध")}
              </UiBadge>
            )}
          </div>
        </SheetHeader>
        <div className="grid flex-1 content-start gap-6 overflow-y-auto p-6">
          <section className="grid gap-2">
            <h3 className="text-sm font-semibold">{t("Reason", "कारण")}</h3>
            <p className="text-muted-foreground text-sm whitespace-pre-wrap">
              {r.reason}
            </p>
          </section>
          <section className="grid gap-2">
            <h3 className="text-sm font-semibold">
              {pending
                ? t("Current → proposed", "वर्तमान → प्रस्तावित")
                : t("Requested changes", "अनुरोधित बदलाव")}
            </h3>
            <RequestChanges r={r} />
          </section>
          {r.reviewNote && (
            <section className="grid gap-2">
              <h3 className="text-sm font-semibold">
                {t("Review note", "समीक्षा टिप्पणी")}
              </h3>
              <p className="bg-muted/40 rounded-lg border p-3 text-sm whitespace-pre-wrap">
                {r.reviewNote}
              </p>
            </section>
          )}
          {pending && r.isSelf && (
            <Notice>
              {t(
                "This is your own request, so someone else must review it.",
                "यह आपका अपना अनुरोध है, इसलिए समीक्षा कोई और करेगा।",
              )}
            </Notice>
          )}
        </div>
        {canDecide && (
          <SheetFooter className="flex-row justify-end gap-2 border-t p-4">
            <Button variant="outline" onClick={() => onDecide(false)}>
              <CircleX className="size-4" />
              {t("Reject", "अस्वीकार")}
            </Button>
            <Button onClick={() => onDecide(true)}>
              <CircleCheck className="size-4" />
              {t("Approve", "स्वीकार")}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
export function RequestsPanel() {
  const s = useScope(),
    t = useT();
  const query = useScopedQuery<ProfileRequestsQuery>(
    ["profile-requests"],
    ProfileRequestsDocument,
  );
  const [review, setReview] = useState<ProfileRequest | null>(null),
    [approve, setApprove] = useState(true),
    [focus, setFocus] = useState<string | null>(null),
    [filters, setFilters] = useState<ColumnFiltersState>([]);
  const title = t("Profile update requests", "प्रोफ़ाइल अपडेट अनुरोध");
  if (query.isPending) return <PageSkeleton title={title} />;
  if (query.error)
    return (
      <ErrorState error={query.error} retry={() => void query.refetch()} />
    );
  const requests = query.data.profileRequests;
  const canDecide = (r: ProfileRequest) =>
    r.status === "pending" &&
    !r.isSelf &&
    s.capabilities.includes("employees.approve");
  const decide = (r: ProfileRequest, yes: boolean) => {
    setReview(r);
    setApprove(yes);
  };
  const statusLabel = (v: string) =>
    (
      ({
        pending: t("Pending", "लंबित"),
        approved: t("Approved", "स्वीकृत"),
        rejected: t("Rejected", "अस्वीकृत"),
      }) as Record<string, string>
    )[v] ?? humanize(v);
  const changes = (r: ProfileRequest) => [
    ...(r.hasPhoto ? [t("Photo", "फ़ोटो")] : []),
    ...requestDiff(r, t).map(([, label]) => label),
  ];
  const count = (v: string) => requests.filter((r) => r.status === v).length;
  const presets = {
    pending: [{ id: "status", value: ["pending"] }],
    approved: [{ id: "status", value: ["approved"] }],
    rejected: [{ id: "status", value: ["rejected"] }],
  };
  const preset = (next: ColumnFiltersState) =>
    setFilters((current) => (sameFilters(current, next) ? [] : next));
  const focused = requests.find((r) => r.id === focus) ?? null;
  const columns: ColumnDef<ProfileRequest>[] = [
    {
      header: t("Employee", "कर्मचारी"),
      id: "employee",
      accessorFn: (r) => r.employeeName,
      cell: ({ row: { original: r } }) => (
        <span className="flex min-w-[200px] items-center gap-3">
          <Avatar className="size-8">
            <AvatarFallback className="bg-primary/10 text-primary text-[11px]">
              {initials(r.employeeName)}
            </AvatarFallback>
          </Avatar>
          <span className="grid min-w-0">
            <span className="truncate font-medium">{r.employeeName}</span>
            <span className="text-muted-foreground truncate text-xs">
              {r.phone}
            </span>
          </span>
        </span>
      ),
    },
    {
      header: t("Changes", "बदलाव"),
      id: "changes",
      accessorFn: (r) => changes(r).join(", "),
      enableSorting: false,
      cell: ({ row: { original: r } }) => {
        const list = changes(r);
        return list.length ? (
          <span className="flex max-w-[320px] flex-wrap gap-1">
            {list.slice(0, 3).map((c) => (
              <UiBadge key={c} variant="outline" className="font-normal">
                {c}
              </UiBadge>
            ))}
            {list.length > 3 && (
              <UiBadge variant="secondary" className="font-normal">
                +{list.length - 3}
              </UiBadge>
            )}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      header: t("Reason", "कारण"),
      accessorKey: "reason",
      cell: ({ getValue }) => (
        <span className="line-clamp-2 max-w-[280px] min-w-[180px] whitespace-normal">
          {String(getValue())}
        </span>
      ),
    },
    {
      header: t("Submitted", "जमा"),
      accessorKey: "createdAt",
      cell: ({ row: { original: r } }) => (
        <span className="flex flex-col whitespace-nowrap">
          <span>{formatDate(r.createdAt)}</span>
          <span className="text-muted-foreground text-xs">
            {formatRelative(r.createdAt)}
          </span>
        </span>
      ),
    },
    {
      header: t("Status", "स्थिति"),
      accessorKey: "status",
      cell: ({ row: { original: r } }) => (
        <Badge tone={statusTone(r.status)}>{statusLabel(r.status)}</Badge>
      ),
    },
    {
      header: "",
      id: "actions",
      enableHiding: false,
      cell: ({ row: { original: r } }) => (
        <div className="flex justify-end">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`${t("Actions for", "कार्रवाई")} ${r.employeeName}`}
                className="data-[state=open]:bg-muted"
              >
                <Ellipsis className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onSelect={() => setFocus(r.id)}>
                <Eye />
                {t("Review changes", "बदलाव देखें")}
              </DropdownMenuItem>
              {canDecide(r) && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => decide(r, true)}>
                    <CircleCheck />
                    {t("Approve", "स्वीकार")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => decide(r, false)}
                  >
                    <CircleX />
                    {t("Reject", "अस्वीकार")}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];
  return (
    <section className="grid gap-5">
      <Heading
        title={title}
        description={t(
          `Review photo, contact and personal-detail changes from employees at ${s.siteName} before they reach the employee record.`,
          `${s.siteName} के कर्मचारियों के फ़ोटो, संपर्क और व्यक्तिगत विवरण बदलावों की रिकॉर्ड तक पहुँचने से पहले समीक्षा करें।`,
        )}
      />
      {requests.length === 0 ? (
        <Empty
          icon={FileCheck2}
          title={t("You’re all caught up", "कोई अनुरोध लंबित नहीं")}
        >
          {t(
            "New profile requests will appear here.",
            "नए प्रोफ़ाइल अनुरोध यहाँ दिखेंगे।",
          )}
        </Empty>
      ) : (
        <>
          <StatGrid>
            <StatCard
              label={t("Waiting for review", "समीक्षा बाकी")}
              value={count("pending")}
              hint={t("Pending decisions", "लंबित निर्णय")}
              icon={Hourglass}
              tone={count("pending") ? "warning" : "default"}
              active={sameFilters(filters, presets.pending)}
              onClick={() => preset(presets.pending)}
            />
            <StatCard
              label={t("Approved", "स्वीकृत")}
              value={count("approved")}
              hint={t("Applied to the employee record", "रिकॉर्ड में लागू")}
              icon={CircleCheck}
              tone="success"
              active={sameFilters(filters, presets.approved)}
              onClick={() => preset(presets.approved)}
            />
            <StatCard
              label={t("Rejected", "अस्वीकृत")}
              value={count("rejected")}
              hint={t("Returned with a review note", "समीक्षा टिप्पणी के साथ")}
              icon={CircleX}
              tone={count("rejected") ? "danger" : "default"}
              active={sameFilters(filters, presets.rejected)}
              onClick={() => preset(presets.rejected)}
            />
            <StatCard
              label={t("All requests", "सभी अनुरोध")}
              value={requests.length}
              hint={`${requests.filter((r) => r.hasPhoto).length} ${t("with a new photo", "नई फ़ोटो के साथ")}`}
              icon={FileCheck2}
            />
          </StatGrid>
          <DataTable
            data={requests}
            columns={columns}
            getRowId={(r) => r.id}
            label={t("Profile requests", "प्रोफ़ाइल अनुरोध")}
            search={t(
              "Search people, changes or reasons…",
              "व्यक्ति, बदलाव या कारण खोजें…",
            )}
            columnFilters={filters}
            onColumnFiltersChange={setFilters}
            onRowClick={(r) => setFocus(r.id)}
            filters={[
              {
                column: "status",
                title: t("Status", "स्थिति"),
                options: ["pending", "approved", "rejected"].map((v) => ({
                  value: v,
                  label: statusLabel(v),
                })),
              },
            ]}
          />
        </>
      )}
      <RequestSheet
        key={focused?.id}
        r={focused}
        onClose={() => setFocus(null)}
        canDecide={focused ? canDecide(focused) : false}
        onDecide={(yes) => focused && decide(focused, yes)}
        statusLabel={statusLabel}
      />
      {review && (
        <FoundationForm
          title={
            approve
              ? t("Approve profile request", "प्रोफ़ाइल अनुरोध स्वीकार")
              : t("Reject profile request", "प्रोफ़ाइल अनुरोध अस्वीकार")
          }
          operation="review_profile"
          base={{ id: review.id, expectedVersion: review.version, approve }}
          submitLabel={
            approve
              ? t("Approve request", "अनुरोध स्वीकार करें")
              : t("Reject request", "अनुरोध अस्वीकार करें")
          }
          fields={[
            {
              name: "note",
              label: t("Review note", "समीक्षा टिप्पणी"),
              type: "textarea",
            },
          ]}
          onSaved={() => {
            toast.success(
              approve
                ? t("Request approved", "अनुरोध स्वीकृत")
                : t("Request rejected", "अनुरोध अस्वीकृत"),
            );
          }}
          onClose={() => setReview(null)}
        />
      )}
    </section>
  );
}
type Reference = FoundationQuery["foundation"]["references"][number];
type ReferenceKind = "department" | "designation" | "shift" | "holiday";
type ProductModule = ReturnType<typeof useScope>["modules"][number];
const referenceKinds: ReferenceKind[] = [
  "department",
  "designation",
  "shift",
  "holiday",
];
const weekdays = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
/** "09:00"–"18:00" → "9h"; a shift ending before it starts runs past midnight. */
function shiftLength(start?: string | null, end?: string | null) {
  if (!start || !end) return "";
  const minutes = (value: string) => {
    const [h, m] = value.split(":").map(Number);
    return h * 60 + m;
  };
  const span = (minutes(end) - minutes(start) + 1440) % 1440 || 1440;
  return span % 60
    ? `${Math.floor(span / 60)}h ${span % 60}m`
    : `${span / 60}h`;
}
/** One label/value pair of a definition list. */
function DetailItem({
  label,
  children,
  className,
}: {
  label: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid min-w-0 content-start gap-1", className)}>
      <dt className="text-muted-foreground m-0 text-xs">{label}</dt>
      <dd className="m-0 text-sm font-medium break-words">{children}</dd>
    </div>
  );
}
type SetupSegment = ReferenceKind | "modules";
const weekdayName = (date: string) =>
  new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(
    new Date(`${date}T00:00:00`),
  );
/** Site setup as a review desk: KPI strip, one queue per reference list and a
 * persistent inspector whose action bar opens the existing forms. */
export function SettingsPanel({
  initialTab = "department",
}: { initialTab?: string } = {}) {
  const s = useScope(),
    t = useT(),
    write = useWrite();
  const q = useScopedQuery<FoundationQuery>(["foundation"], FoundationDocument);
  const [tab, setTab] = useState(initialTab as SetupSegment),
    [edit, setEdit] = useState<
      Reference | "new" | "settings" | "organization" | null
    >(null),
    [busy, setBusy] = useState<string | null>(null),
    [search, setSearch] = useState(""),
    [selectedId, setSelectedId] = useState<string | null>(null),
    [assign, setAssign] = useState<string | null>(null);
  const can = s.capabilities.includes("site_settings.manage"),
    org = s.capabilities.includes("organization.manage"),
    canSchedule = s.capabilities.includes("attendance.edit");
  const f = q.data?.foundation;
  const references = f?.references ?? [];
  const meta: Record<
    ReferenceKind,
    { label: string; one: string; add: string; icon: LucideIcon }
  > = {
    department: {
      label: t("Departments", "विभाग"),
      one: t("Department", "विभाग"),
      add: t("Add department", "विभाग जोड़ें"),
      icon: Building2,
    },
    designation: {
      label: t("Designations", "पदनाम"),
      one: t("Designation", "पदनाम"),
      add: t("Add designation", "पदनाम जोड़ें"),
      icon: BadgeCheck,
    },
    shift: {
      label: t("Shifts", "शिफ्ट"),
      one: t("Shift", "शिफ्ट"),
      add: t("Add shift", "शिफ्ट जोड़ें"),
      icon: Clock3,
    },
    holiday: {
      label: t("Holidays", "छुट्टियाँ"),
      one: t("Holiday", "छुट्टी"),
      add: t("Add holiday", "छुट्टी जोड़ें"),
      icon: CalendarDays,
    },
  };
  const kind = tab === "modules" ? null : tab;
  const count = (k: ReferenceKind) =>
    references.filter((r) => r.kind === k).length;
  const needle = search.trim().toLowerCase();
  const items = kind ? references.filter((r) => r.kind === kind) : [];
  const rows = items.filter(
    (r) =>
      !needle ||
      [r.name, r.date, r.startTime, r.endTime]
        .join(" ")
        .toLowerCase()
        .includes(needle),
  );
  const modules = s.modules.filter(
    (m) =>
      !needle ||
      [m.name, m.hindi, m.group].join(" ").toLowerCase().includes(needle),
  );
  // Like the review desk: the first visible row is selected until one is chosen.
  const active = items.find((r) => r.id === selectedId) ?? items[0] ?? null;
  const activeModule =
    tab === "modules"
      ? (modules.find((m) => m.id === selectedId) ?? modules[0] ?? null)
      : null;
  const status = (r: Reference) =>
    r.active ? (
      <Pill tone="success">{t("Active", "सक्रिय")}</Pill>
    ) : (
      <Pill tone="neutral">{t("Inactive", "निष्क्रिय")}</Pill>
    );
  // Deactivate/reactivate re-saves the record unchanged except for `active`.
  async function setActive(r: Reference) {
    setBusy(r.id);
    try {
      await write(SaveFoundationDocument, {
        operation: "reference",
        input: {
          kind: r.kind,
          id: r.id,
          expectedVersion: r.version,
          active: !r.active,
          name: r.name,
          ...(r.kind === "shift"
            ? { startTime: r.startTime, endTime: r.endTime }
            : {}),
          ...(r.kind === "holiday" ? { date: r.date } : {}),
        },
      });
      toast.success(
        r.active
          ? t(`${r.name} deactivated`, `${r.name} निष्क्रिय`)
          : t(`${r.name} reactivated`, `${r.name} फिर सक्रिय`),
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  const moduleOn = (m: ProductModule) =>
    s.decisions.find((d) => d.key === `${m.id}.view`)?.decision.rule !==
    "module_disabled";
  const required = (m: ProductModule) => ["access", "my_hr"].includes(m.id);
  async function setModule(m: ProductModule, enabled: boolean) {
    if (!f) return;
    setBusy(m.id);
    try {
      await write(SaveFoundationDocument, {
        operation: "module",
        input: {
          moduleId: m.id,
          enabled,
          expectedVersion: f.settings.version,
        },
      });
      s.reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  const nameCell = (k: ReferenceKind) => (r: Reference) => {
    const Icon = meta[k].icon;
    return (
      <div className="rd-person min-w-[150px]">
        <span className="rd-avatar" aria-hidden="true">
          <Icon size={14} />
        </span>
        <span>
          <strong>{r.name}</strong>
        </span>
      </div>
    );
  };
  const referenceColumns = (k: ReferenceKind): DeskColumn<Reference>[] => [
    {
      id: "name",
      header: t("Name", "नाम"),
      sortValue: (r) => r.name.toLowerCase(),
      cell: nameCell(k),
    },
    ...(k === "shift"
      ? [
          {
            id: "hours",
            header: t("Hours", "समय"),
            className: "rd-mono",
            sortValue: (r: Reference) => r.startTime ?? "",
            cell: (r: Reference) =>
              r.startTime ? `${r.startTime} – ${r.endTime}` : "—",
          },
          {
            id: "length",
            header: t("Length", "अवधि"),
            className: "rd-mono",
            cell: (r: Reference) => (
              <span className="rd-muted">
                {shiftLength(r.startTime, r.endTime) || "—"}
              </span>
            ),
          },
        ]
      : k === "holiday"
        ? [
            {
              id: "date",
              header: t("Date", "तारीख"),
              className: "rd-mono",
              sortValue: (r: Reference) => r.date ?? "",
              cell: (r: Reference) => formatDate(r.date),
            },
            {
              id: "when",
              header: t("When", "कब"),
              cell: (r: Reference) => (
                <span className="rd-muted">
                  {r.date
                    ? `${weekdayName(r.date)} · ${formatRelative(r.date)}`
                    : "—"}
                </span>
              ),
            },
          ]
        : [
            {
              id: "version",
              header: t("Version", "संस्करण"),
              className: "rd-mono",
              cell: (r: Reference) => (
                <span className="rd-muted">v{r.version}</span>
              ),
            },
          ]),
    {
      id: "status",
      header: t("Status", "स्थिति"),
      sortValue: (r) => (r.active ? 0 : 1),
      cell: status,
    },
  ];
  const moduleColumns: DeskColumn<ProductModule>[] = [
    {
      id: "module",
      header: t("Module", "मॉड्यूल"),
      sortValue: (m) => t(m.name, m.hindi),
      cell: (m) => (
        <div className="rd-person min-w-[150px]">
          <span className="rd-avatar" aria-hidden="true">
            <Blocks size={14} />
          </span>
          <span>
            <strong>{t(m.name, m.hindi)}</strong>
            <small>{humanize(m.group)}</small>
          </span>
        </div>
      ),
    },
    {
      id: "release",
      header: t("Release", "रिलीज़"),
      cell: (m) =>
        m.available ? (
          <Pill tone="success">{t("Available", "उपलब्ध")}</Pill>
        ) : (
          <Pill tone="neutral">{t(`Phase ${m.phase}`, `चरण ${m.phase}`)}</Pill>
        ),
    },
    {
      id: "enabled",
      header: t("At this site", "इस साइट पर"),
      sortValue: (m) => (moduleOn(m) ? 0 : 1),
      cell: (m) =>
        moduleOn(m) ? (
          <Pill tone="success">
            {required(m) ? t("Required", "आवश्यक") : t("On", "चालू")}
          </Pill>
        ) : (
          <Pill tone="warning">{t("Off", "बंद")}</Pill>
        ),
    },
  ];
  const title =
    initialTab === "shift"
      ? t("Shifts & holidays", "शिफ्ट और छुट्टियाँ")
      : t("Site & employee setup", "साइट और कर्मचारी सेटअप");
  const Icon = kind ? meta[kind].icon : Blocks;
  return (
    <Desk label={title}>
      <DeskHeader
        crumb={
          initialTab === "shift"
            ? t(
                "Administration / Shifts & holidays",
                "प्रशासन / शिफ्ट और छुट्टियाँ",
              )
            : t("Administration / Site setup", "प्रशासन / साइट सेटअप")
        }
        title={title}
        subtitle={
          f
            ? `${s.siteName} · ${f.settings.timezone} · ${t("Week starts", "सप्ताह प्रारंभ")} ${weekdays[f.settings.weekStart] ?? "—"} · ${t("Config", "सेटिंग")} v${f.settings.version}`
            : s.siteName
        }
      >
        {can && (
          <Button
            variant="outline"
            size="sm"
            disabled={!f}
            onClick={() => setEdit("settings")}
          >
            <Settings2 className="size-4" />
            {t("Edit site settings", "साइट सेटिंग बदलें")}
          </Button>
        )}
        {org && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEdit("organization")}
          >
            <Globe className="size-4" />
            {t("Organization settings", "संगठन सेटिंग")}
          </Button>
        )}
        {can && kind && (
          <Button size="sm" disabled={!f} onClick={() => setEdit("new")}>
            <Plus className="size-4" />
            {meta[kind].add}
          </Button>
        )}
        <DeskRefresh
          label={t("Refresh setup", "सेटअप रीफ़्रेश करें")}
          fetching={q.isFetching}
          onClick={() => void q.refetch()}
        />
      </DeskHeader>
      {q.error ? (
        <ErrorState error={q.error} retry={() => void q.refetch()} />
      ) : (
        <>
          <DeskKpis
            label={t("Setup totals", "सेटअप कुल")}
            items={referenceKinds.map((k) => ({
              label: meta[k].label,
              value: f ? count(k) : "—",
              tone: !f ? "neutral" : count(k) ? "success" : "warning",
            }))}
            context={{
              icon: Settings2,
              title: f?.settings.contactEmail
                ? `${t("Site contact", "साइट संपर्क")}: ${f.settings.contactEmail}`
                : t(
                    "No site contact email yet",
                    "अभी कोई साइट संपर्क ईमेल नहीं",
                  ),
              text: f
                ? t(
                    `Config v${f.settings.version} · saves are versioned, so edits never overwrite each other.`,
                    `सेटिंग v${f.settings.version} · बदलाव संस्करण के साथ सहेजे जाते हैं, ताकि एक-दूसरे को न मिटाएँ।`,
                  )
                : undefined,
              pill: can
                ? {
                    tone: "success",
                    label: t("You can edit", "आप बदल सकते हैं"),
                  }
                : { tone: "neutral", label: t("View only", "केवल देखें") },
            }}
          />
          <DeskWorkspace>
            <DeskQueue
              label={t("Setup lists", "सेटअप सूचियाँ")}
              segments={[
                ...referenceKinds.map((k) => ({
                  id: k as SetupSegment,
                  label: meta[k].label,
                  count: f ? count(k) : undefined,
                })),
                ...(org
                  ? [
                      {
                        id: "modules" as SetupSegment,
                        label: t("Enabled modules", "सक्षम मॉड्यूल"),
                        count: s.modules.length,
                      },
                    ]
                  : []),
              ]}
              segment={tab}
              onSegment={(next) => {
                setTab(next);
                setSelectedId(null);
                setSearch("");
              }}
              search={search}
              onSearch={setSearch}
              searchPlaceholder={
                kind
                  ? t(
                      `Search ${meta[kind].label.toLowerCase()}`,
                      `${meta[kind].label} खोजें`,
                    )
                  : t("Search modules", "मॉड्यूल खोजें")
              }
            >
              {kind ? (
                <DeskTable
                  label={meta[kind].label}
                  columns={referenceColumns(kind)}
                  rows={rows}
                  getId={(r) => r.id}
                  selectedId={active?.id}
                  onSelect={setSelectedId}
                  loading={q.isPending}
                  empty={
                    <DeskEmpty
                      icon={Icon}
                      title={
                        needle
                          ? t("No matches", "कोई मेल नहीं")
                          : t(
                              `No ${meta[kind].label.toLowerCase()} yet`,
                              `अभी कोई ${meta[kind].label} नहीं`,
                            )
                      }
                      hint={
                        needle
                          ? t("Try a different name.", "दूसरा नाम आज़माएँ।")
                          : can
                            ? t(
                                `Use “${meta[kind].add}” to create the first one.`,
                                `पहला बनाने के लिए “${meta[kind].add}” चुनें।`,
                              )
                            : t(
                                "Nothing has been added for this site yet.",
                                "इस साइट के लिए अभी कुछ नहीं जोड़ा गया।",
                              )
                      }
                    />
                  }
                />
              ) : (
                <DeskTable
                  label={t("Modules", "मॉड्यूल")}
                  columns={moduleColumns}
                  rows={modules}
                  getId={(m) => m.id}
                  selectedId={activeModule?.id}
                  onSelect={setSelectedId}
                  empty={
                    <DeskEmpty
                      icon={Blocks}
                      title={t("No matches", "कोई मेल नहीं")}
                      hint={t("Try a different name.", "दूसरा नाम आज़माएँ।")}
                    />
                  }
                />
              )}
            </DeskQueue>
            {kind ? (
              <Inspector
                label={t("Setup item details", "सेटअप विवरण")}
                head={
                  active
                    ? {
                        title: active.name,
                        sub: `${meta[kind].one} · ${s.siteName}`,
                        pill: status(active),
                        avatar: false,
                      }
                    : undefined
                }
                actions={
                  active && (
                    <>
                      {active.kind === "shift" &&
                        active.active &&
                        canSchedule && (
                          <Button
                            variant="outline"
                            onClick={() => setAssign(active.id)}
                          >
                            <CalendarDays className="size-4" />
                            {t("Assign to employees", "कर्मचारियों को दें")}
                          </Button>
                        )}
                      {can ? (
                        <>
                          <span>
                            {t(
                              `Version ${active.version}`,
                              `संस्करण ${active.version}`,
                            )}
                          </span>
                          <Button
                            variant="outline"
                            className={active.active ? "rd-reject" : undefined}
                            disabled={busy === active.id}
                            onClick={() => void setActive(active)}
                          >
                            {busy === active.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : active.active ? (
                              <Archive className="size-4" />
                            ) : (
                              <ArchiveRestore className="size-4" />
                            )}
                            {active.active
                              ? t("Deactivate", "निष्क्रिय करें")
                              : t("Reactivate", "फिर सक्रिय करें")}
                          </Button>
                          <Button onClick={() => setEdit(active)}>
                            <PencilLine className="size-4" />
                            {t("Edit", "बदलें")}
                          </Button>
                        </>
                      ) : (
                        <span>
                          {t(
                            "View only. Site settings managers can change this.",
                            "केवल देखें। साइट सेटिंग प्रबंधक इसे बदल सकते हैं।",
                          )}
                        </span>
                      )}
                    </>
                  )
                }
                empty={
                  <DeskEmpty
                    className="rd-inspector-empty"
                    icon={Icon}
                    title={t("Nothing selected", "कुछ नहीं चुना")}
                    hint={t(
                      `Select a ${meta[kind].one.toLowerCase()} to see its details and actions.`,
                      `विवरण और कार्रवाई देखने के लिए ${meta[kind].one} चुनें।`,
                    )}
                  />
                }
              >
                {active && (
                  <>
                    <InspectorSection title={t("Details", "विवरण")}>
                      <Facts
                        items={[
                          {
                            label: t("Status", "स्थिति"),
                            value: active.active
                              ? t("Active", "सक्रिय")
                              : t("Inactive", "निष्क्रिय"),
                          },
                          ...(active.kind === "shift"
                            ? [
                                {
                                  label: t("Starts", "प्रारंभ"),
                                  value: active.startTime ?? "—",
                                },
                                {
                                  label: t("Ends", "समाप्ति"),
                                  value: active.endTime ?? "—",
                                },
                                {
                                  label: t("Length", "अवधि"),
                                  value:
                                    shiftLength(
                                      active.startTime,
                                      active.endTime,
                                    ) || "—",
                                },
                                {
                                  label: t("Overnight", "रात भर"),
                                  value:
                                    active.startTime &&
                                    active.endTime &&
                                    active.endTime <= active.startTime
                                      ? t("Yes, ends next day", "हाँ, अगले दिन")
                                      : t("No", "नहीं"),
                                },
                              ]
                            : []),
                          ...(active.kind === "holiday" && active.date
                            ? [
                                {
                                  label: t("Date", "तारीख"),
                                  value: formatDate(active.date),
                                },
                                {
                                  label: t("Day", "दिन"),
                                  value: weekdayName(active.date),
                                },
                                {
                                  label: t("When", "कब"),
                                  value: formatRelative(active.date),
                                },
                              ]
                            : []),
                        ]}
                      />
                    </InspectorSection>
                    <InspectorSection title={t("Record", "रिकॉर्ड")}>
                      <Facts
                        items={[
                          {
                            label: t("Version", "संस्करण"),
                            value: `v${active.version}`,
                          },
                          { label: t("Site", "साइट"), value: s.siteName },
                        ]}
                      />
                    </InspectorSection>
                  </>
                )}
              </Inspector>
            ) : (
              <Inspector
                label={t("Module details", "मॉड्यूल विवरण")}
                head={
                  activeModule
                    ? {
                        title: t(activeModule.name, activeModule.hindi),
                        sub: humanize(activeModule.group),
                        pill: moduleOn(activeModule) ? (
                          <Pill tone="success">{t("Enabled", "सक्षम")}</Pill>
                        ) : (
                          <Pill tone="warning">{t("Disabled", "बंद")}</Pill>
                        ),
                        avatar: false,
                      }
                    : undefined
                }
                actions={
                  activeModule && (
                    <>
                      <span>
                        {required(activeModule)
                          ? t(
                              "Required for every site",
                              "हर साइट के लिए आवश्यक",
                            )
                          : t(
                              "Applies to everyone at this site",
                              "इस साइट पर सभी पर लागू",
                            )}
                      </span>
                      <Button
                        variant={moduleOn(activeModule) ? "outline" : "default"}
                        className={
                          moduleOn(activeModule) ? "rd-reject" : undefined
                        }
                        disabled={
                          required(activeModule) || busy === activeModule.id
                        }
                        onClick={() =>
                          void setModule(activeModule, !moduleOn(activeModule))
                        }
                      >
                        {busy === activeModule.id && (
                          <Loader2 className="size-4 animate-spin" />
                        )}
                        {moduleOn(activeModule)
                          ? t("Disable module", "मॉड्यूल बंद करें")
                          : t("Enable module", "मॉड्यूल चालू करें")}
                      </Button>
                    </>
                  )
                }
                empty={
                  <DeskEmpty
                    className="rd-inspector-empty"
                    icon={Blocks}
                    title={t("Nothing selected", "कुछ नहीं चुना")}
                    hint={t(
                      "Select a module to see its release and switch it on or off.",
                      "रिलीज़ देखने और चालू/बंद करने के लिए मॉड्यूल चुनें।",
                    )}
                  />
                }
              >
                {activeModule && (
                  <InspectorSection title={t("Module", "मॉड्यूल")}>
                    <Facts
                      items={[
                        {
                          label: t("Group", "समूह"),
                          value: humanize(activeModule.group),
                        },
                        {
                          label: t("Release", "रिलीज़"),
                          value: activeModule.available
                            ? t("Available", "उपलब्ध")
                            : t(
                                `Unreleased · Phase ${activeModule.phase}`,
                                `अप्रकाशित · चरण ${activeModule.phase}`,
                              ),
                        },
                        {
                          label: t("Actions", "कार्रवाइयाँ"),
                          value: activeModule.actions.length
                            ? activeModule.actions.map(humanize).join(", ")
                            : "—",
                          span: true,
                        },
                        {
                          label: t("Depends on", "निर्भर"),
                          value: activeModule.dependencies.length
                            ? activeModule.dependencies
                                .map((id) => {
                                  const m = s.modules.find((x) => x.id === id);
                                  return m ? t(m.name, m.hindi) : id;
                                })
                                .join(", ")
                            : "—",
                          span: true,
                        },
                      ]}
                    />
                  </InspectorSection>
                )}
              </Inspector>
            )}
          </DeskWorkspace>
        </>
      )}
      {(edit === "new" || (typeof edit === "object" && edit !== null)) && (
        <FoundationForm
          title={
            edit === "new"
              ? (meta[tab as ReferenceKind]?.add ??
                t("Add setup record", "सेटअप रिकॉर्ड जोड़ें"))
              : `${t("Edit", "बदलें")} ${edit.name}`
          }
          operation="reference"
          base={{
            kind: tab,
            ...(edit === "new"
              ? {}
              : {
                  id: edit.id,
                  expectedVersion: edit.version,
                  active: edit.active,
                }),
          }}
          fields={[
            {
              name: "name",
              label: t("Name", "नाम"),
              value: edit === "new" ? "" : edit.name,
            },
            ...(tab === "shift"
              ? [
                  {
                    name: "startTime" as const,
                    label: t("Start time", "प्रारंभ समय"),
                    type: "time",
                    value: edit === "new" ? "" : edit.startTime,
                  },
                  {
                    name: "endTime" as const,
                    label: t("End time", "समाप्ति समय"),
                    type: "time",
                    value: edit === "new" ? "" : edit.endTime,
                  },
                ]
              : []),
            ...(tab === "holiday"
              ? [
                  {
                    name: "date" as const,
                    label: t("Date", "तारीख"),
                    type: "date",
                    value: edit === "new" ? "" : edit.date,
                  },
                ]
              : []),
          ]}
          onClose={() => setEdit(null)}
          onSaved={() => {
            toast.success(t("Site setup updated.", "साइट सेटअप अपडेट हुआ।"));
          }}
        />
      )}
      {assign && (
        <Modal
          title={t("Assign shift & duty time", "शिफ्ट और ड्यूटी समय")}
          onClose={() => setAssign(null)}
        >
          <DutySchedule shiftId={assign} close={() => setAssign(null)} />
        </Modal>
      )}
      {edit === "settings" && f && (
        <FoundationForm
          title={t("Site settings", "साइट सेटिंग")}
          operation="site_settings"
          base={{ expectedVersion: f.settings.version }}
          fields={[
            {
              name: "name",
              label: t("Site name", "साइट का नाम"),
              value: f.settings.name,
            },
            {
              name: "timezone",
              label: t("Timezone", "समय क्षेत्र"),
              value: f.settings.timezone,
            },
            {
              name: "contactEmail",
              label: t("Contact email", "संपर्क ईमेल"),
              type: "email",
              value: f.settings.contactEmail,
              required: false,
            },
            {
              // Sent as a number (0 = Sunday … 6 = Saturday).
              name: "weekStart",
              label: t("Week starts", "सप्ताह प्रारंभ"),
              type: "number",
              value: f.settings.weekStart,
              options: weekdays.map((day, i) => ({ id: String(i), name: day })),
            },
          ]}
          onClose={() => setEdit(null)}
          onSaved={s.reload}
        />
      )}
      {edit === "organization" && (
        <FoundationForm
          title={t("Organization settings", "संगठन सेटिंग")}
          operation="organization"
          fields={[
            { name: "name", label: t("Organization name", "संगठन का नाम") },
          ]}
          onClose={() => setEdit(null)}
          onSaved={s.reload}
        />
      )}
    </Desk>
  );
}
type SiteReport =
  OrganizationReportQuery["organizationReport"]["sites"][number];
export function ReportsPanel() {
  const t = useT();
  const q = useScopedQuery<OrganizationReportQuery>(
    ["organization-report"],
    OrganizationReportDocument,
  );
  const title = t("Organization overview", "संगठन अवलोकन");
  if (q.isPending) return <PageSkeleton title={title} />;
  if (q.error)
    return <ErrorState error={q.error} retry={() => void q.refetch()} />;
  const { sites, rule } = q.data.organizationReport;
  const total = sites.reduce((n, r) => n + r.employees, 0);
  const largest = sites.reduce<SiteReport | null>(
    (top, r) => (!top || r.employees > top.employees ? r : top),
    null,
  );
  const zones = [...new Set(sites.map((r) => r.timezone))];
  const columns: ColumnDef<SiteReport>[] = [
    {
      header: t("Site", "साइट"),
      accessorKey: "name",
      cell: ({ row: { original: r } }) => (
        <span className="flex items-center gap-2 font-medium">
          <Building2 className="text-muted-foreground size-4 shrink-0" />
          {r.name}
        </span>
      ),
    },
    {
      header: t("Timezone", "समय क्षेत्र"),
      accessorKey: "timezone",
      cell: ({ getValue }) => (
        <span className="text-muted-foreground">{String(getValue())}</span>
      ),
    },
    {
      header: t("Assigned employees", "नियुक्त कर्मचारी"),
      accessorKey: "employees",
      cell: ({ row: { original: r } }) => {
        const share = total ? Math.round((r.employees / total) * 100) : 0;
        return (
          <span className="flex min-w-[200px] items-center gap-3">
            <span className="w-8 text-right font-medium tabular-nums">
              {r.employees}
            </span>
            <span
              aria-hidden="true"
              className="bg-muted h-1.5 w-28 overflow-hidden rounded-full"
            >
              <span
                className="bg-primary block h-full rounded-full"
                style={{ width: `${share}%` }}
              />
            </span>
            <span className="text-muted-foreground text-xs tabular-nums">
              {share}%
            </span>
          </span>
        );
      },
    },
  ];
  return (
    <section className="grid gap-5">
      <Heading
        eyebrow={t("All sites · read only", "सभी साइटें · केवल पढ़ें")}
        title={title}
        description={t(
          "Headcount of active site assignments across the organization. People assigned to two sites appear in both site counts.",
          "संगठन में सक्रिय साइट नियुक्तियाँ। दो साइटों पर नियुक्त लोग दोनों में गिने जाते हैं।",
        )}
      />
      <StatGrid className="xl:grid-cols-3">
        <StatCard
          label={t("Sites", "साइटें")}
          value={sites.length}
          hint={
            zones.length === 1
              ? zones[0]
              : `${zones.length} ${t("timezones", "समय क्षेत्र")}`
          }
          icon={Building2}
          tone="primary"
        />
        <StatCard
          label={t("Active site assignments", "सक्रिय साइट नियुक्तियाँ")}
          value={total}
          hint={t(
            "People at two sites count at both",
            "दो साइटों वाले लोग दोनों में गिने जाते हैं",
          )}
          icon={Users}
          tone="info"
        />
        <StatCard
          label={t("Largest site", "सबसे बड़ी साइट")}
          value={largest?.employees ?? 0}
          hint={largest?.name ?? "—"}
          icon={Activity}
        />
      </StatGrid>
      <DataTable
        data={sites}
        columns={columns}
        getRowId={(r) => r.id}
        label={t("Sites", "साइटें")}
        search={t("Search sites…", "साइट खोजें…")}
        filters={
          zones.length > 1
            ? [
                {
                  column: "timezone",
                  title: t("Timezone", "समय क्षेत्र"),
                  options: zones.map((z) => ({ value: z, label: z })),
                },
              ]
            : []
        }
      />
      <p className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs">
        <ShieldCheck className="size-3.5" />
        {t(
          "Explicit organization reporting authorization",
          "स्पष्ट संगठन रिपोर्ट अनुमति",
        )}{" "}
        · <span className="font-mono">{rule}</span>
      </p>
    </section>
  );
}
type AuditEntry = AuditHistoryQuery["auditHistory"][number];
const sameFilters = (a: ColumnFiltersState, b: ColumnFiltersState) =>
  JSON.stringify(a) === JSON.stringify(b);
/** "analytics.read" → "Analytics · read"; "profile_updated" / "rosterRange" →
 * "Profile updated" / "Roster range". */
function actionLabel(path: string) {
  const words = path
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/[._]/g, (c) => (c === "." ? " · " : " "));
  return words.charAt(0).toUpperCase() + words.slice(1);
}
export function AuditPanel() {
  const s = useScope(),
    t = useT();
  const q = useScopedQuery<AuditHistoryQuery>(["audit"], AuditHistoryDocument);
  const [filters, setFilters] = useState<ColumnFiltersState>([]);
  const title = t("Audit history", "ऑडिट इतिहास");
  if (q.isPending) return <PageSkeleton title={title} />;
  if (q.error)
    return <ErrorState error={q.error} retry={() => void q.refetch()} />;
  const entries = q.data.auditHistory;
  const now = Date.now(),
    midnight = new Date(now).setHours(0, 0, 0, 0);
  const period = (a: AuditEntry) => {
    const at = Date.parse(a.createdAt);
    return at >= midnight
      ? "today"
      : at >= now - 7 * 86_400_000
        ? "7d"
        : "older";
  };
  const area = (a: AuditEntry) => a.action.split(".")[0];
  const who = (id: string) =>
    id === s.actorId ? t("You", "आप") : `…${id.slice(-8)}`;
  const areas = [...new Set(entries.map(area))].sort();
  const actors = [...new Set(entries.map((a) => a.actorId))];
  const presets = {
    today: [{ id: "period", value: ["today"] }],
    week: [{ id: "period", value: ["today", "7d"] }],
  };
  const preset = (next: ColumnFiltersState) =>
    setFilters((current) => (sameFilters(current, next) ? [] : next));
  const columns: ColumnDef<AuditEntry>[] = [
    {
      header: t("Action", "कार्रवाई"),
      accessorKey: "action",
      cell: ({ row: { original: a } }) => (
        <span className="grid min-w-[200px]">
          <span className="font-medium">
            {actionLabel(a.action.split(".").slice(1).join(".") || a.action)}
          </span>
          <span className="text-muted-foreground font-mono text-xs">
            {a.action}
          </span>
        </span>
      ),
    },
    {
      header: t("Area", "क्षेत्र"),
      id: "area",
      accessorFn: area,
      cell: ({ getValue }) => (
        <UiBadge variant="secondary">{actionLabel(String(getValue()))}</UiBadge>
      ),
    },
    {
      header: t("Reason", "कारण"),
      accessorKey: "reason",
      cell: ({ getValue }) =>
        getValue() ? (
          <span className="line-clamp-2 max-w-[320px] min-w-[160px] whitespace-normal">
            {String(getValue())}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      header: t("Actor", "कर्ता"),
      id: "actor",
      accessorFn: (a) => who(a.actorId),
      cell: ({ row: { original: a } }) => (
        <span
          title={a.actorId}
          className={cn(
            "text-xs whitespace-nowrap",
            a.actorId !== s.actorId && "text-muted-foreground font-mono",
          )}
        >
          {who(a.actorId)}
        </span>
      ),
    },
    {
      header: t("Record", "रिकॉर्ड"),
      id: "record",
      accessorFn: (a) => a.entityId.slice(-8),
      cell: ({ row: { original: a } }) => (
        <span
          title={a.entityId}
          className="text-muted-foreground font-mono text-xs"
        >
          …{a.entityId.slice(-8)}
        </span>
      ),
    },
    {
      header: t("When", "कब"),
      accessorKey: "createdAt",
      cell: ({ row: { original: a } }) => (
        <span className="flex flex-col whitespace-nowrap">
          <span>{formatDateTime(a.createdAt)}</span>
          <span className="text-muted-foreground text-xs">
            {formatRelative(a.createdAt, now)}
          </span>
        </span>
      ),
    },
    { header: t("Period", "अवधि"), id: "period", accessorFn: period },
  ];
  return (
    <section className="grid gap-5">
      <Heading
        title={title}
        description={t(
          `The latest 100 actions recorded at ${s.siteName}. Sensitive values are excluded from the audit log.`,
          `${s.siteName} की नवीनतम 100 कार्रवाइयाँ। संवेदनशील विवरण ऑडिट में शामिल नहीं हैं।`,
        )}
      />
      {entries.length === 0 ? (
        <Empty
          icon={ScrollText}
          title={t("No recorded actions yet", "अभी कोई कार्रवाई दर्ज नहीं")}
        />
      ) : (
        <>
          <StatGrid>
            <StatCard
              label={t("Actions", "कार्रवाइयाँ")}
              value={entries.length}
              hint={t("Latest recorded at this site", "इस साइट पर नवीनतम")}
              icon={ScrollText}
              tone="primary"
            />
            <StatCard
              label={t("Today", "आज")}
              value={entries.filter((a) => period(a) === "today").length}
              hint={t("Since midnight", "आधी रात से")}
              icon={CalendarDays}
              tone="info"
              active={sameFilters(filters, presets.today)}
              onClick={() => preset(presets.today)}
            />
            <StatCard
              label={t("Last 7 days", "पिछले 7 दिन")}
              value={entries.filter((a) => period(a) !== "older").length}
              hint={t("Including today", "आज सहित")}
              icon={CalendarClock}
              active={sameFilters(filters, presets.week)}
              onClick={() => preset(presets.week)}
            />
            <StatCard
              label={t("People", "लोग")}
              value={actors.length}
              hint={t("Distinct actors in this list", "इस सूची में अलग कर्ता")}
              icon={Users}
            />
          </StatGrid>
          <DataTable
            data={entries}
            columns={columns}
            getRowId={(a) => a.id}
            label={t("Audit entries", "ऑडिट प्रविष्टियाँ")}
            search={t(
              "Search actions, reasons or IDs…",
              "कार्रवाई, कारण या आईडी खोजें…",
            )}
            hidden={["period"]}
            columnFilters={filters}
            onColumnFiltersChange={setFilters}
            filters={[
              {
                column: "area",
                title: t("Area", "क्षेत्र"),
                options: areas.map((v) => ({
                  value: v,
                  label: actionLabel(v),
                })),
              },
              {
                column: "period",
                title: t("When", "कब"),
                options: [
                  { value: "today", label: t("Today", "आज") },
                  { value: "7d", label: t("Past week", "पिछला सप्ताह") },
                  { value: "older", label: t("Older", "पुराने") },
                ],
              },
              ...(actors.length > 1
                ? [
                    {
                      column: "actor",
                      title: t("Actor", "कर्ता"),
                      options: actors.map((id) => ({
                        value: who(id),
                        label: who(id),
                      })),
                    },
                  ]
                : []),
            ]}
          />
        </>
      )}
    </section>
  );
}
function AssignmentDialog({
  employee,
  onClose,
  onSaved,
}: {
  employee: EmployeeFieldsFragment;
  onClose: () => void;
  onSaved: () => void;
}) {
  const s = useScope(),
    t = useT(),
    write = useWrite(),
    id = useId();
  const [target, setTarget] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("Add site assignment", "साइट नियुक्ति जोड़ें")}
          </DialogTitle>
          <DialogDescription>
            {employee.displayName} ·{" "}
            {t(
              "Existing assignments remain in their original sites.",
              "मौजूदा नियुक्तियाँ अपनी मूल साइट पर रहती हैं।",
            )}
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await write(SaveFoundationDocument, {
                siteId: target,
                operation: "assign_site",
                input: {
                  employeeId: employee.id,
                  expectedVersion: employee.version,
                  sourceSiteId: s.siteId,
                  startsOn: new FormData(e.currentTarget).get("startsOn"),
                },
              });
              onSaved();
              onClose();
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field
            label={t("Destination site", "नई साइट")}
            htmlFor={`${id}-site`}
          >
            <NativeSelect
              id={`${id}-site`}
              required
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            >
              <option value="">
                {t("Choose an authorized site", "अधिकृत साइट चुनें")}
              </option>
              {s.sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field
            label={t("Assignment starts", "नियुक्ति प्रारंभ")}
            htmlFor={`${id}-starts`}
          >
            <Input id={`${id}-starts`} required name="startsOn" type="date" />
          </Field>
          {error && (
            <Alert variant="destructive">
              <TriangleAlert />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={onClose}
            >
              {t("Cancel", "रद्द करें")}
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {t("Add assignment", "नियुक्ति जोड़ें")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
