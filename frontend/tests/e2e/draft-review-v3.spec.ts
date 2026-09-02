import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { draftForm, draftPayload, validateDraft, type DraftProperty } from '../../src/lib/draft-review';

// Deterministic UI failure tests. These do not establish live WhatsApp delivery.
const initial: DraftProperty = {
  id: 'review-qa', title: '2 BHK Apartment in Baner', price: '9800000.00',
  description: 'Well-kept apartment with balcony and covered parking.',
  property_type: 'APARTMENT', status: 'DRAFT', source: 'WHATSAPP',
  area: 'Baner', city: 'Pune', bhk: 2, square_feet: 1120, images: [],
  intake_metadata: { extraction_source: 'RULES', reviewed: false, missing_fields: [], raw_details: '2 BHK apartment in Baner, Pune. Price 98 lakh. 1120 sq ft. Balcony and parking.' },
};
test.beforeEach(async ({ page }) => {
  let property = structuredClone(initial);
  await page.addInitScript(() => { localStorage.setItem('propertyos_access_token', 'test-only'); localStorage.setItem('propertyos_refresh_token', 'test-only'); });
  await page.route('**/api/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    let body: unknown = {};
    if (pathname.endsWith('/auth/me/')) body = { id: 'qa', name: 'QA Broker', role: 'OWNER', tenant: { id: 'qa', name: 'QA reference workspace', theme_mode: 'LIGHT', brand_color: '#304e40' } };
    else if (pathname.endsWith('/properties/review-qa/publish/')) { property.status = 'AVAILABLE'; body = property; }
    else if (pathname.endsWith('/properties/review-qa/')) {
      if (route.request().method() === 'PATCH') property = { ...property, ...route.request().postDataJSON() };
      body = property;
    } else if (pathname.endsWith('/properties/')) body = [property];
    await route.fulfill({ json: body });
  });
});

test('validate draft values without inventing optional facts', () => {
  const form = draftForm(initial);
  expect(validateDraft(form)).toEqual({});
  expect(validateDraft({ ...form, title: 'WhatsApp property draft', price: '0', city: '', square_feet: '-2', bhk: '1.5' })).toMatchObject({ title: 'placeholderError', price: 'numberError', city: 'requiredError', square_feet: 'numberError', bhk: 'numberError' });
  expect(draftPayload({ ...form, bhk: '', square_feet: '' })).toMatchObject({ bhk: null, square_feet: null });
  expect(draftPayload(form)).not.toHaveProperty('status');
});

test('corrections survive save failure; publish requires a separate confirmation', async ({ page }) => {
  await page.goto('/dashboard/properties/review-qa/review');
  await page.getByLabel('Property title').fill('Corrected Baner apartment');
  await expect(page.getByRole('button', { name: 'Approve and publish' })).toBeDisabled();
  await page.route('**/api/properties/review-qa/', async (route) => {
    if (route.request().method() === 'PATCH') await route.fulfill({ status: 503, json: { detail: 'Test: server unavailable' } });
    else await route.fallback();
  });
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByText('Test: server unavailable')).toBeVisible();
  await expect(page.getByLabel('Property title')).toHaveValue('Corrected Baner apartment');
  await expect(page.getByText('Draft saved · still private')).toHaveCount(0);
  await page.unroute('**/api/properties/review-qa/');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByText('Draft saved · still private')).toBeVisible();
  await page.getByRole('button', { name: 'Approve and publish' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('Published. Ready to share.')).toHaveCount(0);
  await page.getByRole('button', { name: 'Keep reviewing' }).click();
  await expect(page.getByRole('button', { name: 'Approve and publish' })).toBeFocused();
  await page.getByRole('button', { name: 'Approve and publish' }).click();
  await page.getByRole('button', { name: 'Publish property', exact: true }).click();
  await expect(page.getByText('Published. Ready to share.')).toBeVisible();
});

test('missing fields focus the control and upload failures retain the selection', async ({ page, isMobile }) => {
  await page.goto('/dashboard/properties/review-qa/review');
  await page.getByLabel('City', { exact: false }).fill('');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByLabel('City', { exact: false })).toBeFocused();
  await expect(page.getByLabel('City', { exact: false })).toHaveAttribute('aria-invalid', 'true');
  await page.getByLabel('City', { exact: false }).fill('Pune');
  if (isMobile) await page.locator('summary').click();
  await page.route('**/api/properties/review-qa/images/', (route) => route.fulfill({ status: 503, json: { detail: 'Test upload unavailable' } }));
  await page.getByLabel('Choose a photo').setInputFiles({ name: 'test-pixel.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jT1kAAAAASUVORK5CYII=', 'base64') });
  await page.getByRole('button', { name: 'Upload photo', exact: true }).click();
  await expect(page.getByText('Upload failed. Your selected file is kept; retry when connected.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Upload photo', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Approve and publish' })).toBeDisabled();
  await page.getByRole('button', { name: 'Clear selected photo' }).click();
  await expect(page.getByRole('button', { name: 'Approve and publish' })).toBeEnabled();
});

test('review is responsive and accessible in both themes and all three languages', async ({ page }, info) => {
  test.setTimeout(180_000);
  for (const theme of ['LIGHT', 'DARK']) {
    for (const locale of ['en', 'hi', 'mr']) {
      await page.addInitScript(({ theme, locale }) => { localStorage.setItem('propertyos_theme_preview', theme); localStorage.setItem('propertyos_locale', locale); }, { theme, locale });
      await page.goto('/dashboard/properties/review-qa/review');
      await expect(page.locator('[data-ui-reference="inventory-review-v3"]')).toBeVisible();
      await expect(page.locator('#draft-title')).toHaveValue(initial.title);
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme.toLowerCase());
      for (const width of info.project.name.includes('android') ? [360, 390, 430] : [768, 1024, 1440, 1920]) {
        await page.setViewportSize({ width, height: 1000 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      }
      await page.setViewportSize({ width: info.project.name.includes('android') ? 390 : 1440, height: 1000 });
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.screenshot({ path: `output/playwright/review-v3-${theme}-${locale}-${info.project.name}.png`, fullPage: true });
    }
  }
});
