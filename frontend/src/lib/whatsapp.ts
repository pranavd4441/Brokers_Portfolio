// WhatsApp Cloud API — server-side utility
// All calls go to Meta's Cloud API v19.0
// Requires env vars: WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID

const WA_API_VERSION = 'v19.0';
const WA_API_BASE = `https://graph.facebook.com/${WA_API_VERSION}`;

export const WA_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID ?? '';
export const WA_TOKEN = process.env.WHATSAPP_TOKEN ?? '';
export const WA_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN ?? 'propertyos_wh_2026';
export const WA_BUSINESS_NUMBER = process.env.WHATSAPP_BUSINESS_NUMBER ?? '918855023247';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WaTextMessage {
  to: string;          // recipient e.g. "919876543210"
  body: string;
}

export interface WaTemplateMessage {
  to: string;
  templateName: string;
  languageCode?: string;
  components?: WaTemplateComponent[];
}

export interface WaTemplateComponent {
  type: 'body' | 'header' | 'button';
  parameters: Array<{ type: 'text'; text: string }>;
}

export interface WaIncomingMessage {
  from: string;
  id: string;
  timestamp: string;
  type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'interactive' | 'button';
  text?: { body: string };
  image?: { id: string; mime_type: string; caption?: string };
  interactive?: {
    type: string;
    button_reply?: { id: string; title: string };
  };
}

export interface WaWebhookEntry {
  id: string;
  changes: Array<{
    value: {
      messaging_product: string;
      metadata: { display_phone_number: string; phone_number_id: string };
      contacts?: Array<{ profile: { name: string }; wa_id: string }>;
      messages?: WaIncomingMessage[];
      statuses?: Array<{ id: string; status: string; timestamp: string; recipient_id: string }>;
      errors?: Array<{ code: number; title: string }>;
    };
    field: string;
  }>;
}

export interface WaApiResponse {
  messages?: Array<{ id: string }>;
  error?: { message: string; code: number };
}

// ─── Send a plain text message ─────────────────────────────────────────────

export async function sendTextMessage({ to, body }: WaTextMessage): Promise<WaApiResponse> {
  if (!WA_TOKEN || !WA_PHONE_NUMBER_ID) {
    throw new Error('WhatsApp credentials not configured. Set WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID in .env.local');
  }

  const res = await fetch(`${WA_API_BASE}/${WA_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WA_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to.replace(/\D/g, ''), // strip non-digits
      type: 'text',
      text: { preview_url: false, body },
    }),
  });

  return res.json() as Promise<WaApiResponse>;
}

// ─── Send a template message ───────────────────────────────────────────────

export async function sendTemplateMessage({
  to,
  templateName,
  languageCode = 'en',
  components = [],
}: WaTemplateMessage): Promise<WaApiResponse> {
  if (!WA_TOKEN || !WA_PHONE_NUMBER_ID) {
    throw new Error('WhatsApp credentials not configured.');
  }

  const res = await fetch(`${WA_API_BASE}/${WA_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WA_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: to.replace(/\D/g, ''),
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components,
      },
    }),
  });

  return res.json() as Promise<WaApiResponse>;
}

// ─── Mark a message as read ────────────────────────────────────────────────

export async function markMessageRead(messageId: string): Promise<void> {
  if (!WA_TOKEN || !WA_PHONE_NUMBER_ID) return;
  await fetch(`${WA_API_BASE}/${WA_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WA_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    }),
  });
}

// ─── Format a new-lead notification (plain text) ──────────────────────────

export function formatLeadNotification({
  leadName,
  phone,
  propertyTitle,
  propertyUrl,
  message,
}: {
  leadName: string;
  phone: string;
  propertyTitle: string;
  propertyUrl?: string;
  message?: string;
}): string {
  const lines = [
    `🏠 *New Enquiry — PropertyOS*`,
    ``,
    `*Lead:* ${leadName}`,
    `*Phone:* ${phone}`,
    `*Property:* ${propertyTitle}`,
  ];
  if (propertyUrl) lines.push(`*Page:* ${propertyUrl}`);
  if (message) lines.push(`*Message:* ${message}`);
  lines.push(``, `Reply to this WhatsApp to contact the lead directly.`);
  return lines.join('\n');
}

// ─── Format an auto-reply to a lead ───────────────────────────────────────

export function formatLeadAutoReply({
  leadName,
  agencyName,
  propertyTitle,
  propertyUrl,
}: {
  leadName: string;
  agencyName: string;
  propertyTitle: string;
  propertyUrl?: string;
}): string {
  const lines = [
    `Hi ${leadName}! 👋`,
    ``,
    `Thank you for your enquiry about *${propertyTitle}*.`,
    `Our team at *${agencyName}* will get back to you shortly.`,
  ];
  if (propertyUrl) lines.push(``, `You can view the full listing here: ${propertyUrl}`);
  return lines.join('\n');
}
