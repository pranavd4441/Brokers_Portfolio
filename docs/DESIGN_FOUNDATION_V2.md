# PropertyOS Design Foundation V2

Status: **Approved direction — 2 September 2026**

Scope: design philosophy, visual theme, design stack, interaction rules and anchor-screen direction.

Implementation status: merged into `FINAL_UI_SPEC.md`, which remains the implementation authority. The first implementation covers the shared shell, Today, Listings and Conversations. Remaining routes and full interface localization are follow-up work; the reference concepts are not a claim that those screens are implemented.

## 1. Product design thesis

PropertyOS is not a property portal and it is not a generic CRM. It is the broker's daily operating workspace and the broker's presentation layer for buyers.

The design must express three roles clearly:

1. **Property is the hero** on public pages.
2. **Broker is the trusted guide** throughout the buyer journey.
3. **PropertyOS stays quietly in the background** as the system that makes the experience fast, reliable and professional.

The core design statement is:

> **Luxury outside. Efficiency inside.**

The supporting philosophy is:

> **Quiet confidence, operational clarity and human trust.**

PropertyOS should feel established without feeling corporate, premium without becoming decorative, and powerful without exposing unnecessary complexity.

## 2. What we learn from international products

These products are references for principles only. PropertyOS must not copy their layouts, visual identity, proprietary components or brand language.

### Airbnb — effortless visual discovery and host workflows

Reference: [Airbnb](https://www.airbnb.com/) and the [Airbnb 2025 product redesign](https://news.airbnb.com/en-au/2025-may-release-now-you-can-airbnb-more-than-an-airbnb/).

Borrow:

- Photography carries the emotional weight.
- Search and filtering feel conversational instead of form-heavy.
- Listing cards expose only the facts needed for the current decision.
- Progressive disclosure keeps advanced details out of the first view.
- Host tools organise work around **Today**, **Listings** and messages.
- Motion adds spatial understanding and feedback rather than decoration.
- Mobile actions remain reachable and context-aware.

Do not borrow:

- Consumer-travel categories that do not match broker work.
- Excessive floating pills or playful animation inside operational screens.
- Airbnb red, typography or recognisable card composition.

### Redfin and Rightmove — inventory density and fast narrowing

References: [Redfin search guidance](https://support.redfin.com/hc/en-us/articles/360001432632-Searching-for-Homes) and [Rightmove property search](https://www.rightmove.co.uk/property-for-sale.html).

Borrow:

- Search, filters, result count and sort belong in one compact toolbar.
- Users should be able to scan many listings without opening each one.
- Status, price, location and key facts must be comparable at a glance.
- Saved state and recent activity should remain visible.
- Desktop may use dense rows or split views; mobile becomes cards or sheets.

Do not borrow:

- Portal-scale navigation and buyer acquisition clutter.
- Dozens of filters before the user has expressed intent.
- A visual identity that makes PropertyOS appear to be another listing marketplace.

### Zillow — decision transparency

Reference: [Zillow](https://www.zillow.com/).

Borrow:

- Clear separation between known facts, estimates and recommendations.
- Price and affordability information should be easy to find and understand.
- Strong media presentation with facts directly adjacent to it.
- Personalisation must explain why information is being shown.

Do not borrow:

- Automated valuations, qualification claims or recommendation language unless PropertyOS has the data and consent to support them.

### Compass — agent empowerment with luxury restraint

References: [Compass](https://www.compass.com/) and [Compass About](https://www.compass.com/about/).

Borrow:

- Technology should increase the broker's time for advice and relationships.
- Agent identity and local expertise are part of the product, not footer content.
- Restrained colour, strong typography and editorial imagery communicate confidence.
- Service design should feel seamless across marketing and operations.

Do not borrow:

- An all-black luxury stereotype.
- Large marketing whitespace inside the broker's working screens.
- Compass layouts, brand voice or visual signature.

### Sotheby's International Realty — editorial property storytelling

Reference: [Sotheby's International Realty](https://www.sothebysrealty.com/eng).

Borrow:

- Large, disciplined photography.
- Editorial pacing on public property pages.
- Typography and whitespace that frame the property instead of competing with it.
- Local and lifestyle narrative after the essential facts.

Do not borrow:

- Luxury-only language that alienates brokers handling mainstream inventory.
- Decorative serif typography inside forms, tables or operational navigation.

## 3. PropertyOS design principles

### 3.1 One screen, one clear outcome

Every screen must answer: **What is the most useful next action?**

- One primary action per page or task region.
- Secondary actions remain visible but visually quieter.
- Duplicate actions are removed.
- The primary action may change with state: complete, review, publish, share or follow up.

### 3.2 Calm density

Broker workflows need more information than a marketing site, but density must remain legible.

- Workspace screens use compact rows, toolbars and separators.
- Cards are used for meaningful grouping, not as wrappers around everything.
- Public pages use more whitespace because their job is persuasion and trust.
- Empty space must create hierarchy, not push the work below the fold.

### 3.3 Property first, broker always present

- Listing imagery and facts lead buyer-facing screens.
- Broker portrait, name, service area and contact actions remain consistently available.
- PropertyOS branding is limited to a restrained “Powered by PropertyOS.”

### 3.4 Truth before persuasion

- Broker-provided, generated, estimated and verified information must be visually distinct.
- Missing data is shown honestly rather than replaced with invented content.
- Exact location remains private until disclosure is appropriate.
- AI assists composition and extraction; it never silently changes property facts.

### 3.5 Progressive disclosure

- Show the minimum information needed for the current decision.
- Advanced settings, secondary property facts and history open in accordions, drawers or detail panels.
- Forms are divided into short, named sections with visible progress.

### 3.6 Mobile field reality

- Design first for 390 px Android screens and unreliable connectivity.
- Primary actions remain within thumb reach.
- Touch targets are at least 44 px.
- Upload, offline, retry and draft states are first-class experiences.
- Desktop adds density and multi-pane workflows; it does not simply enlarge mobile cards.

### 3.7 Familiar patterns, distinctive composition

PropertyOS uses familiar controls so brokers do not need training. Differentiation comes from workflow, broker identity, information hierarchy and presentation quality—not unusual controls.

### 3.8 Delight through response

Delight means the product responds clearly:

- optimistic but reversible state updates;
- immediate upload and save feedback;
- subtle transitions between list, detail and review;
- useful skeletons that preserve layout;
- no decorative animation competing with work.

## 4. Three visual modes within one system

### 4.1 Broker Workspace — compact and operational

Used for Today, Listings, Leads, Conversations, listing studio and settings.

- Neutral canvas with white or dark elevated work surfaces.
- Compact page headers and filter toolbars.
- Higher information density and stronger alignment.
- Dividers are preferred over nesting every item inside a card.
- Broker accent appears on active navigation, primary action and selected state only.

### 4.2 Public Property Experience — image-led and editorial

- Photography leads.
- Essential facts and price are immediately visible.
- Broker identity and contact actions are persistent but do not cover important content.
- Long-form description and local expertise use comfortable reading widths.
- Trust/source labels are restrained and explicit.

### 4.3 Broker Storefront — identity-led and curated

- Broker portrait/logo and local expertise lead.
- Inventory is curated rather than presented as an endless portal grid.
- One clear contact path and a small number of property groupings.
- PropertyOS remains visually secondary.

## 5. Visual theme: Quiet Estate

The default theme is warm and contemporary, but less beige than the current UI. White surfaces, sharper text contrast and fewer rounded containers create a cleaner professional workspace.

### 5.1 Light theme

| Role | Token | Value |
|---|---|---:|
| App canvas | `--ui-bg` | `#F6F7F5` |
| Primary surface | `--ui-surface` | `#FFFFFF` |
| Subtle surface | `--ui-surface-muted` | `#F0F2EF` |
| Raised surface | `--ui-surface-raised` | `#FFFFFF` |
| Primary text | `--ui-text` | `#17201C` |
| Secondary text | `--ui-text-muted` | `#66706B` |
| Border | `--ui-border` | `#E0E4E1` |
| PropertyOS fallback | `--ui-brand-fallback` | `#17624A` |
| Warm editorial accent | `--ui-accent-warm` | `#B87925` |
| Focus | `--ui-focus` | `#285FC7` |
| Success | `--ui-success` | `#277A50` |
| Warning | `--ui-warning` | `#94620D` |
| Danger | `--ui-danger` | `#B64235` |

### 5.2 Dark theme

| Role | Token | Value |
|---|---|---:|
| App canvas | `--ui-bg` | `#0F1311` |
| Primary surface | `--ui-surface` | `#171C19` |
| Subtle surface | `--ui-surface-muted` | `#202622` |
| Raised surface | `--ui-surface-raised` | `#252C28` |
| Primary text | `--ui-text` | `#F5F7F5` |
| Secondary text | `--ui-text-muted` | `#A7B0AA` |
| Border | `--ui-border` | `#303833` |
| PropertyOS fallback | `--ui-brand-fallback` | `#63C59B` |
| Warm editorial accent | `--ui-accent-warm` | `#E0A552` |
| Focus | `--ui-focus` | `#86B8FF` |

### 5.3 Broker accent rule

- Broker colour occupies no more than roughly 10–15% of a workspace screen.
- It may colour the primary button, active navigation indicator, selection ring and small highlights.
- It must not recolour the page background, all cards, semantic statuses or long text.
- Unsafe colours fall back to the accessible PropertyOS evergreen for controls while the original colour remains available for decorative branding.
- Public pages may use slightly more broker colour, but property imagery remains dominant.

### 5.4 Colour behavior to avoid

- No white text on a light background.
- No grey-on-grey chat cards.
- No large blue buttons repeated across the same screen.
- No gradient as a substitute for hierarchy.
- No beige surface nested inside beige surface unless the boundary remains unmistakable.

## 6. Typography

### 6.1 Font roles

- Workspace and Latin UI: **Inter Variable**.
- Hindi and Marathi: **Noto Sans Devanagari**.
- Optional public-page editorial headings: **Newsreader** for English only.
- All fonts must be bundled at build time.

### 6.2 Workspace type scale

| Role | Size | Weight | Line height |
|---|---:|---:|---:|
| Page title | 28–32 px | 650–700 | 1.15 |
| Section title | 20–22 px | 650 | 1.25 |
| Card/row title | 15–17 px | 600 | 1.35 |
| Body | 14–16 px | 400 | 1.5 |
| Label | 13–14 px | 550–600 | 1.35 |
| Caption | 12 px | 500 | 1.4 |

Large 48–64 px display type is reserved for marketing and selected public-property moments. It must not appear in routine dashboard headers.

## 7. Shape, spacing and elevation

- Base spacing unit: 4 px.
- Workspace page gutter: 20 px mobile, 24 px tablet, 28–32 px desktop.
- Control height: 40 px compact desktop, minimum 44 px touch.
- Field radius: 10 px.
- Standard workspace card radius: 12–14 px.
- Public/editorial card radius: 18–24 px.
- Pills are reserved for statuses, compact filters and segmented controls.
- Shadows are reserved for overlays, sticky action bars and photography overlays.
- Ordinary cards use a border or surface difference, not a large shadow.
- Normal motion: 160–220 ms with reduced-motion support.

## 8. Application shell

### Desktop

- Sidebar width: 216–224 px.
- Workspace identity occupies one compact row.
- Navigation row height: 40–44 px.
- Only one persistent create button.
- Trial/plan state becomes a compact badge or small top-bar item, not a full-width banner.
- Optional top bar contains command search, notifications/help and profile.
- Content begins close to the top and uses available width.

### Mobile

- Four navigation items: Today, Listings, Leads and More.
- Page header remains compact.
- Primary action may become a floating/sticky action only when the workflow requires it.
- Filters open in a bottom sheet; active filters remain visible as removable chips.

## 9. Anchor-screen direction

### Today / Action Desk

- Compact greeting and one primary action.
- A short operational summary: new leads, drafts to review, follow-ups and expiring listings.
- Priority work appears in grouped rows with clear next actions.
- Completed/low-priority work is collapsed by default.

### Listings

- Listings begin immediately below a compact header.
- One toolbar combines search, status and property type. Sort and view-mode controls remain deferred until their behavior is implemented.
- Desktop supports information-rich rows or a restrained grid; mobile uses cards.
- WhatsApp imports appears as a filter/count and secondary action, not a large promotional banner.
- Each listing exposes price, location, facts, status, activity and the next relevant action.

### Conversations

- Full-height master/detail workspace.
- Conversation list: 260–280 px desktop, full screen mobile.
- Selected chat uses a readable message timeline, date markers and attachment treatment.
- Bot/system events are visually distinct from broker and buyer messages.
- Session context occupies a compact third pane on wide desktops; it is hidden below 1280 px to preserve message width. Linked contact/property context requires supporting data before implementation.
- Emoji are not used as interface icons.

### Listing Studio

- Named sections: media, essentials, location, features, presentation and publish.
- Visible section progress. Show saved state only after a successful persistence response; manual autosave remains deferred.
- Labels remain above fields; placeholders never replace them.
- Desktop uses a section rail and live preview; mobile uses one section at a time.
- Save draft is quiet; publish is the single primary completion action.

## 10. Design and frontend stack

### Keep

- Next.js App Router, React and TypeScript.
- Tailwind CSS 4 with semantic CSS variables.
- shadcn **base-nova** components powered by Base UI.
- Lucide outline icons only.
- TanStack Query for server state.
- Zustand for authentication and small application preferences, not duplicated server data.
- Framer Motion for limited layout transitions and state feedback.
- Storybook, axe and Playwright for visual, accessibility and responsive QA.

### Add during implementation

- React Hook Form and Zod for consistent form state, validation and schemas.
- Missing official shadcn primitives required by the approved screen: Select, Combobox, Tabs, Table, Sheet, Drawer, Dropdown Menu, Tooltip, Empty, Progress, Spinner and chat primitives.
- A small token/component Storybook covering themes, states and broker accent safety.

### Do not add

- MUI, Ant Design, Chakra or another competing component system.
- Complete dashboard templates.
- Mixed icon families or emoji UI icons.
- Random component registries without source and licence review.
- Heavy animation libraries beyond the existing motion dependency.

## 11. Component composition rules

- Use semantic tokens; route files do not contain product colours.
- Use official installed components before custom markup.
- Forms use Field, FieldGroup, visible labels and accessible validation.
- Selects, dialogs, sheets, empty states, skeletons, badges and alerts use shared primitives.
- Conversations use shared message, bubble, attachment, marker and scroller primitives.
- Cards follow a common header/content/footer structure.
- Every state is designed: loading, empty, error, offline, disabled, success and retry.
- Components are verified in Light, Dark, English, Hindi and Marathi.

## 12. Acceptance criteria for the UI reset

- No duplicate primary action on a screen.
- No routine dashboard title larger than 32 px on desktop.
- Core inventory content is visible above the fold at 1440 × 900.
- Conversation text and controls meet WCAG AA contrast.
- No emoji are used as product icons.
- Native-looking forms are replaced with consistent shared components and visible labels.
- Mobile layouts work at 360 px without horizontal scrolling.
- Broker accent cannot make text or controls unreadable.
- Public pages remain visually distinct from the operational workspace while sharing tokens and components.
- Every anchor screen passes desktop and Android Playwright checks and automated accessibility checks.

## 13. Recommended implementation order after approval

1. Merge this foundation into `FINAL_UI_SPEC.md`.
2. Build a token and component board in Storybook.
3. Replace the application shell and plan presentation.
4. Rebuild Listings as the density reference.
5. Rebuild Today / Action Desk.
6. Rebuild Conversations with messaging primitives.
7. Rebuild the listing studio and WhatsApp review flow.
8. Apply the system to Leads, Settings and remaining authenticated routes.
9. Refine public property and storefront surfaces.
10. Resume live WhatsApp integration after the three anchor screens pass field-ready QA.
