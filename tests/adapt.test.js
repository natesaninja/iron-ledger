import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyFeelAdapt,
  feelFromRpe,
  setBounds,
  syncLogSetsToPlan,
  FEEL,
} from "../js/adapt.js";

function sampleSession() {
  return {
    day: "2026-08-16",
    label: "Full Body",
    estimatedMinutes: 55,
    exercises: [
      {
        exerciseId: "bb_bench",
        name: "Bench",
        role: "compound",
        sets: 3,
        reps: "5-8",
        primary: ["chest"],
        secondary: ["triceps"],
      },
      {
        exerciseId: "cable_fly",
        name: "Cable Fly",
        role: "isolation",
        sets: 2,
        reps: "10-15",
        primary: ["chest"],
        secondary: [],
      },
      {
        exerciseId: "lat_pulldown",
        name: "Lat Pulldown",
        role: "compound",
        sets: 3,
        reps: "8-12",
        primary: ["lats"],
        secondary: ["biceps"],
      },
    ],
  };
}

describe("setBounds", () => {
  it("compounds have higher floor", () => {
    assert.equal(setBounds("compound").min, 2);
    assert.equal(setBounds("isolation").min, 1);
  });
});

describe("feelFromRpe", () => {
  it("maps bands", () => {
    assert.equal(feelFromRpe(6.5), FEEL.easy);
    assert.equal(feelFromRpe(8), FEEL.right);
    assert.equal(feelFromRpe(9.5), FEEL.hard);
    assert.equal(feelFromRpe(null), null);
  });
});

describe("applyFeelAdapt", () => {
  it("easy adds a set on the current lift", () => {
    const { session, delta, message } = applyFeelAdapt(sampleSession(), 0, FEEL.easy);
    assert.equal(delta, 1);
    assert.equal(session.exercises[0].sets, 4);
    assert.match(message, /easy/i);
  });

  it("hard drops a set and can rebalance to later isolation", () => {
    const { session, delta, rebalanced } = applyFeelAdapt(sampleSession(), 0, FEEL.hard);
    assert.equal(delta, -1);
    assert.equal(session.exercises[0].sets, 2);
    // fly should pick up volume (same primary chest)
    assert.ok(rebalanced.some((r) => r.name === "Cable Fly" && r.delta === 1));
    assert.equal(session.exercises[1].sets, 3);
  });

  it("right leaves sets unchanged", () => {
    const { session, delta } = applyFeelAdapt(sampleSession(), 0, FEEL.right);
    assert.equal(delta, 0);
    assert.equal(session.exercises[0].sets, 3);
  });

  it("does not go below compound min", () => {
    const s = sampleSession();
    s.exercises[0].sets = 2;
    const { session, delta } = applyFeelAdapt(s, 0, FEEL.hard);
    assert.equal(session.exercises[0].sets, 2);
    assert.equal(delta, 0);
  });

  it("easy at max banks on later shared muscle", () => {
    const s = sampleSession();
    s.exercises[0].sets = 5;
    const { session, delta, rebalanced } = applyFeelAdapt(s, 0, FEEL.easy);
    assert.equal(delta, 0);
    assert.equal(session.exercises[0].sets, 5);
    assert.ok(rebalanced.some((r) => r.name === "Cable Fly"));
  });
});

describe("syncLogSetsToPlan", () => {
  it("pads without deleting existing", () => {
    const log = [{ weight: 135, reps: 5, hard: true, rpe: 8 }];
    const next = syncLogSetsToPlan(log, 3);
    assert.equal(next.length, 3);
    assert.equal(next[0].weight, 135);
    assert.equal(next[1].weight, 135);
  });
});
