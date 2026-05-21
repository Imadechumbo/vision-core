#!/usr/bin/env node
/**
 * Human Command Phrase Verifier — V151.1
 *
 * Verifies that the human operator has supplied the correct confirmation
 * phrase for the requested command type. Phrases are exact-match, case-
 * sensitive. No phrase → PHRASE_BLOCKED_EMPTY. Wrong phrase → PHRASE_BLOCKED_MISMATCH.
 *
 * Required phrases per command type:
 *   CONTROLLED_RUNTIME_EXECUTION  → "EXECUTE CONTROLLED RUNTIME NOW"
 *   CONTROLLED_STABLE_PROMOTION   → "PROMOTE STABLE CONTROLLED NOW"
 *   CONTROLLED_DEPLOY             → "DEPLOY CONTROLLED NOW"
 *   CONTROLLED_RELEASE            → "RELEASE CONTROLLED NOW"
 *   CONTROLLED_ROLLBACK_DRILL     → "DRILL ROLLBACK CONTROLLED NOW"
 *
 * REGRA ABSOLUTA: command_executed=false, execution_performed=false,
 * stable_promoted=false, deploy_performed=false, release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v151.1';

export const PHRASE_VERIFIER_STATUSES = [
  'PHRASE_BLOCKED_EMPTY',
  'PHRASE_BLOCKED_MISMATCH',
  'PHRASE_VERIFIED',
];

export const REQUIRED_PHRASES = {
  CONTROLLED_RUNTIME_EXECUTION: 'EXECUTE CONTROLLED RUNTIME NOW',
  CONTROLLED_STABLE_PROMOTION:  'PROMOTE STABLE CONTROLLED NOW',
  CONTROLLED_DEPLOY:            'DEPLOY CONTROLLED NOW',
  CONTROLLED_RELEASE:           'RELEASE CONTROLLED NOW',
  CONTROLLED_ROLLBACK_DRILL:    'DRILL ROLLBACK CONTROLLED NOW',
};

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    command_executed:    false,
    execution_performed: false,
    stable_promoted:     false,
    deploy_performed:    false,
    release_performed:   false,
  };
}

export function buildHumanCommandPhraseVerifier(params) {
  const {
    verifier_id,
    command_type,
    supplied_phrase,
    verified_at,
  } = params || {};

  const verifier_id_hash = _sha256([verifier_id, command_type].join('|'));
  const ts = verified_at ?? new Date().toISOString();

  if (!verifier_id || String(verifier_id).trim() === '' || !command_type) {
    return {
      verifier_id_hash,
      schema_version:        SCHEMA_VERSION,
      phrase_verifier_status: 'PHRASE_BLOCKED_EMPTY',
      blocked_reason:        'verifier_id and command_type are required.',
      phrase_verified:       false,
      verified_at:           ts,
      ..._locked(),
    };
  }

  const expected_phrase = REQUIRED_PHRASES[command_type];

  if (!expected_phrase) {
    return {
      verifier_id_hash,
      schema_version:        SCHEMA_VERSION,
      phrase_verifier_status: 'PHRASE_BLOCKED_EMPTY',
      blocked_reason:        `unknown command_type: ${command_type}`,
      phrase_verified:       false,
      verifier_id,
      command_type,
      verified_at:           ts,
      ..._locked(),
    };
  }

  if (!supplied_phrase || String(supplied_phrase).trim() === '') {
    return {
      verifier_id_hash,
      schema_version:        SCHEMA_VERSION,
      phrase_verifier_status: 'PHRASE_BLOCKED_EMPTY',
      blocked_reason:        'supplied_phrase is required.',
      phrase_verified:       false,
      verifier_id,
      command_type,
      expected_phrase_hint:  `[phrase required for ${command_type}]`,
      verified_at:           ts,
      ..._locked(),
    };
  }

  if (supplied_phrase !== expected_phrase) {
    return {
      verifier_id_hash,
      schema_version:        SCHEMA_VERSION,
      phrase_verifier_status: 'PHRASE_BLOCKED_MISMATCH',
      blocked_reason:        'supplied_phrase does not match required phrase for command_type.',
      phrase_verified:       false,
      verifier_id,
      command_type,
      supplied_phrase_hash:  _sha256(supplied_phrase),
      verified_at:           ts,
      ..._locked(),
    };
  }

  return {
    verifier_id_hash,
    schema_version:        SCHEMA_VERSION,
    phrase_verifier_status: 'PHRASE_VERIFIED',
    phrase_verified:       true,
    verifier_id,
    command_type,
    supplied_phrase_hash:  _sha256(supplied_phrase),
    verified_at:           ts,
    ..._locked(),
  };
}

export function validateHumanCommandPhraseVerifier(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  const required = [
    'verifier_id_hash', 'schema_version', 'phrase_verifier_status',
    'phrase_verified',
    'command_executed', 'execution_performed',
    'stable_promoted', 'deploy_performed', 'release_performed',
  ];
  for (const field of required) {
    if (!(field in result)) errors.push(`missing field: ${field}`);
  }
  if (result.command_executed    !== false) errors.push('command_executed must be false');
  if (result.execution_performed !== false) errors.push('execution_performed must be false');
  if (result.stable_promoted     !== false) errors.push('stable_promoted must be false');
  if (result.deploy_performed    !== false) errors.push('deploy_performed must be false');
  if (result.release_performed   !== false) errors.push('release_performed must be false');
  if (!PHRASE_VERIFIER_STATUSES.includes(result.phrase_verifier_status)) {
    errors.push(`invalid phrase_verifier_status: ${result.phrase_verifier_status}`);
  }
  if (result.phrase_verifier_status === 'PHRASE_VERIFIED') {
    if (result.phrase_verified !== true) errors.push('PHRASE_VERIFIED requires phrase_verified=true');
    if (!result.supplied_phrase_hash || !/^[a-f0-9]{64}$/.test(result.supplied_phrase_hash)) {
      errors.push('PHRASE_VERIFIED requires valid supplied_phrase_hash');
    }
  }
  return { valid: errors.length === 0, errors };
}

export function renderHumanCommandPhraseVerifier(result) {
  if (!result || typeof result !== 'object') {
    return '[HUMAN_COMMAND_PHRASE_VERIFIER] No result to render.';
  }
  const lines = [
    `=== Human Command Phrase Verifier [${SCHEMA_VERSION}] ===`,
    `Status:               ${result.phrase_verifier_status ?? 'N/A'}`,
    `Verifier ID:          ${result.verifier_id ?? 'N/A'}`,
    `Command type:         ${result.command_type ?? 'N/A'}`,
    `Phrase verified:      ${result.phrase_verified}`,
    `Phrase hash:          ${result.supplied_phrase_hash ?? 'N/A'}`,
    `Verified at:          ${result.verified_at ?? 'N/A'}`,
    `--- REGRA ABSOLUTA ---`,
    `command_executed=false | execution_performed=false | stable_promoted=false | deploy_performed=false | release_performed=false`,
  ];
  if (result.blocked_reason) lines.splice(2, 0, `Blocked reason:       ${result.blocked_reason}`);
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('human-command-phrase-verifier.mjs')) {
  const showJson = process.argv.includes('--json');
  const result = buildHumanCommandPhraseVerifier({
    verifier_id:     'v151.1-verifier',
    command_type:    'CONTROLLED_RUNTIME_EXECUTION',
    supplied_phrase: REQUIRED_PHRASES.CONTROLLED_RUNTIME_EXECUTION,
  });
  if (showJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderHumanCommandPhraseVerifier(result));
  }
  const v = validateHumanCommandPhraseVerifier(result);
  if (!v.valid) {
    process.stderr.write(`Validation failed: ${v.errors.join(', ')}\n`);
    process.exit(1);
  }
}
