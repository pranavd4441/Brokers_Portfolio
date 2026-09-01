'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BedDouble,
  Building2,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Home,
  ImageIcon,
  MapPin,
  MessageCircle,
  Phone,
  Ruler,
  Share2,
  ShieldCheck,
} from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchApi, getApiUrl } from '@/lib/api';
import {
  normalizePublicProperty,
  type PublicProperty,
  type PublicPropertyImage,
} from '@/lib/public-property';
import { resolveBrandPalette } from '@/lib/theme';
import { cn } from '@/lib/utils';

const ACTIVE_PUBLIC_STATUSES = new Set(['AVAILABLE', 'NEGOTIATION', 'SITE_VISIT', 'BOOKED']);

const AMENITY_LABELS: Record<string, string> = {
  gym: 'Fitness centre',
  pool: 'Swimming pool',
  parking: 'Car parking',
  security: '24/7 security',
  clubhouse: 'Club house',
  garden: 'Landscaped garden',
  lift: 'Elevator',
  power_backup: 'Power backup',
  wifi: 'High-speed Wi-Fi',
  cctv: 'CCTV surveillance',
  intercom: 'Intercom',
  fire_safety: 'Fire safety',
};

function formatPrice(price: number) {
  if (!price) return 'Price on request';
  if (price >= 10_000_000) return `₹${(price / 10_000_000).toFixed(2)} Cr`;
  if (price >= 100_000) return `₹${(price / 100_000).toFixed(2)} L`;
  return `₹${price.toLocaleString('en-IN')}`;
}

function pretty(value: string) {
  return value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'PA';
}

function resolvePublicAsset(candidate?: string | null) {
  if (!candidate) return '';
  let url = candidate;
  if (url.includes('storage.supabase.co/storage/v1/s3/')) {
    url = url.replace('storage.supabase.co/storage/v1/s3', 'supabase.co/storage/v1/object/public');
  }
  if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url;

  const apiUrl = getApiUrl();
  const browserOrigin = typeof window !== 'undefined'
    ? window.location.origin.replace('-frontend', '-backend')
    : '';
  const backendOrigin = apiUrl.startsWith('http') ? apiUrl.replace(/\/api$/, '') : browserOrigin;
  if (url.startsWith('/media/') || url.startsWith('/static/')) return `${backendOrigin}${url}`;
  const mediaIndex = url.indexOf('/media/');
  return mediaIndex >= 0 ? `${backendOrigin}${url.substring(mediaIndex)}` : url;
}

function readSavedBuyerField(key: 'buyer_name' | 'buyer_phone') {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(`propertyos_${key}`) || localStorage.getItem(key) || '';
}

function BrokerAvatar({
  name,
  image,
  className,
}: {
  name: string;
  image?: string;
  className?: string;
}) {
  return (
    <Avatar className={className} size="lg">
      {image ? <AvatarImage alt={`${name}, property advisor`} src={image} /> : null}
      <AvatarFallback>{initials(name)}</AvatarFallback>
    </Avatar>
  );
}

function PropertySkeleton() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex h-18 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Skeleton className="size-11 rounded-xl" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </div>
      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-5 sm:px-6 sm:py-8">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,.75fr)]">
          <Skeleton className="aspect-[4/3] rounded-3xl lg:aspect-auto lg:min-h-[590px]" />
          <Card className="rounded-3xl">
            <CardHeader>
              <Skeleton className="h-5 w-28" />
              <Skeleton className="mt-4 h-12 w-full" />
              <Skeleton className="h-4 w-44" />
            </CardHeader>
            <CardContent className="grid gap-5">
              <Skeleton className="h-12 w-40" />
              <Skeleton className="h-32 w-full rounded-2xl" />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

function PropertyUnavailable({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-12 text-foreground">
      <Card className="w-full max-w-md rounded-3xl text-center">
        <CardHeader className="items-center">
          <div className="grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <Building2 aria-hidden="true" className="size-6" />
          </div>
          <CardTitle className="mt-3 text-2xl font-bold">Listing unavailable</CardTitle>
          <CardDescription className="max-w-sm leading-6">{message}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Button onClick={onRetry} type="button">Try again</Button>
          <Link className={buttonVariants({ variant: 'outline' })} href="/support">
            Get support
          </Link>
        </CardContent>
        <CardFooter className="justify-center text-xs text-muted-foreground">
          No account or login is required to view an active listing.
        </CardFooter>
      </Card>
    </main>
  );
}

function Gallery({
  images,
  title,
  onExpanded,
}: {
  images: PublicPropertyImage[];
  title: string;
  onExpanded: () => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const previous = useCallback(() => {
    setActiveIndex((index) => (index - 1 + images.length) % images.length);
  }, [images.length]);
  const next = useCallback(() => {
    setActiveIndex((index) => (index + 1) % images.length);
  }, [images.length]);
  const setDialogOpen = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) onExpanded();
  };

  if (!images.length) {
    return (
      <div className="grid aspect-[4/3] place-items-center rounded-3xl border border-border bg-muted text-muted-foreground lg:aspect-auto lg:min-h-[590px]">
        <div className="grid justify-items-center gap-3 text-center">
          <div className="grid size-14 place-items-center rounded-2xl bg-card">
            <ImageIcon aria-hidden="true" className="size-6" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Photos are being prepared</p>
            <p className="mt-1 text-sm">Ask the broker for current property photos.</p>
          </div>
        </div>
      </div>
    );
  }

  const activeImage = images[activeIndex];

  return (
    <Dialog onOpenChange={setDialogOpen} open={open}>
      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_180px] lg:min-h-[590px] lg:grid-cols-[minmax(0,1fr)_210px]">
        <button
          aria-label={`Open gallery. Showing photograph ${activeIndex + 1} of ${images.length}`}
          className="group relative min-h-80 overflow-hidden rounded-3xl bg-muted text-left md:min-h-[520px] lg:min-h-[590px]"
          onClick={() => setDialogOpen(true)}
          onTouchEnd={(event) => {
            if (touchStart === null) return;
            const difference = touchStart - event.changedTouches[0].clientX;
            if (Math.abs(difference) > 50) (difference > 0 ? next : previous)();
            setTouchStart(null);
          }}
          onTouchStart={(event) => setTouchStart(event.touches[0].clientX)}
          type="button"
        >
          <Image
            alt={`${title}, photograph ${activeIndex + 1}`}
            className="object-cover transition-transform duration-300 group-hover:scale-[1.015]"
            fill
            priority
            sizes="(max-width: 767px) 100vw, (max-width: 1199px) 75vw, 760px"
            src={activeImage.url}
            unoptimized
          />
          <span className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-foreground/70 to-transparent" />
          <span className="absolute bottom-4 left-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-background/95 px-4 text-sm font-semibold text-foreground shadow-lg">
            <Camera aria-hidden="true" className="size-4" />
            View gallery
          </span>
          <span className="absolute right-4 bottom-4 rounded-full bg-foreground/85 px-3 py-2 text-xs font-semibold text-background">
            {activeIndex + 1} / {images.length}
          </span>
        </button>

        {images.length > 1 ? (
          <div className="hidden grid-rows-3 gap-2 md:grid">
            {images.slice(1, 4).map((image, index) => {
              const imageIndex = index + 1;
              return (
                <button
                  aria-label={`Open photograph ${imageIndex + 1}`}
                  className="relative min-h-0 overflow-hidden rounded-2xl bg-muted"
                  key={image.id}
                  onClick={() => {
                    setActiveIndex(imageIndex);
                    setDialogOpen(true);
                  }}
                  type="button"
                >
                  <Image
                    alt={`${title}, photograph ${imageIndex + 1}`}
                    className="object-cover transition-transform duration-300 hover:scale-105"
                    fill
                    sizes="210px"
                    src={image.thumbnail_url || image.url}
                    unoptimized
                  />
                  {index === 2 && images.length > 4 ? (
                    <span className="absolute inset-0 grid place-items-center bg-foreground/70 text-sm font-semibold text-background">
                      +{images.length - 4} photos
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {images.length > 1 ? (
        <div aria-label="Choose property photograph" className="mt-2 flex justify-center gap-1 md:hidden" role="group">
          {images.map((image, index) => (
            <button
              aria-label={`Show photograph ${index + 1}`}
              aria-pressed={index === activeIndex}
              className="grid size-11 place-items-center rounded-full"
              key={image.id}
              onClick={() => setActiveIndex(index)}
              type="button"
            >
              <span className={cn(
                'block h-1.5 rounded-full bg-muted-foreground/35 transition-all',
                index === activeIndex ? 'w-6 bg-primary' : 'w-1.5',
              )} />
            </button>
          ))}
        </div>
      ) : null}

      <DialogContent className="max-w-6xl gap-3 bg-foreground p-3 text-background sm:max-w-6xl" showCloseButton>
        <DialogHeader className="sr-only">
          <DialogTitle>{title} photo gallery</DialogTitle>
          <DialogDescription>
            Photograph {activeIndex + 1} of {images.length}. Use the arrow buttons to browse.
          </DialogDescription>
        </DialogHeader>
        <div className="relative h-[min(76vh,760px)] overflow-hidden rounded-2xl bg-foreground">
          <Image
            alt={`${title}, photograph ${activeIndex + 1}`}
            className="object-contain"
            fill
            sizes="95vw"
            src={activeImage.url}
            unoptimized
          />
          {images.length > 1 ? (
            <>
              <Button
                aria-label="Previous photograph"
                className="absolute top-1/2 left-3 -translate-y-1/2"
                onClick={previous}
                size="icon"
                type="button"
                variant="secondary"
              >
                <ChevronLeft aria-hidden="true" />
              </Button>
              <Button
                aria-label="Next photograph"
                className="absolute top-1/2 right-3 -translate-y-1/2"
                onClick={next}
                size="icon"
                type="button"
                variant="secondary"
              >
                <ChevronRight aria-hidden="true" />
              </Button>
            </>
          ) : null}
        </div>
        <p className="text-center text-xs text-background/70">
          {activeIndex + 1} of {images.length}
          {activeImage.caption ? ` · ${activeImage.caption}` : ''}
        </p>
      </DialogContent>
    </Dialog>
  );
}

function ContactDialog({
  action,
  brokerName,
  open,
  onOpenChange,
  onContinue,
}: {
  action: 'whatsapp' | 'call';
  brokerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: (name: string, phone: string) => void;
}) {
  const [name, setName] = useState(() => readSavedBuyerField('buyer_name'));
  const [phone, setPhone] = useState(() => readSavedBuyerField('buyer_phone'));
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedName = name.trim();
    const normalizedPhone = phone.trim();
    const digits = normalizedPhone.replace(/\D/g, '');
    const nextErrors = {
      name: normalizedName ? undefined : 'Enter your name.',
      phone: digits.length >= 7 ? undefined : 'Enter a valid phone number.',
    };
    setErrors(nextErrors);
    if (nextErrors.name || nextErrors.phone) return;

    localStorage.setItem('propertyos_buyer_name', normalizedName);
    localStorage.setItem('propertyos_buyer_phone', normalizedPhone);
    onContinue(normalizedName, normalizedPhone);
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 grid size-12 place-items-center rounded-2xl bg-accent text-accent-foreground">
            {action === 'whatsapp'
              ? <MessageCircle aria-hidden="true" className="size-5" />
              : <Phone aria-hidden="true" className="size-5" />}
          </div>
          <DialogTitle className="text-2xl font-bold">Connect with {brokerName}</DialogTitle>
          <DialogDescription className="leading-6">
            Share your details once to continue to {action === 'whatsapp' ? 'WhatsApp' : 'a phone call'}.
            They are sent only to this listing broker.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-5" onSubmit={submit}>
          <FieldGroup>
            <Field data-invalid={Boolean(errors.name)}>
              <FieldLabel htmlFor="buyer-name">Your name</FieldLabel>
              <Input
                aria-invalid={Boolean(errors.name)}
                autoComplete="name"
                id="buyer-name"
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Rohan Sharma"
                value={name}
              />
              <FieldError>{errors.name}</FieldError>
            </Field>
            <Field data-invalid={Boolean(errors.phone)}>
              <FieldLabel htmlFor="buyer-phone">Phone number</FieldLabel>
              <Input
                aria-invalid={Boolean(errors.phone)}
                autoComplete="tel"
                id="buyer-phone"
                inputMode="tel"
                onChange={(event) => setPhone(event.target.value)}
                placeholder="e.g. +91 99999 99999"
                type="tel"
                value={phone}
              />
              <FieldError>{errors.phone}</FieldError>
            </Field>
          </FieldGroup>
          <FieldDescription>
            By continuing, you agree to be contacted about this property. Read our{' '}
            <Link href="/privacy">Privacy policy</Link>.
          </FieldDescription>
          <Button size="lg" type="submit">
            Continue
            <ArrowRight data-icon="inline-end" />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function PublicPropertyClient({
  property: initialProperty,
  slug,
}: {
  property: PublicProperty | null;
  slug: string;
}) {
  const [property, setProperty] = useState(initialProperty);
  const [loading, setLoading] = useState(!initialProperty);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (initialProperty && retryKey === 0) return;

    let active = true;
    const loadProperty = async () => {
      setLoading(true);
      try {
        const data = await fetchApi(`/sharing/public/${slug}/`, { skipAuth: true });
        const normalized = normalizePublicProperty(data, slug);
        if (!active) return;
        setProperty(normalized);
        setLoadError(null);
        if (normalized.slug !== slug) {
          window.history.replaceState(null, '', `/p/${normalized.slug}`);
        }
      } catch {
        if (active) {
          setLoadError('We could not load this property page. The link may be unavailable, or the service may be temporarily offline.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadProperty();
    return () => {
      active = false;
    };
  }, [initialProperty, retryKey, slug]);

  if (loading) return <PropertySkeleton />;
  if (loadError || !property) {
    return (
      <PropertyUnavailable
        message={loadError || 'This listing link is invalid, expired, or has been removed.'}
        onRetry={() => setRetryKey((value) => value + 1)}
      />
    );
  }

  return <PublicPropertyExperience property={property} />;
}

export function PublicPropertyExperience({
  property: sourceProperty,
  analyticsEnabled = true,
}: {
  property: PublicProperty;
  analyticsEnabled?: boolean;
}) {
  const property = useMemo(() => ({
    ...sourceProperty,
    images: sourceProperty.images.map((image) => ({
      ...image,
      url: resolvePublicAsset(image.url),
      thumbnail_url: resolvePublicAsset(image.thumbnail_url),
    })),
    brand_logo_url: resolvePublicAsset(sourceProperty.brand_logo_url),
    broker: {
      ...sourceProperty.broker,
      avatar_url: resolvePublicAsset(sourceProperty.broker.avatar_url),
    },
  }), [sourceProperty]);

  const theme = property.theme_mode;
  const palette = resolveBrandPalette(property.brand_color, theme);
  const themeStyle = {
    '--ui-brand': palette.brand,
    '--ui-brand-strong': palette.strong,
    '--ui-brand-ink': palette.ink,
    '--primary': palette.strong,
    '--primary-foreground': palette.ink,
  } as CSSProperties;
  const price = formatPrice(property.price);
  const location = [property.area, property.city].filter(Boolean).join(', ');
  const inactive = !ACTIVE_PUBLIC_STATUSES.has(property.status);
  const canWhatsapp = Boolean(property.broker.whatsapp.replace(/\D/g, ''));
  const canCall = Boolean(property.broker.phone.replace(/\D/g, ''));
  const [contactOpen, setContactOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<'whatsapp' | 'call'>('whatsapp');
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [shareMessage, setShareMessage] = useState('');

  const logEvent = useCallback((
    eventType: 'PAGE_VIEW' | 'IMAGE_VIEW' | 'WHATSAPP_CLICK' | 'PHONE_CLICK',
    buyer?: { name: string; phone: string },
  ) => {
    if (!analyticsEnabled) return;
    const payload: Record<string, string> = {
      share_slug: property.slug,
      event_type: eventType,
    };
    if (property.id) payload.property = property.id;
    if (buyer) {
      payload.buyer_name = buyer.name;
      payload.buyer_phone = buyer.phone;
    }
    fetch(`${getApiUrl()}/analytics/log/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => undefined);
  }, [analyticsEnabled, property.id, property.slug]);

  useEffect(() => {
    if (!analyticsEnabled) return;
    const storageKey = `propertyos_page_view:${property.slug}`;
    try {
      if (sessionStorage.getItem(storageKey)) return;
      sessionStorage.setItem(storageKey, '1');
    } catch {
      // Storage may be unavailable in strict privacy mode; analytics stays best-effort.
    }
    logEvent('PAGE_VIEW');
  }, [analyticsEnabled, logEvent, property.slug]);

  const completeContact = useCallback((action: 'whatsapp' | 'call', name: string, phone: string) => {
    logEvent(action === 'whatsapp' ? 'WHATSAPP_CLICK' : 'PHONE_CLICK', { name, phone });
    setContactOpen(false);

    if (action === 'whatsapp') {
      const destination = property.broker.whatsapp.replace(/\D/g, '');
      const message = [
        `Hi ${property.broker.name},`,
        `I am interested in ${property.title}.`,
        location ? `Location: ${location}` : '',
        `Price: ${price}`,
        window.location.href,
      ].filter(Boolean).join('\n');
      window.open(`https://wa.me/${destination}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
      return;
    }

    window.location.assign(`tel:${property.broker.phone}`);
  }, [location, logEvent, price, property.broker.name, property.broker.phone, property.broker.whatsapp, property.title]);

  const requestContact = (action: 'whatsapp' | 'call') => {
    if (inactive) return;
    if (action === 'whatsapp' && !canWhatsapp) return;
    if (action === 'call' && !canCall) return;

    const savedName = readSavedBuyerField('buyer_name');
    const savedPhone = readSavedBuyerField('buyer_phone');
    if (savedName && savedPhone) {
      completeContact(action, savedName, savedPhone);
      return;
    }
    setPendingAction(action);
    setContactOpen(true);
  };

  const share = async () => {
    setShareMessage('');
    const shareData = {
      title: property.title,
      text: `${property.title}${location ? ` in ${location}` : ''} · ${price}`,
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareMessage('Share options opened.');
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setShareMessage('Link copied.');
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setShareMessage('Could not share automatically. Copy the link from your address bar.');
    }
  };

  const factItems = [
    property.bhk ? { icon: <BedDouble />, value: `${property.bhk} BHK`, label: 'Configuration' } : null,
    property.square_feet
      ? { icon: <Ruler />, value: Number(property.square_feet).toLocaleString('en-IN'), label: 'Square feet' }
      : null,
    { icon: <Home />, value: pretty(property.property_type), label: 'Property type' },
    location ? { icon: <MapPin />, value: property.area || property.city, label: property.city || 'Locality' } : null,
  ].filter(Boolean) as Array<{ icon: ReactNode; value: string; label: string }>;

  const presenter = property.agency_name || property.broker.agency_name || property.broker.name;
  const brokerTitle = property.broker.professional_title || 'Property advisor';
  const descriptionIsLong = property.description.length > 460;

  return (
    <div
      className={cn('min-h-screen bg-background pb-28 text-foreground selection:bg-primary/25 lg:pb-0', theme === 'DARK' && 'dark')}
      data-theme={theme.toLowerCase()}
      style={themeStyle}
    >
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-18 max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-primary text-sm font-bold text-primary-foreground">
              {property.brand_logo_url ? (
                <Image
                  alt={`${presenter} logo`}
                  className="object-contain p-1.5"
                  fill
                  sizes="44px"
                  src={property.brand_logo_url}
                  unoptimized
                />
              ) : initials(presenter)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{presenter}</p>
              <p className="truncate text-xs text-muted-foreground">Presented by your property advisor</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button aria-label="Share this property" className="sm:hidden" onClick={share} size="icon" type="button" variant="ghost">
              <Share2 aria-hidden="true" />
            </Button>
            <Button className="hidden sm:inline-flex" onClick={share} type="button" variant="outline">
              <Share2 data-icon="inline-start" />
              Share
            </Button>
          </div>
        </div>
        <p aria-live="polite" className="sr-only">{shareMessage}</p>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
        {inactive ? (
          <Alert className="mb-5" variant="destructive">
            <CircleAlert />
            <AlertTitle>This listing is no longer active</AlertTitle>
            <AlertDescription>Property details remain visible, but contact actions have been paused.</AlertDescription>
          </Alert>
        ) : null}

        <section className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,.75fr)] lg:gap-6">
          <Gallery images={property.images} onExpanded={() => logEvent('IMAGE_VIEW')} title={property.title} />

          <Card className="rounded-3xl lg:min-h-[590px]">
            <div aria-hidden="true" className="h-1.5 w-full" style={{ backgroundColor: palette.brand }} />
            <CardHeader className="gap-3 sm:px-6 sm:pt-6">
              <div className="flex flex-wrap gap-2">
                <Badge>{pretty(property.status)}</Badge>
                <Badge variant="secondary">{pretty(property.property_type)}</Badge>
                <Badge variant="outline">
                  <ShieldCheck data-icon="inline-start" />
                  Broker-listed
                </Badge>
              </div>
              <CardTitle className="text-3xl leading-tight font-bold tracking-[-0.035em] sm:text-4xl">
                {property.title}
              </CardTitle>
              {location ? (
                <CardDescription className="flex items-start gap-2 text-sm">
                  <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  {location}
                </CardDescription>
              ) : null}
            </CardHeader>
            <CardContent className="grid flex-1 gap-6 sm:px-6">
              <div>
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Broker-provided price</p>
                <p className="mt-2 text-4xl font-bold tracking-[-0.04em]">{price}</p>
              </div>

              <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-border bg-muted/40">
                {factItems.map((item) => (
                  <div className="min-h-28 border-r border-b border-border p-4 last:border-r-0" key={`${item.label}-${item.value}`}>
                    <span className="text-muted-foreground [&>svg]:size-5">{item.icon}</span>
                    <strong className="mt-3 block leading-snug">{item.value}</strong>
                    <span className="mt-1 block text-xs text-muted-foreground">{item.label}</span>
                  </div>
                ))}
              </div>

              <Alert>
                <ShieldCheck />
                <AlertTitle>Details provided by broker</AlertTitle>
                <AlertDescription>
                  Confirm availability, measurements, documents, and final terms directly with the broker.
                </AlertDescription>
              </Alert>
            </CardContent>
            <CardFooter className="grid gap-2 sm:grid-cols-2">
              <Button disabled={inactive || !canWhatsapp} onClick={() => requestContact('whatsapp')} size="lg" type="button">
                <MessageCircle data-icon="inline-start" />
                WhatsApp
              </Button>
              <Button disabled={inactive || !canCall} onClick={() => requestContact('call')} size="lg" type="button" variant="outline">
                <Phone data-icon="inline-start" />
                Call
              </Button>
            </CardFooter>
          </Card>
        </section>

        <section className="mt-6 grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
          <div className="grid gap-6">
            <Card className="rounded-3xl">
              <CardHeader>
                <CardDescription>The property</CardDescription>
                <CardTitle className="text-2xl font-bold">A clear presentation, without the photo clutter.</CardTitle>
              </CardHeader>
              <CardContent>
                {property.description ? (
                  <>
                    <p className={cn(
                      'whitespace-pre-line text-[15px] leading-7 text-muted-foreground',
                      descriptionIsLong && !descriptionExpanded && 'line-clamp-6',
                    )}>
                      {property.description}
                    </p>
                    {descriptionIsLong ? (
                      <Button className="mt-3" onClick={() => setDescriptionExpanded((value) => !value)} type="button" variant="link">
                        {descriptionExpanded ? 'Show less' : 'Read full description'}
                      </Button>
                    ) : null}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Ask the broker for a detailed property description.</p>
                )}
              </CardContent>
            </Card>

            {property.amenities.length ? (
              <Card className="rounded-3xl">
                <CardHeader>
                  <CardDescription>What is included</CardDescription>
                  <CardTitle className="text-2xl font-bold">Amenities and conveniences</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {property.amenities.map((amenity) => (
                      <li className="flex min-h-14 items-center gap-3 rounded-2xl border border-border bg-muted/35 px-3 py-3 text-sm font-medium" key={amenity}>
                        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
                          <Check aria-hidden="true" className="size-4" />
                        </span>
                        {AMENITY_LABELS[amenity] || pretty(amenity)}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : null}

            <Card className="rounded-3xl">
              <CardHeader>
                <CardDescription>Approximate location</CardDescription>
                <CardTitle className="text-2xl font-bold">{location || 'Location available from broker'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="public-location-grid grid min-h-56 place-items-center rounded-2xl border border-border bg-muted/45 p-6 text-center">
                  <div className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border">
                    <span className="mx-auto grid size-11 place-items-center rounded-full bg-primary text-primary-foreground">
                      <MapPin aria-hidden="true" className="size-5" />
                    </span>
                    <strong className="mt-3 block">{location || 'Contact broker for locality'}</strong>
                    <span className="mt-1 block text-xs text-muted-foreground">Exact location is shared privately</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="text-xs leading-5 text-muted-foreground">
                The public page intentionally shows only the area and city. Ask the broker for directions before a visit.
              </CardFooter>
            </Card>
          </div>

          <aside className="lg:sticky lg:top-24">
            <Card className="rounded-3xl">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <BrokerAvatar className="size-14" image={property.broker.avatar_url} name={property.broker.name} />
                  <div className="min-w-0">
                    <CardTitle className="truncate text-lg font-bold">{property.broker.name}</CardTitle>
                    <CardDescription className="truncate">{brokerTitle}</CardDescription>
                  </div>
                </div>
                <CardAction><Badge variant="outline">Broker-listed</Badge></CardAction>
              </CardHeader>
              <CardContent className="grid gap-5">
                <Separator />
                <div>
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Direct property contact</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Ask about current availability, documents, a video tour, or a site visit.
                  </p>
                </div>
                <div className="grid gap-2">
                  <Button disabled={inactive || !canWhatsapp} onClick={() => requestContact('whatsapp')} size="lg" type="button">
                    <MessageCircle data-icon="inline-start" />
                    Ask on WhatsApp
                  </Button>
                  <Button disabled={inactive || !canCall} onClick={() => requestContact('call')} size="lg" type="button" variant="outline">
                    <Phone data-icon="inline-start" />
                    Call broker
                  </Button>
                </div>
                <p className="flex gap-2 text-xs leading-5 text-muted-foreground">
                  <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent-foreground" />
                  Contact details entered here are sent only to this listing broker.
                </p>
              </CardContent>
              {property.broker.public_slug ? (
                <CardFooter>
                  <Link className={cn(buttonVariants({ variant: 'outline' }), 'w-full')} href={`/b/${property.broker.public_slug}`}>
                    View broker digital office
                  </Link>
                </CardFooter>
              ) : null}
            </Card>
            <div className="mt-4 text-center text-xs text-muted-foreground">
              Presented by <strong className="text-foreground">{presenter}</strong>
            </div>
          </aside>
        </section>
      </main>

      <footer className="mt-10 border-t border-border px-4 py-8 text-center text-xs text-muted-foreground">
        <p>Presented by <strong className="text-foreground">{presenter}</strong></p>
        <p className="mt-2">Powered by <span className="font-semibold text-foreground">PropertyOS</span></p>
      </footer>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] shadow-[0_-12px_36px_rgba(0,0,0,.12)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-2">
          <div className="min-w-0 flex-1">
            <span className="block text-xs text-muted-foreground">Broker price</span>
            <strong className="block truncate text-base">{price}</strong>
          </div>
          <Button aria-label="Call broker" disabled={inactive || !canCall} onClick={() => requestContact('call')} size="icon" type="button" variant="outline">
            <Phone aria-hidden="true" />
          </Button>
          <Button disabled={inactive || !canWhatsapp} onClick={() => requestContact('whatsapp')} type="button">
            <MessageCircle data-icon="inline-start" />
            WhatsApp
          </Button>
        </div>
      </div>

      <ContactDialog
        action={pendingAction}
        brokerName={property.broker.name}
        onContinue={(name, phone) => completeContact(pendingAction, name, phone)}
        onOpenChange={setContactOpen}
        open={contactOpen}
      />
    </div>
  );
}
