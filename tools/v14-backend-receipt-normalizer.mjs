#!/usr/bin/env node
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const file = 'backend/src/runtime/goRunner.js';
if (!fs.existsSync(file)) {
  console.log('SKIP: goRunner not found');
  process.exit(0);
}

let s = fs.readFileSync(file, 'utf8');
const alreadyComplete = s.includes('function makeBackendReceipt(') &&
  s.includes('evidence_receipt: receipt') &&
  s.includes('evidence_source:') &&
  s.includes('evidence_receipt:  result.evidence_receipt') &&
  s.includes('evidence_receipt: result.evidence_receipt');

let changed = false;
if (!alreadyComplete) {
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
    "  const promoted = parsed.pass_gold === true && parsed.promotion_allowed === true ? 'promotion-allowed' : 'promotion-blocked';",
    "  const size = String((stdout || '').length + (stderr || '').length);",
    "  return ['evr', mission, snap, status, promoted, size, Date.now()].map(function (x) {",
    "    return String(x).replace(/[^a-zA-Z0-9._-]+/g, '-');",
    "  }).join('_');",
    '}',
    ''
  ].join('\n');

  if (!s.includes('function makeBackendReceipt(')) {
    s = s.replace(anchor, helper + anchor);
    changed = true;
  }

  if (!s.includes('const receipt = parsed.evidence_receipt || makeBackendReceipt(parsed, stdout, stderr, bin);')) {
    s = s.replace(
      'function normalizeGoResult(parsed, stdout, stderr, bin) {\n  return {',
      'function normalizeGoResult(parsed, stdout, stderr, bin) {\n  const receipt = parsed.evidence_receipt || makeBackendReceipt(parsed, stdout, stderr, bin);\n  return {'
    );
    changed = true;
  }

  if (!s.includes('evidence_source:')) {
    s = s.replace(
      "summary:           parsed.summary || '',\n    go_binary:",
      "summary:           parsed.summary || '',\n    evidence_receipt: receipt,\n    evidence_source: 'go_core_runtime_result',\n    go_binary:"
    );
    changed = true;
  }

  const before = s;
  s = s.replace(/promotion_allowed:\s*Boolean\(parsed\.promotion_allowed\),/g, "promotion_allowed: Boolean(parsed.pass_gold && parsed.promotion_allowed),");
  s = s.replace("promotion_allowed: result.promotion_allowed,\n    });", "promotion_allowed: result.promotion_allowed,\n      evidence_receipt:  result.evidence_receipt,\n    });");
  s = s.replace("promotion_allowed: result.promotion_allowed,\n      rollback_ready:", "promotion_allowed: result.promotion_allowed,\n      evidence_receipt:  result.evidence_receipt,\n      rollback_ready:");
  s = s.replace("promotion_allowed: false,\n      failed_gates:", "promotion_allowed: false,\n      evidence_receipt:  result.evidence_receipt,\n      failed_gates:");
  s = s.replace("summary:           result.summary,\n    });", "summary:           result.summary,\n      evidence_receipt: result.evidence_receipt,\n    });");
  s = s.replace("summary:           result.summary || 'FAIL GOLD',\n      error:", "summary:           result.summary || 'FAIL GOLD',\n      evidence_receipt: result.evidence_receipt,\n      error:");
  s = s.replace("status:      result.status,\n      duration_ms:", "status:      result.status,\n      evidence_receipt: result.evidence_receipt,\n      duration_ms:");
  if (s !== before) changed = true;

  if (changed) {
    fs.writeFileSync(file, s, 'utf8');
    console.log('PATCHED: backend receipt normalized in goRunner');
  }
} else {
  console.log('SKIP: backend receipt already normalized');
}

const endpointNormalizer = 'tools/v14-backend-endpoint-normalizer.mjs';
if (fs.existsSync(endpointNormalizer)) {
  const run = spawnSync(process.execPath, [endpointNormalizer], { encoding: 'utf8', shell: false });
  const output = `${run.stdout || ''}${run.stderr || ''}`.trim();
  if (output) {
    for (const line of output.split(/\r?\n/).filter(Boolean).slice(0, 8)) {
      console.log('V14.1_ENDPOINT_NORMALIZER: ' + line);
    }
  }
  if (run.status !== 0) console.log('V14.1_ENDPOINT_NORMALIZER: BLOCKED');
}
