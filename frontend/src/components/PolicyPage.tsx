import Link from 'next/link';

export default function PolicyPage({title, updated='24 August 2026', children}:{title:string;updated?:string;children:React.ReactNode}) {
  return <main className="min-h-screen bg-[#07090f] px-5 py-12 text-[#dce3ef]"><article className="mx-auto max-w-3xl"><Link href="/" className="text-sm font-bold text-[#16c784]">← PropertyOS</Link><h1 className="mt-10 text-4xl font-black text-white">{title}</h1><p className="mt-2 text-sm text-[#667087]">Last updated: {updated}</p><div className="prose prose-invert mt-10 space-y-7 leading-7 text-[#a5aec2]">{children}</div><p className="mt-12 border-t border-white/10 pt-6 text-sm">Questions? Contact <a className="text-[#16c784]" href="mailto:support@propertyos.in">support@propertyos.in</a>.</p></article></main>;
}
