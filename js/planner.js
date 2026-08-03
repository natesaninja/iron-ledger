/**
 * Coverage + recovery + session builder (browser port of strength-med-planner)
 */
import { MUSCLES, PRIORITY, FOCUS, EXERCISES } from "./data.js";

const MUSCLE_MAP = Object.fromEntries(MUSCLES.map((m) => [m.id, m]));

function weekKey(iso) {
  const d = parseISO(iso);
  const day = d.getDay(); // 0 Sun
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  return toISO(mon);
}

export function parseISO(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(iso, n) {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function weekdayShort(iso) {
  return parseISO(iso).toLocaleDateString("en-US", { weekday: "short" });
}

export function monthLabel(year, monthIndex) {
  return new Date(year, monthIndex, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function weeklyTarget(m, settings) {
  return m.weeklyMed * (settings.medMultiplier || 1);
}

class RecoveryState {
  constructor(settings) {
    this.mult = settings.recoveryMultiplier || 1;
    this.events = []; // {iso, muscleId, sets}
  }

  apply(iso, contrib) {
    for (const [mid, sets] of Object.entries(contrib)) {
      if (sets > 0) this.events.push({ iso, muscleId: mid, sets });
    }
  }

  recoveryPct(muscleId, atIso) {
    const m = MUSCLE_MAP[muscleId];
    if (!m) return 100;
    const base = m.recoveryH * this.mult;
    const at = parseISO(atIso).getTime();
    let fatigue = 0;
    for (const ev of this.events) {
      if (ev.muscleId !== muscleId) continue;
      const when = parseISO(ev.iso).getTime();
      if (when > at) continue;
      const hoursNeeded = base * (1 + 0.08 * Math.max(0, ev.sets - 3));
      const elapsedH = (at - when) / 3600000;
      if (elapsedH >= hoursNeeded) continue;
      const peak = Math.min(1, 0.18 * ev.sets);
      fatigue += peak * (1 - elapsedH / hoursNeeded);
    }
    fatigue = Math.min(1, fatigue);
    return Math.round(100 * (1 - fatigue) * 10) / 10;
  }
}

function contribFromEx(ex, sets) {
  const out = {};
  for (const m of ex.primary) out[m] = (out[m] || 0) + sets;
  for (const m of ex.secondary) out[m] = (out[m] || 0) + sets * 0.5;
  return out;
}

function sessionContrib(session) {
  const out = {};
  for (const ex of session.exercises) {
    const c = contribFromEx(
      { primary: ex.primary, secondary: ex.secondary },
      ex.sets
    );
    for (const [k, v] of Object.entries(c)) out[k] = (out[k] || 0) + v;
  }
  return out;
}

function computeDebts(weeklySets, recovery, atIso, settings, remainingSessions) {
  const items = [];
  PRIORITY.forEach((mid, rank) => {
    const m = MUSCLE_MAP[mid];
    const target = weeklyTarget(m, settings);
    const current = weeklySets[mid] || 0;
    const debt = target - current;
    const rec = recovery.recoveryPct(mid, atIso);
    const tierW = { primary: 1.35, secondary: 1, support: 0.75 }[m.tier] || 1;
    const priW = 1 + Math.max(0, PRIORITY.length - rank) * 0.02;
    let recW = 1;
    if (rec < 40) recW = 0.15;
    else if (rec < 55) recW = 0.45;
    else if (rec < 70) recW = 0.85;
    else recW = 1 + (rec - 70) / 100;
    let scarcity = 1;
    if (remainingSessions <= 2 && debt > 0) scarcity = 1 + 0.25 * (3 - remainingSessions);
    let score = Math.max(0, debt) * tierW * priW * recW * scarcity;
    if (current < 0.5 && m.tier === "primary" && rec >= 55) score += 2 * recW;
    items.push({ muscleId: mid, debt, recovery: rec, score });
  });
  items.sort((a, b) => b.score - a.score);
  return items;
}

function pickLabel(debts, split, sessionIndex, nWeek) {
  if (split === "full_body" || (split === "auto" && nWeek <= 3)) {
    return { label: "Full Body (MED)", focus: FOCUS.full_body };
  }
  if (split === "upper_lower" || (split === "auto" && nWeek === 4)) {
    const u = debts.filter((d) => FOCUS.upper.includes(d.muscleId)).reduce((s, d) => s + d.score, 0);
    const l = debts.filter((d) => FOCUS.lower.includes(d.muscleId)).reduce((s, d) => s + d.score, 0);
    const prefer =
      sessionIndex % 2 === 0
        ? l >= u * 0.85
          ? "lower"
          : "upper"
        : u >= l * 0.85
          ? "upper"
          : "lower";
    return {
      label: prefer === "lower" ? "Lower Body" : "Upper Body",
      focus: FOCUS[prefer],
    };
  }
  if (split === "ppl" || (split === "auto" && nWeek >= 5)) {
    const scores = {
      push: debts.filter((d) => FOCUS.push.includes(d.muscleId)).reduce((s, d) => s + d.score, 0),
      pull: debts.filter((d) => FOCUS.pull.includes(d.muscleId)).reduce((s, d) => s + d.score, 0),
      legs: debts.filter((d) => FOCUS.legs.includes(d.muscleId)).reduce((s, d) => s + d.score, 0),
    };
    const order = ["push", "pull", "legs"];
    const rotated = order.slice(sessionIndex % 3).concat(order.slice(0, sessionIndex % 3));
    const best = rotated.reduce((a, k) =>
      scores[k] + (k === rotated[0] ? 0.5 : 0) > scores[a] + (a === rotated[0] ? 0.5 : 0) ? k : a
    );
    return {
      label: { push: "Push", pull: "Pull", legs: "Legs" }[best],
      focus: FOCUS[best],
    };
  }
  if (split === "bro") {
    const order = ["chest", "back", "legs", "shoulders", "arms"];
    // simplified: rotate
    const map = {
      chest: { label: "Chest Day", focus: ["chest", "front_delts", "triceps"] },
      back: { label: "Back Day", focus: FOCUS.pull },
      legs: { label: "Leg Day", focus: FOCUS.legs },
      shoulders: { label: "Shoulder Day", focus: ["front_delts", "side_delts", "rear_delts", "traps"] },
      arms: { label: "Arm Day", focus: ["biceps", "triceps"] },
    };
    const key = order[sessionIndex % order.length];
    return map[key];
  }
  return { label: "Full Body (MED)", focus: FOCUS.full_body };
}

const SLOTS = {
  full: [
    { patterns: ["squat"], roles: ["compound"] },
    { patterns: ["hinge"], roles: ["compound", "accessory"] },
    { patterns: ["horizontal_push", "vertical_push"], roles: ["compound"] },
    { patterns: ["horizontal_pull", "vertical_pull"], roles: ["compound"] },
  ],
  upper: [
    { patterns: ["horizontal_push"], roles: ["compound"] },
    { patterns: ["horizontal_pull", "vertical_pull"], roles: ["compound"] },
    { patterns: ["vertical_push"], roles: ["compound"] },
  ],
  lower: [
    { patterns: ["squat"], roles: ["compound"] },
    { patterns: ["hinge"], roles: ["compound", "accessory"] },
  ],
  push: [
    { patterns: ["horizontal_push"], roles: ["compound"] },
    { patterns: ["vertical_push"], roles: ["compound"] },
  ],
  pull: [
    { patterns: ["vertical_pull"], roles: ["compound"] },
    { patterns: ["horizontal_pull"], roles: ["compound"] },
  ],
  legs: [
    { patterns: ["squat"], roles: ["compound"] },
    { patterns: ["hinge"], roles: ["compound", "accessory"] },
  ],
};

function slotsFor(label) {
  if (label.includes("Full Body")) return SLOTS.full;
  if (label === "Upper Body") return SLOTS.upper;
  if (label === "Lower Body") return SLOTS.lower;
  if (label === "Push") return SLOTS.push;
  if (label === "Pull") return SLOTS.pull;
  if (label === "Legs" || label === "Leg Day") return SLOTS.legs;
  return SLOTS.full;
}

function applyLocalDebt(debtMap, contrib) {
  for (const [mid, sets] of Object.entries(contrib)) {
    const d = debtMap[mid];
    if (!d) continue;
    debtMap[mid] = {
      ...d,
      debt: d.debt - sets,
      score: Math.max(0, d.score - sets * 1.2),
    };
  }
}

function primaryCounts(chosen) {
  const c = {};
  for (const ex of chosen) {
    for (const m of ex.primary) c[m] = (c[m] || 0) + ex.sets;
  }
  return c;
}

function scoreEx(ex, focus, debtMap, recovery, atIso, usedIds, usedPatterns, counts, settings, patternFilter, roleFilter) {
  if (usedIds.has(ex.id) || (settings.excludedExercises || []).includes(ex.id)) return -1e9;
  if (patternFilter && !patternFilter.includes(ex.pattern)) return -1e9;
  if (roleFilter && !roleFilter.includes(ex.role)) return -1e9;
  if (!ex.primary.some((m) => focus.has(m))) return -1e9;

  let score = 0;
  for (const m of ex.primary) {
    const d = debtMap[m];
    if (d) score += Math.max(0, d.score) * 1.5;
    const rec = recovery.recoveryPct(m, atIso);
    if (rec < 45) score -= 10;
    else if (rec >= 70) score += 1;
    const already = counts[m] || 0;
    if (already >= 6 && ex.role === "compound") score -= 20;
    else if (already >= 4 && ex.role === "compound") score -= 8;
  }
  for (const m of ex.secondary) {
    const d = debtMap[m];
    if (d) score += Math.max(0, d.score) * 0.35;
  }
  if ((settings.preferredExercises || []).includes(ex.id)) score += 4;
  if (ex.role === "compound") score += 2.5;
  else if (ex.role === "accessory") score += 1;
  if (usedPatterns.has(ex.pattern)) score -= ex.role === "compound" ? 6 : 2;
  return score;
}

function pickEx(focus, debtMap, recovery, atIso, usedIds, usedPatterns, chosen, settings, patternFilter, roleFilter) {
  const counts = primaryCounts(chosen);
  let best = null;
  let bestScore = -1e8;
  for (const ex of EXERCISES) {
    const sc = scoreEx(ex, focus, debtMap, recovery, atIso, usedIds, usedPatterns, counts, settings, patternFilter, roleFilter);
    if (sc > bestScore) {
      bestScore = sc;
      best = ex;
    }
  }
  if (!best || bestScore < -1e7) return null;
  return best;
}

const PATTERN_JOB = {
  squat: "Covers the squat pattern (thighs / glutes) so lower body isn’t only hinge work.",
  hinge: "Covers the hinge pattern (hamstrings / glutes / back of the hip) opposite to squatting.",
  horizontal_push: "Horizontal push so chest gets direct hard sets this session.",
  vertical_push: "Vertical push so shoulders get overhead work, not only bench angles.",
  horizontal_pull: "Horizontal pull to balance pressing and build mid-back thickness.",
  vertical_pull: "Vertical pull for lats — the main “pull-down / pull-up” pattern.",
  isolation: "Isolation finisher: extra volume on a muscle without another big compound.",
};

function explainPick(ex, debtMap, label) {
  const names = (ids) =>
    ids.map((id) => MUSCLE_MAP[id]?.name || id).filter(Boolean);
  const prim = names(ex.primary);
  const lagging = ex.primary
    .filter((id) => (debtMap[id]?.debt || 0) > 0.5)
    .map((id) => MUSCLE_MAP[id]?.name || id);

  const lines = [];
  if (ex.why) lines.push(ex.why);

  // Why today
  if (lagging.length) {
    lines.push(
      `In this session because ${lagging.join(" & ")} still need weekly volume (coverage debt).`
    );
  } else if (ex.role === "compound") {
    lines.push(
      `In this session as a main ${ex.pattern.replace(/_/g, " ")} compound for ${label}.`
    );
  } else {
    lines.push(
      `In this session as support work for ${prim.join(" & ") || "the focus muscles"}.`
    );
  }

  const job = PATTERN_JOB[ex.pattern];
  if (job && ex.role === "compound") lines.push(job);

  if (ex.secondary?.length) {
    const sec = names(ex.secondary);
    if (sec.length) {
      lines.push(`Also lightly works: ${sec.join(", ")}.`);
    }
  }

  return lines.join(" ");
}

function scaleSets(base, setScale) {
  const s = Math.round((base || 3) * (setScale || 1));
  return Math.max(2, Math.min(5, s));
}

function appendEx(chosen, ex, debtMap, usedIds, usedPatterns, minutesUsed, budget, sets, label, setScale) {
  let s = sets != null ? sets : scaleSets(ex.sets, setScale);
  let est = s * ex.minPerSet;
  if (minutesUsed + est > budget && s > 2) {
    s = 2;
    est = s * ex.minPerSet;
  }
  if (minutesUsed + est > budget) return minutesUsed;
  // Capture debt *before* applying this exercise so the "why today" is accurate
  const why = explainPick(ex, debtMap, label || "this workout");
  chosen.push({
    exerciseId: ex.id,
    name: ex.name,
    sets: s,
    reps: ex.reps,
    primary: [...ex.primary],
    secondary: [...ex.secondary],
    minutes: Math.round(est * 10) / 10,
    pattern: ex.pattern,
    role: ex.role,
    why,
    done: false,
  });
  usedIds.add(ex.id);
  usedPatterns.add(ex.pattern);
  applyLocalDebt(debtMap, contribFromEx(ex, s));
  return minutesUsed + est;
}

/**
 * @param {object} [dose] from DOSE_PROFILES — sessionMinutes, setScale, maxExercises, isolationBonus
 */
function buildSession(iso, label, focusList, debts, recovery, settings, rationale, dose = null) {
  const focus = new Set(focusList);
  const debtMap = Object.fromEntries(debts.map((d) => [d.muscleId, { ...d }]));
  const setScale = dose?.setScale ?? 1;
  const maxEx = dose?.maxExercises ?? 7;
  const isolationBonus = dose?.isolationBonus ?? 0;
  const budget = (dose?.sessionMinutes || settings.sessionMinutes || 55) - 5;
  const chosen = [];
  const usedIds = new Set();
  const usedPatterns = new Set();
  let minutes = 0;

  const push = (ex, fixedSets = null) => {
    minutes = appendEx(
      chosen, ex, debtMap, usedIds, usedPatterns, minutes, budget, fixedSets, label, setScale
    );
  };

  for (const slot of slotsFor(label)) {
    if (minutes >= budget - 6 || chosen.length >= maxEx) break;
    const ex = pickEx(focus, debtMap, recovery, iso, usedIds, usedPatterns, chosen, settings, slot.patterns, slot.roles);
    if (ex) push(ex);
  }

  if (minutes < budget - 8 && chosen.length < Math.min(5, maxEx)) {
    const ex = pickEx(focus, debtMap, recovery, iso, usedIds, usedPatterns, chosen, settings, null, ["compound", "accessory"]);
    if (ex) push(ex);
  }

  const fillCap = Math.min(maxEx, 7 + isolationBonus);
  while (minutes < budget - 4 && chosen.length < fillCap) {
    const ex = pickEx(focus, debtMap, recovery, iso, usedIds, usedPatterns, chosen, settings, null, ["isolation", "accessory"]);
    if (!ex) break;
    const counts = primaryCounts(chosen);
    if (ex.primary.every((m) => (counts[m] || 0) >= 6 + isolationBonus * 2)) {
      usedIds.add(ex.id);
      continue;
    }
    push(ex);
  }

  for (const eid of ["standing_calf", "cable_crunch", "face_pull"]) {
    if (minutes >= budget - 3 || chosen.length >= maxEx) break;
    if (usedIds.has(eid) || (settings.excludedExercises || []).includes(eid)) continue;
    const ex = EXERCISES.find((e) => e.id === eid);
    if (!ex) continue;
    if (!ex.primary.some((m) => focus.has(m)) && !label.includes("Full Body")) continue;
    const d0 = debtMap[ex.primary[0]];
    if (d0 && d0.debt <= 0 && d0.score < 0.5) continue;
    push(ex, scaleSets(2, setScale));
  }

  return {
    day: iso,
    label: label + (dose?.id === "oed" ? " · OED" : dose?.id === "rough" ? " · Low" : ""),
    focus: focusList,
    exercises: chosen,
    estimatedMinutes: Math.round(minutes * 10) / 10,
    rationale: rationale + (dose ? ` Dose: ${dose.label}.` : ""),
    doseId: dose?.id || "med",
    doseLabel: dose?.label || "Minimum effective dose",
    completed: false,
  };
}

/**
 * @param {string[]} trainingDays ISO dates
 * @param {object} settings
 * @param {{start?:string,end?:string, dayDose?: Record<string,string>, doseProfiles?: object}} [horizon]
 */
export function buildPlan(trainingDays, settings, horizon = {}) {
  const days = [...new Set(trainingDays)].sort();
  if (!days.length) {
    return { sessions: [], coverage: {}, targets: {}, meta: { trainingDays: 0 } };
  }

  let start = horizon.start || days[0].slice(0, 8) + "01";
  // month end
  const sd = parseISO(days[0]);
  const monthEnd = new Date(sd.getFullYear(), sd.getMonth() + 1, 1);
  let end = horizon.end || toISO(monthEnd);

  const startD = parseISO(start);
  const endD = parseISO(end);
  const horizonDays = Math.max(1, (endD - startD) / 86400000);
  const weeks = horizonDays / 7;

  const targets = {};
  for (const m of MUSCLES) targets[m.id] = weeklyTarget(m, settings) * weeks;

  const doseProfiles = horizon.doseProfiles || {};
  const dayDoseMap = horizon.dayDose || {};
  const defaultDoseId = settings.defaultDose || "med";

  // Recovery clock can soften slightly on rough days (slower assumed recovery)
  const recovery = new RecoveryState({
    ...settings,
    recoveryMultiplier:
      (settings.recoveryMultiplier || 1) +
      (doseProfiles[defaultDoseId]?.recoveryBump || 0),
  });
  const weeklySets = {}; // weekKey -> muscle -> sets
  const sessions = [];
  const coverage = {};

  const byWeek = {};
  for (const d of days) {
    const wk = weekKey(d);
    (byWeek[wk] ||= []).push(d);
  }

  for (const d of days) {
    const wk = weekKey(d);
    const weekDays = byWeek[wk];
    const nWeek = weekDays.length;
    const idx = weekDays.indexOf(d);
    const remaining = nWeek - idx;
    const wsets = weeklySets[wk] || {};

    const doseId = dayDoseMap[d] || defaultDoseId;
    const dose = doseProfiles[doseId] || doseProfiles.med || null;

    const debts = computeDebts(wsets, recovery, d, settings, remaining);
    const { label, focus } = pickLabel(debts, settings.splitPreference || "auto", idx, nWeek);
    const top = debts
      .filter((x) => x.score > 0.3)
      .slice(0, 5)
      .map((x) => MUSCLE_MAP[x.muscleId].name);
    const rationale = `${nWeek} session${nWeek === 1 ? "" : "s"} this week → ${label}. Highest debt: ${top.join(", ") || "balanced"}.`;

    const session = buildSession(d, label, focus, debts, recovery, settings, rationale, dose);
    sessions.push(session);

    const contrib = sessionContrib(session);
    recovery.apply(d, contrib);
    weeklySets[wk] = wsets;
    for (const [mid, sets] of Object.entries(contrib)) {
      wsets[mid] = (wsets[mid] || 0) + sets;
      coverage[mid] = (coverage[mid] || 0) + sets;
    }
  }

  const under = MUSCLES.filter(
    (m) => m.tier === "primary" && (coverage[m.id] || 0) < (targets[m.id] || 0) * 0.7
  ).map((m) => m.name);

  return {
    sessions,
    coverage,
    targets,
    meta: {
      start,
      end,
      trainingDays: days.length,
      sessionMinutes: settings.sessionMinutes,
      splitPreference: settings.splitPreference,
      underCoveredPrimaries: under,
      medMultiplier: settings.medMultiplier,
    },
  };
}

/** Same-muscle substitutes for a given exercise (for in-session swap) */
export function substitutesFor(exerciseId, settings) {
  const ex = EXERCISES.find((e) => e.id === exerciseId);
  if (!ex) return [];
  const excluded = new Set(settings.excludedExercises || []);
  return EXERCISES.filter(
    (e) =>
      e.id !== exerciseId &&
      !excluded.has(e.id) &&
      e.pattern === ex.pattern &&
      e.primary.some((m) => ex.primary.includes(m))
  ).slice(0, 8);
}

export function muscleName(id) {
  return MUSCLE_MAP[id]?.name || id;
}
