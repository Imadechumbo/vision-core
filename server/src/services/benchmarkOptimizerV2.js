'use strict';

/**
 * VISION CORE — Benchmark Optimizer V2
 *
 * Auto-tuning closed-loop baseado em resultados de benchmark.
 * Gera, valida, simula e aplica planos de tuning de forma controlada.
 *
 * REGRAS ABSOLUTAS:
 *   - NÃO escreve em Hermes Memory
 *   - NÃO bypassa PASS GOLD
 *   - NÃO bypassa Aegis
 *   - NÃO altera arquivos críticos
 *   - Todo tuning é reversível via rollback
 *   - Todo tuning é auditável via tuning-history.json
 */

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const DATA_DIR      = path.resolve(__dirname, '../../data');
const ACTIVE_FILE   = path.join(DATA_DIR, 'tuning-active.json');
const HISTORY_FILE  = path.join(DATA_DIR, 'tuning-history.json');

// Arquivos críticos — tuning nunca os toca
const CRITICAL_FILES = [
  'missionRunner.js', 'passGoldEngine.js', 'aegis.js', 'hermesRca.js',
  'hermesMemory.js', 'patchEngine.js', 'openclawRouter.js',
  'criticalFileGuard.js', 'checkPassGold.js',
];

// Tipos de ação permitidos
const ALLOWED_ACTION_TYPES = ['UPDATE_SCAN_HINTS', 'ADJUST_AGENT_WEIGHT'];

// Sinais safe por categoria
const SAFE_SIGNALS_BY_CATEGORY = {
  upload_multer:  ['multer', 'req.file', 'upload', 'mimetype', 'diskStorage', 'memoryStorage', 'upload.single', 'upload.array'],
  server_port:    ['app.listen', 'server.listen', 'PORT', 'createServer', 'EADDRINUSE'],
  cors:           ['cors()', 'Access-Control', 'origin', 'allowedHeaders', 'app.use(cors'],
  auth_token:     ['jwt.verify', 'jwt.sign', 'Bearer', 'authorization', 'passport', 'middleware'],
  database:       ['mongoose.connect', 'sequelize', 'knex', 'prisma', 'db.query', 'DataSource'],
  generic:        ['handler', 'route', 'middleware', 'service', 'controller'],
};

const SAFE_PATHS = [
  'server/src/routes', 'server/src/services', 'server/src/controllers',
  'server/src/middleware', 'server/src/models',
];

// ── I/O helpers ───────────────────────────────────────────────────────────
function ensureDir() { fs.mkdirSync(DATA_DIR, { recursive: true }); }

function loadHistory() {
  try {
    if (!fs.existsSync(HISTORY_FILE)) return [];
    return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
  } catch { return []; }
}

function saveHistory(list) {
  ensureDir();
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(list.slice(0, 100), null, 2), 'utf-8');
}

function saveActive(plan) {
  ensureDir();
  if (plan === null) {
    if (fs.existsSync(ACTIVE_FILE)) fs.unlinkSync(ACTIVE_FILE);
    return;
  }
  fs.writeFileSync(ACTIVE_FILE, JSON.stringify(plan, null, 2), 'utf-8');
}

function loadActive() {
  try {
    if (!fs.existsSync(ACTIVE_FILE)) return null;
    return JSON.parse(fs.readFileSync(ACTIVE_FILE, 'utf-8'));
  } catch { return null; }
}

// ── 1. analyzeRuns ────────────────────────────────────────────────────────
function analyzeRuns(runs) {
  if (!runs?.length) return { total: 0, metrics: null };

  const total          = runs.length;
  const passGoldCount  = runs.filter(r => r.passGold).length;
  const targetHitCount = runs.filter(r => r.targetHit).length;
  const causeHitCount  = runs.filter(r => r.rootCauseHit).length;
  const avgScore       = runs.reduce((a, r) => a + (r.score || 0), 0) / total;

  const byCategory = {};
  for (const r of runs) {
    const c = r.category || 'generic';
    if (!byCategory[c]) byCategory[c] = { runs: 0, passGold: 0, targetHit: 0, causeHit: 0, score: 0 };
    byCategory[c].runs++;
    byCategory[c].passGold  += r.passGold  ? 1 : 0;
    byCategory[c].targetHit += r.targetHit ? 1 : 0;
    byCategory[c].causeHit  += r.rootCauseHit ? 1 : 0;
    byCategory[c].score     += r.score || 0;
  }

  const categoryMetrics = Object.entries(byCategory).map(([cat, d]) => ({
    category:        cat,
    runs:            d.runs,
    passGoldRate:    d.passGold  / d.runs,
    targetHitRate:   d.targetHit / d.runs,
    rootCauseHitRate: d.causeHit / d.runs,
    avgScore:        Math.round(d.score / d.runs),
  }));

  return {
    total,
    metrics: {
      passGoldRate:    passGoldCount  / total,
      targetHitRate:   targetHitCount / total,
      rootCauseMissRate: (total - causeHitCount) / total,
      avgScore:        Math.round(avgScore),
      byCategory:      categoryMetrics,
    },
  };
}

// ── 2. detectWeakSignals ──────────────────────────────────────────────────
function detectWeakSignals(metrics) {
  if (!metrics) return [];

  const signals = [];
  const { passGoldRate, targetHitRate, rootCauseMissRate, avgScore, byCategory } = metrics;

  if (1 - targetHitRate > 0.3) signals.push({ type: 'SCAN_WEAK',   rate: 1 - targetHitRate });
  if (rootCauseMissRate  > 0.3) signals.push({ type: 'RCA_WEAK',   rate: rootCauseMissRate });
  if (passGoldRate       < 0.5) signals.push({ type: 'PATCH_WEAK', rate: passGoldRate });
  if (avgScore           < 50)  signals.push({ type: 'GLOBAL_WEAK',score: avgScore });

  // Sinais por categoria
  for (const cat of (byCategory || [])) {
    if (1 - cat.targetHitRate > 0.4) {
      signals.push({ type: 'SCAN_WEAK_CATEGORY', category: cat.category, rate: 1 - cat.targetHitRate });
    }
  }

  return signals;
}

// ── 3. generateTuningPlan ─────────────────────────────────────────────────
function generateTuningPlan(metrics) {
  const signals = detectWeakSignals(metrics);
  if (!signals.length) {
    console.log('[OPTIMIZER_V2] Nenhum sinal fraco detectado — tuning desnecessário');
    return null;
  }

  const actions  = [];
  const snapshot = {};

  for (const sig of signals) {
    if (sig.type === 'SCAN_WEAK') {
      // Adicionar signals safe para todas as categorias
      for (const [cat, signals] of Object.entries(SAFE_SIGNALS_BY_CATEGORY)) {
        actions.push({
          type:       'UPDATE_SCAN_HINTS',
          category:   cat,
          addSignals: signals.slice(0, 4),
          addPaths:   SAFE_PATHS.slice(0, 2),
        });
      }
    }

    if (sig.type === 'SCAN_WEAK_CATEGORY') {
      actions.push({
        type:       'UPDATE_SCAN_HINTS',
        category:   sig.category,
        addSignals: SAFE_SIGNALS_BY_CATEGORY[sig.category] || SAFE_SIGNALS_BY_CATEGORY.generic,
        addPaths:   SAFE_PATHS,
      });
    }

    if (sig.type === 'RCA_WEAK') {
      // Aumentar peso do Hermes (agente backend como proxy)
      actions.push({ type: 'ADJUST_AGENT_WEIGHT', agent: 'backend', delta: 10 });
    }

    if (sig.type === 'PATCH_WEAK') {
      // Aumentar peso do validator para reforçar patchEngine
      actions.push({ type: 'ADJUST_AGENT_WEIGHT', agent: 'validator', delta: 5 });
    }
  }

  // Deduplicar ações por type+category
  const seen    = new Set();
  const unique  = actions.filter(a => {
    const key = `${a.type}::${a.category || a.agent}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const confidence = Math.min(95, 50 + signals.length * 10);

  return {
    id:             `tune_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    createdAt:      new Date().toISOString(),
    source:         'benchmark_optimizer_v2',
    confidence,
    signals,
    actions:        unique,
    metricsBefore:  metrics,
    metricsAfter:   null,
    validated:      false,
    applied:        false,
    rolled_back:    false,
  };
}

// ── 4. validateTuningPlan ─────────────────────────────────────────────────
function validateTuningPlan(plan) {
  if (!plan?.actions?.length) return { ok: false, reason: 'Plano vazio ou sem ações' };

  for (const action of plan.actions) {
    // Tipo desconhecido
    if (!ALLOWED_ACTION_TYPES.includes(action.type)) {
      return { ok: false, reason: `Tipo de ação desconhecido: ${action.type}` };
    }

    // Tentativa de alterar arquivos críticos
    const signals = (action.addSignals || []).join(' ').toLowerCase();
    if (CRITICAL_FILES.some(f => signals.includes(f.replace('.js', '')))) {
      return { ok: false, reason: `Ação tenta referenciar arquivo crítico` };
    }

    // Tentativa de remover Aegis
    if (/aegis|bypassaegis|noaegis|skipvalidat|disableaegis/i.test(signals)) {
      return { ok: false, reason: 'Ação tenta remover ou bypass Aegis' };
    }

    // Tentativa de reduzir PASS GOLD
    if (/passgold.*false|no.?pass.?gold|bypass.*gold/i.test(signals)) {
      return { ok: false, reason: 'Ação tenta reduzir exigência de PASS GOLD' };
    }

    // Delta muito alto (limite de segurança)
    if (action.type === 'ADJUST_AGENT_WEIGHT' && Math.abs(action.delta || 0) > 50) {
      return { ok: false, reason: `Delta de agente muito alto: ${action.delta} (máx: 50)` };
    }

    // Paths fora dos permitidos
    for (const p of (action.addPaths || [])) {
      const isUnsafe = !SAFE_PATHS.some(sp => p.startsWith(sp));
      if (isUnsafe) return { ok: false, reason: `Path fora dos permitidos: ${p}` };
    }
  }

  return { ok: true };
}

// ── 5. simulateTuning ────────────────────────────────────────────────────
async function simulateTuning(plan, options = {}) {
  // Validar antes de simular
  const validation = validateTuningPlan(plan);
  if (!validation.ok) {
    return { ok: false, reason: `Validação falhou: ${validation.reason}`, simulated: false };
  }

  console.log(`[OPTIMIZER_V2] Simulando plano ${plan.id} (não aplica patches reais)`);

  // Fix 2: flag explícita — simulation nunca pode virar tuning ativo real
  // loadActiveTuning() recusa qualquer entrada com _simulation_only=true
  const tempActive = { ...plan, applied: true, rolled_back: false, _simulation_only: true };

  let suiteResult = null;
  try {
    const { runBenchmarkSuite } = require('./benchmarkEngine');
    saveActive(tempActive);
    suiteResult = await runBenchmarkSuite({
      projectId: options.projectId || process.env.BENCHMARK_PROJECT_ID,
      safePatch: false,
    });
  } catch (e) {
    console.warn('[OPTIMIZER_V2] Suite falhou durante simulação:', e.message);
    suiteResult = null;
  } finally {
    // Remover tuning temporário — SEMPRE, mesmo em caso de erro
    saveActive(null);
    // Garantia adicional: se por algum motivo saveActive falhou,
    // o loadActiveTuning já rejeita _simulation_only=true
  }

  if (!suiteResult?.ok) {
    return {
      ok: false,
      simulated: true,
      reason: 'Suite de benchmark falhou durante simulação',
      suiteResult,
    };
  }

  const improved = (suiteResult.avgScore || 0) > (plan.metricsBefore?.avgScore || 0);
  const noRegression = (suiteResult.passRate || 0) >= (plan.metricsBefore?.passGoldRate || 0) * 100;

  console.log(`[OPTIMIZER_V2] Simulação: score ${plan.metricsBefore?.avgScore} → ${suiteResult.avgScore} | improved=${improved}`);

  return {
    ok:           improved && noRegression,
    simulated:    true,
    improved,
    noRegression,
    scoreBefore:  plan.metricsBefore?.avgScore,
    scoreAfter:   suiteResult.avgScore,
    passRateAfter: suiteResult.passRate,
    suiteResult,
    reason: !improved
      ? 'Simulação não melhorou score'
      : !noRegression
        ? 'Simulação causou regressão no passGoldRate'
        : 'Simulação aprovada',
  };
}

// ── 6. applyTuningPlan ────────────────────────────────────────────────────
// Fix 3: exige passGoldResult e aegisResult explícitos — não infere do simulationResult
async function applyTuningPlan(plan, simulationResult, passGoldResult, aegisResult) {
  // Gate 1: validação do plano
  const validation = validateTuningPlan(plan);
  if (!validation.ok) {
    return { ok: false, applied: false, reason: `Validação: ${validation.reason}` };
  }

  // Gate 2: simulação deve ter melhorado E não pode ser simulation_only
  if (!simulationResult?.ok || simulationResult?._simulation_only) {
    return { ok: false, applied: false, reason: `Simulação: ${simulationResult?.reason || 'não passou'}` };
  }

  // Gate 3: PASS GOLD explícito obrigatório (Fix 3)
  if (!passGoldResult?.pass_gold) {
    return {
      ok: false, applied: false,
      reason: `PASS GOLD obrigatório para aplicar tuning (score=${passGoldResult?.final ?? '?'}/100)`,
    };
  }

  // Gate 4: Aegis explícito obrigatório (Fix 3)
  if (!aegisResult?.ok) {
    return {
      ok: false, applied: false,
      reason: `Aegis obrigatório para aplicar tuning (verdict=${aegisResult?.verdict ?? 'ausente'})`,
    };
  }

  // Gate 5: nunca aplicar sem benchmark disponível
  const { loadBenchmarks } = require('./benchmarkEngine');
  if (!loadBenchmarks().length) {
    return { ok: false, applied: false, reason: 'Nenhum benchmark disponível — tuning requer baseline' };
  }

  // Salvar snapshot do estado anterior (para rollback)
  const previous = loadActive();
  const activePlan = {
    ...plan,
    applied:       true,
    appliedAt:     new Date().toISOString(),
    metricsAfter:  { avgScore: simulationResult.scoreAfter, passGoldRate: simulationResult.passRateAfter },
    previousPlan:  previous?.id || null,
  };

  saveActive(activePlan);

  // Registrar no histórico
  const history = loadHistory();
  history.unshift({ ...activePlan, type: 'applied' });
  saveHistory(history);

  console.log(`[OPTIMIZER_V2] ✔ Tuning aplicado: ${plan.id} | confidence=${plan.confidence}%`);
  return { ok: true, applied: true, plan: activePlan };
}

// ── 7. rollbackTuning ────────────────────────────────────────────────────
function rollbackTuning(planId) {
  const current = loadActive();

  if (!current) return { ok: false, reason: 'Nenhum tuning ativo para reverter' };
  if (planId && current.id !== planId) {
    return { ok: false, reason: `Plano ativo é ${current.id}, não ${planId}` };
  }

  const rolledBack = { ...current, rolled_back: true, rolledBackAt: new Date().toISOString() };

  // Registrar rollback no histórico
  const history = loadHistory();
  history.unshift({ ...rolledBack, type: 'rolled_back' });
  saveHistory(history);

  // Remover tuning ativo
  saveActive(null);

  console.log(`[OPTIMIZER_V2] ✔ Rollback: ${current.id}`);
  return { ok: true, rolledBack: rolledBack.id };
}

// ── 8. runAutoTuning ─────────────────────────────────────────────────────
async function runAutoTuning(options = {}) {
  console.log('[OPTIMIZER_V2] Iniciando auto-tuning...');

  // 1. Carregar runs de benchmark
  const { loadRuns } = require('./benchmarkEngine');
  const runs = loadRuns();

  if (!runs.length) {
    return { ok: false, reason: 'Nenhum benchmark disponível — rodar benchmarks primeiro' };
  }

  // 2. Analisar
  const { metrics } = analyzeRuns(runs);

  // 3. Gerar plano
  const plan = generateTuningPlan(metrics);
  if (!plan) {
    return { ok: true, tuned: false, reason: 'Pipeline já está otimizado — nenhum tuning necessário' };
  }

  // 4. Validar
  const validation = validateTuningPlan(plan);
  if (!validation.ok) {
    return { ok: false, tuned: false, reason: `Plano inválido: ${validation.reason}` };
  }
  plan.validated = true;

  // 5. Simular
  const simulation = await simulateTuning(plan, options);

  // 6. Aplicar se simulação melhorou
  if (!simulation.ok) {
    console.warn(`[OPTIMIZER_V2] Simulação não passou — tuning não aplicado: ${simulation.reason}`);
    return { ok: false, tuned: false, plan, simulation, reason: simulation.reason };
  }

  const result = await applyTuningPlan(
    plan,
    simulation,
    options.passGoldResult || { pass_gold: false },   // Fix 3: caller deve fornecer
    options.aegisResult    || { ok: false, verdict: 'não fornecido' },
  );

  return {
    ok:         result.ok,
    tuned:      result.applied,
    planId:     plan.id,
    plan:       result.plan,
    simulation,
    metrics,
    reason:     result.reason || 'auto-tuning concluído',
  };
}

module.exports = {
  analyzeRuns, detectWeakSignals, generateTuningPlan,
  validateTuningPlan, simulateTuning, applyTuningPlan,
  rollbackTuning, runAutoTuning,
};
