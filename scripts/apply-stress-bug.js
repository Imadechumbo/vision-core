#!/usr/bin/env node
/**
 * apply-stress-bug.js
 * Aplica um bug de stress test manualmente no technetgamev2, faz push e dispara deploy.
 *
 * Uso: node scripts/apply-stress-bug.js STRESS-03
 */

import { execSync }            from 'child_process';
import { mkdtempSync, rmSync } from 'fs';
import { writeFile, readFile } from 'fs/promises';
import { join, dirname }       from 'path';
import { fileURLToPath }       from 'url';
import { tmpdir }              from 'os';
import https from 'https';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Same patch definitions as stress-test (subset) ───────────────────────────
const PATCHES = {
  'STRESS-01': {
    descricao: 'Comentar linha LOCAL_REAL_COVERS',
    fn: (src) => src.replace(/^(\s*const LOCAL_REAL_COVERS\s*=)/m, '// $1'),
  },
  'STRESS-02': {
    descricao: 'LOCAL_REAL_COVERS = undefined',
    fn: (src) => src.replace(
      /const LOCAL_REAL_COVERS\s*=\s*\{/,
      'const LOCAL_REAL_COVERS = undefined; const _UNUSED_ = {'
    ),
  },
  'STRESS-03': {
    descricao: 'isAllowedLocalRealCover retorna false',
    fn: (src) => src.replace(
      /function isAllowedLocalRealCover[\s\S]*?return true/,
      (m) => m.replace('return true', 'return false')
    ),
  },
  'STRESS-04': {
    descricao: 'Pokopia extensão .jpg → .gif',
    fn: (src) => src.replace(/game-pokopia\.jpg/g, 'game-pokopia.gif'),
  },
  'STRESS-05': {
    descricao: 'GTA VI rank 1 → 99',
    fn: (src) => src.replace(
      /rank:\s*1,(\s*title:\s*'Grand Theft Auto VI')/,
      'rank: 99,$1'
    ),
  },
  'STRESS-06': {
    descricao: 'GTA VI release vazio',
    fn: (src) => src.replace(
      /(title:\s*'Grand Theft Auto VI'[\s\S]*?release:\s*)'[^']+'/,
      "$1''"
    ),
  },
  'STRESS-07': {
    descricao: 'Resident Evil — PS5 removido',
    fn: (src) => src.replace(
      /(title:\s*'Resident Evil Requiem'[\s\S]*?platforms:\s*')PS5,\s*/,
      '$1'
    ),
  },
  'STRESS-08': {
    descricao: "TRUSTED_API_COVER_SOURCES — 'rawg' removido",
    fn: (src) => src.replace(/new Set\(\['rawg',/, "new Set(['"),
  },
  'STRESS-09': {
    descricao: 'isAllowedLocalRealCover regex .png|jpg → .svg|webp',
    fn: (src) => src.replace(/\/\\\.\(png\|jpg\|jpeg\)\\$\/i/g, '/\\.(svg|webp)$/i'),
  },
  'STRESS-10': {
    descricao: "Hexe key typo — apóstrofo removido",
    fn: (src) => src.replace(/Assassin's Creed Codename Hexe/g, 'Assassins Creed Codename Hexe'),
  },
};

// ── GitHub dispatch ───────────────────────────────────────────────────────────
function dispatchWorkflow(token, workflow, ref) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ ref });
    const req  = https.request({
      hostname: 'api.github.com',
      path:     `/repos/Imadechumbo/technetgamev2/actions/workflows/${workflow}/dispatches`,
      method:   'POST',
      headers:  {
        Authorization:        `Bearer ${token}`,
        Accept:               'application/vnd.github+json',
        'Content-Type':       'application/json',
        'Content-Length':     Buffer.byteLength(body),
        'User-Agent':         'vision-core-stress-apply/1.0',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`Dispatch HTTP ${res.statusCode}: ${Buffer.concat(chunks).toString()}`));
        } else {
          resolve(res.statusCode);
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function getToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    const out = execSync('eb printenv vision-core-prod --region us-east-1 2>&1', { encoding: 'utf8' });
    const m   = out.match(/GITHUB_TOKEN\s*=\s*(\S+)/);
    if (m) return m[1];
  } catch (_) { /* ignore */ }
  throw new Error('GITHUB_TOKEN not found');
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const scenarioId = process.argv[2];
  if (!scenarioId || !PATCHES[scenarioId]) {
    console.error(`Uso: node scripts/apply-stress-bug.js <ID>`);
    console.error(`IDs disponíveis: ${Object.keys(PATCHES).join(', ')}`);
    process.exit(1);
  }

  const patch = PATCHES[scenarioId];
  console.log(`\n🐛 Aplicando bug: ${scenarioId} — ${patch.descricao}`);

  const token = getToken();
  const cloneDir = mkdtempSync(join(tmpdir(), 'vc-stress-'));

  try {
    // Clone
    console.log('📦 Clonando technetgamev2...');
    execSync(`git clone "https://${token}@github.com/Imadechumbo/technetgamev2.git" "${cloneDir}"`, { stdio: 'pipe' });

    // Apply patch
    const targetFile = join(cloneDir, 'front', 'assets', 'js', 'games-2026-feature.js');
    const original   = await readFile(targetFile, 'utf8');
    const patched    = patch.fn(original);

    if (patched === original) {
      throw new Error('Patch teve efeito nulo — regex pode não ter encontrado o alvo');
    }

    await writeFile(targetFile, patched, 'utf8');
    console.log('✅ Patch aplicado');

    // Commit + push
    execSync('git config user.email "imadechumbo@gmail.com"', { cwd: cloneDir });
    execSync('git config user.name "SeuNome"',               { cwd: cloneDir });
    execSync('git add front/assets/js/games-2026-feature.js', { cwd: cloneDir });
    execSync(`git commit -m "stress-test: ${scenarioId} — ${patch.descricao}"`, { cwd: cloneDir });
    execSync('git push origin main', { cwd: cloneDir, stdio: 'pipe' });

    const hash = execSync('git rev-parse --short HEAD', { cwd: cloneDir, encoding: 'utf8' }).trim();
    console.log(`📤 Push: ${hash}`);

    // Dispatch
    await dispatchWorkflow(token, 'release-auto-rollback.yml', 'main');
    console.log('🚀 Workflow dispatched');
    console.log(`\n✅ Bug ${scenarioId} aplicado em ${hash}`);
    console.log('   Verifique o site após o deploy para observar o sintoma.');
    console.log('\n⚠️  LEMBRETE: Reverter após o teste com:');
    console.log('   git revert HEAD no technetgamev2');

  } finally {
    rmSync(cloneDir, { recursive: true, force: true });
  }
}

main().catch((e) => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
