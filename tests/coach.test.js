import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolveCoachStage,
  buildLogCoachCue,
  sessionPushPullBias,
} from "../js/coach.js";

const pushSession = {
  label: "Push",
  exercises: [
    { exerciseId: "bb_bench", name: "Barbell Bench Press", sets: 3, primary: ["chest"] },
    { exerciseId: "ohp", name: "Overhead Press", sets: 3, primary: ["front_delts"] },
    { exerciseId: "triceps_pushdown", name: "Pushdown", sets: 2, primary: ["triceps"] },
  ],
};

const pullSession = {
  label: "Pull",
  exercises: [
    { exerciseId: "bb_row", name: "Barbell Row", sets: 3, primary: ["lats"] },
    { exerciseId: "pullup", name: "Pull-up", sets: 3, primary: ["lats"] },
    { exerciseId: "face_pull", name: "Face Pull", sets: 2, primary: ["rear_delts"] },
  ],
};

describe("sessionPushPullBias", () => {
  it("flags a push day", () => {
    assert.equal(sessionPushPullBias(pushSession), "push");
  });
  it("flags a pull day", () => {
    assert.equal(sessionPushPullBias(pullSession), "pull");
  });
  it("returns null when there is no session", () => {
    assert.equal(sessionPushPullBias(null), null);
  });
});

describe("buildLogCoachCue", () => {
  it("leads with deload over everything else", () => {
    const cue = buildLogCoachCue({
      session: pushSession,
      deloadSuggested: true,
      deloadReason: "3 planned sessions missed in 14 days",
      weekMissed: 2,
      stagnant: [{ exerciseId: "bb_bench", name: "Barbell Bench Press", weight: 185, sessions: 3 }],
    });
    assert.equal(cue.id, "deload");
    assert.equal(cue.action, "deload");
    assert.match(cue.body, /don't add sets/i);
  });

  it("flags repeated pain on a lift in today", () => {
    const cue = buildLogCoachCue({
      session: pushSession,
      painOnSession: [{ exerciseId: "bb_bench", name: "Barbell Bench Press", n: 3 }],
      stagnant: [{ exerciseId: "bb_bench", name: "Barbell Bench Press", weight: 185, sessions: 3 }],
    });
    assert.equal(cue.id, "pain");
    assert.equal(cue.exerciseId, "bb_bench");
    assert.match(cue.title, /Bench/);
  });

  it("flags stagnation only when that lift is in today", () => {
    const onSession = buildLogCoachCue({
      session: pushSession,
      stagnant: [{ exerciseId: "bb_bench", name: "Barbell Bench Press", weight: 185, sessions: 4 }],
    });
    assert.equal(onSession.id, "stagnation");
    assert.match(onSession.title, /185/);

    const otherLift = buildLogCoachCue({
      session: pushSession,
      completedCount: 8,
      stagnant: [{ exerciseId: "bb_back_squat", name: "Barbell Back Squat", weight: 315, sessions: 4 }],
    });
    assert.equal(otherLift.id, "on-track");
  });

  it("tells you not to stack missed volume", () => {
    const cue = buildLogCoachCue({
      session: pushSession,
      weekMissed: 2,
    });
    assert.equal(cue.id, "missed");
    assert.match(cue.body, /Skip makeup/);
  });

  it("warns when a push-heavy log meets a push day", () => {
    const cue = buildLogCoachCue({
      session: pushSession,
      loggedBalance: "push",
      completedCount: 6,
    });
    assert.equal(cue.id, "balance-push");
    assert.match(cue.body, /row or pulldown/i);
  });

  it("does not warn about push skew on a pull day", () => {
    const cue = buildLogCoachCue({
      session: pullSession,
      loggedBalance: "push",
      completedCount: 6,
    });
    assert.equal(cue.id, "on-track");
  });

  it("uses sleep journal when nothing louder is present", () => {
    const cue = buildLogCoachCue({
      session: pushSession,
      journalCue: { id: "journal-sleep-energy" },
      completedCount: 6,
    });
    assert.equal(cue.id, "sleep");
  });

  it("asks for first logs when you have almost no history", () => {
    const cue = buildLogCoachCue({
      session: pushSession,
      completedCount: 1,
    });
    assert.equal(cue.id, "first-logs");
  });

  it("returns null with no session and a clean week", () => {
    const cue = buildLogCoachCue({ session: null, weekMissed: 0, completedCount: 0 });
    assert.equal(cue, null);
  });
});

describe("resolveCoachStage", () => {
  it("stays guided until enough sessions", () => {
    assert.equal(resolveCoachStage(2).id, "guided");
    assert.equal(resolveCoachStage(6).id, "building");
    assert.equal(resolveCoachStage(15).id, "custom");
  });
});
