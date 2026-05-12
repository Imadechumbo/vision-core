/* VISION CORE V13.1 — UI command layer only.
 * This file owns local UX for chat, copilot prompts and attachments.
 * It does not open live streams, call live execution endpoints, create pull
 * requests, decide GOLD state, or release promotions.
 */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const state = {
    files: []
  };

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function addCopilotMessage(message, role) {
    const box = $('v236CopilotLog') || $('v297ChatLog') || $('logsBox');
    if (!box) return;

    const div = document.createElement('div');
    div.className = role === 'user' ? 'v297-msg user' : 'v297-msg bot';
    div.innerHTML = escapeHtml(message);
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  }

  function missionText() {
    const field = $('missionText') || $('v297ChatInput') || $('commandInput');
    return field ? field.value.trim() : '';
  }

  function summarizePrompt(text) {
    const normalized = text.replace(/\s+/g, ' ').trim();
    if (!normalized) {
      return 'Descreva a missão no campo principal para eu organizar contexto, riscos e próximos passos.';
    }

    const hints = [];
    const lower = normalized.toLowerCase();
    if (lower.includes('cors')) hints.push('validar origem, preflight e headers');
    if (lower.includes('worker')) hints.push('conferir rota no Cloudflare Worker');
    if (lower.includes('sse') || lower.includes('stream')) hints.push('acompanhar eventos no runtime owner');
    if (lower.includes('erro') || lower.includes('error')) hints.push('separar sintoma, causa provável e validação');

    const suffix = hints.length ? ` Foco sugerido: ${hints.join('; ')}.` : '';
    return `Contexto preparado para execução segura: ${normalized.slice(0, 220)}${normalized.length > 220 ? '…' : ''}.${suffix}`;
  }

  function handleCopilot() {
    const text = missionText();
    addCopilotMessage(text || 'Preciso de ajuda para estruturar a missão.', 'user');
    addCopilotMessage(summarizePrompt(text), 'bot');
  }

  function bindAttachments() {
    const fileInput = $('v236FileInput') || $('fileInput');
    const fileButton = $('v236FileBtn') || $('fileBtn');
    const list = $('v236FilesList') || $('filesList');

    if (fileButton && fileInput) {
      fileButton.addEventListener('click', () => fileInput.click());
    }

    if (!fileInput) return;
    fileInput.addEventListener('change', () => {
      state.files = Array.from(fileInput.files || []).map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream'
      }));

      if (list) {
        list.innerHTML = state.files.map((file) => (
          `<span class="v236-file-chip">${escapeHtml(file.name)} · ${Math.ceil(file.size / 1024)}KB</span>`
        )).join('');
      }

      addCopilotMessage(`${state.files.length} arquivo(s) anexado(s) ao contexto local.`, 'bot');
    });
  }

  function bindTimelineHelp() {
    const map = {
      Scanner: 'Scanner lê arquivos, rotas, logs e sinais técnicos antes da execução.',
      Hermes: 'Hermes organiza diagnóstico e causa raiz.',
      PatchEngine: 'PatchEngine prepara correção segura e reversível.',
      Aegis: 'Aegis revisa risco e política anti-caos.',
      'PASS GOLD': 'GOLD exige evidência real validada pelo backend.',
      'PR GitHub': 'PR é responsabilidade de fluxo servidor/autorizado, não deste copiloto.'
    };

    document.querySelectorAll('.v236-tl-step').forEach((el) => {
      el.addEventListener('click', () => {
        const stage = el.dataset.stage || el.textContent.trim();
        addCopilotMessage(`${stage}: ${map[stage] || 'etapa do pipeline SDDF.'}`, 'bot');
      });
    });
  }

  function bindChat() {
    const button = $('v236CopilotBtn') || $('copilotBtn') || $('v297ChatSend');
    const input = $('v297ChatInput') || $('commandInput');

    if (button) button.addEventListener('click', handleCopilot);
    if (input) {
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          handleCopilot();
        }
      });
    }
  }

  function init() {
    bindChat();
    bindAttachments();
    bindTimelineHelp();
    window.VisionUiCommand = Object.freeze({ addCopilotMessage, summarizePrompt });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
