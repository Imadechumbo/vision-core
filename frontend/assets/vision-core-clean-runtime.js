(function () {
  'use strict';

  var TOAST_MSG = 'Ação bloqueada: controlled closure ativo. Decisão humana final requerida.';

  function showToast(msg) {
    var existing = document.getElementById('vc-clean-toast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.id = 'vc-clean-toast';
    toast.textContent = msg;
    toast.style.cssText = [
      'position:fixed',
      'bottom:24px',
      'left:50%',
      'transform:translateX(-50%)',
      'background:rgba(124,58,237,0.95)',
      'color:#f8f7ff',
      'padding:12px 24px',
      'border-radius:10px',
      'font-size:13px',
      'letter-spacing:0.03em',
      'z-index:9999',
      'border:1px solid rgba(168,85,247,0.5)',
      'box-shadow:0 8px 32px rgba(0,0,0,0.5)',
      'max-width:480px',
      'text-align:center',
      'pointer-events:none',
    ].join(';');
    document.body.appendChild(toast);
    setTimeout(function () { if (toast.parentNode) toast.remove(); }, 3200);
  }

  function blockBtn(btn) {
    btn.disabled = true;
    btn.style.opacity = '0.45';
    btn.style.cursor = 'not-allowed';
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      showToast(TOAST_MSG);
    }, true);
  }

  var BLOCKED_IDS = [
    'executeBtn',
    'enqueueBtn',
    'diffBtn',
    'githubStatusBtn',
    'githubPrBtn',
    'policyBtn',
    'signupBtn',
    'openAuthBtn',
    'openAuthBtn2',
    'v297AddImageBtn',
    'v297AddFileBtn',
    'v297RunSddfBtn',
    'v236FileBtn',
    'v236CopilotBtn',
    'saveAiProviderBtn',
    'testAiProviderBtn',
    'downloadLogsBtn',
    'workerRefreshBtn',
  ];

  function init() {
    var state = window.VISION_CORE_FINAL_STATE || {};

    BLOCKED_IDS.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) blockBtn(el);
    });

    document.querySelectorAll('.oauth').forEach(function (btn) { blockBtn(btn); });
    document.querySelectorAll('.provider').forEach(function (btn) { blockBtn(btn); });
    document.querySelectorAll('.plan').forEach(function (btn) { blockBtn(btn); });

    var scoreBox = document.getElementById('scoreBox');
    if (scoreBox) {
      scoreBox.innerHTML =
        '<div style="color:#a855f7;font-weight:700;font-size:13px;padding:8px 0;">' +
        'REVIEW_READY_CONTROLLED_CLOSURE</div>' +
        '<div style="color:#a7a1b8;font-size:12px;">PASS GOLD REAL: não reivindicado</div>' +
        '<div style="color:#a7a1b8;font-size:12px;">Decisão humana final requerida</div>';
    }

    var logsBox = document.getElementById('logsBox');
    if (logsBox) {
      logsBox.classList.remove('empty');
      logsBox.innerHTML =
        '<div style="color:#a855f7;">[CLEAN] Controlled closure ativo — commit: ' +
        (state.main_commit || 'd8e3967') + '</div>' +
        '<div style="color:#a7a1b8;">[CLEAN] ' + (state.syntax_check || '1164 files OK') + '</div>' +
        '<div style="color:#22c55e;">[CLEAN] RTE chain complete: ' + state.rte_chain_complete + '</div>' +
        '<div style="color:#22c55e;">[CLEAN] Final closure tests: ' + (state.final_closure_tests || '101 passed') + '</div>' +
        '<div style="color:#ff4d5b;">[CLEAN] Todas as ações de release bloqueadas.</div>';
    }

    var githubStatus = document.getElementById('githubStatus');
    if (githubStatus) {
      githubStatus.textContent = 'GitHub bloqueado — controlled closure ativo.';
      githubStatus.style.color = '#a855f7';
    }

    var mcCoreStatus = document.getElementById('mcCoreStatus');
    if (mcCoreStatus) mcCoreStatus.textContent = 'FECHADO';

    var mcCoreSub = document.getElementById('mcCoreSub');
    if (mcCoreSub) mcCoreSub.textContent = 'CONTROLLED CLOSURE';

    var runtimeText = document.getElementById('runtimeText');
    if (runtimeText) runtimeText.textContent = 'CLOSURE';

    var runtimeMonitor = document.getElementById('runtimeMonitor');
    if (runtimeMonitor) {
      runtimeMonitor.className = 'stable';
      runtimeMonitor.title = 'Controlled closure ativo — decisão humana final requerida';
    }

    var tabs = document.querySelectorAll('.mc-tab');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) { t.classList.remove('active'); });
        document.querySelectorAll('.mc-tab-pane').forEach(function (p) { p.classList.remove('active'); });
        tab.classList.add('active');
        var pane = document.getElementById('mc-tab-' + tab.dataset.tab);
        if (pane) pane.classList.add('active');
      });
    });

    var authBackdrop = document.getElementById('authBackdrop');
    var closeAuthBtn = document.getElementById('closeAuthBtn');
    if (closeAuthBtn && authBackdrop) {
      closeAuthBtn.addEventListener('click', function () {
        authBackdrop.classList.remove('show');
        authBackdrop.setAttribute('aria-hidden', 'true');
      });
      authBackdrop.addEventListener('click', function (e) {
        if (e.target === authBackdrop) {
          authBackdrop.classList.remove('show');
          authBackdrop.setAttribute('aria-hidden', 'true');
        }
      });
    }
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && authBackdrop) {
        authBackdrop.classList.remove('show');
        authBackdrop.setAttribute('aria-hidden', 'true');
      }
    });

    console.info('[VISION CORE CLEAN] State:', state.project_state || 'REVIEW_READY_CONTROLLED_CLOSURE');
    console.info('[VISION CORE CLEAN] Commit:', state.main_commit || 'd8e3967');
    console.info('[VISION CORE CLEAN] pass_gold_real_claimed:', state.pass_gold_real_claimed);
    console.info('[VISION CORE CLEAN] stable_promotion_allowed:', state.stable_promotion_allowed);
  }

  /* ── Reserve Agent mode buttons + prompt preview ─────────────── */
  /* No API calls. No fetch. Local UI state only.                   */

  function getAgentRegistry() {
    return (window.VISION_CORE_RESERVE_AGENTS && Array.isArray(window.VISION_CORE_RESERVE_AGENTS))
      ? window.VISION_CORE_RESERVE_AGENTS
      : [];
  }

  function findAgent(agentId) {
    var registry = getAgentRegistry();
    for (var i = 0; i < registry.length; i++) {
      if (registry[i].id === agentId) { return registry[i]; }
    }
    return null;
  }

  function showPromptPreview(agentId) {
    var agent = findAgent(agentId);
    var panel = document.getElementById('vcPromptPreview');
    if (!panel) { return; }
    if (!agent) { panel.classList.remove('visible'); return; }

    var meta = document.getElementById('vcPromptMeta');
    var body = document.getElementById('vcPromptBody');
    var perms = document.getElementById('vcPromptPerms');
    var prohibs = document.getElementById('vcPromptProhibs');

    if (meta) {
      meta.innerHTML =
        '<span class="vc-prompt-meta-chip">' + agent.name + '</span>' +
        '<span class="vc-prompt-meta-chip">' + agent.method + '</span>' +
        '<span class="vc-prompt-meta-chip">' + agent.type + '</span>';
    }
    if (body) { body.textContent = agent.default_prompt; }
    if (perms) {
      perms.innerHTML = agent.permissions.map(function (p) {
        return '<span class="vc-perm-chip">' + p + '</span>';
      }).join('');
    }
    if (prohibs) {
      prohibs.innerHTML = agent.prohibitions.map(function (p) {
        return '<span class="vc-prohib-chip">' + p + '</span>';
      }).join('');
    }

    panel.classList.add('visible');
  }

  function hidePromptPreview() {
    var panel = document.getElementById('vcPromptPreview');
    if (panel) { panel.classList.remove('visible'); }
  }

  function initReserveAgentControls() {
    /* Mode buttons — local UI state only */
    document.querySelectorAll('.vc-reserve-card').forEach(function (card) {
      var agentId = card.getAttribute('data-agent-id');

      /* Mode buttons */
      card.querySelectorAll('.vc-mode-btn').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var mode = btn.getAttribute('data-mode');
          /* Deactivate all siblings */
          card.querySelectorAll('.vc-mode-btn').forEach(function (b) {
            b.classList.remove('active-off', 'active-auto', 'active-on');
          });
          /* Activate selected */
          if (mode === 'off')  { btn.classList.add('active-off'); }
          if (mode === 'auto') { btn.classList.add('active-auto'); }
          if (mode === 'on')   { btn.classList.add('active-on'); }
        });
      });

      /* Card click — open prompt preview */
      card.addEventListener('click', function () {
        showPromptPreview(agentId);
      });
    });

    /* Close prompt preview */
    var closeBtn = document.getElementById('vcPromptPreviewClose');
    if (closeBtn) {
      closeBtn.addEventListener('click', hidePromptPreview);
    }
    var previewPanel = document.getElementById('vcPromptPreview');
    if (previewPanel) {
      previewPanel.addEventListener('click', function (e) {
        if (e.target === previewPanel) { hidePromptPreview(); }
      });
    }
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { hidePromptPreview(); }
    });
  }

  function initReserve() {
    initReserveAgentControls();
  }

  /* ── Project Builder — local UI state only ───────────────────── */
  /* No API. No fetch. No execution. Local state + DOM only.        */

  var pbState = {
    selectedProjectType: null,
    selectedProjectSize: null,
    selectedStacks: [],
    selectedMode: 'auto_assistido',
    agentModes: {}
  };

  function getPBRegistry() {
    return (window.VISION_CORE_PROJECT_BUILDER) ? window.VISION_CORE_PROJECT_BUILDER : null;
  }

  function findProjectType(typeId) {
    var reg = getPBRegistry();
    if (!reg) { return null; }
    var types = reg.project_types;
    for (var i = 0; i < types.length; i++) {
      if (types[i].id === typeId) { return types[i]; }
    }
    return null;
  }

  function findProjectSize(sizeId) {
    var reg = getPBRegistry();
    if (!reg) { return null; }
    var sizes = reg.project_sizes;
    for (var i = 0; i < sizes.length; i++) {
      if (sizes[i].id === sizeId) { return sizes[i]; }
    }
    return null;
  }

  function findOrchMode(modeId) {
    var reg = getPBRegistry();
    if (!reg) { return null; }
    var modes = reg.orchestration_modes;
    for (var i = 0; i < modes.length; i++) {
      if (modes[i].id === modeId) { return modes[i]; }
    }
    return null;
  }

  function setProjectType(typeId) {
    pbState.selectedProjectType = typeId;
    document.querySelectorAll('.vc-project-type-card').forEach(function (card) {
      if (card.getAttribute('data-type-id') === typeId) {
        card.classList.add('selected');
      } else {
        card.classList.remove('selected');
      }
    });
    applyRecommendedAgents(typeId);
    renderOrchestrationPreview();
    syncTemplateWithProjectType(typeId);
  }

  function setProjectSize(sizeId) {
    pbState.selectedProjectSize = sizeId;
    var reg = getPBRegistry();
    document.querySelectorAll('.vc-size-chip').forEach(function (chip) {
      chip.classList.remove('selected-cyan','selected-green','selected-purple','selected-yellow','selected-red');
    });
    if (reg) {
      var sizes = reg.project_sizes;
      for (var i = 0; i < sizes.length; i++) {
        if (sizes[i].id === sizeId) {
          var chip = document.querySelector('.vc-size-chip[data-size-id="' + sizeId + '"]');
          if (chip) { chip.classList.add('selected-' + sizes[i].color); }
          var hint = document.getElementById('vcSizeHint');
          if (hint) { hint.textContent = 'Modo sugerido: ' + sizes[i].mode_hint + ' · Validação: ' + sizes[i].validation; }
          break;
        }
      }
    }
    renderOrchestrationPreview();
  }

  function toggleStack(stackId) {
    var idx = pbState.selectedStacks.indexOf(stackId);
    if (idx === -1) {
      pbState.selectedStacks.push(stackId);
    } else {
      pbState.selectedStacks.splice(idx, 1);
    }
    document.querySelectorAll('.vc-stack-chip').forEach(function (chip) {
      if (chip.getAttribute('data-stack-id') === stackId) {
        if (idx === -1) { chip.classList.add('selected'); } else { chip.classList.remove('selected'); }
      }
    });
    renderOrchestrationPreview();
  }

  function setOrchestrationMode(modeId) {
    pbState.selectedMode = modeId;
    document.querySelectorAll('.vc-mode-chip').forEach(function (chip) {
      chip.classList.remove('selected');
    });
    var active = document.querySelector('.vc-mode-chip[data-orch-mode="' + modeId + '"]');
    if (active) { active.classList.add('selected'); }
    var desc = document.getElementById('vcOrchModeDesc');
    if (desc) {
      var mode = findOrchMode(modeId);
      desc.textContent = mode ? mode.desc : '';
      desc.className = 'vc-mode-desc active';
    }
    renderOrchestrationPreview();
  }

  function applyRecommendedAgents(typeId) {
    var pt = findProjectType(typeId);
    /* Update matrix rows in project builder */
    document.querySelectorAll('.vc-agent-matrix-row').forEach(function (row) {
      var agentId = row.getAttribute('data-agent-id');
      if (!pt || !pt.agents) {
        row.classList.remove('vc-agent-recommended', 'vc-agent-selected');
        var badge = row.querySelector('.vc-agent-matrix-badge');
        if (badge) { badge.textContent = '—'; badge.className = 'vc-agent-matrix-badge norec'; }
        return;
      }
      var recommended = pt.agents[agentId] || 'AUTO';
      pbState.agentModes[agentId] = recommended;
      /* Visual badge */
      var badge = row.querySelector('.vc-agent-matrix-badge');
      if (badge) {
        if (recommended === 'ON') {
          badge.textContent = 'ON'; badge.className = 'vc-agent-matrix-badge rec';
          row.classList.add('vc-agent-recommended', 'vc-agent-selected');
        } else if (recommended === 'AUTO') {
          badge.textContent = 'AUTO'; badge.className = 'vc-agent-matrix-badge rec';
          row.classList.add('vc-agent-recommended');
          row.classList.remove('vc-agent-selected');
        } else {
          badge.textContent = 'OFF'; badge.className = 'vc-agent-matrix-badge norec';
          row.classList.remove('vc-agent-recommended', 'vc-agent-selected');
        }
      }
      /* Sync mode buttons in matrix row */
      row.querySelectorAll('.vc-matrix-mode-btn').forEach(function (btn) {
        btn.classList.remove('active-off','active-auto','active-on');
        var m = btn.getAttribute('data-mode');
        if (m === 'off'  && recommended === 'OFF')  { btn.classList.add('active-off'); }
        if (m === 'auto' && recommended === 'AUTO') { btn.classList.add('active-auto'); }
        if (m === 'on'   && recommended === 'ON')   { btn.classList.add('active-on'); }
      });
    });
  }

  function updateAgentMode(agentId, mode) {
    pbState.agentModes[agentId] = mode;
    var row = document.querySelector('.vc-agent-matrix-row[data-agent-id="' + agentId + '"]');
    if (!row) { return; }
    row.querySelectorAll('.vc-matrix-mode-btn').forEach(function (btn) {
      btn.classList.remove('active-off','active-auto','active-on');
      var m = btn.getAttribute('data-mode');
      if (m === 'off'  && mode === 'OFF')  { btn.classList.add('active-off'); }
      if (m === 'auto' && mode === 'AUTO') { btn.classList.add('active-auto'); }
      if (m === 'on'   && mode === 'ON')   { btn.classList.add('active-on'); }
    });
    var badge = row.querySelector('.vc-agent-matrix-badge');
    if (badge) {
      if (mode === 'ON')   { badge.textContent = 'ON';   badge.className = 'vc-agent-matrix-badge rec'; }
      if (mode === 'AUTO') { badge.textContent = 'AUTO'; badge.className = 'vc-agent-matrix-badge rec'; }
      if (mode === 'OFF')  { badge.textContent = 'OFF';  badge.className = 'vc-agent-matrix-badge norec'; }
    }
    renderOrchestrationPreview();
  }

  function renderOrchestrationPreview() {
    var reg = getPBRegistry();
    var preview = document.getElementById('vcBuilderPreview');
    if (!preview) { return; }

    var pt   = findProjectType(pbState.selectedProjectType);
    var ps   = findProjectSize(pbState.selectedProjectSize);
    var mode = findOrchMode(pbState.selectedMode);

    function set(id, val, cls) {
      var el = document.getElementById(id);
      if (!el) { return; }
      el.textContent = val;
      if (cls) { el.className = 'vc-preview-value ' + cls; }
    }

    set('vcPreviewType',  pt   ? pt.label   : '—');
    set('vcPreviewSize',  ps   ? ps.label   : '—');
    set('vcPreviewMode',  mode ? mode.label : '—', 'highlight');
    set('vcPreviewStack', pbState.selectedStacks.length ? pbState.selectedStacks.join(', ') : '—', 'cyan');

    /* Agent summary */
    var agents = getAgentRegistry();
    var on = [], auto = [], off = [];
    agents.forEach(function (a) {
      var m = pbState.agentModes[a.id] || a.default_mode || 'AUTO';
      if (m === 'ON')   { on.push(a.name); }
      else if (m === 'OFF') { off.push(a.name); }
      else              { auto.push(a.name); }
    });

    set('vcPreviewAgentsOn',   on.length   ? on.join(', ')   : '—', 'green');
    set('vcPreviewAgentsAuto', auto.length ? auto.join(', ') : '—');
    set('vcPreviewAgentsOff',  off.length  ? off.join(', ')  : '—');

    var nextAction = 'Gerar plano de missão local antes de qualquer execução.';
    if (ps && ps.id === 'high_risk_refactor') {
      nextAction = 'Revisão por agentes Security + Architect + Validator obrigatória antes de qualquer ação.';
    } else if (ps && ps.id === 'enterprise') {
      nextAction = 'Aprovação humana + Architecture + Security + Validator requeridos.';
    }
    set('vcPreviewNextAction', nextAction, 'cyan');
  }

  function generateLocalMissionPlan() {
    var output = document.getElementById('vcLocalPlanOutput');
    if (!output) { return; }
    output.classList.add('visible');

    var plan  = document.getElementById('vcBuilderPlan');
    if (!plan) { return; }

    var pt    = findProjectType(pbState.selectedProjectType);
    var ps    = findProjectSize(pbState.selectedProjectSize);
    var mode  = findOrchMode(pbState.selectedMode);
    var agents = getAgentRegistry();
    var reg   = getPBRegistry();

    var lines = [];

    var activeTpl = pbTemplateState.selectedTemplateId
      ? findTemplateById(pbTemplateState.selectedTemplateId)
      : null;

    lines.push('');
    lines.push('PROJETO:    ' + (pt   ? pt.label   : '(não selecionado)'));
    lines.push('TAMANHO:    ' + (ps   ? ps.label + ' — ' + ps.mode_hint : '(não selecionado)'));
    lines.push('MODO:       ' + (mode ? mode.label  : pbState.selectedMode));
    lines.push('STACK:      ' + (pbState.selectedStacks.length ? pbState.selectedStacks.join(', ') : '(nenhuma)'));
    if (activeTpl) {
      lines.push('TEMPLATE:   ' + activeTpl.name);
      lines.push('STACK REC:  ' + activeTpl.recommended_stack.join(', '));
    }
    lines.push('');

    plan.innerHTML = '';

    /* Mission summary */
    appendPlanSection(plan, 'RESUMO DA MISSÃO');
    var summaryDiv = document.createElement('div');
    summaryDiv.className = 'vc-builder-plan';
    summaryDiv.textContent = lines.join('\n');
    plan.appendChild(summaryDiv);

    /* Agent blocks */
    appendPlanSection(plan, 'AGENTES SELECIONADOS');
    agents.forEach(function (a) {
      var m = pbState.agentModes[a.id] || a.default_mode || 'AUTO';
      if (m === 'OFF') { return; }
      var block = document.createElement('div');
      block.className = 'vc-plan-agent-block';
      block.innerHTML =
        '<div class="vc-plan-agent-name">' + a.name + ' <span class="vc-plan-agent-mode">[' + m + ']</span></div>' +
        '<div class="vc-plan-agent-prompt">' + a.prompt_title + '</div>' +
        '<div class="vc-plan-agent-prompt">' + a.description + '</div>';
      plan.appendChild(block);
    });

    /* Template blueprint sections */
    if (activeTpl) {
      appendPlanSection(plan, 'TEMPLATE BLUEPRINT: ' + activeTpl.name.toUpperCase());

      /* Folder structure */
      var tplStructDiv = document.createElement('div');
      tplStructDiv.className = 'vc-builder-plan';
      tplStructDiv.textContent =
        'Estrutura:\n' + activeTpl.folder_structure.join('\n') +
        '\n\nArquivos Iniciais:\n' + activeTpl.initial_files.join('\n');
      plan.appendChild(tplStructDiv);

      appendPlanSection(plan, 'SEQUÊNCIA DE PROMPTS — TEMPLATE');
      var tplPromptDiv = document.createElement('div');
      tplPromptDiv.className = 'vc-builder-plan';
      tplPromptDiv.textContent = activeTpl.prompt_sequence.join('\n');
      plan.appendChild(tplPromptDiv);

      appendPlanSection(plan, 'CHECKLIST TEMPLATE');
      var tplCheckDiv = document.createElement('div');
      tplCheckDiv.className = 'vc-builder-plan';
      tplCheckDiv.textContent = activeTpl.validation_checklist.map(function (c, i) {
        return (i + 1) + '. ' + c;
      }).join('\n');
      plan.appendChild(tplCheckDiv);

      appendPlanSection(plan, 'AVISOS DE RISCO — TEMPLATE');
      var tplRiskDiv = document.createElement('div');
      tplRiskDiv.className = 'vc-builder-plan';
      tplRiskDiv.style.color = '#fca5a5';
      tplRiskDiv.textContent = activeTpl.risk_warnings.map(function (r) {
        return '⚠ ' + r;
      }).join('\n');
      plan.appendChild(tplRiskDiv);

      appendPlanSection(plan, 'PRÓXIMA AÇÃO SEGURA');
      var tplNextDiv = document.createElement('div');
      tplNextDiv.className = 'vc-builder-plan';
      tplNextDiv.style.color = '#22d3ee';
      tplNextDiv.textContent = activeTpl.next_safe_action;
      plan.appendChild(tplNextDiv);
    }

    /* Validation checklist */
    appendPlanSection(plan, 'CHECKLIST DE VALIDAÇÃO');
    var checks = [
      'Revisar arquivos-alvo antes de qualquer modificação.',
      'Executar testes locais (node --check / npm test) após cada patch.',
      'Confirmar que nenhum arquivo de produção foi tocado.',
      'Verificar evidências de cada agente antes de avançar.',
      'Obter aprovação humana antes de qualquer release, tag ou deploy.'
    ];
    if (ps) {
      if (ps.id === 'production_ready' || ps.id === 'enterprise' || ps.id === 'high_risk_refactor') {
        checks.push('Revisão de Security obrigatória.');
        checks.push('Revisão de Architect obrigatória antes de refatoração ampla.');
        checks.push('Validator deve aprovar todos os critérios de aceite.');
      }
    }
    var checkDiv = document.createElement('div');
    checkDiv.className = 'vc-builder-plan';
    checkDiv.textContent = checks.map(function (c, i) { return (i + 1) + '. ' + c; }).join('\n');
    plan.appendChild(checkDiv);

    /* Safety prohibitions */
    appendPlanSection(plan, 'PROIBIÇÕES DE SEGURANÇA');
    if (reg) {
      var prohibList = document.createElement('div');
      prohibList.className = 'vc-plan-prohib-list';
      reg.safety_gates.forEach(function (g) {
        var chip = document.createElement('span');
        chip.className = 'vc-prohib-chip';
        chip.textContent = g;
        prohibList.appendChild(chip);
      });
      plan.appendChild(prohibList);
    }

    /* Human approval */
    appendPlanSection(plan, 'APROVAÇÃO HUMANA');
    var approvalDiv = document.createElement('div');
    approvalDiv.className = 'vc-builder-plan';
    approvalDiv.textContent =
      'Nenhuma execução real, deploy, release, tag, promoção stable ou reivindicação\n' +
      'de PASS GOLD REAL pode ocorrer sem decisão humana explícita.\n' +
      'Este plano é preview local. Ação real requer aprovação humana separada.';
    plan.appendChild(approvalDiv);
  }

  function appendPlanSection(parent, title) {
    var h = document.createElement('div');
    h.className = 'vc-plan-section-title';
    h.textContent = title;
    parent.appendChild(h);
  }

  /* ── Template Packs — local UI only ─────────────────────────── */
  /* No API. No fetch. No file creation. Local state + DOM only.  */

  var pbTemplateState = {
    selectedTemplateId: null
  };

  function getTemplatePacks() {
    var reg = getPBRegistry();
    if (!reg || !reg.template_packs) { return []; }
    return reg.template_packs;
  }

  function findTemplateForProjectType(projectTypeId) {
    var packs = getTemplatePacks();
    for (var i = 0; i < packs.length; i++) {
      if (packs[i].project_type_id === projectTypeId) { return packs[i]; }
    }
    return null;
  }

  function findTemplateById(templateId) {
    var packs = getTemplatePacks();
    for (var i = 0; i < packs.length; i++) {
      if (packs[i].id === templateId) { return packs[i]; }
    }
    return null;
  }

  function renderTemplatePack(templateId) {
    var tpl = findTemplateById(templateId);
    var detail = document.getElementById('vcTemplateDetail');
    if (!detail) { return; }
    if (!tpl) { detail.classList.remove('visible'); return; }

    /* Highlight selected card */
    document.querySelectorAll('.vc-template-card').forEach(function (c) {
      if (c.getAttribute('data-tpl-id') === templateId) {
        c.classList.add('selected');
      } else {
        c.classList.remove('selected');
      }
    });

    function setText(id, val) {
      var el = document.getElementById(id);
      if (el) { el.textContent = val; }
    }
    function setHTML(id, html) {
      var el = document.getElementById(id);
      if (el) { el.innerHTML = html; }
    }

    setText('vcTplDetailName', tpl.name);
    setText('vcTplDetailSummary', tpl.summary);

    /* Stack chips */
    setHTML('vcTplDetailStack',
      tpl.recommended_stack.map(function (s) {
        return '<span class="vc-tpl-stack-chip">' + s + '</span>';
      }).join('')
    );

    /* Folder tree */
    setHTML('vcTplDetailTree',
      tpl.folder_structure.map(function (f) {
        return '<div class="vc-tpl-tree-item">' + f + '</div>';
      }).join('')
    );

    /* File list */
    setHTML('vcTplDetailFiles',
      tpl.initial_files.map(function (f) {
        return '<div class="vc-tpl-file-item">' + f + '</div>';
      }).join('')
    );

    /* Agent chips */
    setHTML('vcTplDetailAgents',
      tpl.reserve_agents.map(function (a) {
        return '<span class="vc-tpl-agent-chip">' + a + '</span>';
      }).join('')
    );

    /* Prompt sequence */
    setHTML('vcTplDetailPrompts',
      tpl.prompt_sequence.map(function (p) {
        return '<div class="vc-tpl-prompt-step">' + p + '</div>';
      }).join('')
    );

    /* Validation checklist */
    setHTML('vcTplDetailChecklist',
      tpl.validation_checklist.map(function (c) {
        return '<div class="vc-tpl-check-item">' + c + '</div>';
      }).join('')
    );

    /* Risk warnings */
    setHTML('vcTplDetailRisks',
      tpl.risk_warnings.map(function (r) {
        return '<div class="vc-tpl-risk-item">' + r + '</div>';
      }).join('')
    );

    /* Forbidden chips */
    setHTML('vcTplDetailForbidden',
      tpl.forbidden_actions.map(function (f) {
        return '<span class="vc-tpl-forbidden-chip">' + f + '</span>';
      }).join('')
    );

    /* Next safe action */
    setText('vcTplDetailNextAction', tpl.next_safe_action);

    detail.classList.add('visible');
  }

  function setTemplatePack(templateId) {
    pbTemplateState.selectedTemplateId = templateId;
    renderTemplatePack(templateId);
  }

  function syncTemplateWithProjectType(projectTypeId) {
    var tpl = findTemplateForProjectType(projectTypeId);
    if (tpl) {
      setTemplatePack(tpl.id);
    }
  }

  function buildTemplateGrid() {
    var grid = document.getElementById('vcTemplateGrid');
    if (!grid) { return; }
    var packs = getTemplatePacks();
    if (!packs.length) { return; }

    var typeIcons = {
      saas_fullstack: '⬡',
      api_backend: '⌬',
      landing_page: '◻',
      dashboard_admin: '▥',
      game_indie: '◈',
      mobile_app: '▣',
      desktop_app: '⊞',
      automation_bot: '⚙',
      ai_agent_system: '◎',
      ecommerce: '◇',
      blog_content: '⌁',
      custom: '✦'
    };

    grid.innerHTML = '';
    packs.forEach(function (tpl) {
      var card = document.createElement('div');
      card.className = 'vc-template-card';
      card.setAttribute('data-tpl-id', tpl.id);
      card.setAttribute('data-tpl-type', tpl.project_type_id);
      var icon = typeIcons[tpl.project_type_id] || '◆';
      card.innerHTML =
        '<div class="vc-template-card-icon">' + icon + '</div>' +
        '<div class="vc-template-card-name">' + tpl.name + '</div>' +
        '<div class="vc-template-card-type">' + tpl.project_type_id + '</div>';
      card.addEventListener('click', function () {
        setTemplatePack(tpl.id);
      });
      grid.appendChild(card);
    });
  }

  function initTemplatePacks() {
    buildTemplateGrid();
  }

  function initProjectBuilder() {
    var reg = getPBRegistry();
    if (!reg) { return; }

    /* Project type cards */
    document.querySelectorAll('.vc-project-type-card').forEach(function (card) {
      card.addEventListener('click', function () {
        setProjectType(card.getAttribute('data-type-id'));
      });
    });

    /* Size chips */
    document.querySelectorAll('.vc-size-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        setProjectSize(chip.getAttribute('data-size-id'));
      });
    });

    /* Stack chips */
    document.querySelectorAll('.vc-stack-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        toggleStack(chip.getAttribute('data-stack-id'));
      });
    });

    /* Orchestration mode chips */
    document.querySelectorAll('.vc-mode-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        setOrchestrationMode(chip.getAttribute('data-orch-mode'));
      });
    });

    /* Agent matrix mode buttons */
    document.querySelectorAll('.vc-agent-matrix-row').forEach(function (row) {
      var agentId = row.getAttribute('data-agent-id');
      row.querySelectorAll('.vc-matrix-mode-btn').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var modeRaw = btn.getAttribute('data-mode');
          var modeUpper = modeRaw === 'off' ? 'OFF' : modeRaw === 'auto' ? 'AUTO' : 'ON';
          updateAgentMode(agentId, modeUpper);
        });
      });
    });

    /* Generate plan button */
    var genBtn = document.getElementById('vcGeneratePlanBtn');
    if (genBtn) {
      genBtn.addEventListener('click', function () {
        generateLocalMissionPlan();
        genBtn.textContent = '✓ PLANO GERADO — PREVIEW LOCAL';
        genBtn.style.borderColor = 'rgba(34,197,94,.65)';
        genBtn.style.color = '#22c55e';
      });
    }

    /* Set default mode selection visually */
    setOrchestrationMode('auto_assistido');

    /* Initialize agent matrix modes from registry defaults */
    var agents = getAgentRegistry();
    agents.forEach(function (a) {
      pbState.agentModes[a.id] = a.default_mode || 'AUTO';
    });

    /* Sync matrix button active states from defaults */
    agents.forEach(function (a) {
      var row = document.querySelector('.vc-agent-matrix-row[data-agent-id="' + a.id + '"]');
      if (!row) { return; }
      var def = a.default_mode || 'AUTO';
      row.querySelectorAll('.vc-matrix-mode-btn').forEach(function (btn) {
        btn.classList.remove('active-off','active-auto','active-on');
        var m = btn.getAttribute('data-mode');
        if (m === 'off'  && def === 'OFF')  { btn.classList.add('active-off'); }
        if (m === 'auto' && def === 'AUTO') { btn.classList.add('active-auto'); }
        if (m === 'on'   && def === 'ON')   { btn.classList.add('active-on'); }
      });
    });

    renderOrchestrationPreview();
  }

  /* ── Mission Plan Composer — local UI only ──────────────────── */
  /* No API. No fetch. No file creation. No command execution.     */
  /* No eval. No localStorage. In-memory state only.               */

  var mcState = {
    selectedWorkerTarget: 'claude_code',
    selectedOutputMode:   'full_mission',
    options: {
      include_project_context:        true,
      include_template_blueprint:     true,
      include_agent_prompt_sequence:  true,
      include_validation_checklist:   true,
      include_safety_contract:        true,
      include_expected_final_report:  true,
      include_ps_validation_commands: true
    },
    generatedPrompt: ''
  };

  function getMissionComposerRegistry() {
    var reg = getPBRegistry();
    return (reg && reg.mission_composer) ? reg.mission_composer : null;
  }

  function getSelectedTemplate() {
    return pbTemplateState.selectedTemplateId
      ? findTemplateById(pbTemplateState.selectedTemplateId)
      : null;
  }

  function getSelectedAgentsForMission() {
    var agents = getAgentRegistry();
    var on = [], auto = [];
    agents.forEach(function (a) {
      var m = pbState.agentModes[a.id] || a.default_mode || 'AUTO';
      if (m === 'ON')   { on.push(a); }
      else if (m === 'AUTO') { auto.push(a); }
    });
    return { on: on, auto: auto };
  }

  function getSelectedStackForMission() {
    if (pbState.selectedStacks.length) { return pbState.selectedStacks; }
    var tpl = getSelectedTemplate();
    return tpl ? tpl.recommended_stack : [];
  }

  function getSelectedProjectContext() {
    return {
      projectType: findProjectType(pbState.selectedProjectType),
      projectSize: findProjectSize(pbState.selectedProjectSize),
      orchMode:    findOrchMode(pbState.selectedMode),
      stack:       getSelectedStackForMission()
    };
  }

  function setMissionWorkerTarget(targetId) {
    mcState.selectedWorkerTarget = targetId;
    document.querySelectorAll('.vc-worker-chip').forEach(function (c) {
      c.classList.toggle('selected', c.getAttribute('data-worker-id') === targetId);
    });
  }

  function setMissionOutputMode(modeId) {
    mcState.selectedOutputMode = modeId;
    document.querySelectorAll('.vc-output-mode-chip').forEach(function (c) {
      c.classList.toggle('selected', c.getAttribute('data-mode-id') === modeId);
    });
  }

  function toggleMissionComposerOption(optionId) {
    mcState.options[optionId] = !mcState.options[optionId];
    var el = document.querySelector('.vc-composer-option[data-option-id="' + optionId + '"]');
    if (el) { el.classList.toggle('active', mcState.options[optionId]); }
  }

  function nl(n) { return new Array((n || 1) + 1).join('\n'); }

  function hr(ch, len) { return new Array((len || 72) + 1).join(ch || '─'); }

  function buildMissionPrompt() {
    var mc   = getMissionComposerRegistry();
    var tpl  = getSelectedTemplate();
    var ctx  = getSelectedProjectContext();
    var agts = getSelectedAgentsForMission();
    var stack = getSelectedStackForMission();
    var reg  = getPBRegistry();

    /* Worker target label */
    var workerLabel = 'Claude Code';
    if (mc) {
      mc.worker_targets.forEach(function (w) {
        if (w.id === mcState.selectedWorkerTarget) { workerLabel = w.label; }
      });
    }

    var mode      = mcState.selectedOutputMode;
    var opts      = mcState.options;
    var lines     = [];
    var sectionCount = 0;

    function section(title) {
      sectionCount++;
      lines.push(hr('═'));
      lines.push('  ' + title);
      lines.push(hr('─'));
    }

    /* ── Full Mission Prompt ── */
    if (mode === 'full_mission') {

      /* Header */
      lines.push(hr('═'));
      lines.push('  MISSION — ' + (tpl ? tpl.name.toUpperCase() : (ctx.projectType ? ctx.projectType.label.toUpperCase() : 'CUSTOM PROJECT')));
      lines.push(hr('─'));
      lines.push('  Target Worker  : ' + workerLabel);
      lines.push('  Mode           : ' + (ctx.orchMode ? ctx.orchMode.label : pbState.selectedMode));
      lines.push('  Project Type   : ' + (ctx.projectType ? ctx.projectType.label : '(not selected)'));
      lines.push('  Project Size   : ' + (ctx.projectSize ? ctx.projectSize.label + ' — ' + ctx.projectSize.mode_hint : '(not selected)'));
      lines.push('  Selected Stack : ' + (stack.length ? stack.join(', ') : '(none)'));
      lines.push(hr('═'));
      sectionCount++;

      /* Context */
      if (opts.include_project_context) {
        section('CONTEXT');
        lines.push('You are working inside Vision Core Software Factory.');
        lines.push('Use the selected blueprint below.');
        lines.push('Do not execute real deployment, release, tag, stable promotion,');
        lines.push('production access, billing, secrets access, or PASS GOLD REAL claim.');
        lines.push('All actions described here are PLAN-ONLY unless explicitly authorized');
        lines.push('by a human operator outside this frontend.');
        lines.push('');
      }

      /* Template blueprint */
      if (opts.include_template_blueprint && tpl) {
        section('TEMPLATE BLUEPRINT: ' + tpl.name.toUpperCase());
        lines.push('Summary:');
        lines.push('  ' + tpl.summary);
        lines.push('');
        lines.push('Recommended Stack:');
        lines.push('  ' + tpl.recommended_stack.join(', '));
        lines.push('');
        lines.push('Folder Structure:');
        tpl.folder_structure.forEach(function (f) { lines.push('  ' + f); });
        lines.push('');
        lines.push('Initial Files:');
        tpl.initial_files.forEach(function (f) { lines.push('  ' + f); });
        lines.push('');
        lines.push('Next Safe Action:');
        lines.push('  ' + tpl.next_safe_action);
        lines.push('');
      }

      /* Agent plan */
      section('RESERVE AGENT PLAN');
      if (agts.on.length) {
        lines.push('[ ON — Active ]');
        agts.on.forEach(function (a) {
          lines.push('  • ' + a.name + ' [' + a.type + '] — ' + a.method);
          lines.push('    ' + a.description);
        });
        lines.push('');
      }
      if (agts.auto.length) {
        lines.push('[ AUTO — Recommended ]');
        agts.auto.forEach(function (a) {
          lines.push('  • ' + a.name + ' [' + a.type + '] — ' + a.method);
          lines.push('    ' + a.description);
        });
        lines.push('');
      }

      /* Agent prompts */
      if (opts.include_agent_prompt_sequence) {
        section('AGENT PROMPT SEQUENCE');
        if (tpl && tpl.prompt_sequence.length) {
          tpl.prompt_sequence.forEach(function (p) { lines.push('  ' + p); });
        } else {
          var allAgents = agts.on.concat(agts.auto);
          allAgents.forEach(function (a, i) {
            lines.push('  ' + (i + 1) + '. ' + a.prompt_title);
          });
        }
        lines.push('');
        /* Default prompts for ON agents */
        if (agts.on.length) {
          lines.push('[ Agent System Prompts — ON agents ]');
          agts.on.forEach(function (a) {
            lines.push('');
            lines.push('  ── ' + a.name + ' ──');
            lines.push('  ' + a.default_prompt);
          });
          lines.push('');
        }
      }

      /* Validation checklist */
      if (opts.include_validation_checklist) {
        section('VALIDATION CHECKLIST');
        if (tpl) {
          lines.push('Template Checklist:');
          tpl.validation_checklist.forEach(function (c, i) {
            lines.push('  ' + (i + 1) + '. ✓ ' + c);
          });
          lines.push('');
        }
        lines.push('Generic Safety Validation:');
        lines.push('  1. ✓ Revisar arquivos-alvo antes de qualquer modificação.');
        lines.push('  2. ✓ Executar testes locais após cada patch.');
        lines.push('  3. ✓ Confirmar que nenhum arquivo de produção foi tocado.');
        lines.push('  4. ✓ Verificar evidências de cada agente antes de avançar.');
        lines.push('  5. ✓ Obter aprovação humana antes de qualquer release, tag ou deploy.');
        lines.push('');
      }

      /* Risk warnings */
      if (tpl && tpl.risk_warnings.length) {
        section('RISK WARNINGS');
        tpl.risk_warnings.forEach(function (r) { lines.push('  ⚠ ' + r); });
        lines.push('');
      }

      /* Forbidden actions */
      section('FORBIDDEN ACTIONS');
      var forbidden = tpl ? tpl.forbidden_actions.slice() : [];
      if (mc) {
        mc.safety_contract.forEach(function (s) {
          if (forbidden.indexOf(s) === -1) { forbidden.push(s); }
        });
      }
      forbidden.forEach(function (f) { lines.push('  ✗ ' + f); });
      lines.push('');

      /* Human approval boundary */
      section('HUMAN APPROVAL BOUNDARY');
      lines.push('Any real execution, file creation, release, deploy, tag, stable promotion,');
      lines.push('production touch, PASS GOLD REAL claim, secrets access, network action,');
      lines.push('or external side effect REQUIRES EXPLICIT HUMAN APPROVAL outside this frontend.');
      lines.push('');
      lines.push('This prompt is PLAN-ONLY. Execution authority is NEVER granted by this composer.');
      lines.push('');

      /* Expected final report */
      if (opts.include_expected_final_report) {
        section('EXPECTED FINAL REPORT (Worker Must Provide)');
        lines.push('Worker must report:');
        lines.push('  □ files changed');
        lines.push('  □ commands run');
        lines.push('  □ tests passed/failed');
        lines.push('  □ forbidden scan result');
        lines.push('  □ whether any backend/go-core/tools/package.json changed');
        lines.push('  □ whether PASS GOLD REAL was claimed');
        lines.push('  □ whether stable/release/deploy/tag remained blocked');
        lines.push('  □ whether production was touched');
        lines.push('  □ whether output was local-only or real file changes were made');
        lines.push('');
      }

      /* PowerShell validation commands */
      if (opts.include_ps_validation_commands) {
        section('POWERSHELL VALIDATION COMMANDS (display only — do not auto-execute)');
        lines.push('node --check frontend\\assets\\vision-core-clean-state.js');
        lines.push('node --check frontend\\assets\\vision-core-clean-runtime.js');
        lines.push('');
        lines.push('Select-String -Path frontend\\*.html,frontend\\assets\\*.css,frontend\\assets\\*.js `');
        lines.push('  -Pattern "fetch\\(","XMLHttpRequest","child_process","exec\\(","spawn\\(","eval\\(",' );
        lines.push('  "vision-runtime-v297\\.js","vision-v297-interactions\\.js","v23-ui-system\\.js",');
        lines.push('  "v231-backend-agents\\.js","vision-v298-command-chat\\.js",');
        lines.push('  "vision-v298-final-hard-fix2\\.js","vision-v299-fullstack-runtime\\.js",');
        lines.push('  "vision-v2910-clean-runtime\\.js","vision-v32-orbit-runtime\\.js",');
        lines.push('  "vision-v34-enterprise\\.js","vision-v35-telemetry\\.js","vision-v44-runtime-consistency\\.js"');
        lines.push('');
        lines.push('Expected: 0 hits, exit 0 on node --check');
        lines.push('');
      }

    /* ── Agent Prompts Only ── */
    } else if (mode === 'agent_prompts_only') {
      section('AGENT PROMPTS — ' + workerLabel);
      var allActive = agts.on.concat(agts.auto);
      if (!allActive.length) {
        lines.push('(No agents active. Select a project type to activate agents.)');
      } else {
        allActive.forEach(function (a) {
          lines.push('── ' + a.name + ' [' + a.type + '] — ' + a.method + ' ──');
          lines.push(a.default_prompt);
          lines.push('');
        });
      }
      if (tpl && tpl.prompt_sequence.length) {
        section('TEMPLATE PROMPT SEQUENCE');
        tpl.prompt_sequence.forEach(function (p) { lines.push('  ' + p); });
      }

    /* ── Validation Checklist Only ── */
    } else if (mode === 'checklist_only') {
      section('VALIDATION CHECKLIST — ' + (tpl ? tpl.name : 'Project'));
      if (tpl) {
        tpl.validation_checklist.forEach(function (c, i) {
          lines.push('  ' + (i + 1) + '. ✓ ' + c);
        });
        lines.push('');
      }
      lines.push('Generic Safety Gates:');
      if (reg) {
        reg.safety_gates.forEach(function (g) { lines.push('  ✗ ' + g); });
      }
      lines.push('');
      section('VALIDATION COMMANDS');
      lines.push('node --check frontend\\assets\\vision-core-clean-state.js');
      lines.push('node --check frontend\\assets\\vision-core-clean-runtime.js');

    /* ── File Blueprint Only ── */
    } else if (mode === 'file_blueprint_only') {
      section('FILE BLUEPRINT — ' + (tpl ? tpl.name : 'Project'));
      if (tpl) {
        lines.push('Folder Structure:');
        tpl.folder_structure.forEach(function (f) { lines.push('  ' + f); });
        lines.push('');
        lines.push('Initial Files:');
        tpl.initial_files.forEach(function (f) { lines.push('  ' + f); });
        lines.push('');
        lines.push('Stack: ' + tpl.recommended_stack.join(', '));
        lines.push('');
        lines.push('Next Safe Action:');
        lines.push('  ' + tpl.next_safe_action);
      } else {
        lines.push('(No template selected. Select a project type or template to see blueprint.)');
      }

    /* ── Safety Contract Only ── */
    } else if (mode === 'safety_contract_only') {
      section('SAFETY CONTRACT');
      if (mc) {
        mc.safety_contract.forEach(function (s) { lines.push('  ✗ ' + s); });
      }
      lines.push('');
      if (tpl && tpl.forbidden_actions.length) {
        section('TEMPLATE FORBIDDEN ACTIONS');
        tpl.forbidden_actions.forEach(function (f) { lines.push('  ✗ ' + f); });
        lines.push('');
      }
      section('HUMAN APPROVAL BOUNDARY');
      lines.push('Any real execution, file creation, release, deploy, tag, stable promotion,');
      lines.push('production touch, PASS GOLD REAL claim, secrets access, network action,');
      lines.push('or external side effect REQUIRES EXPLICIT HUMAN APPROVAL outside this frontend.');
    }

    mcState.generatedPrompt = lines.join('\n');

    /* Update metrics */
    var lineEl = document.getElementById('vcPromptLineCount');
    var sectEl = document.getElementById('vcPromptSectionCount');
    if (lineEl) { lineEl.textContent = lines.length; }
    if (sectEl) { sectEl.textContent = sectionCount; }

    return mcState.generatedPrompt;
  }

  function renderMissionPrompt() {
    var output = document.getElementById('vcMissionPromptOutput');
    if (!output) { return; }
    var text = buildMissionPrompt();
    output.value = text;
    output.classList.remove('empty');
  }

  function copyMissionPrompt() {
    var statusEl = document.getElementById('vcCopyStatus');
    if (!mcState.generatedPrompt) {
      if (statusEl) {
        statusEl.textContent = 'Gere o prompt primeiro.';
        statusEl.className = 'vc-copy-status visible error';
        setTimeout(function () { statusEl.className = 'vc-copy-status'; }, 2800);
      }
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(mcState.generatedPrompt).then(function () {
        if (statusEl) {
          statusEl.textContent = '✓ Copiado!';
          statusEl.className = 'vc-copy-status visible';
          setTimeout(function () { statusEl.className = 'vc-copy-status'; }, 2800);
        }
      }, function () {
        if (statusEl) {
          statusEl.textContent = 'Selecione e copie manualmente.';
          statusEl.className = 'vc-copy-status visible error';
          setTimeout(function () { statusEl.className = 'vc-copy-status'; }, 3500);
        }
      });
    } else {
      if (statusEl) {
        statusEl.textContent = 'Selecione e copie manualmente.';
        statusEl.className = 'vc-copy-status visible error';
        setTimeout(function () { statusEl.className = 'vc-copy-status'; }, 3500);
      }
    }
  }

  function clearMissionPrompt() {
    mcState.generatedPrompt = '';
    var output = document.getElementById('vcMissionPromptOutput');
    if (output) {
      output.value = 'Clique em GERAR PROMPT DE MISSÃO para compor o prompt local.';
      output.classList.add('empty');
    }
    var lineEl = document.getElementById('vcPromptLineCount');
    var sectEl = document.getElementById('vcPromptSectionCount');
    if (lineEl) { lineEl.textContent = '0'; }
    if (sectEl) { sectEl.textContent = '0'; }
    var statusEl = document.getElementById('vcCopyStatus');
    if (statusEl) { statusEl.className = 'vc-copy-status'; }
  }

  function initMissionComposer() {
    var mc = getMissionComposerRegistry();
    if (!mc) { return; }

    /* Build worker target chips */
    var workerRow = document.getElementById('vcWorkerTargetRow');
    if (workerRow) {
      mc.worker_targets.forEach(function (w) {
        var chip = document.createElement('button');
        chip.className = 'vc-worker-chip' + (w.id === mcState.selectedWorkerTarget ? ' selected' : '');
        chip.setAttribute('data-worker-id', w.id);
        chip.type = 'button';
        chip.textContent = w.label;
        chip.addEventListener('click', function () { setMissionWorkerTarget(w.id); });
        workerRow.appendChild(chip);
      });
    }

    /* Build output mode chips */
    var modeRow = document.getElementById('vcOutputModeRow');
    if (modeRow) {
      mc.output_modes.forEach(function (m) {
        var chip = document.createElement('button');
        chip.className = 'vc-output-mode-chip' + (m.id === mcState.selectedOutputMode ? ' selected' : '');
        chip.setAttribute('data-mode-id', m.id);
        chip.type = 'button';
        chip.textContent = m.label;
        chip.addEventListener('click', function () { setMissionOutputMode(m.id); });
        modeRow.appendChild(chip);
      });
    }

    /* Build composer option toggles */
    var optsContainer = document.getElementById('vcComposerOptions');
    if (optsContainer) {
      mc.composer_options.forEach(function (opt) {
        var el = document.createElement('div');
        el.className = 'vc-composer-option' + (mcState.options[opt.id] ? ' active' : '');
        el.setAttribute('data-option-id', opt.id);
        el.innerHTML =
          '<div class="vc-composer-option-dot"></div>' +
          '<span class="vc-composer-option-label">' + opt.label + '</span>';
        el.addEventListener('click', function () { toggleMissionComposerOption(opt.id); });
        optsContainer.appendChild(el);
      });
    }

    /* Wire buttons */
    var genBtn = document.getElementById('vcGenerateMissionBtn');
    if (genBtn) {
      genBtn.addEventListener('click', function () {
        renderMissionPrompt();
        genBtn.textContent = '✓ PROMPT GERADO — LOCAL ONLY';
        genBtn.style.borderColor = 'rgba(34,197,94,.65)';
        genBtn.style.color = '#22c55e';
      });
    }

    var copyBtn = document.getElementById('vcCopyMissionBtn');
    if (copyBtn) { copyBtn.addEventListener('click', copyMissionPrompt); }

    var clearBtn = document.getElementById('vcClearMissionBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        clearMissionPrompt();
        if (genBtn) {
          genBtn.textContent = '⬡ GERAR PROMPT DE MISSÃO';
          genBtn.style.borderColor = '';
          genBtn.style.color = '';
        }
      });
    }
  }

  /* ── Worker Handoff Packages — local UI only ────────────────── */
  /* No API. No fetch. No file creation. No download. No export.  */
  /* No localStorage. No sessionStorage. In-memory state only.    */

  var handoffState = {
    selectedType:     'full_package',
    selectedTarget:   'claude_code',
    generatedPackage: ''
  };

  function getWorkerHandoffRegistry() {
    var reg = getPBRegistry();
    return (reg && reg.worker_handoff) ? reg.worker_handoff : null;
  }

  function setHandoffType(typeId) {
    handoffState.selectedType = typeId;
    document.querySelectorAll('.vc-handoff-type-chip').forEach(function (c) {
      c.classList.toggle('selected', c.getAttribute('data-handoff-type') === typeId);
    });
  }

  function setHandoffTarget(targetId) {
    handoffState.selectedTarget = targetId;
    document.querySelectorAll('.vc-handoff-target-chip').forEach(function (c) {
      c.classList.toggle('selected', c.getAttribute('data-handoff-target') === targetId);
    });
  }

  function getCurrentMissionPromptForHandoff() {
    /* Reuse in-memory generated prompt if available, otherwise build fresh */
    if (mcState && mcState.generatedPrompt) { return mcState.generatedPrompt; }
    return buildMissionPrompt();
  }

  /* ─── Package builders ─────────────────────────────────────── */

  function hr4(ch, len) { return new Array((len || 72) + 1).join(ch || '─'); }

  function buildFullPackage(ctx, tpl, agts, stack, wh) {
    var lines = [];
    lines.push(hr4('═'));
    lines.push('  FULL WORKER PACKAGE — ' + (tpl ? tpl.name.toUpperCase() : 'CUSTOM PROJECT'));
    lines.push(hr4('─'));
    lines.push('  Target Worker   : ' + handoffState.selectedTarget.replace(/_/g, ' ').toUpperCase());
    lines.push('  Project Type    : ' + (ctx.projectType ? ctx.projectType.label : '(not selected)'));
    lines.push('  Template        : ' + (tpl ? tpl.name : '(none)'));
    lines.push('  Stack           : ' + (stack.length ? stack.join(', ') : '(none)'));
    lines.push('  Risk/Size       : ' + (ctx.projectSize ? ctx.projectSize.label + ' — ' + ctx.projectSize.mode_hint : '(not selected)'));
    lines.push(hr4('═'));
    lines.push('');

    lines.push(hr4('─'));
    lines.push('  ACTIVE AGENTS');
    lines.push(hr4('─'));
    var allActive = agts.on.concat(agts.auto);
    if (allActive.length) {
      allActive.forEach(function (a) {
        lines.push('  • ' + a.name + ' [' + a.type + '] — ' + a.method + ' — ' + a.description);
      });
    } else {
      lines.push('  (none — select a project type to activate agents)');
    }
    lines.push('');

    lines.push(hr4('─'));
    lines.push('  MISSION PROMPT');
    lines.push(hr4('─'));
    lines.push(getCurrentMissionPromptForHandoff());
    lines.push('');

    lines.push(hr4('─'));
    lines.push('  SAFETY RULES');
    lines.push(hr4('─'));
    if (wh) { wh.handoff_safety_rules.forEach(function (r) { lines.push('  ✗ ' + r); }); }
    lines.push('');

    lines.push(hr4('─'));
    lines.push('  FINAL REPORT CONTRACT (Worker Must Provide)');
    lines.push(hr4('─'));
    if (wh) { wh.final_report_contract.forEach(function (r) { lines.push('  □ ' + r); }); }
    return lines;
  }

  function buildClaudeCodePackage(ctx, tpl, agts, stack, wh) {
    var lines = [];
    lines.push(hr4('═'));
    lines.push('  CLAUDE CODE PACKAGE');
    lines.push(hr4('─'));
    lines.push('  Repo     : C:\\Users\\imadechumbo\\Desktop\\vision-core');
    lines.push('  Branch   : [create branch: feat/<your-feature-name>]');
    lines.push('  Type     : ' + (ctx.projectType ? ctx.projectType.label : '(not selected)'));
    lines.push('  Template : ' + (tpl ? tpl.name : '(none)'));
    lines.push('  Stack    : ' + (stack.length ? stack.join(', ') : '(none)'));
    lines.push(hr4('═'));
    lines.push('');

    lines.push('SCOPE RULES');
    lines.push(hr4('─'));
    lines.push('Allowed paths (from template):');
    if (tpl) {
      tpl.folder_structure.forEach(function (f) { lines.push('  + ' + f); });
    } else {
      lines.push('  (no template selected — define scope manually)');
    }
    lines.push('');
    lines.push('Forbidden paths (unless explicitly authorized):');
    lines.push('  ✗ backend/*');
    lines.push('  ✗ go-core/*');
    lines.push('  ✗ tools/*');
    lines.push('  ✗ package.json');
    lines.push('');

    if (tpl) {
      lines.push('INITIAL FILES TO CREATE/EDIT:');
      lines.push(hr4('─'));
      tpl.initial_files.forEach(function (f) { lines.push('  ' + f); });
      lines.push('');
    }

    lines.push('ACTIVE AGENTS:');
    lines.push(hr4('─'));
    var allActive = agts.on.concat(agts.auto);
    allActive.forEach(function (a) {
      lines.push('  • ' + a.name + ' — ' + a.prompt_title);
    });
    lines.push('');

    if (tpl) {
      lines.push('PROMPT SEQUENCE:');
      lines.push(hr4('─'));
      tpl.prompt_sequence.forEach(function (p) { lines.push('  ' + p); });
      lines.push('');
      lines.push('VALIDATION CHECKLIST:');
      lines.push(hr4('─'));
      tpl.validation_checklist.forEach(function (c, i) { lines.push('  ' + (i + 1) + '. ' + c); });
      lines.push('');
    }

    lines.push('VALIDATION COMMANDS (display only — do not auto-execute):');
    lines.push(hr4('─'));
    lines.push('node --check frontend\\assets\\vision-core-clean-state.js');
    lines.push('node --check frontend\\assets\\vision-core-clean-runtime.js');
    lines.push('');

    lines.push('FINAL RULES:');
    lines.push(hr4('─'));
    lines.push('  ✗ Do not push unless explicitly requested.');
    lines.push('  ✗ Do not open PR unless explicitly requested.');
    lines.push('  ✗ Do not deploy, release, tag, stable promote, or touch production.');
    lines.push('  ✗ Do not claim PASS GOLD REAL.');
    lines.push('');

    lines.push('FINAL REPORT CONTRACT:');
    lines.push(hr4('─'));
    if (wh) { wh.final_report_contract.forEach(function (r) { lines.push('  □ ' + r); }); }
    return lines;
  }

  function buildCodexPackage(ctx, tpl, agts, stack) {
    var lines = [];
    lines.push(hr4('═'));
    lines.push('  CODEX PACKAGE');
    lines.push(hr4('─'));
    lines.push('  Task     : ' + (tpl ? tpl.summary : 'Custom project — define task below.'));
    lines.push('  Template : ' + (tpl ? tpl.name : '(none)'));
    lines.push('  Stack    : ' + (stack.length ? stack.join(', ') : '(none)'));
    lines.push(hr4('═'));
    lines.push('');

    if (tpl) {
      lines.push('FILES AND FOLDERS:');
      lines.push(hr4('─'));
      lines.push('Folder structure:');
      tpl.folder_structure.forEach(function (f) { lines.push('  ' + f); });
      lines.push('');
      lines.push('Initial files:');
      tpl.initial_files.forEach(function (f) { lines.push('  ' + f); });
      lines.push('');
    }

    lines.push('CONSTRAINTS:');
    lines.push(hr4('─'));
    lines.push('  • No execution beyond requested code reasoning.');
    lines.push('  • No network calls.');
    lines.push('  • No file writes unless explicitly requested.');
    lines.push('  • No deployment, release, or production access.');
    lines.push('  • No PASS GOLD REAL claim.');
    lines.push('');

    if (tpl) {
      lines.push('VALIDATION CHECKLIST:');
      lines.push(hr4('─'));
      tpl.validation_checklist.forEach(function (c, i) { lines.push('  ' + (i + 1) + '. ' + c); });
      lines.push('');

      lines.push('EXPECTED OUTPUT:');
      lines.push(hr4('─'));
      lines.push('  • Next safe action: ' + tpl.next_safe_action);
      lines.push('  • Code/plan for: ' + tpl.folder_structure.slice(0, 3).join(', '));
    }
    return lines;
  }

  function buildManualOperatorChecklist(ctx, tpl, agts, stack, wh) {
    var lines = [];
    lines.push(hr4('═'));
    lines.push('  MANUAL OPERATOR CHECKLIST');
    lines.push(hr4('─'));
    lines.push('  Project  : ' + (ctx.projectType ? ctx.projectType.label : '(not selected)'));
    lines.push('  Template : ' + (tpl ? tpl.name : '(none)'));
    lines.push(hr4('═'));
    lines.push('');

    lines.push('PRE-FLIGHT STEPS:');
    lines.push(hr4('─'));
    lines.push('  [ ] git checkout main');
    lines.push('  [ ] git pull origin main');
    lines.push('  [ ] git status (confirm clean)');
    lines.push('  [ ] git checkout -b feat/<your-branch-name>');
    lines.push('');

    if (tpl) {
      lines.push('TEMPLATE CHECKLIST:');
      lines.push(hr4('─'));
      tpl.validation_checklist.forEach(function (c, i) {
        lines.push('  [ ] ' + (i + 1) + '. ' + c);
      });
      lines.push('');

      lines.push('RISK WARNINGS:');
      lines.push(hr4('─'));
      tpl.risk_warnings.forEach(function (r) { lines.push('  ⚠ ' + r); });
      lines.push('');
    }

    lines.push('VALIDATION COMMANDS (run manually):');
    lines.push(hr4('─'));
    lines.push('  node --check frontend\\assets\\vision-core-clean-state.js');
    lines.push('  node --check frontend\\assets\\vision-core-clean-runtime.js');
    lines.push('  git diff --name-only');
    lines.push('  git log -5 --oneline');
    lines.push('');

    lines.push('DECISION BOUNDARY:');
    lines.push(hr4('─'));
    lines.push('  Do NOT deploy, release, tag, or promote stable without explicit human GO.');
    lines.push('  Do NOT claim PASS GOLD REAL.');
    lines.push('  Do NOT touch production.');
    lines.push('');

    lines.push('FINAL REPORT CONTRACT:');
    lines.push(hr4('─'));
    if (wh) { wh.final_report_contract.forEach(function (r) { lines.push('  [ ] ' + r); }); }
    return lines;
  }

  function buildPerAgentPromptPack(ctx, tpl, agts) {
    var lines = [];
    lines.push(hr4('═'));
    lines.push('  PER-AGENT PROMPT PACK');
    lines.push('  Project: ' + (ctx.projectType ? ctx.projectType.label : '(not selected)'));
    lines.push(hr4('═'));
    lines.push('');

    var allActive = agts.on.concat(agts.auto);
    if (!allActive.length) {
      lines.push('(No agents active. Select a project type to activate agents.)');
      return lines;
    }

    allActive.forEach(function (a) {
      lines.push(hr4('─'));
      lines.push('  AGENT: ' + a.name.toUpperCase() + ' [' + a.type + ']');
      lines.push(hr4('─'));
      lines.push('  Method         : ' + a.method);
      lines.push('  Prompt Title   : ' + a.prompt_title);
      lines.push('  Responsibility : ' + a.description);
      if (tpl) {
        lines.push('  Project Relevance:');
        var seq = tpl.prompt_sequence.filter(function (s) {
          return s.toLowerCase().indexOf(a.name.split(' ').pop().toLowerCase()) !== -1 ||
                 s.toLowerCase().indexOf(a.type.toLowerCase()) !== -1;
        });
        if (seq.length) {
          seq.forEach(function (s) { lines.push('    ' + s); });
        } else {
          lines.push('    Support role for this template.');
        }
      }
      lines.push('');
      lines.push('  SYSTEM PROMPT:');
      lines.push('  ' + a.default_prompt);
      lines.push('');
      lines.push('  Expected Output:');
      lines.push('    Diagnostic, proposed plan, files to check, validation steps.');
      lines.push('    No deploy, no release, no production touch.');
      lines.push('');
      lines.push('  Prohibitions:');
      a.prohibitions.forEach(function (p) { lines.push('    ✗ ' + p); });
      lines.push('');
    });

    return lines;
  }

  function buildSafetyReviewPack(ctx, tpl, wh) {
    var reg = getPBRegistry();
    var lines = [];
    lines.push(hr4('═'));
    lines.push('  SAFETY REVIEW PACK');
    lines.push('  Project: ' + (ctx.projectType ? ctx.projectType.label : '(not selected)'));
    lines.push(hr4('═'));
    lines.push('');

    if (tpl && tpl.risk_warnings.length) {
      lines.push('TEMPLATE RISK WARNINGS:');
      lines.push(hr4('─'));
      tpl.risk_warnings.forEach(function (r) { lines.push('  ⚠ ' + r); });
      lines.push('');
    }

    lines.push('GLOBAL SAFETY GATES:');
    lines.push(hr4('─'));
    if (reg) { reg.safety_gates.forEach(function (g) { lines.push('  ✗ ' + g); }); }
    lines.push('');

    if (tpl && tpl.forbidden_actions.length) {
      lines.push('TEMPLATE FORBIDDEN ACTIONS:');
      lines.push(hr4('─'));
      tpl.forbidden_actions.forEach(function (f) { lines.push('  ✗ ' + f); });
      lines.push('');
    }

    lines.push('HANDOFF SAFETY RULES:');
    lines.push(hr4('─'));
    if (wh) { wh.handoff_safety_rules.forEach(function (r) { lines.push('  ✗ ' + r); }); }
    lines.push('');

    lines.push('HUMAN APPROVAL BOUNDARY:');
    lines.push(hr4('─'));
    lines.push('  Any real execution, file creation, release, deploy, tag, stable promotion,');
    lines.push('  production touch, PASS GOLD REAL claim, secrets access, network action,');
    lines.push('  or external side effect REQUIRES EXPLICIT HUMAN APPROVAL.');
    lines.push('');
    lines.push('  ✗ No PASS GOLD REAL claim.');
    lines.push('  ✗ No production touch.');
    lines.push('  ✗ No automatic execution from this frontend.');
    return lines;
  }

  function buildValidationPack(ctx, tpl, wh) {
    var lines = [];
    lines.push(hr4('═'));
    lines.push('  VALIDATION PACK');
    lines.push('  Project: ' + (ctx.projectType ? ctx.projectType.label : '(not selected)'));
    lines.push(hr4('═'));
    lines.push('');

    if (tpl) {
      lines.push('TEMPLATE VALIDATION CHECKLIST:');
      lines.push(hr4('─'));
      tpl.validation_checklist.forEach(function (c, i) { lines.push('  ' + (i + 1) + '. ✓ ' + c); });
      lines.push('');
    }

    lines.push('GENERIC SAFETY VALIDATION:');
    lines.push(hr4('─'));
    lines.push('  1. ✓ Revisar arquivos-alvo antes de qualquer modificação.');
    lines.push('  2. ✓ Executar testes locais após cada patch.');
    lines.push('  3. ✓ Confirmar que nenhum arquivo de produção foi tocado.');
    lines.push('  4. ✓ Verificar evidências de cada agente antes de avançar.');
    lines.push('  5. ✓ Obter aprovação humana antes de qualquer release, tag ou deploy.');
    lines.push('');

    lines.push('VALIDATION COMMANDS (display only — run manually):');
    lines.push(hr4('─'));
    lines.push('  node --check frontend\\assets\\vision-core-clean-state.js');
    lines.push('  node --check frontend\\assets\\vision-core-clean-runtime.js');
    lines.push('  git diff --name-only');
    lines.push('  git status --short');
    lines.push('');

    lines.push('SCOPE CHECK:');
    lines.push(hr4('─'));
    lines.push('  Expected changed files (frontend only):');
    lines.push('  frontend/index.html');
    lines.push('  frontend/assets/*.js');
    lines.push('  frontend/assets/*.css');
    lines.push('  No backend/go-core/tools/package.json changes.');
    lines.push('');

    lines.push('FINAL REPORT CHECKLIST:');
    lines.push(hr4('─'));
    if (wh) { wh.final_report_contract.forEach(function (r) { lines.push('  □ ' + r); }); }
    return lines;
  }

  function buildWorkerHandoffPackage() {
    var wh   = getWorkerHandoffRegistry();
    var tpl  = getSelectedTemplate();
    var ctx  = getSelectedProjectContext();
    var agts = getSelectedAgentsForMission();
    var stack = getSelectedStackForMission();
    var type  = handoffState.selectedType;

    var lines = [];

    if (type === 'full_package') {
      lines = buildFullPackage(ctx, tpl, agts, stack, wh);
    } else if (type === 'claude_code_pkg') {
      lines = buildClaudeCodePackage(ctx, tpl, agts, stack, wh);
    } else if (type === 'codex_pkg') {
      lines = buildCodexPackage(ctx, tpl, agts, stack);
    } else if (type === 'manual_checklist') {
      lines = buildManualOperatorChecklist(ctx, tpl, agts, stack, wh);
    } else if (type === 'per_agent_pack') {
      lines = buildPerAgentPromptPack(ctx, tpl, agts);
    } else if (type === 'safety_review_pack') {
      lines = buildSafetyReviewPack(ctx, tpl, wh);
    } else if (type === 'validation_pack') {
      lines = buildValidationPack(ctx, tpl, wh);
    }

    handoffState.generatedPackage = lines.join('\n');

    var lineEl = document.getElementById('vcHandoffLineCount');
    if (lineEl) { lineEl.textContent = lines.length; }

    return handoffState.generatedPackage;
  }

  function renderWorkerHandoffPackage() {
    var output = document.getElementById('vcHandoffOutput');
    if (!output) { return; }
    var text = buildWorkerHandoffPackage();
    output.value = text;
    output.classList.remove('empty');
  }

  function copyWorkerHandoffPackage() {
    var statusEl = document.getElementById('vcHandoffCopyStatus');
    if (!handoffState.generatedPackage) {
      if (statusEl) {
        statusEl.textContent = 'Gere o pacote primeiro.';
        statusEl.className = 'vc-handoff-copy-status visible error';
        setTimeout(function () { statusEl.className = 'vc-handoff-copy-status'; }, 2800);
      }
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(handoffState.generatedPackage).then(function () {
        if (statusEl) {
          statusEl.textContent = '✓ Copiado!';
          statusEl.className = 'vc-handoff-copy-status visible';
          setTimeout(function () { statusEl.className = 'vc-handoff-copy-status'; }, 2800);
        }
      }, function () {
        if (statusEl) {
          statusEl.textContent = 'Selecione e copie manualmente.';
          statusEl.className = 'vc-handoff-copy-status visible error';
          setTimeout(function () { statusEl.className = 'vc-handoff-copy-status'; }, 3500);
        }
      });
    } else {
      if (statusEl) {
        statusEl.textContent = 'Selecione e copie manualmente.';
        statusEl.className = 'vc-handoff-copy-status visible error';
        setTimeout(function () { statusEl.className = 'vc-handoff-copy-status'; }, 3500);
      }
    }
  }

  function clearWorkerHandoffPackage() {
    handoffState.generatedPackage = '';
    var output = document.getElementById('vcHandoffOutput');
    if (output) {
      output.value = 'Clique em GERAR PACOTE para compor o pacote de handoff local.';
      output.classList.add('empty');
    }
    var lineEl = document.getElementById('vcHandoffLineCount');
    if (lineEl) { lineEl.textContent = '0'; }
    var statusEl = document.getElementById('vcHandoffCopyStatus');
    if (statusEl) { statusEl.className = 'vc-handoff-copy-status'; }
  }

  function initWorkerHandoff() {
    var wh = getWorkerHandoffRegistry();
    if (!wh) { return; }

    /* Build package type chips */
    var typeRow = document.getElementById('vcHandoffTypeRow');
    if (typeRow) {
      wh.package_types.forEach(function (pt) {
        var chip = document.createElement('button');
        chip.className = 'vc-handoff-type-chip' + (pt.id === handoffState.selectedType ? ' selected' : '');
        chip.setAttribute('data-handoff-type', pt.id);
        chip.type = 'button';
        chip.textContent = pt.label;
        chip.addEventListener('click', function () { setHandoffType(pt.id); });
        typeRow.appendChild(chip);
      });
    }

    /* Build target chips */
    var targetRow = document.getElementById('vcHandoffTargetRow');
    if (targetRow) {
      wh.worker_profiles.forEach(function (wp) {
        var chip = document.createElement('button');
        chip.className = 'vc-handoff-target-chip' + (wp.id === handoffState.selectedTarget ? ' selected' : '');
        chip.setAttribute('data-handoff-target', wp.id);
        chip.type = 'button';
        chip.textContent = wp.label;
        chip.addEventListener('click', function () { setHandoffTarget(wp.id); });
        targetRow.appendChild(chip);
      });
    }

    /* Wire buttons */
    var genBtn = document.getElementById('vcGenerateHandoffBtn');
    if (genBtn) {
      genBtn.addEventListener('click', function () {
        renderWorkerHandoffPackage();
        genBtn.textContent = '✓ PACOTE GERADO — LOCAL ONLY';
        genBtn.style.borderColor = 'rgba(34,197,94,.65)';
        genBtn.style.color = '#22c55e';
      });
    }

    var copyBtn = document.getElementById('vcCopyHandoffBtn');
    if (copyBtn) { copyBtn.addEventListener('click', copyWorkerHandoffPackage); }

    var clearBtn = document.getElementById('vcClearHandoffBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        clearWorkerHandoffPackage();
        if (genBtn) {
          genBtn.textContent = '⬡ GERAR PACOTE';
          genBtn.style.borderColor = '';
          genBtn.style.color = '';
        }
      });
    }
  }

  /* ── Project Export Preview — local UI only ─────────────────── */
  /* No file creation. No write. No download. No export. No API.  */
  /* No Blob. No URL.createObjectURL. In-memory state only.       */

  var exportPreviewState = {
    selectedMode:     'folder_tree',
    generatedPreview: ''
  };

  function getExportPreviewRegistry() {
    var reg = getPBRegistry();
    return (reg && reg.export_preview) ? reg.export_preview : null;
  }

  function setExportPreviewMode(modeId) {
    exportPreviewState.selectedMode = modeId;
    document.querySelectorAll('.vc-export-mode-chip').forEach(function (c) {
      c.classList.toggle('selected', c.getAttribute('data-export-mode') === modeId);
    });
  }

  function getExportPreviewContext() {
    var tpl  = getSelectedTemplate();
    var ctx  = getSelectedProjectContext();
    var agts = getSelectedAgentsForMission();
    var stack = getSelectedStackForMission();
    return { tpl: tpl, ctx: ctx, agts: agts, stack: stack };
  }

  function getFilePlaceholder(filePath, ep) {
    if (!ep) { return '// Preview placeholder for ' + filePath + '\n// No file created by FRONT-PRODUCT-5.\n'; }
    var tpl = ep.file_content_templates;
    var base = filePath.split('/').pop().split('\\').pop();
    return tpl[base] || tpl['_default'].replace(/<file>/g, filePath);
  }

  function hr5(ch, len) { return new Array((len || 64) + 1).join(ch || '─'); }

  function buildFolderTreePreview() {
    var c = getExportPreviewContext();
    var lines = [];
    lines.push('PROJECT EXPORT PREVIEW — FOLDER TREE');
    lines.push('Status: PREVIEW ONLY');
    lines.push('File creation: LOCKED');
    lines.push(hr5('═'));
    lines.push('');
    if (c.tpl && c.tpl.folder_structure.length) {
      c.tpl.folder_structure.forEach(function (f) { lines.push('  ' + f); });
    } else {
      lines.push('  (no template selected — select a project type to see folder structure)');
    }
    lines.push('');
    lines.push(hr5('─'));
    lines.push('No folders created. Preview only.');
    return lines;
  }

  function buildFileListPreview() {
    var c = getExportPreviewContext();
    var lines = [];
    lines.push('PROJECT EXPORT PREVIEW — FILE LIST');
    lines.push('Status: PREVIEW ONLY');
    lines.push('File creation: LOCKED');
    lines.push(hr5('═'));
    lines.push('');
    if (c.tpl && c.tpl.initial_files.length) {
      c.tpl.initial_files.forEach(function (f) { lines.push('  ○ ' + f); });
      lines.push('');
      lines.push('Total files: ' + c.tpl.initial_files.length);
    } else {
      lines.push('  (no template selected — select a project type to see file list)');
    }
    lines.push('');
    lines.push(hr5('─'));
    lines.push('No files created. Preview only.');
    return lines;
  }

  function buildFileContentPreview() {
    var c  = getExportPreviewContext();
    var ep = getExportPreviewRegistry();
    var lines = [];
    lines.push('PROJECT EXPORT PREVIEW — FILE CONTENT PLACEHOLDERS');
    lines.push('Status: PREVIEW ONLY');
    lines.push('File creation: LOCKED');
    lines.push(hr5('═'));
    lines.push('');
    if (!c.tpl || !c.tpl.initial_files.length) {
      lines.push('(no template selected — select a project type to see content preview)');
    } else {
      c.tpl.initial_files.forEach(function (f) {
        lines.push(hr5('─'));
        lines.push('FILE   : ' + f);
        lines.push('ACTION : WOULD CREATE IF APPROVED IN FUTURE PHASE');
        lines.push('CONTENT PREVIEW:');
        var content = getFilePlaceholder(f, ep);
        content.split('\n').forEach(function (l) { lines.push('  ' + l); });
        lines.push('');
      });
    }
    lines.push(hr5('─'));
    lines.push('No files created. Placeholders only.');
    return lines;
  }

  function buildImpactSummaryPreview() {
    var c  = getExportPreviewContext();
    var ep = getExportPreviewRegistry();
    var lines = [];
    lines.push('PROJECT EXPORT PREVIEW — IMPACT SUMMARY');
    lines.push('Status: PREVIEW ONLY');
    lines.push('File creation: LOCKED');
    lines.push(hr5('═'));
    lines.push('');

    var folderCount = c.tpl ? c.tpl.folder_structure.length : 0;
    var fileCount   = c.tpl ? c.tpl.initial_files.length    : 0;
    var agentCount  = c.agts ? (c.agts.on.length + c.agts.auto.length) : 0;
    var checkCount  = c.tpl ? c.tpl.validation_checklist.length : 0;
    var riskCount   = c.tpl ? c.tpl.risk_warnings.length : 0;
    var blockedCount = ep ? ep.blocked_actions.length : 0;

    lines.push('  Project Type    : ' + (c.ctx.projectType ? c.ctx.projectType.label : '(not selected)'));
    lines.push('  Template        : ' + (c.tpl ? c.tpl.name : '(none)'));
    lines.push('  Stack           : ' + (c.stack.length ? c.stack.join(', ') : '(none)'));
    lines.push('  Folders to create : ' + folderCount);
    lines.push('  Files to create   : ' + fileCount);
    lines.push('  Active agents     : ' + agentCount);
    lines.push('  Validation checks : ' + checkCount);
    lines.push('  Risk warnings     : ' + riskCount);
    lines.push('  Blocked actions   : ' + blockedCount);
    lines.push('');

    if (c.tpl && c.tpl.risk_warnings.length) {
      lines.push('Risks before creation:');
      c.tpl.risk_warnings.forEach(function (r) { lines.push('  ⚠ ' + r); });
      lines.push('');
    }

    lines.push('Next safe action:');
    lines.push('  Review preview and approval contract.');
    lines.push('  Real file creation remains locked.');
    if (ep) {
      lines.push('  Next required phase: ' + ep.file_creation_lock.next_required_phase);
    }
    return lines;
  }

  function buildApprovalContractPreview() {
    var ep  = getExportPreviewRegistry();
    var lines = [];
    lines.push('PROJECT EXPORT PREVIEW — APPROVAL CONTRACT');
    lines.push('Status: PREVIEW ONLY');
    lines.push('File creation: LOCKED');
    lines.push(hr5('═'));
    lines.push('');

    lines.push('Approval contract:');
    if (ep) {
      ep.approval_contract.forEach(function (c) { lines.push('  ✓ ' + c); });
    }
    lines.push('');

    lines.push('Blocked actions:');
    if (ep) {
      ep.blocked_actions.forEach(function (b) { lines.push('  ✗ ' + b); });
    }
    lines.push('');

    lines.push(hr5('─'));
    lines.push('Human approval boundary:');
    lines.push('  Real file creation requires explicit external human approval');
    lines.push('  and a separate controlled phase.');
    lines.push('  This frontend preview does not grant file creation authority.');
    return lines;
  }

  function buildProjectExportPreview() {
    var mode = exportPreviewState.selectedMode;
    var lines = [];

    if (mode === 'folder_tree')       { lines = buildFolderTreePreview(); }
    else if (mode === 'file_list')    { lines = buildFileListPreview(); }
    else if (mode === 'content_preview') { lines = buildFileContentPreview(); }
    else if (mode === 'impact_summary')  { lines = buildImpactSummaryPreview(); }
    else if (mode === 'approval_contract') { lines = buildApprovalContractPreview(); }

    exportPreviewState.generatedPreview = lines.join('\n');

    var lineEl = document.getElementById('vcExportLineCount');
    if (lineEl) { lineEl.textContent = lines.length; }

    return exportPreviewState.generatedPreview;
  }

  function renderProjectExportPreview() {
    /* Sync source summary */
    var c = getExportPreviewContext();
    function setVal(id, v) { var el = document.getElementById(id); if (el) { el.textContent = v || '—'; } }
    setVal('vcExpSrcType',     c.ctx.projectType ? c.ctx.projectType.label : null);
    setVal('vcExpSrcTemplate', c.tpl ? c.tpl.name : null);
    setVal('vcExpSrcStack',    c.stack.length ? c.stack.join(', ') : null);
    setVal('vcExpSrcSize',     c.ctx.projectSize ? c.ctx.projectSize.label : null);
    var agentCount = c.agts ? (c.agts.on.length + c.agts.auto.length) : 0;
    setVal('vcExpSrcAgents',   agentCount ? agentCount + ' ativos' : null);
    setVal('vcExpSrcHandoff',  handoffState && handoffState.selectedTarget
      ? handoffState.selectedTarget.replace(/_/g, ' ')
      : null);

    /* Build and render preview */
    var output = document.getElementById('vcExportOutput');
    if (!output) { return; }
    var text = buildProjectExportPreview();
    output.value = text;
    output.classList.remove('empty');
  }

  function copyProjectExportPreview() {
    var statusEl = document.getElementById('vcExportCopyStatus');
    if (!exportPreviewState.generatedPreview) {
      if (statusEl) {
        statusEl.textContent = 'Gere o preview primeiro.';
        statusEl.className = 'vc-export-copy-status visible error';
        setTimeout(function () { statusEl.className = 'vc-export-copy-status'; }, 2800);
      }
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(exportPreviewState.generatedPreview).then(function () {
        if (statusEl) {
          statusEl.textContent = '✓ Copiado!';
          statusEl.className = 'vc-export-copy-status visible';
          setTimeout(function () { statusEl.className = 'vc-export-copy-status'; }, 2800);
        }
      }, function () {
        if (statusEl) {
          statusEl.textContent = 'Selecione e copie manualmente.';
          statusEl.className = 'vc-export-copy-status visible error';
          setTimeout(function () { statusEl.className = 'vc-export-copy-status'; }, 3500);
        }
      });
    } else {
      if (statusEl) {
        statusEl.textContent = 'Selecione e copie manualmente.';
        statusEl.className = 'vc-export-copy-status visible error';
        setTimeout(function () { statusEl.className = 'vc-export-copy-status'; }, 3500);
      }
    }
  }

  function clearProjectExportPreview() {
    exportPreviewState.generatedPreview = '';
    var output = document.getElementById('vcExportOutput');
    if (output) {
      output.value = 'Clique em GERAR PREVIEW para visualizar a estrutura local.';
      output.classList.add('empty');
    }
    var lineEl = document.getElementById('vcExportLineCount');
    if (lineEl) { lineEl.textContent = '0'; }
    var statusEl = document.getElementById('vcExportCopyStatus');
    if (statusEl) { statusEl.className = 'vc-export-copy-status'; }
  }

  function initProjectExportPreview() {
    var ep = getExportPreviewRegistry();
    if (!ep) { return; }

    /* Build mode chips */
    var modeRow = document.getElementById('vcExportModeRow');
    if (modeRow) {
      ep.preview_modes.forEach(function (m) {
        var chip = document.createElement('button');
        chip.className = 'vc-export-mode-chip' + (m.id === exportPreviewState.selectedMode ? ' selected' : '');
        chip.setAttribute('data-export-mode', m.id);
        chip.type = 'button';
        chip.textContent = m.label;
        chip.addEventListener('click', function () { setExportPreviewMode(m.id); });
        modeRow.appendChild(chip);
      });
    }

    /* Wire buttons */
    var genBtn = document.getElementById('vcGenerateExportBtn');
    if (genBtn) {
      genBtn.addEventListener('click', function () {
        renderProjectExportPreview();
        genBtn.textContent = '✓ PREVIEW GERADO — CREATION LOCKED';
        genBtn.style.borderColor = 'rgba(34,197,94,.65)';
        genBtn.style.color = '#22c55e';
      });
    }

    var copyBtn = document.getElementById('vcCopyExportBtn');
    if (copyBtn) { copyBtn.addEventListener('click', copyProjectExportPreview); }

    var clearBtn = document.getElementById('vcClearExportBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        clearProjectExportPreview();
        if (genBtn) {
          genBtn.textContent = '⬡ GERAR PREVIEW';
          genBtn.style.borderColor = '';
          genBtn.style.color = '';
        }
      });
    }
  }

  /* ── Human Approval Gate — local UI only ─────────────────────── */
  /* No file creation. No write. No download. No export. No API.   */
  /* No Blob. No URL.createObjectURL. In-memory state only.        */

  var humanApprovalState = {
    checked:           {},
    generatedReceipt:  ''
  };

  function getHumanApprovalGateRegistry() {
    var pb = window.VISION_CORE_PROJECT_BUILDER;
    return (pb && pb.human_approval_gate) ? pb.human_approval_gate : null;
  }

  function getHumanApprovalContext() {
    /* Pull from existing in-memory states — no disk, no API */
    var type     = (typeof pbState !== 'undefined' && pbState.selectedType)     ? pbState.selectedType     : '—';
    var stack    = (typeof pbState !== 'undefined' && pbState.selectedStack)    ? pbState.selectedStack    : '—';
    var size     = (typeof pbState !== 'undefined' && pbState.selectedSize)     ? pbState.selectedSize     : '—';
    var tpl      = (typeof pbTemplateState !== 'undefined' && pbTemplateState.selectedTemplate) ? pbTemplateState.selectedTemplate : '—';
    var agents   = (typeof pbState !== 'undefined' && Array.isArray(pbState.activeAgents)) ? pbState.activeAgents.length : 0;

    /* Derive folder/file counts from export preview if generated */
    var folderCount = 6;
    var fileCount   = 10;
    var validCount  = 4;
    var riskCount   = 3;
    if (typeof exportPreviewState !== 'undefined' && exportPreviewState.generatedPreview) {
      var lines = exportPreviewState.generatedPreview.split('\n');
      var fc = lines.filter(function (l) { return l.indexOf('/') !== -1 && l.trim().slice(-1) === '/'; }).length;
      var fl = lines.filter(function (l) { return l.indexOf('.') !== -1 && l.trim().slice(-1) !== '/'; }).length;
      if (fc > 0) { folderCount = fc; }
      if (fl > 0) { fileCount   = fl; }
    }

    return {
      type:        type,
      template:    tpl,
      stack:       stack,
      size:        size,
      agentCount:  agents,
      folderCount: folderCount,
      fileCount:   fileCount,
      validCount:  validCount,
      riskCount:   riskCount
    };
  }

  function toggleHumanAcknowledgement(ackId) {
    humanApprovalState.checked[ackId] = !humanApprovalState.checked[ackId];
    renderHumanApprovalChecklist();
    _updateHumanGateProgress();
  }

  function resetHumanApprovalChecklist() {
    humanApprovalState.checked = {};
    humanApprovalState.generatedReceipt = '';
    renderHumanApprovalChecklist();
    _updateHumanGateProgress();
    var output = document.getElementById('vcHumanReceiptOutput');
    if (output) {
      output.value = 'Clique em GERAR RECIBO LOCAL para gerar o recibo.';
      output.className = 'vc-human-receipt-output empty';
    }
    var statusEl = document.getElementById('vcHumanCopyStatus');
    if (statusEl) { statusEl.className = 'vc-human-copy-status'; }
    var genBtn = document.getElementById('vcGenerateReceiptBtn');
    if (genBtn) {
      genBtn.textContent = '⬡ GERAR RECIBO LOCAL';
      genBtn.style.borderColor = '';
      genBtn.style.color = '';
    }
  }

  function areAllHumanAcknowledgementsChecked() {
    var hag = getHumanApprovalGateRegistry();
    if (!hag) { return false; }
    return hag.required_acknowledgements.every(function (a) {
      return !!humanApprovalState.checked[a.id];
    });
  }

  function _updateHumanGateProgress() {
    var hag = getHumanApprovalGateRegistry();
    if (!hag) { return; }
    var total   = hag.required_acknowledgements.length;
    var checked = hag.required_acknowledgements.filter(function (a) {
      return !!humanApprovalState.checked[a.id];
    }).length;
    var allDone = checked === total;

    /* Summary approval status */
    var approvalEl = document.getElementById('vcHagApprovalStatus');
    if (approvalEl) { approvalEl.textContent = allDone ? 'PRONTO' : (checked + '/' + total + ' pendentes'); }

    /* Counter + gate badge in checklist area */
    var countEl = document.getElementById('vcHagAckCount');
    if (countEl) { countEl.textContent = checked; }
    var gateEl = document.getElementById('vcHagGateStatus');
    if (gateEl) {
      gateEl.textContent = allDone ? 'PRONTO' : 'INCOMPLETO';
      gateEl.className   = 'vc-human-status ' + (allDone ? 'ready' : 'incomplete');
    }

    /* Receipt header counters */
    var rcAckEl = document.getElementById('vcHagReceiptAckCount');
    if (rcAckEl) { rcAckEl.textContent = checked; }
    var rcStatusEl = document.getElementById('vcHagReceiptStatus');
    if (rcStatusEl) {
      rcStatusEl.textContent = allDone ? 'PRONTO' : 'INCOMPLETO';
      rcStatusEl.className   = 'vc-human-status ' + (allDone ? 'ready' : 'incomplete');
    }
  }

  function buildHumanApprovalReceipt() {
    var hag = getHumanApprovalGateRegistry();
    if (!hag) { return ''; }
    var ctx     = getHumanApprovalContext();
    var allDone = areAllHumanAcknowledgementsChecked();
    var total   = hag.required_acknowledgements.length;
    var checked = hag.required_acknowledgements.filter(function (a) {
      return !!humanApprovalState.checked[a.id];
    }).length;

    var lines = [];
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('   VISION CORE — RECIBO DE APROVAÇÃO HUMANA');
    lines.push('   FRONT-PRODUCT-6 | Local Preview Only');
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('');
    lines.push('STATUS: ' + (allDone ? 'LOCAL PREVIEW READY' : 'INCOMPLETO'));
    lines.push('');
    lines.push('── Contexto do Projeto ─────────────────────────────────────────');
    lines.push('  Tipo de Projeto  : ' + ctx.type);
    lines.push('  Template         : ' + ctx.template);
    lines.push('  Stack            : ' + ctx.stack);
    lines.push('  Tamanho/Risco    : ' + ctx.size);
    lines.push('  Agentes Ativos   : ' + ctx.agentCount);
    lines.push('  Pastas Previstas : ' + ctx.folderCount);
    lines.push('  Arquivos Previstos: ' + ctx.fileCount);
    lines.push('  Validações       : ' + ctx.validCount);
    lines.push('  Riscos           : ' + ctx.riskCount);
    lines.push('');
    lines.push('── Confirmações (' + checked + '/' + total + ') ──────────────────────────────────────');
    hag.required_acknowledgements.forEach(function (a) {
      var mark = humanApprovalState.checked[a.id] ? '[✓]' : '[ ]';
      lines.push('  ' + mark + ' ' + a.text);
    });
    lines.push('');
    lines.push('── Capacidades Bloqueadas ───────────────────────────────────────');
    hag.locked_capabilities.forEach(function (cap) {
      lines.push('  ⊗ ' + cap.toUpperCase().replace(/_/g, ' ') + ' — LOCKED');
    });
    lines.push('');
    lines.push('── Estado de Autoridade Final ──────────────────────────────────');
    lines.push('  human_approval_gate_ready  : ' + allDone);
    lines.push('  human_approval_collected   : ' + allDone);
    lines.push('  file_creation_allowed      : false');
    lines.push('  real_file_creation_enabled : false');
    lines.push('  backend_write_allowed      : false');
    lines.push('  command_execution_allowed  : false');
    lines.push('  deploy_allowed             : false');
    lines.push('  release_allowed            : false');
    lines.push('  tag_allowed                : false');
    lines.push('  stable_promotion_allowed   : false');
    lines.push('  production_touched         : false');
    lines.push('  pass_gold_real_claimed     : false');
    lines.push('');
    lines.push('── Fronteira do Próximo Phase ──────────────────────────────────');
    lines.push('  ' + hag.next_phase_boundary);
    lines.push('');
    lines.push('── Aviso Final ─────────────────────────────────────────────────');
    lines.push('  ' + hag.required_final_warning);
    lines.push('  Este recibo é evidência local de prévia apenas.');
    lines.push('  Não cria arquivos.');
    lines.push('  Não concede autoridade de escrita backend.');
    lines.push('  Não concede autoridade de execução de comandos.');
    lines.push('  Não concede autoridade de deploy/release/tag/stable.');
    lines.push('  Não reivindica PASS GOLD REAL.');
    if (allDone) {
      lines.push('');
      lines.push('  Próximo phase obrigatório:');
      lines.push('  FRONT-PRODUCT-7 ou comando explícito separado de criação real de arquivos.');
    }
    lines.push('');
    lines.push('═══════════════════════════════════════════════════════════════');
    return lines.join('\n');
  }

  function renderHumanApprovalReceipt() {
    var receipt = buildHumanApprovalReceipt();
    humanApprovalState.generatedReceipt = receipt;
    var output = document.getElementById('vcHumanReceiptOutput');
    if (!output) { return; }
    output.value = receipt;
    output.className = 'vc-human-receipt-output' + (receipt ? '' : ' empty');
    _updateHumanGateProgress();
  }

  function copyHumanApprovalReceipt() {
    var text     = humanApprovalState.generatedReceipt;
    var statusEl = document.getElementById('vcHumanCopyStatus');
    if (!text) {
      if (statusEl) {
        statusEl.textContent  = '⚠ Gere o recibo primeiro.';
        statusEl.className    = 'vc-human-copy-status visible error';
        setTimeout(function () { statusEl.className = 'vc-human-copy-status'; }, 2500);
      }
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        if (statusEl) {
          statusEl.textContent = '✓ Copiado!';
          statusEl.className   = 'vc-human-copy-status visible';
          setTimeout(function () { statusEl.className = 'vc-human-copy-status'; }, 2500);
        }
      }).catch(function () {
        if (statusEl) {
          statusEl.textContent = 'Selecione e copie manualmente.';
          statusEl.className   = 'vc-human-copy-status visible error';
          setTimeout(function () { statusEl.className = 'vc-human-copy-status'; }, 3000);
        }
      });
    } else {
      if (statusEl) {
        statusEl.textContent = 'Selecione e copie manualmente.';
        statusEl.className   = 'vc-human-copy-status visible error';
        setTimeout(function () { statusEl.className = 'vc-human-copy-status'; }, 3000);
      }
    }
  }

  function clearHumanApprovalReceipt() {
    humanApprovalState.generatedReceipt = '';
    var output = document.getElementById('vcHumanReceiptOutput');
    if (output) {
      output.value     = 'Clique em GERAR RECIBO LOCAL para gerar o recibo.';
      output.className = 'vc-human-receipt-output empty';
    }
    var statusEl = document.getElementById('vcHumanCopyStatus');
    if (statusEl) { statusEl.className = 'vc-human-copy-status'; }
  }

  function renderHumanApprovalChecklist() {
    var hag = getHumanApprovalGateRegistry();
    var container = document.getElementById('vcHumanAckChecklist');
    if (!hag || !container) { return; }
    /* Rebuild checklist DOM */
    container.innerHTML = '';
    hag.required_acknowledgements.forEach(function (ack) {
      var item = document.createElement('div');
      var isChecked = !!humanApprovalState.checked[ack.id];
      item.className = 'vc-human-ack-item' + (isChecked ? ' checked' : '');
      item.setAttribute('role', 'checkbox');
      item.setAttribute('aria-checked', isChecked ? 'true' : 'false');
      item.setAttribute('tabindex', '0');
      item.setAttribute('data-ack-id', ack.id);

      var box = document.createElement('span');
      box.className   = 'vc-human-ack-box';
      box.textContent = isChecked ? '✓' : '';

      var textEl = document.createElement('span');
      textEl.className   = 'vc-human-ack-text';
      textEl.textContent = ack.text;

      item.appendChild(box);
      item.appendChild(textEl);
      item.addEventListener('click', function () { toggleHumanAcknowledgement(ack.id); });
      item.addEventListener('keydown', function (e) {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleHumanAcknowledgement(ack.id); }
      });
      container.appendChild(item);
    });
  }

  function renderHumanApprovalSummary() {
    var ctx = getHumanApprovalContext();
    var map = {
      vcHagSrcType:     ctx.type,
      vcHagSrcTemplate: ctx.template,
      vcHagSrcStack:    ctx.stack,
      vcHagSrcSize:     ctx.size,
      vcHagSrcAgents:   ctx.agentCount + ' agente(s)',
      vcHagFolderCount: ctx.folderCount + ' pasta(s)',
      vcHagFileCount:   ctx.fileCount  + ' arquivo(s)'
    };
    Object.keys(map).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) { el.textContent = map[id]; }
    });
  }

  function initHumanApprovalGate() {
    var hag = getHumanApprovalGateRegistry();
    if (!hag) { return; }

    renderHumanApprovalChecklist();
    renderHumanApprovalSummary();
    _updateHumanGateProgress();

    /* Wire buttons */
    var genBtn = document.getElementById('vcGenerateReceiptBtn');
    if (genBtn) {
      genBtn.addEventListener('click', function () {
        renderHumanApprovalSummary();
        renderHumanApprovalReceipt();
        var allDone = areAllHumanAcknowledgementsChecked();
        genBtn.textContent    = allDone ? '✓ RECIBO LOCAL PRONTO' : '✓ RECIBO GERADO — INCOMPLETO';
        genBtn.style.borderColor = allDone ? 'rgba(34,197,94,.65)' : 'rgba(251,146,60,.65)';
        genBtn.style.color       = allDone ? '#22c55e'             : '#fb923c';
      });
    }

    var copyBtn = document.getElementById('vcCopyReceiptBtn');
    if (copyBtn) { copyBtn.addEventListener('click', copyHumanApprovalReceipt); }

    var clearBtn = document.getElementById('vcClearReceiptBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        clearHumanApprovalReceipt();
        if (genBtn) {
          genBtn.textContent       = '⬡ GERAR RECIBO LOCAL';
          genBtn.style.borderColor = '';
          genBtn.style.color       = '';
        }
      });
    }

    var resetBtn = document.getElementById('vcResetAckBtn');
    if (resetBtn) { resetBtn.addEventListener('click', resetHumanApprovalChecklist); }
  }

  /* ── Real File Creation Command Package — local UI only ──────── */
  /* No file creation. No write. No download. No export. No API.  */
  /* No Blob. No URL.createObjectURL. In-memory state only.       */

  var realFileCommandState = {
    selectedMode:      'full_real_file_creation_package',
    selectedWorker:    'claude_code',
    generatedPackage:  ''
  };

  function getRealFileCommandPackageRegistry() {
    var pb = window.VISION_CORE_PROJECT_BUILDER;
    return (pb && pb.real_file_command_package) ? pb.real_file_command_package : null;
  }

  function setRealFileCommandMode(modeId) {
    realFileCommandState.selectedMode = modeId;
    var modeRow = document.getElementById('vcRealCommandModeRow');
    if (modeRow) {
      Array.prototype.forEach.call(modeRow.querySelectorAll('.vc-real-command-mode-chip'), function (c) {
        c.className = 'vc-real-command-mode-chip' + (c.getAttribute('data-cmd-mode') === modeId ? ' selected' : '');
      });
    }
  }

  function setRealFileCommandWorker(workerId) {
    realFileCommandState.selectedWorker = workerId;
    var workerRow = document.getElementById('vcRealCommandWorkerRow');
    if (workerRow) {
      Array.prototype.forEach.call(workerRow.querySelectorAll('.vc-real-command-worker-chip'), function (c) {
        c.className = 'vc-real-command-worker-chip' + (c.getAttribute('data-cmd-worker') === workerId ? ' selected' : '');
      });
    }
  }

  function getRealFileCommandContext() {
    var type    = (typeof pbState !== 'undefined' && pbState.selectedType)  ? pbState.selectedType  : '—';
    var stack   = (typeof pbState !== 'undefined' && pbState.selectedStack) ? pbState.selectedStack : '—';
    var size    = (typeof pbState !== 'undefined' && pbState.selectedSize)  ? pbState.selectedSize  : '—';
    var tpl     = (typeof pbTemplateState !== 'undefined' && pbTemplateState.selectedTemplate) ? pbTemplateState.selectedTemplate : '—';
    var agents  = (typeof pbState !== 'undefined' && Array.isArray(pbState.activeAgents)) ? pbState.activeAgents : [];

    /* Template registry detail */
    var tplDetail = null;
    var pb = window.VISION_CORE_PROJECT_BUILDER;
    if (pb && pb.template_packs && tpl !== '—') {
      tplDetail = null;
      for (var i = 0; i < pb.template_packs.length; i++) {
        if (pb.template_packs[i].id === tpl) { tplDetail = pb.template_packs[i]; break; }
      }
    }

    var exportAvailable = (typeof exportPreviewState !== 'undefined' && !!exportPreviewState.generatedPreview);
    var approvalReady   = (typeof humanApprovalState !== 'undefined' && areAllHumanAcknowledgementsChecked());
    var receiptAvailable = (typeof humanApprovalState !== 'undefined' && !!humanApprovalState.generatedReceipt);

    return {
      type:            type,
      template:        tpl,
      tplDetail:       tplDetail,
      stack:           stack,
      size:            size,
      agents:          agents,
      exportAvailable: exportAvailable,
      approvalReady:   approvalReady,
      receiptAvailable:receiptAvailable
    };
  }

  function isHumanApprovalGateReadyForCommand() {
    return (typeof humanApprovalState !== 'undefined') && areAllHumanAcknowledgementsChecked();
  }

  function renderRealFileCommandStatus() {
    var ctx = getRealFileCommandContext();

    /* Readiness cards */
    var setCard = function (cardId, valId, label, isReady) {
      var card = document.getElementById(cardId);
      var val  = document.getElementById(valId);
      if (card) { card.className = 'vc-real-readiness-card ' + (isReady ? 'ready' : 'blocked'); }
      if (val)  { val.textContent = label; }
    };

    setCard('vcRealReadyType',     'vcRealReadyTypeVal',     ctx.type !== '—'  ? ctx.type  : 'Não selecionado', ctx.type !== '—');
    setCard('vcRealReadyTpl',      'vcRealReadyTplVal',      ctx.template !== '—' ? ctx.template : 'Não selecionado', ctx.template !== '—');
    setCard('vcRealReadyStack',    'vcRealReadyStackVal',    ctx.stack !== '—' ? ctx.stack : 'Não selecionado', ctx.stack !== '—');
    setCard('vcRealReadyExport',   'vcRealReadyExportVal',   ctx.exportAvailable  ? 'Disponível'  : 'Não gerado',   ctx.exportAvailable);
    setCard('vcRealReadyApproval', 'vcRealReadyApprovalVal', ctx.approvalReady    ? 'PRONTO'      : 'Incompleto',   ctx.approvalReady);

    var hag = getHumanApprovalGateRegistry ? getHumanApprovalGateRegistry() : null;
    var total   = hag ? hag.required_acknowledgements.length : 12;
    var checked = (typeof humanApprovalState !== 'undefined')
      ? (hag ? hag.required_acknowledgements.filter(function (a) { return !!humanApprovalState.checked[a.id]; }).length : 0)
      : 0;
    setCard('vcRealReadyAck', 'vcRealReadyAckVal', checked + '/' + total, checked === total);
  }

  /* ── Package builders ──────────────────────────────────────── */

  function _cmdHeader(ctx, mode, worker, gateReady) {
    var lines = [];
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('   VISION CORE — PACOTE DE COMANDO PARA CRIAÇÃO REAL');
    lines.push('   FRONT-PRODUCT-7 | External Command Package — Text Only');
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('');
    lines.push('MODO     : ' + mode);
    lines.push('WORKER   : ' + worker);
    lines.push('STATUS   : ' + (gateReady ? 'READY FOR EXTERNAL HUMAN-CONTROLLED WORKER' : 'BLOCKED UNTIL HUMAN APPROVAL GATE READY'));
    lines.push('');
    lines.push('── Autoridade ──────────────────────────────────────────────────');
    lines.push('  frontend_file_creation_allowed  : false');
    lines.push('  real_file_creation_enabled      : false');
    lines.push('  frontend_file_write_allowed     : false');
    lines.push('  backend_write_allowed           : false');
    lines.push('  command_execution_allowed       : false');
    lines.push('  external_worker_required        : true');
    lines.push('  human_approval_required         : true');
    lines.push('  deploy_allowed                  : false');
    lines.push('  release_allowed                 : false');
    lines.push('  tag_allowed                     : false');
    lines.push('  stable_promotion_allowed        : false');
    lines.push('  production_touched              : false');
    lines.push('  pass_gold_real_claimed          : false');
    lines.push('');
    lines.push('── Contexto do Projeto ─────────────────────────────────────────');
    lines.push('  Tipo de Projeto  : ' + ctx.type);
    lines.push('  Template         : ' + ctx.template);
    lines.push('  Stack            : ' + ctx.stack);
    lines.push('  Tamanho/Risco    : ' + ctx.size);
    lines.push('  Agentes Ativos   : ' + ctx.agents.length);
    if (ctx.tplDetail) {
      lines.push('  Pastas Previstas : ' + (ctx.tplDetail.folder_count || ctx.tplDetail.preview_folders || '—'));
      lines.push('  Arquivos Previstos: ' + (ctx.tplDetail.file_count || ctx.tplDetail.preview_files || '—'));
    }
    lines.push('  Export Preview   : ' + (ctx.exportAvailable ? 'Disponível' : 'Não gerado'));
    lines.push('  Aprovação Gate   : ' + (ctx.approvalReady ? 'PRONTO' : 'INCOMPLETO'));
    lines.push('');
    return lines;
  }

  function _cmdFooter(pkg) {
    var lines = [];
    lines.push('');
    lines.push('── Regras de Segurança do Pacote ───────────────────────────────');
    pkg.command_safety_rules.forEach(function (r) {
      lines.push('  ✓ ' + r);
    });
    lines.push('');
    lines.push('── Aviso de Não-Autoridade ─────────────────────────────────────');
    lines.push('  ' + pkg.explicit_non_authority_statement);
    lines.push('');
    lines.push('── Contrato de Relatório Final ─────────────────────────────────');
    pkg.final_report_contract.forEach(function (item) {
      lines.push('  [ ] ' + item);
    });
    lines.push('');
    lines.push('═══════════════════════════════════════════════════════════════');
    return lines;
  }

  function buildFullRealFileCreationPackage() {
    var pkg = getRealFileCommandPackageRegistry();
    if (!pkg) { return ''; }
    var ctx       = getRealFileCommandContext();
    var gateReady = isHumanApprovalGateReadyForCommand();
    var workerProfile = pkg.external_worker_profiles.filter(function (w) {
      return w.id === realFileCommandState.selectedWorker;
    })[0] || pkg.external_worker_profiles[0];

    var lines = _cmdHeader(ctx, 'Full Real File Creation Package', workerProfile.label, gateReady);
    lines.push('── Tarefa do Worker Externo ────────────────────────────────────');
    lines.push('  Worker: ' + workerProfile.label + ' (' + workerProfile.role + ')');
    lines.push('  Estilo: ' + workerProfile.instruction_style);
    lines.push('');
    lines.push('  INSTRUÇÃO:');
    lines.push('  Crie os arquivos abaixo em uma fase externa separada e autorizada.');
    lines.push('  Siga a estrutura de pastas e os arquivos iniciais do template selecionado.');
    lines.push('  Use o conteúdo placeholder do export preview como ponto de partida.');
    lines.push('');
    lines.push('  CAMINHOS PERMITIDOS (baseados no template "' + ctx.template + '"):');
    if (ctx.tplDetail && ctx.tplDetail.folder_structure) {
      ctx.tplDetail.folder_structure.forEach(function (f) {
        lines.push('    + ' + f);
      });
    } else {
      lines.push('    (Ver export preview para estrutura detalhada)');
    }
    lines.push('');
    lines.push('  ARQUIVOS INICIAIS:');
    if (ctx.tplDetail && ctx.tplDetail.initial_files) {
      ctx.tplDetail.initial_files.forEach(function (f) {
        lines.push('    + ' + f);
      });
    } else {
      lines.push('    (Ver export preview para lista de arquivos)');
    }
    lines.push('');
    lines.push('  RESTRIÇÕES ABSOLUTAS:');
    lines.push('  ⊗ Não modificar backend/*, go-core/*, tools/*, package.json');
    lines.push('  ⊗ Não fazer deploy/release/tag/stable/produção');
    lines.push('  ⊗ Não reivindicar PASS GOLD REAL');
    lines.push('  ⊗ Reportar todo arquivo criado/modificado');
    lines.push('');
    lines.push('  VALIDAÇÃO (executar manualmente após criar arquivos):');
    lines.push('  $ node --check <arquivo.js>');
    lines.push('  $ git status');
    lines.push('  $ git diff --stat');
    lines = lines.concat(_cmdFooter(pkg));
    return lines.join('\n');
  }

  function buildClaudeCodeFileCreationTask() {
    var pkg = getRealFileCommandPackageRegistry();
    if (!pkg) { return ''; }
    var ctx       = getRealFileCommandContext();
    var gateReady = isHumanApprovalGateReadyForCommand();

    var lines = _cmdHeader(ctx, 'Claude Code File Creation Task', 'Claude Code', gateReady);
    lines.push('── Tarefa para Claude Code ─────────────────────────────────────');
    lines.push('  Você é um worker externo local. Não é o Vision Core frontend.');
    lines.push('');
    lines.push('  CONTEXTO DO PROJETO:');
    lines.push('  Repositório: C:\\Users\\<operador>\\Desktop\\vision-core  (ajustar)');
    lines.push('  Template   : ' + ctx.template);
    lines.push('  Stack      : ' + ctx.stack);
    lines.push('  Tipo       : ' + ctx.type);
    lines.push('');
    lines.push('  FASE: Criação local de arquivos em branch separado.');
    lines.push('');
    lines.push('  PASSO 1 — CRIAR BRANCH:');
    lines.push('  git checkout main');
    lines.push('  git pull origin main');
    lines.push('  git checkout -b feat/real-file-creation-<data>');
    lines.push('');
    lines.push('  PASSO 2 — CRIAR ESTRUTURA DE PASTAS E ARQUIVOS:');
    if (ctx.tplDetail && ctx.tplDetail.folder_structure) {
      ctx.tplDetail.folder_structure.forEach(function (f) {
        lines.push('  mkdir -p ' + f.replace(/\/$/, ''));
      });
    } else {
      lines.push('  (Consulte o export preview para estrutura de pastas)');
    }
    lines.push('');
    if (ctx.tplDetail && ctx.tplDetail.initial_files) {
      ctx.tplDetail.initial_files.forEach(function (f) {
        lines.push('  Criar arquivo: ' + f);
      });
    } else {
      lines.push('  (Consulte o export preview para lista de arquivos)');
    }
    lines.push('');
    lines.push('  PASSO 3 — VALIDAÇÃO:');
    lines.push('  node --check <arquivos JS criados>');
    lines.push('  git status');
    lines.push('  git diff --stat');
    lines.push('');
    lines.push('  CAMINHOS PROIBIDOS (não tocar):');
    lines.push('  ⊗ backend/*');
    lines.push('  ⊗ go-core/*');
    lines.push('  ⊗ tools/*');
    lines.push('  ⊗ package.json');
    lines.push('');
    lines.push('  NÃO FAZER SEM INSTRUÇÃO EXPLÍCITA:');
    lines.push('  ⊗ git push');
    lines.push('  ⊗ gh pr create');
    lines.push('  ⊗ git tag');
    lines.push('  ⊗ npm publish / deploy');
    lines.push('');
    lines.push('  RELATÓRIO FINAL OBRIGATÓRIO:');
    pkg.final_report_contract.forEach(function (item) {
      lines.push('  [ ] ' + item);
    });
    lines = lines.concat(_cmdFooter(pkg));
    return lines.join('\n');
  }

  function buildManualOperatorFileCreationChecklist() {
    var pkg = getRealFileCommandPackageRegistry();
    if (!pkg) { return ''; }
    var ctx       = getRealFileCommandContext();
    var gateReady = isHumanApprovalGateReadyForCommand();

    var lines = _cmdHeader(ctx, 'Manual Operator File Creation Checklist', 'Manual Operator', gateReady);
    lines.push('── Checklist para Operador Manual ──────────────────────────────');
    lines.push('');
    lines.push('  [ ] 1. Verificar branch atual:');
    lines.push('          git branch');
    lines.push('          git status');
    lines.push('');
    lines.push('  [ ] 2. Criar branch de trabalho:');
    lines.push('          git checkout main && git pull origin main');
    lines.push('          git checkout -b feat/real-file-creation-<data>');
    lines.push('');
    lines.push('  [ ] 3. Criar estrutura de pastas manualmente:');
    if (ctx.tplDetail && ctx.tplDetail.folder_structure) {
      ctx.tplDetail.folder_structure.forEach(function (f) {
        lines.push('          [ ] mkdir ' + f);
      });
    } else {
      lines.push('          (Ver export preview para estrutura)');
    }
    lines.push('');
    lines.push('  [ ] 4. Criar arquivos iniciais manualmente:');
    if (ctx.tplDetail && ctx.tplDetail.initial_files) {
      ctx.tplDetail.initial_files.forEach(function (f) {
        lines.push('          [ ] Criar e preencher: ' + f);
      });
    } else {
      lines.push('          (Ver export preview para lista de arquivos)');
    }
    lines.push('');
    lines.push('  [ ] 5. Colar conteúdo placeholder do export preview');
    lines.push('  [ ] 6. Revisar diff: git diff --stat');
    lines.push('  [ ] 7. Executar validação: node --check <arquivos.js>');
    lines.push('  [ ] 8. Confirmar: git status');
    lines.push('  [ ] 9. NÃO fazer deploy/release/tag/stable/push sem instrução explícita');
    lines.push('  [ ] 10. NÃO reivindicar PASS GOLD REAL');
    lines.push('  [ ] 11. Preencher relatório final');
    lines.push('');
    lines = lines.concat(_cmdFooter(pkg));
    return lines.join('\n');
  }

  function buildSafetyFirstDryRunPackage() {
    var pkg = getRealFileCommandPackageRegistry();
    if (!pkg) { return ''; }
    var ctx       = getRealFileCommandContext();
    var gateReady = isHumanApprovalGateReadyForCommand();

    var lines = _cmdHeader(ctx, 'Safety-First Dry Run Package', realFileCommandState.selectedWorker, gateReady);
    lines.push('── Dry Run — Simulação Apenas (NÃO CRIA ARQUIVOS REAIS) ────────');
    lines.push('');
    lines.push('  Este pacote solicita SIMULAÇÃO da criação de arquivos apenas.');
    lines.push('  Nenhum arquivo real deve ser criado nesta fase.');
    lines.push('');
    lines.push('  SIMULAÇÃO — Estrutura que SERIA criada:');
    if (ctx.tplDetail && ctx.tplDetail.folder_structure) {
      ctx.tplDetail.folder_structure.forEach(function (f) {
        lines.push('  [DRY RUN] pasta : ' + f);
      });
    }
    if (ctx.tplDetail && ctx.tplDetail.initial_files) {
      ctx.tplDetail.initial_files.forEach(function (f) {
        lines.push('  [DRY RUN] arquivo: ' + f);
      });
    }
    if (!ctx.tplDetail) {
      lines.push('  (Ver export preview para estrutura simulada)');
    }
    lines.push('');
    lines.push('  VALIDAÇÃO DRY RUN (não cria arquivos):');
    lines.push('  $ git status   # verificar branch limpo');
    lines.push('  $ git diff     # nenhum diff esperado');
    lines.push('');
    lines.push('  PRÓXIMO PASSO (após revisão humana do dry run):');
    lines.push('  Usar Full Real File Creation Package com aprovação explícita.');
    lines.push('');
    lines = lines.concat(_cmdFooter(pkg));
    return lines.join('\n');
  }

  function buildValidationOnlyPackage() {
    var pkg = getRealFileCommandPackageRegistry();
    if (!pkg) { return ''; }
    var ctx       = getRealFileCommandContext();
    var gateReady = isHumanApprovalGateReadyForCommand();

    var lines = _cmdHeader(ctx, 'Validation-Only Package', realFileCommandState.selectedWorker, gateReady);
    lines.push('── Pacote de Validação Apenas (SEM CRIAÇÃO DE ARQUIVOS) ────────');
    lines.push('');
    lines.push('  Este pacote NÃO inclui instruções de criação de arquivos.');
    lines.push('  Use-o para verificar o estado atual do repositório e validar');
    lines.push('  precondições antes de qualquer fase real de criação.');
    lines.push('');
    lines.push('  VERIFICAÇÕES DE PRÉ-ESTADO:');
    lines.push('  $ git status              # repositório limpo?');
    lines.push('  $ git branch              # branch correto?');
    lines.push('  $ git log --oneline -5    # histórico recente');
    lines.push('  $ node --version          # Node.js disponível?');
    lines.push('');
    lines.push('  SCAN DE SEGURANÇA (exibir resultado, não executar ação):');
    lines.push('  Verificar manualmente ausência de:');
    lines.push('  - fetch(), XMLHttpRequest, eval(), exec(), spawn()');
    lines.push('  - localStorage, sessionStorage');
    lines.push('  - Blob, URL.createObjectURL');
    lines.push('  - file_creation_allowed: true');
    lines.push('  - real_file_creation_enabled: true');
    lines.push('');
    lines.push('  VERIFICAÇÃO DE ESCOPO:');
    lines.push('  $ git diff --name-only main...HEAD');
    lines.push('  Confirmar: apenas arquivos frontend/ alterados');
    lines.push('');
    lines.push('  VERIFICAÇÃO DE FLAGS DE SEGURANÇA:');
    lines.push('  Confirmar em vision-core-clean-state.js:');
    lines.push('  - pass_gold_real_claimed: false');
    lines.push('  - stable_promotion_allowed: false');
    lines.push('  - release_allowed: false');
    lines.push('  - production_touched: false');
    lines.push('');
    lines = lines.concat(_cmdFooter(pkg));
    return lines.join('\n');
  }

  function buildRealFileCommandPackage() {
    var mode = realFileCommandState.selectedMode;
    if (mode === 'claude_code_file_creation_task')          { return buildClaudeCodeFileCreationTask(); }
    if (mode === 'manual_operator_file_creation_checklist') { return buildManualOperatorFileCreationChecklist(); }
    if (mode === 'safety_first_dry_run_package')            { return buildSafetyFirstDryRunPackage(); }
    if (mode === 'validation_only_package')                 { return buildValidationOnlyPackage(); }
    return buildFullRealFileCreationPackage();
  }

  function renderRealFileCommandPackage() {
    renderRealFileCommandStatus();
    var pkg = buildRealFileCommandPackage();
    realFileCommandState.generatedPackage = pkg;

    var output = document.getElementById('vcRealCommandOutput');
    if (output) {
      output.value     = pkg;
      output.className = 'vc-real-command-output' + (pkg ? '' : ' empty');
    }
    var lineEl = document.getElementById('vcRealCommandLineCount');
    if (lineEl && pkg) { lineEl.textContent = pkg.split('\n').length; }
  }

  function copyRealFileCommandPackage() {
    var text     = realFileCommandState.generatedPackage;
    var statusEl = document.getElementById('vcRealCommandCopyStatus');
    if (!text) {
      if (statusEl) {
        statusEl.textContent = '⚠ Gere o pacote primeiro.';
        statusEl.className   = 'vc-real-command-copy-status visible error';
        setTimeout(function () { statusEl.className = 'vc-real-command-copy-status'; }, 2500);
      }
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        if (statusEl) {
          statusEl.textContent = '✓ Copiado!';
          statusEl.className   = 'vc-real-command-copy-status visible';
          setTimeout(function () { statusEl.className = 'vc-real-command-copy-status'; }, 2500);
        }
      }).catch(function () {
        if (statusEl) {
          statusEl.textContent = 'Selecione e copie manualmente.';
          statusEl.className   = 'vc-real-command-copy-status visible error';
          setTimeout(function () { statusEl.className = 'vc-real-command-copy-status'; }, 3000);
        }
      });
    } else {
      if (statusEl) {
        statusEl.textContent = 'Selecione e copie manualmente.';
        statusEl.className   = 'vc-real-command-copy-status visible error';
        setTimeout(function () { statusEl.className = 'vc-real-command-copy-status'; }, 3000);
      }
    }
  }

  function clearRealFileCommandPackage() {
    realFileCommandState.generatedPackage = '';
    var output = document.getElementById('vcRealCommandOutput');
    if (output) {
      output.value     = 'Clique em GERAR PACOTE DE COMANDO para gerar o pacote.';
      output.className = 'vc-real-command-output empty';
    }
    var lineEl = document.getElementById('vcRealCommandLineCount');
    if (lineEl) { lineEl.textContent = '0'; }
    var statusEl = document.getElementById('vcRealCommandCopyStatus');
    if (statusEl) { statusEl.className = 'vc-real-command-copy-status'; }
  }

  function initRealFileCommandPackage() {
    var pkg = getRealFileCommandPackageRegistry();
    if (!pkg) { return; }

    /* Build mode chips */
    var modeRow = document.getElementById('vcRealCommandModeRow');
    if (modeRow) {
      pkg.package_modes.forEach(function (m) {
        var chip = document.createElement('button');
        chip.className = 'vc-real-command-mode-chip' + (m.id === realFileCommandState.selectedMode ? ' selected' : '');
        chip.setAttribute('data-cmd-mode', m.id);
        chip.type = 'button';
        chip.textContent = m.label;
        chip.addEventListener('click', function () { setRealFileCommandMode(m.id); });
        modeRow.appendChild(chip);
      });
    }

    /* Build worker chips */
    var workerRow = document.getElementById('vcRealCommandWorkerRow');
    if (workerRow) {
      pkg.external_worker_profiles.forEach(function (w) {
        var chip = document.createElement('button');
        chip.className = 'vc-real-command-worker-chip' + (w.id === realFileCommandState.selectedWorker ? ' selected' : '');
        chip.setAttribute('data-cmd-worker', w.id);
        chip.type = 'button';
        chip.textContent = w.label;
        chip.addEventListener('click', function () { setRealFileCommandWorker(w.id); });
        workerRow.appendChild(chip);
      });
    }

    /* Initial readiness render */
    renderRealFileCommandStatus();

    /* Wire buttons */
    var genBtn = document.getElementById('vcGenerateCommandPkgBtn');
    if (genBtn) {
      genBtn.addEventListener('click', function () {
        renderRealFileCommandPackage();
        var gateReady = isHumanApprovalGateReadyForCommand();
        genBtn.textContent    = gateReady ? '✓ PACOTE PRONTO — EXTERNAL ONLY' : '✓ PACOTE GERADO — GATE INCOMPLETO';
        genBtn.style.borderColor = gateReady ? 'rgba(34,211,238,.70)' : 'rgba(251,146,60,.65)';
        genBtn.style.color       = gateReady ? '#22d3ee'              : '#fb923c';
      });
    }

    var copyBtn = document.getElementById('vcCopyCommandPkgBtn');
    if (copyBtn) { copyBtn.addEventListener('click', copyRealFileCommandPackage); }

    var clearBtn = document.getElementById('vcClearCommandPkgBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        clearRealFileCommandPackage();
        if (genBtn) {
          genBtn.textContent       = '⬡ GERAR PACOTE DE COMANDO';
          genBtn.style.borderColor = '';
          genBtn.style.color       = '';
        }
      });
    }
  }

  /* ── Worker Result Receipt — local UI only ────────────────────── */
  /* No file read/write. No commands. No download. No API. No exec. */
  /* Input is manual text paste only. All matching is local string. */

  var workerResultReceiptState = {
    selectedMode:     'evidence_completeness_review',
    reportText:       '',
    evidenceStatus:   {},
    generatedReceipt: ''
  };

  function getWorkerResultReceiptRegistry() {
    var pb = window.VISION_CORE_PROJECT_BUILDER;
    return (pb && pb.worker_result_receipt) ? pb.worker_result_receipt : null;
  }

  function setWorkerResultReviewMode(modeId) {
    workerResultReceiptState.selectedMode = modeId;
    var modeRow = document.getElementById('vcResultModeRow');
    if (modeRow) {
      Array.prototype.forEach.call(modeRow.querySelectorAll('.vc-result-mode-chip'), function (c) {
        c.className = 'vc-result-mode-chip' + (c.getAttribute('data-result-mode') === modeId ? ' selected' : '');
      });
    }
  }

  function getWorkerReportText() {
    var el = document.getElementById('vcWorkerReportInput');
    return el ? el.value : '';
  }

  function normalizeWorkerReportText(text) {
    return text.toLowerCase().replace(/\s+/g, ' ');
  }

  function analyzeWorkerEvidenceText() {
    var wrr = getWorkerResultReceiptRegistry();
    if (!wrr) { return; }

    var rawText = getWorkerReportText();
    workerResultReceiptState.reportText = rawText;
    var normText = normalizeWorkerReportText(rawText);

    var ambiguousMarkers = ['unknown', 'not sure', 'unclear', 'needs review', 'necessita revisão'];

    wrr.required_evidence_fields.forEach(function (field) {
      var found       = false;
      var foundMarker = '';
      var ambiguous   = false;

      /* Check each marker */
      field.markers.forEach(function (marker) {
        if (normText.indexOf(normalizeWorkerReportText(marker)) !== -1) {
          found       = true;
          foundMarker = marker;
        }
      });

      /* Check ambiguous proximity — simple: ambiguous word in whole text near field name */
      if (found) {
        ambiguousMarkers.forEach(function (am) {
          if (normText.indexOf(am) !== -1) {
            /* Only flag ambiguous if the ambiguous word appears close to any field marker */
            var markerIdx  = normText.indexOf(normalizeWorkerReportText(foundMarker));
            var ambigIdx   = normText.indexOf(am);
            if (Math.abs(markerIdx - ambigIdx) < 120) { ambiguous = true; }
          }
        });
      }

      workerResultReceiptState.evidenceStatus[field.id] = {
        status:      found ? (ambiguous ? 'needs_review' : 'present') : 'missing',
        foundMarker: found ? foundMarker : ''
      };
    });

    renderWorkerEvidenceChecklist();
    _updateEvidenceSummary(wrr);
  }

  function _updateEvidenceSummary(wrr) {
    var total    = wrr.required_evidence_fields.length;
    var present  = 0;
    var missing  = 0;
    var review   = 0;

    wrr.required_evidence_fields.forEach(function (f) {
      var s = workerResultReceiptState.evidenceStatus[f.id];
      if (!s) { missing++; return; }
      if (s.status === 'present')      { present++; }
      else if (s.status === 'missing') { missing++; }
      else                             { review++;  }
    });

    var chip  = document.getElementById('vcEvidenceSummaryChip');
    var label = document.getElementById('vcEvidenceCountLabel');
    if (label) { label.textContent = present + ' / ' + total + ' campos'; }
    if (chip) {
      if (missing === 0 && review === 0) {
        chip.textContent = 'EVIDENCE COMPLETE';
        chip.className   = 'vc-evidence-count-chip complete';
      } else if (review > 0) {
        chip.textContent = 'NEEDS REVIEW (' + review + ')';
        chip.className   = 'vc-evidence-count-chip review';
      } else {
        chip.textContent = 'EVIDENCE INCOMPLETE (' + missing + ' MISSING)';
        chip.className   = 'vc-evidence-count-chip incomplete';
      }
    }
  }

  function renderWorkerEvidenceChecklist() {
    var wrr       = getWorkerResultReceiptRegistry();
    var container = document.getElementById('vcEvidenceChecklistGrid');
    if (!wrr || !container) { return; }

    container.innerHTML = '';
    wrr.required_evidence_fields.forEach(function (field) {
      var status = workerResultReceiptState.evidenceStatus[field.id];
      var st     = status ? status.status : 'missing';
      var marker = status ? status.foundMarker : '';

      var iconMap  = { present: '✓', missing: '⊗', needs_review: '◈' };
      var labelMap = { present: 'PRESENT', missing: 'MISSING', needs_review: 'NEEDS REVIEW' };

      var card = document.createElement('div');
      card.className = 'vc-evidence-card ' + (st === 'needs_review' ? 'review' : st);

      var icon = document.createElement('span');
      icon.className   = 'vc-evidence-icon';
      icon.textContent = iconMap[st] || '—';

      var textEl = document.createElement('div');
      textEl.className = 'vc-evidence-text';

      var labelEl = document.createElement('div');
      labelEl.className   = 'vc-evidence-label';
      labelEl.textContent = field.label;

      var statusEl = document.createElement('div');
      statusEl.className   = 'vc-evidence-status';
      statusEl.textContent = labelMap[st] || '—';

      var markerEl = document.createElement('div');
      markerEl.className   = 'vc-evidence-marker';
      markerEl.textContent = marker ? 'Detectado: "' + marker + '"' : (st === 'missing' ? 'Não detectado' : '');

      textEl.appendChild(labelEl);
      textEl.appendChild(statusEl);
      textEl.appendChild(markerEl);
      card.appendChild(icon);
      card.appendChild(textEl);
      container.appendChild(card);
    });
  }

  function buildWorkerEvidenceReceipt() {
    var wrr = getWorkerResultReceiptRegistry();
    if (!wrr) { return ''; }

    var ctx       = (typeof getRealFileCommandContext === 'function') ? getRealFileCommandContext() : {};
    var total     = wrr.required_evidence_fields.length;
    var present   = 0;
    var missing   = 0;
    var review    = 0;

    wrr.required_evidence_fields.forEach(function (f) {
      var s = workerResultReceiptState.evidenceStatus[f.id];
      if (!s || s.status === 'missing')        { missing++; }
      else if (s.status === 'needs_review')    { review++;  }
      else                                     { present++; }
    });

    var overallStatus = (missing === 0 && review === 0)
      ? 'EVIDENCE COMPLETE'
      : (review > 0 ? 'NEEDS REVIEW' : 'EVIDENCE INCOMPLETE');

    var lines = [];
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('   VISION CORE — RECIBO DO WORKER EXTERNO');
    lines.push('   FRONT-PRODUCT-8 | Manual Evidence Review Only');
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('');
    lines.push('STATUS GERAL: ' + overallStatus);
    lines.push('Campos presentes : ' + present + ' / ' + total);
    lines.push('Campos ausentes  : ' + missing);
    lines.push('Necessitam revisão: ' + review);
    lines.push('');
    lines.push('── Contexto do Projeto ─────────────────────────────────────────');
    lines.push('  Tipo de Projeto  : ' + (ctx.type     || '—'));
    lines.push('  Template         : ' + (ctx.template || '—'));
    lines.push('  Stack            : ' + (ctx.stack    || '—'));
    lines.push('  Modo do Pacote   : ' + workerResultReceiptState.selectedMode.replace(/_/g, ' '));
    lines.push('');
    lines.push('── Checklist de Evidências ─────────────────────────────────────');
    wrr.required_evidence_fields.forEach(function (field) {
      var s   = workerResultReceiptState.evidenceStatus[field.id];
      var st  = s ? s.status : 'missing';
      var mk  = (s && s.foundMarker) ? ' ["' + s.foundMarker + '"]' : '';
      var sym = st === 'present' ? '[✓]' : (st === 'needs_review' ? '[◈]' : '[ ]');
      var lbl = st === 'present' ? 'PRESENT' : (st === 'needs_review' ? 'NEEDS REVIEW' : 'MISSING');
      lines.push('  ' + sym + ' ' + field.label + ' — ' + lbl + mk);
    });
    lines.push('');
    lines.push('── Estado de Autoridade ────────────────────────────────────────');
    lines.push('  real_execution_verified_by_frontend : false');
    lines.push('  pass_gold_real_claimed              : false');
    lines.push('  file_creation_allowed               : false');
    lines.push('  real_file_creation_enabled          : false');
    lines.push('  frontend_file_write_allowed         : false');
    lines.push('  backend_write_allowed               : false');
    lines.push('  command_execution_allowed           : false');
    lines.push('  deploy_allowed                      : false');
    lines.push('  release_allowed                     : false');
    lines.push('  tag_allowed                         : false');
    lines.push('  stable_promotion_allowed            : false');
    lines.push('  production_touched                  : false');
    lines.push('');
    lines.push('── Declaração de Não-Autoridade ────────────────────────────────');
    lines.push('  ' + wrr.non_authority_statement);
    lines.push('');
    lines.push('── Fronteira de Decisão Final ──────────────────────────────────');
    lines.push('  ' + wrr.final_decision_boundary);
    lines.push('');
    lines.push('═══════════════════════════════════════════════════════════════');
    return lines.join('\n');
  }

  function renderWorkerEvidenceReceipt() {
    var receipt = buildWorkerEvidenceReceipt();
    workerResultReceiptState.generatedReceipt = receipt;
    var output = document.getElementById('vcResultReceiptOutput');
    if (output) {
      output.value     = receipt;
      output.className = 'vc-result-output' + (receipt ? '' : ' empty');
    }
    var lineEl = document.getElementById('vcResultLineCount');
    if (lineEl && receipt) { lineEl.textContent = receipt.split('\n').length; }
  }

  function copyWorkerEvidenceReceipt() {
    var text     = workerResultReceiptState.generatedReceipt;
    var statusEl = document.getElementById('vcResultCopyStatus');
    if (!text) {
      if (statusEl) {
        statusEl.textContent = '⚠ Gere o recibo primeiro.';
        statusEl.className   = 'vc-result-copy-status visible error';
        setTimeout(function () { statusEl.className = 'vc-result-copy-status'; }, 2500);
      }
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        if (statusEl) {
          statusEl.textContent = '✓ Copiado!';
          statusEl.className   = 'vc-result-copy-status visible';
          setTimeout(function () { statusEl.className = 'vc-result-copy-status'; }, 2500);
        }
      }).catch(function () {
        if (statusEl) {
          statusEl.textContent = 'Selecione e copie manualmente.';
          statusEl.className   = 'vc-result-copy-status visible error';
          setTimeout(function () { statusEl.className = 'vc-result-copy-status'; }, 3000);
        }
      });
    } else {
      if (statusEl) {
        statusEl.textContent = 'Selecione e copie manualmente.';
        statusEl.className   = 'vc-result-copy-status visible error';
        setTimeout(function () { statusEl.className = 'vc-result-copy-status'; }, 3000);
      }
    }
  }

  function clearWorkerEvidenceReview() {
    workerResultReceiptState.reportText       = '';
    workerResultReceiptState.evidenceStatus   = {};
    workerResultReceiptState.generatedReceipt = '';

    var input = document.getElementById('vcWorkerReportInput');
    if (input) { input.value = ''; }

    var output = document.getElementById('vcResultReceiptOutput');
    if (output) {
      output.value     = 'Clique em ANALISAR TEXTO LOCAL e depois GERAR RECIBO DE EVIDÊNCIA.';
      output.className = 'vc-result-output empty';
    }

    var lineEl = document.getElementById('vcResultLineCount');
    if (lineEl) { lineEl.textContent = '0'; }

    var statusEl = document.getElementById('vcResultCopyStatus');
    if (statusEl) { statusEl.className = 'vc-result-copy-status'; }

    /* Reset evidence cards to empty */
    var wrr = getWorkerResultReceiptRegistry();
    if (wrr) {
      renderWorkerEvidenceChecklist();
      _updateEvidenceSummary(wrr);
    }

    var chip  = document.getElementById('vcEvidenceSummaryChip');
    var label = document.getElementById('vcEvidenceCountLabel');
    if (chip)  { chip.textContent  = 'AGUARDANDO ANÁLISE'; chip.className = 'vc-evidence-count-chip incomplete'; }
    if (label) { label.textContent = '0 / 13 campos'; }
  }

  function renderWorkerResultAuthorityPanel() {
    /* Authority panel is static HTML — all flags false, no dynamic state needed */
  }

  function initWorkerResultReceipt() {
    var wrr = getWorkerResultReceiptRegistry();
    if (!wrr) { return; }

    /* Build mode chips */
    var modeRow = document.getElementById('vcResultModeRow');
    if (modeRow) {
      wrr.review_modes.forEach(function (m) {
        var chip = document.createElement('button');
        chip.className = 'vc-result-mode-chip' + (m.id === workerResultReceiptState.selectedMode ? ' selected' : '');
        chip.setAttribute('data-result-mode', m.id);
        chip.type = 'button';
        chip.textContent = m.label;
        chip.addEventListener('click', function () { setWorkerResultReviewMode(m.id); });
        modeRow.appendChild(chip);
      });
    }

    /* Initial empty checklist render */
    renderWorkerEvidenceChecklist();

    /* Wire buttons */
    var analyzeBtn = document.getElementById('vcAnalyzeWorkerReportBtn');
    if (analyzeBtn) {
      analyzeBtn.addEventListener('click', function () {
        analyzeWorkerEvidenceText();
        analyzeBtn.textContent    = '✓ TEXTO ANALISADO';
        analyzeBtn.style.borderColor = 'rgba(34,197,94,.65)';
        analyzeBtn.style.color       = '#22c55e';
        setTimeout(function () {
          analyzeBtn.textContent       = '⬡ ANALISAR TEXTO LOCAL';
          analyzeBtn.style.borderColor = '';
          analyzeBtn.style.color       = '';
        }, 2000);
      });
    }

    var genBtn = document.getElementById('vcGenerateEvidenceReceiptBtn');
    if (genBtn) {
      genBtn.addEventListener('click', function () {
        analyzeWorkerEvidenceText();
        renderWorkerEvidenceReceipt();
        var wrr2   = getWorkerResultReceiptRegistry();
        var total  = wrr2 ? wrr2.required_evidence_fields.length : 13;
        var pCount = Object.keys(workerResultReceiptState.evidenceStatus).filter(function (k) {
          return workerResultReceiptState.evidenceStatus[k].status === 'present';
        }).length;
        var allOk  = pCount === total;
        genBtn.textContent       = allOk ? '✓ RECIBO COMPLETO' : '✓ RECIBO GERADO — INCOMPLETO';
        genBtn.style.borderColor = allOk ? 'rgba(34,197,94,.65)' : 'rgba(251,146,60,.65)';
        genBtn.style.color       = allOk ? '#22c55e'             : '#fb923c';
      });
    }

    var copyBtn = document.getElementById('vcCopyEvidenceReceiptBtn');
    if (copyBtn) { copyBtn.addEventListener('click', copyWorkerEvidenceReceipt); }

    var clearBtn = document.getElementById('vcClearEvidenceReviewBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        clearWorkerEvidenceReview();
        if (analyzeBtn) {
          analyzeBtn.textContent       = '⬡ ANALISAR TEXTO LOCAL';
          analyzeBtn.style.borderColor = '';
          analyzeBtn.style.color       = '';
        }
        if (genBtn) {
          genBtn.textContent       = '⊡ GERAR RECIBO DE EVIDÊNCIA';
          genBtn.style.borderColor = '';
          genBtn.style.color       = '';
        }
      });
    }
  }

  /* ── Final Product Dashboard — local UI only ──────────────────── */
  /* No exec. No file read/write. No download. No API. No claims.  */

  var finalProductDashboardState = {
    selectedDecision: 'review_frontend_flow',
    generatedReport:  ''
  };

  function getFinalProductDashboardRegistry() {
    var pb = window.VISION_CORE_PROJECT_BUILDER;
    return (pb && pb.final_product_dashboard) ? pb.final_product_dashboard : null;
  }

  function setFinalOperatorDecision(decisionId) {
    finalProductDashboardState.selectedDecision = decisionId;
    var row = document.getElementById('vcFinalDecisionRow');
    if (row) {
      Array.prototype.forEach.call(row.querySelectorAll('.vc-final-decision-chip'), function (c) {
        c.className = 'vc-final-decision-chip' + (c.getAttribute('data-decision') === decisionId ? ' selected' : '');
      });
    }
    /* Update context card */
    var decisionEl = document.getElementById('vcFinalCtxDecision');
    if (decisionEl) {
      var fpd = getFinalProductDashboardRegistry();
      if (fpd) {
        var opt = fpd.decision_options.filter(function (d) { return d.id === decisionId; })[0];
        if (opt) { decisionEl.textContent = opt.label; }
      }
    }
  }

  function getFinalProductContext() {
    var type         = (typeof pbState !== 'undefined' && pbState.selectedType)  ? pbState.selectedType  : '—';
    var stack        = (typeof pbState !== 'undefined' && pbState.selectedStack) ? pbState.selectedStack : '—';
    var size         = (typeof pbState !== 'undefined' && pbState.selectedSize)  ? pbState.selectedSize  : '—';
    var tpl          = (typeof pbTemplateState !== 'undefined' && pbTemplateState.selectedTemplate) ? pbTemplateState.selectedTemplate : '—';
    var agents       = (typeof pbState !== 'undefined' && Array.isArray(pbState.activeAgents)) ? pbState.activeAgents.length : 0;
    var workerTarget = (typeof realFileCommandState !== 'undefined') ? realFileCommandState.selectedWorker   : '—';
    var pkgMode      = (typeof realFileCommandState !== 'undefined') ? realFileCommandState.selectedMode.replace(/_/g, ' ') : '—';
    var fpd          = getFinalProductDashboardRegistry();
    var decisionOpt  = fpd ? fpd.decision_options.filter(function (d) { return d.id === finalProductDashboardState.selectedDecision; })[0] : null;
    var decision     = decisionOpt ? decisionOpt.label : finalProductDashboardState.selectedDecision;
    return { type: type, template: tpl, stack: stack, size: size, agents: agents, workerTarget: workerTarget, pkgMode: pkgMode, decision: decision };
  }

  function getFinalArtifactReadiness() {
    var tpl              = (typeof pbTemplateState !== 'undefined' && pbTemplateState.selectedTemplate);
    var missionReady     = (typeof mcState !== 'undefined' && !!mcState.generatedPrompt);
    var handoffReady     = (typeof handoffState !== 'undefined' && !!handoffState.generatedPackage);
    var exportReady      = (typeof exportPreviewState !== 'undefined' && !!exportPreviewState.generatedPreview);
    var approvalReady    = (typeof humanApprovalState !== 'undefined' && !!humanApprovalState.generatedReceipt);
    var cmdPkgReady      = (typeof realFileCommandState !== 'undefined' && !!realFileCommandState.generatedPackage);
    var workerRcptReady  = (typeof workerResultReceiptState !== 'undefined' && !!workerResultReceiptState.generatedReceipt);
    var evidenceHasData  = (typeof workerResultReceiptState !== 'undefined' && Object.keys(workerResultReceiptState.evidenceStatus).length > 0);
    var evidenceHasMiss  = evidenceHasData && Object.keys(workerResultReceiptState.evidenceStatus).some(function (k) {
      var s = workerResultReceiptState.evidenceStatus[k].status;
      return s === 'missing' || s === 'needs_review';
    });
    var evidenceStatus   = !evidenceHasData ? 'waiting' : (evidenceHasMiss ? 'review' : 'ready');

    return [
      { id: 'template_selected',     label: 'Template Selected',              status: tpl         ? 'ready' : 'waiting' },
      { id: 'mission_generated',     label: 'Mission Prompt Generated',       status: missionReady ? 'ready' : 'waiting' },
      { id: 'handoff_generated',     label: 'Handoff Package Generated',      status: handoffReady ? 'ready' : 'waiting' },
      { id: 'export_generated',      label: 'Export Preview Generated',       status: exportReady  ? 'ready' : 'waiting' },
      { id: 'approval_generated',    label: 'Human Approval Receipt Generated',status: approvalReady? 'ready' : 'waiting' },
      { id: 'cmdpkg_generated',      label: 'Real File Command Package',      status: cmdPkgReady  ? 'ready' : 'waiting' },
      { id: 'worker_rcpt_generated', label: 'Worker Result Receipt Generated',status: workerRcptReady? 'ready' : 'waiting' },
      { id: 'evidence_reviewed',     label: 'Evidence Checklist Reviewed',    status: evidenceStatus }
    ];
  }

  function renderFinalProductTimeline() {
    var fpd = getFinalProductDashboardRegistry();
    var container = document.getElementById('vcFinalTimeline');
    if (!fpd || !container) { return; }
    container.innerHTML = '';
    fpd.chain_sections.forEach(function (sec, idx) {
      var item = document.createElement('div');
      item.className = 'vc-final-timeline-item ready';

      var dot = document.createElement('div');
      dot.className = 'vc-final-timeline-dot';

      var num = document.createElement('span');
      num.style.cssText = 'font-size:9px;font-weight:800;color:#4b5563;flex-shrink:0;width:18px;';
      num.textContent = (idx + 1) + '.';

      var lbl = document.createElement('span');
      lbl.className   = 'vc-final-timeline-label';
      lbl.textContent = sec.label;

      var tags = document.createElement('div');
      tags.className = 'vc-final-timeline-tags';

      var localTag = document.createElement('span');
      localTag.className   = 'vc-final-tag local';
      localTag.textContent = 'LOCAL ONLY';

      tags.appendChild(localTag);

      /* Add LOCKED AUTHORITY tag for execution-sensitive stages */
      if (['human_approval_gate', 'real_file_command_package', 'worker_result_receipt'].indexOf(sec.id) !== -1) {
        var lockedTag = document.createElement('span');
        lockedTag.className   = 'vc-final-tag locked';
        lockedTag.textContent = 'LOCKED AUTH';
        tags.appendChild(lockedTag);
      }

      item.appendChild(dot);
      item.appendChild(num);
      item.appendChild(lbl);
      item.appendChild(tags);
      container.appendChild(item);
    });
  }

  function renderFinalProductContext() {
    var ctx = getFinalProductContext();
    var map = {
      vcFinalCtxType:        ctx.type,
      vcFinalCtxTemplate:    ctx.template,
      vcFinalCtxStack:       ctx.stack,
      vcFinalCtxSize:        ctx.size,
      vcFinalCtxAgents:      ctx.agents + ' agente(s)',
      vcFinalCtxWorker:      ctx.workerTarget,
      vcFinalCtxPackageMode: ctx.pkgMode,
      vcFinalCtxDecision:    ctx.decision
    };
    Object.keys(map).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) { el.textContent = map[id]; }
    });
  }

  function renderFinalArtifactReadiness() {
    var items     = getFinalArtifactReadiness();
    var container = document.getElementById('vcFinalReadinessGrid');
    if (!container) { return; }
    container.innerHTML = '';
    items.forEach(function (item) {
      var card = document.createElement('div');
      card.className = 'vc-final-readiness-card ' + item.status;

      var iconMap  = { ready: '✓', waiting: '○', review: '◈' };
      var icon = document.createElement('span');
      icon.className   = 'vc-final-readiness-icon';
      icon.textContent = iconMap[item.status] || '—';

      var text = document.createElement('div');
      text.className = 'vc-final-readiness-text';

      var name = document.createElement('div');
      name.className   = 'vc-final-readiness-name';
      name.textContent = item.label;

      var statusLabelMap = { ready: 'READY', waiting: 'WAITING', review: 'REVIEW NEEDED' };
      var statusEl = document.createElement('div');
      statusEl.className   = 'vc-final-readiness-status';
      statusEl.textContent = statusLabelMap[item.status] || item.status.toUpperCase();

      text.appendChild(name);
      text.appendChild(statusEl);
      card.appendChild(icon);
      card.appendChild(text);
      container.appendChild(card);
    });
  }

  function renderFinalAuthorityMatrix() {
    /* Authority matrix is static HTML — all flags false, no dynamic state */
  }

  function renderFinalOperatorDecisions() {
    var fpd = getFinalProductDashboardRegistry();
    var row = document.getElementById('vcFinalDecisionRow');
    if (!fpd || !row) { return; }
    row.innerHTML = '';
    fpd.decision_options.forEach(function (opt) {
      var chip = document.createElement('button');
      chip.className = 'vc-final-decision-chip' + (opt.id === finalProductDashboardState.selectedDecision ? ' selected' : '');
      chip.setAttribute('data-decision', opt.id);
      chip.type = 'button';
      chip.textContent = opt.label;
      chip.addEventListener('click', function () { setFinalOperatorDecision(opt.id); });
      row.appendChild(chip);
    });
  }

  function buildFinalProductReport() {
    var fpd = getFinalProductDashboardRegistry();
    if (!fpd) { return ''; }
    var ctx       = getFinalProductContext();
    var readiness = getFinalArtifactReadiness();
    var decisionOpt = fpd.decision_options.filter(function (d) {
      return d.id === finalProductDashboardState.selectedDecision;
    })[0];
    var decision = decisionOpt ? decisionOpt.label : finalProductDashboardState.selectedDecision;

    var lines = [];
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('   VISION CORE — RELATÓRIO FINAL DO PRODUTO FRONTEND');
    lines.push('   FRONT-PRODUCT-9 | Operator Decision Dashboard');
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('');
    lines.push('── Cadeia de Produtos Frontend ─────────────────────────────────');
    fpd.chain_sections.forEach(function (sec, idx) {
      lines.push('  ' + (idx + 1) + '. ' + sec.label + ' [LOCAL ONLY]');
    });
    lines.push('');
    lines.push('── Contexto do Projeto ─────────────────────────────────────────');
    lines.push('  Tipo de Projeto  : ' + ctx.type);
    lines.push('  Template         : ' + ctx.template);
    lines.push('  Stack            : ' + ctx.stack);
    lines.push('  Tamanho/Risco    : ' + ctx.size);
    lines.push('  Agentes Ativos   : ' + ctx.agents);
    lines.push('  Worker Target    : ' + ctx.workerTarget);
    lines.push('  Modo do Pacote   : ' + ctx.pkgMode);
    lines.push('');
    lines.push('── Prontidão dos Artefatos ─────────────────────────────────────');
    readiness.forEach(function (item) {
      var symMap = { ready: '[✓]', waiting: '[ ]', review: '[◈]' };
      var lblMap = { ready: 'READY', waiting: 'WAITING', review: 'REVIEW NEEDED' };
      lines.push('  ' + (symMap[item.status] || '[ ]') + ' ' + item.label + ' — ' + (lblMap[item.status] || item.status.toUpperCase()));
    });
    lines.push('');
    lines.push('── Decisão do Operador ─────────────────────────────────────────');
    lines.push('  [✓] ' + decision);
    lines.push('');
    lines.push('── Estado de Autoridade Bloqueada ──────────────────────────────');
    fpd.locked_authority_state.forEach(function (item) {
      lines.push('  ⊗ ' + item.label + ': ' + item.value);
    });
    lines.push('');
    lines.push('── Status de Segurança ─────────────────────────────────────────');
    lines.push('  real_execution_verified_by_frontend : false');
    lines.push('  pass_gold_real_claimed              : false');
    lines.push('  file_creation_allowed               : false');
    lines.push('  real_file_creation_enabled          : false');
    lines.push('  frontend_file_write_allowed         : false');
    lines.push('  backend_write_allowed               : false');
    lines.push('  command_execution_allowed           : false');
    lines.push('  deploy_allowed                      : false');
    lines.push('  release_allowed                     : false');
    lines.push('  tag_allowed                         : false');
    lines.push('  stable_promotion_allowed            : false');
    lines.push('  production_touched                  : false');
    lines.push('');
    lines.push('── Declaração de Não-Autoridade ────────────────────────────────');
    lines.push('  ' + fpd.non_authority_statement);
    lines.push('');
    lines.push('── Fronteira do Próximo Phase ──────────────────────────────────');
    lines.push('  ' + fpd.next_phase_boundary);
    lines.push('');
    lines.push('── Nota Final ──────────────────────────────────────────────────');
    lines.push('  Este relatório é local apenas. Resume o estado de planejamento');
    lines.push('  do frontend e não realiza nem verifica execução real.');
    lines.push('');
    lines.push('═══════════════════════════════════════════════════════════════');
    return lines.join('\n');
  }

  function renderFinalProductReport() {
    renderFinalProductContext();
    renderFinalArtifactReadiness();
    var report = buildFinalProductReport();
    finalProductDashboardState.generatedReport = report;
    var output = document.getElementById('vcFinalReportOutput');
    if (output) {
      output.value     = report;
      output.className = 'vc-final-output' + (report ? '' : ' empty');
    }
    var lineEl = document.getElementById('vcFinalReportLineCount');
    if (lineEl && report) { lineEl.textContent = report.split('\n').length; }
  }

  function copyFinalProductReport() {
    var text     = finalProductDashboardState.generatedReport;
    var statusEl = document.getElementById('vcFinalCopyStatus');
    if (!text) {
      if (statusEl) {
        statusEl.textContent = '⚠ Gere o relatório primeiro.';
        statusEl.className   = 'vc-final-copy-status visible error';
        setTimeout(function () { statusEl.className = 'vc-final-copy-status'; }, 2500);
      }
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        if (statusEl) {
          statusEl.textContent = '✓ Copiado!';
          statusEl.className   = 'vc-final-copy-status visible';
          setTimeout(function () { statusEl.className = 'vc-final-copy-status'; }, 2500);
        }
      }).catch(function () {
        if (statusEl) {
          statusEl.textContent = 'Selecione e copie manualmente.';
          statusEl.className   = 'vc-final-copy-status visible error';
          setTimeout(function () { statusEl.className = 'vc-final-copy-status'; }, 3000);
        }
      });
    } else {
      if (statusEl) {
        statusEl.textContent = 'Selecione e copie manualmente.';
        statusEl.className   = 'vc-final-copy-status visible error';
        setTimeout(function () { statusEl.className = 'vc-final-copy-status'; }, 3000);
      }
    }
  }

  function clearFinalProductReport() {
    finalProductDashboardState.generatedReport = '';
    var output = document.getElementById('vcFinalReportOutput');
    if (output) {
      output.value     = 'Clique em GERAR RELATÓRIO FINAL para gerar o relatório.';
      output.className = 'vc-final-output empty';
    }
    var lineEl = document.getElementById('vcFinalReportLineCount');
    if (lineEl) { lineEl.textContent = '0'; }
    var statusEl = document.getElementById('vcFinalCopyStatus');
    if (statusEl) { statusEl.className = 'vc-final-copy-status'; }
  }

  function initFinalProductDashboard() {
    var fpd = getFinalProductDashboardRegistry();
    if (!fpd) { return; }

    renderFinalProductTimeline();
    renderFinalProductContext();
    renderFinalArtifactReadiness();
    renderFinalOperatorDecisions();

    /* Wire buttons */
    var genBtn = document.getElementById('vcGenerateFinalReportBtn');
    if (genBtn) {
      genBtn.addEventListener('click', function () {
        renderFinalProductReport();
        genBtn.textContent       = '✓ RELATÓRIO GERADO';
        genBtn.style.borderColor = 'rgba(34,197,94,.65)';
        genBtn.style.color       = '#22c55e';
      });
    }

    var copyBtn = document.getElementById('vcCopyFinalReportBtn');
    if (copyBtn) { copyBtn.addEventListener('click', copyFinalProductReport); }

    var clearBtn = document.getElementById('vcClearFinalReportBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        clearFinalProductReport();
        if (genBtn) {
          genBtn.textContent       = '⬡ GERAR RELATÓRIO FINAL';
          genBtn.style.borderColor = '';
          genBtn.style.color       = '';
        }
      });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // SOFTWARE FACTORY BUILDER PAGE
  // Local in-memory view switching. No backend. No API. No exec.
  // ─────────────────────────────────────────────────────────────

  // New order aligned with SDDF timeline and horizontal menu
  var SF_MODULES = [
    { id: 'project_builder',  num: '01', name: 'MONTAR PROJETO DO ZERO',           sddf: 'Descoberta & Planejamento',    next: 'Selecione tipo de projeto, stack e modo de orquestração.' },
    { id: 'export_preview',   num: '02', name: 'PREVIEW DE CRIAÇÃO DO PROJETO',    sddf: 'Modelagem & Template',         next: 'Revise a lista de arquivos que seriam criados. Nenhum arquivo é escrito.' },
    { id: 'project_templates',num: '03', name: 'TEMPLATES DE PROJETO',             sddf: 'Composição da Missão',         next: 'Escolha um template base com stack e estrutura pré-configurada.' },
    { id: 'mission_composer', num: '04', name: 'COMPOSITOR DE MISSÃO',             sddf: 'Preview & Verificação',        next: 'Componha o pacote de instrução e copie para o agente externo.' },
    { id: 'worker_handoff',   num: '05', name: 'PACOTES PARA WORKERS',             sddf: 'Pacotes para Workers',         next: 'Gere pacote completo de entrega para o worker externo executar.' },
    { id: 'real_file_command',num: '06', name: 'COMANDO PARA CRIAÇÃO REAL',        sddf: 'Comando para Criação Real',    next: 'Revisão do pacote de comando. Execução real bloqueada.' },
    { id: 'worker_receipt',   num: '07', name: 'RECIBO DO WORKER EXTERNO',         sddf: 'Execução & Recibo',            next: 'Cole o resultado do worker externo para análise local.' },
    { id: 'saas_api',         num: '08', name: 'SAAS & API CONNECTORS ROADMAP',    sddf: 'Validação & Entrega',          next: 'Controles SaaS/API bloqueados. Ativação requer autorização explícita.' },
    { id: 'final_dashboard',  num: '09', name: 'PAINEL FINAL DO PRODUTO',          sddf: 'Roadmap & Conectores',         next: 'Gere o relatório final de produto e revise toda a cadeia.' }
  ];

  var _sfActiveModule  = 'project_builder';
  var _sfHomeVisible   = true;   // true = LLM home shown; false = module workspace shown

  // Maps module IDs to the original #projectBuilder section IDs
  var SF_MODULE_SECTION_MAP = {
    project_builder:   'projectBuilder',
    export_preview:    'vcExportPreview',
    project_templates: 'vcTemplatePacks',
    mission_composer:  'vcMissionComposer',
    worker_handoff:    'vcWorkerHandoff',
    real_file_command: 'vcRealFileCommandPackage',
    worker_receipt:    'vcWorkerResultReceipt',
    saas_api:          'vcSaasApiRoadmap',
    final_dashboard:   'vcFinalProductDashboard'
  };

  // Show home view — HOME is exclusive; workspace completely hidden
  function _sfShowHome() {
    _sfHomeVisible = true;
    var homeCtrl  = document.getElementById('vcSfHomeControl');
    var workspace = document.getElementById('vcSfModuleWorkspace');
    if (homeCtrl)  { homeCtrl.style.display = 'flex'; }
    if (workspace) { workspace.style.display = 'none'; }
    var homeBtn = document.getElementById('vcSfHomeBtn');
    if (homeBtn) { homeBtn.classList.add('active'); }
    // Clear active from all module tabs
    document.querySelectorAll('.vc-sf-module-btn').forEach(function (b) {
      if (b !== homeBtn) { b.classList.remove('active'); }
    });
  }

  // Show module workspace — HOME completely hidden, workspace fills center
  function _sfShowWorkspace() {
    _sfHomeVisible = false;
    var homeCtrl  = document.getElementById('vcSfHomeControl');
    var workspace = document.getElementById('vcSfModuleWorkspace');
    if (homeCtrl)  { homeCtrl.style.display = 'none'; }
    if (workspace) { workspace.style.display = 'flex'; }
    var homeBtn = document.getElementById('vcSfHomeBtn');
    if (homeBtn) { homeBtn.classList.remove('active'); }
  }

  function showMainCockpitPage() {
    var sfPage  = document.getElementById('vcSoftwareFactoryPage');
    var cockpit = document.getElementById('vcCockpitView');
    if (sfPage)  { sfPage.style.display  = 'none';  sfPage.setAttribute('aria-hidden', 'true'); }
    if (cockpit) { cockpit.style.display = '';       cockpit.removeAttribute('aria-hidden'); }
  }

  function showSoftwareFactoryPage() {
    var sfPage  = document.getElementById('vcSoftwareFactoryPage');
    var cockpit = document.getElementById('vcCockpitView');
    if (cockpit) { cockpit.style.display = 'none'; cockpit.setAttribute('aria-hidden', 'true'); }
    if (sfPage)  {
      sfPage.style.display = 'flex';
      sfPage.removeAttribute('aria-hidden');
      // Move original #projectBuilder into SF page mount (idempotent)
      var mount = document.getElementById('vcSfOriginalProjectBuilderMount');
      var pb    = document.getElementById('projectBuilder');
      if (mount && pb && !mount.contains(pb)) {
        mount.appendChild(pb);
      }
      // Always reset to home view on every open
      _sfShowHome();
      renderSoftwareFactoryTimelineState(_sfActiveModule);
    }
  }

  function setSoftwareFactoryModule(moduleId) {
    _sfActiveModule = moduleId;

    // Open module workspace if user is still on home
    if (_sfHomeVisible) {
      _sfShowWorkspace();
    }

    // Update module nav buttons
    var btns = document.querySelectorAll('.vc-sf-module-btn');
    btns.forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.sfModule === moduleId);
    });

    // Scroll to corresponding section in original #projectBuilder
    var sectionId = SF_MODULE_SECTION_MAP[moduleId] || 'projectBuilder';
    var target = document.getElementById(sectionId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Update SDDF timeline
    renderSoftwareFactoryTimelineState(moduleId);

    // Find module metadata
    var mod = SF_MODULES.find(function (m) { return m.id === moduleId; });
    if (!mod) return;

    // Update next action
    var nextEl = document.getElementById('vcSfNextActionText');
    if (nextEl) { nextEl.textContent = mod.next; }

    // Update left summary: active module number
    var summaryModule = document.getElementById('vcSfSummaryModule');
    if (summaryModule) { summaryModule.textContent = mod.num; }

    // Update progress bar
    var modIdx = SF_MODULES.findIndex(function (m) { return m.id === moduleId; });
    var pct = Math.round(((modIdx + 1) / SF_MODULES.length) * 100);
    var fill = document.getElementById('vcSfProgressFill');
    if (fill) { fill.style.width = pct + '%'; }
    var progressLabel = document.getElementById('vcSfProgressLabel');
    if (progressLabel) { progressLabel.textContent = (modIdx + 1) + ' / ' + SF_MODULES.length; }

    // Add activity entry
    var feed = document.getElementById('vcSfActivityFeed');
    if (feed) {
      var item = document.createElement('div');
      item.className = 'vc-sf-activity-item';
      item.innerHTML = '<span>Módulo ' + mod.num + ' selecionado</span>';
      feed.insertBefore(item, feed.firstChild);
      // Keep feed to 8 entries
      while (feed.children.length > 8) { feed.removeChild(feed.lastChild); }
    }
  }

  function renderSoftwareFactoryTimelineState(activeModuleId) {
    var container = document.getElementById('vcSfSddfSteps');
    if (!container) return;
    var steps = container.querySelectorAll('.vc-sf-sddf-step');
    var connectors = container.querySelectorAll('.vc-sf-sddf-connector');
    var activeIdx = SF_MODULES.findIndex(function (m) { return m.id === activeModuleId; });

    steps.forEach(function (step, idx) {
      step.classList.remove('active', 'done');
      if (idx < activeIdx)      step.classList.add('done');
      else if (idx === activeIdx) step.classList.add('active');
    });

    // Color connectors between done steps
    connectors.forEach(function (c, idx) {
      c.classList.toggle('done', idx < activeIdx);
    });
  }

  function _sfChatSend(inputId, streamId) {
    var input  = document.getElementById(inputId);
    var stream = document.getElementById(streamId);
    if (!input || !stream) return;
    var text = (input.value || '').trim();
    if (!text) return;
    input.value = '';

    // Remove hint if present
    var hint = stream.querySelector('.vc-sf-chat-hint');
    if (hint) hint.remove();

    // User message
    var uMsg = document.createElement('div');
    uMsg.className = 'vc-sf-chat-msg user';
    uMsg.textContent = text;
    stream.appendChild(uMsg);

    // Local echo — no backend call
    var bMsg = document.createElement('div');
    bMsg.className = 'vc-sf-chat-msg';
    bMsg.textContent = '[LOCAL] Mensagem registrada. Backend não conectado. Use os controles do módulo ativo.';
    stream.appendChild(bMsg);

    stream.scrollTop = stream.scrollHeight;
  }

  function initSoftwareFactoryPage() {
    var sfPage = document.getElementById('vcSoftwareFactoryPage');
    if (!sfPage) return;

    // Back button
    var backBtn = document.getElementById('vcSfBackBtn');
    if (backBtn) {
      backBtn.addEventListener('click', showMainCockpitPage);
    }

    // Nav open buttons (cockpit header/sidebar)
    document.querySelectorAll('[data-open-sf-page]').forEach(function (btn) {
      btn.addEventListener('click', showSoftwareFactoryPage);
    });

    // Module nav buttons
    document.querySelectorAll('.vc-sf-module-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setSoftwareFactoryModule(btn.dataset.sfModule);
      });
    });

    // HOME button → reset to home view
    var homeBtn = document.getElementById('vcSfHomeBtn');
    if (homeBtn) {
      homeBtn.addEventListener('click', _sfShowHome);
    }

    // INICIAR MONTAGEM → open workspace at first module
    var startBtn = document.getElementById('vcSfStartBtn');
    if (startBtn) {
      startBtn.addEventListener('click', function () {
        setSoftwareFactoryModule('project_builder');
      });
    }

    // Quick-fill action buttons (populate textarea with template, no backend)
    var SF_FILL_TEMPLATES = {
      descricao: 'Tipo de projeto: [SaaS / API / App / Outro]\nObjetivo principal: [descreva aqui]\nFuncionalidades principais:\n  - [funcionalidade 1]\n  - [funcionalidade 2]\n  - [funcionalidade 3]\nStack preferida: [Node.js / Go / Python / etc]\nTamanho estimado: [MVP / Production Ready / Enterprise]',
      briefing:  'BRIEFING DO PROJETO\n\nCliente / Produto: [nome]\nDescrição: [descrição completa do produto]\nEntregas esperadas:\n  - [módulo 1]\n  - [módulo 2]\nRestrições técnicas: [lista]\nCritérios de aceite: [lista]\nPrazo estimado: [data ou duração]',
      exemplos:  'EXEMPLO A — SaaS Fullstack\nTipo: SaaS Fullstack\nStack: Node.js + React + PostgreSQL\nFuncionalidades: autenticação JWT, dashboard, billing Stripe, API REST\nTamanho: Production Ready\n\nEXEMPLO B — API Backend\nTipo: API Backend\nStack: Go + PostgreSQL + Docker\nFuncionalidades: CRUD completo, JWT auth, rate limiting\nTamanho: MVP\n\nEXEMPLO C — AI Agent System\nTipo: AI Agent System\nStack: Python + FastAPI + Redis\nFuncionalidades: orchestrator, workers, task queue, webhooks\nTamanho: Enterprise'
    };
    sfPage.addEventListener('click', function (e) {
      var fillBtn = e.target.closest('[data-sf-fill]');
      if (!fillBtn) return;
      var tpl = SF_FILL_TEMPLATES[fillBtn.dataset.sfFill] || '';
      var inp = document.getElementById('vcSfChatInput');
      if (inp && tpl) { inp.value = tpl; inp.focus(); }
    });

    // Chat send
    var sendBtn = document.getElementById('vcSfChatSendBtn');
    if (sendBtn) {
      sendBtn.addEventListener('click', function () {
        _sfChatSend('vcSfChatInput', 'vcSfChatStream');
      });
    }
    var chatInput = document.getElementById('vcSfChatInput');
    if (chatInput) {
      chatInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          _sfChatSend('vcSfChatInput', 'vcSfChatStream');
        }
      });
    }

    // SDDF timeline node clicks → switch module
    var sddfContainer = document.getElementById('vcSfSddfSteps');
    if (sddfContainer) {
      sddfContainer.addEventListener('click', function (e) {
        var step = e.target.closest('.vc-sf-sddf-step');
        if (step && step.dataset.sfModule) {
          setSoftwareFactoryModule(step.dataset.sfModule);
        }
      });
    }

    // Chip group toggles (single-active per group)
    sfPage.addEventListener('click', function (e) {
      var chip = e.target.closest('[data-sf-chip-group]');
      if (!chip) return;
      var group = chip.dataset.sfChipGroup;
      sfPage.querySelectorAll('[data-sf-chip-group="' + group + '"]').forEach(function (c) {
        c.classList.remove('active');
      });
      chip.classList.add('active');
      var label = chip.textContent.trim();
      // Update config cards in module panel
      var panelMap = { project_type: 'vcSfConfigType', stack: 'vcSfConfigStack', orch: 'vcSfConfigOrch' };
      if (panelMap[group]) {
        var el = document.getElementById(panelMap[group]);
        if (el) el.textContent = label;
      }
      // Mirror to left summary
      var summaryMap = { project_type: 'vcSfSummaryType', stack: 'vcSfSummaryStack', orch: 'vcSfSummaryOrch' };
      if (summaryMap[group]) {
        var sel = document.getElementById(summaryMap[group]);
        if (sel) sel.textContent = label;
      }
    });

    // EXECUTAR SDDF button (local echo only)
    var runBtn = document.getElementById('vcSfRunBtn');
    if (runBtn) {
      runBtn.addEventListener('click', function () {
        var stream = document.getElementById('vcSfChatStream');
        if (!stream) return;
        var hint = stream.querySelector('.vc-sf-chat-hint');
        if (hint) hint.remove();
        var msg = document.createElement('div');
        msg.className = 'vc-sf-chat-msg';
        msg.textContent = '[LOCAL] SDDF local: nenhum backend conectado. Configure módulo e copie para worker externo.';
        stream.appendChild(msg);
        stream.scrollTop = stream.scrollHeight;
        var feed = document.getElementById('vcSfActivityFeed');
        if (feed) {
          var item = document.createElement('div');
          item.className = 'vc-sf-activity-item';
          item.innerHTML = '<span>EXECUTAR SDDF pressionado — local only</span>';
          feed.insertBefore(item, feed.firstChild);
          while (feed.children.length > 8) { feed.removeChild(feed.lastChild); }
        }
      });
    }

    // Module-level generate / copy buttons
    document.querySelectorAll('[data-sf-generate]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var targetId = btn.dataset.sfGenerate;
        var output   = document.getElementById(targetId);
        if (!output) return;
        var moduleId = btn.closest('.vc-sf-module-panel') &&
          btn.closest('.vc-sf-module-panel').id.replace('vcSfPanel-', '');
        var mod = SF_MODULES.find(function (m) { return m.id === moduleId; });
        var modName = mod ? mod.name : 'MÓDULO';
        output.value = '── ' + modName + ' ──────────────────────────────────\n' +
          'Gerado em: ' + new Date().toLocaleString('pt-BR') + '\n' +
          'Status: LOCAL PREVIEW\n' +
          'Execução real: BLOQUEADA\n' +
          'Backend: NÃO CONECTADO\n\n' +
          '[Use o painel completo no cockpit para configuração detalhada.]';
        output.classList.remove('empty');
        btn.textContent = '✓ GERADO';
        setTimeout(function () { btn.textContent = btn.dataset.sfLabel || '⬡ GERAR'; }, 2400);
      });
    });

    document.querySelectorAll('[data-sf-copy]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var sourceId = btn.dataset.sfCopy;
        var source   = document.getElementById(sourceId);
        if (!source) return;
        var text = source.value || source.textContent || '';
        if (!text || !text.trim()) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () {
            btn.textContent = '✓ COPIADO';
            setTimeout(function () { btn.textContent = '⎘ COPIAR'; }, 1800);
          }).catch(function () {
            btn.textContent = 'SELECIONE MANUALMENTE';
            setTimeout(function () { btn.textContent = '⎘ COPIAR'; }, 2200);
          });
        }
      });
    });

    // Initialize first module
    setSoftwareFactoryModule(_sfActiveModule);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      init();
      initReserve();
      initProjectBuilder();
      initTemplatePacks();
      initMissionComposer();
      initWorkerHandoff();
      initProjectExportPreview();
      initHumanApprovalGate();
      initRealFileCommandPackage();
      initWorkerResultReceipt();
      initFinalProductDashboard();
      initSoftwareFactoryPage();
    });
  } else {
    init();
    initReserve();
    initProjectBuilder();
    initTemplatePacks();
    initMissionComposer();
    initWorkerHandoff();
    initProjectExportPreview();
    initHumanApprovalGate();
    initRealFileCommandPackage();
    initWorkerResultReceipt();
    initFinalProductDashboard();
    initSoftwareFactoryPage();
  }
})();
