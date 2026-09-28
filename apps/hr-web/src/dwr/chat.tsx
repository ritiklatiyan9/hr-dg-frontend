import { AiIcon } from "@/components/ui/ai-icon";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowDown,
  CheckCheck,
  Clock3,
  Copy,
  FileText,
  Info,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  RotateCw,
  Search,
  Send,
  Trash2,
  Users,
} from "lucide-react";
import { DWR_MESSAGE_MAX } from "../../../../packages/contracts/dwr";
import { useScope } from "../workspace-context";
import { useT } from "../ui";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  chatRead,
  useDwrCommand,
  useThread,
  type ChatHome,
  type DayStatus,
  type Message,
} from "./api";
import {
  DwrStatus,
  authorColor,
  initials,
  monthOptions,
  preparingNow,
  useClock,
  useDayLabel,
  useLocale,
} from "./format";
export type OpenReport = (workDate: string, employeeId?: string) => void;
const errorText = (
  code: string | null | undefined,
  t: ReturnType<typeof useT>,
) =>
  (
    ({
      LIMIT_REACHED: t(
        "Today's AI limit is reached. Use your chat as the report.",
        "आज की AI सीमा पूरी हुई। चैट को ही रिपोर्ट बनाएँ।",
      ),
      CLARIFICATION_REQUIRED: t(
        "The AI could not summarise this safely. Use your chat as the report or edit it.",
        "AI सुरक्षित सारांश नहीं बना सका। चैट को रिपोर्ट बनाएँ या संपादित करें।",
      ),
    }) as Record<string, string>
  )[code ?? ""] ??
  t(
    "The AI agent could not prepare it yet. It will retry automatically.",
    "AI एजेंट अभी तैयार नहीं कर सका। यह स्वतः फिर कोशिश करेगा।",
  );
export function ChatsTab({
  home,
  openReport,
  manageGroup,
  newGroup,
  initial,
}: {
  home: ChatHome;
  openReport: OpenReport;
  manageGroup: (id: string) => void;
  newGroup?: () => void;
  initial?: string | null;
}) {
  const [selected, setSelected] = useState<string | null>(
    () => initial ?? (home.me ? "me" : (home.groups[0]?.id ?? null)),
  );
  const exists =
    selected === "me" ? !!home.me : home.groups.some((g) => g.id === selected);
  const current = exists ? selected : home.me ? "me" : home.groups[0]?.id;
  return (
    <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(260px,320px)_1fr]">
      <ChatList
        home={home}
        selected={current ?? null}
        onSelect={setSelected}
        onNewGroup={newGroup}
      />
      {current ? (
        <ChatView
          key={current}
          groupId={current === "me" ? null : current}
          home={home}
          openReport={openReport}
          manageGroup={manageGroup}
        />
      ) : (
        <Card className="items-center justify-center p-10 text-center">
          <Users className="text-muted-foreground size-8" />
          <p className="text-muted-foreground max-w-sm text-sm">
            No DWR chats are available to you at this site.
          </p>
        </Card>
      )}
    </div>
  );
}
function ChatList({
  home,
  selected,
  onSelect,
  onNewGroup,
}: {
  home: ChatHome;
  selected: string | null;
  onSelect: (id: string) => void;
  onNewGroup?: () => void;
}) {
  const t = useT(),
    clock = useClock(home.site.timezone),
    dayLabel = useDayLabel(home.workDate),
    [filter, setFilter] = useState("");
  const when = (iso: string) => {
    const day = new Intl.DateTimeFormat("en-CA", {
      timeZone: home.site.timezone,
    }).format(new Date(iso));
    return day === home.workDate ? clock(iso) : dayLabel(day);
  };
  const groups = home.groups.filter((g) =>
    g.name.toLowerCase().includes(filter.trim().toLowerCase()),
  );
  return (
    <Card className="min-h-0 gap-0 overflow-hidden py-0 lg:h-[calc(100dvh-250px)] lg:min-h-[520px]">
      <div className="flex items-center gap-2 border-b p-3">
        <div className="relative flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            aria-label={t("Search chats", "चैट खोजें")}
            placeholder={t("Search chats", "चैट खोजें")}
            className="pl-8"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        {onNewGroup && (
          <Button
            size="icon"
            variant="outline"
            aria-label={t("New group", "नया समूह")}
            title={t("New group", "नया समूह")}
            onClick={onNewGroup}
          >
            <Plus className="size-4" />
          </Button>
        )}
      </div>
      <ScrollArea className="flex-1" role="list">
        {home.me && (
          <ChatRow
            active={selected === "me"}
            onClick={() => onSelect("me")}
            avatar={
              <AvatarFallback className="ai-avatar">
                <AiIcon className="size-4" />
              </AvatarFallback>
            }
            title={t("My DWR Agent", "मेरा DWR एजेंट")}
            meta={home.personal?.last ? when(home.personal.last.at) : ""}
            preview={
              home.personal?.last
                ? home.personal.last.deleted
                  ? t("Message deleted", "संदेश हटाया गया")
                  : home.personal.last.body
                : t(
                    "Tell your agent what you worked on today",
                    "अपने एजेंट को आज का काम बताएँ",
                  )
            }
            badge={<DwrStatus day={home.personal?.today} />}
          />
        )}
        {groups.map((g) => (
          <ChatRow
            key={g.id}
            active={selected === g.id}
            onClick={() => onSelect(g.id)}
            avatar={<AvatarFallback>{initials(g.name)}</AvatarFallback>}
            title={g.name}
            meta={g.last ? when(g.last.at) : ""}
            preview={
              g.last
                ? `${g.last.author ?? t("Member", "सदस्य")}: ${g.last.deleted ? t("message deleted", "संदेश हटाया गया") : g.last.body}`
                : t("No messages yet", "अभी कोई संदेश नहीं")
            }
            badge={
              g.archived ? (
                <Badge variant="outline">{t("Archived", "संग्रहीत")}</Badge>
              ) : g.role === null ? (
                <Badge variant="outline">{t("View only", "केवल देखें")}</Badge>
              ) : g.unread ? (
                <Badge className="rounded-full">
                  {g.unread > 98 ? "99+" : g.unread}
                </Badge>
              ) : null
            }
          />
        ))}
        {!groups.length && (
          <p className="text-muted-foreground px-4 py-6 text-sm">
            {home.groups.length
              ? t("No chats match your search.", "खोज से कोई चैट नहीं मिली।")
              : t(
                  "No DWR groups yet. Groups created by HR or admins appear here.",
                  "अभी कोई DWR समूह नहीं। HR या एडमिन के बनाए समूह यहाँ दिखेंगे।",
                )}
          </p>
        )}
      </ScrollArea>
    </Card>
  );
}
function ChatRow(props: {
  active: boolean;
  onClick: () => void;
  avatar: React.ReactNode;
  title: string;
  meta: string;
  preview: string;
  badge?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="listitem"
      aria-current={props.active ? "true" : undefined}
      onClick={props.onClick}
      className={cn(
        "hover:bg-muted/60 flex w-full min-w-0 items-center gap-3 border-b px-3 py-2.5 text-left transition-colors",
        props.active && "bg-accent hover:bg-accent",
      )}
    >
      <Avatar className="size-10">{props.avatar}</Avatar>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{props.title}</span>
          <span className="text-muted-foreground ml-auto shrink-0 text-xs">
            {props.meta}
          </span>
        </span>
        <span className="mt-0.5 flex items-center gap-2">
          <span className="text-muted-foreground truncate text-xs">
            {props.preview}
          </span>
          <span className="ml-auto shrink-0">{props.badge}</span>
        </span>
      </span>
    </button>
  );
}
function ChatView({
  groupId,
  home,
  openReport,
  manageGroup,
}: {
  groupId: string | null;
  home: ChatHome;
  openReport: OpenReport;
  manageGroup: (id: string) => void;
}) {
  const t = useT(),
    locale = useLocale(),
    command = useDwrCommand(),
    [month, setMonth] = useState(home.workDate.slice(0, 7)),
    { data, messages, setMessages, error, refresh, loadOlder, loadingOlder } =
      useThread(groupId, month),
    clock = useClock(home.site.timezone),
    dayLabel = useDayLabel(home.workDate),
    [editing, setEditing] = useState<{ id: string; body: string } | null>(null),
    [removing, setRemoving] = useState<Message | null>(null),
    [summary, setSummary] = useState<string | null>(null),
    box = useRef<HTMLDivElement>(null),
    stick = useRef(true),
    [atBottom, setAtBottom] = useState(true);
  const lastId = messages.at(-1)?.id;
  useLayoutEffect(() => {
    if (stick.current && box.current)
      box.current.scrollTop = box.current.scrollHeight;
  }, [messages.length, lastId, data?.month]);
  // Mark a group read when it opens and when new messages arrive while visible.
  useEffect(() => {
    if (!groupId || !data?.thread.role || !lastId) return;
    const timer = setTimeout(() => {
      if (document.visibilityState === "visible")
        void command("markRead", { groupId }).catch(() => {});
    }, 800);
    return () => clearTimeout(timer);
  }, [groupId, lastId, data?.thread.role, command]);
  const days = useMemo(
    () => new Map((data?.days ?? []).map((d) => [d.workDate, d])),
    [data?.days],
  );
  async function send(body: string, clientId: string = crypto.randomUUID()) {
    if (!home.me) return;
    const now = new Date().toISOString();
    const temp: Message = {
      id: `local-${clientId}`,
      clientId,
      groupId,
      userId: home.me.userId,
      workDate: home.workDate,
      body,
      version: 0,
      createdAt: now,
      updatedAt: now,
      editedAt: null,
      deletedAt: null,
      deletedByModerator: false,
      mine: true,
      canEdit: false,
      canDelete: false,
      pending: "sending",
    };
    stick.current = true;
    setMessages((ms) => [...ms.filter((m) => m.id !== temp.id), temp]);
    try {
      const r = await command<{ reportLocked?: boolean }>("message", {
        clientId,
        groupId,
        body,
      });
      await refresh();
      setMessages((ms) => ms.filter((m) => m.id !== temp.id));
      if (r.reportLocked)
        toast.info(
          t(
            "Today's DWR is already submitted, so this message is not added to it.",
            "आज की DWR पहले ही भेजी जा चुकी है, इसलिए यह संदेश उसमें नहीं जुड़ेगा।",
          ),
        );
    } catch (e) {
      setMessages((ms) =>
        ms.map((m) => (m.id === temp.id ? { ...m, pending: "failed" } : m)),
      );
      toast.error((e as Error).message);
    }
  }
  async function saveEdit(m: Message) {
    if (!editing) return;
    try {
      await command("editMessage", {
        id: m.id,
        expectedVersion: m.version,
        body: editing.body,
      });
      setEditing(null);
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  async function remove(m: Message) {
    try {
      await command("deleteMessage", { id: m.id, expectedVersion: m.version });
      setRemoving(null);
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  if (error)
    return (
      <Card className="items-center justify-center gap-3 p-10 text-center">
        <AlertCircle className="text-destructive size-6" />
        <p className="text-sm">{error.message}</p>
        <Button variant="outline" onClick={() => void refresh()}>
          {t("Try again", "फिर कोशिश करें")}
        </Button>
      </Card>
    );
  const thread = data?.thread,
    personal = groupId === null,
    today = days.get(home.workDate);
  const items: React.ReactNode[] = [];
  let previous: Message | undefined;
  for (const m of messages) {
    if (m.workDate !== previous?.workDate)
      items.push(
        <div
          key={`day-${m.workDate}`}
          className="sticky top-0 z-10 flex justify-center gap-2 py-2"
        >
          <span className="bg-background/95 text-muted-foreground rounded-full border px-3 py-1 text-xs font-medium shadow-xs">
            {dayLabel(m.workDate)}
          </span>
          {data?.me && <DwrStatus day={days.get(m.workDate)} />}
          {!personal &&
            (thread?.role === "admin" || home.permissions.oversee) && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 min-h-7 text-xs"
                onClick={() => setSummary(m.workDate)}
              >
                {t("DWR summary", "DWR सारांश")}
              </Button>
            )}
        </div>,
      );
    items.push(
      <Bubble
        key={m.id}
        m={m}
        name={
          data?.people[m.userId] ??
          (m.mine ? home.me?.name : null) ??
          t("Member", "सदस्य")
        }
        time={clock(m.createdAt)}
        editing={editing?.id === m.id ? editing.body : null}
        onEditChange={(body) => setEditing({ id: m.id, body })}
        onEdit={() => setEditing({ id: m.id, body: m.body })}
        onCancelEdit={() => setEditing(null)}
        onSaveEdit={() => void saveEdit(m)}
        onDelete={() => setRemoving(m)}
        onRetry={() => void send(m.body, m.clientId)}
      />,
    );
    previous = m;
  }
  return (
    <Card className="min-h-[520px] gap-0 overflow-hidden py-0 lg:h-[calc(100dvh-250px)]">
      <header className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
        <Avatar className="size-10">
          {personal ? (
            <AvatarFallback className="ai-avatar">
              <AiIcon className="size-5" />
            </AvatarFallback>
          ) : (
            <AvatarFallback>{initials(thread?.name ?? "")}</AvatarFallback>
          )}
        </Avatar>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold">
            {personal
              ? t("My DWR Agent", "मेरा DWR एजेंट")
              : (thread?.name ?? " ")}
          </h2>
          <p className="text-muted-foreground truncate text-xs">
            {personal
              ? data?.agent.online
                ? t(
                    "AI agent online · your DWR is prepared from everything you write today",
                    "AI एजेंट ऑनलाइन · आज लिखी हर बात से आपकी DWR बनती है",
                  )
                : t(
                    "Private chat · AI agent offline, your chat can still be sent as the report",
                    "निजी चैट · AI एजेंट ऑफ़लाइन, चैट को ही रिपोर्ट भेज सकते हैं",
                  )
              : thread
                ? `${thread.memberCount} ${t("members", "सदस्य")}${thread.role === "admin" ? ` · ${t("You are an admin", "आप एडमिन हैं")}` : thread.role === null ? ` · ${t("View only", "केवल देखें")}` : ""}`
                : ""}
          </p>
        </div>
        <NativeSelect
          aria-label={t("Month", "महीना")}
          className="h-8 w-40 text-xs"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        >
          {monthOptions(home.workDate, locale).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </NativeSelect>
        {!personal && groupId && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => manageGroup(groupId)}
          >
            <Info className="size-4" />
            {t("Group info", "समूह जानकारी")}
          </Button>
        )}
      </header>
      <div className="relative min-h-0 flex-1">
        <ScrollArea
          ref={box}
          className="h-full px-3 py-2 sm:px-5"
          aria-live="polite"
          onScroll={(e) => {
            const el = e.currentTarget;
            stick.current =
              el.scrollHeight - el.scrollTop - el.clientHeight < 80;
            setAtBottom(stick.current);
          }}
        >
          {data?.hasMore && (
            <div className="flex justify-center py-2">
              <Button
                size="sm"
                variant="outline"
                disabled={loadingOlder}
                onClick={async () => {
                  const el = box.current,
                    before = el?.scrollHeight ?? 0;
                  stick.current = false;
                  await loadOlder();
                  requestAnimationFrame(() => {
                    if (el) el.scrollTop += el.scrollHeight - before;
                  });
                }}
              >
                {loadingOlder && <Loader2 className="size-4 animate-spin" />}
                {t("Load earlier messages", "पहले के संदेश देखें")}
              </Button>
            </div>
          )}
          {!data ? (
            <div className="space-y-3 py-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton
                  key={i}
                  className={cn("h-12 w-2/3", i % 2 && "ml-auto")}
                />
              ))}
            </div>
          ) : items.length ? (
            items
          ) : (
            <div className="text-muted-foreground mx-auto flex max-w-sm flex-col items-center gap-2 py-16 text-center text-sm">
              <AiIcon className="size-6" />
              {personal
                ? t(
                    "Write what you did today in Hindi, English or Hinglish. Your DWR is prepared automatically.",
                    "आज आपने क्या किया, हिंदी, अंग्रेज़ी या हिंग्लिश में लिखें। आपकी DWR स्वतः तैयार होगी।",
                  )
                : t(
                    "No messages in this month yet.",
                    "इस महीने अभी कोई संदेश नहीं।",
                  )}
            </div>
          )}
        </ScrollArea>
        {!atBottom && (
          <Button
            size="icon"
            variant="outline"
            aria-label={t("Jump to latest", "नवीनतम पर जाएँ")}
            className="absolute right-4 bottom-3 rounded-full shadow-md"
            onClick={() => {
              stick.current = true;
              box.current?.scrollTo({ top: box.current.scrollHeight });
            }}
          >
            <ArrowDown className="size-4" />
          </Button>
        )}
      </div>
      {data?.me && thread?.canPost && month === home.workDate.slice(0, 7) && (
        <DayBar
          day={today}
          messages={home.personal?.today.messages ?? 0}
          online={data.agent.online}
          onOpen={() => openReport(home.workDate)}
          onChanged={refresh}
          workDate={home.workDate}
        />
      )}
      {thread?.canPost ? (
        <Composer onSend={(body) => void send(body)} />
      ) : (
        <p className="text-muted-foreground border-t px-4 py-3 text-center text-xs">
          {thread?.archived
            ? t(
                "This group is archived. Messages are read-only.",
                "यह समूह संग्रहीत है। संदेश केवल पढ़े जा सकते हैं।",
              )
            : thread && thread.role === null && !personal
              ? t(
                  "You are viewing this group for oversight. Only members can send messages.",
                  "आप निगरानी के लिए यह समूह देख रहे हैं। केवल सदस्य संदेश भेज सकते हैं।",
                )
              : data
                ? t(
                    "Sending DWR messages is not permitted for your account at this site.",
                    "इस साइट पर आपके खाते को DWR संदेश भेजने की अनुमति नहीं है।",
                  )
                : " "}
        </p>
      )}
      <Dialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Delete message?", "संदेश हटाएँ?")}</DialogTitle>
            <DialogDescription>
              {removing && !removing.mine
                ? t(
                    "You are removing another person's message as a moderator. Everyone will see that it was removed. The original stays in the audit history.",
                    "आप मॉडरेटर के रूप में किसी और का संदेश हटा रहे हैं। सभी को दिखेगा कि इसे हटाया गया। मूल संदेश ऑडिट इतिहास में रहेगा।",
                  )
                : t(
                    "It is removed from this chat and from your DWR sources. The original stays in the audit history.",
                    "यह चैट और आपकी DWR से हट जाएगा। मूल संदेश ऑडिट इतिहास में रहेगा।",
                  )}
            </DialogDescription>
          </DialogHeader>
          <p className="bg-muted rounded-md p-3 text-sm whitespace-pre-wrap">
            {removing?.body}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoving(null)}>
              {t("Cancel", "रद्द करें")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => removing && void remove(removing)}
            >
              <Trash2 className="size-4" />
              {t("Delete", "हटाएँ")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {groupId && (
        <DaySummarySheet
          groupId={groupId}
          workDate={summary}
          onClose={() => setSummary(null)}
          openReport={openReport}
        />
      )}
    </Card>
  );
}
function Bubble(props: {
  m: Message;
  name: string;
  time: string;
  editing: string | null;
  onEditChange: (body: string) => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDelete: () => void;
  onRetry: () => void;
}) {
  const t = useT(),
    { m } = props;
  const actions = !m.pending && !m.deletedAt;
  return (
    <div
      className={cn(
        "group flex items-start gap-2 py-1",
        m.mine ? "justify-end" : "justify-start",
      )}
    >
      {!m.mine && (
        <Avatar className="size-8" aria-hidden="true">
          <AvatarFallback className={cn("border", authorColor(m.userId))}>
            {initials(props.name)}
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          "relative min-w-0 max-w-[min(34rem,75%)] rounded-2xl px-3 py-2 text-sm shadow-xs",
          m.mine
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted rounded-bl-md",
          m.deletedAt && "bg-transparent text-muted-foreground border italic",
          props.editing !== null && "w-full max-w-[34rem]",
        )}
      >
        <p
          className={cn(
            "mb-0.5 text-xs font-semibold",
            m.mine && !m.deletedAt
              ? "text-primary-foreground/85"
              : authorColor(m.userId),
          )}
        >
          {props.name}
        </p>
        {props.editing !== null ? (
          <div className="space-y-2">
            <Textarea
              autoFocus
              aria-label={t("Edit message", "संदेश संपादित करें")}
              className="bg-background text-foreground max-h-60"
              maxLength={DWR_MESSAGE_MAX}
              value={props.editing}
              onChange={(e) => props.onEditChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") props.onCancelEdit();
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  props.onSaveEdit();
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={props.onCancelEdit}>
                {t("Cancel", "रद्द करें")}
              </Button>
              <Button
                size="sm"
                disabled={!props.editing.trim()}
                onClick={props.onSaveEdit}
              >
                {t("Save", "सहेजें")}
              </Button>
            </div>
          </div>
        ) : m.deletedAt ? (
          <p>
            {m.deletedByModerator
              ? t("Removed by a moderator", "मॉडरेटर ने हटाया")
              : t("This message was deleted", "यह संदेश हटाया गया")}
          </p>
        ) : (
          <p className="break-words whitespace-pre-wrap">{m.body}</p>
        )}
        {props.editing === null && (
          <p
            className={cn(
              "mt-1 flex items-center justify-end gap-1 text-[11px] leading-none",
              m.mine && !m.deletedAt
                ? "text-primary-foreground/75"
                : "text-muted-foreground",
            )}
          >
            {m.editedAt && !m.deletedAt && (
              <span>{t("edited", "संपादित")}</span>
            )}
            <span>{props.time}</span>
            {m.mine &&
              (m.pending === "sending" ? (
                <Clock3
                  className="size-3"
                  aria-label={t("Sending", "भेजा जा रहा है")}
                />
              ) : m.pending === "failed" ? (
                <AlertCircle
                  className="size-3"
                  aria-label={t("Not sent", "नहीं भेजा गया")}
                />
              ) : !m.deletedAt ? (
                <CheckCheck
                  className="size-3"
                  aria-label={t("Sent", "भेजा गया")}
                />
              ) : null)}
          </p>
        )}
        {m.pending === "failed" && (
          <Button
            size="sm"
            variant="secondary"
            className="mt-2 h-7 min-h-7"
            onClick={props.onRetry}
          >
            <RotateCw className="size-3.5" />
            {t("Retry", "फिर भेजें")}
          </Button>
        )}
        {actions && props.editing === null && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={t("Message actions", "संदेश विकल्प")}
                className={cn(
                  "bg-background text-foreground absolute top-1 flex size-6 items-center justify-center rounded-full border opacity-0 shadow-xs transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100",
                  m.mine ? "-left-8" : "-right-8",
                )}
              >
                <MoreVertical className="size-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={m.mine ? "end" : "start"}>
              <DropdownMenuItem
                onSelect={() =>
                  void navigator.clipboard
                    ?.writeText(m.body)
                    .then(() => toast.success(t("Copied", "कॉपी किया")))
                }
              >
                <Copy />
                {t("Copy text", "पाठ कॉपी करें")}
              </DropdownMenuItem>
              {m.canEdit && (
                <DropdownMenuItem onSelect={props.onEdit}>
                  <Pencil />
                  {t("Edit", "संपादित करें")}
                </DropdownMenuItem>
              )}
              {m.canDelete && (
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={props.onDelete}
                >
                  <Trash2 />
                  {m.mine
                    ? t("Delete", "हटाएँ")
                    : t("Remove as moderator", "मॉडरेटर के रूप में हटाएँ")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {m.mine && (
        <Avatar className="size-8" aria-hidden="true">
          <AvatarFallback className={cn("border", authorColor(m.userId))}>
            {initials(props.name)}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
function Composer({ onSend }: { onSend: (body: string) => void }) {
  const t = useT(),
    [body, setBody] = useState("");
  const submit = () => {
    const text = body.trim();
    if (!text) return;
    onSend(text);
    setBody("");
  };
  return (
    <form
      className="flex items-end gap-2 border-t p-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="relative flex-1">
        <Textarea
          aria-label={t("Message", "संदेश")}
          placeholder={t(
            "What did you work on? Hindi, English or Hinglish…",
            "आपने क्या काम किया? हिंदी, अंग्रेज़ी या हिंग्लिश…",
          )}
          className="max-h-40 min-h-10 resize-none pr-14"
          rows={1}
          maxLength={DWR_MESSAGE_MAX}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              submit();
            }
          }}
        />
        {body.length > DWR_MESSAGE_MAX - 200 && (
          <span className="text-muted-foreground absolute right-3 bottom-2 text-[11px]">
            {DWR_MESSAGE_MAX - body.length}
          </span>
        )}
      </div>
      <Button
        type="submit"
        size="icon"
        className="size-10 min-h-10 rounded-full"
        aria-label={t("Send", "भेजें")}
        disabled={!body.trim()}
      >
        <Send className="size-4" />
      </Button>
    </form>
  );
}
function DayBar({
  day,
  messages,
  online,
  workDate,
  onOpen,
  onChanged,
}: {
  day: DayStatus | undefined;
  messages: number;
  online: boolean;
  workDate: string;
  onOpen: () => void;
  onChanged: () => Promise<void>;
}) {
  const t = useT(),
    command = useDwrCommand(),
    [busy, setBusy] = useState(false);
  const status = day?.report?.status;
  async function run(mode: "ai" | "chat") {
    setBusy(true);
    try {
      const r = await command<{ outcome?: string }>("prepare", {
        workDate,
        mode,
      });
      if (mode === "chat") onOpen();
      else if (r.outcome === "QUEUED")
        toast.success(
          online
            ? t(
                "Preparing your DWR. It appears here in a few seconds.",
                "आपकी DWR तैयार हो रही है। कुछ सेकंड में यहाँ दिखेगी।",
              )
            : t(
                "Queued. The AI agent will prepare it when it is back online.",
                "कतार में है। AI एजेंट ऑनलाइन होने पर तैयार करेगा।",
              ),
        );
      await onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  let text: string,
    actions: React.ReactNode = null;
  if (status === "submitted" || status === "approved") {
    text =
      status === "approved"
        ? t("Today's DWR was approved.", "आज की DWR स्वीकृत हुई।")
        : t(
            "Today's DWR is with your reviewer.",
            "आज की DWR समीक्षक के पास है।",
          );
    actions = (
      <Button size="sm" variant="outline" onClick={onOpen}>
        <FileText className="size-4" />
        {t("View DWR", "DWR देखें")}
      </Button>
    );
  } else if (preparingNow(day)) {
    text = t(
      "Your agent is preparing today's DWR…",
      "आपका एजेंट आज की DWR तैयार कर रहा है…",
    );
  } else if (status === "draft" || status === "returned") {
    text =
      status === "returned"
        ? t(
            "Your reviewer sent today's DWR back. Review and resend.",
            "समीक्षक ने आज की DWR वापस भेजी। जाँचकर फिर भेजें।",
          )
        : day?.job?.status === "queued"
          ? t(
              "Today's DWR is ready. Your newer messages are added automatically in a few minutes.",
              "आज की DWR तैयार है। आपके नए संदेश कुछ मिनटों में स्वतः जुड़ जाएँगे।",
            )
          : t(
              "Today's DWR is ready. Review it and submit.",
              "आज की DWR तैयार है। जाँचें और भेजें।",
            );
    actions = (
      <>
        {online && (
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => void run("ai")}
          >
            <AiIcon className="size-4" />
            {t("Re-prepare", "फिर तैयार करें")}
          </Button>
        )}
        <Button size="sm" onClick={onOpen}>
          <FileText className="size-4" />
          {t("Review & submit", "जाँचें और भेजें")}
        </Button>
      </>
    );
  } else if (!messages) {
    text = t(
      "Tell your agent what you worked on today. Your DWR is prepared automatically.",
      "एजेंट को आज का काम बताएँ। आपकी DWR स्वतः तैयार होगी।",
    );
  } else {
    text =
      day?.job?.status === "failed"
        ? errorText(day.job.errorCode, t)
        : online
          ? t(
              "Your DWR is prepared automatically about 10 minutes after your last message.",
              "आपके आखिरी संदेश के लगभग 10 मिनट बाद DWR स्वतः तैयार होगी।",
            )
          : t(
              "The AI agent is offline. You can send your chat as today's report.",
              "AI एजेंट ऑफ़लाइन है। आप चैट को ही आज की रिपोर्ट भेज सकते हैं।",
            );
    actions = (
      <>
        <Button
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={() => void run("chat")}
        >
          {t("Use chat as report", "चैट को रिपोर्ट बनाएँ")}
        </Button>
        {online && (
          <Button size="sm" disabled={busy} onClick={() => void run("ai")}>
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <AiIcon className="size-4" />
            )}
            {t("Prepare now", "अभी तैयार करें")}
          </Button>
        )}
      </>
    );
  }
  return (
    <div className="bg-muted/50 flex flex-wrap items-center gap-2 border-t px-4 py-2">
      <AiIcon className="text-primary size-4 shrink-0" />
      <p className="min-w-0 flex-1 text-xs">{text}</p>
      <div className="flex gap-1.5">{actions}</div>
    </div>
  );
}
function DaySummarySheet({
  groupId,
  workDate,
  onClose,
  openReport,
}: {
  groupId: string;
  workDate: string | null;
  onClose: () => void;
  openReport: OpenReport;
}) {
  const t = useT(),
    s = useScope(),
    command = useDwrCommand(),
    dayLabel = useDayLabel(s.workDate),
    [data, setData] = useState<any>(null),
    [busy, setBusy] = useState(false);
  const load = async () => {
    if (!workDate) return;
    try {
      setData(await chatRead(s, { view: "daySummary", groupId, workDate }));
    } catch (e) {
      toast.error((e as Error).message);
      onClose();
    }
  };
  useEffect(() => {
    setData(null);
    void load();
  }, [groupId, workDate]);
  return (
    <Sheet open={!!workDate} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {t("DWR summary", "DWR सारांश")} ·{" "}
            {workDate ? dayLabel(workDate) : ""}
          </SheetTitle>
          <SheetDescription>
            {t(
              "Each member's DWR is prepared from their own messages that day, across their DWR chats.",
              "हर सदस्य की DWR उस दिन के उनके अपने संदेशों से बनती है।",
            )}
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 px-4">
          {!data ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : (
            <ul className="divide-y">
              {data.members.map((m: any) => (
                <li key={m.userId} className="flex items-center gap-3 py-3">
                  <Avatar className="size-9">
                    <AvatarFallback>{initials(m.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {m.name}
                      {m.role === "admin" && (
                        <Badge variant="outline" className="ml-2">
                          {t("Admin", "एडमिन")}
                        </Badge>
                      )}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {m.messages}{" "}
                      {m.messages === 1
                        ? t("message in this group", "इस समूह में संदेश")
                        : t("messages in this group", "इस समूह में संदेश")}
                      {m.job?.status === "failed" &&
                        ` · ${t("AI needs attention", "AI पर ध्यान दें")}`}
                    </p>
                  </div>
                  {m.report ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openReport(workDate!, m.employeeId)}
                    >
                      <DwrStatus
                        day={{
                          workDate: workDate!,
                          report: m.report,
                          job: m.job,
                        }}
                      />
                    </Button>
                  ) : (
                    <DwrStatus
                      day={{ workDate: workDate!, report: null, job: m.job }}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
        {data?.canPrepare && (
          <div className="border-t p-4">
            <Button
              className="w-full"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const r = await command<{ outcomes: Record<string, number> }>(
                    "prepareGroup",
                    { groupId, workDate },
                  );
                  toast.success(
                    `${r.outcomes.QUEUED ?? 0} ${t("DWRs queued for AI preparation", "DWR AI तैयारी के लिए कतार में")}`,
                  );
                  await load();
                } catch (e) {
                  toast.error((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <AiIcon className="size-4" />
              )}
              {t("Prepare members' DWRs now", "सदस्यों की DWR अभी तैयार करें")}
            </Button>
            {!data.agent.online && (
              <p className="text-muted-foreground mt-2 text-xs">
                {t(
                  "The AI agent is offline; requests wait until it is back.",
                  "AI एजेंट ऑफ़लाइन है; अनुरोध उसके लौटने तक प्रतीक्षा करेंगे।",
                )}
              </p>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
