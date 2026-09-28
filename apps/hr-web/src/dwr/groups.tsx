import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Archive,
  Crown,
  LogOut,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  ShieldMinus,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import {
  dwrGroupDescription,
  dwrGroupName,
} from "@/shared/contracts/dwr";
import { useScope } from "../workspace-context";
import { useT } from "../ui";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  chatRead,
  useDwrCommand,
  type ChatHome,
  type GroupInfo,
  type Person,
} from "./api";
import { initials, useClock, useDayLabel } from "./format";
export function GroupsTab({
  home,
  openChat,
  manage,
  create,
}: {
  home: ChatHome;
  openChat: (id: string) => void;
  manage: (id: string) => void;
  create?: () => void;
}) {
  const t = useT(),
    clock = useClock(home.site.timezone),
    dayLabel = useDayLabel(home.workDate),
    [filter, setFilter] = useState(""),
    [state, setState] = useState("active");
  const rows = home.groups.filter(
    (g) =>
      (state === "all" || g.archived === (state === "archived")) &&
      `${g.name} ${g.description}`
        .toLowerCase()
        .includes(filter.trim().toLowerCase()),
  );
  const when = (iso: string) => {
    const day = new Intl.DateTimeFormat("en-CA", {
      timeZone: home.site.timezone,
    }).format(new Date(iso));
    return `${dayLabel(day)} ${clock(iso)}`;
  };
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <Input
          aria-label={t("Search groups", "समूह खोजें")}
          placeholder={t("Search groups", "समूह खोजें")}
          className="h-8 max-w-64"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <NativeSelect
          aria-label={t("Group status", "समूह स्थिति")}
          className="h-8 w-36 text-xs"
          value={state}
          onChange={(e) => setState(e.target.value)}
        >
          <option value="active">{t("Active", "सक्रिय")}</option>
          <option value="archived">{t("Archived", "संग्रहीत")}</option>
          <option value="all">{t("All", "सभी")}</option>
        </NativeSelect>
        {create && (
          <Button size="sm" className="ml-auto" onClick={create}>
            <Plus className="size-4" />
            {t("New group", "नया समूह")}
          </Button>
        )}
      </div>
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("Group", "समूह")}</TableHead>
              <TableHead>{t("Members", "सदस्य")}</TableHead>
              <TableHead>{t("Your role", "आपकी भूमिका")}</TableHead>
              <TableHead>{t("Last activity", "अंतिम गतिविधि")}</TableHead>
              <TableHead>{t("Status", "स्थिति")}</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((g) => (
              <TableRow key={g.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                      <AvatarFallback>{initials(g.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{g.name}</p>
                      {g.description && (
                        <p className="text-muted-foreground max-w-xs truncate text-xs">
                          {g.description}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="tabular-nums">{g.memberCount}</TableCell>
                <TableCell>
                  {g.role === "admin" ? (
                    <Badge variant="secondary">
                      {t("Group admin", "समूह एडमिन")}
                    </Badge>
                  ) : g.role === "member" ? (
                    t("Member", "सदस्य")
                  ) : (
                    <span className="text-muted-foreground">
                      {t("Oversight", "निगरानी")}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {g.last
                    ? when(g.last.at)
                    : t("No messages", "कोई संदेश नहीं")}
                </TableCell>
                <TableCell>
                  {g.archived ? (
                    <Badge variant="outline">{t("Archived", "संग्रहीत")}</Badge>
                  ) : (
                    <Badge variant="success">{t("Active", "सक्रिय")}</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`${t("Actions for", "कार्य")} ${g.name}`}
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => openChat(g.id)}>
                        <MessageSquare />
                        {t("Open chat", "चैट खोलें")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => manage(g.id)}>
                        <Users />
                        {t("Group info & members", "समूह जानकारी और सदस्य")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-muted-foreground py-10 text-center"
                >
                  {t("No groups match.", "कोई समूह नहीं मिला।")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
/** Server-searched people picker. Only minimal labels come back. */
function PeoplePicker({
  groupId,
  exclude,
  onPick,
}: {
  groupId: string | null;
  exclude: Set<string>;
  onPick: (p: Person) => void;
}) {
  const t = useT(),
    s = useScope(),
    [search, setSearch] = useState(""),
    [people, setPeople] = useState<Person[] | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      chatRead<{ people: Person[] }>(
        s,
        { view: "candidates", groupId, search },
        controller.signal,
      )
        .then((r) => setPeople(r.people))
        .catch((e) => {
          if ((e as Error).name !== "AbortError") setPeople([]);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search, groupId]);
  const shown = (people ?? []).filter((p) => !exclude.has(p.userId));
  return (
    <Command shouldFilter={false} className="rounded-md border">
      <CommandInput
        placeholder={t("Search people at this site", "इस साइट के लोग खोजें")}
        value={search}
        onValueChange={setSearch}
      />
      <CommandList className="max-h-52">
        {people === null ? (
          <div className="space-y-1 p-2">
            <Skeleton className="h-7" />
            <Skeleton className="h-7" />
          </div>
        ) : (
          <>
            <CommandEmpty>{t("No one found.", "कोई नहीं मिला।")}</CommandEmpty>
            {shown.map((p) => (
              <CommandItem
                key={p.userId}
                value={p.userId}
                onSelect={() => {
                  onPick(p);
                  setSearch("");
                }}
              >
                <Avatar className="size-6">
                  <AvatarFallback className="text-[10px]">
                    {initials(p.name)}
                  </AvatarFallback>
                </Avatar>
                {p.name}
                <UserPlus className="ml-auto" />
              </CommandItem>
            ))}
          </>
        )}
      </CommandList>
    </Command>
  );
}
export function NewGroupDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: string) => void;
}) {
  const t = useT(),
    command = useDwrCommand(),
    [name, setName] = useState(""),
    [description, setDescription] = useState(""),
    [members, setMembers] = useState<(Person & { admin: boolean })[]>([]),
    [busy, setBusy] = useState(false),
    [clientId, setClientId] = useState(() => crypto.randomUUID());
  useEffect(() => {
    if (!open) return;
    setName("");
    setDescription("");
    setMembers([]);
    setClientId(crypto.randomUUID());
  }, [open]);
  const nameOk = dwrGroupName.safeParse(name).success,
    descriptionOk = dwrGroupDescription.safeParse(description).success,
    adminOk = members.some((m) => m.admin);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("New DWR group", "नया DWR समूह")}</DialogTitle>
          <DialogDescription>
            {t(
              "Members post their daily work here. Each member's DWR is prepared from their own messages. Group admins can add people and manage admins.",
              "सदस्य यहाँ दैनिक काम लिखते हैं। हर सदस्य की DWR उनके अपने संदेशों से बनती है। समूह एडमिन लोग जोड़ और एडमिन बदल सकते हैं।",
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="group-name">{t("Group name", "समूह का नाम")}</Label>
            <Input
              id="group-name"
              value={name}
              maxLength={80}
              aria-invalid={!!name && !nameOk}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("e.g. Site operations", "जैसे साइट संचालन")}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="group-description">
              {t("Description", "विवरण")}
            </Label>
            <Textarea
              id="group-description"
              value={description}
              maxLength={500}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("Optional", "वैकल्पिक")}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>{t("Members", "सदस्य")}</Label>
            <PeoplePicker
              groupId={null}
              exclude={new Set(members.map((m) => m.userId))}
              onPick={(p) =>
                setMembers((ms) => [...ms, { ...p, admin: ms.length === 0 }])
              }
            />
            {members.length > 0 && (
              <ul className="divide-y rounded-md border">
                {members.map((m) => (
                  <li
                    key={m.userId}
                    className="flex items-center gap-3 px-3 py-2 text-sm"
                  >
                    <Avatar className="size-7">
                      <AvatarFallback className="text-[10px]">
                        {initials(m.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 truncate">{m.name}</span>
                    <label className="text-muted-foreground flex items-center gap-2 text-xs">
                      <Switch
                        checked={m.admin}
                        aria-label={`${m.name} ${t("is group admin", "समूह एडमिन")}`}
                        onChange={(e) =>
                          setMembers((ms) =>
                            ms.map((x) =>
                              x.userId === m.userId
                                ? { ...x, admin: e.target.checked }
                                : x,
                            ),
                          )
                        }
                      />
                      {t("Admin", "एडमिन")}
                    </label>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`${t("Remove", "हटाएँ")} ${m.name}`}
                      onClick={() =>
                        setMembers((ms) =>
                          ms.filter((x) => x.userId !== m.userId),
                        )
                      }
                    >
                      <UserMinus className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {members.length > 0 && !adminOk && (
              <p className="text-destructive text-xs">
                {t(
                  "Choose at least one group admin.",
                  "कम से कम एक समूह एडमिन चुनें।",
                )}
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("Cancel", "रद्द करें")}
          </Button>
          <Button
            disabled={
              busy || !nameOk || !descriptionOk || !members.length || !adminOk
            }
            onClick={async () => {
              setBusy(true);
              try {
                const r = await command<{ id: string }>("createGroup", {
                  clientId,
                  name,
                  description,
                  members: members.map((m) => ({
                    userId: m.userId,
                    admin: m.admin,
                  })),
                });
                toast.success(t("Group created", "समूह बनाया गया"));
                onOpenChange(false);
                onCreated(r.id);
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {t("Create group", "समूह बनाएँ")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
export function GroupSheet({
  groupId,
  onClose,
}: {
  groupId: string | null;
  onClose: () => void;
}) {
  const t = useT(),
    s = useScope(),
    command = useDwrCommand(),
    [info, setInfo] = useState<GroupInfo | null>(null),
    [editing, setEditing] = useState(false),
    [name, setName] = useState(""),
    [description, setDescription] = useState(""),
    [adding, setAdding] = useState(false),
    [archiving, setArchiving] = useState(false),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false);
  const load = async () => {
    if (!groupId) return;
    try {
      const g = await chatRead<GroupInfo>(s, { view: "group", groupId });
      setInfo(g);
      setName(g.name);
      setDescription(g.description);
    } catch (e) {
      toast.error((e as Error).message);
      onClose();
    }
  };
  useEffect(() => {
    setInfo(null);
    setEditing(false);
    setAdding(false);
    void load();
  }, [groupId]);
  async function act(operation: string, input: object, done?: string) {
    setBusy(true);
    try {
      await command(operation, input);
      if (done) toast.success(done);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Sheet open={!!groupId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{t("Group info", "समूह जानकारी")}</SheetTitle>
          <SheetDescription>
            {t(
              "Group admins manage members and admins. Site DWR group permissions apply to HR.",
              "समूह एडमिन सदस्य और एडमिन संभालते हैं। HR पर साइट अनुमतियाँ लागू होती हैं।",
            )}
          </SheetDescription>
        </SheetHeader>
        {!info ? (
          <div className="space-y-3 px-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-40" />
          </div>
        ) : (
          <ScrollArea className="flex-1 px-4 pb-4">
            <div className="flex flex-col items-center gap-2 py-2 text-center">
              <Avatar className="size-16">
                <AvatarFallback className="text-lg">
                  {initials(info.name)}
                </AvatarFallback>
              </Avatar>
              {editing ? (
                <div className="grid w-full gap-2 text-left">
                  <Label htmlFor="edit-group-name">
                    {t("Group name", "समूह का नाम")}
                  </Label>
                  <Input
                    id="edit-group-name"
                    value={name}
                    maxLength={80}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <Label htmlFor="edit-group-description">
                    {t("Description", "विवरण")}
                  </Label>
                  <Textarea
                    id="edit-group-description"
                    value={description}
                    maxLength={500}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditing(false)}
                    >
                      {t("Cancel", "रद्द करें")}
                    </Button>
                    <Button
                      size="sm"
                      disabled={busy || !dwrGroupName.safeParse(name).success}
                      onClick={async () => {
                        await act(
                          "updateGroup",
                          {
                            id: info.id,
                            expectedVersion: info.version,
                            name,
                            description,
                          },
                          t("Group updated", "समूह अपडेट हुआ"),
                        );
                        setEditing(false);
                      }}
                    >
                      {t("Save", "सहेजें")}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <h3 className="text-lg font-semibold">{info.name}</h3>
                  {info.description && (
                    <p className="text-muted-foreground text-sm">
                      {info.description}
                    </p>
                  )}
                  <p className="text-muted-foreground text-xs">
                    {info.members.length} {t("members", "सदस्य")}
                    {info.createdBy &&
                      ` · ${t("Created by", "बनाया")} ${info.createdBy}`}
                  </p>
                  {info.archived && (
                    <Badge variant="outline">{t("Archived", "संग्रहीत")}</Badge>
                  )}
                  {info.canManage && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditing(true)}
                    >
                      <Pencil className="size-4" />
                      {t("Edit details", "विवरण संपादित करें")}
                    </Button>
                  )}
                </>
              )}
            </div>
            <Separator className="my-3" />
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold">
                {info.members.length} {t("members", "सदस्य")}
              </h4>
              {info.canManage && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAdding((v) => !v)}
                >
                  <UserPlus className="size-4" />
                  {t("Add people", "लोग जोड़ें")}
                </Button>
              )}
            </div>
            {adding && (
              <div className="mb-3">
                <PeoplePicker
                  groupId={info.id}
                  exclude={new Set(info.members.map((m) => m.userId))}
                  onPick={(p) =>
                    void act(
                      "addMembers",
                      { id: info.id, userIds: [p.userId] },
                      `${p.name} ${t("added", "जोड़े गए")}`,
                    )
                  }
                />
              </div>
            )}
            <ul className="divide-y">
              {info.members.map((m) => (
                <li key={m.userId} className="flex items-center gap-3 py-2.5">
                  <Avatar className="size-9">
                    <AvatarFallback>{initials(m.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {m.name}
                      {m.me && (
                        <span className="text-muted-foreground font-normal">
                          {" "}
                          ({t("you", "आप")})
                        </span>
                      )}
                    </p>
                  </div>
                  {m.role === "admin" && (
                    <Badge variant="secondary">
                      <Crown /> {t("Group admin", "समूह एडमिन")}
                    </Badge>
                  )}
                  {info.canManage && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`${t("Manage", "प्रबंधन")} ${m.name}`}
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {m.role === "member" ? (
                          <DropdownMenuItem
                            onSelect={() =>
                              void act(
                                "setMemberRole",
                                {
                                  id: info.id,
                                  userId: m.userId,
                                  role: "admin",
                                },
                                t("Made group admin", "समूह एडमिन बनाया"),
                              )
                            }
                          >
                            <Crown />
                            {t("Make group admin", "समूह एडमिन बनाएँ")}
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onSelect={() =>
                              void act(
                                "setMemberRole",
                                {
                                  id: info.id,
                                  userId: m.userId,
                                  role: "member",
                                },
                                t("Dismissed as admin", "एडमिन से हटाया"),
                              )
                            }
                          >
                            <ShieldMinus />
                            {t("Dismiss as admin", "एडमिन से हटाएँ")}
                          </DropdownMenuItem>
                        )}
                        {!m.me && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={() =>
                                void act(
                                  "removeMember",
                                  { id: info.id, userId: m.userId },
                                  `${m.name} ${t("removed", "हटाए गए")}`,
                                )
                              }
                            >
                              <UserMinus />
                              {t("Remove from group", "समूह से हटाएँ")}
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </li>
              ))}
            </ul>
            <Separator className="my-3" />
            <div className="grid gap-2">
              {info.canLeave && (
                <Button
                  variant="outline"
                  className="text-destructive justify-start"
                  disabled={busy}
                  onClick={async () => {
                    await act(
                      "leaveGroup",
                      { id: info.id },
                      t("You left the group", "आपने समूह छोड़ा"),
                    );
                    onClose();
                  }}
                >
                  <LogOut className="size-4" />
                  {t("Leave group", "समूह छोड़ें")}
                </Button>
              )}
              {info.canArchive && (
                <Button
                  variant="outline"
                  className="text-destructive justify-start"
                  onClick={() => setArchiving(true)}
                >
                  <Archive className="size-4" />
                  {t("Archive group", "समूह संग्रहीत करें")}
                </Button>
              )}
            </div>
          </ScrollArea>
        )}
        <Dialog open={archiving} onOpenChange={setArchiving}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {t("Archive this group?", "यह समूह संग्रहीत करें?")}
              </DialogTitle>
              <DialogDescription>
                {t(
                  "Members can no longer send messages. Messages and prepared DWRs are kept for oversight and audit.",
                  "सदस्य अब संदेश नहीं भेज पाएँगे। संदेश और DWR निगरानी व ऑडिट के लिए रखे जाएँगे।",
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-1.5">
              <Label htmlFor="archive-reason">{t("Reason", "कारण")}</Label>
              <Textarea
                id="archive-reason"
                value={reason}
                maxLength={500}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setArchiving(false)}>
                {t("Cancel", "रद्द करें")}
              </Button>
              <Button
                variant="destructive"
                disabled={busy || reason.trim().length < 8 || !info}
                onClick={async () => {
                  await act(
                    "archiveGroup",
                    { id: info!.id, expectedVersion: info!.version, reason },
                    t("Group archived", "समूह संग्रहीत हुआ"),
                  );
                  setArchiving(false);
                  setReason("");
                }}
              >
                {t("Archive", "संग्रहीत करें")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}
