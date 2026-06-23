#!/usr/bin/env node
import fs from 'node:fs';

const file = 'backend/server.js';
let blocked = false;
const lines = [];

function has(text, marker) { return text.includes(marker); }

if (!fs.existsSync(file)) {
  blocked = true;
  lines.push('backend/server.js: BLOCKED missing file');
} else {
  const text = fs.readFileSync(file, 'utf8');
  const checks = [
    ['/api/run-live route', has(text, '/api/run-live')],
    ['/api/run-live-stream route', has(text, '/api/run-live-stream')],
    ['runGoMission integration', has(text, 'runGoMission')],
    ['streamGoMission integration', has(text, 'streamGoMission')],
    ['evidence receipt propagation', has(text, 'evidence_receipt')],
    ['no fake pass gold literal', !has(text, 'pass_gold:true') && !has(text, 'pass_gold: true, promotion_allowed: true')]
  ];
  for (const [label, ok] of checks) {
    if (!ok) blocked = true;
    lines.push(`backend/server.js ${label}: ${ok ? 'OK' : 'BLOCKED'}`);
  }
}

console.log('=== PI HARNESS V14.1 ENDPOINT CONTRACT AUDIT ===');
console.log(`RESULT: ${blocked ? 'BLOCKED' : 'PASS'}`);
for (const line of lines) console.log(line);
console.log('PASS_GOLD_CANDIDATE: false');
console.log('PROMOTION_ALLOWED: false');
console.log('DEPLOY_ALLOWED: false');
process.exit(blocked ? 1 : 0);
