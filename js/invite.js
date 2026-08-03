/**
 * Invite-only unlock — supports:
 *   ?i=crew1          short share token (easiest)
 *   ?invite=CODE      full code in link
 *   typing a code     on the gate screen
 */
import {
  INVITE_REQUIRED,
  INVITE_HASHES,
  INVITE_TOKENS,
  INVITE_SHARE_SLOTS,
  APP_PUBLIC_URL,
} from "./invite-config.js";

const LS_KEY = "il_invite_ok_v1";
const LS_CODE_HINT = "il_invite_hint_v1";
const LS_TOKEN = "il_invite_token_v1";

export { INVITE_SHARE_SLOTS, APP_PUBLIC_URL };

export function inviteRequired() {
  // Hard off while INVITE_REQUIRED is false — never block the app shell
  if (INVITE_REQUIRED === false || INVITE_REQUIRED == null) return false;
  return (INVITE_HASHES?.length || 0) > 0;
}

export function isInviteUnlocked() {
  // Always treat as unlocked when invites are disabled
  if (!inviteRequired()) return true;
  try {
    return localStorage.getItem(LS_KEY) === "1";
  } catch {
    return true;
  }
}

export function clearInviteUnlock() {
  try {
    localStorage.removeItem(LS_KEY);
    localStorage.removeItem(LS_CODE_HINT);
    localStorage.removeItem(LS_TOKEN);
  } catch {
    /* ok */
  }
}

export function buildInviteUrl(token, baseUrl = null) {
  const base = (baseUrl || APP_PUBLIC_URL || (typeof location !== "undefined" ? location.origin + location.pathname : "")).replace(
    /\/?$/,
    "/"
  );
  const t = String(token || "").trim().toLowerCase();
  if (!t) return base;
  return `${base}?i=${encodeURIComponent(t)}`;
}

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function normalizeCode(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

function persistUnlock(hint, token) {
  localStorage.setItem(LS_KEY, "1");
  if (hint) localStorage.setItem(LS_CODE_HINT, hint);
  if (token) localStorage.setItem(LS_TOKEN, token);
}

/**
 * @returns {Promise<{ok:boolean, error?:string, via?:string}>}
 */
export async function tryUnlockInvite(rawCode) {
  if (!inviteRequired()) return { ok: true };
  const code = normalizeCode(rawCode);
  if (!code) return { ok: false, error: "Enter your invite code" };

  // Short token (crew1, pilot, …)
  if (INVITE_TOKENS[code]) {
    try {
      persistUnlock(code, code);
    } catch {
      return { ok: false, error: "Could not save unlock on this device" };
    }
    return { ok: true, via: "token" };
  }

  let hash;
  try {
    hash = await sha256Hex(code);
  } catch {
    return { ok: false, error: "This browser can’t verify invites" };
  }

  const allowed = new Set(INVITE_HASHES.map((h) => h.toLowerCase()));
  if (!allowed.has(hash)) {
    return { ok: false, error: "Invalid invite code" };
  }

  try {
    persistUnlock(code.slice(-4), null);
  } catch {
    return { ok: false, error: "Could not save unlock on this device" };
  }
  return { ok: true, via: "code" };
}

/**
 * Auto-unlock from URL query, then clean the address bar.
 * @returns {Promise<{ok:boolean, unlocked:boolean, error?:string}>}
 */
export async function tryUnlockFromUrl() {
  if (!inviteRequired()) return { ok: true, unlocked: true };
  if (isInviteUnlocked()) {
    scrubInviteParams();
    return { ok: true, unlocked: true };
  }

  let params;
  try {
    params = new URLSearchParams(window.location.search || "");
  } catch {
    return { ok: true, unlocked: false };
  }

  const token = params.get("i") || params.get("invite") || params.get("code");
  if (!token) return { ok: true, unlocked: false };

  const result = await tryUnlockInvite(token);
  scrubInviteParams();
  if (!result.ok) return { ok: false, unlocked: false, error: result.error };
  return { ok: true, unlocked: true };
}

function scrubInviteParams() {
  try {
    const url = new URL(window.location.href);
    ["i", "invite", "code"].forEach((k) => url.searchParams.delete(k));
    const clean = url.pathname + (url.search || "") + (url.hash || "");
    window.history.replaceState({}, "", clean);
  } catch {
    /* ok */
  }
}

export function showInviteGate() {
  const el = document.getElementById("invite-gate");
  const app = document.querySelector(".app");
  const nav = document.querySelector(".bottom-nav");
  if (el) el.hidden = false;
  if (app) app.hidden = true;
  if (nav) nav.hidden = true;
  document.getElementById("onboard")?.setAttribute("hidden", "");
}

export function hideInviteGate() {
  const el = document.getElementById("invite-gate");
  const app = document.querySelector(".app");
  const nav = document.querySelector(".bottom-nav");
  if (el) el.hidden = true;
  if (app) app.hidden = false;
  if (nav) nav.hidden = false;
}
