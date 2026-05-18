#!/usr/bin/env node
/**
 * Real Tag Actual Command Renderer — V92.1
 *
 * Renders a copy/paste-safe command block from a READY command gate result.
 * 2 statuses: RENDERER_BLOCKED_GATE, RENDERER_READY.
 *
 * REGRA ABSOLUTA: tag_created=false always. actual_real_tag_created=false always.
 * Renderer produces the command text — does NOT execute it.
 */

import { createHash } from 'crypto';
import { evaluateRealTagCommandGate } from './real-tag-actual-command-gate.mjs';

const SCHEMA_VERSION = 'v92.1';

export const COMMAND_RENDERER_STATUSES = [
  'RENDERER_BLOCKED_GATE',
  'RENDERER_READY',
];

const COPY_PASTE_HEADER = [
  '# ══════════════════════════════════════════════════════════════',
  '# REAL TAG EXECUTION COMMAND — COPY AND RUN MANUALLY',
  '# WARNING: This creates a real git tag. No deploy. No stable.',
  '# Run locally only. Not in CI. Not automated.',
  '# ══════════════════════════════════════════════════════════════',
].join('\n');

const COPY_PASTE_FOOTER = [
  '# ──────────────────────────────────────────────────────────────',
  '# After running, verify:',
  '#   git tag -l <tag>',
  '#   git ls-remote --tags origin refs/tags/<tag>',
  '#   git rev-list -n 1 <tag>  # must match HEAD SHA',
  '# Rollback if needed:',
  '#   git tag -d <tag>',
  '#   git push origin :refs/tags/<tag>',
  '# ══════════════════════════════════════════════════════════════',
].join('\n');

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _buildCommandBlock(command_presented) {
  return [
    COPY_PASTE_HEADER,
    '',
    command_presented,
    '',
    COPY_PASTE_FOOTER,
  ].join('\n');
}

function _locked() {
  return {
    tag_created:                  false,
    git_push_performed:           false,
    deploy_performed:             false,
    stable_promoted:              false,
    release_performed:            false,
    actual_real_tag_created:      false,
    real_execution_not_performed: true,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:    SCHEMA_VERSION,
    renderer_status:   status,
    renderer_ready:    false,
    blocking_reason,
    command_block:     null,
    ...extra,
    ..._locked(),
  };
}

export function buildRealTagActualCommandRenderer(params = {}) {
  const {
    fixture_mode    = false,
    gate_result,
    _mock_timestamp,
  } = params ?? {};

  const now         = _mock_timestamp ?? new Date().toISOString();
  const renderer_id = _sha256(`real-tag-command-renderer:${SCHEMA_VERSION}:${now}`).slice(0, 24);

  const eff_gate = fixture_mode
    ? evaluateRealTagCommandGate({ fixture_mode: true, _mock_timestamp: now })
    : (gate_result !== undefined ? gate_result : null);

  // ── Gate check ───────────────────────────────────────────────
  if (!eff_gate || eff_gate.gate_ready !== true) {
    return _blocked('RENDERER_BLOCKED_GATE', 'command_gate_not_ready', {
      renderer_id,
      gate_verified:  false,
      gate_status:    eff_gate?.command_gate_status ?? null,
      created_at:     now,
    });
  }

  const command_presented = eff_gate.command_presented ?? '';
  const command_block = _buildCommandBlock(command_presented);

  return {
    schema_version:   SCHEMA_VERSION,
    renderer_id,
    renderer_status:  'RENDERER_READY',
    renderer_ready:   true,
    blocking_reason:  null,
    gate_verified:    true,
    gate_status:      eff_gate.command_gate_status,
    command_block,
    command_presented,
    created_at:       now,
    ..._locked(),
  };
}

export function renderCommandBlock(result) {
  if (!result) return 'real_tag_command_renderer: null';
  if (!result.renderer_ready || !result.command_block) {
    return [
      `renderer_status : ${result.renderer_status ?? 'UNKNOWN'}`,
      `renderer_ready  : false`,
      `blocking_reason : ${result.blocking_reason ?? 'none'}`,
      `command_block   : null`,
    ].join('\n');
  }
  return result.command_block;
}

export function renderCommandRendererSummary(result) {
  if (!result) return 'real_tag_command_renderer: null';
  const lines = [
    `renderer_status             : ${result.renderer_status ?? 'UNKNOWN'}`,
    `renderer_id                 : ${result.renderer_id ?? 'none'}`,
    `renderer_ready              : ${result.renderer_ready ?? false}`,
    `gate_verified               : ${result.gate_verified ?? false}`,
    `tag_created                 : false`,
    `actual_real_tag_created     : false`,
    `git_push_performed          : false`,
    `real_execution_not_performed: true`,
    `blocking_reason             : ${result.blocking_reason ?? 'none'}`,
  ];
  if (result.renderer_ready && result.command_block) {
    lines.push('');
    lines.push(result.command_block);
  }
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-tag-actual-command-renderer.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');
  const block   = args.includes('--block');

  const result = buildRealTagActualCommandRenderer({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (block) {
    console.log(renderCommandBlock(result));
  } else {
    console.log(renderCommandRendererSummary(result));
  }

  process.exit(result.renderer_ready ? 0 : 1);
}
