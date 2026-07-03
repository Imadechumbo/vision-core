#!/usr/bin/env node
/**
 * Gate Kit — shared scaffolding unit tests
 */

import { sha256, makeLockedFlags, HashChainLedger, runGateCli } from '../_shared/gate-kit.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

// ─── sha256 ─────────────────────────────────────────────────────
console.log('\n[Suite A] sha256');
assert(sha256('abc').length === 64,                      '[A-01] 64 hex chars');
assert(sha256('abc') === sha256('abc'),                   '[A-02] deterministic');
assert(sha256('abc') !== sha256('abd'),                    '[A-03] different input → different hash');
assert(/^[0-9a-f]{64}$/.test(sha256(123)),                  '[A-04] non-string input coerced');

// ─── makeLockedFlags ────────────────────────────────────────────
console.log('\n[Suite B] makeLockedFlags');
const locked = makeLockedFlags(['deploy_allowed', 'tag_allowed', 'release_performed']);
assert(locked.deploy_allowed === false,                    '[B-01] deploy_allowed=false');
assert(locked.tag_allowed === false,                        '[B-02] tag_allowed=false');
assert(locked.release_performed === false,                  '[B-03] release_performed=false');
assert(Object.keys(locked).length === 3,                     '[B-04] exactly the requested fields');
assert(Object.keys(makeLockedFlags([])).length === 0,         '[B-05] empty fields → empty object');

// ─── HashChainLedger ────────────────────────────────────────────
console.log('\n[Suite C] HashChainLedger — basic append/verify');
const l1 = new HashChainLedger();
assert(l1.size === 0,                                        '[C-01] starts empty');
assert(l1.lastHash() === HashChainLedger.GENESIS_HASH,        '[C-02] genesis hash before any entry');

const e1 = l1.append({ event_type: 'A', seq: 0 });
assert(typeof e1.chain_hash === 'string' && e1.chain_hash.length === 64, '[C-03] chain_hash present, 64 chars');
assert(e1.prev_hash === HashChainLedger.GENESIS_HASH,          '[C-04] first entry prev_hash = genesis');
assert(l1.size === 1,                                          '[C-05] size=1 after append');

const e2 = l1.append({ event_type: 'B', seq: 1 });
assert(e2.prev_hash === e1.chain_hash,                          '[C-06] second entry chains to first');
assert(l1.size === 2,                                            '[C-07] size=2');

const v1 = l1.verify();
assert(v1.valid === true,                                        '[C-08] verify valid=true');
assert(v1.entries === 2,                                          '[C-09] verify entries=2');
assert(v1.tampered_at_index === null,                              '[C-10] no tamper detected');

console.log('\n[Suite D] HashChainLedger — tamper detection');
// read() returns a shallow array copy (matches every original module's `[..._ledger]`
// pattern) — entry objects are shared references, so mutating a field through the
// returned array reaches the real stored entry, which verify() must then catch.
const entries = l1.read();
entries[0].event_type = 'TAMPERED';
const v2 = l1.verify();
assert(v2.valid === false,                                         '[D-01] tampering caught');
assert(v2.tampered_at_index === 0,                                 '[D-02] tampered_at_index points at the mutated entry');

console.log('\n[Suite E] HashChainLedger — read() returns a copy, reset()');
const l2 = new HashChainLedger();
l2.append({ x: 1 });
const copy = l2.read();
copy.push({ fake: true });
assert(l2.size === 1,                                              '[E-01] read() copy mutation does not affect ledger');
l2.reset();
assert(l2.size === 0,                                              '[E-02] reset() clears entries');
assert(l2.lastHash() === HashChainLedger.GENESIS_HASH,              '[E-03] lastHash back to genesis after reset');

console.log('\n[Suite F] HashChainLedger — empty ledger verify');
const l3 = new HashChainLedger();
const v3 = l3.verify();
assert(v3.valid === true,                                            '[F-01] empty ledger is valid');
assert(v3.entries === 0,                                             '[F-02] empty ledger entries=0');

const total = passed + failed;
console.log(`\ngate-kit: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
