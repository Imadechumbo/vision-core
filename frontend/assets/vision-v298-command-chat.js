
(function(){
  'use strict';

  const API = '';
  const ENDPOINTS = {
    copilot: '/api/copilot',
    hermes: '/api/hermes/analyze',
    runLive: '/api/run-live',
    stream: '/api/run-live-stream',
    memorySave: '/api/memory/save',
    memorySearch: '/api/memory/search'
  };

  const state = {
    files: [],
    streaming: true,
    running: false
  };

  function $(id){ return document.getElementById(id); }

  function apiUrl(path){
    path = String(path || '');
    path = path.replace(/\/api\/api\//g, '/api/');
    if (path.startsWith('/api/')) return path;
    if (path.startsWith('api/')) return '/' + path;
    if (!path.startsWith('/')) path = '/' + path;
    return '/api' + path;
  }

  function setGlobalPipelineState(kind){
    document.body.classList.remove('v298-pipeline-running','v298-pipeline-fail','v298-pipeline-gold','v298-pipeline-ok');
    if (kind) document.body.classList.add('v298-pipeline-' + kind);

    const shell = $('v298CommandChat');
    if (shell) {
      shell.classList.remove('v298-state-running','v298-state-fail','v298-state-gold','v298-state-ok');
      shell.classList.add('v298-state-' + (kind || 'ok'));
    }

    const status = $('v298CommandStatus');
    if (status) {
      status.textContent =
        kind === 'running' ? 'RUNNING' :
        kind === 'fail' ? 'FAIL' :
        kind === 'gold' ? 'PASS GOLD' : 'READY';
    }

    const core = $('mcCore');
    if (core) {
      core.classList.remove('running','fail','blocked','success');
      if (kind === 'running') core.classList.add('running');
      if (kind === 'fail') core.classList.add('fail');
      if (kind === 'gold') core.classList.add('success');
    }
  }

  function setTimeline(stage, status){
    const aliases = {
      'Patch':'PatchEngine',
      'Patch Engine':'PatchEngine',
      'PASS_GOLD':'PASS GOLD',
      'pass_gold':'PASS GOLD',
      'OpenClaw':'Scanner'
    };
    const normalized = aliases[stage] || stage;

    document.querySelectorAll('.v236-tl-step').forEach(el => {
      if (el.dataset.stage === normalized) {
        el.classList.remove('running','done','fail','gold');
        if (status === 'running') el.classList.add('running');
        else if (status === 'fail' || status === 'error') el.classList.add('fail');
        else if (normalized === 'PASS GOLD') el.classList.add('gold');
        else el.classList.add('done');

        const small = el.querySelector('small');
        if (small) {
          small.textContent =
            status === 'running' ? 'executando' :
            status === 'fail' ? 'erro' :
            normalized === 'PASS GOLD' ? 'GOLD' : 'ok';
        }
      }
    });

    if (status === 'running') setGlobalPipelineState('running');
    if (status === 'fail' || status === 'error') setGlobalPipelineState('fail');
    if (normalized === 'PASS GOLD') setGlobalPipelineState('gold');
  }

  function addMessage(type, text){
    const stream = $('v298ChatStream');
    if (!stream) return;

    const empty = stream.querySelector('.v298-empty-hint');
    if (empty) empty.remove();

    const msg = document.createElement('div');
    msg.className = 'v298-message ' + type;
    msg.textContent = text;
    stream.appendChild(msg);
    stream.scrollTop = stream.scrollHeight;
  }

  async function postJson(path, body){
    const res = await fetch(apiUrl(path), {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(body || {})
    });
    const text = await res.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; }
    catch { data = { ok:false, raw:text, status:res.status }; }
    if (!res.ok) data.ok = false;
    data.status = data.status || res.status;
    return data;
  }

  function looksTechnical(text){
    const t = String(text || '').toLowerCase();
    return /(erro|error|failed|cors|405|500|stack|deploy|sse|api|exception|trace|bug|regressão|regression|build|pipeline|pass gold)/i.test(t);
  }

  async function sendChat(){
    const input = $('v298Prompt');
    const mode = $('v298Mode')?.value || 'vision-geral';
    const model = $('v298Model')?.value || 'auto';
    const text = (input?.value || '').trim();
    if (!text) return;

    addMessage('user', text);
    input.value = '';
    setGlobalPipelineState('running');

    const endpoint = (mode === 'corrigir-projeto' || mode === 'debug-cors' || looksTechnical(text))
      ? ENDPOINTS.hermes
      : ENDPOINTS.copilot;

    try {
      const data = await postJson(endpoint, {
        message: text,
        mode,
        model,
        files: state.files.map(f => ({ name:f.name, size:f.size, type:f.type }))
      });

      if (!data.ok) {
        addMessage('error', 'Erro ' + (data.status || '') + ': falha na API.');
        setGlobalPipelineState('fail');
        return;
      }

      const answer = data.answer || data.rca || data.root_cause || 'Análise concluída. Posso transformar isso em missão SDDF se desejar.';
      addMessage('bot', answer);
      setGlobalPipelineState('ok');
    } catch (e) {
      addMessage('error', 'Falha de conexão: ' + e.message);
      setGlobalPipelineState('fail');
    }
  }

  async function runMission(){
    const input = $('v298Prompt');
    const text = (input?.value || '').trim() || 'executar missão SDDF';
    addMessage('user', 'MISSÃO: ' + text);

    setTimeline('Scanner','running');

    try {
      const data = await postJson(ENDPOINTS.runLive, {
        mission: text,
        mode: $('v298Mode')?.value || 'rodar-sddf',
        files: state.files.map(f => ({ name:f.name, size:f.size, type:f.type }))
      });

      if (!data.ok) {
        addMessage('error', 'Run-live falhou: ' + (data.error || data.status || 'erro'));
        setTimeline('Scanner','fail');
        return;
      }

      addMessage('system', 'Missão aceita: ' + (data.mission_id || 'sem id'));
      if (state.streaming) startSSE(text);
      else setTimeline('PASS GOLD','gold');
    } catch (e) {
      addMessage('error', 'Erro no run-live: ' + e.message);
      setTimeline('Scanner','fail');
    }
  }

  function startSSE(mission){
    // SINGLETON GUARD — respeita window.__VISION_SSE__ do v2910
    if (window.__VISION_SSE_LOCK__) {
      addMessage('system', 'SSE já ativo (singleton protegido).');
      return;
    }
    // Fecha qualquer conexão anterior
    if (window.__VISION_SSE__) {
      try { window.__VISION_SSE__.close(); } catch(_) {}
      window.__VISION_SSE__ = null;
    }
    window.__VISION_SSE_LOCK__ = true;

    try {
      const url = apiUrl(ENDPOINTS.stream) + '?mission=' + encodeURIComponent(mission || 'mission');
      // V32: EventSource bloqueado — runtime único v32 controla SSE
        const es = {readyState:2,close:function(){},addEventListener:function(){},onopen:null,onerror:null,onmessage:null};

      window.__VISION_SSE__ = es;

      es.addEventListener('open', () => {
        addMessage('system', 'SSE conectado.');
        setTimeline('Scanner','running');
        setTimeout(() => { window.__VISION_SSE_LOCK__ = false; }, 500);
      });

      es.addEventListener('step', ev => {
        const data = JSON.parse(ev.data || '{}');
        const stage = data.stage || data.step || 'STEP';
        setTimeline(stage, 'done');
        addMessage('bot', stage + ': ' + (data.message || data.status || 'ok'));
      });

      es.addEventListener('done', ev => {
        setTimeline('PASS GOLD','gold');
        addMessage('system', 'PASS GOLD confirmado.');
        es.close();
        window.__VISION_SSE__ = null;
        window.__VISION_SSE_LOCK__ = false;
      });

      es.addEventListener('ping', () => {}); // heartbeat silencioso

      es.onerror = () => {
        if (es.readyState === 2 /* CLOSED */) {
          // Conexão realmente morreu
          addMessage('error', 'SSE conexão perdida. Reconectando...');
          setGlobalPipelineState('fail');
          try { es.close(); } catch(_) {}
          window.__VISION_SSE__ = null;
          window.__VISION_SSE_LOCK__ = false;
        } else {
          // Erro não-fatal (proxy jitter) — ignorar
          console.log('[SSE v298] erro não-fatal readyState=' + es.readyState + ' — ignorado');
        }
      };
    } catch (e) {
      addMessage('error', 'Erro abrindo SSE: ' + e.message);
      setGlobalPipelineState('fail');
      window.__VISION_SSE_LOCK__ = false;
    }
  }

  function clearSession(){
    const stream = $('v298ChatStream');
    if (!stream) return;
    stream.innerHTML = '<div class="v298-empty-hint">Sessão limpa. Pergunte qualquer coisa, cole erro/log ou execute uma missão PASS GOLD.</div>';
    setGlobalPipelineState('ok');
  }

  function buildCommandChat(){
    const mission = $('mission');
    if (!mission || $('v298CommandChat')) return;

    const oldText = $('missionText');
    const initialText = oldText ? oldText.value : '';

    const shell = document.createElement('div');
    shell.className = 'v298-command-chat';
    shell.id = 'v298CommandChat';
    shell.innerHTML = `
      <div class="v298-command-head">
        <div class="v298-command-title">
          <strong>VISION AI COMMAND</strong>
          <span>Chat universal + correção de projetos com PASS GOLD</span>
        </div>
        <div class="v298-command-status" id="v298CommandStatus">READY</div>
      </div>

      <div class="v298-chat-stream" id="v298ChatStream">
        <div class="v298-empty-hint">Vision AI pronto. Converse sobre qualquer assunto, cole erros, envie arquivos/imagens ou execute uma missão SDDF.</div>
      </div>

      <div class="v298-composer">
        <div class="v298-input-wrap">
          <textarea class="v298-input" id="v298Prompt" placeholder="Pergunte qualquer coisa, cole erro, log, código... Enter = enviar, Shift+Enter = quebrar linha">${initialText || ''}</textarea>
          <div class="v298-send-stack">
            <button class="v298-send" id="v298SendBtn" type="button">ENVIAR</button>
            <button class="v298-run" id="v298RunBtn" type="button">EXECUTAR MISSÃO</button>
          </div>
        </div>

        <div class="v298-tool-row">
          <button class="v298-tool-btn" id="v298AddFilesBtn" type="button">＋ Adicionar arquivos</button>
          <button class="v298-tool-btn" id="v298ReadPrintBtn" type="button">▧ Ler print/imagem</button>
          <select class="v298-select" id="v298Mode">
            <option value="vision-geral">Vision geral</option>
            <option value="corrigir-projeto">Corrigir projeto</option>
            <option value="debug-cors">Debug CORS</option>
            <option value="explicar-leigo">Explicar para leigo</option>
            <option value="rodar-sddf">Rodar SDDF</option>
          </select>
          <select class="v298-select" id="v298Model">
            <option value="auto">Modelo automático</option>
            <option value="claude-sonnet">Claude Sonnet</option>
            <option value="gemini-flash">Gemini Flash</option>
            <option value="groq-llama">Groq/Llama</option>
            <option value="ollama-local">Ollama Local</option>
          <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
          <option value="deepseek-chat">DeepSeek Chat</option>
          <option value="llama-3.1-8b-instant">Llama 3.1 8B (Groq)</option>
          <option value="qwen/qwen3.6-plus:free">Qwen 3.6 Plus (free)</option>
          </select>
          <select class="v298-select" id="v298Streaming">
            <option value="on">Streaming ligado</option>
            <option value="off">Streaming desligado</option>
          </select>
          <button class="v298-tool-btn" id="v298ClearBtn" type="button">Limpar sessão</button>
          <input type="file" id="v298FileInput" multiple hidden>
        </div>
        <div class="v298-file-note" id="v298FileNote">Nenhum arquivo anexado.</div>
      </div>
    `;

    const timeline = mission.querySelector('.v236-compact-timeline');
    const processScreen = mission.querySelector('.vc-process-screen');

    if (timeline) timeline.insertAdjacentElement('afterend', shell);
    else if (processScreen) processScreen.insertAdjacentElement('beforebegin', shell);
    else mission.appendChild(shell);

    // Hide old controls but keep them in DOM for compatibility.
    if (processScreen) processScreen.style.display = 'none';
    if (oldText) oldText.style.display = 'none';
    const oldRow = mission.querySelector('.v236-action-row');
    if (oldRow) oldRow.style.display = 'none';

    $('v298SendBtn').onclick = sendChat;
    $('v298RunBtn').onclick = runMission;
    $('v298ClearBtn').onclick = clearSession;
    $('v298Streaming').onchange = e => state.streaming = e.target.value === 'on';

    $('v298Prompt').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChat();
      }
    });

    $('v298AddFilesBtn').onclick = () => $('v298FileInput').click();
    $('v298ReadPrintBtn').onclick = () => $('v298FileInput').click();
    $('v298FileInput').onchange = e => {
      state.files = Array.from(e.target.files || []);
      $('v298FileNote').textContent = state.files.length
        ? 'Arquivos no contexto: ' + state.files.map(f => f.name).join(' • ')
        : 'Nenhum arquivo anexado.';
      addMessage('system', state.files.length + ' arquivo(s)/imagem(ns) adicionados ao contexto.');
    };

    setGlobalPipelineState('ok');
  }

  document.addEventListener('DOMContentLoaded', buildCommandChat);
})();
