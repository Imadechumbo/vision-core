'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const HERMES_DATASET_SCHEMA_VERSION = 'hermes-ft-0.2';

function nowIso() {
  return new Date().toISOString();
}

function makeDatasetId(prefix = 'hds') {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
}

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function redactString(value) {
  let out = String(value || '');
  out = out.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED_EMAIL]');
  out = out.replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{12,}\b/gi, 'Bearer [REDACTED_SECRET]');
  out = out.replace(/\b(?:sk|ghp|github_pat|glpat|xox[baprs])-?[A-Za-z0-9_=-]{16,}\b/g, '[REDACTED_SECRET]');
  out = out.replace(/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g, '[REDACTED_AWS_KEY]');
  out = out.replace(/\b[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{16,}\b/g, '[REDACTED_JWT]');
  out = out.replace(/\b(api[_-]?key|token|secret|password|passwd|pwd|client_secret|authorization)\b\s*[:=]\s*["']?[^"'\s,;]+/gi, '$1=[REDACTED_SECRET]');
  return out.length > 12000 ? `${out.slice(0, 12000)}...[TRUNCATED]` : out;
}

function redactValue(value) {
  if (typeof value === 'string') return redactString(value);
  if (Array.isArray(value)) return value.map(redactValue);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, child] of Object.entries(value)) {
      out[key] = /api[_-]?key|token|secret|password|passwd|pwd|authorization/i.test(key)
        ? '[REDACTED_SECRET]'
        : redactValue(child);
    }
    return out;
  }
  return value;
}

function hashInput(input) {
  return crypto.createHash('sha256').update(JSON.stringify(input || null)).digest('hex').slice(0, 24);
}

function normalizeDecisionLabel(value, diagnosis) {
  const explicit = String(value || '').toUpperCase();
  if (['NEEDS_FIX', 'PASS', 'BLOCKED', 'ABORTED', 'ANSWERED'].includes(explicit)) return explicit;
  const text = String(diagnosis || '').toLowerCase();
  if (!text.trim()) return 'UNKNOWN';
  if (/blocked|bloquead|n[aã]o promove|sem pass gold|local_access_required/.test(text)) return 'BLOCKED';
  if (/fix|patch|corrigir|root cause|causa raiz|plano/.test(text)) return 'NEEDS_FIX';
  return 'ANSWERED';
}

function buildDatasetRecord({ id, timestamp, source, userId, missionId, input, context, decision, provider, model }) {
  const redactedInput = redactValue(input || {});
  const redactedContext = redactValue(context || {});
  const diagnosis = redactValue(decision && (decision.diagnosis || decision.raw || decision.answer || ''));
  return {
    schema_version: HERMES_DATASET_SCHEMA_VERSION,
    id,
    source: source || 'hermes-analyze',
    timestamp,
    user_id: userId || null,
    mission_id: missionId || id,
    provider: provider || 'local',
    model: model || 'hermes-local',
    input: redactedInput,
    input_hash: hashInput(redactedInput),
    context: redactedContext,
    decision: {
      label: normalizeDecisionLabel(decision && decision.label, diagnosis),
      diagnosis,
      recommended_fix: redactValue(decision && decision.recommended_fix ? decision.recommended_fix : null),
      raw: redactValue(decision && decision.raw ? decision.raw : diagnosis)
    },
    outcome: {
      status: 'pending',
      pass_gold: false,
      evidence: null,
      validated_at: null,
      source: null
    }
  };
}

function appendHermesDecisionPair(timelinePath, params) {
  const log = readJson(timelinePath, { entries: [] });
  const id = params.datasetId || makeDatasetId();
  const timestamp = params.timestamp || nowIso();
  const dataset = buildDatasetRecord({ ...params, id, timestamp });
  const entry = {
    id,
    user_id: params.userId || null,
    ts: timestamp,
    source: dataset.source,
    input: redactString(params.previewInput || JSON.stringify(dataset.input)).slice(0, 200),
    summary: redactString(dataset.decision.diagnosis).slice(0, 240),
    status: 'HERMES_PENDING_OUTCOME',
    pass_gold: false,
    agent: 'Hermes',
    mission_id: dataset.mission_id,
    dataset_only: true,
    hermes_dataset: dataset
  };
  log.entries = Array.isArray(log.entries) ? log.entries : [];
  log.entries.push(entry);
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
  log.entries = log.entries.filter(e => new Date(e.ts || 0).getTime() >= cutoff);
  if (log.entries.length > 500) log.entries = log.entries.slice(-500);
  writeJson(timelinePath, log);
  return entry;
}

function normalizeOutcome(payload) {
  const passGold = payload && payload.pass_gold === true;
  const failed = payload && (payload.ok === false || String(payload.status || '').toUpperCase() === 'FAIL');
  return {
    status: passGold ? 'success' : (failed ? 'failure' : 'pending'),
    pass_gold: passGold,
    evidence: redactValue(payload && (payload.evidence_receipt || payload.strict_pass_gold_reason || payload.message || payload.error || payload.status || null)),
    validated_at: nowIso(),
    source: 'run-live'
  };
}

function updateHermesOutcome(timelinePath, { userId, datasetId, missionId, input, payload }) {
  const outcome = normalizeOutcome(payload);
  if (outcome.status === 'pending') return { updated: false, reason: 'no_real_outcome' };

  const log = readJson(timelinePath, { entries: [] });
  const entries = Array.isArray(log.entries) ? log.entries : [];
  const redactedInput = input ? redactValue({ message: input }) : null;
  const inputHash = redactedInput ? hashInput(redactedInput) : null;

  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const ds = entries[i] && entries[i].hermes_dataset;
    if (!ds || !ds.outcome || ds.outcome.status !== 'pending') continue;
    if (userId && ds.user_id && ds.user_id !== userId) continue;
    const matches =
      (datasetId && (ds.id === datasetId || entries[i].id === datasetId)) ||
      (missionId && ds.mission_id === missionId) ||
      (inputHash && ds.input_hash === inputHash);
    if (!matches) continue;
    ds.outcome = outcome;
    entries[i].status = outcome.pass_gold ? 'PASS_GOLD' : 'FAIL';
    entries[i].pass_gold = outcome.pass_gold;
    entries[i].mission_id = missionId || entries[i].mission_id || ds.mission_id;
    writeJson(timelinePath, log);
    return { updated: true, id: entries[i].id, outcome };
  }

  return { updated: false, reason: 'matching_pending_dataset_not_found' };
}

function completeHermesExamples(entries) {
  return (entries || [])
    .map((entry) => entry && entry.hermes_dataset)
    .filter((ds) => ds && ds.input && ds.decision && ds.outcome)
    .filter((ds) => ['success', 'failure'].includes(ds.outcome.status));
}

module.exports = {
  HERMES_DATASET_SCHEMA_VERSION,
  redactString,
  redactValue,
  appendHermesDecisionPair,
  updateHermesOutcome,
  completeHermesExamples
};
