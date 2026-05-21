#!/usr/bin/env node
/**
 * Tests — Human Approval Expiration Gate V156.1
 */

import { createHash } from 'crypto';
import {
  buildHumanApprovalExpirationGate,
  validateHumanApprovalExpirationGate,
  renderHumanApprovalExpirationGate,
  APPROVAL_GATE_STATUSES,
} from '../human-approval-expiration-gate.mjs';

let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) {
    console.log(`  PASS: ${label}`);
    passed++;
  } else {
    console.error(`  FAIL: ${label}`);
    failed++;
  }
}

function sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

const VALID_BASE = {
  gate_id:               'g1',
  approval_ledger_id:    'l1',
  approval_ledger_status:'APPROVAL_LEDGER_READY',
  approval_granted_at:   '2026-05-21T10:00:00.000Z',
  checked_at:            '2026-05-21T10:30:00.000Z',
};

console.log('\n=== human-approval-expiration-gate tests ===\n');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildHumanApprovalExpirationGate({});
  assert('no gate_id → BLOCKED_INPUT', r.approval_gate_status === 'APPROVAL_GATE_BLOCKED_INPUT');
  assert('approval_active=false', r.approval_active === false);
  assert('human_approval_required=true', r.human_approval_required === true);
  assert('execution_performed=false', r.execution_performed === false);
  assert('stable_promoted=false', r.stable_promoted === false);
  assert('deploy_performed=false', r.deploy_performed === false);
  assert('release_performed=false', r.release_performed === false);
}
{
  const r = buildHumanApprovalExpirationGate({ gate_id: 'g1' });
  assert('gate_id but no ledger_id → BLOCKED_INPUT', r.approval_gate_status === 'APPROVAL_GATE_BLOCKED_INPUT');
}
{
  const r = buildHumanApprovalExpirationGate(null);
  assert('null → BLOCKED_INPUT', r.approval_gate_status === 'APPROVAL_GATE_BLOCKED_INPUT');
}

// --- revoked ---
console.log('--- revoked ---');
{
  const r = buildHumanApprovalExpirationGate({ ...VALID_BASE, approval_revoked: true });
  assert('approval_revoked=true → REVOKED', r.approval_gate_status === 'APPROVAL_GATE_REVOKED');
  assert('approval_active=false when revoked', r.approval_active === false);
}
{
  const r = buildHumanApprovalExpirationGate({ ...VALID_BASE, approval_ledger_status: 'APPROVAL_LEDGER_EMPTY' });
  assert('ledger_status=EMPTY → REVOKED', r.approval_gate_status === 'APPROVAL_GATE_REVOKED');
}

// --- expired ---
console.log('--- expired ---');
{
  const r = buildHumanApprovalExpirationGate({
    gate_id:            'g2',
    approval_ledger_id: 'l2',
    approval_ledger_status: 'APPROVAL_LEDGER_READY',
    approval_granted_at: '2026-05-21T08:00:00.000Z',
    checked_at:          '2026-05-21T10:00:01.000Z', // > 2 hours later
    expiry_ms:           7_200_000, // 2h
  });
  assert('past expiry → EXPIRED', r.approval_gate_status === 'APPROVAL_GATE_EXPIRED');
  assert('approval_active=false when expired', r.approval_active === false);
  assert('expiry_ms propagated', r.expiry_ms === 7_200_000);
}
{
  const r = buildHumanApprovalExpirationGate({
    ...VALID_BASE,
    approval_granted_at: '2026-05-21T10:00:00.000Z',
    checked_at:          '2026-05-21T10:30:00.000Z',
    expiry_ms:           3_600_000, // 1h window, 30min elapsed → not expired
  });
  assert('within expiry window → not EXPIRED', r.approval_gate_status !== 'APPROVAL_GATE_EXPIRED');
}

// --- token mismatch ---
console.log('--- token mismatch ---');
{
  const bound = sha256('correct-token');
  const r = buildHumanApprovalExpirationGate({
    ...VALID_BASE,
    supplied_token:   'wrong-token',
    bound_token_hash: bound,
  });
  assert('wrong token → TOKEN_MISMATCH', r.approval_gate_status === 'APPROVAL_GATE_TOKEN_MISMATCH');
  assert('approval_active=false on mismatch', r.approval_active === false);
  assert('supplied_token_hash stored', r.supplied_token_hash === sha256('wrong-token'));
  assert('raw token not stored', !JSON.stringify(r).includes('wrong-token'));
}

// --- active ---
console.log('--- active ---');
{
  const r = buildHumanApprovalExpirationGate({ ...VALID_BASE });
  assert('valid params → APPROVAL_GATE_ACTIVE', r.approval_gate_status === 'APPROVAL_GATE_ACTIVE');
  assert('approval_active=true', r.approval_active === true);
  assert('schema_version=v156.1', r.schema_version === 'v156.1');
  assert('gate_id propagated', r.gate_id === 'g1');
  assert('approval_ledger_id propagated', r.approval_ledger_id === 'l1');
  assert('gate_id_hash sha256', /^[a-f0-9]{64}$/.test(r.gate_id_hash));
  assert('human_approval_required=true', r.human_approval_required === true);
  assert('execution_performed=false', r.execution_performed === false);
}
{
  const bound = sha256('my-token');
  const r = buildHumanApprovalExpirationGate({
    ...VALID_BASE,
    supplied_token:   'my-token',
    bound_token_hash: bound,
  });
  assert('correct token → ACTIVE', r.approval_gate_status === 'APPROVAL_GATE_ACTIVE');
  assert('supplied_token_hash stored on ACTIVE', r.supplied_token_hash === sha256('my-token'));
  assert('raw token not stored on ACTIVE', !JSON.stringify(r).includes('my-token'));
}
{
  const r = buildHumanApprovalExpirationGate({
    gate_id:            'g3',
    approval_ledger_id: 'l3',
    approval_ledger_status: 'APPROVAL_LEDGER_READY',
  });
  assert('no granted_at → ACTIVE (no expiry check)', r.approval_gate_status === 'APPROVAL_GATE_ACTIVE');
}
{
  const r = buildHumanApprovalExpirationGate({
    ...VALID_BASE,
    bound_token_hash: sha256('some-token'),
    // no supplied_token → skip token check
  });
  assert('bound_token but no supplied_token → ACTIVE (skip check)', r.approval_gate_status === 'APPROVAL_GATE_ACTIVE');
}

// --- default expiry ---
{
  const r = buildHumanApprovalExpirationGate({ ...VALID_BASE });
  assert('default expiry_ms=3600000', r.expiry_ms === 3600000);
}

// --- checked_at default ---
{
  const r = buildHumanApprovalExpirationGate({
    gate_id:            'gx',
    approval_ledger_id: 'lx',
  });
  assert('no checked_at → auto ISO', typeof r.checked_at === 'string' && r.checked_at.length > 0);
}

// --- REGRA ABSOLUTA ---
console.log('--- REGRA ABSOLUTA ---');
{
  const cases = [
    buildHumanApprovalExpirationGate({}),
    buildHumanApprovalExpirationGate({ ...VALID_BASE }),
    buildHumanApprovalExpirationGate({ ...VALID_BASE, approval_revoked: true }),
    buildHumanApprovalExpirationGate({
      gate_id: 'g4', approval_ledger_id: 'l4',
      approval_granted_at: '2026-05-20T00:00:00.000Z',
      checked_at: '2026-05-21T23:00:00.000Z',
    }),
  ];
  for (const r of cases) {
    assert(`human_approval_required=true [${r.approval_gate_status}]`, r.human_approval_required === true);
    assert(`execution_performed=false [${r.approval_gate_status}]`, r.execution_performed === false);
    assert(`stable_promoted=false [${r.approval_gate_status}]`, r.stable_promoted === false);
    assert(`deploy_performed=false [${r.approval_gate_status}]`, r.deploy_performed === false);
    assert(`release_performed=false [${r.approval_gate_status}]`, r.release_performed === false);
  }
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildHumanApprovalExpirationGate({ ...VALID_BASE });
  const v = validateHumanApprovalExpirationGate(r);
  assert('validate ACTIVE → valid=true', v.valid === true);
  assert('no errors', v.errors.length === 0);
}
{
  const r = buildHumanApprovalExpirationGate({});
  const v = validateHumanApprovalExpirationGate(r);
  assert('validate blocked → valid=true', v.valid === true);
}
{
  assert('validate null → invalid', validateHumanApprovalExpirationGate(null).valid === false);
}
{
  const r = buildHumanApprovalExpirationGate({ ...VALID_BASE });
  assert('human_approval_required tampered → invalid', validateHumanApprovalExpirationGate({ ...r, human_approval_required: false }).valid === false);
}
{
  const r = buildHumanApprovalExpirationGate({ ...VALID_BASE });
  assert('execution_performed tampered → invalid', validateHumanApprovalExpirationGate({ ...r, execution_performed: true }).valid === false);
}
{
  const r = buildHumanApprovalExpirationGate({ ...VALID_BASE });
  assert('ACTIVE with approval_active=false → invalid', validateHumanApprovalExpirationGate({ ...r, approval_active: false }).valid === false);
}
{
  const r = buildHumanApprovalExpirationGate({ ...VALID_BASE, approval_revoked: true });
  assert('REVOKED with approval_active=true → invalid', validateHumanApprovalExpirationGate({ ...r, approval_active: true }).valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildHumanApprovalExpirationGate({ ...VALID_BASE });
  const s = renderHumanApprovalExpirationGate(r);
  assert('render string', typeof s === 'string');
  assert('render shows ACTIVE', s.includes('APPROVAL_GATE_ACTIVE'));
  assert('render shows REGRA', s.includes('human_approval_required=true'));
  assert('render shows gate_id', s.includes('g1'));
}
{
  const r = buildHumanApprovalExpirationGate({});
  const s = renderHumanApprovalExpirationGate(r);
  assert('blocked render shows blocked_reason', s.includes('Blocked reason') || s.includes('blocked_reason'));
}
{
  assert('render null graceful', typeof renderHumanApprovalExpirationGate(null) === 'string');
}

// --- exports ---
console.log('--- exports ---');
{
  assert('APPROVAL_GATE_STATUSES is array', Array.isArray(APPROVAL_GATE_STATUSES));
  assert('statuses length=5', APPROVAL_GATE_STATUSES.length === 5);
  for (const s of [
    'APPROVAL_GATE_BLOCKED_INPUT', 'APPROVAL_GATE_EXPIRED',
    'APPROVAL_GATE_REVOKED', 'APPROVAL_GATE_TOKEN_MISMATCH', 'APPROVAL_GATE_ACTIVE',
  ]) {
    assert(`status present: ${s}`, APPROVAL_GATE_STATUSES.includes(s));
  }
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
