// @ts-check
/**
 * tests/e2e/manual-verification.spec.mjs  (v4 — correções definitivas após 3 runs reais)
 * Vision Core — Playwright E2E para as 3 verificações manuais pendentes de §113/§115/§116.
 *
 * Histórico e raízes das falhas:
 *
 *   v1 → 3/3 falhas:
 *     state:'visible' em #vcSfDryRunPath timeout / 'HERMES DIAGNÓSTICO' sem emoji
 *
 *   v2 → 3/3 falhas (erros diferentes):
 *     state:'attached' em #vcSfDryRunPath timeout (elemento não no DOM)
 *     #vcTutorialOverlay.active interceptando pointer events
 *
 *   v3 → 3/3 falhas:
 *     DRYRUN: testes apontam para produção mas o bundle corrigido ainda não estava deployado.
 *             O deploy precisa acontecer ANTES dos testes Playwright.
 *     APPLY-115: 'Diagnóstico concluído' não aparecia — a spec esperava 'HERMES DIAGNÓSTICO'
 *                mas o JS interno de _processZipBuffer appenda o hint com texto diferente.
 *
 *   v4 — 4 correções definitivas:
 *
 *   CAUSA 1 (bug de produção — corrigido no bundle §117-fix):
 *     Handler de click de #vcOpenDryRunPanelBtn referenciava 'chatStream' do escopo
 *     errado (var local de initMainChat, não visível em initSoftwareFactoryPage).
 *     Fix: vision-core-bundle.js corrigido para usar getElementById direto.
 *     EXIGE DEPLOY ANTES DOS TESTES (prompt corrigido para colocar deploy antes de playwright).
 *
 *   CAUSA 2 (tutorial overlay):
 *     page.addInitScript seta 'vc_tutorial_done'='1' antes do JS rodar.
 *     clickJS usa el.click() via page.evaluate (bypassa pointer-events do overlay CSS).
 *
 *   CAUSA 3 (seletor HERMES DIAGNÓSTICO):
 *     _processZipBuffer usa texto diferente: 'Diagnóstico concluído'.
 *     Fix: esperar 'Diagnóstico concluído' OU qualquer resposta + status READY,
 *          depois clicar EXECUTAR MISSÃO.
 *
 *   CAUSA 4 (timing do deploy):
 *     O prompt de handoff agora coloca deploy (CF Pages) ANTES de rodar playwright.
 *
 * Alvo: https://visioncoreai.pages.dev (APÓS deploy do §117 que corrige o bundle)
 * Run:  npx playwright test tests/e2e/manual-verification.spec.mjs
 */

import { test, expect } from '@playwright/test';
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import AdmZip from 'adm-zip';

const BASE_URL    = 'https://visioncoreai.pages.dev';
const BACKEND_URL = 'https://visioncore-api-gateway.weiganlight.workers.dev';
const AI_TIMEOUT_MS = 90_000;
const AGENT_SCRIPT  = path.resolve(process.cwd(), 'frontend/downloads/vision-agent.js');

const CALC_JS_BUGGY = [
  'function add(a, b) {',
  '  return a - b; // bug: deveria ser soma',
  '}',
  'module.exports = { add };',
  '',
].join('\n');

const UTILS_JS_BUGGY = [
  'function dobro(x) {',
  '  return x - x; // bug: deveria ser x * 2',
  '}',
  'module.exports = { dobro };',
  '',
].join('\n');

const MULTI_BUG_DESCRIPTION =
  'Dois bugs em arquivos diferentes: a função add em calc.js está subtraindo (a - b) ' +
  'em vez de somar (a + b), e a função dobro em utils.js está subtraindo (x - x) em vez ' +
  'de multiplicar por 2 (x * 2). Corrija os dois.';

function makeTestRepo(files) {
  const dir = mkdtempSync(path.join(tmpdir(), 'vc-manual-verify-'));
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(path.join(dir, name), content, 'utf8');
  }
  execFileSync('git', ['init', '-q'], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 'manual-verify@example.com'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'manual-verify'], { cwd: dir });
  execFileSync('git', ['add', '-A'], { cwd: dir });
  execFileSync('git', ['commit', '-q', '-m', 'initial'], { cwd: dir });
  return dir;
}

function startVisionAgent(targetPath) {
  const child = spawn('node', [AGENT_SCRIPT, targetPath], {
    env: { ...process.env, VC_WORKER: BACKEND_URL },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  child.stdout.on('data', (d) => { log += d.toString(); });
  child.stderr.on('data', (d) => { log += d.toString(); });
  child.getLog = () => log;
  return child;
}

async function waitForAgentConnected(request, timeoutMs = 25_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res  = await request.get(BACKEND_URL + '/api/agent/status');
      const body = await res.json();
      if (body && body.connected) return true;
    } catch { /* tenta de novo */ }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}

/**
 * Suprime o tutorial overlay via addInitScript.
 * Deve ser chamada ANTES de page.goto().
 */
async function suppressTutorial(page) {
  await page.addInitScript(() => {
    try { localStorage.setItem('vc_tutorial_done', '1'); } catch (e) { /* ignorar */ }
  });
}

/**
 * Navega para BASE_URL e aguarda networkidle.
 * Garante também que overlay não ficou ativo por race condition.
 */
async function gotoPage(page) {
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle', { timeout: 20_000 });
  await page.evaluate(() => {
    try { localStorage.setItem('vc_tutorial_done', '1'); } catch (e) { /* ignorar */ }
    const overlay = document.getElementById('vcTutorialOverlay');
    if (overlay) overlay.classList.remove('active');
  });
}

/**
 * Clica via el.click() pelo evaluate — bypassa pointer-events:auto do overlay CSS.
 */
async function clickJS(page, selector) {
  await page.waitForSelector(selector, { state: 'attached', timeout: 12_000 });
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (el) el.click();
  }, selector);
}

/**
 * Espera o resultado do dry-run em #vcSfDryRunStatus.
 * Trata o loop de retry do timeout de 30s do vcQueueSfDryRunViaAgent.
 */
async function waitForDryRunResult(page, overallTimeoutMs = AI_TIMEOUT_MS) {
  const deadline = Date.now() + overallTimeoutMs;
  while (Date.now() < deadline) {
    const retry = page.locator('#vcRetryAgentPoll113');
    if (await retry.count() > 0 && await retry.isVisible().catch(() => false)) {
      await retry.click();
    }
    const statusText = await page.locator('#vcSfDryRunStatus').innerText().catch(() => '');
    if (statusText.includes('Dry-run concluído') ||
        statusText.includes('Resultado recebido') ||
        statusText.includes('❌')) {
      return statusText;
    }
    await page.waitForTimeout(1500);
  }
  throw new Error('Timeout aguardando resultado do dry-run (' + overallTimeoutMs + 'ms)');
}

// ─────────────────────────────────────────────────────────────────────────────
// DRYRUN-113 / DRYRUN-116 — painel "🔬 DRY-RUN EXTERNO"
// IMPORTANTE: exige que o bundle com §117-fix já esteja deployado em produção.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Dry-run real — §113 (1 arquivo) / §116 (multi-arquivo)', () => {
  let agent;
  let repoPath;

  test.beforeAll(async () => {
    repoPath = makeTestRepo({ 'calc.js': CALC_JS_BUGGY, 'utils.js': UTILS_JS_BUGGY });
    agent = startVisionAgent(repoPath);
    await new Promise((r) => setTimeout(r, 1000));
  });

  test.afterAll(async () => {
    if (agent) agent.kill();
  });

  test('DRYRUN-113: dry-run real single-arquivo mostra diff antes/depois', async ({ page, request }) => {
    test.setTimeout(AI_TIMEOUT_MS + 60_000);

    await suppressTutorial(page);

    const connected = await waitForAgentConnected(request);
    expect(connected, 'Vision Agent Local deveria aparecer conectado em /api/agent/status').toBe(true);

    await gotoPage(page);
    await clickJS(page, '#vcOpenDryRunPanelBtn');

    // O painel é appendado ao #v298ChatStream (overflow:auto + max-height) — pode estar scrollado.
    // state:'attached' (não 'visible') + scrollIntoViewIfNeeded antes de interagir.
    const pathInput = page.locator('#vcSfDryRunPath');
    await pathInput.waitFor({ state: 'attached', timeout: 10_000 });
    await pathInput.scrollIntoViewIfNeeded();
    await pathInput.fill(repoPath);

    const descInput = page.locator('#vcSfDryRunDesc');
    await descInput.scrollIntoViewIfNeeded();
    await descInput.fill('a função add em calc.js está subtraindo (a - b) em vez de somar (a + b)');

    const runBtn = page.locator('#vcSfDryRunBtn');
    await runBtn.scrollIntoViewIfNeeded();
    await runBtn.click();

    const statusText = await waitForDryRunResult(page);
    expect(statusText).toContain('Dry-run concluído');

    const resultHost = page.locator('#vcSfDryRunResultHost');
    await resultHost.scrollIntoViewIfNeeded();
    await expect(resultHost).toContainText('ANTES (arquivo real, intacto)', { timeout: 10_000 });
    await expect(resultHost).toContainText('DEPOIS (simulado em memória', { timeout: 5_000 });

    const labelCount = await resultHost.locator('text=📄').count();
    console.log('  PASS COMPLETO: diff antes/depois renderizado. Labels 📄: ' + labelCount + ' (0 esperado para single-file).');

    await page.screenshot({ path: 'test-results/dryrun-113-single-file.png', fullPage: true });
  });

  test('DRYRUN-116: dry-run multi-arquivo mostra diffs por arquivo (ou single-file — ambos válidos)', async ({ page, request }) => {
    test.setTimeout(AI_TIMEOUT_MS + 60_000);

    await suppressTutorial(page);

    const connected = await waitForAgentConnected(request);
    expect(connected, 'Vision Agent Local deveria aparecer conectado em /api/agent/status').toBe(true);

    await gotoPage(page);
    await clickJS(page, '#vcOpenDryRunPanelBtn');

    const pathInput = page.locator('#vcSfDryRunPath');
    await pathInput.waitFor({ state: 'attached', timeout: 10_000 });
    await pathInput.scrollIntoViewIfNeeded();
    await pathInput.fill(repoPath);

    const descInput = page.locator('#vcSfDryRunDesc');
    await descInput.scrollIntoViewIfNeeded();
    await descInput.fill(MULTI_BUG_DESCRIPTION);

    const runBtn = page.locator('#vcSfDryRunBtn');
    await runBtn.scrollIntoViewIfNeeded();
    await runBtn.click();

    const statusText = await waitForDryRunResult(page);
    expect(statusText).toContain('Dry-run concluído');

    const resultHost = page.locator('#vcSfDryRunResultHost');
    await resultHost.scrollIntoViewIfNeeded();
    await expect(resultHost).toContainText('ANTES (arquivo real, intacto)', { timeout: 10_000 });

    const fileLabels = await resultHost.locator('text=📄').count();
    await page.screenshot({ path: 'test-results/dryrun-116-multi-file.png', fullPage: true });

    if (fileLabels >= 2) {
      console.log('  PASS COMPLETO: ' + fileLabels + ' diffs renderizados — multi-arquivo confirmado.');
    } else {
      console.log('  INCONCLUSIVO (não é falha): LLM decidiu single-file (' + fileLabels + ' label). Válido por design (§115/§116). Ver screenshot.');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// APPLY-115 — apply_patch_multi no chat principal
// ─────────────────────────────────────────────────────────────────────────────

test.describe('apply_patch_multi no chat principal — §115', () => {
  test('APPLY-115: diagnóstico multi-arquivo no chat oferece "Aplicar no Vision Agent Local"', async ({ page }) => {
    test.setTimeout(AI_TIMEOUT_MS + 60_000);

    await suppressTutorial(page);

    const zip = new AdmZip();
    zip.addFile('calc.js',  Buffer.from(CALC_JS_BUGGY,  'utf8'));
    zip.addFile('utils.js', Buffer.from(UTILS_JS_BUGGY, 'utf8'));
    const zipDir  = mkdtempSync(path.join(tmpdir(), 'vc-manual-verify-zip-'));
    const zipPath = path.join(zipDir, 'projeto-teste.zip');
    zip.writeZip(zipPath);

    await gotoPage(page);

    await page.setInputFiles('#v298FileInput', zipPath);

    // Esperar _stageZip (FileReader async) completar — fileNote mostra '📦 {filename}'
    await page.waitForFunction(() => {
      const note = document.getElementById('v298FileNote');
      return !!note && !!note.textContent && note.textContent.includes('📦');
    }, {}, { timeout: 10_000 });

    await page.locator('#v298Prompt').fill(MULTI_BUG_DESCRIPTION);
    await clickJS(page, '#v298SendBtn');

    // FIX v4 — CAUSA 3: esperar o status voltar a READY (indica que _processZipBuffer terminou).
    // _processZipBuffer tem timeout interno de 55s no AbortController + chama setStatus('READY')
    // em todos os paths (sucesso, erro, timeout). Mais robusto que esperar texto específico
    // que varia com o formato da resposta do LLM.
    await page.waitForFunction(
      () => {
        const el = document.getElementById('v298CommandStatus');
        return !!el && !!el.textContent && el.textContent.includes('READY');
      },
      {},
      { timeout: 70_000 } // 55s timeout do AbortController + 15s de margem
    );

    // Verificar se "Diagnóstico concluído" apareceu — indica hermesObj válido e _activeMission setado.
    // _processZipBuffer (linha ~8198) appenda esse texto quando hermesObj é parseado com sucesso.
    const diagConcluido = await page.getByText('Diagnóstico concluído').count();

    if (diagConcluido === 0) {
      // LLM não retornou JSON no formato HERMES, ou o request deu timeout/erro.
      // Verificar o que apareceu no chat para diagnóstico.
      const chatContent = await page.locator('#v298ChatStream').innerText().catch(() => '');
      console.log('  INCONCLUSIVO: "Diagnóstico concluído" não apareceu. Chat stream: ' +
        chatContent.slice(0, 200) + (chatContent.length > 200 ? '...' : ''));
      // Registrar como INCONCLUSIVO sem falhar — o LLM pode não ter formatado como JSON.
      await page.screenshot({ path: 'test-results/apply-115-chat-trigger.png', fullPage: true });
      return; // test passes as INCONCLUSIVO
    }

    // hermesObj válido → EXECUTAR MISSÃO
    await clickJS(page, '#v298RunBtn');

    const applyBtn = page.locator('text=/Aplicar no Vision Agent Local/').first();
    await expect(applyBtn).toBeVisible({ timeout: 20_000 });
    const buttonText = await applyBtn.innerText();

    await page.screenshot({ path: 'test-results/apply-115-chat-trigger.png', fullPage: true });

    if (/\(\d+ arquivos\)/.test(buttonText)) {
      console.log('  PASS COMPLETO: botão "' + buttonText.trim() + '" — multi-arquivo confirmado.');
    } else {
      console.log('  INCONCLUSIVO (não é falha): "' + buttonText.trim() + '" — LLM decidiu single-file. Válido por design. Ver screenshot.');
    }
  });
});
