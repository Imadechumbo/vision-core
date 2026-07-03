/**
 * _test154_auditlog_unit.cjs — §154 audit log + §159 LGPD
 */
'use strict';
const fs   = require('fs');
const path = require('path');

let pass = 0, fail = 0;
function ok(label, cond) {
  if (cond) { console.log('  PASS', label); pass++; }
  else       { console.error('  FAIL', label); fail++; }
}

const server = fs.readFileSync(path.join(__dirname, 'backend/server.js'), 'utf8');

console.log('\n=== §154 AUDIT LOG + §159 LGPD UNIT TESTS ===\n');

// --- §154: auditLog infrastructure ---
console.log('[ §154 — auditLog infrastructure ]');
ok('AUDIT_LOG_FILE defined',          server.includes('AUDIT_LOG_FILE'));
ok('auditLog function exists',        server.includes('function auditLog('));
ok('auditLog records timestamp',      (() => {
  const idx = server.indexOf('function auditLog(');
  return idx >= 0 && server.slice(idx, idx + 400).includes('toISOString()');
})());
ok('auditLog records ip',             (() => {
  const idx = server.indexOf('function auditLog(');
  return idx >= 0 && server.slice(idx, idx + 400).includes("'x-forwarded-for'");
})());
ok('auditLog records user-agent',     (() => {
  const idx = server.indexOf('function auditLog(');
  return idx >= 0 && server.slice(idx, idx + 400).includes("'user-agent'");
})());
ok('auditLog records action',         (() => {
  const idx = server.indexOf('function auditLog(');
  return idx >= 0 && server.slice(idx, idx + 400).includes('action');
})());
ok('max 10000 entries enforced',      (() => {
  const idx = server.indexOf('function auditLog(');
  return idx >= 0 && server.slice(idx, idx + 600).includes('10000');
})());
ok('uses writeAndSyncS3 for persist', (() => {
  const idx = server.indexOf('function auditLog(');
  return idx >= 0 && server.slice(idx, idx + 650).includes('writeAndSyncS3');
})());

// --- §154: audit calls in routes ---
console.log('\n[ §154 — auditLog calls in routes ]');
ok("auditLog('register') called",     server.includes("auditLog('register'"));
ok("auditLog('login_ok') called",     server.includes("auditLog('login_ok'"));
ok("auditLog('login_fail') called",   server.includes("auditLog('login_fail'"));
ok("auditLog('logout') called",       server.includes("auditLog('logout'"));
ok("auditLog('oauth_login') google",  server.includes("provider: 'google'"));
ok("auditLog('oauth_login') github",  server.includes("provider: 'github'"));
ok("auditLog('plan_upgrade') called", server.includes("auditLog('plan_upgrade'"));
ok("auditLog('webhook_rejected')",    server.includes("auditLog('webhook_rejected'"));

// --- §154: GET /api/audit-log ---
console.log('\n[ §154 — GET /api/audit-log endpoint ]');
ok("GET /api/audit-log route exists",  server.includes("app.get('/api/audit-log'"));
ok("admin role check in audit-log",   (() => {
  const idx = server.indexOf("app.get('/api/audit-log'");
  return idx >= 0 && server.slice(idx, idx + 500).includes("'admin'");
})());
ok("anti_stub in audit-log response", (() => {
  const idx = server.indexOf("app.get('/api/audit-log'");
  return idx >= 0 && server.slice(idx, idx + 400).includes('anti_stub: true');
})());

// --- §159: LGPD DELETE /api/auth/me ---
console.log('\n[ §159 — LGPD DELETE /api/auth/me ]');
ok("DELETE /api/auth/me route exists",server.includes("app.delete('/api/auth/me'"));
ok("splice removes user",             (() => {
  const idx = server.indexOf("app.delete('/api/auth/me'");
  return idx >= 0 && server.slice(idx, idx + 800).includes('.splice(');
})());
ok("revokeToken called before delete",(() => {
  const idx = server.indexOf("app.delete('/api/auth/me'");
  const slice = idx >= 0 ? server.slice(idx, idx + 800) : '';
  const splicePos = slice.indexOf('.splice(');
  const revokePos = slice.indexOf('revokeToken(');
  return splicePos > 0 && revokePos >= 0 && revokePos < splicePos;
})());
ok("writeAndSyncS3 after delete",     (() => {
  const idx = server.indexOf("app.delete('/api/auth/me'");
  return idx >= 0 && server.slice(idx, idx + 800).includes('writeAndSyncS3');
})());
ok("auditLog('account_deleted')",     server.includes("auditLog('account_deleted'"));
ok("email_deleted in response",       server.includes('email_deleted'));
ok("anti_stub in delete response",    (() => {
  const idx = server.indexOf("app.delete('/api/auth/me'");
  return idx >= 0 && server.slice(idx, idx + 700).includes('anti_stub: true');
})());

console.log('\n=== RESULT ===');
console.log('PASS:', pass, '  FAIL:', fail);
process.exit(fail > 0 ? 1 : 0);
