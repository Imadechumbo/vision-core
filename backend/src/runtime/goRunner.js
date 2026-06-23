'use strict';

/**
 * Vision Core — Honest Node ⇄ Go Core Runtime Bridge
 *
 * Exports:
 *   runGoMission({ root, input, dryRun })  → Promise<GoResult>
 *   streamGoMission({ root, input, res, missionId }) → emits SSE
 *   resolveGoBinary()                      → resolved Go Core executable
 *   checkGoHealth()                        → Promise<HealthResult>
 *
 * Contract:
 *   - Backend never fabricates evidence_receipt.
 *   - PASS GOLD is only accepted from real Go Core output.
 *   - Promotion is always blocked unless strict evidence gates pass.
 *   - deploy_allowed is always false in this phase.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const DEFAULT_TIMEOUT_MS = 30000;

function repoRoot() {
  // §130: VISION_PROJECT_ROOT tem prioridade (setado no EB ou localmente).
  // Fallback: process.cwd() funciona no EB (/var/app) e localmente (vision-core/).
  // __dirname = .../src/runtime/ — vai 3 níveis pra cima localmente (backend/ incluído)
  // mas no EB o zip não tem backend/ na raiz, então vai a /var/ (errado).
  return process.env.VISION_PROJECT_ROOT || process.cwd();
}

function isFile(file) {
  try {
    return fs.existsSync(file) && fs.statSync(file).isFile();
  } catch (_) {
    return false;
  }
}

function isDir(dir) {
  try {
    return fs.existsSync(dir) && fs.statSync(dir).isDirectory();
  } catch (_) {
    return false;
  }
}

function resolveGoBinary() {
  const root = repoRoot();
  const ext = process.platform === 'win32' ? '.exe' : '';
  const bin = 'vision-core' + ext;

  const candidates = [
    process.env.VISION_GO_CORE_BIN,
    path.join(root, 'bin', bin),
    path.join(root, '..', 'bin', bin),
    path.join(root, 'go-core', bin),
    path.join(root, 'go-core', 'bin', bin),
    path.join(root, '..', 'go-core', bin),
    path.join(root, '..', 'go-core', 'bin', bin),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (isFile(candidate)) {
      // §130c: chmod +x programático — EB não honra permissões de zip.
      // Roda só em Linux (no Windows não é necessário e poderia falhar).
      if (process.platform !== 'win32') {
        try { fs.chmodSync(candidate, 0o755); } catch (_) {}
      }
      return {
        available: true,
        mode: 'binary',
        command: candidate,
        argsPrefix: [],
        cwd: root,
        bin: candidate,
      };
    }
  }

  const goCoreDir = path.join(root, 'go-core');
  const goCoreMain = path.join(goCoreDir, 'cmd', 'vision-core');

  if (isDir(goCoreMain)) {
    return {
      available: true,
      mode: 'go-run',
      command: process.env.GO || 'go',
      argsPrefix: ['run', './cmd/vision-core'],
      cwd: goCoreDir,
      bin: `${process.env.GO || 'go'} run ./cmd/vision-core`,
    };
  }

  return {
    available: false,
    mode: 'missing',
    command: candidates[0] || bin,
    argsPrefix: [],
    cwd: root,
    bin: candidates[0] || bin,
  };
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasMissionId(value) {
  return typeof value === 'string' && /^mission_[a-zA-Z0-9._-]+$/.test(value);
}

function isBackendDerivedEvidence(value) {
  if (!value) return false;

  if (typeof value === 'string') {
    return /^(evr[_-]|backend[_-]|backend-derived|node-backend)/i.test(value);
  }

  if (isPlainObject(value)) {
    const id = typeof value.id === 'string' ? value.id : '';
    const source = typeof value.source === 'string' ? value.source : '';
    return /^(evr[_-]|backend[_-]|backend-derived|node-backend)/i.test(id)
      || /(backend-derived|node-backend)/i.test(source);
  }

  return false;
}

function hasEvidenceReceipt(value) {
  if (!value || isBackendDerivedEvidence(value)) return false;

  if (typeof value === 'string') {
    return value.trim().length >= 8;
  }

  if (isPlainObject(value)) {
    return typeof value.id === 'string'
      && value.id.length >= 8
      && Boolean(value.issued_at || value.created_at || value.timestamp)
      && !isBackendDerivedEvidence(value);
  }

  return false;
}

function extractJson(stdout) {
  const text = String(stdout || '').trim();
  if (!text) throw new Error('no JSON in stdout');

  try {
    return JSON.parse(text);
  } catch (_) {
    const first = text.indexOf('{');
    const last = text.lastIndexOf('}');
    if (first < 0 || last < first) throw new Error('no JSON in stdout');
    return JSON.parse(text.slice(first, last + 1));
  }
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeGoResult(parsed = {}, stdout = '', stderr = '', bin = '', options = {}) {
  const goExecuted = options.goExecuted === true;
  const receipt = parsed.evidence_receipt || null;
  const missionId = typeof parsed.mission_id === 'string' ? parsed.mission_id : null;

  const backendStubFromGo = parsed.backend_stub === true || parsed.backendStub === true;
  const backendHasMissionId = hasMissionId(missionId);
  const backendHasEvidenceReceipt = hasEvidenceReceipt(receipt);
  const backendDerivedEvidence = isBackendDerivedEvidence(receipt);

  // V14.4: evidence_receipt.source must be "go-core" for strict gold
  const evidenceHasGoSource = isPlainObject(receipt) && receipt.source === 'go-core';

  const gates = isPlainObject(parsed.gates) ? parsed.gates : {};
  const gateValues = Object.values(gates);
  const mandatoryGatesPassed = gateValues.length > 0 && gateValues.every((value) => value === true);

  const failures = [];

  if (!goExecuted) failures.push('go_core_not_executed');
  if (backendStubFromGo) failures.push('backend_stub_true');
  if (!backendHasMissionId) failures.push('missing_real_mission_id');
  if (!backendHasEvidenceReceipt) failures.push('missing_real_evidence_receipt');
  if (backendDerivedEvidence) failures.push('backend_derived_evidence_receipt');
  if (backendHasEvidenceReceipt && !evidenceHasGoSource) failures.push('evidence_source_not_go_core');

  if (parsed.pass_gold === true && !mandatoryGatesPassed) {
    failures.push('mandatory_gates_not_confirmed');
  }

  const existingFailedGates = Array.isArray(parsed.failed_gates) ? parsed.failed_gates : [];
  const failedGates = unique([...existingFailedGates, ...failures]);

  const strictPassGold =
    parsed.pass_gold === true
    && goExecuted
    && !backendStubFromGo
    && backendHasMissionId
    && backendHasEvidenceReceipt
    && evidenceHasGoSource
    && !backendDerivedEvidence
    && mandatoryGatesPassed
    && failedGates.length === 0;

  const promotionAllowed =
    strictPassGold === true
    && parsed.promotion_allowed === true;

  if (parsed.promotion_allowed === true && strictPassGold !== true) {
    failedGates.push('promotion_without_strict_pass_gold');
  }

  const backendStub =
    !goExecuted
    || backendStubFromGo
    || !backendHasMissionId
    || !backendHasEvidenceReceipt
    || backendDerivedEvidence
    || strictPassGold !== true;

  return {
    ok: strictPassGold,
    status: strictPassGold ? 'GOLD' : 'FAIL',
    pass_gold: strictPassGold,
    promotion_allowed: promotionAllowed,
    deploy_allowed: false,

    backend_stub: backendStub,
    backendStub,
    backendHasMissionId,
    backendHasEvidenceReceipt,
    go_core_executed: goExecuted,

    mission_id: backendHasMissionId ? missionId : null,
    evidence_receipt: backendHasEvidenceReceipt ? receipt : null,
    evidence_source: backendHasEvidenceReceipt ? (evidenceHasGoSource ? 'go-core' : 'go_core_runtime_result') : null,

    snapshot_id: parsed.snapshot_id || null,
    engine: parsed.engine || 'go-safe-core',
    version: parsed.version || null,

    rollback_ready: Boolean(parsed.rollback_ready),
    rollback_applied: Boolean(parsed.rollback_applied),

    steps: Array.isArray(parsed.steps) ? parsed.steps : [],
    step_results: Array.isArray(parsed.step_results) ? parsed.step_results : [],
    gates,
    failed_gates: unique(failedGates),

    duration_ms: Number(parsed.duration_ms || 0),
    summary: parsed.summary || (strictPassGold
      ? 'PASS GOLD confirmed by Go Core.'
      : 'PASS GOLD blocked by strict backend evidence contract.'),

    strict_pass_gold_reason: strictPassGold
      ? 'strict_pass_gold_confirmed_by_go_core'
      : unique(failedGates).join(',') || 'pass_gold_false',

    go_binary: bin,
    stdout_chars: String(stdout || '').length,
    stderr: String(stderr || '').trim() || undefined,
  };
}

function failureResult({ message, errorType = 'go_runtime_failure', bin = '', stdout = '', stderr = '', exitCode = null, durationMs = 0 }) {
  return {
    ok: false,
    status: 'FAIL',
    pass_gold: false,
    promotion_allowed: false,
    deploy_allowed: false,

    backend_stub: true,
    backendStub: true,
    backendHasMissionId: false,
    backendHasEvidenceReceipt: false,
    go_core_executed: false,

    mission_id: null,
    evidence_receipt: null,
    evidence_source: null,

    gates: {},
    failed_gates: [errorType],
    strict_pass_gold_reason: errorType,

    error_type: errorType,
    message,
    error: message,
    exit_code: exitCode === null ? undefined : exitCode,

    go_binary: bin,
    stdout_chars: String(stdout || '').length,
    stderr: String(stderr || '').trim() || undefined,
    duration_ms: durationMs,
  };
}

async function runGoMission({ root, input, dryRun } = {}) {
  const projectRoot = repoRoot();
  const missionRoot = path.resolve(root || projectRoot);
  const missionInput = String(input || 'self-test');
  const resolved = resolveGoBinary();
  const startedAt = Date.now();

  if (!resolved.available) {
    return failureResult({
      message: 'go core unavailable',
      errorType: 'go_core_unavailable',
      bin: resolved.bin,
      durationMs: Date.now() - startedAt,
    });
  }

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let settled = false;

    const finish = (payload) => {
      if (settled) return;
      settled = true;
      resolve({
        ...payload,
        duration_ms: payload.duration_ms || Date.now() - startedAt,
      });
    };

    const missionArgs = ['mission', '--root', missionRoot, '--input', missionInput];
    // §130: --dry-run flag removido — binary go-core não suporta o sub-flag para
    // o subcomando 'mission' (causa hang indefinido). dry_run no payload da API
    // é só metadado; o binário sempre executa a missão completa.
    // if (dryRun) missionArgs.push('--dry-run');

    const args = [...resolved.argsPrefix, ...missionArgs];

    let child;
    try {
      child = spawn(resolved.command, args, {
        cwd: resolved.cwd || missionRoot,
        windowsHide: true,
        shell: false,
        env: process.env,
      });
    } catch (err) {
      return finish(failureResult({
        message: err.message,
        errorType: 'go_runtime_spawn_failure',
        bin: resolved.bin,
        durationMs: Date.now() - startedAt,
      }));
    }

    const timeout = setTimeout(() => {
      try { child.kill('SIGKILL'); } catch (_) {}
      finish(failureResult({
        message: 'go core timeout',
        errorType: 'go_core_timeout',
        bin: resolved.bin,
        stdout,
        stderr,
        durationMs: Date.now() - startedAt,
      }));
    }, Number(process.env.VISION_GO_CORE_TIMEOUT_MS || DEFAULT_TIMEOUT_MS));

    child.stdout.on('data', (chunk) => { stdout += chunk.toString('utf8'); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString('utf8'); });

    child.on('error', (err) => {
      clearTimeout(timeout);
      finish(failureResult({
        message: err.message,
        errorType: 'go_runtime_error',
        bin: resolved.bin,
        stdout,
        stderr,
        durationMs: Date.now() - startedAt,
      }));
    });

    child.on('close', (code) => {
      clearTimeout(timeout);

      try {
        const parsed = extractJson(stdout);
        const normalized = normalizeGoResult(parsed, stdout, stderr, resolved.bin, { goExecuted: true });

        if (code !== 0 && code !== 2) {
          normalized.ok = false;
          normalized.status = 'FAIL';
          normalized.pass_gold = false;
          normalized.promotion_allowed = false;
          normalized.deploy_allowed = false;
          normalized.backend_stub = true;
          normalized.backendStub = true;
          normalized.error_type = 'go_core_exit_failure';
          normalized.message = `go core exit ${code}`;
          normalized.error = normalized.message;
          normalized.exit_code = code;
          normalized.failed_gates = unique([...(normalized.failed_gates || []), 'go_core_exit_failure']);
          normalized.strict_pass_gold_reason = normalized.failed_gates.join(',');
        }

        return finish(normalized);
      } catch (err) {
        return finish(failureResult({
          message: (code !== 0 ? `go core exit ${code}: ` : '') + err.message,
          errorType: 'go_core_json_parse_failure',
          bin: resolved.bin,
          stdout,
          stderr,
          exitCode: code,
          durationMs: Date.now() - startedAt,
        }));
      }
    });
  });
}

async function streamGoMission({ root, input, res, missionId }) {
  const ts = () => new Date().toISOString();

  const send = (event, data) => {
    try {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify({ ...data, time: ts() })}\n\n`);
    } catch (_) {}
  };

  send('open', {
    ok: true,
    status: 'connected',
    pass_gold: false,
    promotion_allowed: false,
    deploy_allowed: false,
  });

  send('mission:start', {
    mission_id: missionId || null,
    step: 'mission:start',
    ok: true,
    status: 'running',
    pass_gold: false,
    promotion_allowed: false,
    deploy_allowed: false,
  });

  let result;
  try {
    result = await runGoMission({ root, input });
  } catch (err) {
    result = failureResult({
      message: err.message,
      errorType: 'go_runtime_exception',
      bin: resolveGoBinary().bin,
    });
  }

  const finalMissionId = result.backendHasMissionId ? result.mission_id : null;

  for (const step of result.step_results || []) {
    send(step.ok ? `step:${step.step || 'ok'}` : 'step:fail', {
      mission_id: finalMissionId,
      step: step.step || 'unknown',
      ok: step.ok === true,
      status: step.ok === true ? 'ok' : 'fail',
      message: step.message || step.error || '',
      pass_gold: false,
      promotion_allowed: false,
      deploy_allowed: false,
    });
  }

  const finalPayload = {
    ...result,
    mission_id: finalMissionId,
    evidence_receipt: result.backendHasEvidenceReceipt ? result.evidence_receipt : null,
    deploy_allowed: false,
  };

  if (result.pass_gold === true) {
    send('passgold:ok', finalPayload);
    send('mission:complete', finalPayload);
  } else {
    send(result.backend_stub ? 'mission:blocked' : 'mission:fail', finalPayload);
  }

  try { res.end(); } catch (_) {}
  return result;
}

async function checkGoHealth() {
  const resolved = resolveGoBinary();

  if (!resolved.available) {
    return {
      ok: false,
      healthy: false,
      go_core_available: false,
      backend_stub: true,
      reason: 'go_core_unavailable',
      bin: resolved.bin,
      mode: resolved.mode,
      promotion_allowed: false,
      deploy_allowed: false,
    };
  }

  return {
    ok: true,
    healthy: true,
    go_core_available: true,
    backend_stub: false,
    bin: resolved.bin,
    mode: resolved.mode,
    promotion_allowed: false,
    deploy_allowed: false,
  };
}

module.exports = {
  runGoMission,
  streamGoMission,
  resolveGoBinary,
  checkGoHealth,
  normalizeGoResult,
  hasEvidenceReceipt,
  isBackendDerivedEvidence,
};