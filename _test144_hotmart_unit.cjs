/**
 * _test144_hotmart_unit.cjs — §144 Hotmart billing integration
 */
'use strict';
const fs   = require('fs');
const path = require('path');
const http = require('http');

let pass = 0, fail = 0;
function ok(label, cond) {
  if (cond) { console.log('  PASS', label); pass++; }
  else       { console.error('  FAIL', label); fail++; }
}

const bundle  = fs.readFileSync(path.join(__dirname, 'frontend/assets/vision-core-bundle.js'), 'utf8');
const server  = fs.readFileSync(path.join(__dirname, 'backend/server.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(__dirname, 'frontend/index.html'), 'utf8');

console.log('\n=== §144 HOTMART UNIT TESTS ===\n');

// --- server.js: webhook ---
console.log('[ server.js — hotmart-webhook ]');
ok('route POST /api/billing/hotmart-webhook exists', server.includes("app.post('/api/billing/hotmart-webhook'"));
ok('PURCHASE_COMPLETE handled',       server.includes("'PURCHASE_COMPLETE'"));
ok('PURCHASE_APPROVED handled',       server.includes("'PURCHASE_APPROVED'"));
ok('PURCHASE_CANCELED handled',       server.includes("'PURCHASE_CANCELED'"));
ok('SUBSCRIPTION_CANCELLATION handled', server.includes("'SUBSCRIPTION_CANCELLATION'"));
ok('user.plan = pro on approve',      server.includes("user.plan            = 'pro'") || server.includes("user.plan = 'pro'"));
ok('user.plan = free on cancel',      server.includes("user.plan            = 'free'") || server.includes("user.plan = 'free'"));
ok('writeJsonFile called on event',   (() => {
  const idx = server.indexOf("app.post('/api/billing/hotmart-webhook'");
  return idx >= 0 && server.slice(idx, idx + 1500).includes('writeJsonFile(USERS_DB');
})());
ok('anti_stub: true in webhook response', (() => {
  const idx = server.indexOf("app.post('/api/billing/hotmart-webhook'");
  return idx >= 0 && server.slice(idx, idx + 1500).includes('anti_stub: true');
})());

// --- server.js: checkout ---
console.log('\n[ server.js — hotmart-checkout ]');
ok('route GET /api/billing/hotmart-checkout exists', server.includes("app.get('/api/billing/hotmart-checkout'"));
ok('HOTMART_CHECKOUT_URL env used',    server.includes('HOTMART_CHECKOUT_URL'));
ok('email query param appended',       server.includes("req.query.email"));
ok('checkout_url in response',         (() => {
  const idx = server.indexOf("app.get('/api/billing/hotmart-checkout'");
  return idx >= 0 && server.slice(idx, idx + 500).includes('checkout_url');
})());

// --- bundle.js: PRO click → Hotmart ---
console.log('\n[ bundle.js — PRO card click ]');
ok('hotmart-checkout in bundle',       bundle.includes("'/api/billing/hotmart-checkout"));
ok('email extracted from JWT',         bundle.includes('payload.email'));
ok('window.open for checkout_url',     bundle.includes("window.open(data.checkout_url, '_blank')"));
ok('Stripe create-checkout-session NOT in PRO handler', (() => {
  // The old Stripe call should be gone from plan card handler
  const idx = bundle.indexOf("§144");
  return idx >= 0 && !bundle.slice(idx, idx + 1500).includes('create-checkout-session');
})());
ok('enterprise skipped in forEach',    bundle.includes("plan === 'enterprise') return"));

// --- index.html: PRO card ---
console.log('\n[ index.html — PRO card ]');
ok('PRO card no longer has plan-soon class', (() => {
  const idx = indexHtml.indexOf('data-plan="pro"');
  if (idx < 0) return false;
  const cardStart = indexHtml.lastIndexOf('<div', idx);
  const cardSnip  = indexHtml.slice(cardStart, cardStart + 120);
  return !cardSnip.includes('plan-soon');
})());
ok('PRO card has ASSINAR badge',       indexHtml.includes('ASSINAR'));
ok('PRO card no longer EM BREVE',      (() => {
  const idx = indexHtml.indexOf('data-plan="pro"');
  if (idx < 0) return false;
  const snip = indexHtml.slice(idx, idx + 250);
  return !snip.includes('EM BREVE');
})());
ok('ENTERPRISE still plan-soon',       (() => {
  const idx = indexHtml.indexOf('data-plan="enterprise"');
  if (idx < 0) return false;
  const cardStart = indexHtml.lastIndexOf('<div', idx);
  return indexHtml.slice(cardStart, cardStart + 100).includes('plan-soon');
})());

console.log('\n=== RESULT ===');
console.log('PASS:', pass, '  FAIL:', fail);
process.exit(fail > 0 ? 1 : 0);
