/**
 * Invite-only access.
 *
 * Easy share links (short tokens — put in the URL):
 *   https://natesaninja.github.io/iron-ledger/?i=crew1
 *
 * Full codes still work if typed, or ?invite=IRON-CREW-01
 *
 * To add someone:
 * 1. Add a short token → hash below (hash of the secret code they can also type).
 * 2. Push. Share only the link with ?i=token (or code privately).
 *
 * Keep the GitHub repo PRIVATE.
 */
export const INVITE_REQUIRED = true;

/**
 * Short link tokens → SHA-256 of the real code (trim + lower case).
 * Share: .../iron-ledger/?i=crew1
 */
export const INVITE_TOKENS = {
  // You
  pilot: "3a2ea3a30f9b4348699cd6d44adb05f583d615bef1a509259ed14392a1f3d3e2",
  // Coworkers — one link each
  crew1: "a212fab718503f6a5fabdfde521c30a0ef47e23f83c48c91ed362510ce908b4b",
  crew2: "a33bc9b6b0531e5e5a49215fe1c10d989cb0d72ffd76e6e5363c50dab073c263",
  crew3: "cab97c5c56a78b2fb8f1264f141ac53d7d988d6e687f916b2fa750713ac88c8d",
};

/** All accepted hashes (tokens + any extra codes). */
export const INVITE_HASHES = [...new Set(Object.values(INVITE_TOKENS))];

/**
 * Labels for one-tap share UI (no secrets here — only short tokens).
 * Full codes live only in INVITE.md for typing fallback.
 */
export const INVITE_SHARE_SLOTS = [
  { token: "pilot", label: "You (pilot)", blurb: "Your link" },
  { token: "crew1", label: "Coworker 1", blurb: "Tap copy → text them" },
  { token: "crew2", label: "Coworker 2", blurb: "Tap copy → text them" },
  { token: "crew3", label: "Coworker 3", blurb: "Tap copy → text them" },
];

export const APP_PUBLIC_URL = "https://natesaninja.github.io/iron-ledger/";
