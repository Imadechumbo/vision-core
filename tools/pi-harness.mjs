#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const API_BASE = (process.env.PI_HARNESS_API_BASE || process.env.VISION_API_BASE || process.env.API_BASE || '').replace(/\/$/, '');

const ACTIVE = [
  'tools/pi-harness.mjs',
  'backend/server.js',
  'backend/src/runtime/goRunner.js',
  'frontend/assets/vision-api.js',
  'frontend/assets/vision-chat.js',
  'frontend/assets/vision-agent-local.js',
  'frontend/assets/vision-runtime-owner.js',
  'frontend/assets/vision-report.js',
  'tools/sddf-front-guard.mjs'
];

const report = {
  executor: 'pi-harness',
  version: 'V15-clean-runner',
  pass_gold_candidate: false,
  promotion_allowed: false,
  deploy_allowed: false,
  strict_pass_gold_reason: [],
  gates: {},
  steps: [],
  fatal_errors: []
};

function tail(x) { return String(x || '').trim().slice(-4000); }
function read(rel) { try { return readFileSync(join(ROOT, rel), 'utf8'); } catch { return ''; } }
function runStep(name, command, options = {}) {
  const started = Date.now();
  const r = spawnSync(command, {
    cwd: options.cwd || ROOT,
    shell: true,
    encoding: 'utf8',
    timeout: options.timeoutMs || 120000,
    env: { ...process.env, ...(options.env || {}) }
  });
  const step = {
    name, command,
    ok: r.status === 0,
    status: r.status,
    signal: r.signal || null,
    timed_out: r.status === null || r.signal === 'SIGTERM',
    duration_ms: Date.now() - started,
    stdout_tail: tail(r.stdout),
    stderr_tail: tail(r.stderr)
  };
  report.steps.push(step);
  return step;
}
function gitValue(cmd) {
  const s = runStep('git:' + cmd, cmd, { timeoutMs: 15000 });
  return s.ok ? s.stdout_tail.trim() : '';
}
function backendProbe() {
  if (!API_BASE) return { backend_alive: false, backend_reason: 'api_base_not_configured' };
  const code = "const u=process.argv[1];const c=new AbortController();setTimeout(()=>c.abort(),4500);fetch(u+'/api/run-live',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({mission:'pi-harness-probe'}),signal:c.signal}).then(r=>r.json()).then(j=>console.log(JSON.stringify(j))).catch(e=>{console.error(e.message);process.exit(2)})";
  const s = runStep('L5_BACKEND_PROBE_OPTIONAL', 'node -e "' + code.replaceAll('"', '\\"') + '" "' + API_BASE + '"', { timeoutMs: 6000 });
  if (!s.ok) return { backend_alive: false, backend_reason: s.stderr_tail || s.stdout_tail || 'probe_failed' };
  try {
    const j = JSON.parse(s.stdout_tail);
    const receipt = j.evidence_receipt || j.evidenceReceipt || null;
    const hasReceipt = Boolean(receipt && (typeof receipt === 'string' ? receipt.length >= 8 : (receipt.id || receipt.gates_hash)));
    return {
      backend_alive: true,
      backend_stub: j.backend_stub === true || j.backendStub === true,
      backend_has_mission_id: typeof (j.mission_id || j.missionId) === 'string' && String(j.mission_id || j.missionId).trim().length > 0,
      backend_has_evidence_receipt: hasReceipt && !(receipt && typeof receipt === 'object' && (receipt.backend_stub === true || receipt.source === 'backend-derived')),
      backend_probe_payload: j
    };
  } catch (e) {
    return { backend_alive: false, backend_reason: 'invalid_json:' + e.message };
  }
}
function main() {
  try {
    report.git = {
      branch: gitValue('git rev-parse --abbrev-ref HEAD'),
      head: gitValue('git rev-parse HEAD'),
      origin_main: gitValue('git rev-parse origin/main'),
      rebase_active: existsSync(join(ROOT, '.git', 'rebase-merge')) || existsSync(join(ROOT, '.git', 'rebase-apply')),
      merge_active: existsSync(join(ROOT, '.git', 'MERGE_HEAD'))
    };

    const syntaxFailures = [];
    for (const f of ACTIVE) {
      if (!existsSync(join(ROOT, f))) { syntaxFailures.push({ file: f, reason: 'missing' }); continue; }
      const s = runStep('syntax:' + f, 'node --check "' + f + '"', { timeoutMs: 30000 });
      if (!s.ok) syntaxFailures.push({ file: f, reason: s.stderr_tail || s.stdout_tail });
    }
    report.gates.syntax_ok = syntaxFailures.length === 0;
    report.syntax_failures = syntaxFailures;

    report.gates.guard_ok = runStep('L2_FRONT_GUARD', 'node tools/sddf-front-guard.mjs', { timeoutMs: 60000 }).ok;
    const goTest = runStep('L3_GO_CORE_TEST', 'go test ./...', { cwd: join(ROOT, 'go-core'), timeoutMs: 180000 });
    const goBuild = runStep('L3_GO_CORE_BUILD', 'go build ./...', { cwd: join(ROOT, 'go-core'), timeoutMs: 180000 });
    report.gates.go_core_compiled = goTest.ok && goBuild.ok;

    const server = read('backend/server.js');
    const runner = read('backend/src/runtime/goRunner.js');
    const schema = read('go-core/contracts/result.schema.json');
    const pi = read('tools/pi-harness.mjs');

    report.gates.evidence_receipt_in_schema = /evidence_receipt|evidenceReceipt/.test(schema);
    report.gates.evidence_receipt_in_normalizer = /normalizeGoResult[\s\S]*evidence_receipt/.test(runner);
    const _combined = runner + '\n' + server;
    report.gates.legacy_clean = !/^(<<<<<<<|=======|>>>>>>>)/m.test(_combined) && !/PI HARNESS v5|LLM_SYSTEM|callLLM|applyLLMPatch|window\.fetch\s*=|RUN_PATH|STREAM_PATH/.test(_combined);
    report.gates.v14_ownership = existsSync(join(ROOT, 'frontend/assets/vision-api.js')) && existsSync(join(ROOT, 'frontend/assets/vision-runtime-owner.js')) && existsSync(join(ROOT, 'frontend/assets/vision-report.js'));
    report.gates.github_confirmed = Boolean(report.git.head && report.git.origin_main && report.git.head === report.git.origin_main);

    const probe = backendProbe();
    report.backend_probe = probe;
    report.gates.backend_alive = probe.backend_alive === true;
    report.gates.backend_stub = probe.backend_stub !== false;
    report.gates.backend_has_mission_id = probe.backend_has_mission_id === true;
    report.gates.backend_has_evidence_receipt = probe.backend_has_evidence_receipt === true;

    const reasons = [];
    if (!report.gates.syntax_ok) reasons.push('syntax_errors');
    if (!report.gates.guard_ok) reasons.push('front_guard');
    if (!report.gates.go_core_compiled) reasons.push('go_core_compiled');
    if (!report.gates.backend_alive) reasons.push('backend_alive');
    if (report.gates.backend_stub !== false) reasons.push('backend_not_stub');
    if (!report.gates.backend_has_mission_id) reasons.push('mission_id');
    if (!report.gates.backend_has_evidence_receipt) reasons.push('evidence_receipt');
    if (!report.gates.evidence_receipt_in_schema) reasons.push('schema_evidence_receipt');
    if (!report.gates.evidence_receipt_in_normalizer) reasons.push('normalizer_evidence_receipt');
    if (!report.gates.legacy_clean) reasons.push('legacy_clean');
    if (!report.gates.v14_ownership) reasons.push('v14_ownership');
    if (!report.gates.github_confirmed) reasons.push('github_confirmed');
    if (report.fatal_errors.length) reasons.push('fatal_errors');

    report.strict_pass_gold_reason = reasons;
    report.pass_gold_candidate = reasons.length === 0;
    report.promotion_allowed = report.pass_gold_candidate;
    report.deploy_allowed = report.pass_gold_candidate;
    console.log(JSON.stringify(report, null, 2));
    process.exit(report.pass_gold_candidate ? 0 : 2);
  } catch (e) {
    report.fatal_errors.push(e.stack || e.message || String(e));
    report.strict_pass_gold_reason = ['fatal_errors'];
    console.log(JSON.stringify(report, null, 2));
    process.exit(3);
  }
}
main();
