/**
 * Training journal — per-lift + per-session how you felt, fuel/supp context, Cover insights.
 * Educational pattern-finding only — not medical advice.
 */

export const PAIN_LEVELS = [
  { id: 0, label: "None" },
  { id: 1, label: "Mild" },
  { id: 2, label: "Med" },
  { id: 3, label: "Sharp" },
];

export const ENERGY_HIT_LEVELS = [
  { id: 0, label: "OK" },
  { id: 1, label: "Tired" },
  { id: 2, label: "Wrecked" },
];

export const SCALE_1_5 = [1, 2, 3, 4, 5];

export const PAIN_AREAS = [
  { id: "knee", label: "Knees" },
  { id: "hip", label: "Hips" },
  { id: "low_back", label: "Low back" },
  { id: "shoulder", label: "Shoulders" },
  { id: "elbow", label: "Elbows" },
  { id: "wrist", label: "Wrists" },
  { id: "neck", label: "Neck" },
  { id: "other", label: "Other" },
];

export const FUEL_TAGS = [
  { id: "under", label: "Under-fueled" },
  { id: "ok", label: "Normal" },
  { id: "heavy", label: "Heavy meal" },
];

export function emptyExerciseJournalEntry() {
  return {
    pain: null,
    energyHit: null,
    jointOk: null,
    note: "",
    at: null,
  };
}

export function emptySessionJournalEntry() {
  return {
    energy: null,
    mood: null,
    motivation: null,
    stress: null,
    sleepQuality: null,
    sleepHours: null,
    soreness: null,
    sessionRpe: null,
    painAreas: [],
    fuel: null,
    proteinHit: null,
    stackTaken: null,
    caffeine: null,
    alcohol: null,
    illness: null,
    note: "",
    at: null,
  };
}

/** Merge partial into existing exercise journal row. */
export function patchExerciseJournal(prev, patch) {
  return {
    ...emptyExerciseJournalEntry(),
    ...(prev || {}),
    ...patch,
    at: new Date().toISOString(),
  };
}

export function patchSessionJournal(prev, patch) {
  const base = { ...emptySessionJournalEntry(), ...(prev || {}), ...patch };
  if (patch && Object.prototype.hasOwnProperty.call(patch, "painAreas")) {
    base.painAreas = Array.isArray(patch.painAreas) ? [...patch.painAreas] : [];
  }
  base.at = new Date().toISOString();
  return base;
}

function avg(nums) {
  const xs = nums.filter((n) => n != null && Number.isFinite(+n));
  if (!xs.length) return null;
  return xs.reduce((a, b) => a + +b, 0) / xs.length;
}

/**
 * Cover insights from session + exercise journals.
 * Needs several logged sessions before pattern claims.
 */
export function buildJournalInsights({
  sessionJournal = {},
  exerciseJournal = {},
  completedSessions = {},
  dayDose = {},
  today = null,
  lookbackDays = 21,
} = {}) {
  const t = today || new Date().toISOString().slice(0, 10);
  const items = [];
  const days = Object.keys(sessionJournal || {})
    .filter((d) => d <= t)
    .sort()
    .reverse()
    .slice(0, lookbackDays);

  const entries = days
    .map((d) => ({ day: d, ...(sessionJournal[d] || {}) }))
    .filter((e) => e.at || e.energy != null || e.mood != null || e.sleepQuality != null);

  const completedLookback = Object.keys(completedSessions || {})
    .filter((d) => d <= t && completedSessions[d]?.completed)
    .sort()
    .reverse()
    .slice(0, lookbackDays);

  const journaledCompleted = completedLookback.filter((d) => sessionJournal[d]?.at).length;
  if (completedLookback.length >= 3) {
    items.push({
      id: "journal-streak",
      tone: journaledCompleted / completedLookback.length >= 0.6 ? "ok" : "dim",
      title: `Session journal ${journaledCompleted}/${completedLookback.length} recent`,
      body:
        journaledCompleted < 3
          ? "Log energy/mood/sleep after a few more sessions to unlock pattern hints."
          : "Enough data to spot rough patterns — still educational, not diagnosis.",
    });
  } else if (entries.length === 0) {
    items.push({
      id: "journal-empty",
      tone: "dim",
      title: "Training journal ready",
      body: "After lifts, tap pain/energy chips. After the session, log mood, sleep, fuel, and stack — Cover will connect dots over time.",
    });
    return { items, entries };
  }

  if (entries.length >= 5) {
    const poorSleep = entries.filter((e) => e.sleepQuality != null && e.sleepQuality <= 2);
    const poorSleepLowEnergy = poorSleep.filter((e) => e.energy != null && e.energy <= 2);
    if (poorSleep.length >= 3 && poorSleepLowEnergy.length >= 2) {
      items.push({
        id: "journal-sleep-energy",
        tone: "warn",
        title: "Low energy often follows poor sleep",
        body: `${poorSleepLowEnergy.length}/${poorSleep.length} poor-sleep days also logged low energy. Protect sleep before stacking stimulants.`,
      });
    }

    const alcoholDays = entries.filter((e) => e.alcohol === true);
    const alcoholRough = alcoholDays.filter(
      (e) => (e.energy != null && e.energy <= 2) || dayDose[e.day] === "rough"
    );
    if (alcoholDays.length >= 2 && alcoholRough.length >= 2) {
      items.push({
        id: "journal-alcohol",
        tone: "warn",
        title: "Alcohol nights often look rough next day",
        body: `${alcoholRough.length}/${alcoholDays.length} alcohol-tagged entries had low energy or Rough dose. Worth watching.`,
      });
    }

    const underFuel = entries.filter((e) => e.fuel === "under");
    const underHighPain = underFuel.filter((e) => {
      const ex = exerciseJournal[e.day] || {};
      const pains = Object.values(ex)
        .map((x) => x?.pain)
        .filter((p) => p != null);
      const m = avg(pains);
      return (m != null && m >= 2) || (e.soreness != null && e.soreness >= 4);
    });
    if (underFuel.length >= 3 && underHighPain.length >= 2) {
      items.push({
        id: "journal-fuel-pain",
        tone: "warn",
        title: "Under-fueled days pair with more pain/soreness",
        body: `${underHighPain.length}/${underFuel.length} under-fueled sessions. Try a normal meal window before hard days.`,
      });
    }

    const missedStack = entries.filter((e) => e.stackTaken === false);
    const tookStack = entries.filter((e) => e.stackTaken === true);
    const avgMoodMiss = avg(missedStack.map((e) => e.mood));
    const avgMoodTook = avg(tookStack.map((e) => e.mood));
    if (missedStack.length >= 3 && tookStack.length >= 3 && avgMoodMiss != null && avgMoodTook != null) {
      if (avgMoodTook - avgMoodMiss >= 0.8) {
        items.push({
          id: "journal-stack-mood",
          tone: "ok",
          title: "Mood looks better on stack-taken days",
          body: `Avg mood ${avgMoodTook.toFixed(1)} with stack vs ${avgMoodMiss.toFixed(1)} without (self-report). Not proof — keep logging.`,
        });
      }
    }

    const recent = entries.slice(0, 7);
    const eAvg = avg(recent.map((e) => e.energy));
    const mAvg = avg(recent.map((e) => e.mood));
    const sAvg = avg(recent.map((e) => e.soreness));
    if (eAvg != null || mAvg != null || sAvg != null) {
      const bits = [];
      if (eAvg != null) bits.push(`energy ${eAvg.toFixed(1)}`);
      if (mAvg != null) bits.push(`mood ${mAvg.toFixed(1)}`);
      if (sAvg != null) bits.push(`soreness ${sAvg.toFixed(1)}`);
      items.push({
        id: "journal-recent-avg",
        tone: "ok",
        title: `Last ${recent.length} journaled sessions`,
        body: `${bits.join(" · ")} (1–5 scales).`,
      });
    }
  }

  // Per-lift pain hotspots
  const painByEx = {};
  for (const day of days.slice(0, 14)) {
    const map = exerciseJournal[day] || {};
    for (const [eid, row] of Object.entries(map)) {
      if (row?.pain == null || row.pain < 2) continue;
      if (!painByEx[eid]) painByEx[eid] = { n: 0, sum: 0 };
      painByEx[eid].n += 1;
      painByEx[eid].sum += row.pain;
    }
  }
  const hot = Object.entries(painByEx)
    .filter(([, v]) => v.n >= 2)
    .sort((a, b) => b[1].n - a[1].n)
    .slice(0, 3);
  if (hot.length) {
    items.push({
      id: "journal-lift-pain",
      tone: "warn",
      title: "Repeated lift pain flags",
      body: hot.map(([id, v]) => `${id} ×${v.n}`).join(" · ") + ". Swap, deload, or get checked if it persists.",
    });
  }

  return { items, entries };
}
