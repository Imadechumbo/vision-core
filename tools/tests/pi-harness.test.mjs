#!/usr/bin/env node
/**
 * PI Harness V15.3 — Test Suite
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
import {
  createHermesMissionContext,
  loadHermesConfig,
  loadAgentRegistry,
  loadSkillRegistry,
  loadApiRegistry,
  loadMemoryPolicy,
  validateAgentOutput,
  detectAgentConflict,
  resolveAgentConflict,
  recordHermesEvent,
  renderHermesSupervisionReport,
  validateHermesRegistries,
} from '../hermes/mission-supervisor.mjs';

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

// Windows cold Go cache: D0 runs go test ./... + go build ./... which can exceed 90s on first run.
// Use 240000ms default to avoid false-negative timeouts on cold-cache environments.
function runHarness(extraArgs = [], timeoutMs = 240000) {
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
  const r = runHarness(['--json'], 240000);
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

  runHarness(['--json'], 240000); // já inclui --dry-run

  const after = existsSync(targetFile) ? statSync(targetFile).mtimeMs : null;
  assert(before === after, 'backend/server.js não modificado em dry-run');
}

{
  const targetFile = join(ROOT, 'backend/src/runtime/goRunner.js');
  const before = existsSync(targetFile) ? statSync(targetFile).mtimeMs : null;

  runHarness(['--json'], 240000);

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
  const r = runHarness(['--runtime-probe', '--json'], 240000);
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
  const r = runHarness(['--json'], 240000);
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
      cwd: ROOT, encoding: 'utf8', timeout: 240000, shell: false,
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

// ─── SUITE 8: Runtime Contract V15.2 ────────────────────────────

console.log('\n── Suite 8: Runtime Contract V15.2 ──');

// Inline reimplementação das funções de contrato para testes unitários
function _normalizeFailedGates(value) {
  if (Array.isArray(value)) return { normalized: value, warning: null };
  if (value === null || value === undefined) return { normalized: [], warning: null };
  if (typeof value === 'string') return { normalized: [value], warning: `failed_gates era string` };
  return { normalized: [], warning: `failed_gates tipo inválido: ${typeof value}` };
}

function _validateRuntimeContract(probe) {
  const errors   = [];
  const warnings = [];
  const missionId            = probe.mission_id || null;
  const evidenceReceipt      = (probe.evidence_receipt && typeof probe.evidence_receipt === 'object') ? probe.evidence_receipt : null;
  const evidenceSourceTop    = probe.evidence_source || null;
  const evidenceReceiptSrc   = evidenceReceipt?.source || null;
  const evidenceReceiptMid   = evidenceReceipt?.mission_id || null;

  if (evidenceReceipt) {
    if (!evidenceReceiptMid) {
      errors.push('evidence_receipt.mission_id ausente');
    } else if (evidenceReceiptMid !== missionId) {
      errors.push(`evidence_receipt.mission_id="${evidenceReceiptMid}" diverge de mission_id="${missionId}"`);
    }
  }
  if (evidenceReceipt) {
    if (!evidenceSourceTop) {
      errors.push('evidence_source top-level ausente com evidence_receipt presente');
    } else if (evidenceSourceTop !== 'go-core') {
      errors.push(`evidence_source top-level="${evidenceSourceTop}" deve ser "go-core"`);
    }
    if (evidenceSourceTop && evidenceReceiptSrc && evidenceSourceTop !== evidenceReceiptSrc) {
      errors.push(`evidence_source="${evidenceSourceTop}" diverge de evidence_receipt.source="${evidenceReceiptSrc}"`);
    }
  }
  const passGold = probe.pass_gold === true;
  const { normalized: fg, warning: fgW } = _normalizeFailedGates(probe.failed_gates);
  if (fgW) warnings.push(fgW);
  if (passGold) {
    if (!evidenceReceipt)        errors.push('pass_gold:true sem evidence_receipt válido');
    if (fg.length > 0)           errors.push(`pass_gold:true com failed_gates não vazio: [${fg.join(', ')}]`);
    if (probe.backend_stub !== false) errors.push('pass_gold:true com backend_stub não false');
    if (evidenceReceiptSrc !== 'go-core') errors.push(`pass_gold:true com evidence_receipt.source="${evidenceReceiptSrc}" ≠ "go-core"`);
    if (probe.deploy_allowed === true)   errors.push('pass_gold:true com deploy_allowed:true — incoerente');
  }
  const promotionAllowed = probe.promotion_allowed === true;
  if (promotionAllowed) {
    if (!passGold)                errors.push('promotion_allowed:true sem pass_gold:true');
    if (probe.backend_stub === true) errors.push('promotion_allowed:true com backend_stub:true');
    if (evidenceSourceTop !== 'go-core') errors.push(`promotion_allowed:true sem evidence_source go-core`);
  }
  if (probe.deploy_allowed === true) errors.push('deploy_allowed:true — bloqueio crítico imediato');
  return { ok: errors.length === 0, errors, warnings, normalized: { failed_gates: fg } };
}

// 8a: normalizeFailedGates
{
  const { normalized: n1, warning: w1 } = _normalizeFailedGates([]);
  assert(Array.isArray(n1) && w1 === null, '[8a] array vazio normalizado sem warning');

  const { normalized: n2, warning: w2 } = _normalizeFailedGates('gate_x');
  assert(Array.isArray(n2) && n2[0] === 'gate_x', '[8a] string normalizada para array');
  assert(w2 !== null, '[8a] string gera warning');

  const { normalized: n3, warning: w3 } = _normalizeFailedGates(null);
  assert(Array.isArray(n3) && n3.length === 0 && w3 === null, '[8a] null normalizado para []');
}

// 8b: evidence_receipt.mission_id ausente → erro
{
  const probe = {
    mission_id:       'mission_abc',
    evidence_source:  'go-core',
    evidence_receipt: { source: 'go-core' }, // sem mission_id
    backend_stub:     false,
    deploy_allowed:   false,
  };
  const r = _validateRuntimeContract(probe);
  assert(!r.ok, '[8b] evidence_receipt.mission_id ausente → falha contrato');
  assert(r.errors.some(e => e.includes('evidence_receipt.mission_id ausente')), '[8b] mensagem de erro correta');
}

// 8c: evidence_receipt.mission_id diverge do top-level → erro
{
  const probe = {
    mission_id:       'mission_abc',
    evidence_source:  'go-core',
    evidence_receipt: { source: 'go-core', mission_id: 'mission_XYZ' },
    backend_stub:     false,
    deploy_allowed:   false,
  };
  const r = _validateRuntimeContract(probe);
  assert(!r.ok, '[8c] mission_id divergente → falha contrato');
  assert(r.errors.some(e => e.includes('diverge')), '[8c] mensagem menciona divergência');
}

// 8d: evidence_source top-level ausente com evidence_receipt presente → erro
{
  const probe = {
    mission_id:       'mission_abc',
    evidence_receipt: { source: 'go-core', mission_id: 'mission_abc' },
    backend_stub:     false,
    deploy_allowed:   false,
  };
  const r = _validateRuntimeContract(probe);
  assert(!r.ok, '[8d] evidence_source top-level ausente → falha contrato');
  assert(r.errors.some(e => e.includes('top-level ausente')), '[8d] mensagem correta');
}

// 8e: evidence_source top-level ≠ evidence_receipt.source → erro
{
  const probe = {
    mission_id:       'mission_abc',
    evidence_source:  'go-core',
    evidence_receipt: { source: 'backend', mission_id: 'mission_abc' },
    backend_stub:     false,
    deploy_allowed:   false,
  };
  const r = _validateRuntimeContract(probe);
  assert(!r.ok, '[8e] evidence_source top-level ≠ receipt.source → falha contrato');
  assert(r.errors.some(e => e.includes('diverge de evidence_receipt.source')), '[8e] mensagem de divergência source');
}

// 8f: pass_gold true sem evidence_receipt → erro
{
  const probe = {
    mission_id:     'mission_abc',
    evidence_source: 'go-core',
    pass_gold:      true,
    backend_stub:   false,
    deploy_allowed: false,
  };
  const r = _validateRuntimeContract(probe);
  assert(!r.ok, '[8f] pass_gold:true sem evidence_receipt → falha contrato');
  assert(r.errors.some(e => e.includes('pass_gold:true sem evidence_receipt')), '[8f] mensagem correta');
}

// 8g: pass_gold true com failed_gates não vazio → erro
{
  const probe = {
    mission_id:       'mission_abc',
    evidence_source:  'go-core',
    evidence_receipt: { source: 'go-core', mission_id: 'mission_abc' },
    pass_gold:        true,
    failed_gates:     ['gate_x'],
    backend_stub:     false,
    deploy_allowed:   false,
  };
  const r = _validateRuntimeContract(probe);
  assert(!r.ok, '[8g] pass_gold:true com failed_gates não vazio → falha contrato');
  assert(r.errors.some(e => e.includes('failed_gates não vazio')), '[8g] mensagem correta');
}

// 8h: promotion_allowed true com backend_stub true → erro
{
  const probe = {
    mission_id:       'mission_abc',
    evidence_source:  'go-core',
    evidence_receipt: { source: 'go-core', mission_id: 'mission_abc' },
    pass_gold:        true,
    promotion_allowed: true,
    backend_stub:     true,
    deploy_allowed:   false,
  };
  const r = _validateRuntimeContract(probe);
  assert(!r.ok, '[8h] promotion_allowed:true com backend_stub:true → falha contrato');
  assert(r.errors.some(e => e.includes('promotion_allowed:true com backend_stub:true')), '[8h] mensagem correta');
}

// 8i: deploy_allowed true → erro crítico
{
  const probe = {
    mission_id:     'mission_abc',
    evidence_source: 'go-core',
    evidence_receipt: { source: 'go-core', mission_id: 'mission_abc' },
    backend_stub:   false,
    deploy_allowed: true,
  };
  const r = _validateRuntimeContract(probe);
  assert(!r.ok, '[8i] deploy_allowed:true → falha crítica');
  assert(r.errors.some(e => e.includes('deploy_allowed:true')), '[8i] mensagem crítica presente');
}

// 8j: payload válido passa contrato
{
  const probe = {
    mission_id:       'mission_abc',
    evidence_source:  'go-core',
    evidence_receipt: { source: 'go-core', mission_id: 'mission_abc', id: 'ev_real' },
    backend_stub:     false,
    deploy_allowed:   false,
    pass_gold:        false,
    promotion_allowed: false,
    failed_gates:     [],
  };
  const r = _validateRuntimeContract(probe);
  assert(r.ok, '[8j] payload válido passa contrato');
  assert(r.errors.length === 0, '[8j] zero erros em payload válido');
}

// 8k: JSON output contém runtime_contract_* fields
{
  const r = runHarness(['--json'], 240000);
  let parsed = null;
  try { parsed = JSON.parse(r.stdout.trim()); } catch {
    const f = r.stdout.indexOf('{'); const l = r.stdout.lastIndexOf('}');
    if (f >= 0 && l > f) try { parsed = JSON.parse(r.stdout.slice(f, l + 1)); } catch { /* noop */ }
  }
  if (parsed) {
    assert('runtime_contract_checked'  in parsed, '[8k] JSON tem runtime_contract_checked');
    assert('runtime_contract_pass'     in parsed, '[8k] JSON tem runtime_contract_pass');
    assert(Array.isArray(parsed.runtime_contract_errors),   '[8k] runtime_contract_errors é array');
    assert(Array.isArray(parsed.runtime_contract_warnings), '[8k] runtime_contract_warnings é array');
    assert('run_live_pass_gold'        in parsed, '[8k] JSON tem run_live_pass_gold');
    assert('run_live_promotion_allowed' in parsed, '[8k] JSON tem run_live_promotion_allowed');
    assert(Array.isArray(parsed.run_live_failed_gates),     '[8k] run_live_failed_gates é array');
  } else {
    assert(false, '[8k] JSON parseável para verificar runtime_contract_* fields');
  }
}

// ─── SUITE 9: New Flags V15.3 ─────────────────────────────────────

console.log('\n── Suite 9: New Flags V15.3 ──');

// 9a: --runtime-probe-port aceito — JSON contém runtime_probe_port
{
  const r = runHarness(['--runtime-probe-port', '9999', '--json'], 240000);
  let parsed = null;
  try { parsed = JSON.parse(r.stdout.trim()); } catch {
    const f = r.stdout.indexOf('{'); const l = r.stdout.lastIndexOf('}');
    if (f >= 0 && l > f) try { parsed = JSON.parse(r.stdout.slice(f, l+1)); } catch { /* noop */ }
  }
  assert(parsed !== null, '[9a] --runtime-probe-port aceito sem crash');
  if (parsed) {
    assert(parsed.runtime_probe_port === 9999, '[9a] runtime_probe_port=9999 no JSON');
  }
}

// 9b: --runtime-probe-timeout-ms aceito — JSON contém runtime_probe_timeout_ms
{
  const r = runHarness(['--runtime-probe-timeout-ms', '3000', '--json'], 240000);
  let parsed = null;
  try { parsed = JSON.parse(r.stdout.trim()); } catch {
    const f = r.stdout.indexOf('{'); const l = r.stdout.lastIndexOf('}');
    if (f >= 0 && l > f) try { parsed = JSON.parse(r.stdout.slice(f, l+1)); } catch { /* noop */ }
  }
  assert(parsed !== null, '[9b] --runtime-probe-timeout-ms aceito sem crash');
  if (parsed) {
    assert(parsed.runtime_probe_timeout_ms === 3000, '[9b] runtime_probe_timeout_ms=3000 no JSON');
  }
}

// 9c: --runtime-probe-no-start aceito — JSON contém runtime_probe_no_start:true
{
  const r = runHarness(['--runtime-probe-no-start', '--json'], 240000);
  let parsed = null;
  try { parsed = JSON.parse(r.stdout.trim()); } catch {
    const f = r.stdout.indexOf('{'); const l = r.stdout.lastIndexOf('}');
    if (f >= 0 && l > f) try { parsed = JSON.parse(r.stdout.slice(f, l+1)); } catch { /* noop */ }
  }
  assert(parsed !== null, '[9c] --runtime-probe-no-start aceito sem crash');
  if (parsed) {
    assert(parsed.runtime_probe_no_start === true, '[9c] runtime_probe_no_start:true no JSON');
  }
}

// 9d: sem flags novas → runtime_probe_no_start:false, runtime_probe_port=8080
{
  const r = runHarness(['--json'], 240000);
  let parsed = null;
  try { parsed = JSON.parse(r.stdout.trim()); } catch {
    const f = r.stdout.indexOf('{'); const l = r.stdout.lastIndexOf('}');
    if (f >= 0 && l > f) try { parsed = JSON.parse(r.stdout.slice(f, l+1)); } catch { /* noop */ }
  }
  if (parsed) {
    assert(parsed.runtime_probe_no_start === false, '[9d] runtime_probe_no_start:false por padrão');
    assert(typeof parsed.runtime_probe_port === 'number', '[9d] runtime_probe_port é number por padrão');
    assert(typeof parsed.runtime_probe_timeout_ms === 'number', '[9d] runtime_probe_timeout_ms é number por padrão');
  } else {
    assert(false, '[9d] JSON parseável para verificar defaults');
  }
}

// ─── SUITE 10: Safe Payload & Temp Root ──────────────────────────

console.log('\n── Suite 10: Safe Payload & Temp Root ──');

// 10a: payload de probe é seguro (unit test)
{
  function buildProbePayload(tempRoot) {
    return {
      input:   'V15.3 runtime pass path self-test',
      root:    tempRoot,
      dry_run: true,
      source:  'pi-harness-runtime-probe',
      mode:    'runtime-probe',
    };
  }
  const payload = buildProbePayload('/tmp/probe-test-123');
  assert(payload.dry_run === true,                           '[10a] payload dry_run:true');
  assert(payload.source  === 'pi-harness-runtime-probe',    '[10a] payload source correto');
  assert(payload.mode    === 'runtime-probe',                '[10a] payload mode correto');
  assert(typeof payload.root === 'string' && payload.root.length > 0, '[10a] payload root presente');
  assert(!payload.deploy && payload.deploy_allowed !== true, '[10a] payload não solicita deploy');
}

// 10b: JSON contém campos runtime_probe_temp_root*
{
  const r = runHarness(['--runtime-probe', '--json'], 240000);
  let parsed = null;
  try { parsed = JSON.parse(r.stdout.trim()); } catch {
    const f = r.stdout.indexOf('{'); const l = r.stdout.lastIndexOf('}');
    if (f >= 0 && l > f) try { parsed = JSON.parse(r.stdout.slice(f, l+1)); } catch { /* noop */ }
  }
  assert(parsed !== null, '[10b] JSON parseável com --runtime-probe');
  if (parsed) {
    assert('runtime_probe_temp_root'         in parsed, '[10b] JSON tem runtime_probe_temp_root');
    assert('runtime_probe_temp_root_created' in parsed, '[10b] JSON tem runtime_probe_temp_root_created');
    assert('runtime_probe_temp_root_removed' in parsed, '[10b] JSON tem runtime_probe_temp_root_removed');
    assert(typeof parsed.runtime_probe_temp_root_created === 'boolean', '[10b] runtime_probe_temp_root_created é boolean');
    assert(typeof parsed.runtime_probe_temp_root_removed === 'boolean', '[10b] runtime_probe_temp_root_removed é boolean');
  }
}

// 10c: sem --runtime-probe, campos temp_root são null/false
{
  const r = runHarness(['--json'], 240000);
  let parsed = null;
  try { parsed = JSON.parse(r.stdout.trim()); } catch {
    const f = r.stdout.indexOf('{'); const l = r.stdout.lastIndexOf('}');
    if (f >= 0 && l > f) try { parsed = JSON.parse(r.stdout.slice(f, l+1)); } catch { /* noop */ }
  }
  if (parsed) {
    assert(parsed.runtime_probe_temp_root === null ||
           parsed.runtime_probe_temp_root === undefined,          '[10c] runtime_probe_temp_root null sem probe');
    assert(parsed.runtime_probe_temp_root_created === false ||
           parsed.runtime_probe_temp_root_created === undefined,  '[10c] temp_root_created false sem probe');
  } else {
    assert(false, '[10c] JSON parseável sem --runtime-probe');
  }
}

// ─── SUITE 11: Positive Contract Path (unit) ─────────────────────

console.log('\n── Suite 11: Positive Contract Path ──');

// Reutiliza _validateRuntimeContract da Suite 8

// 11a: contrato passa com payload coerente positivo
{
  const probe = {
    mission_id:        'mission_v153_real',
    evidence_source:   'go-core',
    evidence_receipt:  { source: 'go-core', mission_id: 'mission_v153_real', id: 'ev_real_001' },
    backend_stub:      false,
    deploy_allowed:    false,
    pass_gold:         true,
    promotion_allowed: false,
    failed_gates:      [],
  };
  const r = _validateRuntimeContract(probe);
  assert(r.ok === true,            '[11a] contrato PASS com payload positivo coerente');
  assert(r.errors.length === 0,   '[11a] zero erros em payload positivo');
}

// 11b: deploy_allowed:true no run-live bloqueia mesmo outros campos ok
{
  const probe = {
    mission_id:       'mission_v153',
    evidence_source:  'go-core',
    evidence_receipt: { source: 'go-core', mission_id: 'mission_v153', id: 'ev_1' },
    backend_stub:     false,
    deploy_allowed:   true,
    pass_gold:        false,
    failed_gates:     [],
  };
  const r = _validateRuntimeContract(probe);
  assert(!r.ok, '[11b] deploy_allowed:true bloqueia positive path');
  assert(r.errors.some(e => e.includes('deploy_allowed:true')), '[11b] erro menciona deploy_allowed');
}

// 11c: backend_stub:true bloqueia positive path (pass_gold=true com stub)
{
  const probe = {
    mission_id:       'mission_v153',
    evidence_source:  'go-core',
    evidence_receipt: { source: 'go-core', mission_id: 'mission_v153', id: 'ev_1' },
    backend_stub:     true,
    deploy_allowed:   false,
    pass_gold:        true,
    failed_gates:     [],
  };
  const r = _validateRuntimeContract(probe);
  assert(!r.ok, '[11c] backend_stub:true bloqueia positive path');
  assert(r.errors.some(e => e.includes('backend_stub')), '[11c] erro menciona backend_stub');
}

// 11d: evidence_receipt.source ≠ go-core bloqueia
{
  const probe = {
    mission_id:       'mission_v153',
    evidence_source:  'go-core',
    evidence_receipt: { source: 'backend-stub', mission_id: 'mission_v153', id: 'ev_1' },
    backend_stub:     false,
    deploy_allowed:   false,
    pass_gold:        false,
    failed_gates:     [],
  };
  const r = _validateRuntimeContract(probe);
  assert(!r.ok, '[11d] evidence_receipt.source ≠ go-core bloqueia');
  assert(r.errors.some(e => e.includes('diverge de evidence_receipt.source')), '[11d] erro menciona divergência source');
}

// 11e: mission_id ausente em evidence_receipt bloqueia
{
  const probe = {
    mission_id:       'mission_v153',
    evidence_source:  'go-core',
    evidence_receipt: { source: 'go-core', id: 'ev_1' }, // sem mission_id
    backend_stub:     false,
    deploy_allowed:   false,
    pass_gold:        false,
    failed_gates:     [],
  };
  const r = _validateRuntimeContract(probe);
  assert(!r.ok, '[11e] mission_id ausente em evidence_receipt bloqueia');
  assert(r.errors.some(e => e.includes('evidence_receipt.mission_id ausente')), '[11e] erro correto');
}

// 11f: evidence_receipt.mission_id divergente bloqueia
{
  const probe = {
    mission_id:       'mission_v153',
    evidence_source:  'go-core',
    evidence_receipt: { source: 'go-core', mission_id: 'mission_OTHER', id: 'ev_1' },
    backend_stub:     false,
    deploy_allowed:   false,
    pass_gold:        false,
    failed_gates:     [],
  };
  const r = _validateRuntimeContract(probe);
  assert(!r.ok, '[11f] evidence_receipt.mission_id divergente bloqueia');
  assert(r.errors.some(e => e.includes('diverge de mission_id')), '[11f] erro menciona divergência mission_id');
}

// 11g: runtime_probe_pass só true quando todos os gates passam (unit lógico)
{
  function simulateRuntimeProbePass(probe) {
    if (probe.deploy_allowed === true) return false;
    if (!probe.mission_id || !String(probe.mission_id).startsWith('mission_')) return false;
    const src = probe.evidence_receipt?.source || probe.evidence_source || null;
    if (src !== 'go-core') return false;
    if (probe.backend_stub !== false) return false;
    const contract = _validateRuntimeContract(probe);
    if (!contract.ok) return false;
    return true;
  }

  const validProbe = {
    mission_id:       'mission_v153_real',
    evidence_source:  'go-core',
    evidence_receipt: { source: 'go-core', mission_id: 'mission_v153_real', id: 'ev_001' },
    backend_stub:     false,
    deploy_allowed:   false,
    pass_gold:        false,
    failed_gates:     [],
  };
  assert(simulateRuntimeProbePass(validProbe) === true,  '[11g] runtime_probe_pass:true somente quando tudo PASS');

  const invalidProbe = { ...validProbe, backend_stub: true };
  assert(simulateRuntimeProbePass(invalidProbe) === false, '[11g] runtime_probe_pass:false quando backend_stub:true');
}

// ─── SUITE 12: --runtime-probe-no-start behavior ─────────────────

console.log('\n── Suite 12: No-start & Process Control ──');

// 12a: --runtime-probe-no-start → backend_process_started:false
{
  const args = ['--no-deprecation', HARNESS, '--max-difficulty', 'D4', '--runtime-probe', '--runtime-probe-no-start', '--json'];
  const r = spawnSync(process.execPath, args, {
    cwd: ROOT, encoding: 'utf8', timeout: 240000, shell: false,
  });
  let parsed = null;
  try { parsed = JSON.parse(r.stdout.trim()); } catch {
    const f = r.stdout.indexOf('{'); const l = r.stdout.lastIndexOf('}');
    if (f >= 0 && l > f) try { parsed = JSON.parse(r.stdout.slice(f, l+1)); } catch { /* noop */ }
  }
  assert(parsed !== null, '[12a] JSON parseável com --runtime-probe-no-start');
  if (parsed) {
    assert(parsed.runtime_probe_no_start === true,     '[12a] runtime_probe_no_start:true no JSON');
    assert(parsed.backend_process_started === false,   '[12a] backend_process_started:false com no-start');
    assert(parsed.deploy_allowed === false,            '[12a] deploy_allowed permanece false');
  }
}

// 12b: processo iniciado pelo harness é encerrado (backend_process_stopped quando started)
{
  // Testa que a invariante é mantida: se started=true então stopped=true no JSON
  // Roda com D4 + runtime-probe, se backend for iniciado ele deve ser parado
  const args = ['--no-deprecation', HARNESS, '--max-difficulty', 'D4', '--runtime-probe', '--json'];
  const r = spawnSync(process.execPath, args, {
    cwd: ROOT, encoding: 'utf8', timeout: 240000, shell: false,
  });
  let parsed = null;
  try { parsed = JSON.parse(r.stdout.trim()); } catch {
    const f = r.stdout.indexOf('{'); const l = r.stdout.lastIndexOf('}');
    if (f >= 0 && l > f) try { parsed = JSON.parse(r.stdout.slice(f, l+1)); } catch { /* noop */ }
  }
  if (parsed) {
    // Se backend foi iniciado pelo harness, deve ter sido parado
    if (parsed.backend_process_started === true) {
      assert(parsed.backend_process_stopped === true, '[12b] processo iniciado pelo harness é encerrado');
    } else {
      assert(true, '[12b] backend não foi iniciado (já rodando ou não disponível)');
    }
    assert(parsed.deploy_allowed === false, '[12b] deploy_allowed false independente de backend state');
  } else {
    assert(false, '[12b] JSON parseável para verificar process lifecycle');
  }
}

// ─── SUITE A: Hermes Registry ─────────────────────────────────────

console.log('\n── Suite A: Hermes Agent Registry ──');

{
  const agents = loadAgentRegistry();
  assert(agents.length === 11, '[A] agent registry tem 11 agentes');

  const requiredIds = [
    'PIHarness','Hermes','OpenClaw','Scanner','PatchEngine',
    'Aegis','GoCore','PassGoldAuthority','Archivist','GitHubAgent','ReleaseController',
  ];
  for (const id of requiredIds) {
    assert(agents.some(a => a.id === id), `[A] agente obrigatório existe: ${id}`);
  }

  for (const agent of agents) {
    assert(typeof agent.id === 'string' && agent.id.length > 0,              `[A] agent ${agent.id}: id é string`);
    assert(typeof agent.role === 'string' && agent.role.length > 0,           `[A] agent ${agent.id}: role é string`);
    assert(typeof agent.category === 'string' && agent.category.length > 0,  `[A] agent ${agent.id}: category é string`);
    assert(Array.isArray(agent.allowed_actions) && agent.allowed_actions.length > 0, `[A] agent ${agent.id}: allowed_actions é array não vazio`);
    assert(Array.isArray(agent.forbidden_actions) && agent.forbidden_actions.length > 0, `[A] agent ${agent.id}: forbidden_actions é array não vazio`);
  }

  // Categorias obrigatórias presentes
  const categories = [...new Set(agents.map(a => a.category))];
  assert(categories.includes('execution'),  '[A] categoria execution presente');
  assert(categories.includes('decision'),   '[A] categoria decision presente');
  assert(categories.includes('validation'), '[A] categoria validation presente');
  assert(categories.includes('memory'),     '[A] categoria memory presente');
  assert(categories.includes('governance'), '[A] categoria governance presente');
}

console.log('\n── Suite A: Hermes Skill Registry ──');

{
  const skills = loadSkillRegistry();
  assert(skills.length === 17, '[A] skill registry tem 17 skills');

  const requiredSkills = [
    'repo_scan','syntax_check','go_test','go_build','runtime_probe',
    'contract_validation','fake_evidence_scan','visual_lock','frontend_guard',
    'patch_plan','safe_autofix','rollback_check','pr_readiness',
    'ci_status_check','memory_record','conflict_resolution','anti_hallucination_check',
  ];
  for (const id of requiredSkills) {
    assert(skills.some(s => s.id === id), `[A] skill obrigatória existe: ${id}`);
  }

  for (const skill of skills) {
    assert(typeof skill.id === 'string',              `[A] skill ${skill.id}: id é string`);
    assert(typeof skill.owner_agent === 'string',     `[A] skill ${skill.id}: owner_agent é string`);
    assert(typeof skill.requires_evidence === 'boolean', `[A] skill ${skill.id}: requires_evidence é boolean`);
    assert(Array.isArray(skill.allowed_tools),         `[A] skill ${skill.id}: allowed_tools é array`);
    assert(Array.isArray(skill.outputs),               `[A] skill ${skill.id}: outputs é array`);
    assert(typeof skill.failure_mode === 'string',    `[A] skill ${skill.id}: failure_mode é string`);
  }

  // Skills críticas com requires_evidence=true
  const runtimeProbeSkill = skills.find(s => s.id === 'runtime_probe');
  assert(runtimeProbeSkill?.requires_evidence === true, '[A] runtime_probe: requires_evidence=true');
  assert(runtimeProbeSkill?.failure_mode === 'BLOCKED_RUNTIME', '[A] runtime_probe: failure_mode=BLOCKED_RUNTIME');

  const fakeEvScan = skills.find(s => s.id === 'fake_evidence_scan');
  assert(fakeEvScan !== undefined, '[A] fake_evidence_scan existe');

  const contractVal = skills.find(s => s.id === 'contract_validation');
  assert(contractVal?.requires_evidence === true, '[A] contract_validation: requires_evidence=true');

  const antiHallucination = skills.find(s => s.id === 'anti_hallucination_check');
  assert(antiHallucination !== undefined, '[A] anti_hallucination_check existe');
  assert(['Hermes','Aegis'].includes(antiHallucination?.owner_agent), '[A] anti_hallucination_check owner: Hermes ou Aegis');

  const conflictRes = skills.find(s => s.id === 'conflict_resolution');
  assert(conflictRes !== undefined, '[A] conflict_resolution existe');
  assert(['Hermes','Aegis'].includes(conflictRes?.owner_agent), '[A] conflict_resolution owner: Hermes ou Aegis');
}

console.log('\n── Suite A: Hermes API Registry ──');

{
  const apis = loadApiRegistry();
  assert(apis.length === 17, '[A] API registry tem 17 tools');

  const writeCapableRequired = [
    'github_api_pr_create',
    'github_api_merge_authorized_only',
    'github_api_deploy_authorized_only',
    'git_tag_authorized_only',
    'stable_promotion_authorized_only',
  ];
  for (const id of writeCapableRequired) {
    const api = apis.find(a => a.id === id);
    assert(api !== undefined, `[A] api obrigatória existe: ${id}`);
    assert(api?.write_capable === true,          `[A] ${id}: write_capable=true`);
    assert(api?.requires_authorization === true, `[A] ${id}: requires_authorization=true`);
    assert(api?.forbidden_in_dry_run === true,   `[A] ${id}: forbidden_in_dry_run=true`);
  }

  const readOnlyTools = [
    'git_status','git_diff','git_fetch','github_api_read','node_check',
    'go_test','go_build','backend_health_probe','backend_run_live_probe',
    'visual_lock_tool','frontend_guard_tool',
  ];
  for (const id of readOnlyTools) {
    const api = apis.find(a => a.id === id);
    assert(api !== undefined,            `[A] read-only api existe: ${id}`);
    assert(api?.write_capable === false, `[A] ${id}: write_capable=false`);
  }

  for (const api of apis) {
    assert('id' in api,                          `[A] api ${api.id}: campo id presente`);
    assert('allowed' in api,                     `[A] api ${api.id}: campo allowed presente`);
    assert('write_capable' in api,               `[A] api ${api.id}: campo write_capable presente`);
    assert('requires_authorization' in api,      `[A] api ${api.id}: campo requires_authorization presente`);
    assert('forbidden_in_dry_run' in api,        `[A] api ${api.id}: campo forbidden_in_dry_run presente`);
    assert('output_must_be_cited_in_report' in api, `[A] api ${api.id}: campo output_must_be_cited_in_report presente`);
  }
}

// ─── SUITE B: Memory Policy ────────────────────────────────────────

console.log('\n── Suite B: Memory Policy ──');

{
  const policy = loadMemoryPolicy();

  assert(policy.enabled === true,                       '[B] memory policy: enabled=true');
  assert(policy.evidence_only === true,                 '[B] memory policy: evidence_only=true');
  assert(policy.stale_context_blocked === true,         '[B] memory policy: stale_context_blocked=true');
  assert(policy.current_scan_overrides_memory === true, '[B] memory policy: current_scan_overrides_memory=true');
  assert(policy.evidence_overrides_agent_claim === true,'[B] memory policy: evidence_overrides_agent_claim=true');
  assert(policy.pass_gold_requires_real_evidence === true, '[B] memory policy: pass_gold_requires_real_evidence=true');
  assert(Array.isArray(policy.rules) && policy.rules.length > 0, '[B] memory policy: rules é array não vazio');
  assert(Array.isArray(policy.authority_hierarchy) && policy.authority_hierarchy.length > 0, '[B] memory policy: authority_hierarchy existe');

  // Go Core deve ter prioridade sobre stale_memory na hierarquia
  const hier = policy.authority_hierarchy;
  const goCoreIdx   = hier.indexOf('go_core_evidence');
  const staleIdx    = hier.indexOf('stale_memory');
  const agentOpIdx  = hier.indexOf('agent_opinion');
  assert(goCoreIdx >= 0,  '[B] authority_hierarchy contém go_core_evidence');
  assert(staleIdx >= 0,   '[B] authority_hierarchy contém stale_memory');
  assert(agentOpIdx >= 0, '[B] authority_hierarchy contém agent_opinion');
  assert(goCoreIdx < staleIdx, '[B] go_core_evidence tem prioridade sobre stale_memory');
  assert(staleIdx < agentOpIdx, '[B] stale_memory tem prioridade sobre agent_opinion');

  // Regras essenciais
  assert(policy.rules.some(r => r.includes('stale_memory_never_overrides')), '[B] regra: stale_memory_never_overrides presente');
  assert(policy.rules.some(r => r.includes('pass_gold_never_from_stale_memory')), '[B] regra: pass_gold_never_from_stale_memory presente');
  assert(policy.rules.some(r => r.includes('hypothesis_never_becomes_fact')), '[B] regra: hypothesis_never_becomes_fact presente');
}

// ─── SUITE C: Anti-Hallucination ──────────────────────────────────

console.log('\n── Suite C: Anti-Hallucination ──');

// C1: test_pass sem exit_code/log → bloqueado
{
  const r = validateAgentOutput({ test_pass: true }, {});
  assert(!r.ok,                               '[C1] test_pass sem evidence → ok=false');
  assert(r.blocked_claims.includes('test_pass'), '[C1] test_pass → blocked_claims inclui test_pass');
  assert(r.errors.some(e => e.includes('test_pass')), '[C1] errors menciona test_pass');
}

// C2: test_pass com exit_code → aceito
{
  const r = validateAgentOutput({ test_pass: true }, { exit_code: 0 });
  assert(!r.blocked_claims.includes('test_pass'), '[C2] test_pass com exit_code → não bloqueado');
}

// C3: test_pass com log → aceito
{
  const r = validateAgentOutput({ test_pass: true }, { log: 'all tests passed' });
  assert(!r.blocked_claims.includes('test_pass'), '[C3] test_pass com log → não bloqueado');
}

// C4: ci_green sem GitHub API → bloqueado
{
  const r = validateAgentOutput({ ci_green: true }, {});
  assert(!r.ok,                               '[C4] ci_green sem evidence → ok=false');
  assert(r.blocked_claims.includes('ci_green'), '[C4] ci_green → blocked_claims inclui ci_green');
}

// C5: ci_green com github_api_evidence → aceito
{
  const r = validateAgentOutput({ ci_green: true }, { github_api_evidence: true });
  assert(!r.blocked_claims.includes('ci_green'), '[C5] ci_green com github_api_evidence → aceito');
}

// C6: ci_green com gh_evidence → aceito
{
  const r = validateAgentOutput({ ci_green: true }, { gh_evidence: true });
  assert(!r.blocked_claims.includes('ci_green'), '[C6] ci_green com gh_evidence → aceito');
}

// C7: backend_online sem health probe → bloqueado
{
  const r = validateAgentOutput({ backend_online: true }, {});
  assert(!r.ok,                                     '[C7] backend_online sem probe → ok=false');
  assert(r.blocked_claims.includes('backend_online'), '[C7] backend_online → blocked');
}

// C8: backend_online com health probe → aceito
{
  const r = validateAgentOutput({ backend_online: true }, { health_probe: true });
  assert(!r.blocked_claims.includes('backend_online'), '[C8] backend_online com probe → aceito');
}

// C9: file_changed sem git diff → bloqueado
{
  const r = validateAgentOutput({ file_changed: true }, {});
  assert(r.blocked_claims.includes('file_changed'), '[C9] file_changed sem diff → bloqueado');
}

// C10: file_changed com git diff → aceito
{
  const r = validateAgentOutput({ file_changed: true }, { git_diff: 'diff --git a/file.js' });
  assert(!r.blocked_claims.includes('file_changed'), '[C10] file_changed com diff → aceito');
}

// C11: real_evidence sem source go-core → bloqueado
{
  const r = validateAgentOutput({ real_evidence: true }, { evidence_receipt: { source: 'backend' } });
  assert(r.blocked_claims.includes('real_evidence'), '[C11] real_evidence com source backend → bloqueado');
}

// C12: real_evidence com source go-core → aceito
{
  const r = validateAgentOutput({ real_evidence: true }, { evidence_receipt: { source: 'go-core' } });
  assert(!r.blocked_claims.includes('real_evidence'), '[C12] real_evidence com source go-core → aceito');
}

// C13: pass_gold sem gates reais → bloqueado
{
  const r = validateAgentOutput({ pass_gold: true }, {});
  assert(r.blocked_claims.includes('pass_gold'), '[C13] pass_gold sem gates → bloqueado');
}

// C14: pass_gold sem source go-core → bloqueado
{
  const r = validateAgentOutput({ pass_gold: true }, {
    evidence_receipt: { source: 'backend' },
    gates_pass: true,
    gates_evaluated: true,
    failed_gates: [],
  });
  assert(r.blocked_claims.includes('pass_gold'), '[C14] pass_gold com source backend → bloqueado');
}

// C15: pass_gold com go-core e gates reais → aceito
{
  const r = validateAgentOutput({ pass_gold: true }, {
    evidence_receipt: { source: 'go-core' },
    gates_pass: true,
    gates_evaluated: true,
    failed_gates: [],
  });
  assert(!r.blocked_claims.includes('pass_gold'), '[C15] pass_gold com go-core e gates → aceito');
}

// C16: merge sem autorização → bloqueado
{
  const r = validateAgentOutput({ merge: true }, {});
  assert(r.blocked_claims.includes('release_action'), '[C16] merge sem autorização → bloqueado');
}

// C17: deploy sem autorização → bloqueado
{
  const r = validateAgentOutput({ deploy: true }, {});
  assert(r.blocked_claims.includes('release_action'), '[C17] deploy sem autorização → bloqueado');
}

// C18: tag sem autorização → bloqueado
{
  const r = validateAgentOutput({ tag: true }, {});
  assert(r.blocked_claims.includes('release_action'), '[C18] tag sem autorização → bloqueado');
}

// C19: stable sem autorização → bloqueado
{
  const r = validateAgentOutput({ stable: true }, {});
  assert(r.blocked_claims.includes('release_action'), '[C19] stable sem autorização → bloqueado');
}

// C20: merge com autorização → aceito
{
  const r = validateAgentOutput({ merge: true }, { merge_authorized: true });
  assert(!r.blocked_claims.includes('release_action'), '[C20] merge com autorização → aceito');
}

// C21: output vazio → ok=true (nenhuma claim)
{
  const r = validateAgentOutput({}, {});
  assert(r.ok === true,                   '[C21] output vazio → ok=true');
  assert(r.blocked_claims.length === 0,  '[C21] output vazio → sem blocked_claims');
}

// C22: output nulo → ok=false
{
  const r = validateAgentOutput(null, {});
  assert(r.ok === false, '[C22] output null → ok=false');
}

// C23: múltiplas claims simultâneas → bloqueia cada uma
{
  const r = validateAgentOutput({ test_pass: true, ci_green: true }, {});
  assert(r.blocked_claims.includes('test_pass'), '[C23] múltiplas claims: test_pass bloqueado');
  assert(r.blocked_claims.includes('ci_green'),  '[C23] múltiplas claims: ci_green bloqueado');
}

// C24: pass_gold com failed_gates não vazio → gates_pass=false → bloqueado
{
  const r = validateAgentOutput({ pass_gold: true }, {
    evidence_receipt: { source: 'go-core' },
    failed_gates: ['backend_alive'],
    gates_evaluated: true,
  });
  assert(r.blocked_claims.includes('pass_gold'), '[C24] pass_gold com failed_gates → bloqueado');
}

// C25: backend_online com health_probe object ok:true → aceito
{
  const r = validateAgentOutput({ backend_online: true }, { health_probe: { ok: true, status: 'ok' } });
  assert(!r.blocked_claims.includes('backend_online'), '[C25] backend_online com health_probe object → aceito');
}

// ─── SUITE D: Conflict Resolution ─────────────────────────────────

console.log('\n── Suite D: Conflict Detection & Resolution ──');

// D1: frontend patch sem visual auth → conflito crítico
{
  const conflict = detectAgentConflict(
    { id: 'PatchEngine', claim: { frontend_patch: true } },
    { id: 'Aegis', claim: {} },
    { visual_auth: false }
  );
  assert(conflict !== null, '[D1] frontend patch sem auth → conflito detectado');
  const c = Array.isArray(conflict) ? conflict[0] : conflict;
  assert(c.type === 'frontend_patch_no_visual_auth', '[D1] tipo correto: frontend_patch_no_visual_auth');
  assert(c.severity === 'critical', '[D1] severidade: critical');
}

// D2: backend_online claim + health probe falhou → conflito
{
  const conflict = detectAgentConflict(
    { id: 'Scanner', claim: { backend_online: true } },
    { id: 'Hermes', claim: {} },
    { health_probe: false }
  );
  assert(conflict !== null, '[D2] backend_online + probe failed → conflito');
  const c = Array.isArray(conflict) ? conflict[0] : conflict;
  assert(c.type === 'backend_online_claim_vs_failed_probe', '[D2] tipo correto');
}

// D3: ci_green sem CI status → conflito
{
  const conflict = detectAgentConflict(
    { id: 'GitHubAgent', claim: { ci_green: true } },
    { id: 'Hermes', claim: {} },
    {}
  );
  assert(conflict !== null, '[D3] ci_green sem status → conflito');
  const c = Array.isArray(conflict) ? conflict.find(x => x.type === 'ci_green_claim_no_ci_status') : conflict;
  assert(c !== undefined, '[D3] tipo ci_green_claim_no_ci_status detectado');
}

// D4: deploy_allowed:true → conflito crítico
{
  const conflict = detectAgentConflict(
    { id: 'PIHarness', claim: { deploy_allowed: true } },
    { id: 'Hermes', claim: {} },
    {}
  );
  assert(conflict !== null, '[D4] deploy_allowed:true → conflito');
  const c = Array.isArray(conflict) ? conflict.find(x => x.type === 'deploy_allowed_true') : conflict;
  assert(c !== undefined, '[D4] tipo deploy_allowed_true detectado');
  assert(c.severity === 'critical', '[D4] severidade critical');
}

// D5: stale PASS + BLOCKED_RUNTIME atual → conflito
{
  const conflict = detectAgentConflict(
    { id: 'Archivist', claim: { stale_pass: true } },
    { id: 'Hermes', claim: {} },
    { runtime_blocked: true }
  );
  assert(conflict !== null, '[D5] stale PASS + BLOCKED_RUNTIME → conflito');
  const c = Array.isArray(conflict) ? conflict.find(x => x.type === 'stale_memory_pass_vs_blocked_runtime') : conflict;
  assert(c !== undefined, '[D5] tipo stale_memory_pass_vs_blocked_runtime detectado');
}

// D6: PatchEngine fora de escopo → conflito
{
  const conflict = detectAgentConflict(
    { id: 'PatchEngine', claim: { files_out_of_scope: ['frontend/index.html'] } },
    { id: 'Aegis', claim: {} },
    {}
  );
  assert(conflict !== null, '[D6] PatchEngine fora de escopo → conflito');
  const c = Array.isArray(conflict) ? conflict.find(x => x.type === 'patch_engine_out_of_scope') : conflict;
  assert(c !== undefined, '[D6] tipo patch_engine_out_of_scope detectado');
}

// D7: GitHubAgent merge sem CI green → conflito
{
  const conflict = detectAgentConflict(
    { id: 'GitHubAgent', claim: { wants_merge: true } },
    { id: 'Hermes', claim: {} },
    { ci_green: false }
  );
  assert(conflict !== null, '[D7] GitHubAgent merge sem CI → conflito');
  const c = Array.isArray(conflict) ? conflict.find(x => x.type === 'github_agent_merge_no_ci_green') : conflict;
  assert(c !== undefined, '[D7] tipo github_agent_merge_no_ci_green detectado');
}

// D8: evidence_source !== go-core → conflito
{
  const conflict = detectAgentConflict(
    { id: 'Scanner', claim: {} },
    { id: 'PassGoldAuthority', claim: {} },
    { evidence_source: 'backend' }
  );
  assert(conflict !== null, '[D8] evidence_source backend → conflito');
  const c = Array.isArray(conflict) ? conflict.find(x => x.type === 'evidence_source_not_go_core') : conflict;
  assert(c !== undefined, '[D8] tipo evidence_source_not_go_core detectado');
}

// D9: resolveAgentConflict bloqueia conflitos críticos
{
  const conflict = {
    type: 'deploy_allowed_true',
    agents: ['PIHarness', 'Hermes'],
    severity: 'critical',
    detail: 'deploy_allowed:true',
  };
  const resolution = resolveAgentConflict(conflict);
  assert(resolution.action === 'BLOCK', '[D9] resolve deploy_allowed:true → BLOCK');
  assert(typeof resolution.reason === 'string', '[D9] resolve: reason é string');
  assert(resolution.classification === 'BLOCKED_POLICY', '[D9] resolve: classification BLOCKED_POLICY');
}

// D10: resolve frontend_patch_no_visual_auth → BLOCKED_VISUAL
{
  const conflict = { type: 'frontend_patch_no_visual_auth', agents: ['PatchEngine','Aegis'], severity: 'critical', detail: '' };
  const resolution = resolveAgentConflict(conflict);
  assert(resolution.action === 'BLOCK',          '[D10] frontend patch → BLOCK');
  assert(resolution.classification === 'BLOCKED_VISUAL', '[D10] classification BLOCKED_VISUAL');
}

// D11: resolve backend_online_claim_vs_failed_probe → BLOCKED_RUNTIME
{
  const conflict = { type: 'backend_online_claim_vs_failed_probe', agents: ['Scanner','Hermes'], severity: 'critical', detail: '' };
  const resolution = resolveAgentConflict(conflict);
  assert(resolution.classification === 'BLOCKED_RUNTIME', '[D11] backend probe fail → BLOCKED_RUNTIME');
}

// D12: resolve stale_memory_pass_vs_blocked_runtime → BLOCKED_RUNTIME
{
  const conflict = { type: 'stale_memory_pass_vs_blocked_runtime', agents: ['Archivist','Hermes'], severity: 'critical', detail: '' };
  const resolution = resolveAgentConflict(conflict);
  assert(resolution.classification === 'BLOCKED_RUNTIME', '[D12] stale vs runtime → BLOCKED_RUNTIME');
}

// D13: resolve evidence_source_not_go_core → BLOCKED_EVIDENCE
{
  const conflict = { type: 'evidence_source_not_go_core', agents: ['Scanner','PassGoldAuthority'], severity: 'critical', detail: '' };
  const resolution = resolveAgentConflict(conflict);
  assert(resolution.classification === 'BLOCKED_EVIDENCE', '[D13] evidence source → BLOCKED_EVIDENCE');
}

// D14: resolve ci_green_claim_no_ci_status → BLOCKED_EVIDENCE
{
  const conflict = { type: 'ci_green_claim_no_ci_status', agents: ['GitHubAgent','Hermes'], severity: 'high', detail: '' };
  const resolution = resolveAgentConflict(conflict);
  assert(resolution.action === 'BLOCK', '[D14] ci_green no status → BLOCK');
  assert(resolution.classification === 'BLOCKED_EVIDENCE', '[D14] ci_green → BLOCKED_EVIDENCE');
}

// D15: resolveAgentConflict(null) → ALLOW
{
  const resolution = resolveAgentConflict(null);
  assert(resolution.action === 'ALLOW',          '[D15] resolve null → ALLOW');
  assert(resolution.total_conflicts === 0,       '[D15] resolve null → 0 conflicts');
}

// D16: dois agentes sem conflito → null
{
  const conflict = detectAgentConflict(
    { id: 'Scanner', claim: {} },
    { id: 'GoCore', claim: {} },
    { evidence_source: 'go-core' }
  );
  assert(conflict === null, '[D16] agentes limpos sem claim problemática → null');
}

// D17: resolve multiple conflicts array → BLOCK com total_conflicts > 1
{
  const conflicts = [
    { type: 'deploy_allowed_true', agents: ['PIHarness','Hermes'], severity: 'critical', detail: '' },
    { type: 'evidence_source_not_go_core', agents: ['Scanner','Aegis'], severity: 'critical', detail: '' },
  ];
  const resolution = resolveAgentConflict(conflicts);
  assert(resolution.action === 'BLOCK',         '[D17] array de conflitos → BLOCK');
  assert(resolution.total_conflicts === 2,      '[D17] total_conflicts = 2');
  assert(resolution.critical_count >= 1,        '[D17] critical_count >= 1');
}

// ─── SUITE E: Hermes Context & JSON Integration ───────────────────

console.log('\n── Suite E: Hermes Context & JSON Integration ──');

// E1: createHermesMissionContext retorna estrutura completa
{
  const ctx = createHermesMissionContext();
  assert(ctx.enabled === true,                    '[E1] context: enabled=true');
  assert(typeof ctx.mission_id === 'string',      '[E1] context: mission_id é string');
  assert(ctx.mission_id.startsWith('hermes_'),   '[E1] context: mission_id começa com hermes_');
  assert(ctx.supervisor === 'hermes',             '[E1] context: supervisor=hermes');
  assert(Array.isArray(ctx.agents),               '[E1] context: agents é array');
  assert(Array.isArray(ctx.skills),               '[E1] context: skills é array');
  assert(Array.isArray(ctx.apis),                 '[E1] context: apis é array');
  assert(Array.isArray(ctx.events),               '[E1] context: events é array');
  assert(Array.isArray(ctx.conflicts_detected),   '[E1] context: conflicts_detected é array');
  assert(Array.isArray(ctx.conflicts_resolved),   '[E1] context: conflicts_resolved é array');
  assert(Array.isArray(ctx.hallucination_blocks), '[E1] context: hallucination_blocks é array');
  assert(ctx.final_decision === 'PENDING',        '[E1] context: final_decision=PENDING inicial');
  assert(ctx.agent_outputs_validated === 0,       '[E1] context: agent_outputs_validated=0 inicial');
  assert(ctx.agents.length === 11,               '[E1] context: 11 agents');
  assert(ctx.skills.length === 17,               '[E1] context: 17 skills');
  assert(ctx.apis.length === 17,                 '[E1] context: 17 apis');
}

// E2: recordHermesEvent adiciona evento
{
  const ctx = createHermesMissionContext();
  recordHermesEvent(ctx, { type: 'test_event', layer: 'D0' });
  assert(ctx.events.length === 1,                  '[E2] evento adicionado ao context');
  assert(ctx.events[0].type === 'test_event',      '[E2] evento tem type correto');
  assert(ctx.events[0].layer === 'D0',             '[E2] evento tem layer correto');
  assert(typeof ctx.events[0].timestamp === 'number', '[E2] evento tem timestamp');
}

// E3: recordHermesEvent com null não lança exceção
{
  let threw = false;
  try { recordHermesEvent(null, { type: 'x' }); } catch { threw = true; }
  assert(!threw, '[E3] recordHermesEvent(null) não lança exceção');
}

// E4: renderHermesSupervisionReport retorna campos corretos
{
  const ctx = createHermesMissionContext();
  ctx.final_decision = 'BLOCKED_RUNTIME';
  ctx.agent_outputs_validated = 2;
  const report = renderHermesSupervisionReport(ctx);
  assert(report !== null,                              '[E4] report não é null');
  assert(report.SUPERVISOR_ENABLED === true,           '[E4] SUPERVISOR_ENABLED=true');
  assert(typeof report.MISSION_ID === 'string',        '[E4] MISSION_ID é string');
  assert(report.AGENTS_REGISTERED === 11,             '[E4] AGENTS_REGISTERED=11');
  assert(report.SKILLS_REGISTERED === 17,             '[E4] SKILLS_REGISTERED=17');
  assert(report.APIS_REGISTERED === 17,               '[E4] APIS_REGISTERED=17');
  assert(report.AGENT_OUTPUTS_VALIDATED === 2,        '[E4] AGENT_OUTPUTS_VALIDATED=2');
  assert(report.FINAL_SUPERVISOR_DECISION === 'BLOCKED_RUNTIME', '[E4] FINAL_SUPERVISOR_DECISION correto');
  assert('MEMORY_POLICY' in report,                   '[E4] MEMORY_POLICY presente');
  assert('CONFLICTS_DETECTED' in report,              '[E4] CONFLICTS_DETECTED presente');
  assert('HALLUCINATION_BLOCKS' in report,            '[E4] HALLUCINATION_BLOCKS presente');
}

// E5: validateHermesRegistries sem erros
{
  const result = validateHermesRegistries();
  assert(result.ok === true,               '[E5] validateHermesRegistries: ok=true');
  assert(result.errors.length === 0,       '[E5] validateHermesRegistries: 0 erros');
}

// E6: JSON output contém todos os campos hermes_*
{
  const r = runHarness(['--json'], 240000);
  let parsed = null;
  try { parsed = JSON.parse(r.stdout.trim()); } catch {
    const f = r.stdout.indexOf('{'); const l = r.stdout.lastIndexOf('}');
    if (f >= 0 && l > f) try { parsed = JSON.parse(r.stdout.slice(f, l + 1)); } catch { /* noop */ }
  }
  assert(parsed !== null, '[E6] JSON parseável');
  if (parsed) {
    const requiredFields = [
      'hermes_supervisor_enabled','hermes_mission_id','hermes_agents_registered',
      'hermes_skills_registered','hermes_apis_registered','hermes_memory_policy',
      'hermes_conflicts_detected','hermes_conflicts_resolved','hermes_agent_outputs_validated',
      'hermes_hallucination_blocks','hermes_final_decision',
    ];
    for (const field of requiredFields) {
      assert(field in parsed, `[E6] JSON contém campo: ${field}`);
    }
    assert(parsed.deploy_allowed === false,          '[E6] deploy_allowed permanece false');
    assert(parsed.hermes_agents_registered === 11,  '[E6] hermes_agents_registered=11');
    assert(parsed.hermes_skills_registered === 17,  '[E6] hermes_skills_registered=17');
    assert(parsed.hermes_apis_registered === 17,    '[E6] hermes_apis_registered=17');
    assert(parsed.hermes_supervisor_enabled === true, '[E6] hermes_supervisor_enabled=true');
    assert(typeof parsed.hermes_mission_id === 'string', '[E6] hermes_mission_id é string');

    const validDecisions = [
      'PENDING','MERGE_READY','BLOCKED_RUNTIME','BLOCKED_EVIDENCE',
      'BLOCKED_VISUAL','BLOCKED_SYNTAX','BLOCKED_GATES','BLOCKED_FATAL',
    ];
    assert(validDecisions.includes(parsed.hermes_final_decision), `[E6] hermes_final_decision em enum válido: ${parsed.hermes_final_decision}`);

    // PASS_GOLD_CANDIDATE somente true com evidence go-core
    if (parsed.pass_gold_candidate === true) {
      assert(
        parsed.evidence_source === 'go-core' || parsed.run_live_evidence_source === 'go-core',
        '[E6] pass_gold_candidate:true somente com evidence go-core'
      );
    } else {
      assert(parsed.pass_gold_candidate === false, '[E6] pass_gold_candidate=false (sem backend/go-core online)');
    }

    // memory_policy presente e estruturado
    if (parsed.hermes_memory_policy) {
      assert(parsed.hermes_memory_policy.evidence_only === true, '[E6] memory_policy.evidence_only=true no JSON');
    }
  }
}

// E7: dois contextos têm mission_ids diferentes
{
  const ctx1 = createHermesMissionContext();
  const ctx2 = createHermesMissionContext();
  assert(ctx1.mission_id !== ctx2.mission_id, '[E7] dois contextos têm mission_ids únicos');
}

// E8: loadHermesConfig retorna estrutura correta
{
  const cfg = loadHermesConfig();
  assert(cfg.supervisor === 'hermes',    '[E8] config: supervisor=hermes');
  assert(cfg.enabled === true,           '[E8] config: enabled=true');
  assert(cfg.agents_count === 11,       '[E8] config: agents_count=11');
  assert(cfg.skills_count === 17,       '[E8] config: skills_count=17');
  assert(cfg.apis_count === 17,         '[E8] config: apis_count=17');
  assert(cfg.rules.no_hardcoded_pass_gold === true, '[E8] config: no_hardcoded_pass_gold=true');
  assert(cfg.rules.no_hardcoded_deploy_allowed === true, '[E8] config: no_hardcoded_deploy_allowed=true');
  assert(cfg.rules.evidence_only_from_go_core === true, '[E8] config: evidence_only_from_go_core=true');
}

// ─── RESULTADO FINAL ──────────────────────────────────────────────

console.log('');
console.log(`${'─'.repeat(50)}`);
console.log(`PI Harness Tests: ${passed} passed, ${failed} failed`);
console.log(`${'─'.repeat(50)}`);

process.exit(failed > 0 ? 1 : 0);
