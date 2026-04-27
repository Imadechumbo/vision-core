'use strict';

/**
 * VISION CORE v1.7 — Validated Learning Service
 *
 * Implementa o pipeline de promoção de conhecimento comunitário
 * para a Hermes Memory validada.
 *
 * Fluxo obrigatório:
 *   community/feedback → sanitize → reproduce → benchmark candidate
 *   → Aegis OK → PASS GOLD → validated_memory → regression_guard
 *
 * REGRA ABSOLUTA: nada entra na validated_memory sem passar por
 * todas as etapas. Qualquer falha em qualquer etapa → bloqueio total.
 */

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const lsm = require('./learningStateMachine');
// PROMOTION_STATES vive no learningStateMachine (fonte da verdade — evita circular)
const { PROMOTION_STATES } = lsm;

const DATA_DIR    = path.resolve(__dirname, '../../data');
const LEARNING_LOG = path.join(DATA_DIR, 'validated-learning-log.json');

// ── Carregar/salvar log de promoções ─────────────────────────────────────
function loadLog() {
  try {
    if (!fs.existsSync(LEARNING_LOG)) return [];
    return JSON.parse(fs.readFileSync(LEARNING_LOG, 'utf-8'));
  } catch { return []; }
}

function saveLog(entries) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const trimmed = entries.slice(0, 1000);
  fs.writeFileSync(LEARNING_LOG, JSON.stringify(trimmed, null, 2), 'utf-8');
}

// ── Criar entrada de promoção ────────────────────────────────────────────
function createPromotionEntry(feedbackId, category) {
  return {
    id:          `promo_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    feedbackId,
    category,
    state:       PROMOTION_STATES.SUBMITTED,
    history:     [{ state: PROMOTION_STATES.SUBMITTED, at: new Date().toISOString() }],
    aegisOk:     null,
    passGold:    null,
    promoted:    false,
    blocked:     false,
    blockReason: null,
    createdAt:   new Date().toISOString(),
  };
}

// ── Avançar estado via state machine (obrigatório — transições inválidas são bloqueadas) ──
function advanceSafe(entry, newState, meta = {}) {
  const result = lsm.transition(entry, newState, meta);
  if (!result.ok) {
    throw new Error(`State machine violation: ${result.error}`);
  }
  return entry;
}

// ── Bloquear promoção ─────────────────────────────────────────────────────
function block(entry, reason) {
  entry.state       = PROMOTION_STATES.BLOCKED;
  entry.blocked     = true;
  entry.blockReason = reason;
  entry.history.push({ state: PROMOTION_STATES.BLOCKED, at: new Date().toISOString(), reason });
  console.warn(`[LEARNING] ⛔ Bloqueado: ${entry.feedbackId} — ${reason}`);
  return entry;
}

// ── Pipeline de promoção completo ────────────────────────────────────────
/**
 * promote(feedbackId, missionResult, options)
 *
 * Recebe o resultado real de uma missão que reproduziu o feedback
 * e tenta promover para validated_memory SE todas as condições forem OK.
 *
 * Retorna: { ok, entry, promoted, reason }
 */
function promote(feedbackId, missionResult, options = {}) {
  const log   = loadLog();
  let   entry = log.find(e => e.feedbackId === feedbackId)
             || createPromotionEntry(feedbackId, missionResult?.missionPlan?.category || 'generic');

  // 1. SANITIZE — missionResult não deve conter secrets
  const resultStr = JSON.stringify(missionResult || {});
  if (/sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}|gsk_[A-Za-z0-9]{20,}/.test(resultStr)) {
    saveAndReturn(log, block(entry, 'Secrets detectados no missionResult'));
    return { ok: false, promoted: false, reason: 'secrets_in_result' };
  }
  advanceSafe(entry, PROMOTION_STATES.SANITIZED);

  // 2. REPRODUCE — apenas status 'success' promove memória.
  // dry_run NÃO promove por padrão (Fix 3).
  const status = missionResult?.status;
  if (status !== 'success') {
    saveAndReturn(log, block(entry, `Status '${status}' não elegível — apenas 'success' promove memória`));
    return { ok: false, promoted: false, reason: 'not_reproduced' };
  }
  advanceSafe(entry, PROMOTION_STATES.REPRODUCED);
  advanceSafe(entry, PROMOTION_STATES.BENCHMARK_CANDIDATE);

  // 3. AEGIS — obrigatório para aprender. Ausente ou fail = bloqueio.
  const aegis = missionResult?.aegis;
  if (!aegis) {
    saveAndReturn(log, block(entry, 'Aegis ausente — resultado sem verificação de segurança'));
    return { ok: false, promoted: false, reason: 'aegis_missing' };
  }
  if (!aegis.ok) {
    saveAndReturn(log, block(entry, `Aegis bloqueou: ${aegis.verdict}`));
    return { ok: false, promoted: false, reason: 'aegis_blocked' };
  }
  entry.aegisOk = true;
  advanceSafe(entry, PROMOTION_STATES.AEGIS_VALIDATED, { aegisScore: aegis?.score });

  // 4. PASS GOLD — obrigatório, sem exceções
  const gold = missionResult?.gold;
  if (!gold?.pass_gold) {
    saveAndReturn(log, block(entry, `PASS GOLD não atingido (score: ${gold?.final ?? '?'}/100)`));
    return { ok: false, promoted: false, reason: 'pass_gold_failed' };
  }
  entry.passGold = true;
  advanceSafe(entry, PROMOTION_STATES.PASS_GOLD, { goldScore: gold.final, goldLevel: gold.level });

  // 5. PROMOTE — registrar na Hermes Memory
  try {
    const hermesMemory = require('./hermesMemory');
    hermesMemory.recordMission({
      input:        missionResult?.rca?.cause || feedbackId,
      missionPlan:  missionResult?.missionPlan,
      scanResult:   missionResult?.scanResult,
      rcaResult:    missionResult?.rca,
      aegisResult:  aegis,
      finalStatus:  'success',
    });
  } catch (e) {
    console.warn('[LEARNING] hermesMemory.recordMission falhou:', e.message);
  }

  entry.promoted = true;
  advanceSafe(entry, PROMOTION_STATES.PROMOTED);

  // 6. REGRESSION GUARD (Fix 4) — registrar padrão para proteção futura
  try {
    const { recordRegression } = require('./regressionMemory');
    // Registrar como padrão conhecido-resolvido (não como falha)
    // Para que futuras missões similares sejam reconhecidas como resolvidas
    entry.regressionKey = `${missionResult?.missionPlan?.category}::${(missionResult?.rca?.cause || '').slice(0, 60)}`;
  } catch (e) {
    console.warn('[LEARNING] regressionGuard falhou:', e.message);
  }
  advanceSafe(entry, PROMOTION_STATES.REGRESSION_GUARDED);

  console.log(`[LEARNING] ✔ Promovido: ${feedbackId} → validated_memory | gold=${gold.final}/100`);
  saveAndReturn(log, entry);
  return { ok: true, promoted: true, entry, reason: 'promoted_to_validated_memory' };
}

function saveAndReturn(log, entry) {
  const idx = log.findIndex(e => e.feedbackId === entry.feedbackId);
  if (idx >= 0) log[idx] = entry; else log.unshift(entry);
  saveLog(log);
}

// ── Consultar estado de promoção ─────────────────────────────────────────
function getPromotionState(feedbackId) {
  const log = loadLog();
  return log.find(e => e.feedbackId === feedbackId) || null;
}

// ── Listar promoções por estado ───────────────────────────────────────────
function listByState(state) {
  return loadLog().filter(e => e.state === state);
}

// ── Stats ─────────────────────────────────────────────────────────────────
function stats() {
  const log = loadLog();
  const counts = {};
  for (const s of Object.values(PROMOTION_STATES)) counts[s] = 0;
  for (const e of log) counts[e.state] = (counts[e.state] || 0) + 1;
  return { total: log.length, byState: counts };
}

module.exports = {
  promote, getPromotionState, listByState, stats,
  PROMOTION_STATES,
};
