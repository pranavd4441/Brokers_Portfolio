'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, Building2, Check, Clock3, CreditCard, MessageCircle, Play, Sparkles } from 'lucide-react';

const languageCopy = {
  en: {
    headline: <>Your properties. Your brand. <em className="not-italic text-[#ff715b]">One professional link.</em></>,
    subline: 'Build your own broker digital office, turn property details into polished pages, and share them on WhatsApp in under 60 seconds.',
  },
  hi: {
    headline: <>आपकी प्रॉपर्टी। आपका ब्रांड। <em className="not-italic text-[#ff715b]">एक प्रोफेशनल लिंक।</em></>,
    subline: 'अपना ब्रोकर डिजिटल ऑफिस बनाइए, प्रॉपर्टी की जानकारी को शानदार पेज में बदलिए और 60 सेकंड से कम समय में WhatsApp पर शेयर कीजिए।',
  },
  mr: {
    headline: <>तुमच्या प्रॉपर्टी. तुमचा ब्रँड. <em className="not-italic text-[#ff715b]">एक प्रोफेशनल लिंक.</em></>,
    subline: 'तुमचे ब्रोकर डिजिटल ऑफिस तयार करा, प्रॉपर्टीची माहिती आकर्षक पेजमध्ये बदला आणि 60 सेकंदांपेक्षा कमी वेळात WhatsApp वर शेअर करा.',
  },
};

export default function HomePage() {
  const [language, setLanguage] = useState<keyof typeof languageCopy>('en');
  const whatsappNumber = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || '919876543210';
  const whatsappHref = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Hi, I want to see the PropertyOS Founding Broker demo.')}`;
  const copy = languageCopy[language];

  return (
    <main className="min-h-screen overflow-hidden bg-[#f3f3eb] text-[#10221c]">
      <nav className="relative z-50 flex h-[74px] items-center justify-between border-b border-[#10221c]/10 px-5 md:px-10 lg:px-16">
        <Link href="/" className="flex items-center gap-2.5 text-lg font-black tracking-[-0.04em]">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#10221c] text-[#b7f34b]"><Building2 size={17}/></span>
          PropertyOS
        </Link>
        <div className="hidden items-center gap-8 text-sm text-[#5d6d67] md:flex"><a href="#how">How it works</a><a href="#program">Founding program</a><a href="#pricing">Pricing</a></div>
        <div className="flex items-center gap-2"><Link href="/auth/login" className="hidden rounded-full px-4 py-2.5 text-sm font-bold sm:block">Log in</Link><Link href="/auth/signup?source=website" className="rounded-full bg-[#10221c] px-4 py-2.5 text-xs font-black text-[#b7f34b] sm:text-sm">Start free pilot</Link></div>
      </nav>

      <section className="grid border-b border-[#10221c]/10 lg:min-h-[650px] lg:grid-cols-[1.02fr_.98fr]">
        <div className="relative z-10 px-5 py-14 sm:px-10 md:py-20 lg:px-16 lg:py-24">
          <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[.16em] text-[#5d6d67]"><span className="h-2 w-2 rounded-full bg-[#ff715b] shadow-[0_0_0_6px_rgba(255,113,91,.13)]"/>Built for independent brokers</div>
          <h1 className="mt-7 max-w-3xl text-[46px] font-black leading-[.98] tracking-[-.065em] sm:text-6xl lg:text-[76px]">{copy.headline}</h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-[#5d6d67] sm:text-lg sm:leading-8">{copy.subline}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link href="/auth/signup?source=hero" className="flex items-center justify-center gap-2 rounded-full bg-[#10221c] px-6 py-4 text-sm font-black text-[#b7f34b]"><Play size={16} fill="currentColor"/>Build my first page</Link><a href={whatsappHref} className="flex items-center justify-center gap-2 rounded-full border border-[#10221c]/15 px-6 py-4 text-sm font-black"><MessageCircle size={16}/>Watch WhatsApp demo</a></div>
          <div className="mt-5 flex flex-wrap gap-5 text-xs text-[#5d6d67]"><span className="flex items-center gap-1.5"><CreditCard size={14}/>No card</span><span className="flex items-center gap-1.5"><Clock3 size={14}/>14-day pilot</span><span className="flex items-center gap-1.5"><Sparkles size={14}/>First 3 listings assisted</span></div>
          <div className="mt-8 flex gap-1.5">{(['en','hi','mr'] as const).map(lang=><button key={lang} type="button" onClick={()=>setLanguage(lang)} className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${language===lang?'border-[#10221c] bg-[#10221c] text-[#f3f3eb]':'border-[#10221c]/15 text-[#5d6d67]'}`}>{lang==='en'?'English':lang==='hi'?'हिंदी':'मराठी'}</button>)}</div>
        </div>

        <div className="relative grid min-h-[570px] place-items-center overflow-hidden bg-[#10221c] px-3 py-10 sm:px-8">
          <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.18)_1px,transparent_1px)] [background-size:42px_42px] [mask-image:linear-gradient(to_bottom,black,transparent)]"/>
          <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-[#b7f34b]/15 blur-3xl"/><div className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-[#ff715b]/20 blur-3xl"/>
          <div className="relative h-[500px] w-full max-w-[500px]">
            <span className="absolute right-2 top-0 z-20 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[.16em] text-white">Example product preview</span>
            <div className="absolute left-[3%] top-3 w-[220px] -rotate-3 rounded-[31px] bg-[#050907] p-2 shadow-2xl sm:left-[6%] sm:w-[245px]">
              <div className="overflow-hidden rounded-[24px] bg-[#f6f4ec] text-[#10221c]"><div className="flex justify-between px-4 py-3 text-[8px] font-bold"><span>9:41</span><span>● ● ●</span></div><div className="flex h-[188px] items-end bg-[linear-gradient(160deg,rgba(8,22,17,.05),rgba(8,22,17,.65)),linear-gradient(135deg,#d0b39d,#617b6e)] p-4"><span className="rounded-full bg-[#10221c]/80 px-2 py-1 text-[8px] text-white">Details provided by broker</span></div><div className="p-4"><p className="text-[8px] font-bold tracking-[.12em] text-[#66736d]">PRIME REALTY · PUNE</p><h3 className="mt-2 text-xl font-black leading-tight tracking-[-.04em]">Sunlit 3 BHK in Baner</h3><div className="mt-2 flex items-center justify-between text-[10px]"><strong className="text-base">₹1.65 Cr</strong><span>For sale</span></div><div className="my-3 grid grid-cols-3 gap-1 text-center text-[8px]"><span className="rounded-lg bg-[#e8eadf] py-2">3 BHK</span><span className="rounded-lg bg-[#e8eadf] py-2">1,460 ft²</span><span className="rounded-lg bg-[#e8eadf] py-2">Ready</span></div><div className="rounded-xl bg-[#10221c] py-3 text-center text-[10px] font-black text-[#b7f34b]">Chat with Aakash on WhatsApp</div></div></div>
            </div>
            <div className="absolute right-0 top-[82px] w-[205px] rotate-3 rounded-[20px] bg-[#f7fff4] p-4 text-[#10221c] shadow-2xl sm:w-[245px]"><div className="flex items-center justify-between text-[10px]"><b>Example activity</b><span className="rounded-full bg-[#e5f1df] px-2 py-1 text-[8px] text-[#477047]">DEMO</span></div><p className="mt-5 text-4xl font-black tracking-[-.06em]">38</p><p className="mt-1 text-[9px] text-[#66736d]">sample property views</p><div className="mt-4 flex h-16 items-end gap-1.5">{[24,39,31,60,48,88,70].map((height,i)=><span key={i} className={`flex-1 rounded-t ${i===5?'bg-[#ff715b]':'bg-[#10221c]/15'}`} style={{height:`${height}%`}}/>)}</div></div>
            <div className="absolute bottom-6 right-1 w-[230px] rounded-2xl bg-[#b7f34b] p-4 text-[#10221c] shadow-2xl sm:right-[3%] sm:w-[260px]"><div className="flex items-center justify-between gap-2"><div><b className="block text-[11px]">Example buyer enquiry</b><span className="text-[8px] opacity-70">WhatsApp click · sample listing</span></div><span className="rounded-full bg-[#10221c] px-2.5 py-1.5 text-[8px] font-black text-[#b7f34b]">Follow up</span></div></div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 border-b border-[#10221c]/10 px-5 py-8 md:grid-cols-[.75fr_1.25fr] md:px-16"><p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#5d6d67]">Everything your next WhatsApp share needs</p><div className="grid grid-cols-2 gap-4 text-sm font-black sm:grid-cols-4"><span>Branded page</span><span>Buyer capture</span><span>Live analytics</span><span>Reusable inventory</span></div></section>

      <section id="how" className="grid gap-12 px-5 py-20 sm:px-10 md:px-16 lg:grid-cols-[.85fr_1.15fr] lg:gap-24 lg:py-28"><h2 className="text-4xl font-black leading-[1.03] tracking-[-.055em] sm:text-5xl lg:text-6xl">Your buyer sees one clean story. <span className="text-[#ff715b]">You see what happens next.</span></h2><div>{[['Add the property once','Photos, price, location and highlights stay organized and ready to reuse.'],['Share one premium page','Your logo, name and WhatsApp action make every independent broker look established.'],['Follow up with context','Views, clicks and captured enquiries tell you which conversation deserves attention.']].map(([title,text],i)=><article key={title} className="grid grid-cols-[38px_1fr] gap-4 border-b border-[#10221c]/10 py-6"><span className="text-xs font-black text-[#ff715b]">0{i+1}</span><div><h3 className="text-xl font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-[#5d6d67]">{text}</p></div></article>)}</div></section>

      <section id="pricing" className="mx-3 mb-12 grid overflow-hidden rounded-[28px] bg-[#10221c] text-white sm:mx-8 lg:grid-cols-[1.08fr_.92fr]"><div className="p-8 sm:p-14"><p className="text-[11px] font-black tracking-[.16em] text-[#b7f34b]">FOUNDING BROKER PROGRAM</p><h2 className="mt-5 max-w-2xl text-4xl font-black leading-[1.02] tracking-[-.055em] sm:text-6xl">Bring one real property. Leave with a live page.</h2><p className="mt-5 max-w-xl leading-7 text-[#acbbb5]">We set up your branding and help publish the first three listings. Continue only if PropertyOS makes your daily sharing easier.</p><div className="mt-6 flex flex-wrap gap-4 text-xs text-[#acbbb5]"><span className="flex items-center gap-1"><Check size={14} className="text-[#b7f34b]"/>100 listings</span><span className="flex items-center gap-1"><Check size={14} className="text-[#b7f34b]"/>Lead capture</span><span className="flex items-center gap-1"><Check size={14} className="text-[#b7f34b]"/>Analytics</span></div></div><div className="grid place-items-center bg-[#b7f34b] p-10 text-[#10221c]"><div><p className="text-7xl font-black tracking-[-.07em] sm:text-8xl">₹499</p><p className="mt-3 text-[#364a42]">per month after your free 14-day pilot</p><Link href="/auth/signup?source=pricing" className="mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-[#10221c] px-6 py-4 text-sm font-black text-[#b7f34b]">Claim founding access <ArrowRight size={16}/></Link></div></div></section>

      <footer className="flex flex-col justify-between gap-5 border-t border-[#10221c]/10 px-5 py-8 text-xs text-[#5d6d67] sm:flex-row sm:px-10 lg:px-16"><p>© 2026 PropertyOS · Made for real estate professionals</p><div className="flex flex-wrap gap-5"><Link href="/support">Support</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/refund">Refunds</Link></div></footer>
    </main>
  );
}
