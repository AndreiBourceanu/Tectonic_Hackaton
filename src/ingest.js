'use strict';
// Reads the fictional organisation files in data/corpus/ and links them to questions.
// Metadata (date, owner, countries, topic) comes from each file's front matter.
// `claim` (which statements agree) and `answer` (the extracted statement) are also in the
// front matter here; in production an LLM extraction step would fill these two fields.
const fs = require('node:fs');
const path = require('node:path');
const DATA = path.join(__dirname, '..', 'data');

function parseDoc(raw, file) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!m) throw new Error(`${file}: missing front matter`);
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  for (const k of ['title', 'type', 'date', 'countries']) if (!meta[k]) throw new Error(`${file}: missing "${k}"`);
  if (meta.topic && (!meta.claim || !meta.answer)) throw new Error(`${file}: topic documents need "claim" and "answer"`);
  return {
    file, title: meta.title, type: meta.type, date: meta.date, owner: meta.owner || null,
    countries: meta.countries.split(',').map(s => s.trim().toUpperCase()),
    topic: meta.topic || null, claim: meta.claim || null, says: meta.answer || null, body: m[2].trim()
  };
}

function load(dataDir = DATA) {
  const dir = path.join(dataDir, 'corpus');
  const documents = fs.readdirSync(dir).filter(f => f.endsWith('.md')).sort()
    .map(f => parseDoc(fs.readFileSync(path.join(dir, f), 'utf8'), f));
  const q = JSON.parse(fs.readFileSync(path.join(dataDir, 'questions.json'), 'utf8'));
  const questions = q.questions.map(x => ({ ...x, sources: documents.filter(d => d.topic === x.id) }));
  return { now: q.now, questions, documents };
}

module.exports = { parseDoc, load };
