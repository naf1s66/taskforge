import { parseTrustProxySetting } from '../src/config/http';

describe('http config', () => {
  it('leaves trust proxy unset when TRUST_PROXY is absent or blank', () => {
    expect(parseTrustProxySetting(undefined)).toBeUndefined();
    expect(parseTrustProxySetting('   ')).toBeUndefined();
  });

  it('parses boolean trust proxy values', () => {
    expect(parseTrustProxySetting('true')).toBe(true);
    expect(parseTrustProxySetting('on')).toBe(true);
    expect(parseTrustProxySetting('false')).toBe(false);
    expect(parseTrustProxySetting('off')).toBe(false);
  });

  it('parses numeric trust proxy hop counts', () => {
    expect(parseTrustProxySetting('0')).toBe(0);
    expect(parseTrustProxySetting('1')).toBe(1);
    expect(parseTrustProxySetting('2')).toBe(2);
  });

  it('parses Express proxy address lists', () => {
    expect(parseTrustProxySetting('loopback')).toBe('loopback');
    expect(parseTrustProxySetting('loopback, 10.0.0.0/8')).toEqual(['loopback', '10.0.0.0/8']);
  });

  it('rejects invalid numeric or list values', () => {
    expect(() => parseTrustProxySetting('-1')).toThrow('TRUST_PROXY must be a non-negative integer');
    expect(() => parseTrustProxySetting('1.5')).toThrow('TRUST_PROXY must be a non-negative integer');
    expect(() => parseTrustProxySetting('loopback,')).toThrow('TRUST_PROXY contains an empty proxy entry');
  });
});
