#!/usr/bin/env node
/**
 * One Real Tag Final Execution Packet — V106.0
 *
 * Builds consolidated final execution packet for one real git tag operation.
 * Consolidates baseline, target tag, HEAD, evidence, rollback anchor,
 * command seal and receipt template. Does NOT execute anything.
 *
 * REGRA ABSOLUTA: tag_created=false, git_push_performed=false always.
 * deploy_performed=false, stable_promoted=false, release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v106.0';

export const EXEC_PACKET_STATUSES = [
  'EXEC_PACKET_BLOCKED_BASELINE',
  'EXEC_PACKET_BLOCKED_TAG',
  'EXEC_PACKET_BLOCKED_HEAD',
  'EXEC_PACKET_BLOCKED_EVIDENCE',
  'EXEC_PACKET_BLOCKED_ROLLBACK',
  'EXEC_PACKET_BLOCKED_COMMAND_SEAL',
  'EXEC_PACKET_READY_FOR_HUMAN_EXECUTION',
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
    schema_version:    SCHEMA_VERSION,
    packet_status:     status,
    packet_ready:      false,
    blocking_reason:   reason,
    ..._locked(),
    human_must_execute_manually: true,
    local_interactive_only:      true,
    ci_blocked:                  true,
    ...extra,
  };
}

function _packetId(target_tag, git_head, evidence_receipt_id, rollback_anchor_id, command_seal_id) {
  return _sha256([target_tag, git_head, evidence_receipt_id, rollback_anchor_id, command_seal_id].join('|'));
}

function _forbiddenActions() {
  return [
    'deploy',
    'stable_promotion',
    'release',
    'force_push_without_review',
    'evidence_source_override',
    'go_core_receipt_override',
    'automated_tag_creation',
    'ci_execution',
  ];
}

function _finalPreflightChecks(target_tag, git_head) {
  return [
    `CI=false (must not be running in CI)`,
    `GITHUB_ACTIONS=false (must not be running in GitHub Actions)`,
    `git status --porcelain = empty (working tree must be clean)`,
    `git rev-parse HEAD = ${git_head} (current HEAD must match)`,
    `git tag -l ${target_tag} = empty (tag must not exist locally)`,
    `git ls-remote --tags origin ${target_tag} = empty (tag must not exist remotely)`,
    `rollback anchor must be present`,
    `evidence_source must be go-core`,
  ];
}

function _exactManualCommandBlock(target_tag, git_head) {
  return [
    `# ONE REAL TAG — MANUAL EXECUTION ONLY`,
    `# Execute ONLY locally. NEVER in CI. NEVER automated.`,
    ``,
    `# Step 1: Verify HEAD`,
    `git rev-parse HEAD`,
    `# Expected: ${git_head}`,
    ``,
    `# Step 2: Create annotated tag`,
    `git tag -a ${target_tag} ${git_head} -m "Vision Core ${target_tag} PASS GOLD verified"`,
    ``,
    `# Step 3: Push tag to origin`,
    `git push origin refs/tags/${target_tag}`,
    ``,
    `# Step 4: Verify local`,
    `git rev-parse ${target_tag}`,
    ``,
    `# Step 5: Verify remote`,
    `git ls-remote --tags origin ${target_tag}`,
    ``,
    `# Step 6: Capture receipt and import via tools/one-real-tag-human-receipt-capture.mjs`,
  ].join('\n');
}

function _verificationCommandBlock(target_tag, git_head) {
  return [
    `git rev-parse ${target_tag}`,
    `# Expected: ${git_head}`,
    `git ls-remote --tags origin ${target_tag}`,
    `git status --porcelain`,
    `# Expected: empty`,
  ].join('\n');
}

function _rollbackCommandBlock(target_tag) {
  return [
    `# ROLLBACK — remove tag locally and remotely`,
    `git tag -d ${target_tag}`,
    `git push origin :refs/tags/${target_tag}`,
  ].join('\n');
}

export function buildOneRealTagFinalExecutionPacket(params) {
  const {
    human_exec_readiness_baseline,
    target_tag,
    git_head,
    evidence_receipt_id,
    evidence_source,
    rollback_anchor_id,
    command_seal_id,
    receipt_template_id,
  } = params || {};

  // Validate baseline
  if (!human_exec_readiness_baseline || !human_exec_readiness_baseline.human_exec_readiness_ready) {
    return _blocked('EXEC_PACKET_BLOCKED_BASELINE', 'human_exec_readiness_baseline not ready');
  }

  // Validate target_tag
  if (!target_tag || typeof target_tag !== 'string' || !target_tag.startsWith('v')) {
    return _blocked('EXEC_PACKET_BLOCKED_TAG', 'target_tag missing or does not start with v');
  }

  // Validate git_head
  if (!git_head || typeof git_head !== 'string' || git_head.length < 7) {
    return _blocked('EXEC_PACKET_BLOCKED_HEAD', 'git_head missing or invalid');
  }

  // Validate evidence source
  if (evidence_source !== 'go-core' || !evidence_receipt_id) {
    return _blocked('EXEC_PACKET_BLOCKED_EVIDENCE', 'evidence_source must be go-core and evidence_receipt_id required');
  }

  // Validate rollback anchor
  if (!rollback_anchor_id) {
    return _blocked('EXEC_PACKET_BLOCKED_ROLLBACK', 'rollback_anchor_id required');
  }

  // Validate command seal
  if (!command_seal_id) {
    return _blocked('EXEC_PACKET_BLOCKED_COMMAND_SEAL', 'command_seal_id required');
  }

  const baseline_id = human_exec_readiness_baseline.human_exec_readiness_baseline_id ||
    _sha256(JSON.stringify(human_exec_readiness_baseline));

  const packet_id = _packetId(target_tag, git_head, evidence_receipt_id, rollback_anchor_id, command_seal_id);

  return {
    schema_version:                    SCHEMA_VERSION,
    packet_id,
    packet_status:                     'EXEC_PACKET_READY_FOR_HUMAN_EXECUTION',
    packet_ready:                      true,
    human_exec_readiness_baseline_id:  baseline_id,
    target_tag,
    git_head,
    evidence_receipt_id,
    evidence_source,
    rollback_anchor_id,
    command_seal_id,
    receipt_template_id:               receipt_template_id || null,
    final_preflight_checks:            _finalPreflightChecks(target_tag, git_head),
    exact_manual_command_block:        _exactManualCommandBlock(target_tag, git_head),
    verification_command_block:        _verificationCommandBlock(target_tag, git_head),
    rollback_command_block:            _rollbackCommandBlock(target_tag),
    forbidden_actions:                 _forbiddenActions(),
    human_must_execute_manually:       true,
    local_interactive_only:            true,
    ci_blocked:                        true,
    ..._locked(),
  };
}

export function validateOneRealTagFinalExecutionPacket(packet) {
  if (!packet || typeof packet !== 'object') return { valid: false, errors: ['packet is null/undefined'] };

  const errors = [];

  if (!EXEC_PACKET_STATUSES.includes(packet.packet_status)) {
    errors.push(`invalid packet_status: ${packet.packet_status}`);
  }
  if (packet.schema_version !== SCHEMA_VERSION) {
    errors.push(`invalid schema_version: ${packet.schema_version}`);
  }
  if (packet.tag_created !== false) errors.push('tag_created must be false');
  if (packet.git_push_performed !== false) errors.push('git_push_performed must be false');
  if (packet.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (packet.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (packet.release_performed !== false) errors.push('release_performed must be false');
  if (packet.human_must_execute_manually !== true) errors.push('human_must_execute_manually must be true');
  if (packet.local_interactive_only !== true) errors.push('local_interactive_only must be true');
  if (packet.ci_blocked !== true) errors.push('ci_blocked must be true');

  return { valid: errors.length === 0, errors };
}

export function renderOneRealTagFinalExecutionPacket(packet) {
  if (!packet || !packet.packet_ready) {
    return `[EXEC PACKET BLOCKED] ${packet?.packet_status || 'unknown'}: ${packet?.blocking_reason || 'unknown reason'}`;
  }

  return [
    `=== ONE REAL TAG FINAL EXECUTION PACKET ===`,
    `Schema:       ${packet.schema_version}`,
    `Packet ID:    ${packet.packet_id}`,
    `Status:       ${packet.packet_status}`,
    `Target Tag:   ${packet.target_tag}`,
    `Git HEAD:     ${packet.git_head}`,
    `Evidence:     ${packet.evidence_receipt_id} (${packet.evidence_source})`,
    `Rollback:     ${packet.rollback_anchor_id}`,
    `Command Seal: ${packet.command_seal_id}`,
    ``,
    `--- FINAL PREFLIGHT CHECKS ---`,
    packet.final_preflight_checks.join('\n'),
    ``,
    `--- EXACT MANUAL COMMAND BLOCK ---`,
    packet.exact_manual_command_block,
    ``,
    `--- VERIFICATION COMMANDS ---`,
    packet.verification_command_block,
    ``,
    `--- ROLLBACK COMMANDS ---`,
    packet.rollback_command_block,
    ``,
    `--- FORBIDDEN ACTIONS ---`,
    packet.forbidden_actions.join(', '),
    ``,
    `tag_created=false | git_push_performed=false | deploy=false | stable=false | release=false`,
  ].join('\n');
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('one-real-tag-final-execution-packet.mjs')) {
  const isJson = process.argv.includes('--json');

  const mockBaseline = {
    human_exec_readiness_ready:          true,
    human_exec_readiness_baseline_id:    'mock-baseline-id-v105',
    human_exec_readiness_status:         'HUMAN_EXEC_READINESS_READY_FOR_MANUAL_TAG_EXECUTION',
    ready_for_manual_tag_execution:      true,
    actual_real_tag_created:             false,
    actual_git_push_performed:           false,
    stable_promoted:                     false,
  };

  const packet = buildOneRealTagFinalExecutionPacket({
    human_exec_readiness_baseline: mockBaseline,
    target_tag:          'v106.0-mock',
    git_head:            '8180b0e',
    evidence_receipt_id: 'mock-evidence-receipt-001',
    evidence_source:     'go-core',
    rollback_anchor_id:  'mock-rollback-anchor-001',
    command_seal_id:     'mock-command-seal-001',
    receipt_template_id: 'mock-receipt-template-001',
  });

  if (isJson) {
    console.log(JSON.stringify(packet, null, 2));
  } else {
    console.log(renderOneRealTagFinalExecutionPacket(packet));
  }
}
