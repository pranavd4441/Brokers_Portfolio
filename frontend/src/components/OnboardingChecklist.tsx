'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Check, Circle } from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface OnboardingStatus {
  steps: Array<{ id: string; label: string; complete: boolean; href: string }>;
  completed: number;
  total: number;
  activated: boolean;
  listing_count: number;
  share_count: number;
}

export default function OnboardingChecklist() {
  const { data } = useQuery<OnboardingStatus>({
    queryKey: ['onboarding'],
    queryFn: () => fetchApi('/auth/onboarding/'),
    staleTime: 15_000,
  });

  if (!data || data.completed === data.total) return null;
  const next = data.steps.find((step) => !step.complete);
  const progress = data.total > 0 ? (data.completed / data.total) * 100 : 0;

  return (
    <section className="rounded-3xl border border-[color-mix(in_srgb,var(--ui-brand)_24%,var(--ui-border))] bg-[color-mix(in_srgb,var(--ui-brand)_7%,var(--ui-surface))] p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold text-[var(--ui-brand-strong)]">Your first 10 minutes</p>
          <h2 className="mt-1 text-xl font-bold text-[var(--ui-text)]">Get ready to share with a real buyer</h2>
          <p className="mt-1 text-sm text-[var(--ui-text-muted)]">{data.completed} of {data.total} setup steps complete</p>
        </div>
        {next && (
          <Link href={next.href} className="os-btn-primary shrink-0">
            Next: {next.label}
            <ArrowRight size={17} />
          </Link>
        )}
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-[var(--ui-surface-muted)]" aria-label={`${Math.round(progress)}% complete`}>
        <div className="h-full rounded-full bg-[var(--ui-brand-strong)] transition-[width]" style={{ width: `${progress}%` }} />
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {data.steps.map((step) => (
          <Link key={step.id} href={step.href} className="flex min-h-11 items-center gap-2 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] px-3 text-sm font-medium text-[var(--ui-text)] hover:border-[var(--ui-border-strong)]">
            <span className={step.complete ? 'text-[var(--ui-success)]' : 'text-[var(--ui-text-muted)]'}>
              {step.complete ? <Check size={17} /> : <Circle size={17} />}
            </span>
            <span>{step.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
