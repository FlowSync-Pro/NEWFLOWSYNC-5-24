import assert from "node:assert/strict";
import test from "node:test";
import { readiness, readinessRank } from "../src/lib/fleet-readiness.ts";

const now = new Date("2026-10-15T20:00:00Z");
const ready = {
  hasProfile: true, firstName: "Marcus", curriActivated: true, zipKnown: true, zipSet: true, vehicleType: "Cargo van", vehicleClass: "CARGO_VAN",
  telegramLinked: true, payoutsReady: true, activeUntil: new Date("2026-10-15T23:00:00Z"),
};

test("fully ready and Active: no nudge", () => {
  const r = readiness(ready, now);
  assert.equal(r.canGetOffers, true);
  assert.equal(r.activeNow, true);
  assert.equal(r.nudge, null);
  assert.ok(r.checks.every((c) => c.ok && !c.missing));
});

test("ready but Active expired: nudge to go /active", () => {
  const r = readiness({ ...ready, activeUntil: new Date("2026-10-15T19:00:00Z") }, now);
  assert.equal(r.canGetOffers, true);
  assert.equal(r.activeNow, false);
  assert.match(r.nudge, /^Hey Marcus, Nas from FlowSync\. Quick step .*\/active/);
});

test("missing Telegram + ZIP: can't get offers; numbered steps; no /active yet", () => {
  const r = readiness({ ...ready, telegramLinked: false, zipKnown: false, zipSet: false, activeUntil: null }, now);
  assert.equal(r.canGetOffers, false);
  assert.match(r.nudge, /1\) add your home ZIP on flowsyncdriver\.com\/account\/edit 2\) tap "Connect Telegram"/);
  assert.doesNotMatch(r.nudge, /\/active/);
  assert.equal(r.checks.find((c) => c.id === "zip").missing, "no home ZIP");
});

test("unrecognized ZIP and a bike", () => {
  const r = readiness({ ...ready, zipKnown: false, vehicleType: "Bike / scooter", vehicleClass: null }, now);
  assert.equal(r.checks.find((c) => c.id === "zip").missing, "home ZIP not recognized");
  assert.equal(r.checks.find((c) => c.id === "vehicle").missing, '"Bike / scooter" can\'t run Curri loads');
  assert.match(r.nudge, /update your home ZIP and your vehicle type to one Curri uses/);
});

test("only the owner's step missing: no driver nudge", () => {
  const r = readiness({ ...ready, curriActivated: false, activeUntil: null }, now);
  assert.equal(r.canGetOffers, false);
  assert.equal(r.checks.find((c) => c.id === "curri").who, "you");
  assert.equal(r.nudge, null);
});

test("payouts alone don't block offers but get a nudge", () => {
  const r = readiness({ ...ready, payoutsReady: false }, now);
  assert.equal(r.canGetOffers, true);
  assert.match(r.nudge, /set up payouts at flowsyncdriver\.com\/account\/payouts/);
});

test("sort: blocked (most missing) > ready-inactive > active", () => {
  const blockedMany = readiness({ ...ready, telegramLinked: false, zipKnown: false, curriActivated: false }, now);
  const blockedOne = readiness({ ...ready, telegramLinked: false }, now);
  const idle = readiness({ ...ready, activeUntil: null }, now);
  const act = readiness(ready, now);
  const order = [act, idle, blockedOne, blockedMany].sort((a, b) => readinessRank(b) - readinessRank(a));
  assert.deepEqual(order, [blockedMany, blockedOne, idle, act]);
});

test("blank first name", () => {
  assert.match(readiness({ ...ready, firstName: " ", telegramLinked: false }, now).nudge, /^Hey there,/);
});

test("no profile: one step, finish setup", () => {
  const r = readiness({ ...ready, hasProfile: false, firstName: "", zipKnown: false, zipSet: false, vehicleType: null, vehicleClass: null, telegramLinked: false, payoutsReady: false, curriActivated: false, activeUntil: null }, now);
  assert.match(r.nudge, /1\) finish your driver profile \(home ZIP and vehicle\) at flowsyncdriver\.com\/account\/setup 2\) tap "Connect Telegram"/);
  assert.doesNotMatch(r.nudge, /account\/edit/);
});
