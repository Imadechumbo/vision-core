
/*
  VISION CORE V2.9.10 CLEAN FRONT
  Runtime único:
  - sem localhost
  - sem /api/api
  - sem /api/https
  - sem fallback EB mal construído
  - POST JSON obrigatório
  - SSE limpo
*/
(function(){
  'use strict';

  const VERSION = '2.9.10-clean-front';
  const EB_BASE = 'https://visioncore-api-gateway.weiganlight.workers.dev';
  const LOG_PREFIX = '[VISION V2.9.10 CLEAN FRONT]';

  function log(){ console.log.apply(console, [LOG_PREFIX].concat(Array.from(arguments))); }
  function $(id){ return document.getElementById(id); }

  function cleanUrl(input){
    let s = String(input || '').trim();

    // Corrige bugs legados.
    s = s.replace(/^\/api\/(https?:\/\/)/i, '$1');
    s = s.replace(/\/api\/api\//g, '/api/');
    s = s.replace(/^https?:\/\/api\.technetgame\.com\.br\/api\//i, '/api/');
    s = s.replace(/^https?:\/\/visionapi\.technetgame\.com\.br\/api\//i, '/api/');
    s = s.replace(/^http:\/\/localhost:\d+\/api\//i, '/api/');

    return s;
  }

  function apiUrl(path){
    let p = cleanUrl(path);

    if (/^https?:\/\//i.test(p)) return assertUrl(p);
    if (p.startsWith('/api/')) return assertUrl('https://visioncore-api-gateway.weiganlight.workers.dev' + p);
    if (p.startsWith('api/')) return assertUrl('https://visioncore-api-gateway.weiganlight.workers.dev/' + p);
    if (!p.startsWith('/')) p = '/' + p;

    return assertUrl('https://visioncore-api-gateway.weiganlight.workers.dev/api' + p);
  }

  function ebUrl(path){
    let p = cleanUrl(path);

    if (/^https?:\/\//i.test(p)) return assertUrl(p);
    if (!p.startsWith('/api/')) {
      if (!p.startsWith('/')) p = '/' + p;
      p = '/api' + p;
    }

    return assertUrl(EB_BASE.replace(/\/$/, '') + p);
  }

  function assertUrl(url){
    if (/\/api\/https?:\/\//i.test(url)) {
      throw new Error('URL inválida bloqueada: ' + url);
    }
    if (/\/api\/api\//i.test(url)) {
      throw new Error('URL duplicada bloqueada: ' + url);
    }
    if (/localhost:\d+/i.test(url) && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      throw new Error('localhost bloqueado em produção: ' + url);
    }
    return url;
  }

  async function parseResponse(res){
    const text = await res.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; }
    catch { data = { ok:false, raw:text }; }
    return { text, data };
  }

  async function postJson(path, payload){
    const url = apiUrl(path);
    const body = JSON.stringify(payload || {});

    log('POST', url, payload || {});

    let res = await window.__nativeFetch(url, {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'Accept':'application/json' },
      credentials: 'same-origin',
      body
    });

    let parsed = await parseResponse(res);

    // Só usa EB direto se proxy falhar.
    if (!res.ok || res.status === 405 || (parsed.text || '').trim().startsWith('<')) {
      const fallback = ebUrl(path);
      log('proxy falhou', res.status, 'fallback EB', fallback);

      res = await window.__nativeFetch(fallback, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'Accept':'application/json' },
        body
      });

      parsed = await parseResponse(res);
    }

    if (!res.ok) {
      const msg = parsed.data.error || parsed.data.message || parsed.text || 'sem corpo';
      const err = new Error('HTTP ' + res.status + ': ' + msg);
      err.status = res.status;
      err.data = parsed.data;
      throw err;
    }

    return parsed.data;
  }

  async function getJson(path){
    const url = apiUrl(path);
    let res = await window.__nativeFetch(url, {
      method: 'GET',
      headers: { 'Accept':'application/json' },
      credentials: 'same-origin'
    });
    let parsed = await parseResponse(res);

    if (!res.ok || (parsed.text || '').trim().startsWith('<')) {
      const fallback = ebUrl(path);
      res = await window.__nativeFetch(fallback, {
        method: 'GET',
        headers: { 'Accept':'application/json' }
      });
      parsed = await parseResponse(res);
    }

    if (!res.ok) throw new Error('GET HTTP ' + res.status);
    return parsed.data;
  }

  function getPrompt(){
    const el = $('v298Prompt') || $('missionText') || document.querySelector('textarea');
    return (el && el.value ? el.value.trim() : '');
  }

  function getMode(){
    const native = $('v298Mode');
    const dd = document.querySelector('.v298-dd[data-for="v298Mode"]');
    return (native && native.value) || (dd && dd.dataset.value) || 'vision-geral';
  }

  function getModel(){
    const native = $('v298Model');
    const dd = document.querySelector('.v298-dd[data-for="v298Model"]');
    return (native && native.value) || (dd && dd.dataset.value) || 'auto';
  }

  function addMsg(type, text){
    const stream = $('v298ChatStream') || $('v297ChatLog') || $('v236CopilotMiniChat');
    if (!stream) {
      log(type, text);
      return;
    }

    const empty = stream.querySelector('.v298-empty-hint');
    if (empty) empty.remove();

    const div = document.createElement('div');
    div.className = stream.id === 'v298ChatStream'
      ? ('v298-message ' + (type || 'bot'))
      : ('v297-msg ' + (type || 'bot'));
    div.textContent = text;
    stream.appendChild(div);
    stream.scrollTop = stream.scrollHeight;
  }

  function setState(state){
    document.body.classList.remove(
      'v298-final-running','v298-final-fail','v298-final-gold','v298-final-ok',
      'v298-pipeline-running','v298-pipeline-fail','v298-pipeline-gold','v298-pipeline-ok'
    );

    document.body.classList.add(
      state === 'running' ? 'v298-final-running' :
      state === 'fail' ? 'v298-final-fail' :
      state === 'gold' ? 'v298-final-gold' : 'v298-final-ok'
    );

    const st = $('v298CommandStatus');
    if (st) {
      st.textContent = state === 'running' ? 'RUNNING' :
        state === 'fail' ? 'FAIL' :
        state === 'gold' ? 'PASS GOLD' : 'READY';
    }
  }

  function isTechnical(text){
    return /(erro|error|failed|cors|405|500|stack|deploy|sse|api|exception|trace|bug|regress|build|pipeline|pass gold|aws|cloudflare|elastic|beanstalk|debug)/i.test(text || '');
  }

  async function sendCopilot(){
    const message = getPrompt();
    if (!message) {
      addMsg('error', 'Mensagem vazia bloqueada.');
      return;
    }

    addMsg('user', message);
    setState('running');

    const mode = getMode();
    const model = getModel();
    const endpoint = (mode === 'corrigir-projeto' || mode === 'debug-cors' || isTechnical(message))
      ? '/hermes/analyze'
      : '/copilot';

    try {
      const data = await postJson(endpoint, {
        message,
        mode,
        model,
        source: VERSION
      });

      const answer = data.answer || data.reply || data.rca || data.root_cause || data.message || JSON.stringify(data, null, 2);
      addMsg('bot', answer);
      setState('ok');
    } catch(e) {
      addMsg('error', 'Erro: ' + e.message);
      setState('fail');
    }
  }

  async function runMission(){
    const mission = getPrompt() || 'executar missão SDDF';
    addMsg('user', 'MISSÃO: ' + mission);
    setState('running');

    try {
      const data = await postJson('/run-live', {
        mission,
        mode: getMode(),
        model: getModel(),
        source: VERSION
      });

      addMsg('system', 'Missão aceita: ' + (data.mission_id || data.status || 'ok'));
      startSSE(mission);
    } catch(e) {
      addMsg('error', 'Run-live falhou: ' + e.message);
      setState('fail');
    }
  }

  // ============================================================
  // SSE SINGLETON — 1 missão = 1 conexão SSE. Sem fallback EB.
  // ============================================================
  window.__VISION_SSE__      = window.__VISION_SSE__      || null;
  window.__VISION_SSE_LOCK__ = window.__VISION_SSE_LOCK__ || false;
  window.__VISION_SSE_RETRY_T__ = window.__VISION_SSE_RETRY_T__ || null;

  var SSE_BACKOFF = [1000, 2000, 5000, 10000];

  function closeSSE(){
    if (window.__VISION_SSE_RETRY_T__) {
      clearTimeout(window.__VISION_SSE_RETRY_T__);
      window.__VISION_SSE_RETRY_T__ = null;
    }
    if (window.__VISION_SSE__) {
      try { window.__VISION_SSE__.close(); } catch(_){}
      window.__VISION_SSE__ = null;
    }
    window.__VISION_SSE_LOCK__ = false;
    window.__VISION_SSE_RETRY_INDEX__ = 0; // reset para próxima missão
  }

  function startSSE(mission){
    // V32 GUARD: runtime único v32 controla SSE — v2910 delegado
    if(window.__V32_OWNER__){
      console.log('[v2910] startSSE delegado ao V32');
      if(typeof window.startSSE === 'function') window.startSSE(mission);
      return;
    }
    // Garante stream anterior fechado antes de qualquer coisa.
    closeSSE();

    var url = apiUrl('/run-live-stream') + '?mission=' + encodeURIComponent(mission || 'mission');
    // retryIndex global por sessão — não reseta ao reconectar
    if (!window.__VISION_SSE_RETRY_INDEX__) window.__VISION_SSE_RETRY_INDEX__ = 0;
    // resetar apenas quando nova missão é iniciada (closeSSE foi chamado antes)
    var retryIndex = window.__VISION_SSE_RETRY_INDEX__;

    function open(){
      // Bloco de concorrência: só 1 abertura por vez.
      if (window.__VISION_SSE_LOCK__) {
        log('SSE LOCK ativo, ignorando abertura duplicada');
        return;
      }
      window.__VISION_SSE_LOCK__ = true;

      log('SSE abrindo conexão única:', url);
      var es = new window.__nativeEventSource(url);
      window.__VISION_SSE__ = es;

      es.addEventListener('open', function(){
        retryIndex = 0; // reseta backoff em conexão bem-sucedida
        addMsg('system', 'SSE conectado.');
        log('SSE conectado');
        // Libera lock após handshake confirmado
        setTimeout(function(){ window.__VISION_SSE_LOCK__ = false; }, 500);
      });

      es.addEventListener('step', function(ev){
        try {
          var d = JSON.parse(ev.data || '{}');
          addMsg('bot', (d.stage || 'step') + ': ' + (d.message || d.status || 'ok'));
        } catch(e){ log('SSE step parse error', e); }
      });

      es.addEventListener('gate', function(ev){
        try {
          var d = JSON.parse(ev.data || '{}');
          addMsg('system', (d.stage || 'gate') + ': ' + (d.status || 'PASS'));
        } catch(e){ log('SSE gate parse error', e); }
      });

      es.addEventListener('pass_gold', function(){
        addMsg('system', 'PASS GOLD confirmado.');
        setState('gold');
        closeSSE(); // missão completa, fecha conexão
      });

      es.addEventListener('done', function(){
        setState('gold');
        closeSSE();
      });

      // Heartbeat ping — mantém conexão viva, não exibe na UI
      es.addEventListener('ping', function(){
        log('SSE heartbeat ping');
      });

      es.onerror = function(){
        // ── AEGIS: só reconecta se a conexão MORREU de verdade ──────────
        // readyState: 0=CONNECTING, 1=OPEN, 2=CLOSED
        // onerror dispara em jitter de proxy, chunking, heartbeat delay —
        // NÃO reconectar nesses casos, senão cria reconnect storm.

        if (es.readyState === 2 /* CLOSED */) {
          // Conexão morreu — reconectar com backoff
          log('SSE fechado (CLOSED) → reconectar');
          try { es.close(); } catch(_){}
          window.__VISION_SSE__ = null;
          window.__VISION_SSE_LOCK__ = false;

          var delay = SSE_BACKOFF[Math.min(retryIndex, SSE_BACKOFF.length - 1)];
          retryIndex++;
          window.__VISION_SSE_RETRY_INDEX__ = retryIndex;

          if (retryIndex > SSE_BACKOFF.length) {
            addMsg('error', 'SSE falhou após todas as tentativas.');
            setState('fail');
            return;
          }

          log('SSE reconectando em ' + delay + 'ms (tentativa ' + retryIndex + ')');
          window.__VISION_SSE_RETRY_T__ = setTimeout(open, delay);

        } else {
          // readyState === 0 (CONNECTING) ou 1 (OPEN) → erro não-fatal
          // Proxy jitter, chunking, heartbeat timing — ignorar silenciosamente
          log('SSE erro não-fatal (readyState=' + es.readyState + ') — ignorado, stream continua');
        }
      };
    }

    open();
  }

  function patchNetwork(){
    if (!window.__nativeFetch) window.__nativeFetch = window.fetch.bind(window);
    if (!window.__nativeEventSource) window.__nativeEventSource = window.EventSource;

    if (!window.__VISION_V2910_FETCH__) {
      window.__VISION_V2910_FETCH__ = true;
      window.fetch = function(input, init){
        if (typeof input === 'string') {
          input = apiUrl(input);
        } else if (input && input.url) {
          const fixed = apiUrl(input.url);
          if (fixed !== input.url) input = new Request(fixed, input);
        }
        return window.__nativeFetch(input, init);
      };
    }

    if (!window.__VISION_V2910_SSE__) {
      window.__VISION_V2910_SSE__ = true;
      window.EventSource = function(url, cfg){
        return new window.__nativeEventSource(apiUrl(url), cfg);
      };
      window.EventSource.prototype = window.__nativeEventSource.prototype;
    }

    window.VisionCoreRuntime = window.VisionCoreRuntime || {};
    window.VisionCoreRuntime.apiUrl = apiUrl;
    window.VisionCoreRuntime.withBase = apiUrl;
    window.VisionCoreRuntime.rewriteUrl = cleanUrl;
    window.VisionApi = { apiUrl, ebUrl, postJson, getJson, sendCopilot, runMission };

    window.__VISION_API__ = 'https://visioncore-api-gateway.weiganlight.workers.dev';
    window.API = 'https://visioncore-api-gateway.weiganlight.workers.dev';
    window.API_BASE_URL = 'https://visioncore-api-gateway.weiganlight.workers.dev';
    window.getVisionApi = () => 'https://visioncore-api-gateway.weiganlight.workers.dev';
  }

  function intercept(e){
    const target = e.target && e.target.closest ? e.target.closest('button,a,input[type="submit"]') : null;
    if (!target) return;

    const id = target.id || '';
    const text = (target.textContent || target.value || '').trim().toLowerCase();

    const isSend =
      id === 'v298SendBtn' ||
      id === 'v297SendBtn' ||
      id === 'v236CopilotBtn' ||
      text === 'enviar';

    const isRun =
      id === 'v298RunBtn' ||
      id === 'v297RunBtn' ||
      id === 'executeBtn' ||
      text.includes('executar missão') ||
      text.includes('executar live');

    if (isSend || isRun) {
      e.preventDefault();
      e.stopPropagation();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();
      if (isRun) runMission();
      else sendCopilot();
    }
  }

  function patchForms(){
    document.querySelectorAll('form').forEach(form => {
      if (form.dataset.v2910Patched) return;
      form.dataset.v2910Patched = 'true';
      form.addEventListener('submit', e => {
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        sendCopilot();
      }, true);
    });

    const input = $('v298Prompt') || $('missionText') || document.querySelector('textarea');
    if (input && !input.dataset.v2910Patched) {
      input.dataset.v2910Patched = 'true';
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          e.stopPropagation();
          sendCopilot();
        }
      }, true);
    }
  }

  function cleanupLegacyVisualNoise(){
    // Mantém UI. Só reduz duplicatas óbvias de timeline abaixo do command chat.
    const chat = $('v298CommandChat');
    if (chat) {
      let n = chat.nextElementSibling;
      while (n) {
        if (/timeline/i.test(n.className || '') && n.className.indexOf('v2910-keep') === -1) {
          n.style.display = 'none';
        }
        n = n.nextElementSibling;
      }
    }
  }

  async function selfTest(){
    try {
      const h = await getJson('/health');
      log('health ok', h.version || h.status || h.ok);
    } catch(e) {
      log('health falhou', e.message);
    }
  }

  function boot(){
    patchNetwork();
    document.addEventListener('click', intercept, true);
    patchForms();
    cleanupLegacyVisualNoise();
    setTimeout(patchForms, 500);
    setTimeout(cleanupLegacyVisualNoise, 800);
    setTimeout(patchForms, 1500);
    selfTest();
    log('ativo: runtime único limpo');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
