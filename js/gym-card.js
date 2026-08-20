/**
 * Printable gym sheet — one page, blank lines to log by hand if the phone stays in the locker.
 */

export function gymCardLineCount(plannedSets, loggedCount) {
  const planned = Math.max(0, +plannedSets || 0);
  const logged = Math.max(0, +loggedCount || 0);
  return Math.max(3, planned, logged);
}

export function gymCardRows(session, logs = {}, nameOf = (id) => id) {
  const dayLogs = logs?.[session?.day]?.exercises || {};
  return (session?.exercises || []).map((ex) => {
    const logged = dayLogs[ex.exerciseId]?.sets || [];
    const n = gymCardLineCount(ex.sets, logged.length);
    const lines = [];
    for (let i = 0; i < n; i++) {
      const s = logged[i] || {};
      lines.push({
        n: i + 1,
        weight: s.weight === 0 || s.weight ? String(s.weight) : "",
        reps: s.reps === 0 || s.reps ? String(s.reps) : "",
        rpe: s.rpe === 0 || s.rpe ? String(s.rpe) : "",
      });
    }
    return {
      id: ex.exerciseId,
      name: nameOf(ex.exerciseId) || ex.name || ex.exerciseId,
      role: ex.role || "",
      target: ex.reps || "",
      plannedSets: +ex.sets || 0,
      lines,
    };
  });
}

export function gymCardHeading(session, weekdayFn) {
  const day = session?.day || "";
  const wd = typeof weekdayFn === "function" ? weekdayFn(day) : "";
  const label = session?.label || "Session";
  return ["Iron Ledger", wd, label].filter(Boolean).join(" · ");
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function gymCardHtml(session, logs, opts = {}) {
  const nameOf = opts.nameOf || ((id) => id);
  const heading = gymCardHeading(session, opts.weekdayShort);
  const rows = gymCardRows(session, logs, nameOf);
  const lifts = rows
    .map((row) => {
      const cells = row.lines
        .map(
          (ln) => `<tr>
            <td>${ln.n}</td>
            <td>${escapeHtml(ln.weight)}</td>
            <td>${escapeHtml(ln.reps)}</td>
            <td>${escapeHtml(ln.rpe)}</td>
            <td></td>
          </tr>`
        )
        .join("");
      return `<section class="gym-lift">
        <h2>${escapeHtml(row.name)}</h2>
        <p>${escapeHtml(row.role)}${row.target ? ` · ${escapeHtml(row.target)}` : ""} · ${row.plannedSets} sets</p>
        <table>
          <thead><tr><th>#</th><th>Load</th><th>Reps</th><th>RPE</th><th>Notes</th></tr></thead>
          <tbody>${cells}</tbody>
        </table>
      </section>`;
    })
    .join("");
  return `<article class="gym-sheet">
    <header>
      <p class="gym-kicker">FIELD CARD</p>
      <h1>${escapeHtml(heading)}</h1>
      <p class="gym-meta">${escapeHtml(session?.day || "")} · leave the phone · log here · enter later</p>
    </header>
    ${lifts || "<p>No lifts planned.</p>"}
  </article>`;
}
