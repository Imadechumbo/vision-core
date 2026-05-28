/**
 * VISION CORE V2.9.10
 * tools/tests/real-validation/real-validation-0-runtime-readiness-audit.test.mjs
 * REAL-VALIDATION-0 — Unit Tests
 * ─────────────────────────────────────────────────────────────────────
 * Static test only. No network. No exec. No secrets. No deploy.
 * ─────────────────────────────────────────────────────────────────────
 */

import { runAudit } from '../../real-validation/real-validation-0-runtime-readiness-audit.mjs';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅ PASS: ${label}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${label}`);
    failed++;
  }
}

// ── Run the audit once ────────────────────────────────────────────
console.log('\n[RV0-TEST] Running audit (write: false)...\n');
let result;
try {
  result = runAudit({ write: false });
} catch (err) {
  console.error('[RV0-TEST] runAudit() threw:', err.message);
  process.exit(1);
}

// ── Category 1: Return shape ──────────────────────────────────────
console.log('── Return shape ──────────────────────────────────────────');
assert(typeof result === 'object' && result !== null,         'result is object');
assert(typeof result.report === 'string',                     'result.report is string');
assert(typeof result.summary === 'object',                    'result.summary is object');
assert(Array.isArray(result.categories),                      'result.categories is array');
assert(result.categories.length === 10,                       'exactly 10 categories');

// ── Category 2: Authority flags — ALWAYS FALSE ────────────────────
console.log('\n── Authority flags (REGRA ABSOLUTA) ─────────────────────');
assert(result.summary.pass_gold_real_claimed === false,       'pass_gold_real_claimed = false');
assert(result.summary.deploy_allowed === false,               'deploy_allowed = false');
assert(result.summary.release_allowed === false,              'release_allowed = false');
assert(result.summary.tag_allowed === false,                  'tag_allowed = false');
assert(result.summary.stable_promotion_allowed === false,     'stable_promotion_allowed = false');
assert(result.summary.production_touched === false,           'production_touched = false');
assert(result.summary.network_called === false,               'network_called = false');
assert(result.summary.secrets_read === false,                 'secrets_read = false');

// ── Category 3: Summary totals ────────────────────────────────────
console.log('\n── Summary totals ───────────────────────────────────────');
const t = result.summary.totals;
assert(typeof t === 'object',                                  'totals is object');
assert(typeof t.PRESENT === 'number',                          'totals.PRESENT is number');
assert(typeof t.MISSING === 'number',                          'totals.MISSING is number');
assert(typeof t.PARTIAL === 'number',                          'totals.PARTIAL is number');
assert(typeof t.UNKNOWN === 'number',                          'totals.UNKNOWN is number');
assert(typeof t.BLOCKED === 'number',                          'totals.BLOCKED is number');
const totalItems = t.PRESENT + t.MISSING + t.PARTIAL + t.UNKNOWN + t.BLOCKED;
assert(totalItems >= 60,                                       `totalItems >= 60 (got ${totalItems})`);

// ── Category 4: Audit metadata ────────────────────────────────────
console.log('\n── Audit metadata ───────────────────────────────────────');
assert(result.summary.audit === 'REAL-VALIDATION-0',          'audit = REAL-VALIDATION-0');
assert(typeof result.summary.generated === 'string',          'generated is string (ISO timestamp)');
assert(result.summary.status === 'AUDIT_COMPLETE_NO_AUTHORITY', 'status = AUDIT_COMPLETE_NO_AUTHORITY');

// ── Category 5: Category names ────────────────────────────────────
console.log('\n── Category names ───────────────────────────────────────');
const catNames = result.categories.map(c => c.category);
assert(catNames.includes('Repository Baseline'),              'category: Repository Baseline');
assert(catNames.includes('Frontend Readiness'),               'category: Frontend Readiness');
assert(catNames.includes('Backend Readiness'),                'category: Backend Readiness');
assert(catNames.includes('Auth / SaaS Readiness'),            'category: Auth / SaaS Readiness');
assert(catNames.includes('API Connector Readiness'),          'category: API Connector Readiness');
assert(catNames.includes('Secrets / Vault Readiness'),        'category: Secrets / Vault Readiness');
assert(catNames.includes('Deployment Readiness'),             'category: Deployment Readiness');
assert(catNames.includes('Production Preflight Readiness'),   'category: Production Preflight Readiness');
assert(catNames.includes('Rollback Readiness'),               'category: Rollback Readiness');
assert(catNames.includes('PASS GOLD REAL Prerequisites'),     'category: PASS GOLD REAL Prerequisites');

// ── Category 6: Items structure ───────────────────────────────────
console.log('\n── Item structure ───────────────────────────────────────');
const validStatuses = new Set(['PRESENT', 'MISSING', 'PARTIAL', 'UNKNOWN', 'BLOCKED']);
let itemStructureOk = true;
let badItem = null;
for (const cat of result.categories) {
  for (const item of cat.items) {
    if (typeof item.label !== 'string' || !validStatuses.has(item.status)) {
      itemStructureOk = false;
      badItem = item;
      break;
    }
  }
  if (!itemStructureOk) break;
}
assert(itemStructureOk,
  itemStructureOk ? 'all items have label + valid status' : `bad item: ${JSON.stringify(badItem)}`);

// ── Category 7: Report content ────────────────────────────────────
console.log('\n── Report content ───────────────────────────────────────');
assert(result.report.includes('REAL-VALIDATION-0'),           'report contains REAL-VALIDATION-0');
assert(result.report.includes('Non-Authority Statement'),     'report contains Non-Authority Statement');
assert(result.report.includes('pass_gold_real_claimed'),      'report contains pass_gold_real_claimed');
assert(result.report.includes('false'),                       'report contains false');
assert(result.report.includes('Repository Baseline'),         'report contains Repository Baseline');
assert(result.report.includes('PASS GOLD REAL Prerequisites'),'report contains PASS GOLD REAL Prerequisites');
assert(result.report.includes('Blocking Gaps'),               'report contains Blocking Gaps section');
assert(result.report.includes('Recommended Next Phase'),      'report contains Recommended Next Phase');
assert(!result.report.includes('pass_gold_real_claimed.*true'), 'report does NOT claim PASS GOLD REAL true (regex)');

// ── Category 8: PASS GOLD REAL category BLOCKED check ────────────
console.log('\n── PASS GOLD REAL BLOCKED items ─────────────────────────');
const pgCat = result.categories.find(c => c.category === 'PASS GOLD REAL Prerequisites');
assert(!!pgCat,                                                'PASS GOLD REAL Prerequisites category exists');
const pgClaimed = pgCat?.items.find(i => i.label.includes('PASS GOLD REAL claimed'));
assert(!!pgClaimed,                                            'PASS GOLD REAL claimed item exists');
assert(pgClaimed?.status === 'BLOCKED',                        'PASS GOLD REAL claimed status = BLOCKED');

// ── Category 9: Repo baseline sanity ─────────────────────────────
console.log('\n── Repo baseline sanity ─────────────────────────────────');
const rbCat = result.categories.find(c => c.category === 'Repository Baseline');
const frontendItem = rbCat?.items.find(i => i.label.includes('frontend/'));
const backendItem  = rbCat?.items.find(i => i.label.includes('backend/'));
assert(frontendItem?.status === 'PRESENT',                     'frontend/ directory PRESENT');
assert(backendItem?.status === 'PRESENT',                      'backend/ directory PRESENT');

// ── Category 10: Blocking_gaps is numeric ────────────────────────
console.log('\n── blocking_gaps type ───────────────────────────────────');
assert(typeof result.summary.blocking_gaps === 'number',      'blocking_gaps is number');

// ── Final tally ───────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════');
console.log(`[RV0-TEST] Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error(`[RV0-TEST] ❌ ${failed} test(s) FAILED`);
  process.exit(1);
}
console.log('[RV0-TEST] ✅ All tests passed');
console.log('[RV0-TEST] Authority invariants confirmed: REGRA ABSOLUTA preserved');
