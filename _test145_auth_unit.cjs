/**
 * _test145_auth_unit.cjs — §145 auth UI + senha individual
 */
'use strict';
const fs   = require('fs');
const path = require('path');

let pass = 0, fail = 0;
function ok(label, cond) {
  if (cond) { console.log('  PASS', label); pass++; }
  else       { console.error('  FAIL', label); fail++; }
}

const bundle  = fs.readFileSync(path.join(__dirname, 'frontend/assets/vision-core-bundle.js'), 'utf8');
const server  = fs.readFileSync(path.join(__dirname, 'backend/server.js'), 'utf8');
const html    = fs.readFileSync(path.join(__dirname, 'frontend/index.html'), 'utf8');

console.log('\n=== §145 AUTH UNIT TESTS ===\n');

// --- server.js ---
console.log('[ server.js — registro com senha individual ]');
ok("registro nao usa 'vc-user-auto' hardcoded", !(() => {
  const idx = server.indexOf("app.all('/api/auth/register'");
  if (idx < 0) return false;
  const block = server.slice(idx, idx + 600);
  // old code had: password_hash: hashPassword(password) where password = 'vc-user-auto'
  // new code uses rawPw generated
  return block.includes("hashPassword(password)") && !block.includes("rawPw");
})());
ok('crypto.randomBytes usado no register', (() => {
  const idx = server.indexOf("app.all('/api/auth/register'");
  return idx >= 0 && server.slice(idx, idx + 700).includes('randomBytes');
})());
ok('generated_password retornado no register', (() => {
  const idx = server.indexOf("app.all('/api/auth/register'");
  return idx >= 0 && server.slice(idx, idx + 1500).includes('generated_password');
})());
ok("rawPw gerado quando 'vc-user-auto' detectado", server.includes("provided !== 'vc-user-auto'"));

// --- bundle.js ---
console.log('\n[ bundle.js — s145UpdateAuthUI ]');
ok('s145UpdateAuthUI function defined', bundle.includes('function s145UpdateAuthUI('));
ok('s145UserBadge element created',    bundle.includes("'s145UserBadge'"));
ok('logout remove vision_token',       (() => {
  const idx = bundle.indexOf('s145UserBadge');
  return idx >= 0 && bundle.slice(idx, idx + 2000).includes("removeItem('vision_token')");
})());
ok('logout restores openAuthBtn',      (() => {
  const idx = bundle.indexOf('badge.onclick = function()');
  return idx >= 0 && bundle.slice(idx, idx + 500).includes("style.display = ''");
})());
ok('s145UpdateAuthUI called after register success', (() => {
  const idx = bundle.indexOf("'Conta criada!'");
  return idx >= 0 && bundle.slice(Math.max(0, idx - 200), idx).includes('s145UpdateAuthUI');
})());
ok('s145UpdateAuthUI called after login success', (() => {
  const idx = bundle.indexOf("'Login realizado!'");
  return idx >= 0 && bundle.slice(Math.max(0, idx - 200), idx).includes('s145UpdateAuthUI');
})());
ok('s145UpdateAuthUI called on page load', (() => {
  const idx = bundle.indexOf('Load real plan on page init');
  return idx >= 0 && bundle.slice(idx, idx + 600).includes('s145UpdateAuthUI');
})());

console.log('\n[ bundle.js — senha por email ]');
ok('vc_user_pw_ chave de localStorage salva', bundle.includes("'vc_user_pw_' + email"));
ok('generated_password salvo no localStorage', bundle.includes('data.generated_password'));
ok('login fallback usa senha salva', (() => {
  const idx = bundle.indexOf("Fall back to login");
  return idx >= 0 && bundle.slice(idx, idx + 300).includes("vc_user_pw_");
})());
ok('vc_user_email salvo apos auth', bundle.includes("'vc_user_email'"));

// --- index.html ---
console.log('\n[ index.html ]');
ok('openAuthBtn exists in HTML', html.includes('id="openAuthBtn"'));

console.log('\n=== RESULT ===');
console.log('PASS:', pass, '  FAIL:', fail);
process.exit(fail > 0 ? 1 : 0);
