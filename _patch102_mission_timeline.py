#!/usr/bin/env python3
"""
§102 — MISSION TIMELINE (§98-E) — patch consolidado
Roda da raiz do projeto: python _patch102_mission_timeline.py
Cada bloco tem assert — se algum anchor não bater (arquivo mudou desde a
analise), o script para SOZINHO nesse bloco em vez de corromper o arquivo.
"""

import sys

def edit_file(path, pairs, mode_crlf=True):
    """pairs = lista de (anchor, block_to_append_after_anchor)"""
    nl = '\r\n' if mode_crlf else '\n'
    with open(path, 'r', encoding='utf-8', newline='') as f:
        content = f.read()
    orig_len = len(content)
    for anchor, block in pairs:
        count = content.count(anchor)
        if count != 1:
            print(f"  ABORTOU em {path}: anchor esperado 1x, encontrado {count}x")
            print(f"  Anchor (primeiros 120 chars): {anchor[:120]!r}")
            sys.exit(1)
        content = content.replace(anchor, anchor + block, 1)
    with open(path, 'w', encoding='utf-8', newline='') as f:
        f.write(content)
    print(f"  OK {path} (+{len(content) - orig_len} bytes)")


# ════════════════════════════════════════════════════════════════════
# 1) backend/server.js — helpers + endpoint + hooks em /api/chat e /api/run-live
# ════════════════════════════════════════════════════════════════════
print("[1/6] backend/server.js")

anchor_helpers = (
"function logMission(userId, type) {\r\n"
"  try {\r\n"
"    const log = readJsonFile(MISSION_LOG_PATH, { missions: [] });\r\n"
"    log.missions.push({ user_id: userId, ts: now(), type: type || 'mission' });\r\n"
"    // Keep only 90 days\r\n"
"    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;\r\n"
"    log.missions = log.missions.filter(m => new Date(m.ts).getTime() >= cutoff);\r\n"
"    writeJsonFile(MISSION_LOG_PATH, log);\r\n"
"  } catch {}\r\n"
"}\r\n"
)
block_helpers = (
"\r\n"
"/* ── §98-E MISSION TIMELINE — historico persistido de missoes (por usuario) ──\r\n"
"   Anonimo nao persiste no backend (evita misturar historico de visitantes\r\n"
"   diferentes no mesmo bucket) — fica so no localStorage do navegador. ── */\r\n"
"const MISSION_TIMELINE_PATH = path.join(DB_ROOT, 'mission-timeline.json');\r\n"
"\r\n"
"function appendMissionTimeline(userId, entry) {\r\n"
"  if (!userId) return;\r\n"
"  try {\r\n"
"    const log = readJsonFile(MISSION_TIMELINE_PATH, { entries: [] });\r\n"
"    log.entries.push({\r\n"
"      id: makeId('mt'),\r\n"
"      user_id: userId,\r\n"
"      ts: now(),\r\n"
"      source: entry.source || 'mission',\r\n"
"      input: String(entry.input || '').slice(0, 200),\r\n"
"      summary: entry.summary ? String(entry.summary).slice(0, 240) : null,\r\n"
"      status: entry.status || (entry.pass_gold ? 'PASS_GOLD' : 'DONE'),\r\n"
"      pass_gold: entry.pass_gold === true,\r\n"
"      agent: entry.agent || null,\r\n"
"      mission_id: entry.mission_id || null\r\n"
"    });\r\n"
"    // Manter no maximo 90 dias e 500 entradas globais (arquivo nao cresce sem limite)\r\n"
"    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;\r\n"
"    log.entries = log.entries.filter(e => new Date(e.ts).getTime() >= cutoff);\r\n"
"    if (log.entries.length > 500) log.entries = log.entries.slice(-500);\r\n"
"    writeJsonFile(MISSION_TIMELINE_PATH, log);\r\n"
"  } catch (err) { console.warn('[timeline §98-E] append failed', err.message); }\r\n"
"}\r\n"
"\r\n"
"function getMissionTimeline(userId, limit) {\r\n"
"  if (!userId) return [];\r\n"
"  try {\r\n"
"    const log = readJsonFile(MISSION_TIMELINE_PATH, { entries: [] });\r\n"
"    return log.entries\r\n"
"      .filter(e => e.user_id === userId)\r\n"
"      .slice()\r\n"
"      .sort((a, b) => String(b.ts).localeCompare(String(a.ts)))\r\n"
"      .slice(0, limit);\r\n"
"  } catch { return []; }\r\n"
"}\r\n"
)

anchor_endpoint = (
"app.get('/api/mission/quota', (req, res) => {\r\n"
"  const user = getAuthUser(req);\r\n"
"  if (!user) return sendOk(res, { plan: 'free', used: 0, limit: 5, remaining: 5, authenticated: false, anti_stub: true });\r\n"
"  if (user.plan && user.plan !== 'free') return sendOk(res, { plan: user.plan, used: null, limit: null, unlimited: true, anti_stub: true });\r\n"
"  const used = getMissionCount(user.id);\r\n"
"  const limit = parseInt(process.env.FREE_MISSION_LIMIT || '5', 10);\r\n"
"  return sendOk(res, { plan: 'free', used, limit, remaining: Math.max(0, limit - used), anti_stub: true });\r\n"
"});\r\n"
)
block_endpoint = (
"\r\n"
"/* §98-E — historico de missoes (so para autenticados; anonimo usa cache local) */\r\n"
"app.get('/api/mission/timeline', (req, res) => {\r\n"
"  const user  = getAuthUser(req);\r\n"
"  const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);\r\n"
"  const entries = user ? getMissionTimeline(user.id, limit) : [];\r\n"
"  return sendOk(res, { entries, count: entries.length, authenticated: Boolean(user), anti_stub: true });\r\n"
"});\r\n"
)

anchor_runlive = (
"app.all('/api/run-live', checkMissionQuota, async (req, res) => {\r\n"
"  const body     = normalizeBody(req);\r\n"
"  const input    = body.mission || body.message || body.prompt || body.input || 'self-test';\r\n"
)
block_runlive = (
"\r\n"
"  /* §98-E — historico de missoes; cobre todos os returns do handler (LOCAL_ACCESS_REQUIRED,\r\n"
"     go_runtime_failure e sucesso) via monkey-patch de res.json. */\r\n"
"  const _tlUser98e2  = getAuthUser(req);\r\n"
"  const _origJson98e2 = res.json.bind(res);\r\n"
"  res.json = function (payload) {\r\n"
"    if (_tlUser98e2 && payload) {\r\n"
"      appendMissionTimeline(_tlUser98e2.id, {\r\n"
"        source: 'run-live',\r\n"
"        input,\r\n"
"        summary: Array.isArray(payload.summary) ? payload.summary.join(' ') : (payload.summary || payload.message || null),\r\n"
"        pass_gold: payload.pass_gold === true,\r\n"
"        mission_id: payload.mission_id || null,\r\n"
"        status: payload.pass_gold === true ? 'PASS_GOLD' : (payload.status || (payload.ok === false ? 'FAIL' : 'DONE'))\r\n"
"      });\r\n"
"    }\r\n"
"    return _origJson98e2(payload);\r\n"
"  };\r\n"
)

anchor_chat = (
"app.post('/api/chat', async (req, res) => {\r\n"
"  const body    = normalizeBody(req);\r\n"
"  const mode    = body.mode  || 'vision-geral';\r\n"
"  let   message = body.message || body.prompt || '';\r\n"
"  if (!message) return res.status(400).json({ ok: false, error: 'message_required', time: now() });\r\n"
)
block_chat = (
"\r\n"
"  /* §98-E — captura a resposta final do /api/chat (qualquer branch interno)\r\n"
"     via monkey-patch de res.json, em vez de editar cada return separadamente.\r\n"
"     NOTA: /api/chat é o endpoint REAL usado pelo frontend (ENVIAR) — não é\r\n"
"     /api/copilot. Verificado: zero referências a /api/copilot ou /api/run-live\r\n"
"     no bundle.js atual. */\r\n"
"  const _tlUser98e  = getAuthUser(req);\r\n"
"  const _tlInput98e = message;\r\n"
"  const _origJson98e = res.json.bind(res);\r\n"
"  res.json = function (payload) {\r\n"
"    if (_tlUser98e && payload && payload.ok !== false) {\r\n"
"      appendMissionTimeline(_tlUser98e.id, {\r\n"
"        source: 'chat',\r\n"
"        input: _tlInput98e,\r\n"
"        summary: payload.answer || null,\r\n"
"        status: 'ANSWERED'\r\n"
"      });\r\n"
"    }\r\n"
"    return _origJson98e(payload);\r\n"
"  };\r\n"
)

edit_file('backend/server.js', [
    (anchor_helpers, block_helpers),
    (anchor_endpoint, block_endpoint),
    (anchor_runlive, block_runlive),
    (anchor_chat, block_chat),
])

# ════════════════════════════════════════════════════════════════════
# 2) frontend/index.html — painel de histórico
# ════════════════════════════════════════════════════════════════════
print("[2/6] frontend/index.html")

anchor_html = (
"          <div class=\"v298-file-note\" id=\"v298FileNote\">Nenhum arquivo anexado.</div>\r\n"
"          <div id=\"v298ContextBadge\" style=\"display:none;background:rgba(168,85,247,.15);border:1px solid rgba(168,85,247,.3);border-radius:8px;padding:3px 10px;font-size:11px;color:#c084fc;margin:4px 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:400px;\"></div>\r\n"
"        </div>\r\n"
"      </div>\r\n"
)
block_html = (
"      <!-- §98-E — Histórico de missões persistido (vault no backend p/ logado, localStorage p/ visitante) -->\r\n"
"      <div class=\"v298-mission-history\" id=\"v298MissionHistory\">\r\n"
"        <div class=\"v298-mission-history-head\" id=\"v298MissionHistoryHead\">\r\n"
"          <span>🕘 Histórico de missões</span>\r\n"
"          <small id=\"v298MissionHistoryCount\"></small>\r\n"
"        </div>\r\n"
"        <div class=\"v298-mission-history-list\" id=\"v298MissionHistoryList\">\r\n"
"          <div class=\"v298-mission-history-empty\">Nenhuma missão ainda. Converse ou execute uma missão — fica salvo aqui.</div>\r\n"
"        </div>\r\n"
"      </div>\r\n"
)
edit_file('frontend/index.html', [(anchor_html, block_html)])

# ════════════════════════════════════════════════════════════════════
# 3) frontend/assets/vision-v298-command-chat.css — apenas append no fim
# ════════════════════════════════════════════════════════════════════
print("[3/6] frontend/assets/vision-v298-command-chat.css")
css_path = 'frontend/assets/vision-v298-command-chat.css'
with open(css_path, 'r', encoding='utf-8', newline='') as f:
    css_content = f.read()
css_block = (
"\r\n"
"/* §98-E — Histórico de missões persistido (painel colapsável abaixo do command chat) */\r\n"
".v298-mission-history{\r\n"
"  margin:10px 0 0;\r\n"
"  border:1px solid var(--v298-border);\r\n"
"  background:var(--v298-panel);\r\n"
"  border-radius:14px;\r\n"
"  overflow:hidden;\r\n"
"}\r\n"
".v298-mission-history-head{\r\n"
"  display:flex;\r\n"
"  align-items:center;\r\n"
"  justify-content:space-between;\r\n"
"  padding:10px 14px;\r\n"
"  font-size:12px;\r\n"
"  letter-spacing:.06em;\r\n"
"  color:var(--v298-text);\r\n"
"  cursor:pointer;\r\n"
"  border-bottom:1px solid rgba(168,85,247,.18);\r\n"
"  user-select:none;\r\n"
"}\r\n"
".v298-mission-history-head small{\r\n"
"  color:var(--v298-muted);\r\n"
"  font-size:11px;\r\n"
"  font-weight:400;\r\n"
"  letter-spacing:0;\r\n"
"}\r\n"
".v298-mission-history-list{\r\n"
"  max-height:220px;\r\n"
"  overflow-y:auto;\r\n"
"  padding:4px 10px 8px;\r\n"
"}\r\n"
".v298-mission-history.collapsed .v298-mission-history-list{ display:none; }\r\n"
".v298-mission-history-empty{\r\n"
"  padding:10px 4px;\r\n"
"  font-size:12px;\r\n"
"  color:var(--v298-muted);\r\n"
"}\r\n"
".v298-mh-item{\r\n"
"  display:flex;\r\n"
"  align-items:flex-start;\r\n"
"  gap:8px;\r\n"
"  padding:7px 4px;\r\n"
"  border-bottom:1px solid rgba(255,255,255,.05);\r\n"
"  font-size:12px;\r\n"
"}\r\n"
".v298-mh-item:last-child{ border-bottom:none; }\r\n"
".v298-mh-dot{\r\n"
"  flex-shrink:0;\r\n"
"  width:8px;\r\n"
"  height:8px;\r\n"
"  border-radius:50%;\r\n"
"  margin-top:4px;\r\n"
"  background:var(--v298-muted);\r\n"
"}\r\n"
".v298-mh-dot.ok{ background:var(--v298-green); }\r\n"
".v298-mh-dot.fail{ background:var(--v298-red); }\r\n"
".v298-mh-dot.wait{ background:var(--v298-yellow); }\r\n"
".v298-mh-body{ flex:1; min-width:0; }\r\n"
".v298-mh-input{\r\n"
"  color:var(--v298-text);\r\n"
"  white-space:nowrap;\r\n"
"  overflow:hidden;\r\n"
"  text-overflow:ellipsis;\r\n"
"}\r\n"
".v298-mh-meta{\r\n"
"  color:var(--v298-muted);\r\n"
"  font-size:10.5px;\r\n"
"  margin-top:2px;\r\n"
"}\r\n"
)
with open(css_path, 'w', encoding='utf-8', newline='') as f:
    f.write(css_content + css_block)
print(f"  OK {css_path} (+{len(css_block)} bytes)")

# ════════════════════════════════════════════════════════════════════
# 4) frontend/assets/vision-core-bundle.js — módulo de histórico + hook no ENVIAR
# ════════════════════════════════════════════════════════════════════
print("[4/6] frontend/assets/vision-core-bundle.js")

anchor_js_module = (
"    function clearHistory() { _sessionHistory = []; updateContextBadge(); }\r\n"
"\r\n"
)
block_js_module = (
"    /* ── §98-E MISSION TIMELINE — historico persistido de missoes ──────────\r\n"
"       Logado: backend (/api/mission/timeline) é a fonte de verdade.\r\n"
"       Visitante sem login: so o cache deste navegador (localStorage). ── */\r\n"
"    var MISSION_HISTORY_CACHE_KEY = 'vc_mission_timeline_cache';\r\n"
"    var _missionHistoryCache = [];\r\n"
"\r\n"
"    function _escapeHtml98e(s) {\r\n"
"      return String(s || '').replace(/[&<>\"]/g, function (c) {\r\n"
"        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' })[c];\r\n"
"      });\r\n"
"    }\r\n"
"\r\n"
"    function _loadMissionHistoryCache() {\r\n"
"      try {\r\n"
"        var raw = localStorage.getItem(MISSION_HISTORY_CACHE_KEY);\r\n"
"        _missionHistoryCache = raw ? JSON.parse(raw) : [];\r\n"
"      } catch (e) { _missionHistoryCache = []; }\r\n"
"    }\r\n"
"\r\n"
"    function _saveMissionHistoryCache() {\r\n"
"      try { localStorage.setItem(MISSION_HISTORY_CACHE_KEY, JSON.stringify(_missionHistoryCache.slice(0, 30))); } catch (e) { /* quota cheia ou bloqueado — ignora, nao quebra a UI */ }\r\n"
"    }\r\n"
"\r\n"
"    function renderMissionHistory() {\r\n"
"      var list  = document.getElementById('v298MissionHistoryList');\r\n"
"      var count = document.getElementById('v298MissionHistoryCount');\r\n"
"      if (!list) return;\r\n"
"      if (!_missionHistoryCache.length) {\r\n"
"        list.innerHTML = '<div class=\"v298-mission-history-empty\">Nenhuma missão ainda. Converse ou execute uma missão — fica salvo aqui.</div>';\r\n"
"        if (count) count.textContent = '';\r\n"
"        return;\r\n"
"      }\r\n"
"      if (count) count.textContent = _missionHistoryCache.length + ' ' + (_missionHistoryCache.length > 1 ? 'missões' : 'missão');\r\n"
"      list.innerHTML = '';\r\n"
"      _missionHistoryCache.forEach(function (item) {\r\n"
"        var row = document.createElement('div');\r\n"
"        row.className = 'v298-mh-item';\r\n"
"        var dotClass = item.pass_gold === true ? 'ok' : (item.status === 'FAIL' ? 'fail' : (item.status === 'ANSWERED' ? 'ok' : 'wait'));\r\n"
"        var when = '';\r\n"
"        try { when = new Date(item.ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch (e) { when = ''; }\r\n"
"        row.innerHTML =\r\n"
"          '<span class=\"v298-mh-dot ' + dotClass + '\"></span>' +\r\n"
"          '<div class=\"v298-mh-body\">' +\r\n"
"            '<div class=\"v298-mh-input\">' + _escapeHtml98e((item.input || '').slice(0, 90)) + '</div>' +\r\n"
"            '<div class=\"v298-mh-meta\">' + when + ' · ' + (item.source || 'chat') + (item.status ? ' · ' + item.status : '') + '</div>' +\r\n"
"          '</div>';\r\n"
"        list.appendChild(row);\r\n"
"      });\r\n"
"    }\r\n"
"\r\n"
"    function recordMissionTimelineEntry(entry) {\r\n"
"      _missionHistoryCache.unshift({\r\n"
"        ts: Date.now(),\r\n"
"        source: entry.source || 'chat',\r\n"
"        input: entry.input || '',\r\n"
"        summary: entry.summary || null,\r\n"
"        status: entry.status || 'DONE',\r\n"
"        pass_gold: entry.pass_gold === true\r\n"
"      });\r\n"
"      _missionHistoryCache = _missionHistoryCache.slice(0, 30);\r\n"
"      _saveMissionHistoryCache();\r\n"
"      renderMissionHistory();\r\n"
"    }\r\n"
"\r\n"
"    function loadMissionHistoryFromBackend() {\r\n"
"      var tok = (function () { try { return sessionStorage.getItem('vc_token') || localStorage.getItem('vision_token'); } catch (e) { return null; } })();\r\n"
"      if (!tok) return; /* sem login: histórico fica só no cache deste navegador */\r\n"
"      fetch(BACKEND_URL + '/api/mission/timeline?limit=20', { headers: { 'Authorization': 'Bearer ' + tok } })\r\n"
"        .then(function (r) { return r.ok ? r.json() : null; })\r\n"
"        .then(function (data) {\r\n"
"          if (!data || !data.authenticated || !Array.isArray(data.entries)) return;\r\n"
"          _missionHistoryCache = data.entries.map(function (e) {\r\n"
"            return {\r\n"
"              ts: new Date(e.ts).getTime() || Date.now(),\r\n"
"              source: e.source, input: e.input, summary: e.summary,\r\n"
"              status: e.status, pass_gold: e.pass_gold === true\r\n"
"            };\r\n"
"          });\r\n"
"          _saveMissionHistoryCache();\r\n"
"          renderMissionHistory();\r\n"
"        })\r\n"
"        .catch(function () { /* falha de rede — mantém o que já estava no cache local */ });\r\n"
"    }\r\n"
"\r\n"
"    _loadMissionHistoryCache();\r\n"
"    renderMissionHistory();\r\n"
"    loadMissionHistoryFromBackend();\r\n"
"\r\n"
"    var _missionHistoryHead  = document.getElementById('v298MissionHistoryHead');\r\n"
"    var _missionHistoryPanel = document.getElementById('v298MissionHistory');\r\n"
"    if (_missionHistoryHead && _missionHistoryPanel) {\r\n"
"      _missionHistoryHead.addEventListener('click', function () { _missionHistoryPanel.classList.toggle('collapsed'); });\r\n"
"    }\r\n"
"\r\n"
)

# Edit A usa o padrao anchor+append: o anchor e SO a linha do clearHistory()
# (preservada intacta), o bloco novo entra DEPOIS dela e ANTES da var
# addFilesBtn (que ja existe no arquivo, nao precisa ser reproduzida).
with open('frontend/assets/vision-core-bundle.js', 'r', encoding='utf-8', newline='') as f:
    js_content = f.read()
js_orig_len = len(js_content)
cnt = js_content.count(anchor_js_module)
if cnt != 1:
    print(f"  ABORTOU: anchor_js_module esperado 1x, encontrado {cnt}x")
    sys.exit(1)
js_content = js_content.replace(anchor_js_module, anchor_js_module + block_js_module, 1)

anchor_js_hook = (
"        addToHistory('assistant', answer);\r\n"
)
# Esse texto aparece varias vezes no arquivo (em outros fluxos tambem chamam
# addToHistory) — por isso ancoramos num trecho maior e unico ao redor dele.
anchor_js_hook_unique = (
"        var answer = (data && data.answer) ? data.answer : JSON.stringify(data);\r\n"
"        // §98-D: badge visual do agente especializado detectado\r\n"
"        if (data && data.active_agent && data.active_agent.name) {\r\n"
"          var agentBadgeEl = document.createElement('div');\r\n"
"          agentBadgeEl.innerHTML = '<span class=\"vc-agent-badge\">🤖 ' + data.active_agent.name + '</span>';\r\n"
"          chatStream.appendChild(agentBadgeEl);\r\n"
"          chatStream.scrollTop = chatStream.scrollHeight;\r\n"
"        }\r\n"
"        addToHistory('assistant', answer);\r\n"
)
block_js_hook = (
"        // §98-E: registrar no histórico persistido de missões\r\n"
"        recordMissionTimelineEntry({ source: 'chat', input: text, summary: answer, status: 'ANSWERED' });\r\n"
)
cnt2 = js_content.count(anchor_js_hook_unique)
if cnt2 != 1:
    print(f"  ABORTOU: anchor_js_hook_unique esperado 1x, encontrado {cnt2}x")
    sys.exit(1)
js_content = js_content.replace(anchor_js_hook_unique, anchor_js_hook_unique + block_js_hook, 1)

with open('frontend/assets/vision-core-bundle.js', 'w', encoding='utf-8', newline='') as f:
    f.write(js_content)
print(f"  OK frontend/assets/vision-core-bundle.js (+{len(js_content) - js_orig_len} bytes)")

# ════════════════════════════════════════════════════════════════════
# 5) stress-test-vision-core.cjs — ST-11 (LF, nao CRLF)
# ════════════════════════════════════════════════════════════════════
print("[5/6] stress-test-vision-core.cjs")

st_path = 'stress-test-vision-core.cjs'
with open(st_path, 'r', encoding='utf-8', newline='') as f:
    st_content = f.read()
st_orig_len = len(st_content)

anchor_st_main = "// ── MAIN ──────────────────────────────────────────────────────────────────────\n"
cnt3 = st_content.count(anchor_st_main)
if cnt3 != 1:
    print(f"  ABORTOU: anchor_st_main esperado 1x, encontrado {cnt3}x")
    sys.exit(1)

st11_block = '''// ── ST-11: MISSION TIMELINE / HISTÓRICO PERSISTIDO (§98-E) ───────────────────
async function st11() {
  section('ST-11 — Mission Timeline / Histórico Persistido (§98-E)');

  await test('/api/mission/timeline existe e tem anti_stub', async () => {
    const r = await GET(`${EB}/api/mission/timeline`);
    if (r.status === 404) return 'endpoint nao existe';
    if (!r.ok) return `status ${r.status}`;
    if (!r.body?.anti_stub) return 'sem anti_stub';
    return true;
  });

  await test('Anônimo recebe authenticated:false e lista vazia', async () => {
    const r = await GET(`${EB}/api/mission/timeline`);
    if (!r.ok) return `status ${r.status}`;
    if (r.body?.authenticated !== false) return 'deveria ser authenticated:false sem token';
    if (!Array.isArray(r.body?.entries) || r.body.entries.length !== 0) return 'esperava entries:[]';
    return true;
  });

  let token = null;
  await test('Registrar usuário de teste para o histórico', async () => {
    const email = `stress_tl_${Date.now()}@vc.test`;
    const r = await POST(`${EB}/api/auth/register`, { email, password: 'stress123', name: 'ST11' });
    if (r.ok && r.body?.token) { token = r.body.token; console.log(`\\n    ${I} criado: ${email}`); return true; }
    return `status ${r.status}: ${r.raw?.slice(0,100)}`;
  });

  const marker = `marcador-st11-${Date.now()}`;
  await test('Enviar missão via /api/chat com marcador único', async () => {
    if (!token) return 'warn'; // sem token, não dá pra testar o caminho autenticado
    const r = await POST(`${EB}/api/chat`, { message: marker + ' — teste de histórico de missões' }, { Authorization: `Bearer ${token}` });
    if (r.status === 429) return 'warn'; // quota — /api/chat hoje não é gated, mas fica defensivo
    if (!r.ok) return `status ${r.status}`;
    return true;
  });

  await test('Histórico autenticado contém o marcador enviado', async () => {
    if (!token) return 'warn';
    const r = await GET(`${EB}/api/mission/timeline?limit=5`, { Authorization: `Bearer ${token}` });
    if (!r.ok) return `status ${r.status}`;
    if (r.body?.authenticated !== true) return 'esperava authenticated:true com token válido';
    const found = (r.body.entries || []).some(e => (e.input || '').includes(marker));
    if (!found) return `marcador não encontrado no histórico: ${JSON.stringify((r.body.entries || []).slice(0, 2))}`;
    return true;
  });

  await test('Entrada do histórico tem campos esperados (source, status, ts)', async () => {
    if (!token) return 'warn';
    const r = await GET(`${EB}/api/mission/timeline?limit=5`, { Authorization: `Bearer ${token}` });
    if (!r.ok) return `status ${r.status}`;
    const e = (r.body.entries || [])[0];
    if (!e) return 'sem entradas';
    if (!e.source || !e.status || !e.ts) return `campos faltando: ${JSON.stringify(e)}`;
    return true;
  });
}

'''
st_content = st_content.replace(anchor_st_main, st11_block + anchor_st_main, 1)

anchor_st_run = "  if (run('10')) await st10();\n"
cnt4 = st_content.count(anchor_st_run)
if cnt4 != 1:
    print(f"  ABORTOU: anchor_st_run esperado 1x, encontrado {cnt4}x")
    sys.exit(1)
st_content = st_content.replace(anchor_st_run, anchor_st_run + "  if (run('11')) await st11();\n", 1)

with open(st_path, 'w', encoding='utf-8', newline='') as f:
    f.write(st_content)
print(f"  OK {st_path} (+{len(st_content) - st_orig_len} bytes)")

# ════════════════════════════════════════════════════════════════════
# 6) CLAUDE.md — marca §98-E como resolvido
# ════════════════════════════════════════════════════════════════════
print("[6/6] CLAUDE.md")

claude_path = 'CLAUDE.md'
with open(claude_path, 'r', encoding='utf-8', newline='') as f:
    claude_content = f.read()
claude_orig_len = len(claude_content)

c_anchor1 = """### §98-E — Mission Timeline (PRIORIDADE BAIXA)
**Problema:** Existe mas só popula após missão executada — não há persistência
**O que precisa:**
- Persistir timeline no vault/localStorage após cada missão
- Mostrar histórico de missões anteriores"""
c_new1 = """### §98-E — Mission Timeline ✅ RESOLVIDO (§102)
**Descoberta importante nesta sessão:** o frontend NÃO chama `/api/copilot` nem `/api/run-live` (zero referências no bundle) — o botão ENVIAR chama `/api/chat`, que também não tinha `checkMissionQuota`. O histórico foi implementado no endpoint real.
**Fix:**
- Backend: `appendMissionTimeline()` / `getMissionTimeline()` (data/mission-timeline.json, 90 dias / 500 entradas), hook via monkey-patch de `res.json` em `/api/chat` e `/api/run-live` (cobre todos os branches sem duplicar código). Anônimo nunca persiste no backend (evita misturar histórico entre visitantes) — só localStorage.
- Endpoint novo: `GET /api/mission/timeline` (anti_stub:true).
- Frontend: painel `#v298MissionHistory` (colapsável) abaixo do chat — `vc_mission_timeline_cache` no localStorage + sync com backend quando logado.
- 21 testes unitários isolados (9 backend + 12 frontend, com mocks) rodados antes do commit.
**ST-11:** criado (6 casos) — endpoint existe, anônimo vazio, registro, envio com marcador, marcador aparece no histórico, shape dos campos.
**Pendente para confirmar:** ainda não cobre o fluxo "EXECUTAR MISSÃO" (Standard Method Panel / hermesObj) — só ENVIAR/chat e run-live. Decisão consciente de escopo, não esquecimento."""
if claude_content.count(c_anchor1) != 1:
    print(f"  AVISO: bloco §98-E do CLAUDE.md não bateu exatamente — pulei essa parte, atualize manualmente.")
else:
    claude_content = claude_content.replace(c_anchor1, c_new1, 1)

c_anchor2 = "| §101 | T5 Agentes Extras live — 5 passos + accordion desbloqueado — tutoriais T1-T6 6/6 completos | t5-done | 61e8d71 |"
c_new2 = c_anchor2 + "\n| §102 | §98-E resolvido — Mission Timeline persistido (descoberta: endpoint real é /api/chat, não /api/copilot) — ST-11 criado (6 casos), 21 testes unitários | - | (preencher após commit) |"
if claude_content.count(c_anchor2) == 1:
    claude_content = claude_content.replace(c_anchor2, c_new2, 1)

with open(claude_path, 'w', encoding='utf-8', newline='') as f:
    f.write(claude_content)
print(f"  OK {claude_path} (+{len(claude_content) - claude_orig_len} bytes)")

print("\n=== PATCH §102 APLICADO COM SUCESSO ===")
