(function(){
  'use strict';
  const VERSION='2.9.4-ultra';
  const qs=new URLSearchParams(location.search);
  const nativeFetch=window.__nativeFetch||window.fetch.bind(window);
  window.__nativeFetch=nativeFetch;
  const nativeEventSource=window.__nativeEventSource||window.EventSource;
  window.__nativeEventSource=nativeEventSource;

  function clean(v){return String(v||'').trim().replace(/\/$/,'');}
  function uniq(a){return Array.from(new Set(a.filter(Boolean).map(clean)));}
  function configured(){return clean(qs.get('api')||localStorage.getItem('VISION_CORE_API_BASE_URL')||window.RUNTIME_CONFIG?.API_BASE_URL||window.API_BASE_URL||window.__VISION_API__||document.querySelector('meta[name="vision-api-base"]')?.content||'');}
  const candidates=uniq([
    configured(),
    localStorage.getItem('VISION_CORE_API_BASE_URL_LAST_OK'),
    'https://api.technetgame.com.br',
    'https://visionapi.technetgame.com.br',
    'http://localhost:8787',
    'http://127.0.0.1:8787',
    'http://localhost:8080',
    'http://127.0.0.1:8080'
  ]);
  let active=candidates[0]||'https://api.technetgame.com.br';

  function setActive(base){
    active=clean(base)||active;
    window.RUNTIME_CONFIG=window.RUNTIME_CONFIG||{};
    window.RUNTIME_CONFIG.API_BASE_URL=active;
    window.API_BASE_URL=active;
    window.__VISION_API__=active;
    window.API=active;
    window.VisionCoreRuntime={version:VERSION,api:active,ready:true};
    localStorage.setItem('VISION_CORE_API_BASE_URL_LAST_OK',active);
    const badge=document.getElementById('apiStatusBadge')||document.querySelector('[data-api-status]');
    if(badge){badge.textContent='● API OK';badge.classList.add('ok')}
  }
  setActive(active);

  function isApiPath(s){return /^\/api\//.test(s)||/\/(api)\//.test(s);}
  function isKnownBadBase(s){return /^https:\/\/(api|visionapi)\.technetgame\.com\.br\/api\//i.test(s)||s.includes('visionapi.technetgame.com.ime')||s.includes('api.technetgame.com.br/api/');}
  function withBase(path,base=active){return clean(base)+(String(path).startsWith('/')?'':'/')+String(path);}
  function rewriteUrl(input){
    let s=String(input instanceof Request?input.url:input||'');
    if(!s) return input;
    if(s.includes('visionapi.technetgame.com.ime')) s=s.replace('visionapi.technetgame.com.ime','visionapi.technetgame.com.br');
    try{
      const u=new URL(s, location.origin);
      if(u.origin===location.origin && u.pathname.startsWith('/api/')) return withBase(u.pathname+u.search+u.hash);
      if(isKnownBadBase(u.href) && active){ return withBase(u.pathname+u.search+u.hash); }
      return u.href;
    }catch{return s;}
  }
  async function validHealth(base){
    const r=await nativeFetch(withBase('/api/health',base),{method:'GET',cache:'no-store',mode:'cors',credentials:'omit',headers:{'X-Vision-Request':'probe-'+VERSION}});
    if(!r.ok) return false;
    const ct=(r.headers.get('content-type')||'').toLowerCase();
    if(!ct.includes('json')) return false;
    const j=await r.clone().json().catch(()=>null);
    const txt=JSON.stringify(j||{}).toLowerCase();
    return !!(j&&j.ok) && (txt.includes('vision')||txt.includes('2.9')||txt.includes('health'));
  }
  async function probe(){
    for(const base of candidates){
      try{ if(await validHealth(base)){ setActive(base); console.info('[VISION V2.9.4] API resolved:',base); window.dispatchEvent(new CustomEvent('vision-api-ready',{detail:{api:base,version:VERSION}})); return base; } }
      catch(e){ console.warn('[VISION V2.9.4] probe failed:',base,e.message); }
    }
    console.warn('[VISION V2.9.4] no verified backend; using configured fallback:',active);
    return active;
  }
  window.VisionCoreRuntimeProbe=probe;
  probe();

  window.fetch=function(input,opts={}){
    const url=rewriteUrl(input);
    const o=Object.assign({},opts);
    o.mode=o.mode||'cors';
    o.cache=o.cache||'no-store';
    if(!('credentials' in o)) o.credentials='omit';
    o.headers=Object.assign({'X-Vision-Request':'browser-'+VERSION}, o.headers||{});
    if(input instanceof Request){ return nativeFetch(new Request(url,input),o); }
    return nativeFetch(url,o);
  };

  if(nativeEventSource){
    window.EventSource=function(url,config){
      const rewritten=rewriteUrl(url);
      console.info('[VISION V2.9.4] SSE:',rewritten);
      return new nativeEventSource(rewritten,config);
    };
    window.EventSource.prototype=nativeEventSource.prototype;
  }
})();
