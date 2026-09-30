# TrustLens - pitch and demo script (5 minutes)

## 1. Hook (30s)
"Every organisation has a hidden superpower: the knowledge of its people. But an AI assistant that returns ten answers does not create confidence. Today we show how a payroll consultant goes from *I found something* to *I understand why I can rely on it*."

## 2. The moment of doubt (30s)
An urgent customer question: *do employees get meal vouchers on remote days?* The organisation holds a 2026 policy, a 2022 manual whose author left, a Teams message, a French wiki page, and a draft FAQ. They do not agree.

## 3. Live demo (3 min)
1. **Open "Meal vouchers"** - 91/100, *Likely correct*. Point at the trust strip: freshness, ownership, authority, corroboration. "Every reason is a visible rule, not a black box."
2. **Scroll to sources** - the 2022 manual and the Teams message contradict the policy, but one has no active owner and is 4.6 years old, the other is an unreviewed chat. The French wiki scores 0 because it does not apply to Belgium.
3. **Click "Flag as outdated" on the 2026 policy** - confidence drops to *Use with caution*. "Trust reacts to people, instantly." Click *Reset demo*.
4. **Switch to "Sunday work premium" (Luxembourg)** - *No reliable knowledge*. "The system refuses to guess. It shows the gap and routes me to Marc Hoffmann, ranked by country, topic and track record."
5. **Draft message -> Simulate: expert confirms** - the answer becomes a reusable, owned, dated knowledge item. "The next colleague finds it first. That is Capture."
6. **Knowledge health tab** - heatmap of topic x country, plus the list of ownerless or overdue items. "This is Detect, before anyone gets hurt."

## 4. Why it is different (30s)
- Trust is **explainable**: rules and reasons, not a confidence number from a model.
- It **says no** when it should: gaps and conflicts are first-class, not hidden.
- It **connects people**, because some knowledge only lives in experts' heads.
- Every use **improves** the knowledge.

## 5. Path to production (30s)
Connect SharePoint, Teams, the knowledge portal and the HR directory for metadata (owner, dates, status, country). Keep the trust rules deterministic and auditable. Use an LLM only to phrase answers and to extract claims from documents. Pilot with one payroll team in one country.

## Likely jury questions
**Why not just use an LLM?** An LLM summarises; it cannot tell that an owner left or that a page applies to another country. We use metadata and rules for the decision, and keep the model for wording.
**How reliable are the weights?** They are a transparent starting point (30/25/25/20). They would be calibrated with feedback (confirm/flag clicks) and with expert review.
**What if metadata is missing?** Missing owner or review date *lowers* trust, and shows up in Knowledge health. That incentive is a feature.
**Privacy / compliance?** Only metadata and excerpts of documents the user can already access are used; experts opt in to be listed.
**How do you measure success?** Time to a confident answer, share of answers sent with a verified source, number of ownerless items adopted, repeated expert questions avoided.
**Data in the demo?** Fully synthetic and illustrative.
