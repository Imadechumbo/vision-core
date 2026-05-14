(function () {
  'use strict';

  var running = false;
  var activeMissionId = '';

  function byId(id) { return document.getElementById(id); }
  function log(line) {
    var logs = byId('runtimeLogs');
    var text = '[' + new Date().toISOString() + '] ' + line;
    if (logs) logs.textContent = (logs.textContent ? logs.textContent + '\n' : '') + text;
  }
  function missionText() {
    var input = byId('missionInput');
    return input ? input.value.trim() : '';
  }
  function report(payload) {
    if (window.VisionReport) window.VisionReport.render(payload);
    if (window.VisionAgentLocal) window.VisionAgentLocal.update(payload);
  }
  function release(reason) {
    running = false;
    if (reason) log(reason);
  }
  function streamState() {
    return { running: running, connected: false, mission_id: activeMissionId, source: 'post-json', streamUrl: window.VisionApi ? window.VisionApi.streamUrl : null };
  }
  function normalizePayload(payload) {
    return payload && typeof payload === 'object' ? payload : {};
  }
  function realMissionId(payload) {
    var id = payload && (payload.mission_id || payload.missionId);
    return typeof id === 'string' && id.trim().length > 0 ? id.trim() : '';
  }
  function realEvidenceReceipt(payload) {
    var receipt = payload && (payload.evidence_receipt || payload.evidenceReceipt);
    if (!receipt) return null;
    if (typeof receipt === 'string') return receipt.trim().length >= 8 ? receipt.trim() : null;
    if (typeof receipt !== 'object') return null;
    if (receipt.backend_stub === true || receipt.backendStub === true) return null;
    if (receipt.source === 'backend-derived' || receipt.evidence_source === 'backend-derived') return null;
    if (typeof receipt.id === 'string' && receipt.id.trim()) return receipt;
    if (typeof receipt.gates_hash === 'string' && receipt.gates_hash.trim()) return receipt;
    return null;
  }
  function blocked(payload, reason) {
    var body = Object.assign({}, normalizePayload(payload), { state: 'BLOCKED', status: 'BLOCKED', pass_gold: false, promotion_allowed: false, block_reason: reason });
    report(body);
    release('BLOCKED: ' + reason);
    return body;
  }
  function handleEvent(raw) {
    var payload = typeof raw === 'string' ? (function () { try { return JSON.parse(raw); } catch (_) { return { message: raw }; } }()) : normalizePayload(raw);
    report(payload);
    if (payload.log || payload.message) log(payload.log || payload.message);
    var state = String(payload.state || payload.status || '').toLowerCase();
    if (state === 'done' || state === 'error' || state === 'fail' || state === 'failed' || state === 'blocked') release('runtime released: ' + state);
    return payload;
  }
  async function executeMission() {
    if (running) { log('BLOCKED: mission already running'); return; }
    if (!window.VisionApi || typeof window.VisionApi.post !== 'function') { blocked({}, 'VisionApi unavailable'); return; }
    var text = missionText();
    if (!text) { blocked({}, 'Mission text is required'); return; }
    running = true;
    activeMissionId = '';
    try {
      log('POST /api/run-live');
      var result = normalizePayload(await window.VisionApi.post('/api/run-live', { mission: text }));
      var missionId = realMissionId(result);
      var receipt = realEvidenceReceipt(result);
      activeMissionId = missionId;
      if (!missionId) { blocked(result, 'Backend did not return real mission_id'); return; }
      if (!receipt) { blocked(result, 'Backend did not return real evidence_receipt'); return; }
      if (result.backend_stub === true || result.backendStub === true) { blocked(result, 'Backend returned stub result'); return; }
      handleEvent(Object.assign({}, result, { mission_id: missionId, evidence_receipt: receipt, state: result.pass_gold === true ? 'GOLD' : 'DONE' }));
      release('runtime released: post-json complete');
    } catch (error) {
      blocked({}, error && error.message ? error.message : String(error));
    }
  }
  function bind() {
    var button = byId('executeMissionBtn');
    if (button) button.addEventListener('click', function () { window.VisionRuntimeOwner.executeMission(); });
  }
  window.VisionRuntimeOwner = { executeMission: executeMission, realMissionId: realMissionId, realEvidenceReceipt: realEvidenceReceipt, release: release, handleEvent: handleEvent, normalizePayload: normalizePayload, report: report, streamState: streamState };
  document.addEventListener('DOMContentLoaded', bind);
}());
