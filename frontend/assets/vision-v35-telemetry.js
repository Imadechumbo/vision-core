/**
 * VISION CORE V3.5 — TELEMETRIA REAL
 * Fetch métricas de /api/metrics/agents, /api/runtime/harness-stats etc.
 * Sem fake, sem demo, sem Math.random.
 */
(function V35() {
  'use strict';
  if (window.__V35__) return;
  window.__V35__ = true;

  var API = (window.__VISION_API__ || window.API_BASE_URL || '').replace(/\/$/, '');
  function apiUrl(p) { return API + p; }

  function safe(url) {
    return fetch(url)
      .then(function(r) { return r.ok ? r.json() : null; })
      .catch(function() { return null; });
  }

  /* ── MÉTRICAS DOS AGENTS ─────────────────────────────────────── */
  var AGENT_KEYS = {
    'OpenClaw': 'openclaw', 'Hermes': 'hermes', 'Scanner': 'scanner',
    'Aegis': 'aegis', 'PatchEngine': 'patchengine', 'PASS GOLD': 'passgold',
    'openclaw': 'openclaw', 'hermes': 'hermes', 'scanner': 'scanner',
    'aegis': 'aegis', 'patchengine': 'patchengine', 'passgold': 'passgold',
  };

  function fillMetrics(agents) {
    if (!agents || !Array.isArray(agents)) return;
    var total = 0;
    agents.forEach(function(a) {
      var key = AGENT_KEYS[a.name] || AGENT_KEYS[a.id] || (a.name||'').toLowerCase().replace(/\s/g,'');
      var bar  = document.getElementById('bar-' + key);
      var val  = document.getElementById('val-' + key);
      if (bar) bar.style.width = Math.min(100, a.width || a.usage_pct || 0) + '%';
      if (val) {
        var cost = a.cost != null ? a.cost : (a.total_cost != null ? a.total_cost : null);
        val.textContent = cost != null ? String(cost) : '—';
        if (cost != null && typeof cost === 'number') total += cost;
      }
    });
    var totalEl = document.getElementById('mcTotalCost');
    if (totalEl && total > 0) totalEl.textContent = '$' + total.toFixed(3);
  }

  function loadMetrics() {
    Promise.all([
      safe(apiUrl('/api/metrics/agents')),
      safe(apiUrl('/api/runtime/harness-stats')),
    ]).then(function(r) {
      var metricsData = r[0];
      var harnessData = r[1];

      if (metricsData && metricsData.agents) {
        fillMetrics(metricsData.agents);
      } else if (harnessData) {
        // Fallback: usar harness-stats se metrics/agents indisponível
        var passRate = harnessData.pass_gold_rate;
        var barPg = document.getElementById('bar-passgold');
        var valPg = document.getElementById('val-passgold');
        if (barPg && passRate != null) barPg.style.width = passRate + '%';
        if (valPg) valPg.textContent = passRate != null ? passRate + '%' : '—';
      }

      // Atualizar total se não foi preenchido
      var totalEl = document.getElementById('mcTotalCost');
      if (totalEl && totalEl.textContent === '—' && harnessData && harnessData.total) {
        totalEl.textContent = harnessData.total;
      }
    });
  }

  /* ── RELATÓRIO NO CHAT — garantia dupla ──────────────────────── */
  // O v34 já faz isso via processSSEEvent. V35 adiciona observer como backup.
  var _reportSent = false;

  function watchForPassGold() {
    if (window.__V34__) {
      // V34 ativo — ele já tem o observer. Não duplicar.
      return;
    }
    // Fallback: observar o chat
    var chat = document.getElementById('v298ChatStream') ||
               document.getElementById('v297ChatLog');
    if (!chat || chat.__v35_obs__) return;
    chat.__v35_obs__ = true;

    new MutationObserver(function(muts) {
      if (_reportSent) return;
      muts.forEach(function(m) {
        m.addedNodes.forEach(function(n) {
          var txt = n.textContent || '';
          if (/PASS GOLD confirmado|pass_gold|mission_completed/.test(txt)) {
            _reportSent = true;
            var mId = window.mission && window.mission.id;
            console.log('[V35] PASS GOLD detectado — doReport(', mId, ')');
            // Resetar na próxima missão
            setTimeout(function() { _reportSent = false; }, 3000);
          }
        });
      });
    }, { childList: true, subtree: true });
  }

  /* ── BOOT ────────────────────────────────────────────────────── */
  function boot() {
    loadMetrics();
    setInterval(loadMetrics, 30000); // atualizar a cada 30s
    watchForPassGold();
    console.log('[V35] telemetria real ONLINE — métricas de /api/metrics/agents');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
