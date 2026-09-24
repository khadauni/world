import { AVATARS } from './avatars';
import { AGE_BANDS, type AgeBand } from './types';

export const MAX_PROFILES = 8;
export const MAX_NAME_LENGTH = 16;

/**
 * Explorer nicknames are the only free text we store. Keep them short, printable, and free of
 * anything that looks like contact details — kids sometimes type phone numbers or emails into name boxes.
 */
export function sanitizeName(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const cleaned = raw
    .normalize('NFC')
    // Drop control chars, zero-width & bidi overrides (spoofing), and angle brackets.
    // eslint-disable-next-line no-control-regex -- stripping control characters is the point
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2066-\u2069<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  // Strip email- and URL-like fragments and long digit runs (phone numbers).
  const noContacts = cleaned
    .replace(/\S+@\S+/g, '')
    .replace(/(https?:\/\/|www\.)\S*/gi, '')
    .replace(/\d{4,}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return Array.from(noContacts).slice(0, MAX_NAME_LENGTH).join('');
}

export function isAgeBand(value: unknown): value is AgeBand {
  return typeof value === 'string' && (AGE_BANDS as readonly string[]).includes(value);
}

export function isAvatarId(value: unknown): value is string {
  return typeof value === 'string' && AVATARS.some((a) => a.id === value);
}

export function isSafeId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9_-]{1,64}$/i.test(value);
}

export function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}
