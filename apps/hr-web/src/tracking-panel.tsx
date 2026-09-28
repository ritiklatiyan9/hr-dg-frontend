import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  RefreshCw,
  Settings2,
  Radio,
  Clock3,
  LocateOff,
  CalendarClock,
  Search,
  Route,
  Smartphone,
  Footprints,
  MapPinOff,
} from "lucide-react";
import {
  TrackingMonitorDocument,
  TrackingCommandDocument,
} from "../../../packages/contracts/src/generated";
import { trackingStatus } from "../../../packages/attendance/src/tracking";
import { useScope, useScopedQuery, useWrite } from "./workspace-context";
import { DutySchedule } from "./duty-schedule";
import { Badge, Dialog, Empty, ErrorState, Skeleton } from "./ui";
import { Button } from "./components/ui/button";
import "./tracking.css";
const DutyMap = lazy(() => import("./duty-map"));
type Row = Record<string, any>;
const when = (value?: string) =>
  value ? new Date(value).toLocaleString() : "Not received";
const hm = (value: string) =>
  new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
const ago = (ms: number) =>
  ms < 60000
    ? `${Math.max(0, Math.round(ms / 1000))}s ago`
    : ms < 3600000
      ? `${Math.round(ms / 60000)} min ago`
      : `${Math.round(ms / 3600000)} h ago`;
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => /^\p{L}/u.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
const labels: Record<string, string> = {
  fresh: "Live",
  idle: "Idle",
  stale: "Signal lost",
  location_off: "Location off",
  missing: "No signal yet",
  disabled: "Disabled by HR",
  off_duty: "Off duty",
};
const metricIcons: Record<string, typeof Radio> = {
  fresh: Radio,
  idle: Footprints,
  stale: Clock3,
  location_off: MapPinOff,
  missing: LocateOff,
  off_duty: CalendarClock,
};
/** Statuses the server can age on the client: contact that proves the phone is on duty. */
const connected = new Set(["fresh", "idle", "location_off"]);
const place: Record<string, string> = {
  inside: "Inside site",
  outside: "Outside site",
  unknown: "Near boundary",
};
export function TrackingPanel() {
  const scope = useScope();
  const can = (cap: string) => scope.capabilities.includes(cap);
  const canSchedule =
    can("attendance.edit") &&
    can("employees.view") &&
    can("site_settings.view");
  const [params, setParams] = useSearchParams();
  const only = params.get("employee") ?? undefined;
  const [after, setAfter] = useState<string>(),
    [selected, setSelected] = useState<Row | null>(null),
    [settings, setSettings] = useState(false),
    [schedule, setSchedule] = useState(false),
    [focus, setFocus] = useState<{ id: string }>();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [clock, setClock] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const q = useScopedQuery<any>(
    ["tracking", after, only],
    TrackingMonitorDocument,
    {
      input: {
        ...(after ? { after } : {}),
        ...(only ? { employeeId: only } : {}),
      },
    },
    true,
    15000,
  );
  const data = q.data?.trackingMonitor;
  // Status ages every second, but map layers change only when a status or
  // location changes: rebuilding every marker each tick caused needless work.
  const disconnected = !!q.error || clock - q.dataUpdatedAt > 30000;
  const serverNow = data
    ? Date.parse(data.serverTime) + Math.max(0, clock - q.dataUpdatedAt)
    : clock;
  const statusFor = (e: Row): string => {
    if (!connected.has(e.status)) return e.status;
    if (Date.parse(e.ends_at) <= serverNow) return "off_duty";
    // A disconnected dashboard never keeps a green live badge indefinitely.
    if (disconnected) return "stale";
    return trackingStatus({
      enabled: true,
      eligible: true,
      observedAt: e.location?.observed_at,
      seenAt: e.seen_at,
      locationOff: e.location_off,
      now: serverNow,
      staleSeconds: data.policy?.stale_seconds ?? 120,
    });
  };
  const employees: Row[] = useMemo(
    () =>
      [...(data?.employees ?? [])].sort((a: Row, b: Row) =>
        a.display_name.localeCompare(b.display_name),
      ),
    [data],
  );
  const statuses = employees.map(statusFor);
  const statusKey = statuses.join();
  const mapPoints = useMemo(
    () =>
      employees
        .map((e, i) => ({ e, status: statuses[i] }))
        .filter(
          ({ e, status }) =>
            e.location &&
            e.display_name.toLowerCase().includes(search.toLowerCase()) &&
            (filter === "all" || status === filter),
        )
        .map(({ e, status }) => ({
          ...e.location,
          id: e.id,
          label: e.display_name,
          status,
          latitude: Number(e.location.latitude),
          longitude: Number(e.location.longitude),
        })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [employees, statusKey, search, filter],
  );
  if (q.isPending) return <Skeleton />;
  if (!data)
    return (
      <ErrorState
        error={q.error ?? new Error("Location data is unavailable")}
        retry={() => void q.refetch()}
      />
    );
  const statusOf = new Map(employees.map((e, i) => [e.id, statuses[i]]));
  const visible = employees.filter(
    (e) =>
      e.display_name.toLowerCase().includes(search.toLowerCase()) &&
      (filter === "all" || statusOf.get(e.id) === filter),
  );
  const windows = [
    ...new Set(
      employees
        .filter((e) => Date.parse(e.ends_at) > serverNow)
        .map((e) => `${hm(e.starts_at)} – ${hm(e.ends_at)}`),
    ),
  ];
  return (
    <section className="tracking-page">
      <div className="page-heading tracking-header">
        <div>
          <span className="tracking-eyebrow">LIVE OPERATIONS</span>
          <h1>Live tracking</h1>
          <p>
            {scope.siteName} ·{" "}
            {windows.length === 1
              ? `Duty time ${windows[0]}`
              : windows.length
                ? `${windows.length} duty windows scheduled`
                : "No upcoming duty scheduled"}
          </p>
        </div>
        <div className="tracking-actions">
          <span className={`tracking-live ${disconnected ? "is-stale" : ""}`}>
            <i />
            {disconnected ? "Refresh interrupted" : "Live · 15s"}
          </span>
          <Button variant="outline" onClick={() => void q.refetch()}>
            <RefreshCw size={16} /> Refresh
          </Button>
          {canSchedule && (
            <Button onClick={() => setSchedule(true)}>
              <CalendarClock size={16} /> Set duty time
            </Button>
          )}
          {can("employee_tracking.manage") && (
            <Button variant="outline" onClick={() => setSettings(true)}>
              <Settings2 size={16} /> Tracking settings
            </Button>
          )}
        </div>
      </div>
      {!data.policy?.enabled && (
        <div className="tracking-banner" role="status">
          <Smartphone size={20} />
          <div>
            <strong>Duty sharing is disabled</strong>
            <p>
              Phones will not share location during duty time until automatic
              sharing is enabled. It needs a{" "}
              <Link to="/geofence">site geofence</Link> first.
            </p>
          </div>
          {can("employee_tracking.manage") && (
            <Button size="sm" onClick={() => setSettings(true)}>
              Enable sharing
            </Button>
          )}
        </div>
      )}
      {only && (
        <div className="tracking-banner" role="status">
          <Route size={20} />
          <div>
            <strong>
              Showing {employees[0]?.display_name ?? "one employee"}
            </strong>
            <p>Opened from the employee profile.</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setAfter(undefined);
              setParams({}, { replace: true });
            }}
          >
            Show everyone
          </Button>
        </div>
      )}
      {disconnected && (
        <div role="alert" className="notice">
          Live refresh is interrupted. All displayed locations are last known
          observations.{" "}
          <Button variant="outline" onClick={() => void q.refetch()}>
            Retry
          </Button>
        </div>
      )}
      <div className="tracking-summary">
        {["fresh", "idle", "stale", "location_off", "missing", "off_duty"].map(
          (status) => {
            const Icon = metricIcons[status];
            return (
              <button
                key={status}
                type="button"
                className={`tracking-metric metric-${status}`}
                aria-pressed={filter === status}
                onClick={() => setFilter(filter === status ? "all" : status)}
              >
                <span className="metric-icon">
                  <Icon size={18} />
                </span>
                <strong>{statuses.filter((s) => s === status).length}</strong>
                <span>{labels[status]}</span>
              </button>
            );
          },
        )}
      </div>
      <div className="tracking-console">
        <aside className="tracking-roster">
          <div className="tracking-roster-head">
            <label className="tracking-search">
              <Search size={16} />
              <input
                aria-label="Search scheduled employees"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search employees…"
              />
            </label>
            <span>
              {visible.length} of {employees.length} on duty list
              {filter !== "all" && (
                <button type="button" onClick={() => setFilter("all")}>
                  Clear filter
                </button>
              )}
            </span>
          </div>
          {!employees.length ? (
            <Empty
              title="No scheduled employees"
              action={
                canSchedule && (
                  <Button size="sm" onClick={() => setSchedule(true)}>
                    Set duty time
                  </Button>
                )
              }
            >
              Set a duty time (for example 09:00–18:00) for employees. Their
              phones share location automatically during it.
            </Empty>
          ) : !visible.length ? (
            <Empty title="No matching employees">
              Try another name or location status.
            </Empty>
          ) : (
            <ul aria-label="Scheduled employees">
              {visible.map((e) => {
                const status = statusOf.get(e.id)!,
                  loc = e.location;
                return (
                  <li key={e.id} data-status={status}>
                    <button
                      type="button"
                      className="tracking-person"
                      disabled={!loc}
                      title={loc ? "Show on map" : "No location received yet"}
                      onClick={() => setFocus({ id: e.id })}
                    >
                      <span className="tracking-avatar" aria-hidden="true">
                        {initials(e.display_name)}
                      </span>
                      <span className="tracking-person-text">
                        <strong>{e.display_name}</strong>
                        <small>
                          Duty {hm(e.starts_at)} – {hm(e.ends_at)}
                        </small>
                        <small>
                          {status === "location_off"
                            ? "Phone location is off"
                            : loc
                              ? `${place[loc.classification] ?? "Location received"} · ${status === "idle" ? "not moving · last fix " : ""}${ago(serverNow - Date.parse(loc.observed_at))}`
                              : "No location received yet"}
                          {e.seen_at &&
                            status !== "fresh" &&
                            ` · phone seen ${ago(serverNow - Date.parse(e.seen_at))}`}
                        </small>
                      </span>
                      <Badge
                        tone={
                          status === "fresh" || status === "idle"
                            ? "success"
                            : status === "stale" || status === "location_off"
                              ? "warning"
                              : "neutral"
                        }
                      >
                        {labels[status]}
                      </Badge>
                    </button>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label="View route"
                      title={`View ${e.display_name}'s route`}
                      onClick={() => setSelected(e)}
                    >
                      <Route size={15} />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
          {(after || data.next) && (
            <div className="tracking-actions">
              <Button
                size="sm"
                variant="outline"
                disabled={!after}
                onClick={() => setAfter(undefined)}
              >
                First page
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!data.next}
                onClick={() => setAfter(data.next)}
              >
                Next employees
              </Button>
            </div>
          )}
        </aside>
        <div className="tracking-stage">
          <Suspense
            fallback={
              <div className="tracking-map-loading">Loading location map…</div>
            }
          >
            <DutyMap
              points={mapPoints}
              nowMs={serverNow}
              fence={data.geofence}
              focus={focus}
              onSelect={(id) =>
                setSelected(employees.find((e) => e.id === id) ?? null)
              }
            />
          </Suspense>
        </div>
      </div>
      <p className="tracking-caption">
        Last successful refresh: {when(new Date(q.dataUpdatedAt).toISOString())}
        . Phones share location only during each employee's HR-set duty time.
        Locations are received observations; they do not establish attendance.
      </p>
      {selected && (
        <Dialog
          title={`${selected.display_name} · duty route`}
          sheet
          onClose={() => setSelected(null)}
        >
          <TrackingRoute
            key={selected.id}
            roster={selected}
            fence={data.geofence}
            nowMs={serverNow}
            status={statusOf.get(selected.id) ?? "stale"}
          />
        </Dialog>
      )}
      {settings && (
        <Dialog
          title="Automatic duty location settings"
          onClose={() => setSettings(false)}
        >
          <TrackingSettings
            policy={data.policy}
            close={() => setSettings(false)}
          />
        </Dialog>
      )}
      {schedule && (
        <Dialog title="Set duty time" onClose={() => setSchedule(false)}>
          <DutySchedule
            trackingOn={!!data.policy?.enabled}
            close={() => setSchedule(false)}
          />
        </Dialog>
      )}
    </section>
  );
}
function TrackingSettings({
  policy,
  close,
}: {
  policy: Row | null;
  close: () => void;
}) {
  const write = useWrite();
  const [error, setError] = useState<unknown>(),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="tracking-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        setBusy(true);
        setError(undefined);
        try {
          await write(TrackingCommandDocument, {
            operation: "settings",
            input: {
              expectedVersion: policy?.version ?? 0,
              enabled: form.get("enabled") === "on",
              mode: form.get("mode"),
              sampleSeconds: Number(form.get("sampleSeconds")),
              staleSeconds: Number(form.get("staleSeconds")),
              notice: form.get("notice"),
              reason: form.get("reason"),
            },
          });
          close();
        } catch (e) {
          setError(e);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="tracking-checkbox">
        <input
          type="checkbox"
          name="enabled"
          defaultChecked={policy?.enabled ?? false}
        />{" "}
        Enable automatic sharing for assigned duty windows
      </label>
      <label>
        Duty window
        <select name="mode" defaultValue={policy?.mode ?? "roster"}>
          <option value="roster">HR-assigned shift times</option>
          <option value="checked_in">
            Verified check-in within assigned shift
          </option>
        </select>
      </label>
      <label>
        Sample interval (seconds)
        <input
          name="sampleSeconds"
          type="number"
          min="15"
          max="300"
          required
          defaultValue={policy?.sample_seconds ?? 30}
        />
        <small>
          Stationary and low-battery devices use fewer updates, capped at half
          the stale threshold.
        </small>
      </label>
      <label>
        Mark signal stale after (seconds)
        <input
          name="staleSeconds"
          type="number"
          min="30"
          max="1800"
          required
          defaultValue={policy?.stale_seconds ?? 120}
        />
        <small>At least twice the sample interval.</small>
      </label>
      <label>
        Employee disclosure
        <textarea
          name="notice"
          minLength={20}
          maxLength={2000}
          required
          defaultValue={
            policy?.notice ??
            "During HR-assigned duty windows, your device shares location with authorized HR staff for duty coordination. Sharing stops outside the duty window. You can see and disable sharing in the app."
          }
        />
      </label>
      <label>
        Reason for this change
        <textarea name="reason" minLength={8} maxLength={1000} required />
      </label>
      <p>
        Employees enable device permissions once. New disclosure text requires
        acknowledgement again. Keep the app available at shift start; OS
        suspension and force-stop can cause missing readings.
      </p>
      {error != null && (
        <div role="alert">
          {error instanceof Error ? error.message : String(error)}
        </div>
      )}
      <Button type="submit" disabled={busy}>
        {busy ? "Saving…" : "Save tracking settings"}
      </Button>
    </form>
  );
}
function TrackingRoute({
  roster,
  fence,
  nowMs,
  status,
}: {
  roster: Row;
  fence: any;
  nowMs: number;
  status: string;
}) {
  const [cursor, setCursor] = useState<Row>(),
    [points, setPoints] = useState<Row[]>([]);
  const [rowsShown, setRowsShown] = useState(100);
  const q = useScopedQuery<any>(
    ["tracking-route", roster.id, "latest"],
    TrackingMonitorDocument,
    { input: { rosterId: roster.id } },
    true,
    15000,
  );
  const older = useScopedQuery<any>(
    ["tracking-route", roster.id, "older", cursor],
    TrackingMonitorDocument,
    {
      input: {
        rosterId: roster.id,
        ...(cursor ? { sampleAfter: cursor } : {}),
      },
    },
    !!cursor,
  );
  const data = (cursor ? older.data : q.data)?.trackingMonitor;
  useEffect(() => {
    const batches = [
      q.data?.trackingMonitor,
      older.data?.trackingMonitor,
    ].filter(Boolean);
    if (batches.length)
      setPoints((old) => {
        const all = new Map(old.map((p) => [p.id, p]));
        for (const batch of batches)
          for (const p of batch.points) all.set(p.id, p);
        return [...all.values()].sort(
          (a, b) =>
            Date.parse(a.observed_at) - Date.parse(b.observed_at) ||
            a.id.localeCompare(b.id),
        );
      });
  }, [q.data, older.data]);
  const current = q.data?.trackingMonitor;
  const latest = points.at(-1);
  const routeNow = current
    ? Date.parse(current.serverTime) + Math.max(0, Date.now() - q.dataUpdatedAt)
    : nowMs;
  const recent =
    latest &&
    current?.policy?.enabled &&
    status === "fresh" &&
    !q.error &&
    Date.now() - q.dataUpdatedAt <= 30000 &&
    latest.roster_version === current.roster.version &&
    latest.policy_version === current.policy.version &&
    routeNow >= Date.parse(current.roster.starts_at) &&
    routeNow < Date.parse(current.roster.ends_at) &&
    routeNow - Date.parse(latest.observed_at) >= -5000 &&
    routeNow - Date.parse(latest.observed_at) <=
      current.policy.stale_seconds * 1000;
  if (q.isPending && !points.length) return <Skeleton />;
  return (
    <>
      <p>
        {when(roster.starts_at)} – {when(roster.ends_at)}
      </p>
      {q.error && <ErrorState error={q.error} retry={() => void q.refetch()} />}
      {older.error && (
        <ErrorState error={older.error} retry={() => void older.refetch()} />
      )}
      <Suspense
        fallback={
          <div className="tracking-map-loading">Loading route map…</div>
        }
      >
        <DutyMap
          points={points as any}
          fence={fence}
          history
          nowMs={routeNow}
          livePoint={
            latest
              ? ({
                  ...latest,
                  label: roster.display_name,
                  status: recent
                    ? "fresh"
                    : status === "idle"
                      ? "idle"
                      : "stale",
                } as any)
              : undefined
          }
        />
      </Suspense>
      <p>
        {points.length} received samples. The highlighted marker glides between
        fresh readings. Recorded dots remain at their original GPS coordinates.
      </p>
      {data?.next && (
        <Button
          disabled={older.isFetching}
          onClick={() => setCursor(data.next)}
        >
          Load older samples
        </Button>
      )}
      <Button variant="outline" onClick={() => void q.refetch()}>
        Refresh route
      </Button>
      <div className="tracking-table">
        <table>
          <thead>
            <tr>
              <th>Observed</th>
              <th>Coordinates</th>
              <th>Accuracy / boundary</th>
            </tr>
          </thead>
          <tbody>
            {points
              .slice(-rowsShown)
              .reverse()
              .map((p) => (
                <tr key={p.id}>
                  <td>
                    {when(p.observed_at)}
                    <small>
                      Received {when(p.received_at)}
                      {Date.parse(p.received_at) - Date.parse(p.observed_at) >
                      120000
                        ? " · Delayed sync"
                        : ""}
                    </small>
                  </td>
                  <td>
                    {p.latitude.toFixed(5)}, {p.longitude.toFixed(5)}
                  </td>
                  <td>
                    ±{Math.round(p.accuracy_m)} m · {p.classification}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {points.length > rowsShown && (
        <Button variant="outline" onClick={() => setRowsShown(rowsShown + 100)}>
          Show more table rows
        </Button>
      )}
    </>
  );
}
