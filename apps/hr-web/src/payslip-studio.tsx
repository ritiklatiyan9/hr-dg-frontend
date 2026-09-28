import { useMemo, useState, type ReactNode } from "react";
import {
  ExternalLink,
  ImagePlus,
  LayoutTemplate,
  Loader2,
  RotateCcw,
  Save,
  Trash2,
  Undo2,
} from "lucide-react";
import {
  PayrollCommandDocument,
  PayrollDocument,
} from "../../../packages/contracts/src/generated";
import {
  defaultPayslipDesign,
  payslipDesign,
  renderPayslipHtml,
  type PayslipData,
  type PayslipDesign,
} from "../../../packages/contracts/payslip";
import { useScope, useScopedQuery, useWrite } from "./workspace-context";
import { ErrorState, useT } from "./ui";
import { Desk, DeskHeader } from "./components/shared/desk";
import { Field } from "./components/shared/page";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const layouts: { id: PayslipDesign["layout"]; label: string; hint: string }[] =
  [
    { id: "classic", label: "Classic", hint: "Ruled tables, accent rule" },
    { id: "modern", label: "Modern", hint: "Colour header band" },
    { id: "compact", label: "Compact", hint: "Dense, minimal lines" },
  ];
const accents = ["#1E6B4B", "#0F4C81", "#7A1F3D", "#B45309", "#374151", "#5B21B6"];
const sections: [keyof PayslipDesign["show"], string][] = [
  ["employeeCode", "Employee code"],
  ["designation", "Designation"],
  ["department", "Department"],
  ["legalEmployer", "Employer (legal entity)"],
  ["revision", "Revision number"],
  ["payments", "Recorded payments"],
  ["amountInWords", "Net pay in words"],
  ["notes", "Calculation notes and policy"],
  ["signature", "Signature block"],
];
/** Synthetic preview only; never stored or sent anywhere. */
function sample(): PayslipData {
  const now = new Date(),
    y = now.getFullYear(),
    m = String(now.getMonth() + 1).padStart(2, "0"),
    last = new Date(y, now.getMonth() + 1, 0).getDate();
  const line = (label: string, kind: string, calculatedPaise: string) => ({
    label,
    kind,
    calculatedPaise,
  });
  return {
    id: "SAMPLE-PREVIEW",
    start: `${y}-${m}-01`,
    finish: `${y}-${m}-${last}`,
    revision: 1,
    publishedAt: now.toISOString(),
    snapshot: {
      lines: [
        line("Basic salary", "earning", "2500000"),
        line("House rent allowance", "earning", "1000000"),
        line("Conveyance", "earning", "160000"),
        line("Overtime", "overtime", "240000"),
        line("Provident fund", "deduction", "180000"),
        line("Professional tax", "deduction", "20000"),
      ],
      grossPaise: "3900000",
      deductionPaise: "200000",
      netPaise: "3700000",
      employeeName: "Sample Employee",
      employeeCode: "EMP-0001",
      legalEmployer: "Your Legal Employer Pvt Ltd",
      policyVersion: "SAMPLE",
      assumptions: "Sample figures for the design preview only.",
    },
    payments: [
      {
        kind: "payment",
        paise: "3700000",
        method: "bank_transfer",
        reference: "UTR SAMPLE0001",
        paidOn: `${y}-${m}-${last}`,
      },
    ],
    paidPaise: "3700000",
    department: "Operations",
    jobTitle: "Site Supervisor",
    sample: true,
  };
}
/** Downscales an uploaded logo in the browser so it fits the request limit;
 * the server re-encodes it again before storing. */
async function logoDataUrl(file: File) {
  const bitmap = await createImageBitmap(file);
  const k = Math.min(1, 480 / bitmap.width, 160 / bitmap.height),
    canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * k));
  canvas.height = Math.max(1, Math.round(bitmap.height * k));
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const png = canvas.toDataURL("image/png");
  return png.length <= 55000 ? png : canvas.toDataURL("image/jpeg", 0.85);
}
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-3 rounded-xl border bg-card p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}
export function PayslipStudio() {
  const s = useScope(),
    t = useT(),
    write = useWrite(),
    q = useScopedQuery<any>(["payroll", "design"], PayrollDocument, {
      input: { design: true, first: 1 },
    }),
    [draft, setDraft] = useState<PayslipDesign | null>(null),
    [source, setSource] = useState<"sample" | "latest">("sample"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const d = q.data?.payroll,
    saved: PayslipDesign = d?.design?.design ?? defaultPayslipDesign,
    design = draft ?? saved,
    dirty = !!draft && JSON.stringify(draft) !== JSON.stringify(saved),
    valid = payslipDesign.safeParse(design),
    canEdit = !!d?.canManage,
    latest = d?.results?.[0];
  const set = (patch: Partial<PayslipDesign>) =>
    setDraft({ ...design, ...patch });
  const data = useMemo<PayslipData>(
    () =>
      source === "latest" && latest
        ? {
            id: latest.id,
            start: latest.periodStart,
            finish: latest.periodEnd,
            revision: latest.revision,
            publishedAt: latest.published_at,
            snapshot: latest.snapshot,
            payments: latest.payments,
            paidPaise: latest.paidPaise,
          }
        : sample(),
    [source, latest],
  );
  // Preview-only fallback so a half-typed field never blanks the page.
  const html = useMemo(
    () => renderPayslipHtml(valid.success ? design : saved, data),
    [design, saved, valid.success, data],
  );
  if (q.error)
    return <ErrorState error={q.error} retry={() => void q.refetch()} />;
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await write(PayrollCommandDocument, {
        operation: "design",
        input: {
          clientId: crypto.randomUUID(),
          expectedVersion: d.design.version,
          design,
        },
      });
      setDraft(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const upload = async (file?: File) => {
    if (!file) return;
    setError("");
    try {
      set({ logo: await logoDataUrl(file) });
    } catch {
      setError(t("That file could not be read as an image.", "यह फ़ाइल छवि के रूप में नहीं पढ़ी जा सकी।"));
    }
  };
  return (
    <Desk label={t("Payslip designer", "वेतन पर्ची डिज़ाइनर")}>
      <DeskHeader
        crumb={t("Finance / Payroll", "वित्त / वेतन")}
        title={t("Payslip designer", "वेतन पर्ची डिज़ाइनर")}
        subtitle={`${s.siteName} · ${t("Branding and layout of every payslip at this site — web, print and the mobile app", "इस साइट की हर वेतन पर्ची का ब्रांड और लेआउट — वेब, प्रिंट और मोबाइल ऐप")}`}
      >
        {canEdit && (
          <>
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => setDraft(defaultPayslipDesign)}
            >
              <RotateCcw className="size-4" />
              {t("Defaults", "डिफ़ॉल्ट")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!dirty || busy}
              onClick={() => setDraft(null)}
            >
              <Undo2 className="size-4" />
              {t("Discard", "छोड़ें")}
            </Button>
            <Button
              size="sm"
              disabled={!dirty || busy || !valid.success}
              onClick={() => void save()}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {t("Save design", "डिज़ाइन सहेजें")}
            </Button>
          </>
        )}
      </DeskHeader>
      {!canEdit && d && (
        <Alert>
          <AlertDescription>
            {t(
              "View only. Payroll managers (payroll.manage) can change the payslip design.",
              "केवल देखें। पेरोल प्रबंधक (payroll.manage) डिज़ाइन बदल सकते हैं।",
            )}
          </AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-4 min-[1100px]:grid-cols-[minmax(340px,420px)_1fr]">
        <fieldset
          disabled={!canEdit || busy || q.isPending}
          className="grid content-start gap-4"
        >
          <Section title={t("Layout", "लेआउट")}>
            <div
              role="radiogroup"
              aria-label={t("Layout", "लेआउट")}
              className="grid grid-cols-3 gap-2"
            >
              {layouts.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  role="radio"
                  aria-checked={design.layout === l.id}
                  onClick={() => set({ layout: l.id })}
                  className={cn(
                    "grid gap-1 rounded-lg border p-3 text-left text-sm transition-colors hover:bg-muted",
                    design.layout === l.id &&
                      "border-primary bg-accent ring-primary/30 ring-2",
                  )}
                >
                  <LayoutTemplate className="size-4" />
                  <span className="font-medium">{l.label}</span>
                  <span className="text-muted-foreground text-xs">{l.hint}</span>
                </button>
              ))}
            </div>
            <Field label={t("Accent colour", "मुख्य रंग")}>
              <div className="flex flex-wrap items-center gap-2">
                {accents.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={c}
                    aria-pressed={design.accent.toUpperCase() === c}
                    onClick={() => set({ accent: c })}
                    className={cn(
                      "size-7 rounded-full border-2 border-transparent",
                      design.accent.toUpperCase() === c &&
                        "ring-2 ring-offset-2 ring-ring",
                    )}
                    style={{ background: c }}
                  />
                ))}
                <input
                  type="color"
                  aria-label={t("Custom colour", "कस्टम रंग")}
                  value={design.accent}
                  onChange={(e) => set({ accent: e.target.value.toUpperCase() })}
                  className="h-8 w-10 cursor-pointer rounded border bg-transparent p-0.5"
                />
                <span className="rd-mono text-muted-foreground text-xs">
                  {design.accent}
                </span>
              </div>
            </Field>
          </Section>
          <Section title={t("Company", "कंपनी")}>
            <Field
              label={t("Company name", "कंपनी का नाम")}
              htmlFor="slip-company"
              hint={t(
                "Leave blank to print each employee's legal employer.",
                "खाली छोड़ें तो कर्मचारी का कानूनी नियोक्ता छपेगा।",
              )}
            >
              <Input
                id="slip-company"
                maxLength={120}
                value={design.companyName}
                onChange={(e) => set({ companyName: e.target.value })}
              />
            </Field>
            <Field label={t("Address and registration lines", "पता और पंजीकरण")} htmlFor="slip-address">
              <Textarea
                id="slip-address"
                rows={3}
                maxLength={300}
                placeholder={"Plot 12, Sector 5, Gurugram 122001\nGSTIN / CIN"}
                value={design.companyAddress}
                onChange={(e) => set({ companyAddress: e.target.value })}
              />
            </Field>
            <Field label={t("Logo", "लोगो")}>
              <div className="flex items-center gap-3">
                {design.logo ? (
                  <img
                    src={design.logo}
                    alt={t("Current logo", "वर्तमान लोगो")}
                    className="h-12 max-w-40 rounded border bg-white object-contain p-1"
                  />
                ) : (
                  <span className="text-muted-foreground text-sm">
                    {t("No logo", "कोई लोगो नहीं")}
                  </span>
                )}
                <Button variant="outline" size="sm" asChild>
                  <label className="cursor-pointer">
                    <ImagePlus className="size-4" />
                    {design.logo ? t("Replace", "बदलें") : t("Upload", "अपलोड")}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      onChange={(e) => {
                        void upload(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </Button>
                {design.logo && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("Remove logo", "लोगो हटाएँ")}
                    onClick={() => set({ logo: null })}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            </Field>
          </Section>
          <Section title={t("Text", "पाठ")}>
            <Field label={t("Document title", "दस्तावेज़ शीर्षक")} htmlFor="slip-title">
              <Input
                id="slip-title"
                maxLength={60}
                value={design.title}
                aria-invalid={!design.title.trim()}
                onChange={(e) => set({ title: e.target.value })}
              />
            </Field>
            <Field label={t("Footer note", "फ़ुटर नोट")} htmlFor="slip-footer">
              <Textarea
                id="slip-footer"
                rows={2}
                maxLength={500}
                value={design.footer}
                onChange={(e) => set({ footer: e.target.value })}
              />
            </Field>
          </Section>
          <Section title={t("Show on the payslip", "पर्ची पर दिखाएँ")}>
            <div className="grid gap-2.5">
              {sections.map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  {label}
                  <Switch
                    checked={design.show[key]}
                    onChange={(e) =>
                      set({ show: { ...design.show, [key]: e.target.checked } })
                    }
                  />
                </label>
              ))}
            </div>
            {design.show.signature && (
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("Signatory", "हस्ताक्षरकर्ता")} htmlFor="slip-sign">
                  <Input
                    id="slip-sign"
                    maxLength={80}
                    value={design.signatory}
                    onChange={(e) => set({ signatory: e.target.value })}
                  />
                </Field>
                <Field label={t("Signatory title", "पद")} htmlFor="slip-sign-title">
                  <Input
                    id="slip-sign-title"
                    maxLength={80}
                    value={design.signatoryTitle}
                    onChange={(e) => set({ signatoryTitle: e.target.value })}
                  />
                </Field>
              </div>
            )}
          </Section>
        </fieldset>
        <section
          aria-label={t("Live preview", "लाइव पूर्वावलोकन")}
          className="grid content-start gap-3 rounded-xl border bg-muted/40 p-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold">
              {t("Live preview", "लाइव पूर्वावलोकन")}
              {dirty && (
                <span className="text-warning ml-2 text-xs font-medium">
                  {t("Unsaved changes", "बिना सहेजे बदलाव")}
                </span>
              )}
            </span>
            <div className="flex items-center gap-2">
              <NativeSelect
                aria-label={t("Preview data", "पूर्वावलोकन डेटा")}
                value={source}
                onChange={(e) => setSource(e.target.value as "sample" | "latest")}
              >
                <option value="sample">{t("Sample data", "नमूना डेटा")}</option>
                {latest && (
                  <option value="latest">
                    {`${latest.snapshot.employeeName} · ${latest.periodStart}`}
                  </option>
                )}
              </NativeSelect>
              {latest?.status === "published" && (
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={`/payroll/${latest.id}/print?siteId=${s.siteId}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink className="size-4" />
                    {t("Saved version", "सहेजा संस्करण")}
                  </a>
                </Button>
              )}
            </div>
          </div>
          {/* No scripts run in the preview; the design is also schema-checked. */}
          <iframe
            title={t("Payslip preview", "वेतन पर्ची पूर्वावलोकन")}
            sandbox=""
            srcDoc={html}
            className="h-[min(80vh,1100px)] w-full rounded-lg border bg-white"
          />
          <p className="text-muted-foreground text-xs">
            {t(
              "Design changes restyle payslips only; amounts always come from the published payroll result. Employees see the saved design in the app under Me › Payslips.",
              "डिज़ाइन केवल रूप बदलता है; राशि हमेशा प्रकाशित वेतन परिणाम से आती है। कर्मचारी ऐप में Me › वेतन पर्ची में सहेजा डिज़ाइन देखते हैं।",
            )}
          </p>
        </section>
      </div>
    </Desk>
  );
}
