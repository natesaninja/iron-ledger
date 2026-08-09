import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildPlan, substitutesFor } from "../js/planner.js";
import { DEFAULT_SETTINGS, EXERCISES } from "../js/data.js";
import { applyEquipmentPreset, isExerciseAvailable } from "../js/equipment.js";
import { rankSubstitutes } from "../js/logging.js";

const EX_MAP = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));

describe("buildPlan equipment", () => {
  it("never schedules cable lifts for db_only gym", () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      equipment: applyEquipmentPreset("db_only"),
      excludedExercises: [],
      preferredExercises: [],
      splitPreference: "full_body",
      sessionMinutes: 55,
    };
    const plan = buildPlan(["2026-08-04", "2026-08-06", "2026-08-08"], settings);
    const ids = plan.sessions.flatMap((s) => s.exercises.map((e) => e.exerciseId || e.id));
    // cable_fly etc. must not appear
    const banned = new Set(["cable_fly", "face_pull", "seated_cable_row", "lat_pulldown", "leg_press"]);
    for (const id of ids) assert.equal(banned.has(id), false, id);
    // every scheduled lift must be available under the equipment profile
    for (const id of ids) {
      const ex = EX_MAP[id];
      assert.ok(ex, `unknown exercise ${id}`);
      assert.equal(isExerciseAvailable(ex, settings.equipment), true, id);
    }
    assert.ok(ids.length > 0, "plan should schedule exercises");
  });

  it("null equipment still allows cable/machine lifts (legacy)", () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      equipment: null,
      excludedExercises: [],
      preferredExercises: [],
      splitPreference: "full_body",
      sessionMinutes: 55,
    };
    const plan = buildPlan(["2026-08-04", "2026-08-06", "2026-08-08"], settings);
    const ids = plan.sessions.flatMap((s) => s.exercises.map((e) => e.exerciseId || e.id));
    assert.ok(ids.length > 0);
  });
});

describe("substitutes equipment", () => {
  it("substitutesFor omits cable/machine when db_only", () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      equipment: applyEquipmentPreset("db_only"),
      excludedExercises: [],
      preferredExercises: [],
    };
    const subs = substitutesFor("incline_db_press", settings);
    for (const e of subs) {
      assert.equal(isExerciseAvailable(e, settings.equipment), true, e.id);
    }
  });

  it("rankSubstitutes omits cable/machine when db_only", () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      equipment: applyEquipmentPreset("db_only"),
      excludedExercises: [],
      preferredExercises: [],
    };
    const subs = rankSubstitutes("incline_db_press", settings);
    for (const e of subs) {
      assert.equal(isExerciseAvailable(e, settings.equipment), true, e.id);
    }
  });

  it("rankSubstitutes unrestricted when equipment null", () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      equipment: null,
      excludedExercises: [],
      preferredExercises: [],
    };
    const withNull = rankSubstitutes("bb_bench", settings);
    const withFull = rankSubstitutes("bb_bench", {
      ...settings,
      equipment: applyEquipmentPreset("gym"),
    });
    // null and full gym should both return substitutes (same unrestricted path for gym)
    assert.ok(withNull.length > 0);
    assert.ok(withFull.length > 0);
  });
});
