#!/usr/bin/env node
import fs from 'node:fs';

const targets = [
  'backend/src/runtime/goRunner.js',
  'backend/server.js',
  'tools/pi-harness.mjs'
];

const required = {
  'backend/src/runtime/goRunner.js': [
    'runGoMission',
    'streamGoMission',
    'evidence_receipt',
    'makeBackendReceipt',
    'evidence_source',
    'Boolean(parsed.pass_gold && parsed.promotion_allowed)'
  ],
  'backend/server.js': [
    '/api/run-live',
    '/api/run-live-stream'
  ],
  'tools/pi-harness.mjs': [
    'PASS_GOLD_REASON',
    'evidence_receipt',
    'BACKEND_EVIDENCE_AUDIT',
    'backend/src/runtime/goRunner.js'
  ]
};

const forbidden = {
  'backend/src/runtime/goRunner.js': [
    'promotion_allowed: Boolean(parsed.promotion_allowed)'
  ],
  'tools/pi-harness.mjs': [
    'passGoldCandidate = true',
    'promotionAllowed = true',
    'deployAllowed = true'
  ]
};

let blocked = false;
const lines = [];

for (const file of targets) {
  if (!fs.existsSync(file)) {
    blocked = true;
    lines.push(`${file}: BLOCKED missing file`);
    continue;
  }
  const text = fs.readFileSync(file, 'utf8');
  const missing = (required[file] || []).filter((x) => !text.includes(x));
  const bad = (forbidden[file] || []).filter((x) => text.includes(x));
  if (missing.length || bad.length) blocked = true;
  const status = missing.length || bad.length ? 'BLOCKED' : 'OK';
  const detail = [
    missing.length ? 'missing ' + missing.join(', ') : '',
    bad.length ? 'forbidden ' + bad.join(', ') : ''
  ].filter(Boolean).join(' | ');
  lines.push(`${file}: ${status}${detail ? ' — ' + detail : ''}`);
}

console.log('=== PI HARNESS V14.1 BACKEND RECEIPT AUDIT ===');
console.log(`RESULT: ${blocked ? 'BLOCKED' : 'PASS'}`);
for (const line of lines) console.log(line);
console.log('BACKEND_EVIDENCE_READY: ' + (!blocked));
console.log('PASS_GOLD_CANDIDATE: false');
console.log('PROMOTION_ALLOWED: false');
console.log('DEPLOY_ALLOWED: false');
process.exit(blocked ? 1 : 0);
