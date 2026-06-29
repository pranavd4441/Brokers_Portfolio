'use client';

import React, { useEffect, useRef, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';

interface AIAssistantModalProps {
  propertyType: string;
  price: string;
  bhk: string;
  area: string;
  city: string;
  onApplyTitle: (title: string) => void;
  onApplyDescription: (description: string) => void;
  onClose: () => void;
}

interface WhatsAppPitch {
  type: string;
  text: string;
}

interface AIData {
  title: string;
  description: string;
  headlines: string[];
  whatsapp_pitches: WhatsAppPitch[];
}

export default function AIAssistantModal({
  propertyType,
  price,
  bhk,
  area,
  city,
  onApplyTitle,
  onApplyDescription,
  onClose,
}: AIAssistantModalProps) {
  const [rawNotes, setRawNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiData, setAIData] = useState<AIData | null>(null);
  const [activePitchTab, setActivePitchTab] = useState(0);
  const [copiedPitchIndex, setCopiedPitchIndex] = useState<number | null>(null);

  // Trap scroll / escape keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawNotes.trim()) {
      toast.error('Please enter some raw notes first!');
      return;
    }

    setLoading(true);
    setAIData(null);

    try {
      const data = await fetchApi('/properties/generate-ai/', {
        method: 'POST',
        body: JSON.stringify({
          raw_notes: rawNotes.trim(),
          property_type: propertyType,
          price: price ? parseFloat(price.replace(/,/g, '')) : null,
          bhk: bhk ? parseInt(bhk) : null,
          area: area || null,
          city: city || null,
        }),
      });

      setAIData(data);
      toast.success('AI suggestions generated!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate suggestions');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPitchIndex(index);
      toast.success('Pitch copied to clipboard!');
      setTimeout(() => setCopiedPitchIndex(null), 2000);
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md px-4 py-6"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="AI Assistant"
    >
      <div className="w-full max-w-3xl max-h-[85vh] flex flex-col os-frosted rounded-3xl border border-[rgba(255,255,255,0.08)] shadow-2xl overflow-hidden os-slide-up">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.06)] bg-[#07090f]/30">
          <div className="flex items-center gap-2">
            <span className="text-xl">✨</span>
            <div>
              <h2 className="text-base font-bold text-[#f0f4ff] tracking-tight">AI Copywriting Assistant</h2>
              <p className="text-[10px] text-[#8892aa] mt-0.5">Generate high-performing listings & WhatsApp pitches instantly</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#8892aa] hover:text-[#f0f4ff] hover:bg-[rgba(255,255,255,0.08)] transition-all cursor-pointer"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Notes Input Form */}
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label htmlFor="rawNotes" className="os-input-label block mb-2">
                Raw Property Details / Notes
              </label>
              <textarea
                id="rawNotes"
                placeholder="Type quick bullet points (e.g. '3 bhk in high floor, ready possession, fully furnished, close to metro station, price negotiable')"
                value={rawNotes}
                onChange={(e) => setRawNotes(e.target.value)}
                className="os-input min-h-[90px] resize-y leading-relaxed text-xs"
                disabled={loading}
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading || !rawNotes.trim()}
                className="os-btn-primary h-9 px-6 text-xs font-bold shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <span className="inline-block w-3.5 h-3.5 border-2 border-[#07090f]/30 border-t-[#07090f] rounded-full animate-spin mr-2" />
                    Generating with Gemini…
                  </>
                ) : (
                  '✨ Generate Suggestions'
                )}
              </button>
            </div>
          </form>

          {/* Skeletons on loading */}
          {loading && (
            <div className="space-y-4 pt-4 border-t border-[rgba(255,255,255,0.06)]">
              <div className="os-skeleton h-12 rounded-xl" />
              <div className="os-skeleton h-28 rounded-xl" />
              <div className="grid grid-cols-2 gap-4">
                <div className="os-skeleton h-24 rounded-xl" />
                <div className="os-skeleton h-24 rounded-xl" />
              </div>
            </div>
          )}

          {/* Results Area */}
          {aiData && (
            <div className="space-y-6 pt-6 border-t border-[rgba(255,255,255,0.06)] os-fade-in">
              {/* Generated Title */}
              <div className="os-frosted-dark p-4 rounded-2xl border border-[rgba(255,255,255,0.04)] space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[10px] font-bold text-[#16c784] uppercase tracking-wider">Suggested Title</span>
                  <button
                    onClick={() => {
                      onApplyTitle(aiData.title);
                      toast.success('Title applied!');
                    }}
                    className="text-[10px] font-bold text-[#16c784] hover:text-[#19e098] underline cursor-pointer"
                  >
                    Apply Title
                  </button>
                </div>
                <h3 className="text-sm font-semibold text-[#f0f4ff]">{aiData.title}</h3>
              </div>

              {/* Generated Description */}
              <div className="os-frosted-dark p-4 rounded-2xl border border-[rgba(255,255,255,0.04)] space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[10px] font-bold text-[#16c784] uppercase tracking-wider">Suggested Description</span>
                  <button
                    onClick={() => {
                      onApplyDescription(aiData.description);
                      toast.success('Description applied!');
                    }}
                    className="text-[10px] font-bold text-[#16c784] hover:text-[#19e098] underline cursor-pointer"
                  >
                    Apply Description
                  </button>
                </div>
                <p className="text-xs text-[#8892aa] leading-relaxed whitespace-pre-wrap">{aiData.description}</p>
              </div>

              {/* Headlines & WhatsApp Pitch Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Headlines List */}
                <div className="os-frosted-dark p-4 rounded-2xl border border-[rgba(255,255,255,0.04)] space-y-3">
                  <span className="text-[10px] font-bold text-[#38bdf8] uppercase tracking-wider block">Alternate Headlines</span>
                  <ul className="space-y-2">
                    {aiData.headlines.map((hl, i) => (
                      <li key={i} className="flex items-start justify-between gap-3 text-xs text-[#8892aa] pb-2 border-b border-[rgba(255,255,255,0.03)] last:border-b-0 last:pb-0">
                        <span className="flex-1 leading-snug">{hl}</span>
                        <button
                          onClick={() => {
                            onApplyTitle(hl);
                            toast.success('Headline applied as Title!');
                          }}
                          className="text-[9px] font-bold text-[#38bdf8] hover:text-[#52d3ff] underline shrink-0 cursor-pointer"
                        >
                          Use
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* WhatsApp Pitches */}
                <div className="os-frosted-dark p-4 rounded-2xl border border-[rgba(255,255,255,0.04)] flex flex-col min-h-[220px]">
                  <span className="text-[10px] font-bold text-[#a78bfa] uppercase tracking-wider block mb-3">WhatsApp pitches</span>
                  
                  {/* Tabs */}
                  <div className="flex border-b border-[rgba(255,255,255,0.05)] mb-3">
                    {aiData.whatsapp_pitches.map((pitch, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActivePitchTab(idx)}
                        className={`flex-1 text-[10px] font-bold pb-2 border-b-2 text-center transition-all cursor-pointer ${
                          activePitchTab === idx
                            ? 'border-[#a78bfa] text-[#f0f4ff]'
                            : 'border-transparent text-[#4a5470] hover:text-[#8892aa]'
                        }`}
                      >
                        {pitch.type.split(' ')[0]}
                      </button>
                    ))}
                  </div>

                  {/* Active Tab Content */}
                  <div className="flex-1 flex flex-col justify-between">
                    <p className="text-[11px] text-[#8892aa] leading-relaxed whitespace-pre-wrap h-32 overflow-y-auto pr-1 custom-scrollbar">
                      {aiData.whatsapp_pitches[activePitchTab]?.text}
                    </p>
                    <div className="pt-3 border-t border-[rgba(255,255,255,0.03)] flex justify-end">
                      <button
                        onClick={() => copyToClipboard(aiData.whatsapp_pitches[activePitchTab].text, activePitchTab)}
                        className="h-8 px-3 rounded-lg text-[10px] font-bold bg-[#a78bfa]/10 border border-[#a78bfa]/20 text-[#a78bfa] hover:bg-[#a78bfa]/20 transition-all cursor-pointer flex items-center gap-1"
                      >
                        {copiedPitchIndex === activePitchTab ? (
                          <>✓ Copied</>
                        ) : (
                          <>📋 Copy Pitch</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
