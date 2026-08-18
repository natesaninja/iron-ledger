import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseRepRange,
  epley1RM,
  suggestNext,
  plateBreakdown,
  buildSessionSummary,
  buildMacroHandoffParams,
  detectStagnation,
  countMissedSessions,
  buildCoverInsights,
  formatLoad,
  seedSetsFromSuggestion,
} from "../js/logging.js";
import { migrateState, needsBackupReminder, STORE_VERSION } from "../js/store.js";
import { resolveCoachStage, countCompletedSessions } from "../js/coach.js";

describe("parseRepRange", () => {
  it("parses rep ranges", () => {
    assert.deepEqual(parseRepRange("5-8"), { lo: 5, hi: 8, isTime: false });
    assert.deepEqual(parseRepRange("8-12"), { lo: 8, hi: 12, isTime: false });
  });
  it("parses timed holds", () => {
    const t = parseRepRange("30-60s");
    assert.equal(t.isTime, true);
    assert.equal(t.lo, 30);
    assert.equal(t.hi, 60);
  });
});

describe("epley1RM", () => {
  it("handles singles and multi-rep", () => {
    assert.equal(epley1RM(100, 1), 100);
    assert.ok(epley1RM(100, 5) > 100);
    assert.equal(epley1RM(0, 5), 0);
  });
});

describe("suggestNext", () => {
  it("bumps load when all sets hit top of range", () => {
    const last = {
      day: "2026-08-01",
      sets: [
        { weight: 100, reps: 8, rpe: 8 },
        { weight: 100, reps: 8, rpe: 8 },
        { weight: 100, reps: 8, rpe: 8 },
      ],
    };
    const sug = suggestNext(last, "5-8");
    assert.ok(sug.sets[0].weight > 100);
    assert.match(sug.lines.join(" "), /try|Suggested/i);
  });

  it("bumps harder when RPE is easy", () => {
    const last = {
      day: "2026-08-01",
      sets: [
        { weight: 100, reps: 8, rpe: 6 },
        { weight: 100, reps: 8, rpe: 6 },
      ],
    };
    const sug = suggestNext(last, "5-8");
    assert.equal(sug.sets[0].weight, 110);
  });

  it("holds load when RPE is high", () => {
    const last = {
      day: "2026-08-01",
      sets: [
        { weight: 100, reps: 8, rpe: 9.5 },
        { weight: 100, reps: 8, rpe: 9 },
      ],
    };
    const sug = suggestNext(last, "5-8");
    assert.equal(sug.sets[0].weight, 100);
  });
});

describe("plateBreakdown", () => {
  it("loads a 225 bar", () => {
    const p = plateBreakdown(225, 45);
    assert.equal(p.total, 225);
    assert.ok(p.plates.includes(45));
  });
});

describe("buildSessionSummary", () => {
  it("counts planned vs logged hard sets", () => {
    const session = {
      day: "2026-08-01",
      label: "Full body",
      estimatedMinutes: 50,
      doseId: "med",
      exercises: [
        { exerciseId: "bb_bench", name: "Bench", sets: 3, primary: ["chest"] },
        { exerciseId: "rdl", name: "RDL", sets: 3, primary: ["hamstrings"] },
      ],
    };
    const dayLog = {
      exercises: {
        bb_bench: {
          sets: [
            { weight: 135, reps: 5, hard: true },
            { weight: 135, reps: 5, hard: true },
          ],
        },
        rdl: { sets: [], skipReason: "machine" },
      },
    };
    const s = buildSessionSummary(session, dayLog);
    assert.equal(s.plannedSets, 6);
    assert.equal(s.loggedHard, 2);
    assert.equal(s.lifts.length, 2);
    assert.equal(s.muscleHard.chest, 2);
  });
});

describe("buildMacroHandoffParams", () => {
  it("includes mode, program, msets, and bw", () => {
    const session = {
      day: "2026-08-01",
      label: "Squat + BBB",
      estimatedMinutes: 55,
      doseId: "med",
      source: "program",
      programId: "bbb_531",
      slotId: "squat_day",
      exercises: [{ exerciseId: "bb_bench", name: "Bench", sets: 3, primary: ["chest"] }],
    };
    const dayLog = {
      exercises: {
        bb_bench: {
          sets: [
            { weight: 135, reps: 5, hard: true },
            { weight: 135, reps: 5, hard: true },
          ],
        },
      },
    };
    const p = buildMacroHandoffParams(session, dayLog, {
      settings: {
        trainingMode: "program",
        activeProgramId: "bbb_531",
        bodyweightKg: 82,
      },
      auto: true,
    });
    assert.equal(p.iron, "1");
    assert.equal(p.auto, "1");
    assert.equal(p.mode, "program");
    assert.equal(p.program, "bbb_531");
    assert.equal(p.slot, "squat_day");
    assert.equal(p.sets, "2");
    assert.equal(p.bw, "82");
    assert.match(p.msets, /chest:2/);
    assert.equal(p.muscles, "chest");
    assert.equal(p.label, "Squat + BBB");
  });
});

describe("detectStagnation", () => {
  it("flags same top load for 3 sessions", () => {
    const logs = {
      "2026-08-01": {
        exercises: { bb_bench: { sets: [{ weight: 135, reps: 5, hard: true }] } },
      },
      "2026-08-03": {
        exercises: { bb_bench: { sets: [{ weight: 135, reps: 5, hard: true }] } },
      },
      "2026-08-05": {
        exercises: { bb_bench: { sets: [{ weight: 135, reps: 5, hard: true }] } },
      },
    };
    const s = detectStagnation(logs, { minSessions: 3 });
    assert.ok(s.some((x) => x.exerciseId === "bb_bench" && x.weight === 135));
  });
});

describe("countMissedSessions", () => {
  it("counts incomplete past plan days", () => {
    const plan = [
      { day: "2026-08-01" },
      { day: "2026-08-03" },
      { day: "2026-08-10" },
    ];
    const completed = { "2026-08-01": { completed: true } };
    const n = countMissedSessions(plan, completed, "2026-08-06", 14);
    assert.equal(n, 1);
  });
});

describe("buildCoverInsights", () => {
  it("returns items structure", () => {
    const r = buildCoverInsights({
      logs: {},
      completedSessions: {},
      dayDose: {},
      plan: null,
      today: "2026-08-06",
    });
    assert.ok(Array.isArray(r.items));
    assert.ok(r.items.length >= 1);
  });
});

describe("seedSetsFromSuggestion", () => {
  it("pads to planned sets", () => {
    const sets = seedSetsFromSuggestion({ sets: [{ weight: 100, reps: 5 }] }, 3);
    assert.equal(sets.length, 3);
    assert.equal(sets[2].weight, 100);
  });
});

describe("formatLoad", () => {
  it("formats BW and decimals", () => {
    assert.equal(formatLoad(0), "BW");
    assert.equal(formatLoad(100), "100");
  });
});

describe("store migrate + backup reminder", () => {
  it("migrates to STORE_VERSION", () => {
    assert.equal(STORE_VERSION, 6);
    const m = migrateState({ version: 1, logs: [], trainingDays: ["2026-08-01"] });
    assert.equal(m.version, STORE_VERSION);
    assert.ok(m.logs && !Array.isArray(m.logs));
    assert.equal(m.backupRemindDays, 7);
  });

  it("v3 → v4 fills trainingMode, equipment, trainingMaxes defaults", () => {
    const m = migrateState({
      version: 3,
      logs: {},
      trainingDays: ["2026-08-01"],
      settings: { sessionMinutes: 55, displayName: "Alex" },
      lastBackupAt: null,
      backupRemindDays: 7,
    });
    assert.equal(m.version, STORE_VERSION);
    assert.equal(m.settings.trainingMode, "med");
    assert.equal(m.settings.activeProgramId, null);
    assert.equal(m.settings.equipment, null);
    assert.equal(m.settings.equipmentPreset, null);
    assert.equal(m.settings.customTargets, null);
    assert.deepEqual(m.settings.trainingMaxes, {
      squat: null,
      bench: null,
      deadlift: null,
      press: null,
    });
    assert.equal(m.settings.bbbSupplementalPct, 0.5);
    assert.equal(m.settings.programWeekOffset, 0);
    assert.equal(m.settings.sessionMinutes, 55);
    assert.equal(m.settings.displayName, "Alex");
  });

  it("needs backup when never exported and has data", () => {
    assert.equal(
      needsBackupReminder({ trainingDays: ["2026-08-01"], lastBackupAt: null, logs: {} }),
      true
    );
    assert.equal(
      needsBackupReminder({
        trainingDays: ["2026-08-01"],
        lastBackupAt: new Date().toISOString(),
        backupRemindDays: 7,
      }),
      false
    );
  });
});

describe("coach stages", () => {
  it("unlocks by session count", () => {
    assert.equal(resolveCoachStage(0).id, "guided");
    assert.equal(resolveCoachStage(6).id, "building");
    assert.equal(resolveCoachStage(15).id, "custom");
  });

  it("counts completed", () => {
    assert.equal(
      countCompletedSessions({ a: { completed: true }, b: { completed: false } }),
      1
    );
  });
});
