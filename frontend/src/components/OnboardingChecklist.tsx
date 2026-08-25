'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api';

type Status={steps:{id:string;label:string;complete:boolean;href:string}[];completed:number;total:number;activated:boolean;listing_count:number;share_count:number};
export default function OnboardingChecklist(){
  const {data}=useQuery<Status>({queryKey:['onboarding'],queryFn:()=>fetchApi('/auth/onboarding/'),staleTime:15000});
  if(!data||data.completed===data.total)return null;
  const next=data.steps.find(step=>!step.complete);
  return <section className="mb-7 rounded-2xl border border-[#16c784]/20 bg-[#16c784]/[.05] p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-black tracking-[.18em] text-[#16c784]">YOUR FIRST 10 MINUTES</p><h2 className="mt-1 text-lg font-bold text-white">Get client-ready · {data.completed}/{data.total}</h2></div>{next&&<Link href={next.href} className="rounded-xl bg-[#16c784] px-4 py-2 text-xs font-black text-[#07130e]">Next: {next.label}</Link>}</div><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-black/30"><div className="h-full rounded-full bg-[#16c784]" style={{width:`${data.completed/data.total*100}%`}}/></div><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{data.steps.map(step=><Link key={step.id} href={step.href} className={`rounded-xl border px-3 py-2 text-xs ${step.complete?'border-[#16c784]/15 text-[#58e6aa]':'border-white/[.06] text-[#8993a8]'}`}>{step.complete?'✓':'○'} {step.label}</Link>)}</div></section>;
}
