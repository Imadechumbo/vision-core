'use strict';

/**
 * §47 — PASS GOLD Engine Multidimensional
 *
 * Ref: SDDF_SPEC.md § PIPELINE CANÔNICO — Lei Arquitetural
 * Restaurado da V2.2.2 com adaptação para V3.0.0 (sem SQLite).
 *
 * Calcula score 0-100 em 6 dimensões ponderadas.
 * Emite GOLD / SILVER / NEEDS_REVIEW.
 * Nunca retorna pass_gold=true sem todos os gates obrigatórios.
 */

/* ── Pesos imutáveis (V2.2.2 — não alterar sem referenciar a spec) ── */
const WEIGHTS = {
  llm_confidence:    0.30,
  patch_specificity: 0.20,
  risk_level:        0.15,
  data_quality:      0.15,
  build_passed:      0.10,
  snapshot_exists:   0.10
};

/* ── Thresholds ────────────────────────────────────────────────────── */
const THRESHOLD_GOLD   = 80;
const THRESHOLD_SILVER = 60;

/**
 * evaluate(input) → PassGoldResult
 *
 * @param {object} input
 * @param {number}  input.confidence        — LLM confidence 0-100 (from hermesObj.confidence*100 or direct)
 * @param {string}  input.risk              — 'low' | 'medium' | 'high' (default 'medium')
 * @param {boolean} input.aegis_ok          — syntactically valid (AEGIS gate)
 * @param {string}  input.original_content  — original file content (for snapshot gate)
 * @param {string}  input.patched_content   — patched file content
 * @param {object}  [input.patch]           — { search, replace } or string (for specificity)
 * @param {string}  [input.fix_type]        — 'code_patch' | 'full_replace' | 'json_field'
 * @param {number}  [input.original_lines]  — line count of original (for data_quality)
 * @param {string}  [input.diagnosis]       — diagnosis string (for data_quality signal)
 */
function evaluate(input) {
  const {
    confidence      = 0,
    risk            = 'medium',
    aegis_ok        = false,
    original_content = null,
    patched_content = null,
    patch           = null,
    fix_type        = 'code_patch',
    original_lines  = 0,
    diagnosis       = ''
  } = input || {};

  /* ── Compute raw dimension scores (0-100) ─────────────────────── */

  // 1. llm_confidence — LLM reported confidence (0-100)
  const d_llm = Math.min(100, Math.max(0, Number(confidence) || 0));

  // 2. data_quality — was there real file content + meaningful diagnosis?
  let d_data = 0;
  if (original_content && original_content.length > 0) d_data += 50;
  if (original_lines > 10) d_data += 20;
  if (diagnosis && diagnosis.length > 10) d_data += 30;
  d_data = Math.min(100, d_data);

  // 3. patch_specificity — is patch well-formed and applied?
  let d_patch = 0;
  if (patched_content && original_content && patched_content !== original_content) {
    d_patch += 40; // content was actually changed
  }
  if (fix_type === 'code_patch' && patch && typeof patch === 'object') {
    const search  = (patch.search  || '').trim();
    const replace = (patch.replace || '');
    if (search.length > 0)  d_patch += 30; // has valid search string
    if (search.length < 200) d_patch += 30; // specific (not giant blob)
    else if (search.length < 500) d_patch += 15;
  } else if (fix_type === 'full_replace' && patched_content && patched_content.length > 0) {
    d_patch = 80; // full replace is valid if content exists
  } else if (fix_type === 'json_field') {
    d_patch = patch ? 90 : 30;
  }
  d_patch = Math.min(100, d_patch);

  // 4. risk_level — low=90 / medium=65 / high=30
  const riskMap = { low: 90, medium: 65, high: 30 };
  const d_risk  = riskMap[String(risk).toLowerCase()] !== undefined
    ? riskMap[String(risk).toLowerCase()]
    : 65;

  // 5. build_passed — aegis_ok + content actually changed
  const d_build = (aegis_ok && patched_content && patched_content !== original_content) ? 100 : 0;

  // 6. snapshot_exists — original content was in memory (not null/empty)
  const d_snapshot = (original_content && original_content.length > 0) ? 100 : 0;

  /* ── Weighted score ────────────────────────────────────────────── */
  const finalScore = Math.round(
    d_llm      * WEIGHTS.llm_confidence    +
    d_patch    * WEIGHTS.patch_specificity +
    d_risk     * WEIGHTS.risk_level        +
    d_data     * WEIGHTS.data_quality      +
    d_build    * WEIGHTS.build_passed      +
    d_snapshot * WEIGHTS.snapshot_exists
  );

  /* ── Gates obrigatórios para GOLD ─────────────────────────────── */
  const gate_build_passed    = aegis_ok === true;
  const gate_snapshot_exists = d_snapshot === 100;
  const gate_confidence_ok   = d_llm >= 60;
  const gate_risk_acceptable = String(risk).toLowerCase() !== 'high';

  const allGatesPassed = gate_build_passed && gate_snapshot_exists &&
                         gate_confidence_ok && gate_risk_acceptable;

  /* ── Level determination ──────────────────────────────────────── */
  let level, verdict, pass_gold;

  if (finalScore >= THRESHOLD_GOLD && allGatesPassed) {
    level     = 'GOLD';
    verdict   = 'PASS GOLD — patch certificado, todos os gates aprovados';
    pass_gold = true;
  } else if (finalScore >= THRESHOLD_SILVER) {
    level     = 'SILVER';
    verdict   = 'SILVER — score adequado mas revisão recomendada';
    pass_gold = false;
  } else {
    level     = 'NEEDS_REVIEW';
    verdict   = 'NEEDS_REVIEW — score insuficiente ou gate crítico falhou';
    pass_gold = false;
  }

  /* ── Log ─────────────────────────────────────────────────────── */
  console.log(
    `[PASS GOLD §47] score=${finalScore} level=${level} ` +
    `gates={build:${gate_build_passed} snap:${gate_snapshot_exists} ` +
    `conf:${gate_confidence_ok} risk:${gate_risk_acceptable}}`
  );

  return {
    final:     finalScore,
    level,
    verdict,
    pass_gold,
    aegis_ok,            // mantém compatibilidade V3.0.0
    gates: {
      build_passed:    gate_build_passed,
      snapshot_exists: gate_snapshot_exists,
      confidence_ok:   gate_confidence_ok,
      risk_acceptable: gate_risk_acceptable
    },
    dimensions: {
      llm_confidence:    Math.round(d_llm),
      data_quality:      Math.round(d_data),
      patch_specificity: Math.round(d_patch),
      risk_level:        Math.round(d_risk),
      build_passed:      Math.round(d_build),
      snapshot_exists:   Math.round(d_snapshot)
    }
  };
}

module.exports = { evaluate, WEIGHTS, THRESHOLD_GOLD, THRESHOLD_SILVER };
