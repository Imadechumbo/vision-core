/**
 * VISION CORE V3.4 — ORBIT OBSERVER
 * ─────────────────────────────────────────────────────────────────
 * RUNTIME ROLE  : observer / orbit-visual
 * OWNER         : false
 * DOMAINS       : orbit_visual, system_status (leitura)
 * DEPENDS ON    : window.__V32_OWNER__ = true
 *
 * REGRAS (SDDF SPEC V8.1.0):
 * - Nunca chamar doReport, fetchReport, buildReport, triggerReport
 * - Nunca criar EventSource
 * - Nunca chamar /run-live
 * - Nunca registrar execução
 * - Nunca emitir PASS GOLD
 * - Observa window.__VISION_SSE__ para animar mc-nodes
 * - Faz polling de /api/runtime/harness-stats e /api/workers/status
 * - MutationObserver no chat: detecta "PASS GOLD" para acender
 *   node visual APENAS — não chama report
 * ─────────────────────────────────────────────────────────────────
 */
(function VCORV34() {
  'use strict';

  /* ── GUARD ── */
  if (window.__V34__) return;
  window.__V34__ = true;

  var API = (window.__VISION_API__ || window.API_BASE_URL || '').replace(/\/$/, '');
  function apiUrl(p) { return API + p; }

  /* ── STAGE → DATA-KEY MAP ── */
  var STAGE_KEY = {
    openclaw: 'openclaw',
    scanner: 'scanner',
    hermes: 'hermes',
    patchengine: 'patchengine',
    patch: 'patchengine',
    aegis: 'aegis',
    sddf: 'aegis',
    'pass gold': 'passgold',
    passgold: 'passgold',
    pass_gold: 'passgold',
    github: 'github',
    pr: 'github'
  };

  var NODE_COLOR = {
    openclaw: '#a855f7',
    scanner: '#22c55e',
    hermes: '#f59e0b',
    patchengine: '#22d3ee',
    aegis: '#22c55e',
    passgold: '#facc15',
    github: '#94a3b8'
  };

  var _orbitStart = null;

  function resolveKey(stage) {
    if (!stage) return null;
    var s = String(stage).toLowerCase().replace(/[\s_-]+/g, '');
    if (STAGE_KEY[s]) return STAGE_KEY[s];
    for (var k in STAGE_KEY) {
      if (s.indexOf(k.replace(/[\s_-]+/g, '')) !== -1) return STAGE_KEY[k];
    }
    return null;
  }

  function elapsedSec() {
    if (!_orbitStart) return '—';
    return ((Date.now() - _orbitStart) / 1000).toFixed(1) + 's';
  }

  /* ── ORBIT NODE ANIMATION ── */
  function orbitActivate(key, state) {
    var node = document.querySelector('[data-key="' + key + '"]');
    if (!node) return;
    node.classList.remove('v33-idle', 'v33-running', 'v33-done', 'v33-fail');
    node.classList.add('v33-' + state);

    var color = NODE_COLOR[key] || '#a855f7';
    var icon = node.querySelector('.mc-node-icon');
    if (icon) {
      icon.style.borderColor = color;
      icon.style.boxShadow = state === 'running'
        ? '0 0 12px 3px ' + color + '88'
        : state === 'done' ? '0 0 8px 2px ' + color + '55' : '';
    }

    var label = node.querySelector('.mc-node-label');
    if (label) {
      label.style.color = state === 'idle' ? '' : color;
    }

    var small = node.querySelector('small');
    if (small) {
      small.textContent = state === 'running'
        ? 'LIVE · ' + elapsedSec()
        : state === 'done' ? 'PASS · ' + elapsedSec()
        : state === 'fail' ? 'FAIL · ' + elapsedSec()
        : 'AGUARDA';
    }
  }

  /* ── STICKY FIX ── */
  function fixSticky() {
    var panel = document.getElementById('agentDownload');
    if (!panel) return;
    panel.style.position = 'sticky';
    panel.style.top = '24px';
    panel.style.alignSelf = 'flex-start';
    var aside = panel.closest('aside');
    if (aside) aside.style.alignItems = 'flex-start';
  }

  /* ── SYSTEM STATUS POLLING ── */
  var _pollTimer = null;

  function updateSystemStatus() {
    Promise.all([
      fetch(apiUrl('/api/runtime/harness-stats')).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
      fetch(apiUrl('/api/workers/status')).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
    ]).then(function (results) {
      var stats   = results[0];
      var workers = results[1];

      /* SSE state derivado do singleton do V32 */
      var sseActive = !!(window.__VISION_SSE__ && window.__VISION_SSE_LOCK__);

      /* Atualiza elementos de status se existirem */
      var sseEl = document.getElementById('v34SseStatus');
      if (sseEl) sseEl.textContent = sseActive ? 'LIVE' : 'IDLE';

      var workersEl = document.getElementById('v34WorkersStatus');
      if (workersEl && workers) {
        workersEl.textContent = workers.active_count != null
          ? workers.active_count + ' worker(s) ativos'
          : JSON.stringify(workers).slice(0, 60);
      }

      var harnessEl = document.getElementById('v34HarnessStatus');
      if (harnessEl && stats) {
        harnessEl.textContent = stats.status || JSON.stringify(stats).slice(0, 60);
      }
    });
  }

  /* ── OBSERVE SSE VIA PROXY DO V32 ── */
  /*
   * V32 expõe window.__VISION_SSE__ (o EventSource ativo).
   * V34 lê os eventos via listener no objeto, sem criar novo EventSource.
   * Polling a cada 1.5s para detectar quando V32 abre SSE.
   */
  var _sseObserved = null;

  function observeV32SSE() {
    var es = window.__VISION_SSE__;
    if (!es || es === _sseObserved) return;
    _sseObserved = es;
    _orbitStart = Date.now();

    /* Resetar todos os nodes para idle */
    Object.values(NODE_COLOR).forEach(function (_, i) {
      var keys = Object.keys(NODE_COLOR);
      orbitActivate(keys[i], 'idle');
    });

    es.addEventListener('step', function (ev) {
      try {
        var data = JSON.parse(ev.data || '{}');
        var key = resolveKey(data.stage);
        if (key) orbitActivate(key, 'running');
      } catch (e) { /* ignorar parse error */ }
    });

    es.addEventListener('done', function (ev) {
      try {
        var data = JSON.parse(ev.data || '{}');
        /* Animar node final como done — V32 cuida do report */
        var key = resolveKey((data && data.stage) || 'passgold');
        if (key) orbitActivate(key, 'done');
      } catch (e) {
        orbitActivate('passgold', 'done');
      }
    });

    es.addEventListener('error', function () {
      console.log('[V34] SSE erro detectado — V32 controla retry');
    });
  }

  /* ── MUTATION OBSERVER: detecta PASS GOLD no chat para visual ── */
  /*
   * Apenas acende o node visual passgold.
   * NÃO chama fetchReport, doReport, buildReport nem triggerReport.
   */
  function watchChatForPassGold() {
    var chatEl = document.getElementById('v298ChatStream')
      || document.getElementById('v297ChatLog')
      || document.getElementById('mcChat');
    if (!chatEl) return;

    var obs = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        m.addedNodes.forEach(function (node) {
          if (node.textContent && /PASS.?GOLD/i.test(node.textContent)) {
            /* Apenas animação visual — report é responsabilidade do V32 */
            orbitActivate('passgold', 'done');
          }
        });
      });
    });

    obs.observe(chatEl, { childList: true, subtree: true });
  }

  /* ── INIT ── */
  document.addEventListener('DOMContentLoaded', function () {
    if (!window.__V32_OWNER__) {
      console.warn('[V34] __V32_OWNER__ não detectado — modo standby');
      return;
    }

    console.log('[V34] orbit observer ativo — V32 é execution/sse/report owner');

    fixSticky();
    watchChatForPassGold();

    /* Poll para observar SSE do V32 e status do sistema */
    _pollTimer = setInterval(function () {
      observeV32SSE();
      updateSystemStatus();
    }, 1500);

    /* Cleanup ao sair */
    window.addEventListener('beforeunload', function () {
      clearInterval(_pollTimer);
    });
  });

})();
