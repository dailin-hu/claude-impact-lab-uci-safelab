// Gap Closer UI: Start, then two full-height steps that slide left and right.
// 1 Location and gap · 2 Build your funding plan (compare and pick in one place). PROTOTYPE ONLY.
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
  const LAST = 3;

  const state = {
    screen: 0, place: null, sources: [], donors: [], crm: null, asOf: null, notes: [],
    advice: null, selected: new Set(), amounts: {}, touched: false,
    filter: 'all', sort: 'expected', drawer: null, researched: false, busy: false, marker: null,
  };

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
  const NEXT = { 1: 'Build your plan', 2: 'Make action list', 3: 'Copy action list' };
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
    if (i !== 2) closeDrawer();
    if (i === 1) setTimeout(() => map.invalidateSize(), 560);
    if (i === 3) { renderActions(); if (!state.ai) checkAI(); }
  }
  function updateHint() {
    const g = readGap();
    const hints = {
      1: state.researched ? `Ready: ${placeLabel()}. Goal ${usd.format(g.gap)} within ${g.deadline} months.` : 'Type an address and pick a suggestion, or click the map.',
      2: 'Tick sources to add them to your plan. Click a name for details.',
      3: 'Draft emails and applications. You review and send everything yourself.',
    };
    $('#controls-hint').textContent = hints[state.screen] || '';
  }

  // ---------- step 1: map ----------
  const map = L.map('map', { scrollWheelZoom: true }).setView([33.70, -117.83], 10);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
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
  }

  async function research() {
    const p = state.place;
    if (!p) return;
    const q = new URLSearchParams({ state: p.state || '', county: p.county || '', city: p.city || '' });
    const [fund, crm] = await Promise.all([getJSON(`/api/funding?${q}`), getJSON(`/api/crm/donors?${q}`)]);
    state.sources = fund.sources;
    state.notes = fund.notes || [];
    state.asOf = fund.as_of;
    state.donors = crm.donors;
    state.crm = crm.connector;
    state.researched = true;
    state.touched = false;
    state.amounts = {};
    recompute();
    go(state.screen);
  }

  // ---------- gap ----------
  function readGap() {
    const gap = Math.max(0, Number($('#gap').value) || 0);
    const deadline = Math.max(1, Math.round(Number($('#deadline').value) || 18));
    return { gap, deadline };
  }

  function recompute() {
    const g = readGap();
    $('#gap-total').textContent = usd.format(g.gap);
    $('#goal-time').textContent = `Needed within ${g.deadline} months from today.`;
    if (!state.researched) { updateHint(); return; }
    state.advice = window.Advisor.advise({
      sources: state.sources, donors: state.donors, gap: g.gap,
      deadlineMonths: g.deadline, place: state.place, nowYear: NOW_YEAR,
    });
    if (!state.touched) {
      state.selected = new Set(cands().filter((c) => c.recommended).map((c) => c.id));
      state.amounts = {};
    } else {
      for (const id of [...state.selected]) if (!byId(id) || !byId(id).countable) state.selected.delete(id);
    }
    renderTable();
    updateHint();
  }

  // ---------- step 2: table ----------
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
    $('#cmp-summary').textContent = `${placeLabel()} · ${state.sources.length} programs, bonds and lenders · ${state.donors.length} CRM donors (${people} individuals): ${nearGifts} gave in ${state.place.county || 'this county'}, ${nearTies} lived, grew up or are based there. Source list checked ${state.asOf}. Donor records are synthetic.`;

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
    return h('tr', { class: `row${c.countable ? '' : ' muted-row'}${on ? ' on' : ''}${state.drawer === c.id ? ' active' : ''}`, 'data-row': c.id, style: `--gc:${gcolor(c.group)}` },
      h('td', { class: 'c-check' }, c.countable ? h('input', {
        class: 'check', type: 'checkbox', 'data-pick': c.id, 'aria-label': `Include ${c.name} in the plan`, checked: on,
        onchange: (e) => toggle(c.id, e.target.checked),
      }) : null),
      h('td', {}, h('div', { class: 'src-cell' },
        h('span', { class: 'disc', title: GROUPS[c.group] }, icon(iconFor(c))),
        h('div', {},
          h('button', { class: 'src-name', type: 'button', text: c.name, onclick: () => openDrawer(c.id) }),
          c.recommended ? h('span', { class: 'rec', text: c.warm ? 'Recommended · warm' : 'Recommended' }) : null,
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

  // ---------- drawer ----------
  function openDrawer(id) {
    const c = byId(id);
    if (!c) return;
    state.drawer = id;
    $$('#cmp-body tr.row').forEach((r) => r.classList.toggle('active', r.dataset.row === id));
    const r = c.record;
    const g = readGap();
    const parts = [
      h('div', { class: 'drawer-head' },
        h('span', { class: 'mono-label' }, h('span', { class: 'dot', style: `background:${gcolor(c.group)}` }), `${GROUPS[c.group]} · ${typeLabel(c)}`),
        h('h3', { class: 'title', text: c.name }),
        h('p', { class: 'body-sm muted', text: c.kind === 'donor' ? `Interests: ${r.interests.join(', ')}` : r.agency })),
      fitChips(c),
    ];
    if (c.kind !== 'donor') parts.push(h('p', { class: 'body-sm', text: r.pays_for }));
    parts.push(h('div', { class: 'nums' },
      num(c.kind === 'donor' ? 'Suggested ask' : 'Amount', c.countable ? usd.format(amountOf(c)) : '—'),
      num('Chance', c.countable ? pct.format(c.probability) : '—'),
      num('Months to money', months(c.months))));
    if (c.months != null) {
      const total = c.months || 1;
      parts.push(h('div', {},
        h('span', { class: 'label', text: 'Time to money' }),
        h('div', { class: 'tl' },
          h('div', { class: 'tl-bar' },
            h('span', { style: `width:${(c.prep / total) * 100}%;background:${gcolor(c.group)};opacity:.55;border-right:2px solid var(--surface-card)` }),
            h('span', { style: `width:${(c.funds / total) * 100}%;background:${gcolor(c.group)}` })),
          h('span', { text: `Prepare ${c.prep} mo` }), h('span', { text: `Wait ${c.funds} mo` }),
          h('span', { class: 'muted', style: 'text-align:right', text: c.late ? `Past your ${g.deadline}-month deadline` : `Within your ${g.deadline}-month deadline` }))));
    }
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
    if (c.kind !== 'donor') parts.push(h('p', { class: 'caption muted' }, h('span', { class: 'chip chip-placeholder', text: 'Placeholder' }), ' Amount, chance and timing are invented for the prototype.'));
    if (c.countable) {
      const inPlan = state.selected.has(c.id);
      parts.push(h('button', { class: `btn btn-sm ${inPlan ? 'btn-outline' : 'btn-dark'}`, type: 'button', onclick: () => toggle(c.id, !inPlan) }, inPlan ? 'Remove from plan' : 'Add to plan'));
    }
    $('#drawer-body').replaceChildren(...parts);
    $('#drawer').hidden = false;
  }
  function closeDrawer() { state.drawer = null; $('#drawer').hidden = true; $$('#cmp-body tr.row').forEach((r) => r.classList.remove('active')); }
  function num(label, value) { return h('div', {}, h('span', { class: 'label', text: label }), h('strong', { text: value })); }

  // ---------- actions ----------
  function useRecommended() {
    state.touched = false; state.amounts = {};
    state.selected = new Set(cands().filter((c) => c.recommended).map((c) => c.id));
    renderTable();
    toast('Recommended sources selected');
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
      org: $('#org').value.trim(), sender: $('#sender').value.trim(),
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
        h('p', { class: 'body-sm', text: 'Emails open as drafts in your own Gmail, for you to review and send. This tool never sends anything, files anything or contacts anyone.' })));
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
          isEmail ? h('button', { class: 'btn btn-dark btn-sm', type: 'button', onclick: () => openGmail(d) }, 'Open in Gmail') : null,
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
  ['#gap', '#deadline'].forEach((id) => $(id).addEventListener('input', recompute));
  $('#sort').addEventListener('change', (e) => { state.sort = e.target.value; renderTable(); });
  $('#drawer-close').addEventListener('click', closeDrawer);
  $('#use-rec').addEventListener('click', useRecommended);
  $('#clear-all').addEventListener('click', () => { state.touched = true; state.selected = new Set(); refreshNumbers(); toast('Plan cleared'); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.drawer) { closeDrawer(); return; }
    if (e.target.closest('input, select, textarea, #map')) return;
    if (e.key === 'ArrowRight') go(state.screen + 1);
    if (e.key === 'ArrowLeft') go(state.screen - 1);
  });
  // Focus can scroll a hidden-overflow box sideways; keep the stage pinned so only the track moves.
  $('.stage').addEventListener('scroll', (e) => { e.target.scrollLeft = 0; e.target.scrollTop = 0; });
  window.addEventListener('resize', () => { $('#track').style.transform = `translateX(${-100 * state.screen}%)`; });
  recompute();
  go(0);
})();
