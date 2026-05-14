#!/usr/bin/env node
import fs from 'node:fs';

const targets = [
  'backend/server.js',
  'backend/src/runtime/goRunner.js',
  'tools/pi-harness.mjs',
  'frontend/assets/vision-report.js',
  'frontend/assets/vision-agent-local.js',
  'frontend/assets/vision-runtime-owner.js'
];

const forbidden = [
  'pass_gold:true',
  'pass_gold: true, promotion_allowed: true',
  'promotion_allowed:true',
  'deploy_allowed:true',
  'passGoldCandidate = true',
  'promotionAllowed = true',
  'deployAllowed = true',
  'status: \'GOLD\'',
  'pass_gold_ready: true'
];

let blocked = false;
const lines = [];

for (const file of targets) {
  if (!fs.existsSync(file)) {
    blocked = true;
    lines.push(`${file}: BLOCKED missing`);
    continue;
  }
  const text = fs.readFileSync(file, 'utf8');
  const hits = forbidden.filter((marker) => text.includes(marker));
  if (hits.length) blocked = true;
  lines.push(`${file}: ${hits.length ? 'BLOCKED forbidden=[' + hits.join(', ') + ']' : 'OK'}`);
}

console.log('=== PI HARNESS V14.1 NO FAKE GOLD AUDIT ===');
console.log(`RESULT: ${blocked ? 'BLOCKED' : 'PASS'}`);
for (const line of lines) console.log(line);
console.log('PASS_GOLD_CANDIDATE: false');
console.log('PROMOTION_ALLOWED: false');
console.log('DEPLOY_ALLOWED: false');
process.exit(blocked ? 1 : 0);
