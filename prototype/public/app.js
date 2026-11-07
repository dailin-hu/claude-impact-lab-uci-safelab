// Gap Closer UI: Start, then four full-height steps that slide left and right.
// 1 Locate the home · 2 Calculate the funding gap · 3 Build your funding plan · 4 Take action.
// PROTOTYPE ONLY.
(function () {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => [...document.querySelectorAll(sel)];
  const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const pct = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 0 });
  const NOW_YEAR = new Date().getFullYear();
  const SAMPLE_ADDRESS = '20 Civic Center Plaza, Santa Ana, CA 92701'; // Santa Ana City Hall, a public building
  const GROUPS = window.Advisor.GROUPS;
  const GROUP_ORDER = ['public', 'bond', 'lender', 'org', 'individual'];
  const gcolor = (g) => `var(--g-${g})`;
  const LEVEL = {
    federal: { label: 'Federal', icon: 'building-library' },
    state: { label: 'State', icon: 'scale' },
    county: { label: 'County', icon: 'map' },
    city: { label: 'City', icon: 'building-office-2' },
    bond: { label: 'Bond', icon: 'banknotes' },
    lender: { label: 'Lender or bank', icon: 'circle-stack' },
  };
  const LAST = 4;

  const state = {
    screen: 0, place: null, sources: [], donors: [], allDonors: [], crm: null, asOf: null, notes: [],
    advice: null, selected: new Set(), amounts: {}, edits: {}, touched: false,
    filter: 'all', sort: 'expected', drawer: null, researched: false, busy: false, marker: null,
  };

  // ---------- settings (this browser only) ----------
  // Profile, connectors and preferences live in localStorage on this device. Nothing is sent
  // anywhere. Gmail and HubSpot are SYNTHETIC demo connections; the rest are tentative (not built).
  const SETTINGS_KEY = 'gapcloser.settings.v1';
  const DEFAULT_SETTINGS = {
    profile: { name: '', position: '', org: '', email: '', phone: '' },
    connectors: { gmail: true, hubspot: true },
    prefs: { deadline: 18, basemap: 'osm' },
  };
  function loadSettings() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null'); } catch (e) { s = null; }
    s = s || {};
    return {
      profile: { ...DEFAULT_SETTINGS.profile, ...(s.profile || {}) },
      connectors: { ...DEFAULT_SETTINGS.connectors, ...(s.connectors || {}) },
      prefs: { ...DEFAULT_SETTINGS.prefs, ...(s.prefs || {}) },
    };
  }
  function saveSettings() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) { /* private window: keep in memory */ }
  }
  let settings = loadSettings();

  // ---------- helpers ----------
  function icon(name) {
    const t = document.createElement('template');
    t.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">${window.ICONS[name] || ''}</svg>`;
    return t.content.firstChild;
  }
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'checked' || k === 'value') el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    return el;
  }
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toast.timer); toast.timer = setTimeout(() => { t.hidden = true; }, 2400);
  }
  async function getJSON(url) {
    const res = await fetch(url);
    const body = await res.json().catch(() => ({ error: 'The server sent something unexpected.' }));
    if (!res.ok) throw new Error(body.error || `Request failed (${res.status}).`);
    return body;
  }
  const placeLabel = () => (state.place ? [state.place.city, state.place.county, state.place.state].filter(Boolean).join(', ') : '');
  const titleCase = (s) => s.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase()).replace(/\bCa\b/, 'CA');
  const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const cands = () => (state.advice ? state.advice.candidates : []);
  const byId = (id) => cands().find((c) => c.id === id);
  const amountOf = (c) => (state.amounts[c.id] != null ? state.amounts[c.id] : c.amount);
  const typeLabel = (c) => (c.kind === 'donor' ? (c.record.is_individual ? 'Individual' : capitalize(c.record.type)) : (LEVEL[c.level] || {}).label || 'Program');
  const iconFor = (c) => (c.kind === 'donor' ? (c.record.is_individual ? 'user' : 'user-group') : (LEVEL[c.level] || LEVEL.city).icon);
  const months = (m) => (m == null ? '?' : `${m}`);

  // ---------- navigation ----------
  const NEXT = { 1: 'Calculate the gap', 2: 'Build your plan', 3: 'Make action list', 4: 'Copy action list' };
  const canGo = (i) => i <= 1 || state.researched;
  function go(i) {
    i = Math.max(0, Math.min(LAST, i));
    if (!canGo(i)) { toast('Place the home first.'); return; }
    state.screen = i;
    $('#track').style.transform = `translateX(${-100 * i}%)`;
    $$('.screen').forEach((s) => { const on = Number(s.dataset.screen) === i; s.inert = !on; s.setAttribute('aria-hidden', String(!on)); });
    document.body.classList.toggle('on-start', i === 0);
    $$('#stepper button').forEach((b) => {
      const n = Number(b.dataset.go);
      b.disabled = !canGo(n);
      if (n === i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
    $('#back-btn').disabled = i <= 0;
    $('#next-label').textContent = NEXT[i] || 'Next';
    $('#next-btn').disabled = i === 1 && !state.researched;
    updateHint();
    if (i !== 3) closeDrawer();
    if (i === 1) setTimeout(() => map.invalidateSize(), 560);
    if (i === 4) { renderActions(); if (!state.ai) checkAI(); }
  }
  function updateHint() {
    const g = readGap();
    const hints = {
      1: state.researched ? `Ready: ${placeLabel()}. Next, calculate the funding gap.` : 'Type an address and pick a suggestion, or click the map.',
      2: `Goal ${usd.format(g.gap)} within ${g.deadline} months. Move the rate to see the gap change.`,
      3: 'Tick sources to add them to your plan. Click a name for details.',
      4: 'Draft emails and applications. You review and send everything yourself.',
    };
    $('#controls-hint').textContent = hints[state.screen] || '';
  }

  // ---------- step 1: map ----------
  const map = L.map('map', { scrollWheelZoom: true }).setView([33.70, -117.83], 10);
  // Map styles, chosen in Settings. Esri layers need Esri attribution; their terms were not
  // checked for this prototype. Read them before using these beyond a demo.
  const BASEMAPS = {
    osm: { name: 'Street', by: 'OpenStreetMap', url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', native: 19,
      attr: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' },
    light: { name: 'Light gray', by: 'Esri', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', native: 16,
      attr: 'Tiles © Esri and its data providers' },
    satellite: { name: 'Satellite', by: 'Esri World Imagery', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', native: 19,
      attr: 'Tiles © Esri and its data providers' },
  };
  let tiles = null;
  function setBasemap(key) {
    const b = BASEMAPS[key] || BASEMAPS.osm;
    if (tiles) tiles.remove();
    tiles = L.tileLayer(b.url, { maxZoom: 19, maxNativeZoom: b.native, attribution: b.attr }).addTo(map);
  }
  setBasemap(settings.prefs.basemap);
  map.on('click', (e) => locate({ lat: e.latlng.lat.toFixed(6), lon: e.latlng.lng.toFixed(6) }));

  function placeMarker(lat, lon) {
    const pinIcon = L.divIcon({ className: '', html: `<div class="pin">${icon('map-pin').outerHTML}</div>`, iconSize: [36, 36], iconAnchor: [18, 18] });
    if (state.marker) state.marker.setLatLng([lat, lon]);
    else state.marker = L.marker([lat, lon], { icon: pinIcon, keyboard: false }).addTo(map);
    map.flyTo([lat, lon], Math.max(map.getZoom(), 15), { duration: 0.6 });
  }

  // ---------- step 1: address suggestions (combobox) ----------
  const input = $('#address');
  const list = $('#suggest-list');
  let suggestions = [], active = -1, suggestSeq = 0, suggestTimer = null;

  function closeSuggest() {
    list.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); active = -1;
  }
  function renderSuggest() {
    list.replaceChildren();
    if (!suggestions.length) { closeSuggest(); return; }
    suggestions.forEach((s, i) => {
      list.append(h('li', {
        id: `sug-${i}`, role: 'option', 'aria-selected': String(i === active),
        onmousedown: (e) => { e.preventDefault(); pick(i); },
      }, s.line1, h('span', { text: s.line2 })));
    });
    list.append(h('li', { class: 'suggest-note', role: 'presentation', text: 'Suggestions: Photon, OpenStreetMap data' }));
    list.hidden = false; input.setAttribute('aria-expanded', 'true');
    if (active >= 0) input.setAttribute('aria-activedescendant', `sug-${active}`); else input.removeAttribute('aria-activedescendant');
  }
  async function fetchSuggest(q) {
    const seq = ++suggestSeq;
    try {
      const body = await getJSON(`/api/suggest?q=${encodeURIComponent(q)}`);
      if (seq !== suggestSeq) return; // a newer keystroke won
      suggestions = body.suggestions || []; active = -1; renderSuggest();
    } catch (e) { if (seq === suggestSeq) closeSuggest(); }
  }
  function pick(i) {
    const s = suggestions[i];
    if (!s) return;
    input.value = s.label;
    closeSuggest();
    locate({ lat: s.lat.toFixed(6), lon: s.lon.toFixed(6) }, s.label);
  }
  input.addEventListener('input', () => {
    clearTimeout(suggestTimer);
    const q = input.value.trim();
    if (q.length < 3) { suggestions = []; closeSuggest(); return; }
    suggestTimer = setTimeout(() => fetchSuggest(q), 300);
  });
  input.addEventListener('keydown', (e) => {
    if (list.hidden || !suggestions.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); active = (active + 1) % suggestions.length; renderSuggest(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = (active - 1 + suggestions.length) % suggestions.length; renderSuggest(); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); pick(active); }
    else if (e.key === 'Escape') { closeSuggest(); }
  });
  input.addEventListener('blur', () => setTimeout(closeSuggest, 120));

  // ---------- step 1: locate ----------
  async function locate(query, label) {
    if (state.busy) return;
    state.busy = true;
    $('#loc-error').hidden = true;
    $('#map-hint').textContent = 'Looking up this spot with the U.S. Census Geocoder…';
    $('#search-btn').disabled = true;
    try {
      const place = await getJSON(`/api/locate?${new URLSearchParams(query)}`);
      if (label) place.matched_address = label;
      setPlace(place);
      await research();
    } catch (err) {
      $('#loc-error').hidden = false;
      $('#loc-error').textContent = err.message;
    } finally {
      state.busy = false;
      $('#search-btn').disabled = false;
      $('#map-hint').textContent = 'Click the map to move the home.';
    }
  }

  function setPlace(p) {
    state.place = p;
    placeMarker(p.lat, p.lon);
    $('#loc-result').hidden = false;
    $('#loc-title').textContent = p.matched_address ? titleCase(p.matched_address) : `Pin at ${Number(p.lat).toFixed(5)}, ${Number(p.lon).toFixed(5)}`;
    $('#loc-city').textContent = p.city || 'Unincorporated';
    $('#loc-county').textContent = p.county || 'Unknown';
    $('#loc-state').textContent = p.state || 'Unknown';
    $('#loc-tract').textContent = p.tract ? p.tract.replace('Census Tract ', '') : 'Unknown';
    $('#loc-source').textContent = `City, county and tract: ${p.source.name}, retrieved ${p.source.retrieved}.`;
    $('#gap-place').textContent = `Does it pencil? One home at ${$('#loc-title').textContent}, ${placeLabel()}.`;
  }

  async function research() {
    const p = state.place;
    if (!p) return;
    const q = new URLSearchParams({ state: p.state || '', county: p.county || '', city: p.city || '' });
    const [fund, crm] = await Promise.all([getJSON(`/api/funding?${q}`), getJSON(`/api/crm/donors?${q}`)]);
    state.sources = fund.sources;
    state.notes = fund.notes || [];
    state.asOf = fund.as_of;
    state.allDonors = crm.donors;
    state.donors = settings.connectors.hubspot ? crm.donors : [];
    state.crm = crm.connector;
    state.researched = true;
    state.touched = false;
    state.amounts = {};
    state.edits = {};
    recompute();
    go(state.screen);
  }

  // ---------- gap: does it pencil? ----------
  // The gap is calculated, not typed: cost to create - family price - subsidies - earned income.
  // Family price comes from a monthly budget and the published mortgage rate (see pencil.js).
  const P = window.Pencil;
  const SYNTHETIC_FAMILY_PRICE = 285000; // the repo's synthetic example deal. ASSUMPTION
  const pen = { rates: null, aff: null, mode: 'manual', published: null, price: null, gap: 95000, statute: null };
  const fmtDate = (iso) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'unknown');
  const rate2 = (r) => `${Number(r).toFixed(2)}%`;
  const val = (sel) => Number($(sel).value) || 0;

  function assumptions(ratePct) {
    return { ratePct: ratePct ?? val('#rate'), years: 30, taxPct: val('#tax'), insMonthly: val('#ins'), hoaMonthly: val('#hoa'), downPct: val('#down') };
  }
  function deal() {
    const costs = {};
    $$('[data-cost]').forEach((el) => { costs[el.dataset.cost] = Number(el.value) || 0; });
    return { costs, subsidies: val('#subsidies'), earned: val('#earned') };
  }
  function monthlyBudget() {
    if (pen.mode === 'statute') {
      pen.statute = P.statuteBudget(pen.aff, $('#hh-size').value, $('#hh-tier').value);
      if (pen.statute) { $('#budget').value = Math.round(pen.statute.monthly); return pen.statute.monthly; }
    }
    pen.statute = null;
    return val('#budget');
  }

  function setMode(mode) {
    pen.mode = mode;
    $$('#budget-mode [data-mode]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.mode === mode)));
    $('#statute-fields').hidden = mode !== 'statute';
    $('#budget').readOnly = mode === 'statute';
    renderPencil();
  }

  async function loadPencilData() {
    const [rates, aff] = await Promise.all([
      getJSON('/api/rates').catch(() => null),
      getJSON('/api/affordability').catch(() => null),
    ]);
    pen.rates = rates;
    pen.aff = aff;
    pen.published = rates ? rates.latest.rate : null;
    $('#rate').value = pen.published ?? 7;
    // Manual default: the budget that makes the synthetic deal's family price hold at today's rate.
    $('#budget').value = P.budgetFromPrice(SYNTHETIC_FAMILY_PRICE, assumptions()).toFixed(2);
    const ready = P.statuteReady(aff);
    const sb = $('#budget-mode [data-mode="statute"]');
    sb.disabled = !ready;
    if (aff) {
      $('#hh-size').replaceChildren(...aff.income_limits.household_sizes.map((s) => h('option', { value: s, text: `${s} ${s > 1 ? 'people' : 'person'}` })));
      $('#hh-size').value = '4';
      $('#hh-tier').replaceChildren(...aff.statute.owner_tiers.map((t) => h('option', { value: t.id, text: t.label })));
      $('#hh-tier').value = 'low';
    }
    setMode(ready ? 'statute' : 'manual');
  }

  function renderPencil() {
    const a = assumptions();
    const monthly = monthlyBudget();
    const d = deal();
    const price = P.priceFromBudget(monthly, a);
    const b = P.bill(d, price);
    pen.price = price;
    pen.gap = b.gap;

    $('#cost-total').textContent = usd.format(b.cost);
    $('#family-price').textContent = usd.format(price);
    $('#gap-line').textContent = b.gap >= 0 ? usd.format(b.gap) : `${usd.format(-b.gap)} surplus`;
    $('#rate-val').textContent = rate2(a.ratePct);
    $('#rate-reset').hidden = pen.published == null || Math.abs(a.ratePct - pen.published) < 0.005;

    // Where the budget comes from.
    const aff = pen.aff;
    $('#statute-note').textContent = P.statuteReady(aff)
      ? `HSC 50052.5 (checked ${fmtDate(aff.statute.checked)}) and the ${aff.income_limits.name}, ${aff.income_limits.county} (revised ${fmtDate(aff.income_limits.revised)}).`
      : 'Statute mode needs the Orange County median income from the HCD 2026 table and the owner percentages in Health and Safety Code 50052.5, entered in data/affordability.json with the date checked. Until then the budget is manual.';
    $('#budget-note').replaceChildren(...(pen.statute
      ? [`Statute: ${pen.statute.tier.cost_pct}% × ${pen.statute.tier.median_pct}% of the ${aff.income_limits.county} median for ${$('#hh-size').value} people (${usd.format(pen.statute.median)}) ÷ 12 = ${usd.format(pen.statute.monthly)} a month.`]
      : [h('span', { class: 'chip chip-assume', text: 'Assumption' }), ` Set so the synthetic deal's ${usd.format(SYNTHETIC_FAMILY_PRICE)} family price holds at the published rate with the price assumptions below. Replace it with the family's real budget.`]));

    // Rate sensitivity, holding the family's monthly budget fixed.
    const r = pen.rates;
    $('#rate-src').replaceChildren(...(r
      ? ['Freddie Mac PMMS 30-year fixed: ', h('b', { text: rate2(r.latest.rate) }), ` on ${fmtDate(r.latest.date)}. `, h('a', { href: r.page, target: '_blank', rel: 'noopener', text: 'freddiemac.com/pmms' }), ` · cached ${fmtDate(r.cached_on)}`]
      : [h('span', { class: 'chip chip-assume', text: 'Assumption' }), ' The rate file did not load, so 7% is a placeholder. Set the rate yourself.']));
    const at = (x) => P.gapAtRate(d, monthly, a, x);
    const step = at(a.ratePct + 0.25) - at(a.ratePct);
    const lines = [];
    if (r) {
      const now = at(r.latest.rate), then = at(r.month_ago.rate);
      const diff = now - then;
      lines.push(`At ${rate2(r.month_ago.rate)} on ${fmtDate(r.month_ago.date)} the gap was ${usd.format(then)}. The ${diff <= 0 ? 'drop' : 'rise'} to ${rate2(r.latest.rate)} ${diff <= 0 ? 'cut' : 'added'} ${usd.format(Math.abs(diff))} ${diff <= 0 ? 'from' : 'to'} the gap for this home.`);
      if (Math.abs(a.ratePct - r.latest.rate) >= 0.005) {
        const off = b.gap - now;
        lines.push(`At ${rate2(a.ratePct)} the gap is ${usd.format(b.gap)}: ${usd.format(Math.abs(off))} ${off >= 0 ? 'more' : 'less'} than at the published rate.`);
      }
    }
    lines.push(`Each +0.25 points adds about ${usd.format(step)} to the gap.`);
    $('#rate-move').replaceChildren(...lines.map((t) => h('span', { text: t })));

    // The $0 equation, on screen.
    const fund = Math.max(0, b.gap);
    $('#equation').replaceChildren(
      h('span', { class: 'label', text: 'The equation for this home' }),
      h('p', {},
        h('b', { text: usd.format(price) }), ' family + ', h('b', { text: usd.format(b.subsidies) }), ' subsidies + ',
        h('b', { text: usd.format(b.earned) }), ' earned + ', h('b', { class: 'eq-gap', text: usd.format(fund) }), ' fundraising − ',
        h('b', { text: usd.format(b.cost) }), ' cost = ', h('b', { text: usd.format(price + b.subsidies + b.earned + fund - b.cost) })),
      b.gap < 0 ? h('p', { class: 'caption', text: 'This home pencils without fundraising at these numbers.' }) : '');

    renderDates();
    recompute();
  }

  function renderDates() {
    const today = new Date();
    const ageDays = (iso) => (iso ? (today - new Date(`${iso}T12:00:00`)) / 864e5 : Infinity);
    const items = [];
    const r = pen.rates;
    if (r) {
      const stale = ageDays(r.latest.date) > 14; // published weekly
      items.push({ name: 'Mortgage rate: Freddie Mac PMMS', url: r.page, text: `Latest ${fmtDate(r.latest.date)}, cached ${fmtDate(r.cached_on)}`, warn: stale ? 'Stale: the series updates weekly. Refresh data/PMMS_history.csv.' : null });
    } else {
      items.push({ name: 'Mortgage rate', text: 'Unknown: the rate file did not load.', warn: 'Not loaded.' });
    }
    const aff = pen.aff;
    if (aff) {
      const il = aff.income_limits;
      items.push({ name: il.name, url: il.url, text: `Revised ${fmtDate(il.revised)}, replaces the ${fmtDate(il.replaces)} version`, warn: il.checked ? (ageDays(il.revised) > 365 ? 'More than a year old: look for a newer revision.' : null) : `${il.county} figures not entered yet.` });
      items.push({ name: aff.home_limits.name, url: aff.home_limits.url, text: `Effective ${fmtDate(aff.home_limits.effective)}. A separate table for HOME-funded buyers, not used in the price yet.` });
      items.push({ name: 'Health and Safety Code 50052.5', url: aff.statute.url, text: aff.statute.checked ? `Checked ${fmtDate(aff.statute.checked)}` : 'Owner cost percentages', warn: aff.statute.checked ? null : 'Not read yet: figures not entered.' });
    }
    items.push({ name: 'Cost lines, subsidies, earned income', text: 'Synthetic example deal (lanes/3-fund-it/data). Every number is an assumption until you enter your pro forma.', warn: null });
    $('#data-dates').replaceChildren(...items.map((it) => h('li', { class: it.warn ? 'warn' : '' },
      it.url ? h('a', { href: it.url, target: '_blank', rel: 'noopener', text: it.name }) : h('b', { text: it.name }),
      h('span', { text: ` · ${it.text}` }),
      it.warn ? h('span', { class: 'warn-text', text: ` ${it.warn}` }) : '')));
  }

  function readGap() {
    const gap = Math.max(0, Math.round(pen.gap || 0));
    const deadline = Math.max(1, Math.round(Number($('#deadline').value) || 18));
    return { gap, deadline, price: pen.price };
  }

  function recompute() {
    const g = readGap();
    $('#gap-total').textContent = usd.format(g.gap);
    $('#goal-time').textContent = `Needed within ${g.deadline} months from today.`;
    if (!state.researched) { updateHint(); return; }
    state.advice = window.Advisor.advise({
      sources: state.sources, donors: state.donors, gap: g.gap, price: g.price,
      deadlineMonths: g.deadline, place: state.place, nowYear: NOW_YEAR,
    });
    if (!state.touched) {
      state.selected = new Set(cands().filter((c) => c.recommended).map((c) => c.id));
      state.amounts = {};
      state.edits = {};
    } else {
      for (const id of [...state.selected]) if (!byId(id) || !byId(id).countable) state.selected.delete(id);
    }
    applyEdits(g.deadline);
    renderTable();
    updateHint();
  }

  // The user's own chance and timing, from the source popup, laid over the scored defaults.
  function applyEdits(deadline) {
    for (const c of cands()) {
      c.def = { amount: c.amount, probability: c.probability, prep: c.prep, funds: c.funds };
      const e = state.edits[c.id];
      if (!e || !c.countable) continue;
      if (e.probability != null) c.probability = e.probability;
      if (e.prep != null) c.prep = e.prep;
      if (e.funds != null) c.funds = e.funds;
      if (c.funds != null) { c.months = Math.round(((c.prep || 0) + c.funds) * 10) / 10; c.late = c.months > deadline; }
      c.expected = c.amount * c.probability;
      c.edited = true;
    }
  }
  const isEdited = (c) => !!(c.edited || state.amounts[c.id] != null);

  // ---------- step 3: table ----------
  function fitChips(c) {
    const chips = [];
    if (c.kind === 'donor') {
      const r = c.record.region;
      if (r.match === 'city') chips.push(h('span', { class: 'chip chip-solid' }, `Gave in ${state.place.city}`));
      else if (r.match === 'county') chips.push(h('span', { class: 'chip' }, `Gave in ${state.place.county.replace(' County', '')} County`));
      else chips.push(h('span', { class: 'chip' }, 'No local gifts'));
      if (r.tie_match !== 'none') chips.push(h('span', { class: r.tie_match === 'city' ? 'chip chip-solid' : 'chip' }, icon('home-modern'), window.Advisor.tiePhrase(r.ties_here[0])));
      chips.push(h('span', { class: 'chip' }, `Last gift ${c.lastYear}`));
    } else {
      const s = c.record;
      if (s.source_status === 'VERIFIED') chips.push(h('span', { class: 'chip chip-solid' }, icon('check-circle'), 'Page checked'));
      else if (s.source_status === 'PLACEHOLDER') chips.push(h('span', { class: 'chip chip-placeholder', text: 'Placeholder' }));
      else chips.push(h('span', { class: 'chip' }, icon('question-mark-circle'), 'Unverified'));
      if (c.calculated) chips.push(h('span', { class: 'chip chip-calc', text: `${(s.formula.pct_of_price * 100).toFixed(1).replace(/\.0$/, '')}% of price` }));
      if (s.funds_open === 'no') chips.push(h('span', { class: 'chip', text: 'Closed' }));
      else if (s.funds_open === 'unknown') chips.push(h('span', { class: 'chip', text: 'Funds open?' }));
    }
    return h('div', { class: 'fit' }, chips);
  }

  function sortKey(c) {
    if (state.sort === 'amount') return -c.amount;
    if (state.sort === 'probability') return -c.probability;
    if (state.sort === 'months') return c.months ?? 99;
    return -c.expected;
  }

  function renderTable() {
    const all = cands();
    const nearGifts = state.donors.filter((d) => d.region.match !== 'none').length;
    const nearTies = state.donors.filter((d) => d.region.tie_match !== 'none').length;
    const people = state.donors.filter((d) => d.is_individual).length;
    $('#cmp-summary').textContent = settings.connectors.hubspot
      ? `${placeLabel()} · ${state.sources.length} programs, bonds and lenders · ${state.donors.length} HubSpot donors (${people} individuals): ${nearGifts} gave in ${state.place.county || 'this county'}, ${nearTies} lived, grew up or are based there. Source list checked ${state.asOf}. Donor records are synthetic.`
      : `${placeLabel()} · ${state.sources.length} programs, bonds and lenders · HubSpot is disconnected in Settings, so no donors are shown. Source list checked ${state.asOf}.`;

    $('#filters').replaceChildren(...['all', ...GROUP_ORDER].map((k) => {
      const n = k === 'all' ? all.length : all.filter((c) => c.group === k).length;
      return h('button', {
        class: 'filter', type: 'button', role: 'tab', 'aria-selected': String(state.filter === k),
        onclick: () => { state.filter = k; renderTable(); },
      }, k === 'all' ? null : h('span', { class: 'dot', style: `background:${gcolor(k)}` }), k === 'all' ? 'All' : GROUPS[k], h('span', { class: 'count', text: n }));
    }));

    const shown = all.filter((c) => state.filter === 'all' || c.group === state.filter);
    const yes = shown.filter((c) => c.countable).sort((a, b) => sortKey(a) - sortKey(b) || b.expected - a.expected);
    const no = shown.filter((c) => !c.countable);
    const body = $('#cmp-body');
    body.replaceChildren();
    if (state.notes.length) body.append(h('tr', { class: 'sep' }, h('td', { colspan: 7, text: state.notes.join(' ') })));
    for (const c of yes) body.append(tableRow(c));
    if (no.length) {
      body.append(h('tr', { class: 'sep' }, h('td', { colspan: 7, text: `Not countable yet (${no.length}): research needed, closed, a loan, or do not solicit` })));
      for (const c of no) body.append(tableRow(c));
    }
    refreshNumbers();
  }

  function tableRow(c) {
    const sub = c.kind === 'donor' ? `${typeLabel(c)} · ${c.id}` : `${typeLabel(c)} · ${c.record.agency}`;
    const on = state.selected.has(c.id);
    const amt = c.countable ? h('label', { class: 'amt-in' }, h('span', { class: 'sr-only', text: `Amount for ${c.name}` }), h('input', {
      class: 'input', type: 'number', min: '0', step: '500', value: String(Math.round(amountOf(c))),
      oninput: (e) => {
        state.amounts[c.id] = Math.max(0, Number(e.target.value) || 0); state.touched = true;
        state.selected.add(c.id);
        refreshNumbers();
      },
    })) : '—';
    return h('tr', {
      class: `row${c.countable ? '' : ' muted-row'}${on ? ' on' : ''}${state.drawer === c.id ? ' active' : ''}`, 'data-row': c.id, style: `--gc:${gcolor(c.group)}`,
      title: 'Click for details and to edit the numbers',
      // Anywhere on the row opens the source popup, except the checkbox, amount box and links.
      onclick: (e) => { if (!e.target.closest('input, button, a, label, select')) openDrawer(c.id); },
    },
      h('td', { class: 'c-check' }, c.countable ? h('input', {
        class: 'check', type: 'checkbox', 'data-pick': c.id, 'aria-label': `Include ${c.name} in the plan`, checked: on,
        onchange: (e) => toggle(c.id, e.target.checked),
      }) : null),
      h('td', {}, h('div', { class: 'src-cell' },
        h('span', { class: 'disc', title: GROUPS[c.group] }, icon(iconFor(c))),
        h('div', {},
          h('button', { class: 'src-name', type: 'button', text: c.name, onclick: () => openDrawer(c.id) }),
          c.recommended ? h('span', { class: 'rec', text: c.warm ? 'Recommended · warm' : 'Recommended' }) : null,
          isEdited(c) ? h('span', { class: 'rec rec-edited', 'data-edited': c.id, text: 'Edited' }) : null,
          h('span', { class: 'src-sub', text: sub })))),
      h('td', {}, fitChips(c)),
      h('td', { class: 'num' }, amt),
      h('td', { class: 'num', text: c.countable ? pct.format(c.probability) : '—' }),
      h('td', {}, c.countable
        ? h('div', { class: 'ev' }, h('div', { class: 'ev-bar' }, h('span', { 'data-evbar': c.id })), h('strong', { 'data-exp': c.id }))
        : h('span', { class: 'caption', text: c.why })),
      h('td', { class: 'num' }, h('span', { class: `time${c.late ? ' late' : ''}`, title: c.months != null ? `Prepare ${c.prep} + wait ${c.funds} months` : 'Unknown' },
        h('b', { text: months(c.months) }), c.months != null ? h('small', { text: c.late ? 'after deadline' : `${c.prep} prep + ${c.funds} wait` }) : null)));
  }

  function toggle(id, on) {
    state.touched = true;
    if (on) state.selected.add(id); else state.selected.delete(id);
    refreshNumbers();
    if (state.drawer === id) openDrawer(id);
  }

  // Update numbers in place so typing in an amount keeps focus.
  function refreshNumbers() {
    const g = readGap();
    const maxEv = Math.max(1, ...cands().filter((c) => c.countable).map((c) => amountOf(c) * c.probability));
    for (const c of cands()) {
      if (!c.countable) continue;
      const ev = amountOf(c) * c.probability;
      const e = document.querySelector(`[data-exp="${c.id}"]`);
      if (e) e.textContent = usd.format(ev);
      const bar = document.querySelector(`[data-evbar="${c.id}"]`);
      if (bar) bar.style.width = `${Math.min(100, (ev / maxEv) * 100).toFixed(1)}%`;
      const row = document.querySelector(`tr[data-row="${c.id}"]`);
      if (row) {
        const on = state.selected.has(c.id);
        row.classList.toggle('on', on);
        const cb = row.querySelector('.check'); if (cb) cb.checked = on;
      }
    }
    const t = window.Advisor.totals(cands(), state.selected, state.amounts, g.gap, g.deadline);
    renderSummary(t, g);
  }

  // ---------- plan meter ----------
  function renderSummary(t, g) {
    const box = $('#summary');
    const scale = Math.max(g.gap, t.face, 1);
    const goalPos = (g.gap / scale) * 100;
    const picked = cands().filter((c) => c.countable && state.selected.has(c.id));
    const people = picked.filter((c) => c.group === 'individual').length;
    const tied = picked.filter((c) => c.kind === 'donor' && c.tieMatch !== 'none').length;
    const checks = [];
    if (t.count && t.latest) checks.push(['clock', `Slowest money in this plan: about ${t.latest} months from today. Deadline: ${g.deadline}.`]);
    if (t.late.length) checks.push(['exclamation-triangle', `${t.late.length} source${t.late.length > 1 ? 's' : ''} may pay after your deadline: ${t.late.join(', ')}.`]);
    if (t.conflicts.length) checks.push(['exclamation-triangle', `Either-or: ${t.conflicts.map((p) => p.join(' and ')).join('; ')}. Usually only one can be used.`]);
    if (t.unverified.length) checks.push(['question-mark-circle', `${t.unverified.length} unconfirmed source${t.unverified.length > 1 ? 's' : ''}, counted at half chance.`]);
    checks.push(['user', people ? `Includes ${people} individual donor${people > 1 ? 's' : ''}.` : 'No individual donors picked yet.']);
    if (tied) checks.push(['home-modern', `${tied} donor${tied > 1 ? 's' : ''} lived, grew up or are based near this home.`]);

    const expStack = h('div', { class: 'stack', style: `width:${Math.min(100, (t.expected / scale) * 100).toFixed(1)}%` },
      GROUP_ORDER.filter((k) => t.byGroup[k]).map((k) => h('span', { style: `width:${((t.byGroup[k] / (t.expected || 1)) * 100).toFixed(2)}%;background:${gcolor(k)}`, title: `${GROUPS[k]}: ${usd.format(t.byGroup[k])}` })));

    box.replaceChildren(
      h('div', {},
        h('span', { class: 'label', text: 'Your plan, risk-weighted' }),
        h('div', { class: 'big' }, pct.format(t.expectedShare), h('small', { text: ` of ${usd.format(g.gap)}` })),
        h('p', { class: 'sum-sub', text: t.count ? `${usd.format(t.expected)} expected from ${t.count} source${t.count > 1 ? 's' : ''}. ${t.remaining > 0 ? `${usd.format(t.remaining)} still open.` : 'Goal covered on a risk-weighted basis.'}` : 'Tick sources in the table to start.' })),
      h('div', { class: 'meter' },
        h('div', { class: 'meter-row' },
          h('div', { class: 'top' }, h('span', { text: 'If every source says yes' }), h('span', {}, h('b', { text: usd.format(t.face) }), ` · ${pct.format(t.faceShare)}`)),
          h('div', { class: 'track-bar' }, h('div', { class: 'fill', style: `width:${Math.min(100, (t.face / scale) * 100).toFixed(1)}%` }), h('div', { class: 'goal-line', style: `left:${goalPos}%` }))),
        h('div', { class: 'meter-row' },
          h('div', { class: 'top' }, h('span', { text: 'Risk-weighted (amount × chance)' }), h('span', {}, h('b', { text: usd.format(t.expected) }), ` · ${pct.format(t.expectedShare)}`)),
          h('div', { class: 'track-bar' }, expStack, h('div', { class: 'goal-line', style: `left:${goalPos}%` }))),
        h('div', { class: 'goal-tag' }, h('span', { style: `left:${Math.min(88, Math.max(12, goalPos))}%`, text: `Goal ${usd.format(g.gap)}` }))),
      h('div', { class: 'meter-row' },
        h('span', { class: 'label', text: 'Expected dollars by type' }),
        h('ul', { class: 'mix-legend' }, GROUP_ORDER.map((k) => h('li', {},
          h('span', {}, h('span', { class: 'dot', style: `background:${gcolor(k)}` }), GROUPS[k]), h('span', { text: t.byGroup[k] ? usd.format(t.byGroup[k]) : '—' }))))),
      h('ul', { class: 'checks' }, checks.map(([ic, txt]) => h('li', {}, icon(ic), h('span', { text: txt })))),
      h('div', { class: 'summary-actions' },
        h('button', { class: 'btn btn-light', type: 'button', onclick: copyPlan }, h('span', { text: 'Copy plan' }), h('span', { class: 'arrow-disc' }, icon('arrow-right')))),
      h('p', { class: 'summary-note', text: 'Program amounts, chances and timing are placeholders, and donor records are synthetic. Scoring rules are assumptions in advisor.js. Prototype only: not financial or legal advice.' }));
  }

  // ---------- source popup ----------
  // Opens from a click anywhere on a row. For countable sources the amount, chance and timing are
  // editable here; edits flow straight into the table and the plan meter.
  let lastFocus = null;
  function editField(id, field, raw) {
    const v = Number(raw);
    if (raw === '' || !Number.isFinite(v)) return;
    state.touched = true;
    if (field === 'amount') state.amounts[id] = Math.max(0, Math.round(v));
    else {
      const e = state.edits[id] || (state.edits[id] = {});
      if (field === 'probability') e.probability = Math.min(1, Math.max(0, v / 100));
      else e[field] = Math.max(0, Math.round(v * 10) / 10);
    }
    state.selected.add(id);
    recompute();
    drawerLive(id);
  }
  function resetEdits(id) {
    delete state.amounts[id];
    delete state.edits[id];
    recompute();
    openDrawer(id);
    toast('Back to the default numbers');
  }
  // Parts of the popup that change while the user types, rebuilt without touching the inputs.
  function drawerLive(id) {
    const c = byId(id);
    if (!c || state.drawer !== id) return;
    const g = readGap();
    const ev = $('#dr-ev');
    if (ev) ev.textContent = c.countable ? `${usd.format(amountOf(c))} × ${pct.format(c.probability)} = ${usd.format(amountOf(c) * c.probability)} expected` : '';
    const tl = $('#dr-tl');
    if (tl) tl.replaceChildren(...timelineParts(c, g));
    const rs = $('#dr-reset');
    if (rs) rs.hidden = !isEdited(c);
    const plan = $('#dr-plan');
    if (plan) { const inPlan = state.selected.has(c.id); plan.className = `btn btn-sm ${inPlan ? 'btn-outline' : 'btn-dark'}`; plan.textContent = inPlan ? 'Remove from plan' : 'Add to plan'; }
  }
  function timelineParts(c, g) {
    if (c.months == null) return [];
    const total = c.months || 1;
    return [h('span', { class: 'label', text: 'Time to money' }),
      h('div', { class: 'tl' },
        h('div', { class: 'tl-bar' },
          h('span', { style: `width:${(c.prep / total) * 100}%;background:${gcolor(c.group)};opacity:.55;border-right:2px solid var(--surface-card)` }),
          h('span', { style: `width:${(c.funds / total) * 100}%;background:${gcolor(c.group)}` })),
        h('span', { text: `Prepare ${c.prep} mo` }), h('span', { text: `Wait ${c.funds} mo` }),
        h('span', { class: 'muted', style: 'text-align:right', text: c.late ? `Past your ${g.deadline}-month deadline` : `Within your ${g.deadline}-month deadline` }))];
  }
  function editInput(id, field, label, value, opts) {
    const o = opts || {};
    return h('label', { class: 'edit-field' },
      h('span', { class: 'label', text: label }),
      h('span', { class: `edit-in${o.prefix ? ' has-prefix' : ''}${o.suffix ? ' has-suffix' : ''}`, 'data-prefix': o.prefix || null, 'data-suffix': o.suffix || null },
        h('input', { class: 'input', type: 'number', min: '0', max: o.max || null, step: o.step || '1', value: String(value), 'data-edit': field,
          oninput: (e) => editField(id, field, e.target.value) })),
      h('span', { class: 'caption muted', text: o.hint || '' }));
  }

  function openDrawer(id) {
    const c = byId(id);
    if (!c) return;
    if (state.drawer == null) lastFocus = document.activeElement;
    state.drawer = id;
    $$('#cmp-body tr.row').forEach((r) => r.classList.toggle('active', r.dataset.row === id));
    const r = c.record;
    const g = readGap();
    const parts = [
      h('div', { class: 'drawer-head' },
        h('span', { class: 'mono-label' }, h('span', { class: 'dot', style: `background:${gcolor(c.group)}` }), `${GROUPS[c.group]} · ${typeLabel(c)}`),
        h('h3', { class: 'title', id: 'drawer-title', text: c.name }),
        h('p', { class: 'body-sm muted', text: c.kind === 'donor' ? `Interests: ${r.interests.join(', ')}` : r.agency })),
      fitChips(c),
    ];
    if (c.kind !== 'donor') parts.push(h('p', { class: 'body-sm', text: r.pays_for }));
    if (c.countable) {
      const d = c.def || c;
      const fmtM = (m) => `${m} mo`;
      parts.push(h('div', { class: 'edit-box' },
        h('div', { class: 'edit-top' },
          h('span', { class: 'label', text: 'Your numbers' }),
          h('button', { class: 'link-btn', type: 'button', id: 'dr-reset', hidden: !isEdited(c), onclick: () => resetEdits(c.id) }, 'Reset to defaults')),
        h('div', { class: 'edit-grid' },
          editInput(c.id, 'amount', c.kind === 'donor' ? 'Ask' : 'Amount', Math.round(amountOf(c)), { prefix: '$', step: '500', hint: `Default ${usd.format(d.amount)}` }),
          editInput(c.id, 'probability', 'Chance of yes', Math.round(c.probability * 100), { suffix: '%', max: '100', hint: `Default ${pct.format(d.probability)}` }),
          editInput(c.id, 'prep', 'Months to prepare', c.prep, { suffix: 'mo', step: '0.5', hint: `Default ${fmtM(d.prep)}` }),
          editInput(c.id, 'funds', 'Months to wait for money', c.funds, { suffix: 'mo', step: '0.5', hint: `Default ${fmtM(d.funds)}` })),
        h('p', { class: 'ev-line', id: 'dr-ev' }),
        h('p', { class: 'caption muted', text: 'Edits update the table and your plan right away. The chance you type is used as is: the half-chance rules for unconfirmed or late sources apply only to the defaults.' })));
    } else {
      parts.push(h('div', { class: 'nums' },
        num(c.kind === 'donor' ? 'Suggested ask' : 'Amount', '—'),
        num('Chance', '—'),
        num('Months to money', months(c.months))));
    }
    parts.push(h('div', { id: 'dr-tl' }, timelineParts(c, g)));
    if (!c.countable) parts.push(h('p', { class: 'body-sm' }, h('b', { text: 'Not counted: ' }), c.why));
    if (c.reasons.length) parts.push(h('div', {}, h('span', { class: 'label', text: 'How we scored it' }), h('ul', {}, c.reasons.map((x) => h('li', { text: x })))));
    if (c.kind === 'donor') {
      if (r.ties && r.ties.length) parts.push(h('div', {}, h('span', { class: 'label', text: 'Personal ties (CRM, synthetic)' }), h('ul', {}, r.ties.map((x) => h('li', { text: `${window.Advisor.tiePhrase(x)}, ${x.years}` })))));
      parts.push(h('div', {}, h('span', { class: 'label', text: 'Giving history (CRM, synthetic)' }),
        h('ul', {}, [...r.gifts].sort((a, b) => b.year - a.year).map((x) => h('li', { text: `${x.year}: ${usd.format(x.amount)} in ${x.city} (${x.purpose})` })))));
    } else if (r.facts && r.facts.length) {
      parts.push(h('div', {}, h('span', { class: 'label', text: `What the source says (checked ${state.asOf})` }), h('ul', {}, r.facts.map((f) => h('li', { text: f })))));
    }
    parts.push(h('p', { class: 'body-sm' }, h('b', { text: 'Next step: ' }), c.nextStep));
    if (c.url) parts.push(h('a', { class: 'ext', href: c.url, target: '_blank', rel: 'noopener' }, 'Open source', icon('arrow-top-right-on-square')));
    if (c.kind !== 'donor') parts.push(h('p', { class: 'caption muted' }, h('span', { class: 'chip chip-placeholder', text: 'Placeholder' }),
      c.calculated ? ' The amount is calculated from the family price and the program page (see the reasons). Chance and timing are invented for the prototype.' : ' Amount, chance and timing are invented for the prototype.'));
    if (c.countable) {
      parts.push(h('button', { class: 'btn btn-sm', id: 'dr-plan', type: 'button', onclick: () => { toggle(c.id, !state.selected.has(c.id)); drawerLive(c.id); } }));
    }
    const wasOpen = !$('#drawer').hidden;
    $('#drawer-body').replaceChildren(...parts);
    $('#drawer').hidden = false;
    setInert(true);
    drawerLive(id);
    if (!wasOpen) {
      $('#drawer-body').scrollTop = 0;
      const first = $('#drawer-body [data-edit]');
      (first || $('#drawer-close')).focus({ preventScroll: true });
    }
  }
  function closeDrawer() {
    const wasOpen = state.drawer != null;
    state.drawer = null; $('#drawer').hidden = true;
    $$('#cmp-body tr.row').forEach((r) => r.classList.remove('active'));
    if (wasOpen) {
      setInert(!$('#settings').hidden);
      renderTable(); // show "Edited" tags
      if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
    }
  }
  // While a popup or the settings page is open, the page behind it can't be tabbed into.
  function setInert(on) { ['.nav', '.stage', '.controls'].forEach((s) => { $(s).inert = on; }); }
  function num(label, value) { return h('div', {}, h('span', { class: 'label', text: label }), h('strong', { text: value })); }

  // ---------- actions ----------
  function useRecommended() {
    state.touched = false;
    recompute(); // resets picks, amounts and popup edits to the scored defaults
    toast('Recommended sources and default numbers restored');
  }
  function copyPlan() {
    const g = readGap();
    const t = window.Advisor.totals(cands(), state.selected, state.amounts, g.gap, g.deadline);
    const picked = cands().filter((c) => c.countable && state.selected.has(c.id)).sort((a, b) => amountOf(b) * b.probability - amountOf(a) * a.probability);
    const lines = [
      `# Funding plan for one home: ${placeLabel()}`,
      'Prototype output. Program amounts, chances and timing are PLACEHOLDERS. Donor records are SYNTHETIC. Not financial advice.',
      '',
      `Goal: ${usd.format(g.gap)} within ${g.deadline} months · If all say yes: ${usd.format(t.face)} · Risk-weighted: ${usd.format(t.expected)} (${pct.format(t.expectedShare)})`,
      '',
      ...picked.map((c, i) => `${i + 1}. ${c.name} (${GROUPS[c.group]}): ${usd.format(amountOf(c))} × ${pct.format(c.probability)} = ${usd.format(amountOf(c) * c.probability)}, about ${months(c.months)} months${c.url ? ` · ${c.url}` : ''}\n   Next: ${c.nextStep}`),
    ];
    const text = lines.join('\n');
    const done = () => toast('Plan copied');
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
    else fallbackCopy(text, done);
  }
  function fallbackCopy(text, done) {
    const ta = h('textarea', { style: 'position:fixed;opacity:0' }); ta.value = text;
    document.body.append(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { toast('Copy failed. Select the text and copy it by hand.'); }
    ta.remove();
  }

  // ---------- step 3: take action ----------
  // Turns the ticked sources into an action list: people to email from the CRM, and applications
  // to prepare. Drafts come from Claude when the server has a key, or from templates. Nothing is
  // ever sent from here: "Open in Gmail" opens a draft in the user's own Gmail to review and send.
  const draftKey = (kind, id) => `${kind}:${id}`;
  state.drafts = {};
  state.done = new Set();
  state.activeDraft = null;
  state.ai = null;

  function startBy(c, deadline) {
    if (c.months == null) return { text: 'Timing unknown', late: false };
    const slack = deadline - c.months;
    if (slack <= 0) return { text: 'Start now: may land after your deadline', late: true };
    const d = new Date(); d.setMonth(d.getMonth() + Math.floor(slack));
    return { text: `Start by ${d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`, late: false, when: d.getTime() };
  }

  function planActions() {
    const g = readGap();
    const picked = cands().filter((c) => c.countable && state.selected.has(c.id));
    const items = picked.map((c) => ({ c, due: startBy(c, g.deadline) }));
    items.sort((a, b) => (a.due.late ? -1 : 0) - (b.due.late ? -1 : 0) || (a.due.when || 0) - (b.due.when || 0) || b.c.expected - a.c.expected);
    return {
      people: items.filter((x) => x.c.kind === 'donor'),
      programs: items.filter((x) => x.c.kind !== 'donor'),
    };
  }

  async function checkAI() {
    try { state.ai = await getJSON('/api/ai'); } catch (e) { state.ai = { available: false, reason: 'Could not check.' }; }
    const el = $('#ai-status');
    el.replaceChildren(h('span', { class: 'dot', style: `background:${state.ai.available ? 'var(--g-individual)' : 'var(--ink-muted)'}` }),
      state.ai.available ? `AI drafting on: ${state.ai.model}` : `Template drafts. ${state.ai.reason}`);
  }

  function renderActions() {
    const { people, programs } = planActions();
    const box = $('#actions');
    box.replaceChildren();
    $('#act-summary').textContent = people.length + programs.length
      ? `${people.length} ${people.length === 1 ? 'person' : 'people'} to contact and ${programs.length} application${programs.length === 1 ? '' : 's'} to prepare, from your plan for ${placeLabel()}. Ordered by when you need to start.`
      : 'Your plan is empty. Go back and tick some sources.';
    if (people.length) {
      box.append(h('section', { class: 'act-group' },
        h('h3', { class: 'heading-sm' }, 'People to contact', h('small', { text: 'From your CRM (synthetic records)' })),
        people.map(({ c, due }) => actionRow(c, due, [
          { kind: 'email', label: 'Draft email' },
        ]))));
    }
    if (programs.length) {
      box.append(h('section', { class: 'act-group' },
        h('h3', { class: 'heading-sm' }, 'Applications to prepare', h('small', { text: 'Check each against the current notice' })),
        programs.map(({ c, due }) => actionRow(c, due, [
          { kind: 'application', label: 'Draft application' },
          { kind: 'inquiry', label: 'Email program staff' },
        ]))));
    }
    $('#draft-all').disabled = !people.length;
    if (!state.activeDraft) renderDraftPanel();
  }

  function actionRow(c, due, buttons) {
    const r = c.record;
    const why = c.kind === 'donor'
      ? [r.region.match === 'city' ? `Gave in ${state.place.city}` : r.region.match === 'county' ? `Gave in ${state.place.county}` : null,
        r.region.tie_match !== 'none' && r.region.ties_here[0] ? window.Advisor.tiePhrase(r.region.ties_here[0]) : null].filter(Boolean).join(' · ')
      : r.agency;
    const drafted = buttons.filter((b) => state.drafts[draftKey(b.kind, c.id)]);
    const done = state.done.has(c.id);
    const active = state.activeDraft && state.activeDraft.id === c.id;
    return h('div', { class: `act${done ? ' done' : ''}${active ? ' active' : ''}`, style: `--gc:${gcolor(c.group)}` },
      h('input', { class: 'check', type: 'checkbox', checked: done, 'aria-label': `Mark ${c.name} done`,
        onchange: (e) => { if (e.target.checked) state.done.add(c.id); else state.done.delete(c.id); renderActions(); } }),
      h('div', { class: 'act-body' },
        h('span', { class: 'act-title', text: c.kind === 'donor' ? `Ask ${c.name}` : `Apply to ${c.name}` }),
        h('span', { class: 'act-sub', text: `${typeLabel(c)}${why ? ' · ' + why : ''}` }),
        h('div', { class: 'act-meta' },
          h('span', { class: 'chip', text: `${c.kind === 'donor' ? 'Ask' : 'Request'} ${usd.format(amountOf(c))}` }),
          h('span', { class: `chip chip-due${due.late ? ' late' : ''}` }, icon('clock'), due.text),
          drafted.length ? h('span', { class: 'chip chip-ok' }, icon('check-circle'), drafted.length > 1 ? 'Drafts ready' : 'Draft ready') : null)),
      h('div', { class: 'act-btns' }, buttons.map((b) => h('button', {
        class: `btn btn-xs ${state.drafts[draftKey(b.kind, c.id)] ? 'btn-outline' : 'btn-dark'}`, type: 'button',
        onclick: () => openDraft(b.kind, c.id),
      }, state.drafts[draftKey(b.kind, c.id)] ? b.label.replace('Draft', 'Open') : b.label))));
  }

  function draftPayload(kind, c) {
    const g = readGap();
    return {
      kind, id: c.id, amount: amountOf(c), gap: g.gap, deadline: g.deadline,
      place: { city: state.place.city, county: state.place.county, state: state.place.state },
      org: $('#org').value.trim(),
      sender: [$('#sender').value.trim(), settings.profile.position.trim()].filter(Boolean).join(', '),
      email: settings.profile.email.trim(), phone: settings.profile.phone.trim(),
    };
  }

  async function fetchDraft(kind, c) {
    const res = await fetch('/api/draft', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draftPayload(kind, c)) });
    const body = await res.json().catch(() => ({ error: 'The server sent something unexpected.' }));
    if (!res.ok) throw new Error(body.error || `Draft failed (${res.status}).`);
    const to = kind === 'email' ? (c.record.email || '') : '';
    return { ...body, to, kind, id: c.id };
  }

  async function openDraft(kind, id, regenerate) {
    const c = byId(id);
    if (!c) return;
    const key = draftKey(kind, id);
    state.activeDraft = { kind, id };
    renderActions();
    if (state.drafts[key] && !regenerate) { renderDraftPanel(); return; }
    renderDraftPanel(true);
    try {
      state.drafts[key] = await fetchDraft(kind, c);
    } catch (err) {
      toast(err.message);
    }
    if (state.activeDraft && draftKey(state.activeDraft.kind, state.activeDraft.id) === key) renderDraftPanel();
    renderActions();
  }

  function renderDraftPanel(loading) {
    const panel = $('#draft-panel');
    const a = state.activeDraft;
    if (loading) {
      panel.replaceChildren(h('div', { class: 'draft-loading' }, h('div', { class: 'spinner' }),
        h('span', { text: state.ai && state.ai.available ? 'Drafting with Claude…' : 'Preparing a template draft…' })));
      return;
    }
    const d = a && state.drafts[draftKey(a.kind, a.id)];
    if (!d) {
      panel.replaceChildren(h('div', { class: 'draft-empty' },
        h('span', { class: 'disc' }, icon('sparkles')),
        h('h3', { class: 'heading-sm', text: 'Pick An Action To Draft It' }),
        h('p', { class: 'body-sm', text: settings.connectors.gmail
          ? 'Emails open as drafts in your own Gmail, for you to review and send. This tool never sends anything, files anything or contacts anyone.'
          : 'Gmail is disconnected in Settings, so drafts are copy-only. This tool never sends anything, files anything or contacts anyone.' })));
      return;
    }
    const c = byId(d.id);
    const isEmail = d.kind !== 'application';
    const toIn = h('input', { class: 'input', type: 'email', value: d.to, placeholder: isEmail ? 'Add the program contact' : '', oninput: (e) => { d.to = e.target.value; } });
    const subIn = h('input', { class: 'input', type: 'text', value: d.subject, oninput: (e) => { d.subject = e.target.value; } });
    const body = h('textarea', { class: 'draft-body', 'aria-label': 'Draft text', oninput: (e) => { d.body = e.target.value; } });
    body.value = d.body;
    panel.replaceChildren(
      h('div', { class: 'draft-head' },
        h('span', { class: 'mono-label' }, h('span', { class: 'dot', style: `background:${gcolor(c.group)}` }), ` ${d.kind === 'application' ? 'Application draft' : d.kind === 'inquiry' ? 'Email to program staff' : 'Email to donor'}`),
        h('h3', { class: 'title', text: c.name }),
        h('div', { class: 'chips' },
          d.source === 'claude' ? h('span', { class: 'chip chip-solid' }, icon('sparkles'), `AI draft · ${d.model}`) : h('span', { class: 'chip chip-placeholder', text: 'Template draft' }),
          d.note ? h('span', { class: 'caption muted', text: d.note }) : null)),
      h('div', { class: 'draft-fields' },
        isEmail ? h('label', {}, 'To', toIn) : null,
        h('label', {}, isEmail ? 'Subject' : 'Title', subIn)),
      body,
      h('div', { class: 'draft-foot' },
        h('div', { class: 'draft-actions' },
          isEmail && settings.connectors.gmail ? h('button', { class: 'btn btn-dark btn-sm', type: 'button', onclick: () => openGmail(d) }, 'Open in Gmail') : null,
          isEmail && !settings.connectors.gmail ? h('button', { class: 'link-btn', type: 'button', onclick: () => openSettings('conn-gmail') }, 'Connect Gmail in Settings') : null,
          h('button', { class: 'btn btn-outline btn-sm', type: 'button', onclick: () => copyText(`${isEmail ? 'Subject' : 'Title'}: ${d.subject}\n\n${d.body}`, 'Draft copied') }, 'Copy'),
          !isEmail ? h('button', { class: 'btn btn-outline btn-sm', type: 'button', onclick: () => downloadText(d) }, 'Download .txt') : null,
          h('button', { class: 'btn btn-outline btn-sm', type: 'button', onclick: () => openDraft(d.kind, d.id, true) }, 'Redraft')),
        h('p', { class: 'caption muted', text: isEmail
          ? 'Review before sending. Gmail opens a draft in your own account; you press Send. Recipient addresses here are placeholders (example.org) and amounts are planning estimates.'
          : 'A first draft only. Check every section against the program\'s current notice; items in [brackets] are for you to fill or confirm.' })));
  }

  function openGmail(d) {
    // Opens Gmail's compose window, prefilled, in the user's own browser session. Nothing is sent.
    const url = 'https://mail.google.com/mail/?view=cm&fs=1'
      + `&to=${encodeURIComponent(d.to || '')}&su=${encodeURIComponent(d.subject || '')}&body=${encodeURIComponent(d.body || '')}`;
    window.open(url, '_blank', 'noopener');
  }
  function copyText(text, msg) {
    const done = () => toast(msg);
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
    else fallbackCopy(text, done);
  }
  function downloadText(d) {
    const blob = new Blob([`${d.subject}\n\n${d.body}\n`], { type: 'text/plain' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `${d.id}-application-draft.txt` });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async function draftAllEmails() {
    const { people } = planActions();
    const todo = people.filter(({ c }) => !state.drafts[draftKey('email', c.id)]);
    const btn = $('#draft-all');
    btn.disabled = true;
    for (let i = 0; i < todo.length; i++) {
      $('#ai-status').textContent = `Drafting ${i + 1} of ${todo.length}…`;
      try { state.drafts[draftKey('email', todo[i].c.id)] = await fetchDraft('email', todo[i].c); } catch (e) { toast(e.message); }
      renderActions();
    }
    btn.disabled = false;
    await checkAI();
    if (todo.length) { state.activeDraft = { kind: 'email', id: todo[0].c.id }; renderActions(); renderDraftPanel(); }
    toast(todo.length ? `${todo.length} email draft${todo.length > 1 ? 's' : ''} ready` : 'All emails already drafted');
  }

  function copyActionList() {
    const { people, programs } = planActions();
    const line = ({ c, due }) => `- [${state.done.has(c.id) ? 'x' : ' '}] ${c.kind === 'donor' ? 'Ask' : 'Apply to'} ${c.name}: ${usd.format(amountOf(c))}. ${due.text}.${c.url ? ` ${c.url}` : ''}`;
    const text = [
      `# Action list: one home in ${placeLabel()}`,
      'Prototype output. Amounts are placeholders and donor records are synthetic.',
      '', '## People to contact', ...people.map(line),
      '', '## Applications to prepare', ...programs.map(line),
    ].join('\n');
    copyText(text, 'Action list copied');
  }

  // ---------- settings page ----------
  // SYNTHETIC: Gmail and HubSpot are demo connections. No account is linked, no sign-in happens,
  // and no data leaves this computer. TENTATIVE: planned connectors, not built.
  const CONNECTORS = [
    { id: 'gmail', name: 'Gmail', icon: 'envelope', status: 'synthetic',
      what: 'Opens each email draft from step 4 in Gmail compose, so you review and press Send yourself. Nothing is ever sent from this tool.',
      account: 'Demo account: fundraising.demo@example.org (synthetic)' },
    { id: 'hubspot', name: 'HubSpot CRM', icon: 'circle-stack', status: 'synthetic',
      what: 'Reads past donors, their gifts and their ties to the area for step 3. Read-only.',
      account: () => `Demo portal: ${state.allDonors.length || 24} synthetic donor records (data/crm-donors.synthetic.json), shown as if they came from HubSpot.` },
    { id: 'givebutter', name: 'Givebutter', icon: 'banknotes', status: 'tentative',
      what: 'Planned: pull online gifts and campaign totals, so money already raised counts toward the gap.' },
    { id: 'salesforce', name: 'Salesforce Nonprofit Cloud', icon: 'circle-stack', status: 'tentative',
      what: 'Planned: another CRM to read donors and gifts from, for teams not on HubSpot.' },
    { id: 'blackbaud', name: "Blackbaud Raiser's Edge NXT", icon: 'circle-stack', status: 'tentative',
      what: 'Planned: another CRM to read donors and gifts from.' },
    { id: 'bloomerang', name: 'Bloomerang', icon: 'user-group', status: 'tentative',
      what: 'Planned: another donor database to read from.' },
    { id: 'gcal', name: 'Google Calendar', icon: 'clock', status: 'tentative',
      what: 'Planned: add the "start by" dates from step 4 to your calendar, each one approved by you.' },
  ];
  const PROFILE_FIELDS = ['name', 'position', 'org', 'email', 'phone'];

  function renderConnectors() {
    $('#conn-list').replaceChildren(...CONNECTORS.map((k) => {
      const live = k.status === 'synthetic';
      const on = live && !!settings.connectors[k.id];
      const account = typeof k.account === 'function' ? k.account() : k.account;
      return h('div', { class: `conn${on ? ' on' : ''}${live ? '' : ' tentative'}`, id: `conn-${k.id}` },
        h('span', { class: 'conn-ic' }, icon(k.icon)),
        h('div', { class: 'conn-body' },
          h('div', { class: 'conn-title' },
            h('b', { text: k.name }),
            live ? h('span', { class: 'chip chip-assume', text: 'Synthetic' }) : h('span', { class: 'chip chip-placeholder', text: 'Tentative' })),
          h('p', { class: 'body-sm muted', text: k.what }),
          live && on ? h('p', { class: 'caption', text: account }) : null),
        h('div', { class: 'conn-act' },
          live
            ? h('span', { class: `conn-status${on ? ' ok' : ''}` }, h('span', { class: 'dot' }), on ? 'Connected' : 'Not connected')
            : h('span', { class: 'conn-status', text: 'Not built yet' }),
          live
            ? h('button', { class: `btn btn-xs ${on ? 'btn-outline' : 'btn-dark'}`, type: 'button', onclick: () => setConnector(k.id, !on) }, on ? 'Disconnect' : 'Connect')
            : h('button', { class: 'btn btn-xs btn-outline', type: 'button', disabled: true }, 'Coming later')));
    }));
  }

  function setConnector(id, on) {
    settings.connectors[id] = on;
    saveSettings();
    renderConnectors();
    if (id === 'hubspot' && state.researched) {
      state.donors = on ? state.allDonors : [];
      recompute();
    }
    if (id === 'gmail') { renderDraftPanel(); }
    toast(`${CONNECTORS.find((k) => k.id === id).name} ${on ? 'connected (synthetic)' : 'disconnected'}`);
  }

  function renderSignature() {
    const p = settings.profile;
    const lines = [p.name || '[Your name]', p.position, p.org || '[Your organization]', p.email, p.phone].filter(Boolean);
    $('#sig-preview').textContent = lines.join('\n');
  }

  function syncProfileToStep4() {
    $('#sender').value = settings.profile.name;
    $('#org').value = settings.profile.org;
  }

  function renderPrefs() {
    $('#pref-deadline').value = settings.prefs.deadline;
    $$('#pref-basemap [data-map]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.map === settings.prefs.basemap)));
    const ai = state.ai;
    $('#pref-ai').textContent = !ai ? 'Checking…' : ai.available ? `On: drafts come from ${ai.model} (key set on the server).` : `Off: template drafts. ${ai.reason}`;
  }

  function openSettings(focusId) {
    PROFILE_FIELDS.forEach((f) => { $(`#set-${f}`).value = settings.profile[f]; });
    renderSignature(); renderConnectors(); renderPrefs();
    if (!state.ai) checkAI().then(renderPrefs);
    if (state.drawer) closeDrawer();
    lastSettingsFocus = document.activeElement;
    $('#settings').hidden = false;
    setInert(true);
    const target = focusId && document.getElementById(focusId);
    if (target) { target.scrollIntoView({ block: 'center' }); const b = target.querySelector('button:not(:disabled)'); if (b) b.focus({ preventScroll: true }); }
    else { $('#settings-panel').scrollTop = 0; $('#set-name').focus({ preventScroll: true }); }
  }
  let lastSettingsFocus = null;
  function closeSettings() {
    $('#settings').hidden = true;
    setInert(false);
    if (state.screen === 4) { renderActions(); renderDraftPanel(); }
    if (lastSettingsFocus && document.contains(lastSettingsFocus)) lastSettingsFocus.focus({ preventScroll: true });
  }

  function wireSettings() {
    PROFILE_FIELDS.forEach((f) => $(`#set-${f}`).addEventListener('input', (e) => {
      settings.profile[f] = e.target.value;
      saveSettings(); renderSignature(); syncProfileToStep4();
    }));
    // Typing in step 4's sender fields updates the saved profile too.
    $('#sender').addEventListener('input', (e) => { settings.profile.name = e.target.value; saveSettings(); });
    $('#org').addEventListener('input', (e) => { settings.profile.org = e.target.value; saveSettings(); });
    $('#pref-deadline').addEventListener('input', (e) => {
      const v = Math.round(Number(e.target.value));
      if (!v || v < 1 || v > 60) return;
      settings.prefs.deadline = v; saveSettings();
      $('#deadline').value = v; recompute();
    });
    $$('#pref-basemap [data-map]').forEach((b) => b.addEventListener('click', () => {
      settings.prefs.basemap = b.dataset.map; saveSettings(); setBasemap(b.dataset.map); renderPrefs();
    }));
    $('#settings-reset').addEventListener('click', () => {
      if (!window.confirm('Clear your profile, connectors and preferences on this browser? This cannot be undone.')) return;
      try { localStorage.removeItem(SETTINGS_KEY); } catch (e) { /* ignore */ }
      settings = loadSettings();
      setBasemap(settings.prefs.basemap);
      $('#deadline').value = settings.prefs.deadline;
      syncProfileToStep4();
      if (state.researched) { state.donors = settings.connectors.hubspot ? state.allDonors : []; }
      recompute();
      openSettings();
      toast('Settings cleared');
    });
    $$('[data-open-settings]').forEach((b) => b.addEventListener('click', () => openSettings()));
    $('#settings-done').addEventListener('click', closeSettings);
    $('#drawer').addEventListener('click', (e) => { if (e.target.id === 'drawer') closeDrawer(); });
  }

  // ---------- wire up ----------
  $('#draft-all').addEventListener('click', draftAllEmails);
  $$('[data-icon]').forEach((el) => { if (!el.firstChild) el.append(icon(el.dataset.icon)); });
  $('#start-btn').addEventListener('click', () => { go(1); setTimeout(() => input.focus({ preventScroll: true }), 600); });
  $$('[data-go]').forEach((b) => b.addEventListener('click', () => go(Number(b.dataset.go))));
  $('#back-btn').addEventListener('click', () => go(state.screen - 1));
  $('#next-btn').addEventListener('click', () => (state.screen === LAST ? copyActionList() : go(state.screen + 1)));
  $('#search-form').addEventListener('submit', (e) => {
    e.preventDefault();
    closeSuggest();
    const address = input.value.trim();
    if (address) locate({ address });
  });
  $('#sample-btn').addEventListener('click', () => { input.value = SAMPLE_ADDRESS; $('#search-form').requestSubmit(); });
  $('#deadline').addEventListener('input', recompute);
  ['#budget', '#rate', '#tax', '#ins', '#hoa', '#down', '#subsidies', '#earned', '#hh-size', '#hh-tier', '[data-cost]']
    .forEach((sel) => $$(sel).forEach((el) => el.addEventListener('input', renderPencil)));
  $$('#budget-mode [data-mode]').forEach((b) => b.addEventListener('click', () => { if (!b.disabled) setMode(b.dataset.mode); }));
  $('#rate-reset').addEventListener('click', () => { $('#rate').value = pen.published; renderPencil(); });
  $('#sort').addEventListener('change', (e) => { state.sort = e.target.value; renderTable(); });
  $('#drawer-close').addEventListener('click', closeDrawer);
  $('#use-rec').addEventListener('click', useRecommended);
  $('#clear-all').addEventListener('click', () => { state.touched = true; state.selected = new Set(); refreshNumbers(); toast('Plan cleared'); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.drawer) { closeDrawer(); return; }
    if (e.key === 'Escape' && !$('#settings').hidden) { closeSettings(); return; }
    if (state.drawer || !$('#settings').hidden) return;
    if (e.target.closest('input, select, textarea, #map')) return;
    if (e.key === 'ArrowRight') go(state.screen + 1);
    if (e.key === 'ArrowLeft') go(state.screen - 1);
  });
  // Focus can scroll a hidden-overflow box sideways; keep the stage pinned so only the track moves.
  $('.stage').addEventListener('scroll', (e) => { e.target.scrollLeft = 0; e.target.scrollTop = 0; });
  window.addEventListener('resize', () => { $('#track').style.transform = `translateX(${-100 * state.screen}%)`; });
  wireSettings();
  syncProfileToStep4();
  $('#deadline').value = settings.prefs.deadline;
  recompute();
  loadPencilData();
  go(0);
})();
