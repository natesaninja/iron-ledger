/**
 * Set logs, progression, PRs, warm-ups, rest defaults — pure helpers (no DOM).
 */
import { EXERCISES, MUSCLES } from "./data.js";

const EX_MAP = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));
const MUSCLE_MAP = Object.fromEntries(MUSCLES.map((m) => [m.id, m]));

/** Short form cues (educational). */
export const FORM_CUES = {
  bb_back_squat: ["Brace, sit between the hips", "Knees track over toes", "Drive the floor away"],
  leg_press: ["Full foot contact", "Don't lock out harshly", "Control the return"],
  hack_squat: ["Back flat on pad", "Depth you can own", "Push through mid-foot"],
  leg_extension: ["Pad on lower shin", "Squeeze at the top", "Slow lower"],
  rdl: ["Soft knees, hips back", "Bar close to legs", "Feel hamstrings stretch"],
  conventional_dl: ["Wedge in, brace", "Push floor, don't yank", "Lock hips and knees together"],
  seated_leg_curl: ["Hips stay down", "Full curl without lifting seat", "Slow eccentric"],
  hip_thrust: ["Chin tucked, ribs down", "Drive through heels", "Squeeze glutes at top"],
  cable_pull_through: ["Hinge, not squat", "Arms stay long", "Glutes finish"],
  bb_bench: ["Feet planted, slight arch", "Bar to lower chest", "Elbows ~45°"],
  db_bench: ["Wrists stacked", "Deep but controlled", "Don't crash the bells"],
  incline_db_press: ["Upper back tight", "Press up and slightly in", "Don't flare elbows wide"],
  chest_press_machine: ["Scapulae set", "Full range you own", "Pause briefly at stretch"],
  cable_fly: ["Soft elbows fixed", "Hug a tree", "Chest squeeze, not traps"],
  ohp: ["Glutes tight, ribs down", "Bar path close to face", "Lockout without leaning back"],
  db_shoulder_press: ["Neutral or slight external rotation", "Don't shrug into ears", "Control the bottom"],
  machine_shoulder_press: ["Seat so handles start near shoulders", "Full lock without shrugging", "Smooth tempo"],
  lateral_raise: ["Soft elbows", "Lead with elbows", "Stop at ~shoulder height"],
  cable_lateral: ["Slight lean into cable", "Raise in scapular plane", "Slow lower"],
  face_pull: ["Pull to face/forehead", "External rotation at end", "Don't shrug"],
  reverse_pec_deck: ["Chest on pad", "Open elbows wide", "Squeeze rear delts"],
  pullup: ["Full hang to chin clearance", "Drive elbows down", "No kipping needed"],
  lat_pulldown: ["Chest up, slight lean", "Bar to upper chest", "Control the stretch"],
  bb_row: ["Hinge and brace", "Pull to lower ribs", "Don't yank with lumbar"],
  chest_supported_row: ["Chest stays glued", "Squeeze shoulder blades", "Full stretch at bottom"],
  seated_cable_row: ["Tall torso", "Pull to sternum", "Don't round mid-pull"],
  straight_arm_pulldown: ["Soft elbows fixed", "Push bar to thighs", "Feel lats"],
  bb_curl: ["Elbows pinned", "No swing", "Full squeeze"],
  db_curl: ["Supinate through the curl", "Control lower", "One arm at a time ok"],
  triceps_pushdown: ["Elbows at sides", "Only forearm moves", "Full lock soft"],
  oh_triceps_ext: ["Elbows high", "Stretch at bottom", "Don't flare wide"],
  standing_calf: ["Full stretch bottom", "Pause at top", "Don't bounce"],
  seated_calf: ["Slow tempo", "Full ROM", "Ball of foot on platform"],
  cable_crunch: ["Round upper spine", "Hips relatively still", "Exhale hard"],
  plank: ["Ribs down, glutes on", "Long neck", "Breathe"],
  shrug: ["Up, not roll", "Pause at top", "Control down"],
  back_extension: ["Hinge at hips", "Neutral neck", "Don't hyperextend hard"],
  walking_lunge: ["Long step, upright torso", "Knee tracks toe", "Push through front heel"],
};

export const SKIP_REASONS = [
  { id: "machine", label: "Machine taken" },
  { id: "joint", label: "Joint / pain" },
  { id: "time", label: "Out of time" },
  { id: "energy", label: "Energy" },
  { id: "other", label: "Other" },
];

export const REST_PRESETS = [
  { sec: 45, label: "45s" },
  { sec: 90, label: "90s" },
  { sec: 120, label: "2m" },
  { sec: 180, label: "3m" },
];

export function restDefaultForRole(role) {
  if (role === "compound") return 120;
  if (role === "accessory") return 90;
  return 60;
}

export function emptyExerciseLog() {
  return { sets: [], skipReason: null };
}

export function ensureDayLog(logs, iso) {
  if (!logs[iso]) logs[iso] = { exercises: {} };
  if (!logs[iso].exercises) logs[iso].exercises = {};
  return logs[iso];
}

export function ensureExerciseLog(logs, iso, exerciseId) {
  const day = ensureDayLog(logs, iso);
  if (!day.exercises[exerciseId]) day.exercises[exerciseId] = emptyExerciseLog();
  return day.exercises[exerciseId];
}

/** Parse "5-8" or "8-12/leg" or "30-60s" → { lo, hi, isTime } */
export function parseRepRange(reps) {
  const s = String(reps || "").toLowerCase();
  if (s.includes("s") && !s.includes("x")) {
    const m = s.match(/(\d+)\s*[-–]\s*(\d+)/);
    if (m) return { lo: +m[1], hi: +m[2], isTime: true };
    const n = parseInt(s, 10);
    return { lo: n || 30, hi: n || 60, isTime: true };
  }
  const m = s.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (m) return { lo: +m[1], hi: +m[2], isTime: false };
  const n = parseInt(s, 10);
  return { lo: n || 8, hi: n || 12, isTime: false };
}

/**
 * Most recent working sets for an exercise before (or on) iso, excluding current day if empty preference.
 */
export function lastWorkingSets(logs, exerciseId, beforeIso = null) {
  if (!logs) return null;
  const days = Object.keys(logs).sort().reverse();
  for (const day of days) {
    if (beforeIso && day > beforeIso) continue;
    if (beforeIso && day === beforeIso) {
      // allow same day only if we want "previous session" — skip same day for "last time"
      continue;
    }
    const ex = logs[day]?.exercises?.[exerciseId];
    const hard = (ex?.sets || []).filter((s) => s && (s.hard !== false) && (s.reps > 0 || s.weight > 0));
    if (hard.length) {
      return { day, sets: hard.map((s) => ({ weight: +s.weight || 0, reps: +s.reps || 0, rpe: s.rpe })) };
    }
  }
  return null;
}

/** Epley e1RM from best set */
export function epley1RM(weight, reps) {
  const w = +weight || 0;
  const r = +reps || 0;
  if (w <= 0 || r <= 0) return 0;
  if (r === 1) return w;
  return Math.round(w * (1 + r / 30) * 10) / 10;
}

export function bestSetE1rm(sets) {
  let best = 0;
  for (const s of sets || []) {
    const e = epley1RM(s.weight, s.reps);
    if (e > best) best = e;
  }
  return best;
}

/**
 * Suggest next session targets from last working sets + rep range string.
 * Returns { lines: string[], sets: {weight,reps}[] }
 */
export function suggestNext(last, repRangeStr) {
  if (!last?.sets?.length) {
    return { lines: ["First log — pick a hard but clean weight"], sets: [] };
  }
  const { lo, hi, isTime } = parseRepRange(repRangeStr);
  if (isTime) {
    return {
      lines: [`Last: ${last.sets.map((s) => `${s.reps}s`).join(", ")} · hold quality`],
      sets: last.sets.map((s) => ({ weight: s.weight, reps: s.reps })),
    };
  }
  const weights = last.sets.map((s) => +s.weight || 0);
  const reps = last.sets.map((s) => +s.reps || 0);
  const topW = Math.max(...weights);
  const allHitTop = reps.every((r) => r >= hi);
  const allInRange = reps.every((r) => r >= lo);
  let nextW = topW;
  let nextReps = reps.map((r) => Math.min(hi, Math.max(lo, r)));
  let note = "Match last";
  if (allHitTop && topW > 0) {
    // bump small plate
    nextW = topW >= 100 ? topW + 5 : topW + 2.5;
    nextReps = last.sets.map(() => lo);
    note = `All sets hit ${hi}+ → try ${formatLoad(nextW)} × ${lo}+`;
  } else if (allInRange) {
    nextReps = reps.map((r) => Math.min(hi, r + 1));
    note = `In range → same weight, chase +1 rep`;
  } else {
    note = `Stay at ${formatLoad(topW)} until every set ≥ ${lo}`;
  }
  const sets = last.sets.map((_, i) => ({
    weight: nextW,
    reps: nextReps[i] ?? lo,
  }));
  const lastLine = `Last (${last.day.slice(5)}): ${last.sets.map((s) => `${formatLoad(s.weight)}×${s.reps}`).join(", ")}`;
  return { lines: [lastLine, `Suggested: ${note}`], sets };
}

export function formatLoad(w) {
  if (w == null || w === "" || Number.isNaN(+w)) return "—";
  const n = +w;
  if (n === 0) return "BW";
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);
}

/** Warm-up ladder for a working weight */
export function warmupLadder(workWeight, role) {
  const w = +workWeight || 0;
  if (w <= 0) {
    return role === "compound"
      ? ["Empty bar / light set × 8–10", "One more light–moderate set"]
      : ["1 light feeler set"];
  }
  if (role === "isolation") {
    return [`~${formatLoad(Math.round(w * 0.6))} × 10 (feeler)`];
  }
  const steps = [
    { pct: 0.4, reps: 8 },
    { pct: 0.6, reps: 5 },
    { pct: 0.8, reps: 3 },
  ];
  return steps
    .filter((s) => w * s.pct >= 20 || s.pct >= 0.5)
    .map((s) => `${formatLoad(roundPlate(w * s.pct))} × ${s.reps}`);
}

function roundPlate(w) {
  return Math.round(w * 2) / 2;
}

/**
 * Pattern → PR category for the board
 */
export const PR_PATTERNS = [
  { id: "squat", label: "Squat" },
  { id: "hinge", label: "Hinge" },
  { id: "horizontal_push", label: "Horiz. push" },
  { id: "vertical_push", label: "Vert. push" },
  { id: "horizontal_pull", label: "Horiz. pull" },
  { id: "vertical_pull", label: "Vert. pull" },
];

export function computePrBoard(logs) {
  const byPattern = {};
  for (const p of PR_PATTERNS) byPattern[p.id] = null;

  for (const [day, dayLog] of Object.entries(logs || {})) {
    for (const [eid, exLog] of Object.entries(dayLog.exercises || {})) {
      const meta = EX_MAP[eid];
      if (!meta || meta.role === "isolation") continue;
      const pat = meta.pattern;
      if (!byPattern.hasOwnProperty(pat)) continue;
      const hard = (exLog.sets || []).filter((s) => s && (+s.weight || 0) > 0 && (+s.reps || 0) > 0);
      if (!hard.length) continue;
      for (const s of hard) {
        const e1 = epley1RM(s.weight, s.reps);
        const cur = byPattern[pat];
        if (!cur || e1 > cur.e1rm) {
          byPattern[pat] = {
            exerciseId: eid,
            name: meta.name,
            weight: +s.weight,
            reps: +s.reps,
            e1rm: e1,
            day,
          };
        }
      }
    }
  }
  return PR_PATTERNS.map((p) => ({ ...p, best: byPattern[p.id] }));
}

/** Chronological session history from completedSessions + logs */
export function buildHistory(completedSessions, logs, planSessions = []) {
  const planMap = Object.fromEntries((planSessions || []).map((s) => [s.day, s]));
  const days = new Set([
    ...Object.keys(completedSessions || {}),
    ...Object.keys(logs || {}),
  ]);
  const rows = [];
  for (const day of [...days].sort().reverse()) {
    const done = completedSessions?.[day];
    const log = logs?.[day];
    const planned = planMap[day];
    const hasLog = log && Object.keys(log.exercises || {}).some((id) => (log.exercises[id].sets || []).length);
    if (!done?.completed && !hasLog) continue;
    let hardSets = 0;
    let prs = 0;
    const lifts = [];
    for (const [eid, exLog] of Object.entries(log?.exercises || {})) {
      const sets = (exLog.sets || []).filter((s) => s && (s.hard !== false));
      if (!sets.length && !exLog.skipReason) continue;
      hardSets += sets.length;
      const name = EX_MAP[eid]?.name || eid;
      if (sets.length) {
        const top = sets.reduce((a, b) => (epley1RM(b.weight, b.reps) > epley1RM(a.weight, a.reps) ? b : a));
        lifts.push(`${name} ${formatLoad(top.weight)}×${top.reps}`);
      } else if (exLog.skipReason) {
        lifts.push(`${name} (skipped)`);
      }
    }
    rows.push({
      day,
      completed: !!done?.completed,
      doseId: done?.doseId || planned?.doseId || "med",
      label: planned?.label || done?.label || "Session",
      minutes: planned?.estimatedMinutes || done?.minutes || null,
      hardSets,
      lifts: lifts.slice(0, 4),
      skipTags: Object.values(log?.exercises || {})
        .map((e) => e.skipReason)
        .filter(Boolean),
    });
  }
  return rows;
}

/**
 * Logged hard-set equivalents per muscle (primary full, secondary 0.5), for a date range.
 */
export function loggedCoverage(logs, fromIso, toIso) {
  const cov = {};
  for (const [day, dayLog] of Object.entries(logs || {})) {
    if (fromIso && day < fromIso) continue;
    if (toIso && day >= toIso) continue;
    for (const [eid, exLog] of Object.entries(dayLog.exercises || {})) {
      const meta = EX_MAP[eid];
      if (!meta) continue;
      const n = (exLog.sets || []).filter((s) => s && s.hard !== false && (+s.reps > 0 || +s.weight > 0)).length;
      if (!n) continue;
      for (const m of meta.primary || []) cov[m] = (cov[m] || 0) + n;
      for (const m of meta.secondary || []) cov[m] = (cov[m] || 0) + n * 0.5;
    }
  }
  return cov;
}

/** Quality session: completed + at least one compound with a logged hard set */
export function countQualitySessions(completedSessions, logs) {
  let n = 0;
  for (const [day, done] of Object.entries(completedSessions || {})) {
    if (!done?.completed) continue;
    const exs = logs?.[day]?.exercises || {};
    let ok = false;
    for (const [eid, exLog] of Object.entries(exs)) {
      const meta = EX_MAP[eid];
      if (!meta || meta.role !== "compound") continue;
      if ((exLog.sets || []).some((s) => s && s.hard !== false && (+s.reps > 0 || +s.weight > 0))) {
        ok = true;
        break;
      }
    }
    // fallback: any logged hard set counts as partial quality after first weeks
    if (!ok) {
      ok = Object.values(exs).some((exLog) =>
        (exLog.sets || []).some((s) => s && s.hard !== false && +s.reps > 0)
      );
    }
    if (ok) n++;
  }
  return n;
}

/** Count rough days in last N calendar days */
export function roughDaysRecent(dayDose, days = 7, today = null) {
  const t = today || new Date().toISOString().slice(0, 10);
  const tDate = new Date(t + "T12:00:00");
  let n = 0;
  for (let i = 0; i < days; i++) {
    const d = new Date(tDate);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    if ((dayDose || {})[iso] === "rough") n++;
  }
  return n;
}

export function stackCheckinDone(stackCheckins, iso, stackIds) {
  if (!stackIds?.length) return true;
  const day = stackCheckins?.[iso] || {};
  return stackIds.every((id) => day[id]);
}

/** Rank substitutes: same pattern, muscle overlap, similar time, preferred first */
export function rankSubstitutes(exerciseId, settings, preferred = []) {
  const ex = EX_MAP[exerciseId];
  if (!ex) return [];
  const excluded = new Set(settings.excludedExercises || []);
  const pref = new Set(preferred.length ? preferred : settings.preferredExercises || []);
  const scored = [];
  for (const e of EXERCISES) {
    if (e.id === exerciseId || excluded.has(e.id)) continue;
    if (e.pattern !== ex.pattern) continue;
    const overlap = e.primary.filter((m) => ex.primary.includes(m)).length;
    if (!overlap) continue;
    const secOverlap = (e.secondary || []).filter((m) =>
      [...ex.primary, ...(ex.secondary || [])].includes(m)
    ).length;
    const timeDiff = Math.abs((e.minPerSet || 2) - (ex.minPerSet || 2));
    let score = overlap * 10 + secOverlap * 2 - timeDiff;
    if (pref.has(e.id)) score += 5;
    if (e.role === ex.role) score += 2;
    scored.push({ ...e, _score: score, _job: sameJobBlurb(ex, e) });
  }
  scored.sort((a, b) => b._score - a._score);
  return scored.slice(0, 10);
}

function sameJobBlurb(a, b) {
  const muscles = b.primary.map((id) => MUSCLE_MAP[id]?.name || id).join(" & ");
  return `Same ${b.pattern.replace(/_/g, " ")} job · ${muscles}`;
}

export function seedSetsFromSuggestion(suggest, plannedSets) {
  const n = Math.max(plannedSets || 3, 1);
  if (suggest.sets?.length) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const s = suggest.sets[i] || suggest.sets[suggest.sets.length - 1];
      out.push({ weight: s.weight, reps: s.reps, hard: true, rpe: "" });
    }
    return out;
  }
  return Array.from({ length: n }, () => ({ weight: "", reps: "", hard: true, rpe: "" }));
}
