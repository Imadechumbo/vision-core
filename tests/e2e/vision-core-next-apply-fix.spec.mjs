// Temp spec: Apply-Fix panel (Tools feature) — verifica HTML, double confirmation e contrato real
// Deletar após confirmar que passa em CI

import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3001';
const PATH = '/vision-core-next.html';

test.describe('Apply Fix (Tools)', () => {

  test('1 — form elements exist and are hidden by default', async ({ page }) => {
    await page.goto(BASE + PATH);
    const form = page.locator('#vcApplyFixForm');
    await expect(form).toBeHidden();
    await expect(page.locator('#vcApplyFixFile')).toBeHidden();
    await expect(page.locator('#vcApplyFixLine')).toBeHidden();
    await expect(page.locator('#vcApplyFixContent')).toBeHidden();
    await expect(page.locator('#vcApplyFixConfirm')).toBeHidden();
    await expect(page.locator('#vcApplyFixActions')).toBeHidden();
    await expect(page.locator('#vcApplyFixStatus')).toBeHidden();
  });

  test('2 — clicking Tools nav shows the form', async ({ page }) => {
    await page.goto(BASE + PATH);
    await page.locator('[data-feature="tools"]').click();
    await expect(page.locator('#vcApplyFixForm')).toBeVisible();
    await expect(page.locator('#vcApplyFixForm h4')).toHaveText(/Apply Fix/);
    await expect(page.locator('#vcApplyFixFile')).toBeVisible();
    await expect(page.locator('#vcApplyFixLine')).toBeVisible();
    await expect(page.locator('#vcApplyFixContent')).toBeVisible();
    await expect(page.locator('#vcApplyFixConfirm')).toBeVisible();
  });

  test('3 — prepare button disabled until fields filled', async ({ page }) => {
    await page.goto(BASE + PATH);
    await page.locator('[data-feature="tools"]').click();
    const prepareBtn = page.locator('#vcApplyFixActions button');
    await expect(prepareBtn).toBeDisabled();
    await page.locator('#vcApplyFixFile').fill('test.txt');
    await expect(prepareBtn).toBeDisabled();
    await page.locator('#vcApplyFixLine').fill('1');
    await expect(prepareBtn).toBeDisabled();
    await page.locator('#vcApplyFixContent').fill('fixed line');
    await expect(prepareBtn).toBeEnabled();
  });

  test('4 — double confirmation flow', async ({ page }) => {
    await page.goto(BASE + PATH);
    await page.locator('[data-feature="tools"]').click();
    await page.locator('#vcApplyFixFile').fill('test.txt');
    await page.locator('#vcApplyFixLine').fill('5');
    await page.locator('#vcApplyFixContent').fill('console.log("fixed");');
    await page.locator('#vcApplyFixActions button').click();
    await expect(page.locator('#vcApplyFixStatus')).toContainText('Confirme');
    const confirmBtn = page.locator('#vcApplyFixActions button').first();
    await expect(confirmBtn).toBeDisabled();
    await page.locator('#vcApplyFixConfirm').fill('APLICAR FIX');
    await expect(confirmBtn).toBeEnabled();
    await expect(confirmBtn).toContainText('APLICAR FIX em test.txt');
  });

  test('5 — cancel resets confirmation', async ({ page }) => {
    await page.goto(BASE + PATH);
    await page.locator('[data-feature="tools"]').click();
    await page.locator('#vcApplyFixFile').fill('test.txt');
    await page.locator('#vcApplyFixLine').fill('5');
    await page.locator('#vcApplyFixContent').fill('fixed');
    await page.locator('#vcApplyFixActions button').click();
    await expect(page.locator('#vcApplyFixStatus')).toContainText('Confirme');
    await page.locator('#vcApplyFixActions button').filter({ hasText: 'Cancelar' }).click();
    await expect(page.locator('#vcApplyFixStatus')).toHaveText('');
    await expect(page.locator('#vcApplyFixActions button')).toHaveText('Preparar Apply Fix');
  });

});
