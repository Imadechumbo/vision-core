(function () {
  'use strict';

  function byId(id) { return document.getElementById(id); }
  function validEvidence(value) { return typeof value === 'string' && value.trim().length >= 8; }
  function list(value) {
    if (Array.isArray(value)) { return value.length ? value.join('\n') : '—'; }
    return value || '—';
  }
  function boolText(value) { return value === true ? 'true' : 'false'; }
  function safeText(value) { return value === undefined || value === null || value === '' ? '—' : String(value); }

  function normalized(payload) {
    var data = payload && typeof payload === 'object' ? payload : {};
    var hasEvidence = validEvidence(data.evidence_receipt);
    var passed = data.pass_gold === true && data.promotion_allowed === true && hasEvidence;
    return {
      mission_id: data.mission_id || data.id || '—',
      project: data.project || data.repository || '—',
      mode: data.mode || 'local/runtime-owner',
      state: hasEvidence ? (data.state || data.status || 'INCOMPLETE') : 'INCOMPLETE / BLOCKED — evidence missing',
      passGold: passed,
      promotionAllowed: passed,
      evidence: hasEvidence ? data.evidence_receipt : 'evidence missing',
      rootCause: data.root_cause || data.rootCause || (hasEvidence ? '—' : 'Real evidence receipt was not provided by backend.'),
      files: data.files_changed || data.changed_files || data.files || [],
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

  function render(payload) {
    var data = normalized(payload);
    var root = byId('missionReport');
    var state = byId('reportState');
    if (!root) { return data; }
    root.replaceChildren(
      item('Mission ID', safeText(data.mission_id)),
      item('Projeto', safeText(data.project)),
      item('Modo', safeText(data.mode)),
      item('Estado', safeText(data.state)),
      item('PASS GOLD', boolText(data.passGold)),
      item('Promotion Allowed', boolText(data.promotionAllowed)),
      item('Evidence Receipt', safeText(data.evidence), true),
      item('Root Cause', safeText(data.rootCause), true),
      item('Arquivos alterados', list(data.files), true),
      item('Logs', list(data.logs), true),
      item('Motivo de bloqueio', safeText(data.blockReason), true)
    );
    if (state) {
      state.textContent = data.passGold ? 'GOLD' : 'BLOCKED';
      state.className = 'status-pill ' + (data.passGold ? 'gold' : 'blocked');
    }
    return data;
  }

  window.VisionReport = { render: render, hasValidEvidence: validEvidence };
  document.addEventListener('DOMContentLoaded', function () { render({}); });
}());
