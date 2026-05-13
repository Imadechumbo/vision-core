(function () {
  'use strict';

  function byId(id) { return document.getElementById(id); }
  function validEvidence(value) { return typeof value === 'string' && value.trim().length >= 8; }
  function safeText(value) { return value === undefined || value === null || value === '' ? '—' : String(value); }
  function boolText(value) { return value === true ? 'true' : 'false'; }
  function list(value) {
    if (Array.isArray(value)) { return value.length ? value.map(safeText).join('\n') : '—'; }
    return safeText(value);
  }

  function normalized(payload) {
    var data = payload && typeof payload === 'object' ? payload : {};
    var hasEvidence = validEvidence(data.evidence_receipt);
    var passed = data.pass_gold === true && data.promotion_allowed === true && hasEvidence;
    return {
      mission_id: data.mission_id || data.missionId || data.id || '—',
      project: data.project || data.project_id || data.repository || '—',
      mode: data.mode || data.execution_mode || 'local/runtime-owner',
      difficulty: data.difficulty || data.pi_difficulty || '—',
      layer: data.layer || data.current_layer || data.max_layer || '—',
      state: hasEvidence ? (data.state || data.status || 'INCOMPLETE') : 'INCOMPLETE / BLOCKED — evidence missing',
      passGold: passed,
      promotionAllowed: passed,
      evidence: hasEvidence ? data.evidence_receipt : 'evidence missing',
      rootCause: data.root_cause || data.rootCause || (hasEvidence ? '—' : 'Real evidence receipt was not provided by backend.'),
      files: data.files_changed || data.changed_files || data.files || [],
      commands: data.commands || data.commands_run || [],
      validations: data.validations || data.validation_results || data.tests || [],
      snapshot: data.snapshot_id || data.snapshot || '—',
      logs: data.logs || data.events || [],
      blockReason: hasEvidence ? (data.block_reason || data.blocked_reason || '—') : 'BLOCKED — evidence missing'
    };
  }

  function item(label, value, full) {
    var node = document.createElement('div');
    node.className = 'report-item' + (full ? ' full' : '');
    var title = document.createElement('b');
    title.textContent = label;
    var body = document.createElement(full ? 'pre' : 'span');
    body.textContent = value;
    node.append(title, body);
    return node;
  }

  function chatTarget() {
    return byId('v298ChatStream') || byId('v297ChatLog') || byId('v236CopilotMiniChat') || document.querySelector('.v236-copilot-mini-chat');
  }

  function reportRow(label, value, gold) {
    var row = document.createElement('div');
    row.className = 'v44-report-row';
    var left = document.createElement('span');
    var right = document.createElement('b');
    left.textContent = label + ':';
    right.textContent = safeText(value);
    if (gold) { right.className = 'gold'; }
    row.append(left, right);
    return row;
  }

  function renderChat(payload) {
    var target = chatTarget();
    if (!target) { return null; }
    var data = normalized(payload);
    var existing = target.querySelector('.v14-clean-mission-report');
    if (existing) { existing.remove(); }
    var card = document.createElement('div');
    card.className = 'v44-mission-report v14-clean-mission-report';
    var title = document.createElement('div');
    title.className = 'v44-report-title';
    title.textContent = '📋 MISSION REPORT';
    card.appendChild(title);
    card.append(
      reportRow('Mission ID', data.mission_id),
      reportRow('Project', data.project),
      reportRow('Difficulty', data.difficulty),
      reportRow('SDDF Layer', data.layer),
      reportRow('State', data.state),
      reportRow('PASS GOLD', boolText(data.passGold), data.passGold),
      reportRow('Promotion Allowed', boolText(data.promotionAllowed)),
      reportRow('Snapshot ID', data.snapshot),
      reportRow('Evidence Receipt', data.evidence, data.passGold),
      reportRow('Block Reason', data.blockReason)
    );
    target.appendChild(card);
    try { card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (_) {}
    return card;
  }

  function render(payload) {
    var data = normalized(payload);
    var root = byId('missionReport');
    var state = byId('reportState');
    if (root) {
      root.replaceChildren(
        item('Mission ID', safeText(data.mission_id)),
        item('Projeto', safeText(data.project)),
        item('Modo', safeText(data.mode)),
        item('Dificuldade', safeText(data.difficulty)),
        item('Camada SDDF', safeText(data.layer)),
        item('Estado', safeText(data.state)),
        item('PASS GOLD', boolText(data.passGold)),
        item('Promotion Allowed', boolText(data.promotionAllowed)),
        item('Evidence Receipt', safeText(data.evidence), true),
        item('Root Cause', safeText(data.rootCause), true),
        item('Arquivos alterados', list(data.files), true),
        item('Comandos', list(data.commands), true),
        item('Validações', list(data.validations), true),
        item('Snapshot', safeText(data.snapshot)),
        item('Logs', list(data.logs), true),
        item('Motivo de bloqueio', safeText(data.blockReason), true)
      );
    }
    if (state) {
      state.textContent = data.passGold ? 'GOLD' : 'BLOCKED';
      state.className = 'status-pill ' + (data.passGold ? 'gold' : 'blocked');
    }
    if (payload && typeof payload === 'object' && (payload.evidence_receipt || payload.mission_id || payload.status || payload.state)) {
      renderChat(payload);
    }
    return data;
  }

  window.VisionReport = {
    render: render,
    renderChat: renderChat,
    normalize: normalized,
    renderMissionReport: render,
    renderMissionReportChat: renderChat,
    hasValidEvidence: validEvidence,
    hasGoldEvidence: function (payload) {
      var data = payload && typeof payload === 'object' ? payload : {};
      return data.pass_gold === true && data.promotion_allowed === true && validEvidence(data.evidence_receipt);
    }
  };

  document.addEventListener('DOMContentLoaded', function () { render({}); });
}());
