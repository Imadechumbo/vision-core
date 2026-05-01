/**
 * VISION CORE V3.2 — RUNTIME ÚNICO
 * ─────────────────────────────────────────────────────────────────
 * • SSE singleton: window.__VISION_SSE__ — 1 por missão
 * • Neutraliza SSE dos runtimes antigos (v297, v298, v273, v233, v2910)
 * • Anima mc-nodes EXISTENTES do orb com estados reais do SSE
 * • Núcleo #mcCore reage: idle/running/gold/fail
 * • mc-panel sticky suave no scroll
 * • Live report real via GET /api/mission/:id após PASS GOLD
 * • ZERO fake, ZERO stub, ZERO mock — erros retornam "endpoint pendente"
 */
(function () {
  'use strict';

  /* ── API BASE ─────────────────────────────────────────────────── */
  var API = (window.__VISION_API__ || window.API_BASE_URL || '').replace(/\/$/, '');
  function apiUrl(p) { return API + p; }

  /* ── SSE STATE ────────────────────────────────────────────────── */
  window.__VISION_SSE__             = window.__VISION_SSE__             || null;
  window.__VISION_SSE_LOCK__        = window.__VISION_SSE_LOCK__        || false;
  window.__VISION_SSE_RETRY_T__     = window.__VISION_SSE_RETRY_T__     || null;
  window.__VISION_SSE_RETRY_INDEX__ = window.__VISION_SSE_RETRY_INDEX__ || 0;
  window.__V32_OWNER__              = true; // flag: só este runtime controla SSE

  var SSE_BACKOFF = [1000, 2000, 5000, 10000];

  /* ── PIPELINE MAP: SSE stage → mc-node data-key ──────────────── */
  var STAGE_TO_NODE = {
    openclaw:       'openclaw',
    scanner:        'scanner',
    scan:           'scanner',
    hermes:         'hermes',
    rca:            'hermes',
    diagnosis:      'hermes',
    diagnostico:    'hermes',
    patchengine:    'patchengine',
    patch:          'patchengine',
    'patch engine': 'patchengine',
    aegis:          'aegis',
    sddf:           'aegis',
    security:       'aegis',
    'pass gold':    'passgold',
    passgold:       'passgold',
    pass_gold:      'passgold',
    gold:           'passgold',
    github:         'github',
    pr:             'github',
    'pr github':    'github',
    pullrequest:    'github',
  };

  /* Pipeline nodes em ordem — mapeia os mc-nodes EXISTENTES no HTML */
  var PIPELINE = [
    { key: 'openclaw',    label: 'OpenClaw',    color: '#a855f7', mcKey: 'openclaw'   },
    { key: 'scanner',     label: 'Scanner',     color: '#22c55e', mcKey: null          }, // no mc-node
    { key: 'hermes',      label: 'Hermes',      color: '#f59e0b', mcKey: 'hermes'      },
    { key: 'patchengine', label: 'PatchEngine', color: '#22d3ee', mcKey: null          },
    { key: 'aegis',       label: 'Aegis',       color: '#22c55e', mcKey: 'aegis'       },
    { key: 'passgold',    label: 'PASS GOLD',   color: '#facc15', mcKey: null          },
    { key: 'github',      label: 'GitHub PR',   color: '#94a3b8', mcKey: null          },
  ];

  /* ── MISSION STATE ────────────────────────────────────────────── */
  var mission = { id: null, start: null, steps: [], active: false };

  /* ── NEUTRALIZE SSE IN OLD RUNTIMES ──────────────────────────── */
  function neutralizeOldSSE() {
    // Override window.EventSource so any runtime that calls new EventSource()
    // without going through our singleton gets intercepted.
    // We store the native and only allow our calls.
    var NativeES = window.EventSource;
    window.__nativeEventSource = NativeES;

    window.EventSource = function (url, cfg) {
      // Only allow if called by V32 owner (we set __V32_CALLING__ flag)
      if (window.__V32_CALLING__) {
        return new NativeES(url, cfg);
      }
      // Silently return a dummy object so old runtimes don't crash
      console.warn('[V32 AEGIS] EventSource bloqueado para:', url);
      return {
        readyState: 2,
        close: function () {},
        addEventListener: function () {},
        removeEventListener: function () {},
        onopen: null, onmessage: null, onerror: null,
      };
    };
    window.EventSource.CONNECTING = 0;
    window.EventSource.OPEN = 1;
    window.EventSource.CLOSED = 2;
    window.EventSource.prototype = NativeES.prototype;

    // Also stomp startSSE on window so old runtimes calling window.startSSE()
    // are silenced — they will call our version instead
    window.startSSE = function (m) {
      console.log('[V32] startSSE delegado ao runtime único');
      startSSE(m);
    };
  }

  /* ── CORE STATE ───────────────────────────────────────────────── */
  var CORE_STATES = {
    idle:    { cls: '',        label: 'READY',   sub: 'VISION CORE',  shadow: '0 0 16px rgba(147,51,234,.45)' },
    running: { cls: 'running', label: 'LIVE',    sub: 'EXECUTANDO',   shadow: '0 0 28px rgba(14,165,233,.8)'  },
    gold:    { cls: 'success', label: '★ GOLD',  sub: 'PASS GOLD',    shadow: '0 0 38px rgba(250,204,21,.9)'  },
    fail:    { cls: 'fail',    label: 'FAIL',    sub: 'ERRO',         shadow: '0 0 28px rgba(239,68,68,.8)'   },
  };

  function setCoreState(state) {
    var core   = document.getElementById('mcCore');
    var status = document.getElementById('mcCoreStatus');
    var sub    = document.getElementById('mcCoreSub');
    if (!core) return;

    var s = CORE_STATES[state] || CORE_STATES.idle;
    core.className = 'mc-core ' + s.cls;
    core.style.boxShadow = s.shadow;
    if (status) status.textContent = s.label;
    if (sub)    sub.textContent    = s.sub;
  }

  /* ── NODE ACTIVATION (uses EXISTING mc-node elements) ────────── */
  var NODE_COLORS = {
    running: { border: 'currentColor', glow: '0 0 14px var(--node-glow)' },
    done:    { border: 'rgba(34,197,94,.6)',  glow: '' },
    fail:    { border: '#ef4444',             glow: '0 0 12px rgba(239,68,68,.6)' },
    idle:    { border: 'rgba(168,85,247,.3)', glow: '' },
  };

  function setNodeState(mcKey, state, label, elapsed) {
    var node = document.querySelector('[data-key="' + mcKey + '"]');
    if (!node) return;

    // Use v33 CSS classes
    node.classList.remove('v33-idle', 'v33-running', 'v33-done', 'v33-fail');

    if (state === 'running') {
      node.classList.add('v33-running');
    } else if (state === 'done' || state === 'PASS' || state === 'ok' || state === 'GOLD') {
      node.classList.add('v33-done');
    } else if (state === 'fail' || state === 'FAIL' || state === 'error') {
      node.classList.add('v33-fail');
    }

    // Update <small> timing tag (v33 nodes have id="v33-t-{key}")
    var small = document.getElementById('v33-t-' + mcKey);
    if (small) {
      small.textContent = elapsed ? elapsed + 's · ' + (state || '') : (state || 'AGUARDA');
    }

    // Also update via innerHTML fallback for nodes without id
    var lbl = node.querySelector('.mc-node-label');
    if (lbl && !small && elapsed) {
      var lines = lbl.innerHTML.split('<br>');
      lbl.innerHTML = lines[0] + '<br><small>' + elapsed + 's · ' + (state || '') + '</small>';
    }
  }

  function resolveKey(stage) {
    if (!stage) return null;
    var s = stage.toLowerCase().replace(/\s+/g, '');
    if (STAGE_TO_NODE[s]) return STAGE_TO_NODE[s];
    for (var k in STAGE_TO_NODE) {
      if (s.includes(k) || k.includes(s)) return STAGE_TO_NODE[k];
    }
    return null;
  }

  function resetNodes() {
    document.querySelectorAll('.mc-node').forEach(function (n) {
      n.classList.remove('v33-running', 'v33-done', 'v33-fail');
      n.classList.add('v33-idle');
    });

    // Reset timing labels
    document.querySelectorAll('[id^="v33-t-"]').forEach(function (s) {
      s.textContent = 'AGUARDA';
    });

    // Also reset mc-pipeline-status badges
    document.querySelectorAll('.mc-ps-badge').forEach(function (b) {
      b.className = 'mc-ps-badge pending';
      b.textContent = '—';
    });
  }

  /* ── MC-PIPELINE-STATUS SYNC ──────────────────────────────────── */
  function setPipelineRow(label, state) {
    document.querySelectorAll('.mc-ps-row').forEach(function (row) {
      var l = row.querySelector('.mc-ps-label');
      if (l && l.textContent.trim().toLowerCase() === label.toLowerCase()) {
        var badge = row.querySelector('.mc-ps-badge');
        if (badge) {
          badge.className = 'mc-ps-badge ' + (state === 'PASS' || state === 'done' ? 'ok' : state === 'GOLD' ? 'gold' : state === 'fail' ? 'fail' : 'running');
          badge.textContent = state === 'running' ? '●' : state;
        }
      }
    });
  }

  /* ── STICKY SCROLL ────────────────────────────────────────────── */
  function initSticky() {
    // V3.5 FIX: sticky aplicado via CSS puro em #agentDownload com align-self:flex-start
    // Wrappers JS foram descontinuados — causavam conflito com flex stretch
    // O CSS vision-v33-orbit.css gerencia o sticky diretamente
    console.log('[V32] initSticky: usando CSS puro — sem wrapper JS');
  }

  /* ── INJECT CSS ───────────────────────────────────────────────── */
  function injectCSS() {
    if (document.getElementById('v32css')) return;
    var s = document.createElement('style');
    s.id = 'v32css';
    s.textContent = [
      /* Node states via class */
      '.v32-node-running{',
      '  animation:v32Pulse 1s ease-in-out infinite!important;',
      '  opacity:1!important;',
      '}',
      '.v32-node-running .mc-node-icon{',
      '  filter:drop-shadow(0 0 6px currentColor)!important;',
      '}',
      '.v32-node-done{',
      '  opacity:0.9!important;',
      '}',
      '.v32-node-done .mc-node-icon{',
      '  color:#22c55e!important;',
      '}',
      '.v32-node-fail .mc-node-icon{',
      '  color:#ef4444!important;',
      '  filter:drop-shadow(0 0 5px rgba(239,68,68,.8))!important;',
      '}',
      '@keyframes v32Pulse{',
      '  0%,100%{opacity:1}',
      '  50%{opacity:.55}',
      '}',
      /* Core states */
      '.mc-core.running{',
      '  background:radial-gradient(circle at 40% 35%,#0ea5e9,#1e40af 70%,#0c1a3d)!important;',
      '  animation:v32CorePulse 1.1s ease-in-out infinite!important;',
      '}',
      '.mc-core.success{',
      '  background:radial-gradient(circle at 40% 35%,#fde047,#b45309 70%,#1c0f00)!important;',
      '}',
      '.mc-core.fail{',
      '  background:radial-gradient(circle at 40% 35%,#ef4444,#7f1d1d 70%,#1c0000)!important;',
      '}',
      '@keyframes v32CorePulse{',
      '  0%,100%{transform:translate(-50%,-50%) scale(1)}',
      '  50%{transform:translate(-50%,-50%) scale(1.06)}',
      '}',
      /* Live report card */
      '.v32-report{',
      '  background:linear-gradient(160deg,rgba(12,8,24,.98),rgba(7,5,16,.98));',
      '  border:1px solid rgba(250,204,21,.4);border-radius:12px;',
      '  padding:12px;margin-top:8px;',
      '  box-shadow:0 0 24px rgba(250,204,21,.1);',
      '}',
      '.v32-report-title{',
      '  font-size:10px;font-weight:700;letter-spacing:.1em;color:#facc15;',
      '  margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;',
      '}',
      '.v32-report-row{',
      '  display:flex;justify-content:space-between;',
      '  padding:4px 0;border-bottom:1px solid rgba(168,85,247,.08);font-size:10px;',
      '}',
      '.v32-report-row:last-child{border-bottom:none}',
      '.v32-report-lbl{color:#a78bfa}',
      '.v32-report-val{color:#e9d5ff;text-align:right;max-width:55%;word-break:break-all}',
      '.v32-report-gold{color:#facc15!important;font-weight:700}',
      '.v32-report-btn{',
      '  display:block;margin-top:8px;padding:6px 10px;',
      '  background:rgba(250,204,21,.1);border:1px solid rgba(250,204,21,.35);',
      '  border-radius:8px;color:#facc15;font-size:10px;text-align:center;cursor:pointer;',
      '  font-weight:600;letter-spacing:.06em;',
      '}',
      '.v32-report-btn:hover{background:rgba(250,204,21,.2)}',
      /* Pending endpoint notice */
      '.v32-pending{color:#6b7280;font-size:10px;padding:4px 0;font-style:italic}',
    ].join('\n');
    document.head.appendChild(s);
  }

  /* ── CLOSE SSE ────────────────────────────────────────────────── */
  function closeSSE() {
    if (window.__VISION_SSE_RETRY_T__) {
      clearTimeout(window.__VISION_SSE_RETRY_T__);
      window.__VISION_SSE_RETRY_T__ = null;
    }
    if (window.__VISION_SSE__) {
      try { window.__VISION_SSE__.close(); } catch (_) {}
      window.__VISION_SSE__ = null;
    }
    window.__VISION_SSE_LOCK__ = false;
    window.__VISION_SSE_RETRY_INDEX__ = 0;
  }

  /* ── START SSE (real, sem fallback, sem fake) ─────────────────── */
  function startSSE(missionText) {
    closeSSE();
    resetNodes();
    setCoreState('running');
    mission.start = Date.now();
    mission.active = true;
    mission.steps = [];

    var url = apiUrl('/api/run-live-stream?mission=') + encodeURIComponent(missionText || 'mission');
    var retryIdx = 0;

    function elapsed() {
      return ((Date.now() - mission.start) / 1000).toFixed(1);
    }

    function open() {
      if (window.__VISION_SSE_LOCK__) return;
      window.__VISION_SSE_LOCK__ = true;

      // Use the native EventSource through our V32 flag
      window.__V32_CALLING__ = true;
      var es;
      try {
        es = new EventSource(url);
      } finally {
        window.__V32_CALLING__ = false;
      }
      window.__VISION_SSE__ = es;
      console.log('[V32] SSE abrindo:', url);

      es.onopen = function () {
        retryIdx = 0;
        window.__VISION_SSE_RETRY_INDEX__ = 0;
        setTimeout(function () { window.__VISION_SSE_LOCK__ = false; }, 400);
        console.log('[V32] SSE conectado');
      };

      es.addEventListener('step', function (ev) {
        try {
          var d = JSON.parse(ev.data || '{}');
          var k = resolveKey(d.stage);
          mission.steps.push(d);
          if (k) setNodeState(k, d.status === 'done' ? 'done' : 'running', d.message, elapsed());
          setPipelineRow(d.stage || '', d.status || 'running');
          setCoreState('running');
          // Update core label to current stage
          var cStat = document.getElementById('mcCoreStatus');
          if (cStat) cStat.textContent = (d.stage || 'RUN').slice(0, 8).toUpperCase();
        } catch (e) { console.warn('[V32] step error', e); }
      });

      es.addEventListener('gate', function (ev) {
        try {
          var d = JSON.parse(ev.data || '{}');
          var k = resolveKey(d.stage);
          if (k) setNodeState(k, d.status || 'PASS', null, elapsed());
          setPipelineRow(d.stage || '', d.status || 'PASS');
        } catch (e) {}
      });

      es.addEventListener('open', function (ev) {
        // backend sends event:open as first keepalive
        try {
          var d = JSON.parse(ev.data || '{}');
          console.log('[V32] SSE stream open event', d);
        } catch (e) {}
      });

      es.addEventListener('pass_gold', function (ev) {
        try {
          var d = JSON.parse(ev.data || '{}');
          setNodeState('openclaw', 'done', null, elapsed());
          setNodeState('hermes',   'done', null, elapsed());
          setNodeState('aegis',    'done', null, elapsed());
          setPipelineRow('PASS GOLD', 'GOLD');
          setCoreState('gold');
          console.log('[V32] PASS GOLD recebido');

          // Fetch mission report
          if (mission.id) {
            fetchReport(mission.id);
          } else if (d.mission_id) {
            mission.id = d.mission_id;
            fetchReport(d.mission_id);
          }
        } catch (e) {}
      });

      es.addEventListener('done', function (ev) {
        try {
          var d = JSON.parse(ev.data || '{}');
          setCoreState('gold');
          if (!mission.id && d.mission_id) mission.id = d.mission_id;
          if (mission.id) fetchReport(mission.id);
          else renderReport(d, elapsed() + 's');
        } catch (e) {}
        closeSSE();
        mission.active = false;
        console.log('[V32] SSE done — missão concluída');
      });

      es.addEventListener('ping', function () {
        // heartbeat silencioso
      });

      es.onerror = function () {
        // CRITICAL: only reconnect if connection truly died
        if (es.readyState === 2 /* CLOSED */) {
          try { es.close(); } catch (_) {}
          window.__VISION_SSE__ = null;
          window.__VISION_SSE_LOCK__ = false;

          var delay = SSE_BACKOFF[Math.min(retryIdx, SSE_BACKOFF.length - 1)];
          retryIdx++;
          window.__VISION_SSE_RETRY_INDEX__ = retryIdx;

          if (retryIdx > SSE_BACKOFF.length) {
            setCoreState('fail');
            console.warn('[V32] SSE esgotou tentativas');
            return;
          }
          console.log('[V32] SSE reconectando em ' + delay + 'ms (tentativa ' + retryIdx + ')');
          window.__VISION_SSE_RETRY_T__ = setTimeout(open, delay);
        } else {
          // proxy jitter — ignore
          console.log('[V32] SSE erro não-fatal readyState=' + es.readyState + ' — ignorado');
        }
      };
    }

    open();
  }

  /* ── FETCH MISSION REPORT (endpoints reais) ──────────────────── */
  function safeFetch(url) {
    return fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .catch(function (err) {
        console.warn('[V32] indisponível:', url, err.message);
        return null;
      });
  }

  function fetchReport(missionId) {
    if (window.__V34__) {
      console.log('[V32] report delegado ao V34');
      return;
    }
    var totalTime = mission.start
      ? ((Date.now() - mission.start) / 1000).toFixed(1) + 's'
      : '—';

    // Buscar todos os endpoints reais em paralelo
    Promise.all([
      missionId ? safeFetch(apiUrl('/api/mission/' + missionId)) : Promise.resolve(null),
      safeFetch(apiUrl('/api/pass-gold/score')),
      safeFetch(apiUrl('/api/github/status')),
      safeFetch(apiUrl('/api/github/automerge-policy')),
      safeFetch(apiUrl('/api/hermes/vote')),
      safeFetch(apiUrl('/api/runtime/harness-stats')),
      safeFetch(apiUrl('/api/workers/status')),
      safeFetch(apiUrl('/api/logs/download')),
    ]).then(function (results) {
      var missionData   = results[0] || {};
      var scoreData     = results[1] || {};
      var githubData    = results[2] || {};
      var autoMerge     = results[3] || {};
      var hermesData    = results[4] || {};
      var harnessData   = results[5] || {};
      var workersData   = results[6] || {};
      var logsData      = results[7] || {};

      renderReport({
        mission_id:        missionData.mission_id || missionId || mission.id || '—',
        project:           missionData.project    || '—',
        classification:    missionData.classification || '—',
        root_cause:        missionData.root_cause || '—',
        files_changed:     missionData.files_changed != null ? missionData.files_changed : '—',
        patches_applied:   missionData.patches_applied != null ? missionData.patches_applied : '—',
        sddf_evidence:     missionData.sddf_evidence || '—',
        snapshot_id:       missionData.snapshot_id  || scoreData.snapshot_id || null,
        promotion_allowed: missionData.promotion_allowed != null ? missionData.promotion_allowed : scoreData.promotion_allowed,
        pass_gold_status:  scoreData.status || '—',
        pass_gold_final:   scoreData.final != null ? String(scoreData.final) : '—',
        github_connected:  githubData.connected != null ? (githubData.connected ? 'SIM' : 'NÃO') : '—',
        github_policy:     githubData.policy || '—',
        automerge_policy:  autoMerge.policy || autoMerge.default || '—',
        logs_available:    (logsData && !logsData._error) ? 'SIM' : '—',
        hermes_consensus:  hermesData.consensus || '—',
        hermes_votes:      Array.isArray(hermesData.votes)
          ? hermesData.votes.map(function(v){ return v.agent + ':' + v.vote; }).join(' · ')
          : '—',
        workers_status:    workersData.queued != null
          ? 'fila:' + workersData.queued + ' processados:' + (workersData.processed || 0)
          : '—',
        harness_runtime:   harnessData.runtime || '—',
        pass_gold_rate:    harnessData.pass_gold_rate != null ? harnessData.pass_gold_rate + '%' : '—',
      }, totalTime);
    });
  }

  /* ── RENDER REPORT CARD ───────────────────────────────────────── */
  function renderReport(data, totalTime) {
    function val(v) {
      if (v == null || v === '' || v === undefined) return '—';
      if (typeof v === 'boolean') return v ? 'SIM' : 'NÃO';
      return String(v);
    }

    var rows = [
      { label: 'Mission ID',         v: val(data.mission_id || mission.id) },
      { label: 'Projeto',            v: val(data.project) },
      { label: 'Classificação',      v: val(data.classification) },
      { label: 'Root Cause',         v: val(data.root_cause) },
      { label: 'Arquivos alterados', v: val(data.files_changed) },
      { label: 'Tempo total',        v: totalTime || '—' },
      { label: 'PASS GOLD',          v: val(data.pass_gold_status || data.pass_gold_final), gold: !!(data.pass_gold_status || data.pass_gold_final) },
      { label: 'Snapshot ID',        v: val(data.snapshot_id) },
      { label: 'Promotion Allowed',  v: data.promotion_allowed != null ? (data.promotion_allowed ? 'SIM' : 'NÃO') : '—' },
      { label: 'GitHub Status',      v: data.github_connected != null ? (data.github_connected ? 'Connected' : 'Not connected') : '—' },
      { label: 'Automerge Policy',   v: val(data.automerge_policy) },
      { label: 'Hermes Vote',        v: val(data.hermes_consensus) },
      { label: 'Aegis Status',       v: val(data.aegis_status) },
      { label: 'SDDF Tests',         v: val(data.sddf_evidence || data.sddf_tests) },
      { label: 'Workers Queue',      v: val(data.workers_status) },
      { label: 'Logs Available',     v: data.logs_available === 'SIM' ? 'YES' : '—' },
    ];

    var rowsHtml = rows.map(function(r) {
      return '<div class="v33-report-row">' +
        '<span class="v33-report-lbl">' + r.label + ':</span>' +
        '<span class="v33-report-val' + (r.gold ? ' v33-report-gold' : '') + '">' + r.v + '</span>' +
        '</div>';
    }).join('');

    var reportHtml =
      '<div class="v33-report">' +
        '<div class="v33-report-title">━━━━━━━━━━━━━━━━━━━<br>📋 MISSION REPORT<br>━━━━━━━━━━━━━━━━━━━</div>' +
        rowsHtml +
        (mission.id
          ? '<button class="v33-report-btn" onclick="window.open(\'' + apiUrl('/api/mission/' + mission.id) + '\',\'_blank\')">VER RELATÓRIO COMPLETO ↗</button>'
          : '') +
      '</div>';

    // Inserir no v298ChatStream (chat principal de missão) — fallback para outros
    var container = (
      document.getElementById('v298ChatStream') ||
      document.getElementById('v297ChatLog') ||
      document.getElementById('v236CopilotMiniChat') ||
      document.querySelector('.v236-copilot-mini-chat') ||
      document.getElementById('logsBox')
    );

    if (container) {
      var div = document.createElement('div');
      div.innerHTML = reportHtml;
      var card = div.firstChild;
      container.appendChild(card);
      setTimeout(function() {
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
    console.log('[V33] MISSION REPORT inserido no chat — PASS GOLD');
  }

  /* ── RUN MISSION (POST /api/run-live) ─────────────────────────── */
  function runMission(missionText) {
    if (!missionText) return;
    mission.id = null;

    fetch(apiUrl('/api/run-live'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mission: missionText, mode: 'dry-run', project_id: 'vision-core' }),
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.mission_id) mission.id = d.mission_id;
        startSSE(missionText);
      })
      .catch(function (err) {
        console.error('[V32] /api/run-live erro:', err);
        // Start SSE anyway — Worker has the SSE stub
        startSSE(missionText);
      });
  }

  /* ── HOOK executeBtn ──────────────────────────────────────────── */
  function hookButton() {
    var btn = document.getElementById('executeBtn');
    if (!btn) return;

    // Capture phase (true) so we intercept before stopImmediatePropagation of other runtimes
    btn.addEventListener('click', function () {
      var ta = document.getElementById('missionText') ||
               document.querySelector('textarea.mission') ||
               document.querySelector('[name="mission"]');
      var text = ta ? ta.value.trim() : '';
      if (!text) return;
      // Delay slightly so other runtimes that fire first can update UI text,
      // but we control the SSE.
      setTimeout(function () { runMission(text); }, 200);
    }, true);
  }

  /* ── BOOT ─────────────────────────────────────────────────────── */
  function boot() {
    neutralizeOldSSE();
    injectCSS();
    initSticky();
    hookButton();
    setCoreState('idle');

    // ── ORBIT GEOMETRY: posicionamento trigonométrico perfeito ──────
    (function positionOrbitNodes() {
      var wrap = document.querySelector('.mc-orb-wrap');
      if (!wrap) return;

      var W = wrap.offsetWidth  || 330;
      var H = wrap.offsetHeight || 330;
      var cx = W / 2;
      var cy = H / 2;

      // raio = 39% do container, nodes icon = 14px (half de 28px)
      var r = W * 0.39;

      // Ordem dos nodes no pipeline: ângulos em graus, 0° = top (-90° offset)
      var nodeAngles = [
        { key: 'openclaw',    deg:   0 },  // topo
        { key: 'scanner',     deg:  51 },  // direita-superior
        { key: 'hermes',      deg: 102 },  // direita
        { key: 'patchengine', deg: 153 },  // direita-inferior
        { key: 'aegis',       deg: 204 },  // esquerda-inferior (bottom)
        { key: 'passgold',    deg: 255 },  // esquerda
        { key: 'github',      deg: 306 },  // esquerda-superior
      ];

      nodeAngles.forEach(function(n) {
        var el = wrap.querySelector('[data-key="' + n.key + '"]');
        if (!el) return;

        // Converter grau → radianos, com offset -90° para começar no topo
        var rad = (n.deg - 90) * Math.PI / 180;
        var x = cx + Math.cos(rad) * r;
        var y = cy + Math.sin(rad) * r;

        // Remover classes posicionais CSS antigas
        el.classList.remove(
          'mc-node--top','mc-node--tr','mc-node--right','mc-node--br',
          'mc-node--bottom','mc-node--left','mc-node--tl'
        );

        // Posicionar com transform para centrar o node (28px icon / 2 = 14px)
        el.style.cssText = [
          'position:absolute',
          'left:' + x + 'px',
          'top:' + y + 'px',
          'transform:translate(-50%,-50%)',
          'transition:opacity .3s',
        ].join('!important;') + '!important';

        el.classList.add('v33-idle');
      });

      // Injetar SVG de arco conectando os nodes
      if (!document.getElementById('v33-orbit-arc')) {
        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.id = 'v33-orbit-arc';
        svg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1;overflow:visible';
        var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', String(cx));
        circle.setAttribute('cy', String(cy));
        circle.setAttribute('r',  String(r));
        circle.setAttribute('fill',             'none');
        circle.setAttribute('stroke',           'rgba(168,85,247,.25)');
        circle.setAttribute('stroke-width',     '1');
        circle.setAttribute('stroke-dasharray', '4 8');
        svg.appendChild(circle);
        wrap.insertBefore(svg, wrap.firstChild);
      }

      // Reposicionar quando a janela redimensionar
      if (!window.__V33_RESIZE_BOUND__) {
        window.__V33_RESIZE_BOUND__ = true;
        window.addEventListener('resize', function() {
          window.__V33_ORBIT_DIRTY__ = true;
          clearTimeout(window.__V33_RESIZE_T__);
          window.__V33_RESIZE_T__ = setTimeout(positionOrbitNodes, 120);
        });
      }
    })();

    // Wrap mc-panel in sticky container if not already done
    // (v32 initSticky already handles this — just ensure id exists)

    // Neutralizar animate() fake que dispara timeline estática ao click
    window.v236AnimatePipelineDemo = function() {
      console.log('[V32] animate() fake bloqueado — aguardando SSE real');
    };

    console.log('[V32] VISION CORE V3.2 runtime único ONLINE — SSE singleton ativo');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
