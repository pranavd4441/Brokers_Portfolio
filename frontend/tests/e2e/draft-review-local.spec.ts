import { randomBytes } from 'node:crypto';
import { expect, test } from '@playwright/test';

// Explicit opt-in. Real local API, isolated QA tenant, no WhatsApp messages sent.
test('local backend: create private draft, correct, publish, resolve and prepare sharing', async ({ page, request, baseURL }, info) => {
  test.skip(process.env.RUN_LOCAL_INTEGRATION !== '1' || info.project.name !== 'desktop-chromium', 'Requires explicitly enabled local backend integration');
  expect(new URL(baseURL!).hostname).toMatch(/^(localhost|127\.0\.0\.1)$/);
  test.setTimeout(120_000);
  const email = `ui-reference-${Date.now()}@example.test`;
  const password = `LocalQA!${randomBytes(12).toString('hex')}`;
  const registration = await request.post('/api/auth/register/', { data: { name: 'UI QA Broker', company_name: 'UI QA only — not customer inventory', email, password, phone: '+910000000000', preferred_locale: 'en', dpdp_consent: true, marketing_consent: false } });
  expect(registration.status()).toBe(201);
  const account = await registration.json();
  const headers = { Authorization: `Bearer ${account.access}` };
  const creation = await request.post('/api/properties/', { headers, data: { title: 'QA only — Baner draft', description: 'Local integration test. Not an actual property offer.', price: '9800000.00', property_type: 'APARTMENT', status: 'DRAFT', area: 'Baner', city: 'Pune', bhk: 2, square_feet: '1120.00', location_address: 'QA PRIVATE ADDRESS — must not be public' } });
  expect(creation.status()).toBe(201);
  const property = await creation.json();
  try {
    const privatePage = await request.get(`/api/sharing/public/${property.slug}/`);
    // Existing resolver explicitly returns Gone for non-public listing states.
    expect(privatePage.status()).toBe(410);
    expect(await privatePage.text()).not.toContain(property.title);
    await page.goto('/auth/login');
    await page.getByRole('textbox', { name: 'Email address' }).fill(email);
    await page.getByRole('textbox', { name: 'Password' }).fill(password);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await page.goto(`/dashboard/properties/${property.id}/review`);
    await page.getByLabel('Property title').fill('QA only — corrected Baner draft');
    await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    await expect(page.getByText('Draft saved · still private')).toBeVisible();
    const saved = await (await request.get(`/api/properties/${property.id}/`, { headers })).json();
    expect(saved.status).toBe('DRAFT');
    expect(saved.title).toBe('QA only — corrected Baner draft');
    // A synthetic one-pixel fixture tests local upload plumbing, not photo quality.
    await page.getByLabel('Choose a photo').setInputFiles({ name: 'qa-upload.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jT1kAAAAASUVORK5CYII=', 'base64') });
    await page.getByRole('button', { name: 'Upload photo', exact: true }).click();
    await expect(page.getByText('Photo uploaded', { exact: true })).toBeVisible();
    expect((await (await request.get(`/api/properties/${property.id}/`, { headers })).json()).images).toHaveLength(1);
    await page.getByRole('button', { name: 'Approve and publish' }).click();
    await page.getByRole('button', { name: 'Publish property', exact: true }).click();
    await expect(page.getByText('Published. Ready to share.')).toBeVisible();
    const publicResponse = await request.get(`/api/sharing/public/${property.slug}/`);
    expect(publicResponse.status()).toBe(200);
    expect(await publicResponse.text()).not.toContain('QA PRIVATE ADDRESS');
    const shared = await request.post('/api/sharing/links/', { headers, data: { property: property.id } });
    expect(shared.ok()).toBeTruthy();
    const link = await shared.json();
    expect(link.whatsapp_share_text).toContain('QA only');
    expect(link.whatsapp_share_text).not.toContain('%F0%');
    expect(link.full_share_url).toContain('/p/');
  } finally {
    // Only the listing created by this test is removed. Test tenant is retained for audit.
    expect((await request.delete(`/api/properties/${property.id}/`, { headers })).status()).toBe(204);
  }
});
