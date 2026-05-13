(function V35() {
  'use strict';
  if (window.__V35__) return;
  window.__V35__ = true;

  function delegateToCleanOwner() {
    if (window.VisionAgentLocal && typeof window.VisionAgentLocal.refreshReadOnlyBoards === 'function') {
      window.VisionAgentLocal.refreshReadOnlyBoards();
      console.log('[V35] delegated to VisionAgentLocal clean owner');
      return true;
    }
    return false;
  }

  function boot() {
    if (delegateToCleanOwner()) return;
    setTimeout(delegateToCleanOwner, 300);
    setTimeout(delegateToCleanOwner, 1200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
