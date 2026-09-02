# PropertyOS Final UI Specification

**Status:** Approved implementation authority for the first practical UI release

**Scope:** Product interface, responsive behavior, localization, themes, states, and the minimum contracts required by the UI

**Last updated:** 2 September 2026
**Visual references:** [`propertyos-ui-concepts-2026-08-26`](../propertyos-ui-concepts-2026-08-26/) and [`DESIGN_FOUNDATION_V2.md`](./DESIGN_FOUNDATION_V2.md)

## 1. Purpose and authority

This document is the single source of truth for the next PropertyOS UI implementation. It converts the generated visual concepts into a mobile-first MVP that can be built from the current Django and Next.js application, with a narrowly defined schema expansion for broker profiles, theme selection, and a public broker storefront.

When a concept image, existing screen, old product document, or implementation detail conflicts with this specification, this specification wins for UI behavior. Existing API and model behavior remains authoritative for data until an addition in [Section 14](#14-minimum-interface-contracts-not-yet-implemented) is implemented and tested.

This is a UI specification, not an authorization to change application code, database models, production configuration, or legal copy. The generated images remain references; they are not pixel-perfect requirements.

### 1.1 Approved visual direction

The implementation uses the **Quiet Estate** direction defined in `DESIGN_FOUNDATION_V2.md`: quiet confidence, operational clarity, and human trust. Its operating principle is **luxury outside, efficiency inside**.

- The authenticated broker workspace is compact, information-dense, and action-led. It must not resemble a marketing landing page or use oversized titles, banners, and cards to fill space.
- Public property pages are image-led and editorial. Broker storefronts are identity-led and curated.
- Desktop navigation is 216–224 px wide with 40–44 px rows. The workspace has one persistent create-listing action, not repeated primary actions in the shell and page body.
- Broker accent colour occupies no more than roughly 10–15% of an authenticated screen. Neutral surfaces carry the hierarchy.
- Photos, typography, spacing, and data clarity create the premium feeling. Gradients, glass effects, decorative glow, emoji icons, and excessive shadows do not.
- The route mockups approved on 2 September 2026 supersede the scale and density of the earlier generated concepts while retaining their product hierarchy.

## 2. Product position

PropertyOS is a broker's personalized digital office, with professional property sharing as its first daily habit.

The product is not positioned as a listing portal and must not look like a generic marketplace. A public PropertyOS link should feel like a page from the broker's own website. WhatsApp is the main distribution channel, not the full product.

### 2.1 Message hierarchy

1. **Ownership:** Your properties, your identity, your digital office.
2. **Speed:** Turn property details and photos into a polished page in under 60 seconds.
3. **Professionalism:** Share one clear, branded link instead of sending photo clutter and repeated messages.
4. **Follow-up:** See supported activity and act on real enquiries.
5. **Platform attribution:** “Powered by PropertyOS” appears quietly in the footer of public pages.

Do not lead with “AI,” “CRM,” “operating system,” or an inventory feature list. AI is an optional writing aid inside listing creation, never the product promise.

### 2.2 MVP success journey

The release is acceptable only when this journey works end to end on a 360 px Android screen:

1. Broker signs up and selects English, Hindi, or Marathi.
2. Broker completes identity, logo, and WhatsApp setup.
3. Broker creates a real listing and uploads photos.
4. Broker publishes and shares a correctly encoded WhatsApp message.
5. Buyer opens the public page without signing in.
6. Buyer views images and taps WhatsApp or phone.
7. Supported events are recorded and an actionable lead appears for the broker.
8. Broker contacts the lead and updates its status.

## 3. Non-negotiable product decisions

- Warm Light is the default theme. A tenant can persist Light or Dark for its authenticated workspace and public pages.
- Broker or agency identity leads every public page. PropertyOS attribution is secondary.
- Application-owned labels support English (`en`), Hindi (`hi`), and Marathi (`mr`). Broker-entered property content is displayed exactly as entered for MVP; it is not automatically translated.
- Broker workflows are designed first for 360–430 px Android screens. Desktop adds density, not different behavior.
- Mobile primary navigation contains exactly four items: **Today**, **Listings**, **Leads**, and **More**.
- `/dashboard` is the Action Desk. It uses only current property, lead, plan, onboarding, and aggregate analytics data.
- `/dashboard/properties` is the inventory list. Existing create, detail, and edit URLs remain unchanged.
- Public property pages display broker-provided facts and price. They do not invent total cost, verification, commute time, buyer fit, scarcity, or recommendations.
- Use **Broker-listed** for the listing relationship and **Details provided by broker** near the facts. Do not use “Verified,” “RERA verified,” “owner verified,” or similar wording unless a later verification workflow supports that exact claim.
- Public pages show the locality (`area`, `city`) before contact. `location_address` is private and must not be returned by a zero-auth resolver.
- Analytics is limited to `PAGE_VIEW`, `IMAGE_VIEW`, `WHATSAPP_CLICK`, and `PHONE_CLICK`. Aggregate counts are allowed. Identifying a page viewer, claiming repeat views by a named person, or assigning an intent score is forbidden.

## 4. Current data truth and display rules

### 4.1 Available now

| Domain | Data available to the UI |
|---|---|
| Tenant | Name, logo URL, brand colour, WhatsApp number, plan/status, pilot dates, acquisition values, referral code, preferred locale, marketing consent, share action count |
| User | Name, email, phone, role |
| Property | Title, description, price, type, status, city, area, private address, BHK, square feet, amenities, images, assignee, expiry, view/lead counts, timestamps, public slug |
| Lead | Property, source, buyer name, phone, email, status, notes, event reference, created/updated times |
| Analytics | Page views, image views, WhatsApp clicks, phone clicks, device category, browser, anonymized IP hash, aggregate dashboard metrics |
| Conversations | WhatsApp sessions and chronological sent/received messages where the integration has recorded them |
| Onboarding | Completion steps, completion count, activation result, listing count, and share count |

### 4.2 Derived UI signals allowed now

Derived labels must be deterministic and explainable:

- **New lead:** `lead.status === "NEW"`.
- **No update for 48 hours:** `lead.status === "CONTACTED"` and `updated_at` is more than 48 hours old. This is not called a scheduled reminder.
- **Expiring soon:** active/public property with `expires_at` within seven calendar days.
- **Needs photos:** property has no images.
- **Buyer CTA activity:** lead source is `WHATSAPP_CLICK` or `PHONE_CLICK`.
- **Incomplete setup:** returned by the onboarding endpoint, not inferred from arbitrary client state.
- **Publicly available:** property status is one of `AVAILABLE`, `NEGOTIATION`, `SITE_VISIT`, or `BOOKED`, and its share link is valid and unexpired.

### 4.3 Forbidden MVP claims and data

The following must not appear as real values in production UI:

- Buyer intent, lead temperature, lead score, match percentage, or AI recommendation.
- Named viewer identity inferred from an anonymous page view.
- Repeat-view claims tied to a person.
- Automated stamp duty, registration, maintenance, EMI, or “all-in cost.”
- Commute or travel-time estimates.
- Verification status or source that has not been recorded by a verification system.
- Exact public location or map pin derived from `location_address`.
- Saved shortlists, comparisons, or structured site-visit slots.
- Draft behavior beyond the implemented WhatsApp-import `DRAFT` workflow. Manual listing creation must not claim server autosave unless its create endpoint explicitly returns a draft.
- State and PIN code fields; they are not accepted by the current property serializer.

Marketing demo data may illustrate a workflow only when visibly labelled **Example** or **Demo** and never mixed with an authenticated broker's real metrics.

## 5. Design system

### 5.1 Colour tokens

All components consume semantic tokens. Raw concept-image colours must not be copied directly into route code.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--ui-bg` | `#F6F7F5` | `#0F1311` | Page background |
| `--ui-surface` | `#FFFFFF` | `#171C19` | Main cards, menus, inputs |
| `--ui-surface-muted` | `#F0F2EF` | `#202622` | Secondary panels, chips |
| `--ui-surface-raised` | `#FFFFFF` | `#252C28` | Raised dialogs and sticky actions |
| `--ui-text` | `#17201C` | `#F5F7F5` | Primary text |
| `--ui-text-muted` | `#66706B` | `#A7B0AA` | Secondary text |
| `--ui-border` | `#E0E4E1` | `#303833` | Dividers and fields |
| `--ui-focus` | `#285FC7` | `#86B8FF` | Keyboard focus ring |
| `--ui-brand-fallback` | `#17624A` | `#63C59B` | Safe PropertyOS/broker fallback |
| `--ui-accent-warm` | `#B87925` | `#E0A552` | Highlight, not body text |
| `--ui-terracotta` | `#B85E48` | `#E58670` | Sparse editorial accent |
| `--ui-success` | `#267553` | `#63C59B` | Success |
| `--ui-warning` | `#8B5D13` | `#EDBC61` | Warning |
| `--ui-danger` | `#B44238` | `#FF8C80` | Error/destructive |

Status colour is never the only status signal. Every state uses text and, where helpful, an icon.

### 5.2 Broker accent handling

`brand_color` is untrusted visual input.

1. Accept only a six-digit `#RRGGBB` value. Invalid values use `--ui-brand-fallback`.
2. Preserve the selected colour in the settings swatch.
3. Before using it as text, border, icon, or button fill, calculate WCAG contrast against its surface.
4. Button text uses whichever of `#FFFFFF` or `#10211A` reaches at least 4.5:1 against the fill.
5. If the accent cannot reach 4.5:1 for small text against the current surface, use the theme-safe fallback for text and keep the broker colour only as a decorative strip, avatar ring, or large fill with safe foreground.
6. Never recolour success, warning, danger, focus, or disabled states with the broker accent.
7. Preview Light and Dark results before saving branding.

### 5.3 Typography

- UI and Latin text: `Inter`, with system sans-serif fallback.
- Hindi and Marathi: `Noto Sans Devanagari`, with system sans-serif fallback.
- Optional English public-page display headings: `Newsreader`; Devanagari display headings remain `Noto Sans Devanagari` at weight 700.
- Fonts must be bundled at build time. Public pages must not depend on a runtime font request.

| Role | Mobile | Desktop | Weight / line height |
|---|---:|---:|---|
| Display | 36 px | 56 px | 700 / 1.05 |
| Page title | 28 px | 32 px | 700 / 1.15 |
| Section title | 20 px | 24 px | 700 / 1.25 |
| Card title | 17 px | 18 px | 650 / 1.3 |
| Body | 16 px | 16 px | 400 / 1.55 |
| Small | 14 px | 14 px | 400 / 1.45 |
| Caption | 12 px | 12 px | 500 / 1.4 |

Do not use all caps for translated labels. English eyebrow labels may use uppercase with restrained letter spacing; Hindi and Marathi use normal case and spacing.

### 5.4 Spacing, size, radius, elevation

- Base grid: 4 px.
- Spacing scale: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64` px.
- Mobile page gutter: 16 px; 390 px and wider: 20 px; tablet: 24 px; desktop: 32 px.
- Form/control height: minimum 44 px; primary mobile actions: 48–52 px.
- Icon-only controls: minimum 44 × 44 px with an accessible label.
- Input radius: 12 px; card radius: 16 px; feature/public card radius: 24 px; pill: 999 px.
- Borders: 1 px. Use shadows only for overlays and sticky action bars.
- Standard card padding: 16 px mobile, 20–24 px desktop.

### 5.5 Breakpoints and containers

| Range | Behavior |
|---|---|
| `< 768 px` | Mobile shell, single-column forms, bottom navigation, sticky primary action |
| `768–1023 px` | Tablet shell, optional two-column management grids, bottom nav retained when touch layout is clearer |
| `>= 1024 px` | Desktop sidebar, denser tables/grids, side-by-side detail and actions |

- Authenticated maximum content width: 1280 px.
- Public property/storefront maximum content width: 1152 px.
- Legal and long-form help maximum reading width: 760 px.
- The 360 px layout is the minimum supported design width; no horizontal page scroll.

### 5.6 Icons, focus, motion, and accessibility

- Use one outline icon family already available in the project. Do not use emoji as navigation icons.
- Icons supplement text; unfamiliar actions are not icon-only.
- Visible focus ring: 2 px `--ui-focus` plus 2 px offset.
- Normal transitions: 150–250 ms. Respect `prefers-reduced-motion` and remove nonessential animation.
- Body text contrast is at least 4.5:1; large text and meaningful non-text graphics at least 3:1.
- Error messages are connected to fields through accessible descriptions.
- Dialogs trap focus, have a labelled title, close on Escape, and restore focus to the opening control.
- Toasts do not contain the only copy of an important result. Persistent failures stay near the failed control.

## 6. Shared component specification

### 6.1 Buttons

- **Primary:** one main action per section; safe broker accent fill.
- **Secondary:** surface fill with border.
- **Ghost:** text/icon action with a 44 px hit area.
- **Danger:** semantic danger colour and confirmation for destructive actions.
- **Loading:** label remains understandable, spinner appears at the leading edge, and repeat submission is disabled.
- **Disabled:** visually muted but still readable; use helper text to explain why when the cause is not obvious.

### 6.2 Forms

- Labels remain visible above fields; placeholders never replace labels.
- Required fields use “Required” in helper text rather than a colour-only asterisk.
- Validate on blur and submit. Move focus to the first invalid field on submit.
- Phone fields show country code explicitly and normalize for WhatsApp use.
- Price displays Indian grouping in read views (`₹1,25,00,000`) and accepts unformatted numeric entry.
- Image upload shows per-file progress, success, failure reason, and **Retry**. Upload order is visible and can be changed only if the existing media endpoint supports it.
- AI writing help is optional, clearly labelled, and never blocks manual entry.

### 6.3 Cards and lists

- Property cards show: first image or neutral placeholder, title, area/city, price, type/facts, status, expiry if relevant, and supported views/leads.
- Lead rows show: buyer name, property, source, status, phone, and last updated time.
- Cards use full-row navigation only when nested controls are not present. Nested share/edit buttons must have distinct hit targets.
- Desktop tables must collapse to cards on mobile, not force horizontal scrolling.

### 6.4 Modals, sheets, and menus

- Mobile uses bottom sheets for share, filter, locale, and More navigation.
- Desktop uses anchored menus or centred dialogs as appropriate.
- The share sheet contains a preview of the decoded message, the public URL, **Share on WhatsApp**, **Copy link**, and a success/error result.
- Never expose an encoded `%F0...` payload as visible message text.

### 6.5 Skeletons and empty states

- Skeletons match the final layout and do not show invented values.
- Empty states contain a short reason, one useful next action, and no decorative dashboard chart.
- First-use empty states can include a sample listing action; sample data is always labelled **Demo** and is never counted in analytics.

## 7. Theme and localization behavior

### 7.1 Theme precedence

1. Authenticated and public tenant pages use persisted `tenant.theme_mode`.
2. Before that field exists or while it is unavailable, use `LIGHT`.
3. A public visitor may temporarily switch the current page theme. Store this browser-only preference under a tenant-scoped key and do not update the broker's tenant setting.
4. System colour preference does not override the broker's selected public theme.

The same component hierarchy is used in Light and Dark. Dark mode is not a separate layout and must not hide information that is present in Light.

### 7.2 Locale precedence

1. Explicit user selection stored locally.
2. Authenticated tenant `preferred_locale`.
3. Browser language when it matches `en`, `hi`, or `mr`.
4. English fallback.

Changing locale updates labels immediately and persists for that browser. Authenticated owners/admins may choose to save the workspace default separately.

### 7.3 Translation structure

Define these frontend types:

```ts
export type ThemeMode = 'LIGHT' | 'DARK';
export type Locale = 'en' | 'hi' | 'mr';
```

Application strings live in typed dictionaries such as:

```text
src/i18n/messages/en.ts
src/i18n/messages/hi.ts
src/i18n/messages/mr.ts
```

Keys are semantic and namespaced, for example `nav.today`, `listing.publish`, `lead.status.new`, `public.detailsProvided`, and `error.fetchFailed`. Components must not contain user-visible literals except broker/user data returned by the API.

Core label baseline, subject to native-speaker review:

| Key | English | Hindi | Marathi |
|---|---|---|---|
| `nav.today` | Today | आज | आज |
| `nav.listings` | Listings | प्रॉपर्टी | प्रॉपर्टी |
| `nav.leads` | Leads | लीड्स | लीड्स |
| `nav.more` | More | और | अधिक |
| `listing.new` | New listing | नई प्रॉपर्टी | नवीन प्रॉपर्टी |
| `listing.publish` | Publish | प्रकाशित करें | प्रकाशित करा |
| `share.whatsapp` | Share on WhatsApp | WhatsApp पर शेयर करें | WhatsApp वर शेअर करा |
| `public.call` | Call broker | ब्रोकर को कॉल करें | ब्रोकरला कॉल करा |
| `public.detailsProvided` | Details provided by broker | विवरण ब्रोकर द्वारा दिया गया है | तपशील ब्रोकरने दिले आहेत |
| `common.retry` | Retry | फिर कोशिश करें | पुन्हा प्रयत्न करा |

Allow at least 35% text expansion. Do not truncate primary actions. Numbers use Indian grouping and Latin digits in all three MVP locales. Broker-entered copy is neither translated nor transliterated. Hindi and Marathi must be reviewed by native speakers before production.

## 8. Application shell and navigation

### 8.1 Mobile shell

- Top bar: page title; optional back control; compact broker avatar/logo; no permanent hamburger menu.
- Bottom navigation: **Today**, **Listings**, **Leads**, **More**. It respects safe-area insets and remains at least 64 px high.
- **More** opens a bottom sheet with Conversations, Branding & theme, Broker profile, Plan & referrals, Support, Legal, and Sign out.
- A route-level sticky CTA sits above bottom navigation and must not cover content. The page adds matching bottom padding.
- On keyboard open, form CTAs remain reachable without colliding with the keyboard.

### 8.2 Desktop shell

- 240 px left sidebar with logo/workspace switch area, Today, Listings, Leads, Conversations, Branding & theme, Profile, and Plan & referrals.
- Top utility area contains locale, help, and account controls. Do not repeat primary navigation horizontally.
- Content width is capped at 1280 px and aligned consistently across routes.
- **New listing** is the persistent high-priority sidebar action.

### 8.3 Plan state banner

- `PILOT`: show days/date remaining and a link to Plan & referrals; do not interrupt tasks.
- `EXPIRED`: persistent blocking banner with **Choose plan** and **Contact support**. Existing data remains readable. Creating, publishing, or sharing may be disabled according to server policy, with the reason shown.
- `ACTIVE`: no banner unless billing action is required.
- `CANCELLED`: show access-end information returned by the server; never invent a date.

## 9. Route-by-route final specification

### 9.1 `/` — marketing landing page

**Intent:** explain that PropertyOS creates a broker-owned digital presence and makes professional WhatsApp sharing fast. Convert qualified brokers into the assisted 14-day pilot.

**Data source:** static, reviewed marketing content; environment-configured support WhatsApp; no authenticated analytics in the hero.

**Mobile layout:** compact brand header; broker-first hero; phone-sized storefront/property preview; proof strip; three-step workflow; benefits; sample property link; founding offer; FAQ; final CTA; legal footer. Desktop places hero copy and product preview side by side and may alternate later sections.

**Required copy direction:**

- Headline: **Your properties. Your brand. One professional link.**
- Supporting copy explains a personal broker page, polished property pages, WhatsApp sharing, and supported engagement signals.
- Primary CTA: **Build my first property page** → `/auth/signup?source=website`.
- Secondary CTA: **See a live example** → a real seeded public page or non-interactive labelled demo.
- “No card · assisted setup · 14 days” appears beside the CTA if still commercially true.

**Omit:** fictional broker counts, unverified testimonials, unsupported analytics claims, a portal-style listing grid, buyer-fit scoring, and all-in costs.

**States:** if the live sample is unavailable, hide that CTA rather than link to a broken page. The main signup CTA remains available.

### 9.2 `/auth/login` — sign in

**Data source:** `POST /api/auth/login/`; MFA transition when returned by the API.

**Layout:** one compact card with email, password, show/hide password, submit, language selector, and signup link. Desktop may add a quiet branded/property preview panel; mobile shows only the form and trust copy.

Do not link to `/auth/forgot-password` until a real recovery route and endpoint exist. Replace it with **Can't sign in? Contact support** linking to `/support`. API errors appear above the affected fields in plain language. Preserve entered email after failure.

### 9.3 `/auth/signup` — create workspace

**Data source:** `POST /api/auth/register/`.

**Layout:** a short mobile-first form with name, WhatsApp/mobile number, email, password, agency/workspace name (optional), city, interface language, required terms/privacy/processing consent, and optional marketing consent. Referral and acquisition source may be read from query parameters but are not prominent fields.

Phone is visually first, but email remains a required credential under the current auth contract. Explain why it is required. Password requirements are visible before submit. Do not pre-check marketing consent. On success, go to `/dashboard/onboarding`.

### 9.4 `/dashboard/onboarding` — guided setup

**Intent:** reach first real share within ten minutes without creating a second product shell.

**Data source:** `GET /api/auth/onboarding/`, `PATCH /api/auth/tenant/branding/`, `POST /api/auth/tenant/logo/`, and existing property/share endpoints.

**Layout:** progress header and one focused current task at a time. Tasks are: complete broker profile; add logo and WhatsApp; create first listing; publish; share to a real prospect; review engagement. Completed tasks are visible but collapsed. A **Skip for now** action is allowed for optional profile details, never for required consent.

If the endpoint already reports progress, it is authoritative. Do not maintain a competing client-only completion score. After completion, route to Today with a success summary.

### 9.5 `/dashboard` — Today / Action Desk

**Intent:** answer “What should I do next?” rather than present a decorative analytics dashboard.

**Data source:** existing properties, leads, onboarding, tenant plan state, team data where needed, and `GET /api/analytics/dashboard/`.

**Mobile layout:**

1. Greeting and compact page context. The persistent shell action is the only **New listing** action above the fold.
2. Onboarding card when incomplete.
3. **Needs attention** list ordered by: new leads; CTA leads; no update for 48 hours; listings expiring within seven days; listings without images.
4. Compact supported snapshot: active listings, page views, WhatsApp clicks, phone clicks.
5. Recent listings and recent leads, each capped at three with **View all**.

**Desktop layout:** one compact metrics row appears first, followed by an asymmetric workspace: action queue takes roughly three-fifths width and supported activity takes the remaining column. A seven-day views/clicks chart may appear because that aggregate is supported. Recent listings/leads remain compact secondary panels.

Every action item states its derivation, for example **New WhatsApp enquiry** or **No update for 2 days**. Do not show AI priorities, viewer names, intent labels, or future revenue.

**Empty:** congratulate the broker only after setup is complete; primary action is **Create a listing**. **Error:** keep independently loaded sections usable and show retry only on failed sections.

### 9.6 `/dashboard/properties` — inventory

**Data source:** `GET /api/properties/` and existing update/delete/share operations.

**Mobile layout:** search; compact native filters for status/type; result count; property cards; persistent shell **New listing** action. Cards show only the fields defined in [Section 6.3](#63-cards-and-lists). Default sort is newest first, matching the backend ordering.

**Desktop layout:** compact title row with an inline WhatsApp-import affordance, one toolbar, and image-led cards or dense rows. Listings must start within the first desktop viewport; do not place a promotional WhatsApp hero above them. A view toggle is included only when both modes work. Keep filters in URL query parameters when URL-backed filtering is implemented.

**Empty:** **Create your first listing** plus optional **Use a demo as a guide**. Demo content is not persisted unless the broker explicitly duplicates and edits it. **Fetch failure:** retain filters, show **Retry**, and do not say “No listings.”

### 9.7 `/dashboard/properties/new` — new-listing studio

**Data source:** property create endpoint, media upload endpoint, and current AI copy endpoint when available.

**Mobile flow:** four steps with a visible progress indicator:

1. **Basics:** title, type, price, BHK when applicable, square feet when applicable.
2. **Location & details:** area, city, private address, description, amenities.
3. **Photos:** upload, retry, preview, remove, and select cover where supported.
4. **Review & publish:** exact public preview, privacy note, validation summary, publish.

Do not include state, PIN code, computed costs, coordinates, RERA verification, commute, or visit slots. The private-address field says **Not shown publicly**. Conditional fields do not erase values without warning when property type changes.

Manual listing creation has no confirmed server autosave contract. A client-side recovery copy may be stored in `sessionStorage` and must be labelled **Saved on this device**, cleared after successful creation, and never presented as cloud autosave. WhatsApp imports may use the implemented server-side `DRAFT` state and review route. If local storage is unavailable, show a nonblocking warning.

AI copy opens as an optional side sheet/bottom sheet, uses the form's current facts, and requires the broker to accept or edit the result. On AI failure, manual entry remains available with **Try AI again**.

### 9.8 `/dashboard/properties/[id]` — internal property detail

**Data source:** `GET /api/properties/{id}/`, share-link data, and supported per-property counts.

**Layout:** gallery; title/status/price; private management facts including exact address; description and amenities; share-link panel; supported views/leads; expiry; assignee; edit and status actions. Mobile uses stacked sections with sticky **Share**. Desktop uses content plus a 320 px action rail.

The internal screen may show `location_address` because it is authenticated. Label the public visibility of area/city separately. Supported status transitions use the current status choices: `AVAILABLE`, `NEGOTIATION`, `SITE_VISIT`, `BOOKED`, `SOLD`, `EXPIRED`.

### 9.9 `/dashboard/properties/[id]/edit` — edit-listing studio

**Data source:** property retrieve/update and media endpoints.

Use the same fields, order, components, validation, privacy notes, and responsive structure as create. Populate server values once; do not overwrite user edits during a refetch. Save shows a persistent success result and returns to detail only when the update succeeds. Navigating away with unsaved changes requires confirmation.

No server draft claim is allowed. Image upload/removal failures are isolated from text-field changes and have per-item retry.

### 9.10 `/dashboard/leads` — leads and lead detail

**Data source:** `GET/PATCH /api/leads/` and related property data.

**Mobile layout:** tabs or filter chips for New, Contacted, Site visit, Negotiation, Closed, and Lost; search; lead cards. Selecting a card opens a full-height detail sheet/page with buyer details, property, source, created/updated times, notes, call/WhatsApp actions, and status update.

**Desktop layout:** master-detail view. Left side is the sortable lead list; right side is the selected lead. Do not add a lead score or “hot/warm/cold.” Source labels map directly from stored values such as WhatsApp click, phone click, or gated form.

The “No update for…” label is based on `updated_at`; it is not a reminder. Save notes explicitly. Phone/WhatsApp actions use the stored phone number and show an error when it is absent or invalid.

### 9.11 `/dashboard/chats` — WhatsApp conversations

**Data source:** WhatsApp sessions/messages endpoints.

**Intent:** provide a trustworthy history of messages recorded by the connected integration, not promise a universal WhatsApp inbox.

**Mobile layout:** session list, then conversation state with back navigation. Desktop uses a full-height master-detail workspace: a narrow session list and readable conversation pane, with a compact context rail only for metadata actually returned by the session. Each message uses the shared message/bubble primitives and shows direction, message type, delivery timestamp when recorded, and media placeholder/failure state. A prominent note identifies the connected WhatsApp number.

If outbound sending from the UI is not supported by the current endpoint, use **Open in WhatsApp** instead of a composer. Never render a fake enabled composer. Empty state explains that conversations appear after the number is connected and messages are received by PropertyOS.

### 9.12 `/dashboard/settings` — branding and theme

**Data source:** `GET/PATCH /api/auth/tenant/branding/`, `POST /api/auth/tenant/logo/`, plus the planned fields in [Section 14](#14-minimum-interface-contracts-not-yet-implemented).

**Layout:** live phone preview above the form on mobile and beside it on desktop. Sections: business identity, logo upload, public contact number, safe brand colour, theme choice, interface language, storefront identity, and public visibility preview. Owners/admins can save; other roles see read-only values and a permission explanation.

Theme cards show identical content in Light and Dark. Colour validation follows [Section 5.2](#52-broker-accent-handling). Save all text changes as one explicit action; logo upload retains its independent progress/retry behavior.

### 9.13 `/dashboard/settings/profile` — broker profile

**Data source:** `GET/PATCH /api/auth/me/` plus the planned user fields in [Section 14](#14-minimum-interface-contracts-not-yet-implemented).

**Layout:** portrait upload/URL, name, phone, read-only email, professional title, years of experience, and specialty chips. Explain which fields appear publicly. The avatar falls back to initials. Values are broker-provided; do not display a verification badge.

Until the planned fields are implemented, show only supported name and phone rather than nonfunctional controls.

### 9.14 `/dashboard/growth` — plan and referrals

**Data source:** tenant plan status/dates/referral code and current commercial configuration.

**Layout:** current plan and pilot status first; monthly/annual offer second; referral link and rules third; assisted payment/support CTA last. Do not display referral earnings or conversion counts unless an endpoint returns them. The founding price date must come from tenant data.

Copy clearly states that payment is assisted if there is no self-serve payment endpoint. Expired pilots retain read access and route users to a real contact/activation action.

### 9.15 `/b/[public_slug]` — public broker storefront

**Intent:** provide the broker's minimal personal website without turning PropertyOS into a portal.

**Data source:** planned zero-auth storefront resolver in [Section 14.4](#144-public-storefront-resolver).

**Mobile layout:**

1. Broker/agency masthead with logo, portrait or initials, business name, professional title, tagline, and Light/Dark visitor toggle.
2. Primary **WhatsApp** and **Call** actions.
3. Short local-expertise bio, service areas, years of experience when provided, and specialties.
4. Active listings grouped as a single broker-owned collection, with filter chips only when there are enough properties to justify them.
5. Contact strip and restrained **Powered by PropertyOS** footer.

**Desktop:** two-column identity hero followed by a maximum three-column listing grid. This is not a multi-broker search portal: no city-wide global search, competing broker cards, promoted listings, or sponsored inventory.

Only active public statuses are returned. Empty state keeps broker identity/contact visible and says **No active listings right now**. Missing portrait/logo uses initials and a neutral brand mark. An invalid slug returns a useful 404 with PropertyOS support/navigation, not an auth prompt.

### 9.16 `/p/[slug]` — public property page

**Intent:** help a buyer understand one listing and contact the responsible broker quickly.

**Data source:** `GET /api/sharing/public/{slug}/` plus zero-auth event logging at `POST /api/analytics/log/`.

**Mobile layout:**

1. Compact broker masthead: logo/portrait, name, professional title, **Broker-listed**.
2. Fast image gallery with first image prioritized and remaining images lazy-loaded.
3. Title, area/city, broker-entered price, status, and core facts.
4. **Details provided by broker** disclosure.
5. Description and amenities, progressively disclosed when long.
6. Approximate location text using only area and city; no exact address or exact map pin.
7. Broker identity/contact panel and related link to the broker storefront.
8. Sticky bottom **WhatsApp** and **Call** actions above the safe area.

**Desktop:** gallery and summary can sit side by side; details remain in a readable main column with a sticky broker contact card.

Before the first CTA action, the UI may request buyer name and phone to improve the lead record. It must explain that the details are sent to the broker, link to Privacy, and permit only the behavior supported by the logging endpoint. Do not require account registration to view the property. If a consent/capture step is skipped, the UI must not imply it has a named buyer.

Log `PAGE_VIEW` once per page load/session strategy, `IMAGE_VIEW` on deliberate gallery expansion, and the matching click event immediately before opening WhatsApp or the dialer. Analytics failure must never prevent contact; retry logging in the background only within documented limits.

The WhatsApp share message is constructed as plain Unicode text, then encoded exactly once when creating the `wa.me` URL. The visible preview is decoded text. It contains the title, area/city, price, short broker-edited summary, public `https` URL, and broker name. A localhost URL is allowed only in local development and must never be presented as production-share ready.

**Unavailable states:** 404 = invalid/removed; 410 = expired/no longer public; 403 = public sharing disabled. Each uses plain language and a broker/storefront contact only when safely returned. Never expose internal IDs or redirect to login.

### 9.17 `/support` — support

**Data source:** reviewed static help content and environment-configured support WhatsApp/email.

Layout includes language selector, WhatsApp support, email, support-hours statement only when accurate, issue checklist, and safety warning not to share passwords or one-time codes. Add concise articles for signup, publishing, image upload, sharing, leads, plan access, data deletion, and account recovery. Broken/fetch errors throughout the app may link here.

### 9.18 `/privacy`, `/terms`, `/refund` — legal layouts

**Data source:** versioned, professionally reviewed legal content. Current generated or developer-written wording is provisional.

All three routes use the same readable shell: document title, effective/updated date, language selector when approved translations exist, table of contents for long pages, sections, contact path, and links to the other legal pages. Consent forms link to the exact effective versions. Do not claim DPDP compliance merely because a consent timestamp exists.

- Privacy must describe public analytics, anonymized IP hashing, buyer contact capture, retention, access/correction/deletion contact, and processors only after legal review.
- Terms must describe the service, broker responsibility for listing content, account rules, plan/payment terms, acceptable use, availability, and liability after review.
- Refund must match the actual assisted payment and cancellation process and state timelines only when operationally supported.

## 10. Complete state specification

Every route and reusable data component must implement the applicable states below.

| State | Required behavior |
|---|---|
| Initial loading | Layout-shaped skeleton; no fake counts or flashing empty state |
| Background refresh | Keep current content, show subtle progress, never reset forms |
| Empty | Explain the absence and offer one relevant action |
| Validation | Field-level message plus summary/focus on submit; preserve entered values |
| Fetch failure | Plain-language error, **Retry**, support link after repeated failure; do not mislabel as empty |
| Offline | Persistent “You're offline” banner; preserve unsent form state on device where safe; retry when user requests or connection returns |
| Permission denial | Explain owner/admin requirement and keep read-only data visible |
| Upload in progress | Per-file progress, cancel only when supported |
| Upload failure | Keep preview/local selection, show reason and per-file **Retry** |
| AI unavailable | Manual editing remains primary; **Try again** is secondary |
| Share failure | Keep decoded message and link, offer **Try WhatsApp again** and **Copy link** |
| Inactive listing | Authenticated detail remains readable; public page returns unavailable state; no active share CTA |
| Expired pilot | Preserve read access; explain blocked actions and offer plan/support routes |
| Publish success | Persistent success panel with **Share on WhatsApp**, **Copy link**, and **View public page** |
| Share success | Confirmation with **View activity later**; do not claim delivery/read status |
| Unauthorized session | Preserve safe local form recovery, route to login, and return to the intended authenticated route after successful login |

Toasts may reinforce success, but publish/share URLs and recovery actions remain visible in the page or sheet.

## 11. Responsive behavior and content density

- At 360 px, facts wrap into two columns only when each label/value remains readable; otherwise use one column.
- Sticky public CTAs never cover amenities, legal disclosure, or the last content block.
- Image galleries reserve aspect ratio to prevent layout shift. Use responsive image sizes and thumbnails.
- Mobile property and lead filters use sheets; desktop filters stay visible.
- Desktop Action Desk, Leads, and internal Property Detail use split views. Mobile never squeezes those split views side by side.
- Tables have card alternatives on mobile. Do not rely on drag interactions as the only way to reorder or operate content.
- Hindi and Marathi use the same hierarchy; components grow vertically rather than shrink type below the scale.

## 12. Public performance and privacy requirements

- Public pages require no authentication and must be useful before JavaScript analytics completes.
- Target LCP is at most 2.5 seconds on a representative low-cost Android device over throttled slow 4G; stretch goal is below 2 seconds.
- Prioritize one cover image, use thumbnails, lazy-load offscreen media, and avoid dashboard libraries on public routes.
- Render meaningful title, price, locality, facts, and broker contact in the initial response where the chosen Next.js implementation permits.
- Do not return `location_address`, internal notes, email, tenant IDs, user IDs, acquisition fields, plan details, consent fields, or internal analytics in public payloads.
- The public resolver returns only fields enumerated in [Section 14](#14-minimum-interface-contracts-not-yet-implemented).
- Event logging must follow the approved Privacy notice and current rate limits. No fingerprinting beyond the existing documented event behavior.
- Public URLs in production are canonical `https` links with stable slugs and social metadata. Missing images use a lightweight local fallback.

## 13. Concept image disposition

The images set visual direction only. “Use” means preserve hierarchy or visual language; it does not approve invented data in the image.

| # | Concept | Route / area | Disposition and required correction |
|---:|---|---|---|
| 01 | [Early broker storefront](../propertyos-ui-concepts-2026-08-26/01-early-broker-storefront.png) | `/b/[public_slug]` | Historical reference only; superseded by 04/28 |
| 02 | [Early decision room](../propertyos-ui-concepts-2026-08-26/02-early-property-decision-room.png) | `/p/[slug]` | Historical reference only; omit unsupported decision data |
| 03 | [Light/dark design system](../propertyos-ui-concepts-2026-08-26/03-design-system-light-dark.png) | Shared system | Use warmth, hierarchy, and paired themes; exact tokens come from Section 5 |
| 04 | [Broker storefront Light](../propertyos-ui-concepts-2026-08-26/04-broker-storefront-light-responsive.png) | `/b/[public_slug]` | Primary storefront reference; remove unsupported trust/verification claims |
| 05 | [Decision room Light](../propertyos-ui-concepts-2026-08-26/05-property-decision-room-light.png) | `/p/[slug]` | Use editorial property hierarchy; omit costs, commute, fit, verification, and scheduling |
| 06 | [Action Desk Light](../propertyos-ui-concepts-2026-08-26/06-broker-action-desk-light-responsive.png) | `/dashboard` | Use action-first structure; replace scored/prioritized claims with deterministic signals |
| 07 | [Landing page](../propertyos-ui-concepts-2026-08-26/07-landing-page-multilingual-responsive.png) | `/` | Use broker-first composition; remove unproven statistics/testimonials |
| 08 | [Public property multilingual](../propertyos-ui-concepts-2026-08-26/08-public-property-page-multilingual.png) | `/p/[slug]` | Use language expansion and broker prominence; apply privacy/data restrictions |
| 09 | [Curated shortlist](../propertyos-ui-concepts-2026-08-26/09-curated-shortlist-multilingual.png) | Future | Deferred; no MVP route or navigation |
| 10 | [Property comparison](../propertyos-ui-concepts-2026-08-26/10-property-comparison-multilingual.png) | Future | Deferred; no MVP route or navigation |
| 11 | [Site-visit scheduling](../propertyos-ui-concepts-2026-08-26/11-site-visit-scheduling-multilingual.png) | Future | Deferred; current UI may use WhatsApp/call only |
| 12 | [Guided onboarding](../propertyos-ui-concepts-2026-08-26/12-guided-onboarding-multilingual.png) | `/dashboard/onboarding` | Use progressive checklist; endpoint remains completion authority |
| 13 | [Login](../propertyos-ui-concepts-2026-08-26/13-login-multilingual.png) | `/auth/login` | Use compact layout; no fake forgot-password flow |
| 14 | [Signup](../propertyos-ui-concepts-2026-08-26/14-signup-multilingual.png) | `/auth/signup` | Use phone-forward hierarchy while retaining required email and consent |
| 15 | [New listing studio](../propertyos-ui-concepts-2026-08-26/15-new-listing-studio-multilingual-responsive.png) | `/dashboard/properties/new` | Use four-step structure; remove unsupported fields and server-draft claim |
| 16 | [Internal property detail](../propertyos-ui-concepts-2026-08-26/16-internal-property-detail-multilingual.png) | `/dashboard/properties/[id]` | Use gallery/action rail; show only current property data |
| 17 | [Edit listing studio](../propertyos-ui-concepts-2026-08-26/17-edit-listing-studio-multilingual.png) | `/dashboard/properties/[id]/edit` | Share create components and validation; no unsupported autosave |
| 18 | [Leads](../propertyos-ui-concepts-2026-08-26/18-leads-and-buyer-interest-multilingual.png) | `/dashboard/leads` | Use master-detail structure; remove scores, named views, and inferred intent |
| 19 | [Conversations](../propertyos-ui-concepts-2026-08-26/19-buyer-conversations-multilingual.png) | `/dashboard/chats` | Use message history; composer only if a send endpoint is validated |
| 20 | [Plan and referrals](../propertyos-ui-concepts-2026-08-26/20-plan-and-referrals-multilingual.png) | `/dashboard/growth` | Use plan hierarchy; omit unsupported earnings/conversion metrics |
| 21 | [Branding/theme settings](../propertyos-ui-concepts-2026-08-26/21-branding-theme-settings-multilingual.png) | `/dashboard/settings` | Primary settings reference; apply safe accent algorithm |
| 22 | [Broker profile](../propertyos-ui-concepts-2026-08-26/22-broker-profile-settings-multilingual.png) | `/dashboard/settings/profile` | Use planned profile fields; no verification badge |
| 23 | [Storefront editor](../propertyos-ui-concepts-2026-08-26/23-storefront-editor-multilingual.png) | `/dashboard/settings` | Merge into branding/profile settings; do not create a separate MVP route |
| 24 | [Support](../propertyos-ui-concepts-2026-08-26/24-support-multilingual.png) | `/support` | Use contact-first help structure; publish only real support channels/hours |
| 25 | [Privacy notice](../propertyos-ui-concepts-2026-08-26/25-privacy-notice-multilingual.png) | `/privacy` | Layout reference only; legal wording needs professional review |
| 26 | [Terms](../propertyos-ui-concepts-2026-08-26/26-terms-of-service-multilingual.png) | `/terms` | Layout reference only; legal wording needs professional review |
| 27 | [Refund policy](../propertyos-ui-concepts-2026-08-26/27-refund-policy-multilingual.png) | `/refund` | Layout reference only; policy must match operations and legal review |
| 28 | [Broker storefront Dark](../propertyos-ui-concepts-2026-08-26/28-broker-storefront-dark-multilingual.png) | `/b/[public_slug]` | Dark-theme reference; hierarchy must match 04 exactly |
| 29 | [Decision room Dark](../propertyos-ui-concepts-2026-08-26/29-property-decision-room-dark-multilingual.png) | `/p/[slug]` | Dark visual reference; unsupported decision modules remain omitted |
| 30 | [Action Desk Dark](../propertyos-ui-concepts-2026-08-26/30-broker-action-desk-dark-multilingual.png) | `/dashboard` | Dark visual reference; use only supported action signals |

No concept image is a source for production legal wording, analytics values, property facts, testimonials, or verification claims.

## 14. Minimum interface contracts not yet implemented

This section defines the only planned schema/API expansion for the first UI implementation. These additions require migrations, serializers, authorization tests, privacy review, and API documentation before their UI controls become active.

### 14.1 Tenant additions

| Field | Type and validation | Default | Public? |
|---|---|---|---|
| `theme_mode` | enum `LIGHT \| DARK` | `LIGHT` | Yes |
| `public_slug` | unique lowercase slug, regex `[a-z0-9-]+`, 3–60 chars | generated from tenant name with collision suffix | Yes |
| `public_tagline` | string, trim, max 120 chars, blank allowed | blank | Yes |
| `public_bio` | string, trim, max 600 chars, blank allowed | blank | Yes |
| `service_areas` | JSON array of unique strings, max 10 items, each max 80 chars | `[]` | Yes |

Existing `name`, `logo_url`, `brand_color`, `whatsapp_default_number`, and `preferred_locale` remain the corresponding identity/contact/default-locale values.

Only owner/admin roles may update tenant identity, theme, locale, slug, and storefront fields. Slug changes require a warning because existing storefront links may break. A later redirect strategy is recommended but not part of this UI release.

### 14.2 User additions

| Field | Type and validation | Default | Public? |
|---|---|---|---|
| `avatar_url` | URL/string, max 512 chars, blank allowed | blank | Primary broker only |
| `professional_title` | string, max 120 chars, blank allowed | blank | Yes |
| `years_experience` | nullable integer, 0–60 | null | When provided |
| `specialties` | JSON array of unique strings, max 10 items, each max 80 chars | `[]` | Yes |

The existing user's `name` and `phone` remain editable. Email and role remain read-only through the profile UI. These fields are self-declared and never create a verification claim.

### 14.3 Authenticated endpoint extensions

`GET/PATCH /api/auth/tenant/branding/` adds:

```json
{
  "theme_mode": "LIGHT",
  "public_slug": "meera-shah-west-pune",
  "public_tagline": "Independent homes specialist for West Pune",
  "public_bio": "I help families evaluate and visit homes across Baner, Balewadi and Wakad.",
  "service_areas": ["Baner", "Balewadi", "Wakad"]
}
```

`GET/PATCH /api/auth/me/` adds:

```json
{
  "avatar_url": "https://cdn.example.com/brokers/meera.jpg",
  "professional_title": "Independent Real Estate Advisor",
  "years_experience": 8,
  "specialties": ["Residential resale", "New projects"]
}
```

PATCH semantics are partial. Unknown fields return validation errors. Authorization and tenant isolation follow existing endpoint rules. Logo/avatar upload should use a validated upload endpoint rather than requiring users to host files themselves; if avatar upload is not added in the first backend increment, the profile UI uses URL/fallback initials and says so explicitly.

### 14.4 Public storefront resolver

Add zero-auth:

```text
GET /api/sharing/storefront/{public_slug}/
```

It returns public tenant identity, one primary public broker profile, and paginated active listings. The primary broker is the tenant owner for MVP unless a deterministic public-profile selection rule is later added.

Minimum response shape:

```json
{
  "storefront": {
    "name": "Meera Shah Realty",
    "public_slug": "meera-shah-west-pune",
    "logo_url": "https://cdn.example.com/logo.png",
    "brand_color": "#174D3C",
    "theme_mode": "LIGHT",
    "public_tagline": "Independent homes specialist for West Pune",
    "public_bio": "I help families evaluate and visit homes across West Pune.",
    "service_areas": ["Baner", "Balewadi", "Wakad"],
    "phone": "+919876543210",
    "whatsapp": "+919876543210"
  },
  "broker": {
    "name": "Meera Shah",
    "avatar_url": "https://cdn.example.com/brokers/meera.jpg",
    "professional_title": "Independent Real Estate Advisor",
    "years_experience": 8,
    "specialties": ["Residential resale", "New projects"]
  },
  "listings": {
    "count": 1,
    "next": null,
    "results": [
      {
        "slug": "3-bhk-apartment-in-baner-pune-kw9geb",
        "title": "3 BHK Apartment in Baner",
        "price": "12500000.00",
        "property_type": "APARTMENT",
        "status": "AVAILABLE",
        "area": "Baner",
        "city": "Pune",
        "bhk": 3,
        "square_feet": "1450.00",
        "cover_image": "https://cdn.example.com/properties/cover.jpg",
        "updated_at": "2026-08-26T10:00:00Z"
      }
    ]
  }
}
```

Default page size is 12, maximum 24. Only `AVAILABLE`, `NEGOTIATION`, `SITE_VISIT`, and `BOOKED` listings with a valid public link are returned. The response excludes exact address, IDs, email, notes, plan/acquisition/consent data, and analytics. Invalid slugs return 404; an empty valid storefront returns 200 with an empty results list.

### 14.5 Public property resolver extension and privacy correction

Extend `GET /api/sharing/public/{slug}/` with theme and the same minimal public broker/storefront identity. Remove `location_address` and other non-public serializer fields from its response by using a purpose-built public property serializer rather than the authenticated serializer.

The `branding.verified` value must be removed. Replace it with a display-independent relationship value:

```json
{
  "listing_attribution": "BROKER_LISTED"
}
```

The public property payload may include only:

- slug, title, description, broker-entered price, type, public status;
- city, area, BHK, square feet, amenities, public images, updated time;
- public tenant identity/theme/contact and public broker profile;
- storefront URL/slug.

Do not return total aggregate view/lead counts to buyers unless a later product decision explicitly approves social proof and its privacy implications. The authenticated dashboard remains the place for analytics.

### 14.6 Analytics contract

The event allowlist remains:

```ts
type PublicAnalyticsEvent =
  | 'PAGE_VIEW'
  | 'IMAGE_VIEW'
  | 'WHATSAPP_CLICK'
  | 'PHONE_CLICK';
```

No new identity, repeat-view, score, location, recommendation, or cross-property tracking contract is part of this release. Buyer name/phone supplied during CTA capture may create/update a lead under the existing behavior, but anonymous events remain anonymous in the broker UI.

## 15. Deferred product concepts

The following are deliberately outside the first UI implementation and must not be linked from MVP navigation, hidden behind fake controls, or represented by placeholder metrics:

- Automated all-in property costs, taxes, fees, EMI, or maintenance calculations.
- Commute estimates, maps with exact location, and neighborhood travel analysis.
- Personalized “Why it fits,” buyer-fit recommendations, and lead scoring.
- Saved buyer shortlists without login.
- Side-by-side property comparison.
- Structured site-visit availability, booking, confirmation, and calendar integration.
- Verified broker/property/RERA badges and verification sources.
- Viewer identity or repeat-view attribution without explicit consent and data support.
- Team assignment expansion beyond fields/endpoints already present.
- Public marketplace search across brokers.

A deferred feature moves into scope only after its data source, consent/privacy behavior, empty/error states, API contract, and acceptance tests are approved in a later specification revision.

## 16. Implementation order

1. **Foundation:** semantic tokens, Light/Dark infrastructure, typed locale dictionaries, shared controls, responsive app shell, and state components.
2. **Core broker habit:** Today, inventory, create/edit/detail, publish/share sheet, public property page, and lead workflow.
3. **Current supporting routes:** auth, onboarding, conversations, branding, profile, growth, support, and legal shells.
4. **Minimum backend expansion:** migrations and contracts in Section 14, then public storefront and activated profile/settings controls.
5. **Localization QA:** complete English/Hindi/Marathi keys, text-expansion checks, and native-speaker review.
6. **Theme and device QA:** Light/Dark, low-cost Android, WhatsApp/WhatsApp Business, slow network, and desktop density.

Do not begin deferred buyer-decision features during these phases. Before implementing Next.js route/runtime behavior, read the versioned documentation bundled in `frontend/node_modules`, as required by the frontend repository instructions.

## 17. Validation and acceptance checklist

### 17.1 Data integrity

- [ ] Every displayed production value maps to a current endpoint or an implemented Section 14 contract.
- [ ] No named viewer, repeat-view identity, buyer score, verification claim, computed cost, or commute estimate appears.
- [ ] Public API responses omit exact address and internal/account data.
- [ ] Broker-entered price and facts are visually distinct from platform labels.
- [ ] Marketing examples are visibly labelled and never mixed into real metrics.

### 17.2 Responsive and accessibility

- [ ] Core journey passes at 360 × 800 and 390 × 844 on representative Android devices.
- [ ] Management layouts pass at 768, 1024, 1280, and 1440 px.
- [ ] Every interactive target is at least 44 × 44 px.
- [ ] No horizontal page scroll at supported widths.
- [ ] Sticky CTAs do not cover content or safe areas.
- [ ] Light and Dark meet WCAG AA, including unsafe broker-colour inputs.
- [ ] Keyboard, focus, screen-reader names, error association, and reduced motion are verified.

### 17.3 Localization

- [ ] Every application-owned string uses a typed translation key.
- [ ] Missing keys fail visibly in development and fall back to English in production.
- [ ] Layout tolerates at least 35% Devanagari expansion without truncating primary actions.
- [ ] Dates, prices, and counts use consistent Indian formatting.
- [ ] Native speakers approve Hindi and Marathi before production.

### 17.4 Network and state behavior

- [ ] Loading, empty, validation, offline, fetch failure, permission, upload retry, AI unavailable, share failure, inactive listing, expired pilot, publish success, and share success are covered.
- [ ] Independent dashboard sections fail independently.
- [ ] Contact actions still open if analytics logging fails.
- [ ] Unsaved create/edit work is not silently destroyed by refetch or auth expiry.
- [ ] Public unavailable states correctly distinguish 403, 404, and 410 responses.

### 17.5 End-to-end release gate

- [ ] Signup and login, including real API errors, pass.
- [ ] Onboarding progress remains server-authoritative.
- [ ] Create → upload → publish → public preview passes.
- [ ] WhatsApp preview is human-readable and encoded exactly once.
- [ ] Production share URL is public `https`, never localhost.
- [ ] Public view and image events are recorded without blocking the page.
- [ ] WhatsApp/phone action creates the supported event/lead and still opens the target app.
- [ ] Broker can review the lead, contact it, add notes, and update status.
- [ ] Theme and locale persist with the precedence defined in Section 7.
- [ ] Public property and storefront meet the slow-4G performance target.
- [ ] Legal wording is professionally reviewed before paid-user release.

## 18. Definition of done

The final UI implementation is done when all existing routes and the three approved route additions (`/dashboard/onboarding`, `/dashboard/properties`, and `/b/[public_slug]`) match this specification; the primary broker-to-buyer journey passes on mobile; unsupported concept features are absent; Light/Dark and all three locale dictionaries pass QA; public privacy rules are enforced by serializers as well as presentation; and the Section 17 release gate is complete.

Until then, visual polish alone is not market readiness.
