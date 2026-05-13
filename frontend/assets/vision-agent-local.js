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
  function position(index, total) {
    var angle = (Math.PI * 2 * index / total) - Math.PI / 2;
    var radius = 38;
    return {
      left: 50 + Math.cos(angle) * radius,
      top: 50 + Math.sin(angle) * radius
    };
  }
  function showDetail(agent) {
    var detail = byId('agentDetail');
    if (!detail) { return; }
    var evidence = hasEvidence(lastPayload) ? lastPayload.evidence_receipt : 'missing';
    detail.textContent = agent.name + ' · contrato: ' + agent.contract + ' · status: ' + statusFor(agent, lastPayload) + ' · evidence: ' + evidence;
  }
  function render() {
    var orbit = byId('agentOrbit');
    if (!orbit) { return; }
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
    var status = byId('agentStatus');
    if (status) {
      status.textContent = hasGold(lastPayload) ? 'GOLD VERIFIED' : (lastPayload.state || lastPayload.status || 'WAITING');
      status.className = 'status-pill ' + (hasGold(lastPayload) ? 'gold' : 'muted');
    }
  }
  function update(payload) {
    lastPayload = payload && typeof payload === 'object' ? payload : {};
    render();
    return { gold: hasGold(lastPayload), evidence: hasEvidence(lastPayload) };
  }

  window.VisionAgentLocal = { update: update, render: render };
  document.addEventListener('DOMContentLoaded', render);
}());
