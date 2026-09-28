import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Check } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  OperationsDocument,
  OperateDocument,
} from "@/shared/contracts/generated";
import { useScope, useScopedQuery, useWrite } from "./workspace-context";
import {
  Badge,
  Empty,
  ErrorState,
  Heading,
  Notice,
  Skeleton,
  Tabs,
} from "./ui";
import { Button } from "./components/ui/button";
import { DataTable } from "./components/shared/data-table";

const moduleRoutes: Record<string, string> = {
  payroll: "payroll",
  my_payroll: "payroll",
  my_dwr: "dwr",
  dwr_review: "dwr",
  tasks: "tasks",
  leave: "leave",
  my_leave: "leave",
  attendance: "attendance",
  my_attendance: "attendance",
  field_duty: "tracking",
  expenses: "expenses",
  assets: "assets",
  documents: "documents",
  my_documents: "documents",
  helpdesk: "helpdesk",
  grievances: "grievances",
  announcements: "announcements",
  employees: "lifecycle",
};
export function InboxPanel() {
  const s = useScope(),
    write = useWrite(),
    navigate = useNavigate();
  const q = useScopedQuery<any>(
    ["operations"],
    OperationsDocument,
    {},
    s.capabilities.includes("inbox.view"),
    30000,
  );
  const [view, setView] = useState("unread"),
    [pending, setPending] = useState(""),
    [error, setError] = useState("");
  async function read(n: any, open = false) {
    setPending(n.id);
    setError("");
    try {
      await write(OperateDocument, {
        operation: "readInbox",
        input: { id: n.id },
      });
      if (open) {
        const kind = n.event_type.split(".")[1];
        const hrRoutes: Record<string, string> = {
          expense: "expenses",
          asset: "assets",
          document: "documents",
          policy: "policies",
          announcement: "announcements",
          lifecycle: "lifecycle",
          helpdesk: "helpdesk",
          grievance: "grievances",
        };
        navigate(
          "/" +
            (n.event_type.startsWith("hr.")
              ? (hrRoutes[kind] ?? "hr")
              : (moduleRoutes[n.module] ?? "hr")),
        );
      }
    } catch (e) {
      setError("This notification could not be updated. Try again.");
    } finally {
      setPending("");
    }
  }
  const rows = (q.data?.operations.inbox ?? []).filter(
    (r: any) => view === "all" || !r.read_at,
  );
  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        header: "Update",
        accessorKey: "event_type",
        cell: ({ getValue }) => String(getValue()).replaceAll(".", " · "),
      },
      {
        header: "Received",
        accessorKey: "created_at",
        cell: ({ getValue }) => new Date(String(getValue())).toLocaleString(),
      },
      {
        header: "Status",
        accessorFn: (r) => (r.read_at ? "Read" : "Unread"),
        cell: ({ getValue }) => (
          <Badge tone={getValue() === "Unread" ? "info" : "neutral"}>
            {String(getValue())}
          </Badge>
        ),
      },
      {
        header: "Push delivery",
        accessorKey: "push_status",
        cell: ({ getValue }) => <Badge>{String(getValue())}</Badge>,
      },
      {
        header: "",
        id: "actions",
        cell: ({ row: { original: n } }) => (
          <div className="row-actions">
            {!n.read_at && (
              <Button
                variant="ghost"
                disabled={!!pending}
                onClick={() => void read(n)}
                aria-label="Mark notification read"
              >
                <Check size={15} />
              </Button>
            )}
            <Button
              variant="ghost"
              disabled={!!pending}
              onClick={() => void read(n, true)}
            >
              Open <ArrowUpRight size={15} />
            </Button>
          </div>
        ),
      },
    ],
    [pending, write, navigate],
  );
  return (
    <section>
      <Heading
        eyebrow={s.siteName}
        title="Inbox"
        description="Your attendance, work and HR updates. Each linked record rechecks your access."
      />
      <Tabs
        value={view}
        onChange={setView}
        items={[
          { id: "unread", label: "Unread" },
          { id: "all", label: "All updates" },
        ]}
      />
      {error && <Notice>{error}</Notice>}
      {q.isPending ? (
        <Skeleton />
      ) : q.error ? (
        <ErrorState error={q.error} retry={() => void q.refetch()} />
      ) : rows.length ? (
        <DataTable
          data={rows}
          columns={columns}
          getRowId={(r: any) => r.id}
          label="Notifications"
        />
      ) : (
        <Empty title="You’re all caught up">
          New updates will appear here. Server records remain available even
          when push delivery is unavailable.
        </Empty>
      )}
    </section>
  );
}
