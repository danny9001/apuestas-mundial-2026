import { describe, it, expect } from 'vitest';
import { validateScore, sanitizeText, isValidEmail, validatePassword, isBlockedExtension } from '@/lib/validation';

describe('validateScore', () => {
  it('accepts valid integer scores 0-99', () => {
    expect(validateScore(0)).toBe(0);
    expect(validateScore(1)).toBe(1);
    expect(validateScore(99)).toBe(99);
    expect(validateScore('3')).toBe(3);
    expect(validateScore('0')).toBe(0);
  });

  it('rejects out-of-range values', () => {
    expect(validateScore(-1)).toBeNull();
    expect(validateScore(100)).toBeNull();
    expect(validateScore(999)).toBeNull();
  });

  it('rejects non-integer and non-numeric values', () => {
    expect(validateScore('abc')).toBeNull();
    expect(validateScore(1.5)).toBeNull();
    expect(validateScore(null)).toBeNull();
    expect(validateScore(undefined)).toBeNull();
    expect(validateScore('')).toBeNull();
  });
});

describe('sanitizeText', () => {
  it('trims whitespace', () => {
    expect(sanitizeText('  hello  ')).toBe('hello');
  });

  it('strips HTML tags', () => {
    expect(sanitizeText('<script>alert(1)</script>')).not.toContain('<script>');
  });

  it('truncates to maxLen', () => {
    const long = 'a'.repeat(200);
    expect(sanitizeText(long, 50).length).toBeLessThanOrEqual(50);
  });
});

describe('isValidEmail', () => {
  it('accepts valid emails', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('a+b@mail.co')).toBe(true);
  });

  it('rejects invalid formats', () => {
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('@domain.com')).toBe(false);
    expect(isValidEmail('user@')).toBe(false);
  });
});

describe('validatePassword', () => {
  it('accepts strong passwords', () => {
    expect(validatePassword('MyP@ssw0rd').ok).toBe(true);
  });

  it('rejects short passwords', () => {
    const result = validatePassword('abc');
    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('isBlockedExtension', () => {
  it('blocks dangerous file extensions', () => {
    expect(isBlockedExtension('malware.exe')).toBe(true);
    expect(isBlockedExtension('script.php')).toBe(true);
    expect(isBlockedExtension('shell.sh')).toBe(true);
  });

  it('allows safe extensions', () => {
    expect(isBlockedExtension('photo.jpg')).toBe(false);
    expect(isBlockedExtension('doc.pdf')).toBe(false);
  });
});
