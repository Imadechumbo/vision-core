import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_PR_BODY_BUILDER_STATUSES = [
  'PR_BODY_BLOCKED_INPUT',
  'PR_BODY_BLOCKED_AUDIT',
  'PR_BODY_READY',
];

const FORBIDDEN_PATTERNS = ['secret', 'token', '.env', 'private key', 'password', 'api_key'];

const BASE = {
  schema_version: 'v236.0',
  body_builder_id: null,
  pr_audit_id: null,
  pr_body_ready: false,
  sections_count: 0,
  body_preview: null,
  body_hash: null,
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  real_pr_creation_allowed: false,
  production_touched: false,
  errors: [],
};

function hasForbiddenContent(text) {
  const lower = text.toLowerCase();
  return FORBIDDEN_PATTERNS.some(p => lower.includes(p));
}

function hash(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['PR_BODY_BLOCKED_INPUT'] };
  }
  if (!input.body_builder_id || typeof input.body_builder_id !== 'string') {
    return { ...BASE, errors: ['PR_BODY_BLOCKED_INPUT: missing body_builder_id'] };
  }
  if (!input.pr_audit_id || typeof input.pr_audit_id !== 'string') {
    return { ...BASE, errors: ['PR_BODY_BLOCKED_INPUT: missing pr_audit_id'] };
  }
  if (!input.pr_audit_ready) {
    return { ...BASE, pr_audit_id: input.pr_audit_id, errors: ['PR_BODY_BLOCKED_AUDIT: pr_audit not ready'] };
  }
  if (!Array.isArray(input.sections) || input.sections.length === 0) {
    return { ...BASE, pr_audit_id: input.pr_audit_id, errors: ['PR_BODY_BLOCKED_AUDIT: sections required'] };
  }
  for (const s of input.sections) {
    if (!s.heading || typeof s.heading !== 'string') {
      return { ...BASE, pr_audit_id: input.pr_audit_id, errors: ['PR_BODY_BLOCKED_AUDIT: each section requires heading'] };
    }
    if (!s.content || typeof s.content !== 'string') {
      return { ...BASE, pr_audit_id: input.pr_audit_id, errors: ['PR_BODY_BLOCKED_AUDIT: each section requires content'] };
    }
    if (hasForbiddenContent(s.heading) || hasForbiddenContent(s.content)) {
      return { ...BASE, pr_audit_id: input.pr_audit_id, errors: ['PR_BODY_BLOCKED_AUDIT: forbidden content detected in sections'] };
    }
  }

  const bid = input.body_builder_id;
  const body_preview = input.sections.map(s => `## ${s.heading}\n${s.content}`).join('\n\n').slice(0, 200);
  return {
    ...BASE,
    body_builder_id: bid,
    pr_audit_id: input.pr_audit_id,
    pr_body_ready: true,
    sections_count: input.sections.length,
    body_preview,
    body_hash: hash({ bid, pr_audit_id: input.pr_audit_id, sections: input.sections }),
    errors: [],
  };
}

export function validate(result) {
  if (!result || !result.body_builder_id) {
    return { valid: false, errors: ['PR_BODY_BLOCKED_INPUT'] };
  }
  const errors = [];
  if (result.release_allowed !== false) errors.push('release_allowed must be false');
  if (result.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (result.stable_allowed !== false) errors.push('stable_allowed must be false');
  if (result.tag_allowed !== false) errors.push('tag_allowed must be false');
  if (result.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  if (result.real_pr_creation_allowed !== false) errors.push('real_pr_creation_allowed must be false');
  if (result.production_touched !== false) errors.push('production_touched must be false');
  return { valid: errors.length === 0, errors };
}

export function render(result) {
  if (!result || !result.body_builder_id) {
    return 'PR_BODY_BLOCKED_INPUT\nREGRA ABSOLUTA: release_allowed=false real_pr_creation_allowed=false production_touched=false';
  }
  let out = `=== Software Factory PR Body Builder ===\n`;
  out += `schema_version: ${result.schema_version}\n`;
  out += `body_builder_id: ${result.body_builder_id}\n`;
  out += `pr_audit_id: ${result.pr_audit_id}\n`;
  out += `pr_body_ready: ${result.pr_body_ready}\n`;
  out += `sections_count: ${result.sections_count}\n`;
  out += `release_allowed: ${result.release_allowed}\n`;
  out += `real_pr_creation_allowed: ${result.real_pr_creation_allowed}\n`;
  out += `production_touched: ${result.production_touched}\n`;
  out += `REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.\n`;
  return out;
}
