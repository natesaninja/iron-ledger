import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { orderExercisesByNeed, exerciseNeedScore, muscleNeedMap } from "../js/need-order.js";

const squat = {
  exerciseId: "bb_back_squat",
  name: "Squat",
  role: "compound",
  primary: ["quads", "glutes"],
  sets: 3,
};
const bench = {
  exerciseId: "bb_bench",
  name: "Bench",
  role: "compound",
  primary: ["chest"],
  sets: 3,
};
const curl = {
  exerciseId: "db_curl",
  name: "Curl",
  role: "isolation",
  primary: ["biceps"],
  sets: 2,
};
const row = {
  exerciseId: "bb_row",
  name: "Row",
  role: "compound",
  primary: ["lats"],
  sets: 3,
};

describe("exerciseNeedScore", () => {
  it("sums remaining need on primary muscles", () => {
    assert.equal(exerciseNeedScore(squat, { quads: 4, glutes: 2, chest: 9 }), 6);
  });
});

describe("orderExercisesByNeed", () => {
  it("keeps compounds above isolation even if isolation has more debt", () => {
    const ordered = orderExercisesByNeed([curl, bench], {
      muscleNeed: { biceps: 10, chest: 1 },
    });
    assert.deepEqual(
      ordered.map((e) => e.exerciseId),
      ["bb_bench", "db_curl"]
    );
  });

  it("among compounds, stacks the lagging muscle first", () => {
    const ordered = orderExercisesByNeed([bench, row, squat], {
      muscleNeed: { chest: 1, lats: 8, quads: 3, glutes: 3 },
    });
    assert.equal(ordered[0].exerciseId, "bb_row");
    assert.equal(ordered[1].exerciseId, "bb_back_squat");
    assert.equal(ordered[2].exerciseId, "bb_bench");
  });

  it("sinks finished lifts so remaining work is next", () => {
    const ordered = orderExercisesByNeed(
      [
        { ...curl, done: false },
        { ...bench, done: true },
        { ...row, done: false },
      ],
      { muscleNeed: { biceps: 0, chest: 0, lats: 0 } }
    );
    assert.equal(ordered[0].exerciseId, "bb_row");
    assert.equal(ordered[1].exerciseId, "db_curl");
    assert.equal(ordered[ordered.length - 1].exerciseId, "bb_bench");
  });

  it("keeps original order when scores tie", () => {
    const a = { ...bench, exerciseId: "a", primary: ["chest"] };
    const b = { ...bench, exerciseId: "b", primary: ["chest"] };
    const ordered = orderExercisesByNeed([a, b], { muscleNeed: { chest: 2 } });
    assert.deepEqual(
      ordered.map((e) => e.exerciseId),
      ["a", "b"]
    );
  });
});

describe("muscleNeedMap", () => {
  it("subtracts logged week volume from weekly targets", () => {
    const logs = {
      "2026-08-17": {
        exercises: {
          bb_bench: { sets: [{ weight: 135, reps: 5, hard: true }] },
        },
      },
    };
    const need = muscleNeedMap({
      logs,
      settings: { medMultiplier: 1, trainingMode: "med" },
      today: "2026-08-18",
      weekStart: "2026-08-17",
    });
    assert.ok(need.chest < need.lats);
    assert.ok(need.chest >= 0);
  });
});
