'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Clock3,
  ImageIcon,
  Inbox,
  MessageCircleMore,
  Mic2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { Skeleton } from '@/components/ui/skeleton';
import { fetchApi } from '@/lib/api';

interface PropertyImage {
  id: string;
  url: string;
  thumbnail_url: string;
}

interface IntakeMetadata {
  extraction_source?: 'AI' | 'RULES';
  missing_fields?: string[];
  suggested_fields?: string[];
  photo_count?: number;
  raw_details?: string;
  reviewed?: boolean;
}

interface ImportedProperty {
  id: string;
  title: string;
  description: string;
  price: number;
  property_type: string;
  status: string;
  source: 'MANUAL' | 'WHATSAPP';
  area: string;
  city: string;
  bhk: number | null;
  square_feet: number | null;
  images: PropertyImage[];
  intake_metadata: IntakeMetadata;
  created_at: string;
  updated_at: string;
}

interface WhatsAppSession {
  phone_number: string;
  state: 'IDLE' | 'COLLECTING' | 'UPDATING' | 'QUERYING';
  metadata: Record<string, unknown>;
  temp_images: unknown[];
  updated_at: string;
}

interface WhatsAppConnection {
  provider: 'META' | 'TWILIO' | 'MOCK';
  configured: boolean;
  intake_number: string;
  broker_phone: string;
  supported_inputs: string[];
}

const FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  description: 'Description',
  area: 'Locality',
  city: 'City',
  bhk: 'Configuration',
  square_feet: 'Area',
  photos: 'Photos',
};

function formatPrice(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatRelativeDate(value: string): string {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.floor(diff / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function LoadingQueue() {
  return (
    <div className="grid gap-4 xl:grid-cols-2" aria-label="Loading WhatsApp imports">
      {[0, 1].map((item) => (
        <Card key={item}>
          <CardHeader>
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-7 w-3/4" />
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function WhatsAppImportsPage() {
  const propertiesQuery = useQuery<ImportedProperty[]>({
    queryKey: ['properties'],
    queryFn: () => fetchApi('/properties/'),
  });
  const sessionsQuery = useQuery<WhatsAppSession[]>({
    queryKey: ['chatSessions'],
    queryFn: () => fetchApi('/whatsapp/sessions/'),
    refetchInterval: 10_000,
  });
  const connectionQuery = useQuery<WhatsAppConnection>({
    queryKey: ['whatsappConnection'],
    queryFn: () => fetchApi('/whatsapp/connection/'),
  });

  const importedDrafts = useMemo(
    () => (propertiesQuery.data ?? []).filter(
      (property) => property.source === 'WHATSAPP' && property.status === 'DRAFT',
    ),
    [propertiesQuery.data],
  );
  const activeSessions = (sessionsQuery.data ?? []).filter((session) => session.state !== 'IDLE');
  const readyDrafts = importedDrafts.filter(
    (property) => (property.intake_metadata?.missing_fields?.length ?? 0) === 0,
  ).length;
  const intakeNumber = connectionQuery.data?.intake_number?.replace(/\D/g, '') ?? '';
  const whatsappStartUrl = intakeNumber
    ? `https://wa.me/${intakeNumber}?text=${encodeURIComponent('create listing')}`
    : '';

  const copyCommand = async () => {
    try {
      await navigator.clipboard.writeText('create listing');
      toast.success('“create listing” copied');
    } catch {
      toast.error('Could not copy the command');
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-8 os-fade-in">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <MessageCircleMore className="size-4" />
            Inventory intake
          </div>
          <h1 className="text-3xl font-bold tracking-[-0.04em] text-foreground md:text-4xl">
            WhatsApp Imports
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
            Forward the photos and property message you already receive. PropertyOS converts them into a private draft for you to verify before anything becomes public.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            void propertiesQuery.refetch();
            void sessionsQuery.refetch();
            toast.success('Import queue refreshed');
          }}
        >
          <RefreshCw data-icon="inline-start" />
          Refresh
        </Button>
      </header>

      <Card className="whatsapp-intake-hero overflow-hidden">
        <CardHeader className="relative gap-3 md:max-w-[62%]">
          <Badge variant="secondary">Broker-controlled publishing</Badge>
          <CardTitle className="text-2xl tracking-[-0.035em] md:text-3xl">
            Forward it. Review it. Publish it.
          </CardTitle>
          <CardDescription className="max-w-xl text-base leading-7">
            PropertyOS extracts only what it can identify, marks missing details, and keeps every import private until you approve it.
          </CardDescription>
        </CardHeader>
        <CardContent className="relative grid gap-3 md:grid-cols-3">
          {[
            { icon: ImageIcon, label: '1. Forward', detail: 'Photos plus copied text' },
            { icon: Sparkles, label: '2. Review', detail: 'Check extracted information' },
            { icon: ShieldCheck, label: '3. Publish', detail: 'Approve the buyer-facing page' },
          ].map(({ icon: Icon, label, detail }) => (
            <div key={label} className="flex min-h-24 items-center gap-3 rounded-xl border border-border bg-background/75 p-4 backdrop-blur-sm">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                <Icon className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-foreground">{label}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
              </div>
            </div>
          ))}
        </CardContent>
        <CardFooter className="relative flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          {whatsappStartUrl ? (
            <a href={whatsappStartUrl} target="_blank" rel="noreferrer" className={buttonVariants()}>
              <MessageCircleMore data-icon="inline-start" />
              Start in WhatsApp
            </a>
          ) : (
            <Button onClick={() => void copyCommand()}>
              <MessageCircleMore data-icon="inline-start" />
              Copy test command
            </Button>
          )}
          <p className="text-xs leading-5 text-muted-foreground">
            Send from the mobile number registered in your PropertyOS profile.
          </p>
        </CardFooter>
      </Card>

      {!connectionQuery.isLoading && !connectionQuery.data?.configured && (
        <Alert>
          <CircleAlert />
          <AlertTitle>Real WhatsApp connection is not configured yet</AlertTitle>
          <AlertDescription>
            This workspace is using the local simulator. Draft creation can be tested safely without pretending that a live business number is connected.
          </AlertDescription>
        </Alert>
      )}

      <section className="grid gap-3 sm:grid-cols-3" aria-label="WhatsApp intake status">
        <Card size="sm">
          <CardHeader>
            <CardDescription>Needs review</CardDescription>
            <CardTitle className="text-2xl">{importedDrafts.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Ready to publish</CardDescription>
            <CardTitle className="text-2xl">{readyDrafts}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Active intakes</CardDescription>
            <CardTitle className="text-2xl">{activeSessions.length}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="review-queue-title">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="review-queue-title" className="text-xl font-bold tracking-[-0.025em] text-foreground">
              Review queue
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Private WhatsApp drafts remain invisible to buyers until publication.
            </p>
          </div>
          <Badge variant="outline">Newest first</Badge>
        </div>

        {propertiesQuery.isLoading && <LoadingQueue />}

        {propertiesQuery.isError && (
          <Alert variant="destructive">
            <CircleAlert />
            <AlertTitle>WhatsApp drafts could not be loaded</AlertTitle>
            <AlertDescription>
              {propertiesQuery.error instanceof Error ? propertiesQuery.error.message : 'Try refreshing the queue.'}
            </AlertDescription>
          </Alert>
        )}

        {!propertiesQuery.isLoading && !propertiesQuery.isError && importedDrafts.length === 0 && (
          <Card>
            <CardHeader className="items-center text-center">
              <span className="grid size-14 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
                <Inbox className="size-6" />
              </span>
              <CardTitle className="mt-2 text-xl">Your next forwarded property will appear here</CardTitle>
              <CardDescription className="max-w-lg leading-6">
                Send “create listing,” add photos, then describe the property. PropertyOS will save a private draft instead of publishing automatically.
              </CardDescription>
            </CardHeader>
            <CardFooter className="justify-center">
              <Button variant="outline" onClick={() => void copyCommand()}>
                Copy “create listing”
              </Button>
            </CardFooter>
          </Card>
        )}

        {importedDrafts.length > 0 && (
          <div className="grid gap-4 xl:grid-cols-2">
            {importedDrafts.map((property) => {
              const cover = property.images?.[0]?.thumbnail_url || property.images?.[0]?.url;
              const missing = property.intake_metadata?.missing_fields ?? [];
              const suggested = property.intake_metadata?.suggested_fields ?? [];
              const isReady = missing.length === 0;
              return (
                <Card key={property.id}>
                  <CardHeader>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{isReady ? 'Ready for review' : 'Needs details'}</Badge>
                      <Badge variant="outline">
                        {property.intake_metadata?.extraction_source === 'AI' ? 'AI extracted' : 'Rules extracted'}
                      </Badge>
                    </div>
                    <CardTitle className="mt-2 text-xl">{property.title}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Clock3 className="size-4" />
                      Imported {formatRelativeDate(property.created_at)}
                    </CardDescription>
                    <CardAction>
                      <span className="grid size-11 place-items-center overflow-hidden rounded-xl bg-secondary">
                        {cover ? (
                          <Image src={cover} alt="" width={44} height={44} unoptimized className="size-11 object-cover" />
                        ) : (
                          <ImageIcon className="size-5 text-muted-foreground" />
                        )}
                      </span>
                    </CardAction>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted p-4 sm:grid-cols-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Price</p>
                        <p className="mt-1 font-semibold text-foreground">{formatPrice(Number(property.price))}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Location</p>
                        <p className="mt-1 truncate font-semibold text-foreground">
                          {[property.area, property.city].filter(Boolean).join(', ') || 'Not captured'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Photos</p>
                        <p className="mt-1 font-semibold text-foreground">{property.images.length}</p>
                      </div>
                    </div>

                    {(missing.length > 0 || suggested.length > 0) && (
                      <div className="flex flex-col gap-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          Complete before sharing
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {[...missing, ...suggested].map((field) => (
                            <Badge key={field} variant={missing.includes(field) ? 'destructive' : 'secondary'}>
                              {FIELD_LABELS[field] ?? field}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {isReady && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="size-4 text-primary" />
                        Required information was captured. Verify it before publishing.
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-muted-foreground">
                      Private draft · not visible to buyers
                    </p>
                    <Link
                      href={`/dashboard/properties/${property.id}/review`}
                      className={buttonVariants()}
                    >
                      Review draft
                      <ArrowRight data-icon="inline-end" />
                    </Link>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>What PropertyOS accepts</CardTitle>
            <CardDescription>Use the quickest input available while you are in the field.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: ImageIcon, title: 'Property photos', description: 'Send several images before the details.' },
              { icon: MessageCircleMore, title: 'Copied messages', description: 'Forward the text received from an owner or partner.' },
              { icon: Mic2, title: 'Voice notes', description: 'English, Hindi or Marathi when transcription is configured.' },
            ].map(({ icon: Icon, title, description }) => (
              <div key={title} className="rounded-xl border border-border p-4">
                <Icon className="size-5 text-primary" />
                <p className="mt-3 font-semibold text-foreground">{title}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Live intake activity</CardTitle>
            <CardDescription>Sessions currently collecting or updating information.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {sessionsQuery.isLoading && [0, 1].map((item) => <Skeleton key={item} className="h-14 w-full" />)}
            {!sessionsQuery.isLoading && activeSessions.length === 0 && (
              <p className="rounded-xl bg-muted p-4 text-sm leading-6 text-muted-foreground">
                No active intake right now. Completed conversations remain available in Conversations.
              </p>
            )}
            {activeSessions.slice(0, 3).map((session) => (
              <div key={session.phone_number} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">{session.phone_number}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{session.temp_images.length} photos received</p>
                </div>
                <Badge variant="secondary">{session.state.toLowerCase()}</Badge>
              </div>
            ))}
          </CardContent>
          <CardFooter>
            <Link href="/dashboard/chats" className={buttonVariants({ variant: 'ghost' })}>
              Open conversations
              <ArrowRight data-icon="inline-end" />
            </Link>
          </CardFooter>
        </Card>
      </section>
    </div>
  );
}
