# TrustLens

**From "I found something" to "I understand why I can rely on it."**

A proof of concept for the SD Worx hackathon challenge *Turning organisational knowledge into trusted confidence*.

## Run it (10 seconds)

No install, no server, no internet needed.

1. Unzip
2. Double-click `index.html` (any modern browser)

Optional: `node test.js` runs the automated checks of the trust engine.

## The problem we chose

One role (payroll consultant), one moment of doubt: *an urgent customer question arrives and the knowledge base returns several conflicting answers.* Finding information is not the problem. Knowing which answer deserves confidence is.

## What it does

| Challenge area | What TrustLens shows |
|---|---|
| **Trust** | A 0-100 trust score per source and a verdict (Reliable / Likely correct / Caution / Conflict / Gap) with plain-language reasons. The "trust strip" shows what each signal contributes. |
| **Detect** | Conflicting, outdated, ownerless and country-mismatched knowledge is flagged. The *Knowledge health* tab shows a topic x country heatmap of where trust exists and where gaps are. |
| **Connect** | When documents are not enough, experts are ranked by country, topic, track record and recent activity, with a ready-to-send message that includes what is already known and what is unclear. |
| **Capture** | Confirm a source, flag it outdated, claim an ownerless page, save a verified answer, or capture an expert's reply. Scores update instantly, so the next colleague starts from better knowledge. |

## Code map

- `index.html` - entry point
- `src/data.js` - synthetic knowledge base, scenarios, experts
- `src/engine.js` - explainable trust scoring, conflict/gap detection, expert ranking (no dependencies)
- `src/app.js`, `src/styles.css` - UI
- `test.js` - engine tests
- `docs/PITCH.md` - 5-minute pitch, live demo script, jury Q&A

## Honest limits

All data is synthetic and illustrative. The scoring weights are a reasoned starting point, not calibrated on real usage. In production, metadata would come from connectors (SharePoint, Teams, knowledge portal, HR directory), and an LLM would only phrase the answer while the trust decision stays rule-based and auditable.
