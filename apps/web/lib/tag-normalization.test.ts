import { afterEach, describe, expect, it, vi } from 'vitest';

import { normalizeTagLabel } from '@taskforge/shared';

describe('normalizeTagLabel', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses locale-invariant lowercasing for canonical tag keys', () => {
    vi.spyOn(String.prototype, 'toLocaleLowerCase').mockReturnValue('locale-dependent');

    expect(normalizeTagLabel(' Important ')).toBe('important');
  });
});
