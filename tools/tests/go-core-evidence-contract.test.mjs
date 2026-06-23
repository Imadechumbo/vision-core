#!/usr/bin/env node
/**
 * Go Core Evidence Receipt Contract — Unit Tests V21.1
 */

import { spawnSync }   from 'child_process';
import { resolve }     from 'path';
import { createHash }  from 'crypto';
import {
  validateGoCorEvidenceReceipt,
  buildGoCorEvidenceReceipt,
  RECEIPT_STATUSES,
  REQUIRED_RECEIPT_FIELDS,
} from '../go-core-evidence-contract.mjs';

const CLI = resolve(process.cwd(), 'tools', 'go-core-evidence-contract.mjs');
let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}
function runCLI(args = []) {
  const r = spawnSync(process.execPath, ['--no-deprecation', CLI, ...args], { encoding: 'utf-8', timeout: 10000 });
  return { stdout: r.stdout || '', exitCode: r.status };
}

// Build a valid receipt for reuse
function makeValid(overrides = {}) {
  return buildGoCorEvidenceReceipt({
    receipt_id:  'rcpt_test_001',
    mission_id:  'msn_test_001',
    source:      'go-core',
    git_head:    'abc1234',
    created_at:  '2026-05-17T00:00:00.000Z',
    ...overrides,
  });
}

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(RECEIPT_STATUSES),                           '[A-01] RECEIPT_STATUSES is array');
assert(RECEIPT_STATUSES.length === 5,                             '[A-02] 5 statuses');
assert(RECEIPT_STATUSES.includes('RECEIPT_VALID'),                '[A-03] RECEIPT_VALID present');
assert(RECEIPT_STATUSES.includes('RECEIPT_BLOCKED_MISSING'),      '[A-04] BLOCKED_MISSING present');
assert(RECEIPT_STATUSES.includes('RECEIPT_BLOCKED_SCHEMA'),       '[A-05] BLOCKED_SCHEMA present');
assert(RECEIPT_STATUSES.includes('RECEIPT_BLOCKED_SOURCE'),       '[A-06] BLOCKED_SOURCE present');
assert(RECEIPT_STATUSES.includes('RECEIPT_BLOCKED_HASH'),         '[A-07] BLOCKED_HASH present');
assert(Array.isArray(REQUIRED_RECEIPT_FIELDS),                    '[A-08] REQUIRED_RECEIPT_FIELDS is array');
assert(REQUIRED_RECEIPT_FIELDS.includes('receipt_id'),            '[A-09] receipt_id required');
assert(REQUIRED_RECEIPT_FIELDS.includes('mission_id'),            '[A-10] mission_id required');
assert(REQUIRED_RECEIPT_FIELDS.includes('source'),                '[A-11] source required');
assert(REQUIRED_RECEIPT_FIELDS.includes('schema_version'),        '[A-12] schema_version required');

// ─── Suite B: Invariants ──────────────────────────────────────────
console.log('\n[Suite B] Invariants');
const missingR  = validateGoCorEvidenceReceipt(null);
const validReceipt = makeValid();
const validR    = validateGoCorEvidenceReceipt(validReceipt);
assert(missingR.deploy_allowed    === false, '[B-01] deploy=false (missing)');
assert(missingR.promotion_allowed === false, '[B-02] promotion=false (missing)');
assert(missingR.stable_allowed    === false, '[B-03] stable=false (missing)');
assert(validR.deploy_allowed      === false, '[B-04] deploy=false (valid)');
assert(validR.promotion_allowed   === false, '[B-05] promotion=false (valid)');
assert(validR.stable_allowed      === false, '[B-06] stable=false (valid)');

// ─── Suite C: Receipt absent → BLOCKED_MISSING ───────────────────
console.log('\n[Suite C] Receipt absent');
const nullR = validateGoCorEvidenceReceipt(null);
assert(nullR.receipt_status === 'RECEIPT_BLOCKED_MISSING', '[C-01] null → BLOCKED_MISSING');
assert(nullR.receipt_valid  === false,                     '[C-02] valid=false');

const undefinedR = validateGoCorEvidenceReceipt(undefined);
assert(undefinedR.receipt_status === 'RECEIPT_BLOCKED_MISSING', '[C-03] undefined → BLOCKED_MISSING');

const strR = validateGoCorEvidenceReceipt('not-an-object');
assert(strR.receipt_status === 'RECEIPT_BLOCKED_MISSING', '[C-04] string → BLOCKED_MISSING');

// ─── Suite D: Schema invalid → BLOCKED_SCHEMA ────────────────────
console.log('\n[Suite D] Schema invalid');
const noMissionR = validateGoCorEvidenceReceipt({ receipt_id: 'r1', source: 'go-core' });
assert(noMissionR.receipt_status === 'RECEIPT_BLOCKED_SCHEMA', '[D-01] missing fields → BLOCKED_SCHEMA');
assert(noMissionR.receipt_valid  === false,                    '[D-02] valid=false');
assert(Array.isArray(noMissionR.missing_fields),               '[D-03] missing_fields is array');
assert(noMissionR.missing_fields.length > 0,                   '[D-04] missing_fields non-empty');

// ─── Suite E: Wrong source → BLOCKED_SOURCE ──────────────────────
console.log('\n[Suite E] Wrong source');
const backendReceipt = makeValid({ source: 'backend' });
// re-hash with wrong source
backendReceipt.hash = createHash('sha256').update(JSON.stringify({ ...backendReceipt, hash: null })).digest('hex');
const backendR = validateGoCorEvidenceReceipt(backendReceipt);
assert(backendR.receipt_status === 'RECEIPT_BLOCKED_SOURCE', '[E-01] source=backend → BLOCKED_SOURCE');
assert(backendR.receipt_valid  === false,                    '[E-02] valid=false');

const apiReceipt = makeValid({ source: 'api' });
apiReceipt.hash = createHash('sha256').update(JSON.stringify({ ...apiReceipt, hash: null })).digest('hex');
const apiR = validateGoCorEvidenceReceipt(apiReceipt);
assert(apiR.receipt_status === 'RECEIPT_BLOCKED_SOURCE', '[E-03] source=api → BLOCKED_SOURCE');

// ─── Suite F: Hash absent/mismatch → BLOCKED_HASH ────────────────
console.log('\n[Suite F] Hash problems');
const noHashReceipt = { ...makeValid(), hash: null };
const noHashR = validateGoCorEvidenceReceipt(noHashReceipt);
assert(noHashR.receipt_status === 'RECEIPT_BLOCKED_HASH', '[F-01] null hash → BLOCKED_HASH');
assert(noHashR.receipt_valid  === false,                  '[F-02] valid=false');

const badHashReceipt = { ...makeValid(), hash: 'deadbeef' };
const badHashR = validateGoCorEvidenceReceipt(badHashReceipt);
assert(badHashR.receipt_status === 'RECEIPT_BLOCKED_HASH', '[F-03] wrong hash → BLOCKED_HASH');

// ─── Suite G: Full valid → RECEIPT_VALID ─────────────────────────
console.log('\n[Suite G] Valid receipt');
assert(validR.receipt_status         === 'RECEIPT_VALID',    '[G-01] status=RECEIPT_VALID');
assert(validR.receipt_valid          === true,               '[G-02] valid=true');
assert(validR.receipt_id             === 'rcpt_test_001',    '[G-03] receipt_id echoed');
assert(validR.mission_id             === 'msn_test_001',     '[G-04] mission_id echoed');
assert(validR.source                 === 'go-core',          '[G-05] source=go-core');
assert(validR.hash_verified          === true,               '[G-06] hash_verified=true');
assert(validR.deploy_allowed         === false,              '[G-07] VALID deploy=false');
assert(validR.promotion_allowed      === false,              '[G-08] VALID promotion=false');

// ─── Suite H: buildGoCorEvidenceReceipt helper ───────────────────
console.log('\n[Suite H] Builder');
const built = buildGoCorEvidenceReceipt({ mission_id: 'msn_build_001', receipt_id: 'rcpt_build_001' });
assert(built.source       === 'go-core', '[H-01] default source=go-core');
assert(built.hash         !== null,      '[H-02] hash computed');
assert(typeof built.hash  === 'string',  '[H-03] hash is string');
const builtValidation = validateGoCorEvidenceReceipt(built);
assert(builtValidation.receipt_valid === true, '[H-04] built receipt passes validation');

// ─── Suite I: CLI ─────────────────────────────────────────────────
console.log('\n[Suite I] CLI');
const cliDefault = runCLI([]);
assert(cliDefault.exitCode === 1,                    '[I-01] CLI exit 1 (no receipt)');
assert(cliDefault.stdout.includes('BLOCKED'),        '[I-02] stdout contains BLOCKED');

const cliJson = runCLI(['--json']);
assert(cliJson.exitCode === 1,                       '[I-03] JSON exit 1');
let parsed;
try { parsed = JSON.parse(cliJson.stdout); } catch { parsed = null; }
assert(parsed !== null,                              '[I-04] JSON parseable');
assert(parsed && parsed.deploy_allowed    === false, '[I-05] deploy=false');
assert(parsed && parsed.promotion_allowed === false, '[I-06] promotion=false');

// ─── Suite J: Schema version ──────────────────────────────────────
console.log('\n[Suite J] Schema');
assert(missingR.schema_version === 'v21.1', '[J-01] schema=v21.1 (blocked)');
assert(validR.schema_version   === 'v21.1', '[J-02] schema=v21.1 (valid)');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\ngo-core-evidence-contract: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
