/** Site dashboard: counts, plus short attendance follow-up lists whose names
 * appear only for employees the viewer may see in the directory. No amounts.
 * A section is absent when the viewer lacks that module's view permission. */
export type DashboardSnapshot = {
  workDate: string;
  timezone: string;
  generatedAt: string;
  me: {
    unread: number | null;
    dwrStatus: string | null;
    onDuty: boolean | null;
  };
  people?: {
    headcount: number;
    joining: number;
    departments: { name: string; count: number }[];
  };
  attendance?: {
    rostered: number;
    checkedIn: number;
    onDuty: number;
    pendingVerification: number;
    trend: { day: string; rostered: number; checkedIn: number }[];
    /** Rostered today without a check-in (first 8 listed). */
    notCheckedIn: {
      count: number;
      people: { name: string | null; startsAt: string; endsAt: string }[];
    };
    /** Open sessions past the policy's maximum length (first 5 listed). */
    exitNotRecorded: {
      count: number;
      people: { name: string | null; openedAt: string }[];
    };
  };
  /** Duty-time location sharing: location evidence, not attendance. */
  location?: { now: number; today: number };
  leave?: {
    onLeave: number;
    pending: number;
    upcoming: number;
    byType: { name: string; units: number }[];
  };
  tasks?: {
    open: { status: string; count: number }[];
    overdue: number;
    dueToday: number;
  };
  dwr?: {
    today: { status: string; count: number }[];
    awaitingReview: number;
    trend: { day: string; filed: number }[];
  };
  hr?: {
    expensesPending?: number;
    helpdeskOpen?: number;
    documentsExpiring?: number;
    assetsAssigned?: number;
  };
  payroll?: {
    periodStart: string;
    periodEnd: string;
    statuses: { status: string; count: number }[];
  } | null;
  approvals: { kind: string; count: number }[];
  /** True when a kind hit the queue's 100-row cap. */
  approvalsCapped: boolean;
};
