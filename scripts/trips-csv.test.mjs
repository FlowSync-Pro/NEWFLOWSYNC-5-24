import assert from "node:assert/strict";
import test from "node:test";
import { csvText, exportRange, tripDay, tripsToCsv } from "../src/lib/trips-csv.ts";

const trip = (over = {}) => ({
  date: new Date(Date.UTC(2026, 2, 15)), pickupAddress: "Rialto, CA", dropoffAddress: "Santa Ana, CA",
  earningsCents: 30000, paidMiles: 40, deadheadMiles: 10.25, fuelCents: 4500, tollsCents: 0, otherExpensesCents: 500,
  durationMinutes: 95, notes: null, ...over,
});

test("a picked date stays the day the driver entered", () => {
  assert.equal(tripDay(new Date(Date.UTC(2026, 2, 15))), "2026-03-15");
});

test("rows, money and the TOTAL line", () => {
  const csv = tripsToCsv([trip(), trip({ date: new Date(Date.UTC(2026, 0, 2)), earningsCents: 10000, fuelCents: 12000, otherExpensesCents: 0 })]);
  assert.ok(csv.startsWith("﻿Date,Pickup,Dropoff,Earnings ($)"));
  const lines = csv.trim().split("\r\n");
  assert.equal(lines.length, 4);
  assert.match(lines[1], /^2026-01-02,/); // oldest first
  assert.match(lines[1], /,100\.00,.*,120\.00,-20\.00,95,$/); // a losing trip shows negative profit
  assert.equal(lines[2], "2026-03-15,\"Rialto, CA\",\"Santa Ana, CA\",300.00,40,10.3,50.3,45.00,0.00,5.00,50.00,250.00,95,");
  assert.equal(lines[3], "TOTAL,2 trips,,400.00,80,20.5,100.5,165.00,0.00,5.00,170.00,230.00,190,");
});

test("typed text can't become a formula and quotes/newlines survive", () => {
  assert.equal(csvText("=HYPERLINK(\"x\")"), "\"'=HYPERLINK(\"\"x\"\")\"");
  assert.equal(csvText("+1 555"), "'+1 555");
  assert.equal(csvText("-cash"), "'-cash");
  assert.equal(csvText("@sum"), "'@sum");
  assert.equal(csvText("line1\nline2"), "\"line1\nline2\"");
  assert.equal(csvText(null), "");
});

test("no trips still gives a header and a zero TOTAL", () => {
  const lines = tripsToCsv([]).trim().split("\r\n");
  assert.equal(lines.length, 2);
  assert.equal(lines[1], "TOTAL,0 trips,,0.00,0,0,0,0.00,0.00,0.00,0.00,0.00,0,");
});

test("year range", () => {
  const now = new Date(Date.UTC(2026, 9, 15));
  assert.deepEqual(exportRange("2026", now), { from: new Date(Date.UTC(2026, 0, 1)), to: new Date(Date.UTC(2027, 0, 1)), label: "2026" });
  assert.deepEqual(exportRange(null, now), { from: null, to: null, label: "all" });
  assert.deepEqual(exportRange("all", now), { from: null, to: null, label: "all" });
  assert.ok("error" in exportRange("20x6", now));
  assert.ok("error" in exportRange("1999", now));
  assert.ok("error" in exportRange("2030", now));
});
