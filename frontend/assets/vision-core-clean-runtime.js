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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      init();
      initReserve();
      initProjectBuilder();
      initTemplatePacks();
    });
  } else {
    init();
    initReserve();
    initProjectBuilder();
    initTemplatePacks();
  }
})();
