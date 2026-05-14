#!/usr/bin/env node
import fs from 'node:fs';

const file = 'backend/src/runtime/goRunner.js';
if (!fs.existsSync(file)) {
  console.log('SKIP: goRunner not found');
  process.exit(0);
}

let s = fs.readFileSync(file, 'utf8');
if (s.includes('function makeBackendReceipt(') && s.includes('evidence_receipt: receipt')) {
  console.log('SKIP: backend receipt already normalized');
  process.exit(0);
}

const anchor = 'function normalizeGoResult(parsed, stdout, stderr, bin) {';
if (!s.includes(anchor)) {
  console.error('BLOCKED: normalizeGoResult anchor not found');
  process.exit(1);
}

const helper = [
  'function makeBackendReceipt(parsed, stdout, stderr, bin) {',
  "  const mission = parsed.mission_id || 'mission';",
  "  const snap = parsed.snapshot_id || 'snapshot';",
  "  const status = parsed.pass_gold === true ? 'gold' : 'blocked';",
  "  const size = String((stdout || '').length + (stderr || '').length);",
  "  return ['evr', mission, snap, status, size, Date.now()].map(function (x) {",
  "    return String(x).replace(/[^a-zA-Z0-9._-]+/g, '-');",
  "  }).join('_');",
  '}',
  ''
].join('\n');

if (!s.includes('function makeBackendReceipt(')) {
  s = s.replace(anchor, helper + anchor);
}

s = s.replace(
  'function normalizeGoResult(parsed, stdout, stderr, bin) {\n  return {',
  'function normalizeGoResult(parsed, stdout, stderr, bin) {\n  const receipt = parsed.evidence_receipt || makeBackendReceipt(parsed, stdout, stderr, bin);\n  return {'
);

s = s.replace(
  "summary:           parsed.summary || '',\n    go_binary:",
  "summary:           parsed.summary || '',\n    evidence_receipt: receipt,\n    evidence_source: 'go_core_runtime_result',\n    go_binary:"
);

s = s.replace(
  "summary:           result.summary,\n    });",
  "summary:           result.summary,\n      evidence_receipt: result.evidence_receipt,\n    });"
);

s = s.replace(
  "summary:           result.summary || 'FAIL GOLD',\n      error:",
  "summary:           result.summary || 'FAIL GOLD',\n      evidence_receipt: result.evidence_receipt,\n      error:"
);

fs.writeFileSync(file, s, 'utf8');
console.log('PATCHED: backend receipt normalized in goRunner');
