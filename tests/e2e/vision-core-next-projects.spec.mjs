// @ts-check
/**
 * Permanent security/product contract for DECISION-023: the Next project
 * context is explicit and the browser never sends ownership.
 */
import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const NEXT_URL = pathToFileURL(path.resolve('frontend/vision-core-next.html')).toString();
const API = 'https://visioncore-api-gateway.weiganlight.workers.dev';

test.beforeEach(async ({ page }) => {
  await page.route(`${API}/api/agent/status`, route => route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"connected":false}' }));
  await page.route(`${API}/api/mission/quota`, route => route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"remaining":5}' }));
});

test('visitor gets an ephemeral context and cannot create persisted projects', async ({ page }) => {
  await page.goto(NEXT_URL);
  await expect(page.locator('#vcProjectSelect')).toBeDisabled();
  await expect(page.locator('#vcProjectSelect')).toHaveText('Temporário');
  await expect(page.locator('#vcProjectCreate')).toBeDisabled();
  await expect(page.locator('#vcProjectStatus')).toContainText('Entre');
});

test('authenticated reload lists projects and restores only the same user selection', async ({ page }) => {
  await page.route(`${API}/api/auth/me`, route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, user: { id: 'u1', email: 'u1@example.com' } }) }));
  await page.route(`${API}/api/projects`, route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, projects: [
    { id: 'p1', name: 'Primeiro', user_id: 'u1' }, { id: 'p2', name: 'Segundo', user_id: 'u1' }
  ] }) }));
  await page.addInitScript(() => {
    localStorage.setItem('vision_token', 'token-u1');
    sessionStorage.setItem('vc_active_project', JSON.stringify({ user_id: 'u1', project_id: 'p2' }));
  });
  await page.goto(NEXT_URL);
  await expect(page.locator('#vcProjectSelect')).toHaveValue('p2');
  await page.reload();
  await expect(page.locator('#vcProjectSelect')).toHaveValue('p2');
});

test('create sends only the name and selects the returned project', async ({ page }) => {
  let projects = [];
  let createBody = null;
  await page.route(`${API}/api/auth/me`, route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, user: { id: 'u1', email: 'u1@example.com' } }) }));
  await page.route(`${API}/api/projects`, async route => {
    if (route.request().method() === 'POST') {
      createBody = JSON.parse(route.request().postData() || '{}');
      projects = [{ id: 'p-new', name: createBody.name, user_id: 'u1' }];
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, project: projects[0] }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, projects }) });
  });
  await page.addInitScript(() => localStorage.setItem('vision_token', 'token-u1'));
  await page.goto(NEXT_URL);
  await page.locator('#vcProjectName').fill('Projeto Novo');
  await page.locator('#vcProjectCreate').click();
  await expect(page.locator('#vcProjectSelect')).toHaveValue('p-new');
  expect(createBody).toEqual({ name: 'Projeto Novo' });
});

test('load failure is readable and retry remains possible through account refresh', async ({ page }) => {
  await page.route(`${API}/api/auth/me`, route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, user: { id: 'u1', email: 'u1@example.com' } }) }));
  await page.route(`${API}/api/projects`, route => route.fulfill({ status: 500, contentType: 'application/json', body: '{"ok":false,"error":"projects_unavailable"}' }));
  await page.addInitScript(() => localStorage.setItem('vision_token', 'token-u1'));
  await page.goto(NEXT_URL);
  await expect(page.locator('#vcProjectStatus')).toContainText('projects_unavailable');
  await expect(page.locator('#vcProjectCreate')).toBeEnabled();
});
