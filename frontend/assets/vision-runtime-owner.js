/* VISION CORE V13.1 — single runtime owner.
 * Owns live mission submission and stream observation. UI command code remains
 * local-only and cannot promote, certify GOLD or create repository changes.
 */
(function () {
  'use strict';

  const GATEWAY = 'https://visioncore-api-gateway.weiganlight.workers.dev';
  const LIVE_SUBMIT_PATH = '/api/run-live';
  const LIVE_STREAM_PATH = '/api/run-live-stream';
  const $ = (id) => document.getElementById(id);
  let currentStream = null;

  function apiBase() {
    return String(window.API || window.API_BASE_URL || window.__VISION_API__ || GATEWAY).replace(/\/$/, '');
  }

  function apiUrl(path) {
    return apiBase() + path;
  }

  function escapeText(value) {
    return String(value || '').replace(/[<>]/g, '');
  }

  function setRuntimeState(state) {
    const monitor = $('runtimeMonitor');
    const text = $('runtimeText');
    if (monitor) monitor.className = state || 'stable';
    if (text) text.textContent = String(state || 'stable').toUpperCase();
  }

  function showLog(scope, message, cls) {
    const logsBox = $('logsBox');
    const logsPanel = $('logsPanel');
    if (!logsBox) return;
    if (logsPanel) logsPanel.classList.add('active');
    logsBox.classList.remove('empty');
    const line = document.createElement('div');
    if (cls) line.className = cls;
    line.textContent = `[${new Date().toLocaleTimeString()}] ${scope}: ${escapeText(message)}`;
    logsBox.appendChild(line);
    logsBox.scrollTop = logsBox.scrollHeight;
  }

  async function requestJson(path, options) {
    const res = await fetch(apiUrl(path), options || {});
    const text = await res.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch (_) { data = { ok: false, raw: text }; }
    if (!res.ok) data.ok = false;
    data.status = res.status;
    return data;
  }

  function renderTimeline(items) {
    const box = $('timelineBox');
    if (!box || !Array.isArray(items)) return;
    box.innerHTML = items.map((item) => {
      const status = escapeText(item.status || item.stage || 'ready');
      const step = escapeText(item.step || item.stage || 'step');
      const detail = escapeText(item.detail || item.message || '');
      return `<div class="timelineStep ${status}"><strong>${step}</strong><span>${status}</span><small>${detail}</small></div>`;
    }).join('');
  }

  function paintPipeline(stage, status) {
    if (typeof window.v236SetPipelineStage === 'function') {
      window.v236SetPipelineStage(stage, status);
    }
  }

  function closeStream() {
    if (currentStream) {
      currentStream.close();
      currentStream = null;
    }
  }

  function openMissionStream(missionId) {
    if (!missionId || typeof EventSource !== 'function') return;
    closeStream();
    const url = `${apiUrl(LIVE_STREAM_PATH)}?mission_id=${encodeURIComponent(missionId)}`;
    currentStream = new EventSource(url);

    currentStream.addEventListener('open', () => {
      setRuntimeState('realtime');
      showLog('STREAM', `open ${missionId}`, 'cyan');
    });

    currentStream.addEventListener('step', (event) => {
      let data = {};
      try { data = JSON.parse(event.data || '{}'); } catch (_) {}
      showLog('STEP', `${data.stage || data.step || 'step'} • ${data.message || data.status || ''}`, 'cyan');
      paintPipeline(data.stage || data.step, data.status || 'running');
    });

    currentStream.addEventListener('gate', (event) => {
      let data = {};
      try { data = JSON.parse(event.data || '{}'); } catch (_) {}
      showLog('GATE', `${data.name || 'gate'} • ${data.status || 'blocked'}`, data.status === 'pass' ? 'green' : 'yellow');
      if (data.name) paintPipeline(data.name, data.status === 'pass' ? 'done' : 'running');
    });

    currentStream.addEventListener('done', (event) => {
      let data = {};
      try { data = JSON.parse(event.data || '{}'); } catch (_) {}
      showLog('DONE', data.message || 'mission stream finished', data.ok ? 'green' : 'yellow');
      setRuntimeState(data.ok ? 'stable' : 'blocked');
      closeStream();
    });

    currentStream.onerror = () => {
      showLog('STREAM', 'stream indisponível ou encerrado', 'yellow');
      setRuntimeState('stable');
      closeStream();
    };
  }

  async function executeMission() {
    const missionField = $('missionText');
    const projectSelector = $('projectSelector');
    const modeSelect = $('modeSelect');
    const mission = (missionField && missionField.value.trim()) || 'diagnosticar runtime do projeto';
    const project = (projectSelector && projectSelector.value) || 'vision-core-master';
    const mode = (modeSelect && modeSelect.value) || 'live';

    setRuntimeState('analyzing');
    showLog('MISSION', 'enviando missão ao runtime owner V13.1', 'cyan');

    const data = await requestJson(LIVE_SUBMIT_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: project, mission, error: mission, mode, dry_run: mode === 'dry-run' })
    });

    if (!data.ok) {
      showLog('MISSION', data.message || data.error || 'falha ao iniciar missão', 'red');
      setRuntimeState('fail');
      return;
    }

    const missionId = data.mission_id || data.missionId || data.id;
    showLog('MISSION', `aceita: ${missionId || 'sem id'}`, 'green');
    renderTimeline(data.timeline || []);
    setRuntimeState('realtime');
    openMissionStream(missionId);
  }

  async function loadScore() {
    const box = $('scoreBox');
    if (!box) return;
    const data = await requestJson('/api/pass-gold/score').catch(() => ({ ok: false, status: 'BLOCKED' }));
    const status = data.status_label || data.status || 'BLOCKED';
    const promotion = data.promotion_label || 'BLOQUEADA';
    box.innerHTML = `<div class="scoreBig red">${escapeText(data.final || '0 / 100')}</div><div>Status: <b>${escapeText(status)}</b></div><div>Promoção: <b>${escapeText(promotion)}</b></div>`;
  }

  async function loadMetrics() {
    const box = $('metricsBox');
    if (!box) return;
    const data = await requestJson('/api/metrics/summary').catch(() => ({ runtime: {} }));
    const runtime = data.runtime || {};
    box.innerHTML = ['cpu', 'memory', 'disk', 'network'].map((key) => {
      const value = Math.max(0, Math.min(100, Number(runtime[key] || 0)));
      return `<div class="health"><span>${key.toUpperCase()}</span><div class="bar"><span style="width:${value}%"></span></div><span>${value}%</span></div>`;
    }).join('');
  }

  async function loadVotes() {
    const box = $('votesBox');
    if (!box) return;
    const data = await requestJson('/api/hermes/vote').catch(() => ({ votes: [] }));
    const votes = Array.isArray(data.votes) ? data.votes : [];
    box.innerHTML = votes.map((vote) => `<div class="gate"><span>${escapeText(vote.agent)}</span><span class="green">${escapeText(vote.vote)} ${Number(vote.confidence || 0)}%</span></div>`).join('');
  }

  async function loadWorkers() {
    const box = $('workersBox');
    const queue = $('queueBox');
    const data = await requestJson('/api/workers/status').catch(() => ({ workers: [] }));
    if (box) {
      box.innerHTML = (data.workers || []).map((worker) => `<div class="gate"><span>${escapeText(worker.id || worker.name)} <small>${escapeText(worker.queue || '')}</small></span><span class="cyan">${escapeText(worker.status || 'ok')}</span></div>`).join('');
    }
    if (queue) {
      queue.innerHTML = `<div class="gate"><span>Jobs na fila</span><span class="yellow">${Number(data.queued || 0)}</span></div><div class="gate"><span>Processados</span><span class="green">${Number(data.processed || 0)}</span></div>`;
    }
  }

  async function loadProjects() {
    const selector = $('projectSelector');
    if (!selector) return;
    const data = await requestJson('/api/projects').catch(() => ({ projects: [] }));
    selector.innerHTML = (data.projects || []).map((project) => `<option value="${escapeText(project.id)}">${escapeText(project.id)} • ${escapeText(project.stack)} • ${escapeText(project.status)}</option>`).join('');
  }

  async function loadPlans() {
    const box = $('plansBox');
    if (!box) return;
    const data = await requestJson('/api/billing/plans').catch(() => ({ plans: [] }));
    box.innerHTML = (data.plans || []).map((plan, index) => `<div class="plan ${index === 0 ? 'active' : ''}" data-plan="${escapeText(plan.id)}"><strong>${escapeText(plan.name)}</strong><span>${Number(plan.missions)}</span></div>`).join('');
  }

  function bindButtons() {
    const execute = $('executeBtn');
    const enqueue = $('enqueueBtn');
    const github = $('githubPrBtn');

    if (execute) execute.addEventListener('click', executeMission);
    if (enqueue) enqueue.addEventListener('click', executeMission);
    if (github) {
      github.addEventListener('click', () => {
        showLog('GITHUB', 'criação de PR bloqueada no frontend; use fluxo servidor autorizado', 'yellow');
      });
    }
  }

  function initGateway() {
    window.RUNTIME_CONFIG = { API_BASE_URL: GATEWAY };
    window.API_BASE_URL = GATEWAY;
    window.__VISION_API__ = GATEWAY;
    window.API = GATEWAY;
    window.getVisionApi = apiBase;
  }

  function initPipelineHelpers() {
    const stages = ['Scanner', 'Hermes', 'PatchEngine', 'Aegis', 'PASS GOLD', 'PR GitHub'];
    window.v236SetPipelineStage = window.v236SetPipelineStage || function (stage, status) {
      document.querySelectorAll('.v236-tl-step').forEach((el) => {
        const current = el.dataset.stage || el.textContent.trim();
        if (current === stage) {
          el.classList.remove('running', 'done', 'fail');
          el.classList.add(status === 'fail' ? 'fail' : status === 'done' ? 'done' : 'running');
        }
      });
    };
    window.v236ResetPipeline = window.v236ResetPipeline || function () {
      document.querySelectorAll('.v236-tl-step').forEach((el) => el.classList.remove('running', 'done', 'fail'));
    };
    if (typeof window.v236ResetPipeline === 'function') window.v236ResetPipeline();
    stages.forEach((stage) => paintPipeline(stage, 'ready'));
  }

  async function init() {
    initGateway();
    initPipelineHelpers();
    bindButtons();
    await Promise.allSettled([loadProjects(), loadScore(), loadMetrics(), loadVotes(), loadWorkers(), loadPlans()]);
    setRuntimeState('stable');
    window.VisionRuntimeOwner = Object.freeze({ executeMission, closeStream, apiUrl });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
