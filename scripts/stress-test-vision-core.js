#!/usr/bin/env node
/**
 * stress-test-vision-core.js
 * Vision Core — Stress Test Automatizado (10 cenários) + Dashboard Web :3099
 * Executa: node scripts/stress-test-vision-core.js
 */

import { execSync }                     from 'child_process';
import { mkdirSync, existsSync }        from 'fs';
import { writeFile }                    from 'fs/promises';
import { join, dirname }                from 'path';
import { fileURLToPath }                from 'url';
import https                            from 'https';
import http                             from 'http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');
const PORT      = 3099;

// ── Global state (dashboard) ──────────────────────────────────────────────────
const state = {
  rodando:    true,
  total:      10,
  atual:      0,       // testes concluídos
  ativo:      null,    // ID do teste atual
  resultados: [],      // resultados finais
  log:        [],      // eventos em tempo real
  inicio:     new Date().toISOString(),
};

function addLog(msg) {
  state.log.push(`[${new Date().toLocaleTimeString('pt-BR')}] ${msg}`);
  if (state.log.length > 200) state.log.shift();
  console.log(msg);
}

// ── HTML dashboard ────────────────────────────────────────────────────────────
function buildHTML() {
  const pct       = Math.round((state.atual / state.total) * 100);
  const passes    = state.resultados.filter((r) => r.passou).length;
  const fails     = state.resultados.filter((r) => !r.passou).length;
  const completo  = !state.rodando;

  const diffColors = { EASY: '#22c55e', MEDIUM: '#f59e0b', HARD: '#f97316', EXPERT: '#ef4444' };

  const rowsHTML = state.resultados.map((r) => {
    const bg  = r.passou ? '#052e16' : '#450a0a';
    const col = r.passou ? '#4ade80' : '#f87171';
    const ico = r.passou ? '✅' : '❌';
    return `<tr style="background:${bg}">
      <td style="color:${diffColors[r.dificuldade]||'#fff'};font-weight:600">${r.id}</td>
      <td>${r.descricao.replace(/</g,'&lt;')}</td>
      <td style="color:${diffColors[r.dificuldade]}">${r.dificuldade}</td>
      <td style="color:${col};font-weight:700;font-size:1.1em">${ico} ${r.passou ? 'PASS' : 'FAIL'}</td>
      <td>${r.tempo_ms ? r.tempo_ms + 'ms' : r.erro ? '<span style="color:#f87171">ERRO</span>' : '—'}</td>
      <td style="font-size:0.8em;color:#94a3b8">${(r.palavras_encontradas||[]).join(', ') || '—'}</td>
    </tr>`;
  }).join('');

  // Pending rows (not yet run)
  const pendentes = SCENARIOS.slice(state.resultados.length).map((s) => {
    const isAtivo = s.id === state.ativo;
    const bg      = isAtivo ? '#1e3a5f' : '#0f172a';
    const label   = isAtivo ? '⏳ EM ANDAMENTO' : '⌛ aguardando';
    const col     = isAtivo ? '#fbbf24' : '#475569';
    return `<tr style="background:${bg}">
      <td style="color:${diffColors[s.dificuldade]||'#fff'};font-weight:600">${s.id}</td>
      <td>${s.descricao.replace(/</g,'&lt;')}</td>
      <td style="color:${diffColors[s.dificuldade]}">${s.dificuldade}</td>
      <td style="color:${col}">${label}</td>
      <td>—</td><td>—</td>
    </tr>`;
  }).join('');

  const logHTML = [...state.log].reverse().slice(0, 30).map((l) => {
    let col = '#94a3b8';
    if (l.includes('✅')) col = '#4ade80';
    if (l.includes('❌')) col = '#f87171';
    if (l.includes('⏳') || l.includes('Enviando')) col = '#fbbf24';
    return `<div style="color:${col};font-family:monospace;font-size:0.78em;padding:1px 0">${l.replace(/</g,'&lt;')}</div>`;
  }).join('');

  const statusBanner = completo
    ? `<div style="background:#052e16;border:2px solid #22c55e;border-radius:10px;padding:18px;text-align:center;margin-bottom:20px">
         <div style="font-size:2em;margin-bottom:6px">✅ COMPLETO</div>
         <div style="color:#86efac">Relatório salvo em <strong>docs/STRESS-TEST-RESULTS.md</strong></div>
         <div style="margin-top:10px;color:#4ade80">Taxa de acerto: <strong>${Math.round((passes/state.total)*100)}%</strong> &nbsp;|&nbsp; ${passes} PASS &nbsp;|&nbsp; ${fails} FAIL</div>
       </div>`
    : `<div style="background:#1e1b4b;border:1px solid #4338ca;border-radius:8px;padding:12px;text-align:center;margin-bottom:20px">
         <div style="color:#a5b4fc;font-size:0.9em">🔄 RODANDO — atualiza a cada 2s</div>
         ${state.ativo ? `<div style="color:#fbbf24;margin-top:4px">⏳ Atual: ${state.ativo}</div>` : ''}
       </div>`;

  const refresh = completo ? '' : '<meta http-equiv="refresh" content="2">';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
${refresh}
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Vision Core — Stress Test Dashboard</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #020617; color: #e2e8f0; font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; padding: 24px; }
  h1  { font-size: 1.6em; margin-bottom: 4px; }
  h2  { font-size: 1.1em; color: #94a3b8; margin: 20px 0 10px; border-bottom: 1px solid #1e293b; padding-bottom: 6px; }
  .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
  .badge { background: #1e293b; border-radius: 6px; padding: 4px 12px; font-size: 0.8em; color: #94a3b8; }
  .progress-wrap { background: #1e293b; border-radius: 999px; height: 18px; margin-bottom: 8px; overflow: hidden; }
  .progress-bar  { background: linear-gradient(90deg,#6366f1,#a855f7); height: 100%; border-radius: 999px; transition: width 0.5s; width: ${pct}%; }
  .progress-label { text-align: right; font-size: 0.8em; color: #64748b; margin-bottom: 16px; }
  .stats { display: flex; gap: 12px; margin-bottom: 20px; }
  .stat { flex: 1; background: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 12px; text-align: center; }
  .stat-val { font-size: 2em; font-weight: 700; }
  .stat-lbl { font-size: 0.75em; color: #64748b; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 0.88em; }
  th  { text-align: left; color: #64748b; font-size: 0.78em; padding: 6px 8px; background: #0f172a; border-bottom: 1px solid #1e293b; }
  td  { padding: 7px 8px; border-bottom: 1px solid #0f172a; vertical-align: top; }
  .log-box { background: #0a0e17; border: 1px solid #1e293b; border-radius: 8px; padding: 12px; max-height: 260px; overflow-y: auto; }
</style>
</head>
<body>
<div class="header">
  <div>
    <h1>🧪 Vision Core — Stress Test</h1>
    <div style="color:#64748b;font-size:0.82em">Início: ${state.inicio} &nbsp;|&nbsp; Backend: ${BACKEND_URL}</div>
  </div>
  <div class="badge">${state.atual}/${state.total} testes</div>
</div>

${statusBanner}

<div class="progress-wrap"><div class="progress-bar"></div></div>
<div class="progress-label">${pct}% concluído — ${state.atual} de ${state.total}</div>

<div class="stats">
  <div class="stat"><div class="stat-val" style="color:#4ade80">${passes}</div><div class="stat-lbl">PASS</div></div>
  <div class="stat"><div class="stat-val" style="color:#f87171">${fails}</div><div class="stat-lbl">FAIL</div></div>
  <div class="stat"><div class="stat-val" style="color:#a855f7">${state.total - state.atual}</div><div class="stat-lbl">Pendentes</div></div>
  <div class="stat"><div class="stat-val" style="color:#fbbf24">${passes + fails > 0 ? Math.round((passes/(passes+fails))*100) : 0}%</div><div class="stat-lbl">Taxa acerto</div></div>
</div>

<h2>Resultados</h2>
<table>
  <thead><tr><th>ID</th><th>Cenário</th><th>Dificuldade</th><th>Status</th><th>Tempo</th><th>Palavras encontradas</th></tr></thead>
  <tbody>${rowsHTML}${pendentes}</tbody>
</table>

<h2>Log em tempo real</h2>
<div class="log-box">${logHTML || '<div style="color:#475569">Aguardando eventos...</div>'}</div>
</body>
</html>`;
}

// ── HTTP server ───────────────────────────────────────────────────────────────
function startDashboard() {
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(buildHTML());
  });
  server.listen(PORT, '127.0.0.1', () => {
    addLog(`🌐 Dashboard: http://localhost:${PORT}`);
  });
  return server;
}

// ── Load deps ─────────────────────────────────────────────────────────────────
async function loadDeps() {
  const [AdmZipMod, axiosMod] = await Promise.all([
    import('adm-zip'),
    import('axios'),
  ]);
  return {
    AdmZip: AdmZipMod.default,
    axios:  axiosMod.default,
  };
}

// ── Config ────────────────────────────────────────────────────────────────────
const BACKEND_URL = process.env.BACKEND_URL
  || 'http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com';

function getGithubToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    const out = execSync('eb printenv vision-core-prod --region us-east-1 2>&1', { encoding: 'utf8' });
    const m   = out.match(/GITHUB_TOKEN\s*=\s*(\S+)/);
    if (m) return m[1];
  } catch (_) { /* ignore */ }
  throw new Error('GITHUB_TOKEN not found — set env var or configure eb CLI');
}

// ── Patch definitions ─────────────────────────────────────────────────────────
const SCENARIOS = [
  {
    id: 'STRESS-01', dificuldade: 'EASY',
    descricao: 'Comentar linha LOCAL_REAL_COVERS',
    arquivo:   'front/assets/js/games-2026-feature.js',
    patch:     (src) => src.replace(/^(\s*const LOCAL_REAL_COVERS\s*=)/m, '// $1'),
    sintoma:   'todas as capas somem',
    esperado:  ['LOCAL_REAL_COVERS', 'capa', 'cover'],
  },
  {
    id: 'STRESS-02', dificuldade: 'EASY',
    descricao: 'LOCAL_REAL_COVERS = undefined',
    arquivo:   'front/assets/js/games-2026-feature.js',
    patch:     (src) => src.replace(
      /const LOCAL_REAL_COVERS\s*=\s*\{/,
      'const LOCAL_REAL_COVERS = undefined; const _UNUSED_ = {'
    ),
    sintoma:  'erro no console ao carregar capas',
    esperado: ['undefined', 'LOCAL_REAL_COVERS', 'erro'],
  },
  {
    id: 'STRESS-03', dificuldade: 'MEDIUM',
    descricao: 'isAllowedLocalRealCover retorna false',
    arquivo:   'front/assets/js/games-2026-feature.js',
    patch:     (src) => src.replace(
      /function isAllowedLocalRealCover\(value = ''\) \{[^}]+\}/,
      "function isAllowedLocalRealCover(value = '') { return false; }"
    ),
    sintoma:  'nenhuma capa local carrega',
    esperado: ['isAllowedLocalRealCover', 'false', 'blocked'],
  },
  {
    id: 'STRESS-04', dificuldade: 'MEDIUM',
    descricao: 'Pokopia extensão .jpg → .gif',
    arquivo:   'front/assets/js/games-2026-feature.js',
    patch:     (src) => src.replace(/game-pokopia\.jpg/g, 'game-pokopia.gif'),
    sintoma:   'capa do Pokopia some',
    esperado:  ['Pokopia', 'extensão', 'gif', 'jpg'],
  },
  {
    id: 'STRESS-05', dificuldade: 'MEDIUM',
    descricao: 'GTA VI rank 1 → 99',
    arquivo:   'front/assets/js/games-2026-feature.js',
    patch:     (src) => src.replace(
      /rank:\s*1,(\s*title:\s*'Grand Theft Auto VI')/,
      'rank: 99,$1'
    ),
    sintoma:  'GTA VI some da lista principal',
    esperado: ['rank', 'GTA', 'ordem'],
  },
  {
    id: 'STRESS-06', dificuldade: 'HARD',
    descricao: 'GTA VI release vazio',
    arquivo:   'front/assets/js/games-2026-feature.js',
    patch:     (src) => src.replace(
      /(title:\s*'Grand Theft Auto VI'[\s\S]*?release:\s*)'[^']+'/,
      "$1''"
    ),
    sintoma:  'data de lançamento aparece vazia',
    esperado: ['release', 'data', 'vazia', 'GTA'],
  },
  {
    id: 'STRESS-07', dificuldade: 'HARD',
    descricao: 'Resident Evil Requiem — PS5 removido',
    arquivo:   'front/assets/js/games-2026-feature.js',
    patch:     (src) => src.replace(
      /(title:\s*'Resident Evil Requiem'[\s\S]*?platforms:\s*')PS5,\s*/,
      '$1'
    ),
    sintoma:  'plataforma errada exibida',
    esperado: ['platforms', 'PS5', 'Resident Evil'],
  },
  {
    id: 'STRESS-08', dificuldade: 'HARD',
    descricao: "TRUSTED_API_COVER_SOURCES — 'rawg' removido",
    arquivo:   'front/assets/js/games-2026-feature.js',
    patch:     (src) => src.replace(/new Set\(\['rawg',/, "new Set(['"),
    sintoma:   'capas da API não carregam mais',
    esperado:  ['TRUSTED_API_COVER_SOURCES', 'rawg'],
  },
  {
    id: 'STRESS-09', dificuldade: 'EXPERT',
    descricao: 'isAllowedLocalRealCover regex .png|jpg → .svg|webp',
    arquivo:   'front/assets/js/games-2026-feature.js',
    // Real regex in file: /^assets\/img\/.+\.(?:png|jpe?g|webp)$/i — patch the named group
    patch:     (src) => src.replace('(?:png|jpe?g|webp)', '(?:svg|gif)'),
    sintoma:   'apenas SVGs carregam, PNGs e JPGs somem',
    esperado:  ['regex', 'extensão', 'png', 'jpg', 'svg'],
  },
  {
    id: 'STRESS-10', dificuldade: 'EXPERT',
    descricao: "Hexe key typo — apóstrofo removido",
    arquivo:   'front/assets/js/games-2026-feature.js',
    // Key uses Unicode U+2019 curly apostrophe, not straight '
    patch:     (src) => src.replace(
      /('Assassin’s Creed Codename Hexe'\s*:\s*')/,
      (m) => m.replace('Assassin’s', 'Assassins')
    ),
    sintoma:   'capa da Hexe some (key mismatch)',
    esperado:  ['Hexe', 'apóstrofo', 'chave', 'mismatch'],
  },
];

// ── Fetch ZIP from GitHub ─────────────────────────────────────────────────────
function fetchZipBuffer(token) {
  return new Promise((resolve, reject) => {
    const hdrs = {
      Authorization: `Bearer ${token}`,
      Accept:        'application/vnd.github+json',
      'User-Agent':  'vision-core-stress-test/1.0',
    };
    function follow(url, hops) {
      if (hops > 5) return reject(new Error('Too many redirects'));
      const mod   = url.startsWith('https') ? https : http;
      const parts = new URL(url);
      const req   = mod.get(
        { hostname: parts.hostname, path: parts.pathname + parts.search, headers: hops === 0 ? hdrs : { 'User-Agent': hdrs['User-Agent'] } },
        (res) => {
          if (res.statusCode === 301 || res.statusCode === 302) return follow(res.headers.location, hops + 1);
          if (res.statusCode !== 200) return reject(new Error(`GitHub ZIP HTTP ${res.statusCode}`));
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end',  () => resolve(Buffer.concat(chunks)));
          res.on('error', reject);
        }
      );
      req.on('error', reject);
    }
    follow('https://api.github.com/repos/Imadechumbo/technetgamev2/zipball/main', 0);
  });
}

// ── Generate diff (original → patched) for §53 ───────────────────────────────
function generateDiff(original, patched, arquivo) {
  const origLines    = original.split('\n');
  const patchedLines = patched.split('\n');

  // Find first differing line
  let firstDiff = 0;
  const minLen  = Math.min(origLines.length, patchedLines.length);
  while (firstDiff < minLen && origLines[firstDiff] === patchedLines[firstDiff]) firstDiff++;
  if (firstDiff >= minLen && origLines.length === patchedLines.length) return '';

  // Find last differing line (from end, aligned tails)
  let tailOrig  = origLines.length - 1;
  let tailPatch = patchedLines.length - 1;
  while (tailOrig > firstDiff && tailPatch > firstDiff &&
         origLines[tailOrig] === patchedLines[tailPatch]) {
    tailOrig--;
    tailPatch--;
  }

  const ctxBefore    = Math.max(0, firstDiff - 3);
  const ctxAfterOrig = Math.min(origLines.length - 1, tailOrig + 3);

  const lines = [];
  lines.push(`--- a/${arquivo}`);
  lines.push(`+++ b/${arquivo}`);
  lines.push(`@@ -${ctxBefore + 1} +${ctxBefore + 1} @@`);
  for (let i = ctxBefore; i < firstDiff; i++)    lines.push(` ${origLines[i]}`);
  for (let i = firstDiff; i <= tailOrig;  i++)    lines.push(`-${origLines[i]}`);
  for (let i = firstDiff; i <= tailPatch; i++)    lines.push(`+${patchedLines[i]}`);
  for (let i = tailOrig + 1; i <= ctxAfterOrig; i++) lines.push(` ${origLines[i]}`);

  // Cap body at 25 lines
  const headers = lines.slice(0, 3);
  const body    = lines.slice(3);
  if (body.length > 25) {
    return [...headers, ...body.slice(0, 25), `... (${body.length - 25} linhas omitidas)`].join('\n');
  }
  return lines.join('\n');
}

// ── Extract file + apply patch → return { original, patched } ────────────────
function applyPatch(AdmZip, zipBuffer, scenario) {
  const zip    = new AdmZip(zipBuffer);
  const target = zip.getEntries().find((e) => e.entryName.includes(scenario.arquivo) && !e.isDirectory);
  if (!target) throw new Error(`Entry not found: ${scenario.arquivo}`);
  const original = target.getData().toString('utf8');
  const patched  = scenario.patch(original);
  if (patched === original) throw new Error(`Patch had no effect for ${scenario.id}`);
  return { original, patched };
}

// ── POST to /api/chat — JSON with diff block + embedded file content ──────────
// §53: message includes [DIFF]...[/DIFF] so Vision Core focuses on changed lines.
async function sendToVisionCore(axios, { original, patched }, scenario) {
  const diff      = generateDiff(original, patched, scenario.arquivo);
  const diffBlock = diff ? `[DIFF]\n${diff}\n[/DIFF]\n\n` : '';
  const message   = `o site está com problema\n\n${diffBlock}[${scenario.arquivo}]\n${patched}`;
  const t0        = Date.now();
  const resp      = await axios.post(
    `${BACKEND_URL}/api/chat`,
    { message, mode: 'fix' },
    { headers: { 'Content-Type': 'application/json' }, timeout: 90000 }  /* §69: 60→90s */
  );
  return { data: resp.data, elapsed: Date.now() - t0 };
}

// ── 502 retry wrapper (§70 — cfn-hup EB restart mitigation) ──────────────────
// Retries ONLY on HTTP 502 (nginx Bad Gateway during EB web.service restart).
// 3 total attempts, 4s wait between each. Any other status: pass through as-is.
async function sendWithRetry(axios, data, scenario) {
  const MAX = 3;
  for (let attempt = 1; attempt <= MAX; attempt++) {
    try {
      return await sendToVisionCore(axios, data, scenario);
    } catch (e) {
      if (e?.response?.status === 502 && attempt < MAX) {
        addLog(`[RETRY] ${scenario.id} recebeu 502, aguardando 4s e tentando de novo (tentativa ${attempt + 1}/${MAX})`);
        await new Promise((r) => setTimeout(r, 4000));
        continue;
      }
      throw e;
    }
  }
}

// ── Evaluate ──────────────────────────────────────────────────────────────────
function evaluate(text, esperado) {
  const lc         = (text || '').toLowerCase();
  const encontradas = esperado.filter((w) => lc.includes(w.toLowerCase()));
  return { passou: encontradas.length >= Math.ceil(esperado.length / 2), palavras_encontradas: encontradas };
}

// ── Markdown report ───────────────────────────────────────────────────────────
function buildReport(results, timestamp) {
  const total  = results.length;
  const passes = results.filter((r) => r.passou).length;
  const fails  = total - passes;
  const taxa   = Math.round((passes / total) * 100);
  const avgMs  = Math.round(results.reduce((s, r) => s + r.tempo_ms, 0) / total);

  const byDiff = {};
  for (const r of results) {
    if (!byDiff[r.dificuldade]) byDiff[r.dificuldade] = { pass: 0, fail: 0 };
    byDiff[r.dificuldade][r.passou ? 'pass' : 'fail']++;
  }

  const failed  = results.filter((r) => !r.passou);
  const weaknesses = failed.length
    ? failed.map((r) => `- **${r.id}** (${r.dificuldade}): esperava [${r.palavras_esperadas.join(', ')}], encontrou [${r.palavras_encontradas.join(', ')}]`).join('\n')
    : '_Nenhum — todos os cenários passaram._';

  const recs = failed.length ? [
    failed.some((r) => r.dificuldade === 'EASY')   ? '- Melhorar detecção de variáveis críticas comentadas/nulas' : null,
    failed.some((r) => r.dificuldade === 'MEDIUM') ? '- Aumentar cobertura de diagnóstico para extensão e ranking' : null,
    failed.some((r) => r.dificuldade === 'HARD')   ? '- Expandir análise de dados vazios e remoção de plataformas' : null,
    failed.some((r) => r.dificuldade === 'EXPERT') ? '- Treinar modelo para detectar typos de chave e regex incorretas' : null,
  ].filter(Boolean).join('\n') : '- Sistema funcionando dentro do esperado.';

  const details = results.map((r) => [
    `### ${r.id} — ${r.descricao}`,
    `**Status:** ${r.passou ? '✅ PASS' : '❌ FAIL'} | **Dificuldade:** ${r.dificuldade} | **Tempo:** ${r.tempo_ms}ms`,
    `**Sintoma:** ${r.sintoma}`,
    `**Esperadas:** ${r.palavras_esperadas.join(', ')}`,
    `**Encontradas:** ${r.palavras_encontradas.length ? r.palavras_encontradas.join(', ') : '_nenhuma_'}`,
    '```', (r.diagnostico_recebido || '').substring(0, 200).replace(/\n/g, ' ') || '(sem resposta)', '```',
    r.erro ? `**Erro:** ${r.erro}` : '', '',
  ].join('\n')).join('\n');

  const diffTable = Object.entries(byDiff).map(([d, v]) => {
    const t = v.pass + v.fail;
    return `| ${d} | ${v.pass} | ${v.fail} | ${Math.round((v.pass / t) * 100)}% |`;
  }).join('\n');

  return `# Vision Core — Stress Test Results\n\nData: ${timestamp}\nVision Core URL: ${BACKEND_URL}\nDashboard: http://localhost:${PORT}\n\n## Resumo\n\n| Métrica | Valor |\n|---|---|\n| Total | ${total} |\n| PASS | ${passes} |\n| FAIL | ${fails} |\n| Taxa de acerto | ${taxa}% |\n| Tempo médio | ${avgMs}ms |\n\n## Por Dificuldade\n\n| Dificuldade | PASS | FAIL | Taxa |\n|---|---|---|---|\n${diffTable}\n\n## Resultados Detalhados\n\n${details}\n\n## Análise de Fraquezas\n\n${weaknesses}\n\n## Recomendações\n\n${recs}\n`;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const { AdmZip, axios } = await loadDeps();

  // Start dashboard server
  const server = startDashboard();

  // Open browser (Windows: start, Mac: open, Linux: xdg-open)
  try {
    const cmd = process.platform === 'win32' ? `start http://localhost:${PORT}`
              : process.platform === 'darwin' ? `open http://localhost:${PORT}`
              : `xdg-open http://localhost:${PORT}`;
    execSync(cmd, { stdio: 'ignore', shell: true });
  } catch (_) { /* ignore if browser can't open */ }

  addLog(`🔧 Vision Core Stress Test iniciado`);
  addLog(`   Backend: ${BACKEND_URL}`);

  let token;
  try {
    token = getGithubToken();
    addLog('   GitHub Token: OK');
  } catch (e) {
    addLog(`❌ ${e.message}`);
    state.rodando = false;
    server.close();
    process.exit(1);
  }

  addLog('📦 Buscando ZIP do technetgamev2...');
  let baseZipBuffer;
  try {
    baseZipBuffer = await fetchZipBuffer(token);
    addLog(`   ZIP recebido: ${(baseZipBuffer.length / 1024).toFixed(0)} KB`);
  } catch (e) {
    addLog(`❌ Falha ao buscar ZIP: ${e.message}`);
    state.rodando = false;
    server.close();
    process.exit(1);
  }

  const timestamp = new Date().toISOString();

  for (const scenario of SCENARIOS) {
    state.ativo = scenario.id;
    addLog(`⏳ [${scenario.id}] Aplicando bug: ${scenario.descricao}...`);

    const result = {
      id: scenario.id, dificuldade: scenario.dificuldade,
      descricao: scenario.descricao, sintoma: scenario.sintoma,
      palavras_esperadas: scenario.esperado, palavras_encontradas: [],
      passou: false, diagnostico_recebido: '', tempo_ms: 0, erro: null,
    };

    try {
      const { original, patched } = applyPatch(AdmZip, baseZipBuffer, scenario);
      addLog(`[${scenario.id}] Enviando para Vision Core... (~${(patched.length / 1024).toFixed(0)} KB)`);

      const { data, elapsed } = await sendWithRetry(axios, { original, patched }, scenario);
      result.tempo_ms = elapsed;

      // Backend returns { ok, answer, provider, ... } — extract answer field
      const responseText = data?.answer || (typeof data === 'string' ? data : JSON.stringify(data));
      result.diagnostico_recebido = responseText;

      const { passou, palavras_encontradas } = evaluate(responseText, scenario.esperado);
      result.passou            = passou;
      result.palavras_encontradas = palavras_encontradas;

      const secs = (elapsed / 1000).toFixed(1);
      if (passou) {
        addLog(`✅ [${scenario.id}] PASS — ${secs}s | encontradas: [${palavras_encontradas.join(', ')}]`);
      } else {
        addLog(`❌ [${scenario.id}] FAIL — ${secs}s | encontradas: [${palavras_encontradas.join(', ')}]`);
      }

    } catch (e) {
      result.erro   = e.message;
      result.passou = false;
      addLog(`❌ [${scenario.id}] ERRO: ${e.message}`);
    }

    state.resultados.push(result);
    state.atual = state.resultados.length;

    if (scenario !== SCENARIOS[SCENARIOS.length - 1]) {
      addLog(`   ⏸ Aguardando 5s (rate limit)...`);  /* §69: 3→5s */
      await new Promise((r) => setTimeout(r, 5000));
    }
  }

  // ── Write reports ─────────────────────────────────────────────────────────────
  const docsDir  = join(ROOT, 'docs');
  if (!existsSync(docsDir)) mkdirSync(docsDir, { recursive: true });

  const mdPath   = join(docsDir, 'STRESS-TEST-RESULTS.md');
  const jsonPath = join(docsDir, 'STRESS-TEST-RESULTS.json');
  const report   = buildReport(state.resultados, timestamp);

  await writeFile(mdPath,   report, 'utf8');
  await writeFile(jsonPath, JSON.stringify({ timestamp, backend_url: BACKEND_URL, results: state.resultados }, null, 2), 'utf8');

  const passes = state.resultados.filter((r) => r.passou).length;
  const taxa   = Math.round((passes / state.total) * 100);

  addLog(`\n══════════════════════════════════`);
  addLog(`✅ COMPLETO: ${passes}/${state.total} PASS (${taxa}%)`);
  addLog(`📄 docs/STRESS-TEST-RESULTS.md salvo`);
  addLog(`🌐 Dashboard disponível em http://localhost:${PORT}`);

  state.rodando = false;
  state.ativo   = null;

  console.log('\n══════════════════════════════════════════════');
  console.log(`✅ PASS: ${passes}/${state.total} (${taxa}%)`);
  console.log(`📄 Relatório: docs/STRESS-TEST-RESULTS.md`);
  console.log(`🌐 Dashboard: http://localhost:${PORT} (Ctrl+C para fechar)`);
  console.log('══════════════════════════════════════════════');

  server.close();
  process.exit(0);
}

main().catch((e) => {
  console.error('Fatal:', e);
  state.rodando = false;
  process.exit(1);
});
