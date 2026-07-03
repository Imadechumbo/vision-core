const fs = require('fs');
const path = require('path');
const os = require('os');

const DB_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'vc98e-'));
const MISSION_TIMELINE_PATH = path.join(DB_ROOT, 'mission-timeline.json');

function now() { return new Date().toISOString(); }
function makeId(p) { return `${p}_${Date.now()}_${Math.random().toString(16).slice(2,6)}`; }
function readJsonFile(file, fallback) { try { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback; } catch { return fallback; } }
function writeJsonFile(file, data) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8'); }

// ---- código copiado exatamente do patch aplicado ----
function appendMissionTimeline(userId, entry) {
  if (!userId) return;
  try {
    const log = readJsonFile(MISSION_TIMELINE_PATH, { entries: [] });
    log.entries.push({
      id: makeId('mt'),
      user_id: userId,
      ts: now(),
      source: entry.source || 'mission',
      input: String(entry.input || '').slice(0, 200),
      summary: entry.summary ? String(entry.summary).slice(0, 240) : null,
      status: entry.status || (entry.pass_gold ? 'PASS_GOLD' : 'DONE'),
      pass_gold: entry.pass_gold === true,
      agent: entry.agent || null,
      mission_id: entry.mission_id || null
    });
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
    log.entries = log.entries.filter(e => new Date(e.ts).getTime() >= cutoff);
    if (log.entries.length > 500) log.entries = log.entries.slice(-500);
    writeJsonFile(MISSION_TIMELINE_PATH, log);
  } catch (err) { console.warn('[timeline §98-E] append failed', err.message); }
}

function getMissionTimeline(userId, limit) {
  if (!userId) return [];
  try {
    const log = readJsonFile(MISSION_TIMELINE_PATH, { entries: [] });
    return log.entries
      .filter(e => e.user_id === userId)
      .slice()
      .sort((a, b) => String(b.ts).localeCompare(String(a.ts)))
      .slice(0, limit);
  } catch { return []; }
}
// ---- fim do código copiado ----

let failures = 0;
function check(name, cond) {
  console.log((cond ? 'PASS' : 'FAIL') + ' - ' + name);
  if (!cond) failures++;
}

// 1) anônimo nunca persiste
appendMissionTimeline(null, { source: 'chat', input: 'anon msg' });
check('anonimo nao grava nada', getMissionTimeline(null, 10).length === 0 && !fs.existsSync(MISSION_TIMELINE_PATH));

// 2) usuário real grava e lê de volta
appendMissionTimeline('user_A', { source: 'chat', input: 'oi, como funciona o pass gold?', summary: 'PASS GOLD é o gate final...' , status: 'ANSWERED'});
appendMissionTimeline('user_A', { source: 'run-live', input: 'corrigir bug X', pass_gold: true, mission_id: 'm1' });
appendMissionTimeline('user_B', { source: 'chat', input: 'mensagem de outro usuario' });

const a = getMissionTimeline('user_A', 10);
check('user_A tem 2 entradas', a.length === 2);
check('isolamento entre usuarios (user_A nao ve user_B)', a.every(e => e.user_id === 'user_A'));
check('ordem desc (mais recente primeiro)', a[0].source === 'run-live' && a[1].source === 'chat');
check('pass_gold true preservado', a[0].pass_gold === true && a[0].status === 'PASS_GOLD');
check('truncamento de input em 200 chars', a[1].input.length <= 200);

const b = getMissionTimeline('user_B', 10);
check('user_B isolado, ve só a propria entrada', b.length === 1 && b[0].user_id === 'user_B');

const c = getMissionTimeline('user_C_inexistente', 10);
check('usuario sem missoes retorna lista vazia', c.length === 0);

// 3) limite (cap de 500 e 90 dias) - simular entrada antiga manualmente
const old = readJsonFile(MISSION_TIMELINE_PATH, { entries: [] });
old.entries.push({ id: 'mt_old', user_id: 'user_old', ts: new Date(Date.now() - 100*24*60*60*1000).toISOString(), source: 'chat', input: 'muito antigo' });
writeJsonFile(MISSION_TIMELINE_PATH, old);
appendMissionTimeline('user_A', { source: 'chat', input: 'gatilho de limpeza de cutoff' }); // dispara o filtro de 90 dias
const afterCutoff = readJsonFile(MISSION_TIMELINE_PATH, { entries: [] });
check('entrada com +90 dias é removida no próximo append', !afterCutoff.entries.some(e => e.id === 'mt_old'));

console.log('');
console.log(failures === 0 ? '=== TODOS OS TESTES PASSARAM ===' : `=== ${failures} TESTE(S) FALHARAM ===`);
process.exit(failures > 0 ? 1 : 0);
