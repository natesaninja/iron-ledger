/**
 * Named program templates + session builder (educational summaries only).
 */
import { EXERCISES, MUSCLES, DEFAULT_SETTINGS } from "./data.js";
import { isExerciseAvailable } from "./equipment.js";
import { weekKey, parseISO, toISO, substitutesFor } from "./planner.js";

const MUSCLE_MAP = Object.fromEntries(MUSCLES.map((m) => [m.id, m]));

/** @typedef {{ id: string, name: string, attribution: string, minDaysPerWeek?: number, idealDaysPerWeek?: number, needsTrainingMaxes?: boolean, requiresAny?: string[] }} ProgramMeta */

/**
 * 5/3/1 main wave: percentages of training max, top set AMRAP-friendly.
 * Index = (weekIndexInPlan + programWeekOffset) % 4
 */
const SCHEME_531 = [
  {
    id: "5s",
    label: "5s",
    sets: 3,
    repsPerSet: 5,
    pcts: [0.65, 0.75, 0.85],
    amrapTop: true,
  },
  {
    id: "3s",
    label: "3s",
    sets: 3,
    repsPerSet: 3,
    pcts: [0.7, 0.8, 0.9],
    amrapTop: true,
  },
  {
    id: "531",
    label: "5/3/1",
    sets: 3,
    repsPerSet: [5, 3, 1],
    pcts: [0.75, 0.85, 0.95],
    amrapTop: true,
  },
  {
    id: "deload",
    label: "deload",
    sets: 3,
    repsPerSet: 5,
    pcts: [0.4, 0.5, 0.6],
    amrapTop: false,
  },
];

/** Lift key on settings.trainingMaxes for each BBB main */
const SLOT_TM_KEY = {
  squat_day: "squat",
  bench_day: "bench",
  deadlift_day: "deadlift",
  press_day: "press",
};

const PROGRAMS = {
  bbb_531: {
    id: "bbb_531",
    name: "5/3/1 Boring But Big (template)",
    attribution:
      "Inspired by Jim Wendler’s 5/3/1 / BBB concepts. Educational summary only — not a substitute for the author’s book or materials.",
    minDaysPerWeek: 3,
    idealDaysPerWeek: 4,
    requiresAny: ["barbell"],
    needsTrainingMaxes: true,
    rotation: "sequential",
    slots: [
      {
        id: "squat_day",
        label: "Squat + BBB",
        focusHint: ["quads", "glutes"],
        main: { exerciseId: "bb_back_squat", scheme: "531_main", tmKey: "squat" },
        supplemental: { exerciseId: "bb_back_squat", scheme: "bbb_5x10", tmKey: "squat" },
        accessories: [
          { pick: "pattern", pattern: "horizontal_pull", sets: 5, reps: "8-12" },
          { pick: "pattern", pattern: "isolation", primary: "core", sets: 3, reps: "10-15" },
        ],
      },
      {
        id: "bench_day",
        label: "Bench + BBB",
        focusHint: ["chest", "triceps"],
        main: { exerciseId: "bb_bench", scheme: "531_main", tmKey: "bench" },
        supplemental: { exerciseId: "bb_bench", scheme: "bbb_5x10", tmKey: "bench" },
        accessories: [
          { pick: "pattern", pattern: "horizontal_pull", sets: 5, reps: "8-12" },
          { pick: "pattern", pattern: "isolation", primary: "triceps", sets: 3, reps: "10-15" },
        ],
      },
      {
        id: "deadlift_day",
        label: "Deadlift + BBB",
        focusHint: ["hamstrings", "glutes", "lower_back"],
        main: { exerciseId: "conventional_dl", scheme: "531_main", tmKey: "deadlift" },
        supplemental: { exerciseId: "conventional_dl", scheme: "bbb_5x10", tmKey: "deadlift" },
        accessories: [
          { pick: "pattern", pattern: "horizontal_pull", sets: 3, reps: "8-12" },
          { pick: "pattern", pattern: "isolation", primary: "core", sets: 3, reps: "10-15" },
        ],
      },
      {
        id: "press_day",
        label: "Press + BBB",
        focusHint: ["front_delts", "side_delts"],
        main: { exerciseId: "ohp", scheme: "531_main", tmKey: "press" },
        supplemental: { exerciseId: "ohp", scheme: "bbb_5x10", tmKey: "press" },
        accessories: [
          { pick: "pattern", pattern: "vertical_pull", sets: 5, reps: "6-10" },
          { pick: "pattern", pattern: "isolation", primary: "side_delts", sets: 3, reps: "12-15" },
        ],
      },
    ],
  },
};

/** @returns {ProgramMeta[]} */
export function listPrograms() {
  return Object.values(PROGRAMS).map((p) => ({
    id: p.id,
    name: p.name,
    attribution: p.attribution,
    minDaysPerWeek: p.minDaysPerWeek,
    idealDaysPerWeek: p.idealDaysPerWeek,
    needsTrainingMaxes: !!p.needsTrainingMaxes,
    requiresAny: p.requiresAny ? [...p.requiresAny] : [],
  }));
}

export function getProgram(id) {
  const p = PROGRAMS[id];
  return p || null;
}

/**
 * Per calendar week (Mon-start): sort train days, assign slots[i % n] restarting at 0 each week.
 * @param {string[]} trainingDays
 * @param {{ slots: { id: string }[] }} program
 * @returns {{ day: string, slotId: string }[]}
 */
export function assignSlotsForMonth(trainingDays, program) {
  const days = [...new Set(trainingDays || [])].sort();
  const slots = program?.slots || [];
  if (!days.length || !slots.length) return [];

  const byWeek = {};
  for (const d of days) {
    const wk = weekKey(d);
    (byWeek[wk] ||= []).push(d);
  }

  const out = [];
  for (const wk of Object.keys(byWeek).sort()) {
    const weekDays = byWeek[wk].sort();
    weekDays.forEach((day, i) => {
      out.push({ day, slotId: slots[i % slots.length].id });
    });
  }
  // Preserve calendar order of days
  out.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
  return out;
}

function roundLoad(n) {
  if (!Number.isFinite(n) || n <= 0) return null;
  // nearest 5 for barbell-friendly display
  return Math.round(n / 5) * 5;
}

function formatPctList(pcts) {
  return pcts.map((p) => Math.round(p * 100)).join("/");
}

function formatLoadList(pcts, tm, unit) {
  if (!tm || !Number.isFinite(+tm) || +tm <= 0) return null;
  const loads = pcts.map((p) => roundLoad(+tm * p)).filter((x) => x != null);
  if (!loads.length) return null;
  return `${loads.join("/")} ${unit || "lb"}`;
}

function resolveExercise(exerciseId, settings, usedIds = new Set()) {
  const excluded = new Set(settings.excludedExercises || []);
  const preferred = exId => (settings.preferredExercises || []).includes(exId);

  let ex = EXERCISES.find((e) => e.id === exerciseId);
  if (ex && !excluded.has(ex.id) && isExerciseAvailable(ex, settings.equipment) && !usedIds.has(ex.id)) {
    return { ex, substituted: false };
  }

  // Prefer planner substitutes (same pattern + primary overlap)
  if (ex) {
    const subs = substitutesFor(exerciseId, settings).filter((s) => !usedIds.has(s.id));
    if (subs.length) return { ex: EXERCISES.find((e) => e.id === subs[0].id) || subs[0], substituted: true };
  }

  // Pattern + primary fallback if original missing from catalog
  if (ex) {
    const candidates = EXERCISES.filter(
      (e) =>
        !excluded.has(e.id) &&
        !usedIds.has(e.id) &&
        isExerciseAvailable(e, settings.equipment) &&
        e.pattern === ex.pattern &&
        e.primary.some((m) => ex.primary.includes(m))
    );
    candidates.sort((a, b) => {
      let sa = preferred(a.id) ? 5 : 0;
      let sb = preferred(b.id) ? 5 : 0;
      if (a.role === "compound") sa += 2;
      if (b.role === "compound") sb += 2;
      return sb - sa;
    });
    if (candidates[0]) return { ex: candidates[0], substituted: true };
  }

  return { ex: null, substituted: false };
}

function pickByPattern(accSpec, settings, usedIds) {
  const excluded = new Set(settings.excludedExercises || []);
  const preferred = (id) => (settings.preferredExercises || []).includes(id);
  const pattern = accSpec.pattern;
  const primary = accSpec.primary;

  const candidates = EXERCISES.filter((e) => {
    if (excluded.has(e.id) || usedIds.has(e.id)) return false;
    if (!isExerciseAvailable(e, settings.equipment)) return false;
    if (pattern && e.pattern !== pattern) return false;
    if (primary && !(e.primary || []).includes(primary)) return false;
    return true;
  });

  candidates.sort((a, b) => {
    let sa = preferred(a.id) ? 8 : 0;
    let sb = preferred(b.id) ? 8 : 0;
    if (a.role === "compound") sa += 3;
    if (b.role === "compound") sb += 3;
    if (a.role === "accessory") sa += 1;
    if (b.role === "accessory") sb += 1;
    // Prefer shorter minPerSet for accessories slightly when equal role
    sa -= (a.minPerSet || 2) * 0.1;
    sb -= (b.minPerSet || 2) * 0.1;
    return sb - sa;
  });

  return candidates[0] || null;
}

function scheme531Display(wave, tm, unit) {
  const pctStr = formatPctList(wave.pcts);
  const loadStr = formatLoadList(wave.pcts, tm, unit);
  const repPart =
    Array.isArray(wave.repsPerSet)
      ? wave.repsPerSet.join("/")
      : String(wave.repsPerSet);
  // UI shows `${sets} × ${reps}` → put scheme text in reps
  let reps = Array.isArray(wave.repsPerSet)
    ? `${repPart} @ ${pctStr}% TM`
    : `${repPart} @ ${pctStr}% TM`;
  if (wave.amrapTop) reps += " (AMRAP top)";
  if (loadStr) reps += ` · ${loadStr}`;
  return { sets: wave.sets, reps };
}

function schemeBbbDisplay(tm, pct, unit) {
  const p = pct != null && Number.isFinite(+pct) ? +pct : 0.5;
  const pctLabel = Math.round(p * 100);
  let reps = `10 @ ${pctLabel}% TM`;
  if (tm && Number.isFinite(+tm) && +tm > 0) {
    const load = roundLoad(+tm * p);
    if (load != null) reps += ` · ${load} ${unit || "lb"}`;
  }
  return { sets: 5, reps };
}

function scaleAccessorySets(sets, dose) {
  const scale = dose?.setScale ?? 1;
  // rough days soft-scale accessories; keep at least 2
  const s = Math.round((sets || 3) * (scale < 1 ? Math.max(0.5, scale) : 1));
  return Math.max(2, Math.min(6, s));
}

function makeExEntry(ex, sets, reps, whyExtra = "") {
  const s = Math.max(1, sets || ex.sets || 3);
  const est = s * (ex.minPerSet || 2.5);
  const why = [ex.why, whyExtra].filter(Boolean).join(" ");
  return {
    exerciseId: ex.id,
    name: ex.name,
    sets: s,
    reps: reps || ex.reps || "8-12",
    primary: [...(ex.primary || [])],
    secondary: [...(ex.secondary || [])],
    minutes: Math.round(est * 10) / 10,
    pattern: ex.pattern,
    role: ex.role,
    why: why || "Program template work for this session.",
    done: false,
  };
}

function gapEntry(label, detail) {
  return {
    exerciseId: `_gap_${label}`,
    name: `Unavailable: ${label}`,
    sets: 0,
    reps: "—",
    primary: [],
    secondary: [],
    minutes: 0,
    pattern: "gap",
    role: "gap",
    why: detail || "Add equipment or swap program / exercise.",
    done: false,
    isGap: true,
  };
}

function buildProgramSession(day, slot, program, settings, waveIndex, dose) {
  const unit = settings.unitLabel || "lb";
  const wave = SCHEME_531[waveIndex % SCHEME_531.length];
  const bbbPct = settings.bbbSupplementalPct != null ? +settings.bbbSupplementalPct : 0.5;
  const tms = settings.trainingMaxes || {};
  const usedIds = new Set();
  const exercises = [];
  const notes = [];

  const tmKey = slot.main?.tmKey || SLOT_TM_KEY[slot.id];
  const tm = tmKey != null ? tms[tmKey] : null;

  // --- Main 5/3/1 ---
  if (slot.main) {
    const { ex, substituted } = resolveExercise(slot.main.exerciseId, settings, usedIds);
    if (ex) {
      usedIds.add(ex.id);
      const { sets, reps } = scheme531Display(wave, tm, unit);
      exercises.push(
        makeExEntry(
          ex,
          sets,
          reps,
          substituted
            ? `Substituted for ${slot.main.exerciseId} (equipment). Main 5/3/1 work.`
            : `Main 5/3/1 work · ${wave.label} wave.`
        )
      );
    } else {
      exercises.push(
        gapEntry(
          slot.main.exerciseId,
          "Main lift unavailable with current equipment. Add equipment or swap program."
        )
      );
      notes.push("main lift missing equipment");
    }
  }

  // --- BBB supplemental (skip or lighten on deload / rough) ---
  const skipBbb = wave.id === "deload" || dose?.id === "rough";
  if (slot.supplemental && !skipBbb) {
    // Prefer same exercise as main if it was used; else resolve again
    const prefId = exercises[0] && !exercises[0].isGap ? exercises[0].exerciseId : slot.supplemental.exerciseId;
    // Supplemental is same lift pattern — allow re-using main exercise id (BBB is same movement)
    const baseId = slot.supplemental.exerciseId;
    let ex =
      EXERCISES.find((e) => e.id === prefId) &&
      isExerciseAvailable(
        EXERCISES.find((e) => e.id === prefId),
        settings.equipment
      )
        ? EXERCISES.find((e) => e.id === prefId)
        : null;
    if (!ex) {
      const r = resolveExercise(baseId, settings, new Set());
      ex = r.ex;
    }
    if (ex) {
      const { sets, reps } = schemeBbbDisplay(tm, bbbPct, unit);
      // Time-box: keep main; may drop BBB later if over budget — always include for now
      exercises.push(
        makeExEntry(ex, sets, reps, `BBB supplemental 5×10 @ ~${Math.round(bbbPct * 100)}% TM.`)
      );
    }
  } else if (slot.supplemental && wave.id === "deload") {
    notes.push("BBB skipped on deload week");
  }

  // --- Accessories ---
  const accList = slot.accessories || [];
  const budget =
    Math.min(
      dose?.sessionMinutes || settings.sessionMinutes || 55,
      settings.timeBoxMinutes > 0 ? settings.timeBoxMinutes : settings.sessionMinutes || 55
    ) - 5;

  for (const acc of accList) {
    let minutes = exercises.reduce((s, e) => s + (e.minutes || 0), 0);
    if (minutes >= budget - 4) break;

    if (acc.pick === "pattern") {
      const ex = pickByPattern(acc, settings, usedIds);
      if (!ex) continue;
      usedIds.add(ex.id);
      const sets = scaleAccessorySets(acc.sets, dose);
      exercises.push(
        makeExEntry(
          ex,
          sets,
          acc.reps || ex.reps,
          `Program accessory (${acc.pattern}${acc.primary ? " · " + acc.primary : ""}).`
        )
      );
    } else if (acc.exerciseId) {
      const { ex } = resolveExercise(acc.exerciseId, settings, usedIds);
      if (!ex) continue;
      usedIds.add(ex.id);
      const sets = scaleAccessorySets(acc.sets || ex.sets, dose);
      exercises.push(makeExEntry(ex, sets, acc.reps || ex.reps, "Program accessory."));
    }
  }

  // Drop gap-only noise from estimated minutes
  const minutes = exercises
    .filter((e) => !e.isGap)
    .reduce((s, e) => s + (e.minutes || 0), 0);

  const schemeNotes = [
    `Week wave: ${wave.label}`,
    `BBB 5×10 @ ${Math.round(bbbPct * 100)}% TM`,
    tm != null && Number.isFinite(+tm) && +tm > 0 ? `TM ${tm} ${unit}` : "TM not set",
  ].join(" · ");

  const rationale = [
    `${program.name} · ${slot.label}.`,
    schemeNotes + ".",
    notes.length ? notes.join("; ") + "." : "",
    dose ? `Dose: ${dose.label || dose.id}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    day,
    label: slot.label,
    focus: [...(slot.focusHint || [])],
    exercises,
    estimatedMinutes: Math.round(minutes * 10) / 10,
    rationale,
    doseId: dose?.id || "med",
    doseLabel: dose?.label || "Minimum effective dose",
    completed: false,
    source: "program",
    programId: program.id,
    slotId: slot.id,
    schemeNotes,
  };
}

function contribFromSession(session) {
  const out = {};
  for (const ex of session.exercises || []) {
    if (ex.isGap || !ex.sets) continue;
    for (const m of ex.primary || []) out[m] = (out[m] || 0) + ex.sets;
    for (const m of ex.secondary || []) out[m] = (out[m] || 0) + ex.sets * 0.5;
  }
  return out;
}

/**
 * Build plan sessions from a named program template.
 * Shape matches buildPlan enough for Today / Cover UI.
 *
 * @param {string[]} trainingDays
 * @param {object} settings
 * @param {{ start?: string, end?: string, dayDose?: Record<string,string>, doseProfiles?: object }} [horizon]
 */
export function buildProgramPlan(trainingDays, settings, horizon = {}) {
  const s = { ...DEFAULT_SETTINGS, ...settings };
  const programId = s.activeProgramId;
  const program = getProgram(programId);
  const days = [...new Set(trainingDays || [])].sort();

  if (!program || !days.length) {
    return {
      sessions: [],
      coverage: {},
      targets: {},
      meta: {
        trainingDays: days.length,
        source: "program",
        programId: programId || null,
        underCoveredPrimaries: [],
      },
    };
  }

  let start = horizon.start || days[0].slice(0, 8) + "01";
  const sd = parseISO(days[0]);
  const monthEnd = new Date(sd.getFullYear(), sd.getMonth() + 1, 1);
  let end = horizon.end || toISO(monthEnd);

  const startD = parseISO(start);
  const endD = parseISO(end);
  const horizonDays = Math.max(1, (endD - startD) / 86400000);
  const weeks = horizonDays / 7;

  const targets = {};
  for (const m of MUSCLES) {
    targets[m.id] = m.weeklyMed * (s.medMultiplier || 1) * weeks;
  }

  const doseProfiles = horizon.doseProfiles || {};
  const dayDoseMap = horizon.dayDose || {};
  const defaultDoseId = s.defaultDose || "med";

  const weekKeysSorted = [...new Set(days.map((d) => weekKey(d)))].sort();
  const offset = Number.isFinite(+s.programWeekOffset) ? +s.programWeekOffset : 0;

  const slotMap = assignSlotsForMonth(days, program);
  const slotByDay = Object.fromEntries(slotMap.map((x) => [x.day, x.slotId]));
  const slotById = Object.fromEntries(program.slots.map((sl) => [sl.id, sl]));

  const sessions = [];
  const coverage = {};

  for (const d of days) {
    const slotId = slotByDay[d];
    const slot = slotById[slotId];
    if (!slot) continue;

    const wk = weekKey(d);
    const weekIndexInPlan = weekKeysSorted.indexOf(wk);
    const waveIndex = (Math.max(0, weekIndexInPlan) + offset) % 4;

    const doseId = dayDoseMap[d] || defaultDoseId;
    const dose = doseProfiles[doseId] || doseProfiles.med || null;

    const session = buildProgramSession(d, slot, program, s, waveIndex, dose);
    sessions.push(session);

    const contrib = contribFromSession(session);
    for (const [mid, sets] of Object.entries(contrib)) {
      coverage[mid] = (coverage[mid] || 0) + sets;
    }
  }

  return {
    sessions,
    coverage,
    targets,
    meta: {
      start,
      end,
      trainingDays: days.length,
      sessionMinutes: s.sessionMinutes,
      splitPreference: s.splitPreference,
      underCoveredPrimaries: [],
      medMultiplier: s.medMultiplier,
      source: "program",
      programId: program.id,
    },
  };
}
