import type { KeyboardEvent, ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  RefreshCw,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/** The review-desk layout (see AttendanceReviewDesk and the `.rd-*` rules in
 * design-system.css): header, KPI strip, queue table + persistent inspector. */
export type Tone = "success" | "warning" | "danger" | "neutral";

export function Desk({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <section className="review-desk" aria-label={label}>
      {children}
    </section>
  );
}

export function DeskHeader({
  crumb,
  title,
  subtitle,
  children,
}: {
  crumb: string;
  title: string;
  subtitle?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="rd-header">
      <div className="rd-title">
        <span className="rd-crumb">{crumb}</span>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children && <div className="rd-datebar">{children}</div>}
    </header>
  );
}

/** Joined [‹][period][›] control. `children` is the middle button or popover. */
export function DeskStepper({
  label,
  onPrevious,
  onNext,
  previousDisabled,
  nextDisabled,
  children,
}: {
  label: string;
  onPrevious: () => void;
  onNext: () => void;
  previousDisabled?: boolean;
  nextDisabled?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="rd-stepper" role="group" aria-label={label}>
      <button
        type="button"
        aria-label={`Previous ${label.toLowerCase()}`}
        disabled={previousDisabled}
        onClick={onPrevious}
      >
        <ChevronLeft size={16} />
      </button>
      {children}
      <button
        type="button"
        aria-label={`Next ${label.toLowerCase()}`}
        disabled={nextDisabled}
        onClick={onNext}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

export function DeskRefresh({
  label,
  fetching,
  onClick,
}: {
  label: string;
  fetching?: boolean;
  onClick: () => void;
}) {
  return (
    <Button variant="outline" size="icon" aria-label={label} onClick={onClick}>
      <RefreshCw size={15} className={fetching ? "animate-spin" : ""} />
    </Button>
  );
}

export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className="rd-pill" data-tone={tone}>
      {children}
    </span>
  );
}

/** One bordered strip: KPI cells, then an optional wide muted context cell. */
export function DeskKpis({
  label,
  items,
  context,
}: {
  label: string;
  items: { label: string; value: ReactNode; tone: Tone }[];
  context?: {
    icon: LucideIcon;
    title: ReactNode;
    text?: ReactNode;
    pill?: { tone: Tone; label: ReactNode };
  };
}) {
  return (
    <div
      className="rd-kpis"
      aria-label={label}
      style={
        items.length === 4
          ? undefined
          : {
              gridTemplateColumns: `repeat(${items.length}, minmax(110px, 1fr))${context ? " minmax(320px, 2.4fr)" : ""}`,
            }
      }
    >
      {items.map((item) => (
        <div className="rd-kpi" key={item.label}>
          <span className="rd-kpi-label">
            <i data-tone={item.tone} aria-hidden="true" />
            {item.label}
          </span>
          <strong>{item.value}</strong>
        </div>
      ))}
      {context && (
        <div className="rd-authority">
          <context.icon size={18} aria-hidden="true" />
          <div>
            <strong>{context.title}</strong>
            {context.text && <span>{context.text}</span>}
          </div>
          {context.pill && (
            <Pill tone={context.pill.tone}>{context.pill.label}</Pill>
          )}
        </div>
      )}
    </div>
  );
}

export function DeskWorkspace({ children }: { children: ReactNode }) {
  return <div className="rd-workspace">{children}</div>;
}

/** Queue column: segmented control with counts, search, then the table. */
export function DeskQueue<S extends string>({
  label,
  segments,
  segment,
  onSegment,
  search,
  onSearch,
  searchPlaceholder,
  toolbar,
  children,
}: {
  label: string;
  segments?: { id: S; label: string; count?: number }[];
  segment?: S;
  onSegment?: (id: S) => void;
  search?: string;
  onSearch?: (value: string) => void;
  searchPlaceholder?: string;
  toolbar?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rd-queue">
      <div className="rd-toolbar flex-wrap">
        {segments ? (
          <div
            className="rd-segment max-w-full flex-wrap"
            role="tablist"
            aria-label={label}
          >
            {segments.map((s) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                className="whitespace-nowrap"
                aria-label={s.label}
                aria-selected={segment === s.id}
                onClick={() => onSegment?.(s.id)}
              >
                {s.label}
                {s.count !== undefined && <span>{s.count}</span>}
              </button>
            ))}
          </div>
        ) : (
          <span />
        )}
        <div className="ml-auto flex min-w-[160px] flex-1 flex-wrap items-center justify-end gap-2">
          {toolbar}
          {onSearch && (
            <label className="rd-search max-w-[240px] min-w-[160px] flex-1">
              <Search size={14} aria-hidden="true" />
              <input
                type="search"
                value={search ?? ""}
                onChange={(e) => onSearch(e.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder ?? "Search"}
              />
            </label>
          )}
        </div>
      </div>
      <div className="rd-table-wrap">{children}</div>
    </div>
  );
}

export type DeskColumn<T> = {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
  /** Makes the header a sort button; the sort lives in the URL as `sort=id:dir`. */
  sortValue?: (row: T) => string | number;
};

/** Dense selectable table; arrow keys move the selection. */
export function DeskTable<T>({
  label,
  columns,
  rows,
  getId,
  selectedId,
  onSelect,
  loading = false,
  empty,
}: {
  label: string;
  columns: DeskColumn<T>[];
  rows: T[];
  getId: (row: T) => string;
  selectedId?: string | null;
  onSelect: (id: string) => void;
  loading?: boolean;
  empty?: ReactNode;
}) {
  const [params, setParams] = useSearchParams();
  const [sortId, direction] = (params.get("sort") ?? "").split(":");
  const sortColumn = columns.find((c) => c.id === sortId && c.sortValue);
  if (sortColumn) {
    const value = sortColumn.sortValue!;
    rows = [...rows].sort((a, b) => {
      const x = value(a),
        y = value(b);
      const order =
        typeof x === "number" && typeof y === "number"
          ? x - y
          : String(x).localeCompare(String(y));
      return direction === "desc" ? -order : order;
    });
  }
  const toggleSort = (id: string) => {
    // Read the live hash URL: a quick second click can land before React has
    // re-rendered with the first click's sort.
    const n = new URLSearchParams(location.hash.split("?")[1] ?? "");
    const [liveId, liveDirection] = (n.get("sort") ?? "").split(":");
    if (liveId !== id) n.set("sort", `${id}:asc`);
    else if (liveDirection !== "desc") n.set("sort", `${id}:desc`);
    else n.delete("sort");
    setParams(n);
  };
  const move = (e: KeyboardEvent<HTMLTableRowElement>, id: string) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(id);
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const index = rows.findIndex((r) => getId(r) === id);
    const next = rows[index + (e.key === "ArrowDown" ? 1 : -1)];
    if (!next) return;
    onSelect(getId(next));
    (
      (e.key === "ArrowDown"
        ? e.currentTarget.nextElementSibling
        : e.currentTarget.previousElementSibling) as HTMLElement | null
    )?.focus();
  };
  return (
    <>
      <table className="rd-table" aria-label={label}>
        <thead>
          <tr>
            {columns.map((c) => {
              const sorted = sortColumn?.id === c.id ? direction : undefined;
              return (
                <th
                  key={c.id}
                  className={c.className}
                  aria-sort={
                    sorted === "asc"
                      ? "ascending"
                      : sorted === "desc"
                        ? "descending"
                        : undefined
                  }
                >
                  {c.sortValue ? (
                    <button
                      type="button"
                      className="hover:text-foreground -ml-1 inline-flex items-center gap-1 rounded px-1"
                      onClick={() => toggleSort(c.id)}
                    >
                      {c.header}
                      {sorted === "asc" ? (
                        <ArrowUp className="size-3" />
                      ) : sorted === "desc" ? (
                        <ArrowDown className="size-3" />
                      ) : (
                        <ChevronsUpDown className="size-3 opacity-50" />
                      )}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {loading
            ? [0, 1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="rd-skeleton-row">
                  <td colSpan={columns.length}>
                    <span />
                  </td>
                </tr>
              ))
            : rows.map((row) => {
                const id = getId(row);
                return (
                  <tr
                    key={id}
                    aria-selected={selectedId === id}
                    tabIndex={0}
                    onClick={() => onSelect(id)}
                    onKeyDown={(e) => move(e, id)}
                  >
                    {columns.map((c) => (
                      <td key={c.id} className={c.className}>
                        {c.cell(row)}
                      </td>
                    ))}
                  </tr>
                );
              })}
        </tbody>
      </table>
      {!loading && rows.length === 0 && empty}
    </>
  );
}

export function DeskEmpty({
  icon: Icon,
  title,
  hint,
  className,
}: {
  icon: LucideIcon;
  title: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rd-empty ${className ?? ""}`}>
      <Icon size={22} aria-hidden="true" />
      <strong>{title}</strong>
      {hint && <span>{hint}</span>}
    </div>
  );
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

export function Person({
  name,
  sub,
  large = false,
}: {
  name: string;
  sub?: ReactNode;
  large?: boolean;
}) {
  return (
    <div className="rd-person">
      <span
        className={large ? "rd-avatar rd-avatar-lg" : "rd-avatar"}
        aria-hidden="true"
      >
        {initials(name)}
      </span>
      <span>
        <strong>{name}</strong>
        {sub && <small>{sub}</small>}
      </span>
    </div>
  );
}

/** Persistent inspector: header, bordered sections, sticky action bar. */
export function Inspector({
  label,
  head,
  children,
  actions,
  empty,
}: {
  label: string;
  head?: { title: string; sub?: ReactNode; pill?: ReactNode; avatar?: boolean };
  children?: ReactNode;
  actions?: ReactNode;
  empty?: ReactNode;
}) {
  return (
    <aside
      className={head ? "rd-inspector" : "rd-inspector max-[860px]:hidden"}
      aria-label={label}
    >
      {head ? (
        <>
          <div className="rd-inspector-head">
            {head.avatar !== false && (
              <span className="rd-avatar rd-avatar-lg" aria-hidden="true">
                {initials(head.title)}
              </span>
            )}
            <div>
              <h2>{head.title}</h2>
              {head.sub && <p>{head.sub}</p>}
            </div>
            {head.pill}
          </div>
          <div className="rd-inspector-body">{children}</div>
          {actions && <div className="rd-actions">{actions}</div>}
        </>
      ) : (
        empty
      )}
    </aside>
  );
}

export function InspectorSection({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <h3>{title}</h3>
      {children}
    </section>
  );
}

export function Facts({
  items,
}: {
  items: { label: string; value: ReactNode; span?: boolean }[];
}) {
  return (
    <dl className="rd-facts">
      {items.map((item) => (
        <div key={item.label} className={item.span ? "rd-span" : undefined}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Timeline({
  items,
}: {
  items: {
    id: string;
    title: ReactNode;
    meta?: ReactNode;
    tone?: Tone;
    note?: ReactNode;
  }[];
}) {
  return (
    <ol className="rd-timeline">
      {items.map((item) => (
        <li key={item.id} data-tone={item.tone}>
          <strong>{item.title}</strong>
          {item.meta && <span>{item.meta}</span>}
          {item.note && <p>{item.note}</p>}
        </li>
      ))}
    </ol>
  );
}
