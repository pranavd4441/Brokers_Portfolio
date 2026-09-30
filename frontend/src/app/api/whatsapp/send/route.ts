// POST /api/whatsapp/send
// Send a WhatsApp message to a lead from the PropertyOS dashboard.
// Body: { to: string, message: string, type?: "text" | "lead_notification" }

import { NextRequest, NextResponse } from 'next/server';
import {
  sendTextMessage,
  formatLeadNotification,
} from '@/lib/whatsapp';

interface SendBody {
  to: string;
  message?: string;
  type?: 'text' | 'lead_notification';
  // For lead_notification type:
  leadName?: string;
  phone?: string;
  propertyTitle?: string;
  propertyUrl?: string;
}

export async function POST(req: NextRequest) {
  let body: SendBody;
  try {
    body = (await req.json()) as SendBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { to, message, type = 'text', leadName, phone, propertyTitle, propertyUrl } = body;

  if (!to) {
    return NextResponse.json({ error: '`to` phone number is required' }, { status: 400 });
  }

  let text: string;

  if (type === 'lead_notification') {
    if (!leadName || !phone || !propertyTitle) {
      return NextResponse.json(
        { error: '`leadName`, `phone`, and `propertyTitle` are required for lead_notification' },
        { status: 400 }
      );
    }
    text = formatLeadNotification({ leadName, phone, propertyTitle, propertyUrl, message });
  } else {
    if (!message) {
      return NextResponse.json({ error: '`message` is required for text type' }, { status: 400 });
    }
    text = message;
  }

  try {
    const result = await sendTextMessage({ to, body: text });

    if (result.error) {
      console.error('[WhatsApp] Send error:', result.error);
      return NextResponse.json(
        { error: result.error.message, code: result.error.code },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      messageId: result.messages?.[0]?.id,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[WhatsApp] sendTextMessage threw:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
