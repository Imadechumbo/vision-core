/**
 * VISION CORE V8.2 — UI COMMAND CHAT
 * ─────────────────────────────────────────────────────────────────
 * Responsabilidades:
 *   - Renderizar VISION AI COMMAND (chat central)
 *   - Modos: Auto | Conversa | Missão SDDF | Caveman
 *   - Expor window.__VISION_APPEND_CHAT__
 *   - Expor window.__VISION_GET_CHAT_TEXT__
 *   - Expor window.__VISION_CLEAR_CHAT_TEXT__
 *   - ENVIAR → /api/copilot (nunca run-live)
 *   - EXECUTAR MISSÃO → window.__VRO_RUN_MISSION__ (runtime owner)
 *
 * PROIBIDO:
 *   - new EventSource
 *   - /api/run-live
 *   - window.fetch =
 *   - startSSE
 *   - doReport / buildReport / triggerReport
 * ─────────────────────────────────────────────────────────────────
 */
(function VisionUICommand() {
  'use strict';

  if (window.__VUI_LOADED__) return;
  window.__VUI_LOADED__ = true;

  /* ── HELPERS ── */
  function $(id) { return document.getElementById(id); }

  var API = (window.__VISION_API__ || window.API_BASE_URL || '').replace(/\/$/, '');
  function apiUrl(p) {
    if (/^https?:\/\//.test(p)) return p;
    if (p.indexOf('/api') === 0) return API + p;
    return API + '/api' + (p.charAt(0) === '/' ? p : '/' + p);
  }

  var state = { files: [], mode: 'auto', history: [] };

  /* ── ADDMESSAGE: insere mensagem no stream visual ── */
  function addMessage(type, text, badge) {
    var stream = $('v298ChatStream');
    if (!stream) return;
    var hint = stream.querySelector('.v298-empty-hint');
    if (hint) hint.remove();

    var wrap = document.createElement('div');
    wrap.className = 'v298-message ' + (type || 'bot');

    if (badge) {
      var b = document.createElement('span');
      b.className = 'vui-badge vui-badge-' + badge.toLowerCase();
      b.textContent = badge;
      wrap.appendChild(b);
    }

    var txt = document.createElement('span');
    txt.textContent = String(text || '');
    wrap.appendChild(txt);

    stream.appendChild(wrap);
    stream.scrollTop = stream.scrollHeight;
  }

  /* ── BRIDGE GLOBALS exposto para runtime owner ── */
  window.__VISION_APPEND_CHAT__ = function(type, text) {
    var badgeMap = {
      system: 'SYSTEM', gold: 'SDDF', running: 'SDDF', error: 'SYSTEM'
    };
    addMessage(type || 'bot', text || '', badgeMap[type] || null);
  };

  window.__VISION_GET_CHAT_TEXT__ = function() {
    var p = $('v298Prompt');
    return p ? p.value.trim() : '';
  };

  window.__VISION_CLEAR_CHAT_TEXT__ = function() {
    var p = $('v298Prompt');
    if (p) p.value = '';
  };

  /* ── COPILOT (modo Conversa) ── */
  async function sendCopilot(text, mode) {
    try {
      var r = await fetch(apiUrl('/api/copilot'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          mode: mode || 'general',
          history: state.history.slice(-6)
        })
      });
      var d = await r.json().catch(function() { return {}; });
      return d.answer || d.response || d.rca || 'Análise concluída.';
    } catch(e) {
      return null; // caller trata falha
    }
  }

  /* ── CAVEMAN SKILL ── */
  var CAVEMAN_PATTERNS = [
    {
      re: /startSSE|recursion|call stack|loop/i,
      explain: function() { return [
        'PROBLEMA SIMPLES:',
        'Dois motores tentaram dirigir o mesmo carro ao mesmo tempo.',
        'Cada um chamou o outro em círculo até o sistema travar.',
        '',
        'O QUE ESTAVA QUEBRADO:',
        'startSSE foi chamado pelo V2910, que chamou o V32,',
        'que chamou o V2910 de volta. Loop infinito.',
        '',
        'O QUE FOI FEITO:',
        'Deixamos só um motor (V32/VRO) dirigir.',
        'Os outros apenas observam.',
        '',
        'COMO SABER SE CONSERTOU:',
        'Console não mostra "Maximum call stack".',
        'Network mostra 1 POST e 1 GET apenas.'
      ].join('\n'); }
    },
    {
      re: /cors|405|403|method not allowed/i,
      explain: function() { return [
        'PROBLEMA SIMPLES:',
        'O servidor não está deixando a chamada passar.',
        '',
        'CAUSA PROVÁVEL:',
        'O método usado (POST, GET) não é aceito nessa rota.',
        'Ou o servidor não tem CORS configurado para esse domínio.',
        '',
        'O QUE FAZER:',
        'Checar se o endpoint aceita o método certo.',
        'Checar se o Worker/Cloudflare está repasando a rota.',
        '',
        'COMO SABER SE CONSERTOU:',
        'Chamada retorna 200, não 405 ou 403.',
        'Sem erro de CORS no console.'
      ].join('\n'); }
    },
    {
      re: /imagem|image|src|unsplash|placeholder|fallback/i,
      explain: function() { return [
        'PROBLEMA SIMPLES:',
        'A imagem errada está aparecendo no lugar da certa.',
        '',
        'CAUSA PROVÁVEL:',
        'O código ainda aponta para um link antigo (ex: Unsplash).',
        'O arquivo correto existe mas o código não usa ele.',
        '',
        'O QUE FAZER:',
        'Trocar o src da imagem para o arquivo correto.',
        'Fazer deploy e confirmar no DOM que o src mudou.',
        '',
        'COMO SABER SE CONSERTOU:',
        'Inspecionar o elemento no browser.',
        'O src deve mostrar o arquivo correto, não o Unsplash.'
      ].join('\n'); }
    },
    {
      re: /deploy|cloudflare|pages|404|cache/i,
      explain: function() { return [
        'PROBLEMA SIMPLES:',
        'O código novo não chegou ao servidor ainda.',
        '',
        'CAUSA PROVÁVEL:',
        'O deploy não subiu, ou o cache do Cloudflare guarda a versão velha.',
        '',
        'O QUE FAZER:',
        '1. Confirmar que o deploy foi feito (ver hash no Cloudflare Pages).',
        '2. Abrir o hash novo (não o domínio principal).',
        '3. Se ainda errado, limpar cache ou forçar re-deploy.',
        '',
        'COMO SABER SE CONSERTOU:',
        'Abrir a URL do hash novo.',
        'Ver que o erro sumiu nesse hash específico.'
      ].join('\n'); }
    },
    {
      re: /pass gold|passgold|report.*vazio|incomplete/i,
      explain: function() { return [
        'PROBLEMA SIMPLES:',
        'O sistema está dizendo que tudo deu certo, mas sem provar.',
        '',
        'O QUE ESTÁ ERRADO:',
        'O relatório final aparece com PASS GOLD mas campos como',
        '"Projeto", "Causa raiz" e "Arquivos alterados" estão vazios.',
        'Isso é falso positivo — o sistema mentiu.',
        '',
        'A REGRA:',
        'Sem evidência real = INCOMPLETE, não GOLD.',
        'Promotion Allowed = NÃO enquanto faltar prova.',
        '',
        'COMO SABER SE CONSERTOU:',
        'Relatório só mostra PASS GOLD quando os campos estão preenchidos.',
        'Se estiver vazio, aparece INCOMPLETE.'
      ].join('\n'); }
    }
  ];

  function explainCaveman(input) {
    for (var i = 0; i < CAVEMAN_PATTERNS.length; i++) {
      if (CAVEMAN_PATTERNS[i].re.test(input)) {
        return CAVEMAN_PATTERNS[i].explain();
      }
    }
    /* Fallback genérico */
    return [
      'PROBLEMA:',
      'Ainda estou analisando o contexto. Pode detalhar?',
      '',
      'PRÓXIMO PASSO:',
      'Cole o erro exato, a URL ou o comportamento esperado.',
      'Ou clique EXECUTAR MISSÃO para eu diagnosticar automaticamente.'
    ].join('\n');
  }

  /* ── DETECTAR INTENÇÃO (modo Auto) ── */
  var MISSION_KEYWORDS = /corrigir|corrig|fix|bug|erro|error|deploy|imagem|image|cors|405|crash|loop|stack|falhou|quebrado|não funciona|not working|diagnos|pipeline|sddf|missão|mission|patch|rollback|github|pr\b/i;

  function detectMode(text) {
    var m = state.mode;
    if (m !== 'auto') return m;
    if (MISSION_KEYWORDS.test(text)) return 'missao';
    return 'conversa';
  }

  /* ── SEND (botão ENVIAR) ── */
  async function handleSend() {
    var input = $('v298Prompt');
    if (!input) return;
    var text = input.value.trim();
    if (!text) return;

    addMessage('user', text, 'VOCÊ');
    input.value = '';

    var mode = detectMode(text);

    /* Modo Caveman */
    if (mode === 'caveman') {
      var explanation = await sendCopilot(text, 'caveman').catch(function() { return null; });
      if (!explanation) explanation = explainCaveman(text);
      addMessage('bot', explanation, 'CAVEMAN');
      return;
    }

    /* Modo Missão → preparar plano, não executar */
    if (mode === 'missao') {
      var planReply = await sendCopilot(text, 'mission-plan').catch(function() { return null; });
      if (!planReply) planReply = 'Entendido. Analisei o problema. Clique EXECUTAR MISSÃO quando estiver pronto para iniciar o pipeline SDDF.';
      addMessage('bot', planReply, 'SDDF');
      /* Pré-preencher o input com o texto para facilitar execução */
      input.value = text;
      state.history.push({ role: 'user', content: text });
      state.history.push({ role: 'assistant', content: planReply });
      return;
    }

    /* Modo Conversa (default) */
    var reply = await sendCopilot(text, 'general').catch(function() { return null; });
    if (!reply) reply = 'Copilot indisponível. Verifique a conexão com o backend.';
    addMessage('bot', reply, 'COPILOT');
    state.history.push({ role: 'user', content: text });
    state.history.push({ role: 'assistant', content: reply });
  }

  /* ── EXECUTAR MISSÃO (botão EXECUTAR MISSÃO) ── */
  function handleRun() {
    var input = $('v298Prompt');
    var text  = input ? input.value.trim() : '';
    if (!text) { addMessage('system', 'Digite a missão antes de executar.', 'SYSTEM'); return; }

    addMessage('user', 'MISSÃO: ' + text, 'VOCÊ');
    if (input) input.value = '';

    /* Sincronizar com #missionText legado */
    var mt = $('missionText');
    if (mt) mt.value = text;

    /* Chamar o runtime owner */
    if (typeof window.__VRO_RUN_MISSION__ === 'function') {
      window.__VRO_RUN_MISSION__(text);
    } else {
      /* Fallback: disparar executeBtn */
      var execBtn = $('executeBtn');
      if (execBtn) { setTimeout(function() { execBtn.click(); }, 50); }
      else { addMessage('error', 'Runtime owner não carregou.', 'SYSTEM'); }
    }
  }

  /* ── CLEAR ── */
  function handleClear() {
    var stream = $('v298ChatStream');
    if (!stream) return;
    stream.innerHTML = '<div class="v298-empty-hint">Sessão limpa. Converse, peça diagnóstico ou execute uma missão SDDF.</div>';
    state.history = [];
    state.files   = [];
    var fn = $('v298FileNote');
    if (fn) fn.textContent = 'Nenhum arquivo anexado.';
  }

  /* ── BUILD UI ── */
  function buildUI() {
    var mission = $('mission');
    if (!mission || $('v298CommandChat')) return;

    var oldText  = $('missionText');
    var initText = oldText ? oldText.value : '';

    var shell = document.createElement('div');
    shell.id        = 'v298CommandChat';
    shell.className = 'v298-command-chat';

    shell.innerHTML = [
      '<div class="v298-command-head">',
        '<div class="v298-command-title">',
          '<strong>VISION AI COMMAND</strong>',
          '<span>Chat universal + correção de projetos com PASS GOLD</span>',
        '</div>',
        '<div class="v298-command-status" id="v298CommandStatus">READY</div>',
      '</div>',

      '<div class="v298-chat-stream" id="v298ChatStream">',
        '<div class="v298-empty-hint">Vision Core pronto. Converse, pergunte, cole erros ou execute uma missão SDDF.</div>',
      '</div>',

      '<div class="v298-composer">',
        '<div class="v298-input-wrap">',
          '<textarea class="v298-input" id="v298Prompt" placeholder="Pergunte, cole erro/log, descreva o problema... Enter = enviar, Shift+Enter = quebrar linha">',
            (initText || ''),
          '</textarea>',
          '<div class="v298-send-stack">',
            '<button class="v298-send" id="v298SendBtn" type="button">ENVIAR</button>',
            '<button class="v298-run"  id="v298RunBtn"  type="button">EXECUTAR MISSÃO</button>',
          '</div>',
        '</div>',

        '<div class="v298-tool-row">',
          '<span class="vui-mode-label">Modo:</span>',
          '<button class="vui-mode-btn active" data-mode="auto"      type="button">Auto</button>',
          '<button class="vui-mode-btn"        data-mode="conversa"  type="button">Conversa</button>',
          '<button class="vui-mode-btn"        data-mode="missao"    type="button">Missão SDDF</button>',
          '<button class="vui-mode-btn"        data-mode="caveman"   type="button">🪨 Caveman</button>',
          '<button class="v298-tool-btn"       id="v298AddFilesBtn"  type="button">＋ Arquivos</button>',
          '<button class="v298-tool-btn"       id="v298ClearBtn"     type="button">Limpar</button>',
          '<input type="file" id="v298FileInput" multiple hidden>',
        '</div>',
        '<div class="v298-file-note" id="v298FileNote">Nenhum arquivo anexado.</div>',
      '</div>'
    ].join('');

    /* Inserir no painel */
    var tl = mission.querySelector('.v236-compact-timeline');
    var ps = mission.querySelector('.vc-process-screen');
    if (tl) tl.insertAdjacentElement('afterend', shell);
    else if (ps) ps.insertAdjacentElement('beforebegin', shell);
    else mission.appendChild(shell);

    /* Esconder controles legados */
    if (ps) ps.style.display = 'none';
    if (oldText) oldText.style.display = 'none';
    var ar = mission.querySelector('.v236-action-row');
    if (ar) ar.style.display = 'none';

    /* Bind eventos */
    $('v298SendBtn').onclick = handleSend;
    $('v298RunBtn').onclick  = handleRun;
    $('v298ClearBtn').onclick = handleClear;

    $('v298Prompt').addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    });

    /* Botões de modo */
    shell.querySelectorAll('.vui-mode-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        shell.querySelectorAll('.vui-mode-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        state.mode = btn.dataset.mode;
      });
    });

    /* File input */
    $('v298AddFilesBtn').onclick = function() { $('v298FileInput').click(); };
    $('v298FileInput').onchange  = function(e) {
      state.files = Array.from(e.target.files || []);
      var fn = $('v298FileNote');
      if (fn) fn.textContent = state.files.length
        ? 'Arquivos: ' + state.files.map(function(f) { return f.name; }).join(' • ')
        : 'Nenhum arquivo anexado.';
      if (state.files.length) addMessage('system', state.files.length + ' arquivo(s) adicionados.', 'SYSTEM');
    };

    console.log('[VUI] Vision AI Command UI v8.2 carregada');
  }

  document.addEventListener('DOMContentLoaded', buildUI);

})();
