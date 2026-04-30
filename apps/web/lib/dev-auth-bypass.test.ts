import { describe, expect, test } from 'vitest';

import { isDevAuthBypassEnabled } from './dev-auth-bypass';

describe('Dev Auth Bypass', () => {
  test('should only work in explicit non-production environments', () => {
    expect(isDevAuthBypassEnabled({ NODE_ENV: 'production', TF_DEV_BYPASS_AUTH: 'true' })).toBe(false);
    expect(isDevAuthBypassEnabled({ NODE_ENV: 'development', TF_DEV_BYPASS_AUTH: 'true' })).toBe(true);
    expect(isDevAuthBypassEnabled({ NODE_ENV: 'staging', TF_DEV_BYPASS_AUTH: 'true' })).toBe(false);
    expect(isDevAuthBypassEnabled({ TF_DEV_BYPASS_AUTH: 'true' })).toBe(false);
  });

  test('should return enabled when configured', () => {
    expect(isDevAuthBypassEnabled({ NODE_ENV: 'test', TF_DEV_BYPASS_AUTH: 'true' })).toBe(true);
  });

  test('should fall through when disabled', () => {
    expect(isDevAuthBypassEnabled({ NODE_ENV: 'development', TF_DEV_BYPASS_AUTH: 'false' })).toBe(false);
    expect(isDevAuthBypassEnabled({ NODE_ENV: 'development' })).toBe(false);
  });
});
