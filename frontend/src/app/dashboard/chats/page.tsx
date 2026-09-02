'use client';

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Bot,
  FileImage,
  Info,
  MessageCircle,
  Phone,
  RefreshCw,
  Search,
  Smartphone,
} from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Bubble, BubbleContent } from '@/components/ui/bubble';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Message, MessageContent, MessageFooter } from '@/components/ui/message';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchApi } from '@/lib/api';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  direction: 'INBOUND' | 'OUTBOUND';
  message_type: string;
  body: string;
  media_url: string | null;
  timestamp: string;
}

interface ChatSession {
  phone_number: string;
  state: 'IDLE' | 'COLLECTING' | 'UPDATING' | 'QUERYING';
  metadata: Record<string, unknown>;
  temp_images: unknown[];
  updated_at: string;
  messages: ChatMessage[];
}

const stateLabels: Record<ChatSession['state'], string> = {
  IDLE: 'Ready',
  COLLECTING: 'Collecting details',
  UPDATING: 'Updating listing',
  QUERYING: 'Finding inventory',
};

const stateTone: Record<ChatSession['state'], string> = {
  IDLE: 'border-border bg-muted text-muted-foreground',
  COLLECTING: 'border-primary/20 bg-primary/9 text-primary',
  UPDATING: 'border-[color-mix(in_srgb,var(--ui-warning)_25%,transparent)] bg-[color-mix(in_srgb,var(--ui-warning)_9%,var(--ui-surface))] text-[var(--ui-warning)]',
  QUERYING: 'border-[color-mix(in_srgb,var(--ui-info)_25%,transparent)] bg-[color-mix(in_srgb,var(--ui-info)_9%,var(--ui-surface))] text-[var(--ui-info)]',
};

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return formatTime(value);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function phoneInitial(phone: string): string {
  return phone.replace(/\D/g, '').slice(-2) || 'WA';
}

function SessionBadge({ state }: { state: ChatSession['state'] }) {
  return <Badge variant="outline" className={cn('h-5 text-[9px]', stateTone[state])}>{stateLabels[state]}</Badge>;
}

export default function ChatsPage() {
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const sessionsQuery = useQuery<ChatSession[]>({
    queryKey: ['chatSessions'],
    queryFn: () => fetchApi('/whatsapp/sessions/'),
    refetchInterval: 5000,
  });

  const sessions = useMemo(() => sessionsQuery.data ?? [], [sessionsQuery.data]);
  const filteredSessions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return sessions;
    return sessions.filter((session) => {
      const lastMessage = session.messages.at(-1)?.body ?? '';
      return session.phone_number.toLowerCase().includes(query) || lastMessage.toLowerCase().includes(query);
    });
  }, [search, sessions]);
  const selectedSession = sessions.find((session) => session.phone_number === selectedPhone) ?? null;

  const refresh = async () => {
    const result = await sessionsQuery.refetch();
    if (result.isError) toast.error('Could not refresh conversations. Please retry.');
    else toast.success('Conversations updated');
  };

  const metadataCount = selectedSession ? Object.keys(selectedSession.metadata ?? {}).length : 0;
  const mediaCount = selectedSession
    ? selectedSession.messages.filter((message) => Boolean(message.media_url)).length + (selectedSession.temp_images?.length ?? 0)
    : 0;

  return (
    <div className="flex flex-col gap-5 os-fade-in">
      <header className="os-page-header flex-wrap">
        <div>
          <p className="os-kicker">WHATSAPP WORKSPACE</p>
          <h1 className="os-page-title mt-1">Conversations</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Recorded broker commands and messages from the connected integration.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void refresh()} disabled={sessionsQuery.isFetching}>
          <RefreshCw data-icon="inline-start" className={cn(sessionsQuery.isFetching && 'animate-spin')} />
          Refresh
        </Button>
      </header>

      <div className="flex items-start gap-2 rounded-xl border bg-card px-3.5 py-3 text-xs text-muted-foreground">
        <Info size={16} className="mt-0.5 shrink-0 text-primary" />
        <p>This is an activity record for your WhatsApp listing assistant. It is not a replacement for the WhatsApp inbox on your phone.</p>
      </div>

      <section className="grid min-h-[620px] overflow-hidden rounded-xl border bg-card lg:h-[calc(100dvh-17.5rem)] lg:min-h-[400px] lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)_220px]" aria-label="WhatsApp conversations">
        <aside className={cn('flex min-h-0 flex-col border-r', selectedSession && 'hidden lg:flex')} aria-label="Conversation list">
          <div className="border-b p-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xs font-bold text-foreground">Recent sessions</h2>
              <Badge variant="secondary">{sessions.length}</Badge>
            </div>
            <label className="relative mt-3 block">
              <span className="sr-only">Search conversations</span>
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} className="h-10 pl-9 pointer-coarse:min-h-11" placeholder="Phone or message" />
            </label>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-2">
            {sessionsQuery.isLoading && [0, 1, 2].map((value) => <Skeleton key={value} className="h-[72px] w-full rounded-lg" />)}
            {sessionsQuery.isError && (
              <div className="p-3 text-center">
                <p className="text-xs font-semibold text-destructive">Could not load conversations</p>
                <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void sessionsQuery.refetch()}>Retry</Button>
              </div>
            )}
            {!sessionsQuery.isLoading && !sessionsQuery.isError && filteredSessions.length === 0 && (
              <div className="grid flex-1 place-items-center px-5 py-12 text-center">
                <div>
                  <span className="mx-auto grid size-11 place-items-center rounded-xl bg-muted text-primary"><MessageCircle size={20} /></span>
                  <p className="mt-3 text-sm font-bold text-foreground">{sessions.length === 0 ? 'No sessions yet' : 'No matching session'}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{sessions.length === 0 ? 'Messages appear after a connected number contacts PropertyOS.' : 'Try a different phone number or message.'}</p>
                </div>
              </div>
            )}
            {filteredSessions.map((session) => {
              const isSelected = session.phone_number === selectedPhone;
              const lastMessage = session.messages.at(-1);
              return (
                <button
                  key={session.phone_number}
                  type="button"
                  onClick={() => setSelectedPhone(session.phone_number)}
                  className={cn(
                    'flex min-h-[72px] w-full items-start gap-2.5 rounded-lg border border-transparent px-2.5 py-2.5 text-left transition-colors',
                    isSelected ? 'border-border bg-muted' : 'hover:bg-muted/65',
                  )}
                >
                  <Avatar size="lg"><AvatarFallback className="bg-primary/10 text-[10px] font-bold text-primary">{phoneInitial(session.phone_number)}</AvatarFallback></Avatar>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <b className="truncate text-xs text-foreground">{session.phone_number}</b>
                      <small className="shrink-0 text-[9px] text-muted-foreground">{formatDate(session.updated_at)}</small>
                    </span>
                    <span className="mt-1 block truncate text-[11px] text-muted-foreground">{lastMessage?.body || 'No messages recorded'}</span>
                    <span className="mt-1.5 block"><SessionBadge state={session.state} /></span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <div className={cn('min-h-0 flex-col bg-muted/35', selectedSession ? 'flex' : 'hidden')}>
          {selectedSession ? (
            <>
              <div className="flex min-h-16 items-center justify-between gap-3 border-b bg-card px-3.5 py-2.5 sm:px-4">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => setSelectedPhone(null)} className="lg:hidden" aria-label="Back to conversations"><ArrowLeft /></Button>
                  <Avatar size="lg"><AvatarFallback className="bg-primary/10 text-[10px] font-bold text-primary">{phoneInitial(selectedSession.phone_number)}</AvatarFallback></Avatar>
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-bold text-foreground">{selectedSession.phone_number}</h2>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">Updated {formatDate(selectedSession.updated_at)}</p>
                  </div>
                </div>
                <SessionBadge state={selectedSession.state} />
              </div>

              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-4 sm:px-5" aria-label={`Messages with ${selectedSession.phone_number}`}>
                {selectedSession.messages.length === 0 ? (
                  <div className="grid flex-1 place-items-center text-center">
                    <div>
                      <span className="mx-auto grid size-12 place-items-center rounded-xl bg-card text-muted-foreground ring-1 ring-border"><MessageCircle size={22} /></span>
                      <p className="mt-3 text-sm font-bold text-foreground">No messages recorded</p>
                    </div>
                  </div>
                ) : selectedSession.messages.map((message) => {
                  const isInbound = message.direction === 'INBOUND';
                  return (
                    <Message key={message.id} align={isInbound ? 'start' : 'end'}>
                      <MessageContent className={cn('max-w-[86%] sm:max-w-[72%]', isInbound ? 'items-start' : 'items-end')}>
                        <Bubble align={isInbound ? 'start' : 'end'} variant={isInbound ? 'default' : 'tinted'}>
                          <BubbleContent>{message.body || (message.media_url ? 'Media attachment' : 'Empty message')}</BubbleContent>
                          {message.media_url && (
                            <a href={message.media_url} target="_blank" rel="noreferrer" className={cn('mt-2 flex min-h-11 items-center gap-2 rounded-lg border px-3 text-xs font-semibold', isInbound ? 'border-border bg-muted/60' : 'border-primary-foreground/20 bg-primary-foreground/10')}>
                              <FileImage size={15} />
                              Open attachment
                            </a>
                          )}
                        </Bubble>
                        <MessageFooter className="mt-1 gap-1 px-1 text-[9px] text-muted-foreground">
                          <span>{message.message_type.replaceAll('_', ' ').toLowerCase()}</span>
                          <span>·</span>
                          <span>{formatTime(message.timestamp)}</span>
                          <span>· {isInbound ? 'Received' : 'Recorded outbound'}</span>
                        </MessageFooter>
                      </MessageContent>
                    </Message>
                  );
                })}
              </div>

              <div className="border-t bg-card px-4 py-3">
                <p className="text-center text-[11px] text-muted-foreground">Reply from WhatsApp. Outbound sending is not enabled in this workspace.</p>
              </div>
            </>
          ) : null}
        </div>

        <aside className={cn('min-h-0 flex-col border-l bg-card', selectedSession ? 'hidden xl:flex' : 'hidden')} aria-label="Conversation context">
          {selectedSession && (
            <>
              <div className="border-b px-4 py-4">
                <p className="text-[10px] font-bold tracking-[0.08em] text-muted-foreground">SESSION CONTEXT</p>
              </div>
              <div className="flex flex-col gap-4 p-4">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-9 place-items-center rounded-lg bg-muted text-primary"><Phone size={16} /></span>
                  <div className="min-w-0"><p className="text-[10px] text-muted-foreground">Contact</p><p className="truncate text-xs font-bold text-foreground">{selectedSession.phone_number}</p></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Card size="sm" className="bg-muted/45"><div className="px-3"><p className="text-lg font-bold text-foreground">{selectedSession.messages.length}</p><p className="text-[10px] text-muted-foreground">Messages</p></div></Card>
                  <Card size="sm" className="bg-muted/45"><div className="px-3"><p className="text-lg font-bold text-foreground">{mediaCount}</p><p className="text-[10px] text-muted-foreground">Media</p></div></Card>
                  <Card size="sm" className="bg-muted/45"><div className="px-3"><p className="text-lg font-bold text-foreground">{metadataCount}</p><p className="text-[10px] text-muted-foreground">Fields</p></div></Card>
                  <Card size="sm" className="bg-muted/45"><div className="px-3"><p className="text-lg font-bold text-foreground">{selectedSession.temp_images?.length ?? 0}</p><p className="text-[10px] text-muted-foreground">Pending</p></div></Card>
                </div>

                <div className="rounded-xl border bg-muted/35 p-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground"><Bot size={15} />Assistant state</div>
                  <p className="mt-1.5 text-[11px] leading-5 text-muted-foreground">{stateLabels[selectedSession.state]}. State comes directly from the WhatsApp session record.</p>
                </div>

                <div>
                  <p className="text-[10px] font-bold tracking-[0.06em] text-muted-foreground">SUPPORTED COMMANDS</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {['create listing', 'listings', 'available', 'cancel'].map((command) => <code key={command} className="rounded-md border bg-muted px-2 py-1 text-[9px] font-semibold text-foreground">{command}</code>)}
                  </div>
                </div>
              </div>
            </>
          )}
        </aside>

        {!selectedSession && (
          <div className="hidden min-h-0 lg:grid xl:col-span-2 xl:grid-cols-[minmax(0,1fr)_220px]">
            <div className="grid place-items-center bg-muted/35 px-8 text-center">
              <div>
                <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-card text-primary ring-1 ring-border"><Smartphone size={24} /></span>
                <h2 className="mt-4 text-base font-bold text-foreground">Select a conversation</h2>
                <p className="mx-auto mt-1.5 max-w-sm text-sm leading-6 text-muted-foreground">Choose a phone number to review the recorded message history and listing-assistant state.</p>
              </div>
            </div>
            <div className="hidden border-l bg-card xl:block" />
          </div>
        )}
      </section>
    </div>
  );
}
