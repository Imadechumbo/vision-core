
/* VISION CORE V2.3.4 — front ligado ao backend para métricas e agentes */
(function(){
  const API = window.API || window.API_BASE || window.API_BASE_URL || window.__VISION_API__ || window.location.origin;

  const fallbackMetrics = [
    { name:'OpenClaw',     mode:'conversa', width:88, cost:'$0.163', color:'purple' },
    { name:'Hermes RCA',   mode:'conversa', width:72, cost:'$0.815', color:'purple' },
    { name:'Scanner',      mode:'conversa', width:65, cost:'$0.377', color:'green'  },
    { name:'Aegis',        mode:'conversa', width:91, cost:'$0.264', color:'cyan'   },
    { name:'PatchEngine',  mode:'loop',     width:58, cost:'$0.668', color:'orange' },
    { name:'PASS GOLD',    mode:'loop',     width:82, cost:'$0.471', color:'yellow' },
    { name:'Benchmark',    mode:'auto',     width:76, cost:'$1.469', color:'pink'   },
  ];

  const fallbackAgents = [
    { key:'backend', name:'Agente Backend', type:'core', role:'Express, Node.js, rotas, middlewares e erros de servidor.', provides:['routes','api','server'] },
    { key:'database', name:'Agente Database', type:'core', role:'SQL, queries, conexões, migrations e modelos de dados.', provides:['sql','schema','db'] },
    { key:'auth', name:'Agente Auth', type:'core', role:'Autenticação, tokens, sessões, CORS e permissões.', provides:['jwt','cors','401/403'] },
    { key:'upload', name:'Agente Upload/Media', type:'core', role:'Multer, arquivos, mimetypes, storage, imagens e vision upload.', provides:['multer','req.file','media'] },
    { key:'config', name:'Agente Config', type:'core', role:'.env, variáveis, portas, host e configuração de ambiente.', provides:['env','port','config'] },
    { key:'network', name:'Agente Network', type:'core', role:'HTTP, timeouts, DNS, fetch, axios e conexões externas.', provides:['http','timeout','dns'] },
    { key:'locator', name:'Reserve Locator', type:'reserve', role:'Localizar arquivo alvo quando o Scanner falhar.', provides:['extra_scan_hints','target_recommendations'] },
    { key:'security', name:'Reserve Security', type:'reserve', role:'Revisar patches de alto risco e autenticação.', provides:['risk_review','security_notes'] },
    { key:'validator', name:'Reserve Validator', type:'reserve', role:'Sugerir validações adicionais antes do PASS GOLD.', provides:['validation_suggestions'] },
    { key:'architect', name:'Reserve Architect', type:'reserve', role:'Revisar mudanças amplas de arquitetura.', provides:['architecture_review'] },
    { key:'memory', name:'Reserve Memory', type:'reserve', role:'Consultar histórico de incidentes sem aprender fora de GOLD.', provides:['incident_context'] },
  ];

  function moneyToNumber(v){
    if (typeof v === 'number') return v;
    const n = parseFloat(String(v||'').replace(/[^\d.]/g,''));
    return Number.isFinite(n) ? n : 0;
  }

  function renderMetrics(metrics, meta={}){
    const box = document.getElementById('agentMetricsLarge');
    if (!box) return;
    const rows = (metrics && metrics.length ? metrics : fallbackMetrics).map(m => {
      const mode = (m.mode || m.status || 'conversa').toLowerCase();
      const color = m.color || 'purple';
      const width = Math.max(8, Math.min(100, Number(m.width ?? m.score ?? 60)));
      const cost = m.cost || ('$' + moneyToNumber(m.value || 0).toFixed(3));
      const modeClass = mode.includes('auto') ? 'auto' : mode.includes('loop') ? 'loop' : '';
      return `<div class="metric-big-row">
        <div class="metric-agent-name">${m.name}</div>
        <div class="metric-mode ${modeClass}">${mode}</div>
        <div class="metric-track"><div class="metric-fill ${color}" style="width:${width}%"></div></div>
        <div class="metric-cost ${color}">${cost}</div>
      </div>`;
    }).join('');

    const total = (metrics||fallbackMetrics).reduce((acc,m)=>acc+moneyToNumber(m.cost||m.value),0) || 4.227;
    box.innerHTML = rows + `<div class="metrics-total"><span>TOTAL PIPELINE</span><strong>$${total.toFixed(3)}</strong></div>`;

    const badge = document.querySelector('#metricsBoard .live-pill');
    if (badge) badge.textContent = meta.source === 'backend' ? '● BACKEND' : '● UI LOCAL';
  }

  function renderAgents(agents, meta={}){
    const box = document.getElementById('agentsCatalogGrid');
    if (!box) return;
    const list = agents && agents.length ? agents : fallbackAgents;
    box.innerHTML = list.map(a => {
      const type = a.type || a.tier || 'core';
      const icon = type === 'reserve' ? '▣' : '⬡';
      const provides = Array.isArray(a.provides) ? a.provides : [];
      return `<article class="agent-real-card ${type}">
        <div class="agent-actions"><span>⏻</span><span>✎</span><span>▢</span></div>
        <div class="agent-real-top">
          <div class="agent-icon">${icon}</div>
          <span class="agent-status-chip">${a.active === false ? 'RESERVA' : 'ATIVO'}</span>
        </div>
        <div class="agent-title">${a.name}</div>
        <div class="agent-key">${a.key || type}</div>
        <div class="agent-role">${a.focus || a.role || 'Agente técnico do VISION CORE.'}</div>
        <div class="agent-tags">${provides.slice(0,5).map(t=>`<span class="agent-tag">${t}</span>`).join('')}</div>
      </article>`;
    }).join('');
  }

  function paintSmallMetrics(){
    const colors = ['purple','purple','green','cyan','orange','yellow','pink'];
    document.querySelectorAll('#mcMetricsGrid .mc-metric-bar').forEach((el,i)=>{
      el.dataset.color = colors[i] || 'purple';
    });
  }

  async function loadBackendBoards(){
    paintSmallMetrics();
    try {
      const [mr, ar] = await Promise.all([
        fetch(API + '/api/metrics/agents').catch(()=>null),
        fetch(API + '/api/agents/catalog').catch(()=>null)
      ]);

      if (mr && mr.ok) {
        const md = await mr.json();
        renderMetrics(md.metrics || md.agents || [], { source:'backend' });
      } else {
        renderMetrics(fallbackMetrics, { source:'local' });
      }

      if (ar && ar.ok) {
        const ad = await ar.json();
        const agents = [...(ad.core_agents || []), ...(ad.reserve_agents || [])];
        renderAgents(agents, { source:'backend' });
      } else {
        renderAgents(fallbackAgents, { source:'local' });
      }
    } catch(e) {
      renderMetrics(fallbackMetrics, { source:'local' });
      renderAgents(fallbackAgents, { source:'local' });
    }
  }

  document.addEventListener('DOMContentLoaded', loadBackendBoards);
  setTimeout(loadBackendBoards, 350);
})();
