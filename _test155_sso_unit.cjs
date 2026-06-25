/**
 * _test155_sso_unit.cjs — §155 SSO ENTERPRISE domains
 */
'use strict';
const fs   = require('fs');
const path = require('path');

let pass = 0, fail = 0;
function ok(label, cond) {
  if (cond) { console.log('  PASS', label); pass++; }
  else       { console.error('  FAIL', label); fail++; }
}

const server  = fs.readFileSync(path.join(__dirname, 'backend/server.js'), 'utf8');
const html    = fs.readFileSync(path.join(__dirname, 'frontend/index.html'), 'utf8');

console.log('\n=== §155 SSO ENTERPRISE UNIT TESTS ===\n');

// --- server.js: infrastructure ---
console.log('[ server.js — SSO infrastructure ]');
ok('SSO_DOMAINS_FILE defined',   server.includes('SSO_DOMAINS_FILE'));
ok('_ssoDomains var defined',    server.includes('let _ssoDomains'));
ok('_loadSsoDomains function',   server.includes('function _loadSsoDomains('));
ok('_saveSsoDomains function',   server.includes('function _saveSsoDomains('));
ok('isSsoDomain function',       server.includes('function isSsoDomain('));
ok('isSsoDomain splits @',       (() => {
  const idx = server.indexOf('function isSsoDomain(');
  return idx >= 0 && server.slice(idx, idx + 250).includes("split('@')");
})());
ok('_loadSsoDomains at startup', (() => {
  // use unique call-site string (function def would also contain _loadBlacklist())
  const idx = server.indexOf('_loadBlacklist(); // §152');
  return idx >= 0 && server.slice(idx, idx + 200).includes('_loadSsoDomains()');
})());
ok('SSO_DOMAINS_FILE synced S3', (() => {
  const idx = server.indexOf('startup load done');
  return idx >= 0 && server.slice(Math.max(0, idx-300), idx).includes('SSO_DOMAINS_FILE');
})());

// --- server.js: OAuth Google callback uses isSsoDomain ---
console.log('\n[ server.js — Google OAuth SSO upgrade ]');
ok('isSsoDomain called in google callback', (() => {
  // search within the google callback — starts at /api/auth/oauth/google/callback
  const idx = server.indexOf("app.get('/api/auth/oauth/google/callback'");
  return idx >= 0 && server.slice(idx, idx + 2000).includes('isSsoDomain(');
})());
ok("plan='enterprise' set on SSO match", (() => {
  // use call-site string (not function def which also contains isSsoDomain(email))
  const idx = server.indexOf('const ssoDomain = isSsoDomain(');
  return idx >= 0 && server.slice(idx, idx + 300).includes("user.plan = 'enterprise'");
})());
ok("auditLog('sso_enterprise_login')",   server.includes("auditLog('sso_enterprise_login'"));
ok('domain not email in sso_enterprise_login', (() => {
  // must not log full email — only domain
  const idx = server.indexOf("auditLog('sso_enterprise_login'");
  const slice = idx >= 0 ? server.slice(idx, idx + 150) : '';
  return slice.includes("split('@')[1]") || slice.includes('domain:');
})());

// --- server.js: endpoints ---
console.log('\n[ server.js — SSO admin endpoints ]');
ok("GET /api/sso/domains exists",        server.includes("app.get('/api/sso/domains'"));
ok("POST /api/sso/domains exists",       server.includes("app.post('/api/sso/domains'"));
ok("DELETE /api/sso/domains/:domain",    server.includes("app.delete('/api/sso/domains/:domain'"));
ok("admin role check in sso endpoints", (() => {
  const idx = server.indexOf("app.get('/api/sso/domains'");
  return idx >= 0 && server.slice(idx, idx + 500).includes("'admin'");
})());
ok("domain validation (no @)",          (() => {
  const idx = server.indexOf("app.post('/api/sso/domains'");
  return idx >= 0 && server.slice(idx, idx + 900).includes("invalid_domain");
})());
ok("_saveSsoDomains called on POST",    (() => {
  const idx = server.indexOf("app.post('/api/sso/domains'");
  return idx >= 0 && server.slice(idx, idx + 1200).includes('_saveSsoDomains()');
})());
ok("_saveSsoDomains called on DELETE",  (() => {
  const idx = server.indexOf("app.delete('/api/sso/domains/:domain'");
  return idx >= 0 && server.slice(idx, idx + 900).includes('_saveSsoDomains()');
})());
ok("auditLog sso_domain_added",          server.includes("auditLog('sso_domain_added'"));
ok("auditLog sso_domain_removed",        server.includes("auditLog('sso_domain_removed'"));

// --- index.html: enterprise badge CSS ---
console.log('\n[ index.html — ENTERPRISE badge CSS ]');
ok(".v299-plan-tag.pro CSS defined",         html.includes('.v299-plan-tag.pro'));
ok(".v299-plan-tag.enterprise CSS defined",  html.includes('.v299-plan-tag.enterprise'));
ok("enterprise badge golden gradient",       html.includes('#f59e0b') || html.includes('d97706'));

console.log('\n=== RESULT ===');
console.log('PASS:', pass, '  FAIL:', fail);
process.exit(fail > 0 ? 1 : 0);
