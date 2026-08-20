import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { listBriefSections, getBriefSection, briefJumpView } from "../js/brief.js";

const REQUIRED = [
  "modes",
  "today",
  "logging",
  "plan",
  "cover",
  "programs",
  "equipment",
  "journal",
  "supps",
  "macroledger",
  "install",
  "setup",
];

describe("listBriefSections", () => {
  it("covers every shipped feature group in order", () => {
    const ids = listBriefSections().map((s) => s.id);
    assert.deepEqual(ids, REQUIRED);
  });

  it("gives each section a code, title, and body", () => {
    for (const s of listBriefSections()) {
      const full = getBriefSection(s.id);
      assert.ok(s.code, s.id);
      assert.ok(s.title, s.id);
      assert.ok(full.body && full.body.length > 20, s.id);
    }
  });
});

describe("briefJumpView", () => {
  it("opens the matching tab for a section", () => {
    assert.equal(briefJumpView("today"), "today");
    assert.equal(briefJumpView("plan"), "plan");
    assert.equal(briefJumpView("cover"), "coverage");
    assert.equal(briefJumpView("supps"), "supps");
    assert.equal(briefJumpView("setup"), "settings");
    assert.equal(briefJumpView("install"), "settings");
    assert.equal(briefJumpView("modes"), "settings");
  });

  it("returns null for unknown sections", () => {
    assert.equal(briefJumpView("nope"), null);
    assert.equal(getBriefSection("nope"), null);
  });
});
