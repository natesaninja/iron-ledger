import { buildPlan } from "../js/planner.js";
import { CUSTOM_TARGET_PRESETS, DEFAULT_SETTINGS, quantizeCustomTarget } from "../js/data.js";
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

  it("quantizeCustomTarget preserves push_focus 0.05-step values", () => {
    for (const [muscle, mult] of Object.entries(CUSTOM_TARGET_PRESETS.push_focus)) {
      assert.equal(quantizeCustomTarget(mult), mult, muscle);
    }
    // Old 0.1 rounding would corrupt these
    assert.equal(quantizeCustomTarget(1.25), 1.25);
    assert.equal(quantizeCustomTarget(1.15), 1.15);
    assert.notEqual(Math.round(1.25 * 10) / 10, 1.25);
  });
});
