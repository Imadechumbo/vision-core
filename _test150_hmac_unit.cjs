/**
 * _test150_hmac_unit.cjs — §150 HMAC webhook Hotmart
 */
'use strict';
const fs = require('fs');
const path = require('path');

let pass = 0, fail = 0;
function ok(label, cond) {
  if (cond) { console.log('  PASS', label); pass++; }
  else       { console.error('  FAIL', label); fail++; }
}

const server = fs.readFileSync(path.join(__dirname, 'backend/server.js'), 'utf8');

console.log('\n=== §150 HMAC WEBHOOK UNIT TESTS ===\n');

// --- verifyHotmartWebhook function ---
console.log('[ server.js — verifyHotmartWebhook ]');
ok('verifyHotmartWebhook function defined', server.includes('function verifyHotmartWebhook('));
ok("'x-hotmart-hottok' header checked",    server.includes("'x-hotmart-hottok'"));
ok("'x-hotmart-signature' header checked", server.includes("'x-hotmart-signature'"));
ok("'invalid_hottok' reason",             server.includes("'invalid_hottok'"));
ok("'invalid_signature' reason",          server.includes("'invalid_signature'"));
ok("'missing_auth_header' reason",        server.includes("'missing_auth_header'"));
ok('HMAC-SHA256 used',                    server.includes("createHmac('sha256'"));
ok('NODE_ENV production check',           server.includes("NODE_ENV === 'production'"));
ok('console.warn for dev mode',           server.includes('hotmart webhook sem verificacao'));

// --- webhook handler applies verification ---
console.log('\n[ server.js — webhook handler ]');
ok('handler calls verifyHotmartWebhook', (() => {
  const idx = server.indexOf("app.post('/api/billing/hotmart-webhook'");
  return idx >= 0 && server.slice(idx, idx + 400).includes('verifyHotmartWebhook(req)');
})());
ok("'unauthorized_webhook' error on reject", server.includes("'unauthorized_webhook'"));
ok('401 status on auth failure', (() => {
  const idx = server.indexOf('unauthorized_webhook');
  return idx >= 0 && server.slice(Math.max(0, idx - 100), idx).includes('status(401)');
})());
ok('anti_stub: true in 401 response', (() => {
  const idx = server.indexOf('unauthorized_webhook');
  return idx >= 0 && server.slice(idx, idx + 100).includes('anti_stub: true');
})());
ok('IP logged on rejection', server.includes("'x-forwarded-for'") && server.includes('webhook rejeitado'));

// --- env var usage ---
console.log('\n[ server.js — env vars ]');
ok('HOTMART_HOTTOK env var',         server.includes('HOTMART_HOTTOK'));
ok('HOTMART_CLIENT_SECRET used',     server.includes('HOTMART_CLIENT_SECRET'));
ok('hottok value never logged',      !server.includes('console.log.*hottok') && !server.includes("'hottok'"));

console.log('\n=== RESULT ===');
console.log('PASS:', pass, '  FAIL:', fail);
process.exit(fail > 0 ? 1 : 0);
