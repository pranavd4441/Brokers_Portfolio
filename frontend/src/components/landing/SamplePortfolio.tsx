'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Building2, Copy, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { COPY, Language, SAMPLE_IMAGES, signupHref } from './content';

export function SamplePortfolio({ currentLang }: { currentLang: Language }) {
  const t = COPY[currentLang];
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<number | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const syncSample = () => {
      const value = new URLSearchParams(window.location.search).get('sample');
      if (value !== null && /^[0-2]$/.test(value)) setSelected(Number(value));
      else setSelected(null);
    };
    syncSample();
    window.addEventListener('popstate', syncSample);
    return () => window.removeEventListener('popstate', syncSample);
  }, []);

  function openSample(index: number | null) {
    if (index !== null && document.activeElement instanceof HTMLElement) {
      triggerRef.current = document.activeElement;
    }
    setSelected(index);
    setCopyState('idle');
    const url = new URL(window.location.href);
    if (index === null) url.searchParams.delete('sample');
    else url.searchParams.set('sample', String(index));
    window.history.replaceState(null, '', url);
  }

  async function copyLink() {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('lang', currentLang);
      url.hash = 'samples';
      await navigator.clipboard.writeText(url.toString());
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
  }

  return (
    <section id="samples" className="landing-band landing-samples" aria-labelledby="sample-title">
      <div className="landing-wrap">
        <div className="landing-section-heading"><div><p className="landing-eyebrow">{t.portfolioEyebrow}</p><h2 id="sample-title">{t.portfolioTitle}</h2></div><p>{t.portfolioIntro}</p></div>
        <div className="landing-portfolio-heading"><div className="landing-agency"><Building2 size={27} /><div><h3>{t.agency}</h3><p>{t.agencyLocation}</p></div></div><span className="landing-sample-label">{t.sample}</span></div>
        <fieldset className="landing-filters"><legend className="sr-only">{t.filter}</legend>{[t.all, ...t.categories].map((label, i) => {
          const value = i === 0 ? 'all' : String(i - 1);
          return <label key={value}><input type="radio" name="property-category" value={value} checked={filter === value} onChange={() => setFilter(value)} /><span>{label}</span></label>;
        })}</fieldset>
        <div className="landing-property-grid">{[0, 1, 2].filter(index => filter === 'all' || String(index) === filter).map(index => <article className="landing-property" key={index}>
          <button className="landing-property-image" onClick={() => openSample(index)} aria-label={`${t.view}: ${t.titles[index]}`}><Image src={SAMPLE_IMAGES[index]} alt={t.titles[index]} fill unoptimized sizes="(max-width: 700px) 100vw, 33vw" /><span>{t.statuses[index]}</span></button>
          <div className="landing-property-body"><p className="landing-property-type">{t.categories[index]}</p><h3><button onClick={() => openSample(index)}>{t.titles[index]}</button></h3><p className="landing-location"><MapPin size={14} />{t.locations[index]}</p><p className="landing-property-price">{t.prices[index]}</p><ul className="landing-property-specs">{t.specs[index].map(spec => <li key={spec}>{spec}</li>)}</ul><button className="landing-property-link" onClick={() => openSample(index)}>{t.view}<ArrowUpRight size={18} /></button></div>
        </article>)}</div>
        <p className="landing-sample-note">{t.sampleNote}</p>
      </div>
      <Dialog open={selected !== null} onOpenChange={open => { if (!open) openSample(null); }}>
        <DialogContent className="landing-sample-dialog max-h-[90dvh] overflow-y-auto sm:max-w-2xl" closeLabel={t.close} lang={currentLang} finalFocus={triggerRef}>
          {selected !== null && <>
            <DialogHeader><p className="landing-property-type">{t.sample}</p><DialogTitle>{t.titles[selected]}</DialogTitle><DialogDescription>{t.sampleNote}</DialogDescription></DialogHeader>
            <div className="landing-dialog-image"><Image src={SAMPLE_IMAGES[selected]} alt={t.titles[selected]} fill unoptimized sizes="(max-width: 700px) 90vw, 650px" /></div>
            <p className="landing-location"><MapPin size={15} />{t.locations[selected]}</p>
            <p className="landing-property-price">{t.prices[selected]}</p>
            <ul className="landing-property-specs">{t.specs[selected].map(spec => <li key={spec}>{spec}</li>)}</ul>
            <h3>{t.details}</h3><p>{t.descriptions[selected]}</p>
            <div className="landing-actions"><Link className="landing-cta" href={signupHref(currentLang, 'sample')}>{t.createLike}<ArrowUpRight size={18} /></Link><Button variant="outline" onClick={copyLink}><Copy data-icon="inline-start" />{copyState === 'copied' ? t.copied : t.copy}</Button></div>
            <p className="landing-copy-status" role="status">{copyState === 'error' ? t.copyError : copyState === 'copied' ? t.copied : ''}</p>
          </>}
        </DialogContent>
      </Dialog>
    </section>
  );
}
