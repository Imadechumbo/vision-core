(function () {
  'use strict';

  var attachments = [];

  function byId(id) { return document.getElementById(id); }
  function appendMessage(role, text) {
    var root = byId('chatMessages') || byId('v297ChatLog');
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
    var status = byId('chatStatus') || byId('v297ChatStatus');
    if (!status) { return; }
    status.textContent = text;
    status.className = 'status-pill ' + (kind || '');
  }
  function updateAttachments(files) {
    attachments = Array.prototype.slice.call(files || []);
    var list = byId('attachmentList') || byId('v236FileList');
    if (!list) { return; }
    list.textContent = attachments.length ? attachments.map(function (file) { return file.name; }).join(' · ') : 'Nenhum arquivo anexado.';
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
    if (event) { event.preventDefault(); }
    var input = byId('missionInput') || byId('missionText');
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
  function bind() {
    var form = byId('chatForm');
    var sendBtn = byId('sendBtn') || byId('v297SendBtn');
    var files = byId('fileInput') || byId('v236FileInput') || byId('v297FileInput');
    if (form) { form.addEventListener('submit', onSubmit); }
    if (sendBtn) { sendBtn.addEventListener('click', onSubmit); }
    if (files) { files.addEventListener('change', function () { updateAttachments(files.files); }); }
  }

  window.VisionChat = { appendMessage: appendMessage, send: onSubmit };
  document.addEventListener('DOMContentLoaded', bind);
}());
