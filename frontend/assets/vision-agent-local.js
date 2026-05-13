(function () {
  'use strict';

  var OCTAGON = {
    openclaw:    { top: '5%',    left: '50%'   },
    scanner:     { top: '18.2%', left: '81.8%' },
    hermes:      { top: '50%',   left: '95%'   },
    patchengine: { top: '81.8%', left: '81.8%' },
    aegis:       { top: '95%',   left: '50%'   },
    passgold:    { top: '81.8%', left: '18.2%' },
    github:      { top: '50%',   left: '5%'    },
    pi_harness:  { top: '18.2%', left: '18.2%' }
  };

  var ORDER = ['openclaw','scanner','hermes','patchengine','pi_harness','aegis','passgold','github'];
  var LABEL = {openclaw:'OpenClaw', scanner:'Scanner', hermes:'Hermes', patchengine:'PatchEngine', pi_harness:'PI HARNESS', aegis:'Aegis', passgold:'PASS GOLD', github:'PR GitHub'};
  var STAGE_MAP = {
    openclaw:'openclaw', input:'openclaw', mission:'openclaw', accepted:'openclaw',
    scanner:'scanner', scan:'scanner', file:'scanner', target:'scanner',
    hermes:'hermes', rca:'hermes', diagnosis:'hermes', diagnostico:'hermes',
    patch:'patchengine', patchengine:'patchengine', patch_engine:'patchengine',
    aegis:'aegis', security:'aegis', policy:'aegis', sddf:'aegis', validation:'aegis',
    passgold:'passgold', pass_gold:'passgold', gold:'passgold', 'pass gold':'passgold',
    github:'github', pr:'github', pullrequest:'github', pull_request:'github',
    pi_harness:'pi_harness', piharness:'pi_harness', 'pi harness':'pi_harness',
    adaptive:'pi_harness', harness:'pi_harness', difficulty:'pi_harness', layer:'pi_harness'
  };

  var agents = [
    { key: 'openclaw',    name: 'OpenClaw',    contract: 'Coordena a missão e valida handoff entre agentes.' },
    { key: 'scanner',     name: 'Scanner',     contract: 'Inspeciona sinais, riscos e evidências técnicas.' },
    { key: 'hermes',      name: 'Hermes',      contract: 'Comunica eventos, status e síntese operacional.' },
    { key: 'patchengine', name: 'PatchEngine', contract: 'Prepara alterações somente quando há contrato válido.' },
    { key: 'aegis',       name: 'Aegis',       contract: 'Aplica política de bloqueio e segurança.' },
    { key: 'passgold',    name: 'PASS GOLD',   contract: 'Só acende com autorização de promoção e recibo de evidência válido.', gold: true },
    { key: 'github',      name: 'PR GitHub',   contract: 'Depende de integração autorizada pelo servidor.' },
    { key: 'pi_harness',  name: 'PI HARNESS',  contract: 'Orquestrador adaptativo L0-L9: ajusta dificuldade, orçamento e escalonamento.' }
  ];

  var fallbackMetrics = [
    { key: 'openclaw',    name: 'OpenClaw',    width: 0, value: '—' },
    { key: 'hermes',      name: 'Hermes RCA',  width: 0, value: '—' },
    { key: 'scanner',     name: 'Scanner',     width: 0, value: '—' },
    { key: 'aegis',       name: 'Aegis',       width: 0, value: '—' },
    { key: 'patchengine', name: 'PatchEngine', width: 0, value: '—' },
    { key: 'pi_harness',  name: 'PI HARNESS',  width: 0, value: 'L0-L9 · AUTO' },
    { key: 'passgold',    name: 'PASS GOLD',   width: 0, value: '—' }
  ];

  var lastPayload = {};
  var metricsTimer = null;

  function byId(id) { return document.getElementById(id); }
  function query(selector) { return document.querySelector(selector); }
  function queryAll(selector) { return Array.prototype.slice.call(document.querySelectorAll(selector)); }

  function hasEvidence(payload) {
    return !!(window.VisionReport && window.VisionReport.hasValidEvidence(payload && payload.evidence_receipt));
  }

  function hasGold(payload) {
    return !!(payload && payload.pass_gold === true && payload.promotion_allowed === true && hasEvidence(payload));
  }

  function statusFor(agent, payload) {
    if (agent.gold) { return hasGold(payload) ? 'GOLD VERIFIED' : 'BLOCKED'; }
    if (payload && (payload.state || payload.status)) { return String(payload.state || payload.status).toUpperCase(); }
    return 'WAITING';
  }

  function setText(id, value) {
    var node = byId(id);
    if (node) { node.textContent = value; }
  }

  function normalizedKey(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/hermes rca/g, 'hermes')
      .replace(/pass gold/g, 'passgold')
      .replace(/patch engine/g, 'patchengine')
      .replace(/[^a-z0-9]/g, '');
  }

  function position(index, total) {
    var angle = (Math.PI * 2 * index / total) - Math.PI / 2;
    var radius = 38;
    return {
      left: 50 + Math.cos(angle) * radius,
      top: 50 + Math.sin(angle) * radius
    };
  }

  function showDetail(agent) {
    var detail = byId('agentDetail') || byId('mcTooltip');
    if (!detail) { return; }
    var evidence = hasEvidence(lastPayload) ? lastPayload.evidence_receipt : 'missing';
    detail.textContent = agent.name + ' · contrato: ' + agent.contract + ' · status: ' + statusFor(agent, lastPayload) + ' · evidence: ' + evidence;
  }

  function setNode(key, status, elapsedStr) {
    var n = query('.mc-node[data-key="' + key + '"]');
    if (!n) return;
    n.classList.remove('v33-idle', 'v33-running', 'v33-done', 'v33-fail');
    var cls = status === 'fail' ? 'v33-fail' : status === 'done' ? 'v33-done' : status === 'running' ? 'v33-running' : 'v33-idle';
    n.classList.add(cls);
    var small = byId('v33-t-' + key);
    if (small) {
      small.textContent = status === 'idle' ? 'AGUARDA'
        : ((elapsedStr ? elapsedStr + ' · ' : '') + (status === 'done' ? 'PASS' : status.toUpperCase()));
    }
    if (key === 'pi_harness') {
      var active = (status === 'running' || status === 'done');
      n.style.opacity = active ? '1' : '0';
      n.style.transform = active ? 'translate(-50%,-50%) scale(.92)' : 'translate(-50%,-50%) scale(.82)';
      if (status === 'running') {
        var sub = byId('mcCoreSub');
        if (sub) sub.textContent = 'PI HARNESS ATIVO';
      }
    }
  }

  function applyOctagonPositions() {
    Object.keys(OCTAGON).forEach(function(key) {
      var el = query('.mc-node[data-key="' + key + '"]');
      if (!el) return;
      ['mc-node--top','mc-node--tr','mc-node--right','mc-node--br',
       'mc-node--bottom','mc-node--left','mc-node--tl'].forEach(function(cls) {
        el.classList.remove(cls);
      });
      var pos = OCTAGON[key];
      el.style.setProperty('position',  'absolute',             'important');
      el.style.setProperty('top',       pos.top,                'important');
      el.style.setProperty('left',      pos.left,               'important');
      el.style.setProperty('right',     'auto',                 'important');
      el.style.setProperty('bottom',    'auto',                 'important');
      el.style.setProperty('transform', 'translate(-50%,-50%)', 'important');
    });
  }

  function ensurePiHarnessNode() {
    var orbWrap = query('.mc-orb-wrap') || byId('vcOrbitWrap');
    if (!orbWrap) return;
    if (orbWrap.querySelector('[data-key="pi_harness"]')) return;
    var n = document.createElement('div');
    n.className = 'mc-node v33-idle';
    n.setAttribute('data-key', 'pi_harness');
    n.style.cssText = 'position:absolute;top:18.2%;left:18.2%;transform:translate(-50%,-50%) scale(.82);display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;z-index:6;opacity:0;transition:opacity .4s ease,transform .4s ease';
    n.innerHTML = '<div class="mc-node-icon" style="font-size:14px;font-weight:700">π</div>' +
      '<div class="mc-node-label">PI HARNESS<br><small id="v33-t-pi_harness" style="color:rgba(168,85,247,.7)">ADAPTIVE</small></div>';
    n.addEventListener('click', function() {
      var d = byId('agentDetail');
      if (d) d.textContent = 'PI HARNESS · Orquestrador adaptativo L0-L9: ajusta dificuldade, orcamento de ferramentas e escalonamento. · status: ' + (n.classList.contains('v33-running') ? 'RUNNING' : n.classList.contains('v33-done') ? 'DONE' : 'ADAPTIVE');
    });
    orbWrap.appendChild(n);
  }

  function resetOrbit() {
    ORDER.forEach(function(k) { setNode(k, 'idle'); });
    applyOctagonPositions();
  }

  function updateLegacyOrbit(payload) {
    agents.forEach(function (agent) {
      var node = query('[data-key="' + agent.key + '"]');
      if (!node) { return; }
      var state = agent.gold ? (hasGold(payload) ? 'done' : 'idle') : 'idle';
      node.classList.remove('v33-idle', 'v33-running', 'v33-done', 'v33-fail');
      node.classList.add(state === 'done' ? 'v33-done' : 'v33-idle');
      var small = byId('v33-t-' + agent.key) || node.querySelector('small');
      if (small) { small.textContent = statusFor(agent, payload); }
      if (!node.__visionAgentDetailBound) {
        node.__visionAgentDetailBound = true;
        node.addEventListener('click', function () { showDetail(agent); });
      }
    });

    setText('mcCoreStatus', hasGold(payload) ? '★ GOLD' : (payload.state || payload.status || 'READY'));
    setText('mcCoreSub', hasGold(payload) ? 'PASS GOLD' : 'VISION CORE');
  }

  function renderOrbit() {
    var orbit = byId('agentOrbit');
    if (!orbit) {
      updateLegacyOrbit(lastPayload);
      return;
    }
    orbit.replaceChildren();
    agents.forEach(function (agent, index) {
      var node = document.createElement('button');
      var point = position(index, agents.length);
      node.type = 'button';
      node.className = 'agent-node' + (agent.gold ? ' is-gold' : '');
      node.style.left = 'calc(' + point.left + '% - 56px)';
      node.style.top = 'calc(' + point.top + '% - 38px)';
      node.innerHTML = '<strong></strong><small></small>';
      node.querySelector('strong').textContent = agent.name;
      node.querySelector('small').textContent = statusFor(agent, lastPayload);
      node.addEventListener('click', function () { showDetail(agent); });
      orbit.appendChild(node);
    });
  }

  function renderStatus() {
    var status = byId('agentStatus');
    if (status) {
      status.textContent = hasGold(lastPayload) ? 'GOLD VERIFIED' : (lastPayload.state || lastPayload.status || 'WAITING');
      status.className = 'status-pill ' + (hasGold(lastPayload) ? 'gold' : 'muted');
    }
  }

  function metricValue(metric) {
    if (metric.cost != null) { return String(metric.cost); }
    if (metric.value != null) { return String(metric.value); }
    if (metric.total_cost != null) { return String(metric.total_cost); }
    if (metric.score != null) { return String(metric.score); }
    return '—';
  }

  function metricWidth(metric) {
    var raw = metric.width != null ? metric.width : (metric.usage_pct != null ? metric.usage_pct : (metric.score != null ? metric.score : 0));
    var n = Number(raw);
    if (!Number.isFinite(n)) { return 0; }
    return Math.max(0, Math.min(100, n));
  }

  function renderSmallMetric(metric) {
    var key = normalizedKey(metric.key || metric.id || metric.name);
    var bar = byId('bar-' + key);
    var val = byId('val-' + key);
    if (bar) { bar.style.width = metricWidth(metric) + '%'; }
    if (val) { val.textContent = metricValue(metric); }
  }

  function renderLargeMetrics(metrics, source) {
    var box = byId('agentMetricsLarge');
    if (!box) { return; }
    var list = metrics && metrics.length ? metrics : fallbackMetrics;
    box.innerHTML = list.map(function (metric) {
      var key = normalizedKey(metric.key || metric.id || metric.name);
      var width = metricWidth(metric);
      return '<div class="metric-big-row" data-agent="' + key + '">' +
        '<div class="metric-agent-name">' + (metric.name || key) + '</div>' +
        '<div class="metric-mode">' + (source === 'backend' ? 'backend' : 'local ui') + '</div>' +
        '<div class="metric-track"><div class="metric-fill" style="width:' + width + '%"></div></div>' +
        '<div class="metric-cost">' + metricValue(metric) + '</div>' +
      '</div>';
    }).join('') + '<div class="metrics-total"><span>SOURCE</span><strong>' + (source === 'backend' ? 'BACKEND' : 'LOCAL UI') + '</strong></div>';
  }

  function renderMetrics(payload, source) {
    var metrics = [];
    if (payload && Array.isArray(payload.metrics)) { metrics = payload.metrics; }
    else if (payload && Array.isArray(payload.agents)) { metrics = payload.agents; }
    else { metrics = fallbackMetrics; }

    metrics.forEach(renderSmallMetric);
    renderLargeMetrics(metrics, source);

    var live = query('#metricsBoard .live-pill') || byId('mcLiveBadge');
    if (live) { live.textContent = source === 'backend' ? '● BACKEND' : '● LOCAL UI'; }
  }

  function renderAgentsCatalog(payload, source) {
    var box = byId('agentsCatalogGrid');
    if (!box) { return; }
    var core = payload && (payload.core_agents || payload.agents || []);
    var reserve = payload && (payload.reserve_agents || []);
    var list = [].concat(core || [], reserve || []);
    if (!list.length) {
      box.innerHTML = '<article class="agent-real-card"><div class="agent-title">Catálogo indisponível</div><div class="agent-role">Fonte: ' + (source === 'backend' ? 'BACKEND' : 'LOCAL UI') + '</div></article>';
      return;
    }
    box.innerHTML = list.map(function (agent) {
      var type = agent.type || agent.tier || 'core';
      var provides = Array.isArray(agent.provides) ? agent.provides : [];
      return '<article class="agent-real-card ' + type + '">' +
        '<div class="agent-real-top"><div class="agent-icon">' + (type === 'reserve' ? '▣' : '⬡') + '</div><span class="agent-status-chip">' + (agent.active === false ? 'RESERVA' : 'ATIVO') + '</span></div>' +
        '<div class="agent-title">' + (agent.name || agent.key || 'Agente') + '</div>' +
        '<div class="agent-key">' + (agent.key || type) + '</div>' +
        '<div class="agent-role">' + (agent.focus || agent.role || 'Agente técnico do VISION CORE.') + '</div>' +
        '<div class="agent-tags">' + provides.slice(0, 5).map(function (tag) { return '<span class="agent-tag">' + tag + '</span>'; }).join('') + '</div>' +
      '</article>';
    }).join('');
  }

  function renderContracts(payload) {
    var root = document.documentElement;
    var live = byId('mcLiveBadge');
    if (payload) {
      window.__VISION_CONTRACTS__ = payload;
      root.dataset.contracts = 'real';
      if (live) { live.textContent = '● CONTRACTS'; }
      return;
    }
    root.dataset.contracts = 'offline';
    if (live) { live.textContent = '● LOCAL UI'; }
  }

  function refreshReadOnlyBoards() {
    if (!window.VisionApi) {
      renderMetrics(null, 'local');
      renderContracts(null);
      return;
    }
    window.VisionApi.agentMetrics().then(function (payload) {
      renderMetrics(payload, payload ? 'backend' : 'local');
    });
    window.VisionApi.agentsCatalog().then(function (payload) {
      renderAgentsCatalog(payload, payload ? 'backend' : 'local');
    });
    window.VisionApi.contracts().then(renderContracts);
  }

  function statusSnapshot() {
    return {
      state: lastPayload.state || lastPayload.status || 'WAITING',
      gold: hasGold(lastPayload),
      evidence: hasEvidence(lastPayload),
      mission_id: lastPayload.mission_id || lastPayload.missionId || lastPayload.id || '',
      difficulty: lastPayload.difficulty || lastPayload.pi_difficulty || '',
      layer: lastPayload.layer || lastPayload.current_layer || lastPayload.max_layer || ''
    };
  }

  function update(payload) {
    lastPayload = payload && typeof payload === 'object' ? payload : {};
    renderOrbit();
    renderStatus();
    return { gold: hasGold(lastPayload), evidence: hasEvidence(lastPayload) };
  }

  function boot() {
    renderOrbit();
    renderStatus();
    refreshReadOnlyBoards();
    if (!metricsTimer) {
      metricsTimer = setInterval(refreshReadOnlyBoards, 30000);
    }
  }

  window.VisionAgentLocal = {
    update: update,
    render: renderOrbit,
    refreshReadOnlyBoards: refreshReadOnlyBoards,
    renderMetrics: renderMetrics,
    renderContracts: renderContracts,
    setNode: setNode,
    applyOctagonPositions: applyOctagonPositions,
    ensurePiHarnessNode: ensurePiHarnessNode,
    resetOrbit: resetOrbit,
    OCTAGON: OCTAGON,
    ORDER: ORDER,
    LABEL: LABEL,
    STAGE_MAP: STAGE_MAP
  };

  document.addEventListener('DOMContentLoaded', boot);
  if (document.readyState !== 'loading') { boot(); }
}());
