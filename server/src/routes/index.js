'use strict';

/**
 * VISION CORE V2.3.4 — Routes
 *
 * Regras de ordem (Express resolve na ordem de registro):
 *   1. Rotas estáticas (literais) SEMPRE antes de rotas dinâmicas (/:param)
 *   2. Endpoints mock marcados com mock:true — frontend detecta sem hardcode
 *   3. /api/github/create-pr exige mission_id real — pass_gold nunca vem do body
 *   4. /api/ai/providers/save protegido: rate-limit + whitelist + masking
 *   5. /api/runtime/contracts descreve status de cada endpoint
 */

const express = require('express');
const crypto  = require('crypto');
const { helpers } = require('../db/sqlite');
const { runMission } = require('../services/missionRunner');
const { rollbackMission, validate } = require('../services/patchEngine');
const { evaluate } = require('../services/passGoldEngine');
const { githubStatus, createPR } = require('../services/githubService');
const { runTechNetGameChecks } = require('../services/logCollector');

const router = express.Router();

// ── Rate-limit simples em memória (sem dependência extra) ─────────────────
const _rl = new Map();
function rateLimit(key, maxPerMin = 10) {
  const now  = Date.now();
  const win  = 60_000;
  const hits = (_rl.get(key) || []).filter(t => now - t < win);
  hits.push(now);
  _rl.set(key, hits);
  return hits.length <= maxPerMin;
}

// ════════════════════════════════════════════════════════════
// HEALTH
// ════════════════════════════════════════════════════════════
router.get('/health', (req, res) => {
  res.json({ ok: true, service: 'vision-core-server', version: '2.3.4-hardened-realtime', time: new Date().toISOString() });
});

// ════════════════════════════════════════════════════════════
// FIX 7 — /api/runtime/contracts
// Frontend consulta aqui para saber o que é real, mock ou indisponível.
// ════════════════════════════════════════════════════════════
router.get('/runtime/contracts', (req, res) => {
  const gh         = githubStatus();
  const hasGithub  = gh.configured;
  const hasGitness = !!process.env.GITNESS_TOKEN;
  const hasBilling = !!process.env.BILLING_PROVIDER;
  const hasAuth    = !!process.env.AUTH_PROVIDER;

  res.json({
    ok: true,
    version: '2.3.4-hardened-realtime',
    contracts: {
      '/api/health':                  { status: 'real' },
      '/api/projects':                { status: 'real' },
      '/api/missions/run':            { status: 'real' },
      '/api/missions/run-live':       { status: 'real', note: 'Retorna mission_id imediatamente e executa pipeline em background com SSE' },
      '/api/missions':                { status: 'real' },
      '/api/missions/timeline':       { status: 'real' },
      '/api/missions/:id':            { status: 'real' },
      '/api/missions/:id/timeline':   { status: 'real' },
      '/api/missions/:id/patches':    { status: 'real' },
      '/api/missions/:id/stream':     { status: 'real' },
      '/api/missions/:id/poll':       { status: 'real' },
      '/api/vault/snapshots':         { status: 'real' },
      '/api/vault/rollback':          { status: 'real' },
      '/api/pass-gold/score':         { status: 'real' },
      '/api/pass-gold/evaluate':      { status: 'real' },
      '/api/pass-gold/:missionId':    { status: 'real' },
      '/api/workers/status':          { status: 'real' },
      '/api/workers/enqueue':         { status: 'real' },
      '/api/runtime/status':          { status: 'real' },
      '/api/runtime/module-map':      { status: 'real' },
      '/api/runtime/contracts':       { status: 'real' },
      '/api/runtime/harness-stats':   { status: 'real' },
      '/api/hermes/memory':           { status: 'real' },
      '/api/logs/download':           { status: 'real' },
      '/api/diff/preview':            { status: 'real' },
      '/api/github/status':           { status: hasGithub  ? 'real' : 'unavailable', configured: hasGithub },
      '/api/github/create-pr':        { status: hasGithub  ? 'real' : 'unavailable', configured: hasGithub,
                                        note: 'Exige mission_id — pass_gold verificado no banco' },
      '/api/github/automerge-policy': { status: hasGithub  ? 'real' : 'mock', mock: !hasGithub },
      '/api/runtime/hybrid-status':   { status: hasGitness ? 'real' : 'partial' },
      '/api/runtime/self-test':       { status: 'real' },
      '/api/auth/signup':             { status: 'demo', demo: true,
                                        note: 'Token demo volátil — configure AUTH_PROVIDER no .env',
                                        real_when: 'AUTH_PROVIDER=jwt|supabase|clerk', configured: hasAuth },
      '/api/ai/providers/save':       { status: 'demo', demo: true,
                                        note: 'Salva em process.env (volátil) — use .env para persistência real' },
      '/api/metrics/summary':         { status: 'real', note: 'CPU/memória/disco calculados no processo; network exposto como unavailable quando não há telemetria' },
      '/api/metrics/agents':          { status: 'real',
                                        note: 'Catálogo de custos/cores por agente para UI' },
      '/api/agents/catalog':          { status: 'real',
                                        note: 'Catálogo de agentes core e reserve lido dos módulos do projeto' },
      '/api/hermes/vote':             { status: 'demo', demo: true,
                                        note: 'Deriva da última missão, não é votação em tempo real' },
      '/api/tools/marketplace':       { status: 'demo', demo: true,
                                        note: 'Lista estática baseada em variáveis de ambiente' },
      '/api/billing/plans':           { status: hasBilling ? 'real' : 'demo', demo: !hasBilling,
                                        note: hasBilling ? undefined : 'Configure BILLING_PROVIDER no .env' },
    },
  });
});

// ════════════════════════════════════════════════════════════
// PROJECTS
// ════════════════════════════════════════════════════════════
router.get('/projects', (req, res) => {
  const projects = helpers.listProjects.all();
  res.json({ ok: true, projects: projects.map(p => ({ ...p, config: JSON.parse(p.config || '{}') })) });
});

router.post('/projects', (req, res) => {
  const { id, name, stack, path: projPath, health_url, adapter, config } = req.body;
  if (!id || !name || !projPath) return res.status(400).json({ ok: false, error: 'id, name e path são obrigatórios' });
  helpers.upsertProject.run({ id, name, stack: stack || 'node_express', path: projPath,
    health_url: health_url || null, adapter: adapter || 'generic', config: JSON.stringify(config || {}) });
  res.json({ ok: true, project: helpers.getProject.get(id) });
});

router.get('/projects/:id', (req, res) => {
  const p = helpers.getProject.get(req.params.id);
  if (!p) return res.status(404).json({ ok: false, error: 'Projeto não encontrado' });
  res.json({ ok: true, project: { ...p, config: JSON.parse(p.config || '{}') } });
});

router.delete('/projects/:id', (req, res) => {
  helpers.deleteProject.run(req.params.id);
  res.json({ ok: true });
});

router.get('/projects/:id/health', async (req, res) => {
  const p = helpers.getProject.get(req.params.id);
  if (!p) return res.status(404).json({ ok: false, error: 'Projeto não encontrado' });
  if (p.adapter === 'technetgame') return res.json(await runTechNetGameChecks(p));
  if (p.health_url) return res.json({ ok: true, message: 'Health check genérico', health_url: p.health_url });
  res.json({ ok: true, message: 'Sem health_url configurada', project: p.id });
});

// ════════════════════════════════════════════════════════════
// STREAMING — SSE
// ════════════════════════════════════════════════════════════
const { addClient } = require('../services/streamRunner');

router.get('/missions/:id/stream', (req, res) => {
  const mission = helpers.getMission.get(req.params.id);
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache',
    'Connection': 'keep-alive', 'Access-Control-Allow-Origin': '*', 'X-Accel-Buffering': 'no' });
  res.write(`event: connected\ndata: ${JSON.stringify({ mission_id: req.params.id, status: mission?.status || 'pending' })}\n\n`);
  addClient(req.params.id, res);
});

router.get('/missions/:id/poll', (req, res) => {
  const { id } = req.params;
  const since  = Number(req.query.since || 0);
  const mission = helpers.getMission.get(id);
  if (!mission) return res.status(404).json({ ok: false, error: 'Missão não encontrada' });
  const steps = helpers.getSteps.all(id).filter(s => s.elapsed_ms > since);
  res.json({ ok: true, mission_id: id, status: mission.status,
    done: !['running', 'pending'].includes(mission.status), steps,
    gold_score: mission.gold_score, gold_level: mission.gold_level, pass_gold: mission.pass_gold === 1 });
});

// ════════════════════════════════════════════════════════════
// MISSIONS
// FIX 3: rotas estáticas ANTES das dinâmicas /:id
// Ordem: /missions/run → /missions/timeline → /missions (lista)
//        → /missions/project/:id → /missions/:id (dinâmica)
// ════════════════════════════════════════════════════════════
router.post('/missions/run-live', (req, res) => {
  const { project_id, error, log_path, force_squad, force_high_risk, dry_run, mode } = req.body;
  if (!project_id || !error) return res.status(400).json({ ok: false, error: 'project_id e error são obrigatórios' });

  const project = helpers.getProject.get(project_id);
  if (!project) {
    const projects = helpers.listProjects.all().map(p => ({ id: p.id, name: p.name, stack: p.stack }));
    return res.status(404).json({
      ok: false,
      code: 'PROJECT_NOT_FOUND',
      error: `Projeto '${project_id}' não encontrado`,
      hint: projects.length ? 'Selecione um projeto registrado no dashboard.' : 'Registre um projeto com POST /api/projects ou configure TECHNETGAME_PATH antes do boot.',
      projects,
    });
  }

  const mission_id = `mission_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

  setImmediate(async () => {
    try {
      await runMission(project_id, error, {
        mission_id,
        logPath: log_path,
        forceSquad: !!force_squad,
        forceHighRisk: !!force_high_risk,
        dry_run: !!dry_run || mode === 'dry-run',
      });
    } catch (e) {
      try {
        const { emit, closeStream } = require('../services/streamRunner');
        emit(mission_id, 'error', { message: e.message, ts: Date.now() });
        closeStream(mission_id);
      } catch { /* não bloquear */ }
    }
  });

  res.json({ ok: true, live: true, mission_id, stream_url: `/api/missions/${mission_id}/stream`, poll_url: `/api/missions/${mission_id}/poll` });
});

router.post('/missions/run', async (req, res) => {
  const { project_id, error, log_path, force_squad, force_high_risk, dry_run, mode } = req.body;
  if (!project_id || !error) return res.status(400).json({ ok: false, error: 'project_id e error são obrigatórios' });
  try {
    const result = await runMission(project_id, error, {
      logPath: log_path, forceSquad: !!force_squad, forceHighRisk: !!force_high_risk,
      dry_run: !!dry_run || mode === 'dry-run',
    });
    res.json(result);
  } catch (e) {
    console.error('[API /missions/run]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Rota estática — deve preceder /missions/:id
router.get('/missions/timeline', (req, res) => {
  const { db } = require('../db/sqlite');
  try {
    const steps = db.prepare(
      `SELECT ms.mission_id, ms.step, ms.status, ms.detail, ms.elapsed_ms, m.project_id
       FROM mission_steps ms JOIN missions m ON ms.mission_id = m.id
       ORDER BY ms.rowid DESC LIMIT 50`
    ).all();
    res.json({ ok: true, timeline: steps });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/missions', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  res.json({ ok: true, missions: helpers.listMissions.all(limit), total: helpers.listMissions.all(limit).length });
});

router.get('/missions/project/:projectId', (req, res) => {
  res.json({ ok: true, missions: helpers.listMissionsByProject.all(req.params.projectId) });
});

// Rotas dinâmicas com :id — registradas DEPOIS das estáticas
router.get('/missions/:id', (req, res) => {
  const m = helpers.getMission.get(req.params.id);
  if (!m) return res.status(404).json({ ok: false, error: 'Missão não encontrada' });
  res.json({ ok: true, mission: m });
});

router.get('/missions/:id/timeline', (req, res) => {
  const m = helpers.getMission.get(req.params.id);
  if (!m) return res.status(404).json({ ok: false, error: 'Missão não encontrada' });
  const steps = helpers.getSteps.all(req.params.id);
  res.json({ ok: true, mission_id: req.params.id, status: m.status, timeline: steps });
});

router.get('/missions/:id/patches', (req, res) => {
  res.json({ ok: true, patches: helpers.getPatches.all(req.params.id) });
});

// ════════════════════════════════════════════════════════════
// VAULT
// ════════════════════════════════════════════════════════════
router.get('/vault/snapshots', (req, res) => {
  const projectId = req.query.project_id;
  const snaps = projectId ? helpers.getSnapshotsByProject.all(projectId)
    : helpers.db?.prepare('SELECT id, mission_id, project_id, file_path, hash, rolled_back, created_at FROM snapshots ORDER BY created_at DESC LIMIT 50').all() || [];
  res.json({ ok: true, snapshots: snaps });
});

router.get('/vault/snapshots/:missionId', (req, res) => {
  const snaps = helpers.getSnapshotsByMission.all(req.params.missionId);
  res.json({ ok: true, snapshots: snaps.map(s => ({ ...s, content: undefined })) });
});

router.post('/vault/rollback', (req, res) => {
  const { mission_id } = req.body;
  if (!mission_id) return res.status(400).json({ ok: false, error: 'mission_id obrigatório' });
  res.json(rollbackMission(mission_id));
});

// ════════════════════════════════════════════════════════════
// PASS GOLD
// FIX 3: rotas estáticas /pass-gold/score e /pass-gold/evaluate
//        ANTES da dinâmica /pass-gold/:missionId
// ════════════════════════════════════════════════════════════
router.get('/pass-gold/score', (req, res) => {
  const { db } = require('../db/sqlite');
  try {
    const last = db.prepare('SELECT gold_score, gold_level, pass_gold FROM missions ORDER BY created_at DESC LIMIT 1').get();
    if (!last) return res.json({ ok: true, final: 0, status: 'NO_DATA', promotion_allowed: false });
    res.json({ ok: true, final: last.gold_score || 0,
      status: last.pass_gold ? 'GOLD' : (last.gold_level || 'NEEDS_REVIEW'),
      promotion_allowed: last.pass_gold === 1 });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/pass-gold/evaluate', async (req, res) => {
  const { mission_id, project_id } = req.body;
  if (!mission_id) return res.status(400).json({ ok: false, error: 'mission_id obrigatório' });
  const mission = helpers.getMission.get(mission_id);
  if (!mission) return res.status(404).json({ ok: false, error: 'Missão não encontrada' });
  const project = helpers.getProject.get(mission.project_id || project_id);
  const filesToValidate = helpers.getPatches.all(mission_id).map(p => p.file);
  const validation = project && filesToValidate.length
    ? validate(project.path, filesToValidate)
    : { ok: false, files: [], tests: null };
  const snaps = helpers.getSnapshotsByMission.all(mission_id);
  const rca = { cause: mission.rca_cause, fix: mission.rca_fix,
    confidence: mission.rca_confidence || 0, risk: mission.rca_risk || 'unknown', patches: [] };
  const gold = evaluate(mission_id, rca, null, { applied: mission.patches_count }, validation, snaps.map(s => s.id));
  res.json({ ok: true, evaluation: gold });
});

// Dinâmica — depois das estáticas
router.get('/pass-gold/:missionId', (req, res) => {
  const gold = helpers.getGold.get(req.params.missionId);
  if (!gold) return res.status(404).json({ ok: false, error: 'Avaliação PASS GOLD não encontrada' });
  res.json({ ok: true, evaluation: gold });
});

// ════════════════════════════════════════════════════════════
// GITHUB
// FIX 1: pass_gold NÃO aceito do body
// FIX 2: mission_id obrigatório — PASS GOLD verificado no banco
// ════════════════════════════════════════════════════════════
router.get('/github/status', (req, res) => {
  res.json({ ok: true, ...githubStatus() });
});

router.get('/github/automerge-policy', (req, res) => {
  const configured = githubStatus().configured;
  res.json({ ok: true, mock: !configured,
    default: process.env.GITHUB_AUTOMERGE || 'manual',
    required: ['pass_gold', 'aegis_ok', 'syntax_check', 'tests_pass'],
    bypass_allowed: false });
});

// FIX 1 + FIX 2 — pass_gold vem SOMENTE do banco, nunca do body
router.post('/github/create-pr', async (req, res) => {
  try {
    const { mission_id, title, message } = req.body;

    if (!mission_id) {
      return res.status(400).json({ ok: false,
        error: 'mission_id obrigatório — PASS GOLD é verificado no banco, nunca aceito do frontend' });
    }

    const mission = helpers.getMission.get(mission_id);
    if (!mission) {
      return res.status(404).json({ ok: false, error: `Missão '${mission_id}' não encontrada` });
    }

    // FIX 1: verificar pass_gold no banco — ignora qualquer flag do body
    if (!mission.pass_gold || mission.pass_gold !== 1) {
      return res.status(403).json({ ok: false,
        error: `PASS GOLD não atingido para missão '${mission_id}'`,
        mission_id, pass_gold: false,
        gold_score: mission.gold_score || 0, gold_level: mission.gold_level || 'NEEDS_REVIEW',
        status: mission.status });
    }

    const ghStatus = githubStatus();
    if (!ghStatus.configured) {
      return res.status(503).json({ ok: false, mock: true,
        error: 'GitHub não configurado — defina GITHUB_TOKEN e GITHUB_REPO no .env' });
    }

    const branch = `vision-core/${mission_id.slice(-12)}`;
    try {
      const project = helpers.getProject.get(mission.project_id);
      const pr = await createPR(project?.path || '.',  branch,
        { cause: mission.rca_cause, fix: mission.rca_fix, patches: [] },
        { pass_gold: true, final: mission.gold_score, level: mission.gold_level });
      res.json({ ok: true, ...pr, mission_id, gold_verified_from_db: true });
    } catch (prErr) {
      const pr_url = `https://github.com/${ghStatus.owner}/${ghStatus.repo}/compare/${branch}`;
      res.json({ ok: true, branch, pr_url,
        vault_manifest: `vault/pr-${branch.split('/')[1]}.json`,
        mission_id, gold_verified_from_db: true,
        note: 'Branch gerado — push manual: ' + prErr.message });
    }
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ════════════════════════════════════════════════════════════
// WORKERS
// ════════════════════════════════════════════════════════════
router.get('/workers/status', (req, res) => {
  const workers = helpers.listWorkers.all();
  res.json({ ok: true, workers,
    queued:  workers.filter(w => w.status === 'queued').length,
    running: workers.filter(w => w.status === 'running').length,
    done:    workers.filter(w => w.status === 'done').length });
});

router.post('/workers/enqueue', (req, res) => {
  const { project_id, type, payload } = req.body;
  if (!project_id || !payload) return res.status(400).json({ ok: false, error: 'project_id e payload obrigatórios' });
  const id = `job_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  helpers.insertWorker.run({ id, project_id, type: type || 'MISSION',
    payload: typeof payload === 'string' ? payload : JSON.stringify(payload) });
  res.json({ ok: true, job_id: id });
});

// ════════════════════════════════════════════════════════════
// RUNTIME
// ════════════════════════════════════════════════════════════
router.get('/runtime/status', (req, res) => {
  const { db } = require('../db/sqlite');
  const total   = db.prepare('SELECT COUNT(*) as n FROM missions').get()?.n || 0;
  const gold    = db.prepare('SELECT COUNT(*) as n FROM missions WHERE pass_gold = 1').get()?.n || 0;
  res.json({ ok: true, state: 'stable',
    missions_total: total, pass_gold_count: gold,
    gold_rate: total > 0 ? Math.round((gold / total) * 100) : 0,
    github: githubStatus(), time: new Date().toISOString() });
});

router.get('/runtime/self-test', async (req, res) => {
  try {
    const { runSelfTest } = require('../self-test');
    const result = await runSelfTest();
    res.status(result.ok ? 200 : 500).json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/runtime/hybrid-status', async (req, res) => {
  try {
    const { gitnessStatus, ping } = require('../services/gitness/gitnessService');
    const hybridCfgPath = require('path').resolve(__dirname, '../../config/hybrid-git.json');
    const gh  = githubStatus();
    const gn  = gitnessStatus();
    const cfg = require('fs').existsSync(hybridCfgPath)
      ? JSON.parse(require('fs').readFileSync(hybridCfgPath, 'utf-8')) : null;
    const gitnessPing = gn.configured
      ? await ping().catch(() => ({ ok: false, error: 'ping falhou' }))
      : { ok: null, skipped: true };
    res.json({ ok: true, mode: process.env.HYBRID_GIT_MODE || 'github_only',
      github: { ...gh, platform: 'github' }, gitness: { ...gn, platform: 'gitness', ping: gitnessPing },
      pass_gold_rule: cfg?.pass_gold_rule || { bypass_allowed: false }, quick_start: cfg?.quick_start || null });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/runtime/module-map', (req, res) => {
  try {
    const guard = require('../services/moduleGuard');
    res.json({ ok: true, ...guard.getResponsibilityMap() });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/runtime/harness-stats', (req, res) => {
  const { db } = require('../db/sqlite');
  try {
    const total    = db.prepare('SELECT COUNT(*) as n FROM missions').get()?.n || 0;
    const gold     = db.prepare('SELECT COUNT(*) as n FROM missions WHERE pass_gold = 1').get()?.n || 0;
    const failed   = db.prepare("SELECT COUNT(*) as n FROM missions WHERE status IN ('failed','patch_failed','validation_failed')").get()?.n || 0;
    const avgScore = db.prepare('SELECT AVG(gold_score) as avg FROM missions WHERE pass_gold = 1').get()?.avg || 0;
    const recent   = db.prepare('SELECT status, gold_level, duration_ms FROM missions ORDER BY created_at DESC LIMIT 10').all();
    res.json({ ok: true, harness: { missions_total: total, pass_gold_count: gold, fail_count: failed,
      gold_rate: total > 0 ? Math.round((gold / total) * 100) : 0,
      avg_gold_score: Math.round(avgScore), recent_missions: recent } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ════════════════════════════════════════════════════════════
// HERMES
// ════════════════════════════════════════════════════════════
router.get('/hermes/memory', (req, res) => {
  const memories = helpers.listMemory.all();
  res.json({ ok: true, memories, total: memories.length });
});

// FIX 4: mock:true explícito
router.get('/hermes/vote', (req, res) => {
  const { db } = require('../db/sqlite');
  try {
    const last = db.prepare('SELECT rca_confidence, rca_risk, status FROM missions ORDER BY created_at DESC LIMIT 1').get();
    const conf = last?.rca_confidence || 0;
    res.json({ ok: true, demo: true, note: 'Derivado da última missão — não é votação em tempo real',
      votes: [
        { agent: 'OpenClaw', vote: conf >= 60 ? 'APPROVE' : 'REVIEW', confidence: conf },
        { agent: 'Hermes',   vote: conf >= 70 ? 'APPROVE' : 'REVIEW', confidence: Math.max(0, conf - 5) },
        { agent: 'Aegis',    vote: last?.rca_risk !== 'critical' ? 'APPROVE' : 'BLOCK', confidence: 95 },
        { agent: 'PassGold', vote: last?.status === 'success' ? 'GOLD' : 'PENDING', confidence: conf },
      ],
      consensus: conf >= 70 && last?.status === 'success' ? 'CONSENSUS: PASS GOLD' : 'CONSENSUS: AGUARDANDO' });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ════════════════════════════════════════════════════════════
// LOGS
// ════════════════════════════════════════════════════════════
router.get('/logs/download', (req, res) => {
  const { db } = require('../db/sqlite');
  try {
    const missions = db.prepare('SELECT id, project_id, status, gold_score, gold_level, pass_gold, duration_ms, created_at FROM missions ORDER BY created_at DESC LIMIT 200').all();
    const steps    = db.prepare('SELECT mission_id, step, status, detail, elapsed_ms FROM mission_steps ORDER BY mission_id, elapsed_ms ASC LIMIT 2000').all();
    const payload  = JSON.stringify({ generated_at: new Date().toISOString(), missions, steps }, null, 2);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="vision-core-logs-${Date.now()}.json"`);
    res.send(payload);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ════════════════════════════════════════════════════════════
// AUTH
// FIX 4: mock:true explícito + validação de email
// ════════════════════════════════════════════════════════════
router.post('/auth/signup', (req, res) => {
  const { email, plan, provider } = req.body;
  if (!email) return res.status(400).json({ ok: false, error: 'email obrigatório' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ ok: false, error: 'email inválido' });

  const safePlan     = ['free', 'pro', 'enterprise'].includes(plan) ? plan : 'free';
  const safeProvider = ['email', 'github', 'google'].includes(provider) ? provider : 'email';
  const token        = crypto.randomBytes(16).toString('hex');
  res.json({ ok: true, demo: true,
    note: 'Token demo volátil. Configure AUTH_PROVIDER no .env para auth real.',
    user: { email, plan: safePlan, provider: safeProvider, created_at: new Date().toISOString() },
    token });
});

// ════════════════════════════════════════════════════════════
// AI PROVIDERS
// FIX 5: rate-limit + whitelist de providers + masking seguro
// ════════════════════════════════════════════════════════════
const ALLOWED_AI_PROVIDERS = new Set(['groq', 'openrouter', 'openai', 'anthropic', 'gemini', 'ollama']);

router.post('/ai/providers/save', (req, res) => {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';

  // FIX 5a: rate-limit — 5 saves por minuto por IP
  if (!rateLimit(`ai_save:${ip}`, 5)) {
    return res.status(429).json({ ok: false, error: 'Muitas requisições — aguarde 1 minuto' });
  }

  const { provider, api_key, model, priority } = req.body;

  // FIX 5b: whitelist de providers
  if (!provider || !ALLOWED_AI_PROVIDERS.has(provider.toLowerCase())) {
    return res.status(400).json({ ok: false,
      error: `provider inválido — permitidos: ${[...ALLOWED_AI_PROVIDERS].join(', ')}` });
  }

  if (!api_key || typeof api_key !== 'string' || api_key.length < 10) {
    return res.status(400).json({ ok: false, error: 'api_key inválida ou muito curta' });
  }

  // FIX 5c: masking seguro
  const masked_key = api_key.length > 12
    ? api_key.slice(0, 3) + '****' + api_key.slice(-3)
    : '***redacted***';

  const provKey = provider.toUpperCase();
  process.env[`AI_KEY_${provKey}`]   = api_key;
  process.env[`AI_MODEL_${provKey}`] = model || '';

  res.json({ ok: true, demo: true,
    note: 'Salvo em processo — volátil. Adicione ao .env para persistência real.',
    provider: provider.toLowerCase(), model: model || 'default', masked_key,
    priority: ['primary', 'secondary', 'fallback'].includes(priority) ? priority : 'primary' });
});

// ════════════════════════════════════════════════════════════
// METRICS / TOOLS / BILLING / DIFF
// FIX 4: mock:true explícito onde necessário
// ════════════════════════════════════════════════════════════

// V2.3.4 — catálogo real de agentes do projeto para a UI.
// Lê SQUAD_AGENTS e RESERVE_AGENTS diretamente dos módulos do backend.
router.get('/agents/catalog', (req, res) => {
  try {
    const { SQUAD_AGENTS }   = require('../services/openclawRouter');
    const { RESERVE_AGENTS } = require('../services/openSquadReserve');

    const core_agents = Object.values(SQUAD_AGENTS || {}).map(a => ({
      key: a.key,
      name: a.name,
      type: 'core',
      role: a.focus,
      focus: a.focus,
      provides: a.targetHints || a.keywords || [],
      active: true,
      canPatch: false,
      owner: 'OpenClaw Router',
    }));

    const reserve_agents = Object.values(RESERVE_AGENTS || {}).map(a => ({
      key: a.key,
      name: a.name,
      type: 'reserve',
      role: a.role,
      provides: a.provides || [],
      active: false,
      canPatch: !!a.canPatch,
      owner: 'OpenSquad Reserve',
    }));

    res.json({
      ok: true,
      version: '2.3.4-hardened-realtime',
      total: core_agents.length + reserve_agents.length,
      core_agents,
      reserve_agents,
      rule: 'Agentes extras não aparecem no menu principal; trabalham por escalação via OpenClaw/OpenSquad.'
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// V2.3.4 — métricas visuais por agente.
// Valores de custo continuam estáticos/controlados; nomes e categorias vêm da arquitetura real.
router.get('/metrics/agents', (req, res) => {
  try {
    const { SQUAD_AGENTS } = require('../services/openclawRouter');
    const core = Object.values(SQUAD_AGENTS || {});
    const base = [
      { key:'openclaw',    name:'OpenClaw',    mode:'conversa', width:88, cost:'$0.163', color:'purple', role:'orquestração' },
      { key:'hermes',      name:'Hermes RCA',  mode:'conversa', width:72, cost:'$0.815', color:'purple', role:'diagnóstico' },
      { key:'scanner',     name:'Scanner',     mode:'conversa', width:65, cost:'$0.377', color:'green',  role:'realidade do código' },
      { key:'aegis',       name:'Aegis',       mode:'conversa', width:91, cost:'$0.264', color:'cyan',   role:'segurança' },
      { key:'patchengine', name:'PatchEngine', mode:'loop',     width:58, cost:'$0.668', color:'orange', role:'execução' },
      { key:'passgold',    name:'PASS GOLD',   mode:'loop',     width:82, cost:'$0.471', color:'yellow', role:'validação' },
      { key:'benchmark',   name:'Benchmark',   mode:'auto',     width:76, cost:'$1.469', color:'pink',   role:'otimização' },
    ];

    const squadMetrics = core.slice(0, 6).map((a, idx) => ({
      key: a.key,
      name: a.name,
      mode: idx % 2 === 0 ? 'auto' : 'conversa',
      width: 46 + (idx * 7) % 40,
      cost: `$${(0.231 + idx * 0.117).toFixed(3)}`,
      color: ['blue','green','cyan','purple','orange','pink'][idx % 6],
      role: a.focus,
    }));

    res.json({
      ok: true,
      version: '2.3.4-hardened-realtime',
      source: 'backend',
      metrics: base.concat(squadMetrics),
      total_pipeline_cost: '$4.227',
      note: 'Usado pela UI para reproduzir o painel de métricas com cores por função.'
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

let lastCpuSample = null;
function sampleCpuPercent() {
  const now = process.hrtime.bigint();
  const cpu = process.cpuUsage();
  const current = { now, user: cpu.user, system: cpu.system };
  if (!lastCpuSample) { lastCpuSample = current; return 0; }
  const elapsedMicros = Number(now - lastCpuSample.now) / 1000;
  const usedMicros = (current.user - lastCpuSample.user) + (current.system - lastCpuSample.system);
  lastCpuSample = current;
  if (elapsedMicros <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((usedMicros / elapsedMicros) * 100)));
}

function readDiskPercent() {
  try {
    const { execFileSync } = require('child_process');
    const out = execFileSync('df', ['-P', process.cwd()], { encoding: 'utf8', timeout: 1500 });
    const line = out.trim().split(/\n/)[1] || '';
    const pct = Number((line.match(/(\d+)%/) || [])[1]);
    return Number.isFinite(pct) ? pct : null;
  } catch { return null; }
}

router.get('/metrics/summary', (req, res) => {
  const { db } = require('../db/sqlite');
  const mem = process.memoryUsage();
  try {
    const total = db.prepare('SELECT COUNT(*) as n FROM missions').get()?.n || 0;
    const rssMb = Math.round(mem.rss / 1024 / 1024);
    const heapPct = mem.heapTotal ? Math.round((mem.heapUsed / mem.heapTotal) * 100) : 0;
    res.json({ ok: true, source: 'process',
      note: 'Métricas reais do processo Node; network fica unavailable sem coletor dedicado.',
      runtime: {
        cpu: sampleCpuPercent(),
        memory: heapPct,
        memory_rss_mb: rssMb,
        disk: readDiskPercent(),
        network: null,
        network_status: 'unavailable_without_collector',
      },
      uptime_seconds: Math.round(process.uptime()), missions_total: total });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/tools/marketplace', (req, res) => {
  res.json({ ok: true, demo: true, tools: [
    { name: 'GitHub Integration', status: process.env.GITHUB_TOKEN   ? 'active' : 'needs_config' },
    { name: 'Gitness Hybrid',     status: process.env.GITNESS_TOKEN  ? 'active' : 'optional' },
    { name: 'Groq AI Provider',   status: process.env.GROQ_API_KEY   ? 'active' : 'needs_config' },
    { name: 'OpenAI Provider',    status: process.env.OPENAI_API_KEY ? 'active' : 'optional' },
    { name: 'Obsidian Vault',     status: 'available' },
    { name: 'Benchmark Engine',   status: 'active' },
    { name: 'Community Feedback', status: 'active' },
  ]});
});

router.get('/billing/plans', (req, res) => {
  const hasBilling = !!process.env.BILLING_PROVIDER;
  res.json({ ok: true, mock: !hasBilling,
    note: hasBilling ? undefined : 'Configure BILLING_PROVIDER no .env para planos reais',
    plans: [
      { id: 'free',       name: 'Free',       missions: '10/mês',    features: ['Scanner', 'Hermes básico', 'PASS GOLD'] },
      { id: 'pro',        name: 'Pro',         missions: '500/mês',   features: ['Tudo Free', 'GitHub PR', 'Benchmark', 'Memory'] },
      { id: 'enterprise', name: 'Enterprise',  missions: 'ilimitado', features: ['Tudo Pro', 'SelfHealing', 'Gitness', 'SLA'] },
    ],
    billing_provider: process.env.BILLING_PROVIDER || 'none' });
});

router.post('/diff/preview', (req, res) => {
  const { path: filePath, before, after } = req.body;
  if (!before || !after) return res.status(400).json({ ok: false, error: 'before e after obrigatórios' });
  const bLines = before.split('\n');
  const aLines = after.split('\n');
  const patch  = [];
  for (let i = 0; i < Math.max(bLines.length, aLines.length); i++) {
    if (bLines[i] !== aLines[i]) {
      if (bLines[i] !== undefined) patch.push(`- ${bLines[i]}`);
      if (aLines[i] !== undefined) patch.push(`+ ${aLines[i]}`);
    }
  }
  res.json({ ok: true, path: filePath, patch: patch.join('\n') || '(sem diferenças)', lines_changed: patch.length });
});

// ════════════════════════════════════════════════════════════
// COMMUNITY + BENCHMARK
// ════════════════════════════════════════════════════════════
router.use('/community',   require('./communityFeedbackRoutes'));
router.use('/benchmarks',  require('./benchmarkRoutes'));

module.exports = router;
