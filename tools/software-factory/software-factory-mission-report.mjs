import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_MISSION_REPORT_STATUSES = [
  'MISSION_REPORT_BLOCKED_INPUT',
  'MISSION_REPORT_BLOCKED_CONTRACT',
  'MISSION_REPORT_READY',
];

const BASE = {
  schema_version: 'v217.0',
  report_id: null,
  contract_id: null,
  mission_type: null,
  sections: [],
  section_count: 0,
  report_ready: false,
  report_hash: null,
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  errors: [],
};

const DEFAULT_SECTIONS = ['summary', 'evidence', 'scope_check', 'governance'];

function hash(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['MISSION_REPORT_BLOCKED_INPUT'] };
  }
  if (!input.report_id || typeof input.report_id !== 'string') {
    return { ...BASE, errors: ['MISSION_REPORT_BLOCKED_INPUT: missing report_id'] };
  }
  if (!input.contract_id || typeof input.contract_id !== 'string') {
    return { ...BASE, errors: ['MISSION_REPORT_BLOCKED_INPUT: missing contract_id'] };
  }
  if (!input.mission_type || typeof input.mission_type !== 'string') {
    return { ...BASE, errors: ['MISSION_REPORT_BLOCKED_INPUT: missing mission_type'] };
  }
  if (!input.gate_ready) {
    return { ...BASE, contract_id: input.contract_id, errors: ['MISSION_REPORT_BLOCKED_CONTRACT: gate not ready'] };
  }
  if (!input.scope_validated) {
    return { ...BASE, contract_id: input.contract_id, errors: ['MISSION_REPORT_BLOCKED_CONTRACT: scope not validated'] };
  }

  const sections = Array.isArray(input.sections) && input.sections.length > 0
    ? input.sections.map((s, i) => ({ index: i, name: typeof s === 'string' ? s : s.name, content: '' }))
    : DEFAULT_SECTIONS.map((s, i) => ({ index: i, name: s, content: '' }));

  const rid = input.report_id;
  return {
    ...BASE,
    report_id: rid,
    contract_id: input.contract_id,
    mission_type: input.mission_type,
    sections,
    section_count: sections.length,
    report_ready: true,
    report_hash: hash({ rid, contract_id: input.contract_id, mission_type: input.mission_type }),
    errors: [],
  };
}

export function validate(report) {
  if (!report || !report.report_id) {
    return { valid: false, errors: ['MISSION_REPORT_BLOCKED_INPUT'] };
  }
  const errors = [];
  if (report.release_allowed !== false) errors.push('release_allowed must be false');
  if (report.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (report.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  return { valid: errors.length === 0, errors };
}

export function render(report) {
  if (!report || !report.report_id) {
    return 'MISSION_REPORT_BLOCKED_INPUT\nREGRA ABSOLUTA: release_allowed=false';
  }
  let out = `=== Software Factory Mission Report ===\n`;
  out += `schema_version: ${report.schema_version}\n`;
  out += `report_id: ${report.report_id}\n`;
  out += `contract_id: ${report.contract_id}\n`;
  out += `mission_type: ${report.mission_type}\n`;
  out += `section_count: ${report.section_count}\n`;
  out += `report_ready: ${report.report_ready}\n`;
  out += `release_allowed: ${report.release_allowed}\n`;
  out += `deploy_allowed: ${report.deploy_allowed}\n`;
  out += `real_execution_allowed: ${report.real_execution_allowed}\n`;
  out += `REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.\n`;
  return out;
}
