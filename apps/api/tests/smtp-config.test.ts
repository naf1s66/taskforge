import { getSmtpConfig } from '../src/config/smtp';

const ORIGINAL_ENV = { ...process.env };

function resetEnv(overrides: NodeJS.ProcessEnv = {}) {
  process.env = { ...ORIGINAL_ENV };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

describe('getSmtpConfig', () => {
  afterEach(() => {
    resetEnv();
  });

  it('uses MailHog defaults in development', () => {
    resetEnv({
      NODE_ENV: 'development',
      SMTP_HOST: undefined,
      SMTP_PORT: undefined,
      SMTP_USER: undefined,
      SMTP_PASS: undefined,
      EMAIL_FROM: undefined,
    });

    expect(getSmtpConfig()).toEqual({
      host: 'mailhog',
      port: 1025,
      user: undefined,
      pass: undefined,
      from: 'TaskForge <noreply@taskforge.local>',
    });
  });

  it('requires production SMTP settings when outside local environments', () => {
    resetEnv({
      NODE_ENV: 'production',
      SMTP_HOST: undefined,
      SMTP_PORT: undefined,
      SMTP_USER: undefined,
      SMTP_PASS: undefined,
      EMAIL_FROM: undefined,
    });

    expect(() => getSmtpConfig()).toThrow(
      'Missing required SMTP configuration for production: SMTP_HOST, SMTP_USER, SMTP_PASS, EMAIL_FROM.',
    );
  });

  it('does not treat missing NODE_ENV as local development', () => {
    resetEnv({
      NODE_ENV: undefined,
      SMTP_HOST: undefined,
      SMTP_PORT: undefined,
      SMTP_USER: undefined,
      SMTP_PASS: undefined,
      EMAIL_FROM: undefined,
    });

    expect(() => getSmtpConfig()).toThrow('Missing required SMTP configuration for production');
  });

  it('accepts Resend production SMTP settings with a verified-domain sender shape', () => {
    resetEnv({
      NODE_ENV: 'production',
      SMTP_HOST: 'smtp.resend.com',
      SMTP_PORT: '587',
      SMTP_USER: 'resend',
      SMTP_PASS: 're_123456789',
      EMAIL_FROM: 'TaskForge <noreply@mail.taskforge.app>',
    });

    expect(getSmtpConfig()).toEqual({
      host: 'smtp.resend.com',
      port: 587,
      user: 'resend',
      pass: 're_123456789',
      from: 'TaskForge <noreply@mail.taskforge.app>',
    });
  });

  it('rejects placeholder credentials and senders in production', () => {
    resetEnv({
      NODE_ENV: 'production',
      SMTP_HOST: 'smtp.resend.com',
      SMTP_PORT: '587',
      SMTP_USER: 'resend',
      SMTP_PASS: '<RESEND_API_KEY>',
      EMAIL_FROM: '<verified sender>',
    });

    expect(() => getSmtpConfig()).toThrow('SMTP_PASS appears to be a placeholder');
  });

  it('rejects public mailbox domains for production senders', () => {
    resetEnv({
      NODE_ENV: 'production',
      SMTP_HOST: 'smtp.resend.com',
      SMTP_PORT: '587',
      SMTP_USER: 'resend',
      SMTP_PASS: 're_123456789',
      EMAIL_FROM: 'TaskForge <taskforge@gmail.com>',
    });

    expect(() => getSmtpConfig()).toThrow('EMAIL_FROM must use a verified production mail domain');
  });

  it('rejects malformed port values', () => {
    resetEnv({
      NODE_ENV: 'production',
      SMTP_HOST: 'smtp.resend.com',
      SMTP_PORT: '587abc',
      SMTP_USER: 'resend',
      SMTP_PASS: 're_123456789',
      EMAIL_FROM: 'TaskForge <noreply@mail.taskforge.app>',
    });

    expect(() => getSmtpConfig()).toThrow('SMTP_PORT must be an integer');
  });
});
