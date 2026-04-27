'use strict';

/**
 * VISION CORE v1.7 — Regression Memory
 *
 * Registra padrões que já causaram falha e bloqueia promoções
 * de soluções que reincidem nesses padrões.
 *
 * Cada regressão bloqueia promoção futura de soluções similares
 * até que um novo PASS GOLD prove que o problema foi resolvido de verdade.
 *
 * Estrutura de um registro de regressão:
 * {
 *   id, category, rootCause (sanitized), patchFiles,
 *   failureReason, failureType (aegis_blocked|validation_failed|pass_gold_failed),
 *   blockedAt, unblockedAt, active
 * }
 */

const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');
const { sanitizeText } = require('./communityAnonymizer');

const DATA_DIR  = path.resolve(__dirname, '../../data');
const REG_FILE  = path.join(DATA_DIR, 'regression-memory.json');
const MAX_REGS  = 200;

// ── I/O ───────────────────────────────────────────────────────────────────
function load() {
  try {
    if (!fs.existsSync(REG_FILE)) return [];
    return JSON.parse(fs.readFileSync(REG_FILE, 'utf-8'));
  } catch { return []; }
}

function save(regs) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(REG_FILE, JSON.stringify(regs.slice(0, MAX_REGS), null, 2), 'utf-8');
}

// ── Registrar regressão ───────────────────────────────────────────────────
function recordRegression(missionResult, failureType) {
  const rca        = missionResult?.rca || {};
  const missionPlan = missionResult?.missionPlan || {};
  const patchFiles = (rca.patches || []).map(p => p.file).filter(Boolean);

  const entry = {
    id:            `reg_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    category:      missionPlan.category || 'generic',
    rootCause:     sanitizeText(rca.cause || '').clean.slice(0, 120),
    patchFiles,
    failureReason: sanitizeText(missionResult?.error || failureType || '').clean.slice(0, 200),
    failureType:   failureType || 'unknown',
    blockedAt:     new Date().toISOString(),
    unblockedAt:   null,
    active:        true,
  };

  const regs = load();
  regs.unshift(entry);
  save(regs);
  console.log(`[REGRESSION] ⛔ Registrado: ${entry.category} | ${entry.rootCause.slice(0, 60)}`);
  return entry;
}

// ── Verificar se uma missão regride um padrão registrado ─────────────────
function checkRegression(missionResult) {
  const regs     = load().filter(r => r.active);
  const rca      = missionResult?.rca || {};
  const plan     = missionResult?.missionPlan || {};
  const category = plan.category || 'generic';
  const cause    = sanitizeText(rca.cause || '').clean.toLowerCase();
  const files    = (rca.patches || []).map(p => p.file).filter(Boolean);

  const matches = regs.filter(r => {
    const catMatch   = r.category === category;
    const causeMatch = r.rootCause && cause.includes(r.rootCause.slice(0, 30).toLowerCase());
    const fileMatch  = r.patchFiles.some(f => files.includes(f));
    return catMatch && (causeMatch || fileMatch);
  });

  if (matches.length) {
    console.warn(`[REGRESSION] ⚠ Padrão de regressão detectado: ${matches.length} match(es)`);
  }

  return {
    hasRegression: matches.length > 0,
    matches: matches.map(r => ({
      id:          r.id,
      category:    r.category,
      rootCause:   r.rootCause,
      failureType: r.failureType,
      blockedAt:   r.blockedAt,
    })),
  };
}

// ── Desbloquear regressão após novo PASS GOLD ─────────────────────────────
function unblockRegression(regressionId, passGoldResult) {
  if (!passGoldResult?.pass_gold) {
    return { ok: false, error: 'PASS GOLD obrigatório para desbloquear regressão' };
  }

  const regs = load();
  const idx  = regs.findIndex(r => r.id === regressionId);
  if (idx < 0) return { ok: false, error: `Regressão ${regressionId} não encontrada` };

  regs[idx].active      = false;
  regs[idx].unblockedAt = new Date().toISOString();
  regs[idx].unblockGold = passGoldResult.final;
  save(regs);

  console.log(`[REGRESSION] ✔ Desbloqueado: ${regressionId} | gold=${passGoldResult.final}`);
  return { ok: true, entry: regs[idx] };
}

// ── Stats ─────────────────────────────────────────────────────────────────
function stats() {
  const regs = load();
  return {
    total:    regs.length,
    active:   regs.filter(r => r.active).length,
    resolved: regs.filter(r => !r.active).length,
    byCategory: regs.reduce((acc, r) => {
      acc[r.category] = (acc[r.category] || 0) + 1;
      return acc;
    }, {}),
  };
}

module.exports = { recordRegression, checkRegression, unblockRegression, stats };
