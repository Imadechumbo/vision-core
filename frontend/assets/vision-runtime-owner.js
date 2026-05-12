/**
 * VISION CORE V8.3 — RUNTIME OWNER (ÚNICO)
 * ─────────────────────────────────────────────────────────────────
 * fix(runtime): block false pass gold and deduplicate mission report
 * CORREÇÕES:
 *   - evento SSE pass_gold = "backend_claimed_gold" (não vira GOLD antes do truth gate)
 *   - finalizeMission(): ponto único de encerramento
 *   - renderedReports{}: dedup — relatório só renderiza uma vez
 *   - setFinalOrbitState(): orbit sincronizado com truthGold
 *   - nodes não ficam LIVE após missão terminar
 *   - PASS GOLD node só fica GOLD se truthGold === true
 *   - core INCOMPLETE/BLOCKED quando evidência falta
 * ─────────────────────────────────────────────────────────────────
 */
(function VisionRuntimeOwner() {
  'use strict';

  if (window.__VRO_LOADED__) return;
  window.__VRO_LOADED__ = true;
  window.__V32_OWNER__  = true;

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

  /* ── ESTADO ── */
  var STATE = { active: false, missionId: null, start: null, steps: [], finalizing: false, ssePayload: {} };
  window.__VISION_MISSION_STATE__ = STATE;

  /* Dedup de relatório por missão */
  var renderedReports = {};

  window.__VISION_SSE__      = window.__VISION_SSE__      || null;
  window.__VISION_SSE_LOCK__ = window.__VISION_SSE_LOCK__ || false;

  /* ── CHAT BRIDGE ── */
  function chat(type, text) {
    if (typeof window.__VISION_APPEND_CHAT__ === 'function') {
      window.__VISION_APPEND_CHAT__(type, text);
    }
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

  /* ── REDE ── */
  var _nativeFetch = window.fetch.bind(window);

  function fetchJson(path) {
    return _nativeFetch(apiUrl(path))
      .then(function(r) { return r.text(); })
      .then(function(t) { try { return JSON.parse(t || '{}'); } catch(e) { return {}; } })
      .catch(function() { return {}; });
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
  var PIPELINE_KEYS = ['openclaw','scanner','hermes','patchengine','aegis'];

  function resolveKey(stage) {
    if (!stage) return null;
    var s = String(stage).toLowerCase().replace(/[\s_-]+/g, '');
    return STAGE_MAP[s] || STAGE_MAP[String(stage).toLowerCase()] || null;
  }

  /* ── ORBIT HELPERS ── */
  function setNodeState(key, st, label) {
    var n = document.querySelector('.mc-node[data-key="' + key + '"]');
    if (!n) return;
    n.classList.remove('v33-idle','v33-running','v33-done','v33-fail','v33-incomplete');
    n.classList.add('v33-' + st);
    var sm = n.querySelector('small');
    if (sm) sm.textContent = label ||
      (st === 'done'       ? 'PASS'    :
       st === 'fail'       ? 'FAIL'    :
       st === 'running'    ? 'LIVE'    :
       st === 'incomplete' ? 'BLOCKED' : 'AGUARDA');
  }

  function setCoreState(s, subText) {
    var c  = document.getElementById('mcCore');
    var st = document.getElementById('mcCoreStatus');
    var sb = document.getElementById('mcCoreSub');
    if (!c) return;
    c.classList.remove('running','success','fail','incomplete');
    if (s === 'running')   c.classList.add('running');
    else if (s === 'gold') c.classList.add('success');
    else if (s === 'fail' || s === 'incomplete') c.classList.add('fail');
    if (st) st.textContent =
      s === 'gold'       ? '\u2605 GOLD'  :
      s === 'running'    ? 'LIVE'          :
      s === 'incomplete' ? '\u26a0 BLOCKED':
      s === 'fail'       ? 'FAIL'          : 'READY';
    if (sb) sb.textContent = subText ||
      (s === 'gold'       ? 'PASS GOLD'       :
       s === 'running'    ? 'EXECUTANDO'       :
       s === 'incomplete' ? 'EVIDENCE MISSING' :
       s === 'fail'       ? 'ERRO'             : 'VISION CORE');
  }

  function setTimeline(stage, status) {
    var aliases = {'Patch':'PatchEngine','pass_gold':'PASS GOLD','PASS_GOLD':'PASS GOLD'};
    var norm = aliases[stage] || stage;
    document.querySelectorAll('.v236-tl-step').forEach(function(el) {
      if (el.dataset.stage !== norm) return;
      el.classList.remove('running','done','fail','gold');
      if (status === 'running') el.classList.add('running');
      else if (status === 'fail' || status === 'error') el.classList.add('fail');
      else if (norm === 'PASS GOLD' && status === 'gold') el.classList.add('gold');
      else el.classList.add('done');
      var sm = el.querySelector('small');
      if (sm) sm.textContent =
        status === 'fail' ? 'erro' :
        (norm === 'PASS GOLD' && status === 'gold') ? 'GOLD' : 'ok';
    });
  }

  /* ── SET FINAL ORBIT STATE ── */
  function setFinalOrbitState(truthGold, steps) {
    /* Limpar qualquer LIVE restante */
    PIPELINE_KEYS.forEach(function(key) {
      var n = document.querySelector('.mc-node[data-key="' + key + '"]');
      if (n && n.classList.contains('v33-running')) setNodeState(key, 'done');
    });

    /* Marcar steps executados como done */
    (steps || []).forEach(function(step) {
      var k = resolveKey(step.stage || step.step);
      if (k && k !== 'passgold' && k !== 'github') setNodeState(k, 'done');
    });

    if (truthGold) {
      PIPELINE_KEYS.forEach(function(key) { setNodeState(key, 'done'); });
      setNodeState('passgold', 'done', 'GOLD');
      setCoreState('gold');
      setTimeline('PASS GOLD', 'gold');
    } else {
      setNodeState('passgold', 'incomplete', 'BLOCKED');
      setNodeState('github', 'idle', 'AGUARDA');
      setCoreState('incomplete', 'EVIDENCE MISSING');
      setTimeline('PASS GOLD', 'fail');
    }
  }

  /* ── TRUTH GATE ── */
  function applyTruthGate(data) {
    function val(v) {
      if (v == null || v === '') return '\u2014';
      if (typeof v === 'boolean') return v ? 'SIM' : 'N\u00c3O';
      return String(v);
    }
    var hasProject   = !!(data.project    && data.project    !== '\u2014');
    var hasRootCause = !!(data.root_cause  && data.root_cause  !== '\u2014');
    var hasFiles     = data.files_changed != null && data.files_changed !== '\u2014' && data.files_changed !== 0;
    var hasMissionId = !!((data.mission_id || STATE.missionId) && (data.mission_id || STATE.missionId) !== '\u2014');
    var evidenceOk   = hasProject && hasRootCause && hasFiles && hasMissionId;
    var statusRaw = String(data.pass_gold_status || data.pass_gold_final || '').toUpperCase().replace(/[\s-]+/g, '_');
    var backendGold  = data.pass_gold === true || statusRaw === 'PASS_GOLD' || statusRaw === 'GOLD' || statusRaw === 'PASS';
    var truthGold    = backendGold && evidenceOk;
    return {
      truthGold:    truthGold,
      evidenceOk:   evidenceOk,
      backendGold:  backendGold,
      gateStatus:   truthGold ? 'PASS GOLD' : (backendGold && !evidenceOk ? 'INCOMPLETE \u2014 evidence missing' : '\u2014'),
      promoAllowed: truthGold && data.promotion_allowed === true ? 'SIM' : 'N\u00c3O',
      hermesVote:   evidenceOk ? val(data.hermes_consensus) : 'BLOCKED \u2014 evidence missing',
      val:          val,
      data:         data
    };
  }

  /* ── RENDER REPORT (com dedup) ── */
  function renderReport(data, elapsedStr) {
    var mid = data.mission_id || STATE.missionId || '__no_id__';
    if (renderedReports[mid]) {
      console.log('[VRO] renderReport ignorado (dedup):', mid);
      return null;
    }
    renderedReports[mid] = true;

    var g = applyTruthGate(data);
    var v = g.val;

    var rows = [
      ['Mission ID',         v(data.mission_id || STATE.missionId)],
      ['Projeto',            v(data.project)],
      ['Classifica\u00e7\u00e3o', v(data.classification)],
      ['Root Cause',         v(data.root_cause)],
      ['Arquivos alterados', v(data.files_changed)],
      ['Tempo total',        elapsedStr || '\u2014'],
      ['Gate Status',        g.gateStatus,  g.truthGold],
      ['Snapshot ID',        v(data.snapshot_id)],
      ['Promotion Allowed',  g.promoAllowed],
      ['Hermes Vote',        g.hermesVote],
      ['SDDF Tests',         v(data.sddf_evidence)],
      ['Logs Available',     data.logs_available === 'SIM' ? 'YES' : '\u2014'],
    ];

    var html = '<div class="v33-report">' +
      '<div class="v33-report-title">\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501<br>\ud83d\udccb MISSION REPORT<br>\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501</div>' +
      rows.map(function(r) {
        return '<div class="v33-report-row">' +
          '<span class="v33-report-lbl">' + r[0] + ':</span>' +
          '<span class="v33-report-val' + (r[2] ? ' v33-report-gold' : '') + '">' + r[1] + '</span>' +
          '</div>';
      }).join('') + '</div>';

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
    console.log('[VRO] Mission Report | gate:', g.gateStatus, '| truthGold:', g.truthGold);
    return g;
  }

  /* ── FINALIZE MISSION (ponto único de encerramento) ── */
  function finalizeMission(missionId, elapsedStr) {
    if (STATE.finalizing) {
      console.log('[VRO] finalizeMission ignorado — já finalizando');
      return;
    }
    STATE.finalizing = true;

    var mid  = missionId || STATE.missionId;
    var elap = elapsedStr || (STATE.start
      ? ((Date.now() - STATE.start) / 1000).toFixed(1) + 's' : '\u2014');

    function finish(data) {
      var g = renderReport(data, elap);
      if (!g) g = applyTruthGate(data); /* dedup */
      setFinalOrbitState(g.truthGold, STATE.steps);
      if (g.truthGold) {
        chat('gold', '\u2605 PASS GOLD real \u2014 evidência confirmada em ' + elap);
      } else {
        chat('error', '\u26a0 INCOMPLETE \u2014 evidence missing. Promotion Allowed: N\u00c3O');
      }
      STATE.active     = false;
      STATE.finalizing = false;
    }

    /* ssePayload = dados reais acumulados durante o SSE */
    var sseBase = STATE.ssePayload || {};

    function buildFinal(m, sc) {
      /* Prioridade: SSE payload > fetch backend */
      function pick(a, b) { return (a != null && a !== '') ? a : b; }
      return {
        mission_id:        pick(sseBase.mission_id,       m.mission_id      || mid),
        project:           pick(sseBase.project,          m.project),
        classification:    pick(sseBase.classification,   m.classification),
        root_cause:        pick(sseBase.root_cause,       m.root_cause),
        files_changed:     pick(sseBase.files_changed,    m.files_changed   || m.changed_files),
        snapshot_id:       pick(sseBase.snapshot_id,      m.snapshot_id     || (sc && sc.snapshot_id)),
        pass_gold_status:  pick(sseBase.pass_gold_status, sc && sc.status),
        pass_gold_final:   pick(sseBase.pass_gold_final,  sc && sc.final),
        pass_gold:         pick(sseBase.pass_gold,        sc && sc.pass_gold),
        promotion_allowed: pick(sseBase.promotion_allowed,
                             m.promotion_allowed != null ? m.promotion_allowed : (sc && sc.promotion_allowed)),
        hermes_consensus:  pick(sseBase.hermes_consensus, m.hermes_consensus),
        sddf_evidence:     pick(sseBase.sddf_evidence,    m.sddf_evidence   || m.sddf_tests),
        logs_available:    pick(sseBase.logs_available,   m.logs_available)
      };
    }

    if (mid) {
      Promise.all([
        fetchJson('/api/mission/' + mid),
        fetchJson('/api/pass-gold/score')
      ]).then(function(r) {
        finish(buildFinal(r[0] || {}, r[1] || {}));
      }).catch(function() {
        finish(buildFinal({}, {}));
      });
    } else {
      finish(buildFinal({}, {}));
    }
  }

  function mergeEvidencePayload(d) {
    if (!d) return;
    if (d.mission_id || d.id || d.missionId) STATE.ssePayload.mission_id = d.mission_id || d.id || d.missionId;
    if (d.project) STATE.ssePayload.project = d.project;
    if (d.classification) STATE.ssePayload.classification = d.classification;
    if (d.root_cause) STATE.ssePayload.root_cause = d.root_cause;
    if (d.changed_files || d.files_changed) STATE.ssePayload.files_changed = d.changed_files || d.files_changed;
    if (d.snapshot_id) STATE.ssePayload.snapshot_id = d.snapshot_id;
    if (d.sddf_evidence || d.sddf_tests) STATE.ssePayload.sddf_evidence = d.sddf_evidence || d.sddf_tests;
    if (d.logs_available != null) STATE.ssePayload.logs_available = d.logs_available;
    if (d.pass_gold != null) STATE.ssePayload.pass_gold = d.pass_gold;
    if (d.pass_gold_status) STATE.ssePayload.pass_gold_status = d.pass_gold_status;
    if (d.promotion_allowed != null) STATE.ssePayload.promotion_allowed = d.promotion_allowed;
    if (d.hermes_consensus) STATE.ssePayload.hermes_consensus = d.hermes_consensus;
    if (d.report) Object.assign(STATE.ssePayload, d.report);
    if (d.evidence) Object.assign(STATE.ssePayload, d.evidence);
  }

  /* ── SSE ── */
  function startSSE(missionId) {
    if (window.__VISION_SSE_LOCK__ || STATE.active) return;
    closeSSE();
    STATE.active     = true;
    STATE.start      = Date.now();
    STATE.steps      = [];
    STATE.finalizing = false;
    STATE.ssePayload = { mission_id: missionId };
    setCoreState('running');

    if (!missionId) {
      chat('error', 'Backend não retornou mission_id; SSE não iniciado.');
      STATE.active = false;
      setCoreState('fail');
      return;
    }
    var url = apiUrl('/api/run-live-stream') + '?mission_id=' + encodeURIComponent(missionId);
    if (url.length > 2048) {
      chat('error', 'SSE URL too long; mission_id contract violated');
      STATE.active = false;
      setCoreState('fail');
      return;
    }
    var NativeES = window.__nativeEventSource || window.EventSource;
    window.__V32_CALLING__ = true;
    var es;
    try { es = new NativeES(url); } finally { window.__V32_CALLING__ = false; }
    window.__VISION_SSE__ = es;
    window.__VISION_SSE_LOCK__ = true;

    function elapsed() { return ((Date.now() - STATE.start) / 1000).toFixed(1) + 's'; }

    es.onopen = function() {
      window.__VISION_SSE_LOCK__ = false;
      console.log('[VRO] SSE conectado');
    };

    es.addEventListener('step', function(ev) {
      try {
        var d = JSON.parse(ev.data || '{}');
        mergeEvidencePayload(d);
        var k = resolveKey(d.stage);
        STATE.steps.push(d);
        if (k && k !== 'passgold') setNodeState(k, 'running');
        setTimeline(d.stage || '', 'running');
        chat('system', '\u25b8 ' + (d.stage || 'step') + ': ' + (d.message || d.status || 'ok'));
        var cStat = document.getElementById('mcCoreStatus');
        if (cStat && STATE.active) cStat.textContent = String(d.stage || 'RUN').slice(0,8).toUpperCase();
      } catch(e) {}
    });

    es.addEventListener('gate', function(ev) {
      try {
        var d = JSON.parse(ev.data || '{}');
        mergeEvidencePayload(d);
        var k = resolveKey(d.stage);
        if (k && k !== 'passgold') setNodeState(k, d.status === 'fail' ? 'fail' : 'done');
        setTimeline(d.stage || '', d.status || 'done');
      } catch(e) {}
    });

    /* !! pass_gold = backend_claimed_gold — NÃO é verdade final !! */
    es.addEventListener('pass_gold', function(ev) {
      try {
        var d = JSON.parse(ev.data || '{}');
        mergeEvidencePayload(d);
        if (!STATE.missionId && d.mission_id) STATE.missionId = d.mission_id;
        /* Acumular campos de evidence do evento pass_gold */
        if (d.project)        STATE.ssePayload.project        = d.project;
        if (d.classification) STATE.ssePayload.classification = d.classification;
        if (d.root_cause)     STATE.ssePayload.root_cause     = d.root_cause;
        if (d.changed_files || d.files_changed)
          STATE.ssePayload.files_changed = d.changed_files || d.files_changed;
        if (d.snapshot_id)    STATE.ssePayload.snapshot_id    = d.snapshot_id;
        if (d.sddf_evidence || d.sddf_tests)
          STATE.ssePayload.sddf_evidence = d.sddf_evidence || d.sddf_tests;
        if (d.logs_available != null) STATE.ssePayload.logs_available = d.logs_available;
        if (d.pass_gold != null)      STATE.ssePayload.pass_gold      = d.pass_gold;
        if (d.pass_gold_status)       STATE.ssePayload.pass_gold_status = d.pass_gold_status;
        if (d.promotion_allowed != null) STATE.ssePayload.promotion_allowed = d.promotion_allowed;
        if (d.hermes_consensus)       STATE.ssePayload.hermes_consensus = d.hermes_consensus;
        if (d.report)                 Object.assign(STATE.ssePayload, d.report);
        chat('system', '\u25ce Backend reportou conclusão \u2014 verificando evidência...');
        console.log('[VRO] pass_gold SSE = backend_claimed_gold — aguardando truth gate via done');
      } catch(e) {}
    });

    /* done = ponto único de finalização */
    es.addEventListener('done', function(ev) {
      try {
        var d = JSON.parse(ev.data || '{}');
        mergeEvidencePayload(d);
        if (!STATE.missionId && d.mission_id) STATE.missionId = d.mission_id;
      } catch(e) {}
      closeSSE();
      finalizeMission(STATE.missionId, elapsed());
    });

    es.addEventListener('ping', function() {});

    es.onerror = function() {
      if (es.readyState === 2) {
        chat('error', 'SSE encerrado');
        closeSSE();
        if (STATE.active && !STATE.finalizing) finalizeMission(STATE.missionId, elapsed());
      }
    };
  }

  /* ── RUN MISSION ── */
  function runMission(missionText) {
    if (!missionText || !missionText.trim()) return;
    if (STATE.active) { chat('system', 'Miss\u00e3o já em execução. Aguarde.'); return; }

    STATE.missionId  = null;
    STATE.finalizing = false;
    STATE.ssePayload = {};
    renderedReports  = {};   /* limpar dedup da missão anterior */

    chat('system', '\u26a1 Iniciando missão SDDF...');
    setCoreState('running');

    _nativeFetch(apiUrl('/api/run-live'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mission: missionText.trim(), mode: 'dry-run', project_id: 'vision-core' })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
      var mid = d.mission_id || d.id || d.missionId;
      if (!mid) { throw new Error('Backend não retornou mission_id; SSE não iniciado.'); }
      STATE.missionId = mid;
      chat('system', 'Miss\u00e3o aceita: ' + mid);
      startSSE(mid);
    })
    .catch(function(err) {
      chat('error', 'run-live falhou: ' + err.message);
      setCoreState('fail');
      STATE.active = false;
    });
  }

  window.__VRO_RUN_MISSION__ = runMission;
  window.startSSE             = function() { console.log('[VRO] window.startSSE bloqueado'); };
  window.__V32_startSSE__     = startSSE;

  /* ── HOOK executeBtn ── */
  function hookButton() {
    var btn = document.getElementById('executeBtn');
    if (!btn || btn.__vro_hooked__) return;
    btn.__vro_hooked__ = true;
    btn.addEventListener('click', function() {
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

  function boot() {
    hookButton();
    setCoreState('idle');
    console.log('[VRO] Vision Runtime Owner v8.3 ativo — gold visual + clean runtime');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})();
