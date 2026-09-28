import { z } from "zod";
/** Payslip design: presentation only. Amounts always come from the immutable
 * published snapshot; a design change never alters pay. One renderer serves
 * the API print/PDF route, the mobile PDF and the HR studio preview. */
const text = (max: number) => z.string().trim().max(max);
export const payslipDesign = z
  .object({
    title: text(60).min(1),
    companyName: text(120),
    companyAddress: text(300),
    // Server re-encodes uploads to a small PNG; only that form is accepted.
    logo: z
      .string()
      .max(60000)
      .regex(/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/)
      .nullable(),
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    layout: z.enum(["classic", "modern", "compact"]),
    show: z
      .object({
        employeeCode: z.boolean(),
        designation: z.boolean(),
        department: z.boolean(),
        legalEmployer: z.boolean(),
        revision: z.boolean(),
        payments: z.boolean(),
        amountInWords: z.boolean(),
        notes: z.boolean(),
        signature: z.boolean(),
      })
      .strict(),
    signatory: text(80),
    signatoryTitle: text(80),
    footer: text(500),
  })
  .strict();
export type PayslipDesign = z.infer<typeof payslipDesign>;
export const defaultPayslipDesign: PayslipDesign = {
  title: "Salary Slip",
  companyName: "",
  companyAddress: "",
  logo: null,
  accent: "#1E6B4B",
  layout: "classic",
  show: {
    employeeCode: true,
    designation: true,
    department: true,
    legalEmployer: true,
    revision: false,
    payments: true,
    amountInWords: true,
    notes: false,
    signature: false,
  },
  signatory: "",
  signatoryTitle: "Authorised signatory",
  footer: "This is a computer-generated payslip and does not require a signature.",
};
export type PayslipData = {
  id: string;
  start: string;
  finish: string;
  revision: number;
  publishedAt: string | null;
  snapshot: {
    lines: { label: string; kind: string; calculatedPaise: string }[];
    grossPaise: string;
    deductionPaise: string;
    netPaise: string;
    employeeName: string;
    employeeCode: string;
    legalEmployer: string;
    policyVersion?: string;
    assumptions?: string;
    attendanceNote?: string;
  };
  payments: {
    kind: string;
    paise: string;
    method: string;
    reference: string;
    paidOn: string;
  }[];
  paidPaise: string;
  department?: string | null;
  jobTitle?: string | null;
  timezone?: string;
  sample?: boolean;
};
/** Indian digit grouping, exact from integer paise: "3000050" → "30,000.50". */
export function inr(paise: string | bigint) {
  let v = BigInt(paise);
  const sign = v < 0n ? "-" : "";
  if (v < 0n) v = -v;
  const r = (v / 100n).toString(),
    head = r.slice(0, -3),
    grouped = head
      ? `${head.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${r.slice(-3)}`
      : r;
  return `${sign}${grouped}.${(v % 100n).toString().padStart(2, "0")}`;
}
const ones =
  "Zero One Two Three Four Five Six Seven Eight Nine Ten Eleven Twelve Thirteen Fourteen Fifteen Sixteen Seventeen Eighteen Nineteen".split(
    " ",
  );
const tens = "  Twenty Thirty Forty Fifty Sixty Seventy Eighty Ninety".split(" ");
function words(n: bigint): string {
  if (n < 20n) return ones[Number(n)]!;
  if (n < 100n)
    return `${tens[Number(n / 10n)]}${n % 10n ? ` ${ones[Number(n % 10n)]}` : ""}`;
  for (const [unit, name] of [
    [10000000n, "Crore"],
    [100000n, "Lakh"],
    [1000n, "Thousand"],
    [100n, "Hundred"],
  ] as const)
    if (n >= unit)
      return `${words(n / unit)} ${name}${n % unit ? ` ${words(n % unit)}` : ""}`;
  return "";
}
/** "3000050" → "Rupees Thirty Thousand and Fifty Paise Only" (Indian system). */
export function amountInWords(paise: string) {
  const v = BigInt(paise),
    r = v / 100n,
    p = v % 100n;
  return `Rupees ${words(r)}${p ? ` and ${words(p)} Paise` : ""} Only`;
}
const MONTHS =
  "January February March April May June July August September October November December".split(
    " ",
  );
const day = (d: string) =>
  `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]!.slice(0, 3)} ${d.slice(0, 4)}`;
/** "September 2026" for a whole calendar month, otherwise the date range. */
export function payPeriod(start: string, finish: string) {
  const last = new Date(
    Date.UTC(Number(start.slice(0, 4)), Number(start.slice(5, 7)), 0),
  )
    .toISOString()
    .slice(0, 10);
  return start.slice(8) === "01" && finish === last
    ? `${MONTHS[Number(start.slice(5, 7)) - 1]} ${start.slice(0, 4)}`
    : `${day(start)} – ${day(finish)}`;
}
/** Hex colour blended with white; avoids CSS color-mix for older WebViews. */
const tint = (hex: string, k: number) =>
  `#${[1, 3, 5]
    .map((i) =>
      Math.round(parseInt(hex.slice(i, i + 2), 16) * k + 255 * (1 - k))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
const esc = (v: unknown) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (x) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        x
      ]!,
  );
const METHODS: Record<string, string> = {
  bank_transfer: "Bank transfer",
  upi: "UPI",
  cheque: "Cheque",
  cash: "Cash",
};
const KINDS: Record<string, string> = {
  overtime: "Overtime",
  bonus: "Bonus",
  reimbursement: "Reimbursement",
  adjustment: "Adjustment",
};
/** Complete printable HTML document. Every value is escaped; the accent and
 * logo are schema-validated, so the design cannot inject markup or CSS. */
export function renderPayslipHtml(rawDesign: unknown, d: PayslipData) {
  const g = payslipDesign.parse(rawDesign),
    s = d.snapshot,
    show = g.show,
    earnings = s.lines.filter((l) => l.kind !== "deduction"),
    deductions = s.lines.filter((l) => l.kind === "deduction"),
    rows = Math.max(earnings.length, deductions.length, 1),
    net = BigInt(s.netPaise),
    paid = BigInt(d.paidPaise),
    status =
      paid <= 0n ? "Unpaid" : paid >= net ? "Paid" : "Partially paid",
    published = d.publishedAt
      ? day(
          new Intl.DateTimeFormat("en-CA", {
            timeZone: d.timezone ?? "Asia/Kolkata",
          }).format(new Date(d.publishedAt)),
        )
      : "—";
  const detail = (label: string, value: unknown) =>
    `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`;
  const details = [
    detail("Employee name", s.employeeName),
    show.employeeCode && detail("Employee code", s.employeeCode),
    show.designation && d.jobTitle && detail("Designation", d.jobTitle),
    show.department && d.department && detail("Department", d.department),
    detail("Pay period", `${day(d.start)} – ${day(d.finish)}`),
    show.legalEmployer && detail("Employer", s.legalEmployer),
    detail("Published on", published),
    show.revision && detail("Revision", d.revision),
  ]
    .filter(Boolean)
    .join("");
  const cell = (l?: { label: string; kind: string; calculatedPaise: string }) =>
    l
      ? `<td>${esc(l.label)}${KINDS[l.kind] && !l.label.toLowerCase().includes(l.kind) ? ` <small>${KINDS[l.kind]}</small>` : ""}</td><td class="n">${inr(l.calculatedPaise)}</td>`
      : "<td></td><td></td>";
  const lines = Array.from(
    { length: rows },
    (_, i) => `<tr>${cell(earnings[i])}${cell(deductions[i])}</tr>`,
  ).join("");
  const payments =
    show.payments && d.payments.length
      ? `<h3>Payments recorded</h3><table class="pay"><thead><tr><th>Date</th><th>Method</th><th>Reference</th><th class="n">Amount (₹)</th></tr></thead><tbody>${d.payments
          .map(
            (x) =>
              `<tr><td>${day(x.paidOn)}</td><td>${esc(METHODS[x.method] ?? x.method)}${x.kind === "reversal" ? " (reversed)" : ""}</td><td>${esc(x.reference)}</td><td class="n">${x.kind === "reversal" ? "-" : ""}${inr(x.paise)}</td></tr>`,
          )
          .join("")}</tbody></table>`
      : "";
  const company = g.companyName || s.legalEmployer;
  const notes =
    show.notes && (s.assumptions || s.policyVersion)
      ? `<p class="notes">${esc(s.assumptions)}${s.policyVersion ? ` · Policy ${esc(s.policyVersion)}` : ""}</p>`
      : "";
  const signature = show.signature
    ? `<div class="sign"><div class="line"></div><b>${esc(g.signatory)}</b><span>${esc(g.signatoryTitle)}</span></div>`
    : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(g.title)} · ${esc(s.employeeName)} · ${esc(payPeriod(d.start, d.finish))}</title><style>
@page{size:A4;margin:14mm}
*{box-sizing:border-box}
:root{--a:${g.accent};--t1:${tint(g.accent, 0.1)};--t2:${tint(g.accent, 0.14)};--ink:#1c2621;--muted:#5d6b64;--line:#dfe5e1}
body{margin:0;background:#eef1ef;color:var(--ink);font:13px/1.45 "Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans Devanagari",sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.sheet{position:relative;background:#fff;max-width:190mm;margin:24px auto;padding:28px 32px;box-shadow:0 1px 3px rgba(0,0,0,.08)}
header{display:flex;gap:18px;align-items:center;justify-content:space-between;padding-bottom:16px;border-bottom:3px solid var(--a)}
.brand{display:flex;gap:14px;align-items:center;min-width:0}
.brand img{max-height:56px;max-width:160px;object-fit:contain}
.brand h1{margin:0;font-size:19px;line-height:1.2}
.brand p{margin:2px 0 0;color:var(--muted);white-space:pre-line;font-size:12px}
.doc{text-align:right;flex:none}
.doc h2{margin:0;color:var(--a);font-size:18px;letter-spacing:.02em;text-transform:uppercase}
.doc span{color:var(--muted);font-size:12px}
dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 24px;margin:18px 0}
dl div{display:flex;gap:8px;border-bottom:1px dashed var(--line);padding-bottom:4px}
dt{color:var(--muted);min-width:112px}dd{margin:0;font-weight:600;overflow-wrap:anywhere}
table{border-collapse:collapse;width:100%}
th,td{padding:8px 10px;text-align:left;border:1px solid var(--line);vertical-align:top}
th{background:var(--t1);font-size:12px;text-transform:uppercase;letter-spacing:.03em}
td small{color:var(--muted);font-size:10px;text-transform:uppercase}
.n{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
tfoot td{font-weight:700;background:#f7f9f8}
tr{break-inside:avoid}
.net{display:flex;justify-content:space-between;align-items:center;gap:16px;margin:18px 0 6px;padding:14px 18px;border:2px solid var(--a);border-radius:8px}
.net b{font-size:22px;color:var(--a)}
.net span{color:var(--muted)}
.words{margin:0 0 14px;color:var(--muted);font-style:italic}
.pill{display:inline-block;padding:1px 8px;border-radius:99px;background:var(--t2);color:var(--a);font-weight:600;font-size:11px}
h3{margin:18px 0 8px;font-size:13px}
.notes{color:var(--muted);font-size:11px}
.sign{margin:36px 0 0 auto;width:220px;text-align:center;display:flex;flex-direction:column}
.sign .line{border-top:1px solid var(--ink);margin-bottom:6px}
.sign span{color:var(--muted);font-size:12px}
footer{margin-top:24px;padding-top:10px;border-top:1px solid var(--line);color:var(--muted);font-size:11px;white-space:pre-line}
.system{color:#8a968f;font-size:10px;overflow-wrap:anywhere}
.sample{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;font-size:92px;font-weight:800;color:rgba(0,0,0,.05);transform:rotate(-24deg)}
.screen{max-width:190mm;margin:12px auto 0;color:var(--muted);font-size:12px}
body.modern header{margin:-28px -32px 0;padding:22px 32px;background:var(--a);border:0;color:#fff}
body.modern .brand p,body.modern .doc span{color:rgba(255,255,255,.82)}
body.modern .doc h2{color:#fff}
body.modern .brand img{background:#fff;border-radius:6px;padding:4px}
body.modern th,body.modern td{border-width:0 0 1px}
body.modern th{background:#fff;color:var(--a)}
body.modern .net{background:var(--a);border:0}
body.modern .net b,body.modern .net span{color:#fff}
body.modern .net .pill{background:rgba(255,255,255,.22)}
body.compact{font-size:12px}
body.compact .sheet{padding:20px 22px}
body.compact header{border-bottom-width:1px}
body.compact dl{grid-template-columns:repeat(3,minmax(0,1fr));gap:4px 16px;margin:12px 0}
body.compact dl div{flex-direction:column;gap:0;border:0}
body.compact dt{min-width:0;font-size:11px}
body.compact th,body.compact td{padding:5px 8px;border-width:0 0 1px}
body.compact th{background:none}
body.compact .net{padding:8px 12px;border-width:1px}
body.compact .net b{font-size:18px}
@media (max-width:640px){.sheet{margin:0;padding:18px}header{flex-direction:column;align-items:flex-start}.doc{text-align:left}dl,body.compact dl{grid-template-columns:1fr}body.modern header{margin:-18px -18px 0;padding:18px}}
@media print{body{background:#fff}.sheet{margin:0;max-width:none;box-shadow:none;padding:0}body.modern header{margin:0 0 0;border-radius:6px}.screen{display:none}}
</style></head><body class="${g.layout}">${d.sample ? "" : `<p class="screen">Use your browser's Print to save this payslip as PDF.</p>`}<main class="sheet">${d.sample ? '<div class="sample">SAMPLE</div>' : ""}
<header><div class="brand">${g.logo ? `<img src="${g.logo}" alt="">` : ""}<div><h1>${esc(company)}</h1>${g.companyAddress ? `<p>${esc(g.companyAddress)}</p>` : ""}</div></div><div class="doc"><h2>${esc(g.title)}</h2><span>${esc(payPeriod(d.start, d.finish))}</span></div></header>
<dl>${details}</dl>
<table><thead><tr><th>Earnings</th><th class="n">Amount (₹)</th><th>Deductions</th><th class="n">Amount (₹)</th></tr></thead><tbody>${lines}</tbody>
<tfoot><tr><td>Gross earnings</td><td class="n">${inr(s.grossPaise)}</td><td>Total deductions</td><td class="n">${inr(s.deductionPaise)}</td></tr></tfoot></table>
<div class="net"><span>Net pay <span class="pill">${status}</span></span><b>₹${inr(s.netPaise)}</b></div>
${show.amountInWords ? `<p class="words">${amountInWords(s.netPaise)}</p>` : ""}${payments}${notes}${signature}
<footer>${esc(g.footer)}<br><span class="system">Ref ${esc(d.id)} · Payments are recorded by the payroll team after they are made; this system does not transfer money. Saved copies cannot be remotely revoked.</span></footer></main></body></html>`;
}
