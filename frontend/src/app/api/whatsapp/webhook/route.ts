// GET  /api/whatsapp/webhook  — Meta verification handshake
// POST /api/whatsapp/webhook  — Incoming messages & status updates

import { NextRequest, NextResponse } from 'next/server';
import {
  WA_VERIFY_TOKEN,
  WA_BUSINESS_NUMBER,
  WA_TOKEN,
  WA_PHONE_NUMBER_ID,
  sendTextMessage,
  markMessageRead,
  formatLeadAutoReply,
  type WaWebhookEntry,
} from '@/lib/whatsapp';

// ─── GET — Webhook verification ───────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === WA_VERIFY_TOKEN) {
    console.log('[WhatsApp] Webhook verified ✓');
    return new NextResponse(challenge, { status: 200 });
  }

  console.warn('[WhatsApp] Webhook verification failed — token mismatch');
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// ─── POST — Incoming events ───────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const payload = body as { object?: string; entry?: WaWebhookEntry[] };

  if (payload.object !== 'whatsapp_business_account') {
    return NextResponse.json({ status: 'ignored' }, { status: 200 });
  }

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'messages') continue;

      const { messages = [], contacts = [], statuses = [] } = change.value;

      // ── Handle delivery/read status updates ──────────────────────────────
      for (const status of statuses) {
        console.log(`[WhatsApp] Message ${status.id} → ${status.status}`);
      }

      // ── Handle incoming messages ──────────────────────────────────────────
      for (const msg of messages) {
        const contact = contacts.find((c) => c.wa_id === msg.from);
        const senderName = contact?.profile?.name ?? 'Customer';
        const senderPhone = msg.from;
        const text = msg.text?.body ?? '';

        console.log(`[WhatsApp] Message from ${senderName} (${senderPhone}): ${text}`);

        // Mark as read
        await markMessageRead(msg.id);

        // 1. Forward to broker (notify on their WhatsApp)
        if (WA_TOKEN && WA_PHONE_NUMBER_ID && WA_BUSINESS_NUMBER) {
          const notification = [
            `📩 *Incoming WhatsApp — PropertyOS*`,
            ``,
            `*From:* ${senderName}`,
            `*Number:* +${senderPhone}`,
            `*Message:* ${text || '(media / no text)'}`,
            ``,
            `Reply on WhatsApp: https://wa.me/${senderPhone}`,
          ].join('\n');

          await sendTextMessage({
            to: WA_BUSINESS_NUMBER,
            body: notification,
          }).catch((err) => console.error('[WhatsApp] Failed to notify broker:', err));
        }

        // 2. Auto-reply to the lead (only for first contact or keyword triggers)
        const isGreeting = /^(hi|hello|helo|hey|namaste|नमस्ते|हाय)\b/i.test(text.trim());
        const isEnquiry = /\b(interested|enquir|info|detail|property|price|visit|भाव|किमत)\b/i.test(text);

        if (isGreeting || isEnquiry) {
          const autoReply = formatLeadAutoReply({
            leadName: senderName,
            agencyName: 'PropertyOS',
            propertyTitle: 'your enquiry',
          });
          await sendTextMessage({ to: senderPhone, body: autoReply }).catch((err) =>
            console.error('[WhatsApp] Auto-reply failed:', err)
          );
        }

        // 3. Forward lead data to Django backend for storage
        const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8000';
        await fetch(`${backendUrl}/api/whatsapp/inbound/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: senderPhone,
            name: senderName,
            message: text,
            message_id: msg.id,
            timestamp: msg.timestamp,
            type: msg.type,
          }),
        }).catch((err) => console.warn('[WhatsApp] Backend inbound save failed (non-fatal):', err));
      }
    }
  }

  // Meta requires a 200 response within 20s
  return NextResponse.json({ status: 'ok' }, { status: 200 });
}
