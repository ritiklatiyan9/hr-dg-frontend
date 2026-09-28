import { hindi } from "./labels";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CircleCheck,
  CircleMinus,
  History,
  Info,
  Loader2,
  LockKeyhole,
  MapPin,
  RotateCcw,
  Search,
  ShieldCheck,
  ShieldX,
  LayoutGrid,
  SlidersHorizontal,
  TriangleAlert,
  UserCog,
  UserRound,
  X,
} from "lucide-react";
import {
  AccessUsersDocument,
  UserAccessDocument,
  PreviewAccessDocument,
  SaveAccessDocument,
  type AccessUsersQuery,
  type UserAccessQuery,
  type AccessChangeInput,
  type PreviewAccessMutation,
  type SaveAccessMutation,
} from "@/shared/contracts/generated";
import {
  useScope,
  useScopedQuery,
  useWrite,
  type WorkspaceScope,
} from "./workspace-context";
import {
  Empty,
  ErrorState,
  Heading,
  Notice,
  Skeleton,
  humanize,
  useT,
} from "./ui";
import { FacetedFilter } from "./components/shared/faceted-filter";
import { Field } from "./components/shared/page";
import { formatDateTime } from "./components/shared/formatting";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  hr: "HR",
  jr_hr: "Jr. HR",
  employee: "Employee",
  manager: "Manager",
  supervisor: "Supervisor",
};
const scopeLabels: Record<string, string> = {
  own: "Own records",
  team: "Assigned team",
  site: "Selected site",
  organization: "Organization reports",
};
function explain(
  rule: string,
  t: (en: string, hi: string) => string = (en) => en,
) {
  return rule.startsWith("template:")
    ? t(
        `Inherited from ${roleLabels[rule.split(":")[1]!] ?? rule}`,
        `Template: ${hindi[rule.split(":")[1]!] ?? rule}`,
      )
    : rule.startsWith("dependency:")
      ? `Requires ${rule.split(":")[1]}`
      : ((
          {
            user_site_allow: "User override at this site",
            explicit_deny: "Explicit deny at this site",
            no_allow: "No matching allow rule",
            module_disabled: "Module disabled at this site",
            unauthorized_site: "Site membership is inactive",
            record_outside_team: "Outside assigned team",
          } as Record<string, string>
        )[rule] ?? rule);
}
type Module = WorkspaceScope["modules"][number];
type AccessUser = AccessUsersQuery["accessUsers"]["users"][number];
// Site-wide modules: overrides default to, and may only use, the site scope.
const siteOnly = ["access", "organization", "site_settings", "audit"];
const scopeOptions = (moduleId: string, action: string) =>
  Object.entries(scopeLabels).filter(([id]) =>
    moduleId.startsWith("my_")
      ? id === "own"
      : siteOnly.includes(moduleId)
        ? id === "site"
        : action === "create" && moduleId === "employees"
          ? id === "site"
          : id !== "organization" ||
            ["reports", "analytics"].includes(moduleId),
  );
const initials = (name: string) =>
  name
    .split(/[ @]/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
const toDraft = (u: UserAccessQuery["userAccess"]): AccessChangeInput => ({
  expectedVersion: u.version,
  role: u.role,
  active: u.active,
  rules: u.rules.map(({ key, effect, scope }) => ({ key, effect, scope })),
  delegations: u.delegations.map(({ key, scope }) => ({ key, scope })),
  reason: "",
});
const byKey = (a: { key: string }, b: { key: string }) =>
  a.key.localeCompare(b.key);
/** What a save would change, ignoring the reason and version. */
const signature = (d: AccessChangeInput) =>
  JSON.stringify([
    d.role,
    d.active,
    [...d.rules].sort(byKey),
    [...d.delegations].sort(byKey),
  ]);
const matches = (u: AccessUser, status: string) =>
  status === "all" ||
  (status === "active"
    ? u.active
    : status === "inactive"
      ? !u.active
      : u.protected);

type Level = "default" | "none" | "view" | "full" | "custom";
const levels: [Exclude<Level, "custom">, string, string][] = [
  ["default", "Role default", "भूमिका अनुसार"],
  ["none", "No access", "कोई पहुँच नहीं"],
  ["view", "View only", "केवल देखें"],
  ["full", "Full access", "पूर्ण पहुँच"],
];
const moduleKeys = (m: Module) => [
  ...m.actions.map((a) => `${m.id}.${a}`),
  ...m.fields.map((f) => `${m.id}.field.${f}`),
];
/** The preset a module's overrides match, or "custom" for anything else. */
function levelOf(m: Module, rules: AccessChangeInput["rules"]): Level {
  const keys = moduleKeys(m),
    set = new Map(
      rules.filter((r) => keys.includes(r.key)).map((r) => [r.key, r.effect]),
    );
  if (!set.size) return "default";
  if (keys.every((k) => set.get(k) === "deny")) return "none";
  if (keys.every((k) => set.get(k) === "allow")) return "full";
  const view = `${m.id}.view`;
  if (
    set.get(view) === "allow" &&
    m.actions.every(
      (a) => a === "view" || set.get(`${m.id}.${a}`) === "deny",
    ) &&
    m.fields.every((f) => !set.has(`${m.id}.field.${f}`))
  )
    return "view";
  return "custom";
}
/** One row per module: pick a level instead of editing each action. Presets
 * write ordinary overrides, so preview, delegation limits and audit apply. */
function ModuleAccess({
  modules,
  rules,
  effective,
  locked,
  onChange,
}: {
  modules: Module[];
  rules: AccessChangeInput["rules"];
  effective: UserAccessQuery["userAccess"]["effective"];
  locked: boolean;
  onChange: (keys: string[], rules: AccessChangeInput["rules"]) => void;
}) {
  const t = useT();
  const set = (m: Module, level: Level) => {
    const scope = m.id.startsWith("my_") ? "own" : "site",
      rule = (key: string, effect: string) => ({ key, effect, scope });
    onChange(
      moduleKeys(m),
      level === "none"
        ? moduleKeys(m).map((k) => rule(k, "deny"))
        : level === "full"
          ? moduleKeys(m).map((k) => rule(k, "allow"))
          : level === "view"
            ? m.actions.map((a) =>
                rule(`${m.id}.${a}`, a === "view" ? "allow" : "deny"),
              )
            : [],
    );
  };
  const groups = [...new Set(modules.map((m) => m.group))];
  return (
    <div className="grid gap-3">
      <p className="text-muted-foreground flex items-start gap-1.5 text-xs">
        <Info className="mt-px size-3.5 shrink-0" />
        {t(
          "Choose what this person can open. The sidebar shows only the modules they can use after they sign in again. Full access includes sensitive fields such as salary; use Detailed permissions for anything in between.",
          "चुनें कि यह व्यक्ति क्या खोल सकता है। दोबारा साइन इन करने पर साइडबार में केवल वही मॉड्यूल दिखेंगे। पूर्ण पहुँच में वेतन जैसे संवेदनशील फ़ील्ड शामिल हैं; बीच के विकल्पों के लिए विस्तृत अनुमतियाँ देखें।",
        )}
      </p>
      {groups.map((g) => (
        <section key={g} className="overflow-hidden rounded-lg border">
          <h3 className="bg-muted/40 border-b px-4 py-2 text-xs font-semibold tracking-wide uppercase">
            {t(g, hindi[g] ?? g)}
          </h3>
          <ul className="divide-y">
            {modules
              .filter((m) => m.group === g)
              .map((m) => {
                const level = levelOf(m, rules),
                  has = m.actions.filter(
                    (a) =>
                      effective.find((e) => e.key === `${m.id}.${a}`)?.decision
                        .allowed,
                  );
                return (
                  <li
                    key={m.id}
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {t(m.name, m.hindi)}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {has.length
                          ? `${t("Now", "अभी")}: ${has.map(humanize).join(", ")}`
                          : t("Now: no access", "अभी: कोई पहुँच नहीं")}
                      </p>
                    </div>
                    <NativeSelect
                      aria-label={`${m.id} access level`}
                      className="w-44"
                      disabled={locked}
                      value={level}
                      onChange={(e) => set(m, e.target.value as Level)}
                    >
                      {levels.map(([id, en, hi]) => (
                        <option key={id} value={id}>
                          {t(en, hi)}
                        </option>
                      ))}
                      {level === "custom" && (
                        <option value="custom" disabled>
                          {t("Custom", "कस्टम")}
                        </option>
                      )}
                    </NativeSelect>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function AccessPanel() {
  const t = useT(),
    scope = useScope();
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState("all"),
    // "?user=<id>" opens that person (from Roles & permissions).
    [selected, setSelected] = useState(
      () => new URLSearchParams(location.hash.split("?")[1]).get("user") ?? "",
    );
  const query = useScopedQuery<AccessUsersQuery>(
    ["access-users", search],
    AccessUsersDocument,
    { search },
  );
  const data = query.data?.accessUsers;
  // Actor flags do not depend on the search: keep the open editor (and its
  // draft) mounted while a new search loads.
  const [flags, setFlags] = useState<{
    isSuper: boolean;
    canManage: boolean;
  } | null>(null);
  useEffect(() => {
    if (data)
      setFlags({ isSuper: data.isSuperAdmin, canManage: data.canManage });
  }, [data]);
  const all = data?.users ?? [];
  const users = all.filter((u) => matches(u, status));
  const statusLabels: Record<string, string> = {
    all: t("All people", "सभी लोग"),
    active: t("Active", "सक्रिय"),
    inactive: t("Inactive", "निष्क्रिय"),
    protected: t("Protected", "सुरक्षित"),
  };
  return (
    <section className="grid gap-5">
      <Heading
        title={t("Users & module access", "उपयोगकर्ता और अनुमति")}
        description={`${scope.siteName} · ${t(
          "Set each person's role template and per-module permission overrides. Every change is previewed, needs a reason and is audited.",
          "हर व्यक्ति की भूमिका और मॉड्यूल अनुमतियाँ तय करें। हर बदलाव का पूर्वावलोकन, कारण और ऑडिट होता है।",
        )}`}
      >
        <Badge variant="outline" className="h-8 gap-1.5 px-3 font-normal">
          <LockKeyhole />
          {t("Changes apply to this site", "बदलाव इस साइट पर लागू होते हैं")}
        </Badge>
        <Badge variant="outline" className="h-8 gap-1.5 px-3 font-normal">
          <ShieldX />
          {t("Deny takes precedence", "अस्वीकृति को प्राथमिकता")}
        </Badge>
      </Heading>
      <div className="grid items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <Card className="gap-0 overflow-hidden py-0 lg:sticky lg:top-[78px] lg:max-h-[calc(100dvh-94px)]">
          <div className="grid gap-3 border-b p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold tracking-normal">
                {t("People", "लोग")}
              </h2>
              <Badge variant="secondary" className="tabular-nums">
                {data?.users.length ?? "—"}
              </Badge>
            </div>
            <div className="relative">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                aria-label={t("Search users", "उपयोगकर्ता खोजें")}
                placeholder={t("Search name or email", "नाम या ईमेल खोजें")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <NativeSelect
              aria-label={t("Filter by status", "स्थिति से छाँटें")}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-8 text-xs"
            >
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label} · {all.filter((u) => matches(u, value)).length}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="max-h-80 min-h-0 flex-1 overflow-y-auto p-2 lg:max-h-none">
            {query.isPending ? (
              <Skeleton />
            ) : query.error ? (
              <ErrorState
                error={query.error}
                retry={() => void query.refetch()}
              />
            ) : !users.length ? (
              <Empty
                icon={UserRound}
                title={t("No matching users", "कोई उपयोगकर्ता नहीं मिला")}
              />
            ) : (
              <ul role="list" className="grid gap-0.5">
                {users.map((u) => {
                  const on = u.id === selected;
                  return (
                    <li key={u.id}>
                      <button
                        type="button"
                        aria-current={on || undefined}
                        onClick={() => setSelected(u.id)}
                        className={cn(
                          "hover:bg-accent flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors",
                          on && "bg-primary/10 hover:bg-primary/10",
                        )}
                      >
                        <Avatar className="size-9">
                          <AvatarFallback
                            className={cn(
                              "text-[11px]",
                              on
                                ? "bg-primary text-primary-foreground"
                                : "bg-primary/10 text-primary",
                            )}
                          >
                            {initials(u.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {u.name}
                          </span>
                          <span className="text-muted-foreground block truncate text-xs">
                            {u.email}
                          </span>
                        </span>
                        {u.protected ? (
                          <span
                            className="text-warning shrink-0"
                            title={t("Protected account", "सुरक्षित खाता")}
                          >
                            <ShieldCheck className="size-4" />
                            <span className="sr-only">
                              {t("Protected account", "सुरक्षित खाता")}
                            </span>
                          </span>
                        ) : !u.active ? (
                          <Badge variant="secondary" className="shrink-0">
                            {t("Inactive", "निष्क्रिय")}
                          </Badge>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <p className="text-muted-foreground border-t px-4 py-3 text-xs">
            {t(
              "Showing up to 100 matching accounts. Search to narrow the list.",
              "अधिकतम 100 खाते। सूची छोटी करने के लिए खोजें।",
            )}
          </p>
        </Card>
        <div className="min-w-0">
          {selected && flags ? (
            <AccessEditor
              key={selected}
              userId={selected}
              isSuper={flags.isSuper}
              canManage={flags.canManage}
            />
          ) : (
            <Empty
              icon={UserRound}
              title={t(
                "Choose a person to begin",
                "शुरू करने के लिए व्यक्ति चुनें",
              )}
            >
              {t(
                "Review assigned sites, role defaults and individual permissions.",
                "साइट, भूमिका और व्यक्तिगत अनुमतियों की समीक्षा करें।",
              )}
            </Empty>
          )}
        </div>
      </div>
    </section>
  );
}
function AccessEditor({
  userId,
  isSuper,
  canManage,
}: {
  userId: string;
  isSuper: boolean;
  canManage: boolean;
}) {
  const scope = useScope(),
    t = useT(),
    write = useWrite();
  const query = useScopedQuery<UserAccessQuery>(
    ["user-access", userId],
    UserAccessDocument,
    { userId },
  );
  const [draft, setDraft] = useState<AccessChangeInput | null>(null),
    [search, setSearch] = useState(""),
    [groups, setGroups] = useState<string[]>([]),
    [overridesOnly, setOverridesOnly] = useState(false),
    [tab, setTab] = useState("modules"),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [preview, setPreview] = useState<
      PreviewAccessMutation["previewAccess"] | null
    >(null);
  const user = query.data?.userAccess;
  useEffect(() => {
    if (user) setDraft(toDraft(user));
  }, [user?.version, user?.id]);
  const modules = useMemo(
    () =>
      scope.modules.filter((m) =>
        `${m.name} ${m.hindi} ${m.group}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [scope.modules, search],
  );
  const card = useRef<HTMLDivElement>(null);
  const loaded = !!user && !!draft;
  useEffect(() => {
    // Stacked layout: bring the loaded editor into view below the people list.
    if (loaded && matchMedia("(max-width: 1023px)").matches)
      card.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [loaded]);
  if (query.isPending)
    return (
      <Card className="p-5">
        <Skeleton />
      </Card>
    );
  if (query.error)
    return (
      <ErrorState error={query.error} retry={() => void query.refetch()} />
    );
  if (!user || !draft) return null;
  const locked =
    !canManage || (!isSuper && (user.protected || userId === scope.actorId));
  const update = (patch: Partial<AccessChangeInput>) => {
    setDraft({ ...draft, ...patch });
    setPreview(null);
    setMessage("");
  };
  const ruleChange = (
    m: Module,
    key: string,
    patch: { effect?: string; scope?: string },
  ) => {
    const old = draft.rules.find((r) => r.key === key);
    const effective = user.effective.find((r) => r.key === key)?.decision;
    const next = {
      key,
      effect: old?.effect ?? "inherit",
      scope:
        old?.scope ??
        (siteOnly.includes(m.id) || key === "employees.create"
          ? "site"
          : (effective?.scope ?? "own")),
      ...patch,
    };
    update({
      rules: [...draft.rules.filter((r) => r.key !== key), next].filter(
        (r) => r.effect !== "inherit",
      ),
    });
  };
  async function review() {
    setBusy(true);
    setError("");
    try {
      const r = await write<PreviewAccessMutation>(PreviewAccessDocument, {
        userId,
        input: draft,
      });
      setPreview(r.previewAccess);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    setBusy(true);
    setError("");
    try {
      await write<SaveAccessMutation>(SaveAccessDocument, {
        userId,
        input: draft,
      });
      setPreview(null);
      setMessage(
        t(
          "Access updated. Existing sessions were signed out.",
          "अनुमति अपडेट हुई। मौजूदा सत्र साइन आउट किए गए।",
        ),
      );
      const channel = new BroadcastChannel("dg.access");
      channel.postMessage({ userId });
      channel.close();
      if (userId === scope.actorId) scope.reload();
    } catch (e) {
      setPreview(null);
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const dirty = signature(draft) !== signature(toDraft(user));
  const overridden = (key: string) =>
    draft.rules.some((r) => r.key === key) ||
    draft.delegations.some((d) => d.key === key);
  const groupNames = [...new Set(scope.modules.map((m) => m.group))];
  const groupCounts = new Map<unknown, number>();
  for (const m of scope.modules)
    groupCounts.set(m.group, (groupCounts.get(m.group) ?? 0) + 1);
  const sections = modules
    .filter((m) => !groups.length || groups.includes(m.group))
    .map((m) => ({
      m,
      actions: [...m.actions, ...m.fields.map((f) => `field.${f}`)].filter(
        (a) => !overridesOnly || overridden(`${m.id}.${a}`),
      ),
    }))
    .filter((x) => x.actions.length);
  const filtering = !!search || groups.length > 0 || overridesOnly;
  const clearFilters = () => {
    setSearch("");
    setGroups([]);
    setOverridesOnly(false);
  };
  const head = "bg-muted/40 px-3 tracking-normal normal-case";
  // Below `sm` the matrix stacks: name on top, then the controls side by side.
  const cell = "text-sm max-sm:border-0 max-sm:p-0";
  return (
    <Card ref={card} className="scroll-mt-20 gap-5 p-5">
      {/* .editor-header is measured by the mobile access browser test. */}
      <div className="editor-header flex flex-wrap items-start gap-x-4 gap-y-3">
        <Avatar className="size-12">
          <AvatarFallback className="bg-primary/10 text-primary text-sm">
            {initials(user.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 space-y-0.5">
          <h2 className="truncate text-lg font-semibold tracking-tight">
            {user.name}
          </h2>
          <p className="text-muted-foreground truncate text-sm">{user.email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="info">
            <UserCog />
            {t(
              roleLabels[user.role] ?? user.role,
              hindi[user.role] ?? user.role,
            )}
          </Badge>
          {user.protected && (
            <Badge variant="warning">
              <ShieldCheck />
              {t("Protected", "सुरक्षित")}
            </Badge>
          )}
          <Badge variant={user.active ? "success" : "secondary"}>
            {user.active
              ? t("Active membership", "सक्रिय सदस्यता")
              : t("Inactive membership", "निष्क्रिय सदस्यता")}
          </Badge>
          <Badge variant="outline">
            {t("Access version", "अनुमति संस्करण")} {user.version}
          </Badge>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs font-medium">
          <MapPin className="size-3.5" />
          {t("Assigned sites", "नियुक्त साइटें")}
        </span>
        {user.sites.length ? (
          user.sites.map((s) => (
            <Badge key={s.id} variant={s.active ? "success" : "secondary"}>
              {s.name}
              {s.active ? "" : ` · ${t("inactive", "निष्क्रिय")}`}
            </Badge>
          ))
        ) : (
          <span className="text-muted-foreground text-xs">
            {t("No assigned sites", "कोई साइट नहीं")}
          </span>
        )}
      </div>
      {locked && (
        <Alert variant="warning">
          <LockKeyhole />
          <AlertDescription>
            {user.protected
              ? t(
                  "This protected account can only be changed by a Super Admin.",
                  "यह सुरक्षित खाता केवल सुपर एडमिन बदल सकते हैं।",
                )
              : t(
                  "Your account can review this access but cannot change it.",
                  "आप यह अनुमति देख सकते हैं, बदल नहीं सकते।",
                )}
          </AlertDescription>
        </Alert>
      )}
      <div className="bg-muted/30 grid gap-4 rounded-lg border p-4 sm:grid-cols-[minmax(0,260px)_1fr] sm:items-end">
        <Field
          label={t("Role template", "भूमिका टेम्पलेट")}
          htmlFor="access-role"
        >
          <NativeSelect
            id="access-role"
            aria-label="Role template"
            disabled={locked}
            value={draft.role}
            onChange={(e) => update({ role: e.target.value })}
          >
            {Object.entries(roleLabels).map(([id, name]) => (
              <option
                value={id}
                key={id}
                disabled={!isSuper && id === "super_admin"}
              >
                {t(name, hindi[id] ?? name)}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <div className="flex h-9 items-center gap-2.5">
          <Switch
            id="access-active"
            checked={draft.active}
            disabled={locked}
            onChange={(e) => update({ active: e.target.checked })}
          />
          <Label htmlFor="access-active">
            {t("Active at this site", "इस साइट पर सक्रिय")}
          </Label>
        </div>
      </div>
      <Tabs value={tab} onValueChange={setTab} className="gap-4">
        <TabsList className="max-w-full justify-start overflow-x-auto">
          <TabsTrigger value="modules" className="flex-none">
            <LayoutGrid />
            {t("Modules", "मॉड्यूल")}
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex-none">
            <SlidersHorizontal />
            {t("Detailed permissions", "विस्तृत अनुमतियाँ")}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-none">
            <History />
            {t("Change history", "बदलाव इतिहास")}
            <span className="text-muted-foreground text-xs tabular-nums">
              {user.audit.length}
            </span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="modules">
          <ModuleAccess
            modules={scope.modules.filter((m) => m.available)}
            rules={draft.rules}
            effective={user.effective}
            locked={locked}
            onChange={(keys, rules) =>
              update({
                rules: [
                  ...draft.rules.filter((r) => !keys.includes(r.key)),
                  ...rules,
                ],
              })
            }
          />
        </TabsContent>
        <TabsContent value="permissions" className="grid gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                aria-label="Search modules"
                value={search}
                placeholder={t("Find a module…", "मॉड्यूल खोजें…")}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8"
              />
            </div>
            <FacetedFilter
              title={t("Group", "समूह")}
              options={groupNames.map((g) => ({
                value: g,
                label: t(g, hindi[g] ?? g),
              }))}
              selected={groups}
              onChange={setGroups}
              counts={groupCounts}
            />
            <div className="flex h-8 items-center gap-2 px-1">
              <Switch
                id="access-overrides"
                checked={overridesOnly}
                onChange={(e) => setOverridesOnly(e.target.checked)}
              />
              <Label htmlFor="access-overrides" className="font-normal">
                {t("Overrides only", "केवल बदलाव")}
              </Label>
            </div>
            {filtering && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                {t("Reset", "रीसेट")}
                <X className="size-4" />
              </Button>
            )}
          </div>
          <p className="text-muted-foreground flex items-start gap-1.5 text-xs">
            <Info className="mt-px size-3.5 shrink-0" />
            {t(
              "Actions and fields also require View at an equal or broader record scope.",
              "कार्रवाइयों और फ़ील्ड के लिए समान या व्यापक दायरे में देखने की अनुमति आवश्यक है।",
            )}
          </p>
          {sections.length ? (
            <div className="overflow-hidden rounded-lg border">
              <Table
                className={cn(
                  "max-sm:block",
                  isSuper ? "sm:min-w-[720px]" : "sm:min-w-[540px]",
                )}
              >
                <TableHeader className="max-sm:hidden">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={cn(head, "px-4")}>
                      {t("Permission", "अनुमति")}
                    </TableHead>
                    <TableHead className={head}>
                      {t("Override", "बदलाव")}
                    </TableHead>
                    <TableHead className={head}>
                      {t("Record scope", "रिकॉर्ड दायरा")}
                    </TableHead>
                    {isSuper && (
                      <TableHead className={head}>
                        {t("Delegation", "आगे देना")}
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                {sections.map(({ m, actions }) => (
                  <TableBody key={m.id} className="max-sm:block">
                    <TableRow className="bg-muted/20 hover:bg-muted/20 max-sm:block">
                      <th
                        scope="rowgroup"
                        colSpan={isSuper ? 4 : 3}
                        className="border-border text-foreground border-y bg-transparent px-4 py-2.5 text-left text-sm font-normal tracking-normal whitespace-normal normal-case max-sm:block"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">
                            {t(m.name, m.hindi)}
                          </span>
                          <Badge variant="outline" className="font-normal">
                            {t(m.group, hindi[m.group] ?? m.group)}
                          </Badge>
                          <Badge
                            variant={m.available ? "success" : "secondary"}
                          >
                            {m.available
                              ? t("Available", "उपलब्ध")
                              : `${t("Phase", "चरण")} ${m.phase}`}
                          </Badge>
                          {m.dependencies.length > 0 && (
                            <span className="text-muted-foreground text-xs">
                              {t("Requires", "आवश्यक")}:{" "}
                              {m.dependencies.join(", ")}
                            </span>
                          )}
                        </div>
                        {!m.available && (
                          <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
                            <Info className="size-3.5 shrink-0" />
                            {t(
                              "Unreleased. Permissions can be prepared; this module is not operational yet.",
                              "अभी जारी नहीं हुआ। अनुमतियाँ तैयार कर सकते हैं; मॉड्यूल चालू नहीं है।",
                            )}
                          </p>
                        )}
                      </th>
                    </TableRow>
                    {actions.map((action) => {
                      const key = `${m.id}.${action}`,
                        name = action.replace("field.", ""),
                        rule = draft.rules.find((r) => r.key === key),
                        effective = user.effective.find(
                          (e) => e.key === key,
                        )?.decision,
                        delegation = draft.delegations.find(
                          (d) => d.key === key,
                        );
                      return (
                        <TableRow
                          key={key}
                          className="max-sm:grid max-sm:grid-cols-2 max-sm:gap-2 max-sm:px-4 max-sm:py-3"
                        >
                          <TableCell
                            className={cn(
                              cell,
                              "px-4 whitespace-normal max-sm:col-span-2",
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium capitalize">
                                {t(name, hindi[name] ?? action)}
                              </span>
                              {action.startsWith("field.") && (
                                <Badge
                                  variant="outline"
                                  className="font-normal"
                                >
                                  {t("Field", "फ़ील्ड")}
                                </Badge>
                              )}
                            </div>
                            <p
                              className={cn(
                                "mt-0.5 flex items-center gap-1.5 text-xs",
                                effective?.allowed
                                  ? "text-success"
                                  : "text-muted-foreground",
                              )}
                            >
                              {effective?.allowed ? (
                                <CircleCheck className="size-3.5 shrink-0" />
                              ) : (
                                <CircleMinus className="size-3.5 shrink-0" />
                              )}
                              {effective ? explain(effective.rule, t) : ""}
                            </p>
                          </TableCell>
                          <TableCell className={cell}>
                            <NativeSelect
                              aria-label={`${key} override`}
                              value={rule?.effect ?? "inherit"}
                              disabled={locked}
                              onChange={(e) =>
                                ruleChange(m, key, { effect: e.target.value })
                              }
                              className={cn(
                                "h-8 w-32 max-sm:w-full",
                                rule?.effect === "allow" &&
                                  "[&_select]:border-success/60 [&_select]:bg-success/5",
                                rule?.effect === "deny" &&
                                  "[&_select]:border-destructive/60 [&_select]:bg-destructive/5",
                              )}
                            >
                              <option value="inherit">
                                {t("Inherit", "विरासत")}
                              </option>
                              <option value="allow">
                                {t("Allow", "अनुमति")}
                              </option>
                              <option value="deny">
                                {t("Deny", "अस्वीकृत")}
                              </option>
                            </NativeSelect>
                          </TableCell>
                          <TableCell className={cell}>
                            <NativeSelect
                              aria-label={`${key} scope`}
                              disabled={
                                locked || !rule || rule.effect !== "allow"
                              }
                              value={rule?.scope ?? effective?.scope ?? "own"}
                              onChange={(e) =>
                                ruleChange(m, key, { scope: e.target.value })
                              }
                              className="h-8 w-40 max-sm:w-full"
                            >
                              {scopeOptions(m.id, action).map(([id, label]) => (
                                <option key={id} value={id}>
                                  {t(label, hindi[id] ?? label)}
                                </option>
                              ))}
                            </NativeSelect>
                          </TableCell>
                          {isSuper && (
                            <TableCell
                              className={cn(cell, "max-sm:col-span-2")}
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <label className="flex items-center gap-1.5 text-xs font-normal whitespace-nowrap">
                                  <input
                                    type="checkbox"
                                    className="accent-primary size-4"
                                    disabled={locked}
                                    checked={!!delegation}
                                    onChange={(e) =>
                                      update({
                                        delegations: e.target.checked
                                          ? [
                                              ...draft.delegations,
                                              {
                                                key,
                                                scope:
                                                  rule?.scope === "organization"
                                                    ? "site"
                                                    : (rule?.scope ?? "site"),
                                              },
                                            ]
                                          : draft.delegations.filter(
                                              (d) => d.key !== key,
                                            ),
                                      })
                                    }
                                  />
                                  {t("May delegate", "आगे दे सकते हैं")}
                                </label>
                                {delegation && (
                                  <NativeSelect
                                    aria-label={`${key} delegation limit`}
                                    value={delegation.scope}
                                    disabled={locked}
                                    onChange={(e) =>
                                      update({
                                        delegations: draft.delegations.map(
                                          (d) =>
                                            d.key === key
                                              ? { ...d, scope: e.target.value }
                                              : d,
                                        ),
                                      })
                                    }
                                    className="h-8 w-28 text-xs"
                                  >
                                    <option value="own">Own limit</option>
                                    <option value="team">Team limit</option>
                                    <option value="site">Site limit</option>
                                  </NativeSelect>
                                )}
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                ))}
              </Table>
            </div>
          ) : (
            <div className="text-muted-foreground grid justify-items-center gap-2 rounded-lg border border-dashed p-8 text-center text-sm">
              {t(
                "No modules match your search or filters.",
                "खोज या फ़िल्टर से कोई मॉड्यूल नहीं मिला।",
              )}
              <Button variant="outline" size="sm" onClick={clearFilters}>
                {t("Clear filters", "फ़िल्टर हटाएँ")}
              </Button>
            </div>
          )}
        </TabsContent>
        <TabsContent value="history">
          {user.audit.length ? (
            <ol className="ml-3 grid gap-5 border-l pl-6">
              {user.audit.map((a) => (
                <li key={a.id} className="relative">
                  <span className="bg-card text-muted-foreground absolute top-0 -left-[37px] flex size-6 items-center justify-center rounded-full border">
                    <History className="size-3.5" />
                  </span>
                  <p className="text-sm font-medium">{a.reason}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {formatDateTime(a.createdAt)} · v{a.version} ·{" "}
                    {a.changes.length} {t("effective changes", "प्रभावी बदलाव")}
                  </p>
                  {a.changes.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-primary w-fit cursor-pointer text-xs font-medium">
                        {t("View changes", "बदलाव देखें")}
                      </summary>
                      <ul className="mt-2 grid gap-1.5">
                        {a.changes.map((c) => (
                          <li
                            key={c.key}
                            className="flex flex-wrap items-center gap-2 text-xs"
                          >
                            <code className="bg-muted rounded px-1.5 py-0.5 font-mono">
                              {c.key}
                            </code>
                            <Badge
                              variant={
                                c.before.allowed ? "success" : "secondary"
                              }
                            >
                              {c.before.allowed
                                ? t("Allow", "अनुमति")
                                : t("Deny", "अस्वीकृत")}
                            </Badge>
                            <ArrowRight className="text-muted-foreground size-3" />
                            <Badge
                              variant={
                                c.after.allowed ? "success" : "destructive"
                              }
                            >
                              {c.after.allowed
                                ? t("Allow", "अनुमति")
                                : t("Deny", "अस्वीकृत")}
                            </Badge>
                            <span className="text-muted-foreground">
                              {scopeLabels[c.after.scope] ?? c.after.scope}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <Empty
              icon={History}
              title={t("No access changes yet", "अभी कोई अनुमति बदलाव नहीं")}
            />
          )}
        </TabsContent>
      </Tabs>
      {!locked && (
        <div className="bg-card sticky bottom-0 z-10 -mx-5 -mb-5 grid gap-3 rounded-b-xl border-t px-5 py-4 shadow-[0_-6px_16px_-12px_rgb(0_0_0/0.25)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="grid flex-1 gap-1.5">
              <Label htmlFor="access-reason">
                {t("Reason for changes", "बदलाव का कारण")}
              </Label>
              <Textarea
                id="access-reason"
                aria-label="Reason for changes"
                rows={1}
                className="max-h-40 min-h-9 resize-none"
                value={draft.reason ?? ""}
                onChange={(e) => update({ reason: e.target.value })}
                placeholder={t(
                  "Explain the business reason for this change…",
                  "इस बदलाव का व्यावसायिक कारण…",
                )}
                minLength={8}
                maxLength={500}
              />
            </div>
            <div className="flex items-center justify-between gap-3 md:justify-end">
              {dirty ? (
                <Badge variant="warning">
                  {t("Unsaved changes", "सहेजे नहीं गए बदलाव")}
                </Badge>
              ) : (
                <span className="text-muted-foreground text-xs">
                  {t("No changes yet", "अभी कोई बदलाव नहीं")}
                </span>
              )}
              <Button
                disabled={
                  locked ||
                  busy ||
                  !navigator.onLine ||
                  (draft.reason?.trim().length ?? 0) < 8
                }
                onClick={() => void review()}
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <SlidersHorizontal className="size-4" />
                )}
                {busy
                  ? t("Checking…", "जाँच हो रही है…")
                  : t("Preview changes", "बदलाव का पूर्वावलोकन")}
              </Button>
            </div>
          </div>
          <p className="text-muted-foreground hidden items-center gap-1.5 text-xs sm:flex">
            <ShieldCheck className="size-3.5" />
            {t(
              "Preview checks delegation limits and account safeguards.",
              "पूर्वावलोकन में अनुमति सीमाएँ और खाता सुरक्षा जाँची जाती हैं।",
            )}
          </p>
          {error && (
            <Alert variant="destructive">
              <TriangleAlert />
              <AlertDescription>
                {error}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-1"
                  onClick={() => {
                    setDraft(null);
                    void query.refetch().then((r) => {
                      const u = r.data?.userAccess;
                      if (u) setDraft(toDraft(u));
                    });
                  }}
                >
                  <RotateCcw className="size-4" />
                  {t("Reload current access", "मौजूदा अनुमति फिर लोड करें")}
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {message && <Notice success>{message}</Notice>}
        </div>
      )}
      {preview && (
        <Dialog
          open
          onOpenChange={(open) => !open && !busy && setPreview(null)}
        >
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {t("Review access changes", "अनुमति बदलाव की समीक्षा")}
              </DialogTitle>
              <DialogDescription>
                {user.name} · {scope.siteName} · v{preview.version}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="info">
                <UserCog />
                {roleLabels[draft.role] ?? draft.role}
              </Badge>
              <Badge variant={draft.active ? "success" : "destructive"}>
                {draft.active
                  ? t("Active membership", "सक्रिय सदस्यता")
                  : t("Inactive membership", "निष्क्रिय सदस्यता")}
              </Badge>
            </div>
            <blockquote className="bg-muted/50 rounded-md border-l-2 px-3 py-2 text-sm">
              {draft.reason}
            </blockquote>
            {preview.changes.length ? (
              <ul className="max-h-[45vh] divide-y overflow-y-auto rounded-lg border">
                {preview.changes.map((c) => (
                  <li key={c.key} className="grid gap-1.5 px-3 py-2.5">
                    <code className="font-mono text-xs">{c.key}</code>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={c.before.allowed ? "success" : "secondary"}
                      >
                        {c.before.allowed
                          ? scopeLabels[c.before.scope]
                          : t("Denied", "अस्वीकृत")}
                      </Badge>
                      <ArrowRight className="text-muted-foreground size-3.5" />
                      <Badge
                        variant={c.after.allowed ? "success" : "destructive"}
                      >
                        {c.after.allowed
                          ? scopeLabels[c.after.scope]
                          : t("Denied", "अस्वीकृत")}
                      </Badge>
                      <span className="text-muted-foreground text-xs">
                        {explain(c.after.rule, t)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <Notice>
                {t(
                  "No effective access changes. The new role or override configuration will still be audited.",
                  "प्रभावी अनुमति में बदलाव नहीं। भूमिका या नियम का बदलाव ऑडिट में दर्ज होगा।",
                )}
              </Notice>
            )}
            <Notice>
              {t(
                "Saving signs this user out on all devices. They will sign in with the new access.",
                "सहेजने पर यह उपयोगकर्ता सभी उपकरणों से साइन आउट होगा।",
              )}
            </Notice>
            <DialogFooter>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => setPreview(null)}
              >
                {t("Keep editing", "संपादन जारी रखें")}
              </Button>
              <Button disabled={busy} onClick={() => void save()}>
                {busy && <Loader2 className="size-4 animate-spin" />}
                {busy
                  ? t("Saving…", "सहेजा जा रहा है…")
                  : t("Confirm access changes", "अनुमति बदलाव सहेजें")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}
