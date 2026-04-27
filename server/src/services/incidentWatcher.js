'use strict';

/**
 * VISION CORE v2.0 — Incident Watcher
 *
 * Monitora health endpoints e logs do projeto em busca de falhas.
 * Quando detecta falha, enfileira missão automática no autoMissionQueue.
 *
 * Nunca chama LLM diretamente. Nunca aplica patch sozinho.
 * Apenas detecta e enfileira — o pipeline completo decide o que fazer.
 */

const https   = require('https');
const http    = require('http');
const fs      = require('fs');
const path    = require('path');
const crypto  = require('crypto');
const { autoMissionQueue } = require('./autoMissionQueue');

const DATA_DIR     = path.resolve(__dirname, '../../data');
const INCIDENTS_F  = path.join(DATA_DIR, 'incidents.json');
const MAX_INCIDENTS = 500;

// ── Carregar/salvar incidentes ────────────────────────────────────────────
function loadIncidents() {
  try {
    if (!fs.existsSync(INCIDENTS_F)) return [];
    return JSON.parse(fs.readFileSync(INCIDENTS_F, 'utf-8'));
  } catch { return []; }
}

function saveIncidents(list) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(INCIDENTS_F, JSON.stringify(list.slice(0, MAX_INCIDENTS), null, 2), 'utf-8');
}

// ── Registrar incidente ───────────────────────────────────────────────────
function recordIncident(projectId, description, source, meta = {}) {
  const incident = {
    id:          `inc_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    projectId,
    description: String(description).slice(0, 500),
    source,
    status:      'detected',
    detectedAt:  new Date().toISOString(),
    queuedAt:    null,
    ...meta,
  };

  const list = loadIncidents();
  list.unshift(incident);
  saveIncidents(list);

  // Enfileirar para o orchestrator
  autoMissionQueue.enqueue({
    id:          incident.id,
    projectId,
    description: incident.description,
    priority:    meta.priority || 'normal',
    feedbackId:  meta.feedbackId || null,
  });

  // Fix 7: persistir status=queued no JSON (não só na variável em memória)
  incident.status   = 'queued';
  incident.queuedAt = new Date().toISOString();
  const listAfter   = loadIncidents();
  const idxAfter    = listAfter.findIndex(i => i.id === incident.id);
  if (idxAfter >= 0) {
    listAfter[idxAfter].status   = 'queued';
    listAfter[idxAfter].queuedAt = incident.queuedAt;
    saveIncidents(listAfter);
  }

  console.log(`[WATCHER] 🚨 Incidente detectado: ${incident.id} | ${source} | ${description.slice(0, 60)}`);
  return incident;
}

// ── Verificar health endpoint ─────────────────────────────────────────────
async function checkHealth(projectId, healthUrl) {
  return new Promise(resolve => {
    const mod   = healthUrl.startsWith('https') ? https : http;
    const timer = setTimeout(() => resolve({ ok: false, error: 'timeout', status: 0 }), 8000);

    try {
      mod.get(healthUrl, res => {
        clearTimeout(timer);
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => {
          const ok = res.statusCode >= 200 && res.statusCode < 300;
          resolve({ ok, status: res.statusCode, body: body.slice(0, 200) });
        });
      }).on('error', e => {
        clearTimeout(timer);
        resolve({ ok: false, error: e.message, status: 0 });
      });
    } catch (e) {
      clearTimeout(timer);
      resolve({ ok: false, error: e.message, status: 0 });
    }
  });
}

// ── Watcher de projetos ───────────────────────────────────────────────────
const _watchers = new Map();

function watchProject(projectId, healthUrl, options = {}) {
  if (_watchers.has(projectId)) {
    console.warn(`[WATCHER] Já monitorando: ${projectId}`);
    return;
  }

  const intervalMs   = options.intervalMs    || 30_000;
  const failThreshold = options.failThreshold || 2;
  let   failCount    = 0;

  console.log(`[WATCHER] Monitorando: ${projectId} (${healthUrl}) a cada ${intervalMs/1000}s`);

  const timer = setInterval(async () => {
    const result = await checkHealth(projectId, healthUrl);

    if (result.ok) {
      if (failCount > 0) {
        console.log(`[WATCHER] ✔ ${projectId} recuperou (após ${failCount} falha(s))`);
      }
      failCount = 0;
      return;
    }

    failCount++;
    console.warn(`[WATCHER] ⚠ ${projectId} falhou (${failCount}/${failThreshold}): ${result.error || result.status}`);

    if (failCount >= failThreshold) {
      failCount = 0; // reset para não re-enfileirar continuamente
      recordIncident(
        projectId,
        `Health check falhou: ${healthUrl} → ${result.error || `HTTP ${result.status}`}`,
        'health_watcher',
        { priority: 'high' }
      );
    }
  }, intervalMs);

  if (timer.unref) timer.unref();
  _watchers.set(projectId, { timer, healthUrl });

  return {
    stop: () => {
      clearInterval(timer);
      _watchers.delete(projectId);
      console.log(`[WATCHER] Parando monitoramento: ${projectId}`);
    },
  };
}

// ── Parar todos os watchers ───────────────────────────────────────────────
function stopAll() {
  for (const [id, { timer }] of _watchers) {
    clearInterval(timer);
    console.log(`[WATCHER] Parado: ${id}`);
  }
  _watchers.clear();
}

// ── Status ────────────────────────────────────────────────────────────────
function status() {
  return {
    watching:  [..._watchers.keys()],
    incidents: loadIncidents().slice(0, 10).map(i => ({
      id: i.id, projectId: i.projectId, status: i.status,
      source: i.source, detectedAt: i.detectedAt,
    })),
  };
}

module.exports = { watchProject, stopAll, recordIncident, checkHealth, status, loadIncidents };
