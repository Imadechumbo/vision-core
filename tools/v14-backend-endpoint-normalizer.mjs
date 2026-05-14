#!/usr/bin/env node
import fs from 'node:fs';

const file = 'backend/server.js';
if (!fs.existsSync(file)) {
  console.log('SKIP: backend server not found');
  process.exit(0);
}

let s = fs.readFileSync(file, 'utf8');
let changed = false;

function apply(pattern, replacement) {
  const before = s;
  s = s.replace(pattern, replacement);
  if (s !== before) changed = true;
}

apply(/pass_gold_ready:\s*true/g, 'pass_gold_ready: false');
apply(/status:\s*'GOLD',\s*pass_gold:\s*true,\s*promotion_allowed:\s*true,/g, "status: 'READY',\n  pass_gold: false,\n  promotion_allowed: false,\n  pass_gold_reason: 'evidence receipt required from Go Core',");
apply(/pass_gold:\s*true,\s*promotion_allowed:\s*true/g, "pass_gold: false, promotion_allowed: false, pass_gold_reason: 'evidence receipt required from Go Core'");

if (!s.includes('function normalizeEvidenceReceipt(')) {
  const anchor = 'function sendOk(res, payload = {}) {\n  return res.status(200).json({ ok: true, ...payload, time: now() });\n}\n';
  const helper = anchor + `\nfunction normalizeEvidenceReceipt(result) {\n  if (!result || typeof result !== 'object') return null;\n  return typeof result.evidence_receipt === 'string' && result.evidence_receipt.length >= 8\n    ? result.evidence_receipt\n    : null;\n}\n\nfunction passGoldCandidateFromResult(result) {\n  return Boolean(result && result.pass_gold === true && result.promotion_allowed === true && normalizeEvidenceReceipt(result));\n}\n`;
  if (s.includes(anchor)) {
    s = s.replace(anchor, helper);
    changed = true;
  }
}

if (!changed) {
  console.log('SKIP: backend endpoint contract already normalized');
  process.exit(0);
}

fs.writeFileSync(file, s, 'utf8');
console.log('PATCHED: backend endpoint contract normalized');
