/** Conservative client prompt only. PostGIS remains authoritative for acceptance. */
export function verifiedInside(
  fence: any,
  location: any,
  rules: any,
  now = Date.now(),
): boolean {
  if (
    !location ||
    location.mocked ||
    !Number.isFinite(location.accuracyM) ||
    location.accuracyM < 0 ||
    location.accuracyM > rules?.maxAccuracyM ||
    Math.abs(now - Date.parse(location.observedAt)) >
      Math.min(rules?.freshnessSeconds ?? 5, 15) * 1000
  )
    return false;
  if (fence?.type !== "Polygon" || fence.coordinates.length !== 1) return false;
  const ring = fence.coordinates[0] as number[][];
  if (ring.length < 4) return false;
  const scale = Math.cos((location.latitude * Math.PI) / 180);
  let inside = false;
  for (let i = 1; i < ring.length; i++) {
    const [a, b] = [ring[i - 1]!, ring[i]!];
    if (Math.abs(a[0]! - b[0]!) > 180) return false;
    const ax = (a[0]! - location.longitude) * 111320 * scale,
      ay = (a[1]! - location.latitude) * 110574;
    const bx = (b[0]! - location.longitude) * 111320 * scale,
      by = (b[1]! - location.latitude) * 110574;
    const dx = bx - ax,
      dy = by - ay;
    const t = Math.max(
      0,
      Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy || 1)),
    );
    if (Math.hypot(ax + t * dx, ay + t * dy) <= location.accuracyM + 3)
      return false;
    if (ay > 0 !== by > 0 && ((bx - ax) * -ay) / (by - ay) + ax > 0)
      inside = !inside;
  }
  return inside;
}
