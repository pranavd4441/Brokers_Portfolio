import type { ReactNode } from 'react';

export function WorkspaceHeader({ eyebrow, title, description, action }: {
  eyebrow: string; title: string; description: string; action?: ReactNode;
}) {
  return <header className="flex flex-wrap items-end justify-between gap-4">
    <div className="min-w-0">
      <p className="workspace-eyebrow mb-2.5">{eyebrow}</p>
      <h1 className="workspace-heading">{title}</h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
    {action}
  </header>;
}
