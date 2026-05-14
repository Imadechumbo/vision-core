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
  insertAfterOnce(
    "      'backend/src/runtime/goRunner.js',\n",
    "      'backend/server.js',\n",
    "      'backend/server.js',"
  );
}

insertAfterOnce(
  "'tools/pi-harness.mjs',\n",
  "    'backend/src/runtime/goRunner.js',\n    'backend/server.js',\n    'tools/pi-harness-v141-audit.mjs',\n    'tools/pi-harness-v141-backend-probe.mjs',\n    'tools/pi-harness-v141-endpoint-contract-audit.mjs',\n    'tools/pi-harness-v141-gold-gate-audit.mjs',\n    'tools/v14-backend-receipt-normalizer.mjs',\n    'tools/v14-backend-endpoint-normalizer.mjs',\n",
  "    'tools/v14-backend-receipt-normalizer.mjs',"
);

if (!s.includes("    'backend/server.js',") && s.includes("    'backend/src/runtime/goRunner.js',")) {
  insertAfterOnce("    'backend/src/runtime/goRunner.js',\n", "    'backend/server.js',\n", "    'backend/server.js',");
}

if (!s.includes("    'tools/pi-harness-v141-backend-probe.mjs',") && s.includes("    'tools/pi-harness-v141-audit.mjs',")) {
  insertAfterOnce("    'tools/pi-harness-v141-audit.mjs',\n", "    'tools/pi-harness-v141-backend-probe.mjs',\n", "    'tools/pi-harness-v141-backend-probe.mjs',");
}

if (!s.includes("    'tools/pi-harness-v141-endpoint-contract-audit.mjs',") && s.includes("    'tools/pi-harness-v141-backend-probe.mjs',")) {
  insertAfterOnce("    'tools/pi-harness-v141-backend-probe.mjs',\n", "    'tools/pi-harness-v141-endpoint-contract-audit.mjs',\n", "    'tools/pi-harness-v141-endpoint-contract-audit.mjs',");
}

if (!s.includes("    'tools/pi-harness-v141-gold-gate-audit.mjs',") && s.includes("    'tools/pi-harness-v141-endpoint-contract-audit.mjs',")) {
  insertAfterOnce("    'tools/pi-harness-v141-endpoint-contract-audit.mjs',\n", "    'tools/pi-harness-v141-gold-gate-audit.mjs',\n", "    'tools/pi-harness-v141-gold-gate-audit.mjs',");
}

if (!s.includes("    'tools/v14-backend-endpoint-normalizer.mjs',") && s.includes("    'tools/v14-backend-receipt-normalizer.mjs',")) {
  insertAfterOnce("    'tools/v14-backend-receipt-normalizer.mjs',\n", "    'tools/v14-backend-endpoint-normalizer.mjs',\n", "    'tools/v14-backend-endpoint-normalizer.mjs',");
}

if (!s.includes("evidence(`BACKEND_EVIDENCE_AUDIT:")) {
  const anchor = "evidence(`VALIDATION_ERRORS: ${errors.length}`);";
  const block = "\n\n  if (existsSync(join(ROOT, 'tools/pi-harness-v141-audit.mjs'))) {\n    const backendAudit = shFull('node tools/pi-harness-v141-audit.mjs');\n    evidence(`BACKEND_EVIDENCE_AUDIT: ${backendAudit.ok ? 'PASS' : 'BLOCKED'}`);\n    audit('backend evidence audit: ' + (backendAudit.ok ? 'PASS' : 'BLOCKED'));\n  }";
  if (s.includes(anchor)) {
    s = s.replace(anchor, anchor + block);
    changed = true;
  }
}

if (!s.includes("evidence(`BACKEND_RUNTIME_PROBE:")) {
  const anchor = "if (existsSync(join(ROOT, 'tools/pi-harness-v141-audit.mjs'))) {";
  const block = "if (existsSync(join(ROOT, 'tools/pi-harness-v141-backend-probe.mjs'))) {\n    const backendProbe = shFull('node tools/pi-harness-v141-backend-probe.mjs');\n    evidence(`BACKEND_RUNTIME_PROBE: ${backendProbe.ok ? 'PASS' : 'BLOCKED'}`);\n    audit('backend runtime probe: ' + (backendProbe.ok ? 'PASS' : 'BLOCKED'));\n  }\n\n  ";
  if (s.includes(anchor)) {
    s = s.replace(anchor, block + anchor);
    changed = true;
  }
}

if (!s.includes("evidence(`BACKEND_ENDPOINT_CONTRACT:")) {
  const anchor = "if (existsSync(join(ROOT, 'tools/pi-harness-v141-audit.mjs'))) {";
  const block = "if (existsSync(join(ROOT, 'tools/pi-harness-v141-endpoint-contract-audit.mjs'))) {\n    const endpointAudit = shFull('node tools/pi-harness-v141-endpoint-contract-audit.mjs');\n    evidence(`BACKEND_ENDPOINT_CONTRACT: ${endpointAudit.ok ? 'PASS' : 'BLOCKED'}`);\n    audit('backend endpoint contract: ' + (endpointAudit.ok ? 'PASS' : 'BLOCKED'));\n  }\n\n  ";
  if (s.includes(anchor)) {
    s = s.replace(anchor, block + anchor);
    changed = true;
  }
}

if (!s.includes("evidence(`BACKEND_GOLD_GATE_AUDIT:")) {
  const anchor = "if (existsSync(join(ROOT, 'tools/pi-harness-v141-audit.mjs'))) {";
  const block = "if (existsSync(join(ROOT, 'tools/pi-harness-v141-gold-gate-audit.mjs'))) {\n    const goldGateAudit = shFull('node tools/pi-harness-v141-gold-gate-audit.mjs');\n    evidence(`BACKEND_GOLD_GATE_AUDIT: ${goldGateAudit.ok ? 'PASS' : 'BLOCKED'}`);\n    audit('backend gold gate audit: ' + (goldGateAudit.ok ? 'PASS' : 'BLOCKED'));\n  }\n\n  ";
  if (s.includes(anchor)) {
    s = s.replace(anchor, block + anchor);
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
