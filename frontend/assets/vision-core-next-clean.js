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
  var featureRun = document.getElementById('vcFeatureRun');
  var attachmentInput = document.getElementById('vcAttachmentInput');
  var imageInput = document.getElementById('vcImageInput');
  var activeFeature = 'chat';

  var featureMap = {
    chat: { title: 'Chat', status: 'READY', agents: ['hermes'], text: 'Chat livre conectado ao endpoint real /api/chat.', actions: [{ label: 'Checar API', path: '/api/health' }] },
    missions: { title: 'Missions', status: 'SAFE READ', agents: ['hermes', 'scanner', 'patchEngine', 'aegis', 'passGold'], text: 'Missões reais existem em /api/copilot e /api/run-live, mas execução consome quota e só será ligada com confirmação explícita.', actions: [{ label: 'Quota', path: '/api/mission/quota' }, { label: 'Agent local', path: '/api/agent/status' }] },
    factory: { title: 'Software Factory', status: 'MAPPED', agents: ['openclaw', 'pi', 'aegis'], text: 'Auto-Pilot e Modo Avançado serão portados sem bundle legado. Jobs SF permanecem bloqueados nesta etapa para evitar custo/API real acidental.', actions: [{ label: 'Planejador', path: '/api/health' }] },
    timeline: { title: 'Timeline', status: 'SAFE READ', agents: ['archivist'], text: 'Timeline preparada para leitura real de missão.', actions: [{ label: 'Carregar timeline', path: '/api/mission/timeline' }] },
    agents: { title: 'Agentes', status: 'SAFE READ', agents: ['hermes', 'scanner', 'patchEngine', 'aegis', 'goCore', 'github'], text: 'Status real dos agentes sem executar missão.', actions: [{ label: 'Status agent', path: '/api/agent/status' }, { label: 'Catálogo', path: '/api/agents/catalog' }] },
    github: { title: 'GitHub', status: 'SAFE READ', agents: ['github'], text: 'Criação de PR é ação crítica e fica bloqueada até formulário + confirmação. Por enquanto, só status.', actions: [{ label: 'Status GitHub', path: '/api/github/status' }] },
    vault: { title: 'Vault', status: 'SAFE READ', agents: ['aegis', 'archivist'], text: 'Snapshot e rollback escrevem estado; nesta etapa, somente listagem/consulta.', actions: [{ label: 'Snapshots', path: '/api/vault/snapshots' }] },
    metrics: { title: 'Métricas', status: 'SAFE READ', agents: ['goCore', 'aegis'], text: 'Métricas reais em modo leitura.', actions: [{ label: 'Resumo', path: '/api/metrics/summary' }, { label: 'Agentes', path: '/api/metrics/agents' }, { label: 'DORA', path: '/api/dora-metrics' }] },
    tools: { title: 'Tools', status: 'SAFE READ', agents: ['scanner', 'patchEngine'], text: 'Ferramentas perigosas como apply-fix ficam bloqueadas. Primeiro passo: histórico e diagnóstico.', actions: [{ label: 'Histórico security', path: '/api/security/history' }] },
    obsidian: { title: 'Obsidian', status: 'SAFE READ', agents: ['archivist'], text: 'Consulta de conector/memória sem escrita.', actions: [{ label: 'Status Obsidian', path: '/api/obsidian/status' }] },
    settings: { title: 'Configuração de IA', status: 'SAFE READ', agents: ['hermes'], text: 'AI Provider Vault será portado com proteção de segredo. Por enquanto, só listagem sem expor chaves.', actions: [{ label: 'Providers', path: '/api/providers/list' }] },
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
    if (window.highlightAtomicAgents) window.highlightAtomicAgents(feature.agents || []);
    if (announce) appendMessage('pending', feature.title.toUpperCase(), feature.text);
  }

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
      body: opts.body ? JSON.stringify(opts.body) : undefined
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

  if (composer) {
    composer.addEventListener('submit', function (event) {
      event.preventDefault();
      var text = prompt ? prompt.value.trim() : '';
      if (!text) return;
      appendMessage('user', 'VOCE', text);
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

      fetch(CHAT_BACKEND_URL + '/api/chat', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ message: text, mode: 'vision-geral', model: 'auto', display_input: text }),
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

  function describeFiles(input, label, featureKey) {
    if (!input || !input.files || !input.files.length) return;
    selectFeature(featureKey, false);
    var names = Array.prototype.slice.call(input.files).map(function (file) { return file.name; }).join(', ');
    appendMessage('pending', label, names + ' preparado(s). Pendente: conectar upload real ao fluxo de miss\\u00e3o.');
    if (window.setAtomicCoreState) window.setAtomicCoreState('action');
    if (window.highlightAtomicAgents) window.highlightAtomicAgents(featureMap[featureKey].agents);
    window.setTimeout(function () { if (window.resetAtomicCore) window.resetAtomicCore(); }, 2200);
  }

  if (attachmentInput) attachmentInput.addEventListener('change', function () { describeFiles(attachmentInput, 'ANEXOS', 'attach'); });
  if (imageInput) imageInput.addEventListener('change', function () { describeFiles(imageInput, 'IMAGEM', 'image'); });

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
