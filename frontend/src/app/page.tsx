'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Building2, Check, Menu, X, ChevronDown } from 'lucide-react';
import { LandingHero } from '@/components/landing/LandingHero';
import { TrustBar } from '@/components/landing/TrustBar';
import { SamplePortfolio } from '@/components/landing/SamplePortfolio';
import { ProductWalkthrough } from '@/components/landing/ProductWalkthrough';
import { WhatsAppDemo } from '@/components/landing/WhatsAppDemo';
import { AIDescriptionDemo } from '@/components/landing/AIDescriptionDemo';
import { FeatureShowcase } from '@/components/landing/FeatureShowcase';
import { COPY, Language, parseLanguage, signupHref } from '@/components/landing/content';

const anchors = ['samples', 'walkthrough', 'pricing', 'faq'];
const footerPaths = ['/support', '/privacy', '/terms', '/refund'];

export default function HomePage() {
  const [language, setLanguage] = useState<Language>('en');
  const [menuOpen, setMenuOpen] = useState(false);
  const t = COPY[language];

  useEffect(() => {
    const syncLanguage = () => {
      const language = parseLanguage(new URLSearchParams(window.location.search).get('lang'));
      setLanguage(language);
      document.documentElement.lang = language;
    };
    syncLanguage();
    window.addEventListener('popstate', syncLanguage);
    return () => {
      window.removeEventListener('popstate', syncLanguage);
      document.documentElement.lang = 'en';
    };
  }, []);

  function changeLanguage(value: string) {
    const next = parseLanguage(value);
    setLanguage(next);
    document.documentElement.lang = next;
    const url = new URL(window.location.href);
    url.searchParams.set('lang', next);
    window.history.replaceState(null, '', url);
  }

  return (
    <div className="landing-root" lang={language}>
      <a href="#content" className="landing-skip">{t.skip}</a>
      <header className="landing-header">
        <nav className="landing-wrap landing-nav" aria-label={t.menu}>
          <Link href={`/?lang=${language}`} className="landing-brand"><Building2 aria-hidden="true" size={23} />PropertyOS</Link>
          <div className="landing-nav-links">{t.nav.map((item, i) => <a key={item} href={`#${anchors[i]}`}>{item}</a>)}</div>
          <div className="landing-nav-actions">
            <label className="landing-language"><span className="sr-only">{t.language}</span><select value={language} onChange={event => changeLanguage(event.target.value)}><option value="en">English</option><option value="hi">हिंदी</option><option value="mr">मराठी</option></select></label>
            <Link href="/auth/login" className="landing-login">{t.login}</Link>
            <Link href={signupHref(language, 'nav')} className="landing-nav-cta">{t.start}</Link>
            <button type="button" className="landing-menu" aria-expanded={menuOpen} aria-controls="mobile-navigation" aria-label={menuOpen ? t.close : t.menu} title={menuOpen ? t.close : t.menu} onClick={() => setMenuOpen(!menuOpen)} onKeyDown={event => { if (event.key === 'Escape') setMenuOpen(false); }}>{menuOpen ? <X size={22} /> : <Menu size={22} />}</button>
          </div>
        </nav>
        {menuOpen && <nav id="mobile-navigation" className="landing-mobile-nav" aria-label={t.menu} onKeyDown={event => { if (event.key === 'Escape') setMenuOpen(false); }}>{t.nav.map((item, i) => <a key={item} href={`#${anchors[i]}`} onClick={() => setMenuOpen(false)}>{item}</a>)}</nav>}
      </header>
      <main id="content">
        <LandingHero currentLang={language} />
        <TrustBar currentLang={language} />
        <SamplePortfolio currentLang={language} />
        <ProductWalkthrough currentLang={language} />
        <WhatsAppDemo currentLang={language} />
        <AIDescriptionDemo currentLang={language} />
        <FeatureShowcase currentLang={language} />
        <section id="pricing" className="landing-band landing-pricing" aria-labelledby="pricing-title">
          <div className="landing-wrap">
            <div className="landing-section-heading"><div><p className="landing-eyebrow">{t.priceEyebrow}</p><h2 id="pricing-title">{t.priceTitle}</h2></div><p>{t.priceIntro}</p></div>
            <div className="landing-plans">
              {[
                { title: t.trialTitle, price: t.trialPrice, period: t.trialPeriod, features: t.trialFeatures, href: signupHref(language, 'pricing'), action: t.start },
                { title: t.paidTitle, price: t.paidPrice, period: t.paidPeriod, features: t.paidFeatures, href: `/support?lang=${language}`, action: t.talk }
              ].map((plan, idx) => (
                <article key={plan.title} className="landing-plan">
                  {idx === 1 && (
                    <div className="landing-plan-badge">{t.pricingBadges.proBadge}</div>
                  )}
                  <h3>{plan.title}</h3>
                  <p className="landing-price">{plan.price}</p>
                  <p>{plan.period}</p>
                  {idx === 1 && (
                    <p className="landing-plan-highlight">
                      <Check size={15} />
                      {t.pricingBadges.zeroCut}
                    </p>
                  )}
                  <ul>{plan.features.map(feature => <li key={feature}><Check size={17} />{feature}</li>)}</ul>
                  <Link href={plan.href} className="landing-cta">{plan.action}<ArrowRight size={18} /></Link>
                </article>
              ))}
            </div>
            <p className="landing-price-note">{t.priceNote}</p>
          </div>
        </section>
        <section id="faq" className="landing-band" aria-labelledby="faq-title"><div className="landing-wrap landing-faq-layout"><h2 id="faq-title">{t.faqTitle}</h2><div>{t.faqs.map(([question, answer]) => <details className="landing-faq" key={question}><summary>{question}<ChevronDown size={18} /></summary><p>{answer}</p></details>)}</div></div></section>
        <section className="landing-final"><div className="landing-wrap"><div><h2>{t.finalTitle}</h2><p>{t.finalText}</p></div><Link className="landing-cta" href={signupHref(language, 'footer')}>{t.start}<ArrowRight size={18} /></Link></div></section>
      </main>
      <footer className="landing-footer landing-wrap"><div><Link href={`/?lang=${language}`} className="landing-brand"><Building2 size={21} />PropertyOS</Link><p>© 2026 PropertyOS. {t.footer}</p></div><nav aria-label={t.footer}>{t.footerLinks.map((label, i) => <Link key={label} href={i === 0 ? `/support?lang=${language}` : footerPaths[i]}>{label}</Link>)}</nav></footer>
    </div>
  );
}
