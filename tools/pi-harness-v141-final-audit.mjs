#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const checks = [
  ['BACKEND_EVIDENCE_AUDIT', 'tools/pi-harness-v141-audit.mjs'],
  ['BACKEND_RUNTIME_PROBE', 'tools/pi-harness-v141-backend-probe.mjs'],
  ['BACKEND_ENDPOINT_CONTRACT', 'tools/pi-harness-v141-endpoint-contract-audit.mjs'],
  ['BACKEND_GOLD_GATE_AUDIT', 'tools/pi-harness-v141-gold-gate-audit.mjs']
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
  const resultLine = output.split(/\r?\n/).find((line) => line.startsWith('RESULT:')) || `RESULT: ${r.status === 0 ? 'PASS' : 'BLOCKED'}`;
  if (r.status !== 0 || /BLOCKED/.test(resultLine)) blocked = true;
  lines.push(`${name}: ${resultLine.replace('RESULT:', '').trim()}`);
}

console.log('=== PI HARNESS V14.1 FINAL BACKEND AUDIT ===');
console.log(`RESULT: ${blocked ? 'BLOCKED' : 'PASS'}`);
for (const line of lines) console.log(line);
console.log('BACKEND_EVIDENCE_READY: ' + (!blocked));
console.log('PASS_GOLD_CANDIDATE: false');
console.log('PROMOTION_ALLOWED: false');
console.log('DEPLOY_ALLOWED: false');
process.exit(blocked ? 1 : 0);
