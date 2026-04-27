'use strict';

/**
 * VISION CORE — OpenSquad Reserve
 *
 * Agentes de reserva acionados por escalação.
 * REGRA FUNDAMENTAL: não aplicam patches diretamente.
 * Fornecem apenas:
 *   - extra scan hints para o FileScanner
 *   - risk review para o Aegis
 *   - validation suggestions para o Validator
 *   - target recommendations para o Scanner
 *   - escalation reason estruturada
 *
 * O PASS GOLD continua sendo a única porta de aprovação.
 */

const RESERVE_AGENTS = {
  locator: {
    key:  'locator',
    name: 'Reserve Locator',
    role: 'Localizar arquivo alvo quando scanner falhar',
    canPatch: false,
    provides: ['extra_scan_hints', 'target_recommendations'],
    // Hints específicos para encontrar arquivo quando scanner não achou
    generateHints(errorInput, missionPlan) {
      const lower = errorInput.toLowerCase();
      const hints  = [];

      // Por tipo de erro, sugerir onde procurar
      if (/multer|req\.file|mimetype/i.test(lower)) {
        hints.push('route', 'router', 'upload', 'file', 'media', 'vision', 'image', 'attachment');
      }
      if (/cors/i.test(lower)) {
        hints.push('middleware', 'app.js', 'server.js', 'cors', 'config', 'index.js');
      }
      if (/auth|jwt|token|401|403/i.test(lower)) {
        hints.push('auth', 'middleware', 'guard', 'token', 'passport', 'strategy');
      }
      if (/database|mongo|sql|connection/i.test(lower)) {
        hints.push('db', 'database', 'model', 'schema', 'connect', 'repository');
      }
      if (/port|listen|eaddrinuse/i.test(lower)) {
        hints.push('server', 'listen', 'app', 'index', 'main', 'start');
      }

      // Adicionar nomes de arquivo do stack trace
      const stackFiles = (errorInput.match(/at\s+\S+\s+\(([^:)]+):\d+/g) || [])
        .map(m => m.match(/\(([^:)]+):/)?.[1])
        .filter(Boolean)
        .map(f => f.split(/[/\\]/).pop()?.replace(/\.[jt]s$/, ''))
        .filter(f => f && f.length > 2);

      hints.push(...stackFiles);
      return [...new Set(hints)].slice(0, 12);
    },
  },

  security: {
    key:  'security',
    name: 'Reserve Security',
    role: 'Revisar patches de alto risco e autenticação',
    canPatch: false,
    provides: ['risk_review', 'security_notes'],
    review(patches, aegisResult) {
      const notes = [];

      // Verificar padrões de alto risco nos patches
      const dangerPatterns = [
        { re: /eval\s*\(/i,              note: 'eval() detectado no replace' },
        { re: /exec\s*\(\s*['"`]/i,      note: 'exec() detectado' },
        { re: /child_process/i,          note: 'child_process no replace' },
        { re: /skipAuth|bypassAuth/i,    note: 'bypass de auth detectado' },
        { re: /password\s*=\s*['"]/i,    note: 'senha hardcoded detectada' },
      ];

      for (const p of (patches || [])) {
        const text = (p.replace || '') + (p.find || '');
        for (const dp of dangerPatterns) {
          if (dp.re.test(text)) notes.push(`[patch ${p.order || '?'}] ${dp.note}`);
        }
      }

      // Analisar issues do Aegis
      const highIssues = (aegisResult?.issues || []).filter(i => i.severity === 'high');
      for (const i of highIssues) {
        notes.push(`Aegis HIGH: ${i.rule} — ${i.msg}`);
      }

      return {
        agent:          'security',
        risk_approved:  notes.length === 0,
        notes,
        recommendation: notes.length > 0
          ? 'BLOCK — patches contêm padrões de alto risco'
          : 'OK — nenhum padrão crítico detectado',
      };
    },
  },

  backend: {
    key:  'backend',
    name: 'Reserve Backend',
    role: 'Revisar lógica de servidor e rotas',
    canPatch: false,
    provides: ['validation_suggestions', 'extra_scan_hints'],
    suggest(errorInput, rca) {
      const suggestions = [];
      const lower = errorInput.toLowerCase();

      if (/async|promise|await/i.test(lower) && rca?.patches?.length) {
        suggestions.push('Verificar se handlers async têm try/catch adequado');
      }
      if (/middleware/i.test(lower)) {
        suggestions.push('Verificar ordem dos middlewares no Express');
      }
      if (/route|endpoint/i.test(lower)) {
        suggestions.push('Verificar se a rota está registrada antes de ser chamada');
      }

      return {
        agent: 'backend',
        suggestions,
        extra_hints: ['middleware', 'router', 'handler', 'async', 'error'],
      };
    },
  },

  validator: {
    key:  'validator',
    name: 'Reserve Validator',
    role: 'Reforçar validação de sintaxe e testes',
    canPatch: false,
    provides: ['validation_suggestions'],
    suggest(patchResult, validation) {
      const suggestions = [];

      if (!validation?.ok) {
        const failedFiles = (validation?.files || []).filter(f => !f.ok);
        for (const f of failedFiles) {
          suggestions.push(`Sintaxe inválida em ${f.file}: ${(f.error || '').slice(0, 100)}`);
        }
      }

      if (!validation?.tests?.ok && validation?.tests !== null) {
        suggestions.push('Testes falharam — verificar mock e imports');
      }

      if ((patchResult?.applied || 0) === 0) {
        suggestions.push('Nenhum patch aplicado — revisar find/replace');
      }

      return {
        agent: 'validator',
        suggestions,
        recommendation: suggestions.length === 0 ? 'OK' : 'REVIEW_REQUIRED',
      };
    },
  },

  architect: {
    key:  'architect',
    name: 'Reserve Architect',
    role: 'Revisar impacto arquitetural de mudanças grandes',
    canPatch: false,
    provides: ['escalation_reason', 'target_recommendations'],
    review(missionPlan, rca) {
      return {
        agent: 'architect',
        impact_assessment: {
          layers_affected:  missionPlan?.layers || [],
          agents_involved:  missionPlan?.agentNames || [],
          targets:          missionPlan?.approvedTargets || [],
          root_cause_known: !!(rca?.cause) && rca.confidence >= 60,
        },
        recommendation: (rca?.confidence || 0) < 60
          ? 'HUMAN_REVIEW — confiança insuficiente para mudança arquitetural'
          : 'PROCEED_WITH_CAUTION — revisar targets e impacto',
      };
    },
  },

  memory: {
    key:  'memory',
    name: 'Reserve Memory',
    role: 'Consultar histórico de missões similares',
    canPatch: false,
    provides: ['extra_scan_hints', 'target_recommendations'],
    recall(category, signals) {
      try {
        const mem = require('./hermesMemory');
        const relevant = mem.findRelevantMemory({ category, signals });
        const hints = mem.extractOpenClawHints(category);
        return {
          agent:          'memory',
          validated_count: relevant.validated.length,
          failure_count:   relevant.failures.length,
          extra_hints:     hints.extraScanHints,
          preferred_agents: hints.preferredAgents,
          preferred_targets: hints.preferredTargets,
        };
      } catch { return { agent: 'memory', validated_count: 0, failure_count: 0, extra_hints: [] }; }
    },
  },
};

// ── Ativar agentes de reserva ─────────────────────────────────────────────
function activate(agentKeys, ctx) {
  const {
    errorInput, missionPlan, rca, patchResult,
    validation, aegisResult, scanResult,
  } = ctx;

  const results   = {};
  const extraHints = new Set();

  for (const key of agentKeys) {
    const agent = RESERVE_AGENTS[key];
    if (!agent) continue;

    console.log(`[OPENSQUAD] ▶ ${agent.name} acionado`);

    try {
      if (key === 'locator') {
        const r = agent.generateHints(errorInput || '', missionPlan);
        results.locator = { agent: key, extra_scan_hints: r };
        r.forEach(h => extraHints.add(h));

      } else if (key === 'security') {
        results.security = agent.review(rca?.patches, aegisResult);

      } else if (key === 'backend') {
        const r = agent.suggest(errorInput || '', rca);
        results.backend = r;
        (r.extra_hints || []).forEach(h => extraHints.add(h));

      } else if (key === 'validator') {
        results.validator = agent.suggest(patchResult, validation);

      } else if (key === 'architect') {
        results.architect = agent.review(missionPlan, rca);

      } else if (key === 'memory') {
        const r = agent.recall(missionPlan?.category, missionPlan?.scanHints || []);
        results.memory = r;
        (r.extra_hints || []).forEach(h => extraHints.add(h));
      }
    } catch (e) {
      console.warn(`[OPENSQUAD] ✗ ${key}: ${e.message}`);
      results[key] = { agent: key, error: e.message };
    }
  }

  const summary = {
    activated:    true,
    agentsUsed:   agentKeys,
    extraHints:   [...extraHints].slice(0, 15),
    results,
    // Consolidar recomendação final
    recommendation: buildRecommendation(results, agentKeys),
  };

  console.log(`[OPENSQUAD] ✔ ${agentKeys.length} agente(s) | +${summary.extraHints.length} hints`);
  return summary;
}

// ── Consolidar recomendação dos agentes de reserva ────────────────────────
function buildRecommendation(results, agentKeys) {
  const recs = Object.values(results)
    .map(r => r.recommendation || r.notes?.join('; '))
    .filter(Boolean);

  if (recs.some(r => /BLOCK|HUMAN_REVIEW/i.test(r))) {
    return 'BLOCK — agentes de reserva recomendam bloqueio ou revisão humana';
  }
  if (recs.some(r => /REVIEW_REQUIRED|CAUTION/i.test(r))) {
    return 'REVIEW_REQUIRED — revisar antes de aplicar';
  }
  return 'PROCEED — agentes de reserva não encontraram problemas adicionais';
}

// ── Gerar relatório público (sem secrets) ─────────────────────────────────
function generateReport(missionId, escalation, opensquad, metrics) {
  return {
    mission_id:       missionId,
    generated_at:     new Date().toISOString(),
    escalation_level: escalation?.level,
    escalation_reasons: (escalation?.reasons || []).map(r => ({
      rule:   r.rule,
      reason: r.reason,
    })),
    opensquad_activated: !!(opensquad?.activated),
    opensquad_agents:    opensquad?.agentsUsed || [],
    opensquad_extra_hints: opensquad?.extraHints?.length || 0,
    recommendation:    opensquad?.recommendation || 'N/A',
    metrics_summary: {
      complexity:        metrics?.input_complexity_score,
      targets:           metrics?.target_count,
      confidence:        metrics?.hermes_confidence,
      patches:           metrics?.patch_count,
      pass_gold:         metrics?.pass_gold,
      escalation_level:  metrics?.escalation_level,
      tokens_estimated:  metrics?.tokens_estimated,
    },
    // PASS GOLD é quem aprova — escalação só recomenda
    pass_gold_rule: 'Only PASS GOLD validation can approve. Escalation recommends only.',
  };
}

module.exports = { activate, generateReport, RESERVE_AGENTS };
