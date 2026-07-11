#!/usr/bin/env node
/**
 * PROVIDER_VAULT_SECRET must be explicit and strong (fail-closed).
 *
 * Limpeza de resíduos de dogfood pós-INCIDENTE-4: PROVIDER_VAULT_SECRET
 * tinha exatamente o mesmo padrão de risco que o SESSION_SECRET tinha antes
 * do INCIDENTE-4 (env var opcional, fallback público hardcoded se ausente) —
 * ver docs/CURRENT_STATE.md e docs/VC_SECRET_GUARD_RUST_SPEC.md, achado do
 * dogfood da Fase 1.5. Mesmo teste que tools/tests/incident-4-session-secret.test.mjs,
 * adaptado para este segredo: sobe backend/server.js como processo real e
 * prova que o boot falha antes de servir quando PROVIDER_VAULT_SECRET está
 * ausente, é o fallback público conhecido, ou é curto demais.
 */
import { spawn } from 'child_process';

const PORT_BASE = 18754;
const PUBLIC_FALLBACK = ['vision', 'core', 'dev', 'vault', 'secret', 'change', 'me'].join('-');
const GOOD_SECRET = 'dogfood-valid-provider-vault-secret-32chars-min';
const GOOD_SESSION_SECRET = 'dogfood-valid-session-secret-32chars-min';

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

function baseEnv(port, providerVaultSecret) {
  const env = { ...process.env, PORT: String(port), AWS_S3_BUCKET: '', SESSION_SECRET: GOOD_SESSION_SECRET };
  delete env.PROVIDER_VAULT_SECRET;
  if (providerVaultSecret !== undefined) env.PROVIDER_VAULT_SECRET = providerVaultSecret;
  return env;
}

function startBackend(port, providerVaultSecret, autoExitMs = 0) {
  const args = autoExitMs > 0
    ? ['--no-deprecation', '-e', `require('./backend/server.js'); setTimeout(() => process.exit(0), ${autoExitMs});`]
    : ['--no-deprecation', 'backend/server.js'];
  const child = spawn(process.execPath, args, {
    cwd: process.cwd(),
    env: baseEnv(port, providerVaultSecret),
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

async function assertFailsClosed(label, providerVaultSecret, expectedError, offset) {
  const { child, getOutput } = startBackend(PORT_BASE + offset, providerVaultSecret);
  const result = await waitForExit(child);
  const output = getOutput();
  assert(result.exited && result.code !== 0, `${label}: backend exits non-zero before serving`);
  assert(output.includes(expectedError), `${label}: stderr names ${expectedError}`);
  assert(!output.includes(PUBLIC_FALLBACK), `${label}: stderr never prints the public fallback value`);
}

await assertFailsClosed('missing PROVIDER_VAULT_SECRET', undefined, 'PROVIDER_VAULT_SECRET_REQUIRED', 1);
await assertFailsClosed('public fallback PROVIDER_VAULT_SECRET', PUBLIC_FALLBACK, 'PROVIDER_VAULT_SECRET_INSECURE_PUBLIC_FALLBACK', 2);
await assertFailsClosed('short PROVIDER_VAULT_SECRET', 'short-secret', 'PROVIDER_VAULT_SECRET_TOO_SHORT', 3);

const goodPort = PORT_BASE + 4;
const good = startBackend(goodPort, GOOD_SECRET, 1500);
const up = await waitForHealth(goodPort);
assert(up, 'strong explicit PROVIDER_VAULT_SECRET lets backend start and serve /api/health');
await waitForExit(good.child, 5000);

console.log(`\ndogfood-provider-vault-secret-failclosed: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
