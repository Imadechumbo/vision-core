// @ts-check
/**
 * Vision Core Next - Fase 2b apply_patch/apply_patch_multi agent binding.
 *
 * All backend calls are mocked via page.route(); this spec must never touch the
 * real Vision Agent Local, GitHub, LLM providers, or production backend.
 *
 * PERMANENT SPEC (not a temp validation spec — see CLAUDE.md "Fase 2b"):
 * AGENT_APPLY_ENABLED must stay false until the backend requires a real
 * pairing secret per agent/project/owner. agent_id alone does not authenticate
 * anything (non-secret hash, no auth middleware on /api/agent/mission/*), so
 * a silent flip back to true is a real vulnerability, not a UI regression.
 * This spec exists specifically to catch that flip.
 */

import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const NEXT_URL = pathToFileURL(path.resolve('frontend/vision-core-next.html')).toString();
const API = 'https://visioncore-api-gateway.weiganlight.workers.dev';
const CONFIRM_TEXT = 'APLICAR PATCH REAL';
const AGENT_ID = 'agent_test_123';

async function mockAgentStatus(page, body = { ok: true, connected: false, agent_id: null }) {
  await page.route(`${API}/api/agent/status`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
}

async function openNext(page) {
  await page.goto(NEXT_URL);
  await page.locator('[data-feature="missions"]').first().click();
  await expect(page.locator('#vcAgentApplyForm')).toBeVisible();
}

test('agent apply panel is scoped to Missions and always disabled', async ({ page }) => {
  await mockAgentStatus(page);
  await page.goto(NEXT_URL);
  await expect(page.locator('#vcAgentApplyForm')).toBeHidden();

  await page.locator('[data-feature="missions"]').first().click();
  await expect(page.locator('#vcAgentApplyForm')).toBeVisible();
  await expect(page.locator('#vcAgentApplyActions button')).toBeDisabled();
  await expect(page.locator('#vcAgentApplyActions button')).toHaveText('Aplicação real bloqueada');

  await page.locator('[data-feature="chat"]').first().click();
  await expect(page.locator('#vcAgentApplyForm')).toBeHidden();
});

test('connected agent_id auto-fills the field (refreshAgentApplyStatus wiring)', async ({ page }) => {
  await mockAgentStatus(page, { ok: true, connected: true, agent_id: AGENT_ID });
  await openNext(page);
  await expect(page.locator('#vcAgentApplyAgentId')).toHaveValue(AGENT_ID);
});

test('agent apply never queues, even with valid JSON, agent_id and exact phrase', async ({ page }) => {
  let queued = 0;
  await mockAgentStatus(page, { ok: true, connected: true, agent_id: AGENT_ID });
  await page.route(`${API}/api/agent/mission/queue`, async (route) => {
    queued += 1;
    await route.fulfill({ status: 500, body: '{}' });
  });

  await openNext(page);
  await expect(page.locator('#vcAgentApplyAgentId')).toHaveValue(AGENT_ID);
  await page.locator('#vcAgentApplyPayload').fill(JSON.stringify({
    type: 'apply_patch',
    file: 'buggy.js',
    fix_type: 'code_patch',
    diagnosis: 'operador errado',
    patch: { search: 'return a - b;', replace: 'return a + b;' }
  }));
  await page.locator('#vcAgentApplyConfirm').fill(CONFIRM_TEXT);

  await expect(page.locator('#vcAgentApplyActions button')).toBeDisabled();
  await expect(page.locator('#vcAgentApplyActions button')).toHaveText('Aplicação real bloqueada');
  expect(queued).toBe(0);
});

test('agent apply never queues multi-file payload either', async ({ page }) => {
  let queued = 0;
  await mockAgentStatus(page, { ok: true, connected: true, agent_id: AGENT_ID });
  await page.route(`${API}/api/agent/mission/queue`, async (route) => {
    queued += 1;
    await route.fulfill({ status: 500, body: '{}' });
  });

  await openNext(page);
  await page.locator('#vcAgentApplyPayload').fill(JSON.stringify({
    type: 'apply_patch_multi',
    diagnosis: 'duas trocas pequenas',
    files: [
      { file: 'a.js', patch: { search: '1', replace: '2' } },
      { file: 'b.js', patch: { search: 'x', replace: 'y' } }
    ]
  }));
  await page.locator('#vcAgentApplyConfirm').fill(CONFIRM_TEXT);

  await expect(page.locator('#vcAgentApplyActions button')).toBeDisabled();
  expect(queued).toBe(0);
});
