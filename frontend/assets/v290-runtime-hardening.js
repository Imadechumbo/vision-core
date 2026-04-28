(function(){
  'use strict';
  const qs=new URLSearchParams(location.search||'');
  const stored=localStorage.getItem('VISION_CORE_API_BASE_URL')||'';
  const lastOk=localStorage.getItem('VISION_CORE_API_BASE_URL_LAST_OK')||'';
  const configured=window.RUNTIME_CONFIG?.API_BASE_URL||window.API_BASE_URL||window.__VISION_API__||document.querySelector('meta[name="vision-api-base"]')?.content||'';
  const explicit=qs.get('api')||stored||configured||lastOk||'';
  const candidates=[explicit,'https://api.technetgame.com.br','https://visionapi.technetgame.com.br',location.origin,'http://localhost:8787','http://127.0.0.1:8787','http://localhost:8080','http://127.0.0.1:8080'].filter(Boolean).map(x=>String(x).replace(/\/$/,'')).filter((v,i,a)=>a.indexOf(v)===i);
  let active=candidates[0]||location.origin;
  window.__VISION_API_CANDIDATES__=candidates;
  window.__nativeFetch=window.__nativeFetch||window.fetch.bind(window);
  function paint(cls,text){let el=document.getElementById('v28ApiStatus')||document.getElementById('v29ApiStatus'); if(!el){el=document.createElement('div');el.id='v29ApiStatus';el.className='v28-api-status'; const attach=()=>document.body&&document.body.appendChild(el); if(document.body)attach(); else document.addEventListener('DOMContentLoaded',attach,{once:true});} el.className='v28-api-status '+(cls||''); el.textContent=text||'API AUTO'; el.title='VISION CORE API: '+(window.__VISION_API__||active||'auto');}
  function normalizeBase(base){return String(base||'').replace(/\/$/,'')||location.origin;}
  function setActive(base){active=normalizeBase(base); window.RUNTIME_CONFIG=window.RUNTIME_CONFIG||{}; window.RUNTIME_CONFIG.API_BASE_URL=active; window.API_BASE_URL=active; window.__VISION_API__=active; window.API=active; localStorage.setItem('VISION_CORE_API_BASE_URL_LAST_OK',active); paint('ok','API OK');}
  function withBase(url,base){const path=String(url||''); if(/^https?:\/\//i.test(path))return path; return normalizeBase(base||active)+(path.startsWith('/')?path:'/'+path);}
  function isKnownVisionApi(url){const s=String(url||''); return /^https:\/\/(api|visionapi)\.technetgame\.com\.br\/api\//i.test(s)||s.includes('visionapi.technetgame.com.ime');}
  function rewriteKnownApi(url){let s=String(url||''); if(s.includes('visionapi.technetgame.com.ime'))s=s.replace('visionapi.technetgame.com.ime','visionapi.technetgame.com.br'); if(isKnownVisionApi(s)&&active&&!s.startsWith(active)){const u=new URL(s); return withBase(u.pathname+u.search+u.hash,active);} return s;}
  async function probe(){paint('','API AUTO'); for(const base of candidates){try{const r=await window.__nativeFetch(withBase('/api/health',base),{method:'GET',cache:'no-store',mode:'cors'}); const cors=r.headers.get('access-control-allow-origin')||r.headers.get('x-cors-status')||''; if(r.ok){setActive(base); console.info('[VISION V2.9.2] API resolved:',base,cors); return base;}}catch(e){}} paint('fail','API OFF'); console.warn('[VISION V2.9.2] No backend resolved. Configure ?api=https://SEU_BACKEND or localStorage.VISION_CORE_API_BASE_URL.',candidates); return '';}
  window.VisionCoreRuntime={candidates,get api(){return active},setActive,probe,withBase};
  window.fetch=function(url,opts){let s=rewriteKnownApi(url); if(s.startsWith('/api/')||s.startsWith('api/'))s=withBase(s,active); return window.__nativeFetch(s,opts);};
  const NativeEventSource=window.EventSource; window.EventSource=function(url,cfg){let s=rewriteKnownApi(url); if(s.startsWith('/api/')||s.startsWith('api/'))s=withBase(s,active); return new NativeEventSource(s,cfg);}; window.EventSource.prototype=NativeEventSource.prototype;
  probe();
})();
