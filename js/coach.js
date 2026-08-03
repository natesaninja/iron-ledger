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
    blurb: "We pick the plan. You show up and lift. Focus on form and finishing sessions.",
  },
  building: {
    id: "building",
    label: "Building",
    minSessions: 6,
    maxSessions: 14,
    blurb: "Still coached, but you can swap exercises and exclude what doesn’t fit.",
  },
  custom: {
    id: "custom",
    label: "Custom",
    minSessions: 15,
    maxSessions: Infinity,
    blurb: "You’re back in the driver’s seat — tune split, volume, and exclusions freely.",
  },
};

export function countCompletedSessions(completedSessions = {}) {
  return Object.values(completedSessions).filter((s) => s && s.completed).length;
}

/**
 * @param {number} completedCount
 * @param {{ mode?: 'auto'|'guided'|'building'|'custom', forceCustom?: boolean }} prefs
 */
export function resolveCoachStage(completedCount, prefs = {}) {
  if (prefs.forceCustom || prefs.mode === "custom") return COACH_STAGES.custom;
  if (prefs.mode === "guided") return COACH_STAGES.guided;
  if (prefs.mode === "building") return COACH_STAGES.building;
  // auto by results
  if (completedCount >= COACH_STAGES.custom.minSessions) return COACH_STAGES.custom;
  if (completedCount >= COACH_STAGES.building.minSessions) return COACH_STAGES.building;
  return COACH_STAGES.guided;
}

export function stageCapabilities(stageId) {
  switch (stageId) {
    case "custom":
      return {
        showAdvancedSettings: true,
        allowSplitChange: true,
        allowMedMultiplier: true,
        allowExclude: true,
        allowSwap: true,
        lockFullBody: false,
        showCoachScript: true,
        showWhyDefaultOpen: false,
      };
    case "building":
      return {
        showAdvancedSettings: false,
        allowSplitChange: false,
        allowMedMultiplier: false,
        allowExclude: true,
        allowSwap: true,
        lockFullBody: true,
        showCoachScript: true,
        showWhyDefaultOpen: true,
      };
    case "guided":
    default:
      return {
        showAdvancedSettings: false,
        allowSplitChange: false,
        allowMedMultiplier: false,
        allowExclude: false,
        allowSwap: false,
        lockFullBody: true,
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
      ? "Guided mode: follow the list in order. Don’t add extra exercises yet."
      : stage.id === "building"
        ? "Building mode: you may swap a lift if a machine is taken or it doesn’t feel right."
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
        ? `Complete ${Math.max(0, COACH_STAGES.building.minSessions - completedCount)} more session(s) to unlock exercise swaps & exclusions — or stay Guided until you’re ready.`
        : stage.id === "building"
          ? `Complete ${Math.max(0, COACH_STAGES.custom.minSessions - completedCount)} more session(s) to unlock full Custom (split & volume), or force Custom in Settings when you feel back to baseline.`
          : "You’re in Custom. Drop what doesn’t work; keep what does. Rebuild plan after changes.",
  };
}
