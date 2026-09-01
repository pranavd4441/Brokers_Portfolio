import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const importedDraft = {
  id: '42',
  title: '2 BHK Apartment in Baner',
  description: 'Well-kept apartment near Baner High Street.',
  price: 9800000,
  property_type: 'APARTMENT',
  status: 'DRAFT',
  source: 'WHATSAPP',
  area: 'Baner',
  city: 'Pune',
  bhk: 2,
  square_feet: 1120,
  amenities: [],
  images: [],
  intake_metadata: {
    extraction_source: 'RULES',
    missing_fields: [],
    suggested_fields: ['photos'],
    raw_details: '2 BHK apartment, Baner Pune, 98 lakh, 1120 sq ft.',
    reviewed: true,
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const broker = {
  id: '7',
  name: 'Rajesh Mehta',
  email: 'rajesh@example.test',
  phone: '+919000000002',
  role: 'OWNER',
  tenant: {
    id: '3',
    name: 'Royal Realty',
    logo_url: '/missing-broker-logo.png',
    brand_color: '#2563eb',
    whatsapp_default_number: '+919000000002',
    subscription_plan: 'FOUNDING',
    plan_status: 'TRIAL',
    pilot_ends_at: '2026-09-14T00:00:00Z',
    referral_code: 'ROYAL3',
    preferred_locale: 'en',
    theme_mode: 'LIGHT',
  },
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('propertyos_access_token', 'test-access-token');
    window.localStorage.setItem('propertyos_refresh_token', 'test-refresh-token');
  });

  await page.route('**/api/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    let body: unknown = {};

    if (pathname.endsWith('/auth/me/')) body = broker;
    else if (pathname.endsWith('/properties/42/')) body = importedDraft;
    else if (pathname.endsWith('/properties/')) body = [importedDraft];
    else if (pathname.endsWith('/whatsapp/sessions/')) body = [];
    else if (pathname.endsWith('/whatsapp/connection/')) {
      body = {
        provider: 'MOCK',
        configured: false,
        intake_number: '',
        broker_phone: broker.phone,
        supported_inputs: ['text', 'image', 'audio'],
      };
    }

    await route.fulfill({ json: body });
  });
});

test('WhatsApp inventory stays private through broker review', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/dashboard/properties/imports', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: 'WhatsApp Imports' })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Broker-controlled publishing')).toBeVisible();
  await expect(page.getByText(importedDraft.title, { exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Private draft · not visible to buyers')).toBeVisible();
  await expect(page.getByText('Real WhatsApp connection is not configured yet')).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  await page.getByRole('link', { name: 'Review draft' }).click();
  await expect(page).toHaveURL(/\/dashboard\/properties\/42\/review/, { timeout: 30_000 });
  await expect(page.getByRole('heading', { name: 'Review before publishing' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Approve and publish' })).toBeEnabled();
  await expect(page.getByText('PropertyOS will never publish this WhatsApp import silently.')).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
