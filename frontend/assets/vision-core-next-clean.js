(function () {
  'use strict';

  var appShell = document.querySelector('.vc-app-shell');
  var sidebarToggle = document.querySelector('[data-sidebar-toggle]');
  var composer = document.getElementById('vcComposer');
  var prompt = document.getElementById('vcPrompt');
  var stream = document.getElementById('vcChatStream');
  var featurePanel = document.getElementById('vcFeaturePanel');
  var featureTitle = document.getElementById('vcFeatureTitle');
  var featureBody = document.getElementById('vcFeatureBody');
  var featureStatus = document.getElementById('vcFeatureStatus');
  var featureActions = document.getElementById('vcFeatureActions');
  var featureRun = document.getElementById('vcFeatureRun');
  var githubPrForm = document.getElementById('vcGithubPrForm');
  var prRepoInput = document.getElementById('vcPrRepo');
  var prBranchInput = document.getElementById('vcPrBranch');
  var prTitleInput = document.getElementById('vcPrTitle');
  var prBodyInput = document.getElementById('vcPrBody');
  var prActionsEl = document.getElementById('vcPrActions');
  var prStatusEl = document.getElementById('vcPrStatus');
  var missionPatchForm = document.getElementById('vcMissionPatchForm');
  var missionFilePathInput = document.getElementById('vcMissionFilePath');
  var missionFileContentInput = document.getElementById('vcMissionFileContent');
  var missionDescInput = document.getElementById('vcMissionDesc');
  var missionGenerateBtn = document.getElementById('vcMissionGenerateBtn');
  var missionStatusEl = document.getElementById('vcMissionStatus');
  var missionPatchOutputWrap = document.getElementById('vcMissionPatchOutputWrap');
  var missionPatchOutput = document.getElementById('vcMissionPatchOutput');
  var missionDownloadBtn = document.getElementById('vcMissionDownloadBtn');
  var dryRunForm = document.getElementById('vcDryRunForm');
  var dryRunTargetInput = document.getElementById('vcDryRunTargetPath');
  var dryRunActionsEl = document.getElementById('vcDryRunActions');
  var dryRunStatusEl = document.getElementById('vcDryRunStatus');
  var agentApplyForm = document.getElementById('vcAgentApplyForm');
  var agentApplyAgentIdInput = document.getElementById('vcAgentApplyAgentId');
  var agentApplyAgentSecretInput = document.getElementById('vcAgentApplyAgentSecret');
  var agentApplyPayloadInput = document.getElementById('vcAgentApplyPayload');
  var agentApplyConfirmInput = document.getElementById('vcAgentApplyConfirm');
  var agentApplyActionsEl = document.getElementById('vcAgentApplyActions');
  var agentApplyStatusEl = document.getElementById('vcAgentApplyStatus');
  var settingsPanel = document.getElementById('vcSettingsPanel');
  var settingsProvider = document.getElementById('vcSettingsProvider');
  var settingsApiKey = document.getElementById('vcSettingsApiKey');
  var settingsModel = document.getElementById('vcSettingsModel');
  var settingsBaseUrl = document.getElementById('vcSettingsBaseUrl');
  var settingsSaveBtn = document.getElementById('vcSettingsSaveBtn');
  var settingsTestBtn = document.getElementById('vcSettingsTestBtn');
  var settingsDeleteBtn = document.getElementById('vcSettingsDeleteBtn');
  var settingsStatus = document.getElementById('vcSettingsStatus');
  var settingsList = document.getElementById('vcSettingsList');
  var vaultRollback = document.getElementById('vcVaultRollback');
  var vaultSnapshotList = document.getElementById('vcVaultSnapshotList');
  var vaultActions = document.getElementById('vcVaultActions');
  var vaultStatus = document.getElementById('vcVaultStatus');
  var missionHistory = document.getElementById('vcMissionHistory');
  var missionHistoryList = document.getElementById('vcMissionHistoryList');
  var missionDetail = document.getElementById('vcMissionDetail');
  var missionDetailTitle = document.getElementById('vcMissionDetailTitle');
  var missionDetailMeta = document.getElementById('vcMissionDetailMeta');
  var missionDetailBody = document.getElementById('vcMissionDetailBody');
  var missionDetailEvidence = document.getElementById('vcMissionDetailEvidence');
  var missionEvidenceBody = document.getElementById('vcMissionEvidenceBody');
  var missionDetailBack = document.getElementById('vcMissionDetailBack');
  var applyFixForm = document.getElementById('vcApplyFixForm');
  var applyFixFile = document.getElementById('vcApplyFixFile');
  var applyFixLine = document.getElementById('vcApplyFixLine');
  var applyFixRuleId = document.getElementById('vcApplyFixRuleId');
  var applyFixContent = document.getElementById('vcApplyFixContent');
  var applyFixConfirm = document.getElementById('vcApplyFixConfirm');
  var applyFixActionsEl = document.getElementById('vcApplyFixActions');
  var applyFixPreview = document.getElementById('vcApplyFixPreview');
  var applyFixDiffBefore = document.getElementById('vcApplyFixDiffBefore');
  var applyFixDiffAfter = document.getElementById('vcApplyFixDiffAfter');
  var applyFixStatus = document.getElementById('vcApplyFixStatus');
  var attachmentInput = document.getElementById('vcAttachmentInput');
  var imageInput = document.getElementById('vcImageInput');
  var activeFeature = 'chat';

  var featureMap = {
    chat: { title: 'Chat', status: 'READY', agents: ['hermes'], text: 'Chat livre conectado ao endpoint real /api/chat.', actions: [{ label: 'Checar API', path: '/api/health' }] },
    missions: { title: 'Missions', status: 'PATCH + DRY-RUN + APPLY BLOQUEADO', agents: ['hermes', 'scanner', 'patchEngine', 'aegis', 'passGold'], text: 'Gerar Patch roda o pipeline real de diagnóstico + apply-patch, sem escrever nada sozinho — só gera diff para download. Dry-Run Real (abaixo) enfileira execução real no Vision Agent Local, em modo simulação (nunca escreve no disco). Apply-patch real via agente aparece abaixo, mas o botão fica bloqueado até existir token de pareamento real por agente (agent_id sozinho não autentica ninguém).', actions: [{ label: 'Quota', path: '/api/mission/quota' }, { label: 'Agent local', path: '/api/agent/status' }] },
    factory: { title: 'Software Factory', status: 'ATIVO', agents: ['openclaw', 'pi', 'hermes'], text: 'Descreva o projeto em linguagem simples. O Arquiteto analisa e gera a estrutura automaticamente via API real.', actions: [] },
    timeline: { title: 'Timeline', status: 'SAFE READ', agents: ['archivist'], text: 'Timeline preparada para leitura real de missão.', actions: [{ label: 'Carregar timeline', path: '/api/mission/timeline' }] },
    agents: { title: 'Agentes', status: 'SAFE READ', agents: ['hermes', 'scanner', 'patchEngine', 'aegis', 'goCore', 'github'], text: 'Status real dos agentes sem executar missão.', actions: [{ label: 'Status agent', path: '/api/agent/status' }, { label: 'Catálogo', path: '/api/agents/catalog' }, { label: 'Métricas agentes', path: '/api/metrics/agents' }] },
    github: { title: 'GitHub', status: 'PR c/ CONFIRMAÇÃO', agents: ['github'], text: 'Criação de PR real disponível abaixo — exige formulário completo + confirmação dupla antes de disparar.', actions: [{ label: 'Status GitHub', path: '/api/github/status' }] },
    vault: { title: 'Vault', status: 'ROLLBACK DISPONÍVEL', agents: ['aegis', 'archivist'], text: 'Snapshots do banco de projetos e rollback. Rollback sobrescreve o estado atual — confirmação dupla obrigatória.', actions: [{ label: 'Snapshots', path: '/api/vault/snapshots' }] },
    metrics: { title: 'Métricas', status: 'SAFE READ', agents: ['goCore', 'aegis'], text: 'Métricas reais em modo leitura.', actions: [{ label: 'Resumo', path: '/api/metrics/summary' }, { label: 'Agentes', path: '/api/metrics/agents' }, { label: 'DORA', path: '/api/dora-metrics' }, { label: 'Memória', path: '/api/metrics/memory' }] },
    tools: { title: 'Tools', status: 'APPLY-FIX DISPONÍVEL', agents: ['scanner', 'patchEngine'], text: 'Apply Fix abaixo — aplica correção em arquivo real com backup automático. Confirmação dupla obrigatória.', actions: [{ label: 'Histórico security', path: '/api/security/history' }, { label: 'Marketplace', path: '/api/tools/marketplace' }] },
    obsidian: { title: 'Obsidian', status: 'SAFE READ', agents: ['archivist'], text: 'Consulta de conector/memória sem escrita.', actions: [{ label: 'Status Obsidian', path: '/api/obsidian/status' }] },
    settings: { title: 'Configuração de IA', status: 'VAULT ATIVO', agents: ['hermes'], text: 'AI Provider Vault — salve, teste e remova chaves de API. A chave nunca é exibida por completo.', actions: [] },
    attach: { title: 'Anexos', status: 'LOCAL', agents: ['scanner'], text: 'Seletor local ativo. Upload real ainda bloqueado até definir limite, tipo permitido e confirmação.' },
    image: { title: 'Leitura de print/imagem', status: 'LOCAL', agents: ['scanner', 'hermes'], text: 'Seletor local de imagem ativo. Upload/OCR real ainda bloqueado por segurança.' }
  };

  function appendMessage(kind, title, text) {
    if (!stream) return null;
    var item = document.createElement('article');
    var label = document.createElement('span');
    var body = document.createElement('p');
    item.className = 'vc-message vc-message-' + kind;
    label.textContent = title;
    body.textContent = text;
    item.appendChild(label);
    item.appendChild(body);
    stream.appendChild(item);
    item.scrollIntoView({ block: 'end', behavior: 'smooth' });
    return item;
  }

  function resizePrompt() {
    if (!prompt) return;
    prompt.style.height = 'auto';
    prompt.style.height = Math.min(prompt.scrollHeight, 180) + 'px';
  }

  function setSidebarState(state) {
    var next = state === 'collapsed' ? 'collapsed' : 'expanded';
    if (appShell) appShell.setAttribute('data-sidebar-state', next);
    if (sidebarToggle) {
      sidebarToggle.setAttribute('aria-expanded', String(next === 'expanded'));
      sidebarToggle.setAttribute('aria-label', next === 'expanded' ? 'Colapsar menu' : 'Expandir menu');
    }
    try { window.localStorage.setItem('vc_next_sidebar_state', next); } catch (_) {}
  }

  try { setSidebarState(window.localStorage.getItem('vc_next_sidebar_state') || 'expanded'); } catch (_) { setSidebarState('expanded'); }

  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', function () {
      var current = appShell && appShell.getAttribute('data-sidebar-state') === 'collapsed' ? 'collapsed' : 'expanded';
      setSidebarState(current === 'collapsed' ? 'expanded' : 'collapsed');
    });
  }

  function renderFeatureActions(feature) {
    if (!featureActions) return;
    featureActions.textContent = '';
    (feature.actions || []).forEach(function (action) {
      var button = document.createElement('button');
      button.type = 'button';
      button.textContent = action.label;
      button.addEventListener('click', function () { runFeatureAction(action, feature); });
      featureActions.appendChild(button);
    });
  }

  function runFeatureAction(action, feature) {
    if (!action || !action.path) return;
    if (action.method && action.method !== 'GET') {
      appendMessage('error', 'BLOQUEADO', 'Ação crítica bloqueada nesta etapa: ' + action.label);
      return;
    }
    if (window.setAtomicCoreState) window.setAtomicCoreState('action');
    if (window.highlightAtomicAgents) window.highlightAtomicAgents(feature.agents || []);
    appendMessage('pending', feature.title.toUpperCase(), 'Consultando ' + action.path + '...');
    apiRequest(action.path).then(function (data) {
      appendMessage('assistant', action.label.toUpperCase(), summarizeResult(data));
    }).catch(function (err) {
      appendMessage('error', action.label.toUpperCase(), err && err.message ? err.message : String(err));
    }).then(function () {
      if (window.resetAtomicCore) window.resetAtomicCore();
    });
  }

  function selectFeature(key, announce) {
    var feature = featureMap[key] || featureMap.chat;
    activeFeature = featureMap[key] ? key : 'chat';
    document.querySelectorAll('[data-feature]').forEach(function (node) {
      node.classList.toggle('is-active', node.getAttribute('data-feature') === activeFeature);
    });
    if (featureTitle) featureTitle.textContent = feature.title;
    if (featureBody) featureBody.textContent = feature.text;
    if (featureStatus) featureStatus.textContent = feature.status;
    renderFeatureActions(feature);
    if (githubPrForm) githubPrForm.hidden = activeFeature !== 'github';
    if (activeFeature !== 'github') resetPrConfirm();
    if (missionPatchForm) missionPatchForm.hidden = activeFeature !== 'missions';
    if (agentApplyForm) agentApplyForm.hidden = activeFeature !== 'missions';
    if (dryRunForm) dryRunForm.hidden = activeFeature !== 'missions';
    if (missionHistory) {
      missionHistory.hidden = activeFeature !== 'missions';
      if (activeFeature === 'missions') loadMissionHistory();
    }
    if (applyFixForm) {
      applyFixForm.hidden = activeFeature !== 'tools';
      if (activeFeature !== 'tools') resetApplyFixConfirm();
    }
    if (settingsPanel) {
      settingsPanel.hidden = activeFeature !== 'settings';
      if (activeFeature === 'settings') loadSettingsList();
    }
    if (vaultRollback) {
      vaultRollback.hidden = activeFeature !== 'vault';
      if (activeFeature === 'vault') { if (vaultStatus) vaultStatus.textContent = ''; loadVaultSnapshots(); }
    }
    if (activeFeature === 'missions') {
      refreshAgentApplyStatus();
    } else {
      resetAgentApplyConfirm();
      resetDryRunConfirm();
    }
    var chatStage = document.querySelector('.vc-chat-stage');
    var sfSection = document.getElementById('factory');
    if (activeFeature === 'factory') {
      if (chatStage) chatStage.style.display = 'none';
      if (sfSection) sfSection.hidden = false;
    } else {
      if (chatStage) chatStage.style.display = '';
      if (sfSection) sfSection.hidden = true;
    }
    if (window.highlightAtomicAgents) window.highlightAtomicAgents(feature.agents || []);
    if (announce) appendMessage('pending', feature.title.toUpperCase(), feature.text);
  }

  // GitHub PR — ação real e irreversível (cria branch+commit+PR de verdade
  // via /api/github/create-pr). NUNCA dispara sozinha: exige os 3 campos
  // obrigatórios preenchidos + uma confirmação extra (segundo clique) antes
  // do fetch real. Guard contra duplo-clique via prRequestInFlight.
  var prConfirmPending = false;
  var prRequestInFlight = false;

  function prFieldsValid() {
    return !!(prRepoInput && prBranchInput && prTitleInput &&
      prRepoInput.value.trim() && prBranchInput.value.trim() && prTitleInput.value.trim());
  }

  function resetPrConfirm() {
    prConfirmPending = false;
    if (!prRequestInFlight) renderPrActions();
  }

  function renderPrActions() {
    if (!prActionsEl) return;
    prActionsEl.textContent = '';

    if (prRequestInFlight) {
      var busyBtn = document.createElement('button');
      busyBtn.type = 'button';
      busyBtn.disabled = true;
      busyBtn.textContent = 'Criando PR...';
      prActionsEl.appendChild(busyBtn);
      return;
    }

    if (prConfirmPending) {
      var confirmBtn = document.createElement('button');
      confirmBtn.type = 'button';
      confirmBtn.textContent = 'Confirmar criação de PR em ' + prRepoInput.value.trim();
      confirmBtn.addEventListener('click', submitGithubPr);
      var cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.textContent = 'Cancelar';
      cancelBtn.addEventListener('click', function () {
        prConfirmPending = false;
        renderPrActions();
      });
      prActionsEl.appendChild(confirmBtn);
      prActionsEl.appendChild(cancelBtn);
      return;
    }

    var createBtn = document.createElement('button');
    createBtn.type = 'button';
    createBtn.textContent = 'Criar PR';
    createBtn.disabled = !prFieldsValid();
    createBtn.addEventListener('click', function () {
      prConfirmPending = true;
      renderPrActions();
    });
    prActionsEl.appendChild(createBtn);
  }

  function submitGithubPr() {
    if (prRequestInFlight) return;
    prRequestInFlight = true;
    prConfirmPending = false;
    renderPrActions();
    if (prStatusEl) prStatusEl.textContent = '';

    var repo = prRepoInput.value.trim();
    var baseBranch = prBranchInput.value.trim() || 'main';
    var title = prTitleInput.value.trim();
    var prBody = prBodyInput ? prBodyInput.value.trim() : '';
    var headBranch = 'vc-next-pr-' + Date.now();

    if (window.setAtomicCoreState) window.setAtomicCoreState('action');
    if (window.highlightAtomicAgents) window.highlightAtomicAgents(['github']);

    apiRequest('/api/github/create-pr', {
      method: 'POST',
      body: { repo: repo, base_branch: baseBranch, head_branch: headBranch, title: title, body: prBody, files: [] }
    }).then(function (data) {
      prRequestInFlight = false;
      renderPrActions();
      var prUrl = data && (data.pr_url || data.url || (data.pr && data.pr.html_url));
      if (prStatusEl) {
        prStatusEl.textContent = '';
        if (prUrl) {
          prStatusEl.appendChild(document.createTextNode('PR criado: '));
          var link = document.createElement('a');
          link.href = prUrl;
          link.textContent = prUrl;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          prStatusEl.appendChild(link);
        } else {
          prStatusEl.textContent = 'PR criado, mas a resposta não trouxe um link (' + summarizeResult(data) + ').';
        }
      }
      if (prRepoInput) prRepoInput.value = '';
      if (prBranchInput) prBranchInput.value = 'main';
      if (prTitleInput) prTitleInput.value = '';
      if (prBodyInput) prBodyInput.value = '';
      renderPrActions();
    }).catch(function (err) {
      prRequestInFlight = false;
      renderPrActions();
      if (prStatusEl) prStatusEl.textContent = 'Erro ao criar PR: ' + (err && err.message ? err.message : String(err));
    }).then(function () {
      if (window.resetAtomicCore) window.resetAtomicCore();
    });
  }

  [prRepoInput, prBranchInput, prTitleInput].forEach(function (el) {
    if (!el) return;
    el.addEventListener('input', function () {
      if (!prRequestInFlight && !prConfirmPending) renderPrActions();
    });
  });

  renderPrActions();

  // Apply Fix — /api/security/apply-fix com confirmação dupla
  var applyFixConfirmPending = false;
  var applyFixRequestInFlight = false;

  function applyFixFieldsValid() {
    return !!(applyFixFile && applyFixLine && applyFixContent &&
      applyFixFile.value.trim() && applyFixLine.value.trim() && applyFixContent.value.trim());
  }

  function applyFixConfirmReady() {
    return applyFixConfirm && applyFixConfirm.value.trim() === 'APLICAR FIX';
  }

  function resetApplyFixConfirm() {
    applyFixConfirmPending = false;
    if (!applyFixRequestInFlight) renderApplyFixActions();
  }

  function renderApplyFixActions() {
    if (!applyFixActionsEl) return;
    applyFixActionsEl.textContent = '';

    if (applyFixRequestInFlight) {
      var busyBtn = document.createElement('button');
      busyBtn.type = 'button';
      busyBtn.disabled = true;
      busyBtn.textContent = 'Aplicando fix...';
      applyFixActionsEl.appendChild(busyBtn);
      return;
    }

    if (applyFixConfirmPending) {
      var confirmBtn = document.createElement('button');
      confirmBtn.type = 'button';
      confirmBtn.disabled = !applyFixConfirmReady();
      confirmBtn.textContent = applyFixConfirmReady() ? 'APLICAR FIX em ' + applyFixFile.value.trim() : 'Digite: APLICAR FIX';
      confirmBtn.addEventListener('click', submitApplyFix);
      var cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.textContent = 'Cancelar';
      cancelBtn.addEventListener('click', function () {
        applyFixConfirmPending = false;
        if (applyFixStatus) applyFixStatus.textContent = '';
        renderApplyFixActions();
      });
      applyFixActionsEl.appendChild(confirmBtn);
      applyFixActionsEl.appendChild(cancelBtn);
      return;
    }

    var prepareBtn = document.createElement('button');
    prepareBtn.type = 'button';
    prepareBtn.textContent = 'Preparar Apply Fix';
    prepareBtn.disabled = !applyFixFieldsValid();
    prepareBtn.addEventListener('click', function () {
      applyFixConfirmPending = true;
      if (applyFixStatus) applyFixStatus.textContent = 'Confirme no próximo botão. O arquivo será alterado e um backup criado.';
      renderApplyFixActions();
    });
    applyFixActionsEl.appendChild(prepareBtn);
  }

  function submitApplyFix() {
    if (applyFixRequestInFlight) return;
    if (!applyFixFieldsValid() || !applyFixConfirmReady()) {
      if (applyFixStatus) applyFixStatus.textContent = 'Campos inválidos ou confirmação não digitada.';
      renderApplyFixActions();
      return;
    }
    applyFixRequestInFlight = true;
    applyFixConfirmPending = false;
    renderApplyFixActions();
    if (applyFixStatus) applyFixStatus.textContent = '';
    if (applyFixPreview) applyFixPreview.hidden = true;

    if (window.setAtomicCoreState) window.setAtomicCoreState('action');
    if (window.highlightAtomicAgents) window.highlightAtomicAgents(['patchEngine']);

    apiRequest('/api/security/apply-fix', {
      method: 'POST',
      body: {
        violation: { file: applyFixFile.value.trim(), line: Number(applyFixLine.value.trim()), rule_id: applyFixRuleId ? applyFixRuleId.value.trim() : '' },
        fix: { after: applyFixContent.value }
      }
    }).then(function (data) {
      applyFixRequestInFlight = false;
      renderApplyFixActions();
      if (applyFixStatus) applyFixStatus.textContent = 'Fix aplicado em ' + data.file + ':' + data.line + ' (backup: ' + data.backup_created + ')';
      if (applyFixPreview && data.diff_preview) {
        applyFixPreview.hidden = false;
        if (applyFixDiffBefore) applyFixDiffBefore.textContent = '- ' + data.diff_preview.before;
        if (applyFixDiffAfter) applyFixDiffAfter.textContent = '+ ' + data.diff_preview.after;
      }
      if (applyFixFile) applyFixFile.value = '';
      if (applyFixLine) applyFixLine.value = '';
      if (applyFixRuleId) applyFixRuleId.value = '';
      if (applyFixContent) applyFixContent.value = '';
      if (applyFixConfirm) applyFixConfirm.value = '';
    }).catch(function (err) {
      applyFixRequestInFlight = false;
      renderApplyFixActions();
      if (applyFixStatus) applyFixStatus.textContent = 'Erro ao aplicar fix: ' + (err && err.message ? err.message : String(err));
    }).then(function () {
      if (window.resetAtomicCore) window.resetAtomicCore();
    });
  }

  [applyFixFile, applyFixLine, applyFixRuleId, applyFixContent, applyFixConfirm].forEach(function (el) {
    if (!el) return;
    el.addEventListener('input', function () {
      if (!applyFixRequestInFlight && !applyFixConfirmPending) renderApplyFixActions();
      if (applyFixConfirmPending) renderApplyFixActions();
    });
  });
  renderApplyFixActions();

  var CHIP_PREFIX = {
    missions: 'Missão: ',
    factory: 'Factory: ',
    github: 'GitHub: ',
    vault: 'Vault: ',
    settings: 'IA: '
  };

  document.querySelectorAll('[data-feature]').forEach(function (node) {
    node.addEventListener('click', function (event) {
      event.preventDefault();
      var key = node.getAttribute('data-feature');
      var inComposer = !!node.closest('.vc-composer-actions');
      selectFeature(key, false);
      if (inComposer && prompt && CHIP_PREFIX[key]) {
        if (prompt.value.indexOf(CHIP_PREFIX[key]) !== 0) {
          prompt.value = CHIP_PREFIX[key] + prompt.value;
        }
        resizePrompt();
        prompt.focus();
        var len = prompt.value.length;
        prompt.setSelectionRange(len, len);
      }
    });
  });

  if (featureRun) {
    featureRun.addEventListener('click', function () {
      var feature = featureMap[activeFeature] || featureMap.chat;
      var firstAction = feature.actions && feature.actions[0];
      if (firstAction) runFeatureAction(firstAction, feature);
    });
  }

  if (prompt) {
    prompt.addEventListener('input', resizePrompt);
    prompt.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        if (composer) composer.requestSubmit();
      }
    });
    resizePrompt();
  }

  var API_BASE_URL = 'https://visioncore-api-gateway.weiganlight.workers.dev';
  var CHAT_BACKEND_URL = API_BASE_URL;
  var CHAT_TIMEOUT_MS = 45000;

  function getChatAuthToken() {
    try { return sessionStorage.getItem('vc_token') || localStorage.getItem('vision_token'); } catch (_) { return null; }
  }

  function apiRequest(path, options) {
    var opts = options || {};
    var headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    var token = getChatAuthToken();
    if (token) headers.Authorization = 'Bearer ' + token;
    return fetch(API_BASE_URL + path, {
      method: opts.method || 'GET',
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal
    }).then(function (r) {
      return r.text().then(function (text) {
        var data = null;
        try { data = text ? JSON.parse(text) : {}; } catch (_) { data = { raw: text }; }
        if (!r.ok) throw new Error((data && (data.error || data.message)) || ('HTTP ' + r.status));
        return data;
      });
    });
  }

  function summarizeResult(data) {
    var text = JSON.stringify(data, null, 2);
    return text.length > 900 ? text.slice(0, 900) + '\n...' : text;
  }

  // parseHermesBlock — extrai JSON estruturado de resposta textual da LLM.
  // Tolerante: hermesObj null nunca quebra a UI. Retorna {hermesObj, cleanText}.
  function parseHermesBlock(text) {
    if (!text) return { hermesObj: null, cleanText: '' };
    var result = { hermesObj: null, cleanText: String(text) };
    var fenceMatch = result.cleanText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    var braceMatch = result.cleanText.match(/\{[\s\S]*?\}/);
    var jsonStr = fenceMatch ? fenceMatch[1] : (braceMatch ? braceMatch[0] : null);
    if (jsonStr) {
      try {
        result.hermesObj = JSON.parse(jsonStr);
      } catch (_) {}
    }
    return result;
  }

  // Quota/plano (item 16 da Etapa 1a) - badge informativo na sidebar,
  // GET /api/mission/quota, sem auth obrigatória (funciona anônimo tb).
  var quotaBadge = document.getElementById('vcQuotaBadge');
  var hermesHint = document.getElementById('vcHermesHint');
  var hintDiagnosis = document.getElementById('vcHintDiagnosis');
  var hintActions = document.getElementById('vcHintActions');
  function loadQuotaBadge() {
    if (!quotaBadge) return;
    apiRequest('/api/mission/quota').then(function (data) {
      if (!data) return;
      if (data.unlimited) {
        quotaBadge.textContent = (data.plan || 'PRO').toUpperCase() + ' · missões ilimitadas';
      } else if (typeof data.remaining === 'number') {
        quotaBadge.textContent = (data.plan || 'FREE').toUpperCase() + ' · ' + data.remaining + ' missões restantes';
      }
    }).catch(function () { /* mantém texto padrão - badge informativo, falha nao é crítica */ });
  }
  loadQuotaBadge();

  // Agent connection badge — polling /api/agent/status a cada 10s,
  // pausa quando a aba perde foco (document.visibilitychange),
  // respeita reduced-motion (sem animação contínua).
  var agentBadgeEl = document.getElementById('vcAgentBadge');
  var agentPollTimer = null;

  function updateAgentBadge(state, text) {
    if (!agentBadgeEl) return;
    agentBadgeEl.setAttribute('data-state', state);
    agentBadgeEl.textContent = text || '';
  }

  function pollAgentStatus() {
    apiRequest('/api/agent/status').then(function (data) {
      if (data && data.connected) {
        updateAgentBadge('connected', 'Agente conectado');
      } else {
        updateAgentBadge('disconnected', 'Agente desconectado');
      }
    }).catch(function () {
      updateAgentBadge('error', 'Erro de rede');
    });
  }

  function startAgentPolling() {
    stopAgentPolling();
    pollAgentStatus();
    agentPollTimer = window.setInterval(pollAgentStatus, 10000);
  }

  function stopAgentPolling() {
    if (agentPollTimer) { window.clearInterval(agentPollTimer); agentPollTimer = null; }
  }

  if (document.addEventListener) {
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { stopAgentPolling(); }
      else { startAgentPolling(); }
    });
  }
  startAgentPolling();

  // Executar Missão — Caminho A (item 4 da paridade, Etapa 1d Fase 1).
  // Pipeline real de 2 chamadas, igual ao legado: (1) POST /api/chat
  // mode:'fix' com o arquivo colado como contexto (o gate anti-alucinação
  // do backend BLOQUEIA mode:fix sem contexto real de arquivo — por isso
  // não dá pra gerar patch só a partir de uma descrição livre) extrai um
  // diagnóstico {file, patch, fix_type, diagnosis} da resposta da LLM;
  // (2) POST /api/chat/apply-patch aplica esse diagnóstico EM MEMÓRIA no
  // servidor e devolve o diff/patch pronto pra download — nunca escreve
  // nada em disco sozinho, nunca aplica automaticamente a nada real.
  var MISSION_TIMEOUT_MS = 60000;
  var missionRequestInFlight = false;
  var missionLastPatchText = '';
  var missionLastFileName = 'patch.patch';

  function missionFieldsValid() {
    return !!(missionFilePathInput && missionFileContentInput && missionDescInput &&
      missionFilePathInput.value.trim() && missionFileContentInput.value.trim() && missionDescInput.value.trim());
  }

  function updateMissionButton() {
    if (missionGenerateBtn) missionGenerateBtn.disabled = missionRequestInFlight || !missionFieldsValid();
  }

  [missionFilePathInput, missionFileContentInput, missionDescInput].forEach(function (el) {
    if (el) el.addEventListener('input', updateMissionButton);
  });

  function extractHermesDiagnosis(answerText) {
    if (!answerText) return null;
    var text = String(answerText);
    var fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    var candidates = fenceMatch ? [fenceMatch[1], text] : [text];
    var braceMatch = text.match(/\{[\s\S]*\}/);
    if (braceMatch) candidates.push(braceMatch[0]);
    for (var i = 0; i < candidates.length; i++) {
      try {
        var obj = JSON.parse(candidates[i].trim());
        if (obj && (obj.patch || obj.fix_type || obj.diagnosis)) return obj;
      } catch (_) { /* tenta o próximo candidato */ }
    }
    return null;
  }

  function downloadTextFile(filename, text) {
    var blob = new Blob([text], { type: 'text/plain' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function resetMissionPatchOutput() {
    if (missionPatchOutput) missionPatchOutput.textContent = '';
    if (missionPatchOutputWrap) missionPatchOutputWrap.hidden = true;
    if (missionDownloadBtn) missionDownloadBtn.hidden = true;
    missionLastPatchText = '';
  }

  function generateMissionPatch() {
    if (missionRequestInFlight || !missionFieldsValid()) return;
    missionRequestInFlight = true;
    updateMissionButton();
    resetMissionPatchOutput();
    if (missionStatusEl) missionStatusEl.textContent = 'Gerando patch...';

    if (window.setAtomicCoreState) window.setAtomicCoreState('action');
    if (window.startAtomicSequence) window.startAtomicSequence();

    var filePath = missionFilePathInput.value.trim();
    var fileContent = missionFileContentInput.value;
    var description = missionDescInput.value.trim();
    var chatMessage = '[Arquivo: ' + filePath + ']\n' + fileContent + '\n\n---\n\n' + description;

    var controller = null;
    try { controller = new AbortController(); } catch (_) {}
    var timeoutId = controller ? window.setTimeout(function () { controller.abort(); }, MISSION_TIMEOUT_MS) : null;

    function finishMission() {
      missionRequestInFlight = false;
      updateMissionButton();
      if (window.resetAtomicCore) window.resetAtomicCore();
    }

    var token = getChatAuthToken();
    var chatHeaders = { 'Content-Type': 'application/json' };
    if (token) chatHeaders.Authorization = 'Bearer ' + token;

    fetch(CHAT_BACKEND_URL + '/api/chat', {
      method: 'POST',
      headers: chatHeaders,
      body: JSON.stringify({ message: chatMessage, mode: 'fix', model: 'auto', display_input: description }),
      signal: controller ? controller.signal : undefined
    }).then(function (r) {
      return r.text().then(function (text) {
        var data = null;
        try { data = text ? JSON.parse(text) : {}; } catch (_) { data = null; }
        if (!r.ok) throw new Error((data && (data.error || data.message)) || ('HTTP ' + r.status));
        return data;
      });
    }).then(function (data) {
      var diag = data && extractHermesDiagnosis(data.answer);
      if (!diag || !diag.patch) {
        var reason = (diag && (diag.decisao || diag.motivo)) || (data && data.answer ? String(data.answer).slice(0, 160) : 'resposta sem patch aplicável');
        throw new Error('Diagnóstico não retornou um patch aplicável: ' + reason);
      }
      return apiRequest('/api/chat/apply-patch', {
        method: 'POST',
        signal: controller ? controller.signal : undefined,
        body: {
          file_content: fileContent,
          file_path: filePath,
          fix_type: diag.fix_type || 'code_patch',
          patch: diag.patch,
          diagnosis: diag.diagnosis || description
        }
      });
    }).then(function (result) {
      if (timeoutId) window.clearTimeout(timeoutId);
      var patchText = (result && (result.diff_preview || result.patch || result.patched_content)) || summarizeResult(result);
      if (missionStatusEl) missionStatusEl.textContent = 'Patch gerado — revise antes de aplicar manualmente.';
      if (missionPatchOutput) missionPatchOutput.textContent = patchText;
      if (missionPatchOutputWrap) missionPatchOutputWrap.hidden = false;
      missionLastPatchText = patchText;
      missionLastFileName = (filePath.split('/').pop() || 'patch') + '.patch';
      if (missionDownloadBtn) missionDownloadBtn.hidden = false;
      finishMission();
    }).catch(function (err) {
      if (timeoutId) window.clearTimeout(timeoutId);
      var isAbort = err && err.name === 'AbortError';
      if (missionStatusEl) missionStatusEl.textContent = isAbort
        ? 'Tempo esgotado ao gerar o patch (60s). Tente novamente.'
        : ('Erro: ' + (err && err.message ? err.message : String(err)));
      finishMission();
    });
  }

  if (missionGenerateBtn) missionGenerateBtn.addEventListener('click', generateMissionPatch);
  if (missionDownloadBtn) missionDownloadBtn.addEventListener('click', function () {
    if (missionLastPatchText) downloadTextFile(missionLastFileName, missionLastPatchText);
  });
  updateMissionButton();

  // Executar Missão — Caminho B / Fase 2a (item 4, dry-run real). POST
  // Executar Missão — Caminho B, Fase 2b. Esta é a primeira ponte de UI para
  // apply_patch/apply_patch_multi reais via Vision Agent Local. Diferente do
  // dry-run, isto escreve no disco do ROOT em que o agente foi iniciado e cria
  // commit local. Guardas: JSON explícito, allowlist de type, validação mínima,
  // frase exata e segundo clique antes do POST real.
  var AGENT_APPLY_CONFIRM_TEXT = 'APLICAR PATCH REAL';
  // ponytail: gate fica false até existir um segredo de pareamento real entre
  // usuário logado e Vision Agent Local — agent_id sozinho não autentica nada
  // (é hash não-secreto de hostname+path, e /api/agent/mission/queue não tem
  // auth), então habilitar isso hoje permite escrita real em disco de terceiro
  // por qualquer chamador que adivinhe o agent_id. Ligar quando o backend
  // exigir um token de pareamento por agente/projeto/owner.
  var AGENT_APPLY_ENABLED = false;
  var agentApplyConfirmPending = false;
  var agentApplyRequestInFlight = false;
  var agentApplyPolling = false;
  var agentApplyPollTimer = null;
  var agentApplyTimeoutTimer = null;
  var agentApplyStartedAt = 0;

  function parseAgentApplyPayload() {
    if (!agentApplyPayloadInput) return { ok: false, error: 'payload ausente' };
    var raw = agentApplyPayloadInput.value.trim();
    if (!raw) return { ok: false, error: 'payload vazio' };
    try {
      var payload = JSON.parse(raw);
      if (!payload || (payload.type !== 'apply_patch' && payload.type !== 'apply_patch_multi')) {
        return { ok: false, error: 'type deve ser apply_patch ou apply_patch_multi' };
      }
      if (payload.type === 'apply_patch' && (!payload.file || !payload.patch)) {
        return { ok: false, error: 'apply_patch exige file e patch' };
      }
      if (payload.type === 'apply_patch_multi') {
        if (!Array.isArray(payload.files) || !payload.files.length) return { ok: false, error: 'apply_patch_multi exige files[]' };
        for (var i = 0; i < payload.files.length; i++) {
          if (!payload.files[i].file || !payload.files[i].patch) return { ok: false, error: 'cada item de files[] exige file e patch' };
        }
      }
      return { ok: true, payload: payload };
    } catch (err) {
      return { ok: false, error: 'JSON inválido: ' + (err && err.message ? err.message : err) };
    }
  }

  function getAgentApplyAgentId() {
    return agentApplyAgentIdInput ? agentApplyAgentIdInput.value.trim() : '';
  }

  function getAgentApplyAgentSecret() {
    return agentApplyAgentSecretInput ? agentApplyAgentSecretInput.value.trim() : '';
  }

  function agentApplyReady() {
    if (!AGENT_APPLY_ENABLED || !getAgentApplyAgentId() || !getAgentApplyAgentSecret()) return false;
    var parsed = parseAgentApplyPayload();
    var confirmed = agentApplyConfirmInput && agentApplyConfirmInput.value.trim() === AGENT_APPLY_CONFIRM_TEXT;
    return parsed.ok && confirmed;
  }

  function resetAgentApplyConfirm() {
    agentApplyConfirmPending = false;
    if (!agentApplyRequestInFlight && !agentApplyPolling) renderAgentApplyActions();
  }

  function renderAgentApplyActions() {
    if (!agentApplyActionsEl) return;
    agentApplyActionsEl.textContent = '';

    if (agentApplyPolling) {
      var cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.textContent = 'Parar acompanhamento';
      cancelBtn.addEventListener('click', function () { stopAgentApplyPolling('cancel'); });
      agentApplyActionsEl.appendChild(cancelBtn);
      return;
    }

    if (agentApplyRequestInFlight) {
      var busyBtn = document.createElement('button');
      busyBtn.type = 'button';
      busyBtn.disabled = true;
      busyBtn.textContent = 'Enfileirando patch real...';
      agentApplyActionsEl.appendChild(busyBtn);
      return;
    }

    if (agentApplyConfirmPending) {
      var confirmBtn = document.createElement('button');
      confirmBtn.type = 'button';
      confirmBtn.textContent = 'Confirmar e enfileirar patch real';
      confirmBtn.addEventListener('click', submitAgentApply);
      var backBtn = document.createElement('button');
      backBtn.type = 'button';
      backBtn.textContent = 'Cancelar';
      backBtn.addEventListener('click', function () {
        agentApplyConfirmPending = false;
        renderAgentApplyActions();
      });
      agentApplyActionsEl.appendChild(confirmBtn);
      agentApplyActionsEl.appendChild(backBtn);
      return;
    }

    var parsed = parseAgentApplyPayload();
    if (agentApplyStatusEl && !getAgentApplyAgentId()) {
      agentApplyStatusEl.textContent = 'Informe o agent_id do Vision Agent conectado. A fila de escrita real é filtrada por este vínculo.';
    } else if (agentApplyStatusEl && !getAgentApplyAgentSecret()) {
      agentApplyStatusEl.textContent = 'Informe o agent_secret exibido pelo agente ao rodar /api/agent/register — agent_id sozinho não autentica ninguém.';
    }
    var prepareBtn = document.createElement('button');
    prepareBtn.type = 'button';
    prepareBtn.textContent = AGENT_APPLY_ENABLED ? 'Preparar aplicação real' : 'Aplicação real bloqueada';
    prepareBtn.disabled = !agentApplyReady();
    prepareBtn.addEventListener('click', function () {
      agentApplyConfirmPending = true;
      if (agentApplyStatusEl) agentApplyStatusEl.textContent = 'Última barreira: confirme no próximo botão. O Vision Agent Local vai escrever e commitar no projeto dele.';
      renderAgentApplyActions();
    });
    agentApplyActionsEl.appendChild(prepareBtn);

    if (agentApplyStatusEl && agentApplyPayloadInput && agentApplyPayloadInput.value.trim() && !parsed.ok) {
      agentApplyStatusEl.textContent = parsed.error;
    }
  }

  function updateAgentApplyElapsedStatus(prefix) {
    if (!agentApplyStatusEl) return;
    var elapsedSec = Math.round((Date.now() - agentApplyStartedAt) / 1000);
    agentApplyStatusEl.textContent = (prefix || 'Aguardando resultado do Vision Agent Local...') + ' (' + elapsedSec + 's decorridos)';
  }

  function pollAgentApplyOnce(missionId) {
    if (!agentApplyPolling) return;
    apiRequest('/api/agent/mission/result/' + missionId).then(function (data) {
      if (!agentApplyPolling) return;
      stopAgentApplyPolling('success', data);
    }).catch(function (err) {
      if (!agentApplyPolling) return;
      var msg = err && err.message ? err.message : String(err);
      if (msg === 'result_not_found') {
        updateAgentApplyElapsedStatus();
        return;
      }
      stopAgentApplyPolling('error', msg);
    });
  }

  function startAgentApplyPolling(missionId) {
    agentApplyPolling = true;
    agentApplyStartedAt = Date.now();
    renderAgentApplyActions();
    updateAgentApplyElapsedStatus();
    pollAgentApplyOnce(missionId);
    agentApplyPollTimer = window.setInterval(function () { pollAgentApplyOnce(missionId); }, DRY_RUN_POLL_MS);
    agentApplyTimeoutTimer = window.setTimeout(function () { stopAgentApplyPolling('timeout'); }, DRY_RUN_TIMEOUT_MS);
  }

  function stopAgentApplyPolling(reason, payload) {
    if (agentApplyPollTimer) { window.clearInterval(agentApplyPollTimer); agentApplyPollTimer = null; }
    if (agentApplyTimeoutTimer) { window.clearTimeout(agentApplyTimeoutTimer); agentApplyTimeoutTimer = null; }
    var wasPolling = agentApplyPolling;
    agentApplyPolling = false;
    renderAgentApplyActions();
    if (!wasPolling) return;
    if (window.resetAtomicCore) window.resetAtomicCore();
    if (!agentApplyStatusEl) return;
    if (reason === 'success') {
      agentApplyStatusEl.textContent = 'Patch real concluído: ' + summarizeResult(payload);
    } else if (reason === 'timeout') {
      agentApplyStatusEl.textContent = 'Tempo esgotado (5min). O job pode continuar rodando no agente; a UI parou de acompanhar.';
    } else if (reason === 'cancel') {
      agentApplyStatusEl.textContent = 'Acompanhamento cancelado. O job pode continuar rodando no agente; não há cancelamento remoto.';
    } else {
      agentApplyStatusEl.textContent = 'Erro na aplicação real: ' + (payload || 'falha desconhecida');
    }
  }

  function submitAgentApply() {
    if (agentApplyRequestInFlight) return;
    var parsed = parseAgentApplyPayload();
    if (!parsed.ok || !agentApplyReady()) {
      if (agentApplyStatusEl) agentApplyStatusEl.textContent = parsed.error || 'Confirmação inválida.';
      renderAgentApplyActions();
      return;
    }
    agentApplyRequestInFlight = true;
    agentApplyConfirmPending = false;
    renderAgentApplyActions();
    if (agentApplyStatusEl) agentApplyStatusEl.textContent = 'Enfileirando patch real...';

    if (window.setAtomicCoreState) window.setAtomicCoreState('action');
    if (window.startAtomicSequence) window.startAtomicSequence();

    apiRequest('/api/agent/mission/queue', {
      method: 'POST',
      body: Object.assign({}, parsed.payload, { agent_id: getAgentApplyAgentId(), agent_secret: getAgentApplyAgentSecret() })
    }).then(function (data) {
      agentApplyRequestInFlight = false;
      var missionId = data && data.mission_id;
      if (!missionId) throw new Error('Resposta sem mission_id.');
      startAgentApplyPolling(missionId);
    }).catch(function (err) {
      agentApplyRequestInFlight = false;
      if (agentApplyStatusEl) agentApplyStatusEl.textContent = 'Erro ao enfileirar patch real: ' + (err && err.message ? err.message : String(err));
      renderAgentApplyActions();
      if (window.resetAtomicCore) window.resetAtomicCore();
    });
  }

  function refreshAgentApplyStatus() {
    if (!agentApplyAgentIdInput) return;
    apiRequest('/api/agent/status').then(function (data) {
      if (data && data.connected && data.agent_id && !agentApplyAgentIdInput.value.trim()) {
        agentApplyAgentIdInput.value = data.agent_id;
        if (agentApplyStatusEl) agentApplyStatusEl.textContent = 'Agent conectado vinculado: ' + data.agent_id;
        renderAgentApplyActions();
      }
    }).catch(function () {});
  }

  [agentApplyAgentIdInput, agentApplyAgentSecretInput, agentApplyPayloadInput, agentApplyConfirmInput].forEach(function (el) {
    if (!el) return;
    el.addEventListener('input', function () {
      if (!agentApplyRequestInFlight && !agentApplyConfirmPending && !agentApplyPolling) renderAgentApplyActions();
    });
  });
  renderAgentApplyActions();
  // /api/agent/mission/queue {type:'sf_dry_run_real', target_path} enfileira
  // um job real pro Vision Agent Local (processo externo) — o backend só
  // relay/valida, quem lê o target_path e roda a simulação em memória (nunca
  // escreve no disco, confirmado no server.js) é o Agent local, fora do
  // controle desta UI. Por isso exige confirmação dupla igual ao PR do
  // GitHub. Resultado chega via GET /api/agent/mission/result/:id — 404
  // com error 'result_not_found' significa "ainda sem resultado" (não é
  // erro), qualquer outro erro é falha real. Polling ~2s, teto de 5min;
  // "Cancelar acompanhamento" só para esta UI de perguntar — o job pode
  // continuar rodando no servidor (nao ha endpoint de cancelamento remoto).
  var DRY_RUN_POLL_MS = 2000;
  var DRY_RUN_TIMEOUT_MS = 5 * 60 * 1000;
  var dryRunConfirmPending = false;
  var dryRunRequestInFlight = false;
  var dryRunPolling = false;
  var dryRunPollTimer = null;
  var dryRunTimeoutTimer = null;
  var dryRunStartedAt = 0;

  function dryRunFieldValid() {
    return !!(dryRunTargetInput && dryRunTargetInput.value.trim());
  }

  function resetDryRunConfirm() {
    dryRunConfirmPending = false;
    if (!dryRunRequestInFlight && !dryRunPolling) renderDryRunActions();
  }

  function renderDryRunActions() {
    if (!dryRunActionsEl) return;
    dryRunActionsEl.textContent = '';

    if (dryRunPolling) {
      var cancelWatchBtn = document.createElement('button');
      cancelWatchBtn.type = 'button';
      cancelWatchBtn.textContent = 'Cancelar acompanhamento';
      cancelWatchBtn.addEventListener('click', function () { stopDryRunPolling('cancel'); });
      dryRunActionsEl.appendChild(cancelWatchBtn);
      return;
    }

    if (dryRunRequestInFlight) {
      var busyBtn = document.createElement('button');
      busyBtn.type = 'button';
      busyBtn.disabled = true;
      busyBtn.textContent = 'Enfileirando...';
      dryRunActionsEl.appendChild(busyBtn);
      return;
    }

    if (dryRunConfirmPending) {
      var confirmBtn = document.createElement('button');
      confirmBtn.type = 'button';
      confirmBtn.textContent = 'Confirmar dry-run em ' + dryRunTargetInput.value.trim();
      confirmBtn.addEventListener('click', submitDryRun);
      var cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.textContent = 'Cancelar';
      cancelBtn.addEventListener('click', function () {
        dryRunConfirmPending = false;
        renderDryRunActions();
      });
      dryRunActionsEl.appendChild(confirmBtn);
      dryRunActionsEl.appendChild(cancelBtn);
      return;
    }

    var runBtn = document.createElement('button');
    runBtn.type = 'button';
    runBtn.textContent = 'Rodar Dry-Run';
    runBtn.disabled = !dryRunFieldValid();
    runBtn.addEventListener('click', function () {
      dryRunConfirmPending = true;
      renderDryRunActions();
    });
    dryRunActionsEl.appendChild(runBtn);
  }

  function updateDryRunElapsedStatus(prefix) {
    if (!dryRunStatusEl) return;
    var elapsedSec = Math.round((Date.now() - dryRunStartedAt) / 1000);
    dryRunStatusEl.textContent = (prefix || 'Executando dry-run real via Vision Agent Local...') + ' (' + elapsedSec + 's decorridos)';
  }

  function pollDryRunOnce(missionId) {
    if (!dryRunPolling) return;
    apiRequest('/api/agent/mission/result/' + missionId).then(function (data) {
      if (!dryRunPolling) return;
      stopDryRunPolling('success', data);
    }).catch(function (err) {
      if (!dryRunPolling) return;
      var msg = err && err.message ? err.message : String(err);
      if (msg === 'result_not_found') {
        updateDryRunElapsedStatus();
        return;
      }
      stopDryRunPolling('error', msg);
    });
  }

  function startDryRunPolling(missionId) {
    dryRunPolling = true;
    dryRunStartedAt = Date.now();
    renderDryRunActions();
    updateDryRunElapsedStatus();
    pollDryRunOnce(missionId);
    dryRunPollTimer = window.setInterval(function () { pollDryRunOnce(missionId); }, DRY_RUN_POLL_MS);
    dryRunTimeoutTimer = window.setTimeout(function () { stopDryRunPolling('timeout'); }, DRY_RUN_TIMEOUT_MS);
  }

  function stopDryRunPolling(reason, payload) {
    if (dryRunPollTimer) { window.clearInterval(dryRunPollTimer); dryRunPollTimer = null; }
    if (dryRunTimeoutTimer) { window.clearTimeout(dryRunTimeoutTimer); dryRunTimeoutTimer = null; }
    var wasPolling = dryRunPolling;
    dryRunPolling = false;
    renderDryRunActions();
    if (!wasPolling) return;
    if (window.resetAtomicCore) window.resetAtomicCore();
    if (!dryRunStatusEl) return;
    if (reason === 'success') {
      dryRunStatusEl.textContent = 'Dry-run concluído: ' + summarizeResult(payload);
    } else if (reason === 'timeout') {
      dryRunStatusEl.textContent = 'Tempo esgotado (5min) aguardando o Vision Agent Local. O job pode continuar rodando no servidor — esta UI parou de perguntar.';
    } else if (reason === 'cancel') {
      dryRunStatusEl.textContent = 'Acompanhamento cancelado. O job pode continuar rodando no servidor — esta UI não suporta cancelar remotamente.';
    } else {
      dryRunStatusEl.textContent = 'Erro no dry-run: ' + (payload || 'falha desconhecida');
    }
  }

  function submitDryRun() {
    if (dryRunRequestInFlight) return;
    dryRunRequestInFlight = true;
    dryRunConfirmPending = false;
    renderDryRunActions();
    if (dryRunStatusEl) dryRunStatusEl.textContent = 'Enfileirando dry-run...';

    var targetPath = dryRunTargetInput.value.trim();

    if (window.setAtomicCoreState) window.setAtomicCoreState('action');
    if (window.startAtomicSequence) window.startAtomicSequence();

    apiRequest('/api/agent/mission/queue', {
      method: 'POST',
      body: { type: 'sf_dry_run_real', target_path: targetPath }
    }).then(function (data) {
      dryRunRequestInFlight = false;
      var missionId = data && data.mission_id;
      if (!missionId) throw new Error('Resposta sem mission_id.');
      startDryRunPolling(missionId);
    }).catch(function (err) {
      dryRunRequestInFlight = false;
      if (dryRunStatusEl) dryRunStatusEl.textContent = 'Erro ao enfileirar: ' + (err && err.message ? err.message : String(err));
      renderDryRunActions();
      if (window.resetAtomicCore) window.resetAtomicCore();
    });
  }

  if (dryRunTargetInput) {
    dryRunTargetInput.addEventListener('input', function () {
      if (!dryRunRequestInFlight && !dryRunConfirmPending && !dryRunPolling) renderDryRunActions();
    });
  }
  renderDryRunActions();

  // Settings — AI Provider Vault (salvar, testar, remover).
  var settingsSelectedProvider = null;

  function loadSettingsList() {
    if (!settingsList) return;
    apiRequest('/api/providers/list').then(function (data) {
      var providers = data && data.providers;
      settingsList.textContent = '';
      if (!providers || !providers.length) {
        settingsList.textContent = 'Nenhum provedor salvo ainda.';
        return;
      }
      providers.forEach(function (p) {
        var item = document.createElement('div');
        item.className = 'vc-settings-item';
        var name = document.createElement('strong');
        name.textContent = p.provider;
        var detail = document.createElement('span');
        detail.textContent = p.api_key_masked ? p.api_key_masked : 'sem chave';
        var badge = document.createElement('span');
        badge.className = 'vc-settings-badge';
        badge.textContent = p.status || 'untested';
        var actRow = document.createElement('div');
        actRow.className = 'vc-settings-item-actions';
        var testBtn = document.createElement('button');
        testBtn.type = 'button';
        testBtn.textContent = 'Testar';
        testBtn.addEventListener('click', function () { testProvider(p.provider, item); });
        var loadBtn = document.createElement('button');
        loadBtn.type = 'button';
        loadBtn.textContent = 'Editar';
        loadBtn.addEventListener('click', function () { loadProviderForm(p.provider); });
        var delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.textContent = 'Excluir';
        delBtn.addEventListener('click', function () { deleteProvider(p.provider); });
        actRow.appendChild(testBtn);
        actRow.appendChild(loadBtn);
        actRow.appendChild(delBtn);
        item.appendChild(name);
        item.appendChild(document.createTextNode(' '));
        item.appendChild(detail);
        item.appendChild(badge);
        item.appendChild(actRow);
        settingsList.appendChild(item);
      });
    }).catch(function () {
      if (settingsList) settingsList.textContent = 'Erro ao carregar lista de provedores.';
    });
  }

  function loadProviderForm(provider) {
    if (settingsProvider) settingsProvider.value = provider;
    if (settingsApiKey) settingsApiKey.value = '';
    if (settingsModel) settingsModel.value = '';
    if (settingsBaseUrl) settingsBaseUrl.value = '';
    settingsSelectedProvider = provider;
    updateSettingsButtons(provider);
    if (settingsStatus) settingsStatus.textContent = 'Editando ' + provider + ' — deixe a chave em branco para manter a existente.';
  }

  function updateSettingsButtons(provider) {
    if (!settingsTestBtn || !settingsDeleteBtn) return;
    settingsTestBtn.hidden = !provider;
    settingsDeleteBtn.hidden = !provider;
  }

  function showSettingsStatus(msg, isError) {
    if (settingsStatus) {
      settingsStatus.textContent = msg;
      settingsStatus.style.color = isError ? '#f87171' : '';
    }
  }

  function saveProvider() {
    var provider = settingsProvider ? settingsProvider.value.trim() : '';
    if (!provider) { showSettingsStatus('Selecione um provider.', true); return; }
    var apiKey = settingsApiKey ? settingsApiKey.value : '';
    var model = settingsModel ? settingsModel.value.trim() : '';
    var baseUrl = settingsBaseUrl ? settingsBaseUrl.value.trim() : '';
    showSettingsStatus('Salvando...', false);
    if (settingsSaveBtn) settingsSaveBtn.disabled = true;
    apiRequest('/api/providers/save', {
      method: 'POST',
      body: { provider: provider, api_key: apiKey, model: model || undefined, base_url: baseUrl || undefined }
    }).then(function (data) {
      showSettingsStatus('Provedor salvo. Chave: ' + (data.api_key_masked || 'mantida'), false);
      if (settingsApiKey) settingsApiKey.value = '';
      settingsSelectedProvider = provider;
      updateSettingsButtons(provider);
      loadSettingsList();
    }).catch(function (err) {
      showSettingsStatus('Erro ao salvar: ' + (err && err.message ? err.message : String(err)), true);
    }).then(function () {
      if (settingsSaveBtn) settingsSaveBtn.disabled = false;
    });
  }

  function testProvider(provider, itemEl) {
    showSettingsStatus('Testando ' + provider + '...', false);
    if (itemEl) {
      var oldBadge = itemEl.querySelector('.vc-settings-badge');
      if (oldBadge) oldBadge.textContent = 'testando...';
    }
    apiRequest('/api/providers/test', {
      method: 'POST',
      body: { provider: provider }
    }).then(function (data) {
      var msg = data.connected ? 'Conectado' : 'Falhou: ' + (data.status || 'desconhecido');
      showSettingsStatus(provider + ': ' + msg, !data.connected);
      loadSettingsList();
    }).catch(function (err) {
      showSettingsStatus('Erro ao testar: ' + (err && err.message ? err.message : String(err)), true);
      loadSettingsList();
    });
  }

  function deleteProvider(provider) {
    if (!window.confirm('Excluir provider "' + provider + '"?')) return;
    showSettingsStatus('Excluindo...', false);
    apiRequest('/api/providers/delete', {
      method: 'POST',
      body: { provider: provider }
    }).then(function () {
      showSettingsStatus('Provedor excluído.', false);
      if (settingsSelectedProvider === provider) {
        settingsSelectedProvider = null;
        updateSettingsButtons(null);
        if (settingsProvider) settingsProvider.value = 'openrouter';
        if (settingsApiKey) settingsApiKey.value = '';
      }
      loadSettingsList();
    }).catch(function (err) {
      showSettingsStatus('Erro ao excluir: ' + (err && err.message ? err.message : String(err)), true);
    });
  }

  if (settingsSaveBtn) settingsSaveBtn.addEventListener('click', saveProvider);
  if (settingsProvider) {
    settingsProvider.addEventListener('change', function () {
      settingsSelectedProvider = settingsProvider.value;
      updateSettingsButtons(settingsProvider.value);
    });
  }

  // Mission History (B-2) — list + detail from /api/mission/timeline.
  function loadMissionHistory() {
    if (!missionHistoryList) return;
    if (missionDetail) missionDetail.hidden = true;
    if (missionHistoryList) missionHistoryList.hidden = false;
    missionHistoryList.textContent = 'Carregando...';
    apiRequest('/api/mission/timeline?limit=20').then(function (data) {
      var entries = data && data.entries;
      missionHistoryList.textContent = '';
      if (!entries || !entries.length) {
        missionHistoryList.textContent = 'Nenhuma missão registrada ainda.';
        return;
      }
      entries.forEach(function (e, i) {
        var item = document.createElement('div');
        item.className = 'vc-mh-item';
        var label = document.createElement('strong');
        label.textContent = e.title || e.type || 'Missão';
        var meta = document.createElement('span');
        meta.textContent = (e.type || '') + (e.status ? ' [' + e.status + ']' : '');
        item.appendChild(label);
        item.appendChild(meta);
        item.addEventListener('click', function () { showMissionDetail(e); });
        missionHistoryList.appendChild(item);
      });
    }).catch(function () {
      if (missionHistoryList) missionHistoryList.textContent = 'Erro ao carregar missões.';
    });
  }

  function showMissionDetail(entry) {
    if (!missionDetail || !missionHistoryList) return;
    missionHistoryList.hidden = true;
    missionDetail.hidden = false;
    if (missionDetailTitle) missionDetailTitle.textContent = entry.title || entry.type || 'Missão';
    if (missionDetailMeta) missionDetailMeta.textContent = (entry.type || '') + ' · ' + (entry.status || '') + (entry.steps_completed ? ' · ' + entry.steps_completed + ' passos' : '');
    var bodyText = entry.summary || entry.input || entry.description || '';
    if (missionDetailBody) missionDetailBody.textContent = bodyText;
    if (missionEvidenceBody) missionEvidenceBody.textContent = '';
    if (missionDetailEvidence) missionDetailEvidence.hidden = true;
    // Extrai evidence_receipt se presente na entrada
    if (entry.evidence_receipt || entry.evidence) {
      var ev = entry.evidence_receipt || entry.evidence;
      if (missionEvidenceBody) missionEvidenceBody.textContent = typeof ev === 'string' ? ev : JSON.stringify(ev, null, 2);
      if (missionDetailEvidence) missionDetailEvidence.hidden = false;
    }
  }

  if (missionDetailBack) {
    missionDetailBack.addEventListener('click', function () {
      if (missionDetail) missionDetail.hidden = true;
      if (missionHistoryList) missionHistoryList.hidden = false;
    });
  }
  var vaultRollbackPending = null;

  function loadVaultSnapshots() {
    if (!vaultSnapshotList) return;
    apiRequest('/api/vault/snapshots').then(function (data) {
      var snapshots = data && data.snapshots;
      vaultSnapshotList.textContent = '';
      vaultRollbackPending = null;
      renderVaultActions();
      if (!snapshots || !snapshots.length) {
        vaultSnapshotList.textContent = 'Nenhum snapshot disponível.';
        return;
      }
      snapshots.forEach(function (s) {
        var item = document.createElement('div');
        item.className = 'vc-vault-item';
        var label = document.createElement('strong');
        label.textContent = s.label || s.id;
        var meta = document.createElement('span');
        meta.textContent = (s.project || '') + ' · ' + (s.created_at || '');
        var actBtn = document.createElement('button');
        actBtn.type = 'button';
        actBtn.textContent = 'Rollback';
        actBtn.addEventListener('click', function () {
          vaultRollbackPending = s;
          if (vaultStatus) vaultStatus.textContent = 'Rollback para "' + (s.label || s.id) + '" — confirme no botão abaixo.';
          renderVaultActions();
        });
        item.appendChild(label);
        item.appendChild(meta);
        item.appendChild(actBtn);
        vaultSnapshotList.appendChild(item);
      });
    }).catch(function () {
      if (vaultSnapshotList) vaultSnapshotList.textContent = 'Erro ao carregar snapshots.';
    });
  }

  function renderVaultActions() {
    if (!vaultActions) return;
    vaultActions.textContent = '';
    if (!vaultRollbackPending) return;
    var confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.textContent = 'Confirmar rollback para "' + (vaultRollbackPending.label || vaultRollbackPending.id) + '"';
    confirmBtn.addEventListener('click', submitVaultRollback);
    var cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.addEventListener('click', function () {
      vaultRollbackPending = null;
      if (vaultStatus) vaultStatus.textContent = '';
      renderVaultActions();
    });
    vaultActions.appendChild(confirmBtn);
    vaultActions.appendChild(cancelBtn);
  }

  function submitVaultRollback() {
    if (!vaultRollbackPending) return;
    var snapshotId = vaultRollbackPending.id;
    var snapshotLabel = vaultRollbackPending.label || snapshotId;
    if (vaultStatus) vaultStatus.textContent = 'Executando rollback...';
    renderVaultActions();
    if (window.setAtomicCoreState) window.setAtomicCoreState('action');
    apiRequest('/api/vault/rollback/' + encodeURIComponent(snapshotId), { method: 'POST' }).then(function () {
      vaultRollbackPending = null;
      if (vaultStatus) vaultStatus.textContent = 'Rollback concluído: ' + snapshotLabel;
      renderVaultActions();
      loadVaultSnapshots();
    }).catch(function (err) {
      if (vaultStatus) vaultStatus.textContent = 'Erro no rollback: ' + (err && err.message ? err.message : String(err));
      renderVaultActions();
    }).then(function () {
      if (window.resetAtomicCore) window.resetAtomicCore();
    });
  }

  // Anexos/print — mesmo formato do legado: arquivos de texto viram
  // "[Arquivo: nome]\nconteudo" prependado a message; imagem vai como
  // image_base64/image_mime/image_name no body do /api/chat (Gemini vision
  // no backend). Nenhum endpoint novo - reaproveita o /api/chat existente.
  var MAX_ATTACHMENT_CHARS = 12000;
  var MAX_IMAGE_BASE64_CHARS = 5 * 1024 * 1024;
  var pendingAttachments = [];
  var pendingImage = null;

  function readFileAsText(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result)); };
      reader.onerror = function () { reject(reader.error || new Error('read_failed')); };
      reader.readAsText(file);
    });
  }

  function readFileAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result)); };
      reader.onerror = function () { reject(reader.error || new Error('read_failed')); };
      reader.readAsDataURL(file);
    });
  }

  function handleAttachmentFiles(fileList) {
    var files = Array.prototype.slice.call(fileList || []);
    if (!files.length) return;
    selectFeature('attach', false);
    Promise.all(files.map(function (file) {
      return readFileAsText(file).then(function (content) {
        pendingAttachments.push({ name: file.name, content: content.slice(0, MAX_ATTACHMENT_CHARS) });
      }).catch(function () {
        appendMessage('error', 'ANEXOS', 'Falha ao ler ' + file.name + '.');
      });
    })).then(function () {
      if (!pendingAttachments.length) return;
      var names = pendingAttachments.map(function (a) { return a.name; }).join(', ');
      appendMessage('pending', 'ANEXOS', names + ' pronto(s) para enviar com a próxima mensagem.');
    });
  }

  function handleImageFile(file) {
    if (!file) return;
    selectFeature('image', false);
    readFileAsDataUrl(file).then(function (dataUrl) {
      var comma = dataUrl.indexOf(',');
      var meta = comma > -1 ? dataUrl.slice(5, comma) : '';
      var mime = (meta.split(';')[0] || file.type || 'image/jpeg');
      var base64 = comma > -1 ? dataUrl.slice(comma + 1) : '';
      pendingImage = { name: file.name, mime: mime, base64: base64 };
      if (base64.length > MAX_IMAGE_BASE64_CHARS) {
        appendMessage('pending', 'IMAGEM', 'Aviso: ' + file.name + ' é grande (~' + Math.round(base64.length / 1024 / 1024) + 'MB) — pode demorar ou falhar.');
      }
      appendMessage('pending', 'IMAGEM', file.name + ' pronta para enviar com a próxima mensagem.');
    }).catch(function () {
      appendMessage('error', 'IMAGEM', 'Falha ao ler ' + file.name + '.');
    });
  }

  if (composer) {
    composer.addEventListener('submit', function (event) {
      event.preventDefault();
      var text = prompt ? prompt.value.trim() : '';
      if (!text && !pendingAttachments.length && !pendingImage) return;

      var attachmentsPrefix = pendingAttachments.map(function (a) {
        return '[Arquivo: ' + a.name + ']\n' + a.content;
      }).join('\n\n');
      var fullMessage = attachmentsPrefix ? (attachmentsPrefix + (text ? '\n\n' + text : '')) : text;
      if (!fullMessage) fullMessage = 'Analise esta imagem.';

      var displayParts = [];
      if (text) displayParts.push(text);
      if (pendingAttachments.length) displayParts.push('[' + pendingAttachments.length + ' anexo(s): ' + pendingAttachments.map(function (a) { return a.name; }).join(', ') + ']');
      if (pendingImage) displayParts.push('[imagem: ' + pendingImage.name + ']');
      appendMessage('user', 'VOCE', displayParts.join('\n'));

      var imagePayload = pendingImage;
      pendingAttachments = [];
      pendingImage = null;

      prompt.value = '';
      resizePrompt();

      if (window.setAtomicCoreState) window.setAtomicCoreState('action');
      if (window.startAtomicSequence) window.startAtomicSequence();

      var thinkingEl = appendMessage('pending', 'VISION CORE', 'Pensando...');

      function finish() {
        if (thinkingEl && thinkingEl.parentNode) thinkingEl.parentNode.removeChild(thinkingEl);
        if (window.resetAtomicCore) window.resetAtomicCore();
      }

      var token = getChatAuthToken();
      var headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = 'Bearer ' + token;

      var controller = null;
      try { controller = new AbortController(); } catch (_) {}
      var timeoutId = controller ? window.setTimeout(function () { controller.abort(); }, CHAT_TIMEOUT_MS) : null;

      var bodyPayload = { message: fullMessage, mode: 'vision-geral', model: 'auto', display_input: (text || null) };
      if (imagePayload) {
        bodyPayload.image_name = imagePayload.name;
        bodyPayload.image_base64 = imagePayload.base64;
        bodyPayload.image_mime = imagePayload.mime;
      }

      fetch(CHAT_BACKEND_URL + '/api/chat', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(bodyPayload),
        signal: controller ? controller.signal : undefined
      }).then(function (r) {
        if (timeoutId) window.clearTimeout(timeoutId);
        if (!r.ok) {
          return r.json().catch(function () { return null; }).then(function (body) {
            throw new Error((body && (body.error || body.message)) || ('HTTP ' + r.status));
          });
        }
        return r.json();
      }).then(function (data) {
        finish();
        if (data && typeof data.answer === 'string' && data.answer) {
          appendMessage('assistant', 'VISION CORE', data.answer);
          var parsed = parseHermesBlock(data.answer);
          if (parsed.hermesObj && (parsed.hermesObj.diagnosis || parsed.hermesObj.fix_type || parsed.hermesObj.patch || parsed.hermesObj.decisao)) {
            if (hermesHint) hermesHint.hidden = false;
            if (hintDiagnosis) hintDiagnosis.textContent = parsed.hermesObj.diagnosis || parsed.hermesObj.decisao || 'Diagnóstico estrutural disponível.';
            if (hintActions) {
              hintActions.textContent = '';
              var goBtn = document.createElement('button');
              goBtn.type = 'button';
              goBtn.textContent = 'Ver detalhes nas Missões';
              goBtn.addEventListener('click', function () { selectFeature('missions', true); });
              hintActions.appendChild(goBtn);
            }
          } else {
            if (hermesHint) hermesHint.hidden = true;
          }
        } else {
          appendMessage('error', 'ERRO', 'Resposta do backend em formato inesperado (sem campo "answer").');
        }
      }).catch(function (err) {
        if (timeoutId) window.clearTimeout(timeoutId);
        finish();
        var isAbort = err && err.name === 'AbortError';
        appendMessage('error', 'ERRO', isAbort
          ? 'Tempo esgotado ao falar com o backend (45s). Tente novamente.'
          : ('Erro de conexão: ' + (err && err.message ? err.message : err)));
      });
    });
  }

  document.querySelectorAll('[data-quick]').forEach(function (button) {
    button.addEventListener('click', function () {
      var action = button.getAttribute('data-quick');
      if (action === 'attach' && attachmentInput) return attachmentInput.click();
      if (action === 'image' && imageInput) return imageInput.click();
      var labels = { scan: 'rodar scan do repositorio', factory: 'abrir Software Factory' };
      if (prompt) {
        prompt.value = 'Preciso ' + (labels[action] || action) + ' no Vision Core Next.';
        resizePrompt();
        prompt.focus();
      }
      selectFeature(action === 'scan' ? 'tools' : action, false);
    });
  });

  if (attachmentInput) attachmentInput.addEventListener('change', function () {
    handleAttachmentFiles(attachmentInput.files);
    attachmentInput.value = '';
  });
  if (imageInput) imageInput.addEventListener('change', function () {
    handleImageFile(imageInput.files && imageInput.files[0]);
    imageInput.value = '';
  });

  var root = document.querySelector('[data-atomic-core]');
  if (!root) return;

  var CX = 180;
  var CY = 180;
  var AGENT_RADIUS = 120;
  var MAX_ANGLE_DRIFT = 12;
  var MAX_RADIAL_DRIFT = 2;
  var coreNode = root.querySelector('[data-atomic-core-node]');
  var reduceMotion = false;
  var state = 'idle';
  var highlighted = Object.create(null);

  try { reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { reduceMotion = false; }

  function toRad(deg) { return deg * Math.PI / 180; }
  function lerp(min, max, t) { return min + (max - min) * t; }

  var aliases = { patch: 'patchEngine', patchengine: 'patchEngine', go: 'goCore', gocore: 'goCore', pass: 'passGold', passgold: 'passGold', piharness: 'pi' };
  function normalizeAgent(name) {
    var key = String(name || '').replace(/[^a-zA-Z]/g, '').toLowerCase();
    return aliases[key] || name;
  }

  var configs = {
    pi:          { angle: -90, period: 78, radial: 62, depth: 16, action: 5.8, direction:  1, rx: 143, ry: 42, tilt: -30, phase: .10, glowColor: '#b86cff', glowWeight: .90 },
    hermes:      { angle: -54, period: 66, radial: 71, depth: 18, action: 7.4, direction: -1, rx: 136, ry: 54, tilt:  28, phase: .82, glowColor: '#34d399', glowWeight: .90 },
    openclaw:    { angle: -18, period: 88, radial: 57, depth: 15, action: 4.6, direction:  1, rx: 148, ry: 38, tilt:  78, phase: 1.54, glowColor: '#3b82f6', glowWeight: .75 },
    scanner:     { angle:  18, period: 59, radial: 84, depth: 19, action: 6.7, direction: -1, rx: 128, ry: 60, tilt: -72, phase: 2.26, glowColor: '#22d3ee', glowWeight: .75 },
    patchEngine: { angle:  54, period: 74, radial: 68, depth: 17, action: 5.1, direction:  1, rx: 140, ry: 48, tilt:  12, phase: 2.98, glowColor: '#d946ef', glowWeight: .65 },
    aegis:       { angle:  90, period: 90, radial: 73, depth: 20, action: 8.8, direction: -1, rx: 132, ry: 66, tilt:  54, phase: 3.70, glowColor: '#facc15', glowWeight: .75 },
    goCore:      { angle: 126, period: 81, radial: 64, depth: 14, action: 6.0, direction:  1, rx: 146, ry: 44, tilt: -54, phase: 4.42, glowColor: '#f59e0b', glowWeight: .63 },
    passGold:    { angle: 162, period: 69, radial: 79, depth: 18, action: 7.9, direction: -1, rx: 126, ry: 58, tilt:  86, phase: 5.14, glowColor: '#fb7185', glowWeight: .62 },
    archivist:   { angle: 198, period: 84, radial: 60, depth: 16, action: 4.2, direction:  1, rx: 142, ry: 40, tilt:  38, phase: 5.86, glowColor: '#0f766e', glowWeight: .64 },
    github:      { angle: 234, period: 50, radial: 88, depth: 15, action: 8.5, direction: -1, rx: 134, ry: 62, tilt: -12, phase: 6.58, glowColor: '#38bdf8', glowWeight: .65 }
  };

  function Agent(node, config) {
    this.node = node;
    this.name = node.getAttribute('data-agent');
    this.base = toRad(config.angle);
    this.period = config.period * 1000;
    this.radialPeriod = config.radial * 1000;
    this.depthPeriod = config.depth * 1000;
    this.actionPeriod = config.action * 1000;
    this.direction = config.direction || 1;
    this.rx = config.rx;
    this.ry = config.ry;
    this.tilt = toRad(config.tilt || 0);
    this.phase = config.phase;
    this.glowColor = config.glowColor;
    this.glowWeight = config.glowWeight;
    this.node.style.setProperty('--agent-glow-color', this.glowColor);
  }

  Agent.prototype.idleValues = function (elapsed) {
    var primary = Math.sin(elapsed / this.period * Math.PI * 2 + this.phase);
    var secondary = Math.cos(elapsed / 14000 * Math.PI * 2 + this.phase * .73);
    var angleWave = primary * .78 + secondary * .22;
    var radialWave = Math.sin(elapsed / this.radialPeriod * Math.PI * 2 + this.phase * 1.37);
    var depthWave = (Math.sin(elapsed / this.depthPeriod * Math.PI * 2 + this.phase * 1.91) + 1) / 2;
    return { angle: this.base + toRad(angleWave * MAX_ANGLE_DRIFT), radius: AGENT_RADIUS + radialWave * MAX_RADIAL_DRIFT, scale: lerp(1, 1.02, depthWave), opacity: lerp(.82, .98, depthWave), glow: lerp(18, 28, depthWave), layer: 4 };
  };

  Agent.prototype.actionValues = function (elapsed) {
    var t = elapsed / this.actionPeriod * Math.PI * 2 * this.direction + this.phase;
    var ex = Math.cos(t) * this.rx;
    var ey = Math.sin(t) * this.ry;
    var x = CX + ex * Math.cos(this.tilt) - ey * Math.sin(this.tilt);
    var y = CY + ex * Math.sin(this.tilt) + ey * Math.cos(this.tilt);
    var depthWave = (Math.sin(t + this.phase * .7) + 1) / 2;
    return { x: x, y: y, scale: lerp(.76, .94, depthWave), opacity: lerp(.78, 1, depthWave), glow: 42 * (1 + Math.sin(t * 2 + this.phase) * .1), layer: depthWave > .5 ? 9 : 3 };
  };

  Agent.prototype.values = function (elapsed) {
    if (reduceMotion) {
      // Posição/órbita ficam congeladas (acessibilidade), mas o glow ainda
      // precisa refletir o estado real - é o único sinal visual de "action"
      // disponível quando o loop de movimento está desligado.
      var glowBase = state === 'action' ? 42 : 24;
      return { angle: this.base, radius: AGENT_RADIUS, scale: 1, opacity: .9, glow: glowBase, layer: 4 };
    }
    return state === 'action' ? this.actionValues(elapsed) : this.idleValues(elapsed);
  };

  Agent.prototype.place = function (elapsed) {
    var value = this.values(elapsed);
    var isHighlighted = highlighted[this.name];
    var x = typeof value.x === 'number' ? value.x : CX + Math.cos(value.angle) * value.radius;
    var y = typeof value.y === 'number' ? value.y : CY + Math.sin(value.angle) * value.radius;
    this.node.style.transform = 'translate(' + (x - CX).toFixed(2) + 'px, ' + (y - CY).toFixed(2) + 'px) translate(-50%, -50%) scale(' + (value.scale + (isHighlighted ? .035 : 0)).toFixed(3) + ')';
    this.node.style.opacity = Math.min(1, value.opacity + (isHighlighted ? .08 : 0)).toFixed(3);
    this.node.style.zIndex = value.layer + (isHighlighted ? 2 : 0);
    this.node.classList.toggle('is-highlighted', !!isHighlighted);
    var glow = value.glow * this.glowWeight * (isHighlighted ? 1.45 : 1);
    var glowPercent = Math.max(18, Math.min(84, glow));
    var widePercent = Math.max(8, glowPercent - 18);
    this.node.style.filter = 'drop-shadow(0 0 ' + (glow * .48).toFixed(1) + 'px color-mix(in srgb, var(--agent-glow-color, currentColor) ' + glowPercent.toFixed(0) + '%, transparent)) drop-shadow(0 0 ' + (glow * .92).toFixed(1) + 'px color-mix(in srgb, var(--agent-glow-color, currentColor) ' + widePercent.toFixed(0) + '%, transparent))';
  };

  var agents = Array.prototype.slice.call(root.querySelectorAll('[data-agent]')).map(function (node) {
    return new Agent(node, configs[node.getAttribute('data-agent')]);
  });

  var raf = 0;
  var startTime = performance.now();

  function render(elapsed) {
    agents.forEach(function (agent) { agent.place(elapsed); });
    if (coreNode) {
      var scale = 1;
      if (!reduceMotion && state === 'action') scale = 1 + ((Math.sin(elapsed / 1200 * Math.PI * 2) + 1) / 2) * .04;
      coreNode.style.transform = 'translate(-50%, -50%) scale(' + scale.toFixed(3) + ')';
    }
  }

  function frame(now) {
    render(now - startTime);
    raf = window.requestAnimationFrame(frame);
  }

  function setAtomicCoreState(nextState) {
    state = nextState === 'action' ? 'action' : 'idle';
    startTime = performance.now();
    root.setAttribute('data-state', state);
    render(0);
    return state;
  }

  function highlightAtomicAgents(names) {
    highlighted = Object.create(null);
    (names || []).forEach(function (name) { highlighted[normalizeAgent(name)] = true; });
    render(performance.now() - startTime);
    return Object.keys(highlighted);
  }

  function resetAtomicCore() {
    stopAtomicSequence();
    highlighted = Object.create(null);
    return setAtomicCoreState('idle');
  }

  // Propagação EXECUTING da spec Atomic Core: Hermes acende primeiro (recebe
  // a missão), depois os agentes seguintes em sequência enquanto a resposta
  // não chega. Loop contínuo (não para sozinho) - quem inicia o ciclo do
  // chat é responsável por chamar stopAtomicSequence() ao terminar.
  var ATOMIC_SEQUENCE = ['hermes', 'pi', 'openclaw', 'scanner', 'patchEngine', 'aegis'];
  var ATOMIC_STEP_MS = 1800;
  var atomicSequenceTimer = null;

  function startAtomicSequence() {
    stopAtomicSequence();
    var idx = 0;
    function step() {
      highlightAtomicAgents([ATOMIC_SEQUENCE[idx]]);
      idx = (idx + 1) % ATOMIC_SEQUENCE.length;
      atomicSequenceTimer = window.setTimeout(step, ATOMIC_STEP_MS);
    }
    step();
  }

  function stopAtomicSequence() {
    if (atomicSequenceTimer) { window.clearTimeout(atomicSequenceTimer); atomicSequenceTimer = null; }
  }

  window.setAtomicCoreState = setAtomicCoreState;
  window.highlightAtomicAgents = highlightAtomicAgents;
  window.resetAtomicCore = resetAtomicCore;
  window.startAtomicSequence = startAtomicSequence;
  window.stopAtomicSequence = stopAtomicSequence;
  window.AtomicCoreNext = { setState: setAtomicCoreState, highlight: highlightAtomicAgents, reset: resetAtomicCore };

  root.setAttribute('data-glow', 'on');
  setAtomicCoreState('idle');
  selectFeature('chat', false);
  if (!reduceMotion) raf = window.requestAnimationFrame(frame);

  // ── Software Factory (Next) ───────────────────────────────────
  var sfHistory = document.getElementById('vcSfHistory');
  var sfProgress = document.getElementById('vcSfProgress');
  var sfLog = document.getElementById('vcSfLog');
  var sfFinal = document.getElementById('vcSfFinal');
  var sfFinalBody = document.getElementById('vcSfFinalBody');
  var sfComposer = document.getElementById('vcSfComposer');
  var sfInput = document.getElementById('vcSfInput');
  var sfModeButtons = Array.prototype.slice.call(document.querySelectorAll('[data-sf-mode]'));
  var sfProvider = document.getElementById('vcSfProvider');
  var sfModel = document.getElementById('vcSfModel');
  var sfDryRun = document.getElementById('vcSfDryRun');
  var sfPassGold = document.getElementById('vcSfPassGold');
  var sfExtraInputs = Array.prototype.slice.call(document.querySelectorAll('[data-sf-extra-step]'));
  var sfMode = 'auto';
  var sfPollTimer = null;
  var sfInFlight = false;
  var sfFullContext = '';
  var sfRunOptions = null;

  var SF_STEPS = [
    { label: '01 — Analisar projeto e sugerir stack',      module: 'project_builder',   endpoint: '/api/sf/mission-composer' },
    { label: '02 — Preview de arquivos a criar',           module: 'export_preview',    endpoint: '/api/sf/deploy-blueprint' },
    { label: '03 — Selecionar template',                   module: 'project_templates', endpoint: '/api/sf/mission-composer' },
    { label: '04 — Compor missão SDDF',                    module: 'mission_composer',  endpoint: '/api/sf/mission-composer' },
    { label: '05 — Gerar pacote para worker',              module: 'worker_handoff',    endpoint: '/api/sf/worker-handoff' }
  ];
  var SF_EXTRA_STEPS = [
    { label: 'E1 — Context Snapshot', module: 'context_snapshot', endpoint: '/api/sf/context-snapshot', key: 'context-snapshot' },
    { label: 'E2 — Patch Validator', module: 'patch_validator', endpoint: '/api/sf/patch-validator', key: 'patch-validator' },
    { label: 'E3 — Risk Assessor', module: 'risk_assessor', endpoint: '/api/sf/risk-assessor', key: 'risk-assessor' },
    { label: 'E4 — Rollback Planner', module: 'rollback_planner', endpoint: '/api/sf/rollback-planner', key: 'rollback-planner' }
  ];
  var SF_GOLD_GATE_STEP = { label: '06 — Validar PASS GOLD', module: 'gold_gate', endpoint: '/api/sf/gold-gate' };
  var sfActiveSteps = SF_STEPS;

  function sfExtractReadable(data) {
    if (!data) return '';
    if (typeof data === 'string') return data;
    if (data.content) return data.content;
    if (data.answer) return data.answer;
    if (data.output) return data.output;
    if (data.files) {
      if (Array.isArray(data.files)) return data.files.map(function (f) { return f.path || f.name || f; }).join('\n');
      return JSON.stringify(data.files, null, 2);
    }
    if (data.result && typeof data.result === 'object') return sfExtractReadable(data.result);
    if (data.plan && data.plan.mission_summary) return data.plan.mission_summary;
    return JSON.stringify(data, null, 2);
  }

  function appendSfMsg(role, text) {
    if (!sfHistory) return null;
    var item = document.createElement('div');
    var label = document.createElement('span');
    var body = document.createElement('p');
    item.className = 'vc-sf-msg vc-sf-msg-' + role;
    if (role === 'user') label.textContent = 'VOCE';
    else if (role === 'error') label.textContent = 'ERRO';
    else label.textContent = 'ARQUITETO';
    body.textContent = text;
    item.appendChild(label);
    item.appendChild(body);
    sfHistory.appendChild(item);
    item.scrollIntoView({ block: 'end', behavior: 'smooth' });
    return item;
  }

  function appendSfLog(status, text) {
    if (!sfLog) return;
    sfLog.hidden = false;
    var row = document.createElement('div');
    row.className = 'vc-sf-log-row vc-sf-log-' + (status || 'info');
    row.textContent = text;
    sfLog.appendChild(row);
    sfLog.scrollTop = sfLog.scrollHeight;
  }

  function updateSfProgress(idx, status) {
    if (!sfProgress) return;
    sfProgress.hidden = false;
    var steps = sfProgress.querySelectorAll('.vc-sf-progress-step');
    if (steps.length !== sfActiveSteps.length) {
      sfProgress.textContent = '';
      sfActiveSteps.forEach(function (s, i) {
        var div = document.createElement('div');
        div.className = 'vc-sf-progress-step';
        div.textContent = '\u25CB ' + s.label;
        sfProgress.appendChild(div);
      });
      steps = sfProgress.querySelectorAll('.vc-sf-progress-step');
    }
    steps.forEach(function (el, i) {
      el.className = 'vc-sf-progress-step';
      if (i < idx) { el.classList.add('vc-sf-progress-done'); el.textContent = '\u2713 ' + sfActiveSteps[i].label; }
      else if (i === idx) { el.classList.add(status === 'error' ? 'vc-sf-progress-error' : 'vc-sf-progress-active'); el.textContent = (status === 'error' ? '\u2717 ' : '\u25CF ') + sfActiveSteps[i].label; }
    });
  }

  function pollSfJob(jobId, cb) {
    var pollCount = 0;
    function poll() {
      if (pollCount >= 90) { cb(new Error('Timeout 90s')); return; }
      pollCount++;
      apiRequest('/api/sf/job/' + encodeURIComponent(jobId)).then(function (data) {
        if (data.status === 'done' || data.status === 'completed') cb(null, data.result || data);
        else if (data.status === 'error') cb(new Error(data.error || 'Job error'));
        else sfPollTimer = window.setTimeout(poll, 2000);
      }).catch(function () { sfPollTimer = window.setTimeout(poll, 2000); });
    }
    poll();
  }

  function stopSfPoll() {
    if (sfPollTimer) { window.clearTimeout(sfPollTimer); sfPollTimer = null; }
  }

  function setSfMode(mode) {
    sfMode = mode === 'advanced' ? 'advanced' : 'auto';
    sfModeButtons.forEach(function (btn) {
      btn.setAttribute('aria-pressed', btn.getAttribute('data-sf-mode') === sfMode ? 'true' : 'false');
    });
  }

  function getSelectedSfExtraSteps() {
    return SF_EXTRA_STEPS.filter(function (step) {
      return sfExtraInputs.some(function (input) { return input.checked && input.getAttribute('data-sf-extra-step') === step.key; });
    });
  }

  function readSfOptions() {
    var selectedExtraSteps = getSelectedSfExtraSteps();
    return {
      mode: sfMode,
      provider: sfProvider && sfProvider.value ? sfProvider.value : 'auto',
      model: sfModel && sfModel.value ? sfModel.value.trim() : '',
      dry_run: !sfDryRun || sfDryRun.checked,
      pass_gold: !sfPassGold || sfPassGold.checked,
      extra_steps: selectedExtraSteps.map(function (step) { return step.key; }),
      real_execution_allowed: false,
      deploy_allowed: false,
      writes_disk: false
    };
  }

  function renderSfFinal() {
    if (!sfFinal || !sfFinalBody) return;
    sfFinalBody.textContent = sfFullContext.trim();
    sfFinal.hidden = false;
  }

  function runSfAutoPilot(desc) {
    if (sfInFlight) return;
    sfInFlight = true;
    sfFullContext = desc;
    sfRunOptions = readSfOptions();
    sfActiveSteps = SF_STEPS.concat(getSelectedSfExtraSteps());
    if (sfRunOptions.pass_gold) sfActiveSteps = sfActiveSteps.concat([SF_GOLD_GATE_STEP]);
    if (sfLog) { sfLog.textContent = ''; sfLog.hidden = false; }
    if (sfFinal) sfFinal.hidden = true;
    if (sfFinalBody) sfFinalBody.textContent = '';
    appendSfLog('warn', 'SAFE real_execution_allowed=false deploy_allowed=false writes_disk=false');
    appendSfLog('info', 'MODE ' + sfRunOptions.mode + ' provider=' + sfRunOptions.provider + ' model=' + (sfRunOptions.model || 'auto'));
    if (sfInput) sfInput.disabled = true;
    var submitBtn = sfComposer && sfComposer.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    appendSfMsg('user', desc);
    updateSfProgress(0, 'active');

    if (window.setAtomicCoreState) window.setAtomicCoreState('action');
    if (window.startAtomicSequence) window.startAtomicSequence();

    var idx = 0;
    function nextStep() {
      if (idx >= sfActiveSteps.length) {
        appendSfMsg('assistant', 'Projeto concluído!');
        renderSfFinal();
        finishSf();
        return;
      }
      updateSfProgress(idx, 'active');
      var step = sfActiveSteps[idx];
      var body = { description: desc, module: step.module, autopilot: true, step: idx, total_steps: sfActiveSteps.length, sf_options: sfRunOptions || readSfOptions() };
      appendSfLog('info', 'SEND ' + step.endpoint + ' module=' + step.module);
      if (sfFullContext && idx > 0) body.full_context = sfFullContext.slice(0, 3000);
      apiRequest(step.endpoint, { method: 'POST', body: body }).then(function (data) {
        if (data && data.job_id) {
          pollSfJob(data.job_id, function (err, result) {
            if (err) {
              updateSfProgress(idx, 'error');
              appendSfLog('error', 'FAIL ' + step.module + ': ' + err.message);
              appendSfMsg('error', step.label + ' falhou: ' + err.message);
              finishSf();
            } else {
              updateSfProgress(idx, 'done');
              appendSfLog('ok', 'DONE ' + step.module);
              var text = sfExtractReadable(result);
              if (text) {
                sfFullContext += '\n\n[' + step.label + ']\n' + text.slice(0, 1500);
                appendSfMsg('assistant', step.label + '\n\n' + text.slice(0, 2000));
              }
              idx++;
              nextStep();
            }
          });
        } else {
          updateSfProgress(idx, 'done');
          appendSfLog('ok', 'DONE ' + step.module);
          var text = sfExtractReadable(data);
          if (text) {
            sfFullContext += '\n\n[' + step.label + ']\n' + text.slice(0, 1500);
            appendSfMsg('assistant', step.label + '\n\n' + text.slice(0, 2000));
          }
          idx++;
          nextStep();
        }
      }).catch(function (err) {
        updateSfProgress(idx, 'error');
        appendSfLog('error', 'FAIL ' + step.module + ': ' + (err && err.message ? err.message : String(err)));
        appendSfMsg('error', step.label + ' falhou: ' + (err && err.message ? err.message : String(err)));
        finishSf();
      });
    }
    nextStep();
  }

  function finishSf() {
    sfInFlight = false;
    stopSfPoll();
    sfRunOptions = null;
    if (sfInput) sfInput.disabled = false;
    var submitBtn = sfComposer && sfComposer.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = false;
    if (window.resetAtomicCore) window.resetAtomicCore();
  }

  sfModeButtons.forEach(function (btn) {
    btn.addEventListener('click', function () { setSfMode(btn.getAttribute('data-sf-mode')); });
  });

  if (sfComposer) {
    sfComposer.addEventListener('submit', function (event) {
      event.preventDefault();
      var text = sfInput ? sfInput.value.trim() : '';
      if (!text || sfInFlight) return;
      sfInput.value = '';
      runSfAutoPilot(text);
    });
    if (sfInput) {
      sfInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sfComposer.requestSubmit(); }
      });
    }
  }
})();

(function () {
  'use strict';

  var eyes = Array.prototype.slice.call(document.querySelectorAll('.vc-eye-logo')).map(function (logo) {
    return { logo: logo, trigger: logo.closest('.vc-side-brand, .vc-brand-lockup') || logo, eye: logo.querySelector('.vc-eye') };
  }).filter(function (target) { return target.eye; });
  if (!eyes.length) return;

  var BLINK_MS = 420;
  var HOVER_BLINK_MIN_GAP_MS = 650;
  var lastHoverBlink = new WeakMap();

  function blinkOnce(target) {
    target.eye.classList.remove('is-blinking');
    void target.eye.offsetWidth;
    target.eye.classList.add('is-blinking');
    window.setTimeout(function () { target.eye.classList.remove('is-blinking'); }, BLINK_MS + 40);
  }

  eyes.forEach(function (target) {
    var blinkedForHover = false;

    function blinkOnHover() {
      var now = Date.now();
      var last = lastHoverBlink.get(target.trigger) || 0;
      if (blinkedForHover || now - last < HOVER_BLINK_MIN_GAP_MS) return;
      blinkedForHover = true;
      lastHoverBlink.set(target.trigger, now);
      blinkOnce(target);
    }

    ['pointerenter', 'mouseenter', 'pointermove'].forEach(function (eventName) {
      target.trigger.addEventListener(eventName, blinkOnHover);
    });

    ['pointerleave', 'mouseleave'].forEach(function (eventName) {
      target.trigger.addEventListener(eventName, function () {
        blinkedForHover = false;
      });
    });
  });

  // Piscada ambiente (idle-only, 4-9s, ~20% de chance de piscada dupla) -
  // reaproveita o mesmo blinkOnce() do hover. prefers-reduced-motion real
  // desativa SÓ este agendador; o hover continua funcionando sempre, é
  // resposta direta a ação do usuário, não animação decorativa passiva.
  var reduceMotion = false;
  try { reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { reduceMotion = false; }

  var atomicRoot = document.querySelector('[data-atomic-core]');
  var DOUBLE_BLINK_CHANCE = 0.2;
  var DOUBLE_BLINK_GAP_MS = 250;
  var MIN_DELAY_MS = 4000;
  var MAX_DELAY_MS = 9000;
  var ambientTimer = null;

  function isIdle() {
    return !atomicRoot || atomicRoot.getAttribute('data-state') !== 'action';
  }

  function scheduleNextAmbientBlink() {
    if (ambientTimer) { window.clearTimeout(ambientTimer); ambientTimer = null; }
    if (reduceMotion || !isIdle()) return;
    var delay = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
    ambientTimer = window.setTimeout(function () {
      ambientTimer = null;
      if (!isIdle()) return;
      eyes.forEach(blinkOnce);
      if (Math.random() < DOUBLE_BLINK_CHANCE) {
        window.setTimeout(function () {
          if (isIdle()) eyes.forEach(blinkOnce);
        }, DOUBLE_BLINK_GAP_MS);
      }
      scheduleNextAmbientBlink();
    }, delay);
  }

  if (!reduceMotion && atomicRoot && window.MutationObserver) {
    new MutationObserver(function () {
      if (isIdle()) {
        if (!ambientTimer) scheduleNextAmbientBlink();
      } else if (ambientTimer) {
        window.clearTimeout(ambientTimer);
        ambientTimer = null;
      }
    }).observe(atomicRoot, { attributes: true, attributeFilter: ['data-state'] });
  }

  if (!reduceMotion) scheduleNextAmbientBlink();
})();
