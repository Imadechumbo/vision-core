#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const full = args.includes('--full-js-check') || args.includes('--FullJsCheck');
const branchArg = args.find((x) => x.startsWith('--branch='));
const branch = branchArg ? branchArg.split('=').slice(1).join('=') : 'main';
const report = [];

function log(line) { report.push(String(line)); }
function finish(ok, message) {
  console.log('\n=== V14 TOTAL PI HARNESS REFACTOR SUMMARY ===');
  console.log(`RESULT: ${ok ? 'PASS' : 'FAIL'}`);
  console.log(`MESSAGE: ${message}`);
  console.log(`BRANCH: ${branch}`);
  console.log(`FULL_JS_CHECK: ${full ? 'true' : 'false'}`);
  console.log('PHASES:');
  console.log('  * L0 Intake');
  console.log('  * L1 Inspect');
  console.log('  * L2 Diagnose');
  console.log('  * L3 Plan');
  console.log('  * L4 Dry Run');
  console.log('  * L5 Controlled Patch');
  console.log('  * L6 Validation');
  console.log('  * L7 Evidence Receipt');
  console.log('GITHUB_CONFIRMED: see nested runner LOCAL_HEAD/REMOTE_HEAD');
  console.log('PASS_GOLD_CANDIDATE: false');
  console.log('PROMOTION_ALLOWED: false');
  console.log('DEPLOY_ALLOWED: false');
  console.log('--- EXECUTION LOG ---');
  for (const line of report) console.log(line);
  console.log(ok ? `OK: ${message}` : `FAIL: ${message}`);
  console.log('=== END SUMMARY ===');
  process.exit(ok ? 0 : 1);
}
function run(cmd, cmdArgs) {
  log(`> ${cmd} ${cmdArgs.join(' ')}`);
  const r = spawnSync(cmd, cmdArgs, { encoding: 'utf8', shell: false });
  const combined = `${r.stdout || ''}${r.stderr || ''}`.trim();
  if (combined) {
    for (const raw of combined.split(/\r?\n/)) {
      if (!raw.trim()) continue;
      const line = raw.length > 500 ? `${raw.slice(0, 500)} ...[truncated]` : raw;
      log(`  ${line}`);
    }
  }
  if (r.status !== 0) finish(false, `${cmd} failed with exit code ${r.status}`);
  return r.stdout || '';
}

try {
  log('MODE: total pi harness refactor runner');
  log('REPORTING: final summary only');
  run('git', ['pull', '--rebase', 'origin', branch]);
  run('node', ['tools/v14-runtime-bridge-patch.mjs']);
  const next = ['tools/v14-refactor-continue.mjs'];
  if (full) next.push('--full-js-check');
  next.push(`--branch=${branch}`);
  run('node', next);
  finish(true, 'total pi harness refactor pass completed');
} catch (error) {
  log(`EXCEPTION: ${error && error.message ? error.message : String(error)}`);
  finish(false, 'total pi harness refactor failed');
}
