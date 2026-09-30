/*
 * TrustLens - illustrative, SYNTHETIC data.
 * Nothing here is real SD Worx content or real legal/payroll advice.
 * The values (percentages, deadlines) are invented to demonstrate the trust logic.
 */
(function (root) {
  const REF_DATE = "2026-09-30"; // "today" in the demo, so scores are reproducible

  const COUNTRIES = [
    { code: "BE", name: "Belgium" },
    { code: "FR", name: "France" },
    { code: "NL", name: "Netherlands" },
    { code: "LU", name: "Luxembourg" },
  ];

  // Each source = one piece of knowledge living somewhere in the organisation.
  // claimKey + claimValue = what the source says about a question (lets us detect conflicts).
  const SOURCES = [
    // ---- Scenario 1: meal vouchers on remote workdays (Belgium) --------------------
    {
      id: "s1", topic: "meal-vouchers", title: "Payroll BE Policy 2026 - Meal vouchers (v3.2)",
      type: "Policy", location: "Knowledge portal", countries: ["BE"],
      owner: "Payroll BE Knowledge Team", ownerActive: true,
      status: "approved", updated: "2026-07-14", cycleDays: 180,
      claimKey: "remote-eligibility", claimValue: "eligible",
      excerpt: "Meal vouchers are granted for every day actually worked, including remote workdays, provided the employee works at least the minimum daily hours.",
    },
    {
      id: "s2", topic: "meal-vouchers", title: "Payroll Manual BE (2022 edition), chapter 7",
      type: "Manual (PDF)", location: "Shared drive /Payroll/Archive", countries: ["BE"],
      owner: "Former team lead (left the company)", ownerActive: false,
      status: "approved", updated: "2022-03-02", cycleDays: 365,
      claimKey: "remote-eligibility", claimValue: "not-eligible",
      excerpt: "Employees who do not physically work on the employer's premises are not entitled to meal vouchers for that day.",
    },
    {
      id: "s3", topic: "meal-vouchers", title: "Teams #payroll-be-daily - message from Sophie V.",
      type: "Teams chat", location: "Teams channel", countries: ["BE"],
      owner: null, ownerActive: false,
      status: "unreviewed", updated: "2026-09-12", cycleDays: 7,
      claimKey: "remote-eligibility", claimValue: "not-eligible",
      excerpt: "I'm fairly sure remote days don't count for the vouchers, that's how we always did it for the older clients.",
    },
    {
      id: "s4", topic: "meal-vouchers", title: "Wiki FR - Titres-restaurant et teletravail",
      type: "Wiki page", location: "Team wiki (France)", countries: ["FR"],
      owner: null, ownerActive: false,
      status: "unreviewed", updated: "2025-11-03", cycleDays: 365,
      claimKey: "remote-eligibility", claimValue: "eligible",
      excerpt: "Les jours de teletravail ouvrent droit au titre-restaurant dans les memes conditions que les jours sur site.",
    },
    {
      id: "s5", topic: "meal-vouchers", title: "Customer FAQ draft - Benefits & remote work (BE)",
      type: "Draft FAQ", location: "Sales enablement SharePoint", countries: ["BE"],
      owner: "Sales Enablement", ownerActive: true,
      status: "draft", updated: "2026-06-01", cycleDays: 180,
      claimKey: "remote-eligibility", claimValue: "eligible",
      excerpt: "Yes - remote workdays generally count. Check the current policy for edge cases such as part-time schedules.",
    },

    // ---- Scenario 2: overtime premium (Luxembourg = knowledge gap) -------------------
    {
      id: "o1", topic: "overtime", title: "Payroll BE Policy 2026 - Overtime & premiums",
      type: "Policy", location: "Knowledge portal", countries: ["BE"],
      owner: "Payroll BE Knowledge Team", ownerActive: true,
      status: "approved", updated: "2026-05-20", cycleDays: 180,
      claimKey: "sunday-premium", claimValue: "be-rule",
      excerpt: "Sunday and public-holiday work is compensated with a premium set out in the BE premium table (illustrative).",
    },
    {
      id: "o2", topic: "overtime", title: "Wiki FR - Heures supplementaires, majorations",
      type: "Wiki page", location: "Team wiki (France)", countries: ["FR"],
      owner: null, ownerActive: false,
      status: "unreviewed", updated: "2024-02-10", cycleDays: 365,
      claimKey: "sunday-premium", claimValue: "fr-rule",
      excerpt: "Les majorations dependent de la convention collective applicable; voir tableau par secteur (illustrative).",
    },
    {
      id: "o3", topic: "overtime", title: "Teams #payroll-benelux - message from Tom D.",
      type: "Teams chat", location: "Teams channel", countries: ["LU"],
      owner: null, ownerActive: false,
      status: "unreviewed", updated: "2026-08-30", cycleDays: 7,
      claimKey: "sunday-premium", claimValue: "lu-as-be",
      excerpt: "For LU I think we just follow the Belgian logic, but please double check with someone local.",
    },

    // ---- Scenario 3: payslip correction cut-off (healthy knowledge) -----------------
    {
      id: "p1", topic: "payslip-corrections", title: "Payroll Calendar BE 2026",
      type: "Calendar", location: "Knowledge portal", countries: ["BE"],
      owner: "Payroll Operations BE", ownerActive: true,
      status: "approved", updated: "2026-09-01", cycleDays: 90,
      claimKey: "correction-cutoff", claimValue: "wd5",
      excerpt: "Corrections to the monthly payslip run are accepted until working day 5 of the following month.",
    },
    {
      id: "p2", topic: "payslip-corrections", title: "Monthly close checklist BE",
      type: "Checklist", location: "Knowledge portal", countries: ["BE"],
      owner: "Payroll Operations BE", ownerActive: true,
      status: "approved", updated: "2026-08-10", cycleDays: 180,
      claimKey: "correction-cutoff", claimValue: "wd5",
      excerpt: "Step 9: lock corrections at working day 5.",
    },
    {
      id: "p3", topic: "payslip-corrections", title: "Teams #payroll-be-announcements - Ops lead",
      type: "Announcement", location: "Teams channel (announcements)", countries: ["BE"],
      owner: "Payroll Operations BE", ownerActive: true,
      status: "approved", updated: "2026-09-22", cycleDays: 30,
      claimKey: "correction-cutoff", claimValue: "wd5",
      excerpt: "Reminder: the cut-off for October corrections is working day 5, no exceptions without approval.",
    },
  ];

  const SCENARIOS = [
    {
      id: "meal-vouchers",
      label: "Meal vouchers on remote days",
      defaultCountry: "BE",
      story: "An urgent customer question arrives. Three documents and a Teams message give different answers.",
      question: "A Belgian customer asks: do employees get meal vouchers on days they work from home?",
      tags: ["benefits", "meal-vouchers", "remote-work"],
      claimKey: "remote-eligibility",
      answers: {
        eligible: "Yes. Under the current Belgian policy (v3.2), remote workdays qualify for meal vouchers as long as the employee actually works the minimum daily hours.",
        "not-eligible": "No. Employees who do not work on the employer's premises do not receive meal vouchers for that day.",
      },
    },
    {
      id: "overtime",
      label: "Sunday work premium",
      defaultCountry: "LU",
      story: "A consultant needs an answer for a Luxembourg customer. Documents exist, but none of them apply to Luxembourg.",
      question: "A customer in Luxembourg asks: what premium applies to Sunday work?",
      tags: ["overtime", "premiums", "working-time"],
      claimKey: "sunday-premium",
      expertAnswers: { LU: "Luxembourg applies its own Sunday premium rules (illustrative). Do not transpose the Belgian table. Confirmed by a local expert." },
      answers: {
        "be-rule": "Under the Belgian premium table, Sunday work is compensated with a premium (illustrative).",
        "fr-rule": "In France the premium depends on the applicable collective agreement (illustrative).",
        "lu-as-be": "A colleague suggests following the Belgian logic, but this is unconfirmed.",
      },
    },
    {
      id: "payslip-corrections",
      label: "Payslip correction cut-off",
      defaultCountry: "BE",
      story: "The happy path: knowledge that is current, owned and consistent. Trust should be visible, not just assumed.",
      question: "Until when can we still submit corrections for this month's payslips in Belgium?",
      tags: ["payroll-run", "corrections", "calendar"],
      claimKey: "correction-cutoff",
      answers: {
        wd5: "Corrections are accepted until working day 5 of the following month. Later corrections need explicit approval.",
      },
    },
  ];

  const EXPERTS = [
    { id: "e1", name: "Lotte Janssens", role: "Senior payroll specialist, Benefits", countries: ["BE"], tags: ["benefits", "meal-vouchers", "remote-work", "corrections"], lastActiveDays: 1, answeredBefore: 14, availability: "Available today" },
    { id: "e2", name: "Marc Hoffmann", role: "Payroll expert Luxembourg", countries: ["LU", "BE"], tags: ["overtime", "premiums", "working-time", "payroll-run"], lastActiveDays: 3, answeredBefore: 9, availability: "Available tomorrow" },
    { id: "e3", name: "Camille Laurent", role: "Payroll consultant France", countries: ["FR"], tags: ["overtime", "premiums", "benefits", "meal-vouchers", "remote-work"], lastActiveDays: 2, answeredBefore: 11, availability: "Available today" },
    { id: "e4", name: "Pieter de Wit", role: "Knowledge owner, Payroll BE", countries: ["BE"], tags: ["payroll-run", "corrections", "calendar", "benefits"], lastActiveDays: 0, answeredBefore: 22, availability: "In a meeting until 15:00" },
    { id: "e5", name: "Anouk Visser", role: "Payroll specialist Netherlands", countries: ["NL"], tags: ["overtime", "payroll-run", "benefits"], lastActiveDays: 12, answeredBefore: 4, availability: "Available today" },
  ];

  const data = { REF_DATE, COUNTRIES, SOURCES, SCENARIOS, EXPERTS };
  if (typeof module !== "undefined" && module.exports) module.exports = data;
  root.TL_DATA = data;
})(typeof window !== "undefined" ? window : globalThis);
