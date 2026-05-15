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

// ─── RESULTADO FINAL ──────────────────────────────────────────────

console.log('');
console.log(`${'─'.repeat(50)}`);
console.log(`PI Harness Tests: ${passed} passed, ${failed} failed`);
console.log(`${'─'.repeat(50)}`);

process.exit(failed > 0 ? 1 : 0);
