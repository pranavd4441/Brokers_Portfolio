'use client';

import { useState, useRef, useCallback } from 'react';
import { Copy, Check, ChevronRight, MessageCircle, Building2, Link as LinkIcon, Inbox } from 'lucide-react';
import { COPY, Language } from './content';

export function WhatsAppDemo({ currentLang }: { currentLang: Language }) {
  const t = COPY[currentLang];
  const [active, setActive] = useState(0);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const total = t.waDemoSteps.length;

  const WHATSAPP_MESSAGE = t.waDemoSteps[1].visual;

  const handleCopy = useCallback(async () => {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    try {
      await navigator.clipboard.writeText(WHATSAPP_MESSAGE);
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
    copyTimerRef.current = setTimeout(() => setCopyState('idle'), 3000);
  }, [WHATSAPP_MESSAGE]);

  return (
    <section id="wa-demo" className="landing-band wa-demo-section" aria-labelledby="wa-demo-title">
      <div className="landing-wrap">
        <p className="landing-eyebrow">{t.waDemoEyebrow}</p>
        <h2 id="wa-demo-title">{t.waDemoTitle}</h2>
        <p className="wa-demo-note" role="note">{t.waDemoNote}</p>

        <div className="wa-demo-layout">
          {/* Step selector */}
          <ol className="wa-demo-steps" aria-label="Steps">
            {t.waDemoSteps.map((step, i) => (
              <li key={step.label}>
                <button
                  type="button"
                  aria-pressed={active === i}
                  aria-current={active === i ? 'step' : undefined}
                  className={`wa-demo-step-btn${active === i ? ' wa-demo-step-btn--active' : ''}`}
                  onClick={() => setActive(i)}
                >
                  <span className="wa-demo-step-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                  <span>{step.label}</span>
                  {active === i && <ChevronRight size={14} className="wa-demo-chevron" aria-hidden="true" />}
                </button>
              </li>
            ))}
          </ol>

          {/* Detail panel */}
          <div className="wa-demo-panel">
            {t.waDemoSteps.map((step, i) => (
              <div
                key={step.label}
                className={`wa-demo-detail${active === i ? ' wa-demo-detail--active' : ''}`}
                aria-hidden={active !== i}
              >
                <h3>{step.heading}</h3>
                <p>{step.body}</p>

                {/* Visual for each step */}
                {i === 0 && (
                  <div className="wa-demo-visual wa-demo-property-card" aria-hidden="true">
                    <Building2 size={16} />
                    <span>{step.visual}</span>
                  </div>
                )}

                {i === 1 && (
                  <div className="wa-demo-visual wa-demo-message-block">
                    <div className="wa-demo-message-header">
                      <MessageCircle size={14} className="wa-icon" aria-hidden="true" />
                      <span>WhatsApp message</span>
                    </div>
                    <pre className="wa-demo-message-text" aria-label="Prepared message">{step.visual}</pre>
                    <div className="wa-demo-copy-row">
                      <button
                        type="button"
                        className={`wa-demo-copy-btn${copyState === 'copied' ? ' wa-demo-copy-btn--done' : ''}`}
                        onClick={handleCopy}
                        aria-label={copyState === 'copied' ? t.waDemoCopied : t.waDemoCopy}
                        aria-live="polite"
                      >
                        {copyState === 'copied' ? <Check size={15} /> : <Copy size={15} />}
                        {copyState === 'copied' ? t.waDemoCopied : t.waDemoCopy}
                      </button>
                      {copyState === 'error' && (
                        <p className="wa-demo-copy-error" role="alert">{t.waDemoCopyError}</p>
                      )}
                    </div>
                    <p className="wa-demo-no-send-note" aria-live="polite">
                      No message is sent automatically. Copy and paste into WhatsApp yourself.
                    </p>
                  </div>
                )}

                {i === 2 && (
                  <div className="wa-demo-visual wa-demo-link-preview" aria-hidden="true">
                    <div className="wa-demo-link-bar">
                      <LinkIcon size={12} />
                      <code>{step.visual}</code>
                    </div>
                    <div className="wa-demo-branded-mini">
                      <div className="wa-demo-branded-photo" />
                      <div className="wa-demo-branded-info">
                        <span className="wa-demo-branded-name">PRIME REALTY</span>
                        <span className="wa-demo-branded-title">Garden Residence in Baner</span>
                        <span className="wa-demo-branded-price">₹1.65 Cr</span>
                      </div>
                    </div>
                  </div>
                )}

                {i === 3 && (
                  <div className="wa-demo-visual wa-demo-enquiry-card" aria-hidden="true">
                    <Inbox size={16} aria-hidden="true" />
                    <div className="wa-demo-enquiry-body">
                      <p className="wa-demo-enquiry-from">Rohan M.</p>
                      <p className="wa-demo-enquiry-msg">{step.visual}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step progress indicators (mobile) */}
        <div className="wa-demo-progress" aria-hidden="true">
          {t.waDemoSteps.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`wa-demo-dot${active === i ? ' wa-demo-dot--active' : ''}`}
              onClick={() => setActive(i)}
              tabIndex={-1}
            />
          ))}
        </div>

        <div className="wa-demo-nav" aria-label="Navigate steps">
          <button
            type="button"
            className="wa-demo-nav-btn"
            onClick={() => setActive((p) => Math.max(0, p - 1))}
            disabled={active === 0}
            aria-label="Previous step"
          >
            ← Previous
          </button>
          <button
            type="button"
            className="wa-demo-nav-btn wa-demo-nav-btn--next"
            onClick={() => setActive((p) => Math.min(total - 1, p + 1))}
            disabled={active === total - 1}
            aria-label="Next step"
          >
            Next →
          </button>
        </div>
      </div>
    </section>
  );
}
