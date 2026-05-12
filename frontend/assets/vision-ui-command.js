/* VISION CORE V8.4 — UI command helpers, sem runtime duplicado */
(function () {
  'use strict';

  function apiBase() {
    var raw = window.API || window.API_BASE_URL || (window.RUNTIME_CONFIG && window.RUNTIME_CONFIG.API_BASE_URL) || window.__VISION_API__ || '';
    return String(raw || window.location.origin).replace(/\/$/, '');
  }

  async function getJson(path) {
    var response = await fetch(apiBase() + path, { headers: { Accept: 'application/json' } });
    return response.json();
  }

  function bindAuthModal() {
    var backdrop = document.getElementById('authBackdrop');
    var open = document.getElementById('openAuthBtn');
    var close = document.getElementById('closeAuthBtn');
    if (open && backdrop) open.addEventListener('click', function () { backdrop.setAttribute('aria-hidden', 'false'); });
    if (close && backdrop) close.addEventListener('click', function () { backdrop.setAttribute('aria-hidden', 'true'); });
  }

  async function refreshScore() {
    var box = document.getElementById('scoreBox');
    if (!box) return;
    try {
      var data = await getJson('/api/pass-gold/score');
      box.innerHTML = '<div class="scoreBig ' + (data.status === 'GOLD' ? 'green' : 'red') + '">' +
        (data.final || '0 / 100') + '</div><div>Status: <b>' + (data.status || 'UNKNOWN') +
        '</b></div><div>Promoção: <b>' + (data.promotion_allowed ? 'LIBERADA' : 'BLOQUEADA') + '</b></div>';
    } catch (_) {}
  }

  function bind() {
    bindAuthModal();
    refreshScore();
  }

  window.VisionUiCommand = { refreshScore: refreshScore };
  document.addEventListener('DOMContentLoaded', bind);
  if (document.readyState !== 'loading') bind();
})();
