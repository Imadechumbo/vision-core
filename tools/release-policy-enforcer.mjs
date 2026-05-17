#!/usr/bin/env node
/**
 * Release Policy Enforcer — V19.0
 *
 * Audits all pipeline stage results and confirms that core invariants
 * hold across the entire release pipeline output:
 *   - deploy_performed=false in every stage
 *   - tag_created=false in every stage
 *   - stable_promoted=false in every stage
 *   - No fake PASS GOLD patterns detected
 *   - No forbidden field values present
 *
 * Classification only — never executes, deploys, or promotes.
 *
 * REGRA ABSOLUTA:
 * - deploy_performed=false always.
 * - tag_created=false always.
 * - stable_promoted=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v19.0';

const POLICY_VIOLATION_CODES = [
  'DEPLOY_PERFORMED_TRUE',
  'TAG_CREATED_TRUE',
  'STABLE_PROMOTED_TRUE',
  'DEPLOY_ALLOWED_TRUE',
  'TAG_ALLOWED_WRONG_STATE',
  'STABLE_ALLOWED_WRONG_STATE',
  'FAKE_PASS_GOLD_DETECTED',
  'RELEASE_PERFORMED_TRUE',
];

const POLICY_STATUSES = [
  'POLICY_PASS',              // all invariants hold
  'POLICY_BLOCKED_VIOLATION', // one or more invariant violations found
  'POLICY_BLOCKED_NO_INPUT',  // no stage results provided
];

// Fields that must always be false
const INVARIANT_FALSE_FIELDS = [
  'deploy_performed',
  'tag_created',
  'stable_promoted',
  'release_performed',
];

// Fields forbidden from being true except in specific valid states
const CONDITIONAL_FALSE_FIELDS = {
  deploy_allowed: {
    violation_code: 'DEPLOY_ALLOWED_TRUE',
    allowed_values: [false, undefined, null],
  },
};

// Fake PASS GOLD patterns — string fragments that indicate a fake authority binding
const FAKE_PASS_GOLD_PATTERNS = [
  'fake_pass_gold',
  'fake-pass-gold',
  'mock_pass_gold',
  'test_pass_gold',
  'simulated_pass_gold',
  'ai_authority',
  'auto_authority',
  'openrouter_authority',
  'claude_authority',
];

// ═══════════════════════════════════════════════════════════════════
// CORE FUNCTION
// ═══════════════════════════════════════════════════════════════════

/**
 * @param {Object}   input
 * @param {Object[]} input.stageResults       - Array of stage result objects to audit
 * @param {string[]} input.stageNames         - Parallel array of stage names for labeling
 * @param {string}   input.gitHead
 * @param {string}   input.branch
 */
function enforcePolicy(input = {}) {
  const {
    stageResults = [],
    stageNames   = [],
    gitHead      = null,
    branch       = null,
  } = input;

  const enforcerId = _buildId(gitHead, branch);
  const enforcedAt = new Date().toISOString();

  if (!Array.isArray(stageResults) || stageResults.length === 0) {
    return _buildResult(enforcerId, 'POLICY_BLOCKED_NO_INPUT', [], 0, enforcedAt, gitHead, branch);
  }

  const violations = [];
  let   stagesChecked = 0;

  for (let i = 0; i < stageResults.length; i++) {
    const result    = stageResults[i];
    const stageName = stageNames[i] || `stage_${i}`;
    if (!result || typeof result !== 'object') continue;
    stagesChecked++;

    // ── Check invariant false fields ─────────────────────────────
    for (const field of INVARIANT_FALSE_FIELDS) {
      if (field in result && result[field] !== false) {
        violations.push({
          stage:          stageName,
          field,
          value:          result[field],
          violation_code: _fieldToCode(field),
          policy:         `${field} must always be false`,
        });
      }
    }

    // ── Check conditional false fields ──────────────────────────
    for (const [field, rule] of Object.entries(CONDITIONAL_FALSE_FIELDS)) {
      if (field in result && !rule.allowed_values.includes(result[field])) {
        violations.push({
          stage:          stageName,
          field,
          value:          result[field],
          violation_code: rule.violation_code,
          policy:         `${field} must be false`,
        });
      }
    }

    // ── Check for fake PASS GOLD patterns ────────────────────────
    const resultStr = JSON.stringify(result).toLowerCase();
    for (const pattern of FAKE_PASS_GOLD_PATTERNS) {
      if (resultStr.includes(pattern)) {
        violations.push({
          stage:          stageName,
          field:          'json_content',
          value:          pattern,
          violation_code: 'FAKE_PASS_GOLD_DETECTED',
          policy:         'No fake PASS GOLD authority references allowed',
        });
        break; // one violation per stage for fake PASS GOLD
      }
    }
  }

  const status = violations.length === 0 ? 'POLICY_PASS' : 'POLICY_BLOCKED_VIOLATION';
  return _buildResult(enforcerId, status, violations, stagesChecked, enforcedAt, gitHead, branch);
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function _fieldToCode(field) {
  const map = {
    deploy_performed:  'DEPLOY_PERFORMED_TRUE',
    tag_created:       'TAG_CREATED_TRUE',
    stable_promoted:   'STABLE_PROMOTED_TRUE',
    release_performed: 'RELEASE_PERFORMED_TRUE',
  };
  return map[field] || 'UNKNOWN_VIOLATION';
}

function _buildResult(enforcerId, status, violations, stagesChecked, enforcedAt, gitHead, branch) {
  return {
    schema_version:     SCHEMA_VERSION,
    enforcer_id:        enforcerId,
    policy_status:      status,
    policy_pass:        status === 'POLICY_PASS',
    violations_found:   violations.length,
    violations:         violations,
    stages_checked:     stagesChecked,
    enforced_at:        enforcedAt,
    git_head:           gitHead,
    branch:             branch,

    // Enforcer itself also upholds invariants
    deploy_performed:   false,
    deploy_allowed:     false,
    tag_created:        false,
    stable_promoted:    false,
    release_performed:  false,

    note: 'Policy enforcer — audit only, never executes in V19.0',
  };
}

function _buildId(gitHead, branch) {
  const nonce = Math.random().toString(36).slice(2, 10);
  const raw   = `${gitHead || 'unknown'}:${branch || 'unknown'}:${Date.now()}:${nonce}`;
  return `policy_${createHash('sha256').update(raw).digest('hex').slice(0, 12)}`;
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRYPOINT
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('release-policy-enforcer.mjs')) {
  _runCLI();
}

function _runCLI() {
  const args  = process.argv.slice(2);
  const flags = { json: false, gitHead: null, branch: null };
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--json':     flags.json    = true; break;
      case '--git-head': flags.gitHead = args[++i] || null; break;
      case '--branch':   flags.branch  = args[++i] || null; break;
      default: break;
    }
  }

  // CLI invocation with no stage results → POLICY_BLOCKED_NO_INPUT
  const result = enforcePolicy({ gitHead: flags.gitHead, branch: flags.branch });

  if (flags.json) process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  else {
    process.stdout.write(`policy_status: ${result.policy_status}\n`);
    process.stdout.write(`policy_pass: ${result.policy_pass}\n`);
    process.stdout.write(`violations_found: ${result.violations_found}\n`);
    process.stdout.write(`stages_checked: ${result.stages_checked}\n`);
  }
  process.exit(result.policy_pass ? 0 : 2);
}

export {
  enforcePolicy,
  POLICY_VIOLATION_CODES,
  POLICY_STATUSES,
  FAKE_PASS_GOLD_PATTERNS,
  SCHEMA_VERSION as POLICY_ENFORCER_SCHEMA_VERSION,
};
