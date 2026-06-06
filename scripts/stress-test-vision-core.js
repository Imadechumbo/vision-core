#!/usr/bin/env node
/**
 * stress-test-vision-core.js
 * Vision Core — Stress Test Automatizado (10 cenários)
 * Executa: node scripts/stress-test-vision-core.js
 */

import { execSync } from 'child_process';
import { createWriteStream, mkdirSync, existsSync } from 'fs';
import { writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

// ── Resolve deps from root node_modules ──────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Dynamic import with fallback path
async function loadDeps() {
  const [AdmZipMod, axiosMod, FormDataMod] = await Promise.all([
    import('adm-zip'),
    import('axios'),
    import('form-data'),
  ]);
  return {
    AdmZip:   AdmZipMod.default,
    axios:    axiosMod.default,
    FormData: FormDataMod.default,
  };
}

// ── Config ────────────────────────────────────────────────────────────────────
const BACKEND_URL = process.env.BACKEND_URL
  || 'http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com';

// Prefer env; fallback: eb printenv
function getGithubToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    const out = execSync('eb printenv vision-core-prod --region us-east-1 2>&1', { encoding: 'utf8' });
    const m = out.match(/GITHUB_TOKEN\s*=\s*(\S+)/);
    if (m) return m[1];
  } catch (_) { /* ignore */ }
  throw new Error('GITHUB_TOKEN not found — set env var or configure eb CLI');
}

// ── Patch definitions ─────────────────────────────────────────────────────────
// Each patch: { search: string|RegExp, replace: string }
const SCENARIOS = [
  {
    id: 'STRESS-01',
    dificuldade: 'EASY',
    descricao: 'Comentar linha LOCAL_REAL_COVERS',
    arquivo: 'front/assets/js/games-2026-feature.js',
    patch: (src) => src.replace(
      /^(\s*const LOCAL_REAL_COVERS\s*=)/m,
      '// $1'
    ),
    sintoma: 'todas as capas somem',
    esperado: ['LOCAL_REAL_COVERS', 'capa', 'cover'],
  },
  {
    id: 'STRESS-02',
    dificuldade: 'EASY',
    descricao: 'LOCAL_REAL_COVERS = undefined',
    arquivo: 'front/assets/js/games-2026-feature.js',
    patch: (src) => src.replace(
      /const LOCAL_REAL_COVERS\s*=\s*\{/,
      'const LOCAL_REAL_COVERS = undefined; const _UNUSED_ = {'
    ),
    sintoma: 'erro no console ao carregar capas',
    esperado: ['undefined', 'LOCAL_REAL_COVERS', 'erro'],
  },
  {
    id: 'STRESS-03',
    dificuldade: 'MEDIUM',
    descricao: 'isAllowedLocalRealCover retorna false',
    arquivo: 'front/assets/js/games-2026-feature.js',
    patch: (src) => src.replace(
      /function isAllowedLocalRealCover[\s\S]*?return true/,
      (m) => m.replace('return true', 'return false')
    ),
    sintoma: 'nenhuma capa local carrega',
    esperado: ['isAllowedLocalRealCover', 'false', 'blocked'],
  },
  {
    id: 'STRESS-04',
    dificuldade: 'MEDIUM',
    descricao: 'Pokopia extensão .jpg → .gif',
    arquivo: 'front/assets/js/games-2026-feature.js',
    patch: (src) => src.replace(
      /game-pokopia\.jpg/g,
      'game-pokopia.gif'
    ),
    sintoma: 'capa do Pokopia some',
    esperado: ['Pokopia', 'extensão', 'gif', 'jpg'],
  },
  {
    id: 'STRESS-05',
    dificuldade: 'MEDIUM',
    descricao: 'GTA VI rank 1 → 99',
    arquivo: 'front/assets/js/games-2026-feature.js',
    patch: (src) => src.replace(
      /rank:\s*1,(\s*title:\s*'Grand Theft Auto VI')/,
      'rank: 99,$1'
    ),
    sintoma: 'GTA VI some da lista principal',
    esperado: ['rank', 'GTA', 'ordem'],
  },
  {
    id: 'STRESS-06',
    dificuldade: 'HARD',
    descricao: 'GTA VI release vazio',
    arquivo: 'front/assets/js/games-2026-feature.js',
    patch: (src) => src.replace(
      /(title:\s*'Grand Theft Auto VI'[\s\S]*?release:\s*)'[^']+'/,
      "$1''"
    ),
    sintoma: 'data de lançamento aparece vazia',
    esperado: ['release', 'data', 'vazia', 'GTA'],
  },
  {
    id: 'STRESS-07',
    dificuldade: 'HARD',
    descricao: 'Resident Evil Requiem — PS5 removido das platforms',
    arquivo: 'front/assets/js/games-2026-feature.js',
    patch: (src) => src.replace(
      /(title:\s*'Resident Evil Requiem'[\s\S]*?platforms:\s*')PS5,\s*/,
      '$1'
    ),
    sintoma: 'plataforma errada exibida',
    esperado: ['platforms', 'PS5', 'Resident Evil'],
  },
  {
    id: 'STRESS-08',
    dificuldade: 'HARD',
    descricao: "TRUSTED_API_COVER_SOURCES — 'rawg' removido",
    arquivo: 'front/assets/js/games-2026-feature.js',
    patch: (src) => src.replace(
      /new Set\(\['rawg',/,
      "new Set(['"
    ),
    sintoma: 'capas da API não carregam mais',
    esperado: ['TRUSTED_API_COVER_SOURCES', 'rawg'],
  },
  {
    id: 'STRESS-09',
    dificuldade: 'EXPERT',
    descricao: 'isAllowedLocalRealCover regex .png|jpg → .svg|webp',
    arquivo: 'front/assets/js/games-2026-feature.js',
    patch: (src) => src.replace(
      /\/\\\.\(png\|jpg\|jpeg\)\\$\/i/g,
      '/\\.(svg|webp)$/i'
    ),
    sintoma: 'apenas SVGs carregam, PNGs e JPGs somem',
    esperado: ['regex', 'extensão', 'png', 'jpg', 'svg'],
  },
  {
    id: 'STRESS-10',
    dificuldade: 'EXPERT',
    descricao: "Hexe key typo — apóstrofo removido",
    arquivo: 'front/assets/js/games-2026-feature.js',
    patch: (src) => src.replace(
      /Assassin's Creed Codename Hexe/g,
      'Assassins Creed Codename Hexe'
    ),
    sintoma: 'capa da Hexe some (key mismatch)',
    esperado: ['Hexe', 'apóstrofo', 'chave', 'mismatch'],
  },
];

// ── Fetch ZIP from GitHub ─────────────────────────────────────────────────────
function fetchZipBuffer(token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: '/repos/Imadechumbo/technetgamev2/zipball/main',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'vision-core-stress-test/1.0',
      },
    };

    function follow(url, redirects) {
      if (redirects > 5) return reject(new Error('Too many redirects'));
      const mod   = url.startsWith('https') ? https : http;
      const parts = new URL(url);
      const reqOpts = {
        hostname: parts.hostname,
        path:     parts.pathname + parts.search,
        headers:  redirects === 0 ? options.headers : { 'User-Agent': options.headers['User-Agent'] },
      };
      const req = mod.get(reqOpts, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return follow(res.headers.location, redirects + 1);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`GitHub ZIP fetch failed: HTTP ${res.statusCode}`));
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      });
      req.on('error', reject);
    }

    follow(`https://${options.hostname}${options.path}`, 0);
  });
}

// ── Apply patch in-memory ─────────────────────────────────────────────────────
function applyPatchToZip(AdmZip, zipBuffer, scenario) {
  const zip     = new AdmZip(zipBuffer);
  const entries = zip.getEntries();

  // Find entry matching scenario.arquivo (zipball has a prefix folder)
  const target = entries.find((e) =>
    e.entryName.includes(scenario.arquivo) && !e.isDirectory
  );
  if (!target) throw new Error(`Entry not found: ${scenario.arquivo}`);

  const original = target.getData().toString('utf8');
  const patched  = scenario.patch(original);

  if (patched === original) {
    throw new Error(`Patch had no effect on ${scenario.arquivo} for ${scenario.id}`);
  }

  zip.updateFile(target.entryName, Buffer.from(patched, 'utf8'));
  return zip.toBuffer();
}

// ── POST to /api/chat ─────────────────────────────────────────────────────────
async function sendToVisionCore(axios, FormData, zipBuffer, scenario) {
  const form = new FormData();
  form.append('message', 'o site está com problema');
  form.append('file', zipBuffer, {
    filename:    'repo.zip',
    contentType: 'application/zip',
  });

  const t0 = Date.now();
  const resp = await axios.post(`${BACKEND_URL}/api/chat`, form, {
    headers: form.getHeaders(),
    timeout: 60000,
    maxContentLength: Infinity,
    maxBodyLength:    Infinity,
  });
  const elapsed = Date.now() - t0;
  return { data: resp.data, elapsed };
}

// ── Evaluate response ─────────────────────────────────────────────────────────
function evaluate(responseText, esperado) {
  const lc = (responseText || '').toLowerCase();
  const encontradas = esperado.filter((w) => lc.includes(w.toLowerCase()));
  return {
    passou:            encontradas.length >= Math.ceil(esperado.length / 2),
    palavras_encontradas: encontradas,
  };
}

// ── Generate Markdown report ──────────────────────────────────────────────────
function buildReport(results, timestamp) {
  const total   = results.length;
  const passes  = results.filter((r) => r.passou).length;
  const fails   = total - passes;
  const taxa    = Math.round((passes / total) * 100);
  const avgMs   = Math.round(results.reduce((s, r) => s + r.tempo_ms, 0) / total);

  const byDiff = {};
  for (const r of results) {
    if (!byDiff[r.dificuldade]) byDiff[r.dificuldade] = { pass: 0, fail: 0 };
    byDiff[r.dificuldade][r.passou ? 'pass' : 'fail']++;
  }

  const failedScenarios = results.filter((r) => !r.passou);
  const weaknesses = failedScenarios.length
    ? failedScenarios.map((r) =>
        `- **${r.id}** (${r.dificuldade}): esperava [${r.palavras_esperadas.join(', ')}], encontrou [${r.palavras_encontradas.join(', ')}]`
      ).join('\n')
    : '_Nenhum — todos os cenários passaram._';

  const recommendations = failedScenarios.length
    ? [
        failedScenarios.some((r) => r.dificuldade === 'EASY')
          ? '- Melhorar detecção de variáveis críticas comentadas/nulas'
          : null,
        failedScenarios.some((r) => r.dificuldade === 'MEDIUM')
          ? '- Aumentar cobertura de diagnóstico para mudanças de extensão e ranking'
          : null,
        failedScenarios.some((r) => r.dificuldade === 'HARD')
          ? '- Expandir análise de dados vazios e remoção de plataformas'
          : null,
        failedScenarios.some((r) => r.dificuldade === 'EXPERT')
          ? '- Treinar modelo para detectar typos de chave e regex incorretas'
          : null,
      ].filter(Boolean).join('\n')
    : '- Sistema funcionando dentro do esperado. Considerar cenários adicionais.';

  const detailRows = results.map((r) => {
    const status = r.passou ? '✅ PASS' : '❌ FAIL';
    const diag   = (r.diagnostico_recebido || '').substring(0, 200).replace(/\n/g, ' ');
    return [
      `### ${r.id} — ${r.descricao}`,
      `**Status:** ${status} | **Dificuldade:** ${r.dificuldade} | **Tempo:** ${r.tempo_ms}ms`,
      `**Sintoma testado:** ${r.sintoma}`,
      `**Palavras esperadas:** ${r.palavras_esperadas.join(', ')}`,
      `**Palavras encontradas:** ${r.palavras_encontradas.length ? r.palavras_encontradas.join(', ') : '_nenhuma_'}`,
      `**Diagnóstico recebido (trecho):**`,
      '```',
      diag || '(sem resposta)',
      '```',
      r.erro ? `**Erro:** ${r.erro}` : '',
      '',
    ].join('\n');
  }).join('\n');

  const diffTable = Object.entries(byDiff).map(([d, v]) => {
    const t = v.pass + v.fail;
    const tx = Math.round((v.pass / t) * 100);
    return `| ${d} | ${v.pass} | ${v.fail} | ${tx}% |`;
  }).join('\n');

  return `# Vision Core — Stress Test Results

Data: ${timestamp}
Vision Core URL: ${BACKEND_URL}

## Resumo

| Métrica | Valor |
|---|---|
| Total | ${total} |
| PASS | ${passes} |
| FAIL | ${fails} |
| Taxa de acerto | ${taxa}% |
| Tempo médio | ${avgMs}ms |

## Por Dificuldade

| Dificuldade | PASS | FAIL | Taxa |
|---|---|---|---|
${diffTable}

## Resultados Detalhados

${detailRows}

## Análise de Fraquezas

${weaknesses}

## Recomendações

${recommendations}
`;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const { AdmZip, axios, FormData } = await loadDeps();

  console.log('🔧 Vision Core Stress Test');
  console.log(`   Backend: ${BACKEND_URL}`);

  let token;
  try {
    token = getGithubToken();
    console.log('   GitHub Token: OK');
  } catch (e) {
    console.error('❌', e.message);
    process.exit(1);
  }

  console.log('\n📦 Buscando ZIP do technetgamev2...');
  let baseZipBuffer;
  try {
    baseZipBuffer = await fetchZipBuffer(token);
    console.log(`   ZIP recebido: ${(baseZipBuffer.length / 1024).toFixed(0)} KB`);
  } catch (e) {
    console.error('❌ Falha ao buscar ZIP:', e.message);
    process.exit(1);
  }

  const results = [];
  const timestamp = new Date().toISOString();

  for (const scenario of SCENARIOS) {
    console.log(`\n🧪 ${scenario.id} [${scenario.dificuldade}] — ${scenario.descricao}`);

    const result = {
      id:                  scenario.id,
      dificuldade:         scenario.dificuldade,
      descricao:           scenario.descricao,
      sintoma:             scenario.sintoma,
      palavras_esperadas:  scenario.esperado,
      palavras_encontradas: [],
      passou:              false,
      diagnostico_recebido: '',
      tempo_ms:            0,
      erro:                null,
    };

    try {
      const patchedZip = applyPatchToZip(AdmZip, baseZipBuffer, scenario);
      console.log(`   Patch aplicado: ${(patchedZip.length / 1024).toFixed(0)} KB`);

      const { data, elapsed } = await sendToVisionCore(axios, FormData, patchedZip, scenario);
      result.tempo_ms = elapsed;

      const responseText = typeof data === 'string'
        ? data
        : (data?.content || data?.message || data?.response || JSON.stringify(data));
      result.diagnostico_recebido = responseText;

      const { passou, palavras_encontradas } = evaluate(responseText, scenario.esperado);
      result.passou = passou;
      result.palavras_encontradas = palavras_encontradas;

      const icon = passou ? '✅' : '❌';
      console.log(`   ${icon} ${passou ? 'PASS' : 'FAIL'} | ${elapsed}ms | encontradas: [${palavras_encontradas.join(', ')}]`);

    } catch (e) {
      result.erro  = e.message;
      result.passou = false;
      console.log(`   ❌ ERRO: ${e.message}`);
    }

    results.push(result);

    // Rate limit
    if (scenario !== SCENARIOS[SCENARIOS.length - 1]) {
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  // ── Write reports ────────────────────────────────────────────────────────────
  const docsDir = join(ROOT, 'docs');
  if (!existsSync(docsDir)) mkdirSync(docsDir, { recursive: true });

  const mdPath   = join(docsDir, 'STRESS-TEST-RESULTS.md');
  const jsonPath = join(docsDir, 'STRESS-TEST-RESULTS.json');

  const report = buildReport(results, timestamp);
  await writeFile(mdPath,   report,                   'utf8');
  await writeFile(jsonPath, JSON.stringify({ timestamp, backend_url: BACKEND_URL, results }, null, 2), 'utf8');

  const passes = results.filter((r) => r.passou).length;
  const taxa   = Math.round((passes / results.length) * 100);

  console.log('\n══════════════════════════════════════════════');
  console.log(`✅ PASS: ${passes}/${results.length} (${taxa}%)`);
  console.log(`📄 Relatório: docs/STRESS-TEST-RESULTS.md`);
  console.log(`📊 JSON raw: docs/STRESS-TEST-RESULTS.json`);
  console.log('══════════════════════════════════════════════');
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
