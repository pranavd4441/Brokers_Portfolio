'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, ExternalLink, MessageCircle, Send, X } from 'lucide-react';

interface ShareModalProps {
  url: string;
  whatsappText: string;
  propertyTitle: string;
  onClose: () => void;
}

export default function ShareModal({ url, whatsappText, propertyTitle, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState<'link' | 'message' | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const plainText = useMemo(() => {
    if (!/%[0-9A-Fa-f]{2}/.test(whatsappText)) return whatsappText;
    try { return decodeURIComponent(whatsappText); } catch { return whatsappText; }
  }, [whatsappText]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const copy = async (value: string, type: 'link' | 'message') => {
    await navigator.clipboard.writeText(value);
    setCopied(type);
    window.setTimeout(() => setCopied(null), 2200);
  };

  const openWhatsApp = () => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(plainText)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} className="fixed inset-0 z-[100] flex items-end justify-center bg-[var(--ui-overlay)] p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <section role="dialog" aria-modal="true" aria-labelledby="share-title" className="w-full max-w-lg overflow-hidden rounded-t-[28px] border border-[var(--ui-border)] bg-[var(--ui-surface-raised)] shadow-[var(--ui-shadow)] sm:rounded-[28px]">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--ui-border)] px-5 py-5 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--ui-success)]">Page published</p>
            <h2 id="share-title" className="mt-1 text-xl font-black text-[var(--ui-text)]">Share with a real buyer</h2>
            <p className="mt-1 truncate text-sm text-[var(--ui-text-muted)]">{propertyTitle}</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} className="os-btn-icon" aria-label="Close sharing"><X size={19} /></button>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <div className="rounded-2xl border border-[color-mix(in_srgb,#1b8f4b_25%,var(--ui-border))] bg-[color-mix(in_srgb,#1b8f4b_7%,var(--ui-surface))] p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#1b8f4b] text-white"><MessageCircle size={21} /></span>
              <div><p className="text-sm font-black text-[var(--ui-text)]">Readable WhatsApp message ready</p><p className="mt-0.5 text-xs text-[var(--ui-text-muted)]">Text and link are encoded exactly once.</p></div>
            </div>
            <button type="button" onClick={openWhatsApp} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1b8f4b] px-5 text-sm font-black text-white hover:bg-[#15743d]"><Send size={17} /> Open WhatsApp</button>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3"><p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--ui-text-muted)]">Message preview</p><button type="button" onClick={() => void copy(plainText, 'message')} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-xs font-bold text-[var(--ui-brand-strong)] hover:bg-[var(--ui-surface-muted)]">{copied === 'message' ? <Check size={15} /> : <Copy size={15} />}{copied === 'message' ? 'Copied' : 'Copy message'}</button></div>
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface-muted)] p-4 font-sans text-xs leading-6 text-[var(--ui-text)]">{plainText}</pre>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-2 pl-3">
            <ExternalLink size={16} className="shrink-0 text-[var(--ui-text-muted)]" />
            <input type="url" readOnly value={url} aria-label="Public property link" className="min-w-0 flex-1 bg-transparent text-xs text-[var(--ui-text-muted)] outline-none" onFocus={(event) => event.currentTarget.select()} />
            <button type="button" onClick={() => void copy(url, 'link')} className="os-btn-ghost h-11 shrink-0 px-3 text-xs">{copied === 'link' ? <Check size={15} /> : <Copy size={15} />}{copied === 'link' ? 'Copied' : 'Copy'}</button>
          </div>

          <p className="text-center text-xs leading-5 text-[var(--ui-text-muted)]">Send it to five genuine prospects. Page views and contact clicks will appear in your Action Desk.</p>
        </div>
      </section>
    </div>
  );
}
