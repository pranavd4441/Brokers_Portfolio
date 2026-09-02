# PropertyOS: production UI implementation and review loop

Copy the task brief below into the implementation task. This is an execution prompt, not a claim that the current product is production-ready. Creating this file does not authorize running the loop, deploying, or sending WhatsApp messages.

## Task brief

Act as the product designer, frontend engineer, and skeptical QA reviewer for PropertyOS. Work through these roles sequentially. Do not spawn additional agents unless I explicitly authorize them.

Your task is to implement and validate a coherent, broker-first interface in the existing application. A palette change, smaller sidebar, new component package, successful build, or automated accessibility pass is not sufficient evidence of a successful redesign.

The previous pass changed the shared shell, Today, Listings, and Conversations, but left important listing and lead workflows on older components. Its screenshots used placeholder property images, and its browser fixtures mocked APIs. Preserve useful work, but do not treat those results as visual approval or proof of the live business journey.

### 1. Product outcome and boundaries

PropertyOS is the broker's personalized digital office, with WhatsApp-to-inventory as the primary acquisition and daily-use workflow:

**Receive/forward property material → private draft → broker review and corrections → publish → readable WhatsApp sharing → buyer-facing branded property page → genuine enquiry → broker follow-up.**

Support this workflow before adding decorative dashboards or unrelated features. Public pages should feel like the broker's business, with restrained PropertyOS attribution. Brokers must understand what is saved, private, published, or still processing.

Keep existing data, tenant isolation, authentication, routes, APIs, and working WhatsApp behavior intact. Do not invent buyer identities, engagement scores, verification, AI results, autosave, public availability, testimonials, or performance statistics. Unknown information must remain unknown. CTA clicks are not automatically identified buyers.

Use `docs/FINAL_UI_SPEC.md` for supported behavior and `docs/DESIGN_FOUNDATION_V2.md` for direction. The current user's feedback takes precedence over any document claiming the implementation is approved. Keep unsupported costs, commute analysis, buyer-fit recommendations, comparison, shortlist, and scheduling features deferred. A storefront needs its documented public resolver; do not imitate one with private endpoints or invented data.

### 2. Prove what the user is actually seeing

Before editing:

1. Read repository instructions, current specifications, package versions, component configuration, Git status, and the relevant installed skills. Read the installed Next.js documentation before writing Next.js code.
2. Identify the exact branch, working directory, frontend process, backend, port, and build serving the user's URL. Use read-only diagnostics. Do not assume that an unchanged screen is a cache problem.
3. Capture the current rendered target screen at desktop and mobile sizes. Confirm that an identifiable current code change appears in the actual rendered DOM. Separate the authenticated application from fixture-backed tests.
4. Inventory every actual route and its shared components. Record each as untouched, partially migrated, implemented, visually reviewed, or behaviorally verified. Do not collapse these states into one “done” status.
5. Locate the actual approved reference images. Do not invent their contents or select an unrelated old concept as the new target. If the reference is missing or ambiguous, report the gap and request one decisive choice before broad migration.

Deliver a short baseline audit: the five most consequential problems, with source locations and screenshots. Explain whether each is a stale-build issue, missing migration, visual-composition problem, interaction problem, or backend dependency. Mark anything not directly verified as unverified.

### 3. Lock a practical visual contract

Retain the agreed direction: quiet confidence, warm neutral/light surfaces, restrained forest-green accents, and a corresponding dark theme. Public experiences are property- and broker-led; the workspace is task-led. Take principles from the approved international references, not their branding or layouts.

Record a short implementation contract before expansion:

- Workspace typography must remain readable: generally 14–16 px for working content, 12–13 px for secondary metadata. Do not solve density by shrinking essential labels, commands, prices, or statuses to 9–11 px. Allow larger text and Devanagari expansion.
- Use consistent spacing, radii, borders, icon sizing, focus treatment, and control variants. Neutral surfaces establish hierarchy; accent colour identifies meaningful actions.
- Touch controls are at least 44 × 44 CSS px. Keep desktop compact without compressing mobile controls. Critical actions have labels or clear accessible names.
- Use permissioned, realistic property photography for visual evaluation; use long titles, missing images, large prices, and varied content as stress cases. Fixture/demo material must never masquerade as actual customer inventory.
- Avoid repeated oversized banners, a box around every label, excessive pills, arbitrary gradients, and repetitive card grids where a list, editor, or master/detail view better serves the task.
- No workflow-important truncation without an accessible way to read the full value. Sticky navigation and keyboards must not obscure save, publish, error, or enquiry actions.
- Both themes need legible text, visible focus, and safe broker-accent fallbacks. Do not use colour alone for status.

Keep the verified existing stack: Next.js, React, TypeScript, Tailwind, shadcn/Base UI, Lucide, and the existing data/state libraries. Audit installed components first. Use official documented components and reusable local variants; do not reinstall a preset, add a competing library, copy an entire dashboard template, or bypass TLS checks.

Build actual shared primitives for fields, validation, buttons, input groups, selections, menus, dialogs, status badges, feedback, empty states, uploads, and cards. Migrate consumers to them. Native HTML controls are not inherently unprofessional; inconsistent styling and poor workflow composition are the problem. Do not replace a suitable native control merely for appearance.

### 4. First complete one reference implementation

Start with **Listings and WhatsApp draft review**, not another general dashboard reskin.

Listings must make both WhatsApp intake and manual creation discoverable, expose real inventory clearly, and make the next action obvious. Draft review must show source material, extracted values, missing/uncertain fields, photo management, corrections, and a clear private-to-published transition using supported data.

Build this as working application UI with representative content, not a new image mockup. Test desktop and mobile, Light and Dark. Present matched before/after screenshots, describe the concrete interaction changes, and request visual approval of this reference implementation before applying its design broadly. If the user has already explicitly approved the same implemented reference, reuse that approval.

Do not label your own subjective score “user acceptance.” If the result is still structurally generic or fails the agreed reference, revise the composition rather than merely changing padding and colour again.

### 5. Repeat the implementation loop

For each small route/workflow batch:

1. **Observe:** open the actual route; inspect its current behavior, data, and states.
2. **Diagnose:** list the three highest-impact defects and define an observable acceptance condition for each.
3. **Implement:** make substantive composition or interaction changes; reuse the approved component system; preserve API behavior.
4. **Exercise:** run the main task with representative content and trigger its loading, empty, validation, error, and recovery states.
5. **Inspect:** capture and view matched before/after images. Compare hierarchy, readable density, imagery, alignment, consistency, and task clarity against the approved reference.
6. **Verify:** run relevant automated checks and a real-backend local journey. Review the diff for unrelated changes and security/privacy regressions.
7. **Record:** update `docs/UI_IMPLEMENTATION_STATUS.md` with route, iteration, defects fixed, remaining issues, screenshot paths, test results, and next action.
8. **Decide:** revise if any required condition fails. Proceed only after the batch's conditions pass. After three cycles without meaningful improvement, report the specific unresolved decision or technical cause; do not repeat cosmetic changes indefinitely.

Suggested batch order after the reference implementation is approved:

- Intake, import queue, draft review, manual creation, editing, and publish/share feedback.
- Public property experience and supported broker identity/storefront work.
- Leads, follow-up, Today, and recorded conversations.
- Branding, profile, onboarding, authentication, commercial, support, and legal-page layouts.

Discover exact routes from the code. Do not claim an unvisited route is migrated because it inherits a changed stylesheet.

### 6. Non-negotiable verification gates

**Visual and responsive**

- Inspect every migrated route at 360 px and 1440 px. Also test critical journeys at 390/430, 768, 1024, and 1920 px and with enlarged text/200% zoom.
- Validate both themes and English, Hindi, and Marathi layout expansion. Translate application-owned strings through dictionaries; keep entered property content unchanged. Native-speaker review is a separate release gate.
- No horizontal page overflow, broken image treatment, illegible contrast, clipped controls, focus loss, or sticky elements covering content.
- Add screenshot regression comparisons only after a baseline has been visually approved. Saving screenshots alone is not a visual regression test. Never blindly update snapshots to make failures disappear.

**Interaction and data**

- Exercise create, upload/retry, private draft review, edit, publish, share, public enquiry, and follow-up against the local backend. Keep fixture-based tests for deterministic failures, but label them accurately.
- Verify draft privacy, public zero-auth access, private-address protection, and cross-tenant access boundaries. Preserve and extend existing security tests.
- Check text/photos and each currently supported WhatsApp input. If voice/media/AI services or webhook connectivity are unavailable, expose honest fallback states and record the integration gate as blocked or unverified.
- Prove share text is human-readable and encoded exactly once. A localhost URL cannot be accepted as a cross-device public sharing test.
- Test network failure, empty inventory, invalid inputs, upload failure, AI unavailability, share failure, inactive listings, permissions, and expired-pilot behavior where supported. Preserve entered data on recoverable failures. Never show success before the server confirms it.

**Engineering and release**

- Run build, type/lint checks, component tests, relevant backend tests, and the full browser regression suite. Report existing warnings separately from new failures. Do not weaken assertions or remove failing checks to pass.
- Test keyboard navigation, accessible names, headings, dialogs, and focus restoration in addition to automated accessibility scans. Automated scans do not certify full accessibility.
- Measure the production build on a declared mobile/network profile. Use explicit performance budgets, record actual results, and address oversized images, layout shifts, and unnecessary JavaScript. Do not claim field performance from a local Lighthouse score.
- Keep deployment, live WhatsApp delivery, browser/device testing, monitoring, backups/recovery, privacy/security review, and legal review as distinct release gates. UI completion does not prove operational readiness or market adoption.

### 7. Authority, stopping, and handoff

Preserve existing staged and unstaged work and generated images. Use scoped, reversible edits; no destructive Git operations. Do not commit, push, deploy, install global tools, change infrastructure/accounts, or send messages to real people without explicit authorization for that action. Use test tenants and authorized test recipients; never expose secrets or customer data in screenshots or logs.

Read the status file on resume and continue from the last verified checkpoint. Provide concise progress updates naming the actual route and outcome. Do not run idle loops, create recurring automations, or declare completion merely because time/context is running out.

Finish with:

1. Working preview links and confirmation of the build being served.
2. Before/after screenshots of the actual implementation.
3. Route coverage and specific components/interactions changed.
4. Test and measurement results, clearly separating mocks, local integration, and real-device/live-service checks.
5. Remaining release blockers, deferred features, and any visual approval still required.

Use separate statuses: **implemented**, **visually accepted**, **locally integration-tested**, and **production-ready**. Claim the last status only when every required operational and human-review gate has evidence. The ultimate broker-retention and paying-customer goals require real pilot results; software tests cannot establish them.

Start with the baseline audit. Do not begin another broad reskin or treat the current staged UI as approved.
