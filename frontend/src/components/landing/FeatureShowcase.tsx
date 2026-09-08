import { Building2, MessageCircle, Sparkles, UsersRound } from 'lucide-react';
import { COPY, Language } from './content';

const icons = [Building2, MessageCircle, Sparkles, UsersRound];

export function FeatureShowcase({ currentLang }: { currentLang: Language }) {
  const t = COPY[currentLang];
  return (
    <section id="features" className="landing-band" aria-labelledby="features-title">
      <div className="landing-wrap landing-feature-layout">
        <div><p className="landing-eyebrow">{t.featuresEyebrow}</p><h2 id="features-title">{t.featuresTitle}</h2></div>
        <div className="landing-feature-list">{t.features.map(([title, description], i) => {
          const Icon = icons[i];
          return <article key={title}><Icon size={24} /><div><h3>{title}</h3><p>{description}</p></div></article>;
        })}</div>
      </div>
    </section>
  );
}
