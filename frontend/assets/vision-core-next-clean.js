(function () {
  'use strict';

  // ── Controle de animações do Vision Core (não do sistema operacional) ──
  // Decisão de produto (2026-07-09): a animação do Atomic Core é identidade
  // visual da marca. O VC tem controle próprio de acessibilidade (Settings →
  // Animações) — o SO (prefers-reduced-motion) NÃO degrada a experiência por
  // padrão. Default é sempre "full", independente do que o SO reportar.
  // Fonte única de verdade: leia/decida sempre por aqui, nunca chame
  // matchMedia('(prefers-reduced-motion...)') diretamente em outro lugar do
  // código pra decidir o que animar (a única exceção legítima é a dica de
  // primeira visita — isso é consciência de acessibilidade, não controle).
  var VC_MOTION_KEY = 'vc_animation_mode'; // 'full' | 'reduced'
  var vcMotionListeners = [];

  function getAnimationMode() {
    try {
      var stored = window.localStorage.getItem(VC_MOTION_KEY);
      if (stored === 'reduced' || stored === 'full') return stored;
    } catch (_) {}
    return 'full';
  }

  function isReducedMotion() {
    return getAnimationMode() === 'reduced';
  }

  function setAnimationMode(mode) {
    var next = mode === 'reduced' ? 'reduced' : 'full';
    try { window.localStorage.setItem(VC_MOTION_KEY, next); } catch (_) {}
    vcMotionListeners.forEach(function (cb) { try { cb(next); } catch (_) {} });
    return next;
  }

  function onAnimationModeChange(cb) {
    if (typeof cb === 'function') vcMotionListeners.push(cb);
  }

  window.VCMotion = {
    getMode: getAnimationMode,
    isReduced: isReducedMotion,
    setMode: setAnimationMode,
    onChange: onAnimationModeChange
  };

  // ── Preferência de visibilidade e intensidade do Atomic Core ──
  // ROADMAP.md pedia também "glow on/off" — excluído por decisão de
  // Specification First: VISION_CORE_NEXT_FRONTEND_SPEC.md checklist item 6
  // já fecha isso ("Sem botões Idle/Action/Glow visíveis — nunca existiram
  // como controles"). On/off aqui é do WIDGET inteiro, mesmo padrão
  // getMode/setMode/onChange.
  var VC_ATOMIC_ENABLED_KEY = 'vc_atomic_core_enabled'; // 'on' | 'off'
  var vcAtomicEnabledListeners = [];

  function getAtomicCoreEnabled() {
    try {
      var stored = window.localStorage.getItem(VC_ATOMIC_ENABLED_KEY);
      if (stored === 'on' || stored === 'off') return stored;
    } catch (_) {}
    return 'on';
  }

  function setAtomicCoreEnabled(next) {
    var value = next === 'off' ? 'off' : 'on';
    try { window.localStorage.setItem(VC_ATOMIC_ENABLED_KEY, value); } catch (_) {}
    vcAtomicEnabledListeners.forEach(function (cb) { try { cb(value); } catch (_) {} });
    return value;
  }

  function onAtomicCoreEnabledChange(cb) {
    if (typeof cb === 'function') vcAtomicEnabledListeners.push(cb);
  }

  window.VCAtomicCore = {
    getEnabled: getAtomicCoreEnabled,
    setEnabled: setAtomicCoreEnabled,
    onChange: onAtomicCoreEnabledChange
  };

  var VC_ATOMIC_INTENSITY_KEY = 'vc_atomic_intensity'; // '0.4'..'1'

  function getAtomicIntensity() {
    try {
      var stored = parseFloat(window.localStorage.getItem(VC_ATOMIC_INTENSITY_KEY));
      if (stored >= 0.4 && stored <= 1) return stored;
    } catch (_) {}
    return 1;
  }

  function setAtomicIntensity(value) {
    var next = Math.min(1, Math.max(0.4, Number(value) || 1));
    try { window.localStorage.setItem(VC_ATOMIC_INTENSITY_KEY, String(next)); } catch (_) {}
    var hud = document.querySelector('[data-atomic-core]');
    if (hud) hud.style.setProperty('--atomic-intensity', next);
    return next;
  }

  // ── Movimento customizável do Atomic Core (Idle/Action/Retorno) ──
  // Mesmo padrão getX/setX/onChange + localStorage de VCMotion/VCAtomicCore
  // acima, um trio por eixo. "Reduzir animações" (VCMotion) sempre vence —
  // ver isReducedMotion() aplicado antes de qualquer um destes na leitura
  // de valores (Agent.prototype.values). Nenhum destes altera MAX_ANGLE_DRIFT/
  // MAX_RADIAL_DRIFT em si (regra dura de legibilidade, achado real: 12->3)
  // — "Deriva" só reescala 0..1 sobre esse teto já validado, nunca acima.
  function makeAtomicMotionPref(key, allowed, fallback) {
    var listeners = [];
    function get() {
      try {
        var stored = window.localStorage.getItem(key);
        if (allowed.indexOf(stored) !== -1) return stored;
      } catch (_) {}
      return fallback;
    }
    function set(next) {
      var value = allowed.indexOf(next) !== -1 ? next : fallback;
      try { window.localStorage.setItem(key, value); } catch (_) {}
      listeners.forEach(function (cb) { try { cb(value); } catch (_) {} });
      return value;
    }
    function onChange(cb) { if (typeof cb === 'function') listeners.push(cb); }
    return { getPref: get, setPref: set, onChange: onChange };
  }

  function makeAtomicMotionNumber(key, min, max, fallback) {
    var listeners = [];
    function get() {
      try {
        var stored = parseFloat(window.localStorage.getItem(key));
        if (stored >= min && stored <= max) return stored;
      } catch (_) {}
      return fallback;
    }
    function set(value) {
      var next = Math.min(max, Math.max(min, Number(value)));
      if (!(next >= min)) next = fallback;
      try { window.localStorage.setItem(key, String(next)); } catch (_) {}
      listeners.forEach(function (cb) { try { cb(next); } catch (_) {} });
      return next;
    }
    function onChange(cb) { if (typeof cb === 'function') listeners.push(cb); }
    return { getValue: get, setValue: set, onChange: onChange };
  }

  var idleSpeedPref      = makeAtomicMotionNumber('vc_atomic_idle_speed', 0.4, 2.5, 1);
  var idlePatternPref    = makeAtomicMotionPref('vc_atomic_idle_pattern', ['classic', 'pulse', 'drift'], 'classic');
  var idleDriftPref      = makeAtomicMotionNumber('vc_atomic_idle_drift', 0, 1, 1); // 0..1 sobre o teto ja validado (MAX_ANGLE_DRIFT=3/MAX_RADIAL_DRIFT=2) — nunca acima de 1
  var actionPatternPref  = makeAtomicMotionPref('vc_atomic_action_pattern', ['classic', 'wide', 'pulse'], 'classic');
  var returnStylePref    = makeAtomicMotionPref('vc_atomic_return_style', ['none', 'fast', 'smooth'], 'none');
  var returnDurationPref = makeAtomicMotionNumber('vc_atomic_return_duration', 200, 2500, 900);

  window.VCAtomicMotion = {
    idleSpeed: idleSpeedPref,
    idlePattern: idlePatternPref,
    idleDrift: idleDriftPref,
    actionPattern: actionPatternPref,
    returnStyle: returnStylePref,
    returnDuration: returnDurationPref
  };

  var appShell = document.querySelector('.vc-app-shell');
  var sidebarToggle = document.querySelector('[data-sidebar-toggle]');
  var composer = document.getElementById('vcComposer');
  var chatScroll = document.getElementById('vcChatScroll');
  var prompt = document.getElementById('vcPrompt');
  var smileOpen = document.querySelector('[data-smile-open]');
  var smileModal = document.getElementById('vcSmileModal');
  var smileClose = document.getElementById('vcSmileClose');
  var smileTitle = document.getElementById('vcSmileTitle');
  var smileBody = document.getElementById('vcSmileBody');
  var smileAvatar = document.getElementById('vcSmileAvatar');
  var smileSteps = document.getElementById('vcSmileSteps');
  var smilePrev = document.getElementById('vcSmilePrev');
  var smileNext = document.getElementById('vcSmileNext');
  var stream = document.getElementById('vcChatStream');
  var featurePanel = document.getElementById('vcFeaturePanel');
  var featureTitle = document.getElementById('vcFeatureTitle');
  var featureBody = document.getElementById('vcFeatureBody');
  var featureStatus = document.getElementById('vcFeatureStatus');
  var brandLockupEl = document.getElementById('vcBrandLockup');
  var pageHeadEl = document.getElementById('vcPageHead');
  var pageHeadTitleEl = document.getElementById('vcPageHeadTitle');
  var pageHeadStatusEl = document.getElementById('vcPageHeadStatus');
  var featureActions = document.getElementById('vcFeatureActions');
  var featureViz = document.getElementById('vcFeatureViz');
  var featureClose = document.getElementById('vcFeatureClose');
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
  var accountCopy = document.getElementById('vcAccountCopy');
  var accountForm = document.getElementById('vcAccountForm');
  var accountEmail = document.getElementById('vcAccountEmail');
  var accountPassword = document.getElementById('vcAccountPassword');
  var accountLoginBtn = document.getElementById('vcAccountLoginBtn');
  var accountRegisterBtn = document.getElementById('vcAccountRegisterBtn');
  var accountLogoutBtn = document.getElementById('vcAccountLogoutBtn');
  var accountLogged = document.getElementById('vcAccountLogged');
  var accountStatus = document.getElementById('vcAccountStatus');
  var googleOAuthBtn = document.getElementById('vcGoogleOAuthBtn');
  var githubOAuthBtn = document.getElementById('vcGithubOAuthBtn');
  var projectSelect = document.getElementById('vcProjectSelect');
  var projectNameInput = document.getElementById('vcProjectName');
  var projectCreateBtn = document.getElementById('vcProjectCreate');
  var projectStatus = document.getElementById('vcProjectStatus');
  var animationReducedCheckbox = document.getElementById('vcAnimationReduced');
  if (animationReducedCheckbox) {
    animationReducedCheckbox.checked = isReducedMotion();
    animationReducedCheckbox.addEventListener('change', function () {
      setAnimationMode(animationReducedCheckbox.checked ? 'reduced' : 'full');
    });
    // Reflete mudanças feitas por outra aba/janela (mesmo localStorage) sem reload.
    onAnimationModeChange(function (mode) { animationReducedCheckbox.checked = mode === 'reduced'; });
  }
  var atomicEnabledCheckbox = document.getElementById('vcAtomicEnabled');
  if (atomicEnabledCheckbox) {
    atomicEnabledCheckbox.checked = getAtomicCoreEnabled() === 'on';
    atomicEnabledCheckbox.addEventListener('change', function () {
      setAtomicCoreEnabled(atomicEnabledCheckbox.checked ? 'on' : 'off');
    });
    onAtomicCoreEnabledChange(function (value) { atomicEnabledCheckbox.checked = value === 'on'; });
  }
  var atomicIntensityInput = document.getElementById('vcAtomicIntensity');
  if (atomicIntensityInput) {
    atomicIntensityInput.value = String(getAtomicIntensity() * 100);
    setAtomicIntensity(getAtomicIntensity());
    atomicIntensityInput.addEventListener('input', function () {
      setAtomicIntensity(Number(atomicIntensityInput.value) / 100);
    });
  }

  // Movimento customizável do Atomic Core — mesmo padrão de wiring dos
  // controles acima (valor inicial + listener + reflete onChange externo).
  var idleSpeedInput = document.getElementById('vcAtomicIdleSpeed');
  if (idleSpeedInput) {
    idleSpeedInput.value = String(Math.round(idleSpeedPref.getValue() * 100));
    idleSpeedInput.addEventListener('input', function () { idleSpeedPref.setValue(Number(idleSpeedInput.value) / 100); });
    idleSpeedPref.onChange(function (v) { idleSpeedInput.value = String(Math.round(v * 100)); });
  }
  var idlePatternSelect = document.getElementById('vcAtomicIdlePattern');
  var idleDriftRow = document.getElementById('vcAtomicIdleDriftRow');
  var idleDriftInput = document.getElementById('vcAtomicIdleDrift');
  function syncIdleDriftRow(pattern) { if (idleDriftRow) idleDriftRow.hidden = pattern !== 'drift'; }
  if (idlePatternSelect) {
    idlePatternSelect.value = idlePatternPref.getPref();
    syncIdleDriftRow(idlePatternSelect.value);
    idlePatternSelect.addEventListener('change', function () {
      idlePatternPref.setPref(idlePatternSelect.value);
      syncIdleDriftRow(idlePatternSelect.value);
    });
    idlePatternPref.onChange(function (v) { idlePatternSelect.value = v; syncIdleDriftRow(v); });
  }
  if (idleDriftInput) {
    idleDriftInput.value = String(Math.round(idleDriftPref.getValue() * 100));
    idleDriftInput.addEventListener('input', function () { idleDriftPref.setValue(Number(idleDriftInput.value) / 100); });
    idleDriftPref.onChange(function (v) { idleDriftInput.value = String(Math.round(v * 100)); });
  }
  var actionPatternSelect = document.getElementById('vcAtomicActionPattern');
  if (actionPatternSelect) {
    actionPatternSelect.value = actionPatternPref.getPref();
    actionPatternSelect.addEventListener('change', function () { actionPatternPref.setPref(actionPatternSelect.value); });
    actionPatternPref.onChange(function (v) { actionPatternSelect.value = v; });
  }
  var returnStyleSelect = document.getElementById('vcAtomicReturnStyle');
  var returnDurationRow = document.getElementById('vcAtomicReturnDurationRow');
  var returnDurationInput = document.getElementById('vcAtomicReturnDuration');
  function syncReturnDurationRow(styleValue) { if (returnDurationRow) returnDurationRow.hidden = styleValue === 'none'; }
  if (returnStyleSelect) {
    returnStyleSelect.value = returnStylePref.getPref();
    syncReturnDurationRow(returnStyleSelect.value);
    returnStyleSelect.addEventListener('change', function () {
      returnStylePref.setPref(returnStyleSelect.value);
      syncReturnDurationRow(returnStyleSelect.value);
    });
    returnStylePref.onChange(function (v) { returnStyleSelect.value = v; syncReturnDurationRow(v); });
  }
  if (returnDurationInput) {
    returnDurationInput.value = String(returnDurationPref.getValue());
    returnDurationInput.addEventListener('input', function () { returnDurationPref.setValue(Number(returnDurationInput.value)); });
    returnDurationPref.onChange(function (v) { returnDurationInput.value = String(v); });
  }

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
  var chatStageEl = document.querySelector('.vc-chat-stage');
  var metricsPanel = document.getElementById('vcMetricsPanel');
  var metricsSourceBadge = document.getElementById('vcMetricsSourceBadge');
  var metricsError = document.getElementById('vcMetricsError');
  var metricsErrorText = document.getElementById('vcMetricsErrorText');
  var metricsRetry = document.getElementById('vcMetricsRetry');
  var metricsRefresh = document.getElementById('vcMetricsRefresh');
  var metricsWideToggle = document.getElementById('vcMetricsWideToggle');
  var metricsSkel = document.getElementById('vcMetricsSkel');
  var metricsBody = document.getElementById('vcMetricsBody');
  var metricsAgentList = document.getElementById('vcMetricsAgentList');
  var metricsTotal = document.getElementById('vcMetricsTotal');
  var metricsDoraGrid = document.getElementById('vcMetricsDoraGrid');
  var metricsRuntimeGrid = document.getElementById('vcMetricsRuntimeGrid');
  var metricsMemoryGrid = document.getElementById('vcMetricsMemoryGrid');
  var metricsConn = document.getElementById('vcMetricsConn');
  var metricsRawToggle = document.getElementById('vcMetricsRawToggle');
  var metricsRaw = document.getElementById('vcMetricsRaw');
  var safeStatusPanel = document.getElementById('vcSafeStatusPanel');
  var safeStatusList = document.getElementById('vcSafeStatusList');
  var safeStatusViz = document.getElementById('vcSafeStatusViz');
  var secretGuardCard = document.getElementById('vcSecretGuardCard');
  var activeFeature = 'chat';
  var lastFeatureTrigger = null;
  var lastChatMissionText = '';
  var metricsWide = false;

  var featureMap = {
    chat: { title: 'Chat', status: 'READY', agents: ['hermes'], text: 'Chat livre conectado ao endpoint real /api/chat.', actions: [{ label: 'Checar API', path: '/api/health' }] },
    missions: { title: 'Missions', status: 'PATCH + DRY-RUN + APPLY BLOQUEADO', agents: ['hermes', 'scanner', 'patchEngine', 'aegis', 'passGold'], text: 'Gerar Patch roda o pipeline real de diagnóstico + apply-patch, sem escrever nada sozinho — só gera diff para download. Dry-Run Real (abaixo) enfileira execução real no Vision Agent Local, em modo simulação (nunca escreve no disco). Apply-patch real via agente aparece abaixo, mas o botão fica bloqueado até existir token de pareamento real por agente (agent_id sozinho não autentica ninguém).', actions: [{ label: 'Quota', path: '/api/mission/quota' }, { label: 'Agent local', path: '/api/agent/status' }] },
    factory: { title: 'Software Factory', status: 'ATIVO', agents: ['openclaw', 'pi', 'hermes'], text: 'Descreva o projeto em linguagem simples. O Arquiteto analisa e gera a estrutura automaticamente via API real.', actions: [] },
    agents: { title: 'Agentes', status: 'SAFE READ', agents: ['hermes', 'scanner', 'patchEngine', 'aegis', 'goCore', 'github'], text: 'Status real dos agentes sem executar missão.', actions: [{ label: 'Status agent', path: '/api/agent/status' }, { label: 'Catálogo', path: '/api/agents/catalog' }, { label: 'Métricas agentes', path: '/api/metrics/agents' }] },
    github: { title: 'GitHub', status: 'PR c/ CONFIRMAÇÃO', agents: ['github'], text: 'Criação de PR real disponível abaixo — exige formulário completo + confirmação dupla antes de disparar.', actions: [{ label: 'Status GitHub', path: '/api/github/status' }] },
    vault: { title: 'Vault', status: 'ROLLBACK DISPONÍVEL', agents: ['aegis', 'archivist'], text: 'Snapshots do banco de projetos e rollback. Rollback sobrescreve o estado atual — confirmação dupla obrigatória.', actions: [{ label: 'Snapshots', path: '/api/vault/snapshots' }] },
    metrics: { title: 'Métricas', status: 'SAFE READ', agents: ['goCore', 'aegis'], text: 'Métricas reais em modo leitura.', actions: [{ label: 'Resumo', path: '/api/metrics/summary' }, { label: 'Agentes', path: '/api/metrics/agents' }, { label: 'DORA', path: '/api/dora-metrics' }, { label: 'Memória', path: '/api/metrics/memory' }] },
    tools: { title: 'Tools', status: 'APPLY-FIX DISPONÍVEL', agents: ['scanner', 'patchEngine'], text: 'Apply Fix abaixo — aplica correção em arquivo real com backup automático. Confirmação dupla obrigatória.', actions: [{ label: 'Histórico security', path: '/api/security/history' }, { label: 'Marketplace', path: '/api/tools/marketplace' }] },
    security: { title: 'Security Lab', status: 'SAFE STATUS', agents: ['aegis', 'scanner'], text: 'Painel de governança do Secret Guard. Só faz leitura de status via GET e mostra fallback local quando um endpoint não existe.', actions: [{ label: 'Atualizar status seguro', kind: 'safe-status' }] },
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

  var smileStep = 0;
  var smileGuide = [
    {
      title: 'Comece pelo chat',
      body: 'Escreva a missao no composer principal. O mesmo texto alimenta chat, Missions e Software Factory.',
      image: 'assets/mascote-reading-final.png'
    },
    {
      title: 'Escolha o fluxo',
      body: 'Use os chips Missao, Factory, GitHub, Vault ou IA para mudar o contexto sem criar outro campo de entrada.',
      image: 'assets/mascote-idle-final.png'
    },
    {
      title: 'Confirme antes de agir',
      body: 'Acoes sensiveis continuam pedindo revisao humana. O Next prioriza chat-first e evidencia antes de mudanca.',
      image: 'assets/mascote-reading-final.png'
    }
  ];

  function renderSmileGuide() {
    var step = smileGuide[smileStep] || smileGuide[0];
    if (smileTitle) smileTitle.textContent = step.title;
    if (smileBody) smileBody.textContent = step.body;
    if (smileAvatar) smileAvatar.src = step.image;
    if (smilePrev) smilePrev.disabled = smileStep === 0;
    if (smileNext) smileNext.textContent = smileStep === smileGuide.length - 1 ? 'Fechar' : 'Proximo';
    if (smileSteps) {
      smileSteps.textContent = '';
      smileGuide.forEach(function (_, index) {
        var dot = document.createElement('span');
        if (index === smileStep) dot.className = 'is-active';
        smileSteps.appendChild(dot);
      });
    }
  }

  function openSmileGuide() {
    if (!smileModal) return;
    smileStep = 0;
    renderSmileGuide();
    smileModal.hidden = false;
    if (smileClose) smileClose.focus();
  }

  function closeSmileGuide() {
    if (!smileModal || smileModal.hidden) return;
    smileModal.hidden = true;
    if (smileOpen && typeof smileOpen.focus === 'function') smileOpen.focus();
  }

  if (smileOpen) smileOpen.addEventListener('click', openSmileGuide);
  if (smileClose) smileClose.addEventListener('click', closeSmileGuide);
  if (smilePrev) {
    smilePrev.addEventListener('click', function () {
      if (smileStep > 0) smileStep -= 1;
      renderSmileGuide();
    });
  }
  if (smileNext) {
    smileNext.addEventListener('click', function () {
      if (smileStep >= smileGuide.length - 1) {
        closeSmileGuide();
        return;
      }
      smileStep += 1;
      renderSmileGuide();
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
    if (action && action.kind === 'safe-status') {
      if (window.setAtomicCoreState) window.setAtomicCoreState('action');
      if (window.highlightAtomicAgents) window.highlightAtomicAgents(feature.agents || []);
      loadSafeStatusPanel();
      window.setTimeout(function () { if (window.resetAtomicCore) window.resetAtomicCore(); }, 900);
      return;
    }
    if (!action || !action.path) return;
    if (action.method && action.method !== 'GET') {
      appendMessage('error', 'BLOQUEADO', 'Ação crítica bloqueada nesta etapa: ' + action.label);
      return;
    }
    if (window.setAtomicCoreState) window.setAtomicCoreState('action');
    if (window.highlightAtomicAgents) window.highlightAtomicAgents(feature.agents || []);
    appendMessage('pending', feature.title.toUpperCase(), 'Consultando ' + action.path + '...');
    apiRequest(action.path).then(function (data) {
      // Order matters: appendMessage() scrolls the new chat bubble into view
      // itself — call it BEFORE renderFeatureActionViz() so the chart's own
      // scrollIntoView() (inside showFeatureViz) runs last and wins, leaving
      // the chart visible instead of snapping back to the chat message.
      appendMessage('assistant', action.label.toUpperCase(), summarizeResult(data));
      renderFeatureActionViz(action, data);
    }).catch(function (err) {
      hideFeatureViz();
      appendMessage('error', action.label.toUpperCase(), err && err.message ? err.message : String(err));
    }).then(function () {
      if (window.resetAtomicCore) window.resetAtomicCore();
    });
  }

  function selectFeature(key, announce) {
    var feature = featureMap[key] || featureMap.chat;
    activeFeature = featureMap[key] ? key : 'chat';
    if (appShell) appShell.setAttribute('data-active-feature', activeFeature);
    document.querySelectorAll('[data-feature]').forEach(function (node) {
      node.classList.toggle('is-active', node.getAttribute('data-feature') === activeFeature);
    });
    if (featureTitle) featureTitle.textContent = feature.title;
    if (featureBody) featureBody.textContent = feature.text;
    if (featureStatus) featureStatus.textContent = feature.status;
    if (featureClose) featureClose.hidden = activeFeature === 'chat';
    // DECISION-022: cabecalho generico (marca + status do agente) e o
    // decagono so pertencem ao Chat -- qualquer outra aba mostra um
    // cabecalho curto reaproveitando featureMap[key].title/.status (mesmo
    // texto ja usado em #vcFeatureTitle/#vcFeatureStatus, nao inventa copy).
    var isChatTab = activeFeature === 'chat';
    if (brandLockupEl) brandLockupEl.hidden = !isChatTab;
    if (agentBadgeEl) agentBadgeEl.hidden = !isChatTab;
    if (pageHeadEl) pageHeadEl.hidden = isChatTab;
    if (pageHeadTitleEl) pageHeadTitleEl.textContent = feature.title;
    if (pageHeadStatusEl) pageHeadStatusEl.textContent = feature.status;
    if (featurePanel) featurePanel.hidden = activeFeature === 'factory';
    hideFeatureViz();
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
      if (activeFeature === 'settings') {
        loadSettingsList();
        if (accountSkipNextRefresh) accountSkipNextRefresh = false;
        else refreshAccountStatus();
      }
    }
    if (vaultRollback) {
      vaultRollback.hidden = activeFeature !== 'vault';
      if (activeFeature === 'vault') { if (vaultStatus) vaultStatus.textContent = ''; loadVaultSnapshots(); }
    }
    if (metricsPanel) {
      metricsPanel.hidden = activeFeature !== 'metrics';
      if (activeFeature === 'metrics') startMetricsPolling(); else stopMetricsPolling();
    }
    updateFeatureWidth();
    if (safeStatusPanel) {
      safeStatusPanel.hidden = activeFeature !== 'security';
      if (activeFeature === 'security') loadSafeStatusPanel();
    }
    if (secretGuardCard) {
      secretGuardCard.hidden = activeFeature !== 'security';
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
      if (chatStage) chatStage.style.display = '';
      if (sfSection) sfSection.hidden = false;
    } else {
      if (chatStage) chatStage.style.display = '';
      if (sfSection) sfSection.hidden = true;
    }
    if (window.highlightAtomicAgents) window.highlightAtomicAgents(feature.agents || []);
    updateAtomicCollapseState();
    if (announce) appendMessage('pending', feature.title.toUpperCase(), feature.text);
  }

  // Compartilhado pelos 5 painéis de ação irreversível (GitHub PR, Apply-Fix,
  // Vault Rollback, Agent-Apply, Dry-Run): desenha o botão "Aplicando..."
  // desabilitado (requisição em andamento) ou "Confirmar"+"Cancelar"
  // (confirmação pendente) — o único trecho de fato idêntico entre os 5.
  // Retorna true se desenhou algo, false se nenhum dos dois estados se
  // aplica — o chamador então desenha seu próprio estado ocioso (que varia
  // por painel: texto do botão, validação de campo, efeitos colaterais de
  // status), sem tentar forçar uma forma única onde o comportamento diverge.
  function renderConfirmOrBusy(container, opts) {
    container.textContent = '';
    if (opts.busy) {
      var busyBtn = document.createElement('button');
      busyBtn.type = 'button';
      busyBtn.disabled = true;
      busyBtn.textContent = opts.busyLabel;
      container.appendChild(busyBtn);
      return true;
    }
    if (opts.confirmPending) {
      var confirmBtn = document.createElement('button');
      confirmBtn.type = 'button';
      if (opts.confirmDisabled) confirmBtn.disabled = true;
      confirmBtn.textContent = opts.confirmLabel;
      confirmBtn.addEventListener('click', opts.onConfirm);
      var cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.textContent = 'Cancelar';
      cancelBtn.addEventListener('click', opts.onCancel);
      container.appendChild(confirmBtn);
      container.appendChild(cancelBtn);
      return true;
    }
    return false;
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
    if (renderConfirmOrBusy(prActionsEl, {
      busy: prRequestInFlight,
      busyLabel: 'Criando PR...',
      confirmPending: prConfirmPending,
      confirmLabel: 'Confirmar criação de PR em ' + prRepoInput.value.trim(),
      onConfirm: submitGithubPr,
      onCancel: function () { prConfirmPending = false; renderPrActions(); }
    })) return;

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
    if (renderConfirmOrBusy(applyFixActionsEl, {
      busy: applyFixRequestInFlight,
      busyLabel: 'Aplicando fix...',
      confirmPending: applyFixConfirmPending,
      confirmDisabled: !applyFixConfirmReady(),
      confirmLabel: applyFixConfirmReady() ? 'APLICAR FIX em ' + applyFixFile.value.trim() : 'Digite: APLICAR FIX',
      onConfirm: submitApplyFix,
      onCancel: function () {
        applyFixConfirmPending = false;
        if (applyFixStatus) applyFixStatus.textContent = '';
        renderApplyFixActions();
      }
    })) return;

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
      lastFeatureTrigger = node;
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

  function closeContextPanel() {
    if (activeFeature === 'chat') return;
    selectFeature('chat', false);
    if (lastFeatureTrigger && typeof lastFeatureTrigger.focus === 'function') lastFeatureTrigger.focus();
  }

  if (featureClose) featureClose.addEventListener('click', closeContextPanel);
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      if (smileModal && !smileModal.hidden) {
        closeSmileGuide();
        return;
      }
      closeContextPanel();
    }
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

  // ARCHITECTURAL PRINCIPLE-004 (ver DECISIONS.md, achado 2026-07-12):
  // #vcChatScroll parou de rolar por conta própria (rolagem real de página
  // agora), então o composer (position:sticky) precisa de espaço reservado
  // no fim do conteúdo pra não cobrir a última parte dele quando "gruda" no
  // rodapé — regra dura #12 da spec, antes resolvida isolando o scroll,
  // agora resolvida sincronizando padding-bottom com a altura real do
  // composer (varia com o textarea/chips). ResizeObserver, não um valor
  // fixo, porque o composer redimensiona (resizePrompt) e não há evento
  // "de altura mudou" nativo mais simples que cubra os dois casos.
  if (composer && chatScroll && window.ResizeObserver) {
    var syncComposerSpace = new ResizeObserver(function () {
      chatScroll.style.paddingBottom = (composer.offsetHeight + 24) + 'px';
    });
    syncComposerSpace.observe(composer);
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

  function safeStatusGet(path) {
    return apiRequest(path, { method: 'GET' });
  }

  function summarizeResult(data) {
    if (!data) return 'Sem payload.';
    if (Array.isArray(data.agents)) return data.agents.length + ' agente(s) reportado(s). Veja o gráfico no painel.';
    if (Array.isArray(data.tools)) return data.tools.length + ' ferramenta(s) no marketplace. Veja o gráfico no painel.';
    if (Array.isArray(data.history)) return data.history.length + ' evento(s) de segurança. Veja o gráfico no painel.';
    if (data.runtime) return 'Snapshot runtime recebido: CPU, memória, heap e uptime visualizados na aba Métricas.';
    if (data.connected !== undefined) return (data.connected ? 'Agente conectado.' : 'Agente desconectado.') + ' Modo: ' + (data.mode || '—') + '.';
    if (data.deployment_frequency !== undefined) return 'DORA metrics recebidas. Cards e gráficos disponíveis na aba Métricas.';
    if (data.ok === true) return 'Consulta concluída. Payload bruto fica restrito ao modo diagnóstico quando existir toggle.';
    if (typeof data.status === 'string') return data.status;
    return 'Consulta retornou dados estruturados.';
  }

  function buildJsonToggle(data) {
    var label = document.createElement('label');
    label.className = 'vc-metrics-raw-toggle';
    var checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    var pre = document.createElement('pre');
    pre.className = 'vc-metrics-raw';
    pre.hidden = true;
    pre.textContent = JSON.stringify(data, null, 2);
    checkbox.addEventListener('change', function () { pre.hidden = !checkbox.checked; });
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(' Ver JSON bruto (diagnóstico)'));
    var wrap = document.createDocumentFragment();
    wrap.appendChild(label);
    wrap.appendChild(pre);
    return wrap;
  }

  function showFeatureViz(title, renderFn, rawData) {
    if (!featureViz) return;
    featureViz.textContent = '';
    featureViz.hidden = false;
    var h = document.createElement('h4');
    h.textContent = title;
    featureViz.appendChild(h);
    renderFn(featureViz);
    if (rawData !== undefined) featureViz.appendChild(buildJsonToggle(rawData));
    // Charts render at the bottom of a combined chat+panel scroll region
    // (#vcChatScroll) — without this, the user has to manually scroll past
    // the message stream + panel header/actions to ever see them.
    if (featureViz.scrollIntoView) featureViz.scrollIntoView({ block: 'start' });
  }

  function hideFeatureViz() {
    if (!featureViz) return;
    featureViz.textContent = '';
    featureViz.hidden = true;
  }

  var SAFE_STATUS_ENDPOINTS = [
    '/api/status',
    '/api/queue/status',
    '/api/agents/status',
    '/api/jobs/latest',
    '/api/heartbeat'
  ];

  function summarizeSafeStatus(data) {
    if (!data) return 'sem payload';
    if (typeof data.status === 'string') return data.status;
    if (typeof data.state === 'string') return data.state;
    if (typeof data.ok === 'boolean') return data.ok ? 'ok' : 'not ok';
    return summarizeResult(data).replace(/\s+/g, ' ').slice(0, 140);
  }

  function renderSafeStatusRow(endpoint, state, detail) {
    if (!safeStatusList) return;
    var row = document.createElement('div');
    var name = document.createElement('strong');
    var text = document.createElement('span');
    row.className = 'vc-safe-status-row';
    row.setAttribute('data-state', state);
    name.textContent = endpoint;
    text.textContent = detail;
    row.appendChild(name);
    row.appendChild(text);
    safeStatusList.appendChild(row);
  }

  function renderSafeStatusViz(results) {
    if (!safeStatusViz) return;
    safeStatusViz.textContent = '';
    var counts = { ok: 0, local: 0 };
    results.forEach(function (r) { counts[r.state] = (counts[r.state] || 0) + 1; });
    safeStatusViz.appendChild(metricCharts.donut({
      title: 'Cobertura de políticas de segurança',
      data: [
        { label: 'ok', value: counts.ok, color: '#34d399' },
        { label: 'fallback local', value: counts.local, color: '#facc15' }
      ],
      emptyMessage: 'Nenhuma checagem concluída ainda.',
      ariaLabel: 'Donut de cobertura das checagens de status seguro'
    }));
    safeStatusViz.appendChild(metricCharts.gauge({
      title: 'Conformidade visual',
      value: results.length ? (counts.ok / results.length * 100) : null,
      max: 100,
      emptyMessage: 'Sem checagens concluídas para calcular conformidade.',
      ariaLabel: 'Gauge de conformidade visual das checagens de status seguro'
    }));
    safeStatusViz.appendChild(metricCharts.timeline({
      title: 'Últimas verificações',
      data: results.map(function (r) { return { tier: r.state === 'ok' ? 'ok' : 'warn', label: r.endpoint + ': ' + r.state }; }),
      emptyMessage: 'Sem verificações registradas ainda.',
      ariaLabel: 'Timeline das verificações de status seguro'
    }));
  }

  function loadSafeStatusPanel() {
    if (!safeStatusPanel || !safeStatusList) return;
    safeStatusPanel.hidden = false;
    safeStatusList.textContent = '';
    if (safeStatusViz) safeStatusViz.textContent = '';
    renderSafeStatusRow('policy', 'ok', 'modo leitura: somente GET, sem patch, deploy ou missão paga');
    var results = [{ state: 'ok', endpoint: 'policy' }];
    var pending = SAFE_STATUS_ENDPOINTS.length;
    function checkDone() {
      pending--;
      if (pending === 0) renderSafeStatusViz(results);
    }
    SAFE_STATUS_ENDPOINTS.forEach(function (endpoint) {
      safeStatusGet(endpoint).then(function (data) {
        renderSafeStatusRow(endpoint, 'ok', summarizeSafeStatus(data));
        results.push({ state: 'ok', endpoint: endpoint });
        checkDone();
      }).catch(function () {
        renderSafeStatusRow(endpoint, 'local', 'indisponível localmente — fallback visual seguro');
        results.push({ state: 'local', endpoint: endpoint });
        checkDone();
      });
    });
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
      if (document.hidden) {
        stopAgentPolling();
        stopMetricsPolling();
      } else {
        startAgentPolling();
        if (activeFeature === 'metrics') startMetricsPolling();
      }
    });
  }
  startAgentPolling();

  // Métricas — camada visual sobre os endpoints de observabilidade já usados pela aba
  // (item 1 da paridade legado, "Métricas — visual" em docs/LEGACY_DESIGN_
  // REFERENCE.md): /api/metrics/agents, /api/metrics/summary,
  // /api/metrics/memory, /api/dora-metrics, /api/agent/status.
  // Backend intocado — os endpoints já existem e já respondiam em produção.
  // Polling só roda com a aba Métricas ativa E a página visível (>=10s,
  // pausa em document.hidden — mesmo padrão do badge de conexão acima).
  var METRICS_POLL_MS = 12000;
  var metricsPollTimer = null;
  var metricsLastResults = null; // último snapshot bem-sucedido (p/ toggle JSON bruto)

  function humanizeMsAgo(ms) {
    if (ms === null || ms === undefined) return 'nunca visto';
    if (ms < 1000) return 'agora mesmo';
    var s = Math.round(ms / 1000);
    if (s < 60) return 'há ' + s + 's';
    var m = Math.round(s / 60);
    if (m < 60) return 'há ' + m + 'min';
    var h = Math.round(m / 60);
    return 'há ' + h + 'h';
  }

  function statusTier(status) {
    if (status === 'ok') return 'ok';
    if (status === 'binary_not_found' || status === 'PENDING_EVIDENCE') return 'warn';
    if (status === 'pending' || status === 'download_ready') return 'warn';
    if (status === 'offline' || status === 'unavailable') return 'error';
    return 'error';
  }

  function numberOrNull(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }

  function parseMetricNumber(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value !== 'string') return null;
    var match = value.replace(',', '.').match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : null;
  }

  function chartColor(index) {
    return ['#a855f7', '#22d3ee', '#34d399', '#facc15', '#fb7185', '#38bdf8'][index % 6];
  }

  function chartCard(opts) {
    var card = document.createElement('div');
    card.className = 'vc-metric-chart';
    card.setAttribute('role', 'img');
    card.setAttribute('aria-label', opts.ariaLabel || opts.title || 'Gráfico de métrica');
    var h = document.createElement('h6');
    h.textContent = opts.title || 'Métrica';
    card.appendChild(h);
    if (opts.description) {
      var p = document.createElement('p');
      p.className = 'vc-chart-desc';
      p.textContent = opts.description;
      card.appendChild(p);
    }
    return card;
  }

  function renderEmptyChart(opts) {
    var card = chartCard(opts || {});
    card.classList.add('vc-metric-chart-empty');
    var msg = document.createElement('span');
    msg.textContent = (opts && opts.emptyMessage) || 'Sem dado estruturado suficiente para gráfico.';
    card.appendChild(msg);
    return card;
  }

  function renderLegend(items) {
    var legend = document.createElement('div');
    legend.className = 'vc-chart-legend';
    (items || []).forEach(function (item, index) {
      var row = document.createElement('span');
      var swatch = document.createElement('i');
      swatch.style.background = item.color || chartColor(index);
      row.appendChild(swatch);
      row.appendChild(document.createTextNode(item.label + (item.value !== undefined ? ': ' + item.value : '')));
      legend.appendChild(row);
    });
    return legend;
  }

  function renderBarChart(opts) {
    var rows = (opts.data || []).filter(function (d) { return numberOrNull(d.value) !== null; });
    if (!rows.length) return renderEmptyChart(opts);
    var max = numberOrNull(opts.max);
    if (max === null) {
      max = Math.max.apply(null, rows.map(function (d) { return Math.abs(d.value); }));
      if (!max) return renderEmptyChart(opts);
    }
    var card = chartCard(opts);
    var list = document.createElement('div');
    list.className = 'vc-bar-chart';
    rows.forEach(function (d, index) {
      var row = document.createElement('div');
      row.className = 'vc-bar-row';
      var label = document.createElement('span');
      label.textContent = d.label;
      var track = document.createElement('div');
      track.className = 'vc-chart-track';
      var fill = document.createElement('div');
      fill.className = 'vc-chart-fill';
      fill.style.width = Math.min(100, Math.max(2, Math.abs(d.value) / max * 100)) + '%';
      fill.style.background = d.color || chartColor(index);
      track.appendChild(fill);
      var value = document.createElement('strong');
      value.textContent = (d.display !== undefined ? d.display : d.value) + (opts.unit || '');
      row.appendChild(label);
      row.appendChild(track);
      row.appendChild(value);
      list.appendChild(row);
    });
    card.appendChild(list);
    return card;
  }

  function renderDonutChart(opts) {
    var rows = (opts.data || []).filter(function (d) { return numberOrNull(d.value) !== null && d.value > 0; });
    if (!rows.length) return renderEmptyChart(opts);
    var total = rows.reduce(function (sum, d) { return sum + d.value; }, 0);
    var card = chartCard(opts);
    var wrap = document.createElement('div');
    wrap.className = 'vc-donut-wrap';
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 42 42');
    var bg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    bg.setAttribute('cx', '21'); bg.setAttribute('cy', '21'); bg.setAttribute('r', '15.9');
    bg.setAttribute('fill', 'none'); bg.setAttribute('stroke', 'rgba(255,255,255,.08)'); bg.setAttribute('stroke-width', '5');
    svg.appendChild(bg);
    var offset = 25;
    rows.forEach(function (d, index) {
      var pct = d.value / total * 100;
      var seg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      seg.setAttribute('cx', '21'); seg.setAttribute('cy', '21'); seg.setAttribute('r', '15.9');
      seg.setAttribute('fill', 'none'); seg.setAttribute('stroke', d.color || chartColor(index)); seg.setAttribute('stroke-width', '5');
      seg.setAttribute('stroke-dasharray', pct + ' ' + (100 - pct));
      seg.setAttribute('stroke-dashoffset', String(offset));
      seg.setAttribute('pathLength', '100');
      svg.appendChild(seg);
      offset -= pct;
    });
    var center = document.createElement('strong');
    center.textContent = String(total);
    wrap.appendChild(svg);
    wrap.appendChild(center);
    card.appendChild(wrap);
    card.appendChild(renderLegend(rows.map(function (d, i) { return { label: d.label, value: d.value, color: d.color || chartColor(i) }; })));
    return card;
  }

  function renderGauge(opts) {
    var value = numberOrNull(opts.value);
    if (value === null) return renderEmptyChart(opts);
    var max = numberOrNull(opts.max) || 100;
    var pct = Math.min(100, Math.max(0, value / max * 100));
    var card = chartCard(opts);
    var gauge = document.createElement('div');
    gauge.className = 'vc-gauge';
    gauge.style.setProperty('--gauge-value', pct + '%');
    gauge.style.setProperty('--gauge-color', opts.color || (pct > 85 ? '#f87171' : pct > 65 ? '#facc15' : '#34d399'));
    var center = document.createElement('strong');
    center.textContent = (opts.display !== undefined ? opts.display : Math.round(value)) + (opts.unit || '%');
    gauge.appendChild(center);
    card.appendChild(gauge);
    return card;
  }

  function renderSparkline(opts) {
    var values = (opts.data || []).map(numberOrNull).filter(function (v) { return v !== null; });
    if (!values.length) return renderEmptyChart(opts);
    var card = chartCard(opts);
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 120 40');
    svg.classList.add('vc-sparkline');
    var max = Math.max.apply(null, values);
    var min = Math.min.apply(null, values);
    var spread = max - min || 1;
    var points = values.map(function (v, i) {
      var x = values.length === 1 ? 60 : i / (values.length - 1) * 116 + 2;
      var y = 38 - ((v - min) / spread * 34);
      return x.toFixed(2) + ',' + y.toFixed(2);
    }).join(' ');
    var poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    poly.setAttribute('points', points);
    poly.setAttribute('fill', 'none');
    poly.setAttribute('stroke', opts.color || '#22d3ee');
    poly.setAttribute('stroke-width', '2.2');
    poly.setAttribute('stroke-linecap', 'round');
    poly.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(poly);
    card.appendChild(svg);
    return card;
  }

  function renderTimeline(opts) {
    var items = opts.data || [];
    if (!items.length) return renderEmptyChart(opts);
    var card = chartCard(opts);
    var line = document.createElement('ol');
    line.className = 'vc-chart-timeline';
    items.forEach(function (item) {
      var li = document.createElement('li');
      var dot = document.createElement('i');
      dot.className = 'vc-metrics-status-dot vc-metrics-status-' + (item.tier || 'warn');
      var text = document.createElement('span');
      text.textContent = item.label;
      li.appendChild(dot);
      li.appendChild(text);
      line.appendChild(li);
    });
    card.appendChild(line);
    return card;
  }

  var metricCharts = {
    bar: renderBarChart,
    donut: renderDonutChart,
    gauge: renderGauge,
    sparkline: renderSparkline,
    timeline: renderTimeline,
    empty: renderEmptyChart,
    legend: renderLegend
  };

  function statusLabel(status) {
    var tier = statusTier(status);
    if (tier === 'ok') return 'ok';
    if (status === 'binary_not_found') return 'warning';
    if (status === 'PENDING_EVIDENCE' || status === 'pending') return 'pending';
    if (status === 'download_ready') return 'offline';
    return 'error';
  }

  function buildAgentCharts(list, activeProviders) {
    var wrap = document.createElement('div');
    wrap.className = 'vc-metric-chart-grid';
    var statusCounts = {};
    var providerCounts = {};
    var numericCosts = [];
    (list || []).forEach(function (agent) {
      var label = statusLabel(agent.status || 'unknown');
      statusCounts[label] = (statusCounts[label] || 0) + 1;
      if (Array.isArray(agent.active_providers)) {
        agent.active_providers.forEach(function (provider) { providerCounts[provider] = (providerCounts[provider] || 0) + 1; });
      }
      if (typeof agent.cost_usd === 'number') numericCosts.push(agent);
    });
    (activeProviders || []).forEach(function (provider) { providerCounts[provider] = providerCounts[provider] || 0; });
    wrap.appendChild(metricCharts.donut({
      title: 'Status dos agentes',
      data: ['ok', 'warning', 'pending', 'error', 'offline'].map(function (key) { return { label: key, value: statusCounts[key] || 0 }; }),
      emptyMessage: 'Nenhum agente reportado.',
      ariaLabel: 'Donut de distribuição de status dos agentes'
    }));
    wrap.appendChild(metricCharts.bar({
      title: 'Custo por agente',
      data: numericCosts.map(function (agent) { return { label: agent.name || 'agente', value: agent.cost_usd, display: '$' + agent.cost_usd.toFixed(3) }; }),
      emptyMessage: 'Sem dados numéricos de custo. Null não é tratado como zero.',
      ariaLabel: 'Barras horizontais de custo por agente'
    }));
    wrap.appendChild(metricCharts.bar({
      title: 'Providers ativos',
      data: Object.keys(providerCounts).map(function (key) { return { label: key, value: providerCounts[key], display: providerCounts[key] + ' agente(s)' }; }),
      emptyMessage: 'Nenhum provider ativo reportado.',
      ariaLabel: 'Barras de providers ativos por agente'
    }));
    wrap.appendChild(metricCharts.bar({
      title: 'Ranking de atividade',
      description: 'Score visual derivado do status e providers reportados; não substitui telemetria real.',
      data: (list || []).map(function (agent) {
        var score = statusTier(agent.status) === 'ok' ? 2 : 1;
        if (Array.isArray(agent.active_providers)) score += agent.active_providers.length;
        return { label: agent.name || 'agente', value: score, display: score + ' pts' };
      }),
      emptyMessage: 'Sem agentes para ranquear.',
      ariaLabel: 'Ranking visual de atividade dos agentes'
    }));
    return wrap;
  }

  function renderFeatureActionViz(action, data) {
    if (!action || !data) return hideFeatureViz();
    if (action.path === '/api/metrics/agents' && Array.isArray(data.agents)) {
      showFeatureViz('Agentes — visualização segura', function (root) {
        root.appendChild(buildAgentCharts(data.agents, data.active_llm_providers || []));
      }, data);
      return;
    }
    if (action.path === '/api/agent/status') {
      showFeatureViz('Conectividade — visualização segura', function (root) {
        root.appendChild(metricCharts.gauge({
          title: 'Saúde do agente',
          value: data.connected ? 100 : 0,
          max: 100,
          display: data.connected ? 'online' : 'offline',
          unit: '',
          ariaLabel: 'Indicador radial de conectividade do Vision Agent Local'
        }));
        root.appendChild(metricCharts.timeline({
          title: 'Último heartbeat',
          data: [{ tier: data.connected ? 'ok' : 'warn', label: 'Último sinal: ' + humanizeMsAgo(data.last_seen_ms_ago) }],
          ariaLabel: 'Timeline de heartbeat do Vision Agent Local'
        }));
      }, data);
      return;
    }
    if (action.path === '/api/tools/marketplace' && Array.isArray(data.tools)) {
      var statusCounts = {};
      data.tools.forEach(function (tool) { statusCounts[tool.status || 'unknown'] = (statusCounts[tool.status || 'unknown'] || 0) + 1; });
      showFeatureViz('Tools — marketplace visual', function (root) {
        root.appendChild(metricCharts.donut({
          title: 'Tools por status',
          data: Object.keys(statusCounts).map(function (key) { return { label: key, value: statusCounts[key] }; }),
          ariaLabel: 'Donut de ferramentas por status'
        }));
        root.appendChild(metricCharts.bar({
          title: 'Disponibilidade por adapter',
          data: data.tools.map(function (tool) { return { label: tool.name || tool.id, value: tool.status === 'ready-adapter' ? 1 : 0, display: tool.status || 'unknown' }; }),
          max: 1,
          ariaLabel: 'Barras de disponibilidade das ferramentas'
        }));
      }, data);
      return;
    }
    if (action.path === '/api/security/history' && Array.isArray(data.history)) {
      var fixed = data.history.filter(function (event) { return event.fixed === true; }).length;
      showFeatureViz('Security — histórico visual', function (root) {
        root.appendChild(metricCharts.donut({
          title: 'Eventos fixados vs pendentes',
          data: [{ label: 'fixed', value: fixed }, { label: 'pending', value: Math.max(0, data.history.length - fixed) }],
          emptyMessage: 'Sem eventos de segurança ainda.',
          ariaLabel: 'Donut de eventos de segurança fixados e pendentes'
        }));
        root.appendChild(metricCharts.bar({
          title: 'Score por evento',
          data: data.history.slice(-8).map(function (event, index) {
            var score = numberOrNull(event.security_score) || 0;
            return { label: event.rule_id || event.type || ('evento ' + (index + 1)), value: score, display: score + '%' };
          }),
          max: 100,
          emptyMessage: 'Sem score estruturado.',
          ariaLabel: 'Barras de score de segurança por evento'
        }));
      }, data);
      return;
    }
    hideFeatureViz();
  }

  function setMetricsRawText() {
    if (!metricsRaw) return;
    metricsRaw.textContent = metricsLastResults ? JSON.stringify(metricsLastResults, null, 2) : 'Sem dados carregados ainda.';
  }

  if (metricsRawToggle) {
    metricsRawToggle.addEventListener('change', function () {
      if (metricsRaw) metricsRaw.hidden = !metricsRawToggle.checked;
      if (metricsRawToggle.checked) setMetricsRawText();
    });
  }

  function renderMetricsAgents(agentsData) {
    if (!metricsAgentList) return;
    metricsAgentList.textContent = '';
    var list = agentsData && Array.isArray(agentsData.agents) ? agentsData.agents : null;
    if (!list) {
      var failMsg = document.createElement('p');
      failMsg.className = 'vc-metrics-empty';
      failMsg.textContent = 'Falha ao carregar métricas de agentes.';
      metricsAgentList.appendChild(failMsg);
      if (metricsTotal) metricsTotal.textContent = '';
      return;
    }
    if (!list.length) {
      var emptyMsg = document.createElement('p');
      emptyMsg.className = 'vc-metrics-empty';
      emptyMsg.textContent = 'Nenhum agente reportado.';
      metricsAgentList.appendChild(emptyMsg);
      if (metricsTotal) metricsTotal.textContent = '';
      return;
    }
    var numericCosts = list.filter(function (a) { return typeof a.cost_usd === 'number'; }).map(function (a) { return a.cost_usd; });
    var maxCost = numericCosts.length ? Math.max.apply(null, numericCosts.map(Math.abs)) || 1 : 1;
    metricsAgentList.appendChild(buildAgentCharts(list, agentsData.active_llm_providers || []));
    list.forEach(function (agent) {
      var row = document.createElement('div');
      row.className = 'vc-metrics-agent-row';

      var head = document.createElement('div');
      head.className = 'vc-metrics-agent-head';
      var dot = document.createElement('span');
      dot.className = 'vc-metrics-status-dot vc-metrics-status-' + statusTier(agent.status);
      var name = document.createElement('strong');
      name.textContent = agent.name || '—';
      var badge = document.createElement('span');
      badge.className = 'vc-metrics-status-badge vc-metrics-status-' + statusTier(agent.status);
      badge.textContent = agent.status || 'unknown';
      head.appendChild(dot);
      head.appendChild(name);
      head.appendChild(badge);
      row.appendChild(head);

      if (agent.note) {
        var note = document.createElement('p');
        note.className = 'vc-metrics-agent-note';
        note.textContent = agent.note;
        row.appendChild(note);
      }

      if (Array.isArray(agent.active_providers) && agent.active_providers.length) {
        var chips = document.createElement('div');
        chips.className = 'vc-metrics-chips';
        agent.active_providers.forEach(function (p) {
          var chip = document.createElement('span');
          chip.className = 'vc-metrics-chip';
          chip.textContent = p;
          chips.appendChild(chip);
        });
        row.appendChild(chips);
      }

      var costWrap = document.createElement('div');
      costWrap.className = 'vc-metrics-cost';
      if (typeof agent.cost_usd === 'number') {
        var bar = document.createElement('div');
        bar.className = 'vc-metrics-bar';
        var fill = document.createElement('div');
        fill.className = 'vc-metrics-bar-fill';
        var pct = Math.min(100, Math.max(agent.cost_usd === 0 ? 0 : 4, (Math.abs(agent.cost_usd) / maxCost) * 100));
        fill.style.width = pct + '%';
        bar.appendChild(fill);
        var costLabel = document.createElement('span');
        costLabel.textContent = '$' + agent.cost_usd.toFixed(3);
        costWrap.appendChild(bar);
        costWrap.appendChild(costLabel);
      } else {
        var noCost = document.createElement('span');
        noCost.className = 'vc-metrics-no-cost';
        noCost.textContent = 'sem dados de custo';
        costWrap.appendChild(noCost);
      }
      row.appendChild(costWrap);

      metricsAgentList.appendChild(row);
    });

    if (metricsTotal) {
      metricsTotal.textContent = '';
      var totalLabel = document.createElement('strong');
      totalLabel.textContent = 'TOTAL PIPELINE: ';
      var totalValue = document.createElement('span');
      totalValue.textContent = numericCosts.length
        ? '$' + numericCosts.reduce(function (a, b) { return a + b; }, 0).toFixed(3)
        : 'sem dados de custo';
      metricsTotal.appendChild(totalLabel);
      metricsTotal.appendChild(totalValue);
    }
  }

  var DORA_FIELDS = [
    { key: 'deployment_frequency', label: 'Deploy Frequency' },
    { key: 'lead_time', label: 'Lead Time' },
    { key: 'mttr', label: 'MTTR' },
    { key: 'change_failure_rate', label: 'Change Failure Rate' },
    { key: 'pass_gold_count_30d', label: 'PASS GOLD (30d)' },
    { key: 'total_pass_gold', label: 'Total PASS GOLD' }
  ];

  function renderMetricsDora(dora) {
    if (!metricsDoraGrid) return;
    metricsDoraGrid.textContent = '';
    if (!dora) {
      var fail = document.createElement('p');
      fail.className = 'vc-metrics-empty';
      fail.textContent = 'Falha ao carregar DORA metrics.';
      metricsDoraGrid.appendChild(fail);
      return;
    }
    DORA_FIELDS.forEach(function (field) {
      var card = document.createElement('div');
      card.className = 'vc-metrics-dora-card';
      var label = document.createElement('span');
      label.className = 'vc-metrics-dora-label';
      label.textContent = field.label;
      var value = document.createElement('strong');
      value.textContent = dora[field.key] !== undefined && dora[field.key] !== null ? String(dora[field.key]) : '—';
      card.appendChild(label);
      card.appendChild(value);
      metricsDoraGrid.appendChild(card);
    });
    var deploys = parseMetricNumber(dora.deployment_frequency);
    var leadTime = parseMetricNumber(dora.lead_time);
    var mttr = parseMetricNumber(dora.mttr);
    var failureRate = parseMetricNumber(dora.change_failure_rate);
    metricsDoraGrid.appendChild(metricCharts.gauge({
      title: 'Change failure rate',
      value: failureRate,
      max: 100,
      emptyMessage: 'Sem taxa numérica de falha para gauge.',
      ariaLabel: 'Gauge de change failure rate'
    }));
    metricsDoraGrid.appendChild(metricCharts.bar({
      title: 'DORA comparativo',
      data: [
        { label: 'deploys 30d', value: deploys, display: deploys !== null ? deploys : 'sem dados' },
        { label: 'lead time h', value: leadTime, display: leadTime !== null ? leadTime + 'h' : 'sem dados' },
        { label: 'MTTR min', value: mttr, display: mttr !== null ? mttr + 'min' : 'sem dados' },
        { label: 'PASS GOLD 30d', value: numberOrNull(dora.pass_gold_count_30d), display: dora.pass_gold_count_30d !== undefined ? dora.pass_gold_count_30d : 'sem dados' },
        { label: 'PASS GOLD total', value: numberOrNull(dora.total_pass_gold), display: dora.total_pass_gold !== undefined ? dora.total_pass_gold : 'sem dados' }
      ],
      emptyMessage: 'DORA retornou só estados vazios honestos.',
      ariaLabel: 'Barras comparativas de DORA metrics'
    }));
    metricsDoraGrid.appendChild(metricCharts.timeline({
      title: 'Pipeline DORA',
      data: [
        { tier: deploys ? 'ok' : 'warn', label: 'Deploy frequency: ' + String(dora.deployment_frequency || 'sem dados') },
        { tier: leadTime ? 'ok' : 'warn', label: 'Lead time: ' + String(dora.lead_time || 'sem dados') },
        { tier: mttr ? 'ok' : 'warn', label: 'MTTR: ' + String(dora.mttr || 'sem dados') }
      ],
      ariaLabel: 'Timeline textual de disponibilidade de DORA metrics'
    }));
  }

  function appendMetricsInfoCard(parent, labelText, valueText) {
    var card = document.createElement('div');
    card.className = 'vc-metrics-info-card';
    var label = document.createElement('span');
    label.className = 'vc-metrics-info-label';
    label.textContent = labelText;
    var value = document.createElement('strong');
    value.textContent = valueText === undefined || valueText === null || valueText === '' ? '—' : String(valueText);
    card.appendChild(label);
    card.appendChild(value);
    parent.appendChild(card);
  }

  function renderMetricsRuntime(summary) {
    if (!metricsRuntimeGrid) return;
    metricsRuntimeGrid.textContent = '';
    var runtime = summary && summary.runtime ? summary.runtime : null;
    if (!runtime) {
      var fail = document.createElement('p');
      fail.className = 'vc-metrics-empty';
      fail.textContent = 'Falha ao carregar runtime.';
      metricsRuntimeGrid.appendChild(fail);
      return;
    }
    appendMetricsInfoCard(metricsRuntimeGrid, 'CPU', runtime.cpu !== undefined ? runtime.cpu + '%' : null);
    appendMetricsInfoCard(metricsRuntimeGrid, 'Memória', runtime.memory !== undefined ? runtime.memory + '%' : null);
    appendMetricsInfoCard(metricsRuntimeGrid, 'Heap', runtime.heap !== undefined ? runtime.heap + '%' : null);
    appendMetricsInfoCard(metricsRuntimeGrid, 'Uptime', runtime.uptime_s !== undefined ? runtime.uptime_s + 's' : null);
    appendMetricsInfoCard(metricsRuntimeGrid, 'Node', runtime.node_version);
    appendMetricsInfoCard(metricsRuntimeGrid, 'Platform', runtime.platform);
    metricsRuntimeGrid.appendChild(metricCharts.gauge({
      title: 'CPU',
      value: numberOrNull(runtime.cpu),
      max: 100,
      ariaLabel: 'Gauge de uso de CPU'
    }));
    metricsRuntimeGrid.appendChild(metricCharts.gauge({
      title: 'Memória',
      value: numberOrNull(runtime.memory),
      max: 100,
      ariaLabel: 'Gauge de uso de memória'
    }));
    metricsRuntimeGrid.appendChild(metricCharts.bar({
      title: 'Heap usado',
      data: [{ label: 'heap', value: numberOrNull(runtime.heap), display: runtime.heap !== undefined ? runtime.heap + '%' : 'sem dados' }],
      max: 100,
      emptyMessage: 'Sem heap numérico.',
      ariaLabel: 'Barra de heap usado'
    }));
    metricsRuntimeGrid.appendChild(metricCharts.sparkline({
      title: 'Load average',
      data: Array.isArray(runtime.load_avg) ? runtime.load_avg : [],
      emptyMessage: 'Sem série temporal; backend retorna snapshot.',
      ariaLabel: 'Linha de load average do snapshot runtime'
    }));
    metricsRuntimeGrid.appendChild(metricCharts.bar({
      title: 'Requests e errors',
      data: [
        { label: 'requests', value: numberOrNull(runtime.requests), display: runtime.requests !== undefined ? runtime.requests : 'sem dados' },
        { label: 'errors', value: numberOrNull(runtime.errors), display: runtime.errors !== undefined ? runtime.errors : 'sem dados' },
        { label: 'latência', value: numberOrNull(runtime.latency_ms), display: runtime.latency_ms !== undefined ? runtime.latency_ms + 'ms' : 'sem dados' }
      ],
      emptyMessage: 'Backend atual não expõe requests/errors/latência no snapshot.',
      ariaLabel: 'Barras de requests errors e latência quando disponíveis'
    }));
  }

  function renderMetricsMemory(memory) {
    if (!metricsMemoryGrid) return;
    metricsMemoryGrid.textContent = '';
    if (!memory) {
      var fail = document.createElement('p');
      fail.className = 'vc-metrics-empty';
      fail.textContent = 'Falha ao carregar memory layer.';
      metricsMemoryGrid.appendChild(fail);
      return;
    }
    appendMetricsInfoCard(metricsMemoryGrid, 'Escalações', memory.total_escalations);
    appendMetricsInfoCard(metricsMemoryGrid, 'Memory capable', memory.memory_capable_entries);
    appendMetricsInfoCard(metricsMemoryGrid, 'Legacy sem keywords', memory.legacy_entries_without_keywords);
    appendMetricsInfoCard(metricsMemoryGrid, 'Última escalação', memory.last_escalation_at || 'sem eventos');
    var providers = memory.by_provider && typeof memory.by_provider === 'object'
      ? Object.keys(memory.by_provider).map(function (key) { return key + ': ' + memory.by_provider[key]; }).join(', ')
      : '';
    appendMetricsInfoCard(metricsMemoryGrid, 'Por provider', providers || 'sem eventos');
    appendMetricsInfoCard(metricsMemoryGrid, 'Fonte', memory.data_source);
    metricsMemoryGrid.appendChild(metricCharts.donut({
      title: 'Entries memory layer',
      data: [
        { label: 'memory capable', value: numberOrNull(memory.memory_capable_entries) || 0 },
        { label: 'legacy sem keywords', value: numberOrNull(memory.legacy_entries_without_keywords) || 0 }
      ],
      emptyMessage: 'Sem entries de memória registradas.',
      ariaLabel: 'Donut de entries memory capable e legadas'
    }));
    metricsMemoryGrid.appendChild(metricCharts.bar({
      title: 'Escalações por provider',
      data: memory.by_provider && typeof memory.by_provider === 'object'
        ? Object.keys(memory.by_provider).map(function (key) { return { label: key, value: numberOrNull(memory.by_provider[key]) || 0 }; })
        : [],
      emptyMessage: 'Sem eventos por provider.',
      ariaLabel: 'Barras de escalações por provider'
    }));
    metricsMemoryGrid.appendChild(metricCharts.gauge({
      title: 'Hit rate visual',
      value: (numberOrNull(memory.memory_capable_entries) !== null && numberOrNull(memory.total_escalations) !== null && memory.total_escalations > 0)
        ? (memory.memory_capable_entries / memory.total_escalations * 100)
        : null,
      max: 100,
      emptyMessage: 'Endpoint atual não expõe hits/misses diretos; usando entries capazes quando possível.',
      ariaLabel: 'Gauge de hit rate visual do memory layer'
    }));
  }

  function renderMetricsConnectivity(status) {
    if (!metricsConn) return;
    metricsConn.textContent = '';
    if (!status) {
      var fail = document.createElement('p');
      fail.className = 'vc-metrics-empty';
      fail.textContent = 'Falha ao carregar conectividade.';
      metricsConn.appendChild(fail);
      return;
    }
    var row = document.createElement('div');
    row.className = 'vc-metrics-conn-row';
    var dot = document.createElement('span');
    dot.className = 'vc-metrics-status-dot ' + (status.connected ? 'vc-metrics-status-ok' : 'vc-metrics-status-warn');
    var text = document.createElement('span');
    text.textContent = status.connected ? 'Conectado' : 'Desconectado';
    row.appendChild(dot);
    row.appendChild(text);
    metricsConn.appendChild(row);

    var meta = document.createElement('p');
    meta.className = 'vc-metrics-conn-meta';
    meta.textContent = 'Modo: ' + (status.mode || '—') + ' · Último sinal: ' + humanizeMsAgo(status.last_seen_ms_ago) +
      (status.agent_id ? ' · agent_id: ' + status.agent_id : '') +
      ' · anti_stub: ' + (status.anti_stub === true ? 'true' : 'false');
    metricsConn.appendChild(meta);
    metricsConn.appendChild(metricCharts.gauge({
      title: 'Disponibilidade',
      value: status.connected ? 100 : 0,
      max: 100,
      display: status.connected ? 'online' : 'offline',
      unit: '',
      ariaLabel: 'Gauge de disponibilidade do Vision Agent Local'
    }));
    metricsConn.appendChild(metricCharts.timeline({
      title: 'Heartbeat',
      data: [
        { tier: status.connected ? 'ok' : 'warn', label: 'Modo: ' + (status.mode || '—') },
        { tier: status.connected ? 'ok' : 'warn', label: 'Último sinal: ' + humanizeMsAgo(status.last_seen_ms_ago) }
      ],
      ariaLabel: 'Timeline de heartbeat e modo do Vision Agent Local'
    }));
  }

  function setMetricsLoading(loading) {
    if (metricsSkel) metricsSkel.hidden = !loading;
    if (loading && metricsBody) metricsBody.hidden = true;
  }

  function showMetricsError(show) {
    if (metricsError) metricsError.hidden = !show;
  }

  // Achado real (2026-07-12): loadMetrics() rodava tanto no load inicial
  // quanto em CADA tick do polling automático (METRICS_POLL_MS, 12s) --
  // setMetricsLoading(true) escondia metricsBody (todo o conteúdo real)
  // e mostrava o skeleton a cada ciclo, mesmo já havendo dados válidos na
  // tela, causando um "pisca/colapsa" visível a cada ~12s. Skeleton de
  // loading só deve aparecer quando ainda não há nenhum dado renderizado
  // (primeira carga) -- refresh em background com dado prévio já na tela
  // deve atualizar os números/gráficos em silêncio, sem esconder nada.
  function loadMetrics() {
    if (!metricsPanel) return;
    showMetricsError(false);
    var hasPriorData = metricsLastResults !== null;
    if (!hasPriorData) setMetricsLoading(true);
    var results = { agents: null, dora: null, summary: null, memory: null, status: null };
    var failures = 0;
    var pending = 5;

    function settle() {
      pending -= 1;
      if (pending > 0) return;
      setMetricsLoading(false);
      if (failures === 5) {
        if (metricsSourceBadge) { metricsSourceBadge.textContent = 'FALLBACK LOCAL'; metricsSourceBadge.className = 'vc-metrics-source is-fallback'; }
        showMetricsError(true);
        if (metricsBody) metricsBody.hidden = true;
        return;
      }
      if (metricsSourceBadge) { metricsSourceBadge.textContent = 'DADOS REAIS'; metricsSourceBadge.className = 'vc-metrics-source is-real'; }
      metricsLastResults = results;
      if (metricsBody) metricsBody.hidden = false;
      renderMetricsAgents(results.agents);
      renderMetricsDora(results.dora);
      renderMetricsRuntime(results.summary);
      renderMetricsMemory(results.memory);
      renderMetricsConnectivity(results.status);
      if (metricsRawToggle && metricsRawToggle.checked) setMetricsRawText();
    }

    apiRequest('/api/metrics/agents').then(function (d) { results.agents = d; }).catch(function () { failures += 1; }).then(settle);
    apiRequest('/api/dora-metrics').then(function (d) { results.dora = d; }).catch(function () { failures += 1; }).then(settle);
    apiRequest('/api/metrics/summary').then(function (d) { results.summary = d; }).catch(function () { failures += 1; }).then(settle);
    apiRequest('/api/metrics/memory').then(function (d) { results.memory = d; }).catch(function () { failures += 1; }).then(settle);
    apiRequest('/api/agent/status').then(function (d) { results.status = d; }).catch(function () { failures += 1; }).then(settle);
  }

  if (metricsRetry) metricsRetry.addEventListener('click', loadMetrics);
  if (metricsRefresh) metricsRefresh.addEventListener('click', loadMetrics);
  if (metricsWideToggle) {
    metricsWideToggle.addEventListener('click', function () {
      metricsWide = !metricsWide;
      metricsWideToggle.setAttribute('aria-pressed', String(metricsWide));
      metricsWideToggle.textContent = metricsWide ? 'Largura normal' : 'Largura total';
      updateFeatureWidth();
    });
  }

  function startMetricsPolling() {
    stopMetricsPolling();
    loadMetrics();
    metricsPollTimer = window.setInterval(function () {
      if (!document.hidden) loadMetrics();
    }, METRICS_POLL_MS);
  }

  function stopMetricsPolling() {
    if (metricsPollTimer) { window.clearInterval(metricsPollTimer); metricsPollTimer = null; }
  }

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

    if (agentApplyPolling) {
      agentApplyActionsEl.textContent = '';
      var cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.textContent = 'Parar acompanhamento';
      cancelBtn.addEventListener('click', function () { stopAgentApplyPolling('cancel'); });
      agentApplyActionsEl.appendChild(cancelBtn);
      return;
    }

    if (renderConfirmOrBusy(agentApplyActionsEl, {
      busy: agentApplyRequestInFlight,
      busyLabel: 'Enfileirando patch real...',
      confirmPending: agentApplyConfirmPending,
      confirmLabel: 'Confirmar e enfileirar patch real',
      onConfirm: submitAgentApply,
      onCancel: function () { agentApplyConfirmPending = false; renderAgentApplyActions(); }
    })) return;

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

    if (dryRunPolling) {
      dryRunActionsEl.textContent = '';
      var cancelWatchBtn = document.createElement('button');
      cancelWatchBtn.type = 'button';
      cancelWatchBtn.textContent = 'Cancelar acompanhamento';
      cancelWatchBtn.addEventListener('click', function () { stopDryRunPolling('cancel'); });
      dryRunActionsEl.appendChild(cancelWatchBtn);
      return;
    }

    if (renderConfirmOrBusy(dryRunActionsEl, {
      busy: dryRunRequestInFlight,
      busyLabel: 'Enfileirando...',
      confirmPending: dryRunConfirmPending,
      confirmLabel: 'Confirmar dry-run em ' + dryRunTargetInput.value.trim(),
      onConfirm: submitDryRun,
      onCancel: function () { dryRunConfirmPending = false; renderDryRunActions(); }
    })) return;

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

  // ── Conta (email/senha + OAuth) — Settings → Conta ──────────────
  // Next usa a mesma fonte de verdade já existente: localStorage['vision_token'].
  // OAuth passa por redirect de página inteira e volta com #oauth-success
  // quando iniciado com return_to=next. vision_session (cookie) é ignorado de
  // propósito: vem de origem diferente (Worker Gateway) com SameSite=Lax, não
  // confiável via fetch cross-site; o token no hash/corpo é a fonte real.
  var ACCOUNT_TOKEN_KEY = 'vision_token';
  var ACTIVE_PROJECT_KEY = 'vc_active_project';
  var ACCOUNT_DEFAULT_COPY = accountCopy ? accountCopy.textContent : '';
  var accountSkipNextRefresh = false;
  var currentProjectUserId = null;

  function setProjectStatus(message, isError) {
    if (!projectStatus) return;
    projectStatus.textContent = message;
    projectStatus.style.color = isError ? '#f87171' : '';
  }

  function setVisitorProjectContext() {
    currentProjectUserId = null;
    if (projectSelect) {
      projectSelect.textContent = '';
      var option = document.createElement('option');
      option.textContent = 'Temporário';
      projectSelect.appendChild(option);
      projectSelect.disabled = true;
    }
    if (projectNameInput) { projectNameInput.value = ''; projectNameInput.disabled = true; }
    if (projectCreateBtn) projectCreateBtn.disabled = true;
    setProjectStatus('Entre para persistir projetos.', false);
  }

  function saveActiveProject(userId, projectId) {
    try { window.sessionStorage.setItem(ACTIVE_PROJECT_KEY, JSON.stringify({ user_id: userId, project_id: projectId })); } catch (_) {}
  }

  function renderProjects(user, projects, preferredId) {
    if (!projectSelect || !user) return;
    currentProjectUserId = user.id;
    projectSelect.textContent = '';
    projects.forEach(function (project) {
      var option = document.createElement('option');
      option.value = project.id;
      option.textContent = project.name;
      projectSelect.appendChild(option);
    });
    projectSelect.disabled = projects.length === 0;
    if (projectNameInput) projectNameInput.disabled = false;
    if (projectCreateBtn) projectCreateBtn.disabled = false;
    var stored = null;
    try { stored = JSON.parse(window.sessionStorage.getItem(ACTIVE_PROJECT_KEY) || 'null'); } catch (_) {}
    var candidate = preferredId || (stored && stored.user_id === user.id ? stored.project_id : null);
    if (candidate && projects.some(function (project) { return project.id === candidate; })) projectSelect.value = candidate;
    if (projects.length) {
      saveActiveProject(user.id, projectSelect.value);
      setProjectStatus('', false);
    } else {
      setProjectStatus('Nenhum projeto. Crie o primeiro.', false);
    }
  }

  function loadProjects(user, preferredId) {
    if (!user || !user.id) return setVisitorProjectContext();
    currentProjectUserId = user.id;
    if (projectSelect) projectSelect.disabled = true;
    if (projectCreateBtn) projectCreateBtn.disabled = true;
    setProjectStatus('Carregando projetos...', false);
    apiRequest('/api/projects').then(function (data) {
      renderProjects(user, Array.isArray(data.projects) ? data.projects : [], preferredId);
    }).catch(function (err) {
      if (projectNameInput) projectNameInput.disabled = false;
      if (projectCreateBtn) projectCreateBtn.disabled = false;
      setProjectStatus('Erro ao carregar: ' + (err && err.message ? err.message : String(err)), true);
    });
  }

  function createProject() {
    var name = projectNameInput ? projectNameInput.value.trim() : '';
    if (!name || !currentProjectUserId) return;
    if (projectCreateBtn) projectCreateBtn.disabled = true;
    setProjectStatus('Criando projeto...', false);
    apiRequest('/api/projects', { method: 'POST', body: { name: name } }).then(function (data) {
      if (projectNameInput) projectNameInput.value = '';
      loadProjects({ id: currentProjectUserId }, data.project && data.project.id);
    }).catch(function (err) {
      if (projectCreateBtn) projectCreateBtn.disabled = false;
      setProjectStatus('Erro ao criar: ' + (err && err.message ? err.message : String(err)), true);
    });
  }

  function showAccountStatus(msg, isError) {
    if (!accountStatus) return;
    accountStatus.textContent = msg;
    accountStatus.style.color = isError ? '#f87171' : '';
  }

  function setAccountBusy(busy) {
    if (accountLoginBtn) accountLoginBtn.disabled = busy;
    if (accountRegisterBtn) accountRegisterBtn.disabled = busy;
  }

  function buildOAuthUrl(provider) {
    return API_BASE_URL + '/api/auth/oauth/' + provider + '?return_to=next';
  }

  function setOAuthLinks() {
    if (googleOAuthBtn) googleOAuthBtn.href = buildOAuthUrl('google');
    if (githubOAuthBtn) githubOAuthBtn.href = buildOAuthUrl('github');
  }

  function setAccountLoggedInUI(user) {
    if (accountCopy) accountCopy.textContent = 'Logado como ' + (user && user.email ? user.email : '—') + '.';
    if (accountForm) accountForm.hidden = true;
    if (accountLogged) accountLogged.hidden = false;
    loadProjects(user);
  }

  function setAccountLoggedOutUI() {
    if (accountCopy) accountCopy.textContent = ACCOUNT_DEFAULT_COPY;
    if (accountForm) accountForm.hidden = false;
    if (accountLogged) accountLogged.hidden = true;
    setVisitorProjectContext();
  }

  function refreshAccountStatus() {
    var token = null;
    try { token = window.localStorage.getItem(ACCOUNT_TOKEN_KEY); } catch (_) {}
    if (!token) { setAccountLoggedOutUI(); return; }
    apiRequest('/api/auth/me').then(function (data) {
      setAccountLoggedInUI(data.user);
    }).catch(function () {
      try { window.localStorage.removeItem(ACCOUNT_TOKEN_KEY); } catch (_) {}
      setAccountLoggedOutUI();
    });
  }

  function doAccountAuth(mode) {
    var email = accountEmail ? accountEmail.value.trim() : '';
    var password = accountPassword ? accountPassword.value : '';
    if (!email || !password) { showAccountStatus('Email e senha são obrigatórios.', true); return; }
    showAccountStatus(mode === 'register' ? 'Criando conta...' : 'Entrando...', false);
    setAccountBusy(true);
    apiRequest('/api/auth/' + mode, { method: 'POST', body: { email: email, password: password } }).then(function (data) {
      try { window.localStorage.setItem(ACCOUNT_TOKEN_KEY, data.token); } catch (_) {}
      if (accountPassword) accountPassword.value = '';
      setAccountLoggedInUI(data.user);
    }).catch(function (err) {
      showAccountStatus('Erro: ' + (err && err.message ? err.message : String(err)), true);
    }).then(function () {
      setAccountBusy(false);
    });
  }

  function doAccountLogout() {
    apiRequest('/api/auth/logout', { method: 'POST' }).catch(function () {}).then(function () {
      try { window.localStorage.removeItem(ACCOUNT_TOKEN_KEY); } catch (_) {}
      if (accountEmail) accountEmail.value = '';
      showAccountStatus('', false);
      setAccountLoggedOutUI();
    });
  }

  function cleanOAuthHash() {
    if (!window.history || !window.history.replaceState) return;
    window.history.replaceState(null, document.title, window.location.pathname + window.location.search);
  }

  function handleOAuthHash() {
    var hash = String(window.location.hash || '').replace(/^#/, '');
    if (!hash || hash.indexOf('oauth-') !== 0) return false;
    var success = hash.indexOf('oauth-success') === 0;
    var query = success ? hash.replace(/^oauth-success&?/, '') : hash.replace(/^oauth-error=?/, 'error=');
    var params = new URLSearchParams(query);
    if (success) {
      var token = params.get('token');
      if (token) {
        try { window.localStorage.setItem(ACCOUNT_TOKEN_KEY, token); } catch (_) {}
        accountSkipNextRefresh = true;
        selectFeature('settings');
        showAccountStatus('OAuth conectado com sucesso.', false);
        refreshAccountStatus();
      } else {
        showAccountStatus('OAuth retornou sem token.', true);
      }
    } else {
      showAccountStatus('OAuth falhou: ' + (params.get('error') || hash.replace(/^oauth-error=?/, '') || 'erro_desconhecido'), true);
      selectFeature('settings');
    }
    cleanOAuthHash();
    return true;
  }

  if (accountLoginBtn) accountLoginBtn.addEventListener('click', function () { doAccountAuth('login'); });
  if (accountRegisterBtn) accountRegisterBtn.addEventListener('click', function () { doAccountAuth('register'); });
  if (accountLogoutBtn) accountLogoutBtn.addEventListener('click', doAccountLogout);
  if (projectSelect) projectSelect.addEventListener('change', function () {
    if (currentProjectUserId && projectSelect.value) saveActiveProject(currentProjectUserId, projectSelect.value);
  });
  if (projectCreateBtn) projectCreateBtn.addEventListener('click', createProject);
  if (projectNameInput) projectNameInput.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') { event.preventDefault(); createProject(); }
  });
  setOAuthLinks();
  refreshAccountStatus();

  // Mission History (B-2) — list + detail from /api/mission/timeline.
  // Achado real (2026-07-13): reaproveitado pela aba Timeline (next-clean-73)
  // -- lá, sem os 3 formulários exclusivos de Missions acima dele, o painel
  // nasce curto o bastante pra cair inteiro atrás do #vcComposer sticky (regra
  // dura #12). scrollAfterLoad (só true vindo de Timeline) aplica o mesmo
  // scrollIntoView({block:'start'}) já documentado na regra -- Missions nunca
  // chama com esse parâmetro, comportamento lá continua idêntico ao de antes.
  function loadMissionHistory(scrollAfterLoad) {
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
    }).then(function () {
      if (scrollAfterLoad && missionHistory && missionHistory.scrollIntoView) missionHistory.scrollIntoView({ block: 'start' });
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
  var vaultRollbackRequestInFlight = false;

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
    renderConfirmOrBusy(vaultActions, {
      busy: vaultRollbackRequestInFlight,
      busyLabel: 'Aplicando rollback...',
      confirmPending: !!vaultRollbackPending,
      confirmLabel: vaultRollbackPending ? 'Confirmar rollback para "' + (vaultRollbackPending.label || vaultRollbackPending.id) + '"' : '',
      onConfirm: submitVaultRollback,
      onCancel: function () {
        vaultRollbackPending = null;
        if (vaultStatus) vaultStatus.textContent = '';
        renderVaultActions();
      }
    });
  }

  function submitVaultRollback() {
    if (vaultRollbackRequestInFlight) return;
    if (!vaultRollbackPending) return;
    var snapshotId = vaultRollbackPending.id;
    var snapshotLabel = vaultRollbackPending.label || snapshotId;
    vaultRollbackRequestInFlight = true;
    if (vaultStatus) vaultStatus.textContent = 'Executando rollback...';
    renderVaultActions();
    if (window.setAtomicCoreState) window.setAtomicCoreState('action');
    apiRequest('/api/vault/rollback/' + encodeURIComponent(snapshotId), { method: 'POST' }).then(function () {
      vaultRollbackRequestInFlight = false;
      vaultRollbackPending = null;
      if (vaultStatus) vaultStatus.textContent = 'Rollback concluído: ' + snapshotLabel;
      renderVaultActions();
      loadVaultSnapshots();
    }).catch(function (err) {
      vaultRollbackRequestInFlight = false;
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
      if (text) lastChatMissionText = text;

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
  var MAX_ANGLE_DRIFT = 3;
  var MAX_RADIAL_DRIFT = 2;
  var REDUCE_PULSE_MS = 4200; // pulso lento sob reduced-motion — só opacidade/glow, nunca posição
  var REDUCE_TICK_MS = 500;   // frequência de re-render do pulso — não é rAF, é setInterval deliberado
  var coreNode = root.querySelector('[data-atomic-core-node]');
  // Fonte de verdade = VCMotion (controle do VC), não o SO diretamente —
  // ver bloco no topo do arquivo. Default 'full', mesmo com o SO em reduce.
  var reduceMotion = isReducedMotion();
  var state = 'idle';
  var highlighted = Object.create(null);

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

  // Padrões de movimento Idle (Settings → Atomic Core → Padrão de movimento
  // — Idle). "classic" é o comportamento original, byte a byte (driftScale
  // fixo em 1) — nunca alterado, é o default. "pulse" zera todo drift
  // angular/radial (posição na base fixa, só respiração de escala/glow) —
  // o mais calmo dos 3, seguro por construção (drift=0). "drift" usa a
  // MESMA amplitude-teto já validada contra sobreposição de legendas
  // (MAX_ANGLE_DRIFT/MAX_RADIAL_DRIFT, achado real: reduzido de 12->3
  // nesse teto) escalada por idleDriftPref (0..1, nunca > 1) — só o
  // período/waveform mudam (mais lento, senoide única), nunca a amplitude
  // máxima, então não pode reintroduzir a sobreposição já corrigida.
  Agent.prototype.idleValues = function (elapsed) {
    var te = elapsed * idleSpeedPref.getValue();
    var pattern = idlePatternPref.getPref();
    if (pattern === 'pulse') {
      var depthWaveP = (Math.sin(te / this.depthPeriod * Math.PI * 2 + this.phase * 1.91) + 1) / 2;
      return { angle: this.base, radius: AGENT_RADIUS, scale: lerp(1, 1.035, depthWaveP), opacity: lerp(.80, 1, depthWaveP), glow: lerp(16, 30, depthWaveP), layer: 4 };
    }
    if (pattern === 'drift') {
      var driftScale = idleDriftPref.getValue();
      var slowPeriod = this.period * 2.6;
      var angleWaveD = Math.sin(te / slowPeriod * Math.PI * 2 + this.phase);
      var radialWaveD = Math.sin(te / (this.radialPeriod * 2.2) * Math.PI * 2 + this.phase * 1.37);
      var depthWaveD = (Math.sin(te / this.depthPeriod * Math.PI * 2 + this.phase * 1.91) + 1) / 2;
      return { angle: this.base + toRad(angleWaveD * MAX_ANGLE_DRIFT * driftScale), radius: AGENT_RADIUS + radialWaveD * MAX_RADIAL_DRIFT * driftScale, scale: lerp(1, 1.02, depthWaveD), opacity: lerp(.82, .98, depthWaveD), glow: lerp(18, 28, depthWaveD), layer: 4 };
    }
    var primary = Math.sin(te / this.period * Math.PI * 2 + this.phase);
    var secondary = Math.cos(te / 14000 * Math.PI * 2 + this.phase * .73);
    var angleWave = primary * .78 + secondary * .22;
    var radialWave = Math.sin(te / this.radialPeriod * Math.PI * 2 + this.phase * 1.37);
    var depthWave = (Math.sin(te / this.depthPeriod * Math.PI * 2 + this.phase * 1.91) + 1) / 2;
    return { angle: this.base + toRad(angleWave * MAX_ANGLE_DRIFT), radius: AGENT_RADIUS + radialWave * MAX_RADIAL_DRIFT, scale: lerp(1, 1.02, depthWave), opacity: lerp(.82, .98, depthWave), glow: lerp(18, 28, depthWave), layer: 4 };
  };

  // Padrões de movimento Action (Settings → Atomic Core → Padrão de
  // movimento — Action). "classic" é o original (rx/ry inalterados).
  // "wide" escala rx/ry (órbita maior, mesma trajetória). "pulse" abandona
  // a elipse completa por um pulso rápido perto da posição base -- estado
  // Action é transitório (dura só enquanto a missão roda) e não é coberto
  // pela regra dura de legibilidade do Idle (essa é sobre órbita contínua
  // de longa duração), mas o offset angular aqui é mantido conservador por
  // precaução mesmo assim.
  Agent.prototype.actionValues = function (elapsed) {
    var pattern = actionPatternPref.getPref();
    if (pattern === 'pulse') {
      var tp = elapsed / (this.actionPeriod * .35) * Math.PI * 2 * this.direction + this.phase;
      var anglePulse = this.base + toRad(Math.sin(tp) * MAX_ANGLE_DRIFT * 1.4);
      var pulseWave = (Math.sin(tp * 2) + 1) / 2;
      return { angle: anglePulse, radius: AGENT_RADIUS * 1.05, scale: lerp(.9, 1.06, pulseWave), opacity: lerp(.85, 1, pulseWave), glow: 46 * (1 + Math.sin(tp * 3) * .15), layer: 6 };
    }
    var rx = this.rx, ry = this.ry;
    if (pattern === 'wide') { rx = rx * 1.35; ry = ry * 1.35; }
    var t = elapsed / this.actionPeriod * Math.PI * 2 * this.direction + this.phase;
    var ex = Math.cos(t) * rx;
    var ey = Math.sin(t) * ry;
    var x = CX + ex * Math.cos(this.tilt) - ey * Math.sin(this.tilt);
    var y = CY + ex * Math.sin(this.tilt) + ey * Math.cos(this.tilt);
    var depthWave = (Math.sin(t + this.phase * .7) + 1) / 2;
    return { x: x, y: y, scale: lerp(.76, .94, depthWave), opacity: lerp(.78, 1, depthWave), glow: 42 * (1 + Math.sin(t * 2 + this.phase) * .1), layer: depthWave > .5 ? 9 : 3 };
  };

  // Normaliza {angle,radius} ou {x,y} pro mesmo formato {x,y} -- usado pra
  // capturar o snapshot de Action no início do Retorno e pra misturar com
  // o alvo de Idle (mesma conversão que Agent.prototype.place já fazia
  // inline, extraída aqui pra reuso).
  function toXY(agent, value) {
    if (typeof value.x === 'number') return value;
    return { x: CX + Math.cos(value.angle) * value.radius, y: CY + Math.sin(value.angle) * value.radius, scale: value.scale, opacity: value.opacity, glow: value.glow, layer: value.layer };
  }

  function easeInOutQuad(p) { return p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; }

  // Estado de Retorno (Action -> Idle): ver resetAtomicCore(). null quando
  // não há transição em voo. Nunca ativa sob reduceMotion (prioridade
  // máxima da acessibilidade — corte direto sempre, igual comportamento
  // original).
  var returning = null;

  Agent.prototype.values = function (elapsed) {
    if (reduceMotion) {
      // Posição/órbita ficam congeladas (acessibilidade — sem deslocamento,
      // sem scale), mas nunca totalmente estáticas: um pulso lento de
      // opacidade/glow (REDUCE_PULSE_MS, sem relação com posição) sinaliza
      // "vivo" sem gatilho vestibular. Achado real em produção (2026-07-09):
      // antes disso, sem o loop de rAF rodando, render() só era chamado nas
      // transições de estado — entre elas o Atomic Core ficava 100% estático,
      // lido como "quebrado" pelo usuário, não como "calmo".
      var pulse = (Math.sin(elapsed / REDUCE_PULSE_MS * Math.PI * 2 + this.phase) + 1) / 2;
      var glowBase = state === 'action' ? 42 : 24;
      return { angle: this.base, radius: AGENT_RADIUS, scale: 1, opacity: lerp(.78, .92, pulse), glow: lerp(glowBase * .82, glowBase, pulse), layer: 4 };
    }
    if (returning) {
      var p = (performance.now() - returning.startedAt) / returning.duration;
      if (p < 1) {
        var ease = easeInOutQuad(Math.max(0, Math.min(1, p)));
        var from = returning.from[this.name];
        var target = toXY(this, this.idleValues(elapsed));
        return {
          x: lerp(from.x, target.x, ease), y: lerp(from.y, target.y, ease),
          scale: lerp(from.scale, target.scale, ease), opacity: lerp(from.opacity, target.opacity, ease),
          glow: lerp(from.glow, target.glow, ease), layer: target.layer
        };
      }
      returning = null;
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

  var reduceTickTimer = null;
  function reduceTick() {
    render(performance.now() - startTime);
    reduceTickTimer = window.setTimeout(reduceTick, REDUCE_TICK_MS);
  }

  // Reinvocável — permite trocar de modo em tempo real (Settings → Animações)
  // sem reload: para o loop atual (rAF ou tick) e inicia o outro.
  function stopMotionLoop() {
    if (raf) { window.cancelAnimationFrame(raf); raf = 0; }
    if (reduceTickTimer) { window.clearTimeout(reduceTickTimer); reduceTickTimer = null; }
  }

  function startMotionLoop() {
    stopMotionLoop();
    if (!reduceMotion) {
      raf = window.requestAnimationFrame(frame);
    } else {
      // Sem rAF sob modo reduzido (evita a órbita/deslocamento contínuo), mas
      // sem isso o Atomic Core fica 100% estático entre transições de estado —
      // lido como "quebrado", não "calmo". Tick lento e deliberado (não é
      // rAF) só pra aplicar o pulso de opacidade/glow de Agent.prototype.values().
      reduceTickTimer = window.setTimeout(reduceTick, REDUCE_TICK_MS);
    }
  }

  function setAtomicCoreState(nextState) {
    returning = null; // qualquer troca de estado cancela uma transição de Retorno em voo
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

  // Retorno (Action -> Idle): por padrão ("Nenhum") é o corte direto
  // original, byte a byte. "Rápido"/"Suave" capturam a posição exata de
  // Action no instante da chamada (fromByAgent) e o novo alvo de Idle é
  // interpolado ao longo de returnDurationPref ms (Agent.prototype.values),
  // em vez de saltar direto pro cálculo de Idle em t=0. `data-state` vira
  // "idle" imediatamente (semanticamente a missão já terminou, nenhum
  // teste/consumidor externo deve notar diferença aí) -- só o blend visual
  // que segue em voo por trás.
  function resetAtomicCore() {
    stopAtomicSequence();
    highlighted = Object.create(null);
    var style = reduceMotion ? 'none' : returnStylePref.getPref();
    if (style !== 'none' && state === 'action') {
      var oldElapsed = performance.now() - startTime;
      var fromByAgent = Object.create(null);
      agents.forEach(function (agent) { fromByAgent[agent.name] = toXY(agent, agent.values(oldElapsed)); });
      var next = setAtomicCoreState('idle');
      returning = { startedAt: performance.now(), duration: returnDurationPref.getValue(), from: fromByAgent };
      return next;
    }
    return setAtomicCoreState('idle');
  }

  // DECISION-022 (2026-07-13): Atomic Core é estritamente da aba Chat. A
  // exceção antiga do Software Factory deixou de existir; o toggle de
  // Settings só controla o widget quando ele está dentro do escopo.
  function updateAtomicCollapseState() {
    var shouldCollapse = getAtomicCoreEnabled() === 'off' || activeFeature !== 'chat';
    root.classList.toggle('vc-no-transition', reduceMotion);
    root.classList.toggle('is-collapsed', shouldCollapse);
  }

  // ARCHITECTURAL PRINCIPLE-004 (ver DECISIONS.md): paineis densos podem
  // ganhar largura total sob demanda -- Métricas via botão local, e Modo
  // Avançado do Software Factory
  // (grid de 2-3 colunas em .vc-sf-stage, seção própria, fora de
  // #vcFeaturePanel/.vc-chat-stage). activeFeature/sfMode lidos no momento
  // da chamada, mesmo padrão de updateAtomicCollapseState().
  function updateFeatureWidth() {
    var wide = activeFeature === 'metrics' && metricsWide;
    if (chatStageEl) chatStageEl.classList.toggle('vc-chat-stage--wide', wide);
    if (featurePanel) featurePanel.classList.toggle('vc-feature-panel--wide', wide);
    var sfSectionEl = document.getElementById('factory');
    if (sfSectionEl) sfSectionEl.classList.toggle('vc-sf-stage--wide', activeFeature === 'factory' && sfMode === 'advanced');
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
  if (!handleOAuthHash()) selectFeature('chat', false);
  startMotionLoop();

  // Troca de modo ao vivo (Settings → Animações), sem reload.
  onAnimationModeChange(function (mode) {
    reduceMotion = mode === 'reduced';
    startMotionLoop();
    render(performance.now() - startTime);
    updateAtomicCollapseState();
  });

  // Troca de preferência ao vivo (Settings → Atomic Core), sem reload.
  onAtomicCoreEnabledChange(function () { updateAtomicCollapseState(); });

  // Dica de primeira visita (item 4, opcional): se o SO está com reduce
  // ativo e o usuário nunca escolheu um modo no VC, avisa uma vez só que o
  // padrão aqui é animação completa e onde mudar isso — consciência de
  // acessibilidade, não imposição silenciosa. Único lugar do arquivo (fora
  // do bloco VCMotion) que lê matchMedia diretamente, e só pra decidir se
  // mostra o aviso — nunca pra decidir o que animar.
  (function maybeShowMotionHint() {
    var HINT_KEY = 'vc_motion_hint_shown';
    try {
      if (window.localStorage.getItem(HINT_KEY)) return;
      if (window.localStorage.getItem(VC_MOTION_KEY)) return; // já escolheu, não precisa avisar
      var osReduce = false;
      try { osReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) {}
      if (!osReduce) return;
      window.localStorage.setItem(HINT_KEY, '1');
    } catch (_) { return; }
    appendMessage('assistant', 'ACESSIBILIDADE', 'Seu sistema está com "reduzir movimento" ativado. O Vision Core usa animação completa por padrão — é identidade visual da marca, não fica preso à configuração do sistema. Pra reduzir, use Settings → Animações.');
  })();

  // ── Software Factory (Next) ───────────────────────────────────
  var sfHistory = document.getElementById('vcSfHistory');
  var sfProgress = document.getElementById('vcSfProgress');
  var sfLog = document.getElementById('vcSfLog');
  var sfFinal = document.getElementById('vcSfFinal');
  var sfFinalBody = document.getElementById('vcSfFinalBody');
  var sfFinalViz = document.getElementById('vcSfFinalViz');
  var sfComposer = document.getElementById('vcSfComposer');
  var sfModeButtons = Array.prototype.slice.call(document.querySelectorAll('[data-sf-mode]'));
  var sfProvider = document.getElementById('vcSfProvider');
  var sfModel = document.getElementById('vcSfModel');
  var sfDryRun = document.getElementById('vcSfDryRun');
  var sfPassGold = document.getElementById('vcSfPassGold');
  var sfExtraInputs = Array.prototype.slice.call(document.querySelectorAll('[data-sf-extra-step]'));
  var sfUrlContextInput = document.getElementById('vcSfUrlContext');
  var sfUrlFetchBtn = document.getElementById('vcSfUrlFetchBtn');
  var sfUrlStatus = document.getElementById('vcSfUrlStatus');
  var sfMode = 'auto';
  var sfPollTimer = null;
  var sfInFlight = false;
  var sfStepMeta = [];
  var sfFullContext = '';
  var sfUrlContext = '';
  var sfUrlFetchInFlight = false;
  var sfRunOptions = null;
  var sfLastDescription = '';
  var sfFilesBtn = document.getElementById('vcSfFilesBtn');
  var sfFilesStatus = document.getElementById('vcSfFilesStatus');
  var sfFilesList = document.getElementById('vcSfFilesList');
  var sfZipActions = document.getElementById('vcSfZipActions');
  var sfZipBtn = document.getElementById('vcSfZipBtn');
  var sfGeneratedFiles = null;
  var sfFilesInFlight = false;
  var sfZipInFlight = false;
  var sfAdvancedPanel = document.getElementById('vcSfAdvancedPanel');
  var sfSuggestBtn = document.getElementById('vcSfSuggestBtn');
  var sfAcceptStackBtn = document.getElementById('vcSfAcceptStackBtn');
  var sfResetStackBtn = document.getElementById('vcSfResetStackBtn');
  var sfMissionSummary = document.getElementById('vcSfMissionSummary');
  var sfWarnings = document.getElementById('vcSfWarnings');
  var sfSuggestion = document.getElementById('vcSfSuggestion');
  var sfStackCatalog = document.getElementById('vcSfStackCatalog');
  var sfStackGraph = document.getElementById('vcSfStackGraph');
  var sfTechDetail = document.getElementById('vcSfTechDetail');
  var sfAgentMatrix = document.getElementById('vcSfAgentMatrix');
  var sfTimeline = document.getElementById('vcSfTimeline');
  var sfTimelineDetail = document.getElementById('vcSfTimelineDetail');
  var sfPreview = document.getElementById('vcSfPreview');
  var sfLastSuggestionMission = '';
  var sfSelectedTechId = '';
  var sfSelectedTimelineId = 'discover';

  var SF_STACK_CATALOG = [
    { key: 'languages', label: 'Linguagens', role: 'base de linguagem', items: ['JavaScript', 'TypeScript', 'Python', 'Go', 'Rust', 'Java', 'C#', 'C++', 'PHP', 'Ruby', 'Kotlin', 'Swift', 'Dart'] },
    { key: 'frontend', label: 'Frontend', role: 'interface de usuário', items: ['HTML/CSS/JS', 'React', 'Next.js', 'Vue', 'Nuxt', 'Angular', 'Svelte', 'SvelteKit', 'Solid', 'Astro', 'Tailwind', 'Bootstrap'] },
    { key: 'backend', label: 'Backend', role: 'API e regras de negócio', items: ['Node.js', 'Express', 'Fastify', 'NestJS', 'FastAPI', 'Flask', 'Django', 'Gin', 'Fiber', 'Axum', 'Actix', 'Spring Boot', 'ASP.NET Core', 'Laravel'] },
    { key: 'mobile', label: 'Mobile', role: 'aplicativo móvel', items: ['React Native', 'Flutter', 'Expo', 'Ionic'] },
    { key: 'desktop', label: 'Desktop', role: 'aplicativo desktop', items: ['Electron', 'Tauri', '.NET Desktop', 'Qt', 'Flutter Desktop'] },
    { key: 'database', label: 'Bancos', role: 'persistência', items: ['PostgreSQL', 'MySQL', 'MariaDB', 'SQLite', 'MongoDB', 'Redis', 'Supabase', 'Firebase', 'DynamoDB', 'Elasticsearch', 'Neo4j'] },
    { key: 'infra', label: 'Infraestrutura', role: 'deploy e operação', items: ['Docker', 'Kubernetes', 'GitHub Actions', 'Cloudflare', 'AWS', 'Elastic Beanstalk', 'Lambda', 'S3', 'Railway', 'Render', 'Vercel', 'Netlify'] },
    { key: 'security', label: 'Segurança', role: 'controle e proteção', items: ['OAuth', 'JWT', 'Session Auth', 'RBAC', 'Passkeys', 'Vault', 'VC Secret Guard', 'Secret scanning'] },
    { key: 'ai', label: 'IA', role: 'inteligência e agentes', items: ['OpenAI', 'Anthropic', 'OpenRouter', 'Ollama', 'LangChain', 'LlamaIndex', 'RAG', 'Vector DB', 'Agent orchestration', 'MCP'] },
    { key: 'tests', label: 'Testes', role: 'validação', items: ['Playwright', 'Vitest', 'Jest', 'Pytest', 'Go Test', 'Cargo Test', 'Cypress', 'Postman/Newman'] },
    { key: 'observability', label: 'Observabilidade', role: 'telemetria', items: ['OpenTelemetry', 'Prometheus', 'Grafana', 'Sentry', 'Logs estruturados', 'DORA metrics'] }
  ];

  var SF_AGENT_BASE = [
    { id: 'hermes', name: 'Hermes', role: 'supervisor lógico', state: 'REQUIRED' },
    { id: 'pi', name: 'PI Harness', role: 'execução controlada', state: 'AUTO' },
    { id: 'github', name: 'GitHub Agent', role: 'PR e release', state: 'AUTO' },
    { id: 'archivist', name: 'Archivist', role: 'memória e handoff', state: 'AUTO' },
    { id: 'openclaw', name: 'OpenClaw', role: 'orquestração', state: 'ON' },
    { id: 'scanner', name: 'Scanner', role: 'contexto e validação', state: 'REQUIRED' },
    { id: 'goCore', name: 'Go Core', role: 'runtime truth', state: 'REQUIRED' },
    { id: 'aegis', name: 'Aegis', role: 'security gate', state: 'REQUIRED' },
    { id: 'patchEngine', name: 'Patch Engine', role: 'patch controlado', state: 'AUTO' },
    { id: 'passGold', name: 'Pass Gold', role: 'aprovação final', state: 'REQUIRED' }
  ];

  var SF_TIMELINE_BASE = [
    { id: 'discover', number: '01', name: 'Descoberta e planejamento', agent: 'Hermes', status: 'READY', description: 'Interpreta a conversa principal e define premissas.', inputs: 'Mensagem do composer/chat', outputs: 'Resumo da missão, tamanho e risco', duration: '2-4 min', human: 'Revisar premissas' },
    { id: 'architecture', number: '02', name: 'Arquitetura e stack', agent: 'OpenClaw', status: 'READY', description: 'Seleciona tecnologias do catálogo e valida compatibilidade.', inputs: 'Catálogo + sugestão local', outputs: 'Stack selecionada e avisos', duration: '3-6 min', human: 'Aceitar ou editar stack' },
    { id: 'compose', number: '03', name: 'Composição da missão', agent: 'Hermes', status: 'NOT_STARTED', description: 'Monta o payload seguro para os módulos SF reais.', inputs: 'Stack, agentes e contexto', outputs: 'Prompt estruturado', duration: '1-3 min', human: 'Confirmar escopo' },
    { id: 'preview', number: '04', name: 'Preview e validação', agent: 'Scanner', status: 'NOT_STARTED', description: 'Gera preview sem escrita em disco.', inputs: 'Payload SF', outputs: 'Plano e riscos', duration: '5-12 min', human: 'Revisar preview' },
    { id: 'workers', number: '05', name: 'Pacotes para workers', agent: 'PI Harness', status: 'NOT_STARTED', description: 'Prepara handoff controlado para worker.', inputs: 'Blueprint aprovado', outputs: 'Pacote de worker', duration: '3-8 min', human: 'Aprovar próximo passo' },
    { id: 'command', number: '06', name: 'Comando para criação real', agent: 'Patch Engine', status: 'WAITING_APPROVAL', description: 'Continua bloqueado para execução real nesta fase.', inputs: 'Confirmação humana', outputs: 'Comando seguro ou dry-run', duration: 'manual', human: 'Obrigatória' },
    { id: 'receipt', number: '07', name: 'Execução e recibo', agent: 'Archivist', status: 'NOT_STARTED', description: 'Registra recibo e logs quando houver execução autorizada.', inputs: 'Resultado do worker', outputs: 'Recibo auditável', duration: '2-5 min', human: 'Revisar recibo' },
    { id: 'validate', number: '08', name: 'Validação e entrega', agent: 'Pass Gold', status: 'NOT_STARTED', description: 'Consolida evidências, testes e gate final.', inputs: 'Logs e artefatos', outputs: 'PASS GOLD ou bloqueio', duration: '4-10 min', human: 'Aprovação final' },
    { id: 'roadmap', number: '09', name: 'Roadmap e conectores', agent: 'GitHub Agent', status: 'NOT_STARTED', description: 'Sugere próximos conectores e PR quando seguro.', inputs: 'Entrega validada', outputs: 'Roadmap e PR opcional', duration: '2-4 min', human: 'Decidir publicação' }
  ];

  var sfCatalogIndex = {};
  var sfAdvancedState = {
    mission: '',
    projectType: 'Indefinido',
    size: 'Indefinido',
    risk: 'baixo',
    selectedStack: [],
    suggestedStack: [],
    agents: {},
    timeline: SF_TIMELINE_BASE.map(function (step) { return Object.assign({}, step); }),
    warnings: [],
    assumptions: [],
    status: 'idle'
  };

  function sfSlug(value) {
    return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  SF_STACK_CATALOG.forEach(function (category) {
    category.items = category.items.map(function (label) {
      var tech = {
        id: category.key + '-' + sfSlug(label),
        label: label,
        category: category.key,
        categoryLabel: category.label,
        role: category.role,
        compatible: [],
        alternatives: [],
        risk: 'baixo',
        reason: category.role
      };
      sfCatalogIndex[tech.id] = tech;
      return tech;
    });
  });

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

  function sfTechByLabel(label) {
    var slug = sfSlug(label);
    var found = null;
    SF_STACK_CATALOG.some(function (category) {
      return category.items.some(function (tech) {
        if (sfSlug(tech.label) === slug) { found = tech; return true; }
        return false;
      });
    });
    return found;
  }

  function sfIds(labels) {
    return labels.map(sfTechByLabel).filter(Boolean).map(function (tech) { return tech.id; });
  }

  function sfSelectedLabels() {
    return sfAdvancedState.selectedStack.map(function (id) { return sfCatalogIndex[id]; }).filter(Boolean).map(function (tech) { return tech.label; });
  }

  function sfSuggestFromMission(mission) {
    var text = String(mission || '').toLowerCase();
    var type = 'Aplicação fullstack';
    var size = 'Médio';
    var risk = 'baixo';
    var labels = ['TypeScript', 'React', 'Node.js', 'Fastify', 'PostgreSQL', 'Docker', 'GitHub Actions', 'Playwright', 'Vitest', 'Session Auth', 'VC Secret Guard', 'OpenTelemetry'];
    var assumptions = ['Sugestão local determinística: nenhum endpoint novo foi chamado.', 'Dry-run e PASS GOLD permanecem ligados por padrão.'];

    if (/landing|site institucional|p[aá]gina|portfolio/.test(text)) {
      type = 'Landing page';
      size = 'Pequeno';
      labels = ['HTML/CSS/JS', 'Astro', 'Cloudflare', 'Playwright', 'GitHub Actions', 'DORA metrics'];
    } else if (/api|backend|microservi|servi[cç]o/.test(text) && !/dashboard|frontend|painel/.test(text)) {
      type = 'API backend';
      labels = /go|golang/.test(text)
        ? ['Go', 'Gin', 'PostgreSQL', 'Redis', 'Docker', 'GitHub Actions', 'Go Test', 'OpenTelemetry', 'VC Secret Guard']
        : ['TypeScript', 'Node.js', 'Fastify', 'PostgreSQL', 'Redis', 'Docker', 'GitHub Actions', 'Vitest', 'OpenTelemetry', 'VC Secret Guard'];
    } else if (/mobile|android|ios|app nativo/.test(text)) {
      type = 'Aplicativo mobile';
      labels = ['TypeScript', 'React Native', 'Expo', 'FastAPI', 'PostgreSQL', 'Docker', 'Playwright', 'OAuth', 'Sentry'];
    } else if (/(^|[^a-z0-9])(ia|ai)([^a-z0-9]|$)|rag|agente|llm|vector|vetor/.test(text)) {
      type = 'Sistema de IA/agentes';
      risk = 'médio';
      labels = ['Python', 'FastAPI', 'PostgreSQL', 'Redis', 'OpenAI', 'OpenRouter', 'RAG', 'Vector DB', 'Agent orchestration', 'Docker', 'Pytest', 'OpenTelemetry', 'VC Secret Guard'];
    } else if (/saas|dashboard|painel|crm|checkout|pagamento|stripe|login|auth/.test(text)) {
      type = 'SaaS fullstack';
      labels = ['TypeScript', 'React', 'Node.js', 'Fastify', 'PostgreSQL', 'Docker', 'GitHub Actions', 'Playwright', 'Vitest', 'Session Auth', 'RBAC', 'VC Secret Guard', 'OpenTelemetry', 'Sentry'];
    }

    if (/mvp|simples|prot[oó]tipo/.test(text)) size = 'Pequeno';
    if (/enterprise|alta disponibilidade|multi-tenant|legado|pagamento|stripe|billing|alto risco/.test(text)) risk = 'alto';
    if (/enterprise|alta disponibilidade|multi-tenant/.test(text)) size = 'Grande';

    return {
      projectType: type,
      risk: risk,
      size: size,
      suggestedStack: sfIds(labels),
      assumptions: assumptions
    };
  }

  function sfEvaluateWarnings(ids, meta) {
    var labels = ids.map(function (id) { return sfCatalogIndex[id] && sfCatalogIndex[id].label; }).filter(Boolean);
    var has = function (label) { return labels.indexOf(label) !== -1; };
    var frontendCount = ['React', 'Vue', 'Angular', 'Svelte', 'Solid', 'Astro', 'Next.js', 'Nuxt', 'SvelteKit'].filter(has).length;
    var warnings = [];
    if (frontendCount > 1) warnings.push('Há múltiplos frameworks frontend concorrentes. Escolha um principal para reduzir custo de manutenção.');
    if (has('React Native') && has('Electron')) warnings.push('React Native + Electron mistura mobile e desktop; mantenha ambos só com justificativa explícita.');
    if (has('SQLite') && meta && meta.size === 'Grande') warnings.push('SQLite é frágil para arquitetura distribuída/enterprise. PostgreSQL é a alternativa segura.');
    if (has('Kubernetes') && meta && meta.size === 'Pequeno') warnings.push('Kubernetes costuma ser excesso para MVP simples. Docker + Cloudflare/Railway resolve com menos operação.');
    if (has('JWT') && has('Session Auth')) warnings.push('JWT e Session Auth juntos podem duplicar a estratégia de sessão. Defina um mecanismo principal.');
    return warnings;
  }

  function sfAppend(parent, tag, className, text) {
    if (!parent) return null;
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    parent.appendChild(el);
    return el;
  }

  function sfRenderEmpty(parent, text) {
    if (!parent) return;
    parent.textContent = '';
    sfAppend(parent, 'p', 'vc-sf-empty', text);
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

  function sfRenderSummary() {
    if (!sfMissionSummary) return;
    sfMissionSummary.textContent = '';
    [
      ['Tipo', sfAdvancedState.projectType],
      ['Tamanho', sfAdvancedState.size],
      ['Risco', sfAdvancedState.risk],
      ['Modo', sfMode === 'advanced' ? 'Avançado visual/editável' : 'Auto-Pilot']
    ].forEach(function (pair) {
      var item = sfAppend(sfMissionSummary, 'div', 'vc-sf-summary-item');
      sfAppend(item, 'span', '', pair[0]);
      sfAppend(item, 'strong', '', pair[1]);
    });

    if (!sfWarnings) return;
    sfWarnings.textContent = '';
    var warnings = sfAdvancedState.warnings.length ? sfAdvancedState.warnings : ['Sem incompatibilidade crítica detectada nesta seleção.'];
    warnings.forEach(function (warning) { sfAppend(sfWarnings, 'div', 'vc-sf-warning', warning); });
  }

  function sfRenderSuggestion() {
    if (!sfSuggestion) return;
    sfSuggestion.textContent = '';
    if (!sfAdvancedState.suggestedStack.length) {
      sfRenderEmpty(sfSuggestion, 'Escreva uma missão no composer e peça uma sugestão.');
      return;
    }
    var byCategory = {};
    sfAdvancedState.suggestedStack.forEach(function (id) {
      var tech = sfCatalogIndex[id];
      if (!tech) return;
      if (!byCategory[tech.categoryLabel]) byCategory[tech.categoryLabel] = [];
      byCategory[tech.categoryLabel].push(tech.label);
    });
    Object.keys(byCategory).forEach(function (category) {
      var item = sfAppend(sfSuggestion, 'div', 'vc-sf-suggestion-item');
      sfAppend(item, 'strong', '', category);
      sfAppend(item, 'span', '', byCategory[category].join(' + '));
      sfAppend(item, 'p', '', 'SUGERIDO: compatível com ' + sfAdvancedState.projectType + '. Usuário pode aceitar, rejeitar ou editar.');
    });
  }

  function sfRenderCatalog() {
    if (!sfStackCatalog) return;
    sfStackCatalog.textContent = '';
    SF_STACK_CATALOG.forEach(function (category) {
      var wrap = sfAppend(sfStackCatalog, 'section', 'vc-sf-catalog-category');
      sfAppend(wrap, 'h4', '', category.label);
      var items = sfAppend(wrap, 'div', 'vc-sf-catalog-items');
      category.items.forEach(function (tech) {
        var btn = sfAppend(items, 'button', 'vc-sf-tech-button', tech.label);
        btn.type = 'button';
        btn.setAttribute('data-tech-id', tech.id);
        btn.setAttribute('aria-pressed', sfAdvancedState.selectedStack.indexOf(tech.id) !== -1 ? 'true' : 'false');
        btn.setAttribute('data-suggested', sfAdvancedState.suggestedStack.indexOf(tech.id) !== -1 ? 'true' : 'false');
      });
    });
  }

  function sfRenderGraph() {
    if (!sfStackGraph) return;
    sfStackGraph.textContent = '';
    if (!sfAdvancedState.selectedStack.length) {
      sfRenderEmpty(sfStackGraph, 'Nenhuma tecnologia selecionada ainda.');
      return;
    }
    var grouped = {};
    sfAdvancedState.selectedStack.forEach(function (id) {
      var tech = sfCatalogIndex[id];
      if (!tech) return;
      if (!grouped[tech.categoryLabel]) grouped[tech.categoryLabel] = [];
      grouped[tech.categoryLabel].push(tech);
    });
    Object.keys(grouped).forEach(function (category) {
      var group = sfAppend(sfStackGraph, 'div', 'vc-sf-graph-group');
      sfAppend(group, 'h4', '', category);
      grouped[category].forEach(function (tech) {
        var row = sfAppend(group, 'div', 'vc-sf-graph-node');
        row.setAttribute('data-tech-id', tech.id);
        row.tabIndex = 0;
        sfAppend(row, 'span', '', tech.label);
        var remove = sfAppend(row, 'button', 'vc-sf-remove-tech', '×');
        remove.type = 'button';
        remove.setAttribute('aria-label', 'Remover ' + tech.label);
        remove.setAttribute('data-remove-tech-id', tech.id);
      });
    });
  }

  function sfRenderTechDetail() {
    if (!sfTechDetail) return;
    sfTechDetail.textContent = '';
    var tech = sfCatalogIndex[sfSelectedTechId] || sfCatalogIndex[sfAdvancedState.selectedStack[0]] || sfCatalogIndex[sfAdvancedState.suggestedStack[0]];
    if (!tech) {
      sfRenderEmpty(sfTechDetail, 'Selecione uma tecnologia para ver função, compatibilidade, risco e alternativas.');
      return;
    }
    sfSelectedTechId = tech.id;
    sfAppend(sfTechDetail, 'h4', '', tech.label);
    sfAppend(sfTechDetail, 'p', '', 'Função: ' + tech.role + '. Compatível com a stack selecionada quando não houver warning acima.');
    sfAppend(sfTechDetail, 'p', '', 'Risco: ' + tech.risk + '. Alternativas: outras opções em ' + tech.categoryLabel + '.');
    sfAppend(sfTechDetail, 'p', '', 'Impacto no pipeline: entra no contexto do Arquiteto e no payload seguro do Software Factory.');
  }

  function sfRenderAgents() {
    if (!sfAgentMatrix) return;
    sfAgentMatrix.textContent = '';
    SF_AGENT_BASE.forEach(function (agent) {
      if (!sfAdvancedState.agents[agent.id]) sfAdvancedState.agents[agent.id] = agent.state;
      var row = sfAppend(sfAgentMatrix, 'div', 'vc-sf-agent-row');
      var copy = sfAppend(row, 'div', '');
      sfAppend(copy, 'strong', '', agent.name);
      sfAppend(copy, 'span', '', agent.role);
      var btn = sfAppend(row, 'button', 'vc-sf-agent-state', sfAdvancedState.agents[agent.id]);
      btn.type = 'button';
      btn.setAttribute('data-agent-id', agent.id);
      btn.setAttribute('data-state', sfAdvancedState.agents[agent.id]);
      if (agent.state === 'REQUIRED' || agent.state === 'LOCKED') btn.disabled = true;
    });
  }

  function sfRenderTimeline() {
    if (!sfTimeline) return;
    sfTimeline.textContent = '';
    sfAdvancedState.timeline.forEach(function (step) {
      var btn = sfAppend(sfTimeline, 'button', 'vc-sf-timeline-step');
      btn.type = 'button';
      btn.setAttribute('data-timeline-id', step.id);
      btn.setAttribute('data-status', step.status);
      btn.setAttribute('aria-selected', step.id === sfSelectedTimelineId ? 'true' : 'false');
      sfAppend(btn, 'strong', '', step.number + ' ' + step.name);
      sfAppend(btn, 'span', '', step.status + ' · ' + step.agent);
    });
    sfRenderTimelineDetail();
  }

  function sfRenderTimelineDetail() {
    if (!sfTimelineDetail) return;
    sfTimelineDetail.textContent = '';
    var step = sfAdvancedState.timeline.filter(function (item) { return item.id === sfSelectedTimelineId; })[0] || sfAdvancedState.timeline[0];
    if (!step) return;
    sfAppend(sfTimelineDetail, 'h4', '', step.number + ' — ' + step.name);
    sfAppend(sfTimelineDetail, 'p', '', step.description);
    sfAppend(sfTimelineDetail, 'p', '', 'Agente principal: ' + step.agent + '. Entradas: ' + step.inputs + '. Saídas: ' + step.outputs + '.');
    sfAppend(sfTimelineDetail, 'p', '', 'Status: ' + step.status + '. Duração estimada: ' + step.duration + '. Ação humana: ' + step.human + '.');
  }

  function sfRenderPreview() {
    if (!sfPreview) return;
    sfPreview.textContent = '';
    var rows = [
      ['Missão', sfAdvancedState.mission || 'Use o composer principal para definir a missão.'],
      ['Stack selecionada', sfSelectedLabels().join(', ') || 'Nenhuma tecnologia selecionada.'],
      ['Segurança', 'dry_run=true · pass_gold=' + (!sfPassGold || sfPassGold.checked) + ' · real_execution_allowed=false'],
      ['Confirmação', 'Selecionar Factory ou montar timeline não executa nada. O botão de geração ainda exige ação humana.']
    ];
    rows.forEach(function (pair) {
      var row = sfAppend(sfPreview, 'div', 'vc-sf-preview-row');
      sfAppend(row, 'span', '', pair[0]);
      sfAppend(row, 'strong', '', pair[1]);
    });
  }

  function sfRenderAdvanced() {
    sfAdvancedState.warnings = sfEvaluateWarnings(sfAdvancedState.selectedStack, sfAdvancedState);
    sfRenderSummary();
    sfRenderSuggestion();
    sfRenderCatalog();
    sfRenderGraph();
    sfRenderTechDetail();
    sfRenderAgents();
    sfRenderTimeline();
    sfRenderPreview();
  }

  function sfSuggestAdvanced(announce) {
    var mission = readComposerMissionText();
    sfAdvancedState.mission = mission;
    var suggestion = sfSuggestFromMission(mission);
    sfAdvancedState.projectType = suggestion.projectType;
    sfAdvancedState.size = suggestion.size;
    sfAdvancedState.risk = suggestion.risk;
    sfAdvancedState.suggestedStack = suggestion.suggestedStack;
    sfAdvancedState.assumptions = suggestion.assumptions;
    if (!sfAdvancedState.selectedStack.length) sfAdvancedState.selectedStack = suggestion.suggestedStack.slice();
    sfAdvancedState.timeline = SF_TIMELINE_BASE.map(function (step, idx) {
      var copy = Object.assign({}, step);
      if (idx === 0) copy.status = 'DONE';
      else if (idx === 1) copy.status = 'ACTIVE';
      else if (idx === 5) copy.status = 'WAITING_APPROVAL';
      return copy;
    });
    sfRenderAdvanced();
    if (announce && mission && sfLastSuggestionMission !== mission) {
      sfLastSuggestionMission = mission;
      appendMessage('assistant', 'ARQUITETO SF', 'Sugestão local criada para "' + mission + '": ' + sfAdvancedState.projectType + ' · stack: ' + sfSelectedLabels().join(', ') + '. Nada foi executado.');
    }
  }

  function sfAcceptSuggestion() {
    sfAdvancedState.selectedStack = sfAdvancedState.suggestedStack.slice();
    sfSelectedTechId = sfAdvancedState.selectedStack[0] || '';
    sfRenderAdvanced();
  }

  function sfResetSelection() {
    sfAdvancedState.selectedStack = [];
    sfSelectedTechId = '';
    sfRenderAdvanced();
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
    if (appShell) appShell.setAttribute('data-sf-mode', sfMode);
    sfModeButtons.forEach(function (btn) {
      btn.setAttribute('aria-pressed', btn.getAttribute('data-sf-mode') === sfMode ? 'true' : 'false');
    });
    if (sfAdvancedPanel) sfAdvancedPanel.hidden = sfMode !== 'advanced';
    if (sfMode === 'advanced') sfSuggestAdvanced(true);
    updateAtomicCollapseState();
    updateFeatureWidth();
  }

  function getSelectedSfExtraSteps() {
    return SF_EXTRA_STEPS.filter(function (step) {
      return sfExtraInputs.some(function (input) { return input.checked && input.getAttribute('data-sf-extra-step') === step.key; });
    });
  }

  // Contexto de URL opcional (item 2 da pendencia "Software Factory completo",
  // ver docs/CURRENT_STATE.md) — POST /api/sf/fetch-url e sincrono (sem
  // job_id), o backend busca o texto da URL informada e devolve
  // {ok, content, url} direto (server.js:4485, verificado antes de codar).
  // Leitura, nao escrita/execucao — nao precisa de confirmacao dupla, so
  // desabilitar o botao durante o fetch e mostrar erro legivel se falhar.
  function fetchSfUrlContext() {
    if (sfUrlFetchInFlight || !sfUrlContextInput) return;
    var url = sfUrlContextInput.value.trim();
    if (!url || !/^https?:\/\//i.test(url)) {
      if (sfUrlStatus) sfUrlStatus.textContent = 'Informe uma URL http(s) válida.';
      return;
    }
    sfUrlFetchInFlight = true;
    if (sfUrlFetchBtn) { sfUrlFetchBtn.disabled = true; sfUrlFetchBtn.textContent = 'Buscando...'; }
    if (sfUrlStatus) sfUrlStatus.textContent = '';
    apiRequest('/api/sf/fetch-url', { method: 'POST', body: { url: url } }).then(function (data) {
      sfUrlContext = (data && data.content) ? String(data.content) : '';
      if (sfUrlStatus) {
        sfUrlStatus.textContent = sfUrlContext
          ? 'Contexto capturado (' + sfUrlContext.length + ' caracteres) — será incluído na próxima geração.'
          : 'URL respondeu, mas sem conteúdo de texto reconhecível.';
      }
    }).catch(function (err) {
      sfUrlContext = '';
      if (sfUrlStatus) sfUrlStatus.textContent = 'Erro ao buscar URL: ' + (err && err.message ? err.message : String(err));
    }).then(function () {
      sfUrlFetchInFlight = false;
      if (sfUrlFetchBtn) { sfUrlFetchBtn.disabled = false; sfUrlFetchBtn.textContent = 'Buscar'; }
    });
  }

  if (sfUrlContextInput) {
    sfUrlContextInput.addEventListener('input', function () {
      if (sfUrlFetchBtn) sfUrlFetchBtn.disabled = !sfUrlContextInput.value.trim();
      sfUrlContext = ''; // URL mudou — contexto antigo não é mais válido pra ela
      if (sfUrlStatus) sfUrlStatus.textContent = '';
    });
  }
  if (sfUrlFetchBtn) sfUrlFetchBtn.addEventListener('click', fetchSfUrlContext);

  function readSfOptions() {
    var selectedExtraSteps = getSelectedSfExtraSteps();
    return {
      mode: sfMode,
      provider: sfProvider && sfProvider.value ? sfProvider.value : 'auto',
      model: sfModel && sfModel.value ? sfModel.value.trim() : '',
      dry_run: !sfDryRun || sfDryRun.checked,
      pass_gold: !sfPassGold || sfPassGold.checked,
      extra_steps: selectedExtraSteps.map(function (step) { return step.key; }),
      stack: sfSelectedLabels(),
      project_type: sfAdvancedState.projectType,
      risk_level: sfAdvancedState.risk,
      architect_source: sfMode === 'advanced' ? 'local_deterministic' : 'autopilot',
      real_execution_allowed: false,
      deploy_allowed: false,
      writes_disk: false
    };
  }

  function readComposerMissionText() {
    var value = prompt ? prompt.value.trim() : '';
    value = value.replace(/^(Factory|Missão):\s*/i, '').trim();
    if (value) return value;
    return lastChatMissionText.replace(/^(Factory|Missão):\s*/i, '').trim();
  }

  function renderSfFinal() {
    if (!sfFinal || !sfFinalBody) return;
    sfFinalBody.textContent = sfFullContext.trim();
    sfFinal.hidden = false;
  }

  function renderSfStepChart() {
    if (!sfFinalViz) return;
    sfFinalViz.hidden = false;
    sfFinalViz.textContent = '';
    var counts = { done: 0, error: 0, blocked: 0, pending: 0 };
    sfStepMeta.forEach(function (s) { counts[s.status] = (counts[s.status] || 0) + 1; });
    sfFinalViz.appendChild(metricCharts.donut({
      title: 'Etapas — DONE / FAIL / BLOCKED',
      data: [
        { label: 'done', value: counts.done, color: '#34d399' },
        { label: 'error', value: counts.error, color: '#f87171' },
        { label: 'blocked', value: counts.blocked, color: '#facc15' }
      ],
      emptyMessage: 'Nenhuma etapa concluída ainda.',
      ariaLabel: 'Donut de etapas concluídas, com falha e bloqueadas do pipeline Software Factory'
    }));
    sfFinalViz.appendChild(metricCharts.bar({
      title: 'Duração por etapa',
      data: sfStepMeta.filter(function (s) { return s.duration_ms !== null; }).map(function (s) {
        return { label: s.label, value: s.duration_ms, display: (s.duration_ms / 1000).toFixed(1) + 's' };
      }),
      emptyMessage: 'Sem etapas concluídas com tempo registrado.',
      ariaLabel: 'Barras de duração por etapa do pipeline Software Factory'
    }));
    sfFinalViz.appendChild(metricCharts.gauge({
      title: 'Progresso do pipeline',
      value: sfStepMeta.length ? (counts.done / sfStepMeta.length * 100) : null,
      max: 100,
      display: counts.done + '/' + sfStepMeta.length,
      unit: '',
      emptyMessage: 'Pipeline ainda não iniciado.',
      ariaLabel: 'Gauge de progresso percentual do pipeline Software Factory'
    }));
  }

  function markSfStep(idx, status) {
    var meta = sfStepMeta[idx];
    if (!meta) return;
    meta.status = status;
    meta.duration_ms = meta.startedAt ? Date.now() - meta.startedAt : null;
    if (status === 'error') {
      for (var i = idx + 1; i < sfStepMeta.length; i++) {
        if (sfStepMeta[i].status === 'pending') sfStepMeta[i].status = 'blocked';
      }
    }
    renderSfStepChart();
  }

  function runSfAutoPilot(desc) {
    if (sfInFlight) return;
    sfInFlight = true;
    sfLastDescription = desc;
    sfFullContext = desc + (sfUrlContext ? '\n\n[Contexto de URL]\n' + sfUrlContext : '');
    sfRunOptions = readSfOptions();
    sfActiveSteps = SF_STEPS.concat(getSelectedSfExtraSteps());
    if (sfRunOptions.pass_gold) sfActiveSteps = sfActiveSteps.concat([SF_GOLD_GATE_STEP]);
    sfStepMeta = sfActiveSteps.map(function (s) { return { label: s.label, status: 'pending', duration_ms: null, startedAt: null }; });
    if (sfFinalViz) { sfFinalViz.textContent = ''; sfFinalViz.hidden = true; }
    if (sfLog) { sfLog.textContent = ''; sfLog.hidden = false; }
    if (sfUrlContext) appendSfLog('info', 'URL_CONTEXT incluído (' + sfUrlContext.length + ' chars)');
    if (sfFinal) sfFinal.hidden = true;
    if (sfFinalBody) sfFinalBody.textContent = '';
    // Nova geração — descarta lista/ZIP de uma rodada anterior, senão o
    // usuário poderia baixar um ZIP com arquivos de uma descrição antiga.
    sfGeneratedFiles = null;
    if (sfFilesList) { sfFilesList.textContent = ''; sfFilesList.hidden = true; }
    if (sfZipActions) sfZipActions.hidden = true;
    if (sfFilesStatus) sfFilesStatus.textContent = '';
    if (sfFilesBtn) { sfFilesBtn.disabled = false; sfFilesBtn.textContent = 'Gerar Lista de Arquivos'; }
    appendSfLog('warn', 'SAFE real_execution_allowed=false deploy_allowed=false writes_disk=false');
    appendSfLog('info', 'MODE ' + sfRunOptions.mode + ' provider=' + sfRunOptions.provider + ' model=' + (sfRunOptions.model || 'auto'));
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
        logSfMissionToTimeline(desc, sfActiveSteps.length, !!(sfRunOptions && sfRunOptions.pass_gold));
        finishSf();
        return;
      }
      updateSfProgress(idx, 'active');
      if (sfStepMeta[idx]) sfStepMeta[idx].startedAt = Date.now();
      var step = sfActiveSteps[idx];
      var body = { description: desc, module: step.module, autopilot: true, step: idx, total_steps: sfActiveSteps.length, sf_options: sfRunOptions || readSfOptions() };
      if (sfMode === 'advanced') {
        body.architecture_preview = {
          project_type: sfAdvancedState.projectType,
          risk_level: sfAdvancedState.risk,
          size: sfAdvancedState.size,
          selected_stack: sfSelectedLabels(),
          warnings: sfAdvancedState.warnings,
          timeline: sfAdvancedState.timeline.map(function (item) { return { number: item.number, name: item.name, status: item.status, agent: item.agent }; }),
          agents: sfAdvancedState.agents,
          source: 'local_deterministic'
        };
      }
      appendSfLog('info', 'SEND ' + step.endpoint + ' module=' + step.module);
      if (sfFullContext && idx > 0) body.full_context = sfFullContext.slice(0, 3000);
      apiRequest(step.endpoint, { method: 'POST', body: body }).then(function (data) {
        if (data && data.job_id) {
          pollSfJob(data.job_id, function (err, result) {
            if (err) {
              updateSfProgress(idx, 'error');
              markSfStep(idx, 'error');
              appendSfLog('error', 'FAIL ' + step.module + ': ' + err.message);
              appendSfMsg('error', step.label + ' falhou: ' + err.message);
              finishSf();
            } else {
              updateSfProgress(idx, 'done');
              markSfStep(idx, 'done');
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
          markSfStep(idx, 'done');
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
        markSfStep(idx, 'error');
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
    var submitBtn = sfComposer && sfComposer.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = false;
    if (window.resetAtomicCore) window.resetAtomicCore();
  }

  // Achado real (2026-07-13): POST /api/mission/timeline (o endpoint que
  // alimenta GET /api/mission/timeline, consumido por Missions -> Mission
  // History e pelo botão "Carregar timeline" da aba Timeline) só era
  // chamado pelo frontend legado -- o Next nunca registrava suas próprias
  // execuções do Software Factory Auto-Pilot, então a timeline de um
  // usuário autenticado ficava sempre vazia mesmo depois de rodar missões
  // reais dentro do Next. Mesmo payload do legado (backend intocado,
  // contrato verificado em server.js:1411). Best-effort: falha de rede
  // aqui não deve afetar o fluxo de sucesso da missão (já concluída).
  // Anônimo: o backend já no-opa silenciosamente (appendMissionTimeline
  // exige userId), então chamar sem estar logado é seguro, não precisa
  // checar auth antes.
  function logSfMissionToTimeline(desc, stepsCompleted, passGold) {
    apiRequest('/api/mission/timeline', {
      method: 'POST',
      body: {
        type: 'sf-autopilot',
        title: 'Auto-Pilot: ' + desc.slice(0, 60),
        description: desc,
        steps_completed: stepsCompleted,
        source: 'sf-autopilot-next',
        pass_gold: passGold
      }
    }).catch(function () { /* best-effort — missão já concluída independente disso */ });
  }

  // project-files + generate-zip (item 1 do roadmap "Software Factory
  // completo", docs/ROADMAP.md Fase 3) — contrato verificado direto em
  // backend/server.js antes de codar (server.js:4600, 4724), nunca assumido
  // pelo nome:
  //   - POST /api/sf/project-files é assíncrono como os outros módulos
  //     (retorna {job_id}), mas o poll em GET /api/sf/job/:id devolve o
  //     resultado em `files` (array de {name, content}), não em `result`
  //     (que fica null pra este endpoint especificamente — server.js:4474,
  //     comentário "§187 — project-files expõe files[]"). pollSfJob() já
  //     lida com isso sem mudança: faz cb(null, data.result || data), e
  //     como data.result é null aqui, cai no fallback `data` (a resposta
  //     inteira do poll), que tem `.files` no nível certo.
  //   - POST /api/sf/generate-zip é SÍNCRONO e devolve um ZIP binário
  //     (Content-Type: application/zip), nunca JSON — primeiro fluxo do
  //     Next tratando resposta binária. apiRequest() sempre faz r.json(),
  //     então este endpoint usa fetch() direto + response.blob().
  // sf_options não se aplica aqui (não é um dos 8 SF_GENERATORS) — o
  // próprio contrato do endpoint já garante que é geração em memória para
  // download, nunca escrita em disco real.
  function renderSfFilesList(files) {
    if (!sfFilesList) return;
    sfFilesList.textContent = '';
    files.forEach(function (f) {
      var row = document.createElement('div');
      row.className = 'vc-sf-file-row';
      row.textContent = f && f.name ? f.name : '(sem nome)';
      sfFilesList.appendChild(row);
    });
    sfFilesList.hidden = false;
  }

  function requestSfProjectFiles() {
    if (sfFilesInFlight || !sfLastDescription) return;
    sfFilesInFlight = true;
    if (sfFilesBtn) { sfFilesBtn.disabled = true; sfFilesBtn.textContent = 'Gerando...'; }
    if (sfFilesStatus) sfFilesStatus.textContent = '';
    if (window.setAtomicCoreState) window.setAtomicCoreState('action');
    if (window.highlightAtomicAgents) window.highlightAtomicAgents(['openclaw', 'hermes']);
    var body = {
      description: sfLastDescription,
      accumulated_context: sfFullContext.slice(0, 2000)
    };
    apiRequest('/api/sf/project-files', { method: 'POST', body: body }).then(function (data) {
      if (!data || !data.job_id) throw new Error('Resposta inesperada do servidor (sem job_id)');
      return new Promise(function (resolve, reject) {
        pollSfJob(data.job_id, function (err, result) {
          if (err) reject(err); else resolve(result);
        });
      });
    }).then(function (result) {
      var files = result && result.files;
      if (!files || !files.length) throw new Error('Nenhum arquivo foi gerado');
      sfGeneratedFiles = files;
      renderSfFilesList(files);
      if (sfFilesStatus) sfFilesStatus.textContent = files.length + ' arquivo(s) gerado(s).';
      if (sfZipActions) sfZipActions.hidden = false;
    }).catch(function (err) {
      if (sfFilesStatus) sfFilesStatus.textContent = 'Erro: ' + (err && err.message ? err.message : String(err));
    }).then(function () {
      sfFilesInFlight = false;
      if (sfFilesBtn) { sfFilesBtn.disabled = false; sfFilesBtn.textContent = 'Gerar Lista de Arquivos'; }
      if (window.resetAtomicCore) window.resetAtomicCore();
    });
  }

  function requestSfZipDownload() {
    if (sfZipInFlight || !sfGeneratedFiles || !sfGeneratedFiles.length) return;
    sfZipInFlight = true;
    if (sfZipBtn) { sfZipBtn.disabled = true; sfZipBtn.textContent = 'Baixando...'; }
    if (sfFilesStatus) sfFilesStatus.textContent = '';
    var headers = { 'Content-Type': 'application/json' };
    var token = getChatAuthToken();
    if (token) headers.Authorization = 'Bearer ' + token;
    fetch(API_BASE_URL + '/api/sf/generate-zip', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ files: sfGeneratedFiles, project: sfLastDescription })
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.blob();
    }).then(function (blob) {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'projeto-vision-core.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }).catch(function (err) {
      if (sfFilesStatus) sfFilesStatus.textContent = 'Erro ao baixar ZIP: ' + (err && err.message ? err.message : String(err));
    }).then(function () {
      sfZipInFlight = false;
      if (sfZipBtn) { sfZipBtn.disabled = false; sfZipBtn.textContent = 'Baixar ZIP'; }
    });
  }

  if (sfFilesBtn) sfFilesBtn.addEventListener('click', requestSfProjectFiles);
  if (sfZipBtn) sfZipBtn.addEventListener('click', requestSfZipDownload);
  if (sfSuggestBtn) sfSuggestBtn.addEventListener('click', function () { sfSuggestAdvanced(true); });
  if (sfAcceptStackBtn) sfAcceptStackBtn.addEventListener('click', sfAcceptSuggestion);
  if (sfResetStackBtn) sfResetStackBtn.addEventListener('click', sfResetSelection);
  if (sfStackCatalog) {
    sfStackCatalog.addEventListener('click', function (event) {
      var btn = event.target && event.target.closest ? event.target.closest('[data-tech-id]') : null;
      if (!btn) return;
      var id = btn.getAttribute('data-tech-id');
      var idx = sfAdvancedState.selectedStack.indexOf(id);
      if (idx === -1) sfAdvancedState.selectedStack.push(id);
      else sfAdvancedState.selectedStack.splice(idx, 1);
      sfSelectedTechId = id;
      sfRenderAdvanced();
    });
  }
  if (sfStackGraph) {
    sfStackGraph.addEventListener('click', function (event) {
      var remove = event.target && event.target.closest ? event.target.closest('[data-remove-tech-id]') : null;
      if (remove) {
        var removeId = remove.getAttribute('data-remove-tech-id');
        sfAdvancedState.selectedStack = sfAdvancedState.selectedStack.filter(function (id) { return id !== removeId; });
        if (sfSelectedTechId === removeId) sfSelectedTechId = sfAdvancedState.selectedStack[0] || '';
        sfRenderAdvanced();
        return;
      }
      var node = event.target && event.target.closest ? event.target.closest('[data-tech-id]') : null;
      if (node) {
        sfSelectedTechId = node.getAttribute('data-tech-id');
        sfRenderTechDetail();
      }
    });
    sfStackGraph.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      var node = event.target && event.target.closest ? event.target.closest('[data-tech-id]') : null;
      if (!node) return;
      event.preventDefault();
      sfSelectedTechId = node.getAttribute('data-tech-id');
      sfRenderTechDetail();
    });
  }
  if (sfAgentMatrix) {
    sfAgentMatrix.addEventListener('click', function (event) {
      var btn = event.target && event.target.closest ? event.target.closest('[data-agent-id]') : null;
      if (!btn || btn.disabled) return;
      var id = btn.getAttribute('data-agent-id');
      var states = ['OFF', 'AUTO', 'ON'];
      var current = sfAdvancedState.agents[id] || 'AUTO';
      sfAdvancedState.agents[id] = states[(states.indexOf(current) + 1) % states.length] || 'AUTO';
      sfRenderAgents();
      sfRenderPreview();
    });
  }
  if (sfTimeline) {
    sfTimeline.addEventListener('click', function (event) {
      var btn = event.target && event.target.closest ? event.target.closest('[data-timeline-id]') : null;
      if (!btn) return;
      sfSelectedTimelineId = btn.getAttribute('data-timeline-id');
      sfRenderTimeline();
    });
  }

  sfModeButtons.forEach(function (btn) {
    btn.addEventListener('click', function () { setSfMode(btn.getAttribute('data-sf-mode')); });
  });
  sfRenderAdvanced();

  if (sfComposer) {
    sfComposer.addEventListener('submit', function (event) {
      event.preventDefault();
      var text = readComposerMissionText();
      if (!text || sfInFlight) return;
      lastChatMissionText = text;
      if (sfMode === 'advanced' && sfAdvancedState.mission !== text) {
        sfAdvancedState.selectedStack = [];
        sfSuggestAdvanced(false);
      }
      appendMessage('user', 'VOCE', text);
      if (prompt) {
        prompt.value = '';
        resizePrompt();
      }
      runSfAutoPilot(text);
    });
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
