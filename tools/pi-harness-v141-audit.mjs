#!/usr/bin/env node
import fs from 'node:fs';

const targets = ['backend/src/runtime/goRunner.js', 'backend/server.js', 'tools/pi-harness.mjs'];
const required = {
  'backend/src/runtime/goRunner.js': ['runGoMission', 'streamGoMission', 'evidence_receipt'],
  'backend/server.js': ['/api/run-live', '/api/run-live-stream'],
  'tools/pi-harness.mjs': ['PASS_GOLD_REASON', 'evidence_receipt']
};
let blocked = false;
const lines = [];
for (const file of targets) {
  if (!fs.existsSync(file)) {
    blocked = true;
    lines.push(`${file}: missing`);
    continue;
  }
  const text = fs.readFileSync(file, 'utf8');
  const missing = (required[file] || []).filter((x) => !text.includes(x));
  if (missing.length) blocked = true;
  lines.push(`${file}: ${missing.length ? 'BLOCKED missing ' + missing.join(', ') : 'OK'}`);
}
console.log('=== PI HARNESS V14.1 BACKEND RECEIPT AUDIT ===');
console.log(`RESULT: ${blocked ? 'BLOCKED' : 'PASS'}`);
for (const line of lines) console.log(line);
console.log('PASS_GOLD_CANDIDATE: false');
console.log('PROMOTION_ALLOWED: false');
console.log('DEPLOY_ALLOWED: false');
process.exit(blocked ? 1 : 0);
