#!/usr/bin/env node
/**
 * One Real Tag Local Manual Command Export — V106.1
 *
 * Exports copy/paste-safe local manual commands for one real git tag operation.
 * Includes preflight, execution, post-verification and rollback.
 * Does NOT execute anything.
 *
 * REGRA ABSOLUTA: tag_created=false, git_push_performed=false always.
 * deploy_performed=false, stable_promoted=false, release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v106.1';

export const COMMAND_EXPORT_STATUSES = [
  'COMMAND_EXPORT_BLOCKED_PACKET',
  'COMMAND_EXPORT_BLOCKED_HASH',
  'COMMAND_EXPORT_READY_FOR_HUMAN_COPY_PASTE',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    tag_created:          false,
    git_push_performed:   false,
    deploy_performed:     false,
    stable_promoted:      false,
    release_performed:    false,
  };
}

function _blocked(status, reason, extra = {}) {
  return {
    schema_version:         SCHEMA_VERSION,
    command_export_status:  status,
    export_ready:           false,
    blocking_reason:        reason,
    copy_paste_safe:        false,
    human_only:             true,
    no_ci:                  true,
    no_automation:          true,
    ..._locked(),
    ...extra,
  };
}

function _preflightCommands(target_tag, git_head) {
  return [
    `# PREFLIGHT — run before executing`,
    `echo "Checking CI environment..."`,
    `# Must NOT be running in CI or GitHub Actions`,
    `git status --porcelain`,
    `# Expected: empty (clean working tree)`,
    `git rev-parse HEAD`,
    `# Expected: ${git_head}`,
    `git tag -l ${target_tag}`,
    `# Expected: empty (tag must not exist locally)`,
    `git ls-remote --tags origin ${target_tag}`,
    `# Expected: empty (tag must not exist remotely)`,
  ].join('\n');
}

function _executionCommands(target_tag, git_head) {
  return [
    `# EXECUTION — run manually, locally only, NEVER in CI`,
    `git tag -a ${target_tag} ${git_head} -m "Vision Core ${target_tag} PASS GOLD verified"`,
    `git push origin refs/tags/${target_tag}`,
  ].join('\n');
}

function _verificationCommands(target_tag, git_head) {
  return [
    `# POST-EXECUTION VERIFICATION`,
    `git rev-parse ${target_tag}`,
    `# Expected: ${git_head}`,
    `git ls-remote --tags origin ${target_tag}`,
    `git status --porcelain`,
    `# Expected: empty (working tree still clean)`,
  ].join('\n');
}

function _rollbackCommands(target_tag) {
  return [
    `# ROLLBACK — only if tag was created incorrectly`,
    `git tag -d ${target_tag}`,
    `git push origin :refs/tags/${target_tag}`,
  ].join('\n');
}

function _receiptFillInstructions(target_tag, git_head) {
  return [
    `# RECEIPT FILL INSTRUCTIONS`,
    `# After execution, fill in the receipt template with:`,
    `#   target_tag:         ${target_tag}`,
    `#   git_head:           ${git_head}`,
    `#   executed_by:        <your name/handle>`,
    `#   executed_at:        <ISO 8601 timestamp>`,
    `#   local_tag_verified: true (after git rev-parse ${target_tag} matches ${git_head})`,
    `#   remote_tag_verified: true (after git ls-remote confirms tag)`,
    `#   local_tag_head:     <output of git rev-parse ${target_tag}>`,
    `#   remote_tag_head:    <output of git ls-remote>`,
    `#   tag_created:        true`,
    `#   git_push_performed: true`,
    `#   notes:              <any observations>`,
    `# Then import via: node tools/one-real-tag-human-receipt-capture.mjs`,
  ].join('\n');
}

function _commandHash(target_tag, git_head) {
  const content = [
    _executionCommands(target_tag, git_head),
    _verificationCommands(target_tag, git_head),
    _rollbackCommands(target_tag),
  ].join('||');
  return _sha256(content);
}

function _exportHash(packet_id, target_tag, git_head, command_hash) {
  return _sha256([packet_id, target_tag, git_head, command_hash].join('|'));
}

export function buildOneRealTagLocalManualCommandExport(params) {
  const { execution_packet } = params || {};

  if (!execution_packet || !execution_packet.packet_ready) {
    return _blocked('COMMAND_EXPORT_BLOCKED_PACKET', 'execution_packet not ready');
  }

  const { packet_id, target_tag, git_head } = execution_packet;

  const command_hash = _commandHash(target_tag, git_head);
  const export_hash  = _exportHash(packet_id, target_tag, git_head, command_hash);

  const command_export_id = _sha256([packet_id, export_hash].join('|'));

  return {
    schema_version:           SCHEMA_VERSION,
    command_export_id,
    command_export_status:    'COMMAND_EXPORT_READY_FOR_HUMAN_COPY_PASTE',
    export_ready:             true,
    packet_id,
    target_tag,
    git_head,
    preflight_commands:       _preflightCommands(target_tag, git_head),
    execution_commands:       _executionCommands(target_tag, git_head),
    verification_commands:    _verificationCommands(target_tag, git_head),
    rollback_commands:        _rollbackCommands(target_tag),
    receipt_fill_instructions: _receiptFillInstructions(target_tag, git_head),
    command_hash,
    export_hash,
    copy_paste_safe:          true,
    human_only:               true,
    no_ci:                    true,
    no_automation:            true,
    ..._locked(),
  };
}

export function validateOneRealTagLocalManualCommandExport(exp) {
  if (!exp || typeof exp !== 'object') return { valid: false, errors: ['export is null/undefined'] };

  const errors = [];

  if (!COMMAND_EXPORT_STATUSES.includes(exp.command_export_status)) {
    errors.push(`invalid command_export_status: ${exp.command_export_status}`);
  }
  if (exp.schema_version !== SCHEMA_VERSION) errors.push(`invalid schema_version: ${exp.schema_version}`);
  if (exp.tag_created !== false) errors.push('tag_created must be false');
  if (exp.git_push_performed !== false) errors.push('git_push_performed must be false');
  if (exp.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (exp.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (exp.release_performed !== false) errors.push('release_performed must be false');
  if (exp.human_only !== true) errors.push('human_only must be true');
  if (exp.no_ci !== true) errors.push('no_ci must be true');
  if (exp.no_automation !== true) errors.push('no_automation must be true');

  return { valid: errors.length === 0, errors };
}

export function renderOneRealTagLocalManualCommandExport(exp) {
  if (!exp || !exp.export_ready) {
    return `[COMMAND EXPORT BLOCKED] ${exp?.command_export_status || 'unknown'}: ${exp?.blocking_reason || 'unknown reason'}`;
  }

  return [
    `=== ONE REAL TAG LOCAL MANUAL COMMAND EXPORT ===`,
    `Schema:      ${exp.schema_version}`,
    `Export ID:   ${exp.command_export_id}`,
    `Status:      ${exp.command_export_status}`,
    `Target Tag:  ${exp.target_tag}`,
    `Git HEAD:    ${exp.git_head}`,
    `Packet ID:   ${exp.packet_id}`,
    ``,
    `--- PREFLIGHT COMMANDS ---`,
    exp.preflight_commands,
    ``,
    `--- EXECUTION COMMANDS (HUMAN ONLY, LOCAL ONLY) ---`,
    exp.execution_commands,
    ``,
    `--- VERIFICATION COMMANDS ---`,
    exp.verification_commands,
    ``,
    `--- ROLLBACK COMMANDS ---`,
    exp.rollback_commands,
    ``,
    `--- RECEIPT FILL INSTRUCTIONS ---`,
    exp.receipt_fill_instructions,
    ``,
    `command_hash=${exp.command_hash}`,
    `export_hash=${exp.export_hash}`,
    `tag_created=false | git_push_performed=false | deploy=false | stable=false | release=false`,
  ].join('\n');
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('one-real-tag-local-manual-command-export.mjs')) {
  const isJson = process.argv.includes('--json');

  const mockPacket = {
    packet_ready:    true,
    packet_id:       'mock-packet-id-v1060',
    packet_status:   'EXEC_PACKET_READY_FOR_HUMAN_EXECUTION',
    target_tag:      'v106.1-mock',
    git_head:        '8ce8674',
    tag_created:     false,
    git_push_performed: false,
    deploy_performed:   false,
    stable_promoted:    false,
    release_performed:  false,
  };

  const exp = buildOneRealTagLocalManualCommandExport({ execution_packet: mockPacket });

  if (isJson) {
    console.log(JSON.stringify(exp, null, 2));
  } else {
    console.log(renderOneRealTagLocalManualCommandExport(exp));
  }
}
