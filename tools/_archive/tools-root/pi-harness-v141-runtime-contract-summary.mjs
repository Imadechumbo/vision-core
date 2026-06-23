#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const commands = [
  ['NODE_CHECK_PI_HARNESS', ['--check', 'tools/pi-harness.mjs']],
  ['NODE_CHECK_GO_RUNNER', ['--check', 'backend/src/runtime/goRunner.js']],
  ['NODE_CHECK_BACKEND_SERVER', ['--check', 'backend/server.js']],
  ['NODE_CHECK_RUNTIME_OWNER', ['--check', 'frontend/assets/vision-runtime-owner.js']],
  ['NODE_CHECK_REPORT_OWNER', ['--check', 'frontend/assets/vision-report.js']],
  ['NODE_CHECK_AGENT_OWNER', ['--check', 'frontend/assets/vision-agent-local.js']],
  ['V141_EVIDENCE_SUMMARY', ['tools/pi-harness-v141-evidence-summary.mjs']]
];

let blocked = false;
const lines = [];

for (const [name, args] of commands) {
  const file = args[args.length - 1];
  if (!fs.existsSync(file)) {
    blocked = true;
    lines.push(`${name}: BLOCKED missing ${file}`);
    continue;
  }
  const r = spawnSync(process.execPath, args, { encoding: 'utf8', shell: false });
  const output = `${r.stdout || ''}${r.stderr || ''}`;
  const ok = r.status === 0 && !/\bBLOCKED\b|\bFAIL\b|SyntaxError/i.test(output);
  if (!ok) blocked = true;
  lines.push(`${name}: ${ok ? 'PASS' : 'BLOCKED'}`);
}

console.log('=== PI HARNESS V14.1 RUNTIME CONTRACT SUMMARY ===');
console.log(`RESULT: ${blocked ? 'BLOCKED' : 'PASS'}`);
for (const line of lines) console.log(line);
console.log('V14_1_RUNTIME_CONTRACT_READY: ' + (!blocked));
console.log('PASS_GOLD_CANDIDATE: false');
console.log('PROMOTION_ALLOWED: false');
console.log('DEPLOY_ALLOWED: false');
process.exit(blocked ? 1 : 0);
