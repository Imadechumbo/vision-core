'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const DEFAULT_TIMEOUT_MS = Number(process.env.VISION_GO_CORE_TIMEOUT_MS || 30000);

function repoRoot() { return path.resolve(__dirname, '../../..'); }
function goCoreDir() { return path.join(repoRoot(), 'go-core'); }
function exe(name) { return process.platform === 'win32' ? name + '.exe' : name; }

function resolveGoBinary() {
  if (process.env.VISION_GO_CORE_BIN) return { command: process.env.VISION_GO_CORE_BIN, args: [], cwd: repoRoot(), mode: 'binary' };
  const candidates = [
    path.join(repoRoot(), 'bin', exe('vision-core')),
    path.join(goCoreDir(), 'bin', exe('vision-core')),
    path.join(goCoreDir(), exe('vision-core'))
  ];
  for (const candidate of candidates) {
    try { if (fs.existsSync(candidate)) return { command: candidate, args: [], cwd: repoRoot(), mode: 'binary' }; } catch (_) {}
  }
  return { command: 'go', args: ['run', './cmd/vision-core'], cwd: goCoreDir(), mode: 'go-run' };
}

function cleanString(v) { return typeof v === 'string' && v.trim().length > 0 ? v.trim() : ''; }

function realEvidenceReceipt(v) {
  if (!v) return null;
  if (typeof v === 'string') return v.trim().length >= 8 ? v.trim() : null;
  if (typeof v !== 'object') return null;
  if (v.backend_stub === true || v.backendStub === true) return null;
  if (v.source === 'backend-derived' || v.evidence_source === 'backend-derived') return null;
  if (cleanString(v.id) || cleanString(v.gates_hash)) return v;
  return null;
}

function backendDerivedReceipt(result) {
  const basis = ['backend-derived', Date.now(), result && (result.error || result.message || result.status || 'diagnostic')].join(':');
  return { id: basis.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 160), source: 'backend-derived', backend_stub: true, promotion_allowed: false };
}

function normalizeGoResult(result = {}) {
  const raw = result && typeof result === 'object' ? result : { ok: false, error: 'invalid_go_result' };
  const missionId = cleanString(raw.mission_id || raw.missionId);
  const receipt = realEvidenceReceipt(raw.evidence_receipt || raw.evidenceReceipt);
  const backendStub = raw.backend_stub === true || raw.backendStub === true || !missionId || !receipt;
  const passGold = backendStub === false && raw.pass_gold === true;
  const promotionAllowed = passGold === true && raw.promotion_allowed === true && backendStub === false;
  return {
    ...raw,
    ok: raw.ok === true && backendStub === false,
    status: raw.status || (passGold ? 'GOLD' : 'FAIL'),
    mission_id: missionId || null,
    missionId: missionId || null,
    evidence_receipt: receipt || backendDerivedReceipt(raw),
    evidenceReceipt: receipt || null,
    backend_stub: backendStub,
    backendStub,
    backendHasMissionId: Boolean(missionId),
    backendHasEvidenceReceipt: Boolean(receipt),
    pass_gold: passGold,
    promotion_allowed: promotionAllowed,
    deploy_allowed: promotionAllowed && raw.deploy_allowed === true
  };
}

function parseJsonOutput(stdout) {
  const text = String(stdout || '').trim();
  if (!text) return { ok: false, error: 'empty_go_stdout' };
  try { return JSON.parse(text); } catch (e) {
    const first = text.indexOf('{');
    const last = text.lastIndexOf('}');
    if (first >= 0 && last > first) {
      try { return JSON.parse(text.slice(first, last + 1)); } catch (_) {}
    }
    return { ok: false, error: 'invalid_go_json', parse_error: e.message, stdout: text.slice(0, 4000) };
  }
}

function runGoMission({ root, input, dryRun, timeoutMs } = {}) {
  const targetRoot = path.resolve(root || repoRoot());
  const missionInput = String(input || 'self-test');
  const resolved = resolveGoBinary();
  const args = resolved.args.concat(['mission', '--root', targetRoot, '--input', missionInput]);
  if (dryRun) args.push('--dry-run');

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let settled = false;
    function finish(payload) { if (settled) return; settled = true; resolve(normalizeGoResult(payload)); }

    let child;
    try {
      child = spawn(resolved.command, args, { cwd: resolved.cwd, env: process.env, shell: false, windowsHide: true });
    } catch (e) {
      finish({ ok: false, error: e.message, error_type: 'go_spawn_failure' });
      return;
    }

    const timer = setTimeout(() => {
      try { child.kill('SIGKILL'); } catch (_) {}
      finish({ ok: false, error: 'go_mission_timeout', error_type: 'go_timeout', stderr });
    }, Number(timeoutMs || DEFAULT_TIMEOUT_MS));

    child.stdout.on('data', (c) => { stdout += c.toString('utf8'); });
    child.stderr.on('data', (c) => { stderr += c.toString('utf8'); });
    child.on('error', (e) => { clearTimeout(timer); finish({ ok: false, error: e.message, error_type: 'go_process_error', stderr }); });
    child.on('close', (code) => {
      clearTimeout(timer);
      const parsed = parseJsonOutput(stdout);
      parsed.exit_code = code;
      if (stderr.trim()) parsed.stderr = stderr.trim();
      if (code !== 0 && parsed.ok !== true) parsed.ok = false;
      finish(parsed);
    });
  });
}

async function streamGoMission({ root, input, res, missionId } = {}) {
  function send(event, data) {
    res.write('event: ' + event + '\n');
    res.write('data: ' + JSON.stringify({ time: new Date().toISOString(), ...data }) + '\n\n');
  }
  send('open', { ok: true, status: 'connected', mission_id: missionId || null });
  send('mission:start', { ok: true, status: 'running', mission_id: missionId || null, pass_gold: false, promotion_allowed: false });
  const result = await runGoMission({ root, input });
  const finalMissionId = result.backend_stub === false ? result.mission_id : null;
  const finalReceipt = result.backend_stub === false ? result.evidence_receipt : null;
  for (const step of Array.isArray(result.step_results) ? result.step_results : []) {
    send(step.ok ? 'step:ok' : 'step:fail', { mission_id: finalMissionId, step: step.step, ok: step.ok === true, message: step.message || step.error || '', pass_gold: false, promotion_allowed: false });
  }
  send(result.pass_gold ? 'passgold:ok' : 'mission:blocked', { ...result, mission_id: finalMissionId, evidence_receipt: finalReceipt, done: true });
  send('done', { ok: result.ok === true, mission_id: finalMissionId, evidence_receipt: finalReceipt, pass_gold: result.pass_gold === true, promotion_allowed: result.promotion_allowed === true, backend_stub: result.backend_stub === true });
  try { res.end(); } catch (_) {}
  return result;
}

async function checkGoHealth() {
  const result = await runGoMission({ input: 'self-test' });
  const healthy = result.pass_gold === true && result.backend_stub === false;
  return { ok: healthy, healthy, backend_stub: result.backend_stub === true, pass_gold: result.pass_gold === true, promotion_allowed: result.promotion_allowed === true, mission_id: healthy ? result.mission_id : null, evidence_receipt: healthy ? result.evidence_receipt : null, binary: resolveGoBinary() };
}

module.exports = { runGoMission, streamGoMission, resolveGoBinary, checkGoHealth, normalizeGoResult };
