#!/usr/bin/env node
import fs from 'node:fs';

const file = 'tools/pi-harness.mjs';
if (!fs.existsSync(file)) {
  console.log('SKIP: pi-harness not found');
  process.exit(0);
}

let s = fs.readFileSync(file, 'utf8');
let changed = false;

const helper = `
function strictPassGoldCandidate(s) {
  return Boolean(
    s &&
    s.backendAlive === true &&
    s.backendStub === false &&
    s.backendHasMissionId === true &&
    s.backendHasEvidenceReceipt === true &&
    s.evidenceReceiptInSchema === true &&
    s.evidenceReceiptInNormalizer === true &&
    s.goCoreCompiled === true &&
    s.guardOk === true &&
    s.legacyCleanConfirmed === true &&
    s.v14CleanOwnership === true &&
    s.githubConfirmed === true
  );
}

function strictPromotionAllowed(s) {
  return Boolean(strictPassGoldCandidate(s) && s.deployAllowed === false);
}

function strictPassGoldReason(s) {
  const missing = [];
  if (!s.backendAlive) missing.push('backend_alive');
  if (s.backendStub) missing.push('backend_not_stub');
  if (!s.backendHasMissionId) missing.push('mission_id');
  if (!s.backendHasEvidenceReceipt) missing.push('evidence_receipt');
  if (!s.evidenceReceiptInSchema) missing.push('evidence_schema');
  if (!s.evidenceReceiptInNormalizer) missing.push('evidence_normalizer');
  if (!s.goCoreCompiled) missing.push('go_core_compiled');
  if (!s.guardOk) missing.push('front_guard');
  if (!s.legacyCleanConfirmed) missing.push('legacy_clean');
  if (!s.v14CleanOwnership) missing.push('v14_clean_ownership');
  if (!s.githubConfirmed) missing.push('github_confirmed');
  return missing.length ? missing.join(',') : 'strict_pass_gold_ready';
}
`;

if (!s.includes('function strictPassGoldCandidate(s)')) {
  const anchor = 'function classify(ind) {';
  if (!s.includes(anchor)) {
    console.error('BLOCKED: classify anchor not found');
    process.exit(1);
  }
  s = s.replace(anchor, helper + '\n' + anchor);
  changed = true;
}

const before = s;
// Replace mutable gate assignments outside freshState object. These regexes target statement assignments only.
s = s.replace(/s\.passGoldCandidate\s*=\s*[^;\n]+;/g, 's.passGoldCandidate = strictPassGoldCandidate(s);');
s = s.replace(/s\.promotionAllowed\s*=\s*[^;\n]+;/g, 's.promotionAllowed = strictPromotionAllowed(s);');
if (s !== before) changed = true;

if (!s.includes('STRICT_PASS_GOLD_REASON')) {
  const evidenceAnchor = "addEvidence(`PASS_GOLD_CANDIDATE:${s.passGoldCandidate} | EVIDENCE_IN_BACKEND:${s.backendHasEvidenceReceipt}`);";
  const evidenceReplacement = "addEvidence(`PASS_GOLD_CANDIDATE:${s.passGoldCandidate} | EVIDENCE_IN_BACKEND:${s.backendHasEvidenceReceipt}`);\n  addEvidence(`STRICT_PASS_GOLD_REASON:${strictPassGoldReason(s)}`);";
  if (s.includes(evidenceAnchor)) {
    s = s.replace(evidenceAnchor, evidenceReplacement);
    changed = true;
  }
}

if (!changed) {
  console.log('SKIP: strict pass gold gate already enforced');
  process.exit(0);
}

fs.writeFileSync(file, s, 'utf8');
console.log('PATCHED: strict pass gold gate enforced in pi-harness');
