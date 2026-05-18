import { NodemailerEmailAdapter } from '../src/email/nodemailer-adapter';
import { renderWelcomeTemplate } from '../src/email/templates';

describe('NodemailerEmailAdapter', () => {
  it('creates an SMTP transport and sends typed mail input', async () => {
    const sendMail = jest.fn().mockResolvedValue(undefined);
    const createTransport = jest.fn(() => ({ sendMail }));
    const adapter = new NodemailerEmailAdapter(
      {
        host: 'mailhog',
        port: 1025,
        from: 'TaskForge <noreply@taskforge.local>',
      },
      createTransport,
    );

    await adapter.sendMail({
      to: 'user@example.test',
      subject: 'Subject',
      text: 'Plain text',
      html: '<p>HTML</p>',
    });

    expect(createTransport).toHaveBeenCalledWith({
      host: 'mailhog',
      port: 1025,
      secure: false,
      auth: undefined,
    });
    expect(sendMail).toHaveBeenCalledWith({
      from: 'TaskForge <noreply@taskforge.local>',
      to: 'user@example.test',
      subject: 'Subject',
      text: 'Plain text',
      html: '<p>HTML</p>',
    });
  });

  it('uses secure SMTP for port 465 and passes credentials when configured', () => {
    const sendMail = jest.fn().mockResolvedValue(undefined);
    const createTransport = jest.fn(() => ({ sendMail }));

    new NodemailerEmailAdapter(
      {
        host: 'smtp.example.test',
        port: 465,
        user: 'smtp-user',
        pass: 'smtp-pass',
        from: 'TaskForge <noreply@mail.taskforge.app>',
      },
      createTransport,
    );

    expect(createTransport).toHaveBeenCalledWith({
      host: 'smtp.example.test',
      port: 465,
      secure: true,
      auth: { user: 'smtp-user', pass: 'smtp-pass' },
    });
  });
});

describe('renderWelcomeTemplate', () => {
  it('renders deterministic subject, plaintext, and HTML output', () => {
    expect(
      renderWelcomeTemplate({
        appName: 'TaskForge',
        recipientEmail: 'person@example.test',
      }),
    ).toEqual({
      subject: 'Welcome to TaskForge',
      text: 'Welcome to TaskForge, person@example.test. Your account is ready.',
      html: '<p>Welcome to <strong>TaskForge</strong>, person@example.test.</p><p>Your account is ready.</p>',
    });
  });

  it('escapes HTML-only template values', () => {
    expect(
      renderWelcomeTemplate({
        appName: 'Task<Forge>',
        recipientEmail: 'person+<script>@example.test',
      }).html,
    ).toBe(
      '<p>Welcome to <strong>Task&lt;Forge&gt;</strong>, person+&lt;script&gt;@example.test.</p><p>Your account is ready.</p>',
    );
  });
});
