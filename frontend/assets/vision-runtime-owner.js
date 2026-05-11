/**
 * VISION CORE V8.2 — RUNTIME OWNER (ÚNICO)
 * ─────────────────────────────────────────────────────────────────
 * SOLE OWNER OF:
 *   execution   → POST /api/run-live
 *   sse         → GET  /api/run-live-stream (EventSource)
 *   report      → Mission Report / PASS GOLD / INCOMPLETE / FAIL
 *
 * SDDF SPEC V8.1.0 — nenhum outro arquivo pode fazer o acima.
 * Observers só lêem window.__V32_OWNER__, window.__VISION_SSE__,
 * window.__VISION_MISSION_STATE__ para animar UI.
 * ─────────────────────────────────────────────────────────────────
 */
(function VisionRuntimeOwner() {
  'use strict';

  /* ── SINGLETON ── */
  if (window.__VRO_LOADED__) return;
  window.__VRO_LOADED__  = true;
  window.__V32_OWNER__   = true;   // sinaliza ownership para observers

  /* ── API ── */
  var GATEWAY = 'https://visioncore-api-gateway.weiganlight.workers.dev';
  window.__VISION_API__ = window.__VISION_API__ || GATEWAY;
  window.API_BASE_URL   = window.API_BASE_URL   || GATEWAY;
  window.API            = window.API            || GATEWAY;

  var API = (window.__VISION_API__ || GATEWAY).replace(/\/$/, '');

  function apiUrl(p) {
    p = String(p || '').replace(/\/api\/api\//g, '/api/');
    if (/^https?:\/\//.test(p)) return p;
    if (p.indexOf('/api') === 0) return API + p;
    return API + '/api' + (p.charAt(0) === '/' ? p : '/' + p);
  }
  window.VisionCoreRuntime = { apiUrl: apiUrl };

  /* ── ESTADO DE MISSÃO (acessível a observers) ── */
  var STATE = {
    active:    false,
    missionId: null,
    start:     null,
    steps:     []
  };
  window.__VISION_MISSION_STATE__ = STATE;

  /* ── SSE SINGLETON ── */
  window.__VISION_SSE__      = window.__VISION_SSE__      || null;
  window.__VISION_SSE_LOCK__ = window.__VISION_SSE_LOCK__ || false;

  /* ── BRIDGE: escrever no chat UI (exposto pelo vision-ui-command.js) ── */
  function chat(type, text) {
    if (typeof window.__VISION_APPEND_CHAT__ === 'function') {
      window.__VISION_APPEND_CHAT__(type, text);
    }
    // fallback logsBox
    var lb = document.getElementById('logsBox');
    if (lb) {
      lb.classList.remove('empty');
      var d = document.createElement('div');
      d.className = type || '';
      d.textContent = '[' + new Date().toLocaleTimeString() + '] ' + String(text || '');
      lb.appendChild(d);
      lb.scrollTop = lb.scrollHeight;
    }
  }

  /* ── HELPERS DE REDE ── */
  var _nativeFetch = window.fetch.bind(window);

  async function postJson(path, payload) {
    var url = apiUrl(path);
    try {
      var r = await _nativeFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || {})
      });
      var txt = await r.text();
      try { return JSON.parse(txt || '{}'); } catch { return { ok: false, raw: txt, status: r.status }; }
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  /* ── CLOSE SSE ── */
  function closeSSE() {
    if (window.__VISION_SSE__) {
      try { window.__VISION_SSE__.close(); } catch (_) {}
      window.__VISION_SSE__ = null;
    }
    window.__VISION_SSE_LOCK__ = false;
  }

  /* ── STAGE MAP ── */
  var STAGE_MAP = {
    openclaw:'openclaw', input:'openclaw', mission:'openclaw',
    scanner:'scanner',   scan:'scanner',
    hermes:'hermes',     rca:'hermes',     diagnosis:'hermes',
    patchengine:'patchengine', patch:'patchengine',
    aegis:'aegis',       sddf:'aegis',     security:'aegis',
    passgold:'passgold', pass_gold:'passgold', 'pass gold':'passgold', gold:'passgold',
    github:'github',     pr:'github'
  };
  function resolveKey(stage) {
    if (!stage) return null;
    var s = String(stage).toLowerCase().replace(/[\s_-]+/g,'');
    return STAGE_MAP[s] || STAGE_MAP[String(stage).toLowerCase()] || null;
  }

  /* ── ORBIT / PIPELINE HELPERS (anima mc-nodes sem os observer files) ── */
  function setNodeState(key, state) {
    var n = document.querySelector('.mc-node[data-key="' + key + '"]');
    if (!n) return;
    n.classList.remove('v33-idle','v33-running','v33-done','v33-fail');
    n.classList.add('v33-' + state);
    var sm = n.querySelector('small');
    if (sm) sm.textContent = state === 'done' ? 'PASS' : state === 'fail' ? 'FAIL' : state === 'running' ? 'LIVE' : 'AGUARDA';
  }
  function setCoreState(s) {
    var c = document.getElementById('mcCore');
    if (!c) return;
    c.classList.remove('running','success','fail');
    if (s === 'running') c.classList.add('running');
    if (s === 'gold')    c.classList.add('success');
    if (s === 'fail')    c.classList.add('fail');
    var st = document.getElementById('mcCoreStatus');
    var sb = document.getElementById('mcCoreSub');
    if (st) st.textContent = s === 'gold' ? '★ GOLD' : s === 'running' ? 'LIVE' : s === 'fail' ? 'FAIL' : 'READY';
    if (sb) sb.textContent = s === 'gold' ? 'PASS GOLD' : s === 'running' ? 'EXECUTANDO' : s === 'fail' ? 'ERRO' : 'VISION CORE';
  }
  function setPipelineBadge(key, status) {
    var el = document.querySelector('.mc-ps-badge[data-node="' + key + '"]');
    if (el) el.textContent = status;
  }
  function setTimeline(stage, status) {
    var aliases = {'Patch':'PatchEngine','pass_gold':'PASS GOLD','PASS_GOLD':'PASS GOLD'};
    var norm = aliases[stage] || stage;
    document.querySelectorAll('.v236-tl-step').forEach(function(el) {
      if (el.dataset.stage !== norm) return;
      el.classList.remove('running','done','fail','gold');
      if (status === 'running') el.classList.add('running');
      else if (status === 'fail' || status === 'error') el.classList.add('fail');
      else if (norm === 'PASS GOLD') el.classList.add('gold');
      else el.classList.add('done');
      var sm = el.querySelector('small');
      if (sm) sm.textContent = status === 'fail' ? 'erro' : norm === 'PASS GOLD' ? 'GOLD' : 'ok';
    });
  }

  /* ── SSE ── */
  function startSSE(missionText) {
    if (window.__VISION_SSE_LOCK__ || STATE.active) return;
    closeSSE();
    STATE.active = true;
    STATE.start  = Date.now();
    STATE.steps  = [];
    setCoreState('running');

    var url = apiUrl('/api/run-live-stream') + '?mission=' + encodeURIComponent(missionText || 'mission');

    /* Usa EventSource nativo via flag para não ser bloqueado pelo proxy */
    var NativeES = window.__nativeEventSource || window.EventSource;
    window.__V32_CALLING__ = true;
    var es;
    try { es = new NativeES(url); } finally { window.__V32_CALLING__ = false; }
    window.__VISION_SSE__ = es;
    window.__VISION_SSE_LOCK__ = true;

    function elapsed() { return ((Date.now() - STATE.start) / 1000).toFixed(1); }

    es.onopen = function() {
      window.__VISION_SSE_LOCK__ = false;
      console.log('[VRO] SSE conectado:', url);
    };

    es.addEventListener('step', function(ev) {
      try {
        var d = JSON.parse(ev.data || '{}');
        var k = resolveKey(d.stage);
        STATE.steps.push(d);
        if (k) setNodeState(k, 'running');
        setTimeline(d.stage || '', 'running');
        chat('system', '▸ ' + (d.stage || 'step') + ': ' + (d.message || d.status || 'ok'));
      } catch(e) {}
    });

    es.addEventListener('gate', function(ev) {
      try {
        var d = JSON.parse(ev.data || '{}');
        var k = resolveKey(d.stage);
        if (k) setNodeState(k, d.status === 'fail' ? 'fail' : 'done');
        setTimeline(d.stage || '', d.status || 'done');
      } catch(e) {}
    });

    es.addEventListener('pass_gold', function(ev) {
      try {
        var d = JSON.parse(ev.data || '{}');
        if (!STATE.missionId && d.mission_id) STATE.missionId = d.mission_id;
        setCoreState('gold');
        chat('gold', '★ PASS GOLD — pipeline validado em ' + elapsed() + 's');
        fetchReport(STATE.missionId);
      } catch(e) {}
    });

    es.addEventListener('done', function(ev) {
      try {
        var d = JSON.parse(ev.data || '{}');
        if (!STATE.missionId && d.mission_id) STATE.missionId = d.mission_id;
        setCoreState('gold');
        chat('system', '✓ Missão concluída em ' + elapsed() + 's');
        fetchReport(STATE.missionId);
      } catch(e) {}
      closeSSE();
      STATE.active = false;
    });

    es.addEventListener('ping', function() {});

    es.onerror = function() {
      if (es.readyState === 2) {
        chat('error', 'SSE encerrado — verifique o backend');
        setCoreState('fail');
        closeSSE();
        STATE.active = false;
      }
    };
  }

  /* ── REPORT TRUTH GATE ── */
  function renderReport(data, elapsed) {
    function val(v) {
      if (v == null || v === '') return '—';
      if (typeof v === 'boolean') return v ? 'SIM' : 'NÃO';
      return String(v);
    }

    /* Truth gate SDDF SPEC V8.1.0 */
    var hasProject   = data.project    && data.project    !== '—';
    var hasRootCause = data.root_cause  && data.root_cause  !== '—';
    var hasFiles     = data.files_changed != null && data.files_changed !== '—' && data.files_changed !== 0;
    var hasMissionId = (data.mission_id || STATE.missionId) && (data.mission_id || STATE.missionId) !== '—';
    var evidenceOk   = hasProject && hasRootCause && hasFiles && hasMissionId;

    var backendGold = !!(data.pass_gold_status || data.pass_gold_final || data.pass_gold);
    var truthGold   = backendGold && evidenceOk;

    var gateStatus  = truthGold ? 'PASS GOLD'
      : backendGold && !evidenceOk ? 'INCOMPLETE — evidence missing'
      : data.pass_gold_status || '—';

    var promoAllowed = truthGold && data.promotion_allowed === true ? 'SIM' : 'NÃO';
    var hermesVote   = evidenceOk ? val(data.hermes_consensus)
      : 'BLOCKED — evidence missing';

    var rows = [
      ['Mission ID',         val(data.mission_id || STATE.missionId)],
      ['Projeto',            val(data.project)],
      ['Classificação',      val(data.classification)],
      ['Root Cause',         val(data.root_cause)],
      ['Arquivos alterados', val(data.files_changed)],
      ['Tempo total',        elapsed || '—'],
      ['Gate Status',        gateStatus, truthGold],
      ['Snapshot ID',        val(data.snapshot_id)],
      ['Promotion Allowed',  promoAllowed],
      ['Hermes Vote',        hermesVote],
      ['SDDF Tests',         val(data.sddf_evidence)],
      ['Logs Available',     data.logs_available === 'SIM' ? 'YES' : '—'],
    ];

    var html = '<div class="v33-report">' +
      '<div class="v33-report-title">━━━━━━━━━━━━━━━━━━━<br>📋 MISSION REPORT<br>━━━━━━━━━━━━━━━━━━━</div>' +
      rows.map(function(r) {
        return '<div class="v33-report-row">' +
          '<span class="v33-report-lbl">' + r[0] + ':</span>' +
          '<span class="v33-report-val' + (r[2] ? ' v33-report-gold' : '') + '">' + r[1] + '</span>' +
          '</div>';
      }).join('') + '</div>';

    /* Inserir no chat via bridge */
    var stream = document.getElementById('v298ChatStream');
    if (stream) {
      var wrap = document.createElement('div');
      wrap.innerHTML = html;
      var card = wrap.firstChild;
      var hint = stream.querySelector('.v298-empty-hint');
      if (hint) hint.remove();
      stream.appendChild(card);
      setTimeout(function() { card.scrollIntoView({ behavior:'smooth', block:'nearest' }); }, 80);
    }
    console.log('[VRO] Mission Report inserido — gate:', gateStatus);
  }

  /* ── FETCH REPORT ── */
  function fetchReport(missionId) {
    var elapsed = STATE.start ? ((Date.now() - STATE.start) / 1000).toFixed(1) + 's' : '—';
    if (!missionId) { renderReport({}, elapsed); return; }

    Promise.all([
      postJson('/api/mission/' + missionId),
      postJson('/api/pass-gold/score')
    ]).then(function(r) {
      var m = r[0] || {}, sc = r[1] || {};
      renderReport({
        mission_id:        m.mission_id    || missionId,
        project:           m.project       || '—',
        classification:    m.classification|| '—',
        root_cause:        m.root_cause    || '—',
        files_changed:     m.files_changed,
        snapshot_id:       m.snapshot_id   || sc.snapshot_id,
        pass_gold_status:  sc.status,
        pass_gold_final:   sc.final,
        promotion_allowed: m.promotion_allowed != null ? m.promotion_allowed : sc.promotion_allowed,
        hermes_consensus:  (r[2] || {}).consensus,
        sddf_evidence:     m.sddf_evidence,
        logs_available:    m.logs_available
      }, elapsed);
    }).catch(function() {
      renderReport({ mission_id: missionId }, elapsed);
    });
  }

  /* ── RUN MISSION ── */
  function runMission(missionText) {
    if (!missionText || !missionText.trim()) return;
    if (STATE.active) {
      chat('system', 'Missão já em execução. Aguarde.');
      return;
    }

    STATE.missionId = null;
    chat('system', '⚡ Iniciando missão SDDF...');
    setCoreState('running');

    _nativeFetch(apiUrl('/api/run-live'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mission: missionText.trim(), mode: 'dry-run', project_id: 'vision-core' })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (d.mission_id) STATE.missionId = d.mission_id;
      chat('system', 'Missão aceita: ' + (d.mission_id || 'sem id'));
      startSSE(missionText);
    })
    .catch(function(err) {
      chat('error', 'run-live falhou: ' + err.message);
      setCoreState('fail');
      STATE.active = false;
    });
  }

  /* ── EXPOR PARA UI ── */
  window.__VRO_RUN_MISSION__ = runMission;

  /* ── BLOQUEAR window.startSSE (noop — nunca usar externamente) ── */
  window.startSSE         = function() { console.log('[VRO] window.startSSE bloqueado — use execBtn'); };
  window.__V32_startSSE__ = startSSE;  // referência interna direta

  /* ── HOOK executeBtn ── */
  function hookButton() {
    var btn = document.getElementById('executeBtn');
    if (!btn || btn.__vro_hooked__) return;
    btn.__vro_hooked__ = true;
    btn.addEventListener('click', function() {
      /* Prioridade: bridge V298 → #v298Prompt → #missionText */
      var text = '';
      if (typeof window.__VISION_GET_CHAT_TEXT__ === 'function') text = window.__VISION_GET_CHAT_TEXT__();
      if (!text) {
        var ta = document.getElementById('v298Prompt') ||
                 document.getElementById('missionText') ||
                 document.querySelector('textarea.mission');
        text = ta ? ta.value.trim() : '';
      }
      if (!text) return;
      setTimeout(function() { runMission(text); }, 50);
    }, true);
  }

  /* ── INIT ── */
  function boot() {
    hookButton();
    setCoreState('idle');
    console.log('[VRO] Vision Runtime Owner v8.2 ativo — único execution/sse/report owner');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})();
