# UI implementation status

Updated: 2026-09-02. Current pass: **Workspace v4 — shared shell, Today, Listings and Leads**.

## Current implementation and preview

The three core workspace screens have now been changed in application code and verified in the running local production build. Figma was explicitly skipped. This is a working visual reference awaiting user review, not an assertion that the entire application is redesigned or production-ready.

- Preview: `http://localhost:3100/dashboard`, `/dashboard/properties`, `/dashboard/leads`.
- Final build ID: `HfvaVv6N2T6miZMROql6p`, served on port 3100 after a successful production build including TypeScript checking.
- Existing APIs, authentication, tenant branding and backend records are retained. This pass makes no backend/schema changes, commits, pushes or deployments. Earlier staged and unstaged work remains intact.
- Installed shadcn/Base UI primitives were reused rather than replacing the design system. Registry access failed certificate verification; verification was not disabled, and no new production package dependencies were installed.
- Self-hosted Inter and Noto Sans Devanagari were added with their SIL Open Font License files. Sources: the official `rsms/inter` and `google/fonts` repositories. Runtime fonts no longer depend on those external hosts.

| Surface | Current implementation | Verification |
| --- | --- | --- |
| Shared dashboard shell | Compact 224px desktop navigation, quieter selected states, broker monogram/logo fallback, restrained pilot badge, mobile four-item navigation, labelled preferences and selection states | Desktop/mobile, Light/Dark, keyboard and automated accessibility |
| Today | Metric strip, prioritized next actions, recent enquiries, compact inventory overview and honest zero-activity state | Real local GET data; Today-to-specific-lead deep link; all supported locales |
| Listings | Photo-led flat cards, compact search/filters, conditional WhatsApp draft strip, honest connection state, smaller missing-photo treatment on mobile | Real local GET data; search and status filtering; no-match state; existing action handlers retained |
| Leads | Dense list, list/pipeline switch, stage filtering, responsive buyer-detail panel, labelled editing fields | Search, stage filter, pipeline switch, specific-lead opening, focus return, intercepted save failure, fetch failure/retry |

### Final-build checks

- `npm run build`: passed. `npm run lint`: zero errors and six existing warnings in legacy files. `git diff --check`: passed.
- `npm run test:ui`: all nine component stories passed. A sandboxed attempt failed to spawn esbuild; the permitted browser-capable rerun completed successfully.
- Twelve final-build route/theme/viewport combinations passed: Today, Listings and Leads × Light/Dark × 390/1440px. No page-level horizontal overflow or automated WCAG A/AA violations in the checked states.
- Twenty-four additional Light-theme localization/layout checks passed: the same three routes × Hindi/Marathi × 360/430/1024/1440px. Representative screenshots were visually inspected. Native-speaker review is still required; automated fit checks do not establish translation quality.
- The selected lead row initially failed text contrast. Its muted text now uses the foreground token while selected; the final panel accessibility check passed. The preferences dialog check also passed.
- Failure checks intercepted one PATCH before it reached the backend, verified the edited notes remained available for retry, then reloaded and confirmed the original notes were unchanged. A mocked GET failure displayed the error state; retry recovered using the real local API. Interceptions were removed afterward.
- No real save, delete, duplicate, publish, WhatsApp send or other customer-data mutation was executed by this pass's UI checks. Dataset counts and listing statuses are live responses, not fixed visual fixtures.
- The existing seeded broker-logo URL returns 404; the broker-initial fallback displays correctly. Most existing listings have no photography, and one seeded image is a plain-colour fixture. No reference photography or invented property information was inserted into the inventory.

### Current screenshot index

All are actual browser captures under `frontend/output/playwright/`, not generated concepts:

- `v4-today-light-1440-viewport.png`, `v4-inventory-light-1440-viewport.png`, `v4-leads-light-1440-viewport.png`.
- Corresponding `light-390-viewport.png` mobile files and `dark-1440-viewport.png` / `dark-390-viewport.png` files.
- Hindi and Marathi examples use `hi-360-viewport.png`, `hi-1440-viewport.png`, `mr-360-viewport.png` and `mr-1440-viewport.png` suffixes.
- `v4-lead-detail-final-390.png` shows the final buyer-detail panel.

### Remaining scope

WhatsApp imports/conversations, create/edit/review/detail studios, onboarding, branding/profile, plan/referrals, public property/marketing/auth/support/legal pages have **not** received this v4 route-layout migration. They inherit the shared shell or primitives where applicable; that is not equivalent to route completion. The earlier draft-review work is retained below as historical evidence. The broker storefront remains unimplemented.

Next migration target: the WhatsApp import → review → listing studio journey, using these shared components, after user review of the working direction. Preserve the existing ingestion and publishing behavior; do not replace it with design-only fixtures.

Release gates remain: representative permissioned property photography; native-language review; real Android and WhatsApp Business checks; actual inbound/outbound WhatsApp integration; successful complete publish/share/enquiry/follow-up regression; slow-network/performance/large-text checks; remaining route migration; security, legal, monitoring and backup review. The existing ShareModal and native destructive confirmations are not modernized in this pass. Theme/locale preview controls retain the existing persistence behavior; tenant-level settings are not newly implemented here.

## Earlier reference pass — retained historical record

The sections below describe the **previous** Listings + draft-review pass and its then-current gaps. They do not override the current v4 coverage above.

## Baseline and scope

- Branch: `codex/propertyos-ui-reset-v2`; HEAD `cbd687b`. Existing staged work is preserved. No commit, push or deployment in this pass.
- Verified processes: Next production server on 3100 and Django on 8000 both resolve to this checkout.
- Read-only baseline uses the repository's seeded local development account, not customer data. Actual API data: 9 listings, one WhatsApp draft (property 26). No fixtures intercept these baseline requests.
- In-app browser connection failed before bootstrap. Installed isolated Playwright CLI fallback works. Registry CLI failed certificate verification; TLS verification remains enabled. Reuse installed primitives and local extensions, no preset/dependency reset.
- User supplied five reference JPEGs during this pass. Adopt photo hierarchy, warm neutral surfaces, useful spacing, clear headings and restrained actions; the last reference (Instagram.jpg/HomeLuxe) is closest to the agreed warm direction. These are inspiration, not assets to copy or implemented-UI approval. The Pinterest short link could not be opened; attached images are available. No ratings, booking calendars, invented costs or reference photos become product data.

## Iteration 1: observable defects

1. Missing-image inventory cards reserve large empty photo panels and show photo gradients without photos. Acceptance: compact honest no-photo state, no gradient over an empty panel, useful facts visible earlier.
2. Important inventory metadata is 11–12px and draft work is hidden in the grid. Acceptance: 14px working facts, 12–13px secondary text, explicit review priority and WhatsApp/manual entry paths.
3. Draft review is read-only, source details below the fold, correction links return to the legacy form. Acceptance: source and editable facts coexist on desktop, mobile stacks logically, validated save preserves the private state, publish is explicit and server-confirmed.

Baseline screenshots in `frontend/output/playwright/`: `before-inventory-desktop.png`, `before-review-desktop.png`, `before-review-mobile.png`.

## Route coverage (not equivalent to approval)

| Route | Implemented in this pass | Visually accepted | Locally integration-tested this pass | Production-ready |
| --- | --- | --- | --- | --- |
| `/dashboard/properties` | Reference candidate | No | GET baseline; action failures mocked | No |
| `/dashboard/properties/[id]/review` | Reference candidate | No | Save/upload/publish/public resolve/share-link with real local API | No |
| `/dashboard/properties/imports` | Existing, unchanged | No | Not yet | No |
| `/dashboard/properties/new`, `/dashboard/properties/[id]/edit`, `/dashboard/properties/[id]` | Existing, not migrated | No | Not tested | No |
| `/dashboard`, `/dashboard/chats` | Earlier staged changes, unchanged this pass | No | Not tested | No |
| `/dashboard/leads`, `/dashboard/onboarding`, `/dashboard/settings`, `/dashboard/settings/profile`, `/dashboard/growth` | Existing, not migrated | No | Not tested | No |
| `/`, `/auth/login`, `/auth/signup`, `/p/[slug]` | Existing, not migrated | No | Login baseline only | No |
| `/support`, `/privacy`, `/terms`, `/refund` | Existing, not migrated | No | Not tested | No |
| `/b/[public_slug]` | Not implemented | No | Not tested | No |

## Separate release gates

- User visual approval of this working reference before broad migration.
- Native-speaker Hindi/Marathi review, actual Android/WhatsApp Business tests, live inbound media/audio and outbound delivery, public deployment/domain.
- Complete local create → upload → draft → publish → share → enquiry → follow-up, tenant/privacy/security, performance measurement, monitoring/backups and legal review.
- Mocked browser tests may establish component behavior, never live-service integration or market readiness.

## Iteration results

- Listings: WhatsApp/manual entry paths, honest connection status, actionable draft queue, readable property facts and rupee prices, compact missing/broken-photo fallback. Existing duplicate/delete/share operations retained; unavailable listings cannot be shared from these cards.
- Review: source and editable facts side-by-side on desktop; source/photos expandable on mobile; validated fields, explicit save, retained corrections on network failure, single-image upload/retry/removal, separate publish confirmation, server-confirmed success. Numeric API IDs normalized for cache updates. Original manual-draft source is not labelled as WhatsApp.
- Added typed English/Hindi/Marathi inventory/review copy; user-entered content unchanged. Native-speaker review pending.
- Installed shadcn/Base UI Field, Input, NativeSelect, Card, Alert and Dialog reused; local Textarea companion and PropertyPhoto fallback added. No new production dependencies or global theme reset.
- Public resolver now omits `intake_metadata`: original source messages may contain owner numbers and exact locations. Authenticated broker detail still returns it. Covered by a new backend regression test. No schema migration.
- Iteration 2 corrected no-photo card stretching, excessive mobile pre-form content, and source labelling. Accessibility check caught 4.25:1 metadata contrast on the tinted draft row; changed it to the foreground token and reran the failing checks.

### Verification evidence

- Final frontend production build succeeded; build ID `5y5q42vGI0-zGG5d0L3cy`, served on port 3100. Backend restarted on 8000 with the privacy fix.
- Lint: 0 errors, 6 existing warnings in legacy edit/settings/PropertyCard and navigation helpers. Component tests: 5 passed.
- Backend: 12 passed across WhatsApp flow, tenant isolation, property lifecycle and public-source privacy.
- Full browser run: 18 passed, 1 skipped, 3 failed initially. Failures were the test's incorrect 404 expectation (documented private-state API returns 410) and Light-theme contrast on desktop/mobile. Corrected expectation and actual UI contrast; targeted rerun recorded separately below. Do not describe the earlier full run as green.
- Targeted final-build rerun: all 3 previously failing checks passed (real local journey and Light workspace desktop/mobile). Other 18 checks passed on the preceding build; a complete final-build rerun remains a separate gate.
- Review regression checks cover validation focus, pending publish gating, failed-save value retention, upload-failure retry selection, cancel/confirm publish and focus restoration; both themes and all 3 locales at 360/390/430 and 768/1024/1440/1920 widths, plus automated accessibility. This is emulation, not real-device certification.
- Real local integration passed: isolated QA account; API creates a MANUAL private draft, browser corrects/saves/uploads a synthetic PNG/publishes; zero-auth resolver hides exact address; share API returns readable text. This does not prove WhatsApp ingestion, photo quality, delivery to another phone, buyer enquiry or follow-up. WhatsApp ingestion is separately exercised by isolated backend tests with gateway mocks.
- Only test-created listings 27 and 28 were removed during cleanup; no existing inventory changed. QA tenant/account records retained for audit. Local test-image files may remain because existing API deletion does not delete storage objects.
- Actual local screenshots: `frontend/output/playwright/before-inventory-desktop.png`, `before-review-desktop.png`, `before-review-mobile.png`, `after-inventory-desktop.png`, `after-inventory-mobile.png`, `after-review-desktop.png`, `after-review-mobile.png`. Final contrast correction is minor and subsequent fixture screenshots reflect it. No approved image regression baseline exists.
- Most seeded inventory lacks real photos; one existing image is a plain-colour fixture. User reference photography was not copied into product data. Photo-led visual acceptance still needs representative permissioned photography.

## User feedback and next checkpoint

User supplied a screenshot of `/dashboard` (Today) and reported no UI change. **Today and the shared navigation were intentionally not changed in this pass.** This is a scope/expectation mismatch, not evidence of a stale cache. Do not ask the user to refresh as the design solution. Existing shell labels are partly localized while Today content remains English.

The reference has NOT been visually accepted. The user's main concern remains the visual composition of Today and the shared shell. Pause broad rollout; explicitly agree that the next visual review target is that screen/shell, using the supplied images as inspiration rather than treating workflow improvements as a completed visual redesign.

Still unverified: browser zoom/large-text pass, performance budgets/slow-network measurements, full final-build regression after targeted fixes, real Android/WhatsApp Business/live webhook/audio delivery, complete enquiry/follow-up journey, public-domain sharing, native-language review, legal/monitoring/backups. Shared ShareModal and native destructive confirmations remain older implementations. These are not production-ready claims.
