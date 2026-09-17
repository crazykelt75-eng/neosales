import { describe, expect, it } from 'vitest';
import { isValidBotswanaPhone, normaliseBotswanaPhone } from './whatsapp';

describe('Botswana phone handling', () => {
  it('normalises local and international input', () => {
    expect(normaliseBotswanaPhone('71 550 200')).toBe('26771550200');
    expect(normaliseBotswanaPhone('+267 71 550 200')).toBe('26771550200');
  });

  it('rejects malformed numbers', () => {
    expect(isValidBotswanaPhone('71 550 200')).toBe(true);
    expect(isValidBotswanaPhone('1234')).toBe(false);
    expect(isValidBotswanaPhone('+1 555 123 4567')).toBe(false);
  });
});
