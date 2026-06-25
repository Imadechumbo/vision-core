/**
 * _test152_jwt_blacklist_unit.cjs — §152 JWT rotation + blacklist
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

console.log('\n=== §152 JWT BLACKLIST UNIT TESTS ===\n');

// --- JTI + 24h ---
console.log('[ server.js — JTI + token expiry ]');
ok('JTI generated in signSession',    server.includes('randomBytes(16).toString') && server.includes('jti'));
ok('24h default expiry in signSession', (() => {
  const idx = server.indexOf('function signSession(');
  return idx >= 0 && server.slice(idx, idx + 400).includes('24 * 60 * 60 * 1000');
})());
ok('iat field set',                   server.includes("iat: Date.now()"));
ok('all 4 token calls use 24h', (() => {
  const matches = [...server.matchAll(/signSession\(\{ uid: user\.id, exp: Date\.now\(\) \+ 24 \* 60 \* 60 \* 1000 \}/g)];
  return matches.length >= 4;
})());

// --- blacklist infrastructure ---
console.log('\n[ server.js — blacklist ]');
ok('BLACKLIST_FILE defined',            server.includes('BLACKLIST_FILE'));
ok('_tokenBlacklist Set defined',       server.includes('_tokenBlacklist = new Set()'));
ok('_loadBlacklist function',           server.includes('function _loadBlacklist('));
ok('_saveBlacklist function',           server.includes('function _saveBlacklist('));
ok('revokeToken function',              server.includes('function revokeToken('));
ok('isTokenRevoked function',           server.includes('function isTokenRevoked('));
ok('max 10000 entries enforced',        server.includes('10000'));
ok('blacklist check in verifySession',  (() => {
  const idx = server.indexOf('function verifySession(');
  return idx >= 0 && server.slice(idx, idx + 700).includes('isTokenRevoked');
})());

// --- logout endpoint ---
console.log('\n[ server.js — logout ]');
ok('/api/auth/logout route exists',   server.includes("app.post('/api/auth/logout'"));
ok('revokeToken called on logout',    (() => {
  const idx = server.indexOf("app.post('/api/auth/logout'");
  return idx >= 0 && server.slice(idx, idx + 400).includes('revokeToken(');
})());
ok('clearCookie on logout',           server.includes('clearCookie'));
ok('anti_stub: true in logout',       (() => {
  const idx = server.indexOf("app.post('/api/auth/logout'");
  return idx >= 0 && server.slice(idx, idx + 500).includes('anti_stub: true');
})());
ok('logged_out message',              server.includes("'logged_out'"));

// --- startup load ---
console.log('\n[ server.js — startup ]');
ok('_loadBlacklist called at startup', server.includes('_loadBlacklist()'));
ok('BLACKLIST_FILE synced with S3',    (() => {
  const idx = server.indexOf('startup load done');
  return idx >= 0 && server.slice(Math.max(0, idx-200), idx).includes('BLACKLIST_FILE');
})());

console.log('\n=== RESULT ===');
console.log('PASS:', pass, '  FAIL:', fail);
process.exit(fail > 0 ? 1 : 0);
