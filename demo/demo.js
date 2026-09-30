'use strict';
// Scripted 3-minute demo: good case, conflict case, gap case. Starts its own server.
const { createServer } = require('../src/server');

const SCENES = [
  ['GOOD CASE: clean agreement', 'retro-correction', 'NL'],
  ['CONFLICT CASE: sources disagree', 'leaver-bonus', 'BE'],
  ['GAP CASE: nothing covers this country', 'leaver-bonus', 'DE']
];
const ICON = { rely: '🟢', check: '🟡', hold: '🔴' };

(async () => {
  const server = createServer();
  await new Promise(r => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const [title, questionId, country] of SCENES) {
    const r = await (await fetch(base + '/api/answer', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questionId, country })
    })).json();
    console.log(`\n=== ${title} ===`);
    console.log(`Q: ${r.question}  [${country}]`);
    console.log(`${ICON[r.verdict]} ${r.label}: ${r.answer}`);
    if (r.basedOn) console.log(`   Based on ${r.basedOn.title} (${r.basedOn.score}/100)`);
    if (r.conflict) console.log(`   ⚠ Conflict: "${r.conflict.best.says}" vs "${r.conflict.other.says}" (${r.conflict.other.title})`);
    if (r.expert) console.log(`   → Ask: ${r.expert}`);
    for (const s of r.sources) {
      const x = s.score;
      console.log(`   - ${s.title.padEnd(24)} ${String(x.total).padStart(3)}/100  fresh ${x.fresh} owner ${x.owner} applies ${x.applies} agreed ${x.agreed}`);
    }
  }
  const gaps = await (await fetch(base + '/api/gaps')).json();
  console.log('\n=== KNOWLEDGE GAPS LOGGED ===');
  console.log(gaps.ranked.map(g => `${g.questionId} (${g.country}) asked ${g.asked}x`).join('\n'));
  server.close();
})();
