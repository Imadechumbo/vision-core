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
  "      'backend/src/runtime/goRunner.js',\n      'backend/server.js',\n",
  "      'backend/src/runtime/goRunner.js',"
);

if (!s.includes("      'backend/server.js',")) {
  insertAfterOnce("      'backend/src/runtime/goRunner.js',\n", "      'backend/server.js',\n", "      'backend/server.js',");
}

insertAfterOnce(
  "'tools/pi-harness.mjs',\n",
  "    'backend/src/runtime/goRunner.js',\n    'backend/server.js',\n    'tools/pi-harness-v141-audit.mjs',\n    'tools/pi-harness-v141-backend-probe.mjs',\n    'tools/pi-harness-v141-endpoint-contract-audit.mjs',\n    'tools/pi-harness-v141-gold-gate-audit.mjs',\n    'tools/pi-harness-v141-final-audit.mjs',\n    'tools/pi-harness-v141-release-readiness-audit.mjs',\n    'tools/pi-harness-v141-evidence-summary.mjs',\n    'tools/v14-backend-receipt-normalizer.mjs',\n    'tools/v14-backend-endpoint-normalizer.mjs',\n",
  "    'tools/v14-backend-receipt-normalizer.mjs',"
);

const toolOrder = [
  ['tools/pi-harness-v141-backend-probe.mjs', 'tools/pi-harness-v141-audit.mjs'],
  ['tools/pi-harness-v141-endpoint-contract-audit.mjs', 'tools/pi-harness-v141-backend-probe.mjs'],
  ['tools/pi-harness-v141-gold-gate-audit.mjs', 'tools/pi-harness-v141-endpoint-contract-audit.mjs'],
  ['tools/pi-harness-v141-final-audit.mjs', 'tools/pi-harness-v141-gold-gate-audit.mjs'],
  ['tools/pi-harness-v141-release-readiness-audit.mjs', 'tools/pi-harness-v141-final-audit.mjs'],
  ['tools/pi-harness-v141-evidence-summary.mjs', 'tools/pi-harness-v141-release-readiness-audit.mjs'],
  ['tools/v14-backend-endpoint-normalizer.mjs', 'tools/v14-backend-receipt-normalizer.mjs']
];

for (const [tool, after] of toolOrder) {
  const line = `    '${tool}',\n`;
  const anchor = `    '${after}',\n`;
  if (!s.includes(line) && s.includes(anchor)) insertAfterOnce(anchor, line, line);
}

function addEvidence(marker, script, label, auditLabel) {
  if (s.includes(`evidence(\`${marker}:`)) return;
  const anchor = "if (existsSync(join(ROOT, 'tools/pi-harness-v141-audit.mjs'))) {";
  const block = `if (existsSync(join(ROOT, '${script}'))) {\n    const probe = shFull('node ${script}');\n    evidence(\`${marker}: \${probe.ok ? 'PASS' : 'BLOCKED'}\`);\n    audit('${auditLabel}: ' + (probe.ok ? 'PASS' : 'BLOCKED'));\n  }\n\n  `;
  if (s.includes(anchor)) {
    s = s.replace(anchor, block + anchor);
    changed = true;
  }
}

addEvidence('BACKEND_RUNTIME_PROBE', 'tools/pi-harness-v141-backend-probe.mjs', 'backend runtime probe', 'backend runtime probe');
addEvidence('BACKEND_ENDPOINT_CONTRACT', 'tools/pi-harness-v141-endpoint-contract-audit.mjs', 'backend endpoint contract', 'backend endpoint contract');
addEvidence('BACKEND_GOLD_GATE_AUDIT', 'tools/pi-harness-v141-gold-gate-audit.mjs', 'backend gold gate audit', 'backend gold gate audit');
addEvidence('BACKEND_FINAL_AUDIT', 'tools/pi-harness-v141-final-audit.mjs', 'backend final audit', 'backend final audit');
addEvidence('RELEASE_READINESS', 'tools/pi-harness-v141-release-readiness-audit.mjs', 'release readiness audit', 'release readiness audit');
addEvidence('V141_EVIDENCE_SUMMARY', 'tools/pi-harness-v141-evidence-summary.mjs', 'v141 evidence summary', 'v141 evidence summary');

if (!s.includes("evidence(`BACKEND_EVIDENCE_AUDIT:")) {
  const anchor = "evidence(`VALIDATION_ERRORS: ${errors.length}`);";
  const block = "\n\n  if (existsSync(join(ROOT, 'tools/pi-harness-v141-audit.mjs'))) {\n    const backendAudit = shFull('node tools/pi-harness-v141-audit.mjs');\n    evidence(`BACKEND_EVIDENCE_AUDIT: ${backendAudit.ok ? 'PASS' : 'BLOCKED'}`);\n    audit('backend evidence audit: ' + (backendAudit.ok ? 'PASS' : 'BLOCKED'));\n  }";
  if (s.includes(anchor)) {
    s = s.replace(anchor, anchor + block);
    changed = true;
  }
}

if (!s.includes("node --check backend/server.js")) {
  const anchor = "if (existsSync(join(ROOT, 'tools/pi-harness-v141-audit.mjs'))) {";
  const block = "if (existsSync(join(ROOT, 'backend/server.js'))) {\n    const backendServerCheck = shFull('node --check backend/server.js');\n    evidence(`BACKEND_SERVER_CHECK: ${backendServerCheck.ok ? 'PASS' : 'BLOCKED'}`);\n    audit('backend server syntax: ' + (backendServerCheck.ok ? 'PASS' : 'BLOCKED'));\n  }\n\n  ";
  if (s.includes(anchor)) {
    s = s.replace(anchor, block + anchor);
    changed = true;
  }
}

if (!changed) {
  console.log('SKIP: pi harness backend validation already enabled');
  process.exit(0);
}

fs.writeFileSync(file, s, 'utf8');
console.log('PATCHED: pi harness backend validation/staging enabled');
