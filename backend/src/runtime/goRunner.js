'use strict';

/**
 * Vision Core V5.3 — Node ⇄ Go Live Orchestration
 * goRunner.js: executa vision-core via child_process.spawn
 *
 * Exports:
 *   runGoMission({ root, input, dryRun })  → Promise<GoResult>
 *   streamGoMission({ root, input, res, missionId }) → emite SSE real
 *   resolveGoBinary()                      → caminho do binário
 *   checkGoHealth()                        → Promise<HealthResult>
 */

const fs   = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// ── Resolver binário ──────────────────────────────────────────────
function resolveGoBinary() {
  const root = process.cwd();
  const ext  = process.platform === 'win32' ? '.exe' : '';
  const bin  = 'vision-core' + ext;

  const candidates = [
    process.env.VISION_GO_CORE_BIN,
    path.join(root, '..', 'bin', bin),
    path.join(root, 'bin', bin),
    path.join(root, '..', 'go-core', bin),
    path.join(root, '..', 'go-core', 'vision-core'),
    bin,
  ].filter(Boolean);

  for (const c of candidates) {
    try { if (fs.existsSync(c)) return c; } catch (_) {}
  }
  return candidates[0] || bin;
}

// ── Normalizar resultado ──────────────────────────────────────────
function makeBackendReceipt(parsed, stdout, stderr, bin) {
  const mission = parsed.mission_id || 'mission';
  const snap = parsed.snapshot_id || 'snapshot';
  const status = parsed.pass_gold === true ? 'gold' : 'blocked';
  const promoted = parsed.pass_gold === true && parsed.promotion_allowed === true ? 'promotion-allowed' : 'promotion-blocked';
  const size = String((stdout || '').length + (stderr || '').length);
  return ['evr', mission, snap, status, promoted, size, Date.now()].map(function (x) {
    return String(x).replace(/[^a-zA-Z0-9._-]+/g, '-');
  }).join('_');
}
function normalizeGoResult(parsed, stdout, stderr, bin) {
  const receipt = parsed.evidence_receipt || makeBackendReceipt(parsed, stdout, stderr, bin);
  return {
    ok:                Boolean(parsed.ok),
    status:            parsed.status || (parsed.pass_gold ? 'GOLD' : 'FAIL'),
    pass_gold:         Boolean(parsed.pass_gold),
    promotion_allowed: Boolean(parsed.pass_gold && parsed.promotion_allowed),
    rollback_ready:    Boolean(parsed.rollback_ready),
    rollback_applied:  Boolean(parsed.rollback_applied),
    mission_id:        parsed.mission_id  || null,
    snapshot_id:       parsed.snapshot_id || null,
    engine:            parsed.engine      || 'go-safe-core',
    version:           parsed.version     || null,
    steps:             Array.isArray(parsed.steps)        ? parsed.steps        : [],
    step_results:      Array.isArray(parsed.step_results) ? parsed.step_results : [],
    gates:             parsed.gates        || {},
    failed_gates:      Array.isArray(parsed.failed_gates) ? parsed.failed_gates : [],
    duration_ms:       Number(parsed.duration_ms || 0),
    summary:           parsed.summary || '',
    evidence_receipt: receipt,
    evidence_source: 'go_core_runtime_result',
    go_binary:         bin,
    stdout_chars:      stdout.length,
    stderr:            stderr.trim() || undefined,
  };
}

// ── runGoMission ──────────────────────────────────────────────────
async function runGoMission({ root, input, dryRun } = {}) {
  const missionRoot  = path.resolve(root || process.cwd());
  const missionInput = String(input || 'self-test');
  const bin          = resolveGoBinary();
  const startedAt    = Date.now();

  return new Promise((resolve) => {
    let stdout = '', stderr = '';
    let settled = false;

    const finish = (payload) => {
      if (settled) return;
      settled = true;
      resolve({ duration_ms: Date.now() - startedAt, ...payload });
    };

    const args = ['mission', '--root', missionRoot, '--input', missionInput];
    if (dryRun) args.push('--dry-run');

    let child;
    try {
      child = spawn(bin, args, { cwd: missionRoot, windowsHide: true, shell: false });
    } catch (err) {
      return finish({
        ok: false, status: 'FAIL', pass_gold: false, promotion_allowed: false,
        error_type: 'go_runtime_failure', message: err.message, go_binary: bin,
        evidence_receipt: makeBackendReceipt({}, '', err.message, bin),
      });
    }

    const timeout = setTimeout(() => {
      try { child.kill('SIGKILL'); } catch (_) {}
      finish({
        ok: false, status: 'FAIL', pass_gold: false, promotion_allowed: false,
        error_type: 'go_runtime_failure', message: 'go core timeout',
        go_binary: bin, stdout, stderr,
        evidence_receipt: makeBackendReceipt({}, stdout, 'timeout', bin),
      });
    }, Number(process.env.VISION_GO_CORE_TIMEOUT_MS || 30000));

    child.stdout.on('data', (c) => { stdout += c.toString('utf8'); });
    child.stderr.on('data', (c) => { stderr += c.toString('utf8'); });

    child.on('error', (err) => {
      clearTimeout(timeout);
      finish({
        ok: false, status: 'FAIL', pass_gold: false, promotion_allowed: false,
        error_type: 'go_runtime_failure', message: err.message,
        go_binary: bin, stdout, stderr,
        evidence_receipt: makeBackendReceipt({}, stdout, err.message, bin),
      });
    });

    child.on('close', (code) => {
      clearTimeout(timeout);
      // Go retorna exit 0 (GOLD) ou 2 (FAIL GOLD) — ambos têm JSON válido
      try {
        const first = stdout.indexOf('{');
        const last  = stdout.lastIndexOf('}');
        if (first < 0 || last < first) throw new Error('no JSON in stdout');
        const parsed = JSON.parse(stdout.slice(first, last + 1));
        return finish(normalizeGoResult(parsed, stdout, stderr, bin));
      } catch (err) {
        return finish({
          ok: false, status: 'FAIL', pass_gold: false, promotion_allowed: false,
          error_type: 'go_runtime_failure',
          message: (code !== 0 ? 'go core exit ' + code + ': ' : '') + err.message,
          exit_code: code, go_binary: bin, stdout, stderr,
          evidence_receipt: makeBackendReceipt({}, stdout, stderr, bin),
        });
      }
    });
  });
}

// ── streamGoMission — Go Core + SSE real ─────────────────────────
// Executa vision-core, aguarda JSON, emite eventos SSE em ordem.
// PASS GOLD vem exclusivamente do Go Core — nunca simulado.
async function streamGoMission({ root, input, res, missionId }) {
  const ts = () => new Date().toISOString();

  const send = (event, data) => {
    try {
      res.write('event: ' + event + '\n');
      res.write('data: ' + JSON.stringify(Object.assign({}, data, { time: ts() })) + '\n\n');
    } catch (_) {}
  };

  send('open',            { ok: true, status: 'connected' });
  send('mission:start',   {
    mission_id: missionId, step: 'mission:start', ok: true,
    message: 'Go Safe Core iniciando pipeline V5.2...', status: 'running', pass_gold: false,
  });

  // Executar Go Core
  let result;
  try {
    result = await runGoMission({ root, input });
  } catch (err) {
    send('mission:fail', {
      mission_id: missionId, ok: false, pass_gold: false,
      promotion_allowed: false, error: err.message,
    });
    try { res.end(); } catch (_) {}
    return { ok: false, pass_gold: false };
  }

  // Map step name → SSE event name (compatível com a UI)
  const STEP_EVENT = {
    scanner:   'scanner:ok',
    fileops:   'fileops:ok',
    snapshot:  'snapshot:ok',
    patcher:   'patcher:ok',
    validator: 'validator:ok',
    rollback:  'rollback:ok',
    passgold:  'passgold:ok',
  };

  // Emitir cada step do Go Core como evento SSE
  const stepResults = result.step_results || [];
  for (const sr of stepResults) {
    const eventName = sr.ok
      ? (STEP_EVENT[sr.step] || ('step:' + sr.step))
      : 'step:fail';

    send(eventName, {
      mission_id: result.mission_id || missionId,
      step:       sr.step,
      ok:         sr.ok,
      message:    sr.message || sr.error || '',
      status:     sr.ok ? 'ok' : 'fail',
      pass_gold:  false,  // só true no evento final
    });
  }

  // Resultado final — PASS GOLD vem do Go Core
  if (result.pass_gold) {
    send('passgold:ok', {
      mission_id:        result.mission_id || missionId,
      step:              'passgold',
      ok:                true,
      message:           'PASS GOLD confirmado — promoção autorizada pelo Go Core',
      status:            'GOLD',
      pass_gold:         true,
      promotion_allowed: result.promotion_allowed,
      evidence_receipt:  result.evidence_receipt,
    });
    send('mission:complete', {
      mission_id:        result.mission_id || missionId,
      ok:                true,
      status:            'GOLD',
      pass_gold:         true,
      promotion_allowed: result.promotion_allowed,
      evidence_receipt:  result.evidence_receipt,
      rollback_ready:    result.rollback_ready,
      snapshot_id:       result.snapshot_id,
      rollback_applied:  result.rollback_applied,
      duration_ms:       result.duration_ms,
      engine:            result.engine,
      version:           result.version,
      summary:           result.summary,
      evidence_receipt: result.evidence_receipt,
    });
  } else {
    send('mission:fail', {
      mission_id:        result.mission_id || missionId,
      ok:                false,
      status:            'FAIL',
      pass_gold:         false,
      promotion_allowed: false,
      evidence_receipt:  result.evidence_receipt,
      failed_gates:      result.failed_gates || [],
      summary:           result.summary || 'FAIL GOLD',
      evidence_receipt: result.evidence_receipt,
      error:             result.message || result.error || 'Go Core retornou FAIL',
    });
  }

  try { res.end(); } catch (_) {}
  return result;
}

// ── checkGoHealth ─────────────────────────────────────────────────
async function checkGoHealth() {
  const bin       = resolveGoBinary();
  const binExists = (() => { try { return fs.existsSync(bin); } catch (_) { return false; } })();

  if (!binExists) {
    return { ok: false, healthy: false, reason: 'binary_not_found', bin };
  }

  try {
    const result = await runGoMission({ root: process.cwd(), input: 'self-test' });
    return {
      ok:          result.ok && result.pass_gold,
      healthy:     result.ok && result.pass_gold,
      engine:      result.engine,
      version:     result.version,
      pass_gold:   result.pass_gold,
      status:      result.status,
      evidence_receipt: result.evidence_receipt,
      duration_ms: result.duration_ms,
      bin,
      bin_exists:  true,
    };
  } catch (err) {
    return { ok: false, healthy: false, reason: err.message, bin, bin_exists: true };
  }
}

module.exports = { runGoMission, streamGoMission, resolveGoBinary, checkGoHealth };
