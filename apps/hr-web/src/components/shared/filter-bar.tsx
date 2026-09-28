import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "../ui/button";

/** Search text stays in memory; callers may put non-sensitive filters in the URL. */
export function FilterBar({
  children,
  active = [],
  onClear,
}: {
  children: ReactNode;
  active?: { key: string; label: string; remove: () => void }[];
  onClear?: () => void;
}) {
  return (
    <div className="filter-bar">
      <div className="toolbar">{children}</div>
      {!!active.length && (
        <div className="filter-chips" aria-label="Active filters">
          {active.map((f) => (
            <Button
              key={f.key}
              variant="outline"
              onClick={f.remove}
              aria-label={`Remove ${f.label}`}
            >
              {f.label}
              <X size={12} />
            </Button>
          ))}
          {onClear && (
            <Button variant="ghost" onClick={onClear}>
              Clear filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
