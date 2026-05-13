/* VISION CORE V2.7.3 — LEGACY CHAT ADAPTER
 * Fase 4 V14 + PI HARNESS CLEAN:
 * Chat ownership belongs to frontend/assets/vision-chat.js.
 * Runtime execution belongs to frontend/assets/vision-runtime-owner.js.
 * This file only nudges the clean owner after legacy DOM is ready.
 */
(function(){
  'use strict';
  if (window.__V273_CHAT_ADAPTER__) return;
  window.__V273_CHAT_ADAPTER__ = true;

  function delegate() {
    if (window.VisionChat && typeof window.VisionChat.appendMessage === 'function') {
      console.log('[V273] delegated to VisionChat clean owner');
      return true;
    }
    return false;
  }

  function boot() {
    if (delegate()) return;
    setTimeout(delegate, 300);
    setTimeout(delegate, 1200);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
