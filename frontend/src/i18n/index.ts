import { en } from './messages/en';
import { hi } from './messages/hi';
import { mr } from './messages/mr';
import type { Locale, MessageDictionary, MessageKey } from './types';

export const messages: Record<Locale, MessageDictionary> = { en, hi, mr };

export const supportedLocales: Locale[] = ['en', 'hi', 'mr'];

export function isLocale(value: string | null | undefined): value is Locale {
  return Boolean(value && supportedLocales.includes(value as Locale));
}

export function translate(locale: Locale, key: MessageKey): string {
  return messages[locale][key] ?? messages.en[key];
}

export type { Locale, MessageDictionary, MessageKey } from './types';
