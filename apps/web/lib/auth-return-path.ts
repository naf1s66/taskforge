const RETURN_PATH_BASE = 'https://taskforge.local';
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/;

export function sanitizeReturnPath(
  value: string | null | undefined,
  fallback = '/',
): string {
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }

  let candidate = trimmed;
  try {
    candidate = decodeURIComponent(trimmed).trim();
  } catch {
    candidate = trimmed;
  }

  if (
    !candidate.startsWith('/') ||
    candidate.startsWith('//') ||
    candidate.startsWith('/\\') ||
    candidate.includes('\\') ||
    CONTROL_CHARACTERS.test(candidate)
  ) {
    return fallback;
  }

  try {
    const resolved = new URL(candidate, RETURN_PATH_BASE);
    if (resolved.origin !== RETURN_PATH_BASE) {
      return fallback;
    }
  } catch {
    return fallback;
  }

  return candidate;
}
