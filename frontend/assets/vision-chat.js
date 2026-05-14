(function () {
  'use strict';

  var attachments = [];

<<<<<<< Updated upstream
  var promptChips = [
    'explicar PASS GOLD',
    'debug CORS',
    'analisar erro 405',
    'preparar PR',
    'rodar SDDF',
    'explicar para leigo'
  ];

  function byId(id) { return document.getElementById(id); }
  function firstByIds(ids) {
    for (var i = 0; i < ids.length; i += 1) {
      var node = byId(ids[i]);
      if (node) { return node; }
    }
    return null;
  }
  function safeText(value) { return String(value || '').replace(/[<>]/g, ''); }

  function chatRoot() {
    return firstByIds(['chatMessages', 'v298ChatStream', 'v297ChatLog', 'v236CopilotMiniChat']);
  }

  function inputNode() {
    return firstByIds(['missionInput', 'v298Prompt', 'missionText']);
  }

  function appendMessage(role, text) {
    var root = chatRoot();
    if (!root) { return; }

    var isV298 = root.id === 'v298ChatStream';
    var isV297 = root.id === 'v297ChatLog';
    var isMini = root.id === 'v236CopilotMiniChat';

    var empty = root.querySelector('.v298-empty-hint');
    if (empty) { empty.remove(); }

    var node = document.createElement(isV298 || isV297 || isMini ? 'div' : 'article');
    if (isV298) {
      node.className = 'v298-message ' + (role === 'assistant' ? 'bot' : role || 'system');
      node.textContent = text || '';
    } else if (isV297) {
      node.className = 'v297-msg ' + (role === 'assistant' ? 'bot' : role || 'bot');
      node.textContent = text || '';
    } else if (isMini) {
      node.className = 'v236-copilot-msg ' + (role === 'assistant' ? 'bot' : role || 'bot');
      node.textContent = text || '';
    } else {
      node.className = 'message ' + (role || 'system');
      var label = document.createElement('span');
      label.textContent = role === 'user' ? 'Você' : (role === 'assistant' ? 'VISION' : 'Sistema');
      var paragraph = document.createElement('p');
      paragraph.textContent = text || '';
      node.append(label, paragraph);
    }
    root.appendChild(node);
    root.scrollTop = root.scrollHeight;
  }

  function setStatus(text, kind) {
    var status = firstByIds(['chatStatus', 'v298CommandStatus', 'v297ChatStatus']);
    if (!status) { return; }
    status.textContent = text;
    if (status.id === 'chatStatus') {
      status.className = 'status-pill ' + (kind || '');
    }
  }

=======
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
>>>>>>> Stashed changes
  function showModal() {
    var modal = byId('authModal');
    if (modal) { modal.classList.remove('is-hidden'); }
  }
<<<<<<< Updated upstream

=======
>>>>>>> Stashed changes
  function hideModal() {
    var modal = byId('authModal');
    if (modal) { modal.classList.add('is-hidden'); }
  }
<<<<<<< Updated upstream

  function updateAttachments(files) {
    attachments = Array.prototype.slice.call(files || []);
    var list = firstByIds(['attachmentList', 'v298FileNote']);
    var text = attachments.length ? attachments.map(function (file) { return file.name; }).join(' · ') : 'Nenhum arquivo anexado.';
    if (list) { list.textContent = text; }
    if (attachments.length) {
      appendMessage('system', attachments.length + ' arquivo(s)/imagem(ns) adicionados ao contexto: ' + attachments.map(function (file) { return file.name; }).join(' • '));
    }
  }

  function classify(text) {
    var t = String(text || '').toLowerCase();
    if (/cors|failed to fetch|preflight|origin/.test(t)) { return 'debug-cors'; }
    if (/405|method not allowed|endpoint|rota/.test(t)) { return 'debug-contract'; }
    if (/pr|pull request|github/.test(t)) { return 'pr'; }
    if (/deploy|elastic|beanstalk|cloudflare/.test(t)) { return 'deploy'; }
    if (/corrig|erro|bug|stack|exception|falha/.test(t)) { return 'debug'; }
    if (/pass gold|sddf|harness|gate/.test(t)) { return 'sddf'; }
    return 'chat';
  }

  function localAnswer(text) {
    var answers = {
      'debug-cors': 'Diagnóstico provável: CORS/preflight. O SDDF valida Origin, OPTIONS, método, headers permitidos e endpoint real antes de culpar o frontend.',
      'debug-contract': 'Diagnóstico provável: contrato front/back. 405 indica rota ou método divergente. Verifique método HTTP, aliases de execução e compatibilidade SSE.',
      pr: 'Fluxo PR: só pode preparar Pull Request depois de Scanner + Hermes + PatchEngine + Aegis + Evidence Receipt + PASS GOLD. Sem GOLD, PR fica bloqueado.',
      deploy: 'Fluxo deploy: validar health, version, CORS, backend, Cloudflare, runtime e rollback. Promoção só com PASS GOLD real.',
      debug: 'Modo debug: OpenClaw classifica, Scanner lê a realidade, Hermes diagnostica RCA, PatchEngine planeja, Aegis bloqueia risco, SDDF decide GOLD.',
      sddf: 'SDDF aplicado: L0 Intake, L1 Inspect, L2 Diagnose, L3 Plan, L4 Dry Run, L5 Controlled Patch, L6 Validation, L7 Evidence Receipt, L8 PASS GOLD, L9 PR/Promotion.',
      chat: 'Posso explicar em linguagem simples ou transformar sua descrição em missão executável. Cole erro, log, endpoint ou objetivo.'
    };
    return answers[classify(text)] || answers.chat;
  }

=======
  function updateAttachments(files) {
    attachments = Array.prototype.slice.call(files || []);
    var list = byId('attachmentList');
    if (!list) { return; }
    list.textContent = attachments.length ? attachments.map(function (file) { return file.name; }).join(' · ') : '';
  }
>>>>>>> Stashed changes
  async function sendToCopilot(text) {
    if (!window.VisionApi) {
      throw new Error('OFFLINE/BLOCKED: VisionApi unavailable');
    }
    return window.VisionApi.post('/api/copilot', {
      message: text,
<<<<<<< Updated upstream
      input: text,
      mode: 'explain',
      attachments: attachments.map(function (file) { return { name: file.name, size: file.size, type: file.type }; })
    });
  }

  async function askOnly(event) {
    if (event) {
      event.preventDefault();
      if (event.stopPropagation) { event.stopPropagation(); }
    }
    var input = inputNode();
=======
      attachments: attachments.map(function (file) { return { name: file.name, size: file.size, type: file.type }; })
    });
  }
  async function onSubmit(event) {
    event.preventDefault();
    var input = byId('missionInput');
>>>>>>> Stashed changes
    var text = input ? input.value.trim() : '';
    if (!text) {
      appendMessage('system', 'BLOCKED: descreva a missão antes de enviar.');
      return;
    }
    appendMessage('user', text);
    setStatus('SENDING', 'muted');
    try {
      var response = await sendToCopilot(text);
<<<<<<< Updated upstream
      var answer = response && (response.answer || response.message || response.text || response.summary || response.rca || response.root_cause);
      appendMessage('assistant', answer || localAnswer(text));
      setStatus('LOCAL READY', '');
    } catch (error) {
      appendMessage('assistant', localAnswer(text));
=======
      var answer = response && (response.answer || response.message || response.text || response.summary);
      appendMessage('assistant', answer || 'Resposta recebida sem conteúdo textual.');
      setStatus('LOCAL READY', '');
    } catch (error) {
>>>>>>> Stashed changes
      appendMessage('system', 'OFFLINE/BLOCKED: backend indisponível ou recusou a solicitação. ' + error.message);
      setStatus('BLOCKED', 'blocked');
    }
  }
<<<<<<< Updated upstream

  function blockedRun(event) {
    if (event) {
      event.preventDefault();
      if (event.stopPropagation) { event.stopPropagation(); }
    }
    appendMessage('system', 'EXECUÇÃO BLOQUEADA NO CHAT: a execução pertence ao VisionRuntimeOwner e exige mission_id + Evidence Receipt. Use o botão de missão quando o Runtime Owner estiver ativo.');
    if (window.VisionRuntimeOwner && typeof window.VisionRuntimeOwner.executeMission === 'function') {
      window.VisionRuntimeOwner.executeMission();
    }
  }

  function ensureCommandPanel() {
    var processCopy = document.querySelector('#processScreen .vc-process-copy');
    if (!processCopy || byId('v14CommandHints')) { return; }

    var panel = document.createElement('div');
    panel.className = 'v273-command-panel';
    panel.id = 'v14CommandHints';
    panel.setAttribute('aria-live', 'polite');
    panel.innerHTML = '<div class="v273-chat-msg assistant"><span class="role">Vision</span><span class="text">Pronto. Shift+Enter explica. Ctrl+Enter solicita execução controlada ao Runtime Owner.</span></div>';
    processCopy.appendChild(panel);

    var bar = document.createElement('div');
    bar.className = 'v273-sddf-bar';
    bar.innerHTML = '<span data-gate="l0">L0 Intake</span><span data-gate="l1">L1 Inspect</span><span data-gate="l2">L2 Diagnose</span><span data-gate="l7">L7 Evidence</span><span data-gate="l8">L8 PASS GOLD</span>';
    processCopy.appendChild(bar);

    var chips = document.createElement('div');
    chips.className = 'v273-chip-row';
    chips.innerHTML = promptChips.map(function (chip) {
      return '<button type="button" class="v273-chip">' + safeText(chip) + '</button>';
    }).join('');
    chips.addEventListener('click', function (event) {
      var button = event.target.closest('.v273-chip');
      if (!button) { return; }
      var input = inputNode();
      if (input) { input.value = button.textContent.trim(); }
      askOnly(event);
    });
    processCopy.appendChild(chips);
  }

  function bindModal() {
    var modal = byId('authModal');
    var signIn = firstByIds(['signInBtn', 'openAuthBtn', 'openAuthBtn2']);
=======
  function bindModal() {
    var modal = byId('authModal');
    var signIn = byId('signInBtn');
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream

  function bindFiles() {
    var files = firstByIds(['fileInput', 'v298FileInput', 'v297FileInput', 'v236FileInput']);
    var fileBtns = ['v298AddFilesBtn', 'v298ReadPrintBtn', 'v297AddFileBtn', 'v297AddImageBtn', 'v236FileBtn'].map(byId).filter(Boolean);
    fileBtns.forEach(function (button) {
      if (button.__visionChatBound) { return; }
      button.__visionChatBound = true;
      button.addEventListener('click', function (event) {
        event.preventDefault();
        if (files) { files.click(); }
      });
    });
    if (files && !files.__visionChatBound) {
      files.__visionChatBound = true;
      files.addEventListener('change', function () { updateAttachments(files.files); });
    }
  }

  function bindChatControls() {
    var form = byId('chatForm');
    var sendBtns = ['sendBtn', 'v298SendBtn', 'v297SendBtn', 'v236CopilotBtn'].map(byId).filter(Boolean);
    var runBtns = ['v298RunBtn', 'v297RunSddfBtn'].map(byId).filter(Boolean);
    var input = inputNode();

    if (form && !form.__visionChatBound) {
      form.__visionChatBound = true;
      form.addEventListener('submit', askOnly);
    }
    sendBtns.forEach(function (button) {
      if (button.__visionChatBound) { return; }
      button.__visionChatBound = true;
      button.addEventListener('click', askOnly);
    });
    runBtns.forEach(function (button) {
      if (button.__visionChatBound) { return; }
      button.__visionChatBound = true;
      button.addEventListener('click', blockedRun);
    });
    if (input && !input.__visionChatKeysBound) {
      input.__visionChatKeysBound = true;
      input.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' && event.shiftKey) {
          event.preventDefault();
          askOnly(event);
        }
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          blockedRun(event);
        }
      });
    }
  }

  function bind() {
    ensureCommandPanel();
    bindFiles();
    bindChatControls();
    bindModal();
  }

  window.VisionChat = {
    appendMessage: appendMessage,
    askOnly: askOnly,
    blockedRun: blockedRun,
    updateAttachments: updateAttachments,
    attachments: function () { return attachments.slice(); }
  };

  document.addEventListener('DOMContentLoaded', bind);
  if (document.readyState !== 'loading') { bind(); }
=======
  function bind() {
    var form = byId('chatForm');
    var files = byId('fileInput');
    if (form) { form.addEventListener('submit', onSubmit); }
    if (files) { files.addEventListener('change', function () { updateAttachments(files.files); }); }
    bindModal();
  }

  window.VisionChat = { appendMessage: appendMessage };
  document.addEventListener('DOMContentLoaded', bind);
>>>>>>> Stashed changes
}());
