import { describe, expect, it } from 'vitest';

import { resolveCookieDomain } from '@taskforge/shared';

describe('resolveCookieDomain', () => {
  it('uses explicit COOKIE_DOMAIN values only', () => {
    expect(resolveCookieDomain({ COOKIE_DOMAIN: '.example.com' })).toBe('.example.com');
    expect(resolveCookieDomain({ COOKIE_DOMAIN: '  .example.com  ' })).toBe('.example.com');
  });

  it('leaves cookies host-only when COOKIE_DOMAIN is unset', () => {
    expect(resolveCookieDomain({})).toBeUndefined();
    expect(resolveCookieDomain({ COOKIE_DOMAIN: '' })).toBeUndefined();
  });
});
