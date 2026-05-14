(function () {
  'use strict';

  var running = false;
  var source = null;
<<<<<<< Updated upstream
  var activeMissionId = '';

  function byId(id) { return document.getElementById(id); }
  function firstByIds(ids) {
    for (var i = 0; i < ids.length; i += 1) {
      var node = byId(ids[i]);
      if (node) { return node; }
    }
    return null;
  }
  function log(line) {
    var logs = firstByIds(['runtimeLogs', 'logsBox', 'timelineBox']);
    var text = '[' + new Date().toISOString() + '] ' + line;
    if (logs) { logs.textContent = (logs.textContent ? logs.textContent + '\n' : '') + text; }
    else { console.log('[VisionRuntimeOwner]', line); }
  }
  function missionText() {
    var input = firstByIds(['missionInput', 'missionText', 'v298Prompt']);
    return input ? input.value.trim() : '';
  }
  function projectId() {
    var select = byId('projectSelector');
    return select && select.value ? select.value : 'vision-core';
  }
  function runMode() {
    var select = byId('runMode') || byId('v298Mode');
    return select && select.value ? select.value : 'dry-run';
  }
  function setStatus(text, state) {
    var status = firstByIds(['runtimeText', 'processStage', 'v298CommandStatus']);
    if (status) { status.textContent = text; }
    var core = byId('mcCore');
    if (core) {
      core.classList.remove('running', 'success', 'fail');
      if (state === 'running') { core.classList.add('running'); }
      if (state === 'gold') { core.classList.add('success'); }
      if (state === 'fail') { core.classList.add('fail'); }
    }
    var coreStatus = byId('mcCoreStatus');
    if (coreStatus) { coreStatus.textContent = text; }
  }
=======

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
>>>>>>> Stashed changes
  function report(payload) {
    if (window.VisionReport) { window.VisionReport.render(payload); }
    if (window.VisionAgentLocal) { window.VisionAgentLocal.update(payload); }
  }
<<<<<<< Updated upstream
  function closeSource() {
    if (source) {
      try { source.close(); } catch (_) {}
      source = null;
    }
  }
  function release(reason) {
    running = false;
    closeSource();
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
  function realMissionId(payload) {
    var id = payload && (payload.mission_id || payload.missionId || payload.id);
    return typeof id === 'string' && id.trim().length > 0 ? id.trim() : '';
  }
  function normalizePayload(raw, fallbackState) {
    var payload;
    try { payload = typeof raw === 'string' ? JSON.parse(raw || '{}') : (raw || {}); }
    catch (_) { payload = { logs: [String(raw || '')], state: fallbackState || 'STREAM' }; }
    if (!payload.state && fallbackState) { payload.state = fallbackState; }
    if (!payload.mission_id && activeMissionId) { payload.mission_id = activeMissionId; }
    return payload;
  }
  function handleEvent(raw, fallbackState) {
    var payload = normalizePayload(raw, fallbackState);
    report(payload);
    if (payload.log || payload.message) { log(payload.log || payload.message); }
    var state = String(payload.state || payload.status || '').toLowerCase();
    if (payload.pass_gold === true && payload.promotion_allowed === true && payload.evidence_receipt) {
      setStatus('GOLD', 'gold');
    } else if (state === 'done' || state === 'completed') {
      setStatus('DONE', 'running');
      release('runtime released: ' + state);
    } else if (state === 'error' || state === 'fail' || state === 'failed' || state === 'blocked') {
      setStatus('BLOCKED', 'fail');
      release('runtime released: ' + state);
    }
  }
  function requireApi() {
    if (!window.VisionApi) {
      report({ state: 'BLOCKED', block_reason: 'VisionApi unavailable' });
      log('BLOCKED: VisionApi unavailable');
      return false;
    }
    return true;
  }
=======
  function release(reason) {
    running = false;
    if (source) {
      source.close();
      source = null;
    }
    if (reason) { log(reason); }
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
>>>>>>> Stashed changes
  async function executeMission() {
    if (running) {
      log('BLOCKED: mission already running');
      return;
    }
<<<<<<< Updated upstream
    if (!requireApi()) { return; }
=======
    if (!window.VisionApi) {
      report({ state: 'BLOCKED', block_reason: 'VisionApi unavailable' });
      log('BLOCKED: VisionApi unavailable');
      return;
    }
>>>>>>> Stashed changes
    var text = missionText();
    if (!text) {
      report({ state: 'BLOCKED', block_reason: 'Mission text is required' });
      log('BLOCKED: mission text is required');
      return;
    }
    running = true;
<<<<<<< Updated upstream
    closeSource();
    activeMissionId = '';
    setStatus('RUNNING', 'running');
    try {
      log('POST /api/run-live');
      var start = await window.VisionApi.post('/api/run-live', {
        mission: text,
        input: text,
        project_id: projectId(),
        mode: runMode(),
        source: 'vision-runtime-owner'
      });
=======
    try {
      log('POST /api/run-live');
      var start = await window.VisionApi.post('/api/run-live', { mission: text });
>>>>>>> Stashed changes
      var id = realMissionId(start);
      if (!id) {
        report(Object.assign({}, start || {}, { state: 'BLOCKED', block_reason: 'Backend did not return mission_id' }));
        release('BLOCKED: backend did not return mission_id');
        return;
      }
<<<<<<< Updated upstream
      activeMissionId = id;
      report(Object.assign({}, start, { mission_id: id, state: start.state || 'RUNNING' }));
      log('STREAM ' + window.VisionApi.streamUrl(id));
      source = new EventSource(window.VisionApi.streamUrl(id));
      source.onmessage = function (event) { handleEvent(event.data, 'STREAM'); };
      ['open', 'step', 'gate', 'progress', 'pass_gold', 'done', 'completed', 'fail', 'error'].forEach(function (name) {
        source.addEventListener(name, function (event) { handleEvent(event.data || '{}', name); });
      });
=======
      report(Object.assign({}, start, { state: start.state || 'RUNNING' }));
      source = new EventSource(window.VisionApi.streamUrl(id));
      source.onmessage = function (event) { handleEvent(event.data); };
      source.addEventListener('done', function (event) { handleEvent(event.data || '{"state":"done"}'); });
      source.addEventListener('fail', function (event) { handleEvent(event.data || '{"state":"fail"}'); });
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
    ['executeMissionBtn', 'executeBtn'].forEach(function (id) {
      var button = byId(id);
      if (!button || button.__visionRuntimeOwnerBound) { return; }
      button.__visionRuntimeOwnerBound = true;
      button.addEventListener('click', function (event) {
        if (event && event.preventDefault) { event.preventDefault(); }
        executeMission();
      });
    });
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
  if (document.readyState !== 'loading') { bind(); }
=======
    var button = byId('executeMissionBtn');
    if (button) { button.addEventListener('click', function () { window.VisionRuntimeOwner.executeMission(); }); }
  }

  window.VisionRuntimeOwner = { executeMission: executeMission };
  document.addEventListener('DOMContentLoaded', bind);
>>>>>>> Stashed changes
}());
