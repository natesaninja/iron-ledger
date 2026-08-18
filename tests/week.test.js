import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildTrainingWeekStrip, buildProgressionSheet, weekDates } from "../js/week.js";

describe("weekDates", () => {
  it("returns Mon–Sun containing the day", () => {
    // 2026-08-12 is Wednesday
    const days = weekDates("2026-08-12");
    assert.equal(days[0], "2026-08-10"); // Mon
    assert.equal(days[6], "2026-08-16"); // Sun
    assert.equal(days.length, 7);
  });
});

describe("buildTrainingWeekStrip", () => {
  it("counts done and missed train days", () => {
    const strip = buildTrainingWeekStrip({
      trainingDays: ["2026-08-10", "2026-08-12", "2026-08-14"],
      completedSessions: {
        "2026-08-10": { completed: true },
      },
      dayDose: { "2026-08-12": "rough" },
      today: "2026-08-13",
    });
    assert.equal(strip.trainCount, 3);
    assert.equal(strip.doneCount, 1);
    assert.equal(strip.missedCount, 1); // Wed 12 missed (past, not done)
    assert.equal(strip.roughCount, 1);
    assert.match(strip.headline, /missed|done/i);
  });
});

describe("buildProgressionSheet", () => {
  it("suggests load from prior session logs", () => {
    const session = {
      day: "2026-08-14",
      exercises: [
        {
          exerciseId: "bb_bench",
          name: "Bench",
          reps: "5-8",
          sets: 3,
          role: "compound",
        },
      ],
    };
    const logs = {
      "2026-08-10": {
        exercises: {
          bb_bench: {
            sets: [
              { weight: 185, reps: 8, hard: true, rpe: 7 },
              { weight: 185, reps: 8, hard: true, rpe: 7 },
              { weight: 185, reps: 8, hard: true, rpe: 7 },
            ],
          },
        },
      },
    };
    const sheet = buildProgressionSheet(session, logs);
    assert.equal(sheet.length, 1);
    assert.equal(sheet[0].hasHistory, true);
    assert.ok(sheet[0].sets[0].weight > 185 || sheet[0].line.length > 0);
  });
});
