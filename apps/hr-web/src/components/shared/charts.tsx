import { useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

// ponytail: hand-drawn SVG instead of a chart library; the dashboard needs
// two chart shapes. Add a library if richer charting (zoom, brushing) is asked for.

/** Axis for counts: four integer steps of 1/2/5 × 10^k covering `max`. */
export function countAxis(max: number) {
  const raw = Math.max(max, 1) / 4,
    p = 10 ** Math.floor(Math.log10(raw));
  const step = Math.max(
    1,
    [1, 2, 2.5, 5, 10]
      .map((m) => m * p)
      .find((s) => s >= raw && Number.isInteger(s))!,
  );
  return { step, max: step * 4 };
}
const shortDay = (day: string) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
function useWidth() {
  const ref = useRef<HTMLDivElement>(null),
    [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e!.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

export type Series = {
  key: string;
  label: string;
  /** Text-color utility; marks draw with currentColor. */
  color: string;
  kind: "line" | "column";
};
/** Daily values on one count axis: columns and/or 2px lines, crosshair tooltip. */
export function DayChart({
  data,
  series,
  label,
  height = 200,
}: {
  data: ({ day: string } & Record<string, number | string>)[];
  series: Series[];
  label: string;
  height?: number;
}) {
  const [ref, width] = useWidth(),
    [hover, setHover] = useState<number | null>(null);
  const pad = { l: 36, r: 12, t: 10, b: 24 },
    w = Math.max(width - pad.l - pad.r, 1),
    h = height - pad.t - pad.b,
    band = w / data.length,
    axis = countAxis(
      Math.max(...data.flatMap((d) => series.map((s) => Number(d[s.key])))),
    ),
    x = (i: number) => pad.l + band * (i + 0.5),
    y = (v: number) => pad.t + h - (v / axis.max) * h,
    every = Math.ceil(data.length / Math.max(1, Math.floor(w / 56)));
  const columns = series.filter((s) => s.kind === "column"),
    colW = Math.min(24, (band * 0.64) / Math.max(columns.length, 1));
  return (
    <div ref={ref} className="relative min-w-0">
      {series.length > 1 && (
        <ul className="text-muted-foreground mb-2 flex flex-wrap gap-4 text-xs">
          {series.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <span
                className={cn(
                  "inline-block",
                  s.color,
                  s.kind === "line" ? "h-0.5 w-3.5" : "size-2.5 rounded-sm",
                )}
                style={{ background: "currentColor" }}
              />
              {s.label}
            </li>
          ))}
        </ul>
      )}
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={label}
          className="block overflow-visible"
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const i = Math.floor((e.clientX - r.left - pad.l) / band);
            setHover(i >= 0 && i < data.length ? i : null);
          }}
          onPointerLeave={() => setHover(null)}
        >
          {[0, 1, 2, 3, 4].map((k) => (
            <g key={k}>
              <line
                x1={pad.l}
                x2={pad.l + w}
                y1={y(k * axis.step)}
                y2={y(k * axis.step)}
                className={k ? "stroke-border" : "stroke-input"}
                strokeWidth={1}
              />
              <text
                x={pad.l - 8}
                y={y(k * axis.step)}
                dy="0.32em"
                textAnchor="end"
                className="fill-muted-foreground text-[10px] tabular-nums"
              >
                {(k * axis.step).toLocaleString()}
              </text>
            </g>
          ))}
          {data.map((d, i) =>
            i % every === (data.length - 1) % every ? (
              <text
                key={d.day}
                x={x(i)}
                y={height - 6}
                textAnchor="middle"
                className="fill-muted-foreground text-[10px]"
              >
                {shortDay(d.day)}
              </text>
            ) : null,
          )}
          {hover !== null && (
            <rect
              x={pad.l + band * hover}
              y={pad.t}
              width={band}
              height={h}
              className="fill-muted"
            />
          )}
          {columns.map((s, si) =>
            data.map((d, i) => {
              const v = Number(d[s.key]);
              if (!v) return null;
              const top = y(v),
                left = x(i) - (colW * columns.length) / 2 + si * colW + 1,
                cw = colW - 2,
                r = Math.min(4, cw / 2, y(0) - top);
              return (
                <path
                  key={`${s.key}${i}`}
                  className={s.color}
                  fill="currentColor"
                  d={`M${left},${y(0)}V${top + r}q0,-${r} ${r},-${r}h${cw - 2 * r}q${r},0 ${r},${r}V${y(0)}Z`}
                />
              );
            }),
          )}
          {series
            .filter((s) => s.kind === "line")
            .map((s) => (
              <g key={s.key} className={s.color}>
                <polyline
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={data
                    .map((d, i) => `${x(i)},${y(Number(d[s.key]))}`)
                    .join(" ")}
                />
                {[hover ?? data.length - 1].map((i) => (
                  <circle
                    key={i}
                    cx={x(i)}
                    cy={y(Number(data[i]![s.key]))}
                    r={4}
                    fill="currentColor"
                    className="stroke-card"
                    strokeWidth={2}
                  />
                ))}
              </g>
            ))}
        </svg>
      )}
      {hover !== null && width > 0 && (
        <div
          className="bg-popover text-popover-foreground pointer-events-none absolute z-10 min-w-32 rounded-md border px-3 py-2 text-xs shadow-md"
          style={{
            top: 8,
            left: Math.min(x(hover) + 12, width - 150),
          }}
        >
          <p className="mb-1 font-medium">{shortDay(data[hover]!.day)}</p>
          {series.map((s) => (
            <p key={s.key} className="flex items-center gap-2">
              <span
                className={cn("size-2 rounded-sm", s.color)}
                style={{ background: "currentColor" }}
              />
              <span className="text-muted-foreground flex-1">{s.label}</span>
              <span className="font-medium tabular-nums">
                {Number(data[hover]![s.key]).toLocaleString()}
              </span>
            </p>
          ))}
        </div>
      )}
      <table className="sr-only">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th>Date</th>
            {series.map((s) => (
              <th key={s.key}>{s.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.day}>
              <td>{d.day}</td>
              {series.map((s) => (
                <td key={s.key}>{d[s.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Ranked magnitudes as labelled horizontal bars; values are printed, so no tooltip. */
export function BarList({
  rows,
  format = (v) => v.toLocaleString(),
  empty,
}: {
  rows: { name: string; value: number; to?: string }[];
  format?: (v: number) => string;
  empty: string;
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  if (!rows.some((r) => r.value > 0))
    return (
      <p className="text-muted-foreground py-6 text-center text-sm">{empty}</p>
    );
  return (
    <ul className="grid gap-3">
      {rows.map((r) => {
        const body = (
          <>
            <span className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate">{r.name}</span>
              <span className="font-medium tabular-nums">
                {format(r.value)}
              </span>
            </span>
            <span className="bg-muted mt-1.5 block h-2 rounded-full">
              <span
                className="bg-primary block h-2 rounded-full"
                style={{ width: `${(r.value / max) * 100}%` }}
              />
            </span>
          </>
        );
        return (
          <li key={r.name}>
            {r.to ? (
              <Link to={r.to} className="block rounded-sm hover:opacity-80">
                {body}
              </Link>
            ) : (
              body
            )}
          </li>
        );
      })}
    </ul>
  );
}
