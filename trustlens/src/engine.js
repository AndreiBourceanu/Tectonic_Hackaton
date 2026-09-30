/*
 * TrustLens engine - explainable trust scoring, conflict & gap detection, expert routing.
 * No AI black box: every number is a transparent rule that can be shown to the user.
 *
 * trust(source) = applicability x ( 0.30 freshness + 0.25 ownership + 0.25 authority + 0.20 corroboration )
 */
(function (root) {
  const DAY = 86400000;
  const W = { fresh: 0.3, owner: 0.25, auth: 0.25, corr: 0.2 };
  const AUTH = { approved: 1, draft: 0.5, unreviewed: 0.25, outdated: 0.05 };

  const ageDays = (src, ref) =>
    Math.max(0, Math.round((new Date(ref) - new Date(src.reviewed || src.updated)) / DAY));

  function freshness(src, ref) {
    if (src.status === "outdated") return 0.1;
    const age = ageDays(src, ref);
    if (age <= src.cycleDays) return 1;
    return Math.max(0.1, 1 - (age - src.cycleDays) / (src.cycleDays * 2));
  }

  const ownership = (src) => (!src.owner ? 0 : src.ownerActive === false ? 0.3 : 1);
  const authority = (src) => AUTH[src.status] ?? 0.25;
  const applicability = (src, ctx) =>
    src.countries.includes(ctx.country) ? 1 : src.countries.includes("ALL") ? 0.9 : 0;

  function flagsFor(item, ref) {
    const s = item.src, out = [];
    const age = item.age;
    if (item.applic === 0) out.push({ kind: "bad", text: "Applies to " + s.countries.join("/") + ", not to this customer's country" });
    if (s.status === "approved") out.push({ kind: "good", text: "Approved content" });
    if (s.status === "draft") out.push({ kind: "warn", text: "Draft, not formally approved" });
    if (s.status === "unreviewed") out.push({ kind: "warn", text: "Never reviewed (informal source)" });
    if (s.status === "outdated") out.push({ kind: "bad", text: "Flagged as outdated by a colleague" });
    if (!s.owner) out.push({ kind: "bad", text: "No owner - nobody is accountable for it" });
    else if (s.ownerActive === false) out.push({ kind: "bad", text: "Owner left the company" });
    else out.push({ kind: "good", text: "Owned by " + s.owner });
    if (age > s.cycleDays) out.push({ kind: "bad", text: "Overdue: last updated " + fmtAge(age) + " ago (review cycle " + s.cycleDays + " days)" });
    else out.push({ kind: "good", text: "Up to date: " + fmtAge(age) + " old (review cycle " + s.cycleDays + " days)" });
    return out;
  }

  function fmtAge(d) {
    if (d < 1) return "today";
    if (d < 60) return d + " days";
    if (d < 730) return Math.round(d / 30) + " months";
    return (d / 365).toFixed(1) + " years";
  }

  // Score every source of a topic for a given customer context.
  function scoreSources(sources, ctx, ref) {
    const items = sources.map((src) => {
      const f = freshness(src, ref), o = ownership(src), a = authority(src), ap = applicability(src, ctx);
      return { src, age: ageDays(src, ref), applic: ap, fresh: f, owner: o, auth: a, base: 0.4 * f + 0.3 * o + 0.3 * a, corr: 0.5 };
    });
    // corroboration: do other applicable sources (weighted by their own quality) agree?
    items.forEach((it) => {
      let agree = 0, disagree = 0;
      items.forEach((ot) => {
        if (ot === it || ot.applic === 0 || ot.src.claimKey !== it.src.claimKey) return;
        const w = ot.base * ot.applic;
        if (ot.src.claimValue === it.src.claimValue) agree += w; else disagree += w;
      });
      it.corr = (agree + 0.25) / (agree + disagree + 0.5);
      it.score = it.applic * (W.fresh * it.fresh + W.owner * it.owner + W.auth * it.auth + W.corr * it.corr);
      it.parts = { // contribution of each signal, for the trust strip
        fresh: it.applic * W.fresh * it.fresh, owner: it.applic * W.owner * it.owner,
        auth: it.applic * W.auth * it.auth, corr: it.applic * W.corr * it.corr,
      };
      it.flags = flagsFor(it, ref);
    });
    return items;
  }

  function analyze(scenario, kb, ctx, ref) {
    const items = scoreSources(kb.filter((s) => s.topic === scenario.id), ctx, ref);
    items.sort((a, b) => b.score - a.score);
    const applicable = items.filter((i) => i.applic > 0 && i.src.claimKey === scenario.claimKey);
    const outOfScope = items.filter((i) => i.applic === 0);

    // group applicable sources by the answer they give
    const groups = {};
    applicable.forEach((i) => {
      const g = (groups[i.src.claimValue] = groups[i.src.claimValue] || { value: i.src.claimValue, items: [], best: 0 });
      g.items.push(i); g.best = Math.max(g.best, i.score);
    });
    const ranked = Object.values(groups).sort((a, b) => b.best - a.best);
    const leader = ranked[0] || null;
    const rivals = ranked.slice(1).filter((g) => g.best >= 0.05);
    const top = leader ? leader.items[0] : null;

    let verdict;
    if (!leader || leader.best < 0.25) verdict = "gap";
    else if (rivals.length) verdict = leader.best >= 0.7 && leader.best - rivals[0].best >= 0.3 ? "resolved" : "conflict";
    else verdict = leader.best >= 0.7 ? "reliable" : "caution";

    // Rule: nothing can be "green" unless the leading source is formally approved.
    if ((verdict === "reliable" || verdict === "resolved") && top.src.status !== "approved") verdict = "caution";

    const gaps = [];
    if (!applicable.length) gaps.push("No source at all covers " + ctx.country + " for this question.");
    if (outOfScope.length) gaps.push(outOfScope.length + " source(s) exist for other countries. They must not be transposed to " + ctx.country + ".");
    if (leader && leader.items.length === 1 && verdict !== "gap") gaps.push("The answer rests on a single source.");
    if (top && !top.src.owner) gaps.push("The best source has no owner, so nobody can confirm it.");
    if (top && top.age > top.src.cycleDays) gaps.push("The best source is overdue for review.");
    if (verdict === "gap" && leader) gaps.push("The only applicable hint is informal and unreviewed.");

    return { items, applicable, outOfScope, ranked, leader, rivals, top, verdict, gaps,
             confidence: leader ? Math.round(Math.min(1, leader.best) * 100) : 0 };
  }

  // Short natural-language reasons why the leading answer deserves (or lacks) trust.
  function explain(a) {
    const out = [];
    if (!a.top) return ["Nothing reliable was found for this context."];
    const t = a.top, s = t.src;
    out.push(s.status === "approved" ? "Comes from approved content: " + s.title + "." : "Best available source is only " + s.status + ": " + s.title + ".");
    out.push(s.owner ? (s.ownerActive === false ? "Its owner has left - nobody can confirm it today." : "Owned and maintained by " + s.owner + ".") : "It has no owner.");
    out.push(t.age <= s.cycleDays ? "Reviewed recently (" + fmtAge(t.age) + " ago, cycle " + s.cycleDays + " days)." : "Overdue for review (" + fmtAge(t.age) + " old, cycle " + s.cycleDays + " days).");
    const agree = a.leader.items.length - 1;
    if (agree > 0) out.push(agree + " other applicable source(s) say the same.");
    a.rivals.forEach((r) => out.push(r.items.length + " source(s) say something different, but they are weaker: " + r.items.map((i) => i.src.title).join("; ") + "."));
    return out;
  }

  // Connect: rank experts by topic, country, recent activity and track record.
  function rankExperts(experts, scenario, ctx) {
    return experts.map((e) => {
      const tagHits = e.tags.filter((t) => scenario.tags.includes(t)).length;
      const countryHit = e.countries.includes(ctx.country);
      const score = tagHits * 2 + (countryHit ? 3 : 0) + (e.lastActiveDays <= 7 ? 1 : 0) + Math.min(e.answeredBefore, 15) * 0.1;
      const why = [];
      if (countryHit) why.push("covers " + ctx.country);
      if (tagHits) why.push(tagHits + " matching topic" + (tagHits > 1 ? "s" : ""));
      if (e.answeredBefore) why.push("answered " + e.answeredBefore + " similar questions");
      if (e.lastActiveDays <= 7) why.push("active " + (e.lastActiveDays === 0 ? "today" : e.lastActiveDays + "d ago"));
      return { expert: e, score, why };
    }).sort((x, y) => y.score - x.score);
  }

  function draftMessage(scenario, ctx, a, expert) {
    const lines = [
      "Hi " + expert.name.split(" ")[0] + ",",
      "",
      "I have an urgent customer question (" + ctx.country + "): " + scenario.question,
      "",
      "What I found:",
    ];
    a.items.slice(0, 4).forEach((i) => lines.push("- " + i.src.title + " (" + i.src.status + ", trust " + Math.round(i.score * 100) + "/100)"));
    lines.push("", "What I am unsure about: " + (a.verdict === "gap" ? "nothing reliable covers " + ctx.country + "." : a.verdict === "conflict" ? "the sources contradict each other." : "I want to confirm before replying."));
    lines.push("Could you confirm the right answer? I will save it as a verified answer so the next person finds it.", "", "Thanks!");
    return lines.join("\n");
  }

  const api = { W, analyze, explain, rankExperts, draftMessage, scoreSources, fmtAge, ageDays };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.TL_ENGINE = api;
})(typeof window !== "undefined" ? window : globalThis);
