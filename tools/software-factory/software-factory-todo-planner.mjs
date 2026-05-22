import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_TODO_PLANNER_STATUSES = [
  'TODO_PLANNER_BLOCKED_INPUT',
  'TODO_PLANNER_BLOCKED_CONTRACT',
  'TODO_PLANNER_READY',
];

const BASE = {
  schema_version: 'v207.0',
  todo_planner_id: null,
  contract_id: null,
  todos: [],
  todo_count: 0,
  plan_ready: false,
  plan_hash: null,
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  errors: [],
};

function id() {
  return 'todo-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

function hash(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['TODO_PLANNER_BLOCKED_INPUT'] };
  }
  if (!input.todo_planner_id || typeof input.todo_planner_id !== 'string') {
    return { ...BASE, errors: ['TODO_PLANNER_BLOCKED_INPUT: missing todo_planner_id'] };
  }
  if (!input.contract_id || typeof input.contract_id !== 'string') {
    return { ...BASE, errors: ['TODO_PLANNER_BLOCKED_INPUT: missing contract_id'] };
  }
  if (!input.prompt_ready) {
    return { ...BASE, contract_id: input.contract_id, errors: ['TODO_PLANNER_BLOCKED_CONTRACT: prompt not ready'] };
  }
  if (!input.scope_validated) {
    return { ...BASE, contract_id: input.contract_id, errors: ['TODO_PLANNER_BLOCKED_CONTRACT: scope not validated'] };
  }

  const todos = Array.isArray(input.mission_todos) && input.mission_todos.length > 0
    ? input.mission_todos.map((t, i) => ({ index: i, task: t, status: 'pending' }))
    : [
        { index: 0, task: 'Analyze scope', status: 'pending' },
        { index: 1, task: 'Apply recipe', status: 'pending' },
        { index: 2, task: 'Run tests', status: 'pending' },
        { index: 3, task: 'Create evidence receipt', status: 'pending' },
      ];

  const tid = input.todo_planner_id;
  return {
    ...BASE,
    todo_planner_id: tid,
    contract_id: input.contract_id,
    todos,
    todo_count: todos.length,
    plan_ready: true,
    plan_hash: hash({ tid, contract_id: input.contract_id }),
    errors: [],
  };
}

export function validate(plan) {
  if (!plan || !plan.todo_planner_id) return { valid: false, errors: ['TODO_PLANNER_BLOCKED_INPUT'] };
  const errors = [];
  if (plan.release_allowed !== false) errors.push('release_allowed must be false');
  if (plan.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (plan.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  return { valid: errors.length === 0, errors };
}

export function render(plan) {
  if (!plan || !plan.todo_planner_id) return 'TODO_PLANNER_BLOCKED_INPUT\nREGRA ABSOLUTA: release_allowed=false';
  let out = `=== Software Factory TODO Planner ===\n`;
  out += `schema_version: ${plan.schema_version}\n`;
  out += `todo_planner_id: ${plan.todo_planner_id}\n`;
  out += `contract_id: ${plan.contract_id}\n`;
  out += `todo_count: ${plan.todo_count}\n`;
  out += `plan_ready: ${plan.plan_ready}\n`;
  out += `release_allowed: ${plan.release_allowed}\n`;
  out += `deploy_allowed: ${plan.deploy_allowed}\n`;
  out += `real_execution_allowed: ${plan.real_execution_allowed}\n`;
  out += `REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.\n`;
  return out;
}
