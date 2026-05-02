/* ================================================================
   VISION CORE V2.9.9 — Fullstack Runtime Increment
   Adiciona ao Command Chat existente (v298):
   - seletor de providers reais
   - botão Configurar IA
   - botão Conectar Obsidian
   - status de plano/quota
   - modos de análise expandidos
   - integração com novos endpoints backend
   NÃO redesenha nada. Apenas estende.
   ================================================================ */
(function () {
  'use strict';

  /* ── Guard global ─────────────────────────────────────────────── */
  if (window.__VISION_V299_RUNTIME__) return;
  window.__VISION_V299_RUNTIME__ = true;

  function $(id) { return document.getElementById(id); }

  /* ── apiUrl guard (redundante mas seguro) ──────────────────────── */
  function safeUrl(path) {
    path = String(path || '').replace(/\/api\/api\//g, '/api/');
    path = path.replace(/^https?:\/\/[^/]*\/api\//i, '/api/');
    if (path.startsWith('/api/')) return path;
    if (!path.startsWith('/')) path = '/' + path;
    return '/api' + path;
  }

  function workerUrl(path) {
    const base = window.__VISION_API__ || window.API_BASE_URL || window.API || '';
    const p = safeUrl(path);
    if (base && !p.startsWith('http')) return base.replace(/\/$/, '') + p;
    return p;
  }

  async function get(path) {
    try {
      const r = await fetch(workerUrl(path));
      if (!r.ok) return null;
      return await r.json();
    } catch { return null; }
  }

  async function post(path, body) {
    try {
      const r = await fetch(workerUrl(path), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {})
      });
      const t = await r.text();
      try { return JSON.parse(t); } catch { return { ok: false, raw: t }; }
    } catch (e) { return { ok: false, error: e.message }; }
  }

  /* ── State ────────────────────────────────────────────────────── */
  const state = {
    plan: 'free',
    quota: { used: 0, limit: 5, reset_at: null },
    providers: [],
    obsidianConnected: false,
    agentLocal: false
  };

  /* ── Load quota & plan ─────────────────────────────────────────── */
  async function loadQuota() {
    const d = await get('/api/usage/quota');
    if (!d) return;
    state.plan = d.plan || 'free';
    state.quota = d.quota || state.quota;
    renderQuotaBadge();
  }

  function renderQuotaBadge() {
    const badge = $('v299QuotaBadge');
    if (!badge) return;
    const q = state.quota;
    const pct = q.limit > 0 ? Math.round((q.used / q.limit) * 100) : 0;
    const warn = pct >= 80;
    const full = q.limit > 0 && q.used >= q.limit;
    badge.innerHTML = `
      <span class="v299-plan-tag ${state.plan}">${state.plan.toUpperCase()}</span>
      ${q.limit > 0
        ? `<span class="${full ? 'v299-quota-full' : warn ? 'v299-quota-warn' : 'v299-quota-ok'}">
            ${q.used}/${q.limit} missões
           </span>`
        : '<span class="v299-quota-ok">Ilimitado</span>'}`;

    // Warn in chat when quota full
    if (full) {
      const stream = $('v298ChatStream');
      if (stream && !stream.dataset.quotaWarn) {
        stream.dataset.quotaWarn = '1';
        const msg = document.createElement('div');
        msg.className = 'v298-message error';
        msg.textContent = '⚠️ Quota FREE esgotada (5 missões/mês). Faça upgrade para PRO (R$9,99/mês) para continuar.';
        stream.appendChild(msg);
      }
    }
  }

  /* ── Load providers ────────────────────────────────────────────── */
  async function loadProviders() {
    const d = await get('/api/ai/providers');
    if (!d || !d.providers) return;
    state.providers = d.providers;
    patchModelSelector();
  }

  function patchModelSelector() {
    const sel = $('v298Model');
    if (!sel || !state.providers.length) return;
    // Keep existing options, add configured providers at top
    const configured = state.providers.filter(p => p.configured);
    if (!configured.length) return;

    // Remove old "auto" placeholder and rebuild
    const existing = Array.from(sel.options).map(o => o.value);
    configured.forEach(p => {
      if (!existing.includes(p.id)) {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.label + ' ✓';
        sel.insertBefore(opt, sel.firstChild);
      }
    });
  }

  /* ── Extend tool row ───────────────────────────────────────────── */
  function extendToolRow() {
    const toolRow = document.querySelector('.v298-tool-row');
    if (!toolRow || toolRow.dataset.v299Extended) return;
    toolRow.dataset.v299Extended = '1';

    // Quota badge
    const quotaDiv = document.createElement('div');
    quotaDiv.id = 'v299QuotaBadge';
    quotaDiv.className = 'v299-quota-badge';
    quotaDiv.innerHTML = '<span class="v299-plan-tag free">FREE</span><span class="v299-quota-ok">...</span>';
    toolRow.prepend(quotaDiv);

    // Config buttons
    const configBtn = document.createElement('button');
    configBtn.className = 'v298-tool-btn v299-config-btn';
    configBtn.textContent = '⚙ Configurar IA';
    configBtn.onclick = openConfigModal;
    toolRow.appendChild(configBtn);

    const obsidianBtn = document.createElement('button');
    obsidianBtn.className = 'v298-tool-btn v299-obsidian-btn';
    obsidianBtn.id = 'v299ObsidianBtn';
    obsidianBtn.textContent = '📓 Obsidian';
    obsidianBtn.onclick = toggleObsidian;
    toolRow.appendChild(obsidianBtn);

    const agentBtn = document.createElement('button');
    agentBtn.className = 'v298-tool-btn v299-agent-btn';
    agentBtn.textContent = '⬇ Baixar Agent';
    agentBtn.onclick = () => { window.location.href = '#agentDownload'; };
    toolRow.appendChild(agentBtn);

    // Extend mode selector with new modes
    const modeSelect = $('v298Mode');
    if (modeSelect) {
      const newModes = [
        ['analisar-imagem', 'Analisar print/imagem'],
        ['analisar-projeto', 'Analisar projeto ZIP'],
        ['hermes-rca', 'Hermes RCA profundo'],
        ['exportar-logs', 'Exportar logs'],
        ['replay-missao', 'Replay missão'],
      ];
      newModes.forEach(([val, label]) => {
        if (!Array.from(modeSelect.options).find(o => o.value === val)) {
          const opt = document.createElement('option');
          opt.value = val;
          opt.textContent = label;
          modeSelect.appendChild(opt);
        }
      });
    }
  }

  /* ── Config Modal ──────────────────────────────────────────────── */
  function openConfigModal() {
    if ($('v299ConfigModal')) { $('v299ConfigModal').style.display = 'flex'; return; }

    const modal = document.createElement('div');
    modal.id = 'v299ConfigModal';
    modal.className = 'v299-modal-overlay';
    modal.innerHTML = `
      <div class="v299-modal">
        <div class="v299-modal-header">
          <span>⚙ Configurar Providers de IA</span>
          <button class="v299-modal-close" onclick="document.getElementById('v299ConfigModal').style.display='none'">✕</button>
        </div>
        <div class="v299-modal-body">
          <p class="v299-modal-note">As chaves ficam no servidor. Nunca são expostas no JS público.</p>

          <div class="v299-field-group">
            <label>Provider</label>
            <select id="v299ProviderSelect" class="v298-select">
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="google">Google (Gemini)</option>
              <option value="groq">Groq (Llama)</option>
              <option value="openrouter">OpenRouter</option>
              <option value="deepseek">DeepSeek</option>
              <option value="ollama">Ollama (local)</option>
            </select>
          </div>
          <div class="v299-field-group">
            <label>API Key</label>
            <input type="password" id="v299ApiKey" class="v299-input" placeholder="sk-... ou AIza...">
          </div>
          <div class="v299-field-group">
            <label>Modelo padrão</label>
            <input type="text" id="v299ModelDefault" class="v299-input" placeholder="ex: claude-haiku-4-5-20251001">
          </div>
          <button class="v299-modal-save" id="v299SaveProvider">Salvar provider</button>
          <div id="v299ProviderMsg" class="v299-modal-msg"></div>

          <hr class="v299-divider">

          <div class="v299-field-group">
            <label>Plano atual</label>
            <div id="v299PlanInfo" class="v299-plan-info">Carregando...</div>
          </div>
          <div class="v299-upgrade-row">
            <button class="v299-upgrade-btn pro" onclick="window.v299Upgrade('pro')">Upgrade PRO — R$9,99/mês</button>
            <button class="v299-upgrade-btn ent" onclick="window.v299Upgrade('enterprise')">Enterprise — R$29,99/mês</button>
          </div>
        </div>
      </div>`;

    document.body.appendChild(modal);

    $('v299SaveProvider').onclick = async () => {
      const provider = $('v299ProviderSelect').value;
      const api_key = $('v299ApiKey').value.trim();
      const model = $('v299ModelDefault').value.trim();
      if (!api_key) { $('v299ProviderMsg').textContent = 'Cole a API key.'; return; }
      $('v299ProviderMsg').textContent = 'Salvando...';
      const d = await post('/api/ai/providers/save', { provider, api_key, model });
      $('v299ProviderMsg').textContent = d.ok ? '✅ Provider salvo!' : '❌ Erro: ' + (d.error || 'falhou');
      if (d.ok) { await loadProviders(); }
    };

    // Load plan info
    get('/api/billing/plans').then(d => {
      const planEl = $('v299PlanInfo');
      if (!planEl || !d) return;
      const current = (d.plans || []).find(p => p.id === state.plan);
      planEl.innerHTML = current
        ? `<strong>${current.name}</strong> — R$${current.price}/mês`
        : `Plano: ${state.plan}`;
    });
  }

  window.v299Upgrade = async (planId) => {
    const d = await post('/api/billing/checkout', { plan_id: planId });
    if (d.checkout_url) window.open(d.checkout_url, '_blank');
    else alert(d.message || 'Checkout em implementação. Plano: ' + planId);
  };

  /* ── Obsidian toggle ───────────────────────────────────────────── */
  async function toggleObsidian() {
    const d = await get('/api/memory/obsidian/status');
    const btn = $('v299ObsidianBtn');
    if (d && d.connected) {
      state.obsidianConnected = true;
      if (btn) { btn.textContent = '📓 Obsidian ✓'; btn.classList.add('active'); }
    } else {
      alert('Obsidian não conectado. Configure o vault em /api/obsidian/write via plugin ou CLI local.');
    }
  }

  /* ── Intercept mode changes for new modes ──────────────────────── */
  function interceptModeChange() {
    const modeSelect = $('v298Mode');
    const sendBtn = $('v298SendBtn');
    if (!modeSelect || !sendBtn) return;

    modeSelect.addEventListener('change', () => {
      const mode = modeSelect.value;
      const placeholder = {
        'analisar-imagem': 'Anexe um print e descreva o que quer analisar...',
        'analisar-projeto': 'Anexe o ZIP do projeto e descreva o problema...',
        'hermes-rca': 'Cole o erro completo com stack trace para diagnóstico profundo...',
        'exportar-logs': 'Clique em Enviar para exportar os logs da sessão atual.',
        'replay-missao': 'Cole o mission_id para replay, ou deixe em branco para a última.',
      };
      const prompt = $('v298Prompt');
      if (prompt && placeholder[mode]) prompt.placeholder = placeholder[mode];
    });
  }

  /* ── CSS injected ──────────────────────────────────────────────── */
  function injectStyles() {
    if ($('v299Styles')) return;
    const style = document.createElement('style');
    style.id = 'v299Styles';
    style.textContent = `
      .v299-quota-badge {
        display: flex; align-items: center; gap: 6px;
        padding: 4px 10px; background: #0d0d0d;
        border: 1px solid #2a2a2a; border-radius: 6px;
        font-size: 11px; flex-shrink: 0;
      }
      .v299-plan-tag { font-weight: 700; letter-spacing: .06em; border-radius: 4px; padding: 1px 6px; }
      .v299-plan-tag.free { color: #888; background: #1a1a1a; }
      .v299-plan-tag.pro  { color: #7c3aed; background: #1e0a3c; }
      .v299-plan-tag.enterprise { color: #f59e0b; background: #1a1200; }
      .v299-quota-ok   { color: #22c55e; }
      .v299-quota-warn { color: #f59e0b; }
      .v299-quota-full { color: #ef4444; font-weight: 700; }

      .v299-config-btn  { color: #9ca3af !important; }
      .v299-obsidian-btn { color: #a78bfa !important; }
      .v299-obsidian-btn.active { color: #22c55e !important; border-color: #22c55e !important; }
      .v299-agent-btn   { color: #6ee7b7 !important; }

      .v299-modal-overlay {
        position: fixed; inset: 0; background: rgba(0,0,0,.85);
        display: flex; align-items: center; justify-content: center;
        z-index: 9999; backdrop-filter: blur(4px);
      }
      .v299-modal {
        background: #111; border: 1px solid #2a2a2a; border-radius: 14px;
        width: min(480px, 95vw); max-height: 90vh; overflow-y: auto;
        box-shadow: 0 0 60px #7c3aed22;
      }
      .v299-modal-header {
        display: flex; justify-content: space-between; align-items: center;
        padding: 16px 20px; border-bottom: 1px solid #1e1e1e;
        font-weight: 700; font-size: 14px; color: #e5e7eb;
      }
      .v299-modal-close {
        background: none; border: none; color: #666; cursor: pointer;
        font-size: 18px; padding: 0 4px; line-height: 1;
      }
      .v299-modal-close:hover { color: #ef4444; }
      .v299-modal-body { padding: 20px; display: flex; flex-direction: column; gap: 14px; }
      .v299-modal-note { font-size: 11px; color: #555; background: #0d0d0d; padding: 8px 12px; border-radius: 6px; border-left: 2px solid #7c3aed; }
      .v299-field-group { display: flex; flex-direction: column; gap: 6px; }
      .v299-field-group label { font-size: 11px; color: #888; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; }
      .v299-input {
        background: #0a0a0a; border: 1px solid #2a2a2a; border-radius: 8px;
        color: #e5e7eb; font-size: 13px; padding: 8px 12px;
        width: 100%; box-sizing: border-box;
      }
      .v299-input:focus { outline: none; border-color: #7c3aed44; }
      .v299-modal-save {
        background: #7c3aed; border: none; border-radius: 8px;
        color: #fff; font-size: 13px; font-weight: 700;
        padding: 10px; cursor: pointer; transition: background .2s;
      }
      .v299-modal-save:hover { background: #6d28d9; }
      .v299-modal-msg { font-size: 12px; color: #888; min-height: 16px; }
      .v299-divider { border: none; border-top: 1px solid #1e1e1e; }
      .v299-plan-info { font-size: 13px; color: #e5e7eb; }
      .v299-upgrade-row { display: flex; gap: 10px; flex-wrap: wrap; }
      .v299-upgrade-btn {
        flex: 1; padding: 10px; border: none; border-radius: 8px;
        font-size: 12px; font-weight: 700; cursor: pointer; transition: opacity .2s;
      }
      .v299-upgrade-btn:hover { opacity: .85; }
      .v299-upgrade-btn.pro  { background: #1e0a3c; color: #bf86ff; border: 1px solid #7c3aed; }
      .v299-upgrade-btn.ent  { background: #1a1200; color: #f59e0b; border: 1px solid #f59e0b; }
    `;
    document.head.appendChild(style);
  }

  /* ── Init after DOM ready ──────────────────────────────────────── */
  function init() {
    injectStyles();

    // Wait for v298 Command Chat to build first
    let attempts = 0;
    const waitForChat = setInterval(() => {
      attempts++;
      if ($('v298CommandChat') || attempts > 30) {
        clearInterval(waitForChat);
        extendToolRow();
        interceptModeChange();
        loadQuota();
        loadProviders();
      }
    }, 200);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
