#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const USERS = resolve(ROOT, 'data/users.json');
const VAULT = resolve(ROOT, 'data/ai-providers-vault.json');
const backups = new Map([[USERS, existsSync(USERS) ? readFileSync(USERS) : null], [VAULT, existsSync(VAULT) ? readFileSync(VAULT) : null]]);
const port = 18748;
const base = `http://127.0.0.1:${port}`;
const adminEmail = `provider-admin-${Date.now()}@example.com`;
let passed = 0;
const assert = (ok, msg) => { if (!ok) throw new Error(msg); console.log('  ✓ ' + msg); passed++; };

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = {};
  if (body) headers['content-type'] = 'application/json';
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return { status: response.status, body: await response.json() };
}
async function register(email) {
  const r = await request('/api/auth/register', { method: 'POST', body: { email, password: 'Test1234!Secure', name: email } });
  return r.body.token;
}
const child = spawn(process.execPath, ['--no-deprecation', 'backend/server.js'], {
  cwd: ROOT,
  env: { ...process.env, PORT: String(port), AWS_S3_BUCKET: '', SESSION_SECRET: 'provider-security-session-secret-32chars', PROVIDER_VAULT_SECRET: 'provider-security-vault-secret-32chars', ADMIN_ALLOWED_EMAILS: adminEmail },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let log = '';
child.stdout.on('data', d => { log += d; });
child.stderr.on('data', d => { log += d; });

try {
  for (let i = 0; i < 75; i++) {
    try { if ((await fetch(base + '/api/health')).ok) break; } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  const regular = await register(`provider-user-${Date.now()}@example.com`);
  const admin = await register(adminEmail);
  for (const path of ['/api/providers', '/api/providers/list', '/api/runtime/providers', '/api/runtime/provider-status', '/api/scanner/ast']) {
    assert((await request(path)).status === 401, path + ' rejects anonymous');
    assert((await request(path, { token: regular })).status === 403, path + ' rejects regular user');
  }
  for (const path of ['/api/providers/save', '/api/providers/delete', '/api/providers/test', '/api/providers/default']) {
    assert((await request(path, { method: 'POST', body: { provider: 'openai' } })).status === 401, path + ' rejects anonymous mutation');
    assert((await request(path, { method: 'POST', body: { provider: 'openai' }, token: regular })).status === 403, path + ' rejects regular-user mutation');
  }
  const save = await request('/api/providers/save', { method: 'POST', token: admin, body: { provider: 'openai', api_key: 'fake-provider-key-for-test', priority: 1 } });
  assert(save.status === 200 && save.body.saved === true, 'allowlisted admin can mutate global provider vault');
  const list = await request('/api/providers/list', { token: admin });
  assert(list.status === 200 && !JSON.stringify(list.body).includes('fake-provider-key-for-test'), 'admin read remains redacted');
  const source = readFileSync(resolve(ROOT, 'backend/server.js'), 'utf8');
  assert(!source.includes('generativelanguage.googleapis.com/v1/models?key='), 'Gemini model-list URL contains no secret query');
  assert(!source.includes(':generateContent?key='), 'Gemini generation URLs contain no secret query');
  assert(source.includes("'x-goog-api-key'"), 'Gemini key is carried in an auth header');
  console.log(`\n${passed}/${passed} PASS`);
} catch (error) {
  console.error(error.message);
  console.error(log.slice(-2000));
  process.exitCode = 1;
} finally {
  child.kill('SIGTERM');
  for (const [file, content] of backups) {
    if (content) writeFileSync(file, content); else if (existsSync(file)) unlinkSync(file);
  }
}
