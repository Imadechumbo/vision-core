(function () {
  'use strict';

  var agents = [
    { name: 'OpenClaw', contract: 'Coordena a missão e valida handoff entre agentes.' },
    { name: 'Scanner', contract: 'Inspeciona sinais, riscos e evidências técnicas.' },
    { name: 'Hermes', contract: 'Comunica eventos, status e síntese operacional.' },
    { name: 'PatchEngine', contract: 'Prepara alterações somente quando há contrato válido.' },
    { name: 'Aegis', contract: 'Aplica política de bloqueio e segurança.' },
    { name: 'PASS GOLD', contract: 'Só acende com autorização de promoção e recibo de evidência válido.', gold: true },
    { name: 'PR GitHub', contract: 'Depende de integração autorizada pelo servidor.' }
  ];
  var lastPayload = {};

  function byId(id) { return document.getElementById(id); }
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
  function showDetail(agent) {
    var detail = byId('agentDetail') || byId('mcTooltip');
    if (!detail) { return; }
    var evidence = hasEvidence(lastPayload) ? lastPayload.evidence_receipt : 'missing';
    detail.textContent = agent.name + ' · contrato: ' + agent.contract + ' · status: ' + statusFor(agent, lastPayload) + ' · evidence: ' + evidence;
  }
  function updateLegacyOrbit(payload) {
    var map = {
      openclaw: 'OpenClaw',
      scanner: 'Scanner',
      hermes: 'Hermes',
      patchengine: 'PatchEngine',
      aegis: 'Aegis',
      passgold: 'PASS GOLD',
      github: 'PR GitHub'
    };
    Object.keys(map).forEach(function (key) {
      var node = document.querySelector('[data-key="' + key + '"]');
      if (!node) { return; }
      var agent = agents.find(function (item) { return item.name === map[key]; }) || agents[0];
      var small = node.querySelector('small');
      if (small) { small.textContent = statusFor(agent, payload); }
      node.addEventListener('click', function () { showDetail(agent); }, { once: false });
    });
    var status = byId('mcCoreStatus') || byId('agentStatus');
    if (status) { status.textContent = hasGold(payload) ? 'GOLD' : (payload.state || payload.status || 'READY'); }
  }
  function render() {
    var orbit = byId('agentOrbit');
    if (!orbit) {
      updateLegacyOrbit(lastPayload);
      return;
    }
    orbit.replaceChildren();
    agents.forEach(function (agent, index) {
      var angle = (Math.PI * 2 * index / agents.length) - Math.PI / 2;
      var radius = 38;
      var node = document.createElement('button');
      node.type = 'button';
      node.className = 'agent-node' + (agent.gold ? ' is-gold' : '');
      node.style.left = 'calc(' + (50 + Math.cos(angle) * radius) + '% - 56px)';
      node.style.top = 'calc(' + (50 + Math.sin(angle) * radius) + '% - 38px)';
      node.innerHTML = '<strong></strong><small></small>';
      node.querySelector('strong').textContent = agent.name;
      node.querySelector('small').textContent = statusFor(agent, lastPayload);
      node.addEventListener('click', function () { showDetail(agent); });
      orbit.appendChild(node);
    });
  }
  function update(payload) {
    lastPayload = payload && typeof payload === 'object' ? payload : {};
    render();
    return { gold: hasGold(lastPayload), evidence: hasEvidence(lastPayload) };
  }

  window.VisionAgentLocal = { update: update, render: render };
  document.addEventListener('DOMContentLoaded', render);
}());
