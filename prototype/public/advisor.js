// Gap Closer advisor: scores funding sources and past donors for one home, recommends a set that
// covers the gap, and totals any set the user picks. Pure functions, no network.
// Every weight below is an ASSUMPTION for the prototype, not a finding from any source.
(function (root) {
  const WEIGHTS = {
    unverifiedFactor: 0.5, // ASSUMPTION: a source we could not confirm counts half
    lateFactor: 0.5,       // ASSUMPTION: money that arrives after the deadline counts half
    donor: {
      giving: { city: 1.0, county: 0.4, none: 0.1 }, // ASSUMPTION: past gifts in the same city matter most
      ties: { city: 0.3, county: 0.1, none: 0 },      // ASSUMPTION: having lived or worked here adds to that
      maxAffinity: 1.3,
      base: 0.6,             // ASSUMPTION: best-case chance a warm donor says yes
      cap: 0.85,
      recentYears: 3,        // ASSUMPTION: a gift in the last 3 years counts as recent
      staleFactor: 0.6,
      nonHousingFactor: 0.5, // ASSUMPTION: donors without a housing interest are half as likely
      fundsMonths: 1,        // ASSUMPTION: a yes turns into money within about a month
      prepMonths: {          // ASSUMPTION: time to prepare the ask, by donor type
        individual: 0.5, 'donor-advised fund': 0.5, trust: 1, 'family foundation': 1.5,
        corporate: 2, 'faith community': 1, 'giving circle': 1, 'community fund': 1.5,
      },
      roundTo: 500,
    },
  };

  const GROUPS = {
    public: 'Public programs',
    bond: 'Bonds',
    lender: 'Lenders and banks',
    org: 'Donors: organizations',
    individual: 'Donors: individuals',
  };
  const groupOf = (level, donor) => {
    if (donor) return donor.is_individual ? 'individual' : 'org';
    if (level === 'bond') return 'bond';
    if (level === 'lender') return 'lender';
    return 'public';
  };

  const median = (xs) => {
    if (!xs.length) return 0;
    const a = [...xs].sort((x, y) => x - y);
    const m = Math.floor(a.length / 2);
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  };
  // "grew up" + "Santa Ana" -> "Grew up in Santa Ana"; "contact lives" -> "Main contact lives in ..."
  function tiePhrase(t) {
    const k = (t && t.kind) || 'lived';
    const verb = { lived: 'Lived in', lives: 'Lives in', 'grew up': 'Grew up in', 'based in': 'Based in' };
    const phrase = k.startsWith('contact ') ? `Main contact ${(verb[k.slice(8)] || k.slice(8)).toLowerCase()}` : (verb[k] || k);
    return `${phrase} ${t.city}`;
  }

  // Time to money, counted from today = time to prepare this application or ask + time from
  // submission to money.
  function timeline(ctx, prep, funds) {
    if (funds == null) return { months: null, prep, funds };
    return { months: Math.round(((prep || 0) + funds) * 10) / 10, prep: prep || 0, funds };
  }

  function scoreSource(s, ctx) {
    const p = s.placeholder || {};
    const t = timeline(ctx, p.prep_months, p.months_to_funds);
    const c = {
      id: s.id, kind: 'program', level: s.level, group: groupOf(s.level), name: s.name, url: s.url,
      nextStep: s.next_step, record: s, reasons: [], ...t,
      verified: s.source_status === 'VERIFIED', either: s.stack_group || null,
    };
    if (s.funds_open === 'no') return { ...c, countable: false, why: 'Reported closed or winding down.' };
    if (!p.counts_toward_gap) return { ...c, countable: false, why: p.why_counts || 'No confirmed money yet. Research it first.' };
    let amount = p.award_per_home || 0;
    if (p.max_total) amount = Math.min(amount, p.max_total);
    amount = Math.min(amount, ctx.gap);
    let prob = p.probability || 0;
    if (!c.verified) { prob *= WEIGHTS.unverifiedFactor; c.reasons.push('Source not confirmed, so its chance is halved.'); }
    const late = t.months != null && t.months > ctx.deadlineMonths;
    if (late) { prob *= WEIGHTS.lateFactor; c.reasons.push(`About ${t.months} months to money is past your ${ctx.deadlineMonths}-month deadline, so its chance is halved.`); }
    if (s.funds_open === 'unknown') c.reasons.push('Whether funds are open now is unknown.');
    if (s.requires) c.reasons.push(`Only if: ${s.requires}.`);
    if (p.why_counts) c.reasons.push(p.why_counts);
    return { ...c, countable: amount > 0 && prob > 0, amount, probability: prob, late };
  }

  function scoreDonor(d, ctx) {
    const W = WEIGHTS.donor;
    const gifts = d.gifts || [];
    const housing = gifts.filter((g) => g.purpose === 'housing');
    const lastYear = gifts.reduce((m, g) => Math.max(m, g.year), 0);
    const recent = ctx.nowYear - lastYear <= W.recentYears;
    const region = d.region || { match: 'none', tie_match: 'none', ties_here: [] };
    const t = timeline(ctx, W.prepMonths[d.type] ?? 1, W.fundsMonths);
    const c = {
      id: d.id, kind: 'donor', level: 'donor', group: groupOf(null, d), name: d.display_name, url: null,
      record: d, reasons: [], ...t, verified: true, either: null,
      match: region.match, tieMatch: region.tie_match, recent, lastYear,
      nextStep: 'Draft a personal ask that names this neighborhood. Review it, then send it from your own email. This tool never sends anything.',
    };
    if (d.do_not_solicit) return { ...c, countable: false, why: 'Marked do not solicit in the CRM.' };
    const housingInterest = (d.interests || []).includes('housing') || housing.length > 0;
    const affinity = Math.min(W.maxAffinity, W.giving[region.match] + W.ties[region.tie_match]);
    let prob = W.base * affinity;
    if (!recent) prob *= W.staleFactor;
    if (!housingInterest) prob *= W.nonHousingFactor;
    prob = Math.min(prob, W.cap);
    const basis = housing.length ? housing : gifts;
    const ask = Math.min(Math.round(median(basis.map((g) => g.amount)) / W.roundTo) * W.roundTo, ctx.gap);

    if (region.match === 'city') c.reasons.push(`Has given in ${ctx.city} ${region.gifts_in_city} time${region.gifts_in_city > 1 ? 's' : ''}.`);
    else if (region.match === 'county') c.reasons.push(`Has given in ${ctx.county}, not yet in ${ctx.city || 'this city'}.`);
    else c.reasons.push(`No gifts in ${ctx.county || 'this county'} on record.`);
    for (const tie of region.ties_here || []) c.reasons.push(`${tiePhrase(tie)} (${tie.years}). Personal ties to the area raise the chance.`);
    c.reasons.push(recent ? `Last gift ${lastYear}.` : `Last gift ${lastYear}, more than ${W.recentYears} years ago.`);
    if (!housingInterest) c.reasons.push('No housing interest on record.');
    c.reasons.push(`Suggested ask is the median of ${housing.length ? 'their past housing gifts' : 'their past gifts'}.`);
    const late = t.months > ctx.deadlineMonths;
    return { ...c, countable: ask > 0 && prob > 0, amount: ask, probability: prob, late };
  }

  // Score everything and pick a recommended set.
  function advise({ sources, donors, gap, deadlineMonths, place, nowYear }) {
    gap = Math.max(0, gap);
    const ctx = { gap, deadlineMonths, nowYear, city: place && place.city, county: place && place.county };
    const all = [...(sources || []).map((s) => scoreSource(s, ctx)), ...(donors || []).map((d) => scoreDonor(d, ctx))];
    for (const c of all) c.expected = c.countable ? c.amount * c.probability : 0;

    const countable = all.filter((c) => c.countable).sort((a, b) => b.expected - a.expected || (a.months ?? 99) - (b.months ?? 99));
    const usedEither = new Set();
    let risk = 0;
    for (const c of countable) {
      // Programs in one either-or group (two CalHFA buyer loans) can't both be counted. ASSUMPTION.
      if (c.either && usedEither.has(c.either)) { c.note = 'Either-or with a higher-scoring program from the same agency.'; continue; }
      // Recommend until the gap is covered on a risk-weighted basis...
      if (risk < gap) { c.recommended = true; risk += c.expected; if (c.either) usedEither.add(c.either); continue; }
      // ...plus every warm local donor: gave in this same city in the last few years. Cheap to ask,
      // likely to say yes. Personal ties raise a donor's chance above, not this rule. ASSUMPTION.
      if (c.kind === 'donor' && c.recent && c.match === 'city') { c.recommended = true; c.warm = true; risk += c.expected; }
    }
    return { gap, ctx, candidates: all, weights: WEIGHTS };
  }

  // Total any selection. amounts: optional {id: amount} overrides from the plan builder.
  function totals(candidates, selectedIds, amounts, gap, deadlineMonths) {
    const picked = candidates.filter((c) => c.countable && selectedIds.has(c.id));
    let face = 0, expected = 0, latest = 0;
    const byGroup = {};
    const eitherSeen = {}, conflicts = [];
    for (const c of picked) {
      const amt = amounts[c.id] != null ? amounts[c.id] : c.amount;
      const exp = amt * c.probability;
      face += amt; expected += exp;
      byGroup[c.group] = (byGroup[c.group] || 0) + exp;
      if (c.months != null) latest = Math.max(latest, c.months);
      if (c.either) { if (eitherSeen[c.either]) conflicts.push([eitherSeen[c.either], c.name]); else eitherSeen[c.either] = c.name; }
    }
    return {
      count: picked.length, face, expected, byGroup, latest, conflicts,
      late: picked.filter((c) => c.months != null && c.months > deadlineMonths).map((c) => c.name),
      unverified: picked.filter((c) => !c.verified).map((c) => c.name),
      faceShare: gap ? face / gap : 0,
      expectedShare: gap ? expected / gap : 0,
      remaining: Math.max(0, gap - expected),
    };
  }

  root.Advisor = { advise, totals, scoreSource, scoreDonor, tiePhrase, WEIGHTS, GROUPS };
})(typeof window !== 'undefined' ? window : globalThis);
