import { z } from "zod";
import { paise } from "./payroll.js";
export const hrKinds = [
  "expense",
  "asset",
  "helpdesk",
  "grievance",
  "document",
  "policy",
  "announcement",
  "lifecycle",
] as const;
export type HrKind = (typeof hrKinds)[number];
export const hrModules: Record<HrKind, string> = {
  expense: "expenses",
  asset: "assets",
  helpdesk: "helpdesk",
  grievance: "grievances",
  document: "documents",
  policy: "documents",
  announcement: "announcements",
  lifecycle: "employees",
};
const text = z.string().trim().min(1).max(2000),
  date = z.iso.date();
export const hrPayloads = {
  expense: z
    .object({ amountPaise: paise, date, category: text, description: text })
    .strict(),
  asset: z
    .object({
      assetTag: z.string().trim().min(1).max(80),
      name: text,
      serialNumber: z.string().max(100),
      condition: text,
    })
    .strict(),
  helpdesk: z
    .object({ subject: text, description: text, category: text })
    .strict(),
  grievance: z.object({ subject: text, description: text }).strict(),
  document: z
    .object({
      title: text,
      category: z.enum(["general", "identity", "bank"]),
      expiresOn: date.nullable(),
      description: text,
    })
    .strict(),
  policy: z
    .object({
      title: text,
      body: z.string().min(1).max(12000),
      effectiveOn: date,
      acknowledgment: z.boolean(),
    })
    .strict(),
  announcement: z
    .object({
      title: text,
      body: z.string().min(1).max(12000),
      expiresOn: date,
      acknowledgment: z.boolean(),
    })
    .strict(),
  lifecycle: z
    .object({
      event: z.enum([
        "joining",
        "promotion",
        "transfer",
        "salary_revision",
        "probation",
        "confirmation",
        "exit",
      ]),
      effectiveOn: date,
      details: text,
      employmentId: z.uuid(),
      destinationSiteId: z.uuid().nullable(),
      designation: z.string().max(100),
      department: z.string().max(100),
      salaryStructureId: z.uuid().nullable(),
    })
    .strict(),
};
export const hrLabels: Record<HrKind, [string, string]> = {
  expense: ["Expenses", "व्यय"],
  asset: ["Assets", "संपत्ति"],
  helpdesk: ["Helpdesk", "सहायता"],
  grievance: ["Confidential grievances", "गोपनीय शिकायतें"],
  document: ["Documents", "दस्तावेज़"],
  policy: ["Policies", "नीतियाँ"],
  announcement: ["Announcements", "घोषणाएँ"],
  lifecycle: ["Employee lifecycle", "रोजगार इतिहास"],
};
