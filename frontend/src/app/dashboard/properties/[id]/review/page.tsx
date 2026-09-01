'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Clock3,
  ImageOff,
  MapPin,
  MessageCircleMore,
  Pencil,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Card,
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
  amenities: string[];
  images: PropertyImage[];
  intake_metadata?: {
    extraction_source?: 'AI' | 'RULES';
    missing_fields?: string[];
    suggested_fields?: string[];
    raw_details?: string;
    reviewed?: boolean;
  };
  created_at: string;
  updated_at: string;
}

const FIELD_LABELS: Record<string, string> = {
  title: 'Property title',
  description: 'Buyer-facing description',
  price: 'Price',
  area: 'Locality',
  city: 'City',
};

function formatPrice(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function ReviewSkeleton() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <Skeleton className="h-11 w-40" />
      <Skeleton className="h-32 w-full" />
      <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
        <Skeleton className="h-[520px] w-full" />
        <Skeleton className="h-[420px] w-full" />
      </div>
    </div>
  );
}

export default function WhatsAppDraftReviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const propertyQuery = useQuery<ImportedProperty>({
    queryKey: ['property', id],
    queryFn: () => fetchApi(`/properties/${id}/`),
    enabled: Boolean(id),
  });
  const publishMutation = useMutation({
    mutationFn: () => fetchApi<ImportedProperty>(`/properties/${id}/publish/`, { method: 'POST' }),
    onSuccess: (property) => {
      void queryClient.invalidateQueries({ queryKey: ['property', id] });
      void queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast.success('Listing published and ready to share');
      router.push(`/dashboard/properties/${property.id}`);
    },
    onError: (error: Error) => toast.error(error.message || 'Could not publish this draft'),
  });

  if (propertyQuery.isLoading) return <ReviewSkeleton />;

  if (propertyQuery.isError || !propertyQuery.data) {
    return (
      <div className="mx-auto max-w-3xl">
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>Draft could not be loaded</AlertTitle>
          <AlertDescription>
            {propertyQuery.error instanceof Error ? propertyQuery.error.message : 'Return to the import queue and try again.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const property = propertyQuery.data;
  const metadata = property.intake_metadata ?? {};
  const missing = metadata.missing_fields ?? [];
  const isDraft = property.status === 'DRAFT';
  const canPublish = isDraft && missing.length === 0;
  const cover = property.images?.[0]?.url;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 pb-10 os-fade-in">
      <Link
        href="/dashboard/properties/imports"
        className={buttonVariants({ variant: 'ghost', className: 'self-start' })}
      >
        <ArrowLeft data-icon="inline-start" />
        Import queue
      </Link>

      <header className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm md:flex-row md:items-center md:justify-between md:p-7">
        <div className="flex min-w-0 items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <MessageCircleMore className="size-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>Private WhatsApp draft</Badge>
              <Badge variant="outline">
                {metadata.extraction_source === 'AI' ? 'AI extracted' : 'Rules extracted'}
              </Badge>
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-[-0.035em] text-foreground md:text-3xl">
              Review before publishing
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Confirm that the broker-provided facts are correct. Buyers cannot access this property while it remains a draft.
            </p>
          </div>
        </div>
        <Link
          href={`/dashboard/properties/${property.id}/edit?source=whatsapp`}
          className={buttonVariants({ variant: 'outline' })}
        >
          <Pencil data-icon="inline-start" />
          Edit details
        </Link>
      </header>

      {missing.length > 0 && (
        <Alert>
          <CircleAlert />
          <AlertTitle>Complete {missing.length} required {missing.length === 1 ? 'field' : 'fields'}</AlertTitle>
          <AlertDescription>
            {missing.map((field) => FIELD_LABELS[field] ?? field).join(', ')} must be reviewed before this property can be published.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Buyer-facing preview data</CardTitle>
              <CardDescription>This is the information that will power the public property page.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-muted">
                {cover ? (
                  <Image
                    src={cover}
                    alt=""
                    fill
                    unoptimized
                    sizes="(max-width: 1024px) 100vw, 60vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="grid h-full place-items-center text-center text-muted-foreground">
                    <div>
                      <ImageOff className="mx-auto size-7" />
                      <p className="mt-2 text-sm font-medium">No photos received</p>
                    </div>
                  </div>
                )}
                <Badge className="absolute left-3 top-3">Not public</Badge>
              </div>

              <div>
                <p className="text-sm font-semibold text-primary">{property.property_type.toLowerCase().replace('_', ' ')}</p>
                <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-foreground">{property.title}</h2>
                <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="size-4" />
                  {[property.area, property.city].filter(Boolean).join(', ') || 'Location not captured'}
                </p>
                <p className="mt-4 text-2xl font-bold text-foreground">{formatPrice(Number(property.price))}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-muted p-4">
                  <p className="text-xs text-muted-foreground">Configuration</p>
                  <p className="mt-1 font-semibold text-foreground">{property.bhk ? `${property.bhk} BHK` : 'Not captured'}</p>
                </div>
                <div className="rounded-xl bg-muted p-4">
                  <p className="text-xs text-muted-foreground">Area</p>
                  <p className="mt-1 font-semibold text-foreground">
                    {property.square_feet ? `${Number(property.square_feet).toLocaleString('en-IN')} sq ft` : 'Not captured'}
                  </p>
                </div>
                <div className="rounded-xl bg-muted p-4">
                  <p className="text-xs text-muted-foreground">Photos</p>
                  <p className="mt-1 font-semibold text-foreground">{property.images.length}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Description</p>
                <p className="mt-2 whitespace-pre-line text-sm leading-7 text-foreground">{property.description}</p>
              </div>
            </CardContent>
          </Card>

          {metadata.raw_details && (
            <Card>
              <CardHeader>
                <CardTitle>Original WhatsApp details</CardTitle>
                <CardDescription>Use the broker’s source message to verify the extracted fields.</CardDescription>
              </CardHeader>
              <CardContent>
                <blockquote className="rounded-xl bg-muted p-4 text-sm leading-7 text-foreground">
                  {metadata.raw_details}
                </blockquote>
              </CardContent>
            </Card>
          )}
        </div>

        <aside aria-label="Review and publication controls" className="flex flex-col gap-5 lg:sticky lg:top-6 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Publication check</CardTitle>
              <CardDescription>PropertyOS will never publish this WhatsApp import silently.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {[
                { label: 'Required property facts', complete: missing.length === 0 },
                { label: 'Broker review', complete: Boolean(metadata.reviewed) },
                { label: 'Private until approval', complete: isDraft },
                { label: 'Public sharing page', complete: !isDraft },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 rounded-xl border border-border p-3">
                  {item.complete ? (
                    <CheckCircle2 className="size-5 shrink-0 text-primary" />
                  ) : (
                    <Clock3 className="size-5 shrink-0 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium text-foreground">{item.label}</span>
                </div>
              ))}
            </CardContent>
            <CardFooter className="flex-col items-stretch gap-3">
              <Button
                onClick={() => publishMutation.mutate()}
                disabled={!canPublish || publishMutation.isPending}
                size="lg"
              >
                <ShieldCheck data-icon="inline-start" />
                {publishMutation.isPending ? 'Publishing…' : 'Approve and publish'}
              </Button>
              {!canPublish && (
                <p className="text-center text-xs leading-5 text-muted-foreground">
                  Complete the missing required fields before publishing.
                </p>
              )}
            </CardFooter>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                After approval
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">
                PropertyOS activates the premium buyer page, prepares the WhatsApp sharing message and begins supported engagement tracking.
              </p>
            </CardContent>
            <CardFooter>
              <Link
                href={`/dashboard/properties/${property.id}/edit?source=whatsapp`}
                className={buttonVariants({ variant: 'ghost' })}
              >
                Correct extracted details
                <ArrowRight data-icon="inline-end" />
              </Link>
            </CardFooter>
          </Card>
        </aside>
      </div>
    </div>
  );
}
