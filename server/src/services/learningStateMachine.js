'use strict';

/**
 * VISION CORE v1.7 — Learning State Machine
 *
 * Controla transições válidas de estado no ciclo de aprendizado.
 * Qualquer tentativa de transição inválida é bloqueada com log.
 *
 * PROMOTION_STATES está definido aqui (fonte da verdade) para evitar
 * dependência circular com validatedLearningService.
 */

// Fonte da verdade dos estados — importado por validatedLearningService
const PROMOTION_STATES = {
  SUBMITTED:           'submitted',
  SANITIZED:           'sanitized',
  REPRODUCED:          'reproduced',
  BENCHMARK_CANDIDATE: 'benchmark_candidate',
  AEGIS_VALIDATED:     'aegis_validated',
  PASS_GOLD:           'pass_gold',
  PROMOTED:            'promoted',
  REGRESSION_GUARDED:  'regression_guarded',
  BLOCKED:             'blocked',
};

// ── Transições permitidas ────────────────────────────────────────────────
const TRANSITIONS = {
  [PROMOTION_STATES.SUBMITTED]:           [PROMOTION_STATES.SANITIZED,           PROMOTION_STATES.BLOCKED],
  [PROMOTION_STATES.SANITIZED]:           [PROMOTION_STATES.REPRODUCED,          PROMOTION_STATES.BLOCKED],
  [PROMOTION_STATES.REPRODUCED]:          [PROMOTION_STATES.BENCHMARK_CANDIDATE, PROMOTION_STATES.BLOCKED],
  [PROMOTION_STATES.BENCHMARK_CANDIDATE]: [PROMOTION_STATES.AEGIS_VALIDATED,     PROMOTION_STATES.BLOCKED],
  [PROMOTION_STATES.AEGIS_VALIDATED]:     [PROMOTION_STATES.PASS_GOLD,           PROMOTION_STATES.BLOCKED],
  [PROMOTION_STATES.PASS_GOLD]:           [PROMOTION_STATES.PROMOTED,            PROMOTION_STATES.BLOCKED],
  [PROMOTION_STATES.PROMOTED]:            [PROMOTION_STATES.REGRESSION_GUARDED,  PROMOTION_STATES.BLOCKED],
  [PROMOTION_STATES.REGRESSION_GUARDED]:  [],   // terminal de sucesso
  [PROMOTION_STATES.BLOCKED]:             [],   // terminal de falha
};

// ── Verificar transição ───────────────────────────────────────────────────
function canTransition(from, to) {
  const allowed = TRANSITIONS[from] || [];
  return allowed.includes(to);
}

// ── Transição segura ──────────────────────────────────────────────────────
function transition(entry, newState, meta = {}) {
  if (!canTransition(entry.state, newState)) {
    const msg = `Transição inválida: ${entry.state} → ${newState}`;
    console.error(`[STATE_MACHINE] ⛔ ${msg}`);
    return {
      ok:    false,
      error: msg,
      entry,
      blocked: newState === PROMOTION_STATES.BLOCKED,
    };
  }

  entry.state = newState;
  entry.history = entry.history || [];
  entry.history.push({ state: newState, at: new Date().toISOString(), ...meta });
  console.log(`[STATE_MACHINE] ✔ ${entry.feedbackId || '?'}: → ${newState}`);
  return { ok: true, entry };
}

// ── Verificar se está em estado terminal ──────────────────────────────────
function isTerminal(state) {
  return TRANSITIONS[state]?.length === 0;
}

// ── Verificar se foi promovido com sucesso ────────────────────────────────
function isSuccessful(entry) {
  return entry.state === PROMOTION_STATES.REGRESSION_GUARDED;
}

// ── Obter próximo estado esperado ─────────────────────────────────────────
function nextExpected(state) {
  const allowed = TRANSITIONS[state] || [];
  return allowed.filter(s => s !== PROMOTION_STATES.BLOCKED)[0] || null;
}

// ── Diagrama de estados (para logging/debug) ──────────────────────────────
function diagram() {
  return Object.entries(TRANSITIONS)
    .map(([from, tos]) => `${from} → [${tos.join(', ')}]`)
    .join('\n');
}

module.exports = { canTransition, transition, isTerminal, isSuccessful, nextExpected, diagram, TRANSITIONS, PROMOTION_STATES };
