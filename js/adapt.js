/**
 * In-session adaptive volume: rate how a lift felt → add/drop sets,
 * rebalance remaining work so session muscle coverage still lands.
 */

export const FEEL = {
  easy: "easy",
  right: "right",
  hard: "hard",
};

export const FEEL_LABELS = {
  easy: "Easy — bank another set",
  right: "Right on",
  hard: "Hard — protect recovery",
};

/** Role-based floors/ceilings for planned hard sets. */
export function setBounds(role) {
  if (role === "compound") return { min: 2, max: 5 };
  if (role === "isolation") return { min: 1, max: 4 };
  return { min: 1, max: 4 }; // accessory
}

/**
 * Average RPE from logged hard sets with RPE filled in.
 * @returns {number|null}
 */
export function avgHardRpe(sets = []) {
  const vals = (sets || [])
    .filter((s) => s && s.hard !== false && +s.rpe > 0)
    .map((s) => +s.rpe);
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/**
 * Suggest feel from RPE when user hasn't tapped Easy/Right/Hard.
 * ≤7 → easy, ≥9 → hard, else right.
 */
export function feelFromRpe(avgRpe) {
  if (avgRpe == null || Number.isNaN(avgRpe)) return null;
  if (avgRpe <= 7) return FEEL.easy;
  if (avgRpe >= 9) return FEEL.hard;
  return FEEL.right;
}

function cloneSession(session) {
  return {
    ...session,
    exercises: (session.exercises || []).map((e) => ({
      ...e,
      primary: [...(e.primary || [])],
      secondary: [...(e.secondary || [])],
    })),
    adaptLog: [...(session.adaptLog || [])],
  };
}

/**
 * Apply feel rating for exercise at index.
 * Mutates a clone of session (planned sets + adaptLog). Does not touch logs.
 *
 * @param {object} session live plan session
 * @param {number} exerciseIndex
 * @param {'easy'|'right'|'hard'} feel
 * @param {{ timeBoxMinutes?: number, estimatedMinutes?: number }} [opts]
 * @returns {{ session: object, message: string, delta: number, rebalanced: Array<{name:string, delta:number}> }}
 */
export function applyFeelAdapt(session, exerciseIndex, feel, opts = {}) {
  if (!session?.exercises?.length) {
    return { session, message: "No session", delta: 0, rebalanced: [] };
  }
  if (feel !== FEEL.easy && feel !== FEEL.right && feel !== FEEL.hard) {
    return { session, message: "Unknown feel", delta: 0, rebalanced: [] };
  }

  const next = cloneSession(session);
  const ex = next.exercises[exerciseIndex];
  if (!ex) {
    return { session, message: "Lift not found", delta: 0, rebalanced: [] };
  }

  // Baseline planned sets the first time we adapt this lift
  if (ex.plannedSetsBase == null) ex.plannedSetsBase = +ex.sets || 0;

  const { min, max } = setBounds(ex.role);
  let planned = Math.max(1, +ex.sets || 0);
  let delta = 0;
  let message = "";
  const rebalanced = [];

  if (feel === FEEL.right) {
    ex.lastFeel = FEEL.right;
    ex.adaptNote = "Felt right — plan unchanged";
    next.adaptLog.push({
      at: new Date().toISOString(),
      exerciseId: ex.exerciseId,
      name: ex.name,
      feel,
      delta: 0,
    });
    return {
      session: next,
      message: `${ex.name}: right on — keep the plan`,
      delta: 0,
      rebalanced: [],
    };
  }

  if (feel === FEEL.easy) {
    if (planned < max) {
      planned += 1;
      delta = 1;
      message = `${ex.name}: easy → +1 set (now ${planned})`;
    } else {
      // At cap — bank volume on a later lift that shares primary muscles
      const target = pickRebalanceTarget(next.exercises, exerciseIndex, +1);
      if (target) {
        const t = next.exercises[target.index];
        const tb = setBounds(t.role);
        const before = +t.sets || 0;
        t.sets = Math.min(tb.max, before + 1);
        const d = t.sets - before;
        if (d > 0) {
          rebalanced.push({ name: t.name, delta: d, exerciseId: t.exerciseId, index: target.index });
          message = `${ex.name}: easy but at max sets → +${d} on ${t.name}`;
        } else {
          message = `${ex.name}: already at max sets — bank progress next session`;
        }
      } else {
        message = `${ex.name}: already at max sets — great work`;
      }
    }
  }

  if (feel === FEEL.hard) {
    if (planned > min) {
      planned -= 1;
      delta = -1;
      message = `${ex.name}: hard → −1 set (now ${planned})`;
      // Try to keep muscle coverage via a later lighter lift
      const target = pickRebalanceTarget(next.exercises, exerciseIndex, +1);
      if (target) {
        const t = next.exercises[target.index];
        // Prefer isolation/accessory for catch-up
        if (t.role !== "compound" || target.score >= 1) {
          const tb = setBounds(t.role);
          const before = +t.sets || 0;
          // Only add if we won't blow a tight time-box badly
          const est = +next.estimatedMinutes || opts.estimatedMinutes || 55;
          const box = +opts.timeBoxMinutes || 0;
          const room = box >= 25 ? box - est : 20; // minutes of slack heuristic
          if (room >= -5 || t.role !== "compound") {
            t.sets = Math.min(tb.max, before + 1);
            const d = t.sets - before;
            if (d > 0) {
              rebalanced.push({ name: t.name, delta: d, exerciseId: t.exerciseId, index: target.index });
              message += ` · moved volume to ${t.name}`;
            }
          }
        }
      }
    } else {
      message = `${ex.name}: hard but already at minimum sets — finish clean, no more volume here`;
      // Still try to lighten a later isolation if any
      const laterIso = next.exercises.findIndex(
        (e, i) => i > exerciseIndex && e.role === "isolation" && (+e.sets || 0) > setBounds("isolation").min
      );
      if (laterIso >= 0) {
        const t = next.exercises[laterIso];
        const before = +t.sets || 0;
        t.sets = Math.max(setBounds(t.role).min, before - 1);
        const d = t.sets - before;
        if (d < 0) {
          rebalanced.push({ name: t.name, delta: d, exerciseId: t.exerciseId, index: laterIso });
          message += ` · also −${-d} on ${t.name}`;
        }
      }
    }
  }

  if (delta !== 0) {
    ex.sets = planned;
  }
  ex.lastFeel = feel;
  ex.adaptNote =
    delta > 0
      ? `Adapted: +${delta} set (felt easy)`
      : delta < 0
        ? `Adapted: ${delta} set (felt hard)`
        : rebalanced.length
          ? `Adapted: volume shifted`
          : feel === FEEL.hard
            ? "Felt hard — held minimum"
            : "Felt easy — held max";

  next.adaptLog.push({
    at: new Date().toISOString(),
    exerciseId: ex.exerciseId,
    name: ex.name,
    feel,
    delta,
    rebalanced: rebalanced.map((r) => ({ name: r.name, delta: r.delta })),
  });

  // Soft re-estimate minutes
  const setDeltaTotal = delta + rebalanced.reduce((s, r) => s + r.delta, 0);
  if (setDeltaTotal !== 0 && next.estimatedMinutes) {
    next.estimatedMinutes = Math.max(
      20,
      Math.round(next.estimatedMinutes + setDeltaTotal * 2.5)
    );
  }

  return { session: next, message, delta, rebalanced };
}

/**
 * Pick a later exercise that can absorb ±1 set (prefer shared primaries, then isolation).
 * @returns {{ index: number, score: number } | null}
 */
export function pickRebalanceTarget(exercises, fromIndex, _dir) {
  const src = exercises[fromIndex];
  if (!src) return null;
  const prim = new Set(src.primary || []);
  let best = null;
  let bestScore = -1e9;
  for (let i = fromIndex + 1; i < exercises.length; i++) {
    const e = exercises[i];
    if (e.done || e.skipReason) continue;
    const { min, max } = setBounds(e.role);
    const sets = +e.sets || 0;
    if (sets >= max) continue; // only looking for places to add
    let score = 0;
    const overlap = (e.primary || []).filter((m) => prim.has(m)).length;
    score += overlap * 3;
    if (e.role === "isolation") score += 2;
    if (e.role === "accessory") score += 1;
    if (e.role === "compound") score -= 0.5;
    // Prefer not already adapted hard
    if (e.lastFeel === FEEL.hard) score -= 2;
    if (score > bestScore) {
      bestScore = score;
      best = { index: i, score };
    }
  }
  return best;
}

/**
 * Sync planned set count into the set log array (pad or leave extras).
 * Does not delete logged work — only pads empty slots when planned > log length.
 *
 * @param {Array} logSets
 * @param {number} planned
 * @returns {Array}
 */
export function syncLogSetsToPlan(logSets, planned) {
  const sets = Array.isArray(logSets) ? [...logSets] : [];
  const n = Math.max(1, +planned || 1);
  while (sets.length < n) {
    const prev = sets[sets.length - 1];
    sets.push({
      weight: prev?.weight ?? "",
      reps: prev?.reps ?? "",
      hard: true,
      rpe: "",
    });
  }
  // Never strip completed hard sets — if user logged more than planned, keep them
  return sets;
}
