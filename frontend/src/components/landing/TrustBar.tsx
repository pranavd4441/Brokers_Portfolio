import { Clock, MessageCircle, ShieldCheck, BadgePercent } from 'lucide-react';
import { COPY, Language } from './content';

const icons = [Clock, MessageCircle, ShieldCheck, BadgePercent];

export function TrustBar({ currentLang }: { currentLang: Language }) {
  const t = COPY[currentLang];
  return (
    <section className="landing-trust-bar" aria-label="Trust and reliability markers">
      <div className="landing-wrap landing-trust-grid">
        {t.trustItems.map(([title, subtitle], i) => {
          const Icon = icons[i];
          return (
            <div key={title} className="landing-trust-item">
              <div className="landing-trust-icon">
                <Icon size={20} />
              </div>
              <div className="landing-trust-text">
                <strong>{title}</strong>
                <span>{subtitle}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
