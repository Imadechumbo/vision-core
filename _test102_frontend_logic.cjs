// Mock minimal de browser para testar a lógica pura das funções adicionadas no bundle
const elements = {};
function mockEl(id) {
  if (!elements[id]) elements[id] = { id, innerHTML: '', textContent: '', children: [], classList: { _set: new Set(), toggle(c){ this._set.has(c) ? this._set.delete(c) : this._set.add(c); }, contains(c){ return this._set.has(c); } }, appendChild(child){ this.children.push(child); this.innerHTML += child.innerHTML || ''; }, addEventListener(){} };
  return elements[id];
}
global.document = {
  getElementById: (id) => mockEl(id),
  createElement: (tag) => ({ tag, innerHTML: '', className: '', appendChild(c){ this.innerHTML += c.innerHTML||''; } })
};
let store = {};
global.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = v; },
  removeItem: (k) => { delete store[k]; }
};
global.sessionStorage = { getItem: () => null };
global.fetch = () => Promise.resolve({ ok: false }); // sem backend disponível neste teste

// ---- código copiado exatamente do patch aplicado no bundle.js ----
var MISSION_HISTORY_CACHE_KEY = 'vc_mission_timeline_cache';
var _missionHistoryCache = [];

function _escapeHtml98e(s) {
  return String(s || '').replace(/[&<>"]/g, function (c) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
  });
}

function _loadMissionHistoryCache() {
  try {
    var raw = localStorage.getItem(MISSION_HISTORY_CACHE_KEY);
    _missionHistoryCache = raw ? JSON.parse(raw) : [];
  } catch (e) { _missionHistoryCache = []; }
}

function _saveMissionHistoryCache() {
  try { localStorage.setItem(MISSION_HISTORY_CACHE_KEY, JSON.stringify(_missionHistoryCache.slice(0, 30))); } catch (e) {}
}

function renderMissionHistory() {
  var list  = document.getElementById('v298MissionHistoryList');
  var count = document.getElementById('v298MissionHistoryCount');
  if (!list) return;
  if (!_missionHistoryCache.length) {
    list.innerHTML = '<div class="v298-mission-history-empty">Nenhuma missão ainda. Converse ou execute uma missão — fica salvo aqui.</div>';
    if (count) count.textContent = '';
    return;
  }
  if (count) count.textContent = _missionHistoryCache.length + ' ' + (_missionHistoryCache.length > 1 ? 'missões' : 'missão');
  list.innerHTML = '';
  _missionHistoryCache.forEach(function (item) {
    var row = document.createElement('div');
    row.className = 'v298-mh-item';
    var dotClass = item.pass_gold === true ? 'ok' : (item.status === 'FAIL' ? 'fail' : (item.status === 'ANSWERED' ? 'ok' : 'wait'));
    var when = '';
    try { when = new Date(item.ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch (e) { when = ''; }
    row.innerHTML =
      '<span class="v298-mh-dot ' + dotClass + '"></span>' +
      '<div class="v298-mh-body">' +
        '<div class="v298-mh-input">' + _escapeHtml98e((item.input || '').slice(0, 90)) + '</div>' +
        '<div class="v298-mh-meta">' + when + ' · ' + (item.source || 'chat') + (item.status ? ' · ' + item.status : '') + '</div>' +
      '</div>';
    list.appendChild(row);
  });
}

function recordMissionTimelineEntry(entry) {
  _missionHistoryCache.unshift({
    ts: Date.now(),
    source: entry.source || 'chat',
    input: entry.input || '',
    summary: entry.summary || null,
    status: entry.status || 'DONE',
    pass_gold: entry.pass_gold === true
  });
  _missionHistoryCache = _missionHistoryCache.slice(0, 30);
  _saveMissionHistoryCache();
  renderMissionHistory();
}
// ---- fim do código copiado ----

let failures = 0;
function check(name, cond) {
  console.log((cond ? 'PASS' : 'FAIL') + ' - ' + name);
  if (!cond) failures++;
}

// 1) estado vazio inicial
_loadMissionHistoryCache();
renderMissionHistory();
check('lista vazia mostra empty-state', mockEl('v298MissionHistoryList').innerHTML.indexOf('Nenhuma missão ainda') !== -1);

// 2) registrar uma entrada normal de chat
recordMissionTimelineEntry({ source: 'chat', input: 'como funciona o PASS GOLD?', summary: 'PASS GOLD é o gate final...', status: 'ANSWERED' });
check('cache tem 1 entrada', _missionHistoryCache.length === 1);
check('persistiu no localStorage', JSON.parse(localStorage.getItem(MISSION_HISTORY_CACHE_KEY)).length === 1);
check('render mostra o texto da missão', mockEl('v298MissionHistoryList').innerHTML.indexOf('como funciona o PASS GOLD') !== -1);
check('contador mostra 1 missão', mockEl('v298MissionHistoryCount').textContent === '1 missão');

// 3) XSS — input malicioso deve ser escapado
recordMissionTimelineEntry({ source: 'chat', input: '<img src=x onerror=alert(1)>', status: 'ANSWERED' });
check('input com HTML é escapado (sem <img> crudo)', mockEl('v298MissionHistoryList').innerHTML.indexOf('<img src=x') === -1);
check('versão escapada está presente', mockEl('v298MissionHistoryList').innerHTML.indexOf('&lt;img') !== -1);

// 4) ordem: mais recente primeiro (unshift)
check('nova entrada vai pro topo do array', _missionHistoryCache[0].input.indexOf('img') !== -1);

// 5) cap de 30 entradas
for (let i = 0; i < 35; i++) recordMissionTimelineEntry({ source: 'chat', input: 'msg ' + i, status: 'ANSWERED' });
check('cache nunca passa de 30 entradas', _missionHistoryCache.length === 30);
check('localStorage também respeita o cap de 30', JSON.parse(localStorage.getItem(MISSION_HISTORY_CACHE_KEY)).length === 30);

// 6) status PASS_GOLD / FAIL refletem no dot (checagem indireta via classe no innerHTML)
_missionHistoryCache = [];
recordMissionTimelineEntry({ source: 'run-live', input: 'missao pass gold', pass_gold: true, status: 'PASS_GOLD' });
check('dot classe ok para pass_gold true', mockEl('v298MissionHistoryList').innerHTML.indexOf('v298-mh-dot ok') !== -1);
_missionHistoryCache = [];
recordMissionTimelineEntry({ source: 'run-live', input: 'missao que falhou', status: 'FAIL' });
check('dot classe fail para status FAIL', mockEl('v298MissionHistoryList').innerHTML.indexOf('v298-mh-dot fail') !== -1);

console.log('');
console.log(failures === 0 ? '=== TODOS OS TESTES DO FRONTEND PASSARAM ===' : `=== ${failures} TESTE(S) FALHARAM ===`);
process.exit(failures > 0 ? 1 : 0);
