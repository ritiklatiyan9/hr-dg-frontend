import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DwrChatDocument,
  DwrCommandDocument,
} from "@/shared/contracts/generated";
import { gql } from "../api";
import {
  useScope,
  useScopedQuery,
  useWrite,
  type WorkspaceScope,
} from "../workspace-context";
export type Agent = {
  configured: boolean;
  online: boolean;
  model: string | null;
};
export type DayStatus = {
  workDate: string;
  report: {
    id: string;
    status: string;
    version: number;
    revision: number;
    origin: string;
  } | null;
  job: {
    status: string;
    dueAt: string | null;
    errorCode: string | null;
    preparedAt: string | null;
  } | null;
};
export type GroupRow = {
  id: string;
  name: string;
  description: string;
  version: number;
  createdAt: string;
  archived: boolean;
  role: "admin" | "member" | null;
  memberCount: number;
  unread: number;
  last: {
    body: string;
    deleted: boolean;
    at: string;
    userId: string;
    author: string | null;
  } | null;
};
export type ChatHome = {
  site: { name: string; timezone: string };
  workDate: string;
  agent: Agent;
  me: { userId: string; employeeId: string; name: string } | null;
  permissions: Record<
    | "post"
    | "edit"
    | "delete"
    | "createGroups"
    | "editGroups"
    | "moderate"
    | "oversee"
    | "review",
    boolean
  >;
  personal: {
    last: { body: string; deleted: boolean; at: string } | null;
    today: DayStatus & { messages: number };
  } | null;
  groups: GroupRow[];
};
export type Message = {
  id: string;
  groupId: string | null;
  userId: string;
  workDate: string;
  body: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  deletedByModerator: boolean;
  mine: boolean;
  canEdit: boolean;
  canDelete: boolean;
  /** Client-only state for optimistic sends. */
  pending?: "sending" | "failed";
  clientId?: string;
};
export type Thread = {
  site: { name: string; timezone: string };
  workDate: string;
  month: string;
  serverTime: string;
  agent: Agent;
  thread: {
    groupId: string | null;
    name: string;
    description: string;
    version?: number;
    archived: boolean;
    role: "admin" | "member" | null;
    memberCount: number;
    canPost: boolean;
    canManage: boolean;
  };
  me: { userId: string; employeeId: string } | null;
  messages: Message[];
  hasMore: boolean;
  before: { at: string; id: string } | null;
  people: Record<string, string>;
  days: DayStatus[];
};
export type GroupInfo = {
  id: string;
  name: string;
  description: string;
  version: number;
  createdAt: string;
  createdBy: string | null;
  archived: boolean;
  role: "admin" | "member" | null;
  canManage: boolean;
  canArchive: boolean;
  canLeave: boolean;
  members: {
    userId: string;
    employeeId: string;
    name: string;
    role: "admin" | "member";
    addedAt: string;
    me: boolean;
  }[];
};
export type Person = { userId: string; employeeId: string; name: string };
/** Scope-ticketed read: responses from an older site/permission scope are discarded. */
export async function chatRead<T>(
  s: WorkspaceScope,
  input: object,
  signal?: AbortSignal,
): Promise<T> {
  const ticket = s.boundary.ticket();
  try {
    const data = await gql<{ dwrChat: T }>(
      DwrChatDocument,
      { siteId: s.siteId, input },
      signal ? AbortSignal.any([signal, ticket.signal]) : ticket.signal,
      s.version,
    );
    if (!ticket.isCurrent())
      throw new DOMException("Scope changed", "AbortError");
    return data.dwrChat;
  } finally {
    ticket.release();
  }
}
export const useChatHome = (enabled = true) =>
  useScopedQuery<{ dwrChat: ChatHome }>(
    ["dwr-chat", "home"],
    DwrChatDocument,
    { input: { view: "home" } },
    enabled,
    15000,
  );
export function useDwrCommand() {
  const write = useWrite();
  return useCallback(
    async <T = any>(operation: string, input: object) =>
      (
        await write<{ dwrCommand: T }>(
          DwrCommandDocument,
          {
            operation,
            input,
          },
          operation === "markRead" ? [] : ["dwr-chat", "dwr"],
        )
      ).dwrCommand,
    [write],
  );
}
const byTime = (a: Message, b: Message) =>
  a.createdAt === b.createdAt
    ? a.id.localeCompare(b.id)
    : a.createdAt.localeCompare(b.createdAt);
/** One month of a thread: first page, older pages on demand and 5 s change polling. */
export function useThread(groupId: string | null, month: string) {
  const current = useScope();
  const scopeIdentity = JSON.stringify(current.key);
  // Workspace polling replaces its context object without changing access.
  const s = useMemo(() => current, [scopeIdentity, current.boundary]);
  const inFlight = useRef<Promise<void> | null>(null);
  const lifetime = useRef<AbortController | null>(null);
  const [data, setData] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const since = useRef<string | null>(null);
  const merge = useCallback((incoming: Message[]) => {
    setMessages((old) => {
      const next = new Map(old.filter((m) => !m.pending).map((m) => [m.id, m]));
      for (const m of incoming) {
        const known = next.get(m.id);
        if (!known || known.version <= m.version) next.set(m.id, m);
      }
      return [...next.values(), ...old.filter((m) => m.pending)].sort(byTime);
    });
  }, []);
  const refresh = useCallback(
    (signal?: AbortSignal): Promise<void> => {
      if (inFlight.current) return inFlight.current;
      const active = lifetime.current;
      const request = (async () => {
        const requestSignal = signal ?? active?.signal;
        const polling = since.current !== null;
        const result = await chatRead<Thread>(
          s,
          {
            view: "thread",
            groupId,
            month,
            ...(polling ? { since: since.current } : {}),
          },
          requestSignal,
        );
        if (requestSignal?.aborted) return;
        since.current = result.serverTime;
        // Change polls carry no page cursor; keep the first page's pagination.
        setData((d) =>
          polling && d
            ? {
                ...result,
                people: { ...d.people, ...result.people },
                hasMore: d.hasMore,
                before: d.before,
              }
            : result,
        );
        merge(result.messages);
        setError(null);
      })();
      inFlight.current = request;
      void request
        .finally(() => {
          if (inFlight.current === request) inFlight.current = null;
        })
        .catch(() => {});
      return request;
    },
    [s, groupId, month, merge],
  );
  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    since.current = null;
    setData(null);
    setMessages([]);
    setLoadingOlder(false);
    setError(null);
    void refresh(controller.signal).catch((e) => {
      if ((e as Error).name !== "AbortError") setError(e as Error);
    });
    const timer = setInterval(() => {
      if (document.visibilityState === "visible")
        void refresh(controller.signal).catch(() => {});
    }, 5000);
    return () => {
      controller.abort();
      inFlight.current = null;
      clearInterval(timer);
    };
  }, [refresh]);
  const loadOlder = useCallback(async () => {
    const cursor = data?.before;
    if (!cursor || loadingOlder) return;
    setLoadingOlder(true);
    const active = lifetime.current;
    try {
      const page = await chatRead<Thread>(
        s,
        {
          view: "thread",
          groupId,
          month,
          before: cursor,
        },
        active?.signal,
      );
      if (active?.signal.aborted) return;
      merge(page.messages);
      setData((d) =>
        d
          ? {
              ...d,
              people: { ...d.people, ...page.people },
              hasMore: page.hasMore,
              before: page.before,
            }
          : d,
      );
    } finally {
      if (!active?.signal.aborted) setLoadingOlder(false);
    }
  }, [s, groupId, month, data?.before, loadingOlder, merge]);
  return {
    data,
    messages,
    setMessages,
    error,
    refresh,
    loadOlder,
    loadingOlder,
  };
}
