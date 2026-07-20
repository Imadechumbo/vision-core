'use strict';

const crypto = require('crypto');
const path = require('path');

const VALID_AUDIT_MODES = new Set(['deterministic', 'deterministic_llm']);

function isSfRealExecutionEnabled(env = process.env) {
  return String(env.SF_REAL_EXECUTION_ENABLED || '').toLowerCase() === 'true';
}

function isSfRealExecutionAgentAllowed(agentId, env = process.env) {
  const allowed = String(env.SF_REAL_EXECUTION_ALLOWED_AGENTS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  if (!allowed.length) return false;
  return allowed.includes(String(agentId || '').trim());
}

function normalizeAuditMode(value) {
  return VALID_AUDIT_MODES.has(value) ? value : 'deterministic_llm';
}

function slugify(value) {
  const s = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  return s || 'vision-project';
}

function safeRelativeFileName(name) {
  const raw = String(name || '').replace(/\\/g, '/').trim();
  if (!raw || raw.includes('\0')) return null;
  if (raw.startsWith('/') || /^[A-Za-z]:\//.test(raw)) return null;
  const normalized = path.posix.normalize(raw);
  if (!normalized || normalized === '.' || normalized === '..' || normalized.startsWith('../')) return null;
  return normalized.replace(/^\.\//, '');
}

function normalizeSfFiles(files, maxFiles = 80) {
  if (!Array.isArray(files) || files.length === 0) {
    const err = new Error('files_required');
    err.code = 'files_required';
    throw err;
  }
  const out = [];
  const seen = new Set();
  for (const f of files.slice(0, maxFiles)) {
    const name = safeRelativeFileName(f && (f.name || f.path || f.file));
    if (!name) {
      const err = new Error('invalid_file_path');
      err.code = 'invalid_file_path';
      throw err;
    }
    if (seen.has(name)) continue;
    seen.add(name);
    out.push({ name, content: String((f && f.content) || '') });
  }
  if (!out.length) {
    const err = new Error('files_required');
    err.code = 'files_required';
    throw err;
  }
  return out;
}

function normalizeProjectId(value) {
  const s = String(value || '').trim();
  return /^[A-Za-z0-9._:-]{1,96}$/.test(s) ? s : slugify(s);
}

function fileHashes(files) {
  return files.map(f => ({
    name: f.name,
    sha256: crypto.createHash('sha256').update(f.content).digest('hex')
  }));
}

function makeIntentHash(input) {
  return crypto.createHash('sha256').update(JSON.stringify({
    user_id: input.user_id || 'anonymous',
    project_id: input.project_id,
    agent_id: input.agent_id,
    audit_mode: input.audit_mode,
    description: input.description || '',
    files: fileHashes(input.files)
  })).digest('hex');
}

function createSfExecutionIntent({ body, user, now, makeMissionId }) {
  const files = normalizeSfFiles(body.files);
  const agentId = String(body.agent_id || '').trim();
  if (!/^[A-Za-z0-9._:-]{1,96}$/.test(agentId)) {
    const err = new Error('agent_id_required');
    err.code = 'agent_id_required';
    throw err;
  }
  const projectId = normalizeProjectId(body.project_id || body.project || body.description || 'sf-project');
  const missionId = makeMissionId ? makeMissionId() : `sf_create_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const userId = user && user.id ? String(user.id) : 'anonymous';
  const auditMode = normalizeAuditMode(body.audit_mode);
  const base = {
    user_id: userId,
    project_id: projectId,
    agent_id: agentId,
    audit_mode: auditMode,
    description: String(body.description || '').slice(0, 800),
    files
  };
  const intentHash = makeIntentHash(base);
  const slug = slugify(projectId);
  const targetRoot = `VisionCoreProjects/${slug}-${missionId}`;
  return {
    id: `intent_${intentHash.slice(0, 16)}`,
    user_id: userId,
    project_id: projectId,
    mission_id: missionId,
    agent_id: agentId,
    target_root: targetRoot,
    target_path: targetRoot,
    intent_hash: intentHash,
    files,
    audit_mode: auditMode,
    created_at: now,
    status: 'intent_created',
    writes_disk: true,
    real_execution_allowed: true,
    deploy_allowed: false,
    committed: false
  };
}

// §157-SF: unico ponto real deste gate que pode genuinamente reprovar algo —
// deploy/merge/tag/stable/pass_gold/real_evidence/file_changed continuam
// false porque, nesta fase (intent pre-execucao, antes do Agent Local
// escrever qualquer coisa), nao existe ainda deploy/merge/evidencia real/
// diff — false ali e o valor HONESTO, nao um rubber-stamp disfarcado. O gap
// real e diferente: nada nunca examinava o CONTEUDO dos arquivos em si.
// Heuristica deliberadamente simples (regex): sobe a barra pra payload
// descuidado/ingenuo (LLM alucinando uma API key real, tutorial colado com
// curl|sh) — NAO e defesa contra um payload adversarial deliberadamente
// ofuscado pra escapar de string-matching (base64, concatenacao, etc.).
// Ver auto-revisao em docs/CURRENT_STATE.md.
const SF_SECRET_PATTERNS = [
  /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /AKIA[0-9A-Z]{16}/, // AWS access key id
  /(api[_-]?key|secret|token)\s*[:=]\s*['"][A-Za-z0-9_\-]{16,}['"]/i,
  /password\s*[:=]\s*['"][^'"]{6,}['"]/i
];
const SF_DANGEROUS_PATTERNS = [
  /rm\s+-rf\s+\/\s*($|["'\n])/, // rm -rf / (wipe de raiz, nao um path relativo comum)
  /(curl|wget)[^\n]{0,80}\|\s*(sh|bash)\b/i // padrao classico de pipe-to-shell
];

function scanFileContentRisk(files) {
  const secretFiles = [];
  const dangerousFiles = [];
  for (const f of files) {
    const content = String((f && f.content) || '');
    if (SF_SECRET_PATTERNS.some((p) => p.test(content))) secretFiles.push(f.name);
    if (SF_DANGEROUS_PATTERNS.some((p) => p.test(content))) dangerousFiles.push(f.name);
  }
  return {
    ok: secretFiles.length === 0 && dangerousFiles.length === 0,
    secretFiles,
    dangerousFiles
  };
}

function buildAuditClaims(intent) {
  const contentRisk = scanFileContentRisk(intent.files);
  return {
    sf_create_project: true,
    files_planned: intent.files.length,
    deploy: false,
    merge: false,
    tag: false,
    stable: false,
    pass_gold: false,
    real_evidence: false,
    file_changed: false,
    contains_hardcoded_secret: contentRisk.secretFiles.length > 0,
    contains_dangerous_command: contentRisk.dangerousFiles.length > 0
  };
}

function buildAuditEvidence(intent) {
  return {
    intent_hash: intent.intent_hash,
    target_root: intent.target_root,
    deploy_allowed: false,
    write_scope: 'dedicated_new_project_folder',
    files_planned: intent.files.map(f => f.name),
    content_risk: scanFileContentRisk(intent.files)
  };
}


function findSfIntentByMission(intentMap, missionId) {
  for (const intent of intentMap.values()) {
    if (intent.mission_id === missionId) return intent;
  }
  return null;
}

function markStaleSfIntents(intentMap, { nowMs = Date.now(), timeoutMs = 10 * 60 * 1000 } = {}) {
  const stale = [];
  for (const intent of intentMap.values()) {
    if (intent.status === 'queued' || intent.status === 'in_progress') {
      const started = intent.queued_at_ms || intent.created_at_ms || 0;
      if (started && nowMs - started > timeoutMs) {
        intent.status = 'timeout_cleanup_required';
        intent.receipt = Object.assign({}, intent.receipt || {}, {
          outcome: 'timeout_cleanup_required',
          reason: 'agent_timeout_before_result',
          rollback_performed: false,
          cleanup_required: true
        });
        stale.push(intent);
      }
    }
  }
  return stale;
}

function canRetrySfIntent(intent) {
  return !!intent && intent.status === 'timeout_cleanup_required';
}

function prepareSfIntentRetry(intent, previousIntent) {
  if (!canRetrySfIntent(previousIntent)) return intent;
  return Object.assign(intent, {
    retry_of: previousIntent.mission_id,
    previous_status: previousIntent.status,
    target_root: previousIntent.target_root,
    target_path: previousIntent.target_path || previousIntent.target_root
  });
}
function publicIntent(intent) {
  return {
    id: intent.id,
    mission_id: intent.mission_id,
    project_id: intent.project_id,
    agent_id: intent.agent_id,
    target_root: intent.target_root,
    target_path: intent.target_path,
    intent_hash: intent.intent_hash,
    audit_mode: intent.audit_mode,
    status: intent.status,
    retry_of: intent.retry_of || null,
    created_at: intent.created_at,
    file_count: intent.files.length,
    deploy_allowed: false,
    committed: false
  };
}

module.exports = {
  isSfRealExecutionEnabled,
  isSfRealExecutionAgentAllowed,
  normalizeAuditMode,
  safeRelativeFileName,
  normalizeSfFiles,
  createSfExecutionIntent,
  scanFileContentRisk,
  buildAuditClaims,
  buildAuditEvidence,
  publicIntent,
  findSfIntentByMission,
  markStaleSfIntents,
  canRetrySfIntent,
  prepareSfIntentRetry
};
