'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check, CircleAlert, LockKeyhole, MessageCircle, Save, Upload, X } from 'lucide-react';
import { useAppPreferences } from '@/components/AppPreferencesProvider';
import { PropertyPhoto } from '@/components/property/PropertyPhoto';
import ShareModal from '@/components/ShareModal';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { inventoryText, type InventoryMessageKey } from '@/i18n/inventory';
import { fetchApi } from '@/lib/api';
import { draftForm, draftPayload, validateDraft, type DraftErrors, type DraftForm, type DraftProperty } from '@/lib/draft-review';

const TYPES = ['APARTMENT', 'VILLA', 'PLOT', 'COMMERCIAL'] as const;
function subscribeToWidth(callback: () => void) {
  const query = window.matchMedia('(min-width: 1024px)');
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
}
function desktopWidth() { return window.matchMedia('(min-width: 1024px)').matches; }
function useCopy() {
  const { locale } = useAppPreferences();
  return (key: InventoryMessageKey) => inventoryText(locale, key);
}

function PhotoEditor({ property, disabled, onPendingChange }: { property: DraftProperty; disabled: boolean; onPendingChange: (value: boolean) => void }) {
  const c = useCopy();
  const client = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [feedback, setFeedback] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [busy, setBusy] = useState(false);
  const refresh = async () => {
    await client.invalidateQueries({ queryKey: ['property', String(property.id)] });
    void client.invalidateQueries({ queryKey: ['properties'] });
  };
  const clear = () => {
    setFile(null); onPendingChange(false);
    if (input.current) input.current.value = '';
  };
  const upload = async () => {
    if (!file || busy) return;
    setBusy(true); setFeedback('');
    try {
      const data = new FormData(); data.append('images', file);
      await fetchApi(`/properties/${property.id}/images/`, { method: 'POST', body: data });
      await refresh(); clear(); setInvalid(false); setFeedback(c('photoUploaded'));
    } catch { setInvalid(true); setFeedback(c('uploadRetry')); }
    finally { setBusy(false); }
  };
  const remove = async (imageId: string) => {
    if (!window.confirm(c('removePhotoConfirm'))) return;
    setBusy(true); onPendingChange(true);
    try {
      await fetchApi(`/properties/${property.id}/images/${imageId}/`, { method: 'DELETE' });
      await refresh(); setFeedback('');
    } catch (error) { setInvalid(true); setFeedback(error instanceof Error ? error.message : c('failed')); }
    finally { setBusy(false); onPendingChange(Boolean(file)); }
  };
  return <Card>
    <CardHeader><CardTitle><h2>{c('photos')} <span className="text-muted-foreground">· {property.images.length}</span></h2></CardTitle><CardDescription>{c('photoHint')}</CardDescription></CardHeader>
    <CardContent className="flex flex-col gap-4">
      {property.images.length === 0 ? <p className="rounded-xl bg-muted p-4 text-sm leading-6 text-muted-foreground">{c('noPhotosHint')}</p> : <div className="grid grid-cols-2 gap-3">
        {property.images.map((image, index) => <div key={image.id} className="overflow-hidden rounded-xl border">
          <PropertyPhoto src={image.thumbnail_url || image.url} alt={`${c('photos')} ${index + 1}`} fallback={c('imageFailed')} compact />
          <div className="flex flex-wrap items-center justify-between gap-1 p-1.5"><span className="px-1.5 text-xs text-muted-foreground">{index === 0 ? c('cover') : `${c('photos')} ${index + 1}`}</span><Button type="button" variant="ghost" size="icon" disabled={disabled || busy} aria-label={`${c('removePhoto')} ${index + 1}`} onClick={() => void remove(image.id)}><X /></Button></div>
        </div>)}
      </div>}
      <Field data-invalid={invalid}>
        <FieldLabel htmlFor="draft-photo">{c('choosePhoto')}</FieldLabel>
        <Input ref={input} id="draft-photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled || busy} aria-invalid={invalid} aria-describedby="photo-feedback" onChange={(event) => {
          const selected = event.target.files?.[0] ?? null;
          if (selected && (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type) || selected.size > 10 * 1024 * 1024)) { clear(); setInvalid(true); setFeedback(c('photoInvalid')); return; }
          setFile(selected); onPendingChange(Boolean(selected)); setInvalid(false); setFeedback('');
        }} />
        <p id="photo-feedback" role="status" className={invalid ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}>{feedback}</p>
      </Field>
    </CardContent>
    {file && <CardFooter className="flex-wrap gap-2"><Button type="button" disabled={disabled || busy} onClick={() => void upload()}><Upload data-icon="inline-start" />{busy ? c('uploading') : c('upload')}</Button><Button type="button" variant="ghost" size="icon" disabled={busy} aria-label={c('clearPhoto')} onClick={clear}><X /></Button></CardFooter>}
  </Card>;
}

function ReviewEditor({ property }: { property: DraftProperty }) {
  const c = useCopy();
  const client = useQueryClient();
  const [form, setForm] = useState(() => draftForm(property));
  const [saved, setSaved] = useState(() => draftForm(property));
  const [errors, setErrors] = useState<DraftErrors>({});
  const [saveNotice, setSaveNotice] = useState(false);
  const [confirmation, setConfirmation] = useState(false);
  const [photoPending, setPhotoPending] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const desktop = useSyncExternalStore(subscribeToWidth, desktopWidth, () => true);
  const [shareData, setShareData] = useState<{ url: string; whatsappText: string; propertyTitle: string } | null>(null);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState('');
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const isDraft = property.status === 'DRAFT';
  const hasMissing = Object.keys(validateDraft(form)).length > 0;
  useEffect(() => {
    if (!dirty && !photoPending) return;
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    const navigate = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (link instanceof HTMLAnchorElement && link.target !== '_blank' && !link.hash && !event.ctrlKey && !event.metaKey && !window.confirm(c('stayWarning'))) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener('beforeunload', unload); document.addEventListener('click', navigate, true);
    return () => { window.removeEventListener('beforeunload', unload); document.removeEventListener('click', navigate, true); };
  }, [dirty, photoPending, c]);
  const save = useMutation({
    mutationFn: () => fetchApi<DraftProperty>(`/properties/${property.id}/`, { method: 'PATCH', body: JSON.stringify(draftPayload(form)) }),
    onSuccess: (updated) => {
      client.setQueryData(['property', String(property.id)], updated); void client.invalidateQueries({ queryKey: ['properties'] });
      setForm(draftForm(updated)); setSaved(draftForm(updated)); setSaveNotice(true); setErrors({});
    },
  });
  const publish = useMutation({
    mutationFn: () => fetchApi<DraftProperty>(`/properties/${property.id}/publish/`, { method: 'POST' }),
    onSuccess: (updated) => { client.setQueryData(['property', String(property.id)], updated); void client.invalidateQueries({ queryKey: ['properties'] }); setConfirmation(false); },
  });
  const busy = save.isPending || publish.isPending;
  const error = save.error || publish.error;
  const metadata = property.intake_metadata ?? {};
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateDraft(form); setErrors(nextErrors);
    if (Object.keys(nextErrors).length) { document.getElementById(`draft-${Object.keys(nextErrors)[0]}`)?.focus(); return; }
    save.mutate();
  };
  const update = (key: keyof DraftForm, value: string) => {
    setForm((previous) => ({ ...previous, [key]: value })); setSaveNotice(false);
    setErrors((previous) => ({ ...previous, [key]: undefined })); save.reset();
  };
  const field = (key: keyof DraftForm, label: InventoryMessageKey, required = false, options: { numeric?: boolean; maxLength?: number; integer?: boolean } = {}) => <Field data-invalid={Boolean(errors[key])}>
    <FieldLabel htmlFor={`draft-${key}`}>{c(label)}{required ? ' *' : ''}</FieldLabel>
    <Input id={`draft-${key}`} value={form[key]} onChange={(event) => update(key, event.target.value)} required={required} maxLength={options.maxLength} inputMode={options.numeric ? options.integer ? 'numeric' : 'decimal' : undefined} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `error-${key}` : undefined} />
    {errors[key] && <FieldError id={`error-${key}`}>{c(errors[key]!)}</FieldError>}
  </Field>;
  const share = async () => {
    setSharing(true); setShareError('');
    try {
      const result = await fetchApi<{ full_share_url: string; whatsapp_share_text: string }>('/sharing/links/', { method: 'POST', body: JSON.stringify({ property: property.id }) });
      setShareData({ url: result.full_share_url, whatsappText: result.whatsapp_share_text, propertyTitle: property.title });
    } catch (error) { setShareError(error instanceof Error ? error.message : c('failed')); }
    finally { setSharing(false); }
  };
  if (!isDraft) return <div className="mx-auto flex max-w-2xl flex-col gap-6 py-8">
    {shareData && <ShareModal {...shareData} onClose={() => setShareData(null)} />}
    <Alert><Check /><AlertTitle>{property.status === 'AVAILABLE' ? c('published') : c('notDraft')}</AlertTitle><AlertDescription>{property.status === 'AVAILABLE' ? c('publishedHint') : c('notDraftHint')}</AlertDescription></Alert>
    <h1 className="text-2xl font-semibold tracking-tight">{property.title}</h1>
    {shareError && <p role="alert" className="text-sm text-destructive">{shareError}</p>}
    <div className="flex flex-wrap gap-3">
      {property.status === 'AVAILABLE' && <Button onClick={() => void share()} disabled={sharing}><MessageCircle data-icon="inline-start" />{sharing ? c('preparing') : c('share')}</Button>}
      <Link href={`/dashboard/properties/${property.id}`} className={buttonVariants({ variant: 'outline' })}>{c('open')}<ArrowRight data-icon="inline-end" /></Link>
      <Link href="/dashboard/properties" className={buttonVariants({ variant: 'ghost' })}>{c('back')}</Link>
    </div>
  </div>;
  return <div className="flex flex-col gap-6" data-ui-reference="inventory-review-v3">
    <header className="flex flex-col gap-3">
      <Link href="/dashboard/properties" className={buttonVariants({ variant: 'ghost', className: 'self-start' })}><ArrowLeft data-icon="inline-start" />{c('back')}</Link>
      <div className="flex flex-wrap items-center gap-3"><Badge variant="secondary"><LockKeyhole data-icon="inline-start" />{c('private')}</Badge><span className="text-sm text-muted-foreground">{property.source === 'WHATSAPP' ? 'WhatsApp → PropertyOS' : c('manualSource')}</span></div>
      <h1 className="text-3xl font-semibold tracking-[-0.035em] text-foreground sm:text-4xl">{c('reviewTitle')}</h1>
      <p className="hidden text-sm leading-6 text-muted-foreground lg:block">{c('reviewIntro')}</p>
      <p className="text-sm leading-6 text-muted-foreground lg:hidden">{c('reviewMobileIntro')}</p>
      <p className="flex items-start gap-2 text-sm leading-6 text-muted-foreground"><LockKeyhole className="mt-1 size-4 shrink-0" />{c(property.source === 'WHATSAPP' ? 'privateHint' : 'privateGeneral')}</p>
    </header>
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(260px,.8fr)_minmax(0,1.4fr)]">
      <details open={desktop || sourceOpen} onToggle={(event) => { if (!desktop) setSourceOpen(event.currentTarget.open); }} className="min-w-0">
        <summary className="min-h-12 cursor-pointer rounded-xl border bg-card px-4 py-3 text-sm font-semibold lg:hidden">{c(property.source === 'WHATSAPP' ? 'sourceTitle' : 'manualSource')} · {c('photos')} ({property.images.length})</summary>
        <aside className="mt-4 flex min-w-0 flex-col gap-5 lg:mt-0">
        <Card>
          <CardHeader><CardTitle><h2 className="flex items-center gap-2"><MessageCircle className="size-5 text-primary" />{c(property.source === 'WHATSAPP' ? 'sourceTitle' : 'manualSource')}</h2></CardTitle><CardDescription>{c('sourceHint')}</CardDescription></CardHeader>
          <CardContent><blockquote className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-muted p-4 text-sm leading-7 text-foreground">{metadata.raw_details || c('noSource')}</blockquote></CardContent>
          <CardFooter><p className="text-xs leading-5 text-muted-foreground">{c(metadata.extraction_source === 'AI' ? 'ai' : metadata.extraction_source === 'RULES' ? 'rules' : 'unknownExtraction')}</p></CardFooter>
        </Card>
        <PhotoEditor property={property} disabled={busy} onPendingChange={setPhotoPending} />
        </aside>
      </details>
      <form onSubmit={submit} noValidate className="min-w-0">
        <Card>
          <CardHeader><CardTitle><h2>{c('detailsTitle')}</h2></CardTitle><CardDescription>{c('detailsHint')}</CardDescription></CardHeader>
          <CardContent className="flex flex-col gap-5">
            {error && <Alert variant="destructive"><CircleAlert /><AlertTitle>{c('failed')}</AlertTitle><AlertDescription>{error.message}</AlertDescription></Alert>}
            {saveNotice && <p role="status" className="flex items-center gap-2 text-sm text-primary"><Check className="size-4" />{c('saved')}</p>}
            {Object.values(errors).some(Boolean) && <Alert variant="destructive"><CircleAlert /><AlertTitle>{c('missing')}</AlertTitle><AlertDescription>{c('requiredError')}</AlertDescription></Alert>}
            <fieldset disabled={busy} className="min-w-0">
              <FieldGroup>
                {field('title', 'title', true, { maxLength: 255 })}
                <FieldGroup className="grid gap-5 sm:grid-cols-2">
                  {field('price', 'price', true, { numeric: true })}
                  <Field><FieldLabel htmlFor="draft-property_type">{c('propertyType')}</FieldLabel><NativeSelect id="draft-property_type" value={form.property_type} onChange={(event) => update('property_type', event.target.value)}>{TYPES.map((value) => <NativeSelectOption key={value} value={value}>{c(value)}</NativeSelectOption>)}</NativeSelect></Field>
                  {field('area', 'area', true, { maxLength: 100 })}
                  {field('city', 'city', true, { maxLength: 100 })}
                  {field('bhk', 'bhk', false, { numeric: true, integer: true })}
                  {field('square_feet', 'square_feet', false, { numeric: true })}
                </FieldGroup>
                <FieldDescription>{c('optionalHint')}</FieldDescription>
                <Field data-invalid={Boolean(errors.description)}>
                  <FieldLabel htmlFor="draft-description">{c('description')} *</FieldLabel>
                  <Textarea id="draft-description" value={form.description} required onChange={(event) => update('description', event.target.value)} aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? 'error-description' : undefined} />
                  {errors.description && <FieldError id="error-description">{c(errors.description)}</FieldError>}
                </Field>
              </FieldGroup>
            </fieldset>
          </CardContent>
          <CardFooter className="flex-col items-stretch gap-4">
            <div className="flex items-start gap-2 text-sm leading-6 text-muted-foreground"><LockKeyhole className="mt-1 size-4 shrink-0" /><p role="status">{dirty ? c('saveFirst') : photoPending ? c('photoPending') : hasMissing ? c('missing') : c('readyHint')}</p></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button type="submit" variant="outline" disabled={busy}><Save data-icon="inline-start" />{save.isPending ? c('saving') : c('save')}</Button>
              <Button type="button" disabled={busy || dirty || photoPending || hasMissing} onClick={() => { publish.reset(); setConfirmation(true); }}>{c('approve')}<ArrowRight data-icon="inline-end" /></Button>
            </div>
          </CardFooter>
        </Card>
      </form>
    </div>
    <Dialog open={confirmation} onOpenChange={(open) => { if (!publish.isPending) setConfirmation(open); }}>
      <DialogContent showCloseButton={false}>
        <DialogHeader><DialogTitle>{c('publishTitle')}</DialogTitle><DialogDescription>{c('publishHint')}</DialogDescription></DialogHeader>
        <div className="flex flex-col gap-2 rounded-xl bg-muted p-4"><p className="font-semibold">{property.title}</p><p className="text-sm text-muted-foreground">{property.area}, {property.city}</p><p className="text-xl font-semibold">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(property.price))}</p><p className="text-sm text-muted-foreground">{property.images.length} {c('photos')}</p></div>
        {publish.error && <p role="alert" className="text-sm text-destructive">{publish.error.message}</p>}
        <DialogFooter><Button type="button" variant="outline" disabled={publish.isPending} onClick={() => setConfirmation(false)}>{c('cancel')}</Button><Button type="button" disabled={publish.isPending} onClick={() => publish.mutate()}>{publish.isPending ? c('publishing') : c('publish')}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}

export default function WhatsAppDraftReviewPage() {
  const { id } = useParams<{ id: string }>();
  const c = useCopy();
  const query = useQuery<DraftProperty>({ queryKey: ['property', id], queryFn: () => fetchApi(`/properties/${id}/`), enabled: Boolean(id), refetchOnWindowFocus: false });
  if (query.isLoading) return <div className="flex flex-col gap-6" aria-label={c('loading')}><Skeleton className="h-24 w-full" /><div className="grid gap-6 lg:grid-cols-2"><Skeleton className="h-80 w-full" /><Skeleton className="h-[550px] w-full" /></div></div>;
  if (query.isError || !query.data) return <div className="flex flex-col gap-4"><Alert variant="destructive"><CircleAlert /><AlertTitle>{c('draftLoadFailed')}</AlertTitle><AlertDescription>{query.error?.message}</AlertDescription></Alert><Button onClick={() => void query.refetch()} className="self-start">{c('retry')}</Button></div>;
  return <ReviewEditor key={String(id)} property={query.data} />;
}
