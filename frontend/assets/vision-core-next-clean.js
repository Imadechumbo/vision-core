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
    chat: { title: 'Chat', status: 'READY', agents: ['hermes'], text: 'Entrada principal pronta. A pr\u00f3xima etapa \u00e9 conectar o envio ao endpoint de chat sem importar o bundle legado.' },
    missions: { title: 'Missions', status: 'READY', agents: ['hermes', 'scanner', 'patchEngine', 'aegis', 'passGold'], text: 'Fluxo de miss\u00e3o preparado: diagn\u00f3stico, contexto, patch, seguran\u00e7a e autoriza\u00e7\u00e3o final.' },
    factory: { title: 'Software Factory', status: 'PLACEHOLDER', agents: ['openclaw', 'pi', 'aegis'], text: 'Placeholder funcional para Auto-Pilot e Modo Avan\u00e7ado. Falta conectar os jobs SF desacoplados nesta nova UI.' },
    timeline: { title: 'Timeline', status: 'PLACEHOLDER', agents: ['archivist'], text: 'Placeholder funcional para eventos de miss\u00e3o. Falta ler e escrever a timeline real via API nesta tela Next.' },
    agents: { title: 'Agentes', status: 'READY', agents: ['hermes', 'scanner', 'patchEngine', 'aegis', 'goCore', 'github'], text: 'Mapa visual dos agentes pronto. Falta ligar status real individual de cada agente ao HUD.' },
    github: { title: 'GitHub', status: 'PLACEHOLDER', agents: ['github'], text: 'Placeholder funcional para PR e release. Falta conectar cria\u00e7\u00e3o de PR com repo/base branch no modelo minimalista.' },
    vault: { title: 'Vault', status: 'PLACEHOLDER', agents: ['aegis', 'archivist'], text: 'Placeholder funcional para snapshot e rollback. Falta acoplar a API de Vault na UI Next.' },
    metrics: { title: 'M\u00e9tricas', status: 'PLACEHOLDER', agents: ['goCore', 'aegis'], text: 'Placeholder funcional para m\u00e9tricas reais. Falta renderizar os endpoints de m\u00e9tricas no formato minimalista.' },
    tools: { title: 'Tools', status: 'PLACEHOLDER', agents: ['scanner', 'patchEngine'], text: 'Placeholder funcional para ferramentas, dry-run, anexos e utilit\u00e1rios. Falta conectar comandos reais.' },
    obsidian: { title: 'Obsidian', status: 'PLACEHOLDER', agents: ['archivist'], text: 'Placeholder funcional para mem\u00f3ria/Obsidian. Falta definir o conector desacoplado da UI legada.' },
    settings: { title: 'Configura\u00e7\u00e3o de IA', status: 'PLACEHOLDER', agents: ['hermes'], text: 'Placeholder funcional para AI Provider Vault. Falta portar a tela de configura\u00e7\u00e3o sem reutilizar componentes legados.' },
    attach: { title: 'Anexos', status: 'LOCAL', agents: ['scanner'], text: 'Seletor local de arquivos ativo. Falta enviar os arquivos para a miss\u00e3o real nesta nova camada.' },
    image: { title: 'Leitura de print/imagem', status: 'LOCAL', agents: ['scanner', 'hermes'], text: 'Seletor local de imagem ativo. Falta conectar OCR/vis\u00e3o ou upload real ao fluxo de miss\u00e3o.' }
  };

  function appendMessage(kind, title, text) {
    if (!stream) return;
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

  document.querySelectorAll('[data-feature]').forEach(function (node) {
    node.addEventListener('click', function (event) {
      event.preventDefault();
      selectFeature(node.getAttribute('data-feature'), !!node.closest('.vc-composer-actions')); 
    });
  });

  if (featureRun) {
    featureRun.addEventListener('click', function () {
      var feature = featureMap[activeFeature] || featureMap.chat;
      if (window.setAtomicCoreState) window.setAtomicCoreState('action');
      if (window.highlightAtomicAgents) window.highlightAtomicAgents(feature.agents || []);
      appendMessage('pending', feature.title.toUpperCase(), feature.text);
      window.setTimeout(function () {
        if (window.resetAtomicCore) window.resetAtomicCore();
      }, 2600);
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

  if (composer) {
    composer.addEventListener('submit', function (event) {
      event.preventDefault();
      var text = prompt ? prompt.value.trim() : '';
      if (!text) return;
      appendMessage('user', 'VOCE', text);
      if (window.setAtomicCoreState) window.setAtomicCoreState('action');
      if (window.highlightAtomicAgents) window.highlightAtomicAgents(['hermes', 'scanner', 'patchEngine']);
      appendMessage('pending', 'MISSION ROUTER', 'Miss\\u00e3o preparada na interface Next. Pendente: conectar este submit ao endpoint real sem trazer a UI legada.');
      prompt.value = '';
      resizePrompt();
      window.setTimeout(function () {
        if (window.resetAtomicCore) window.resetAtomicCore();
      }, 3200);
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

  try { reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) {}

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
    if (reduceMotion) return { angle: this.base, radius: AGENT_RADIUS, scale: 1, opacity: .9, glow: 24, layer: 4 };
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
    highlighted = Object.create(null);
    return setAtomicCoreState('idle');
  }

  window.setAtomicCoreState = setAtomicCoreState;
  window.highlightAtomicAgents = highlightAtomicAgents;
  window.resetAtomicCore = resetAtomicCore;
  window.AtomicCoreNext = { setState: setAtomicCoreState, highlight: highlightAtomicAgents, reset: resetAtomicCore };

  root.setAttribute('data-glow', 'on');
  setAtomicCoreState('idle');
  selectFeature('chat', false);
  if (!reduceMotion) raf = window.requestAnimationFrame(frame);
})();

(function () {
  'use strict';

  var pupils = Array.prototype.slice.call(document.querySelectorAll('.vc-eye-logo .vc-pupil'));
  if (!pupils.length) return;

  var reduceMotion = false;
  try { reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) {}
  if (reduceMotion) return;

  var atomicRoot = document.querySelector('[data-atomic-core]');
  var BLINK_MS = 300;
  var DOUBLE_BLINK_CHANCE = 0.2;
  var DOUBLE_BLINK_GAP_MS = 250;
  var MIN_DELAY_MS = 4000;
  var MAX_DELAY_MS = 9000;
  var timer = null;

  function isIdle() {
    return !atomicRoot || atomicRoot.getAttribute('data-state') !== 'action';
  }

  function blinkOnce(targets) {
    (targets || pupils).forEach(function (pupil) {
      pupil.animate(
        [
          { transform: 'scaleY(1)', opacity: 1 },
          { transform: 'scaleY(0.08)', opacity: 0.15, offset: 0.35 },
          { transform: 'scaleY(0.08)', opacity: 0.15, offset: 0.6 },
          { transform: 'scaleY(1)', opacity: 1 }
        ],
        { duration: BLINK_MS, easing: 'ease-in-out' }
      );
    });
  }

  function scheduleNext() {
    if (timer) { window.clearTimeout(timer); timer = null; }
    if (!isIdle()) return;
    var delay = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
    timer = window.setTimeout(function () {
      timer = null;
      if (!isIdle()) return;
      blinkOnce();
      if (Math.random() < DOUBLE_BLINK_CHANCE) {
        window.setTimeout(function () {
          if (isIdle()) blinkOnce();
        }, DOUBLE_BLINK_GAP_MS);
      }
      scheduleNext();
    }, delay);
  }

  if (atomicRoot && window.MutationObserver) {
    new MutationObserver(function () {
      if (isIdle()) {
        if (!timer) scheduleNext();
      } else if (timer) {
        window.clearTimeout(timer);
        timer = null;
      }
    }).observe(atomicRoot, { attributes: true, attributeFilter: ['data-state'] });
  }

  var HOVER_BLINK_MIN_GAP_MS = 400;
  var lastHoverBlink = new WeakMap();

  Array.prototype.slice.call(document.querySelectorAll('.vc-eye-logo')).forEach(function (logo) {
    var pupil = logo.querySelector('.vc-pupil');
    if (!pupil) return;
    logo.addEventListener('mouseenter', function () {
      var now = Date.now();
      var last = lastHoverBlink.get(logo) || 0;
      if (now - last < HOVER_BLINK_MIN_GAP_MS) return;
      lastHoverBlink.set(logo, now);
      blinkOnce([pupil]);
    });
  });

  scheduleNext();
})();