# Real Estate Platform Landing Page: Master Implementation Prompt

Prepared from the current PropertyOS project and a live inspection of [Antoc](https://www.antoc.ai/).

## Reference Findings

Antoc combines a prominent demo entry, product screenshots, feature selectors, a pinned mobile-screen sequence, billing controls, comparison rows, moving testimonials and an assistant. Its [assessment](https://www.antoc.ai/business-health-check) opens with progress and answer choices. Those patterns can make a complex product easier to evaluate. In the inspected session, the assistant opened over the hero; the pinned sequence also required substantial scrolling. Adapt the product evidence and direct controls, with a shorter, quieter experience. Client counts, testimonials and capabilities on that site are its own claims, not verified evidence for this project. Animation timings below are original implementation specifications, not measurements of Antoc.

---

# Begin Implementation Prompt

## 1. Your Role and Deliverable

Act as a senior product designer and frontend engineer working with a real-estate SaaS founder. Upgrade the existing landing page into an original, credible, highly usable product experience for independent Indian brokers and small agencies.

Use the reference website as inspiration for showing a product through demonstrations and progressive disclosure. Develop our own composition, copy, visual assets and motion language. Do not reproduce another company's branding, customer proof, screenshots, proprietary illustrations or written copy.

Deliver implemented, tested code in the existing repository. This assignment concerns the public landing page, interactive public demos and the connected signup/support journey. It does not authorize building an entire CRM, launching paid campaigns, deploying publicly or changing billing policies. Preserve working application routes and existing user changes.

The experience should communicate three things quickly: what a broker can do today, what their buyer will see, and why it is worth trying with one real property.

## 2. Read the Existing Project First

Inspect repository instructions, package versions, branch and worktree status before editing. The current work is on `codex/landing-page`; verify that this remains true. Never switch branches or discard changes merely to match this brief.

Read these files and build on their current contents:

- `frontend/src/app/page.tsx`
- `frontend/src/app/globals.css`
- `frontend/src/app/layout.tsx`
- `frontend/src/components/landing/LandingHero.tsx`
- `frontend/src/components/landing/TrustBar.tsx`, if present
- `frontend/src/components/landing/CreationWalkthrough.tsx`
- `frontend/src/components/landing/FeatureShowcase.tsx`
- `frontend/src/components/landing/SamplePortfolio.tsx`
- `frontend/src/components/landing/content.ts`
- `frontend/src/components/landing/signup-content.ts`
- `frontend/src/app/auth/signup/page.tsx`
- `frontend/src/app/support/page.tsx`
- Relevant account quotas, property types, lead workflows and WhatsApp configuration.

The repository currently uses Next.js App Router, TypeScript, React, Tailwind, Lucide and shadcn components based on Base UI. Framer Motion is already available. Read the installed Next.js documentation and reuse local component APIs. Avoid installing another animation or component framework for the same job.

Provide a short capability inventory before implementation. Classify each advertised capability as verified working, requiring configuration, prototype-only or planned. Report concrete evidence rather than inferring functionality from a dashboard label.

## 3. Product Positioning

The audience includes individual brokers, small agencies and real-estate professionals handling residential, commercial and land transactions. Buyers and property owners may also visit sample pages. The brand must not imply that the product is exclusively for homes or apartments.

Use PropertyOS as the working name until the founder chooses a final name. Do not invent a domain, claim domain availability or undertake a rebrand during this work. Make shared branding easy to update through an existing configuration pattern where appropriate.

Communicate the current core workflow: add accurate property information, prepare a branded listing page, share it on WhatsApp, capture enquiries and organise follow-up. Present the broader broker-website vision honestly. Do not suggest that this software guarantees leads, closes transactions automatically or verifies land ownership.

Primary conversion: a broker starts an assisted trial. Product activation: that broker publishes and shares a real listing, then returns to work on an enquiry. A demo interaction is useful evidence of interest but is not equivalent to activation.

## 4. Truth and Offer Constraints

Recheck these facts against the current code and configuration before publishing them:

- The signup journey offers a 14-day assisted trial without collecting a payment card.
- Current FREE quotas are 10 listings, 2 users and 50 leads.
- Current PRO quotas are 100 listings, 5 users and 500 leads.
- The current founder offer displays INR 499 per month with assisted activation. Do not invent annual discounts, automatic renewal, price guarantees, included taxes or a payment checkout.
- The approved broker support number is `+918855023247`. Use the `wa.me/918855023247` destination. Retain the existing configuration mechanism and validate it.
- No support email has been approved in this conversation. Do not invent one or restore an unverified placeholder address.
- Branded individual property pages exist. The current public portfolio is illustrative. Dedicated broker subdomains and custom-domain websites remain planned unless the repository now proves otherwise.
- Community services, 3D visits and legal-service coordination are future directions, not included benefits.
- A shared WhatsApp link is different from provider-backed automated messages. State setup requirements and unknown allowances honestly.
- AI drafts require review. Do not advertise unlimited usage or guaranteed factual accuracy.

Do not show invented customer logos, five-star ratings, user counts, conversion gains, security certifications or measured loading times. Avoid blanket claims about total privacy, guaranteed deliverability, unlimited capacity or all-inclusive automation.

## 5. Experience and Visual Direction

Create a restrained, confident product brand. The page should feel credible to a broker using it between calls and site visits. Use legible text, strong product imagery, clear sections and economical interaction.

Use neutral white and cool off-white surfaces, charcoal text, a deep green action colour and a small warm accent for informative emphasis. Reserve blue for selected informational states where useful. Define semantic landing tokens and scope them so dashboard themes remain unaffected. Do not make the whole page a single-colour wash.

Use the existing local Inter and Devanagari fonts. Keep letter spacing at zero. Set font sizes using explicit responsive breakpoints rather than viewport-width scaling. Suggested ranges: desktop H1 48-60px, mobile H1 30-38px, desktop section headings 30-36px, mobile section headings 24-28px, body 15-18px, supporting labels 12-14px. Verify actual Hindi and Marathi wrapping rather than assuming English dimensions work.

Use a constrained inner width of approximately 1160-1240px, with 16-20px mobile gutters. Most sections should be unframed full-width bands. Cards are appropriate for repeated property items and plans; keep their radius at 8px or less. Do not place decorative cards inside cards. A product screenshot may have a simple browser or device frame when that frame clarifies context.

Avoid decorative glow blobs, bouncing badges, exaggerated glass effects, oversized floating icons, cursor trails and gratuitous parallax. Use actual property photos and our own interface imagery. Do not use another product's screenshots as evidence of our capabilities.

## 6. Recommended Page Sequence

Use this narrative order, adjusting only where the existing implementation provides a stronger reason:

1. Compact navigation and language selection.
2. Clear category-led hero and trial/demo actions.
3. A concise, factual reassurance strip.
4. Interactive product walkthrough.
5. Buyer-facing sample listings across property categories.
6. A concise demonstration of WhatsApp sharing and AI-assisted preparation.
7. Optional workflow self-assessment, subordinate to the main journey.
8. Trial and paid-offer comparison.
9. FAQ covering setup, limits and future capabilities.
10. Final trial action, support and legal links.

Do not repeat the same three-step process in multiple sections. Keep educational extras collapsible or on a small dedicated route when the homepage becomes too long. Essential content must remain readable when animations are disabled.

## 7. Navigation and Hero

Keep the header compact: working brand link, Product, Samples, Pricing, FAQs, language selector, Log in and a trial action where space allows. Mobile must retain login and language access; use an accessible menu for section links. No horizontal overflow at 320px. Close the menu on navigation and Escape, and restore sensible keyboard focus.

Use one H1 stating the literal category, for example: "Real estate workspace for independent brokers." Supporting copy can express the broader proposition: "Create branded property pages, share on WhatsApp and organise enquiries across residential, commercial and land listings."

Use a relevant full-width photographic hero with readable text over it. Retain a visible sense of the property environment. Avoid a split hero with a decorative preview card beside the headline. If the current hero already meets these requirements, improve its hierarchy rather than rebuilding it solely for novelty.

Primary action: "Start free trial", linking through the existing signup helper with language and source preserved. Secondary action: "Explore the product", opening or scrolling to a real interactive walkthrough. Provide a separate sample-listing action within that walkthrough. Do not label a WhatsApp contact link as a video demo.

Keep the next section's heading or factual strip visible at the bottom of common first viewports. Validate this at 390x844, 1280x720 and 1440x900. Reduce hero height and spacing before shrinking text below comfortable sizes. Do not lock the page to a fixed hero height that clips translations or zoomed text.

## 8. Product Walkthrough and Feature Explorer

Build one coherent demonstration with selectable steps that correspond to capabilities we can actually show. Suggested steps are listing preparation, branded page preview, WhatsApp share and captured enquiry. A fifth step for follow-up should appear only if its behaviour can be demonstrated accurately.

Each step contains a short benefit heading, no more than three concrete points, and a readable real screenshot or interactive local demo. Show the exact same illustrative property across the sequence so the visitor can follow its journey. Avoid screenshots with unreadable miniature text or a collage of unrelated dashboards.

Desktop can use a sticky preview beside an unframed list of step controls. Keep any scroll-linked portion short; do not require several screens of empty travel to reveal the next state. Selecting a step must immediately update the preview and must not be overwritten by a scroll observer. Choose one authoritative active-step state and define how manual selection temporarily takes precedence.

Use accessible tabs or equivalent established controls with names, selected state and keyboard navigation. Support direct selection, previous/next controls where needed, and a readable step indicator. Keep preview dimensions stable between steps.

Mobile uses ordinary document flow with a compact step selector and a stable preview. Avoid pinned full-screen phone mockups and scroll traps. All steps must be reachable without a swipe gesture; gestures can be optional enhancements.

If the screenshot presents an unfinished feature, label it "Preview" or "Planned" at the point of display. Do not style decorative pixels as working controls. For interactive demos, clicking a visible control must produce the corresponding local state change.

## 9. Sample Portfolio and Property Details

Preserve the current working sample portfolio, filters, detail dialogs and shareable query-state links. Extend it only when the extension materially improves evaluation.

Provide residential, commercial and plots/land examples with type-appropriate information. Residential may show bedrooms and occupancy readiness. Commercial should prioritise use, area, lease terms and furnishing. Land should prioritise area, access and explicitly unverified land-use or title information. Never reuse BHK as a universal property field.

Each sample card should include clear photography, type, location, price basis, relevant specifications and an obvious detail action. Show lease price periods and area units consistently. Use Indian currency formatting without mixing total price and monthly rent.

A detail view includes a gallery where multiple assets exist, price, specifications, description and a working next action to create a similar listing. Copying the sample link should show success or a helpful fallback. A copied link must reopen the correct sample after a reload, preserving the selected language.

Label illustrative listings and photos near the sample section and inside the detail view. Do not pretend samples are live inventory. A simulated enquiry should stay local and explicitly say that no message was sent; do not build a fake contact form that appears to reach a real broker.

For the future broker-site vision, show a distinct, clearly labelled preview only if it helps explain the roadmap. Do not place an invented live subdomain in the address bar or suggest that the trial already provisions a website.

## 10. WhatsApp Demonstration

Show a controlled four-step example: prepare property details, generate a share message, preview the property link, inspect the resulting enquiry context. Use realistic synthetic information and label the demonstration.

Offer a button to copy a prepared message. A user-triggered support link may open WhatsApp with an appropriate draft, but it must not send automatically. Use the approved support number only for support and Pro enquiries, never as the contact on fictional property inventory.

Clearly separate three levels of capability: manual link sharing, an integrated conversation inbox, and provider-backed automation. Advertise only the levels verified in this repository. If explaining automation, indicate configuration requirements rather than implying that adding a phone number is sufficient.

A local demonstration may animate a message progressing through draft and preview states. Do not fabricate external delivery receipts, successful provider requests or actual buyer responses. Do not run broadcasts, scrape contacts or connect an external messaging account as part of this landing-page assignment.

## 11. AI Description Demonstration

Use property facts as input to demonstrate what the AI enhancer does. Include a property-type selector and a short editable fact summary. Let the visitor choose a language and a tone if the existing service supports those options.

Show a clear input-to-draft transformation. Preserve factual fields such as price, area and location. The output must not invent amenities, approvals, distances, yields, ownership, environmental claims or legal status. Display the generated text as an editable draft, with a review reminder and an accessible copy action.

For an unauthenticated landing page, prefer a deterministic, clearly labelled example unless a protected, rate-limited public AI endpoint already exists. Never expose API keys or call the private AI service directly from the browser. Do not introduce paid model usage merely to animate a sample.

A deterministic example must be named as an example, not advertised as live AI generation. Do not add artificial long loading delays to make a static transformation appear intelligent. If using an existing real service, implement pending, failure, retry and cancellation states and preserve the visitor's input on error.

## 12. Optional Broker Workflow Assessment

Create a small optional self-assessment only after the core landing flow is solid. Its purpose is to help a broker identify practical workflow improvements. It must not claim to measure business quality, profitability or market standing.

Use five original questions covering: where listing information is stored, how availability is kept current, how enquiries are recorded, whether each lead has a next action, and how branded information is shared. Use familiar answer choices, one question at a time, visible progress, Back and Restart controls, and no mandatory contact capture.

Use transparent deterministic scoring if a score is included. For example, assign each workflow answer 0, 1 or 2 points and explain the resulting total as a self-reported organisation score. Do not penalise low lead volume or claim statistical benchmarking. Do not imitate the reference's proprietary wording or scoring method.

Return the top two practical actions derived from the answers, a brief explanation and relevant links to our sample or signup. Store only what is necessary locally. Any option to share results with support must show the exact data being shared and require a user action. Never silently append answers to an outbound WhatsApp link.

Keep this experience lightweight, accessible and easily skippable. If it would delay the core page, isolate it as phase two and report it as incomplete rather than adding a nonfunctional button.

## 13. Proof, Pricing and FAQs

Use the factual reassurance strip already in the project, subject to verifying its claims. Prefer statements about the onboarding process and working support channels. A lack of customer testimonials is acceptable; inventing them is not.

Design a testimonial component only if genuine approved material is available. Show a concrete use case, attribution and any approved result. A static row is preferable for reading. If a moving strip is justified, provide pause controls, stop on focus and hover, hide decorative duplicates from assistive technology, and show a static layout for reduced motion.

Keep pricing simple. Distinguish the trial allowance from paid allowances, the payment basis from the billing commitment, and included features from separately configured services. Do not copy a competitor's per-user pricing into our per-workspace offer. Do not offer a billing toggle until both prices and billing behaviours are defined and supported.

When a real toggle exists, update the displayed rate, total commitment and billing description together. A comparison table should include only meaningful differences and must remain usable on mobile. For the current two-option offer, a clear pair of plans may be sufficient.

FAQs must cover property categories, trial expiry, WhatsApp setup, AI limits, enquiry attribution, broker websites/domains and future services. Answers should distinguish implemented capabilities from roadmap plans. Keep legal links and support destinations working; translate landing, signup and support UI without silently changing the meaning of consent language.

## 14. Support Assistant and Conversion Paths

A support launcher is optional. It must remain closed until selected and must not cover the hero, pricing or mobile navigation. Prefer one support entry point rather than multiple competing floating buttons.

For a landing-page FAQ assistant without a verified AI service, use a clearly named help panel with suggested topics and approved answers. Do not pretend that a scripted FAQ is a live AI agent. If a real assistant exists, ground it in current product facts and allow it to acknowledge uncertainty.

Provide links to pricing, sample listings and WhatsApp support. Preserve the selected language. A booking CTA must either connect to a configured scheduler or honestly request a demo through support. Never show a successful appointment state without a confirmed booking response. Do not invent calendar availability.

## 15. Motion Specification

Motion should reveal relationships, indicate state and provide feedback. Implement the following as design targets, not rigid requirements when a simpler interaction works better:

| Element | Behaviour | Target timing | Reduced-motion behaviour |
| --- | --- | --- | --- |
| Hero text | Brief opacity reveal with at most 12px vertical movement | 350-450ms, one time | Immediately visible |
| Section entrance | Opacity and 8-16px translation when entering view | 280-400ms | Static content |
| Related elements | Short stagger within a meaningful group | 40-70ms, total under 600ms | No stagger |
| Tab selection | Immediate selected state, crossfade preview | 180-240ms | Instant replacement |
| Product preview | Very small scale change only if helpful | 0.98 to 1 over 220ms | No scale |
| Property hover | Border/colour change; optional 2px lift | 120-180ms | Colour change only |
| Dialog | Opacity and subtle scale; no rotation | 160-220ms | Immediate opening |
| Accordion | Controlled expansion, no large content bounce | 180-240ms | Immediate expansion |
| Copy feedback | Icon/text state change with status announcement | Immediate, no layout shift | Identical |
| Workflow connectors | Brief progress indication linked to selected step | 300-500ms | Static completed state |
| Testimonial strip, if justified | Slow continuous movement with explicit pause | Readable pace, not fixed imitation | Static list |

Use transform and opacity for visual transitions. Avoid repeated animated blur, box-shadow, large filters and full-page scroll listeners. Keep content present in server-rendered output and readable if JavaScript fails. Do not leave sections permanently transparent because an observer did not fire.

Respect `prefers-reduced-motion` at both the CSS and animation-library levels. Pause offscreen or background-tab loops. No sound or video autoplay. Never change scroll position unexpectedly after a tab selection or image load. Avoid accumulating event listeners during language changes or client navigation.

## 16. Accessibility and Responsive Requirements

Support 320, 390, 768, 1024, 1280, 1440 and 1920px widths, plus zoomed text and a short landscape viewport. Treat these as test cases, not separate designs. Text must fit naturally in every supported language, with no clipping or overlapping controls.

Use semantic headings, a skip link, named navigation, proper form labels, descriptive links and visible focus. Use accessible tabs/dialog primitives. Escape closes overlays; focus returns to the initiating control. Keep touch controls approximately 44px where practical. Do not make hover essential to discovering functionality.

Meet accessible text and control contrast. Provide meaningful image alternatives, captions for real videos, and labelled example data. Screen-reader users should receive copy success, errors and selection changes without duplicate announcements from decorative content.

Mobile should use one dominant action per section. Any sticky bottom CTA must include safe-area spacing and must never cover a dialog action, keyboard or page content. A standard in-flow CTA is preferable if sticky controls add clutter.

## 17. Architecture, Performance and Measurement

Compose existing components before adding abstractions. Keep translations in the established content structure. Use shared typed records for feature IDs, screenshots, labels and status where that eliminates duplication. Avoid a monolithic page containing all demonstration state and copy.

Potential component responsibilities are Header, Hero, TrustBar, ProductWalkthrough, SamplePortfolio, WhatsAppExample, AIDescriptionExample, WorkflowAssessment, Pricing, FAQ and SupportPanel. These names are suggestions, not a requirement to create a new file for every section. Reuse existing files when their responsibility matches.

Prefer server rendering for static page content and small client boundaries for interactive areas. Preserve query-state deep links without hydration mismatches or flashes that change page meaning. Handle invalid language/sample values and browser back/forward navigation.

Use properly sized, optimised images with stable dimensions. Prioritise the actual hero asset, lazy-load below-fold media and avoid loading a video player before it is opened. Use real screenshots that are legible at the rendered size. Provide fallbacks for missing assets; do not silently show a blank media frame.

Use performance targets such as LCP at or below 2.5 seconds, CLS at or below 0.1 and INP at or below 200ms as validation goals under stated conditions, not marketing claims. Report lab conditions and distinguish them from field measurements. Do not promise a production score based on a localhost development run.

Use an existing consent-aware analytics integration if available. Suggested non-sensitive events include demo opened, walkthrough step selected, sample viewed, sample link copied, trial CTA selected, pricing viewed and support selected. Include only coarse source and language context. Do not transmit property text, visitor contact details, quiz answers or clipboard contents as analytics.

If there is no configured analytics provider, avoid adding a hidden external tracker. Document the proposed event contract and let visible UI work independently. Funnel activation must eventually be measured against actual authenticated publishing, sharing and enquiry activity.

## 18. Delivery Order and Acceptance Criteria

First deliver the improved core page: hero, navigation, product walkthrough, samples, truthful pricing, FAQs and support. Then complete the lightweight WhatsApp and AI examples. Add the assessment and optional help panel only when they are fully functional and do not compromise the core experience.

Keep future service implementation outside this task. If there is no usable product video, provide the working interactive walkthrough and clearly report that a recorded video remains a separate asset. Do not fabricate a video poster with a dead play control.

Verify these behaviours before calling the work complete:

- All visible CTAs lead to the expected destination and preserve relevant language/source context.
- Mobile login, language selection and navigation remain available at 320px.
- Product-step selection works by mouse, touch and keyboard without fighting scroll state.
- Residential, commercial and land filters show the correct examples and relevant fields.
- Sample links reopen the correct details after refresh; closing a dialog restores focus.
- Copy success and failure states are truthful and accessible.
- Hindi and Marathi cover navigation, examples, pricing, FAQ, signup and support.
- Automated messaging, live AI, website provisioning and planned services are not falsely advertised.
- No competitor screenshots, client logos, invented metrics or unsupported discounts remain.
- Reduced-motion mode leaves all content usable, and essential content is readable without animation.
- No horizontal overflow, clipped text, empty media or overlay collisions occur at the tested viewports.
- Build, TypeScript and focused lint pass. Relevant interaction checks pass without sending real messages or creating unintended accounts.
- Console errors are reviewed, and the final page is visually inspected on desktop and mobile.

Start or retain a working local preview, using another free port if needed. Supply the URL, a concise account of implemented changes, verification results and any specific configuration or asset still required. Do not deploy, merge or publish as part of this prompt.

The finished page should let a broker understand the offer, inspect a believable product journey and start with a real listing, while keeping every advertised promise tied to working capability.

# End Implementation Prompt
