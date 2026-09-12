/**
 * Progressive coaching: heavy guidance early → unlock customization later.
 * Stages are based on completed sessions (results/experience), not calendar time.
 */

export const COACH_STAGES = {
  guided: {
    id: "guided",
    label: "Guided",
    minSessions: 0,
    maxSessions: 5,
    blurb: "We pick the plan. You show up and lift. Focus on form and finishing sessions. Settings stay open so home gyms can exclude what they don’t have.",
  },
  building: {
    id: "building",
    label: "Building",
    minSessions: 6,
    maxSessions: 14,
    blurb: "Still coached — swap lifts, exclude equipment you lack, and tune split if your schedule differs.",
  },
  custom: {
    id: "custom",
    label: "Custom",
    minSessions: 15,
    maxSessions: Infinity,
    blurb: "You’re in the driver’s seat — tune split, volume, and exclusions freely.",
  },
};

export function countCompletedSessions(completedSessions = {}) {
  return Object.values(completedSessions).filter((s) => s && s.completed).length;
}

/**
 * @param {number} completedCount
 * @param {{ mode?: 'auto'|'guided'|'building'|'custom', forceCustom?: boolean, qualityCount?: number, useQualityGates?: boolean }} prefs
 */
export function resolveCoachStage(completedCount, prefs = {}) {
  if (prefs.forceCustom || prefs.mode === "custom") return COACH_STAGES.custom;
  if (prefs.mode === "guided") return COACH_STAGES.guided;
  if (prefs.mode === "building") return COACH_STAGES.building;
  // Auto: prefer quality sessions (logged hard work) when provided
  const n =
    prefs.useQualityGates && prefs.qualityCount != null
      ? Math.max(completedCount * 0.5, prefs.qualityCount) // never punish pure checkmarks forever, but gate on quality
      : completedCount;
  // Quality path: need qualityCount thresholds; fall back to raw completions if no logs yet
  if (prefs.useQualityGates && prefs.qualityCount != null) {
    const q = prefs.qualityCount;
    // If user has completions but no logs yet, still allow unlock by raw count (migration)
    const effective = q > 0 ? q : completedCount;
    if (effective >= COACH_STAGES.custom.minSessions) return COACH_STAGES.custom;
    if (effective >= COACH_STAGES.building.minSessions) return COACH_STAGES.building;
    return COACH_STAGES.guided;
  }
  if (n >= COACH_STAGES.custom.minSessions) return COACH_STAGES.custom;
  if (n >= COACH_STAGES.building.minSessions) return COACH_STAGES.building;
  return COACH_STAGES.guided;
}

/**
 * Pilot-friendly: exclude / swap / split / volume are always available.
 * Stages still change coaching tone (script density, default “why” open), not hard locks.
 * Home-gym friends need exclusions day one; quality gates no longer gate equipment reality.
 */
export function stageCapabilities(stageId) {
  const openControls = {
    showAdvancedSettings: true,
    allowSplitChange: true,
    allowMedMultiplier: true,
    allowExclude: true,
    allowSwap: true,
    lockFullBody: false,
  };
  switch (stageId) {
    case "custom":
      return {
        ...openControls,
        showCoachScript: true,
        showWhyDefaultOpen: false,
      };
    case "building":
      return {
        ...openControls,
        showCoachScript: true,
        showWhyDefaultOpen: true,
      };
    case "guided":
    default:
      return {
        ...openControls,
        showCoachScript: true,
        showWhyDefaultOpen: true,
      };
  }
}

/** Evidence-backed script for today's session (educational). */
export function buildCoachScript({ stage, session, completedCount, nextSession }) {
  if (!session) {
    return {
      headline: "No train day locked in yet",
      mission: "Open Plan and tap the days you can train. The planner will build full-body MED sessions around those days.",
      science: "Consistency of hard sets per muscle across the week beats perfect programs you skip. Mark real available days only.",
      steps: [
        "Open the Plan tab",
        "Tap each day you can get to a commercial gym",
        "Come back to Today — your session will be ready",
      ],
      progressNote: `${completedCount} session${completedCount === 1 ? "" : "s"} completed so far.`,
    };
  }

  const compounds = session.exercises.filter((e) => e.role === "compound");
  const isolations = session.exercises.filter((e) => e.role !== "compound");
  const steps = session.exercises.map((ex, i) => {
    const shortWhy = (ex.why || "").split(/(?<=\.)\s+/)[0] || "Covers needed muscle volume.";
    return `${i + 1}. ${ex.name} — ${ex.sets}×${ex.reps}. ${shortWhy}`;
  });

  const stageLine =
    stage.id === "guided"
      ? "Guided mode: follow the list in order. Swap or exclude in Settings if a lift isn’t available."
      : stage.id === "building"
        ? "Building mode: swap a lift if equipment is missing or it doesn’t feel right."
        : "Custom mode: adjust freely in Settings — keep MED targets in mind.";

  const volumeLine = `About ${session.estimatedMinutes} minutes · ${compounds.length} main lifts${
    isolations.length ? ` + ${isolations.length} support` : ""
  }.`;
  // Program sessions: lead with scheme / slot notes (wave, BBB, hypertrophy day)
  const mission = session.schemeNotes
    ? `${session.schemeNotes}. ${volumeLine} ${stageLine}`
    : `${volumeLine} ${stageLine}`;

  return {
    headline: session.label,
    mission,
    science:
      "Resistance training grows strength when you apply progressive overload and enough weekly hard sets, then recover. Compounds hit multiple muscles per minute (high ROI under time pressure). Isolation only fills gaps. Meta-analyses support ~1.6 g protein/kg/day and creatine 3–5 g/day as high-confidence aids; they don’t replace the sets.",
    steps,
    progressNote: `${completedCount} completed · stage: ${stage.label}. ${
      nextSession
        ? `Next plan day: ${nextSession.day} (${nextSession.label}).`
        : "Add more train days on Plan when you know them."
    }`,
    unlockHint:
      stage.id === "guided"
        ? "Exclude lifts you don’t have and change split anytime in Settings. Log hard sets so coaching notes get sharper as you bank sessions."
        : stage.id === "building"
          ? "Keep logging hard sets. Split, volume, and exclusions are open in Settings whenever your schedule or gear changes."
          : "You’re in Custom. Drop what doesn’t work; keep what does. Rebuild plan after changes.",
  };
}

const PUSH_MUSCLES = new Set(["chest", "front_delts", "side_delts", "triceps"]);
const PULL_MUSCLES = new Set(["lats", "upper_back", "rear_delts", "biceps"]);

/**
 * Planned push vs pull bias for a session (primary muscles × sets).
 * @returns {"push"|"pull"|"balanced"|null}
 */
export function sessionPushPullBias(session) {
  let push = 0;
  let pull = 0;
  for (const ex of session?.exercises || []) {
    if (ex.isGap) continue;
    const sets = Number(ex.sets) || 0;
    for (const m of ex.primary || []) {
      if (PUSH_MUSCLES.has(m)) push += sets;
      if (PULL_MUSCLES.has(m)) pull += sets;
    }
  }
  if (push + pull < 4) return null;
  const ratio = push / Math.max(pull, 0.5);
  if (ratio > 1.35) return "push";
  if (ratio < 0.75) return "pull";
  return "balanced";
}

function cueLoad(weight) {
  if (weight == null || weight === "") return "";
  const n = Number(weight);
  if (!Number.isFinite(n)) return String(weight);
  return Number.isInteger(n) ? String(n) : String(n);
}

function sessionIds(session) {
  return new Set((session?.exercises || []).filter((e) => e && !e.isGap && e.exerciseId).map((e) => e.exerciseId));
}

/**
 * One quiet Today cue from the log. Cover still holds the full insight list.
 * Priority: deload → repeated pain on a lift in today → stagnation on a lift in today
 * → missed days → push/pull skew that today would worsen → journal sleep/fuel → on-track.
 *
 * @returns {{ id: string, tone: string, title: string, body: string, action: string|null, exerciseId?: string } | null}
 */
export function buildLogCoachCue({
  session = null,
  completedCount = 0,
  deloadSuggested = false,
  deloadReason = "",
  stagnant = [],
  weekMissed = 0,
  loggedBalance = null,
  painOnSession = [],
  journalCue = null,
} = {}) {
  const ids = sessionIds(session);

  if (deloadSuggested) {
    return {
      id: "deload",
      tone: "ember",
      title: "Consider a 7-day deload",
      body: `${deloadReason || "Recovery is behind the work"}. Low dose on train days — don't add sets to catch up.`,
      action: "deload",
    };
  }

  const pain = (painOnSession || []).find((p) => ids.has(p.exerciseId) && p.n >= 2);
  if (pain) {
    return {
      id: "pain",
      tone: "warn",
      title: `${pain.name || pain.exerciseId} flagged ${pain.n}×`,
      body: "Repeated pain on a lift that's in today. Swap it or keep the load easy — volume isn't worth a flare.",
      action: null,
      exerciseId: pain.exerciseId,
    };
  }

  const stuck = (stagnant || []).find((s) => ids.has(s.exerciseId));
  if (stuck) {
    const load = cueLoad(stuck.weight);
    return {
      id: "stagnation",
      tone: "warn",
      title: `${stuck.name || stuck.exerciseId} stuck${load ? ` at ${load}` : ""}`,
      body: `Same top load for ${stuck.sessions} sessions. Add a rep or a small plate — don't pile extra sets.`,
      action: null,
      exerciseId: stuck.exerciseId,
    };
  }

  if (weekMissed >= 1) {
    return {
      id: "missed",
      tone: "warn",
      title: session ? "Don't stack missed volume" : "Missed days — don't stack volume",
      body: session
        ? `${weekMissed} missed this week. Today's session is the dose. Skip makeup sets.`
        : `${weekMissed} train day${weekMissed === 1 ? "" : "s"} missed this week. Mark real days on Plan. Makeup sets steal recovery.`,
      action: null,
    };
  }

  const todayBias = sessionPushPullBias(session);
  if (loggedBalance === "push" && todayBias === "push") {
    return {
      id: "balance-push",
      tone: "warn",
      title: "Push-heavy lately",
      body: "Logged push is outrunning pull. If you swap, prefer a row or pulldown.",
      action: null,
    };
  }
  if (loggedBalance === "pull" && todayBias === "pull") {
    return {
      id: "balance-pull",
      tone: "warn",
      title: "Pull-heavy lately",
      body: "Logged pull is outrunning push. Keep the presses if joints feel good.",
      action: null,
    };
  }

  if (journalCue?.id === "journal-sleep-energy") {
    return {
      id: "sleep",
      tone: "warn",
      title: "Sleep before extra sets",
      body: "Low energy often follows poor sleep. MED today is enough.",
      action: null,
    };
  }
  if (journalCue?.id === "journal-fuel-pain") {
    return {
      id: "fuel",
      tone: "warn",
      title: "Fuel before hard sets",
      body: "Under-fueled days have been pairing with more pain. Eat, then lift — don't add volume.",
      action: null,
    };
  }

  if (!session) return null;

  if (completedCount >= 3) {
    return {
      id: "on-track",
      tone: "ok",
      title: "Load the next-target sheet",
      body: "Work the listed loads. Rate Easy / Right / Hard after the set if feel shifts.",
      action: null,
    };
  }

  return {
    id: "first-logs",
    tone: "dim",
    title: "Log the working sets",
    body: "Weight × reps on each lift. Cover and next-session targets get sharp after a few hard days.",
    action: null,
  };
}
