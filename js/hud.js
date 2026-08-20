/**
 * Hologram HUD — scanlines, boot plate, optional field drone.
 * Numbers/logging stay untouched. Reduced motion skips cinema.
 */

export const AUDIO_KEY = "il_hud_audio";

export function prefersReducedMotion() {
  try {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
  } catch {
    return false;
  }
}

export function isHudAudioOn() {
  try {
    return localStorage.getItem(AUDIO_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setHudAudioOn(on) {
  try {
    localStorage.setItem(AUDIO_KEY, on ? "on" : "off");
  } catch {
    /* private mode */
  }
}

let audio = null;

function makeDrone(ctx) {
  const master = ctx.createGain();
  master.gain.value = 0.0001;
  master.connect(ctx.destination);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 92;
  filter.Q.value = 0.7;
  filter.connect(master);

  const freqs = [38, 40.5, 76];
  const oscs = freqs.map((hz, i) => {
    const o = ctx.createOscillator();
    o.type = i === 2 ? "triangle" : "sawtooth";
    o.frequency.value = hz;
    const g = ctx.createGain();
    g.gain.value = i === 2 ? 0.12 : 0.22;
    o.connect(g);
    g.connect(filter);
    o.start();
    return o;
  });

  return {
    ctx,
    master,
    oscs,
    stop() {
      try {
        oscs.forEach((o) => o.stop());
        ctx.close();
      } catch {
        /* already closed */
      }
    },
  };
}

export async function startHudDrone() {
  if (prefersReducedMotion()) return false;
  if (!isHudAudioOn()) return false;
  if (audio?.ctx && audio.ctx.state !== "closed") {
    if (audio.ctx.state === "suspended") await audio.ctx.resume();
    return true;
  }
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return false;
  const ctx = new Ctx();
  audio = makeDrone(ctx);
  if (ctx.state === "suspended") await ctx.resume();
  const now = ctx.currentTime;
  audio.master.gain.cancelScheduledValues(now);
  audio.master.gain.setValueAtTime(0.0001, now);
  audio.master.gain.exponentialRampToValueAtTime(0.045, now + 1.6);
  return true;
}

export function stopHudDrone() {
  if (!audio) return;
  const { ctx, master } = audio;
  try {
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), now);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    setTimeout(() => {
      audio?.stop();
      audio = null;
    }, 400);
  } catch {
    audio.stop();
    audio = null;
  }
}

export function paintHudAudioButton() {
  const btn = document.getElementById("hud-audio-toggle");
  if (!btn) return;
  const on = isHudAudioOn() && !prefersReducedMotion();
  btn.setAttribute("aria-pressed", on ? "true" : "false");
  btn.title = on ? "Mute field drone" : "Unmute field drone";
  btn.setAttribute("aria-label", btn.title);
  btn.textContent = on ? "◈" : "◇";
}

export function wireHudAudio() {
  paintHudAudioButton();
  const btn = document.getElementById("hud-audio-toggle");
  btn?.addEventListener("click", async (e) => {
    e.stopPropagation();
    const next = !isHudAudioOn();
    setHudAudioOn(next);
    if (next) await startHudDrone();
    else stopHudDrone();
    paintHudAudioButton();
  });

  const arm = async () => {
    document.removeEventListener("pointerdown", arm);
    if (isHudAudioOn()) await startHudDrone();
    paintHudAudioButton();
  };
  document.addEventListener("pointerdown", arm, { once: true, passive: true });
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
