import { describe, it, expect } from 'vitest';
import {
  constantTimeEquals,
  sanitizePlainText,
  normalizePhone,
  normalizeCommunicationPreference,
  redactPhone,
} from '../utils/security.js';

// ---------------------------------------------------------------------------
// constantTimeEquals
// ---------------------------------------------------------------------------

describe('constantTimeEquals', () => {
  it('returns true for identical strings', () => {
    expect(constantTimeEquals('secret-token', 'secret-token')).toBe(true);
  });

  it('returns false for different strings of equal length', () => {
    expect(constantTimeEquals('secret-token', 'secret-toben')).toBe(false);
  });

  it('returns false for strings of different length (no length leak / no throw)', () => {
    // crypto.timingSafeEqual throws on unequal-length buffers; the HMAC
    // wrapper must normalise length first so this never throws.
    expect(constantTimeEquals('short', 'a-much-longer-value')).toBe(false);
  });

  it('handles empty strings', () => {
    expect(constantTimeEquals('', '')).toBe(true);
    expect(constantTimeEquals('', 'x')).toBe(false);
  });

  it('handles unicode without throwing', () => {
    expect(constantTimeEquals('café', 'café')).toBe(true);
    expect(constantTimeEquals('café', 'cafe')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// sanitizePlainText
// ---------------------------------------------------------------------------

describe('sanitizePlainText', () => {
  it('trims surrounding whitespace', () => {
    expect(sanitizePlainText('  hello  ')).toBe('hello');
  });

  it('collapses internal whitespace runs to a single space', () => {
    expect(sanitizePlainText('a\t\t b\n\nc')).toBe('a b c');
  });

  it('strips control characters (replaced with space, then collapsed)', () => {
    const input = 'hi' + String.fromCharCode(7) + 'there'; // BEL control char
    expect(sanitizePlainText(input)).toBe('hi there');
  });

  it('strips the DEL character', () => {
    const input = 'a' + String.fromCharCode(0x7f) + 'b';
    expect(sanitizePlainText(input)).toBe('a b');
  });

  it('returns an empty string for whitespace-only input', () => {
    expect(sanitizePlainText('   \n\t  ')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// normalizePhone
// ---------------------------------------------------------------------------

describe('normalizePhone', () => {
  it('preserves a leading + and strips formatting', () => {
    expect(normalizePhone('+1 (612) 555-1234')).toBe('+16125551234');
  });

  it('strips all non-digits when there is no leading +', () => {
    expect(normalizePhone('(612) 555-1234')).toBe('6125551234');
  });

  it('keeps only one leading + and removes any others', () => {
    expect(normalizePhone('+1+612')).toBe('+1612');
  });

  it('trims surrounding whitespace before normalising', () => {
    expect(normalizePhone('  +16125551234  ')).toBe('+16125551234');
  });

  it('returns an empty string for input with no digits', () => {
    expect(normalizePhone('abc')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// normalizeCommunicationPreference
// ---------------------------------------------------------------------------

describe('normalizeCommunicationPreference', () => {
  it('passes through whatsapp and signal', () => {
    expect(normalizeCommunicationPreference('whatsapp')).toBe('whatsapp');
    expect(normalizeCommunicationPreference('signal')).toBe('signal');
  });

  it('is case-insensitive and trims', () => {
    expect(normalizeCommunicationPreference('  WhatsApp ')).toBe('whatsapp');
    expect(normalizeCommunicationPreference('SIGNAL')).toBe('signal');
  });

  it('defaults to sms for unknown or missing values', () => {
    expect(normalizeCommunicationPreference('telegram')).toBe('sms');
    expect(normalizeCommunicationPreference('')).toBe('sms');
    expect(normalizeCommunicationPreference(undefined)).toBe('sms');
  });
});

// ---------------------------------------------------------------------------
// redactPhone
// ---------------------------------------------------------------------------

describe('redactPhone', () => {
  it('keeps a 2-digit prefix and 2-digit suffix for a full number', () => {
    expect(redactPhone('+16125551234')).toBe('+1***34');
  });

  it('fully redacts very short numbers', () => {
    expect(redactPhone('1234')).toBe('***');
    expect(redactPhone('99')).toBe('***');
  });

  it('normalises formatting before redacting', () => {
    expect(redactPhone('(612) 555-1234')).toBe('61***34');
  });

  it('never reveals the full middle of the number', () => {
    const redacted = redactPhone('+16125551234');
    expect(redacted).not.toContain('5551');
  });
});
