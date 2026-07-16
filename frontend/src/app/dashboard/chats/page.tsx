'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';

// ─── Types ──────────────────────────────────────────────────────
interface Message {
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
  metadata: Record<string, any>;
  temp_images: any[];
  updated_at: string;
  messages: Message[];
}

export default function ChatsPage() {
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);

  // Fetch all chat sessions with auto-polling every 5 seconds for live feel
  const { data: sessions, isLoading, refetch } = useQuery<ChatSession[]>({
    queryKey: ['chatSessions'],
    queryFn: () => fetchApi('/whatsapp/sessions/'),
    refetchInterval: 5000,
  });

  const selectedSession = sessions?.find(s => s.phone_number === selectedPhone);

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const getStateBadge = (state: ChatSession['state']) => {
    const styles = {
      IDLE: 'bg-[#4a5470]/20 text-[#8892aa] border-[#4a5470]/30',
      COLLECTING: 'bg-[#16c784]/10 text-[#16c784] border-[#16c784]/20',
      UPDATING: 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20',
      QUERYING: 'bg-[#38bdf8]/10 text-[#38bdf8] border-[#38bdf8]/20',
    };
    
    const labels = {
      IDLE: 'Idle',
      COLLECTING: 'Collecting',
      UPDATING: 'Updating',
      QUERYING: 'Querying',
    };

    return (
      <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide rounded-md border ${styles[state]}`}>
        {labels[state]}
      </span>
    );
  };

  return (
    <div className="space-y-6 os-fade-in pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">WhatsApp Conversation Logs</h1>
          <p className="text-slate-400 text-sm mt-1">Monitor real-time WhatsApp bot chats and broker commands.</p>
        </div>
        <button
          onClick={() => {
            refetch();
            toast.success('Conversations updated');
          }}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all cursor-pointer"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-220px)] min-h-[500px]">
        
        {/* LEFT PANEL: Sessions List */}
        <div className="glass rounded-2xl border border-slate-800/60 flex flex-col overflow-hidden h-full">
          <div className="p-4 border-b border-slate-800/60 bg-slate-950/20 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Active Chat Sessions</h3>
            {sessions && (
              <span className="text-[10px] bg-slate-900 text-slate-400 font-semibold px-2 py-0.5 rounded-full">
                {sessions.length} threads
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
            {isLoading ? (
              <div className="space-y-2 p-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="os-skeleton h-16 rounded-xl" />
                ))}
              </div>
            ) : !sessions || sessions.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-500">
                No active WhatsApp sessions found.
              </div>
            ) : (
              sessions.map(session => {
                const isSelected = session.phone_number === selectedPhone;
                const lastMsg = session.messages[session.messages.length - 1];
                
                return (
                  <button
                    key={session.phone_number}
                    onClick={() => setSelectedPhone(session.phone_number)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 relative ${
                      isSelected
                        ? 'border-emerald-500/50 bg-emerald-950/10'
                        : 'border-slate-900 bg-slate-950/20 hover:border-slate-800 hover:bg-slate-950/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white tracking-wide">
                        📱 {session.phone_number}
                      </span>
                      <span className="text-[9px] text-slate-500">
                        {session.updated_at ? formatDate(session.updated_at) : ''}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] text-slate-400 truncate flex-1 leading-relaxed">
                        {lastMsg ? lastMsg.body : 'No messages yet.'}
                      </p>
                      {getStateBadge(session.state)}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Chat History & Conversation Details */}
        <div className="lg:col-span-2 flex flex-col h-full gap-4">
          
          {/* Chat Window */}
          <div className="flex-1 glass rounded-2xl border border-slate-800/60 flex flex-col overflow-hidden h-full">
            {selectedSession ? (
              <>
                {/* Active Session Header */}
                <div className="p-4 border-b border-slate-800/60 bg-slate-950/20 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">💬</span>
                    <div>
                      <h3 className="text-xs font-bold text-white tracking-wide">{selectedSession.phone_number}</h3>
                      <p className="text-[10px] text-slate-500 mt-0.5">Active Session</p>
                    </div>
                  </div>
                  {getStateBadge(selectedSession.state)}
                </div>

                {/* Messages Timeline */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/10 custom-scrollbar">
                  {selectedSession.messages && selectedSession.messages.length > 0 ? (
                    selectedSession.messages.map((msg) => {
                      const isInbound = msg.direction === 'INBOUND';
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col max-w-[75%] ${isInbound ? 'mr-auto items-start' : 'ml-auto items-end'}`}
                        >
                          <div
                            className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                              isInbound
                                ? 'bg-slate-900 text-slate-200 rounded-tl-sm border border-slate-800/50'
                                : 'bg-[#16c784] text-[#07090f] font-medium rounded-tr-sm'
                            }`}
                          >
                            {msg.body}
                          </div>
                          <span className="text-[9px] text-slate-500 mt-1 px-1">
                            {formatTime(msg.timestamp)}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-500">
                      No messages recorded in this thread.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 rounded-2xl bg-slate-950/40 border border-slate-850 flex items-center justify-center text-2xl mb-4">
                  💬
                </div>
                <h4 className="text-sm font-bold text-white mb-1">Select a Conversation</h4>
                <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                  Choose a phone number from the list to review their full bot conversation history and command execution timeline.
                </p>
              </div>
            )}
          </div>

          {/* Quick Cheatsheet helper */}
          <div className="glass p-4 rounded-xl border border-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h5 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">Available Bot Commands</h5>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Test the bot by sending commands via your connected WhatsApp number.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {['create listing', 'listings', 'available', 'mark [title] as sold', 'cancel'].map(cmd => (
                <code key={cmd} className="text-[9px] font-mono bg-slate-950 border border-slate-900 px-2 py-0.5 rounded text-emerald-400 font-semibold">
                  {cmd}
                </code>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
