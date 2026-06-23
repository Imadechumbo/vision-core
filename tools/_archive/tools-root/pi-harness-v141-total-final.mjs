#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const gates = [
  ['RUNTIME_CONTRACT_SUMMARY', 'tools/pi-harness-v141-runtime-contract-summary.mjs'],
  ['EVIDENCE_SUMMARY', 'tools/pi-harness-v141-evidence-summary.mjs'],
  ['NO_FAKE_GOLD', 'tools/pi-harness-v141-no-fake-gold-audit.mjs'],
  ['RELEASE_READINESS', 'tools/pi-harness-v141-release-readiness-audit.mjs'],
  ['GITHUB_CONFIRMATION', 'tools/pi-harness-v141-github-confirmation-audit.mjs']
];

let blocked = false;
const lines = [];

for (const [name, file] of gates) {
  if (!fs.existsSync(file)) {
    blocked = true;
    lines.push(`${name}: BLOCKED missing ${file}`);
    continue;
  }
  const run = spawnSync(process.execPath, [file], { encoding: 'utf8', shell: false });
  const output = `${run.stdout || ''}${run.stderr || ''}`;
  const ok = run.status === 0 && !/\bBLOCKED\b|\bFAIL\b|SyntaxError/i.test(output);
  if (!ok) blocked = true;
  lines.push(`${name}: ${ok ? 'PASS' : 'BLOCKED'}`);
}

console.log('=== PI HARNESS V14.1 TOTAL FINAL AUDIT ===');
console.log(`RESULT: ${blocked ? 'BLOCKED' : 'PASS'}`);
for (const line of lines) console.log(line);
console.log('V14_1_TOTAL_FINAL_READY: ' + (!blocked));
console.log('GITHUB_CONFIRMED: ' + (!blocked));
console.log('PASS_GOLD_CANDIDATE: false');
console.log('PROMOTION_ALLOWED: false');
console.log('DEPLOY_ALLOWED: false');
process.exit(blocked ? 1 : 0);
