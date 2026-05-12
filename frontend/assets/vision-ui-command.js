/* V8.3.1 — exact Gold command panel, clean runtime only
 * - Recreates approved v298/v299 command UI without loading legacy runtimes
 * - Runtime execution remains owned by vision-runtime-owner.js via #executeBtn
 */
(function(){
  'use strict';
  if (window.__VISION_UI_COMMAND_V831__) return;
  window.__VISION_UI_COMMAND_V831__ = true;

  function $(id){ return document.getElementById(id); }
  function q(sel, root){ return (root || document).querySelector(sel); }

  var state = { files: [], streaming: true };

  function addMsg(role, text){
    var stream = $('v298ChatStream');
    if (!stream) return;
    var hint = stream.querySelector('.v298-empty-hint');
    if (hint) hint.remove();
    var row = document.createElement('div');
    row.className = 'v298-msg v298-msg-' + (role || 'system');
    row.textContent = String(text || '');
    stream.appendChild(row);
    stream.scrollTop = stream.scrollHeight;
  }

  function setStatus(text){
    var el = $('v298CommandStatus');
    if (el) el.textContent = String(text || 'READY').toUpperCase();
  }

  function getText(){
    var prompt = $('v298Prompt');
    if (prompt) return prompt.value || '';
    var legacy = $('missionText');
    return legacy ? (legacy.value || '') : '';
  }

  function syncLegacyText(){
    var legacy = $('missionText');
    var prompt = $('v298Prompt');
    if (legacy && prompt) legacy.value = prompt.value || '';
  }

  function runMission(){
    var text = getText().trim();
    if (!text) {
      addMsg('system', 'Descreva a missão antes de executar.');
      return;
    }
    syncLegacyText();
    setStatus('RUNNING');

    var legacyRun = $('executeBtn');
    if (legacyRun) legacyRun.click();
    else if (typeof window.__VRO_RUN_MISSION__ === 'function') window.__VRO_RUN_MISSION__(text);
  }

  function sendChat(){
    var text = getText().trim();
    if (!text) {
      addMsg('system', 'Cole um erro, log, pergunta ou missão para eu analisar.');
      return;
    }
    addMsg('user', text);
    addMsg('assistant', 'Recebido. Para executar como missão SDDF, clique EXECUTAR MISSÃO.');
  }

  function fileLabel(){
    var note = $('v298FileNote');
    if (!note) return;
    note.textContent = state.files.length ? state.files.map(function(f){ return f.name; }).join(', ') : 'Nenhum arquivo anexado.';
  }

  function buildCommandChat(){
    var mission = $('mission');
    if (!mission || $('v298CommandChat')) return;

    var oldText = $('missionText');
    var initialText = oldText ? oldText.value : '';

    var shell = document.createElement('div');
    shell.className = 'v298-command-chat';
    shell.id = 'v298CommandChat';
    shell.innerHTML = '' +
      '<div class="v298-command-head">' +
        '<div class="v298-command-title">' +
          '<strong>VISION AI COMMAND</strong>' +
          '<span>Chat universal + correção de projetos com PASS GOLD</span>' +
        '</div>' +
        '<div class="v298-command-status" id="v298CommandStatus">READY</div>' +
      '</div>' +
      '<div class="v298-chat-stream" id="v298ChatStream">' +
        '<div class="v298-empty-hint">Vision AI pronto. Converse sobre qualquer assunto, cole erros, envie arquivos/imagens ou execute uma missão SDDF.</div>' +
      '</div>' +
      '<div class="v298-composer">' +
        '<div class="v298-input-wrap">' +
          '<textarea class="v298-input" id="v298Prompt" placeholder="Pergunte qualquer coisa, cole erro, log, código... Enter = enviar, Shift+Enter = quebrar linha"></textarea>' +
          '<div class="v298-send-stack">' +
            '<button class="v298-send" id="v298SendBtn" type="button">ENVIAR</button>' +
            '<button class="v298-run" id="v298RunBtn" type="button">EXECUTAR MISSÃO</button>' +
          '</div>' +
        '</div>' +
        '<div class="v298-tool-row">' +
          '<div id="v299QuotaBadge" class="v299-quota-badge"><span class="v299-plan-tag free">FREE</span><span class="v299-quota-ok">limitado</span></div>' +
          '<button class="v298-tool-btn" id="v298AddFilesBtn" type="button">＋ Adicionar arquivos</button>' +
          '<button class="v298-tool-btn" id="v298ReadPrintBtn" type="button">▧ Ler print/imagem</button>' +
          '<select class="v298-select" id="v298Mode">' +
            '<option value="vision-geral">Vision geral</option>' +
            '<option value="corrigir-projeto">Corrigir projeto</option>' +
            '<option value="debug-cors">Debug CORS</option>' +
            '<option value="explicar-leigo">Explicar para leigo</option>' +
            '<option value="rodar-sddf">Rodar SDDF</option>' +
            '<option value="analisar-imagem">Analisar print/imagem</option>' +
            '<option value="analisar-projeto">Analisar projeto ZIP</option>' +
            '<option value="hermes-rca">Hermes RCA profundo</option>' +
          '</select>' +
          '<select class="v298-select" id="v298Model">' +
            '<option value="auto">Modelo automático</option>' +
            '<option value="claude-sonnet">Claude Sonnet</option>' +
            '<option value="gemini-flash">Gemini Flash</option>' +
            '<option value="groq-llama">Groq/Llama</option>' +
            '<option value="ollama-local">Ollama Local</option>' +
          '</select>' +
          '<select class="v298-select" id="v298Streaming">' +
            '<option value="on">Streaming ligado</option>' +
            '<option value="off">Streaming desligado</option>' +
          '</select>' +
          '<button class="v298-tool-btn" id="v298ClearBtn" type="button">Limpar sessão</button>' +
          '<button class="v298-tool-btn v299-config-btn" id="v299ConfigBtn" type="button">⚙ Configurar IA</button>' +
          '<button class="v298-tool-btn v299-obsidian-btn" id="v299ObsidianBtn" type="button">📓 Obsidian</button>' +
          '<button class="v298-tool-btn v299-agent-btn" id="v299AgentBtn" type="button">⬇ Baixar Agent</button>' +
          '<input type="file" id="v298FileInput" multiple hidden>' +
        '</div>' +
        '<div class="v298-file-note" id="v298FileNote">Nenhum arquivo anexado.</div>' +
      '</div>';

    var timeline = mission.querySelector('.v236-compact-timeline');
    var processScreen = mission.querySelector('.vc-process-screen');
    if (timeline) timeline.insertAdjacentElement('afterend', shell);
    else if (processScreen) processScreen.insertAdjacentElement('beforebegin', shell);
    else mission.insertBefore(shell, mission.firstChild);

    var prompt = $('v298Prompt');
    if (prompt) prompt.value = initialText || '';

    // Hide old Gold/legacy controls while preserving them for runtime compatibility.
    if (processScreen) processScreen.style.display = 'none';
    if (oldText) oldText.style.display = 'none';
    var oldActionRow = mission.querySelector('.v236-action-row');
    if (oldActionRow) oldActionRow.style.display = 'none';
    var legacyRows = mission.querySelectorAll('.vui-mode-row,.vui-toolbar,.v82-command-tools,.v82-mode-row');
    legacyRows.forEach(function(el){ el.style.display = 'none'; });

    var send = $('v298SendBtn'); if (send) send.onclick = sendChat;
    var run = $('v298RunBtn'); if (run) run.onclick = runMission;
    var clear = $('v298ClearBtn'); if (clear) clear.onclick = function(){ var s=$('v298ChatStream'); if(s) s.innerHTML='<div class="v298-empty-hint">Vision AI pronto. Converse sobre qualquer assunto, cole erros, envie arquivos/imagens ou execute uma missão SDDF.</div>'; setStatus('READY'); };
    var add = $('v298AddFilesBtn'); if (add) add.onclick = function(){ var inp=$('v298FileInput'); if(inp) inp.click(); };
    var read = $('v298ReadPrintBtn'); if (read) read.onclick = function(){ addMsg('system','Anexe ou cole um print/imagem e descreva o que precisa analisar.'); var inp=$('v298FileInput'); if(inp) inp.click(); };
    var inp = $('v298FileInput'); if (inp) inp.onchange = function(){ state.files = Array.from(inp.files || []); fileLabel(); };
    var stream = $('v298Streaming'); if (stream) stream.onchange = function(){ state.streaming = stream.value === 'on'; };
    var cfg = $('v299ConfigBtn'); if (cfg) cfg.onclick = function(){ addMsg('system','Configurar IA: conecte providers no AI API Vault.'); };
    var obs = $('v299ObsidianBtn'); if (obs) obs.onclick = function(){ addMsg('system','Obsidian: vault local ainda aguardando conexão.'); };
    var agent = $('v299AgentBtn'); if (agent) agent.onclick = function(){ window.location.hash = 'agentDownload'; };

    if (prompt) {
      prompt.addEventListener('input', syncLegacyText);
      prompt.addEventListener('keydown', function(ev){
        if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); sendChat(); }
      });
    }

    window.__VISION_GET_CHAT_TEXT__ = function(){ return getText().trim(); };
    window.__VISION_GET_CHAT_MODE__ = function(){ return ($('v298Mode') && $('v298Mode').value) || 'vision-geral'; };
    window.__VISION_GET_CHAT_MODEL__ = function(){ return ($('v298Model') && $('v298Model').value) || 'auto'; };
  }

  function boot(){ buildCommandChat(); console.log('[VUI] Vision AI Command V8.3.1 exact gold UI loaded'); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
