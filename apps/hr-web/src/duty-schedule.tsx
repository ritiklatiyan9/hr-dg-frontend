import { useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import {
  OperateDocument,
  EmployeesDocument,
  FoundationDocument,
} from "@/shared/contracts/generated";
import { useScope, useScopedQuery, useWrite } from "./workspace-context";
import { ErrorState } from "./ui";
import { Button } from "./components/ui/button";
import "./tracking.css";
type Row = Record<string, any>;
export type SchedulePerson = { id: string; name: string };
const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const addDays = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000)
    .toISOString()
    .slice(0, 10);
/** HR picks one shift time for one or many employees and days in one save.
 *  Each saved day is a dated duty window: attendance and live tracking use it.
 *  `people` fixes the selection (an employee profile); `afterSave` adds a step
 *  such as recording the profile's default shift. */
export function DutySchedule({
  close,
  trackingOn,
  people,
  shiftId,
  afterSave,
}: {
  close: () => void;
  trackingOn?: boolean;
  people?: SchedulePerson[];
  shiftId?: string;
  afterSave?: (shiftId: string) => Promise<void>;
}) {
  const scope = useScope();
  const write = useWrite();
  const [search, setSearch] = useState(""),
    [picked, setPicked] = useState<Map<string, string>>(
      () => new Map(people?.map((p) => [p.id, p.name])),
    ),
    [days, setDays] = useState([1, 2, 3, 4, 5, 6]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(),
    [warning, setWarning] = useState(""),
    [done, setDone] = useState<Row | null>(null);
  const setup = useScopedQuery<any>(["foundation"], FoundationDocument);
  const list = useScopedQuery<any>(
    ["duty-schedule-people", search],
    EmployeesDocument,
    { first: 50, ...(search ? { search } : {}) },
    !people,
  );
  const shifts: Row[] = (setup.data?.foundation?.references ?? []).filter(
    (r: Row) => r.kind === "shift" && r.active,
  );
  const nodes: Row[] = list.data?.employees?.nodes ?? [];
  const toggle = (id: string, name: string, on: boolean) =>
    setPicked((old) => {
      const next = new Map(old);
      if (on) next.set(id, name);
      else next.delete(id);
      return next;
    });
  if (done)
    return (
      <div className="tracking-form">
        <p>
          <strong>
            Duty time saved for {done.assigned} employee-day
            {done.assigned === 1 ? "" : "s"}.
          </strong>
        </p>
        {done.holidays?.length > 0 && (
          <p>
            {done.holidays.length} site holiday
            {done.holidays.length === 1 ? " was" : "s were"} left free:{" "}
            {done.holidays.join(", ")}.
          </p>
        )}
        {done.skipped.length > 0 && (
          <div role="alert">
            {done.skipped.length} day(s) were skipped because they overlap
            another shift:{" "}
            {done.skipped
              .slice(0, 10)
              .map(
                (s: Row) =>
                  `${picked.get(s.employeeId) ?? "?"} (${s.workDate})`,
              )
              .join(", ")}
            {done.skipped.length > 10 ? "…" : ""}
          </div>
        )}
        {warning && <div role="alert">{warning}</div>}
        <p>
          {trackingOn === false
            ? "Automatic sharing is currently disabled. Enable it in Tracking settings so phones share location during duty time."
            : "Employees who enabled duty location in the app share their position automatically during this time."}
        </p>
        <Button onClick={close}>Done</Button>
      </div>
    );
  if (setup.error)
    return (
      <ErrorState error={setup.error} retry={() => void setup.refetch()} />
    );
  return (
    <form
      className="tracking-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        const shift = String(form.get("shiftId"));
        setBusy(true);
        setError(undefined);
        try {
          const r = await write<any>(OperateDocument, {
            operation: "rosterRange",
            input: {
              employeeIds: [...picked.keys()],
              shiftId: shift,
              fromDate: form.get("fromDate"),
              toDate: form.get("toDate"),
              weekdays: days,
            },
          });
          if (afterSave)
            await afterSave(shift).catch((x: Error) =>
              setWarning(
                `Duty time is saved, but the profile shift was not updated: ${x.message}`,
              ),
            );
          setDone(r.operate);
        } catch (e) {
          setError(e);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        Shift time
        <select
          name="shiftId"
          required
          disabled={setup.isPending}
          defaultValue={shiftId}
          key={setup.isPending ? "loading" : "ready"}
        >
          {shifts.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.startTime ? ` · ${s.startTime} – ${s.endTime}` : ""}
            </option>
          ))}
        </select>
        <small>
          {setup.isPending
            ? "Loading shift times…"
            : !shifts.length
              ? "No shift times yet. "
              : "Need another time? "}
          <Link to="/shifts">Create or edit shift times</Link>
        </small>
      </label>
      <div className="tracking-date-range">
        <label>
          From
          <input
            name="fromDate"
            type="date"
            required
            min={scope.workDate}
            defaultValue={scope.workDate}
          />
        </label>
        <label>
          To
          <input
            name="toDate"
            type="date"
            required
            min={scope.workDate}
            max={addDays(scope.workDate, 62)}
            defaultValue={addDays(scope.workDate, people ? 27 : 6)}
          />
        </label>
      </div>
      <fieldset className="tracking-weekdays">
        <legend>Working days</legend>
        {weekdays.map((d, i) => (
          <label key={d}>
            <input
              type="checkbox"
              checked={days.includes(i)}
              onChange={(e) =>
                setDays(
                  e.target.checked
                    ? [...days, i].sort()
                    : days.filter((x) => x !== i),
                )
              }
            />
            {d}
          </label>
        ))}
      </fieldset>
      {people ? (
        <p>
          <strong>Employee:</strong> {people.map((p) => p.name).join(", ")}
        </p>
      ) : (
        <fieldset className="tracking-people">
          <legend>Employees · {picked.size} selected</legend>
          <label className="tracking-search">
            <Search size={16} />
            <input
              aria-label="Search employees to schedule"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employees…"
            />
          </label>
          {list.error ? (
            <ErrorState error={list.error} retry={() => void list.refetch()} />
          ) : (
            <div className="tracking-people-list">
              {nodes.length > 0 && (
                <label>
                  <input
                    type="checkbox"
                    checked={nodes.every((n) => picked.has(n.id))}
                    onChange={(e) =>
                      nodes.forEach((n) =>
                        toggle(n.id, n.displayName, e.target.checked),
                      )
                    }
                  />
                  <strong>Select all shown ({nodes.length})</strong>
                </label>
              )}
              {nodes.map((n) => (
                <label key={n.id}>
                  <input
                    type="checkbox"
                    checked={picked.has(n.id)}
                    onChange={(e) =>
                      toggle(n.id, n.displayName, e.target.checked)
                    }
                  />
                  {n.displayName}
                  {n.employeeCode && <small>{n.employeeCode}</small>}
                </label>
              ))}
              {list.isPending && <small>Loading employees…</small>}
              {!list.isPending && !nodes.length && (
                <small>No employees match.</small>
              )}
            </div>
          )}
        </fieldset>
      )}
      <p>
        Saving replaces any existing shift on the chosen days; site holidays
        stay free. Phones start sharing location at the start time and stop at
        the end time.
      </p>
      {error != null && (
        <div role="alert">
          {error instanceof Error ? error.message : String(error)}
        </div>
      )}
      <Button
        type="submit"
        disabled={busy || !picked.size || !days.length || !shifts.length}
      >
        {busy
          ? "Saving…"
          : people?.length === 1
            ? `Save duty time for ${people[0].name}`
            : `Save duty time for ${picked.size} employee(s)`}
      </Button>
    </form>
  );
}
