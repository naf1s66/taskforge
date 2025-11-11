const SESSION_COOKIE_NAME = 'tf_session' as const;

export interface CookieDomainEnv {
  COOKIE_DOMAIN?: string;
  NODE_ENV?: string;
  API_BASE_URL?: string;
  NEXT_PUBLIC_API_BASE_URL?: string;
}

export function resolveCookieDomain(env: CookieDomainEnv): string | undefined {
  const explicit = env.COOKIE_DOMAIN;
  if (explicit) {
    return explicit;
  }

  if (env.NODE_ENV === 'production') {
    const apiUrl = env.API_BASE_URL ?? env.NEXT_PUBLIC_API_BASE_URL;
    if (apiUrl) {
      try {
        const url = new URL(apiUrl);
        const hostname = url.hostname;
        const parts = hostname.split('.');

        if (parts.length >= 3) {
          return `.${parts.slice(-2).join('.')}`;
        }

        return `.${hostname}`;
      } catch {
        // If the URL cannot be parsed we fall through to the undefined case
      }
    }
  }

  return undefined;
}

export function getSessionCookieName(): typeof SESSION_COOKIE_NAME {
  return SESSION_COOKIE_NAME;
}
