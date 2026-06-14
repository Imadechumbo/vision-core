/* VISION CORE V5.8.2 — Backend Agents Catalog (B10 §82)
   Carrega /api/agents/catalog e sincroniza #agentsCatalogGrid + .opensquad-agents */
(function () {
  'use strict';
  if (window.__VISION_BACKEND_AGENTS__) return;
  window.__VISION_BACKEND_AGENTS__ = true;

  function workerUrl(path) {
    const base = window.__VISION_API__ || window.API || window.API_BASE_URL || '';
    return base.replace(/\/$/, '') + path;
  }

  // ── Render no #agentsCatalogGrid ────────────────────────────
  function renderAgents(agents, containerId) {
    const grid = document.getElementById(containerId || 'agentsCatalogGrid');
    if (!grid || !agents || !agents.length) return;
    grid.innerHTML = agents.map(a => {
      const active = a.status === 'active' || a.role !== 'reserve';
      const statusLabel = active ? 'ATIVO' : (a.status === 'reserve' ? 'RESERVA' : 'ESCALA');
      const statusColor = active ? 'var(--green,#0f0)' : '#555';
      return `<div class="vc-reserve-card" data-agent-id="${a.id}" translate="no">
        <div class="vc-reserve-card-top">
          <div class="vc-reserve-icon">⬡</div>
          <span class="vc-reserve-status" style="color:${statusColor}">${statusLabel}</span>
        </div>
        <div class="vc-reserve-type">${String(a.role || 'agent').toUpperCase()}</div>
        <div class="vc-reserve-name">${a.name}</div>
        <div class="vc-reserve-desc">${a.focus || a.role || 'Agente técnico VISION CORE'}</div>
        ${(a.provides && a.provides.length) ? `<div class="vc-reserve-tags">${a.provides.map(p => `<span class="vc-reserve-tag">${p}</span>`).join('')}</div>` : ''}
        <div class="vc-reserve-footer"></div>
      </div>`;
    }).join('');
  }

  // ── Sincroniza .opensquad-agents com dados do catalog ───────
  function syncOpenSquad(agents) {
    const squad = document.querySelector('.opensquad-agents');
    if (!squad || !agents || !agents.length) return;
    squad.innerHTML = agents.slice(0, 8).map(a => {
      const active = a.status === 'active';
      const color = active ? 'var(--green,#0f0)' : '#555';
      const statusLabel = active ? 'ATIVO' : (a.status === 'reserve' ? 'RESERVA' : 'ESCALA');
      const statusClass = active ? 'green' : 'muted';
      return `<div class="agent-slot ${active ? 'active' : 'reserved'}" translate="no">
        <div class="agent-dot" style="background:${color}"></div>
        <div>
          <strong>${a.name}</strong>
          <span>${a.focus || a.role || 'Agente técnico VISION CORE'}</span>
        </div>
        <span class="agent-status ${statusClass}">${statusLabel}</span>
      </div>`;
    }).join('');
  }

  // ── Fetch e orquestração ─────────────────────────────────────
  async function loadBackendBoards() {
    try {
      const r = await fetch(workerUrl('/api/agents/catalog'));
      if (!r.ok) return;
      const ad = await r.json();

      // Render catalog grid com todos os agentes
      const allAgents = [
        ...(ad.core_agents || []),
        ...(ad.reserve_agents || []),
        ...(ad.agents || []).filter(a => {
          const ids = [...(ad.core_agents || []), ...(ad.reserve_agents || [])].map(x => x.id);
          return !ids.includes(a.id);
        })
      ];

      if (allAgents.length) {
        renderAgents(allAgents, 'agentsCatalogGrid');
      }

      // Sync opensquad panel
      syncOpenSquad([...(ad.core_agents || []), ...(ad.reserve_agents || [])]);

      if (window.showLog) window.showLog('CATALOG', `${allAgents.length} agentes carregados do backend`, 'cyan');
    } catch (err) {
      // Silently fail — static HTML remains intact
      if (window.showLog) window.showLog('CATALOG', 'catalog não disponível: ' + err.message, 'yellow');
    }
  }

  // Expõe para debug
  window.loadBackendBoards = loadBackendBoards;
  window.syncOpenSquad = syncOpenSquad;
  window.renderAgents = renderAgents;

  // Aguarda DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadBackendBoards);
  } else {
    loadBackendBoards();
  }
})();
