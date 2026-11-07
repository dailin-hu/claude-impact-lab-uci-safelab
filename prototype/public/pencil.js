// Gap Closer "does it pencil" math for one home. Pure functions, no network, so anyone can check
// every step. The equation: family price + subsidies + earned income + gap - cost to create = $0.
//
// Family price: the family's monthly housing budget pays principal and interest on a 30-year
// fixed loan at the published rate, plus property tax, insurance and HOA dues. Price = loan + down
// payment. Tax, insurance, HOA and down payment defaults are ASSUMPTIONS, labelled in the UI.
(function (root) {
  // Monthly principal and interest per dollar borrowed.
  function payFactor(ratePct, years) {
    const r = ratePct / 100 / 12, n = years * 12;
    return r === 0 ? 1 / n : r / (1 - Math.pow(1 + r, -n));
  }

  // Monthly cost per dollar of price: the loan share plus property tax.
  function perDollar(a) {
    return (1 - a.downPct / 100) * payFactor(a.ratePct, a.years) + a.taxPct / 100 / 12;
  }

  // The highest price a monthly budget can carry. a: {ratePct, years, taxPct, insMonthly, hoaMonthly, downPct}
  function priceFromBudget(monthly, a) {
    const room = monthly - a.insMonthly - a.hoaMonthly;
    return room > 0 ? room / perDollar(a) : 0;
  }

  // The monthly budget a price needs (the inverse, used to set the manual default).
  function budgetFromPrice(price, a) {
    return price * perDollar(a) + a.insMonthly + a.hoaMonthly;
  }

  // Monthly housing budget from the statute and the income table, or null when any figure is
  // missing (we never fill a missing figure). aff: data/affordability.json.
  function statuteBudget(aff, size, tierId) {
    if (!aff) return null;
    const median = aff.income_limits && aff.income_limits.median_income_by_size[String(size)];
    const tier = aff.statute && aff.statute.owner_tiers.find((t) => t.id === tierId);
    if (!median || !tier || tier.median_pct == null || tier.cost_pct == null) return null;
    const annual = median * (tier.median_pct / 100) * (tier.cost_pct / 100);
    return { monthly: annual / 12, annual, median, tier };
  }

  // True when the statute mode has everything it needs for at least one size and tier.
  function statuteReady(aff) {
    if (!aff) return false;
    const sizes = aff.income_limits.household_sizes || [];
    return aff.statute.owner_tiers.some((t) => sizes.some((s) => statuteBudget(aff, s, t.id)));
  }

  // The one-home bill. deal: {costs:{...}, subsidies, earned}, price: family price.
  function bill(deal, price) {
    const cost = Object.values(deal.costs).reduce((s, v) => s + (Number(v) || 0), 0);
    const paidWithoutGap = price + (Number(deal.subsidies) || 0) + (Number(deal.earned) || 0);
    const gap = cost - paidWithoutGap;
    return { cost, price, subsidies: Number(deal.subsidies) || 0, earned: Number(deal.earned) || 0, gap };
  }

  // How the gap moves with the rate, holding the family's monthly budget fixed.
  function gapAtRate(deal, monthly, a, ratePct) {
    return bill(deal, priceFromBudget(monthly, { ...a, ratePct })).gap;
  }

  // Calculated amount for a program whose award is a share of the price (CalHFA buyer help).
  function formulaAmount(f, price) {
    if (!f || !price) return null;
    let amt = price * f.pct_of_price;
    if (f.cap != null) amt = Math.min(amt, f.cap);
    return Math.round(amt);
  }

  root.Pencil = { payFactor, priceFromBudget, budgetFromPrice, statuteBudget, statuteReady, bill, gapAtRate, formulaAmount };
})(typeof window !== 'undefined' ? window : globalThis);
