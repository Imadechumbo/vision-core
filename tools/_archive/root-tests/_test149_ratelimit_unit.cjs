/**
 * _test149_ratelimit_unit.cjs — §149 Rate limiting auth
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

console.log('\n=== §149 RATE LIMIT UNIT TESTS ===\n');

// --- core function ---
console.log('[ server.js — rateLimitMiddleware ]');
ok('rateLimitMiddleware function defined', server.includes('function rateLimitMiddleware('));
ok('_rl149 Map defined',                  server.includes('const _rl149 = new Map()'));
ok('rate_limit_exceeded error',           server.includes("'rate_limit_exceeded'"));
ok('retry_after_seconds field',           server.includes('retry_after_seconds'));
ok('Retry-After header set',              server.includes("'Retry-After'"));
ok('anti_stub: true in 429',              (() => {
  const idx = server.indexOf('rate_limit_exceeded');
  return idx >= 0 && server.slice(idx, idx + 200).includes('anti_stub: true');
})());
ok('x-forwarded-for for real IP',         server.includes("'x-forwarded-for'"));
ok('setInterval cleanup',                 server.includes('setInterval'));
ok('_rl149.delete in cleanup',            server.includes('_rl149.delete('));

// --- applied to routes ---
console.log('\n[ server.js — routes with rate limit ]');
ok('register route has rateLimitMiddleware', (() => {
  const idx = server.indexOf("app.all('/api/auth/register'");
  return idx >= 0 && server.slice(idx, idx + 100).includes('rateLimitMiddleware(');
})());
ok('register limit = 5 attempts',          server.includes("rateLimitMiddleware('register', 5,"));
ok('register window = 1 hour',             server.includes('60 * 60 * 1000'));
ok('login route has rateLimitMiddleware',   (() => {
  const idx = server.indexOf("app.all('/api/auth/login'");
  return idx >= 0 && server.slice(idx, idx + 100).includes('rateLimitMiddleware(');
})());
ok('login limit = 10 attempts',            server.includes("rateLimitMiddleware('login', 10,"));
ok('login window = 15 min',               server.includes('15 * 60 * 1000'));

// --- OAuth not rate-limited ---
console.log('\n[ server.js — OAuth routes not affected ]');
ok('OAuth google route unchanged', (() => {
  const idx = server.indexOf("app.get('/api/auth/oauth/google'");
  return idx >= 0 && !server.slice(idx, idx + 80).includes('rateLimitMiddleware');
})());
ok('OAuth github route unchanged', (() => {
  const idx = server.indexOf("app.get('/api/auth/oauth/github'");
  return idx >= 0 && !server.slice(idx, idx + 80).includes('rateLimitMiddleware');
})());

console.log('\n=== RESULT ===');
console.log('PASS:', pass, '  FAIL:', fail);
process.exit(fail > 0 ? 1 : 0);
