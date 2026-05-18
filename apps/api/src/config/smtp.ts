const RESEND_SMTP_HOST = 'smtp.resend.com';
const RESEND_SMTP_USER = 'resend';

export interface SmtpConfig {
  host: string;
  port: number;
  user?: string;
  pass?: string;
  from: string;
}

const isLocalEnv = () => ['development', 'test'].includes(process.env.NODE_ENV ?? 'development');

function parsePort(rawPort: string | undefined, fallback: number): number {
  if (!rawPort) return fallback;
  const port = Number.parseInt(rawPort, 10);
  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`SMTP_PORT must be a positive integer. Received: ${rawPort}`);
  }
  return port;
}

export function getSmtpConfig(): SmtpConfig {
  if (isLocalEnv()) {
    return {
      host: process.env.SMTP_HOST ?? 'mailhog',
      port: parsePort(process.env.SMTP_PORT, 1025),
      user: process.env.SMTP_USER || undefined,
      pass: process.env.SMTP_PASS || undefined,
      from: process.env.EMAIL_FROM ?? 'TaskForge <noreply@taskforge.local>',
    };
  }

  const host = process.env.SMTP_HOST;
  const port = parsePort(process.env.SMTP_PORT, 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM;

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

  if (safePass.toLowerCase().includes('changeme') || safePass.toLowerCase().includes('example') || safePass === '<RESEND_API_KEY>') {
    throw new Error('SMTP_PASS appears to be a placeholder. Set SMTP_PASS to a real Resend API key.');
  }

  if (safeFrom.includes('example.com') || safeFrom.includes('taskforge.local') || safeFrom.includes('<verified sender>')) {
    throw new Error('EMAIL_FROM must be a verified sender on your production mail domain.');
  }

  return { host: host as string, port, user: user as string, pass: safePass, from: safeFrom };
}
