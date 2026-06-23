#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const checks = [
  ['FINAL_BACKEND_AUDIT', 'tools/pi-harness-v141-final-audit.mjs'],
  ['FRONT_GUARD', 'tools/sddf-front-guard.mjs']
];

let blocked = false;
const lines = [];

for (const [name, file] of checks) {
  if (!fs.existsSync(file)) {
    blocked = true;
    lines.push(`${name}: BLOCKED missing ${file}`);
    continue;
  }
  const r = spawnSync(process.execPath, [file], { encoding: 'utf8', shell: false });
  const output = `${r.stdout || ''}${r.stderr || ''}`;
  const ok = r.status === 0 && !/\bBLOCKED\b|\bFAIL\b/i.test(output);
  if (!ok) blocked = true;
  lines.push(`${name}: ${ok ? 'PASS' : 'BLOCKED'}`);
}

const staticFiles = [
  'tools/pi-harness.mjs',
  'backend/src/runtime/goRunner.js',
  'backend/server.js',
  'frontend/assets/vision-runtime-owner.js',
  'frontend/assets/vision-report.js',
  'frontend/assets/vision-agent-local.js'
];
for (const file of staticFiles) {
  if (!fs.existsSync(file)) {
    blocked = true;
    lines.push(`${file}: BLOCKED missing`);
  } else {
    lines.push(`${file}: PRESENT`);
  }
}

console.log('=== PI HARNESS V14.1 RELEASE READINESS AUDIT ===');
console.log(`RESULT: ${blocked ? 'BLOCKED' : 'PASS'}`);
for (const line of lines) console.log(line);
console.log('RELEASE_READINESS: ' + (!blocked));
console.log('PASS_GOLD_CANDIDATE: false');
console.log('PROMOTION_ALLOWED: false');
console.log('DEPLOY_ALLOWED: false');
process.exit(blocked ? 1 : 0);
