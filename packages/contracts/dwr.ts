import { z } from "zod";
const items = z.array(z.string().trim().min(1).max(600)).max(30);
const stated = z
  .object({
    pending: z.enum(["not_stated", "none", "reported"]),
    blockers: z.enum(["not_stated", "none", "reported"]),
    nextDayPlan: z.enum(["not_stated", "none", "reported"]),
  })
  .strict();
const sections = {
  completed: items,
  pending: items,
  blockers: items,
  nextDayPlan: items,
  uncertainties: items,
  stated,
};
// Empty arrays never silently mean "none": stated must agree with the items.
const statedAgrees = (
  v: z.infer<z.ZodObject<typeof sections>>,
  ctx: z.core.$RefinementCtx,
) => {
  for (const key of ["pending", "blockers", "nextDayPlan"] as const)
    if ((v.stated[key] === "reported") !== v[key].length > 0)
      ctx.addIssue({
        code: "custom",
        path: [key],
        message: "Reported items and stated state must agree",
      });
};
export const dwrContent = z
  .object({
    ...sections,
    sourceTranscript: z.string().max(12000),
    status: z.literal("draft"),
  })
  .strict()
  .superRefine(statedAgrees);
export type DwrContent = z.infer<typeof dwrContent>;
/** What the DWR agent model may return. Transcript, status, identity, site
 * and date are server-owned and never taken from model output. */
export const dwrAgentDraft = z
  .object(sections)
  .strict()
  .superRefine(statedAgrees);
export type DwrAgentDraft = z.infer<typeof dwrAgentDraft>;
export const emptyDwr = (): DwrContent => ({
  completed: [],
  pending: [],
  blockers: [],
  nextDayPlan: [],
  uncertainties: [],
  sourceTranscript: "",
  status: "draft",
  stated: {
    pending: "not_stated",
    blockers: "not_stated",
    nextDayPlan: "not_stated",
  },
});
export const dwrSettings = z
  .object({
    deadline: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    deadlineDayOffset: z.number().int().min(0).max(1),
    reminderMinutes: z.number().int().min(0).max(1440),
    amendments: z.boolean(),
    offlineDrafts: z.boolean(),
    expectedVersion: z.number().int().min(0),
    reason: z.string().trim().min(8).max(500),
  })
  .strict();
// DWR chat: shared limits for clients and the API.
export const DWR_MESSAGE_MAX = 2000;
export const dwrMessageBody = z.string().trim().min(1).max(DWR_MESSAGE_MAX);
export const dwrGroupName = z.string().trim().min(2).max(80);
export const dwrGroupDescription = z.string().trim().max(500);
