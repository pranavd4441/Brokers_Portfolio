import Image from 'next/image';
import Link from 'next/link';
import { ArrowDown, ArrowRight, Building2, Check, CheckCircle2, MessageCircle, Sparkles, Wifi } from 'lucide-react';
import { COPY, Language, signupHref } from './content';

export type { Language } from './content';

export function LandingHero({ currentLang }: { currentLang: Language }) {
  const t = COPY[currentLang];
  const m = t.heroMockup;

  return (
    <section className="landing-hero" aria-labelledby="landing-title">
      <Image
        src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=2000&q=85"
        alt=""
        fill
        unoptimized
        priority
        sizes="100vw"
        className="landing-hero-photo"
      />
      <div className="landing-hero-shade" />

      <div className="landing-wrap landing-hero-content">
        <div className="landing-hero-grid">
          {/* Left Column: Hero Copy & Actions */}
          <div className="landing-hero-text">
            <p className="landing-eyebrow">{t.eyebrow}</p>
            <h1 id="landing-title">{t.headline}</h1>
            <p className="landing-intro">{t.intro}</p>
            <div className="landing-actions">
              <Link href={signupHref(currentLang, 'hero')} className="landing-cta">
                {t.start}
                <ArrowRight size={18} />
              </Link>
              <a href="#samples" className="landing-cta landing-cta-outline">
                {t.explore}
                <ArrowDown size={18} />
              </a>
            </div>
            <p className="landing-reassurance">
              <Check size={16} />
              {t.reassurance}
            </p>
          </div>

          {/* Right Column: Interactive/Visual WhatsApp & Phone Mockup */}
          <div className="landing-hero-visual" aria-hidden="true">
            {/* WhatsApp Chat Simulation Bubbles */}
            <div className="landing-chat-preview">
              <div className="landing-chat-bubble landing-chat-out">
                <div className="landing-chat-meta">
                  <span>{m.bubbleSender}</span>
                  <span className="landing-chat-check">✓✓</span>
                </div>
                <p>{m.bubbleMessage}</p>
              </div>
              <div className="landing-chat-bubble landing-chat-in">
                <p>{m.bubbleClient}</p>
              </div>
            </div>

            {/* Smartphone Display Card */}
            <div className="landing-phone-card">
              <div className="landing-phone-notch" />
              <div className="landing-phone-statusbar">
                <span>9:41</span>
                <div className="landing-phone-icons">
                  <Wifi size={12} />
                  <span className="landing-phone-battery" />
                </div>
              </div>

              <div className="landing-phone-header">
                <div className="landing-phone-agency">
                  <Building2 size={16} className="text-[#10B981]" />
                  <div>
                    <div className="landing-phone-agency-name">
                      <strong>{m.agency}</strong>
                      <CheckCircle2 size={12} className="landing-verified-badge" />
                    </div>
                    <span>{m.city} · {m.verified}</span>
                  </div>
                </div>
                <span className="landing-phone-live-dot">LIVE</span>
              </div>

              <div className="landing-phone-photo-wrap">
                <Image
                  src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80"
                  alt={m.title}
                  fill
                  unoptimized
                  sizes="(max-width: 600px) 280px, 340px"
                  className="landing-phone-photo"
                />
                <span className="landing-phone-tag">{m.tag}</span>
              </div>

              <div className="landing-phone-body">
                <h4 className="landing-phone-title">{m.title}</h4>
                <div className="landing-phone-price-row">
                  <strong className="landing-phone-price">{m.price}</strong>
                  <span className="landing-phone-loc">{m.city}</span>
                </div>

                <div className="landing-phone-specs">
                  {m.specs.map(spec => (
                    <span key={spec} className="landing-phone-spec-pill">{spec}</span>
                  ))}
                </div>

                <div className="landing-phone-cta">
                  <MessageCircle size={15} />
                  <span>{m.chatBtn}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="landing-hero-bottom landing-wrap">
        {t.categories.map((category, i) => (
          <span key={category}>
            <span className="landing-index">0{i + 1}</span>
            {category}
          </span>
        ))}
      </div>
    </section>
  );
}
