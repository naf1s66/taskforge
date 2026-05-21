import { NodemailerEmailAdapter } from '../src/email/nodemailer-adapter';
import { renderDailyDigestTemplate, renderWelcomeTemplate } from '../src/email/templates';

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

describe('renderDailyDigestTemplate', () => {
  it('renders escaped digest task summaries', () => {
    const template = renderDailyDigestTemplate({
      recipientEmail: 'person@example.test',
      digestDate: '2026-05-19',
      digest: {
        generatedAt: '2026-05-19T12:00:00.000Z',
        timezone: 'UTC',
        totalTasksConsidered: 1,
        window: {
          startOfTodayUtc: '2026-05-19T00:00:00.000Z',
          startOfTomorrowUtc: '2026-05-20T00:00:00.000Z',
          dueSoonUntilUtc: '2026-05-27T00:00:00.000Z',
          recentlyUpdatedSinceUtc: '2026-05-17T12:00:00.000Z',
        },
        groups: [
          {
            key: 'dueToday',
            label: 'Due <today>',
            total: 1,
            tasks: [
              {
                id: 'task-1',
                title: 'Ship <digest>',
                status: 'TODO',
                priority: 'HIGH',
                dueDate: '2026-05-19T12:00:00.000Z',
                updatedAt: '2026-05-19T10:00:00.000Z',
                tags: ['email'],
              },
            ],
          },
        ],
      },
    });

    expect(template.subject).toBe('Your TaskForge daily digest for 2026-05-19');
    expect(template.text).toContain('- Ship <digest> (TODO, HIGH) due 2026-05-19 [email]');
    expect(template.html).toContain('Due &lt;today&gt;');
    expect(template.html).toContain('Ship &lt;digest&gt;');
  });
});
