export type Pt = [number, number]; // [longitude, latitude], GeoJSON order

/** Closed ring around a centre. ponytail: flat-earth offsets, accurate within the 5 km radius cap. */
export function circle([lng, lat]: Pt, radiusM: number, n = 32): Pt[] {
  const dLat = radiusM / 111320,
    dLng = dLat / Math.cos((lat * Math.PI) / 180);
  const ring = Array.from({ length: n }, (_, i): Pt => {
    const a = (2 * Math.PI * i) / n;
    return [
      +(lng + dLng * Math.cos(a)).toFixed(7),
      +(lat + dLat * Math.sin(a)).toFixed(7),
    ];
  });
  return [...ring, ring[0]!];
}
/** One point = circle with radius; three or more = polygon corners. */
export function boundary(points: Pt[], radiusM: number): Pt[] | null {
  const [first] = points;
  if (points.length === 1) return circle(first!, radiusM);
  return points.length >= 3 ? [...points, first!] : null;
}
