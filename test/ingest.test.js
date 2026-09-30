'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseDoc, load } = require('../src/ingest');

test('parseDoc reads front matter and body', () => {
  const d = parseDoc('---\ntitle: T\ntype: Wiki\ndate: 2024-01\ncountries: be, nl\ntopic: x\nclaim: A\nanswer: Yes\n---\nHello', 'f.md');
  assert.deepEqual(d.countries, ['BE', 'NL']);
  assert.equal(d.owner, null);
  assert.equal(d.says, 'Yes');
  assert.equal(d.body, 'Hello');
});

test('parseDoc rejects missing front matter, fields and claims', () => {
  assert.throws(() => parseDoc('no front matter', 'f.md'), /front matter/);
  assert.throws(() => parseDoc('---\ntitle: T\n---\nx', 'f.md'), /missing "type"/);
  assert.throws(() => parseDoc('---\ntitle: T\ntype: W\ndate: 2024-01\ncountries: BE\ntopic: x\n---\nx', 'f.md'), /claim/);
});

test('corpus loads: 11 files, 10 linked to questions, distractor ignored', () => {
  const kb = load();
  assert.equal(kb.documents.length, 11);
  assert.equal(kb.questions.reduce((n, q) => n + q.sources.length, 0), 10);
  assert.ok(!kb.questions.some(q => q.sources.some(s => s.file === 'holiday-policy.md')));
});

test('ownerless sources come from chats, wikis and forwarded emails', () => {
  const kb = load();
  const ownerless = kb.documents.filter(d => !d.owner).map(d => d.type).sort();
  assert.deepEqual(ownerless, ['Chat', 'Chat', 'Email', 'Wiki', 'Wiki']);
});
