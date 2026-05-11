/**
 * VISION CORE V4.4 — CONSISTENCY OBSERVER
 * ─────────────────────────────────────────────────────────────────
 * RUNTIME ROLE  : observer / consistency
 * OWNER         : false
 * DOMAINS       : ui-consistency (leitura e correção de CSS/display)
 * DEPENDS ON    : window.__V32_OWNER__ = true
 *
 * REGRAS (SDDF SPEC V8.1.0):
 * - Nunca chamar buildReport, triggerReport, fetchReport, doReport
 * - Nunca criar EventSource
 * - Nunca chamar /run-live
 * - Nunca emitir PASS GOLD
 * - Nunca renderizar Mission Report
 * - Pode corrigir CSS/display de elementos visuais orphãos
 * - Pode garantir consistência de estados de mc-nodes
 * - Observa window.__V32_OWNER__ e window.__VISION_SSE__ para
 *   sincronizar indicadores visuais passivos
 * ─────────────────────────────────────────────────────────────────
 */
(function VisionCoreV44Consistency() {
  'use strict';

  /* ── GUARD ── */
  if (window.__V44_RUNTIME_CONSISTENCY__) return;
  window.__V44_RUNTIME_CONSISTENCY__ = true;

  /* ── HELPERS ── */
  function node(key) {
    return document.querySelector('.mc-node[data-key="' + key + '"]');
  }

  function setCore(state) {
    var core = document.getElementById('mcCore');
    if (!core) return;
    core.classList.remove('running', 'success', 'fail');
    if (state === 'running') core.classList.add('running');
    else if (state === 'gold') core.classList.add('success');
    else if (state === 'fail') core.classList.add('fail');

    var t = document.getElementById('mcCoreStatus');
    var s = document.getElementById('mcCoreSub');
    if (t) t.textContent = state === 'gold' ? '★ GOLD'
      : state === 'running' ? 'LIVE'
      : state === 'fail' ? 'FAIL'
      : 'READY';
    if (s) s.textContent = state === 'gold' ? 'PASS GOLD'
      : state === 'running' ? 'EXECUTANDO'
      : state === 'fail' ? 'ERRO'
      : 'VISION CORE';
  }

  /* ── CONSISTENCY CHECK: detecta nodes orphãos stuck em "running" ── */
  var PIPELINE_ORDER = ['openclaw', 'scanner', 'hermes', 'patchengine', 'aegis', 'passgold', 'github'];
  var _lastSSE = null;
  var _stuckTimer = null;

  function checkNodeConsistency() {
    var sseActive = !!(window.__VISION_SSE__ && window.__VISION_SSE_LOCK__);
    var sseClosed = window.__VISION_SSE__ !== _lastSSE;
    _lastSSE = window.__VISION_SSE__;

    /* Se SSE fechou e ainda há node em "running", limpar */
    if (!sseActive && sseClosed) {
      PIPELINE_ORDER.forEach(function (key) {
        var n = node(key);
        if (n && n.classList.contains('v33-running')) {
          /* Node preso em running mas SSE fechou — reset para idle */
          console.log('[V44] node ' + key + ' stuck em running — reset para idle');
          n.classList.remove('v33-running');
          n.classList.add('v33-idle');
        }
      });
    }

    /* Sincronizar mcCore com estado real do SSE */
    if (sseActive) {
      setCore('running');
    }
    /* Não tocamos em gold/fail — V32 é responsável */
  }

  /* ── DOWNLOAD AGENT: corrige link real do desktop agent ── */
  function fixAgentDownload() {
    var btn = document.getElementById('agentDownloadBtn')
      || document.querySelector('[data-action="download-agent"]');
    if (!btn || btn.dataset.v44Fixed) return;
    btn.dataset.v44Fixed = 'true';

    btn.addEventListener('click', function (e) {
      var href = btn.getAttribute('href') || btn.getAttribute('data-href') || '';
      /* Se link ainda é placeholder, não navegar */
      if (!href || href === '#' || href.includes('placeholder')) {
        e.preventDefault();
        console.log('[V44] agentDownload: link real não configurado — bloqueado');
      }
    });
  }

  /* ── ZERO FAKE: bloquear animate() de pipeline demo ── */
  function blockFakeAnimations() {
    if (typeof window.v236AnimatePipelineDemo === 'function') {
      window.v236AnimatePipelineDemo = function () {
        console.log('[V44] v236AnimatePipelineDemo bloqueado (SDDF SPEC V8.1.0 — zero fake)');
      };
    }
  }

  /* ── INIT ── */
  document.addEventListener('DOMContentLoaded', function () {
    if (!window.__V32_OWNER__) {
      console.warn('[V44] __V32_OWNER__ não detectado — modo standby');
      return;
    }

    console.log('[V44] consistency observer ativo — V32 é execution/sse/report owner');

    blockFakeAnimations();
    fixAgentDownload();

    /* Poll de consistência a cada 2s */
    _stuckTimer = setInterval(function () {
      checkNodeConsistency();
      fixAgentDownload();
    }, 2000);

    window.addEventListener('beforeunload', function () {
      clearInterval(_stuckTimer);
    });
  });

})();
