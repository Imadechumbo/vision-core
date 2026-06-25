/**
 * _test153_headers_unit.cjs — §153 security headers no CF Workers gateway
 */
'use strict';
const fs   = require('fs');
const path = require('path');

let pass = 0, fail = 0;
function ok(label, cond) {
  if (cond) { console.log('  PASS', label); pass++; }
  else       { console.error('  FAIL', label); fail++; }
}

const gateway = fs.readFileSync(path.join(__dirname, 'worker/src/index.js'), 'utf8');

console.log('\n=== §153 SECURITY HEADERS UNIT TESTS ===\n');

// --- addSecurityHeaders function ---
console.log('[ addSecurityHeaders — function definition ]');
ok('addSecurityHeaders function exists',   gateway.includes('function addSecurityHeaders('));
ok('X-Frame-Options DENY',                gateway.includes("'X-Frame-Options', 'DENY'"));
ok('X-Content-Type-Options nosniff',      gateway.includes("'X-Content-Type-Options', 'nosniff'"));
ok('HSTS max-age=31536000',               gateway.includes('max-age=31536000'));
ok('HSTS includeSubDomains',              gateway.includes('includeSubDomains'));
ok('Referrer-Policy header set',          gateway.includes("'Referrer-Policy'"));
ok('Content-Security-Policy header set',  gateway.includes("'Content-Security-Policy'"));
ok("CSP default-src 'self'",              gateway.includes("default-src 'self'"));
ok("CSP frame-ancestors 'none'",          gateway.includes("frame-ancestors 'none'"));
ok('Permissions-Policy header set',       gateway.includes("'Permissions-Policy'"));
ok('X-Powered-By deleted',               gateway.includes("'X-Powered-By'") && gateway.includes("h.delete("));
ok('Server header deleted',              (() => {
  const idx = gateway.indexOf('function addSecurityHeaders(');
  return idx >= 0 && gateway.slice(idx, idx + 900).includes("h.delete('Server')");
})());

// --- integration points ---
console.log('\n[ Integration — called from response builders ]');
ok('addSecurityHeaders called in withGatewayHeaders', (() => {
  const idx = gateway.indexOf('function withGatewayHeaders(');
  return idx >= 0 && gateway.slice(idx, idx + 500).includes('addSecurityHeaders(');
})());
ok('addSecurityHeaders called in jsonResponse', (() => {
  const idx = gateway.indexOf('function jsonResponse(');
  return idx >= 0 && gateway.slice(idx, idx + 300).includes('addSecurityHeaders(');
})());

// --- no CORS interference ---
console.log('\n[ CORS not broken ]');
ok('CORS Access-Control-Allow-Origin still present', gateway.includes('Access-Control-Allow-Origin'));
ok('CORS Access-Control-Allow-Methods still present', gateway.includes('Access-Control-Allow-Methods'));
ok('corsHeaders function still present',              gateway.includes('function corsHeaders('));

console.log('\n=== RESULT ===');
console.log('PASS:', pass, '  FAIL:', fail);
process.exit(fail > 0 ? 1 : 0);
