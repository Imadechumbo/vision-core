/* VISION CORE V2.3.4 — REAL-TIME MODE
   Preserva o layout do print 1 e troca execução síncrona por run-live + SSE. */
(function(){
  function resolveApiBase(){
    const meta = document.querySelector('meta[name="vision-api-base"]')?.content;
    const cfg = window.RUNTIME_CONFIG?.API_BASE_URL || window.API_BASE_URL || window.__VISION_API__ || meta;
    return cfg ? String(cfg).replace(/\/$/, '') : '';
  }
  const API = resolveApiBase();
  window.VISION_API_READY = !!API;
  let currentSource = null;
  let lastElapsed = 0;

  function el(id){ return document.getElementById(id); }
  function cls(node, state){ if(!node) return; node.classList.remove('vc-running','vc-gold','vc-fail'); if(state) node.classList.add(state); }
  function setLiveState(state, label){
    const runtime = el('runtimeMonitor');
    const runtimeText = el('runtimeText');
    if(runtime){ runtime.classList.remove('stable','analyzing','realtime','gold','fail'); runtime.classList.add(state === 'gold' ? 'gold' : state === 'fail' ? 'fail' : state === 'running' ? 'realtime' : 'stable'); }
    if(runtimeText) runtimeText.textContent = label || (state === 'running' ? 'LIVE SSE' : state === 'gold' ? 'GOLD' : state === 'fail' ? 'FAIL' : 'LIVE');
    cls(document.querySelector('.v23-top-eye'), state === 'running' ? 'vc-running' : state === 'gold' ? 'vc-gold' : state === 'fail' ? 'vc-fail' : '');
    cls(document.querySelector('.eye-wrap'), state === 'running' ? 'vc-running' : state === 'gold' ? 'vc-gold' : state === 'fail' ? 'vc-fail' : '');
    const core = el('mcCore');
    if(core){ core.classList.remove('vc-running','vc-gold','vc-fail'); if(state === 'running') core.classList.add('vc-running'); if(state === 'gold') core.classList.add('vc-gold'); if(state === 'fail') core.classList.add('vc-fail'); }
    const coreStatus = el('mcCoreStatus');
    if(coreStatus) coreStatus.textContent = state === 'running' ? 'RUNNING' : state === 'gold' ? 'GOLD' : state === 'fail' ? 'FAIL' : 'READY';
  }

  function addLog(scope, msg, kind='info'){
    const logsPanel = el('logsPanel');
    const box = el('logsBox');
    if(!box) return;
    if(logsPanel) logsPanel.classList.add('active');
    box.classList.remove('empty');
    const ts = new Date().toLocaleTimeString('pt-BR');
    const line = document.createElement('div');
    line.className = `v233-sse-line ${kind}`;
    line.innerHTML = `<span class="ts">${ts}</span>[${scope}] ${String(msg || '').replace(/[<>]/g,'')}`;
    box.appendChild(line);
    box.scrollTop = box.scrollHeight;
  }

  function renderLiveTimeline(steps){
    const box = el('timelineBox');
    if(!box || !steps || !steps.length) return;
    box.innerHTML = steps.slice(-12).map(s => `<div class="timelineStep live ${s.status || 'ok'}"><strong>${s.step || 'step'}</strong><span>${s.status || 'ok'}</span><small>${s.detail || ''}</small></div>`).join('');
  }

  const liveSteps = [];
  function onStep(step){
    liveSteps.push(step);
    lastElapsed = Number(step.elapsed_ms || lastElapsed || 0);
    const kind = step.status === 'fail' ? 'fail' : step.status === 'running' ? 'running' : 'ok';
    addLog(step.status || 'STEP', `${step.step || ''}${step.detail ? ' • ' + step.detail : ''}`, kind);
    renderLiveTimeline(liveSteps);
    setLiveState(kind === 'fail' ? 'fail' : 'running');
  }

  function connectSSE(missionId){
    if(currentSource) { try{ currentSource.close(); }catch{} currentSource = null; }
    if(!window.EventSource){ addLog('SSE','EventSource indisponível; usando polling.', 'yellow'); return pollMission(missionId); }
    const url = `${API}/api/missions/${encodeURIComponent(missionId)}/stream`;
    const es = new EventSource(url);
    currentSource = es;
    addLog('SSE', `conectando ${missionId}`, 'event');

    es.addEventListener('connected', e => addLog('SSE', 'stream conectado: ' + safeJson(e.data).status, 'event'));
    es.addEventListener('step', e => onStep(safeJson(e.data)));
    es.addEventListener('log', e => { const d=safeJson(e.data); addLog((d.level || 'LOG').toUpperCase(), d.text, d.level === 'warn' ? 'yellow' : 'info'); });
    es.addEventListener('plan', e => { const d=safeJson(e.data); addLog('OPENCLAW', `${d.category || 'mission'} • ${(d.agentNames||[]).join(', ')}`, 'event'); });
    es.addEventListener('scan', e => { const d=safeJson(e.data); addLog('SCANNER', d.found ? `target: ${d.file || 'found'} score ${d.score}` : 'target não encontrado', d.found ? 'ok' : 'yellow'); });
    es.addEventListener('aegis', e => { const d=safeJson(e.data); addLog('AEGIS', d.ok === false ? 'bloqueado' : 'aprovado', d.ok === false ? 'fail' : 'ok'); });
    es.addEventListener('gold', e => { const d=safeJson(e.data); const pass = d.pass_gold === true || d.level === 'GOLD' || d.status === 'GOLD'; addLog('PASS GOLD', `${d.final ?? d.score ?? ''} ${d.level || d.status || ''}`, pass ? 'green' : 'yellow'); setLiveState(pass ? 'gold' : 'running'); });
    es.addEventListener('result', e => { const d=safeJson(e.data); addLog('RESULT', `status final: ${d.status || 'done'}`, d.status === 'success' ? 'green' : d.status === 'failed' ? 'red' : 'event'); setLiveState(d.status === 'success' ? 'gold' : d.status === 'failed' ? 'fail' : ''); refreshBoards(); es.close(); });
    es.addEventListener('error', e => { addLog('SSE', 'conexão caiu; tentando polling.', 'yellow'); try{es.close()}catch{}; pollMission(missionId); });
    es.addEventListener('done', () => { addLog('SSE','stream encerrado','event'); try{es.close()}catch{}; refreshBoards(); });
  }

  function safeJson(data){ try{return JSON.parse(data || '{}')}catch{return { raw:data }} }

  async function pollMission(missionId){
    let tries = 0;
    const timer = setInterval(async () => {
      tries++;
      try{
        const r = await fetch(`${API}/api/missions/${encodeURIComponent(missionId)}/poll?since=${lastElapsed || 0}`);
        if(!r.ok) return;
        const d = await r.json();
        (d.steps || []).forEach(onStep);
        if(d.done || tries > 240){
          clearInterval(timer);
          addLog('POLL', `finalizado: ${d.status || 'done'}`, d.pass_gold ? 'green' : 'event');
          setLiveState(d.pass_gold ? 'gold' : '');
          refreshBoards();
        }
      }catch(e){ if(tries > 10){ clearInterval(timer); addLog('POLL','falha: '+e.message,'red'); setLiveState('fail'); } }
    }, 1200);
  }

  async function refreshProjectsFallback(projects){
    const selector = el('projectSelector');
    if(!selector || !Array.isArray(projects)) return;
    if(projects.length){
      selector.innerHTML = projects.map(p => '<option value="'+p.id+'">'+p.id+' • '+(p.stack||'stack')+'</option>').join('');
    } else {
      selector.innerHTML = '<option value="">Nenhum projeto registrado</option>';
    }
  }

  async function refreshBoards(){
    for(const fn of ['loadTimeline','loadScore','loadWorkers','loadVotes']){
      try{ if(typeof window[fn] === 'function') await window[fn](); }catch{}
    }
  }

  async function runLiveMission(){
    const missionText = el('missionText');
    const projectSelector = el('projectSelector');
    const runMode = el('runMode');
    const mission = (missionText && missionText.value.trim()) || 'diagnosticar runtime do projeto';
    const project = (projectSelector && projectSelector.value) || 'technetgame';
    const mode = (runMode && runMode.value) || 'dry-run';
    liveSteps.length = 0;
    lastElapsed = 0;
    if(!API){ addLog('CONFIG', 'API_BASE_URL obrigatório. Defina window.RUNTIME_CONFIG.API_BASE_URL antes de carregar o dashboard.', 'red'); setLiveState('fail','API OFF'); return; }
    if(!project){ addLog('PROJECT', 'Nenhum projeto registrado/selecionado. Registre via POST /api/projects.', 'red'); setLiveState('fail','NO PROJECT'); return; }
    setLiveState('running','LIVE SSE');
    addLog('MISSION', `iniciando real-time ${mode} em ${project}`, 'event');

    try{
      const r = await fetch(`${API}/api/missions/run-live`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ project_id:project, error:mission, dry_run:mode==='dry-run', mode }) });
      const d = await r.json();
      if(!r.ok || !d.ok){
        if(d.code === 'PROJECT_NOT_FOUND'){
          await refreshProjectsFallback(d.projects || []);
          addLog('PROJECT', (d.error || 'Projeto não encontrado') + ' • ' + (d.hint || ''), 'red');
        } else {
          addLog('MISSION', d.error || 'falha ao iniciar missão live', 'red');
        }
        setLiveState('fail');
        return;
      }
      addLog('MISSION', `mission_id: ${d.mission_id}`, 'green');
      connectSSE(d.mission_id);
    }catch(e){
      addLog('MISSION', 'erro de conexão: ' + e.message, 'red');
      setLiveState('fail');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.title = 'VISION CORE V2.3.4 HARDENED REAL-TIME';
    const sub = document.querySelector('.brand-block .sub');
    if(sub) sub.textContent = 'V2.3.4 HARDENED REAL-TIME • BLACK/PURPLE • SSE • LIVE PIPELINE';
    const btn = el('executeBtn');
    if(btn){ btn.onclick = runLiveMission; btn.textContent = '▷ EXECUTAR LIVE'; }
    if(!API){ addLog('CONFIG', 'API_BASE_URL obrigatório para modo real-time. Ex.: window.RUNTIME_CONFIG = { API_BASE_URL: "http://localhost:8787" }', 'red'); setLiveState('fail','API OFF'); } else { setLiveState('', 'LIVE'); }
  });

  // caso o script carregue após DOMContentLoaded
  if(document.readyState !== 'loading'){
    const btn = el('executeBtn');
    if(btn){ btn.onclick = runLiveMission; btn.textContent = '▷ EXECUTAR LIVE'; }
  }
})();
