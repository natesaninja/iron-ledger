import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isExerciseAvailable,
  filterExercises,
  applyEquipmentPreset,
  fullEquipment,
} from "../js/equipment.js";

describe("isExerciseAvailable", () => {
  it("allows all when equipment is null", () => {
    assert.equal(isExerciseAvailable({ requires: ["cables"] }, null), true);
  });
  it("requires every flag", () => {
    const eq = { ...fullEquipment(), cables: false, machines: false };
    assert.equal(isExerciseAvailable({ requires: ["cables"] }, eq), false);
    assert.equal(isExerciseAvailable({ requires: ["dumbbells"] }, eq), true);
    assert.equal(isExerciseAvailable({ requires: [] }, eq), true);
    assert.equal(isExerciseAvailable({}, eq), true);
  });
});

describe("filterExercises", () => {
  it("drops cable-only when no cables", () => {
    const list = [
      { id: "a", requires: ["cables"] },
      { id: "b", requires: ["dumbbells"] },
    ];
    const eq = applyEquipmentPreset("db_only");
    const ids = filterExercises(list, eq).map((e) => e.id);
    assert.deepEqual(ids, ["b"]);
  });
});

describe("presets", () => {
  it("home_barbell has barbell and rack", () => {
    const eq = applyEquipmentPreset("home_barbell");
    assert.equal(eq.barbell, true);
    assert.equal(eq.rack, true);
    assert.equal(eq.machines, false);
  });
});
