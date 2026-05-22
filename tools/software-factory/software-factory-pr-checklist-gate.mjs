import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_PR_CHECKLIST_GATE_STATUSES = [
  'PR_CHECKLIST_BLOCKED_INPUT',
  'PR_CHECKLIST_BLOCKED_BODY',
  'PR_CHECKLIST_INCOMPLETE',
  'PR_CHECKLIST_READY',
];

const REQUIRED_ITEMS = [
  'scope_ok',
  'tests_ok',
  'syntax_ok',
  'security_ok',
  'rollback_ok',
  'evidence_ok',
  'forbidden_files_false',
  'production_untouched',
  'no_release',
  'no_deploy',
  'no_stable',
  'no_tag',
];

const BASE = {
  schema_version: 'v237.0',
  checklist_id: null,
  body_builder_id: null,
  pr_checklist_ready: false,
  items_total: 0,
  items_checked: 0,
  all_checked: false,
  checklist_hash: null,
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  real_pr_creation_allowed: false,
  production_touched: false,
  errors: [],
};

function hash(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['PR_CHECKLIST_BLOCKED_INPUT'] };
  }
  if (!input.checklist_id || typeof input.checklist_id !== 'string') {
    return { ...BASE, errors: ['PR_CHECKLIST_BLOCKED_INPUT: missing checklist_id'] };
  }
  if (!input.body_builder_id || typeof input.body_builder_id !== 'string') {
    return { ...BASE, errors: ['PR_CHECKLIST_BLOCKED_INPUT: missing body_builder_id'] };
  }
  if (!input.pr_body_ready) {
    return { ...BASE, body_builder_id: input.body_builder_id, errors: ['PR_CHECKLIST_BLOCKED_BODY: pr_body not ready'] };
  }
  if (!Array.isArray(input.checklist) || input.checklist.length === 0) {
    return { ...BASE, body_builder_id: input.body_builder_id, errors: ['PR_CHECKLIST_BLOCKED_BODY: checklist required'] };
  }

  const itemMap = {};
  for (const entry of input.checklist) {
    if (entry && entry.item) itemMap[entry.item] = entry.checked === true;
  }

  const missingItems = REQUIRED_ITEMS.filter(item => !(item in itemMap));
  if (missingItems.length > 0) {
    return { ...BASE, body_builder_id: input.body_builder_id, errors: [`PR_CHECKLIST_INCOMPLETE: missing items: ${missingItems.join(', ')}`] };
  }

  const uncheckedItems = REQUIRED_ITEMS.filter(item => !itemMap[item]);
  const items_checked = REQUIRED_ITEMS.filter(item => itemMap[item]).length;
  const all_checked = uncheckedItems.length === 0;

  const cid = input.checklist_id;
  if (!all_checked) {
    return {
      ...BASE,
      checklist_id: cid,
      body_builder_id: input.body_builder_id,
      items_total: REQUIRED_ITEMS.length,
      items_checked,
      all_checked: false,
      checklist_hash: hash({ cid, body_builder_id: input.body_builder_id }),
      errors: [`PR_CHECKLIST_INCOMPLETE: unchecked items: ${uncheckedItems.join(', ')}`],
    };
  }

  return {
    ...BASE,
    checklist_id: cid,
    body_builder_id: input.body_builder_id,
    pr_checklist_ready: true,
    items_total: REQUIRED_ITEMS.length,
    items_checked,
    all_checked: true,
    checklist_hash: hash({ cid, body_builder_id: input.body_builder_id }),
    errors: [],
  };
}

export function validate(result) {
  if (!result || !result.checklist_id) {
    return { valid: false, errors: ['PR_CHECKLIST_BLOCKED_INPUT'] };
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
  if (!result || !result.checklist_id) {
    return 'PR_CHECKLIST_BLOCKED_INPUT\nREGRA ABSOLUTA: release_allowed=false real_pr_creation_allowed=false production_touched=false';
  }
  let out = `=== Software Factory PR Checklist Gate ===\n`;
  out += `schema_version: ${result.schema_version}\n`;
  out += `checklist_id: ${result.checklist_id}\n`;
  out += `pr_checklist_ready: ${result.pr_checklist_ready}\n`;
  out += `items_total: ${result.items_total}\n`;
  out += `items_checked: ${result.items_checked}\n`;
  out += `all_checked: ${result.all_checked}\n`;
  out += `release_allowed: ${result.release_allowed}\n`;
  out += `real_pr_creation_allowed: ${result.real_pr_creation_allowed}\n`;
  out += `production_touched: ${result.production_touched}\n`;
  out += `REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.\n`;
  return out;
}
