'use strict';

/**
 * VISION CORE V2.3.4 — Hermes Learning Harness
 *
 * Stores safe operational learning after each finished mission and provides
 * compact, sanitized context for future Hermes RCA prompts.
 *
 * Golden rule:
 *   PASS GOLD teaches what to repeat.
 *   FAIL teaches what to avoid.
 *   AEGIS_BLOCK teaches what never to try.
 *   NEEDS_TARGET teaches how to improve targeting.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'hermes-memory.json');
const MAX_ENTRIES = Number(process.env.HERMES_MEMORY_MAX_ENTRIES || 50);

const EMPTY_MEMORY = Object.freeze({
  validated_memory: [],
  failure_memory: [],
  blocked_memory: [],
  target_miss_memory: [],
});

const SECRET_PATTERNS = [
  /api[_-]?key/i,
  /secret/i,
  /token/i,
  /password/i,
  /passwd/i,
  /authorization/i,
  /bearer\s+[a-z0-9._-]+/i,
  /\.env/i,
];

function cloneEmptyMemory() {
  return {
    validated_memory: [],
    failure_memory: [],
    blocked_memory: [],
    target_miss_memory: [],
  };
}

function ensureMemoryFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(cloneEmptyMemory(), null, 2));
  }
}

function normalizeMemory(memory) {
  const base = cloneEmptyMemory();
  if (!memory || typeof memory !== 'object') return base;
  for (const key of Object.keys(base)) {
    base[key] = Array.isArray(memory[key]) ? memory[key] : [];
  }
  return base;
}

function loadMemory() {
  try {
    ensureMemoryFile();
    return normalizeMemory(JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')));
  } catch (err) {
    console.warn('[HermesMemory] load failed:', err.message);
    return cloneEmptyMemory();
  }
}

function saveMemory(memory) {
  try {
    ensureMemoryFile();
    fs.writeFileSync(DATA_FILE, JSON.stringify(normalizeMemory(memory), null, 2));
    return true;
  } catch (err) {
    console.warn('[HermesMemory] save failed:', err.message);
    return false;
  }
}

function truncate(value, max = 240) {
  if (value === null || value === undefined) return '';
  const text = String(value).replace(/\s+/g, ' ').trim();
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

function isSensitiveText(value) {
  const text = String(value || '');
  return SECRET_PATTERNS.some(re => re.test(text));
}

function sanitizeText(value, max = 240) {
  const text = truncate(value, max);
  if (!text) return '';
  return isSensitiveText(text) ? '[redacted]' : text;
}

function safeFileName(file) {
  if (!file || typeof file !== 'string') return null;
  const normalized = file.replace(/\\/g, '/').replace(/^\/+/, '');
  if (isSensitiveText(normalized)) return '[redacted]';
  if (normalized.includes('..')) return '[invalid-path]';
  return truncate(normalized, 160);
}

function safeArray(values, maxItems = 12) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map(v => sanitizeText(v, 80)).filter(Boolean))].slice(0, maxItems);
}

function safeTargetsMap(agentTargets) {
  const out = {};
  if (!agentTargets || typeof agentTargets !== 'object') return out;
  for (const [agent, file] of Object.entries(agentTargets)) {
    const key = sanitizeText(agent, 50);
    const value = safeFileName(file);
    if (key && value) out[key] = value;
  }
  return out;
}

function safeTargetsArray(targets) {
  if (!Array.isArray(targets)) return [];
  return [...new Set(targets.map(safeFileName).filter(Boolean))].slice(0, 20);
}

function patchSummary(patches) {
  if (!Array.isArray(patches) || !patches.length) return 'no patches';
  return patches.slice(0, 8).map((p, idx) => {
    const file = safeFileName(p.file) || 'unknown';
    const agent = sanitizeText(p.agentKey || 'unknown', 50);
    const desc = sanitizeText(p.description || p.reason || `patch ${idx + 1}`, 100);
    return `${file} [${agent}] — ${desc}`;
  }).join(' | ');
}

function safeAegisIssues(aegisResult) {
  const issues = Array.isArray(aegisResult?.issues) ? aegisResult.issues : [];
  return issues.slice(0, 10).map(issue => ({
    rule: sanitizeText(issue.rule || issue.issue || issue.code || 'unknown', 80),
    severity: sanitizeText(issue.severity || 'unknown', 30),
    file: safeFileName(issue.file || issue.patchFile || '') || null,
    message: sanitizeText(issue.message || issue.msg || issue.reason || '', 160),
  }));
}

function classifyStatus(finalStatus, gold) {
  if (gold?.pass_gold || finalStatus === 'PASS_GOLD' || finalStatus === 'success') return 'PASS_GOLD';
  if (finalStatus === 'aegis_blocked') return 'aegis_blocked';
  if (finalStatus === 'needs_target') return 'needs_target';
  if (['validation_failed', 'patch_failed', 'requires_review', 'no_patch', 'failed'].includes(finalStatus)) {
    return 'validation_failed';
  }
  return null;
}

function memoryKeyForStatus(status) {
  switch (status) {
    case 'PASS_GOLD': return 'validated_memory';
    case 'validation_failed': return 'failure_memory';
    case 'aegis_blocked': return 'blocked_memory';
    case 'needs_target': return 'target_miss_memory';
    default: return null;
  }
}

function collectSignals(input, missionPlan = {}, scanResult = {}, rcaResult = {}) {
  const signals = [];
  signals.push(...safeArray(missionPlan.signals || [], 20));
  signals.push(...safeArray(missionPlan.scanHints || [], 20));
  signals.push(...safeArray(scanResult.matched || [], 20));
  const text = `${input || ''} ${rcaResult.cause || ''} ${rcaResult.fix || ''}`.toLowerCase();
  for (const sig of ['multer', 'req.file', 'mimetype', 'cors', 'helmet', 'express', 'router', 'upload', 'vision', 'eaddrinuse', 'module', 'syntax']) {
    if (text.includes(sig)) signals.push(sig);
  }
  return [...new Set(signals.map(v => sanitizeText(v, 80)).filter(Boolean))].slice(0, 24);
}

function recordMission(result = {}) {
  try {
    const finalStatus = classifyStatus(result.finalStatus, result.gold);
    const memoryKey = memoryKeyForStatus(finalStatus);
    if (!memoryKey) return { ok: false, skipped: true, reason: `status_not_learnable:${result.finalStatus}` };

    const missionPlan = result.missionPlan || {};
    const scanResult = result.scanResult || {};
    const rcaResult = result.rcaResult || result.rca || {};
    const aegisResult = result.aegisResult || result.aegis || {};

    const record = {
      id: `hm_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      timestamp: new Date().toISOString(),
      input: sanitizeText(result.input || result.missionInput || '', 240),
      category: sanitizeText(missionPlan.category || scanResult.category || 'unknown', 80),
      signals: collectSignals(result.input || result.missionInput, missionPlan, scanResult, rcaResult),
      agentTargets: safeTargetsMap(missionPlan.agentTargets || scanResult.agentTargets),
      approvedTargets: safeTargetsArray(missionPlan.approvedTargets || scanResult.approvedTargets),
      rootCause: sanitizeText(rcaResult.cause || rcaResult.rootCause || '', 240),
      fix: sanitizeText(rcaResult.fix || '', 240),
      patchSummary: patchSummary(rcaResult.patches),
      status: finalStatus,
      finalStatus: sanitizeText(result.finalStatus || '', 60),
      aegisRisk: sanitizeText(aegisResult.risk || '', 30),
      aegisScore: Number(aegisResult.score || 0),
      aegisIssues: safeAegisIssues(aegisResult),
      validationOk: !!(result.validation?.ok || result.gold?.pass_gold),
      confidence: Number(rcaResult.confidence || 0),
    };

    if (!record.input && !record.category) return { ok: false, skipped: true, reason: 'empty_record' };

    const memory = loadMemory();
    memory[memoryKey].push(record);
    if (memory[memoryKey].length > MAX_ENTRIES) {
      memory[memoryKey] = memory[memoryKey].slice(-MAX_ENTRIES);
    }
    saveMemory(memory);
    return { ok: true, memoryKey, id: record.id };
  } catch (err) {
    console.warn('[HermesMemory] record failed:', err.message);
    return { ok: false, error: err.message };
  }
}

function similarity(entry, category, signals = []) {
  let score = 0;
  if (category && entry.category === category) score += 10;
  const wanted = new Set((signals || []).map(s => String(s).toLowerCase()));
  for (const sig of entry.signals || []) {
    if (wanted.has(String(sig).toLowerCase())) score += 3;
  }
  return score;
}

function findRelevantMemory({ category, signals } = {}) {
  const memory = loadMemory();
  const pick = (arr) => (arr || [])
    .map(entry => ({ entry, score: similarity(entry, category, signals) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(x => x.entry);

  return {
    validated: pick(memory.validated_memory),
    failed: pick(memory.failure_memory),
    blocked: pick(memory.blocked_memory),
    target_miss: pick(memory.target_miss_memory),
  };
}

function countRelevant(memory = {}) {
  return ['validated', 'failed', 'blocked', 'target_miss']
    .reduce((acc, key) => acc + (Array.isArray(memory[key]) ? memory[key].length : 0), 0);
}

function formatEntry(entry) {
  const targets = (entry.approvedTargets || []).join(', ') || 'no target';
  const issues = (entry.aegisIssues || []).map(i => i.rule).filter(Boolean).join(', ');
  return `- ${entry.category} | target: ${targets} | root: ${entry.rootCause || 'n/a'} | patches: ${entry.patchSummary || 'n/a'}${issues ? ` | aegis: ${issues}` : ''}`;
}

function formatForPrompt(memory = {}) {
  if (!countRelevant(memory)) return '';
  const sections = [];
  if (memory.validated?.length) {
    sections.push('VALIDATED PATTERNS — prefer these only when the current code context matches:\n' + memory.validated.map(formatEntry).join('\n'));
  }
  if (memory.failed?.length) {
    sections.push('FAILED PATTERNS — avoid repeating these strategies unless the target context is different:\n' + memory.failed.map(formatEntry).join('\n'));
  }
  if (memory.blocked?.length) {
    sections.push('BLOCKED PATTERNS — never repeat these Aegis-blocked actions:\n' + memory.blocked.map(formatEntry).join('\n'));
  }
  if (memory.target_miss?.length) {
    sections.push('TARGET MISS PATTERNS — improve targeting and scan hints for similar inputs:\n' + memory.target_miss.map(formatEntry).join('\n'));
  }
  return `=== HERMES LEARNING MEMORY ===\n${sections.join('\n\n')}\n\nRules: PASS GOLD patterns may be reused. Failed patterns must be avoided. Blocked patterns must never be repeated. Target-miss patterns should improve file targeting.`;
}

function getStats() {
  const memory = loadMemory();
  return {
    validated: memory.validated_memory.length,
    failed: memory.failure_memory.length,
    blocked: memory.blocked_memory.length,
    target_miss: memory.target_miss_memory.length,
  };
}

// ── V1.5.1 Fix3: deduplicação ─────────────────────────────────────────────
function deduplicationKey(record) {
  const targets = [...(record.approvedTargets || [])].sort().join('|');
  return `${record.category}::${(record.rootCause || '').slice(0, 80)}::${targets}`;
}

function isDuplicate(bucket, record) {
  const key = deduplicationKey(record);
  return bucket.some(r => deduplicationKey(r) === key);
}

// ── V1.5.1 Fix2: uso mandatório — getMemoryInfluence ─────────────────────
const VALIDATED_REUSE_THRESHOLD = 5;
const BLOCKED_FORBID_THRESHOLD  = 3;

function getMemoryInfluence(relevantMemory) {
  const influence = { reuseStrategy: null, forbidPatterns: [], hasInfluence: false };

  const topValidated = (relevantMemory.validated || [])[0];
  if (topValidated?._score >= VALIDATED_REUSE_THRESHOLD) {
    influence.reuseStrategy = {
      rootCause:    topValidated.rootCause,
      patchSummary: topValidated.patchSummary,
      patchFiles:   topValidated.patchFiles  || [],
      agentKeys:    topValidated.agentKeys   || [],
      confidence:   topValidated.confidence,
      score:        topValidated._score,
    };
    influence.hasInfluence = true;
  }

  for (const b of (relevantMemory.blocked || [])) {
    if (b._score >= BLOCKED_FORBID_THRESHOLD) {
      influence.forbidPatterns.push({
        rootCause:   b.rootCause,
        aegisIssues: b.aegisIssues || [],
        score:       b._score,
      });
      influence.hasInfluence = true;
    }
  }

  return influence;
}

// ── V1.5.1 Fix6: extractOpenClawHints — expõe memória para o OpenClaw ────
function extractOpenClawHints(category) {
  const mem = loadMemory();

  const validatedSignals = mem.validated_memory
    .filter(r => r.category === category)
    .flatMap(r => r.signals || []);

  const validatedTargets = mem.validated_memory
    .filter(r => r.category === category)
    .flatMap(r => r.approvedTargets || []);

  const validatedAgents = mem.validated_memory
    .filter(r => r.category === category)
    .flatMap(r => r.agentKeys || []);

  const missedSignals = mem.target_miss_memory
    .filter(r => r.category === category)
    .flatMap(r => r.signals || []);

  const extraScanHints = [...new Set(validatedSignals)]
    .filter(s => !missedSignals.includes(s))
    .slice(0, 8);

  const preferredTargets = [...new Set(validatedTargets)].slice(0, 5);
  const preferredAgents  = [...new Set(validatedAgents)].slice(0, 3);

  return { extraScanHints, preferredTargets, preferredAgents };
}

module.exports = {
  loadMemory,
  saveMemory,
  recordMission,
  findRelevantMemory,
  formatForPrompt,
  getMemoryInfluence,
  extractOpenClawHints,
  classifyStatus,
  isDuplicate,
  getStats,
};
