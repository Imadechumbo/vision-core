import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_PATCH_CONTROLLER_STATUSES = [
  'PATCH_CONTROLLER_BLOCKED_INPUT',
  'PATCH_CONTROLLER_BLOCKED_CONTRACT',
  'PATCH_CONTROLLER_READY',
];

const BASE = {
  schema_version: 'v213.0',
  controller_id: null,
  contract_id: null,
  patches: [],
  patch_count: 0,
  controller_ready: false,
  controller_hash: null,
  real_patch_execution_allowed: false,
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  errors: [],
};

function hash(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['PATCH_CONTROLLER_BLOCKED_INPUT'] };
  }
  if (!input.controller_id || typeof input.controller_id !== 'string') {
    return { ...BASE, errors: ['PATCH_CONTROLLER_BLOCKED_INPUT: missing controller_id'] };
  }
  if (!input.contract_id || typeof input.contract_id !== 'string') {
    return { ...BASE, errors: ['PATCH_CONTROLLER_BLOCKED_INPUT: missing contract_id'] };
  }
  if (!input.engine_ready) {
    return { ...BASE, contract_id: input.contract_id, errors: ['PATCH_CONTROLLER_BLOCKED_CONTRACT: engine not ready'] };
  }
  if (!input.scope_validated) {
    return { ...BASE, contract_id: input.contract_id, errors: ['PATCH_CONTROLLER_BLOCKED_CONTRACT: scope not validated'] };
  }

  const patches = Array.isArray(input.patches) && input.patches.length > 0
    ? input.patches.map((p, i) => ({
        index: i,
        file: typeof p === 'string' ? p : p.file,
        op: typeof p === 'object' && p.op ? p.op : 'modify_file',
        status: 'pending',
      }))
    : [
        { index: 0, file: 'tools/software-factory/example.mjs', op: 'modify_file', status: 'pending' },
      ];

  const cid = input.controller_id;
  return {
    ...BASE,
    controller_id: cid,
    contract_id: input.contract_id,
    patches,
    patch_count: patches.length,
    controller_ready: true,
    controller_hash: hash({ cid, contract_id: input.contract_id }),
    errors: [],
  };
}

export function validate(controller) {
  if (!controller || !controller.controller_id) {
    return { valid: false, errors: ['PATCH_CONTROLLER_BLOCKED_INPUT'] };
  }
  const errors = [];
  if (controller.real_patch_execution_allowed !== false) errors.push('real_patch_execution_allowed must be false');
  if (controller.release_allowed !== false) errors.push('release_allowed must be false');
  if (controller.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (controller.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  return { valid: errors.length === 0, errors };
}

export function render(controller) {
  if (!controller || !controller.controller_id) {
    return 'PATCH_CONTROLLER_BLOCKED_INPUT\nREGRA ABSOLUTA: release_allowed=false real_patch_execution_allowed=false';
  }
  let out = `=== Software Factory Patch Controller ===\n`;
  out += `schema_version: ${controller.schema_version}\n`;
  out += `controller_id: ${controller.controller_id}\n`;
  out += `contract_id: ${controller.contract_id}\n`;
  out += `patch_count: ${controller.patch_count}\n`;
  out += `controller_ready: ${controller.controller_ready}\n`;
  out += `real_patch_execution_allowed: ${controller.real_patch_execution_allowed}\n`;
  out += `release_allowed: ${controller.release_allowed}\n`;
  out += `deploy_allowed: ${controller.deploy_allowed}\n`;
  out += `real_execution_allowed: ${controller.real_execution_allowed}\n`;
  out += `REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.\n`;
  return out;
}
