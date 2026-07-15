// @ts-check
/**
 * Vision Core Next - Conta (email/senha) in Settings.
 * All API calls are mocked via page.route(); this spec must never touch the
 * real backend or any host outside localhost.
 *
 * PERMANENT SPEC: email/senha + OAuth Google/GitHub. OAuth is a full-page
 * redirect that must return to Next with #oauth-success/#oauth-error and reuse
 * the same localStorage['vision_token'] contract as email/senha.
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
  await page.route(`${API}/api/projects`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, projects: [] }) }));
});

async function openSettings(page) {
  await page.locator('a[data-feature="settings"]').click();
}

test('Conta shows the login/register form by default, no token stored', async ({ page }) => {
  await page.goto(NEXT_URL);
  await openSettings(page);
  await expect(page.locator('#vcAccountForm')).toBeVisible();
  await expect(page.locator('#vcAccountLogged')).toBeHidden();
  await expect(page.locator('#vcGoogleOAuthBtn')).toHaveAttribute('href', `${API}/api/auth/oauth/google?return_to=next`);
  await expect(page.locator('#vcGithubOAuthBtn')).toHaveAttribute('href', `${API}/api/auth/oauth/github?return_to=next`);
  expect(await page.evaluate(() => window.localStorage.getItem('vision_token'))).toBeNull();
});

test('register: posts email+password, stores token, switches to logged-in state', async ({ page }) => {
  let body = null;
  await page.route(`${API}/api/auth/register`, (route) => {
    body = JSON.parse(route.request().postData() || '{}');
    route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ ok: true, user: { id: 'u1', email: body.email, plan: 'free' }, token: 'tok-abc123' })
    });
  });
  await page.goto(NEXT_URL);
  await openSettings(page);
  await page.locator('#vcAccountEmail').fill('nova@example.com');
  await page.locator('#vcAccountPassword').fill('senha12345');
  await page.locator('#vcAccountRegisterBtn').click();

  await expect(page.locator('#vcAccountLogged')).toBeVisible();
  await expect(page.locator('#vcAccountForm')).toBeHidden();
  await expect(page.locator('#vcAccountCopy')).toHaveText('Logado como nova@example.com.');
  expect(body.email).toBe('nova@example.com');
  expect(body.password).toBe('senha12345');
  expect(await page.evaluate(() => window.localStorage.getItem('vision_token'))).toBe('tok-abc123');
});

test('login failure (invalid_credentials): shows readable error, never stores a token', async ({ page }) => {
  await page.route(`${API}/api/auth/login`, (route) =>
    route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'invalid_credentials' }) }));
  await page.goto(NEXT_URL);
  await openSettings(page);
  await page.locator('#vcAccountEmail').fill('user@example.com');
  await page.locator('#vcAccountPassword').fill('wrong-password');
  await page.locator('#vcAccountLoginBtn').click();

  await expect(page.locator('#vcAccountStatus')).toHaveText(/invalid_credentials/);
  await expect(page.locator('#vcAccountForm')).toBeVisible();
  expect(await page.evaluate(() => window.localStorage.getItem('vision_token'))).toBeNull();
});

test('already has a token on load: calls /api/auth/me and renders logged-in state without showing the form first', async ({ page }) => {
  await page.route(`${API}/api/auth/me`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, user: { id: 'u1', email: 'existente@example.com', plan: 'free' } }) }));
  await page.addInitScript(() => window.localStorage.setItem('vision_token', 'tok-existing'));
  await page.goto(NEXT_URL);
  await openSettings(page);

  await expect(page.locator('#vcAccountLogged')).toBeVisible();
  await expect(page.locator('#vcAccountCopy')).toHaveText('Logado como existente@example.com.');
  await expect(page.locator('#vcUserMenu')).toBeVisible();
  await expect(page.locator('#vcUserName')).toHaveText('existente');
  await expect(page.locator('#vcUserAvatar')).toHaveText('E');
});

test('persistent user menu opens Settings and official logout immediately restores the visitor Hero', async ({ page }) => {
  let logoutCalled = false;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route(`${API}/api/auth/me`, route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, user: { id: 'u1', name: 'Imadechumbo', email: 'owner@example.com', plan: 'free' } }) }));
  await page.route(`${API}/api/auth/logout`, async route => {
    logoutCalled = true;
    await new Promise(resolve => setTimeout(resolve, 500));
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, message: 'logged_out' }) });
  });
  await page.route(`${API}/api/chat`, route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, answer: 'Resposta.' }) }));
  await page.addInitScript(() => {
    localStorage.setItem('vision_token', 'tok-existing');
    sessionStorage.setItem('vc_active_project', JSON.stringify({ user_id: 'u1', project_id: 'old' }));
  });
  await page.goto(NEXT_URL);

  await expect(page.locator('#vcUserMenu')).toBeVisible();
  await expect(page.locator('#vcUserName')).toHaveText('Imadechumbo');
  await page.locator('#vcPrompt').fill('Mensagem autenticada');
  await page.locator('#vcComposer').evaluate(form => form.requestSubmit());
  await expect(page.locator('#vcChatOnboarding')).toBeHidden();
  await expect(page.locator('#vcUserMenu')).toBeVisible();

  await page.locator('#vcUserMenu summary').click();
  await expect(page.locator('#vcUserAccount')).toBeVisible();
  await expect(page.locator('#vcUserSettings')).toBeVisible();
  await expect(page.locator('#vcUserLogout')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.locator('#vcUserSettings').click();
  await expect(page.locator('a[data-feature="settings"]')).toHaveClass(/is-active/);
  await page.locator('a[data-feature="chat"]').click();
  await page.locator('#vcUserMenu summary').click();
  await page.locator('#vcUserLogout').click();

  await expect(page.locator('#vcUserMenu')).toBeHidden();
  await expect(page.locator('#vcChatOnboarding')).toBeVisible();
  await expect(page.locator('#vcChatOnboarding')).toHaveAttribute('data-state', 'visitor');
  await expect(page.locator('#vcOnboardingGoogle')).toBeVisible();
  await expect(page.locator('.vc-message-user')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('vision_token'))).toBeNull();
  expect(await page.evaluate(() => sessionStorage.getItem('vc_active_project'))).toBeNull();
  await expect.poll(() => logoutCalled).toBe(true);
});

test('expired/invalid stored token: /api/auth/me fails, falls back to logged-out state and clears the token', async ({ page }) => {
  await page.route(`${API}/api/auth/me`, (route) =>
    route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'not_authenticated' }) }));
  await page.addInitScript(() => window.localStorage.setItem('vision_token', 'tok-stale'));
  await page.goto(NEXT_URL);
  await openSettings(page);

  await expect(page.locator('#vcAccountForm')).toBeVisible();
  expect(await page.evaluate(() => window.localStorage.getItem('vision_token'))).toBeNull();
});

test('logout: calls /api/auth/logout, clears the token, shows the form again', async ({ page }) => {
  let logoutCalled = false;
  await page.route(`${API}/api/auth/me`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, user: { id: 'u1', email: 'existente@example.com', plan: 'free' } }) }));
  await page.route(`${API}/api/auth/logout`, (route) => {
    logoutCalled = true;
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, message: 'logged_out' }) });
  });
  await page.addInitScript(() => window.localStorage.setItem('vision_token', 'tok-existing'));
  await page.goto(NEXT_URL);
  await openSettings(page);
  await expect(page.locator('#vcAccountLogged')).toBeVisible();

  await page.locator('#vcAccountLogoutBtn').click();

  await expect(page.locator('#vcAccountForm')).toBeVisible();
  await expect(page.locator('#vcAccountLogged')).toBeHidden();
  expect(logoutCalled).toBe(true);
  expect(await page.evaluate(() => window.localStorage.getItem('vision_token'))).toBeNull();
});

test('missing email or password: shows validation message, never calls the backend', async ({ page }) => {
  let called = false;
  await page.route(`${API}/api/auth/login`, (route) => { called = true; route.fulfill({ status: 200, body: '{}' }); });
  await page.goto(NEXT_URL);
  await openSettings(page);
  await page.locator('#vcAccountLoginBtn').click();

  await expect(page.locator('#vcAccountStatus')).toHaveText(/obrigat/i);
  expect(called).toBe(false);
});

test('OAuth success hash stores the token, opens Settings, and cleans the URL hash', async ({ page }) => {
  await page.route(`${API}/api/auth/me`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, user: { id: 'u-oauth', email: 'oauth@example.com', plan: 'free' } }) }));
  await page.goto(`${NEXT_URL}#oauth-success&token=tok-oauth&plan=free&email=oauth%40example.com`);

  await expect(page.locator('a[data-feature="settings"]')).toHaveClass(/is-active/);
  await expect(page.locator('#vcAccountLogged')).toBeVisible();
  await expect(page.locator('#vcAccountCopy')).toHaveText('Logado como oauth@example.com.');
  await expect(page.locator('#vcAccountStatus')).toHaveText('OAuth conectado com sucesso.');
  expect(await page.evaluate(() => window.localStorage.getItem('vision_token'))).toBe('tok-oauth');
  expect(await page.evaluate(() => window.location.hash)).toBe('');
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.localStorage.getItem('vision_token'))).toBe('tok-oauth');
});

test('OAuth error hash opens Settings, shows a readable message, and never stores a token', async ({ page }) => {
  await page.goto(`${NEXT_URL}#oauth-error=access_denied`);

  await expect(page.locator('a[data-feature="settings"]')).toHaveClass(/is-active/);
  await expect(page.locator('#vcAccountForm')).toBeVisible();
  await expect(page.locator('#vcAccountStatus')).toHaveText(/OAuth falhou: access_denied/);
  expect(await page.evaluate(() => window.localStorage.getItem('vision_token'))).toBeNull();
  expect(await page.evaluate(() => window.location.hash)).toBe('');
});
