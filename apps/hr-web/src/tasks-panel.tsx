import { useRef, useState } from "react";
import type { ColumnDef, ColumnFiltersState } from "@tanstack/react-table";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CalendarClock,
  Circle,
  CircleCheck,
  CircleSlash,
  Ellipsis,
  ListTodo,
  Loader2,
  MessageSquare,
  Paperclip,
  Plus,
  Send,
  Timer,
  TriangleAlert,
} from "lucide-react";
import {
  EmployeesDocument,
  OperateDocument,
  OperationsDocument,
} from "../../../packages/contracts/src/generated";
import { uploadEvidence } from "./api";
import { useScope, useScopedQuery, useWrite } from "./workspace-context";
import { Empty, ErrorState, Heading, PageSkeleton, useT } from "./ui";
import { DataTable } from "./components/shared/data-table";
import { Field, StatCard, StatGrid } from "./components/shared/page";
import {
  formatDate,
  formatDateTime,
  formatRelative,
} from "./components/shared/formatting";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Status = "todo" | "in_progress" | "blocked" | "done";
type Priority = "low" | "normal" | "high" | "urgent";
type Task = {
  id: string;
  title: string;
  description: string;
  employee_id: string;
  assignee_id: string;
  author_id: string;
  deadline: string;
  priority: Priority;
  status: Status;
  version: number;
  created_at: string;
};
type Comment = {
  id: string;
  task_id: string;
  author_id: string;
  body: string;
  attachment_id: string | null;
  created_at: string;
};
type Person = { id: string; userId: string | null; displayName: string };

const statusStyle = {
  todo: { icon: Circle, variant: "secondary" },
  in_progress: { icon: Timer, variant: "info" },
  blocked: { icon: CircleSlash, variant: "destructive" },
  done: { icon: CircleCheck, variant: "success" },
} as const;
const priorityStyle = {
  urgent: { icon: TriangleAlert, className: "text-destructive" },
  high: { icon: ArrowUp, className: "text-warning" },
  normal: { icon: ArrowRight, className: "text-muted-foreground" },
  low: { icon: ArrowDown, className: "text-muted-foreground" },
} as const;
const open = (t: Task) => t.status !== "done";
function dueBucket(task: Task, now: number) {
  if (task.status === "done") return "done";
  const due = Date.parse(task.deadline);
  if (due < now) return "overdue";
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  if (due <= endOfDay.getTime()) return "today";
  return due <= now + 7 * 86_400_000 ? "week" : "later";
}
const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
/** datetime-local value for tomorrow at 17:00 local time. */
function defaultDeadline() {
  const d = new Date(Date.now() + 86_400_000);
  d.setHours(17, 0, 0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}
const sameFilters = (a: ColumnFiltersState, b: ColumnFiltersState) =>
  JSON.stringify(a) === JSON.stringify(b);

export function TasksPanel() {
  const s = useScope(),
    t = useT(),
    write = useWrite(),
    can = (cap: string) => s.capabilities.includes(cap);
  const q = useScopedQuery<{
    operations: { me: string | null; tasks: Task[]; comments: Comment[] };
  }>(["operations"], OperationsDocument, {}, true, 15000);
  const people = useScopedQuery<{ employees: { nodes: Person[] } }>(
    ["operation-people"],
    EmployeesDocument,
    { first: 50 },
    can("employees.view"),
  );
  const [view, setView] = useState<"all" | "mine" | "created">("all");
  const [filters, setFilters] = useState<ColumnFiltersState>([]);
  const [focus, setFocus] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const data = q.data?.operations;
  const nodes = people.data?.employees.nodes ?? [];
  const byEmployee = new Map(nodes.map((e) => [e.id, e.displayName]));
  const byUser = new Map(
    nodes.filter((e) => e.userId).map((e) => [e.userId, e.displayName]),
  );
  const employeeName = (id: string) =>
    byEmployee.get(id) ??
    (id === data?.me ? t("You", "आप") : t("Team member", "टीम सदस्य"));
  const userName = (id: string) =>
    id === s.actorId
      ? t("You", "आप")
      : (byUser.get(id) ?? t("Team member", "टीम सदस्य"));
  const canUpdate = (task: Task) =>
    can(task.assignee_id === s.actorId ? "tasks.submit" : "tasks.edit");
  const statusLabel: Record<Status, string> = {
    todo: t("To do", "करना है"),
    in_progress: t("In progress", "प्रगति में"),
    blocked: t("Blocked", "रुका हुआ"),
    done: t("Done", "पूरा"),
  };
  const priorityLabel: Record<Priority, string> = {
    urgent: t("Urgent", "अति आवश्यक"),
    high: t("High", "उच्च"),
    normal: t("Normal", "सामान्य"),
    low: t("Low", "निम्न"),
  };
  const now = Date.now();
  const tasks = data?.tasks ?? [];
  const comments = data?.comments ?? [];
  const commentCount = new Map<string, number>();
  for (const c of comments)
    commentCount.set(c.task_id, (commentCount.get(c.task_id) ?? 0) + 1);
  const rows = tasks.filter((task) =>
    view === "mine"
      ? task.assignee_id === s.actorId
      : view === "created"
        ? task.author_id === s.actorId
        : true,
  );

  async function setStatus(task: Task, status: Status) {
    if (status === task.status) return;
    setBusy(task.id);
    try {
      await write(OperateDocument, {
        operation: "taskStatus",
        input: { id: task.id, expectedVersion: task.version, status },
      });
      toast.success(
        `${t("Marked", "चिह्नित")} ${statusLabel[status].toLowerCase()}`,
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const columns: ColumnDef<Task>[] = [
    {
      header: t("Task", "कार्य"),
      id: "title",
      accessorKey: "title",
      cell: ({ row: { original: task } }) => (
        <div className="flex max-w-[440px] min-w-[220px] flex-col">
          <span className="flex items-center gap-2">
            <span className="truncate font-medium">{task.title}</span>
            {!!commentCount.get(task.id) && (
              <span className="text-muted-foreground inline-flex shrink-0 items-center gap-1 text-xs">
                <MessageSquare className="size-3.5" />
                {commentCount.get(task.id)}
              </span>
            )}
          </span>
          {task.description && (
            <span className="text-muted-foreground truncate text-xs">
              {task.description}
            </span>
          )}
        </div>
      ),
    },
    {
      header: t("Assignee", "सौंपा गया"),
      id: "assignee",
      accessorFn: (task) => employeeName(task.employee_id),
      cell: ({ getValue }) => (
        <span className="flex items-center gap-2">
          <Avatar className="size-7">
            <AvatarFallback className="bg-primary/10 text-primary text-[11px]">
              {initials(String(getValue()))}
            </AvatarFallback>
          </Avatar>
          <span className="truncate">{String(getValue())}</span>
        </span>
      ),
    },
    {
      header: t("Status", "स्थिति"),
      id: "status",
      accessorKey: "status",
      cell: ({ row: { original: task } }) => {
        const style = statusStyle[task.status];
        return (
          <Badge variant={style.variant}>
            <style.icon />
            {statusLabel[task.status]}
          </Badge>
        );
      },
    },
    {
      header: t("Priority", "प्राथमिकता"),
      id: "priority",
      accessorKey: "priority",
      sortingFn: (a, b) =>
        ["low", "normal", "high", "urgent"].indexOf(a.original.priority) -
        ["low", "normal", "high", "urgent"].indexOf(b.original.priority),
      cell: ({ row: { original: task } }) => {
        const style = priorityStyle[task.priority];
        return (
          <span className="flex items-center gap-1.5">
            <style.icon className={cn("size-4", style.className)} />
            {priorityLabel[task.priority]}
          </span>
        );
      },
    },
    {
      header: t("Due", "देय"),
      id: "deadline",
      accessorKey: "deadline",
      cell: ({ row: { original: task } }) => {
        const late = open(task) && Date.parse(task.deadline) < now;
        return (
          <span className="flex flex-col">
            <span className={cn(late && "text-destructive font-medium")}>
              {formatDate(task.deadline)}
            </span>
            <span
              className={cn(
                "text-xs",
                late ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {task.status === "done"
                ? statusLabel.done
                : late
                  ? `${t("Overdue", "समय सीमा पार")} · ${formatRelative(task.deadline, now)}`
                  : formatRelative(task.deadline, now)}
            </span>
          </span>
        );
      },
    },
    {
      header: t("Due window", "देय अवधि"),
      id: "due",
      accessorFn: (task) => dueBucket(task, now),
    },
    {
      header: "",
      id: "actions",
      enableHiding: false,
      cell: ({ row: { original: task } }) => (
        <div className="flex justify-end">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`${t("Actions for", "कार्रवाई")} ${task.title}`}
                className="data-[state=open]:bg-muted"
              >
                <Ellipsis className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onSelect={() => setFocus(task.id)}>
                {t("Open details", "विवरण खोलें")}
              </DropdownMenuItem>
              {canUpdate(task) && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    {t("Set status", "स्थिति बदलें")}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup
                      value={task.status}
                      onValueChange={(v) => void setStatus(task, v as Status)}
                    >
                      {(Object.keys(statusStyle) as Status[]).map((v) => (
                        <DropdownMenuRadioItem key={v} value={v}>
                          {statusLabel[v]}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}
              {canUpdate(task) && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setFocus(task.id)}>
                    <MessageSquare />
                    {t("Add comment", "टिप्पणी जोड़ें")}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  if (q.isPending) return <PageSkeleton title={t("Tasks", "कार्य")} />;
  if (q.error)
    return <ErrorState error={q.error} retry={() => void q.refetch()} />;
  const counts = {
    open: tasks.filter(open).length,
    progress: tasks.filter((x) => x.status === "in_progress").length,
    overdue: tasks.filter((x) => dueBucket(x, now) === "overdue").length,
    done: tasks.filter((x) => x.status === "done").length,
  };
  const preset = (next: ColumnFiltersState) =>
    setFilters((current) => (sameFilters(current, next) ? [] : next));
  const presets = {
    open: [{ id: "status", value: ["todo", "in_progress", "blocked"] }],
    progress: [{ id: "status", value: ["in_progress"] }],
    overdue: [{ id: "due", value: ["overdue"] }],
    done: [{ id: "status", value: ["done"] }],
  };
  const assignees = [...new Set(tasks.map((x) => employeeName(x.employee_id)))];
  const focused = tasks.find((x) => x.id === focus) ?? null;
  const assign = can("tasks.create") && (
    <Button onClick={() => setAssigning(true)}>
      <Plus className="size-4" />
      {t("Assign task", "कार्य सौंपें")}
    </Button>
  );
  return (
    <section className="grid gap-5">
      <Heading
        title={t("Tasks", "कार्य")}
        description={`${s.siteName} · ${t("Assign work, track progress and close it out.", "काम सौंपें, प्रगति देखें और पूरा करें।")}`}
      >
        {assign}
      </Heading>
      {tasks.length === 0 ? (
        <Empty
          icon={ListTodo}
          title={t("No tasks yet", "अभी कोई कार्य नहीं")}
          action={assign}
        >
          {can("tasks.create")
            ? t(
                "Assign the first task to someone at this site. They are notified in the app and can comment and attach files.",
                "इस साइट पर किसी को पहला कार्य सौंपें। उन्हें ऐप में सूचना मिलेगी।",
              )
            : t(
                "Tasks assigned to you appear here.",
                "आपको सौंपे गए कार्य यहाँ दिखेंगे।",
              )}
        </Empty>
      ) : (
        <>
          <StatGrid>
            <StatCard
              label={t("Open tasks", "खुले कार्य")}
              value={counts.open}
              hint={t(
                "To do, in progress or blocked",
                "करना है, प्रगति में या रुका",
              )}
              icon={ListTodo}
              tone="primary"
              active={sameFilters(filters, presets.open)}
              onClick={() => preset(presets.open)}
            />
            <StatCard
              label={t("In progress", "प्रगति में")}
              value={counts.progress}
              hint={t("Being worked on now", "अभी चल रहे")}
              icon={Timer}
              tone="info"
              active={sameFilters(filters, presets.progress)}
              onClick={() => preset(presets.progress)}
            />
            <StatCard
              label={t("Overdue", "समय सीमा पार")}
              value={counts.overdue}
              hint={t("Past the deadline, not done", "समय सीमा के बाद, अधूरे")}
              icon={CalendarClock}
              tone={counts.overdue ? "danger" : "default"}
              active={sameFilters(filters, presets.overdue)}
              onClick={() => preset(presets.overdue)}
            />
            <StatCard
              label={t("Completed", "पूरे")}
              value={counts.done}
              hint={`${tasks.length ? Math.round((counts.done / tasks.length) * 100) : 0}% ${t("of all tasks", "सभी कार्यों का")}`}
              icon={CircleCheck}
              tone="success"
              active={sameFilters(filters, presets.done)}
              onClick={() => preset(presets.done)}
            />
          </StatGrid>
          <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
            <TabsList>
              <TabsTrigger value="all">
                {t("All tasks", "सभी कार्य")}
                <span className="text-muted-foreground text-xs">
                  {tasks.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="mine">
                {t("Assigned to me", "मुझे सौंपे")}
                <span className="text-muted-foreground text-xs">
                  {tasks.filter((x) => x.assignee_id === s.actorId).length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="created">
                {t("Created by me", "मेरे बनाए")}
                <span className="text-muted-foreground text-xs">
                  {tasks.filter((x) => x.author_id === s.actorId).length}
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <DataTable
            data={rows}
            columns={columns}
            getRowId={(r) => r.id}
            label={t("Tasks", "कार्य")}
            search={t("Search tasks or people…", "कार्य या व्यक्ति खोजें…")}
            hidden={["due"]}
            columnFilters={filters}
            onColumnFiltersChange={setFilters}
            onRowClick={(task) => setFocus(task.id)}
            empty={t("No tasks in this view.", "इस दृश्य में कोई कार्य नहीं।")}
            filters={[
              {
                column: "status",
                title: t("Status", "स्थिति"),
                options: (Object.keys(statusStyle) as Status[]).map((v) => ({
                  value: v,
                  label: statusLabel[v],
                  icon: statusStyle[v].icon,
                })),
              },
              {
                column: "priority",
                title: t("Priority", "प्राथमिकता"),
                options: (Object.keys(priorityStyle) as Priority[]).map(
                  (v) => ({
                    value: v,
                    label: priorityLabel[v],
                    icon: priorityStyle[v].icon,
                  }),
                ),
              },
              {
                column: "due",
                title: t("Due", "देय"),
                options: [
                  { value: "overdue", label: t("Overdue", "समय सीमा पार") },
                  { value: "today", label: t("Due today", "आज देय") },
                  { value: "week", label: t("Next 7 days", "अगले 7 दिन") },
                  { value: "later", label: t("Later", "बाद में") },
                  { value: "done", label: t("Completed", "पूरे") },
                ],
              },
              ...(assignees.length > 1
                ? [
                    {
                      column: "assignee",
                      title: t("Assignee", "सौंपा गया"),
                      options: assignees.map((name) => ({
                        value: name,
                        label: name,
                      })),
                    },
                  ]
                : []),
            ]}
          />
        </>
      )}
      <TaskSheet
        key={focused?.id}
        task={focused}
        comments={comments}
        onClose={() => setFocus(null)}
        employeeName={employeeName}
        userName={userName}
        statusLabel={statusLabel}
        priorityLabel={priorityLabel}
        canUpdate={focused ? canUpdate(focused) : false}
        busy={busy === focused?.id}
        setStatus={setStatus}
      />
      <AssignTaskDialog
        open={assigning}
        onOpenChange={setAssigning}
        people={nodes}
        priorityLabel={priorityLabel}
      />
    </section>
  );
}

function TaskSheet({
  task,
  comments,
  onClose,
  employeeName,
  userName,
  statusLabel,
  priorityLabel,
  canUpdate,
  busy,
  setStatus,
}: {
  task: Task | null;
  comments: Comment[];
  onClose: () => void;
  employeeName: (id: string) => string;
  userName: (id: string) => string;
  statusLabel: Record<Status, string>;
  priorityLabel: Record<Priority, string>;
  canUpdate: boolean;
  busy: boolean;
  setStatus: (task: Task, status: Status) => Promise<void>;
}) {
  const t = useT(),
    s = useScope(),
    write = useWrite();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  if (!task) return null;
  const thread = comments
    .filter((c) => c.task_id === task.id)
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  const late = task.status !== "done" && Date.parse(task.deadline) < Date.now();
  const status = statusStyle[task.status];
  const priority = priorityStyle[task.priority];
  async function comment(input: { body: string; attachmentId?: string }) {
    await write(OperateDocument, {
      operation: "comment",
      input: { clientId: crypto.randomUUID(), taskId: task!.id, ...input },
    });
  }
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    try {
      await comment({ body: body.trim() });
      setBody("");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSending(false);
    }
  }
  async function attach(picked: File) {
    setSending(true);
    try {
      const intent = await write<any>(OperateDocument, {
        operation: "fileIntent",
        input: {
          clientId: crypto.randomUUID(),
          purpose: "task",
          parentId: task!.id,
          type: picked.type,
          bytes: picked.size,
        },
      });
      const upload = await uploadEvidence(s.siteId, intent.operate.id, picked);
      if (upload.status !== "ready")
        throw Error(
          t(
            "File quarantined or rejected. It cannot be attached until scanning succeeds.",
            "फ़ाइल जाँच में है या अस्वीकृत है। स्कैन सफल होने तक जोड़ी नहीं जा सकती।",
          ),
        );
      await comment({
        body: `${t("Attached", "संलग्न")} ${picked.name}`.slice(0, 4000),
        attachmentId: upload.id,
      });
      toast.success(t("File attached", "फ़ाइल संलग्न"));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSending(false);
      if (file.current) file.current.value = "";
    }
  }
  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="gap-3 border-b p-6 pr-12">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={status.variant}>
              <status.icon />
              {statusLabel[task.status]}
            </Badge>
            <Badge variant="outline">
              <priority.icon className={priority.className} />
              {priorityLabel[task.priority]}
            </Badge>
            {late && (
              <Badge variant="destructive">
                {t("Overdue", "समय सीमा पार")}
              </Badge>
            )}
          </div>
          <SheetTitle className="text-xl leading-snug">{task.title}</SheetTitle>
          <SheetDescription>
            {employeeName(task.employee_id)} · {t("Due", "देय")}{" "}
            {formatDateTime(task.deadline)} ({formatRelative(task.deadline)})
          </SheetDescription>
        </SheetHeader>
        <div className="grid flex-1 content-start gap-6 overflow-y-auto p-6">
          {canUpdate && (
            <div className="grid gap-2">
              <p className="text-sm font-medium">{t("Status", "स्थिति")}</p>
              <div
                role="group"
                aria-label={`Status ${task.title}`}
                className="bg-muted grid grid-cols-2 gap-1 rounded-lg p-1 sm:grid-cols-4"
              >
                {(Object.keys(statusStyle) as Status[]).map((v) => {
                  const Icon = statusStyle[v].icon;
                  return (
                    <button
                      key={v}
                      type="button"
                      disabled={busy}
                      aria-pressed={task.status === v}
                      onClick={() => void setStatus(task, v)}
                      className={cn(
                        "text-muted-foreground hover:text-foreground inline-flex h-8 items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50",
                        task.status === v &&
                          "bg-background text-foreground shadow-sm",
                      )}
                    >
                      <Icon className="size-4" />
                      {statusLabel[v]}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm [&_dd]:m-0 [&_dt]:m-0">
            <div className="grid gap-1">
              <dt className="text-muted-foreground text-xs">
                {t("Assignee", "सौंपा गया")}
              </dt>
              <dd className="font-medium">{employeeName(task.employee_id)}</dd>
            </div>
            <div className="grid gap-1">
              <dt className="text-muted-foreground text-xs">
                {t("Assigned by", "किसने सौंपा")}
              </dt>
              <dd className="font-medium">{userName(task.author_id)}</dd>
            </div>
            <div className="grid gap-1">
              <dt className="text-muted-foreground text-xs">
                {t("Deadline", "समय सीमा")}
              </dt>
              <dd className={cn("font-medium", late && "text-destructive")}>
                {formatDateTime(task.deadline)}
              </dd>
            </div>
            <div className="grid gap-1">
              <dt className="text-muted-foreground text-xs">
                {t("Created", "बनाया गया")}
              </dt>
              <dd className="font-medium">{formatDateTime(task.created_at)}</dd>
            </div>
          </dl>
          <div className="grid gap-2">
            <p className="text-sm font-medium">{t("Details", "विवरण")}</p>
            <p className="text-muted-foreground text-sm whitespace-pre-wrap">
              {task.description ||
                t("No details were added.", "कोई विवरण नहीं जोड़ा गया।")}
            </p>
          </div>
          <Separator />
          <div className="grid gap-3">
            <p className="text-sm font-medium">
              {t("Activity", "गतिविधि")}{" "}
              <span className="text-muted-foreground font-normal">
                · {thread.length}
              </span>
            </p>
            {thread.length ? (
              <ol className="grid gap-4">
                {thread.map((c) => (
                  <li key={c.id} className="flex gap-3">
                    <Avatar className="size-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-[11px]">
                        {initials(userName(c.author_id))}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid min-w-0 flex-1 gap-1">
                      <p className="text-sm">
                        <span className="font-medium">
                          {userName(c.author_id)}
                        </span>{" "}
                        <span className="text-muted-foreground text-xs">
                          {formatRelative(c.created_at)}
                        </span>
                      </p>
                      <p className="text-sm whitespace-pre-wrap">{c.body}</p>
                      {c.attachment_id && (
                        <a
                          className="bg-muted hover:bg-accent inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium"
                          href={`/files/attachments/${c.attachment_id}?siteId=${s.siteId}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Paperclip className="size-3.5" />
                          {t("Open attachment", "संलग्नक खोलें")}
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-muted-foreground text-sm">
                {t(
                  "No comments yet. Updates and attachments appear here.",
                  "अभी कोई टिप्पणी नहीं। अपडेट और संलग्नक यहाँ दिखेंगे।",
                )}
              </p>
            )}
          </div>
        </div>
        {canUpdate && (
          <SheetFooter className="border-t p-4">
            <form onSubmit={send} className="grid gap-2">
              <Textarea
                aria-label={t("Comment", "टिप्पणी")}
                placeholder={t(
                  "Write an update or question…",
                  "अपडेट या प्रश्न लिखें…",
                )}
                value={body}
                maxLength={4000}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
                    e.currentTarget.form?.requestSubmit();
                }}
                className="min-h-20"
              />
              <div className="flex items-center justify-between gap-2">
                <input
                  ref={file}
                  type="file"
                  hidden
                  accept="image/jpeg,image/png,application/pdf"
                  onChange={(e) => {
                    const picked = e.target.files?.[0];
                    if (picked) void attach(picked);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={sending}
                  onClick={() => file.current?.click()}
                >
                  <Paperclip className="size-4" />
                  {t("Attach file", "फ़ाइल जोड़ें")}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={sending || !body.trim()}
                >
                  {sending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  {t("Comment", "टिप्पणी")}
                </Button>
              </div>
            </form>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}

function AssignTaskDialog({
  open,
  onOpenChange,
  people,
  priorityLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  people: Person[];
  priorityLabel: Record<Priority, string>;
}) {
  const t = useT(),
    write = useWrite();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  // One id per open dialog: a retried submit cannot create a duplicate task.
  const [clientId, setClientId] = useState(() => crypto.randomUUID());
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setSaving(true);
    setError("");
    try {
      await write(OperateDocument, {
        operation: "task",
        input: {
          clientId,
          employeeId: f.get("employeeId"),
          title: String(f.get("title")).trim(),
          description: String(f.get("description") ?? "").trim(),
          deadline: new Date(String(f.get("deadline"))).toISOString(),
          priority: f.get("priority"),
        },
      });
      toast.success(t("Task assigned", "कार्य सौंपा गया"));
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) {
          setClientId(crypto.randomUUID());
          setError("");
        }
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("Assign task", "कार्य सौंपें")}</DialogTitle>
          <DialogDescription>
            {t(
              "The assignee is notified and can update status, comment and attach files.",
              "जिसे सौंपा गया है उसे सूचना मिलेगी और वह स्थिति, टिप्पणी और फ़ाइल जोड़ सकता है।",
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <Field label={t("Assign to", "किसे सौंपें")} htmlFor="task-employee">
            <NativeSelect
              id="task-employee"
              name="employeeId"
              required
              defaultValue=""
            >
              <option value="" disabled>
                {people.length
                  ? t("Choose a person…", "व्यक्ति चुनें…")
                  : t("No people available", "कोई व्यक्ति उपलब्ध नहीं")}
              </option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.displayName}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label={t("Title", "शीर्षक")} htmlFor="task-title">
            <Input
              id="task-title"
              name="title"
              required
              maxLength={200}
              placeholder={t(
                "e.g. Inspect the east gate pumps",
                "जैसे पूर्वी गेट के पंप जाँचें",
              )}
            />
          </Field>
          <Field
            label={t("Details", "विवरण")}
            htmlFor="task-description"
            hint={t(
              "Optional. What does done look like?",
              "वैकल्पिक। पूरा होने का मतलब क्या है?",
            )}
          >
            <Textarea
              id="task-description"
              name="description"
              maxLength={4000}
              className="min-h-24"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("Deadline", "समय सीमा")} htmlFor="task-deadline">
              <Input
                id="task-deadline"
                name="deadline"
                type="datetime-local"
                required
                defaultValue={defaultDeadline()}
              />
            </Field>
            <Field label={t("Priority", "प्राथमिकता")} htmlFor="task-priority">
              <NativeSelect
                id="task-priority"
                name="priority"
                defaultValue="normal"
              >
                {(["urgent", "high", "normal", "low"] as Priority[]).map(
                  (v) => (
                    <option key={v} value={v}>
                      {priorityLabel[v]}
                    </option>
                  ),
                )}
              </NativeSelect>
            </Field>
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
              onClick={() => onOpenChange(false)}
            >
              {t("Cancel", "रद्द करें")}
            </Button>
            <Button type="submit" disabled={saving || !people.length}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              {t("Assign task", "कार्य सौंपें")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
