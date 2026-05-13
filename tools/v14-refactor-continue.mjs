#!/usr/bin/env node
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const args = new Set(process.argv.slice(2));
const fullJsCheck = args.has('--full-js-check') || args.has('--FullJsCheck');
const noPush = args.has('--no-push') || args.has('--NoPush');
const branchArg = process.argv.find((x) => x.startsWith('--branch='));
const branch = branchArg ? branchArg.split('=').slice(1).join('=') : 'main';
const commitArg = process.argv.find((x) => x.startsWith('--commit-message='));
const commitMessage = commitArg ? commitArg.split('=').slice(1).join('=') : 'refactor(frontend): continue v14 clean runtime ownership';

const report = [];
const applied = [];
const skipped = [];
const layers = [];
const audit = [];
const harness = {
  difficulty: 'D3',
  difficultyLabel: 'High - legacy frontend/runtime refactor',
  mode: 'ORCHESTRATING',
  currentLayer: 'L0',
  passGoldCandidate: false,
  promotionAllowed: false,
  deployAllowed: false,
  githubConfirmed: false,
};

function add(line) { report.push(String(line)); }
function addApplied(line) { applied.push(String(line)); add(`APPLIED: ${line}`); }
function addSkipped(line) { skipped.push(String(line)); add(`SKIPPED: ${line}`); }
function addAudit(line) { audit.push(String(line)); add(`AUDIT: ${line}`); }
function layer(id, label) { harness.currentLayer = id; layers.push(`${id} - ${label}`); add(`LAYER: ${id} - ${label}`); }

function finish(ok, message) {
  console.log('\n=== V14 TOTAL REFACTOR RUNNER SUMMARY ===');
  console.log(`RESULT: ${ok ? 'PASS' : 'FAIL'}`);
  console.log(`MESSAGE: ${message}`);
  console.log(`PI_HARNESS_DIFFICULTY: ${harness.difficulty} - ${harness.difficultyLabel}`);
  console.log(`PI_HARNESS_MODE: ${ok ? 'READY' : 'BLOCKED'}`);
  console.log(`CURRENT_LAYER: ${harness.currentLayer}`);
  console.log(`GITHUB_CONFIRMED: ${harness.githubConfirmed ? 'true' : 'false'}`);
  console.log(`PASS_GOLD_CANDIDATE: ${harness.passGoldCandidate ? 'true' : 'false'}`);
  console.log(`PROMOTION_ALLOWED: ${harness.promotionAllowed ? 'true' : 'false'}`);
  console.log(`DEPLOY_ALLOWED: ${harness.deployAllowed ? 'true' : 'false'}`);
  console.log(`LAYERS_COUNT: ${layers.length}`);
  for (const item of layers) console.log(`  * ${item}`);
  console.log(`AUDIT_COUNT: ${audit.length}`);
  for (const item of audit) console.log(`  ! ${item}`);
  console.log(`APPLIED_COUNT: ${applied.length}`);
  for (const item of applied) console.log(`  + ${item}`);
  console.log(`SKIPPED_COUNT: ${skipped.length}`);
  for (const item of skipped) console.log(`  - ${item}`);
  console.log('--- EXECUTION LOG ---');
  for (const line of report) console.log(line);
  console.log(ok ? `OK: ${message}` : `FAIL: ${message}`);
  console.log('=== END SUMMARY ===');
  process.exit(ok ? 0 : 1);
}

function run(cmd, cmdArgs, options = {}) {
  add(`> ${cmd} ${cmdArgs.join(' ')}`);
  const result = spawnSync(cmd, cmdArgs, { encoding: 'utf8', shell: false, ...options });
  const combined = `${result.stdout || ''}${result.stderr || ''}`.trim();
  if (combined && !options.silentOutput) {
    for (const raw of combined.split(/\r?\n/)) {
      if (!raw.trim()) continue;
      const line = raw.length > 500 ? `${raw.slice(0, 500)} ...[truncated]` : raw;
      add(`  ${line}`);
    }
  }
  if (result.status !== 0) {
    finish(false, `${cmd} failed with exit code ${result.status}: ${cmdArgs.join(' ')}`);
  }
  return result.stdout || '';
}

function runSoft(cmd, cmdArgs, options = {}) {
  add(`> ${cmd} ${cmdArgs.join(' ')}`);
  const result = spawnSync(cmd, cmdArgs, { encoding: 'utf8', shell: false, ...options });
  const combined = `${result.stdout || ''}${result.stderr || ''}`.trim();
  if (combined && !options.silentOutput) {
    for (const raw of combined.split(/\r?\n/)) {
      if (!raw.trim()) continue;
      const line = raw.length > 500 ? `${raw.slice(0, 500)} ...[truncated]` : raw;
      add(`  ${line}`);
    }
  }
  return { code: result.status, stdout: result.stdout || '', stderr: result.stderr || '' };
}

function read(path) {
  return fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : null;
}

function write(path, content) {
  fs.writeFileSync(path, content, 'utf8');
}

function countMarkers(content, markers) {
  const found = [];
  for (const marker of markers) {
    if (content.includes(marker)) found.push(marker);
  }
  return found;
}

function ensureAdapter(path, marker, description, content) {
  const current = read(path);
  if (current === null) {
    addSkipped(`missing file: ${path}`);
    return;
  }
  if (current.includes(marker)) {
    addSkipped(`${description} already delegated`);
    return;
  }
  write(path, content);
  addApplied(description);
}

function assertNoForbidden(path) {
  const content = read(path);
  if (content === null) return;
  const forbidden = ['RUN_PATH', 'STREAM_PATH', 'new EventSource', 'window.fetch =', 'window.EventSource =', 'pass_gold:true', 'promotion_allowed:true'];
  for (const marker of forbidden) {
    if (content.includes(marker)) finish(false, `forbidden marker remains in ${path}: ${marker}`);
  }
}

function auditLegacyRuntimeOwnership() {
  layer('L4', 'Dry Run: audit critical v34/v44 runtime ownership before patching');
  harness.difficulty = 'D4';
  harness.difficultyLabel = 'Critical - legacy SSE/report/orbit ownership audit';

  const targets = [
    ['frontend/assets/vision-v34-enterprise.js', ['EventSource', '__VISION_SSE__', 'MutationObserver', 'doReport', 'fetch(', 'orbitActivate', 'PASS GOLD', 'v236AnimatePipelineDemo']],
    ['frontend/assets/vision-v44-runtime-consistency.js', ['EventSource', '__VISION_SSE__', 'buildReport', 'syncGates', 'download', 'setNode', 'PI HARNESS demo', 'setTimeout(function()']],
  ];

  for (const [path, markers] of targets) {
    const content = read(path);
    if (content === null) {
      addAudit(`${path}: missing`);
      continue;
    }
    const found = countMarkers(content, markers);
    addAudit(`${path}: markers=${found.length} [${found.join(', ') || 'none'}]`);
  }

  addAudit('D4 decision: no destructive v34/v44 patch yet; clean owners must absorb SSE/report/status first');
}

function applyPendingPatches() {
  layer('L3', 'Plan and apply controlled legacy adapter patch set');
  const v233 = `/* VISION CORE V2.3.3 - LEGACY REALTIME ADAPTER
 * V14 CLEAN: runtime execution and stream ownership belong to vision-runtime-owner.js.
 * This adapter keeps load compatibility only.
 */
(function(){
  'use strict';
  if (window.__V233_REALTIME_ADAPTER__) return;
  window.__V233_REALTIME_ADAPTER__ = true;

  function delegate() {
    if (window.VisionRuntimeOwner && typeof window.VisionRuntimeOwner.executeMission === 'function') {
      console.log('[V233] delegated to VisionRuntimeOwner clean owner');
      return true;
    }
    return false;
  }

  function boot() {
    if (delegate()) return;
    setTimeout(delegate, 300);
    setTimeout(delegate, 1200);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
`;
  ensureAdapter('frontend/assets/v233-realtime.js', '__V233_REALTIME_ADAPTER__', 'v233 realtime -> VisionRuntimeOwner adapter', v233);
}

function stagedChangesExist() {
  const staged = run('git', ['diff', '--cached', '--name-only'], { silentOutput: true }).trim();
  return staged.length > 0;
}

try {
  add('MODE: node resumable refactor runner');
  add(`BRANCH: ${branch}`);
  add(`FULL_JS_CHECK: ${fullJsCheck ? 'true' : 'false'}`);
  add(`PUSH: ${noPush ? 'false' : 'true'}`);
  add('PI_HARNESS: adaptive local runner enabled');

  layer('L0', 'Intake: load refactor objective and options');
  layer('L1', 'Inspect: sync repository and inspect pending ownership patches');
  run('git', ['pull', '--rebase', 'origin', branch], { silentOutput: true });

  layer('L2', 'Diagnose: determine whether legacy runtime still owns forbidden behavior');
  applyPendingPatches();
  auditLegacyRuntimeOwnership();
  assertNoForbidden('frontend/assets/v233-realtime.js');

  layer('L6', 'Validation: syntax, checkpoint, front guard, and git integrity');
  run('node', ['--check', 'frontend/assets/v233-realtime.js'], { silentOutput: true });
  run('node', ['--check', 'frontend/assets/vision-v34-enterprise.js'], { silentOutput: true });
  run('node', ['--check', 'frontend/assets/vision-v44-runtime-consistency.js'], { silentOutput: true });

  const checkpointArgs = ['-ExecutionPolicy', 'Bypass', '-File', 'tools/v14-refactor-checkpoint.ps1', '-Quiet'];
  if (fullJsCheck) checkpointArgs.push('-FullJsCheck');
  run('powershell', checkpointArgs, { silentOutput: true });

  run('git', ['diff', '--check'], { silentOutput: true });

  layer('L7', 'Evidence Receipt: commit/push verification and remote HEAD match');
  const status = run('git', ['status', '--porcelain'], { silentOutput: true }).trim();
  if (status) {
    add('GIT: local changes detected; checking staged diff');
    run('git', ['add', 'frontend', 'docs', 'tools', '.github'], { silentOutput: true });
    if (stagedChangesExist()) {
      const commit = runSoft('git', ['commit', '-m', commitMessage], { silentOutput: true });
      if (commit.code !== 0) {
        const afterCommitStatus = run('git', ['status', '--porcelain'], { silentOutput: true }).trim();
        if (afterCommitStatus) finish(false, `git commit failed with exit code ${commit.code}`);
        add('GIT: commit skipped because there were no staged changes after normalization');
      }
    } else {
      add('GIT: no staged changes after git add; commit skipped');
    }
  } else {
    add('GIT: working tree clean, no commit needed');
  }

  if (!noPush) {
    run('git', ['push', 'origin', branch], { silentOutput: true });
    run('git', ['fetch', 'origin', branch], { silentOutput: true });
    const local = run('git', ['rev-parse', 'HEAD'], { silentOutput: true }).trim();
    const remote = run('git', ['rev-parse', `origin/${branch}`], { silentOutput: true }).trim();
    add(`LOCAL_HEAD: ${local}`);
    add(`REMOTE_HEAD: ${remote}`);
    if (local !== remote) finish(false, 'remote HEAD does not match local HEAD');
    harness.githubConfirmed = true;
  } else {
    add('GITHUB: push disabled; remote confirmation skipped');
  }

  harness.passGoldCandidate = false;
  harness.promotionAllowed = false;
  harness.deployAllowed = false;
  finish(true, 'resumable refactor block completed');
} catch (error) {
  add(`EXCEPTION: ${error && error.message ? error.message : String(error)}`);
  finish(false, 'resumable refactor block failed');
}
