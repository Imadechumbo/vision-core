(function visionUiCommand() {
  'use strict';

  function addMessage(message, role) {
    const stream = document.getElementById('v236CopilotStream');
    if (!stream) return;
    const line = document.createElement('div');
    line.className = 'v236-copilot-msg ' + (role || 'bot');
    line.textContent = String(message || '');
    stream.appendChild(line);
    stream.scrollTop = stream.scrollHeight;
  }

  function explainCommand() {
    const missionText = document.getElementById('missionText');
    const prompt = missionText && missionText.value ? missionText.value.trim() : '';
    if (!prompt) {
      addMessage('Descreva a missão no campo principal antes de solicitar análise.', 'bot');
      return;
    }
    addMessage(prompt, 'user');
    addMessage('Missão preparada no painel. A execução real pertence ao runtime owner SDDF.', 'bot');
  }

  function bind() {
    const copilotBtn = document.getElementById('v236CopilotBtn');
    if (copilotBtn && copilotBtn.dataset.visionUiCommand !== 'true') {
      copilotBtn.dataset.visionUiCommand = 'true';
      copilotBtn.addEventListener('click', explainCommand);
    }
  }

  document.addEventListener('DOMContentLoaded', bind);
  if (document.readyState !== 'loading') bind();
  window.VisionUiCommand = { explainCommand };
}());
