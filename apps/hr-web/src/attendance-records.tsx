import { useState } from "react";
import {
  CalendarClock,
  Camera,
  ClipboardCheck,
  Clock3,
  FileSearch,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { Button } from "./components/ui/button";
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
  Person,
  Pill,
  Timeline,
  type DeskColumn,
  type Tone,
} from "./components/shared/desk";
import { humanize } from "./components/shared/status";

type Row = Record<string, any>;
type Segment = "all" | "open" | "closed" | "exceptions" | "roster";

const time = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
});
const day = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  day: "numeric",
  month: "short",
});
const stamp = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});
const at = (value?: string | null) =>
  value ? stamp.format(new Date(value)) : "—";
const duration = (from: string, to?: string | null) => {
  if (!to) return "—";
  const minutes = Math.round((Date.parse(to) - Date.parse(from)) / 60000);
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};
const eventName = (kind: string) =>
  ({
    IN: "Check-in",
    OUT: "Check-out",
    BREAK_START: "Break started",
    BREAK_END: "Break ended",
    FIELD_START: "Field work started",
    FIELD_END: "Field work ended",
  })[kind] ?? humanize(kind.toLowerCase());
const eventTone = (status: string): Tone =>
  status === "pending_verification"
    ? "warning"
    : status === "rejected"
      ? "danger"
      : "success";
const eventStatus = (status: string) =>
  status === "pending_verification"
    ? "Awaiting review"
    : status === "rejected"
      ? "Rejected"
      : "Verified";
const statusPill = (s: Row): [Tone, string] =>
  s.stale
    ? ["warning", "Exit not recorded"]
    : s.status === "open"
      ? ["success", "On duty"]
      : s.status === "closed"
        ? ["neutral", "Completed"]
        : ["warning", humanize(String(s.status))];
const exceptions = (s: Row) =>
  [
    s.stale && "Exit not recorded",
    s.late && "Late start",
    s.early && "Early exit",
    s.overtimeMinutes > 0 && `${s.overtimeMinutes} min approved overtime`,
  ].filter(Boolean) as string[];

/** Attendance records in the review-desk layout: KPI strip, queue, inspector. */
export function AttendanceRecordsDesk({
  siteName,
  sessions: recorded,
  maxSessionHours = 24,
  events,
  rosters,
  visits,
  me,
  name,
  fetching,
  onRefresh,
  canAssignShift,
  onAssignShift,
  onOpenApprovals,
  onOpenEvidence,
  onRequestCorrection,
  onPreviewPhoto,
}: {
  siteName: string;
  sessions: Row[];
  /** Policy limit: an open session older than this lost its exit (as on the dashboard). */
  maxSessionHours?: number;
  events: Row[];
  rosters: Row[];
  visits: Row[];
  me: string | null;
  name: (employeeId: string) => string;
  fetching: boolean;
  onRefresh: () => void;
  canAssignShift: boolean;
  onAssignShift: () => void;
  onOpenApprovals: () => void;
  onOpenEvidence: (session: Row) => void;
  onRequestCorrection: (session: Row) => void;
  onPreviewPhoto: (photoId: string, label: string) => void;
}) {
  const [segment, setSegment] = useState<Segment>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const sessions: Row[] = recorded.map((s) => ({
    ...s,
    stale:
      s.status === "open" &&
      Date.now() - Date.parse(s.opened_at) > maxSessionHours * 3_600_000,
  }));
  const person = (s: Row) => s.display_name ?? name(s.employee_id);
  const pending = events.filter((e) => e.status === "pending_verification");
  const groups: Record<Exclude<Segment, "roster">, Row[]> = {
    all: sessions,
    open: sessions.filter((s) => s.status === "open" && !s.stale),
    closed: sessions.filter((s) => s.status === "closed"),
    exceptions: sessions.filter((s) => s.late || s.early || s.stale),
  };
  const query = search.trim().toLowerCase();
  const matches = (who: string) => !query || who.toLowerCase().includes(query);
  const records =
    segment === "roster"
      ? []
      : groups[segment].filter((s) => matches(person(s)));
  const roster =
    segment === "roster"
      ? rosters.filter((r) => matches(name(r.employee_id)))
      : [];
  const recordColumns: DeskColumn<Row>[] = [
    {
      id: "Employee",
      header: "Employee",
      sortValue: person,
      cell: (s) => (
        <Person
          name={person(s)}
          sub={`${day.format(new Date(s.opened_at))}${exceptions(s).length ? ` · ${exceptions(s).join(" · ")}` : ""}`}
        />
      ),
    },
    {
      id: "In",
      header: "In",
      sortValue: (s) => s.opened_at,
      className: "rd-mono",
      cell: (s) => time.format(new Date(s.opened_at)),
    },
    {
      id: "Out",
      header: "Out",
      className: "rd-mono",
      cell: (s) =>
        s.closed_at ? (
          time.format(new Date(s.closed_at))
        ) : (
          <span className="rd-muted">—</span>
        ),
    },
    {
      id: "Hours",
      header: "Hours",
      className: "rd-mono rd-col-location",
      cell: (s) => duration(s.opened_at, s.closed_at),
    },
    {
      id: "Status",
      header: "Status",
      cell: (s) => {
        const [tone, label] = statusPill(s);
        return <Pill tone={tone}>{label}</Pill>;
      },
    },
  ];
  const rosterColumns: DeskColumn<Row>[] = [
    {
      id: "Employee",
      header: "Employee",
      cell: (r) => (
        <Person
          name={name(r.employee_id)}
          sub={day.format(new Date(r.starts_at))}
        />
      ),
    },
    {
      id: "Starts",
      header: "Starts",
      className: "rd-mono",
      cell: (r) => time.format(new Date(r.starts_at)),
    },
    {
      id: "Ends",
      header: "Ends",
      className: "rd-mono",
      cell: (r) => time.format(new Date(r.ends_at)),
    },
    {
      id: "Version",
      header: "Version",
      cell: (r) => <Pill tone="neutral">v{r.version}</Pill>,
    },
  ];
  const rows = segment === "roster" ? roster : records;
  const active = rows.find((r) => r.id === selectedId) ?? rows[0];
  const dutyEvents = active
    ? events
        .filter((e) => e.duty_id === active.id)
        .sort((a, b) => a.captured_at.localeCompare(b.captured_at))
    : [];
  const [tone, label] =
    active && segment !== "roster" ? statusPill(active) : [];
  return (
    <Desk label="Attendance records">
      <DeskHeader
        crumb="Attendance / Records"
        title="Attendance"
        subtitle={`${siteName} · Latest ${sessions.length} duty records`}
      >
        <Button variant="outline" size="sm" onClick={onOpenApprovals}>
          <ClipboardCheck size={15} />
          Review approvals
          {pending.length > 0 && ` (${pending.length})`}
        </Button>
        {/* The roster is a different list, so it is a view toggle, not a filter. */}
        <Button
          variant={segment === "roster" ? "secondary" : "outline"}
          size="sm"
          aria-pressed={segment === "roster"}
          onClick={() => {
            setSegment(segment === "roster" ? "all" : "roster");
            setSelectedId(null);
          }}
        >
          <CalendarClock size={15} />
          Shift roster ({rosters.length})
        </Button>
        {canAssignShift && (
          <Button size="sm" onClick={onAssignShift}>
            <Plus size={15} />
            Assign shift
          </Button>
        )}
        <DeskRefresh
          label="Refresh attendance"
          fetching={fetching}
          onClick={onRefresh}
        />
      </DeskHeader>
      <DeskKpis
        label="Attendance totals"
        items={[
          { label: "On duty now", value: groups.open.length, tone: "success" },
          { label: "Completed", value: groups.closed.length, tone: "neutral" },
          {
            label: "Late or early",
            value: groups.exceptions.length,
            tone: "warning",
          },
          {
            label: "Awaiting verification",
            value: pending.length,
            tone: pending.length ? "warning" : "neutral",
          },
        ]}
        context={{
          icon: ShieldCheck,
          title: pending.length
            ? `${pending.length} ${pending.length === 1 ? "entry needs" : "entries need"} a decision`
            : "All recorded entries are verified",
          text: "Photo and GPS are supporting evidence, not biometric proof. Unknown GPS time is not absence.",
          pill: pending.length
            ? { tone: "warning", label: "Review pending" }
            : { tone: "success", label: "Up to date" },
        }}
      />
      <DeskWorkspace>
        <DeskQueue
          label="Attendance records"
          segments={[
            { id: "all", label: "All", count: groups.all.length },
            { id: "open", label: "On duty", count: groups.open.length },
            { id: "closed", label: "Completed", count: groups.closed.length },
            {
              id: "exceptions",
              label: "Exceptions",
              count: groups.exceptions.length,
            },
          ]}
          segment={segment}
          onSegment={(next) => {
            setSegment(next);
            setSelectedId(null);
          }}
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search employee"
        >
          <DeskTable
            label={segment === "roster" ? "Shift roster" : "Attendance"}
            columns={segment === "roster" ? rosterColumns : recordColumns}
            rows={rows}
            getId={(r) => r.id}
            selectedId={active?.id}
            onSelect={setSelectedId}
            empty={
              <DeskEmpty
                icon={segment === "roster" ? CalendarClock : Clock3}
                title={
                  query
                    ? "No matching employees"
                    : segment === "roster"
                      ? "No shifts assigned yet"
                      : "No duty records here"
                }
                hint={
                  query
                    ? "Try a different name."
                    : segment === "roster"
                      ? "Assign a shift, or set duty times from Live tracking."
                      : "Records appear when employees mark IN from the app."
                }
              />
            }
          />
        </DeskQueue>
        {segment === "roster" ? (
          <Inspector
            label="Shift details"
            head={
              active
                ? {
                    title: name(active.employee_id),
                    sub: `Shift · ${day.format(new Date(active.starts_at))}`,
                    pill: <Pill tone="neutral">v{active.version}</Pill>,
                  }
                : undefined
            }
            actions={
              canAssignShift && (
                <>
                  <span>Overnight shifts end on the next site-local date.</span>
                  <Button onClick={onAssignShift}>
                    <Plus size={15} /> Assign shift
                  </Button>
                </>
              )
            }
            empty={
              <DeskEmpty
                className="rd-inspector-empty"
                icon={CalendarClock}
                title="Nothing selected"
                hint="Select a shift to see its window."
              />
            }
          >
            {active && (
              <InspectorSection title="Shift window">
                <Facts
                  items={[
                    { label: "Starts", value: at(active.starts_at) },
                    { label: "Ends", value: at(active.ends_at) },
                    {
                      label: "Length",
                      value: duration(active.starts_at, active.ends_at),
                    },
                    { label: "Roster version", value: `v${active.version}` },
                  ]}
                />
              </InspectorSection>
            )}
          </Inspector>
        ) : (
          <Inspector
            label="Duty details"
            head={
              active
                ? {
                    title: person(active),
                    sub: `Duty · ${day.format(new Date(active.opened_at))}`,
                    pill: <Pill tone={tone!}>{label}</Pill>,
                  }
                : undefined
            }
            actions={
              active && (
                <>
                  <span>
                    {active.employee_id === me
                      ? "Your own record"
                      : "Decisions are made in Attendance approvals"}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => onOpenEvidence(active)}
                  >
                    <FileSearch size={15} /> View evidence
                  </Button>
                  {active.employee_id === me && (
                    <Button onClick={() => onRequestCorrection(active)}>
                      Request correction / overtime
                    </Button>
                  )}
                </>
              )
            }
            empty={
              <DeskEmpty
                className="rd-inspector-empty"
                icon={Clock3}
                title="Nothing selected"
                hint="Select a duty record to see its evidence and activity."
              />
            }
          >
            {active && (
              <>
                <InspectorSection title="Duty">
                  <Facts
                    items={[
                      { label: "Checked in", value: at(active.opened_at) },
                      {
                        label: "Checked out",
                        value: active.closed_at
                          ? at(active.closed_at)
                          : active.status === "open" && !active.stale
                            ? "Still on duty"
                            : "Exit not recorded",
                      },
                      {
                        label: "Hours",
                        value: duration(active.opened_at, active.closed_at),
                      },
                      {
                        label: "Exceptions",
                        value: exceptions(active).join(" · ") || "None",
                      },
                      {
                        label: "Evidence gaps",
                        value:
                          (active.gaps ?? []).join(" · ") ||
                          "No declared evidence gaps",
                        span: true,
                      },
                    ]}
                  />
                </InspectorSection>
                {(active.timeAtLocation ?? []).length > 0 && (
                  <InspectorSection title="Time at location">
                    <Facts
                      items={(active.timeAtLocation as Row[]).map((loc, i) => ({
                        label: loc.visitId
                          ? (visits.find((v) => v.id === loc.visitId)?.title ??
                            "Assigned visit")
                          : humanize(String(loc.kind)),
                        value: `${Number(loc.minutes).toFixed(1)} min`,
                        key: i,
                      }))}
                    />
                  </InspectorSection>
                )}
                <InspectorSection title="Activity">
                  {dutyEvents.length ? (
                    <Timeline
                      items={dutyEvents.map((e) => ({
                        id: e.id,
                        tone: eventTone(e.status),
                        title: `${eventName(e.kind)} · ${eventStatus(e.status)}`,
                        meta: (
                          <>
                            {at(e.captured_at)}
                            {e.accuracy_m != null &&
                              ` · ± ${Math.round(e.accuracy_m)} m`}
                            {e.photo_id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="ml-1 h-6 px-1.5"
                                onClick={() =>
                                  onPreviewPhoto(
                                    e.photo_id,
                                    `${person(active)} · ${eventName(e.kind)}`,
                                  )
                                }
                              >
                                <Camera size={13} /> Photo
                              </Button>
                            )}
                          </>
                        ),
                        note: e.offsite_reason ?? undefined,
                      }))}
                    />
                  ) : (
                    <p className="rd-muted">
                      No entries recorded for this duty.
                    </p>
                  )}
                </InspectorSection>
              </>
            )}
          </Inspector>
        )}
      </DeskWorkspace>
    </Desk>
  );
}
