(function visionRuntimeOwner(){
  'use strict';

  const RUN_LIVE_PATH = '/api/run-live';
  const RUN_LIVE_STREAM_PATH = '/api/run-live-stream';
  const DEFAULT_GATEWAY = 'https://visioncore-api-gateway.weiganlight.workers.dev';
  let missionLock = false;
  let activeEventSource = null;

  window.__VISION_SSE_EVIDENCE__ = Array.isArray(window.__VISION_SSE_EVIDENCE__)
    ? window.__VISION_SSE_EVIDENCE__
    : [];

  function apiBase(){
    const configured = window.API || window.API_BASE_URL || window.__VISION_API__ || window.RUNTIME_CONFIG?.API_BASE_URL || DEFAULT_GATEWAY;
    return String(configured || '').replace(/\/$/, '');
  }

  function apiUrl(path){
    if (/^https?:\/\//i.test(path)) return path;
    return apiBase() + path;
  }

  function log(scope, message, cls){
    if (typeof window.showLog === 'function') {
      window.showLog(scope, message, cls || '');
      return;
    }
    const box = document.getElementById('logsBox');
    if (!box) return;
    box.classList.remove('empty');
    const line = document.createElement('div');
    if (cls) line.className = cls;
    line.textContent = '[' + new Date().toLocaleTimeString() + '] ' + scope + ': ' + String(message || '');
    box.appendChild(line);
    box.scrollTop = box.scrollHeight;
  }

  function setRuntimeState(state){
    if (typeof window.setRuntimeState === 'function') {
      window.setRuntimeState(state);
      return;
    }
    const monitor = document.getElementById('runtimeMonitor');
    const text = document.getElementById('runtimeText');
    if (monitor) monitor.className = state;
    if (text) text.textContent = String(state || 'stable').toUpperCase();
  }

  function readMission(){
    const missionText = document.getElementById('missionText');
    const value = missionText && missionText.value ? missionText.value.trim() : '';
    return value || 'diagnosticar runtime do projeto';
  }

  function readProject(){
    const projectSelector = document.getElementById('projectSelector');
    return (projectSelector && projectSelector.value) || 'vision-core-master';
  }

  function readMode(){
    const modeSelect = document.getElementById('runMode');
    return (modeSelect && modeSelect.value) || 'live';
  }

  function releaseLock(reason){
    missionLock = false;
    log('SDDF', 'lock liberado: ' + reason, reason === 'error' || reason === 'fail' ? 'red' : 'green');
  }

  function recordEvidence(type, event){
    let data = {};
    try { data = event && event.data ? JSON.parse(event.data) : {}; } catch (_) { data = { raw: event && event.data ? String(event.data) : '' }; }
    const receipt = {
      type,
      data,
      received_at: new Date().toISOString()
    };
    window.__VISION_SSE_EVIDENCE__.push(receipt);
    return receipt;
  }

  function closeActiveStream(){
    if (!activeEventSource) return;
    try { activeEventSource.close(); } catch (_) {}
    activeEventSource = null;
  }

  function updateTimeline(type, payload){
    const stage = payload.stage || payload.step || type;
    const status = payload.status || (type === 'done' ? 'done' : type === 'fail' ? 'fail' : 'running');
    if (typeof window.v236SetPipelineStage === 'function') {
      window.v236SetPipelineStage(stage, status);
    }
    log('SSE ' + type, payload.message || payload.detail || stage, status === 'fail' ? 'red' : status === 'done' ? 'green' : 'cyan');
  }

  function openMissionStream(missionId){
    const streamUrl = apiUrl(RUN_LIVE_STREAM_PATH) + '?mission_id=' + encodeURIComponent(missionId);
    closeActiveStream();

    activeEventSource = new EventSource(streamUrl);

    activeEventSource.addEventListener('open', function onOpen(event){
      const receipt = recordEvidence('open', event);
      updateTimeline('open', receipt.data);
    });

    activeEventSource.addEventListener('step', function onStep(event){
      const receipt = recordEvidence('step', event);
      updateTimeline('step', receipt.data);
    });

    activeEventSource.addEventListener('gate', function onGate(event){
      const receipt = recordEvidence('gate', event);
      updateTimeline('gate', receipt.data);
    });

    activeEventSource.addEventListener('done', function onDone(event){
      const receipt = recordEvidence('done', event);
      updateTimeline('done', receipt.data);
      setRuntimeState(receipt.data.pass_gold ? 'gold' : 'stable');
      closeActiveStream();
      releaseLock('done');
    });

    activeEventSource.addEventListener('fail', function onFail(event){
      const receipt = recordEvidence('fail', event);
      updateTimeline('fail', receipt.data);
      setRuntimeState('fail');
      closeActiveStream();
      releaseLock('fail');
    });

    activeEventSource.onerror = function onError(event){
      recordEvidence('error', event);
      setRuntimeState('fail');
      closeActiveStream();
      releaseLock('error');
    };
  }

  async function runMission(event){
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    if (missionLock) {
      log('SDDF', 'execução ignorada: missão já em andamento', 'yellow');
      return;
    }

    missionLock = true;
    window.__VISION_SSE_EVIDENCE__.length = 0;
    setRuntimeState('realtime');

    const mode = readMode();
    const payload = {
      project_id: readProject(),
      mission: readMission(),
      error: readMission(),
      mode,
      dry_run: mode === 'dry-run'
    };

    try {
      const response = await fetch(apiUrl(RUN_LIVE_PATH), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || data.message || 'run-live rejected');
      }
      const missionId = data.mission_id || data.missionId || data.id || (data.result && data.result.mission_id);
      if (!missionId) throw new Error('run-live sem mission_id');
      log('SDDF', 'mission_id: ' + missionId, 'green');
      openMissionStream(missionId);
    } catch (error) {
      log('SDDF', error && error.message ? error.message : error, 'red');
      setRuntimeState('fail');
      releaseLock('error');
    }
  }

  function bind(){
    const executeBtn = document.getElementById('executeBtn');
    if (!executeBtn || executeBtn.dataset.visionRuntimeOwner === 'true') return;
    executeBtn.dataset.visionRuntimeOwner = 'true';
    executeBtn.addEventListener('click', runMission);
  }

  document.addEventListener('DOMContentLoaded', bind);
  if (document.readyState !== 'loading') bind();

  window.VisionRuntimeOwner = {
    runMission,
    get locked(){ return missionLock; },
    get evidence(){ return window.__VISION_SSE_EVIDENCE__; }
  };
})();
