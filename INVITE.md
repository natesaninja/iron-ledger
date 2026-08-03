# Iron Ledger — private + invite-only

## Your invite codes (keep private)

Share **one code per person** by text/DM — not on Twitter/Reddit.

| Code | Use |
|------|-----|
| `IRON-PILOT-2026` | You (owner) |
| `IRON-CREW-01` | Coworker 1 |
| `IRON-CREW-02` | Coworker 2 |
| `IRON-CREW-03` | Coworker 3 |

**Do not commit this file if you ever make the repo public again.**  
Right now the repo should be **private** — only GitHub collaborators can see source.

---

## What you set up

1. **GitHub repo private** — source not world-readable  
2. **Invite gate in the app** — URL alone is not enough; need a code once per device  

---

## How to invite someone

1. Send them the app link (see live URL in README or Settings after you unlock).  
2. Send them **one** invite code from the table.  
3. They open the link → enter code → **Unlock** → Add to Home Screen.  
4. Code is remembered on **that phone** until they revoke or clear site data.

---

## Rotate / revoke a code

1. Generate a new code.  
2. Hash it:

```powershell
py -3 -c "import hashlib; print(hashlib.sha256('NEW-CODE-HERE'.lower().encode()).hexdigest())"
```

3. Edit `js/invite-config.js` — add new hash, remove old hash.  
4. Commit + push.  
5. Tell that person the new code (their old unlock still works on devices that already unlocked until they clear data — for hard revoke they’d need to clear site data or you change `LS_KEY` in `invite.js`).

Hard revoke everyone: change `LS_KEY` in `js/invite.js` (e.g. `il_invite_ok_v2`).

---

## GitHub: who can see the code

**Settings → Collaborators** (or org teams): invite GitHub usernames only for people who should see source.

App users do **not** need GitHub accounts — only an invite code.

---

## If the live site stops loading after making the repo private

GitHub Free sometimes limits Pages on private repos. Options:

1. **GitHub Pro** — private repo + Pages often works  
2. Keep repo private; host the built static files on **Cloudflare Pages** + optional Access  
3. Local/Wi‑Fi only via `run.bat` for a tiny pilot  

The invite gate still works on any host.

---

## Limits (honest)

Client-side invite codes stop casual visitors and coworkers without a code.  
They are **not** the same as server login. Pair with a **private repo** so the implementation isn’t public on GitHub.
