'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('../src/server');

let server, base;
test.before(async () => {
  server = createServer({ now: '2026-09' });
  await new Promise(r => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

const post = (p, body) => fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body) });

test('GET /api/health', async () => {
  const j = await (await fetch(base + '/api/health')).json();
  assert.deepEqual(j, { ok: true, now: '2026-09' });
});

test('GET /api/questions lists the questions', async () => {
  const j = await (await fetch(base + '/api/questions')).json();
  assert.equal(j.questions.length, 3);
  assert.deepEqual(j.countries, ['BE', 'NL', 'DE']);
});

test('GET / serves the UI', async () => {
  const r = await fetch(base + '/');
  assert.equal(r.status, 200);
  assert.match(await r.text(), /Trust Lens/);
});

test('POST /api/answer returns a verdict with explanations', async () => {
  const r = await post('/api/answer', { questionId: 'leaver-bonus', country: 'BE' });
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.verdict, 'check');
  assert.ok(j.sources.every(s => s.why.fresh && s.why.owner && s.why.applies && s.why.agreed));
});

test('POST /api/answer validates input', async () => {
  assert.equal((await post('/api/answer', { questionId: 'nope', country: 'BE' })).status, 400);
  assert.equal((await post('/api/answer', { questionId: 'leaver-bonus', country: 'FR' })).status, 400);
  assert.equal((await post('/api/answer', '{not json')).status, 400);
});

test('GET /api/gaps logs non-reliable answers only', async () => {
  await post('/api/answer', { questionId: 'retro-correction', country: 'NL' });
  await post('/api/answer', { questionId: 'leaver-bonus', country: 'DE' });
  await post('/api/answer', { questionId: 'leaver-bonus', country: 'DE' });
  const j = await (await fetch(base + '/api/gaps')).json();
  const top = j.ranked[0];
  assert.equal(top.questionId, 'leaver-bonus');
  assert.equal(top.country, 'DE');
  assert.ok(top.asked >= 2);
  assert.ok(!j.recent.some(g => g.questionId === 'retro-correction'));
});

test('unknown route returns 404', async () => {
  assert.equal((await fetch(base + '/nope')).status, 404);
});
