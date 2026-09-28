import { useState } from "react";
import { Link } from "react-router-dom";
import { KeyRound, Search, ShieldCheck, Workflow } from "lucide-react";
import {
  AccessUsersDocument,
  RoleMatrixDocument,
} from "../../../packages/contracts/src/generated";
import { useScope, useScopedQuery } from "./workspace-context";
import { ErrorState, PageSkeleton, useT } from "./ui";
import { Desk, DeskHeader, Pill } from "./components/shared/desk";
import { Button } from "./components/ui/button";
import { Input } from "@/components/ui/input";

const roles = [
  ["super_admin", "Super Admin"],
  ["admin", "Admin"],
  ["hr", "HR"],
  ["jr_hr", "Jr. HR"],
  ["manager", "Manager"],
  ["supervisor", "Supervisor"],
  ["employee", "Employee"],
] as const;
const actionLabel: Record<string, string> = {
  view: "View",
  create: "Create",
  edit: "Edit",
  submit: "Submit",
  review: "Review",
  approve: "Approve",
  export: "Export",
  manage: "Manage",
};
type Template = { role: string; key: string; scope: string };

/** Who can do what by default, per role, and where individual access changes. */
export function PermissionsPanel() {
  const s = useScope(),
    t = useT(),
    [search, setSearch] = useState("");
  const q = useScopedQuery<any>(["role-matrix"], RoleMatrixDocument);
  const matrix = q.data?.roleMatrix;
  const people = useScopedQuery<any>(
    ["access-users", search],
    AccessUsersDocument,
    { search },
    !!matrix?.canManage,
  );
  if (q.isPending)
    return (
      <PageSkeleton title={t("Roles & permissions", "भूमिकाएँ और अनुमतियाँ")} />
    );
  if (q.error)
    return <ErrorState error={q.error} retry={() => void q.refetch()} />;
  const has = new Map<string, string>(
    (matrix.templates as Template[]).map((x) => [
      `${x.role}:${x.key}`,
      x.scope,
    ]),
  );
  const can = (role: string, key: string) => has.has(`${role}:${key}`);
  const who = (key: string) =>
    roles.filter(([r]) => can(r, key)).map(([, label]) => label);
  const modules = s.modules
    .filter((m) => m.available)
    .filter(
      (m) =>
        !search ||
        `${m.name} ${m.group}`.toLowerCase().includes(search.toLowerCase()),
    );
  const cell = (role: string, m: (typeof modules)[number]) => {
    const actions = m.actions.filter((a) => can(role, `${m.id}.${a}`));
    if (!actions.length)
      return <span className="text-muted-foreground">—</span>;
    const own = has.get(`${role}:${m.id}.${actions[0]}`) === "own";
    const label =
      actions.length === m.actions.length
        ? "Full"
        : actions.length === 1 && actions[0] === "view"
          ? "View"
          : actions.map((a) => actionLabel[a] ?? a).join(" · ");
    return (
      <span title={actions.map((a) => actionLabel[a] ?? a).join(", ")}>
        {label}
        {own && <span className="text-muted-foreground"> (own)</span>}
      </span>
    );
  };
  const steps = [
    {
      title: "Set salaries and run payroll",
      text: "Pay is suggested from attendance.",
      roles: who("payroll.edit"),
    },
    {
      title: "Send for approval",
      text: "After checking each amount.",
      roles: who("payroll.edit"),
    },
    {
      title: "Final approval",
      text: "Never by the person who prepared it or is being paid.",
      roles: who("payroll.approve"),
    },
    {
      title: "Publish payslips, record payment",
      text: "Employees then see their payslip.",
      roles: who("payroll.manage"),
    },
  ];
  return (
    <Desk label={t("Roles & permissions", "भूमिकाएँ और अनुमतियाँ")}>
      <DeskHeader
        crumb={t(
          "Administration / Roles & permissions",
          "प्रशासन / भूमिकाएँ और अनुमतियाँ",
        )}
        title={t("Roles & permissions", "भूमिकाएँ और अनुमतियाँ")}
        subtitle={`${s.siteName} · ${t("What each role can do by default. Individual changes are made per person and are audited.", "हर भूमिका डिफ़ॉल्ट रूप से क्या कर सकती है। व्यक्तिगत बदलाव हर व्यक्ति के लिए, ऑडिट के साथ।")}`}
      >
        {matrix.canManage && (
          <Button asChild size="sm">
            <Link to="/access">
              <KeyRound className="size-4" />
              {t("Change a person's access", "किसी व्यक्ति की अनुमति बदलें")}
            </Link>
          </Button>
        )}
      </DeskHeader>
      <section
        className="mb-6 rounded-xl border p-4"
        aria-labelledby="payroll-flow"
      >
        <h2
          id="payroll-flow"
          className="mb-3 flex items-center gap-2 text-sm font-semibold"
        >
          <Workflow className="size-4" /> Payroll approval flow
        </h2>
        <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {steps.map((step, i) => (
            <li
              key={step.title}
              className="bg-muted/30 rounded-lg border p-3 text-sm"
            >
              <span className="text-muted-foreground text-xs">
                Step {i + 1}
              </span>
              <strong className="block">{step.title}</strong>
              <span className="text-muted-foreground block text-xs">
                {step.text}
              </span>
              <span className="mt-2 flex flex-wrap gap-1">
                {step.roles.length ? (
                  step.roles.map((r) => (
                    <Pill key={r} tone="success">
                      {r}
                    </Pill>
                  ))
                ) : (
                  <Pill tone="warning">Per person only</Pill>
                )}
              </span>
            </li>
          ))}
        </ol>
      </section>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="relative min-w-[220px] flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            aria-label="Search modules and people"
            className="pl-9"
            placeholder="Search modules or people…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <table
          className="w-full min-w-[820px] text-sm whitespace-normal"
          aria-label="Role defaults by module"
        >
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="bg-muted/40 sticky left-0 px-3 py-2 font-medium">
                Module
              </th>
              {roles.map(([id, label]) => (
                <th key={id} className="px-3 py-2 font-medium">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {modules.map((m) => (
              <tr key={m.id} className="border-t">
                <th
                  scope="row"
                  className="bg-background text-foreground sticky left-0 px-3 py-2 text-left text-sm font-medium tracking-normal normal-case"
                >
                  {t(m.name, m.hindi)}
                  <span className="text-muted-foreground block text-xs font-normal">
                    {m.group}
                  </span>
                </th>
                {roles.map(([id]) => (
                  <td key={id} className="px-3 py-2 align-top">
                    {cell(id, m)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-muted-foreground mt-3 px-1 text-xs">
        Role defaults are shared by every organization using this system and
        change only with a reviewed release. A person's own access can add or
        remove permissions on top of their role; job titles never grant access.
      </p>
      <section className="mt-6" aria-labelledby="people-access">
        <h2
          id="people-access"
          className="mb-3 flex items-center gap-2 text-sm font-semibold"
        >
          <ShieldCheck className="size-4" /> People
        </h2>
        {!matrix.canManage ? (
          <p className="text-muted-foreground text-sm">
            {t(
              "Only a Super Admin, or someone they allow to manage access, can change what a person can do. Ask them to open Users & module access.",
              "केवल सुपर एडमिन, या जिसे वे अनुमति प्रबंधन दें, किसी व्यक्ति की अनुमति बदल सकते हैं।",
            )}
          </p>
        ) : people.error ? (
          <ErrorState
            error={people.error}
            retry={() => void people.refetch()}
          />
        ) : (
          <ul className="divide-y rounded-xl border">
            {(people.data?.accessUsers.users ?? []).map((u: any) => (
              <li
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
              >
                <span className="min-w-0">
                  <strong>{u.name}</strong>
                  <span className="text-muted-foreground block truncate text-xs">
                    {u.email}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  {!u.active && (
                    <Pill tone="neutral">No access at this site</Pill>
                  )}
                  {u.protected && <Pill tone="warning">Super Admin</Pill>}
                  <Button asChild size="sm" variant="outline">
                    <Link to={`/access?user=${u.id}`}>Manage access</Link>
                  </Button>
                </span>
              </li>
            ))}
            {people.isPending && (
              <li className="text-muted-foreground px-3 py-2 text-sm">
                Loading people…
              </li>
            )}
          </ul>
        )}
      </section>
    </Desk>
  );
}
