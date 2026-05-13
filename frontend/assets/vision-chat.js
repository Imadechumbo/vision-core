(function () {
  'use strict';

  var attachments = [];

  function byId(id) { return document.getElementById(id); }
  function appendMessage(role, text) {
    var root = byId('chatMessages');
    if (!root) { return; }
    var article = document.createElement('article');
    article.className = 'message ' + (role || 'system');
    var label = document.createElement('span');
    label.textContent = role === 'user' ? 'Você' : (role === 'assistant' ? 'VISION' : 'Sistema');
    var paragraph = document.createElement('p');
    paragraph.textContent = text || '';
    article.append(label, paragraph);
    root.appendChild(article);
    root.scrollTop = root.scrollHeight;
  }
  function setStatus(text, kind) {
    var status = byId('chatStatus');
    if (!status) { return; }
    status.textContent = text;
    status.className = 'status-pill ' + (kind || '');
  }
  function showModal() {
    var modal = byId('authModal');
    if (modal) { modal.classList.remove('is-hidden'); }
  }
  function hideModal() {
    var modal = byId('authModal');
    if (modal) { modal.classList.add('is-hidden'); }
  }
  function updateAttachments(files) {
    attachments = Array.prototype.slice.call(files || []);
    var list = byId('attachmentList');
    if (!list) { return; }
    list.textContent = attachments.length ? attachments.map(function (file) { return file.name; }).join(' · ') : '';
  }
  async function sendToCopilot(text) {
    if (!window.VisionApi) {
      throw new Error('OFFLINE/BLOCKED: VisionApi unavailable');
    }
    return window.VisionApi.post('/api/copilot', {
      message: text,
      attachments: attachments.map(function (file) { return { name: file.name, size: file.size, type: file.type }; })
    });
  }
  async function onSubmit(event) {
    event.preventDefault();
    var input = byId('missionInput');
    var text = input ? input.value.trim() : '';
    if (!text) {
      appendMessage('system', 'BLOCKED: descreva a missão antes de enviar.');
      return;
    }
    appendMessage('user', text);
    setStatus('SENDING', 'muted');
    try {
      var response = await sendToCopilot(text);
      var answer = response && (response.answer || response.message || response.text || response.summary);
      appendMessage('assistant', answer || 'Resposta recebida sem conteúdo textual.');
      setStatus('LOCAL READY', '');
    } catch (error) {
      appendMessage('system', 'OFFLINE/BLOCKED: backend indisponível ou recusou a solicitação. ' + error.message);
      setStatus('BLOCKED', 'blocked');
    }
  }
  function bindModal() {
    var modal = byId('authModal');
    var signIn = byId('signInBtn');
    var close = byId('closeAuthBtn');
    var local = byId('continueLocalBtn');
    var external = byId('connectGitHubBtn');
    if (signIn) { signIn.addEventListener('click', showModal); }
    if (close) { close.addEventListener('click', hideModal); }
    if (local) {
      local.addEventListener('click', function () {
        hideModal();
        appendMessage('system', 'Modo local ativo. GitHub e integrações externas exigem autorização separada.');
      });
    }
    if (external) {
      external.addEventListener('click', function () {
        appendMessage('system', 'Integração GitHub exige fluxo autorizado pelo servidor.');
      });
    }
    if (modal) {
      modal.addEventListener('click', function (event) {
        if (event.target === modal) { hideModal(); }
      });
    }
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') { hideModal(); }
    });
  }
  function bind() {
    var form = byId('chatForm');
    var files = byId('fileInput');
    if (form) { form.addEventListener('submit', onSubmit); }
    if (files) { files.addEventListener('change', function () { updateAttachments(files.files); }); }
    bindModal();
  }

  window.VisionChat = { appendMessage: appendMessage };
  document.addEventListener('DOMContentLoaded', bind);
}());
