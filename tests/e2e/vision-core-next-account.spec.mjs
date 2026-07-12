// @ts-check
/**
 * Vision Core Next - Conta (email/senha) in Settings.
 * All API calls are mocked via page.route(); this spec must never touch the
 * real backend or any host outside localhost.
 *
 * PERMANENT SPEC: scope confirmed 2026-07-11 as email/senha only (register,
 * login, logout) — zero new backend endpoint (apiRequest() already attaches
 * Authorization: Bearer from localStorage['vision_token']). OAuth Google/
 * GitHub is a separate future step, blocked on a backend redirect-target
 * change (see docs/CURRENT_STATE.md) — this spec covers none of that.
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

async function openSettings(page) {
  await page.locator('a[data-feature="settings"]').click();
}

test('Conta shows the login/register form by default, no token stored', async ({ page }) => {
  await page.goto(NEXT_URL);
  await openSettings(page);
  await expect(page.locator('#vcAccountForm')).toBeVisible();
  await expect(page.locator('#vcAccountLogged')).toBeHidden();
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
