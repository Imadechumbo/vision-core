(function(){
  'use strict';
  const API = (window.VisionCoreRuntime?.api || window.RUNTIME_CONFIG?.API_BASE_URL || window.API_BASE_URL || window.__VISION_API__ || document.querySelector('meta[name="vision-api-base"]')?.content || location.origin).replace(/\/$/, '');
  const missionText = document.getElementById('missionText');
  const executeBtn = document.getElementById('executeBtn');
  const copilotBtn = document.getElementById('v236CopilotBtn');
  const processCopy = document.querySelector('#processScreen .vc-process-copy');
  const processTitle = document.getElementById('processTitle');
  const processMessage = document.getElementById('processMessage');
  const processStage = document.getElementById('processStage');
  const fileInput = document.getElementById('v236FileInput');
  let files = [];
  let streaming = false;
  if(!processCopy || !missionText) return;
  const panel = document.createElement('div');
  panel.className = 'v273-command-panel';
  panel.id = 'v273CommandPanel';
  panel.setAttribute('aria-live','polite');
  processCopy.appendChild(panel);
  const sddf = document.createElement('div');
  sddf.className = 'v273-sddf-bar';
  sddf.innerHTML = '<span data-gate="scope">Escopo</span><span data-gate="deps">Deps</span><span data-gate="schema">Schema</span><span data-gate="run">Execução</span><span data-gate="gold">PASS GOLD</span>';
  processCopy.appendChild(sddf);
  const chips = document.createElement('div');
  chips.className='v273-chip-row';
  chips.innerHTML = ['explicar PASS GOLD','debug CORS','analisar erro 405','preparar PR','rodar SDDF','explicar para leigo'].map(x=>'<button type="button" class="v273-chip">'+x+'</button>').join('');
  processCopy.appendChild(chips);
  function safe(t){ return String(t || '').replace(/[<>]/g, ''); }
  function add(role, text){
    const row = document.createElement('div');
    row.className = 'v273-chat-msg ' + (role || 'assistant');
    row.innerHTML = '<span class="role">'+(role === 'user' ? 'Você' : role === 'system' ? 'SDDF' : 'Vision')+'</span><span class="text">'+safe(text)+'</span>';
    panel.appendChild(row); panel.scrollTop = panel.scrollHeight; return row.querySelector('.text');
  }
  function setHeader(title,msg,stage){ if(processTitle) processTitle.textContent = title; if(processMessage) processMessage.textContent = msg; if(processStage) processStage.textContent = stage; }
  function setGate(gate,state){ const el=sddf.querySelector('[data-gate="'+gate+'"]'); if(!el) return; el.classList.remove('active','pass','gold'); if(state) el.classList.add(state); }
  function resetGates(){ ['scope','deps','schema','run','gold'].forEach(g=>setGate(g,'')); }
  function classify(q){ const t=String(q||'').toLowerCase(); if(/cors|failed to fetch|preflight|origin/.test(t))return'debug-cors'; if(/405|method not allowed|endpoint|rota/.test(t))return'debug-contract'; if(/pr|pull request|github/.test(t))return'pr'; if(/deploy|elastic|beanstalk|cloudflare/.test(t))return'deploy'; if(/corrig|erro|bug|stack|exception|falha/.test(t))return'debug'; if(/pass gold|sddf|harness|gate/.test(t))return'sddf'; return'chat'; }
  function localAnswer(q){ const m={
    'debug-cors':'Diagnóstico provável: CORS/preflight. O SDDF valida Origin, OPTIONS, método, headers permitidos e endpoint real antes de culpar o frontend.',
    'debug-contract':'Diagnóstico provável: contrato front/back. 405 indica rota ou método divergente. Vou checar POST/GET, aliases /api/run-live, /api/enqueue e compatibilidade SSE.',
    'pr':'Fluxo PR: só prepara Pull Request depois de Scanner + Hermes + PatchEngine + Aegis + PASS GOLD. Sem GOLD, PR fica bloqueado.',
    'deploy':'Fluxo deploy: validar health, version, CORS, EB/Cloudflare, runtime e rollback. Promoção só com PASS GOLD.',
    'debug':'Modo debug: OpenClaw classifica, Scanner lê a realidade, Hermes diagnostica RCA, PatchEngine planeja, Aegis bloqueia risco, SDDF decide GOLD.',
    'sddf':'SDDF Harness aplicado: defina escopo, verifique dependências, descubra schema/contrato, execute/depure, valide PASS GOLD.',
    'chat':'Posso explicar em linguagem simples ou transformar sua descrição em missão executável. Cole erro, log, endpoint ou objetivo.'}; return m[classify(q)] || m.chat; }
  async function postJson(path,payload){ const res=await fetch(API+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload||{})}); const text=await res.text(); try{return JSON.parse(text||'{}')}catch{return{ok:false,raw:text,status:res.status}} }
  async function askOnly(){ const q=missionText.value.trim(); if(!q){add('assistant','Descreva o problema no campo cinza. Eu respondo como copiloto ou preparo uma missão SDDF.');return;} add('user',q); resetGates(); setGate('scope','active'); setHeader('Copiloto analisando missão','Interpretando com padrão TechNet AI Command + SDDF Harness.','COPILOT'); try{ const data=await postJson('/api/copilot',{message:q,input:q,files:files,mode:'explain'}); setGate('scope','pass'); setGate('deps','pass'); setGate('schema','pass'); add('assistant',data.answer||localAnswer(q)); }catch(e){ add('assistant',localAnswer(q)); } }
  async function runLive(){ const q=missionText.value.trim(); if(!q){add('assistant','Cole o erro ou descreva a missão antes de executar.');return;} if(streaming)return; streaming=true; add('user',q); resetGates(); setGate('scope','active'); setHeader('VISION executando missão SDDF','Pipeline vivo: OpenClaw → Scanner → Hermes → PatchEngine → Aegis → PASS GOLD.','LIVE'); const botText=add('assistant','Iniciando execução segura...\n'); const project=(document.getElementById('projectSelector')?.value||'technetgame'); const mode=(document.getElementById('runMode')?.value||'dry-run'); const qs=new URLSearchParams({mission:q,input:q,project_id:project,mode:mode,dry_run:String(mode==='dry-run')}); try{ const es=new EventSource(API+'/api/run-live-stream?'+qs.toString()); const close=()=>{try{es.close()}catch{} streaming=false}; const handle=(ev)=>{ let data={}; try{data=JSON.parse(ev.data||'{}')}catch{} const stage=data.step||data.stage||ev.type; const status=data.status||''; const detail=data.detail||data.message||''; if(stage==='PING')return; if(/OpenClaw/i.test(stage))setGate('scope',status==='done'?'pass':'active'); if(/Scanner|Hermes/i.test(stage))setGate('deps',status==='done'?'pass':'active'); if(/PatchEngine|Aegis/i.test(stage))setGate('schema',status==='done'?'pass':'active'); if(/SDDF/i.test(stage))setGate('run',status==='done'?'pass':'active'); if(/PASS GOLD/i.test(stage))setGate('gold',status==='gold'?'gold':'active'); if(window.v236SetPipelineStage)window.v236SetPipelineStage(stage,status==='gold'?'gold':(status==='done'?'done':'running')); botText.textContent+='\n['+stage+'] '+detail; panel.scrollTop=panel.scrollHeight; if(stage==='END'||stage==='FAIL')close(); }; es.onmessage=handle; ['MISSION_CREATED','OpenClaw','Scanner','Hermes','PatchEngine','Aegis','SDDF','PASS GOLD','END','FAIL','PING'].forEach(ev=>es.addEventListener(ev,handle)); es.onerror=()=>{botText.textContent+='\nSSE indisponível. Tentando execução POST...'; close(); fallbackRun(q,botText,project,mode);}; }catch(e){ await fallbackRun(q,botText,project,mode); } }
  async function fallbackRun(q,botText,project,mode){ try{ const data=await postJson('/api/run-live',{input:q,mission:q,project_id:project,mode,dry_run:mode==='dry-run',files}); (data.timeline||data.mission?.steps||[]).forEach(x=>{botText.textContent+='\n['+(x.step||x.stage)+'] '+(x.detail||x.message||'')}); if(data.pass_gold){setGate('gold','gold'); botText.textContent+='\nPASS GOLD consolidado.';} else botText.textContent+='\nExecução finalizada sem PASS GOLD.'; }catch(e){botText.textContent+='\nFalha de conexão: '+e.message;} streaming=false; panel.scrollTop=panel.scrollHeight; }
  copilotBtn&&copilotBtn.addEventListener('click',ev=>{ev.preventDefault(); askOnly();}); executeBtn&&executeBtn.addEventListener('click',ev=>{ev.preventDefault(); ev.stopImmediatePropagation(); runLive();},true);
  missionText.addEventListener('keydown',ev=>{ if(ev.key==='Enter'&&(ev.ctrlKey||ev.metaKey)){ev.preventDefault();runLive();} if(ev.key==='Enter'&&ev.shiftKey){ev.preventDefault();askOnly();} });
  chips.addEventListener('click',ev=>{const b=ev.target.closest('.v273-chip'); if(!b)return; missionText.value=b.textContent.trim(); askOnly();});
  fileInput&&fileInput.addEventListener('change',()=>{files=Array.from(fileInput.files||[]).map(f=>({name:f.name,size:f.size,type:f.type})); if(files.length)add('system',files.length+' arquivo(s) anexados ao contexto: '+files.map(f=>f.name).join(' • '));});
  add('assistant','Pronto. Cole erro, log ou objetivo. Shift+Enter = explicar. Ctrl+Enter = executar pipeline SDDF.');
})();
