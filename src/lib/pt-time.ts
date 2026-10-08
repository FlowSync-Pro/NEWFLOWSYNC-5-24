// Dispatch times are shown in Pacific time with a "PT" label everywhere —
// Telegram, the admin board, the fleet page — because the server runs in UTC
// and a driver's browser may not. Plain functions: safe in client components.

export const PT_ZONE = "America/Los_Angeles";

const DATE_TIME: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" };

/** "Oct 8, 2:41 PM PT" (or any other format via opts). */
export function ptTime(d: Date | string, opts: Intl.DateTimeFormatOptions = DATE_TIME): string {
  return `${new Date(d).toLocaleString("en-US", { ...opts, timeZone: PT_ZONE })} PT`;
}

/** "2:41 PM PT" */
export const ptClock = (d: Date | string) => ptTime(d, { hour: "numeric", minute: "2-digit" });

/** The instant's wall-clock parts in Pacific time. */
function ptParts(d: Date): { y: number; mo: number; d: number; h: number; mi: number } {
  const p: Record<string, string> = {};
  for (const x of new Intl.DateTimeFormat("en-US", { timeZone: PT_ZONE, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(d)) p[x.type] = x.value;
  return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour % 24, mi: +p.minute };
}

/** "2026-10-08" — the calendar day in Pacific time (a 6 PM PT pickup is still "today", not tomorrow UTC). */
export function ptDate(d: Date | string): string {
  const p = ptParts(new Date(d));
  return `${p.y}-${String(p.mo).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

/** "2026-10-08T14:41" — the value a datetime-local input shows for this instant, in Pacific time. */
export function ptWallClock(d: Date | string): string {
  const p = ptParts(new Date(d));
  return `${ptDate(d)}T${String(p.h).padStart(2, "0")}:${String(p.mi).padStart(2, "0")}`;
}

/**
 * The instant a datetime-local value means when read as Pacific time
 * ("2026-10-08T14:41" → 21:41 UTC in October). Null when malformed. On the
 * spring-forward night a wall clock that doesn't exist (2:30 AM) lands one
 * hour EARLY — early beats late for a pickup; in the fall-back hour it picks
 * one of the two real instants.
 */
export function fromPtWallClock(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const wanted = Date.UTC(y, mo - 1, d, h, mi);
  let t = wanted;
  for (let i = 0; i < 2; i++) {
    const p = ptParts(new Date(t));
    t += wanted - Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi);
  }
  const out = new Date(t);
  return Number.isNaN(out.getTime()) ? null : out;
}
