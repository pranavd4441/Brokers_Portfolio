'use client';

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  ArrowRight, BadgeCheck, BedDouble, Building2, CalendarCheck,
  Camera, Check, ChevronLeft, ChevronRight, Expand, Home, MapPin,
  Maximize2, MessageCircle, Phone, Ruler, Share2, ShieldCheck, Sparkles, X,
} from 'lucide-react';
import { fetchApi, getApiUrl } from '@/lib/api';
import { PublicProperty } from './page';

function formatPrice(price: number) {
  if (price >= 10_000_000) return { main: `₹${(price / 10_000_000).toFixed(2)}`, unit: 'Crore' };
  if (price >= 100_000) return { main: `₹${(price / 100_000).toFixed(2)}`, unit: 'Lakh' };
  return { main: `₹${price.toLocaleString('en-IN')}`, unit: '' };
}

function pretty(value: string) {
  return value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
}

const AMENITY_LABELS: Record<string, string> = {
  gym: 'Fitness centre', pool: 'Swimming pool', parking: 'Car parking', security: '24/7 security',
  clubhouse: 'Club house', garden: 'Landscaped garden', lift: 'Elevator', power_backup: 'Power backup',
  wifi: 'High-speed Wi-Fi', cctv: 'CCTV surveillance', intercom: 'Intercom', fire_safety: 'Fire safety',
};

function Gallery({ images, title }: { images: PublicProperty['images']; title: string }) {
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const prev = useCallback(() => setActive(index => (index - 1 + images.length) % images.length), [images.length]);
  const next = useCallback(() => setActive(index => (index + 1) % images.length), [images.length]);

  useEffect(() => {
    if (!open) return;
    const listener = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') prev();
      if (event.key === 'ArrowRight') next();
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [open, next, prev]);

  if (!images.length) {
    return <div className="grid min-h-[380px] place-items-center rounded-[28px] bg-[#dfe4da] text-[#66736d]"><div className="text-center"><Building2 className="mx-auto opacity-40" size={44}/><p className="mt-3 text-sm font-bold">Photos will be added shortly</p></div></div>;
  }

  return <>
    <div className={`grid gap-2 ${images.length > 1 ? 'md:grid-cols-[minmax(0,1fr)_220px]' : ''}`}>
      <button type="button" onClick={() => setOpen(true)} onTouchStart={event=>setTouchStart(event.touches[0].clientX)} onTouchEnd={event=>{if(touchStart===null)return;const diff=touchStart-event.changedTouches[0].clientX;if(Math.abs(diff)>50)(diff>0?next:prev)();setTouchStart(null);}} className="group relative h-[330px] overflow-hidden rounded-[28px] bg-[#dfe4da] text-left sm:h-[470px]">
        <img src={images[active].url} alt={`${title}, photograph ${active + 1}`} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.025]"/>
        <span className="absolute inset-0 bg-gradient-to-t from-[#10221c]/45 via-transparent to-transparent"/>
        <span className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-white/95 px-3 py-2 text-xs font-black text-[#10221c] shadow-lg"><Expand size={14}/>View gallery</span>
        <span className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full bg-[#10221c]/85 px-3 py-2 text-xs font-bold text-white"><Camera size={14}/>{active + 1} / {images.length}</span>
      </button>
      {images.length > 1 && <div className="hidden gap-2 md:grid md:grid-rows-3">
        {images.slice(1,4).map((image,index)=><button type="button" key={image.id} onClick={()=>{setActive(index+1);setOpen(true);}} className="relative overflow-hidden rounded-[20px] bg-[#dfe4da]"><img src={image.thumbnail_url || image.url} alt={`${title}, photograph ${index+2}`} className="h-full w-full object-cover transition hover:scale-105"/>{index===2 && images.length>4 && <span className="absolute inset-0 grid place-items-center bg-[#10221c]/65 text-sm font-black text-white">+{images.length-4} photos</span>}</button>)}
      </div>}
    </div>
    {images.length>1 && <div className="mt-3 flex justify-center gap-1.5 md:hidden">{images.map((_,index)=><button key={index} aria-label={`Show photo ${index+1}`} onClick={()=>setActive(index)} className={`h-1.5 rounded-full transition-all ${index===active?'w-6 bg-[#10221c]':'w-1.5 bg-[#10221c]/20'}`}/>)}</div>}
    {open && <div className="fixed inset-0 z-[120] grid place-items-center bg-[#07110e]/95 p-3 backdrop-blur-md" onClick={()=>setOpen(false)}><button aria-label="Close gallery" className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white" onClick={()=>setOpen(false)}><X size={18}/></button><div className="relative w-full max-w-6xl" onClick={event=>event.stopPropagation()}><img src={images[active].url} alt={`${title}, photograph ${active+1}`} className="mx-auto max-h-[86vh] w-full rounded-2xl object-contain"/>{images.length>1&&<><button aria-label="Previous photo" onClick={prev} className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white"><ChevronLeft/></button><button aria-label="Next photo" onClick={next} className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white"><ChevronRight/></button></>}</div></div>}
  </>;
}

// Server rendering is preferred for link previews. If the backend is briefly
// unavailable during SSR, retry from the browser so valid shared links recover.
export default function PublicPropertyClient({
  property: initialProperty,
  slug,
}: {
  property: PublicProperty | null;
  slug: string;
}) {
  const [propertyData, setPropertyData] = useState<PublicProperty | null>(initialProperty);
  const [loading, setLoading] = useState(!initialProperty);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (propertyData) return;

    let active = true;
    const loadProperty = async () => {
      try {
        setLoading(true);
        const data = await fetchApi(`/sharing/public/${slug}/`);
        const prop = data.property ?? data;
        const branding = data.branding ?? {};

        const flattened: PublicProperty = {
          id: prop.id,
          slug: prop.slug ?? slug,
          title: prop.title,
          description: prop.description,
          price: prop.price,
          property_type: prop.property_type,
          status: prop.status,
          city: prop.city,
          area: prop.area,
          address: prop.location_address,
          bhk: prop.bhk,
          square_feet: prop.square_feet,
          amenities: prop.amenities ?? [],
          images: prop.images ?? [],
          views: prop.views ?? 0,
          brand_color: branding.brand_color ?? '#16c784',
          brand_logo_url: branding.logo_url ?? null,
          agency_name: branding.name ?? null,
          broker: {
            name: branding.broker_name ?? branding.name ?? 'Broker',
            phone: branding.phone ?? branding.broker_phone ?? '',
            whatsapp: branding.whatsapp ?? branding.broker_whatsapp ?? branding.phone ?? '',
            avatar_url: branding.avatar_url ?? null,
            agency_name: branding.name ?? null,
            verified: branding.verified ?? false,
          },
        };

        if (active) {
          setPropertyData(flattened);
          setLoadError(null);
        }
      } catch (err: unknown) {
        if (active) {
          setLoadError(err instanceof Error ? err.message : 'This listing link is invalid or has been removed.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadProperty();
    return () => { active = false; };
  }, [slug, propertyData]);

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-[#f4f4ed] text-[#10221c]"><div className="text-center"><div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-[#10221c]/10 border-t-[#10221c]"/><p className="mt-4 text-sm font-bold">Preparing property presentation…</p></div></div>;
  }

  if (loadError || !propertyData) {
    return <div className="grid min-h-screen place-items-center bg-[#f4f4ed] px-6 text-center text-[#10221c]"><div><Building2 className="mx-auto text-[#718078]" size={48}/><h1 className="mt-5 text-2xl font-black">Listing unavailable</h1><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#64736c]">{loadError || 'This listing link is invalid or has been removed.'}</p><a href="/" className="mt-6 inline-flex rounded-xl bg-[#10221c] px-5 py-3 text-sm font-black text-[#b7f34b]">Visit PropertyOS</a></div></div>;
  }

  return <ListingExperience property={propertyData}/>;
}

function ListingExperience({ property: initialProperty }: { property: PublicProperty }) {
  const absoluteUrl = (candidate?: string | null) => {
    if (!candidate) return '';
    let url = candidate;
    if (url.includes('storage.supabase.co/storage/v1/s3/')) {
      url = url.replace('storage.supabase.co/storage/v1/s3', 'supabase.co/storage/v1/object/public');
    }
    if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url;
    const apiUrl = getApiUrl();
    const backendOrigin = apiUrl.startsWith('http') ? apiUrl.replace(/\/api$/, '') : window.location.origin.replace('-frontend','-backend');
    if (url.startsWith('/media/') || url.startsWith('/static/')) return `${backendOrigin}${url}`;
    const mediaIndex = url.indexOf('/media/');
    return mediaIndex >= 0 ? `${backendOrigin}${url.substring(mediaIndex)}` : url;
  };

  const property = {
    ...initialProperty,
    images: (initialProperty.images ?? []).map(image=>({...image,url:absoluteUrl(image.url),thumbnail_url:absoluteUrl(image.thumbnail_url)})),
    brand_logo_url: absoluteUrl(initialProperty.brand_logo_url),
    broker: {...initialProperty.broker, avatar_url:absoluteUrl(initialProperty.broker.avatar_url)},
  };
  const brandColor = property.brand_color || '#b7f34b';
  const price = formatPrice(property.price);
  const inactive = property.status === 'EXPIRED';
  const [modalOpen,setModalOpen] = useState(false);
  const [pending,setPending] = useState<'whatsapp'|'call'>('whatsapp');
  const [name,setName] = useState('');
  const [phone,setPhone] = useState('');
  const [error,setError] = useState('');

  useEffect(()=>{
    setName(localStorage.getItem('buyer_name') || '');
    setPhone(localStorage.getItem('buyer_phone') || '');
    fetch(`${getApiUrl()}/analytics/log/`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({property:property.id,share_slug:property.slug,event_type:'PAGE_VIEW'})}).catch(()=>{});
  },[property.id,property.slug]);

  const execute = useCallback((action:'whatsapp'|'call',buyerName:string,buyerPhone:string)=>{
    const eventType = action==='whatsapp'?'WHATSAPP_CLICK':'PHONE_CLICK';
    fetch(`${getApiUrl()}/analytics/log/`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({property:property.id,share_slug:property.slug,event_type:eventType,buyer_name:buyerName,buyer_phone:buyerPhone})}).catch(()=>{});
    if(action==='whatsapp'){
      const destination=property.broker.whatsapp.replace(/\D/g,'');
      const message=encodeURIComponent(`Hi ${property.broker.name}, I am interested in ${property.title}.\n${window.location.href}`);
      window.open(`https://wa.me/${destination}?text=${message}`,'_blank');
    } else window.location.href=`tel:${property.broker.phone}`;
  },[property]);

  const requestContact = (action:'whatsapp'|'call') => {
    if(inactive) return;
    const savedName=localStorage.getItem('buyer_name');
    const savedPhone=localStorage.getItem('buyer_phone');
    if(savedName&&savedPhone) execute(action,savedName,savedPhone);
    else {setPending(action);setModalOpen(true);}
  };
  const submitContact = (event:FormEvent) => {
    event.preventDefault();
    if(!name.trim()||!phone.trim()){setError('Please enter your name and phone number.');return;}
    localStorage.setItem('buyer_name',name.trim());localStorage.setItem('buyer_phone',phone.trim());
    setModalOpen(false);setError('');execute(pending,name.trim(),phone.trim());
  };
  const share = async () => {
    if(navigator.share) await navigator.share({title:property.title,text:`${property.title} in ${property.area}, ${property.city}`,url:window.location.href});
    else {await navigator.clipboard.writeText(window.location.href);}
  };
  const specItems = [
    property.bhk ? {icon:<BedDouble/>,value:`${property.bhk} BHK`,label:'Configuration'} : null,
    property.square_feet ? {icon:<Ruler/>,value:Number(property.square_feet).toLocaleString('en-IN'),label:'Square feet'} : null,
    {icon:<Home/>,value:pretty(property.property_type),label:'Property type'},
    {icon:<MapPin/>,value:property.area,label:property.city},
  ].filter(Boolean) as {icon:ReactNode;value:string;label:string}[];

  return <>
    <style>{`:root{--listing-brand:${brandColor}}`}</style>
    <div className="min-h-screen bg-[#f4f4ed] pb-24 text-[#10221c] selection:bg-[#b7f34b]">
      <header className="sticky top-0 z-40 border-b border-[#10221c]/10 bg-[#f4f4ed]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[70px] max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3"><span className="relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#10221c] text-sm font-black text-[#b7f34b]"><span>{property.broker.name[0]?.toUpperCase()}</span>{property.brand_logo_url&&<span aria-hidden className="absolute inset-0 bg-contain bg-center bg-no-repeat" style={{backgroundImage:`url(${property.brand_logo_url})`}}/>}</span><div className="min-w-0"><p className="truncate text-sm font-black tracking-[-.02em]">{property.agency_name || property.broker.agency_name || property.broker.name}</p><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#718078]">Exclusive property presentation</p></div></div>
          <button onClick={share} className="flex items-center gap-2 rounded-full border border-[#10221c]/15 bg-white/50 px-3 py-2 text-xs font-black"><Share2 size={15}/><span className="hidden sm:inline">Share listing</span></button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
        {inactive&&<div className="mb-5 rounded-2xl border border-[#b84632]/20 bg-[#fff0ec] p-4 text-sm font-bold text-[#a23c29]">This listing is currently inactive. Contact actions have been paused.</div>}
        <Gallery images={property.images} title={property.title}/>

        <section className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12">
          <div>
            <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#dcebc9] px-3 py-1.5 text-[10px] font-black uppercase tracking-[.12em] text-[#315f2b]">{pretty(property.status)}</span><span className="rounded-full border border-[#10221c]/10 bg-white/55 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.12em] text-[#64736c]">{pretty(property.property_type)}</span><span className="flex items-center gap-1 text-[11px] font-bold text-[#64736c]"><BadgeCheck size={14} className="text-[#3d7d43]"/>Broker-listed</span></div>
            <h1 className="mt-5 max-w-3xl text-3xl font-black leading-[1.06] tracking-[-.05em] sm:text-5xl">{property.title}</h1>
            <p className="mt-3 flex items-start gap-2 text-sm text-[#64736c]"><MapPin size={17} className="mt-0.5 shrink-0"/>{property.address ? `${property.address}, ` : ''}{property.area}, {property.city}</p>
            <div className="mt-6 flex items-end gap-2"><strong className="text-4xl font-black tracking-[-.055em] sm:text-5xl">{price.main}</strong>{price.unit&&<span className="pb-1 text-lg font-bold text-[#64736c]">{price.unit}</span>}</div>

            <div className="mt-8 grid grid-cols-2 overflow-hidden rounded-[22px] border border-[#10221c]/10 bg-white/55 sm:grid-cols-4">{specItems.map((item,index)=><div key={`${item.value}-${index}`} className="border-b border-r border-[#10221c]/10 p-4 last:border-r-0 sm:border-b-0"><span className="text-[#708077] [&>svg]:h-5 [&>svg]:w-5">{item.icon}</span><strong className="mt-4 block text-base font-black">{item.value}</strong><span className="mt-1 block text-[10px] font-bold uppercase tracking-[.1em] text-[#7b8780]">{item.label}</span></div>)}</div>

            <section className="mt-10 border-t border-[#10221c]/10 pt-8"><p className="text-[11px] font-black uppercase tracking-[.18em] text-[#ff715b]">The property</p><h2 className="mt-2 text-2xl font-black tracking-[-.035em]">Designed to help you decide, not just browse.</h2><p className="mt-5 whitespace-pre-line text-[15px] leading-8 text-[#586861]">{property.description}</p></section>

            {property.amenities.length>0&&<section className="mt-10 border-t border-[#10221c]/10 pt-8"><div className="flex items-end justify-between gap-4"><div><p className="text-[11px] font-black uppercase tracking-[.18em] text-[#ff715b]">Included</p><h2 className="mt-2 text-2xl font-black tracking-[-.035em]">Amenities and conveniences</h2></div><Sparkles className="text-[#ff715b]"/></div><div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">{property.amenities.map(amenity=><div key={amenity} className="flex items-center gap-3 rounded-2xl border border-[#10221c]/10 bg-white/50 px-4 py-3.5 text-sm font-bold"><span className="grid h-7 w-7 place-items-center rounded-full bg-[#dcebc9] text-[#315f2b]"><Check size={14}/></span>{AMENITY_LABELS[amenity] || pretty(amenity)}</div>)}</div></section>}

            <section className="mt-10 border-t border-[#10221c]/10 pt-8"><p className="text-[11px] font-black uppercase tracking-[.18em] text-[#ff715b]">Location</p><h2 className="mt-2 text-2xl font-black tracking-[-.035em]">Explore {property.area}</h2><div className="relative mt-6 min-h-[250px] overflow-hidden rounded-[24px] bg-[#dfe4da] p-7"><div className="absolute inset-0 opacity-30 [background-image:linear-gradient(#718078_1px,transparent_1px),linear-gradient(90deg,#718078_1px,transparent_1px)] [background-size:36px_36px] [mask-image:radial-gradient(circle_at_center,black,transparent_75%)]"/><div className="relative z-10 flex min-h-[196px] items-center justify-center"><div className="rounded-2xl bg-[#10221c] p-5 text-center text-white shadow-2xl"><span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-[#b7f34b] text-[#10221c]"><MapPin size={20}/></span><strong className="mt-3 block">{property.area}, {property.city}</strong>{property.address&&<span className="mt-1 block max-w-xs text-xs text-white/60">{property.address}</span>}</div></div></div><p className="mt-3 text-xs text-[#718078]">Exact directions and site-visit details are available directly from the listing broker.</p></section>
          </div>

          <aside className="lg:relative"><div className="space-y-4 lg:sticky lg:top-24">
            <div className="rounded-[26px] bg-[#10221c] p-6 text-white shadow-[0_25px_70px_rgba(16,34,28,.16)]"><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#b7f34b]">Your direct property contact</p><div className="mt-5 flex items-center gap-3"><span className="relative grid h-12 w-12 place-items-center overflow-hidden rounded-2xl bg-[#b7f34b] text-lg font-black text-[#10221c]"><span>{property.broker.name[0]?.toUpperCase()}</span>{property.broker.avatar_url&&<span aria-hidden className="absolute inset-0 bg-cover bg-center" style={{backgroundImage:`url(${property.broker.avatar_url})`}}/>}</span><div className="min-w-0"><div className="flex items-center gap-1.5"><strong className="truncate">{property.broker.name}</strong><BadgeCheck size={16} className="text-[#b7f34b]"/></div><p className="truncate text-xs text-white/55">{property.broker.agency_name || property.agency_name || 'Independent property advisor'}</p></div></div><div className="mt-6 space-y-2"><button disabled={inactive} onClick={()=>requestContact('whatsapp')} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#b7f34b] text-sm font-black text-[#10221c] disabled:opacity-40"><MessageCircle size={17}/>Ask on WhatsApp</button><button disabled={inactive} onClick={()=>requestContact('call')} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 text-sm font-black disabled:opacity-40"><Phone size={16}/>Call broker</button></div><div className="mt-5 space-y-3 border-t border-white/10 pt-5 text-[11px] leading-5 text-white/60"><p className="flex gap-2"><CalendarCheck size={15} className="mt-0.5 shrink-0 text-[#b7f34b]"/>Ask for availability, a video tour, price details or a site-visit slot.</p><p className="flex gap-2"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-[#b7f34b]"/>Your contact information goes only to this listing broker.</p></div></div>
            <div className="rounded-[22px] border border-[#10221c]/10 bg-white/55 p-5"><div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#718078]">Listing engagement</p><strong className="mt-1 block text-2xl">{property.views.toLocaleString('en-IN')} views</strong></div><span className="grid h-10 w-10 place-items-center rounded-full bg-[#dcebc9] text-[#315f2b]"><Maximize2 size={18}/></span></div><p className="mt-3 text-xs leading-5 text-[#718078]">Share the page with family or your advisor before scheduling a visit.</p><button onClick={share} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[#10221c]/10 py-3 text-xs font-black"><Share2 size={15}/>Share this property</button></div>
          </div></aside>
        </section>
      </main>

      <footer className="mt-10 border-t border-[#10221c]/10 px-4 py-8 text-center text-xs text-[#718078]"><p>Presented by <strong className="text-[#10221c]">{property.agency_name || property.broker.name}</strong></p><p className="mt-2">Digital property experience powered by <span className="font-black text-[#3f6e3f]">PropertyOS</span></p></footer>
    </div>

    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#10221c]/95 p-3 text-white backdrop-blur-xl lg:hidden"><div className="mx-auto flex max-w-xl items-center gap-2"><div className="min-w-0 flex-1"><span className="block text-[9px] uppercase tracking-widest text-white/50">Price</span><strong className="truncate text-base">{price.main} {price.unit}</strong></div><button disabled={inactive} onClick={()=>requestContact('call')} className="grid h-11 w-11 place-items-center rounded-xl border border-white/15 disabled:opacity-40"><Phone size={17}/></button><button disabled={inactive} onClick={()=>requestContact('whatsapp')} className="flex h-11 items-center gap-2 rounded-xl bg-[#b7f34b] px-4 text-sm font-black text-[#10221c] disabled:opacity-40"><MessageCircle size={17}/>Enquire</button></div></div>

    {modalOpen&&<div className="fixed inset-0 z-[130] grid place-items-center bg-[#07110e]/80 p-4 backdrop-blur-md"><div className="relative w-full max-w-md rounded-[26px] bg-[#f4f4ed] p-6 text-[#10221c] shadow-2xl"><button onClick={()=>setModalOpen(false)} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-[#10221c]/5"><X size={17}/></button><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#dcebc9] text-[#315f2b]"><MessageCircle/></span><h2 className="mt-5 text-2xl font-black tracking-[-.04em]">Connect with {property.broker.name}</h2><p className="mt-2 text-sm leading-6 text-[#64736c]">Share your details once to continue to {pending==='whatsapp'?'WhatsApp':'a phone call'}. They are sent only to this broker.</p><form onSubmit={submitContact} className="mt-6 space-y-4"><label className="block text-xs font-black">Your name<input value={name} onChange={event=>setName(event.target.value)} placeholder="e.g. Rohan Sharma" className="mt-2 h-12 w-full rounded-xl border border-[#10221c]/15 bg-white/60 px-4 text-sm outline-none focus:border-[#315f2b]"/></label><label className="block text-xs font-black">Phone number<input value={phone} onChange={event=>setPhone(event.target.value)} placeholder="e.g. +91 99999 99999" type="tel" className="mt-2 h-12 w-full rounded-xl border border-[#10221c]/15 bg-white/60 px-4 text-sm outline-none focus:border-[#315f2b]"/></label>{error&&<p className="text-xs font-bold text-[#b84632]">{error}</p>}<button className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#10221c] text-sm font-black text-[#b7f34b]">Continue <ArrowRight size={16}/></button><p className="text-center text-[10px] leading-4 text-[#718078]">By continuing, you agree to be contacted about this property.</p></form></div></div>}
  </>;
}
