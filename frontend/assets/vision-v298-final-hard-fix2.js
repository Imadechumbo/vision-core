
(function(){
  'use strict';

  const defs = {
    v298Mode: [
      ['vision-geral','Vision geral'],
      ['corrigir-projeto','Corrigir projeto'],
      ['debug-cors','Debug CORS'],
      ['explicar-leigo','Explicar para leigo'],
      ['rodar-sddf','Rodar SDDF']
    ],
    v298Model: [
      ['auto','Modelo automático'],
      ['claude-sonnet','Claude Sonnet'],
      ['gemini-flash','Gemini Flash'],
      ['groq-llama','Groq/Llama'],
      ['ollama-local','Ollama Local']
    ],
    v298Streaming: [
      ['on','Streaming ligado'],
      ['off','Streaming desligado']
    ]
  };

  function $(id){ return document.getElementById(id); }

  function hardenUrl(u){
    return String(u || '')
      .replace(/\/api\/api\//g, '/api/')
      .replace(/^https?:\/\/\/api\//i, '/api/')
      .replace(/^https?:\/\/api(\/.*)?$/i, (_, p) => '/api' + (p || ''));
  }

  function patchNetwork(){
    const nativeFetch = window.fetch ? window.fetch.bind(window) : null;
    if (nativeFetch && !window.__VISION_FIX2_FETCH__) {
      window.__VISION_FIX2_FETCH__ = true;
      window.fetch = function(input, init){
        if (typeof input === 'string') input = hardenUrl(input);
        else if (input && input.url) {
          const fixed = hardenUrl(input.url);
          if (fixed !== input.url) input = new Request(fixed, input);
        }
        return nativeFetch(input, init);
      };
    }

    const NativeEventSource = window.EventSource;
    if (NativeEventSource && !window.__VISION_FIX2_SSE__) {
      window.__VISION_FIX2_SSE__ = true;
      window.EventSource = function(url, cfg){
        return new NativeEventSource(hardenUrl(url), cfg);
      };
      window.EventSource.prototype = NativeEventSource.prototype;
    }
  }

  function hideNativeSelects(){
    Object.keys(defs).forEach(id => {
      const sel = $(id);
      if (sel) {
        sel.style.display = 'none';
        sel.style.visibility = 'hidden';
        sel.style.opacity = '0';
        sel.setAttribute('aria-hidden', 'true');
        sel.tabIndex = -1;
      }
    });
  }

  function removeExistingCustom(id){
    document.querySelectorAll(`.v298-dd[data-for="${id}"]`).forEach(el => el.remove());
  }

  function makeDropdown(id){
    const native = $(id);
    if (!native) return;

    removeExistingCustom(id);

    const options = defs[id];
    const current = native.value || options[0][0];

    const wrap = document.createElement('div');
    wrap.className = 'v298-dd';
    wrap.dataset.for = id;
    wrap.dataset.value = current;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'v298-dd-btn';

    const currentLabel = (options.find(x => x[0] === current) || options[0])[1];
    btn.textContent = currentLabel;

    const menu = document.createElement('div');
    menu.className = 'v298-dd-menu';

    options.forEach(([value,label]) => {
      const item = document.createElement('div');
      item.className = 'v298-dd-item' + (value === current ? ' active' : '');
      item.dataset.value = value;
      item.textContent = label;
      item.addEventListener('click', e => {
        e.stopPropagation();
        wrap.dataset.value = value;
        btn.textContent = label;
        native.value = value;
        menu.querySelectorAll('.v298-dd-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        wrap.classList.remove('open');
        native.dispatchEvent(new Event('change', { bubbles:true }));
      });
      menu.appendChild(item);
    });

    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      document.querySelectorAll('.v298-dd.open').forEach(d => {
        if (d !== wrap) d.classList.remove('open');
      });
      wrap.classList.toggle('open');
    });

    wrap.appendChild(btn);
    wrap.appendChild(menu);

    native.insertAdjacentElement('afterend', wrap);
  }

  function patchValuesForOtherScripts(){
    // Garante que scripts que leem .value ainda funcionem.
    window.v298GetCommandMode = () => ($('v298Mode')?.value || document.querySelector('.v298-dd[data-for="v298Mode"]')?.dataset.value || 'vision-geral');
    window.v298GetCommandModel = () => ($('v298Model')?.value || document.querySelector('.v298-dd[data-for="v298Model"]')?.dataset.value || 'auto');
    window.v298GetStreaming = () => ($('v298Streaming')?.value || document.querySelector('.v298-dd[data-for="v298Streaming"]')?.dataset.value || 'on');
  }

  function removeDuplicateTimeline(){
    const chat = $('v298CommandChat');
    if (!chat) return;

    // esconde qualquer timeline depois do chat
    let node = chat.nextElementSibling;
    while (node) {
      if (
        node.classList?.contains('v236-compact-timeline') ||
        /timeline/i.test(node.className || '')
      ) {
        node.style.display = 'none';
        node.dataset.v298Hidden = 'true';
      }
      node = node.nextElementSibling;
    }

    const tls = Array.from(document.querySelectorAll('#mission .v236-compact-timeline'));
    tls.forEach((tl, idx) => {
      if (idx > 0) {
        tl.style.display = 'none';
        tl.dataset.v298Hidden = 'true';
      }
    });
  }

  function boot(){
    patchNetwork();
    hideNativeSelects();
    Object.keys(defs).forEach(makeDropdown);
    patchValuesForOtherScripts();
    removeDuplicateTimeline();

    document.addEventListener('click', () => {
      document.querySelectorAll('.v298-dd.open').forEach(d => d.classList.remove('open'));
    });

    // roda de novo depois porque o command chat pode ser criado após DOMContentLoaded
    setTimeout(() => {
      hideNativeSelects();
      Object.keys(defs).forEach(makeDropdown);
      removeDuplicateTimeline();
    }, 250);

    console.log('[VISION V2.9.8 FIX2] dropdown custom e timeline única ativos');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
