'use strict';

/**
 * VISION CORE — Module Guard (Anti-Chaos Responsibility Map)
 *
 * REGRA MESTRA: CADA MÓDULO DECIDE UMA COISA SÓ.
 * Se dois módulos decidem a mesma coisa → bug futuro garantido.
 *
 * Este módulo define e ENFORÇA os domínios de responsabilidade.
 * Violações são logadas como erros críticos e bloqueiam execução.
 */

// ── Mapa de responsabilidades ─────────────────────────────────────────────
const RESPONSIBILITY_MAP = {
  OpenClaw: {
    owns:       ['intent', 'category', 'agents', 'signals', 'tuning_read'],
    forbidden:  ['diagnosis', 'patch', 'memory_write'],
    description: 'Orquestração: interpreta input, classifica, define agentes e signals.',
  },
  Scanner: {
    owns:       ['file_location', 'technical_context', 'target_validation'],
    forbidden:  ['root_cause_inference', 'solution_suggestion'],
    description: 'Realidade do código: encontra arquivos reais e mapeia contexto técnico.',
  },
  Hermes: {
    owns:       ['root_cause', 'fix_strategy'],
    requires:   ['scanResult'],
    forbidden:  ['run_without_scan', 'memory_write_direct'],
    description: 'Diagnóstico: root cause e estratégia. Exige scanResult válido.',
  },
  PatchEngine: {
    owns:       ['file_modification', 'patch_application'],
    forbidden:  ['decide_what_to_fix'],  // isso é Hermes
    description: 'Execução: aplica correções nos arquivos. Não decide o que corrigir.',
  },
  Aegis: {
    owns:       ['risk_block', 'policy_validation'],
    rule:       'SEM AEGIS OK → NADA CONTINUA',
    description: 'Segurança: bloqueia risco e valida política.',
  },
  PassGold: {
    owns:       ['solution_approval'],
    rule:       'SEM PASS GOLD → nada promove, nada aprende',
    description: 'Validação final: única porta de aprovação.',
  },
  HermesMemory: {
    owns:       ['validated_storage'],
    requires:   ['pass_gold'],
    forbidden:  ['influence_decision_directly'],
    description: 'Aprendizado: armazena só resultados validados por PASS GOLD.',
  },
  BenchmarkOptimizer: {
    owns:       ['scan_hints_adjust', 'agent_weight_adjust'],
    forbidden:  ['alter_logic', 'alter_pass_gold', 'alter_aegis'],
    description: 'Auto-tuning: ajusta scanHints e pesos de agentes.',
  },
  TuningEngine: {
    owns:       ['tuning_apply_to_openclaw'],
    rule:       'tuning é reversível e não é verdade absoluta',
    description: 'Aplicação: aplica tuning no OpenClaw. Sempre reversível.',
  },
  SelfHealing: {
    owns:       ['failure_detection', 'auto_mission_queue'],
    forbidden:  ['direct_fix_without_pipeline'],
    description: 'Automação: detecta falhas e abre missão. Nunca corrige direto.',
  },
};

// ── Matriz anti-conflito ──────────────────────────────────────────────────
const ANTI_CONFLICT_MATRIX = {
  diagnosis:   'Hermes',
  targeting:   ['OpenClaw', 'Scanner'],
  correction:  'PatchEngine',
  validation:  ['Aegis', 'PassGold'],
  learning:    'HermesMemory',
  optimization:['BenchmarkOptimizer', 'TuningEngine'],
};

// ── Assertivas de responsabilidade ────────────────────────────────────────
function assertOwns(module, action, context = '') {
  const def = RESPONSIBILITY_MAP[module];
  if (!def) {
    console.warn(`[GUARD] ⚠ Módulo desconhecido: ${module}`);
    return;
  }
  if (def.forbidden?.includes(action)) {
    const msg = `[GUARD] 🔴 VIOLAÇÃO: ${module} tentou "${action}" — PROIBIDO | ${context}`;
    console.error(msg);
    throw new Error(msg);
  }
}

function assertRequires(module, provided = {}) {
  const def = RESPONSIBILITY_MAP[module];
  if (!def?.requires) return;
  for (const req of def.requires) {
    if (!provided[req]) {
      const msg = `[GUARD] 🔴 DEPENDÊNCIA FALTANDO: ${module} precisa de "${req}" | fornecido: ${JSON.stringify(Object.keys(provided))}`;
      console.error(msg);
      throw new Error(msg);
    }
  }
}

// ── Verificar se Hermes está rodando com scanResult válido ────────────────
function assertHermesCanRun(scanResult, enforceScanResult = true) {
  if (!enforceScanResult) return; // opt-out explícito
  if (!scanResult || scanResult.found !== true) {
    const msg = `[GUARD] 🔴 Hermes bloqueado: scanResult ausente ou found=false — RESPONSABILIDADE VIOLADA`;
    console.error(msg);
    throw new Error(msg);
  }
}

// ── Verificar se Aegis aprovou antes de avançar ───────────────────────────
function assertAegisOk(aegisResult) {
  if (!aegisResult || !aegisResult.ok) {
    const msg = `[GUARD] 🔴 NADA CONTINUA sem Aegis OK | verdict: ${aegisResult?.verdict || 'ausente'}`;
    console.error(msg);
    throw new Error(msg);
  }
}

// ── Verificar se PASS GOLD foi atingido antes de promover ─────────────────
function assertPassGold(goldResult) {
  if (!goldResult?.pass_gold) {
    const msg = `[GUARD] 🔴 PROMOÇÃO BLOQUEADA: PASS GOLD não atingido | score: ${goldResult?.final ?? '?'}/100`;
    console.error(msg);
    throw new Error(msg);
  }
}

// ── Verificar se BenchmarkOptimizer não está tocando em lógica proibida ──
function assertTuningIsSafe(plan) {
  if (!plan?.actions) return;
  for (const action of plan.actions) {
    const forbidden = ['alter_pass_gold', 'alter_aegis', 'alter_logic', 'bypass'];
    const actionStr = JSON.stringify(action).toLowerCase();
    for (const f of forbidden) {
      if (actionStr.includes(f)) {
        const msg = `[GUARD] 🔴 TUNING INSEGURO: ação "${action.type}" viola restrição "${f}"`;
        console.error(msg);
        throw new Error(msg);
      }
    }
  }
}

// ── Verificar se SelfHealing está usando o pipeline correto ──────────────
function assertSelfHealingUsedPipeline(ctx = {}) {
  if (ctx.directFix === true) {
    const msg = `[GUARD] 🔴 SelfHealing tentou corrigir diretamente sem pipeline — PROIBIDO`;
    console.error(msg);
    throw new Error(msg);
  }
}

// ── Logar estado do pipeline (para auditoria) ─────────────────────────────
function logPipelineState(stage, state = {}) {
  console.log(`[GUARD] ✔ ${stage}`, {
    hasTarget:    !!state.scanResult?.found,
    aegisOk:      !!state.aegisResult?.ok,
    passGold:     !!state.goldResult?.pass_gold,
    module:       state.module || '?',
  });
}

// ── Exportar mapa para o frontend (safe — sem lógica interna) ─────────────
function getResponsibilityMap() {
  return {
    modules:       RESPONSIBILITY_MAP,
    antiConflict:  ANTI_CONFLICT_MATRIX,
    rules: [
      'Diagnóstico → Hermes',
      'Targeting → OpenClaw + Scanner',
      'Correção → PatchEngine',
      'Validação → Aegis + PassGold',
      'Aprendizado → HermesMemory',
      'Otimização → BenchmarkOptimizer + TuningEngine',
      'Se cruzar → bug.',
    ],
  };
}

module.exports = {
  assertOwns,
  assertRequires,
  assertHermesCanRun,
  assertAegisOk,
  assertPassGold,
  assertTuningIsSafe,
  assertSelfHealingUsedPipeline,
  logPipelineState,
  getResponsibilityMap,
  RESPONSIBILITY_MAP,
  ANTI_CONFLICT_MATRIX,
};
