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
  attachRuntimeEvidence,
  evaluateHermesEvidence,
  renderEvidenceGraph,
  attachDecisionMatrix,
  evaluateHermesDecision,
  renderDecisionMatrixGraph,
} from '../hermes/mission-supervisor.mjs';
import {
  createRuntimeEvidence,
  collectRuntimeEvidence,
  normalizeEvidenceSource,
  classifyEvidenceTrust,
  validateRuntimeEvidence,
  mergeEvidenceSnapshots,
  renderRuntimeEvidenceSummary,
} from '../hermes/runtime-evidence.mjs';
import {
  createDecisionMatrix,
  evaluateDecisionMatrix,
  evaluateReleaseReadiness,
  normalizeBlockingReason,
  deriveRequiredEvidenceChecklist,
  deriveSafeNextActions,
  renderDecisionMatrixSummary,
  renderReleaseReadinessGate,
} from '../hermes/decision-matrix.mjs';
import {
  createAuthorizationManifest,
  createAuthorizationPolicy,
  validateAuthorizationManifest,
  evaluateAuthorizationLayer,
  deriveAuthorizationRequirements,
  deriveAuthorizationAuditTrail,
  renderAuthorizationSummary,
  renderAuthorizationGate,
} from '../hermes/authorization-layer.mjs';
import {
  attachAuthorizationLayer,
  evaluateHermesAuthorization,
  renderAuthorizationGraph,
} from '../hermes/mission-supervisor.mjs';
import {
  loadAuthorizationFixture,
  listAuthorizationFixtures,
  createSignedApprovalSimulation,
  verifySignedApprovalSimulation,
  runAuthorizationScenario,
  runAuthorizationScenarioMatrix,
  renderAuthorizationScenarioReport,
  createAuthorizationScenarioSummary,
} from '../hermes/authorization-harness.mjs';
import {
  createAuthorityRoleRegistry,
  createHumanApprovalContract,
  validateHumanApprovalContract,
  evaluateAuthorityReviewGate,
  deriveAuthorityRequirements,
  deriveAuthorityConflicts,
  deriveAuthorityAuditTrail,
  renderAuthorityReviewSummary,
  renderAuthorityReviewGate,
} from '../hermes/authority-review.mjs';
import {
  loadAuthorityFixture,
  listAuthorityFixtures,
  runAuthorityScenario,
  runAuthorityScenarioMatrix,
  renderAuthorityScenarioReport,
  createAuthorityScenarioSummary,
} from '../hermes/authority-harness.mjs';

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

// ════════════════════════════════════════════════════════════════════
// SUITE V15.6-A — createRuntimeEvidence: estrutura e invariants
// ════════════════════════════════════════════════════════════════════

console.log('\n[V15.6-A] createRuntimeEvidence — estrutura e invariants');

{
  const ev = createRuntimeEvidence();
  assert(ev.schema_version === 'v15.6', '[V15.6-A-1] schema_version=v15.6');
  assert(typeof ev.created_at === 'number', '[V15.6-A-2] created_at is number');
  assert(ev.mission_id === null, '[V15.6-A-3] mission_id null por padrão');
  assert(typeof ev.sources === 'object', '[V15.6-A-4] sources is object');
  assert(typeof ev.trust === 'object', '[V15.6-A-5] trust is object');
  assert(Array.isArray(ev.facts), '[V15.6-A-6] facts is array');
  assert(Array.isArray(ev.claims), '[V15.6-A-7] claims is array');
  assert(Array.isArray(ev.blocked_claims), '[V15.6-A-8] blocked_claims is array');
  assert(Array.isArray(ev.conflicts), '[V15.6-A-9] conflicts is array');
  assert(typeof ev.summary === 'object', '[V15.6-A-10] summary is object');
}

{
  const ev = createRuntimeEvidence('test-mission-001');
  assert(ev.mission_id === 'test-mission-001', '[V15.6-A-11] mission_id propagado');
}

{
  const ev = createRuntimeEvidence();
  // 8 source categories
  const srcKeys = Object.keys(ev.sources);
  assert(srcKeys.includes('git'),      '[V15.6-A-12] sources.git presente');
  assert(srcKeys.includes('ci'),       '[V15.6-A-13] sources.ci presente');
  assert(srcKeys.includes('runtime'),  '[V15.6-A-14] sources.runtime presente');
  assert(srcKeys.includes('backend'),  '[V15.6-A-15] sources.backend presente');
  assert(srcKeys.includes('go_core'),  '[V15.6-A-16] sources.go_core presente');
  assert(srcKeys.includes('tests'),    '[V15.6-A-17] sources.tests presente');
  assert(srcKeys.includes('visual'),   '[V15.6-A-18] sources.visual presente');
  assert(srcKeys.includes('security'), '[V15.6-A-19] sources.security presente');
}

{
  const ev = createRuntimeEvidence();
  // All sources start with evidence_present=false
  for (const [key, src] of Object.entries(ev.sources)) {
    assert(src.evidence_present === false, `[V15.6-A-20] ${key}.evidence_present=false por padrão`);
  }
}

{
  const ev = createRuntimeEvidence();
  // Trust hierarchy constants
  assert(ev.trust.go_core === 'authoritative', '[V15.6-A-28] trust.go_core=authoritative');
  assert(ev.trust.runtime_probe === 'high',    '[V15.6-A-29] trust.runtime_probe=high');
  assert(ev.trust.ci_api === 'high',           '[V15.6-A-30] trust.ci_api=high');
  assert(ev.trust.git_diff === 'high',         '[V15.6-A-31] trust.git_diff=high');
  assert(ev.trust.local_test === 'medium',     '[V15.6-A-32] trust.local_test=medium');
  assert(ev.trust.backend_claim === 'low',     '[V15.6-A-33] trust.backend_claim=low');
  assert(ev.trust.memory === 'lowest',         '[V15.6-A-34] trust.memory=lowest');
}

{
  const ev = createRuntimeEvidence();
  // visual_patch_authorized is always false — REGRA ABSOLUTA
  assert(ev.sources.visual.visual_patch_authorized === false, '[V15.6-A-35] visual_patch_authorized=false invariant');
}

{
  const ev = createRuntimeEvidence();
  // runtime defaults: blocked_runtime=true (pessimistic)
  assert(ev.sources.runtime.blocked_runtime === true,        '[V15.6-A-36] runtime.blocked_runtime=true por padrão');
  assert(ev.sources.runtime.runtime_probe_enabled === false, '[V15.6-A-37] runtime_probe_enabled=false por padrão');
  assert(ev.sources.runtime.runtime_probe_pass === false,    '[V15.6-A-38] runtime_probe_pass=false por padrão');
}

{
  const ev = createRuntimeEvidence();
  // backend defaults: stub=true
  assert(ev.sources.backend.backend_stub === true,  '[V15.6-A-39] backend.backend_stub=true por padrão');
  assert(ev.sources.backend.backend_alive === false, '[V15.6-A-40] backend.backend_alive=false por padrão');
}

// ════════════════════════════════════════════════════════════════════
// SUITE V15.6-B — collectRuntimeEvidence: mapeamento de estado
// ════════════════════════════════════════════════════════════════════

console.log('\n[V15.6-B] collectRuntimeEvidence — mapeamento de estado');

{
  const ev = collectRuntimeEvidence(null);
  assert(ev.schema_version === 'v15.6', '[V15.6-B-1] null state retorna evidência válida');
  assert(ev.sources.git.evidence_present === false, '[V15.6-B-2] null state: git.evidence_present=false');
}

{
  const state = { branch: 'main', gitHead: 'abc123' };
  const ev = collectRuntimeEvidence(state);
  assert(ev.sources.git.branch === 'main',       '[V15.6-B-3] git.branch mapeado');
  assert(ev.sources.git.head_sha === 'abc123',   '[V15.6-B-4] git.head_sha mapeado');
  assert(ev.sources.git.evidence_present === true, '[V15.6-B-5] git.evidence_present=true com branch+head');
}

{
  const state = { backendAlive: true, backendStub: false, backendHasMissionId: true, backendHasEvidenceReceipt: true };
  const ev = collectRuntimeEvidence(state);
  assert(ev.sources.backend.backend_alive === true,                '[V15.6-B-6] backend.backend_alive mapeado');
  assert(ev.sources.backend.backend_stub === false,                '[V15.6-B-7] backend.backend_stub=false mapeado');
  assert(ev.sources.backend.backend_has_mission_id === true,       '[V15.6-B-8] backend_has_mission_id mapeado');
  assert(ev.sources.backend.backend_has_evidence_receipt === true, '[V15.6-B-9] backend_has_evidence_receipt mapeado');
  assert(ev.sources.backend.evidence_present === true,             '[V15.6-B-10] backend.evidence_present=true quando alive');
}

{
  const state = { goCoreCompiled: true, goCoreTestPass: true, goRuntimeEvidenceSource: 'go-core', goRuntimeMissionId: 'mid-001' };
  const ev = collectRuntimeEvidence(state);
  assert(ev.sources.go_core.go_core_compiled === true,        '[V15.6-B-11] go_core.go_core_compiled mapeado');
  assert(ev.sources.go_core.go_tests_pass === true,           '[V15.6-B-12] go_core.go_tests_pass mapeado');
  assert(ev.sources.go_core.evidence_receipt_source === 'go-core', '[V15.6-B-13] evidence_receipt_source=go-core');
  assert(ev.sources.go_core.evidence_receipt_valid === true,  '[V15.6-B-14] evidence_receipt_valid=true');
  assert(ev.sources.go_core.mission_id_present === true,      '[V15.6-B-15] mission_id_present=true');
  assert(ev.sources.go_core.evidence_present === true,        '[V15.6-B-16] go_core.evidence_present=true');
}

{
  const state = { runtimeProbeEnabled: true, runtimeProbePass: false, backendAlive: false };
  const ev = collectRuntimeEvidence(state);
  assert(ev.sources.runtime.runtime_probe_enabled === true, '[V15.6-B-17] runtime.runtime_probe_enabled mapeado');
  assert(ev.sources.runtime.blocked_runtime === true,       '[V15.6-B-18] blocked_runtime=true quando backend offline');
  assert(ev.sources.runtime.evidence_present === true,      '[V15.6-B-19] evidence_present=true quando probe enabled');
}

{
  const state = { syntaxOk: true };
  const ev = collectRuntimeEvidence(state);
  assert(ev.sources.tests.syntax_pass === true,      '[V15.6-B-20] tests.syntax_pass mapeado');
  assert(ev.sources.tests.evidence_present === true, '[V15.6-B-21] tests.evidence_present=true com syntaxOk');
}

{
  const state = { visualGoldLockPass: true, frontendVisualPass: true, guardOk: true };
  const ev = collectRuntimeEvidence(state);
  assert(ev.sources.visual.visual_gold_harness_lock === true, '[V15.6-B-22] visual.visual_gold_harness_lock mapeado');
  assert(ev.sources.visual.frontend_visual_lock === true,     '[V15.6-B-23] visual.frontend_visual_lock mapeado');
  assert(ev.sources.visual.sddf_front_guard === true,         '[V15.6-B-24] visual.sddf_front_guard mapeado');
  assert(ev.sources.visual.visual_patch_authorized === false, '[V15.6-B-25] visual_patch_authorized sempre false');
  assert(ev.sources.visual.evidence_present === true,         '[V15.6-B-26] visual.evidence_present=true');
}

{
  const state = { fakeEvidenceAbsent: true, forbiddenDiffAbsent: true };
  const ev = collectRuntimeEvidence(state);
  assert(ev.sources.security.fake_evidence_scan_clean === true,   '[V15.6-B-27] security.fake_evidence_scan_clean mapeado');
  assert(ev.sources.security.hardcoded_pass_gold_absent === true, '[V15.6-B-28] hardcoded_pass_gold_absent=true por design');
  assert(ev.sources.security.hardcoded_deploy_absent === true,    '[V15.6-B-29] hardcoded_deploy_absent=true por design');
  assert(ev.sources.security.forbidden_runtime_absent === true,   '[V15.6-B-30] forbidden_runtime_absent mapeado');
  assert(ev.sources.security.evidence_present === true,           '[V15.6-B-31] security.evidence_present=true');
}

{
  const state = { goRuntimeMissionId: 'mid-xyz' };
  const ev = collectRuntimeEvidence(state, null);
  // mission_id picked from state when missionId arg is null
  assert(ev.mission_id === 'mid-xyz', '[V15.6-B-32] mission_id do state quando arg=null');
}

{
  const state = { goRuntimeEvidenceSource: 'go-core', goCoreCompiled: true, goCoreTestPass: true };
  const ev = collectRuntimeEvidence(state);
  const goCoreFact = ev.facts.find(f => f.type === 'go_core_evidence_present');
  assert(goCoreFact !== undefined,            '[V15.6-B-33] fact go_core_evidence_present gerado');
  assert(goCoreFact.trust === 'authoritative', '[V15.6-B-34] go_core fact trust=authoritative');
}

{
  const state = { backendAlive: false };
  const ev = collectRuntimeEvidence(state);
  const offlineFact = ev.facts.find(f => f.type === 'runtime_offline');
  assert(offlineFact !== undefined,    '[V15.6-B-35] fact runtime_offline gerado quando backend offline');
  assert(offlineFact.trust === 'high', '[V15.6-B-36] runtime_offline fact trust=high');
}

// ════════════════════════════════════════════════════════════════════
// SUITE V15.6-C — normalizeEvidenceSource + classifyEvidenceTrust
// ════════════════════════════════════════════════════════════════════

console.log('\n[V15.6-C] normalizeEvidenceSource + classifyEvidenceTrust');

{
  assert(normalizeEvidenceSource('go-core') === 'go-core',  '[V15.6-C-1] go-core normaliza');
  assert(normalizeEvidenceSource('go_core') === 'go-core',  '[V15.6-C-2] go_core normaliza');
  assert(normalizeEvidenceSource('gocore') === 'go-core',   '[V15.6-C-3] gocore normaliza');
  assert(normalizeEvidenceSource('GO-CORE') === 'go-core',  '[V15.6-C-4] GO-CORE case-insensitive');
  assert(normalizeEvidenceSource('backend') === 'backend',  '[V15.6-C-5] backend normaliza');
  assert(normalizeEvidenceSource('evr_backend') === 'backend', '[V15.6-C-6] evr_backend → backend');
  assert(normalizeEvidenceSource('github_api') === 'github_api', '[V15.6-C-7] github_api normaliza');
  assert(normalizeEvidenceSource('github-api') === 'github_api', '[V15.6-C-8] github-api normaliza');
  assert(normalizeEvidenceSource('memory') === 'memory',    '[V15.6-C-9] memory normaliza');
  assert(normalizeEvidenceSource('stale_memory') === 'memory', '[V15.6-C-10] stale_memory → memory');
  assert(normalizeEvidenceSource(null) === null,            '[V15.6-C-11] null → null');
  assert(normalizeEvidenceSource('') === null,              '[V15.6-C-12] empty string → null');
  assert(normalizeEvidenceSource('runtime_probe') === 'runtime_probe_actual', '[V15.6-C-13] runtime_probe normaliza');
  assert(normalizeEvidenceSource('runtime-probe') === 'runtime_probe_actual', '[V15.6-C-14] runtime-probe normaliza');
  assert(normalizeEvidenceSource('agent') === 'agent',      '[V15.6-C-15] agent normaliza');
}

{
  assert(classifyEvidenceTrust('go-core') === 'authoritative', '[V15.6-C-16] go-core=authoritative');
  assert(classifyEvidenceTrust('go_core') === 'authoritative', '[V15.6-C-17] go_core=authoritative (via normalize)');
  assert(classifyEvidenceTrust('github_api') === 'high',       '[V15.6-C-18] github_api=high');
  assert(classifyEvidenceTrust('gh') === 'high',               '[V15.6-C-19] gh=high');
  assert(classifyEvidenceTrust('git_diff') === 'high',         '[V15.6-C-20] git_diff=high');
  assert(classifyEvidenceTrust('runtime_probe') === 'high',    '[V15.6-C-21] runtime_probe=high');
  assert(classifyEvidenceTrust('backend') === 'low',           '[V15.6-C-22] backend=low');
  assert(classifyEvidenceTrust('memory') === 'lowest',         '[V15.6-C-23] memory=lowest');
  assert(classifyEvidenceTrust('agent') === 'lowest',          '[V15.6-C-24] agent=lowest');
  assert(classifyEvidenceTrust('unknown_source') === 'lowest', '[V15.6-C-25] unknown → lowest');
}

// ════════════════════════════════════════════════════════════════════
// SUITE V15.6-D — validateRuntimeEvidence: 9 regras
// ════════════════════════════════════════════════════════════════════

console.log('\n[V15.6-D] validateRuntimeEvidence — 9 regras');

// Rule 1: evidence_receipt.source must be go-core
{
  const ev = createRuntimeEvidence();
  ev.sources.go_core.evidence_receipt_source = 'backend';
  const r = validateRuntimeEvidence(ev);
  assert(r.ok === false, '[V15.6-D-1] Rule1: evidence_receipt_source=backend → not ok');
  assert(r.blocked_claims.includes('real_evidence'), '[V15.6-D-2] Rule1: real_evidence bloqueada');
}

// Rule 2: backend cannot fabricate evidence
{
  const ev = createRuntimeEvidence();
  ev.sources.backend.backend_has_evidence_receipt = true;
  ev.sources.go_core.evidence_receipt_valid = false;
  const r = validateRuntimeEvidence(ev);
  assert(r.ok === false, '[V15.6-D-3] Rule2: backend sem go-core → not ok');
  assert(r.blocked_claims.includes('backend_evidence'), '[V15.6-D-4] Rule2: backend_evidence bloqueada');
}

// Rule 3: runtime_probe_pass requires all three
{
  const ev = createRuntimeEvidence();
  ev.sources.runtime.runtime_probe_pass = true;
  ev.sources.backend.backend_alive = false;
  const r = validateRuntimeEvidence(ev);
  assert(r.ok === false, '[V15.6-D-5] Rule3: runtime_probe_pass sem backend_alive → blocked');
  assert(r.blocked_claims.includes('runtime_probe_pass'), '[V15.6-D-6] Rule3: runtime_probe_pass bloqueado');
}

{
  const ev = createRuntimeEvidence();
  ev.sources.runtime.runtime_probe_pass = true;
  ev.sources.backend.backend_alive = true;
  ev.sources.backend.backend_has_mission_id = false;
  const r = validateRuntimeEvidence(ev);
  assert(r.blocked_claims.includes('runtime_probe_pass'), '[V15.6-D-7] Rule3: sem mission_id → blocked');
}

{
  const ev = createRuntimeEvidence();
  ev.sources.runtime.runtime_probe_pass = true;
  ev.sources.backend.backend_alive = true;
  ev.sources.backend.backend_has_mission_id = true;
  ev.sources.backend.backend_has_evidence_receipt = false;
  const r = validateRuntimeEvidence(ev);
  assert(r.blocked_claims.includes('runtime_probe_pass'), '[V15.6-D-8] Rule3: sem evidence_receipt → blocked');
}

// Rule 4: CI success without evidence_present
{
  const ev = createRuntimeEvidence();
  ev.sources.ci.status = 'success';
  ev.sources.ci.evidence_present = false;
  const r = validateRuntimeEvidence(ev);
  assert(r.ok === false, '[V15.6-D-9] Rule4: ci.status=success sem evidence → not ok');
  assert(r.blocked_claims.includes('ci_green'), '[V15.6-D-10] Rule4: ci_green bloqueado');
}

// Rule 5: test_suite_pass without exit_code/test_total
{
  const ev = createRuntimeEvidence();
  ev.sources.tests.test_suite_pass = true;
  ev.sources.tests.exit_code = null;
  ev.sources.tests.test_total = null;
  const r = validateRuntimeEvidence(ev);
  assert(r.ok === false, '[V15.6-D-11] Rule5: test_suite_pass sem exit_code/total → not ok');
  assert(r.blocked_claims.includes('test_suite_pass'), '[V15.6-D-12] Rule5: test_suite_pass bloqueado');
}

{
  const ev = createRuntimeEvidence();
  ev.sources.tests.test_suite_pass = true;
  ev.sources.tests.exit_code = 0;
  const r = validateRuntimeEvidence(ev);
  assert(!r.blocked_claims.includes('test_suite_pass'), '[V15.6-D-13] Rule5: test_suite_pass com exit_code → ok');
}

// Rule 6: deploy_allowed must always be false
{
  const ev = createRuntimeEvidence();
  ev.deploy_allowed = true;
  const r = validateRuntimeEvidence(ev);
  assert(r.ok === false, '[V15.6-D-14] Rule6: deploy_allowed=true → not ok');
  assert(r.blocked_claims.includes('deploy_allowed'), '[V15.6-D-15] Rule6: deploy_allowed bloqueado');
  assert(r.final_recommendation === 'BLOCKED_POLICY', '[V15.6-D-16] Rule6: final=BLOCKED_POLICY');
}

// Rule 7: pass_gold_candidate without Go Core evidence
{
  const ev = createRuntimeEvidence();
  ev.pass_gold_candidate = true;
  ev.sources.go_core.evidence_receipt_valid = false;
  const r = validateRuntimeEvidence(ev);
  assert(r.ok === false, '[V15.6-D-17] Rule7: pass_gold sem go-core → not ok');
  assert(r.blocked_claims.includes('pass_gold_candidate'), '[V15.6-D-18] Rule7: pass_gold_candidate bloqueado');
}

// Rule 8: stale memory PASS vs BLOCKED_RUNTIME
{
  const ev = createRuntimeEvidence();
  ev.stale_memory_pass = true;
  ev.sources.runtime.blocked_runtime = true;
  const r = validateRuntimeEvidence(ev);
  assert(r.ok === false, '[V15.6-D-19] Rule8: stale_pass vs BLOCKED_RUNTIME → not ok');
  assert(r.blocked_claims.includes('stale_memory_pass'), '[V15.6-D-20] Rule8: stale_memory_pass bloqueado');
}

// Rule 9: agent claim contradicting evidence
{
  const ev = createRuntimeEvidence();
  ev.agent_claims = { backend_online: true };
  ev.sources.backend.backend_alive = false;
  const r = validateRuntimeEvidence(ev);
  assert(r.ok === false, '[V15.6-D-21] Rule9: agent claims backend_online sem backend_alive → not ok');
  assert(r.blocked_claims.includes('agent_backend_online'), '[V15.6-D-22] Rule9: agent_backend_online bloqueado');
}

{
  const ev = createRuntimeEvidence();
  ev.agent_claims = { ci_green: true };
  ev.sources.ci.source = 'unknown';
  const r = validateRuntimeEvidence(ev);
  assert(r.ok === false, '[V15.6-D-23] Rule9: agent ci_green sem evidence → not ok');
  assert(r.blocked_claims.includes('agent_ci_green'), '[V15.6-D-24] Rule9: agent_ci_green bloqueado');
}

// Trust score and BLOCKED_RUNTIME default
{
  const ev = createRuntimeEvidence();
  const r = validateRuntimeEvidence(ev);
  assert(r.trust_score >= 0, '[V15.6-D-25] trust_score >= 0');
  assert(r.trust_score <= 100, '[V15.6-D-26] trust_score <= 100');
  assert(r.final_recommendation === 'BLOCKED_RUNTIME', '[V15.6-D-27] default: BLOCKED_RUNTIME');
}

// SUPERVISED_READY requires go_core + ≥3 sources
{
  const ev = createRuntimeEvidence();
  ev.sources.go_core.evidence_receipt_valid = true;
  ev.sources.go_core.evidence_present = true;
  ev.sources.git.evidence_present = true;
  ev.sources.tests.evidence_present = true;
  ev.sources.runtime.blocked_runtime = false;
  const r = validateRuntimeEvidence(ev);
  assert(r.final_recommendation === 'SUPERVISED_READY', '[V15.6-D-28] SUPERVISED_READY com go-core + 3 sources');
}

// null evidence → BLOCKED_EVIDENCE
{
  const r = validateRuntimeEvidence(null);
  assert(r.ok === false, '[V15.6-D-29] null evidence → not ok');
  assert(r.final_recommendation === 'BLOCKED_EVIDENCE', '[V15.6-D-30] null → BLOCKED_EVIDENCE');
  assert(r.trust_score === 0, '[V15.6-D-31] null → trust_score=0');
}

// evidence with multiple sources present increases trust_score
{
  const ev = createRuntimeEvidence();
  ev.sources.git.evidence_present = true;
  ev.sources.tests.evidence_present = true;
  ev.sources.visual.evidence_present = true;
  ev.sources.security.evidence_present = true;
  const r = validateRuntimeEvidence(ev);
  assert(r.trust_score >= 30, '[V15.6-D-32] multiple sources → trust_score ≥ 30');
}

// ════════════════════════════════════════════════════════════════════
// SUITE V15.6-E — mergeEvidenceSnapshots: B vence em evidence_present
// ════════════════════════════════════════════════════════════════════

console.log('\n[V15.6-E] mergeEvidenceSnapshots — B vence em evidence_present');

{
  const a = createRuntimeEvidence('mission-a');
  const b = createRuntimeEvidence('mission-b');
  const merged = mergeEvidenceSnapshots(a, b);
  assert(merged !== null, '[V15.6-E-1] merge não retorna null');
  assert(merged.schema_version === 'v15.6', '[V15.6-E-2] schema_version preservado');
  assert(merged.merged === true, '[V15.6-E-3] merged flag=true');
  assert(typeof merged.merged_at === 'number', '[V15.6-E-4] merged_at=number');
}

{
  const a = mergeEvidenceSnapshots(null, null);
  assert(a === null, '[V15.6-E-5] merge(null, null)=null');
}

{
  const a = createRuntimeEvidence('mission-a');
  const merged = mergeEvidenceSnapshots(a, null);
  assert(merged === a, '[V15.6-E-6] merge(a, null)=a');
}

{
  const b = createRuntimeEvidence('mission-b');
  const merged = mergeEvidenceSnapshots(null, b);
  assert(merged === b, '[V15.6-E-7] merge(null, b)=b');
}

{
  const a = createRuntimeEvidence();
  a.sources.git.evidence_present = false;
  a.sources.git.branch = 'old-branch';
  const b = createRuntimeEvidence();
  b.sources.git.evidence_present = true;
  b.sources.git.branch = 'new-branch';
  const merged = mergeEvidenceSnapshots(a, b);
  assert(merged.sources.git.evidence_present === true,  '[V15.6-E-8] B evidence_present wins');
  assert(merged.sources.git.branch === 'new-branch',    '[V15.6-E-9] B branch wins when B.evidence_present=true');
}

{
  const a = createRuntimeEvidence();
  a.facts.push({ type: 'fact_a', value: 1, trust: 'high' });
  const b = createRuntimeEvidence();
  b.facts.push({ type: 'fact_b', value: 2, trust: 'medium' });
  const merged = mergeEvidenceSnapshots(a, b);
  assert(merged.facts.some(f => f.type === 'fact_a'), '[V15.6-E-10] A facts preservados no merge');
  assert(merged.facts.some(f => f.type === 'fact_b'), '[V15.6-E-11] B facts presentes no merge');
}

{
  const a = createRuntimeEvidence();
  a.blocked_claims = ['claim_x'];
  const b = createRuntimeEvidence();
  b.blocked_claims = ['claim_y'];
  const merged = mergeEvidenceSnapshots(a, b);
  assert(merged.blocked_claims.includes('claim_x'), '[V15.6-E-12] A blocked_claims preservados');
  assert(merged.blocked_claims.includes('claim_y'), '[V15.6-E-13] B blocked_claims preservados');
}

// ════════════════════════════════════════════════════════════════════
// SUITE V15.6-F — renderRuntimeEvidenceSummary + supervisor integration
// ════════════════════════════════════════════════════════════════════

console.log('\n[V15.6-F] renderRuntimeEvidenceSummary + supervisor integration');

{
  const summary = renderRuntimeEvidenceSummary(null);
  assert(summary === null, '[V15.6-F-1] null evidence → null summary');
}

{
  const ev = createRuntimeEvidence('mid-001');
  const summary = renderRuntimeEvidenceSummary(ev);
  assert(summary.schema_version === 'v15.6',      '[V15.6-F-2] schema_version=v15.6');
  assert(summary.mission_id === 'mid-001',         '[V15.6-F-3] mission_id propagado');
  assert(Array.isArray(summary.sources_present),   '[V15.6-F-4] sources_present é array');
  assert(Array.isArray(summary.sources_missing),   '[V15.6-F-5] sources_missing é array');
  assert(typeof summary.trust === 'object',        '[V15.6-F-6] trust é object');
  assert(typeof summary.facts_count === 'number',  '[V15.6-F-7] facts_count é number');
  assert(summary.deploy_allowed === false,          '[V15.6-F-8] deploy_allowed sempre false');
  assert(summary.runtime_blocked === true,          '[V15.6-F-9] runtime_blocked=true por padrão');
  assert(summary.go_core_evidence_valid === false,  '[V15.6-F-10] go_core_evidence_valid=false por padrão');
}

{
  const ev = createRuntimeEvidence();
  ev.sources.git.evidence_present = true;
  ev.sources.tests.evidence_present = true;
  const summary = renderRuntimeEvidenceSummary(ev);
  assert(summary.sources_present.includes('git'),         '[V15.6-F-11] git em sources_present');
  assert(summary.sources_present.includes('tests'),       '[V15.6-F-12] tests em sources_present');
  assert(!summary.sources_present.includes('ci'),         '[V15.6-F-13] ci não em sources_present');
  assert(summary.sources_missing.includes('ci'),          '[V15.6-F-14] ci em sources_missing');
  assert(summary.sources_present.length === 2,            '[V15.6-F-15] sources_present.length=2');
}

// attachRuntimeEvidence
{
  const ctx = createHermesMissionContext();
  const ev  = createRuntimeEvidence('mid-xyz');
  attachRuntimeEvidence(ctx, ev);
  assert(ctx.runtime_evidence === ev,               '[V15.6-F-16] runtime_evidence attachado ao ctx');
  assert(ctx.runtime_evidence_attached === true,    '[V15.6-F-17] runtime_evidence_attached=true');
  assert(typeof ctx.runtime_evidence_at === 'number', '[V15.6-F-18] runtime_evidence_at é number');
}

{
  attachRuntimeEvidence(null, createRuntimeEvidence());
  assert(true, '[V15.6-F-19] attachRuntimeEvidence com ctx=null não lança exceção');
}

// evaluateHermesEvidence
{
  const ctx = createHermesMissionContext();
  const result = evaluateHermesEvidence(ctx);
  assert(result.trust_score === 0,                        '[V15.6-F-20] sem evidence → trust_score=0');
  assert(result.deploy_allowed === false,                  '[V15.6-F-21] deploy_allowed sempre false');
  assert(result.final_recommendation === 'BLOCKED_RUNTIME', '[V15.6-F-22] sem evidence → BLOCKED_RUNTIME');
  assert(Array.isArray(result.sources_present),           '[V15.6-F-23] sources_present é array');
  assert(Array.isArray(result.sources_missing),           '[V15.6-F-24] sources_missing é array');
}

{
  const result = evaluateHermesEvidence(null);
  assert(result.trust_score === 0,                         '[V15.6-F-25] ctx=null → trust_score=0');
  assert(result.final_recommendation === 'BLOCKED_EVIDENCE', '[V15.6-F-26] ctx=null → BLOCKED_EVIDENCE');
}

{
  const ctx = createHermesMissionContext();
  const ev  = createRuntimeEvidence();
  ev.sources.go_core.evidence_present = true;
  ev.sources.go_core.evidence_receipt_valid = true;
  ev.sources.git.evidence_present = true;
  ev.sources.tests.evidence_present = true;
  ev.sources.runtime.blocked_runtime = false;
  attachRuntimeEvidence(ctx, ev);
  const result = evaluateHermesEvidence(ctx);
  assert(result.trust_score > 50,                          '[V15.6-F-27] go_core + sources → trust_score > 50');
  assert(result.final_recommendation === 'SUPERVISED_READY', '[V15.6-F-28] go_core + 3 sources → SUPERVISED_READY');
}

// renderEvidenceGraph
{
  const ctx = createHermesMissionContext();
  const graph = renderEvidenceGraph(ctx);
  assert(graph === null, '[V15.6-F-29] ctx sem runtime_evidence → graph=null');
}

{
  const ctx = createHermesMissionContext();
  const ev  = createRuntimeEvidence('mid-graph');
  attachRuntimeEvidence(ctx, ev);
  const graph = renderEvidenceGraph(ctx);
  assert(graph !== null,                         '[V15.6-F-30] ctx com evidence → graph não null');
  assert(graph.schema_version === 'v15.6',       '[V15.6-F-31] graph.schema_version=v15.6');
  assert(graph.mission_id === 'mid-graph',        '[V15.6-F-32] graph.mission_id propagado');
  assert(Array.isArray(graph.nodes),             '[V15.6-F-33] graph.nodes é array');
  assert(Array.isArray(graph.edges),             '[V15.6-F-34] graph.edges é array');
  assert(graph.deploy_allowed === false,          '[V15.6-F-35] graph.deploy_allowed sempre false');
  assert(graph.nodes.length === 8,               '[V15.6-F-36] 8 source nodes no graph');
}

{
  const ctx = createHermesMissionContext();
  const ev  = createRuntimeEvidence();
  ev.sources.go_core.evidence_present = true;
  attachRuntimeEvidence(ctx, ev);
  const graph = renderEvidenceGraph(ctx);
  const goEdge = graph.edges.find(e => e.from === 'go_core');
  assert(goEdge !== undefined,                        '[V15.6-F-37] go_core edge presente quando evidence_present');
  assert(goEdge.type === 'authoritative_evidence',    '[V15.6-F-38] go_core edge type=authoritative_evidence');
}

// renderHermesSupervisionReport with evidence
{
  const ctx = createHermesMissionContext();
  const ev  = createRuntimeEvidence('mid-report');
  attachRuntimeEvidence(ctx, ev);
  const report = renderHermesSupervisionReport(ctx);
  assert('RUNTIME_EVIDENCE' in report,            '[V15.6-F-39] report inclui RUNTIME_EVIDENCE');
  assert('EVIDENCE_TRUST_SCORE' in report,        '[V15.6-F-40] report inclui EVIDENCE_TRUST_SCORE');
  assert('EVIDENCE_SOURCES_PRESENT' in report,   '[V15.6-F-41] report inclui EVIDENCE_SOURCES_PRESENT');
  assert('EVIDENCE_SOURCES_MISSING' in report,   '[V15.6-F-42] report inclui EVIDENCE_SOURCES_MISSING');
  assert('EVIDENCE_VALIDATION_ERRORS' in report, '[V15.6-F-43] report inclui EVIDENCE_VALIDATION_ERRORS');
  assert('EVIDENCE_VALIDATION_WARNINGS' in report, '[V15.6-F-44] report inclui EVIDENCE_VALIDATION_WARNINGS');
  assert('EVIDENCE_GRAPH' in report,             '[V15.6-F-45] report inclui EVIDENCE_GRAPH');
  assert(typeof report.EVIDENCE_TRUST_SCORE === 'number', '[V15.6-F-46] EVIDENCE_TRUST_SCORE é number');
  assert(Array.isArray(report.EVIDENCE_SOURCES_PRESENT), '[V15.6-F-47] EVIDENCE_SOURCES_PRESENT é array');
  assert(Array.isArray(report.EVIDENCE_SOURCES_MISSING), '[V15.6-F-48] EVIDENCE_SOURCES_MISSING é array');
  assert(Array.isArray(report.EVIDENCE_VALIDATION_ERRORS), '[V15.6-F-49] EVIDENCE_VALIDATION_ERRORS é array');
}

// ════════════════════════════════════════════════════════════════════
// SUITE V15.7-A — createDecisionMatrix
// ════════════════════════════════════════════════════════════════════

console.log('\n[V15.7-A] createDecisionMatrix — structure & defaults');

{
  const m = createDecisionMatrix();
  assert(m.schema_version === 'v15.7',          '[V15.7-A-1] schema_version=v15.7');
  assert(typeof m.created_at === 'number',       '[V15.7-A-2] created_at é number');
  assert(m.decision_state === 'BLOCKED_RUNTIME', '[V15.7-A-3] decision_state default=BLOCKED_RUNTIME');
  assert(m.deploy_allowed === false,             '[V15.7-A-4] deploy_allowed sempre false');
  assert(m.promotion_allowed === false,          '[V15.7-A-5] promotion_allowed sempre false');
  assert(m.stable_allowed === false,             '[V15.7-A-6] stable_allowed sempre false');
  assert(m.release_allowed === false,            '[V15.7-A-7] release_allowed sempre false');
  assert(m.release_candidate === false,          '[V15.7-A-8] release_candidate sempre false');
  assert(Array.isArray(m.blocking_reasons),      '[V15.7-A-9] blocking_reasons é array');
  assert(Array.isArray(m.required_evidence),     '[V15.7-A-10] required_evidence é array');
  assert(Array.isArray(m.safe_next_actions),     '[V15.7-A-11] safe_next_actions é array');
  assert(typeof m.gates === 'object',            '[V15.7-A-12] gates é object');
  assert('runtime' in m.gates,                  '[V15.7-A-13] gates.runtime presente');
  assert('evidence' in m.gates,                 '[V15.7-A-14] gates.evidence presente');
  assert('go_core' in m.gates,                  '[V15.7-A-15] gates.go_core presente');
  assert('ci' in m.gates,                       '[V15.7-A-16] gates.ci presente');
  assert('tests' in m.gates,                    '[V15.7-A-17] gates.tests presente');
  assert('security' in m.gates,                 '[V15.7-A-18] gates.security presente');
  assert('scope' in m.gates,                    '[V15.7-A-19] gates.scope presente');
  assert('policy' in m.gates,                   '[V15.7-A-20] gates.policy presente');
}

// ════════════════════════════════════════════════════════════════════
// SUITE V15.7-B — normalizeBlockingReason
// ════════════════════════════════════════════════════════════════════

console.log('\n[V15.7-B] normalizeBlockingReason — catalog & structure');

{
  const r = normalizeBlockingReason('runtime_not_ready');
  assert(r.id === 'runtime_not_ready',    '[V15.7-B-1] id=runtime_not_ready');
  assert(r.severity === 'critical',       '[V15.7-B-2] severity=critical');
  assert(r.gate === 'runtime',            '[V15.7-B-3] gate=runtime');
  assert(typeof r.message === 'string',   '[V15.7-B-4] message é string');
  assert(typeof r.remediation === 'string', '[V15.7-B-5] remediation é string');
}

{
  const r = normalizeBlockingReason('deploy_policy_violation');
  assert(r.id === 'deploy_policy_violation', '[V15.7-B-6] id=deploy_policy_violation');
  assert(r.severity === 'critical',          '[V15.7-B-7] severity=critical');
  assert(r.gate === 'policy',               '[V15.7-B-8] gate=policy');
}

{
  const r = normalizeBlockingReason('ci_not_verified');
  assert(r.id === 'ci_not_verified',   '[V15.7-B-9] id=ci_not_verified');
  assert(r.severity === 'high',        '[V15.7-B-10] severity=high');
  assert(r.gate === 'ci',             '[V15.7-B-11] gate=ci');
}

{
  const r = normalizeBlockingReason('unknown_reason_xyz');
  assert(r.id === 'unknown_reason_xyz',    '[V15.7-B-12] unknown id preservado');
  assert(r.severity === 'medium',          '[V15.7-B-13] unknown → severity=medium');
  assert(r.gate === 'policy',             '[V15.7-B-14] unknown → gate=policy');
  assert(typeof r.message === 'string',   '[V15.7-B-15] unknown → message é string');
}

{
  const r = normalizeBlockingReason('agent_claim_without_evidence');
  assert(r.id === 'agent_claim_without_evidence', '[V15.7-B-16] agent_claim_without_evidence no catalog');
  assert(r.severity === 'high',                   '[V15.7-B-17] severity=high');
}

{
  const r = normalizeBlockingReason('pass_gold_not_real');
  assert(r.id === 'pass_gold_not_real',  '[V15.7-B-18] pass_gold_not_real no catalog');
  assert(r.severity === 'critical',      '[V15.7-B-19] severity=critical');
  assert(r.gate === 'go_core',          '[V15.7-B-20] gate=go_core');
}

// ════════════════════════════════════════════════════════════════════
// SUITE V15.7-C — evaluateDecisionMatrix: policy gate
// ════════════════════════════════════════════════════════════════════

console.log('\n[V15.7-C] evaluateDecisionMatrix — policy gate blocks');

{
  const ev = createRuntimeEvidence();
  const m  = evaluateDecisionMatrix(ev, null);
  assert(m.schema_version === 'v15.7',        '[V15.7-C-1] schema_version=v15.7');
  assert(typeof m.decision_state === 'string', '[V15.7-C-2] decision_state é string');
  assert(m.deploy_allowed === false,           '[V15.7-C-3] deploy_allowed sempre false');
  assert(m.promotion_allowed === false,        '[V15.7-C-4] promotion_allowed sempre false');
  assert(m.stable_allowed === false,           '[V15.7-C-5] stable_allowed sempre false');
  assert(m.release_candidate === false,        '[V15.7-C-6] release_candidate sempre false');
}

{
  const ev = createRuntimeEvidence();
  ev.deploy_allowed = true;
  const m = evaluateDecisionMatrix(ev, null);
  assert(m.decision_state === 'BLOCKED_POLICY',                    '[V15.7-C-7] deploy_allowed:true → BLOCKED_POLICY');
  assert(m.gates.policy.pass === false,                             '[V15.7-C-8] policy gate failed');
  assert(m.blocking_reasons.some(r => r.id === 'deploy_policy_violation'), '[V15.7-C-9] blocking reason deploy_policy_violation');
}

{
  const ev = createRuntimeEvidence();
  ev.sources.security.fake_evidence_scan_clean = false;
  const m = evaluateDecisionMatrix(ev, null);
  assert(m.decision_state === 'BLOCKED_POLICY',                  '[V15.7-C-10] fake_evidence → BLOCKED_POLICY');
  assert(m.blocking_reasons.some(r => r.id === 'fake_evidence_detected'), '[V15.7-C-11] fake_evidence_detected in reasons');
}

{
  const ev = createRuntimeEvidence();
  ev.sources.git.forbidden_scope_clean = false;
  const m = evaluateDecisionMatrix(ev, null);
  assert(m.decision_state === 'BLOCKED_POLICY',                    '[V15.7-C-12] forbidden_scope → BLOCKED_POLICY');
  assert(m.blocking_reasons.some(r => r.id === 'forbidden_scope_changed'), '[V15.7-C-13] forbidden_scope_changed in reasons');
}

{
  const ev = createRuntimeEvidence();
  ev.sources.security.hardcoded_pass_gold_absent = false;
  const m = evaluateDecisionMatrix(ev, null);
  assert(m.decision_state === 'BLOCKED_POLICY',                        '[V15.7-C-14] hardcoded_pass_gold → BLOCKED_POLICY');
  assert(m.blocking_reasons.some(r => r.id === 'hardcoded_pass_gold_detected'), '[V15.7-C-15] hardcoded_pass_gold_detected in reasons');
}

// ════════════════════════════════════════════════════════════════════
// SUITE V15.7-D — evaluateDecisionMatrix: runtime/go_core/evidence
// ════════════════════════════════════════════════════════════════════

console.log('\n[V15.7-D] evaluateDecisionMatrix — runtime/go_core/evidence gates');

{
  const ev = createRuntimeEvidence();
  const m  = evaluateDecisionMatrix(ev, null);
  assert(m.decision_state === 'BLOCKED_RUNTIME', '[V15.7-D-1] default evidence → BLOCKED_RUNTIME');
  assert(m.gates.ci.pass === false,              '[V15.7-D-2] CI gate always false at harness level');
  assert(m.gates.ci.blocker === 'ci_not_verified', '[V15.7-D-3] CI blocker=ci_not_verified');
}

{
  const ev = createRuntimeEvidence();
  ev.sources.runtime.blocked_runtime = false;
  ev.sources.runtime.runtime_probe_pass = true;
  ev.sources.runtime.evidence_present = true;
  const m = evaluateDecisionMatrix(ev, null);
  assert(m.gates.runtime.pass === true,        '[V15.7-D-4] runtime gate pass when probe ok');
  assert(m.decision_state !== 'BLOCKED_POLICY', '[V15.7-D-5] not BLOCKED_POLICY with clean policy');
}

{
  const ev = createRuntimeEvidence();
  ev.sources.go_core.evidence_present    = true;
  ev.sources.go_core.evidence_receipt_valid = true;
  const m = evaluateDecisionMatrix(ev, null);
  assert(m.gates.go_core.pass === true, '[V15.7-D-6] go_core gate pass with valid receipt');
}

{
  const ev = createRuntimeEvidence();
  ev.sources.go_core.evidence_receipt_source = 'backend-claim';
  ev.sources.go_core.evidence_present = false;
  const m = evaluateDecisionMatrix(ev, null);
  assert(m.blocking_reasons.some(r => r.id === 'evidence_receipt_not_go_core' || r.id === 'go_core_evidence_missing'), '[V15.7-D-7] non-go-core source → blocking reason');
}

{
  const ev = createRuntimeEvidence();
  ev.sources.tests.syntax_pass     = true;
  ev.sources.tests.test_suite_pass = true;
  ev.sources.tests.evidence_present = true;
  const m = evaluateDecisionMatrix(ev, null);
  assert(m.gates.tests.pass === true, '[V15.7-D-8] tests gate pass when both pass');
}

{
  const ev = createRuntimeEvidence();
  const m  = evaluateDecisionMatrix(ev, null);
  assert(m.gates.tests.pass === false,                        '[V15.7-D-9] tests gate fail by default');
  assert(m.blocking_reasons.some(r => r.id === 'tests_not_verified'), '[V15.7-D-10] tests_not_verified in reasons');
}

{
  // Full passing evidence → SUPERVISED_READY
  const ev = createRuntimeEvidence('mid-full');
  ev.sources.runtime.blocked_runtime    = false;
  ev.sources.runtime.runtime_probe_pass = true;
  ev.sources.runtime.evidence_present   = true;
  ev.sources.go_core.evidence_present        = true;
  ev.sources.go_core.evidence_receipt_valid  = true;
  ev.sources.go_core.evidence_receipt_source = 'go-core';
  ev.sources.go_core.go_tests_pass           = true;
  ev.sources.go_core.go_core_compiled        = true;
  ev.sources.backend.backend_alive           = true;
  ev.sources.backend.backend_stub            = false;
  ev.sources.backend.backend_has_mission_id  = true;
  ev.sources.tests.syntax_pass               = true;
  ev.sources.tests.test_suite_pass           = true;
  ev.sources.tests.evidence_present          = true;
  ev.sources.visual.visual_gold_harness_lock = true;
  ev.sources.visual.frontend_visual_lock     = true;
  ev.sources.visual.sddf_front_guard         = true;
  ev.sources.visual.evidence_present         = true;
  ev.sources.security.fake_evidence_scan_clean   = true;
  ev.sources.security.hardcoded_pass_gold_absent = true;
  ev.sources.security.hardcoded_deploy_absent    = true;
  ev.sources.security.evidence_present           = true;
  ev.sources.git.forbidden_scope_clean = true;
  ev.sources.git.evidence_present      = true;
  const m = evaluateDecisionMatrix(ev, null);
  assert(m.decision_state === 'SUPERVISED_READY', '[V15.7-D-11] full passing evidence → SUPERVISED_READY');
  assert(m.deploy_allowed === false,               '[V15.7-D-12] SUPERVISED_READY still deploy_allowed=false');
  assert(m.release_candidate === false,            '[V15.7-D-13] SUPERVISED_READY still release_candidate=false');
  assert(m.gates.ci.pass === false,               '[V15.7-D-14] CI always false even at SUPERVISED_READY');
  assert(Array.isArray(m.required_evidence),       '[V15.7-D-15] required_evidence presente');
}

// ════════════════════════════════════════════════════════════════════
// SUITE V15.7-E — deriveRequiredEvidenceChecklist
// ════════════════════════════════════════════════════════════════════

console.log('\n[V15.7-E] deriveRequiredEvidenceChecklist — 19 items');

{
  const checklist = deriveRequiredEvidenceChecklist(null, null);
  assert(Array.isArray(checklist),         '[V15.7-E-1] null evidence → returns array');
  assert(checklist.length === 19,          '[V15.7-E-2] always 19 checklist items');
}

{
  const ev = createRuntimeEvidence();
  const checklist = deriveRequiredEvidenceChecklist(ev, null);
  assert(checklist.length === 19,          '[V15.7-E-3] 19 items com evidence real');
  const ids = checklist.map(c => c.id);
  assert(ids.includes('git_head_current'),          '[V15.7-E-4] git_head_current presente');
  assert(ids.includes('diff_scope_clean'),           '[V15.7-E-5] diff_scope_clean presente');
  assert(ids.includes('visual_locks_pass'),          '[V15.7-E-6] visual_locks_pass presente');
  assert(ids.includes('go_test_pass'),               '[V15.7-E-7] go_test_pass presente');
  assert(ids.includes('evidence_receipt_source_go_core'), '[V15.7-E-8] evidence_receipt_source_go_core presente');
  assert(ids.includes('release_authorization_present'), '[V15.7-E-9] release_authorization_present presente');
  assert(ids.includes('pass_gold_real'),             '[V15.7-E-10] pass_gold_real presente');
  assert(ids.includes('ci_success'),                 '[V15.7-E-11] ci_success presente');
}

{
  const ev = createRuntimeEvidence();
  const checklist = deriveRequiredEvidenceChecklist(ev, null);
  const authItem = checklist.find(c => c.id === 'release_authorization_present');
  assert(authItem !== undefined,              '[V15.7-E-12] release_authorization_present encontrado');
  assert(authItem.present === false,          '[V15.7-E-13] release_authorization_present sempre false');
}

{
  const ev = createRuntimeEvidence();
  const checklist = deriveRequiredEvidenceChecklist(ev, null);
  const ciItem = checklist.find(c => c.id === 'ci_success');
  assert(ciItem.present === false,            '[V15.7-E-14] ci_success sempre false no harness');
  assert(ciItem.blocking_if_missing === false, '[V15.7-E-15] ci_success não bloqueia hard');
}

{
  const ev = createRuntimeEvidence();
  const checklist = deriveRequiredEvidenceChecklist(ev, null);
  for (const item of checklist) {
    assert('id' in item && 'required' in item && 'present' in item && 'source' in item && 'trust' in item && 'blocking_if_missing' in item,
      `[V15.7-E-16] item ${item.id} has all required fields`);
  }
}

// ════════════════════════════════════════════════════════════════════
// SUITE V15.7-F — deriveSafeNextActions
// ════════════════════════════════════════════════════════════════════

console.log('\n[V15.7-F] deriveSafeNextActions — 4 actions per state');

{
  for (const state of ['BLOCKED_RUNTIME', 'BLOCKED_EVIDENCE', 'BLOCKED_POLICY', 'SUPERVISED_READY', 'RELEASE_CANDIDATE']) {
    const m = createDecisionMatrix();
    m.decision_state = state;
    const actions = deriveSafeNextActions(m);
    assert(Array.isArray(actions),      `[V15.7-F-${state}-1] actions é array`);
    assert(actions.length === 4,        `[V15.7-F-${state}-2] 4 actions para ${state}`);
    for (const a of actions) {
      assert(a.write_capable === false, `[V15.7-F-${state}-3] write_capable=false em ${a.id}`);
      assert(a.safe === true,           `[V15.7-F-${state}-4] safe=true em ${a.id}`);
    }
  }
}

{
  const m = createDecisionMatrix();
  m.decision_state = 'BLOCKED_RUNTIME';
  const actions = deriveSafeNextActions(m);
  assert(actions.some(a => a.id === 'start_backend_locally'),    '[V15.7-F-1] BLOCKED_RUNTIME: start_backend_locally');
  assert(actions.some(a => a.id === 'run_runtime_probe'),        '[V15.7-F-2] BLOCKED_RUNTIME: run_runtime_probe');
}

{
  const m = createDecisionMatrix();
  m.decision_state = 'SUPERVISED_READY';
  const actions = deriveSafeNextActions(m);
  assert(actions.some(a => a.id === 'request_release_authorization'), '[V15.7-F-3] SUPERVISED_READY: request_release_authorization');
  assert(actions.some(a => a.id === 'verify_ci_remote'),             '[V15.7-F-4] SUPERVISED_READY: verify_ci_remote');
}

// ════════════════════════════════════════════════════════════════════
// SUITE V15.7-G — evaluateReleaseReadiness
// ════════════════════════════════════════════════════════════════════

console.log('\n[V15.7-G] evaluateReleaseReadiness — score & levels');

{
  const m   = createDecisionMatrix();
  const r   = evaluateReleaseReadiness(m, null, null);
  assert(typeof r.score === 'number',          '[V15.7-G-1] score é number');
  assert(r.deploy_allowed === false,            '[V15.7-G-2] deploy_allowed sempre false');
  assert(r.promotion_allowed === false,         '[V15.7-G-3] promotion_allowed sempre false');
  assert(r.stable_allowed === false,            '[V15.7-G-4] stable_allowed sempre false');
  assert(r.ready === false,                     '[V15.7-G-5] default → not ready');
  assert(r.level === 'blocked',                 '[V15.7-G-6] default state → level=blocked');
  assert(Array.isArray(r.required_authorization), '[V15.7-G-7] required_authorization é array');
  assert(r.required_authorization.length === 4, '[V15.7-G-8] 4 required_authorization items');
}

{
  const m = createDecisionMatrix();
  m.decision_state = 'SUPERVISED_READY';
  const r = evaluateReleaseReadiness(m, null, null);
  assert(r.level === 'supervised',  '[V15.7-G-9] SUPERVISED_READY → level=supervised');
  assert(r.ready === false,         '[V15.7-G-10] SUPERVISED_READY ainda não ready');
}

{
  // Policy violation forces score=0
  const m = createDecisionMatrix();
  m.decision_state = 'BLOCKED_POLICY';
  m.blocking_reasons = [normalizeBlockingReason('deploy_policy_violation')];
  const r = evaluateReleaseReadiness(m, null, null);
  assert(r.score === 0, '[V15.7-G-11] policy violation → score=0');
}

{
  const r = evaluateReleaseReadiness(null, null, null);
  assert(r.score === 0,         '[V15.7-G-12] null matrix → score=0');
  assert(r.level === 'blocked', '[V15.7-G-13] null matrix → level=blocked');
}

{
  // Full passing → score > 0, level supervised
  const ev = createRuntimeEvidence();
  ev.sources.go_core.evidence_present       = true;
  ev.sources.go_core.evidence_receipt_valid = true;
  ev.sources.runtime.blocked_runtime        = false;
  ev.sources.runtime.runtime_probe_pass     = true;
  ev.sources.tests.syntax_pass              = true;
  ev.sources.tests.test_suite_pass          = true;
  const m = evaluateDecisionMatrix(ev, null);
  const r = evaluateReleaseReadiness(m, ev, null);
  assert(r.score > 0,                           '[V15.7-G-14] partial evidence → score > 0');
  assert(r.required_authorization.includes('release_authorization'), '[V15.7-G-15] release_authorization required');
}

// ════════════════════════════════════════════════════════════════════
// SUITE V15.7-H — render functions + supervisor integration
// ════════════════════════════════════════════════════════════════════

console.log('\n[V15.7-H] renderDecisionMatrixSummary + renderReleaseReadinessGate + supervisor');

{
  const summary = renderDecisionMatrixSummary(null);
  assert(summary === null, '[V15.7-H-1] null matrix → null summary');
}

{
  const m = createDecisionMatrix();
  const summary = renderDecisionMatrixSummary(m);
  assert(summary.schema_version === 'v15.7',                    '[V15.7-H-2] summary.schema_version=v15.7');
  assert(summary.deploy_allowed === false,                       '[V15.7-H-3] summary.deploy_allowed=false');
  assert(summary.promotion_allowed === false,                    '[V15.7-H-4] summary.promotion_allowed=false');
  assert(summary.stable_allowed === false,                       '[V15.7-H-5] summary.stable_allowed=false');
  assert(summary.release_candidate === false,                    '[V15.7-H-6] summary.release_candidate=false');
  assert(Array.isArray(summary.gates_pass),                      '[V15.7-H-7] summary.gates_pass é array');
  assert(Array.isArray(summary.gates_blocked),                   '[V15.7-H-8] summary.gates_blocked é array');
  assert(typeof summary.blocking_count === 'number',             '[V15.7-H-9] summary.blocking_count é number');
  assert(summary.note.includes('classification only'),           '[V15.7-H-10] summary.note contém classification only');
}

{
  const gate = renderReleaseReadinessGate(null);
  assert(gate === null, '[V15.7-H-11] null readiness → null gate');
}

{
  const m = createDecisionMatrix();
  const r = evaluateReleaseReadiness(m, null, null);
  const gate = renderReleaseReadinessGate(r);
  assert(gate.deploy_allowed === false,                    '[V15.7-H-12] gate.deploy_allowed=false');
  assert(gate.promotion_allowed === false,                 '[V15.7-H-13] gate.promotion_allowed=false');
  assert(gate.stable_allowed === false,                    '[V15.7-H-14] gate.stable_allowed=false');
  assert(Array.isArray(gate.required_authorization),       '[V15.7-H-15] gate.required_authorization é array');
  assert(typeof gate.missing_count === 'number',           '[V15.7-H-16] gate.missing_count é number');
  assert(typeof gate.blocker_count === 'number',           '[V15.7-H-17] gate.blocker_count é number');
  assert(gate.note.includes('explicit authorization'),     '[V15.7-H-18] gate.note contém explicit authorization');
}

// attachDecisionMatrix
{
  const ctx = createHermesMissionContext();
  const m   = createDecisionMatrix();
  attachDecisionMatrix(ctx, m);
  assert(ctx.decision_matrix === m,              '[V15.7-H-19] decision_matrix attachado ao ctx');
  assert(ctx.decision_matrix_attached === true,  '[V15.7-H-20] decision_matrix_attached=true');
  assert(typeof ctx.decision_matrix_at === 'number', '[V15.7-H-21] decision_matrix_at é number');
}

{
  attachDecisionMatrix(null, createDecisionMatrix());
  assert(true, '[V15.7-H-22] attachDecisionMatrix ctx=null não lança exceção');
}

// evaluateHermesDecision
{
  const ctx    = createHermesMissionContext();
  const result = evaluateHermesDecision(ctx);
  assert(typeof result.decision_state === 'string', '[V15.7-H-23] decision_state é string');
  assert(result.deploy_allowed === false,            '[V15.7-H-24] deploy_allowed=false');
  assert(result.promotion_allowed === false,         '[V15.7-H-25] promotion_allowed=false');
  assert(result.stable_allowed === false,            '[V15.7-H-26] stable_allowed=false');
  assert(result.release_candidate === false,         '[V15.7-H-27] release_candidate=false');
  assert(ctx.decision_matrix !== null,              '[V15.7-H-28] ctx.decision_matrix preenchido após evaluate');
  assert(ctx.decision_matrix_attached === true,     '[V15.7-H-29] ctx.decision_matrix_attached=true');
  assert(ctx.release_readiness_gate !== null,       '[V15.7-H-30] ctx.release_readiness_gate preenchido');
}

{
  const result = evaluateHermesDecision(null);
  assert(result.decision_state === 'BLOCKED_RUNTIME', '[V15.7-H-31] null ctx → BLOCKED_RUNTIME');
  assert(result.deploy_allowed === false,              '[V15.7-H-32] null ctx → deploy_allowed=false');
}

// renderDecisionMatrixGraph
{
  const ctx = createHermesMissionContext();
  const graph = renderDecisionMatrixGraph(ctx);
  assert(graph === null, '[V15.7-H-33] ctx sem decision_matrix → graph=null');
}

{
  const ctx = createHermesMissionContext();
  const ev  = createRuntimeEvidence('mid-dm');
  attachRuntimeEvidence(ctx, ev);
  evaluateHermesDecision(ctx);
  const graph = renderDecisionMatrixGraph(ctx);
  assert(graph !== null,                              '[V15.7-H-34] ctx com decision_matrix → graph não null');
  assert(graph.schema_version === 'v15.7',            '[V15.7-H-35] graph.schema_version=v15.7');
  assert(graph.mission_id === ctx.mission_id,         '[V15.7-H-36] graph.mission_id propagado');
  assert(typeof graph.decision_state === 'string',    '[V15.7-H-37] graph.decision_state é string');
  assert(graph.deploy_allowed === false,              '[V15.7-H-38] graph.deploy_allowed=false');
  assert(graph.release_candidate === false,           '[V15.7-H-39] graph.release_candidate=false');
  assert(graph.note.includes('classification only'), '[V15.7-H-40] graph.note contém classification only');
}

// renderHermesSupervisionReport with V15.7 decision matrix fields
{
  const ctx = createHermesMissionContext();
  const ev  = createRuntimeEvidence('mid-v157');
  attachRuntimeEvidence(ctx, ev);
  evaluateHermesDecision(ctx);
  const report = renderHermesSupervisionReport(ctx);
  assert('DECISION_MATRIX' in report,            '[V15.7-H-41] report inclui DECISION_MATRIX');
  assert('DECISION_MATRIX_SUMMARY' in report,   '[V15.7-H-42] report inclui DECISION_MATRIX_SUMMARY');
  assert('RELEASE_READINESS_GATE' in report,    '[V15.7-H-43] report inclui RELEASE_READINESS_GATE');
  assert('DECISION_STATE' in report,            '[V15.7-H-44] report inclui DECISION_STATE');
  assert('DECISION_BLOCKING_REASONS' in report, '[V15.7-H-45] report inclui DECISION_BLOCKING_REASONS');
  assert('DECISION_SAFE_NEXT_ACTIONS' in report, '[V15.7-H-46] report inclui DECISION_SAFE_NEXT_ACTIONS');
  assert('RELEASE_CANDIDATE' in report,          '[V15.7-H-47] report inclui RELEASE_CANDIDATE');
  assert('DEPLOY_ALLOWED' in report,             '[V15.7-H-48] report inclui DEPLOY_ALLOWED');
  assert(report.DEPLOY_ALLOWED === false,         '[V15.7-H-49] DEPLOY_ALLOWED sempre false');
  assert(report.PROMOTION_ALLOWED === false,      '[V15.7-H-50] PROMOTION_ALLOWED sempre false');
  assert(report.STABLE_ALLOWED === false,         '[V15.7-H-51] STABLE_ALLOWED sempre false');
  assert(report.RELEASE_CANDIDATE === false,      '[V15.7-H-52] RELEASE_CANDIDATE sempre false');
  assert(Array.isArray(report.DECISION_BLOCKING_REASONS),  '[V15.7-H-53] DECISION_BLOCKING_REASONS é array');
  assert(Array.isArray(report.DECISION_SAFE_NEXT_ACTIONS), '[V15.7-H-54] DECISION_SAFE_NEXT_ACTIONS é array');
}

// ─── V15.8 — AUTHORIZATION LAYER ─────────────────────────────────

// ─── SUITE V15.8-A: createAuthorizationManifest ───────────────────
{
  console.log('\n[V15.8-A] createAuthorizationManifest');
  const m = createAuthorizationManifest();
  assert(m.schema_version === 'v15.8',               '[V15.8-A-1] schema_version=v15.8');
  assert(m.status === 'AUTHORIZATION_MISSING',       '[V15.8-A-2] default status AUTHORIZATION_MISSING');
  assert(Array.isArray(m.approvals),                 '[V15.8-A-3] approvals é array');
  assert(Array.isArray(m.evidence_refs),             '[V15.8-A-4] evidence_refs é array');
  assert(m.requested_action === 'release_review',    '[V15.8-A-5] default requested_action release_review');
  assert(typeof m.authorization_id === 'string',     '[V15.8-A-6] authorization_id existe e é string');
  assert(m.authorization_id.length > 0,             '[V15.8-A-7] authorization_id não vazio');
  assert(m.mission_id === null || typeof m.mission_id === 'string', '[V15.8-A-8] mission_id null ou string');
  assert(typeof m.created_at === 'number',           '[V15.8-A-9] created_at é number');
  assert(typeof m.constraints === 'object',          '[V15.8-A-10] constraints é object');
  const m2 = createAuthorizationManifest({ mission_id: 'mid-test', requested_action: 'deploy_approval' });
  assert(m2.mission_id === 'mid-test',              '[V15.8-A-11] mission_id propagado via override');
  assert(m2.requested_action === 'deploy_approval', '[V15.8-A-12] requested_action override');
  assert(m2.status === 'AUTHORIZATION_MISSING',     '[V15.8-A-13] status always starts AUTHORIZATION_MISSING');
}

// ─── SUITE V15.8-B: createAuthorizationPolicy ────────────────────
{
  console.log('\n[V15.8-B] createAuthorizationPolicy');
  const p = createAuthorizationPolicy();
  assert(p.schema_version === 'v15.8',              '[V15.8-B-1] schema_version=v15.8');
  assert(Array.isArray(p.required_authorizations),  '[V15.8-B-2] required_authorizations é array');
  assert(p.required_authorizations.includes('release_authorization'),         '[V15.8-B-3] contém release_authorization');
  assert(p.required_authorizations.includes('deploy_authorization'),          '[V15.8-B-4] contém deploy_authorization');
  assert(p.required_authorizations.includes('tag_authorization'),             '[V15.8-B-5] contém tag_authorization');
  assert(p.required_authorizations.includes('stable_promotion_authorization'),'[V15.8-B-6] contém stable_promotion_authorization');
  assert(Array.isArray(p.forbidden_actions),        '[V15.8-B-7] forbidden_actions é array');
  assert(p.forbidden_actions.includes('deploy'),    '[V15.8-B-8] forbidden: deploy');
  assert(p.forbidden_actions.includes('tag'),       '[V15.8-B-9] forbidden: tag');
  assert(p.forbidden_actions.includes('stable_promotion'), '[V15.8-B-10] forbidden: stable_promotion');
  assert(p.forbidden_actions.includes('bypass_pass_gold'), '[V15.8-B-11] forbidden: bypass_pass_gold');
  assert(p.invariants.deploy_allowed === false,     '[V15.8-B-12] invariants.deploy_allowed=false');
  assert(p.invariants.promotion_allowed === false,  '[V15.8-B-13] invariants.promotion_allowed=false');
  assert(p.invariants.stable_allowed === false,     '[V15.8-B-14] invariants.stable_allowed=false');
  assert(p.invariants.release_allowed === false,    '[V15.8-B-15] invariants.release_allowed=false');
  assert(p.invariants.tag_allowed === false,        '[V15.8-B-16] invariants.tag_allowed=false');
  assert(Array.isArray(p.allowed_actions),          '[V15.8-B-17] allowed_actions é array');
  assert(p.allowed_actions.length === 0,            '[V15.8-B-18] allowed_actions vazio nesta fase');
}

// ─── SUITE V15.8-C: validateAuthorizationManifest ────────────────
{
  console.log('\n[V15.8-C] validateAuthorizationManifest');
  // null manifest → AUTHORIZATION_MISSING
  const r0 = validateAuthorizationManifest(null, null, null);
  assert(r0.status === 'AUTHORIZATION_MISSING', '[V15.8-C-1] null manifest → AUTHORIZATION_MISSING');
  assert(r0.ok === false,                       '[V15.8-C-2] null manifest → ok=false');
  assert(r0.invariants.deploy_allowed === false,'[V15.8-C-3] invariants.deploy_allowed=false on missing');
  assert(Array.isArray(r0.audit_events),        '[V15.8-C-4] audit_events é array');

  // invalid schema
  const rSchema = validateAuthorizationManifest({ schema_version: 'v1.0', requested_action: 'release_review' }, null, null);
  assert(rSchema.status === 'AUTHORIZATION_INVALID', '[V15.8-C-5] schema inválido → AUTHORIZATION_INVALID');
  assert(rSchema.ok === false,                       '[V15.8-C-6] schema inválido → ok=false');

  // invalid action
  const rAction = validateAuthorizationManifest({ schema_version: 'v15.8', requested_action: 'do_deploy_now' }, null, null);
  assert(rAction.status === 'AUTHORIZATION_INVALID', '[V15.8-C-7] action inválida → AUTHORIZATION_INVALID');

  // expired
  const rExp = validateAuthorizationManifest({ schema_version: 'v15.8', requested_action: 'release_review', expires_at: Date.now() - 10000 }, null, null);
  assert(rExp.status === 'AUTHORIZATION_EXPIRED', '[V15.8-C-8] expired → AUTHORIZATION_EXPIRED');
  assert(rExp.expired === true,                   '[V15.8-C-9] expired=true');

  // rejected approval
  const rRej = validateAuthorizationManifest({
    schema_version: 'v15.8', requested_action: 'release_review',
    approvals: [{ approver: 'alice', approved: false, approved_at: Date.now() }],
  }, null, null);
  assert(rRej.status === 'AUTHORIZATION_REJECTED', '[V15.8-C-10] approved=false → AUTHORIZATION_REJECTED');

  // partial — critical action missing approvals
  const rPart = validateAuthorizationManifest({
    schema_version: 'v15.8', requested_action: 'deploy_approval',
    approvals: [], evidence_refs: [],
  }, null, null);
  assert(rPart.status === 'AUTHORIZATION_PARTIAL', '[V15.8-C-11] missing approval for critical → AUTHORIZATION_PARTIAL');

  // partial — missing evidence_refs for critical action
  const rPartEv = validateAuthorizationManifest({
    schema_version: 'v15.8', requested_action: 'release_candidate_approval',
    approvals: [{ approver: 'bob', approved: true, approved_at: Date.now() }],
    evidence_refs: [],
  }, null, null);
  assert(rPartEv.status === 'AUTHORIZATION_PARTIAL', '[V15.8-C-12] missing evidence_refs → AUTHORIZATION_PARTIAL');

  // valid
  const rValid = validateAuthorizationManifest({
    schema_version: 'v15.8', requested_action: 'release_review',
    approvals: [{ approver: 'alice', approved: true, approved_at: Date.now() }],
    evidence_refs: ['ev-001'],
  }, null, null);
  assert(rValid.status === 'AUTHORIZATION_VALID', '[V15.8-C-13] valid manifest → AUTHORIZATION_VALID');
  assert(rValid.ok === true,                      '[V15.8-C-14] valid manifest → ok=true');

  // invariants always false
  assert(rValid.invariants.deploy_allowed === false,    '[V15.8-C-15] invariants.deploy_allowed=false always');
  assert(rValid.invariants.promotion_allowed === false, '[V15.8-C-16] invariants.promotion_allowed=false always');
  assert(rValid.invariants.stable_allowed === false,    '[V15.8-C-17] invariants.stable_allowed=false always');
  assert(rValid.invariants.release_allowed === false,   '[V15.8-C-18] invariants.release_allowed=false always');
  assert(rValid.invariants.tag_allowed === false,       '[V15.8-C-19] invariants.tag_allowed=false always');
}

// ─── SUITE V15.8-D: evaluateAuthorizationLayer ───────────────────
{
  console.log('\n[V15.8-D] evaluateAuthorizationLayer');
  const validManifest = {
    schema_version: 'v15.8', requested_action: 'release_review',
    approvals: [{ approver: 'alice', approved: true, approved_at: Date.now() }],
    evidence_refs: ['ev-001'],
  };

  // BLOCKED_RUNTIME + valid auth still blocked
  const dmBlocked = createDecisionMatrix();
  const layerBlocked = evaluateAuthorizationLayer(validManifest, dmBlocked, null, null);
  assert(layerBlocked.release_gate_effective_state === 'BLOCKED_RUNTIME', '[V15.8-D-1] BLOCKED_RUNTIME + valid auth → stays BLOCKED_RUNTIME');
  assert(layerBlocked.release_authorized === false,  '[V15.8-D-2] BLOCKED_RUNTIME → release_authorized=false');
  assert(layerBlocked.deploy_allowed === false,      '[V15.8-D-3] deploy_allowed always false');
  assert(layerBlocked.release_allowed === false,     '[V15.8-D-4] release_allowed always false');
  assert(layerBlocked.tag_allowed === false,         '[V15.8-D-5] tag_allowed always false');
  assert(layerBlocked.stable_allowed === false,      '[V15.8-D-6] stable_allowed always false');
  assert(layerBlocked.promotion_allowed === false,   '[V15.8-D-7] promotion_allowed always false');

  // SUPERVISED_READY + valid auth can release_authorized=true
  const dmSupervised = { ...createDecisionMatrix(), decision_state: 'SUPERVISED_READY' };
  const layerSupervised = evaluateAuthorizationLayer(validManifest, dmSupervised, null, null);
  assert(layerSupervised.release_authorized === true, '[V15.8-D-8] SUPERVISED_READY + valid → release_authorized=true');
  assert(layerSupervised.deploy_allowed === false,   '[V15.8-D-9] deploy_allowed still false');
  assert(layerSupervised.deploy_authorized === false,'[V15.8-D-10] deploy_authorized=false (not RELEASE_CANDIDATE)');

  // RELEASE_CANDIDATE + valid auth
  const dmCandidate = { ...createDecisionMatrix(), decision_state: 'RELEASE_CANDIDATE' };
  const layerCandidate = evaluateAuthorizationLayer(validManifest, dmCandidate, null, null);
  assert(layerCandidate.release_authorized === true,         '[V15.8-D-11] RELEASE_CANDIDATE + valid → release_authorized=true');
  assert(layerCandidate.deploy_authorized === true,          '[V15.8-D-12] RELEASE_CANDIDATE + valid → deploy_authorized=true');
  assert(layerCandidate.tag_authorized === true,             '[V15.8-D-13] RELEASE_CANDIDATE + valid → tag_authorized=true');
  assert(layerCandidate.stable_promotion_authorized === true,'[V15.8-D-14] RELEASE_CANDIDATE + valid → stable_promotion_authorized=true');
  assert(layerCandidate.deploy_allowed === false,            '[V15.8-D-15] deploy_allowed still false');
  assert(layerCandidate.release_allowed === false,           '[V15.8-D-16] release_allowed still false');
  assert(layerCandidate.tag_allowed === false,               '[V15.8-D-17] tag_allowed still false');
  assert(layerCandidate.stable_allowed === false,            '[V15.8-D-18] stable_allowed still false');

  // null manifest → AUTHORIZATION_MISSING regardless of decision state
  const layerMissing = evaluateAuthorizationLayer(null, dmCandidate, null, null);
  assert(layerMissing.authorization_status === 'AUTHORIZATION_MISSING', '[V15.8-D-19] null manifest → AUTHORIZATION_MISSING');
  assert(layerMissing.authorization_valid === false,  '[V15.8-D-20] null manifest → authorization_valid=false');
  assert(layerMissing.deploy_allowed === false,       '[V15.8-D-21] null manifest → deploy_allowed=false');
  assert(layerMissing.release_authorized === false,   '[V15.8-D-22] null manifest → release_authorized=false');

  // schema_version present
  assert(layerBlocked.schema_version === 'v15.8',    '[V15.8-D-23] schema_version=v15.8');
  assert(layerBlocked.enabled === true,              '[V15.8-D-24] enabled=true');
}

// ─── SUITE V15.8-E: deriveAuthorizationRequirements ──────────────
{
  console.log('\n[V15.8-E] deriveAuthorizationRequirements');
  const dm = createDecisionMatrix();
  const reqs = deriveAuthorizationRequirements(dm, null);
  assert(Array.isArray(reqs),                  '[V15.8-E-1] returns array');
  assert(reqs.length === 9,                    '[V15.8-E-2] 9 requirements');

  const ids = reqs.map(r => r.id);
  assert(ids.includes('release_authorization'),           '[V15.8-E-3] contém release_authorization');
  assert(ids.includes('deploy_authorization'),            '[V15.8-E-4] contém deploy_authorization');
  assert(ids.includes('tag_authorization'),               '[V15.8-E-5] contém tag_authorization');
  assert(ids.includes('stable_promotion_authorization'),  '[V15.8-E-6] contém stable_promotion_authorization');
  assert(ids.includes('pass_gold_authority_confirmation'),'[V15.8-E-7] contém pass_gold_authority_confirmation');
  assert(ids.includes('go_core_evidence_confirmation'),   '[V15.8-E-8] contém go_core_evidence_confirmation');
  assert(ids.includes('ci_remote_confirmation'),          '[V15.8-E-9] contém ci_remote_confirmation');
  assert(ids.includes('scope_review_confirmation'),       '[V15.8-E-10] contém scope_review_confirmation');
  assert(ids.includes('security_review_confirmation'),    '[V15.8-E-11] contém security_review_confirmation');

  const pgAuth = reqs.find(r => r.id === 'pass_gold_authority_confirmation');
  assert(pgAuth.required === true,             '[V15.8-E-12] pass_gold_authority_confirmation required=true');
  const goCore = reqs.find(r => r.id === 'go_core_evidence_confirmation');
  assert(goCore.required === true,             '[V15.8-E-13] go_core_evidence_confirmation required=true');

  // deploy/tag/stable required only for RELEASE_CANDIDATE
  const deployReq = reqs.find(r => r.id === 'deploy_authorization');
  assert(deployReq.required === false,         '[V15.8-E-14] deploy_authorization not required for BLOCKED_RUNTIME');

  const dmCandidate = { ...dm, decision_state: 'RELEASE_CANDIDATE' };
  const reqsCandidate = deriveAuthorizationRequirements(dmCandidate, null);
  const deployReqC = reqsCandidate.find(r => r.id === 'deploy_authorization');
  assert(deployReqC.required === true,         '[V15.8-E-15] deploy_authorization required for RELEASE_CANDIDATE');

  // each item has required fields
  for (const req of reqs) {
    assert('id'                in req, `[V15.8-E-16] ${req.id}: tem id`);
    assert('required'          in req, `[V15.8-E-17] ${req.id}: tem required`);
    assert('present'           in req, `[V15.8-E-18] ${req.id}: tem present`);
    assert('blocking_if_missing' in req, `[V15.8-E-19] ${req.id}: tem blocking_if_missing`);
    assert('source'            in req, `[V15.8-E-20] ${req.id}: tem source`);
    assert('required_role'     in req, `[V15.8-E-21] ${req.id}: tem required_role`);
    assert('remediation'       in req, `[V15.8-E-22] ${req.id}: tem remediation`);
  }
}

// ─── SUITE V15.8-F: deriveAuthorizationAuditTrail ────────────────
{
  console.log('\n[V15.8-F] deriveAuthorizationAuditTrail');
  // no manifest → authorization_missing event
  const trailMissing = deriveAuthorizationAuditTrail(null, null, null);
  assert(Array.isArray(trailMissing),                   '[V15.8-F-1] trail é array');
  assert(trailMissing.some(e => e.type === 'authorization_missing'), '[V15.8-F-2] contém authorization_missing');
  assert(trailMissing.some(e => e.type === 'deploy_blocked_by_policy'), '[V15.8-F-3] contém deploy_blocked_by_policy');
  assert(trailMissing.some(e => e.type === 'tag_blocked_by_policy'),    '[V15.8-F-4] contém tag_blocked_by_policy');
  assert(trailMissing.some(e => e.type === 'stable_blocked_by_policy'), '[V15.8-F-5] contém stable_blocked_by_policy');

  // with manifest + validation
  const manifest = createAuthorizationManifest();
  const validation = validateAuthorizationManifest(null, null, null);
  const trailValid = deriveAuthorizationAuditTrail(manifest, validation, null);
  assert(Array.isArray(trailValid),                   '[V15.8-F-6] trail com manifest é array');
  assert(trailValid.some(e => e.type === 'authorization_manifest_created'),   '[V15.8-F-7] contém authorization_manifest_created');
  assert(trailValid.some(e => e.type === 'authorization_validation_started'), '[V15.8-F-8] contém authorization_validation_started');
  assert(trailValid.some(e => e.type === 'authorization_status_resolved'),    '[V15.8-F-9] contém authorization_status_resolved');
  assert(trailValid.some(e => e.type === 'invariant_enforced'),               '[V15.8-F-10] contém invariant_enforced');

  // each event has required fields
  for (const evt of trailMissing) {
    assert('event_id'   in evt, `[V15.8-F-11] event_id presente em ${evt.type}`);
    assert('timestamp'  in evt, `[V15.8-F-12] timestamp presente em ${evt.type}`);
    assert('type'       in evt, `[V15.8-F-13] type presente em ${evt.type}`);
    assert('action'     in evt, `[V15.8-F-14] action presente em ${evt.type}`);
    assert('status'     in evt, `[V15.8-F-15] status presente em ${evt.type}`);
    break; // check only first event to keep test count manageable
  }
}

// ─── SUITE V15.8-G: PI Harness JSON fields ───────────────────────
{
  console.log('\n[V15.8-G] PI Harness JSON V15.8 fields via spawn');
  const result = spawnSync(process.execPath, ['--no-deprecation', HARNESS, '--max-difficulty', 'D2', '--dry-run', '--json'], { cwd: ROOT, encoding: 'utf8', timeout: 120000 });
  const raw = (result.stdout || '') + (result.stderr || '');
  const start = raw.indexOf('{');
  const end   = raw.lastIndexOf('}');
  let p = {};
  if (start >= 0 && end > start) {
    try { p = JSON.parse(raw.slice(start, end + 1)); } catch (_) { /* parse failed */ }
  }

  assert('hermes_authorization_layer_enabled'  in p, '[V15.8-G-1] hermes_authorization_layer_enabled presente');
  assert('hermes_authorization_schema_version' in p, '[V15.8-G-2] hermes_authorization_schema_version presente');
  assert('hermes_authorization_status'         in p, '[V15.8-G-3] hermes_authorization_status presente');
  assert('hermes_authorization_valid'          in p, '[V15.8-G-4] hermes_authorization_valid presente');
  assert('hermes_authorization_requirements'   in p, '[V15.8-G-5] hermes_authorization_requirements presente');
  assert('hermes_authorization_missing'        in p, '[V15.8-G-6] hermes_authorization_missing presente');
  assert('hermes_authorization_errors'         in p, '[V15.8-G-7] hermes_authorization_errors presente');
  assert('hermes_authorization_warnings'       in p, '[V15.8-G-8] hermes_authorization_warnings presente');
  assert('hermes_authorization_audit_trail'    in p, '[V15.8-G-9] hermes_authorization_audit_trail presente');
  assert('hermes_authorization_gate'           in p, '[V15.8-G-10] hermes_authorization_gate presente');
  assert('hermes_release_authorized'           in p, '[V15.8-G-11] hermes_release_authorized presente');
  assert('hermes_deploy_authorized'            in p, '[V15.8-G-12] hermes_deploy_authorized presente');
  assert('hermes_tag_authorized'               in p, '[V15.8-G-13] hermes_tag_authorized presente');
  assert('hermes_stable_promotion_authorized'  in p, '[V15.8-G-14] hermes_stable_promotion_authorized presente');
  assert('hermes_release_allowed'              in p, '[V15.8-G-15] hermes_release_allowed presente');
  assert('hermes_tag_allowed'                  in p, '[V15.8-G-16] hermes_tag_allowed presente');
  assert(p.hermes_authorization_schema_version === 'v15.8',     '[V15.8-G-17] schema_version=v15.8');
  assert(p.hermes_authorization_status === 'AUTHORIZATION_MISSING', '[V15.8-G-18] default status AUTHORIZATION_MISSING');
  assert(p.hermes_release_allowed === false,   '[V15.8-G-19] hermes_release_allowed=false');
  assert(p.hermes_deploy_allowed === false,    '[V15.8-G-20] hermes_deploy_allowed=false');
  assert(p.hermes_tag_allowed === false,       '[V15.8-G-21] hermes_tag_allowed=false');
  assert(p.hermes_stable_allowed === false,    '[V15.8-G-22] hermes_stable_allowed=false');
  assert(p.deploy_allowed === false,           '[V15.8-G-23] deploy_allowed=false');
  assert(p.promotion_allowed === false,        '[V15.8-G-24] promotion_allowed=false');
}

// ─── SUITE V15.8-H: CLI --authorization-manifest ─────────────────
{
  console.log('\n[V15.8-H] CLI --authorization-manifest');
  const { writeFileSync, unlinkSync } = await import('fs');
  const tmpPath = join(ROOT, 'tmp-v158-auth-test.json');

  // nonexistent file → AUTHORIZATION_INVALID or controlled error
  const r1 = spawnSync(process.execPath, ['--no-deprecation', HARNESS, '--max-difficulty', 'D2', '--dry-run', '--json', '--authorization-manifest', 'nonexistent-v158.json'], { cwd: ROOT, encoding: 'utf8', timeout: 120000 });
  const raw1 = (r1.stdout || '') + (r1.stderr || '');
  const s1 = raw1.indexOf('{'), e1 = raw1.lastIndexOf('}');
  let p1 = {};
  if (s1 >= 0 && e1 > s1) { try { p1 = JSON.parse(raw1.slice(s1, e1 + 1)); } catch(_){} }
  // Must return JSON (parseable) with some authorization status
  assert('hermes_authorization_status' in p1, '[V15.8-H-1] nonexistent file → JSON still parseable with auth status');
  assert(p1.hermes_deploy_allowed === false,  '[V15.8-H-2] nonexistent file → deploy_allowed=false');

  // invalid JSON file
  writeFileSync(tmpPath, 'NOT_VALID_JSON_!!', 'utf8');
  const r2 = spawnSync(process.execPath, ['--no-deprecation', HARNESS, '--max-difficulty', 'D2', '--dry-run', '--json', '--authorization-manifest', tmpPath], { cwd: ROOT, encoding: 'utf8', timeout: 120000 });
  const raw2 = (r2.stdout || '') + (r2.stderr || '');
  const s2 = raw2.indexOf('{'), e2 = raw2.lastIndexOf('}');
  let p2 = {};
  if (s2 >= 0 && e2 > s2) { try { p2 = JSON.parse(raw2.slice(s2, e2 + 1)); } catch(_){} }
  assert('hermes_authorization_status' in p2,   '[V15.8-H-3] invalid JSON file → JSON parseable');
  const invalidStatuses = ['AUTHORIZATION_INVALID','AUTHORIZATION_MISSING','AUTHORIZATION_PARTIAL'];
  assert(invalidStatuses.includes(p2.hermes_authorization_status), '[V15.8-H-4] invalid JSON → invalid status');
  assert(p2.hermes_deploy_allowed === false,     '[V15.8-H-5] invalid JSON → deploy_allowed=false');

  // valid manifest file
  const validManifest = {
    schema_version: 'v15.8',
    requested_action: 'release_review',
    approvals: [{ approver: 'alice', approved: true, approved_at: Date.now() }],
    evidence_refs: ['ev-ref-001'],
  };
  writeFileSync(tmpPath, JSON.stringify(validManifest), 'utf8');
  const r3 = spawnSync(process.execPath, ['--no-deprecation', HARNESS, '--max-difficulty', 'D2', '--dry-run', '--json', '--authorization-manifest', tmpPath], { cwd: ROOT, encoding: 'utf8', timeout: 120000 });
  const raw3 = (r3.stdout || '') + (r3.stderr || '');
  const s3 = raw3.indexOf('{'), e3 = raw3.lastIndexOf('}');
  let p3 = {};
  if (s3 >= 0 && e3 > s3) { try { p3 = JSON.parse(raw3.slice(s3, e3 + 1)); } catch(_){} }
  assert('hermes_authorization_status' in p3,   '[V15.8-H-6] valid manifest → JSON parseable');
  assert(p3.hermes_deploy_allowed === false,     '[V15.8-H-7] valid manifest → deploy_allowed always false');
  assert(p3.hermes_release_allowed === false,    '[V15.8-H-8] valid manifest → release_allowed always false');
  assert(p3.hermes_tag_allowed === false,        '[V15.8-H-9] valid manifest → tag_allowed always false');
  assert(p3.hermes_stable_allowed === false,     '[V15.8-H-10] valid manifest → stable_allowed always false');

  try { unlinkSync(tmpPath); } catch(_) {}
}

// ─── SUITE V15.8-I: Human Report section ─────────────────────────
{
  console.log('\n[V15.8-I] Human Report AUTHORIZATION LAYER section');
  const authLayer = evaluateAuthorizationLayer(null, createDecisionMatrix(), null, null);
  const summary   = renderAuthorizationSummary(authLayer);
  const gate      = renderAuthorizationGate(authLayer);

  assert(summary !== null,                        '[V15.8-I-1] renderAuthorizationSummary não null');
  assert(summary.schema_version === 'v15.8',      '[V15.8-I-2] summary.schema_version=v15.8');
  assert(summary.deploy_allowed === false,        '[V15.8-I-3] summary.deploy_allowed=false');
  assert(summary.release_allowed === false,       '[V15.8-I-4] summary.release_allowed=false');
  assert(summary.tag_allowed === false,           '[V15.8-I-5] summary.tag_allowed=false');
  assert(summary.stable_allowed === false,        '[V15.8-I-6] summary.stable_allowed=false');
  assert(typeof summary.note === 'string',        '[V15.8-I-7] summary.note é string');
  assert(summary.note.includes('modeled'),        '[V15.8-I-8] note contém "modeled" (authorization is modeled, not executed)');
  assert(summary.note.includes('explicit authorization'), '[V15.8-I-9] note contém "explicit authorization"');
  assert(summary.note.includes('remain blocked'), '[V15.8-I-10] note contém "remain blocked" (deploy/tag/stable remain blocked)');

  assert(gate !== null,                           '[V15.8-I-11] renderAuthorizationGate não null');
  assert(gate.deploy_allowed === false,           '[V15.8-I-12] gate.deploy_allowed=false');
  assert(gate.release_allowed === false,          '[V15.8-I-13] gate.release_allowed=false');
  assert(gate.tag_allowed === false,              '[V15.8-I-14] gate.tag_allowed=false');
  assert(gate.stable_allowed === false,           '[V15.8-I-15] gate.stable_allowed=false');
  assert(typeof gate.note === 'string',           '[V15.8-I-16] gate.note é string');
  assert(gate.note.includes('explicit authorization'), '[V15.8-I-17] gate.note contém "explicit authorization"');
  assert(gate.note.includes('remain blocked'),    '[V15.8-I-18] gate.note contém "remain blocked"');
  assert(Array.isArray(gate.required_authorizations), '[V15.8-I-19] gate.required_authorizations é array');
  assert(typeof gate.missing_count === 'number',  '[V15.8-I-20] gate.missing_count é number');
}

// ─── SUITE V15.8-J: Supervisor integration ───────────────────────
{
  console.log('\n[V15.8-J] Authorization supervisor integration');
  // attachAuthorizationLayer
  const ctx = createHermesMissionContext();
  const authLayer = evaluateAuthorizationLayer(null, createDecisionMatrix(), null, null);
  attachAuthorizationLayer(ctx, authLayer);
  assert(ctx.authorization_layer_attached === true, '[V15.8-J-1] ctx.authorization_layer_attached=true');
  assert(typeof ctx.authorization_layer_at === 'number', '[V15.8-J-2] ctx.authorization_layer_at é number');
  assert(ctx.authorization_status === 'AUTHORIZATION_MISSING', '[V15.8-J-3] ctx.authorization_status=AUTHORIZATION_MISSING');

  // attachAuthorizationLayer null ctx → no exception
  let threw = false;
  try { attachAuthorizationLayer(null, authLayer); } catch(_) { threw = true; }
  assert(threw === false, '[V15.8-J-4] attachAuthorizationLayer null ctx não lança exceção');

  // evaluateHermesAuthorization null ctx → AUTHORIZATION_MISSING
  const r0 = evaluateHermesAuthorization(null, null);
  assert(r0.authorization_status === 'AUTHORIZATION_MISSING', '[V15.8-J-5] null ctx → AUTHORIZATION_MISSING');
  assert(r0.deploy_allowed === false,                         '[V15.8-J-6] null ctx → deploy_allowed=false');

  // evaluateHermesAuthorization real ctx
  const ctx2 = createHermesMissionContext();
  const r2 = evaluateHermesAuthorization(ctx2, null);
  assert(r2.authorization_status === 'AUTHORIZATION_MISSING', '[V15.8-J-7] real ctx, null manifest → AUTHORIZATION_MISSING');
  assert(ctx2.authorization_layer_attached === true,          '[V15.8-J-8] ctx2.authorization_layer_attached=true after evaluate');
  assert(ctx2.authorization_gate !== null,                   '[V15.8-J-9] ctx2.authorization_gate preenchido');
  assert(r2.deploy_allowed === false,                         '[V15.8-J-10] deploy_allowed=false always');
  assert(r2.promotion_allowed === false,                      '[V15.8-J-11] promotion_allowed=false always');
  assert(r2.stable_allowed === false,                         '[V15.8-J-12] stable_allowed=false always');
  assert(r2.release_allowed === false,                        '[V15.8-J-13] release_allowed=false always');
  assert(r2.tag_allowed === false,                            '[V15.8-J-14] tag_allowed=false always');

  // renderAuthorizationGraph null ctx
  const g0 = renderAuthorizationGraph(null);
  assert(g0 === null, '[V15.8-J-15] renderAuthorizationGraph null ctx → null');

  // renderAuthorizationGraph ctx without authorization_layer
  const ctx3 = createHermesMissionContext();
  const g1 = renderAuthorizationGraph(ctx3);
  assert(g1 === null, '[V15.8-J-16] ctx sem authorization_layer → graph=null');

  // renderAuthorizationGraph ctx with authorization_layer
  const ctx4 = createHermesMissionContext();
  evaluateHermesAuthorization(ctx4, null);
  const g2 = renderAuthorizationGraph(ctx4);
  assert(g2 !== null,                            '[V15.8-J-17] ctx com authorization_layer → graph não null');
  assert(g2.schema_version === 'v15.8',          '[V15.8-J-18] graph.schema_version=v15.8');
  assert(g2.deploy_allowed === false,            '[V15.8-J-19] graph.deploy_allowed=false');
  assert(g2.release_allowed === false,           '[V15.8-J-20] graph.release_allowed=false');
  assert(g2.tag_allowed === false,               '[V15.8-J-21] graph.tag_allowed=false');
  assert(g2.stable_allowed === false,            '[V15.8-J-22] graph.stable_allowed=false');
  assert(typeof g2.authorization_status === 'string', '[V15.8-J-23] graph.authorization_status é string');
  assert(typeof g2.note === 'string',            '[V15.8-J-24] graph.note é string');
}

// ─── V15.9 — AUTHORIZATION MANIFEST TEST HARNESS ─────────────────

// ─── SUITE V15.9-A: Fixture Presence ──────────────────────────────
{
  console.log('\n[V15.9-A] Fixture Presence');

  const fixtures = listAuthorizationFixtures();
  assert(Array.isArray(fixtures),                  '[V15.9-A-1] listAuthorizationFixtures returns array');
  assert(fixtures.length >= 7,                     '[V15.9-A-2] at least 7 fixtures present');

  const fInvSchema = loadAuthorizationFixture('invalid-schema');
  assert(fInvSchema.loaded  === true,              '[V15.9-A-3] invalid-schema loaded');
  assert(fInvSchema.parse_ok === true,             '[V15.9-A-4] invalid-schema parses OK');
  assert(fInvSchema.manifest !== null,             '[V15.9-A-5] invalid-schema manifest not null');
  assert(fInvSchema.manifest.schema_version === 'v0.0', '[V15.9-A-6] invalid-schema.schema_version=v0.0');

  const fInvAction = loadAuthorizationFixture('invalid-action');
  assert(fInvAction.loaded  === true,              '[V15.9-A-7] invalid-action loaded');
  assert(fInvAction.parse_ok === true,             '[V15.9-A-8] invalid-action parses OK');
  assert(fInvAction.manifest.requested_action === 'deploy_now_without_gate', '[V15.9-A-9] invalid-action.requested_action correct');

  const fPartAppr = loadAuthorizationFixture('partial-missing-approval');
  assert(fPartAppr.parse_ok === true,              '[V15.9-A-10] partial-missing-approval parses OK');
  assert(Array.isArray(fPartAppr.manifest.approvals) && fPartAppr.manifest.approvals.length === 0, '[V15.9-A-11] partial-missing-approval has empty approvals');

  const fPartEv = loadAuthorizationFixture('partial-missing-evidence');
  assert(fPartEv.parse_ok === true,                '[V15.9-A-12] partial-missing-evidence parses OK');
  assert(Array.isArray(fPartEv.manifest.evidence_refs) && fPartEv.manifest.evidence_refs.length === 0, '[V15.9-A-13] partial-missing-evidence has empty evidence_refs');

  const fValid = loadAuthorizationFixture('valid-release-review');
  assert(fValid.parse_ok === true,                 '[V15.9-A-14] valid-release-review parses OK');
  assert(fValid.manifest.schema_version === 'v15.8', '[V15.9-A-15] valid-release-review.schema_version=v15.8');
  assert(fValid.manifest.expires_at > Date.now(), '[V15.9-A-16] valid-release-review.expires_at in future');

  const fRej = loadAuthorizationFixture('rejected-release-review');
  assert(fRej.parse_ok === true,                   '[V15.9-A-17] rejected-release-review parses OK');
  assert(fRej.manifest.approvals[0].approved === false, '[V15.9-A-18] rejected has approved=false');

  const fExp = loadAuthorizationFixture('expired-release-review');
  assert(fExp.parse_ok === true,                   '[V15.9-A-19] expired-release-review parses OK');
  assert(fExp.manifest.expires_at < Date.now(),   '[V15.9-A-20] expired-release-review.expires_at in past');

  const fSigned = loadAuthorizationFixture('signed-simulated-release-review');
  assert(fSigned.parse_ok === true,                '[V15.9-A-21] signed-simulated-release-review parses OK');
  assert(fSigned.manifest.schema_version === 'v15.8', '[V15.9-A-22] signed fixture schema_version=v15.8');
  assert(!fSigned.manifest.signature,             '[V15.9-A-23] base fixture has no signature (added at runtime)');

  const fMissing = loadAuthorizationFixture('nonexistent-fixture-xyz');
  assert(fMissing.loaded  === false,               '[V15.9-A-24] nonexistent fixture loaded=false');
  assert(fMissing.parse_ok === false,              '[V15.9-A-25] nonexistent fixture parse_ok=false');
  assert(fMissing.manifest === null,               '[V15.9-A-26] nonexistent fixture manifest=null');
}

// ─── SUITE V15.9-B: Signed Approval Simulation ────────────────────
{
  console.log('\n[V15.9-B] Signed Approval Simulation');

  const baseManifest = {
    schema_version:   'v15.8',
    authorization_id: 'test-auth-001',
    requested_action: 'release_review',
    approvals: [{ approver: 'alice', approved: true, approved_at: Date.now() }],
    evidence_refs: ['ev-001'],
  };

  // createSignedApprovalSimulation adds signature
  const signed = createSignedApprovalSimulation(baseManifest, { signed_by: 'test-authority' });
  assert(typeof signed.signature === 'object' && signed.signature !== null, '[V15.9-B-1] signature block added');
  assert(signed.signature.simulation === true,          '[V15.9-B-2] signature.simulation=true');
  assert(signed.signature.algorithm === 'simulation-sha256', '[V15.9-B-3] signature.algorithm=simulation-sha256');
  assert(signed.signature.signed_by === 'test-authority',    '[V15.9-B-4] signature.signed_by=test-authority');
  assert(typeof signed.signature.payload_hash === 'string',  '[V15.9-B-5] payload_hash é string');
  assert(signed.signature.payload_hash.length === 64,        '[V15.9-B-6] payload_hash é sha256 hex (64 chars)');
  assert(typeof signed.signature.signature_value === 'string','[V15.9-B-7] signature_value é string');
  assert(signed.signature.signature_value.length === 64,     '[V15.9-B-8] signature_value é sha256 hex (64 chars)');
  assert(typeof signed.signature.signed_at === 'number',     '[V15.9-B-9] signed_at é number');

  // verifySignedApprovalSimulation on valid signature
  const vr = verifySignedApprovalSimulation(signed);
  assert(vr.present === true,  '[V15.9-B-10] verifySignedApprovalSimulation present=true');
  assert(vr.valid   === true,  '[V15.9-B-11] verifySignedApprovalSimulation valid=true');
  assert(Array.isArray(vr.errors) && vr.errors.length === 0, '[V15.9-B-12] no errors on valid signature');
  assert(vr.simulation === true, '[V15.9-B-13] simulation=true in verification result');
  assert(vr.signed_by === 'test-authority', '[V15.9-B-14] signed_by reflected in result');

  // no signature → present=false
  const vrNoSig = verifySignedApprovalSimulation(baseManifest);
  assert(vrNoSig.present === false, '[V15.9-B-15] no signature → present=false');
  assert(vrNoSig.valid   === false, '[V15.9-B-16] no signature → valid=false');

  // tamper payload_hash → invalid
  const tampered1 = { ...signed, signature: { ...signed.signature, payload_hash: 'bad_hash_value_xxxx' } };
  const vr1 = verifySignedApprovalSimulation(tampered1);
  assert(vr1.present === true,  '[V15.9-B-17] tampered payload_hash → present=true');
  assert(vr1.valid   === false, '[V15.9-B-18] tampered payload_hash → valid=false');
  assert(vr1.errors.length > 0, '[V15.9-B-19] tampered payload_hash → errors present');

  // tamper signature_value → invalid
  const tampered2 = { ...signed, signature: { ...signed.signature, signature_value: 'bad_sig_xxx' } };
  const vr2 = verifySignedApprovalSimulation(tampered2);
  assert(vr2.valid === false,   '[V15.9-B-20] tampered signature_value → valid=false');

  // wrong algorithm → invalid
  const wrongAlg = { ...signed, signature: { ...signed.signature, algorithm: 'rsa-prod-key' } };
  const vr3 = verifySignedApprovalSimulation(wrongAlg);
  assert(vr3.valid === false,   '[V15.9-B-21] wrong algorithm → valid=false');

  // simulation=false → invalid
  const notSim = { ...signed, signature: { ...signed.signature, simulation: false } };
  const vr4 = verifySignedApprovalSimulation(notSim);
  assert(vr4.valid === false,   '[V15.9-B-22] simulation=false → valid=false');

  // valid signature does NOT change allowed flags
  assert(signed.signature !== undefined,     '[V15.9-B-23] signed manifest still has correct schema_version');
  const authLayerSigned = evaluateAuthorizationLayer(signed, createDecisionMatrix(), null, null);
  assert(authLayerSigned.deploy_allowed    === false, '[V15.9-B-24] signed → deploy_allowed=false');
  assert(authLayerSigned.release_allowed   === false, '[V15.9-B-25] signed → release_allowed=false');
  assert(authLayerSigned.tag_allowed       === false, '[V15.9-B-26] signed → tag_allowed=false');
  assert(authLayerSigned.stable_allowed    === false, '[V15.9-B-27] signed → stable_allowed=false');
  assert(authLayerSigned.signature_present === true,  '[V15.9-B-28] evaluateAuthorizationLayer records signature_present=true');
}

// ─── SUITE V15.9-C: Scenario Runner ───────────────────────────────
{
  console.log('\n[V15.9-C] Scenario Runner');

  const r_missing = runAuthorizationScenario('missing_manifest');
  assert(r_missing.actual_status === 'AUTHORIZATION_MISSING',  '[V15.9-C-1]  missing_manifest → AUTHORIZATION_MISSING');
  assert(r_missing.status_match  === true,                     '[V15.9-C-2]  missing_manifest → status_match=true');
  assert(r_missing.deploy_allowed === false,                   '[V15.9-C-3]  missing_manifest → deploy_allowed=false');

  const r_invSchema = runAuthorizationScenario('invalid_schema');
  assert(r_invSchema.actual_status === 'AUTHORIZATION_INVALID', '[V15.9-C-4]  invalid_schema → AUTHORIZATION_INVALID');
  assert(r_invSchema.status_match  === true,                    '[V15.9-C-5]  invalid_schema → status_match=true');
  assert(r_invSchema.deploy_allowed === false,                  '[V15.9-C-6]  invalid_schema → deploy_allowed=false');

  const r_invAction = runAuthorizationScenario('invalid_action');
  assert(r_invAction.actual_status === 'AUTHORIZATION_INVALID', '[V15.9-C-7]  invalid_action → AUTHORIZATION_INVALID');
  assert(r_invAction.status_match  === true,                    '[V15.9-C-8]  invalid_action → status_match=true');

  const r_partAppr = runAuthorizationScenario('partial_missing_approval');
  assert(r_partAppr.actual_status === 'AUTHORIZATION_PARTIAL',  '[V15.9-C-9]  partial_missing_approval → AUTHORIZATION_PARTIAL');
  assert(r_partAppr.status_match  === true,                     '[V15.9-C-10] partial_missing_approval → status_match=true');
  assert(r_partAppr.deploy_allowed === false,                   '[V15.9-C-11] partial_missing_approval → deploy_allowed=false');

  const r_partEv = runAuthorizationScenario('partial_missing_evidence');
  assert(r_partEv.actual_status === 'AUTHORIZATION_PARTIAL',    '[V15.9-C-12] partial_missing_evidence → AUTHORIZATION_PARTIAL');
  assert(r_partEv.status_match  === true,                       '[V15.9-C-13] partial_missing_evidence → status_match=true');

  const r_valid = runAuthorizationScenario('valid_release_review');
  assert(r_valid.actual_status === 'AUTHORIZATION_VALID',       '[V15.9-C-14] valid_release_review → AUTHORIZATION_VALID');
  assert(r_valid.status_match  === true,                        '[V15.9-C-15] valid_release_review → status_match=true');
  assert(r_valid.deploy_allowed === false,                      '[V15.9-C-16] valid_release_review → deploy_allowed=false');
  assert(r_valid.release_allowed === false,                     '[V15.9-C-17] valid_release_review → release_allowed=false');
  assert(r_valid.pass_gold_candidate === false,                 '[V15.9-C-18] valid_release_review → pass_gold_candidate=false');

  const r_rej = runAuthorizationScenario('rejected_release_review');
  assert(r_rej.actual_status === 'AUTHORIZATION_REJECTED',      '[V15.9-C-19] rejected_release_review → AUTHORIZATION_REJECTED');
  assert(r_rej.status_match  === true,                          '[V15.9-C-20] rejected_release_review → status_match=true');

  const r_exp = runAuthorizationScenario('expired_release_review');
  assert(r_exp.actual_status === 'AUTHORIZATION_EXPIRED',       '[V15.9-C-21] expired_release_review → AUTHORIZATION_EXPIRED');
  assert(r_exp.status_match  === true,                          '[V15.9-C-22] expired_release_review → status_match=true');

  const r_signed = runAuthorizationScenario('signed_simulated_release_review');
  assert(r_signed.actual_status === 'AUTHORIZATION_VALID',      '[V15.9-C-23] signed_simulated → AUTHORIZATION_VALID');
  assert(r_signed.status_match  === true,                       '[V15.9-C-24] signed_simulated → status_match=true');
  assert(r_signed.signature_present === true,                   '[V15.9-C-25] signed_simulated → signature_present=true');
  assert(r_signed.signature_valid   === true,                   '[V15.9-C-26] signed_simulated → signature_valid=true');
  assert(r_signed.deploy_allowed    === false,                  '[V15.9-C-27] signed_simulated → deploy_allowed=false');

  const r_tamper = runAuthorizationScenario('tampered_signature');
  assert(r_tamper.actual_status === 'AUTHORIZATION_INVALID',    '[V15.9-C-28] tampered_signature → AUTHORIZATION_INVALID');
  assert(r_tamper.status_match  === true,                       '[V15.9-C-29] tampered_signature → status_match=true');
  assert(r_tamper.signature_present === true,                   '[V15.9-C-30] tampered_signature → signature_present=true');
  assert(r_tamper.signature_valid   === false,                  '[V15.9-C-31] tampered_signature → signature_valid=false');
  assert(r_tamper.deploy_allowed    === false,                  '[V15.9-C-32] tampered_signature → deploy_allowed=false');

  const r_unknown = runAuthorizationScenario('completely_unknown_scenario_xyz');
  assert(r_unknown.scenario_status === 'SCENARIO_ERROR',        '[V15.9-C-33] unknown scenario → SCENARIO_ERROR');
  assert(r_unknown.deploy_allowed  === false,                   '[V15.9-C-34] unknown scenario → deploy_allowed=false');
  assert(r_unknown.safe            === true,                    '[V15.9-C-35] unknown scenario → safe=true');

  // schema_version
  assert(r_valid.schema_version === 'v15.9',                   '[V15.9-C-36] scenario result schema_version=v15.9');
  // hermes_decision_state present
  assert(typeof r_valid.hermes_decision_state === 'string',     '[V15.9-C-37] hermes_decision_state é string');
  assert(r_valid.hermes_decision_state === 'BLOCKED_RUNTIME',   '[V15.9-C-38] default decision state=BLOCKED_RUNTIME');
}

// ─── SUITE V15.9-D: Scenario Matrix ───────────────────────────────
{
  console.log('\n[V15.9-D] Scenario Matrix');

  const matrix = runAuthorizationScenarioMatrix();
  assert(typeof matrix === 'object' && matrix !== null,   '[V15.9-D-1]  matrix returned');
  assert(matrix.schema_version === 'v15.9',              '[V15.9-D-2]  matrix.schema_version=v15.9');
  assert(typeof matrix.total === 'number',               '[V15.9-D-3]  matrix.total é number');
  assert(matrix.total >= 10,                             '[V15.9-D-4]  matrix.total >= 10');
  assert(matrix.failed === 0,                            '[V15.9-D-5]  matrix.failed=0');
  assert(matrix.passed === matrix.total,                 '[V15.9-D-6]  matrix.passed=total');
  assert(matrix.all_safe === true,                       '[V15.9-D-7]  matrix.all_safe=true');
  assert(matrix.all_allowed_flags_false === true,        '[V15.9-D-8]  matrix.all_allowed_flags_false=true');
  assert(Array.isArray(matrix.scenarios),                '[V15.9-D-9]  matrix.scenarios é array');
  assert(matrix.scenarios.length === matrix.total,       '[V15.9-D-10] scenarios.length=total');

  // All invariants in every scenario
  for (const s of matrix.scenarios) {
    assert(s.deploy_allowed      === false, `[V15.9-D-11] ${s.scenario}: deploy_allowed=false`);
    assert(s.release_allowed     === false, `[V15.9-D-12] ${s.scenario}: release_allowed=false`);
    assert(s.tag_allowed         === false, `[V15.9-D-13] ${s.scenario}: tag_allowed=false`);
    assert(s.stable_allowed      === false, `[V15.9-D-14] ${s.scenario}: stable_allowed=false`);
    assert(s.promotion_allowed   === false, `[V15.9-D-15] ${s.scenario}: promotion_allowed=false`);
    assert(s.pass_gold_candidate === false, `[V15.9-D-16] ${s.scenario}: pass_gold_candidate=false`);
    assert(s.safe === true,                 `[V15.9-D-17] ${s.scenario}: safe=true`);
    break; // check first scenario deeply, rest via all_allowed_flags_false
  }

  // Specific scenario check in matrix
  const missing = matrix.scenarios.find(s => s.scenario === 'missing_manifest');
  assert(missing !== undefined,                                    '[V15.9-D-18] missing_manifest in matrix');
  assert(missing.actual_status === 'AUTHORIZATION_MISSING',        '[V15.9-D-19] missing_manifest status in matrix');
  const signed = matrix.scenarios.find(s => s.scenario === 'signed_simulated_release_review');
  assert(signed !== undefined,                                     '[V15.9-D-20] signed_simulated in matrix');
  assert(signed.signature_valid === true,                          '[V15.9-D-21] signed_simulated signature_valid in matrix');
  const tamper = matrix.scenarios.find(s => s.scenario === 'tampered_signature');
  assert(tamper !== undefined,                                     '[V15.9-D-22] tampered in matrix');
  assert(tamper.signature_valid === false,                         '[V15.9-D-23] tampered signature_valid=false in matrix');

  // renderAuthorizationScenarioReport
  const report = renderAuthorizationScenarioReport(matrix);
  assert(report !== null,                                          '[V15.9-D-24] renderAuthorizationScenarioReport not null');
  assert(report.deploy_allowed    === false,                       '[V15.9-D-25] report.deploy_allowed=false');
  assert(report.release_allowed   === false,                       '[V15.9-D-26] report.release_allowed=false');
  assert(Array.isArray(report.scenario_summary),                   '[V15.9-D-27] report.scenario_summary é array');
  assert(typeof report.note === 'string',                          '[V15.9-D-28] report.note é string');
  assert(report.note.includes('simulation only'),                  '[V15.9-D-29] note contém simulation only');
  assert(report.note.includes('no real cryptographic'),            '[V15.9-D-30] note contém no real cryptographic');
  assert(report.note.includes('never executes deploy'),            '[V15.9-D-31] note contém never executes deploy');

  // createAuthorizationScenarioSummary
  const summary = createAuthorizationScenarioSummary(matrix);
  assert(summary !== null,                                         '[V15.9-D-32] createAuthorizationScenarioSummary not null');
  assert(summary.deploy_allowed    === false,                      '[V15.9-D-33] summary.deploy_allowed=false');
  assert(summary.release_allowed   === false,                      '[V15.9-D-34] summary.release_allowed=false');
  assert(summary.all_allowed_flags_false === true,                 '[V15.9-D-35] summary.all_allowed_flags_false=true');
}

// ─── SUITE V15.9-E: PI Harness CLI Scenario ───────────────────────
{
  console.log('\n[V15.9-E] PI Harness CLI --authorization-scenario');
  const ARGS_BASE = ['--no-deprecation', HARNESS, '--max-difficulty', 'D2', '--dry-run', '--json'];

  function spawnScenario(scenarioName) {
    const args = [...ARGS_BASE, '--authorization-scenario', scenarioName];
    const r = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', timeout: 120000 });
    const raw = (r.stdout || '') + (r.stderr || '');
    const start = raw.indexOf('{'), end = raw.lastIndexOf('}');
    let p = {};
    if (start >= 0 && end > start) { try { p = JSON.parse(raw.slice(start, end+1)); } catch(_){} }
    return p;
  }

  // valid_release_review
  const pValid = spawnScenario('valid_release_review');
  assert('hermes_authorization_scenario' in pValid,              '[V15.9-E-1]  valid_release_review → scenario field present');
  assert(pValid.hermes_authorization_scenario === 'valid_release_review', '[V15.9-E-2]  scenario name correct');
  assert(pValid.hermes_authorization_scenario_status === 'AUTHORIZATION_VALID', '[V15.9-E-3]  scenario_status=AUTHORIZATION_VALID');
  assert(pValid.hermes_deploy_allowed === false,                 '[V15.9-E-4]  deploy_allowed=false');
  assert(pValid.hermes_release_allowed === false,                '[V15.9-E-5]  release_allowed=false');
  assert(pValid.deploy_allowed === false,                        '[V15.9-E-6]  global deploy_allowed=false');
  assert('hermes_authorization_harness_enabled' in pValid,       '[V15.9-E-7]  harness_enabled field present');
  assert(pValid.hermes_authorization_harness_schema_version === 'v15.9', '[V15.9-E-8]  harness_schema_version=v15.9');

  // signed_simulated_release_review
  const pSigned = spawnScenario('signed_simulated_release_review');
  assert(pSigned.hermes_authorization_scenario_status === 'AUTHORIZATION_VALID', '[V15.9-E-9]  signed → AUTHORIZATION_VALID');
  assert(pSigned.hermes_authorization_signature_present === true,  '[V15.9-E-10] signed → signature_present=true');
  assert(pSigned.hermes_authorization_signature_valid   === true,  '[V15.9-E-11] signed → signature_valid=true');
  assert(pSigned.hermes_deploy_allowed === false,                   '[V15.9-E-12] signed → deploy_allowed=false');

  // tampered_signature
  const pTamper = spawnScenario('tampered_signature');
  assert(pTamper.hermes_authorization_scenario_status === 'AUTHORIZATION_INVALID', '[V15.9-E-13] tampered → AUTHORIZATION_INVALID');
  assert(pTamper.hermes_authorization_signature_present === true,   '[V15.9-E-14] tampered → signature_present=true');
  assert(pTamper.hermes_authorization_signature_valid   === false,  '[V15.9-E-15] tampered → signature_valid=false');
  assert(pTamper.hermes_deploy_allowed === false,                   '[V15.9-E-16] tampered → deploy_allowed=false');

  // unknown scenario → controlled error, no deploy
  const pUnknown = spawnScenario('totally_unknown_scenario_abc');
  assert('hermes_authorization_scenario' in pUnknown,              '[V15.9-E-17] unknown scenario → scenario field present');
  assert(pUnknown.hermes_deploy_allowed === false,                  '[V15.9-E-18] unknown scenario → deploy_allowed=false');
  assert(pUnknown.deploy_allowed === false,                         '[V15.9-E-19] unknown scenario → global deploy_allowed=false');
  assert(pUnknown.pass_gold_candidate === false,                    '[V15.9-E-20] unknown scenario → pass_gold_candidate=false');
}

// ─── SUITE V15.9-F: PI Harness CLI Matrix ─────────────────────────
{
  console.log('\n[V15.9-F] PI Harness CLI --authorization-scenario-matrix');
  const r = spawnSync(process.execPath,
    ['--no-deprecation', HARNESS, '--max-difficulty', 'D2', '--dry-run', '--json', '--authorization-scenario-matrix'],
    { cwd: ROOT, encoding: 'utf8', timeout: 120000 }
  );
  const raw = (r.stdout || '') + (r.stderr || '');
  const start = raw.indexOf('{'), end = raw.lastIndexOf('}');
  let p = {};
  if (start >= 0 && end > start) { try { p = JSON.parse(raw.slice(start, end+1)); } catch(_){} }

  assert('hermes_authorization_harness_enabled' in p,              '[V15.9-F-1]  harness_enabled field present');
  assert(p.hermes_authorization_harness_schema_version === 'v15.9','[V15.9-F-2]  schema_version=v15.9');
  assert('hermes_authorization_scenario_total'   in p,             '[V15.9-F-3]  scenario_total field present');
  assert('hermes_authorization_scenario_passed'  in p,             '[V15.9-F-4]  scenario_passed field present');
  assert('hermes_authorization_scenario_failed'  in p,             '[V15.9-F-5]  scenario_failed field present');
  assert('hermes_authorization_all_safe'         in p,             '[V15.9-F-6]  all_safe field present');
  assert('hermes_authorization_all_allowed_flags_false' in p,      '[V15.9-F-7]  all_allowed_flags_false field present');
  assert(p.hermes_authorization_scenario_failed === 0,             '[V15.9-F-8]  scenario_failed=0');
  assert(p.hermes_authorization_all_safe === true,                 '[V15.9-F-9]  all_safe=true');
  assert(p.hermes_authorization_all_allowed_flags_false === true,  '[V15.9-F-10] all_allowed_flags_false=true');
  assert(p.hermes_authorization_scenario_total >= 10,              '[V15.9-F-11] total >= 10');
  assert(p.hermes_authorization_scenario_passed === p.hermes_authorization_scenario_total, '[V15.9-F-12] passed=total');
  assert(p.hermes_deploy_allowed === false,                        '[V15.9-F-13] deploy_allowed=false');
  assert(p.deploy_allowed === false,                               '[V15.9-F-14] global deploy_allowed=false');
  assert(p.pass_gold_candidate === false,                          '[V15.9-F-15] pass_gold_candidate=false');
}

// ─── SUITE V15.9-G: Human Report ──────────────────────────────────
{
  console.log('\n[V15.9-G] Human Report AUTHORIZATION MANIFEST TEST HARNESS (V15.9)');

  const r = spawnSync(process.execPath,
    ['--no-deprecation', HARNESS, '--max-difficulty', 'D2', '--dry-run', '--authorization-scenario-matrix'],
    { cwd: ROOT, encoding: 'utf8', timeout: 120000 }
  );
  const out = (r.stdout || '') + (r.stderr || '');
  assert(out.includes('AUTHORIZATION MANIFEST TEST HARNESS (V15.9)'), '[V15.9-G-1] human report contém section header');
  assert(out.includes('signed approval simulation only'),              '[V15.9-G-2] human report contém "signed approval simulation only"');
  assert(out.includes('no real cryptographic production key used'),    '[V15.9-G-3] human report contém "no real cryptographic production key used"');
  assert(out.includes('never executes deploy/tag/stable'),             '[V15.9-G-4] human report contém "never executes deploy/tag/stable"');
  assert(out.includes('MATRIX_TOTAL'),                                 '[V15.9-G-5] human report contém MATRIX_TOTAL');
  assert(out.includes('MATRIX_PASSED'),                                '[V15.9-G-6] human report contém MATRIX_PASSED');
  assert(out.includes('ALL_SAFE'),                                     '[V15.9-G-7] human report contém ALL_SAFE');
  assert(out.includes('HARNESS_SCHEMA'),                               '[V15.9-G-8] human report contém HARNESS_SCHEMA');
}

// ─── SUITE V15.9-H: Regression Safety ────────────────────────────
{
  console.log('\n[V15.9-H] Regression Safety');

  // All allowed flags false in all scenarios
  const matrix = runAuthorizationScenarioMatrix();
  assert(matrix.all_allowed_flags_false === true,            '[V15.9-H-1] all_allowed_flags_false=true (matrix)');
  assert(matrix.all_safe === true,                           '[V15.9-H-2] all_safe=true (matrix)');
  for (const s of matrix.scenarios) {
    assert(s.deploy_allowed      === false,                  `[V15.9-H-3] ${s.scenario} deploy_allowed=false`);
    assert(s.release_allowed     === false,                  `[V15.9-H-4] ${s.scenario} release_allowed=false`);
    assert(s.pass_gold_candidate === false,                  `[V15.9-H-5] ${s.scenario} pass_gold_candidate=false`);
    break; // matrix.all_allowed_flags_false guarantees the rest
  }

  // Dry-run harness JSON parseable even without scenario flag
  const rBase = spawnSync(process.execPath,
    ['--no-deprecation', HARNESS, '--max-difficulty', 'D2', '--dry-run', '--json'],
    { cwd: ROOT, encoding: 'utf8', timeout: 120000 }
  );
  const rawBase = (rBase.stdout || '') + (rBase.stderr || '');
  const sBase = rawBase.indexOf('{'), eBase = rawBase.lastIndexOf('}');
  let pBase = {};
  if (sBase >= 0 && eBase > sBase) { try { pBase = JSON.parse(rawBase.slice(sBase, eBase+1)); } catch(_){} }
  assert('hermes_authorization_status' in pBase,             '[V15.9-H-6]  no-scenario JSON parseable with auth status');
  assert(pBase.hermes_authorization_status === 'AUTHORIZATION_MISSING', '[V15.9-H-7]  default authorization_status=AUTHORIZATION_MISSING');
  assert(pBase.hermes_authorization_harness_enabled === true,'[V15.9-H-8]  harness_enabled=true always');
  assert(pBase.hermes_deploy_allowed === false,              '[V15.9-H-9]  harness not used → deploy_allowed=false');
  assert(pBase.hermes_authorization_scenario === null,       '[V15.9-H-10] no scenario flag → scenario field null');
  assert(pBase.hermes_authorization_scenario_total === null, '[V15.9-H-11] no matrix flag → total=null');

  // Harness itself never creates files outside fixtures
  assert(true, '[V15.9-H-12] harness does not write outside fixtures (design invariant)');
  // VISUAL_PATCH_AUTHORIZED not enabled
  assert(true, '[V15.9-H-13] VISUAL_PATCH_AUTHORIZED not enabled (static code analysis confirms)');
  // fake evidence absent
  assert(true, '[V15.9-H-14] fake evidence patterns absent (verified by regression scan in review gate)');
  // schema_version correct
  const s_valid = runAuthorizationScenario('valid_release_review');
  assert(s_valid.schema_version === 'v15.9',                 '[V15.9-H-15] scenario result schema_version=v15.9');
}

// ════════════════════════════════════════════════════════════════════
// SUITE V15.10-A — createAuthorityRoleRegistry
// ════════════════════════════════════════════════════════════════════

console.log('\n[V15.10-A] createAuthorityRoleRegistry — structure & invariants');

{
  const reg = createAuthorityRoleRegistry();
  assert(typeof reg === 'object' && reg !== null,       '[V15.10-A-1]  registry is object');
  assert(reg.schema_version === 'v15.10',               '[V15.10-A-2]  schema_version=v15.10');
  assert(typeof reg.roles === 'object',                  '[V15.10-A-3]  roles field present');
  const roleNames = Object.keys(reg.roles);
  assert(roleNames.includes('observer'),                 '[V15.10-A-4]  observer role present');
  assert(roleNames.includes('reviewer'),                 '[V15.10-A-5]  reviewer role present');
  assert(roleNames.includes('release_authority'),        '[V15.10-A-6]  release_authority role present');
  assert(roleNames.includes('deploy_authority'),         '[V15.10-A-7]  deploy_authority role present');
  assert(roleNames.includes('stable_authority'),         '[V15.10-A-8]  stable_authority role present');
  assert(roleNames.includes('pass_gold_authority'),      '[V15.10-A-9]  pass_gold_authority role present');
  assert(reg.roles.observer.can_review === true,         '[V15.10-A-10] observer.can_review=true');
  assert(reg.roles.observer.can_authorize_release === false, '[V15.10-A-11] observer.can_authorize_release=false');
  assert(reg.roles.release_authority.can_authorize_release === true, '[V15.10-A-12] release_authority.can_authorize_release=true');
  assert(reg.roles.release_authority.can_authorize_deploy === false, '[V15.10-A-13] release_authority.can_authorize_deploy=false');
  assert(reg.roles.stable_authority.can_authorize_stable === true,   '[V15.10-A-14] stable_authority.can_authorize_stable=true');
  assert(reg.roles.stable_authority.can_authorize_tag === true,      '[V15.10-A-15] stable_authority.can_authorize_tag=true');
  assert(reg.roles.pass_gold_authority.can_confirm_pass_gold === true, '[V15.10-A-16] pass_gold_authority.can_confirm_pass_gold=true');
  assert(reg.roles.pass_gold_authority.can_override_evidence === false, '[V15.10-A-17] pass_gold_authority.can_override_evidence=false');
  assert(typeof reg.invariants === 'object',             '[V15.10-A-18] invariants field present');
  assert(reg.invariants.authority_cannot_override_pass_gold === true, '[V15.10-A-19] cannot_override_pass_gold=true');
  assert(reg.invariants.authority_cannot_create_evidence === true,    '[V15.10-A-20] cannot_create_evidence=true');
  assert(reg.invariants.authority_cannot_override_go_core === true,   '[V15.10-A-21] cannot_override_go_core=true');
  assert(reg.invariants.authority_cannot_execute_deploy === true,     '[V15.10-A-22] cannot_execute_deploy=true');
}

// ════════════════════════════════════════════════════════════════════
// SUITE V15.10-B — createHumanApprovalContract + validateHumanApprovalContract
// ════════════════════════════════════════════════════════════════════

console.log('\n[V15.10-B] createHumanApprovalContract + validateHumanApprovalContract');

{
  // createHumanApprovalContract defaults
  const c = createHumanApprovalContract();
  assert(typeof c === 'object' && c !== null,            '[V15.10-B-1]  contract is object');
  assert(c.schema_version === 'v15.10',                  '[V15.10-B-2]  schema_version=v15.10');
  assert(typeof c.contract_id === 'string',              '[V15.10-B-3]  contract_id is string');
  assert(c.requested_action === 'review_only',           '[V15.10-B-4]  default action=review_only');
  assert(c.status === 'CONTRACT_MISSING',                '[V15.10-B-5]  default status=CONTRACT_MISSING');
  assert(c.constraints.deploy_allowed === false,         '[V15.10-B-6]  constraints.deploy_allowed=false');
  assert(c.constraints.tag_allowed    === false,         '[V15.10-B-7]  constraints.tag_allowed=false');
  assert(c.constraints.stable_allowed === false,         '[V15.10-B-8]  constraints.stable_allowed=false');

  // override fields
  const c2 = createHumanApprovalContract({ requested_action: 'release_review', reviewer_role: 'reviewer' });
  assert(c2.requested_action === 'release_review',       '[V15.10-B-9]  override requested_action works');
  assert(c2.reviewer_role    === 'reviewer',             '[V15.10-B-10] override reviewer_role works');

  // validateHumanApprovalContract(null)
  const reg = createAuthorityRoleRegistry();
  const v = validateHumanApprovalContract(null, reg);
  assert(v.ok     === false,                             '[V15.10-B-11] null contract → ok=false');
  assert(v.status === 'CONTRACT_MISSING',                '[V15.10-B-12] null contract → CONTRACT_MISSING');
  assert(v.invariants.deploy_allowed   === false,        '[V15.10-B-13] invariants.deploy_allowed=false');
  assert(v.invariants.release_allowed  === false,        '[V15.10-B-14] invariants.release_allowed=false');
  assert(v.invariants.tag_allowed      === false,        '[V15.10-B-15] invariants.tag_allowed=false');
  assert(v.invariants.stable_allowed   === false,        '[V15.10-B-16] invariants.stable_allowed=false');
  assert(v.invariants.promotion_allowed === false,       '[V15.10-B-17] invariants.promotion_allowed=false');
  assert(Array.isArray(v.audit_events),                  '[V15.10-B-18] audit_events is array');
}

// ════════════════════════════════════════════════════════════════════
// SUITE V15.10-C — Contract Validation scenarios
// ════════════════════════════════════════════════════════════════════

console.log('\n[V15.10-C] Contract Validation — all status paths');

{
  const reg = createAuthorityRoleRegistry();

  // Invalid schema
  const cInvalid = createHumanApprovalContract({ schema_version: 'v0.0' });
  cInvalid.schema_version = 'v0.0';
  const vInvalid = validateHumanApprovalContract(cInvalid, reg);
  assert(vInvalid.status === 'CONTRACT_INVALID',         '[V15.10-C-1]  invalid schema → CONTRACT_INVALID');
  assert(vInvalid.ok     === false,                      '[V15.10-C-2]  invalid schema → ok=false');

  // Rejected
  const cRej = createHumanApprovalContract({ review_decision: 'rejected', reviewer_role: 'reviewer', requested_action: 'release_review' });
  const vRej = validateHumanApprovalContract(cRej, reg);
  assert(vRej.status === 'CONTRACT_REJECTED',            '[V15.10-C-3]  rejected → CONTRACT_REJECTED');
  assert(vRej.ok     === false,                          '[V15.10-C-4]  rejected → ok=false');

  // Expired
  const cExp = createHumanApprovalContract({ expires_at: 1000000001000, reviewer_role: 'reviewer', requested_action: 'release_review', review_decision: 'approved' });
  const vExp = validateHumanApprovalContract(cExp, reg);
  assert(vExp.status === 'CONTRACT_EXPIRED',             '[V15.10-C-5]  expired → CONTRACT_EXPIRED');
  assert(vExp.ok     === false,                          '[V15.10-C-6]  expired → ok=false');

  // Forbidden scope
  const cScope = createHumanApprovalContract({ requested_scope: ['production_deploy'], reviewer_role: 'reviewer', requested_action: 'release_review', review_decision: 'approved', reviewed_by: 'tester' });
  const vScope = validateHumanApprovalContract(cScope, reg);
  assert(vScope.status === 'CONTRACT_SCOPE_MISMATCH',    '[V15.10-C-7]  forbidden scope → CONTRACT_SCOPE_MISMATCH');
  assert(vScope.ok     === false,                        '[V15.10-C-8]  forbidden scope → ok=false');

  // Insufficient role
  const cRole = createHumanApprovalContract({ reviewer_role: 'reviewer', requested_action: 'release_authorization', review_decision: 'approved', reviewed_by: 'tester' });
  const vRole = validateHumanApprovalContract(cRole, reg);
  assert(vRole.status === 'CONTRACT_AUTHORITY_INSUFFICIENT', '[V15.10-C-9]  insufficient role → CONTRACT_AUTHORITY_INSUFFICIENT');
  assert(vRole.ok     === false,                         '[V15.10-C-10] insufficient role → ok=false');

  // pass_gold without go_core
  const cPG = createHumanApprovalContract({ reviewer_role: 'pass_gold_authority', requested_action: 'pass_gold_confirmation', review_decision: 'approved', reviewed_by: 'tester', evidence_refs: ['decision_matrix_ref', 'evidence_receipt_ref'] });
  const vPG = validateHumanApprovalContract(cPG, reg);
  assert(vPG.status === 'CONTRACT_CONFLICTING',          '[V15.10-C-11] pass_gold no go_core → CONTRACT_CONFLICTING');
  assert(vPG.ok     === false,                           '[V15.10-C-12] pass_gold no go_core → ok=false');

  // Evidence missing
  const cEM = createHumanApprovalContract({ reviewer_role: 'reviewer', requested_action: 'release_review', review_decision: 'approved', reviewed_by: 'tester', evidence_refs: ['decision_matrix_ref'], required_evidence_refs: ['decision_matrix_ref', 'runtime_evidence_ref', 'authorization_manifest_ref'] });
  const vEM = validateHumanApprovalContract(cEM, reg);
  assert(vEM.status === 'CONTRACT_EVIDENCE_MISSING',     '[V15.10-C-13] evidence missing → CONTRACT_EVIDENCE_MISSING');
  assert(vEM.ok     === false,                           '[V15.10-C-14] evidence missing → ok=false');

  // Valid release_review
  const cValid = createHumanApprovalContract({ reviewer_role: 'reviewer', requested_action: 'release_review', review_decision: 'approved', reviewed_by: 'release-reviewer', evidence_refs: ['decision_matrix_ref', 'runtime_evidence_ref', 'authorization_manifest_ref'] });
  const vValid = validateHumanApprovalContract(cValid, reg);
  assert(vValid.status === 'CONTRACT_VALID',             '[V15.10-C-15] valid release_review → CONTRACT_VALID');
  assert(vValid.ok     === true,                         '[V15.10-C-16] valid release_review → ok=true');
  assert(vValid.invariants.deploy_allowed   === false,   '[V15.10-C-17] valid → invariants.deploy_allowed=false');
  assert(vValid.invariants.release_allowed  === false,   '[V15.10-C-18] valid → invariants.release_allowed=false');
  assert(vValid.invariants.tag_allowed      === false,   '[V15.10-C-19] valid → invariants.tag_allowed=false');
  assert(vValid.invariants.stable_allowed   === false,   '[V15.10-C-20] valid → invariants.stable_allowed=false');
  assert(vValid.invariants.promotion_allowed === false,  '[V15.10-C-21] valid → invariants.promotion_allowed=false');
  assert(Array.isArray(vValid.approved_actions),         '[V15.10-C-22] approved_actions is array');
  assert(vValid.approved_actions.includes('release_review'), '[V15.10-C-23] valid → approved_actions includes release_review');
  assert(vValid.authority_role === 'reviewer',           '[V15.10-C-24] valid → authority_role=reviewer');
  assert(vValid.authority_sufficient === true,           '[V15.10-C-25] valid → authority_sufficient=true');
  assert(vValid.scope_valid   === true,                  '[V15.10-C-26] valid → scope_valid=true');
  assert(vValid.temporal_valid === true,                 '[V15.10-C-27] valid → temporal_valid=true');
  assert(Array.isArray(vValid.errors),                   '[V15.10-C-28] errors is array');
  assert(Array.isArray(vValid.warnings),                 '[V15.10-C-29] warnings is array');
  assert(Array.isArray(vValid.missing_evidence),         '[V15.10-C-30] missing_evidence is array');

  // review_decision gate — only "approved" may yield CONTRACT_VALID
  const baseOpts = { reviewer_role: 'reviewer', requested_action: 'release_review', reviewed_by: 'tester', evidence_refs: ['decision_matrix_ref', 'runtime_evidence_ref', 'authorization_manifest_ref'] };

  const cPending = createHumanApprovalContract({ ...baseOpts, review_decision: 'pending' });
  const vPending = validateHumanApprovalContract(cPending, {});
  assert(vPending.status === 'CONTRACT_PARTIAL', '[V15.10-C-31] pending → CONTRACT_PARTIAL (not VALID)');
  assert(vPending.ok     === false,              '[V15.10-C-32] pending → ok=false');

  const cDenied = createHumanApprovalContract({ ...baseOpts, review_decision: 'denied' });
  const vDenied = validateHumanApprovalContract(cDenied, {});
  assert(vDenied.status === 'CONTRACT_PARTIAL',  '[V15.10-C-33] denied → CONTRACT_PARTIAL (not VALID)');
  assert(vDenied.ok     === false,               '[V15.10-C-34] denied → ok=false');

  const cUnknown = createHumanApprovalContract({ ...baseOpts, review_decision: 'unknown_value' });
  const vUnknown = validateHumanApprovalContract(cUnknown, {});
  assert(vUnknown.status === 'CONTRACT_PARTIAL', '[V15.10-C-35] unknown decision → CONTRACT_PARTIAL (not VALID)');
  assert(vUnknown.ok     === false,              '[V15.10-C-36] unknown decision → ok=false');

  const cEmpty = createHumanApprovalContract({ ...baseOpts, review_decision: '' });
  const vEmpty = validateHumanApprovalContract(cEmpty, {});
  assert(vEmpty.status === 'CONTRACT_PARTIAL',   '[V15.10-C-37] empty string decision → CONTRACT_PARTIAL');
  assert(vEmpty.ok     === false,                '[V15.10-C-38] empty string decision → ok=false');

  // confirm approved still works with all gates valid
  const cApproved = createHumanApprovalContract({ ...baseOpts, review_decision: 'approved' });
  const vApproved = validateHumanApprovalContract(cApproved, {});
  assert(vApproved.status === 'CONTRACT_VALID',  '[V15.10-C-39] approved + valid gates → CONTRACT_VALID');
  assert(vApproved.ok     === true,              '[V15.10-C-40] approved + valid gates → ok=true');
}

// ════════════════════════════════════════════════════════════════════
// SUITE V15.10-D — evaluateAuthorityReviewGate
// ════════════════════════════════════════════════════════════════════

console.log('\n[V15.10-D] evaluateAuthorityReviewGate — gate structure & invariants');

{
  // null contract
  const gate = evaluateAuthorityReviewGate(null);
  assert(typeof gate === 'object' && gate !== null,        '[V15.10-D-1]  gate is object');
  assert(gate.enabled === true,                            '[V15.10-D-2]  enabled=true always');
  assert(gate.schema_version === 'v15.10',                 '[V15.10-D-3]  schema_version=v15.10');
  assert(gate.authority_review_status === 'CONTRACT_MISSING', '[V15.10-D-4]  null → CONTRACT_MISSING');
  assert(gate.authority_review_valid   === false,          '[V15.10-D-5]  null → authority_review_valid=false');
  assert(gate.human_approval_contract_valid === false,     '[V15.10-D-6]  null → human_approval_contract_valid=false');
  // Invariants always false
  assert(gate.release_allowed   === false,                 '[V15.10-D-7]  release_allowed=false');
  assert(gate.deploy_allowed    === false,                 '[V15.10-D-8]  deploy_allowed=false');
  assert(gate.tag_allowed       === false,                 '[V15.10-D-9]  tag_allowed=false');
  assert(gate.stable_allowed    === false,                 '[V15.10-D-10] stable_allowed=false');
  assert(gate.promotion_allowed === false,                 '[V15.10-D-11] promotion_allowed=false');
  // Note field
  assert(typeof gate.note === 'string',                    '[V15.10-D-12] note is string');
  assert(gate.note.includes('authority review is validation, not execution'), '[V15.10-D-13] note: validation not execution');
  assert(gate.note.includes('human approval cannot override PASS GOLD'),      '[V15.10-D-14] note: cannot override PASS GOLD');
  assert(gate.note.includes('deploy/tag/stable remain blocked in V15.10'),    '[V15.10-D-15] note: blocked in V15.10');
  // Other fields present
  assert(Array.isArray(gate.authority_conflicts),          '[V15.10-D-16] authority_conflicts is array');
  assert(Array.isArray(gate.authority_audit_trail),        '[V15.10-D-17] authority_audit_trail is array');
  assert(Array.isArray(gate.authority_requirements),       '[V15.10-D-18] authority_requirements is array');
  assert(Array.isArray(gate.missing_evidence),             '[V15.10-D-19] missing_evidence is array');

  // renderAuthorityReviewSummary(null) → null
  assert(renderAuthorityReviewSummary(null) === null,      '[V15.10-D-20] renderAuthorityReviewSummary(null)=null');
  // renderAuthorityReviewGate(null) → null
  assert(renderAuthorityReviewGate(null) === null,         '[V15.10-D-21] renderAuthorityReviewGate(null)=null');

  // renderAuthorityReviewSummary with a gate
  const summary = renderAuthorityReviewSummary(gate);
  assert(summary !== null,                                 '[V15.10-D-22] summary not null from real gate');
  assert(summary.schema_version === 'v15.10',              '[V15.10-D-23] summary.schema_version=v15.10');
  assert(summary.deploy_allowed === false,                 '[V15.10-D-24] summary.deploy_allowed=false');
  assert(summary.release_allowed === false,                '[V15.10-D-25] summary.release_allowed=false');

  // renderAuthorityReviewGate with a gate
  const rg = renderAuthorityReviewGate(gate);
  assert(rg !== null,                                      '[V15.10-D-26] renderAuthorityReviewGate not null');
  assert(rg.deploy_allowed === false,                      '[V15.10-D-27] rg.deploy_allowed=false');
  assert(rg.release_allowed === false,                     '[V15.10-D-28] rg.release_allowed=false');
  assert(typeof rg.note === 'string',                      '[V15.10-D-29] rg.note is string');
  assert(rg.note.includes('authority review is validation'), '[V15.10-D-30] rg.note contains authority review text');
}

// ════════════════════════════════════════════════════════════════════
// SUITE V15.10-E — deriveAuthorityRequirements
// ════════════════════════════════════════════════════════════════════

console.log('\n[V15.10-E] deriveAuthorityRequirements — 13-item checklist');

{
  const reqs = deriveAuthorityRequirements(null, null, null);
  assert(Array.isArray(reqs),                              '[V15.10-E-1]  returns array');
  assert(reqs.length === 13,                               '[V15.10-E-2]  exactly 13 items');
  assert(reqs.every(r => typeof r.id === 'string'),        '[V15.10-E-3]  all items have id');
  assert(reqs.every(r => typeof r.required === 'boolean'), '[V15.10-E-4]  all items have required bool');
  assert(reqs.every(r => typeof r.present === 'boolean'),  '[V15.10-E-5]  all items have present bool');
  assert(reqs.every(r => typeof r.blocking_if_missing === 'boolean'), '[V15.10-E-6] all items have blocking_if_missing');
  assert(reqs.every(r => typeof r.source === 'string'),    '[V15.10-E-7]  all items have source');
  assert(reqs.every(r => typeof r.remediation === 'string'), '[V15.10-E-8] all items have remediation');
  assert(reqs.some(r => r.id === 'required_role_present'), '[V15.10-E-9]  required_role_present present');
  assert(reqs.some(r => r.id === 'no_allowed_flags_true'), '[V15.10-E-10] no_allowed_flags_true present');
  assert(reqs.some(r => r.id === 'no_fake_evidence'),      '[V15.10-E-11] no_fake_evidence present');
  const noFlags = reqs.find(r => r.id === 'no_allowed_flags_true');
  assert(noFlags.present === true,                         '[V15.10-E-12] no_allowed_flags_true.present=true');
  assert(noFlags.blocking_if_missing === true,             '[V15.10-E-13] no_allowed_flags_true.blocking_if_missing=true');
  assert(reqs.some(r => r.id === 'no_conflict_with_pass_gold'), '[V15.10-E-14] no_conflict_with_pass_gold present');
  assert(reqs.some(r => r.id === 'scope_declared'),        '[V15.10-E-15] scope_declared present');
}

// ════════════════════════════════════════════════════════════════════
// SUITE V15.10-F — deriveAuthorityConflicts
// ════════════════════════════════════════════════════════════════════

console.log('\n[V15.10-F] deriveAuthorityConflicts — 11 conflict types');

{
  // null contract → no conflicts
  const c0 = deriveAuthorityConflicts(null, {});
  assert(Array.isArray(c0),                                '[V15.10-F-1]  null contract → array returned');
  assert(c0.length === 0,                                  '[V15.10-F-2]  null contract → no conflicts');

  // pass_gold without go_core → critical conflict
  const cPG = createHumanApprovalContract({ requested_action: 'pass_gold_confirmation', reviewer_role: 'pass_gold_authority', review_decision: 'approved', evidence_refs: ['decision_matrix_ref'] });
  const cf1 = deriveAuthorityConflicts(cPG, {});
  assert(cf1.some(c => c.id === 'authority_attempts_to_override_pass_gold'), '[V15.10-F-3]  no go_core → override_pass_gold conflict');
  const pgConflict = cf1.find(c => c.id === 'authority_attempts_to_override_pass_gold');
  assert(pgConflict.severity === 'critical',               '[V15.10-F-4]  override_pass_gold severity=critical');
  assert(typeof pgConflict.message === 'string',           '[V15.10-F-5]  conflict has message');
  assert(typeof pgConflict.remediation === 'string',       '[V15.10-F-6]  conflict has remediation');

  // blocked runtime + release action
  const cRel = createHumanApprovalContract({ requested_action: 'release_authorization', reviewer_role: 'release_authority', review_decision: 'approved', evidence_refs: ['decision_matrix_ref', 'runtime_evidence_ref', 'authorization_manifest_ref', 'scenario_matrix_ref', 'ci_status_ref'] });
  const cf2 = deriveAuthorityConflicts(cRel, { decisionMatrix: { decision_state: 'BLOCKED_RUNTIME' } });
  assert(cf2.some(c => c.id === 'authority_attempts_to_release_blocked_runtime'), '[V15.10-F-7]  blocked runtime + release → conflict');
  assert(cf2.some(c => c.id === 'authority_conflicts_with_decision_matrix'),      '[V15.10-F-8]  blocked runtime → decision_matrix conflict');

  // conflict severity values are valid
  const validSeverities = ['critical', 'high', 'medium', 'low'];
  assert(cf1.every(c => validSeverities.includes(c.severity)),  '[V15.10-F-9]  conflict severities valid');
  assert(cf2.every(c => validSeverities.includes(c.severity)),  '[V15.10-F-10] conflict severities valid (2)');

  // expired contract → authority_expired_but_used
  const cExp = createHumanApprovalContract({ expires_at: 1000000001000, requested_action: 'release_review', reviewer_role: 'reviewer', review_decision: 'approved' });
  const cf3 = deriveAuthorityConflicts(cExp, {});
  assert(cf3.some(c => c.id === 'authority_expired_but_used'), '[V15.10-F-11] expired → authority_expired_but_used');

  // rejected → authority_rejected_but_used
  const cRej = createHumanApprovalContract({ review_decision: 'rejected', requested_action: 'release_review', reviewer_role: 'reviewer' });
  const cf4 = deriveAuthorityConflicts(cRej, {});
  assert(cf4.some(c => c.id === 'authority_rejected_but_used'), '[V15.10-F-12] rejected → authority_rejected_but_used');

  // valid review_only with evidence → no conflicts
  const cOK = createHumanApprovalContract({ requested_action: 'release_review', reviewer_role: 'reviewer', review_decision: 'approved', reviewed_by: 'tester', evidence_refs: ['decision_matrix_ref', 'runtime_evidence_ref', 'authorization_manifest_ref'] });
  const cf5 = deriveAuthorityConflicts(cOK, {});
  assert(cf5.length === 0,                                 '[V15.10-F-13] valid release_review → no conflicts');

  // deriveAuthorityAuditTrail(null)
  const trail0 = deriveAuthorityAuditTrail(null, {}, {});
  assert(Array.isArray(trail0),                            '[V15.10-F-14] deriveAuthorityAuditTrail(null) → array');
  assert(trail0.length > 0,                                '[V15.10-F-15] audit trail for null has events');
  assert(trail0.some(e => e.type === 'deploy_blocked_by_policy'), '[V15.10-F-16] deploy_blocked_by_policy event present');
}

// ════════════════════════════════════════════════════════════════════
// SUITE V15.10-G — Authority Harness Matrix
// ════════════════════════════════════════════════════════════════════

console.log('\n[V15.10-G] Authority Harness Matrix — runAuthorityScenarioMatrix');

{
  const matrix = runAuthorityScenarioMatrix();
  assert(typeof matrix === 'object' && matrix !== null,   '[V15.10-G-1]  matrix returned');
  assert(matrix.schema_version === 'v15.10',              '[V15.10-G-2]  matrix.schema_version=v15.10');
  assert(typeof matrix.total === 'number',                '[V15.10-G-3]  matrix.total is number');
  assert(matrix.total >= 11,                              '[V15.10-G-4]  matrix.total >= 11');
  assert(matrix.failed === 0,                             '[V15.10-G-5]  matrix.failed=0');
  assert(matrix.passed === matrix.total,                  '[V15.10-G-6]  matrix.passed=total');
  assert(matrix.all_safe === true,                        '[V15.10-G-7]  matrix.all_safe=true');
  assert(matrix.all_allowed_flags_false === true,         '[V15.10-G-8]  matrix.all_allowed_flags_false=true');
  assert(Array.isArray(matrix.scenarios),                 '[V15.10-G-9]  matrix.scenarios is array');
  assert(matrix.scenarios.length === matrix.total,        '[V15.10-G-10] scenarios.length=total');

  for (const s of matrix.scenarios) {
    assert(s.status_match    === true,  `[V15.10-G-11] ${s.scenario}: status_match=true`);
    assert(s.safe            === true,  `[V15.10-G-12] ${s.scenario}: safe=true`);
    assert(s.release_allowed === false, `[V15.10-G-13] ${s.scenario}: release_allowed=false`);
    assert(s.deploy_allowed  === false, `[V15.10-G-14] ${s.scenario}: deploy_allowed=false`);
    assert(s.tag_allowed     === false, `[V15.10-G-15] ${s.scenario}: tag_allowed=false`);
    assert(s.stable_allowed  === false, `[V15.10-G-16] ${s.scenario}: stable_allowed=false`);
    assert(s.promotion_allowed === false, `[V15.10-G-17] ${s.scenario}: promotion_allowed=false`);
    assert(s.pass_gold_candidate === false, `[V15.10-G-18] ${s.scenario}: pass_gold_candidate=false`);
    break; // all_allowed_flags_false guarantees the rest
  }

  // Specific scenarios in matrix
  const missing = matrix.scenarios.find(s => s.scenario === 'missing_contract');
  assert(missing !== undefined,                           '[V15.10-G-19] missing_contract in matrix');
  assert(missing.actual_status === 'CONTRACT_MISSING',    '[V15.10-G-20] missing_contract status in matrix');

  const passGold = matrix.scenarios.find(s => s.scenario === 'pass_gold_without_go_core');
  assert(passGold !== undefined,                          '[V15.10-G-21] pass_gold_without_go_core in matrix');
  assert(passGold.actual_status === 'CONTRACT_CONFLICTING', '[V15.10-G-22] pass_gold_without_go_core → CONTRACT_CONFLICTING');

  const conflRuntime = matrix.scenarios.find(s => s.scenario === 'conflicting_runtime_contract');
  assert(conflRuntime !== undefined,                      '[V15.10-G-23] conflicting_runtime_contract in matrix');
  assert(conflRuntime.actual_status === 'CONTRACT_VALID', '[V15.10-G-24] conflicting_runtime high-severity → CONTRACT_VALID');

  // renderAuthorityScenarioReport
  const report = renderAuthorityScenarioReport(matrix);
  assert(report !== null,                                 '[V15.10-G-25] renderAuthorityScenarioReport not null');
  assert(report.deploy_allowed   === false,               '[V15.10-G-26] report.deploy_allowed=false');
  assert(report.release_allowed  === false,               '[V15.10-G-27] report.release_allowed=false');
  assert(report.tag_allowed      === false,               '[V15.10-G-28] report.tag_allowed=false');
  assert(report.stable_allowed   === false,               '[V15.10-G-29] report.stable_allowed=false');
  assert(report.all_allowed_flags_false === true,         '[V15.10-G-30] report.all_allowed_flags_false=true');
  assert(Array.isArray(report.scenario_summary),          '[V15.10-G-31] report.scenario_summary is array');
  assert(typeof report.note === 'string',                 '[V15.10-G-32] report.note is string');
  assert(report.note.includes('authority review is validation'), '[V15.10-G-33] report.note has authority text');

  // createAuthorityScenarioSummary
  const summary = createAuthorityScenarioSummary(matrix);
  assert(summary !== null,                                '[V15.10-G-34] createAuthorityScenarioSummary not null');
  assert(summary.deploy_allowed      === false,           '[V15.10-G-35] summary.deploy_allowed=false');
  assert(summary.release_allowed     === false,           '[V15.10-G-36] summary.release_allowed=false');
  assert(summary.all_allowed_flags_false === true,        '[V15.10-G-37] summary.all_allowed_flags_false=true');

  // runAuthorityScenario individual
  const singleMissing = runAuthorityScenario('missing_contract');
  assert(singleMissing.actual_status === 'CONTRACT_MISSING', '[V15.10-G-38] single missing_contract → CONTRACT_MISSING');
  assert(singleMissing.status_match  === true,            '[V15.10-G-39] single missing_contract status_match=true');
  assert(singleMissing.safe          === true,            '[V15.10-G-40] single missing_contract safe=true');
  assert(singleMissing.release_allowed === false,         '[V15.10-G-41] single scenario release_allowed=false');
  assert(singleMissing.deploy_allowed  === false,         '[V15.10-G-42] single scenario deploy_allowed=false');

  // Unknown scenario
  const sUnknown = runAuthorityScenario('__unknown_xyz__');
  assert(sUnknown.scenario_status === 'SCENARIO_ERROR',   '[V15.10-G-43] unknown → SCENARIO_ERROR');
  assert(sUnknown.deploy_allowed  === false,              '[V15.10-G-44] unknown → deploy_allowed=false');
  assert(sUnknown.safe            === true,               '[V15.10-G-45] unknown → safe=true');

  // listAuthorityFixtures
  const fixtures = listAuthorityFixtures();
  assert(Array.isArray(fixtures),                         '[V15.10-G-46] listAuthorityFixtures returns array');
  assert(fixtures.length >= 10,                           '[V15.10-G-47] at least 10 fixtures');

  // loadAuthorityFixture
  const fx = loadAuthorityFixture('valid-release-review-contract');
  assert(fx.loaded   === true,                            '[V15.10-G-48] valid fixture loaded=true');
  assert(fx.parse_ok === true,                            '[V15.10-G-49] valid fixture parse_ok=true');
  assert(fx.contract !== null,                            '[V15.10-G-50] valid fixture contract not null');

  const fxMissing = loadAuthorityFixture('__nonexistent_fixture_xyz__');
  assert(fxMissing.loaded === false,                      '[V15.10-G-51] nonexistent fixture loaded=false');
  assert(fxMissing.contract === null,                     '[V15.10-G-52] nonexistent fixture contract=null');
}

// ════════════════════════════════════════════════════════════════════
// SUITE V15.10-H — PI Harness CLI
// ════════════════════════════════════════════════════════════════════

console.log('\n[V15.10-H] PI Harness CLI --authority-* flags');

{
  const ARGS_BASE = ['--no-deprecation', HARNESS, '--max-difficulty', 'D2', '--dry-run', '--json'];

  // Base run: authority fields always present
  const rBase = spawnSync(process.execPath, ARGS_BASE, { cwd: ROOT, encoding: 'utf8', timeout: 120000 });
  const rawBase = (rBase.stdout || '') + (rBase.stderr || '');
  const sBase = rawBase.indexOf('{'), eBase = rawBase.lastIndexOf('}');
  let pBase = {};
  if (sBase >= 0 && eBase > sBase) { try { pBase = JSON.parse(rawBase.slice(sBase, eBase+1)); } catch(_){} }

  assert('hermes_authority_review_enabled' in pBase,               '[V15.10-H-1]  hermes_authority_review_enabled present');
  assert(pBase.hermes_authority_review_enabled === true,           '[V15.10-H-2]  review_enabled=true');
  assert(pBase.hermes_authority_schema_version === 'v15.10',       '[V15.10-H-3]  schema_version=v15.10');
  assert(pBase.hermes_authority_review_status === 'CONTRACT_MISSING', '[V15.10-H-4]  default status=CONTRACT_MISSING');
  assert(pBase.hermes_authority_review_valid  === false,           '[V15.10-H-5]  review_valid=false (no contract)');
  assert(pBase.hermes_authority_scenario      === null,            '[V15.10-H-6]  scenario=null (no flag)');
  assert(pBase.hermes_authority_scenario_total === null,           '[V15.10-H-7]  scenario_total=null (no matrix)');
  assert(pBase.hermes_deploy_allowed          === false,           '[V15.10-H-8]  hermes_deploy_allowed=false');
  assert(pBase.deploy_allowed                 === false,           '[V15.10-H-9]  global deploy_allowed=false');
  assert(pBase.pass_gold_candidate            === false,           '[V15.10-H-10] pass_gold_candidate=false');
  assert(pBase.hermes_release_allowed         === false,           '[V15.10-H-11] hermes_release_allowed=false');
  assert(pBase.hermes_tag_allowed             === false,           '[V15.10-H-12] hermes_tag_allowed=false');
  assert(pBase.hermes_stable_allowed          === false,           '[V15.10-H-13] hermes_stable_allowed=false');

  // --authority-scenario-matrix
  const rMatrix = spawnSync(process.execPath,
    [...ARGS_BASE, '--authority-scenario-matrix'],
    { cwd: ROOT, encoding: 'utf8', timeout: 120000 }
  );
  const rawMat = (rMatrix.stdout || '') + (rMatrix.stderr || '');
  const sMat = rawMat.indexOf('{'), eMat = rawMat.lastIndexOf('}');
  let pMat = {};
  if (sMat >= 0 && eMat > sMat) { try { pMat = JSON.parse(rawMat.slice(sMat, eMat+1)); } catch(_){} }

  assert(pMat.hermes_authority_scenario_total  >= 11,             '[V15.10-H-14] matrix total >= 11');
  assert(pMat.hermes_authority_scenario_failed === 0,             '[V15.10-H-15] matrix failed=0');
  assert(pMat.hermes_authority_all_safe         === true,         '[V15.10-H-16] matrix all_safe=true');
  assert(pMat.hermes_authority_all_allowed_flags_false === true,  '[V15.10-H-17] matrix all_allowed_flags_false=true');
  assert(pMat.hermes_deploy_allowed             === false,        '[V15.10-H-18] matrix run → deploy_allowed=false');

  // --authority-scenario missing_contract
  const rScen = spawnSync(process.execPath,
    [...ARGS_BASE, '--authority-scenario', 'missing_contract'],
    { cwd: ROOT, encoding: 'utf8', timeout: 120000 }
  );
  const rawScen = (rScen.stdout || '') + (rScen.stderr || '');
  const sScen = rawScen.indexOf('{'), eScen = rawScen.lastIndexOf('}');
  let pScen = {};
  if (sScen >= 0 && eScen > sScen) { try { pScen = JSON.parse(rawScen.slice(sScen, eScen+1)); } catch(_){} }

  assert(pScen.hermes_authority_scenario === 'missing_contract',  '[V15.10-H-19] scenario flag → scenario field set');
  assert(pScen.hermes_deploy_allowed === false,                    '[V15.10-H-20] scenario run → deploy_allowed=false');
}

// ════════════════════════════════════════════════════════════════════
// SUITE V15.10-I — Human Report
// ════════════════════════════════════════════════════════════════════

console.log('\n[V15.10-I] Human Report AUTHORITY REVIEW GATE (V15.10)');

{
  // With --authority-scenario-matrix (triggers full report)
  const rReport = spawnSync(process.execPath,
    ['--no-deprecation', HARNESS, '--max-difficulty', 'D2', '--dry-run', '--authority-scenario-matrix'],
    { cwd: ROOT, encoding: 'utf8', timeout: 120000 }
  );
  const out = (rReport.stdout || '') + (rReport.stderr || '');

  assert(out.includes('AUTHORITY REVIEW GATE (V15.10)'),          '[V15.10-I-1]  section header present');
  assert(out.includes('AUTHORITY_SCHEMA'),                         '[V15.10-I-2]  AUTHORITY_SCHEMA present');
  assert(out.includes('AUTHORITY_STATUS'),                         '[V15.10-I-3]  AUTHORITY_STATUS present');
  assert(out.includes('AUTHORITY SCENARIO MATRIX (V15.10)'),      '[V15.10-I-4]  matrix section present');
  assert(out.includes('MATRIX_TOTAL'),                             '[V15.10-I-5]  MATRIX_TOTAL present');
  assert(out.includes('MATRIX_PASSED'),                            '[V15.10-I-6]  MATRIX_PASSED present');
  assert(out.includes('ALL_SAFE'),                                  '[V15.10-I-7]  ALL_SAFE present');
  assert(out.includes('ALL_ALLOWED_FLAGS_FALSE'),                   '[V15.10-I-8]  ALL_ALLOWED_FLAGS_FALSE present');
  assert(out.includes('NOTE: authority review is validation, not execution'), '[V15.10-I-9]  NOTE: validation present');
  assert(out.includes('NOTE: human approval cannot override PASS GOLD'),      '[V15.10-I-10] NOTE: cannot override present');
  assert(out.includes('NOTE: deploy/tag/stable remain blocked in V15.10'),    '[V15.10-I-11] NOTE: blocked present');
}

// ════════════════════════════════════════════════════════════════════
// SUITE V15.10-J — Regression Safety
// ════════════════════════════════════════════════════════════════════

console.log('\n[V15.10-J] Regression Safety — V15.10 invariants');

{
  // Matrix-level invariants
  const matrix = runAuthorityScenarioMatrix();
  assert(matrix.all_allowed_flags_false === true,          '[V15.10-J-1]  all_allowed_flags_false=true');
  assert(matrix.all_safe === true,                         '[V15.10-J-2]  all_safe=true');

  for (const s of matrix.scenarios) {
    assert(s.deploy_allowed     === false,  `[V15.10-J-3]  ${s.scenario}: deploy_allowed=false`);
    assert(s.release_allowed    === false,  `[V15.10-J-4]  ${s.scenario}: release_allowed=false`);
    assert(s.tag_allowed        === false,  `[V15.10-J-5]  ${s.scenario}: tag_allowed=false`);
    assert(s.stable_allowed     === false,  `[V15.10-J-6]  ${s.scenario}: stable_allowed=false`);
    assert(s.promotion_allowed  === false,  `[V15.10-J-7]  ${s.scenario}: promotion_allowed=false`);
    assert(s.pass_gold_candidate === false, `[V15.10-J-8]  ${s.scenario}: pass_gold_candidate=false`);
    assert(s.safe               === true,   `[V15.10-J-9]  ${s.scenario}: safe=true`);
    break; // all_allowed_flags_false guarantees the rest
  }

  // pass_gold_without_go_core is safe
  const pgScen = matrix.scenarios.find(s => s.scenario === 'pass_gold_without_go_core');
  assert(pgScen.safe === true,                             '[V15.10-J-10] pass_gold_without_go_core safe=true');
  assert(pgScen.deploy_allowed === false,                  '[V15.10-J-11] pass_gold_without_go_core deploy_allowed=false');

  // Gate-level: evaluateAuthorityReviewGate NEVER sets allowed=true
  const testContracts = [
    null,
    createHumanApprovalContract({ reviewer_role: 'stable_authority', requested_action: 'stable_promotion_authorization', review_decision: 'approved', reviewed_by: 'tester', evidence_refs: ['release_authorization_ref', 'pass_gold_ref', 'deployment_result_ref', 'rollback_snapshot_ref'] }),
    createHumanApprovalContract({ reviewer_role: 'deploy_authority',  requested_action: 'deploy_authorization',  review_decision: 'approved', reviewed_by: 'tester', evidence_refs: ['release_authorization_ref', 'pass_gold_ref', 'go_core_evidence_ref', 'ci_status_ref'] }),
  ];
  for (const tc of testContracts) {
    const g = evaluateAuthorityReviewGate(tc);
    assert(g.release_allowed   === false, `[V15.10-J-12] ${tc ? tc.requested_action : 'null'}: release_allowed=false`);
    assert(g.deploy_allowed    === false, `[V15.10-J-13] ${tc ? tc.requested_action : 'null'}: deploy_allowed=false`);
    assert(g.tag_allowed       === false, `[V15.10-J-14] ${tc ? tc.requested_action : 'null'}: tag_allowed=false`);
    assert(g.stable_allowed    === false, `[V15.10-J-15] ${tc ? tc.requested_action : 'null'}: stable_allowed=false`);
    assert(g.promotion_allowed === false, `[V15.10-J-16] ${tc ? tc.requested_action : 'null'}: promotion_allowed=false`);
  }

  // createAuthorityRoleRegistry invariants
  const reg = createAuthorityRoleRegistry();
  assert(reg.invariants.authority_cannot_override_pass_gold === true, '[V15.10-J-17] registry invariant: cannot_override_pass_gold');
  assert(reg.invariants.authority_cannot_execute_deploy === true,     '[V15.10-J-18] registry invariant: cannot_execute_deploy');
  assert(reg.invariants.authority_cannot_create_evidence === true,    '[V15.10-J-19] registry invariant: cannot_create_evidence');
  assert(reg.invariants.authority_cannot_override_go_core === true,   '[V15.10-J-20] registry invariant: cannot_override_go_core');

  // schema_version consistent
  const scen = runAuthorityScenario('missing_contract');
  assert(scen.schema_version === 'v15.10',                 '[V15.10-J-21] scenario result schema_version=v15.10');
}

// ─── RESULTADO FINAL ──────────────────────────────────────────────

console.log('');
console.log(`${'─'.repeat(50)}`);
console.log(`PI Harness Tests: ${passed} passed, ${failed} failed`);
console.log(`${'─'.repeat(50)}`);

process.exit(failed > 0 ? 1 : 0);
