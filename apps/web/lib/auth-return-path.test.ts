import { describe, expect, it } from 'vitest';

import { sanitizeReturnPath } from './auth-return-path';

describe('sanitizeReturnPath', () => {
  it.each([
    ['/dashboard', '/dashboard'],
    ['%2Fdashboard', '/dashboard'],
    [' /dashboard?filter=upcoming ', '/dashboard?filter=upcoming'],
  ])('keeps same-site return path %s', (input, expected) => {
    expect(sanitizeReturnPath(input, '/fallback')).toBe(expected);
  });

  it.each([
    null,
    '',
    'https://evil.example/dashboard',
    'evil.example/dashboard',
    '//evil.example/dashboard',
    '%2F%2Fevil.example%2Fdashboard',
    '/\\evil.example/dashboard',
    '/%5Cevil.example/dashboard',
    '%2F%5Cevil.example%2Fdashboard',
    '/dashboard\nSet-Cookie:%20x=y',
    '/dashboard\r\nLocation:%20https://evil.example',
  ])('falls back for unsafe return path %s', (input) => {
    expect(sanitizeReturnPath(input, '/fallback')).toBe('/fallback');
  });
});
