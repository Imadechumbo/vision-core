#!/usr/bin/env node
import fs from 'node:fs';

const targets = [
  'backend/src/runtime/goRunner.js',
  'backend/server.js',
  'tools/pi-harness.mjs'
];

const required = {
  'backend/src/runtime/goRunner.js': [
    'evidence_receipt',
    'evidence_source',
    'Boolean(parsed.pass_gold && parsed.promotion_allowed)'
  ],
  'backend/server.js': [
    'evidence receipt required from Go Core'
  ],
  'tools/pi-harness.mjs': [
    'PASS_GOLD_REASON',
    'BACKEND_EVIDENCE_AUDIT',
    'BACKEND_RUNTIME_PROBE',
    'BACKEND_ENDPOINT_CONTRACT'
  ]
};

const forbidden = {
  'backend/src/runtime/goRunner.js': [
    'promotion_allowed: Boolean(parsed.promotion_allowed)'
  ],
  'backend/server.js': [
    'status: \'GOLD\'',
    'pass_gold_ready: true',
    'pass_gold: true, promotion_allowed: true'
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
  lines.push(`${file}: ${missing.length || bad.length ? 'BLOCKED' : 'OK'}` +
    (missing.length ? ` missing=[${missing.join(', ')}]` : '') +
    (bad.length ? ` forbidden=[${bad.join(', ')}]` : ''));
}

console.log('=== PI HARNESS V14.1 PASS GOLD GATE AUDIT ===');
console.log(`RESULT: ${blocked ? 'BLOCKED' : 'PASS'}`);
for (const line of lines) console.log(line);
console.log('PASS_GOLD_CANDIDATE: false');
console.log('PROMOTION_ALLOWED: false');
console.log('DEPLOY_ALLOWED: false');
process.exit(blocked ? 1 : 0);
