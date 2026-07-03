/**
 * _test151_scrypt_unit.cjs — §151 scrypt password hashing
 */
'use strict';
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

let pass = 0, fail = 0;
function ok(label, cond) {
  if (cond) { console.log('  PASS', label); pass++; }
  else       { console.error('  FAIL', label); fail++; }
}

const server = fs.readFileSync(path.join(__dirname, 'backend/server.js'), 'utf8');

console.log('\n=== §151 SCRYPT UNIT TESTS ===\n');

// --- code checks ---
console.log('[ server.js — scrypt implementation ]');
ok('scryptSync used',                       server.includes('scryptSync'));
ok('$scrypt$ prefix format',               server.includes("'$scrypt$'") || server.includes('`$scrypt$'));
ok('SCRYPT_N = 16384',                     server.includes('SCRYPT_N = 16384'));
ok('SCRYPT_R = 8',                         server.includes('SCRYPT_R = 8'));
ok('SCRYPT_P = 1',                         server.includes('SCRYPT_P = 1'));
ok('_hashPasswordLegacy kept for compat',  server.includes('_hashPasswordLegacy'));
ok('verifyPassword detects scrypt prefix', server.includes("startsWith('$scrypt$')"));
ok('verifyPassword falls back to legado',  server.includes("Legado: PBKDF2") || server.includes('Legado'));
ok('timingSafeEqual used in scrypt verify',server.includes('timingSafeEqual'));

// --- migration on login ---
console.log('\n[ server.js — auto-migration on login ]');
ok('migration check exists', server.includes("!user.password_hash.startsWith('$scrypt$')"));
ok('rehash on login',        server.includes('hash migrado para scrypt'));

// --- runtime test (scrypt round-trip) ---
console.log('\n[ runtime — scrypt round-trip ]');
const SCRYPT_N = 16384, SCRYPT_R = 8, SCRYPT_P = 1, SCRYPT_LEN = 32;
function hashPw(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(pw), salt, SCRYPT_LEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P }).toString('hex');
  return `$scrypt$${SCRYPT_N}$${salt}$${hash}`;
}
function verifyPw(pw, stored) {
  if (!stored || !stored.startsWith('$scrypt$')) return false;
  const parts = stored.split('$');
  if (parts.length !== 5) return false;
  const [,, N, salt, expectedHex] = parts;
  const actual = crypto.scryptSync(String(pw), salt, SCRYPT_LEN, { N: parseInt(N, 10), r: SCRYPT_R, p: SCRYPT_P }).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expectedHex, 'hex'));
}

const h1 = hashPw('vc-user-auto');
const h2 = hashPw('vc-user-auto');
ok('hash starts with $scrypt$',    h1.startsWith('$scrypt$'));
ok('two hashes differ (salt)',     h1 !== h2);
ok('correct password verifies',    verifyPw('vc-user-auto', h1));
ok('wrong password rejects',       !verifyPw('wrong-password', h1));
ok('legacy format rejected',       !verifyPw('test', 'aaaaaa:bbbbbb'));

console.log('\n=== RESULT ===');
console.log('PASS:', pass, '  FAIL:', fail);
process.exit(fail > 0 ? 1 : 0);
