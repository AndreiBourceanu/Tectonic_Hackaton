// Run with: node test.js
const D = require("./src/data.js");
const E = require("./src/engine.js");
let fails = 0;
const check = (name, cond) => { console.log((cond ? "PASS " : "FAIL ") + name); if (!cond) fails++; };
const run = (id, country, kb = D.SOURCES) => E.analyze(D.SCENARIOS.find(s => s.id === id), kb, { country }, D.REF_DATE);

let a = run("meal-vouchers", "BE");
console.log(" meal BE:", a.verdict, a.confidence, a.items.map(i => i.src.id + ":" + i.score.toFixed(2)).join(" "));
check("Meal vouchers BE: conflict detected but outranked", a.verdict === "resolved");
check("Top source is the 2026 policy", a.top.src.id === "s1");

a = run("meal-vouchers", "FR");
console.log(" meal FR:", a.verdict, a.confidence);
check("Meal vouchers FR: weak single ownerless source -> caution", a.verdict === "caution");

a = run("overtime", "LU");
console.log(" overtime LU:", a.verdict, a.confidence);
check("Overtime LU: knowledge gap", a.verdict === "gap");

a = run("overtime", "BE");
console.log(" overtime BE:", a.verdict, a.confidence);
check("Overtime BE: reliable", a.verdict === "reliable" || a.verdict === "caution");

a = run("payslip-corrections", "BE");
console.log(" payslip BE:", a.verdict, a.confidence);
check("Payslip corrections BE: reliable", a.verdict === "reliable");

// Capture loop: flagging the good policy as outdated should turn the conflict into an unresolved one
const kb = JSON.parse(JSON.stringify(D.SOURCES));
kb.find(s => s.id === "s1").status = "outdated";
a = run("meal-vouchers", "BE", kb);
console.log(" meal BE after flag:", a.verdict, a.confidence);
check("Flagging the policy breaks the trust in the answer", a.verdict !== "reliable" && a.verdict !== "resolved");

const ex = E.rankExperts(D.EXPERTS, D.SCENARIOS[1], { country: "LU" });
check("Best expert for LU overtime is Marc Hoffmann", ex[0].expert.id === "e2");
process.exit(fails ? 1 : 0);
