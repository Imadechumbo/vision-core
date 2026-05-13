#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const full = args.includes('--full-js-check') || args.includes('--FullJsCheck');
const branchArg = args.find((x) => x.startsWith('--branch='));
const branch = branchArg ? branchArg.split('=').slice(1).join('=') : 'main';
const report = [];
const evidence = [];
let legacyCleanConfirmed = false;
let v14CleanOwnership = false;

function log(line) { report.push(String(line)); }
function note(line) { evidence.push(String(line)); }
function finish(ok, message) {
  console.log('\n=== V14 TOTAL PI HARNESS REFACTOR SUMMARY ===');
  console.log(`RESULT: ${ok ? 'PASS' : 'FAIL'}`);
  console.log(`MESSAGE: ${message}`);
  console.log(`BRANCH: ${branch}`);
  console.log(`FULL_JS_CHECK: ${full ? 'true' : 'false'}`);
  console.log('PI_HARNESS_MODE: TOTAL_AUTOMATION');
  console.log('REPORTING: FINAL_SUMMARY_ONLY');
  console.log('PHASES: L0,L1,L2,L3,L4,L5,L6,L7');
  console.log('GITHUB_CONFIRMED: true when nested runner confirms LOCAL_HEAD == REMOTE_HEAD');
  console.log('PASS_GOLD_CANDIDATE: false');
  console.log('PROMOTION_ALLOWED: false');
  console.log('DEPLOY_ALLOWED: false');
  console.log(`LEGACY_CLEAN_CONFIRMED: ${legacyCleanConfirmed ? 'true' : 'false'}`);
  console.log(`V14_CLEAN_OWNERSHIP: ${v14CleanOwnership ? 'true' : 'false'}`);
  console.log(`EVIDENCE_COUNT: ${evidence.length}`);
  for (const line of evidence) console.log(`  * ${line}`);
  console.log('--- COMPACT EXECUTION LOG ---');
  for (const line of report) console.log(line);
  console.log(ok ? `OK: ${message}` : `FAIL: ${message}`);
  console.log('=== END SUMMARY ===');
  process.exit(ok ? 0 : 1);
}
function run(cmd, cmdArgs, options = {}) {
  log(`> ${cmd} ${cmdArgs.join(' ')}`);
  const r = spawnSync(cmd, cmdArgs, { encoding: 'utf8', shell: false });
  const combined = `${r.stdout || ''}${r.stderr || ''}`.trim();
  if (!options.suppressOutput && combined) {
    for (const raw of combined.split(/\r?\n/)) {
      if (!raw.trim()) continue;
      const line = raw.length > 500 ? `${raw.slice(0, 500)} ...[truncated]` : raw;
      log(`  ${line}`);
    }
  }
  if (r.status !== 0) {
    if (combined) note(`blocked output captured from ${cmd}: ${combined.split(/\r?\n/).filter(Boolean).slice(-6).join(' | ')}`);
    finish(false, `${cmd} failed with exit code ${r.status}`);
  }
  return combined;
}
function parseNestedEvidence(output) {
  const lines = output.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  for (const key of ['RESULT:', 'MESSAGE:', 'PI_HARNESS_DIFFICULTY:', 'GITHUB_CONFIRMED:', 'PASS_GOLD_CANDIDATE:', 'PROMOTION_ALLOWED:', 'DEPLOY_ALLOWED:', 'LOCAL_HEAD:', 'REMOTE_HEAD:', 'LEGACY_CLEAN_CONFIRMED:', 'V14_CLEAN_OWNERSHIP:']) {
    const hit = [...lines].reverse().find((line) => line.startsWith(key));
    if (hit) {
      note(hit);
      if (key === 'LEGACY_CLEAN_CONFIRMED:' && hit.includes('true')) legacyCleanConfirmed = true;
      if (key === 'V14_CLEAN_OWNERSHIP:' && hit.includes('true')) v14CleanOwnership = true;
    }
  }
}

try {
  log('MODE: total pi harness refactor runner');
  log('REPORTING: final summary only');
  run('git', ['pull', '--rebase', 'origin', branch], { suppressOutput: true });
  note('git pull/rebase completed');
  const runtimeBridgeOutput = run('node', ['tools/v14-runtime-bridge-patch.mjs'], { suppressOutput: true });
  note(runtimeBridgeOutput || 'runtime bridge patcher completed with no output');
  const reportBridgeOutput = run('node', ['tools/v14-report-bridge-patch.mjs'], { suppressOutput: true });
  note(reportBridgeOutput || 'report bridge patcher completed with no output');
  const statusBridgeOutput = run('node', ['tools/v14-status-bridge-patch.mjs'], { suppressOutput: true });
  note(statusBridgeOutput || 'status bridge patcher completed with no output');
  const legacyAdapterOutput = run('node', ['tools/v14-legacy-adapter-patch.mjs'], { suppressOutput: true });
  note(legacyAdapterOutput || 'legacy adapter patcher completed with no output');
  const next = ['tools/v14-refactor-continue.mjs'];
  if (full) next.push('--full-js-check');
  next.push(`--branch=${branch}`);
  next.push('--skip-pull');
  const nestedOutput = run('node', next, { suppressOutput: true });
  parseNestedEvidence(nestedOutput);
  finish(true, 'total pi harness refactor pass completed');
} catch (error) {
  note(`EXCEPTION: ${error && error.message ? error.message : String(error)}`);
  finish(false, 'total pi harness refactor failed');
}
