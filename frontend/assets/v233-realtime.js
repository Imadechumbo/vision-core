/* VISION CORE V2.3.4 — REAL-TIME MODE
   Preserva o layout do print 1 e troca execução síncrona por run-live + SSE. */
(function(){
  function resolveApiBase(){
    const meta = document.querySelector('meta[name="vision-api-base"]')?.content;
    const cfg = window.RUNTIME_CONFIG?.API_BASE_URL || window.API_BASE_URL || window.__VISION_API__ || meta;
    if(cfg) return String(cfg).replace(/\/$/, '');
    if(window.VisionCoreRuntime?.api) return window.VisionCoreRuntime.api;
    if(window.RUNTIME_CONFIG?.API_BASE_URL) return window.RUNTIME_CONFIG.API_BASE_URL;
    return location.origin;
  }
  const API = resolveApiBase();
  const RUN_PATH = '/api/run-live';
  const STREAM_PATH = '/run-live-stream';
  function el(id){ return document.getElementById(id); }
  async function safeFetchJson(path, opts = {}){
    let res = await fetch(API + path, opts);
    if(res.status === 405 && String(opts.method || 'GET').toUpperCase() === 'POST'){
      const body = opts.body ? JSON.parse(opts.body) : {};
      const qs = new URLSearchParams();
      Object.entries(body).forEach(([k,v]) => { if(v !== undefined && v !== null) qs.set(k, String(v)); });
      res = await fetch(API + path + (qs.toString() ? '?' + qs.toString() : ''), { method:'GET' });
    }
    const raw = await res.text();
    let data = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch { data = { ok:false, error:'invalid_json', raw, status:res.status }; }
    if(!res.ok){ data.ok = false; data.status = res.status; }
    return { res, data, raw };
  }
  window.VISION_API_READY = !!API;
  let currentSource = null;
  let lastElapsed = 0;

  
  function setProcessScreen(state, title, message, stage){
    const box = el('processScreen');
    const t = el('processTitle');
    const m = el('processMessage');
    const s = el('processStage');
    if(box){ box.classList.remove('running','gold','fail'); if(state) box.classList.add(state); }
    if(t && title) t.textContent = title;
    if(m && message) m.textContent = message;
    if(s && stage) s.textContent = stage;
  }
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
    if(state === 'running') setProcessScreen('running','Missão em execução','Pipeline vivo iniciado. Estou acompanhando OpenClaw, Scanner, Hermes, Patch e PASS GOLD.','LIVE');
    else if(state === 'gold') setProcessScreen('gold','PASS GOLD consolidado','Validação concluída com sucesso. A missão terminou em estado seguro.','GOLD');
    else if(state === 'fail') setProcessScreen('fail','Missão bloqueada','O pipeline encontrou uma falha. Nada será promovido sem PASS GOLD.','FAIL');
    else setProcessScreen('', 'VISION aguardando missão', 'Descreva o problema abaixo. Quando executar, eu vou narrar cada etapa do pipeline em tempo real.', 'READY');
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
    setProcessScreen(kind === 'fail' ? 'fail' : 'running', step.step || 'Pipeline em execução', step.detail || 'Etapa processada em tempo real pelo VISION CORE.', (step.status || 'STEP').toUpperCase());
  }

  function connectSSE(missionId){
    if(currentSource) { try{ currentSource.close(); }catch{} currentSource = null; }
    if(!window.EventSource){ addLog('SSE','EventSource indisponível; usando polling.', 'yellow'); return pollMission(missionId); }
    const url = `${API}${STREAM_PATH}?mission_id=${encodeURIComponent(missionId)}`;
    // V32: SSE bloqueado — runtime único v32 controla SSE
    if(window.__V32_OWNER__){addLog("SSE","runtime v32 ativo — v233 SSE desativado","yellow");return;}
    const es = new EventSource(url);
    currentSource = es;
    addLog('SSE', `conectando ${missionId}`, 'event');

    es.addEventListener('connected', e => addLog('SSE', 'stream conectado: ' + safeJson(e.data).status, 'event'));

    es.addEventListener('message', e => { const d=safeJson(e.data); onStep({step:d.stage||'STEP', status:(d.stage==='FAIL'||d.stage==='BLOCKED')?'fail':(d.stage==='PASS_GOLD'||d.stage==='GOLD'||d.data?.pass_gold)?'ok':'running', detail:d.message||'', elapsed_ms:Date.now()}); if(d.stage==='END'){ setLiveState(d.data?.pass_gold?'gold':''); refreshBoards(); try{es.close()}catch{} } });
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
        const r = await fetch(`${API}/api/mission/${encodeURIComponent(missionId)}`);
        if(!r.ok) return;
        const raw = await r.text();
        let d = {}; try { d = raw ? JSON.parse(raw) : {}; } catch { d = { ok:false, error:'invalid_json', raw }; }
        const steps = d.steps || d.mission?.timeline || d.timeline || [];
        steps.forEach(x => onStep({step:x.step||x.stage, status:x.status||((x.stage==='FAIL'||x.stage==='BLOCKED')?'fail':'ok'), detail:x.detail||x.message||''}));
        if(d.done || d.mission?.status || tries > 240){
          clearInterval(timer);
          const pass = d.pass_gold || d.mission?.pass_gold;
          addLog('POLL', `finalizado: ${d.status || d.mission?.status || 'done'}`, pass ? 'green' : 'event');
          setLiveState(pass ? 'gold' : '');
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
      const { res:r, data:d } = await safeFetchJson(RUN_PATH, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ project_id:project, mission, error:mission, dry_run:mode==='dry-run', mode }) });
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
    document.title = 'VISION CORE V2.3.6 SSE PIPELINE VISUAL REAL';
    const sub = document.querySelector('.brand-block .sub');
    if(sub) sub.textContent = 'V2.3.6 SSE PIPELINE VISUAL REAL • BLACK/PURPLE • SSE • LIVE PIPELINE';
    const btn = el('executeBtn');
    if(btn){ btn.onclick = runLiveMission; btn.textContent = '▷ EXECUTAR LIVE'; }
    if(!API){ addLog('CONFIG', 'API_BASE_URL obrigatório para modo real-time. Ex.: window.RUNTIME_CONFIG = { API_BASE_URL: "/api" }', 'red'); setLiveState('fail','API OFF'); } else { setLiveState('', 'LIVE'); }
  });

  // caso o script carregue após DOMContentLoaded
  if(document.readyState !== 'loading'){
    const btn = el('executeBtn');
    if(btn){ btn.onclick = runLiveMission; btn.textContent = '▷ EXECUTAR LIVE'; }
  }
})();
