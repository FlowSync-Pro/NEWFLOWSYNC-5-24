import assert from "node:assert/strict";
import test from "node:test";
import {
  ACCESSORIES_BY_TYPE,
  DIRECTORY_VEHICLE_TYPES,
  VEHICLE_TYPES,
  accessoriesFor,
  isValidVin,
  matchesVehicleFilter,
  normalizeVin,
  pruneAccessories,
  vehicleToShow,
} from "../src/lib/vehicles.ts";

const PPE = "PPE (steel toe, hard hat and safety vest)";

test("accessory lists are exactly the owner's", () => {
  const van = ["2 point rack", "3 point rack", "trailer", "dolly", "tie-downs", "moving blankets", PPE];
  assert.deepEqual([...accessoriesFor("Cargo van")], van);
  assert.deepEqual([...accessoriesFor("Pickup truck")], van);
  assert.deepEqual([...accessoriesFor("Sprinter van")], van);
  assert.deepEqual([...accessoriesFor("Box truck")], ["lift-gate", "pallet jack", PPE, "tie-downs", "moving blankets", "load locks"]);
  for (const t of ["Sedan", "Minivan", "SUV", "Bike / scooter", "", undefined, null]) assert.deepEqual([...accessoriesFor(t)], []);
  assert.deepEqual(Object.keys(ACCESSORIES_BY_TYPE).sort(), ["Box truck", "Cargo van", "Pickup truck", "Sprinter van"]);
});

test("every directory button is a real profile option, and bikes have no button", () => {
  for (const t of DIRECTORY_VEHICLE_TYPES) assert.ok(VEHICLE_TYPES.includes(t), t);
  assert.ok(!DIRECTORY_VEHICLE_TYPES.includes("Bike / scooter"));
  assert.equal(DIRECTORY_VEHICLE_TYPES.length, 7);
});

test("switching vehicle drops accessories that aren't on the new list", () => {
  const picked = ["lift-gate", "tie-downs", "dolly", PPE];
  assert.deepEqual(pruneAccessories("Box truck", picked), ["lift-gate", PPE, "tie-downs"]); // list order, lift-gate kept, dolly dropped
  assert.deepEqual(pruneAccessories("Cargo van", picked), ["dolly", "tie-downs", PPE]);
  assert.deepEqual(pruneAccessories("Sedan", picked), []);
  assert.deepEqual(pruneAccessories("SUV", picked), []);
  assert.deepEqual(pruneAccessories("Minivan", picked), []);
  assert.deepEqual(pruneAccessories("", picked), []);
  assert.deepEqual(pruneAccessories("Box truck", ["lift-gate", "lift-gate", "not a thing"]), ["lift-gate"]);
});

test("VIN check", () => {
  assert.equal(normalizeVin(" 1hgcm82633a004352 "), "1HGCM82633A004352");
  assert.equal(normalizeVin("1HG-CM8 2633A004352"), "1HGCM82633A004352");
  assert.ok(isValidVin("1HGCM82633A004352"));
  assert.ok(!isValidVin("1HGCM82633A00435")); // 16
  assert.ok(!isValidVin("1HGCM82633A0043521")); // 18
  assert.ok(!isValidVin("1HGCM82633A00435O")); // letter O
  assert.ok(!isValidVin(""));
});

test("directory filter: All shows everyone, a type shows exact matches on any vehicle", () => {
  const none = [];
  const sedan = [{ type: "Sedan", accessories: [] }];
  const vanThenBox = [
    { type: "Cargo van", accessories: ["dolly"] },
    { type: "Box truck", accessories: ["lift-gate", "pallet jack"] },
  ];
  assert.ok(matchesVehicleFilter(none, "all", []));
  assert.ok(matchesVehicleFilter(sedan, "all", []));
  assert.ok(!matchesVehicleFilter(none, "Sedan", []));
  assert.ok(matchesVehicleFilter(sedan, "Sedan", []));
  assert.ok(!matchesVehicleFilter(sedan, "SUV", []));
  // second vehicle counts
  assert.ok(matchesVehicleFilter(vanThenBox, "Box truck", []));
  assert.ok(matchesVehicleFilter(vanThenBox, "Box truck", ["lift-gate"]));
  assert.ok(matchesVehicleFilter(vanThenBox, "Box truck", ["lift-gate", "pallet jack"]));
  assert.ok(!matchesVehicleFilter(vanThenBox, "Box truck", ["load locks"]));
  // accessories are per vehicle — the van's dolly doesn't make the box truck match
  assert.ok(!matchesVehicleFilter(vanThenBox, "Box truck", ["dolly"]));
  assert.ok(matchesVehicleFilter(vanThenBox, "Cargo van", ["dolly"]));
  // never classified from make/model text: type is compared exactly
  assert.ok(!matchesVehicleFilter([{ type: "Sprinter van", accessories: [] }], "Cargo van", []));
});

test("the card shows the matching vehicle, else the main one", () => {
  const vanThenBox = [
    { type: "Cargo van", accessories: ["dolly"] },
    { type: "Box truck", accessories: ["lift-gate"] },
  ];
  assert.equal(vehicleToShow(vanThenBox, "all")?.type, "Cargo van");
  assert.equal(vehicleToShow(vanThenBox, "Box truck")?.type, "Box truck");
  assert.equal(vehicleToShow(vanThenBox, "SUV")?.type, "Cargo van");
  assert.equal(vehicleToShow([], "all"), undefined);
});
