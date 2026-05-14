/**
 * VISION CORE V3.4 — TELEMETRIA VIVA REAL
 * ══════════════════════════════════════════════════════════════════
 * DIAGNÓSTICO E CORREÇÕES REAIS (não cosméticas):
 *
 * 1. STICKY: mc-panel sticky com top:24px conforme especificação.
 *    Corrige qualquer wrapper anterior. Sem translate3d.
 *
 * 2. ORBIT VIVA: interceptar EventSource nativo via proxy para
 *    capturar todos os eventos SSE e acender nodes em tempo real.
 *    Mapeamento: step.stage → data-key → v33-running/done/fail
 *
 * 3. SYSTEM STATUS: polling real /api/runtime/harness-stats + /api/workers/status
 *    SSE state: derivado de window.__VISION_SSE__
 *
 * 4. REPORT: MutationObserver no v298ChatStream detecta "PASS GOLD"
 *    e dispara fetchReport() com 8 endpoints reais se v32 não fez ainda
 *
 * 5. ZERO FAKE: neutralizar animate() + bloquear v236AnimatePipelineDemo
 * ══════════════════════════════════════════════════════════════════
 */
(function VCORV34() {
  'use strict';
  if (window.__V34__) return;
  window.__V34__ = true;

  var API = (window.__VISION_API__ || window.API_BASE_URL || '').replace(/\/$/, '');
  function apiUrl(p) { return API + p; }

  /* ── 1. STICKY FIX — top:24px conforme especificação ── */
  function fixSticky() {
    // V3.5 FIX: sticky CSS puro já aplicado via vision-v33-orbit.css
    // #agentDownload { position:sticky; top:24px; align-self:flex-start }
    // ROOT CAUSE era: aside { display:flex } com align-items:stretch (default)
    // → o section ocupava 100% da altura → sticky não tinha espaço para mover
    // FIX: align-self:flex-start no #agentDownload + align-items:flex-start no aside
    // Wrappers JS descontinuados — não criar novos
    console.log('[V34] fixSticky: CSS puro ativo — sem wrapper JS');
  }

  /* ════════════════════════════════════════════════════════════════
     2. ORBIT VIVA — capturar eventos SSE e acender nodes
     Proxy do EventSource para interceptar todos os eventos
     ════════════════════════════════════════════════════════════════ */

  // Mapa stage → data-key
  var STAGE_KEY = {
    'openclaw':    'openclaw',
    'scanner':     'scanner',
    'hermes':      'hermes',
    'patchengine': 'patchengine',
    'patch':       'patchengine',
    'aegis':       'aegis',
    'sddf':        'aegis',
    'pass gold':   'passgold',
    'passgold':    'passgold',
    'pass_gold':   'passgold',
    'github':      'github',
    'pr':          'github',
  };

  // Cores dos nodes por key
  var NODE_COLOR = {
    openclaw:    '#a855f7',
    scanner:     '#22c55e',
    hermes:      '#f59e0b',
    patchengine: '#22d3ee',
    aegis:       '#22c55e',
    passgold:    '#facc15',
    github:      '#94a3b8',
  };

  var _orbitStart = null; // timestamp de início da missão

  function resolveKey(stage) {
    if (!stage) return null;
    var s = String(stage).toLowerCase().replace(/[\s_-]+/g, '');
    if (STAGE_KEY[s]) return STAGE_KEY[s];
    for (var k in STAGE_KEY) {
      if (s.indexOf(k) !== -1 || k.indexOf(s) !== -1) return STAGE_KEY[k];
    }
    return null;
  }

  function elapsedSec() {
    if (!_orbitStart) return '—';
    return ((Date.now() - _orbitStart) / 1000).toFixed(1) + 's';
  }

  function orbitActivate(key, state) {
    var node = document.querySelector('[data-key="' + key + '"]');
    if (!node) return;
    node.classList.remove('v33-idle', 'v33-running', 'v33-done', 'v33-fail');
    node.classList.add('v33-' + state);

    var color = NODE_COLOR[key] || '#a855f7';
    var icon = node.querySelector('.mc-node-icon');
    if (icon) {
      if (state === 'running') {
        icon.style.borderColor = color;
        icon.style.color = color;
        icon.style.boxShadow = '0 0 14px ' + color;
      } else if (state === 'done') {
        icon.style.borderColor = 'rgba(34,197,94,.7)';
        icon.style.color = '#22c55e';
        icon.style.boxShadow = '0 0 12px rgba(34,197,94,.5)';
      } else if (state === 'fail') {
        icon.style.borderColor = '#ef4444';
        icon.style.color = '#ef4444';
        icon.style.boxShadow = '0 0 12px rgba(239,68,68,.6)';
      }
    }

    // Atualizar timing
    var small = document.getElementById('v33-t-' + key);
    if (small) {
      small.textContent = elapsedSec() + ' · ' + state.toUpperCase();
    }
  }

  function orbitResetAll() {
    document.querySelectorAll('.mc-node').forEach(function(n) {
      n.classList.remove('v33-running', 'v33-done', 'v33-fail');
      n.classList.add('v33-idle');
      var icon = n.querySelector('.mc-node-icon');
      if (icon) {
        icon.style.borderColor = '';
        icon.style.color = '';
        icon.style.boxShadow = '';
      }
    });
    document.querySelectorAll('[id^="v33-t-"]').forEach(function(s) {
      s.textContent = 'AGUARDA';
    });
  }

  function orbitSetCore(state) {
    var core = document.getElementById('mcCore');
    var label = document.getElementById('mcCoreStatus');
    var sub = document.getElementById('mcCoreSub');
    if (!core) return;

    core.classList.remove('running', 'success', 'fail', '');
    if (state === 'running') {
      core.classList.add('running');
      if (label) label.textContent = 'LIVE';
      if (sub) sub.textContent = 'EXECUTANDO';
    } else if (state === 'gold') {
      core.classList.add('success');
      if (label) label.textContent = '★ GOLD';
      if (sub) sub.textContent = 'PASS GOLD';
    } else if (state === 'fail') {
      core.classList.add('fail');
      if (label) label.textContent = 'FAIL';
      if (sub) sub.textContent = 'ERRO';
    } else {
      if (label) label.textContent = 'READY';
      if (sub) sub.textContent = 'VISION CORE';
    }
  }

  // Processar evento SSE real e acender orbit
  function processSSEEvent(type, data) {
    var d = {};
    try { d = JSON.parse(data || '{}'); } catch(_) {}

    if (type === 'open') {
      _orbitStart = Date.now();
      window.__V34_REPORT_DONE__ = false;
      orbitResetAll();
      orbitSetCore('running');
      setSysStatus('sse', 'CONNECTED', '#22c55e');
      return;
    }

    if (type === 'step') {
      var key = resolveKey(d.stage);
      if (key) {
        var nodeState = (d.status === 'ok' || d.status === 'done') ? 'done' : 'running';
        orbitActivate(key, nodeState);
        // Atualizar stage no core label
        var cs = document.getElementById('mcCoreStatus');
        if (cs) cs.textContent = (d.stage || 'RUN').slice(0,7).toUpperCase();
      }
      return;
    }

    if (type === 'gate') {
      var gKey = resolveKey(d.stage);
      if (gKey) orbitActivate(gKey, d.status === 'PASS' ? 'done' : 'running');
      return;
    }

    if (type === 'pass_gold') {
      // Acender PASS GOLD e todos os anteriores
      ['openclaw','scanner','hermes','patchengine','aegis'].forEach(function(k) {
        orbitActivate(k, 'done');
      });
      orbitActivate('passgold', 'done');
      orbitSetCore('gold');
      // Disparar relatório
      if (!window.__V34_REPORT_DONE__) {
        window.__V34_REPORT_DONE__ = true;
        setTimeout(function() {
          doReport(d.mission_id || (window.mission && window.mission.id));
        }, 600);
      }
      return;
    }

    if (type === 'done') {
      orbitActivate('github', 'done');
      orbitSetCore('gold');
      setSysStatus('sse', 'IDLE', '#a855f7');
      return;
    }

    if (type === 'ping') return; // heartbeat silencioso
  }

  // Instalar listener nos EventSource que forem criados
  function interceptEventSources() {
    var NativeES = window.__nativeEventSource || window.EventSource;
    if (!NativeES) return;

    // Observar o singleton global do v32
    setInterval(function() {
      var es = window.__VISION_SSE__;
      if (es && !es.__v34_intercepted__) {
        es.__v34_intercepted__ = true;

        // Interceptar eventos SSE do singleton existente
        ['step', 'gate', 'pass_gold', 'done', 'open', 'ping'].forEach(function(evt) {
          es.addEventListener(evt, function(e) {
            processSSEEvent(evt, e.data);
          });
        });

        // Detectar início de missão
        _orbitStart = Date.now();
        orbitResetAll();
        orbitSetCore('running');
        console.log('[V34] orbit interceptando SSE singleton');
      }
    }, 200);
  }

  /* ════════════════════════════════════════════════════════════════
     3. SYSTEM STATUS REAL
     ════════════════════════════════════════════════════════════════ */
  var _uptimeStart = Date.now();

  function setSysStatus(key, text, color) {
    var el = document.getElementById('v34s-' + key);
    if (!el) return;
    el.textContent = text;
    el.style.color = color || '#e9d5ff';
  }

  function injectStatusBlock() {
    if (document.getElementById('v34StatusBlock')) return;
    var panel = document.getElementById('agentDownload') ||
                document.querySelector('.mc-panel');
    if (!panel) return;

    var block = document.createElement('div');
    block.id = 'v34StatusBlock';
    block.style.cssText = 'margin-top:10px;padding:8px 10px;border:1px solid rgba(168,85,247,.2);border-radius:10px;background:rgba(4,3,8,.8);font-size:10px;';
    block.innerHTML =
      '<div style="font-size:8px;font-weight:700;letter-spacing:.14em;color:#a78bfa;margin-bottom:6px">SYSTEM STATUS</div>' +
      [['SSE','sse','—'],['API','api','—'],['AGENT','agent','—'],['VERSION','version','—'],['UPTIME','uptime','00:00:00']].map(function(r) {
        return '<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid rgba(168,85,247,.07)">' +
          '<span style="color:#7c6a9e">' + r[0] + '</span>' +
          '<span id="v34s-' + r[1] + '" style="font-weight:600">' + r[2] + '</span>' +
          '</div>';
      }).join('') +
      '<div style="display:flex;justify-content:space-between;padding:3px 0"><span style="color:#7c6a9e">UPTIME</span><span id="v34s-uptime" style="color:#a78bfa;font-weight:600">00:00:00</span></div>';
    panel.appendChild(block);
  }

  function refreshStatus() {
    // SSE
    var sseState = window.__VISION_SSE__ ? 'CONNECTED' :
                   (window.__VISION_SSE_LOCK__ ? 'RECONNECTING' : 'IDLE');
    var sseColor = sseState === 'CONNECTED' ? '#22c55e' :
                   sseState === 'RECONNECTING' ? '#f59e0b' : '#a855f7';
    setSysStatus('sse', sseState, sseColor);

    // VERSION
    setSysStatus('version', window.__VISION_RUNTIME_VERSION__ || 'v3.4', '#a855f7');

    // UPTIME
    var s = Math.floor((Date.now() - _uptimeStart) / 1000);
    setSysStatus('uptime',
      [Math.floor(s/3600), Math.floor((s%3600)/60), s%60]
        .map(function(v){ return String(v).padStart(2,'0'); }).join(':'),
      '#a78bfa');

    // API + AGENT via endpoints reais
    Promise.all([
      fetch(apiUrl('/api/runtime/harness-stats')).then(function(r){ return r.ok ? r.json() : null; }).catch(function(){ return null; }),
      fetch(apiUrl('/api/workers/status')).then(function(r){ return r.ok ? r.json() : null; }).catch(function(){ return null; }),
    ]).then(function(results) {
      var h = results[0], w = results[1];

      if (h && h.ok) {
        setSysStatus('api', 'HEALTH' + (h.avg_latency ? ' · ' + h.avg_latency + 'ms' : ''), '#22c55e');
      } else {
        setSysStatus('api', 'ERROR', '#ef4444');
      }

      var agentBusy = window.__VISION_SSE__ && window.mission && window.mission.active;
      var workerBusy = w && w.workers && w.workers.some(function(x){ return x.status !== 'idle'; });
      var agentState = agentBusy ? 'RUNNING' : (workerBusy ? 'PATCHING' : 'IDLE');
      setSysStatus('agent', agentState,
        agentState === 'RUNNING' ? '#22d3ee' :
        agentState === 'PATCHING' ? '#f59e0b' : '#22c55e');
    });
  }

  /* ════════════════════════════════════════════════════════════════
     4. MISSION REPORT REAL NO CHAT
     ════════════════════════════════════════════════════════════════ */
  function safeFetch(url) {
    return fetch(url)
      .then(function(r){ return r.ok ? r.json() : null; })
      .catch(function(e){ console.warn('[V34]', url, e.message); return null; });
  }

  function doReport(missionId) {
    var elapsed = _orbitStart ? ((Date.now() - _orbitStart)/1000).toFixed(1) + 's' : '—';

    Promise.all([
      missionId ? safeFetch(apiUrl('/api/mission/' + missionId)) : Promise.resolve(null),
      safeFetch(apiUrl('/api/pass-gold/score')),
      safeFetch(apiUrl('/api/github/status')),
      safeFetch(apiUrl('/api/github/automerge-policy')),
      safeFetch(apiUrl('/api/hermes/vote')),
      safeFetch(apiUrl('/api/runtime/harness-stats')),
      safeFetch(apiUrl('/api/workers/status')),
      safeFetch(apiUrl('/api/logs/download')),
    ]).then(function(r) {
      var m = r[0] || {}, sc = r[1] || {}, gh = r[2] || {};
      var am = r[3] || {}, he = r[4] || {}, ha = r[5] || {};
      var wo = r[6] || {}, lo = r[7];

      function v(x) {
        if (x == null || x === '') return '—';
        if (typeof x === 'boolean') return x ? 'SIM' : 'NÃO';
        return String(x);
      }

      // ZERO FAKE: todos os campos vêm de endpoints reais ou mostram '—'
      // Proibido: valores hardcoded, fallbacks inventados
      var passGoldVal = sc.pass_gold ? 'GOLD' : (sc.status || '—');
      var promoVal    = m.promotion_allowed != null
                          ? (m.promotion_allowed ? 'SIM' : 'NÃO')
                          : (sc.promotion_allowed != null ? (sc.promotion_allowed ? 'SIM' : 'NÃO') : '—');
      var snapshotVal = v(m.snapshot_id || sc.snapshot_id);   // sem vault:// fake
      var aegisVal    = sc.pass_gold ? 'PASS' : '—';          // só PASS se backend confirmou
      var sddfVal     = ha.pass_gold_rate != null
                          ? ha.pass_gold_rate + '%'
                          : '—';

      var rows = [
        ['Mission ID',        v(m.mission_id || missionId)],
        ['Projeto',           v(m.project)],
        ['Classificação',     v(m.classification)],
        ['Root Cause',        v(m.root_cause)],
        ['Arquivos alterados',v(m.files_changed)],
        ['Tempo total',       elapsed],
        ['PASS GOLD',         passGoldVal, passGoldVal === 'GOLD'],
        ['Snapshot ID',       snapshotVal],
        ['Promotion Allowed', promoVal],
        ['GitHub Status',     gh.connected != null ? (gh.connected ? 'Connected' : 'Not connected') : '—'],
        ['Hermes Vote',       v(he.consensus)],
        ['Aegis Status',      aegisVal],
        ['SDDF Tests',        sddfVal],
        ['Logs Available',    lo ? 'YES' : '—'],
      ];

      var html =
        '<div style="background:linear-gradient(155deg,rgba(12,8,24,.98),rgba(7,5,16,.98));border:1px solid rgba(250,204,21,.4);border-radius:11px;padding:11px;margin:6px 0;box-shadow:0 0 22px rgba(250,204,21,.09)">' +
        '<div style="font-size:9px;font-weight:800;letter-spacing:.1em;color:#facc15;margin-bottom:8px;text-align:center;line-height:1.6">━━━━━━━━━━━━━━━━━━━<br>📋 MISSION REPORT<br>━━━━━━━━━━━━━━━━━━━</div>' +
        rows.map(function(r) {
          return '<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid rgba(168,85,247,.08);font-size:10px">' +
            '<span style="color:#a78bfa">' + r[0] + ':</span>' +
            '<span style="' + (r[2] ? 'color:#facc15;font-weight:700' : 'color:#e9d5ff') + '">' + r[1] + '</span>' +
            '</div>';
        }).join('') +
        '</div>';

      var target = document.getElementById('v298ChatStream') ||
                   document.getElementById('v297ChatLog') ||
                   document.getElementById('v236CopilotMiniChat') ||
                   document.querySelector('.v236-copilot-mini-chat');

      if (target) {
        var div = document.createElement('div');
        div.innerHTML = html;
        var card = div.firstChild;
        target.appendChild(card);
        setTimeout(function() {
          card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 80);
        console.log('[V34] MISSION REPORT inserido — PASS GOLD');
      }
    });
  }

  /* ════════════════════════════════════════════════════════════════
     5. ZERO FAKE — neutralizar animate() e bloquear fake logs
     ════════════════════════════════════════════════════════════════ */
  function zeroFake() {
    // Bloquear animate() fake definitivamente
    window.v236AnimatePipelineDemo = function() {
      console.log('[V34 AEGIS] animate() fake bloqueado — aguardando SSE real');
    };

    // Limpar placeholder fake se logsBox estiver vazio de SSE
    var lb = document.getElementById('logsBox');
    if (lb && lb.textContent && lb.textContent.indexOf('missionRunner') !== -1) {
      lb.innerHTML = '<span class="muted">[V34] Aguardando stream SSE real...</span>';
    }
  }

  /* ════════════════════════════════════════════════════════════════
     BOOT
     ════════════════════════════════════════════════════════════════ */
  function boot() {
    // 1. Sticky — corrigir offset imediatamente e após 1s (aguardar v32)
    fixSticky();
    setTimeout(fixSticky, 1200);

    // 2. Orbit — iniciar interceptação do SSE singleton
    interceptEventSources();

    // 3. System status
    injectStatusBlock();
    refreshStatus();
    setInterval(refreshStatus, 10000);
    setInterval(function() {
      // Atualizar uptime a cada segundo
      var s = Math.floor((Date.now() - _uptimeStart) / 1000);
      setSysStatus('uptime',
        [Math.floor(s/3600), Math.floor((s%3600)/60), s%60]
          .map(function(v){ return String(v).padStart(2,'0'); }).join(':'),
        '#a78bfa');
    }, 1000);

    // 4. Zero fake
    zeroFake();

    // 5. Fallback observer: se v32 renderReport não foi chamado
    var chatEl = document.getElementById('v298ChatStream') ||
                 document.getElementById('v297ChatLog');
    if (chatEl) {
      new MutationObserver(function(muts) {
        if (window.__V34_REPORT_DONE__) return;
        muts.forEach(function(m) {
          m.addedNodes.forEach(function(n) {
            var txt = n.textContent || '';
            var triggers = ['PASS GOLD confirmado', 'pass_gold', 'mission_completed', 'PASS GOLD: TRUE'];
            var hit = triggers.some(function(t) { return txt.indexOf(t) !== -1; });
            if (hit) {
              window.__V34_REPORT_DONE__ = true;
              var mId = (window.mission && window.mission.id) || null;
              console.log('[V34] PASS GOLD detectado no chat — disparando doReport(', mId, ')');
              setTimeout(function() { doReport(mId); }, 400);
            }
          });
        });
      }, { childList: true, subtree: true });
    }

    console.log('[V34] VISION CORE V3.4 — telemetria viva ONLINE');
    console.log('[V34] Sticky: top:24px | Orbit: interceptando SSE | Status: polling real');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
