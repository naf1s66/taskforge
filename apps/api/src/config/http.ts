export type TrustProxySetting = boolean | number | string | string[];

export interface HttpServerConfig {
  trustProxy?: TrustProxySetting;
  corsAllowedOrigins: string[];
}

const TRUE_VALUES = new Set(['true', 'yes', 'on']);
const FALSE_VALUES = new Set(['false', 'no', 'off']);
const DEFAULT_LOCAL_CORS_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'];
const DEFAULT_PRODUCTION_CORS_ORIGINS = ['https://taskforge.app'];

export function parseTrustProxySetting(rawValue: string | undefined): TrustProxySetting | undefined {
  const value = rawValue?.trim();
  if (!value) {
    return undefined;
  }

  const normalized = value.toLowerCase();
  if (TRUE_VALUES.has(normalized)) {
    return true;
  }

  if (FALSE_VALUES.has(normalized)) {
    return false;
  }

  if (/^\d+$/.test(value)) {
    const hopCount = Number.parseInt(value, 10);
    if (!Number.isSafeInteger(hopCount)) {
      throw new Error(`TRUST_PROXY is too large. Received: ${rawValue}`);
    }

    return hopCount;
  }

  if (/^-?\d+(?:\.\d+)?$/.test(value)) {
    throw new Error(`TRUST_PROXY must be a non-negative integer, boolean, or proxy list. Received: ${rawValue}`);
  }

  const proxyList = value.split(',').map(item => item.trim());
  if (proxyList.some(item => item.length === 0)) {
    throw new Error(`TRUST_PROXY contains an empty proxy entry. Received: ${rawValue}`);
  }

  return proxyList.length === 1 ? proxyList[0] : proxyList;
}

export function parseCorsAllowedOrigins(rawValue: string | undefined): string[] {
  const value = rawValue?.trim();
  if (!value) {
    return [];
  }

  const origins = value.split(',').map(item => item.trim());
  if (origins.some(origin => origin.length === 0)) {
    throw new Error(`CORS_ALLOWED_ORIGINS contains an empty origin. Received: ${rawValue}`);
  }

  return origins.map(origin => {
    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error(`CORS_ALLOWED_ORIGINS must contain valid URL origins. Received: ${origin}`);
    }

    if (parsed.pathname !== '/' || parsed.search || parsed.hash) {
      throw new Error(`CORS_ALLOWED_ORIGINS entries must be origins without paths. Received: ${origin}`);
    }

    return parsed.origin;
  });
}

export function getHttpServerConfig(env: NodeJS.ProcessEnv = process.env): HttpServerConfig {
  const configuredCorsOrigins = parseCorsAllowedOrigins(env.CORS_ALLOWED_ORIGINS);
  const fallbackCorsOrigins = env.NODE_ENV === 'production'
    ? DEFAULT_PRODUCTION_CORS_ORIGINS
    : DEFAULT_LOCAL_CORS_ORIGINS;

  return {
    trustProxy: parseTrustProxySetting(env.TRUST_PROXY),
    corsAllowedOrigins: configuredCorsOrigins.length > 0 ? configuredCorsOrigins : fallbackCorsOrigins,
  };
}
