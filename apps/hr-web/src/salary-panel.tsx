import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  IndianRupee,
  Loader2,
  Search,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import {
  PayrollDocument,
  PayrollCommandDocument,
} from "../../../packages/contracts/src/generated";
import {
  calculatePayroll,
  rupeesToPaise,
} from "../../../packages/contracts/payroll";
import { useScope, useScopedQuery, useWrite } from "./workspace-context";
import { ErrorState, PageSkeleton, useT } from "./ui";
import {
  Desk,
  DeskEmpty,
  DeskHeader,
  DeskKpis,
  DeskTable,
  Person,
  Pill,
  type DeskColumn,
} from "./components/shared/desk";
import { Money, formatDate } from "./components/shared/formatting";
import { Field } from "./components/shared/page";
import { Button } from "./components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Row = Record<string, any>;
// One fixed set of components keeps salary entry simple; other codes saved
// earlier are carried over unchanged.
const components = [
  ["BASIC", "Basic", "earning"],
  ["HRA", "House rent allowance (HRA)", "earning"],
  ["SPECIAL", "Special allowance", "earning"],
  ["CONVEYANCE", "Conveyance", "earning"],
  ["OTHER_ALLOWANCE", "Other allowance", "earning"],
  ["PF", "Provident fund (PF)", "deduction"],
  ["ESI", "ESI", "deduction"],
  ["PT", "Professional tax", "deduction"],
  ["TDS", "TDS (income tax)", "deduction"],
  ["OTHER_DEDUCTION", "Other deduction", "deduction"],
] as const;
const known = new Set<string>(components.map(([code]) => code));
const rupees = (paise: string) => {
  const v = BigInt(paise);
  return `${v / 100n}${v % 100n ? `.${String(v % 100n).padStart(2, "0")}` : ""}`;
};
const today = () => new Date().toLocaleDateString("en-CA");
/** The salary in force today, if its dates cover today. */
const running = (r: Row) =>
  r.current && (!r.current.endsOn || r.current.endsOn >= today())
    ? r.current
    : null;

export function SalaryPanel() {
  const s = useScope(),
    t = useT(),
    [search, setSearch] = useState(""),
    [selectedId, setSelectedId] = useState<string | null>(null),
    [editing, setEditing] = useState<Row | null>(null);
  const q = useScopedQuery<any>(["payroll", "salaries"], PayrollDocument, {
    input: { salaries: true, first: 1 },
  });
  const d = q.data?.payroll;
  const rows: Row[] = useMemo(
    () =>
      (d?.salaries ?? []).filter((r: Row) =>
        `${r.name} ${r.code} ${r.jobTitle ?? ""}`
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
      ),
    [d, search],
  );
  if (q.isPending) return <PageSkeleton title={t("Salaries", "वेतन")} />;
  if (q.error)
    return <ErrorState error={q.error} retry={() => void q.refetch()} />;
  const all: Row[] = d.salaries ?? [];
  const set = all.filter(running);
  const net = set.reduce(
    (n, r) => n + BigInt(running(r).components.netPaise),
    0n,
  );
  const columns: DeskColumn<Row>[] = [
    {
      id: "Employee",
      header: "Employee",
      sortValue: (r) => r.name,
      cell: (r) => (
        <Person
          name={r.name}
          sub={[r.code, r.jobTitle].filter(Boolean).join(" · ")}
        />
      ),
    },
    {
      id: "Gross",
      header: "Monthly gross",
      className: "rd-mono text-right",
      cell: (r) =>
        running(r) ? <Money paise={running(r).components.grossPaise} /> : "—",
    },
    {
      id: "Net",
      header: "Net pay",
      className: "rd-mono text-right",
      sortValue: (r) =>
        (running(r)?.components.netPaise ?? "0").padStart(16, "0"),
      cell: (r) =>
        running(r) ? <Money paise={running(r).components.netPaise} /> : "—",
    },
    {
      id: "Status",
      header: "Salary",
      cell: (r) =>
        r.upcoming ? (
          <Pill tone="warning">Changes {formatDate(r.upcoming.startsOn)}</Pill>
        ) : running(r) ? (
          <Pill tone="success">Since {formatDate(running(r).startsOn)}</Pill>
        ) : (
          <Pill tone="danger">Not set</Pill>
        ),
    },
    {
      id: "Action",
      header: <span className="sr-only">Action</span>,
      className: "text-right",
      cell: (r) =>
        d.canEdit && !r.isSelf ? (
          <Button
            size="sm"
            variant={running(r) ? "outline" : "default"}
            onClick={(e) => {
              e.stopPropagation();
              setEditing(r);
            }}
          >
            {running(r) ? "Change" : "Set salary"}
          </Button>
        ) : null,
    },
  ];
  return (
    <Desk label={t("Salaries", "वेतन")}>
      <DeskHeader
        crumb={t("Finance / Salaries", "वित्त / वेतन")}
        title={t("Salaries", "वेतन")}
        subtitle={`${s.siteName} · ${t("Monthly salary for each employee. Payroll suggests each month's pay from it and attendance.", "हर कर्मचारी का मासिक वेतन। वेतन चलाने पर उपस्थिति के अनुसार राशि सुझाई जाती है।")}`}
      >
        <Button asChild variant="outline" size="sm">
          <Link to="/payroll">
            <Wallet className="size-4" />
            {t("Go to payroll", "वेतन पर जाएँ")}
          </Link>
        </Button>
      </DeskHeader>
      {!d.canView ? (
        <Alert>
          <ShieldCheck className="size-4" />
          <AlertDescription>
            {t(
              "Salaries need payroll permission at this site. HR can prepare payroll; Admin and Super Admin approve it. See Roles & permissions.",
              "वेतन के लिए इस साइट पर वेतन अनुमति चाहिए। एचआर वेतन तैयार करता है; एडमिन और सुपर एडमिन स्वीकृत करते हैं।",
            )}
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <DeskKpis
            label="Salary summary"
            items={[
              { label: "Employees", value: all.length, tone: "neutral" },
              { label: "Salary set", value: set.length, tone: "success" },
              {
                label: "Not set",
                value: all.length - set.length,
                tone: all.length - set.length ? "danger" : "neutral",
              },
              {
                label: "Monthly net",
                value: <Money paise={net.toString()} />,
                tone: "neutral",
              },
            ]}
          />
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <label className="relative min-w-[220px] flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                aria-label="Search employees"
                className="pl-9"
                placeholder="Search employees…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
          </div>
          <DeskTable
            label="Employee salaries"
            columns={columns}
            rows={rows}
            getId={(r) => r.employmentId}
            selectedId={selectedId}
            onSelect={setSelectedId}
            empty={
              <DeskEmpty
                icon={IndianRupee}
                title="No employees"
                hint="Employees assigned to this site appear here."
              />
            }
          />
          <p className="text-muted-foreground mt-3 px-1 text-xs">
            Payroll uses the salary in force during the month. Earnings are
            prorated by payable days from attendance; deductions stay as
            entered. A new salary ends the previous one the day before it
            starts. Nobody can set their own salary.
          </p>
        </>
      )}
      {editing && <SalaryDialog row={editing} close={() => setEditing(null)} />}
    </Desk>
  );
}

function SalaryDialog({ row, close }: { row: Row; close: () => void }) {
  const write = useWrite();
  const current = running(row) ?? row.upcoming;
  const lines: Row[] = current?.components.lines ?? [];
  const firstOfMonth = `${today().slice(0, 7)}-01`;
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      components.map(([code]) => {
        const l = lines.find((x) => x.code === code);
        return [code, l ? rupees(l.paise) : ""];
      }),
    ),
  );
  const [kept, setKept] = useState<Row[]>(
    lines
      .filter((l) => !known.has(l.code))
      .map(({ calculatedPaise: _, ...l }) => l),
  );
  const [startsOn, setStartsOn] = useState(
    [firstOfMonth, row.startsOn].sort()[1]!,
  );
  const [reason, setReason] = useState(
    current ? "Salary revision" : "Monthly salary set",
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [clientId, setClientId] = useState(() => crypto.randomUUID());
  let preview: ReturnType<typeof calculatePayroll> | null = null,
    problem = "";
  const calculation = () => ({
    lines: [
      ...components
        .filter(([code]) => values[code]?.trim() && values[code] !== "0")
        .map(([code, label, kind]) => ({
          code,
          label,
          kind,
          paise: rupeesToPaise(values[code]!),
          numerator: 1,
          denominator: 1,
        })),
      ...kept,
    ],
    rounding: "half_up_line" as const,
    accountantReview: true as const,
    policyVersion: "Salaries page",
    assumptions:
      "Monthly salary. Earnings are prorated by attendance when payroll runs; deductions stay as entered.",
  });
  try {
    const c = calculation();
    if (!c.lines.some((l) => l.kind !== "deduction"))
      problem = "Enter at least one earning, such as Basic.";
    else preview = calculatePayroll(c);
  } catch (e) {
    problem = (e as Error).message.startsWith("Enter")
      ? (e as Error).message
      : (e as Error).message.includes("Deductions")
        ? "Deductions are more than earnings."
        : "Check the amounts.";
  }
  const field = (code: string, label: string) => (
    <Field key={code} label={label} htmlFor={`salary-${code}`}>
      <Input
        id={`salary-${code}`}
        inputMode="decimal"
        placeholder="0"
        value={values[code]}
        onChange={(e) => {
          setClientId(crypto.randomUUID());
          setValues({ ...values, [code]: e.target.value });
        }}
      />
    </Field>
  );
  return (
    <Dialog open onOpenChange={(v) => !v && !busy && close()}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {current ? "Change salary" : "Set salary"} · {row.name}
          </DialogTitle>
          <DialogDescription>
            Monthly amounts in rupees. From the effective date this salary
            replaces the previous one.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid min-h-0 gap-5 overflow-y-auto"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!preview) return setError(problem || "Check the amounts.");
            setBusy(true);
            setError("");
            try {
              await write(PayrollCommandDocument, {
                operation: "structure",
                input: {
                  clientId,
                  expectedVersion: 0,
                  employmentId: row.employmentId,
                  startsOn,
                  endsOn: null,
                  calculation: calculation(),
                  reason,
                },
              });
              close();
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Effective from"
              htmlFor="salary-starts"
              hint={`Employment started ${formatDate(row.startsOn)}`}
            >
              <Input
                id="salary-starts"
                type="date"
                required
                min={row.startsOn}
                max={row.endsOn ?? undefined}
                value={startsOn}
                onChange={(e) => setStartsOn(e.target.value)}
              />
            </Field>
          </div>
          <fieldset className="grid gap-3">
            <legend className="mb-2 text-sm font-semibold">Earnings</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {components
                .filter(([, , kind]) => kind === "earning")
                .map(([code, label]) => field(code, label))}
            </div>
          </fieldset>
          <fieldset className="grid gap-3">
            <legend className="mb-2 text-sm font-semibold">Deductions</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {components
                .filter(([, , kind]) => kind === "deduction")
                .map(([code, label]) => field(code, label))}
            </div>
          </fieldset>
          {kept.length > 0 && (
            <div className="grid gap-2 text-sm">
              <strong>Also kept from the current salary</strong>
              {kept.map((l) => (
                <div
                  key={l.code}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
                >
                  <span>
                    {l.label} · {l.kind} · ₹{rupees(l.paise)}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setKept(kept.filter((x) => x.code !== l.code))
                    }
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
          <div
            className="bg-muted/40 grid grid-cols-3 gap-3 rounded-lg border p-3 text-sm"
            aria-live="polite"
          >
            <span>
              Gross
              <strong className="block text-base tabular-nums">
                {preview ? <Money paise={preview.grossPaise} /> : "—"}
              </strong>
            </span>
            <span>
              Deductions
              <strong className="block text-base tabular-nums">
                {preview ? <Money paise={preview.deductionPaise} /> : "—"}
              </strong>
            </span>
            <span>
              Net pay
              <strong className="block text-base tabular-nums">
                {preview ? <Money paise={preview.netPaise} /> : "—"}
              </strong>
            </span>
          </div>
          <Field label="Reason" htmlFor="salary-reason">
            <Textarea
              id="salary-reason"
              required
              minLength={8}
              maxLength={2000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
          {(error || problem) && (
            <p role="alert" className="text-destructive text-sm">
              {error || problem}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={close}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !preview}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Save salary
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
