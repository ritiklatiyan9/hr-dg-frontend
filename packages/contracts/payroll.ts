import { z } from "zod";
export const paise = z.string().regex(/^(0|[1-9][0-9]{0,13})$/);
export const salaryLine = z
  .object({
    code: z.string().regex(/^[A-Z][A-Z0-9_]{0,30}$/),
    label: z.string().trim().min(1).max(100),
    kind: z.enum([
      "earning",
      "deduction",
      "overtime",
      "bonus",
      "reimbursement",
      "adjustment",
    ]),
    paise,
    numerator: z.number().int().min(0).max(100000).default(1),
    denominator: z.number().int().min(1).max(100000).default(1),
  })
  .strict();
export const calculationInput = z
  .object({
    lines: z.array(salaryLine).min(1).max(50),
    rounding: z.literal("half_up_line"),
    accountantReview: z.literal(true),
    policyVersion: z.string().trim().min(1).max(100),
    assumptions: z.string().trim().min(8).max(2000),
  })
  .strict();
export type CalculationInput = z.infer<typeof calculationInput>;
export function calculatePayroll(raw: unknown) {
  const input = calculationInput.parse(raw);
  if (new Set(input.lines.map((x) => x.code)).size !== input.lines.length)
    throw new Error("Duplicate component code");
  let gross = 0n,
    deductions = 0n;
  const lines = input.lines.map((l) => {
    const n = BigInt(l.paise) * BigInt(l.numerator),
      d = BigInt(l.denominator);
    const amount = (n * 2n + d) / (2n * d);
    if (l.kind === "deduction") deductions += amount;
    else gross += amount;
    return { ...l, calculatedPaise: amount.toString() };
  });
  if (deductions > gross) throw new Error("Deductions exceed earnings");
  if (gross > 99999999999999n)
    throw new Error("Result exceeds supported amount");
  return {
    ...input,
    engineVersion: "paise-rational-v1",
    lines,
    grossPaise: gross.toString(),
    deductionPaise: deductions.toString(),
    netPaise: (gross - deductions).toString(),
  };
}
export function money(value: string) {
  const v = BigInt(value);
  return `${v / 100n}.${(v % 100n).toString().padStart(2, "0")}`;
}
/** Exact rupee text ("30,000.5") to integer paise ("3000050"); never via Number. */
export function rupeesToPaise(value: string) {
  const m = /^(\d{1,12})(?:\.(\d{1,2}))?$/.exec(
    value.trim().replaceAll(",", ""),
  );
  if (!m) throw new Error("Enter rupees with at most two decimal places");
  return (
    BigInt(m[1]!) * 100n +
    BigInt((m[2] ?? "").padEnd(2, "0"))
  ).toString();
}
export const paymentMethods = [
  "bank_transfer",
  "upi",
  "cheque",
  "cash",
] as const;
// A deliberately narrow, documented CSV format. Quoted labels supported; no inferred columns, dates, amounts or formulas.
export function importPayrollCsv(text: string) {
  if (text.length > 32000) throw new Error("CSV exceeds 32 KiB");
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false,
    closed = false;
  for (let i = 0; i <= text.length; i++) {
    const c = text[i] ?? "\n";
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else cell += c;
      continue;
    }
    if (c === '"') {
      if (cell || closed) throw new Error("Malformed CSV");
      quoted = true;
    } else if (c === "," || c === "\n") {
      row.push(cell.replace(/\r$/, ""));
      cell = "";
      closed = false;
      if (c === "\n") {
        if (row.some(Boolean)) rows.push(row);
        row = [];
      }
    } else {
      if (closed && c !== "\r") throw new Error("Malformed CSV");
      cell += c;
    }
  }
  if (quoted) throw new Error("Unterminated CSV quote");
  if (rows.shift()?.join(",") !== "code,label,kind,paise,numerator,denominator")
    throw new Error("Expected code,label,kind,paise,numerator,denominator");
  if (!rows.length || rows.length > 50)
    throw new Error("CSV requires 1–50 components");
  return rows.map((r, i) => {
    if (r.length !== 6 || !/^\d+$/.test(r[4]!) || !/^\d+$/.test(r[5]!))
      throw new Error(`Invalid CSV row ${i + 2}`);
    return salaryLine.parse({
      code: r[0],
      label: r[1],
      kind: r[2],
      paise: r[3],
      numerator: Number(r[4]),
      denominator: Number(r[5]),
    });
  });
}
export function csvCell(v: unknown) {
  let s = String(v ?? "");
  if (/^[\s]*[=+@\-\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}
