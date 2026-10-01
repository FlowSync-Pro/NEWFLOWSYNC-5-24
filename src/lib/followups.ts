import { sendMarketing } from "@/lib/marketing";

/**
 * The daily follow-up sequence (run by /api/cron/followups). Each entry picks
 * who should get it today and builds the email; sendMarketing() decides
 * whether they may actually receive it.
 *
 * EMPTY ON PURPOSE: fix 7 is only the groundwork. Each follow-up email (M1–M4
 * in the plan) is added here separately, after the owner approves its copy.
 */
export interface Followup {
  kind: string;
  excludeFleet?: boolean;
  /** User ids due for this follow-up today. */
  candidates(): Promise<string[]>;
  /** Subject + content for one user, or null to skip them. */
  build(userId: string): Promise<{ subject: string; heading: string; body: string } | null>;
}

export const FOLLOWUPS: Followup[] = [];

export async function runFollowups(): Promise<{ kind: string; sent: number; skipped: number }[]> {
  const report = [];
  for (const f of FOLLOWUPS) {
    let sent = 0;
    let skipped = 0;
    for (const userId of await f.candidates()) {
      const email = await f.build(userId);
      if (!email) {
        skipped++;
        continue;
      }
      const r = await sendMarketing({ userId, kind: f.kind, excludeFleet: f.excludeFleet, ...email });
      if (r.sent) sent++;
      else skipped++;
    }
    report.push({ kind: f.kind, sent, skipped });
  }
  return report;
}
