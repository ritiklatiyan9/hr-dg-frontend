import { AiIcon } from "@/components/ui/ai-icon";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import {
  CheckCircle2,
  History,
  Loader2,
  MessageSquareText,
  Paperclip,
  Printer,
  Save,
  Send,
  Undo2,
  X,
} from "lucide-react";
import { DwrDocument } from "@/shared/contracts/generated";
import {
  dwrContent,
  type DwrContent,
} from "@/shared/contracts/dwr";
import { uploadEvidence } from "../api";
import { useScope, useScopedQuery } from "../workspace-context";
import { useT } from "../ui";
import { DataTable } from "../components/shared/data-table";
import { useUrlChoice } from "../hooks/use-url-choice";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { chatRead, useDwrCommand } from "./api";
import { useClock, useDayLabel } from "./format";
export const sections = [
  ["completed", "Completed work", "पूरा किया काम"],
  ["pending", "Pending work / reasons", "बाकी काम / कारण"],
  ["blockers", "Issues / blockers", "समस्याएँ / बाधाएँ"],
  ["nextDayPlan", "Next-day plan", "अगले दिन की योजना"],
  ["uncertainties", "Clarification needed", "स्पष्टीकरण"],
] as const;
type Key = (typeof sections)[number][0];
const statusVariant = (s: string) =>
  (
    ({
      approved: "success",
      submitted: "info",
      returned: "warning",
      draft: "outline",
    }) as const
  )[s as "draft"] ?? "outline";
export function useStatusLabel() {
  const t = useT();
  return (s: string) =>
    ({
      draft: t("Draft", "ड्राफ़्ट"),
      submitted: t("Submitted", "भेजी गई"),
      approved: t("Approved", "स्वीकृत"),
      returned: t("Returned", "वापस भेजी"),
    })[s] ?? s;
}
export type ReportTarget = {
  workDate: string;
  employeeId?: string;
  reportId?: string;
};
export function ReportsTab({
  data,
  open,
}: {
  data: any;
  open: (t: ReportTarget) => void;
}) {
  const t = useT(),
    s = useScope(),
    label = useStatusLabel(),
    dayLabel = useDayLabel(data.workDate);
  const [view, setView] = useUrlChoice(
    "reports",
    s.capabilities.includes("dwr_review.view") ? ["mine", "team"] : ["mine"],
    "mine",
  );
  const [status, setStatus] = useUrlChoice(
    "status",
    ["all", "draft", "submitted", "returned", "approved"],
    "all",
  );
  const [filter, setFilter] = useState(""),
    [person, setPerson] = useState(""),
    [date, setDate] = useState("");
  // The default list is the latest 100 reports; a chosen date loads every
  // visible report for that day, so older days stay reachable.
  const day = useScopedQuery<any>(
    ["dwr", "day", date],
    DwrDocument,
    { workDate: date },
    !!date,
  );
  const dayReports: any[] | undefined = date ? day.data?.dwr.reports : [];
  // ponytail: people come from reports already visible to the reviewer; a
  // person with no DWR in the latest 100 appears once a date is picked.
  const people = [
    ...new Map(
      [...(data.reports ?? []), ...(dayReports ?? [])]
        .filter((r: any) => !r.isSelf)
        .map((r: any) => [r.employee_id, r.employeeName] as const),
    ),
  ].sort((a, b) => a[1].localeCompare(b[1]));
  const byPerson = view === "team" && person;
  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        header: t("Work date", "कार्य तिथि"),
        accessorKey: "work_date",
        cell: ({ getValue }) => dayLabel(String(getValue())),
      },
      { header: t("Employee", "कर्मचारी"), accessorKey: "employeeName" },
      {
        header: t("Summary", "सारांश"),
        id: "summary",
        accessorFn: (r) =>
          r.content.completed[0] ??
          (r.content.sourceTranscript
            ? t("Chat messages", "चैट संदेश")
            : t("Draft in progress", "ड्राफ़्ट जारी")),
        cell: ({ row, getValue }) => (
          <span className="flex max-w-md items-center gap-2">
            {row.original.origin === "chat" && (
              <AiIcon
                className="text-primary size-4 shrink-0"
                aria-label={t("Prepared from chat", "चैट से तैयार")}
              />
            )}
            <span className="truncate">{String(getValue())}</span>
            <span className="text-muted-foreground shrink-0 text-xs">
              {row.original.content.completed.length} {t("done", "पूरे")} ·{" "}
              {row.original.content.pending.length} {t("pending", "बाकी")}
            </span>
          </span>
        ),
      },
      {
        header: t("Status", "स्थिति"),
        accessorKey: "status",
        cell: ({ getValue }) => (
          <Badge variant={statusVariant(String(getValue()))}>
            {label(String(getValue()))}
          </Badge>
        ),
      },
      { header: t("Revision", "संशोधन"), accessorKey: "revision" },
      {
        header: "",
        id: "open",
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              open({
                workDate: row.original.work_date,
                reportId: row.original.id,
              })
            }
          >
            {t("Open", "खोलें")}
          </Button>
        ),
      },
    ],
    [t, label, dayLabel, open],
  );
  const rows = ((date ? dayReports : data.reports) ?? []).filter(
    (r: any) =>
      (view === "mine" ? r.isSelf : !r.isSelf) &&
      (!byPerson || r.employee_id === person) &&
      (status === "all" || r.status === status) &&
      `${r.employeeName} ${r.work_date}`
        .toLowerCase()
        .includes(filter.trim().toLowerCase()),
  );
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-end gap-2">
        {s.capabilities.includes("dwr_review.view") && (
          <div
            role="group"
            aria-label={t("Report scope", "रिपोर्ट दायरा")}
            className="flex gap-1"
          >
            <Button
              size="sm"
              variant={view === "mine" ? "default" : "outline"}
              onClick={() => setView("mine")}
            >
              {t("My reports", "मेरी रिपोर्ट")}
            </Button>
            <Button
              size="sm"
              variant={view === "team" ? "default" : "outline"}
              onClick={() => setView("team")}
            >
              {t("Team & review", "टीम और समीक्षा")}
            </Button>
          </div>
        )}
        <Input
          aria-label="Search DWR"
          className="h-8 max-w-64"
          placeholder={t("Search name or date", "नाम या तिथि खोजें")}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        {view === "team" && (
          <NativeSelect
            aria-label="DWR person"
            className="h-8 w-48 text-xs"
            value={person}
            onChange={(e) => setPerson(e.target.value)}
          >
            <option value="">{t("Everyone", "सभी लोग")}</option>
            {people.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </NativeSelect>
        )}
        <div className="flex items-center gap-1">
          <Input
            aria-label="DWR date"
            type="date"
            className="h-8 w-40 text-xs"
            max={data.workDate}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          {date && (
            <Button
              size="sm"
              variant="ghost"
              aria-label={t("Clear date", "तिथि हटाएँ")}
              onClick={() => setDate("")}
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
        <NativeSelect
          aria-label="DWR status"
          className="h-8 w-40 text-xs"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {["all", "draft", "submitted", "returned", "approved"].map((v) => (
            <option key={v} value={v}>
              {v === "all" ? t("All statuses", "सभी स्थितियाँ") : label(v)}
            </option>
          ))}
        </NativeSelect>
      </div>
      {date && day.error ? (
        <Alert variant="destructive">
          <AlertDescription>{day.error.message}</AlertDescription>
        </Alert>
      ) : !dayReports ? (
        <Skeleton className="h-32" />
      ) : rows.length ? (
        <DataTable
          data={rows}
          columns={columns}
          getRowId={(r: any) => r.id}
          label={t("Daily reports", "दैनिक रिपोर्ट")}
        />
      ) : (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          {byPerson && date
            ? t(
                `No DWR from ${people.find(([id]) => id === person)?.[1] ?? "this person"} on ${dayLabel(date)}.`,
                `${dayLabel(date)} को ${people.find(([id]) => id === person)?.[1] ?? "इस व्यक्ति"} की कोई DWR नहीं।`,
              )
            : date
              ? t(
                  `No DWR matches ${dayLabel(date)}.`,
                  `${dayLabel(date)} की कोई DWR नहीं मिली।`,
                )
              : view === "team"
                ? t(
                    "No team reports match. Chat-prepared drafts appear here before employees submit them.",
                    "कोई टीम रिपोर्ट नहीं। कर्मचारियों के भेजने से पहले चैट से बने ड्राफ़्ट यहाँ दिखते हैं।",
                  )
                : t(
                    "Your DWRs appear here once they are prepared from your chat.",
                    "आपकी DWR चैट से तैयार होते ही यहाँ दिखेंगी।",
                  )}
        </p>
      )}
    </div>
  );
}
/** One DWR: sections, the day's chat sources, submission, review and history. */
export function ReportDialog({
  target,
  onClose,
}: {
  target: ReportTarget | null;
  onClose: () => void;
}) {
  const t = useT();
  const q = useScopedQuery<any>(
    ["dwr", "day", target?.workDate],
    DwrDocument,
    { workDate: target?.workDate },
    !!target,
  );
  const report = q.data?.dwr.reports.find((r: any) =>
    target?.reportId
      ? r.id === target.reportId
      : target?.employeeId
        ? r.employee_id === target.employeeId
        : r.isSelf,
  );
  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="gap-0 p-0 sm:max-w-3xl">
        {!q.data ? (
          <div className="space-y-3 p-6">
            <DialogTitle>
              {t("Daily work report", "दैनिक कार्य रिपोर्ट")}
            </DialogTitle>
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-40" />
          </div>
        ) : report ? (
          <ReportBody
            key={`${report.id}:${report.version}`}
            report={report}
            data={q.data.dwr}
            onDone={() => void q.refetch()}
          />
        ) : (
          <div className="p-6">
            <DialogHeader>
              <DialogTitle>{t("No DWR yet", "अभी कोई DWR नहीं")}</DialogTitle>
              <DialogDescription>
                {t(
                  "A DWR appears after it is prepared from the day's chat messages.",
                  "दिन के चैट संदेशों से तैयार होने के बाद DWR दिखेगी।",
                )}
              </DialogDescription>
            </DialogHeader>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
function ReportBody({
  report,
  data,
  onDone,
}: {
  report: any;
  data: any;
  onDone: () => void;
}) {
  const t = useT(),
    s = useScope(),
    command = useDwrCommand(),
    label = useStatusLabel(),
    dayLabel = useDayLabel(data.workDate),
    clock = useClock(data.site.timezone),
    [r, setR] = useState(report),
    [content, setContent] = useState<DwrContent>(report.content),
    [attachments, setAttachments] = useState<string[]>(
      report.attachments ?? [],
    ),
    [note, setNote] = useState(""),
    [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState(false),
    [showHistory, setShowHistory] = useState(false),
    [sources, setSources] = useState<any[] | null>(null),
    pending = useRef<{ signature: string; clientId: string } | null>(null),
    submitting = useRef<any>(null);
  const editable =
    r.isSelf &&
    ["draft", "returned"].includes(r.status) &&
    s.capabilities.includes("my_dwr.edit");
  const dirty = JSON.stringify(content) !== JSON.stringify(r.content);
  useEffect(() => {
    void chatRead<any>(s, {
      view: "day",
      employeeId: r.employee_id,
      workDate: r.work_date,
    })
      .then((d) => setSources(d.messages))
      .catch(() => setSources([]));
  }, [r.employee_id, r.work_date]);
  // Retries of the same payload reuse one client ID, so a lost response never duplicates a write.
  async function run<T>(operation: string, input: object): Promise<T> {
    const signature = JSON.stringify({ operation, input });
    if (pending.current?.signature !== signature)
      pending.current = { signature, clientId: crypto.randomUUID() };
    const result = await command<T>(operation, {
      ...input,
      clientId: pending.current.clientId,
    });
    pending.current = null;
    return result;
  }
  async function guarded(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    const clean = dwrContent.parse({
      ...content,
      ...Object.fromEntries(
        sections.map(([k]) => [
          k,
          content[k].map((v) => v.trim()).filter(Boolean),
        ]),
      ),
    });
    const result = await run<any>("save", {
      expectedVersion: r.version,
      workDate: r.work_date,
      content: clean,
      attachments,
    });
    const next = { ...r, ...result, content: clean, attachments };
    setR(next);
    setContent(clean);
    return next;
  }
  const lines = (key: Key) => content[key];
  const setLines = (key: Key, text: string) => {
    const items = text.split("\n");
    setContent((c) => ({
      ...c,
      [key]: items,
      ...(key === "pending" || key === "blockers" || key === "nextDayPlan"
        ? {
            stated: {
              ...c.stated,
              [key]: items.some((v) => v.trim())
                ? "reported"
                : c.stated[key] === "none"
                  ? "none"
                  : "not_stated",
            },
          }
        : {}),
    }));
  };
  return (
    <>
      <div className="border-b p-6 pb-4">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {r.isSelf ? t("My DWR", "मेरी DWR") : r.employeeName}
            <span className="text-muted-foreground text-sm font-normal">
              · {dayLabel(r.work_date)}
            </span>
            <Badge variant={statusVariant(r.status)}>{label(r.status)}</Badge>
            {r.origin === "chat" && (
              <Badge variant="secondary">
                <AiIcon /> {t("From chat", "चैट से")}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {t(
              "Employee-reported claims. Approval acknowledges review; it does not verify achievements or authorize payroll.",
              "कर्मचारी द्वारा दिए विवरण। स्वीकृति केवल समीक्षा दर्शाती है; उपलब्धि या वेतन का प्रमाण नहीं।",
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-3 text-xs">
          <span>
            {t("Revision", "संशोधन")} {r.revision}
          </span>
          <a
            className="inline-flex items-center gap-1 underline-offset-2 hover:underline"
            href={`/dwr/${r.id}/print?siteId=${s.siteId}`}
            target="_blank"
            rel="noreferrer"
          >
            <Printer className="size-3.5" /> {t("Print", "प्रिंट")}
          </a>
          <button
            type="button"
            className="inline-flex items-center gap-1 underline-offset-2 hover:underline"
            onClick={() => setShowHistory((v) => !v)}
          >
            <History className="size-3.5" /> {t("History", "इतिहास")}
          </button>
        </div>
        {r.status === "draft" && !r.isSelf && (
          <Alert className="mt-3">
            <AlertDescription>
              {t(
                "Prepared from the employee's chat and not yet submitted by them. Review opens after submission.",
                "कर्मचारी की चैट से तैयार, अभी उन्होंने भेजी नहीं है। भेजने के बाद समीक्षा होगी।",
              )}
            </AlertDescription>
          </Alert>
        )}
        {r.status === "returned" && (
          <Alert variant="warning" className="mt-3">
            <Undo2 />
            <AlertDescription>
              {(r.history ?? []).find((h: any) => h.event === "return")?.reason}
            </AlertDescription>
          </Alert>
        )}
      </div>
      <div className="grid max-h-[62dvh] gap-5 overflow-y-auto p-6">
        {sections.map(([key, en, hi]) =>
          editable ? (
            <div key={key} className="grid gap-1.5">
              <Label htmlFor={`dwr-${key}`}>{t(en, hi)}</Label>
              <Textarea
                id={`dwr-${key}`}
                aria-label={en}
                rows={key === "completed" ? 4 : 2}
                disabled={busy}
                value={lines(key).join("\n")}
                placeholder={t(
                  "One item per line; leave empty if not stated",
                  "हर पंक्ति में एक बात; नहीं बताया तो खाली रखें",
                )}
                onChange={(e) => setLines(key, e.target.value)}
              />
              {(key === "pending" ||
                key === "blockers" ||
                key === "nextDayPlan") &&
                !lines(key).some((v) => v.trim()) && (
                  <label className="text-muted-foreground flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={content.stated[key] === "none"}
                      onChange={(e) =>
                        setContent((c) => ({
                          ...c,
                          stated: {
                            ...c.stated,
                            [key]: e.target.checked ? "none" : "not_stated",
                          },
                        }))
                      }
                    />
                    {t(
                      "Explicitly nothing to report",
                      "स्पष्ट रूप से कुछ नहीं",
                    )}
                  </label>
                )}
            </div>
          ) : (
            <section key={key} className="grid gap-1.5">
              <h3 className="text-sm font-semibold">{t(en, hi)}</h3>
              {r.content[key].length ? (
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {r.content[key].map((v: string, i: number) => (
                    <li key={i} className="break-words">
                      {v}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm italic">
                  {(key === "pending" ||
                    key === "blockers" ||
                    key === "nextDayPlan") &&
                  r.content.stated?.[key] === "none"
                    ? t("Explicitly none", "स्पष्ट रूप से कुछ नहीं")
                    : t("Not stated", "नहीं बताया")}
                </p>
              )}
            </section>
          ),
        )}
        <Separator />
        <section className="grid gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <MessageSquareText className="size-4" />
            {t("Chat messages for this day", "इस दिन के चैट संदेश")}
          </h3>
          {sources === null ? (
            <Skeleton className="h-16" />
          ) : sources.length ? (
            <ol className="bg-muted/40 grid gap-2 rounded-lg border p-3">
              {sources.map((m) => (
                <li key={m.id} className="text-sm">
                  <span className="text-muted-foreground mr-2 text-xs tabular-nums">
                    {clock(m.createdAt)}
                    {m.groupId
                      ? ` · ${m.groupName ?? t("Group", "समूह")}`
                      : ` · ${t("Agent chat", "एजेंट चैट")}`}
                    {m.editedAt ? ` · ${t("edited", "संपादित")}` : ""}
                  </span>
                  <span className="break-words whitespace-pre-wrap">
                    {m.body}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-muted-foreground text-sm">
              {t(
                "No chat messages are visible for this day.",
                "इस दिन के कोई चैट संदेश नहीं दिखे।",
              )}
            </p>
          )}
        </section>
        <section className="grid gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Paperclip className="size-4" /> {t("Attachments", "संलग्नक")}
          </h3>
          {attachments.map((id, i) => (
            <div key={id} className="flex items-center gap-2 text-sm">
              <a
                className="underline-offset-2 hover:underline"
                href={`/files/attachments/${id}?siteId=${s.siteId}`}
                target="_blank"
                rel="noreferrer"
              >
                {t("Attachment", "संलग्नक")} {i + 1}
              </a>
              {editable && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setAttachments((a) => a.filter((x) => x !== id))
                  }
                >
                  {t("Remove", "हटाएँ")}
                </Button>
              )}
            </div>
          ))}
          {!attachments.length && (
            <p className="text-muted-foreground text-sm">
              {t("No attachments.", "कोई संलग्नक नहीं।")}
            </p>
          )}
          {editable && (
            <Input
              aria-label="DWR attachment"
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file)
                  void guarded(async () => {
                    const saved = await save();
                    const intent = await run<any>("fileIntent", {
                      id: saved.id,
                      type: file.type,
                      bytes: file.size,
                    });
                    const uploaded = await uploadEvidence(
                      s.siteId,
                      intent.id,
                      file,
                    );
                    if (uploaded.status !== "ready")
                      throw Error(
                        t(
                          "Attachment remains quarantined or rejected.",
                          "संलग्नक क्वारंटीन या अस्वीकृत है।",
                        ),
                      );
                    setAttachments((a) => [...a, intent.id]);
                  });
              }}
            />
          )}
        </section>
        {(!r.isSelf && r.status === "submitted") ||
        (r.isSelf && r.status === "approved" && data.settings?.amendments) ? (
          <div className="grid gap-1.5">
            <Label htmlFor="dwr-note">
              {r.isSelf
                ? t("Reason for amendment", "संशोधन का कारण")
                : t("Reason for your decision", "निर्णय का कारण")}
            </Label>
            <Textarea
              id="dwr-note"
              value={note}
              minLength={8}
              maxLength={1000}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("At least 8 characters", "कम से कम 8 अक्षर")}
            />
          </div>
        ) : null}
        {showHistory && (
          <ol className="grid gap-2 border-l pl-4">
            {(r.history ?? []).map((h: any) => (
              <li key={h.version} className="text-sm">
                <span className="font-medium">
                  {h.event} · v{h.version}
                </span>{" "}
                <span className="text-muted-foreground text-xs">
                  {new Date(h.created_at).toLocaleString()}
                </span>
                {h.reason && (
                  <p className="text-muted-foreground">{h.reason}</p>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
      <DialogFooter className="border-t p-4">
        {editable && (
          <>
            <Button
              variant="outline"
              disabled={busy || !dirty}
              onClick={() =>
                void guarded(async () => {
                  await save();
                  toast.success(t("Draft saved", "ड्राफ़्ट सहेजा"));
                })
              }
            >
              <Save className="size-4" />
              {t("Save changes", "बदलाव सहेजें")}
            </Button>
            <Button
              disabled={busy || !s.capabilities.includes("my_dwr.submit")}
              onClick={() => setConfirm(true)}
            >
              <Send className="size-4" />
              {t("Submit DWR", "DWR भेजें")}
            </Button>
          </>
        )}
        {r.isSelf && r.status === "approved" && data.settings?.amendments && (
          <Button
            variant="outline"
            disabled={busy || note.trim().length < 8}
            onClick={() =>
              void guarded(async () => {
                setR({
                  ...r,
                  ...(await run<{
                    id: string;
                    version: number;
                    status: string;
                  }>("amend", {
                    id: r.id,
                    expectedVersion: r.version,
                    reason: note,
                  })),
                });
                onDone();
              })
            }
          >
            {t("Start amendment", "संशोधन शुरू करें")}
          </Button>
        )}
        {!r.isSelf &&
          r.status === "submitted" &&
          (["comment", "return", "approve"] as const)
            .filter((d) =>
              (r.actions ?? s.capabilities).includes(
                d === "approve" ? "dwr_review.approve" : "dwr_review.review",
              ),
            )
            .map((decision) => (
              <Button
                key={decision}
                variant={decision === "approve" ? "default" : "outline"}
                disabled={busy || note.trim().length < 8}
                onClick={() =>
                  void guarded(async () => {
                    setR({
                      ...r,
                      ...(await run<{
                        id: string;
                        version: number;
                        status: string;
                      }>("review", {
                        id: r.id,
                        expectedVersion: r.version,
                        decision,
                        reason: note,
                      })),
                    });
                    toast.success(t("Decision recorded", "निर्णय दर्ज हुआ"));
                    onDone();
                  })
                }
              >
                {decision === "approve"
                  ? t("Approve", "स्वीकारें")
                  : decision === "return"
                    ? t("Send back", "वापस भेजें")
                    : t("Comment", "टिप्पणी")}
              </Button>
            ))}
      </DialogFooter>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Submit this DWR?", "यह DWR भेजें?")}</DialogTitle>
            <DialogDescription>
              {t(
                "I reviewed these employee-reported details. After submission, the day's messages are locked unless the report is sent back or amended.",
                "मैंने ये विवरण जाँच लिए हैं। भेजने के बाद, रिपोर्ट वापस या संशोधित होने तक उस दिन के संदेश लॉक रहेंगे।",
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(false)}>
              {t("Keep editing", "संपादन जारी रखें")}
            </Button>
            <Button
              disabled={busy}
              onClick={() =>
                void guarded(async () => {
                  if (!submitting.current) {
                    const saved = dirty ? await save() : r;
                    submitting.current = {
                      id: saved.id,
                      expectedVersion: saved.version,
                      confirmed: true,
                    };
                  }
                  const receipt = await run<any>("submit", submitting.current);
                  submitting.current = null;
                  setR((old: any) => ({ ...old, ...receipt }));
                  setConfirm(false);
                  toast.success(
                    t("DWR submitted for review", "DWR समीक्षा के लिए भेजी गई"),
                  );
                  onDone();
                })
              }
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              {t("Confirm submission", "भेजने की पुष्टि करें")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
