import { useSyncExternalStore } from "react";

/** A date as "YYYY-MM-DD" on this device's own calendar. */
export function deviceYmd(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const noSubscription = () => () => {};

/**
 * Today on the driver's own calendar, for a date field's default. "" while
 * the page is rendered on the server and hydrated (the server runs on UTC,
 * which is already "tomorrow" on a US evening), then this device's date —
 * so the field never pre-fills tomorrow and React sees no mismatch.
 * Client components only.
 */
export function useDeviceToday(): string {
  return useSyncExternalStore(noSubscription, () => deviceYmd(), () => "");
}
