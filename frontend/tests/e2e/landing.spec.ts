import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('landing page supports the primary broker journey and language switcher', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });

  await expect(page.getByRole('link', { name: 'PropertyOS' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Your properties');
  await expect(page.getByRole('link', { name: 'Start free pilot' })).toBeVisible();

  await page.getByRole('button', { name: 'हिंदी' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('आपकी प्रॉपर्टी');
});

test('landing page has no automatically detectable accessibility violations', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
