/** Display-only interpolation. Never extrapolate or change stored GPS evidence. */
export type MotionFix = {
  latitude: number;
  longitude: number;
  accuracy_m: number;
  observed_at: string;
  received_at?: string;
  status?: string;
};
export type Position = [number, number];
type Render = (
  position: Position,
  bearing: number | undefined,
  moving: boolean,
) => void;
type Clock = {
  now: () => number;
  request: (callback: (time: number) => void) => number;
  cancel: (id: number) => void;
};
type Track = {
  fix: MotionFix;
  position: Position;
  bearing?: number;
  render: Render;
  flight?: {
    from: Position;
    to: Position;
    headingFrom?: number;
    headingTo?: number;
    start: number;
    duration: number;
  };
};
const rad = Math.PI / 180;
export const turn = (from: number, to: number) =>
  ((((to - from) % 360) + 540) % 360) - 180;
export function distance(a: MotionFix, b: MotionFix) {
  const h =
    Math.sin(((b.latitude - a.latitude) * rad) / 2) ** 2 +
    Math.cos(a.latitude * rad) *
      Math.cos(b.latitude * rad) *
      Math.sin(((b.longitude - a.longitude) * rad) / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}
export function motionPlan(a: MotionFix, b: MotionFix, now: number) {
  const elapsed = Date.parse(b.observed_at) - Date.parse(a.observed_at);
  const lag = (p: MotionFix) =>
    Date.parse(p.received_at ?? "") - Date.parse(p.observed_at);
  const age = now - Date.parse(b.observed_at);
  const metres = distance(a, b);
  const precise = [a.accuracy_m, b.accuracy_m].every(
    (n) => Number.isFinite(n) && n >= 0 && n <= 100,
  );
  const timely = [a, b].every((p) => lag(p) >= -5000 && lag(p) <= 30000);
  const eligible =
    a.status === "fresh" &&
    b.status === "fresh" &&
    precise &&
    timely &&
    age >= -5000 &&
    age <= 90000 &&
    elapsed > 0 &&
    elapsed <= 90000 &&
    metres <= 2000 &&
    metres / (elapsed / 1000) <= 75 &&
    Math.abs(b.longitude - a.longitude) <= 180;
  // A tiny displacement is GPS uncertainty, not evidence of a new heading.
  const noise = Math.max(
    3,
    Math.min(15, Math.hypot(a.accuracy_m, b.accuracy_m) * 0.35),
  );
  if (!eligible || metres <= noise) return { duration: 0, bearing: undefined };
  const lon = (b.longitude - a.longitude) * rad;
  const bearing =
    (Math.atan2(
      Math.sin(lon) * Math.cos(b.latitude * rad),
      Math.cos(a.latitude * rad) * Math.sin(b.latitude * rad) -
        Math.sin(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.cos(lon),
    ) /
      rad +
      360) %
    360;
  return {
    duration: Math.min(2500, 900 + Math.sqrt(metres) * 100),
    bearing:
      metres > Math.max(5, Math.hypot(a.accuracy_m, b.accuracy_m))
        ? bearing
        : undefined,
  };
}

/** One frame scheduler per map, including retargets, cancellation and teardown. */
export class DutyMotion {
  private tracks = new Map<string, Track>();
  private frame?: number;
  constructor(private clock: Clock) {}

  update(
    key: string,
    fix: MotionFix,
    render: Render,
    animate: boolean,
    now: number,
  ) {
    const previous = this.tracks.get(key);
    const to: Position = [fix.latitude, fix.longitude];
    if (!previous) {
      this.tracks.set(key, { fix, position: to, render });
      render(to, undefined, false);
      return;
    }
    previous.render = render;
    const order =
      Date.parse(fix.observed_at) - Date.parse(previous.fix.observed_at);
    // Late responses cannot rewind an employee marker. Status can still expire.
    if (order < 0) {
      if (!animate || fix.status !== "fresh") this.finish(previous);
      return;
    }
    const same =
      order === 0 &&
      fix.latitude === previous.fix.latitude &&
      fix.longitude === previous.fix.longitude;
    if (same) {
      previous.fix = fix;
      if (!animate || fix.status !== "fresh") this.finish(previous);
      render(previous.position, previous.bearing, !!previous.flight);
      this.cancelIfIdle();
      return;
    }
    const plan = motionPlan(previous.fix, fix, now);
    previous.fix = fix;
    if (!animate || !plan.duration) {
      previous.position = to;
      previous.bearing = undefined;
      previous.flight = undefined;
      render(to, undefined, false);
      this.cancelIfIdle();
      return;
    }
    previous.flight = {
      from: [...previous.position],
      to,
      headingFrom: previous.bearing ?? plan.bearing,
      headingTo: plan.bearing,
      start: this.clock.now(),
      duration: plan.duration,
    };
    // Retarget from the position actually on screen, never from the last endpoint.
    render(previous.position, previous.bearing ?? plan.bearing, true);
    this.schedule();
  }
  remove(key: string) {
    this.tracks.delete(key);
    this.cancelIfIdle();
  }
  settle() {
    for (const track of this.tracks.values()) this.finish(track);
    this.cancelIfIdle();
  }
  dispose() {
    this.tracks.clear();
    this.cancelIfIdle();
  }
  private finish(track: Track) {
    if (!track.flight) return;
    track.position = track.flight.to;
    track.bearing = track.flight.headingTo;
    track.flight = undefined;
    track.render(track.position, track.bearing, false);
  }
  private cancelIfIdle() {
    if (
      ![...this.tracks.values()].some((t) => t.flight) &&
      this.frame !== undefined
    ) {
      this.clock.cancel(this.frame);
      this.frame = undefined;
    }
  }
  private schedule() {
    if (this.frame !== undefined) return;
    this.frame = this.clock.request((now) => {
      this.frame = undefined;
      let pending = false;
      for (const track of this.tracks.values()) {
        const f = track.flight;
        if (!f) continue;
        const t = Math.max(0, Math.min(1, (now - f.start) / f.duration));
        // Quintic easing: zero velocity and acceleration at both endpoints.
        const ease = t * t * t * (t * (t * 6 - 15) + 10);
        track.position = [
          f.from[0] + (f.to[0] - f.from[0]) * ease,
          f.from[1] + (f.to[1] - f.from[1]) * ease,
        ];
        track.bearing =
          f.headingTo === undefined
            ? undefined
            : (f.headingFrom ?? f.headingTo) +
              turn(f.headingFrom ?? f.headingTo, f.headingTo) * ease;
        if (t === 1) this.finish(track);
        else {
          track.render(track.position, track.bearing, true);
          pending = true;
        }
      }
      if (pending) this.schedule();
    });
  }
}
