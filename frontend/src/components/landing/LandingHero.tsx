import Image from 'next/image';
import Link from 'next/link';
import { ArrowDown, ArrowRight, Check } from 'lucide-react';
import { COPY, Language, signupHref } from './content';

export type { Language } from './content';

export function LandingHero({ currentLang }: { currentLang: Language }) {
  const t = COPY[currentLang];

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
