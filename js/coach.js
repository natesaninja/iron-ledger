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

  return {
    headline: session.label,
    mission: `About ${session.estimatedMinutes} minutes · ${compounds.length} main lifts${isolations.length ? ` + ${isolations.length} support` : ""}. ${stageLine}`,
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
