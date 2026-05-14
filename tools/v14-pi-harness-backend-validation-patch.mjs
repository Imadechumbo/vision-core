#!/usr/bin/env node
import fs from 'node:fs';

const file = 'tools/pi-harness.mjs';
if (!fs.existsSync(file)) {
  console.log('SKIP: pi-harness file not found');
  process.exit(0);
}

let s = fs.readFileSync(file, 'utf8');
let changed = false;

function insertAfterOnce(anchor, insertion, marker) {
  if (s.includes(marker)) return;
  if (!s.includes(anchor)) return;
  s = s.replace(anchor, anchor + insertion);
  changed = true;
}

insertAfterOnce(
  "'frontend/assets/v231-backend-agents.js',\n",
  "      'backend/src/runtime/goRunner.js',\n",
  "      'backend/src/runtime/goRunner.js',"
);

insertAfterOnce(
  "'tools/pi-harness.mjs',\n",
  "    'backend/src/runtime/goRunner.js',\n    'tools/pi-harness-v141-audit.mjs',\n    'tools/v14-backend-receipt-normalizer.mjs',\n",
  "    'tools/v14-backend-receipt-normalizer.mjs',"
);

if (!s.includes("evidence(`BACKEND_EVIDENCE_AUDIT:")) {
  const anchor = "evidence(`VALIDATION_ERRORS: ${errors.length}`);";
  const block = "\n\n  if (existsSync(join(ROOT, 'tools/pi-harness-v141-audit.mjs'))) {\n    const backendAudit = shFull('node tools/pi-harness-v141-audit.mjs');\n    evidence(`BACKEND_EVIDENCE_AUDIT: ${backendAudit.ok ? 'PASS' : 'BLOCKED'}`);\n    audit('backend evidence audit: ' + (backendAudit.ok ? 'PASS' : 'BLOCKED'));\n  }";
  if (s.includes(anchor)) {
    s = s.replace(anchor, anchor + block);
    changed = true;
  }
}

if (!changed) {
  console.log('SKIP: pi harness backend validation already enabled');
  process.exit(0);
}

fs.writeFileSync(file, s, 'utf8');
console.log('PATCHED: pi harness backend validation/staging enabled');
