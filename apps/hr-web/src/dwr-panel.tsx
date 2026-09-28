import { AiIcon } from "@/components/ui/ai-icon";
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { FileText, MessageSquare, Settings2, Users } from "lucide-react";
import {
  DwrCommandDocument,
  DwrDocument,
} from "../../../packages/contracts/src/generated";
import { useScope, useScopedQuery, useWrite } from "./workspace-context";
import { ErrorState, PageSkeleton, useT } from "./ui";
import { useUrlChoice } from "./hooks/use-url-choice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useChatHome, type Agent } from "./dwr/api";
import { ChatsTab } from "./dwr/chat";
import { GroupSheet, GroupsTab, NewGroupDialog } from "./dwr/groups";
import { ReportDialog, ReportsTab, type ReportTarget } from "./dwr/reports";
export function DwrHomeSummary() {
  const s = useScope(),
    q = useScopedQuery<any>(
      ["dwr"],
      DwrDocument,
      {},
      s.capabilities.some((c) =>
        ["my_dwr.view", "dwr_review.view"].includes(c),
      ),
    );
  if (!q.data) return null;
  const rows = q.data.dwr.reports;
  return (
    <div className="dwr-summary">
      <FileText size={22} />
      <div>
        <strong>Daily work reports</strong>
        <p className="muted">
          {rows.filter((r: any) => r.status === "submitted").length} awaiting
          review ·{" "}
          {rows.filter((r: any) => r.isSelf && r.status === "returned").length}{" "}
          returned to you
        </p>
      </div>
      <Link to="/dwr">Open DWR →</Link>
    </div>
  );
}
export function AgentBadge({ agent }: { agent: Agent }) {
  const t = useT();
  return agent.online ? (
    <Badge variant="success" title={agent.model ?? undefined}>
      <span className="bg-success size-1.5 rounded-full" />
      {t("AI agent online", "AI एजेंट ऑनलाइन")}
    </Badge>
  ) : agent.configured ? (
    <Badge variant="warning">{t("AI agent offline", "AI एजेंट ऑफ़लाइन")}</Badge>
  ) : (
    <Badge variant="outline">
      {t("AI agent not configured", "AI एजेंट सेट नहीं")}
    </Badge>
  );
}
export function DwrPanel() {
  const t = useT(),
    s = useScope();
  const home = useChatHome();
  const reports = useScopedQuery<any>(["dwr"], DwrDocument, {}, true, 15000);
  const canGroups =
    s.capabilities.includes("dwr_groups.view") ||
    s.capabilities.includes("dwr_groups.create");
  const canSettings = s.capabilities.includes("site_settings.manage");
  const [tab, setTab] = useUrlChoice(
    "tab",
    [
      "chats",
      "reports",
      ...(canGroups ? ["groups"] : []),
      ...(canSettings ? ["settings"] : []),
    ],
    "chats",
  );
  const [report, setReport] = useState<ReportTarget | null>(null),
    [group, setGroup] = useState<string | null>(null),
    [creating, setCreating] = useState(false),
    [chat, setChat] = useState<{ key: number; id: string | null }>({
      key: 0,
      id: null,
    });
  if (home.isPending || reports.isPending)
    return (
      <PageSkeleton title={t("Daily work reports", "दैनिक कार्य रिपोर्ट")} />
    );
  if (home.error || reports.error)
    return (
      <ErrorState
        error={(home.error ?? reports.error)!}
        retry={() => {
          void home.refetch();
          void reports.refetch();
        }}
      />
    );
  const h = home.data!.dwrChat,
    d = reports.data.dwr;
  const create = h.permissions.createGroups
    ? () => setCreating(true)
    : undefined;
  return (
    <section className="grid gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-xs font-semibold tracking-wider">
            {t("WORK · DAILY REPORTS", "कार्य · दैनिक रिपोर्ट")}
          </p>
          <h1 className="mt-1 flex items-center gap-3">
            {t("Daily work reports", "दैनिक कार्य रिपोर्ट")}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {t(
              "Teams chat their day in Hindi, English or Hinglish. The AI agent prepares each person's DWR; people review and submit.",
              "टीमें हिंदी, अंग्रेज़ी या हिंग्लिश में दिन का काम लिखती हैं। AI एजेंट हर व्यक्ति की DWR तैयार करता है; लोग जाँचकर भेजते हैं।",
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AgentBadge agent={h.agent} />
          {create && (
            <Button size="sm" onClick={create}>
              <Users className="size-4" />
              {t("New group", "नया समूह")}
            </Button>
          )}
        </div>
      </header>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="chats">
            <MessageSquare />
            {t("Chats", "चैट")}
          </TabsTrigger>
          <TabsTrigger value="reports">
            <FileText />
            {t("Reports", "रिपोर्ट")}
          </TabsTrigger>
          {canGroups && (
            <TabsTrigger value="groups">
              <Users />
              {t("Groups", "समूह")}
            </TabsTrigger>
          )}
          {canSettings && (
            <TabsTrigger value="settings">
              <Settings2 />
              {t("Settings", "सेटिंग")}
            </TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="chats" className="mt-2">
          <ChatsTab
            key={chat.key}
            initial={chat.id}
            home={h}
            openReport={(workDate, employeeId) =>
              setReport({ workDate, employeeId })
            }
            manageGroup={setGroup}
            newGroup={create}
          />
        </TabsContent>
        <TabsContent value="reports" className="mt-2">
          <ReportsTab data={d} open={setReport} />
        </TabsContent>
        {canGroups && (
          <TabsContent value="groups" className="mt-2">
            <GroupsTab
              home={h}
              manage={setGroup}
              openChat={(id) => {
                setChat((c) => ({ key: c.key + 1, id }));
                setTab("chats");
              }}
            />
          </TabsContent>
        )}
        {canSettings && (
          <TabsContent value="settings" className="mt-2">
            <SettingsTab settings={d.settings} agent={h.agent} />
          </TabsContent>
        )}
      </Tabs>
      <ReportDialog target={report} onClose={() => setReport(null)} />
      <GroupSheet
        groupId={group}
        onClose={() => {
          setGroup(null);
          void home.refetch();
        }}
      />
      <NewGroupDialog
        open={creating}
        onOpenChange={setCreating}
        onCreated={(id) => {
          void home.refetch();
          setGroup(id);
        }}
      />
    </section>
  );
}
function SettingsTab({ settings, agent }: { settings: any; agent: Agent }) {
  const t = useT(),
    write = useWrite(),
    [busy, setBusy] = useState(false);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>
            {t("Deadline & reminders", "समय सीमा और अनुस्मारक")}
          </CardTitle>
          <CardDescription>
            {t(
              "Employees who have not submitted by the deadline receive one reminder.",
              "समय सीमा तक न भेजने वालों को एक अनुस्मारक मिलता है।",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              setBusy(true);
              try {
                await write(DwrCommandDocument, {
                  operation: "settings",
                  input: {
                    expectedVersion: settings?.version ?? 0,
                    deadline: f.get("deadline"),
                    deadlineDayOffset: Number(f.get("offset")),
                    reminderMinutes: Number(f.get("reminder")),
                    amendments: f.has("amend"),
                    offlineDrafts: f.has("offline"),
                    reason: f.get("reason"),
                  },
                });
                toast.success(t("Settings saved", "सेटिंग सहेजी गई"));
              } catch (err) {
                toast.error((err as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="dwr-deadline">
                  {t("Deadline (site time)", "समय सीमा (साइट समय)")}
                </Label>
                <Input
                  id="dwr-deadline"
                  name="deadline"
                  type="time"
                  required
                  defaultValue={settings?.deadline.slice(0, 5) ?? "18:00"}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="dwr-offset">{t("Day", "दिन")}</Label>
                <NativeSelect
                  id="dwr-offset"
                  name="offset"
                  defaultValue={settings?.deadline_day_offset ?? 0}
                >
                  <option value="0">{t("Work date", "कार्य तिथि")}</option>
                  <option value="1">{t("Following day", "अगला दिन")}</option>
                </NativeSelect>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="dwr-reminder">
                  {t("Reminder minutes before", "कितने मिनट पहले अनुस्मारक")}
                </Label>
                <Input
                  id="dwr-reminder"
                  name="reminder"
                  type="number"
                  min="0"
                  max="1440"
                  defaultValue={settings?.reminder_minutes ?? 30}
                />
              </div>
            </div>
            <label className="flex items-center gap-3 text-sm">
              <Switch name="amend" defaultChecked={settings?.amendments} />
              {t(
                "Allow reasoned amendments after approval",
                "स्वीकृति के बाद कारण सहित संशोधन की अनुमति",
              )}
            </label>
            <label className="flex items-center gap-3 text-sm">
              <Switch
                name="offline"
                defaultChecked={settings?.offline_drafts}
              />
              {t(
                "Allow encrypted offline report drafts on phones",
                "फ़ोन पर एन्क्रिप्टेड ऑफ़लाइन ड्राफ़्ट की अनुमति",
              )}
            </label>
            <div className="grid gap-1.5">
              <Label htmlFor="dwr-reason">
                {t("Reason for change", "बदलाव का कारण")}
              </Label>
              <Input
                id="dwr-reason"
                name="reason"
                required
                minLength={8}
                maxLength={500}
              />
            </div>
            <Button
              type="submit"
              disabled={busy}
              className="justify-self-start"
            >
              {t("Save settings", "सेटिंग सहेजें")}
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AiIcon className="size-4" /> {t("AI DWR agent", "AI DWR एजेंट")}
          </CardTitle>
          <CardDescription>
            {t(
              "Runs in the worker with the server-side OpenRouter key. Keys never reach browsers or phones.",
              "सर्वर-साइड OpenRouter कुंजी के साथ वर्कर में चलता है। कुंजी ब्राउज़र या फ़ोन तक नहीं पहुँचती।",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <div className="flex items-center gap-2">
            <AgentBadge agent={agent} />
            {agent.model && (
              <code className="bg-muted rounded px-1.5 py-0.5 text-xs">
                {agent.model}
              </code>
            )}
          </div>
          <ul className="text-muted-foreground list-disc space-y-1 pl-5">
            <li>
              {t(
                "Each person's DWR is prepared from their own messages that day, about 10 minutes after they stop writing, or immediately on request.",
                "हर व्यक्ति की DWR उस दिन के उनके अपने संदेशों से, लिखना बंद करने के लगभग 10 मिनट बाद या अनुरोध पर तुरंत बनती है।",
              )}
            </li>
            <li>
              {t(
                "The AI never submits, approves or changes identity; the employee submits and reviewers decide.",
                "AI कभी नहीं भेजता, स्वीकृत नहीं करता; कर्मचारी भेजते हैं और समीक्षक निर्णय लेते हैं।",
              )}
            </li>
            <li>
              {t(
                "Manual edits are never overwritten automatically, and a submitted DWR locks that day's messages.",
                "मैनुअल बदलाव स्वतः नहीं बदले जाते, और भेजी गई DWR उस दिन के संदेश लॉक करती है।",
              )}
            </li>
            <li>
              {t(
                "Without the agent, employees can still send their chat as the report.",
                "एजेंट के बिना भी कर्मचारी अपनी चैट को रिपोर्ट के रूप में भेज सकते हैं।",
              )}
            </li>
          </ul>
          {!agent.configured && (
            <p className="bg-muted rounded-md p-3 text-xs">
              {t("Worker setup:", "वर्कर सेटअप:")}{" "}
              <code>OPENROUTER_API_KEY</code>, <code>OPENROUTER_DWR_MODEL</code>{" "}
              {t("(optional", "(वैकल्पिक")} <code>OPENROUTER_DWR_PROVIDER</code>
              , <code>DWR_AGENT_USER_DAILY_CALLS</code>,{" "}
              <code>DWR_AGENT_ORG_DAILY_CALLS</code>).
              {" "}{t("Or select Groq with", "या Groq चुनें:")}{" "}
              <code>DWR_AI_PROVIDER=groq</code>, <code>GROQ_API_KEY</code>,{" "}
              <code>GROQ_DWR_MODEL</code>.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
