'use strict';

/**
 * VISION CORE v1.3 — OpenClaw Router (Multi-Agent Targeting)
 *
 * Novidade V1.3: cada agente do squad pode agora declarar seus próprios
 * targetHints — sinais específicos para o FileScanner localizar o arquivo
 * que aquele agente vai inspecionar.
 *
 * MissionPlan agora inclui:
 *   approvedTargets: string[]   — lista de relativePaths validados pelo scanner
 *                                 (preenchida pelo missionRunner após o scan)
 *   agentTargets: {             — mapa agente → target aprovado
 *     [agentKey]: string
 *   }
 *
 * Fluxo V1.3:
 *   1. OpenClaw route() → MissionPlan com agents + targetHints por agente
 *   2. FileScanner roda uma vez por agente (scanForAgent)
 *   3. missionRunner consolida approvedTargets no MissionPlan
 *   4. Aegis verifica target lock contra approvedTargets (não só 1 arquivo)
 *   5. Hermes recebe contexto de múltiplos arquivos
 *   6. PatchEngine aplica patches em múltiplos targets
 */

const SQUAD_AGENTS = {
  backend: {
    key: 'backend', name: 'Agente Backend',
    focus: 'Express, Node.js, rotas, middlewares, erros de servidor',
    keywords: ['server', 'route', 'middleware', 'express', 'api', 'endpoint', 'port', 'listen', 'req', 'res'],
    targetHints: ['router', 'route', 'controller', 'handler', 'app.js', 'server.js', 'index.js'],
  },
  database: {
    key: 'database', name: 'Agente Database',
    focus: 'SQL, queries, conexões, migrations, modelos de dados',
    keywords: ['db', 'database', 'query', 'sql', 'sqlite', 'mongo', 'connection', 'schema', 'model'],
    targetHints: ['model', 'schema', 'migration', 'repository', 'database', 'db'],
  },
  auth: {
    key: 'auth', name: 'Agente Auth',
    focus: 'Autenticação, tokens, sessões, CORS, permissões',
    keywords: ['auth', 'token', 'jwt', 'session', 'cors', 'unauthorized', '401', '403', 'bearer'],
    targetHints: ['auth', 'middleware', 'guard', 'passport', 'jwt', 'token', 'cors'],
  },
  upload: {
    key: 'upload', name: 'Agente Upload/Media',
    focus: 'Multer, arquivos, mimetypes, storage, imagens',
    keywords: ['file', 'upload', 'multer', 'mimetype', 'buffer', 'storage', 'image', 'req.file'],
    targetHints: ['upload', 'media', 'file', 'multer', 'storage', 'image', 'vision'],
  },
  config: {
    key: 'config', name: 'Agente Config',
    focus: '.env, variáveis de ambiente, configurações, portas',
    keywords: ['env', 'config', 'port', 'host', 'environment', 'variable', 'process.env', 'dotenv'],
    targetHints: ['config', 'env', 'settings', 'constants', 'environment'],
  },
  network: {
    key: 'network', name: 'Agente Network',
    focus: 'Conexões externas, HTTP, timeouts, DNS, ECONNREFUSED',
    keywords: ['connection', 'econnrefused', 'timeout', 'network', 'http', 'fetch', 'axios', 'dns'],
    targetHints: ['http', 'client', 'request', 'fetch', 'axios', 'network', 'api'],
  },
};

// ── Categorias com scan hints + agentes primários ─────────────────────────
const CATEGORY_HINTS = {
  upload_multer: {
    scanHints: ['multer', 'req.file', 'upload.single', 'upload.array', 'mimetype', 'diskStorage', 'memoryStorage'],
    layers: ['upload'],
    primaryAgent: 'upload',
    secondaryAgents: ['backend'],   // backend pode ter o router que chama o upload
  },
  server_port: {
    scanHints: ['app.listen', 'server.listen', 'process.env.PORT', 'createServer', 'PORT'],
    layers: ['backend', 'config'],
    primaryAgent: 'backend',
    secondaryAgents: ['config'],
  },
  cors: {
    scanHints: ['cors()', 'Access-Control', 'app.use(cors', 'origin', 'allowedHeaders'],
    layers: ['backend', 'auth'],
    primaryAgent: 'auth',
    secondaryAgents: ['backend'],
  },
  auth_token: {
    scanHints: ['jwt.verify', 'jwt.sign', 'Bearer', 'authorization', 'middleware', 'passport'],
    layers: ['auth', 'backend'],
    primaryAgent: 'auth',
    secondaryAgents: ['backend'],
  },
  database: {
    scanHints: ['mongoose.connect', 'sequelize', 'knex', 'prisma', 'DataSource', 'db.query'],
    layers: ['database', 'backend'],
    primaryAgent: 'database',
    secondaryAgents: ['backend'],
  },
  generic: {
    scanHints: [],
    layers: ['backend'],
    primaryAgent: 'backend',
    secondaryAgents: [],
  },
};

// ── Detectar categoria pelo erro ──────────────────────────────────────────
function detectCategory(errorInput) {
  const lower = errorInput.toLowerCase();
  if (/req\.file|mimetype|multer|cannot read.*file/i.test(lower))          return 'upload_multer';
  if (/eaddrinuse|address already in use|listen.*port/i.test(lower))        return 'server_port';
  if (/cors|cross.origin|access-control|blocked by cors/i.test(lower))      return 'cors';
  if (/jwt|token.*invalid|unauthorized|401|403/i.test(lower))               return 'auth_token';
  if (/econnrefused.*27017|mongoose|sequelize|knex|prisma/i.test(lower))    return 'database';
  return 'generic';
}

// ── Pontuar agentes pelo erro + categoria ─────────────────────────────────
function scoreAgents(errorInput, category) {
  const lower = errorInput.toLowerCase();
  return Object.values(SQUAD_AGENTS)
    .map(agent => {
      let score = agent.keywords.reduce((acc, kw) => acc + (lower.includes(kw) ? 1 : 0), 0);
      const catMeta = CATEGORY_HINTS[category] || {};
      if (catMeta.primaryAgent   === agent.key) score += 5;
      if (catMeta.secondaryAgents?.includes(agent.key)) score += 2;
      return { agent, score };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);
}

// ── Extrair termos adicionais do stack trace ──────────────────────────────
function extractErrorHints(errorInput) {
  const fileMatches = errorInput.match(/at\s+\S+\s+\(([^:)]+):\d+:\d+\)/g) || [];
  const files = fileMatches
    .map(m => m.match(/\(([^:)]+):/)?.[1])
    .filter(Boolean)
    .map(f => f.split('/').pop().replace('.js', ''))
    .filter(f => f && !['node_modules', 'internal', 'anonymous'].some(x => f.includes(x)));

  const techWords = (errorInput.match(/\b[a-zA-Z]{4,}\b/g) || [])
    .filter(w => !['Cannot', 'Error', 'TypeError', 'undefined', 'null', 'reading',
                   'properties', 'object', 'function', 'return', 'const', 'async',
                   'Promise', 'Module', 'require'].includes(w))
    .slice(0, 6);

  return [...new Set([...files, ...techWords])];
}

// ── Construir scanHints por agente (V1.3) ─────────────────────────────────
// Retorna { [agentKey]: string[] } — hints específicos por agente
function buildAgentScanHints(agents, category, errorHints) {
  const catMeta  = CATEGORY_HINTS[category] || CATEGORY_HINTS.generic;
  const agentMap = {};

  for (const agent of agents) {
    const hints = new Set([
      // Hints gerais da categoria
      ...catMeta.scanHints,
      // Hints do próprio agente (targetHints)
      ...agent.targetHints,
      // Hints do erro bruto
      ...errorHints,
    ]);
    agentMap[agent.key] = [...hints];
  }

  return agentMap;
}

// ── Detectar intent class para SkillContextBuilder ────────────────────────
function _detectIntentClass(errorInput) {
  const lower = (errorInput || '').toLowerCase();
  if (/fix|bug|error|falha|corrigir|crash|quebrado|null|undefined|eaddrinuse|cannot read/i.test(lower)) return 'bug_fix';
  if (/add|adicionar|feature|novo|implementar|criar/i.test(lower)) return 'feature';
  if (/refactor|refatorar|reorganizar|limpar/i.test(lower)) return 'refactor';
  if (/test|validar|benchmark|testar|ci\b|check/i.test(lower)) return 'validation';
  if (/deploy|release|merge|publicar|subir/i.test(lower)) return 'deployment';
  return 'bug_fix';
}

// ── Roteador principal — produz MissionPlan V1.3 ──────────────────────────
function route(errorInput, options = {}) {
  const category     = detectCategory(errorInput);
  const categoryMeta = CATEGORY_HINTS[category] || CATEGORY_HINTS.generic;
  const scoredAgents = scoreAgents(errorInput, category);
  const errorHints   = extractErrorHints(errorInput);

  // Selecionar até 3 agentes mais relevantes
  const topAgents = scoredAgents.slice(0, 3).map(x => x.agent);
  if (!topAgents.length) topAgents.push(SQUAD_AGENTS.backend);

  // Prioridade: squad se 2+ agentes fortes
  const priority = topAgents.length >= 2 && scoredAgents[0]?.score >= 3 ? 'squad' : 'single';

  // ScanHints globais (union de todos os agentes)
  const allHints = [...new Set([...categoryMeta.scanHints, ...errorHints])];

  // ScanHints por agente (V1.3 — novidade)
  const agentScanHints = buildAgentScanHints(topAgents, category, errorHints);

  const plan = {
    intent:          options.description || errorInput.slice(0, 120),
    category,
    layers:          categoryMeta.layers,
    primaryAgent:    categoryMeta.primaryAgent,
    agents:          topAgents,
    agentNames:      topAgents.map(a => a.name),
    agentScanHints,                // V1.3: hints por agente
    scanHints:       allHints,     // hints globais (compatibilidade)
    priority,
    confidence:      category !== 'generic' ? 85 : 50,
    raw:             errorInput,
    // Preenchidos pelo missionRunner após o scan:
    approvedTargets: [],           // V1.3: múltiplos targets aprovados
    agentTargets:    {},           // V1.3: mapa agente → target
    // V1.6.3: gates explícitos para SkillContextBuilder e hermesRca
    gates: {
      hermesRequiresScanResult:  true,
      patchRequiresAegis:        true,
      promotionRequiresPassGold: true,
    },
    intent_class:    _detectIntentClass(errorInput),
    primaryCategory: category,
  };

  console.log(`[OPENCLAW] ▶ V1.3 Missão roteada`);
  console.log(`[OPENCLAW]   Categoria:    ${category}`);
  console.log(`[OPENCLAW]   Agentes:      ${plan.agentNames.join(', ')}`);
  console.log(`[OPENCLAW]   Prioridade:   ${priority.toUpperCase()}`);
  console.log(`[OPENCLAW]   ScanHints:    ${allHints.slice(0, 5).join(', ')}`);
  for (const [k, hints] of Object.entries(agentScanHints)) {
    console.log(`[OPENCLAW]   ${k} hints: ${hints.slice(0, 4).join(', ')}`);
  }

  // V2.0 Tuning: aplicar signals extras se houver tuning ativo (reversível via rollback)
  try {
    const { loadActiveTuning, applyTuningToRoute } = require('./tuningEngine');
    const tuning = loadActiveTuning();
    if (tuning) applyTuningToRoute(plan, tuning);
  } catch { /* tuningEngine indisponível — não bloqueia o pipeline */ }

  return plan;
}

// ── Formatar plano como contexto para o prompt do Hermes ─────────────────
function buildPlanContext(plan) {
  if (!plan) return '';

  const targetLine = plan.approvedTargets?.length
    ? `Targets aprovados: ${plan.approvedTargets.join(', ')}`
    : '';

  return [
    '=== PLANO DA MISSÃO (OpenClaw v1.3) ===',
    `Intenção:   ${plan.intent}`,
    `Categoria:  ${plan.category}`,
    `Camadas:    ${plan.layers.join(', ')}`,
    `Agentes:    ${plan.agentNames.join(', ')}`,
    `Prioridade: ${plan.priority}`,
    targetLine,
    `Hints:      ${plan.scanHints.slice(0, 8).join(', ')}`,
  ].filter(Boolean).join('\n');
}

module.exports = {
  route, buildPlanContext, detectCategory, scoreAgents,
  extractErrorHints, buildAgentScanHints, SQUAD_AGENTS, CATEGORY_HINTS,
};
