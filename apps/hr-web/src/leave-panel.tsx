import { useState } from "react";
import type { ColumnDef, ColumnFiltersState } from "@tanstack/react-table";
import { toast } from "sonner";
import {
  CalendarCheck2,
  CalendarPlus,
  CalendarX2,
  Ellipsis,
  Hourglass,
  Loader2,
  Settings2,
  TreePalm,
  TriangleAlert,
  UserCheck,
} from "lucide-react";
import {
  EmployeesDocument,
  OperateDocument,
  OperationsDocument,
} from "../../../packages/contracts/src/generated";
import { useScope, useScopedQuery, useWrite } from "./workspace-context";
import {
  Badge as StatusBadge,
  Empty,
  ErrorState,
  Heading,
  PageSkeleton,
  useT,
} from "./ui";
import { DataTable } from "./components/shared/data-table";
import { Field, StatCard, StatGrid } from "./components/shared/page";
import { formatDate, formatRelative } from "./components/shared/formatting";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type LeaveType = {
  id: string;
  code: string;
  label: string;
  half_days: boolean;
  include_weekends: boolean;
  include_holidays: boolean;
  approver_id: string;
  active: boolean;
};
type LeaveRequest = {
  id: string;
  created_at: string;
  employee_id: string;
  user_id: string;
  type_id: string;
  starts_on: string;
  ends_on: string;
  half: "full" | "am" | "pm";
  units: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  approver_id: string;
  decision_note: string | null;
  version: number;
};
type Ledger = {
  id: string;
  created_at: string;
  employee_id: string;
  type_id: string;
  request_id: string | null;
  units: string;
  reason: string;
  effective_on: string;
};
type Snapshot = {
  me: string | null;
  approvers: { id: string; name: string }[];
  leaveTypes: LeaveType[];
  leaveRequests: LeaveRequest[];
  balances: { employee_id: string; type_id: string; balance: string }[];
  ledger: Ledger[];
};
type Person = { id: string; displayName: string };
type Form = "apply" | "type" | "credit" | null;

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
const days = (units: string | number) => {
  const n = Number(units);
  return `${n % 1 ? n.toFixed(1) : n} ${Math.abs(n) === 1 ? "day" : "days"}`;
};
const sameFilters = (a: ColumnFiltersState, b: ColumnFiltersState) =>
  JSON.stringify(a) === JSON.stringify(b);

function PersonCell({ name }: { name: string }) {
  return (
    <span className="flex items-center gap-2">
      <Avatar className="size-7">
        <AvatarFallback className="bg-primary/10 text-primary text-[11px]">
          {initials(name)}
        </AvatarFallback>
      </Avatar>
      <span className="truncate">{name}</span>
    </span>
  );
}

export function LeavePanel() {
  const s = useScope(),
    t = useT(),
    can = (cap: string) => s.capabilities.includes(cap);
  const q = useScopedQuery<{ operations: Snapshot }>(
    ["operations"],
    OperationsDocument,
    {},
    true,
    15000,
  );
  const people = useScopedQuery<{ employees: { nodes: Person[] } }>(
    ["operation-people"],
    EmployeesDocument,
    { first: 50 },
    can("employees.view"),
  );
  const [tab, setTab] = useState("requests");
  const [filters, setFilters] = useState<ColumnFiltersState>([]);
  const [review, setReview] = useState<LeaveRequest | null>(null);
  const [form, setForm] = useState<Form>(null);
  if (q.isPending) return <PageSkeleton title={t("Leave", "छुट्टी")} />;
  if (q.error)
    return <ErrorState error={q.error} retry={() => void q.refetch()} />;
  const data = q.data!.operations;
  const nodes = people.data?.employees.nodes ?? [];
  const byEmployee = new Map(nodes.map((e) => [e.id, e.displayName]));
  const name = (id: string) =>
    byEmployee.get(id) ??
    (id === data.me ? t("You", "आप") : t("Team member", "टीम सदस्य"));
  const approverName = (id: string) =>
    data.approvers.find((a) => a.id === id)?.name ??
    (id === s.actorId
      ? t("You", "आप")
      : t("Configured approver", "निर्धारित अनुमोदक"));
  const typeLabel = (id: string) =>
    data.leaveTypes.find((x) => x.id === id)?.label ?? t("Leave", "छुट्टी");
  const decides = (r: LeaveRequest) =>
    r.status === "pending" &&
    can("leave.approve") &&
    r.approver_id === s.actorId &&
    r.user_id !== s.actorId;
  const halfLabel = {
    full: t("Full day", "पूरा दिन"),
    am: t("First half", "पहला आधा"),
    pm: t("Second half", "दूसरा आधा"),
  };
  const statusLabel = {
    pending: t("Pending", "लंबित"),
    approved: t("Approved", "स्वीकृत"),
    rejected: t("Rejected", "अस्वीकृत"),
  };
  const canApply = can("my_leave.submit") && !!data.me;
  const canConfigure = can("site_settings.manage");
  const canCredit = canConfigure && can("leave.approve");
  const requests = data.leaveRequests;
  const counts = {
    pending: requests.filter((r) => r.status === "pending").length,
    mine: requests.filter(decides).length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  };
  const presets = {
    pending: [{ id: "status", value: ["pending"] }],
    mine: [{ id: "queue", value: ["awaiting_me"] }],
    approved: [{ id: "status", value: ["approved"] }],
    rejected: [{ id: "status", value: ["rejected"] }],
  };
  const preset = (next: ColumnFiltersState) => {
    setTab("requests");
    setFilters((current) => (sameFilters(current, next) ? [] : next));
  };
  const columns: ColumnDef<LeaveRequest>[] = [
    {
      header: t("Employee", "कर्मचारी"),
      id: "employee",
      accessorFn: (r) => name(r.employee_id),
      cell: ({ getValue }) => <PersonCell name={String(getValue())} />,
    },
    {
      header: t("Type", "प्रकार"),
      id: "type",
      accessorFn: (r) => typeLabel(r.type_id),
    },
    {
      header: t("Dates", "तिथियाँ"),
      id: "starts_on",
      accessorKey: "starts_on",
      cell: ({ row: { original: r } }) => (
        <span className="flex flex-col">
          <span>
            {r.starts_on === r.ends_on
              ? formatDate(r.starts_on)
              : `${formatDate(r.starts_on)} – ${formatDate(r.ends_on)}`}
          </span>
          <span className="text-muted-foreground text-xs">
            {days(r.units)}
            {r.half !== "full" && ` · ${halfLabel[r.half]}`}
          </span>
        </span>
      ),
    },
    {
      header: t("Reason", "कारण"),
      id: "reason",
      accessorKey: "reason",
      cell: ({ getValue }) => (
        <span className="text-muted-foreground block max-w-[280px] truncate">
          {String(getValue())}
        </span>
      ),
    },
    {
      header: t("Status", "स्थिति"),
      id: "status",
      accessorKey: "status",
      cell: ({ row: { original: r } }) => (
        <span className="flex flex-col items-start gap-1">
          <StatusBadge>{r.status}</StatusBadge>
          {r.decision_note && (
            <span className="text-muted-foreground max-w-[220px] truncate text-xs">
              {r.decision_note}
            </span>
          )}
        </span>
      ),
    },
    {
      header: t("Requested", "अनुरोध"),
      id: "created_at",
      accessorKey: "created_at",
      cell: ({ getValue }) => (
        <span className="text-muted-foreground">
          {formatRelative(String(getValue()))}
        </span>
      ),
    },
    {
      header: t("Queue", "कतार"),
      id: "queue",
      accessorFn: (r) => (decides(r) ? "awaiting_me" : "other"),
    },
    {
      header: "",
      id: "actions",
      enableHiding: false,
      cell: ({ row: { original: r } }) => (
        <div className="flex items-center justify-end gap-1">
          {decides(r) && (
            <Button size="sm" onClick={() => setReview(r)}>
              {t("Review", "समीक्षा")}
            </Button>
          )}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`${t("Actions for", "कार्रवाई")} ${name(r.employee_id)}`}
              >
                <Ellipsis className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onSelect={() => setReview(r)}>
                {decides(r)
                  ? t("Review request", "अनुरोध की समीक्षा")
                  : t("View details", "विवरण देखें")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];
  const balanceRows = data.balances.map((b) => ({
    id: `${b.employee_id}:${b.type_id}`,
    ...b,
  }));
  const balanceColumns: ColumnDef<(typeof balanceRows)[number]>[] = [
    {
      header: t("Employee", "कर्मचारी"),
      id: "employee",
      accessorFn: (b) => name(b.employee_id),
      cell: ({ getValue }) => <PersonCell name={String(getValue())} />,
    },
    {
      header: t("Leave type", "छुट्टी प्रकार"),
      id: "type",
      accessorFn: (b) => typeLabel(b.type_id),
    },
    {
      header: t("Balance", "शेष"),
      id: "balance",
      accessorFn: (b) => Number(b.balance),
      cell: ({ getValue }) => (
        <span
          className={cn(
            "font-medium tabular-nums",
            Number(getValue()) <= 0 && "text-destructive",
          )}
        >
          {days(Number(getValue()))}
        </span>
      ),
    },
  ];
  const ledgerColumns: ColumnDef<Ledger>[] = [
    {
      header: t("Effective", "प्रभावी"),
      id: "effective_on",
      accessorKey: "effective_on",
      cell: ({ getValue }) => formatDate(String(getValue())),
    },
    {
      header: t("Employee", "कर्मचारी"),
      id: "employee",
      accessorFn: (l) => name(l.employee_id),
      cell: ({ getValue }) => <PersonCell name={String(getValue())} />,
    },
    {
      header: t("Leave type", "छुट्टी प्रकार"),
      id: "type",
      accessorFn: (l) => typeLabel(l.type_id),
    },
    {
      header: t("Change", "बदलाव"),
      id: "direction",
      accessorFn: (l) => (Number(l.units) > 0 ? "credit" : "debit"),
      cell: ({ row: { original: l } }) => (
        <span
          className={cn(
            "font-medium tabular-nums",
            Number(l.units) > 0 ? "text-success" : "text-destructive",
          )}
        >
          {Number(l.units) > 0 ? "+" : "−"}
          {days(Math.abs(Number(l.units)))}
        </span>
      ),
    },
    {
      header: t("Reason", "कारण"),
      id: "reason",
      accessorKey: "reason",
      cell: ({ getValue }) => (
        <span className="text-muted-foreground block max-w-[320px] truncate">
          {String(getValue())}
        </span>
      ),
    },
    {
      header: t("Recorded", "दर्ज"),
      id: "created_at",
      accessorKey: "created_at",
      cell: ({ getValue }) => (
        <span className="text-muted-foreground">
          {formatRelative(String(getValue()))}
        </span>
      ),
    },
  ];
  const typeColumns: ColumnDef<LeaveType>[] = [
    {
      header: t("Code", "कोड"),
      id: "code",
      accessorKey: "code",
      cell: ({ getValue }) => (
        <code className="bg-muted rounded px-1.5 py-0.5 text-xs">
          {String(getValue())}
        </code>
      ),
    },
    { header: t("Name", "नाम"), id: "label", accessorKey: "label" },
    {
      header: t("Counting rules", "गिनती नियम"),
      id: "rules",
      accessorFn: (x) =>
        [
          x.half_days && t("Half days", "आधे दिन"),
          x.include_weekends && t("Weekends counted", "सप्ताहांत गिने"),
          x.include_holidays && t("Holidays counted", "छुट्टियाँ गिनी"),
        ]
          .filter(Boolean)
          .join(" · ") || t("Working days only", "केवल कार्य दिवस"),
    },
    {
      header: t("Approver", "अनुमोदक"),
      id: "approver",
      accessorFn: (x) => approverName(x.approver_id),
    },
    {
      header: t("Status", "स्थिति"),
      id: "active",
      accessorFn: (x) => (x.active ? "active" : "inactive"),
      cell: ({ getValue }) => <StatusBadge>{String(getValue())}</StatusBadge>,
    },
  ];
  const statusOptions = (["pending", "approved", "rejected"] as const).map(
    (v) => ({ value: v, label: statusLabel[v] }),
  );
  const typeOptions = data.leaveTypes.map((x) => ({
    value: x.label,
    label: x.label,
  }));
  const employeeOptions = [
    ...new Set(requests.map((r) => name(r.employee_id))),
  ].map((v) => ({ value: v, label: v }));
  const configure = (canConfigure || canCredit) && (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Settings2 className="size-4" />
          {t("Configure", "सेटअप")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {canConfigure && (
          <DropdownMenuItem onSelect={() => setForm("type")}>
            {t("Add leave type", "छुट्टी प्रकार जोड़ें")}
          </DropdownMenuItem>
        )}
        {canCredit && (
          <DropdownMenuItem
            disabled={!data.leaveTypes.length}
            onSelect={() => setForm("credit")}
          >
            {t("Post leave credit", "छुट्टी क्रेडिट दर्ज करें")}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
  return (
    <section className="grid gap-5">
      <Heading
        title={t("Leave", "छुट्टी")}
        description={`${s.siteName} · ${t("Requests, approvals and balances, with every credit and deduction on the ledger.", "अनुरोध, अनुमोदन और शेष; हर क्रेडिट और कटौती लेजर में।")}`}
      >
        {configure}
        {canApply && (
          <Button
            disabled={!data.leaveTypes.length}
            onClick={() => setForm("apply")}
          >
            <CalendarPlus className="size-4" />
            {t("Apply for leave", "छुट्टी के लिए आवेदन")}
          </Button>
        )}
      </Heading>
      {!data.leaveTypes.length && (
        <Alert variant="warning">
          <TriangleAlert />
          <AlertTitle>
            {t("No leave types configured", "कोई छुट्टी प्रकार निर्धारित नहीं")}
          </AlertTitle>
          <AlertDescription>
            {t(
              "An administrator must add the company's leave types and post opening credits before anyone can apply. No company rules are assumed.",
              "आवेदन से पहले व्यवस्थापक को छुट्टी प्रकार और प्रारंभिक क्रेडिट जोड़ने होंगे। कंपनी नियम अनुमानित नहीं हैं।",
            )}
            {canConfigure && (
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => setForm("type")}
              >
                {t("Add leave type", "छुट्टी प्रकार जोड़ें")}
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}
      <StatGrid>
        <StatCard
          label={t("Pending", "लंबित")}
          value={counts.pending}
          hint={t("Waiting for a decision", "निर्णय की प्रतीक्षा")}
          icon={Hourglass}
          tone={counts.pending ? "warning" : "default"}
          active={sameFilters(filters, presets.pending)}
          onClick={() => preset(presets.pending)}
        />
        <StatCard
          label={t("Awaiting you", "आपके निर्णय हेतु")}
          value={counts.mine}
          hint={t(
            "You are the configured approver",
            "आप निर्धारित अनुमोदक हैं",
          )}
          icon={UserCheck}
          tone={counts.mine ? "info" : "default"}
          active={sameFilters(filters, presets.mine)}
          onClick={() => preset(presets.mine)}
        />
        <StatCard
          label={t("Approved", "स्वीकृत")}
          value={counts.approved}
          hint={t("Deducted from balances", "शेष से घटाया गया")}
          icon={CalendarCheck2}
          tone="success"
          active={sameFilters(filters, presets.approved)}
          onClick={() => preset(presets.approved)}
        />
        <StatCard
          label={t("Rejected", "अस्वीकृत")}
          value={counts.rejected}
          hint={t("With a recorded note", "दर्ज टिप्पणी के साथ")}
          icon={CalendarX2}
          tone={counts.rejected ? "danger" : "default"}
          active={sameFilters(filters, presets.rejected)}
          onClick={() => preset(presets.rejected)}
        />
      </StatGrid>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="requests">
            {t("Requests", "अनुरोध")}
            <span className="text-muted-foreground text-xs">
              {requests.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="balances">{t("Balances", "शेष")}</TabsTrigger>
          <TabsTrigger value="ledger">{t("Ledger", "लेजर")}</TabsTrigger>
          <TabsTrigger value="types">
            {t("Leave types", "छुट्टी प्रकार")}
            <span className="text-muted-foreground text-xs">
              {data.leaveTypes.length}
            </span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="requests" className="mt-3">
          {requests.length ? (
            <DataTable
              data={requests}
              columns={columns}
              getRowId={(r) => r.id}
              label={t("Leave requests", "छुट्टी अनुरोध")}
              search={t(
                "Search people, types or reasons…",
                "व्यक्ति, प्रकार या कारण खोजें…",
              )}
              hidden={["queue"]}
              columnFilters={filters}
              onColumnFiltersChange={setFilters}
              onRowClick={setReview}
              filters={[
                {
                  column: "status",
                  title: t("Status", "स्थिति"),
                  options: statusOptions,
                },
                ...(typeOptions.length > 1
                  ? [
                      {
                        column: "type",
                        title: t("Type", "प्रकार"),
                        options: typeOptions,
                      },
                    ]
                  : []),
                ...(employeeOptions.length > 1
                  ? [
                      {
                        column: "employee",
                        title: t("Employee", "कर्मचारी"),
                        options: employeeOptions,
                      },
                    ]
                  : []),
              ]}
            />
          ) : (
            <Empty
              icon={TreePalm}
              title={t("No leave requests yet", "अभी कोई छुट्टी अनुरोध नहीं")}
              action={
                canApply &&
                !!data.leaveTypes.length && (
                  <Button onClick={() => setForm("apply")}>
                    <CalendarPlus className="size-4" />
                    {t("Apply for leave", "छुट्टी के लिए आवेदन")}
                  </Button>
                )
              }
            >
              {t(
                "Requests appear here with their dates, days and decision. Approvals deduct the configured balance.",
                "अनुरोध तिथियों, दिनों और निर्णय के साथ यहाँ दिखते हैं। अनुमोदन शेष से घटता है।",
              )}
            </Empty>
          )}
        </TabsContent>
        <TabsContent value="balances" className="mt-3">
          <DataTable
            data={balanceRows}
            columns={balanceColumns}
            getRowId={(b) => b.id}
            label={t("Leave balances", "छुट्टी शेष")}
            empty={t(
              "No balances yet. Post opening credits to start the ledger.",
              "अभी कोई शेष नहीं। लेजर शुरू करने के लिए प्रारंभिक क्रेडिट दर्ज करें।",
            )}
            filters={
              typeOptions.length > 1
                ? [
                    {
                      column: "type",
                      title: t("Type", "प्रकार"),
                      options: typeOptions,
                    },
                  ]
                : []
            }
          />
        </TabsContent>
        <TabsContent value="ledger" className="mt-3">
          <DataTable
            data={data.ledger}
            columns={ledgerColumns}
            getRowId={(l) => l.id}
            label={t("Leave ledger", "छुट्टी लेजर")}
            empty={t(
              "Credits and approved deductions are recorded here.",
              "क्रेडिट और स्वीकृत कटौतियाँ यहाँ दर्ज होती हैं।",
            )}
            filters={[
              {
                column: "direction",
                title: t("Change", "बदलाव"),
                options: [
                  { value: "credit", label: t("Credits", "क्रेडिट") },
                  { value: "debit", label: t("Deductions", "कटौती") },
                ],
              },
              ...(typeOptions.length > 1
                ? [
                    {
                      column: "type",
                      title: t("Type", "प्रकार"),
                      options: typeOptions,
                    },
                  ]
                : []),
            ]}
          />
        </TabsContent>
        <TabsContent value="types" className="mt-3">
          <DataTable
            data={data.leaveTypes}
            columns={typeColumns}
            getRowId={(x) => x.id}
            label={t("Leave types", "छुट्टी प्रकार")}
            search={false}
            actions={
              canConfigure && (
                <Button size="sm" onClick={() => setForm("type")}>
                  <CalendarPlus className="size-4" />
                  {t("Add leave type", "छुट्टी प्रकार जोड़ें")}
                </Button>
              )
            }
            empty={t(
              "No leave types yet. Add each type the company offers.",
              "अभी कोई छुट्टी प्रकार नहीं। कंपनी के हर प्रकार को जोड़ें।",
            )}
          />
        </TabsContent>
      </Tabs>
      <ReviewDialog
        key={review?.id}
        request={review}
        decides={review ? decides(review) : false}
        onClose={() => setReview(null)}
        name={name}
        typeLabel={typeLabel}
        approverName={approverName}
        halfLabel={halfLabel}
        balance={
          review
            ? data.balances.find(
                (b) =>
                  b.employee_id === review.employee_id &&
                  b.type_id === review.type_id,
              )?.balance
            : undefined
        }
      />
      <LeaveForm
        form={form}
        close={() => setForm(null)}
        data={data}
        people={nodes}
        halfLabel={halfLabel}
      />
    </section>
  );
}

function useCommand() {
  const write = useWrite();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function run(operation: string, input: Record<string, unknown>) {
    setSaving(true);
    setError("");
    try {
      await write(OperateDocument, { operation, input });
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setSaving(false);
    }
  }
  return { run, saving, error, setError };
}

function ErrorAlert({ error }: { error: string }) {
  return error ? (
    <Alert variant="destructive">
      <TriangleAlert />
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  ) : null;
}

function ReviewDialog({
  request: r,
  decides,
  onClose,
  name,
  typeLabel,
  approverName,
  halfLabel,
  balance,
}: {
  request: LeaveRequest | null;
  decides: boolean;
  onClose: () => void;
  name: (id: string) => string;
  typeLabel: (id: string) => string;
  approverName: (id: string) => string;
  halfLabel: Record<LeaveRequest["half"], string>;
  balance?: string;
}) {
  const t = useT();
  const { run, saving, error } = useCommand();
  const [note, setNote] = useState("");
  if (!r) return null;
  async function decide(approve: boolean) {
    if (
      await run("reviewLeave", {
        id: r!.id,
        expectedVersion: r!.version,
        approve,
        reason: note.trim(),
      })
    ) {
      toast.success(
        approve
          ? t("Leave approved", "छुट्टी स्वीकृत")
          : t("Leave rejected", "छुट्टी अस्वीकृत"),
      );
      onClose();
    }
  }
  const rows: [string, React.ReactNode][] = [
    [t("Employee", "कर्मचारी"), name(r.employee_id)],
    [t("Leave type", "छुट्टी प्रकार"), typeLabel(r.type_id)],
    [
      t("Dates", "तिथियाँ"),
      r.starts_on === r.ends_on
        ? formatDate(r.starts_on)
        : `${formatDate(r.starts_on)} – ${formatDate(r.ends_on)}`,
    ],
    [
      t("Days", "दिन"),
      `${days(r.units)}${r.half !== "full" ? ` · ${halfLabel[r.half]}` : ""}`,
    ],
    [t("Current balance", "वर्तमान शेष"), balance ? days(balance) : "—"],
    [t("Approver", "अनुमोदक"), approverName(r.approver_id)],
  ];
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {decides
              ? t("Review leave request", "छुट्टी अनुरोध की समीक्षा")
              : t("Leave request", "छुट्टी अनुरोध")}
            <StatusBadge>{r.status}</StatusBadge>
          </DialogTitle>
          <DialogDescription>
            {t("Requested", "अनुरोध")} {formatRelative(r.created_at)}
          </DialogDescription>
        </DialogHeader>
        <dl className="bg-muted/40 grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border p-4 text-sm [&_dd]:m-0 [&_dt]:m-0">
          {rows.map(([label, value]) => (
            <div key={label} className="grid gap-0.5">
              <dt className="text-muted-foreground text-xs">{label}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="grid gap-1">
          <p className="text-muted-foreground text-xs">
            {t("Employee's reason", "कर्मचारी का कारण")}
          </p>
          <p className="text-sm whitespace-pre-wrap">{r.reason}</p>
        </div>
        {r.decision_note && (
          <div className="grid gap-1">
            <p className="text-muted-foreground text-xs">
              {t("Decision note", "निर्णय टिप्पणी")}
            </p>
            <p className="text-sm whitespace-pre-wrap">{r.decision_note}</p>
          </div>
        )}
        {decides && (
          <Field
            label={t("Review note", "समीक्षा टिप्पणी")}
            htmlFor="leave-note"
            hint={t(
              "At least 8 characters. Recorded with the decision.",
              "कम से कम 8 अक्षर। निर्णय के साथ दर्ज।",
            )}
          >
            <Textarea
              id="leave-note"
              value={note}
              minLength={8}
              maxLength={1000}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
        )}
        <ErrorAlert error={error} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("Close", "बंद करें")}
          </Button>
          {decides && (
            <>
              <Button
                variant="destructive"
                disabled={saving || note.trim().length < 8}
                onClick={() => void decide(false)}
              >
                {t("Reject", "अस्वीकार")}
              </Button>
              <Button
                disabled={saving || note.trim().length < 8}
                onClick={() => void decide(true)}
              >
                {saving && <Loader2 className="size-4 animate-spin" />}
                {t("Approve and deduct", "स्वीकृत करें और घटाएँ")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LeaveForm({
  form,
  close,
  data,
  people,
  halfLabel,
}: {
  form: Form;
  close: () => void;
  data: Snapshot;
  people: Person[];
  halfLabel: Record<LeaveRequest["half"], string>;
}) {
  const t = useT();
  const { run, saving, error, setError } = useCommand();
  // One idempotency id per opened form: a retried submit cannot duplicate.
  const [clientId, setClientId] = useState(() => crypto.randomUUID());
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
  const titles = {
    apply: [
      t("Apply for leave", "छुट्टी के लिए आवेदन"),
      t(
        "Your request goes to the leave type's configured approver.",
        "आपका अनुरोध छुट्टी प्रकार के निर्धारित अनुमोदक को जाता है।",
      ),
    ],
    type: [
      t("Add leave type", "छुट्टी प्रकार जोड़ें"),
      t(
        "Set how days are counted and who approves. Saving is audited.",
        "दिन कैसे गिने जाएँ और कौन अनुमोदन करे, तय करें। सहेजना ऑडिट होता है।",
      ),
    ],
    credit: [
      t("Post leave credit", "छुट्टी क्रेडिट दर्ज करें"),
      t(
        "Adds an opening or periodic credit to an employee's ledger.",
        "कर्मचारी के लेजर में प्रारंभिक या आवधिक क्रेडिट जोड़ता है।",
      ),
    ],
  } as const;
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const text = (k: string) => String(f.get(k) ?? "").trim();
    const ok =
      form === "apply"
        ? await run("leave", {
            clientId,
            typeId: text("typeId"),
            startsOn: text("startsOn"),
            endsOn: text("endsOn"),
            half: text("half"),
            reason: text("reason"),
          })
        : form === "type"
          ? await run("leaveType", {
              code: text("code").toUpperCase(),
              label: text("label"),
              halfDays: f.has("halfDays"),
              includeWeekends: f.has("includeWeekends"),
              includeHolidays: f.has("includeHolidays"),
              approverId: text("approverId"),
            })
          : await run("leaveCredit", {
              employeeId: text("employeeId"),
              typeId: text("typeId"),
              units: Number(text("units")),
              effectiveOn: text("effectiveOn"),
              reason: text("reason"),
            });
    if (ok) {
      toast.success(
        form === "apply"
          ? t("Leave request submitted", "छुट्टी अनुरोध भेजा गया")
          : t("Saved", "सहेजा गया"),
      );
      close();
    }
  }
  const typeSelect = (
    <Field label={t("Leave type", "छुट्टी प्रकार")} htmlFor="leave-type">
      <NativeSelect id="leave-type" name="typeId" required defaultValue="">
        <option value="" disabled>
          {t("Choose a type…", "प्रकार चुनें…")}
        </option>
        {data.leaveTypes
          .filter((x) => x.active)
          .map((x) => (
            <option key={x.id} value={x.id}>
              {x.label}
            </option>
          ))}
      </NativeSelect>
    </Field>
  );
  const reason = (
    <Field
      label={t("Reason", "कारण")}
      htmlFor="leave-reason"
      hint={t("At least 8 characters.", "कम से कम 8 अक्षर।")}
    >
      <Textarea
        id="leave-reason"
        name="reason"
        required
        minLength={8}
        maxLength={1000}
      />
    </Field>
  );
  return (
    <Dialog
      open={!!form}
      onOpenChange={(v) => {
        if (!v) close();
      }}
    >
      {form && (
        <DialogContent
          className="sm:max-w-lg"
          onOpenAutoFocus={() => {
            setClientId(crypto.randomUUID());
            setError("");
          }}
        >
          <DialogHeader>
            <DialogTitle>{titles[form][0]}</DialogTitle>
            <DialogDescription>{titles[form][1]}</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="grid gap-4">
            {form === "apply" && (
              <>
                {typeSelect}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t("From", "से")} htmlFor="leave-from">
                    <Input
                      id="leave-from"
                      name="startsOn"
                      type="date"
                      required
                      defaultValue={today}
                    />
                  </Field>
                  <Field label={t("To", "तक")} htmlFor="leave-to">
                    <Input
                      id="leave-to"
                      name="endsOn"
                      type="date"
                      required
                      defaultValue={today}
                    />
                  </Field>
                </div>
                <Field
                  label={t("Day portion", "दिन का भाग")}
                  htmlFor="leave-half"
                  hint={t(
                    "Half days apply only to single-day requests of types that allow them.",
                    "आधा दिन केवल उन प्रकारों के एक-दिवसीय अनुरोध पर लागू है जो अनुमति देते हैं।",
                  )}
                >
                  <NativeSelect id="leave-half" name="half" defaultValue="full">
                    {(["full", "am", "pm"] as const).map((v) => (
                      <option key={v} value={v}>
                        {halfLabel[v]}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                {reason}
              </>
            )}
            {form === "type" && (
              <>
                <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
                  <Field
                    label={t("Code", "कोड")}
                    htmlFor="leave-code"
                    hint="CL, SL, EL…"
                  >
                    <Input
                      id="leave-code"
                      name="code"
                      required
                      pattern="[A-Za-z0-9_]{2,16}"
                      maxLength={16}
                      className="uppercase"
                    />
                  </Field>
                  <Field
                    label={t("Display name", "प्रदर्शित नाम")}
                    htmlFor="leave-label"
                  >
                    <Input
                      id="leave-label"
                      name="label"
                      required
                      maxLength={200}
                      placeholder={t(
                        "e.g. Casual leave",
                        "जैसे आकस्मिक छुट्टी",
                      )}
                    />
                  </Field>
                </div>
                <div className="grid gap-3 rounded-lg border p-4">
                  {(
                    [
                      ["halfDays", t("Permit half days", "आधे दिन की अनुमति")],
                      [
                        "includeWeekends",
                        t("Count weekends", "सप्ताहांत गिनें"),
                      ],
                      [
                        "includeHolidays",
                        t(
                          "Count configured holidays",
                          "निर्धारित छुट्टियाँ गिनें",
                        ),
                      ],
                    ] as const
                  ).map(([key, label]) => (
                    <label
                      key={key}
                      className="flex items-center justify-between gap-3 text-sm font-medium"
                    >
                      {label}
                      <Switch name={key} />
                    </label>
                  ))}
                </div>
                <Field
                  label={t("Leave approver", "छुट्टी अनुमोदक")}
                  htmlFor="leave-approver"
                >
                  <NativeSelect
                    id="leave-approver"
                    name="approverId"
                    required
                    defaultValue=""
                  >
                    <option value="" disabled>
                      {data.approvers.length
                        ? t("Choose an approver…", "अनुमोदक चुनें…")
                        : t("No eligible approvers", "कोई योग्य अनुमोदक नहीं")}
                    </option>
                    {data.approvers.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
              </>
            )}
            {form === "credit" && (
              <>
                <Field
                  label={t("Employee", "कर्मचारी")}
                  htmlFor="leave-employee"
                >
                  <NativeSelect
                    id="leave-employee"
                    name="employeeId"
                    required
                    defaultValue=""
                  >
                    <option value="" disabled>
                      {t("Choose a person…", "व्यक्ति चुनें…")}
                    </option>
                    {people.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.displayName}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                {typeSelect}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label={t("Credit in days", "दिनों में क्रेडिट")}
                    htmlFor="leave-units"
                  >
                    <Input
                      id="leave-units"
                      name="units"
                      type="number"
                      required
                      min={0.5}
                      max={365}
                      step={0.5}
                    />
                  </Field>
                  <Field
                    label={t("Effective date", "प्रभावी तिथि")}
                    htmlFor="leave-effective"
                  >
                    <Input
                      id="leave-effective"
                      name="effectiveOn"
                      type="date"
                      required
                      defaultValue={today}
                    />
                  </Field>
                </div>
                {reason}
              </>
            )}
            <ErrorAlert error={error} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={close}>
                {t("Cancel", "रद्द करें")}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="size-4 animate-spin" />}
                {form === "apply"
                  ? t("Submit request", "अनुरोध भेजें")
                  : t("Save", "सहेजें")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      )}
    </Dialog>
  );
}
