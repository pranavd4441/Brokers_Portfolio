import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

// Local companion to the installed Input primitive; no registry source copied.
export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea data-slot="textarea" className={cn(
    'min-h-32 w-full min-w-0 resize-y rounded-xl border border-input bg-background px-3.5 py-3 text-base leading-6 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm',
    className,
  )} {...props} />;
}
