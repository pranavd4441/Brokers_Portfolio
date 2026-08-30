import type { Meta, StoryObj } from '@storybook/nextjs-vite';

function Foundation() {
  return (
    <main className="min-h-screen w-full bg-[var(--ui-bg)] p-6 text-[var(--ui-text)] sm:p-10">
      <section className="mx-auto grid max-w-3xl gap-6">
        <header>
          <p className="os-label">PropertyOS foundation</p>
          <h1 className="os-heading-1 mt-2">Production UI readiness</h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--ui-text-muted)]">
            A small, real fixture for checking design tokens, touch targets, focus states,
            typography, and accessibility before route-level work is accepted.
          </p>
        </header>

        <article className="os-card grid gap-5 p-5 sm:p-6">
          <div>
            <label className="mb-2 block text-sm font-semibold" htmlFor="property-title">
              Property title
            </label>
            <input
              className="os-input"
              id="property-title"
              name="property-title"
              placeholder="3 BHK apartment in Baner"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button className="os-btn-primary" type="button">
              Publish listing
            </button>
            <button className="os-btn-ghost" type="button">
              Save draft
            </button>
            <button aria-label="More listing actions" className="os-btn-icon" type="button">
              •••
            </button>
          </div>

          <p aria-live="polite" className="text-sm text-[var(--ui-success)]">
            Draft saved. All controls meet the 44px minimum target.
          </p>
        </article>
      </section>
    </main>
  );
}

const meta = {
  title: 'Foundation/Controls',
  component: Foundation,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Foundation>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Light: Story = {};
