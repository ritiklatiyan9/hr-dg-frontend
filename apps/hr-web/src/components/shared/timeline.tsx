import type { ReactNode } from "react";
import { Empty } from "../../ui";
export function Timeline({
  items,
  empty = "No history yet",
}: {
  items: {
    id: string;
    title: ReactNode;
    detail?: ReactNode;
    metadata?: ReactNode;
    action?: ReactNode;
  }[];
  empty?: string;
}) {
  if (!items.length) return <Empty title={empty} />;
  return (
    <div className="timeline" role="list">
      {items.map((item) => (
        <article key={item.id} role="listitem">
          <span className="timeline-dot" aria-hidden="true" />
          <div>
            <strong>{item.title}</strong>
            {item.detail && <p>{item.detail}</p>}
            {item.metadata && <small className="muted">{item.metadata}</small>}
            {item.action}
          </div>
        </article>
      ))}
    </div>
  );
}
