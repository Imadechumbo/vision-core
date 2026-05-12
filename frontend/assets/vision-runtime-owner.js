/* VISION CORE V8.4 — SDDF runtime owner */
(function () {
  'use strict';

  var locked = false;
  var activeStream = null;
  var evidence = [];

  function apiBase() {
    var raw = window.API || window.API_BASE_URL || (window.RUNTIME_CONFIG && window.RUNTIME_CONFIG.API_BASE_URL) || window.__VISION_API__ || '';
    return String(raw || window.location.origin).replace(/\/$/, '');
  }

  function safeText(value) {
    return String(value == null ? '' : value).replace(/[<>]/g, '');
  }

  function appendLog(scope, message, cls) {
    var logsBox = document.getElementById('logsBox');
    var logsPanel = document.getElementById('logsPanel');
    if (!logsBox) return;
    if (logsPanel) logsPanel.classList.add('active');
    logsBox.classList.remove('empty');
    var line = document.createElement('div');
    if (cls) line.className = cls;
    line.textContent = '[' + new Date().toLocaleTimeString() + '] ' + scope + ': ' + safeText(message);
    logsBox.appendChild(line);
    logsBox.scrollTop = logsBox.scrollHeight;
  }

  function setRuntimeState(state) {
    var monitor = document.getElementById('runtimeMonitor');
    var text = document.getElementById('runtimeText');
    if (monitor) monitor.className = state || 'stable';
    if (text) text.textContent = String(state || 'stable').toUpperCase();
  }

  function missionText() {
    var input = document.getElementById('missionInput');
    return input ? input.value.trim() : '';
  }

  function selectedProject() {
    var input = document.getElementById('projectId');
    return (input && input.value) || 'technetgame';
  }

  function selectedMode() {
    var input = document.getElementById('runMode');
    return (input && input.value) || 'live';
  }

  function releaseLock(reason) {
    locked = false;
    setRuntimeState(reason === 'error' || reason === 'fail' ? 'fail' : 'stable');
    var btn = document.getElementById('executeBtn');
    if (btn) btn.disabled = false;
    if (activeStream) {
      try { activeStream.close(); } catch (_) {}
      activeStream = null;
    }
  }

  function recordEvidence(eventName, payload) {
    var item = {
      event: eventName,
      at: new Date().toISOString(),
      payload: payload || {}
    };
    evidence.push(item);
    window.__VISION_SSE_EVIDENCE__ = evidence.slice();
    return item;
  }

  function applyPipeline(eventName, payload) {
    var stage = payload.step || payload.stage || eventName;
    var status = payload.status || (eventName === 'done' ? 'done' : 'running');
    if (window.v236SetPipelineStage) {
      window.v236SetPipelineStage(stage, status === 'gold' ? 'gold' : status);
    }
    appendLog(stage, payload.detail || payload.message || status || eventName, eventName === 'fail' ? 'red' : '');
  }

  function streamMission(missionId) {
    if (!missionId) throw new Error('mission_id ausente');
    var url = apiBase() + '/api/run-live-stream?mission_id=' + encodeURIComponent(missionId);
    activeStream = new EventSource(url);

    function handle(eventName) {
      return function (event) {
        var payload = {};
        try { payload = JSON.parse(event.data || '{}'); } catch (_) { payload = { raw: event.data || '' }; }
        recordEvidence(eventName, payload);
        applyPipeline(eventName, payload);
        if (eventName === 'done') releaseLock('done');
        if (eventName === 'fail') releaseLock('fail');
      };
    }

    ['open', 'step', 'gate', 'done', 'fail'].forEach(function (name) {
      activeStream.addEventListener(name, handle(name));
    });
    activeStream.onmessage = handle('message');
    activeStream.onerror = function () {
      appendLog('SSE', 'erro no stream; lock liberado', 'red');
      releaseLock('error');
    };
  }

  async function runMission(event) {
    if (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
    if (locked) return;

    var mission = missionText();
    if (!mission) {
      appendLog('MISSION', 'descreva a missão antes de executar', 'red');
      return;
    }

    locked = true;
    evidence = [];
    window.__VISION_SSE_EVIDENCE__ = [];
    setRuntimeState('running');
    var btn = document.getElementById('executeBtn');
    if (btn) btn.disabled = true;

    try {
      appendLog('MISSION', 'enviando POST /api/run-live');
      var response = await fetch(apiBase() + '/api/run-live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: selectedProject(),
          mission: mission,
          mode: selectedMode(),
          dry_run: selectedMode() === 'dry-run'
        })
      });
      var data = await response.json().catch(function () { return {}; });
      if (!response.ok || data.ok === false) throw new Error(data.message || data.error || ('HTTP ' + response.status));
      var missionId = data.mission_id || (data.mission && data.mission.mission_id) || data.id;
      appendLog('MISSION', 'mission_id=' + missionId);
      streamMission(missionId);
    } catch (err) {
      appendLog('MISSION', err && err.message ? err.message : err, 'red');
      releaseLock('error');
    }
  }

  function bind() {
    var btn = document.getElementById('executeBtn');
    if (btn && !btn.dataset.sddfOwnerBound) {
      btn.dataset.sddfOwnerBound = 'true';
      btn.addEventListener('click', runMission, true);
    }
  }

  window.VisionRuntimeOwner = {
    runMission: runMission,
    getEvidence: function () { return evidence.slice(); },
    releaseLock: releaseLock
  };

  document.addEventListener('DOMContentLoaded', bind);
  if (document.readyState !== 'loading') bind();
})();
