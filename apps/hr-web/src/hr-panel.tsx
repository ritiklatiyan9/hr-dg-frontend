import { useId, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { ColumnDef, ColumnFiltersState } from "@tanstack/react-table";
import {
  Archive,
  BadgeCheck,
  BellRing,
  BookOpenCheck,
  CalendarCheck,
  CalendarClock,
  CheckCheck,
  ChevronRight,
  Circle,
  CircleCheck,
  CircleX,
  ClipboardCheck,
  Clock,
  ContactRound,
  Ellipsis,
  Eye,
  FilePen,
  FileText,
  Headset,
  History,
  Hourglass,
  Inbox,
  Loader2,
  Lock,
  Megaphone,
  MessageSquare,
  NotebookPen,
  Package,
  PackageCheck,
  PackageOpen,
  Paperclip,
  Pencil,
  Plus,
  ReceiptText,
  Send,
  ShieldCheck,
  ShieldHalf,
  Timer,
  TriangleAlert,
  Undo2,
  UserCheck,
  UserCog,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import {
  ApprovalQueueDocument,
  OperationsDocument,
  OperateDocument,
  HrRecordsDocument,
  HrCommandDocument,
} from "../../../packages/contracts/src/generated";
import {
  hrKinds,
  hrLabels,
  hrModules,
  type HrKind,
} from "../../../packages/contracts/hr";
import {
  money as plainMoney,
  rupeesToPaise,
} from "../../../packages/contracts/payroll";
import { uploadEvidence } from "./api";
import { useScope, useScopedQuery, useWrite } from "./workspace-context";
import {
  Badge,
  Empty,
  ErrorState,
  Heading,
  Notice,
  PageSkeleton,
  Skeleton,
  humanize,
  statusTone,
  useT,
} from "./ui";
import { DataTable } from "./components/shared/data-table";
import { Field, Section, StatCard, StatGrid } from "./components/shared/page";
import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatRelative,
} from "./components/shared/formatting";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
import { NativeSelect } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Copy = [string, string];
type T = (en: string, hi: string) => string;
type Tone = "default" | "primary" | "success" | "warning" | "danger" | "info";

export const fields: Record<HrKind, [string, string, string][]> = {
  expense: [
    ["amountPaise", "Amount (₹)", "money"],
    ["date", "Expense date", "date"],
    ["category", "Category", "text"],
    ["description", "Business purpose", "textarea"],
  ],
  asset: [
    ["assetTag", "Unique asset tag", "text"],
    ["name", "Asset name", "text"],
    ["serialNumber", "Serial number", "text"],
    ["condition", "Condition", "textarea"],
  ],
  helpdesk: [
    ["subject", "Subject", "text"],
    ["category", "Category", "text"],
    ["description", "How can HR help?", "textarea"],
  ],
  grievance: [
    ["subject", "Subject", "text"],
    ["description", "Confidential account", "textarea"],
  ],
  document: [
    ["title", "Document title", "text"],
    ["category", "Access classification", "category"],
    ["expiresOn", "Expiry (optional)", "date"],
    ["description", "Description", "textarea"],
  ],
  policy: [
    ["title", "Policy title", "text"],
    ["effectiveOn", "Effective date", "date"],
    ["body", "Policy text", "textarea"],
    ["acknowledgment", "Require acknowledgment", "checkbox"],
  ],
  announcement: [
    ["title", "Title", "text"],
    ["expiresOn", "Expires on", "date"],
    ["body", "Message", "textarea"],
    ["acknowledgment", "Require acknowledgment", "checkbox"],
  ],
  lifecycle: [
    ["event", "Event", "event"],
    ["effectiveOn", "Effective date", "date"],
    ["employmentId", "Employment record", "employment"],
    ["destinationSiteId", "Destination site (transfer only)", "site"],
    ["designation", "New designation (promotion)", "text"],
    ["department", "New department (promotion)", "text"],
    ["salaryStructureId", "Salary structure (salary revision)", "structure"],
    ["details", "Reason and supporting details", "textarea"],
  ],
};
function allowedKind(caps: string[], kind: HrKind) {
  return (
    caps.includes(hrModules[kind] + ".view") ||
    (["document", "policy"].includes(kind) &&
      caps.includes("my_documents.view")) ||
    (kind === "lifecycle" && caps.includes("my_hr.view"))
  );
}

const kindMeta: Record<
  HrKind,
  {
    icon: LucideIcon;
    noun: Copy;
    action: Copy;
    person: Copy;
    none: Copy;
    empty: Copy;
    about: (site: string) => Copy;
  }
> = {
  expense: {
    icon: ReceiptText,
    noun: ["Claim", "दावा"],
    action: ["New claim", "नया दावा"],
    person: ["Employee", "कर्मचारी"],
    none: ["No expense claims yet", "अभी कोई व्यय दावा नहीं"],
    empty: [
      "Claims and their receipts appear here. An independent reviewer approves each claim before it is settled.",
      "दावे और उनकी रसीदें यहाँ दिखेंगी। हर दावा स्वतंत्र समीक्षक की स्वीकृति के बाद निपटाया जाता है।",
    ],
    about: (s) => [
      `Claims, receipts and reimbursements at ${s}.`,
      `${s} के व्यय दावे, रसीदें और प्रतिपूर्ति।`,
    ],
  },
  asset: {
    icon: Package,
    noun: ["Asset", "संपत्ति"],
    action: ["Register asset", "संपत्ति दर्ज करें"],
    person: ["Holder", "धारक"],
    none: ["No assets registered yet", "अभी कोई संपत्ति दर्ज नहीं"],
    empty: [
      "Registered equipment appears here. Assign it to an employee, who acknowledges receipt and later returns it.",
      "दर्ज उपकरण यहाँ दिखेंगे। कर्मचारी को सौंपें; वह प्राप्ति स्वीकार करेगा और बाद में लौटाएगा।",
    ],
    about: (s) => [
      `Company equipment issued to employees at ${s}, from assignment to return.`,
      `${s} पर कर्मचारियों को दिए गए उपकरण, सौंपने से वापसी तक।`,
    ],
  },
  helpdesk: {
    icon: Headset,
    noun: ["Request", "अनुरोध"],
    action: ["New request", "नया अनुरोध"],
    person: ["Raised by", "किसने पूछा"],
    none: ["No helpdesk requests yet", "अभी कोई सहायता अनुरोध नहीं"],
    empty: [
      "Questions for HR appear here. HR starts and resolves each request; the employee closes it.",
      "एचआर के लिए प्रश्न यहाँ दिखेंगे। एचआर अनुरोध शुरू कर हल करता है; कर्मचारी उसे बंद करता है।",
    ],
    about: (s) => [
      `Questions and requests raised with HR at ${s}.`,
      `${s} पर एचआर से पूछे गए प्रश्न और अनुरोध।`,
    ],
  },
  grievance: {
    icon: ShieldHalf,
    noun: ["Case", "मामला"],
    action: ["Raise a case", "मामला दर्ज करें"],
    person: ["Raised by", "किसने दर्ज किया"],
    none: ["No confidential cases yet", "अभी कोई गोपनीय मामला नहीं"],
    empty: [
      "Cases you raise, or are assigned to handle, appear here.",
      "आपके दर्ज किए या आपको सौंपे गए मामले यहाँ दिखेंगे।",
    ],
    about: (s) => [
      `Raise and follow confidential workplace cases at ${s}.`,
      `${s} पर गोपनीय कार्यस्थल मामले दर्ज करें और देखें।`,
    ],
  },
  document: {
    icon: FileText,
    noun: ["Document", "दस्तावेज़"],
    action: ["Add document", "दस्तावेज़ जोड़ें"],
    person: ["Employee", "कर्मचारी"],
    none: ["No documents yet", "अभी कोई दस्तावेज़ नहीं"],
    empty: [
      "Employee documents appear here once added. Each one is reviewed before it is approved.",
      "जोड़े गए दस्तावेज़ यहाँ दिखेंगे। हर दस्तावेज़ स्वीकृति से पहले जाँचा जाता है।",
    ],
    about: (s) => [
      `Employee documents, their verification and expiry dates at ${s}.`,
      `${s} पर कर्मचारियों के दस्तावेज़, सत्यापन और समाप्ति तिथियाँ।`,
    ],
  },
  policy: {
    icon: BookOpenCheck,
    noun: ["Policy", "नीति"],
    action: ["New policy", "नई नीति"],
    person: ["Author", "लेखक"],
    none: ["No policies yet", "अभी कोई नीति नहीं"],
    empty: [
      "Policies appear here. An independent reviewer publishes each one to its audience.",
      "नीतियाँ यहाँ दिखेंगी। स्वतंत्र समीक्षक हर नीति को उसके दर्शकों के लिए प्रकाशित करता है।",
    ],
    about: (s) => [
      `Company policies published to employees at ${s}, with acknowledgments.`,
      `${s} पर कर्मचारियों के लिए प्रकाशित नीतियाँ और उनकी स्वीकृतियाँ।`,
    ],
  },
  announcement: {
    icon: Megaphone,
    noun: ["Announcement", "घोषणा"],
    action: ["New announcement", "नई घोषणा"],
    person: ["Author", "लेखक"],
    none: ["No announcements yet", "अभी कोई घोषणा नहीं"],
    empty: [
      "Announcements appear here. An independent reviewer publishes each one to its audience.",
      "घोषणाएँ यहाँ दिखेंगी। स्वतंत्र समीक्षक हर घोषणा को उसके दर्शकों के लिए प्रकाशित करता है।",
    ],
    about: (s) => [
      `Messages published to chosen employees at ${s}, with optional acknowledgment.`,
      `${s} पर चुने गए कर्मचारियों के लिए संदेश, वैकल्पिक स्वीकृति सहित।`,
    ],
  },
  lifecycle: {
    icon: ContactRound,
    noun: ["Change", "बदलाव"],
    action: ["Record change", "बदलाव दर्ज करें"],
    person: ["Employee", "कर्मचारी"],
    none: ["No lifecycle changes yet", "अभी कोई रोजगार बदलाव नहीं"],
    empty: [
      "Employment changes appear here once recorded.",
      "दर्ज रोजगार बदलाव यहाँ दिखेंगे।",
    ],
    about: (s) => [
      `Joining, probation, confirmation, promotion, transfer, salary revision and exit at ${s}. Each change needs an independent approval.`,
      `${s} पर कार्यग्रहण, परिवीक्षा, पुष्टि, पदोन्नति, स्थानांतरण, वेतन संशोधन और निकास। हर बदलाव के लिए स्वतंत्र स्वीकृति आवश्यक है।`,
    ],
  },
};

const statusText: Record<string, Copy> = {
  draft: ["Draft", "ड्राफ़्ट"],
  submitted: ["Submitted", "जमा"],
  available: ["Available", "उपलब्ध"],
  assigned: ["Assigned", "सौंपी गई"],
  acknowledged: ["Acknowledged", "प्राप्ति स्वीकार"],
  in_progress: ["In progress", "प्रगति में"],
  return_requested: ["Return requested", "वापसी का अनुरोध"],
  returned: ["Returned", "लौटाई गई"],
  pending: ["Pending", "लंबित"],
  validated: ["Validated", "सत्यापित"],
  reviewed: ["Reviewed", "समीक्षित"],
  resolved: ["Resolved", "हल हुआ"],
  approved: ["Approved", "स्वीकृत"],
  published: ["Published", "प्रकाशित"],
  settled: ["Settled", "भुगतान दर्ज"],
  cleared: ["Cleared", "निपटान हुआ"],
  closed: ["Closed", "बंद"],
  rejected: ["Rejected", "अस्वीकृत"],
};
const statusIcon: Record<string, LucideIcon> = {
  draft: FilePen,
  submitted: Send,
  available: PackageCheck,
  assigned: UserCheck,
  acknowledged: CheckCheck,
  in_progress: Timer,
  return_requested: Undo2,
  returned: PackageOpen,
  pending: Hourglass,
  validated: BadgeCheck,
  reviewed: Eye,
  resolved: CircleCheck,
  approved: CircleCheck,
  published: Megaphone,
  settled: Wallet,
  cleared: Archive,
  closed: Archive,
  rejected: CircleX,
};
// Workflow meaning where the shared status palette has none.
const toneOverride: Record<string, string> = {
  available: "success",
  assigned: "info",
  acknowledged: "success",
  return_requested: "warning",
};
const statusOrder = Object.keys(statusText);
const rank = (v: string) =>
  statusOrder.includes(v) ? statusOrder.indexOf(v) : statusOrder.length;
const statusLabel = (t: T, v: string) =>
  statusText[v] ? t(...statusText[v]) : humanize(v);
function StatusBadge({ status }: { status: string }) {
  const t = useT(),
    Icon = statusIcon[status] ?? Circle;
  return (
    <Badge tone={toneOverride[status] ?? statusTone(status)}>
      <Icon />
      {statusLabel(t, status)}
    </Badge>
  );
}

const moveText: Record<string, Copy> = {
  submit: ["Submit", "जमा करें"],
  approve: ["Approve", "स्वीकृत करें"],
  reject: ["Reject", "अस्वीकार करें"],
  settle: ["Settle", "भुगतान दर्ज करें"],
  assign: ["Assign", "सौंपें"],
  acknowledge: ["Acknowledge", "स्वीकार करें"],
  return: ["Return", "लौटाएँ"],
  receive: ["Receive", "प्राप्त करें"],
  clear: ["Clear", "निपटान करें"],
  start: ["Start", "शुरू करें"],
  resolve: ["Resolve", "हल करें"],
  close: ["Close", "बंद करें"],
  publish: ["Publish", "प्रकाशित करें"],
  comment: ["Comment", "टिप्पणी"],
};
const moveIcon: Record<string, LucideIcon> = {
  submit: Send,
  approve: CircleCheck,
  reject: CircleX,
  settle: Wallet,
  assign: UserCheck,
  acknowledge: CheckCheck,
  return: Undo2,
  receive: PackageOpen,
  clear: Archive,
  start: Timer,
  resolve: CircleCheck,
  close: Archive,
  publish: Megaphone,
  comment: MessageSquare,
};
const moveLabel = (t: T, a: string) =>
  moveText[a] ? t(...moveText[a]) : humanize(a);
/** Workflow actions this viewer may take on a record; the server re-checks. */
function moves(r: any): string[] {
  const transitions: Record<string, string[]> = {
    draft: ["submit"],
    submitted:
      r.kind === "policy" || r.kind === "announcement"
        ? ["publish"]
        : r.kind === "helpdesk" || r.kind === "grievance"
          ? ["start"]
          : ["approve", "reject"],
    approved: r.kind === "expense" ? ["settle"] : [],
    available: ["assign"],
    assigned: ["acknowledge", "return"],
    acknowledged: ["return"],
    return_requested: ["receive"],
    returned: ["assign", "clear"],
    in_progress: ["resolve"],
    resolved: ["close"],
    published: r.acknowledged ? [] : ["acknowledge"],
  };
  return (transitions[r.status] ?? []).filter((a) =>
    ["acknowledge", "return", "close"].includes(a)
      ? (r.isSelf || ["policy", "announcement"].includes(r.kind)) &&
        r.actions.includes("submit")
      : ["approve", "reject", "publish", "settle"].includes(a)
        ? !r.isSelf && r.actions.includes(a === "reject" ? "review" : "approve")
        : ["assign", "receive", "clear"].includes(a)
          ? r.actions.includes("manage")
          : a === "start" || a === "resolve"
            ? r.actions.includes("review")
            : r.actions.includes("submit"),
  );
}
const commentable = (r: any) =>
  ["submitted", "in_progress", "resolved", "assigned", "acknowledged"].includes(
    r.status,
  );

const recordTitle = (r: any): string =>
  String(
    r.payload.title ??
      r.payload.subject ??
      r.payload.name ??
      (r.payload.event ? humanize(String(r.payload.event)) : undefined) ??
      r.payload.category ??
      hrLabels[r.kind as HrKind]?.[0] ??
      "Record",
  );
/** Non-sensitive second line under the record title in lists. */
function subline(r: any, t: T): string {
  const p = r.payload;
  switch (r.kind as HrKind) {
    case "asset":
      return [
        p.assetTag && `${t("Tag", "टैग")} ${p.assetTag}`,
        p.serialNumber && `SN ${p.serialNumber}`,
      ]
        .filter(Boolean)
        .join(" · ");
    case "helpdesk":
      return p.category ?? "";
    case "grievance":
      return t("Confidential", "गोपनीय");
    case "document":
      return p.category ? humanize(p.category) : "";
    case "policy":
    case "announcement":
      return p.acknowledgment
        ? t("Acknowledgment required", "स्वीकृति आवश्यक")
        : "";
    case "lifecycle":
      return [p.designation, p.department].filter(Boolean).join(" · ");
    default:
      return "";
  }
}
/** A payload field ready for display, or null when not set. */
function shown(r: any, key: string, type: string, data: any, t: T) {
  const v = r.payload[key];
  if (v === null || v === undefined || v === "") return null;
  if (type === "date") return formatDate(v);
  if (type === "money") return `₹${formatMoney(String(v))}`;
  if (type === "checkbox")
    return v ? t("Required", "आवश्यक") : t("Not required", "आवश्यक नहीं");
  if (type === "category" || type === "event") return humanize(String(v));
  if (type === "site")
    return data.sites?.find((x: any) => x.id === v)?.name ?? String(v);
  if (type === "employment") {
    const x = data.employments?.find((e: any) => e.id === v);
    return x ? `${x.name} · ${x.employer}` : String(v);
  }
  if (type === "structure") {
    const x = data.salaryStructures?.find((e: any) => e.id === v);
    return x
      ? `${formatDate(x.starts_on)} — ${formatDate(x.ends_on)}`
      : String(v);
  }
  return String(v);
}

const DAY = 86_400_000;
/** Values of the table's filter columns; KPI presets filter on the same values. */
const facet: Record<string, (r: any, now: number) => string> = {
  status: (r) => r.status,
  expiry: (r, now) => {
    const v = r.payload.expiresOn;
    if (!v) return "none";
    const end = Date.parse(`${v}T23:59:59`); // local end of the calendar day
    return end < now ? "expired" : end - now <= 30 * DAY ? "soon" : "later";
  },
  // "pending" only when acknowledgment is required and this viewer may give it.
  ack: (r) =>
    r.acknowledged
      ? "done"
      : r.status === "published" &&
          r.payload.acknowledgment &&
          r.actions.includes("submit")
        ? "pending"
        : "none",
};
const dateField: Partial<Record<HrKind, [string, Copy]>> = {
  expense: ["date", ["Expense date", "व्यय तिथि"]],
  document: ["expiresOn", ["Expires", "समाप्ति"]],
  policy: ["effectiveOn", ["Effective", "प्रभावी"]],
  announcement: ["expiresOn", ["Expires", "समाप्ति"]],
  lifecycle: ["effectiveOn", ["Effective", "प्रभावी"]],
};
const groupField: Partial<Record<HrKind, [string, Copy]>> = {
  expense: ["category", ["Category", "श्रेणी"]],
  helpdesk: ["category", ["Category", "श्रेणी"]],
  document: ["category", ["Classification", "वर्गीकरण"]],
  lifecycle: ["event", ["Event", "घटना"]],
};
const group = (r: any, key: string) =>
  r.payload[key] ? humanize(String(r.payload[key])) : "";

type Kpi = {
  label: Copy;
  hint: Copy;
  icon: LucideIcon;
  tone: Tone;
  filter: [string, string[]];
};
const kpi = (
  label: Copy,
  hint: Copy,
  icon: LucideIcon,
  tone: Tone,
  filter: [string, string[]],
): Kpi => ({ label, hint, icon, tone, filter });
const drafts = kpi(
  ["Drafts", "ड्राफ़्ट"],
  ["Not yet submitted", "अभी जमा नहीं"],
  FilePen,
  "default",
  ["status", ["draft"]],
);
const rejected = kpi(
  ["Rejected", "अस्वीकृत"],
  ["Not approved", "स्वीकृत नहीं"],
  CircleX,
  "danger",
  ["status", ["rejected"]],
);
const casework = (waiting: Copy) => [
  kpi(["New", "नए"], waiting, Inbox, "warning", ["status", ["submitted"]]),
  kpi(
    ["In progress", "प्रगति में"],
    ["Being handled", "काम जारी"],
    Timer,
    "info",
    ["status", ["in_progress"]],
  ),
  kpi(
    ["Resolved", "हल हुए"],
    ["Waiting for the employee to close", "कर्मचारी द्वारा बंद करना बाकी"],
    CircleCheck,
    "success",
    ["status", ["resolved"]],
  ),
  kpi(
    ["Closed", "बंद"],
    ["Closed by the employee", "कर्मचारी ने बंद किया"],
    Archive,
    "default",
    ["status", ["closed"]],
  ),
];
const broadcast = (icon: LucideIcon) => [
  kpi(
    ["Published", "प्रकाशित"],
    ["Visible to their audience", "दर्शकों को दिख रही"],
    icon,
    "success",
    ["status", ["published"]],
  ),
  kpi(
    ["Awaiting publication", "प्रकाशन बाकी"],
    ["Submitted for approval", "स्वीकृति हेतु जमा"],
    Hourglass,
    "warning",
    ["status", ["submitted"]],
  ),
  drafts,
  kpi(
    ["To acknowledge", "स्वीकृति बाकी"],
    ["Waiting for your acknowledgment", "आपकी स्वीकृति बाकी"],
    BellRing,
    "primary",
    ["ack", ["pending"]],
  ),
];
const kpis: Record<HrKind, Kpi[]> = {
  expense: [
    kpi(
      ["Awaiting review", "समीक्षा बाकी"],
      ["Submitted", "जमा"],
      Hourglass,
      "warning",
      ["status", ["submitted"]],
    ),
    kpi(
      ["Approved", "स्वीकृत"],
      ["Ready to settle", "भुगतान हेतु तैयार"],
      CircleCheck,
      "info",
      ["status", ["approved"]],
    ),
    kpi(
      ["Settled", "भुगतान दर्ज"],
      ["Reimbursed", "प्रतिपूर्ति हुई"],
      Wallet,
      "success",
      ["status", ["settled"]],
    ),
    rejected,
  ],
  asset: [
    kpi(
      ["In store", "भंडार में"],
      ["Available or returned", "उपलब्ध या लौटाई गई"],
      PackageCheck,
      "success",
      ["status", ["available", "returned"]],
    ),
    kpi(
      ["With employees", "कर्मचारियों के पास"],
      ["Assigned or acknowledged", "सौंपी या स्वीकार की गई"],
      UserCheck,
      "info",
      ["status", ["assigned", "acknowledged"]],
    ),
    kpi(
      ["Return requested", "वापसी का अनुरोध"],
      ["Waiting to be received", "प्राप्ति बाकी"],
      Undo2,
      "warning",
      ["status", ["return_requested"]],
    ),
    kpi(
      ["Cleared", "निपटान हुआ"],
      ["Returned and cleared", "लौटाई और निपटाई गई"],
      Archive,
      "default",
      ["status", ["cleared"]],
    ),
  ],
  helpdesk: casework(["Waiting for HR", "एचआर की प्रतीक्षा"]),
  grievance: casework([
    "Waiting for a case handler",
    "गोपनीय अधिकारी की प्रतीक्षा",
  ]),
  document: [
    kpi(
      ["Awaiting review", "समीक्षा बाकी"],
      ["Submitted for verification", "सत्यापन हेतु जमा"],
      Hourglass,
      "warning",
      ["status", ["submitted"]],
    ),
    kpi(
      ["Approved", "स्वीकृत"],
      ["Verified documents", "सत्यापित दस्तावेज़"],
      BadgeCheck,
      "success",
      ["status", ["approved"]],
    ),
    kpi(
      ["Expiring soon", "जल्द समाप्त"],
      ["Expired or due within 30 days", "समाप्त या 30 दिनों में"],
      CalendarClock,
      "danger",
      ["expiry", ["expired", "soon"]],
    ),
    rejected,
  ],
  policy: broadcast(BookOpenCheck),
  announcement: broadcast(Megaphone),
  lifecycle: [
    kpi(
      ["Awaiting approval", "स्वीकृति बाकी"],
      ["Needs an independent approval", "स्वतंत्र स्वीकृति आवश्यक"],
      Hourglass,
      "warning",
      ["status", ["submitted"]],
    ),
    kpi(
      ["Approved", "स्वीकृत"],
      ["Approved changes", "स्वीकृत बदलाव"],
      CircleCheck,
      "success",
      ["status", ["approved"]],
    ),
    drafts,
    rejected,
  ],
};
const sameFilters = (a: ColumnFiltersState, b: ColumnFiltersState) =>
  JSON.stringify(a) === JSON.stringify(b);
const sumPaise = (rows: any[]) =>
  rows
    .reduce((total, r) => total + BigInt(r.payload.amountPaise ?? 0), 0n)
    .toString();
const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export function HrPanel({ initialKind }: { initialKind?: HrKind } = {}) {
  const s = useScope(),
    t = useT(),
    kinds = hrKinds.filter((k) => allowedKind(s.capabilities, k)),
    [kind, setKind] = useState<HrKind>(initialKind ?? kinds[0] ?? "expense");
  const denied = (
    <Empty
      denied
      title={t("No permitted HR modules", "कोई अनुमत एचआर मॉड्यूल नहीं")}
    />
  );
  if (initialKind)
    return kinds.includes(initialKind) ? (
      <HrList kind={initialKind} page />
    ) : (
      <section className="grid gap-5">
        <Heading title={t(...hrLabels[initialKind])} />
        {denied}
      </section>
    );
  return (
    <section className="grid min-w-0 gap-5">
      <Heading
        title={t("HR services", "अनुरोध, रिकॉर्ड और समाधान।")}
        description={t(
          `Requests, records and decisions across HR modules at ${s.siteName}.`,
          `${s.siteName} पर सभी एचआर मॉड्यूल के अनुरोध, रिकॉर्ड और निर्णय।`,
        )}
      />
      <div className="grid items-start gap-4 empty:hidden lg:grid-cols-2">
        <ApprovalQueue open={setKind} />
        <HrInbox open={setKind} />
      </div>
      {kinds.length ? (
        <>
          <Tabs
            value={kind}
            onValueChange={(v) => setKind(v as HrKind)}
            className="max-w-full overflow-x-auto"
          >
            <TabsList aria-label="HR modules">
              {kinds.map((k) => {
                const Icon = kindMeta[k].icon;
                return (
                  <TabsTrigger key={k} value={k}>
                    <Icon />
                    {t(...hrLabels[k])}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
          {kinds.includes(kind) ? <HrList key={kind} kind={kind} /> : denied}
        </>
      ) : (
        denied
      )}
    </section>
  );
}
/** With employeeId: only that employee's records, and new records start for
 * them (compact, for an employee profile). `page` adds the module header. */
export function HrList({
  kind,
  employeeId,
  page = false,
}: {
  kind: HrKind;
  employeeId?: string;
  page?: boolean;
}) {
  const t = useT(),
    s = useScope(),
    q = useScopedQuery<any>(["hr", kind], HrRecordsDocument, { kind }),
    [editor, setEditor] = useState<any>(null),
    [selected, setSelected] = useState<{ id: string; action?: string } | null>(
      null,
    ),
    [filters, setFilters] = useState<ColumnFiltersState>([]),
    [handler, setHandler] = useState(false),
    [reminders, setReminders] = useState(false);
  const meta = kindMeta[kind],
    title = t(...hrLabels[kind]);
  if (q.isPending) return page ? <PageSkeleton title={title} /> : <Skeleton />;
  if (q.error) {
    const retry = <ErrorState error={q.error} retry={() => void q.refetch()} />;
    return page ? (
      <section className="grid gap-5">
        <Heading title={title} />
        {retry}
      </section>
    ) : (
      retry
    );
  }
  const d = q.data.hrRecords,
    now = Date.now(),
    embedded = !!employeeId,
    records: any[] = d.records.filter(
      (r: any) => !employeeId || r.employee_id === employeeId,
    ),
    person = (r: any): string =>
      r.isSelf
        ? t("You", "आप")
        : (d.employees.find((e: any) => e.id === r.employee_id)?.name ??
          t("Authorized employee", "अधिकृत कर्मचारी")),
    dateKey = dateField[kind],
    groupKey = groupField[kind],
    expires = dateKey?.[0] === "expiresOn",
    acks = kind === "policy" || kind === "announcement",
    can = (cap: string) => s.capabilities.includes(cap),
    open = (r: any, action?: string) => setSelected({ id: r.id, action });
  const current = selected
    ? d.records.find((r: any) => r.id === selected.id)
    : null;

  const columns: ColumnDef<any>[] = [
    {
      header: t(...meta.noun),
      id: "record",
      accessorFn: recordTitle,
      cell: ({ row: { original: r } }) => {
        const sub = subline(r, t);
        return (
          <div className="flex max-w-[420px] min-w-[180px] flex-col">
            <span className="truncate font-medium">{recordTitle(r)}</span>
            {sub && (
              <span className="text-muted-foreground flex items-center gap-1 truncate text-xs">
                {kind === "grievance" && <Lock className="size-3 shrink-0" />}
                {sub}
              </span>
            )}
          </div>
        );
      },
    },
  ];
  if (!embedded)
    columns.push({
      header: t(...meta.person),
      id: "employee",
      accessorFn: person,
      cell: ({ getValue }) => (
        <span className="flex items-center gap-2 whitespace-nowrap">
          <Avatar className="size-7">
            <AvatarFallback className="bg-primary/10 text-primary text-[11px]">
              {initials(String(getValue()))}
            </AvatarFallback>
          </Avatar>
          {String(getValue())}
        </span>
      ),
    });
  if (kind === "expense")
    columns.push({
      header: t("Amount", "राशि"),
      id: "amount",
      accessorFn: (r) => Number(r.payload.amountPaise ?? 0),
      enableGlobalFilter: false,
      cell: ({ row: { original: r } }) => (
        <span className="font-medium whitespace-nowrap tabular-nums">
          {r.payload.amountPaise
            ? `₹${formatMoney(r.payload.amountPaise)}`
            : "—"}
        </span>
      ),
    });
  if (dateKey)
    columns.push({
      header: t(...dateKey[1]),
      id: "date",
      accessorFn: (r) => r.payload[dateKey[0]] ?? "",
      enableGlobalFilter: false,
      cell: ({ row: { original: r } }) => {
        const v = r.payload[dateKey[0]];
        if (!v) return <span className="text-muted-foreground">—</span>;
        const bucket = expires ? facet.expiry(r, now) : "";
        return (
          <span className="flex flex-col whitespace-nowrap">
            <span
              className={cn(
                bucket === "expired" && "text-destructive font-medium",
              )}
            >
              {formatDate(v)}
            </span>
            {expires && (
              <span
                className={cn(
                  "text-xs",
                  bucket === "expired"
                    ? "text-destructive"
                    : bucket === "soon"
                      ? "text-warning"
                      : "text-muted-foreground",
                )}
              >
                {bucket === "expired"
                  ? t("Expired", "समाप्त")
                  : formatRelative(String(v), now)}
              </span>
            )}
          </span>
        );
      },
    });
  columns.push(
    {
      header: t("Status", "स्थिति"),
      id: "status",
      accessorFn: (r) => r.status,
      cell: ({ row: { original: r } }) => <StatusBadge status={r.status} />,
    },
    {
      header: t("Updated", "अपडेट"),
      id: "updated",
      accessorFn: (r) => r.updated_at,
      enableGlobalFilter: false,
      cell: ({ row: { original: r } }) => (
        <span className="flex flex-col whitespace-nowrap">
          <span>{formatDate(r.updated_at)}</span>
          <span className="text-muted-foreground text-xs">
            {formatRelative(r.updated_at, now)}
          </span>
        </span>
      ),
    },
  );
  if (groupKey)
    columns.push({
      header: t(...groupKey[1]),
      id: "group",
      accessorFn: (r) => group(r, groupKey[0]),
    });
  if (expires)
    columns.push({
      header: t("Expiry", "समाप्ति"),
      id: "expiry",
      accessorFn: (r) => facet.expiry(r, now),
      enableGlobalFilter: false,
    });
  if (acks)
    columns.push({
      header: t("Acknowledgment", "स्वीकृति"),
      id: "ack",
      accessorFn: (r) => facet.ack(r, now),
      enableGlobalFilter: false,
    });
  columns.push({
    header: "",
    id: "actions",
    enableHiding: false,
    enableSorting: false,
    cell: ({ row: { original: r } }) => {
      const next = moves(r);
      return (
        <div className="flex items-center justify-end gap-0.5">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`${t("Actions for", "कार्रवाई")} ${recordTitle(r)}`}
                className="data-[state=open]:bg-muted"
              >
                <Ellipsis className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onSelect={() => open(r)}>
                <Eye />
                {t("Open details", "विवरण खोलें")}
              </DropdownMenuItem>
              {r.status === "draft" && r.actions.includes("edit") && (
                <DropdownMenuItem onSelect={() => setEditor(r)}>
                  <Pencil />
                  {t("Edit / attach", "संपादित / संलग्न करें")}
                </DropdownMenuItem>
              )}
              {(next.length > 0 || commentable(r)) && <DropdownMenuSeparator />}
              {next.map((a) => {
                const Icon = moveIcon[a] ?? Circle;
                return (
                  <DropdownMenuItem
                    key={a}
                    variant={a === "reject" ? "destructive" : "default"}
                    onSelect={() => open(r, a)}
                  >
                    <Icon />
                    {moveLabel(t, a)}…
                  </DropdownMenuItem>
                );
              })}
              {commentable(r) && (
                <DropdownMenuItem onSelect={() => open(r, "comment")}>
                  <MessageSquare />
                  {t("Comment", "टिप्पणी")}…
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("Open record", "रिकॉर्ड खोलें")}
            onClick={() => open(r)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      );
    },
  });

  const statuses = [...new Set(records.map((r) => String(r.status)))].sort(
      (a, b) => rank(a) - rank(b),
    ),
    groups = groupKey
      ? [...new Set(records.map((r) => group(r, groupKey[0])))].filter(Boolean)
      : [],
    people = [...new Set(records.map(person))];
  const tableFilters = [
    {
      column: "status",
      title: t("Status", "स्थिति"),
      options: statuses.map((v) => ({
        value: v,
        label: statusLabel(t, v),
        icon: statusIcon[v],
      })),
    },
    ...(groupKey && groups.length > 1
      ? [
          {
            column: "group",
            title: t(...groupKey[1]),
            options: groups.map((v) => ({ value: v, label: v })),
          },
        ]
      : []),
    ...(expires
      ? [
          {
            column: "expiry",
            title: t("Expiry", "समाप्ति"),
            options: [
              { value: "expired", label: t("Expired", "समाप्त") },
              { value: "soon", label: t("Within 30 days", "30 दिनों में") },
              { value: "later", label: t("Later", "बाद में") },
              { value: "none", label: t("No expiry", "कोई समाप्ति नहीं") },
            ],
          },
        ]
      : []),
    ...(acks
      ? [
          {
            column: "ack",
            title: t("Acknowledgment", "स्वीकृति"),
            options: [
              { value: "pending", label: t("Awaiting you", "आपकी प्रतीक्षा") },
              { value: "done", label: t("Acknowledged", "स्वीकार किया") },
              {
                value: "none",
                label: t("No action for you", "आपके लिए कुछ नहीं"),
              },
            ],
          },
        ]
      : []),
    ...(!embedded && people.length > 1
      ? [
          {
            column: "employee",
            title: t(...meta.person),
            options: people.map((v) => ({ value: v, label: v })),
          },
        ]
      : []),
  ];
  const cards = kpis[kind].map((c) => {
    const [column, values] = c.filter;
    return {
      ...c,
      hits: records.filter((r) => values.includes(facet[column](r, now))),
      preset: [{ id: column, value: values }] as ColumnFiltersState,
    };
  });
  const buttons = [
    kind === "grievance" &&
      can("grievances.manage") &&
      can("grievances.field.confidential") && (
        <Button
          key="handlers"
          variant="outline"
          onClick={() => setHandler(true)}
        >
          <UserCog className="size-4" />
          {t("Case handlers", "गोपनीय अधिकारी")}
        </Button>
      ),
    kind === "document" && can("documents.manage") && (
      <Button
        key="reminders"
        variant="outline"
        onClick={() => setReminders(true)}
      >
        <BellRing className="size-4" />
        {t("Expiry reminders", "समाप्ति अनुस्मारक")}
      </Button>
    ),
    d.canCreate && (
      <Button
        key="new"
        // Keeps the generic "New record" name that workflows and tests use.
        aria-label={`${t(...meta.action)} (${t("New record", "नया रिकॉर्ड")})`}
        onClick={() =>
          setEditor({ kind, payload: {}, version: 0, employee_id: employeeId })
        }
      >
        <Plus className="size-4" />
        {t(...meta.action)}
      </Button>
    ),
  ].filter(Boolean);
  const actions = buttons.length ? (
    <div className="flex flex-wrap items-center gap-2">{buttons}</div>
  ) : undefined;

  return (
    <section className="grid min-w-0 gap-5">
      {page && (
        <Heading title={title} description={t(...meta.about(s.siteName))}>
          {buttons}
        </Heading>
      )}
      {kind === "grievance" && (
        <Alert variant={d.handlersConfigured ? "info" : "warning"}>
          <ShieldCheck />
          <AlertDescription>
            <p>
              {t(
                "Only you and explicitly assigned confidential handlers can access your case. Reporting managers receive no automatic access.",
                "केवल आप और नियुक्त गोपनीय अधिकारी इस मामले को देख सकते हैं।",
              )}
              {!d.handlersConfigured && (
                <strong className="font-semibold">
                  {" Setup required: configure a confidential case handler."}
                </strong>
              )}
            </p>
          </AlertDescription>
        </Alert>
      )}
      {!records.length ? (
        <Empty
          icon={meta.icon}
          title={t(...meta.none)}
          action={page ? undefined : actions}
        >
          {t(...meta.empty)}
        </Empty>
      ) : (
        <>
          {!embedded && (
            <StatGrid>
              {cards.map((c) => (
                <StatCard
                  key={c.label[0]}
                  label={t(...c.label)}
                  value={c.hits.length}
                  hint={
                    kind === "expense"
                      ? `₹${formatMoney(sumPaise(c.hits))} · ${t(...c.hint)}`
                      : t(...c.hint)
                  }
                  icon={c.icon}
                  tone={c.hits.length ? c.tone : "default"}
                  active={sameFilters(filters, c.preset)}
                  onClick={() =>
                    setFilters((cur) =>
                      sameFilters(cur, c.preset) ? [] : c.preset,
                    )
                  }
                />
              ))}
            </StatGrid>
          )}
          <DataTable
            data={records}
            columns={columns}
            getRowId={(r: any) => r.id}
            label={title}
            hidden={[
              "group",
              "expiry",
              "ack",
              ...(embedded ? ["updated"] : []),
            ]}
            columnFilters={filters}
            onColumnFiltersChange={setFilters}
            onRowClick={(r: any) => open(r)}
            filters={tableFilters}
            actions={page ? undefined : actions}
          />
          {d.records.length >= d.limit && (
            <p className="text-muted-foreground text-xs">
              {t(
                "Showing the latest 100 records.",
                "नवीनतम 100 रिकॉर्ड दिख रहे हैं।",
              )}
            </p>
          )}
        </>
      )}
      {current && (
        <HrDetail
          key={current.id}
          r={current}
          data={d}
          initialAction={selected?.action}
          edit={() => {
            setEditor(current);
            setSelected(null);
          }}
          close={() => setSelected(null)}
        />
      )}
      {editor && (
        <HrEditor initial={editor} data={d} close={() => setEditor(null)} />
      )}
      {handler && (
        <HandlerEditor
          employees={d.employees}
          version={d.handlerVersion}
          close={() => setHandler(false)}
        />
      )}
      {reminders && (
        <ReminderEditor
          settings={d.settings}
          close={() => setReminders(false)}
        />
      )}
    </section>
  );
}
function HrDetail({
  r,
  data,
  initialAction = "",
  edit,
  close,
}: {
  r: any;
  data: any;
  initialAction?: string;
  edit: () => void;
  close: () => void;
}) {
  const s = useScope(),
    t = useT(),
    write = useWrite(),
    uid = useId(),
    [action, setAction] = useState(initialAction),
    [note, setNote] = useState(""),
    [employeeId, setEmployee] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [clientId, setClientId] = useState(() => crypto.randomUUID());
  const kind = r.kind as HrKind,
    options = moves(r),
    editable = r.status === "draft" && r.actions.includes("edit"),
    person = r.isSelf
      ? t("You", "आप")
      : (data.employees.find((e: any) => e.id === r.employee_id)?.name ??
        t("Authorized employee", "अधिकृत कर्मचारी"));
  // A fresh idempotency id per chosen action; a retry of the same one reuses it.
  const choose = (a: string) => {
    setAction(a);
    setClientId(crypto.randomUUID());
    setError("");
  };
  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await write(HrCommandDocument, {
        operation: "action",
        input: {
          id: r.id,
          expectedVersion: r.version,
          clientId,
          action,
          note,
          ...(action === "assign" ? { employeeId } : {}),
        },
      });
      setAction("");
      setNote("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const item = (label: string, value: React.ReactNode) => (
    <div key={label} className="grid min-w-0 gap-1">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="font-medium break-words">
        {value ?? (
          <span className="text-muted-foreground font-normal">
            {t("Not set", "सेट नहीं")}
          </span>
        )}
      </dd>
    </div>
  );
  return (
    <Sheet open onOpenChange={(v) => !v && close()}>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="gap-3 border-b p-6 pr-12">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={r.status} />
            {kind === "grievance" && (
              <Badge tone="info">
                <Lock />
                {t("Confidential", "गोपनीय")}
              </Badge>
            )}
          </div>
          <SheetTitle className="text-xl leading-snug break-words">
            {recordTitle(r)}
          </SheetTitle>
          <SheetDescription>
            {t(...hrLabels[kind])} · {person} · {t("updated", "अपडेट")}{" "}
            {formatRelative(r.updated_at)}
          </SheetDescription>
        </SheetHeader>
        <div className="grid flex-1 content-start gap-6 overflow-y-auto p-6">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm [&_dd]:m-0 [&_dt]:m-0">
            {item(t(...kindMeta[kind].person), person)}
            {fields[kind]
              // Long text gets its own section; the title is the sheet heading.
              .filter(
                ([key, , type]) =>
                  type !== "textarea" &&
                  !["title", "subject", "name"].includes(key),
              )
              .map(([key, label, type]) =>
                item(label, shown(r, key, type, data, t)),
              )}
            {item(t("Created", "बनाया गया"), formatDateTime(r.created_at))}
          </dl>
          {fields[kind]
            .filter(([, , type]) => type === "textarea")
            .map(([key, label]) => (
              <section key={key} className="grid gap-1.5">
                <h3 className="text-sm font-semibold">{label}</h3>
                <p className="text-sm break-words whitespace-pre-wrap">
                  {r.payload[key] || (
                    <span className="text-muted-foreground">
                      {t("Not set", "सेट नहीं")}
                    </span>
                  )}
                </p>
              </section>
            ))}
          {r.acknowledged && (
            <Notice success>You acknowledged this record.</Notice>
          )}
          <Separator />
          <section className="grid gap-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Paperclip className="size-4" />
              {t("Attachments", "संलग्नक")}
            </h3>
            {r.files.length ? (
              <ul className="flex flex-wrap gap-2">
                {r.files.map((f: any, i: number) => (
                  <li key={f.id}>
                    {f.status === "ready" ? (
                      <a
                        className="bg-muted hover:bg-accent inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium"
                        href={`/files/attachments/${f.id}?siteId=${s.siteId}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Paperclip className="size-3.5" />
                        Open protected attachment
                        {r.files.length > 1 ? ` ${i + 1}` : ""}
                      </a>
                    ) : (
                      <Badge>{f.status}</Badge>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">
                {t("No attachments.", "कोई संलग्नक नहीं।")}
              </p>
            )}
          </section>
          <section className="grid gap-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <History className="size-4" />
              {t("History", "इतिहास")}
            </h3>
            {r.history.length ? (
              <ol className="ml-1 grid gap-4 border-l pl-5">
                {r.history.map((h: any) => (
                  <li key={h.version} className="relative grid gap-0.5 text-sm">
                    <span
                      aria-hidden
                      className="bg-primary ring-background absolute top-1.5 -left-[25px] size-2 rounded-full ring-4"
                    />
                    <p className="font-medium">
                      {h.event === "save"
                        ? t("Draft saved", "ड्राफ़्ट सहेजा")
                        : moveLabel(t, h.event)}{" "}
                      <span className="text-muted-foreground font-normal">
                        · v{h.version}
                      </span>
                    </p>
                    {h.note && (
                      <p className="text-muted-foreground break-words whitespace-pre-wrap">
                        {h.note}
                      </p>
                    )}
                    <p className="text-muted-foreground text-xs">
                      {formatDateTime(h.created_at)}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-muted-foreground text-sm">
                {t("No history yet.", "अभी कोई इतिहास नहीं।")}
              </p>
            )}
          </section>
        </div>
        {(action || editable || options.length > 0 || commentable(r)) && (
          <SheetFooter className="border-t p-4">
            {action ? (
              <form onSubmit={confirm} className="grid gap-3">
                <p className="text-sm font-semibold">
                  {t("Confirm", "पुष्टि करें")} · {moveLabel(t, action)}
                </p>
                {action === "assign" && (
                  <Field
                    label={t("Assign to", "किसे सौंपें")}
                    htmlFor={`${uid}-assignee`}
                  >
                    <NativeSelect
                      id={`${uid}-assignee`}
                      required
                      value={employeeId}
                      onChange={(e) => setEmployee(e.target.value)}
                    >
                      <option value="">
                        {t("Choose employee", "कर्मचारी चुनें")}
                      </option>
                      {data.employees.map((e: any) => (
                        <option key={e.id} value={e.id}>
                          {e.name}
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
                )}
                <Field
                  label={t("Reason / comment", "कारण / टिप्पणी")}
                  htmlFor={`${uid}-note`}
                  hint={t(
                    "At least 8 characters. Kept in the record history.",
                    "कम से कम 8 अक्षर। रिकॉर्ड के इतिहास में रहता है।",
                  )}
                >
                  <Textarea
                    id={`${uid}-note`}
                    required
                    minLength={8}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="min-h-20"
                  />
                </Field>
                {error && (
                  <Alert variant="destructive">
                    <TriangleAlert />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      setAction("");
                      setError("");
                    }}
                  >
                    {t("Cancel", "रद्द करें")}
                  </Button>
                  <Button type="submit" disabled={busy}>
                    {busy && <Loader2 className="size-4 animate-spin" />}
                    {t("Confirm", "पुष्टि करें")}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="flex flex-wrap gap-2">
                {options.map((a, i) => {
                  const Icon = moveIcon[a] ?? Circle;
                  return (
                    <Button
                      key={a}
                      // The operation name stays the accessible name.
                      aria-label={a}
                      variant={
                        i === 0 && a !== "reject" ? "default" : "outline"
                      }
                      className={cn(a === "reject" && "text-destructive")}
                      onClick={() => choose(a)}
                    >
                      <Icon className="size-4" />
                      {moveLabel(t, a)}
                    </Button>
                  );
                })}
                {commentable(r) && (
                  <Button variant="outline" onClick={() => choose("comment")}>
                    <MessageSquare className="size-4" />
                    {t("Comment", "टिप्पणी")}
                  </Button>
                )}
                {editable && (
                  <Button variant="outline" onClick={edit}>
                    <Pencil className="size-4" />
                    {t("Edit / attach", "संपादित / संलग्न करें")}
                  </Button>
                )}
              </div>
            )}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
function HrEditor({
  initial,
  data,
  close,
}: {
  initial: any;
  data: any;
  close: () => void;
}) {
  const kind: HrKind = initial.kind,
    s = useScope(),
    t = useT(),
    write = useWrite(),
    uid = useId(),
    [payload, setPayload] = useState<any>(() =>
      Object.fromEntries(
        fields[kind].map(([k, , type]) => [
          k,
          // ponytail: money fields hold rupee text while editing; save converts
          // it back to exact integer paise.
          type === "money"
            ? initial.payload[k]
              ? plainMoney(initial.payload[k])
              : ""
            : (initial.payload[k] ??
              (type === "checkbox"
                ? false
                : [
                      "expiresOn",
                      "destinationSiteId",
                      "salaryStructureId",
                    ].includes(k)
                  ? null
                  : k === "category" && kind === "document"
                    ? "general"
                    : "")),
        ]),
      ),
    ),
    [employeeId, setEmployee] = useState(
      initial.employee_id ?? data.ownEmployeeId ?? "",
    ),
    [audience, setAudience] = useState<string[]>(initial.audience ?? []),
    [note, setNote] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [attachments, setAttachments] = useState<string[]>(
      initial.attachments ?? [],
    ),
    [clientId, setClientId] = useState(() => crypto.randomUUID());
  // Audiences are app users; employees without a login cannot be chosen.
  const recipients = data.employees.filter((e: any) => e.userId),
    categories = [
      ...new Set<string>(
        data.records.map((r: any) => r.payload.category).filter(Boolean),
      ),
    ];
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await write(HrCommandDocument, {
        operation: "save",
        input: {
          clientId,
          expectedVersion: initial.version ?? 0,
          ...(initial.id ? { id: initial.id } : {}),
          kind,
          employeeId,
          payload:
            kind === "expense"
              ? {
                  ...payload,
                  amountPaise: rupeesToPaise(String(payload.amountPaise)),
                }
              : payload,
          attachments,
          audience,
          note,
        },
      });
      close();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function attach(f: File) {
    setBusy(true);
    try {
      const response: any = await write(HrCommandDocument, {
        operation: "fileIntent",
        input: {
          id: initial.id,
          expectedVersion: initial.version,
          clientId: crypto.randomUUID(),
          type: f.type,
          bytes: f.size,
        },
      });
      const ticket = s.boundary.ticket();
      try {
        const result: any = await uploadEvidence(
          s.siteId,
          response.hrCommand.id,
          f,
        );
        if (!ticket.isCurrent())
          throw Error("Workspace changed; reopen the original record");
        if (result.status !== "ready")
          throw Error(
            `File ${result.status}. Scanning is required before attaching.`,
          );
        setAttachments([...attachments, result.id]);
      } finally {
        ticket.release();
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function control(key: string, label: string, type: string) {
    const id = `${uid}-${key}`;
    if (type === "checkbox")
      return (
        <label
          key={key}
          htmlFor={id}
          className="flex items-center gap-3 text-sm font-medium sm:col-span-2"
        >
          <Switch
            id={id}
            checked={payload[key]}
            onChange={(e) =>
              setPayload({ ...payload, [key]: e.target.checked })
            }
          />
          {label}
        </label>
      );
    if (["category", "event", "site", "employment", "structure"].includes(type))
      return (
        <Field key={key} label={label} htmlFor={id}>
          <NativeSelect
            id={id}
            value={payload[key] ?? ""}
            onChange={(e) =>
              setPayload({ ...payload, [key]: e.target.value || null })
            }
          >
            {type === "employment" || type === "structure" ? (
              <>
                <option value="">Choose {type}</option>
                {(type === "employment"
                  ? data.employments
                  : data.salaryStructures
                )
                  .filter((x: any) => x.employee_id === employeeId)
                  .map((x: any) => (
                    <option key={x.id} value={x.id}>
                      {type === "employment"
                        ? `${x.name} · ${x.employer}`
                        : `${formatDate(x.starts_on)} — ${formatDate(x.ends_on)}`}
                    </option>
                  ))}
              </>
            ) : type === "category" ? (
              ["general", "identity", "bank"].map((x) => (
                <option key={x} value={x}>
                  {humanize(x)}
                </option>
              ))
            ) : type === "event" ? (
              <>
                <option value="">{t("Choose event", "घटना चुनें")}</option>
                {[
                  "joining",
                  "promotion",
                  "transfer",
                  "salary_revision",
                  "probation",
                  "confirmation",
                  "exit",
                ].map((x) => (
                  <option key={x} value={x}>
                    {humanize(x)}
                  </option>
                ))}
              </>
            ) : (
              <>
                <option value="">Choose destination</option>
                {s.sites.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </>
            )}
          </NativeSelect>
        </Field>
      );
    if (type === "textarea")
      return (
        <Field key={key} label={label} htmlFor={id} className="sm:col-span-2">
          <Textarea
            id={id}
            required
            className="min-h-24"
            value={payload[key] ?? ""}
            onChange={(e) => {
              setClientId(crypto.randomUUID());
              setPayload({ ...payload, [key]: e.target.value });
            }}
          />
        </Field>
      );
    return (
      <Field key={key} label={label} htmlFor={id}>
        <Input
          id={id}
          type={type === "money" ? "text" : type}
          inputMode={type === "money" ? "decimal" : undefined}
          placeholder={type === "money" ? "0.00" : undefined}
          list={
            key === "category" && categories.length
              ? `${uid}-categories`
              : undefined
          }
          required={
            ![
              "serialNumber",
              "expiresOn",
              "salaryStructureId",
              "department",
              "designation",
            ].includes(key)
          }
          value={payload[key] ?? ""}
          onChange={(e) => {
            setClientId(crypto.randomUUID());
            setPayload({
              ...payload,
              [key]:
                ["expiresOn", "salaryStructureId"].includes(key) &&
                !e.target.value
                  ? null
                  : e.target.value,
            });
          }}
        />
      </Field>
    );
  }
  return (
    <Dialog open onOpenChange={(v) => !v && !busy && close()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {initial.id
              ? `${t("Edit draft", "ड्राफ़्ट संपादित करें")} · ${recordTitle(initial)}`
              : t(...kindMeta[kind].action)}
          </DialogTitle>
          <DialogDescription>
            {t(...hrLabels[kind])} ·{" "}
            {t(
              "Saved as a draft. Open the record to submit it when it is ready.",
              "ड्राफ़्ट के रूप में सहेजा जाता है। तैयार होने पर रिकॉर्ड खोलकर जमा करें।",
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {["asset", "document", "lifecycle"].includes(kind) && (
              <Field
                label="Employee"
                htmlFor={`${uid}-employee`}
                className="sm:col-span-2"
              >
                <NativeSelect
                  id={`${uid}-employee`}
                  required
                  value={employeeId}
                  disabled={!!initial.id}
                  onChange={(e) => setEmployee(e.target.value)}
                >
                  <option value="">Choose employee</option>
                  {data.employees.map((e: any) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                  {data.ownEmployeeId &&
                    !data.employees.some(
                      (e: any) => e.id === data.ownEmployeeId,
                    ) && <option value={data.ownEmployeeId}>Me</option>}
                </NativeSelect>
              </Field>
            )}
            {fields[kind].map(([key, label, type]) =>
              control(key, label, type),
            )}
          </div>
          {categories.length > 0 && (
            <datalist id={`${uid}-categories`}>
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          )}
          {["announcement", "policy"].includes(kind) && (
            <fieldset className="m-0 grid min-w-0 gap-2 border-0 p-0">
              <legend className="mb-2 text-sm font-medium">
                Explicit audience
              </legend>
              <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-xs">
                <span>
                  {audience.length} {t("selected", "चयनित")}
                </span>
                <span className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setAudience(recipients.map((e: any) => e.userId))
                    }
                  >
                    {t("Select all", "सभी चुनें")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setAudience([])}
                  >
                    {t("Clear", "हटाएँ")}
                  </Button>
                </span>
              </div>
              <div className="grid max-h-48 gap-0.5 overflow-y-auto rounded-md border p-1.5 sm:grid-cols-2">
                {recipients.map((e: any) => (
                  <label
                    key={e.id}
                    className="hover:bg-muted flex items-center gap-2 rounded px-2 py-1.5 text-sm font-normal"
                  >
                    <input
                      type="checkbox"
                      className="accent-primary size-4"
                      checked={audience.includes(e.userId)}
                      onChange={(ev) =>
                        setAudience(
                          ev.target.checked
                            ? [...audience, e.userId]
                            : audience.filter((x) => x !== e.userId),
                        )
                      }
                    />
                    <span className="truncate">{e.name}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          {initial.id ? (
            <Field
              label="Attach receipt / document (JPEG, PNG, PDF, ≤8 MiB)"
              htmlFor={`${uid}-file`}
              hint={`${attachments.length} ready attachments`}
            >
              <Input
                id={`${uid}-file`}
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                disabled={busy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void attach(f);
                }}
              />
            </Field>
          ) : (
            <Alert variant="info">
              <Paperclip />
              <AlertDescription>
                Save the draft first, then reopen it to attach files. Expenses
                and documents require ready attachments before submission.
              </AlertDescription>
            </Alert>
          )}
          <Field
            label={t("Change reason", "बदलाव का कारण")}
            htmlFor={`${uid}-note`}
            hint={t(
              "At least 8 characters. Kept in the record history.",
              "कम से कम 8 अक्षर। रिकॉर्ड के इतिहास में रहता है।",
            )}
          >
            <Textarea
              id={`${uid}-note`}
              required
              minLength={8}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
          {error && (
            <Alert variant="destructive">
              <TriangleAlert />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={close}
            >
              {t("Cancel", "रद्द करें")}
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {t("Save server draft", "ड्राफ़्ट सहेजें")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
function HandlerEditor({
  employees,
  close,
  version,
}: {
  employees: any[];
  close: () => void;
  version: number;
}) {
  const write = useWrite(),
    t = useT(),
    uid = useId(),
    [ids, setIds] = useState<string[]>([]),
    [note, setNote] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <Dialog open onOpenChange={(v) => !v && !busy && close()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Confidential case handlers</DialogTitle>
          <DialogDescription>
            Selected handlers must already have confidential-field and site
            review grants. This affects new cases; existing case assignments
            remain unchanged.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await write(HrCommandDocument, {
                operation: "handlers",
                input: {
                  clientId: crypto.randomUUID(),
                  expectedVersion: version,
                  userIds: ids,
                  note,
                },
              });
              close();
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <fieldset className="m-0 grid min-w-0 gap-2 border-0 p-0">
            <legend className="mb-2 text-sm font-medium">
              {t("Handlers", "अधिकारी")} · {ids.length} {t("selected", "चयनित")}
            </legend>
            <div className="grid max-h-56 gap-0.5 overflow-y-auto rounded-md border p-1.5">
              {employees
                .filter((e) => e.userId)
                .map((e) => (
                  <label
                    key={e.id}
                    className="hover:bg-muted flex items-center gap-2 rounded px-2 py-1.5 text-sm font-normal"
                  >
                    <input
                      type="checkbox"
                      className="accent-primary size-4"
                      checked={ids.includes(e.userId)}
                      onChange={(v) =>
                        setIds(
                          v.target.checked
                            ? [...ids, e.userId]
                            : ids.filter((x) => x !== e.userId),
                        )
                      }
                    />
                    <span className="truncate">{e.name}</span>
                  </label>
                ))}
            </div>
          </fieldset>
          <Field label="Reason" htmlFor={`${uid}-note`}>
            <Textarea
              id={`${uid}-note`}
              required
              minLength={8}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
          {error && (
            <Alert variant="destructive">
              <TriangleAlert />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={close}
            >
              {t("Cancel", "रद्द करें")}
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Save handlers
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
function ReminderEditor({
  settings,
  close,
}: {
  settings: any;
  close: () => void;
}) {
  const write = useWrite(),
    t = useT(),
    uid = useId(),
    [days, setDays] = useState(settings.reminder_days?.toString() ?? ""),
    [note, setNote] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <Dialog open onOpenChange={(v) => !v && !busy && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Document expiry reminders</DialogTitle>
          <DialogDescription>
            Reminders are disabled until configured. Recipients must still have
            access to the document.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await write(HrCommandDocument, {
                operation: "reminders",
                input: {
                  clientId: crypto.randomUUID(),
                  expectedVersion: settings.version,
                  days: days ? Number(days) : null,
                  note,
                },
              });
              close();
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field
            label="Days before expiry (blank disables)"
            htmlFor={`${uid}-days`}
            hint={
              settings.reminder_days
                ? `${t("Currently", "अभी")} ${settings.reminder_days} ${t("days before expiry.", "दिन पहले।")}`
                : t("Currently off.", "अभी बंद है।")
            }
          >
            <Input
              id={`${uid}-days`}
              type="number"
              min={1}
              max={365}
              value={days}
              onChange={(e) => setDays(e.target.value)}
            />
          </Field>
          <Field label="Reason" htmlFor={`${uid}-note`}>
            <Textarea
              id={`${uid}-note`}
              minLength={8}
              required
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
          {error && (
            <Alert variant="destructive">
              <TriangleAlert />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={close}
            >
              {t("Cancel", "रद्द करें")}
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Save reminder configuration
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Approval queue items reviewed outside the HR records workflow.
const outside = ["payroll", "dwr", "leave", "attendance"];
const hrRoute: Record<string, string> = {
  expense: "expenses",
  asset: "assets",
  document: "documents",
  policy: "policies",
  announcement: "announcements",
  lifecycle: "lifecycle",
  helpdesk: "helpdesk",
  grievance: "grievances",
};
const reviewPath = (kind: string) =>
  outside.includes(kind) ? `/${kind}` : `/${hrRoute[kind] ?? "hr"}`;
const isHr = (kind: string): kind is HrKind =>
  (hrKinds as readonly string[]).includes(kind);
const queueText: Record<string, Copy> = {
  payroll: ["Payroll", "पेरोल"],
  leave: ["Leave", "छुट्टी"],
  attendance: ["Attendance", "उपस्थिति"],
  dwr: ["Daily work reports", "दैनिक कार्य रिपोर्ट"],
};
const queueIcons: Record<string, LucideIcon> = {
  payroll: Wallet,
  leave: CalendarCheck,
  attendance: Clock,
  dwr: NotebookPen,
};
const queueLabel = (t: T, kind: string) =>
  isHr(kind)
    ? t(...hrLabels[kind])
    : queueText[kind]
      ? t(...queueText[kind])
      : humanize(kind);
const queueIcon = (kind: string) =>
  isHr(kind) ? kindMeta[kind].icon : (queueIcons[kind] ?? Inbox);
const areas: { id: string; label: Copy; icon: LucideIcon }[] = [
  { id: "hr", label: ["HR requests", "एचआर अनुरोध"], icon: ClipboardCheck },
  {
    id: "time",
    label: ["Leave & attendance", "छुट्टी और उपस्थिति"],
    icon: CalendarCheck,
  },
  { id: "payroll", label: ["Payroll", "पेरोल"], icon: Wallet },
  {
    id: "dwr",
    label: ["Daily work reports", "दैनिक कार्य रिपोर्ट"],
    icon: NotebookPen,
  },
];
const areaOf = (kind: string) =>
  isHr(kind) ? "hr" : kind === "leave" || kind === "attendance" ? "time" : kind;

export function ApprovalQueue({
  open,
  standalone = false,
}: {
  open?: (kind: HrKind) => void;
  standalone?: boolean;
}) {
  const q = useScopedQuery<any>(
      ["approval-queue"],
      ApprovalQueueDocument,
      {},
      true,
      30000,
    ),
    s = useScope(),
    t = useT(),
    navigate = useNavigate(),
    [filters, setFilters] = useState<ColumnFiltersState>([]);
  const items: any[] = q.data?.approvalQueue.items ?? [],
    label = (kind: string) => queueLabel(t, kind);
  const review = (r: any) =>
    outside.includes(r.kind) ? (
      <Button asChild variant="outline" size="sm">
        <Link to={`/${r.kind}`}>{t("Open review", "समीक्षा खोलें")}</Link>
      </Button>
    ) : open ? (
      <Button variant="outline" size="sm" onClick={() => open(r.kind)}>
        {t("Open", "खोलें")} {label(r.kind)}
      </Button>
    ) : (
      <Button asChild variant="outline" size="sm">
        <Link to={reviewPath(r.kind)}>
          {t("Open HR review", "एचआर समीक्षा खोलें")}
        </Link>
      </Button>
    );
  if (!standalone) {
    if (q.error)
      return <ErrorState error={q.error} retry={() => void q.refetch()} />;
    if (!items.length) return null;
    return (
      <Section
        title={t("Pending approvals", "लंबित स्वीकृतियाँ")}
        description={`${items.length} ${t("waiting for your decision", "आपके निर्णय की प्रतीक्षा में")}`}
        bodyClassName="p-0"
      >
        <ul className="max-h-80 divide-y overflow-y-auto">
          {items.map((r) => {
            const Icon = queueIcon(r.kind);
            return (
              <li
                key={`${r.kind}:${r.id}`}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <Icon className="text-muted-foreground size-4 shrink-0" />
                  <span className="grid min-w-0">
                    <span className="truncate text-sm font-medium">
                      {label(r.kind)}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {formatRelative(r.updated_at)}
                    </span>
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <StatusBadge status={r.status} />
                  {review(r)}
                </span>
              </li>
            );
          })}
        </ul>
      </Section>
    );
  }
  const title = t("Approvals", "स्वीकृतियाँ"),
    heading = (
      <Heading
        title={title}
        description={t(
          `Requests waiting for your review or approval at ${s.siteName}, oldest first.`,
          `${s.siteName} पर आपकी समीक्षा या स्वीकृति की प्रतीक्षा में अनुरोध, सबसे पुराने पहले।`,
        )}
      />
    );
  if (q.isPending) return <PageSkeleton title={title} />;
  if (q.error)
    return (
      <section className="grid gap-5">
        {heading}
        <ErrorState error={q.error} retry={() => void q.refetch()} />
      </section>
    );
  if (!items.length)
    return (
      <section className="grid gap-5">
        {heading}
        <Empty
          icon={CheckCheck}
          title={t("Nothing waiting for you", "आपके लिए कुछ बाकी नहीं")}
        >
          {t(
            "You’re all caught up. Requests that need your review or approval appear here.",
            "सब काम पूरा है। आपकी समीक्षा या स्वीकृति वाले अनुरोध यहाँ दिखेंगे।",
          )}
        </Empty>
      </section>
    );
  const modules = [...new Set(items.map((r) => label(r.kind)))],
    statuses = [...new Set(items.map((r) => String(r.status)))].sort(
      (a, b) => rank(a) - rank(b),
    );
  const columns: ColumnDef<any>[] = [
    {
      header: t("Request", "अनुरोध"),
      id: "module",
      accessorFn: (r) => label(r.kind),
      cell: ({ row: { original: r } }) => {
        const Icon = queueIcon(r.kind);
        return (
          <span className="flex min-w-[180px] items-center gap-3">
            <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-md">
              <Icon className="size-4" />
            </span>
            <span className="font-medium">{label(r.kind)}</span>
          </span>
        );
      },
    },
    {
      header: t("Status", "स्थिति"),
      id: "status",
      accessorFn: (r) => r.status,
      cell: ({ row: { original: r } }) => <StatusBadge status={r.status} />,
    },
    {
      header: t("Waiting since", "कब से"),
      id: "waiting",
      accessorFn: (r) => r.updated_at,
      enableGlobalFilter: false,
      cell: ({ row: { original: r } }) => (
        <span className="flex flex-col whitespace-nowrap">
          <span>{formatDate(r.updated_at)}</span>
          <span className="text-muted-foreground text-xs">
            {formatRelative(r.updated_at)}
          </span>
        </span>
      ),
    },
    {
      header: t("Area", "क्षेत्र"),
      id: "area",
      accessorFn: (r) => areaOf(r.kind),
      enableGlobalFilter: false,
    },
    {
      header: "",
      id: "actions",
      enableHiding: false,
      enableSorting: false,
      cell: ({ row: { original: r } }) => (
        <div className="flex justify-end">{review(r)}</div>
      ),
    },
  ];
  return (
    <section className="grid min-w-0 gap-5">
      {heading}
      <StatGrid>
        {areas.map((a) => {
          // Items arrive oldest first.
          const mine = items.filter((r) => areaOf(r.kind) === a.id),
            preset: ColumnFiltersState = [{ id: "area", value: [a.id] }];
          return (
            <StatCard
              key={a.id}
              label={t(...a.label)}
              value={mine.length}
              hint={
                mine.length
                  ? `${t("Oldest", "सबसे पुराना")}: ${formatRelative(mine[0].updated_at)}`
                  : t("Nothing waiting", "कुछ बाकी नहीं")
              }
              icon={a.icon}
              tone={mine.length ? "warning" : "default"}
              active={sameFilters(filters, preset)}
              onClick={
                mine.length
                  ? () =>
                      setFilters((cur) =>
                        sameFilters(cur, preset) ? [] : preset,
                      )
                  : undefined
              }
            />
          );
        })}
      </StatGrid>
      <DataTable
        data={items}
        columns={columns}
        getRowId={(r: any) => `${r.kind}:${r.id}`}
        label={t("Pending approvals", "लंबित स्वीकृतियाँ")}
        search={t("Search approvals…", "स्वीकृतियाँ खोजें…")}
        hidden={["area"]}
        columnFilters={filters}
        onColumnFiltersChange={setFilters}
        onRowClick={(r: any) => navigate(reviewPath(r.kind))}
        filters={[
          {
            column: "module",
            title: t("Module", "मॉड्यूल"),
            options: modules.map((v) => ({ value: v, label: v })),
          },
          ...(statuses.length > 1
            ? [
                {
                  column: "status",
                  title: t("Status", "स्थिति"),
                  options: statuses.map((v) => ({
                    value: v,
                    label: statusLabel(t, v),
                    icon: statusIcon[v],
                  })),
                },
              ]
            : []),
        ]}
      />
      {items.length >= (q.data.approvalQueue.limit ?? 100) && (
        <p className="text-muted-foreground text-xs">
          {t(
            "Showing the 100 oldest items.",
            "सबसे पुराने 100 आइटम दिख रहे हैं।",
          )}
        </p>
      )}
    </section>
  );
}
function HrInbox({ open }: { open: (kind: HrKind) => void }) {
  const navigate = useNavigate();
  const s = useScope(),
    t = useT(),
    write = useWrite(),
    q = useScopedQuery<any>(
      ["operations"],
      OperationsDocument,
      {},
      s.capabilities.includes("inbox.view"),
      30000,
    ),
    [error, setError] = useState("");
  if (!q.data) return null;
  const inbox: any[] = q.data.operations.inbox;
  return (
    <Section
      title={t("HR inbox", "एचआर इनबॉक्स")}
      description={`${inbox.filter((n) => !n.read_at).length} ${t("unread", "अपठित")}`}
      bodyClassName="p-0"
    >
      {error && (
        <div className="p-4">
          <Alert variant="destructive">
            <TriangleAlert />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}
      {!inbox.length ? (
        <p className="text-muted-foreground px-5 py-4 text-sm">
          {t("No notifications yet.", "अभी कोई सूचना नहीं।")}
        </p>
      ) : (
        <ul className="max-h-80 divide-y overflow-y-auto">
          {inbox.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                className="hover:bg-muted/50 flex w-full items-start gap-3 px-5 py-3 text-left"
                onClick={async () => {
                  try {
                    await write(OperateDocument, {
                      operation: "readInbox",
                      input: { id: n.id },
                    });
                    const kind = n.event_type.split(".")[1];
                    if (hrKinds.includes(kind)) open(kind);
                    else
                      navigate(
                        n.module === "my_payroll"
                          ? "/payroll"
                          : n.module.includes("dwr")
                            ? "/dwr"
                            : "/operations",
                      );
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                <span
                  aria-hidden
                  className={cn(
                    "mt-1.5 size-2 shrink-0 rounded-full",
                    n.read_at ? "bg-border" : "bg-primary",
                  )}
                />
                <span className="grid min-w-0 gap-0.5">
                  <span className="truncate text-sm font-medium">
                    {n.event_type.replaceAll(".", " · ")}
                    {!n.read_at && (
                      <span className="sr-only"> · {t("unread", "अपठित")}</span>
                    )}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {formatDateTime(n.created_at)} · Push: {n.push_status}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
