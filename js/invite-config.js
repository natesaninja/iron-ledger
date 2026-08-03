/**
 * Invite-only access (client gate).
 *
 * HOW TO ADD / ROTATE CODES
 * 1. Pick a new code (share only by DM / in person — not on public social).
 * 2. Hash it:
 *      py -3 -c "import hashlib; print(hashlib.sha256('YOUR-CODE'.lower().encode()).hexdigest())"
 * 3. Paste the hex into INVITE_HASHES below (do not put plain codes in this file).
 * 4. Commit + push. Remove a hash to revoke that code.
 *
 * This is invite-only for friends/coworkers, not bank security.
 * Keep the GitHub repo PRIVATE so the public cannot browse source.
 */
export const INVITE_REQUIRED = true;

/** SHA-256 (hex) of invite codes (normalized: trim + lower case). */
export const INVITE_HASHES = [
  // Owner pilot
  "3a2ea3a30f9b4348699cd6d44adb05f583d615bef1a509259ed14392a1f3d3e2",
  // Coworker invites (share codes privately — see INVITE.md)
  "a212fab718503f6a5fabdfde521c30a0ef47e23f83c48c91ed362510ce908b4b",
  "a33bc9b6b0531e5e5a49215fe1c10d989cb0d72ffd76e6e5363c50dab073c263",
  "cab97c5c56a78b2fb8f1264f141ac53d7d988d6e687f916b2fa750713ac88c8d",
];
