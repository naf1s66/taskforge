export interface WelcomeTemplateInput {
  appName: string;
  recipientEmail: string;
}

export function renderWelcomeTemplate(input: WelcomeTemplateInput) {
  const subject = `Welcome to ${input.appName}`;
  const text = `Welcome to ${input.appName}, ${input.recipientEmail}. Your account is ready.`;
  const html = `<p>Welcome to <strong>${input.appName}</strong>, ${input.recipientEmail}.</p><p>Your account is ready.</p>`;

  return { subject, text, html };
}
