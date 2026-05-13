/* VISION CORE V2.3.1 — LEGACY METRICS ADAPTER
 * Fase 3 V14 + PI HARNESS CLEAN:
 * Agent Metrics ownership now belongs to frontend/assets/vision-agent-local.js.
 * This legacy file must not render fake costs, fallback bars, benchmark rows, or duplicate metrics ownership.
 */
(function(){
  'use strict';
  if (window.__V231_METRICS_ADAPTER__) return;
  window.__V231_METRICS_ADAPTER__ = true;

  function delegateToCleanOwner(){
    if (window.VisionAgentLocal && typeof window.VisionAgentLocal.refreshReadOnlyBoards === 'function') {
      window.VisionAgentLocal.refreshReadOnlyBoards();
      console.log('[V231] metrics/catalog delegated to VisionAgentLocal clean owner');
      return true;
    }
    return false;
  }

  function boot(){
    if (delegateToCleanOwner()) return;
    setTimeout(delegateToCleanOwner, 300);
    setTimeout(delegateToCleanOwner, 1200);
  }

  document.addEventListener('DOMContentLoaded', boot);
  if (document.readyState !== 'loading') boot();
})();
