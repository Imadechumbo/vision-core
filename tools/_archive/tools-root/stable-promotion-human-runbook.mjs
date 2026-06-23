#!/usr/bin/env node
/**
 * Stable Promotion Human Runbook — V121.1
 *
 * Generates a human-readable runbook for stable promotion.
 * Does NOT execute any real commands.
 *
 * REGRA ABSOLUTA: stable_promotion_allowed=false, stable_promoted=false,
 * git_push_performed=false, deploy_performed=false, release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v121.1';

export const RUNBOOK_STATUSES = [
  'RUNBOOK_BLOCKED_CLASSIFIER',
  'RUNBOOK_BLOCKED_NOT_READY',
  'RUNBOOK_READY',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    stable_promotion_allowed:      false,
    stable_promoted:               false,
    git_push_performed:            false,
    deploy_performed:              false,
    release_performed:             false,
    runbook_executes_nothing:      true,
    human_must_follow_manually:    true,
  };
}

function _blocked(status, reason, extra = {}) {
  return {
    schema_version:  SCHEMA_VERSION,
    runbook_status:  status,
    runbook_ready:   false,
    blocking_reason: reason,
    ..._locked(),
    ...extra,
  };
}

function _runbookId(classifier_id) {
  return _sha256([classifier_id || '', 'runbook-v121.1'].join('|'));
}

export function buildStablePromotionHumanRunbook(params) {
  const { stable_promotion_readiness_classifier } = params || {};

  if (!stable_promotion_readiness_classifier) {
    return _blocked('RUNBOOK_BLOCKED_CLASSIFIER', 'stable_promotion_readiness_classifier missing');
  }

  const cls = stable_promotion_readiness_classifier;

  if (cls.readiness_status === 'READINESS_BLOCKED_REPORT') {
    return _blocked('RUNBOOK_BLOCKED_CLASSIFIER', 'readiness classifier is blocked');
  }

  if (!cls.readiness_ready) {
    return _blocked('RUNBOOK_BLOCKED_NOT_READY', `classifier not fully ready: ${cls.readiness_status}`);
  }

  const runbook_id = _runbookId(cls.classifier_id);

  const pre_execution_checklist = [
    `[ ] Verify git status is clean (no uncommitted changes)`,
    `[ ] Verify you are NOT in CI/CD environment`,
    `[ ] Confirm target tag ${cls.target_tag} exists: git tag -l ${cls.target_tag}`,
    `[ ] Confirm current stable ref: git log origin/${cls.target_stable_ref} --oneline -3`,
    `[ ] Note current stable HEAD as rollback anchor`,
  ];

  const execution_steps = [
    `[ ] Run preflight: git fetch origin && git status`,
    `[ ] Force-move stable branch: git branch -f ${cls.target_stable_ref} ${cls.target_tag}`,
    `[ ] Push stable branch: git push origin ${cls.target_stable_ref}`,
    `[ ] Verify: git log origin/${cls.target_stable_ref} --oneline -3`,
    `[ ] Verify tag: git tag --points-at origin/${cls.target_stable_ref}`,
  ];

  const post_execution_checklist = [
    `[ ] Confirm stable branch points to ${cls.target_tag}`,
    `[ ] Record execution timestamp and operator identity`,
    `[ ] Import receipt manually if required`,
    `[ ] If anything unexpected: execute rollback plan immediately`,
  ];

  const warnings = [
    `NEVER run this runbook from CI/CD or automated scripts`,
    `NEVER skip the pre-execution checklist`,
    `NEVER proceed if worktree is dirty`,
    `stable_promotion_allowed remains false — this runbook does not grant automated permission`,
  ];

  return {
    schema_version:            SCHEMA_VERSION,
    runbook_id,
    runbook_status:            'RUNBOOK_READY',
    runbook_ready:             true,
    classifier_id:             cls.classifier_id,
    target_stable_ref:         cls.target_stable_ref,
    target_tag:                cls.target_tag,
    readiness_status:          cls.readiness_status,
    all_gates_passed:          cls.all_gates_passed,
    pre_execution_checklist,
    execution_steps,
    post_execution_checklist,
    warnings,
    ..._locked(),
  };
}

export function validateStablePromotionHumanRunbook(runbook) {
  if (!runbook || typeof runbook !== 'object') {
    return { valid: false, errors: ['runbook is null/undefined'] };
  }

  const errors = [];

  if (!RUNBOOK_STATUSES.includes(runbook.runbook_status)) {
    errors.push(`invalid runbook_status: ${runbook.runbook_status}`);
  }
  if (runbook.schema_version !== SCHEMA_VERSION) errors.push('invalid schema_version');
  if (runbook.stable_promotion_allowed !== false) errors.push('stable_promotion_allowed must be false');
  if (runbook.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (runbook.git_push_performed !== false) errors.push('git_push_performed must be false');
  if (runbook.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (runbook.release_performed !== false) errors.push('release_performed must be false');
  if (runbook.runbook_executes_nothing !== true) errors.push('runbook_executes_nothing must be true');
  if (runbook.human_must_follow_manually !== true) errors.push('human_must_follow_manually must be true');

  return { valid: errors.length === 0, errors };
}

export function renderStablePromotionHumanRunbook(runbook) {
  if (!runbook || !runbook.runbook_ready) {
    return `[HUMAN RUNBOOK BLOCKED] ${runbook?.runbook_status || 'unknown'}: ${runbook?.blocking_reason || 'unknown reason'}`;
  }

  return [
    `=== STABLE PROMOTION HUMAN RUNBOOK ===`,
    `Schema:            ${runbook.schema_version}`,
    `Runbook ID:        ${runbook.runbook_id}`,
    `Status:            ${runbook.runbook_status}`,
    `Target Ref:        ${runbook.target_stable_ref}`,
    `Target Tag:        ${runbook.target_tag}`,
    `Readiness:         ${runbook.readiness_status}`,
    `All Gates Passed:  ${runbook.all_gates_passed}`,
    ``,
    `--- PRE-EXECUTION CHECKLIST ---`,
    ...runbook.pre_execution_checklist,
    ``,
    `--- EXECUTION STEPS (HUMAN ONLY) ---`,
    ...runbook.execution_steps,
    ``,
    `--- POST-EXECUTION CHECKLIST ---`,
    ...runbook.post_execution_checklist,
    ``,
    `--- WARNINGS ---`,
    ...runbook.warnings.map(w => `  !! ${w}`),
    ``,
    `stable_promotion_allowed:   ${runbook.stable_promotion_allowed}`,
    `runbook_executes_nothing:   ${runbook.runbook_executes_nothing}`,
    `human_must_follow_manually: ${runbook.human_must_follow_manually}`,
  ].join('\n');
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('stable-promotion-human-runbook.mjs')) {
  const isJson = process.argv.includes('--json');

  const mockClassifier = {
    readiness_status:  'READINESS_READY_FOR_FUTURE_HUMAN_EXECUTION',
    readiness_ready:   true,
    classifier_id:     'mock-classifier-v1211',
    target_stable_ref: 'stable',
    target_tag:        'v121.1-mock',
    all_gates_passed:  true,
  };

  const runbook = buildStablePromotionHumanRunbook({ stable_promotion_readiness_classifier: mockClassifier });

  if (isJson) {
    console.log(JSON.stringify(runbook, null, 2));
  } else {
    console.log(renderStablePromotionHumanRunbook(runbook));
  }
}
