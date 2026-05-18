export interface WelcomeTemplateInput {
  appName: string;
  recipientEmail: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderWelcomeTemplate(input: WelcomeTemplateInput) {
  const subject = `Welcome to ${input.appName}`;
  const text = `Welcome to ${input.appName}, ${input.recipientEmail}. Your account is ready.`;
  const html = `<p>Welcome to <strong>${escapeHtml(input.appName)}</strong>, ${escapeHtml(input.recipientEmail)}.</p><p>Your account is ready.</p>`;

  return { subject, text, html };
}
