/**
 * VISION CORE V4.4 — RUNTIME CONSISTENCY PASS
 * Finaliza consistência entre UI e runtime real:
 * - Download real do Desktop Agent
 * - Orbit Home alimentada por SSE real
 * - VISION AGENT LOCAL sticky real
 * - Mission Report real no chat
 * - Zero fake data ativo
 */
(function VisionCoreV44RuntimeConsistency(){
  'use strict';
  if (window.__V44_RUNTIME_CONSISTENCY__) return;
  window.__V44_RUNTIME_CONSISTENCY__ = true;

  var API = (window.__VISION_API__ || window.API_BASE_URL || 'https://visioncore-api-gateway.weiganlight.workers.dev').replace(/\/$/, '');
  function apiUrl(path){
    path = String(path || '');
    if (/^https?:\/\//.test(path)) return path;
    if (path.indexOf('/api') === 0) return API + path;
    return API + '/api' + (path.charAt(0) === '/' ? path : '/' + path);
  }
  function safeJson(path){
    var url = apiUrl(path);
    return fetch(url).then(function(r){ return r.ok ? r.json() : null; }).catch(function(e){ console.warn('[V44]', path, e.message); return null; });
  }
  function val(x){
    if (x == null || x === '') return '—';
    if (Array.isArray(x)) return x.length ? x.join(', ') : '—';
    if (typeof x === 'boolean') return x ? 'SIM' : 'NÃO';
    return String(x);
  }

  var STAGE_MAP = {
    openclaw:'openclaw', input:'openclaw', mission:'openclaw', accepted:'openclaw',
    scanner:'scanner', scan:'scanner', file:'scanner', target:'scanner',
    hermes:'hermes', rca:'hermes', diagnosis:'hermes', diagnostico:'hermes',
    patch:'patchengine', patchengine:'patchengine', patch_engine:'patchengine',
    aegis:'aegis', security:'aegis', policy:'aegis', sddf:'aegis', validation:'aegis',
    passgold:'passgold', pass_gold:'passgold', gold:'passgold', 'pass gold':'passgold',
    github:'github', pr:'github', pullrequest:'github', pull_request:'github'
  };
  var ORDER = ['openclaw','scanner','hermes','patchengine','aegis','passgold','github'];
  var LABEL = {openclaw:'OpenClaw', scanner:'Scanner', hermes:'Hermes', patchengine:'PatchEngine', aegis:'Aegis', passgold:'PASS GOLD', github:'PR GitHub'};
  var missionStartedAt = null;
  var activeMissionId = null;
  var reportLock = false;

  function normalizeStage(stage){
    if (!stage) return null;
    var raw = String(stage).trim().toLowerCase();
    var compact = raw.replace(/[\s\-]+/g, '_');
    var flat = raw.replace(/[\s_\-]+/g, '');
    return STAGE_MAP[raw] || STAGE_MAP[compact] || STAGE_MAP[flat] || null;
  }
  function elapsed(){
    return missionStartedAt ? ((Date.now() - missionStartedAt) / 1000).toFixed(1) + 's' : '—';
  }
  function node(key){ return document.querySelector('.mc-node[data-key="' + key + '"]'); }
  function nodeSmall(key){ return document.getElementById('v33-t-' + key); }
  function setCore(state, text, sub){
    var core = document.getElementById('mcCore');
    if (core) {
      core.classList.remove('running','success','fail');
      if (state === 'running') core.classList.add('running');
      if (state === 'gold') core.classList.add('success');
      if (state === 'fail') core.classList.add('fail');
    }
    var t = document.getElementById('mcCoreStatus');
    var s = document.getElementById('mcCoreSub');
    if (t) t.textContent = text || (state === 'gold' ? '★ GOLD' : state === 'running' ? 'LIVE' : state === 'fail' ? 'FAIL' : 'READY');
    if (s) s.textContent = sub || (state === 'gold' ? 'PASS GOLD' : state === 'running' ? 'EXECUTANDO' : state === 'fail' ? 'ERRO' : 'VISION CORE');
  }
  function setNode(key, status){
    var n = node(key); if (!n) return;
    n.classList.remove('v33-idle','v33-running','v33-done','v33-fail');
    var cls = status === 'fail' ? 'v33-fail' : status === 'done' ? 'v33-done' : status === 'running' ? 'v33-running' : 'v33-idle';
    n.classList.add(cls);
    var small = nodeSmall(key);
    if (small) small.textContent = status === 'idle' ? 'AGUARDA' : (elapsed() + ' · ' + (status === 'done' ? 'PASS' : status.toUpperCase()));
    if (window.v236SetPipelineStage) {
      var mappedStatus = status === 'done' ? 'done' : status === 'fail' ? 'fail' : 'running';
      try { window.v236SetPipelineStage(LABEL[key] || key, mappedStatus); } catch(_) {}
    }
  }
  function resetOrbit(){
    ORDER.forEach(function(k){ setNode(k, 'idle'); });
    setCore('idle', 'READY', 'VISION CORE');
  }
  function markStage(stage, status){
    var key = normalizeStage(stage); if (!key) return;
    if (!missionStartedAt) missionStartedAt = Date.now();
    setCore('running');
    var idx = ORDER.indexOf(key);
    if (idx >= 0 && (status === 'done' || status === 'pass' || status === 'ok' || status === 'success' || status === 'gold')) {
      ORDER.slice(0, idx).forEach(function(k){ if (k !== 'github') setNode(k, 'done'); });
    }
    var finalStatus = /fail|error|blocked/i.test(String(status || '')) ? 'fail' : /done|pass|ok|success|gold/i.test(String(status || '')) ? 'done' : 'running';
    setNode(key, finalStatus);
    if (key === 'passgold' && finalStatus === 'done') {
      ORDER.slice(0, ORDER.indexOf('passgold') + 1).forEach(function(k){ setNode(k, 'done'); });
      setCore('gold');
      triggerReport(activeMissionId);
    }
  }

  function installSticky(){
    var aside = document.querySelector('main.shell.grid > aside:last-of-type');
    var panel = document.getElementById('agentDownload');
    if (aside) {
      aside.style.position = 'sticky';
      aside.style.top = '24px';
      aside.style.alignSelf = 'start';
      aside.style.height = 'fit-content';
      aside.style.maxHeight = 'calc(100vh - 32px)';
      aside.style.overflow = 'visible';
      aside.style.zIndex = '20';
    }
    if (panel) {
      panel.style.position = 'relative';
      panel.style.top = 'auto';
      panel.style.overflow = 'visible';
    }
    // Parents que costumam matar sticky: não mexer em scroll vertical, apenas evitar clipping horizontal/transform.
    var shell = document.querySelector('main.shell.grid');
    if (shell) {
      shell.style.alignItems = 'start';
      shell.style.overflow = 'visible';
      shell.style.transform = 'none';
      shell.style.contain = 'none';
    }
  }

  function enforceDownloadLinks(){
    document.querySelectorAll('a.agent-download, a[href*="vision_agent"], a[href*="VisionAgent"]').forEach(function(a){
      a.setAttribute('href', 'downloads/VisionAgentSetup.exe');
      a.setAttribute('download', '');
    });
  }

  function zeroFake(){
    window.v236AnimatePipelineDemo = function(){ console.log('[V44] animate() fake bloqueado — Orbit aguarda SSE real'); };
    var ex = document.getElementById('executeBtn');
    if (ex && !ex.__v44_fake_guard__) {
      ex.__v44_fake_guard__ = true;
      ex.addEventListener('click', function(){
        window.v236AnimatePipelineDemo = function(){ console.log('[V44] timeline demo bloqueada nesta missão'); };
      }, true);
    }
  }

  function extractMissionId(d){
    if (!d) return null;
    return d.mission_id || d.missionId || d.id || d.mission || null;
  }
  function parsePayload(e){
    try { return e && e.data ? JSON.parse(e.data) : {}; } catch(_) { return {}; }
  }
  function processEvent(type, e){
    var d = parsePayload(e);
    var missionId = extractMissionId(d);
    if (missionId) activeMissionId = missionId;
    if (type === 'open' || type === 'mission' || type === 'mission_started' || type === 'accepted') {
      missionStartedAt = Date.now(); reportLock = false; resetOrbit(); setCore('running'); markStage('openclaw','running'); return;
    }
    if (type === 'step' || type === 'gate' || type === 'stage' || type === 'progress') {
      markStage(d.stage || d.agent || d.name || d.step || d.module, d.status || type); return;
    }
    if (type === 'pass_gold' || type === 'mission_completed' || type === 'success' || /pass.?gold/i.test(type)) {
      markStage('passgold','done'); triggerReport(activeMissionId); return;
    }
    if (type === 'done' || type === 'completed') {
      markStage('github','done'); setCore('gold'); triggerReport(activeMissionId); return;
    }
    if (type === 'fail' || type === 'error') {
      setCore('fail');
      if (d.stage) markStage(d.stage, 'fail');
    }
  }
  function attachSSE(){
    var es = window.__VISION_SSE__;
    if (!es || es.__v44_attached__) return;
    es.__v44_attached__ = true;
    ['open','mission','mission_started','accepted','step','stage','progress','gate','pass_gold','mission_completed','success','done','completed','fail','error'].forEach(function(evt){
      try { es.addEventListener(evt, function(e){ processEvent(evt, e); }); } catch(_) {}
    });
    console.log('[V44] Orbit Home ligada ao SSE singleton real');
  }
  setInterval(attachSSE, 250);

  function chatTarget(){
    return document.getElementById('v298ChatStream') || document.getElementById('v297ChatLog') || document.getElementById('v236CopilotMiniChat') || document.querySelector('.v236-copilot-mini-chat');
  }
  function hasReport(){
    var t = chatTarget();
    return !!(t && /MISSION REPORT/i.test(t.textContent || ''));
  }
  function triggerReport(missionId){
    if (reportLock) return;
    reportLock = true;
    setTimeout(function(){ buildReport(missionId || activeMissionId || null); }, 350);
  }
  function buildReport(missionId){
    Promise.all([
      missionId ? safeJson('/api/mission/' + encodeURIComponent(missionId)) : Promise.resolve(null),
      safeJson('/api/pass-gold/score'),
      safeJson('/api/github/status'),
      safeJson('/api/hermes/vote'),
      safeJson('/api/workers/status'),
      safeJson('/api/logs/download')
    ]).then(function(r){
      var m = r[0] || {}, score = r[1] || {}, gh = r[2] || {}, hermes = r[3] || {}, workers = r[4] || {}, logs = r[5];
      if (hasReport()) return;
      var passGold = score.pass_gold != null ? score.pass_gold : (m.pass_gold != null ? m.pass_gold : null);
      var rows = [
        ['Mission ID', val(m.mission_id || missionId)],
        ['Project', val(m.project || m.project_id)],
        ['Classification', val(m.classification || m.category)],
        ['Root Cause', val(m.root_cause)],
        ['Files Changed', val(m.files_changed || m.changed_files)],
        ['Duration', val(m.duration || (missionStartedAt ? elapsed() : null))],
        ['PASS GOLD', passGold == null ? '—' : (passGold ? 'TRUE' : 'FALSE'), passGold === true],
        ['Promotion Allowed', val(m.promotion_allowed || score.promotion_allowed)],
        ['Snapshot ID', val(m.snapshot_id || score.snapshot_id)],
        ['GitHub Status', gh.connected == null ? '—' : (gh.connected ? 'CONNECTED' : 'NOT CONNECTED')],
        ['Hermes Vote', val(hermes.consensus || hermes.vote)],
        ['Worker Status', val(workers.status || workers.queue || workers.state)],
        ['Logs Available', logs ? 'YES' : '—']
      ];
      var card = document.createElement('div');
      card.className = 'v44-mission-report';
      card.innerHTML = '<div class="v44-report-title">━━━━━━━━━━━━━━━━━━━<br>📋 MISSION REPORT<br>━━━━━━━━━━━━━━━━━━━</div>' +
        rows.map(function(row){ return '<div class="v44-report-row"><span>' + row[0] + ':</span><b class="' + (row[2] ? 'gold' : '') + '">' + row[1] + '</b></div>'; }).join('');
      var target = chatTarget();
      if (target) {
        target.appendChild(card);
        try { card.scrollIntoView({behavior:'smooth', block:'nearest'}); } catch(_) {}
        console.log('[V44] Mission Report real inserido no chat');
      }
    }).finally(function(){ setTimeout(function(){ reportLock = false; }, 2500); });
  }

  function observeChat(){
    var t = chatTarget(); if (!t || t.__v44_observed__) return;
    t.__v44_observed__ = true;
    new MutationObserver(function(muts){
      muts.forEach(function(m){
        Array.prototype.forEach.call(m.addedNodes || [], function(n){
          var text = (n.textContent || '').toLowerCase();
          if (/pass gold confirmado|pass_gold|mission_completed|success/.test(text)) triggerReport(activeMissionId);
        });
      });
    }).observe(t, {childList:true, subtree:true, characterData:true});
  }

  function syncGates(){
    Promise.all([safeJson('/api/pass-gold/score'), safeJson('/api/runtime/harness-stats')]).then(function(r){
      var sc = r[0] || {}, ha = r[1] || {};
      var pass = sc.pass_gold === true || ha.pass_gold === true;
      var pairs = [
        ['gate-security', pass ? 'PASS' : '—'],
        ['gate-compatibility', pass ? 'PASS' : '—'],
        ['gate-stability', pass ? 'PASS' : '—'],
        ['gate-runtime', ha.runtime || '—']
      ];
      pairs.forEach(function(p){ var el = document.getElementById(p[0]); if (el) el.textContent = p[1]; });
    });
  }

  function boot(){
    enforceDownloadLinks();
    installSticky();
    zeroFake();
    observeChat();
    syncGates();
    setInterval(function(){ installSticky(); enforceDownloadLinks(); observeChat(); attachSSE(); }, 1000);
    setInterval(syncGates, 30000);
    console.log('[V44] Runtime Consistency Pass ativo — download, sticky, orbit SSE, report real');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
