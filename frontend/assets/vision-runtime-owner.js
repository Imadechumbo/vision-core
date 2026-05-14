(function () {
  'use strict';

  var running = false;
  var source = null;
  var activeMissionId = null;

  function byId(id) { return document.getElementById(id); }
  function log(line) {
    var logs = byId('runtimeLogs');
    var text = '[' + new Date().toISOString() + '] ' + line;
    if (logs) { logs.textContent = (logs.textContent ? logs.textContent + '\n' : '') + text; }
  }
  function missionText() {
    var input = byId('missionInput');
    return input ? input.value.trim() : '';
  }
  function report(payload) {
    if (window.VisionReport) { window.VisionReport.render(payload); }
    if (window.VisionAgentLocal) { window.VisionAgentLocal.update(payload); }
  }
  function release(reason) {
    running = false;
    if (source) {
      source.close();
      source = null;
    }
    if (reason) { log(reason); }
  }
  function streamState() {
    return {
      running: running,
      connected: !!source,
      mission_id: activeMissionId || '',
      source: source ? 'eventsource' : 'idle'
    };
  }
  function normalizePayload(payload) {
    if (!payload || typeof payload !== 'object') { return {}; }
    return payload;
  }
  function realMissionId(payload) {
    var id = payload && payload.mission_id;
    return typeof id === 'string' && id.trim().length > 0 ? id.trim() : '';
  }
  function handleEvent(raw) {
    var payload;
    try { payload = JSON.parse(raw); } catch (error) { payload = { logs: [raw], state: 'STREAM' }; }
    report(payload);
    if (payload.log || payload.message) { log(payload.log || payload.message); }
    var state = String(payload.state || payload.status || '').toLowerCase();
    if (state === 'done' || state === 'error' || state === 'fail' || state === 'failed') {
      release('runtime released: ' + state);
    }
  }
  async function executeMission() {
    if (running) {
      log('BLOCKED: mission already running');
      return;
    }
    if (!window.VisionApi) {
      report({ state: 'BLOCKED', block_reason: 'VisionApi unavailable' });
      log('BLOCKED: VisionApi unavailable');
      return;
    }
    var text = missionText();
    if (!text) {
      report({ state: 'BLOCKED', block_reason: 'Mission text is required' });
      log('BLOCKED: mission text is required');
      return;
    }
    running = true;
    try {
      log('POST /api/run-live');
      var start = await window.VisionApi.post('/api/run-live', { mission: text });
      var id = realMissionId(start);
      activeMissionId = id || null;
      if (!id) {
        report(Object.assign({}, start || {}, { state: 'BLOCKED', block_reason: 'Backend did not return mission_id' }));
        release('BLOCKED: backend did not return mission_id');
        return;
      }
      report(Object.assign({}, start, { state: start.state || 'RUNNING' }));
      source = new EventSource(window.VisionApi.streamUrl(id));
      source.onmessage = function (event) { handleEvent(event.data); };
      source.addEventListener('done', function (event) { handleEvent(event.data || '{"state":"done"}'); });
      source.addEventListener('fail', function (event) { handleEvent(event.data || '{"state":"fail"}'); });
      source.onerror = function () {
        report({ mission_id: id, state: 'BLOCKED', block_reason: 'stream error' });
        release('runtime released: stream error');
      };
    } catch (error) {
      report({ state: 'BLOCKED', block_reason: error.message });
      release('BLOCKED: ' + error.message);
    }
  }
  function bind() {
    var button = byId('executeMissionBtn');
    if (button) { button.addEventListener('click', function () { window.VisionRuntimeOwner.executeMission(); }); }
  }

  window.VisionRuntimeOwner = {
    executeMission: executeMission,
    realMissionId: realMissionId,
    release: release,
    handleEvent: handleEvent,
    normalizePayload: normalizePayload,
    report: report,
    streamState: streamState
  };
  document.addEventListener('DOMContentLoaded', bind);
}());
