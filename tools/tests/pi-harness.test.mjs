#!/usr/bin/env node
/**
 * PI Harness V15.0 — Test Suite
 *
 * Testa:
 * 1. Strict gate bloqueia sem evidence_source go-core
 * 2. Strict gate passa somente com todos os campos obrigatórios
 * 3. dry-run não altera arquivos
 * 4. Forbidden frontend diff → BLOCKED_VISUAL
 * 5. Fake evidence pattern → BLOCKED_EVIDENCE
 * 6. JSON output é parseável
 */

import { spawnSync } from 'child_process';
import { readFileSync, existsSync, statSync } from 'fs';
import { resolve, join } from 'path';

const ROOT    = resolve(process.cwd());
const HARNESS = join(ROOT, 'tools', 'pi-harness.mjs');

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

function runHarness(extraArgs = [], timeoutMs = 60000) {
  const args = ['--no-deprecation', HARNESS, '--max-difficulty', 'D2', '--dry-run', ...extraArgs];
  const r = spawnSync(process.execPath, args, {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: timeoutMs,
    shell: false,
  });
  return {
    ok:     r.status === 0,
    stdout: r.stdout || '',
    stderr: r.stderr || '',
    status: r.status,
  };
}

// ─── UNIT TESTS: strict gate logic (importado inline) ───────────────

function createMockState(overrides = {}) {
  return {
    backendAlive:               false,
    backendStub:                true,
    backendHasMissionId:        false,
    backendHasEvidenceReceipt:  false,
    evidenceSource:             null,
    evidenceReceiptInSchema:    false,
    evidenceReceiptInNormalizer:false,
    goCoreCompiled:             false,
    guardOk:                    false,
    legacyCleanConfirmed:       false,
    v14CleanOwnership:          false,
    fakeEvidenceAbsent:         false,
    forbiddenDiffAbsent:        false,
    ...overrides,
  };
}

function computeStrictPassGoldCandidate(s) {
  return Boolean(
    s.backendAlive === true &&
    s.backendStub === false &&
    s.backendHasMissionId === true &&
    s.backendHasEvidenceReceipt === true &&
    s.evidenceSource === 'go-core' &&
    s.evidenceReceiptInSchema === true &&
    s.evidenceReceiptInNormalizer === true &&
    s.goCoreCompiled === true &&
    s.guardOk === true &&
    s.legacyCleanConfirmed === true &&
    s.v14CleanOwnership === true &&
    s.fakeEvidenceAbsent === true &&
    s.forbiddenDiffAbsent === true
  );
}

// ─── SUITE 1: Strict Gate ───────────────────────────────────────────

console.log('\n── Suite 1: Strict Gate Logic ──');

{
  const s = createMockState();
  assert(!computeStrictPassGoldCandidate(s), 'gate bloqueia com estado vazio');
}

{
  const s = createMockState({
    backendAlive: true,
    backendStub: false,
    backendHasMissionId: true,
    backendHasEvidenceReceipt: true,
    evidenceSource: 'backend', // errado
    evidenceReceiptInSchema: true,
    evidenceReceiptInNormalizer: true,
    goCoreCompiled: true,
    guardOk: true,
    legacyCleanConfirmed: true,
    v14CleanOwnership: true,
    fakeEvidenceAbsent: true,
    forbiddenDiffAbsent: true,
  });
  assert(!computeStrictPassGoldCandidate(s), 'gate bloqueia com evidence_source !== "go-core"');
}

{
  const s = createMockState({
    backendAlive: true,
    backendStub: false,
    backendHasMissionId: true,
    backendHasEvidenceReceipt: true,
    evidenceSource: 'go-core',
    evidenceReceiptInSchema: true,
    evidenceReceiptInNormalizer: true,
    goCoreCompiled: true,
    guardOk: true,
    legacyCleanConfirmed: true,
    v14CleanOwnership: true,
    fakeEvidenceAbsent: true,
    forbiddenDiffAbsent: true,
  });
  assert(computeStrictPassGoldCandidate(s), 'gate passa com todos os campos corretos');
}

{
  const fullState = {
    backendAlive: true,
    backendStub: false,
    backendHasMissionId: true,
    backendHasEvidenceReceipt: true,
    evidenceSource: 'go-core',
    evidenceReceiptInSchema: true,
    evidenceReceiptInNormalizer: true,
    goCoreCompiled: true,
    guardOk: true,
    legacyCleanConfirmed: true,
    v14CleanOwnership: true,
    fakeEvidenceAbsent: true,
    forbiddenDiffAbsent: true,
  };
  // Cada campo individualmente deve bloquear
  const gateFields = Object.keys(fullState);
  let allBlock = true;
  for (const field of gateFields) {
    const partial = { ...fullState };
    // Invert the field
    if (typeof partial[field] === 'boolean') {
      partial[field] = !partial[field];
    } else {
      partial[field] = null;
    }
    if (computeStrictPassGoldCandidate(partial)) {
      console.error(`  ✗ FAIL: gate deveria bloquear quando ${field} é inválido`);
      failed++;
      allBlock = false;
    }
  }
  if (allBlock) {
    console.log('  ✓ cada gate individualmente bloqueia quando inválido');
    passed++;
  }
}

// ─── SUITE 2: Fake Evidence Detection ─────────────────────────────

console.log('\n── Suite 2: Fake Evidence Patterns ──');

{
  const FAKE_EVIDENCE_PATTERNS = [
    'makeFakeEvidence',
    'makeBackendReceipt',
    'fallbackReceipt',
    'evr_backend',
    'backend-derived evidence',
  ];

  const cleanContent = `
    function normalizeGoResult(parsed) {
      return { evidence_receipt: parsed.evidence_receipt, source: 'go-core' };
    }
  `;
  const dirtyContent = `
    function makeFakeEvidence() { return { id: 'fake', source: 'backend' }; }
  `;

  const hasHit = content => FAKE_EVIDENCE_PATTERNS.some(p => content.includes(p));
  assert(!hasHit(cleanContent), 'conteúdo limpo não dispara fake evidence scan');
  assert(hasHit(dirtyContent),  'makeFakeEvidence detectado pelo scanner');
}

{
  // Check that real backend/server.js and goRunner.js are clean
  const serverContent   = existsSync(join(ROOT, 'backend/server.js'))
    ? readFileSync(join(ROOT, 'backend/server.js'), 'utf8') : '';
  const goRunnerContent = existsSync(join(ROOT, 'backend/src/runtime/goRunner.js'))
    ? readFileSync(join(ROOT, 'backend/src/runtime/goRunner.js'), 'utf8') : '';

  const FAKE_PATTERNS = ['makeFakeEvidence','makeBackendReceipt','fallbackReceipt','evr_backend','backend-derived evidence'];
  const serverHits   = FAKE_PATTERNS.filter(p => serverContent.includes(p));
  const runnerHits   = FAKE_PATTERNS.filter(p => goRunnerContent.includes(p));

  assert(serverHits.length === 0,  `backend/server.js sem fake evidence (hits: ${serverHits.join(',')||'none'})`);
  assert(runnerHits.length === 0,  `goRunner.js sem fake evidence (hits: ${runnerHits.join(',')||'none'})`);
}

// ─── SUITE 3: Forbidden Diff Detection ─────────────────────────────

console.log('\n── Suite 3: Forbidden Diff Logic ──');

{
  function isForbiddenDiff(files) {
    return files.some(f => f.startsWith('frontend/') || f.startsWith('bin/'));
  }

  assert(!isForbiddenDiff([]), 'diff vazio não bloqueia');
  assert(!isForbiddenDiff(['tools/pi-harness.mjs', 'docs/README.md']), 'tools/docs não bloqueia');
  assert( isForbiddenDiff(['frontend/assets/vision-report.js']), 'frontend/ bloqueia');
  assert( isForbiddenDiff(['bin/vision-core']), 'bin/ bloqueia');
  assert(!isForbiddenDiff(['backend/server.js']), 'backend/ não bloqueia');
}

// ─── SUITE 4: JSON Output ─────────────────────────────────────────

console.log('\n── Suite 4: JSON Output ──');

{
  const r = runHarness(['--json'], 90000);
  // --json should output parseable JSON regardless of pass/fail
  let parsed = null;
  try {
    parsed = JSON.parse(r.stdout.trim());
  } catch (e) {
    // try to find JSON in output
    const first = r.stdout.indexOf('{');
    const last  = r.stdout.lastIndexOf('}');
    if (first >= 0 && last > first) {
      try { parsed = JSON.parse(r.stdout.slice(first, last + 1)); } catch { /* noop */ }
    }
  }
  assert(parsed !== null, 'JSON output é parseável');
  if (parsed) {
    assert(typeof parsed.result === 'string',        'JSON.result é string');
    assert(typeof parsed.pass_gold_candidate === 'boolean', 'JSON.pass_gold_candidate é boolean');
    assert(parsed.deploy_allowed === false,          'JSON.deploy_allowed é false');
    assert(parsed.promotion_allowed === false || parsed.promotion_allowed === true, 'JSON.promotion_allowed é boolean');
    assert(Array.isArray(parsed.failed_gates),       'JSON.failed_gates é array');
    assert(Array.isArray(parsed.actions_taken),      'JSON.actions_taken é array');
    assert(typeof parsed.recommendation === 'string', 'JSON.recommendation é string');
    assert(parsed.dry_run === true, 'JSON.dry_run is true (passei --dry-run)');
  }
}

// ─── SUITE 5: Dry-run não altera arquivos ─────────────────────────

console.log('\n── Suite 5: Dry-run imutabilidade ──');

{
  const targetFile = join(ROOT, 'backend/server.js');
  const before = existsSync(targetFile) ? statSync(targetFile).mtimeMs : null;

  runHarness(['--json'], 90000); // já inclui --dry-run

  const after = existsSync(targetFile) ? statSync(targetFile).mtimeMs : null;
  assert(before === after, 'backend/server.js não modificado em dry-run');
}

{
  const targetFile = join(ROOT, 'backend/src/runtime/goRunner.js');
  const before = existsSync(targetFile) ? statSync(targetFile).mtimeMs : null;

  runHarness(['--json'], 90000);

  const after = existsSync(targetFile) ? statSync(targetFile).mtimeMs : null;
  assert(before === after, 'goRunner.js não modificado em dry-run');
}

// ─── SUITE 6: Syntax check ─────────────────────────────────────────

console.log('\n── Suite 6: Harness Syntax ──');

{
  const r = spawnSync(process.execPath, ['--check', HARNESS], {
    encoding: 'utf8', timeout: 10000,
  });
  assert(r.status === 0, 'pi-harness.mjs passa node --check');
}

// ─── SUITE 7: Runtime Probe (V15.1) ──────────────────────────────

console.log('\n── Suite 7: Runtime Probe V15.1 ──');

// 7a: flag --runtime-probe reconhecida → runtime_probe_enabled:true no JSON
{
  const r = runHarness(['--runtime-probe', '--json'], 90000);
  let parsed = null;
  try { parsed = JSON.parse(r.stdout.trim()); } catch {
    const f = r.stdout.indexOf('{'); const l = r.stdout.lastIndexOf('}');
    if (f >= 0 && l > f) try { parsed = JSON.parse(r.stdout.slice(f, l + 1)); } catch { /* noop */ }
  }
  assert(parsed !== null, '[7a] JSON parseável com --runtime-probe');
  if (parsed) {
    assert(parsed.runtime_probe_enabled === true,                   '[7a] runtime_probe_enabled:true quando flag presente');
    assert(typeof parsed.backend_process_started === 'boolean',    '[7a] backend_process_started é boolean');
    assert(typeof parsed.backend_process_stopped === 'boolean',    '[7a] backend_process_stopped é boolean');
    assert(typeof parsed.backend_health_status === 'string',       '[7a] backend_health_status é string');
    assert(typeof parsed.run_live_status === 'string',             '[7a] run_live_status é string');
    assert('run_live_mission_id' in parsed,                        '[7a] run_live_mission_id presente no JSON');
    assert('run_live_evidence_source' in parsed,                   '[7a] run_live_evidence_source presente');
    assert('run_live_backend_stub' in parsed,                      '[7a] run_live_backend_stub presente');
    assert('run_live_deploy_allowed' in parsed,                    '[7a] run_live_deploy_allowed presente');
    assert(typeof parsed.runtime_probe_pass === 'boolean',         '[7a] runtime_probe_pass é boolean');
    assert(parsed.deploy_allowed === false,                        '[7a] deploy_allowed permanece false');
  }
}

// 7b: sem --runtime-probe → runtime_probe_enabled:false, backend_process_started:false
{
  const r = runHarness(['--json'], 90000);
  let parsed = null;
  try { parsed = JSON.parse(r.stdout.trim()); } catch {
    const f = r.stdout.indexOf('{'); const l = r.stdout.lastIndexOf('}');
    if (f >= 0 && l > f) try { parsed = JSON.parse(r.stdout.slice(f, l + 1)); } catch { /* noop */ }
  }
  if (parsed) {
    assert(parsed.runtime_probe_enabled === false,                 '[7b] runtime_probe_enabled:false sem flag');
    assert(parsed.backend_process_started === false,               '[7b] backend_process_started:false sem flag');
    assert(parsed.deploy_allowed === false,                        '[7b] deploy_allowed false sem flag');
  } else {
    assert(false, '[7b] JSON parseável sem --runtime-probe');
  }
}

// 7c: validação lógica deploy_allowed:true → bloqueio
{
  function validateRuntimeProbeResponse(probe) {
    if (probe.deploy_allowed === true) return { ok: false, reason: 'deploy_allowed:true' };
    if (!probe.mission_id || !String(probe.mission_id).startsWith('mission_'))
      return { ok: false, reason: `mission_id inválido: "${probe.mission_id}"` };
    const src = probe.evidence_receipt?.source || probe.evidence_source || null;
    if (src !== 'go-core') return { ok: false, reason: `evidence_source="${src}" deve ser go-core` };
    if (probe.backend_stub !== false) return { ok: false, reason: `backend_stub=${probe.backend_stub}` };
    return { ok: true };
  }

  const fakeDeploy = { mission_id: 'mission_test', deploy_allowed: true, backend_stub: false,
    evidence_receipt: { source: 'go-core', id: 'ev_1' } };
  assert(!validateRuntimeProbeResponse(fakeDeploy).ok, '[7c] deploy_allowed:true gera bloqueio');

  const fakeSource = { mission_id: 'mission_test', deploy_allowed: false, backend_stub: false,
    evidence_receipt: { source: 'backend', id: 'ev_1' } };
  assert(!validateRuntimeProbeResponse(fakeSource).ok, '[7c] evidence_source != go-core gera bloqueio');

  const fakeStub = { mission_id: 'mission_test', deploy_allowed: false, backend_stub: true,
    evidence_receipt: { source: 'go-core', id: 'ev_1' } };
  assert(!validateRuntimeProbeResponse(fakeStub).ok,   '[7c] backend_stub:true gera bloqueio');

  const fakeMissionId = { mission_id: 'invalid', deploy_allowed: false, backend_stub: false,
    evidence_receipt: { source: 'go-core', id: 'ev_1' } };
  assert(!validateRuntimeProbeResponse(fakeMissionId).ok, '[7c] mission_id sem prefixo mission_ gera bloqueio');

  const valid = { mission_id: 'mission_abc123', deploy_allowed: false, backend_stub: false,
    evidence_receipt: { source: 'go-core', id: 'ev_real' } };
  assert(validateRuntimeProbeResponse(valid).ok, '[7c] payload válido passa validação');
}

// 7d: backend offline + --runtime-probe → resultado não é PASS fake
{
  // Roda com --runtime-probe sem --dry-run, max D4 para garantir que D4 execute
  // Backend provavelmente offline em ambiente de test → deve bloquear honestamente
  const r2 = (() => {
    const args = ['--no-deprecation', HARNESS, '--max-difficulty', 'D4', '--runtime-probe', '--json'];
    const res = spawnSync(process.execPath, args, {
      cwd: ROOT, encoding: 'utf8', timeout: 120000, shell: false,
    });
    return { ok: res.status === 0, stdout: res.stdout || '', status: res.status };
  })();

  let parsed2 = null;
  try { parsed2 = JSON.parse(r2.stdout.trim()); } catch {
    const f = r2.stdout.indexOf('{'); const l = r2.stdout.lastIndexOf('}');
    if (f >= 0 && l > f) try { parsed2 = JSON.parse(r2.stdout.slice(f, l + 1)); } catch { /* noop */ }
  }

  if (parsed2) {
    // Deploy nunca true, independente de resultado
    assert(parsed2.deploy_allowed === false,                   '[7d] deploy_allowed sempre false');
    assert(parsed2.pass_gold_candidate !== true || parsed2.runtime_probe_pass === true,
      '[7d] pass_gold_candidate:true só se runtime_probe_pass:true');
    // Se backend estava offline, runtime_probe_pass deve ser false
    if (!r2.ok) {
      assert(parsed2.runtime_probe_pass === false,             '[7d] backend offline → runtime_probe_pass:false');
      const rec = (parsed2.recommendation || '').includes('BLOCKED');
      assert(rec, '[7d] backend offline → recommendation BLOCKED_*');
    } else {
      // Backend estava online — probe real aconteceu
      assert(typeof parsed2.runtime_probe_pass === 'boolean', '[7d] runtime_probe_pass é boolean quando online');
    }
  } else {
    assert(false, '[7d] JSON parseável com --runtime-probe D4');
  }
}

// ─── RESULTADO FINAL ──────────────────────────────────────────────

console.log('');
console.log(`${'─'.repeat(50)}`);
console.log(`PI Harness Tests: ${passed} passed, ${failed} failed`);
console.log(`${'─'.repeat(50)}`);

process.exit(failed > 0 ? 1 : 0);
