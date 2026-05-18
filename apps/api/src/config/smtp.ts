const RESEND_SMTP_HOST = 'smtp.resend.com';
const RESEND_SMTP_USER = 'resend';
const PLACEHOLDER_VALUES = ['changeme', 'change-me', 'example', 'placeholder', '<resend_api_key>'];
const PUBLIC_MAILBOX_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'hotmail.com',
  'icloud.com',
  'outlook.com',
  'yahoo.com',
]);

export interface SmtpConfig {
  host: string;
  port: number;
  user?: string;
  pass?: string;
  from: string;
}

const isLocalEnv = () => process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';

function parsePort(rawPort: string | undefined, fallback: number): number {
  if (!rawPort) return fallback;
  if (!/^\d+$/.test(rawPort)) {
    throw new Error(`SMTP_PORT must be an integer. Received: ${rawPort}`);
  }

  const port = Number.parseInt(rawPort, 10);
  if (port <= 0 || port > 65535) {
    throw new Error(`SMTP_PORT must be between 1 and 65535. Received: ${rawPort}`);
  }
  return port;
}

function isPlaceholder(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return PLACEHOLDER_VALUES.some(placeholder => normalized.includes(placeholder));
}

function extractSenderAddress(sender: string): string | undefined {
  const trimmed = sender.trim();
  const bracketMatch = trimmed.match(/<([^<>]+)>$/);
  const address = bracketMatch ? bracketMatch[1] : trimmed;
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(address) ? address.toLowerCase() : undefined;
}

function assertProductionSender(sender: string): void {
  const address = extractSenderAddress(sender);
  if (!address) {
    throw new Error('EMAIL_FROM must contain a valid email address on your verified production mail domain.');
  }

  const domain = address.split('@')[1];
  if (
    !domain ||
    domain === 'localhost' ||
    domain.endsWith('.local') ||
    domain.endsWith('.test') ||
    domain.endsWith('.invalid') ||
    domain.endsWith('.example') ||
    domain.startsWith('example.') ||
    domain.includes('example') ||
    PUBLIC_MAILBOX_DOMAINS.has(domain)
  ) {
    throw new Error('EMAIL_FROM must use a verified production mail domain, not a placeholder or public mailbox domain.');
  }
}

export function getSmtpConfig(): SmtpConfig {
  if (isLocalEnv()) {
    return {
      host: process.env.SMTP_HOST?.trim() || 'mailhog',
      port: parsePort(process.env.SMTP_PORT, 1025),
      user: process.env.SMTP_USER?.trim() || undefined,
      pass: process.env.SMTP_PASS?.trim() || undefined,
      from: process.env.EMAIL_FROM?.trim() || 'TaskForge <noreply@taskforge.local>',
    };
  }

  const host = process.env.SMTP_HOST?.trim();
  const port = parsePort(process.env.SMTP_PORT, 587);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = process.env.EMAIL_FROM?.trim();

  const missing: string[] = [];
  if (!host) missing.push('SMTP_HOST');
  if (!user) missing.push('SMTP_USER');
  if (!pass) missing.push('SMTP_PASS');
  if (!from) missing.push('EMAIL_FROM');
  if (missing.length > 0) {
    throw new Error(`Missing required SMTP configuration for production: ${missing.join(', ')}.`);
  }

  if (host === RESEND_SMTP_HOST && user !== RESEND_SMTP_USER) {
    throw new Error('When using Resend SMTP, SMTP_USER must be set to "resend".');
  }

  const safePass = pass as string;
  const safeFrom = from as string;

  if (isPlaceholder(safePass)) {
    throw new Error('SMTP_PASS appears to be a placeholder. Set SMTP_PASS to a real Resend API key.');
  }

  if (isPlaceholder(safeFrom) || safeFrom.toLowerCase().includes('<verified sender>')) {
    throw new Error('EMAIL_FROM appears to be a placeholder. Set EMAIL_FROM to a verified production sender.');
  }

  assertProductionSender(safeFrom);

  return { host: host as string, port, user: user as string, pass: safePass, from: safeFrom };
}
