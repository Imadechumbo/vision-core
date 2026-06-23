#!/usr/bin/env node
/**
 * Affected Test Runner — V15.11-pre
 * Routes tests based on git diff --name-only.
 * Outputs: FAST_LANE_PASS, FULL_LANE_REQUIRED, AFFECTED_TEST_PLAN, BLOCKED
 *
 * RULES:
 * - test:fast does NOT substitute test:prepush
 * - Full suite is always required before push
 * - deploy_allowed/release_allowed/tag_allowed/stable_allowed never altered
 */

import { spawnSync } from 'child_process';
import { resolve } from 'path';

const ROOT = resolve(process.cwd());

// ─── git diff ──────────────────────────────────────────────────
function getChangedFiles() {
  const result = spawnSync('git', ['diff', '--name-only', 'HEAD'], {
    cwd: ROOT,
    encoding: 'utf-8',
  });
  const staged = spawnSync('git', ['diff', '--name-only', '--cached'], {
    cwd: ROOT,
    encoding: 'utf-8',
  });
  const combined = [
    ...(result.stdout || '').split('\n'),
    ...(staged.stdout || '').split('\n'),
  ]
    .map(f => f.trim())
    .filter(Boolean);
  return [...new Set(combined)];
}

// ─── Routing rules ─────────────────────────────────────────────
function classifyChanges(files) {
  const plan = {
    full_suite_required:      false,
    go_suite_required:        false,
    frontend_guards_required: false,
    authority_unit_required:  false,
    reasons:                  [],
  };

  for (const f of files) {
    if (f === 'tools/pi-harness.mjs' || f === 'tools/tests/pi-harness.test.mjs') {
      plan.full_suite_required = true;
      plan.reasons.push(`${f} → full suite mandatory`);
    } else if (f.startsWith('go-core/')) {
      plan.go_suite_required = true;
      plan.reasons.push(`${f} → go test/build mandatory`);
    } else if (f.startsWith('frontend/')) {
      plan.frontend_guards_required = true;
      plan.reasons.push(`${f} → visual/frontend/sddf guards mandatory`);
    } else if (
      f === 'tools/hermes/authority-review.mjs' ||
      f === 'tools/hermes/authority-harness.mjs' ||
      f.startsWith('tools/fixtures/authority/')
    ) {
      plan.authority_unit_required = true;
      plan.reasons.push(`${f} → authority-unit + authority matrix mandatory`);
    }
  }

  return plan;
}

// ─── Runner helpers ────────────────────────────────────────────
function runNode(scriptPath, label, timeoutMs = 30000) {
  const start = Date.now();
  const result = spawnSync(process.execPath, ['--no-deprecation', scriptPath], {
    cwd: ROOT,
    encoding: 'utf-8',
    timeout: timeoutMs,
  });
  const elapsed = Date.now() - start;
  const ok = result.status === 0 && !result.error;
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  return { ok, elapsed, label };
}

// ─── Suites ────────────────────────────────────────────────────
function runSyntaxCheck() {
  // Syntax check all .mjs files in tools/
  const glob = spawnSync('node', [
    '--no-deprecation',
    '-e',
    `
import { readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';
import { spawnSync } from 'child_process';
function walk(dir) {
  const entries = readdirSync(dir);
  for (const e of entries) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) { walk(full); continue; }
    if (!e.endsWith('.mjs')) continue;
    const r = spawnSync(process.execPath, ['--input-type=module', '--check'], {
      input: require('fs').readFileSync(full, 'utf-8'),
      encoding: 'utf-8',
    });
    if (r.status !== 0) { console.error('SYNTAX FAIL:', full); process.exit(1); }
  }
}
walk(${JSON.stringify(resolve(process.cwd(), 'tools'))});
console.log('Syntax OK');
`.trim(),
  ], {
    cwd: ROOT,
    encoding: 'utf-8',
    timeout: 15000,
  });
  const ok = glob.status === 0 && !glob.error;
  if (glob.stdout) process.stdout.write(glob.stdout);
  if (glob.stderr) process.stderr.write(glob.stderr);
  return { ok, elapsed: 0, label: 'syntax' };
}

// ─── Main ──────────────────────────────────────────────────────
const changedFiles = getChangedFiles();
const plan = classifyChanges(changedFiles);

console.log('\n[test-lane] Changed files:', changedFiles.length > 0 ? changedFiles.join(', ') : '(none)');

const results = [];
let blocked = false;
let fastLanePass = true;
const fullLaneRequired = plan.full_suite_required || plan.go_suite_required;

// Always run authority unit if authority files changed or if none changed (fast default)
const runAuthorityUnit = plan.authority_unit_required || (!plan.full_suite_required && !plan.go_suite_required && !plan.frontend_guards_required);

if (runAuthorityUnit) {
  console.log('\n[test-lane] Running authority unit tests...');
  const r = runNode(resolve(ROOT, 'tools', 'tests', 'authority.test.mjs'), 'authority-unit', 30000);
  results.push(r);
  if (!r.ok) { fastLanePass = false; blocked = true; }
}

if (plan.frontend_guards_required) {
  console.log('\n[test-lane] Frontend changed → visual/frontend/sddf guards required (run test:guards manually)');
  fastLanePass = false;
}

// ─── Output summary ────────────────────────────────────────────
console.log('\n╔══════════════════════════════════════════╗');
console.log('║  AFFECTED TEST PLAN — V15.11-pre         ║');
console.log('╚══════════════════════════════════════════╝');
console.log('AFFECTED_FILES:', changedFiles.length);
console.log('AFFECTED_TEST_PLAN:');
if (plan.reasons.length === 0) {
  console.log('  (no routing triggers — authority-unit ran as default fast lane)');
} else {
  for (const r of plan.reasons) console.log(' ', r);
}
console.log('');
console.log('FAST_LANE_PASS:    ', fastLanePass && !blocked);
console.log('FULL_LANE_REQUIRED:', fullLaneRequired);
console.log('GO_SUITE_REQUIRED: ', plan.go_suite_required);
console.log('FRONTEND_GUARDS:   ', plan.frontend_guards_required);
console.log('BLOCKED:           ', blocked);
console.log('');
console.log('NOTE: test:fast does NOT substitute test:prepush.');
console.log('NOTE: Always run test:prepush before git push.');
console.log('NOTE: deploy_allowed=false / release_allowed=false / tag_allowed=false / stable_allowed=false');

if (results.some(r => !r.ok)) {
  console.log('\n[test-lane] FAIL — one or more suites failed');
  process.exit(1);
}

if (blocked) {
  console.log('\n[test-lane] BLOCKED');
  process.exit(1);
}

console.log('\n[test-lane] FAST_LANE_PASS');
