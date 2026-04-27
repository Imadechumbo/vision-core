'use strict';

/**
 * VISION CORE — OpenClaw Squad
 * Orquestrador de agentes técnicos especializados.
 * Reaproveitado do padrão de agentes do TechNetGame (hermesCouncilService),
 * mas com foco em repair técnico, não editorial.
 *
 * Ativa automaticamente quando:
 *   - missão toca múltiplas camadas (db + api + frontend)
 *   - confiança do Hermes < 60% em análise simples
 *   - projeto tem adapter com squads configurados
 */

const { analyzeError } = require('./hermesRca');

// ── Agentes técnicos do squad ─────────────────────────────────────────────
const SQUAD_AGENTS = {
  backend: {
    key: 'backend',
    name: 'Agente Backend',
    focus: 'Express, Node.js, rotas, middlewares, erros de servidor',
    keywords: ['server', 'route', 'middleware', 'express', 'api', 'endpoint', 'port', 'listen'],
  },
  database: {
    key: 'database',
    name: 'Agente Database',
    focus: 'SQL, queries, conexões, migrations, modelos de dados',
    keywords: ['db', 'database', 'query', 'sql', 'sqlite', 'mongo', 'connection', 'schema'],
  },
  auth: {
    key: 'auth',
    name: 'Agente Auth',
    focus: 'Autenticação, tokens, sessões, CORS, permissões',
    keywords: ['auth', 'token', 'jwt', 'session', 'cors', 'unauthorized', '401', '403'],
  },
  upload: {
    key: 'upload',
    name: 'Agente Upload/Media',
    focus: 'Multer, arquivos, mimetypes, storage, imagens',
    keywords: ['file', 'upload', 'multer', 'mimetype', 'buffer', 'storage', 'image'],
  },
  config: {
    key: 'config',
    name: 'Agente Config',
    focus: '.env, variáveis de ambiente, configurações, portas',
    keywords: ['env', 'config', 'port', 'host', 'environment', 'variable', 'process.env'],
  },
  network: {
    key: 'network',
    name: 'Agente Network',
    focus: 'Conexões externas, HTTP, timeouts, DNS, ECONNREFUSED',
    keywords: ['connection', 'econnrefused', 'timeout', 'network', 'http', 'fetch', 'axios'],
  },
};

// ── Detectar quais agentes são relevantes para o erro ────────────────────
function detectRelevantAgents(errorInput, maxAgents = 3) {
  const lower = errorInput.toLowerCase();
  const scores = Object.entries(SQUAD_AGENTS).map(([key, agent]) => {
    const score = agent.keywords.reduce((acc, kw) => acc + (lower.includes(kw) ? 1 : 0), 0);
    return { key, agent, score };
  });

  const relevant = scores
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxAgents)
    .map(s => s.agent);

  // Sempre incluir backend como fallback
  if (!relevant.length) relevant.push(SQUAD_AGENTS.backend);

  return relevant;
}

// ── Análise em paralelo pelos agentes do squad ────────────────────────────
async function runSquad(errorInput, context = {}) {
  const agents = detectRelevantAgents(errorInput);
  console.log(`[OPENCLAW] Squad montado: ${agents.map(a => a.name).join(', ')}`);

  // Para casos simples (1 agente), delegar direto ao Hermes
  if (agents.length === 1) {
    const rca = await analyzeError(errorInput, context);
    return {
      mode: 'single_agent',
      agent: agents[0].key,
      rca,
      consensus: rca,
    };
  }

  // Múltiplos agentes em paralelo
  const agentContext = { ...context };

  const results = await Promise.allSettled(
    agents.map(async (agent) => {
      const agentPrompt = `${errorInput}\n\nFoco da análise: ${agent.focus}`;
      const rca = await analyzeError(agentPrompt, agentContext);
      return { agent: agent.key, name: agent.name, rca };
    })
  );

  const successful = results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);

  if (!successful.length) {
    console.warn('[OPENCLAW] Todos agentes falharam — fallback para análise simples');
    const rca = await analyzeError(errorInput, context);
    return { mode: 'fallback', rca, consensus: rca };
  }

  // ── Consolidar consenso ───────────────────────────────────────────────
  const consensus = consolidate(successful);
  console.log(`[OPENCLAW] Consenso: ${consensus.confidence}% | ${successful.length} agentes`);

  return {
    mode: 'multi_agent',
    agents: successful.map(r => ({ key: r.agent, name: r.name, confidence: r.rca.confidence, risk: r.rca.risk })),
    consensus,
    votes: successful.length,
  };
}

// ── Consolidar resultados de múltiplos agentes ────────────────────────────
function consolidate(agentResults) {
  // Ordenar por confiança decrescente
  const sorted = [...agentResults].sort((a, b) => b.rca.confidence - a.rca.confidence);
  const best = sorted[0].rca;

  // Confiança média ponderada
  const totalWeight = sorted.reduce((acc, r) => acc + r.rca.confidence, 0);
  const avgConfidence = Math.round(totalWeight / sorted.length);

  // Patches: unir patches únicos de todos os agentes, ordenar por order
  const allPatches = [];
  const seen = new Set();
  for (const r of sorted) {
    for (const p of (r.rca.patches || [])) {
      const key = `${p.file}::${p.find?.slice(0, 40)}`;
      if (!seen.has(key)) { seen.add(key); allPatches.push(p); }
    }
  }

  // Risk: usar o mais conservador
  const riskOrder = { high: 3, medium: 2, low: 1 };
  const maxRisk = sorted.reduce((acc, r) => {
    return (riskOrder[r.rca.risk] || 0) > (riskOrder[acc] || 0) ? r.rca.risk : acc;
  }, 'low');

  return {
    cause: best.cause,
    fix: best.fix,
    explanation: best.explanation,
    confidence: avgConfidence,
    risk: maxRisk,
    patches: allPatches,
    requires_manual_review: avgConfidence < 60 || maxRisk === 'high',
    source: `openclaw_squad_${sorted.length}`,
  };
}

// ── Verificar se squad é necessário ──────────────────────────────────────
function needsSquad(errorInput) {
  const agents = detectRelevantAgents(errorInput, 6);
  const highScore = agents.filter(a => {
    const lower = errorInput.toLowerCase();
    return a.keywords.filter(kw => lower.includes(kw)).length >= 2;
  });
  return highScore.length >= 2; // 2+ camadas fortemente impactadas
}

module.exports = { runSquad, needsSquad, detectRelevantAgents };
