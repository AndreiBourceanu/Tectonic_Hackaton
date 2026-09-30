# Trust Lens

Answers with visible trust: every source is scored on **freshness, ownership, applicability and agreement**; conflicts and gaps are surfaced, with a "who to ask" fallback.

## Run
```bash
npm start            # http://localhost:3000  (Node >= 18, no dependencies)
npm test             # unit + API tests (node:test)
npm run demo         # scripted CLI demo: good / conflict / gap
```

## API
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | liveness + demo date |
| GET | `/api/questions` | questions, countries, score maxima |
| POST | `/api/answer` | `{questionId, country}` → verdict, answer, conflict, expert, ranked sources with per-dimension scores and explanations |
| GET | `/api/gaps` | ranked log of questions that were not fully reliable |

```bash
curl -s localhost:3000/api/answer -H 'Content-Type: application/json' \
  -d '{"questionId":"leaver-bonus","country":"BE"}'
```

## Layout
- `data/knowledge.json`: fictional corpus with planted problems (stale wiki, conflicting chat, missing DE coverage). Add sources here.
- `src/trust.js`: pure scoring/verdict logic. `src/server.js`: HTTP API + static UI.
- `public/index.html`: UI, now driven by the API.
- `test/`: scoring and API tests. `demo/demo.js`: demo script.

## Scoring
Fresh 30 (≤6 mo), 20 (≤18), 10 (≤36), else 0 · Owner 20 · Applies 30 · Agreed +10 per other applicable source with the same claim (max 20).
Verdict: **rely** ≥75 and no conflict, **check** ≥50 or conflict, else **hold**. Set `TRUST_NOW=YYYY-MM` to change the reference date.
