/**
 * VISION CORE V2.9.8 — CHAT / COPILOT OBSERVER
 * ─────────────────────────────────────────────────────────────────
 * RUNTIME ROLE  : observer / chat-ui
 * OWNER         : false
 * DOMAINS       : chat-ui, copilot-send
 * DEPENDS ON    : window.__V32_OWNER__ = true
 *
 * REGRAS (SDDF SPEC V8.1.0):
 * - Quando __V32_OWNER__ = true: apenas UI de chat/copilot
 * - Nunca chamar /run-live
 * - Nunca criar EventSource
 * - Nunca registrar listener em executeBtn
 * - Nunca renderizar Mission Report
 * - Nunca emitir PASS GOLD
 * - Pode enviar /copilot (conversa), nunca /run-live
 * ─────────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  /* ── GUARD ── */
  if (window.__V298_OBSERVER__) return;
  window.__V298_OBSERVER__ = true;

  var API = (window.__VISION_API__ || window.API_BASE_URL || '').replace(/\/$/, '');

  function apiUrl(p) {
    if (/^https?:\/\//.test(p)) return p;
    return API + (p.charAt(0) === '/' ? p : '/' + p);
  }

  function $(id) { return document.getElementById(id); }

  /* ── CHAT HELPERS ── */
  function appendChat(text, type) {
    var log = $('v298ChatStream') || $('v297ChatLog');
    if (!log) return;
    var div = document.createElement('div');
    div.className = 'v298-msg ' + (type || 'bot');
    div.textContent = text;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
  }

  /* ── COPILOT: único endpoint permitido quando V32 ativo ── */
  async function sendCopilot() {
    var input = $('v298Prompt') || $('missionText');
    if (!input) return;
    var text = (input.value || '').trim();
    if (!text) return;

    appendChat(text, 'user');
    input.value = '';

    try {
      var res = await fetch(apiUrl('/api/copilot'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, mode: 'general' })
      });
      var data = await res.json().catch(function () { return {}; });
      appendChat(data.answer || 'Resposta indisponível.', 'bot');
    } catch (e) {
      appendChat('Erro de conexão: ' + e.message, 'bot');
    }
  }

  /* ── INIT ── */
  document.addEventListener('DOMContentLoaded', function () {
    if (!window.__V32_OWNER__) {
      console.warn('[V298] __V32_OWNER__ não detectado — modo standby');
      return;
    }

    console.log('[V298] chat observer ativo — V32 é execution owner');

    /* Botão de copilot (somente chat, não execução) */
    var copilotBtn = $('v298CopilotBtn') || $('v236CopilotBtn');
    if (copilotBtn) {
      copilotBtn.addEventListener('click', function (e) {
        e.preventDefault();
        sendCopilot();
      });
    }

    /* Enter no input de chat (somente copilot, não execução) */
    var promptInput = $('v298Prompt');
    if (promptInput) {
      promptInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendCopilot();
        }
      });
    }

    /* File input UI (apenas notificação visual) */
    var addFileBtn = $('v298AddFileBtn');
    var fileInput  = $('v298FileInput');
    if (addFileBtn && fileInput) {
      addFileBtn.addEventListener('click', function () { fileInput.click(); });
      fileInput.addEventListener('change', function () {
        var count = (fileInput.files || []).length;
        if (count > 0) appendChat(count + ' arquivo(s) adicionado(s) ao contexto.', 'bot');
      });
    }

    appendChat('Copilot V2.9.8 pronto. V32 controla execução de missões.', 'bot');
  });

})();
