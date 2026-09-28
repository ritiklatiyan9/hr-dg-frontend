import { PageSkeleton } from "./ui";
import { DataTable } from "./components/shared/data-table";
import { useEffect, useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Link, useNavigate } from "react-router-dom";
import { lazy, Suspense, useState } from "react";
import {
  ArrowUpRight,
  Camera,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  AttendanceReviewDocument,
  OperationsDocument,
  OperateDocument,
  EmployeesDocument,
  FoundationDocument,
} from "../../../packages/contracts/src/generated";
import { useScope, useScopedQuery, useWrite } from "./workspace-context";
import {
  Badge,
  Empty,
  ErrorState,
  Heading,
  humanize,
  Dialog as Modal,
  Notice,
  Skeleton,
  Tabs,
  useT,
} from "./ui";
import { Button } from "./components/ui/button";
import { Calendar } from "./components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./components/ui/popover";
import { uploadEvidence } from "./api";
import { verifiedInside } from "./attendance-location";
import { AttendanceRecordsDesk } from "./attendance-records";
import { DutySchedule } from "./duty-schedule";
import { formatDateTime } from "./components/shared/formatting";
type Row = Record<string, any>;
type Snapshot = {
  me: string | null;
  approvers: Row[];
  serverTime: string;
  policy: Row | null;
  geofence: Row | null;
  sessions: Row[];
  events: Row[];
  adjustments: Row[];
  rosters: Row[];
  visits: Row[];
  leaveTypes: Row[];
  leaveRequests: Row[];
  balances: Row[];
  ledger: Row[];
  tasks: Row[];
  comments: Row[];
  inbox: Row[];
  files: Row[];
};
type Field = {
  key: string;
  label: string;
  type?: string;
  options?: { id: string; name: string }[];
  value?: any;
  min?: number;
  max?: number;
};
const emptySnapshot: Snapshot = {
  me: null,
  approvers: [],
  serverTime: "",
  policy: null,
  geofence: null,
  sessions: [],
  events: [],
  adjustments: [],
  rosters: [],
  visits: [],
  leaveTypes: [],
  leaveRequests: [],
  balances: [],
  ledger: [],
  tasks: [],
  comments: [],
  inbox: [],
  files: [],
};
const GeofencePicker = lazy(() => import("./geofence-picker"));
const id = () => crypto.randomUUID(),
  fmt = (date: any) => formatDateTime(date);
const eventLabel = (kind: string) =>
  ({
    IN: "Check-in",
    OUT: "Check-out",
    BREAK_START: "Break started",
    BREAK_END: "Break ended",
    FIELD_START: "Field work started",
    FIELD_END: "Field work ended",
  })[kind] ?? kind.replaceAll("_", " ").toLowerCase();
const reviewReason = (reason: string | null) => {
  if (!reason) return "This entry needs a decision before it counts.";
  if (/out-of-order sequence/i.test(reason))
    return "This entry arrived before earlier entries were confirmed. Review the entries in order.";
  if (/invalid event order or duplicate tap/i.test(reason))
    return "This entry may be out of order or a duplicate. Check the earlier entries.";
  if (/outside or unverified/i.test(reason))
    return "The location was outside the site or could not be verified.";
  return reason;
};
const localDateTime = (date: string) => {
  const value = new Date(date);
  return new Date(value.getTime() - value.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};
const attendancePhotoUrl = (siteId: string, photoId: string) =>
  `/files/attachments/${encodeURIComponent(photoId)}?siteId=${encodeURIComponent(siteId)}&preview=1`;
function AttendancePhotoEvidence({
  siteId,
  photoId,
  label,
  onPreview,
}: {
  siteId: string;
  photoId: string | null;
  label: string;
  onPreview: (photoId: string, label: string) => void;
}) {
  const [failed, setFailed] = useState(false);
  if (!photoId)
    return <p className="attendance-review-photo-empty">No photo attached</p>;
  if (failed)
    return (
      <p className="attendance-review-photo-empty">
        Photo preview unavailable. Refresh the requests and try again.
      </p>
    );
  return (
    <button
      type="button"
      className="attendance-review-photo"
      onClick={() => onPreview(photoId, label)}
      aria-label={`Enlarge photo evidence for ${label}`}
    >
      <img
        src={attendancePhotoUrl(siteId, photoId)}
        alt={`Attendance photo for ${label}`}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
      <span>
        <Camera size={15} aria-hidden="true" /> View larger photo
      </span>
    </button>
  );
}
type ReviewDay = {
  workDate: string;
  timezone: string;
  approverId: string | null;
  canDecide: boolean;
  reviewers: Record<string, string>;
  events: Row[];
  adjustments: Row[];
  truncated: boolean;
};
type ReviewItem = {
  id: string;
  kind: "event" | "adjustment";
  row: Row;
  at: string;
  employee: string;
  title: string;
  pending: boolean;
};
const calendarDate = (day: string) => {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year, month - 1, date, 12);
};
const dateKey = (day: Date) =>
  `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
const reviewStatus = (item: ReviewItem) => {
  if (item.pending) return "Awaiting review";
  if (item.row.status === "rejected") return "Rejected";
  return item.row.reviewer_id ? "Approved" : "Auto verified";
};
const shiftDay = (day: string, delta: number) => {
  const next = calendarDate(day);
  next.setDate(next.getDate() + delta);
  return dateKey(next);
};
const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
const reviewTone = (item: ReviewItem) =>
  item.pending
    ? "warning"
    : item.row.status === "rejected"
      ? "danger"
      : item.row.reviewer_id
        ? "success"
        : "neutral";
const locationLabel = (row: Row) =>
  row.classification === "inside"
    ? { text: "Inside site", tone: "success" }
    : row.classification === "outside"
      ? { text: "Outside site", tone: "danger" }
      : { text: "Unverified", tone: "warning" };
function AttendanceReviewDesk({
  siteId,
  today,
  day,
  onDayChange,
  review,
  loading,
  fetching,
  error,
  refresh,
  filter,
  onFilter,
  selectedId,
  onSelect,
  onDecision,
  onPreview,
  actorId,
}: {
  siteId: string;
  today: string;
  day: string;
  onDayChange: (day: string) => void;
  review: ReviewDay | null;
  loading: boolean;
  fetching: boolean;
  error: Error | null;
  refresh: () => void;
  filter: "pending" | "reviewed";
  onFilter: (filter: "pending" | "reviewed") => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDecision: (
    kind: "event" | "adjustment",
    row: Row,
    decision: "accept" | "reject",
  ) => void;
  onPreview: (photoId: string, label: string) => void;
  actorId: string;
}) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const timeZone = review?.timezone;
  const time = new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  });
  const stamp = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  });
  const at = (value: string | null | undefined) =>
    value ? stamp.format(new Date(value)) : "—";
  const items: ReviewItem[] = review
    ? [
        ...review.events.map((row) => ({
          id: `event:${row.id}`,
          kind: "event" as const,
          row,
          at: row.captured_at,
          employee: row.employee_name,
          title: eventLabel(row.kind),
          pending: row.status === "pending_verification",
        })),
        ...review.adjustments.map((row) => ({
          id: `adjustment:${row.id}`,
          kind: "adjustment" as const,
          row,
          at: row.starts_at,
          employee: row.employee_name,
          title: `${humanize(String(row.kind))} correction`,
          pending: row.status === "pending",
        })),
      ].sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id))
    : [];
  const pending = items.filter((item) => item.pending);
  const reviewed = items.filter((item) => !item.pending).reverse();
  const query = search.trim().toLowerCase();
  const visible = (filter === "pending" ? pending : reviewed).filter(
    (item) =>
      !query ||
      item.employee.toLowerCase().includes(query) ||
      item.title.toLowerCase().includes(query),
  );
  const active = visible.find((item) => item.id === selectedId) ?? visible[0];
  const approvedCount = reviewed.filter(
    (item) => item.row.status !== "rejected" && item.row.reviewer_id,
  ).length;
  const rejectedCount = reviewed.filter(
    (item) => item.row.status === "rejected",
  ).length;
  const autoCount = reviewed.length - approvedCount - rejectedCount;
  const approverName = review?.approverId
    ? (review.reviewers[review.approverId] ?? "Assigned approver")
    : null;
  const reviewerName = (item: ReviewItem) =>
    item.row.reviewer_id
      ? (review?.reviewers[item.row.reviewer_id] ?? "Authorized reviewer")
      : null;
  const dayLabel = new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(calendarDate(day));
  const activeReviewer = active ? reviewerName(active) : null;
  const ownRequest =
    active?.kind === "event"
      ? active.row.user_id === actorId
      : active?.row.requester_id === actorId;
  const overriding = !!review?.canDecide && review.approverId !== actorId;
  const moveSelection = (delta: number) => {
    const index = visible.findIndex((item) => item.id === active?.id);
    const next = visible[index + delta];
    if (!next) return;
    onSelect(next.id);
    document
      .querySelector<HTMLElement>(`[data-review-row="${CSS.escape(next.id)}"]`)
      ?.focus();
  };
  return (
    <section className="review-desk" aria-label="Attendance approvals">
      <header className="rd-header">
        <div className="rd-title">
          <span className="rd-crumb">Attendance / Approvals</span>
          <h1>Attendance approvals</h1>
          <p>
            Daily review queue
            {timeZone ? ` · Times in ${timeZone.replace("_", " ")}` : ""}
          </p>
        </div>
        <div className="rd-datebar" role="group" aria-label="Review day">
          <div className="rd-stepper">
            <button
              type="button"
              aria-label="Previous day"
              onClick={() => onDayChange(shiftDay(day, -1))}
            >
              <ChevronLeft size={16} />
            </button>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="rd-date"
                  aria-label={`Choose review date. Selected ${dayLabel}`}
                >
                  <CalendarDays size={15} aria-hidden="true" />
                  <span>{dayLabel}</span>
                  <ChevronDown size={14} aria-hidden="true" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={calendarDate(day)}
                  defaultMonth={calendarDate(day)}
                  disabled={{ after: calendarDate(today) }}
                  onSelect={(selected) => {
                    if (!selected) return;
                    onDayChange(dateKey(selected));
                    setCalendarOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
            <button
              type="button"
              aria-label="Next day"
              disabled={day >= today}
              onClick={() => onDayChange(shiftDay(day, 1))}
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={day === today}
            onClick={() => onDayChange(today)}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Refresh attendance reviews"
            onClick={refresh}
          >
            <RefreshCw size={15} className={fetching ? "animate-spin" : ""} />
          </Button>
        </div>
      </header>
      <div className="rd-kpis" aria-label="Daily review totals">
        {[
          ["Awaiting decision", pending.length, "warning"],
          ["Approved", approvedCount, "success"],
          ["Rejected", rejectedCount, "danger"],
          ["Auto-verified", autoCount, "neutral"],
        ].map(([label, value, tone]) => (
          <div className="rd-kpi" key={label}>
            <span className="rd-kpi-label">
              <i data-tone={tone} aria-hidden="true" />
              {label}
            </span>
            <strong>{review ? value : "–"}</strong>
          </div>
        ))}
        <div className="rd-authority">
          <ShieldCheck size={18} aria-hidden="true" />
          <div>
            <strong>
              {approverName
                ? `Assigned approver: ${approverName}`
                : "No approver assigned"}
            </strong>
            <span>Super admins and admins of this site can also decide.</span>
          </div>
          <span
            className="rd-pill"
            data-tone={review?.canDecide ? "success" : "neutral"}
          >
            {review?.canDecide
              ? overriding
                ? "You can decide · admin"
                : "You can decide"
              : "View only"}
          </span>
        </div>
      </div>
      {review?.truncated && (
        <Notice>
          This day has more than 1,000 records. Contact your administrator for
          the complete review export.
        </Notice>
      )}
      {error && <ErrorState error={error} retry={refresh} />}
      {!error && (
        <div className="rd-workspace">
          <div className="rd-queue">
            <div className="rd-toolbar">
              <div
                className="rd-segment"
                role="tablist"
                aria-label="Review status"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={filter === "pending"}
                  onClick={() => onFilter("pending")}
                >
                  To review <span>{pending.length}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={filter === "reviewed"}
                  onClick={() => onFilter("reviewed")}
                >
                  Reviewed <span>{reviewed.length}</span>
                </button>
              </div>
              <label className="rd-search">
                <Search size={14} aria-hidden="true" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search employee or entry"
                  aria-label="Search requests"
                />
              </label>
            </div>
            <div className="rd-table-wrap">
              <table className="rd-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Time</th>
                    <th className="rd-col-location">Location</th>
                    <th>{filter === "pending" ? "Status" : "Decision"}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && !review
                    ? [0, 1, 2, 3, 4, 5].map((i) => (
                        <tr key={i} className="rd-skeleton-row">
                          <td colSpan={4}>
                            <span />
                          </td>
                        </tr>
                      ))
                    : visible.map((item) => {
                        const place =
                          item.kind === "event"
                            ? locationLabel(item.row)
                            : null;
                        return (
                          <tr
                            key={item.id}
                            data-review-row={item.id}
                            aria-selected={active?.id === item.id}
                            tabIndex={0}
                            onClick={() => onSelect(item.id)}
                            onKeyDown={(e) => {
                              if (
                                e.key === "ArrowDown" ||
                                e.key === "ArrowUp"
                              ) {
                                e.preventDefault();
                                moveSelection(e.key === "ArrowDown" ? 1 : -1);
                              } else if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                onSelect(item.id);
                              }
                            }}
                          >
                            <td>
                              <div className="rd-person">
                                <span className="rd-avatar" aria-hidden="true">
                                  {initials(item.employee)}
                                </span>
                                <span>
                                  <strong>{item.employee}</strong>
                                  <small>
                                    {item.title}
                                    {item.kind === "event" &&
                                      ` · Entry ${item.row.sequence}`}
                                  </small>
                                </span>
                              </div>
                            </td>
                            <td className="rd-mono">
                              {time.format(new Date(item.at))}
                            </td>
                            <td className="rd-col-location">
                              {place ? (
                                <span className="rd-loc" data-tone={place.tone}>
                                  {place.text}
                                </span>
                              ) : (
                                <span className="rd-muted">—</span>
                              )}
                            </td>
                            <td>
                              <span
                                className="rd-pill"
                                data-tone={reviewTone(item)}
                              >
                                {reviewStatus(item)}
                              </span>
                              {reviewerName(item) && (
                                <small className="rd-by">
                                  by {reviewerName(item)}
                                </small>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                </tbody>
              </table>
              {review && visible.length === 0 && (
                <div className="rd-empty">
                  <ShieldCheck size={22} aria-hidden="true" />
                  <strong>
                    {query
                      ? "No matching requests"
                      : filter === "pending"
                        ? "All caught up for this day"
                        : "No decisions recorded"}
                  </strong>
                  <span>
                    {query
                      ? "Try a different name or entry type."
                      : filter === "pending"
                        ? "Use the date controls to review another day."
                        : "Decisions for this day will appear here."}
                  </span>
                </div>
              )}
            </div>
          </div>
          <aside className="rd-inspector" aria-label="Request details">
            {active ? (
              <>
                <div className="rd-inspector-head">
                  <span className="rd-avatar rd-avatar-lg" aria-hidden="true">
                    {initials(active.employee)}
                  </span>
                  <div>
                    <h2>{active.employee}</h2>
                    <p>
                      {active.title} ·{" "}
                      {active.kind === "event"
                        ? `Entry ${active.row.sequence}`
                        : "Correction request"}
                    </p>
                  </div>
                  <span className="rd-pill" data-tone={reviewTone(active)}>
                    {reviewStatus(active)}
                  </span>
                </div>
                <div className="rd-inspector-body">
                  <section>
                    <h3>Evidence</h3>
                    <dl className="rd-facts">
                      {active.kind === "event" ? (
                        <>
                          <div>
                            <dt>Captured</dt>
                            <dd>{at(active.row.captured_at)}</dd>
                          </div>
                          <div>
                            <dt>Received</dt>
                            <dd>{at(active.row.received_at)}</dd>
                          </div>
                          <div>
                            <dt>Location</dt>
                            <dd>
                              <span
                                className="rd-loc"
                                data-tone={locationLabel(active.row).tone}
                              >
                                {locationLabel(active.row).text}
                              </span>
                            </dd>
                          </div>
                          <div>
                            <dt>GPS accuracy</dt>
                            <dd>
                              {active.row.accuracy_m != null
                                ? `± ${Math.round(active.row.accuracy_m)} m`
                                : "—"}
                            </dd>
                          </div>
                          {active.pending && (
                            <div className="rd-span">
                              <dt>Why review is needed</dt>
                              <dd>{reviewReason(active.row.reason)}</dd>
                            </div>
                          )}
                          {active.row.offsite_reason && (
                            <div className="rd-span">
                              <dt>Employee explanation</dt>
                              <dd>{active.row.offsite_reason}</dd>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div>
                            <dt>From</dt>
                            <dd>{at(active.row.starts_at)}</dd>
                          </div>
                          <div>
                            <dt>To</dt>
                            <dd>{at(active.row.ends_at)}</dd>
                          </div>
                          <div className="rd-span">
                            <dt>Employee explanation</dt>
                            <dd>{active.row.reason}</dd>
                          </div>
                        </>
                      )}
                    </dl>
                  </section>
                  {active.kind === "event" && (
                    <section className="review-desk-photo">
                      <h3>Photo</h3>
                      <AttendancePhotoEvidence
                        siteId={siteId}
                        photoId={active.row.photo_id}
                        label={`${active.employee} · ${active.title}`}
                        onPreview={onPreview}
                      />
                    </section>
                  )}
                  <section>
                    <h3>Activity</h3>
                    <ol className="rd-timeline">
                      <li>
                        <strong>
                          {active.kind === "event"
                            ? `${active.title} captured`
                            : "Correction requested"}
                        </strong>
                        <span>
                          {active.employee} ·{" "}
                          {at(
                            active.kind === "event"
                              ? active.row.captured_at
                              : active.row.starts_at,
                          )}
                        </span>
                      </li>
                      {active.pending ? (
                        <li data-tone="warning">
                          <strong>Awaiting decision</strong>
                          <span>
                            {approverName ?? "An authorized reviewer"} or a site
                            admin
                          </span>
                        </li>
                      ) : (
                        <li data-tone={reviewTone(active)}>
                          <strong>
                            {activeReviewer
                              ? `${reviewStatus(active)} by ${activeReviewer}`
                              : "Automatically verified"}
                          </strong>
                          <span>
                            {activeReviewer &&
                            active.row.reviewer_id === review?.approverId
                              ? "Assigned approver · "
                              : activeReviewer
                                ? "Authorized reviewer · "
                                : "System · "}
                            {at(
                              active.row.reviewed_at ?? active.row.effective_at,
                            )}
                          </span>
                          {activeReviewer &&
                            (active.kind === "event"
                              ? active.row.reason
                              : active.row.decision_note) && (
                              <p>
                                “
                                {active.kind === "event"
                                  ? active.row.reason
                                  : active.row.decision_note}
                                ”
                              </p>
                            )}
                        </li>
                      )}
                    </ol>
                  </section>
                </div>
                {active.pending && (
                  <div className="rd-actions">
                    {active.row.can_decide ? (
                      <>
                        <span>
                          {overriding
                            ? "Deciding as site admin"
                            : "Deciding as assigned approver"}
                        </span>
                        <Button
                          variant="outline"
                          className="rd-reject"
                          onClick={() =>
                            onDecision(active.kind, active.row, "reject")
                          }
                        >
                          <X size={15} /> Reject
                        </Button>
                        <Button
                          onClick={() =>
                            onDecision(active.kind, active.row, "accept")
                          }
                        >
                          <Check size={15} /> Approve
                        </Button>
                      </>
                    ) : (
                      <span>
                        {ownRequest
                          ? "You cannot approve your own attendance."
                          : review?.canDecide
                            ? "Your approval permission does not cover this employee."
                            : `${approverName ?? "The assigned approver"} or a site admin can decide this request.`}
                      </span>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="rd-empty rd-inspector-empty">
                <ClipboardCheck size={24} aria-hidden="true" />
                <strong>
                  {loading ? "Loading requests…" : "Nothing selected"}
                </strong>
                <span>
                  Select a request to see its evidence and decision trail.
                </span>
              </div>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}
export function OperationsPanel({
  initialTab = "overview",
  title,
}: { initialTab?: string; title?: string } = {}) {
  const s = useScope(),
    t = useT(),
    write = useWrite(),
    can = (cap: string) => s.capabilities.includes(cap);
  // The approvals route only needs its per-day review query; skip the
  // whole-workspace snapshot so the desk renders without waiting on it.
  const navigate = useNavigate();
  const reviewOnly = initialTab === "review";
  const q = useScopedQuery<{ operations: Snapshot }>(
    ["operations"],
    OperationsDocument,
    {},
    !reviewOnly,
    15000,
  );
  const people = useScopedQuery<any>(
    ["operation-people"],
    EmployeesDocument,
    { first: 50 },
    can("employees.view") && !reviewOnly,
  );
  const setup = useScopedQuery<any>(
    ["foundation"],
    FoundationDocument,
    {},
    can("site_settings.view") && !reviewOnly,
  );
  const [tab, setTab] = useState(initialTab),
    [reviewDay, setReviewDay] = useState(s.workDate),
    [reviewFilter, setReviewFilter] = useState<"pending" | "reviewed">(
      "pending",
    ),
    [selectedReviewId, setSelectedReviewId] = useState<string | null>(null),
    [form, setForm] = useState<{
      title: string;
      op: string;
      fields: Field[];
      fixed?: Row;
      transform?: (v: Row) => Row;
    } | null>(null),
    [schedule, setSchedule] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [captureStage, setCaptureStage] = useState(""),
    [outReason, setOutReason] = useState<{
      resolve: (reason: string | null) => void;
    } | null>(null),
    [message, setMessage] = useState(""),
    [detail, setDetail] = useState<Row | null>(null),
    [attendanceReview, setAttendanceReview] = useState<{
      kind: "event" | "adjustment";
      row: Row;
      decision: "accept" | "reject";
    } | null>(null),
    [photoPreview, setPhotoPreview] = useState<{
      id: string;
      label: string;
    } | null>(null),
    [taskFocus, setTaskFocus] = useState<string | null>(null);
  useEffect(() => {
    setAttendanceReview(null);
    setPhotoPreview(null);
    setReviewDay(s.workDate);
    setReviewFilter("pending");
    setSelectedReviewId(null);
  }, [s.actorId, s.siteId, s.version, s.workDate]);
  useEffect(() => setMessage(""), [tab]);
  const reviewQ = useScopedQuery<{ attendanceReview: ReviewDay }>(
    ["attendance-review", reviewDay],
    AttendanceReviewDocument,
    { workDate: reviewDay },
    tab === "review",
    15000,
  );
  const reviewData = reviewQ.data?.attendanceReview ?? null;
  const data = q.data?.operations ?? (reviewOnly ? emptySnapshot : undefined),
    employees = (people.data?.employees?.nodes ?? []).map((e: any) => ({
      id: e.id,
      name: e.displayName,
    })),
    approvers = (data?.approvers ?? []).map((e: any) => ({
      id: e.id,
      name: e.name,
    })),
    references = setup.data?.foundation?.references ?? [];
  const name = (employeeId: string) =>
    employees.find((e: any) => e.id === employeeId)?.name ??
    (employeeId === data?.me ? t("You", "आप") : employeeId.slice(0, 8));
  const taskColumns = useMemo<ColumnDef<Row>[]>(
    () => [
      { header: "Task", accessorKey: "title" },
      { header: "Assigned to", accessorFn: (r) => name(r.employee_id) },
      {
        header: "Deadline",
        accessorKey: "deadline",
        cell: ({ getValue }) => fmt(getValue()),
      },
      {
        header: "Priority",
        accessorKey: "priority",
        cell: ({ getValue }) => <Badge>{String(getValue())}</Badge>,
      },
      {
        header: "Status",
        accessorKey: "status",
        cell: ({ getValue }) => <Badge>{String(getValue())}</Badge>,
      },
      {
        header: "",
        id: "actions",
        cell: ({ row }) => (
          <Button variant="ghost" onClick={() => setTaskFocus(row.original.id)}>
            Open task
          </Button>
        ),
      },
    ],
    [people.data, data?.me],
  );
  const leaveColumns = useMemo<ColumnDef<Row>[]>(
    () => [
      { header: "Employee", accessorFn: (r) => name(r.employee_id) },
      {
        header: "Dates",
        accessorFn: (r) =>
          `${String(r.starts_on).slice(0, 10)} – ${String(r.ends_on).slice(0, 10)}`,
      },
      {
        header: "Days",
        accessorKey: "units",
        cell: ({ row }) => `${row.original.units} · ${row.original.half}`,
      },
      { header: "Reason", accessorKey: "reason" },
      {
        header: "Status",
        accessorKey: "status",
        cell: ({ row }) => (
          <>
            <Badge>{row.original.status}</Badge>
            <small>{row.original.decision_note}</small>
          </>
        ),
      },
      {
        header: "",
        id: "actions",
        cell: ({ row: { original: l } }) =>
          can("leave.approve") && l.status === "pending" ? (
            <Button
              variant="ghost"
              onClick={() =>
                fields(
                  [
                    reason,
                    {
                      key: "approve",
                      label: "Approve and deduct balance",
                      type: "checkbox",
                      value: true,
                    },
                  ],
                  "Review leave",
                  "reviewLeave",
                  { id: l.id, expectedVersion: l.version },
                )
              }
            >
              Review
            </Button>
          ) : null,
      },
    ],
    [people.data, data?.me, s.capabilities],
  );
  async function act(op: string, input: Row) {
    setBusy(true);
    setError("");
    try {
      const result = await write<any>(OperateDocument, {
        operation: op,
        input,
      });
      // Event ingestion returns engine wording; show the outcome instead.
      setMessage(
        result.operate.status === "pending_verification"
          ? `Recorded and sent for approval. ${reviewReason(result.operate.reason)}`
          : t("Saved", "सहेजा गया"),
      );
      // useWrite already refreshes the scoped queries after a committed mutation.
      return result.operate;
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      setBusy(false);
    }
  }
  const reason: Field = {
    key: "reason",
    label: t("Reason / review note", "कारण / समीक्षा टिप्पणी"),
    type: "textarea",
  };
  const employee: Field = {
    key: "employeeId",
    label: t("Employee", "कर्मचारी"),
    options: employees,
  };
  const fields = (
    items: Field[],
    title: string,
    op: string,
    fixed?: Row,
    transform?: (v: Row) => Row,
  ) => setForm({ title, op, fields: items, fixed, transform });
  if (q.isPending && !reviewOnly)
    return <PageSkeleton title={title ?? "Your working day"} />;
  if (q.error && !reviewOnly)
    return <ErrorState error={q.error} retry={() => void q.refetch()} />;
  if (!data) return null;
  const open = data.sessions.find(
    (d) => d.employee_id === data.me && d.status === "open",
  );
  const ownEvents = data.events.filter((e) => e.duty_id === open?.id);
  const needsIn =
    !open ||
    (ownEvents.length > 0 &&
      !ownEvents.some((e) => e.kind === "IN" && e.status !== "rejected"));
  const pendingOut = ownEvents.some(
    (e) => e.kind === "OUT" && e.status === "pending_verification",
  );
  const pendingIn = ownEvents.some(
    (e) => e.kind === "IN" && e.status === "pending_verification",
  );
  async function capture(kind: string) {
    setBusy(true);
    setError("");
    const ticket = s.boundary.ticket();
    const checkScope = () => {
      if (!ticket.isCurrent())
        throw Error("Workspace changed. Please capture in the selected site.");
    };
    try {
      const getLocation = () =>
        new Promise<Row | undefined>((resolve) => {
          if (!navigator.geolocation) return resolve(undefined);
          navigator.geolocation.getCurrentPosition(
            (p) =>
              resolve({
                latitude: p.coords.latitude,
                longitude: p.coords.longitude,
                accuracyM: p.coords.accuracy,
                observedAt: new Date(p.timestamp).toISOString(),
                mocked: false,
              }),
            () => resolve(undefined),
            { enableHighAccuracy: true, maximumAge: 10000, timeout: 8000 },
          );
        });
      const position = getLocation();
      setCaptureStage("Take your attendance photo");
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/jpeg,image/png";
      input.setAttribute("capture", "user");
      const file = await new Promise<File | null>((resolve) => {
        input.onchange = () => resolve(input.files?.[0] ?? null);
        input.oncancel = () => resolve(null);
        input.click();
      });
      if (!file) return;
      setCaptureStage("Checking site location…");
      let location = await position;
      checkScope();
      if (
        location &&
        Date.now() - Date.parse(location.observedAt) >
          Math.min(15, data!.policy!.rules.freshnessSeconds) * 1000
      )
        location = await getLocation();
      checkScope();
      const capturedAt = new Date().toISOString(),
        clientId = id();
      let offsiteReason: string | undefined;
      if (
        kind === "OUT" &&
        ((open && open.geofence_version !== data!.geofence!.version) ||
          !verifiedInside(
            data!.geofence!.geojson,
            location,
            data!.policy!.rules,
          ))
      ) {
        const reason = await new Promise<string | null>((resolve) =>
          setOutReason({ resolve }),
        );
        if (!reason) return;
        offsiteReason = reason;
        checkScope();
      }
      setCaptureStage("Uploading photo and recording attendance…");
      const intent = await write<any>(OperateDocument, {
        operation: "fileIntent",
        input: {
          clientId,
          purpose: "attendance",
          type: file.type,
          bytes: file.size,
        },
      });
      checkScope();
      const uploaded = await uploadEvidence(s.siteId, intent.operate.id, file);
      checkScope();
      if (uploaded.status !== "ready")
        throw Error(
          t(
            "Photo is quarantined or rejected. Attendance was not submitted.",
            "फोटो समीक्षा में है या अस्वीकृत है। उपस्थिति नहीं भेजी गई।",
          ),
        );
      await act("event", {
        clientEventId: clientId,
        ...(offsiteReason ? { offsiteReason } : {}),
        dutyId: open?.id ?? id(),
        // After every submitted event, pending ones included.
        sequence:
          Math.max(open?.last_sequence ?? 0, open?.max_sequence ?? 0) + 1,
        kind,
        capturedAt,
        payloadVersion: 1,
        policyVersion: open?.policy_version ?? data!.policy!.version,
        geofenceVersion: open?.geofence_version ?? data!.geofence!.version,
        photoId: uploaded.id,
        ...(location ? { location } : {}),
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      ticket.release();
      setCaptureStage("");
      setBusy(false);
    }
  }
  const tabs = [
    { id: "overview", label: t("Today", "आज") },
    { id: "mark", label: t("Mark IN / OUT", "IN / OUT दर्ज करें") },
    { id: "attendance", label: t("Attendance", "उपस्थिति") },
    { id: "review", label: t("Approvals", "अनुमोदन") },
    { id: "geofence", label: t("Site geofence", "साइट जियोफेंस") },
    { id: "leave", label: t("Leave", "छुट्टी") },
    { id: "tasks", label: t("Tasks", "कार्य") },
    ...(can("site_settings.manage")
      ? [{ id: "config", label: t("Policy & roster", "नीति और रोस्टर") }]
      : []),
  ].filter(
    (item) =>
      item.id === "overview" ||
      item.id === "config" ||
      (item.id === "mark"
        ? can("my_attendance.view") || can("my_attendance.create")
        : item.id === "review"
          ? can("attendance.view") || can("attendance.approve")
          : item.id === "geofence"
            ? can("site_settings.view") || can("site_settings.manage")
            : item.id === "attendance"
              ? can("attendance.view") || can("my_attendance.view")
              : item.id === "leave"
                ? can("leave.view") || can("my_leave.view")
                : can("tasks.view")),
  );
  return (
    <div className="operations-panel">
      {tab !== "review" && tab !== "attendance" && (
        <Heading
          eyebrow={t("OPERATIONS", "संचालन")}
          title={
            tab === initialTab
              ? (title ?? t("Your working day", "आपका कार्य दिवस"))
              : (tabs.find((item) => item.id === tab)?.label ??
                title ??
                t("Attendance", "उपस्थिति"))
          }
          description={
            tab === "review"
              ? `${s.siteName} · Review pending attendance evidence and correction requests.`
              : `${s.siteName} · ${t("Evidence, work and decisions in one place.", "प्रमाण, काम और निर्णय एक जगह।")}`
          }
        />
      )}
      {tab === "overview" && (
        <div className="ops-summary">
          <div>
            <small>{t("Open duties", "खुली ड्यूटी")}</small>
            <strong>
              {data.sessions.filter((x) => x.status === "open").length}
            </strong>
          </div>
          <div>
            <small>{t("Awaiting verification", "सत्यापन लंबित")}</small>
            <strong>
              {
                data.events.filter((x) => x.status === "pending_verification")
                  .length
              }
            </strong>
          </div>
          <div>
            <small>{t("Pending leave", "लंबित छुट्टी")}</small>
            <strong>
              {data.leaveRequests.filter((x) => x.status === "pending").length}
            </strong>
          </div>
          <div>
            <small>{t("Open tasks", "खुले कार्य")}</small>
            <strong>
              {data.tasks.filter((x) => x.status !== "done").length}
            </strong>
          </div>
        </div>
      )}
      {error && <Notice>{error}</Notice>}
      {outReason && (
        <Modal
          title="OUT needs approval"
          onClose={() => {
            outReason.resolve(null);
            setOutReason(null);
          }}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const reason = String(
                new FormData(event.currentTarget).get("offsiteReason") ?? "",
              ).trim();
              if (reason.length < 8) return;
              outReason.resolve(reason);
              setOutReason(null);
            }}
          >
            <p>
              You are outside the site, or GPS could not confirm you are inside.
              Explain the reason. This OUT counts only after your attendance
              approver accepts it.
            </p>
            <label>
              Reason for OUT
              <textarea
                name="offsiteReason"
                required
                minLength={8}
                maxLength={1000}
                autoFocus
              />
            </label>
            <Button type="submit">Submit for approval</Button>
          </form>
        </Modal>
      )}
      {captureStage && <p role="status">{captureStage}</p>}
      {message && (
        <p role="status" className="allowed-text">
          {message}
        </p>
      )}
      {/* Dedicated routes are reached from the sidebar; only the hub shows tabs. */}
      {initialTab === "overview" && (
        <Tabs value={tab} onChange={setTab} items={tabs} />
      )}
      {["overview", "mark"].includes(tab) && (
        <>
          <div className="ops-duty">
            <div>
              <Badge>
                {pendingOut
                  ? t("OUT awaiting approval", "OUT अनुमोदन लंबित")
                  : pendingIn
                    ? t("IN awaiting approval", "IN अनुमोदन लंबित")
                    : !needsIn
                      ? t("On duty", "ड्यूटी पर")
                      : t("Off duty", "ड्यूटी से बाहर")}
              </Badge>
              <h2>
                {open
                  ? fmt(open.opened_at)
                  : t(
                      "Ready when your day begins.",
                      "आपका दिन शुरू होने पर तैयार।",
                    )}
              </h2>
              <p>
                {t(
                  "Photo and GPS are supporting evidence, not biometric proof. Uncertain time stays pending verification.",
                  "फोटो और जीपीएस सहायक प्रमाण हैं, बायोमेट्रिक प्रमाण नहीं। अनिश्चित समय सत्यापन में रहता है।",
                )}
              </p>
            </div>
            {data.me && can("my_attendance.create") && (
              <Button
                disabled={busy || pendingOut || !data.policy || !data.geofence}
                onClick={() => void capture(needsIn ? "IN" : "OUT")}
              >
                <Camera size={18} />
                {!needsIn
                  ? t("Photo check-out", "फोटो चेक-आउट")
                  : t("Photo check-in", "फोटो चेक-इन")}
              </Button>
            )}
          </div>
          {pendingOut && (
            <Notice>
              Your OUT request is awaiting attendance approval. It has not
              closed or confirmed the duty yet.
            </Notice>
          )}
          {!data.me && (
            <Notice>
              This account has no employee profile linked at this site. Link the
              employee account in Employees to enable its own IN / OUT marking.
              Team attendance and approvals remain available according to your
              permissions.
            </Notice>
          )}
          {(!data.policy || !data.geofence) && (
            <Notice>
              {t(
                "Attendance needs a configured policy and geofence. No company rules have been assumed.",
                "उपस्थिति के लिए नीति और जियोफेंस निर्धारित करें। कंपनी नियम अनुमानित नहीं हैं।",
              )}
            </Notice>
          )}
          {tab === "overview" && (
            <>
              <h3>{t("Inbox", "इनबॉक्स")}</h3>
              {data.inbox.length ? (
                data.inbox.map((n) => (
                  <article className="ops-row" key={n.id}>
                    <div>
                      <strong>{n.event_type.replaceAll(".", " · ")}</strong>
                      <p>
                        {fmt(n.created_at)} · {t("Push", "पुश")}:{" "}
                        {n.push_status}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setTab(
                          n.module === "tasks"
                            ? "tasks"
                            : n.module === "leave"
                              ? "leave"
                              : "attendance",
                        );
                        void act("readInbox", { id: n.id }).catch(() => {});
                      }}
                    >
                      {t("Open", "खोलें")} <ArrowUpRight size={16} />
                    </Button>
                  </article>
                ))
              ) : (
                <Empty title={t("You are up to date", "सब अद्यतन है")} />
              )}
            </>
          )}
        </>
      )}
      {tab === "attendance" && (
        <AttendanceRecordsDesk
          siteName={s.siteName}
          sessions={data.sessions}
          maxSessionHours={data.policy?.rules?.maxSessionHours}
          events={data.events}
          rosters={data.rosters}
          visits={data.visits}
          me={data.me}
          name={name}
          fetching={q.isFetching}
          onRefresh={() => void q.refetch()}
          canAssignShift={can("attendance.edit")}
          onAssignShift={() => setSchedule(true)}
          onOpenApprovals={() => navigate("/attendance-review")}
          onOpenEvidence={setDetail}
          onRequestCorrection={(duty) =>
            fields(
              [
                { key: "startsAt", label: "From", type: "datetime-local" },
                { key: "endsAt", label: "Until", type: "datetime-local" },
                {
                  key: "kind",
                  label: "Adjustment",
                  options: [
                    "office",
                    "field",
                    "break",
                    "outside",
                    "unknown",
                    "overtime",
                  ].map((x) => ({ id: x, name: x })),
                },
                {
                  key: "closeSession",
                  label: "Request closure for a missed exit",
                  type: "checkbox",
                },
                reason,
              ],
              "Request correction or overtime",
              "adjustment",
              { dutyId: duty.id },
            )
          }
          onPreviewPhoto={(photoId, label) =>
            setPhotoPreview({ id: photoId, label })
          }
        />
      )}
      {tab === "review" && (
        <AttendanceReviewDesk
          siteId={s.siteId}
          today={s.workDate}
          day={reviewDay}
          onDayChange={(day) => {
            setReviewDay(day);
            setSelectedReviewId(null);
            setReviewFilter("pending");
          }}
          review={reviewData}
          loading={reviewQ.isPending}
          fetching={reviewQ.isFetching}
          error={reviewQ.error}
          refresh={() => void reviewQ.refetch()}
          filter={reviewFilter}
          onFilter={(value) => {
            setReviewFilter(value);
            setSelectedReviewId(null);
          }}
          selectedId={selectedReviewId}
          onSelect={setSelectedReviewId}
          onDecision={(kind, row, decision) =>
            setAttendanceReview({ kind, row, decision })
          }
          onPreview={(photoId, label) =>
            setPhotoPreview({ id: photoId, label })
          }
          actorId={s.actorId}
        />
      )}
      {tab === "leave" && (
        <>
          <div className="ops-section-title">
            <h2>{t("Leave & balances", "छुट्टी और शेष")}</h2>
            {can("my_leave.submit") && data.me && (
              <Button
                disabled={!data.leaveTypes.length}
                onClick={() =>
                  fields(
                    [
                      {
                        key: "typeId",
                        label: "Leave type",
                        options: data.leaveTypes.map((x) => ({
                          id: x.id,
                          name: x.label,
                        })),
                      },
                      { key: "startsOn", label: "From", type: "date" },
                      { key: "endsOn", label: "To", type: "date" },
                      {
                        key: "half",
                        label: "Day portion",
                        options: [
                          { id: "full", name: "Full day" },
                          { id: "am", name: "First half" },
                          { id: "pm", name: "Second half" },
                        ],
                      },
                      reason,
                    ],
                    "Apply for leave",
                    "leave",
                    { clientId: id() },
                  )
                }
              >
                <Plus size={16} />
                Apply for leave
              </Button>
            )}
          </div>
          {!data.leaveTypes.length && (
            <Notice>
              No leave type or company entitlement is configured. An
              administrator must set the rules and opening ledger credits.
            </Notice>
          )}
          <div className="ops-balances">
            {data.balances.map((b, i) => (
              <div key={i}>
                <span>
                  {name(b.employee_id)} ·{" "}
                  {data.leaveTypes.find((x) => x.id === b.type_id)?.label}
                </span>
                <strong>{b.balance} days</strong>
              </div>
            ))}
          </div>
          {data.leaveRequests.length ? (
            <DataTable
              data={data.leaveRequests}
              columns={leaveColumns}
              getRowId={(r: Row) => r.id}
              label="Leave requests"
            />
          ) : (
            <Empty title="No leave requests" />
          )}
          <details>
            <summary>Ledger & decision history</summary>
            {data.ledger.map((l) => (
              <p key={l.id}>
                {name(l.employee_id)} · {l.units} · {l.reason} ·{" "}
                {fmt(l.created_at)}
              </p>
            ))}
          </details>
        </>
      )}
      {tab === "tasks" && (
        <>
          <div className="ops-section-title">
            <h2>
              {t("Tasks that move work forward.", "काम आगे बढ़ाने वाले कार्य।")}
            </h2>
            {can("tasks.create") && (
              <Button
                onClick={() =>
                  fields(
                    [
                      employee,
                      { key: "title", label: "Task title" },
                      {
                        key: "description",
                        label: "Details",
                        type: "textarea",
                      },
                      {
                        key: "deadline",
                        label: "Deadline",
                        type: "datetime-local",
                      },
                      {
                        key: "priority",
                        label: "Priority",
                        options: ["low", "normal", "high", "urgent"].map(
                          (x) => ({ id: x, name: x }),
                        ),
                      },
                    ],
                    "Assign task",
                    "task",
                    { clientId: id() },
                  )
                }
              >
                <Plus size={16} />
                Assign task
              </Button>
            )}
          </div>
          {data.tasks.length ? (
            <>
              <DataTable
                data={data.tasks}
                columns={taskColumns}
                getRowId={(r: Row) => r.id}
                label="Tasks"
              />
              {data.tasks
                .filter((task) => task.id === taskFocus)
                .map((task) => (
                  <Modal
                    key={task.id}
                    title="Task details"
                    sheet
                    onClose={() => setTaskFocus(null)}
                  >
                    <article className="ops-task">
                      <div className="ops-section-title">
                        <div>
                          <Badge>{task.priority}</Badge>
                          <h3>{task.title}</h3>
                          <p>
                            {name(task.employee_id)} · Due {fmt(task.deadline)}
                          </p>
                        </div>
                        <select
                          aria-label={`Status ${task.title}`}
                          value={task.status}
                          disabled={busy}
                          onChange={(e) =>
                            void act("taskStatus", {
                              id: task.id,
                              expectedVersion: task.version,
                              status: e.target.value,
                            }).catch(() => {})
                          }
                        >
                          {["todo", "in_progress", "blocked", "done"].map(
                            (x) => (
                              <option key={x}>{x}</option>
                            ),
                          )}
                        </select>
                      </div>
                      <p>{task.description}</p>
                      <div className="task-comments">
                        {data.comments
                          .filter((c) => c.task_id === task.id)
                          .map((c) => (
                            <p key={c.id}>
                              {c.body}{" "}
                              {c.attachment_id && (
                                <a
                                  href={`/files/attachments/${c.attachment_id}?siteId=${s.siteId}`}
                                >
                                  Attachment ↗
                                </a>
                              )}
                            </p>
                          ))}
                      </div>
                      <Button
                        variant="outline"
                        onClick={() =>
                          fields(
                            [
                              {
                                key: "body",
                                label: "Comment",
                                type: "textarea",
                              },
                            ],
                            "Add comment",
                            "comment",
                            { clientId: id(), taskId: task.id },
                          )
                        }
                      >
                        <Send size={15} />
                        Comment
                      </Button>
                      <label className="button button-outline attachment-picker">
                        Attach file
                        <input
                          type="file"
                          accept="image/jpeg,image/png,application/pdf"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              const intent = await write<any>(OperateDocument, {
                                operation: "fileIntent",
                                input: {
                                  clientId: id(),
                                  purpose: "task",
                                  parentId: task.id,
                                  type: file.type,
                                  bytes: file.size,
                                },
                              });
                              const upload = await uploadEvidence(
                                s.siteId,
                                intent.operate.id,
                                file,
                              );
                              if (upload.status !== "ready")
                                throw Error(
                                  "File quarantined or rejected. It cannot be attached until scanning succeeds.",
                                );
                              await act("comment", {
                                clientId: id(),
                                taskId: task.id,
                                body: "Attachment",
                                attachmentId: upload.id,
                              });
                            } catch (e) {
                              setError((e as Error).message);
                            }
                          }}
                        />
                      </label>
                    </article>
                  </Modal>
                ))}
            </>
          ) : (
            <Empty title={t("No assigned tasks", "कोई निर्धारित कार्य नहीं")} />
          )}
        </>
      )}
      {tab === "geofence" && (
        <section className="surface-card attendance-geofence">
          <h2>{data.geofence?.label ?? "Set your site boundary"}</h2>
          <p>
            {s.siteName} ·{" "}
            {data.geofence
              ? `Saved boundary v${data.geofence.version}`
              : "No boundary configured"}
          </p>
          <p>
            Use the map or latitude and longitude to define where employees can
            mark IN and OUT. An OUT outside this boundary needs a reason and
            approval.
          </p>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              const values = new FormData(event.currentTarget);
              try {
                const coordinates = values.get("coordinates");
                if (!coordinates)
                  throw Error(
                    "Choose a centre point or at least three corners before saving.",
                  );
                await act("geofence", {
                  label: values.get("label"),
                  coordinates: JSON.parse(String(coordinates)),
                  expectedVersion: data.geofence?.version ?? 0,
                  reason: values.get("reason"),
                });
              } catch (err) {
                setError((err as Error).message);
              }
            }}
          >
            <Suspense fallback={<Skeleton />}>
              <GeofencePicker
                key={data.geofence?.version ?? 0}
                name="coordinates"
                fence={data.geofence?.geojson ?? null}
                readOnly={!can("site_settings.manage")}
              />
            </Suspense>
            {can("site_settings.manage") && (
              <div className="geofence-save-fields">
                <label>
                  Boundary name
                  <input
                    name="label"
                    required
                    maxLength={200}
                    defaultValue={data.geofence?.label ?? s.siteName}
                  />
                </label>
                <label>
                  Reason for boundary change
                  <textarea
                    name="reason"
                    required
                    minLength={8}
                    maxLength={1000}
                  />
                </label>
                <Button disabled={busy} type="submit">
                  {busy ? "Saving boundary…" : "Save site geofence"}
                </Button>
              </div>
            )}
          </form>
        </section>
      )}
      {tab === "config" && (
        <>
          <Notice>
            Saving is explicit and audited. These are technical limits and
            company choices—not supplied company rules. Approvals remain
            online-only.
          </Notice>
          <div className="ops-config-grid">
            <section>
              <ShieldCheck />
              <h3>Attendance policy</h3>
              <p>
                {data.policy
                  ? `Version ${data.policy.version}`
                  : "Unconfigured"}
              </p>
              <Button
                onClick={() =>
                  fields(
                    [
                      {
                        key: "allowOffline",
                        label: "Permit encrypted offline capture",
                        type: "checkbox",
                        value: data.policy?.rules.allowOffline ?? false,
                      },
                      ...[
                        "offlineMaxHours",
                        "maxAccuracyM",
                        "freshnessSeconds",
                        "clockSkewSeconds",
                        "gapSeconds",
                        "maxSessionHours",
                        "lateGraceMinutes",
                        "earlyGraceMinutes",
                      ].map((key) => ({
                        key,
                        label: key.replace(/([A-Z])/g, " $1"),
                        type: "number",
                        value: data.policy?.rules[key],
                      })),
                      {
                        key: "attendanceApproverId",
                        label: "Attendance approver",
                        options: approvers,
                        value: data.policy?.rules.attendanceApproverId,
                      },
                      reason,
                    ],
                    "Configure attendance policy",
                    "policy",
                    { expectedVersion: data.policy?.version ?? 0 },
                    (v) => {
                      const { reason, ...rules } = v;
                      return { rules, reason };
                    },
                  )
                }
              >
                Configure policy
              </Button>
            </section>
            <section>
              <MapPin />
              <h3>Geofence</h3>
              <p>
                {data.geofence
                  ? `${data.geofence.label} · v${data.geofence.version}`
                  : "Unconfigured"}
              </p>
              <Button
                onClick={() =>
                  fields(
                    [
                      { key: "label", label: "Boundary name" },
                      {
                        key: "coordinates",
                        label: "Site boundary",
                        type: "geofence",
                        value: data.geofence?.geojson ?? null,
                      },
                      reason,
                    ],
                    "Set authorized geofence",
                    "geofence",
                    { expectedVersion: data.geofence?.version ?? 0 },
                    (v) => {
                      if (!v.coordinates)
                        throw new Error(
                          "Mark 3 or more corners, or 1 centre point, on the map",
                        );
                      return { ...v, coordinates: JSON.parse(v.coordinates) };
                    },
                  )
                }
              >
                Edit boundary
              </Button>
            </section>
            <section>
              <Clock />
              <h3>Shift roster</h3>
              <p>Overnight shifts end on the following site-local date.</p>
              <Button onClick={() => setSchedule(true)}>Assign shift</Button>
            </section>
            <section>
              <Check />
              <h3>Leave configuration</h3>
              <p>
                Explicit calendars, approvers and transaction-backed credits.
              </p>
              <Button
                onClick={() =>
                  fields(
                    [
                      { key: "code", label: "Type code" },
                      { key: "label", label: "Display name" },
                      {
                        key: "halfDays",
                        label: "Permit half days",
                        type: "checkbox",
                      },
                      {
                        key: "includeWeekends",
                        label: "Count weekends",
                        type: "checkbox",
                      },
                      {
                        key: "includeHolidays",
                        label: "Count configured holidays",
                        type: "checkbox",
                      },
                      {
                        key: "approverId",
                        label: "Leave approver",
                        options: approvers,
                      },
                    ],
                    "Configure leave type",
                    "leaveType",
                  )
                }
              >
                Add leave type
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  fields(
                    [
                      employee,
                      {
                        key: "typeId",
                        label: "Leave type",
                        options: data.leaveTypes.map((x) => ({
                          id: x.id,
                          name: x.label,
                        })),
                      },
                      {
                        key: "units",
                        label: "Opening credit in days",
                        type: "number",
                        min: 0.5,
                        max: 365,
                      },
                      {
                        key: "effectiveOn",
                        label: "Effective date",
                        type: "date",
                      },
                      reason,
                    ],
                    "Post leave credit",
                    "leaveCredit",
                  )
                }
              >
                Post credit
              </Button>
            </section>
          </div>
        </>
      )}
      {schedule && (
        <Modal
          title="Assign shift & duty time"
          onClose={() => setSchedule(false)}
        >
          <DutySchedule close={() => setSchedule(false)} />
        </Modal>
      )}
      {form && (
        <OperationForm
          form={{
            ...form,
            fields: form.fields.map((f) =>
              f.key === "employeeId"
                ? { ...f, options: employees }
                : ["attendanceApproverId", "approverId"].includes(f.key)
                  ? { ...f, options: approvers }
                  : f.key === "shiftId"
                    ? {
                        ...f,
                        options: references
                          .filter((r: any) => r.kind === "shift")
                          .map((r: any) => ({ id: r.id, name: r.name })),
                      }
                    : f,
            ),
          }}
          busy={busy}
          onClose={() => setForm(null)}
          onSave={async (v) => {
            await act(form.op, {
              ...form.fixed,
              ...(form.transform ? form.transform(v) : v),
            });
            setForm(null);
          }}
        />
      )}
      {attendanceReview && (
        <AttendanceDecisionForm
          key={`${attendanceReview.row.id}:${attendanceReview.decision}`}
          item={attendanceReview}
          employeeName={
            attendanceReview.row.employee_name ??
            name(attendanceReview.row.employee_id)
          }
          siteId={s.siteId}
          onPreviewPhoto={(photoId, label) =>
            setPhotoPreview({ id: photoId, label })
          }
          busy={busy}
          onClose={() => setAttendanceReview(null)}
          onSave={async (input) => {
            await act(
              attendanceReview.kind === "event"
                ? "verifyEvent"
                : "reviewAdjustment",
              input,
            );
            setAttendanceReview(null);
          }}
        />
      )}
      {photoPreview && (
        <Modal
          title={`Photo evidence · ${photoPreview.label}`}
          onClose={() => setPhotoPreview(null)}
          wide
        >
          <img
            className="attendance-review-photo-large"
            src={attendancePhotoUrl(s.siteId, photoPreview.id)}
            alt={`Attendance photo for ${photoPreview.label}`}
          />
        </Modal>
      )}
      {detail && (
        <Modal
          title="Duty evidence & assumptions"
          onClose={() => setDetail(null)}
        >
          <p>
            {fmt(detail.opened_at)} →{" "}
            {detail.closed_at ? fmt(detail.closed_at) : "Open; exit missing"}
          </p>
          <Notice>
            {detail.gaps.join(" · ") || "No declared evidence gaps"} · Unknown
            GPS time is not absence or a wage deduction.
          </Notice>
          {(detail.timeAtLocation ?? []).map((loc: Row, i: number) => (
            <p key={`location-${i}`}>
              {loc.visitId
                ? (data.visits.find((v) => v.id === loc.visitId)?.title ??
                  "Assigned visit")
                : humanize(loc.kind)}
              : {loc.minutes.toFixed(1)} min ·{" "}
              {humanize(loc.kind).toLowerCase()} evidence
            </p>
          ))}
          {detail.segments.map((seg: Row, i: number) => (
            <div className="ops-segment" key={i}>
              <Badge>{seg.kind}</Badge>
              <strong>
                {(
                  (Date.parse(seg.endsAt) - Date.parse(seg.startsAt)) /
                  60000
                ).toFixed(1)}{" "}
                min
              </strong>
              <small>
                {fmt(seg.startsAt)} → {fmt(seg.endsAt)}
              </small>
              <p>{seg.assumption}</p>
            </div>
          ))}
          {data.events
            .filter((e) => e.duty_id === detail.id)
            .map((e) => (
              <p key={e.id}>
                <strong>{eventLabel(e.kind)}</strong> · {fmt(e.captured_at)} ·{" "}
                {e.status === "pending_verification"
                  ? `Awaiting review — ${reviewReason(e.reason)}`
                  : e.status === "rejected"
                    ? "Rejected"
                    : "Verified"}{" "}
                {e.photo_id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setPhotoPreview({
                        id: e.photo_id,
                        label: eventLabel(e.kind),
                      })
                    }
                  >
                    <Camera size={14} /> Photo
                  </Button>
                )}
              </p>
            ))}
          {detail.employee_id === data.me && (
            <Button
              onClick={() => {
                setDetail(null);
                fields(
                  [
                    { key: "startsAt", label: "From", type: "datetime-local" },
                    { key: "endsAt", label: "Until", type: "datetime-local" },
                    {
                      key: "kind",
                      label: "Adjustment",
                      options: [
                        "office",
                        "field",
                        "break",
                        "outside",
                        "unknown",
                        "overtime",
                      ].map((x) => ({ id: x, name: x })),
                    },
                    {
                      key: "closeSession",
                      label: "Request closure for a missed exit",
                      type: "checkbox",
                    },
                    reason,
                  ],
                  "Request correction or overtime",
                  "adjustment",
                  { dutyId: detail.id },
                );
              }}
            >
              Request correction / overtime
            </Button>
          )}
        </Modal>
      )}
    </div>
  );
}
function AttendanceDecisionForm({
  item,
  employeeName,
  siteId,
  onPreviewPhoto,
  busy,
  onClose,
  onSave,
}: {
  item: {
    kind: "event" | "adjustment";
    row: Row;
    decision: "accept" | "reject";
  };
  employeeName: string;
  siteId: string;
  onPreviewPhoto: (photoId: string, label: string) => void;
  busy: boolean;
  onClose: () => void;
  onSave: (input: Row) => Promise<void>;
}) {
  const [decision, setDecision] = useState<"accept" | "reject">(item.decision);
  const [error, setError] = useState("");
  const event = item.kind === "event";
  const label = event
    ? eventLabel(item.row.kind)
    : String(item.row.kind).replaceAll("_", " ");
  return (
    <Modal title={`Review ${label.toLowerCase()}`} onClose={onClose}>
      <form
        className="ops-form attendance-decision-form"
        onSubmit={async (submit) => {
          submit.preventDefault();
          const values = new FormData(submit.currentTarget);
          const approve = decision === "accept";
          const input: Row = {
            id: item.row.id,
            approve,
            reason: String(values.get("reason") ?? "").trim(),
            ...(event
              ? { expectedStatus: "pending_verification" }
              : { expectedVersion: item.row.version }),
          };
          try {
            if (event && approve)
              input.effectiveAt = new Date(
                String(values.get("effectiveAt")),
              ).toISOString();
            await onSave(input);
          } catch (cause) {
            setError((cause as Error).message);
          }
        }}
      >
        <div className="attendance-decision-context">
          <strong>
            {employeeName} · {label}
          </strong>
          <p>
            {event
              ? `Captured ${fmt(item.row.captured_at)} · Entry ${item.row.sequence}`
              : `${fmt(item.row.starts_at)} → ${fmt(item.row.ends_at)}`}
          </p>
          <p>
            {event
              ? reviewReason(item.row.reason)
              : `Employee explanation: ${item.row.reason}`}
          </p>
          {event && item.row.offsite_reason && (
            <p>Employee explanation: {item.row.offsite_reason}</p>
          )}
          {event && (
            <div className="attendance-decision-photo">
              <strong>Photo evidence</strong>
              <AttendancePhotoEvidence
                siteId={siteId}
                photoId={item.row.photo_id}
                label={`${employeeName} · ${label}`}
                onPreview={onPreviewPhoto}
              />
            </div>
          )}
        </div>
        <fieldset className="attendance-decision-options">
          <legend>Decision</legend>
          <label>
            <input
              type="radio"
              name="decision"
              value="accept"
              checked={decision === "accept"}
              onChange={() => setDecision("accept")}
            />
            {event ? "Approve attendance entry" : "Approve correction"}
          </label>
          <label>
            <input
              type="radio"
              name="decision"
              value="reject"
              checked={decision === "reject"}
              onChange={() => setDecision("reject")}
            />
            {event ? "Reject attendance entry" : "Reject request"}
          </label>
        </fieldset>
        {event && decision === "accept" && (
          <label>
            Confirmed attendance time
            <input
              type="datetime-local"
              name="effectiveAt"
              defaultValue={localDateTime(item.row.captured_at)}
              max={localDateTime(new Date().toISOString())}
              required
            />
            <small>
              Use the time supported by the evidence. It cannot be in the
              future.
            </small>
          </label>
        )}
        <label>
          Decision note
          <textarea
            name="reason"
            minLength={8}
            maxLength={1000}
            required
            placeholder="Explain the evidence behind this decision"
          />
        </label>
        <p className="attendance-decision-consequence">
          {decision === "accept"
            ? event
              ? "Approving confirms this attendance time. Later entries in the shift can then be reviewed."
              : "Approving applies the requested correction."
            : "Rejecting leaves this request unconfirmed. The employee can see the decision note."}
        </p>
        {error && <Notice>{error}</Notice>}
        <div className="attendance-decision-actions">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant={decision === "reject" ? "destructive" : "default"}
            disabled={busy}
          >
            {busy
              ? "Saving…"
              : decision === "accept"
                ? event
                  ? "Approve entry"
                  : "Approve request"
                : event
                  ? "Reject entry"
                  : "Reject request"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
function OperationForm({
  form,
  busy,
  onClose,
  onSave,
}: {
  form: { title: string; fields: Field[] };
  busy: boolean;
  onClose: () => void;
  onSave: (v: Row) => Promise<void>;
}) {
  const [error, setError] = useState("");
  return (
    <Modal title={form.title} onClose={onClose}>
      <form
        className="ops-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget),
            values: Row = {};
          for (const f of form.fields) {
            const value = fd.get(f.key);
            values[f.key] =
              f.type === "checkbox"
                ? value === "on"
                : f.type === "number"
                  ? Number(value)
                  : f.type === "datetime-local"
                    ? new Date(String(value)).toISOString()
                    : String(value ?? "");
          }
          try {
            await onSave(values);
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        {form.fields.map((f) =>
          f.type === "geofence" ? (
            // Not a <label>: it would forward map clicks to the first button.
            <div key={f.key} className="ops-form-field">
              {f.label}
              <Suspense fallback={<p>Loading map…</p>}>
                <GeofencePicker name={f.key} fence={f.value} />
              </Suspense>
            </div>
          ) : (
            <label key={f.key}>
              {f.label}
              {f.options ? (
                <select name={f.key} required defaultValue={f.value ?? ""}>
                  <option value="">Choose…</option>
                  {f.options.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              ) : f.type === "textarea" ? (
                <textarea name={f.key} required defaultValue={f.value} />
              ) : (
                <input
                  name={f.key}
                  type={f.type ?? "text"}
                  defaultValue={f.type === "checkbox" ? undefined : f.value}
                  defaultChecked={f.type === "checkbox" && f.value}
                  required={f.type !== "checkbox"}
                  min={f.min}
                  max={f.max}
                  step={f.type === "number" ? "any" : undefined}
                />
              )}
            </label>
          ),
        )}
        {error && <Notice>{error}</Notice>}
        <Button disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
      </form>
    </Modal>
  );
}
export function OperationsHomeSummary() {
  const s = useScope(),
    t = useT();
  const enabled = [
    "attendance.view",
    "tasks.view",
    "leave.view",
    "my_attendance.view",
  ].some((k) => s.capabilities.includes(k));
  const q = useScopedQuery<{ operations: Snapshot }>(
    ["operations"],
    OperationsDocument,
    {},
    enabled,
    20000,
  );
  if (!enabled || !q.data) return null;
  const d = q.data.operations;
  return (
    <div className="ops-home-summary">
      <span>
        <strong>{d.tasks.filter((t) => t.status !== "done").length}</strong>{" "}
        {t("active tasks", "सक्रिय कार्य")}
      </span>
      <span>
        <strong>
          {d.leaveRequests.filter((r) => r.status === "pending").length +
            d.events.filter((e) => e.status === "pending_verification").length}
        </strong>{" "}
        {t("pending decisions", "लंबित निर्णय")}
      </span>
      <Link to="/operations">
        {t("Open day & operations →", "दिन और संचालन खोलें →")}
      </Link>
    </div>
  );
}
