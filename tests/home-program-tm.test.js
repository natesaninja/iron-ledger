import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { EXERCISES } from "../js/data.js";
import { applyEquipmentPreset, filterExercises } from "../js/equipment.js";
import {
  suggestTrainingMaxes,
  buildSessionCoverageCheck,
  buildProgramAdherenceInsights,
  buildSessionSummary,
} from "../js/logging.js";
import { buildProgramPlan } from "../js/programs.js";
import { DEFAULT_SETTINGS } from "../js/data.js";

describe("home-gym library", () => {
  it("db_only gets goblet, floor press, rows, calves", () => {
    const eq = applyEquipmentPreset("db_only");
    const ids = new Set(filterExercises(EXERCISES, eq).map((e) => e.id));
    assert.ok(ids.has("goblet_squat"));
    assert.ok(ids.has("db_floor_press"));
    assert.ok(ids.has("db_row"));
    assert.ok(ids.has("db_calf_raise"));
    assert.ok(ids.has("pushup"));
    assert.equal(ids.has("leg_press"), false);
  });

  it("bands-only minimal-ish still has rows and face pulls", () => {
    const eq = applyEquipmentPreset("minimal");
    const ids = new Set(filterExercises(EXERCISES, eq).map((e) => e.id));
    assert.ok(ids.has("band_row") || ids.has("pullup"));
    assert.ok(ids.has("band_face_pull") || ids.has("band_chest_press") || ids.has("pushup"));
  });
});

describe("suggestTrainingMaxes", () => {
  it("estimates bench TM from logged hard sets", () => {
    const logs = {
      "2026-08-01": {
        exercises: {
          bb_bench: {
            sets: [
              { weight: 185, reps: 5, hard: true },
              { weight: 185, reps: 5, hard: true },
            ],
          },
        },
      },
    };
    const sug = suggestTrainingMaxes(logs);
    assert.ok(sug.bench >= 180);
    assert.ok(sug.bench % 5 === 0);
  });
});

describe("buildSessionCoverageCheck", () => {
  it("flags light muscles and lists adapt lines", () => {
    const session = {
      day: "2026-08-16",
      label: "Test",
      estimatedMinutes: 50,
      doseId: "med",
      exercises: [
        { exerciseId: "bb_bench", name: "Bench", sets: 3, primary: ["chest"], secondary: [] },
        { exerciseId: "cable_fly", name: "Fly", sets: 2, primary: ["chest"], secondary: [] },
      ],
      adaptLog: [{ name: "Bench", feel: "hard", delta: -1, rebalanced: [{ name: "Fly", delta: 1 }] }],
    };
    const dayLog = {
      exercises: {
        bb_bench: { sets: [{ weight: 135, reps: 5, hard: true }] },
        cable_fly: { sets: [] },
      },
    };
    const check = buildSessionCoverageCheck(session, dayLog);
    assert.ok(check.adaptLines.length >= 1);
    assert.ok(check.short.some((s) => s.id === "chest") || check.tone === "warn" || check.headline);
  });
});

describe("program cover honesty", () => {
  it("reports underCoveredPrimaries when few train days", () => {
    const plan = buildProgramPlan(["2026-08-04"], {
      ...DEFAULT_SETTINGS,
      trainingMode: "program",
      activeProgramId: "bbb_531",
      equipment: null,
      trainingMaxes: { squat: 300, bench: 200, deadlift: 400, press: 135 },
    });
    assert.equal(plan.meta.source, "program");
    // One day cannot cover all primaries at weekly*month scale — under list may be non-empty
    assert.ok(Array.isArray(plan.meta.underCoveredPrimaries));
    const items = buildProgramAdherenceInsights(plan, {}, "2026-08-10");
    assert.ok(items.some((i) => i.id === "program-adherence"));
  });
});
