// Minimal in-memory B2B subscription shop used as the system under test.
// It simulates: plans, organisations, trials, billing periods, renewals,
// failed payments + dunning (grace period), proration on upgrade,
// cancel-at-period-end, license provisioning and EU VAT (incl. reverse charge).
// Test-only endpoints (/api/test/*) allow resetting state, moving the clock
// and forcing payment outcomes - the same hooks you would ask a real team for.
import http from 'node:http';

const PORT = Number(process.env.PORT ?? 3100);
const DAY = 24 * 60 * 60 * 1000;
const TRIAL_DAYS = 14;
const PERIOD_DAYS = 30;
const GRACE_DAYS = 7;

const PLANS = {
  basic: { id: 'basic', name: 'SFx Asset Management Basic', price: 49, seats: 1 },
  pro: { id: 'pro', name: 'SFx Asset Management PRO', price: 149, seats: 5 },
};
const VAT = { DE: 0.19, AT: 0.2, FR: 0.2, SE: 0.25 };

let state;
function reset() {
  state = { seq: 0, orgs: {}, subs: {}, invoices: [], licenses: {} };
}
reset();

const id = (p) => `${p}_${++state.seq}`;
const iso = (t) => new Date(t).toISOString();
const START = Date.parse('2026-01-01T00:00:00Z');
const nowOf = (sub) => state.orgs[sub.orgId].now;
const round2 = (n) => Math.round(n * 100) / 100;

function createInvoice(sub, net, reason) {
  const org = state.orgs[sub.orgId];
  const reverseCharge = org.country !== 'DE' && Boolean(org.vatId);
  const rate = reverseCharge ? 0 : (VAT[org.country] ?? 0.19);
  const inv = {
    id: id('inv'), subscriptionId: sub.id, orgId: org.id, reason,
    net: round2(net), vatRate: rate, vat: round2(net * rate), total: round2(net * (1 + rate)),
    reverseCharge, status: 'open', createdAt: iso(org.now),
  };
  state.invoices.push(inv);
  return inv;
}

function charge(sub, inv) {
  const org = state.orgs[sub.orgId];
  inv.status = org.paymentMethodValid ? 'paid' : 'failed';
  return inv.status === 'paid';
}

function provision(sub) {
  const plan = PLANS[sub.planId];
  state.licenses[sub.orgId] = { key: state.licenses[sub.orgId]?.key ?? id('LIC').toUpperCase(), active: true, seats: plan.seats, planId: plan.id };
}
function revoke(sub) {
  if (state.licenses[sub.orgId]) state.licenses[sub.orgId].active = false;
}

function startPeriod(sub) {
  sub.periodStart = nowOf(sub);
  sub.periodEnd = nowOf(sub) + PERIOD_DAYS * DAY;
}

function bill(sub, reason) {
  startPeriod(sub);
  const inv = createInvoice(sub, PLANS[sub.planId].price, reason);
  if (charge(sub, inv)) { sub.status = 'active'; provision(sub); }
  else { sub.status = 'past_due'; sub.graceEnd = nowOf(sub) + GRACE_DAYS * DAY; }
}

// Advance the subscription state machine to the current clock.
function tick(sub) {
  const now = nowOf(sub);
  if (sub.status === 'trialing' && now >= sub.trialEnd) bill(sub, 'trial_conversion');
  if (sub.status === 'active' && now >= sub.periodEnd) {
    if (sub.cancelAtPeriodEnd) { sub.status = 'canceled'; revoke(sub); }
    else bill(sub, 'renewal');
  }
  if (sub.status === 'past_due' && now >= sub.graceEnd) { sub.status = 'suspended'; revoke(sub); }
}

function view(sub) {
  return {
    ...sub, plan: PLANS[sub.planId],
    trialEnd: sub.trialEnd ? iso(sub.trialEnd) : null,
    periodStart: sub.periodStart ? iso(sub.periodStart) : null,
    periodEnd: sub.periodEnd ? iso(sub.periodEnd) : null,
    graceEnd: sub.graceEnd ? iso(sub.graceEnd) : null,
  };
}

// ---------- API ----------
const routes = {
  'GET /api/plans': () => [200, Object.values(PLANS)],

  'POST /api/orgs': (b) => {
    if (!b.name || !b.country) return [400, { error: 'name and country are required' }];
    if (b.vatId && !/^[A-Z]{2}[0-9A-Z]{8,12}$/.test(b.vatId)) return [422, { error: 'invalid VAT ID' }];
    const org = { id: id('org'), name: b.name, country: b.country, vatId: b.vatId ?? null, paymentMethodValid: true, now: START };
    state.orgs[org.id] = org;
    return [201, org];
  },

  'POST /api/subscriptions': (b) => {
    const org = state.orgs[b.orgId];
    if (!org) return [404, { error: 'org not found' }];
    if (!PLANS[b.planId]) return [400, { error: 'unknown plan' }];
    if (Object.values(state.subs).some((s) => s.orgId === org.id && !['canceled', 'suspended'].includes(s.status)))
      return [409, { error: 'org already has an active subscription' }];
    const sub = { id: id('sub'), orgId: org.id, planId: b.planId, cancelAtPeriodEnd: false, createdAt: iso(org.now) };
    state.subs[sub.id] = sub;
    if (b.trial) { sub.status = 'trialing'; sub.trialEnd = org.now + TRIAL_DAYS * DAY; provision(sub); }
    else bill(sub, 'initial');
    return [201, view(sub)];
  },

  'GET /api/subscriptions/:id': (_b, p) => {
    const sub = state.subs[p.id];
    return sub ? [200, view(sub)] : [404, { error: 'not found' }];
  },

  'POST /api/subscriptions/:id/change-plan': (b, p) => {
    const sub = state.subs[p.id];
    if (!sub) return [404, { error: 'not found' }];
    if (!PLANS[b.planId] || b.planId === sub.planId) return [400, { error: 'invalid target plan' }];
    if (!['active', 'trialing'].includes(sub.status)) return [409, { error: `cannot change plan in status ${sub.status}` }];
    const oldPrice = PLANS[sub.planId].price;
    sub.planId = b.planId;
    let invoice = null;
    if (sub.status === 'active') {
      const remainingDays = Math.ceil((sub.periodEnd - nowOf(sub)) / DAY);
      const diff = (PLANS[b.planId].price - oldPrice) * (remainingDays / PERIOD_DAYS);
      if (diff > 0) { invoice = createInvoice(sub, diff, 'proration'); charge(sub, invoice); }
    }
    provision(sub);
    return [200, { subscription: view(sub), invoice }];
  },

  'POST /api/subscriptions/:id/cancel': (_b, p) => {
    const sub = state.subs[p.id];
    if (!sub) return [404, { error: 'not found' }];
    if (sub.status === 'trialing') { sub.status = 'canceled'; revoke(sub); }
    else sub.cancelAtPeriodEnd = true;
    return [200, view(sub)];
  },

  'POST /api/subscriptions/:id/reactivate': (_b, p) => {
    const sub = state.subs[p.id];
    if (!sub) return [404, { error: 'not found' }];
    if (sub.status !== 'active' || !sub.cancelAtPeriodEnd) return [409, { error: 'nothing to reactivate' }];
    sub.cancelAtPeriodEnd = false;
    return [200, view(sub)];
  },

  'POST /api/orgs/:id/payment-method': (_b, p) => {
    const org = state.orgs[p.id];
    if (!org) return [404, { error: 'not found' }];
    org.paymentMethodValid = true;
    // Retry open dunning invoices immediately
    for (const sub of Object.values(state.subs).filter((s) => s.orgId === org.id && s.status === 'past_due')) {
      const inv = [...state.invoices].reverse().find((i) => i.subscriptionId === sub.id && i.status === 'failed');
      if (inv && charge(sub, inv)) { sub.status = 'active'; sub.graceEnd = undefined; provision(sub); }
    }
    return [200, org];
  },

  'GET /api/orgs/:id/license': (_b, p) => {
    const lic = state.licenses[p.id];
    return lic ? [200, lic] : [404, { error: 'no license' }];
  },
  'GET /api/orgs/:id/invoices': (_b, p) => [200, state.invoices.filter((i) => i.orgId === p.id)],
  'GET /api/orgs/:id/subscription': (_b, p) => {
    const sub = Object.values(state.subs).filter((s) => s.orgId === p.id).at(-1);
    return sub ? [200, view(sub)] : [404, { error: 'no subscription' }];
  },

  // ---- test hooks ----
  'POST /api/test/reset': () => { reset(); return [204, null]; },
  // Per-organisation test clock (like Stripe test clocks): keeps parallel tests isolated.
  'GET /api/test/orgs/:id/clock': (_b, p) => {
    const org = state.orgs[p.id];
    return org ? [200, { now: iso(org.now) }] : [404, { error: 'not found' }];
  },
  'POST /api/test/orgs/:id/clock/advance': (b, p) => {
    const org = state.orgs[p.id];
    if (!org) return [404, { error: 'not found' }];
    const subs = Object.values(state.subs).filter((s) => s.orgId === org.id);
    for (let d = 0; d < Number(b.days ?? 0); d++) { org.now += DAY; subs.forEach(tick); }
    return [200, { now: iso(org.now) }];
  },
  'POST /api/test/orgs/:id/payment-outcome': (b, p) => {
    const org = state.orgs[p.id];
    if (!org) return [404, { error: 'not found' }];
    org.paymentMethodValid = b.outcome !== 'decline';
    return [200, org];
  },
};

function match(method, path) {
  for (const [key, handler] of Object.entries(routes)) {
    const [m, pattern] = key.split(' ');
    if (m !== method) continue;
    const names = [];
    const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, n) => (names.push(n), '([^/]+)')) + '$');
    const hit = path.match(re);
    if (hit) return [handler, Object.fromEntries(names.map((n, i) => [n, hit[i + 1]]))];
  }
  return [null, {}];
}

// ---------- UI ----------
const page = (title, body) => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>${title} · Shop (demo)</title>
<style>body{font:15px system-ui;max-width:760px;margin:32px auto;padding:0 16px;color:#1d2433}
.card{border:1px solid #d6dbe4;border-radius:8px;padding:16px;margin:12px 0}
button,a.button{display:inline-block;text-decoration:none;padding:8px 14px;border-radius:6px;border:1px solid #2a5bd7;background:#2a5bd7;color:#fff;cursor:pointer}
button.secondary{background:#fff;color:#2a5bd7}label{display:block;margin:10px 0}
input,select{padding:6px;width:100%;box-sizing:border-box}[role=alert]{color:#b42318}
table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #eee;padding:6px;text-align:left}
[hidden]{display:none!important}
nav{display:flex;gap:8px;padding-bottom:12px;border-bottom:1px solid #d6dbe4}
nav a.button[aria-current=page]{background:#fff;color:#2a5bd7}</style>
</head><body>${header(title)}${body}</body></html>`;

// Shared navigation. The account link appears once the browser knows the customer's organisation:
// from the URL on the account page, or remembered from an earlier visit.
const header = (title) => `<header><nav aria-label="Main" test-id="app-header">
<a class="button" href="/" test-id="header-plans-link"${title === 'Plans' ? ' aria-current="page"' : ''}>Plans</a>
<a class="button" href="/account" test-id="header-account-link" hidden${title === 'Account' ? ' aria-current="page"' : ''}>My account</a>
</nav></header>
<script>
(() => {
  let org = new URLSearchParams(location.search).get('org');
  try { org ? localStorage.setItem('shop.org', org) : (org = localStorage.getItem('shop.org')); } catch {}
  if (!org) return;
  const link = document.querySelector('[test-id=header-account-link]');
  link.href = '/account?org=' + encodeURIComponent(org);
  link.hidden = false;
})();
</script>`;

const shopHtml = () => page('Plans', `<main test-id="plans-page"><h1>Choose a plan</h1>
${Object.values(PLANS).map((p) => `<article class="card">
<h2>${p.name}</h2><p>€${p.price} / month · ${p.seats} seat(s)</p>
<a class="button" href="/checkout?plan=${p.id}" test-id="plan-card-${p.id}-select-link">Select ${p.id}</a></article>`).join('')}</main>`);

const checkoutHtml = (planId) => page('Checkout', `<main test-id="checkout-page"><h1>Checkout: ${PLANS[planId]?.name ?? 'unknown plan'}</h1>
<form id="f">
<label>Company name <input name="name" required test-id="checkout-company-name-input"></label>
<label>Country <select name="country" test-id="checkout-country-select"><option>DE</option><option>AT</option><option>FR</option><option>SE</option></select></label>
<label>VAT ID (optional) <input name="vatId" test-id="checkout-vat-id-input"></label>
<label><input type="checkbox" name="trial" style="width:auto" test-id="checkout-trial-checkbox"> Start with ${TRIAL_DAYS}-day free trial</label>
<p role="alert" id="err"></p>
<button type="submit" test-id="checkout-submit-button">Place order</button></form></main>
<script>
document.getElementById('f').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const post = (u, b) => fetch(u, {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(b)});
  const o = await post('/api/orgs', {name: fd.get('name'), country: fd.get('country'), vatId: fd.get('vatId') || undefined});
  if (!o.ok) { document.getElementById('err').textContent = (await o.json()).error; return; }
  const org = await o.json();
  const s = await post('/api/subscriptions', {orgId: org.id, planId: '${planId}', trial: fd.get('trial') === 'on'});
  if (!s.ok) { document.getElementById('err').textContent = (await s.json()).error; return; }
  location.href = '/account?org=' + org.id;
});
</script>`);

const accountHtml = () => page('Account', `<main test-id="account-page"><h1>My subscription</h1>
<div class="card" id="sub">Loading…</div>
<h2>License</h2><div class="card" id="lic"></div>
<h2>Invoices</h2><table test-id="invoices-table"><thead><tr><th>Reason</th><th>Net</th><th>VAT</th><th>Total</th><th>Status</th></tr></thead><tbody id="inv"></tbody></table></main>
<script>
const org = new URLSearchParams(location.search).get('org');
const j = (u, o) => fetch(u, o).then(r => r.json());
const post = (u, b={}) => fetch(u, {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(b)}).then(load);
async function load() {
  const s = await j('/api/orgs/' + org + '/subscription');
  const lic = await fetch('/api/orgs/' + org + '/license').then(r => r.ok ? r.json() : null);
  const inv = await j('/api/orgs/' + org + '/invoices');
  document.getElementById('sub').innerHTML =
    '<p>Plan: <strong test-id="subscription-plan-name">' + s.plan.name + '</strong></p>' +
    '<p>Status: <strong test-id="subscription-status">' + s.status + '</strong></p>' +
    (s.cancelAtPeriodEnd ? '<p test-id="subscription-cancel-notice">Ends on ' + s.periodEnd.slice(0,10) + '</p>' : '') +
    (s.planId === 'basic' && ['active','trialing'].includes(s.status) ? '<button data-action="upgrade" test-id="account-upgrade-button">Upgrade to PRO</button> ' : '') +
    (['active','trialing'].includes(s.status) && !s.cancelAtPeriodEnd ? '<button class="secondary" data-action="cancel" test-id="account-cancel-button">Cancel subscription</button>' : '') +
    (s.cancelAtPeriodEnd ? '<button data-action="reactivate" test-id="account-reactivate-button">Keep my subscription</button>' : '');
  document.getElementById('lic').innerHTML = lic
    ? '<p>Key: <code test-id="license-key">' + lic.key + '</code></p><p>Seats: <span test-id="license-seats">' + lic.seats + '</span></p><p>Active: <span test-id="license-active">' + lic.active + '</span></p>'
    : '<p>No license</p>';
  document.getElementById('inv').innerHTML = inv.map(i =>
    '<tr><td test-id="invoice-reason">' + i.reason + '</td><td test-id="invoice-net">' + i.net.toFixed(2) + '</td><td test-id="invoice-vat">' + (i.reverseCharge ? 'reverse charge' : i.vat.toFixed(2)) + '</td><td test-id="invoice-total">' + i.total.toFixed(2) + '</td><td test-id="invoice-status">' + i.status + '</td></tr>').join('');
  document.querySelector('[data-action=upgrade]')?.addEventListener('click', () => post('/api/subscriptions/' + s.id + '/change-plan', {planId: 'pro'}));
  document.querySelector('[data-action=cancel]')?.addEventListener('click', () => { if (confirm('Cancel subscription?')) post('/api/subscriptions/' + s.id + '/cancel'); });
  document.querySelector('[data-action=reactivate]')?.addEventListener('click', () => post('/api/subscriptions/' + s.id + '/reactivate'));
}
load();
</script>`);

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const send = (code, body, type = 'application/json') => {
    res.writeHead(code, { 'content-type': type });
    res.end(body == null ? '' : type === 'application/json' ? JSON.stringify(body) : body);
  };
  if (req.method === 'GET' && url.pathname === '/') return send(200, shopHtml(), 'text/html');
  if (req.method === 'GET' && url.pathname === '/checkout') return send(200, checkoutHtml(url.searchParams.get('plan')), 'text/html');
  if (req.method === 'GET' && url.pathname === '/account') return send(200, accountHtml(), 'text/html');
  if (req.method === 'GET' && url.pathname === '/health') return send(200, { ok: true });

  const [handler, params] = match(req.method, url.pathname);
  if (!handler) return send(404, { error: 'route not found' });
  let raw = '';
  for await (const chunk of req) raw += chunk;
  let body = {};
  try { body = raw ? JSON.parse(raw) : {}; } catch { return send(400, { error: 'invalid json' }); }
  const [code, payload] = handler(body, params);
  send(code, payload);
}).listen(PORT, () => console.log(`mock shop on http://localhost:${PORT}`));
