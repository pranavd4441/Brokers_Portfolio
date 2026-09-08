import Link from 'next/link';
import { ArrowLeft, Mail, MessageCircle } from 'lucide-react';
import { parseLanguage } from '@/components/landing/content';

const copy = {
  en: { title: 'Let’s get your business online.', intro: 'Talk to us about your first listing, account help or Founding Pro access.', whatsapp: 'Chat with broker support', email: 'Email support', languages: 'Support in English, Hindi and Marathi.', note: 'Include what you need help with and your registered email. Never share your password or one-time code.', message: 'Hi, I would like help with PropertyOS onboarding or Founding Pro access.' },
  hi: { title: 'अपना व्यवसाय ऑनलाइन लाएं।', intro: 'पहली लिस्टिंग, अकाउंट सहायता या फाउंडिंग प्रो के बारे में हमसे बात करें।', whatsapp: 'ब्रोकर सपोर्ट से बात करें', email: 'ईमेल सपोर्ट', languages: 'अंग्रेज़ी, हिंदी और मराठी में सहायता।', note: 'अपनी समस्या और रजिस्टर्ड ईमेल बताएं। पासवर्ड या वन-टाइम कोड कभी शेयर न करें।', message: 'नमस्ते, मुझे PropertyOS सेटअप या फाउंडिंग प्रो के बारे में सहायता चाहिए।' },
  mr: { title: 'तुमचा व्यवसाय ऑनलाइन आणूया.', intro: 'पहिली लिस्टिंग, खात्याची मदत किंवा फाउंडिंग प्रो प्रवेशाबद्दल आमच्याशी बोला.', whatsapp: 'ब्रोकर सपोर्टशी बोला', email: 'ईमेल सपोर्ट', languages: 'इंग्रजी, हिंदी आणि मराठीमध्ये मदत.', note: 'तुमची समस्या आणि नोंदणीकृत ईमेल सांगा. पासवर्ड किंवा वन-टाइम कोड कधीही शेअर करू नका.', message: 'नमस्कार, मला PropertyOS सेटअप किंवा फाउंडिंग प्रोबद्दल मदत हवी आहे.' },
};

export default async function Support({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const language = parseLanguage((await searchParams).lang ?? null);
  const t = copy[language];
  const configuredNumber = (process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || '').replace(/\D/g, '');
  const number = /^[1-9]\d{7,14}$/.test(configuredNumber) && configuredNumber !== '919876543210' ? configuredNumber : '918855023247';
  const configuredEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();
  const email = configuredEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(configuredEmail) ? configuredEmail : null;

  return <main className="landing-root min-h-screen" lang={language}><div className="landing-wrap landing-band">
    <Link className="landing-brand" href={`/?lang=${language}`}><ArrowLeft size={20} />PropertyOS</Link>
    <div className="mt-16 flex max-w-2xl flex-col gap-6"><h1 className="text-4xl font-semibold leading-tight">{t.title}</h1><p>{t.intro}</p><p>{t.languages}</p>
      <div className="landing-actions"><a className="landing-cta" href={`https://wa.me/${number}?text=${encodeURIComponent(t.message)}`}><MessageCircle size={20} />{t.whatsapp}</a>{email && <a className="landing-cta landing-cta-outline" href={`mailto:${email}`}><Mail size={20} />{t.email}</a>}</div>
      <p className="text-sm">+{number}</p><p className="text-sm">{t.note}</p>
    </div>
  </div></main>;
}
