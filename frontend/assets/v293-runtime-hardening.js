(function(){
  'use strict';
  const VERSION='2.9.3';
  const qs=new URLSearchParams(location.search||'');
  const stored=localStorage.getItem('VISION_CORE_API_BASE_URL')||'';
  const lastOk=localStorage.getItem('VISION_CORE_API_BASE_URL_LAST_OK')||'';
  const configured=window.RUNTIME_CONFIG?.API_BASE_URL||window.API_BASE_URL||window.__VISION_API__||document.querySelector('meta[name="vision-api-base"]')?.content||'';
  const raw=[qs.get('api'),stored,configured,lastOk,'https://api.technetgame.com.br','https://visionapi.technetgame.com.br','http://localhost:8787','http://127.0.0.1:8787','http://localhost:8080','http://127.0.0.1:8080'];
  const candidates=raw.filter(Boolean).map(x=>String(x).replace(/\/$/,'')).filter((v,i,a)=>a.indexOf(v)===i);
  let active=candidates[0]||'https://api.technetgame.com.br';
  window.__VISION_API_CANDIDATES__=candidates;
  window.__nativeFetch=window.__nativeFetch||window.fetch.bind(window);
  function normalizeBase(base){return String(base||'').replace(/\/$/,'')||active;}
  function paint(cls,text){let el=document.getElementById('v29ApiStatus')||document.getElementById('v28ApiStatus'); if(!el){el=document.createElement('div');el.id='v29ApiStatus';el.className='v28-api-status'; const attach=()=>document.body&&document.body.appendChild(el); if(document.body)attach(); else document.addEventListener('DOMContentLoaded',attach,{once:true});} el.className='v28-api-status '+(cls||''); el.textContent=text||'API AUTO'; el.title='VISION CORE API: '+(window.__VISION_API__||active||'auto');}
  function setActive(base){active=normalizeBase(base); window.RUNTIME_CONFIG=window.RUNTIME_CONFIG||{}; window.RUNTIME_CONFIG.API_BASE_URL=active; window.API_BASE_URL=active; window.__VISION_API__=active; window.API=active; localStorage.setItem('VISION_CORE_API_BASE_URL_LAST_OK',active); paint('ok','API OK');}
  function withBase(url,base){const path=String(url||''); if(/^https?:\/\//i.test(path))return path; return normalizeBase(base||active)+(path.startsWith('/')?path:'/'+path);}
  function isKnownVisionApi(url){const s=String(url||''); return /^https:\/\/(api|visionapi)\.technetgame\.com\.br\/api\//i.test(s)||s.includes('visionapi.technetgame.com.ime');}
  function rewriteKnownApi(url){let s=String(url||''); if(s.includes('visionapi.technetgame.com.ime'))s=s.replace('visionapi.technetgame.com.ime','visionapi.technetgame.com.br'); if(isKnownVisionApi(s)&&active&&!s.startsWith(active)){const u=new URL(s); return withBase(u.pathname+u.search+u.hash,active);} return s;}
  async function validHealth(base){const r=await window.__nativeFetch(withBase('/api/health',base),{method:'GET',cache:'no-store',mode:'cors'}); if(!r.ok) return false; const ct=(r.headers.get('content-type')||'').toLowerCase(); if(!ct.includes('application/json')) return false; const j=await r.clone().json().catch(()=>null); return !!(j && j.ok && /vision-core-server/i.test(String(j.service||'')));}
  async function probe(){paint('','API AUTO'); for(const base of candidates){try{if(await validHealth(base)){setActive(base); console.info('[VISION V2.9.3] API resolved:',base); return base;}}catch(e){console.warn('[VISION V2.9.3] probe failed:',base,e.message);}} paint('fail','API OFF'); console.warn('[VISION V2.9.3] No backend resolved. Configure ?api=https://api.technetgame.com.br or localStorage.VISION_CORE_API_BASE_URL.',candidates); return '';}
  window.VisionCoreRuntime={version:VERSION,candidates,get api(){return active},setActive,probe,withBase};
  window.fetch=function(url,opts){let s=rewriteKnownApi(url); if(s.startsWith('/api/')||s.startsWith('api/'))s=withBase(s,active); return window.__nativeFetch(s,opts);};
  if(window.EventSource){const NativeEventSource=window.EventSource; window.EventSource=function(url,cfg){let s=rewriteKnownApi(url); if(s.startsWith('/api/')||s.startsWith('api/'))s=withBase(s,active); return new NativeEventSource(s,cfg);}; window.EventSource.prototype=NativeEventSource.prototype;}
  probe();
})();
