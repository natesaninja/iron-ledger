/**
 * Home-screen install coach (PWA). No store. iOS = A2HS instructions, Android = install prompt.
 */

export const INSTALL_DISMISS_KEY = "il_install_coach_dismissed";

/**
 * @param {{ matchMedia?: Function, navigator?: { standalone?: boolean }, referrer?: string }} [env]
 */
export function isStandaloneDisplay(env = {}) {
  const matchMedia = env.matchMedia;
  const nav = env.navigator || (typeof navigator !== "undefined" ? navigator : {});
  try {
    if (typeof matchMedia === "function") {
      if (matchMedia("(display-mode: standalone)")?.matches) return true;
      if (matchMedia("(display-mode: fullscreen)")?.matches) return true;
      if (matchMedia("(display-mode: minimal-ui)")?.matches) return true;
    } else if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
      if (window.matchMedia("(display-mode: standalone)").matches) return true;
      if (window.matchMedia("(display-mode: fullscreen)").matches) return true;
    }
  } catch {
    /* jsdom / node */
  }
  if (nav.standalone === true) return true;
  const ref = env.referrer != null ? env.referrer : typeof document !== "undefined" ? document.referrer : "";
  if (typeof ref === "string" && ref.startsWith("android-app:")) return true;
  return false;
}

/** @param {string} [ua] @param {{ maxTouchPoints?: number }} [nav] */
export function detectInstallPlatform(ua, nav) {
  const s = ua || (typeof navigator !== "undefined" ? navigator.userAgent : "");
  if (/iPhone|iPad|iPod/i.test(s)) return "ios";
  const n = nav || (typeof navigator !== "undefined" ? navigator : null);
  if (n && n.maxTouchPoints > 1 && /Macintosh/i.test(s)) return "ios";
  if (/Android/i.test(s)) return "android";
  return "other";
}

/**
 * @param {{ standalone: boolean, dismissed: boolean, platform: string }} opts
 */
export function shouldShowInstallCoach({ standalone, dismissed, platform }) {
  if (standalone || dismissed) return false;
  return platform === "ios" || platform === "android";
}

/** @param {string} platform */
export function installCoachCopy(platform) {
  if (platform === "ios") {
    return {
      title: "Add to Home Screen",
      body: "Safari → Share → Add to Home Screen. Open from the icon — no URL bar. Don’t delete the icon to update.",
      action: "dismiss",
      actionLabel: "Got it",
    };
  }
  if (platform === "android") {
    return {
      title: "Install Iron Ledger",
      body: "Install to the home screen for a full-screen app and offline sessions.",
      action: "install",
      actionLabel: "Install",
    };
  }
  return {
    title: "Iron Ledger",
    body: "Open this URL in Chrome (Android) or Safari (iPhone), then install / Add to Home Screen.",
    action: "dismiss",
    actionLabel: "Got it",
  };
}

export function readInstallDismissed(storage) {
  try {
    return storage?.getItem?.(INSTALL_DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeInstallDismissed(storage) {
  try {
    storage?.setItem?.(INSTALL_DISMISS_KEY, "1");
  } catch {
    /* private mode */
  }
}

const APP_VIEWS = new Set(["today", "plan", "coverage", "supps", "settings"]);

/** @param {string} search location.search or query without ? */
export function parseAppView(search) {
  const raw = String(search || "");
  const q = raw.startsWith("?") ? raw.slice(1) : raw;
  let view = "";
  try {
    view = new URLSearchParams(q).get("view") || "";
  } catch {
    return null;
  }
  return APP_VIEWS.has(view) ? view : null;
}

export function envFromWindow(win = typeof window !== "undefined" ? window : null) {
  if (!win) {
    return { matchMedia: () => ({ matches: false }), navigator: {}, referrer: "" };
  }
  return {
    matchMedia: (q) => win.matchMedia(q),
    navigator: win.navigator,
    referrer: win.document?.referrer || "",
  };
}
