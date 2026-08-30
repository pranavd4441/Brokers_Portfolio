# PropertyOS UI Tooling

This branch establishes the quality gates for the practical UI implementation. It does not replace existing routes or connect deferred product features.

## Installed now

- Official shadcn Codex skill and shadcn MCP server.
- Codex Playwright, screenshot, and Sentry skills.
- Storybook with the Next.js Vite adapter, Docs, Vitest, accessibility, and Chromatic visual-test addons.
- Playwright Test with desktop Chrome and Pixel 7 projects.
- Axe accessibility checks for stories and the public landing-page smoke journey.

The generated Storybook demo files were removed. `src/stories/Foundation.stories.tsx` is the maintained PropertyOS fixture.

## Commands

Run these from `frontend/`:

```text
npm run storybook
npm run build-storybook
npm run test:ui
npm run test:e2e
npm run test:e2e:headed
npm run qa:ui
```

Use `PLAYWRIGHT_BASE_URL` to test an already-running deployment. Without it, Playwright starts Next.js locally on port 3100.

## Intentionally deferred

- Figma skills and Code Connect: install only after a real Figma design-system file has an owner and maintenance process.
- Sentry SDK, source maps, releases, and alerts: configure when a staging DSN and environment policy exist.
- Chromatic publishing: the addon is installed, but it requires a project token before cloud baselines can be accepted.
- shadcn component generation: the skill and MCP are ready; add reviewed components route by route during Phase 2 rather than importing a dashboard template.

## Dependency security note

The production dependency audit is clean after upgrading Next.js and `eslint-config-next` from 16.2.9 to 16.3.3. The current `@storybook/nextjs-vite` release still carries an unpatched, development-only `image-size` advisory through its official Next.js adapter. Storybook is therefore bound to `127.0.0.1`, must not be exposed as a public service, and should be upgraded as soon as the Storybook adapter publishes a fix.
