# VISION CORE — RESTAURACAO DEFINITIVA V14
# Escreve os arquivos exatos da branch v14-v8-gold-clean-rebuild
# Execute em: C:\Users\imadechumbo\Desktop\vision-core\

Write-Host "" 
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  VISION CORE — RESTAURACAO DEFINITIVA V14" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Criar estrutura
New-Item -ItemType Directory -Path 'frontend\assets' -Force | Out-Null
New-Item -ItemType Directory -Path 'frontend\_legacy_quarantine' -Force | Out-Null
Write-Host "  OK - estrutura criada" -ForegroundColor Green

# --- frontend/index.html ---
Set-Content -Path 'frontend\index.html' -Value @'
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="vision-api-base" content="https://visioncore-api-gateway.weiganlight.workers.dev">
  <title>VISION CORE · V14.1</title>
  <link rel="stylesheet" href="assets/vision-gold.css">
</head>
<body>
  <div class="shell">
    <header class="topbar" aria-label="Barra principal">
      <a class="brand" href="#mission" aria-label="VISION CORE home">
        <span class="brand-eye" aria-hidden="true"><span></span></span>
        <span class="brand-copy"><strong>VISION CORE</strong><small>V14.1 · Gold Clean Rebuild</small></span>
      </a>
      <nav class="menu" aria-label="Menu visual">
        <a href="#chat">Chat</a>
        <a href="#agent">Agent Local</a>
        <a href="#report">Mission Report</a>
        <a href="#logs">Logs</a>
      </nav>
      <button id="signInBtn" class="btn btn-ghost" type="button">SIGN IN</button>
    </header>

    <main id="mission" class="dashboard">
      <section id="chat" class="panel chat-panel" aria-labelledby="chatTitle">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Vision Chat</p>
            <h1 id="chatTitle">Comando central</h1>
          </div>
          <span class="status-pill" id="chatStatus">LOCAL READY</span>
        </div>

        <div id="chatMessages" class="chat-messages" aria-live="polite">
          <article class="message assistant">
            <span>VISION</span>
            <p>Descreva a missão. A execução é feita apenas pelo Runtime Owner e depende de resposta real do backend.</p>
          </article>
        </div>

        <form id="chatForm" class="chat-form">
          <label class="sr-only" for="missionInput">Missão</label>
          <textarea id="missionInput" name="mission" rows="5" placeholder="Ex.: analisar contrato dos agentes, executar missão e retornar evidências reais..."></textarea>
          <div class="chat-actions">
            <label class="btn btn-soft" for="fileInput">ADICIONAR ARQUIVOS</label>
            <input id="fileInput" type="file" multiple hidden>
            <button id="sendBtn" class="btn btn-primary" type="submit">ENVIAR</button>
            <button id="executeMissionBtn" class="btn btn-gold" type="button">EXECUTAR MISSÃO</button>
          </div>
          <div id="attachmentList" class="attachment-list" aria-live="polite"></div>
        </form>
      </section>

      <aside id="agent" class="panel agent-panel" aria-labelledby="agentTitle">
        <div class="panel-heading compact">
          <div>
            <p class="eyebrow">Vision Agent Local</p>
            <h2 id="agentTitle">Órbita operacional</h2>
          </div>
          <span id="agentStatus" class="status-pill muted">WAITING</span>
        </div>
        <div id="agentOrbit" class="agent-orbit" aria-label="Agentes locais"></div>
        <div id="agentDetail" class="agent-detail">Selecione um agente para ver contrato, status e evidência.</div>
      </aside>

      <section id="report" class="panel report-panel" aria-labelledby="reportTitle">
        <div class="panel-heading compact">
          <div>
            <p class="eyebrow">Mission Report</p>
            <h2 id="reportTitle">Evidência e bloqueios</h2>
          </div>
          <span id="reportState" class="status-pill blocked">BLOCKED</span>
        </div>
        <div id="missionReport" class="report-grid"></div>
      </section>

      <section id="logs" class="panel log-panel" aria-labelledby="logTitle">
        <div class="panel-heading compact">
          <div>
            <p class="eyebrow">Logs</p>
            <h2 id="logTitle">Timeline</h2>
          </div>
        </div>
        <pre id="runtimeLogs" class="logs" aria-live="polite">V14.1 shell ready. Aguardando missão.</pre>
      </section>
    </main>
  </div>

  <div id="authModal" class="modal is-hidden" role="dialog" aria-modal="true" aria-labelledby="authTitle">
    <div class="modal-card">
      <button id="closeAuthBtn" class="modal-close" type="button" aria-label="Fechar">×</button>
      <p class="eyebrow">Autorização opcional</p>
      <h2 id="authTitle">Conectar integrações externas</h2>
      <p>Você pode continuar no modo local. Serviços externos exigem autorização conduzida pelo servidor.</p>
      <div class="modal-actions">
        <button id="continueLocalBtn" class="btn btn-soft" type="button">Continuar local</button>
        <button id="connectGitHubBtn" class="btn btn-primary" type="button">Conectar GitHub</button>
      </div>
    </div>
  </div>

  <script src="assets/vision-api.js" defer></script>
  <script src="assets/vision-report.js" defer></script>
  <script src="assets/vision-agent-local.js" defer></script>
  <script src="assets/vision-runtime-owner.js" defer></script>
  <script src="assets/vision-chat.js" defer></script>
</body>
</html>
'@ -Encoding UTF8
Write-Host "  OK - frontend/index.html" -ForegroundColor Green

# --- frontend/assets/vision-gold.css ---
Set-Content -Path 'frontend\assets\vision-gold.css' -Value @'
:root {
  color-scheme: dark;
  --bg: #060711;
  --panel: rgba(14, 18, 34, 0.82);
  --panel-strong: rgba(21, 26, 48, 0.96);
  --line: rgba(149, 163, 255, 0.2);
  --text: #eef2ff;
  --muted: #9aa7c7;
  --purple: #8b5cf6;
  --cyan: #22d3ee;
  --green: #22c55e;
  --gold: #f6c453;
  --danger: #fb7185;
  --shadow: 0 24px 80px rgba(0, 0, 0, 0.44);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

* { box-sizing: border-box; }
html { min-height: 100%; background: var(--bg); }
body {
  min-height: 100%;
  margin: 0;
  color: var(--text);
  background:
    radial-gradient(circle at 15% 0%, rgba(139, 92, 246, 0.24), transparent 30rem),
    radial-gradient(circle at 82% 10%, rgba(34, 211, 238, 0.18), transparent 26rem),
    linear-gradient(135deg, #060711 0%, #0c1020 55%, #080814 100%);
}
body::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image: linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
  background-size: 54px 54px;
  mask-image: radial-gradient(circle at center, black, transparent 78%);
}
button, textarea, input { font: inherit; }
a { color: inherit; text-decoration: none; }

.shell { width: min(1500px, calc(100% - 32px)); margin: 0 auto; padding: 18px 0 32px; }
.topbar {
  position: sticky; top: 12px; z-index: 20;
  display: flex; align-items: center; gap: 18px; justify-content: space-between;
  padding: 14px 16px;
  border: 1px solid var(--line); border-radius: 24px;
  background: rgba(7, 9, 20, 0.78); backdrop-filter: blur(18px); box-shadow: var(--shadow);
}
.brand { display: flex; align-items: center; gap: 12px; min-width: max-content; }
.brand-copy { display: grid; line-height: 1.1; letter-spacing: 0.08em; }
.brand-copy small { margin-top: 4px; color: var(--muted); font-size: 0.68rem; letter-spacing: 0.12em; text-transform: uppercase; }
.brand-eye {
  width: 52px; height: 34px; border: 2px solid rgba(167, 139, 250, 0.92); border-radius: 50% 50% 45% 45% / 62% 62% 38% 38%;
  display: grid; place-items: center; transform: rotate(-7deg);
  box-shadow: 0 0 28px rgba(139, 92, 246, 0.5), inset 0 0 18px rgba(34, 211, 238, 0.13);
}
.brand-eye span { width: 16px; height: 16px; border-radius: 999px; background: radial-gradient(circle, #fff 0 18%, var(--cyan) 20% 42%, var(--purple) 44% 100%); box-shadow: 0 0 18px var(--cyan); }
.menu { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
.menu a { color: var(--muted); border: 1px solid transparent; border-radius: 999px; padding: 9px 12px; }
.menu a:hover { color: var(--text); border-color: var(--line); background: rgba(255,255,255,0.05); }

.dashboard { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(320px, 0.75fr); gap: 18px; margin-top: 18px; align-items: stretch; }
.panel { border: 1px solid var(--line); border-radius: 28px; background: var(--panel); box-shadow: var(--shadow); backdrop-filter: blur(18px); overflow: hidden; }
.panel-heading { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 22px; border-bottom: 1px solid var(--line); }
.panel-heading.compact { padding: 18px 20px; }
.eyebrow { margin: 0 0 6px; color: var(--cyan); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.18em; }
h1, h2 { margin: 0; line-height: 1.05; }
h1 { font-size: clamp(2rem, 5vw, 4.6rem); letter-spacing: -0.07em; }
h2 { font-size: 1.25rem; }
.status-pill { display: inline-flex; align-items: center; justify-content: center; min-height: 30px; padding: 6px 11px; border-radius: 999px; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.1em; color: #06140b; background: var(--green); white-space: nowrap; }
.status-pill.muted { color: var(--text); background: rgba(154, 167, 199, 0.16); }
.status-pill.blocked { color: #2b0710; background: var(--danger); }
.status-pill.gold { color: #221400; background: var(--gold); }

.chat-panel { min-height: 680px; display: flex; flex-direction: column; }
.chat-messages { flex: 1; display: flex; flex-direction: column; gap: 14px; padding: 22px; overflow: auto; max-height: 55vh; }
.message { width: min(86%, 820px); padding: 14px 16px; border: 1px solid var(--line); border-radius: 20px; background: rgba(255,255,255,0.055); }
.message span { display: block; margin-bottom: 8px; color: var(--muted); font-size: 0.72rem; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; }
.message p { margin: 0; white-space: pre-wrap; line-height: 1.55; }
.message.user { align-self: flex-end; border-color: rgba(34, 211, 238, 0.3); background: rgba(34, 211, 238, 0.08); }
.message.assistant { align-self: flex-start; border-color: rgba(139, 92, 246, 0.28); }
.message.system { align-self: center; border-color: rgba(246, 196, 83, 0.32); background: rgba(246, 196, 83, 0.08); }
.chat-form { padding: 18px 22px 22px; border-top: 1px solid var(--line); background: rgba(7, 9, 20, 0.45); }
textarea { width: 100%; resize: vertical; min-height: 120px; color: var(--text); border: 1px solid var(--line); border-radius: 20px; outline: none; padding: 16px; background: rgba(5, 7, 16, 0.75); }
textarea:focus { border-color: rgba(34, 211, 238, 0.65); box-shadow: 0 0 0 4px rgba(34, 211, 238, 0.12); }
.chat-actions, .modal-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px; }
.btn { border: 0; border-radius: 999px; padding: 11px 15px; cursor: pointer; color: var(--text); font-weight: 900; letter-spacing: 0.08em; font-size: 0.76rem; text-transform: uppercase; }
.btn-primary { background: linear-gradient(135deg, var(--purple), var(--cyan)); color: white; }
.btn-gold { background: linear-gradient(135deg, var(--gold), #fde68a); color: #201400; }
.btn-soft, .btn-ghost { border: 1px solid var(--line); background: rgba(255,255,255,0.07); }
.btn:hover { transform: translateY(-1px); filter: brightness(1.08); }
.attachment-list { margin-top: 10px; color: var(--muted); font-size: 0.9rem; }

.agent-panel { min-height: 420px; }
.agent-orbit { position: relative; min-height: 360px; margin: 18px; border: 1px dashed rgba(149, 163, 255, 0.24); border-radius: 999px; background: radial-gradient(circle, rgba(139,92,246,0.12), transparent 56%); }
.agent-node { position: absolute; width: 112px; min-height: 76px; display: grid; place-items: center; gap: 5px; padding: 10px; border: 1px solid var(--line); border-radius: 18px; color: var(--text); background: var(--panel-strong); cursor: pointer; text-align: center; box-shadow: 0 12px 28px rgba(0,0,0,0.25); }
.agent-node strong { font-size: 0.78rem; }
.agent-node small { color: var(--muted); font-size: 0.68rem; }
.agent-node.is-gold { border-color: rgba(246, 196, 83, 0.78); box-shadow: 0 0 28px rgba(246, 196, 83, 0.2); }
.agent-detail { margin: 0 18px 18px; padding: 14px; border-radius: 18px; color: var(--muted); background: rgba(255,255,255,0.05); line-height: 1.5; }

.report-panel, .log-panel { grid-column: span 1; }
.report-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; padding: 18px; }
.report-item { border: 1px solid var(--line); border-radius: 18px; padding: 13px; background: rgba(255,255,255,0.045); min-width: 0; }
.report-item.full { grid-column: 1 / -1; }
.report-item b { display: block; margin-bottom: 7px; color: var(--muted); font-size: 0.72rem; letter-spacing: 0.12em; text-transform: uppercase; }
.report-item span, .report-item pre { overflow-wrap: anywhere; white-space: pre-wrap; }
.logs { margin: 0; min-height: 220px; max-height: 360px; overflow: auto; padding: 18px; color: #c7d2fe; background: rgba(3, 5, 12, 0.72); line-height: 1.5; }

.modal { position: fixed; inset: 0; z-index: 50; display: grid; place-items: center; padding: 18px; background: rgba(2, 4, 12, 0.68); backdrop-filter: blur(12px); }
.modal.is-hidden { display: none; }
.modal-card { position: relative; width: min(520px, 100%); border: 1px solid var(--line); border-radius: 28px; padding: 26px; background: var(--panel-strong); box-shadow: var(--shadow); }
.modal-card p:not(.eyebrow) { color: var(--muted); line-height: 1.6; }
.modal-close { position: absolute; top: 12px; right: 14px; width: 36px; height: 36px; border: 1px solid var(--line); border-radius: 999px; color: var(--text); background: rgba(255,255,255,0.06); cursor: pointer; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; }

@media (max-width: 1080px) {
  .dashboard { grid-template-columns: 1fr; }
  .report-panel, .log-panel { grid-column: auto; }
  .topbar { align-items: flex-start; flex-wrap: wrap; }
}
@media (max-width: 680px) {
  .shell { width: min(100% - 18px, 1500px); padding-top: 9px; }
  .topbar, .panel { border-radius: 20px; }
  .menu { order: 3; width: 100%; justify-content: flex-start; }
  .report-grid { grid-template-columns: 1fr; }
  .message { width: 100%; }
  .agent-orbit { border-radius: 28px; min-height: 520px; }
}
'@ -Encoding UTF8
Write-Host "  OK - frontend/assets/vision-gold.css" -ForegroundColor Green

# --- frontend/assets/vision-api.js ---
Set-Content -Path 'frontend\assets\vision-api.js' -Value @'
(function () {
  'use strict';

  var fallbackBase = 'https://visioncore-api-gateway.weiganlight.workers.dev';

  function readMetaBase() {
    var meta = document.querySelector('meta[name="vision-api-base"]');
    return meta ? meta.getAttribute('content') : '';
  }

  function cleanBase(value) {
    var raw = String(value || '').trim() || fallbackBase;
    return raw.replace(/\/+$/, '').replace(/\/api\/api$/i, '/api');
  }

  function normalizePath(path) {
    var value = String(path || '/');
    if (/^https?:\/\//i.test(value)) {
      return value.replace(/\/api\/api\//i, '/api/');
    }
    var withSlash = value.charAt(0) === '/' ? value : '/' + value;
    return withSlash.replace(/^\/api\/api(\/|$)/i, '/api$1');
  }

  function configuredBase() {
    return cleanBase(window.API_BASE_URL || window.__VISION_API__ || readMetaBase());
  }

  function apiUrl(path) {
    var normalized = normalizePath(path);
    if (/^https?:\/\//i.test(normalized)) {
      return normalized;
    }
    return configuredBase() + normalized;
  }

  async function request(method, path, body) {
    var options = {
      method: method,
      headers: { Accept: 'application/json' },
      credentials: 'omit'
    };
    if (body !== undefined) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
    var response = await fetch(apiUrl(path), options);
    var contentType = response.headers.get('content-type') || '';
    var payload = contentType.indexOf('application/json') >= 0 ? await response.json() : await response.text();
    if (!response.ok) {
      var detail = typeof payload === 'string' ? payload : (payload && (payload.error || payload.message)) || response.statusText;
      throw new Error('HTTP ' + response.status + ': ' + detail);
    }
    return payload;
  }

  function streamUrl(missionId) {
    if (!missionId || typeof missionId !== 'string') {
      throw new Error('mission_id required for stream');
    }
    return apiUrl('/api/run-live-stream') + '?mission_id=' + encodeURIComponent(missionId);
  }

  function download(path) {
    window.location.assign(apiUrl(path));
  }

  window.VisionApi = {
    get: function (path) { return request('GET', path); },
    post: function (path, body) { return request('POST', path, body); },
    apiUrl: apiUrl,
    streamUrl: streamUrl,
    download: download
  };
}());
'@ -Encoding UTF8
Write-Host "  OK - frontend/assets/vision-api.js" -ForegroundColor Green

# --- frontend/assets/vision-chat.js ---
Set-Content -Path 'frontend\assets\vision-chat.js' -Value @'
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
'@ -Encoding UTF8
Write-Host "  OK - frontend/assets/vision-chat.js" -ForegroundColor Green

# --- frontend/assets/vision-agent-local.js ---
Set-Content -Path 'frontend\assets\vision-agent-local.js' -Value @'
(function () {
  'use strict';

  var agents = [
    { name: 'OpenClaw', contract: 'Coordena a missão e valida handoff entre agentes.' },
    { name: 'Scanner', contract: 'Inspeciona sinais, riscos e evidências técnicas.' },
    { name: 'Hermes', contract: 'Comunica eventos, status e síntese operacional.' },
    { name: 'PatchEngine', contract: 'Prepara alterações somente quando há contrato válido.' },
    { name: 'Aegis', contract: 'Aplica política de bloqueio e segurança.' },
    { name: 'PASS GOLD', contract: 'Só acende com autorização de promoção e recibo de evidência válido.', gold: true },
    { name: 'PR GitHub', contract: 'Depende de integração autorizada pelo servidor.' }
  ];
  var lastPayload = {};

  function byId(id) { return document.getElementById(id); }
  function hasEvidence(payload) {
    return !!(window.VisionReport && window.VisionReport.hasValidEvidence(payload && payload.evidence_receipt));
  }
  function hasGold(payload) {
    return !!(payload && payload.pass_gold === true && payload.promotion_allowed === true && hasEvidence(payload));
  }
  function statusFor(agent, payload) {
    if (agent.gold) { return hasGold(payload) ? 'GOLD VERIFIED' : 'BLOCKED'; }
    if (payload && (payload.state || payload.status)) { return String(payload.state || payload.status).toUpperCase(); }
    return 'WAITING';
  }
  function position(index, total) {
    var angle = (Math.PI * 2 * index / total) - Math.PI / 2;
    var radius = 38;
    return {
      left: 50 + Math.cos(angle) * radius,
      top: 50 + Math.sin(angle) * radius
    };
  }
  function showDetail(agent) {
    var detail = byId('agentDetail');
    if (!detail) { return; }
    var evidence = hasEvidence(lastPayload) ? lastPayload.evidence_receipt : 'missing';
    detail.textContent = agent.name + ' · contrato: ' + agent.contract + ' · status: ' + statusFor(agent, lastPayload) + ' · evidence: ' + evidence;
  }
  function render() {
    var orbit = byId('agentOrbit');
    if (!orbit) { return; }
    orbit.replaceChildren();
    agents.forEach(function (agent, index) {
      var node = document.createElement('button');
      var point = position(index, agents.length);
      node.type = 'button';
      node.className = 'agent-node' + (agent.gold ? ' is-gold' : '');
      node.style.left = 'calc(' + point.left + '% - 56px)';
      node.style.top = 'calc(' + point.top + '% - 38px)';
      node.innerHTML = '<strong></strong><small></small>';
      node.querySelector('strong').textContent = agent.name;
      node.querySelector('small').textContent = statusFor(agent, lastPayload);
      node.addEventListener('click', function () { showDetail(agent); });
      orbit.appendChild(node);
    });
    var status = byId('agentStatus');
    if (status) {
      status.textContent = hasGold(lastPayload) ? 'GOLD VERIFIED' : (lastPayload.state || lastPayload.status || 'WAITING');
      status.className = 'status-pill ' + (hasGold(lastPayload) ? 'gold' : 'muted');
    }
  }
  function update(payload) {
    lastPayload = payload && typeof payload === 'object' ? payload : {};
    render();
    return { gold: hasGold(lastPayload), evidence: hasEvidence(lastPayload) };
  }

  window.VisionAgentLocal = { update: update, render: render };
  document.addEventListener('DOMContentLoaded', render);
}());
'@ -Encoding UTF8
Write-Host "  OK - frontend/assets/vision-agent-local.js" -ForegroundColor Green

# --- frontend/assets/vision-runtime-owner.js ---
Set-Content -Path 'frontend\assets\vision-runtime-owner.js' -Value @'
(function () {
  'use strict';

  var running = false;
  var source = null;

  function byId(id) { return document.getElementById(id); }
  function log(line) {
    var logs = byId('runtimeLogs');
    var text = '[' + new Date().toISOString() + '] ' + line;
    if (logs) { logs.textContent = (logs.textContent ? logs.textContent + '\n' : '') + text; }
  }
  function missionText() {
    var input = byId('missionInput');
    return input ? input.value.trim() : '';
  }
  function report(payload) {
    if (window.VisionReport) { window.VisionReport.render(payload); }
    if (window.VisionAgentLocal) { window.VisionAgentLocal.update(payload); }
  }
  function release(reason) {
    running = false;
    if (source) {
      source.close();
      source = null;
    }
    if (reason) { log(reason); }
  }
  function realMissionId(payload) {
    var id = payload && payload.mission_id;
    return typeof id === 'string' && id.trim().length > 0 ? id.trim() : '';
  }
  function handleEvent(raw) {
    var payload;
    try { payload = JSON.parse(raw); } catch (error) { payload = { logs: [raw], state: 'STREAM' }; }
    report(payload);
    if (payload.log || payload.message) { log(payload.log || payload.message); }
    var state = String(payload.state || payload.status || '').toLowerCase();
    if (state === 'done' || state === 'error' || state === 'fail' || state === 'failed') {
      release('runtime released: ' + state);
    }
  }
  async function executeMission() {
    if (running) {
      log('BLOCKED: mission already running');
      return;
    }
    if (!window.VisionApi) {
      report({ state: 'BLOCKED', block_reason: 'VisionApi unavailable' });
      log('BLOCKED: VisionApi unavailable');
      return;
    }
    var text = missionText();
    if (!text) {
      report({ state: 'BLOCKED', block_reason: 'Mission text is required' });
      log('BLOCKED: mission text is required');
      return;
    }
    running = true;
    try {
      log('POST /api/run-live');
      var start = await window.VisionApi.post('/api/run-live', { mission: text });
      var id = realMissionId(start);
      if (!id) {
        report(Object.assign({}, start || {}, { state: 'BLOCKED', block_reason: 'Backend did not return mission_id' }));
        release('BLOCKED: backend did not return mission_id');
        return;
      }
      report(Object.assign({}, start, { state: start.state || 'RUNNING' }));
      source = new EventSource(window.VisionApi.streamUrl(id));
      source.onmessage = function (event) { handleEvent(event.data); };
      source.addEventListener('done', function (event) { handleEvent(event.data || '{"state":"done"}'); });
      source.addEventListener('fail', function (event) { handleEvent(event.data || '{"state":"fail"}'); });
      source.onerror = function () {
        report({ mission_id: id, state: 'BLOCKED', block_reason: 'stream error' });
        release('runtime released: stream error');
      };
    } catch (error) {
      report({ state: 'BLOCKED', block_reason: error.message });
      release('BLOCKED: ' + error.message);
    }
  }
  function bind() {
    var button = byId('executeMissionBtn');
    if (button) { button.addEventListener('click', function () { window.VisionRuntimeOwner.executeMission(); }); }
  }

  window.VisionRuntimeOwner = { executeMission: executeMission };
  document.addEventListener('DOMContentLoaded', bind);
}());
'@ -Encoding UTF8
Write-Host "  OK - frontend/assets/vision-runtime-owner.js" -ForegroundColor Green

# --- frontend/assets/vision-report.js ---
Set-Content -Path 'frontend\assets\vision-report.js' -Value @'
(function () {
  'use strict';

  function byId(id) { return document.getElementById(id); }
  function validEvidence(value) { return typeof value === 'string' && value.trim().length >= 8; }
  function list(value) {
    if (Array.isArray(value)) { return value.length ? value.join('\n') : '—'; }
    return value || '—';
  }
  function boolText(value) { return value === true ? 'true' : 'false'; }
  function safeText(value) { return value === undefined || value === null || value === '' ? '—' : String(value); }

  function normalized(payload) {
    var data = payload && typeof payload === 'object' ? payload : {};
    var hasEvidence = validEvidence(data.evidence_receipt);
    var passed = data.pass_gold === true && data.promotion_allowed === true && hasEvidence;
    return {
      mission_id: data.mission_id || data.id || '—',
      project: data.project || data.repository || '—',
      mode: data.mode || 'local/runtime-owner',
      state: hasEvidence ? (data.state || data.status || 'INCOMPLETE') : 'INCOMPLETE / BLOCKED — evidence missing',
      passGold: passed,
      promotionAllowed: passed,
      evidence: hasEvidence ? data.evidence_receipt : 'evidence missing',
      rootCause: data.root_cause || data.rootCause || (hasEvidence ? '—' : 'Real evidence receipt was not provided by backend.'),
      files: data.files_changed || data.changed_files || data.files || [],
      logs: data.logs || data.events || [],
      blockReason: hasEvidence ? (data.block_reason || data.blocked_reason || '—') : 'BLOCKED — evidence missing'
    };
  }

  function item(label, value, full) {
    var node = document.createElement('div');
    node.className = 'report-item' + (full ? ' full' : '');
    var title = document.createElement('b');
    title.textContent = label;
    var body = document.createElement(full ? 'pre' : 'span');
    body.textContent = value;
    node.append(title, body);
    return node;
  }

  function render(payload) {
    var data = normalized(payload);
    var root = byId('missionReport');
    var state = byId('reportState');
    if (!root) { return data; }
    root.replaceChildren(
      item('Mission ID', safeText(data.mission_id)),
      item('Projeto', safeText(data.project)),
      item('Modo', safeText(data.mode)),
      item('Estado', safeText(data.state)),
      item('PASS GOLD', boolText(data.passGold)),
      item('Promotion Allowed', boolText(data.promotionAllowed)),
      item('Evidence Receipt', safeText(data.evidence), true),
      item('Root Cause', safeText(data.rootCause), true),
      item('Arquivos alterados', list(data.files), true),
      item('Logs', list(data.logs), true),
      item('Motivo de bloqueio', safeText(data.blockReason), true)
    );
    if (state) {
      state.textContent = data.passGold ? 'GOLD' : 'BLOCKED';
      state.className = 'status-pill ' + (data.passGold ? 'gold' : 'blocked');
    }
    return data;
  }

  window.VisionReport = { render: render, hasValidEvidence: validEvidence };
  document.addEventListener('DOMContentLoaded', function () { render({}); });
}());
'@ -Encoding UTF8
Write-Host "  OK - frontend/assets/vision-report.js" -ForegroundColor Green

Set-Content -Path 'frontend\_headers' -Value @'
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
'@ -Encoding UTF8
Write-Host "  OK - frontend/_headers" -ForegroundColor Green

Set-Content -Path 'frontend\_redirects' -Value '/api/* https://visioncore-api-gateway.weiganlight.workers.dev/api/:splat 200' -Encoding UTF8
Write-Host "  OK - frontend/_redirects" -ForegroundColor Green

Set-Content -Path 'frontend\_legacy_quarantine\README.md' -Value '# LEGACY QUARANTINE`nArquivos mortos. Nao importar. Nao referenciar. Nao carregar.' -Encoding UTF8
Write-Host "  OK - frontend/_legacy_quarantine/README.md" -ForegroundColor Green

# Rodar guard
Write-Host ""
Write-Host "Rodando SDDF guard..." -ForegroundColor Yellow
node tools\sddf-front-guard.mjs
if ($LASTEXITCODE -ne 0) {
    Write-Host "  GUARD FALHOU. Veja erros acima." -ForegroundColor Red
    exit 1
}
Write-Host ""

# Git add e commit
Write-Host "Fazendo commit..." -ForegroundColor Yellow
git add frontend/
git commit -m 'fix(frontend): restaura arquivos V14 exatos da branch gold clean rebuild'
Write-Host "  OK - commit realizado" -ForegroundColor Green
Write-Host ""

# Push
$confirm = Read-Host "Push para origin/v14-v8-gold-clean-rebuild? (s/N)"
if ($confirm -match "^[Ss]$") {
    git push origin v14-v8-gold-clean-rebuild
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "==================================================" -ForegroundColor Green
        Write-Host "  SUCESSO! V14 restaurado e publicado." -ForegroundColor Green
        Write-Host "  SDDF FRONT GUARD: PASS" -ForegroundColor Green
        Write-Host "==================================================" -ForegroundColor Green
    } else {
        Write-Host "  ERRO no push." -ForegroundColor Red
    }
} else {
    Write-Host "  Push cancelado. Rode: git push origin v14-v8-gold-clean-rebuild" -ForegroundColor Gray
}
Write-Host ""