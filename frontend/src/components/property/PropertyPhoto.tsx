'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PropertyPhoto({ src, alt, fallback, compact = false, thumbnail = false }: {
  src?: string; alt: string; fallback: string; compact?: boolean; thumbnail?: boolean;
}) {
  const [failedSrc, setFailedSrc] = useState<string>();
  const available = Boolean(src && failedSrc !== src);
  return (
    <div className={cn('workspace-photo', thumbnail && 'workspace-photo-small', !compact && !thumbnail && 'rounded-xl')} data-empty={!available}>
      {available ? <Image src={src!} alt={alt} fill unoptimized sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw" className="object-cover" onError={() => setFailedSrc(src)} /> : (
        <div className="relative z-10 flex flex-col items-center gap-3 text-xs text-muted-foreground">
          <Building2 className={cn('shrink-0', thumbnail ? 'size-5' : 'size-8')} strokeWidth={1.25} aria-hidden="true" />
          {!thumbnail && <span>{fallback}</span>}
        </div>
      )}
    </div>
  );
}
