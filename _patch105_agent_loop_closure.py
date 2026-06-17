#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
§105 — FECHAR O LOOP: Chat -> Mission Queue -> Vision Agent Local -> Patch Real -> Push/Revert
================================================================================
Implementa o item #1 do roadmap de about.html ("Fechar o loop VISION AI COMMAND
-> mission queue -> Agent Local -> patch real"). As tres pecas (chat diagnostica,
agent-local aplica patch com backup+rollback, /api/agent/mission/push+revert)
ja existiam isoladas. Faltava o fio:
  1. backend: /api/agent/mission/queue descartava file/patch/fix_type/diagnosis
     quando type=apply_patch -> o agent nunca recebia o que aplicar de verdade.
  2. backend: /api/agent/status sempre retornava connected:false hardcoded (stub
     sem anti_stub:true) -> frontend nao tinha como saber se o agent local
     estava de fato rodando antes de tentar usa-lo.
  3. frontend: renderApplyFixPanel só oferecia "baixar arquivo corrigido"
     (aplicado no lado do servidor, em memoria) - nunca enfileirava apply_patch
     para o agent local. renderValidationPanel (push/revert) já existia mas
     NUNCA era chamada em lugar nenhum do bundle - codigo morto.
  4. agent (vision-agent.js): NENHUMA mudanca necessaria - applyPatchMission()
     ja suporta type=apply_patch com backup .vision-bak + git commit + rollback
     via validatePatch(). So precisava receber os campos certos.

Cada bloco tem assert proprio - se o arquivo já mudou desde a analise, o script
para nesse bloco especifico e avisa, em vez de corromper o arquivo (mesmo padrao
de _patch102/_patch104).

Uso:
    python3 _patch105_agent_loop_closure.py
"""
import sys

TOUCHED = []


def patch_file(path, replacements, label):
    with open(path, "rb") as f:
        content = f.read()
    for i, (old, new, tag) in enumerate(replacements):
        count = content.count(old)
        if count == 0:
            print(f"[FALHA] {label} bloco {tag}: texto original NAO encontrado.")
            print("        O arquivo pode ja ter sido alterado. Abortando sem tocar em nada.")
            sys.exit(1)
        if count > 1:
            print(f"[FALHA] {label} bloco {tag}: texto original aparece {count}x (esperado 1x).")
            print("        Ancora ambigua - abortando para nao aplicar no lugar errado.")
            sys.exit(1)
        content = content.replace(old, new, 1)
    with open(path, "wb") as f:
        f.write(content)
    TOUCHED.append(path)
    print(f"[OK] {label} — {len(replacements)} bloco(s) aplicados.")


def main():
    # ── 1/2 — backend/server.js ────────────────────────────────────────────
    backend_replacements = []

    # Bloco A — agent/register, /heartbeat, /report, /status: anti_stub +
    # rastreamento real de presenca (_agentLastSeenAt) em vez de connected:false fixo.
    old_a = (
        b"app.all('/api/agent/register', (req, res) => sendOk(res, { agent_id: makeId('agent'), status: 'registered' }));\r\n"
        b"app.all('/api/agent/heartbeat', (req, res) => sendOk(res, { status: 'online' }));\r\n"
        b"app.all('/api/agent/report', (req, res) => sendOk(res, { received: true, pass_gold: Boolean(normalizeBody(req).pass_gold) }));\r\n"
        b"app.get('/api/agent/status', (req, res) => sendOk(res, { connected: false, mode: 'download_ready' }));\r\n"
    )
    new_a = (
        b"/* \xc2\xa7105: timestamp do ultimo poll real do Vision Agent Local (heartbeat OU /mission/pending) */\r\n"
        b"let _agentLastSeenAt = 0;\r\n"
        b"app.all('/api/agent/register', (req, res) => sendOk(res, { agent_id: makeId('agent'), status: 'registered', anti_stub: true }));\r\n"
        b"app.all('/api/agent/heartbeat', (req, res) => { _agentLastSeenAt = Date.now(); return sendOk(res, { status: 'online', anti_stub: true }); });\r\n"
        b"app.all('/api/agent/report', (req, res) => sendOk(res, { received: true, pass_gold: Boolean(normalizeBody(req).pass_gold), anti_stub: true }));\r\n"
        b"app.get('/api/agent/status', (req, res) => {\r\n"
        b"  /* \xc2\xa7105: connected real (era hardcoded false antes) \xe2\x80\x94 agent considerado online se fez */\r\n"
        b"  /* poll em /mission/pending ou heartbeat nos ultimos 15s (3x o VC_POLL_MS padrao de 3000ms) */\r\n"
        b"  const lastSeenMsAgo = _agentLastSeenAt ? (Date.now() - _agentLastSeenAt) : null;\r\n"
        b"  const connected     = lastSeenMsAgo !== null && lastSeenMsAgo < 15000;\r\n"
        b"  return sendOk(res, { connected, last_seen_ms_ago: lastSeenMsAgo, mode: connected ? 'connected' : 'download_ready', anti_stub: true });\r\n"
        b"});\r\n"
    )
    backend_replacements.append((old_a, new_a, "A (agent status real)"))

    # Bloco B — /api/agent/mission/queue: preservar file/patch/fix_type/diagnosis
    # quando type=apply_patch (antes eram descartados). /mission/pending: marcar
    # presenca do agent a cada poll real (sinal mais confiavel que heartbeat,
    # porque o agent sempre faz polling, com ou sem heartbeat explicito).
    old_b = (
        b"app.post('/api/agent/mission/queue', (req, res) => {\r\n"
        b"  const body    = normalizeBody(req);\r\n"
        b"  const mission = {\r\n"
        b"    id:        `mission_${Date.now()}_${Math.random().toString(16).slice(2,6)}`,\r\n"
        b"    input:     body.input || body.message || '',\r\n"
        b"    type:      body.type  || 'general',\r\n"
        b"    queued_at: now()\r\n"
        b"  };\r\n"
        b"  _agentQueue.push(mission);\r\n"
        b"  return sendOk(res, { mission_id: mission.id, queued: true, queue_length: _agentQueue.length });\r\n"
        b"});\r\n"
        b"\r\n"
        b"app.get('/api/agent/mission/pending', (req, res) => {\r\n"
        b"  const mission = _agentQueue.shift();\r\n"
        b"  return sendOk(res, { mission: mission || null, queue_remaining: _agentQueue.length });\r\n"
        b"});\r\n"
    )
    new_b = (
        b"app.post('/api/agent/mission/queue', (req, res) => {\r\n"
        b"  const body    = normalizeBody(req);\r\n"
        b"  const type    = body.type || 'general';\r\n"
        b"  const mission = {\r\n"
        b"    id:        `mission_${Date.now()}_${Math.random().toString(16).slice(2,6)}`,\r\n"
        b"    input:     body.input || body.message || '',\r\n"
        b"    type:      type,\r\n"
        b"    queued_at: now()\r\n"
        b"  };\r\n"
        b"  /* \xc2\xa7105: apply_patch carrega o patch ja diagnosticado pelo chat \xe2\x80\x94 sem isso o */\r\n"
        b"  /* agent local nao tem o que aplicar (campos eram descartados antes desta sessao) */\r\n"
        b"  if (type === 'apply_patch') {\r\n"
        b"    if (!body.file || !body.patch) {\r\n"
        b"      return res.status(400).json({ ok: false, error: 'apply_patch_requires_file_and_patch', time: now() });\r\n"
        b"    }\r\n"
        b"    mission.file      = body.file;\r\n"
        b"    mission.patch     = body.patch;\r\n"
        b"    mission.fix_type  = body.fix_type  || 'code_patch';\r\n"
        b"    mission.diagnosis = body.diagnosis || '';\r\n"
        b"  }\r\n"
        b"  _agentQueue.push(mission);\r\n"
        b"  return sendOk(res, { mission_id: mission.id, queued: true, queue_length: _agentQueue.length, type: mission.type });\r\n"
        b"});\r\n"
        b"\r\n"
        b"app.get('/api/agent/mission/pending', (req, res) => {\r\n"
        b"  _agentLastSeenAt = Date.now(); /* \xc2\xa7105: todo poll real atualiza presenca p/ /api/agent/status */\r\n"
        b"  const mission = _agentQueue.shift();\r\n"
        b"  return sendOk(res, { mission: mission || null, queue_remaining: _agentQueue.length });\r\n"
        b"});\r\n"
    )
    backend_replacements.append((old_b, new_b, "B (queue+pending real fields)"))

    patch_file("backend/server.js", backend_replacements, "backend/server.js")

    # ── 2/2 — frontend/assets/vision-core-bundle.js ────────────────────────
    frontend_replacements = []

    old_c = (
        b"      var applyBtn  = mkBtn('\xe2\x9c\x85 Aplicar e Baixar Arquivo Corrigido', '#0a2a1a', '#22c55e', '#86efac');\r\n"
        b"      var cancelBtn = mkBtn('\xe2\x9c\x96 Ignorar', '#1c1c1e', '#555', '#888');\r\n"
    )
    new_c = (
        b"      var applyBtn  = mkBtn('\xe2\x9c\x85 Aplicar e Baixar Arquivo Corrigido', '#0a2a1a', '#22c55e', '#86efac');\r\n"
        b"      var agentBtn  = mkBtn('\xf0\x9f\x93\xa1 Aplicar no Vision Agent Local', '#0a1a2a', '#3b82f6', '#93c5fd'); /* \xc2\xa7105 */\r\n"
        b"      var cancelBtn = mkBtn('\xe2\x9c\x96 Ignorar', '#1c1c1e', '#555', '#888');\r\n"
    )
    frontend_replacements.append((old_c, new_c, "C (agentBtn declarado)"))

    old_d = (
        b"      cancelBtn.onclick = function() { wrap.remove(); };\r\n"
        b"\r\n"
        b"      row.appendChild(applyBtn);\r\n"
        b"      row.appendChild(cancelBtn);\r\n"
        b"      wrap.appendChild(row);\r\n"
        b"      return wrap;\r\n"
        b"    }\r\n"
    )
    new_d = (
        b"      /* \xc2\xa7105 \xe2\x80\x94 fecha o loop: enfileira apply_patch real para o Vision Agent Local, */\r\n"
        b"      /* aguarda o agent aplicar no disco (backup .vision-bak + git commit) e renderiza */\r\n"
        b"      /* o painel de aprovar push / reverter (renderValidationPanel \xe2\x80\x94 existia desde antes */\r\n"
        b"      /* mas nunca era chamada em lugar nenhum do bundle, era codigo morto). */\r\n"
        b"      agentBtn.onclick = function() {\r\n"
        b"        var _dec105 = hermesObj.decisao;\r\n"
        b"        if (_dec105 === 'BLOCKED_INPUT' || _dec105 === 'BLOCKED_RUNTIME' || _dec105 === 'ABORTED') {\r\n"
        b"          statusEl.textContent = '\xe2\x9a\xa0\xef\xb8\x8f Diagn\xc3\xb3stico ' + _dec105 + ' \xe2\x80\x94 patch n\xc3\xa3o dispon\xc3\xadvel para o agent local.';\r\n"
        b"          return;\r\n"
        b"        }\r\n"
        b"        if (!hermesObj.patch || !hermesObj.file) { statusEl.textContent = '\xe2\x9d\x8c Patch ou arquivo ausente no diagn\xc3\xb3stico.'; return; }\r\n"
        b"\r\n"
        b"        function _resetBtns105() {\r\n"
        b"          applyBtn.disabled = false; agentBtn.disabled = false; cancelBtn.disabled = false;\r\n"
        b"          agentBtn.textContent = '\xf0\x9f\x93\xa1 Aplicar no Vision Agent Local';\r\n"
        b"        }\r\n"
        b"\r\n"
        b"        applyBtn.disabled = true; agentBtn.disabled = true; cancelBtn.disabled = true;\r\n"
        b"        agentBtn.textContent = '\xe2\x8f\xb3 Verificando Vision Agent Local...';\r\n"
        b"        statusEl.textContent = 'Consultando /api/agent/status...';\r\n"
        b"\r\n"
        b"        fetch(BACKEND_URL + '/api/agent/status').then(function(r) { return r.json(); }).then(function(st) {\r\n"
        b"          if (!st || !st.connected) {\r\n"
        b"            statusEl.innerHTML = '\xe2\x9a\xa0\xef\xb8\x8f Vision Agent Local n\xc3\xa3o detectado (sem poll nos \xc3\xbaltimos 15s). ' +\r\n"
        b"              '<a href=\"https://visioncoreai.pages.dev/landing.html#agent\" target=\"_blank\" style=\"color:#93c5fd;\">Baixe e abra o Vision Agent</a> na m\xc3\xa1quina onde est\xc3\xa1 o projeto, depois clique novamente.';\r\n"
        b"            _resetBtns105();\r\n"
        b"            return;\r\n"
        b"          }\r\n"
        b"\r\n"
        b"          agentBtn.textContent = '\xe2\x8f\xb3 Enfileirando miss\xc3\xa3o...';\r\n"
        b"          statusEl.textContent = 'Vision Agent Local ativo \xe2\x80\x94 enviando patch para fila...';\r\n"
        b"\r\n"
        b"          fetch(BACKEND_URL + '/api/agent/mission/queue', {\r\n"
        b"            method: 'POST', headers: { 'Content-Type': 'application/json' },\r\n"
        b"            body: JSON.stringify({ type: 'apply_patch', file: hermesObj.file, patch: hermesObj.patch, fix_type: hermesObj.fix_type || 'code_patch', diagnosis: hermesObj.diagnosis || 'vision fix' })\r\n"
        b"          }).then(function(r) { return r.ok ? r.json() : r.json().then(function(e) { throw new Error(e.error || ('HTTP ' + r.status)); }); })\r\n"
        b"          .then(function(qd) {\r\n"
        b"            if (!qd.ok || !qd.mission_id) throw new Error(qd.error || 'queue_failed');\r\n"
        b"            var missionId105 = qd.mission_id;\r\n"
        b"            agentBtn.textContent = '\xe2\x8f\xb3 Aguardando Vision Agent Local processar...';\r\n"
        b"            statusEl.textContent = 'Miss\xc3\xa3o ' + missionId105 + ' enfileirada \xe2\x80\x94 aguardando o agent aplicar no disco real (at\xc3\xa9 30s)...';\r\n"
        b"\r\n"
        b"            var tries105 = 0, maxTries105 = 15; /* \xc2\xa714.4 spec: 2s * 15 = 30s */\r\n"
        b"            function pollResult105() {\r\n"
        b"              tries105++;\r\n"
        b"              fetch(BACKEND_URL + '/api/agent/mission/result/' + missionId105)\r\n"
        b"                .then(function(rr) { return rr.status === 404 ? null : rr.json(); })\r\n"
        b"                .then(function(rd) {\r\n"
        b"                  if (rd && rd.mission_id) {\r\n"
        b"                    wrap.remove();\r\n"
        b"                    chatStream.appendChild(renderValidationPanel(rd));\r\n"
        b"                    chatStream.scrollTop = chatStream.scrollHeight;\r\n"
        b"                    setStatus('READY');\r\n"
        b"                    return;\r\n"
        b"                  }\r\n"
        b"                  if (tries105 >= maxTries105) {\r\n"
        b"                    statusEl.innerHTML = '\xe2\x8f\xb1 Vision Agent Local n\xc3\xa3o respondeu em 30s. Confirme se est\xc3\xa1 rodando ' +\r\n"
        b"                      '(<code>node vision-agent.js .</code> ou app instalado) e ' +\r\n"
        b"                      '<a href=\"#\" id=\"vcRetryAgentPoll105\" style=\"color:#93c5fd;\">clique para continuar aguardando</a>.';\r\n"
        b"                    var _retry105 = document.getElementById('vcRetryAgentPoll105');\r\n"
        b"                    if (_retry105) { _retry105.onclick = function(e) { e.preventDefault(); tries105 = 0; statusEl.textContent = 'Retomando espera por miss\xc3\xa3o ' + missionId105 + '...'; pollResult105(); }; }\r\n"
        b"                    _resetBtns105();\r\n"
        b"                    return;\r\n"
        b"                  }\r\n"
        b"                  setTimeout(pollResult105, 2000);\r\n"
        b"                })\r\n"
        b"                .catch(function() { setTimeout(pollResult105, 2000); });\r\n"
        b"            }\r\n"
        b"            pollResult105();\r\n"
        b"          })\r\n"
        b"          .catch(function(err) {\r\n"
        b"            statusEl.textContent = '\xe2\x9d\x8c ' + (err.message || 'Erro ao enfileirar miss\xc3\xa3o.');\r\n"
        b"            _resetBtns105();\r\n"
        b"          });\r\n"
        b"        }).catch(function() {\r\n"
        b"          statusEl.textContent = '\xe2\x9d\x8c Erro de rede ao consultar /api/agent/status.';\r\n"
        b"          _resetBtns105();\r\n"
        b"        });\r\n"
        b"      };\r\n"
        b"\r\n"
        b"      cancelBtn.onclick = function() { wrap.remove(); };\r\n"
        b"\r\n"
        b"      row.appendChild(applyBtn);\r\n"
        b"      row.appendChild(agentBtn);\r\n"
        b"      row.appendChild(cancelBtn);\r\n"
        b"      wrap.appendChild(row);\r\n"
        b"      return wrap;\r\n"
        b"    }\r\n"
    )
    frontend_replacements.append((old_d, new_d, "D (agentBtn.onclick + wiring)"))

    patch_file("frontend/assets/vision-core-bundle.js", frontend_replacements, "frontend/assets/vision-core-bundle.js")

    print("")
    print("=== PATCH \xc2\xa7105 APLICADO COM SUCESSO ===")
    for p in TOUCHED:
        print(" - " + p)


if __name__ == "__main__":
    main()
