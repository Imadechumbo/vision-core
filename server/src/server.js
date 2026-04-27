'use strict';

require('dotenv').config();

const { migrate, helpers, db } = require('./db/sqlite');
const app = require('./app');

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '0.0.0.0';

// ── 1. Migrar schema ──────────────────────────────────────────────────────
try { migrate(); } catch (e) { console.error('[SERVER] Falha na migração:', e.message); process.exit(1); }

// ── 2. Iniciar servidor ───────────────────────────────────────────────────
const server = app.listen(PORT, HOST, () => {
  console.log('═'.repeat(56));
  console.log(' VISION CORE SERVER V2.3.4 HARDENED REAL-TIME');
  console.log('═'.repeat(56));
  console.log(` URL:      http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log(` AI:       ${process.env.AI_PROVIDER_ORDER || 'groq,openrouter,gemini,anthropic'}`);
  console.log(` DB:       ${process.env.DB_PATH || '.vault/vision_core.db'}`);
  console.log(` Auto-PR:  ${process.env.AUTO_PR !== 'false' ? 'ON' : 'OFF'}`);
  console.log(` Threshold: ${process.env.CONFIDENCE_THRESHOLD || 60}% confiança`);
  console.log('═'.repeat(56));
});

// ── 3. Worker loop (processa fila a cada 5s) ──────────────────────────────
const { runMission } = require('./services/missionRunner');

async function processQueue() {
  const job = helpers.getNextWorker.get();
  if (!job) return;

  console.log(`[WORKER] Processando job ${job.id} (${job.type})`);
  helpers.updateWorkerStatus.run({ id: job.id, status: 'running', result: null });

  try {
    let payload;
    try { payload = JSON.parse(job.payload); } catch { payload = { error: job.payload }; }

    const errorText = payload.error || payload.mission || String(job.payload);
    const result = await runMission(job.project_id, errorText, {});

    helpers.updateWorkerStatus.run({
      id: job.id, status: 'done',
      result: JSON.stringify({ status: result.status, gold: result.gold?.level }),
    });
    console.log(`[WORKER] ✔ Job ${job.id} concluído: ${result.status}`);

  } catch (err) {
    helpers.updateWorkerStatus.run({ id: job.id, status: 'failed', result: err.message });
    console.error(`[WORKER] ✗ Job ${job.id} falhou:`, err.message);
  }
}

let workerRunning = false;
setInterval(async () => {
  if (workerRunning) return;
  workerRunning = true;
  try { await processQueue(); } finally { workerRunning = false; }
}, 5000);

// ── 4. Seed: registrar TechNetGame se não existir ─────────────────────────
setTimeout(() => {
  const existing = helpers.getProject.get('technetgame');
  if (!existing) {
    const techPath = process.env.TECHNETGAME_PATH;
    if (techPath) {
      helpers.upsertProject.run({
        id: 'technetgame', name: 'TechNetGame', stack: 'node_express_static_front',
        path: techPath,
        health_url: process.env.TECHNETGAME_HEALTH_URL || 'https://api.technetgame.com.br/api/health',
        adapter: 'technetgame',
        config: JSON.stringify({ check_urls: ['https://api.technetgame.com.br/api/health'] }),
      });
      console.log('[SERVER] TechNetGame registrado automaticamente.');
    }
  }
}, 2000);

// ── 5. Shutdown limpo ─────────────────────────────────────────────────────
function shutdown(signal) {
  console.log(`\n[SERVER] Encerrando (${signal})...`);
  server.close(() => { db.close(); process.exit(0); });
  setTimeout(() => process.exit(0), 5000);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', reason => console.error('[SERVER] unhandledRejection:', reason));
process.on('uncaughtException', err => { console.error('[SERVER] uncaughtException:', err); process.exit(1); });
