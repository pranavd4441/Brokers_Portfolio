import { Camera, Send, MessagesSquare, CheckCircle2, Image as ImageIcon, Link as LinkIcon, UserCheck } from 'lucide-react';
import { COPY, Language } from './content';

const icons = [Camera, Send, MessagesSquare];

export function CreationWalkthrough({ currentLang }: { currentLang: Language }) {
  const t = COPY[currentLang];
  const v = t.walkthroughVisuals;

  return (
    <section id="how" className="landing-band landing-workflow" aria-labelledby="workflow-title">
      <div className="landing-wrap">
        <p className="landing-eyebrow">{t.howEyebrow}</p>
        <h2 id="workflow-title">{t.howTitle}</h2>

        <div className="landing-steps">
          {t.steps.map(([title, description], i) => {
            const Icon = icons[i];
            const visual = v[i];

            return (
              <article key={title} className="landing-step-card">
                <div className="landing-step-heading">
                  <Icon size={24} />
                  <span>0{i + 1}</span>
                </div>
                <h3>{title}</h3>
                <p>{description}</p>

                {/* Illustrative mini UI preview */}
                <div className="landing-step-visual" aria-hidden="true">
                  <div className="landing-step-visual-badge">
                    <span>{visual.badge}</span>
                    <span className="landing-step-visual-tag">{visual.tag}</span>
                  </div>

                  {i === 0 && (
                    <div className="landing-mini-ui landing-mini-upload">
                      <div className="landing-mini-thumbs">
                        <div className="landing-mini-thumb landing-mini-thumb-1"><ImageIcon size={14} /></div>
                        <div className="landing-mini-thumb landing-mini-thumb-2"><ImageIcon size={14} /></div>
                        <div className="landing-mini-thumb landing-mini-thumb-more">+4</div>
                      </div>
                      <div className="landing-mini-fields">
                        <span>₹1.65 Cr</span>
                        <span>Baner, Pune</span>
                        <span>3 BHK</span>
                      </div>
                    </div>
                  )}

                  {i === 1 && (
                    <div className="landing-mini-ui landing-mini-share">
                      <div className="landing-mini-link-bar">
                        <LinkIcon size={13} />
                        <code>propertyos.in/p/prime-baner</code>
                      </div>
                      <div className="landing-mini-wa-btn">
                        <Send size={12} />
                        <span>Share on WhatsApp</span>
                      </div>
                    </div>
                  )}

                  {i === 2 && (
                    <div className="landing-mini-ui landing-mini-lead">
                      <div className="landing-mini-lead-row">
                        <div className="landing-mini-avatar">RM</div>
                        <div className="landing-mini-lead-info">
                          <strong>Rohan M.</strong>
                          <span>Baner · 3 BHK Enquiry</span>
                        </div>
                        <span className="landing-mini-lead-pill">Hot Lead</span>
                      </div>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
