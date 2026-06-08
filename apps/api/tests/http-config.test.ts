import {
  DEFAULT_JSON_BODY_LIMIT,
  getHttpServerConfig,
  parseCorsAllowedOrigins,
  parseJsonBodyLimit,
  parseTrustProxySetting,
} from '../src/config/http';

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

  it('parses configured CORS allowed origins', () => {
    expect(parseCorsAllowedOrigins(undefined)).toEqual([]);
    expect(parseCorsAllowedOrigins('   ')).toEqual([]);
    expect(parseCorsAllowedOrigins('https://app.example.com/, http://localhost:3000')).toEqual([
      'https://app.example.com',
      'http://localhost:3000',
    ]);
  });

  it('rejects invalid CORS origin entries', () => {
    expect(() => parseCorsAllowedOrigins('https://app.example.com,')).toThrow(
      'CORS_ALLOWED_ORIGINS contains an empty origin',
    );
    expect(() => parseCorsAllowedOrigins('not-a-url')).toThrow(
      'CORS_ALLOWED_ORIGINS must contain valid URL origins',
    );
    expect(() => parseCorsAllowedOrigins('https://app.example.com/dashboard')).toThrow(
      'CORS_ALLOWED_ORIGINS entries must be origins without paths',
    );
    expect(() => parseCorsAllowedOrigins('ftp://app.example.com')).toThrow(
      'CORS_ALLOWED_ORIGINS entries must use http or https origins',
    );
  });



  it('parses explicit JSON body size limits', () => {
    expect(parseJsonBodyLimit(undefined)).toBe(DEFAULT_JSON_BODY_LIMIT);
    expect(parseJsonBodyLimit(' 128KB ')).toBe('128kb');
    expect(parseJsonBodyLimit('1024b')).toBe('1024b');
    expect(parseJsonBodyLimit('1mb')).toBe('1mb');
    expect(() => parseJsonBodyLimit('large')).toThrow('API_JSON_BODY_LIMIT must be a size');
    expect(() => parseJsonBodyLimit('1gb')).toThrow('API_JSON_BODY_LIMIT must be a size');
  });

  it('resolves default and configured CORS origins', () => {
    expect(getHttpServerConfig({ NODE_ENV: 'development' }).corsAllowedOrigins).toEqual([
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ]);
    expect(getHttpServerConfig({ NODE_ENV: 'production' }).corsAllowedOrigins).toEqual([]);
    expect(getHttpServerConfig({
      NODE_ENV: 'production',
      CORS_ALLOWED_ORIGINS: 'https://app.example.com',
    }).corsAllowedOrigins).toEqual(['https://app.example.com']);
    expect(getHttpServerConfig({ NODE_ENV: 'production', API_JSON_BODY_LIMIT: '32kb' }).jsonBodyLimit).toBe('32kb');
  });
});
