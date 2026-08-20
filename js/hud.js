/**
 * Hologram HUD — scanlines and boot plate only. No audio (gym music apps).
 * Numbers/logging stay untouched. Reduced motion skips cinema.
 */

export function prefersReducedMotion() {
  try {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
  } catch {
    return false;
  }
}

export function runHudBoot() {
  const el = document.getElementById("hud-boot");
  if (!el) return Promise.resolve();
  if (prefersReducedMotion()) {
    el.hidden = true;
    return Promise.resolve();
  }

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
