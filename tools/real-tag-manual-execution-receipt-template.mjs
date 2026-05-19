#!/usr/bin/env node
/**
 * Real Tag Manual Execution Receipt Template — V102.0
 *
 * Template for the human to fill in after executing a real tag.
 * Does not import or validate a filled receipt. Does not execute anything.
 *
 * REGRA ABSOLUTA: tag_created=false by default. deploy_performed=false always.
 * stable_promoted=false always. release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v102.0';

export const RECEIPT_TEMPLATE_STATUSES = [
  'RECEIPT_TEMPLATE_BLOCKED_SEAL',
  'RECEIPT_TEMPLATE_READY',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    tag_created:                  false,
    git_push_performed:           false,
    actual_real_tag_created:      false,
    actual_git_push_performed:    false,
    deploy_performed:             false,
    stable_promoted:              false,
    release_performed:            false,
    real_execution_not_performed: true,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:  SCHEMA_VERSION,
    template_status: status,
    template_ready:  false,
    blocking_reason,
    ...extra,
    ..._locked(),
  };
}

export function buildRealTagManualExecutionReceiptTemplate(params = {}) {
  const {
    fixture_mode = false,
    seal_result,
    _mock_timestamp,
  } = params ?? {};

  const now         = _mock_timestamp ?? new Date().toISOString();
  const template_id = _sha256(`receipt-template:${SCHEMA_VERSION}:${now}`).slice(0, 24);

  if (fixture_mode) {
    return {
      schema_version:       SCHEMA_VERSION,
      template_id,
      template_status:      'RECEIPT_TEMPLATE_READY',
      template_ready:       true,
      blocking_reason:      null,
      command_seal_id:      'fixture-seal-001',
      final_runbook_id:     'fixture-runbook-001',
      target_tag:           'v1.0.0',
      git_head:             'abc1234def567890abc12345',
      evidence_receipt_id:  'receipt-fixture-001',
      rollback_anchor_id:   'anchor-fixture-001',
      template_fields: {
        human_receipt_id:    '<GENERATED_ON_SUBMIT>',
        schema_version:      SCHEMA_VERSION,
        target_tag:          'v1.0.0',
        git_head:            'abc1234def567890abc12345',
        evidence_receipt_id: 'receipt-fixture-001',
        rollback_anchor_id:  'anchor-fixture-001',
        command_seal_id:     'fixture-seal-001',
        executed_by:         '<YOUR_NAME>',
        executed_at:         '<ISO_TIMESTAMP>',
        local_tag_verified:  false,
        remote_tag_verified: false,
        local_tag_head:      null,
        remote_tag_head:     null,
        tag_created:         false,
        git_push_performed:  false,
        deploy_performed:    false,
        stable_promoted:     false,
        release_performed:   false,
        notes:               '<OPTIONAL_NOTES>',
      },
      created_at: now,
      ..._locked(),
    };
  }

  const eff_seal = seal_result !== undefined ? seal_result : null;

  if (!eff_seal || eff_seal.command_seal_valid !== true) {
    return _blocked('RECEIPT_TEMPLATE_BLOCKED_SEAL', 'command_seal_not_ready', {
      template_id, created_at: now,
    });
  }

  return {
    schema_version:       SCHEMA_VERSION,
    template_id,
    template_status:      'RECEIPT_TEMPLATE_READY',
    template_ready:       true,
    blocking_reason:      null,
    command_seal_id:      eff_seal.seal_id ?? null,
    final_runbook_id:     eff_seal.final_runbook_id ?? null,
    target_tag:           eff_seal.target_tag ?? null,
    git_head:             eff_seal.git_head ?? null,
    evidence_receipt_id:  eff_seal.evidence_receipt_id ?? null,
    rollback_anchor_id:   eff_seal.rollback_anchor_id ?? null,
    template_fields: {
      human_receipt_id:    '<GENERATED_ON_SUBMIT>',
      schema_version:      SCHEMA_VERSION,
      target_tag:          eff_seal.target_tag ?? null,
      git_head:            eff_seal.git_head ?? null,
      evidence_receipt_id: eff_seal.evidence_receipt_id ?? null,
      rollback_anchor_id:  eff_seal.rollback_anchor_id ?? null,
      command_seal_id:     eff_seal.seal_id ?? null,
      executed_by:         '<YOUR_NAME>',
      executed_at:         '<ISO_TIMESTAMP>',
      local_tag_verified:  false,
      remote_tag_verified: false,
      local_tag_head:      null,
      remote_tag_head:     null,
      tag_created:         false,
      git_push_performed:  false,
      deploy_performed:    false,
      stable_promoted:     false,
      release_performed:   false,
      notes:               '<OPTIONAL_NOTES>',
    },
    created_at: now,
    ..._locked(),
  };
}

export function validateRealTagManualExecutionReceiptTemplate(result) {
  const failures = [];
  if (!result) { failures.push('result_null'); return failures; }
  if (result.tag_created            === true) failures.push('tag_created must be false');
  if (result.actual_real_tag_created === true) failures.push('actual_real_tag_created must be false');
  if (result.deploy_performed       === true) failures.push('deploy_performed must be false');
  if (result.stable_promoted        === true) failures.push('stable_promoted must be false');
  if (result.release_performed      === true) failures.push('release_performed must be false');
  if (result.template_ready === true) {
    if (!result.template_fields)                               failures.push('template_fields required when ready');
    if (result.template_fields?.deploy_performed   === true)   failures.push('template_fields.deploy_performed must be false');
    if (result.template_fields?.stable_promoted    === true)   failures.push('template_fields.stable_promoted must be false');
    if (result.template_fields?.release_performed  === true)   failures.push('template_fields.release_performed must be false');
  }
  return failures;
}

export function renderRealTagManualExecutionReceiptTemplate(result) {
  if (!result) return 'real_tag_manual_execution_receipt_template: null';
  const lines = [
    `template_status          : ${result.template_status ?? 'UNKNOWN'}`,
    `template_id              : ${result.template_id ?? 'none'}`,
    `template_ready           : ${result.template_ready ?? false}`,
    `target_tag               : ${result.target_tag ?? 'none'}`,
    `git_head                 : ${result.git_head ?? 'none'}`,
    `command_seal_id          : ${result.command_seal_id ?? 'none'}`,
    `tag_created              : false`,
    `git_push_performed       : false`,
    `actual_real_tag_created  : false`,
    `deploy_performed         : false`,
    `stable_promoted          : false`,
    `release_performed        : false`,
    `blocking_reason          : ${result.blocking_reason ?? 'none'}`,
  ];
  if (result.template_ready && result.template_fields) {
    lines.push('');
    lines.push('── RECEIPT TEMPLATE FIELDS ────────────────────────────────────');
    const f = result.template_fields;
    lines.push(`  human_receipt_id    : ${f.human_receipt_id ?? 'none'}`);
    lines.push(`  schema_version      : ${f.schema_version ?? 'none'}`);
    lines.push(`  target_tag          : ${f.target_tag ?? 'none'}`);
    lines.push(`  git_head            : ${f.git_head ?? 'none'}`);
    lines.push(`  executed_by         : ${f.executed_by ?? 'none'}`);
    lines.push(`  executed_at         : ${f.executed_at ?? 'none'}`);
    lines.push(`  tag_created         : ${f.tag_created ?? false}`);
    lines.push(`  git_push_performed  : ${f.git_push_performed ?? false}`);
    lines.push(`  deploy_performed    : ${f.deploy_performed ?? false}  [LOCKED]`);
    lines.push(`  stable_promoted     : ${f.stable_promoted ?? false}  [LOCKED]`);
    lines.push(`  release_performed   : ${f.release_performed ?? false}  [LOCKED]`);
  }
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-tag-manual-execution-receipt-template.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = buildRealTagManualExecutionReceiptTemplate({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderRealTagManualExecutionReceiptTemplate(result));
  }

  process.exit(result.template_ready ? 0 : 1);
}
