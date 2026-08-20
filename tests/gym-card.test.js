import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { gymCardLineCount, gymCardRows, gymCardHeading, gymCardHtml } from "../js/gym-card.js";

describe("gymCardLineCount", () => {
  it("never fewer than 3 lines", () => {
    assert.equal(gymCardLineCount(1, 0), 3);
  });
  it("uses the larger of planned vs logged", () => {
    assert.equal(gymCardLineCount(4, 2), 4);
    assert.equal(gymCardLineCount(3, 5), 5);
  });
});

describe("gymCardRows", () => {
  it("fills logged weights and blank remaining sets", () => {
    const session = {
      day: "2026-08-20",
      exercises: [{ exerciseId: "bb_bench", sets: 3, reps: "5-8", role: "compound" }],
    };
    const logs = {
      "2026-08-20": { exercises: { bb_bench: { sets: [{ weight: 185, reps: 6, rpe: 8 }] } } },
    };
    const rows = gymCardRows(session, logs, (id) => (id === "bb_bench" ? "Barbell bench" : id));
    assert.equal(rows[0].name, "Barbell bench");
    assert.equal(rows[0].lines.length, 3);
    assert.equal(rows[0].lines[0].weight, "185");
    assert.equal(rows[0].lines[1].weight, "");
  });
});

describe("gymCardHeading", () => {
  it("joins weekday and session label", () => {
    assert.equal(
      gymCardHeading({ day: "2026-08-20", label: "Upper A" }, () => "Thu"),
      "Iron Ledger · Thu · Upper A"
    );
  });
});

describe("gymCardHtml", () => {
  it("escapes names", () => {
    const html = gymCardHtml(
      {
        day: "2026-08-20",
        label: "A",
        exercises: [{ exerciseId: "x", name: "Foo <bar>", sets: 3, reps: "8" }],
      },
      {},
      { nameOf: () => "Foo <bar>", weekdayShort: () => "Thu" }
    );
    assert.match(html, /Foo &lt;bar&gt;/);
    assert.doesNotMatch(html, /Foo <bar>/);
  });
});
