import { buildPlan } from "../js/planner.js";
import { DEFAULT_SETTINGS } from "../js/data.js";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("custom targets", () => {
  it("boosts chest volume when emphasized", () => {
    const days = ["2026-08-03", "2026-08-05", "2026-08-07", "2026-08-10", "2026-08-12", "2026-08-14"];
    const base = buildPlan(days, { ...DEFAULT_SETTINGS, trainingMode: "med", equipment: null });
    const custom = buildPlan(days, {
      ...DEFAULT_SETTINGS,
      trainingMode: "custom",
      customTargets: { chest: 1.5 },
      equipment: null,
    });
    assert.ok((custom.targets.chest || 0) > (base.targets.chest || 0));
  });

  it("ignores customTargets when mode is med", () => {
    const days = ["2026-08-03", "2026-08-05", "2026-08-07", "2026-08-10", "2026-08-12", "2026-08-14"];
    const base = buildPlan(days, { ...DEFAULT_SETTINGS, trainingMode: "med", equipment: null });
    const stale = buildPlan(days, {
      ...DEFAULT_SETTINGS,
      trainingMode: "med",
      customTargets: { chest: 1.5 },
      equipment: null,
    });
    assert.equal(stale.targets.chest, base.targets.chest);
  });
});
