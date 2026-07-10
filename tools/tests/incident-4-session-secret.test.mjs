#!/usr/bin/env node
/**
 * INCIDENTE-4 — SESSION_SECRET must be explicit and strong.
 *
 * This test starts backend/server.js as a real child process and proves the
 * auth/session signer fails closed before listening when SESSION_SECRET is
 * missing, public fallback, or too short.
 */
import { spawn } from 'child_process';

const PORT_BASE = 18744;
const PUBLIC_FALLBACK = ['vision', 'core', 'dev', 'session', 'secret', 'change', 'me'].join('-');
const GOOD_SECRET = 'incident-4-valid-session-secret-32chars-min';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

function baseEnv(port, sessionSecret) {
  const env = { ...process.env, PORT: String(port), AWS_S3_BUCKET: '' };
  delete env.SESSION_SECRET;
  if (sessionSecret !== undefined) env.SESSION_SECRET = sessionSecret;
  // PROVIDER_VAULT_SECRET também é fail-closed (limpeza de dogfood pós-
  // INCIDENTE-4) — sem isto, todo boot deste teste falharia por um motivo
  // diferente do SESSION_SECRET que este arquivo está de fato testando.
  env.PROVIDER_VAULT_SECRET = 'incident-4-test-vault-secret-32chars-min';
  return env;
}

function startBackend(port, sessionSecret, autoExitMs = 0) {
  const args = autoExitMs > 0
    ? ['--no-deprecation', '-e', `require('./backend/server.js'); setTimeout(() => process.exit(0), ${autoExitMs});`]
    : ['--no-deprecation', 'backend/server.js'];
  const child = spawn(process.execPath, args, {
    cwd: process.cwd(),
    env: baseEnv(port, sessionSecret),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', d => { output += d.toString(); });
  child.stderr.on('data', d => { output += d.toString(); });
  return { child, getOutput: () => output };
}

function waitForExit(child, timeoutMs = 5000) {
  return new Promise(resolve => {
    const timer = setTimeout(() => {
      child.kill();
      resolve({ exited: false, code: null });
    }, timeoutMs);
    child.once('exit', code => {
      clearTimeout(timer);
      resolve({ exited: true, code });
    });
  });
}

async function waitForHealth(port, timeoutMs = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (r.ok) return true;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  return false;
}

async function assertFailsClosed(label, sessionSecret, expectedError, offset) {
  const { child, getOutput } = startBackend(PORT_BASE + offset, sessionSecret);
  const result = await waitForExit(child);
  const output = getOutput();
  assert(result.exited && result.code !== 0, `${label}: backend exits non-zero before serving`);
  assert(output.includes(expectedError), `${label}: stderr names ${expectedError}`);
  assert(!output.includes(PUBLIC_FALLBACK), `${label}: stderr never prints the public fallback value`);
}

await assertFailsClosed('missing SESSION_SECRET', undefined, 'SESSION_SECRET_REQUIRED', 1);
await assertFailsClosed('public fallback SESSION_SECRET', PUBLIC_FALLBACK, 'SESSION_SECRET_INSECURE_PUBLIC_FALLBACK', 2);
await assertFailsClosed('short SESSION_SECRET', 'short-secret', 'SESSION_SECRET_TOO_SHORT', 3);

const goodPort = PORT_BASE + 4;
const good = startBackend(goodPort, GOOD_SECRET, 1500);
const up = await waitForHealth(goodPort);
assert(up, 'strong explicit SESSION_SECRET lets backend start and serve /api/health');
await waitForExit(good.child, 5000);

console.log(`\nincident-4-session-secret: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
