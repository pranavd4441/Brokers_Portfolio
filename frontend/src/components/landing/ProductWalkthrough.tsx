'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Eye, MessageCircle, Inbox, ChevronRight, Building2, Check, Link as LinkIcon, ImageIcon, UserCheck } from 'lucide-react';
import { COPY, Language, signupHref } from './content';

const STEP_ICONS = [Camera, Eye, MessageCircle, Inbox];

function StepPreview({ stepIndex, lang }: { stepIndex: number; lang: Language }) {
  const t = COPY[lang];
  const step = t.walkthroughSteps[stepIndex];

  if (stepIndex === 0) {
    return (
      <div className="lw-preview-card" aria-hidden="true">
        <div className="lw-preview-header">
          <span className="lw-preview-label">{step.previewLabel}</span>
        </div>
        <div className="lw-preview-upload-row">
          <div className="lw-preview-thumb"><ImageIcon size={16} /></div>
          <div className="lw-preview-thumb lw-preview-thumb-2"><ImageIcon size={16} /></div>
          <div className="lw-preview-thumb lw-preview-more">+4</div>
        </div>
        <div className="lw-preview-fields">
          <div className="lw-preview-field"><span className="lw-field-label">₹1.65 Cr</span></div>
          <div className="lw-preview-field"><span className="lw-field-label">3 BHK</span></div>
          <div className="lw-preview-field"><span className="lw-field-label">Baner, Pune</span></div>
          <div className="lw-preview-field"><span className="lw-field-label">1,460 sq ft</span></div>
        </div>
        <p className="lw-preview-sub">{step.previewSub}</p>
      </div>
    );
  }

  if (stepIndex === 1) {
    return (
      <div className="lw-preview-card" aria-hidden="true">
        <div className="lw-preview-header">
          <Building2 size={14} />
          <span className="lw-preview-label">PRIME REALTY</span>
          <span className="lw-preview-live">LIVE</span>
        </div>
        <div className="lw-preview-page-img">
          <div className="lw-preview-page-photo" />
          <span className="lw-preview-tag">Residential · For Sale</span>
        </div>
        <div className="lw-preview-page-body">
          <p className="lw-preview-page-title">Garden Residence in Baner</p>
          <p className="lw-preview-page-price">₹1.65 Cr</p>
          <div className="lw-preview-specs">
            <span>3 BHK</span><span>1,460 sq ft</span><span>Ready</span>
          </div>
        </div>
        <p className="lw-preview-sub">{step.previewSub}</p>
      </div>
    );
  }

  if (stepIndex === 2) {
    return (
      <div className="lw-preview-card" aria-hidden="true">
        <div className="lw-preview-header">
          <MessageCircle size={14} className="lw-wa-icon" />
          <span className="lw-preview-label">{step.previewLabel}</span>
        </div>
        <div className="lw-preview-message-box">
          <p className="lw-preview-message-text">
            {'Check this 3 BHK in Baner, Pune: propertyos.in/p/prime-baner 🏡 Reach out if you\'d like to visit.'}
          </p>
        </div>
        <div className="lw-preview-link-row">
          <LinkIcon size={12} />
          <code>propertyos.in/p/prime-baner</code>
        </div>
        <p className="lw-preview-sub">{step.previewSub}</p>
      </div>
    );
  }

  // stepIndex === 3
  return (
    <div className="lw-preview-card" aria-hidden="true">
      <div className="lw-preview-header">
        <Inbox size={14} />
        <span className="lw-preview-label">{step.previewLabel}</span>
        <span className="lw-preview-new-badge">New</span>
      </div>
      <div className="lw-preview-enquiry-row">
        <div className="lw-preview-avatar">RM</div>
        <div className="lw-preview-enquiry-info">
          <strong>Rohan M.</strong>
          <span>Site visit request · Baner 3 BHK</span>
        </div>
        <Check size={15} className="lw-preview-check" />
      </div>
      <div className="lw-preview-enquiry-note">
        <UserCheck size={12} />
        <span>Enquiry captured via branded page</span>
      </div>
      <p className="lw-preview-sub">{step.previewSub}</p>
    </div>
  );
}

export function ProductWalkthrough({ currentLang }: { currentLang: Language }) {
  const t = COPY[currentLang];
  const [active, setActive] = useState(0);
  const tablistRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const total = t.walkthroughSteps.length;

  const activate = useCallback((index: number) => {
    setActive(index);
  }, []);

  // Keyboard navigation on the tablist
  const onTabKeyDown = useCallback((e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = (index + 1) % total;
      activate(next);
      const tabs = tablistRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
      tabs?.[next]?.focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = (index - 1 + total) % total;
      activate(prev);
      const tabs = tablistRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
      tabs?.[prev]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      activate(0);
      tablistRef.current?.querySelector<HTMLButtonElement>('[role="tab"]')?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      activate(total - 1);
      const tabs = tablistRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
      tabs?.[total - 1]?.focus();
    }
  }, [total, activate]);

  return (
    <section id="walkthrough" className="landing-band lw-section" aria-labelledby="lw-title">
      <div className="landing-wrap">
        <p className="landing-eyebrow">{t.walkthroughEyebrow}</p>
        <h2 id="lw-title">{t.walkthroughTitle}</h2>

        {/* Mobile: tab row at top */}
        <div className="lw-tab-row" ref={tablistRef} role="tablist" aria-label={t.walkthroughTitle}>
          {t.walkthroughSteps.map((step, i) => {
            const Icon = STEP_ICONS[i];
            return (
              <button
                key={step.label}
                role="tab"
                aria-selected={active === i}
                aria-controls={`lw-panel-${i}`}
                id={`lw-tab-${i}`}
                tabIndex={active === i ? 0 : -1}
                className={`lw-tab-btn${active === i ? ' lw-tab-btn--active' : ''}`}
                onClick={() => activate(i)}
                onKeyDown={(e) => onTabKeyDown(e, i)}
              >
                <Icon size={16} aria-hidden="true" />
                <span>{step.label}</span>
              </button>
            );
          })}
        </div>

        {/* Desktop: step list left + preview right */}
        <div className="lw-layout">
          {/* Step list */}
          <div className="lw-step-list" role="tablist" aria-label={t.walkthroughTitle} aria-orientation="vertical">
            {t.walkthroughSteps.map((step, i) => {
              const Icon = STEP_ICONS[i];
              return (
                <button
                  key={step.label}
                  role="tab"
                  aria-selected={active === i}
                  aria-controls={`lw-panel-${i}`}
                  id={`lw-step-${i}`}
                  tabIndex={active === i ? 0 : -1}
                  className={`lw-step-btn${active === i ? ' lw-step-btn--active' : ''}`}
                  onClick={() => activate(i)}
                  onKeyDown={(e) => onTabKeyDown(e, i)}
                >
                  <span className="lw-step-icon-wrap" aria-hidden="true">
                    <Icon size={18} />
                  </span>
                  <span className="lw-step-text">
                    <span className="lw-step-num">0{i + 1}</span>
                    <span className="lw-step-label">{step.label}</span>
                  </span>
                  <ChevronRight size={16} className="lw-step-chevron" aria-hidden="true" />
                </button>
              );
            })}
          </div>

          {/* Panel + sticky preview */}
          <div className="lw-panel-area">
            {t.walkthroughSteps.map((step, i) => (
              <div
                key={step.label}
                id={`lw-panel-${i}`}
                role="tabpanel"
                aria-labelledby={`lw-step-${i} lw-tab-${i}`}
                hidden={active !== i}
                className="lw-panel"
                ref={active === i ? panelRef : undefined}
                tabIndex={-1}
              >
                <div className="lw-panel-content">
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                  {i === 0 && (
                    <Link href={signupHref(currentLang, 'walkthrough')} className="landing-cta lw-panel-cta">
                      {t.start}
                    </Link>
                  )}
                </div>
                {/* Mobile preview inline */}
                <div className="lw-panel-preview-mobile">
                  <StepPreview stepIndex={i} lang={currentLang} />
                </div>
              </div>
            ))}

            {/* Desktop sticky preview */}
            <div className="lw-sticky-preview" aria-hidden="true">
              <StepPreview stepIndex={active} lang={currentLang} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
