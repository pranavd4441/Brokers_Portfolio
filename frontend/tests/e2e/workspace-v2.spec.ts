import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const broker = {
  id: '7',
  name: 'Rajesh Mehta',
  email: 'rajesh@example.test',
  phone: '+919000000002',
  role: 'OWNER',
  tenant: {
    id: '3',
    name: 'Royal Realty',
    logo_url: '',
    brand_color: '#17624A',
    whatsapp_default_number: '+919000000002',
    subscription_plan: 'FOUNDING',
    plan_status: 'PILOT',
    pilot_ends_at: '2026-09-14T00:00:00Z',
    referral_code: 'ROYAL3',
    preferred_locale: 'en',
    theme_mode: 'LIGHT',
  },
};

const properties = [
  {
    id: '11',
    title: 'Sunlit 3 BHK near Balewadi High Street',
    price: 17500000,
    property_type: 'APARTMENT',
    status: 'AVAILABLE',
    city: 'Pune',
    area: 'Baner',
    bhk: 3,
    square_feet: 1640,
    images: [{ id: '1', url: '/window.svg', thumbnail_url: '/window.svg' }],
    views_count: 46,
    leads_count: 8,
    source: 'MANUAL',
    created_at: '2026-09-01T10:00:00Z',
  },
  {
    id: '12',
    title: 'Garden-facing villa in Wakad',
    price: 23000000,
    property_type: 'VILLA',
    status: 'NEGOTIATION',
    city: 'Pune',
    area: 'Wakad',
    bhk: 4,
    square_feet: 2480,
    images: [{ id: '2', url: '/globe.svg', thumbnail_url: '/globe.svg' }],
    views_count: 31,
    leads_count: 5,
    source: 'MANUAL',
    created_at: '2026-08-30T10:00:00Z',
  },
  {
    id: '13',
    title: '2 BHK Apartment in Baner',
    price: 9800000,
    property_type: 'APARTMENT',
    status: 'DRAFT',
    city: 'Pune',
    area: 'Baner',
    bhk: 2,
    square_feet: 1120,
    images: [],
    views_count: 0,
    leads_count: 0,
    source: 'WHATSAPP',
    created_at: '2026-09-02T08:00:00Z',
  },
];

const leads = [
  {
    id: '21',
    buyer_name: 'Aditya Kumar',
    status: 'NEW',
    source: 'WHATSAPP_CLICK',
    property: '11',
    property_title: properties[0].title,
    created_at: '2026-09-02T07:30:00Z',
    updated_at: '2026-09-02T07:30:00Z',
  },
  {
    id: '22',
    buyer_name: 'Sunil Reddy',
    status: 'CONTACTED',
    source: 'PHONE_CLICK',
    property: '12',
    property_title: properties[1].title,
    created_at: '2026-08-28T07:30:00Z',
    updated_at: '2026-08-29T07:30:00Z',
  },
];

const sessions = [
  {
    phone_number: '+919000000002',
    state: 'IDLE',
    metadata: { title: properties[2].title, area: 'Baner' },
    temp_images: [],
    updated_at: '2026-09-02T08:15:00Z',
    messages: [
      { id: '31', direction: 'INBOUND', message_type: 'TEXT', body: 'Create a 2 BHK listing in Baner for 98 lakh.', media_url: null, timestamp: '2026-09-02T08:12:00Z' },
      { id: '32', direction: 'OUTBOUND', message_type: 'TEXT', body: 'Your private draft is ready. Review the details before publishing.', media_url: null, timestamp: '2026-09-02T08:13:00Z' },
    ],
  },
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('propertyos_access_token', 'test-access-token');
    window.localStorage.setItem('propertyos_refresh_token', 'test-refresh-token');
  });

  await page.route('**/api/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    let body: unknown = {};
    if (pathname.endsWith('/auth/me/')) body = broker;
    else if (pathname.endsWith('/auth/onboarding/')) body = { steps: [], completed: 6, total: 6, activated: true, listing_count: 3, share_count: 11 };
    else if (pathname.endsWith('/analytics/dashboard/')) {
      body = {
        summary: { total_properties: 3, total_views: 77, whatsapp_clicks: 13, phone_clicks: 6 },
        performance_chart: [
          { date: 'Mon 31', views: 4, clicks: 1 },
          { date: 'Tue 01', views: 9, clicks: 2 },
          { date: 'Wed 02', views: 14, clicks: 5 },
        ],
      };
    } else if (pathname.endsWith('/properties/')) body = properties;
    else if (pathname.endsWith('/leads/')) body = leads;
    else if (pathname.endsWith('/whatsapp/sessions/')) body = sessions;
    await route.fulfill({ json: body });
  });
});

async function checkPage(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

for (const theme of ['LIGHT', 'DARK']) {
test(`V2 ${theme} workspace stays compact, responsive, and accessible`, async ({ page, isMobile }, testInfo) => {
  test.setTimeout(180_000);
  const project = testInfo.project.name;
  await page.addInitScript((value) => localStorage.setItem('propertyos_theme_preview', value), theme);

  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Needs attention')).toBeVisible();
  await expect(page.getByText('Page views', { exact: true })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme.toLowerCase());
  await checkPage(page);
  await page.screenshot({ path: `output/playwright/workspace-v2-today-${theme}-${project}.png`, fullPage: true });

  await page.goto('/dashboard/properties', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Listings', level: 1, exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(properties[0].title, { exact: true })).toBeVisible();
  await expect(page.getByText('Create inventory from WhatsApp')).toHaveCount(0);
  await checkPage(page);
  if (isMobile) {
    const createButton = page.getByRole('link', { name: 'New listing', exact: true });
    const box = await createButton.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
  await page.screenshot({ path: `output/playwright/workspace-v2-listings-${theme}-${project}.png`, fullPage: true });

  await page.goto('/dashboard/chats', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Conversations' })).toBeVisible({ timeout: 20_000 });
  if (!isMobile) {
    await expect(page.getByRole('heading', { name: 'Select a conversation' })).toBeInViewport();
  }
  await page.getByRole('button', { name: /\+919000000002/ }).click();
  await expect(page.getByLabel('Messages with +919000000002').getByText('Your private draft is ready. Review the details before publishing.')).toBeVisible();
  await expect(page.getByText('Reply from WhatsApp. Outbound sending is not enabled in this workspace.')).toBeVisible();
  await checkPage(page);
  await page.screenshot({ path: `output/playwright/workspace-v2-conversations-${theme}-${project}.png`, fullPage: true });

  await page.setViewportSize({ width: isMobile ? 360 : 1024, height: 900 });
  await checkPage(page);
  if (isMobile) {
    await page.getByRole('button', { name: 'Back to conversations' }).click();
    await expect(page.getByRole('button', { name: /\+919000000002/ })).toBeVisible();
  }
});
}

test('conversation refresh reports a fetch failure without a success notice', async ({ page }) => {
  await page.goto('/dashboard/chats', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: /\+919000000002/ })).toBeVisible();
  await page.route('**/api/whatsapp/sessions/', (route) => route.fulfill({ status: 503, json: { detail: 'Temporarily unavailable' } }));
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.getByText('Could not refresh conversations. Please retry.')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Conversations updated', { exact: true })).toHaveCount(0);
});
