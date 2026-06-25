'use client';

import React, { useEffect, useRef, useState } from 'react';

interface ShareModalProps {
  url: string;
  whatsappText: string;
  propertyTitle: string;
  onClose: () => void;
}

export default function ShareModal({ url, whatsappText, propertyTitle, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Trap focus + ESC close
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

  // Auto-open WhatsApp when modal renders
  useEffect(() => {
    const timer = setTimeout(() => {
      const encoded = encodeURIComponent(whatsappText);
      window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
    }, 300);
    return () => clearTimeout(timer);
  }, [whatsappText]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      inputRef.current?.select();
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const shareViaWhatsApp = () => {
    const encoded = encodeURIComponent(whatsappText);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const shareViaTelegram = () => {
    const encoded = encodeURIComponent(whatsappText);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encoded}`, '_blank');
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`Property Listing: ${propertyTitle}`);
    const body = encodeURIComponent(`${whatsappText}\n\n${url}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const shareChannels = [
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      icon: '💬',
      action: shareViaWhatsApp,
      className: 'bg-[#25D366]/10 border-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/20',
    },
    {
      id: 'telegram',
      label: 'Telegram',
      icon: '✈️',
      action: shareViaTelegram,
      className: 'bg-[#229ED9]/10 border-[#229ED9]/20 text-[#229ED9] hover:bg-[#229ED9]/20',
    },
    {
      id: 'email',
      label: 'Email',
      icon: '✉️',
      action: shareViaEmail,
      className: 'bg-[#8892aa]/10 border-[#8892aa]/20 text-[#8892aa] hover:bg-[rgba(255,255,255,0.1)]',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4 pb-safe"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Share property"
    >
      <div
        ref={modalRef}
        className="os-frosted w-full max-w-md rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl os-slide-up"
      >
        {/* Handle bar (mobile) */}
        <div className="flex justify-center mb-5 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-[rgba(255,255,255,0.12)]" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-[#f0f4ff]">Share Listing</h2>
            <p className="text-xs text-[#4a5470] mt-0.5 truncate max-w-[260px]">{propertyTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="os-btn-icon ml-2 flex-shrink-0"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* WhatsApp opened indicator */}
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#25D366]/8 border border-[#25D366]/12 mb-5">
          <div className="w-7 h-7 rounded-lg bg-[#25D366]/15 flex items-center justify-center text-sm flex-shrink-0">
            💬
          </div>
          <div>
            <p className="text-xs font-semibold text-[#f0f4ff]">WhatsApp opened automatically</p>
            <p className="text-[10px] text-[#4a5470] mt-0.5">Your listing link is pre-formatted and ready to send</p>
          </div>
          <div className="ml-auto">
            <span className="text-[10px] font-bold text-[#25D366] bg-[#25D366]/10 px-2 py-0.5 rounded-full">✓</span>
          </div>
        </div>

        {/* Share channels */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {shareChannels.map(channel => (
            <button
              key={channel.id}
              id={`share-${channel.id}-btn`}
              onClick={channel.action}
              className={`flex flex-col items-center justify-center gap-2 p-3.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${channel.className}`}
            >
              <span className="text-xl">{channel.icon}</span>
              <span>{channel.label}</span>
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-[rgba(255,255,255,0.06)]" />
          <span className="text-[10px] text-[#4a5470] font-medium uppercase tracking-wider">or copy link</span>
          <div className="flex-1 h-px bg-[rgba(255,255,255,0.06)]" />
        </div>

        {/* Copy link row */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="url"
              readOnly
              value={url}
              onClick={() => inputRef.current?.select()}
              className="w-full h-10 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 text-xs text-[#8892aa] font-mono focus:outline-none focus:border-[#16c784]/40 transition-colors truncate"
            />
          </div>
          <button
            id="copy-link-btn"
            onClick={copyLink}
            className={`h-10 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex-shrink-0 ${
              copied
                ? 'bg-[#16c784]/20 text-[#16c784] border border-[#16c784]/30'
                : 'bg-[rgba(255,255,255,0.06)] text-[#f0f4ff] border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.1)]'
            }`}
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>

        {/* Analytics notice */}
        <p className="text-[10px] text-[#4a5470] text-center mt-4">
          Views and clicks are tracked automatically for this link
        </p>
      </div>
    </div>
  );
}
