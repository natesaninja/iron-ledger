import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { assignSlotsForMonth, buildProgramPlan, getProgram, listPrograms } from "../js/programs.js";
import { DEFAULT_SETTINGS } from "../js/data.js";
import { applyEquipmentPreset } from "../js/equipment.js";

describe("getProgram / listPrograms", () => {
  it("lists bbb_531 and returns full def", () => {
    const list = listPrograms();
    assert.ok(list.some((p) => p.id === "bbb_531"));
    const prog = getProgram("bbb_531");
    assert.ok(prog);
    assert.equal(prog.slots.length, 4);
    assert.ok(prog.attribution);
  });

  it("lists bodybuilding templates with slots + attribution", () => {
    const list = listPrograms();
    for (const id of ["ppl_hyper", "ul_hyper", "bro_classic"]) {
      assert.ok(list.some((p) => p.id === id), `list includes ${id}`);
      const prog = getProgram(id);
      assert.ok(prog, id);
      assert.ok(prog.slots.length >= 1, `${id} has slots`);
      assert.ok(prog.attribution, `${id} attribution`);
    }
    assert.equal(getProgram("ppl_hyper").slots.length, 3);
    assert.equal(getProgram("ul_hyper").slots.length, 4);
    assert.equal(getProgram("bro_classic").slots.length, 5);
  });
});

describe("assignSlotsForMonth", () => {
  it("restarts each week at slot 0", () => {
    const prog = getProgram("bbb_531");
    // Mon 2026-08-03, Wed 08-05, Fri 08-07, then next week Mon 08-10
    const map = assignSlotsForMonth(
      ["2026-08-03", "2026-08-05", "2026-08-07", "2026-08-10"],
      prog
    );
    const byDay = Object.fromEntries(map.map((x) => [x.day, x.slotId]));
    assert.equal(byDay["2026-08-03"], "squat_day");
    assert.equal(byDay["2026-08-05"], "bench_day");
    assert.equal(byDay["2026-08-07"], "deadlift_day");
    assert.equal(byDay["2026-08-10"], "squat_day"); // new week
  });
});

describe("buildProgramPlan", () => {
  it("labels sessions from BBB", () => {
    const plan = buildProgramPlan(
      ["2026-08-03", "2026-08-05", "2026-08-07", "2026-08-08"],
      {
        ...DEFAULT_SETTINGS,
        trainingMode: "program",
        activeProgramId: "bbb_531",
        equipment: applyEquipmentPreset("home_barbell"),
        trainingMaxes: { squat: 315, bench: 225, deadlift: 405, press: 135 },
      }
    );
    assert.equal(plan.sessions.length, 4);
    assert.equal(plan.sessions[0].source, "program");
    assert.match(plan.sessions[0].label, /squat/i);
    assert.equal(plan.sessions[0].programId, "bbb_531");
    assert.equal(plan.sessions[0].slotId, "squat_day");
    assert.ok(plan.sessions[0].schemeNotes);
    assert.ok(plan.sessions[0].exercises.length >= 2);
    assert.equal(plan.meta.source, "program");
  });

  it("substitutes or gaps unequipped mains", () => {
    const plan = buildProgramPlan(
      ["2026-08-03"],
      {
        ...DEFAULT_SETTINGS,
        trainingMode: "program",
        activeProgramId: "bbb_531",
        equipment: applyEquipmentPreset("db_only"),
        trainingMaxes: { squat: 315, bench: 225, deadlift: 405, press: 135 },
      }
    );
    assert.equal(plan.sessions.length, 1);
    const main = plan.sessions[0].exercises[0];
    // Barbell mains unavailable on db_only — either sub (non-bb id) or no main slot filled with bb
    if (main) {
      assert.notEqual(main.exerciseId, "bb_back_squat");
    }
  });

  for (const id of ["ppl_hyper", "ul_hyper", "bro_classic"]) {
    it(`builds ≥1 session for ${id}`, () => {
      const plan = buildProgramPlan(
        ["2026-08-03", "2026-08-05", "2026-08-07"],
        {
          ...DEFAULT_SETTINGS,
          trainingMode: "program",
          activeProgramId: id,
          equipment: applyEquipmentPreset("home_barbell"),
        }
      );
      assert.ok(plan.sessions.length >= 1, `${id} sessions`);
      assert.equal(plan.sessions[0].source, "program");
      assert.equal(plan.sessions[0].programId, id);
      assert.ok(plan.sessions[0].slotId);
      assert.ok(plan.sessions[0].schemeNotes);
      assert.ok(plan.sessions[0].exercises.length >= 1, `${id} has exercises`);
      assert.equal(plan.meta.source, "program");
      assert.equal(plan.meta.programId, id);
    });
  }

  it("ppl_hyper labels first train day as Push", () => {
    const plan = buildProgramPlan(
      ["2026-08-03"],
      {
        ...DEFAULT_SETTINGS,
        trainingMode: "program",
        activeProgramId: "ppl_hyper",
        equipment: applyEquipmentPreset("home_barbell"),
      }
    );
    assert.equal(plan.sessions[0].slotId, "push");
    assert.match(plan.sessions[0].label, /push/i);
  });
});
