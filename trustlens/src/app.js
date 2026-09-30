(function () {
  const D = window.TL_DATA, E = window.TL_ENGINE;
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pct = (n) => Math.round(n * 100);

  const VERDICT = {
    reliable: { cls: "good", color: "var(--good)", title: "You can rely on this answer", sub: "Approved, owned, current and consistent across sources." },
    resolved: { cls: "good", color: "var(--good)", title: "Likely correct - conflicting sources were outranked", sub: "Weaker or outdated sources disagree. Here is why they lose." },
    caution: { cls: "warn", color: "var(--warn)", title: "Use with caution - confirm before sending", sub: "An answer exists, but the trust signals are not strong enough." },
    conflict: { cls: "bad", color: "var(--bad)", title: "Sources disagree - do not answer yet", sub: "No source clearly outranks the others. Ask an expert." },
    gap: { cls: "bad", color: "var(--bad)", title: "No reliable knowledge for this context", sub: "Do not guess. The system points you to the right person instead." },
  };
  const SHORT = { reliable: "Reliable", resolved: "Likely correct", caution: "Caution", conflict: "Conflict", gap: "Gap" };

  const state = {
    tab: "answer",
    scenarioId: D.SCENARIOS[0].id,
    country: D.SCENARIOS[0].defaultCountry,
    kb: clone(D.SOURCES),
    log: [],
    draftFor: null,
  };

  const scenario = () => D.SCENARIOS.find((s) => s.id === state.scenarioId);
  const analyze = (sc, country) => E.analyze(sc, state.kb, { country }, D.REF_DATE);
  const cname = (c) => D.COUNTRIES.find((x) => x.code === c).name;

  function toast(msg) {
    document.querySelectorAll(".toast").forEach((x) => x.remove());
    const t = document.createElement("div");
    t.className = "toast"; t.setAttribute("role", "status"); t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
  }

  /* ---------------- Answer tab ---------------- */
  function renderAnswer() {
    const sc = scenario(), ctx = { country: state.country };
    const a = analyze(sc, state.country), v = VERDICT[a.verdict];
    const reasons = E.explain(a);
    const experts = E.rankExperts(D.EXPERTS, sc, ctx).slice(0, 3);

    const scenarioChips = D.SCENARIOS.map((s) =>
      `<button class="chip" data-act="scenario" data-id="${s.id}" aria-pressed="${s.id === state.scenarioId}"><b>${esc(s.label)}</b><span>${esc(s.story)}</span></button>`).join("");

    const countryOpts = D.COUNTRIES.map((c) => `<option value="${c.code}" ${c.code === state.country ? "selected" : ""}>${c.name}</option>`).join("");

    const hasVerified = state.kb.some((s) => s.topic === sc.id && s.countries.includes(state.country) && /^Verified|^Expert/.test(s.type));

    return `
      <div class="scenarios" role="group" aria-label="Scenario">${scenarioChips}</div>
      <div class="ask">
        <q>${esc(sc.question)}</q>
        <label class="ctx">Customer country
          <select data-act="country" aria-label="Customer country">${countryOpts}</select>
        </label>
      </div>
      <div class="grid">
        <div class="stack">
          <section class="verdict ${v.cls}" aria-live="polite">
            <div class="gauge" style="background:conic-gradient(${v.color} ${a.confidence}%, #ffffffaa 0)"><div>${a.confidence}</div></div>
            <h2>${v.title}</h2>
            <p>${v.sub}</p>
          </section>

          <section class="card">
            ${answerBlock(sc, a)}
            ${a.gaps.length ? `<div class="gaps"><b>Gaps and risks detected</b><ul>${a.gaps.map((g) => `<li>${esc(g)}</li>`).join("")}</ul></div>` : ""}
          </section>

          <section class="card">
            <h2>Why can I rely on this?</h2>
            <p class="sub">Every reason below comes from a visible rule, not from a black box.</p>
            <ul class="why">${reasons.map((r, i) => `<li class="${reasonKind(a, r, i)}">${esc(r)}</li>`).join("")}</ul>
          </section>

          <section class="card">
            <h2>What the organisation knows (${a.items.length} sources)</h2>
            <p class="sub">Ranked by trust for a ${esc(cname(state.country))} customer. The strip shows what each trust signal contributes.</p>
            <div class="legend">
              <span style="--c:var(--c-fresh)">Freshness</span><span style="--c:var(--c-owner)">Ownership</span>
              <span style="--c:var(--c-auth)">Authority</span><span style="--c:var(--c-corr)">Corroboration</span>
            </div>
            ${a.items.map((it) => sourceCard(it, a, sc)).join("")}
          </section>
        </div>

        <aside class="stack">
          <section class="card">
            <h2>${a.verdict === "reliable" ? "Want a second opinion?" : "Who can confirm this?"}</h2>
            <p class="sub">Documents are not enough. These people are ranked by country, topic, track record and recent activity.</p>
            ${experts.map((x, i) => expertCard(x, i === 0 && a.verdict !== "reliable", sc, a)).join("")}
          </section>

          <section class="card">
            <h2>Capture what you just learned</h2>
            <p class="sub">Each answer should make the next one easier.</p>
            <div class="acts">
              <button class="btn primary" data-act="publish" ${!a.leader || a.verdict === "gap" || hasVerified ? "disabled" : ""}>Save as verified answer</button>
              <button class="btn" data-act="reset">Reset demo</button>
            </div>
            ${state.log.length ? `<ul class="log" style="margin-top:14px">${state.log.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>` : `<p class="sub" style="margin:12px 0 0">Try: flag a source as outdated, confirm it is still valid, or claim an ownerless page. The trust score reacts immediately.</p>`}
          </section>
        </aside>
      </div>`;
  }

  function reasonKind(a, r, i) {
    if (/no owner|left|Overdue|Nothing reliable|only (draft|unreviewed|outdated)/i.test(r)) return "bad";
    if (/say something different|weaker/i.test(r)) return "warn";
    return "";
  }

  function answerBlock(sc, a) {
    if (a.verdict === "gap") {
      const hint = a.leader ? `<p class="answer alt">Closest (unreliable) hint: ${esc(ans(sc, a.top))}<small>${esc(a.top.src.title)}. Not safe to send to a customer.</small></p>` : "";
      return `<h2>Suggested reply</h2><p class="answer">I don't have a reliable answer yet for ${esc(cname(state.country))}. I'm confirming with a local expert and will come back to you today.</p>${hint}`;
    }
    if (a.verdict === "conflict") {
      return `<h2>Two competing answers</h2>` + a.ranked.map((g, i) =>
        `<p class="answer alt"><strong>Option ${String.fromCharCode(65 + i)}:</strong> ${esc(ans(sc, g.items[0]))}<small>Best supporting source: ${esc(g.items[0].src.title)} (trust ${pct(g.best)}/100)</small></p>`).join("");
    }
    return `<h2>Suggested reply</h2><p class="answer">${esc(ans(sc, a.top))}</p>`;
  }
  const ans = (sc, item) => sc.answers[item.src.claimValue] || item.src.excerpt;

  function sourceCard(it, a, sc) {
    const s = it.src;
    const lead = a.top && a.top === it;
    const says = ans(sc, it).split(/(?<=\.)\s/)[0];
    const agrees = a.leader && s.claimValue === a.leader.value;
    const strip = ["fresh", "owner", "auth", "corr"].map((k) => `<i style="width:${(it.parts[k] * 100).toFixed(1)}%"></i>`).join("");
    const canAct = it.applic > 0;
    return `<article class="src ${lead ? "lead" : ""} ${it.applic === 0 ? "dim" : ""}">
      <header><h3>${esc(s.title)}</h3><span class="meta">${esc(s.type)} &middot; ${esc(s.location)} &middot; ${s.countries.join("/")}</span></header>
      <blockquote>${esc(s.excerpt)}</blockquote>
      ${it.applic > 0 ? `<div class="says ${agrees ? "yes" : "no"}">${agrees ? "Supports the suggested answer" : "Contradicts the suggested answer"}: ${esc(says)}</div>` : ""}
      <div class="strip" aria-label="Trust score ${pct(it.score)} out of 100"><div class="track">${strip}</div><b>${pct(it.score)}/100</b></div>
      <div class="flags">${it.flags.map((f) => `<span class="flag ${f.kind}">${esc(f.text)}</span>`).join("")}</div>
      ${canAct ? `<div class="acts">
        <button class="btn" data-act="confirm" data-id="${s.id}">Confirm still valid</button>
        <button class="btn" data-act="flag" data-id="${s.id}" ${s.status === "outdated" ? "disabled" : ""}>Flag as outdated</button>
        ${!s.owner ? `<button class="btn" data-act="claim" data-id="${s.id}">I'll own this</button>` : ""}
      </div>` : ""}
    </article>`;
  }

  function expertCard(x, best, sc, a) {
    const e = x.expert, open = state.draftFor === e.id;
    return `<div class="exp ${best ? "best" : ""}">
      <h3>${esc(e.name)}</h3>
      <p>${esc(e.role)} &middot; ${esc(e.availability)}</p>
      <p>Why: ${esc(x.why.join(", "))}</p>
      <div class="acts" style="margin-top:6px">
        <button class="btn ${best ? "primary" : ""}" data-act="draft" data-id="${e.id}">${open ? "Hide message" : "Draft message"}</button>
        ${open && a.verdict !== "reliable" ? `<button class="btn" data-act="expert-confirms" data-id="${e.id}">Simulate: expert confirms</button>` : ""}
      </div>
      ${open ? `<textarea class="draft" readonly aria-label="Draft message">${esc(E.draftMessage(sc, { country: state.country }, a, e))}</textarea>
        <div class="acts"><button class="btn" data-act="copy">Copy message</button></div>` : ""}
    </div>`;
  }

  /* ---------------- Health tab ---------------- */
  function renderHealth() {
    const ref = D.REF_DATE;
    const overdue = state.kb.filter((s) => E.ageDays(s, ref) > s.cycleDays).length;
    const noOwner = state.kb.filter((s) => !s.owner || s.ownerActive === false).length;
    const unreviewed = state.kb.filter((s) => s.status === "unreviewed" || s.status === "outdated").length;

    let gaps = 0;
    const rows = D.SCENARIOS.map((sc) => {
      const cells = D.COUNTRIES.map((c) => {
        const a = analyze(sc, c.code);
        if (a.verdict === "gap") gaps++;
        const cls = VERDICT[a.verdict].cls;
        return `<td class="cell ${cls}" tabindex="0" role="button" data-act="open" data-id="${sc.id}" data-country="${c.code}"><b>${SHORT[a.verdict]}</b>${a.leader ? a.confidence + "/100" : "no source"}</td>`;
      }).join("");
      return `<tr><th scope="row">${esc(sc.label)}</th>${cells}</tr>`;
    }).join("");

    const list = state.kb.map((s) => {
      const age = E.ageDays(s, ref), problems = [];
      if (age > s.cycleDays) problems.push("overdue (" + E.fmtAge(age) + ")");
      if (!s.owner) problems.push("no owner"); else if (s.ownerActive === false) problems.push("owner left");
      if (s.status === "unreviewed") problems.push("never reviewed");
      if (s.status === "outdated") problems.push("flagged outdated");
      return { s, problems };
    }).sort((x, y) => y.problems.length - x.problems.length);

    return `
      <div class="tiles">
        <div class="tile"><b>${state.kb.length}</b><span>knowledge items analysed</span></div>
        <div class="tile warn"><b>${overdue}</b><span>overdue for review</span></div>
        <div class="tile bad"><b>${noOwner}</b><span>without an active owner</span></div>
        <div class="tile warn"><b>${unreviewed}</b><span>never reviewed or flagged</span></div>
        <div class="tile bad"><b>${gaps}</b><span>topic/country gaps</span></div>
      </div>
      <section class="card" style="margin-bottom:20px">
        <h2>Where can people trust the answer today?</h2>
        <p class="sub">Each cell is a full trust analysis for one topic in one country. Click a cell to see why.</p>
        <div class="scroll"><table><thead><tr><th></th>${D.COUNTRIES.map((c) => `<th>${c.name}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div>
      </section>
      <section class="card">
        <h2>Items that need attention</h2>
        <p class="sub">Detect outdated, duplicated or ownerless knowledge before an employee relies on it.</p>
        <div class="scroll"><table class="issues"><thead><tr><th>Item</th><th>Where</th><th>Problems</th></tr></thead><tbody>
          ${list.map(({ s, problems }) => `<tr><td>${esc(s.title)}</td><td>${esc(s.location)}</td><td>${problems.length ? problems.map((p) => `<span class="flag bad">${esc(p)}</span>`).join(" ") : `<span class="flag good">healthy</span>`}</td></tr>`).join("")}
        </tbody></table></div>
      </section>`;
  }

  /* ---------------- How tab ---------------- */
  function renderHow() {
    return `<article class="card how">
      <h2>Trust you can explain in one minute</h2>
      <p>TrustLens sits on top of the places where knowledge already lives (policies, manuals, wikis, Teams). It does not replace them. It adds a trust layer, so that an answer always arrives with its reasons.</p>
      <p><code>trust = applicability x ( 30% freshness + 25% ownership + 25% authority + 20% corroboration )</code></p>
      <table>
        <tr><th>Signal</th><th>Question it answers</th></tr>
        <tr><td>Applicability</td><td>Does this apply to this customer's country? A French wiki page scores 0 for a Belgian customer.</td></tr>
        <tr><td>Freshness</td><td>Was it reviewed within its own review cycle? A chat message goes stale in days, a policy in months.</td></tr>
        <tr><td>Ownership</td><td>Is someone accountable today? An owner who left counts almost as no owner.</td></tr>
        <tr><td>Authority</td><td>Approved content beats drafts, drafts beat informal chats.</td></tr>
        <tr><td>Corroboration</td><td>Do other good sources agree? Agreement from weak sources counts for little.</td></tr>
      </table>
      <h2 style="margin-top:28px">Decision rules</h2>
      <p><b>Reliable</b>: strong, approved leader and nobody disagrees. <b>Likely correct</b>: a leader clearly outranks the conflicting sources. <b>Caution</b>: best source is weak or not approved. <b>Conflict</b>: two answers with similar trust. <b>Gap</b>: nothing applicable and trustworthy, so the user is routed to a person.</p>
      <h2 style="margin-top:28px">How it maps to the four inspiration areas</h2>
      <p><b>Trust</b>: score, verdict and plain-language reasons. <b>Capture</b>: confirm, flag, claim, save verified answers. <b>Detect</b>: conflicts, stale and ownerless items, gap heatmap. <b>Connect</b>: expert ranking and a ready-to-send message.</p>
      <p class="sub">In production the same metadata comes from connectors (SharePoint, Teams, portal, HR directory) and an LLM only writes the wording of the answer. The trust decision stays rule-based, auditable and explainable.</p>
    </article>`;
  }

  /* ---------------- Wiring ---------------- */
  function render() {
    document.querySelectorAll(".tabs button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === state.tab)));
    const app = document.getElementById("app");
    app.innerHTML = state.tab === "answer" ? renderAnswer() : state.tab === "health" ? renderHealth() : renderHow();
  }

  function mutate(id, fn, msg) {
    const s = state.kb.find((x) => x.id === id);
    fn(s); state.log.unshift(msg(s)); render(); toast(msg(s));
  }

  document.addEventListener("click", (ev) => {
    const tab = ev.target.closest(".tabs button");
    if (tab) { state.tab = tab.dataset.tab; render(); return; }
    const el = ev.target.closest("[data-act]");
    if (!el) return;
    const id = el.dataset.id, act = el.dataset.act, sc = scenario();
    if (act === "scenario") { state.scenarioId = id; state.country = scenario().defaultCountry; state.draftFor = null; render(); }
    else if (act === "open") { state.scenarioId = id; state.country = el.dataset.country; state.tab = "answer"; state.draftFor = null; render(); window.scrollTo(0, 0); }
    else if (act === "confirm") mutate(id, (s) => { s.reviewed = D.REF_DATE; if (s.status === "outdated") s.status = "unreviewed"; }, (s) => "You confirmed \"" + s.title + "\" is still valid.");
    else if (act === "flag") mutate(id, (s) => { s.status = "outdated"; }, (s) => "You flagged \"" + s.title + "\" as outdated. Its owner is notified.");
    else if (act === "claim") mutate(id, (s) => { s.owner = "You (payroll consultant)"; s.ownerActive = true; s.reviewed = D.REF_DATE; }, (s) => "You took ownership of \"" + s.title + "\".");
    else if (act === "draft") { state.draftFor = state.draftFor === id ? null : id; render(); }
    else if (act === "copy") { const t = document.querySelector(".draft"); if (t && navigator.clipboard) navigator.clipboard.writeText(t.value).then(() => toast("Message copied")); else toast("Select the text and copy it"); }
    else if (act === "publish") {
      const a = analyze(sc, state.country);
      state.kb.push({ id: "v" + Date.now(), topic: sc.id, title: "Verified answer - " + sc.label + " (" + state.country + ")", type: "Verified answer", location: "TrustLens knowledge base", countries: [state.country], owner: "You (payroll consultant)", ownerActive: true, status: "approved", updated: D.REF_DATE, cycleDays: 90, claimKey: sc.claimKey, claimValue: a.leader.value, excerpt: ans(sc, a.top) });
      state.log.unshift("You saved a verified answer for " + state.country + ", valid 90 days. Next colleague finds it first."); render(); toast("Saved as verified answer");
    }
    else if (act === "expert-confirms") {
      const e = D.EXPERTS.find((x) => x.id === id), a = analyze(sc, state.country);
      const value = a.leader && a.verdict !== "gap" ? a.leader.value : sc.claimKey + "-" + state.country.toLowerCase() + "-confirmed";
      state.kb.push({ id: "x" + Date.now(), topic: sc.id, title: "Expert-verified answer by " + e.name, type: "Expert-verified answer", location: "TrustLens knowledge base", countries: [state.country], owner: e.name, ownerActive: true, status: "approved", updated: D.REF_DATE, cycleDays: 180, claimKey: sc.claimKey, claimValue: value, excerpt: (sc.expertAnswers && sc.expertAnswers[state.country]) || "Confirmed by " + e.name + " for " + state.country + " (illustrative answer recorded for reuse)." });
      state.log.unshift(e.name + " confirmed the answer. It is now a reusable, owned knowledge item."); state.draftFor = null; render(); toast("Expert answer captured");
    }
    else if (act === "reset") { state.kb = clone(D.SOURCES); state.log = []; state.draftFor = null; render(); toast("Demo reset"); }
  });

  document.addEventListener("keydown", (ev) => {
    if ((ev.key === "Enter" || ev.key === " ") && ev.target.matches("td.cell")) { ev.preventDefault(); ev.target.click(); }
  });
  document.addEventListener("change", (ev) => {
    if (ev.target.matches('[data-act="country"]')) { state.country = ev.target.value; state.draftFor = null; render(); }
  });

  render();
})();
