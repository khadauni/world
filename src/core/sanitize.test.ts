import { describe, expect, it } from 'vitest';
import { MAX_NAME_LENGTH, sanitizeName } from './sanitize';

describe('sanitizeName', () => {
  it('keeps friendly names', () => {
    expect(sanitizeName('  Aarav  ')).toBe('Aarav');
    expect(sanitizeName('Zoë')).toBe('Zoë');
    expect(sanitizeName('Priya ⭐')).toBe('Priya ⭐');
  });
  it('strips markup characters and control / bidi characters', () => {
    expect(sanitizeName('<script>x</script>')).toBe('scriptx/script');
    expect(sanitizeName('a‮b\u0000c')).toBe('abc');
  });
  it('removes contact details kids might type', () => {
    expect(sanitizeName('mia@example.com')).toBe('');
    expect(sanitizeName('Sam 9876543210')).toBe('Sam');
    expect(sanitizeName('www.site.com Leo')).toBe('Leo');
  });
  it('caps length by characters (emoji-safe)', () => {
    expect(Array.from(sanitizeName('x'.repeat(50)))).toHaveLength(MAX_NAME_LENGTH);
    expect(sanitizeName(42)).toBe('');
  });
});
