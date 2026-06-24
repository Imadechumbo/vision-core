/* VISION CORE V5.8.2 — SF Modules 02-09 (B5)
   Injeta painel de módulos ScaleForce e conecta botões GERAR
   aos endpoints reais do backend. */
(function () {
  'use strict';
  if (window.__VISION_SF_MODULES__) return;
  window.__VISION_SF_MODULES__ = true;

  // Herda gateway do runtime principal
  function workerUrl(path) {
    const base = window.__VISION_API__ || window.API || window.API_BASE_URL || 'https://visioncore-api-gateway.weiganlight.workers.dev';
    return base.replace(/\/$/, '') + path;
  }

  async function postSF(endpoint, payload) {
    const r = await fetch(workerUrl(endpoint), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {})
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }

  // ── Funções geradoras ────────────────────────────────────────

  async function generateMissionComposerPrompt(ctx) {
    return postSF('/api/sf/mission-composer', { context: ctx, version: '5.8.2' });
  }

  async function generateWorkerHandoffPackage(ctx) {
    return postSF('/api/sf/worker-handoff', { context: ctx });
  }

  async function generateContextSnapshot(ctx) {
    return postSF('/api/sf/context-snapshot', { context: ctx });
  }

  async function generatePatchValidatorReport(ctx) {
    return postSF('/api/sf/patch-validator', { context: ctx });
  }

  async function generateRiskAssessment(ctx) {
    return postSF('/api/sf/risk-assessor', { context: ctx });
  }

  async function generateRollbackPlan(ctx) {
    return postSF('/api/sf/rollback-planner', { context: ctx });
  }

  async function generateGoldGateChecklist(ctx) {
    return postSF('/api/sf/gold-gate', { context: ctx });
  }

  async function generateDeployBlueprint(ctx) {
    return postSF('/api/sf/deploy-blueprint', { context: ctx });
  }

  // Expõe globalmente para debug/console
  Object.assign(window, {
    generateMissionComposerPrompt,
    generateWorkerHandoffPackage,
    generateContextSnapshot,
    generatePatchValidatorReport,
    generateRiskAssessment,
    generateRollbackPlan,
    generateGoldGateChecklist,
    generateDeployBlueprint
  });

  // ── Definição dos módulos ────────────────────────────────────

  const SF_MODULES = [
    { id: 'SF02', label: 'Mission Composer',  desc: 'Gera prompt estruturado de missão para o pipeline SDDF.',  fn: generateMissionComposerPrompt },
    { id: 'SF03', label: 'Worker Handoff',    desc: 'Empacota contexto e artefatos para handoff entre workers.',  fn: generateWorkerHandoffPackage },
    { id: 'SF04', label: 'Context Snapshot',  desc: 'Snapshot do contexto atual para replay e auditoria.',        fn: generateContextSnapshot },
    { id: 'SF05', label: 'Patch Validator',   desc: 'Relatório de validação do patch antes do PASS GOLD.',        fn: generatePatchValidatorReport },
    { id: 'SF06', label: 'Risk Assessor',     desc: 'Avalia riscos do deploy e classifica por severidade.',       fn: generateRiskAssessment },
    { id: 'SF07', label: 'Rollback Planner',  desc: 'Plano de rollback automatizado com checkpoints.',            fn: generateRollbackPlan },
    { id: 'SF08', label: 'Gold Gate Checker', desc: 'Checklist de gates SDDF obrigatórios para PASS GOLD.',      fn: generateGoldGateChecklist },
    { id: 'SF09', label: 'Deploy Blueprint',  desc: 'Blueprint de deploy com sequência de steps validados.',      fn: generateDeployBlueprint },
  ];

  // ── Render do painel ─────────────────────────────────────────

  function renderSFPanel() {
    // Injeta após o painel #score se existir, senão no fim do main
    const anchor = document.getElementById('score') || document.querySelector('main') || document.body;

    const section = document.createElement('section');
    section.className = 'panel';
    section.id = 'sf-modules-panel';
    section.innerHTML = `
      <div class="section-headline">
        <div>
          <p class="eyebrow" translate="no">SCALEFORCE MODULES • SF 02–09</p>
          <h2>MÓDULOS SF</h2>
          <p>Geradores de artefatos SDDF. Cada módulo chama o backend real e exibe o resultado no log.</p>
        </div>
      </div>
      <div class="sf-modules-grid" id="sfModulesGrid" translate="no"></div>
      <div class="sf-output-box" id="sfOutputBox" style="display:none;margin-top:1rem;padding:1rem;background:var(--panel-bg,#111);border:1px solid var(--border,#333);border-radius:8px;font-family:monospace;font-size:0.82rem;white-space:pre-wrap;max-height:320px;overflow-y:auto;"></div>
    `;

    anchor.parentNode.insertBefore(section, anchor.nextSibling);

    const grid = document.getElementById('sfModulesGrid');
    const output = document.getElementById('sfOutputBox');

    SF_MODULES.forEach(mod => {
      const card = document.createElement('div');
      card.className = 'sf-module-card';
      card.setAttribute('translate', 'no');
      card.innerHTML = `
        <div class="sf-mod-id">${mod.id}</div>
        <div class="sf-mod-label">${mod.label}</div>
        <div class="sf-mod-desc">${mod.desc}</div>
        <button class="btn mini sf-generate-btn" data-sf-id="${mod.id}" type="button">GERAR</button>
        <div class="sf-mod-status" id="sfStatus_${mod.id}"></div>
      `;
      grid.appendChild(card);
    });

    // ── Handler data-sf-generate ──────────────────────────────
    grid.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-sf-id]');
      if (!btn || !btn.classList.contains('sf-generate-btn')) return;

      const sfId = btn.dataset.sfId;
      const mod = SF_MODULES.find(m => m.id === sfId);
      if (!mod) return;

      const statusEl = document.getElementById('sfStatus_' + sfId);
      const ctx = { project: window.__VISION_PROJECT__ || 'visioncore', timestamp: new Date().toISOString(), module: sfId };

      btn.disabled = true;
      btn.textContent = '...';
      if (statusEl) statusEl.innerHTML = '<span style="color:var(--cyan,#0ff)">gerando...</span>';
      if (window.showLog) window.showLog(sfId, 'gerando ' + mod.label + '...', 'cyan');

      try {
        const data = await mod.fn(ctx);
        const result = data.result || data.output || data.content || data.prompt || JSON.stringify(data, null, 2);

        if (statusEl) statusEl.innerHTML = '<span style="color:var(--green,#0f0)">✓ gerado</span>';
        if (window.showLog) window.showLog(sfId, mod.label + ' gerado com sucesso', 'green');

        output.style.display = 'block';
        output.textContent = `=== ${sfId} — ${mod.label} ===\n\n${result}\n\n[${new Date().toLocaleTimeString()}]`;
        output.scrollTop = 0;
      } catch (err) {
        if (statusEl) statusEl.innerHTML = '<span style="color:var(--red,#f44)">✗ erro</span>';
        if (window.showLog) window.showLog(sfId, 'erro: ' + err.message, 'red');
        output.style.display = 'block';
        output.textContent = `=== ${sfId} ERROR ===\n${err.message}`;
      } finally {
        btn.disabled = false;
        btn.textContent = 'GERAR';
      }
    });
  }

  // ── CSS inline mínimo ────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    .sf-modules-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }
    .sf-module-card {
      background: var(--card-bg, #0d0d0d);
      border: 1px solid var(--border, #2a2a2a);
      border-radius: 8px;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .sf-mod-id {
      font-size: 0.7rem;
      color: var(--cyan, #00e5ff);
      font-weight: 700;
      letter-spacing: 0.1em;
    }
    .sf-mod-label {
      font-weight: 700;
      font-size: 0.9rem;
      color: var(--text, #eee);
    }
    .sf-mod-desc {
      font-size: 0.78rem;
      color: var(--muted, #888);
      flex: 1;
    }
    .sf-generate-btn { margin-top: 0.5rem; align-self: flex-start; }
    .sf-mod-status { font-size: 0.72rem; min-height: 1.2em; }
  `;
  document.head.appendChild(style);

  // ── B6: override testAiProviderBtn para rich status display ──
  function attachProviderTestHandler() {
    const btn      = document.getElementById('testAiProviderBtn');
    const sel      = document.getElementById('aiProviderSelect');
    const keyInp   = document.getElementById('aiApiKey');
    const statusEl = document.getElementById('aiProviderStatus');
    if (!btn) return;

    // Remove handlers existentes via clone
    const fresh = btn.cloneNode(true);
    btn.parentNode.replaceChild(fresh, btn);

    fresh.addEventListener('click', async () => {
      const p   = sel ? sel.value : 'openai';
      const key = keyInp ? keyInp.value.trim() : '';
      fresh.disabled = true;
      fresh.textContent = '...';
      if (statusEl) statusEl.innerHTML = `<span style="color:var(--cyan,#0ff)">Testando ${p}...</span>`;
      if (window.showLog) window.showLog('AI API', 'testando provider real: ' + p, 'cyan');
      try {
        const r = await fetch(workerUrl('/api/providers/test'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider: p, api_key: key || undefined })
        });
        const d = await r.json();
        if (d.ok || d.connected || d.reachable) {
          const lat   = d.latency_ms ? d.latency_ms + 'ms' : '';
          const model = d.model || d.model_count ? (d.model || (d.model_count + ' modelos')) : '';
          if (statusEl) statusEl.innerHTML = `<span style="color:var(--green,#0f0)">✓ ${p} online</span>${lat ? ' · ' + lat : ''}${model ? ' · ' + model : ''}`;
          if (window.showLog) window.showLog('AI API', p + ' OK' + (lat ? ' ' + lat : ''), 'green');
        } else {
          const msg = d.error || d.status || 'sem resposta';
          if (statusEl) statusEl.innerHTML = `<span style="color:var(--yellow,#ff0)">⚠ ${p}: ${msg}</span>`;
          if (window.showLog) window.showLog('AI API', p + ' sem resposta: ' + msg, 'yellow');
        }
      } catch (e) {
        if (statusEl) statusEl.innerHTML = `<span style="color:var(--red,#f44)">✗ erro: ${e.message}</span>`;
        if (window.showLog) window.showLog('AI API', 'erro testando ' + p + ': ' + e.message, 'red');
      } finally {
        fresh.disabled = false;
        fresh.textContent = 'TESTAR PROVIDER';
      }
    });
  }

  // Aguarda DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { renderSFPanel(); attachProviderTestHandler(); });
  } else {
    renderSFPanel();
    attachProviderTestHandler();
  }

})();
