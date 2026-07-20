// @ts-check
/**
 * Vision Core Next - Software Factory local-execution feedback.
 * All API calls are mocked; no LLM/provider/backend/prod request is allowed.
 *
 * PERMANENT SPEC. Closes a real achado: `pollSfExecutionIntent`/
 * `handleSfExecutionState` (frontend/assets/vision-core-next-clean.js)
 * only recognized 2 of ~7 real terminal outcomes from `sfCreateProjectMission`
 * (frontend/downloads/vision-agent.js:1309-1416) — every other outcome, plus
 * backend-only states (`timeout_cleanup_required`, 404 `intent_not_found`),
 * fell through 30s of silent polling with zero UI feedback. This spec forces
 * each previously-unhandled outcome via network mocks (real DOM + real event
 * loop, not an in-process stub of the handler functions) and asserts
 * `#vcSfExecuteStatus` shows a specific message, never silence.
 */

import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const NEXT_URL = pathToFileURL(path.resolve('frontend/vision-core-next.html')).toString();
const API = 'https://visioncore-api-gateway.weiganlight.workers.dev';

test.beforeEach(async ({ page }) => {
  await page.route(`${API}/api/agent/status`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, connected: false }) }));
  await page.route(`${API}/api/mission/quota`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, plan: 'free', remaining: 5 }) }));
});

async function mockCoreSfSteps(page) {
  const jobResults = new Map();
  let seq = 0;
  for (const key of ['mission-composer', 'deploy-blueprint', 'worker-handoff']) {
    await page.route(`${API}/api/sf/${key}`, async (route) => {
      seq += 1;
      const id = `job-${seq}`;
      jobResults.set(id, `${key} ok`);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, job_id: id }) });
    });
  }
  await page.route(`${API}/api/sf/job/**`, async (route) => {
    const id = route.request().url().split('/').pop();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, status: 'done', result: jobResults.get(id) || null, files: null, provider: 'mock' })
    });
  });
}

async function runToReadyForLocalExecution(page) {
  await mockCoreSfSteps(page);
  await page.goto(NEXT_URL);
  await page.locator('[data-feature="factory"]').first().click();
  await page.locator('#vcSfPassGold').uncheck();
  await page.locator('#vcPrompt').fill('app de teste para feedback de execucao');
  await page.getByRole('button', { name: 'Gerar Projeto com o composer' }).click();
  await expect(page.locator('#vcSfFinal')).toBeVisible({ timeout: 10_000 });

  await page.route(`${API}/api/sf/project-files`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, job_id: 'pf-job-feedback' }) });
  });
  await page.route(`${API}/api/sf/job/pf-job-feedback`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, status: 'done', result: null, files: [{ name: 'src/index.js', content: 'console.log(1)' }], provider: 'mock' })
    });
  });
  await page.locator('#vcSfFilesBtn').click();
  await expect(page.locator('#vcSfRealExec')).toBeVisible({ timeout: 5_000 });
}

// Um teste por desfecho real de sfCreateProjectMission que antes caia em
// silencio. hash e unico por caso pra nao vazar estado entre roteamentos.
const AGENT_RESULT_OUTCOMES = [
  { hash: 'intent-blocked-audit', action: 'sf_create_project_blocked_audit', expect: 'auditoria ausente ou invalido' },
  { hash: 'intent-failed', action: 'sf_create_project_failed', expect: 'lista de arquivos ausente ou invalida' },
  { hash: 'intent-blocked-path', action: 'sf_create_project_blocked_path', expect: 'path traversal' },
  { hash: 'intent-rollback', action: 'sf_create_project_rollback', expect: 'rollback executado' },
  { hash: 'intent-agent-failed', action: 'unexpected_agent_action', expect: 'Falha: unexpected_agent_action' }
];

for (const outcome of AGENT_RESULT_OUTCOMES) {
  test(`SF execution feedback shows a specific message for agent_result.action="${outcome.action}"`, async ({ page }) => {
    await runToReadyForLocalExecution(page);

    await page.route(`${API}/api/sf/execute-project`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          intent: { intent_hash: outcome.hash, mission_id: `mission-${outcome.hash}`, status: 'queued', target_root: `VisionCoreProjects/${outcome.hash}` },
          receipt: { committed: false, target_root: `VisionCoreProjects/${outcome.hash}` },
          queued: true
        })
      });
    });
    await page.route(`${API}/api/sf/execution-intent/${outcome.hash}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          intent: { intent_hash: outcome.hash, status: outcome.action, target_root: `VisionCoreProjects/${outcome.hash}` },
          receipt: { target_root: `VisionCoreProjects/${outcome.hash}` },
          agent_result: { ok: false, action: outcome.action, target_root: `VisionCoreProjects/${outcome.hash}` }
        })
      });
    });

    await page.locator('#vcSfAgentId').fill('agent-test');
    await page.locator('#vcSfAgentSecret').fill('secret-test');
    await page.locator('#vcSfExecuteLocalBtn').click();

    await expect(page.locator('#vcSfExecuteStatus')).toContainText(outcome.expect, { timeout: 5_000 });
    // Nunca deve mostrar o painel de recuperacao (isso e exclusivo de target_exists).
    await expect(page.locator('#vcSfRecovery')).toBeHidden();
  });
}

test('SF execution feedback shows a specific message for backend-only timeout_cleanup_required (no agent_result)', async ({ page }) => {
  await runToReadyForLocalExecution(page);

  await page.route(`${API}/api/sf/execute-project`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        intent: { intent_hash: 'intent-timeout', mission_id: 'mission-timeout', status: 'queued', target_root: 'VisionCoreProjects/intent-timeout' },
        receipt: { committed: false, target_root: 'VisionCoreProjects/intent-timeout' },
        queued: true
      })
    });
  });
  await page.route(`${API}/api/sf/execution-intent/intent-timeout`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        intent: { intent_hash: 'intent-timeout', status: 'timeout_cleanup_required', target_root: 'VisionCoreProjects/intent-timeout' },
        receipt: { target_root: 'VisionCoreProjects/intent-timeout' },
        agent_result: null
      })
    });
  });

  await page.locator('#vcSfAgentId').fill('agent-test');
  await page.locator('#vcSfAgentSecret').fill('secret-test');
  await page.locator('#vcSfExecuteLocalBtn').click();

  await expect(page.locator('#vcSfExecuteStatus')).toContainText('nao respondeu a tempo', { timeout: 5_000 });
});

test('SF execution feedback shows a specific message when the intent is gone (404, e.g. lost to an EB restart)', async ({ page }) => {
  await runToReadyForLocalExecution(page);

  await page.route(`${API}/api/sf/execute-project`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        intent: { intent_hash: 'intent-lost', mission_id: 'mission-lost', status: 'queued', target_root: 'VisionCoreProjects/intent-lost' },
        receipt: { committed: false, target_root: 'VisionCoreProjects/intent-lost' },
        queued: true
      })
    });
  });
  await page.route(`${API}/api/sf/execution-intent/intent-lost`, async (route) => {
    await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'intent_not_found' }) });
  });

  await page.locator('#vcSfAgentId').fill('agent-test');
  await page.locator('#vcSfAgentSecret').fill('secret-test');
  await page.locator('#vcSfExecuteLocalBtn').click();

  await expect(page.locator('#vcSfExecuteStatus')).toContainText('nao encontrada', { timeout: 5_000 });
});

test('SF execution feedback speaks up (does not go silent) when the poll budget is exhausted', async ({ page }) => {
  await page.clock.install({ time: 0 });
  await runToReadyForLocalExecution(page);

  await page.route(`${API}/api/sf/execute-project`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        intent: { intent_hash: 'intent-slow', mission_id: 'mission-slow', status: 'queued', target_root: 'VisionCoreProjects/intent-slow' },
        receipt: { committed: false, target_root: 'VisionCoreProjects/intent-slow' },
        queued: true
      })
    });
  });
  // Nunca resolve de verdade -- simula um Agent Local que nunca responde
  // (ou que responde depois que a UI ja desistiu).
  await page.route(`${API}/api/sf/execution-intent/intent-slow`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        intent: { intent_hash: 'intent-slow', status: 'queued', target_root: 'VisionCoreProjects/intent-slow' },
        receipt: { target_root: 'VisionCoreProjects/intent-slow' },
        agent_result: null
      })
    });
  });

  await page.locator('#vcSfAgentId').fill('agent-test');
  await page.locator('#vcSfAgentSecret').fill('secret-test');
  await page.locator('#vcSfExecuteLocalBtn').click();

  // Orcamento real: 40 tentativas x 1.5s = 60s (SF_EXECUTION_POLL_ATTEMPTS).
  // Avanca o relogio virtual em vez de esperar 60s reais (CLAUDE.md regra 14).
  // page.clock so virtualiza setTimeout/Date -- o fetch mockado ainda precisa
  // de um tick real do event loop pra resolver a cada rodada; sem o
  // waitForTimeout(20) o poll nunca progride de verdade (achado real, 1a
  // tentativa deste teste ficou presa no 1o status "Intent enfileirada...").
  for (let elapsed = 0; elapsed <= 62_000; elapsed += 1_500) {
    await page.clock.fastForward(1_500);
    await page.waitForTimeout(20);
  }

  await expect(page.locator('#vcSfExecuteStatus')).toContainText('demorou mais que o esperado', { timeout: 5_000 });
});

test('SF execution shows a specific message for a synchronous audit rejection at POST time (deterministic gate)', async ({ page }) => {
  await runToReadyForLocalExecution(page);

  await page.route(`${API}/api/sf/execute-project`, async (route) => {
    await route.fulfill({
      status: 422,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: false,
        error: 'audit_deterministic_failed',
        audit: { ok: false, errors: ['file_changed:true sem git diff'] },
        intent: { intent_hash: 'intent-rejected', status: 'audit_deterministic_failed', target_root: 'VisionCoreProjects/intent-rejected' }
      })
    });
  });

  await page.locator('#vcSfAgentId').fill('agent-test');
  await page.locator('#vcSfAgentSecret').fill('secret-test');
  await page.locator('#vcSfExecuteLocalBtn').click();

  await expect(page.locator('#vcSfExecuteStatus')).toContainText('Auditoria deterministica reprovou', { timeout: 5_000 });
});
