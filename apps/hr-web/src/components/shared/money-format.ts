import { money as exactMoney } from "../../../../../packages/contracts/payroll.js";
/** Exact paise formatting: no conversion to floating-point numbers. */
export function formatMoney(paise: string) {
  const amount = BigInt(paise),
    negative = amount < 0n;
  return formatDecimalMoney(
    `${negative ? "-" : ""}${exactMoney((negative ? -amount : amount).toString())}`,
  );
}
/** Format an already-authoritative decimal amount without rounding or Number(). */
export function formatDecimalMoney(amount: string) {
  if (!/^-?\d+(?:\.\d+)?$/.test(amount)) return "—";
  const [whole = "", fraction = "00"] = amount.split(".");
  const negative = whole.startsWith("-");
  const digits = negative ? whole.slice(1) : whole;
  const tail = digits.slice(-3),
    head = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}${head ? head + "," : ""}${tail}.${fraction}`;
}
