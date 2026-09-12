/**
 * Hologram HUD — scanlines and boot plate only. No audio (gym music apps).
 * Numbers/logging stay untouched. Reduced motion skips cinema.
 * Boot plate plays once per app version (first session of that version).
 */

export const HUD_BOOT_SEEN_KEY = "il_hud_boot_seen";

export function prefersReducedMotion() {
  try {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
  } catch {
    return false;
  }
}

/**
 * @param {{ version?: string, reducedMotion?: boolean, storage?: { getItem?: Function } | null }} [opts]
 */
export function shouldRunHudBoot({ version = "", reducedMotion = false, storage = null } = {}) {
  if (reducedMotion) return false;
  try {
    const seen = storage?.getItem?.(HUD_BOOT_SEEN_KEY);
    if (!seen) return true;
    const ver = String(version || "");
    if (!ver) return false;
    return seen !== ver;
  } catch {
    return true;
  }
}

export function markHudBootSeen(version = "", storage = null) {
  try {
    storage?.setItem?.(HUD_BOOT_SEEN_KEY, String(version || "1"));
  } catch {
    /* private / quota */
  }
}

function hudStorage(name) {
  try {
    if (name === "local" && typeof localStorage !== "undefined") return localStorage;
    if (name === "session" && typeof sessionStorage !== "undefined") return sessionStorage;
  } catch {
    /* blocked */
  }
  return null;
}

export function runHudBoot(version = "") {
  const el = document.getElementById("hud-boot");
  if (!el) return Promise.resolve();

  const reduced = prefersReducedMotion();
  const local = hudStorage("local");
  const session = hudStorage("session");
  const play =
    shouldRunHudBoot({ version, reducedMotion: reduced, storage: local }) &&
    shouldRunHudBoot({ version, reducedMotion: reduced, storage: session });

  if (!play) {
    el.hidden = true;
    document.documentElement.classList.add("hud-skip-boot");
    document.documentElement.classList.remove("is-booting");
    return Promise.resolve();
  }

  markHudBootSeen(version, local);
  markHudBootSeen(version, session);

  el.hidden = false;
  el.classList.remove("is-out");
  document.documentElement.classList.remove("hud-skip-boot");
  document.documentElement.classList.add("is-booting");

  return new Promise((resolve) => {
    window.setTimeout(() => {
      el.classList.add("is-out");
      window.setTimeout(() => {
        el.hidden = true;
        document.documentElement.classList.remove("is-booting");
        resolve();
      }, 320);
    }, 1800);
  });
}

export function enableHudChrome() {
  document.documentElement.classList.add("hud-on");
  if (prefersReducedMotion()) document.documentElement.classList.add("hud-static");
}
