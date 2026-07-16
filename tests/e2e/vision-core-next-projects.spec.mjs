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
  await page.route(`${API}/api/chat/conversations**`, route => route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"conversations":[]}' }));
});

test('visitor gets an ephemeral context and cannot create persisted projects', async ({ page }) => {
  await page.goto(NEXT_URL);
  await expect(page.locator('#vcChatOnboarding')).toHaveAttribute('data-state', 'visitor');
  await expect(page.locator('#vcProjectSelect')).toBeDisabled();
  await expect(page.locator('#vcProjectSelect')).toHaveText('Workspace temporário');
  await expect(page.locator('#vcProjectCreate')).toBeDisabled();
  await expect(page.locator('#vcProjectStatus')).toHaveText('Workspace temporário');
  await expect(page.locator('#vcProjectStatus')).toHaveAttribute('data-state', 'empty');
});

test('authenticated empty account gets the personal Workspace Hero without visitor sales content', async ({ page }) => {
  await page.route(`${API}/api/auth/me`, route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, user: { id: 'u1', name: 'Ana Silva', email: 'ana@example.com' } }) }));
  await page.route(`${API}/api/projects`, route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, projects: [] }) }));
  await page.addInitScript(() => localStorage.setItem('vision_token', 'token-u1'));
  await page.goto(NEXT_URL);

  const hero = page.locator('#vcChatOnboarding');
  await expect(hero).toHaveAttribute('data-state', 'empty');
  await expect(page.locator('#vcOnboardingTitle')).toHaveText('Bem-vindo, Ana.');
  await expect(page.locator('#vcOnboardingLead')).toHaveText('Seu workspace está pronto.');
  await expect(page.locator('#vcHeroCreateWorkspace')).toBeVisible();
  await expect(page.locator('#vcOnboardingGoogle')).toBeHidden();
  await expect(page.locator('#vcHeroVisitor')).toBeHidden();
  await expect(hero).not.toContainText('ana@example.com');
  await page.locator('#vcHeroNewMission').click();
  await expect(page.locator('#vcPrompt')).toBeFocused();
});

test('authenticated account shows at most three real recent Workspaces and restores the selected one', async ({ page }) => {
  const projects = [
    { id: 'p1', name: 'Alpha', user_id: 'u1' },
    { id: 'p2', name: 'Beta', user_id: 'u1' },
    { id: 'p3', name: 'Gamma', user_id: 'u1' },
    { id: 'p4', name: 'Delta', user_id: 'u1' }
  ];
  await page.route(`${API}/api/auth/me`, route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, user: { id: 'u1', name: 'Ana Silva', email: 'ana@example.com' } }) }));
  await page.route(`${API}/api/projects`, route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, projects }) }));
  await page.addInitScript(() => {
    localStorage.setItem('vision_token', 'token-u1');
    sessionStorage.setItem('vc_active_project', JSON.stringify({ user_id: 'u1', project_id: 'p4' }));
  });
  await page.goto(NEXT_URL);

  const hero = page.locator('#vcChatOnboarding');
  await expect(hero).toHaveAttribute('data-state', 'workspaces');
  await expect(page.locator('#vcOnboardingTitle')).toHaveText('Bem-vindo, Ana.');
  await expect(page.locator('#vcOnboardingLead')).toHaveText('Continue seu projeto.');
  await expect(page.locator('#vcHeroRecent button')).toHaveCount(3);
  await expect(page.locator('#vcHeroRecent button').first()).toHaveText('Delta');
  await expect(page.locator('#vcHeroRecent')).toContainText('Alpha');
  await expect(page.locator('#vcHeroRecent')).toContainText('Beta');
  await expect(page.locator('#vcHeroRecent')).not.toContainText('Gamma');
  await page.locator('#vcHeroRecent button', { hasText: 'Beta' }).click();
  await expect(page.locator('#vcProjectSelect')).toHaveValue('p2');
  await page.locator('#vcHeroContinueWorkspace').click();
  await expect(page.locator('#vcProjectSelect')).toHaveValue('p2');
  await expect(page.locator('#vcPrompt')).toBeFocused();
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
  await page.locator('#vcHeroCreateWorkspace').click();
  await expect(page.locator('#vcProjectName')).toBeFocused();
  await page.locator('#vcProjectName').fill('Projeto Novo');
  await page.locator('#vcProjectCreate').click();
  await expect(page.locator('#vcProjectSelect')).toHaveValue('p-new');
  await expect(page.locator('#vcChatOnboarding')).toHaveAttribute('data-state', 'workspaces');
  expect(createBody).toEqual({ name: 'Projeto Novo' });
});

test('project load failure has an idempotent visible retry', async ({ page }) => {
  let calls = 0;
  await page.route(`${API}/api/auth/me`, route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, user: { id: 'u1', email: 'u1@example.com' } }) }));
  await page.route(`${API}/api/projects`, route => {
    calls++;
    route.fulfill(calls === 1
      ? { status: 500, contentType: 'application/json', body: '{"ok":false,"error":"projects_unavailable"}' }
      : { status: 200, contentType: 'application/json', body: '{"ok":true,"projects":[{"id":"p1","name":"Recuperado","user_id":"u1"}]}' });
  });
  await page.addInitScript(() => localStorage.setItem('vision_token', 'token-u1'));
  await page.goto(NEXT_URL);
  await expect(page.locator('#vcProjectStatus')).toContainText('projects_unavailable');
  await expect(page.locator('#vcProjectStatus')).toHaveAttribute('data-state', 'error');
  await expect(page.locator('#vcProjectCreate')).toBeEnabled();
  await page.locator('#vcProjectRetry').click();
  await expect(page.locator('#vcProjectSelect')).toHaveValue('p1');
  await expect(page.locator('#vcProjectRetry')).toBeHidden();
});

test('chat blocks double submit and exposes real AbortController cancellation', async ({ page }) => {
  let calls = 0;
  await page.route(`${API}/api/chat`, async route => {
    calls++;
    await new Promise(resolve => setTimeout(resolve, 2000));
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"answer":"tarde"}' });
  });
  await page.goto(NEXT_URL);
  await page.locator('#vcPrompt').fill('cancelar esta chamada');
  await page.locator('#vcComposer').evaluate(form => { form.requestSubmit(); form.requestSubmit(); });
  await expect(page.locator('#vcChatCancel')).toBeVisible();
  await page.locator('#vcChatCancel').click();
  await expect(page.locator('#vcChatStream')).toContainText('Solicitação cancelada.');
  await expect(page.locator('.vc-send')).toBeEnabled();
  expect(calls).toBe(1);
});

test('conversation switch, persistence and deletion stay scoped to the active project', async ({ page }) => {
  const messages = [];
  await page.unroute(`${API}/api/chat/conversations**`);
  await page.route(`${API}/api/auth/me`, route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, user: { id: 'u1', email: 'u1@example.com' } }) }));
  await page.route(`${API}/api/projects`, route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, projects: [{ id: 'p1', name: 'Projeto', user_id: 'u1' }] }) }));
  await page.route(`${API}/api/chat/conversations**`, async route => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    if (method === 'GET' && url.pathname.endsWith('/c1')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, conversation: { id: 'c1', messages } }) });
    if (method === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, conversations: [{ id: 'c1', title: 'Persistida', message_count: messages.length }] }) });
    if (method === 'POST' && url.pathname.endsWith('/messages')) {
      messages.push(JSON.parse(route.request().postData() || '{}'));
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"message":{"id":"m1"}}' });
    }
    if (method === 'DELETE') return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"deleted":true}' });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"conversation":{"id":"c2","title":"Nova conversa"}}' });
  });
  await page.route(`${API}/api/chat`, route => route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"answer":"Resposta persistida"}' }));
  await page.addInitScript(() => localStorage.setItem('vision_token', 'token-u1'));
  await page.goto(NEXT_URL);
  await page.locator('#vcConversationSelect').selectOption('c1');
  await page.locator('#vcPrompt').fill('Pergunta persistida');
  await page.locator('#vcComposer').evaluate(form => form.requestSubmit());
  await expect.poll(() => messages.length).toBe(2);
  expect(messages.map(item => item.role)).toEqual(['user', 'assistant']);
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#vcConversationDelete').click();
  await expect(page.locator('#vcConversationSelect')).toHaveValue('');
});

test('Logs is authenticated SAFE READ, filtered by project and renders only redacted fields', async ({ page }) => {
  let requestedUrl = '';
  await page.route(`${API}/api/auth/me`, route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, user: { id: 'u1', email: 'u1@example.com' } }) }));
  await page.route(`${API}/api/projects`, route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, projects: [{ id: 'p1', name: 'Projeto', user_id: 'u1' }] }) }));
  await page.route(`${API}/api/logs**`, route => {
    requestedUrl = route.request().url();
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, entries: [{ ts: '2026-07-14T12:00:00Z', event: 'conversation.created', status: 'ok', request_id: 'req-safe-123' }] }) });
  });
  await page.addInitScript(() => localStorage.setItem('vision_token', 'token-u1'));
  await page.goto(NEXT_URL);
  await page.locator('a[data-feature="logs"]').click();
  await expect(page.locator('#vcLogList')).toContainText('conversation.created');
  await expect(page.locator('#vcLogList')).toContainText('req-safe-123');
  await expect(page.locator('#vcLogStatus')).toHaveAttribute('data-state', 'success');
  expect(requestedUrl).toContain('project_id=p1');
  await expect(page.locator('#vcLogList')).not.toContainText('u1@example.com');
});

test('Mission history exposes explicit empty and error states', async ({ page }) => {
  // limit=5 is the right-sidebar's own compact fetch (renderAtomicSidebarExtras,
  // fires on every Chat-tab entry) — kept separate from the Missions tab's own
  // limit=20 call sequence below so it doesn't shift call counts.
  await page.route(`${API}/api/mission/timeline?limit=5`, route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"entries":[]}' }));
  let calls = 0;
  await page.route(`${API}/api/mission/timeline?limit=20`, route => {
    calls++;
    route.fulfill(calls === 1
      ? { status: 200, contentType: 'application/json', body: '{"ok":true,"entries":[]}' }
      : { status: 500, contentType: 'application/json', body: '{"ok":false,"error":"timeline_unavailable"}' });
  });
  await page.goto(NEXT_URL);
  await page.locator('a[data-feature="missions"]').click();
  await expect(page.locator('#vcMissionHistoryList')).toHaveAttribute('data-state', 'empty');
  await page.locator('a[data-feature="chat"]').click();
  await page.locator('a[data-feature="missions"]').click();
  await expect(page.locator('#vcMissionHistoryList')).toHaveAttribute('data-state', 'error');
});
