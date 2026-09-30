'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { answer, COUNTRIES, MAX } = require('./trust');

const KB = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'knowledge.json'), 'utf8'));
const INDEX = path.join(__dirname, '..', 'public', 'index.html');

function createServer({ now = process.env.TRUST_NOW || KB.now } = {}) {
  const gaps = []; // in-memory log of answers that were not fully reliable

  const send = (res, code, body, type = 'application/json') => {
    res.writeHead(code, { 'Content-Type': type + '; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(type === 'application/json' ? JSON.stringify(body) : body);
  };
  const readJson = req => new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', c => { raw += c; if (raw.length > 10_000) { reject(new Error('Body too large')); req.destroy(); } });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error('Invalid JSON')); } });
  });

  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    try {
      if (req.method === 'GET' && url.pathname === '/') return send(res, 200, fs.readFileSync(INDEX, 'utf8'), 'text/html');
      if (req.method === 'GET' && url.pathname === '/api/health') return send(res, 200, { ok: true, now });
      if (req.method === 'GET' && url.pathname === '/api/questions') {
        return send(res, 200, { now, countries: COUNTRIES, max: MAX, questions: KB.questions.map(({ id, text }) => ({ id, text })) });
      }
      if (req.method === 'POST' && url.pathname === '/api/answer') {
        const { questionId, country } = await readJson(req);
        const q = KB.questions.find(x => x.id === questionId);
        if (!q) return send(res, 400, { error: `Unknown questionId "${questionId}"` });
        if (!COUNTRIES.includes(country)) return send(res, 400, { error: `Unknown country "${country}"` });
        const result = answer(q, country, now);
        if (result.verdict !== 'rely') {
          gaps.push({ at: new Date().toISOString(), questionId, country, verdict: result.verdict, gap: result.gap, conflict: !!result.conflict });
        }
        return send(res, 200, result);
      }
      if (req.method === 'GET' && url.pathname === '/api/gaps') {
        const counts = {};
        for (const g of gaps) { const k = `${g.questionId}|${g.country}`; counts[k] = (counts[k] || 0) + 1; }
        const ranked = Object.entries(counts).map(([k, n]) => ({ questionId: k.split('|')[0], country: k.split('|')[1], asked: n }))
          .sort((a, b) => b.asked - a.asked);
        return send(res, 200, { total: gaps.length, ranked, recent: gaps.slice(-20) });
      }
      send(res, 404, { error: 'Not found' });
    } catch (e) {
      send(res, 400, { error: e.message });
    }
  });
}

if (require.main === module) {
  const port = process.env.PORT || 3000;
  createServer().listen(port, () => console.log(`Trust Lens running on http://localhost:${port}`));
}

module.exports = { createServer };
