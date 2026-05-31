const SESSION_COOKIE_NAME = 'tf_session' as const;

export interface CookieDomainEnv {
  COOKIE_DOMAIN?: string;
}

export function resolveCookieDomain(env: CookieDomainEnv): string | undefined {
  return env.COOKIE_DOMAIN?.trim() || undefined;
}

export function getSessionCookieName(): typeof SESSION_COOKIE_NAME {
  return SESSION_COOKIE_NAME;
}
