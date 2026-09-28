export type TrackingState =
  | "disabled"
  | "off_duty"
  | "missing"
  | "stale"
  | "idle"
  | "location_off"
  | "fresh";
type Clock = { now: number; staleSeconds: number };
const within = (value: string | Date | null | undefined, input: Clock) => {
  if (!value) return false;
  const age = input.now - new Date(value).getTime();
  return Number.isFinite(age) && age >= -5000 && age <= input.staleSeconds * 1000;
};
/** A location is an observation, never proof of attendance or inferred travel.
 *  `seenAt` is the phone's last contact (accepted upload or heartbeat): a still
 *  phone gets no new GPS fixes, so contact without a new fix is "idle", not lost. */
export function trackingStatus(
  input: Clock & {
    enabled: boolean;
    eligible: boolean;
    observedAt?: string | Date | null;
    seenAt?: string | Date | null;
    /** The latest contact was a heartbeat reporting device location turned off. */
    locationOff?: boolean;
  },
): TrackingState {
  if (!input.enabled) return "disabled";
  if (!input.eligible) return "off_duty";
  const seen = within(input.seenAt, input);
  if (seen && input.locationOff) return "location_off";
  if (!input.observedAt) return "missing";
  if (within(input.observedAt, input)) return "fresh";
  return seen ? "idle" : "stale";
}
