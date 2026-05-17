(function () {
  'use strict';

  var agents = [
    { key: 'piharness',   name: 'PI Harness',   contract: 'Roteia e valida a missão. Nunca promove sem evidence real.' },
    { key: 'hermes',      name: 'Hermes',        contract: 'Supervisiona eventos e realiza análise de causa raiz.' },
    { key: 'openclaw',    name: 'OpenClaw',      contract: 'Coordena a missão e valida handoff entre agentes.' },
    { key: 'scanner',     name: 'Scanner',       contract: 'Inspeciona sinais, riscos e evidências técnicas.' },
    { key: 'patchengine', name: 'PatchEngine',   contract: 'Prepara alterações somente quando há contrato válido.' },
    { key: 'aegis',       name: 'Aegis',         contract: 'Aplica política de bloqueio e segurança.' },
    { key: 'gocore',      name: 'Go Core',       contract: 'Evidence real só vem do Go Core. Runtime Truth.' },
    { key: 'passgold',    name: 'PASS GOLD',     contract: 'Só acende com autorização e evidence válido.', gold: true },
    { key: 'archivist',   name: 'Archivist',     contract: 'Guarda memória e contexto de missão.' },
    { key: 'github',      name: 'GitHub Agent',  contract: 'Depende de integração autorizada pelo servidor.' }
  ];

  var NODES = [
    { id: 'pi_harness',   label: 'PI Harness',   role: 'Orchestrator',  color: '#c084fc', icon: 'π',  top: 20.0, left: 50.0 },
    { id: 'hermes',       label: 'Hermes',        role: 'Supervisor',    color: '#f59e0b', icon: 'H',  top: 25.6, left: 65.9 },
    { id: 'openclaw',     label: 'OpenClaw',      role: 'Coordinator',   color: '#a855f7', icon: '⬡', top: 40.0, left: 78.0 },
    { id: 'scanner',      label: 'Scanner',       role: 'Inspector',     color: '#22c55e', icon: '⊕', top: 60.0, left: 78.0 },
    { id: 'patchengine',  label: 'PatchEngine',   role: 'Patch',         color: '#22d3ee', icon: '⚙', top: 74.4, left: 65.9 },
    { id: 'aegis',        label: 'Aegis',         role: 'Security',      color: '#22c55e', icon: '⬡', top: 80.0, left: 50.0 },
    { id: 'gocore',       label: 'Go Core',       role: 'Runtime Truth', color: '#60a5fa', icon: '◈', top: 74.4, left: 34.1 },
    { id: 'pass_gold',    label: 'PASS GOLD',     role: 'Gold Gate',     color: '#facc15', icon: '★', top: 60.0, left: 22.0 },
    { id: 'archivist',    label: 'Archivist',     role: 'Memory',        color: '#a3e635', icon: '⬡', top: 40.0, left: 22.0 },
    { id: 'github_agent', label: 'GitHub Agent',  role: 'Integrations',  color: '#94a3b8', icon: '⬡', top: 25.6, left: 34.1 },
  ];

  var fallbackMetrics = [
    { key: 'openclaw', name: 'OpenClaw', width: 0, value: '—' },
    { key: 'hermes', name: 'Hermes RCA', width: 0, value: '—' },
    { key: 'scanner', name: 'Scanner', width: 0, value: '—' },
    { key: 'aegis', name: 'Aegis', width: 0, value: '—' },
    { key: 'patchengine', name: 'PatchEngine', width: 0, value: '—' },
    { key: 'passgold', name: 'PASS GOLD', width: 0, value: '—' }
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
    var s = String(value || '').toLowerCase();
    s = s.replace(/hermes\s*rca/g, 'hermes');
    s = s.replace(/pass\s*gold/g, 'passgold');
    s = s.replace(/patch\s*engine/g, 'patchengine');
    s = s.replace(/pi\s*harness/g, 'piharness');
    s = s.replace(/go\s*core/g, 'gocore');
    s = s.replace(/github\s*agent/g, 'github');
    s = s.replace(/[^a-z0-9]/g, '');
    if (s === 'runtime') { return 'gocore'; }
    if (s === 'harness') { return 'piharness'; }
    if (s === 'memory') { return 'archivist'; }
    if (s === 'pr') { return 'github'; }
    if (s === 'patch') { return 'patchengine'; }
    return s;
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

    setText('mcCoreStatus', hasGold(payload) ? '★ GOLD' : (payload.state || payload.status || 'AGUARDA'));
    setText('mcCoreSub', hasGold(payload) ? 'PASS GOLD' : 'USER / MISSION INPUT');
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
      var point = NODES[index] ? { top: NODES[index].top, left: NODES[index].left } : position(index, agents.length);
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
    renderContracts: renderContracts
  };

  document.addEventListener('DOMContentLoaded', boot);
  if (document.readyState !== 'loading') { boot(); }
}());
